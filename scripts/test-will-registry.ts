/**
 * Test the deployed WillRegistry contract (read-only).
 *
 * Contract: lib/modules/contract-generator/contracts/WillRegistry.sol (simplified, flat beneficiaries).
 * Uses NEXT_PUBLIC_WILL_REGISTRY_ADDRESS and WILL_REGISTRY_RPC_URL from .env.local.
 *
 * Usage:
 *   npx tsx scripts/test-will-registry.ts
 *   npx tsx scripts/test-will-registry.ts 0xYourRegistryAddress
 *
 * Exits with non-zero status if any assertion fails (for CI).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, http, type Address } from "viem";
import { xrplEvmTestnet } from "../lib/modules/chain/chains";
import { willRegistryAbi, willRegistryAbiWithNextId } from "../lib/modules/contract-generator/abi";

const DEFAULT_RPC =
  process.env.WILL_REGISTRY_RPC_URL ?? "https://rpc.testnet.xrplevm.org";

const STATUS_NAMES: Record<number, string> = {
  0: "Active",
  1: "DeathDeclared",
  2: "Executed",
};

async function main() {
  const contractAddress = (process.argv[2] ?? process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS) as Address | undefined;
  if (!contractAddress || !contractAddress.startsWith("0x")) {
    console.log("Skipped: set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local or pass registry address to run read-only test.");
    process.exit(0);
  }

  const rpcUrl = process.env.WILL_REGISTRY_RPC_URL ?? DEFAULT_RPC;
  const chain = {
    ...xrplEvmTestnet,
    rpcUrls: { default: { http: [rpcUrl] } },
  };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log("WillRegistry test (read-only, simplified contract)");
  console.log("Contract:", contractAddress);
  console.log("RPC:    ", rpcUrl);
  console.log("");

  try {
    const nextId = await publicClient.readContract({
      address: contractAddress,
      abi: willRegistryAbiWithNextId,
      functionName: "nextWillId",
    });
    const nextIdNum = Number(nextId);
    console.log("1. nextWillId ->", nextIdNum);

    if (nextIdNum < 1) {
      console.log("   No wills registered yet.");
      console.log("\n✅ Contract is reachable. Call createWill from the app to add a will.");
      return;
    }

    const lastWillId = nextIdNum - 1;
    console.log("   Wills on chain: 1 ..", lastWillId);
    console.log("");

    for (let id = 1; id <= lastWillId; id++) {
      const willId = BigInt(id);
      const meta = await publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWill",
        args: [willId],
      });
      const [
        _id,
        creator,
        executor,
        beneficiaries,
        ipfsCid,
        encryptedDocKeyIv,
        generatedContractAddress,
        status,
        createdAt,
        updatedAt,
      ] = meta;
      console.log("2." + id + " getWill(" + id + ")");
      console.log("   creator:", creator);
      console.log("   executor:", executor);
      console.log("   beneficiaries:", (beneficiaries as Address[]).map((a) => a));
      console.log("   ipfsCid:", (ipfsCid as string) || "(empty)");
      console.log("   encryptedDocKeyIv:", (encryptedDocKeyIv as string) ? "[set]" : "(empty)");
      console.log("   generatedContract:", generatedContractAddress ?? "(none)");
      console.log("   status:", STATUS_NAMES[Number(status)] ?? status);
      console.log("   createdAt:", new Date(Number(createdAt) * 1000).toISOString());
      console.log("   updatedAt:", new Date(Number(updatedAt) * 1000).toISOString());
      console.log("");
    }

    if (lastWillId >= 1) {
      const firstWill = await publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWill",
        args: [BigInt(1)],
      });
      const creator = firstWill[1] as Address;
      const executor = firstWill[2] as Address;
      const beneficiaries = firstWill[3] as Address[];

      const byCreator = await publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillIdsByCreator",
        args: [creator],
      });
      const byExecutor = await publicClient.readContract({
        address: contractAddress,
        abi: willRegistryAbi,
        functionName: "getWillIdsByExecutor",
        args: [executor],
      });
      console.log("3. Index lookups");
      console.log("   getWillIdsByCreator(" + creator + ") ->", (byCreator as bigint[]).map(Number));
      console.log("   getWillIdsByExecutor(" + executor + ") ->", (byExecutor as bigint[]).map(Number));

      if (beneficiaries.length > 0) {
        const beneficiary = beneficiaries[0];
        const byBeneficiary = await publicClient.readContract({
          address: contractAddress,
          abi: willRegistryAbi,
          functionName: "getWillIdsByBeneficiary",
          args: [beneficiary],
        });
        console.log("   getWillIdsByBeneficiary(" + beneficiary + ") ->", (byBeneficiary as bigint[]).map(Number));
      }
    }

    console.log("\n✅ WillRegistry read-only test passed.");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      typeof msg === "string" &&
      (msg.includes("will not found") ||
        msg.includes("execution reverted") ||
        msg.includes("ContractFunctionExecutionError"))
    ) {
      console.error("\n❌ Contract call reverted. Ensure the address is the simplified WillRegistry and RPC is correct.");
      console.error("   Redeploy: npx tsx scripts/deploy-sol.ts lib/modules/contract-generator/contracts/WillRegistry.sol");
      console.error("   Then set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local");
    } else {
      console.error("\n❌ Error:", msg);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
