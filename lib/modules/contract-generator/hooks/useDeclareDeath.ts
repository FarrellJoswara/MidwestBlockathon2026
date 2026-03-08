/* reusable hook for calling the declareDeath
   function on the will registry contract */
"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { willRegistryAbi } from "../abi";
import { willRegistryAddress } from "../config";

export function useDeclareDeath() {
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const declareDeath = (willId: bigint) => {
    if (!willRegistryAddress) {
      throw new Error("Missing NEXT_PUBLIC_WILL_REGISTRY_ADDRESS");
    }

    writeContract({
      address: willRegistryAddress,
      abi: willRegistryAbi,
      functionName: "declareDeath",
      args: [willId],
      gas: BigInt(300000),
    });
  };

  return {
    declareDeath,
    hash,
    isWritePending,
    isConfirming,
    isSuccess,
    error: writeError || receiptError,
  };
}
