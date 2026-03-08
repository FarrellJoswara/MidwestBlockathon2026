/**
 * Shared prompt building and response parsing for contract generation.
 * No Node-only or server-only imports — safe to use from browser (client-generate.ts)
 * and server (generate.ts).
 */

import type { ParserOutput } from "../types";

/** Build the full prompt sent to Gemini for contract generation. */
export function buildGeneratePrompt(parserOutput: ParserOutput): string {
  return `You are a Solidity contract generator. Use the following JSON data to generate a valid Solidity smart contract for a will/estate system.

  Data (JSON):
\`\`\`json
${JSON.stringify(parserOutput, null, 2)}
\`\`\`

Requirements:
- Keep it STUPID simple. No security or access control — demo only.
- Generate a complete, valid Solidity contract that uses this data.
- Use Solidity 0.8.20.
- Store: executor, beneficiary addresses, and assets (what goes to whom). Nothing more than needed.
- The contract MUST use the exact beneficiary addresses from the "beneficiaries" array (walletAddress for each) and their allocation amounts/percentages. Do not substitute or invent addresses.
- The contract MUST use the "assets" array: each asset's beneficiaryWallet, nftContractAddress, and nftTokenId — who gets which asset.
- The testator_address and executor_address from the JSON are the creator and executor; store them. No permission checks anywhere.
${buildDeclareDeathRequirements()}
- Return ONLY the Solidity source code.
- No markdown. No explanation. No \`\`\`solidity wrapper. Just the raw .sol file contents.`;
}

/** Build the declare-death requirements block for the Gemini prompt. */
function buildDeclareDeathRequirements(): string {
  return `
Execution (keep it STUPID simple — no security, no access control):
- The contract MUST store: executor address, beneficiary addresses, and assets (e.g. NFT contract + tokenId per asset, and which beneficiary gets what).
- The contract MUST expose a function with exactly this signature:
  function execute() external
- The execute() function MUST transfer assets to the beneficiaries (e.g. NFT safeTransferFrom to the right beneficiary). Anyone can call execute() — no checks on msg.sender. This is for demo only.
- The contract MAY also include declareDeath(uint256 willId) for compatibility, but the main entry point for "death trigger" is execute() — when called, it performs all transfers and marks the will as executed. If you have only one will per contract, execute() can take no arguments.
- Do not add any permission checks (no "only executor", no "only beneficiary"). Keep the contract minimal: store executor, beneficiaries, assets; execute() does the transfers. That's it.
- The generated contract MUST compile as valid Solidity 0.8.x.
`;
}

/** Strip markdown code fence if present and return raw Solidity source. */
export function extractSoliditySource(raw: string): string {
  const fenceMatch = raw.match(/```(?:solidity)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return raw.trim();
}

/** Infer contract name from first "contract Name {" in source. */
export function extractContractName(source: string): string {
  const match = source.match(/contract\s+(\w+)\s*\{/);
  return match ? match[1] : "GeneratedContract";
}

/** Validate that the generated source includes required execute() for transfers. */
export function validateDeclareDeathSupport(source: string): void {
  const hasExecute =
    /function\s+execute\s*\(\s*\)\s*(?:external|public)/.test(source);
  if (!hasExecute) {
    throw new Error(
      "Generated contract is missing required function: execute() external or public. " +
        "The contract must transfer assets to beneficiaries when execute() is called."
    );
  }
}
