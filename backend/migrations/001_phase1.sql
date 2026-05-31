-- Phase 1 migration — run once against the live database
-- psql $DATABASE_URL -f backend/migrations/001_phase1.sql

-- Users table (Clerk user IDs as primary key)
CREATE TABLE IF NOT EXISTS users (
  clerk_user_id  TEXT        PRIMARY KEY,
  plan           TEXT        NOT NULL DEFAULT 'free',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  theme_pref     TEXT,
  bench_opt_in   BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Waitlist for Pro launch notifications
CREATE TABLE IF NOT EXISTS waitlist (
  id         SERIAL      PRIMARY KEY,
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user-scoped columns to scans
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS user_id                TEXT REFERENCES users(clerk_user_id),
  ADD COLUMN IF NOT EXISTS jd_text_hash           TEXT,
  ADD COLUMN IF NOT EXISTS expires_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS keyword_match          FLOAT,
  ADD COLUMN IF NOT EXISTS experience_alignment   FLOAT,
  ADD COLUMN IF NOT EXISTS parse_integrity_score  FLOAT,
  ADD COLUMN IF NOT EXISTS structure_score        FLOAT,
  ADD COLUMN IF NOT EXISTS quantified_impact      FLOAT;

CREATE INDEX IF NOT EXISTS idx_scans_user_id    ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_expires_at ON scans(expires_at) WHERE expires_at IS NOT NULL;

-- Existing rows keep user_id = NULL (legacy anonymous scans, left intact)
