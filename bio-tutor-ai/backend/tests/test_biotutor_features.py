"""Feature regression for BioTutor upgrade:
- Auth (register/login/me/logout, unauth 401)
- PDF upload (multipart), listing, ownership
- Dynamic PDF-grounded quiz generation (types, difficulty validation, count validation, non-repeat via history)
- Quiz submit (returns wrong_questions with explanation)
- AI explain layer (OpenAI/Emergent) with domain restriction
- Off-topic ask -> in_domain False
"""
import io
import os
import uuid
import time
import pytest
import requests
from dotenv import dotenv_values

BASE = (os.environ.get("REACT_APP_BACKEND_URL")
        or dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL")).rstrip("/") + "/api"

STUDENT = {"email": "student@biotutor.com", "password": "Student@123"}
LLM_TIMEOUT = 90


def _fresh_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@biotutor.com"


def _make_pdf():
    import pymupdf
    doc = pymupdf.open()
    p1 = doc.new_page()
    p1.insert_textbox(pymupdf.Rect(50, 50, 550, 780),
        ("Photosynthesis is the process by which green plants use sunlight to make glucose "
         "from carbon dioxide and water. Chlorophyll in the chloroplasts absorbs light energy. "
         "The light-dependent reactions happen in the thylakoids and produce ATP and NADPH. "
         "The Calvin cycle then fixes carbon dioxide into glucose in the stroma. Oxygen is "
         "released as a by-product of splitting water molecules during the light reactions."),
        fontsize=12)
    p2 = doc.new_page()
    p2.insert_textbox(pymupdf.Rect(50, 50, 550, 780),
        ("The human digestive system breaks down food into nutrients. Digestion starts in the "
         "mouth where saliva contains amylase that begins to digest starch. The stomach churns "
         "food with hydrochloric acid and pepsin to digest proteins. The small intestine absorbs "
         "most nutrients through villi. The large intestine reabsorbs water and forms feces. "
         "The pancreas and liver secrete enzymes and bile to aid digestion."),
        fontsize=12)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture(scope="module")
def student():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json=STUDENT, timeout=30)
    if r.status_code != 200:
        s.post(f"{BASE}/auth/register", json={"name": "Student", **STUDENT}, timeout=30)
        r = s.post(f"{BASE}/auth/login", json=STUDENT, timeout=30)
    assert r.status_code == 200, r.text
    return s


