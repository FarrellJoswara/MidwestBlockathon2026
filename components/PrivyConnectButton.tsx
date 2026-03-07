"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();

  if (!ready) {
    return (
      <span className="rounded-lg border border-ink-200 bg-ink-100 px-4 py-2 text-sm text-ink-500">
        Loading…
      </span>
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800"
      >
        Login
      </button>
    );
  }

  const displayAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
      : "Connected";

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg border border-ink-200 bg-parchment px-3 py-1.5 font-mono text-sm text-ink-700">
        {displayAddress}
      </span>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
      >
        Log out
      </button>
    </div>
  );
}
