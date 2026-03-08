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
- Generate a complete, valid Solidity contract that uses this data.
- Use Solidity 0.8.20.
- The contract MUST use the exact beneficiary addresses from the "beneficiaries" array (walletAddress for each) and their allocation amounts/percentages. Do not substitute or invent addresses.
- The contract MUST use the "assets" array: each asset's description, beneficiaryWallet, nftContractAddress, and nftTokenId must be reflected in the contract (e.g. mapping or struct fields).
- The testator_address and executor_address from the JSON must be the creator and executor in the contract.
- The contract should support creator, executor, beneficiaries, and will execution lifecycle.
${buildDeclareDeathRequirements()}
- Return ONLY the Solidity source code.
- No markdown.
- No explanation.
- No \`\`\`solidity wrapper.
- Just the raw .sol file contents.`;
}

/** Build the declare-death requirements block for the Gemini prompt. */
function buildDeclareDeathRequirements(): string {
  return `
Declare-death requirements:
- The contract MUST include a function with exactly this signature:
  function declareDeath(uint256 willId) external
- The contract MUST include a status system for each will, with at least:
  Active = 0
  DeathDeclared = 1
  Executed = 2
- The contract MUST store an executor address for each will.
- The declareDeath(uint256 willId) function MUST:
  - revert if the will does not exist
  - revert if msg.sender is not the executor for that will
  - revert if the will is not currently Active
  - set the will status to DeathDeclared
  - emit an event when successful
- The contract MUST include an event with this shape or equivalent:
  event DeathDeclared(uint256 indexed willId, address indexed executor, uint256 timestamp);
- The contract should be compatible with a frontend that calls:
  declareDeath(BigInt(will.id))
- If the contract manages a single will instead of many wills, it should still expose:
  function declareDeath(uint256 willId) external
  and use the willId parameter meaningfully or validate it.
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

/** Validate that the generated source includes required declareDeath support. */
export function validateDeclareDeathSupport(source: string): void {
  // Allow external or public (both can be called from frontend)
  const hasFunction =
    /function\s+declareDeath\s*\(\s*uint256\s+\w+\s*\)\s+(?:external|public)/.test(source);
  const hasEvent = /event\s+DeathDeclared\s*\(/.test(source);
  // Require DeathDeclared and either an enum with status-like values or the word "status"
  const hasStatusKeyword =
    /DeathDeclared/.test(source) &&
    (/(enum\s+\w+\s*\{[\s\S]*?DeathDeclared[\s\S]*?\})/.test(source) ||
      /\bstatus\b/.test(source));

  if (!hasFunction) {
    throw new Error(
      "Generated contract is missing required function: declareDeath(uint256 willId) external or public. " +
        "Try again or simplify the will data."
    );
  }

  if (!hasEvent) {
    throw new Error(
      "Generated contract is missing required DeathDeclared event. Try again."
    );
  }

  if (!hasStatusKeyword) {
    throw new Error(
      "Generated contract is missing a will status system (enum or status with DeathDeclared). Try again."
    );
  }
}
