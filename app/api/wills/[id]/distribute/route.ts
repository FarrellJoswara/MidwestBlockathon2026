import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/auth";
import { updateWill } from "@/lib/db/supabase";
import { executeDistribution } from "@/lib/blockchain";

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
      { error: "Only executor can execute distribution" },
      { status: 403 }
    );
  }
  if (result.will.status !== "death_declared") {
    return NextResponse.json(
      { error: "Must declare death before executing distribution" },
      { status: 400 }
    );
  }
  try {
    const plan = executeDistribution(
      id,
      result.will.creator_wallet,
      result.will.beneficiary_wallets.map((w, i) => ({
        wallet: w,
        percentage: result.will.beneficiary_percentages[i] ?? 0,
      }))
    );
    const will = await updateWill(id, { status: "executed" });
    return NextResponse.json({ will, distribution_plan: plan });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to execute distribution" },
      { status: 500 }
    );
  }
}
