-- Normalize sender fields when legacy imports stored "Name <email>" in from_email/reply_to.

UPDATE emails
SET
  from_name = CASE
    WHEN from_name IS NULL OR trim(from_name) = ''
      THEN NULLIF(trim(trim(substr(from_email, 1, instr(from_email, '<') - 1)), '" '), '')
    ELSE from_name
  END,
  from_email = NULLIF(
    trim(substr(
      from_email,
      instr(from_email, '<') + 1,
      instr(from_email, '>') - instr(from_email, '<') - 1
    )),
    ''
  )
WHERE from_email IS NOT NULL
  AND instr(from_email, '<') > 0
  AND instr(from_email, '>') > instr(from_email, '<');

UPDATE emails
SET reply_to = NULLIF(
  trim(substr(
    reply_to,
    instr(reply_to, '<') + 1,
    instr(reply_to, '>') - instr(reply_to, '<') - 1
  )),
  ''
)
WHERE reply_to IS NOT NULL
  AND instr(reply_to, '<') > 0
  AND instr(reply_to, '>') > instr(reply_to, '<');
