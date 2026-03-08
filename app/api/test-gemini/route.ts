import { NextResponse } from "next/server";
import { testGemini } from "@/lib/modules/contract-generator/pipeline/generate";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";
import { getGeminiApiKey } from "@/lib/env";

/**
 * GET /api/test-gemini — runs testGemini() to verify Gemini API key and model.
 */
export async function GET() {
  try {
    // Validate key exists before attempting call
    getGeminiApiKey();
  } catch (err) {
    return handleApiError(err, "test-gemini");
  }

  try {
    const text = await testGemini();
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    return handleApiError(err, "test-gemini");
  }
}
