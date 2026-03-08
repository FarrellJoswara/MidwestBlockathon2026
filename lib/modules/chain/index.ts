import { createPublicClient, http, type Address } from "viem";
import { xrplEvmTestnet } from "@/lib/modules/chain/chains";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import type { Will, WillPool } from "@/lib/modules/types";

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
    const [meta, poolCount] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWill",
        args: [willId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillPoolCount",
        args: [willId],
      }),
    ]);
    const [
      id,
      creatorWallet,
      executorWallet,
      ipfsCid,
      encryptedDocKeyIv,
      status,
      createdAt,
      updatedAt,
    ] = meta;
    const pools: WillPool[] = [];
    for (let p = 0; p < Number(poolCount); p++) {
      const [name, beneficiaryWallets, beneficiaryPercentages] =
        await publicClient.readContract({
          address: contractAddress,
          abi: willRegistryAbi,
          functionName: "getPool",
          args: [willId, BigInt(p)],
        });
      pools.push({
        name: name as string,
        beneficiary_wallets: (beneficiaryWallets as Address[]).map((a) =>
          a.toLowerCase()
        ),
        beneficiary_percentages: (beneficiaryPercentages as bigint[]).map((n) =>
          Number(n)
        ),
      });
    }
    const first = pools[0];
    return {
      id: String(id),
      creator_wallet: (creatorWallet as Address).toLowerCase(),
      executor_wallet: (executorWallet as Address).toLowerCase(),
      pools,
      beneficiary_wallets: first?.beneficiary_wallets ?? [],
      beneficiary_percentages: first?.beneficiary_percentages ?? [],
      ipfs_cid: (ipfsCid as string) || null,
      encrypted_doc_key_iv: (encryptedDocKeyIv as string) || null,
      status: contractStatusToApp(Number(status)),
      created_at: timestampToIso(createdAt as bigint),
      updated_at: timestampToIso(updatedAt as bigint),
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
  pools?: WillPool[];
  beneficiary_wallets?: string[];
  beneficiary_percentages?: number[];
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
    pools?: WillPool[];
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
