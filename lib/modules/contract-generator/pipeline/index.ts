/**
 * Pipeline: parser output → generate → compile → deploy → record.
 * Foundation only — wires the stubs; implement each step in its module.
 *
 * Inputs:
 *   - generateAndDeployContract(parserOutput, options?): ParserOutput;
 *     optional GenerateAndDeployOptions { rpcUrl?, deployerPrivateKey?, willId? }
 *
 * Outputs:
 *   - generateAndDeployContract(): DeployResult { contractAddress, transactionHash, contractName }
 *   - Side effect: when options.willId is set, records willId → contractAddress in registry
 */

import type { ParserOutput, DeployResult, GenerateAndDeployOptions } from "../types";
import { generateContractFromParserData } from "./generate";
import { compileContract } from "./compile";
import { deployGeneratedContract } from "./deploy-generated";
import { recordDeployedWill } from "../registry";

/**
 * Full pipeline: take parser output, generate contract via Gemini, compile, deploy, and record.
 * Returns the deploy result; optionally records willId → contractAddress when willId is in options.
 */
export async function generateAndDeployContract(
  parserOutput: ParserOutput,
  options?: GenerateAndDeployOptions
): Promise<DeployResult> {
  const generated = await generateContractFromParserData(parserOutput);
  const compiled = await compileContract(generated);
  const result = await deployGeneratedContract(compiled, options);

  if (options?.willId) {
    await recordDeployedWill(options.willId, result.contractAddress);
  }

  return result;
}

export { generateContractFromParserData } from "./generate";
export { compileContract } from "./compile";
export { deployGeneratedContract } from "./deploy-generated";
