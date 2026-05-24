# TraceRank — Adversarial Résumé Scanner

Analyzes résumés against automated hiring systems and shows where machine screening will fail or underrate the candidate.

## What it detects
- ATS structural parsing failures (multi-column, text boxes, tables)
- Parser confusion from formatting
- Role-specific keyword gaps
- Weak phrasing (passive verbs, vague bullets)
- Missing quantified impact
- LLM screener risk factors

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
