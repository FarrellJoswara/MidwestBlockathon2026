# Contract generator (module)

This module provides everything to **generate and deploy** the WillRegistry smart contract. Will data is read from the chain by the **chain** module.

## Contents

- **`contracts/WillRegistry.sol`** — Solidity contract. Stores will metadata; indexed by creator, executor, and beneficiaries.
- **`abi.ts`** — ABI used by the app (chain module) to read/write the contract.
- **`index.ts`** — Re-exports ABI for use by other modules.

## Deploying

1. **Compile** the contract with [Hardhat](https://hardhat.org) or [Foundry](https://book.getfoundry.sh):
   - **Hardhat:** In a project with Hardhat, copy `contracts/WillRegistry.sol` into your contracts folder, then `npx hardhat compile`.
   - **Foundry:** `forge build` (with the contract in your source tree).
2. **Deploy** to XRPL EVM testnet (or mainnet). RPC: `https://rpc.testnet.xrplevm.org` (or set `WILL_REGISTRY_RPC_URL`).
   - Hardhat: add the chain to `hardhat.config.js` and run `npx hardhat run scripts/deploy.js --network xrplTestnet`.
   - Foundry: `forge create WillRegistry --rpc-url <RPC> --private-key <KEY>`.
3. Set **`NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`** in `.env.local` to the deployed contract address.

## Flow

1. **UI** collects params (creator, beneficiaries, %) — see **ui** module (`validateWillFormParams`).
2. **Contract parser** can pre-fill those params from an uploaded PDF (optional).
3. **Contract generator**: compile + deploy WillRegistry; app then uses `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`.
4. **UI** updates: create/edit forms submit to API or directly to the contract (wagmi); executor actions use **executor** module paths.
