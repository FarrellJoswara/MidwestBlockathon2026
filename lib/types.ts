export type WillStatus = "active" | "death_declared" | "executed";

export interface Will {
  id: string;
  creator_wallet: string;
  executor_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid: string | null;
  encrypted_doc_key_iv: string | null;
  status: WillStatus;
  created_at: string;
  updated_at: string;
}

export interface WillInsert {
  creator_wallet: string;
  executor_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
  status?: WillStatus;
}

export interface WillUpdate {
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
