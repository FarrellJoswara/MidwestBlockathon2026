# Contract generator (module)

This module provides the **WillRegistry** contract (source + ABI), config, the **generate-and-deploy pipeline** (parser → Gemini → compile → deploy), a **registry** for will → contract address, and **hooks** for calling the contract from the UI.

---

## Folder layout

```
contract-generator/
├── index.ts              # Re-exports everything
├── abi.ts                # WillRegistry ABI (used by chain + hooks)
├── config.ts             # willRegistryAddress from env
├── types.ts              # Pipeline types (ParserOutput, GeneratedContract, etc.)
├── README.md             # This file
├── contracts/            # Solidity source
│   └── WillRegistry.sol
├── pipeline/             # Generate → compile → deploy (stubs)
│   ├── index.ts          # generateAndDeployContract + re-exports
│   ├── generate.ts       # Parser output → Gemini → Solidity source
│   ├── compile.ts        # Source → bytecode + ABI
│   └── deploy-generated.ts # Bytecode → deploy to chain
├── registry/             # Will id → deployed contract address
│   └── index.ts          # recordDeployedWill, getDeployedContractAddress
└── hooks/                # React hooks for contract writes
    └── useDeclareDeath.ts # declareDeath(willId) via wagmi
```

---

## What each file does

| File | Purpose |
|------|--------|
| **abi.ts** | WillRegistry ABI (JSON-like). Used by the **chain** module to read wills and by **hooks** to send transactions (e.g. declareDeath). |
| **config.ts** | Reads `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` from env and exports it as `willRegistryAddress`. Single place to swap the contract address. |
| **types.ts** | Types for the pipeline: `ParserOutput`, `GeneratedContract`, `CompiledContract`, `DeployResult`, `DeployGeneratedOptions`, `GenerateAndDeployOptions`. |
| **contracts/WillRegistry.sol** | Solidity source for the shared WillRegistry. Deploy once; app uses its address from config. Reference for generated contracts. |
| **pipeline/index.ts** | Runs the full pipeline: `generateAndDeployContract(parserOutput, options)` → generate → compile → deploy → record. Re-exports generate, compile, deploy-generated. |
| **pipeline/generate.ts** | `generateContractFromParserData(parserOutput)` → call Gemini (or fill template) → return `{ source, contractName }`. Stub. |
| **pipeline/compile.ts** | `compileContract(generated)` → compile Solidity (e.g. solc/Hardhat) → return `{ bytecode, abi, contractName }`. Stub. |
| **pipeline/deploy-generated.ts** | `deployGeneratedContract(compiled, options)` → deploy bytecode to chain via viem → return `{ contractAddress, transactionHash, contractName }`. Stub. |
| **registry/index.ts** | `recordDeployedWill(willId, contractAddress)` and `getDeployedContractAddress(willId)`. Tracks which deployed contract belongs to which will. Stub. |
| **hooks/useDeclareDeath.ts** | React hook: `useDeclareDeath()` returns `{ declareDeath(willId), hash, isWritePending, isConfirming, isSuccess, error }`. Calls WillRegistry.declareDeath via wagmi. |
| **index.ts** | Barrel: re-exports abi, config, pipeline, registry, hooks, and types so you can import from `@/lib/modules/contract-generator`. |

---

## Pipeline (generate new contract per will)

1. **Parser** (contract-parser) → `ParserOutput` (unknown shape).
2. **pipeline/generate.ts** → Gemini (or template) → `GeneratedContract` (Solidity source).
3. **pipeline/compile.ts** → compile → `CompiledContract` (bytecode + ABI).
4. **pipeline/deploy-generated.ts** → deploy → `DeployResult` (contract address).
5. **registry/** → record `willId` → contract address for lookup.

Entry point: `generateAndDeployContract(parserOutput, options)` from `./pipeline`. Each step is a stub; implement in the corresponding file.

---

## Deploying the shared WillRegistry

1. **Compile** `contracts/WillRegistry.sol` with Hardhat or Foundry.
2. **Deploy** to XRPL EVM testnet (or mainnet). RPC: `https://rpc.testnet.xrplevm.org` (or `WILL_REGISTRY_RPC_URL`).
3. Set **`NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`** in `.env.local` to the deployed address. `config.ts` exposes it as `willRegistryAddress`.
