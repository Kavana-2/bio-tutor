from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional

import torch
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user_from_request,
    generate_reset_token, get_refresh_secret,
)
import jwt
from nlp_engine import engine
import document_service
import diagram_service
from text_formatter import format_for_learning
from services.openai_service import generate_example as openai_generate_example, is_configured as openai_is_configured
from services.quiz_service import fallback_questions, fingerprint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("study-assistant")

from database import Database, ObjectId

db = Database(os.environ.get("SQLITE_DB_PATH", str(ROOT_DIR / "database.sqlite")))

app = FastAPI(title="AI Biology Study Assistant")
api = APIRouter(prefix="/api")


def now():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or now()).isoformat()


async def current_user(request: Request):
    return await get_current_user_from_request(request, db)


def public_user(u):
    return {"id": u["id"], "email": u["email"], "name": u.get("name"),
            "role": u.get("role", "student"), "created_at": u.get("created_at")}


async def log_activity(uid, kind, detail):
    await db.study_sessions.insert_one({
        "user_id": uid, "kind": kind, "detail": detail, "created_at": iso()})


async def check_achievements(uid):
    defs = [
        ("first_question", "Curious Mind", "Asked your first question", "chat_history", 1),
        ("first_pdf", "Note Taker", "Uploaded your first PDF", "uploaded_pdfs", 1),
        ("quiz_starter", "Quiz Starter", "Completed your first quiz", "quiz_results", 1),
        ("scholar", "Scholar", "Completed 5 quizzes", "quiz_results", 5),
    ]
    earned = []
    for key, title, desc, coll, need in defs:
        count = await db[coll].count_documents({"user_id": uid})
        if count >= need and not await db.achievements.find_one({"user_id": uid, "key": key}):
            await db.achievements.insert_one({"user_id": uid, "key": key, "title": title,
                                              "description": desc, "created_at": iso()})
            earned.append(title)
    return earned


class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AskIn(BaseModel):
    question: str = Field(min_length=1)
    pdf_id: Optional[str] = None
    previous_question: Optional[str] = None
    previous_answer: Optional[str] = None
    clarification_action: Optional[Literal["example", "simplify", "step_by_step", "repeat"]] = None


CLARIFY_PATTERN = re.compile(
    r"\b(don'?t|do not|didn'?t|not)\s+(understand|get it|follow|clear)|"
    r"\b(confus|simpl|easier|explain (it |this |that )?(again|more)|elaborate|in detail|"
    r"example|step[- ]by[- ]step|what do you mean|still unclear|too hard|too difficult)", re.I)


def is_clarification(text: str) -> bool:
    return bool(CLARIFY_PATTERN.search(text.strip())) and len(text.split()) <= 20


def _local_clarification(answer: str, request: str) -> str:
    """Reformat the existing grounded answer without calling an external model."""
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", answer.strip()) if part.strip()]
    if not sentences:
        return answer
    if re.search(r"step[- ]by[- ]step", request, re.I):
        return "\n".join(f"{index}. {sentence}" for index, sentence in enumerate(sentences, 1))
    if re.search(r"simpl|understand|confus|easier|clear", request, re.I):
        return "In simple terms: " + " ".join(sentences[:2])
    return "Here is the key idea again: " + " ".join(sentences[:2])


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class QuizSubmitIn(BaseModel):
    topic: Optional[str] = "all"
    pdf_id: Optional[str] = None
    answers: List[dict]


class PracticeIn(BaseModel):
    question: str
    student_answer: str
    model_answer: str
    concepts: List[str] = []
    topic: Optional[str] = None


class TeachAskIn(BaseModel):
    question: str
    context: Optional[str] = ""
    is_example: bool = False


