import { createPublicClient, http, type Address } from "viem";
import { xrplEvmTestnet } from "@/lib/modules/chain/chains";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import type { Will } from "@/lib/modules/types";

const contractAddress = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address | undefined;
const rpcUrl =
  process.env.WILL_REGISTRY_RPC_URL ?? xrplEvmTestnet.rpcUrls.default.http[0];

const publicClient = createPublicClient({
  chain: xrplEvmTestnet,
  transport: http(rpcUrl),
});

function contractStatusToApp(status: number): Will["status"] {
  if (status === 1) return "death_declared";
  if (status === 2) return "executed";
  return "active";
}

function timestampToIso(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toISOString();
}

async function fetchWillById(willId: bigint): Promise<Will | null> {
  if (!contractAddress) return null;
  try {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: willRegistryAbi,
      functionName: "getWill",
      args: [willId],
    });
    const [
      id,
      creatorWallet,
      executorWallet,
      beneficiaryWallets,
      beneficiaryPercentages,
      ipfsCid,
      encryptedDocKeyIv,
      status,
      createdAt,
      updatedAt,
    ] = result;
    return {
      id: String(id),
      creator_wallet: creatorWallet.toLowerCase(),
      executor_wallet: executorWallet.toLowerCase(),
      beneficiary_wallets: beneficiaryWallets.map((a) => (a as Address).toLowerCase()),
      beneficiary_percentages: beneficiaryPercentages.map((p) => Number(p)),
      ipfs_cid: ipfsCid || null,
      encrypted_doc_key_iv: encryptedDocKeyIv || null,
      status: contractStatusToApp(Number(status)),
      created_at: timestampToIso(createdAt),
      updated_at: timestampToIso(updatedAt),
    };
  } catch {
    return null;
  }
}

export async function getWillsByWallet(wallet: string): Promise<Will[]> {
  if (!contractAddress) return [];
  const addr = wallet as Address;
  try {
    const [creatorIds, executorIds, beneficiaryIds] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillIdsByCreator",
        args: [addr],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillIdsByExecutor",
        args: [addr],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillIdsByBeneficiary",
        args: [addr],
      }),
    ]);
    const seen = new Set<string>();
    const combined: Will[] = [];
    for (const idList of [creatorIds, executorIds, beneficiaryIds]) {
      for (const id of idList) {
        const key = String(id);
        if (seen.has(key)) continue;
        seen.add(key);
        const will = await fetchWillById(id);
        if (will) combined.push(will);
      }
    }
    combined.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return combined;
  } catch {
    return [];
  }
}

export async function getWillById(id: string): Promise<Will | null> {
  if (!contractAddress) return null;
  const willId = BigInt(id);
  if (willId < BigInt(1)) return null;
  return fetchWillById(willId);
}

/**
 * Create and update are done on-chain from the frontend (user signs).
 * Use the contract at NEXT_PUBLIC_WILL_REGISTRY_ADDRESS; call createWill / updateWill / declareDeath / markExecuted via wagmi writeContract.
 */
export async function createWill(_row: {
  creator_wallet: string;
  executor_wallet: string;
  beneficiary_wallets: string[];
  beneficiary_percentages: number[];
  ipfs_cid?: string | null;
  encrypted_doc_key_iv?: string | null;
}): Promise<Will> {
  throw new Error(
    "Create will on-chain from the frontend (use contract createWill). Set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS and call the contract with the executor wallet."
  );
}

export async function updateWill(
  _id: string,
  _updates: {
    beneficiary_wallets?: string[];
    beneficiary_percentages?: number[];
    ipfs_cid?: string | null;
    encrypted_doc_key_iv?: string | null;
    status?: Will["status"];
  }
): Promise<Will> {
  throw new Error(
    "Update will on-chain from the frontend (use contract updateWill / declareDeath / markExecuted)."
  );
}
