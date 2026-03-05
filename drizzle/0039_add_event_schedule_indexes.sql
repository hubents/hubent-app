CREATE INDEX IF NOT EXISTS "idx_event_schedule_items_event_id" ON "event_schedule_items" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_schedule_items_org_date" ON "event_schedule_items" ("organization_id", "date");
