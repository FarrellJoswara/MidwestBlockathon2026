"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import Link from "next/link";
import { PrivyConnectButton } from "@/components/layout/PrivyConnectButton";

const DEFAULT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 public favoriteNumber;

    function set(uint256 _number) public {
        favoriteNumber = _number;
    }

    function get() public view returns (uint256) {
        return favoriteNumber;
    }
}`;

export default function DeployPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [compiled, setCompiled] = useState<{ bytecode: string; abi: unknown[]; contractName: string } | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [result, setResult] = useState<{ contractAddress: string; txHash: string } | null>(null);

  const handleCompile = async () => {
    setCompileError(null);
    setResult(null);
    try {
      const res = await fetch("/api/contract/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compile failed");
      setCompiled({ bytecode: data.bytecode, abi: data.abi, contractName: data.contractName });
    } catch (e) {
      setCompiled(null);
      setCompileError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeploy = async () => {
    if (!compiled || !walletClient?.account || !publicClient) {
      setDeployError("Connect your wallet and compile first.");
      return;
    }
    setDeploying(true);
    setDeployError(null);
    setResult(null);
    try {
      const hash = await walletClient.deployContract({
        abi: compiled.abi,
        bytecode: compiled.bytecode as `0x${string}`,
        account: walletClient.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const contractAddress = receipt.contractAddress;
      if (!contractAddress) throw new Error("No contract address in receipt");
      setResult({ contractAddress, txHash: hash });
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeploying(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-parchment">
        <header className="border-b border-ink-200 bg-parchment/95">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="font-semibold text-ink-900">◆ dihhapp</Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-ink-600">Connect your wallet to deploy a contract (your Privy wallet will sign the transaction).</p>
          <div className="mt-4 flex justify-center gap-4">
            <PrivyConnectButton />
            <Link href="/" className="text-seal hover:underline">← Back home</Link>
          </div>
        </main>
      </div>
    );
  }

  const explorerUrl = "https://explorer.testnet.xrplevm.org";
  return (
    <div className="min-h-screen bg-parchment">
      <header className="sticky top-0 z-50 border-b border-ink-200 bg-parchment/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-ink-900">◆ dihhapp</Link>
          <Link href="/wills" className="text-seal hover:underline">← Wills</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">Deploy contract</h1>
        <p className="mt-1 text-ink-600">
          The contract will be deployed by your connected Privy wallet: <span className="font-mono text-sm">{address.slice(0, 10)}…{address.slice(-8)}</span>
        </p>

        <div className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-ink-700">Solidity source (single contract, no imports)</label>
          <textarea
            value={source}
            onChange={(e) => { setSource(e.target.value); setCompiled(null); setCompileError(null); }}
            rows={14}
            className="w-full rounded-lg border border-ink-300 bg-white p-3 font-mono text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCompile}
              className="rounded-lg bg-ink-200 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ink-300"
            >
              Compile
            </button>
            <button
              type="button"
              onClick={handleDeploy}
              disabled={!compiled || deploying}
              className="rounded-lg bg-seal px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-seal/90"
            >
              {deploying ? "Deploying…" : "Deploy with my wallet"}
            </button>
          </div>
          {compileError && <p className="text-sm text-red-600">{compileError}</p>}
          {compiled && <p className="text-sm text-green-700">Compiled: {compiled.contractName}</p>}
          {deployError && <p className="text-sm text-red-600">{deployError}</p>}
          {result && (
            <div className="rounded-lg border border-ink-200 bg-white/80 p-4">
              <p className="font-medium text-ink-900">Deployed</p>
              <p className="mt-1 font-mono text-sm text-ink-700">Contract: {result.contractAddress}</p>
              <p className="mt-1 font-mono text-sm text-ink-700">Tx: {result.txHash}</p>
              <p className="mt-2 text-sm">
                <a href={`${explorerUrl}/address/${result.contractAddress}`} target="_blank" rel="noreferrer" className="text-seal hover:underline">View contract on explorer</a>
                {" · "}
                <a href={`${explorerUrl}/tx/${result.txHash}`} target="_blank" rel="noreferrer" className="text-seal hover:underline">View transaction</a>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
