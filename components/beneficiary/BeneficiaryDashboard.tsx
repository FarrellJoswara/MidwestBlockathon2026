"use client";

import { useAccount } from "wagmi";
import type { Will } from "@/lib/modules/types";

interface BeneficiaryDashboardProps {
  will: Will;
}

export function BeneficiaryDashboard({ will }: BeneficiaryDashboardProps) {
  const { address } = useAccount();

  return (
    <div className="space-y-6">
      {/* ── Allocation ─────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Your Allocation
        </h2>
        <ul className="mt-4 divide-y divide-ink-100">
          {will.beneficiary_wallets.map((w, i) => (
            <li key={w} className="flex justify-between py-2.5 text-sm">
              <span className="font-mono text-ink-700">
                {address?.toLowerCase() === w.toLowerCase() ? (
                  <span className="font-sans font-medium text-wine">You</span>
                ) : (
                  w
                )}
              </span>
              <span className="font-medium text-ink-500">
                {will.beneficiary_percentages[i]}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Status ─────────────────────────────────────────── */}
      <section className="card">
        <h2 className="font-serif text-lg font-semibold text-ink-900">
          Status
        </h2>
        <p className="mt-3 text-sm text-ink-500">
          Will status:{" "}
          <strong className="text-ink-800">{will.status}</strong>.
          Executor: {will.executor_wallet.slice(0, 10)}…
          {will.executor_wallet.slice(-8)}
        </p>
      </section>
    </div>
  );
}
