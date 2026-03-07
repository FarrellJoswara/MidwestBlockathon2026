/**
 * Contract parser module — parses a PDF will/contract into structured data.
 * Output can feed the UI (pre-fill params) and the contract generator.
 * Use: import { parseContract } from "@/lib/modules/contract-parser";
 */

export interface ParsedContract {
  valid: boolean;
  /** Extracted creator/executor/beneficiary addresses if present */
  creator_wallet?: string;
  executor_wallet?: string;
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
}

/**
 * Parse a PDF file into structured contract data.
 * Implement parsing (e.g. PDF text extraction) and return fields that match WillFormParams / contract.
 */
export async function parseContract(
  pdfFile: File | null | undefined
): Promise<ParsedContract | null> {
  if (!pdfFile) return null;
  // TODO: add PDF parsing (e.g. pdf-parse, pdfjs) and extract parties / percentages
  return null;
}
