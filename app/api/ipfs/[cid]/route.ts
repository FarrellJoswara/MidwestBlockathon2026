import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getRoleForWill } from "@/lib/modules/auth";
import { getWillById } from "@/lib/modules/chain";
import { decryptBuffer } from "@/lib/modules/crypto";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }
  const { cid } = await params;
  const willId = req.nextUrl.searchParams.get("will_id");
  const iv = req.nextUrl.searchParams.get("iv");
  if (!willId || !iv) {
    return errorResponse(
      "Query params will_id and iv required",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }
  const will = await getWillById(willId);
  if (!will) {
    return errorResponse("Will not found", ErrorCodes.NOT_FOUND, 404);
  }
  const role = getRoleForWill(will, wallet);
  if (!role || role === null) {
    return errorResponse(
      "Access denied to this will document",
      ErrorCodes.FORBIDDEN,
      403,
    );
  }
  if (will.ipfs_cid !== cid || will.encrypted_doc_key_iv !== iv) {
    return errorResponse(
      "CID or IV does not match will record",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }
  const gateway = process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
  const res = await fetch(`${gateway}${cid}`);
  if (!res.ok) {
    console.error(`[ipfs] Failed to fetch CID ${cid}: ${res.status} ${res.statusText}`);
    return errorResponse(
      "Failed to fetch document from IPFS",
      ErrorCodes.IPFS_FETCH_FAILED,
      502,
    );
  }
  const encrypted = Buffer.from(await res.arrayBuffer());
  let decrypted: Buffer;
  try {
    decrypted = decryptBuffer(encrypted, iv);
  } catch (err) {
    console.error("[ipfs] Decryption failed:", err);
    return errorResponse(
      "Failed to decrypt document",
      ErrorCodes.DECRYPTION_FAILED,
      500,
    );
  }
  return new NextResponse(new Uint8Array(decrypted), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="will-document.pdf"',
    },
  });
}
