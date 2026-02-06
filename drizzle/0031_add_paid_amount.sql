-- Add paid_amount column to financial_documents for partial payments tracking
ALTER TABLE "financial_documents" ADD COLUMN IF NOT EXISTS "paid_amount" decimal(12,2) DEFAULT '0';
