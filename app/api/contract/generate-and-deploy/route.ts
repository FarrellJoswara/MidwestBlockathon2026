import { NextResponse } from "next/server";
import { generateAndDeployContract } from "@/lib/modules/contract-generator/pipeline";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";
import type { ParserOutput } from "@/lib/modules/contract-generator/types";

/**
 * POST /api/contract/generate-and-deploy
 * Body: ParserOutput (JSON)
 * Runs full pipeline: generate (Gemini) → compile (solc) → deploy (viem).
 * Returns: { contractAddress, transactionHash, contractName }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ParserOutput;
    if (!body || typeof body !== "object") {
      return errorResponse(
        "Missing or invalid body: ParserOutput (JSON)",
        ErrorCodes.VALIDATION_ERROR,
        400,
      );
    }
    const result = await generateAndDeployContract(body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, "contract/generate-and-deploy");
  }
}
