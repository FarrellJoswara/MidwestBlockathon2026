"use client";

import { useAccount } from "wagmi";
import type { Will } from "@/lib/types";

interface BeneficiaryDashboardProps {
  will: Will;
}

export function BeneficiaryDashboard({ will }: BeneficiaryDashboardProps) {
  const { address } = useAccount();
  const myIndex = address
    ? will.beneficiary_wallets.findIndex(
        (w) => w.toLowerCase() === address.toLowerCase()
      )
    : -1;
  const myPercent = myIndex >= 0 ? will.beneficiary_percentages[myIndex] ?? 0 : 0;

  const downloadDoc = () => {
    if (!will.ipfs_cid || !will.encrypted_doc_key_iv || !address) return;
    const url = `/api/ipfs/${encodeURIComponent(will.ipfs_cid)}?will_id=${encodeURIComponent(will.id)}&iv=${encodeURIComponent(will.encrypted_doc_key_iv)}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "will-document.pdf");
    a.style.display = "none";
    document.body.appendChild(a);
    fetch(url, { headers: { "x-wallet-address": address } })
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
        <h2 className="text-lg font-semibold text-ink-900">Your allocation</h2>
        <p className="mt-2 text-3xl font-bold text-gold">{myPercent}%</p>
        <p className="mt-1 text-sm text-ink-600">
          of the estate (after death declaration and distribution)
        </p>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Will status</h2>
        <p className="mt-2 text-ink-700">{will.status}</p>
        {will.status === "active" && (
          <p className="mt-1 text-sm text-ink-500">
            The executor has not declared death yet. You can view listing and
            executor info only.
          </p>
        )}
        {(will.status === "death_declared" || will.status === "executed") && (
          <p className="mt-1 text-sm text-ink-500">
            Estate value and distribution are visible below (MVP: mocked data).
          </p>
        )}
      </section>

      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Executor</h2>
        <p className="mt-2 font-mono text-sm text-ink-800">{will.executor_wallet}</p>
        <p className="mt-1 text-xs text-ink-500">
          This wallet has full management rights over the will and creator wallet.
        </p>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Will document</h2>
        {will.ipfs_cid ? (
          <button
            type="button"
            onClick={downloadDoc}
            className="mt-4 rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm hover:bg-ink-100"
          >
            Download encrypted PDF
          </button>
        ) : (
          <p className="mt-4 text-sm text-ink-500">No document on file.</p>
        )}
      </section>

      {(will.status === "death_declared" || will.status === "executed") && (
        <section className="rounded-xl border border-gold/30 bg-amber-50/50 p-6">
          <h2 className="text-lg font-semibold text-ink-900">Estate & distribution</h2>
          <p className="mt-2 text-sm text-ink-600">
            (MVP: placeholder values; real integration would read chain balances.)
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Total estate value</dt>
              <dd className="font-mono">— (mocked)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Your entitled amount</dt>
              <dd className="font-mono">{myPercent}% of estate</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Distribution status</dt>
              <dd>{will.status === "executed" ? "Executed" : "Pending"}</dd>
            </div>
          </dl>
        </section>
      )}

      <p className="text-xs text-ink-400">
        Beneficiaries cannot edit the will or trigger declare death / distribution.
      </p>
    </div>
  );
}
