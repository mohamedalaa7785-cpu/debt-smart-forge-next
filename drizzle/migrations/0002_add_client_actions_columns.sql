ALTER TABLE "client_actions" ADD COLUMN IF NOT EXISTS "result" text;--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN IF NOT EXISTS "amount_paid" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN IF NOT EXISTS "next_action_date" date;
