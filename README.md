# KlasterAI

KlasterAI is a devnet-first marketplace for verified AI compute vaults.
It combines a Next.js 16 application, a Supabase-backed read model, and an Anchor Solana program so operators can submit real compute assets, admins can approve them, investors can buy non-transferable Token-2022 shares, operators can deposit revenue, and investors can claim yield per vault.

The product is intentionally trust-first rather than token-first.
Every surface is built around disclosed constraints, verification evidence, readable issuance rules, and role-specific operational rails.

## What This Project Does

KlasterAI solves a specific problem: compute exposure is usually opaque.
Investors are often asked to trust spreadsheets, informal diligence, and off-platform routing logic.
KlasterAI turns that into a structured workflow with:

- operator-submitted vaults
- admin verification and approval
- marketplace listings with explicit disclosure
- onchain purchase, revenue deposit, and claim preparation
- public and authenticated read models for marketplace, portfolio, operator, and admin surfaces

This repository contains the full app and the onchain program in one place.

## Why KlasterAI Is Strong

- Trust-first product shape. The app is designed around verification, disclosure, and constrained issuance rather than speculative token UX.
- Real role separation. Public visitors, investors, operators, and admins each get distinct surfaces and actions.
- Practical local workflow. The repo supports both seeded demo mode and live mode, which keeps UI exploration possible even before infrastructure is fully configured.
- End-to-end devnet stack. The frontend, server runtime, Supabase schema, webhook ingestion, generated Solana client, and Anchor program all live in the same project.
- Clear operational boundaries. v1 explicitly blocks secondary-market behavior, transferability, and premature mainnet posture.

## Product Model

The core lifecycle is:

1. An operator creates a vault draft and uploads private proof material.
2. An admin reviews the vault and approves it for listing.
3. The marketplace exposes the verified vault with readable constraints and disclosure.
4. An investor buys non-transferable shares through the public purchase rail.
5. The operator deposits revenue.
6. The investor claims yield according to the vault revenue index.

This is not a generic token launcher.
It is a controlled issuance and revenue-accounting flow for real compute assets.

## Core Capabilities

### Marketplace

- public landing page
- marketplace listings
- per-vault detail pages
- verification, economics, health, routing, and task stream panels

### Investor workspace

- portfolio overview
- per-vault holdings
- claim posture and claim preparation rail

### Operator workspace

- vault board
- new-vault creation entry point
- per-vault workspace
- revenue deposit preparation rail
- private proof-document upload surface

### Admin workspace

- verification queue
- per-vault review surface
- approval preparation and finalize flow
- pause and review endpoints

## User-Facing Routes

| Route | Purpose |
|---|---|
| `/` | marketing landing page |
| `/marketplace` | public vault marketplace |
| `/vaults/[vaultId]` | public vault detail |
| `/portfolio` | investor workspace |
| `/operator/vaults` | operator vault board |
| `/operator/vaults/new` | operator create-vault entry |
| `/operator/vaults/[vaultId]` | operator vault workspace |
| `/admin/verifications` | admin verification queue |
| `/admin/verifications/[vaultId]` | admin vault review surface |

## Key API Routes

| Route | Purpose |
|---|---|
| `POST /api/auth/siws/challenge` | issue wallet sign-in challenge |
| `POST /api/auth/siws/verify` | verify wallet signature and create session |
| `POST /api/auth/siws/logout` | clear session |
| `POST /api/operator/vaults` | create or submit operator vault draft |
| `POST /api/operator/vaults/[vaultId]/uploads` | prepare private proof-document upload |
| `POST /api/operator/vaults/[vaultId]/deposit/prepare` | prepare operator revenue deposit bundle |
| `POST /api/portfolio/vaults/[vaultId]/claim/prepare` | prepare investor claim bundle |
| `POST /api/admin/verifications/[vaultId]/review` | record admin review decision |
| `POST /api/admin/verifications/[vaultId]/approve/prepare` | prepare admin approval bundle |
| `POST /api/admin/verifications/[vaultId]/approve/finalize` | finalize approval bookkeeping |
| `POST /api/admin/vaults/[vaultId]/pause` | pause or resume vault |
| `POST /api/helius/webhooks` | ingest Helius webhook events |

## Runtime Modes

The app intentionally supports two runtime postures.

### 1. Seeded demo mode

Use this when you want the product to render without full infrastructure.

Behavior:

