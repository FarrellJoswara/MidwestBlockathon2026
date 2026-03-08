"use client";

import type { PrivyClientConfig } from "@privy-io/react-auth";
import { xrplEvmMainnet, xrplEvmTestnet } from "@/lib/modules/chain/chains";

export const privyConfig: PrivyClientConfig = {
  appearance: {
    walletChainType: "ethereum-only",
    showWalletLoginFirst: false,
    theme: "light",
    // Exclude Coinbase Smart Wallet (base_account) and detected injected wallets to avoid:
    // - "Cannot set property ethereum of #<Window> which has only a getter" (conflict with extensions/SES)
    // - "The configured chains are not supported by Coinbase Smart Wallet" (XRPL EVM not supported).
    // Users can still use email/google (embedded wallet) and WalletConnect for external wallets.
    walletList: ["wallet_connect_qr"],
  },
  loginMethods: ["email", "google", "wallet"],
  supportedChains: [xrplEvmTestnet, xrplEvmMainnet],
  defaultChain: xrplEvmTestnet,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "all-users",
    },
    showWalletUIs: true,
  },
};
