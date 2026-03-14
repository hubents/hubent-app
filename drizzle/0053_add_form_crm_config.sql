ALTER TABLE forms ADD COLUMN IF NOT EXISTS crm_create_contact boolean DEFAULT true;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS crm_create_lead boolean DEFAULT true;