- seeded marketplace and workspace data
- demo role sessions for protected surfaces in local development
- no durable live settlement
- useful for UI development, design review, and flow inspection

### 2. Live mode

Use this when you want real wallet auth, Supabase-backed reads, storage, and devnet transaction flows.

Behavior:

- SIWS wallet authentication
- signed HTTP-only session cookies
- Supabase-backed public and authenticated read models
- Helius-backed program/runtime connectivity
- Pinata-backed public metadata publishing
- private proof-document storage
- live preparation rails for approval, deposit, and claim flows

### Live Runtime Availability Rules

The repo switches behavior based on configured runtime pieces:

- Wallet session runtime requires:
  - `SESSION_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Public read-model runtime requires:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Program runtime requires:
  - `NEXT_PUBLIC_HELIUS_RPC_URL`
  - `NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT` or `PROGRAM_ID_KLASTER_VAULT`

If the live-only pieces are missing, the product falls back to demo posture instead of failing closed during local development.

## Current Deployment Posture

- Cluster: `devnet`
- Anchor provider cluster: `Devnet`
- Program ID: `23G3S9gNH4x3PPJ8sJwvLfjFhQSJ2JJukZGrR29RQiTe`
- Production app URL: [https://klaster-project.vercel.app](https://klaster-project.vercel.app)

## v1 Constraints

These are intentional, product-level constraints rather than missing polish:

- devnet-first release posture
- mainnet remains blocked until explicit approval and audit sign-off
- vault shares are non-transferable in v1
- no secondary market in v1
- proof documents remain private; only approved summaries become public
- webhook-driven mirrors are eventually consistent and should not be treated as instant settlement truth

## Stack

| Layer | Choice |
|---|---|
| App framework | Next.js 16 App Router |
| UI runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Lint / format | Biome |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Database / backend | Supabase Postgres + Supabase JS |
| Auth model | wallet signature challenge + HTTP-only session cookie |
| Onchain program | Anchor |
| Token standard | Token-2022 |
| Metadata / assets | Pinata |
| Chain / event infra | Helius |

## Architecture

The project is split into clear layers.

### Frontend

- `src/app` contains App Router pages, layouts, and route modules
- `src/components` contains marketing, workspace, shell, auth, vault, and UI components
- `src/lib` contains shared helpers, environment parsing, formatting, and Solana transaction preparation helpers

### Server

- `src/server/auth` handles wallet auth, region gating, challenge/session tokens, and guards
- `src/server/vaults` handles public and authenticated read models, live action preparation, admin/operator/investor selectors, and runtime branching
- `src/server/storage` handles private document upload logic
- `src/server/helius` handles webhook parsing and processing
- `src/server/supabase` contains service-role access

### Onchain

- `anchor/` contains the Anchor workspace
- `src/programs/klaster-vault` contains the generated TypeScript program client used by the app
- `src/lib/solana` contains transaction-preparation logic for approval, deposits, and claims

## Repository Layout

```text
src/
  app/                      App Router routes, layouts, API routes
  components/               UI primitives and route-level compositions
  lib/                      shared helpers, env parsing, Solana client helpers
  programs/                 generated program client and tests
  server/                   auth, read models, webhook/runtime, storage, Supabase
anchor/                     Anchor program workspace
supabase/migrations/        SQL migrations
docs/                       product, technical, design, and execution docs
public/                     static assets
```

## Getting Started

### Requirements

- Bun 1.x
- Node.js runtime compatible with Next.js 16
- Rust, Solana CLI, and Anchor only if you need to build or test the onchain program
- Supabase, Helius, and Pinata credentials only if you want live mode

### Install

```bash
bun install
```

### Configure environment

```bash
cp .env.example .env.local
```

### Start the app

```bash
bun run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Environment Variables

### Minimum local demo mode

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | canonical local app URL |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | active Solana cluster, default `devnet` |
| `APP_REGION_BLOCKLIST` | region blocklist; set empty string to disable |

