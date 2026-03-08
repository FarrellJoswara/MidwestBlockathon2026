/**
 * Deploy a compiled (generated) contract to the chain.
 * Uses viem: wallet from private key, deployContract, then wait for receipt.
 * Default chain: XRPL EVM Testnet.
 *
 * Inputs:
 *   - deployGeneratedContract(compiled, options?): CompiledContract { bytecode, abi, contractName };
 *     optional DeployGeneratedOptions { rpcUrl?, deployerPrivateKey? }
 *
 * Outputs:
 *   - deployGeneratedContract(): DeployResult { contractAddress, transactionHash, contractName }
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { CompiledContract, DeployResult, DeployGeneratedOptions } from "../types";
import { xrplEvmTestnet } from "../../chain/chains";

const DEFAULT_RPC = "https://rpc.testnet.xrplevm.org";

function getChain(rpcUrl: string): Chain {
  const isTestnet = rpcUrl.includes("testnet");
  return {
    ...xrplEvmTestnet,
    id: isTestnet ? 1_449_000 : 1_440_000,
    name: isTestnet ? "XRPL EVM Testnet" : "XRPL EVM Mainnet",
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

/**
 * Deploys compiled contract bytecode to the chain and returns the contract address.
 * Uses options.rpcUrl and options.deployerPrivateKey (or env DEPLOYER_PRIVATE_KEY).
 */
export async function deployGeneratedContract(
  compiled: CompiledContract,
  options?: DeployGeneratedOptions
): Promise<DeployResult> {
  const rpcUrl = options?.rpcUrl ?? process.env.DEPLOY_RPC_URL ?? process.env.RPC_URL ?? process.env.WILL_REGISTRY_RPC_URL ?? DEFAULT_RPC;
  const privateKeyHex = options?.deployerPrivateKey ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error(
      "Deploy requires deployerPrivateKey (options or DEPLOYER_PRIVATE_KEY env)."
    );
  }
  const privateKey = privateKeyHex.startsWith("0x")
    ? (privateKeyHex as Hex)
    : (`0x${privateKeyHex}` as Hex);
  const account = privateKeyToAccount(privateKey);

  const chain = getChain(rpcUrl);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const bytecode = compiled.bytecode.startsWith("0x")
    ? (compiled.bytecode as Hex)
    : (`0x${compiled.bytecode}` as Hex);

  // XRPL EVM has limited gas per tx; set explicit limit so deployment succeeds
  const gasLimit = BigInt(4000000);

  const hash = await walletClient.deployContract({
    abi: compiled.abi,
    account,
    bytecode,
    gas: gasLimit,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;
  if (!contractAddress) {
    throw new Error("Deployment transaction did not create a contract.");
  }
  return {
    contractAddress,
    transactionHash: receipt.transactionHash,
    contractName: compiled.contractName,
  };
}
