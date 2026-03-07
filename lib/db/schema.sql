-- Run this in Supabase SQL Editor to create the wills table.

CREATE TABLE IF NOT EXISTS wills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT NOT NULL,
  executor_wallet TEXT NOT NULL,
  beneficiary_wallets JSONB NOT NULL DEFAULT '[]',
  beneficiary_percentages JSONB NOT NULL DEFAULT '[]',
  ipfs_cid TEXT,
  encrypted_doc_key_iv TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'death_declared', 'executed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wills_creator ON wills(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_wills_executor ON wills(executor_wallet);
CREATE INDEX IF NOT EXISTS idx_wills_beneficiaries ON wills USING GIN (beneficiary_wallets);

-- RLS: allow read/write only for executor or creator; beneficiaries can read
ALTER TABLE wills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON wills
  FOR ALL USING (true);

-- For direct Supabase client from browser you'd add more policies.
-- This app uses API routes with service role, so the above is sufficient for MVP.
