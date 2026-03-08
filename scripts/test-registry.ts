import { config } from "dotenv";
config({ path: ".env.local" });

import { createWalletClient, http, publicActions, getContract, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xrplEvmTestnet } from "../lib/modules/chain/chains";

// The address you deployed the WillRegistry to
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS;

const ABI = parseAbi([
  "function createWill(address creatorWallet, address executorWallet, address[] beneficiaryWallets, uint256[] beneficiaryPercentages, string ipfsCid, string encryptedDocKeyIv) returns (uint256)",
  "function getWill(uint256 willId) view returns (uint256 id, address creatorWallet, address executorWallet, address[] beneficiaryWallets, uint256[] beneficiaryPercentages, string ipfsCid, string encryptedDocKeyIv, uint8 status, uint256 createdAt, uint256 updatedAt)",
  "function getWillIdsByCreator(address creator) view returns (uint256[])"
]);

// Test account
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  if (!REGISTRY_ADDRESS) {
    throw new Error("Missing NEXT_PUBLIC_WILL_REGISTRY_ADDRESS in .env.local");
  }

  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  console.log(`Testing with Account: ${account.address}`);

  const client = createWalletClient({
    account,
    chain: xrplEvmTestnet,
    transport: http(process.env.RPC_URL || "https://rpc.testnet.xrplevm.org"),
  }).extend(publicActions);

  const registry = getContract({
    address: REGISTRY_ADDRESS as `0x${string}`,
    abi: ABI,
    client: client,
  });

  console.log("\n1. Creating a new Will...");
  
  // Dummy test data simulating a real user upload
  const creator = account.address; // The logged-in user
  const executor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Some lawyer/executor
  const beneficiaries = ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"]; // E.g., a child
  const percentages = [100n]; // 100%
  const dummyCid = "QmTestHash1234567890"; // From IPFS
  const dummyIv = "TestIV-Base64-123"; // From Encryption

  const txHash = await registry.write.createWill([
    creator,
    executor,
    beneficiaries,
    percentages,
    dummyCid,
    dummyIv
  ]);

  console.log(`Transaction sent! Waiting for confirmation... Hash: ${txHash}`);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

  console.log("\n2. Fetching Wills for the Creator...");
  const willIds = await registry.read.getWillIdsByCreator([creator]);
  console.log(`Found ${willIds.length} wills for creator ${creator}`);
  
  if (willIds.length > 0) {
    const latestWillId = willIds[willIds.length - 1];
    console.log(`\n3. Fetching details for Will ID: ${latestWillId}`);
    
    // The tuple returned by getWill is broken into an array of values by viem
    const willInfo = await registry.read.getWill([latestWillId]);
    console.log("Will Data on Blockchain:");
    console.log(`- ID: ${willInfo[0]}`);
    console.log(`- Creator: ${willInfo[1]}`);
    console.log(`- Executor: ${willInfo[2]}`);
    console.log(`- Beneficiaries: ${willInfo[3]}`);
    console.log(`- Percentages: ${willInfo[4]}`);
    console.log(`- IPFS CID: ${willInfo[5]}`);
    console.log(`- Encryption IV: ${willInfo[6]}`);
    console.log(`- Status (0=Active, 1=DeathDeclared, 2=Executed): ${willInfo[7]}`);
  }
}

main().catch(console.error);
