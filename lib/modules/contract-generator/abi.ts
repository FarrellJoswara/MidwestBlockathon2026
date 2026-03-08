/**
 * WillRegistry ABI — use with viem getContract for reads and writes.
 * Deploy the contract from lib/modules/contract-generator then set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS.
 */
export const willRegistryAbi = [
  {
    type: "function",
    name: "createWill",
    inputs: [
      { name: "creatorWallet", type: "address", internalType: "address" },
      { name: "beneficiaryWallets", type: "address[]", internalType: "address[]" },
      { name: "beneficiaryPercentages", type: "uint256[]", internalType: "uint256[]" },
      { name: "ipfsCid", type: "string", internalType: "string" },
      { name: "encryptedDocKeyIv", type: "string", internalType: "string" },
      { name: "generatedContractAddress", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateWill",
    inputs: [
      { name: "willId", type: "uint256", internalType: "uint256" },
      { name: "beneficiaryWallets", type: "address[]", internalType: "address[]" },
      { name: "beneficiaryPercentages", type: "uint256[]", internalType: "uint256[]" },
      { name: "ipfsCid", type: "string", internalType: "string" },
      { name: "encryptedDocKeyIv", type: "string", internalType: "string" },
      { name: "status", type: "uint8", internalType: "enum WillRegistry.Status" },
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
      { name: "creatorWallet", type: "address", internalType: "address" },
      { name: "executorWallet", type: "address", internalType: "address" },
      { name: "beneficiaryWallets", type: "address[]", internalType: "address[]" },
      { name: "beneficiaryPercentages", type: "uint256[]", internalType: "uint256[]" },
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
