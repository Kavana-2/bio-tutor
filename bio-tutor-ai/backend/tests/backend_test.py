"""Comprehensive backend regression suite for AI Biology Study Assistant.
Hits the public preview URL from frontend/.env (REACT_APP_BACKEND_URL).
Covers: auth (register/login/me/logout/refresh/lockout/reset), NLP domain restriction,
quiz, practice, flashcards, exam, dashboard/progress, bookmarks, pdfs, topics.
"""
import os
import uuid
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE = base.rstrip("/") + "/api"

DOMAIN_MESSAGE = "I am trained only on Photosynthesis, Digestive System, and Respiratory System."


def new_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@test.com"


@pytest.fixture(scope="module")
def creds():
    p = Path("/app/memory/test_credentials.md")
    c = p.read_text()
    email = re.search(r"Email:\s*`([^`]+)`", c).group(1)
    pwd = re.search(r"Password:\s*`([^`]+)`", c).group(1)
    return {"email": email, "password": pwd}


@pytest.fixture(scope="module")
def client(creds):
    """Session logged in with the documented test student account (cookie auth)."""
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json=creds)
    if r.status_code != 200:
        # fall back to registering the documented account
        r2 = s.post(f"{BASE}/auth/register", json={"name": "Test Student", **creds})
        if r2.status_code != 200:
            pytest.fail(f"Login failed ({r.status_code}: {r.text[:200]}) and register failed "
                        f"({r2.status_code}: {r2.text[:200]})")
        r = r2
    assert "access_token" in r.json()
    return s


