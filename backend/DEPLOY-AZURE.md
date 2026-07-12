# Deploying the TraceRank backend to Azure Container Apps

Container Apps scales to **zero** when idle, so the API costs ~nothing between
scans. The frontend already shows a "server may be waking up" message, which
covers the cold-start after idle.

The image is validated locally (builds in ~80s, 247 MB, `/health` → 200,
`POST /api/scan` → 200 with a full result, DB degrades gracefully when unset).

---

## 0. One-time prerequisites (you do these — they need your login/billing)

```bash
# Azure CLI (if not installed): https://learn.microsoft.com/cli/azure/install-azure-cli
az login                                   # opens a browser / device code
az account show                            # confirm the Azure-for-Students subscription is active

az extension add --name containerapp --upgrade
az provider register -n Microsoft.App
az provider register -n Microsoft.OperationalInsights
```

---

## 1. Database — Neon (recommended) or Azure Postgres

The backend needs a Postgres `DATABASE_URL` (asyncpg). It **self-heals its
schema** on first connect, so there is no migration step.

**Recommended: Neon** (https://neon.tech) — serverless Postgres, free tier,
scales to zero like Container Apps. Create a project, copy the connection
string, and make sure it looks like:

```
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

- asyncpg needs `sslmode=require` (Neon rejects non-SSL).
- If asyncpg errors on `channel_binding`, **remove** that query param.
- Prefer the **direct** (non-pooler) connection string for a long-lived pool.

*(Alternative: Azure Database for PostgreSQL Flexible Server — always-on, so it
burns credit even while the app is scaled to zero. Only pick this if you want
everything inside Azure.)*

---

## 2. Deploy from source (builds the image in the cloud — no local Docker needed)

```bash
RG=tracerank-rg
LOCATION=eastus
ENV=tracerank-env
APP=tracerank-api

az group create -n $RG -l $LOCATION

# Builds the Dockerfile via ACR Tasks, creates the environment + app, and
# wires external ingress to port 8000.
az containerapp up \
  --name $APP \
  --resource-group $RG \
  --location $LOCATION \
  --environment $ENV \
  --source . \
  --ingress external \
  --target-port 8000
```

`az containerapp up` prints the app FQDN, e.g.
`https://tracerank-api.<hash>.<region>.azurecontainerapps.io`. Save it.

---

## 3. Scale-to-zero + secrets + env

```bash
# Scale to zero when idle (this is the cost-saver)
az containerapp update -n $APP -g $RG --min-replicas 0 --max-replicas 3

# Secrets (never pass these as plain env)
az containerapp secret set -n $APP -g $RG --secrets \
  database-url="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require" \
  cron-secret="$(openssl rand -hex 24)"

# Environment (secretref points env vars at the secrets above)
az containerapp update -n $APP -g $RG --set-env-vars \
  ENVIRONMENT=production \
  ALLOWED_ORIGINS=https://tracerank.vercel.app \
  DATABASE_URL=secretref:database-url \
  INTERNAL_CRON_SECRET=secretref:cron-secret
```

`CLERK_JWKS_URL` already defaults to the current dev Clerk instance in
`app/config.py`; override it here only if Clerk moves to a production instance.

Verify:

```bash
curl https://tracerank-api.<hash>.<region>.azurecontainerapps.io/health
# → {"status":"ok","db":"connected"}
```

---

## 4. Point the frontend at Azure

The frontend proxies `/api/*` to `BACKEND_URL` (falls back to the old Railway
URL in `frontend/next.config.js`). Set it in Vercel and redeploy:

```bash
# from frontend/, or via the Vercel dashboard → Settings → Environment Variables
vercel env add BACKEND_URL production
# value: https://tracerank-api.<hash>.<region>.azurecontainerapps.io
vercel --prod        # or just push to main
```

Then run a real scan on tracerank.vercel.app to confirm the full flow.

---

## Cold-start note

With `--min-replicas 0`, the first request after idle pays an image-pull +
uvicorn boot (~a few seconds). If you later want it always-warm, set
`--min-replicas 1` (small ongoing cost). Scans tolerate the delay today.
