import { NextResponse } from "next/server";
import { generateAndCompileContract } from "@/lib/modules/contract-generator/pipeline";
import type { ParserOutput } from "@/lib/modules/contract-generator/types";

/**
 * POST /api/contract/generate-and-deploy
 * Body: ParserOutput (JSON)
 * Runs: generate (Gemini) → compile (solc). Returns { bytecode, abi, contractName } so the
 * client can deploy with the logged-in user's wallet (Privy). No server-side deploy or DEPLOYER_PRIVATE_KEY.
 * Requires: GOOGLE_API_KEY or GEMINI_API_KEY.
 */
export async function POST(req: Request) {
  try {
    console.log("[generate-and-deploy] Step 1: Parsing request body...");
    const body = (await req.json()) as ParserOutput;
    if (!body || typeof body !== "object") {
      console.log("[generate-and-deploy] Step 1 FAILED: invalid body");
      return NextResponse.json(
        { error: "Missing or invalid body: ParserOutput (JSON)" },
        { status: 400 }
      );
    }
    console.log("[generate-and-deploy] Step 1 OK: body keys", Object.keys(body));
    console.log("[generate-and-deploy] Step 1: testator_address", body.testator_address, "executor_address", body.executor_address);
    console.log("[generate-and-deploy] Step 1: beneficiaries count", body.beneficiaries?.length ?? 0, "assets count", body.assets?.length ?? 0);

    const hasGeminiKey = !!(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY);
    console.log("[generate-and-deploy] Step 2: env check", { hasGeminiKey });
    if (!hasGeminiKey) {
      console.log("[generate-and-deploy] Step 2 FAILED: no Gemini API key");
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY or GEMINI_API_KEY" },
        { status: 503 }
      );
    }

    console.log("[generate-and-deploy] Step 2: calling generateAndCompile...");
    const compiled = await generateAndCompileContract(body);
    console.log("[generate-and-deploy] Step 3: pipeline OK", {
      contractName: compiled.contractName,
      bytecodeLength: compiled.bytecode?.length ?? 0,
      abiLength: Array.isArray(compiled.abi) ? compiled.abi.length : 0,
    });
    console.log("[generate-and-deploy] Step 3: returning bytecode/abi for client deploy");
    return NextResponse.json({
      bytecode: compiled.bytecode,
      abi: compiled.abi,
      contractName: compiled.contractName,
    });
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    const message = rawMessage.length > 400 ? rawMessage.slice(0, 400) + "..." : rawMessage;
    const name = e instanceof Error ? e.name : "Error";
    console.error("[generate-and-deploy] FAILED:", name, message);
    if (e instanceof Error && e.stack) {
      console.error("[generate-and-deploy] stack:", e.stack.slice(0, 800));
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
