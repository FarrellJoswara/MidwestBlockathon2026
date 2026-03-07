import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/auth";
import { updateWill } from "@/lib/db/supabase";

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
  if (result.will.status !== "active") {
    return NextResponse.json(
      { error: "Death already declared or will executed" },
      { status: 400 }
    );
  }
  try {
    const will = await updateWill(id, { status: "death_declared" });
    return NextResponse.json({ will });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to declare death" },
      { status: 500 }
    );
  }
}
