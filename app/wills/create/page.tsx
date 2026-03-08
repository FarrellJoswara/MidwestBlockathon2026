"use client";

import { useState, useRef } from "react";
import { useAccount, useWriteContract, useDeployContract, usePublicClient, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateWillFormParams } from "@/lib/modules/ui";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import { xrplEvmMainnet, xrplEvmTestnet } from "@/lib/modules/chain/chains";
import { generateContractFromParserDataClient } from "@/lib/modules/contract-generator/client-generate";
import { compileContractClient } from "@/lib/modules/contract-generator/client-compile";
import type { ParserOutput } from "@/lib/modules/contract-generator/types";
import type { ParsedWill } from "@/lib/modules/contract-parser/types/will";
import { type Address, decodeErrorResult, getAddress } from "viem";
import { createPublicClient, http } from "viem";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address;
// Backup registry (backupscript.sol) uses the same createWill(executor, beneficiaries, ipfsCid, encryptedDocKeyIv, generatedContractAddress).
// Empty strings for ipfsCid/encryptedDocKeyIv are fine. Run npm run deploy:backup to deploy backup and set this env.

/** Standard Solidity Error(string) for require(msg) reverts */
const ERROR_STRING_ABI = [
  { type: "error" as const, name: "Error", inputs: [{ name: "message", type: "string" }] },
] as const;

/** Extract contract revert reason from viem/wagmi/Privy errors for display. */
function getRevertReason(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  // Direct reason/shortMessage (viem)
  if (e.reason && typeof e.reason === "string") return e.reason;
  if (e.shortMessage && typeof e.shortMessage === "string") {
    const sm = e.shortMessage as string;
    if (!sm.toLowerCase().includes("unknown reason")) return sm;
  }
  // Nested error (e.g. Privy/wallet wraps in .error)
  const inner = e.error as Record<string, unknown> | undefined;
  if (inner && typeof inner === "object") {
    const innerMsg = (inner.message ?? inner.shortMessage ?? inner.reason) as string | undefined;
    if (typeof innerMsg === "string" && innerMsg.length > 0) return innerMsg;
  }
  if (e.message && typeof e.message === "string" && e.message !== "Transaction failed") return e.message;
  const cause = e.cause as unknown;
  if (cause && typeof cause === "object") {
    const c = cause as Record<string, unknown>;
    if (typeof c.reason === "string") return c.reason;
    if (typeof c.shortMessage === "string") return c.shortMessage;
    if (typeof c.message === "string") return c.message;
  }
  // Try to decode raw revert data (Error(string) from require)
  let needle: unknown = err;
  while (needle && typeof needle === "object") {
    const o = needle as Record<string, unknown>;
    const data = o.data ?? o.raw ?? (o as { cause?: { data?: unknown } }).cause?.data ?? (e.transaction as { data?: unknown })?.data;
    if (data && typeof data === "string" && data.startsWith("0x")) {
      try {
        const decoded = decodeErrorResult({ data: data as `0x${string}`, abi: ERROR_STRING_ABI });
        if (decoded.errorName === "Error" && decoded.args?.[0] && typeof decoded.args[0] === "string") return decoded.args[0];
      } catch {
        if (typeof (o.shortMessage ?? o.message) === "string" && String(o.shortMessage ?? o.message).toLowerCase().includes("unknown reason")) {
          console.warn("[CreateWill] Revert data (unable to decode as Error(string)):", data.slice(0, 66) + (data.length > 66 ? "..." : ""));
        }
      }
    }
    needle = (needle as { cause?: unknown }).cause;
  }
  return null;
}

/** One asset row: description + beneficiary + NFT equivalent. */
interface AssetRow {
  assetDescription: string;
  beneficiaryIndex: number;
  nftContractAddress: string;
  nftTokenId: string;
}

