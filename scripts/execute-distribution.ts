/**
 * Execute distribution for a will: call the generated contract's execute()
 * (transfers assets to beneficiaries), then markExecuted(willId) on the registry.
 *
 * Usage:
 *   EXECUTOR_PRIVATE_KEY=0x... npx tsx scripts/execute-distribution.ts <willId>
 *
 * Requires:
 *   - NEXT_PUBLIC_WILL_REGISTRY_ADDRESS and WILL_REGISTRY_RPC_URL (or default XRPL testnet)
 *   - EXECUTOR_PRIVATE_KEY (executor wallet that will sign the txs)
 */

import "dotenv/config";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xrplEvmTestnet } from "../lib/modules/chain/chains";
import { getWillById } from "../lib/modules/chain";
import { willRegistryAbi } from "../lib/modules/contract-generator/abi";
import { generatedWillAbi } from "../lib/modules/contract-generator/generated-will-abi";
import type { Address } from "viem";

const willId = process.argv[2];
const rpcUrl =
  process.env.WILL_REGISTRY_RPC_URL ?? xrplEvmTestnet.rpcUrls.default.http[0];
const registryAddress = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as
  | Address
  | undefined;
const executorKey = process.env.EXECUTOR_PRIVATE_KEY as `0x${string}` | undefined;

async function main() {
  if (!willId) {
    console.error("Usage: EXECUTOR_PRIVATE_KEY=0x... npx tsx scripts/execute-distribution.ts <willId>");
    process.exit(1);
  }
  if (!registryAddress) {
    console.error("Missing NEXT_PUBLIC_WILL_REGISTRY_ADDRESS");
    process.exit(1);
  }
  if (!executorKey) {
    console.error("Missing EXECUTOR_PRIVATE_KEY (executor wallet)");
    process.exit(1);
  }

  const publicClient = createPublicClient({
    chain: xrplEvmTestnet,
    transport: http(rpcUrl),
  });
  const account = privateKeyToAccount(executorKey);
  const walletClient = createWalletClient({
    account,
    chain: xrplEvmTestnet,
    transport: http(rpcUrl),
  });

  const will = await getWillById(willId);
  if (!will) {
    console.error("Will not found:", willId);
    process.exit(1);
  }
  if (will.status !== "death_declared") {
    console.error("Will status is", will.status, "- must be death_declared first.");
    process.exit(1);
  }
  if (!will.generated_contract_address || will.generated_contract_address === "0x0000000000000000000000000000000000000000") {
    console.error("Will has no generated contract address. Create the will with a generated contract first.");
    process.exit(1);
  }
  if (will.executor_wallet !== account.address.toLowerCase()) {
    console.error("EXECUTOR_PRIVATE_KEY does not match will executor:", will.executor_wallet);
    process.exit(1);
  }

  const generatedAddress = will.generated_contract_address as Address;

  console.log("Will", willId, "| Executor:", account.address, "| Generated contract:", generatedAddress);
  console.log("1. Calling execute() on generated contract...");
  const executeHash = await walletClient.writeContract({
    address: generatedAddress,
    abi: generatedWillAbi,
    functionName: "execute",
    args: [],
    gas: BigInt(500000),
  });
  console.log("   Tx hash:", executeHash);
  const executeReceipt = await publicClient.waitForTransactionReceipt({ hash: executeHash });
  if (executeReceipt.status !== "success") {
    console.error("   execute() tx failed");
    process.exit(1);
  }
  console.log("   execute() confirmed.");

  console.log("2. Calling markExecuted(" + willId + ") on registry...");
  const markHash = await walletClient.writeContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "markExecuted",
    args: [BigInt(willId)],
    gas: BigInt(100000),
  });
  console.log("   Tx hash:", markHash);
  const markReceipt = await publicClient.waitForTransactionReceipt({ hash: markHash });
  if (markReceipt.status !== "success") {
    console.error("   markExecuted() tx failed");
    process.exit(1);
  }
  console.log("   markExecuted() confirmed.");
  console.log("Done. Will", willId, "is now executed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
