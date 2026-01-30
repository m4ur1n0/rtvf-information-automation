-- emails: canonical stored listserv messages
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,

  provider_message_id TEXT,
  source TEXT NOT NULL,
  listserv TEXT NOT NULL,

  from_email TEXT,
  from_name TEXT,
  reply_to TEXT,
  to_emails_json TEXT,

  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,

  sent_at INTEGER NOT NULL,

  category TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasons_json TEXT NOT NULL,

  is_bump INTEGER NOT NULL,
  thread_key TEXT,
  canonical_id TEXT,

  deadlines_json TEXT,
  dates_mentioned_json TEXT,
  contacts_json TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
CREATE INDEX IF NOT EXISTS idx_emails_thread_key_sent_at ON emails(thread_key, sent_at);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);

-- opportunities: derived for GRANT emails
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,               -- usually same as email id
  email_id TEXT NOT NULL UNIQUE,     -- logical FK to emails.id

  title TEXT NOT NULL,

  status TEXT NOT NULL,              -- open | upcoming | closed | unclear
  deadline_at INTEGER,

  eligibility TEXT NOT NULL,         -- undergrad | grad | both | unclear
  scope TEXT NOT NULL,               -- production | post | equipment | travel | unclear

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status_deadline ON opportunities(status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline_at);
