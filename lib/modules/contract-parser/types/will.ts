/**
 * Parsed will types — structured output from Gemini will analysis.
 *
 * Wallet addresses are NOT extracted from the PDF — they don't exist there.
 * Instead each party gets a `placeholderId` (derived from their name) that
 * the next pipeline stage will resolve into a real wallet address.
 */

/**
 * Asset category as extracted from the will.
 * These are real-world asset types — the on-chain representation
 * (stablecoin transfer, court-issued NFT deed, etc.) is determined
 * by a later pipeline stage, not the parser.
 */
export type AssetType = "CASH" | "PROPERTY" | "VEHICLE" | "PERSONAL_ITEM" | "OTHER";

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
  /** Real-world asset classification */
  assetType: AssetType;
  /** Dollar amount, percentage, or descriptive quantity */
  amount?: string;
}

/** Full structured output from will parsing */
export interface ParsedWill {
  /** Concise 1–2 sentence summary of the will */
  description?: string;
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

