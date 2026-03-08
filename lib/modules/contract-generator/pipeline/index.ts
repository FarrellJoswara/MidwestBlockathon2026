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

import type { ParserOutput, DeployResult, GenerateAndDeployOptions, CompiledContract } from "../types";
import { generateContractFromParserData } from "./generate";
import { compileContract } from "./compile";
import { deployGeneratedContract } from "./deploy-generated";
import { recordDeployedWill } from "../registry";
import { logGeneratedSol } from "./log-generated-sol";

/**
 * Generate + compile only (no deploy). Use when the client will deploy with the user's wallet (Privy).
 * Returns { bytecode, abi, contractName } for client-side deployContract().
 */
export async function generateAndCompileContract(
  parserOutput: ParserOutput
): Promise<CompiledContract> {
  console.log("[pipeline] generateAndCompile: Step 3a Generating (Gemini)...");
  const generated = await generateContractFromParserData(parserOutput);
  console.log("[pipeline] generateAndCompile: Step 3a OK", generated.contractName);
  console.log("[pipeline] generateAndCompile: Step 3b Logging .sol...");
  logGeneratedSol(generated, parserOutput);
  console.log("[pipeline] generateAndCompile: Step 4 Compiling (solc)...");
  const compiled = await compileContract(generated);
  console.log("[pipeline] generateAndCompile: Step 4 OK", compiled.contractName);
  return compiled;
}

/**
 * Full pipeline: take parser output, generate contract via Gemini, compile, deploy, and record.
 * Returns the deploy result; optionally records willId → contractAddress when willId is in options.
 * Each generated .sol is written to lib/modules/contract-generator/pipeline/logs/ for inspection.
 */
export async function generateAndDeployContract(
  parserOutput: ParserOutput,
  options?: GenerateAndDeployOptions
): Promise<DeployResult> {
  console.log("[pipeline] Step 3a: Generating contract from parser data (Gemini)...");
  const generated = await generateContractFromParserData(parserOutput);
  console.log("[pipeline] Step 3a OK: generated", generated.contractName);

  console.log("[pipeline] Step 3b: Logging generated .sol to disk...");
  logGeneratedSol(generated, parserOutput);
  console.log("[pipeline] Step 3b OK");

  console.log("[pipeline] Step 4: Compiling contract (solc)...");
  const compiled = await compileContract(generated);
  console.log("[pipeline] Step 4 OK: compiled", compiled.contractName);

  console.log("[pipeline] Step 5: Deploying to chain (viem)...");
  const result = await deployGeneratedContract(compiled, options);
  console.log("[pipeline] Step 5 OK:", result.contractAddress, result.transactionHash);

  if (options?.willId) {
    console.log("[pipeline] Step 6: Recording willId -> contractAddress in registry...");
    await recordDeployedWill(options.willId, result.contractAddress);
    console.log("[pipeline] Step 6 OK");
  }

  console.log("[pipeline] Done.");
  return result;
}

export { generateContractFromParserData } from "./generate";
export { compileContract } from "./compile";
export { deployGeneratedContract } from "./deploy-generated";
