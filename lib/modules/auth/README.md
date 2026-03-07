# Auth module

Wallet-based auth for API routes: read wallet from request, compute role for a will (creator/executor/beneficiary). Privy config for the app.

## Contents

- **`auth.ts`** — `getWalletFromRequest(req)`, `getRoleForWill(will, wallet)`, `getWillWithRole(willId, wallet)`. Used by all will and IPFS API routes.
- **`privy-config.ts`** — `privyConfig` (Privy client config: chains, login methods, embedded wallets). Used by `app/providers.tsx`.

## Usage

```ts
import { getWalletFromRequest, getWillWithRole } from "@/lib/modules/auth";
import { privyConfig } from "@/lib/modules/auth/privy-config";
```
