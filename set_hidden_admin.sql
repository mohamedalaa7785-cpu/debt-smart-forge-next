-- Ensure Mohamed Alaa account exists as hidden_admin with the requested password.
-- Password plaintext: 5555510
-- Password hash algorithm: bcrypt (cost 10)
INSERT INTO users (name, email, password, role)
VALUES (
  'Mohamed Alaa',
codex/add-user-creation-with-password-kidg1p
  'mohamed.alaa7785@gmail.com',
  'mohamed.alaa7785@gmail.com',
  '$2a$10$6irSBBcVWZKjZb9n2Oxkb.gQcaf2.EqqEx8/JoebaGG5P1QfYpalG',
  'hidden_admin'
)
ON CONFLICT (email)
DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = 'hidden_admin';
