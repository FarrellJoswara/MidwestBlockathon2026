/**
 * Will parsing pipeline — end-to-end: CID → fetch → parse → structured data.
 *
 * Usage:
 *   import { parseWillFromCID } from "@/lib/modules/contract-parser/pipeline/parseWillFromCID";
 *   const will = await parseWillFromCID("QmSomeCID...");
 *
 * Flow:
 *   CID
 *    ↓  fetchPdfFromIPFS
 *   PDF Buffer
 *    ↓  parseWillWithGemini (pdf-parse → Gemini → validate)
 *   ParsedWill
 */

import { fetchPdfFromIPFS } from "../services/ipfsFetcher";
import { parseWillWithGemini } from "../services/willParser";
import type { ParsedWill } from "../types/will";

/**
 * Orchestrate the full will-parsing pipeline.
 *
 * @param cid - IPFS content identifier for the uploaded will PDF.
 * @returns Structured, typed will data ready for the contract generator.
 */
export async function parseWillFromCID(cid: string): Promise<ParsedWill> {
  console.log(`[pipeline] Starting will parse for CID: ${cid}`);

  // 1. Fetch the PDF from IPFS (Pinata gateway)
  const pdfBuffer = await fetchPdfFromIPFS(cid);

  // 2. Extract text, send to Gemini, validate, and return
  const parsedWill = await parseWillWithGemini(pdfBuffer);

  console.log("[pipeline] Will parsing complete.");
  return parsedWill;
}
