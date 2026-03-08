import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { updateWill } from "@/lib/modules/chain";
import type { WillPool } from "@/lib/modules/types";

function parseBody(body: unknown): {
  pools?: WillPool[];
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const ipfs_cid = typeof b.ipfs_cid === "string" ? b.ipfs_cid : undefined;
  const encrypted_doc_key_iv =
    typeof b.encrypted_doc_key_iv === "string" ? b.encrypted_doc_key_iv : undefined;

  if (Array.isArray(b.pools) && b.pools.length > 0) {
    const pools = b.pools as unknown[];
    const valid: WillPool[] = [];
    for (const p of pools) {
      if (!p || typeof p !== "object") return null;
      const po = p as Record<string, unknown>;
      const name = typeof po.name === "string" ? po.name : "Fund";
      const wallets = Array.isArray(po.beneficiary_wallets)
        ? (po.beneficiary_wallets as string[]).filter((x) => typeof x === "string")
        : [];
      const pcts = Array.isArray(po.beneficiary_percentages)
        ? (po.beneficiary_percentages as number[]).filter((x) => typeof x === "number")
        : [];
      if (wallets.length === 0 || wallets.length !== pcts.length) return null;
      if (Math.abs(pcts.reduce((s, n) => s + n, 0) - 100) > 0.01) return null;
      valid.push({ name, beneficiary_wallets: wallets, beneficiary_percentages: pcts });
    }
    return { pools: valid, ipfs_cid, encrypted_doc_key_iv };
  }

  const beneficiaries = Array.isArray(b.beneficiary_wallets)
    ? (b.beneficiary_wallets as string[]).filter((x) => typeof x === "string")
    : undefined;
  const percentages = Array.isArray(b.beneficiary_percentages)
    ? (b.beneficiary_percentages as number[]).filter((x) => typeof x === "number")
    : undefined;
  if (beneficiaries && percentages && beneficiaries.length !== percentages.length) return null;
  if (percentages && Math.abs(percentages.reduce((s, p) => s + p, 0) - 100) > 0.01) return null;
  return {
    beneficiary_wallets: beneficiaries,
    beneficiary_percentages: percentages,
    ipfs_cid,
    encrypted_doc_key_iv,
  };
}

export async function PATCH(
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
    return NextResponse.json({ error: "Will not found or only executor can update" }, { status: 403 });
  }
  if (result.will.status !== "active") {
    return NextResponse.json(
      { error: "Cannot update will after death declaration or execution" },
      { status: 400 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseBody(body);
  if (
    !parsed ||
    (!parsed.pools &&
      !parsed.beneficiary_wallets &&
      !parsed.beneficiary_percentages &&
      parsed.ipfs_cid === undefined &&
      parsed.encrypted_doc_key_iv === undefined)
  ) {
    return NextResponse.json(
      { error: "Provide at least one: pools, beneficiary_wallets/percentages, or ipfs_cid+encrypted_doc_key_iv" },
      { status: 400 }
    );
  }
  try {
    const will = await updateWill(id, parsed);
    return NextResponse.json({ will, role: result.role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update will";
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
