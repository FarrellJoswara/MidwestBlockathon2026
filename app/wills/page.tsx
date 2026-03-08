"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { PrivyConnectButton } from "@/components/layout/PrivyConnectButton";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/modules/api";
import type { WillWithRole } from "@/lib/modules/types";

function RoleBadge({ role }: { role: WillWithRole["role"] }) {
  if (!role) return null;
  const cls =
    role === "executor"
      ? "badge-executor"
      : role === "beneficiary"
        ? "badge-beneficiary"
        : "badge-creator";
  return <span className={cls}>{role}</span>;
}

export default function WillsListPage() {
  const { address, isConnected } = useAccount();
  const {
    data: wills,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wills", address],
    queryFn: () =>
      apiFetch("/api/wills", { wallet: address ?? undefined }) as Promise<
        WillWithRole[]
      >,
    enabled: !!address,
    refetchInterval: 3_000, // Poll WillRegistry every 3s
  });

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">
          Connect your wallet to view your wills.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <PrivyConnectButton />
          <Link href="/" className="btn-outlined">
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-bold text-ink-950">
            My Wills
          </h1>
          <Link href="/wills/create" className="btn-wine">
            Create Will
          </Link>
        </div>

        {isLoading && (
          <p className="mt-6 text-sm text-ink-400">Loading…</p>
        )}

        {error && (
          <p className="mt-6 text-sm text-wine">
            {error instanceof Error ? error.message : "Failed to load wills"}
          </p>
        )}

        {wills && wills.length === 0 && (
          <p className="mt-8 text-ink-500">
            You have no wills yet. Create one as executor or wait to be
            added as a beneficiary.
          </p>
        )}

        {wills && wills.length > 0 && (
          <ul className="mt-8 space-y-4">
            {wills.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/wills/${w.id}`}
                  className="card group block transition-all duration-150 hover:border-ink-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-medium text-ink-900">
                      Will for {w.creator_wallet.slice(0, 6)}…
                      {w.creator_wallet.slice(-4)}
                    </span>
                    <RoleBadge role={w.role} />
                  </div>
                  <p className="mt-1.5 text-sm text-ink-400">
                    Status: {w.status} · Updated{" "}
                    {new Date(w.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
