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
  const prompt = `You are a Solidity contract generator. Use the following JSON data to generate a valid Solidity smart contract (e.g. a will/estate contract with creator and beneficiaries).

Data (JSON):
\`\`\`json
${JSON.stringify(parserOutput, null, 2)}
\`\`\`

Requirements:
- Generate a complete, valid Solidity contract that uses this data (creator, beneficiaries, etc.).
- Use Solidity 0.8.x.
- Return ONLY the Solidity source code. No markdown, no explanation, no \`\`\`solidity wrapper—just the raw .sol file contents.`;

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


