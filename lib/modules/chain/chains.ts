import { defineChain } from "viem";

/** XRPL EVM Sidechain Mainnet - https://docs.xrplevm.org */
export const xrplEvmMainnet = defineChain({
  id: 1_440_000,
  name: "XRPL EVM Mainnet",
  nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xrplevm.org"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.xrplevm.org" },
  },
});

/** XRPL EVM Sidechain Testnet - https://docs.xrplevm.org */
export const xrplEvmTestnet = defineChain({
  id: 1_449_000,
  name: "XRPL EVM Testnet",
  nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.xrplevm.org"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.xrplevm.org" },
  },
});
