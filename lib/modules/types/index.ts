export type WillStatus = "active" | "death_declared" | "executed";

/** One fund/pool: name + beneficiaries and percentages (sum 100 for this pool). */
export interface WillPool {
  name: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
}

export interface Will {
  id: string;
  creator_wallet: string;
  executor_wallet: string;
  /** Allocations per pool. Use this for multi-pool wills. */
  pools: WillPool[];
  /** First pool's wallets (backward compat). Prefer using pools[]. */
  beneficiary_wallets: string[];
  /** First pool's percentages (backward compat). Prefer using pools[]. */
  beneficiary_percentages: number[];
  ipfs_cid: string | null;
  encrypted_doc_key_iv: string | null;
  generated_contract_address: string | null;
  status: WillStatus;
  created_at: string;
  updated_at: string;
}

export interface WillInsert {
  creator_wallet: string;
  executor_wallet: string;
  /** Use pools for create; flat lists kept for compat. */
  pools?: WillPool[];
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
  status?: WillStatus;
}

export interface WillUpdate {
  /** If provided, replaces pools (executor cannot change percentages; send existing pcts). */
  pools?: WillPool[];
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
  status?: WillStatus;
}

export type WalletRole = "executor" | "beneficiary" | "creator" | null;

export interface WillWithRole extends Will {
  role: WalletRole;
}
