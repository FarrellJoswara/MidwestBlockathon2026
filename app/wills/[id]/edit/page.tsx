"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Will } from "@/lib/types";

export default function EditWillPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [beneficiaries, setBeneficiaries] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<number[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["will", id, address],
    queryFn: () =>
      apiFetch(`/api/wills/${id}`, { wallet: address ?? undefined }) as Promise<{
        will: Will;
        role: string;
      }>,
    enabled: !!id && !!address,
  });

  useEffect(() => {
    if (data?.will) {
      setBeneficiaries(data.will.beneficiary_wallets);
      setPercentages(data.will.beneficiary_percentages);
    }
  }, [data?.will]);

  const updateMutation = useMutation({
    mutationFn: (body: { beneficiary_wallets: string[]; beneficiary_percentages: number[] }) =>
      apiFetch(`/api/wills/${id}/update`, {
        method: "PATCH",
        wallet: address ?? undefined,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["will", id, address] });
      router.push(`/wills/${id}`);
    },
  });

  const totalPct = percentages.reduce((s, p) => s + p, 0);
  const valid = Math.abs(totalPct - 100) < 0.01;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateMutation.mutate({
      beneficiary_wallets: beneficiaries,
      beneficiary_percentages: percentages,
    });
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Connect your wallet.</p>
        <Link href="/wills" className="mt-4 inline-block text-seal hover:underline">
          ← Wills
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Loading…</p>
      </div>
    );
  }

  if (data.role !== "executor" || data.will.status !== "active") {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Only the executor can edit an active will.</p>
        <Link href={`/wills/${id}`} className="mt-4 inline-block text-seal hover:underline">
          ← Back to will
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-ink-200 bg-parchment/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href={`/wills/${id}`} className="font-semibold text-ink-900">
            ← Will
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">Edit beneficiaries</h1>
        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="space-y-3">
            {beneficiaries.map((w, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={w}
                  onChange={(e) =>
                    setBeneficiaries((b) => [
                      ...b.slice(0, i),
                      e.target.value,
                      ...b.slice(i + 1),
                    ])
                  }
                  className="flex-1 rounded border border-ink-300 bg-white px-3 py-2 font-mono text-sm"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={percentages[i] ?? 0}
                  onChange={(e) =>
                    setPercentages((p) => [
                      ...p.slice(0, i),
                      Number(e.target.value),
                      ...p.slice(i + 1),
                    ])
                  }
                  className="w-20 rounded border border-ink-300 bg-white px-2 py-2 text-sm"
                />
                <span className="flex items-center text-ink-500">%</span>
              </div>
            ))}
          </div>
          {Math.abs(totalPct - 100) > 0.01 && (
            <p className="text-sm text-amber-700">Total: {totalPct}% (must be 100%)</p>
          )}
          {updateMutation.error && (
            <p className="text-sm text-red-600">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : "Update failed"}
            </p>
          )}
          <button
            type="submit"
            disabled={!valid || updateMutation.isPending}
            className="w-full rounded-lg bg-ink-900 py-3 text-white disabled:opacity-50 hover:bg-ink-800"
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </main>
    </div>
  );
}
