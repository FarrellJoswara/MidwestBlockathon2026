/**
 * ─────────────────────────────────────────────────────────────────────
 *  Deploy .sol script — compile any single-file Solidity contract and deploy
 *  to XRPL EVM (testnet by default).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  HOW TO RUN:
 *    1. (Optional) Set DEPLOYER_PRIVATE_KEY in .env.local to use your own wallet.
 *       Otherwise the script uses a built-in TEST key below (for local testing only).
 *    2. If using the TEST key, fund that address from the faucet first (see below).
 *    3. Run:
 *         npx tsx scripts/deploy-sol.ts
 *         npx tsx scripts/deploy-sol.ts path/to/Contract.sol
 *
 *  FAUCET (XRPL EVM Testnet):
 *    https://faucet.xrplevm.org/
 *    — Connect wallet or paste the test address; claim up to 90 XRP per request.
 *    Other options: XRPL EVM Discord #faucet, or Telegram @XrplEvmFaucetBot
 *
 *  ENV (optional):
 *    DEPLOYER_PRIVATE_KEY  — if set, used instead of the built-in test key.
 *    DEPLOY_RPC_URL / RPC_URL — optional; defaults to XRPL EVM Testnet.
 * ─────────────────────────────────────────────────────────────────────
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { compileContract } from "../lib/modules/contract-generator/pipeline/compile";
import { deployGeneratedContract } from "../lib/modules/contract-generator/pipeline/deploy-generated";

/** Test-only private key (do not use with real funds). Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 — fund it at https://faucet.xrplevm.org/ */
const TEST_DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const DEFAULT_SOL =
  "lib/modules/contract-generator/contracts/WillRegistry.sol";

function extractContractName(source: string): string {
  const match = source.match(/contract\s+(\w+)\s*\{/);
  if (!match) throw new Error("No contract found in source (expect 'contract Name {').");
  return match[1];
}

async function main() {
  const solPath = process.argv[2] ?? DEFAULT_SOL;
  const absolutePath = resolve(process.cwd(), solPath);

  console.log("Reading:", absolutePath);
  let source: string;
  try {
    source = readFileSync(absolutePath, "utf-8");
  } catch (e) {
    console.error("Failed to read file:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const contractName = extractContractName(source);
  console.log("Contract name:", contractName);
  console.log("Compiling...");
  const compiled = await compileContract({ source, contractName });
  console.log("Compiled:", compiled.contractName, "bytecode length:", compiled.bytecode.length);

  console.log("Deploying...");
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? TEST_DEPLOYER_PRIVATE_KEY;
  if (deployerKey === TEST_DEPLOYER_PRIVATE_KEY) {
    console.log("Using built-in test key (address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266). Fund at https://faucet.xrplevm.org/ if needed.");
  }
  const result = await deployGeneratedContract(compiled, {
    rpcUrl: process.env.DEPLOY_RPC_URL ?? process.env.RPC_URL,
    deployerPrivateKey: deployerKey,
  });

  console.log("\n--- Deployed ---");
  console.log("Contract:", result.contractName);
  console.log("Address: ", result.contractAddress);
  console.log("Tx hash: ", result.transactionHash);
  const baseUrl = (process.env.DEPLOY_RPC_URL ?? process.env.RPC_URL ?? "").includes("testnet")
    ? "https://explorer.testnet.xrplevm.org"
    : "https://explorer.xrplevm.org";
  console.log("\nView on chain:");
  console.log("  Contract:", `${baseUrl}/address/${result.contractAddress}`);
  console.log("  Tx:      ", `${baseUrl}/tx/${result.transactionHash}`);
}

main().catch((e) => {
  const msg = e?.shortMessage ?? e?.message ?? String(e);
  if (
    typeof msg === "string" &&
    (msg.includes("gas required exceeds allowance") ||
      msg.includes("insufficient funds") ||
      msg.includes("exceeds the balance"))
  ) {
    console.error(
      "\nDeployment failed: deployer account has insufficient XRP for gas. Fund the deployer at https://faucet.xrplevm.org/ and try again."
    );
  }
  console.error(e);
  process.exit(1);
});
