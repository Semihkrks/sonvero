-- ══════════════════════════════════════════
-- NilFatura — Supabase Schema
-- ══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Nilvera API Hesapları
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  environment TEXT DEFAULT 'test' CHECK (environment IN ('test', 'live')),
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT false,
  company_name TEXT,
  vkn TEXT,
  invoice_series TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fatura İşlem Logları
CREATE TABLE IF NOT EXISTS invoice_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  invoice_uuid TEXT,
  invoice_type TEXT CHECK (invoice_type IN ('einvoice', 'earchive')),
  action TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Excel Export Geçmişi
CREATE TABLE IF NOT EXISTS export_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanıcı Ayarları
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark',
  default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  excel_columns JSONB DEFAULT '[]',
  company_defaults JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cari Tahsilat Kayıtları
CREATE TABLE IF NOT EXISTS customer_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  customer_key TEXT NOT NULL,
  customer_name TEXT,
  customer_tax_no TEXT,
  type TEXT DEFAULT 'Tahsilat',
  description TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_collections_account_date
  ON customer_collections (account_id, date);

CREATE INDEX IF NOT EXISTS idx_customer_collections_user_account_customer
  ON customer_collections (user_id, account_id, customer_key, date);

-- Mevcut tablolarda kullanıcı+hesap bütünlüğü (aynı müşteri farklı hesaplarda güvenli ayrışır)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_id_user_unique'
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_id_user_unique UNIQUE (id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customer_collections'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE customer_collections
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_collections_account_user_fk'
  ) THEN
    ALTER TABLE customer_collections
      ADD CONSTRAINT customer_collections_account_user_fk
      FOREIGN KEY (account_id, user_id) REFERENCES accounts(id, user_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own logs" ON invoice_logs;
CREATE POLICY "Users can manage own logs" ON invoice_logs
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exports" ON export_history;
CREATE POLICY "Users can manage own exports" ON export_history
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own customer collections" ON customer_collections;

CREATE POLICY "Users can manage own customer collections" ON customer_collections
  FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = customer_collections.account_id
      AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = customer_collections.account_id
      AND a.user_id = auth.uid()
    )
  );
