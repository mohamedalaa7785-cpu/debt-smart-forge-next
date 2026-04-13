-- Debt Smart Forge - Search + Data Hardening Pack
-- Run this in Supabase SQL editor (safe/idempotent statements only).

BEGIN;

-- 1) Enable extensions used for fuzzy/full-text search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2) Remove duplicated phone rows per client (keep earliest row).
WITH dedup AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY client_id, phone ORDER BY created_at ASC, id ASC) AS rn
  FROM client_phones
)
DELETE FROM client_phones p
USING dedup d
WHERE p.id = d.id
  AND d.rn > 1;

-- 3) Normalize obviously invalid bucket/day values.
UPDATE client_loans
SET bucket = GREATEST(1, COALESCE(bucket, 1))
WHERE bucket IS NULL OR bucket < 1;

UPDATE client_loans
SET cycle = NULL
WHERE cycle IS NOT NULL AND (cycle < 1 OR cycle > 31);

-- 4) Helpful btree indexes for frequent filters.
CREATE INDEX IF NOT EXISTS idx_clients_portfolio_domain_created
  ON clients (portfolio_type, domain_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_owner_team_created
  ON clients (owner_id, team_leader_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_loans_client_bucket
  ON client_loans (client_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_client_loans_cycle
  ON client_loans (cycle);

-- 5) Trigram indexes for fuzzy-ish matching.
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON clients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_trgm
  ON clients USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_company_trgm
  ON clients USING gin (company gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_customer_id_trgm
  ON clients USING gin (customer_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_client_phones_phone_trgm
  ON client_phones USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_client_addresses_text_trgm
  ON client_addresses USING gin (
    (COALESCE(address, '') || ' ' || COALESCE(city, '') || ' ' || COALESCE(area, '')) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_client_loans_loan_number_trgm
  ON client_loans USING gin (loan_number gin_trgm_ops);

-- 6) Full-text GIN indexes for narrative fields.
CREATE INDEX IF NOT EXISTS idx_clients_notes_referral_fts
  ON clients USING gin (
    to_tsvector(
      'simple',
      unaccent(COALESCE(notes, '') || ' ' || COALESCE(referral, '') || ' ' || COALESCE(branch, ''))
    )
  );

CREATE INDEX IF NOT EXISTS idx_client_actions_note_result_fts
  ON client_actions USING gin (
    to_tsvector('simple', unaccent(COALESCE(note, '') || ' ' || COALESCE(result, '')))
  );

COMMIT;
