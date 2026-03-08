"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, type SetActiveWalletForWagmiType } from "@privy-io/wagmi";
import { wagmiConfig } from "@/lib/modules/chain/wagmi-config";
import { privyConfig } from "@/lib/modules/auth/privy-config";

const queryClient = new QueryClient();

/** Prefer Privy embedded wallet so transactions use in-app signing instead of MetaMask.
 *  Only the returned wallet is synced to wagmi when setActiveWalletForWagmi is set. */
const setActiveWalletForWagmi: SetActiveWalletForWagmiType = ({ wallets }) => {
  type PrivyWallet = { walletClientType?: string; connectorType?: string; imported?: boolean };
  const embedded = wallets.find((w) => {
    const p = w as PrivyWallet;
    return p.walletClientType === "privy" && p.connectorType === "embedded" && !p.imported;
  });
  const privyWallet = embedded ?? wallets.find((w) => (w as PrivyWallet).walletClientType === "privy");
  return privyWallet ?? wallets[0];
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
