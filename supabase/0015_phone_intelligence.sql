create table if not exists phone_intelligence (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  phone text not null,
  full_name text,
  country text,
  carrier text,
  whatsapp_available boolean not null default false,
  telegram_available boolean not null default false,
  spam_score integer not null default 0,
  confidence_score integer not null default 0,
  possible_aliases jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  profile_image text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists phone_intelligence_client_idx on phone_intelligence(client_id);
create index if not exists phone_intelligence_phone_idx on phone_intelligence(phone);

create table if not exists social_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  platform text not null,
  profile_url text not null,
  title text,
  snippet text,
  confidence_score integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists social_profiles_client_idx on social_profiles(client_id);

create table if not exists osint_search_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  search_type text not null,
  query text not null,
  status text not null default 'ok',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists osint_search_logs_client_idx on osint_search_logs(client_id);

create table if not exists risk_analysis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  risk_score integer not null,
  confidence_score integer not null,
  fraud_indicators jsonb not null default '[]'::jsonb,
  customer_summary text,
  identity_match_probability integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists risk_analysis_client_idx on risk_analysis(client_id);
