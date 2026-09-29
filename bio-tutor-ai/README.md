# BioTutor AI — Biology Study Assistant (Custom NLP + optional OpenAI examples)

A full-stack, **domain-restricted Biology study assistant**. The primary knowledge source is a
local semantic NLP model (`sentence-transformers/all-MiniLM-L6-v2`) trained on a curated Biology
dataset (Photosynthesis, Human Digestive System, Human Respiratory System) plus the student's own
uploaded notes. **OpenAI is used only when a student clicks a Give Example button** in Ask AI or
Teach Me. The example is grounded in the existing answer or selected lesson. If no API key is
configured, the app returns a local notes-based example instead. Other clarifications and quizzes
use local logic and uploaded-note content; they do not call OpenAI.

**Database: SQLite** — a single local file `backend/database.sqlite` is created automatically on
first start. **No MongoDB (or any database server) needs to be installed or running.**

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Backend   | Python 3.10+, FastAPI, Uvicorn, **SQLite (built-in `sqlite3`)**, PyTorch (CPU), Sentence-Transformers, scikit-learn, PyMuPDF, pdfplumber, PyJWT, bcrypt, OpenAI SDK |
| Frontend  | React 19 (Create React App + CRACO), React Router, Axios, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, React Flow, lucide-react |
| Database  | SQLite file (`backend/database.sqlite`) |

---

## Project Structure

```
bio-tutor-ai/
├── README.md
├── .gitignore
├── backend/
│   ├── server.py                 # FastAPI app + all /api routes
│   ├── database.py               # SQLite document store (collections -> tables, JSON docs)
│   ├── auth.py                   # JWT (access + refresh cookies) + bcrypt
│   ├── nlp_engine.py             # Restricted semantic NLP engine (primary knowledge source)
│   ├── pdf_service.py            # PDF extraction, chunking, topic detection, lesson plan
│   ├── diagram_service.py        # OCR-based diagram reading (optional Tesseract)
│   ├── services/
│   │   ├── openai_service.py     # Optional OpenAI generation for example buttons only
│   │   └── quiz_service.py       # Quiz history fingerprints + PDF-only fallback
│   ├── dataset/                  # Curated Biology dataset (JSON)
│   ├── Training/                 # Training / embeddings / evaluation scripts
│   ├── Model/                    # Cached embeddings + evaluation_results.json
│   ├── tests/                    # pytest API tests
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/                      # pages/, components/, context/, hooks/, lib/api.js
    ├── package.json
    ├── craco.config.js
    ├── tailwind.config.js
    └── .env.example
```

### How the SQLite database works
`backend/database.py` stores every collection (`users`, `uploaded_pdfs`, `pdf_chunks`,
`chat_history`, `quiz_results`, `quiz_question_history`, `bookmarks`, `flashcards`,
`achievements`, `study_sessions`, `login_attempts`, `password_reset_tokens`) as a table with an
`_id` primary key and a JSON `doc` column. It exposes the same operations the app already used
(`find`, `find_one`, `insert_one`, `insert_many`, `update_one` with upsert, `delete_one`,
`delete_many`, `count_documents`), so all routes, data shapes and features are unchanged.
The file path can be changed with `SQLITE_DB_PATH` in `backend/.env` (default `database.sqlite`
inside `backend/`). Delete the file to reset all data.

---

## Prerequisites

- **Python 3.10 or newer** (3.11 recommended)
- **Node.js 18+** and **Yarn** (`npm install -g yarn`) — npm also works
- **OpenAI API key (optional)** — https://platform.openai.com/api-keys. Used only for richer
  examples from the Ask AI and Teach Me example buttons; example buttons have a local fallback.
- *(Optional)* **Tesseract OCR** for the Diagram Reading page
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr` · macOS: `brew install tesseract`
  - Windows: https://github.com/UB-Mannheim/tesseract/wiki (add to PATH)

> No MongoDB. No database server. SQLite ships with Python.

---

## Setup (VS Code) — step by step

### 1. Extract and open

Extract the ZIP, then in VS Code: **File → Open Folder → `bio-tutor-ai`**.
Open two terminals (Terminal → New Terminal) — one for the backend, one for the frontend.

### 2. Backend

```bash
cd backend

# create + activate a virtual environment
python -m venv venv
# Windows (PowerShell):   venv\Scripts\Activate.ps1
# Windows (cmd):          venv\Scripts\activate.bat
# macOS / Linux:          source venv/bin/activate

