/**
 * Modules barrel — re-exports from chain, contract-parser, contract-generator, executor, ui, api, auth, crypto, types.
 */
export {
  getWillsByWallet,
  getWillById,
  createWill,
  updateWill,
} from "./chain/index";
export { xrplEvmMainnet, xrplEvmTestnet } from "./chain/chains";
export { wagmiConfig } from "./chain/wagmi-config";
export { parseContract, type ParsedContract } from "./contract-parser/index";
export {
  parseWillFromCID,
  parseWillWithGemini,
  fetchPdfFromIPFS,
} from "./contract-parser/index";
export type {
  ParsedWill,
  Beneficiary,
  AssetType,
} from "./contract-parser/index";
export { willRegistryAbi, type WillRegistryStatus } from "./contract-generator/abi";
export type { WillFormParams, WillFormValidation } from "./ui/will-params";
export { validateWillFormParams } from "./ui/will-params";
export { executorApiPaths, type ExecutorAction } from "./executor/actions";
export { executeDistribution, distributeAssets, type DistributionPlan } from "./executor/blockchain";
export { apiFetch } from "./api/index";
export { getWalletFromRequest, getRoleForWill, getWillWithRole, privyConfig } from "./auth/index";
export { encryptBuffer, decryptBuffer } from "./crypto/index";
export type {
  Will,
  WillPool,
  WillInsert,
  WillUpdate,
  WillStatus,
  WalletRole,
  WillWithRole,
} from "./types/index";
