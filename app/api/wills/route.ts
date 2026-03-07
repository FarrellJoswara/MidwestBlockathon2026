import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getRoleForWill } from "@/lib/modules/auth";
import { getWillsByWallet } from "@/lib/modules/chain";
import type { WillWithRole } from "@/lib/modules/types";

export async function GET(req: NextRequest) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing or invalid x-wallet-address header" },
      { status: 401 }
    );
  }
  try {
    const wills = await getWillsByWallet(wallet);
    const withRole: WillWithRole[] = wills.map((w) => ({
      ...w,
      role: getRoleForWill(w, wallet),
    }));
    return NextResponse.json(withRole);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch wills" },
      { status: 500 }
    );
  }
}
