-- Store EmailEngine attachment metadata so cid: inline images can be resolved at read time.

CREATE TABLE IF NOT EXISTS email_attachments (
  email_id TEXT NOT NULL,
  account TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  content_id TEXT,
  cid_normalized TEXT,
  content_type TEXT,
  filename TEXT,
  encoded_size INTEGER,
  embedded INTEGER NOT NULL DEFAULT 0,
  inline INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email_id, attachment_id),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_cid
  ON email_attachments(email_id, cid_normalized);
CREATE INDEX IF NOT EXISTS idx_email_attachments_cid
  ON email_attachments(cid_normalized);
