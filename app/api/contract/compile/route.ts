import { NextResponse } from "next/server";
import { compileContract } from "@/lib/modules/contract-generator/pipeline/compile";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { AppError, ErrorCodes } from "@/lib/errors";

/**
 * POST /api/contract/compile — compile Solidity source to bytecode + ABI for client-side deploy.
 * Body: { source: string, contractName?: string }
 * Returns: { bytecode, abi, contractName } for use with walletClient.deployContract().
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source, contractName: name } = body as { source?: string; contractName?: string };
    if (!source || typeof source !== "string") {
      return errorResponse(
        "Missing or invalid body: { source: string, contractName?: string }",
        ErrorCodes.VALIDATION_ERROR,
        400,
      );
    }
    const contractName = name ?? (source.match(/contract\s+(\w+)\s*\{/)?.[1] ?? "Contract");
    const compiled = await compileContract({ source, contractName });
    return NextResponse.json({
      bytecode: compiled.bytecode,
      abi: compiled.abi,
      contractName: compiled.contractName,
    });
  } catch (err) {
    // Wrap compilation errors with a friendly code
    if (err instanceof Error && !(err instanceof AppError)) {
      const compileErr = new AppError(
        "Contract compilation failed. Check your Solidity source for errors.",
        ErrorCodes.COMPILATION_FAILED,
        400,
      );
      console.error("[contract/compile]", err);
      return NextResponse.json(
        { error: { message: compileErr.message, code: compileErr.code } },
        { status: compileErr.status },
      );
    }
    return handleApiError(err, "contract/compile");
  }
}
