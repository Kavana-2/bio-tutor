"""Restart-persistence test — kept separate because it restarts the backend and
would disrupt sibling xdist workers running against the same preview URL.

Run after the main suite:
    pytest tests/test_persistence.py -v
"""
import os
import re
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


def _make_pdf():
    import pymupdf
    doc = pymupdf.open()
    text = (
        "Photosynthesis converts light energy into chemical energy stored in glucose.\n"
        "Chlorophyll in chloroplasts captures light in the thylakoid membranes.\n"
        "Water is split releasing oxygen and carbon dioxide is fixed in the Calvin cycle.\n"
    )
    page = doc.new_page()
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 700), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def test_persistence_across_backend_restart():
    email, pwd = f"TEST_{uuid.uuid4().hex[:10]}@test.com", "test123"
    s = requests.Session()
    r = s.post(f"{BASE}/auth/register",
               json={"name": "TEST Persist", "email": email, "password": pwd})
    assert r.status_code == 200, r.text
    up = s.post(f"{BASE}/pdfs/upload",
                files={"file": ("TEST_persist.pdf", _make_pdf(), "application/pdf")})
    assert up.status_code == 200, up.text
    pid = up.json()["id"]

    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True)
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            if requests.get(f"{BASE}/", timeout=3).status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)
    else:
        pytest.fail("Backend did not come back up after restart")

    s2 = requests.Session()
    r2 = s2.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
    assert r2.status_code == 200, r2.text
    pdfs = s2.get(f"{BASE}/pdfs").json()
    assert any(p["id"] == pid for p in pdfs), "PDF lost after restart"
    s2.delete(f"{BASE}/pdfs/{pid}")
