/**
 * Compile generated Solidity source to bytecode + ABI.
 * Foundation only — implement using solc, Hardhat, or Foundry.
 *
 * Inputs:
 *   - compileContract(generated): GeneratedContract { source, contractName }
 *
 * Outputs:
 *   - compileContract(): CompiledContract { bytecode, abi, contractName }
 */

import type { GeneratedContract, CompiledContract } from "../types";

/**
 * Compiles generated contract source and returns bytecode + ABI for deployment.
 * Implementation: run solc (or Hardhat/Foundry) on source; return bytecode and ABI.
 */
export async function compileContract(
  _generated: GeneratedContract
): Promise<CompiledContract> {
  // TODO: compile generated.source (e.g. solc.compile, or spawn hardhat compile).
  // TODO: return { bytecode, abi, contractName } from compilation artifact.
  throw new Error("Not implemented: compile generated source and return CompiledContract");
}
