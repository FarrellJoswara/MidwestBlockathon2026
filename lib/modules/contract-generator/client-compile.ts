/**
 * Client-side Solidity compilation using web-solc (browser).
 * Used by the create-will page so Step 3b runs without calling /api/contract/compile.
 */

import { fetchAndLoadSolc } from "web-solc";
import type { GeneratedContract, CompiledContract } from "./types";

const VIRTUAL_SOURCE_PATH = "GeneratedContract.sol";

/** Match Gemini-generated pragma (e.g. 0.8.20). Exact version avoids "requires different compiler" errors. */
const SOLC_VERSION = "0.8.20";

/**
 * Compile generated contract source in the browser and return bytecode + ABI.
 * Uses web-solc (Web Worker + WASM). No fetch to our API; runs entirely in the client.
 */
export async function compileContractClient(
  generated: GeneratedContract
): Promise<CompiledContract> {
  const { source, contractName } = generated;

  if (!source?.trim()) {
    throw new Error("Generated contract source is empty.");
  }

  const input = {
    language: "Solidity" as const,
    sources: {
      [VIRTUAL_SOURCE_PATH]: { content: source },
    },
    settings: {
      optimizer: { enabled: false },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const solc = await fetchAndLoadSolc(SOLC_VERSION);
  try {
    const output = await solc.compile(input);
    return parseCompilerOutput(output, contractName);
  } finally {
    solc.stopWorker();
  }
}

/** Parse standard Solidity JSON output into CompiledContract. */
function parseCompilerOutput(
  output: {
    errors?: Array<{ severity?: string; formattedMessage?: string; message?: string }>;
    contracts?: Record<string, Record<string, { abi?: unknown[]; evm?: { bytecode?: { object?: string } } }>>;
  },
  contractName: string
): CompiledContract {
  if (output.errors?.length) {
    const messages = output.errors
      .filter((e): e is typeof e & { severity: string } => e.severity === "error")
      .map((e) => e.formattedMessage ?? e.message);
    if (messages.length) {
      throw new Error(`Compilation failed:\n${messages.join("\n")}`);
    }
  }

  const contracts = output.contracts?.[VIRTUAL_SOURCE_PATH];
  if (!contracts || Object.keys(contracts).length === 0) {
    throw new Error(
      "Compilation produced no contracts. Check Solidity syntax and pragma (e.g. pragma solidity ^0.8.0;)."
    );
  }

  const artifact = contracts[contractName] ?? Object.values(contracts)[0];
  if (!artifact) {
    throw new Error(
      "Compilation produced no contracts. Check Solidity syntax and pragma (e.g. pragma solidity ^0.8.0;)."
    );
  }
  if (!artifact.evm?.bytecode?.object) {
    const available = Object.keys(contracts).join(", ");
    throw new Error(
      `Contract "${contractName}" not found or has no bytecode (abstract/interface?). Available: ${available}.`
    );
  }

  const bytecode = artifact.evm.bytecode.object as string;
  const abi = (artifact.abi ?? []) as unknown[];
  const resolvedName = contracts[contractName]
    ? contractName
    : (Object.keys(contracts)[0] ?? contractName);

  return {
    bytecode: bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`,
    abi,
    contractName: resolvedName,
  };
}
