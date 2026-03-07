"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Will } from "@/lib/types";

interface ExecutorDashboardProps {
  will: Will;
}

export function ExecutorDashboard({ will }: ExecutorDashboardProps) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [declareConfirm, setDeclareConfirm] = useState(false);
  const [distributeConfirm, setDistributeConfirm] = useState(false);

  const declareDeath = useMutation({
    mutationFn: () =>
      apiFetch(`/api/wills/${will.id}/declare-death`, {
        method: "POST",
        wallet: address ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["will", will.id, address] });
      setDeclareConfirm(false);
    },
  });

  const distribute = useMutation({
    mutationFn: () =>
      apiFetch(`/api/wills/${will.id}/distribute`, {
        method: "POST",
        wallet: address ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["will", will.id, address] });
      setDistributeConfirm(false);
    },
  });

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

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Will information</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-ink-500">Creator wallet</dt>
            <dd className="font-mono text-ink-900">{will.creator_wallet}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Executor (you)</dt>
            <dd className="font-mono text-ink-900">{will.executor_wallet}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Status</dt>
            <dd>
              <span
                className={
                  will.status === "active"
                    ? "text-green-700"
                    : will.status === "death_declared"
                      ? "text-amber-700"
                      : "text-ink-600"
                }
              >
                {will.status}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Document</h2>
        {will.ipfs_cid ? (
          <div className="mt-4 flex items-center gap-4">
            <p className="text-sm text-ink-600">Stored on IPFS (encrypted)</p>
            <button
              type="button"
              onClick={downloadDoc}
              className="rounded bg-ink-200 px-3 py-1.5 text-sm hover:bg-ink-300"
            >
              Download PDF
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-500">No document uploaded yet.</p>
        )}
        <p className="mt-2 text-xs text-ink-400">
          To upload a new version, update the will from the create flow or a future
          “Replace document” action.
        </p>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Beneficiaries</h2>
        <ul className="mt-4 space-y-2">
          {will.beneficiary_wallets.map((w, i) => (
            <li key={w} className="flex justify-between text-sm">
              <span className="font-mono text-ink-800">{w}</span>
              <span className="text-ink-600">{will.beneficiary_percentages[i]}%</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/wills/${will.id}/edit`}
          className="mt-4 inline-block text-sm text-seal hover:underline"
        >
          Edit beneficiaries (when status is active)
        </Link>
      </section>

      {will.status === "active" && (
        <section className="rounded-xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-semibold text-ink-900">Declare death</h2>
          <p className="mt-2 text-sm text-ink-600">
            Once the will creator is declared deceased, beneficiaries can see estate
            info and you can execute distribution.
          </p>
          {!declareConfirm ? (
            <button
              type="button"
              onClick={() => setDeclareConfirm(true)}
              className="mt-4 rounded-lg border border-seal bg-white px-4 py-2 text-seal hover:bg-seal/10"
            >
              I confirm: Declare death
            </button>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => declareDeath.mutate()}
                disabled={declareDeath.isPending}
                className="rounded-lg bg-seal px-4 py-2 text-white hover:bg-seal/90 disabled:opacity-50"
              >
                {declareDeath.isPending ? "Processing…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setDeclareConfirm(false)}
                className="rounded-lg border border-ink-300 px-4 py-2 hover:bg-ink-100"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {will.status === "death_declared" && (
        <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
          <h2 className="text-lg font-semibold text-ink-900">Execute distribution</h2>
          <p className="mt-2 text-sm text-ink-600">
            Trigger the distribution of assets from the creator wallet to
            beneficiaries (MVP: placeholder; real implementation would sign
            transactions).
          </p>
          {!distributeConfirm ? (
            <button
              type="button"
              onClick={() => setDistributeConfirm(true)}
              className="mt-4 rounded-lg bg-ink-900 px-4 py-2 text-white hover:bg-ink-800"
            >
              Execute distribution
            </button>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => distribute.mutate()}
                disabled={distribute.isPending}
                className="rounded-lg bg-ink-900 px-4 py-2 text-white hover:bg-ink-800 disabled:opacity-50"
              >
                {distribute.isPending ? "Processing…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setDistributeConfirm(false)}
                className="rounded-lg border border-ink-300 px-4 py-2 hover:bg-ink-100"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {will.status === "executed" && (
        <p className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
          Distribution has been executed. No further actions available.
        </p>
      )}
    </div>
  );
}
