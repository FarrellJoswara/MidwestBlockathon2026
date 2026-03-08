/**
 * UI module — will form parameters and validation.
 * Used by the create/edit will flows; params align with the generated contract (WillRegistry).
 */

import type { WillPool } from "@/lib/modules/types";

export interface WillFormParams {
  creator_wallet: string;
  /** Use pools for multi-pool; flat lists kept for backward compat. */
  pools?: WillPool[];
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
}

export interface WillFormValidation {
  valid: boolean;
  error?: string;
  totalPercentage: number;
  /** Per-pool totals when using pools. */
  poolTotals?: number[];
}

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateOnePool(pool: WillPool, poolIndex: number): string | null {
  const wallets = pool.beneficiary_wallets.filter((w) => w.trim().length > 0);
  const pcts = pool.beneficiary_percentages.slice(0, wallets.length);
  const total = pcts.reduce((s, p) => s + p, 0);
  if (wallets.length === 0) return `Pool "${pool.name || poolIndex + 1}" must have at least one beneficiary.`;
  if (wallets.length !== pool.beneficiary_percentages.length) return `Pool "${pool.name || poolIndex + 1}": beneficiary and percentage count mismatch.`;
  for (const w of wallets) {
    if (!WALLET_REGEX.test(w.trim())) return `Pool "${pool.name || poolIndex + 1}": invalid wallet address.`;
  }
  if (Math.abs(total - 100) > 0.01) return `Pool "${pool.name || poolIndex + 1}": percentages must sum to 100 (got ${total}).`;
  return null;
}

export function validateWillFormParams(params: WillFormParams): WillFormValidation {
  const { creator_wallet, pools, beneficiary_wallets, beneficiary_percentages } = params;

  if (!creator_wallet?.trim()) {
    return { valid: false, error: "Creator wallet is required", totalPercentage: 0 };
  }
  if (!WALLET_REGEX.test(creator_wallet.trim())) {
    return { valid: false, error: "Creator wallet must be a valid 0x address", totalPercentage: 0 };
  }

  if (pools && pools.length > 0) {
    const poolTotals: number[] = [];
    for (let i = 0; i < pools.length; i++) {
      const err = validateOnePool(pools[i], i);
      if (err) return { valid: false, error: err, totalPercentage: 0, poolTotals };
      const total = pools[i].beneficiary_percentages.reduce((s, p) => s + p, 0);
      poolTotals.push(total);
    }
    return { valid: true, totalPercentage: 100, poolTotals };
  }

  const wallets = (beneficiary_wallets ?? []).filter((w) => w.trim().length > 0);
  const pcts = (beneficiary_percentages ?? []).slice(0, wallets.length);
  const totalPercentage = pcts.reduce((s, p) => s + p, 0);

  if (wallets.length === 0) {
    return { valid: false, error: "At least one beneficiary is required", totalPercentage };
  }
  if (wallets.length !== pcts.length) {
    return { valid: false, error: "Beneficiary and percentage count mismatch", totalPercentage };
  }
  for (const w of wallets) {
    if (!WALLET_REGEX.test(w.trim())) {
      return { valid: false, error: "Each beneficiary must be a valid 0x address", totalPercentage };
    }
  }
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      valid: false,
      error: "Percentages must sum to 100",
      totalPercentage,
    };
  }
  return { valid: true, totalPercentage };
}
