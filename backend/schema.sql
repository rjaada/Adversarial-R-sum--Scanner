-- TraceRank schema — apply once against a fresh Postgres database
-- psql $DATABASE_URL -f backend/schema.sql

CREATE TABLE IF NOT EXISTS scans (
  id            TEXT        PRIMARY KEY,
  source_id     TEXT        NOT NULL,
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score FLOAT       NOT NULL,
  result_json   JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS scans_scanned_at_idx ON scans (scanned_at DESC);

CREATE TABLE IF NOT EXISTS scan_issues (
  id             SERIAL      PRIMARY KEY,
  scan_id        TEXT        NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  issue_type     TEXT        NOT NULL,
  severity       TEXT        NOT NULL,
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  source_excerpt TEXT        NOT NULL DEFAULT '',
  suggested_fix  TEXT        NOT NULL,
  impact_score   FLOAT       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_issues_scan_id_idx ON scan_issues (scan_id);
