import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }

  const { id } = await params;
  const result = await getWillWithRole(id, wallet);

  if (!result || result.role !== "executor") {
    return errorResponse(
      "Only executor can declare death",
      ErrorCodes.FORBIDDEN,
      403,
    );
  }

  if (result.will.status !== "death_declared") {
    return errorResponse(
      "Will is not marked death_declared on-chain yet. Declare death from the wallet first.",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }

  let body: { txHash?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  return NextResponse.json({
    ok: true,
    txHash: body.txHash ?? null,
    will: result.will,
  });
}