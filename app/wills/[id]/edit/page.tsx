"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/modules/api";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import { xrplEvmTestnet } from "@/lib/modules/chain/chains";
import type { Will, WillPool } from "@/lib/modules/types";
import { type Address, getAddress } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address;

export default function EditWillPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [pools, setPools] = useState<WillPool[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["will", id, address],
    queryFn: () =>
      apiFetch(`/api/wills/${id}`, { wallet: address ?? undefined }) as Promise<{
        will: Will;
        role: string;
      }>,
    enabled: !!id && !!address,
  });

  useEffect(() => {
    if (data?.will?.pools?.length) {
      setPools(data.will.pools);
    } else if (data?.will?.beneficiary_wallets?.length) {
      setPools([
        {
          name: "Estate",
          beneficiary_wallets: data.will.beneficiary_wallets,
          beneficiary_percentages: data.will.beneficiary_percentages,
        },
      ]);
    }
  }, [data?.will]);

  const updatePoolWallets = (poolIndex: number, walletIndex: number, value: string) => {
    setPools((prev) =>
      prev.map((p, i) =>
        i === poolIndex
          ? {
              ...p,
              beneficiary_wallets: [
                ...p.beneficiary_wallets.slice(0, walletIndex),
                value,
                ...p.beneficiary_wallets.slice(walletIndex + 1),
              ],
            }
          : p
      )
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !data?.will || pools.length === 0 || !CONTRACT_ADDRESS) return;
    setSaving(true);
    setError(null);
    try {
      const beneficiaryWallets: Address[] = [];
      for (const p of pools) {
        for (const w of p.beneficiary_wallets) {
          try {
            beneficiaryWallets.push(getAddress(w.trim()));
          } catch {
            setError(
              "Invalid wallet address. Each address must be 0x followed by 40 hex characters (e.g. 0x1234...abcd)."
            );
            setSaving(false);
            return;
          }
        }
      }
      if (beneficiaryWallets.length === 0) {
        setError("At least one beneficiary wallet is required.");
        setSaving(false);
        return;
      }
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: willRegistryAbi,
        functionName: "updateWill",
        args: [
          BigInt(id),
          beneficiaryWallets,
          data.will.ipfs_cid ?? "",
          data.will.encrypted_doc_key_iv ?? "",
        ],
        chainId: xrplEvmTestnet.id,
        gas: BigInt(300000),
      });
      queryClient.invalidateQueries({ queryKey: ["will", id, address] });
      router.push(`/wills/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isUpdateNotSupported =
        /UpdateNotSupported|update not supported|does not support/i.test(msg) ||
        (err as { shortMessage?: string })?.shortMessage?.includes("UpdateNotSupported");
      setError(
        isUpdateNotSupported
          ? "This registry does not support editing wills. Create a new will to change beneficiaries."
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">Connect your wallet.</p>
        <Link href="/wills" className="btn-outlined mt-6 inline-flex">
          ← Wills
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-400">Loading…</p>
      </div>
    );
  }

  if ((data.role !== "creator" && data.role !== "executor") || data.will.status !== "active") {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">Only the creator or executor can edit an active will. (Only the creator can save changes on-chain.)</p>
        <Link href={`/wills/${id}`} className="btn-outlined mt-6 inline-flex">
          ← Back to will
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <main className="mx-auto max-w-xl px-6 py-12">
        <Link
          href={`/wills/${id}`}
          className="text-sm text-ink-500 transition-colors hover:text-ink-900"
        >
          ← Will
        </Link>
        <h1 className="mt-6 font-serif text-2xl font-bold text-ink-950">
          Edit Beneficiaries
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          You can update wallet addresses only. Allocation percentages are set by the will and cannot be changed.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-6">
          <div className="space-y-6">
            {pools.map((pool, poolIndex) => (
              <div key={poolIndex} className="card space-y-2 !p-4">
                <p className="text-sm font-medium text-ink-700">{pool.name}</p>
                <div className="space-y-2">
                  {pool.beneficiary_wallets.map((w, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={w}
                        onChange={(e) =>
                          updatePoolWallets(poolIndex, i, e.target.value)
                        }
                        placeholder="Wallet 0x..."
                        className="input min-w-0 flex-1 font-mono"
                      />
                      <span
                        className="inline-flex h-10 min-w-[5rem] items-center rounded-lg border border-ink-200 bg-ink-50 px-3 text-sm text-ink-600"
                        aria-label="Percentage (read-only)"
                      >
                        {pool.beneficiary_percentages[i] ?? 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p className="text-sm text-wine">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-3"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </main>
    </div>
  );
}
