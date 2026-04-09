ALTER TABLE "client_loans" ADD COLUMN "loan_number" text;
--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "cycle" integer;
--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "organization" text;
--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "will_legal" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "referral_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "client_loans" ADD COLUMN "collector_percentage" numeric(6,2);
