/**
 * WillRegistry ABI — matches simplified WillRegistry.sol (flat beneficiaries, no pools).
 * createWill(executor, beneficiaries[], ipfsCid, encryptedDocKeyIv, generatedContractAddress)
 * getWill returns beneficiaries[] instead of separate getWillPoolCount/getPool.
 */
export const willRegistryAbi = [
  {
    type: "function",
    name: "createWill",
    inputs: [
      { name: "executor", type: "address", internalType: "address" },
      { name: "beneficiaries", type: "address[]", internalType: "address[]" },
      { name: "ipfsCid", type: "string", internalType: "string" },
      { name: "encryptedDocKeyIv", type: "string", internalType: "string" },
      { name: "generatedContractAddress", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateWill",
    inputs: [
      { name: "willId", type: "uint256", internalType: "uint256" },
      { name: "beneficiaries", type: "address[]", internalType: "address[]" },
      { name: "ipfsCid", type: "string", internalType: "string" },
      { name: "encryptedDocKeyIv", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "declareDeath",
    inputs: [{ name: "willId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "markExecuted",
    inputs: [{ name: "willId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getWill",
    inputs: [{ name: "willId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "executor", type: "address", internalType: "address" },
      { name: "beneficiaries", type: "address[]", internalType: "address[]" },
      { name: "ipfsCid", type: "string", internalType: "string" },
      { name: "encryptedDocKeyIv", type: "string", internalType: "string" },
      { name: "generatedContractAddress", type: "address", internalType: "address" },
      { name: "status", type: "uint8", internalType: "enum WillRegistry.Status" },
      { name: "createdAt", type: "uint256", internalType: "uint256" },
      { name: "updatedAt", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWillIdsByCreator",
    inputs: [{ name: "creator", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWillIdsByExecutor",
    inputs: [{ name: "executor", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWillIdsByBeneficiary",
    inputs: [{ name: "beneficiary", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
] as const;

export type WillRegistryStatus = 0 | 1 | 2; // Active | DeathDeclared | Executed

// Public state variable getter (for scripts/tests)
export const willRegistryAbiWithNextId = [
  ...willRegistryAbi,
  {
    type: "function",
    name: "nextWillId",
    inputs: [],
    outputs: [{ type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;
