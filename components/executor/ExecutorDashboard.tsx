"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/modules/api";
import { executorApiPaths } from "@/lib/modules/executor";
import type { Will } from "@/lib/modules/types";
import { useDeclareDeath } from "@/lib/modules/contract-generator/hooks/useDeclareDeath";

interface ExecutorDashboardProps {
  will: Will;
}

export function ExecutorDashboard({ will }: ExecutorDashboardProps) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [declareConfirm, setDeclareConfirm] = useState(false);
  const syncedHashRef = useRef<string | null>(null);

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

  // Sync to API once per tx hash when chain tx succeeds
  useEffect(() => {
    if (
      isSuccess &&
      declareDeathHash &&
      syncedHashRef.current !== declareDeathHash
    ) {
      syncedHashRef.current = declareDeathHash;
      declareDeathSync.mutate(declareDeathHash);
    }
  }, [isSuccess, declareDeathHash]);

  const downloadDoc = () => {
    if (!will.ipfs_cid || !address) return;
    const ivParam = will.encrypted_doc_key_iv
      ? `&iv=${encodeURIComponent(will.encrypted_doc_key_iv)}`
      : "";
    const url = `/api/ipfs/${encodeURIComponent(will.ipfs_cid)}?will_id=${encodeURIComponent(will.id)}${ivParam}`;
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
            <p className="text-sm text-ink-500">Stored on IPFS</p>
            <button type="button" onClick={downloadDoc} className="btn-outlined text-xs">
              Download PDF
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">No document uploaded.</p>
        )}
      </section>

      {/* ── Beneficiaries ──────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Beneficiaries
        </h2>
        {will.pools && will.pools.length > 0 ? (
          <div className="mt-4 space-y-4">
            {will.pools.map((pool, pi) => (
              <div key={pi}>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {pool.name}
                </p>
                <ul className="mt-2 divide-y divide-ink-100">
                  {pool.beneficiary_wallets.map((w, i) => (
                    <li key={`${pi}-${w}`} className="flex justify-between py-2 text-sm">
                      <span className="font-mono text-ink-700">{w}</span>
                      <span className="font-medium text-ink-500">
                        {pool.beneficiary_percentages[i]}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </section>

      {/* ── Declare death (one action: calls generated contract to transfer to beneficiaries) ─── */}
      {will.status === "active" && (
        <section className="card border-wine/20">
          <h2 className="font-serif text-lg font-semibold text-ink-900">
            Declare Death
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Confirm the creator is deceased. This will call the will contract to transfer assets from the executor&apos;s wallet to the beneficiaries. One action — no separate step.
          </p>
          {!declareConfirm ? (
            <button
              type="button"
              onClick={() => setDeclareConfirm(true)}
              className="btn-wine mt-4"
            >
              Declare death & transfer to beneficiaries
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
                  ? "Confirm in wallet…"
                  : isConfirming
                    ? "Waiting for confirmation…"
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

      {will.status === "executed" && (
        <>
          <section className="card bg-emerald-50/50 border-emerald-200/50">
            <h2 className="font-serif text-lg font-semibold text-ink-900">
              Assets distributed
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              The following were transferred to beneficiaries when the will was executed.
            </p>
            <ul className="mt-4 space-y-3">
              {will.pools && will.pools.length > 0
                ? will.pools.flatMap((pool, pi) =>
                    pool.beneficiary_wallets.map((wallet, wi) => (
                      <li
                        key={`${pi}-${wallet}`}
                        className="flex items-center justify-between gap-4 rounded-lg border border-ink-200/60 bg-white px-4 py-3 text-sm"
                      >
                        <span className="text-ink-600">
                          {pool.name}
                          {pool.beneficiary_percentages[wi] != null && (
                            <span className="text-ink-400">
                              {" "}({pool.beneficiary_percentages[wi]}%)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-ink-800">
                          {wallet.slice(0, 6)}…{wallet.slice(-4)}
                        </span>
                      </li>
                    ))
                  )
                : will.beneficiary_wallets.map((wallet, i) => (
                    <li
                      key={wallet}
                      className="flex items-center justify-between gap-4 rounded-lg border border-ink-200/60 bg-white px-4 py-3 text-sm"
                    >
                      <span className="text-ink-600">
                        Estate share
                        {will.beneficiary_percentages[i] != null && (
                          <span className="text-ink-400">
                            {" "}({will.beneficiary_percentages[i]}%)
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-ink-800">
                        {wallet.slice(0, 6)}…{wallet.slice(-4)}
                      </span>
                    </li>
                  ))}
            </ul>
          </section>
          <div className="card bg-ink-50/50">
            <p className="text-sm text-ink-600 font-medium">Done</p>
            <p className="mt-1 text-sm text-ink-500">
              Death was declared and assets were transferred to beneficiaries. No further actions.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
