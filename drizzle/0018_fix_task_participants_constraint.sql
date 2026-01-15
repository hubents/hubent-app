-- Fix the check constraint to allow contact_id as well
-- Drop the old constraint that only allows user_id OR vendor_id
ALTER TABLE "task_participants" DROP CONSTRAINT IF EXISTS "task_participants_user_or_vendor";

-- Add new constraint that allows user_id OR vendor_id OR contact_id
ALTER TABLE "task_participants" ADD CONSTRAINT "task_participants_user_or_vendor_or_contact" 
  CHECK (("user_id" IS NOT NULL) OR ("vendor_id" IS NOT NULL) OR ("contact_id" IS NOT NULL));
