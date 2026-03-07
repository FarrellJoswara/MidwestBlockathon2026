"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { PrivyConnectButton } from "@/components/PrivyConnectButton";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { WillWithRole } from "@/lib/types";

function RoleBadge({ role }: { role: WillWithRole["role"] }) {
  if (!role) return null;
  const styles =
    role === "executor"
      ? "bg-seal/15 text-seal"
      : role === "beneficiary"
        ? "bg-gold/20 text-ink-800"
        : "bg-ink-200 text-ink-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles}`}>
      {role}
    </span>
  );
}

export default function WillsListPage() {
  const { address, isConnected } = useAccount();
  const { data: wills, isLoading, error } = useQuery({
    queryKey: ["wills", address],
    queryFn: () =>
      apiFetch("/api/wills", { wallet: address ?? undefined }) as Promise<
        WillWithRole[]
      >,
    enabled: !!address,
  });

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment">
        <header className="border-b border-ink-200 bg-parchment/95">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="font-semibold text-ink-900">
              ◆ Blockchain Inheritance
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-ink-600">Connect your wallet to view your wills.</p>
          <div className="mt-4 flex justify-center gap-4">
            <PrivyConnectButton />
            <Link href="/" className="text-seal hover:underline">
              ← Back home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="sticky top-0 z-50 border-b border-ink-200 bg-parchment/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-ink-900">
            ◆ Blockchain Inheritance
          </Link>
          <Link href="/wills/create" className="rounded-lg bg-ink-900 px-4 py-2 text-sm text-white hover:bg-ink-800">
            Create Will
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">My Wills</h1>
        {isLoading && <p className="mt-4 text-ink-500">Loading…</p>}
        {error && (
          <p className="mt-4 text-red-600">
            {error instanceof Error ? error.message : "Failed to load wills"}
          </p>
        )}
        {wills && wills.length === 0 && (
          <p className="mt-6 text-ink-600">
            You have no wills yet. Create one as executor or wait to be added as a
            beneficiary.
          </p>
        )}
        {wills && wills.length > 0 && (
          <ul className="mt-6 space-y-4">
            {wills.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/wills/${w.id}`}
                  className="block rounded-xl border border-ink-200 bg-white/80 p-5 transition hover:border-ink-300 hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-900">
                      Will for {w.creator_wallet.slice(0, 6)}…{w.creator_wallet.slice(-4)}
                    </span>
                    <RoleBadge role={w.role} />
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
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
