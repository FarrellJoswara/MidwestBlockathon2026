"use client";

import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PrivyConnectButton } from "../components/PrivyConnectButton";

export default function HomePage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;
  const isConnected = authenticated && !!address;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-parchment/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900">
            <span className="text-seal">◆</span>
            dihhapp
          </Link>
          <div className="flex items-center gap-4">
            {isConnected && (
              <Link
                href="/wills"
                className="text-sm text-ink-600 hover:text-ink-900"
              >
                My Wills
              </Link>
            )}
            <PrivyConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Digital Wills,{" "}
          <span className="text-seal">Decentralized</span> Distribution
        </h1>
        <p className="mt-6 text-lg text-ink-600">
          Manage inheritance instructions tied to wallet addresses. Executors control
          distribution; beneficiaries see their allocation and status—all without
          storing your keys.
        </p>
        {isConnected && address ? (
          <Link
            href="/wills"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-ink-900 px-6 py-3 text-white hover:bg-ink-800"
          >
            Open My Wills
          </Link>
        ) : (
          <p className="mt-10 text-ink-500">
            Connect your wallet to create or view wills.
          </p>
        )}

        <div className="mt-24 grid gap-8 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-ink-200 bg-white/60 p-6">
            <h3 className="font-semibold text-ink-900">Executor</h3>
            <p className="mt-2 text-sm text-ink-600">
              Create wills, upload encrypted documents to IPFS, set beneficiaries and
              allocations, declare death, and execute distribution.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white/60 p-6">
            <h3 className="font-semibold text-ink-900">Beneficiary</h3>
            <p className="mt-2 text-sm text-ink-600">
              View your allocation and executor info. After death declaration, see
              estate value and distribution status.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white/60 p-6">
            <h3 className="font-semibold text-ink-900">Secure by design</h3>
            <p className="mt-2 text-sm text-ink-600">
              Documents encrypted before IPFS. Only executor holds full access; keys
              never stored on our servers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
