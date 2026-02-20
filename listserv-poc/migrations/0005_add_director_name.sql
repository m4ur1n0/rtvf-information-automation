ALTER TABLE emails ADD COLUMN director_name TEXT;

ALTER TABLE petition_posts ADD COLUMN director_name TEXT;

UPDATE petition_posts
SET director_name = (
  SELECT e.director_name
  FROM emails e
  WHERE e.id = petition_posts.email_id
)
WHERE director_name IS NULL;
