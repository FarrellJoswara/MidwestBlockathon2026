# Create flow – WillRegistry issues

Analysis from Phase 1 of the WillRegistry/create-page fix plan. For each area: current code reference, risk, and verification step.

## 1.1 Chain and client

- **Risk:** Registry tx or receipt wait uses wrong chain (wagmi/Privy chain state lags after switch).
- **Current code:** [app/wills/create/page.tsx](app/wills/create/page.tsx) passes `chainId: xrplTestnetId` to `writeContractAsync` and uses `publicClientXrplTestnet ?? publicClient` for receipt. Edit page does **not** pass `chainId` to `updateWill`.
- **Verification:** Confirm `usePublicClient({ chainId: xrplEvmTestnet.id })` is never undefined when `CONTRACT_ADDRESS` is set (wagmi config has the chain). Document edit-page chain risk and fix in Phase 2.5.

## 1.2 Argument encoding and validation

- **Risk:** Frontend sends a shape the contract rejects (lengths, sum-to-100, empty pool, invalid address).
- **Current code:** Create page normalizes `pctInts` to sum to 100, uses `getAddress(w.trim())` for poolWallets, single pool `"Allocation"`. Contract requires: `poolNames.length == poolWallets.length == poolPercentages.length`, each pool non-empty, lengths match, each pool percentages sum to 100.
- **Verification:** Run `npx tsx scripts/simulate-create-will.ts` with 1 and 2 beneficiaries (100% and 60/40). Add simulation with empty `ipfsCid` and zero `generatedContractAddress` (already supported; script covers edge case).

## 1.3 Gas

- **Risk:** XRPL EVM gas limit or block limit causes createWill to revert or never confirm.
- **Current code:** Create page uses `gas: 300000`; deploy uses 4000000 in deploy-generated.ts.
- **Verification:** Call `estimateContractGas` for createWill with typical args; if estimate > 300000, use estimate×1.2 or cap (e.g. 500k) in create and edit.

## 1.4 Creator address

- **Risk:** `useAccount().address` is undefined or wrong at call time (stale closure, wrong wallet).
- **Current code:** Create page uses `address` for creatorWallet; submit guards with `if (!address || !valid) return`; additional check before createWill at lines 396–400 (creator not zero).
- **Verification:** Add runtime check immediately before `writeContractAsync`: assert address defined and not zero; use `getAddress(address)` so creator is checksummed in createWill args.

## 1.5 Receipt and contractAddress

- **Risk:** `receipt.contractAddress` is undefined (wrong client/chain), so `generatedContractAddress` passed to createWill is wrong and tx fails or behaves badly.
- **Current code:** Uses `receiptClient = publicClientXrplTestnet ?? publicClient`; throws if `!contractAddress` after `waitForTransactionReceipt`.
- **Verification:** Ensure receipt client is always XRPL Testnet when `CONTRACT_ADDRESS` is set. If `publicClientXrplTestnet` can be undefined, add fallback: create viem `createPublicClient` for `xrplEvmTestnet.id` and use it for `waitForTransactionReceipt`.

## 1.6 Error surfacing

- **Risk:** User sees generic “transaction error” instead of contract revert reason.
- **Current code:** `getRevertReason` decodes `Error(string)`; WillRegistry uses `require(..., "string")` (no custom errors).
- **Verification:** If “unknown reason” appears, extend `getRevertReason` to try Error(string) from nested cause/data and log raw revert data for debugging.

## 1.7 Edit page

- **Risk:** `updateWill` is sent on wrong chain (no chainId).
- **Current code:** [app/wills/[id]/edit/page.tsx](app/wills/[id]/edit/page.tsx) calls `writeContractAsync` without `chainId`.
- **Verification:** Add `chainId: xrplEvmTestnet.id` to edit page `writeContractAsync` (Phase 2.5).

---

**Deliverable:** This document. Phase 2 fixes address 1.1 (receipt client), 1.3 (gas), 1.4 (creator checksum), 1.6 (revert reason), 1.7 (edit chainId). Scripts and E2E verify after each step.
