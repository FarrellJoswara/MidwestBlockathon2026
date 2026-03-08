"use client";

import { useCallback, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const fullAddress = address ?? user?.wallet?.address ?? "";
  const displayAddress = fullAddress
    ? `${fullAddress.slice(0, 6)}…${fullAddress.slice(-4)}`
    : "Connected";

  const copyAddress = useCallback(() => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fullAddress]);

  if (!ready) {
    return (
      <span className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-2 text-sm text-ink-400">
        Loading…
      </span>
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className="btn-wine"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copyAddress}
        title={fullAddress || "Copy address"}
        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-mono text-xs text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100 cursor-pointer"
      >
        {copied ? "Copied!" : displayAddress}
      </button>
      <button
        type="button"
        onClick={logout}
        className="btn-outlined text-xs"
      >
        Log out
      </button>
    </div>
  );
}
