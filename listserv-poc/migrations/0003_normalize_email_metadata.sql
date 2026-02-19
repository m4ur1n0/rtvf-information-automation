-- Normalize multivalue metadata out of JSON blobs on emails
-- Keep legacy columns for backwards compatibility during rollout.

CREATE TABLE IF NOT EXISTS email_tags (
  email_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (email_id, tag),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tags_tag_email ON email_tags(tag, email_id);
CREATE INDEX IF NOT EXISTS idx_email_tags_email ON email_tags(email_id);

CREATE TABLE IF NOT EXISTS email_reasons (
  email_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (email_id, position),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_reasons_email ON email_reasons(email_id, position);

CREATE TABLE IF NOT EXISTS email_roles (
  email_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (email_id, position),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_roles_email ON email_roles(email_id, position);
CREATE INDEX IF NOT EXISTS idx_email_roles_role ON email_roles(role, email_id);

CREATE TABLE IF NOT EXISTS email_contacts (
  email_id TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (email_id, contact_type, contact_value),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_contacts_email ON email_contacts(email_id, position);
CREATE INDEX IF NOT EXISTS idx_email_contacts_type_value ON email_contacts(contact_type, contact_value);

CREATE TABLE IF NOT EXISTS email_dates (
  email_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('deadline', 'mentioned')),
  position INTEGER NOT NULL,
  date_text TEXT,
  date_iso TEXT,
  date_epoch INTEGER,
  PRIMARY KEY (email_id, kind, position),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_dates_kind_epoch ON email_dates(kind, date_epoch);
CREATE INDEX IF NOT EXISTS idx_email_dates_email_kind ON email_dates(email_id, kind, position);

CREATE TABLE IF NOT EXISTS email_recipients (
  email_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  PRIMARY KEY (email_id, position),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email_id, position);
CREATE INDEX IF NOT EXISTS idx_email_recipients_recipient ON email_recipients(recipient_email);

-- Backfill tags
INSERT OR IGNORE INTO email_tags (email_id, tag)
SELECT e.id, j.value
FROM emails e, json_each(CASE WHEN json_valid(e.tags_json) THEN e.tags_json ELSE '[]' END) j
WHERE e.tags_json IS NOT NULL
  AND j.type = 'text';

-- Backfill reasons preserving order
INSERT OR IGNORE INTO email_reasons (email_id, position, reason)
SELECT e.id, CAST(j.key AS INTEGER), j.value
FROM emails e, json_each(CASE WHEN json_valid(e.reasons_json) THEN e.reasons_json ELSE '[]' END) j
WHERE e.reasons_json IS NOT NULL
  AND j.type = 'text';

-- Backfill roles preserving order
INSERT OR IGNORE INTO email_roles (email_id, position, role)
SELECT e.id, CAST(j.key AS INTEGER), j.value
FROM emails e, json_each(CASE WHEN json_valid(e.roles_json) THEN e.roles_json ELSE '[]' END) j
WHERE e.roles_json IS NOT NULL
  AND j.type = 'text';

-- Backfill contacts preserving order; ignore malformed objects
INSERT OR IGNORE INTO email_contacts (email_id, contact_type, contact_value, position)
SELECT
  e.id,
  CAST(json_extract(j.value, '$.type') AS TEXT),
  CAST(json_extract(j.value, '$.value') AS TEXT),
  CAST(j.key AS INTEGER)
FROM emails e, json_each(CASE WHEN json_valid(e.contacts_json) THEN e.contacts_json ELSE '[]' END) j
WHERE e.contacts_json IS NOT NULL
  AND j.type = 'object'
  AND json_extract(j.value, '$.type') IS NOT NULL
  AND json_extract(j.value, '$.value') IS NOT NULL;

-- Backfill deadlines
INSERT OR IGNORE INTO email_dates (email_id, kind, position, date_text, date_iso, date_epoch)
SELECT
  e.id,
  'deadline',
  CAST(j.key AS INTEGER),
  CAST(json_extract(j.value, '$.text') AS TEXT),
  CAST(json_extract(j.value, '$.iso') AS TEXT),
  CASE
    WHEN json_extract(j.value, '$.iso') IS NOT NULL
      THEN unixepoch(CAST(json_extract(j.value, '$.iso') AS TEXT))
    ELSE NULL
  END
FROM emails e, json_each(CASE WHEN json_valid(e.deadlines_json) THEN e.deadlines_json ELSE '[]' END) j
WHERE e.deadlines_json IS NOT NULL
  AND j.type = 'object';

-- Backfill mentioned dates
INSERT OR IGNORE INTO email_dates (email_id, kind, position, date_text, date_iso, date_epoch)
SELECT
  e.id,
  'mentioned',
  CAST(j.key AS INTEGER),
  CAST(json_extract(j.value, '$.text') AS TEXT),
  CAST(json_extract(j.value, '$.iso') AS TEXT),
  CASE
    WHEN json_extract(j.value, '$.iso') IS NOT NULL
      THEN unixepoch(CAST(json_extract(j.value, '$.iso') AS TEXT))
    ELSE NULL
  END
FROM emails e, json_each(CASE WHEN json_valid(e.dates_mentioned_json) THEN e.dates_mentioned_json ELSE '[]' END) j
WHERE e.dates_mentioned_json IS NOT NULL
  AND j.type = 'object';

-- Backfill recipients preserving order
INSERT OR IGNORE INTO email_recipients (email_id, position, recipient_email)
SELECT e.id, CAST(j.key AS INTEGER), j.value
FROM emails e, json_each(CASE WHEN json_valid(e.to_emails_json) THEN e.to_emails_json ELSE '[]' END) j
WHERE e.to_emails_json IS NOT NULL
  AND j.type = 'text';
