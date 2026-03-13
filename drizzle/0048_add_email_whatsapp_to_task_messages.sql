-- Add email/whatsapp message types and metadata columns to task_messages

-- New enum values for message_type
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'email_sent';
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'email_received';
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'whatsapp_sent';
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'whatsapp_received';

-- Email metadata columns
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_from" text;
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_to" text[];
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_cc" text[];
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_bcc" text[];
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_subject" text;
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_thread_id" text;
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "email_message_id" text;

-- WhatsApp metadata columns
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "whatsapp_to" text;
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "whatsapp_template" text;
