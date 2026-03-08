/**
 * Test the deployed SimpleStorage contract: read, write, read again.
 *
 * Usage:
 *   npx tsx scripts/test-simple-storage.ts [contractAddress] [value]
 *
 * Examples:
 *   npx tsx scripts/test-simple-storage.ts                    # default address, set 12345
 *   npx tsx scripts/test-simple-storage.ts 20                # default address, set 20 then read
 *   npx tsx scripts/test-simple-storage.ts 0x... 20          # custom address, set 20 then read
 *
 * If no address is given, uses the last deployed address. Uses same RPC as deploy.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xrplEvmTestnet } from "../lib/modules/chain/chains";

const DEFAULT_RPC = "https://rpc.testnet.xrplevm.org";
const TEST_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const SIMPLE_STORAGE_ABI = [
  { inputs: [], name: "favoriteNumber", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "get", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_number", type: "uint256" }], name: "set", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

async function main() {
  const defaultAddress = "0x99bba657f2bbc93c02d617f8ba121cb8fc104acf";
  const a2 = process.argv[2];
  const a3 = process.argv[3];
  let contractAddress: Address;
  let valueToSet: bigint;
  if (a2?.startsWith("0x")) {
    contractAddress = a2 as Address;
    valueToSet = a3 !== undefined ? BigInt(a3) : 12345n;
  } else {
    contractAddress = defaultAddress as Address;
    valueToSet = a2 !== undefined ? BigInt(a2) : 12345n;
  }

  const rpcUrl = process.env.DEPLOY_RPC_URL ?? process.env.RPC_URL ?? process.env.WILL_REGISTRY_RPC_URL ?? DEFAULT_RPC;

  const chain = {
    ...xrplEvmTestnet,
    id: rpcUrl.includes("testnet") ? 1_449_000 : 1_440_000,
    rpcUrls: { default: { http: [rpcUrl] } },
  };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const account = privateKeyToAccount(TEST_PK as `0x${string}`);
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log("Contract:", contractAddress);
  console.log("RPC:    ", rpcUrl);
  console.log("");

  // 1. Read initial value
  const initial = await publicClient.readContract({
    address: contractAddress,
    abi: SIMPLE_STORAGE_ABI,
    functionName: "get",
  });
  console.log("1. Read get() ->", String(initial));

  // 2. Write
  console.log("2. Sending set(" + valueToSet + ")...");
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: SIMPLE_STORAGE_ABI,
    functionName: "set",
    args: [valueToSet],
  });
  console.log("   Tx hash:", hash);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("   Confirmed.");

  // 3. Read again
  const after = await publicClient.readContract({
    address: contractAddress,
    abi: SIMPLE_STORAGE_ABI,
    functionName: "get",
  });
  console.log("3. Read get() ->", String(after));

  const ok = after === valueToSet;
  if (ok) {
    console.log("\n✅ Contract works: get() returned", String(after), "after set(" + valueToSet + ").");
  } else {
    console.log("\n❌ Mismatch: expected", String(valueToSet), "got", String(after));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
