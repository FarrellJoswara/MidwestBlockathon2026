/**
 * Placeholder for blockchain distribution.
 * In production: executor-controlled wallet would call a contract or sign txs
 * to distribute assets from creator_wallet to beneficiaries per allocation.
 */
export interface DistributionPlan {
  will_id: string;
  creator_wallet: string;
  allocations: { wallet: string; percentage: number; amount?: string }[];
  status: "pending" | "executed" | "failed";
  tx_hash?: string;
}

export function distributeAssets(will_id: string): DistributionPlan {
  // MVP: log distribution plan; no real chain tx
  const plan: DistributionPlan = {
    will_id,
    creator_wallet: "",
    allocations: [],
    status: "pending",
  };
  console.log("[Blockchain] distributeAssets placeholder called", { will_id, plan });
  return plan;
}

export function executeDistribution(
  will_id: string,
  creator_wallet: string,
  allocations: { wallet: string; percentage: number }[],
  _estateValueWei?: string
): DistributionPlan {
  const plan: DistributionPlan = {
    will_id,
    creator_wallet,
    allocations: allocations.map((a) => ({ ...a, amount: undefined })),
    status: "executed",
  };
  console.log("[Blockchain] executeDistribution placeholder", plan);
  return plan;
}
