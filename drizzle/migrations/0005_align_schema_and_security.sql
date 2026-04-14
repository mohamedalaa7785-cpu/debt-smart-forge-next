DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE "user_role" AS ENUM ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portfolio_type') THEN
    CREATE TYPE "portfolio_type" AS ENUM ('ACTIVE', 'WRITEOFF');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domain_type') THEN
    CREATE TYPE "domain_type" AS ENUM ('FIRST', 'THIRD', 'WRITEOFF');
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING COALESCE("role", 'collector')::"user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'collector';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_user" boolean DEFAULT false;

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "osint_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "result" jsonb DEFAULT '{}'::jsonb,
  "confidence" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "osint_history" ADD CONSTRAINT "osint_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "fraud_analysis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "score" integer DEFAULT 0,
  "level" text DEFAULT 'low',
  "signals" jsonb DEFAULT '[]'::jsonb,
  "ai_summary" text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "fraud_analysis" ADD CONSTRAINT "fraud_analysis_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "fraud_client_idx" ON "fraud_analysis" ("client_id");
CREATE INDEX IF NOT EXISTS "fraud_score_idx" ON "fraud_analysis" ("score");
CREATE INDEX IF NOT EXISTS "osint_history_client_idx" ON "osint_history" ("client_id");
