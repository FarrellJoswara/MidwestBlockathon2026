/**
 * Parsed will types — structured output from Gemini will analysis.
 *
 * Wallet addresses are NOT extracted from the PDF — they don't exist there.
 * Instead each party gets a `placeholderId` (derived from their name) that
 * the next pipeline stage will resolve into a real wallet address.
 */

/** Asset type for on-chain representation */
export type AssetType = "ETH" | "ERC20" | "ERC721" | "OTHER";

/** A single beneficiary extracted from the will */
export interface Beneficiary {
  /** Full legal name of the beneficiary */
  name: string;
  /**
   * Stable placeholder derived from the name (e.g. "alice_johnson").
   * The address-resolution stage replaces this with a real wallet address.
   */
  placeholderId: string;
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
  /** Placeholder for the testator's wallet — resolved downstream */
  testator_placeholderId?: string;
  /** Legal name of the executor */
  executor_name?: string;
  /** Placeholder for the executor's wallet — resolved downstream */
  executor_placeholderId?: string;
  /** List of beneficiaries and their allocations */
  beneficiaries: Beneficiary[];
  /** Conditions that must be met before distribution */
  conditions?: string[];
  /** Any additional instructions from the will */
  additionalInstructions?: string;
}

