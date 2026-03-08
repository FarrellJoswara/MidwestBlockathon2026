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
                        <span className="font-mono text-ink-700">
                          {address?.toLowerCase() === w.toLowerCase() ? (
                            <span className="font-sans font-medium text-wine">You</span>
                          ) : (
                            w
                          )}
                        </span>
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
        )}
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

      {/* ── Assets distributed (display only when executed) ─── */}
      {will.status === "executed" && (
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
                        {address?.toLowerCase() === wallet.toLowerCase() ? (
                          <span className="font-medium text-wine">You</span>
                        ) : (
                          `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                        )}
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
                      {address?.toLowerCase() === wallet.toLowerCase() ? (
                        <span className="font-medium text-wine">You</span>
                      ) : (
                        `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                      )}
                    </span>
                  </li>
                ))}
          </ul>
        </section>
      )}
    </div>
  );
}
