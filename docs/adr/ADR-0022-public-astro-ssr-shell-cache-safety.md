# ADR-0022: Public Astro SSR shell foundation + cache-safe public render + unauthenticated read-scope

> **Status:** drafted
> **Date:** 2026-06-21
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** <pending>
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 2.5 stands up the **first public, unauthenticated surface** in the system and the
**first real app in `apps/public/`** (previously a `tsc` `export {}` stub). Two things
land together: the **AR-48 public Astro SSR shell foundation** and its first consumer,
the **public Niyamavali render** (effective clauses + version/diff selectors).

Per [[feedback_architecture_vs_adr_boundary]], architecture commits the *properties*
(the cross-surface composition contract + cache-safe public SSR guarantee, architecture
§"Cross-surface rendering policy" L498-545 — and L516-519 explicitly say the cache-safety
guarantee is **"committed in an ADR"**). This ADR is that artifact: it commits the
*controls* that realise the public shell — the Astro standalone build, the **structural
cache-safety**, and the **unauthenticated read-scope pattern**.

This story builds NO authenticated fragments (the registry is initialised empty;
Epic 11a/11b populate it) and stands up NO `apps/api/src/modules/public-pages/` HTTP
module (empty until Epic 11b). It does NOT interpret rule payloads (Epic 4; freeze row 14).

## Decision

### 1. `apps/public` is an Astro 6 Node-standalone SSR app; workspace packages are bundled

`apps/public` becomes a real Astro 6 project (`output: 'server'`, `@astrojs/node` in
`standalone` mode → `dist/server/entry.mjs`). `vite.ssr.noExternal` lists the `@twt/*`
workspace packages so they are **bundled into the server entry**, not left as external
`@twt/*` imports — required so the standalone Docker image (which copies `dist/`, not the
`node_modules/@twt/*` workspace symlinks) resolves them. Third-party deps (`pg`,
`drizzle-orm`, `zod`, `@astrojs/*`) stay external and are carried by the runtime image's
`node_modules`. `.astro` frontmatter + `*.server.ts` modules are server-only and never
enter a client island's module graph (AC9).

### 2. The cache-safe public SSR guarantee is STRUCTURAL, not documented discipline

Public SSR output is CDN/edge-cacheable under public-cache semantics. The guarantee is
enforced by construction, not by a comment:

- **No session is read** on any public route. `Astro.session` is never accessed, so no
  `Set-Cookie` is emitted (verified against the live standalone server: zero cookies).
- **No member-state, no per-user branching** can enter the cached HTML. The only inputs
  are the public Pariwar branding (cross-readable config), the resolved locale
  (URL/`Accept-Language`), and public-tier Niyamavali fields — never `authored_by_actor`,
  `audit_id`, or any operator-restricted column.
- `/niyamavali` sets `Cache-Control: public, max-age=60, s-maxage=300` + `Vary:
  Accept-Language` (the default render negotiates language; the `?lang=` toggle produces
  distinct cache keys). `/404` → `public, max-age=60`; `/500` → `no-store`.
- The **PII scrape integration spec** (`apps/public/tests/integration/public-pages/
  scrape-test.spec.ts`, the architecture-committed D13-1.2 slot) is the regression guard:
  it renders the real Niyamavali HTML from fixtures via the pure render module and asserts
  `detectNakedPii` finds nothing + `evaluateSnapshot` passes, with a negative control.

### 3. Unauthenticated read-scope: direct `@twt/domain` read under `twt_app` + RLS

Story 2.5 ships zero authenticated fragments, so there is **no auth boundary to cross**
for public Niyamavali content. The recommended, architecture-consistent path is to read
directly from `@twt/domain` in Astro SSR via an **unauthenticated `withPublicScope`**
(`apps/public/src/lib/db.server.ts`): `BEGIN` → `SET LOCAL ROLE twt_app` (shed any
superuser login so RLS is genuinely enforced — **the AC8 "scope tx pattern, NOT a
superuser bypass"**) → `SET LOCAL app.pariwar_id` → read → `ROLLBACK` (a public render
never writes). `apps/public` owns its OWN pool (`DATABASE_URL`) per per-workspace pool
isolation. Branding is read via the cross-readable passport cache (`USING true` carve-out
— no scope). A new domain accessor `listEffectiveClauses(db, pariwarId, asOf?)` returns the
latest non-deprecated version effective at `asOf` per `clause_id` (DB-authoritative time).

