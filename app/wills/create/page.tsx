"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateWillFormParams } from "@/lib/modules/ui";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import type { ParserOutput } from "@/lib/modules/contract-generator/types";
import type { ParsedWill } from "@/lib/modules/contract-parser/types/will";
import { type Address } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address;

/** One asset row: description + beneficiary + NFT equivalent (contract + token ID). */
interface AssetRow {
  assetDescription: string;
  beneficiaryIndex: number;
  nftContractAddress: string;
  nftTokenId: string;
}

export default function CreateWillPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
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
          row.beneficiaryIndex === i ? 0 : row.beneficiaryIndex > i ? row.beneficiaryIndex - 1 : row.beneficiaryIndex,
      }))
    );
  };

  const addAsset = () => {
    setAssets((a) => [
      ...a,
      { assetDescription: "", beneficiaryIndex: 0, nftContractAddress: "", nftTokenId: "" },
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

  /** Parse percentage from amount string (e.g. "50%" -> 50); else return equal share. */
  function parsePercentageFromAmount(amount: string | undefined, count: number): number {
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
      const res = await fetch("/api/wills/parse", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      const parsed: ParsedWill = await res.json();
      const bens = parsed.beneficiaries ?? [];
      if (bens.length === 0) {
        throw new Error("No beneficiaries found in the will. Please check the document.");
      }
      const totalPct = bens.reduce(
        (sum, b) => sum + parsePercentageFromAmount(b.amount, bens.length),
        0
      );
      const pcts =
        totalPct > 0
          ? bens.map((b) => parsePercentageFromAmount(b.amount, bens.length))
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

  /** Build pipeline ParserOutput from current form state (wallets must already be validated). */
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
        beneficiaryWallet: beneficiaries[row.beneficiaryIndex]?.trim() || null,
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
    setLoading(true);
    setError(null);
    try {
      const parserOutput = buildParserOutput(wallets, pcts);

      // 1. Pipeline: generate contract from form data → compile → deploy
      const pipelineRes = await fetch("/api/contract/generate-and-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parserOutput),
      });
      if (!pipelineRes.ok) {
        const errBody = await pipelineRes.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? pipelineRes.statusText);
      }
      const pipelineResult = (await pipelineRes.json()) as {
        contractAddress: string;
        transactionHash: string;
        contractName: string;
      };
      console.log("Generated will contract deployed:", pipelineResult.contractAddress, pipelineResult.transactionHash);

      if (!CONTRACT_ADDRESS) {
        console.warn("Contract address is not defined in environment variables. We will just test the IPFS upload for now.");
      }
      
      let cidStr = "";
      let ivStr = "";

      if (file) {
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
          throw new Error("Document upload failed: " + (err.error || uploadRes.statusText));
        }
        const { cid, iv } = await uploadRes.json();
        console.log("Success! File uploaded and encrypted to IPFS:");
        console.log("CID:", cid);
        console.log("IV:", iv);
        cidStr = cid;
        ivStr = iv;
      }

      if (CONTRACT_ADDRESS) {
        const txHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: willRegistryAbi,
          functionName: "createWill",
          args: [
            address,
            wallets.map((w) => w.trim() as Address),
            pcts.map((p) => BigInt(p)),
            cidStr,
            ivStr,
          ],
        });
        console.log("Will created with tx hash:", txHash);
        if (pipelineResult.contractAddress) {
          console.log("Generated will contract:", pipelineResult.contractAddress);
        }
        router.push("/wills");
      } else {
        alert(
          "Pipeline deployed contract: " +
            pipelineResult.contractAddress +
            "\n\nIPFS Output:\nCID: " +
            cidStr +
            "\nIV: " +
            ivStr +
            "\n\n(Smart contract not deployed)"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create will");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-20 text-center">
        <p className="text-ink-600">Connect your wallet to create a will.</p>
        <Link href="/" className="mt-4 inline-block text-seal hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-ink-200 bg-parchment/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/wills" className="font-semibold text-ink-900">
            ← Wills
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">Create Will</h1>
        <p className="mt-1 text-ink-600">
          You are creating this will as <strong>executor</strong>. Upload your will
          document (PDF) and we will analyze it to extract beneficiaries and assets. Then add wallet addresses and NFT details to complete the will.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink-700">
              Will document (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (!f) setAnalyzed(false);
              }}
              className="mt-1 w-full text-sm text-ink-600"
            />
            <p className="mt-1 text-xs text-ink-500">
              Upload the will PDF first. After analysis, you can add beneficiary wallets and NFT assignments.
            </p>
          </div>

          {!analyzed ? (
            <>
              <button
                type="button"
                onClick={analyzeWill}
                disabled={!file || analyzing}
                className="w-full rounded-lg bg-ink-900 py-3 text-white disabled:opacity-50 hover:bg-ink-800"
              >
                {analyzing ? "Analyzing…" : "Analyze will"}
              </button>
            </>
          ) : (
            <>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-700">
                Beneficiaries & allocation (%)
              </label>
              <button
                type="button"
                onClick={addBeneficiary}
                className="text-sm text-seal hover:underline"
              >
                + Add
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Name/label (e.g. Me, My brother) and wallet for each beneficiary. Total % must equal 100.
            </p>
            <div className="mt-3 space-y-3">
              {beneficiaries.map((w, i) => (
                <div key={i} className="space-y-1 rounded-lg border border-ink-200 bg-white/80 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={beneficiaryNames[i] ?? ""}
                      onChange={(e) => updateBeneficiaryName(i, e.target.value)}
                      placeholder="Name (e.g. Me / My brother)"
                      className="w-48 rounded border border-ink-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={w}
                      onChange={(e) => updateBeneficiary(i, e.target.value)}
                      placeholder="Wallet 0x..."
                      className="min-w-0 flex-1 rounded border border-ink-300 bg-white px-3 py-2 font-mono text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={percentages[i] ?? 0}
                      onChange={(e) => updatePercentage(i, Number(e.target.value))}
                      className="w-20 rounded border border-ink-300 bg-white px-2 py-2 text-sm"
                    />
                    <span className="flex items-center text-ink-500">%</span>
                    <button
                      type="button"
                      onClick={() => removeBeneficiary(i)}
                      className="text-ink-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {Math.abs(totalPct - 100) > 0.01 && (
              <p className="mt-1 text-sm text-amber-700">
                {validation.error ?? `Total: ${totalPct}% (must be 100%)`}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-700">
                Assets from the will
              </label>
              <button
                type="button"
                onClick={addAsset}
                className="text-sm text-seal hover:underline"
              >
                + Add asset
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              List each asset as it appears on the will (IRL only — e.g. &quot;the house&quot;, &quot;the car&quot;). Then assign the NFT that represents it and who receives it.
            </p>
            <div className="mt-3 space-y-3">
              {assets.map((row, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-ink-200 bg-white/80 p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={row.assetDescription}
                      onChange={(e) => updateAsset(i, "assetDescription", e.target.value)}
                      placeholder="Asset from will (IRL) — e.g. the house, the car"
                      className="min-w-0 flex-1 rounded border border-ink-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeAsset(i)}
                      className="text-ink-400 hover:text-red-600"
                      aria-label="Remove asset"
                    >
                      ×
                    </button>
                  </div>
                  <div className="rounded border border-ink-100 bg-ink-50/50 p-2">
                    <p className="mb-1.5 text-xs font-medium text-ink-600">
                      Assign NFT to this asset
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-ink-500">Assign to:</span>
                      <select
                        value={row.beneficiaryIndex}
                        onChange={(e) =>
                          updateAsset(i, "beneficiaryIndex", Number(e.target.value))
                        }
                        className="rounded border border-ink-300 bg-white px-2 py-1.5 text-sm"
                      >
                        {beneficiaries.map((wallet, j) => (
                          <option key={j} value={j}>
                            {beneficiaryNames[j]?.trim() || `Wallet ${wallet.slice(0, 10)}...` || `Beneficiary ${j + 1}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.nftContractAddress}
                        onChange={(e) => updateAsset(i, "nftContractAddress", e.target.value)}
                        placeholder="NFT contract 0x..."
                        className="min-w-0 flex-1 rounded border border-ink-300 bg-white px-3 py-1.5 font-mono text-sm"
                      />
                      <input
                        type="text"
                        value={row.nftTokenId}
                        onChange={(e) => updateAsset(i, "nftTokenId", e.target.value)}
                        placeholder="Token ID"
                        className="w-24 rounded border border-ink-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={!analyzed || !valid || loading}
            className="w-full rounded-lg bg-ink-900 py-3 text-white disabled:opacity-50 hover:bg-ink-800"
          >
            {loading ? "Creating…" : "Create Will"}
          </button>
            </>
          )}

          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
        </form>
      </main>
    </div>
  );
}
