# TWT — The Whole Trust

Turborepo + pnpm-workspaces monorepo for the **TWT mutual-aid platform**. Substrate engineering begins here; Phase-0 governance work is preserved under `docs/`.

> **Story 1.1 bootstrap commit** (Epic 1 Primitive substrate). PR-2 work — ADRs (Turborepo / Tamagui / Fastify / Drizzle / Astro / Postgres+RLS / helpline-as-admin-module / runtime-matrix), `pariwar_id` schema discipline, FM-1 adapter passthrough, i18n stub, `packages/events/` immutability rule, `packages/contracts/` shape, gateway-SDK dependency-lint rule — lands across Stories 1.2–1.17.

## Quick start

```sh
# 1. Node 20.18.0 LTS (or newer 20.x; .nvmrc pins the floor)
nvm use   # picks up .nvmrc

# 2. pnpm 10.30.3 (via corepack — bundled with Node ≥16.13)
corepack enable
corepack prepare pnpm@10.30.3 --activate

# 3. Install all workspaces
pnpm install --frozen-lockfile

# 4. The four canonical commands (mirrored by CI on every PR)
pnpm turbo run lint
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build

# 5. Mobile dev server (reproduces Story 0.14 prototype patterns)
pnpm turbo run dev --filter=@twt/mobile
```

## Workspace layout

Architecture-authoritative per `architecture.md` §Workspace Layout + §Complete project directory structure (lines 382-417 + 4137-4439).

| Path | Purpose | Substrate status |
|---|---|---|
| `apps/mobile/` | Member-facing native (Expo + RN + Tamagui) | **Story 0.14 prototype ported** — Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard patterns |
| `apps/public/` | Public-marketing surface (Astro SSR — Epic 2) | PR-1 placeholder |
| `apps/admin/` | Admin / helpline / pariwar-ops (Vite + React — Epic 1+) | PR-1 placeholder |
| `apps/api/` | API server (Fastify — Epic 1+) | PR-1 placeholder |
| `apps/jobs/` | Background workers (pg-boss — Epic 1+) | PR-1 placeholder |
| `packages/tokens/` | Design tokens (Story 1.17) | PR-1 placeholder |
| `packages/i18n/` | Centralized i18n utility (Story 2.1) | PR-1 placeholder |
| `packages/domain/` | Drizzle schema + repositories (Stories 1.2+) | PR-1 placeholder |
| `packages/contracts/` | Zod schemas + OpenAPI (Story 1.4) | PR-1 placeholder |
| `packages/api-client/` | Generated typed API client (Story 1.4) | PR-1 placeholder |
| `packages/platform-adapters/` | FM-1 adapter passthrough (Story 1.X) | PR-1 placeholder |
| `packages/bank-parsers/` | Bank statement parsers (Story 7.X) | PR-1 placeholder |
| `packages/events/` | Domain event contracts (Story 1.3) | PR-1 placeholder |
| `packages/ui/` | Shared UI primitives (Story 1.17) | PR-1 placeholder |
| `packages/eslint-config-twt/` | Shared ESLint flat config + canonical rule inventory | **Active at PR-1** |
| `infra/{cloudflare,gcp,dokploy}/` | IaC manifests | PR-1 placeholder; Stories 1.13/1.14/1.15 |
| `tests/{integration,e2e}/` | Cross-workspace tests | PR-1 placeholder; per-surface |
| `openapi/` | Generated `v1.yaml` | PR-1 placeholder; Story 1.4 |
| `docs/` | **Phase-0 documentation (Stories 0.1-0.15)** + `adr/` + `onboarding-tour.md` | **Preserved** |

## Essential reading

- `docs/onboarding-tour.md` — day-1 reading list (placeholder slots fill as canonical examples land).
- `docs/adr/` — Architecture Decision Records (substantive ADRs land per PR-2 sequence).
- `docs/runbooks/` — Phase-0 operational runbooks (Story 0.1).
- `docs/escrow/` — credential + code escrow (Stories 0.2 + 0.3).
- `docs/degradation-policy/` — per-surface degradation policy (Story 0.4).
- `docs/knowledge-transfer/` — KT pack + ADR index (Story 0.5).
- `docs/backup-engineer/` — backup-engineer scope-of-work (Story 0.6).
- `docs/fallback-handler-ledger/` — fallback-handler rota + SLAs (Story 0.7).
- `docs/spec-to-cadence-reconciliation/` — spec-to-cadence reconciliation (Story 0.12).
- `docs/legal-counsel-engagement/` — legal counsel concurrent-review engagement (Story 0.13).
- `docs/native-stack-validation/` — native-stack experiment + ratify-or-pivot framework (Story 0.14).
- `docs/launch-gate-inventory/` — architectural launch-gate inventory + monthly cadence (Story 0.15).
- `.decision-log.md` (repo root) — Phase-0 ratification decisions.
- `packages/eslint-config-twt/README.md` — canonical lint-rule inventory + quarterly cadence.
- `.github/pull_request_template.md` — six committed initial-scope prompts per architecture §PR-template initial scope.

## Conventions

- **Conventional Commits** per `commitlint.config.js` — scopes include workspace names (`api`, `mobile`, `admin`, `public`, `jobs`, `packages/<name>`) and module-level scopes (`api/member`, `admin/helpline`).
- **TypeScript strict** + `noUncheckedIndexedAccess` at the root `tsconfig.base.json` — architecturally non-negotiable. Workspace-level `tsconfig.json` may override individual compiler options for legitimate compatibility needs (e.g., Expo + RN jsx settings); do NOT relax the root.
- **Shared ESLint** via `@twt/eslint-config-twt` — every workspace's `eslint.config.js` re-exports. Substantive rule additions land per surface; see `packages/eslint-config-twt/README.md` §2 for the activation roster.
- **pnpm hoisted node-linker** (`.npmrc` line 1) — flattens node_modules so Metro / Expo (non-pnpm-aware bundlers) can find transitive deps via standard Node resolution.

## Story 0.14 prototype substrate (`apps/mobile/`)

Per Decision 2026-06-05-030 + sprint-status `0-14: done`, the Story 0.14 prototype scratchpad lives at `apps/mobile/`. Story 1.1 ports it byte-for-byte (preserving Tamagui v2 + Expo Router + Devanagari fonts + FlashList + MMKV + TanStack Query persister + UPI Intent deep-link + expo-notifications + RN Accessibility props) with three narrow strict-mode adjustments documented in this story's Completion Notes:

1. Tamagui v4 shorthand renames (104 occurrences across 12 component files: `paddingHorizontal` → `px`, `backgroundColor` → `bg`, `alignItems` → `items`, `justifyContent` → `justify`, `textAlign` → `text`, `borderRadius` → `rounded`, `alignSelf` → `self`, etc.).
2. `noUncheckedIndexedAccess` narrow `!` fixes on `sample-data.ts` files for modulo-indexed access on non-empty arrays (7 occurrences).
3. One `style={{...}}` wrap on a non-token bg value + one obsolete `transition="quick"` prop removed.

Migration debt for downstream **Story 1.17 (Design System Foundation)** is documented inline in each touched file.

## CI

`.github/workflows/ci.yml` runs `install → lint → typecheck → test → build` on every PR to `main` + `release/*`. The same four commands run locally via `pnpm turbo run <task>`.

## Where to file issues

- Engineering: in-repo issues (TODO: ISSUE_TEMPLATE landing in a downstream story).
- Operational: per-surface runbook escalation paths in `docs/runbooks/`.
- Legal / regulatory: `docs/legal-counsel-engagement/`.