### Live mode

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_HELIUS_RPC_URL` | client-visible Solana RPC endpoint |
| `HELIUS_API_KEY` | Helius server integration |
| `HELIUS_WEBHOOK_SECRET` | webhook verification |
| `NEXT_PUBLIC_SUPABASE_URL` | public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side Supabase access |
| `SUPABASE_PRIVATE_BUCKET` | bucket for private proof documents |
| `PINATA_JWT` | Pinata API auth |
| `SESSION_SECRET` | signs session and challenge tokens |
| `SOLANA_ADMIN_MULTISIG` | treasury / platform multisig owner |
| `USDC_MINT_ADDRESS` | active USDC mint for the chosen cluster |
| `NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT` | client-facing vault program id |
| `PROGRAM_ID_KLASTER_VAULT` | server/tooling program id fallback |

### Optional integrations

| Variable | Purpose |
|---|---|
| `POSTHOG_KEY` | analytics |
| `POSTHOG_HOST` | analytics host |
| `RESEND_API_KEY` | email delivery |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications |

### Important Notes

- Keep `APP_REGION_BLOCKLIST` empty on the public hackathon deployment if wallet sign-in must remain globally reachable.
- `NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT` and `PROGRAM_ID_KLASTER_VAULT` can point to the same program address.
- If you set `APP_REGION_BLOCKLIST` to an empty string, the runtime will not block regions by default.

## Supabase Setup

This project depends on two SQL migrations in `supabase/migrations/`:

- [20260406123000_s03_auth_data_storage_webhook_backbone.sql](./supabase/migrations/20260406123000_s03_auth_data_storage_webhook_backbone.sql)
- [20260406183000_s08_hybrid_pool_expansion.sql](./supabase/migrations/20260406183000_s08_hybrid_pool_expansion.sql)

Apply them in order.

What they establish:

- wallet-backed profiles and role data
- vault records and verification backbone
- purchases, claims, revenue deposits, and health snapshots
- webhook event storage
- yield source and task stream expansions
- private proof-document storage bucket support

## Onchain Program Workflow

Build the Anchor program:

```bash
bun run program:build
```

Run program tests:

```bash
bun run program:test
```

Regenerate the TypeScript client:

```bash
bun run program:client
```

The generated client lives under [src/programs/klaster-vault](./src/programs/klaster-vault).

## Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | start local development server |
| `bun run build` | production build |
| `bun run start` | start production server locally |
| `bun run lint` | run Biome checks |
| `bun run typecheck` | generate Next route types and run TypeScript |
| `bun run test` | run Vitest suite |
| `bun run verify` | run lint, typecheck, and unit tests |
| `bun run test:e2e` | run Playwright tests |
| `bun run format` | format the codebase with Biome |
| `bun run program:build` | build Anchor program |
| `bun run program:test` | run Anchor/Rust program tests |
| `bun run program:client` | regenerate Codama program client |

## Recommended Verification Flow

For normal app work:

```bash
bun run verify
```

For a full frontend pass:

```bash
bun run verify
bun run test:e2e
```

If you changed program or transaction logic:

```bash
bun run program:test
bun run program:client
```

## Manual Live QA

For a realistic devnet validation pass:

1. Sign in with an admin wallet.
2. Approve a pending vault.
3. Open the marketplace and confirm the vault is visible.
4. Buy shares from an investor wallet.
5. Deposit revenue from the operator wallet.
6. Claim yield from the investor wallet.
7. Verify Supabase-backed read surfaces reflect approval, revenue, and claim indexing.

## Deployment

The app is intended to deploy as a standard Next.js project on Vercel.

Recommended deployment defaults:

- import the repository as a Next.js project
- keep the repository root as the working directory
- configure the environment variables from `.env.example`
- set `NEXT_PUBLIC_APP_URL` to the final production URL
- leave `APP_REGION_BLOCKLIST` empty when public judge access is required

Operational notes:

- purchase, approval, deposit, and claim rails are devnet-first
- webhook mirroring is best-effort synchronization, not the immediate source of truth
- the app is built for Node.js runtime surfaces, not Edge-based wallet or webhook logic

## Design Direction

KlasterAI uses a dark, high-trust, Solana-informed design system with:

- editorial marketing layout
- disciplined terminal-style product surfaces
- restrained accent usage
- explicit visual hierarchy around verification and actions

The canonical design sources are:

- [docs/DESIGN.md](./docs/DESIGN.md)
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)

## Status Summary

Current project posture:

- full app UI migrated to the current KlasterAI visual language
- devnet Anchor program deployed
- Supabase migration backbone defined
- live and demo runtime paths both supported
- Vercel production deployment active

If you want to evaluate the project quickly, start with:

1. landing page
2. marketplace
3. vault detail
4. portfolio
5. operator workspace
6. admin verification queue
