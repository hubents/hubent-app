-- Add vendorId to task_participants and make userId nullable
-- This allows vendors to be assigned to tasks

ALTER TABLE "task_participants" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "task_participants" ADD COLUMN "vendor_id" integer REFERENCES "vendors"("id") ON DELETE CASCADE;

-- Add check constraint to ensure either userId or vendorId is set
ALTER TABLE "task_participants" ADD CONSTRAINT "task_participants_user_or_vendor" 
  CHECK (("user_id" IS NOT NULL) OR ("vendor_id" IS NOT NULL));
