-- TraceRank canonical schema — apply once against a fresh database
-- Existing databases: use backend/migrations/001_phase1.sql instead
-- psql $DATABASE_URL -f backend/schema.sql

CREATE TABLE IF NOT EXISTS users (
  clerk_user_id  TEXT        PRIMARY KEY,
  plan           TEXT        NOT NULL DEFAULT 'free',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  theme_pref     TEXT,
  bench_opt_in   BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS waitlist (
  id         SERIAL      PRIMARY KEY,
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scans (
  id                     TEXT        PRIMARY KEY,
  user_id                TEXT        REFERENCES users(clerk_user_id),
  source_id              TEXT        NOT NULL,
  scanned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ,
  overall_score          FLOAT       NOT NULL,
  keyword_match          FLOAT,
  experience_alignment   FLOAT,
  parse_integrity_score  FLOAT,
  structure_score        FLOAT,
  quantified_impact      FLOAT,
  jd_text_hash           TEXT,
  result_json            JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS scans_scanned_at_idx  ON scans (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_user_id     ON scans (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_expires_at  ON scans (expires_at) WHERE expires_at IS NOT NULL;

-- scan_issues: stripped of source_excerpt from Phase 1 onwards
CREATE TABLE IF NOT EXISTS scan_issues (
  id             SERIAL      PRIMARY KEY,
  scan_id        TEXT        NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  issue_type     TEXT        NOT NULL,
  severity       TEXT        NOT NULL,
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  suggested_fix  TEXT        NOT NULL,
  impact_score   FLOAT       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_issues_scan_id_idx ON scan_issues (scan_id);
