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

const GEMINI_MODEL = "gemini-2.5-flash-lite";

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
    contents: "",
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
  const prompt = `You are a Solidity contract generator. Use the following JSON data to generate a valid Solidity smart contract for a will/estate system.

  Data (JSON):
\`\`\`json
${JSON.stringify(parserOutput, null, 2)}
\`\`\`

Requirements:
- Generate a complete, valid Solidity contract that uses this data.
- Use Solidity 0.8.x.
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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  const raw = response.text?.trim() ?? "";
  if (!raw) {
    throw new Error("Gemini returned empty response");
  }

  const source = extractSoliditySource(raw);
  validateDeclareDeathSupport(source);
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

/** Validate that the generated source includes required declareDeath support. */
function validateDeclareDeathSupport(source: string): void {
  const hasFunction = /function\s+declareDeath\s*\(\s*uint256\s+\w+\s*\)\s+external/.test(source);
  const hasEvent = /event\s+DeathDeclared\s*\(/.test(source);
  const hasStatusKeyword =
    /DeathDeclared/.test(source) &&
    /(enum\s+\w+\s*\{[\s\S]*Active[\s\S]*DeathDeclared[\s\S]*Executed[\s\S]*\})|status/.test(source);

  if (!hasFunction) {
    throw new Error("Generated contract is missing required function: declareDeath(uint256 willId) external");
  }

  if (!hasEvent) {
    throw new Error("Generated contract is missing required DeathDeclared event");
  }

  if (!hasStatusKeyword) {
    throw new Error("Generated contract is missing a recognizable will status system including DeathDeclared");
  }
}
