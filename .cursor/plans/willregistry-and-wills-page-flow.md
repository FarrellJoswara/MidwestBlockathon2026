# WillRegistry and Wills Page Flow

## Overview

- **Source of truth:** WillRegistry contract on-chain. No database for will list or metadata.
- **Registry address:** Set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` in `.env.local` (and optionally `WILL_REGISTRY_RPC_URL` for chain reads). Create and edit flows use this address with explicit `chainId: xrplEvmTestnet.id` so txs are always on XRPL Testnet.
- **Wills list:** The wills page constantly pulls data from the WillRegistry by polling the API, which reads the contract.

## Create and edit flow (chainId and receipt)

- **Create page** ([app/wills/create/page.tsx](app/wills/create/page.tsx)): Passes `chainId: xrplTestnetId` to `writeContractAsync` for `createWill`. Uses a receipt client that is always XRPL Testnet (prefers `usePublicClient({ chainId: xrplEvmTestnet.id })`, with a fallback `createPublicClient` for that chain if needed) so `waitForTransactionReceipt` returns the correct `contractAddress` for the deployed will contract. Gas is estimated before write (estimate×1.2, cap 500k; fallback 300k). Creator is validated and checksummed with `getAddress(address)` before building args.
- **Edit page** ([app/wills/[id]/edit/page.tsx](app/wills/[id]/edit/page.tsx)): Passes `chainId: xrplEvmTestnet.id` to `writeContractAsync` for `updateWill` so the update tx is sent on XRPL Testnet.

## Verification scripts

- **Read-only registry check:** `npx tsx scripts/test-will-registry.ts` — reads `nextWillId`, getWill/getPool for existing wills, and index lookups. Use after create/edit to confirm on-chain state. Pass the registry address as first argument to test a specific contract: `npx tsx scripts/test-will-registry.ts 0xYourAddress`.
- **Simulate createWill (no tx):** `npx tsx scripts/simulate-create-will.ts` — runs two simulations (1 beneficiary 100%, and 2 beneficiaries 60/40) with empty ipfsCid and zero generatedContractAddress to verify argument encoding. Uses `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` from `.env.local`.

## WillRegistryV2 (Phase 3 backup)

A second contract **WillRegistryV2** keeps the same external interface (same ABI, no app code changes) with simplified internals. Use it if the original registry has issues.

- **Contract:** [lib/modules/contract-generator/contracts/WillRegistryV2.sol](lib/modules/contract-generator/contracts/WillRegistryV2.sol)
- **Deploy:** `npx tsx scripts/deploy-sol.ts lib/modules/contract-generator/contracts/WillRegistryV2.sol`
- **Switch app to V2:** In `.env.local` set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS=<deployed V2 address>`, then restart the dev server.
- **Current V2 deployment (testnet):** `0x82e01223d51eb87e16a03e24687edf0f294da6f1`

## Constant polling

The wills list page ([app/wills/page.tsx](app/wills/page.tsx)) is configured to **constantly pull** from the WillRegistry:

- `useQuery` uses **`refetchInterval: 3_000`** (3 seconds). While the page is mounted and the wallet is connected, the list is refetched every 3 seconds.
- Each refetch calls `GET /api/wills` with the connected wallet; the API calls `getWillsByWallet(wallet)`, which reads the WillRegistry contract (creator/executor/beneficiary indexes and full will data).
- New or updated wills appear on the list within at most 3 seconds after the chain state changes.

## Data flow (summary)

1. **Wills page** → `useQuery` (with `refetchInterval: 3_000`) → `apiFetch("/api/wills", { wallet })`.
2. **API** `GET /api/wills` → `getWillsByWallet(wallet)` in [lib/modules/chain/index.ts](lib/modules/chain/index.ts).
3. **Chain module** → WillRegistry contract: `getWillIdsByCreator`, `getWillIdsByExecutor`, `getWillIdsByBeneficiary`, then `getWill` + `getWillPoolCount` + `getPool` per id.
4. Results are sorted by `updated_at` and returned as `WillWithRole[]`; the page re-renders with the latest list.

## After a will is added to WillRegistry

- Create flow calls `WillRegistry.createWill` from the frontend; no server or DB is updated.
- The next refetch (or the next time the user opens the wills page) will include the new will because the list is read directly from the contract. With polling, the new will appears within 3 seconds.
