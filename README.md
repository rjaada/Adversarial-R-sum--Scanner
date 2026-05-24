# Adversarial Résumé Scanner

Detects sources gaming a Bayesian reliability weight system via five named adversarial signatures. Designed to close the gap that baseline anomaly monitors and content clustering leave open: a source that behaves correctly on purpose — posting accurate low-stakes reports to inflate its trust score, then injecting high-impact disinformation at peak trust.

## How it works

Five signatures, each with an independent weight:

| Signature | Weight | Trigger |
|---|---|---|
| TRUST_PUMPING | 0.25 | Reliability score rises >0.15 in 7 days driven by >70% low-impact events |
| HIGH_IMPACT_INJECTION | 0.35 | High-impact event posted within 48h of a new personal reliability peak |
| CORROBORATION_DESERT | 0.20 | Low-impact claims corroborate at >50 point higher rate than high-impact claims |
| NARRATIVE_ISOLATION | 0.15 | High-impact claim appears only in source's own cluster, never propagated |
| POST_INJECTION_DORMANCY | 0.05 | Source goes silent (>72h) after a prior high-impact injection alert |

Composite score thresholds: **WATCH** ≥ 0.35 · **SUSPECT** ≥ 0.60 · **QUARANTINE** ≥ 0.80

QUARANTINE writes an alert row and emits a warning log. Host-system reliability demotion is an integration hook — see `_quarantine_source()` in the scanner module.

## Setup

```bash
git clone https://github.com/rjaada/Adversarial-R-sum--Scanner.git
cd Adversarial-R-sum--Scanner

python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
```

For DB features, copy `.env.example` to `.env` and set `DATABASE_URL`:

```bash
cp .env.example .env
# edit .env
```

## Run the CLI (no DB required)

```bash
cd backend
python cli.py --fixture fixtures/sample_clean.json
python cli.py --fixture fixtures/sample_quarantine.json
python cli.py --fixture fixtures/sample_watch.json --json
```

Example output:

```
====================================================
  Source:      tg_chan_quarantine_099
  Risk level:  QUARANTINE
  Risk score:  0.8000
  Signatures:  TRUST_PUMPING, HIGH_IMPACT_INJECTION, CORROBORATION_DESERT
====================================================
```

Three fixtures are included: `sample_clean.json`, `sample_watch.json`, `sample_quarantine.json`. Each uses relative `hours_ago`/`days_ago` fields so they never go stale.

## Run unit tests (no DB required)

```bash
cd backend && pytest test_adversarial_scanner.py test_cli.py -v
```

Expected: **39 passed**.

## Run integration tests (requires Postgres)

Apply the schema first:

```bash
psql $DATABASE_URL -f backend/adversarial_scanner_schema.sql
```

Then run:

```bash
cd backend && DATABASE_URL=postgresql://user:pass@localhost:5432/dbname \
  pytest test_db_integration.py -m integration -v
```

Tests cover: hourly snapshot upsert + dedupe, prior injection lookup (including resolved-alert handling), alert row correctness (`trust_score_at_alert` = source reliability, not composite risk score).

## Schema

Two tables — see `backend/adversarial_scanner_schema.sql`:

- **`source_trust_history`** — hourly snapshots of source reliability metrics. Unique on `(source_id, snapshot_hour)`. Frequent scans within the same hour overwrite rather than append.
- **`adversarial_source_alerts`** — one row per alert event. `trust_score_at_alert` stores the source's actual reliability score at alert time. The composite adversarial risk score is in `payload_json.adversarial_risk_score`.

## Migration (existing installs only)

If upgrading from the original schema (which used raw `snapshot_time` as the dedup key):

```bash
psql $DATABASE_URL -f backend/adversarial_scanner_migration_v2.sql
```

The migration is safe to re-run on pre-v2 installs (those where `snapshot_time` still exists as the dedup column). It deduplicates rows within the same hour (keeping the latest per source) before adding the new unique constraint. It assumes the old `snapshot_time` column is present; do not run on a fresh v2 install.

## Integration point

```python
# After update_source_reliability() resolves:
await adversarial_resume_scan(
    source_id=source_id,
    source_label=source_label,
    updated_score=new_reliability,
    recent_events=recent_events_for_source,
    cluster_data=current_disinfo_clusters,
    database_url=DATABASE_URL,
)
```

Also schedule a full scan every 6 hours over all active sources — POST_INJECTION_DORMANCY and NARRATIVE_ISOLATION can trigger between corroboration cycles.

The pure scanner function requires no DB and is directly testable:

```python
result = scan_source_for_adversarial_signatures(
    source_id, trust_history, recent_events, cluster_data,
    prior_injection_detected=False,
)
```
