"use client";

import { useAccount } from "wagmi";
import type { Will } from "@/lib/modules/types";

interface BeneficiaryDashboardProps {
  will: Will;
}

export function BeneficiaryDashboard({ will }: BeneficiaryDashboardProps) {
  const { address } = useAccount();

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Your allocation</h2>
        <ul className="mt-4 space-y-2">
          {will.beneficiary_wallets.map((w, i) => (
            <li key={w} className="flex justify-between text-sm">
              <span className="font-mono text-ink-800">
                {address?.toLowerCase() === w.toLowerCase() ? "You" : w}
              </span>
              <span className="text-ink-600">{will.beneficiary_percentages[i]}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-ink-200 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">Status</h2>
        <p className="mt-2 text-sm text-ink-600">
          Will status: <strong>{will.status}</strong>. Executor:{" "}
          {will.executor_wallet.slice(0, 10)}…{will.executor_wallet.slice(-8)}
        </p>
        <p className="mt-4 text-xs text-ink-500">
          (MVP: placeholder values; real integration would read chain balances.)
        </p>
      </section>
    </div>
  );
}
