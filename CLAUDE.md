# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build everything (typecheck + build)
pnpm run build

# Regenerate React Query hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to Postgres (dev only)
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run push-force  # skip prompts

# Run API server (builds then starts)
pnpm --filter @workspace/api-server run dev

# Run Expo mobile app
pnpm --filter @workspace/logaf run dev

# Run mockup/component sandbox
pnpm --filter @workspace/mockup-sandbox run dev
```

Package manager is **pnpm only** — `npm` and `yarn` are rejected by preinstall hook.

## Architecture

### Monorepo layout

```
lib/           # shared libraries (consumed by artifacts)
  api-spec/    # OpenAPI YAML + Orval codegen config
  api-client-react/  # generated React Query hooks + custom fetch
  api-zod/     # generated Zod schemas from OpenAPI
  db/          # Drizzle ORM + PostgreSQL client

artifacts/     # deployable applications
  api-server/  # Express 5 REST API → esbuild → dist/index.mjs
  logaf/       # Expo/React Native journal app
  mockup-sandbox/  # Vite + React + Radix UI component playground
```

### API contract flow

`lib/api-spec/openapi.yaml` is the **single source of truth** for the API contract.

1. Edit `openapi.yaml`
2. Run `codegen` → Orval writes to:
   - `lib/api-client-react/src/generated/` — React Query hooks (used by `logaf`)
   - `lib/api-zod/src/generated/` — Zod schemas (used by `api-server`)
3. `api-server` validates requests/responses using `@workspace/api-zod`
4. `logaf` calls the API via `@workspace/api-client-react`

Never hand-edit files under `src/generated/` — they are fully regenerated on each `codegen` run.

### DB schema pattern

Each model in `lib/db/src/schema/` must export:
- A Drizzle `pgTable` definition
- An `insertXxxSchema` via `createInsertSchema` (from `drizzle-zod`)
- `InsertXxx` and `Xxx` TypeScript types

Export each model from `lib/db/src/schema/index.ts`. Requires `DATABASE_URL` env var.

### API server (`artifacts/api-server`)

- Express 5 + Pino HTTP logging
- Routes mounted at `/api`
- esbuild bundles to CJS → `dist/index.mjs`
- Add new route files under `src/routes/`, register in `src/routes/index.ts`
- Use `@workspace/api-zod` schemas for request/response validation

### Mobile app (`artifacts/logaf`)

- Expo Router (file-based routing in `app/`)
- Screens: `index` (calendar home), `onboarding`, `settings`
- State via `hooks/useJournalStore` hook
- Persistent storage in `lib/storage.ts` via AsyncStorage — key structures:
  - `user_profile` → `Profile`
  - `journal_index` → `IndexEntry[]` (lightweight list for calendar rendering)
  - `journal_entry_<ISO-date>` → `JournalEntry`
- Voice transcription via `lib/deepgram.ts`
- Optional Supermemory integration (toggled in Profile settings)
- API calls use `setBaseUrl` / `setAuthTokenGetter` from `@workspace/api-client-react`

### Custom fetch layer (`lib/api-client-react/src/custom-fetch.ts`)

Orval's generated hooks all route through `customFetch`. Key config points:
- `setBaseUrl(url)` — prepends base URL to relative paths (needed in Expo for remote API)
- `setAuthTokenGetter(fn)` — injects `Authorization: Bearer <token>` header
- Throws `ApiError` on non-2xx; `ResponseParseError` on bad JSON

### TypeScript

- Base config: `tsconfig.base.json` — strict null checks, `noImplicitAny`, `moduleResolution: bundler`
- `customConditions: ["workspace"]` enables workspace-local package resolution
- Each package has its own `tsconfig.json` extending the base

### pnpm workspace security

`pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (1 day) for all packages except `@replit/*`. Do not disable this.
