-- Sync risk_analysis with Drizzle schema. Safe to re-run.
ALTER TABLE public.risk_analysis
  ADD COLUMN IF NOT EXISTS confidence_score integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS customer_summary text,
  ADD COLUMN IF NOT EXISTS identity_match_probability integer;

ALTER TABLE public.risk_analysis
  ALTER COLUMN confidence_score SET DEFAULT 0,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN identity_match_probability SET DEFAULT 0;

UPDATE public.risk_analysis
SET
  confidence_score = COALESCE(confidence_score, 0),
  metadata = COALESCE(metadata, '{}'::jsonb),
  identity_match_probability = COALESCE(identity_match_probability, 0)
WHERE confidence_score IS NULL
   OR metadata IS NULL
   OR identity_match_probability IS NULL;

ALTER TABLE public.risk_analysis
  ALTER COLUMN confidence_score SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN identity_match_probability SET NOT NULL;
