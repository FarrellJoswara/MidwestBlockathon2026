/**
 * Types for the "generate new contract from parser data" pipeline.
 * Parser output is loosely typed since contracts vary; Gemini normalizes to generated source.
 */

/** Raw or semi-structured output from the contract parser. Shape depends on the document. */
export type ParserOutput = unknown;

/** Generated Solidity source (and optional contract name) from Gemini/template. */
export interface GeneratedContract {
  /** Solidity source code for the contract. */
  source: string;
  /** Contract name (e.g. "WillContract") used for compilation and deploy. */
  contractName: string;
}

/** Result of compiling generated source (bytecode + ABI for deploy). */
export interface CompiledContract {
  bytecode: string;
  abi: unknown[];
  contractName: string;
}

/** Result of deploying a generated contract. */
export interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  contractName: string;
}

/** Options when deploying a generated contract (chain, signer, etc.). */
export interface DeployGeneratedOptions {
  /** RPC URL for the chain (e.g. XRPL EVM testnet). */
  rpcUrl?: string;
  /** Private key or signer for the deployer. */
  deployerPrivateKey?: string;
}

/** Options for the full pipeline (parser → Gemini → generate → compile → deploy). */
export interface GenerateAndDeployOptions extends DeployGeneratedOptions {
  /** Will/document id used to record the deployed contract address. */
  willId?: string;
}
