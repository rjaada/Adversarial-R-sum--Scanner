-- Migration v2: convert source_trust_history from raw snapshot_time to hourly snapshot_hour.
-- Run once against existing installs before deploying updated adversarial_scanner.py.

BEGIN;

ALTER TABLE source_trust_history
    ADD COLUMN IF NOT EXISTS snapshot_hour TIMESTAMPTZ;

UPDATE source_trust_history
SET snapshot_hour = date_trunc('hour', snapshot_time)
WHERE snapshot_hour IS NULL;

ALTER TABLE source_trust_history
    ALTER COLUMN snapshot_hour SET NOT NULL;

-- Remove raw-timestamp unique constraint.
ALTER TABLE source_trust_history
    DROP CONSTRAINT IF EXISTS source_trust_history_source_id_snapshot_time_key;

-- Add hourly unique constraint (idempotent).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'source_trust_history_source_id_snapshot_hour_key'
    ) THEN
        ALTER TABLE source_trust_history
            ADD CONSTRAINT source_trust_history_source_id_snapshot_hour_key
            UNIQUE (source_id, snapshot_hour);
    END IF;
END
$$;

-- Drop old index, add new one.
DROP INDEX IF EXISTS idx_source_trust_history_source_time;

CREATE INDEX IF NOT EXISTS idx_source_trust_history_source_hour
ON source_trust_history(source_id, snapshot_hour DESC);

COMMIT;
