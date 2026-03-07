/**
 * Contract generator module — WillRegistry ABI/config, generate-and-deploy pipeline, registry, hooks.
 * Use: import { willRegistryAbi } from "@/lib/modules/contract-generator";
 * Use: import { generateAndDeployContract } from "@/lib/modules/contract-generator";
 */
export { willRegistryAbi, type WillRegistryStatus } from "./abi";
export { willRegistryAddress } from "./config";
export { generateContractFromParserData, compileContract, deployGeneratedContract, generateAndDeployContract } from "./pipeline";
export { recordDeployedWill, getDeployedContractAddress } from "./registry";
export { useDeclareDeath } from "./hooks/useDeclareDeath";
export type {
  ParserOutput,
  GeneratedContract,
  CompiledContract,
  DeployResult,
  DeployGeneratedOptions,
  GenerateAndDeployOptions,
} from "./types";
