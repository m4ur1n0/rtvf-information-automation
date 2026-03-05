ALTER TABLE emails ADD COLUMN rfc_message_id TEXT;
ALTER TABLE emails ADD COLUMN in_reply_to TEXT;
ALTER TABLE emails ADD COLUMN references_json TEXT;

CREATE INDEX IF NOT EXISTS idx_emails_rfc_message_id ON emails(rfc_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to ON emails(in_reply_to);

UPDATE emails
SET rfc_message_id = lower(trim(provider_message_id, '<>'))
WHERE rfc_message_id IS NULL
  AND provider_message_id IS NOT NULL
  AND trim(provider_message_id) != '';
