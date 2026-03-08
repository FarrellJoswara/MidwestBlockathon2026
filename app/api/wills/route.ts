import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getRoleForWill } from "@/lib/modules/auth";
import { getWillsByWallet } from "@/lib/modules/chain";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";
import type { WillWithRole } from "@/lib/modules/types";

export async function GET(req: NextRequest) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }
  try {
    const wills = await getWillsByWallet(wallet);
    const withRole: WillWithRole[] = wills.map((w) => ({
      ...w,
      role: getRoleForWill(w, wallet),
    }));
    return NextResponse.json(withRole);
  } catch (err) {
    return handleApiError(err, "wills/list");
  }
}
