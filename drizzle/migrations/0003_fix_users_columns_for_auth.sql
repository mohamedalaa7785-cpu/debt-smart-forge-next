ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'collector';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_user" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
