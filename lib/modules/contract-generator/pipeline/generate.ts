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
import {
  buildGeneratePrompt,
  extractSoliditySource,
  extractContractName,
  validateDeclareDeathSupport,
  normalizeToSingleContractWithExecute,
} from "./prompt-and-parse";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

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
  const prompt = buildGeneratePrompt(parserOutput);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  let raw = (response as { text?: string }).text?.trim() ?? "";
  if (!raw && Array.isArray((response as { candidates?: unknown[] }).candidates)) {
    const c = (response as { candidates: { content?: { parts?: { text?: string }[] } }[] }).candidates[0];
    raw = c?.content?.parts?.map((p) => p.text).filter(Boolean).join("")?.trim() ?? "";
  }
  if (!raw) {
    const blockReason = (response as { promptFeedback?: { blockReason?: string } }).promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the response (${blockReason}). Try simplifying the will data.`
        : "Gemini returned empty response. Check your GEMINI_API_KEY and try again."
    );
  }

  const source = extractSoliditySource(raw);
  validateDeclareDeathSupport(source);
  const normalizedSource = normalizeToSingleContractWithExecute(source);
  const contractName = extractContractName(normalizedSource);

  return { source: normalizedSource, contractName };
}
