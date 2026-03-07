/**
 * Parsed will types — structured output from Gemini will analysis.
 * Consumed by the contract generator to build Solidity constructor params.
 */

/** Asset type for on-chain representation */
export type AssetType = "ETH" | "ERC20" | "ERC721" | "OTHER";

/** A single beneficiary extracted from the will */
export interface Beneficiary {
  /** Full legal name of the beneficiary */
  name: string;
  /** Wallet address if explicitly mentioned in the will */
  walletAddress?: string;
  /** Description of the asset being bequeathed */
  assetDescription: string;
  /** On-chain asset classification */
  assetType: AssetType;
  /** Amount or token ID (string to support large numbers / NFT IDs) */
  amount?: string;
}

/** Full structured output from will parsing */
export interface ParsedWill {
  /** Legal name of the testator (will creator) */
  testator_name?: string;
  /** Physical or wallet address of the testator */
  testator_address?: string;
  /** Legal name of the executor */
  executor_name?: string;
  /** Wallet address of the executor */
  executor_address?: string;
  /** List of beneficiaries and their allocations */
  beneficiaries: Beneficiary[];
  /** Conditions that must be met before distribution */
  conditions?: string[];
  /** Any additional instructions from the will */
  additionalInstructions?: string;
}
