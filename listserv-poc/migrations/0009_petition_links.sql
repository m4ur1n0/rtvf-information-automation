-- Add dedicated petition/script link storage and backfill from existing email-level fields.

ALTER TABLE emails ADD COLUMN script_url TEXT;

ALTER TABLE petition_posts ADD COLUMN application_url TEXT;
ALTER TABLE petition_posts ADD COLUMN script_url TEXT;

-- Backfill missing petition apply links from canonical email fields.
UPDATE emails
SET application_url = petition_location
WHERE category = 'CREW_CALL'
  AND application_url IS NULL
  AND petition_location IS NOT NULL
  AND (
    lower(trim(petition_location)) LIKE 'http://%'
    OR lower(trim(petition_location)) LIKE 'https://%'
  );

UPDATE petition_posts
SET application_url = (
  SELECT e.application_url
  FROM emails e
  WHERE e.id = petition_posts.email_id
)
WHERE application_url IS NULL;

UPDATE petition_posts
SET script_url = (
  SELECT e.script_url
  FROM emails e
  WHERE e.id = petition_posts.email_id
)
WHERE script_url IS NULL;
