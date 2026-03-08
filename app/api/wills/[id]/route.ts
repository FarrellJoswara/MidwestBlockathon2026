import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

export async function GET(
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
  if (!result) {
    return errorResponse(
      "Will not found or access denied",
      ErrorCodes.NOT_FOUND,
      404,
    );
  }
  return NextResponse.json(result);
}
