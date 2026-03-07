"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateWillFormParams } from "@/lib/modules/ui";
import { willRegistryAbi } from "@/lib/modules/contract-generator/abi";
import { type Address } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WILL_REGISTRY_ADDRESS as Address;

export default function CreateWillPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();
  const [creatorWallet, setCreatorWallet] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<string[]>(["", ""]);
  const [percentages, setPercentages] = useState<number[]>([50, 50]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPct = percentages.reduce((s, p) => s + p, 0);
  const validation = validateWillFormParams({
    creator_wallet: creatorWallet,
    beneficiary_wallets: beneficiaries,
    beneficiary_percentages: percentages,
  });
  const valid = validation.valid;

  const addBeneficiary = () => {
    setBeneficiaries((b) => [...b, ""]);
    setPercentages((p) => [...p, 0]);
  };

  const updateBeneficiary = (i: number, value: string) => {
    setBeneficiaries((b) => [...b.slice(0, i), value, ...b.slice(i + 1)]);
  };

  const updatePercentage = (i: number, value: number) => {
    setPercentages((p) => [...p.slice(0, i), value, ...p.slice(i + 1)]);
  };

  const removeBeneficiary = (i: number) => {
    if (beneficiaries.length <= 1) return;
    setBeneficiaries((b) => b.filter((_, j) => j !== i));
    setPercentages((p) => p.filter((_, j) => j !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !valid) return;
    const wallets = beneficiaries.filter((w) => w.trim().length > 0);
    const pcts = percentages.slice(0, wallets.length);
    const check = validateWillFormParams({
      creator_wallet: creatorWallet,
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
            creatorWallet.trim() as Address,
            wallets.map((w) => w.trim() as Address),
            pcts.map((p) => BigInt(p)),
            cidStr,
            ivStr,
          ],
        });
        console.log("Will created with tx hash:", txHash);
        router.push("/wills");
      } else {
        alert("IPFS Output:\nCID: " + cidStr + "\nIV: " + ivStr + "\n\n(Smart contract not deployed)");
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
          You are creating this will as <strong>executor</strong>. Enter the will
          creator wallet and beneficiaries.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink-700">
              Will creator wallet address
            </label>
            <input
              type="text"
              value={creatorWallet}
              onChange={(e) => setCreatorWallet(e.target.value)}
              placeholder="0x..."
              className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700">
              Will document (PDF, optional)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm text-ink-600"
            />
          </div>
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
            <p className="mt-1 text-xs text-ink-500">Total must equal 100%</p>
            <div className="mt-3 space-y-3">
              {beneficiaries.map((w, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={w}
                    onChange={(e) => updateBeneficiary(i, e.target.value)}
                    placeholder="0x..."
                    className="flex-1 rounded border border-ink-300 bg-white px-3 py-2 font-mono text-sm"
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
              ))}
            </div>
            {Math.abs(totalPct - 100) > 0.01 && (
              <p className="mt-1 text-sm text-amber-700">
                {validation.error ?? `Total: ${totalPct}% (must be 100%)`}
              </p>
            )}
          </div>
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={!valid || loading}
            className="w-full rounded-lg bg-ink-900 py-3 text-white disabled:opacity-50 hover:bg-ink-800"
          >
            {loading ? "Creating…" : "Create Will"}
          </button>
        </form>
      </main>
    </div>
  );
}
