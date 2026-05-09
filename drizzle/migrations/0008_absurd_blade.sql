CREATE TYPE "public"."domain_type" AS ENUM('FIRST', 'THIRD', 'WRITEOFF');--> statement-breakpoint
CREATE TYPE "public"."portfolio_type" AS ENUM('ACTIVE', 'WRITEOFF');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"assigned_by" uuid,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"status" text,
	"duration_sec" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"content" text NOT NULL,
	"is_important" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"client_id" uuid,
	"intelligence_id" uuid,
	"storage_path" text NOT NULL,
	"title" text,
	"mime_type" text,
	"size_bytes" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"scheduled_for" timestamp with time zone,
	"note" text,
	"done" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"level" text NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fraud_analysis_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"source" text,
	"raw_data_url" text,
	"status" text DEFAULT 'pending',
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"case_number" text,
	"case_type" text,
	"status" text DEFAULT 'pending',
	"last_update" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"action" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osint_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" text NOT NULL,
	"query" text,
	"result" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"full_name" text,
	"role" "user_role" DEFAULT 'collector' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_hidden_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "risk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reason" text,
	"category" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "client_images" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "client_images" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "client_actions" DROP CONSTRAINT "client_actions_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_addresses" DROP CONSTRAINT "client_addresses_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_loans" DROP CONSTRAINT "client_loans_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_phones" DROP CONSTRAINT "client_phones_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "osint_results" DROP CONSTRAINT "osint_results_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "action_type" SET DEFAULT 'NOTE';--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "action_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "client_actions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_addresses" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_addresses" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_addresses" ALTER COLUMN "lat" SET DATA TYPE numeric(10, 6);--> statement-breakpoint
ALTER TABLE "client_addresses" ALTER COLUMN "lng" SET DATA TYPE numeric(10, 6);--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "loan_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "emi" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "balance" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "bucket" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "penalty_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "penalty_amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_loans" ALTER COLUMN "amount_due" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_phones" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_phones" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "portfolio_type" SET DEFAULT 'ACTIVE'::"public"."portfolio_type";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "portfolio_type" SET DATA TYPE "public"."portfolio_type" USING "portfolio_type"::"public"."portfolio_type";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "portfolio_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "domain_type" SET DEFAULT 'FIRST'::"public"."domain_type";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "domain_type" SET DATA TYPE "public"."domain_type" USING "domain_type"::"public"."domain_type";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "domain_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "cycle_start_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "cycle_end_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "social" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "workplace" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "web_results" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "image_results" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ALTER COLUMN "confidence_score" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'collector'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN "amount_paid" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN "next_action_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD COLUMN "is_primary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "loan_number" text;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "cycle" integer;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "organization" text;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "will_legal" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "referral_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "collector_percentage" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "overdue" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "client_phones" ADD COLUMN "is_primary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "client_phones" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "referral" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "referral_text" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "referral_image_url" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "status" text DEFAULT 'NEW';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "team_leader_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "maps_results" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "risk_level" text DEFAULT 'low';--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "fraud_flags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "last_analyzed_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "osint_results" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_super_user" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_analysis" ADD CONSTRAINT "fraud_analysis_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osint_history" ADD CONSTRAINT "osint_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assignments_owner_id" ON "assignments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_client_id" ON "attachments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "call_logs_client_idx" ON "call_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_notes_client_id" ON "client_notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "followups_client_idx" ON "followups" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "followups_scheduled_idx" ON "followups" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "fraud_client_idx" ON "fraud_analysis" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "legal_client_idx" ON "legal_cases" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_client_id_idx" ON "audit_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "osint_history_client_idx" ON "osint_history" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_uidx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_uidx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_uidx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_risk_scores_client_id" ON "risk_scores" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "client_actions" ADD CONSTRAINT "client_actions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD CONSTRAINT "client_addresses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_loans" ADD CONSTRAINT "client_loans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_phones" ADD CONSTRAINT "client_phones_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_team_leader_id_users_id_fk" FOREIGN KEY ("team_leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osint_results" ADD CONSTRAINT "osint_results_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_client_idx" ON "client_actions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "actions_user_idx" ON "client_actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_client_idx" ON "client_addresses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "loans_client_idx" ON "client_loans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "phones_client_idx" ON "client_phones" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_owner_idx" ON "clients" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clients_team_idx" ON "clients" USING btree ("team_leader_id");--> statement-breakpoint
CREATE INDEX "clients_created_by_idx" ON "clients" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_clients_status" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "osint_client_idx" ON "osint_results" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "osint_confidence_idx" ON "osint_results" USING btree ("confidence_score");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_customer_id_unique" UNIQUE("customer_id");--> statement-breakpoint
ALTER TABLE "osint_results" ADD CONSTRAINT "osint_results_client_id_unique" UNIQUE("client_id");