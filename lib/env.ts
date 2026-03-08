/**
 * Centralized environment variable validation.
 *
 * Import this module on the server side to get validated, typed env vars.
 * Throws a clear, actionable error during startup if required vars are missing.
 *
 * Usage:
 *   import { getGeminiApiKey } from "@/lib/env";
 *   const key = getGeminiApiKey(); // throws AppError if missing
 */

import { AppError, ErrorCodes } from "./errors";

// ── Gemini API Key ───────────────────────────────────────────────────────────

/**
 * Returns the Gemini API key from environment variables.
 *
 * Checks both `GEMINI_API_KEY` and `GOOGLE_API_KEY` (in that order).
 * Throws a clear, actionable AppError if neither is set.
 *
 * **Never logs or exposes the actual key.**
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!key || key.trim().length === 0) {
    throw new AppError(
      "Gemini API key not configured.\n\n" +
        "This application requires GEMINI_API_KEY to call the Gemini API.\n\n" +
        "Fix:\n" +
        "  1. Add GEMINI_API_KEY to your .env.local file\n" +
        "  2. Restart the server\n\n" +
        "Example:\n" +
        "  GEMINI_API_KEY=your_key_here",
      ErrorCodes.MISSING_GEMINI_KEY,
      503,
    );
  }

  return key;
}
