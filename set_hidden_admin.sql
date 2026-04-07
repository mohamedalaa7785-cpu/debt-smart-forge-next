-- Ensure Mohamed Alaa account exists as hidden_admin with the requested password.
-- Password plaintext: @Laa5555510
-- Password hash algorithm: bcrypt (cost 10)
INSERT INTO users (name, email, password, role)
VALUES (
  'Mohamed Alaa',
  'mohamed.alaa7785@gmail.com',
  '$2a$10$AI9DbNJlzLuc/lrfAcgRju9k3eUXlp0ul4u48is19noFJP2iG7Jfm',
  'hidden_admin'
)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = 'hidden_admin';
