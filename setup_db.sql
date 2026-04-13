-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS followups CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS client_images CASCADE;
DROP TABLE IF EXISTS osint_results CASCADE;
DROP TABLE IF EXISTS client_actions CASCADE;
DROP TABLE IF EXISTS client_loans CASCADE;
DROP TABLE IF EXISTS client_addresses CASCADE;
DROP TABLE IF EXISTS client_phones CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create USERS table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT,
  is_super_user BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Create SESSIONS table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create CLIENTS table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  customer_id TEXT UNIQUE,
  email TEXT,
  company TEXT,
  notes TEXT,
  referral TEXT,
  image_url TEXT,
  owner_id UUID REFERENCES users(id),
  portfolio_type TEXT, -- ACTIVE / WRITEOFF
  domain_type TEXT, -- FIRST / THIRD / WRITEOFF
  branch TEXT,
  cycle_start_date DATE,
  cycle_end_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- Create PHONES table
CREATE TABLE client_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  phone TEXT
);

-- Create ADDRESSES table
CREATE TABLE client_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  address TEXT,
  city TEXT,
  area TEXT,
  lat NUMERIC,
  lng NUMERIC,
  is_primary BOOLEAN DEFAULT false
);

-- Create LOANS table
CREATE TABLE client_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  loan_number TEXT,
  loan_type TEXT,
  cycle INTEGER,
  organization TEXT,
  will_legal BOOLEAN DEFAULT false,
  referral_date TIMESTAMP,
  collector_percentage NUMERIC(6,2),
  emi NUMERIC,
  balance NUMERIC,
  overdue NUMERIC,
  bucket INTEGER,
  penalty_enabled BOOLEAN DEFAULT false,
  penalty_amount NUMERIC DEFAULT 0,
  amount_due NUMERIC
);

-- Create ACTIONS table
CREATE TABLE client_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  user_id UUID REFERENCES users(id),
  action_type TEXT, -- CALL, VISIT, WHATSAPP, etc.
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create OSINT table
CREATE TABLE osint_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  social JSONB,
  workplace JSONB,
  web_results JSONB,
  image_results JSONB,
  summary TEXT,
  confidence_score NUMERIC
);

-- Create IMAGES table
CREATE TABLE client_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  url TEXT,
  public_id TEXT
);

-- Create AUDIT LOGS table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Create CALL LOGS table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  user_id UUID REFERENCES users(id),
  call_status TEXT, -- answered, no_answer, promised, refused, etc.
  duration INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT now()
);

-- Create FOLLOW-UPS table
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  scheduled_for DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create Indexes
CREATE INDEX idx_clients_owner_id ON clients(owner_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_client_loans_client_id ON client_loans(client_id);
CREATE INDEX idx_client_actions_client_id ON client_actions(client_id);
CREATE INDEX idx_client_phones_client_id ON client_phones(client_id);
CREATE INDEX idx_client_addresses_client_id ON client_addresses(client_id);

-- Insert Initial Users (Roles)
-- Passwords are placeholders except hidden_admin, which is seeded with a real bcrypt hash
INSERT INTO users (name, email, password, role) VALUES
('Adel', 'adel@example.com', 'hashed_password', 'admin'),
('Loay', 'loay@example.com', 'hashed_password', 'supervisor'),
('Mostafa', 'mostafa@example.com', 'hashed_password', 'team_leader'),
('Heba', 'heba@example.com', 'hashed_password', 'team_leader'),
('Nora', 'nora@example.com', 'hashed_password', 'collector'),
codex/add-user-creation-with-password-w01a0b
 codex/add-user-creation-with-password-kidg1p
('Mohamed Alaa', 'mohamed.alaa7785@gmail.com', '$2a$10$6irSBBcVWZKjZb9n2Oxkb.gQcaf2.EqqEx8/JoebaGG5P1QfYpalG', 'hidden_admin');
('Mohamed Alaa', 'mohamed.alaa7785@gmail.com', '$2a$10$6irSBBcVWZKjZb9n2Oxkb.gQcaf2.EqqEx8/JoebaGG5P1QfYpalG', 'hidden_admin');
