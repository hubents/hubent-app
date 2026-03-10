-- One-time cleanup: quotes should never have status partial or paid.
-- Any quote that ended up in those states via payment recalculation
-- is reverted to payment_promise (most semantically correct fallback).
UPDATE financial_documents
SET status = 'payment_promise', updated_at = NOW()
WHERE type = 'quote'
  AND status IN ('partial', 'paid');
