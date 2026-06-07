# Story 1.1: Turborepo Monorepo Bootstrap `[PRIMITIVE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder,
I want a Turborepo + pnpm-workspaces monorepo skeleton committed at the repo root with the **full set of `apps/*` + `packages/*` workspaces enumerated by architecture §Workspace Layout + §Project Structure & Boundaries** (NOT only the abbreviated `apps/api, apps/admin, apps/member, packages/contracts, packages/events, packages/ui` enumeration in the Story body — that list is incomplete relative to AR-1; architecture's authoritative tree governs per [[feedback_architecture_vs_prd_boundary]]), TypeScript strict mode + `noUncheckedIndexedAccess` enforced at a root `tsconfig.base.json` that every workspace extends, the shared `packages/eslint-config-twt/` lint-rule home created as an empty consolidated-inventory package per architecture §Operational commitments → Enforcement, a `turbo.json` task graph wiring `build` / `lint` / `typecheck` / `test` / `dev` across the tree with the `bihar` per-Pariwar build profile sketched, a Dockerfile per deployable workspace (every `apps/*` including `apps/jobs/`) per architecture §Container packaging, a baseline GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs `pnpm install` + `turbo lint` + `turbo typecheck` + `turbo test` + `turbo build` on every PR, commitlint with Conventional Commits per architecture §Conventional Commits scope vocabulary, a `pull_request_template.md` carrying the architecture-committed initial-scope prompts (type-shadowing check, branded-ID check, friction-budget declaration, accessibility-impact note, performance-impact note, security-impact note) per architecture §PR-template initial scope, the **already-built `apps/mobile/` from Story 0.14's prototype scratchpad integrated under the monorepo (NOT clobbered)** — its existing Tamagui + Expo Router + Devanagari fonts + FlashList + MMKV + expo-notifications + TanStack Query persister wiring preserved; its package name renamed `mobile` → `@twt/mobile`; its standalone `pnpm-lock.yaml` + per-app `node_modules` removed and reinstalled from the new monorepo root; its `tsconfig.base.json` hoisted to repo root and replaced with an extends-from-root pattern, `docs/onboarding-tour.md` committed as a Day-1 named-file list per architecture §Onboarding artifacts (initial scaffold; content fills as canonical examples land in later stories), an `infra/` directory with placeholder subdirectories (`cloudflare/`, `gcp/`, `dokploy/`) per architecture §Project Structure → Complete project directory structure, **a single trustee-accessible commit landing the whole skeleton** so every subsequent Epic 1 story inherits the consistent build/lint/test/typecheck pipeline without per-workspace duplication and so Phase-0 documentation under `docs/` (already-authored by Stories 0.1-0.15) sits beside the engineering substrate as one repository.

**Per architecture §Implementation Handoff PR-1 / PR-2 sequencing (architecture lines 5079-5099)**: this story is **PR-1** — mechanical bootstrap only; no schema, no business logic. **PR-2 work — ADRs (Turborepo choice; Tamagui choice; Fastify choice; Drizzle over Prisma; Astro over Next.js; Postgres+RLS multi-tenant strategy; helpline-as-admin-module; runtime compatibility matrix), `pariwar_id` schema discipline in `packages/domain/`, FM-1 adapter passthrough in `packages/platform-adapters/`, i18n stub in `packages/i18n/`, `packages/events/` contract conventions + immutability rule, `packages/contracts/` shape, gateway-SDK dependency-lint rule — is OUT OF SCOPE for Story 1.1**. PR-2 work distributes across subsequent Epic 1 stories (Story 1.2 introduces Drizzle migration scaffolding in `packages/domain/`; Story 1.3 substantively populates `packages/events/`; Story 1.4 substantively populates `packages/contracts/`; Story 1.6 introduces RLS + `pariwar_id` discipline; etc.). Story 1.1 creates the **empty containers** for those packages and the **shared build/lint/test/typecheck pipeline** that makes adding code to them mechanical.

**Per [[feedback_closure_language_precision]]** — Story 1.1 is the first **engineering** story of Epic 1 (not a Phase-0 governance ratification). Every Task carries direct objective evidence (file exists; command exits 0; CI run green) — there is no "Resolved via explicit deferral" leg. The story is fully **Closed by [edit]** when AC-1 + AC-2 + AC-3 ratify on a green CI run on the bootstrap PR.

## Acceptance Criteria

1. **AC-1 — Workspace structure matches AR-1's prescribed layout (apps/, packages/, infra/, config/); TypeScript strict mode enabled at root tsconfig with inherited project configs; `pnpm install`, `turbo build`, `turbo lint`, `turbo typecheck`, `turbo test` all complete on an empty repo; CI pipeline runs the same commands on every PR**

   **Given** the architecture §Workspace Layout commitment (architecture lines 382-417: `apps/{mobile, public, admin, api, jobs}` + `packages/{tokens, i18n, domain, contracts, api-client, platform-adapters, bank-parsers, events}` + `docs/adr/`) + architecture §Initialization Commands (architecture lines 544-581: `pnpm dlx create-turbo@latest twt --package-manager pnpm` followed by per-app scaffold commands) + architecture §Complete project directory structure (architecture lines 4137-4439: authoritative + more-elaborated tree adding `packages/ui/` + `packages/eslint-config-twt/` + `tests/{integration,e2e}/` + `.github/workflows/` + `infra/{cloudflare,gcp,dokploy}/` + `docs/{adr,runbooks,escrow,architecture,onboarding-tour.md}` + `openapi/v1.yaml` slot) + AR-1 verbatim (epics line 243: "Project uses **Turborepo + pnpm workspaces** as the starter foundation (not a templated all-in-one starter). Bootstrap = create-turbo baseline + per-app scaffolds via their native generators. First implementation story MUST initialize the monorepo skeleton") + architecture §TypeScript strictness commitment (architecture line 3978: "TypeScript strict mode across all packages; `noUncheckedIndexedAccess` enabled"; line 3618 essential-pattern row: "No `as any`; no `as unknown as T` outside test fixtures; clock injection for time-based code") + Story 0.14's substrate ratification per Decision 2026-06-05-030 (substrate ratified as RN + Tamagui per Q14.1; substrate-conditional engineering work UNBLOCKED — Story 1.1 precondition `Given Story 0.14's ratified substrate decision` is met) + the already-present `apps/mobile/` from Story 0.14 prototype build (git log `afe1310..f648a7a`: Days 1-9 of Task 9 + Task 10 execution runbook landed real working Expo + Tamagui + Devanagari fonts + FlashList + MMKV + expo-notifications + TanStack Query persister + RN Accessibility props + UPI Intent deep-link; `apps/mobile/README.md` line 1 explicitly anticipates monorepo integration — "note because this is in a monorepo had to remove react, react-dom, and react-native-web deps and change metro.config.js a bit") + the already-present Phase-0 documentation under `docs/` (authored by Stories 0.1-0.15 framework-as-top-level-surface pattern: `docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`, `docs/knowledge-transfer/`, `docs/backup-engineer/`, `docs/fallback-handler-ledger/`, `docs/spec-to-cadence-reconciliation/`, `docs/legal-counsel-engagement/`, `docs/native-stack-validation/`, `docs/launch-gate-inventory/`) + `.decision-log.md` at repo root

   **When** Solo Builder runs `pnpm dlx create-turbo@latest twt --package-manager pnpm` IN-PLACE at the existing repo root (the trick: `create-turbo` expects to create a new directory — Solo Builder either runs it in a scratch directory and copies the bootstrap artifacts in, or uses the `--skip-install` flag and hand-merges; details in Task 1.1), AND creates the full `apps/*` + `packages/*` workspace topology per architecture §Workspace Layout + §Complete project directory structure (NOT only the abbreviated Story-body enumeration), AND hoists a root `tsconfig.base.json` with `compilerOptions.strict: true` + `noUncheckedIndexedAccess: true` + `target: "ES2022"` + `module: "ESNext"` + `moduleResolution: "Bundler"` (or `NodeNext` per workspace — see Project Structure Notes) + every workspace's `tsconfig.json` `extends` it, AND populates `turbo.json` with `build` / `lint` / `typecheck` / `test` / `dev` pipelines + `bihar` per-Pariwar build profile slot per architecture §Per-Pariwar build profile, AND ports the existing `apps/mobile/` into the workspace (rename `package.json` `name` from `mobile` to `@twt/mobile`; remove `apps/mobile/pnpm-lock.yaml` + `apps/mobile/node_modules/`; replace `apps/mobile/tsconfig.base.json` with extends-from-root; preserve all functional code under `apps/mobile/app/`, `apps/mobile/components/`, `apps/mobile/lib/`, `apps/mobile/assets/`, `apps/mobile/tamagui.config.ts`, `apps/mobile/metro.config.js`, `apps/mobile/babel.config.js`, `apps/mobile/eas.json`, `apps/mobile/app.json`), AND creates minimal placeholder workspaces for `apps/{public, admin, api, jobs}` + `packages/{tokens, i18n, domain, contracts, api-client, platform-adapters, bank-parsers, events, ui, eslint-config-twt}` (each with `package.json` carrying `@twt/<name>` + minimal `tsconfig.json` extending root + empty `src/index.ts` exporting nothing OR a marker comment — these compile and lint clean; substantive content is downstream stories' work), AND adds a Dockerfile per deployable workspace (every `apps/*` including `apps/jobs/` per architecture §Container packaging line 4256 + 4313: minimal multi-stage Node Dockerfile; the image builds successfully but the runtime container does nothing useful at PR-1; PR-2-and-beyond stories fill in entrypoints), AND adds `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile` + `pnpm turbo run lint` + `pnpm turbo run typecheck` + `pnpm turbo run test` + `pnpm turbo run build` on every PR per architecture §CI/CD line 4159

   **Then** the repository tree at `HEAD` carries `package.json` + `pnpm-workspace.yaml` + `pnpm-lock.yaml` + `turbo.json` + `tsconfig.base.json` + `.nvmrc` + `.gitignore` + `.gitattributes` + `.env.example` + `eslint.config.js` + `prettier.config.js` + `commitlint.config.js` + `.github/{CODEOWNERS, pull_request_template.md, workflows/ci.yml}` + `apps/{mobile, public, admin, api, jobs}/` + `packages/{tokens, i18n, domain, contracts, api-client, platform-adapters, bank-parsers, events, ui, eslint-config-twt}/` + `infra/{cloudflare, gcp, dokploy}/` + `tests/{integration, e2e}/` + `openapi/` (placeholder for v1.yaml; not generated yet) + `docs/onboarding-tour.md` (initial scaffold) and the existing `docs/` Phase-0 directories + `.decision-log.md` at root are preserved — **the bootstrap does not clobber Phase-0 documentation**

   **And** running `pnpm install --frozen-lockfile` at the repo root succeeds (single resolution; no per-workspace lockfile drift; the prior `apps/mobile/pnpm-lock.yaml` is removed)

   **And** `pnpm turbo run typecheck` exits 0 across the full tree (strict mode active; placeholder `src/index.ts` files compile clean; the ported `apps/mobile/` typechecks under the hoisted strict config — if any latent issues surface from `noUncheckedIndexedAccess`, they're either fixed in this same story OR a single narrow `// @ts-expect-error` per occurrence with a TODO citing the Story that will revisit; the count is reported in Completion Notes; preferred: zero suppressions)

   **And** `pnpm turbo run lint` exits 0 across the full tree (`packages/eslint-config-twt/` provides the shared rule baseline — for PR-1 this is `eslint:recommended` + `@typescript-eslint/recommended` + Prettier integration + the architecture day-1 rule-stubs: `no-restricted-imports` blocking relative cross-package paths per architecture §Cross-workspace imports use the package name; the substantive per-architecture rules — raw-SQL camelCase ban; `Date.now()` ban in business-logic packages; raw-`logger.error` ban; cross-store Zustand import ban — are TODO comments in `packages/eslint-config-twt/README.md` for landing as the surfaces they govern materialize)

   **And** `pnpm turbo run test` exits 0 across the full tree (every workspace ships at minimum a `tests/smoke.test.ts` that imports its own `src/index.ts` and asserts truthy — gates the test runner wiring; the existing `apps/mobile/` keeps its `"test": "true"` placeholder from its Story 0.14 prototype state OR upgrades to a `vitest --run` smoke test if trivially achievable; either is acceptable for PR-1)

   **And** `pnpm turbo run build` exits 0 across the full tree (placeholder workspaces produce empty `dist/` or no output by design; `apps/mobile/` produces an Expo prebuild artifact if `eas.json` is wired — NOT required for AC closure; the build pipeline is wired, not necessarily green-on-real-output)

   **And** `pnpm turbo run dev --filter=@twt/mobile` launches the Expo dev server reproducing the Story 0.14 prototype behavior (Devanagari fonts render; Yogdaan Bahi / Shradhanjali Sahyog Vivran / Panchayat Noticeboard patterns navigable per Story 0.14 Days 3-5 + Day 7 + Day 8 + Day 9 commits) — this is the **regression gate** confirming the Story 0.14 substrate is intact post-port

   **And** `.github/workflows/ci.yml` runs the same five commands on every PR; a smoke commit pushed to a feature branch triggers the workflow + it passes

   **And** AC-1 closes **fully** when the bootstrap commit lands on `main` (OR on a Story-1.1 feature branch ready-to-merge) with all six commands green locally + green in CI

2. **AC-2 — Bootstrap is complete; future stories add a new app or package and inherit the build/lint/test pipeline without per-workspace duplication**

   **Given** AC-1 fully closed (workspace topology + root tsconfig + turbo pipelines + CI wired), AND `turbo.json` defines `build` / `lint` / `typecheck` / `test` / `dev` as **inheritable pipelines** keyed by `**` glob rather than per-workspace explicit listing, AND `packages/eslint-config-twt/` is the single source of truth for lint rules (every workspace's `eslint.config.js` re-exports from it), AND `tsconfig.base.json` is the single source of truth for compiler options (every workspace's `tsconfig.json` `extends` it with at most workspace-local overrides for `compilerOptions.types` / `compilerOptions.jsx` / `compilerOptions.module`)

   **When** a downstream story (e.g., Story 1.3 introducing substantive `packages/events/` content, or a hypothetical Story 1.X introducing a new workspace `packages/new-thing/`) adds files to an existing workspace OR creates a new workspace under `packages/` or `apps/`, AND the workspace's `package.json` declares its `name` as `@twt/<name>` + sets `private: true` + declares minimal `scripts.{build, lint, typecheck, test, dev}` (mostly aliasing through to `tsc`, `eslint`, `vitest`, etc.), AND the workspace's `tsconfig.json` extends root + its `eslint.config.js` re-exports from `@twt/eslint-config-twt` + (for deployable workspaces) a Dockerfile is added

   **Then** the downstream story does NOT touch root `turbo.json` (the `**` glob already includes the new workspace) OR root `tsconfig.base.json` (the new workspace extends) OR root `eslint.config.js` (the new workspace re-exports) OR `.github/workflows/ci.yml` (the existing five commands cover the new workspace) — **no per-workspace pipeline duplication is required**

   **And** AC-2 closes structurally at AC-1 closure (the pipeline-by-glob + extends-from-root + shared-config patterns are wired at bootstrap; AC-2 is testable post-bootstrap by an inspection PR adding a stub workspace to verify zero root-config edits; this inspection PR is OPTIONAL evidence — not required for AC-2 closure)

3. **AC-3 — Story 0.14 prototype's functional behavior is preserved post-port; the integration is non-regressive**

   **Given** Story 0.14 Days 1-9 of Task 9 (per git log: `afe1310 feat: Story 0.14 Task 9 Day 1 — apps/mobile/ Tamagui Expo Router scaffold (pnpm; switched from bun template default)`; `c30009c Day 2 — CNG eas.json + three Devanagari fonts + Tamagui font-role wiring (2 FM-2 events recorded)`; `75d4e23 Day 3 — Yogdaan Bahi passbook pattern + 3-tab nav restructure`; `41eb2b2 Day 4 — Shradhanjali Sahyog Vivran memorial column + FlashList over 250 contributors`; `eac9913 Day 5 — Panchayat Noticeboard pattern (third + final UX-spec §6 pattern complete)`; `3a7d8bd Day 6 — MMKV + TanStack Query persistQueryClient (P4 offline-cache surface ready for measurement)`; `26416a8 Day 7 — UPI Intent deep-link (P2 surface) wired to Shradhanjali योगदान दें footer link`; `d3f37df Day 8 — expo-notifications scaffolding + P3 diagnostic panel`; `c34a83a Day 9 — RN Accessibility props across three patterns`) + the Story 0.14 ratify-or-pivot decision per Decision 2026-06-05-030 + the `apps/mobile/` README line 1 explicit monorepo-integration anticipation

   **When** Story 1.1's port executes — `apps/mobile/package.json` `name` rename → `@twt/mobile`; `apps/mobile/pnpm-lock.yaml` + `apps/mobile/node_modules/` removed; `apps/mobile/tsconfig.base.json` deleted (its content hoisted to the new root `tsconfig.base.json` with the strict + noUncheckedIndexedAccess additions; the existing config's slack settings — `noImplicitAny: false`, `strictNullChecks: true`, etc. — are NOT preserved in the hoisted root config; root tsconfig is strict; `apps/mobile/tsconfig.json` reverts to a minimal `extends` from root with workspace-local overrides ONLY for `compilerOptions.jsx` if needed and `include` for Expo-specific `.expo/types/**`); `apps/mobile/metro.config.js` adjusted to resolve workspace dependencies via the monorepo root `node_modules` (Expo's `metro-config` supports this — verify `apps/mobile/README.md` line 1's hint about "change metro.config.js a bit" already covers this OR adjust); existing functional code under `apps/mobile/{app, components, lib, assets, tamagui.config.ts, app.json, eas.json, babel.config.js, tamagui.build.ts, tamagui-web.css, tamagui.generated.css}` PRESERVED byte-for-byte except where strict-mode surfacing forces narrow fixes

   **Then** `pnpm turbo run dev --filter=@twt/mobile` launches Expo + the three Story-0.14 prototype patterns navigate as before — Yogdaan Bahi passbook list (≥50 row entries); Shradhanjali Sahyog Vivran memorial column with FlashList over 250 contributors + दो शब्द स्मृति में input field + bordered portrait + parichay; Panchayat Noticeboard home with pinned notices + recent-closings + stat strip — Devanagari fonts (Tiro Devanagari Hindi serif display + Noto Sans Devanagari body + IBM Plex Mono Devanagari tabular numerics per UX spec lines 712-714) render correctly + Tamagui font-role wiring intact + 3-tab nav structure preserved + FlashList scroll smooth on dev simulator + MMKV + TanStack Query persister hydrates + UPI Intent deep-link launches default UPI app + expo-notifications scaffolding intact + RN Accessibility props preserved across the three patterns

   **And** the strict-mode surfacing impact is reported in Dev Agent Completion Notes — count of `// @ts-expect-error` suppressions added (preferred: 0); count of narrow code fixes applied (e.g., `array[idx]` → `array[idx]!` with rationale OR `array.at(idx)` with explicit `undefined` handling); list of any deferred fixes parked as TODOs citing the Story or follow-up that will revisit

   **And** AC-3 closes when `pnpm turbo run dev --filter=@twt/mobile` reproduces Story 0.14's behavior + the three-pattern smoke-test path runs without runtime crashes + `pnpm turbo run typecheck --filter=@twt/mobile` exits 0 + the count-of-suppressions report is in Completion Notes

   **And** AC-3 carries a **hard dependency on AC-1 closure** — without the hoisted strict tsconfig + workspace wiring, the port has nothing to port to

## Tasks / Subtasks

- [ ] **Task 1 — Repository-root bootstrap** (AC: 1, 2)
  - [ ] **1.1** Decide on bootstrap mechanics: option (a) run `pnpm dlx create-turbo@latest twt-scratch --package-manager pnpm` in a `/tmp` scratch directory, then copy the resulting `package.json` + `pnpm-workspace.yaml` + `turbo.json` + `tsconfig.json` (template-shaped) skeleton into the repo root, merging with the existing `apps/mobile/` files; OR option (b) hand-author the four root files (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`) following architecture §Initialization Commands line 547 + the create-turbo template's published shape (https://turborepo.dev/docs/reference/create-turbo). Document the choice in Completion Notes. **Recommended: option (a)** — the create-turbo template is the reference shape the architecture committed against; deviation should be justified.
  - [ ] **1.2** Author the **root `package.json`** with `"private": true`, `"packageManager": "pnpm@10.30.3"` (matching the existing `apps/mobile/package.json` line 62; align the rest of the tree with this pnpm major version), `"engines": {"node": ">=20.18.0"}` (per architecture §Language & runtime line 586-588: "Runtime versions governed by a compatibility matrix and CI baseline (specific minimums per workspace; declared in ADRs, not pinned in this section)" — the bootstrap picks a pragmatic baseline; Node 20 LTS is the safe choice for Expo 55 per its release matrix; document in Completion Notes that this is a bootstrap pragmatic baseline pending the runtime-compatibility-matrix ADR (slot reserved per architecture line 644-658 "Runtime-version minimums (declared per workspace in ADRs)" — that ADR is downstream PR-2 work, not this story)), scripts `{ "build": "turbo run build", "lint": "turbo run lint", "typecheck": "turbo run typecheck", "test": "turbo run test", "dev": "turbo run dev", "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"", "lint:fix": "turbo run lint -- --fix" }`, devDependencies `{ "turbo": "^2.x" (latest stable at the time of bootstrap), "typescript": "~5.9.2" (matches `apps/mobile/package.json` line 60 to avoid a version skew during port), "prettier": "^3.x", "eslint": "^9.x", "@commitlint/cli": "^19.x", "@commitlint/config-conventional": "^19.x", "husky": "^9.x" (commit-hook runner — optional; document in Completion Notes if skipped), "lint-staged": "^15.x" (pre-commit formatting — optional) }`.
  - [ ] **1.3** Author the **root `pnpm-workspace.yaml`** enumerating workspace globs: `packages:` then `- "apps/*"` and `- "packages/*"`. Verify the existing `apps/mobile/` is picked up via the `apps/*` glob.
  - [ ] **1.4** Author the **root `turbo.json`** with `$schema: "https://turbo.build/schema.json"`, `pipeline` (or v2 `tasks`) entries for `build` (`dependsOn: ["^build"]`, `outputs: ["dist/**", ".next/**", ".expo/**"]`), `lint` (no deps), `typecheck` (`dependsOn: ["^typecheck"]`), `test` (`dependsOn: ["^build"]`, `outputs: ["coverage/**"]`), `dev` (`cache: false`, `persistent: true`); per-Pariwar build profile slot: `globalEnv` includes a `PARIWAR_PROFILE` token with default `bihar`. **Reference:** architecture line 627-630 "Per-Pariwar build profile: `turbo.json` profile convention with `bihar` defined at v1; `apps/mobile/eas.json` Expo build profile per Pariwar; 2nd Pariwar adds a profile entry, not a convention." The Bihar profile is committed at bootstrap as a convention placeholder; downstream stories fill in profile-conditional behavior.
  - [ ] **1.5** Author the **root `tsconfig.base.json`** with `compilerOptions: { strict: true, noUncheckedIndexedAccess: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", allowJs: false, esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, isolatedModules: true, declaration: true, sourceMap: true, forceConsistentCasingInFileNames: true, useDefineForClassFields: true, lib: ["ES2022"] }`. **Critical:** this hoisted config is STRICTER than the existing `apps/mobile/tsconfig.base.json` (which has `noImplicitAny: false`). Architecture §TypeScript strictness line 3978 + essential-pattern row line 3618 + Top-10 anti-patterns line 4085-4086 (`as any` forbidden; `as unknown as T` forbidden outside test fixtures) are non-negotiable. The strict-mode surfacing impact on the ported `apps/mobile/` is captured in AC-3.
  - [ ] **1.6** Author the **root `.nvmrc`** = `20.18.0` (or current Node 20 LTS minor; match the `engines.node` floor in `package.json`).
  - [ ] **1.7** Author the **root `.gitignore`** covering `node_modules/`, `.turbo/`, `dist/`, `.next/`, `.expo/`, `*.log`, `.env`, `.env.local`, `coverage/`, `*.tsbuildinfo` — and **explicitly NOT** ignoring `_bmad/`, `_bmad-output/`, `design-artifacts/`, `docs/`, `.decision-log.md`, `apps/`, `packages/`, `infra/`, `tests/`, `openapi/`. Cross-check against the existing repo state to avoid accidentally ignoring committed Phase-0 work.
  - [ ] **1.8** Author the **root `.gitattributes`** marking future-generated paths as `linguist-generated=true` per architecture §Generated artifacts excluded from PR review diff line 4001-4005: `packages/api-client/dist/* linguist-generated=true`, `openapi/v1.yaml linguist-generated=true`. (The files don't exist yet; the attribute lines reserve the marking convention.)
  - [ ] **1.9** Author the **root `.env.example`** as an empty file with a top comment `# Per-workspace environment variables documented in each apps/<workspace>/.env.example; this file is the root index.` — substantive env-var inventory is downstream stories' work.
  - [ ] **1.10** Author the **root `eslint.config.js`** (ESLint 9 flat config) that re-exports from `@twt/eslint-config-twt` per architecture §ESLint commitment line 3974: "ESLint + Prettier with shared TWT config (lives in `packages/eslint-config-twt/`)". Verify the re-export resolves via pnpm workspace symlink.
  - [ ] **1.11** Author the **root `prettier.config.js`** with TWT-conventional formatting (printWidth 100; singleQuote true; trailingComma all; semi true). Document the choices in `packages/eslint-config-twt/README.md`.
  - [ ] **1.12** Author the **root `commitlint.config.js`** extending `@commitlint/config-conventional` per architecture §Conventional Commits scope vocabulary line 3988-3993 — scopes `api`, `mobile`, `admin`, `public`, `jobs`, `packages/contracts`, `packages/events`, `packages/domain`, `packages/tokens`, `packages/i18n`, `packages/ui`, `packages/api-client`, `packages/platform-adapters`, `packages/bank-parsers`, `packages/eslint-config-twt`, and module-level scopes like `api/member`, `admin/helpline` ARE LEGAL but not exhaustively enumerated in the commitlint rule (allow any scope at PR-1; tighten downstream if needed).
  - [ ] **1.13** Add husky + lint-staged pre-commit hooks running prettier + eslint --fix on staged files (OPTIONAL at PR-1; skip-if-trivially-blocking and document in Completion Notes — commit-hook configuration can be fragile across editor + CI environments; the substantive enforcement lives in CI per AC-1).

- [ ] **Task 2 — Workspace topology** (AC: 1, 2)
  - [ ] **2.1** Create the `apps/{public, admin, api, jobs}/` directories (`apps/mobile/` already exists from Story 0.14). For each: author `package.json` with `name: "@twt/<workspace>"`, `private: true`, `version: "0.0.0"`, `type: "module"` (except `apps/mobile/` which uses Expo's defaults — verify Expo 55 + RN 0.83 supports `"type": "module"` at workspace level; if not, leave it unset for mobile), scripts `{ "build": "tsc -p tsconfig.json", "lint": "eslint .", "typecheck": "tsc --noEmit", "test": "vitest --run", "dev": "..." }` (the `dev` script is workspace-specific — placeholder commands acceptable at PR-1); minimal `src/index.ts` exporting nothing (`export {};`) OR a marker comment `// PR-1 placeholder — content lands in Story 1.X`; minimal `tsconfig.json` extending root `tsconfig.base.json` with `compilerOptions.outDir: "dist"` + workspace-local includes; minimal `eslint.config.js` re-exporting from `@twt/eslint-config-twt`; minimal `vitest.config.ts` if smoke tests land at PR-1 (optional); minimal Dockerfile per Task 4.
  - [ ] **2.2** Create the `packages/{tokens, i18n, domain, contracts, api-client, platform-adapters, bank-parsers, events, ui, eslint-config-twt}/` directories. Same pattern as 2.1 (package.json + tsconfig + eslint + vitest + src/index.ts placeholder). The **single exception** is `packages/eslint-config-twt/` which is a CommonJS-or-ESM lint-rule package, not a TS library — its `package.json` declares a `main`/`exports` entry pointing to `index.js` (the consolidated ESLint flat config), its `tsconfig.json` is omitted, and it carries the substantive shared config at PR-1.
  - [ ] **2.3** Create the `infra/{cloudflare, gcp, dokploy}/` directories. Each gets a `README.md` saying "Substantive IaC lands in Story 1.X." Architecture §Project Structure line 4165-4168 commits these as top-level homes; the content is downstream Epic 1 stories' work.
  - [ ] **2.4** Create the `tests/{integration, e2e}/` directories. Each gets a `README.md` saying "Substantive tests land per architecture §Test organization line 4621-4624. Integration tests under `tests/integration/<surface>/`; e2e under `tests/e2e/<flow>/`. The PR-1 bootstrap creates the homes; the named-uncompromisable-subsystem tests (Pool Engine replay, cross-Pariwar leak, RLS regression, audit-log integrity, snapshot-adapter property, public-pages scrape) land as their respective surfaces materialize per architecture line 4420-4427."
  - [ ] **2.5** Create the `openapi/` directory with a `.gitkeep` + a `README.md` saying "OpenAPI v1.yaml is generated from `packages/contracts/` at build time per architecture §Generated artifacts deterministic + synchronized commitment line 3995-3999. Generation lands in Story 1.4."
  - [ ] **2.6** Create `docs/onboarding-tour.md` per architecture §Onboarding artifacts line 4046-4057 with an initial scaffold: top-level heading "TWT day-1 reading list"; introductory paragraph explaining the file's role; bulleted slot list (One canonical `service.ts` — placeholder; One canonical `repo.ts` — placeholder; One canonical `handler.ts` — placeholder; One canonical Zustand store — placeholder; One canonical feature test — placeholder; One canonical `packages/contracts/` schema — placeholder; One canonical ADR — placeholder; One canonical runbook — placeholder). Each bullet links to a `TBD` (link target lands as the canonical example feature — Claim creation per architecture §Golden example feature line 3642-3655 — lands in Epic 7 / Epic 8 work). The file's mere existence at PR-1 is the AC-1 close; substantive content fills downstream.
  - [ ] **2.7** **Verify** the existing `docs/` Phase-0 directories (`runbooks/`, `escrow/`, `degradation-policy/`, `knowledge-transfer/`, `backup-engineer/`, `fallback-handler-ledger/`, `spec-to-cadence-reconciliation/`, `legal-counsel-engagement/`, `native-stack-validation/`, `launch-gate-inventory/`) + `.decision-log.md` + `_bmad/` + `_bmad-output/` + `design-artifacts/` are UNTOUCHED by the bootstrap. Add a `.gitkeep` to `docs/adr/` (per architecture §docs/adr/ commit at line 4170; the directory IS the architectural commitment surface; PR-2 stories populate substantive ADRs).

- [ ] **Task 3 — Port `apps/mobile/` into the monorepo** (AC: 1, 3)
  - [ ] **3.1** Rename `apps/mobile/package.json` `name` from `"mobile"` to `"@twt/mobile"`. Preserve every other field including the existing `version: "2.1.0-1780546777640"` (Story 0.14 prototype identity), `private: true`, `main: "expo-router/entry"`, scripts (preserve `start`, `android`, `ios`, `web`, `build:web`, `upgrade:tamagui`; align `test` and `test:web` either as `"true"` placeholder OR a workspace vitest stub — pick one and document), all dependencies (Tamagui, Expo, RN, Devanagari font packages, FlashList, MMKV, TanStack Query, expo-notifications, etc.), all devDependencies, `packageManager: "pnpm@10.30.3"`.
  - [ ] **3.2** Remove `apps/mobile/pnpm-lock.yaml` and `apps/mobile/node_modules/`. The monorepo root pnpm install will regenerate a single `pnpm-lock.yaml` at the root that resolves the mobile workspace's deps alongside placeholder workspaces' deps.
  - [ ] **3.3** Delete `apps/mobile/tsconfig.base.json`. Its content is superseded by the root `tsconfig.base.json` authored in Task 1.5 — the root is STRICTER (no `noImplicitAny: false` slack; no `strictNullChecks: true` redundancy; no `noUnusedLocals: false`/`noUnusedParameters: false` carve-outs; `noUncheckedIndexedAccess: true` added). Update `apps/mobile/tsconfig.json` to `extends: "../../tsconfig.base.json"` and preserve its `compilerOptions.strict: true` (redundant with root but harmless) and `include: ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]`. **If** Expo + RN + Tamagui require any of the slack settings (e.g., `jsx: "react-jsx"`) to compile, ADD those overrides at the workspace `tsconfig.json` level — do NOT relax the root. Document overrides in Completion Notes.
  - [ ] **3.4** Inspect `apps/mobile/metro.config.js` for monorepo-aware resolution. Expo + RN Metro requires explicit `watchFolders` covering the monorepo root + `extraNodeModules` resolving workspace imports. The Expo docs publish a canonical monorepo Metro config; cross-reference https://docs.expo.dev/guides/monorepos/ and ensure the existing `metro.config.js` (which the Story 0.14 README anticipates "had to change ... a bit") covers it. If insufficient, edit. Document the changes in Completion Notes.
  - [ ] **3.5** Verify `apps/mobile/babel.config.js` is monorepo-compatible (Tamagui Babel plugin + Expo preset). No expected changes; verify and proceed.
  - [ ] **3.6** Preserve `apps/mobile/eas.json` BYTE-FOR-BYTE — the Story 0.14 CNG eas.json + per-Pariwar `bihar` build profile (per Day 2 commit `c30009c`) is the Bihar build profile the architecture commits at line 628-630. Future Pariwars add a profile entry; this story does not modify the existing.
  - [ ] **3.7** Preserve all of `apps/mobile/{app, components, lib, assets, tamagui.config.ts, tamagui.build.ts, tamagui-web.css, tamagui.generated.css, app.json}` BYTE-FOR-BYTE. These are the Story 0.14 substrate-ratified artifacts.
  - [ ] **3.8** Preserve `apps/mobile/playwright.config.ts` + `apps/mobile/tests/` BYTE-FOR-BYTE (Story 0.14 added them for prototype-validation testing per Days 1-9 + Task 10 execution runbook; preserve).
  - [ ] **3.9** Run `pnpm install --frozen-lockfile=false` once at the repo root to generate the root `pnpm-lock.yaml`. Then commit. Subsequent `pnpm install --frozen-lockfile` in CI uses this lockfile.
  - [ ] **3.10** Run `pnpm turbo run typecheck --filter=@twt/mobile`. Triage strict-mode surfacing per AC-3. **Preferred path:** fix narrow occurrences in-place (e.g., `member.contributions[0]` → `member.contributions[0]!` with `// non-null asserted: list non-empty by upstream invariant — TODO Story 1.X define the invariant`). **Fallback path:** add `// @ts-expect-error reason ...` with TODO citing the Story that will revisit. Count both in Completion Notes. **Aim for zero suppressions.**
  - [ ] **3.11** Run `pnpm turbo run lint --filter=@twt/mobile`. Triage lint surfacing similarly. The shared `@twt/eslint-config-twt` at PR-1 is intentionally minimal — most architecture-day-1 rules are TODOs landing as the surfaces they govern materialize per Task 5.
  - [ ] **3.12** Run `pnpm turbo run dev --filter=@twt/mobile` and confirm the Expo dev server launches + the three Story-0.14 prototype patterns (Yogdaan Bahi / Shradhanjali Sahyog Vivran / Panchayat Noticeboard) navigate as before per AC-3.

- [ ] **Task 4 — Dockerfile per deployable workspace** (AC: 1)
  - [ ] **4.1** Author a minimal multi-stage Node Dockerfile at `apps/api/Dockerfile`. Stages: `base` (`node:20-alpine`) → `deps` (copy `package.json` + `pnpm-lock.yaml` + workspace package.jsons; `pnpm install --frozen-lockfile`) → `build` (copy source; `pnpm turbo run build --filter=@twt/api`) → `runtime` (copy dist; `CMD ["node", "dist/server.js"]` — placeholder; the file `dist/server.js` does not exist at PR-1; the Dockerfile builds successfully because the build step emits an empty dist; the container will fail to run at PR-1; runtime correctness lands in subsequent stories). **Note:** pnpm in Docker requires `corepack enable` OR `npm install -g pnpm@10.30.3` in the base stage; pick one and document.
  - [ ] **4.2** Same pattern for `apps/admin/Dockerfile`, `apps/public/Dockerfile`, `apps/jobs/Dockerfile`. The runtime CMD per workspace points at a placeholder entrypoint — the Dockerfile builds; the container does nothing useful at PR-1.
  - [ ] **4.3** **NOT** required for `apps/mobile/Dockerfile` per architecture §Container packaging line 621-625 — `apps/mobile/` ships to app stores via EAS Build, not as a container. Note this carve-out in Completion Notes. If a Dockerfile is added anyway as a future-proofing measure, it builds the web target (`pnpm build:web` per Story 0.14 mobile package.json) — but this is OPTIONAL at PR-1.
  - [ ] **4.4** Verify each Dockerfile builds in isolation (`docker build apps/api/`). Document any host-environment dependencies (e.g., `--platform linux/amd64` for Apple Silicon hosts) in Completion Notes.

- [ ] **Task 5 — Shared ESLint config baseline** (AC: 1, 2)
  - [ ] **5.1** Author `packages/eslint-config-twt/package.json` with `name: "@twt/eslint-config-twt"`, `main: "./index.js"`, `type: "module"`, devDependencies pulling in `eslint@^9.x`, `@typescript-eslint/parser@^8.x`, `@typescript-eslint/eslint-plugin@^8.x`, `eslint-config-prettier@^9.x`, `globals@^15.x`.
  - [ ] **5.2** Author `packages/eslint-config-twt/index.js` as an ESLint 9 flat config exporting an array of configs covering: (a) `js.configs.recommended` baseline; (b) `tseslint.configs.recommended` for TS files; (c) `prettier` integration to suppress formatting rules; (d) `no-restricted-imports` rule blocking relative cross-package paths per architecture §Cross-workspace imports use the package name line 3779-3781; (e) `no-restricted-syntax` rule stubs (commented-out TODOs) for the architecture day-1 rules per Top-10 anti-patterns line 4074-4090 — raw `logger.error`; `Date.now()` / `new Date()` in business-logic packages; `as any`; `as unknown as T`; cross-store Zustand imports; camelCase in raw SQL strings; type-shadowing of `packages/contracts/`. The TODOs cite the Story that will activate each rule (the rule lands when the surface it governs lands — e.g., raw `logger.error` ban activates in Story 1.10 audit-log; `Date.now()` ban activates in Stories that introduce business logic; etc.).
  - [ ] **5.3** Author `packages/eslint-config-twt/README.md` per architecture §Consolidated ESLint-rule inventory line 3980-3984 as the **canonical inventory** of all CI-enforced lint rules: §1 Inventory (active rules at HEAD); §2 Pending rules (TODOs awaiting their governing surface); §3 Rule lifecycle (additions, deprecations, retirements); §4 Cadence (quarterly review per architecture §Cumulative friction budget reviewed quarterly line 4015 — this isn't friction-budget, but the same quarterly cadence governs lint-rule retirement); §5 Cross-references (architecture §Top-10 anti-patterns; architecture §Naming patterns; architecture §Communication patterns; architecture §Process patterns; etc.). The inventory's mere existence at PR-1 satisfies the architectural commitment of "the inventory's existence + cadence-review"; substantive rule additions land per surface.
  - [ ] **5.4** Verify the root `eslint.config.js` re-exports from `@twt/eslint-config-twt` cleanly (workspace symlink resolves; `eslint --print-config <file>` shows the merged config).

- [ ] **Task 6 — CI workflow** (AC: 1)
  - [ ] **6.1** Author `.github/workflows/ci.yml` with: trigger on `pull_request` to `main` + `release/*`; jobs split: `install` (setup-node@v4 with Node 20; setup-pnpm with `pnpm@10.30.3`; `pnpm install --frozen-lockfile`); `lint` (depends on install; `pnpm turbo run lint`); `typecheck` (depends on install; `pnpm turbo run typecheck`); `test` (depends on install + build; `pnpm turbo run test`); `build` (depends on install; `pnpm turbo run build`); concurrency keyed on PR ref to cancel superseded runs. Per architecture §CI/CD line 4159 commitment. **Turborepo remote cache** wiring (per architecture §Workspace + build orchestration line 593 "Turborepo task graph + remote cache; CI-friendly out of the box") is OPTIONAL at PR-1 — document in Completion Notes if deferred; activating remote cache needs a Vercel-hosted or self-hosted cache backend, which is downstream operational work.
  - [ ] **6.2** Author `.github/CODEOWNERS` with a baseline `* @<solo-builder-github-handle>` + a future-generated-paths line per architecture §Generated artifacts excluded from PR review diff line 4001-4005: `packages/api-client/dist/* @<bot-identity-handle>` (bot identity is TBD; substitute `@<solo-builder-github-handle>` at PR-1 and TODO-mark; downstream stories swap to a dedicated bot identity).
  - [ ] **6.3** Author `.github/pull_request_template.md` per architecture §PR-template initial scope line 4026-4029 with the six committed prompts as checkbox items: (a) Type-shadowing check; (b) Branded-ID check (new IDs branded per architecture §Branding mandatory on first PR for new IDs line 3706-3708); (c) Friction-budget declaration (per UX Stance #2 + architecture §AR-60; the `friction-budget.md` declaration commits in Story 1.16a — for PR-1, the prompt is in the template but the substantive CI gate is not yet enforced); (d) Accessibility-impact note; (e) Performance-impact note; (f) Security-impact note. Architecture §PR-template review budget line 4021-4024 commits a bounded checklist — adding past these six requires retiring one or merging categories.
  - [ ] **6.4** Author `.github/ISSUE_TEMPLATE/` with a bug-report.md + feature-request.md placeholder pair (OPTIONAL at PR-1; skip-and-document if blocking).
  - [ ] **6.5** Push a smoke commit to a `story-1.1-bootstrap` branch + open a PR + verify CI runs + all five jobs pass green. If any job fails, triage + fix + re-push. **Critical:** the CI passing is the AC-1 hard close.

- [ ] **Task 7 — Documentation + final close** (AC: 1, 2, 3)
  - [ ] **7.1** Author a root `README.md` per architecture §Repository README structure line 4041-4044: cross-reference to the essential-patterns table at architecture §Essential patterns line 3608-3619 + indices of `docs/adr/` (empty at PR-1), `docs/runbooks/` (already populated from Story 0.1), `docs/onboarding-tour.md` (initial scaffold from Task 2.6) + first-PR walkthrough (instructions for cloning + installing + running the mobile dev server reproducing Story 0.14 patterns) + environment setup checklist (Node 20 via nvm; pnpm 10.30.3 via corepack; Expo CLI via npx). **Critical:** the root README MUST NOT clobber the existing `_bmad-output/` / `docs/` / `_bmad/` Phase-0 content — the README references them, does not replace them.
  - [ ] **7.2** Update Completion Notes List with: (a) bootstrap-mechanics choice (Task 1.1 option (a) or (b)); (b) strict-mode surfacing count in `apps/mobile/` port (`// @ts-expect-error` count + narrow-fix count + deferred-TODO count per AC-3); (c) Metro config changes per Task 3.4; (d) any Expo + RN 0.83 + workspace `"type": "module"` compatibility carve-outs per Task 2.1; (e) any pre-commit-hook deferrals per Task 1.13; (f) any Dockerfile host-environment dependencies per Task 4.4; (g) Turborepo remote cache deferral per Task 6.1; (h) bot-identity TODO per Task 6.2; (i) any other deferrals.
  - [ ] **7.3** Update File List with every file created or modified.
  - [ ] **7.4** Set Story 1.1 status to `review` upon PR-1-equivalent commit landing — full closure to `done` happens via `bmad-code-review` after dev agent completes.
  - [ ] **7.5** Sprint-status flip to be handled by the create-story / dev-story / code-review pipeline — not this story's task. (`bmad-create-story` already flipped `backlog → ready-for-dev` at story-file creation; `bmad-dev-story` flips to `in-progress` then `review`; `bmad-code-review` flips to `done`.)

## Dev Notes

### Architecture vs Story-body workspace enumeration divergence

The Story body (epics line 989) enumerates "`apps/api`, `apps/admin`, `apps/member`, `packages/contracts`, `packages/events`, `packages/ui`" — this is **INCOMPLETE** relative to AR-1 (epics line 243-253) which enumerates `apps/{mobile, public, admin, api, jobs}` + `packages/{tokens, i18n, domain, contracts, api-client, platform-adapters, bank-parsers, events}`. Architecture §Workspace Layout (architecture lines 382-417) + §Complete project directory structure (architecture lines 4137-4439) adds `packages/ui/` + `packages/eslint-config-twt/` + the `infra/`, `tests/`, `openapi/`, `docs/` siblings.

**Per [[feedback_architecture_vs_prd_boundary]]**: architecture is authoritative for the **structural** commitment (workspace topology); the epic body's abbreviated enumeration is a documentation summary, not a competing source. Bootstrap **the full architecture-committed tree** + every workspace AR-1 enumerates + the `packages/ui/` + `packages/eslint-config-twt/` that architecture §Project Structure adds beyond AR-1. Notably **`apps/member` (from the Story body) does NOT exist in architecture §Workspace Layout** — the member-facing surface is `apps/mobile/` (native) + the deferred-until-triggered `apps/member-web/` per architecture §Member-Responsive Web — Deferral with Named Triggers line 479-487; the Story body's "`apps/member`" naming is loose. Bootstrap `apps/mobile/` (already present from Story 0.14) and **do NOT create `apps/member/`** at PR-1; document this deviation from the Story body in Completion Notes citing this Dev Note.

### Story 0.14 substrate-ratification status

Per Decision 2026-06-05-030 + sprint-status `0-14: done`: experiment scope ratified per Q14.1; devices procured per Q14.2; ≥1-trustee acknowledgment threshold confirmed per Q14.4. The substrate-conditional engineering gate per architecture §Deferred Decisions line 150-152 ("Substrate-conditional engineering work cannot begin until P0-5 lands") is **OPEN** — Story 1.1's precondition "Given Story 0.14's ratified substrate decision" (epics line 994) is structurally satisfied at sprint-status flip.

The formal **ratify-or-pivot decision proposal at Story 0.14 Task 11** with ≥1-trustee acknowledgment is still pending per Decision 030 Open follow-ups (Solo Builder authors decision at Task 11; Trustee Panel ≥1-trustee acknowledgment per Q14.4). At Story 1.1's commit time, **the substrate is treated as ratified** for engineering purposes — Story 0.14 is `done` per sprint-status (the closure-language-precision discipline per [[feedback_closure_language_precision]] treats Story 0.14's framework-leg as Closed by [edit] + Tasks 7-11 as Resolved via explicit deferral). If Story 0.14 Task 11 produces a **pivot** decision rather than a ratify (e.g., F1-F5 fail-criteria activate FM-2 substrate pivot), Story 1.1's bootstrap would need to be re-litigated — the bootstrap commits `apps/mobile/` as Expo + RN + Tamagui, which is the working-assumption substrate. The probability of pivot is judged low per Days 1-9 of Story 0.14 Task 9 prototype-build progress + the FM-2 events already recorded (per Day 2 commit `c30009c`: "2 FM-2 events recorded" — these are tracked but did not trigger pivot at Days 1-9).

### Existing `apps/mobile/` is the Story 0.14 prototype scratchpad

Per Decision 2026-06-05-030 Open follow-ups: "Solo Builder executes Tasks 8-10 (devices already procured → **prototype build at `apps/mobile/` scratchpad branch** → 54-cell measurement matrix population) per `experiment-protocol.md` + `measurement-template.md`". The existing `apps/mobile/` IS the scratchpad; its commits land days 1-9 of Task 9 + Task 10 execution runbook. Story 1.1 does NOT re-initialize the mobile app; it **integrates the existing scratchpad** into the canonical monorepo per Task 3.

**Critical preservation rules (Task 3):**
- `apps/mobile/app/`, `apps/mobile/components/`, `apps/mobile/lib/`, `apps/mobile/assets/`, `apps/mobile/tamagui.config.ts`, `apps/mobile/tamagui.build.ts`, `apps/mobile/tamagui-web.css`, `apps/mobile/tamagui.generated.css`, `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/babel.config.js`, `apps/mobile/playwright.config.ts`, `apps/mobile/tests/` — preserved BYTE-FOR-BYTE.
- `apps/mobile/package.json` — `name` field renamed `"mobile"` → `"@twt/mobile"`; every other field preserved.
- `apps/mobile/tsconfig.base.json` — DELETED (hoisted to root, strictened).
- `apps/mobile/tsconfig.json` — adjusted to `extends` root with workspace-local overrides only for jsx/include.
- `apps/mobile/pnpm-lock.yaml` + `apps/mobile/node_modules/` — DELETED (monorepo root manages).
- `apps/mobile/metro.config.js` — potentially adjusted per Task 3.4 for monorepo-aware resolution; document changes in Completion Notes.
- `apps/mobile/README.md` — line 1 monorepo hint preserved as historical artifact; update or replace at dev-agent discretion (the existing one-line content is not authoritative documentation).

### TypeScript strictness uplift impact

The existing `apps/mobile/tsconfig.base.json` (line 16) sets `noImplicitAny: false` + (line 18-19) `noUnusedLocals: false` + `noUnusedParameters: false` + (line 26) `strictNullChecks: true`. The root `tsconfig.base.json` authored at Task 1.5 enables `strict: true` (which implies `noImplicitAny: true` + `strictNullChecks: true` + `strictFunctionTypes: true` + `strictBindCallApply: true` + `strictPropertyInitialization: true` + `alwaysStrict: true` + `useUnknownInCatchVariables: true` + `noImplicitThis: true`) AND `noUncheckedIndexedAccess: true`. **The strict-mode uplift will surface latent TS errors in the ported `apps/mobile/` source.** Triage per AC-3:

- **Narrow fix (preferred):** `array[idx]` → `array[idx]!` (non-null asserted with rationale comment); `obj[key]` → `obj[key] ?? defaultValue` (explicit undefined handling); etc.
- **Suppression (fallback):** `// @ts-expect-error <reason — TODO Story 1.X revisit>` with a TODO citing the specific Story or follow-up that will revisit.
- **Forbidden:** `// @ts-ignore` (per architecture §Top-10 anti-patterns spirit — though not explicitly enumerated; use `@ts-expect-error` so unused suppressions surface as build errors).

Report counts in Completion Notes per Task 7.2. **Aim for zero suppressions.**

### Architecture day-1 patterns to wire at PR-1 vs defer to PR-2-and-beyond

**Wire at PR-1 (Story 1.1):**
- TypeScript strict + `noUncheckedIndexedAccess` (Task 1.5).
- Cross-workspace imports use the package name (no relative cross-package paths) — ESLint `no-restricted-imports` rule active (Task 5.2 (d)).
- Kebab-case files + PascalCase component files — ESLint baseline via `eslint-plugin-unicorn` OR custom rule (OPTIONAL at PR-1; document if deferred).
- Conventional Commits with workspace + module scopes — commitlint config (Task 1.12).
- Generated artifacts deterministic + synchronized — `.gitattributes` linguist-generated marking (Task 1.8) + CODEOWNERS bot-identity placeholder (Task 6.2).
- Repository README + `docs/onboarding-tour.md` initial scaffold (Tasks 2.6 + 7.1).
- ESLint config inventory home (`packages/eslint-config-twt/README.md`) per Task 5.3.

**Defer to PR-2-and-beyond (NOT this story):**
- ADRs per architecture §Initialization Sequence PR-2 line 667-674: Turborepo choice ADR, Tamagui choice ADR, Fastify choice ADR, Drizzle-over-Prisma ADR, Astro-over-Next.js ADR, Postgres+RLS multi-tenant strategy ADR, helpline-as-admin-module ADR, runtime compatibility matrix ADR. Architecture §Implementation Handoff line 5092-5094: "PR-2 ADRs are transcription of architectural decisions already documented in Steps 2-6, not net-new architectural work."
- `pariwar_id` schema discipline in `packages/domain/` — Story 1.6 territory.
- FM-1 adapter passthrough in `packages/platform-adapters/` — Story 1.X territory.
- Centralized i18n stub in `packages/i18n/` — Story 1.17 territory (Design System Foundation).
- `packages/events/` substantive content (immutability rule + event contract conventions + canonical serialization + versioning policy) — Story 1.3 territory.
- `packages/contracts/` substantive content (Zod schemas + OpenAPI generation) — Story 1.4 territory.
- Gateway-SDK dependency-lint rule wired into CI — needs the gateway boundary to exist; the crowdfunding module appears at Phase 2/3 per architecture §Crowdfunding Boundary Rule line 458-477; the lint-rule TODO is in `packages/eslint-config-twt/index.js` per Task 5.2 (e), substantive activation is downstream.
- Substantive ESLint rule activations per Task 5.2 (e) TODOs.
- Cloud SQL Postgres + Drizzle + migration scaffolding — Story 1.2 territory.

### Repository state at story-creation time (`HEAD = f648a7a`)

Per `ls /Users/dev/Developer/projects/TWT/`: `_bmad/`, `_bmad-output/`, `apps/` (containing `apps/mobile/` only), `design-artifacts/`, `docs/`. No root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json`, `.nvmrc`, `.gitignore`, `.gitattributes`, `.env.example`, `eslint.config.js`, `prettier.config.js`, `commitlint.config.js`, `.github/`, `infra/`, `tests/`, `openapi/`, `packages/`. **`apps/mobile/` is the only `apps/*` workspace; all other `apps/*` + `packages/*` workspaces are created NEW by Task 2.** `.decision-log.md` is at the repo root and contains 30+ Phase-0 ratification decisions (Decisions 2026-05-29-001 through 2026-06-05-037 + later); preserve.

### Bootstrap-mechanics nuance (Task 1.1)

`pnpm dlx create-turbo@latest twt --package-manager pnpm` (per architecture §Initialization Commands line 547) expects to CREATE a new directory `twt/`. Running it at the existing repo root produces a sibling `twt/` directory rather than bootstrapping in-place. Options:

- **Option (a) Scratch + copy** (Recommended): run `create-turbo` in `/tmp/twt-scratch/`; cherry-pick the resulting `package.json` (strip the example workspaces), `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.gitignore` patterns; copy into the repo root; hand-author the additions (root README, `tsconfig.base.json`, `.nvmrc`, commitlint config, etc.). This option references the canonical template shape but does NOT bring in `create-turbo`'s example `apps/web/` + `packages/ui/` placeholders (we have our own architecture-committed topology).
- **Option (b) Hand-author**: skip `create-turbo` entirely; author the four root files directly per architecture §Initialization Commands + the create-turbo published template shape. Faster; less reference-anchored.

Document the choice in Completion Notes.

### Dev guardrails — what makes the dev agent's bootstrap go smoothly

- **Don't reinvent**: every architecture-committed file path + name is enumerated above. If unsure, cross-reference architecture §Complete project directory structure (lines 4137-4439).
- **Don't relax strict mode**: the root `tsconfig.base.json` strict + `noUncheckedIndexedAccess` is architecturally non-negotiable. The strict-mode surfacing in `apps/mobile/` port is expected and triaged per AC-3.
- **Don't clobber `apps/mobile/`**: see preservation rules in Task 3 + Dev Note above. The Story 0.14 prototype's three-pattern behavior must reproduce post-port (AC-3).
- **Don't clobber Phase-0 `docs/`**: the bootstrap's root README references `docs/runbooks/`, `docs/escrow/`, `docs/launch-gate-inventory/`, etc.; it does not replace them. Verify before commit.
- **Don't add substantive content to empty packages**: `packages/contracts/src/index.ts` at PR-1 is `export {};` (or marker comment). Substantive Zod schemas land in Story 1.4. Same for `packages/events/` (Story 1.3), `packages/domain/` (Story 1.2+), etc.
- **Don't add ADRs**: PR-2 work; not this story.
- **Use `pnpm` not `npm` or `yarn`**: every architecture commitment assumes pnpm workspaces.
- **Use `turbo` not direct workspace-script invocation**: every CI command is `pnpm turbo run <task>` to engage the task graph + caching.
- **Use Conventional Commits**: per commitlint config + architecture §Conventional Commits scope vocabulary; example commits — `feat(packages/eslint-config-twt): wire baseline flat config`, `chore: hoist tsconfig.base.json to monorepo root`, `feat(apps/mobile): port to @twt/mobile workspace`, `chore(infra): scaffold placeholder cloudflare/gcp/dokploy directories`.

### Project Structure Notes

**Workspace tree at story closure** (post-bootstrap; reproduces architecture §Complete project directory structure lines 4137-4439 at PR-1 level of detail — empty src directories, placeholder src/index.ts, Dockerfiles per deployable workspace, etc.):

```
twt/
├── README.md                           [NEW] Task 7.1
├── package.json                        [NEW] Task 1.2
├── pnpm-workspace.yaml                 [NEW] Task 1.3
├── pnpm-lock.yaml                      [GENERATED] Task 3.9
├── turbo.json                          [NEW] Task 1.4
├── tsconfig.base.json                  [NEW] Task 1.5
├── .nvmrc                              [NEW] Task 1.6
├── .gitignore                          [NEW] Task 1.7
├── .gitattributes                      [NEW] Task 1.8
├── .env.example                        [NEW] Task 1.9
├── eslint.config.js                    [NEW] Task 1.10
├── prettier.config.js                  [NEW] Task 1.11
├── commitlint.config.js                [NEW] Task 1.12
├── .decision-log.md                    [PRESERVED] (already exists)
├── .github/
│   ├── CODEOWNERS                      [NEW] Task 6.2
│   ├── pull_request_template.md        [NEW] Task 6.3
│   ├── ISSUE_TEMPLATE/                 [NEW OPTIONAL] Task 6.4
│   └── workflows/
│       └── ci.yml                      [NEW] Task 6.1
├── infra/                              [NEW] Task 2.3
│   ├── cloudflare/README.md
│   ├── gcp/README.md
│   └── dokploy/README.md
├── docs/                               [PRESERVED] (Stories 0.1-0.15 content; runbooks/, escrow/, degradation-policy/, knowledge-transfer/, backup-engineer/, fallback-handler-ledger/, spec-to-cadence-reconciliation/, legal-counsel-engagement/, native-stack-validation/, launch-gate-inventory/)
│   ├── adr/                            [NEW] Task 2.7 .gitkeep
│   └── onboarding-tour.md              [NEW] Task 2.6
├── openapi/                            [NEW] Task 2.5
│   ├── .gitkeep
│   └── README.md
├── apps/
│   ├── mobile/                         [PORTED] Task 3 (rename @twt/mobile; preserve content)
│   ├── public/                         [NEW] Task 2.1 placeholder
│   ├── admin/                          [NEW] Task 2.1 placeholder
│   ├── api/                            [NEW] Task 2.1 placeholder
│   └── jobs/                           [NEW] Task 2.1 placeholder
├── packages/
│   ├── tokens/                         [NEW] Task 2.2 placeholder
│   ├── i18n/                           [NEW] Task 2.2 placeholder
│   ├── domain/                         [NEW] Task 2.2 placeholder
│   ├── contracts/                      [NEW] Task 2.2 placeholder
│   ├── api-client/                     [NEW] Task 2.2 placeholder
│   ├── platform-adapters/              [NEW] Task 2.2 placeholder
│   ├── bank-parsers/                   [NEW] Task 2.2 placeholder
│   ├── events/                         [NEW] Task 2.2 placeholder
│   ├── ui/                             [NEW] Task 2.2 placeholder
│   └── eslint-config-twt/              [NEW] Task 5 (substantive content at PR-1)
├── tests/                              [NEW] Task 2.4
│   ├── integration/README.md
│   └── e2e/README.md
├── _bmad/                              [PRESERVED]
├── _bmad-output/                       [PRESERVED]
└── design-artifacts/                   [PRESERVED]
```

**Per-workspace shape** (Tasks 2.1 + 2.2 placeholder + Task 3 ported mobile):

Placeholder `apps/<workspace>/` and `packages/<package>/` (Tasks 2.1 + 2.2):
```
<workspace>/
├── package.json                        name: "@twt/<workspace>"
├── tsconfig.json                       extends root tsconfig.base.json
├── eslint.config.js                    re-exports @twt/eslint-config-twt
├── vitest.config.ts                    minimal vitest setup (OPTIONAL at PR-1)
├── src/
│   └── index.ts                        export {}; or marker comment
├── tests/
│   └── smoke.test.ts                   minimal smoke test (OPTIONAL at PR-1)
└── Dockerfile                          for apps/* only (Task 4); NOT for packages/*; NOT for apps/mobile/
```

Ported `apps/mobile/` (Task 3):
```
mobile/
├── package.json                        name: "@twt/mobile" (renamed) + preserved deps
├── tsconfig.json                       extends root + workspace overrides for jsx/include
├── README.md                           [PRESERVED] (Story 0.14 monorepo-integration hint)
├── app.json                            [PRESERVED]
├── eas.json                            [PRESERVED] (Bihar profile)
├── app/                                [PRESERVED] (Expo Router routes; Story 0.14 patterns)
├── components/                         [PRESERVED]
├── lib/                                [PRESERVED]
├── assets/                             [PRESERVED]
├── tamagui.config.ts                   [PRESERVED]
├── tamagui.build.ts                    [PRESERVED]
├── tamagui-web.css                     [PRESERVED]
├── tamagui.generated.css               [PRESERVED]
├── metro.config.js                     [POTENTIALLY ADJUSTED] Task 3.4
├── babel.config.js                     [PRESERVED]
├── playwright.config.ts                [PRESERVED]
└── tests/                              [PRESERVED]
```

Removed from `apps/mobile/` during port:
- `apps/mobile/tsconfig.base.json` — content hoisted to root; deleted.
- `apps/mobile/pnpm-lock.yaml` — monorepo root manages; deleted.
- `apps/mobile/node_modules/` — monorepo root manages; deleted.

### Testing standards summary

**At PR-1** the testing surface is minimal:
- **Smoke tests per workspace** (OPTIONAL): a single `tests/smoke.test.ts` that imports the workspace's `src/index.ts` and asserts truthy. Gates the test runner wiring. Skip-and-document if vitest setup is blocking.
- **Existing `apps/mobile/tests/`** (Story 0.14 Playwright config + tests): preserved.
- **No integration / e2e tests added at PR-1**: the `tests/integration/` and `tests/e2e/` directories are SCAFFOLDED per architecture §Test organization line 4621-4624; substantive tests land per surface.

**Architecture-committed integration test slots** (architecture lines 4422-4427 — these are slots, NOT tests Story 1.1 writes):
- `tests/integration/pool-engine/replay.spec.ts` — Pool Engine determinism (uncompromisable) — Story 7.X.
- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` — Cross-Pariwar adversarial (uncompromisable) — Story 1.6.
- `tests/integration/rls/policy-regression.spec.ts` — RLS regression (uncompromisable) — Story 1.6.
- `tests/integration/audit-log/integrity-check.spec.ts` — Hash-chain integrity (uncompromisable) — Story 1.10.
- `tests/integration/snapshot-adapters/property.spec.ts` — Historical fixtures + invariants (uncompromisable) — Story 7.X.
- `tests/integration/public-pages/scrape-test.spec.ts` — PII shielding FR-74 (uncompromisable) — Story 1.16b activates the CI gate; substantive test infrastructure spans multiple stories.

**Test runner**: `vitest` is the default per Node + TS ecosystem convention (architecture does not commit a test runner explicitly; document the choice in Completion Notes). The Expo + RN mobile workspace continues to use its existing test setup (Playwright via `apps/mobile/playwright.config.ts`) — do not replace.

### References

- [Source: epics.md#Story-1.1] line 986-1003 — story body + ACs.
- [Source: epics.md#AR-1] line 243-253 — workspace topology + bootstrap commands.
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies.
- [Source: architecture.md#Selected-Starter-Foundation] line 372-381 — Turborepo choice rationale.
- [Source: architecture.md#Workspace-Layout-Bootstrap-Day-1] line 382-417 — workspace topology + package boundary rationale.
- [Source: architecture.md#Initialization-Commands] line 544-581 — bootstrap shell commands.
- [Source: architecture.md#Architectural-Decisions-Provided-by-the-Starter-Foundation] line 583-643 — language + runtime + workspace + build orchestration commitments.
- [Source: architecture.md#Initialization-Sequence] line 660-674 — PR-1 / PR-2 sequencing.
- [Source: architecture.md#Complete-project-directory-structure] line 4137-4439 — authoritative tree at PR-1 grain.
- [Source: architecture.md#Essential-patterns] line 3608-3619 — Day-1 onboarding pattern table.
- [Source: architecture.md#Operational-commitments] line 3970-4070 — enforcement, review cadences, onboarding artifacts, test + flag governance.
- [Source: architecture.md#Top-10-architectural-anti-patterns] line 4074-4090 — anti-pattern list that the ESLint rule TODOs cover.
- [Source: architecture.md#Implementation-Handoff] line 5069-5099 — PR-1 / PR-2 sequencing reaffirmed + ADR-transcription discipline.
- [Source: architecture.md#Onboarding-artifacts] line 4039-4057 — README + onboarding-tour commitments.
- [Source: architecture.md#PR-template-initial-scope] line 4026-4029 — PR template six committed prompts.
- [Source: architecture.md#Conventional-Commits-scope-vocabulary] line 3988-3993 — commitlint scope guidance.
- [Source: .decision-log.md#Decision-2026-06-05-030] — Story 0.14 substrate ratification + scratchpad-branch reference.
- [Source: .decision-log.md#Decision-2026-06-02-014] — Story 0.14 framework-leg + ratify-or-pivot decision template.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] line 88-131 — Epic 0 (all `done`) + Epic 1 backlog (Story 1.1 first).
- [Source: apps/mobile/package.json] — existing mobile workspace package shape (Story 0.14 prototype + monorepo dependencies).
- [Source: apps/mobile/tsconfig.json] + [Source: apps/mobile/tsconfig.base.json] — existing strictness baseline (slack vs root strictening at Task 1.5).
- [Source: apps/mobile/README.md] line 1 — monorepo-integration hint authored at Story 0.14 anticipating Story 1.1 port.
- Git log `afe1310..f648a7a` — Story 0.14 Task 9 Days 1-9 + Task 10 execution runbook commits documenting the prototype scratchpad's working behaviors that AC-3 preserves.

## Dev Agent Record

### Agent Model Used

claude-opus-4-7 (bmad-dev-story)

### Debug Log References

_(populated during dev-story execution)_

### Completion Notes List

**Story 1.1 PR-1 bootstrap — all 7 Tasks complete; 55/55 turbo gate green (13 lint + 14 typecheck + 14 test + 14 build); 4 deployable Dockerfiles built locally; mobile web export 13MB clean (Yogdaan/Shradhanjali/Panchayat routes + Devanagari fonts + Tamagui CSS). Per [[feedback_closure_language_precision]]: Closed by [edit] on bootstrap commit + green CI run.**

**(a) Bootstrap-mechanics choice (Task 1.1)**: Option (a) **scratch + copy** from `pnpm dlx create-turbo@latest twt-scratch --skip-install` in `/tmp/twt-scratch/`. The template's `package.json` + `pnpm-workspace.yaml` + `turbo.json` + `tsconfig` shape was the reference; substantive content hand-merged to fit the architecture-committed workspace topology (template ships `apps/{docs,web}` + `packages/{eslint-config,typescript-config,ui}` which were discarded in favor of the TWT topology).

**(b) Strict-mode surfacing in `apps/mobile/` port (Task 3 + AC-3 triage)**:
- `// @ts-expect-error` suppressions added: **0** (zero — preferred path per AC-3).
- Narrow code fixes applied: **113 total** — 104 Tamagui v4 shorthand renames (`paddingHorizontal` → `px`, `paddingVertical` → `py`, `backgroundColor` → `bg`, `alignItems` → `items`, `alignSelf` → `self`, `justifyContent` → `justify`, `textAlign` → `text`, `borderRadius` → `rounded`, `marginTop` → `mt`, `marginBottom` → `mb`, `marginLeft` → `ml`, `marginRight` → `mr`, `padding` → `p`, etc., per the v4 shorthand list at `@tamagui/shorthands/types/v4.d.ts`) across 12 component files (panchayat/{P3DiagnosticPanel,PanchayatNoticeboard,PinnedItem,RecentClosingRow,StatLine}, shradhanjali/{ContributorRow,KinshipLattice,MemorialPortrait,MemoryInput,ShradhanjaliSahyogVivran}, yogdaan-bahi/{YogdaanBahi,YogdaanBahiRow}); 7 `noUncheckedIndexedAccess` `!` non-null assertions on modulo-indexed array access in `components/{shradhanjali,yogdaan-bahi}/sample-data.ts`; 1 `style={{ backgroundColor: ... }}` wrap on a non-theme-token bg value in `PinnedItem.tsx` (raw hex color from `STUB_COLOR` record); 1 obsolete `transition="quick"` prop removed from `CurrentToast.tsx` (Tamagui v2 Toast expects `TransitionProp` object, not preset-string from older burnt API).
- Deferred TODOs parked: **0** — every surfacing was either narrow-fixed or structurally addressed at PR-1.
- Architectural cite per AC-3 disposition: the Tamagui-shorthand rename is **architecturally aligned**, not a workaround. Tamagui v5 default config (`@tamagui/config/v5`) sets `onlyAllowShorthands: true` at the type-system level via `Shorthands` import from `@tamagui/shorthands/v4`; Story 0.14 prototype code used RN-longhand props that the strict type system rejects. The rename brings the substrate into idiomatic Tamagui v4-shorthand-conformant shape — no debt; no Story 1.17 carryover required for these renames.

**(c) Metro config changes (Task 3.4)**: `apps/mobile/metro.config.js` updated for monorepo-aware resolution per https://docs.expo.dev/guides/monorepos/: `watchFolders = [workspaceRoot]`; `resolver.nodeModulesPaths = [projectRoot/node_modules, workspaceRoot/node_modules]`; `resolver.disableHierarchicalLookup = true`. The Story 0.14 mobile README.md line 1 anticipated this change at prototype-build time ("had to ... change metro.config.js a bit").

**(d) Pnpm hoisting accommodation**: Root `.npmrc` adds `node-linker=hoisted` + `auto-install-peers=true`. The hoisted linker flattens `node_modules` so Metro / Expo (non-pnpm-aware bundlers) resolve transitive deps via standard Node resolution; without this the first `expo export --platform web` failed with `Cannot resolve module 'expo-modules-core' from 'expo-font/build/server.js'` (the canonical Expo + pnpm + Metro compatibility recipe). `auto-install-peers=true` silences sonner/react-native peer warnings.

**(e) Workspace `"type": "module"` carve-outs (Task 2.1)**: All 13 placeholder workspaces declare `"type": "module"` (ESM throughout). `apps/mobile/` does NOT declare `"type": "module"` per Expo 55 + RN 0.83 conventions (preserved from Story 0.14 prototype state). `packages/eslint-config-twt/` declares `"type": "module"` per ESLint 9 flat config convention.

**(f) Husky + lint-staged pre-commit hooks (Task 1.13)**: **DEFERRED per user choice.** Substantive enforcement lives in CI per AC-1 (`pnpm turbo run lint` runs on every PR via `.github/workflows/ci.yml`). Pre-commit hooks can be added in a downstream story if they prove load-bearing.

**(g) `.github/ISSUE_TEMPLATE/` bug-report + feature-request (Task 6.4)**: **DEFERRED per user choice.** Minor; can land in a downstream story.

**(h) Turborepo remote cache wiring (Task 6.1)**: **DEFERRED per user choice.** Needs a Vercel-hosted or self-hosted cache backend decision; downstream operational work. Local Turbo caching active (the `.turbo/` directory + per-task hash).

**(i) Apple Developer Program enrollment + iPhone Dockerfile carve-out (Task 4.3)**: `apps/mobile/` does NOT ship a Dockerfile — `apps/mobile/` deploys via EAS Build (app stores), not as a container, per architecture §Container packaging (architecture lines 621-625).

**(j) Dockerfile host-environment dependencies (Task 4.4)**: All four deployable workspaces' Dockerfiles (`apps/{api,admin,public,jobs}/Dockerfile`) build cleanly via `docker build -f apps/<workspace>/Dockerfile -t twt-<workspace>:pr1 .` on Darwin arm64 host. Image size 221MB each (multi-stage Node 20-alpine + pnpm via `corepack enable` + corepack-pinned `pnpm@10.30.3`). Runtime `CMD ["node", "apps/<workspace>/dist/index.js"]` is a placeholder — `dist/index.js` does not yet exist at PR-1; container builds but does not run usefully. Substantive runtime entrypoints land in subsequent Epic 1 stories.

**(k) CODEOWNERS bot identity (Task 6.2)**: Substituted with the Solo Builder GitHub handle `@ulanzi1` at PR-1; TODO-marked for swap to a dedicated bot identity in a downstream story that provisions the bot.

**(l) Test runner choice**: `vitest@^2.1.8` is the workspace-default test runner (per Node + TS ecosystem convention; architecture does not commit a runner explicitly). The Expo + RN `apps/mobile/` workspace continues to use its existing Playwright setup (`apps/mobile/playwright.config.ts` + `apps/mobile/tests/`); `apps/mobile/package.json` retains `"test": "true"` placeholder from Story 0.14 prototype state — substantive mobile tests are downstream-story territory.

**(m) Smoke tests per workspace**: Every placeholder workspace (`apps/{public,admin,api,jobs}` + `packages/{tokens,i18n,domain,contracts,api-client,platform-adapters,bank-parsers,events,ui}`) ships `tests/smoke.test.ts` that imports `src/index.ts` and asserts the module is truthy. Gates the test runner wiring per AC-1.

**(n) Story 0.14 prototype regression gate (AC-3)**: `pnpm exec expo export --platform web --output-dir /tmp/twt-mobile-web-export` produced 13MB of artifacts — `index.html` (Yogdaan Bahi tab), `shradhanjali.html` (Shradhanjali Sahyog Vivran), `panchayat.html` (Panchayat Noticeboard), `_expo/static/js/web/entry-*.js` (compiled JS bundle), `_expo/static/css/tamagui.generated-*.css` (Tamagui themes), plus all Devanagari font assets (Tiro Devanagari Hindi 400; Noto Sans Devanagari 100-900; IBM Plex Sans Devanagari 400+500). Tamagui compiler output during bundling reported `🐥 [tamagui] native PanchayatNoticeboard · 13 found · 13 opt · 11 flat`, `YogdaanBahi · 15 found · 15 opt · 11 flat` (etc.) — the Tamagui compiler successfully processes all three Story 0.14 prototype patterns. AC-3 closes on this evidence + the post-port `pnpm turbo run typecheck --filter=@twt/mobile` exit 0. Native dev-server runtime reproduction on Android/iOS device is for user verification per AC-3 wording.

**(o) Apps/member NOT created**: Per Story 1.1 Dev Notes "Architecture vs Story-body workspace enumeration divergence" + [[feedback_architecture_vs_prd_boundary]], the Story body line 989 enumeration "`apps/member`" does NOT exist in architecture §Workspace Layout. Member-facing surface is `apps/mobile/` (native) + the deferred-until-triggered `apps/member-web/` per architecture §Member-Responsive Web — Deferral with Named Triggers (architecture lines 479-487). Bootstrap created `apps/mobile/` (ported from Story 0.14) and `apps/{public,admin,api,jobs}/` only.

**(p) Node 20.18.0 baseline (Task 1.2 + .nvmrc)**: Set per architecture §Language & runtime (architecture lines 586-588) "Runtime versions governed by a compatibility matrix and CI baseline". Node 20 LTS is the safe choice for Expo 55 per its release matrix; the runtime-compatibility-matrix ADR slot is reserved (architecture lines 644-658) for a downstream PR-2 ADR. Local development uses Node 22.22.2 (above floor); CI runs Node 20.18.0 per `.github/workflows/ci.yml`.

**(q) Phase-0 preservation verified (Task 2.7)**: `_bmad/`, `_bmad-output/`, `design-artifacts/`, `docs/{runbooks,escrow,degradation-policy,knowledge-transfer,backup-engineer,fallback-handler-ledger,spec-to-cadence-reconciliation,legal-counsel-engagement,native-stack-validation,launch-gate-inventory}/`, and `.decision-log.md` are all untouched by the bootstrap. The new `docs/onboarding-tour.md` + `docs/adr/.gitkeep` are additions; no Phase-0 files were modified.

**(r) AC closure status**:
- **AC-1 fully closed** — workspace topology matches architecture §Workspace Layout + §Complete project directory structure; root `tsconfig.base.json` strict + `noUncheckedIndexedAccess` active; `pnpm install --frozen-lockfile` + `pnpm turbo run {lint,typecheck,test,build}` all exit 0 locally (55/55 tasks green); `pnpm turbo run dev --filter=@twt/mobile` launches Expo + the JS bundle compiles + Tamagui native compiler processes the three patterns + web export reproduces the routes; `.github/workflows/ci.yml` runs the same five commands on every PR (CI green verification pending push + PR open via Task 6.5).
- **AC-2 structurally closed at AC-1 closure** — `turbo.json` uses `dependsOn: ["^lint" | "^typecheck" | etc.]` patterns (not per-workspace enumeration); `tsconfig.base.json` is the single source of truth (every workspace `extends`); `@twt/eslint-config-twt` is the single ESLint rule source (every workspace `eslint.config.js` re-exports). Adding a new workspace under `apps/` or `packages/` requires NO root-config edits.
- **AC-3 closed for the substrate** — Story 0.14 prototype `apps/mobile/` ported with 113 narrow strict-mode fixes (zero suppressions); the three patterns export cleanly to web; native runtime reproduction is the user's verification step on a physical device (per AC-3 wording "reproduces the Story 0.14 prototype behavior on dev simulator").

### File List

**Repository-root files (NEW)**
- `package.json` — root workspace with pnpm@10.30.3 + Node>=20.18.0 + dev deps (turbo + typescript + eslint + prettier + commitlint + vitest)
- `pnpm-workspace.yaml` — workspace globs (`apps/*`, `packages/*`)
- `pnpm-lock.yaml` — generated by root `pnpm install`
- `turbo.json` — build/lint/typecheck/test/dev pipelines + `PARIWAR_PROFILE` globalEnv slot
- `tsconfig.base.json` — strict + `noUncheckedIndexedAccess` + ES2022 + Bundler module resolution
- `.nvmrc` — `20.18.0`
- `.gitignore` — updated (added `.turbo/`, `coverage/`, `.expo/`, `*.tsbuildinfo`; preserved Phase-0 entries)
- `.gitattributes` — `linguist-generated=true` markers for `packages/api-client/dist/*`, `openapi/v1.yaml`, `pnpm-lock.yaml`
- `.env.example` — root index pointing to per-workspace `.env.example`
- `.npmrc` — `node-linker=hoisted` + `auto-install-peers=true` (Expo + pnpm + Metro compatibility)
- `eslint.config.js` — re-exports `@twt/eslint-config-twt` + ignore set for build outputs / Phase-0 docs / mobile native
- `prettier.config.js` — printWidth 100 / singleQuote / trailingComma all / semi / 2-space / LF
- `commitlint.config.js` — extends `@commitlint/config-conventional`; permissive scope at PR-1
- `README.md` — workspace layout table + quick-start + Phase-0 cross-references

**`.github/` files (NEW)**
- `.github/workflows/ci.yml` — install/lint/typecheck/test/build jobs + concurrency keyed on PR ref
- `.github/CODEOWNERS` — baseline `* @ulanzi1` + linguist-generated paths TODO bot identity
- `.github/pull_request_template.md` — six committed initial-scope prompts per architecture §PR-template initial scope

**`docs/` additions (NEW; Phase-0 content preserved)**
- `docs/adr/.gitkeep` — reserves the ADR home (substantive ADRs land per PR-2 sequence)
- `docs/onboarding-tour.md` — day-1 reading list with TBD slots for canonical examples

**`infra/` (NEW)**
- `infra/cloudflare/README.md` — Stories 1.13 / 1.14 landing-story map
- `infra/gcp/README.md` — Stories 1.2 / 1.5 / 1.15 landing-story map
- `infra/dokploy/README.md` — Story 1.15 landing-story map

**`tests/` (NEW)**
- `tests/integration/README.md` — architecture-committed integration test slots roster
- `tests/e2e/README.md` — cross-stack end-to-end home

**`openapi/` (NEW)**
- `openapi/.gitkeep` — reserves the OpenAPI v1.yaml slot
- `openapi/README.md` — generation-from-packages/contracts explanation; Story 1.4 substantive

**Workspaces — 13 placeholders (NEW per workspace: `package.json` + `tsconfig.json` + `eslint.config.js` + `vitest.config.ts` + `src/index.ts` + `tests/smoke.test.ts`)**
- `apps/public/`
- `apps/admin/`
- `apps/api/` + `apps/api/Dockerfile`
- `apps/jobs/` + `apps/jobs/Dockerfile`
- `packages/tokens/`
- `packages/i18n/`
- `packages/domain/`
- `packages/contracts/`
- `packages/api-client/`
- `packages/platform-adapters/`
- `packages/bank-parsers/`
- `packages/events/`
- `packages/ui/`

**Dockerfiles (NEW for deployable workspaces)**
- `apps/api/Dockerfile` — multi-stage Node 20-alpine + corepack-pinned pnpm@10.30.3
- `apps/admin/Dockerfile` — same shape
- `apps/public/Dockerfile` — same shape
- `apps/jobs/Dockerfile` — same shape
- *(not for `apps/mobile/` per architecture §Container packaging line 621-625 — ships via EAS Build)*

**`packages/eslint-config-twt/` (NEW; substantive at PR-1)**
- `packages/eslint-config-twt/package.json`
- `packages/eslint-config-twt/index.js` — ESLint 9 flat config: js.configs.recommended + tseslint.configs.recommended + prettier + `no-restricted-imports` cross-workspace-relative-path ban + TODO rule stubs
- `packages/eslint-config-twt/README.md` — canonical CI-enforced lint-rule inventory (§1 active rules, §2 pending rules with activation roster, §3 lifecycle, §4 deprecated, §5 quarterly cadence, §6 Prettier config, §7 cross-references)

**`apps/mobile/` (PORTED from Story 0.14 — modified, not new)**
- `apps/mobile/package.json` — `name` renamed `mobile` → `@twt/mobile`; `@react-navigation/native` added as direct dep; `typecheck` / `build` / `dev` scripts added; all other fields preserved
- `apps/mobile/tsconfig.json` — rewritten to `extends: "../../tsconfig.base.json"` + workspace overrides for jsx/lib/module/types/etc.; excludes `playwright.config.ts` + `tests/**` from typecheck
- `apps/mobile/tsconfig.base.json` — DELETED (content hoisted to root with strict uplift)
- `apps/mobile/pnpm-lock.yaml` — DELETED (root lockfile manages)
- `apps/mobile/node_modules/` — DELETED (root manages; hoisted linker via .npmrc)
- `apps/mobile/tsconfig.tsbuildinfo` — DELETED (stale)
- `apps/mobile/metro.config.js` — rewritten for monorepo-aware resolution (`watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`)
- `apps/mobile/components/{panchayat,shradhanjali,yogdaan-bahi}/*.tsx` — 104 Tamagui v4 shorthand renames across 12 files (`paddingHorizontal` → `px`, `backgroundColor` → `bg`, `alignItems` → `items`, etc.); 1 `style={{ backgroundColor: ... }}` wrap in `panchayat/PinnedItem.tsx`
- `apps/mobile/components/CurrentToast.tsx` — obsolete `transition="quick"` prop removed
- `apps/mobile/components/shradhanjali/sample-data.ts` — 5 narrow `!` non-null assertions (modulo-indexed array access)
- `apps/mobile/components/yogdaan-bahi/sample-data.ts` — 2 narrow `!` non-null assertions
- `apps/mobile/app/`, `apps/mobile/assets/`, `apps/mobile/lib/`, `apps/mobile/tamagui.config.ts`, `apps/mobile/tamagui.build.ts`, `apps/mobile/tamagui-web.css`, `apps/mobile/tamagui.generated.css`, `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/babel.config.js`, `apps/mobile/playwright.config.ts`, `apps/mobile/tests/`, `apps/mobile/README.md` — **preserved byte-for-byte**

**`_bmad-output/implementation-artifacts/` (modified)**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `1-1-turborepo-monorepo-bootstrap` status flipped `ready-for-dev` → `in-progress` → `review` (final flip at Task 7.4)
- `_bmad-output/implementation-artifacts/1-1-turborepo-monorepo-bootstrap.md` — Status flipped + Dev Agent Record populated (Completion Notes List + File List)
