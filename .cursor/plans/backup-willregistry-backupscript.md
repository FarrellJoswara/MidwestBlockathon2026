# Minimal backup WillRegistry (backupscript.sol) — AS SIMPLE AS POSSIBLE

## Principle

No security. No permission checks. Demo only. Store executor, beneficiaries, assets. Death trigger = anyone calls it; that’s it.

---

## 1. Backup registry (backupscript.sol)

- **createWill**: Same signature as the app. Store creator, executor, beneficiaries[], generatedContractAddress, status, timestamps. Index by creator/executor/beneficiary so “my wills” works.
- **declareDeath(willId)**: **Anyone can call.** No check on msg.sender. If will exists and is active: call `generatedContract.execute()`, then set status = executed. Done.
- **getWill / getWillIdsByCreator / getWillIdsByExecutor / getWillIdsByBeneficiary**: Same return shape as the app so [lib/modules/chain/index.ts](lib/modules/chain/index.ts) works.
- No updateWill. No markExecuted.

---

## 2. Generated contract (from prompt)

- **Store**: Executor, beneficiaries, assets (who gets which NFT / what).
- **execute()**: Transfers assets to beneficiaries (e.g. NFT transfers). **Anyone can call.** No permission checks.
- No “only executor” or “only beneficiary”. Keep it stupid simple.

Prompt is in [prompt-and-parse.ts](lib/modules/contract-generator/pipeline/prompt-and-parse.ts): requires `execute()` that does the transfers; anyone can call it.

---

## 3. Auto-deploy and env

- Deploy backup: e.g. `npx tsx scripts/deploy-sol.ts lib/modules/contract-generator/contracts/backupscript.sol` or `npm run deploy:backup`.
- After deploy, set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS=<deployed_address>` in `.env.local` (script can do this automatically).

---

## 4. Create page — must be modified

**[app/wills/create/page.tsx](app/wills/create/page.tsx) must be updated** so that:

- It works with the backup registry (same createWill args: executor, beneficiaries, ipfsCid, encryptedDocKeyIv, generatedContractAddress — empty strings for ipfs/iv are fine).
- Any other create-flow changes needed for the minimal flow (e.g. ensure generated contract address is passed correctly, no reliance on updateWill/markExecuted).

The plan explicitly includes modifying the create page as part of this minimal setup.

---

## 5. Summary

| Item | What |
|------|------|
| Registry | createWill, declareDeath (anyone), getWill, getWillIdsBy* |
| Generated contract | Store executor, beneficiaries, assets; execute() does transfers; anyone can call |
| Plan | No permissions; stupid simple; create page is modified |
