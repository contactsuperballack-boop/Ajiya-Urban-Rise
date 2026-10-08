-- migrations/001_create_leads_and_subscribers.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    interest VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    source_page VARCHAR(200),
    related_project_slug VARCHAR(120),
    related_property_slug VARCHAR(120),
    ip INET,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leads_status_check
        CHECK (
            status IN (
                'NEW',
                'CONTACTED',
                'QUALIFIED',
                'VIEWING',
                'NEGOTIATING',
                'CONVERTED',
                'LOST'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(related_project_slug);
CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(related_property_slug);

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(190) NOT NULL,
    ip INET,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT newsletter_status_check
        CHECK (
            status IN (
                'ACTIVE',
                'UNSUBSCRIBED'
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_lower
    ON newsletter_subscribers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers(subscribed_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS newsletter_subscribers_set_updated_at ON newsletter_subscribers;
CREATE TRIGGER newsletter_subscribers_set_updated_at
BEFORE UPDATE ON newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
