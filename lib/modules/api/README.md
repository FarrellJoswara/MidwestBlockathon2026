# API module

Client-side fetch helper that attaches the wallet address header for API routes.

## Contents

- **`index.ts`** — `apiFetch(path, options)`. Merges `options.wallet` into `x-wallet-address` header and uses `NEXT_PUBLIC_APP_URL` or relative URL for the base.

## Usage

```ts
import { apiFetch } from "@/lib/modules/api";
```

Used by will list, create, edit, and executor dashboard to call `/api/wills/*` and `/api/ipfs/*`.
