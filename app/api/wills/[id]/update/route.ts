import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { updateWill } from "@/lib/modules/chain";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

function parseBody(body: unknown): {
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const beneficiaries = Array.isArray(b.beneficiary_wallets)
    ? (b.beneficiary_wallets as string[]).filter((x) => typeof x === "string")
    : undefined;
  const percentages = Array.isArray(b.beneficiary_percentages)
    ? (b.beneficiary_percentages as number[]).filter((x) => typeof x === "number")
    : undefined;
  if (beneficiaries && percentages && beneficiaries.length !== percentages.length) return null;
  if (percentages && Math.abs(percentages.reduce((s, p) => s + p, 0) - 100) > 0.01) return null;
  const ipfs_cid = typeof b.ipfs_cid === "string" ? b.ipfs_cid : undefined;
  const encrypted_doc_key_iv =
    typeof b.encrypted_doc_key_iv === "string" ? b.encrypted_doc_key_iv : undefined;
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
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }
  const { id } = await params;
  const result = await getWillWithRole(id, wallet);
  if (!result || result.role !== "executor") {
    return errorResponse(
      "Will not found or only executor can update",
      ErrorCodes.FORBIDDEN,
      403,
    );
  }
  if (result.will.status !== "active") {
    return errorResponse(
      "Cannot update will after death declaration or execution",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", ErrorCodes.VALIDATION_ERROR, 400);
  }
  const parsed = parseBody(body);
  if (
    !parsed ||
    (!parsed.beneficiary_wallets &&
      !parsed.beneficiary_percentages &&
      parsed.ipfs_cid === undefined &&
      parsed.encrypted_doc_key_iv === undefined)
  ) {
    return errorResponse(
      "Provide at least one: beneficiary_wallets/percentages, or ipfs_cid+encrypted_doc_key_iv",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }
  try {
    const will = await updateWill(id, parsed);
    return NextResponse.json({ will, role: result.role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update will";
    if (msg.includes("on-chain from the frontend")) {
      return errorResponse(msg, ErrorCodes.INTERNAL_ERROR, 501, {
        useContract: true,
        contractAddress: process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS ?? null,
      });
    }
    return handleApiError(e, "wills/update");
  }
}
