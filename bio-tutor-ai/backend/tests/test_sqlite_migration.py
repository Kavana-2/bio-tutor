"""SQLite migration regression tests.

Covers areas requested for the SQLite swap:
- No pymongo/motor/bson import in backend source.
- All expected tables exist in database.sqlite.
- PDF-scoped endpoints (/pdfs/{id}/ask, summary, notes, mcqs, flashcards,
  exam-questions, viva, search, teach/ask, page/{n}).
- /ai/ask with pdf_id, clarification flow persisted with kind=clarification and
  /ai/history newest-first.
- /quiz/generate?pdf_id&difficulty=easy&count=3 returns fresh questions on 2nd call
  (quiz_question_history stored in SQLite).
- /flashcards/status upsert-not-duplicate; status=bookmark idempotent.
- /achievements: no duplicate awards for repeated actions.
- PDF delete cascades chunks and blocks quiz generation.
- After PDF delete: /quiz/generate returns 404.
"""
import json
import os
import re
import sqlite3
import subprocess
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
BASE = base.rstrip("/") + "/api"
DB_PATH = Path("/app/backend/database.sqlite")


def new_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@test.com"


def _make_pdf():
    import pymupdf
    doc = pymupdf.open()
    text = (
        "Photosynthesis converts light energy into chemical energy stored in glucose.\n"
        "Chlorophyll in chloroplasts captures light in the thylakoid membranes.\n"
        "Water is split (photolysis) releasing oxygen as a by-product.\n"
        "Carbon dioxide from air is fixed in the Calvin cycle producing glucose.\n"
        "The stomata on leaves allow gas exchange between the leaf and atmosphere.\n"
    )
    for _ in range(2):
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 550, 700), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture(scope="module")
def creds():
    p = Path("/app/memory/test_credentials.md").read_text()
    email = re.search(r"Email:\s*`([^`]+)`", p).group(1)
    pwd = re.search(r"Password:\s*`([^`]+)`", p).group(1)
    return {"email": email, "password": pwd}


@pytest.fixture(scope="module")
def client(creds):
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json=creds)
    if r.status_code != 200:
        r2 = s.post(f"{BASE}/auth/register", json={"name": "Test Student", **creds})
        assert r2.status_code == 200, r2.text
    return s


@pytest.fixture(scope="module")
def owned_pdf_id(client):
    up = client.post(f"{BASE}/pdfs/upload",
                     files={"file": ("TEST_photo.pdf", _make_pdf(), "application/pdf")})
    assert up.status_code == 200, up.text
    pid = up.json()["id"]
    yield pid
    # cleanup
    try:
        client.delete(f"{BASE}/pdfs/{pid}")
    except Exception:
        pass


# ---------------- SQLite integrity ----------------
class TestSQLiteIntegrity:
    def test_no_mongo_imports_in_source(self):
        result = subprocess.run(
            ["grep", "-rEn", r"^\s*(import|from)\s+(motor|pymongo|bson)",
             "/app/backend/server.py", "/app/backend/auth.py",
             "/app/backend/pdf_service.py", "/app/backend/diagram_service.py",
             "/app/backend/nlp_engine.py", "/app/backend/services"],
            capture_output=True, text=True
        )
        assert result.stdout.strip() == "", f"Mongo imports found: {result.stdout}"

    def test_sqlite_file_exists(self):
        assert DB_PATH.exists()

    def test_expected_tables_exist(self):
        conn = sqlite3.connect(DB_PATH)
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        conn.close()
        expected = {"users", "uploaded_pdfs", "pdf_chunks", "chat_history",
                    "quiz_results", "bookmarks", "flashcards", "achievements",
                    "study_sessions", "login_attempts"}
        missing = expected - tables
        assert not missing, f"Missing tables: {missing}. Present: {tables}"


