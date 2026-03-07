/**
 * UI module — will form parameters and validation.
 * Used by the create/edit will flows; params align with the generated contract (WillRegistry).
 */

export interface WillFormParams {
  creator_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
}

export interface WillFormValidation {
  valid: boolean;
  error?: string;
  totalPercentage: number;
}

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function validateWillFormParams(params: WillFormParams): WillFormValidation {
  const { creator_wallet, beneficiary_wallets, beneficiary_percentages } = params;
  const wallets = beneficiary_wallets.filter((w) => w.trim().length > 0);
  const pcts = beneficiary_percentages.slice(0, wallets.length);
  const totalPercentage = pcts.reduce((s, p) => s + p, 0);

  if (!creator_wallet?.trim()) {
    return { valid: false, error: "Creator wallet is required", totalPercentage };
  }
  if (!WALLET_REGEX.test(creator_wallet.trim())) {
    return { valid: false, error: "Creator wallet must be a valid 0x address", totalPercentage };
  }
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
