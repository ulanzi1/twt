# `apps/public` — Composition Contract (AR-48)

**Story 2.5** initialises the public Astro SSR shell foundation and its first consumer
(the Niyamavali public render). This document is the **composition contract** the
architecture commits (architecture §"Cross-surface rendering policy"): it names which
fragments are **public-shell-rendered** vs **authenticated-fragment**, and records the
cache-safety guarantee every public route must hold.

## Fragment registry — **EMPTY at Story 2.5**

| Fragment | Kind | Owner | Status |
| --- | --- | --- | --- |
| _(none — authenticated fragments)_ | authenticated-fragment | `apps/api/src/modules/public-pages/` | **empty until Epic 11b** |

Story 2.5 ships **zero authenticated fragments**. The fragment registry above is
**initialised empty**; Epic 11a (Member Directory) and Epic 11b (per-claim surfaces,
In Memoriam) populate it. Because there are zero authenticated fragments, **no auth
boundary is introduced at the public page layer** — the auth boundary stays at the API
(`apps/api/src/modules/public-pages/`, which does not exist yet).

## Public-shell-rendered surfaces (Story 2.5)

| Route | Content | Tier | Indexing |
| --- | --- | --- | --- |
| `/niyamavali` | Effective Niyamavali clauses + version/diff selectors | `public` | `index,follow` |
| `/` | Server redirect → `/niyamavali` | — | — |
| `/404` | Not-found state (DB-independent) | `public` | `noindex` |
| `/500` | Error state (DB-independent) | `public` | `noindex` |

## Cache-safe guarantee (architecture-committed, structural)

Public SSR output is **CDN/edge-cacheable** under public-cache semantics. The guarantee
is **structural, not documented discipline**:

- **No session is read** on any public route (`Astro.session` is never accessed → no
  `Set-Cookie`, verified: the live render emits no cookie).
- **No member-state, no per-user branching** enters the HTML. The only inputs are the
  public Pariwar branding (cross-readable config), the resolved locale (URL/`Accept-Language`),
  and public-tier Niyamavali fields.
- **Only public-tier fields** are rendered (clause title / id / version / effective-date /
  rendered payload) — never `authored_by_actor`, `audit_id`, or any operator-restricted column.
- The **PII scrape integration spec** (`tests/integration/public-pages/scrape-test.spec.ts`)
  is the regression guard: it renders the real Niyamavali HTML and asserts no tier leaks +
  no naked PII (AC5/AC6a).

### Cache TTL

`/niyamavali` sets `Cache-Control: public, max-age=60, s-maxage=300` and
`Vary: Accept-Language` (the default render negotiates language; the `?lang=` toggle
produces distinct cache keys). `/404` → `public, max-age=60`; `/500` → `no-store`.

## Data path (Story 2.5)

The Niyamavali content is read **directly from `@twt/domain`** in Astro SSR via an
**unauthenticated `withPublicScope`** (`src/lib/db.server.ts`): `BEGIN` → `SET LOCAL ROLE
twt_app` (shed any superuser login so RLS is genuinely enforced — **not** a superuser
bypass) → `SET LOCAL app.pariwar_id` → read → `ROLLBACK`. `apps/public` owns its own pool
(`DATABASE_URL`). Branding is read via the cross-readable passport cache (no scope). The
`apps/api/src/modules/public-pages/` HTTP module is **not** used (empty until Epic 11b).

## Documented variances

- **Tokens consumption.** The shell consumes Story 1.17 **`@twt/tokens`** (the epic AC
  names `@twt/ui`, which is still an empty stub). `@twt/tokens` also ships a Tailwind v4
  `@theme` artifact (`@twt/tokens/theme.css`), but `@theme` only applies through a Tailwind
  v4 pipeline. This surface is intentionally **minimal-JS with no Tailwind pipeline**
  (friction-budget discipline), so it renders the **same canonical token source**
  (`color`/`font`/`space`/`border` from `@twt/tokens`, via `src/lib/theme.server.ts`) into a
  plain `:root { --token: value }` block. Token **values are identical**; only the
  consumption mechanism differs.
- **i18n `/react` split.** `@twt/i18n` root is now server-safe; React hooks moved to the
  `@twt/i18n/react` subpath (Story 2.5). Astro SSR imports the server-safe root.
