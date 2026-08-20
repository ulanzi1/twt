# `apps/public` — Composition Contract (AR-48)

**Story 2.5** initialises the public Astro SSR shell foundation and its first consumer
(the Niyamavali public render). This document is the **composition contract** the
architecture commits (architecture §"Cross-surface rendering policy"): it names which
fragments are **public-shell-rendered** vs **authenticated-fragment**, and records the
cache-safety guarantee every public route must hold.

## Fragment registry — **STILL EMPTY at Story 11a.2** ⛔ zero live fragments

| Fragment | Kind | Owner | Status |
| --- | --- | --- | --- |
| _(none)_ | authenticated-fragment | `apps/api/src/modules/public-pages/` (⛔ does not exist) | **empty — Epic 11b (FR-77) is the v1 entry** |

Story 2.5 shipped **zero** authenticated fragments. **Story 11a.2 also ships zero live
fragments** — it establishes the *pattern and its boundary*, ⛔ not a working
authenticated render. Saying so plainly is the point: a fragment whose authenticated
half is unreachable and untested must not be shipped and then called "established".

`<AuthenticatedFragment>` (`src/components/AuthenticatedFragment.astro`) is the slot
primitive. Its SSR output is the **public-fallback state and nothing else**: it reads no
session, no cookie, no auth header, and emits no auth-derived branch. It takes no
`isAuthenticated` prop either — a prop would only move the read to the caller and put
auth-derived branching back into cache-safe SSR output.

The **v1 registry entry the architecture already names** is **FR-77** (Epic 11b —
nominee bank details + IFSC + a UPI CTA, shown to logged-in members during a live pool).

### ⭐ The epic AC and the architecture DISAGREE here, and the AC is unbuildable

`epics.md` §Story 11a.2 asks for fragments that *"render **server-side** when the viewer
is authenticated"*. `architecture.md:504-517` commits the opposite: fragments *"hydrate
client-side"*, the SSR output carries *"no PII, no member-state, and no auth-derived
branching"*, and *"the auth boundary lives at the API … **not at the page or the
edge**"*. The architecture commits the property; the epic does not get to relax it by
prose.

⛔ **And the AC's version cannot be built today.** Members are **token-bearer**:
`apps/api/src/modules/auth/shared/member-session-guard.ts` verifies an access-token JWT
from the **Authorization header** (`exp ≤ 15 min`). A browser navigating to
`twt.org/members` sends **cookies**, never an Authorization header. There is no
`apps/member-web/`, and `apps/` holds `admin · api · jobs · mobile · public` — so **no
browser surface holds a member token**, and there is **no `authenticated_member` viewer
on this app by any mechanism**. Minting one means a browser member session: a new auth
surface at the page layer, which `architecture.md:515-517` forbids, and which is ⛔ not
this story. Ruled as **D2(a)**, Decision `2026-08-20-141`.

### The hydration mechanism is DEFERRED — ⛔ not guessed

| Option | What it is | Why not now |
| --- | --- | --- |
| (a) Client island → API | A client island fetches `apps/api/src/modules/public-pages/` with a bearer token | Needs a token-holding browser. Would also create an **empty API module claiming a boundary with no consumer**. |
| (b) **Astro 6 server island** (`server:defer`) | The island is fetched in a **separate GET** with **encrypted props**, so the shell stays edge-cacheable while the fragment renders **server-side** | ⭐ **The leading candidate** — the one reading under which the epic AC and the architecture agree. Still needs a viewer the browser cannot identify, and moves the auth read to the page layer. |

**Re-trigger:** the first real fragment (Epic 11b, FR-77) **or** an `apps/member-web/`
split trigger firing. Recorded in `deferred-work.md` with this trigger.

⛔ **`apps/api/src/modules/public-pages/` is deliberately NOT created.** A module with no
route is a claim that a boundary exists. It lands with its first consumer.

## Public-shell-rendered surfaces (2.5; `/terms` 2.6; `/blog` 10.5; `/members` 11a.2)

