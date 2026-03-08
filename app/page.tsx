"use client";

import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PrivyConnectButton } from "@/components/layout/PrivyConnectButton";

export default function HomePage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;
  const isConnected = authenticated && !!address;

  return (
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-ink-200/60 bg-parchment/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-ink-900"
          >
            <span className="text-lg text-wine">◆</span>
            <span className="font-serif text-lg font-semibold tracking-tight">
              dihhapp
            </span>
          </Link>
          <div className="flex items-center gap-6">
            {isConnected && (
              <Link
                href="/wills"
                className="text-sm text-ink-500 transition-colors hover:text-ink-900"
              >
                My Wills
              </Link>
            )}
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        {/* Decorative rule */}
        <div className="mx-auto mb-8 flex items-center justify-center gap-4">
          <span className="block h-px w-12 bg-ink-300/60" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-ink-400">
            Secure Digital Inheritance
          </span>
          <span className="block h-px w-12 bg-ink-300/60" />
        </div>

        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
          Your Legacy,{" "}
          <span className="text-wine">Immutably</span>{" "}
          Preserved
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
          Manage inheritance instructions tied to wallet addresses.
          Executors control distribution; beneficiaries see their
          allocation — all without storing your keys.
        </p>

        {isConnected && address ? (
          <Link href="/wills" className="btn-primary mt-10">
            Open My Wills
            <span className="text-ink-400">→</span>
          </Link>
        ) : (
          <p className="mt-10 text-sm text-ink-400">
            Connect your wallet to create or view wills.
          </p>
        )}

        {/* ── Feature cards ────────────────────────────────────── */}
        <div className="mt-28 grid gap-6 text-left sm:grid-cols-3">
          <div className="card-accent">
            <h3 className="font-serif text-base font-semibold text-ink-900">
              Executor
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Create wills, upload encrypted documents to IPFS, set
              beneficiaries and allocations, declare death, and execute
              distribution.
            </p>
          </div>
          <div className="card-accent">
            <h3 className="font-serif text-base font-semibold text-ink-900">
              Beneficiary
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              View your allocation and executor info. After death
              declaration, see estate value and distribution status.
            </p>
          </div>
          <div className="card-accent">
            <h3 className="font-serif text-base font-semibold text-ink-900">
              Secure by Design
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Documents encrypted before IPFS. Only the executor holds
              full access; keys never stored on our servers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
