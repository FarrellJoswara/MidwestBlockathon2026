# UI module

Will form parameters and validation for the create/edit flows. Aligned with the WillRegistry contract fields.

## Contents

- **`will-params.ts`** — `WillFormParams`, `WillFormValidation`, `validateWillFormParams(params)`. Validates creator wallet (0x address), beneficiaries, and percentages sum to 100.
- **`index.ts`** — Re-exports the above.

## Usage

```ts
import { validateWillFormParams, type WillFormParams } from "@/lib/modules/ui";
```

Used by the create-will and edit-will pages to validate before submit.