# --------- Auth ---------
class TestAuth:
    def test_register_real_domain(self):
        s = requests.Session()
        r = s.post(f"{BASE}/auth/register",
                   json={"name": "T", "email": _fresh_email(), "password": "test123"}, timeout=30)
        assert r.status_code == 200, r.text
        assert s.get(f"{BASE}/auth/me").status_code == 200

    def test_test_tld_rejected(self):
        # email-validator rejects .test TLD
        r = requests.post(f"{BASE}/auth/register",
                          json={"name": "T", "email": f"x_{uuid.uuid4().hex[:6]}@example.test",
                                "password": "test123"}, timeout=30)
        assert r.status_code == 422, r.text

    def test_login_me_logout(self, student):
        r = student.get(f"{BASE}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == STUDENT["email"]
        # logout invalidates cookies
        s2 = requests.Session()
        s2.post(f"{BASE}/auth/login", json=STUDENT, timeout=30)
        assert s2.post(f"{BASE}/auth/logout").status_code == 200
        s2.cookies.clear()
        assert s2.get(f"{BASE}/auth/me").status_code == 401

    def test_pdfs_unauth_401(self):
        assert requests.get(f"{BASE}/pdfs").status_code == 401


# --------- PDF upload & ownership ---------
class TestPDFs:
    @pytest.fixture(scope="class")
    def uploaded(self, student):
        pdf = _make_pdf()
        r = student.post(f"{BASE}/pdfs/upload",
                         files={"file": ("TEST_bio.pdf", pdf, "application/pdf")}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and d["filename"] == "TEST_bio.pdf"
        assert d["num_pages"] == 2
        yield d["id"]
        student.delete(f"{BASE}/pdfs/{d['id']}")

    def test_list_contains_upload(self, student, uploaded):
        pdfs = student.get(f"{BASE}/pdfs").json()
        assert any(p["id"] == uploaded for p in pdfs)
        assert all("_id" not in p for p in pdfs)

    def test_other_user_denied(self, student, uploaded):
        other = requests.Session()
        other.post(f"{BASE}/auth/register",
                   json={"name": "O", "email": _fresh_email(), "password": "test123"}, timeout=30)
        r = other.get(f"{BASE}/pdfs/{uploaded}")
        assert r.status_code == 403
        # Quiz generation with someone else's pdf_id
        r2 = other.get(f"{BASE}/quiz/generate",
                       params={"pdf_id": uploaded, "difficulty": "easy", "count": 2}, timeout=LLM_TIMEOUT)
        assert r2.status_code == 403


# --------- Dynamic quiz ---------
class TestQuizGenerate:
    @pytest.fixture(scope="class")
    def pid(self, student):
        pdf = _make_pdf()
        r = student.post(f"{BASE}/pdfs/upload",
                         files={"file": ("TEST_quiz.pdf", pdf, "application/pdf")}, timeout=60)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        yield pid
        student.delete(f"{BASE}/pdfs/{pid}")

    def test_invalid_difficulty(self, student, pid):
        r = student.get(f"{BASE}/quiz/generate",
                        params={"pdf_id": pid, "difficulty": "impossible", "count": 3}, timeout=LLM_TIMEOUT)
        assert r.status_code == 400, r.text

    def test_count_bounds(self, student, pid):
        r0 = student.get(f"{BASE}/quiz/generate",
                         params={"pdf_id": pid, "difficulty": "easy", "count": 0}, timeout=30)
        assert r0.status_code == 400
        r25 = student.get(f"{BASE}/quiz/generate",
                          params={"pdf_id": pid, "difficulty": "easy", "count": 25}, timeout=30)
        assert r25.status_code == 400

    def test_legacy_no_pdf(self, student):
        r = student.get(f"{BASE}/quiz/generate", params={"count": 3}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("legacy") is True
        assert isinstance(d["questions"], list) and len(d["questions"]) == 3

    def test_pdf_grounded_and_no_repeat(self, student, pid):
        r1 = student.get(f"{BASE}/quiz/generate",
                         params={"pdf_id": pid, "difficulty": "easy", "count": 3}, timeout=LLM_TIMEOUT)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["pdf_id"] == pid and d1["difficulty"] == "easy"
        qs1 = d1["questions"]
        assert 1 <= len(qs1) <= 3
        allowed = {"mcq", "true_false", "fill_blank", "concept", "application"}
        for q in qs1:
            assert q.get("question")
            assert q.get("correct_answer")
            assert q.get("explanation")
            assert q.get("topic")
            assert isinstance(q.get("concepts"), list)
            assert q.get("type") in allowed
        # Second generation avoids repeats
        r2 = student.get(f"{BASE}/quiz/generate",
                         params={"pdf_id": pid, "difficulty": "easy", "count": 3}, timeout=LLM_TIMEOUT)
        assert r2.status_code == 200
        qs2 = r2.json()["questions"]
        set1 = {q["question"].strip().lower() for q in qs1}
        set2 = {q["question"].strip().lower() for q in qs2}
        assert not (set1 & set2), f"Repeats not filtered: {set1 & set2}"


# --------- Quiz submit ---------
class TestQuizSubmit:
    def test_submit_returns_wrong_with_explanation(self, student):
        answers = [
            {"question": "Q1", "selected": "wrong", "correct_answer": "ATP",
             "correct": False, "concepts": ["ATP"], "explanation": "ATP is energy currency."},
            {"question": "Q2", "selected": "villi", "correct_answer": "villi",
             "correct": True, "concepts": ["villi"], "explanation": "Correct."},
        ]
        r = student.post(f"{BASE}/quiz/submit",
                         json={"topic": "photosynthesis", "pdf_id": None, "answers": answers}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 2 and d["correct"] == 1 and d["incorrect"] == 1
        assert d["percentage"] == 50.0
        assert d["weak_concepts"] == ["ATP"]
        assert len(d["wrong_questions"]) == 1
        wq = d["wrong_questions"][0]
        assert wq["question"] == "Q1" and wq["correct_answer"] == "ATP"
        assert wq["explanation"] == "ATP is energy currency."
        assert d["recommendation"]


# --------- AI explain layer & domain ---------
class TestAIExplain:
    def test_ask_in_domain(self, student):
        r = student.post(f"{BASE}/ai/ask", json={"question": "What is photosynthesis?"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["in_domain"] is True

    def test_ask_off_topic(self, student):
        r = student.post(f"{BASE}/ai/ask", json={"question": "Who won the football world cup?"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["in_domain"] is False

    def test_explain_layer(self, student):
        r = student.post(f"{BASE}/ai/ask", json={"question": "What is photosynthesis?"}, timeout=30)
        prev = r.json()["answer"]
        e = student.post(f"{BASE}/ai/explain",
                         json={"question": "What is photosynthesis?", "previous_answer": prev,
                               "pdf_context": "",
                               "request": "I do not understand, explain more simply"}, timeout=LLM_TIMEOUT)
        assert e.status_code == 200, e.text
        d = e.json()
        assert d.get("in_domain") is True
        assert d.get("source")
        assert isinstance(d.get("answer"), str) and len(d["answer"]) > 20

    def test_history_includes_both(self, student):
        h = student.get(f"{BASE}/ai/history").json()
        assert isinstance(h, list) and len(h) >= 2
        assert any(item.get("kind") == "clarification" for item in h)
