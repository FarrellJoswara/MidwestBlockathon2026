import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { encryptBuffer } from "@/lib/modules/crypto";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export async function POST(req: NextRequest) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing or invalid x-wallet-address header" },
      { status: 401 }
    );
  }
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  const jwt = process.env.PINATA_JWT;
  if (!jwt && !(apiKey && secretKey)) {
    return NextResponse.json(
      { error: "Pinata not configured (PINATA_JWT or PINATA_API_KEY+SECRET)" },
      { status: 503 }
    );
  }
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const willId = formData.get("will_id") as string | null;
  if (!file || !willId) {
    return NextResponse.json(
      { error: "Missing file or will_id in form data" },
      { status: 400 }
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
    const err = await res.text();
    console.error("Pinata error", res.status, err);
    return NextResponse.json(
      { error: "IPFS upload failed: " + err },
      { status: 502 }
    );
  }
  const data = (await res.json()) as { IpfsHash?: string };
  const cid = data.IpfsHash ?? null;
  if (!cid) {
    return NextResponse.json({ error: "No CID returned from Pinata" }, { status: 502 });
  }
  return NextResponse.json({ cid, iv });
}
