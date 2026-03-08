/**
 * Minimal ABI for the generated will contract.
 * Generated contracts expose execute() to transfer assets to beneficiaries.
 */
export const generatedWillAbi = [
  {
    type: "function",
    name: "execute",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
