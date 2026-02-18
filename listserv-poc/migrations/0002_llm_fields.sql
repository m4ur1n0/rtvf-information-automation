-- LLM-extracted enrichment fields added in v2
-- Run each ALTER TABLE separately (D1/SQLite does not support multi-column ADD in one statement)

ALTER TABLE emails ADD COLUMN film_title TEXT;
ALTER TABLE emails ADD COLUMN logline TEXT;
ALTER TABLE emails ADD COLUMN production_type TEXT;

-- Crew-call fields
ALTER TABLE emails ADD COLUMN roles_json TEXT;          -- JSON string[]: roles sought, e.g. ["DP","Sound Designer"]
ALTER TABLE emails ADD COLUMN shoot_dates_text TEXT;    -- Free-form shoot date description
ALTER TABLE emails ADD COLUMN petition_location TEXT;   -- Where/how to petition (e.g. "Shakesmart in Norris")

-- Unified primary deadline (epoch seconds), works for crew calls AND grants AND events
ALTER TABLE emails ADD COLUMN deadline_at INTEGER;

-- Grant fields
ALTER TABLE emails ADD COLUMN grant_amount TEXT;        -- e.g. "up to $750" or "$750 – $3,000"
ALTER TABLE emails ADD COLUMN grant_status TEXT;        -- open | upcoming | closed | unclear
ALTER TABLE emails ADD COLUMN application_url TEXT;     -- Direct application link
ALTER TABLE emails ADD COLUMN eligibility_text TEXT;    -- Free-form eligibility description
ALTER TABLE emails ADD COLUMN grant_scope TEXT;         -- production | post | equipment | travel | unclear

-- Event fields
ALTER TABLE emails ADD COLUMN event_date_text TEXT;     -- Free-form event date/time description
ALTER TABLE emails ADD COLUMN event_location TEXT;      -- Where the event takes place
ALTER TABLE emails ADD COLUMN rsvp_url TEXT;            -- RSVP or sign-up link

-- Classifier metadata
ALTER TABLE emails ADD COLUMN llm_reasoning TEXT;       -- LLM's explanation for its classification
ALTER TABLE emails ADD COLUMN classifier_version TEXT DEFAULT 'v1_regex';  -- v1_regex | v2_llm | v2_llm_fallback

-- Run these separately AFTER all ALTER TABLE statements above have been applied:
-- CREATE INDEX IF NOT EXISTS idx_emails_deadline_at ON emails(deadline_at);
-- CREATE INDEX IF NOT EXISTS idx_emails_grant_status ON emails(grant_status);
