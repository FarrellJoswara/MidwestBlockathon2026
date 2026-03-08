import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { encryptBuffer } from "@/lib/modules/crypto";
import { handleApiError, errorResponse } from "@/lib/api-helpers";
import { ErrorCodes } from "@/lib/errors";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export async function POST(req: NextRequest) { 
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return errorResponse(
      "Missing or invalid x-wallet-address header",
      ErrorCodes.UNAUTHORIZED,
      401,
    );
  }
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  const jwt = process.env.PINATA_JWT;
  if (!jwt && !(apiKey && secretKey)) {
    return errorResponse(
      "IPFS storage not configured. Contact the administrator.",
      ErrorCodes.IPFS_NOT_CONFIGURED,
      503,
    );
  }
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const willId = formData.get("will_id") as string | null;
  if (!file || !willId) {
    return errorResponse(
      "Missing file or will_id in form data",
      ErrorCodes.VALIDATION_ERROR,
      400,
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const { encrypted, iv } = encryptBuffer(buffer);

  const pinataForm = new FormData();
  pinataForm.append("file", new Blob([new Uint8Array(encrypted)]), file.name || "will.pdf");
  const metadata = JSON.stringify({ name: `will-${willId}` });
  pinataForm.append("pinataMetadata", metadata);

  const headers: Record<string, string> = {};
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else if (apiKey && secretKey) {
    headers.pinata_api_key = apiKey;
    headers.pinata_secret_api_key = secretKey;
  }

  const res = await fetch(PINATA_PIN_URL, {
    method: "POST",
    body: pinataForm,
    headers,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[ipfs/upload] Pinata error:", res.status, errText);
    return errorResponse(
      "Failed to upload document to IPFS",
      ErrorCodes.IPFS_UPLOAD_FAILED,
      502,
    );
  }
  const data = (await res.json()) as { IpfsHash?: string };
  const cid = data.IpfsHash ?? null;
  if (!cid) {
    return errorResponse(
      "IPFS upload succeeded but no CID was returned",
      ErrorCodes.IPFS_UPLOAD_FAILED,
      502,
    );
  }
  return NextResponse.json({ cid, iv });
}
