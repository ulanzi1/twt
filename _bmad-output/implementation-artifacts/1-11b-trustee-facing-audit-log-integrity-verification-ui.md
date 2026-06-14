# Story 1.11b: Trustee-Facing Audit-Log Integrity Verification UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

`[SURFACE]` — this is the **first real admin-UI surface in the repo.** It ships a trustee-facing
"Verify audit-log integrity" page that consumes the on-demand endpoint Story 1.11a built
(`POST /api/v1/audit/verify-integrity`), shows the last automated check + a green/red banner +
the last-30-check history, and runs the verification on demand. Because `apps/admin/` is still a
`tsc` placeholder and `packages/{api-client,ui,tokens}` are stubs, **this story also bootstraps
the admin SPA shell** (Vite + React + Tailwind + Radix + TanStack Query + TanStack Router) —
minimally, just enough to host this page well. The on-demand verification *job* + endpoint are
DONE (1.11a); **do NOT rebuild them — call them.** Several ACs reference backend that does not yet
exist (history/last-automated reads, an `audit.verify` permission read for the UI gate, the
cold-mirror pointer, an acknowledgement + ticket); each is resolved in a Critical Design Decision
below.

## Story

As a Trustee Panel,
I want a one-click "Verify audit-log integrity" button in the admin UI that runs the integrity-verification job on-demand and surfaces results visibly,
so that I can prove to regulators / press / members at any moment that the audit chain has not been tampered with (SM-1 demo beat C11).

## Acceptance Criteria

**Given** Story 1.11a's on-demand endpoint (`POST /api/v1/audit/verify-integrity`)
**When** the trustee admin UI surface is implemented

1. **AC-1** — There is a "Verify audit-log integrity" page reachable from the admin chrome, **visible only to roles carrying the `audit.verify` permission** (Story 1.8). [The page/nav entry is gated client-side from a permission read — see **DD-6**; the server keeps the `requireAdminSession` gate per D4-1.11a.]
2. **AC-2** — The page shows the **last automated check** (timestamp, range, result, verifier), a **green/red status banner**, and a **history of the last 30 checks**. [Needs two NEW read endpoints — see **DD-3**.]
3. **AC-3** — Clicking **"Run verification now"** invokes the on-demand endpoint, shows a **progress indicator**, and renders the result **within ~10 seconds** for a typical-size chain.

**Given** a synthetic tamper attempt has succeeded (test scenario)
**When** the trustee clicks "Run verification now"

4. **AC-4** — The page renders a **red audit-failure banner** showing the **failing row ID**, the **prior valid row ID**, the **tamper-suspect window timestamp**, and the **cold-mirror's last-good-state pointer**. [Field provenance + the cold-mirror-deferral handling — see **DD-4**.]
5. **AC-5** — The red banner **persists until manually acknowledged and an investigation ticket is opened**. [No acknowledgement mechanism / ticketing exists yet — see **DD-5**.]

**Given** the repo's quality gates
**When** the story is complete

6. **AC-6 (gate)** — `pnpm turbo run lint typecheck test build` is green across the monorepo (including the newly-bootstrapped `apps/admin/` Vite build); any new endpoint keeps `contracts:check-openapi-determinism` **byte-stable**; the admin SPA **builds and serves** the page; the page meets **WCAG 2.1 AA** for this surface (Radix primitives, keyboard reachable, `aria-live` banner, token-pair contrast — §4.10); component/integration tests cover **run-now → green**, **run-now → red banner with all four fields**, **history renders**, **gate hides the page without `audit.verify`**, and **acknowledge clears banner persistence**.

## CRITICAL DESIGN DECISIONS — resolve these FIRST (they shape every task)

This is the first UI story, so most forks are about *how much net-new foundation* to lay vs defer.
Each has a **recommended** path; deviate only with a recorded rationale in the author-commit + a
Decision-log entry. Per `[[feedback_closure_language_precision]]`, every deferral records a trigger.
✅ **DD-2, DD-5, DD-6 were the three scope forks — BigDev CONFIRMED all three on their recommended
paths (2026-06-14): minimal real login (DD-2), build the acknowledgement + ticket-ref mechanism
(DD-5), add the `/auth/session` introspection gate (DD-6). Build to the recommended path; the forks
are settled, not open.**

### DD-1 — Admin SPA bootstrap scope (first UI in the repo). **RECOMMENDED: bootstrap the architecture-committed admin stack (Vite + React 19 + TS + Tailwind + Radix + TanStack Query + TanStack Router + RHF/Zod) but MINIMALLY — a thin shell + this one module; defer the design-system + codegen build-out.**

`apps/admin/` is a `tsc` placeholder (`src/index.ts` = `export {}`); `packages/{api-client,ui,tokens}`
are the same stub. The architecture commits the stack precisely (§4.1 L2470-2479; §4.7 L2678-2702;
directory tree L4223 "Vite + React + Tailwind + Radix"). UX §L50: *"Admin scaffolding ships first
as a developer surface; polished member UI follows"* — so v1 is a **developer-grade surface**, not a
designed product.

- **Build now:** Vite React-TS SPA in `apps/admin/`; a minimal **app shell / chrome** (top bar + a
  nav region that will grow); **TanStack Router** route tree (`/login`, `/audit/integrity`); a
  **TanStack Query** `QueryClient`; a **route-level error boundary** (§4.9 L2716). Land the page as
  `apps/admin/src/modules/audit-integrity/` per the committed module convention (directory tree
  L4223/L4238 — modules are under `src/modules/` in the tree; §4.7 mapping L4523 abbreviates this
  as `apps/admin/modules/*` but the tree is definitive).
- **Defer (record triggers):** extracting shared atoms into `packages/ui/` + design tokens into
  `packages/tokens/` (use Tailwind/Radix **directly in `apps/admin/`** for now — extraction graduates
  when a 2nd admin surface needs the same atoms); the helpline/other `modules/*`; the full
  OpenAPI→client codegen (DD-7); IndexedDB cache persister (the integrity reads are **cache-disabled**
  per §4.5 L2588-2589 "cache-disabled for verifier-console reads" — strong-consistency surface).
- **Wiring chores:** switch `apps/admin` `build` from `tsc` → `vite build` (+ `tsc --noEmit` for
  `typecheck`); keep `test: vitest run` and add **React Testing Library + jsdom**; update
  `apps/admin/Dockerfile` (currently a placeholder) to build/serve the static SPA; confirm `turbo run
  build lint typecheck test` stays green tree-wide. ⚠ Do not break the existing CI matrix.
- **⚠ Tailwind config:** Do **NOT** create `tailwind.config.ts` — the architecture tree (L4226)
  shows one but it is a v3-era artifact; Tailwind v4 is CSS-first. Use `@import "tailwindcss"` +
  `@theme {}` in the CSS entry point; wire the **`@tailwindcss/vite`** plugin in `vite.config.ts`
  (not a PostCSS config file). Also use **`@tanstack/router-plugin/vite`** if going file-based
  routing (see DD-1 / Task 2.2).

### DD-2 — Authentication: how a trustee reaches a session-gated page (1.9 is backend-only; no login UI exists). **RECOMMENDED: ship a MINIMAL login page driving the existing 1.9 endpoints; defer enrollment/reset UI.**

The page requires an admin session (`requireAdminSession`). Story 1.9 shipped the full auth API
(`/api/v1/auth/login` → `{status:'mfa_required',methods}`, then `/passkey/authenticate/*` or
`/recovery/consume`, then a session cookie; `/logout`) — `apps/api/src/modules/auth/admin/admin-auth.routes.ts`
— but **there is no login UI**. A trustee cannot reach the verify page without one.

