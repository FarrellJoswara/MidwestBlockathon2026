import { NextResponse } from "next/server";
import { parseWillFromBuffer } from "@/lib/modules/contract-parser/pipeline/parseWillFromCID";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

/**
 * POST /api/wills/parse
 * Body: multipart/form-data with "file" (PDF).
 * Parses the will document and returns structured data (beneficiaries, assets, etc.).
 * Used by the create-will page to show Beneficiaries & Assets only after analysis.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse(
        "Missing or invalid file. Send multipart/form-data with 'file' (PDF).",
        ErrorCodes.VALIDATION_ERROR,
        400,
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseWillFromBuffer(buffer);
    return NextResponse.json(parsed);
  } catch (err) {
    return handleApiError(err, "wills/parse");
  }
}
