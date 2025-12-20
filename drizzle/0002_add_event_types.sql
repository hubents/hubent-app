-- Add new event types to the enum
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'pre_wedding';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'post_wedding';
