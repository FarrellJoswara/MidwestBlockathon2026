# dihhapp — Digital Will Distribution MVP

Web-based MVP for managing **digital wills** tied to blockchain wallet addresses. The platform does not create legal wills; it manages distribution instructions. Each will has a **creator wallet**, an **executor** (full management rights), and **beneficiaries** with percentage allocations.

## Features

- **Auth & wallets** (Privy + XRPL EVM Sidechain)
- **Role-based access**: Executor vs Beneficiary (and Creator view)
- **Will creation**: Executor creates will, optionally uploads PDF → encrypted → stored on IPFS (Pinata), CID saved in DB
- **Executor dashboard**: View/edit will, upload document, declare death, execute distribution
- **Beneficiary dashboard**: View allocation %, executor, status; after death declaration: estate value (mocked), distribution status
- **Security**: Documents encrypted before IPFS; executor manages keys (not stored centrally)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, **Privy** (auth), **wagmi** + **viem** on **XRPL EVM Sidechain**
- **Backend**: Next.js API routes (Node.js)
- **Database**: Supabase (Postgres)
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

- **Supabase**: Create a project at [supabase.com](https://supabase.com). Run the SQL in `lib/db/schema.sql` in the SQL Editor. Set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  (The app uses placeholders for these during `next build` if unset; at runtime real values are required.)
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

## Deploy on Vercel

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), import the project and link the repo.
3. Add all environment variables from `.env.example` in Project Settings → Environment Variables.
4. Deploy. The build uses `next build`; no extra config needed.

## Project structure (modular work breakdown)

- **Frontend (React/Next.js)**: `app/`, `components/` — Home, Connect Wallet, Will List, Will Detail (role-based), Create Will, Edit Will.
- **Backend 1 (API + DB)**: `app/api/wills/`, `lib/db/`, `lib/auth.ts` — wallet auth, role verification, CRUD wills.
- **Backend 2 (IPFS + crypto)**: `app/api/ipfs/`, `lib/crypto.ts` — encrypt PDF, upload/download Pinata.
- **Blockchain placeholder**: `lib/blockchain.ts` — `distributeAssets` / `executeDistribution` log plan; later can trigger real txs from executor-controlled wallet.

## API overview

- `GET /api/wills` — List wills for connected wallet (header: `x-wallet-address`).
- `POST /api/wills/create` — Create will (executor); body: `creator_wallet`, `beneficiary_wallets[]`, `beneficiary_percentages[]`.
- `GET /api/wills/[id]` — Get will + role for wallet.
- `PATCH /api/wills/[id]/update` — Executor: update beneficiaries or `ipfs_cid`/`encrypted_doc_key_iv`.
- `POST /api/wills/[id]/declare-death` — Executor: set status to `death_declared`.
- `POST /api/wills/[id]/distribute` — Executor: set status to `executed` (placeholder distribution).
- `POST /api/ipfs/upload` — Form: `file`, `will_id`; returns `cid`, `iv`.
- `GET /api/ipfs/[cid]?will_id=...&iv=...` — Download and decrypt PDF (requires wallet header).

## Database (Supabase)

Table `wills`:

- `id`, `creator_wallet`, `executor_wallet`, `beneficiary_wallets` (JSONB), `beneficiary_percentages` (JSONB), `ipfs_cid`, `encrypted_doc_key_iv`, `status` (`active` | `death_declared` | `executed`), `created_at`, `updated_at`

Run `lib/db/schema.sql` in Supabase SQL Editor to create the table and indexes.

## License

MIT
