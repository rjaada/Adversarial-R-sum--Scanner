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
  app/
    main.py                    # FastAPI app, CORS
    schemas.py                 # Pydantic models
    routes/scan.py             # POST /api/scan
    services/
      extract_resume.py        # PDF/DOCX text extraction, ATS preview
      parse_sections.py        # Section header heuristics
      jd_requirements.py       # JD keyword + years-of-experience extraction
      scoring.py               # 5-dimension explainable scorer
      rewrite_suggestions.py   # Deterministic issue ranker
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

## Current limitations
- Keyword matching is lexical — multi-word phrases ("machine learning") match only if they appear verbatim in the JD token set
- Section parser uses exact header matching; headers embedded mid-paragraph or in all-caps are not detected
- No Postgres persistence yet — scan history is not saved between sessions
- No auth, billing, or multi-user support
- No LLM rewrite suggestions — all analysis is deterministic heuristics
- Backend API URL is hardcoded to `localhost:8000` in the frontend fetch call
