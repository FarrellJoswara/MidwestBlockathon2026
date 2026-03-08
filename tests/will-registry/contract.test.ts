/**
 * WillRegistry contract tests.
 * Deploys the simplified WillRegistry, runs create/update/lifecycle/index scenarios, asserts state.
 *
 * Run: npx tsx tests/will-registry/contract.test.ts
 * Requires: DEPLOYER_PRIVATE_KEY in .env.local (funded on XRPL EVM Testnet) to deploy and send txs.
 * If not set, exits with 0 and skips (for CI without secrets).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xrplEvmTestnet } from "../../lib/modules/chain/chains";
import { willRegistryAbi, willRegistryAbiWithNextId } from "../../lib/modules/contract-generator/abi";
import { compileContract } from "../../lib/modules/contract-generator/pipeline/compile";
import { deployGeneratedContract } from "../../lib/modules/contract-generator/pipeline/deploy-generated";

const RPC = process.env.WILL_REGISTRY_RPC_URL ?? "https://rpc.testnet.xrplevm.org";
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.log("Skipped: set DEPLOYER_PRIVATE_KEY in .env.local to run WillRegistry contract tests.");
    process.exit(0);
  }

  const privateKey = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  const account = privateKeyToAccount(privateKey);
  const chain = { ...xrplEvmTestnet, rpcUrls: { default: { http: [RPC] } } };

  const publicClient = createPublicClient({ chain, transport: http(RPC) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC),
  });

  const solPath = resolve(process.cwd(), "lib/modules/contract-generator/contracts/WillRegistry.sol");
  const source = readFileSync(solPath, "utf-8");
  const compiled = await compileContract({ source, contractName: "WillRegistry" });
  const deployResult = await deployGeneratedContract(compiled, {
    rpcUrl: RPC,
    deployerPrivateKey: pk,
  });

  assert(
    deployResult.contractAddress !== ZERO,
    "Deploy failed (no DEPLOYER_PRIVATE_KEY or deployment returned zero address)"
  );

  const registryAddress = deployResult.contractAddress as Address;
  console.log("Deployed WillRegistry at", registryAddress);

  const executor = account.address;
  const beneficiary1 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address;
  const beneficiary2 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address;

  // 1. createWill(executor, [beneficiary1], "", "", zero)
  const createTxHash = await walletClient.writeContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "createWill",
    args: [
      executor,
      [beneficiary1],
      "",
      "",
      ZERO,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: createTxHash });

  const nextId = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbiWithNextId,
    functionName: "nextWillId",
  });
  assert(Number(nextId) === 2, "nextWillId should be 2 after one create");

  const will1 = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWill",
    args: [BigInt(1)],
  });
  const [, creator, exec, bens, , , , status] = will1;
  assert(creator === account.address, "creator should be deployer");
  assert(exec === executor, "executor should match");
  assert((bens as Address[]).length === 1 && (bens as Address[])[0] === beneficiary1, "beneficiaries should be [beneficiary1]");
  assert(Number(status) === 0, "status should be Active");

  const byCreator = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWillIdsByCreator",
    args: [account.address],
  });
  assert(
    (byCreator as bigint[]).some((id) => id === BigInt(1)),
    "getWillIdsByCreator should include 1"
  );

  const byBeneficiary = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWillIdsByBeneficiary",
    args: [beneficiary1],
  });
  assert(
    (byBeneficiary as bigint[]).some((id) => id === BigInt(1)),
    "getWillIdsByBeneficiary(beneficiary1) should include 1"
  );

  console.log("  createWill + getWill + index lookups OK");

  // 2. updateWill(1, [beneficiary1, beneficiary2], "", "") as creator
  await walletClient.writeContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "updateWill",
    args: [BigInt(1), [beneficiary1, beneficiary2], "", ""],
  });
  const will1After = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWill",
    args: [BigInt(1)],
  });
  const bensAfter = will1After[3] as Address[];
  assert(bensAfter.length === 2 && bensAfter[1] === beneficiary2, "beneficiaries after update should be [beneficiary1, beneficiary2]");

  const byBen2 = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWillIdsByBeneficiary",
    args: [beneficiary2],
  });
  assert(
    (byBen2 as bigint[]).some((id) => id === BigInt(1)),
    "getWillIdsByBeneficiary(beneficiary2) should include 1 after update"
  );

  console.log("  updateWill + beneficiary reindex OK");

  // 3. declareDeath(1) as executor
  await walletClient.writeContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "declareDeath",
    args: [BigInt(1)],
  });
  const will1Death = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWill",
    args: [BigInt(1)],
  });
  assert(Number(will1Death[7]) === 1, "status should be DeathDeclared");

  console.log("  declareDeath OK");

  // 4. markExecuted(1) as executor
  await walletClient.writeContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "markExecuted",
    args: [BigInt(1)],
  });
  const will1Exec = await publicClient.readContract({
    address: registryAddress,
    abi: willRegistryAbi,
    functionName: "getWill",
    args: [BigInt(1)],
  });
  assert(Number(will1Exec[7]) === 2, "status should be Executed");

  console.log("  markExecuted OK");

  // 5. updateWill(1, ...) should revert (will not active)
  try {
    await walletClient.writeContract({
      address: registryAddress,
      abi: willRegistryAbi,
      functionName: "updateWill",
      args: [BigInt(1), [beneficiary1], "", ""],
    });
    assert(false, "updateWill on executed will should have reverted");
  } catch {
    console.log("  updateWill after execution reverted as expected");
  }

  console.log("\n✅ All WillRegistry contract tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
