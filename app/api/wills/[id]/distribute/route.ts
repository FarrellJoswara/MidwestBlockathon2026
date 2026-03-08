import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { updateWill } from "@/lib/modules/chain";
import { executeDistribution } from "@/lib/modules/executor";

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
    const allocations = result.will.pools.flatMap((pool) =>
      pool.beneficiary_wallets.map((w, i) => ({
        wallet: w,
        percentage: pool.beneficiary_percentages[i] ?? 0,
      }))
    );
    const plan = executeDistribution(
      id,
      result.will.creator_wallet,
      allocations
    );
    const will = await updateWill(id, { status: "executed" });
    return NextResponse.json({ will, distribution_plan: plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to execute distribution";
    if (msg.includes("on-chain from the frontend")) {
      return NextResponse.json(
        {
          error: msg,
          useContract: true,
          contractAddress: process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS ?? null,
        },
        { status: 501 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
