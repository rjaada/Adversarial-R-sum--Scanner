-- Feature 5: Adversarial Résumé Scanner
-- Add both tables inside init_pg_schema() in db_postgres.py
--
-- MIGRATION NOTE (existing installs):
--   Run adversarial_scanner_migration_v2.sql to convert snapshot_time → snapshot_hour.
--   New installs: apply this file only.

CREATE TABLE IF NOT EXISTS source_trust_history (
    id BIGSERIAL PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_label TEXT NOT NULL,
    -- Truncated to the hour — prevents unbounded row growth on frequent scans.
    snapshot_hour TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', NOW()),
    reliability_score DOUBLE PRECISION NOT NULL,
    corroboration_rate DOUBLE PRECISION NOT NULL,
    avg_event_impact DOUBLE PRECISION NOT NULL,
    report_count_7d INTEGER NOT NULL DEFAULT 0,
    high_impact_share DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    low_impact_share DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    trust_velocity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    UNIQUE (source_id, snapshot_hour)
);

CREATE INDEX IF NOT EXISTS idx_source_trust_history_source_hour
ON source_trust_history(source_id, snapshot_hour DESC);

CREATE TABLE IF NOT EXISTS adversarial_source_alerts (
    id BIGSERIAL PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_label TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    -- Actual source reliability score at alert time (not the composite adversarial risk score).
    trust_score_at_alert DOUBLE PRECISION NOT NULL,
    trust_velocity_7d DOUBLE PRECISION NOT NULL,
    low_impact_buildup_rate DOUBLE PRECISION NOT NULL,
    high_impact_injection_detected BOOLEAN NOT NULL DEFAULT FALSE,
    trigger_event_id TEXT,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_adversarial_alerts_source_time
ON adversarial_source_alerts(source_id, created_at DESC);
