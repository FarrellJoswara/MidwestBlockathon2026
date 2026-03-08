/**
 * Contract parser module — parses a PDF will/contract into structured data.
 * Output can feed the UI (pre-fill params) and the contract generator.
 *
 * Exports:
 *   - parseContract()       — legacy stub for quick form pre-fill
 *   - parseWillFromCID()    — full pipeline: CID → IPFS → Gemini → ParsedWill
 *   - parseWillWithGemini() — parse a Buffer directly (skip IPFS fetch)
 *   - fetchPdfFromIPFS()    — download a PDF by CID
 *   - Types: ParsedWill, Beneficiary, AssetType, ParsedContract
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type { ParsedWill, Beneficiary, AssetType } from "./types/will";

// ── Services ──────────────────────────────────────────────────────────────────
export { fetchPdfFromIPFS } from "./services/ipfsFetcher";
export { parseWillWithGemini } from "./services/willParser";

// ── Pipeline ──────────────────────────────────────────────────────────────────
export { parseWillFromCID, parseWillFromBuffer } from "./pipeline/parseWillFromCID";

// ── Legacy stub (kept for backward compat) ────────────────────────────────────

export interface ParsedContract {
  valid: boolean;
  creator_wallet?: string;
  executor_wallet?: string;
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
}

export async function parseContract(
  pdfFile: File | null | undefined
): Promise<ParsedContract | null> {
  if (!pdfFile) return null;
  // TODO: migrate callers to parseWillFromCID / parseWillWithGemini
  return null;
}
