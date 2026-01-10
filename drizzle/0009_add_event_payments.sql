-- Add event_payments table for direct event payments (not from tasks)
CREATE TABLE IF NOT EXISTS "event_payments" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "amount" decimal(12, 2) NOT NULL,
  "status" text DEFAULT 'pending',
  "due_date" timestamp,
  "paid_date" timestamp,
  "paid_to" text,
  "paid_by" text,
  "vendor_id" integer REFERENCES "vendors"("id"),
  "notes" text,
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "event_payments_event_id_idx" ON "event_payments"("event_id");
CREATE INDEX IF NOT EXISTS "event_payments_status_idx" ON "event_payments"("status");
