"use client";

import { useCallback, useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function PrivyConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const linkedWallet = user?.linkedAccounts?.find(
    (a: { type?: string }) => a.type === "wallet" || a.type === "smart_wallet"
  ) as { address?: string } | undefined;
  const linkedWalletAddress = linkedWallet?.address;

  const fullAddress =
    address || linkedWalletAddress || user?.wallet?.address || wallets?.[0]?.address || "";
  const displayAddress = fullAddress
    ? `${fullAddress.slice(0, 6)}…${fullAddress.slice(-4)}`
    : "Connected";

  // #region agent log
  const LOG_ENDPOINT = "http://127.0.0.1:7842/ingest/16ddf00b-a49a-403f-8f9d-824277c2be74";
  useEffect(() => {
    if (!ready) return;
    fetch(LOG_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1f6480" }, body: JSON.stringify({ sessionId: "1f6480", location: "PrivyConnectButton.tsx:effect", message: "Wallet state", data: { ready, authenticated, wagmiAddress: address ?? null, linkedWalletAddress: linkedWalletAddress || null, userWalletAddress: user?.wallet?.address ?? null, walletsLength: wallets?.length ?? 0, firstWalletAddress: wallets?.[0]?.address ?? null, fullAddress: fullAddress || null, displayAddress }, hypothesisId: "A", timestamp: Date.now() }) }).catch(() => {});
  }, [ready, authenticated, address, linkedWalletAddress, user?.wallet, wallets, fullAddress, displayAddress]);
  // #endregion

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
      <span className="text-xs text-ink-400">Wallet:</span>
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
