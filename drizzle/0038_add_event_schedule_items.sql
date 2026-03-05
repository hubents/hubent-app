CREATE TABLE IF NOT EXISTS "event_schedule_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "organization_id" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "date" timestamp NOT NULL,
  "start_time" text,
  "end_time" text,
  "location" text,
  "notes" text,
  "color" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
