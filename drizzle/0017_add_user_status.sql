-- Add user status enum and suspension fields
CREATE TYPE "user_status" AS ENUM ('active', 'suspended');

ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;
ALTER TABLE "users" ADD COLUMN "suspended_by" text;
ALTER TABLE "users" ADD COLUMN "suspended_reason" text;
