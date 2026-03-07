import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing or invalid x-wallet-address header" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const result = await getWillWithRole(id, wallet);
  if (!result) {
    return NextResponse.json({ error: "Will not found or access denied" }, { status: 404 });
  }
  return NextResponse.json(result);
}
