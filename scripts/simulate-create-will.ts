/**
 * Simulate WillRegistry.createWill with the same args the create page sends.
 * Run: npx tsx scripts/simulate-create-will.ts
 * Uses NEXT_PUBLIC_WILL_REGISTRY_ADDRESS from .env.local.
 *
 * New signature: createWill(executor, beneficiaries[], ipfsCid, encryptedDocKeyIv, generatedContractAddress)
 * msg.sender becomes creator.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, http, type Address } from "viem";
import { xrplEvmTestnet } from "../lib/modules/chain/chains";
import { willRegistryAbi } from "../lib/modules/contract-generator/abi";

const REGISTRY = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address | undefined;
const RPC = process.env.WILL_REGISTRY_RPC_URL ?? "https://rpc.testnet.xrplevm.org";

// Test addresses (no real tx; simulation only). Account = msg.sender = creator.
const CREATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const BENEFICIARY = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

async function main() {
  if (!REGISTRY || !REGISTRY.startsWith("0x")) {
    console.log("Skipped: set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local to run createWill simulations.");
    process.exit(0);
  }

  const client = createPublicClient({
    chain: { ...xrplEvmTestnet, rpcUrls: { default: { http: [RPC] } } },
    transport: http(RPC),
  });

  const ipfsCid = "";
  const encryptedDocKeyIv = "";
  const generatedContractAddress = ZERO;

  // Same shape as app: executor = creator (same wallet), flat beneficiaries
  const executor = CREATOR;
  const beneficiaries: readonly Address[] = [BENEFICIARY];

  console.log("Simulating createWill (1 beneficiary, empty cid, zero generatedContractAddress)...");
  console.log("  account (creator):", CREATOR);
  console.log("  executor:", executor);
  console.log("  beneficiaries:", beneficiaries);
  console.log("  generatedContractAddress:", generatedContractAddress);

  try {
    const { result, request } = await client.simulateContract({
      address: REGISTRY,
      abi: willRegistryAbi,
      functionName: "createWill",
      args: [
        executor,
        [...beneficiaries],
        ipfsCid,
        encryptedDocKeyIv,
        generatedContractAddress,
      ],
      account: CREATOR,
    });
    console.log("\n✅ Simulation 1 succeeded. Returned will id:", String(result));
    console.log("  Request (for writeContract):", !!request);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("\n❌ Simulation 1 failed:", msg);
    if (e && typeof e === "object" && "cause" in e) {
      console.error("  cause:", (e as { cause: unknown }).cause);
    }
    process.exit(1);
  }

  // Simulation 2: two beneficiaries (same edge case: empty cid, zero generatedContractAddress)
  const BENEFICIARY2 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address;
  const beneficiaries2: readonly Address[] = [BENEFICIARY, BENEFICIARY2];

  console.log("\nSimulating createWill (2 beneficiaries)...");
  console.log("  beneficiaries:", beneficiaries2);

  try {
    const { result } = await client.simulateContract({
      address: REGISTRY,
      abi: willRegistryAbi,
      functionName: "createWill",
      args: [
        executor,
        [...beneficiaries2],
        ipfsCid,
        encryptedDocKeyIv,
        generatedContractAddress,
      ],
      account: CREATOR,
    });
    console.log("✅ Simulation 2 succeeded. Returned will id:", String(result));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("\n❌ Simulation 2 failed:", msg);
    if (e && typeof e === "object" && "cause" in e) {
      console.error("  cause:", (e as { cause: unknown }).cause);
    }
    process.exit(1);
  }

  // Simulation 3: empty beneficiaries should revert (EmptyBeneficiaries)
  console.log("\nSimulating createWill (empty beneficiaries — should revert)...");

  try {
    await client.simulateContract({
      address: REGISTRY,
      abi: willRegistryAbi,
      functionName: "createWill",
      args: [
        executor,
        [],
        ipfsCid,
        encryptedDocKeyIv,
        generatedContractAddress,
      ],
      account: CREATOR,
    });
    console.error("❌ Expected revert (EmptyBeneficiaries), but simulation succeeded.");
    process.exit(1);
  } catch {
    console.log("✅ Simulation 3 reverted as expected (empty beneficiaries).");
  }

  // Simulation 4: zero executor should revert (InvalidExecutor)
  console.log("\nSimulating createWill (zero executor — should revert)...");

  try {
    await client.simulateContract({
      address: REGISTRY,
      abi: willRegistryAbi,
      functionName: "createWill",
      args: [
        ZERO,
        [...beneficiaries],
        ipfsCid,
        encryptedDocKeyIv,
        generatedContractAddress,
      ],
      account: CREATOR,
    });
    console.error("❌ Expected revert (InvalidExecutor), but simulation succeeded.");
    process.exit(1);
  } catch {
    console.log("✅ Simulation 4 reverted as expected (zero executor).");
  }

  console.log("\n✅ All createWill simulations passed.");
}

main();
