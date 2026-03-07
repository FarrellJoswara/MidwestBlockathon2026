import { NextResponse } from "next/server";
import { testGemini } from "@/lib/modules/contract-generator/pipeline/generate";

/**
 * GET /api/test-gemini — runs testGemini() to verify Gemini API key and model.
 */
export async function GET() {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY or GOOGLE_API_KEY not set" },
      { status: 503 }
    );
  }
  try {
    const text = await testGemini();
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("testGemini error", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
