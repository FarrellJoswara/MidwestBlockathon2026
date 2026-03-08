/**
 * Compile generated Solidity source to bytecode + ABI.
 * Uses solc (solc-js) to compile in-memory source; no Hardhat/Foundry required.
 *
 * Inputs:
 *   - compileContract(generated): GeneratedContract { source, contractName }
 *
 * Outputs:
 *   - compileContract(): CompiledContract { bytecode, abi, contractName }
 */

import solc from "solc";
import type { GeneratedContract, CompiledContract } from "../types";

const VIRTUAL_SOURCE_PATH = "GeneratedContract.sol";

/**
 * Compiles generated contract source and returns bytecode + ABI for deployment.
 * Runs solc on the source string; extracts bytecode and ABI for the named contract.
 */
export async function compileContract(
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
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  let output: {
    errors?: Array<{ severity?: string; formattedMessage?: string; message?: string }>;
    contracts?: Record<string, Record<string, { abi?: unknown[]; evm?: { bytecode?: { object?: string } } }>>;
  };
  try {
    output = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: (path: string) => ({
          error: "Generated contracts cannot use imports; use a single-file contract.",
        }),
      })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Compiler returned invalid output: ${msg}`);
  }

  if (output.errors?.length) {
    const messages = output.errors
      .filter((e): e is typeof e & { severity: string } => e.severity === "error")
      .map((e) => {
        const msg = e.formattedMessage ?? e.message ?? "Unknown compilation error";
        return msg.length > 1000 ? msg.slice(0, 1000) + "...\n[Error Truncated]" : msg;
      });
    if (messages.length) {
      throw new Error(`Compilation failed:\n${messages.join("\n")}`);
    }
  }

  const contracts = output.contracts?.[VIRTUAL_SOURCE_PATH];
  if (!contracts || Object.keys(contracts).length === 0) {
    throw new Error("Compilation produced no contracts. Check Solidity syntax and pragma (e.g. pragma solidity ^0.8.0;).");
  }

  // Prefer the requested contract name; otherwise use the only (or first) contract
  const artifact = contracts[contractName] ?? Object.values(contracts)[0];
  if (!artifact) {
    throw new Error(
      `Compilation produced no contracts. Check Solidity syntax and pragma (e.g. pragma solidity ^0.8.0;).`
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
