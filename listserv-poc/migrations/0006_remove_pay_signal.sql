ALTER TABLE petition_posts DROP COLUMN pay;

DELETE FROM email_tags
WHERE tag IN ('PAID', 'UNPAID', 'PAY_UNCLEAR');

UPDATE emails
SET tags_json = (
  SELECT COALESCE(json_group_array(j.value), '[]')
  FROM json_each(CASE WHEN json_valid(emails.tags_json) THEN emails.tags_json ELSE '[]' END) AS j
  WHERE j.value NOT IN ('PAID', 'UNPAID', 'PAY_UNCLEAR')
)
WHERE tags_json IS NOT NULL;
