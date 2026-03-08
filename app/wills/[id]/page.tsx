"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/modules/api";
import type { Will, WalletRole } from "@/lib/modules/types";

const ExecutorDashboard = dynamic(
  () =>
    import("@/components/executor/ExecutorDashboard").then((m) => ({
      default: m.ExecutorDashboard,
    })),
  { loading: () => <p className="text-ink-400">Loading…</p> }
);
const BeneficiaryDashboard = dynamic(
  () =>
    import("@/components/beneficiary/BeneficiaryDashboard").then((m) => ({
      default: m.BeneficiaryDashboard,
    })),
  { loading: () => <p className="text-ink-400">Loading…</p> }
);

export default function WillDetailPage() {
  const params = useParams();
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

  /* ── Guard states ──────────────────────────────────────────── */

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">Connect your wallet to view this will.</p>
        <Link href="/" className="btn-outlined mt-6 inline-flex">
          ← Back home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-400">Loading will…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-wine">
          {error instanceof Error
            ? error.message
            : "Will not found or access denied"}
        </p>
        <Link href="/wills" className="btn-outlined mt-6 inline-flex">
          ← Back to Wills
        </Link>
      </div>
    );
  }

  const { will, role } = data;
  if (!role) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">You do not have access to this will.</p>
        <Link href="/wills" className="btn-outlined mt-6 inline-flex">
          ← Back to Wills
        </Link>
      </div>
    );
  }

  /* ── Role badge ────────────────────────────────────────────── */
  const badgeCls =
    role === "executor"
      ? "badge-executor"
      : role === "beneficiary"
        ? "badge-beneficiary"
        : "badge-creator";

  return (
    <div className="min-h-screen bg-parchment">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/wills"
            className="text-sm text-ink-500 transition-colors hover:text-ink-900"
          >
            ← Wills
          </Link>
          <span className={badgeCls}>{role}</span>
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold text-ink-950">
          Will Details
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Creator: {will.creator_wallet.slice(0, 10)}…
          {will.creator_wallet.slice(-8)}
        </p>

        <div className="mt-8">
          {role === "executor" && <ExecutorDashboard will={will} />}
          {role === "beneficiary" && <BeneficiaryDashboard will={will} />}
          {role === "creator" && (
            <div className="card">
              <p className="text-ink-500">
                You are the will creator. The executor has full management
                rights. You can view this record for reference.
              </p>
              <p className="mt-3 text-sm text-ink-400">
                Status: <strong>{will.status}</strong>. Executor:{" "}
                {will.executor_wallet.slice(0, 10)}…
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