# ---------------- Auth module ----------------
class TestAuth:
    def test_root_health(self):
        r = requests.get(f"{BASE}/")
        assert r.status_code == 200
        assert r.json().get("status") == "running"

    def test_register_sets_httponly_cookies(self):
        s = requests.Session()
        email = new_email()
        r = s.post(f"{BASE}/auth/register", json={"name": "TEST User", "email": email, "password": "test123"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == email.lower()
        assert d["role"] == "student"
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20
        raw = r.headers.get("set-cookie", "")
        assert "access_token" in raw and "HttpOnly" in raw, raw
        assert "refresh_token" in raw
        # cookie auth works without Authorization header
        me = s.get(f"{BASE}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()
        assert "password_hash" not in me.json()
        assert "_id" not in me.json()

    def test_duplicate_register_rejected(self):
        email = new_email()
        payload = {"name": "TEST Dup", "email": email, "password": "test123"}
        assert requests.post(f"{BASE}/auth/register", json=payload).status_code == 200
        r = requests.post(f"{BASE}/auth/register", json=payload)
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()

    def test_register_validation(self):
        assert requests.post(f"{BASE}/auth/register", json={"name": "a", "email": "bad", "password": "test123"}).status_code == 422
        assert requests.post(f"{BASE}/auth/register", json={"name": "a", "email": new_email(), "password": "123"}).status_code == 422

    def test_login_logout_and_relogin(self):
        s = requests.Session()
        email, pwd = new_email(), "test123"
        assert s.post(f"{BASE}/auth/register", json={"name": "TEST L", "email": email, "password": pwd}).status_code == 200
        assert s.post(f"{BASE}/auth/logout").status_code == 200
        s.cookies.clear()
        assert s.get(f"{BASE}/auth/me").status_code == 401
        r = s.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
        assert r.status_code == 200, r.text
        assert s.get(f"{BASE}/auth/me").json()["email"] == email.lower()

    def test_bcrypt_hash_format(self):
        """Password hash must be bcrypt $2b$ (checked directly in SQLite)."""
        import json as _json
        import sqlite3
        from pathlib import Path
        db_path = Path(__file__).resolve().parent.parent / "database.sqlite"
        email = new_email()
        assert requests.post(f"{BASE}/auth/register", json={"name": "TEST H", "email": email, "password": "test123"}).status_code == 200
        conn = sqlite3.connect(db_path)
        row = conn.execute("SELECT doc FROM users WHERE json_extract(doc, '$.email') = ?", (email.lower(),)).fetchone()
        conn.close()
        assert row is not None
        u = _json.loads(row[0])
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_refresh_token_flow(self):
        s = requests.Session()
        email = new_email()
        s.post(f"{BASE}/auth/register", json={"name": "TEST R", "email": email, "password": "test123"})
        r = s.post(f"{BASE}/auth/refresh")
        assert r.status_code == 200, r.text
        assert s.get(f"{BASE}/auth/me").status_code == 200
        # no refresh cookie -> 401
        assert requests.post(f"{BASE}/auth/refresh").status_code == 401

    def test_unauthenticated_protected_routes(self):
        for path in ["/auth/me", "/dashboard", "/progress", "/quiz/generate", "/flashcards/generate",
                     "/exam/generate", "/ai/history", "/bookmarks", "/pdfs", "/achievements"]:
            assert requests.get(f"{BASE}{path}").status_code == 401, path
        assert requests.post(f"{BASE}/ai/ask", json={"question": "hi"}).status_code == 401

    def test_invalid_token_rejected(self):
        r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer garbage.token.value"})
        assert r.status_code == 401

    def test_brute_force_lockout(self):
        email = new_email()
        requests.post(f"{BASE}/auth/register", json={"name": "TEST B", "email": email, "password": "test123"})
        codes = []
        for _ in range(7):
            codes.append(requests.post(f"{BASE}/auth/login", json={"email": email, "password": "wrong"}).status_code)
        assert 429 in codes, f"No lockout after repeated failures: {codes}"
        # locked out even with correct password
        r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "test123"})
        assert r.status_code == 429

    def test_forgot_and_reset_password(self):
        email, newpwd = new_email(), "newpass123"
        requests.post(f"{BASE}/auth/register", json={"name": "TEST F", "email": email, "password": "test123"})
        r = requests.post(f"{BASE}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        token = r.json().get("dev_token")
        assert token
        assert requests.post(f"{BASE}/auth/reset-password", json={"token": token, "password": newpwd}).status_code == 200
        assert requests.post(f"{BASE}/auth/login", json={"email": email, "password": newpwd}).status_code == 200
        # token cannot be reused
        assert requests.post(f"{BASE}/auth/reset-password", json={"token": token, "password": "another123"}).status_code == 400

    def test_forgot_password_unknown_email_no_leak(self):
        r = requests.post(f"{BASE}/auth/forgot-password", json={"email": new_email()})
        assert r.status_code == 200
        assert "dev_token" not in r.json()


# ---------------- NLP engine / Ask AI ----------------
class TestAskAI:
    @pytest.mark.parametrize("q,expect_topic", [
        ("What is chlorophyll?", "Photosynthesis"),
        ("What is the role of the alveoli?", "Respiratory"),
        ("What does the small intestine do?", "Digest"),
    ])
    def test_in_domain_answers(self, client, q, expect_topic):
        r = client.post(f"{BASE}/ai/ask", json={"question": q})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["in_domain"] is True, d
        assert d["answer"] != DOMAIN_MESSAGE
        assert d["confidence"] > 0.3
        assert expect_topic.lower() in (d.get("topic") or "").lower(), d.get("topic")
        assert isinstance(d["supporting_concepts"], list) and len(d["supporting_concepts"]) > 0

    @pytest.mark.parametrize("q", [
        "What is the capital of France?",
        "Write Python code.",
        "Tell me a joke.",
        "What is Machine Learning?",
        "Explain blockchain.",
        "Who won the world cup?",
        "How do I cook pasta?",
    ])
    def test_out_of_domain_exact_message(self, client, q):
        d = client.post(f"{BASE}/ai/ask", json={"question": q}).json()
        assert d["answer"] == DOMAIN_MESSAGE, (q, d)
        assert d["in_domain"] is False
        assert d["source"] == "domain_restriction"
        assert d["topic"] is None

    def test_empty_question_validation(self, client):
        assert client.post(f"{BASE}/ai/ask", json={"question": ""}).status_code == 422

    def test_history_persistence(self, client):
        q = f"TEST What is stomata {uuid.uuid4().hex[:5]}?"
        client.post(f"{BASE}/ai/ask", json={"question": "What are stomata?"})
        h = client.get(f"{BASE}/ai/history")
        assert h.status_code == 200
        items = h.json()
        assert isinstance(items, list) and len(items) > 0
        assert all("_id" not in i for i in items)
        assert any("stomata" in i["question"].lower() for i in items)

    def test_topics_endpoint(self):
        r = requests.get(f"{BASE}/topics")
        assert r.status_code == 200
        keys = {t["key"] for t in r.json()["topics"]}
        assert {"photosynthesis", "digestion", "respiratory"} <= keys

    def test_model_evaluation(self):
        r = requests.get(f"{BASE}/model/evaluation")
        assert r.status_code == 200
        assert "topic_classification" in r.json()


# ---------------- Quiz ----------------
class TestQuiz:
    def test_generate_structure(self, client):
        r = client.get(f"{BASE}/quiz/generate", params={"topic": "photosynthesis", "count": 5})
        assert r.status_code == 200
        qs = r.json()["questions"]
        assert len(qs) == 5
        for q in qs:
            assert q["question"]
            assert len(q["options"]) == 4
            assert len(set(q["options"])) == 4, "duplicate options in MCQ"
            assert q["options"][q["correct_index"]] == q["correct_answer"]
            assert "Photosynthesis" in q["topic"]

    def test_submit_mixed_score_and_persistence(self, client):
        qs = client.get(f"{BASE}/quiz/generate", params={"topic": "digestion", "count": 4}).json()["questions"]
        answers = [{"correct": i % 2 == 0, "concepts": q["concepts"]} for i, q in enumerate(qs)]
        r = client.post(f"{BASE}/quiz/submit", json={"topic": "digestion", "answers": answers})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 4 and d["correct"] == 2 and d["percentage"] == 50.0
        assert isinstance(d["weak_concepts"], list) and len(d["weak_concepts"]) > 0
        assert d["recommendation"]
        # persisted -> progress reflects digestion score
        prog = client.get(f"{BASE}/progress").json()
        assert "digestion" in prog["topic_scores"]
        assert prog["quizzes_taken"] >= 1

    def test_submit_empty_answers(self, client):
        r = client.post(f"{BASE}/quiz/submit", json={"topic": "all", "answers": []})
        assert r.status_code == 200
        assert r.json()["percentage"] == 0


# ---------------- Practice ----------------
class TestPractice:
    def test_good_answer_high_score(self, client):
        r = client.post(f"{BASE}/practice/evaluate", json={
            "question": "What is photosynthesis?",
            "student_answer": "Plants use sunlight, carbon dioxide and water to make glucose and oxygen.",
            "model_answer": "Photosynthesis converts light energy into glucose using carbon dioxide and water, releasing oxygen.",
            "concepts": ["glucose", "oxygen", "carbon dioxide"], "topic": "photosynthesis"})
        assert r.status_code == 200
        d = r.json()
        assert d["percentage"] >= 60, d
        assert set(d["matched_concepts"]) == {"glucose", "oxygen", "carbon dioxide"}
        assert d["missing_concepts"] == []
        assert d["feedback"]
        assert d["model_answer"].startswith("Photosynthesis")

    def test_poor_answer_low_score(self, client):
        d = client.post(f"{BASE}/practice/evaluate", json={
            "question": "What is photosynthesis?", "student_answer": "I do not know",
            "model_answer": "Photosynthesis converts light energy into glucose using carbon dioxide and water.",
            "concepts": ["glucose", "carbon dioxide"], "topic": "photosynthesis"}).json()
        assert d["percentage"] < 45, d
        assert sorted(d["missing_concepts"]) == ["carbon dioxide", "glucose"]
        assert "improvement" in d["feedback"].lower()


# ---------------- Flashcards ----------------
class TestFlashcards:
    def test_generate_and_status(self, client):
        r = client.get(f"{BASE}/flashcards/generate", params={"topic": "respiratory", "count": 6})
        assert r.status_code == 200
        cards = r.json()["flashcards"]
        assert len(cards) == 6
        assert all(c["front"] and c["back"] for c in cards)
        front = cards[0]["front"]
        assert client.post(f"{BASE}/flashcards/status", json={
            "front": front, "back": cards[0]["back"], "topic": "respiratory",
            "status": "mastered"}).status_code == 200
        saved = client.get(f"{BASE}/flashcards/saved").json()
        match = [c for c in saved if c["front"] == front]
        assert match and match[0]["status"] == "mastered"
        assert all("_id" not in c for c in saved)
        # idempotent update (upsert not duplicate)
        client.post(f"{BASE}/flashcards/status", json={
            "front": front, "back": cards[0]["back"], "topic": "respiratory", "status": "difficult"})
        saved2 = client.get(f"{BASE}/flashcards/saved").json()
        assert len([c for c in saved2 if c["front"] == front]) == 1
        assert [c for c in saved2 if c["front"] == front][0]["status"] == "difficult"


# ---------------- Exam mode ----------------
class TestExam:
    def test_exam_generate(self, client):
        r = client.get(f"{BASE}/exam/generate", params={"topic": "photosynthesis"})
        assert r.status_code == 200
        d = r.json()
        for k in ["two_mark", "five_mark", "ten_mark", "mcqs", "viva"]:
            assert k in d, k
            assert isinstance(d[k], list)
        assert len(d["mcqs"]) > 0
        assert len(d["viva"]) > 0
        assert len(d["two_mark"]) > 0, "no beginner questions returned"
        assert len(d["five_mark"]) > 0, "no intermediate questions returned"
        assert len(d["ten_mark"]) > 0, "no advanced questions returned"


# ---------------- Dashboard / progress ----------------
class TestDashboard:
    def test_dashboard(self, client):
        r = client.get(f"{BASE}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["user", "today_goal", "study_streak", "topic_scores", "recommended_topic",
                  "achievements", "questions_answered", "recent_activity"]:
            assert k in d, k
        assert d["user"]["email"]
        assert isinstance(d["study_streak"], int) and d["study_streak"] >= 1
        assert isinstance(d["questions_answered"], int)
        assert d["recommended_topic"]

    def test_progress(self, client):
        d = client.get(f"{BASE}/progress").json()
        for k in ["topic_scores", "weak_topics", "strong_topics", "weak_concepts",
                  "questions_answered", "quizzes_taken", "study_streak"]:
            assert k in d, k

    def test_achievements_awarded(self, client):
        client.post(f"{BASE}/ai/ask", json={"question": "What is respiration?"})
        r = client.get(f"{BASE}/achievements")
        assert r.status_code == 200
        titles = [a["title"] for a in r.json()]
        assert "Curious Mind" in titles, titles


# ---------------- Bookmarks CRUD ----------------
class TestBookmarks:
    def test_crud(self, client):
        title = f"TEST bookmark {uuid.uuid4().hex[:6]}"
        r = client.post(f"{BASE}/bookmarks", json={"title": title, "note": "TEST note"})
        assert r.status_code == 200
        bid = r.json()["id"]
        items = client.get(f"{BASE}/bookmarks").json()
        found = [b for b in items if b["id"] == bid]
        assert found and found[0]["title"] == title and found[0]["note"] == "TEST note"
        assert all("_id" not in b for b in items)
        assert client.delete(f"{BASE}/bookmarks/{bid}").status_code == 200
        assert bid not in [b["id"] for b in client.get(f"{BASE}/bookmarks").json()]
        assert client.delete(f"{BASE}/bookmarks/{bid}").status_code == 404


# ---------------- PDFs ----------------
class TestPDFs:
    def test_empty_or_list(self, client):
        r = client.get(f"{BASE}/pdfs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_invalid_id_and_missing(self, client):
        assert client.get(f"{BASE}/pdfs/not-an-objectid").status_code == 400
        assert client.get(f"{BASE}/pdfs/64b2f0000000000000000000").status_code == 404

    def test_ownership_protection(self, client):
        """Upload as user A, ensure user B cannot read it."""
        pdf = _make_pdf()
        up = client.post(f"{BASE}/pdfs/upload", files={"file": ("TEST_notes.pdf", pdf, "application/pdf")})
        if up.status_code != 200:
            pytest.fail(f"PDF upload failed: {up.status_code} {up.text[:300]}")
        pid = up.json()["id"]
        assert up.json()["num_pages"] >= 1

        other = requests.Session()
        other.post(f"{BASE}/auth/register", json={"name": "TEST O", "email": new_email(), "password": "test123"})
        assert other.get(f"{BASE}/pdfs/{pid}").status_code == 403

        assert client.post(f"{BASE}/pdfs/{pid}/summary").status_code == 200
        assert client.post(f"{BASE}/pdfs/{pid}/notes").status_code == 200
        assert client.post(f"{BASE}/pdfs/{pid}/mcqs").status_code == 200
        ask = client.post(f"{BASE}/pdfs/{pid}/ask", json={"question": "What is photosynthesis?"})
        assert ask.status_code == 200 and ask.json().get("answer")
        assert client.delete(f"{BASE}/pdfs/{pid}").status_code == 200
        assert client.get(f"{BASE}/pdfs/{pid}").status_code == 404

    def test_non_pdf_rejected(self, client):
        r = client.post(f"{BASE}/pdfs/upload", files={"file": ("TEST_bad.txt", b"hello", "text/plain")})
        assert r.status_code == 400


def _make_pdf():
    """Minimal one-page PDF with extractable text (PyMuPDF, already a backend dep)."""
    try:
        import pymupdf
    except ImportError:
        pytest.skip("pymupdf not available; cannot generate test PDF")
    doc = pymupdf.open()
    page = doc.new_page()
    text = ("Photosynthesis is the process by which green plants convert light energy\n"
            "into chemical energy stored as glucose using chlorophyll in chloroplasts.\n"
            "Carbon dioxide and water are the raw materials and oxygen is released.\n"
            "The light dependent reactions occur in the thylakoid membranes of the chloroplast.\n"
            "The Calvin cycle fixes carbon dioxide into glucose in the stroma using ATP and NADPH.")
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 400), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data
