# dihhapp — Digital Will Distribution MVP

Web-based MVP for managing **digital wills** tied to blockchain wallet addresses. The platform does not create legal wills; it manages distribution instructions. Each will has a **creator wallet**, an **executor** (full management rights), and **beneficiaries** with percentage allocations.

## Features

- **Auth & wallets** (Privy + XRPL EVM Sidechain)
- **Role-based access**: Executor vs Beneficiary (and Creator view)
- **Will creation**: Executor creates will on-chain, optionally uploads PDF → encrypted → stored on IPFS (Pinata), CID saved on-chain
- **Executor dashboard**: View/edit will, upload document, declare death, execute distribution
- **Beneficiary dashboard**: View allocation %, executor, status; after death declaration: estate value (mocked), distribution status
- **Security**: Documents encrypted before IPFS; executor manages keys (not stored centrally)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, **Privy** (auth), **wagmi** + **viem** on **XRPL EVM Sidechain**
- **Backend**: Next.js API routes (Node.js)
- **Will data**: On-chain (XRPL EVM Sidechain) via `WillRegistry` contract; see **Contract generator** (`lib/modules/contract-generator/`)
- **Storage**: Pinata (IPFS) for encrypted will documents
- **Deploy**: Vercel-ready

## Setup

### 1. Install dependencies

```bash
npm install
```

**If `npm install` fails with `EPERM` or `ENOTEMPTY` (Windows):** Something is locking files in `node_modules` (e.g. a running dev server, another terminal, or the editor). Close any `next dev` process and any terminals using this folder, then remove `node_modules` and `package-lock.json` (e.g. in PowerShell: `Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json`), and run `npm install` again.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- **Will registry**: Deploy the contract in `lib/modules/contract-generator/` (see that README), then set:
  - `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`
- **Privy**: Create an app at [dashboard.privy.io](https://dashboard.privy.io). Set:
  - `NEXT_PUBLIC_PRIVY_APP_ID`
- **Pinata**: Create an account at [pinata.cloud](https://pinata.cloud), create an API key or JWT. Set:
  - `PINATA_JWT` (or `PINATA_API_KEY` + `PINATA_SECRET_KEY`)
- **Encryption**: Generate a 32+ character secret for document encryption:
  - `DOC_ENCRYPTION_SECRET` (e.g. `openssl rand -hex 32`)
- **Optional**: `NEXT_PUBLIC_APP_URL` for server-side API base URL (e.g. `https://your-app.vercel.app`).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with Privy (wallet, email, or Google). The app uses **XRPL EVM Sidechain** (testnet by default); switch to mainnet in `lib/privy-config.ts` if needed. Create a will as executor, and open it to see the executor dashboard. Use another wallet as beneficiary to see the beneficiary view.

## How to test (manual)

1. **Start the app**  
   `npm run dev` → open [http://localhost:3000](http://localhost:3000).

2. **Have env set**  
   At least `NEXT_PUBLIC_PRIVY_APP_ID`. Set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` (deploy from `lib/modules/contract-generator/`) to create and load wills from the chain. Without the contract address, you can still test login and UI; wills list will be empty and create/update will return 501.

3. **Test login**  
   Click **Login** → sign in with email, Google, or wallet. You should see your address and “Log out.”

4. **Test executor flow** (needs WillRegistry deployed + `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS` set)  
   - Click **My Wills** → **Create Will**.  
   - Enter a **creator wallet** (any `0x` address, e.g. another account you control).  
   - Add **beneficiaries** (wallet addresses) and **percentages** that sum to 100.  
   - Optionally upload a PDF.  
   - Submit → you should be redirected to the new will (or sign the tx on-chain if the UI uses the contract).  
   - As executor: open the will, try **Edit beneficiaries**, **Declare death**, then **Execute distribution**.

5. **Test beneficiary view**  
   Use a different browser (or incognito) or another Privy login. Add that wallet as a beneficiary in a will (from the executor account). Log in as that wallet → **My Wills** → open the will → you should see the beneficiary dashboard (allocation %, no edit/declare/distribute).

6. **Quick sanity checks**  
   - Home loads and shows “dihhapp” and Login.  
   - After login, “My Wills” and “Open My Wills” work.  
   - `/wills` shows your wills or “You have no wills yet.”  
   - Build: `npm run build` completes without errors.

There are no automated tests yet. To add them later, you could use **Jest** + **React Testing Library** for components and **Playwright** or **Cypress** for E2E.

## Deploy on Vercel

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), import the project and link the repo.
3. Add all environment variables from `.env.example` in Project Settings → Environment Variables.
4. Deploy. The build uses `next build`; no extra config needed.

## Project structure (modular work breakdown)

- **Modules** (`lib/modules/`): Chain (on-chain reads), contract-parser (PDF → params), contract-generator (WillRegistry + deploy), executor (API paths), ui (will form validation). See **[MODULES.md](./MODULES.md)** for the full flow and imports.
- **Frontend (React/Next.js)**: `app/`, `components/` — Home, Connect Wallet, Will List, Will Detail (role-based), Create Will, Edit Will. Components grouped as **layout** (header, Privy connect), **executor** (ExecutorDashboard), **beneficiary** (BeneficiaryDashboard).
- **Backend 1 (API + chain)**: `app/api/wills/`, `lib/modules/chain`, `lib/auth.ts` — wallet auth, role verification, read wills from chain; create/update are done on-chain from the frontend.
- **Contract generator**: `lib/modules/contract-generator/` — WillRegistry Solidity contract, ABI, deploy instructions.
- **Backend 2 (IPFS + crypto)**: `app/api/ipfs/`, `lib/crypto.ts` — encrypt PDF, upload/download Pinata.
- **Blockchain placeholder**: `lib/blockchain.ts` — `distributeAssets` / `executeDistribution` log plan; later can trigger real txs from executor-controlled wallet.

## API overview

- `GET /api/wills` — List wills for connected wallet (header: `x-wallet-address`).
- `POST /api/wills/create` — Create will (executor). Returns 501 until the frontend calls the chain contract; body same as before.
- `GET /api/wills/[id]` — Get will + role for wallet.
- `PATCH /api/wills/[id]/update` — Executor: update beneficiaries or `ipfs_cid`/`encrypted_doc_key_iv`. Returns 501; use contract from frontend.
- `POST /api/wills/[id]/declare-death` — Executor: set status to `death_declared`. Returns 501; use contract from frontend.
- `POST /api/wills/[id]/distribute` — Executor: set status to `executed`. Returns 501; use contract from frontend.
- `POST /api/ipfs/upload` — Form: `file`, `will_id`; returns `cid`, `iv`.
- `GET /api/ipfs/[cid]?will_id=...&iv=...` — Download and decrypt PDF (requires wallet header).

## Will data (on-chain)

Wills are stored in the `WillRegistry` contract on XRPL EVM Sidechain. Deploy the contract from `lib/modules/contract-generator/` (see that README), set `NEXT_PUBLIC_WILL_REGISTRY_ADDRESS`, and use the app to list wills (read from chain). Create/update/declare death/execute are done by the user from the frontend via the contract.

## License

MIT
