/**
 * Registry for mapping will/document id → deployed contract address.
 * Foundation only — implement with on-chain registry contract or app storage.
 */

/**
 * Record a deployed contract address for a given will/document id.
 * Implementation: persist to DB, or call an on-chain WillContractRegistry contract.
 */
export async function recordDeployedWill(
  _willId: string,
  _contractAddress: string
): Promise<void> {
  // TODO: store willId -> contractAddress (e.g. API route + DB, or on-chain registry).
  throw new Error("Not implemented: recordDeployedWill");
}

/**
 * Get the deployed contract address for a will/document id.
 * Implementation: read from same store as recordDeployedWill.
 */
export async function getDeployedContractAddress(
  _willId: string
): Promise<string | null> {
  // TODO: return stored contract address for willId, or null if not found.
  throw new Error("Not implemented: getDeployedContractAddress");
}
