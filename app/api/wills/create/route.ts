import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest } from "@/lib/auth";
import { createWill } from "@/lib/db/supabase";
import { getRoleForWill } from "@/lib/auth";
import type { WillWithRole } from "@/lib/types";

function parseBody(body: unknown): {
  creator_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const creator = typeof b.creator_wallet === "string" ? b.creator_wallet : null;
  const beneficiaries = Array.isArray(b.beneficiary_wallets)
    ? (b.beneficiary_wallets as string[]).filter((x) => typeof x === "string")
    : [];
  const percentages = Array.isArray(b.beneficiary_percentages)
    ? (b.beneficiary_percentages as number[]).filter((x) => typeof x === "number")
    : [];
  if (!creator || beneficiaries.length === 0 || percentages.length !== beneficiaries.length) {
    return null;
  }
  const sum = percentages.reduce((s, p) => s + p, 0);
  if (Math.abs(sum - 100) > 0.01) return null;
  return {
    creator_wallet: creator,
    beneficiary_wallets: beneficiaries,
    beneficiary_percentages: percentages,
    ipfs_cid: typeof b.ipfs_cid === "string" ? b.ipfs_cid : null,
    encrypted_doc_key_iv:
      typeof b.encrypted_doc_key_iv === "string" ? b.encrypted_doc_key_iv : null,
  };
}

export async function POST(req: NextRequest) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing or invalid x-wallet-address header" },
      { status: 401 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Invalid body: creator_wallet, beneficiary_wallets[], beneficiary_percentages[] (sum=100) required",
      },
      { status: 400 }
    );
  }
  try {
    const will = await createWill({
      ...parsed,
      executor_wallet: wallet,
    });
    const withRole: WillWithRole = {
      ...will,
      role: getRoleForWill(will, wallet),
    };
    return NextResponse.json(withRole);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create will" },
      { status: 500 }
    );
  }
}
