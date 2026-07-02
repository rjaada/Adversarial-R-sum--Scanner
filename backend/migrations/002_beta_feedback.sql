-- Beta feedback table
-- Apply: psql $DATABASE_URL -f backend/migrations/002_beta_feedback.sql

CREATE TABLE IF NOT EXISTS beta_feedback (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  user_id          TEXT,                       -- nullable Clerk user ID
  scan_id          TEXT,                       -- nullable; soft ref to scans.id

  surface          TEXT        NOT NULL,       -- 'end_of_scan' | 'report_problem'

  -- End-of-scan survey
  usefulness       TEXT,                       -- 'very_useful' | 'somewhat_useful' | 'not_useful'
  trustworthiness  TEXT,                       -- 'very_trustworthy' | 'somewhat_trustworthy' | 'not_trustworthy'
  most_helpful     TEXT,                       -- 'keyword_gaps' | 'missing_sections' | 'rewrites' | 'review_view' | 'score' | 'other'
  confusing_text   TEXT,
  broken           BOOLEAN,
  broken_text      TEXT,

  -- Bug / problem report
  report_type      TEXT,                       -- 'bug' | 'confusing_result' | 'feature_request' | 'general'
  report_text      TEXT,

  -- Contact opt-in
  contact_email    TEXT,

  -- Context metadata
  view_mode        TEXT,                       -- 'report' | 'review'
  route            TEXT,
  user_agent       TEXT,
  app_version      TEXT
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON beta_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_scan_id    ON beta_feedback (scan_id) WHERE scan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id    ON beta_feedback (user_id) WHERE user_id IS NOT NULL;
