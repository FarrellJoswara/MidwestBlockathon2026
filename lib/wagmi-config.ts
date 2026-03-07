"use client";

import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { xrplEvmMainnet, xrplEvmTestnet } from "@/lib/chains";

export const wagmiConfig = createConfig({
  chains: [xrplEvmTestnet, xrplEvmMainnet],
  transports: {
    [xrplEvmTestnet.id]: http(),
    [xrplEvmMainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
