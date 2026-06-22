ALTER TABLE notifications REPLICA IDENTITY FULL;
INSERT INTO notifications (
  id,
  recipient_user_id,
  title,
  message,
  type,
  is_read,
  created_at
)
VALUES (
  gen_random_uuid(),
  1,
  'Realtime Test',
  'Hello Admin 🔥',
  'test',
  false,
  now()
);