# install dependencies (CPU-only PyTorch keeps the install small)
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# create your environment file
# Windows:  copy .env.example .env
# macOS/Linux:
cp .env.example .env
```

Open `backend/.env` and set:

```
SQLITE_DB_PATH=database.sqlite
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=<any long random string>
JWT_REFRESH_SECRET=<another long random string>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=20
OPENAI_API_KEY=sk-...your key...
OPENAI_MODEL=gpt-4o-mini
```

Generate secrets with: `python -c "import secrets; print(secrets.token_hex(32))"`

> The first backend start downloads the `all-MiniLM-L6-v2` model (~90 MB) from Hugging Face and
> can take 30–60 seconds. Later starts are fast. `database.sqlite` is created automatically.

### 3. Frontend

```bash
cd frontend
yarn install          # or: npm install

# Windows:  copy .env.example .env
# macOS/Linux:
cp .env.example .env
```

`frontend/.env` must contain:

```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## Running the app

**Terminal 1 — backend** (inside `backend/`, venv active):

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Wait for `NLP engine loaded` and `Application startup complete`.
Health check: http://localhost:8001/api/  →  `{"message":"AI Biology Study Assistant API","status":"running"}`

**Terminal 2 — frontend** (inside `frontend/`):

```bash
yarn start            # or: npm start
```

Open **http://localhost:3000**, click **Sign up**, create a student account and log in.

---

## Using the app

### Ask AI (PDF-first) and example buttons
1. **PDF Study** → upload your Biology notes PDF.
2. **Ask AI** → your PDF is auto-selected. Ask any natural question. The answer comes from your
   PDF first ("Your notes · page N"); if the PDF has no match, the restricted local Biology dataset
   answers. Off-topic questions are refused.
3. Use **Explain more simply**, **I don't understand**, or **Explain step-by-step** for local
  clarification. Click **Give an example** to generate an example from your answer/notes (OpenAI
  is used only for this button when an API key is configured).

### Document-grounded quiz
**Quiz** → choose an uploaded study document, difficulty and count → **Generate questions from document**.
Questions are built locally from extracted sentences and key terms (multiple choice and fill in the blank)
and never use unrelated dataset facts. Submit to see per-question review; previously asked questions are
remembered for that document and not repeated. Quiz generation does not call OpenAI.

---

## Key API endpoints (all under `/api`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh` | JWT cookie auth |
| GET  | `/auth/me` | Current user |
| POST | `/ai/ask` | PDF-first NLP answer; local clarification, with OpenAI used only for the example action |
| POST | `/ai/explain` | Legacy local clarification endpoint |
| POST | `/pdfs/upload` | Upload PDF (multipart `file`) |
| GET  | `/pdfs`, `/pdfs/{id}`, `/pdfs/{id}/page/{n}` | PDF listing / reading |
| GET  | `/quiz/generate?pdf_id=&difficulty=&count=` | Dynamic PDF quiz |
| POST | `/quiz/submit` | Score quiz, return wrong answers + explanations |
| GET  | `/progress`, `/dashboard`, `/achievements` | Analytics |

---

## Running tests

```bash
cd backend
pytest tests/ -q
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: torch` | Run the `pip install torch --index-url https://download.pytorch.org/whl/cpu` step |
| Backend hangs on first start | It is downloading the MiniLM model; wait ~1 min (needs internet once) |
| `database is locked` | Close other programs (e.g. DB browsers) that have `database.sqlite` open |
| Want a fresh database | Stop the backend and delete `backend/database.sqlite*` |
| OpenAI example unavailable | Check `OPENAI_API_KEY` in `backend/.env`; without a key the app uses a local notes-based example |
| Login works but pages show 401 | Frontend must be on `http://localhost:3000` and `CORS_ORIGINS` must include it (cookies) |
| Diagram Reading fails | Install Tesseract OCR and make sure it is on your PATH |
| `yarn start` port conflict | `PORT=3001 yarn start` and add `http://localhost:3001` to `CORS_ORIGINS` |
| Console warning `[emergent-overlay] not loaded` | Harmless — optional dev-only plugin not included in this package |

---

## Security notes

- Passwords are bcrypt-hashed; access/refresh JWTs are httpOnly cookies.
- All PDF, quiz and chat data is scoped to the logged-in user (`user_id`).
- Never commit `backend/.env`, `frontend/.env` or `backend/database.sqlite` (already in `.gitignore`).
