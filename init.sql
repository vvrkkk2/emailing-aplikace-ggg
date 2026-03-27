-- Povolení rozšíření pro šifrování hesel uživatelů
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Vytvoření tabulek
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smtp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INT NOT NULL,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_pass_encrypted VARCHAR(255) NOT NULL,
    imap_host VARCHAR(255) NOT NULL,
    imap_port INT NOT NULL,
    daily_limit INT DEFAULT 50,
    sent_today INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    last_error_message TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    schedule_days INT[] DEFAULT '{1,2,3,4,5}',
    schedule_start_time TIME DEFAULT '09:00:00',
    schedule_end_time TIME DEFAULT '17:00:00',
    min_delay_seconds INT DEFAULT 120,
    max_delay_seconds INT DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    step_number INT DEFAULT 1,
    delay_days INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sending_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID UNIQUE DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    smtp_account_id UUID REFERENCES smtp_accounts(id) ON DELETE SET NULL,
    step_id UUID REFERENCES campaign_steps(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    sent_count INT DEFAULT 0,
    open_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    bounce_count INT DEFAULT 0,
    UNIQUE(date, campaign_id)
);

-- 2. Vytvoření indexů pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_smtp_accounts_status ON smtp_accounts(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sending_logs_tracking_id ON sending_logs(tracking_id);
CREATE INDEX IF NOT EXISTS idx_sending_logs_campaign_id ON sending_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
