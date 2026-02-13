ALTER TYPE "public"."document_status" ADD VALUE 'approved' BEFORE 'sent';--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "global_discount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "global_discount_type" text DEFAULT 'percentage';--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "organization_finance_settings" ADD COLUMN "default_payment_method" text DEFAULT 'bank_transfer';--> statement-breakpoint
ALTER TABLE "organization_finance_settings" ADD COLUMN "default_bank_account_id" integer;--> statement-breakpoint
ALTER TABLE "organization_finance_settings" ADD CONSTRAINT "organization_finance_settings_default_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("default_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;