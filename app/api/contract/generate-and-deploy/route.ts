import { NextResponse } from "next/server";
import { generateAndDeployContract } from "@/lib/modules/contract-generator/pipeline";
import type { ParserOutput } from "@/lib/modules/contract-generator/types";

/**
 * POST /api/contract/generate-and-deploy
 * Body: ParserOutput (JSON)
 * Runs full pipeline: generate (Gemini) → compile (solc) → deploy (viem).
 * Returns: { contractAddress, transactionHash, contractName }
 * Requires: GOOGLE_API_KEY or GEMINI_API_KEY, DEPLOYER_PRIVATE_KEY (or WILL_REGISTRY_RPC_URL for RPC).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ParserOutput;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid body: ParserOutput (JSON)" },
        { status: 400 }
      );
    }
    const result = await generateAndDeployContract(body);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
