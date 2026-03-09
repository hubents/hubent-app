-- Add vendor_id to task_schedule_items for associating schedule items with vendors
ALTER TABLE "task_schedule_items" ADD COLUMN "vendor_id" integer;

DO $$ BEGIN
  ALTER TABLE "task_schedule_items" ADD CONSTRAINT "task_schedule_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_task_schedule_items_vendor_id" ON "task_schedule_items" ("vendor_id");
