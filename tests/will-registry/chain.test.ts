/**
 * Chain module tests: getWillById, getWillsByWallet against a deployed WillRegistry.
 *
 * Run: npx tsx tests/will-registry/chain.test.ts
 * Requires: NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local pointing to a registry with at least one will (id 1).
 * If not set, tests are skipped.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, http, type Address } from "viem";
import { xrplEvmTestnet } from "../../lib/modules/chain/chains";
import { willRegistryAbiWithNextId } from "../../lib/modules/contract-generator/abi";
import { getWillById, getWillsByWallet } from "../../lib/modules/chain";

const RPC = process.env.WILL_REGISTRY_RPC_URL ?? "https://rpc.testnet.xrplevm.org";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const registryAddress = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS;
  if (!registryAddress || !registryAddress.startsWith("0x")) {
    console.log("Skipped: set NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local to run chain module tests.");
    process.exit(0);
  }

  const publicClient = createPublicClient({
    chain: { ...xrplEvmTestnet, rpcUrls: { default: { http: [RPC] } } },
    transport: http(RPC),
  });

  // Get will 1 from contract to know creator, executor, beneficiary
  let creator: Address;
  let executor: Address;
  let beneficiary: Address;
  try {
    const nextId = await publicClient.readContract({
      address: registryAddress as Address,
      abi: willRegistryAbiWithNextId,
      functionName: "nextWillId",
    });
    if (Number(nextId) < 1) {
      console.log("Skipped: registry has no wills. Create a will first.");
      process.exit(0);
    }
    const will1 = await publicClient.readContract({
      address: registryAddress as Address,
      abi: willRegistryAbiWithNextId,
      functionName: "getWill",
      args: [BigInt(1)],
    });
    creator = will1[1] as Address;
    executor = will1[2] as Address;
    const bens = will1[3] as Address[];
    beneficiary = bens[0];
    assert(creator && executor && beneficiary, "will 1 should have creator, executor, beneficiary");
  } catch (e) {
    console.error("Could not read registry (wrong address or RPC?):", e);
    process.exit(1);
  }

  // getWillById("1")
  const will = await getWillById("1");
  assert(will !== null, "getWillById('1') should return a will");
  assert(will!.id === "1", "will.id should be '1'");
  assert(will!.creator_wallet === creator.toLowerCase(), "creator_wallet should match");
  assert(will!.executor_wallet === executor.toLowerCase(), "executor_wallet should match");
  assert(Array.isArray(will!.beneficiary_wallets), "beneficiary_wallets should be array");
  assert(will!.beneficiary_wallets.length >= 1, "at least one beneficiary");
  assert(will!.beneficiary_wallets.includes(beneficiary.toLowerCase()), "beneficiary_wallets should include beneficiary");
  assert(["active", "death_declared", "executed"].includes(will!.status), "status should be valid");
  assert(typeof will!.created_at === "string" && will!.updated_at !== undefined, "timestamps present");
  assert(Array.isArray(will!.pools), "pools should be array (synthetic or empty)");
  console.log("  getWillById('1') OK");

  // getWillsByWallet(creator)
  const byCreator = await getWillsByWallet(creator);
  assert(byCreator.some((w) => w.id === "1"), "getWillsByWallet(creator) should include will 1");
  console.log("  getWillsByWallet(creator) OK");

  // getWillsByWallet(executor)
  const byExecutor = await getWillsByWallet(executor);
  assert(byExecutor.some((w) => w.id === "1"), "getWillsByWallet(executor) should include will 1");
  console.log("  getWillsByWallet(executor) OK");

  // getWillsByWallet(beneficiary)
  const byBeneficiary = await getWillsByWallet(beneficiary);
  assert(byBeneficiary.some((w) => w.id === "1"), "getWillsByWallet(beneficiary) should include will 1");
  console.log("  getWillsByWallet(beneficiary) OK");

  // getWillById("999") should return null (or not exist)
  const missing = await getWillById("999");
  assert(missing === null || Number(missing?.id) !== 999, "getWillById('999') should be null or not will 999");
  console.log("  getWillById missing OK");

  console.log("\n✅ All chain module tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
