/**
 * Types for the "generate new contract from parser data" pipeline.
 * Parser output is loosely typed since contracts vary; Gemini normalizes to generated source.
 */

/** Asset type for bequeathed items. */
export type ParserAssetType = "ETH" | "ERC20" | "ERC721" | "OTHER";

/** Single beneficiary entry from the parser. */
export interface ParserBeneficiary {
  name: string;
  walletAddress: string | null;
  assetDescription?: string;
  assetType?: ParserAssetType;
  amount?: string | null;
}

/** Single asset: real-world item with an NFT equivalent (owning NFT = owning asset). */
export interface ParserAsset {
  assetDescription: string;
  /** Beneficiary wallet that receives this asset (must be in beneficiaries). */
  beneficiaryWallet: string | null;
  /** NFT contract address (ERC-721) representing this asset. */
  nftContractAddress: string | null;
  /** Token ID of the NFT representing this asset. */
  nftTokenId: string | null;
}

/** Structured parser output — must match the exact schema expected by the generator. */
export interface ParserOutput {
  testator_name: string | null;
  testator_address: string | null;
  executor_name: string | null;
  executor_address: string | null;
  beneficiaries: ParserBeneficiary[];
  /** Per-asset assignments with NFT equivalent (for generated contract). */
  assets?: ParserAsset[];
  conditions: string[];
  additionalInstructions: string | null;
}

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
