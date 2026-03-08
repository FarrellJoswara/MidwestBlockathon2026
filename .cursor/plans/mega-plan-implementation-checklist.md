# Mega Plan — Implementation Checklist

Actionable todo list from [mega-plan.md](mega-plan.md). Order: **P0 → P1 → P2 → P3**.

---

## P0 — Demo blockers (do first)

- [ ] **1. Receipt from XRPL Testnet** — Create page: ensure `waitForTransactionReceipt` uses XRPL client (or one-off viem client for xrplEvmTestnet).
- [ ] **2. Creator checks** — Create page: before building createWill args, assert `address` defined and not zero; optionally `getAddress(address)`.
- [ ] **3. Edit page chainId** — `app/wills/[id]/edit/page.tsx`: add `chainId: xrplEvmTestnet.id` to `writeContractAsync` for updateWill.
- [ ] **4. Executor: invalidate on chain success** — `ExecutorDashboard`: when `isSuccess` and `declareDeathHash`, call `queryClient.invalidateQueries({ queryKey: ["will", will.id, address] })`.
- [ ] **Verify P0:** Run `npx tsx scripts/simulate-create-will.ts` and `npx tsx scripts/test-will-registry.ts`. Full E2E: create will → list shows it → open as executor → Declare Death → UI shows "death_declared".

---

## P1 — Demo quality (core story)

- [ ] **5. Create page: two sections + aggregation** — (1) Beneficiaries & allocation — one row per person (aggregate by `placeholderId`), total 100%. (2) Assets from the will — one row per bequest, "Assign to" = dropdown of beneficiaries.
- [ ] **6. Parser prompt improvements** — willParser.ts: add rules — same person → same name/placeholderId; one row per distinct bequest; assetDescription 2–6 words; optional reminder before "Will text:".

---

## P2 — Velocity (iterate faster)

- [ ] **7. Externalize solc** — `next.config.js`: add `solc` (and optionally `@google/genai`) to `serverComponentsExternalPackages`.
- [ ] **8. Lazy-load web-solc on create page** — Do not statically import `compileContractClient`. Dynamic import when user reaches compile step. Optionally same for `generateContractFromParserDataClient` at "Generate contract".

---

## P3 — Polish (if time)

- [ ] **9. Success screen copy** — Create success view: add "As executor, open this will from My Wills to declare death and execute distribution when the time comes."
- [ ] **10. Revert reason in UI** — getRevertReason or create-flow catch: decode and show contract Error(string); log raw data when "unknown reason".
- [ ] **11. Declare-death API tolerant of txHash** — When body has valid `txHash`, optionally skip `status === "death_declared"` check and return 200.
- [ ] **12. Optional post-parse normalization** — willParser.ts: trim/cap `assetDescription`, ensure `placeholderId` from name when missing.

---

## P4 — Only if needed (post-hackathon)

- [ ] Phase 1 analysis doc
- [ ] Gas estimation before createWill
- [ ] Split create page into components
- [ ] Lazy Providers / route-group layouts
- [ ] Backup WillRegistry rewrite
