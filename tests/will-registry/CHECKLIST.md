# WillRegistry create/edit flow checklist

Run the scripted parts via npm:

- `npm run test:will-registry:contract` — deploy + create/update/lifecycle/index (requires DEPLOYER_PRIVATE_KEY)
- `npm run test:will-registry:chain` — getWillById / getWillsByWallet (requires NEXT_PUBLIC_WILL_REGISTRY_ADDRESS with at least one will)
- `npm run test:will-registry:simulate` — simulate createWill (no tx; requires registry address)
- `npm run test:will-registry:read` — read-only registry dump (requires registry address)
- `npm run test:will-registry:all` — contract + chain + simulate + read (skips contract if no key)

## Manual: create page (happy path)

1. Set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` in `.env.local` to a deployed WillRegistry.
2. Start app: `npm run dev`.
3. Connect wallet (Privy) and switch to XRPL EVM Testnet.
4. Go to `/wills/create`.
5. (Optional) Upload a PDF and click "Analyze Will".
6. Add at least one beneficiary wallet and percentage (e.g. 100%).
7. Click "Create Will".
8. Confirm: per-will contract deploys, then `createWill` tx; success screen shows registry tx hash and contract address.
9. Go to `/wills` — within ~3 s the new will appears in the list.

## Manual: create page (failure cases)

- Submit with no beneficiary → validation error.
- Submit with percentages ≠ 100% → validation error (or auto-normalized).
- Reject tx in wallet → error message shown.

## Manual: edit page (happy path)

1. As creator or executor, open a will with status "active" and go to "Edit beneficiaries".
2. Change a beneficiary wallet address (or add/remove).
3. Click "Save".
4. Confirm tx; redirect to will detail; next poll shows updated beneficiaries.

## Manual: edit page (failure cases)

- Non–creator/non–executor opens edit → "Only the creator or executor can edit".
- Executor-only (different from creator) saves → contract reverts with NotCreator (creator-only on-chain).
- After death declared or executed → edit not allowed.

## Manual: lifecycle

1. As executor, open an active will → "Declare death" (or similar) → confirm tx → status becomes death_declared.
2. As executor, "Mark executed" → confirm tx → status becomes executed.
3. As non-executor, try to declare death → rejected (contract or UI).