| Route | Content | Tier | Indexing | Cache policy |
| --- | --- | --- | --- | --- |
| `/niyamavali` | Effective Niyamavali clauses + version/diff selectors | `public` | `index,follow` | `edge_cacheable` |
| `/terms` | Effective T&C version (sanitized `body_html_rendered`) + provisional banner when pending | `public` | `index,follow` | `edge_cacheable` |
| `/blog` | Published `public`-audience post cards | `public` | `index,follow` | `edge_cacheable` ⚠ header added by 11a.2 |
| `/blog/[postId]` | One published `public`-audience post | `public` | `index,follow` | `edge_cacheable` ⚠ header added by 11a.2 |
| `/members` | ⚠ Shell + FR-91 pagination controls + an explicit **not-yet-published** empty state. ⛔ **NO member data is read or rendered** — Story 11a.3 fills it behind its own anti-enumeration safeguards | `public` | `noindex` (FR-75) | `edge_cacheable` ⭐ 11a.3 must re-decide |
| `/` | Server redirect → `/niyamavali` | — | — | `redirect` |
| `/404` | Not-found state (DB-independent) | `public` | `noindex` | `edge_cacheable` |
| `/500` | Error state (DB-independent) | `public` | `noindex` | `private_no_store` |

⚠ **The `cache_policy` column is not documentation — it is DECLARED in
`public-vs-private-matrix.yaml` and RECONCILED against the `Cache-Control` each page
actually sets** (Story 11a.2 gate leg, ruling D3(a)/D4). A conflict fails CI, and a
rendering surface that sets **no** header fails too. ⛔ The leg proves what the **origin
emits** — nothing about Cloudflare or any edge, which is not in this repo and whose
selection is contingent on DPDPA legal review (architecture §5.8a).

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

`/niyamavali`, `/terms`, `/blog`, `/blog/[postId]` and `/members` set
`Cache-Control: public, max-age=60, s-maxage=300` and `Vary: Accept-Language` (the
default render negotiates language; the `?lang=` toggle produces distinct cache keys).
`/404` → `public, max-age=60`; `/500` → `no-store`; `/` redirects and sets none.

⚠ **`/blog` and `/blog/[postId]` set NO `Cache-Control` at all until Story 11a.2**, and
⛔ nothing checked — they shipped uncached-and-unnoticed for a whole epic because
**absence read as "the default is fine"**. It is not: with no header, every proxy and
CDN decides independently. The reconciliation leg is **fail-closed** precisely so this
cannot recur.

## Data path (Story 2.5)

The Niyamavali content is read **directly from `@twt/domain`** in Astro SSR via an
**unauthenticated `withPublicScope`** (`src/lib/db.server.ts`): `BEGIN` → `SET LOCAL ROLE
twt_app` (shed any superuser login so RLS is genuinely enforced — **not** a superuser
bypass) → `SET LOCAL app.pariwar_id` → read → `ROLLBACK`. `apps/public` owns its own pool
(`DATABASE_URL`). Branding is read via the cross-readable passport cache (no scope).

⭐ **AS OF STORY 11a.3 THE `apps/api/src/modules/public-pages/` HTTP MODULE *IS* USED.** ⚠ This
supersedes the previous sentence here, which said it was *"not used (empty until Epic 11b)"* — the
module now exists **with a real route** and `/members` calls it server-side via
`src/lib/directory.server.ts`. ⛔ The reason it is an HTTP hop rather than another
`withPublicScope` read is **capability, not taste** (Decision `2026-08-20-143` cl.1): rendering a
member row needs a **Tier-1 KYC decrypt** (KMS deps), an **anti-enumeration ceiling** (a rate-limit
store) and an **abuse audit line** (the BYPASSRLS service pool) — and `apps/public` verifiably has
**none of the three**. ⛔ **It must not gain the first**: the KEK is shared across *every* Tier-1
field class (mobile, device tokens, KYC), so a decrypt capability here has a blast radius that is
⛔ not "names". `tests/no-kms-in-public.test.ts` asserts that absence across the whole app.

## ⭐ The Member Directory is a LEGITIMACY surface, not a social graph

`/members` renders real member data, so the invariant governing what may be built on it is
recorded where a future author will actually open it — **`src/lib/members-render.ts`**, the page
header of **`src/pages/members.astro`**, and **`packages/contracts/public-pages/directory-abuse-rules.yaml`**.
⛔ It is not repeated in full here; this section exists so the public-surface contract *points at
it*.

In short: the directory exists to support **institutional legitimacy** and **trust verification**.
⛔ **PROHIBITED** — friend-finder / connection suggestions · social graphing or relationship
visualisation · engagement gamification (badges, streaks, leaderboards) · "members you might know"
recommendations · anything incentivising repeated member-discovery sessions. ✅ **ACCEPTABLE** —
tier-respecting search/filter for trust verification · accessibility · performance · additional
fields **only** with a trustee-attested matrix update.
⭐ **The test a proposal must pass:** *"Does this serve institutional legitimacy or trust
verification?"* If the honest answer is **engagement** or **social discovery**, the proposal is
**rejected at design time**.

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
