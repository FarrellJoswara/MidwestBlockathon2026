# Contract parser module

Parses a PDF will/contract into structured data that can pre-fill the UI and feed the contract generator.

## Contents

- **`index.ts`** — `parseContract(pdfFile)` returns `ParsedContract | null`. `ParsedContract` can include `creator_wallet`, `executor_wallet`, `beneficiary_wallets`, `beneficiary_percentages` when implemented.

## Usage

```ts
import { parseContract, type ParsedContract } from "@/lib/modules/contract-parser";
```

Implement PDF text extraction (e.g. with a PDF library) in `parseContract` and map extracted fields to `ParsedContract`. The create-will form can call it when a file is selected to pre-fill params.
