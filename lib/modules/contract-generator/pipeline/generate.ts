/**
 * Generate Solidity contract source from parser output via Gemini (or template).
 * Foundation only — implement Gemini API call and prompt to produce contract source.
 *
 * Inputs:
 *   - generateContractFromParserData(parserOutput): ParserOutput (raw/semi-structured from parser)
 *   - testGemini(): none (uses env GOOGLE_API_KEY or GEMINI_API_KEY)
 *
 * Outputs:
 *   - generateContractFromParserData(): GeneratedContract { source, contractName }
 *   - testGemini(): string (model response)
 */

import { GoogleGenAI } from "@google/genai";
import type { ParserOutput, GeneratedContract } from "../types";

const GEMINI_MODEL = "gemini-2.5-flash";

/** Prompt instructions so Gemini produces consistent .sol from the ParserOutput schema. */
const CONTRACT_GENERATION_SYSTEM = `You generate exactly one Solidity smart contract from a JSON input that follows this schema:

INPUT SCHEMA (use these exact field names when reading the JSON):
- testator_name: string | null — person who created the will
- testator_address: string | null — physical or wallet address of testator
- executor_name: string | null — person responsible for execution
- executor_address: string | null — executor's wallet address if present
- beneficiaries: array of { name, walletAddress }
  - name: string — label (e.g. "Me", "My brother") for display
  - walletAddress: string | null — beneficiary's wallet (0x...); use address(0) if null
- assets: array of { assetDescription, beneficiaryWallet, nftContractAddress, nftTokenId }
  - The will document only lists real-world assets (e.g. "the house", "the car"). The NFT assignment is done in the app: each asset gets an assigned NFT (contract + token ID) that represents it.
  - assetDescription: string — asset as on the will (IRL description only)
  - beneficiaryWallet: string | null — wallet that receives this asset
  - nftContractAddress: string | null — ERC-721 contract address assigned to this asset (not on the will; assigned in the app)
  - nftTokenId: string | null — token ID of that NFT
- conditions: array of strings — conditions for distribution
- additionalInstructions: string | null — supplementary instructions

REQUIRED SOLIDITY STRUCTURE (follow this for consistent output):
1. SPDX license and pragma solidity ^0.8.0 (or 0.8.x).
2. Define a struct Beneficiary with: name (string), walletAddress (address). Use address(0) for null wallet.
3. Define a struct Asset with: assetDescription (string), beneficiaryWallet (address), nftContractAddress (address), nftTokenId (uint256). These represent "transfer this NFT to this beneficiary" for execution.
4. Single contract named "WillContract" (or "EstateContract") containing:
   - State variables: testator name/address, executor name/address, Beneficiary[] beneficiaries, Asset[] assets, conditions (string array), additionalInstructions (string).
   - Constructor that takes the JSON-derived values and sets all state (treat null strings as ""; null addresses as address(0); null nftTokenId as 0).
   - Optionally: view functions that return beneficiary count, asset count, or conditions so the contract is usable.
5. Use no external imports (no ERC20/ERC721 imports)—prefer a self-contained contract that stores the will data, beneficiary addresses, and per-asset NFT contract + token ID for later execution (e.g. executor transfers each NFT to the assigned beneficiary).
6. Output ONLY the raw Solidity source. No markdown, no \`\`\`solidity fences, no explanation before or after—just the .sol file contents.`;

const OUTPUT_INSTRUCTION = `
Return ONLY the raw Solidity source code: no markdown code block, no explanation. First character of your response must be "/" (SPDX) or "p" (pragma).`;

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
});

/**
 * Test: call Gemini with a simple prompt (for verification only).
 * Returns the model's text response.
 */
export async function testGemini(): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: "Reply with exactly: OK",
  });
  return response.text ?? "";
}

/**
 * Takes raw/semi-structured parser output and returns generated Solidity source.
 * Sends parserOutput to Gemini with instructions; parses response into source + contract name.
 */
export async function generateContractFromParserData(
  parserOutput: ParserOutput
): Promise<GeneratedContract> {
  const dataJson = JSON.stringify(parserOutput, null, 2);

  const prompt = `${CONTRACT_GENERATION_SYSTEM}

INPUT DATA (JSON matching the schema above):
\`\`\`json
${dataJson}
\`\`\`
${OUTPUT_INSTRUCTION}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  const raw = response.text?.trim() ?? "";
  if (!raw) {
    throw new Error("Gemini returned empty response");
  }

  const source = extractSoliditySource(raw);
  const contractName = extractContractName(source);

  return { source, contractName };
}

/** Strip markdown code fence if present and return raw Solidity source. */
function extractSoliditySource(raw: string): string {
  const fenceMatch = raw.match(/```(?:solidity)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return raw.trim();
}

/** Infer contract name from first "contract Name {" in source. */
function extractContractName(source: string): string {
  const match = source.match(/contract\s+(\w+)\s*\{/);
  return match ? match[1] : "GeneratedContract";
}


