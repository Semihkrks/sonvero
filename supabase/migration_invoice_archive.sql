-- ══════════════════════════════════════════
-- MIGRATION: Fatura Arşivi tabloları
-- Supabase SQL Editor'de BİR KEZ çalıştır.
-- (schema.sql'e de eklendi; mevcut kurulumlar için bu dosya yeterli)
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoice_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('efatura_sale', 'efatura_purchase', 'earsiv', 'earsiv_gib', 'eirsaliye_sale', 'eirsaliye_purchase')),
  invoice_uuid TEXT NOT NULL,
  issue_date DATE,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (account_id, doc_type, invoice_uuid)
);

CREATE INDEX IF NOT EXISTS idx_invoice_archive_lookup
  ON invoice_archive (account_id, doc_type, issue_date);

CREATE TABLE IF NOT EXISTS invoice_archive_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('efatura_sale', 'efatura_purchase', 'earsiv', 'earsiv_gib', 'eirsaliye_sale', 'eirsaliye_purchase')),
  month DATE NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (account_id, doc_type, month)
);

CREATE INDEX IF NOT EXISTS idx_invoice_archive_sync_lookup
  ON invoice_archive_sync (account_id, doc_type, month);

-- Tablolar daha önce 'earsiv_gib' olmadan oluşturulduysa CHECK'i yenile (idempotent)
ALTER TABLE invoice_archive DROP CONSTRAINT IF EXISTS invoice_archive_doc_type_check;
ALTER TABLE invoice_archive ADD CONSTRAINT invoice_archive_doc_type_check
  CHECK (doc_type IN ('efatura_sale', 'efatura_purchase', 'earsiv', 'earsiv_gib', 'eirsaliye_sale', 'eirsaliye_purchase'));

ALTER TABLE invoice_archive_sync DROP CONSTRAINT IF EXISTS invoice_archive_sync_doc_type_check;
ALTER TABLE invoice_archive_sync ADD CONSTRAINT invoice_archive_sync_doc_type_check
  CHECK (doc_type IN ('efatura_sale', 'efatura_purchase', 'earsiv', 'earsiv_gib', 'eirsaliye_sale', 'eirsaliye_purchase'));

ALTER TABLE invoice_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_archive_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own invoice archive" ON invoice_archive;
CREATE POLICY "Users can manage own invoice archive" ON invoice_archive
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own archive sync" ON invoice_archive_sync;
CREATE POLICY "Users can manage own archive sync" ON invoice_archive_sync
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
