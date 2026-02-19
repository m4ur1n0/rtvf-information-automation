-- Create category-specific tables so each domain has a clean shape.
-- Keep emails as canonical raw record + classification source.

CREATE TABLE IF NOT EXISTS grant_posts (
  email_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  grant_amount TEXT,
  grant_status TEXT NOT NULL DEFAULT 'unclear' CHECK (grant_status IN ('open', 'upcoming', 'closed', 'unclear')),
  deadline_at INTEGER,
  deadline_text TEXT,
  application_url TEXT,
  eligibility_text TEXT,
  grant_scope TEXT NOT NULL DEFAULT 'unclear' CHECK (grant_scope IN ('production', 'post', 'equipment', 'travel', 'unclear')),
  classifier_confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_grant_posts_status_deadline ON grant_posts(grant_status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_grant_posts_scope ON grant_posts(grant_scope);

CREATE TABLE IF NOT EXISTS petition_posts (
  email_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  film_title TEXT,
  production_type TEXT,
  logline TEXT,
  shoot_dates_text TEXT,
  petition_location TEXT,
  pay TEXT CHECK (pay IN ('paid', 'unpaid', 'unclear') OR pay IS NULL),
  is_casting INTEGER NOT NULL DEFAULT 0,
  is_bump INTEGER NOT NULL DEFAULT 0,
  deadline_at INTEGER,
  classifier_confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_petition_posts_casting_deadline ON petition_posts(is_casting, deadline_at);
CREATE INDEX IF NOT EXISTS idx_petition_posts_bump ON petition_posts(is_bump);

CREATE TABLE IF NOT EXISTS event_posts (
  email_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date_text TEXT,
  event_location TEXT,
  rsvp_url TEXT,
  deadline_at INTEGER,
  is_bump INTEGER NOT NULL DEFAULT 0,
  classifier_confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_posts_deadline ON event_posts(deadline_at);
CREATE INDEX IF NOT EXISTS idx_event_posts_bump ON event_posts(is_bump);

CREATE TABLE IF NOT EXISTS resource_posts (
  email_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  details_text TEXT,
  needs_equipment INTEGER NOT NULL DEFAULT 0,
  needs_location INTEGER NOT NULL DEFAULT 0,
  needs_props_costumes INTEGER NOT NULL DEFAULT 0,
  is_bump INTEGER NOT NULL DEFAULT 0,
  classifier_confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_posts_flags ON resource_posts(needs_equipment, needs_location, needs_props_costumes);

CREATE TABLE IF NOT EXISTS admin_posts (
  email_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  is_bump INTEGER NOT NULL DEFAULT 0,
  classifier_confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_posts_bump ON admin_posts(is_bump);

-- Backfill grant rows
INSERT OR REPLACE INTO grant_posts (
  email_id, title, grant_amount, grant_status, deadline_at, deadline_text,
  application_url, eligibility_text, grant_scope, classifier_confidence, created_at, updated_at
)
SELECT
  e.id,
  e.subject,
  e.grant_amount,
  COALESCE(e.grant_status, 'unclear'),
  e.deadline_at,
  (
    SELECT d.date_text
    FROM email_dates d
    WHERE d.email_id = e.id
      AND d.kind = 'deadline'
    ORDER BY d.position
    LIMIT 1
  ),
  e.application_url,
  e.eligibility_text,
  COALESCE(e.grant_scope, 'unclear'),
  e.confidence,
  e.created_at,
  e.updated_at
FROM emails e
WHERE e.category = 'GRANT';

-- Backfill petition rows (CREW_CALL)
INSERT OR REPLACE INTO petition_posts (
  email_id, title, film_title, production_type, logline, shoot_dates_text,
  petition_location, pay, is_casting, is_bump, deadline_at,
  classifier_confidence, created_at, updated_at
)
SELECT
  e.id,
  e.subject,
  e.film_title,
  e.production_type,
  e.logline,
  e.shoot_dates_text,
  e.petition_location,
  CASE
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'PAID')
      OR COALESCE(e.tags_json, '') LIKE '%\"PAID\"%'
    THEN 'paid'
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'UNPAID')
      OR COALESCE(e.tags_json, '') LIKE '%\"UNPAID\"%'
    THEN 'unpaid'
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'PAY_UNCLEAR')
      OR COALESCE(e.tags_json, '') LIKE '%\"PAY_UNCLEAR\"%'
    THEN 'unclear'
    ELSE NULL
  END,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM email_tags et
      WHERE et.email_id = e.id
        AND et.tag IN ('CASTING_ROLES', 'CASTING_EXTRAS')
    )
      OR COALESCE(e.tags_json, '') LIKE '%"CASTING_ROLES"%'
      OR COALESCE(e.tags_json, '') LIKE '%"CASTING_EXTRAS"%'
    THEN 1
    ELSE 0
  END,
  COALESCE(e.is_bump, 0),
  e.deadline_at,
  e.confidence,
  e.created_at,
  e.updated_at
FROM emails e
WHERE e.category = 'CREW_CALL';

-- Backfill event rows
INSERT OR REPLACE INTO event_posts (
  email_id, title, event_date_text, event_location, rsvp_url,
  deadline_at, is_bump, classifier_confidence, created_at, updated_at
)
SELECT
  e.id,
  e.subject,
  e.event_date_text,
  e.event_location,
  e.rsvp_url,
  e.deadline_at,
  COALESCE(e.is_bump, 0),
  e.confidence,
  e.created_at,
  e.updated_at
FROM emails e
WHERE e.category = 'EVENT';

-- Backfill resource rows
INSERT OR REPLACE INTO resource_posts (
  email_id, title, details_text, needs_equipment, needs_location,
  needs_props_costumes, is_bump, classifier_confidence, created_at, updated_at
)
SELECT
  e.id,
  e.subject,
  substr(e.body_text, 1, 500),
  CASE
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'EQUIPMENT')
      OR COALESCE(e.tags_json, '') LIKE '%"EQUIPMENT"%'
    THEN 1 ELSE 0 END,
  CASE
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'LOCATION')
      OR COALESCE(e.tags_json, '') LIKE '%"LOCATION"%'
    THEN 1 ELSE 0 END,
  CASE
    WHEN EXISTS (SELECT 1 FROM email_tags et WHERE et.email_id = e.id AND et.tag = 'PROPS_COSTUMES')
      OR COALESCE(e.tags_json, '') LIKE '%"PROPS_COSTUMES"%'
    THEN 1 ELSE 0 END,
  COALESCE(e.is_bump, 0),
  e.confidence,
  e.created_at,
  e.updated_at
FROM emails e
WHERE e.category = 'RESOURCE';

-- Backfill admin rows
INSERT OR REPLACE INTO admin_posts (
  email_id, title, is_bump, classifier_confidence, created_at, updated_at
)
SELECT
  e.id,
  e.subject,
  COALESCE(e.is_bump, 0),
  e.confidence,
  e.created_at,
  e.updated_at
FROM emails e
WHERE e.category = 'ADMIN';
