"use client";

import type { PrivyClientConfig } from "@privy-io/react-auth";
import { xrplEvmMainnet, xrplEvmTestnet } from "@/lib/chains";

export const privyConfig: PrivyClientConfig = {
  appearance: {
    walletChainType: "ethereum-only",
    showWalletLoginFirst: false,
    theme: "light",
  },
  loginMethods: ["email", "google", "wallet"],
  supportedChains: [xrplEvmTestnet, xrplEvmMainnet],
  defaultChain: xrplEvmTestnet,
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    requireUserPasswordOnCreate: false,
    showWalletUIs: true,
  },
};
