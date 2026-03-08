/**
 * Generate Solidity contract source from parser output via Gemini.
 *
 * Inputs:
 *   - generateContractFromParserData(parserOutput): ParserOutput
 *   - testGemini(): none — uses centralized Gemini wrapper
 *
 * Outputs:
 *   - generateContractFromParserData(): GeneratedContract { source, contractName }
 *   - testGemini(): string (model response)
 */

import { callGemini } from "@/lib/gemini";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ParserOutput, GeneratedContract } from "../types";

const GEMINI_MODEL = "gemini-3.5-flash-latest";

/**
 * Test: call Gemini with a simple prompt (for verification only).
 * Returns the model's text response.
 */
export async function testGemini(): Promise<string> {
  return callGemini(GEMINI_MODEL, "");
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
---JSON---
${JSON.stringify(parserOutput, null, 2)}
---END JSON---

Requirements:
- Generate a complete, valid Solidity contract that uses this data.
- Use Solidity 0.8.x.
- The contract should support creator, executor, beneficiaries, and will execution lifecycle.
${buildDeclareDeathRequirements()}
- Return ONLY the Solidity source code.
- No markdown.
- No explanation.
- No markdown code blocks.
- Just the raw .sol file contents.`;

  let raw: string;
  try {
    raw = await callGemini(GEMINI_MODEL, prompt);
  } catch (err) {
    console.error("[generate] Gemini contract generation failed:", err);
    throw err;
  }

  const source = extractSoliditySource(raw);
  validateDeclareDeathSupport(source);
  const contractName = extractContractName(source);

  return { source, contractName };
}

/** Strip markdown code fence if present and return raw Solidity source. */
function extractSoliditySource(raw: string): string {
  const startIdx = raw.indexOf("```solidity");
  if (startIdx !== -1) {
    const endIdx = raw.indexOf("```", startIdx + 11);
    if (endIdx !== -1) {
      return raw.slice(startIdx + 11, endIdx).trim();
    }
  }
  const genericStartIdx = raw.indexOf("```");
  if (genericStartIdx !== -1) {
    const genericEndIdx = raw.indexOf("```", genericStartIdx + 3);
    if (genericEndIdx !== -1) {
      return raw.slice(genericStartIdx + 3, genericEndIdx).trim();
    }
  }
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
    throw new AppError(
      "Generated contract is missing required function: declareDeath(uint256 willId) external",
      ErrorCodes.GEMINI_RESPONSE_INVALID,
      502,
    );
  }

  if (!hasEvent) {
    throw new AppError(
      "Generated contract is missing required DeathDeclared event",
      ErrorCodes.GEMINI_RESPONSE_INVALID,
      502,
    );
  }

  if (!hasStatusKeyword) {
    throw new AppError(
      "Generated contract is missing a recognizable will status system including DeathDeclared",
      ErrorCodes.GEMINI_RESPONSE_INVALID,
      502,
    );
  }
}
