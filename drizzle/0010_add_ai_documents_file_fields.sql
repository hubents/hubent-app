-- Agregar campos para archivos y links en ai_documents
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'text';
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "file_name" text;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "file_size" integer;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "mime_type" text;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "link_url" text;
