# TraceRank — Adversarial Résumé Scanner

Analyzes résumés against automated hiring systems and shows where machine screening will fail or underrate the candidate.

## What it detects
- ATS structural parsing failures (multi-column, text boxes, tables)
- Parser confusion from formatting
- Role-specific keyword gaps
- Weak phrasing (passive verbs, vague bullets)
- Missing quantified impact
- LLM screener risk factors

## Folder structure

```
backend/
  schema.sql                   # Postgres schema (run once to init)
  app/
    main.py                    # FastAPI app, CORS, lifespan pool init
    schemas.py                 # Pydantic models
    db.py                      # asyncpg pool (None when DATABASE_URL unset)
    routes/scan.py             # POST /api/scan, GET /api/scans, GET /api/scans/{id}
    services/
      extract_resume.py        # PDF/DOCX text extraction, ATS preview
      parse_sections.py        # Section header heuristics
      jd_requirements.py       # JD keyword + years-of-experience extraction
      scoring.py               # 5-dimension explainable scorer
      rewrite_suggestions.py   # Deterministic issue ranker
      persistence.py           # save_scan / get_recent_scans / get_scan_by_id
  tests/test_services.py       # Unit tests (no DB, no file I/O)

frontend/
  app/
    page.tsx                   # Landing page
    workspace/page.tsx         # Scan workspace (3-pane)
    layout.tsx / globals.css
```

## Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, pdfplumber, python-docx, scikit-learn

## Run locally

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

### Database (optional)

Without `DATABASE_URL` the scanner runs stateless — scans are not saved and history is not shown.

To enable persistence:
```bash
# 1. Create a Postgres database
createdb tracerank

# 2. Apply the schema
psql tracerank < backend/schema.sql

# 3. Set the env var before starting the backend
export DATABASE_URL=postgresql://localhost/tracerank
```

### Local LLM (optional)

Enables the "Generate AI rewrites" button in the findings pane. Works with any OpenAI-compatible local server.

**With Ollama (recommended):**
```bash
# Install: https://ollama.com
ollama pull llama3
ollama serve   # starts on http://localhost:11434
```

**With llama.cpp:**
```bash
./server -m your-model.gguf --port 8080
# LLM_ENDPOINT=http://localhost:8080
```

Then set env vars before starting the backend:
```bash
export LLM_ENDPOINT=http://localhost:11434
export LLM_MODEL=llama3
```

Without `LLM_ENDPOINT` the button is not rendered. The deterministic analysis pipeline always runs regardless.

### Tests
```bash
cd backend && python3 -m pytest tests/ -v
```

## MVP flow
1. Upload PDF or DOCX résumé
2. Paste job description
3. Click "Run Scan"
4. Review Parse Integrity, JD Match, Keyword gaps, Weak phrasing, and fix suggestions

## Design
Off-white paper surface, graphite text, one deep accent (#0f5c52). No gradient blobs. No glassmorphism.

## Deploying to Production

Stack: **Vercel** (frontend) + **Railway** (backend + Postgres)

### Step-by-step

**1. Push to GitHub** (if not already)
```bash
git push origin main
```

**2. Deploy backend on Railway**
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repo → set **Root Directory** to `backend/`
3. Railway reads `backend/railway.toml` automatically — no manual start command needed
4. Add a **PostgreSQL** database plugin to the same project (Railway injects `DATABASE_URL` automatically)
5. Set these environment variables in Railway:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ATS_SIMULATION_ENABLED=true
   ```
   Optional (AI rewrites):
   ```
   LLM_ENDPOINT=https://api.groq.com/openai
   LLM_MODEL=llama3-8b-8192
   LLM_API_KEY=gsk_your_key_here
   ```
6. Copy your Railway backend URL: `https://your-backend.up.railway.app`

**3. Run the database schema**

Railway shell (one-time):
```bash
psql $DATABASE_URL -f schema.sql
```
Or via Railway CLI:
```bash
railway run psql $DATABASE_URL -f schema.sql
```

**4. Deploy frontend on Vercel**
1. Go to [vercel.com](https://vercel.com) → New Project → import this repo
2. Set **Root Directory** to `frontend/`
3. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
   ```
4. Deploy. Copy your Vercel URL.

**5. Update CORS on Railway**

Go back to Railway → update `ALLOWED_ORIGINS` to your actual Vercel URL → redeploy.

**6. Verify**
- `GET https://your-backend.up.railway.app/health` → `{"status":"ok","db":"connected"}`
- Upload a PDF résumé on the frontend → scan completes

### Environment variables reference

| Variable | Service | Required | Example |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Vercel | Yes | `https://your-backend.up.railway.app` |
| `DATABASE_URL` | Railway | Auto-set by Postgres plugin | `postgresql://...` |
| `ALLOWED_ORIGINS` | Railway | Yes | `https://your-app.vercel.app` |
| `ATS_SIMULATION_ENABLED` | Railway | No | `true` |
| `ANALYTICS_ENABLED` | Railway | No | `false` |
| `LLM_ENDPOINT` | Railway | No | `https://api.groq.com/openai` |
| `LLM_MODEL` | Railway | No | `llama3-8b-8192` |
| `LLM_API_KEY` | Railway | No | `gsk_...` |

### What works without optional services

| Feature | No DB | No LLM |
|---------|-------|--------|
| Upload + scan | ✓ | ✓ |
| Scored report | ✓ | ✓ |
| Export HTML | ✓ | ✓ |
| ATS simulation | ✓ | ✓ |
| Scan history | ✗ | ✓ |
| Compare scans (in-session) | ✓ | ✓ |
| AI rewrite suggestions | ✓ | ✗ |

### Local LLM (optional)

Works with Ollama or any OpenAI-compatible server. Never deploy Ollama to Railway — it's a local-only dependency.

```bash
ollama pull llama3
ollama serve   # http://localhost:11434
export LLM_ENDPOINT=http://localhost:11434
export LLM_MODEL=llama3
```

---

## Current limitations
- Keyword matching is lexical — multi-word phrases ("machine learning") match only if they appear verbatim in the JD token set
- Section parser uses exact header matching; headers embedded mid-paragraph or in all-caps are not detected
- Scan history requires `DATABASE_URL`; without it the app runs stateless
- No auth, billing, or multi-user support
- No LLM rewrite suggestions — all analysis is deterministic heuristics
- Backend API URL is hardcoded to `localhost:8000` in the frontend fetch call