export default function CreateWillPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { deployContractAsync } = useDeployContract();
  const publicClient = usePublicClient();
  const publicClientXrplTestnet = usePublicClient({ chainId: xrplEvmTestnet.id });
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [beneficiaryNames, setBeneficiaryNames] = useState<string[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<number[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** After successful WillRegistry.createWill: show tx hash + links before redirect. */
  const [successResult, setSuccessResult] = useState<{
    registryTxHash: string;
    deploymentTxHash?: string;
    contractAddress?: string;
    explorerUrl: string;
  } | null>(null);
  /** Hold last createWill args so we can simulate in catch to get revert reason */
  const lastCreateWillArgsRef = useRef<{
    args: readonly [Address, readonly Address[], string, string, Address];
    receiptClient: ReturnType<typeof createPublicClient>;
  } | null>(null);

  const totalPct = percentages.reduce((s, p) => s + p, 0);
  const validation = validateWillFormParams({
    creator_wallet: address ?? "",
    beneficiary_wallets: beneficiaries,
    beneficiary_percentages: percentages,
  });
  const valid = validation.valid;

  const addBeneficiary = () => {
    setBeneficiaryNames((n) => [...n, ""]);
    setBeneficiaries((b) => [...b, ""]);
    setPercentages((p) => [...p, 0]);
  };

  const updateBeneficiaryName = (i: number, value: string) => {
    setBeneficiaryNames((n) => [...n.slice(0, i), value, ...n.slice(i + 1)]);
  };

  const updateBeneficiary = (i: number, value: string) => {
    setBeneficiaries((b) => [...b.slice(0, i), value, ...b.slice(i + 1)]);
  };

  const updatePercentage = (i: number, value: number) => {
    setPercentages((p) => [...p.slice(0, i), value, ...p.slice(i + 1)]);
  };

  const removeBeneficiary = (i: number) => {
    if (beneficiaries.length <= 1) return;
    setBeneficiaryNames((n) => n.filter((_, j) => j !== i));
    setBeneficiaries((b) => b.filter((_, j) => j !== i));
    setPercentages((p) => p.filter((_, j) => j !== i));
    setAssets((a) =>
      a.map((row) => ({
        ...row,
        beneficiaryIndex:
          row.beneficiaryIndex === i
            ? 0
            : row.beneficiaryIndex > i
              ? row.beneficiaryIndex - 1
              : row.beneficiaryIndex,
      }))
    );
  };

  const addAsset = () => {
    setAssets((a) => [
      ...a,
      {
        assetDescription: "",
        beneficiaryIndex: 0,
        nftContractAddress: "",
        nftTokenId: "",
      },
    ]);
  };

  const updateAsset = (
    i: number,
    field: keyof AssetRow,
    value: string | number
  ) => {
    setAssets((a) =>
      a.map((row, j) => (j === i ? { ...row, [field]: value } : row))
    );
  };

  const removeAsset = (i: number) => {
    if (assets.length <= 1) return;
    setAssets((a) => a.filter((_, j) => j !== i));
  };

  /** Parse percentage from amount string. */
  function parsePercentageFromAmount(
    amount: string | undefined,
    count: number
  ): number {
    if (!amount || count <= 0) return 0;
    const num = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 100) return num;
    return Math.floor(100 / count);
  }

  const analyzeWill = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/wills/parse", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? res.statusText
        );
      }
      const parsed: ParsedWill = await res.json();
      const bens = parsed.beneficiaries ?? [];
      if (bens.length === 0) {
        throw new Error(
          "No beneficiaries found in the will. Please check the document."
        );
      }
      const totalPct = bens.reduce(
        (sum, b) => sum + parsePercentageFromAmount(b.amount, bens.length),
        0
      );
      const pcts =
        totalPct > 0
          ? bens.map((b) =>
              parsePercentageFromAmount(b.amount, bens.length)
            )
          : bens.map(() => Math.floor(100 / bens.length));
      const remainder = 100 - pcts.reduce((s, p) => s + p, 0);
      if (remainder !== 0 && pcts.length > 0) pcts[0] += remainder;

      setBeneficiaryNames(bens.map((b) => b.name));
      setBeneficiaries(bens.map(() => ""));
      setPercentages(pcts);
      setAssets(
        bens.map((b, i) => ({
          assetDescription: b.assetDescription ?? "",
          beneficiaryIndex: i,
          nftContractAddress: "",
          nftTokenId: "",
        }))
      );
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze will");
    } finally {
      setAnalyzing(false);
    }
  };

  /** Build pipeline ParserOutput from current form state. */
  function buildParserOutput(
    wallets: string[],
    pcts: number[]
  ): ParserOutput {
    return {
      testator_name: null,
      testator_address: address ?? null,
      executor_name: null,
      executor_address: address ?? null,
      beneficiaries: wallets.map((w, i) => ({
        name: beneficiaryNames[i]?.trim() ?? "",
        walletAddress: w.trim() || null,
        amount: pcts[i] != null ? `${pcts[i]}%` : null,
      })),
      assets: assets.map((row) => ({
        assetDescription: row.assetDescription.trim() || "",
        beneficiaryWallet:
          beneficiaries[row.beneficiaryIndex]?.trim() || null,
        nftContractAddress: row.nftContractAddress?.trim() || null,
        nftTokenId: row.nftTokenId?.trim() || null,
      })),
      conditions: [],
      additionalInstructions: null,
    };
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !valid) return;
    console.log("[CreateWill] Step 1: Submit started, validating...");
    const wallets = beneficiaries.filter((w) => w.trim().length > 0);
    const pcts = percentages.slice(0, wallets.length);
    const check = validateWillFormParams({
      creator_wallet: address ?? "",
      beneficiary_wallets: wallets,
      beneficiary_percentages: pcts,
    });
    if (!check.valid) {
      setError(check.error ?? "Invalid params");
      setLoading(false);
      return;
    }
    console.log("[CreateWill] Step 2: Validation OK, building parser output");
    setLoading(true);
    setError(null);
    try {
      const parserOutput = buildParserOutput(wallets, pcts);
      console.log("[CreateWill] Step 3a: Generating contract (client)...", {
        beneficiaries: parserOutput.beneficiaries?.length,
        assets: parserOutput.assets?.length,
      });

      const generated = await generateContractFromParserDataClient(parserOutput);
      console.log("[CreateWill] Step 3a OK: Got source, compiling (client)...");

      const compiled = await compileContractClient(generated);
      console.log("[CreateWill] Step 3b OK: Got bytecode/abi, deploying with your wallet (Privy)...");

      const xrplTestnetId = xrplEvmTestnet.id;
      const chainIdHex = `0x${xrplTestnetId.toString(16)}`;

      const ensureXrplTestnet = async () => {
        if (chainId === xrplTestnetId) return;
        const provider = walletClient?.request ? walletClient : null;
        if (provider?.request) {
          try {
            await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: chainIdHex }],
            });
            return;
          } catch (err: unknown) {
            const code = (err as { code?: number }).code;
            if (code === 4902) {
              await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: chainIdHex,
                    chainName: xrplEvmTestnet.name,
                    nativeCurrency: xrplEvmTestnet.nativeCurrency,
                    rpcUrls: [xrplEvmTestnet.rpcUrls.default.http[0]],
                    blockExplorerUrls: xrplEvmTestnet.blockExplorers?.default?.url
                      ? [xrplEvmTestnet.blockExplorers.default.url]
                      : undefined,
                  },
                ],
              });
              await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: chainIdHex }],
              });
              return;
            }
            throw err;
          }
        }
        if (switchChainAsync) {
          await switchChainAsync({ chainId: xrplTestnetId });
          return;
        }
        throw new Error(
          "Please switch your wallet to XRPL EVM Testnet (Chain ID 1449000) before deploying. " +
            "Add the network in your wallet if needed: RPC https://rpc.testnet.xrplevm.org"
        );
      };

      await ensureXrplTestnet();

      const txHashDeploy = await deployContractAsync({
        abi: compiled.abi,
        bytecode: compiled.bytecode as `0x${string}`,
        chainId: xrplTestnetId,
      });
      if (!txHashDeploy) {
        throw new Error("Deployment did not return a transaction hash.");
      }
      if (!publicClient) {
        throw new Error("Cannot wait for receipt: public client not available.");
      }
      // Ensure receipt is from XRPL Testnet so contractAddress is correct for createWill
      const receiptClient =
        publicClientXrplTestnet ??
        createPublicClient({
          chain: xrplEvmTestnet,
          transport: http(xrplEvmTestnet.rpcUrls.default.http[0]),
        });
      const receipt = await receiptClient.waitForTransactionReceipt({ hash: txHashDeploy });
      const contractAddress = receipt.contractAddress;
      if (!contractAddress) {
        throw new Error("Deployment receipt did not contain a contract address.");
      }
      const explorerBase =
        chainId === xrplEvmMainnet.id
          ? xrplEvmMainnet.blockExplorers?.default.url
          : xrplEvmTestnet.blockExplorers?.default.url;
      const explorerUrl = explorerBase ?? "https://explorer.testnet.xrplevm.org";
      const contractUrl = `${explorerUrl}/address/${contractAddress}`;
      const txDeployUrl = `${explorerUrl}/tx/${txHashDeploy}`;
      console.log("[CreateWill] Step 4: Deployed with your wallet", {
        contractAddress,
        transactionHash: txHashDeploy,
        contractName: compiled.contractName,
      });
      console.log(
        "[CreateWill] View contract (click to open):",
        contractUrl
      );
      console.log(
        "[CreateWill] View transaction (click to open):",
        txDeployUrl
      );

      if (!CONTRACT_ADDRESS) {
        console.warn(
          "[CreateWill] WillRegistry not configured (NEXT_PUBLIC_WILL_REGISTRY_ADDRESS missing)."
        );
      }

      let cidStr = "";
      let ivStr = "";

      if (file) {
        console.log("[CreateWill] Step 5: Uploading file to IPFS...");
        const form = new FormData();
        form.append("file", file);
        form.append("will_id", "pending");
        const uploadRes = await fetch("/api/ipfs/upload", {
          method: "POST",
          headers: { "x-wallet-address": address },
          body: form,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(
            "Document upload failed: " + (err.error || uploadRes.statusText)
          );
        }
        const { cid } = await uploadRes.json();
        cidStr = cid;
        console.log("[CreateWill] Step 5 OK: IPFS", { cid });
      } else {
        console.log("[CreateWill] Step 5: No file, skipping IPFS");
      }

      if (CONTRACT_ADDRESS) {
        console.log("[CreateWill] Step 6: Calling WillRegistry.createWill...");
        // msg.sender becomes creator; we pass executor (same wallet), flat beneficiaries, IPFS, generated contract.
        const executorWallet = address ? getAddress(address) : undefined;
        if (!executorWallet || executorWallet === "0x0000000000000000000000000000000000000000") {
          setError("Executor wallet is required.");
          setLoading(false);
          return;
        }
        if (wallets.length === 0) {
          setError("At least one beneficiary wallet is required.");
          setLoading(false);
          return;
        }
        const beneficiaryAddresses = wallets.map((w) => getAddress(w.trim()));
        const createWillArgs = [
          executorWallet,
          beneficiaryAddresses,
          cidStr,
          ivStr,
          contractAddress,
        ] as const;
        // Gas: estimate first; use estimate*1.2 or cap 500k, fallback 300k on estimate failure
        let gasLimit = BigInt(300000);
        try {
          const estimated = await receiptClient.estimateContractGas({
            address: CONTRACT_ADDRESS,
            abi: willRegistryAbi,
            functionName: "createWill",
            args: createWillArgs,
            account: address!,
          });
          if (estimated > BigInt(300000)) {
            gasLimit = estimated * BigInt(120) / BigInt(100);
            if (gasLimit > BigInt(500000)) gasLimit = BigInt(500000);
          }
        } catch {
          // Revert or estimate failure: keep default 300000
        }
        lastCreateWillArgsRef.current = { args: createWillArgs, receiptClient };
        const registryTxHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: willRegistryAbi,
          functionName: "createWill",
          args: createWillArgs,
          chainId: xrplTestnetId,
          gas: gasLimit,
        });
        console.log("[CreateWill] Step 7: Will created on registry", { registryTxHash });
        setSuccessResult({
          registryTxHash,
          deploymentTxHash: txHashDeploy,
          contractAddress,
          explorerUrl,
        });
        // User can click "View my wills" or we redirect after a short delay
      } else {
        console.log("[CreateWill] Step 6/7: No registry — showing alert only");
        alert(
          "Will contract deployed with your wallet: " +
            contractAddress +
            "\n\nIPFS CID: " +
            cidStr +
            "\n\n(WillRegistry not configured; contract address not recorded on-chain.)"
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let reason = getRevertReason(err);
      // Log full structure for debugging (wallet may attach .transaction / .error)
      try {
        const er = err as Record<string, unknown>;
        if (er.transaction !== undefined) console.error("[CreateWill] Error.transaction:", er.transaction);
        if (er.error !== undefined) console.error("[CreateWill] Error.error:", er.error);
      } catch (_) {}
      console.error("[CreateWill] Error:", msg, reason ?? "", err);
      // If no reason yet and we have last args, simulate to get revert reason
      if (!reason && lastCreateWillArgsRef.current && CONTRACT_ADDRESS && address) {
        try {
          await lastCreateWillArgsRef.current.receiptClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: willRegistryAbi,
            functionName: "createWill",
            args: lastCreateWillArgsRef.current.args,
            account: address,
          });
        } catch (simErr: unknown) {
          reason = getRevertReason(simErr) ?? (simErr instanceof Error ? simErr.message : String(simErr));
          console.error("[CreateWill] Simulated createWill (revert reason):", reason);
        }
        lastCreateWillArgsRef.current = null;
      }
      if (reason) {
        setError(`Transaction failed: ${reason}`);
      } else if (msg.includes("Transaction failed") || msg.includes("revert") || msg.includes("execution reverted")) {
        setError(
          "Transaction failed. If you rejected it in your wallet, try again and confirm. Otherwise the contract may have reverted — check the browser console (F12) for details."
        );
      } else {
        setError(msg || "Failed to create will");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Success: show tx hash and links ──────────────────────── */
  if (successResult) {
    const { registryTxHash, deploymentTxHash, contractAddress, explorerUrl } = successResult;
    return (
      <div className="min-h-screen bg-parchment">
        <main className="mx-auto max-w-xl px-6 py-12">
          <div className="card space-y-4 !p-6">
            <h2 className="font-serif text-xl font-bold text-ink-950">
              Will registered on chain
            </h2>
            <p className="text-sm text-ink-600">
              Your will has been uploaded to the Will Registry. You can view the transaction and contract below.
            </p>
            <div className="space-y-3 rounded-lg border border-ink-100 bg-ink-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Registry transaction
              </p>
              <p className="font-mono text-sm break-all text-ink-800">{registryTxHash}</p>
              <a
                href={`${explorerUrl}/tx/${registryTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-wine hover:underline"
              >
                View on block explorer →
              </a>
            </div>
            {contractAddress && (
              <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Will contract address
                </p>
                <p className="font-mono text-sm break-all text-ink-800">{contractAddress}</p>
                <a
                  href={`${explorerUrl}/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-wine hover:underline"
                >
                  View on block explorer →
                </a>
              </div>
            )}
            {deploymentTxHash && (
              <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Deployment transaction
                </p>
                <p className="font-mono text-sm break-all text-ink-800">{deploymentTxHash}</p>
                <a
                  href={`${explorerUrl}/tx/${deploymentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-wine hover:underline"
                >
                  View on block explorer →
                </a>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Link href="/wills" className="btn-wine flex-1 py-2.5 text-center">
                View my wills
              </Link>
              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                className="btn-outlined py-2.5"
              >
                Create another
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Guard: not connected ─────────────────────────────────── */

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-6 py-24 text-center">
        <p className="text-ink-500">
          Connect your wallet to create a will.
        </p>
        <Link href="/" className="btn-outlined mt-6 inline-flex">
          ← Back home
        </Link>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-parchment">
      <main className="mx-auto max-w-xl px-6 py-12">
        <Link
          href="/wills"
          className="text-sm text-ink-500 transition-colors hover:text-ink-900"
        >
          ← Wills
        </Link>
        <h1 className="mt-6 font-serif text-2xl font-bold text-ink-950">
          Create Will
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          You are creating this will as{" "}
          <strong className="text-ink-700">executor</strong>. Upload your
          will document (PDF) and we&apos;ll analyze it to extract
          beneficiaries and assets. Then add wallet addresses and NFT
          details to finalize.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-8">
          {/* ── Upload ────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Will Document (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (!f) setAnalyzed(false);
              }}
              className="mt-2 block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Upload first. After analysis you can add beneficiary wallets
              and NFT assignments.
            </p>
          </div>

          {!analyzed ? (
            <button
              type="button"
              onClick={analyzeWill}
              disabled={!file || analyzing}
              className="btn-primary w-full py-3"
            >
              {analyzing ? "Analyzing…" : "Analyze Will"}
            </button>
          ) : (
            <>
              {/* ── Beneficiaries ──────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Beneficiaries &amp; Allocation (%)
                  </label>
                  <button
                    type="button"
                    onClick={addBeneficiary}
                    className="text-sm text-wine transition-colors hover:text-wine/80"
                  >
                    + Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  Name and wallet for each beneficiary. Total must equal
                  100%.
                </p>

                <div className="mt-4 space-y-3">
                  {beneficiaries.map((w, i) => (
                    <div
                      key={i}
                      className="card space-y-2 !p-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={beneficiaryNames[i] ?? ""}
                          onChange={(e) =>
                            updateBeneficiaryName(i, e.target.value)
                          }
                          placeholder="Name"
                          className="input w-40"
                        />
                        <input
                          type="text"
                          value={w}
                          onChange={(e) =>
                            updateBeneficiary(i, e.target.value)
                          }
                          placeholder="Wallet 0x..."
                          className="input min-w-0 flex-1 font-mono"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={percentages[i] ?? 0}
                          onChange={(e) =>
                            updatePercentage(i, Number(e.target.value))
                          }
                          className="input w-20"
                        />
                        <span className="flex items-center text-ink-400">
                          %
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBeneficiary(i)}
                          className="text-ink-300 transition-colors hover:text-wine"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {Math.abs(totalPct - 100) > 0.01 && (
                  <p className="mt-2 text-sm text-gold">
                    {validation.error ??
                      `Total: ${totalPct}% (must be 100%)`}
                  </p>
                )}
              </div>

              {/* ── Assets ────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Assets from the Will
                  </label>
                  <button
                    type="button"
                    onClick={addAsset}
                    className="text-sm text-wine transition-colors hover:text-wine/80"
                  >
                    + Add asset
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  List each asset as on the will. Then assign the NFT that
                  represents it and who receives it.
                </p>

                <div className="mt-4 space-y-3">
                  {assets.map((row, i) => (
                    <div
                      key={i}
                      className="card space-y-3 !p-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={row.assetDescription}
                          onChange={(e) =>
                            updateAsset(
                              i,
                              "assetDescription",
                              e.target.value
                            )
                          }
                          placeholder="Asset — e.g. the house, the car"
                          className="input min-w-0 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeAsset(i)}
                          className="text-ink-300 transition-colors hover:text-wine"
                          aria-label="Remove asset"
                        >
                          ×
                        </button>
                      </div>

                      <div className="rounded-lg border border-ink-100 bg-ink-50/40 p-3">
                        <p className="mb-2 text-xs font-medium text-ink-400">
                          Assign NFT to this asset
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-ink-400">
                            Assign to:
                          </span>
                          <select
                            value={row.beneficiaryIndex}
                            onChange={(e) =>
                              updateAsset(
                                i,
                                "beneficiaryIndex",
                                Number(e.target.value)
                              )
                            }
                            className="input py-1.5"
                          >
                            {beneficiaries.map((wallet, j) => (
                              <option key={j} value={j}>
                                {beneficiaryNames[j]?.trim() ||
                                  `Wallet ${wallet.slice(0, 10)}...` ||
                                  `Beneficiary ${j + 1}`}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={row.nftContractAddress}
                            onChange={(e) =>
                              updateAsset(
                                i,
                                "nftContractAddress",
                                e.target.value
                              )
                            }
                            placeholder="NFT contract 0x..."
                            className="input min-w-0 flex-1 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={row.nftTokenId}
                            onChange={(e) =>
                              updateAsset(
                                i,
                                "nftTokenId",
                                e.target.value
                              )
                            }
                            placeholder="Token ID"
                            className="input w-24 py-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Submit ────────────────────────────────────── */}
              {error && (
                <p className="rounded-lg bg-wine/5 p-4 text-sm text-wine">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!analyzed || !valid || loading}
                className="btn-wine w-full py-3"
              >
                {loading ? "Creating…" : "Create Will"}
              </button>
            </>
          )}

          {error && !analyzed && (
            <p className="rounded-lg bg-wine/5 p-4 text-sm text-wine">
              {error}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
