"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/modules/api";
import { executorApiPaths } from "@/lib/modules/executor";
import type { Will } from "@/lib/modules/types";
import { useEffect } from "react";
import { useDeclareDeath } from "@/lib/modules/contract-generator/hooks/useDeclareDeath";

interface ExecutorDashboardProps {
  will: Will;
}

export function ExecutorDashboard({ will }: ExecutorDashboardProps) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [declareConfirm, setDeclareConfirm] = useState(false);
  const [distributeConfirm, setDistributeConfirm] = useState(false);

  const {
    declareDeath: declareDeathOnChain,
    hash: declareDeathHash,
    isWritePending,
    isConfirming,
    isSuccess,
    error: declareDeathError,
  } = useDeclareDeath();

  const declareDeathSync = useMutation({
    mutationFn: (txHash: string) =>
      apiFetch(executorApiPaths.declareDeath(will.id), {
        method: "POST",
        wallet: address ?? undefined,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txHash }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["will", will.id, address] });
      setDeclareConfirm(false);
    },
  });

  const distribute = useMutation({
    mutationFn: () =>
      apiFetch(executorApiPaths.distribute(will.id), {
        method: "POST",
        wallet: address ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["will", will.id, address] });
      setDistributeConfirm(false);
    },
  });

  useEffect(() => {
    if (isSuccess && declareDeathHash && !declareDeathSync.isPending) {
      declareDeathSync.mutate(declareDeathHash);
    }
  }, [isSuccess, declareDeathHash, declareDeathSync]);

  const downloadDoc = () => {
    if (!will.ipfs_cid || !will.encrypted_doc_key_iv || !address) return;
    const url = `/api/ipfs/${encodeURIComponent(will.ipfs_cid)}?will_id=${encodeURIComponent(will.id)}&iv=${encodeURIComponent(will.encrypted_doc_key_iv)}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "will-document.pdf");
    a.style.display = "none";
    document.body.appendChild(a);
    const headers = new Headers();
    headers.set("x-wallet-address", address);
    fetch(url, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.click();
        URL.revokeObjectURL(u);
      })
      .finally(() => a.remove());
  };

  /* ── Status display ──────────────────────────────────────── */
  const statusColor =
    will.status === "active"
      ? "text-emerald"
      : will.status === "death_declared"
        ? "text-gold"
        : "text-ink-500";

  return (
    <div className="space-y-6">
      {/* ── Will info ──────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Will Information
        </h2>
        <dl className="mt-5 grid gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Creator
            </dt>
            <dd className="mt-0.5 font-mono text-ink-800">
              {will.creator_wallet}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Executor (you)
            </dt>
            <dd className="mt-0.5 font-mono text-ink-800">
              {will.executor_wallet}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Status
            </dt>
            <dd className={`mt-0.5 font-medium ${statusColor}`}>
              {will.status}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Document ───────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Document
        </h2>
        {will.ipfs_cid ? (
          <div className="mt-4 flex items-center gap-4">
            <p className="text-sm text-ink-500">Stored on IPFS (encrypted)</p>
            <button type="button" onClick={downloadDoc} className="btn-outlined text-xs">
              Download PDF
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">No document uploaded yet.</p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          To upload a new version, update the will from the create flow or a
          future &ldquo;Replace document&rdquo; action.
        </p>
      </section>

      {/* ── Beneficiaries ──────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Beneficiaries
        </h2>
        <ul className="mt-4 divide-y divide-ink-100">
          {will.beneficiary_wallets.map((w, i) => (
            <li key={w} className="flex justify-between py-2.5 text-sm">
              <span className="font-mono text-ink-700">{w}</span>
              <span className="font-medium text-ink-500">
                {will.beneficiary_percentages[i]}%
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={`/wills/${will.id}/edit`}
          className="mt-4 inline-block text-sm text-wine transition-colors hover:text-wine/80"
        >
          Edit beneficiaries →
        </Link>
      </section>

      {/* ── Declare death ──────────────────────────────────── */}
      {will.status === "active" && (
        <section className="card border-wine/20">
          <h2 className="font-serif text-lg font-semibold text-ink-900">
            Declare Death
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Once the will creator is declared deceased, beneficiaries can see
            estate info and you can execute distribution.
          </p>
          {!declareConfirm ? (
            <button
              type="button"
              onClick={() => setDeclareConfirm(true)}
              className="btn-outlined mt-4 border-wine/30 text-wine hover:bg-wine/5"
            >
              I confirm: Declare death
            </button>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => declareDeathOnChain(BigInt(will.id))}
                disabled={
                  isWritePending || isConfirming || declareDeathSync.isPending
                }
                className="btn-wine disabled:opacity-50"
              >
                {isWritePending
                  ? "Confirm in Wallet…"
                  : isConfirming
                    ? "Waiting for Confirmation…"
                    : declareDeathSync.isPending
                      ? "Syncing…"
                      : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setDeclareConfirm(false)}
                className="btn-outlined"
              >
                Cancel
              </button>
            </div>
          )}
          {declareDeathError && (
            <p className="mt-3 text-sm text-wine">
              {declareDeathError.message}
            </p>
          )}
        </section>
      )}

      {/* ── Execute distribution ───────────────────────────── */}
      {will.status === "death_declared" && (
        <section className="card">
          <h2 className="font-serif text-lg font-semibold text-ink-900">
            Execute Distribution
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Trigger the distribution of assets from the creator wallet to
            beneficiaries.
          </p>
          {!distributeConfirm ? (
            <button
              type="button"
              onClick={() => setDistributeConfirm(true)}
              className="btn-primary mt-4"
            >
              Execute distribution
            </button>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => distribute.mutate()}
                disabled={distribute.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {distribute.isPending ? "Processing…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setDistributeConfirm(false)}
                className="btn-outlined"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Executed state ─────────────────────────────────── */}
      {will.status === "executed" && (
        <div className="card bg-ink-50/50">
          <p className="text-sm text-ink-500">
            Distribution has been executed. No further actions available.
          </p>
        </div>
      )}
    </div>
  );
}