class ClarifyIn(BaseModel):
    question: str = Field(min_length=1)
    previous_answer: str = Field(min_length=1)
    request: str = Field(min_length=1)
    pdf_context: Optional[str] = ""


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"email": email, "name": body.name, "password_hash": hash_password(body.password),
           "role": "student", "created_at": iso()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email)
    set_auth_cookies(response, access, create_refresh_token(uid))
    return {"id": uid, "email": email, "name": body.name, "role": "student", "access_token": access}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"login:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5:
        lu = attempt.get("locked_until")
        if lu and datetime.fromisoformat(lu) > now():
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"locked_until": iso(now() + timedelta(minutes=15))}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    set_auth_cookies(response, access, create_refresh_token(uid))
    return {"id": uid, "email": email, "name": user.get("name"), "role": user.get("role", "student"), "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(current_user)):
    clear_auth_cookies(response)
    return {"message": "Logged out"}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_refresh_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        uid = payload["sub"]
        u = await db.users.find_one({"_id": ObjectId(uid)})
        if not u:
            raise HTTPException(status_code=401, detail="User not found")
        response.set_cookie("access_token", create_access_token(uid, u["email"]),
                            httponly=True, secure=True, samesite="none", max_age=900, path="/")
        return {"message": "refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if user:
        token = generate_reset_token()
        await db.password_reset_tokens.insert_one({
            "user_id": str(user["_id"]), "token": token, "used": False,
            "expires_at": iso(now() + timedelta(hours=1)), "created_at": iso()})
        logger.info(f"[PASSWORD RESET] {body.email}: /reset-password?token={token}")
        return {"message": "If the email exists, a reset link has been generated.", "dev_token": token}
    return {"message": "If the email exists, a reset link has been generated."}


@api.post("/auth/reset-password")
async def reset(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used") or datetime.fromisoformat(rec["expires_at"]) < now():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                              {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"message": "Password reset successful"}


async def _pdf_answer(pid, uid, question):
    """PDF-first retrieval: returns (answer dict or None, context text from top chunks)."""
    await _owned_pdf(pid, uid)
    tp, emb = await _pdf_chunk_tensor(pid, uid)
    if emb is None:
        return None, ""
    texts = [t[0] for t in tp]
    hits = engine.search_chunks(question, texts, emb, top_k=3)
    context = "\n\n".join(f"[{tp[h['idx']][1]}] {h['chunk']}" for h in hits)
    best = hits[0]
    source_label = tp[best["idx"]][1]
    if best["score"] < 0.35:
        return None, context
    return {"answer": format_for_learning(best["chunk"]), "confidence": round(best["score"], 3), "topic": "Your uploaded notes",
            "source": f"Your notes · {source_label}", "source_label": source_label,
            "in_domain": True, "supporting_concepts": []}, context


@api.post("/ai/ask")
async def ai_ask(body: AskIn, user=Depends(current_user)):
    pdf_context = ""
    # Example requests alone may use the configured OpenAI service; other clarification actions are local.
    if body.previous_answer and is_clarification(body.question):
        is_example = body.clarification_action == "example" or bool(re.search(r"\bexamples?\b", body.question, re.I))
        if body.pdf_id:
            _, pdf_context = await _pdf_answer(body.pdf_id, user["id"], body.previous_question or body.question)
        if is_example:
            try:
                explanation = await openai_generate_example(
                    body.previous_question or body.question, body.previous_answer, pdf_context, body.question)
                source = "OpenAI Biology example" if openai_is_configured() else "Example based on your notes"
            except Exception as exc:
                logger.exception("OpenAI example generation failed")
                raise HTTPException(status_code=503, detail="The example is temporarily unavailable. Please try again.") from exc
        else:
            explanation = _local_clarification(body.previous_answer, body.question)
            source = "Your existing answer"
        await db.chat_history.insert_one({"user_id": user["id"], "question": body.question, "answer": explanation,
                                          "kind": "clarification", "created_at": iso()})
        return {"answer": explanation, "source": source, "in_domain": True, "clarification": True,
                "example": is_example,
                "original_question": body.previous_question or body.question}

    result = None
    if body.pdf_id:
        result, pdf_context = await _pdf_answer(body.pdf_id, user["id"], body.question)
    if result is None:
        result = engine.answer(body.question)
        if body.pdf_id and result.get("in_domain"):
            result["source"] = f"{result.get('source', '')} (Biology dataset — not found in your notes)"
        if result.get("answer"):
            result["answer"] = format_for_learning(result["answer"])
    await db.chat_history.insert_one({
        "user_id": user["id"], "question": body.question, "answer": result["answer"],
        "topic": result.get("topic"), "confidence": result.get("confidence"), "pdf_id": body.pdf_id,
        "in_domain": result.get("in_domain"), "created_at": iso()})
    await check_achievements(user["id"])
    await log_activity(user["id"], "ask", body.question[:60])
    return result


@api.post("/ai/explain")
async def ai_explain(body: ClarifyIn, user=Depends(current_user)):
    """Legacy local clarification route. OpenAI is reserved for the example button."""
    explanation = _local_clarification(body.previous_answer, body.request)
    await db.chat_history.insert_one({"user_id": user["id"], "question": body.question,
                                      "answer": explanation, "kind": "clarification",
                                      "created_at": iso()})
    return {"answer": explanation, "source": "Your existing answer", "in_domain": True}


@api.get("/ai/history")
async def ai_history(user=Depends(current_user)):
    return await db.chat_history.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/model/evaluation")
async def model_eval():
    path = ROOT_DIR / "Model" / "evaluation_results.json"
    if path.exists():
        import json
        return json.loads(path.read_text())
    raise HTTPException(status_code=404, detail="Evaluation not found. Run Training/evaluation.py")


UPLOAD_DIR = ROOT_DIR / os.environ.get("UPLOAD_DIR", "uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_MB = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "20"))


@api.post("/pdfs/upload")
async def upload_pdf(file: UploadFile = File(...), user=Depends(current_user)):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in document_service.SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(document_service.SUPPORTED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Supported formats: {supported}")
    data = await file.read(MAX_MB * 1024 * 1024 + 1)
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_MB}MB limit")
    try:
        processed = document_service.process_document(data, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read {extension or 'document'}: {e}")
    plan = document_service.build_teaching_plan(processed["chunks"], processed["topic_name"])
    res = await db.uploaded_pdfs.insert_one({
        "user_id": user["id"], "filename": filename, "document_type": extension.lstrip("."),
        "num_pages": processed["num_pages"], "num_units": processed["num_pages"],
        "topic_key": processed["topic_key"], "topic_name": processed["topic_name"],
        "pages": processed["pages"], "teaching_plan": plan, "created_at": iso()})
    pid = str(res.inserted_id)
    if processed["chunks"]:
        await db.pdf_chunks.insert_many([
            {"pdf_id": pid, "user_id": user["id"], "page": c["page"],
             "source_type": c["source_type"], "source_label": c["source_label"],
             "text": c["text"], "embedding": c["embedding"]} for c in processed["chunks"]])
    await check_achievements(user["id"])
    await log_activity(user["id"], "pdf_upload", filename)
    return {"id": pid, "filename": filename, "document_type": extension.lstrip("."),
            "num_pages": processed["num_pages"], "num_units": processed["num_pages"],
            "topic_name": processed["topic_name"], "lessons": len(plan),
            "warnings": processed.get("warnings", [])}


async def _owned_pdf(pid, uid):
    try:
        doc = await db.uploaded_pdfs.find_one({"_id": ObjectId(pid)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF id")
    if not doc:
        raise HTTPException(status_code=404, detail="PDF not found")
    if doc["user_id"] != uid:
        raise HTTPException(status_code=403, detail="Not authorized for this PDF")
    return doc


@api.get("/pdfs")
async def list_pdfs(user=Depends(current_user)):
    docs = await db.uploaded_pdfs.find(
        {"user_id": user["id"]}, {"pages": 0, "teaching_plan": 0}).sort("created_at", -1).to_list(100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@api.get("/pdfs/{pid}")
async def get_pdf(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    doc["id"] = str(doc.pop("_id"))
    return doc


@api.get("/pdfs/{pid}/page/{page}")
async def get_page(pid: str, page: int, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    for pg in doc["pages"]:
        if pg["page"] == page:
            return pg
    raise HTTPException(status_code=404, detail="Page not found")


async def _pdf_chunk_tensor(pid, uid):
    chunks = await db.pdf_chunks.find({"pdf_id": pid, "user_id": uid}).to_list(2000)
    if not chunks:
        return [], None
    tp = [(c["text"], c.get("source_label") or f"Page {c['page']}") for c in chunks]
    emb = torch.tensor([c["embedding"] for c in chunks])
    return tp, emb


@api.post("/pdfs/{pid}/ask")
async def ask_pdf(pid: str, body: AskIn, user=Depends(current_user)):
    await _owned_pdf(pid, user["id"])
    tp, emb = await _pdf_chunk_tensor(pid, user["id"])
    if emb is not None:
        texts = [t[0] for t in tp]
        hits = engine.search_chunks(body.question, texts, emb, top_k=3)
        best = hits[0]
        if best["score"] >= 0.35:
            source_label = tp[best["idx"]][1]
            return {"answer": format_for_learning(best["chunk"]), "confidence": round(best["score"], 3),
                    "source": f"Your notes · {source_label}", "source_label": source_label, "in_domain": True}
    result = engine.answer(body.question)
    if result.get("answer"):
        result["answer"] = format_for_learning(result["answer"])
    result["source"] = str(result.get("source", "")) + " (from Biology dataset — not found in your notes)"
    return result


@api.post("/pdfs/{pid}/summary")
async def pdf_summary(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    tp, _ = await _pdf_chunk_tensor(pid, user["id"])
    return {"summary": [format_for_learning(t[0]) for t in tp[:6]], "topic": doc.get("topic_name")}


@api.post("/pdfs/{pid}/notes")
async def pdf_notes(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    tp, _ = await _pdf_chunk_tensor(pid, user["id"])
    texts = [format_for_learning(t[0]) for t in tp]
    return {"overview": texts[0] if texts else "", "key_points": texts[1:8],
            "topic": doc.get("topic_name"), "num_pages": doc.get("num_pages")}


@api.post("/pdfs/{pid}/mcqs")
async def pdf_mcqs(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    return {"mcqs": engine.build_mcqs(topic=doc.get("topic_key") or "all", limit=5)}


@api.post("/pdfs/{pid}/flashcards")
async def pdf_flashcards(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    qs = engine.get_topic_questions(topic=doc.get("topic_key") or "all", limit=10)
    return {"flashcards": [{"front": q.get("question"), "back": q["answer"]} for q in qs]}


@api.post("/pdfs/{pid}/exam-questions")
async def pdf_exam(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    qs = engine.get_topic_questions(topic=doc.get("topic_key") or "all", limit=12)
    return {"two_mark": [q.get("question") for q in qs if q.get("difficulty") == "beginner"][:4],
            "five_mark": [q.get("question") for q in qs if q.get("difficulty") == "intermediate"][:3],
            "ten_mark": [q.get("question") for q in qs if q.get("difficulty") == "advanced"][:2]}


@api.post("/pdfs/{pid}/viva")
async def pdf_viva(pid: str, user=Depends(current_user)):
    doc = await _owned_pdf(pid, user["id"])
    qs = engine.get_topic_questions(topic=doc.get("topic_key") or "all", limit=8)
    return {"viva": [{"question": q.get("question"), "answer": q["answer"]} for q in qs]}


@api.post("/pdfs/search")
async def pdf_search(body: AskIn, user=Depends(current_user)):
    chunks = await db.pdf_chunks.find({"user_id": user["id"]}).to_list(3000)
    if not chunks:
        return {"results": []}
    texts = [c["text"] for c in chunks]
    emb = torch.tensor([c["embedding"] for c in chunks])
    hits = engine.search_chunks(body.question, texts, emb, top_k=5)
    return {"results": [{"text": h["chunk"], "score": round(h["score"], 3),
                         "page": chunks[h["idx"]]["page"], "pdf_id": chunks[h["idx"]]["pdf_id"]}
                        for h in hits if h["score"] > 0.25]}


@api.delete("/pdfs/{pid}")
async def delete_pdf(pid: str, user=Depends(current_user)):
    await _owned_pdf(pid, user["id"])
    await db.uploaded_pdfs.delete_one({"_id": ObjectId(pid)})
    await db.pdf_chunks.delete_many({"pdf_id": pid})
    return {"message": "deleted"}


@api.post("/diagrams/explain")
async def explain_diagram(file: UploadFile = File(...), user=Depends(current_user)):
    """OCR a labelled diagram image and explain each Biology label (no external APIs)."""
    ct = (file.content_type or "").lower()
    if not (ct.startswith("image/") or file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp"))):
        raise HTTPException(status_code=400, detail="Please upload an image file (PNG, JPG, WEBP).")
    data = await file.read()
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image exceeds {MAX_MB}MB limit")
    try:
        result = diagram_service.explain_diagram(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read diagram: {e}")
    if result["recognized_count"] == 0:
        result["message"] = ("No Biology labels from Photosynthesis, the Digestive or Respiratory "
                             "systems were recognised in this diagram. Try a clearer image with readable labels.")
    await log_activity(user["id"], "diagram", f"{file.filename} · {result['recognized_count']} labels")
    return result


@api.post("/pdfs/{pid}/teach/ask")
async def teach_ask(pid: str, body: TeachAskIn, user=Depends(current_user)):
    await _owned_pdf(pid, user["id"])
    if body.is_example:
        try:
            answer = await openai_generate_example(
                body.question, body.context or "", body.context or "", "Give one concrete Biology example.")
        except Exception as exc:
            logger.exception("OpenAI example generation failed")
            raise HTTPException(status_code=503, detail="The example is temporarily unavailable. Please try again.") from exc
        source = "OpenAI Biology example" if openai_is_configured() else "Example based on your lesson"
        return {"answer": answer, "source": source, "in_domain": True, "example": True}
    tp, emb = await _pdf_chunk_tensor(pid, user["id"])
    if emb is not None:
        texts = [t[0] for t in tp]
        hits = engine.search_chunks(body.question, texts, emb, top_k=2)
        if hits and hits[0]["score"] >= 0.40:
            source_label = tp[hits[0]["idx"]][1]
            return {"answer": format_for_learning(hits[0]["chunk"]), "source": f"Your notes · {source_label}",
                    "confidence": round(hits[0]["score"], 3), "in_domain": True}
    result = engine.answer(body.question)
    if result.get("answer"):
        result["answer"] = format_for_learning(result["answer"])
    return result


@api.get("/quiz/generate")
async def quiz_generate(pdf_id: Optional[str] = None, topic: str = "all", difficulty: str = "medium", count: int = 5,
                        user=Depends(current_user)):
    if count < 1 or count > 20:
        raise HTTPException(status_code=400, detail="Choose between 1 and 20 questions")
    # Keep the old API contract available for existing clients; the student UI always sends pdf_id.
    if not pdf_id:
        return {"questions": engine.build_mcqs(topic=topic, difficulty=difficulty, limit=count), "legacy": True}
    if difficulty not in {"easy", "medium", "hard"}:
        raise HTTPException(status_code=400, detail="Difficulty must be easy, medium, or hard")
    doc = await _owned_pdf(pdf_id, user["id"])
    chunks = await db.pdf_chunks.find(
        {"pdf_id": pdf_id, "user_id": user["id"]},
        {"_id": 0, "text": 1, "page": 1, "source_label": 1},
    ).to_list(2000)
    if not chunks:
        raise HTTPException(status_code=400, detail="This PDF has no extractable study text")
    previous = await db.quiz_question_history.find({"user_id": user["id"], "pdf_id": pdf_id}, {"_id": 0, "question": 1}).to_list(500)
    excluded_questions = [p["question"] for p in previous if p.get("question")]
    excluded = {fingerprint(q) for q in excluded_questions}
    questions = fallback_questions(chunks, count, excluded, difficulty)
    questions = [q for q in questions if fingerprint(q.get("question", "")) not in excluded]
    if not questions:
        raise HTTPException(status_code=400, detail="This PDF does not have enough new content for another quiz")
    questions = questions[:count]
    for q in questions:
        await db.quiz_question_history.insert_one({"user_id": user["id"], "pdf_id": pdf_id,
                                                   "question": q["question"], "fingerprint": fingerprint(q["question"]),
                                                   "created_at": iso()})
    return {"pdf_id": pdf_id, "filename": doc["filename"], "difficulty": difficulty, "questions": questions}


@api.post("/quiz/submit")
async def quiz_submit(body: QuizSubmitIn, user=Depends(current_user)):
    total = len(body.answers)
    correct = sum(1 for a in body.answers if a.get("correct"))
    pct = round((correct / total) * 100, 1) if total else 0
    weak = []
    for a in body.answers:
        if not a.get("correct"):
            weak.extend(a.get("concepts", []))
    weak = list(dict.fromkeys([w for w in weak if w]))[:8]
    await db.quiz_results.insert_one({"user_id": user["id"], "topic": body.topic, "total": total,
                                      "pdf_id": body.pdf_id,
                                      "answers": body.answers,
                                      "correct": correct, "percentage": pct,
                                      "weak_concepts": weak, "created_at": iso()})
    await check_achievements(user["id"])
    await log_activity(user["id"], "quiz", f"{body.topic} · {pct}%")
    rec = "Review: " + ", ".join(weak[:3]) if weak else "Great job! Keep practicing."
    wrong = [{"question": a.get("question"), "correct_answer": a.get("correct_answer"),
              "explanation": a.get("explanation") or "Review this question in your uploaded notes.",
              "selected": a.get("selected")} for a in body.answers if not a.get("correct")]
    return {"total": total, "correct": correct, "incorrect": total - correct, "percentage": pct,
            "weak_concepts": weak, "wrong_questions": wrong, "recommendation": rec}


@api.post("/practice/evaluate")
async def practice_eval(body: PracticeIn, user=Depends(current_user)):
    result = engine.evaluate_answer(body.student_answer, body.model_answer, body.concepts)
    result["feedback"] = ("Excellent, well covered!" if result["percentage"] >= 75
                          else "Good attempt, but add the missing concepts." if result["percentage"] >= 45
                          else "Needs improvement. Study the model answer carefully.")
    await db.quiz_results.insert_one({
        "user_id": user["id"], "topic": body.topic, "total": 1,
        "correct": 1 if result["percentage"] >= 50 else 0, "percentage": result["percentage"],
        "weak_concepts": result["missing_concepts"], "kind": "practice", "created_at": iso()})
    await log_activity(user["id"], "practice", body.question[:60])
    return result


class FlashStatusIn(BaseModel):
    front: str
    back: str
    topic: Optional[str] = None
    status: str


@api.get("/flashcards/generate")
async def flash_generate(topic: str = "all", count: int = 10, user=Depends(current_user)):
    qs = engine.get_topic_questions(topic=topic, limit=count)
    return {"flashcards": [{"front": q.get("question"), "back": q["answer"],
                            "topic": q.get("topic"), "concepts": q.get("concepts", [])} for q in qs]}


@api.get("/exam/generate")
async def exam_generate(topic: str = "all", user=Depends(current_user)):
    qs = engine.get_topic_questions(topic=topic, limit=30)
    def pick(diff, n):
        return [{"question": q.get("question"), "answer": q["answer"]}
                for q in qs if q.get("difficulty") == diff][:n]
    mcqs = engine.build_mcqs(topic=topic, limit=5)
    return {"two_mark": pick("beginner", 5), "five_mark": pick("intermediate", 4),
            "ten_mark": pick("advanced", 3), "mcqs": mcqs,
            "viva": [{"question": q.get("question"), "answer": q["answer"]} for q in qs[:6]]}



@api.post("/flashcards/status")
async def flash_status(body: FlashStatusIn, user=Depends(current_user)):
    await db.flashcards.update_one(
        {"user_id": user["id"], "front": body.front},
        {"$set": {"back": body.back, "topic": body.topic, "status": body.status, "updated_at": iso()}},
        upsert=True)
    if body.status == "bookmark":
        await db.bookmarks.update_one(
            {"user_id": user["id"], "title": body.front},
            {"$setOnInsert": {"user_id": user["id"], "title": body.front,
                              "note": body.back, "created_at": iso()}},
            upsert=True)
    return {"message": "saved"}


@api.get("/flashcards/saved")
async def flash_saved(user=Depends(current_user)):
    return await db.flashcards.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)


class BookmarkIn(BaseModel):
    pdf_id: Optional[str] = None
    page: Optional[int] = None
    title: str
    note: Optional[str] = ""


@api.post("/bookmarks")
async def add_bookmark(body: BookmarkIn, user=Depends(current_user)):
    doc = body.model_dump()
    doc.update({"user_id": user["id"], "created_at": iso()})
    res = await db.bookmarks.insert_one(doc)
    return {"id": str(res.inserted_id)}


@api.get("/bookmarks")
async def list_bookmarks(user=Depends(current_user)):
    docs = await db.bookmarks.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@api.delete("/bookmarks/{bid}")
async def del_bookmark(bid: str, user=Depends(current_user)):
    r = await db.bookmarks.delete_one({"_id": ObjectId(bid), "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "deleted"}


async def _compute_progress(uid):
    quizzes = await db.quiz_results.find({"user_id": uid}, {"_id": 0}).to_list(500)
    topic_scores = {}
    for q in quizzes:
        t = q.get("topic") or "all"
        if t != "all":
            topic_scores.setdefault(t, []).append(q.get("percentage", 0))
    topic_avg = {t: round(sum(v) / len(v), 1) for t, v in topic_scores.items()}
    weak = sorted(topic_avg.items(), key=lambda x: x[1])[:3]
    strong = sorted(topic_avg.items(), key=lambda x: -x[1])[:3]
    from collections import Counter
    wc = []
    for q in quizzes:
        wc.extend(q.get("weak_concepts", []))
    weak_concepts = [c for c, _ in Counter(wc).most_common(6)]
    n_questions = await db.chat_history.count_documents({"user_id": uid})
    n_pdfs = await db.uploaded_pdfs.count_documents({"user_id": uid})
    n_mastered = await db.flashcards.count_documents({"user_id": uid, "status": "mastered"})
    sessions = await db.study_sessions.find({"user_id": uid}, {"created_at": 1, "_id": 0}).to_list(1000)
    days = set()
    for s in sessions:
        try:
            days.add(datetime.fromisoformat(s["created_at"]).date())
        except Exception:
            pass
    streak = 0
    d = now().date()
    while d in days:
        streak += 1
        d = d - timedelta(days=1)
    recent = await db.study_sessions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(8)
    recommended = weak[0][0] if weak else "photosynthesis"
    return {"topic_scores": topic_avg, "weak_topics": weak, "strong_topics": strong,
            "weak_concepts": weak_concepts, "questions_answered": n_questions,
            "pdfs_studied": n_pdfs, "flashcards_mastered": n_mastered, "quizzes_taken": len(quizzes),
            "study_streak": streak, "recent_activity": recent, "recommended_topic": recommended}


@api.get("/progress")
async def progress(user=Depends(current_user)):
    return await _compute_progress(user["id"])


@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    uid = user["id"]
    prog = await _compute_progress(uid)
    last_pdf = await db.uploaded_pdfs.find_one({"user_id": uid}, {"pages": 0}, sort=[("created_at", -1)])
    if last_pdf:
        last_pdf["id"] = str(last_pdf.pop("_id"))
    last_quiz = await db.quiz_results.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", -1)])
    achievements = await db.achievements.find({"user_id": uid}, {"_id": 0}).to_list(50)
    today = now().date().isoformat()
    today_qs = await db.chat_history.count_documents({"user_id": uid, "created_at": {"$gte": today}})
    return {"user": {"name": user.get("name"), "email": user["email"]},
            "today_goal": {"target": 10, "done": today_qs}, "study_streak": prog["study_streak"],
            "topics_covered": len(prog["topic_scores"]), "recent_activity": prog["recent_activity"],
            "recent_pdf": last_pdf, "last_quiz": last_quiz, "topic_scores": prog["topic_scores"],
            "weak_topics": prog["weak_topics"], "recommended_topic": prog["recommended_topic"],
            "achievements": achievements, "questions_answered": prog["questions_answered"]}


@api.get("/achievements")
async def achievements(user=Depends(current_user)):
    return await db.achievements.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)


@api.get("/topics")
async def topics():
    engine.load()
    return {"topics": [{"key": k, "name": v} for k, v in engine.display_names.items()]}


@api.get("/")
async def root():
    return {"message": "AI Biology Study Assistant API", "status": "running"}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.pdf_chunks.create_index("pdf_id")
    await db.pdf_chunks.create_index("user_id")
    await db.chat_history.create_index("user_id")
    await db.quiz_results.create_index("user_id")
    try:
        engine.load()
        logger.info("NLP engine loaded")
    except Exception as e:
        logger.error(f"NLP engine load failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    db.close()
