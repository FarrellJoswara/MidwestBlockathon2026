# Chain module

Reads and writes will data from the **WillRegistry** contract on XRPL EVM Sidechain.

## Contents

- **`index.ts`** — `getWillsByWallet(wallet)`, `getWillById(id)`, `createWill(...)`, `updateWill(...)`. Reads use a public viem client; create/update throw with instructions to use the contract from the frontend.
- **`chains.ts`** — Chain definitions: `xrplEvmTestnet`, `xrplEvmMainnet` (viem `defineChain`).
- **`wagmi-config.ts`** — Wagmi config for the app (chains + transports). Used by `app/providers.tsx`.

## Usage

```ts
import { getWillsByWallet, getWillById } from "@/lib/modules/chain";
import { xrplEvmTestnet } from "@/lib/modules/chain/chains";
import { wagmiConfig } from "@/lib/modules/chain/wagmi-config";
```

Requires `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` (and optionally `WILL_REGISTRY_RPC_URL`) in env.
