"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";
import { privyConfig } from "@/lib/privy-config";

const queryClient = new QueryClient();

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
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