**Acknowledged trade-off / open question (deferred to architect confirmation):** the
public renderer now holds DB credentials. This is acceptable because reads run under
`twt_app` + RLS, select only public-tier fields, and the PII scrape gate is the structural
backstop. The defensible alternative — a thin public read endpoint in `apps/api` keeping DB
creds out of the public renderer — is recorded as the one open data-path question (Epic 11b
owns `apps/api/src/modules/public-pages/`, where it would live if chosen).

### 4. Composition contract: empty fragment registry; auth boundary stays at the API

`apps/public/COMPOSITION-CONTRACT.md` names the public-shell-rendered surfaces and the
(empty) authenticated-fragment registry. Zero authenticated fragments ship at 2.5, so no
auth surface is introduced at the public page layer; Epic 11a/11b populate the registry.

### 5. Enabling decisions: i18n `/react` split + tokens-as-`:root`

- **`@twt/i18n/react` subpath split.** Astro SSR is the first non-React server consumer of
  `@twt/i18n`; importing the root previously pulled `react`. The React hooks moved to the
  `@twt/i18n/react` subpath so the package root is server-safe. (Discharges deferred-work
  CR-D1-2.1 / Story 2.1 React-coupling deferral.)
- **Tokens consumed as `:root` custom properties.** The shell consumes `@twt/tokens` (the
  epic AC's `@twt/ui` is still an empty stub). The Tailwind v4 `@theme` artifact
  (`@twt/tokens/theme.css`) only applies through a Tailwind pipeline; this minimal-JS
  surface has none, so it renders the SAME token source into a plain `:root { --token }`
  block (`src/lib/theme.server.ts`). Token values are identical; only the mechanism differs.

## Consequences

- **Positive:** the first public surface is cache-safe by construction (no cookie, no
  member-state); the FR-74 PII scrape gate has live-render teeth on every PR; the AR-48
  shell + composition contract + empty registry give Epic 11a/11b a foundation to extend;
  `js_bundle_bytes: 0` (no hydration) makes "works with JS disabled" structural; the
  friction-budget `member-public-web` surface acquired teeth (baselines committed).
- **Negative / accepted:** the public renderer holds DB creds (mitigated by `twt_app` +
  RLS + public-tier-only + the scrape gate; the thin-API alternative is the open question);
  workspace packages are bundled into the server entry (larger entry, but required for the
  standalone image); the standalone Docker runtime carries `node_modules` for external deps
  (the image is not fully self-contained — not CI-gated; correctness validated separately).
- **Follow-ups (deferred-work.md, Story 2.5 section):** the thin-public-API data-path
  alternative; `critical_render_path_ms` live-timing harness (→ Epic 11a); per-route
  page-weight (CR-D0-1.16a → Epic 11a); the FR-74 matrix tier-leak leg (→ Epic 11a); Astro
  Actions runtime (carry-forward — 2.5 render is read-only, no form); authenticated-fragment
  registry (→ Epic 11a/11b).

## References

- [Source: epics.md#Story-2.5 L1492-1521] — the five epic ACs (AC1–AC5).
- [Source: architecture.md §"Cross-surface rendering policy" L498-545, esp. L514-523 cache-safe guarantee "committed in an ADR" L516-519].
- [Source: ADR-0020 / ADR-0021] — the Niyamavali registry primitive + admin workflow this public render reads.
- [Source: apps/public/{astro.config.mjs, COMPOSITION-CONTRACT.md, src/lib/{db.server,pariwar.server,theme.server,niyamavali-render}.ts, src/layouts/PublicShell.astro, src/pages/{niyamavali,index,404,500}.astro}].
- [Source: packages/domain/src/niyamavali/read.ts `listEffectiveClauses`; packages/domain/src/db.ts `withPariwarScope`/`setPariwarScope`/`bindScopedDb`].
- [Source: packages/i18n/src/react.ts + package.json `exports['./react']`] — the `/react` subpath split.
- Memory: [[feedback_architecture_vs_adr_boundary]], [[feedback_closure_language_precision]], [[feedback_record_unattested_no_backfill]].
