ALTER TABLE "client_actions" ADD COLUMN "result" text;
--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN "amount_paid" numeric;
--> statement-breakpoint
ALTER TABLE "client_actions" ADD COLUMN "next_action_date" date;