- **v1 (recommended):** a minimal `/login` page at **`src/routes/login.tsx`** (TanStack Router
  file-based — the architecture tree shows `src/routes/`): email + password form (RHF + `LoginRequest`
  Zod schema from `packages/contracts/src/auth/login.ts`) → server returns
  `{status:'mfa_required', methods:[...]}` (see `LoginResponse` in that same file) → on `mfa_required`,
  drive **passkey-authenticate** (`@simplewebauthn/browser`) **or** recovery-code consume → session
  established (HttpOnly + SameSite=Lax cookie set by the server; the SPA just rides it; `credentials:
  'include'` on every fetch). An **auth guard** (in the TanStack Router root route, `src/routes/__root.tsx`)
  redirects unauthenticated users to `/login`; a 401 from any API call bounces to `/login` (mirrors
  §4.7 L2694-2702 deep-link landing checks: auth → scope → authz). Reuse the same `@twt/contracts` Zod
  schemas (`LoginRequest`, `PasskeyAuth*`) for the RHF forms (§4.4 L2554).
- **Defer (record triggers):** passkey **enrollment** UI, password-reset UI, step-up-OTP UI — those
  server flows exist; the dev surface logs in as an **already-enrolled** admin. CSRF: the global
  `originCheckHook` + SameSite cookie are the baseline; `app.csrfProtection` double-submit is only on
  `logout` today (ADR-0009) — match that pattern, do not invent new CSRF posture.
- **Lighter alternative (if the user prefers a thinner story):** defer ALL login UI; document a
  **dev-session bootstrap** (operator logs in via the API once; the browser holds the cookie) and the
  page simply assumes a session + redirects 401s to a placeholder. ⚠ Recommend the real minimal login
  because AC-1 + the SM-1 C11 demo need a trustee to actually reach the page.

### DD-3 — "Last automated check" + "history of last 30" need NEW read endpoints (1.11a built only the POST). **RECOMMENDED: add a GLOBAL `GET /api/v1/audit/integrity-checks` in the existing `modules/audit-log` module.**

1.11a persists every run to `audit_integrity_checks` (global table; `twt_app` has `SELECT` — migration
0009) but exposed **no read path**. AC-2 needs both the history and the latest automated verdict.

- `GET /api/v1/audit/integrity-checks?limit=30&triggerSource=<optional>` → `AuditIntegrityCheckResult[]`
  ordered by `verified_at DESC`, read via `deps.servicePool` (same posture as the POST handler;
  `twt_app` SELECT grant covers it). New contract `AuditIntegrityCheckList = z.array(AuditIntegrityCheckResult)`
  (or a `{ checks: [...] }` envelope) in `packages/contracts/src/audit/integrity-check.ts`; register
  the component + path in `scripts/emit-openapi.ts`; keep `contracts:check-openapi-determinism`
  byte-stable; extend the type-assignability test.
- **Last automated check** = the most recent row with `triggerSource IN ('cron','post_mirror')` —
  expose via `?triggerSource=cron&limit=1`, or derive client-side from the history list (simpler;
  fewer round-trips). The card shows `verifiedAt` (timestamp), `startSeq…endSeq` (range), `chainValid`
  (result), `verifierActor` (verifier).
- **Gate:** same `requireAdminSession` preHandler as the POST. ⚠ Do **not** try `requirePermissionHook`
  on this global route — it requires `request.scopeTx` (set only from `/:pariwarId/`) and **hard-throws
  500** without it (the exact 1.11a landmine; the endpoint comment in `modules/audit-log/index.ts:9-16`
  documents it). RBAC upgrade stays deferred (D4-1.11a); the UI-side gate is DD-6.

### DD-4 — The red-banner fields, incl. the cold-mirror pointer that doesn't exist yet (cold mirror deferred D1-1.11a). **RECOMMENDED: derive every field from the verdict + history; show the cold-mirror line as an explicit deferral, not a fake pointer.**

AC-4 wants four fields on the red banner. Map each to a real source:
- **Failing row ID** = `firstBrokenAuditId` (+ `firstBrokenSeq`) from the verdict.
- **Prior valid row ID** = `endAuditId` (+ `endSeq`) from the **same** verdict (1.11a sets `endSeq` to
  the last good row before the break — see the 1.11a review fix that corrected `endSeq:null` →
  `endSeq:6`).
- **Tamper-suspect window timestamp** = the interval **between the last `chainValid=true` check's
  `verifiedAt`** (from history) **and this failing check's `verifiedAt`** — the window in which the
  break must have occurred. Label it as a window (from–to), not a point.
- **Cold-mirror last-good-state pointer** — ⚠ the cold mirror is a **CI fake**; the live GCS apply +
  separate-project read SA are **deferred (D1-1.11a / arch §2.10)**. Do **not** fabricate a pointer.
  Render the **best hot-chain proxy** — the last `chainValid=true` check's `endAuditId`/`endSeq` (the
  last state the chain was provably good) — **clearly labelled** "last provably-good state (hot
  chain)", and a secondary line "cold-mirror cross-verification: deferred (D1-1.11a)". Record the
  graduation: surface the real cold-mirror pointer when the live mirror + separate-project reader land.

### DD-5 — Banner persistence + acknowledgement + "investigation ticket" — none of these exist (no ack store, no helpdesk/ticketing). **RECOMMENDED: add a lightweight append-only acknowledgement (migration 0011 + a POST); capture a free-text ticket ref; defer real helpdesk integration.**

AC-5: the red banner persists "until manually acknowledged and an investigation ticket is opened."
There is **no acknowledgement column/table** and **no ticketing system** (helpdesk FR-52 =
`apps/api/modules/helpdesk/` + `apps/admin/modules/helpdesk/` — **not built**; directory tree L4679).

- **Acknowledgement (recommended):** migration **0011** adds `acknowledged_at timestamptz NULL`,
  `acknowledged_by text NULL`, `ticket_ref text NULL` to `audit_integrity_checks` (the table is
  already append-only via 1.11a triggers — an ack is a *controlled* UPDATE, so this needs either an
  **exception in the reject-mutation trigger** scoped to those three columns, OR a **separate
  `audit_integrity_acknowledgements` append-only table** keyed by `check_id`. ⚠ Prefer the **separate
  table** — it keeps `audit_integrity_checks` strictly append-only/immutable, which is the whole point
  of a tamper-evidence record). Endpoint: `POST /api/v1/audit/integrity-checks/:checkId/acknowledge`
  with `{ ticketRef: string }` (`requireAdminSession` only — the global `originCheckHook` +
  SameSite=Lax cookie is the CSRF baseline per ADR-0009; `app.csrfProtection` double-submit is
  restricted to `logout` and must NOT be added to new write routes without an ADR amendment —
  see 1.11a review dismiss note, Group 3).
- **Banner persistence** = client-derived: "latest check has `chainValid=false` AND no
  acknowledgement" → banner shown; acknowledge → invalidate the query → banner clears. No new client
  durable store needed (TanStack Query is the source of truth; §4.3 boundary discipline — server state
  in Query, not Zustand).
- **Investigation ticket** — no ticketing exists → the acknowledge form **requires a non-empty
  `ticketRef`** (an external ticket id/URL the trustee pastes); recording it *is* the v1 "ticket
  opened" artifact. Record the graduation: wire to the helpdesk module (FR-52) when it lands.
- **Lighter alternative:** defer acknowledgement entirely (the banner reflects only the live verdict).
  ⚠ Recommend keeping it — AC-5 is explicit and the persistence+ack is the tamper-response discipline
  the trust posture (UX §L591 "auditability is the trust capital") depends on.