# ---------------- PDF tools ----------------
class TestPDFTools:
    def test_list_excludes_pages_field(self, client, owned_pdf_id):
        items = client.get(f"{BASE}/pdfs").json()
        found = [i for i in items if i["id"] == owned_pdf_id]
        assert found
        assert "pages" not in found[0], "pages should be omitted from list"

    def test_get_pdf_has_pages(self, client, owned_pdf_id):
        d = client.get(f"{BASE}/pdfs/{owned_pdf_id}").json()
        assert isinstance(d.get("pages"), list) and len(d["pages"]) >= 1
        assert d["pages"][0].get("page") == 1

    def test_get_pdf_page(self, client, owned_pdf_id):
        r = client.get(f"{BASE}/pdfs/{owned_pdf_id}/page/1")
        assert r.status_code == 200
        assert r.json().get("page") == 1

    def test_pdf_ask(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/ask",
                        json={"question": "What is chlorophyll?"})
        assert r.status_code == 200 and r.json().get("answer")

    def test_pdf_summary(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/summary")
        assert r.status_code == 200 and isinstance(r.json()["summary"], list)

    def test_pdf_notes(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/notes")
        assert r.status_code == 200 and "key_points" in r.json()

    def test_pdf_mcqs(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/mcqs")
        assert r.status_code == 200 and len(r.json()["mcqs"]) >= 1

    def test_pdf_flashcards(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/flashcards")
        assert r.status_code == 200 and len(r.json()["flashcards"]) >= 1

    def test_pdf_exam_questions(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/exam-questions")
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) >= {"two_mark", "five_mark", "ten_mark"}

    def test_pdf_viva(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/viva")
        assert r.status_code == 200 and len(r.json()["viva"]) >= 1

    def test_pdf_search(self, client):
        r = client.post(f"{BASE}/pdfs/search",
                        json={"question": "chlorophyll"})
        assert r.status_code == 200 and isinstance(r.json()["results"], list)

    def test_pdf_teach_ask(self, client, owned_pdf_id):
        r = client.post(f"{BASE}/pdfs/{owned_pdf_id}/teach/ask",
                        json={"question": "Explain photosynthesis"})
        assert r.status_code == 200 and r.json().get("answer")


# ---------------- Ask AI clarification ----------------
class TestAskAIClarification:
    def test_clarification_persisted(self, client):
        tag = uuid.uuid4().hex[:6]
        q1 = f"What is glucose {tag}?"
        r1 = client.post(f"{BASE}/ai/ask", json={"question": q1})
        assert r1.status_code == 200
        prev = r1.json().get("answer")
        r2 = client.post(f"{BASE}/ai/ask", json={
            "question": "I don't understand",
            "previous_answer": prev,
            "previous_question": q1,
        })
        # OpenAI may be unavailable -> 503 tolerated
        if r2.status_code == 503:
            pytest.skip("OpenAI unavailable")
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d.get("clarification") is True
        hist = client.get(f"{BASE}/ai/history").json()
        assert isinstance(hist, list) and len(hist) >= 2
        # newest first
        ts = [h.get("created_at") for h in hist if h.get("created_at")]
        assert ts == sorted(ts, reverse=True), "history not sorted desc"
        assert any(h.get("kind") == "clarification" for h in hist[:5])


# ---------------- Quiz with pdf_id + no-duplicate history ----------------
class TestQuizFromPDF:
    def test_generate_fresh_questions_second_call(self, client, owned_pdf_id):
        r1 = client.get(f"{BASE}/quiz/generate",
                        params={"pdf_id": owned_pdf_id, "difficulty": "easy", "count": 3})
        if r1.status_code == 400:
            pytest.skip(f"Quiz gen unavailable: {r1.text}")
        assert r1.status_code == 200, r1.text
        qs1 = {q["question"] for q in r1.json()["questions"]}
        r2 = client.get(f"{BASE}/quiz/generate",
                        params={"pdf_id": owned_pdf_id, "difficulty": "easy", "count": 3})
        if r2.status_code != 200:
            # 400 acceptable if PDF too small to yield 3 more distinct questions
            assert r2.status_code == 400
            return
        qs2 = {q["question"] for q in r2.json()["questions"]}
        assert qs1.isdisjoint(qs2), f"Duplicate questions across calls: {qs1 & qs2}"


# ---------------- Flashcards upsert / no duplicate bookmarks ----------------
class TestFlashcardsUpsert:
    def test_bookmark_status_no_duplicate(self, client):
        front = f"TEST_bm_{uuid.uuid4().hex[:6]}"
        for _ in range(2):
            r = client.post(f"{BASE}/flashcards/status",
                            json={"front": front, "back": "A", "topic": "photosynthesis",
                                  "status": "bookmark"})
            assert r.status_code == 200
        saved = client.get(f"{BASE}/flashcards/saved").json()
        matches = [c for c in saved if c["front"] == front]
        assert len(matches) == 1, f"Duplicate flashcards: {matches}"
        bms = client.get(f"{BASE}/bookmarks").json()
        matched_bm = [b for b in bms if b["title"] == front]
        assert len(matched_bm) == 1, f"Duplicate bookmarks from bookmark status: {matched_bm}"


# ---------------- Achievements no duplicates ----------------
class TestAchievementsUnique:
    def test_no_duplicate_achievements(self, client):
        for _ in range(3):
            client.post(f"{BASE}/ai/ask", json={"question": "What is respiration?"})
        r = client.get(f"{BASE}/achievements")
        assert r.status_code == 200
        titles = [a["title"] for a in r.json()]
        assert len(titles) == len(set(titles)), f"Duplicate achievements: {titles}"


# ---------------- PDF delete cascade ----------------
class TestPDFDeleteCascade:
    def test_delete_removes_chunks_and_blocks_quiz(self, client):
        up = client.post(f"{BASE}/pdfs/upload",
                         files={"file": ("TEST_cascade.pdf", _make_pdf(), "application/pdf")})
        assert up.status_code == 200
        pid = up.json()["id"]
        # confirm chunks exist via search / summary
        assert client.post(f"{BASE}/pdfs/{pid}/summary").status_code == 200
        assert client.delete(f"{BASE}/pdfs/{pid}").status_code == 200
        # /quiz/generate should now 404 (owned_pdf lookup)
        r = client.get(f"{BASE}/quiz/generate",
                       params={"pdf_id": pid, "difficulty": "easy", "count": 3})
        assert r.status_code == 404
        # verify chunks removed from SQLite
        conn = sqlite3.connect(DB_PATH)
        n = conn.execute(
            "SELECT COUNT(*) FROM pdf_chunks WHERE json_extract(doc, '$.pdf_id') = ?",
            (pid,)).fetchone()[0]
        conn.close()
        assert n == 0, f"Chunks not cascaded on PDF delete: {n} remaining"


