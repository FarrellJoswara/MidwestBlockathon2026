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
- CRITICAL: When execute() is called, transfer each asset FROM the executor's wallet TO the designated beneficiary. For NFTs use IERC721(nftContract).safeTransferFrom(executor, beneficiary, tokenId). The executor is the address stored in the contract (executor_address from JSON). The executor must have approved this contract (or the caller) to transfer their NFTs before execute() is called.
- The contract MAY also include declareDeath(uint256 willId) for compatibility, but the main entry point for "death trigger" is execute() — when called, it performs all transfers and marks the will as executed. If you have only one will per contract, execute() can take no arguments.
- CRITICAL: Output exactly ONE contract. Do not create multiple contracts, helper contracts, or interfaces. The single contract must define "function execute() external" (with exactly that name — not run(), not distribute(), not executeDistribution()) and perform all transfer logic inside that same contract. Do not call execute() from another contract or from a different contract in the same file.
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

/** Infer contract name: use the contract that defines execute(), or the first contract. */
export function extractContractName(source: string): string {
  // Prefer the contract that contains "function execute()" so we compile the right one when there are multiple.
  const contractBlocks = source.matchAll(/contract\s+(\w+)\s*\{/g);
  for (const m of contractBlocks) {
    const name = m[1];
    const start = m.index!;
    const braceStart = source.indexOf("{", start);
    let depth = 1;
    let i = braceStart + 1;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    const block = source.slice(start, i);
    if (/function\s+execute\s*\(\s*\)\s*(?:external|public)/.test(block)) return name;
  }
  // Fallback: first contract in file
  const first = source.match(/contract\s+(\w+)\s*\{/);
  return first ? first[1] : "GeneratedContract";
}

/**
 * If the source has multiple contracts, return source containing only the contract that defines execute().
 * This avoids "Undeclared identifier: execute" when one contract calls execute() and another defines it.
 */
export function normalizeToSingleContractWithExecute(source: string): string {
  const contractRegex = /contract\s+(\w+)\s*\{/g;
  const contracts: { name: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = contractRegex.exec(source)) !== null) {
    const name = m[1];
    const start = m.index;
    const braceStart = source.indexOf("{", start);
    let depth = 1;
    let i = braceStart + 1;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    contracts.push({ name, start, end: i });
  }
  if (contracts.length <= 1) return source;
  const withExecute = contracts.find((c) => {
    const block = source.slice(c.start, c.end);
    return /function\s+execute\s*\(\s*\)\s*(?:external|public)/.test(block);
  });
  if (!withExecute) return source;
  const pragmaMatch = source.match(/pragma\s+solidity[^;]+;/);
  const pragma = pragmaMatch ? pragmaMatch[0] + "\n\n" : "";
  return pragma + source.slice(withExecute.start, withExecute.end);
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
