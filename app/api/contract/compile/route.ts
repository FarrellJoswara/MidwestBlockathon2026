import { NextResponse } from "next/server";
import { compileContract } from "@/lib/modules/contract-generator/pipeline/compile";

/**
 * POST /api/contract/compile — compile Solidity source to bytecode + ABI for client-side deploy.
 * Body: { source: string, contractName?: string }
 * Returns: { bytecode, abi, contractName } for use with walletClient.deployContract().
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source, contractName: name } = body as { source?: string; contractName?: string };
    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid body: { source: string, contractName?: string }" },
        { status: 400 }
      );
    }
    const contractName = name ?? (source.match(/contract\s+(\w+)\s*\{/)?.[1] ?? "Contract");
    const compiled = await compileContract({ source, contractName });
    return NextResponse.json({
      bytecode: compiled.bytecode,
      abi: compiled.abi,
      contractName: compiled.contractName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
