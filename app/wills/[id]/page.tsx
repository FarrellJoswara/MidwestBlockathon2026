"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ExecutorDashboard } from "@/components/ExecutorDashboard";
import { BeneficiaryDashboard } from "@/components/BeneficiaryDashboard";
import type { Will, WalletRole } from "@/lib/types";

export default function WillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { address, isConnected } = useAccount();

  const { data, isLoading, error } = useQuery({
    queryKey: ["will", id, address],
    queryFn: () =>
      apiFetch(`/api/wills/${id}`, {
        wallet: address ?? undefined,
      }) as Promise<{ will: Will; role: WalletRole }>,
    enabled: !!id && !!address,
  });

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Connect your wallet to view this will.</p>
        <Link href="/" className="mt-4 inline-block text-seal hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Loading will…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-red-600">
          {error instanceof Error ? error.message : "Will not found or access denied"}
        </p>
        <Link href="/wills" className="mt-4 inline-block text-seal hover:underline">
          ← Back to Wills
        </Link>
      </div>
    );
  }

  const { will, role } = data;
  if (!role) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">You do not have access to this will.</p>
        <Link href="/wills" className="mt-4 inline-block text-seal hover:underline">
          ← Back to Wills
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="sticky top-0 z-50 border-b border-ink-200 bg-parchment/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/wills" className="font-semibold text-ink-900">
            ← Wills
          </Link>
          <span className="rounded bg-ink-200 px-2 py-1 text-xs font-medium text-ink-700">
            {role}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">Will details</h1>
        <p className="mt-1 text-ink-600">
          Creator: {will.creator_wallet.slice(0, 10)}…{will.creator_wallet.slice(-8)}
        </p>
        {role === "executor" && <ExecutorDashboard will={will} />}
          {role === "beneficiary" && <BeneficiaryDashboard will={will} />}
          {role === "creator" && (
            <div className="mt-8 rounded-xl border border-ink-200 bg-white/80 p-6">
              <p className="text-ink-600">
                You are the will creator. The executor has full management rights.
                You can view this record for reference.
              </p>
              <p className="mt-2 text-sm text-ink-500">
                Status: {will.status}. Executor: {will.executor_wallet.slice(0, 10)}…
              </p>
            </div>
          )}
      </main>
    </div>
  );
}
