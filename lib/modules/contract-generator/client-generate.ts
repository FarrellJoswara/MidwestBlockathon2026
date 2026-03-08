/**
 * Client-side contract generation: call Gemini from the browser using NEXT_PUBLIC_* key.
 * Used by the create-will page so Step 3 can run generate without a server POST.
 * Compile still runs on the server via /api/contract/compile.
 */

import type { ParserOutput, GeneratedContract } from "./types";
import {
  buildGeneratePrompt,
  extractSoliditySource,
  extractContractName,
  validateDeclareDeathSupport,
} from "./pipeline/prompt-and-parse";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

/**
 * Generate Solidity source from parser output by calling Gemini from the browser.
 * Requires NEXT_PUBLIC_GEMINI_API_KEY (or NEXT_PUBLIC_GOOGLE_API_KEY) — key is exposed to client (demo use).
 */
export async function generateContractFromParserDataClient(
  parserOutput: ParserOutput
): Promise<GeneratedContract> {
  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_GEMINI_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY. Add it to .env.local for client-side generate (demo)."
    );
  }

  const prompt = buildGeneratePrompt(parserOutput);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const message = err?.error?.message ?? res.statusText;
    throw new Error(`Gemini API error: ${message}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const parts = data.candidates?.[0]?.content?.parts;
  const raw = parts?.map((p) => p.text).filter(Boolean).join("")?.trim() ?? "";
  if (!raw) {
    const blockReason = data.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the response (${blockReason}). Try simplifying the will data.`
        : "Gemini returned empty response. Check your API key and try again."
    );
  }

  const source = extractSoliditySource(raw);
  validateDeclareDeathSupport(source);
  const contractName = extractContractName(source);

  return { source, contractName };
}
