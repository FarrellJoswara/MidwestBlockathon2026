/**
 * Deploy a compiled (generated) contract to the chain.
 * Foundation only — implement using viem or Hardhat deploy.
 *
 * Inputs:
 *   - deployGeneratedContract(compiled, options?): CompiledContract { bytecode, abi, contractName };
 *     optional DeployGeneratedOptions { rpcUrl?, deployerPrivateKey? }
 *
 * Outputs:
 *   - deployGeneratedContract(): DeployResult { contractAddress, transactionHash, contractName }
 */

import type { CompiledContract, DeployResult, DeployGeneratedOptions } from "../types";

/**
 * Deploys compiled contract bytecode to the chain and returns the contract address.
 * Implementation: use viem sendTransaction (contract deployment) or Hardhat deploy;
 * use options.rpcUrl and options.deployerPrivateKey for the signer.
 */
export async function deployGeneratedContract(
  _compiled: CompiledContract,
  _options?: DeployGeneratedOptions
): Promise<DeployResult> {
  // TODO: create wallet client from deployerPrivateKey; deploy compiled.bytecode via viem.
  // TODO: return { contractAddress, transactionHash, contractName }.
  throw new Error("Not implemented: deploy compiled contract and return DeployResult");
}