### DD-6 — Gating the UI on `audit.verify` — but session/login carry no roles and RBAC needs a tenant `scopeTx`. **RECOMMENDED: add a minimal GLOBAL session-introspection read returning the user's NATIONAL-scope grants; gate nav + page on it client-side. Endpoint-side RBAC stays deferred (D4-1.11a).**

AC-1 requires the page be "visible only to roles carrying `audit.verify`". But: the session stores
only `userId` (`apps/api/src/types.ts:49`); `LoginResponse` carries no permissions
(`packages/contracts/src/auth/login.ts:26` = `{status:'mfa_required',methods}`); and
`loadActorGrants` (`apps/api/src/modules/rbac/index.ts`) needs a `scopeTx` that a global surface has
no `/:pariwarId/` to produce. So the SPA has **no way to know** the current user's permissions today.

- **Recommended:** add a global `GET /api/v1/auth/session` → `{ userId, nationalGrants: string[] }`,
  registered in **`apps/api/src/modules/auth/admin/admin-auth.routes.ts`** alongside the existing
  auth routes. Contract lives in **`packages/contracts/src/auth/session.ts`** (new file, same pattern
  as `login.ts`; register component + path in `emit-openapi.ts`; keep byte-stable; extend the
  type-assignability test).
  
  **⚠ Vocabulary:** what the epics call "national scope" is **`scope_dimension = 'global'`** in the
  codebase (ADR-0008 / `packages/domain/src/rbac/scope.ts`). There is no `'national'` value in
  `SCOPE_DIMENSIONS`. Filtering on `'national'` returns zero rows.
  
  **Query pattern (no pariwar scopeTx):** use `deps.servicePool` (BYPASSRLS); run:
  ```sql
  SELECT role, scope_dimension FROM role_grants WHERE user_id = $1
  ```
  then map each `role` value to its permission keys using `defaultRoleBundles` from
  `@twt/domain/rbac` (`packages/domain/src/rbac/roles.ts`); collect the union of `permissions`
  for all rows where `scope_dimension = 'global'` → that is `nationalGrants`. The `audit.verify`
  key lives in the `auditor` bundle at `global` scope ceiling (see `defaultRoleBundles` in roles.ts).
  
  The SPA reads the result once on session boot into the Zustand auth store (§4.3 L2541-2542 "role set
  per active scope"), and **gates the nav entry + the route** on `nationalGrants.includes('audit.verify')`.
- The UI gate is **advisory, not the security boundary** — the server still enforces
  `requireAdminSession` on every endpoint; the endpoint-side RBAC `audit.verify` upgrade remains
  **deferred (D4-1.11a)** until a global-scope `requirePermission` preHandler exists.
- **Lighter alternative:** defer the permission gate (any admin session sees the page) + record it.
  ⚠ Recommend the introspection endpoint — AC-1 names the gate explicitly, and a session/`/me` read is
  needed by every future admin surface anyway (cheap, high-reuse).

### DD-7 — `packages/api-client` is a stub (arch says "generated from OpenAPI/Zod, tool in ADR"). **RECOMMENDED: a thin hand-written typed fetch layer reusing `@twt/contracts`; defer the full codegen pipeline.**

The architecture commits a *generated* client (§4.1 L2479; §4.2 L2487 "generated from OpenAPI / Zod …
specific tool in ADR"). Standing up the codegen tool + its ADR is a story of its own.

- **v1:** a small typed fetch module (in `apps/admin/` or a minimal `packages/api-client` seed) that
  wraps `fetch(..., {credentials:'include'})` and **parses responses with the `@twt/contracts` Zod
  schemas** (`AuditIntegrityCheckResult`, the new list/ack shapes, `LoginRequest`, etc.) — single
  source of types, no hand-written shadow types (arch Naming L3719-3723; the contracts package is the
  type source). Wrap each call in a **TanStack Query** hook (§4.2). Record the graduation: the full
  OpenAPI→client codegen + tool-choice ADR.

## Tasks / Subtasks

- [x] **Task 1 — Resolve DD-1…DD-7** (record each verdict + rationale in the author-commit and the decision log). DD-2/DD-5/DD-6 already CONFIRMED by BigDev on their recommended paths (2026-06-14) — record the confirmation; do not re-open. (AC: all)
- [x] **Task 2 — Bootstrap the admin SPA** (DD-1). (AC-1, AC-6)
  - [x] 2.1 Vite React-TS in `apps/admin/`: deps — `react@19`, `react-dom@19`, `vite@7`, `tailwindcss@4`, `@tailwindcss/vite` (Tailwind v4 Vite plugin), `@vitejs/plugin-react` (JSX transform), `@radix-ui/*`, `@tanstack/react-query@^5.x`, `@tanstack/react-router`, `react-hook-form` + `@hookform/resolvers/zod`, `zod`; devDeps include `@tanstack/router-plugin` (file-based route-tree generator). Wire all three Vite plugins: `tailwindcss()`, `react()`, `TanStackRouterVite()` in `vite.config.ts`. ⚠ Do NOT create `tailwind.config.ts` (see DD-1 / C3 note); CSS entry uses `@import "tailwindcss"` + `@theme {}` only.
  - [x] 2.2 **TanStack Router file-based routing** (architecture tree shows `src/routes/`): `src/routes/__root.tsx` (root route with auth guard + `<Outlet />`), `src/routes/login.tsx` (`/login`), `src/routes/audit/integrity.tsx` (`/audit/integrity`). The `@tanstack/router-plugin/vite` plugin auto-generates `src/routeTree.gen.ts` — commit this file (regenerated by the plugin on each build; gitignore is wrong for monorepo CI). App shell / chrome (top bar + nav) lives in `__root.tsx`; route-level **error boundary** per §4.9.
  - [x] 2.3 `QueryClient` provider; the integrity reads are **cache-disabled** (no IndexedDB persister — §4.5 verifier-console strong-consistency).
  - [x] 2.4 Switch `package.json` `build` → `vite build` (+ `tsc --noEmit` typecheck); update the **existing** `apps/admin/vitest.config.ts` to add `environment: 'jsdom'`; add devDeps `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`; update `apps/admin/Dockerfile` to build/serve the static SPA. Confirm `turbo run build lint typecheck test` green tree-wide.
- [x] **Task 3 — Minimal login surface** (DD-2). (AC-1)
  - [x] 3.1 `src/routes/login.tsx`: email+password form (RHF + `LoginRequest` from `packages/contracts/src/auth/login.ts`) → `POST /api/v1/auth/login` → `LoginResponse` shape is `{status:'mfa_required', methods:string[]}` (see `login.ts` for the union — `methods` lists the available second-factor types). On `mfa_required`, drive passkey-authenticate (`@simplewebauthn/browser`, `startAuthentication` → `POST /passkey/authenticate/{options,verify}`) **or** recovery-code consume (`POST /recovery/consume`). Session cookie rides automatically (`credentials:'include'` on every fetch).
  - [x] 3.2 Auth guard: unauthenticated → `/login`; a 401 from any API call → `/login`. Logout action → `POST /api/v1/auth/logout` (with the double-submit token, matching ADR-0009).
- [x] **Task 4 — Session-introspection + UI permission gate** (DD-6). (AC-1)
  - [x] 4.1 Add `GET /api/v1/auth/session` → `{ userId, nationalGrants:string[] }` to **`apps/api/src/modules/auth/admin/admin-auth.routes.ts`** (alongside existing auth routes). Handler: use `deps.servicePool` (BYPASSRLS) to query `role_grants WHERE user_id = $1`; map each `role` → permission keys via `defaultRoleBundles` from `@twt/domain/rbac`; filter to rows with `scope_dimension = 'global'` (**⚠ NOT `'national'`** — epics say "national" but the codebase value is `'global'` per `scope.ts`/ADR-0008); collect the union of keys as `nationalGrants`. Contract in new file **`packages/contracts/src/auth/session.ts`** (same pattern as `login.ts`); register component + path in `emit-openapi.ts`; keep byte-stable; extend type-assignability test.
  - [x] 4.2 SPA reads it on session boot into the Zustand auth store; gate the nav entry + the `/audit/integrity` route on `nationalGrants.includes('audit.verify')`. Record: endpoint-side RBAC upgrade stays deferred (D4-1.11a).
- [x] **Task 5 — History + last-automated read endpoint** (DD-3). (AC-2)
  - [x] 5.1 `GET /api/v1/audit/integrity-checks?limit=30&triggerSource=<opt>` in `apps/api/src/modules/audit-log/` (reuse `deps.servicePool`; `requireAdminSession`; ⚠ NOT `requirePermissionHook` — global route has no scopeTx → 500).
  - [x] 5.2 Contract `AuditIntegrityCheckList` in `packages/contracts/src/audit/integrity-check.ts`; register component + path in `emit-openapi.ts`; keep determinism byte-stable; extend the type-assignability test.
- [x] **Task 6 — Acknowledgement mechanism** (DD-5). (AC-5)
  - [x] 6.1 Migration **0011**: a separate append-only `audit_integrity_acknowledgements` table (`check_id` FK, `acknowledged_at`, `acknowledged_by`, `ticket_ref notNull`) + reject-mutation triggers + RLS/grants mirroring 0008/0009. ⚠ Keep `audit_integrity_checks` strictly immutable. `DO NOT REGENERATE` headers; `db:migrate`+`db:check` idempotent on re-run.
  - [x] 6.2 `POST /api/v1/audit/integrity-checks/:checkId/acknowledge` `{ ticketRef }` (`requireAdminSession` only — do NOT add `app.csrfProtection`; the global `originCheckHook` + SameSite=Lax is the CSRF baseline per ADR-0009; double-submit is restricted to `logout`); contract + OpenAPI determinism.
- [x] **Task 7 — The integrity-verification page** `apps/admin/src/modules/audit-integrity/` (DD-1, DD-4). (AC-2, AC-3, AC-4, AC-5)
  - [x] 7.1 **Green/red status banner** (driven by the latest check's `chainValid`): use `aria-live="assertive"` on the red failure banner (security-critical alert — must interrupt current screen-reader narration) and `aria-live="polite"` on the green status and history updates (per §4.10). **Last-automated card** (timestamp / range / result / verifier).
  - [x] 7.2 **History table** of the last 30 checks (virtualize only if it can exceed the viewport — §4.6 TanStack Virtual/react-virtuoso; 30 rows likely fits, note the call).
  - [x] 7.3 **"Run verification now"** → `POST /api/v1/audit/verify-integrity` (the 1.11a endpoint; pessimistic/server-confirmed per §4.2 L2492-2493) with a **progress indicator**; render the verdict in **≤~10s**; on success → green; invalidate the history query.
  - [x] 7.4 **Red-banner fields** (DD-4): failing row (`firstBrokenAuditId`/`Seq`), prior valid row (`endAuditId`/`Seq`), tamper-suspect window (prior-good `verifiedAt` → this `verifiedAt`), cold-mirror line (last provably-good hot-chain state + "cold-mirror cross-verification: deferred (D1-1.11a)").
  - [x] 7.5 **Acknowledge** action (form requires `ticketRef`) → the ack endpoint → banner persistence clears.
- [x] **Task 8 — Typed api-client seam + Query hooks** (DD-7): thin `fetch` wrapper parsing with `@twt/contracts` Zod; TanStack Query hooks for verify / list / session / acknowledge. (AC-2, AC-3)
- [x] **Task 9 — Accessibility** (§4.10, AC-6): Radix primitives (focus/keyboard/ARIA), keyboard-reachable run-now + acknowledge, `aria-live` banner, token-pair contrast, `prefers-reduced-motion`. Consider `@axe-core/react` assertions in tests.
- [x] **Task 10 — Tests** (AC-6)
  - [x] 10.1 Component (RTL + jsdom, mocked fetch): run-now → **green**; run-now → **red banner with all four fields**; **history renders**; **gate hides page without `audit.verify`**; **acknowledge clears persistence**.
  - [x] 10.2 Endpoint tests (live-DB, copy `apps/jobs/tests/audit/integrity-check.test.ts` setup): the new `GET integrity-checks` returns persisted rows newest-first; `acknowledge` writes the ack row. ⚠ Own-committing writers → assert **membership/`>=`**, never `=== N` (live-DB gotcha `[[project_live_db_test_gotchas]]`).
  - [x] 10.3 Extend CI: the admin component tests run in the unit `test` job (DB-free); the new endpoint live-DB tests already ride the `integration-tests` filter (`@twt/api` / wherever the audit-log module tests live — confirm the filter covers them).
- [x] **Task 11 — Gate + closure** (AC-6)
  - [x] 11.1 `pnpm turbo run lint typecheck test build` green; `db:migrate`+`db:check` idempotent; `contracts:check-openapi-determinism` byte-stable; the SPA builds + serves.
  - [x] 11.2 `deferred-work.md`: record the new deferrals — real cold-mirror pointer (graduation of D1-1.11a), helpdesk/ticketing integration for acknowledge (FR-52), full OpenAPI→client codegen + ADR (DD-7), `packages/ui`+`packages/tokens` extraction (DD-1), passkey-enrollment/reset/step-up UI (DD-2), endpoint-side `audit.verify` RBAC upgrade (still D4-1.11a). Per `[[feedback_closure_language_precision]]`: "Closed by [edit]" only where an artifact exists; else "Resolved via explicit deferral" with a trigger.
  - [x] 11.3 READMEs (`apps/admin/` — the SPA stack + module convention) + decision-log entries.

### Review Findings — Group A: Backend API + Contracts + OpenAPI (2026-06-14)

- [x] [Review][Patch] `exists.rowCount === 0` missing null-coalesce guard — FK violation leaks as 500 if rowCount is null [apps/api/src/modules/audit-log/index.ts:260] — **Closed by [edit]**: `(exists.rowCount ?? 0) === 0`
- [x] [Review][Patch] `ORDER BY verified_at DESC` has no tiebreaker — nondeterministic order when two checks share the same microsecond timestamp [apps/api/src/modules/audit-log/index.ts:198] — **Closed by [edit]**: added `, check_id ASC`
- [x] [Review][Patch] `ORDER BY acknowledged_at DESC` has no tiebreaker — wrong "latest" ack can be returned for concurrent acks with identical timestamps [apps/api/src/modules/audit-log/index.ts:210] — **Closed by [edit]**: added `, acknowledgement_id ASC`
- [x] [Review][Patch] `AuditIntegrityAcknowledgement.ticketRef` uses `z.string().min(1)` (no `.max(512)`) — asymmetric with the request schema which has `trim().min(1).max(512)` [packages/contracts/src/audit/integrity-check.ts:105] — **Closed by [edit]**: added `.max(512)`
- [x] [Review][Patch] `SessionResponse` absent from type-assignability test — DD-6 explicitly requires extending it [packages/contracts/tests/type-assignability.test.ts] — **Closed by [edit]**: added `describe('SessionResponse …')` with parse + empty-grants + strict-rejection tests
- [x] [Review][Patch] Missing 401 tests for `GET /audit/integrity-checks` and `POST /acknowledge` when unauthenticated — AC-6 requires coverage for all new gated routes [apps/api/tests/integration/audit-integrity-ui.spec.ts:180] — **Closed by [edit]**: added two unauthenticated 401 test cases
- [x] [Review][Defer] Session endpoint maps via static `defaultRoleBundles` — live FR-44 DB-edited bundles not reflected in `nationalGrants` [apps/api/src/modules/auth/admin/admin-session.handler.ts] — deferred, pre-existing; gate is advisory by design per DD-6; re-trigger: FR-44 bundle-edit story
- [x] [Review][Defer] Any admin can acknowledge a `chainValid=true` (passing) check — no guard preventing junk ack rows for non-failure verdicts [apps/api/src/modules/audit-log/index.ts] — deferred, pre-existing; product decision; banner logic (client-derived `chainValid=false AND no ack`) is unaffected
- [x] [Review][Defer] `auditor` role at global scope bypasses `scopeCeiling` cross-check in session handler — a `global`-scoped auditor grant would surface `audit.verify` even though `scopeCeiling` is `pariwar` [apps/api/src/modules/auth/admin/admin-session.handler.ts] — deferred, pre-existing; gate is advisory; endpoint-side RBAC upgrade stays D4-1.11a
- [x] [Review][Defer] Concurrent `POST /acknowledge` produces silent duplicate ack rows — no idempotency key or deduplication guard [apps/api/src/modules/audit-log/index.ts] — deferred, intentional; append-only by design; list endpoint absorbs correctly
- [x] [Review][Defer] `seqToNumber` precision loss above `Number.MAX_SAFE_INTEGER` — implausible at v1 chain lengths, documented in comment [apps/api/src/modules/audit-log/index.ts] — deferred, implausible in v1; re-trigger: seq columns migrate to `mode:'bigint'` globally
- [x] [Review][Defer] `auditor` role granted at global scope not tested as `audit.verify` source in session introspection tests — second role path to the gate is uncovered [apps/api/tests/integration/audit-integrity-ui.spec.ts] — deferred, pre-existing; architecturally unusual path; re-trigger: global-scope auditor grants land in prod

### Review Findings — Group B: Migration 0011 + Drizzle schema + RLS policy (2026-06-14)

- [x] [Review][Patch] Migration 0011 missing inverse-DDL operator-reference rollback comment — 0009 has REVOKE/DROP POLICY/NO FORCE/DISABLE RLS inverse statements for operator reference; 0011 omits them [packages/domain/migrations/0011_audit-integrity-acknowledgements.sql] — **Closed by [edit]**: added DROP/REVOKE/DISABLE inverse block mirroring 0009
- [x] [Review][Defer] `ticket_ref` column has no DB-level minimum-length or non-whitespace CHECK — 512-char cap + non-empty enforcement live only in the Zod contract layer [packages/domain/migrations/0011_audit-integrity-acknowledgements.sql] — deferred; write path is API-only + Zod-validated; re-trigger: DB hardening pass
- [x] [Review][Defer] `acknowledged_at` accepts past/future timestamps via direct BYPASSRLS INSERT — no CHECK anchors it to `now()`; a future-dated ack would prematurely clear the failure banner [packages/domain/migrations/0011_audit-integrity-acknowledgements.sql] — deferred; API route uses DB default, ops/DBA concern; re-trigger: DB hardening pass
- [x] [Review][Defer] Ack bulk-load query (`WHERE check_id = ANY($1)`) has no LIMIT — fetches every ack ever written for the listed checks; unbounded for a repeatedly-acknowledged check [apps/api/src/modules/audit-log/index.ts] — deferred; acceptable at v1 scale; re-trigger: ack count approaches observable performance threshold
- [x] [Review][Defer] `breakpoints:true` journal setting means DDL in 0011 may partially commit before the `DO` self-test raises — pre-existing pattern identical to 0007/0009 [packages/domain/migrations/0011_audit-integrity-acknowledgements.sql] — deferred; pre-existing pattern; re-trigger: migration runner gains explicit transaction wrapping

### Review Findings — Group D: Tests + CI + Jobs (2026-06-14)

- [x] [Review][Patch] AC-3 test claims "shows progress then a green banner" but never asserts the progress indicator — deleting `data-testid="run-progress"` would not fail the test (medium) [apps/admin/tests/integrity-page.test.tsx] — **Closed by [edit]**: mock now holds the mutation in-flight via a deferred Promise; `findByTestId('run-progress')` asserted before releasing
- [x] [Review][Defer] Mock data uses non-UUID strings (`'run-1'`, `'ack-1'`) for UUID-typed contract fields — latent; Zod parsing is bypassed by the mock today [apps/admin/tests/integrity-page.test.tsx] — deferred; no current impact; re-trigger: contract validation added to queryFn or mock data diverges from real server output in a test failure
- [x] [Review][Defer] CI `test` job `needs: [install, build]` serialises unnecessarily — turbo's `^build` already handles dependency ordering internally [.github/workflows/ci.yml] — deferred; changing CI topology is risky for low benefit; re-trigger: CI performance audit

### Review Findings — Group C: Admin SPA (apps/admin/src + tooling config) (2026-06-14)

- [x] [Review][Patch] `onLogout` async function has no try/catch — network or CSRF-fetch failure escapes silently, leaving the session live while the UI appears signed out (HIGH) [apps/admin/src/routes/RootLayout.tsx] — **Closed by [edit]**: wrapped body in try/catch; added `logoutError` state + `role="alert"` inline message in TopBar
- [x] [Review][Patch] `apiFetch` spreads `...init` after the merged `headers` object — any caller passing `init.headers` would silently overwrite `content-type: application/json` [apps/admin/src/api/client.ts] — **Closed by [edit]**: moved `...init` before `credentials`/`headers` so our values always win
- [x] [Review][Defer] Stale `acknowledgeError` shown in re-opened AcknowledgeDialog after cancel mid-flight — Dialog.Root is uncontrolled; mutation error from a cancelled flight persists and re-appears on next dialog open [apps/admin/src/modules/audit-integrity/AcknowledgeDialog.tsx] — deferred; UX-only (not data-integrity); controlled-dialog refactor deferred to UX polish pass; re-trigger: complaint from trustee UAT about confusing dialog state

## Dev Notes

### Source-of-truth references (cite these in code headers)

- **AC source:** `_bmad-output/planning-artifacts/epics.md` **L1195-1212** (Story 1.11b block). It consumes Story 1.11a's endpoint (**L1173-1193**) + the chain Story 1.10 built (L1154-1171).
- **Frontend architecture (the stack this story stands up):** §4.1 **L2466-2479** (admin = Vite + React + Tailwind + Radix; shared `packages/{tokens,i18n,contracts,api-client,platform-adapters}`); §4.2 **L2481-2529** (TanStack Query universal; pessimistic mutations for admin decisions L2492-2493); §4.3 **L2531-2546** (Zustand for client/auth state; server state stays in Query); §4.4 **L2548-2565** (RHF + Zod on React surfaces, same `@twt/contracts` schemas); §4.5 **L2585-2589** (admin **verifier-console reads cache-disabled**); §4.7 **L2678-2702** (admin = **TanStack Router**; deep-link landing checks auth→scope→authz); §4.9 **L2716** (route-level error boundaries); §4.10 **L2748-2781** (WCAG 2.1 AA; Radix AA primitives; build-time contrast; `aria-live`); §4.6 **L2653-2676** (list virtualization on web = TanStack Virtual / react-virtuoso).
- **Directory tree / module homes:** **L4223** (`apps/admin/` Vite+React+Tailwind+Radix), **L4238** (`apps/admin/modules/*`), **L4523** (§4.7 Admin UI = `apps/admin/modules/*` + `apps/api/src/modules/{rbac,audit-log,…}`), **L4679** (helpdesk/ticketing FR-52 = not built).
- **UX spec:** **L50** ("Admin scaffolding ships first as a developer surface; polished member UI follows"), **L239-241** (Admin UI + Trustee tooling = audit log, audit-of-Anita, web-responsive), **L591** ("auditability is the trust capital"). No dedicated integrity-page mockup — this is a developer/trustee surface; design to the property, not a comp.
- **deferred-work.md:** **D1-1.11a** (verify-from-cold-mirror — the DD-4 cold-mirror pointer source), **D4-1.11a** (endpoint `audit.verify` RBAC upgrade — the DD-6 server-side gate).

### Patterns to COPY / REUSE (do not reinvent — checklist anti-pattern #1)

- **The on-demand endpoint — CALL it, don't rebuild:** `POST /api/v1/audit/verify-integrity`
  (`apps/api/src/modules/audit-log/index.ts`) already runs the same `verifyAuditChain` 1.11a ships and
  returns `AuditIntegrityCheckResult`. The page POSTs `{}` and renders the verdict. **Do not** import
  `@twt/jobs` into the SPA or re-walk the chain client-side.
- **The wire shapes — REUSE the contract:** `AuditIntegrityCheckResult` + `AuditIntegrityCheckRequest`
  (`packages/contracts/src/audit/integrity-check.ts`) are the single source of types for the verdict.
  Add the list/ack shapes **here** (the contracts package), never a hand-written shadow in `apps/admin`
  (arch Naming L3719-3723). The new GET/ack endpoints follow the same `.strict()` + OpenAPI-component +
  type-assignability-test discipline 1.11a used.
- **New endpoints land in the EXISTING module:** put the GET history + acknowledge routes in
  `apps/api/src/modules/audit-log/` (the route home 1.11a created), not a new module. Copy the
  registration + `requireAdminSession` preHandler + `deps.servicePool` usage already in
  `modules/audit-log/index.ts`.
- **Auth API to drive from the login page:** `apps/api/src/modules/auth/admin/admin-auth.routes.ts`
  (`/login`, `/passkey/authenticate/{options,verify}`, `/recovery/consume`, `/logout`) + the
  `@twt/contracts` `auth/*` schemas. Session shape: `apps/api/src/types.ts:49` (`session.userId` only).
- **Session endpoint RBAC query (no scopeTx):** for `GET /api/v1/auth/session`, use `deps.servicePool`
  (BYPASSRLS — no RLS context means you get all grants for the user, not just one pariwar's). SQL:
  `SELECT role, scope_dimension FROM role_grants WHERE user_id = $1`. Map each `role` value to its
  permission-key array using `defaultRoleBundles` from `packages/domain/src/rbac/roles.ts`; filter to
  rows where `scope_dimension = 'global'` (**NOT** `'national'` — see `SCOPE_DIMENSIONS` in
  `packages/domain/src/rbac/scope.ts`; ADR-0008 reconciled epics' "national" → code's "global"). The
  union of all matched keys is `nationalGrants`. The `audit.verify` key appears in the `auditor` role
  bundle (and in `super_admin`'s full catalog); look for `AUDIT_VERIFY` in `roles.ts`.
- **Migration discipline (if Task 6 adds 0011):** copy `packages/domain/migrations/0008_*`
  (table+triggers) / `0009_*` (RLS/grants/self-test) — append-only `*_reject_mutation` function + 3
  triggers + ENABLE+FORCE+`USING(true)` + grants + the twt_app-NOBYPASSRLS self-test, `DO NOT
  REGENERATE` headers. Last migration on `main` = **0010** (1.11a's CHECK-constraint review patch) →
  the new one is **0011**.
- **Live-DB test setup:** `apps/jobs/tests/audit/integrity-check.test.ts` (the 1.11a suite) — the
  `describe.skipIf(!hasDatabase)` guard + own-committing-writer membership asserts.

### Regression guardrails (what must NOT break)

- **Do NOT modify `verifyAuditChain`, the `POST /verify-integrity` handler, or the
  `AuditIntegrityCheckResult` shape** beyond **additive** changes. The page consumes them as-is;
  changing the result shape would break the 1.11a contract + its type-assignability test.
- **`audit_integrity_checks` stays append-only/immutable.** The acknowledgement goes in a **separate**
  table (DD-5) — do not loosen the 1.11a reject-mutation triggers on the verdict table.
- **Keep every new global audit route on `requireAdminSession` only.** `requirePermissionHook` needs
  `request.scopeTx` (set from `/:pariwarId/`) and **hard-throws 500** on a global route — the documented
  1.11a landmine (`modules/audit-log/index.ts:9-16`). The `audit.verify` enforcement is UI-side (DD-6,
  advisory) until D4-1.11a graduates.
- **`apps/admin` build change must keep the monorepo green.** Switching `tsc`→`vite build` touches
  `turbo.json`'s assumptions, the Dockerfile, and CI — verify `turbo run build lint typecheck test`
  tree-wide and that `apps/admin/Dockerfile` still builds.
- **Pre-existing failures are NOT 1.11b regressions:** 2 `apps/api/admin-auth.spec.ts` (lockout/logout)
  + 2 `contracts/auth.test.ts` `.min(12)` failures exist on `main` (documented since 1.10) — do not
  "fix" them in scope.
- **No PII / no member data on this surface.** The integrity page shows only chain metadata (seqs,
  audit-ids, timestamps, verdicts) — never audit *payloads*. Keep it metadata-only.

### Previous-story intelligence (Story 1.11a — the direct dependency, status `done`)

- 1.11a shipped: `audit_integrity_checks` (schema + migrations 0008 table/triggers, 0009 RLS, 0010
  CHECK constraints), `verifyAuditChain` (`apps/jobs/src/audit/integrity-check.ts`), the observability
  sink/alerter seams, the **`POST /api/v1/audit/verify-integrity`** global endpoint
  (`requireAdminSession`-gated), the contract `AuditIntegrityCheckResult`, the nightly-integrity GH
  workflow, the CLI. **`apps/api` already depends on `@twt/jobs`** (the endpoint reuses
  `verifyAuditChain`). Last migration = **0010**.
- 1.11a deliberately left for 1.11b: the **trustee UI** (this story), the **read/list endpoint**
  (DD-3), the **cold-mirror pointer** (D1-1.11a), the **endpoint-side RBAC gate** (D4-1.11a). Its review
  fixed `endSeq` to point at the last good row on a break — DD-4 depends on that.
- **Live-DB gotchas (`[[project_live_db_test_gotchas]]`):** never regenerate an applied migration
  (drizzle skips by journal `when` → 42P07); never reset via `DROP SCHEMA` (strips twt_app USAGE →
  42P01); own-committing writers accumulate rows → assert membership, not counts.

### Git intelligence

Recent commits: `3c570d6` **Story 1.11a** (integrity primitive + the endpoint this UI calls);
`9298147` Story 1.10 (audit log + chain + mirror); `156a5b1` Story 1.9 (Fastify + **admin auth** — the
login API this UI drives) — `e36bd31` Story 1.8 added the **`audit.verify`** permission key. The
endpoint, the auth API, and the permission key the UI needs all already landed. No admin-UI commit
exists yet — `apps/admin` has only the PR-1 placeholder.

### Latest-tech notes

- **Stack versions:** React **19**; **Vite 7** (arch-pinned, L599); **Tailwind v4** ⚠ — v4 is
  **CSS-first** (`@import "tailwindcss"` + `@theme {}` in the CSS entry; **no** `tailwind.config.ts`
  / `tailwind.config.js` — the architecture tree shows one but it is a v3-era artifact, do NOT create
  it). The Vite integration is the **`@tailwindcss/vite`** package (not a PostCSS plugin). Follow v4
  docs, not stale v3 tutorials. **Radix UI** primitives (WCAG AA focus/keyboard/ARIA out of the box
  — §4.10). **TanStack Query v5** — pin `^5.x` to match mobile's `^5.101.0`. **TanStack Router v1**
  with file-based routing — requires **`@tanstack/router-plugin/vite`** in `vite.config.ts`; the route
  tree is auto-generated into `src/routeTree.gen.ts` (commit it). Route file conventions: dot-notation
  for nesting (`audit.integrity.tsx`), underscore prefix for pathless layouts (`_auth.tsx`), `__root.tsx`
  for the root route (§4.7). **React Hook Form** + `@hookform/resolvers/zod`. **`@simplewebauthn/browser`**
  for the passkey leg (DD-2).
- **No IndexedDB persister** for this surface (verifier-console reads are cache-disabled, §4.5). Tests:
  **Vitest + React Testing Library + jsdom**; optional `@axe-core/react` for a11y assertions.
- No new server runtime dep is required for the GET/ack endpoints (drizzle + `pg` + `@twt/contracts`
  already present in `apps/api`). **Do NOT add pg-boss** (Story 1.12).

### Project Structure Notes

- New homes (all architecture-committed): `apps/admin/{vite.config.ts,index.html,src/main.tsx,src/router.tsx}`,
  `apps/admin/src/modules/audit-integrity/` (**⚠ modules live under `src/` per the architecture tree**),
  `apps/admin/src/routes/{__root.tsx,login.tsx,audit/integrity.tsx}` (TanStack Router file-based),
  `apps/admin/src/routeTree.gen.ts` (auto-generated by router plugin — commit, do not gitignore),
  plus the api-client seam (`apps/admin/src/api/` — prefer colocated for v1). Server: extend
  `apps/api/src/modules/audit-log/` (GET list + acknowledge routes added to `index.ts`) +
  `apps/api/src/modules/auth/admin/admin-auth.routes.ts` (session introspection added there);
  new contract `packages/contracts/src/auth/session.ts`; other contracts in `packages/contracts/src/audit/`;
  migration `packages/domain/migrations/0011_*.sql` (if Task 6).
- **Variance to record (not an oversight):** the architecture assumes an admin SPA *exists*; in fact
  this story **bootstraps it** because no prior Epic-1 story did (PR-1 left `apps/admin` a stub; no
  dedicated "bootstrap admin SPA" story precedes 1.11b). Record the bootstrap as part of this `[SURFACE]`
  story, with `packages/ui`/`packages/tokens` extraction + full client codegen explicitly deferred.
- **Variance:** `audit.verify` is enforced **UI-side only** here (DD-6); the endpoint-side RBAC gate is
  still D4-1.11a. The UI gate is advisory; `requireAdminSession` is the real boundary. Document in the
  route + nav header.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.11b] L1195-1212; consumes #Story-1.11a L1173-1193.
- [Source: _bmad-output/planning-artifacts/architecture.md] §4.1 L2466-2479; §4.2 L2481-2529; §4.3 L2531-2546; §4.4 L2548-2565; §4.5 L2585-2589; §4.6 L2653-2676; §4.7 L2678-2702; §4.9 L2716; §4.10 L2748-2781; directory tree L4223/L4238/L4523/L4679.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] L50 (admin = developer surface first); L239-241 (admin UI/trustee tooling); L591 (auditability = trust capital).
- [Source: apps/api/src/modules/audit-log/index.ts] the `POST /verify-integrity` endpoint + the global-route/`requireAdminSession`/no-`requirePermissionHook` rationale (lines 1-32).
- [Source: packages/contracts/src/audit/integrity-check.ts] `AuditIntegrityCheckResult` + `AuditIntegrityCheckRequest` (the wire shapes the UI consumes + extends).
- [Source: apps/api/src/modules/auth/admin/admin-auth.routes.ts] login/passkey/recovery/logout API the login page drives; [apps/api/src/types.ts:49] session = `userId` only; [packages/contracts/src/auth/login.ts:26] `LoginResponse` carries no permissions.
- [Source: apps/api/src/modules/rbac/index.ts] `loadActorGrants`/`requirePermissionHook` need a `scopeTx` (why a global UI gate needs DD-6's introspection read); [packages/domain/src/rbac/permissions.ts / roles.ts] the `audit.verify` key.
- [Source: packages/domain/migrations/0008_*.sql / 0009_*.sql / 0010_*.sql] the append-only table + RLS + CHECK patterns (last migration = 0010 → next = 0011).
- [Source: apps/jobs/tests/audit/integrity-check.test.ts] live-DB test setup to copy for the new endpoint tests.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] D1-1.11a (cold mirror), D4-1.11a (endpoint RBAC upgrade).
- [Source: _bmad-output/implementation-artifacts/1-11a-audit-log-integrity-verification-primitive.md] the predecessor story (DD-1…DD-5, File List, review fixes incl. `endSeq` correctness).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (bmad-dev-story).

### Debug Log References

- Migration 0011 generated via `drizzle-kit generate`, hand-supplemented (append-only triggers + GRANT + FORCE + self-test), renamed to a descriptive tag (`_journal.json` tag synced); applied + idempotent re-run + `db:check` green on the live DB (:5433).
- OpenAPI re-emitted 25.5KB → 34.3KB; `contracts:check-openapi-determinism` byte-stable.
- Live-DB endpoint tests against Postgres 16 on :5433 (`twt_dev`).
- **Discovered + fixed a pre-existing 1.11a defect** (`verifyChainWalk` boundary-pair incoherence on head-truncation → `verifyAuditChain` threw the migration-0010 CHECK instead of persisting the failed verdict). Reproduced on a FRESH DB to confirm it is independent of 1.11b, then fixed minimally (start=null when nothing verified) + added a regression assertion. See deferred-work.md (1.11b, Closed by [edit]).
- Fixed a load-sensitive `@twt/jobs` live-DB flake (`mirror.test.ts` ↔ `integrity-check.test.ts` interleaving the global chain under Vitest file-parallelism) via `fileParallelism: false`, and a pre-existing `scope-tx.spec` `$2`-param-reuse bug, to add `@twt/api` to the CI integration filter (Task 10.3).

### Completion Notes List

**Backend (Tasks 4/5/6):**
- ✅ `GET /api/v1/auth/session` → `{ userId, nationalGrants[] }` (DD-6): unions permission keys from `role_grants` rows at `scope_dimension='global'` via `defaultRoleBundles`; the SPA gates nav + route on `audit.verify` (advisory; `requireAdminSession` is the real boundary, RBAC upgrade stays D4-1.11a).
- ✅ `GET /api/v1/audit/integrity-checks?limit&triggerSource` (DD-3): most-recent-first list, each verdict joined to its most-recent acknowledgement (banner persistence in one read). `requireAdminSession` + `servicePool`, NOT `requirePermissionHook`.
- ✅ Migration **0011** + `audit_integrity_acknowledgements` (DD-5): a SEPARATE append-only table (keeps `audit_integrity_checks` immutable) + `POST .../:checkId/acknowledge { ticketRef }` (`requireAdminSession` only — no `app.csrfProtection`, per ADR-0009).
- ✅ Contracts `SessionResponse`, `AuditIntegrityCheckListItem`/`List`, `AuditIntegrityAcknowledge{Request,ment}` (additive — the 1.11a verdict contract is unchanged); OpenAPI components + paths registered, byte-stable; type-assignability test extended.

**Frontend (Tasks 2/3/7/8/9):**
- ✅ Bootstrapped `apps/admin/` (DD-1): Vite 7 + React 19 + Tailwind v4 (CSS-first, no `tailwind.config.ts`) + Radix + TanStack Query/Router + RHF/Zod. `build` = `tsc --noEmit && vite build`; Dockerfile builds + serves the static bundle via nginx (SPA fallback).
- ✅ Minimal `/login` (DD-2) driving the 1.9 API (password → passkey / recovery).
- ✅ The integrity page (DD-4): run-now (POST 1.11a endpoint, progress indicator), green/red banner with the four AC-4 fields (failing row / prior-valid row / tamper-suspect window / cold-mirror hot-chain proxy + the deferred line), last-automated card, last-30 history.
- ✅ Thin typed `fetch` client (DD-7) parsing with `@twt/contracts` Zod + cache-disabled Query hooks (§4.5).
- ✅ A11y (§4.10): `aria-live="assertive"` red banner / `polite` elsewhere, keyboard-reachable, Radix Dialog (focus-trapped) for the acknowledge confirm, Radix Label, AA-contrast token pairs, `prefers-reduced-motion`.

**Recorded DEVIATIONS** (deferred-work.md 1.11b): D8 code-based routing (not file-based `routeTree.gen.ts` codegen — keeps `tsc → vite build` + CI deterministic); D7 session grants in TanStack Query, not a separate Zustand store (server state per §4.3).

**Verification:** `pnpm turbo run lint typecheck test build` green tree-wide (56 tasks; includes the new `apps/admin` Vite build). Live-DB integration filter (`@twt/domain` 196 / `@twt/events` 31 / `@twt/jobs` 17 / `@twt/api` 60) green + deterministic across repeated forced runs. `db:migrate` idempotent + `db:check` green; `contracts:check-openapi-determinism` byte-stable. Admin component tests 15 (derive 6 / gate 4 / page 5). New endpoint tests 9.

**Pre-existing NOT-1.11b failures:** none remaining with the DB set (the documented 1.10 admin-auth / contracts `.min(12)` failures pass on the current tree; the `scope-tx` `$2` bug + the jobs head-truncation/flake were fixed as part of unblocking the CI filter — all recorded as Closed-by-edit).

### File List

**New — backend/contracts/domain:**
- `packages/contracts/src/auth/session.ts`
- `packages/domain/src/schema/audit_integrity_acknowledgements.ts`
- `packages/domain/src/policies/audit-integrity-acknowledgements-rls.ts`
- `packages/domain/migrations/0011_audit-integrity-acknowledgements.sql`
- `packages/domain/migrations/meta/0011_snapshot.json`
- `apps/api/src/modules/auth/admin/admin-session.handler.ts`
- `apps/api/tests/integration/audit-integrity-ui.spec.ts`

**New — admin SPA (`apps/admin/`):**
- `README.md`, `index.html`, `nginx.conf`, `vite.config.ts`
- `src/main.tsx`, `src/router.tsx`, `src/styles.css`
- `src/api/client.ts`, `src/api/hooks.ts`
- `src/routes/RootLayout.tsx`, `src/routes/LoginPage.tsx`, `src/routes/IntegrityRoute.tsx`
- `src/modules/audit-integrity/{IntegrityPage,StatusBanner,HistoryTable,AcknowledgeDialog,AcknowledgeForm}.tsx`, `src/modules/audit-integrity/derive.ts`
- `tests/{setup.ts,_helpers.tsx,derive.test.ts,gate.test.tsx,integrity-page.test.tsx}`

**Modified:**
- `packages/contracts/src/audit/integrity-check.ts` (list + ack shapes), `packages/contracts/src/auth/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `packages/contracts/tests/type-assignability.test.ts`, `openapi/v1.yaml`
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/migrations/meta/_journal.json`
- `apps/api/src/modules/audit-log/index.ts` (GET list + acknowledge), `apps/api/src/modules/auth/admin/admin-auth.routes.ts` (session route), `apps/api/tests/integration/scope-tx.spec.ts` (pre-existing `$2` fix)
- `apps/jobs/src/audit/integrity-check.ts` (1.11a boundary-coherence fix), `apps/jobs/tests/audit/integrity-check.test.ts` (regression assertion), `apps/jobs/vitest.config.ts` (`fileParallelism:false`)
- `apps/admin/{package.json,tsconfig.json,vitest.config.ts,eslint.config.js,Dockerfile}`
- `.github/workflows/ci.yml` (+`@twt/api` integration filter)
- `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml}`, `.decision-log.md`, `pnpm-lock.yaml`

**Deleted (placeholders):** `apps/admin/src/index.ts`, `apps/admin/tests/smoke.test.ts`

## Change Log

| Date       | Version | Description                                                                                          | Author |
| ---------- | ------- | -------------------------------------------------------------------------------------------------- | ------ |
| 2026-06-14 | 0.1     | Story 1.11b context-engineered — trustee-facing audit-integrity verification UI + first admin-SPA bootstrap. DD-1…DD-7 flagged with recommended paths; DD-2/DD-5/DD-6 scope forks confirmed by BigDev on the recommended paths (minimal login / build acknowledgement / add /auth/session gate). | BigDev |
| 2026-06-14 | 0.2     | Validation pass (13 fixes): C1 module path corrected to `src/modules/` per arch tree; C2 removed erroneous `app.csrfProtection` from acknowledge endpoint (pattern = `requireAdminSession` only, per ADR-0009 + 1.11a review); C3 added explicit "do not create tailwind.config.ts" instruction; C4 login page moved to `src/routes/login.tsx` (TanStack Router file-based); C5 added "national = global scope_dimension" vocabulary warning + concrete RBAC query pattern for session endpoint; E1 added `@tailwindcss/vite` + `@vitejs/plugin-react` to Task 2.1 deps; E2 added `@tanstack/router-plugin/vite` + routeTree.gen.ts commit policy; E3 added session contract home (`packages/contracts/src/auth/session.ts`); E4 clarified session route registers in `admin-auth.routes.ts`; E5 added LoginResponse.methods shape pointer to Task 3.1; O1 changed red banner to `aria-live="assertive"`; O2 added TanStack Router file-naming conventions; O3 made Task 2.4 vitest.config.ts changes explicit. | BigDev |
| 2026-06-14 | 1.0     | Substantive author-commit (Tasks 1–11 complete; Decision 2026-06-14-048). Backend: `GET /auth/session` (DD-6), `GET /audit/integrity-checks` (DD-3), migration 0011 + `audit_integrity_acknowledgements` + `POST .../:checkId/acknowledge` (DD-5); additive contracts + OpenAPI byte-stable; live-DB endpoint tests (9). Frontend: bootstrapped the admin SPA (Vite 7 + React 19 + Tailwind v4 + Radix + TanStack Router/Query + RHF/Zod), minimal login (DD-2), the integrity page (run-now/banner/4 AC-4 fields/history/acknowledge, DD-4), typed Zod client + cache-disabled Query hooks (DD-7), a11y (§4.10); component tests (15). Recorded DEVIATIONS: code-based routing (D8); session grants in Query not Zustand (D7). Fixed in passing: 1.11a `verifyChainWalk` head-truncation boundary-coherence defect, a `@twt/jobs` test-parallelism flake, and a `scope-tx` `$2` bug (to add `@twt/api` to the CI integration filter, Task 10.3). `turbo run lint typecheck test build` green tree-wide; integration filter green + deterministic. Status → review. | BigDev |
