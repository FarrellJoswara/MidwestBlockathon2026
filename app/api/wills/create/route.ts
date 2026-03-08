import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getRoleForWill } from "@/lib/modules/auth";
import { createWill } from "@/lib/modules/chain";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { WillWithRole } from "@/lib/modules/types";

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
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", ErrorCodes.VALIDATION_ERROR, 400);
  }
  const parsed = parseBody(body);
  if (!parsed) {
    return errorResponse(
      "Invalid body: creator_wallet, beneficiary_wallets[], beneficiary_percentages[] (sum=100) required",
      ErrorCodes.VALIDATION_ERROR,
      400,
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
    const msg = e instanceof Error ? e.message : "Failed to create will";
    if (msg.includes("on-chain from the frontend")) {
      return errorResponse(msg, ErrorCodes.INTERNAL_ERROR, 501, {
        useContract: true,
        contractAddress: process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS ?? null,
      });
    }
    return handleApiError(e, "wills/create");
  }
}
