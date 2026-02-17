-- Add provider_event_access table (cross-org event sharing)
-- Fix verification_status enum (add 'suspended' value)

ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'suspended';

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "provider_event_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_org_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"planner_org_id" integer NOT NULL,
	"vendor_id" integer,
	"invited_by" text,
	"status" text DEFAULT 'pending',
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);

--> statement-breakpoint

ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_provider_org_id_organizations_id_fk" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_planner_org_id_organizations_id_fk" FOREIGN KEY ("planner_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
