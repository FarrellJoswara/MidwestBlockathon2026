"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { willRegistryAbi } from "../abi";
import { willRegistryAddress } from "../config";
import { generatedWillAbi } from "../generated-will-abi";
import type { Address } from "viem";

/**
 * Execute distribution: call generated contract execute() then registry markExecuted(willId).
 * Only use when will.status === "death_declared" and will.generated_contract_address is set.
 */
export function useExecuteDistribution(willId: string, generatedContractAddress: string | null) {
  const [step, setStep] = useState<"idle" | "execute" | "mark">("idle");
  const startedRef = useRef(false);

  const {
    writeContract,
    data: hash,
  } = useWriteContract();

  const { isSuccess: receiptSuccess, isLoading: receiptLoading } = useWaitForTransactionReceipt({
    hash,
  });

  // When user starts: send execute() on generated contract
  const executeDistribution = useCallback(() => {
    if (!generatedContractAddress || generatedContractAddress === "0x0000000000000000000000000000000000000000") {
      return;
    }
    if (!willRegistryAddress) return;
    startedRef.current = true;
    setStep("execute");
    writeContract({
      address: generatedContractAddress as Address,
      abi: generatedWillAbi,
      functionName: "execute",
      args: [],
      gas: BigInt(500000),
    });
  }, [generatedContractAddress, writeContract]);

  // After execute() confirms, send markExecuted(willId)
  useEffect(() => {
    if (step !== "execute" || !receiptSuccess || !hash || !startedRef.current) return;
    startedRef.current = false;
    setStep("mark");
    writeContract({
      address: willRegistryAddress,
      abi: willRegistryAbi,
      functionName: "markExecuted",
      args: [BigInt(willId)],
      gas: BigInt(100000),
    });
  }, [step, receiptSuccess, hash, willId, writeContract]);

  return {
    executeDistribution,
    step,
    isPending: receiptLoading || (step === "execute" && receiptSuccess) || (step === "mark" && !receiptSuccess),
    isSuccess: step === "mark" && receiptSuccess,
    hash,
  };
}
