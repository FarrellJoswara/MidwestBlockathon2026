import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";

export async function POST(
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

  if (!result || result.role !== "executor") {
    return NextResponse.json(
      { error: "Only executor can declare death" },
      { status: 403 }
    );
  }

  if (result.will.status !== "death_declared") {
    return NextResponse.json(
      {
        error:
          "Will is not marked death_declared on-chain yet. Declare death from the wallet first.",
      },
      { status: 400 }
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