-- Rename credit_note document numbers from "ABONO-..." to "FR-..." to match
-- the prototype's "Factura Rectificativa" prefix (finance.jsx:474).
-- The org-level setting default was changed in schema.ts at the same time.
-- Idempotent: no effect if no rows match.

UPDATE financial_documents
SET number = 'FR-' || SUBSTRING(number FROM 7)
WHERE type = 'credit_note'
  AND number LIKE 'ABONO-%';

-- Update the per-organization preference for any tenant still on the old default
UPDATE organization_finance_settings
SET credit_note_prefix = 'FR'
WHERE credit_note_prefix = 'ABONO';
