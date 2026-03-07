# Executor module

Executor-only API paths and distribution placeholder. Used by the ExecutorDashboard and the distribute API route.

## Contents

- **`actions.ts`** — `executorApiPaths`: `declareDeath(id)`, `distribute(id)`, `update(id)`, `getWill(id)`. Type `ExecutorAction`.
- **`blockchain.ts`** — Placeholder `distributeAssets`, `executeDistribution` (logs only). Real implementation would trigger chain txs from the executor wallet.

## Usage

```ts
import { executorApiPaths } from "@/lib/modules/executor";
import { executeDistribution } from "@/lib/modules/executor/blockchain";
```
