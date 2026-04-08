# KlasterAI

![License: MIT](https://img.shields.io/badge/license-MIT-1f2937?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=flat-square)
![Solana](https://img.shields.io/badge/Solana-Devnet-14f195?style=flat-square)
![Anchor](https://img.shields.io/badge/Anchor-0.32-7c3aed?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?style=flat-square)

> Tokenized AI compute infrastructure with verified onchain vaults, readable disclosure, real devnet share purchases, and revenue tracking that investors can actually inspect.

[Live App](https://klaster-project.vercel.app) · [Marketplace](https://klaster-project.vercel.app/marketplace) · [Vault Detail](https://klaster-project.vercel.app/vaults/demo-vault) · [Program on Devnet](https://explorer.solana.com/address/23G3S9gNH4x3PPJ8sJwvLfjFhQSJ2JJukZGrR29RQiTe?cluster=devnet)

---

## ✨ What KlasterAI Is

KlasterAI turns AI compute exposure into a structured financial product.

Instead of asking users to trust spreadsheets, private DMs, and vague routing claims, KlasterAI presents compute pools as verified vaults with:

- clear hardware and issuance terms
- admin-reviewed proof packages
- public marketplace listings
- onchain share purchases
- operator revenue deposits
- investor claim rails tied to vault accounting

This repository contains the complete product stack in one place:

- a Next.js 16 application
- Supabase-backed public and authenticated read models
- an Anchor Solana program for vault issuance and accounting
- live devnet purchase, deposit, and claim preparation flows

---

## 🚀 Why This Matters

### 1. Compute investing is usually opaque

Most AI infrastructure offerings still rely on private diligence and off-platform trust. That makes ownership, proof, routing posture, and fee logic hard to verify.

**KlasterAI fixes this with a marketplace built around verification, constraints, and readable economics.**

### 2. Tokenization alone is not enough

A token without disclosed asset posture and explicit issuance rules does not solve the trust problem.

**KlasterAI makes the vault itself the product surface, not just the token.**

### 3. Revenue needs to be legible

If deposits, claims, and vault posture are not visible, investors cannot reason about outcomes.

**KlasterAI combines onchain settlement with a mirrored application read model for portfolio, operator, and admin views.**

---

## 🧩 What You Can Do

### Public marketplace

- browse verified compute vaults
- inspect vault detail, health, routing, and disclosure panels
- buy non-transferable shares on devnet

### Portfolio

- review holdings by vault
- inspect claim posture
- prepare investor claim actions

### Operator surface

- create vault drafts
- upload private proof documents
- manage per-vault operations
- prepare revenue deposit actions

### Admin surface

- review submitted vaults
- approve vaults for listing
- pause or resume vaults
- finalize approval metadata and issuance rails

---

## 🔥 Current Live Posture

- Production app: [https://klaster-project.vercel.app](https://klaster-project.vercel.app)
- Solana cluster: `devnet`
- Program ID: `23G3S9gNH4x3PPJ8sJwvLfjFhQSJ2JJukZGrR29RQiTe`
- Canonical live vault route: [https://klaster-project.vercel.app/vaults/demo-vault](https://klaster-project.vercel.app/vaults/demo-vault)
- Canonical onchain vault: `8qjM5GtsQ848S22q3E8qsSucF8TXLYRogZRmj1et6jGg`
- Share mint: `HSwFCness1knruXbbnGjfqvmVwUUBr39eEi5xR2Pt7nV`
- Settlement mint: `So11111111111111111111111111111111111111112`
- Operator settlement ATA: `Guphz64ZzhfSFCjMrTMazqoxMUmm1EVKncN6fmekFDS9`

The project already supports:

- a verified live vault in Supabase
- a real onchain vault account on devnet
- a real devnet share purchase flow
- a real devnet revenue deposit flow
- mirrored read surfaces for marketplace and operations

### Native SOL Purchase Rail

The marketplace accepts ordinary **Devnet SOL** from the connected wallet.

Internally the settlement mint is **wrapped SOL** (`So111...`), so the client
prepares the required token accounts and wraps native SOL inside the purchase
transaction before calling the Anchor program. Buyers do **not** need to hold a
separate WSOL balance manually.

### Verified Onchain Transactions

- Fresh-wallet share purchase:
  [5tVygc3Kch1HV8377LAQEzECUq2p5GqQVuftuKGN7ikYc7gUcbpcmnyS7civN53j5ZaLU2WJicYfQn1L41CL4qKg](https://explorer.solana.com/tx/5tVygc3Kch1HV8377LAQEzECUq2p5GqQVuftuKGN7ikYc7gUcbpcmnyS7civN53j5ZaLU2WJicYfQn1L41CL4qKg?cluster=devnet)
- Operator settlement ATA repair:
  [5XgZx4ygz1tFKFeNawiLwG6rZrxGLb9fTrEZiMkcceBPE5wXAbdJQeG42xxeyEnCKJJFbcm1yzHME52ZmNBzPwDy](https://explorer.solana.com/tx/5XgZx4ygz1tFKFeNawiLwG6rZrxGLb9fTrEZiMkcceBPE5wXAbdJQeG42xxeyEnCKJJFbcm1yzHME52ZmNBzPwDy?cluster=devnet)
- Revenue deposit:
  [5FvmWHF6D3KCBoUqyPkyLa8bmw5h9X4ydF4EeBQ8KrQuRgyRZNBnd79x3sxeAnWLw1J2GdXqefcdZs5NqqrQh6P8](https://explorer.solana.com/tx/5FvmWHF6D3KCBoUqyPkyLa8bmw5h9X4ydF4EeBQ8KrQuRgyRZNBnd79x3sxeAnWLw1J2GdXqefcdZs5NqqrQh6P8?cluster=devnet)

---

## 🛠️ Product Flow

KlasterAI follows a simple lifecycle:

1. An operator creates a vault and submits proof material.
2. An admin reviews the evidence and prepares approval.
3. The vault becomes publicly visible in the marketplace.
4. An investor buys shares through the onchain purchase rail.
5. The operator deposits revenue.
6. Investors claim yield against the vault revenue index.

This is not a generic token launcher.

It is a controlled issuance and revenue-accounting system for real compute infrastructure.

### Purchase Execution Model

For a live purchase the client prepares a single transaction that:

1. creates any missing token accounts idempotently
2. wraps native SOL into the settlement account when the vault settles in WSOL
3. invokes `purchaseShares` on the `klaster_vault` program
4. leaves the vault and operator settlement wiring intact for later purchases

That last point matters operationally: the public purchase rail and operator
revenue rail both depend on stable settlement account wiring, so the app now
guards those accounts explicitly before sending transactions.

---

## 🏗️ Architecture

### Frontend

- `src/app` — routes, layouts, API routes
- `src/components` — marketing, vault, auth, shell, and platform UI
- `src/lib` — env parsing, formatting, Solana transaction helpers, shared utilities

### Server runtime

- `src/server/auth` — wallet challenge, verification, cookies, access guards
- `src/server/vaults` — public and authenticated read models, admin/operator/investor flows
- `src/server/helius` — webhook ingestion and event mirroring
- `src/server/storage` — private proof document upload flow
- `src/server/supabase` — service-role data access

### Onchain

- `anchor/` — Anchor workspace and Rust program
- `src/programs/klaster-vault` — generated TypeScript client
- `src/lib/solana` — transaction preparation for approval, purchase, deposit, and claim rails

---

## 📍 Core Routes

| Route | Purpose |
|---|---|
| `/` | marketing landing page |
| `/marketplace` | public marketplace |
| `/vaults/[vaultId]` | public vault detail |
| `/portfolio` | investor portfolio |
| `/operator/vaults` | operator board |
| `/operator/vaults/new` | new vault entry |
| `/operator/vaults/[vaultId]` | operator vault surface |
| `/admin/verifications` | admin review queue |
| `/admin/verifications/[vaultId]` | admin vault review detail |

---

## ⚙️ Key API Surfaces

| Route | Purpose |
|---|---|
| `POST /api/auth/siws/challenge` | wallet sign-in challenge |
| `POST /api/auth/siws/verify` | wallet session verification |
| `POST /api/auth/siws/logout` | clear wallet session |
| `POST /api/operator/vaults` | create or submit vault |
| `POST /api/operator/vaults/[vaultId]/uploads` | prepare proof upload |
| `POST /api/operator/vaults/[vaultId]/deposit/prepare` | prepare revenue deposit |
| `POST /api/portfolio/vaults/[vaultId]/claim/prepare` | prepare investor claim |
| `POST /api/admin/verifications/[vaultId]/review` | review vault |
| `POST /api/admin/verifications/[vaultId]/approve/prepare` | prepare approval |
| `POST /api/admin/verifications/[vaultId]/approve/finalize` | finalize approval |
| `POST /api/admin/vaults/[vaultId]/pause` | pause or resume vault |
| `POST /api/helius/webhooks` | ingest chain activity and mirror it into the app model |

---

## 🧪 Stack

| Layer | Technology |
|---|---|
| App framework | Next.js 16 App Router |
| UI runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Lint / format | Biome |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Database / backend | Supabase Postgres |
| Auth model | Solana wallet signature challenge + HTTP-only session cookie |
| Onchain program | Anchor |
| Token standard | Token-2022 |
| RPC / webhooks | Helius |
| Metadata / files | Pinata |

---

## ⚡ Quick Start

### Requirements

- Bun 1.x
- Node.js compatible with Next.js 16
- Solana CLI and Anchor if you want to work on the onchain program
- Supabase, Helius, and Pinata credentials for live runtime

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

---

## 🔐 Environment Variables

### Essential local variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | canonical local app URL |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | active cluster, usually `devnet` |
| `APP_REGION_BLOCKLIST` | optional region blocklist |

### Live runtime variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_HELIUS_RPC_URL` | Solana RPC endpoint |
| `HELIUS_API_KEY` | Helius integration |
| `HELIUS_WEBHOOK_SECRET` | webhook verification |
| `NEXT_PUBLIC_SUPABASE_URL` | public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side Supabase access |
| `SUPABASE_PRIVATE_BUCKET` | private proof bucket |
| `PINATA_JWT` | Pinata auth |
| `SESSION_SECRET` | signs session and challenge tokens |
| `SOLANA_ADMIN_MULTISIG` | admin / treasury owner |
| `USDC_MINT_ADDRESS` | legacy settlement mint variable; current deployment settles in wrapped SOL |
| `NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT` | public-facing vault program id |
| `PROGRAM_ID_KLASTER_VAULT` | server/tooling fallback program id |

### Optional integrations

| Variable | Purpose |
|---|---|
| `POSTHOG_KEY` | analytics |
| `POSTHOG_HOST` | analytics host |
| `RESEND_API_KEY` | email delivery |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications |

---

## 🗄️ Supabase Setup

Apply these migrations in order:

- [20260406123000_s03_auth_data_storage_webhook_backbone.sql](./supabase/migrations/20260406123000_s03_auth_data_storage_webhook_backbone.sql)
- [20260406183000_s08_hybrid_pool_expansion.sql](./supabase/migrations/20260406183000_s08_hybrid_pool_expansion.sql)

They establish:

- wallet-backed profiles
- vaults and verification state
- purchases, claims, and revenue deposits
- health snapshots and task stream events
- webhook event storage
- yield source modeling
- private proof-document storage support

---

## ⛓️ Onchain Program Workflow

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

---

## 📦 Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | start local dev server |
| `bun run build` | production build |
| `bun run start` | run production server locally |
| `bun run lint` | Biome checks |
| `bun run typecheck` | route type generation + TypeScript |
| `bun run test` | Vitest suite |
| `bun run verify` | lint + typecheck + unit tests |
| `bun run test:e2e` | Playwright tests |
| `bun run format` | format codebase |
| `bun run program:build` | build Anchor program |
| `bun run program:test` | run Rust / Anchor tests |
| `bun run program:client` | regenerate Codama client |

---

## ✅ Verification Flow

For normal product work:

```bash
bun run verify
```

For a full frontend pass:

```bash
bun run verify
bun run test:e2e
```

For program and transaction changes:

```bash
bun run program:test
bun run program:client
```

---

## 🌐 Deployment

KlasterAI is deployed as a standard Next.js project on Vercel.

Recommended defaults:

- import the repository as a Next.js project
- keep the repo root as the working directory
- configure environment variables from `.env.example`
- set `NEXT_PUBLIC_APP_URL` to the production URL
- keep region blocking empty when broad wallet access is needed

Operational notes:

- settlement flows run on devnet
- webhook mirroring is a synchronization layer, not the immediate source of truth
- wallet, approval, purchase, deposit, and claim flows are built for Node runtime surfaces

---

## 🎨 Product Feel

KlasterAI uses a dark, high-trust, Solana-informed design language:

- editorial landing composition
- disciplined product shells
- restrained accent energy
- strong typography and data hierarchy
- explicit emphasis on verification and action rails

Canonical design docs:

- [docs/DESIGN.md](./docs/DESIGN.md)
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)

---

## 📚 Project Links

- Live app: [https://klaster-project.vercel.app](https://klaster-project.vercel.app)
- Marketplace: [https://klaster-project.vercel.app/marketplace](https://klaster-project.vercel.app/marketplace)
- Canonical vault: [https://klaster-project.vercel.app/vaults/demo-vault](https://klaster-project.vercel.app/vaults/demo-vault)
- Private repo: [https://github.com/KiroshiAiviom/klaster-ai](https://github.com/KiroshiAiviom/klaster-ai)
- Public repo: [https://github.com/azatkabiden/klaster-project](https://github.com/azatkabiden/klaster-project)
- Mirror repo: [https://github.com/dudlextop/klaster-project](https://github.com/dudlextop/klaster-project)

---

## 📄 License

MIT — see [LICENSE](./LICENSE) when present in the publish target or repository configuration.
