"""Focused tests for iteration 3: /api/ai/ask new behavior
- pdf_id + question answerable from PDF -> Your notes · page N
- pdf_id + Biology question not in PDF -> falls back to dataset, source contains 'not found in your notes'
- Off-topic -> in_domain False
- pdf_id owned by another user -> 403/404
- Natural clarification: 'I don't understand' + previous_question + previous_answer -> local clarification
- 'I don't understand' without previous_answer -> no crash (200)
- /ai/history contains kind 'clarification'
"""
import io
import os
import uuid
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
         "The Calvin cycle happens in the stroma of the chloroplast where carbon dioxide is fixed into glucose. "
         "Oxygen is released as a by-product of splitting water molecules during the light reactions."),
        fontsize=12)
    p2 = doc.new_page()
    p2.insert_textbox(pymupdf.Rect(50, 50, 550, 780),
        ("The human digestive system breaks down food into nutrients. Digestion starts in the "
         "mouth where saliva contains amylase. The stomach uses hydrochloric acid and pepsin. "
         "The small intestine absorbs nutrients through villi."),
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


@pytest.fixture(scope="module")
def pid(student):
    r = student.post(f"{BASE}/pdfs/upload",
                     files={"file": ("TEST_ask.pdf", _make_pdf(), "application/pdf")}, timeout=60)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    student.delete(f"{BASE}/pdfs/{pid}")


class TestAskWithPDF:
    def test_answer_from_pdf(self, student, pid):
        r = student.post(f"{BASE}/ai/ask",
                         json={"question": "where does the calvin cycle happen?", "pdf_id": pid},
                         timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("in_domain") is True
        assert isinstance(d.get("source"), str)
        assert d["source"].startswith("Your notes · page"), f"source={d.get('source')}"
        # answer text should mention stroma / chloroplast from PDF chunk
        assert "stroma" in d["answer"].lower() or "chloroplast" in d["answer"].lower()

    def test_biology_not_in_pdf_fallback(self, student, pid):
        r = student.post(f"{BASE}/ai/ask",
                         json={"question": "What is the function of alveoli?", "pdf_id": pid},
                         timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Should fall back to dataset; in_domain may be True (bio dataset) with source marker
        assert d.get("in_domain") is True
        assert "not found in your notes" in (d.get("source") or "").lower(), f"source={d.get('source')}"

    def test_off_topic(self, student):
        r = student.post(f"{BASE}/ai/ask",
                         json={"question": "Who won the FIFA world cup 2022?"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["in_domain"] is False

    def test_other_users_pdf_denied(self, student, pid):
        other = requests.Session()
        other.post(f"{BASE}/auth/register",
                   json={"name": "O", "email": _fresh_email(), "password": "test123"}, timeout=30)
        r = other.post(f"{BASE}/ai/ask",
                       json={"question": "What is photosynthesis?", "pdf_id": pid}, timeout=30)
        assert r.status_code in (403, 404), r.text


class TestClarification:
    def test_clarification_with_previous(self, student, pid):
        # First get a normal PDF-grounded answer
        r1 = student.post(f"{BASE}/ai/ask",
                          json={"question": "What is photosynthesis?", "pdf_id": pid}, timeout=30)
        assert r1.status_code == 200
        prev_q = "What is photosynthesis?"
        prev_a = r1.json()["answer"]

        # Now ask clarification naturally
        r2 = student.post(f"{BASE}/ai/ask",
                          json={"question": "I don't understand",
                                "pdf_id": pid,
                                "previous_question": prev_q,
                                "previous_answer": prev_a}, timeout=LLM_TIMEOUT)
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d.get("clarification") is True
        assert d.get("in_domain") is True
        assert d.get("source") == "Your existing answer"
        assert isinstance(d.get("answer"), str) and len(d["answer"]) > 20

    def test_explain_more_simply_phrase(self, student, pid):
        r1 = student.post(f"{BASE}/ai/ask",
                          json={"question": "What is photosynthesis?", "pdf_id": pid}, timeout=30)
        prev_a = r1.json()["answer"]
        r2 = student.post(f"{BASE}/ai/ask",
                          json={"question": "explain more simply",
                                "previous_question": "What is photosynthesis?",
                                "previous_answer": prev_a}, timeout=LLM_TIMEOUT)
        assert r2.status_code == 200
        assert r2.json().get("clarification") is True

    def test_give_example_phrase(self, student, pid):
        r1 = student.post(f"{BASE}/ai/ask",
                          json={"question": "What is photosynthesis?", "pdf_id": pid}, timeout=30)
        prev_a = r1.json()["answer"]
        r2 = student.post(f"{BASE}/ai/ask",
                          json={"question": "can you give an example",
                                "previous_question": "What is photosynthesis?",
                                "previous_answer": prev_a}, timeout=LLM_TIMEOUT)
        assert r2.status_code == 200
        assert r2.json().get("clarification") is True
        assert r2.json().get("example") is True

    def test_dont_understand_without_previous(self, student):
        # No previous_answer -> treated as normal question; must not crash
        r = student.post(f"{BASE}/ai/ask",
                         json={"question": "I don't understand"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Should NOT be a clarification response
        assert not d.get("clarification")

    def test_history_has_clarification(self, student):
        h = student.get(f"{BASE}/ai/history").json()
        assert isinstance(h, list)
        assert any(item.get("kind") == "clarification" for item in h)
