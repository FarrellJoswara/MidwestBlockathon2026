/**
 * Deploy the backup WillRegistry (backupscript.sol) and write its address to .env.local.
 * Run: npx tsx scripts/deploy-backup-registry.ts
 * Requires: DEPLOYER_PRIVATE_KEY in .env.local (or uses built-in test key; fund at https://faucet.xrplevm.org/)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { compileContract } from "../lib/modules/contract-generator/pipeline/compile";
import { deployGeneratedContract } from "../lib/modules/contract-generator/pipeline/deploy-generated";

const TEST_DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const BACKUP_SOL = "lib/modules/contract-generator/contracts/backupscript.sol";
const ENV_LOCAL = ".env.local";
const REGISTRY_KEY = "NEXT_PUBLIC_WILL_REGISTRY_ADDRESS";

function extractContractName(source: string): string {
  const match = source.match(/contract\s+(\w+)\s*\{/);
  if (!match) throw new Error("No contract found in source.");
  return match[1];
}

function updateEnvLocal(address: string): void {
  const path = resolve(process.cwd(), ENV_LOCAL);
  let content: string;
  if (existsSync(path)) {
    content = readFileSync(path, "utf-8");
  } else {
    content = "";
  }

  const line = `${REGISTRY_KEY}=${address}`;
  const lines = content.split(/\r?\n/);
  const keyPrefix = REGISTRY_KEY + "=";
  let found = false;
  const newLines = lines.map((l) => {
    if (l.trimStart().startsWith(keyPrefix) || l.trimStart().startsWith(REGISTRY_KEY + " =")) {
      found = true;
      return line;
    }
    return l;
  });
  if (!found) {
    if (newLines.length && !newLines[newLines.length - 1].endsWith("\n") && newLines[newLines.length - 1].length > 0) {
      newLines.push("");
    }
    newLines.push(line);
  }
  writeFileSync(path, newLines.join("\n"), "utf-8");
  console.log("\nUpdated", ENV_LOCAL, "with", REGISTRY_KEY + "=" + address);
}

async function main() {
  const absolutePath = resolve(process.cwd(), BACKUP_SOL);
  console.log("Reading:", absolutePath);
  const source = readFileSync(absolutePath, "utf-8");
  const contractName = extractContractName(source);
  console.log("Contract:", contractName);
  console.log("Compiling...");
  const compiled = await compileContract({ source, contractName });
  console.log("Deploying...");
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? TEST_DEPLOYER_PRIVATE_KEY;
  if (deployerKey === TEST_DEPLOYER_PRIVATE_KEY) {
    console.log("Using built-in test key. Fund at https://faucet.xrplevm.org/ if needed.");
  }
  const result = await deployGeneratedContract(compiled, {
    rpcUrl: process.env.DEPLOY_RPC_URL ?? process.env.RPC_URL,
    deployerPrivateKey: deployerKey,
  });

  const addr = String(result.contractAddress);
  console.log("\n--- Deployed ---");
  console.log("Address:", addr);
  console.log("Tx:     ", result.transactionHash);

  updateEnvLocal(addr);
  console.log("Done. Restart the dev server or refresh so the app picks up the new registry address.");
}

main().catch((e) => {
  const msg = e?.shortMessage ?? e?.message ?? String(e);
  if (
    typeof msg === "string" &&
    (msg.includes("gas required exceeds allowance") ||
      msg.includes("insufficient funds") ||
      msg.includes("exceeds the balance"))
  ) {
    console.error("\nDeploy failed: fund the deployer at https://faucet.xrplevm.org/ and try again.");
  }
  console.error(e);
  process.exit(1);
});
