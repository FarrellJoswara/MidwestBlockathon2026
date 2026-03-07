# Crypto module

Encryption for will documents before IPFS upload. Used by the IPFS upload and download API routes.

## Contents

- **`index.ts`** — `encryptBuffer(data)`, `decryptBuffer(encrypted, ivBase64)`. AES-256-GCM; key derived from `DOC_ENCRYPTION_SECRET`.

## Usage

```ts
import { encryptBuffer, decryptBuffer } from "@/lib/modules/crypto";
```

Requires `DOC_ENCRYPTION_SECRET` (at least 32 characters) in env.
