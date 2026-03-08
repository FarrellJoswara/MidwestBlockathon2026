"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, type SetActiveWalletForWagmiType } from "@privy-io/wagmi";
import { wagmiConfig } from "@/lib/modules/chain/wagmi-config";
import { privyConfig } from "@/lib/modules/auth/privy-config";

const queryClient = new QueryClient();

/** Prefer Privy embedded wallet for wagmi. When user logs in with Google/email we show that
 *  wallet; only use external (e.g. MetaMask) when they logged in with wallet and have no embedded. */
const setActiveWalletForWagmi: SetActiveWalletForWagmiType = ({ wallets }) => {
  type PrivyWallet = { walletClientType?: string; connectorType?: string; imported?: boolean; meta?: { id?: string }; address?: string };
  // #region agent log
  const walletDetails = (wallets ?? []).map((w) => {
    const p = w as PrivyWallet;
    return {
      connectorType: p.connectorType,
      walletClientType: p.walletClientType,
      metaId: p.meta?.id,
      hasAddress: !!p.address,
      addressPrefix: p.address ? `${String(p.address).slice(0, 10)}…` : null,
    };
  });
  fetch("http://127.0.0.1:7842/ingest/16ddf00b-a49a-403f-8f9d-824277c2be74", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1f6480" },
    body: JSON.stringify({
      sessionId: "1f6480",
      location: "providers.tsx:setActiveWalletForWagmi",
      message: "Wagmi wallet selection (B)",
      data: { walletsLength: wallets?.length ?? 0, walletDetails },
      hypothesisId: "B",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const embedded = wallets.find((w) => {
    const p = w as PrivyWallet;
    return p.walletClientType === "privy" && p.connectorType === "embedded" && !p.imported;
  });
  const anyPrivy =
    embedded ??
    wallets.find((w) => (w as PrivyWallet).walletClientType === "privy") ??
    wallets.find((w) => (w as PrivyWallet).meta?.id === "io.privy.wallet");
  if (anyPrivy) return anyPrivy;
  // Prefer first wallet that is not an external/injected one (e.g. MetaMask), so Google login
  // shows the embedded wallet instead of a previously connected MetaMask.
  const notExternal = wallets.find((w) => {
    const p = w as PrivyWallet;
    return p.connectorType !== "injected" && p.walletClientType !== "metamask";
  });
  const chosen = notExternal ?? wallets[0] ?? undefined;
  // #region agent log
  fetch("http://127.0.0.1:7842/ingest/16ddf00b-a49a-403f-8f9d-824277c2be74", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1f6480" },
    body: JSON.stringify({
      sessionId: "1f6480",
      location: "providers.tsx:setActiveWalletForWagmi:result",
      message: "Chosen wallet (B)",
      data: {
        hasEmbedded: !!embedded,
        hasAnyPrivy: !!anyPrivy,
        hasNotExternal: !!notExternal,
        chosenAddressPrefix: chosen ? `${String((chosen as PrivyWallet).address ?? "").slice(0, 10)}…` : null,
      },
      hypothesisId: "B",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return chosen;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment p-4 text-center">
        <p className="text-ink-700">
          Missing <code className="rounded bg-ink-200 px-1">NEXT_PUBLIC_PRIVY_APP_ID</code>.
          Add it to <code className="rounded bg-ink-200 px-1">.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={setActiveWalletForWagmi}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
