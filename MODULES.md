# Codebase modules

The app is split into **modules** (blocks). Each module lives under `lib/modules/<name>/` and has its own **README.md** describing contents and usage.

1. **User interface** — Upload wills, enter parameters (aligned with the contract).
2. **Contract parser** — Parses PDF → structured data; can pre-fill UI params.
3. **Contract generator** — WillRegistry source, ABI, deploy; generates/deploys the contract.
4. **UI (post-generate)** — Forms and params driven by the generated smart contract.
5. **Executor section** — Executor-only flows (declare death, distribute, edit).

No need to split into many tiny files; each module is a small set of focused files.

---

## Module map

| Module | Path | Purpose |
|--------|------|---------|
| **api** | `lib/modules/api/` | Client `apiFetch(path, { wallet })` for API routes with `x-wallet-address` header. |
| **auth** | `lib/modules/auth/` | `getWalletFromRequest`, `getRoleForWill`, `getWillWithRole`; `privyConfig` for the app. |
| **chain** | `lib/modules/chain/` | Will data from WillRegistry contract. `chains.ts` (XRPL EVM), `wagmi-config.ts`. |
| **contract-parser** | `lib/modules/contract-parser/` | Parse PDF → structured data. Output can pre-fill UI and feed contract generator. |
| **contract-generator** | `lib/modules/contract-generator/` | WillRegistry Solidity contract, ABI, deploy script. |
| **crypto** | `lib/modules/crypto/` | `encryptBuffer` / `decryptBuffer` for will documents (IPFS). |
| **executor** | `lib/modules/executor/` | Executor API paths; `blockchain.ts` placeholder for distribution. |
| **types** | `lib/modules/types/` | Shared types: `Will`, `WillWithRole`, `WalletRole`, etc. |
| **UI** | `lib/modules/ui/` | Will form params and validation (`validateWillFormParams`, `WillFormParams`). |

---

## Flow

1. **UI** — User uploads a will PDF (optional) and enters creator wallet, beneficiaries, percentages. Params are validated with **ui** (`validateWillFormParams`).
2. **Contract parser** — If a PDF is uploaded, `parseContract(pdf)` can extract parties/percentages and pre-fill the form (when implemented).
3. **Contract generator** — WillRegistry is compiled and deployed (Hardhat/Foundry). Set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`. Create/update are done on-chain (user signs in the app or via API 501).
4. **UI (generated contract)** — List/detail views read from the **chain** module. Create/edit forms submit to API or directly to the contract; fields match the generated contract (creator, executor, beneficiaries, %).
5. **Executor section** — Executor dashboard uses **executor** module paths for declare death, distribute, update. Rendered in `components/executor/ExecutorDashboard`.

---

## Imports

- **From a module:** `import { getWillsByWallet } from "@/lib/modules/chain";`  
  `import { apiFetch } from "@/lib/modules/api";`  
  `import { getWalletFromRequest } from "@/lib/modules/auth";`  
  `import type { Will } from "@/lib/modules/types";`
- **Barrel:** `import { getWillsByWallet, apiFetch, getWalletFromRequest } from "@/lib/modules";` (see `lib/modules/index.ts`).
- **Module READMEs:** Each module has a `README.md` in its folder (e.g. `lib/modules/chain/README.md`).

---

## Components (blocks)

- **Layout** — `components/layout/`: header, wallet connect (Privy).
- **Wills** — List and create/edit pages live under `app/wills/`; they use the modules above.
- **Executor** — `components/executor/ExecutorDashboard`: declare death, distribute, edit beneficiaries.
- **Beneficiary** — `components/beneficiary/BeneficiaryDashboard`: view allocation and status.
