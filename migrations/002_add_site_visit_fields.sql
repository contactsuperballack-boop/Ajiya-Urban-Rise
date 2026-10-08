-- migrations/002_add_site_visit_fields.sql
-- Site-visit requests are stored as leads with a request_type and preferred date/time, so the
-- same admin view, notifications, and rate limiting cover them. Additive and idempotent.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) NOT NULL DEFAULT 'enquiry';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_visit_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_visit_time VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_request_type_check') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_request_type_check CHECK (request_type IN ('enquiry', 'site_visit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_request_type ON leads(request_type);
