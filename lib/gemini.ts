/**
 * Centralized Gemini API wrapper.
 *
 * All Gemini requests should go through this module so that errors are
 * classified consistently and never leak raw stack traces to the client.
 *
 * Usage:
 *   import { callGemini, getGeminiClient } from "@/lib/gemini";
 *
 *   // Simple: get text response
 *   const text = await callGemini("gemini-2.5-flash-lite", "Hello!");
 *
 *   // Advanced: use client directly
 *   const ai = getGeminiClient();
 */

import { GoogleGenAI } from "@google/genai";
import { AppError, ErrorCodes } from "./errors";
import { getGeminiApiKey } from "./env";

// ── Client Factory ───────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null;

/**
 * Returns a lazily-initialized GoogleGenAI client.
 * Throws AppError(MISSING_GEMINI_KEY) if the key is not configured.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = getGeminiApiKey();
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// ── Error Classifier ─────────────────────────────────────────────────────────

/**
 * Classify a raw Gemini/network error into a structured AppError.
 *
 * Detection heuristics (based on Google API error patterns):
 *   - 401/403 or "API key" in message → auth failure
 *   - 429 or "quota" / "rate" in message → rate limit
 *   - Network errors (fetch failed, ECONNREFUSED, etc.) → network error
 *   - Everything else → generic Gemini request failure
 */
export function classifyGeminiError(err: unknown): AppError {
  const message =
    err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  // Authentication / invalid key
  if (
    lower.includes("api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission denied") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("invalid authentication") ||
    lower.includes("unauthenticated")
  ) {
    return new AppError(
      "Gemini API authentication failed.\n\n" +
        "Your GEMINI_API_KEY appears invalid or expired.\n" +
        "Generate a new key in Google AI Studio.",
      ErrorCodes.GEMINI_AUTH_FAILED,
      502,
    );
  }

  // Rate limiting
  if (
    lower.includes("429") ||
    lower.includes("rate") ||
    lower.includes("quota") ||
    lower.includes("resource exhausted")
  ) {
    return new AppError(
      "Gemini API rate limit reached.\nPlease wait before retrying.",
      ErrorCodes.GEMINI_RATE_LIMIT,
      429,
    );
  }

  // Network failures
  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("socket")
  ) {
    return new AppError(
      "Failed to reach Gemini API.\nCheck your internet connection or API configuration.",
      ErrorCodes.GEMINI_NETWORK_ERROR,
      502,
    );
  }

  // Fallback: generic Gemini request failure
  return new AppError(
    "Failed to process request with Gemini.",
    ErrorCodes.GEMINI_REQUEST_FAILED,
    502,
  );
}

// ── Request Wrapper ──────────────────────────────────────────────────────────

/**
 * Call the Gemini API and return the text response.
 *
 * Handles all error classification internally. Callers receive either
 * a clean text response or a classified AppError.
 *
 * @param model    - Gemini model name (e.g. "gemini-2.5-flash-lite").
 * @param contents - Prompt string or structured content.
 * @returns The text response from the model.
 * @throws {AppError} with classified error code on any failure.
 */
export async function callGemini(
  model: string,
  contents: string,
): Promise<string> {
  const ai = getGeminiClient();

  let result;
  try {
    result = await ai.models.generateContent({ model, contents });
  } catch (err) {
    console.error("[gemini] Gemini API request failed:", err);
    throw classifyGeminiError(err);
  }

  const text = result.text?.trim() ?? "";

  if (!text) {
    throw new AppError(
      "Gemini API returned an unexpected response format.\n" +
        "This may indicate an upstream API change.",
      ErrorCodes.GEMINI_RESPONSE_INVALID,
      502,
    );
  }

  return text;
}
