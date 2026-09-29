"""Backend tests for the AI Biology Study Assistant.
Run from /app/backend:  pytest tests/ -v
These tests hit the running API (BASE from REACT_APP_BACKEND_URL or localhost).
"""
import os
import uuid
import requests

BASE = os.environ.get("TEST_API", "http://localhost:8001") + "/api"


def _session():
    s = requests.Session()
    email = f"pytest_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{BASE}/auth/register", json={"name": "Pytest", "email": email, "password": "test123"})
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


def test_register_and_me():
    s = _session()
    r = s.get(f"{BASE}/auth/me")
    assert r.status_code == 200
    assert "email" in r.json()


def test_login_wrong_password():
    s = requests.Session()
    email = f"pytest_{uuid.uuid4().hex[:8]}@test.com"
    s.post(f"{BASE}/auth/register", json={"name": "X", "email": email, "password": "test123"})
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_supported_biology_question():
    s = _session()
    r = s.post(f"{BASE}/ai/ask", json={"question": "What is chlorophyll?"})
    assert r.status_code == 200
    d = r.json()
    assert d["in_domain"] is True
    assert d["confidence"] > 0.3
    assert d["topic"]


def test_topic_classification():
    s = _session()
    r = s.post(f"{BASE}/ai/ask", json={"question": "What is the role of the alveoli?"})
    assert "Respiratory" in (r.json().get("topic") or "")


UNSUPPORTED = [
    "What is Machine Learning?",
    "Write Python code.",
    "What is the capital of France?",
    "Explain blockchain.",
    "Tell me a joke.",
]


def test_unsupported_questions_rejected():
    s = _session()
    for q in UNSUPPORTED:
        d = s.post(f"{BASE}/ai/ask", json={"question": q}).json()
        assert d["answer"] == "I am trained only on Photosynthesis, Digestive System, and Respiratory System.", q


def test_practice_evaluation():
    s = _session()
    r = s.post(f"{BASE}/practice/evaluate", json={
        "question": "What is photosynthesis?",
        "student_answer": "Plants use sunlight, carbon dioxide and water to make glucose and oxygen.",
        "model_answer": "Photosynthesis converts light energy into glucose using CO2 and water, releasing oxygen.",
        "concepts": ["glucose", "oxygen", "carbon dioxide"],
    })
    assert r.status_code == 200
    assert r.json()["percentage"] >= 0


def test_quiz_generate_and_submit():
    s = _session()
    q = s.get(f"{BASE}/quiz/generate", params={"topic": "photosynthesis", "count": 3}).json()
    assert len(q["questions"]) == 3
    answers = [{"correct": True, "concepts": x["concepts"]} for x in q["questions"]]
    r = s.post(f"{BASE}/quiz/submit", json={"topic": "photosynthesis", "answers": answers})
    assert r.json()["percentage"] == 100.0


def test_pdf_ownership_protection():
    s = _session()
    r = s.get(f"{BASE}/pdfs/64b2f0000000000000000000")
    assert r.status_code in (403, 404)


def test_progress_endpoint():
    s = _session()
    r = s.get(f"{BASE}/progress")
    assert r.status_code == 200
    assert "topic_scores" in r.json()


def test_model_evaluation():
    r = requests.get(f"{BASE}/model/evaluation")
    assert r.status_code == 200
    assert "topic_classification" in r.json()
