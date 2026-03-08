/**
 * Will parsing pipeline — end-to-end: CID → fetch → decrypt → parse → structured data.
 *
 * Usage:
 *   // From IPFS (unencrypted PDF):
 *   import { parseWillFromCID } from "@/lib/modules/contract-parser/pipeline/parseWillFromCID";
 *   const will = await parseWillFromCID("QmSomeCID...");
 *
 *   // From IPFS (encrypted PDF — pass the IV stored alongside the CID):
 *   const will = await parseWillFromCID("QmSomeCID...", ivBase64);
 *
 *   // From a local Buffer (skips IPFS entirely):
 *   import { parseWillFromBuffer } from "@/lib/modules/contract-parser/pipeline/parseWillFromCID";
 *   const will = await parseWillFromBuffer(fs.readFileSync("test_will.pdf"));
 *
 * Flow:
 *   CID + optional IV
 *    ↓  fetchPdfFromIPFS
 *   Raw Buffer (possibly encrypted)
 *    ↓  decryptBuffer (if IV provided)
 *   PDF Buffer
 *    ↓  parseWillWithGemini (pdf-parse → Gemini → validate)
 *   ParsedWill
 */

import { fetchPdfFromIPFS } from "../services/ipfsFetcher";
import { parseWillWithGemini } from "../services/willParser";
import { decryptBuffer } from "../../crypto/index";
import type { ParsedWill } from "../types/will";

/**
 * Orchestrate the full will-parsing pipeline from an IPFS CID.
 *
 * @param cid     - IPFS content identifier for the uploaded will PDF.
 * @param ivBase64 - Optional. If the file was encrypted before upload, pass the
 *                   base64-encoded IV (stored in the Will record as `encrypted_doc_key_iv`).
 *                   When provided the buffer is decrypted before PDF parsing.
 * @returns Structured, typed will data ready for the contract generator.
 */
export async function parseWillFromCID(
  cid: string,
  ivBase64?: string | null,
): Promise<ParsedWill> {
  console.log(`[pipeline] Starting will parse for CID: ${cid}`);

  // 1. Fetch the raw bytes from IPFS (Pinata gateway)
  let buffer = await fetchPdfFromIPFS(cid);

  // 2. Decrypt if the file was encrypted before upload
  if (ivBase64) {
    console.log("[pipeline] IV provided — decrypting buffer...");
    buffer = decryptBuffer(buffer, ivBase64);
  }

  // 3. Extract text, send to Gemini, validate, and return
  const parsedWill = await parseWillWithGemini(buffer);

  console.log("[pipeline] Will parsing complete.");
  return parsedWill;
}

/**
 * Parse a will from a raw PDF Buffer (skips IPFS fetch entirely).
 * Useful for local testing, file uploads, etc.
 *
 * @param pdfBuffer - Raw PDF bytes.
 * @returns Structured, typed will data.
 */
export async function parseWillFromBuffer(
  pdfBuffer: Buffer,
): Promise<ParsedWill> {
  console.log("[pipeline] Parsing will from local buffer...");
  const parsedWill = await parseWillWithGemini(pdfBuffer);
  console.log("[pipeline] Will parsing complete.");
  return parsedWill;
}

