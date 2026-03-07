import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest } from "@/lib/auth";
import { getWillById } from "@/lib/db/supabase";
import { getRoleForWill } from "@/lib/auth";
import { decryptBuffer } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing or invalid x-wallet-address header" },
      { status: 401 }
    );
  }
  const { cid } = await params;
  const willId = req.nextUrl.searchParams.get("will_id");
  const iv = req.nextUrl.searchParams.get("iv");
  if (!willId || !iv) {
    return NextResponse.json(
      { error: "Query params will_id and iv required" },
      { status: 400 }
    );
  }
  const will = await getWillById(willId);
  if (!will) {
    return NextResponse.json({ error: "Will not found" }, { status: 404 });
  }
  const role = getRoleForWill(will, wallet);
  if (!role || role === null) {
    return NextResponse.json({ error: "Access denied to this will document" }, { status: 403 });
  }
  if (will.ipfs_cid !== cid || will.encrypted_doc_key_iv !== iv) {
    return NextResponse.json(
      { error: "CID or IV does not match will record" },
      { status: 400 }
    );
  }
  const gateway = process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
  const res = await fetch(`${gateway}${cid}`);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch from IPFS" },
      { status: 502 }
    );
  }
  const encrypted = Buffer.from(await res.arrayBuffer());
  let decrypted: Buffer;
  try {
    decrypted = decryptBuffer(encrypted, iv);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(decrypted), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="will-document.pdf"',
    },
  });
}
