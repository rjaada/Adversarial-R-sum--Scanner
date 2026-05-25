# TraceRank — Deployment Guide (Free Tier)

Target stack: **Vercel Hobby** (frontend) + **Render free** (backend) + optional Neon + optional Groq.

Estimated cost: **$0**.

---

## Fastest friend-test (scan + export only, ~10 min)

Skip DB and AI entirely. You get: upload résumé → scan → scored report → export HTML.

### 1. Deploy backend to Render

1. Go to [render.com](https://render.com) → New → Web Service → connect your repo
2. Settings:
   - **Root directory:** `backend`
   - **Runtime:** Python
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free
3. Add environment variable:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
   (Set this after you know your Vercel URL. You can deploy Render first with a placeholder, then update.)
4. Deploy. Note your Render URL: `https://your-service.onrender.com`

> **Cold start warning:** Free tier sleeps after 15 min inactivity. First request takes ~30–60s.
> Tell your friend to expect a slow first load.

### 2. Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import repo
2. Settings:
   - **Root directory:** `frontend`
   - **Framework preset:** Next.js (auto-detected)
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-service.onrender.com
   ```
4. Deploy.
5. Copy your Vercel URL and go back to Render → update `ALLOWED_ORIGINS` to match.

---

## Add scan history + compare (optional — Neon free tier)

1. Go to [neon.tech](https://neon.tech) → create project → copy connection string
2. Add to Render environment variables:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   ```
3. Run the DB schema (from repo root):
   ```bash
   psql $DATABASE_URL -f backend/schema.sql
   ```
   (If no `schema.sql` exists yet, the app will log an error on first scan but won't crash.)
4. Redeploy Render service.

---

## Add AI rewrites (optional — Groq free tier)

1. Go to [console.groq.com](https://console.groq.com) → API Keys → create key
2. Add to Render environment variables:
   ```
   LLM_ENDPOINT=https://api.groq.com/openai
   LLM_MODEL=llama3-8b-8192
   LLM_API_KEY=gsk_your_key_here
   ```
3. Redeploy Render service.

Groq free tier: 30 req/min, sufficient for friend testing.

> **Local Ollama:** set `LLM_ENDPOINT=http://localhost:11434` and leave `LLM_API_KEY` blank.

---

## All environment variables

### Render (backend)

| Variable | Required | Example |
|----------|----------|---------|
| `ALLOWED_ORIGINS` | Yes | `https://your-app.vercel.app` |
| `DATABASE_URL` | No | `postgresql://...neon.tech/db?sslmode=require` |
| `LLM_ENDPOINT` | No | `https://api.groq.com/openai` |
| `LLM_MODEL` | No | `llama3-8b-8192` |
| `LLM_API_KEY` | No | `gsk_...` |
| `LLM_TIMEOUT` | No | `30` |
| `ATS_SIMULATION_ENABLED` | No | `false` |
| `ANALYTICS_ENABLED` | No | `false` |

### Vercel (frontend)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://your-service.onrender.com` |

---

## What works without optional services

| Feature | No DB | No AI |
|---------|-------|-------|
| Upload + scan | ✓ | ✓ |
| Scored report | ✓ | ✓ |
| Export HTML | ✓ | ✓ |
| ATS simulation | ✓ | ✓ |
| Fix rankings | ✓ | ✓ |
| Scan history | ✗ | ✓ |
| Compare scans (from history) | ✗ | ✓ |
| Compare scans (in-session) | ✓ | ✓ |
| AI rewrite suggestions | ✓ | ✗ |

---

## Local development

No changes needed. Defaults still work:

```bash
# backend
cd backend
cp .env.example .env   # edit as needed
uvicorn app.main:app --reload --port 8001

# frontend
cd frontend
npm run dev   # http://localhost:3000
```
