---
baseline_commit: 66ae30dc6810b3d9ec54153c3e908e209a1f2d02
---

# Story 11a.2: Public Astro SSR Shell Extension for Member Directory + Tiered Visibility Renderers `[PRIMITIVE]`

Status: review

> ✅ **BASELINE IS CLEAN AND ON `main`.** `HEAD == origin/main == 66ae30d` — verified by
> `git fetch origin` at authoring time ([[feedback_git_fetch_before_remote_reasoning]]). Story 11a.1
> is **merged**, not merely `done`. Branch off `main`; re-`fetch` before you branch.
>
> ✅ **ALL FIVE DECISIONS (D1–D5) RULED BY BIGDEV, 2026-08-20 — each as recommended. Nothing here
> is open.** They are recorded in §Decisions. They were **raised rather than assumed** because two of
> them (D1, D2) decide whether this story ships a member-facing page at all, and guessing a directory
> question is the exact **SD-1** failure mode (`2026-08-19-132` cl.7). ⛔ The dev agent must **not**
> re-open or re-interpret a ruling; a ruling is superseded, never re-read
> ([[feedback_supersede_never_reinterpret]]) — if one looks wrong once the code is in front of you,
> **stop and raise it**, ⛔ never silently deviate.
> ⚠ **This ruling has no independent record yet** — no `.decision-log.md` entry exists for it; this
> story file and the sprint-status ledger comment are the only trace, both written in the same
> authoring pass. **Task 1's decision-log commit is what makes it durable governance-of-record** —
> treat it as a **non-optional precondition**, not a formality
> ([[feedback_record_unattested_no_backfill]]).
>
> ⭐ **THIS STORY'S PREMISE CONTAINS A VERIFIED CONTRADICTION — READ TRAP 1 FIRST.** The epic AC
> asks for `<AuthenticatedFragment>` slots that *"render **server-side** when the viewer is
> authenticated"*. ⛔ `architecture.md:500-517` commits the opposite property, and the shipped member
> auth model makes the AC's version **unimplementable**. This is not a nit — it is the
> load-bearing half of the story.
>
> **Depends on (all `done` + merged):** **11a.1** (the populated matrix, `getVisibility()`, the
> three gate legs, the presentation policy) · 2.5 (the Astro shell, `withPublicScope`, the 5 original
> routes, the composition contract, the friction-budget manifest) · 2.6 (`/terms`) · 10.5
> (`/blog`, `/blog/[postId]`) · 1.14 (forced pagination + `noindex` + rate limits) · 1.17 (design
> system / `@twt/tokens`) · 3.2 (member auth — ⚠ read Trap 1: it is **token-bearer**, and that is the
> whole problem).

---

## Story

As Solo Builder extending the Story 2.5 Astro shell foundation,
I want the public shell to carry a **matrix-driven tiered-field renderer**, a **forced-pagination
primitive that actually binds on `apps/public`**, an **honest composition contract for
authenticated fragments**, and a **cache-policy declaration the gate reconciles against committed
source**,
so that Epic 11a's Member Directory and Epic 11b's per-claim surfaces consume one shell whose tier
behaviour is *enforced* rather than *remembered* — and so that no public route can ship an unbounded
list, an un-reconciled cache header, or an unclassified field.

---

## 🎯 What is actually true today — verified, not inherited

Every claim in this section was checked against the tree at `66ae30d`.

| Claim | Verified state |
|---|---|
| `getVisibility(matrix, surfaceId, fieldId, viewerContext)` exists | ✅ `packages/contracts/src/public-pages/scrape.ts:180` — pure, fail-closed, **zero call sites**. This story is its first consumer. |
| The matrix is populated | ✅ 8 surfaces, 23 fields, 1 escalation. `member-directory` is declared at `/members` with **`renders: false`**. |
| `/members` exists | ⛔ **No.** `apps/public/src/pages/` holds 7 pages; there is no `members.astro`. |
| A member-directory domain read exists | ⛔ **No.** `packages/domain/src/member/` has no directory list read. `member_postings` exists (`posting.ts`). |
| `apps/api/src/modules/public-pages/` exists | ⛔ **No.** 40 modules; this is not one of them. The authenticated-fragment auth boundary is **unbuilt**. |
| The fragment registry | ⛔ **Empty** — `apps/public/COMPOSITION-CONTRACT.md` initialises it empty and Story 2.5 shipped zero fragments. |
| Forced pagination (FR-91) binds on `apps/public` | ⛔ **NO — and this is a real hole.** `apps/api/tests/integration/forced-pagination.spec.ts` walks the **committed OpenAPI surface**. `apps/public` Astro routes emit no OpenAPI and are **not covered by any pagination guard**. A `/members?page=all` would be entirely unpoliced. |
| `Cache-Control` on public routes | ⚠ **Partial.** `/niyamavali` + `/terms` set `public, max-age=60, s-maxage=300`; `/404` sets `max-age=60`; `/500` sets `no-store`. ⛔ **`/blog` and `/blog/[postId]` set NO `Cache-Control` at all**, and nothing checks. |
| `js_bundle_bytes` baseline | `0` (ceiling `153600`). ⚠ There is **not one client island** in `apps/public`. |
| `critical_render_path_ms` | Deferred with a **trigger that fires in this epic** — *"throttled-Lighthouse-CI harness lands at Epic 11a (first additional public surface)"* (`friction-budget.yaml:69-73`). |
| Per-route page-weight | Deferred with a **trigger that already fired and was never honoured** — *"Epic 11a (second public route) — restructure to `routes: { '/niyamavali': <bytes> }`"* (`deferred-work.md:1369`). ⚠ `/terms` (2.6) and `/blog` (10.5) both shipped; the manifest is still an aggregate. |

---

## ⛔ THE SIX TRAPS — read these before anything else

### Trap 1 — ⭐ THE EPIC AC AND THE ARCHITECTURE DISAGREE, AND THE ARCHITECTURE WINS

The epic AC (`epics.md` §Story 11a.2):

> *"`<AuthenticatedFragment>` slots that **render server-side when the viewer is authenticated**"*

`architecture.md:504-517` (the committed AR-48 composition contract):

> *"…plus **registry-declared authenticated fragments that hydrate client-side**."*
> *"The SSR output contains **no PII, no member-state, and no auth-derived branching**."*
> *"Authenticated fragments **hydrate after page load**. Non-authenticated visitors see a
> public-fallback state baked into the SSR output."*
> *"The **auth boundary lives at the API** (`apps/api/modules/public-pages/`), **not at the page or
> the edge** — no special-case auth surface is introduced at the public page layer."*

⛔ **The AC's phrasing would put auth-derived branching into cache-safe SSR output** — the precise
property §2.5 committed to enforce *"structurally … not through documented discipline"*. Per
[[feedback_architecture_vs_prd_boundary]] the architecture commits the property; the epic does not
get to relax it by prose. **Build the architecture's version.**

⚠ **And it is worse than a conflict — the AC's version cannot be built.** Members are
**TOKEN-BEARER**, not cookie-session: `apps/api/src/modules/auth/shared/member-session-guard.ts:1-8`
— *"Members are TOKEN-BEARER (no `@fastify/session`): a preHandler that verifies the access-token
JWT from the **Authorization header**"*, `exp ≤ 15 min`. A browser navigating to `twt.org/members`
sends **cookies**, never an `Authorization` header. There is no `apps/member-web/` (architecture
§"Member-Responsive Web" defers it behind named triggers) and `apps/` contains
`admin · api · jobs · mobile · public` — **no browser surface holds a member token**.

⇒ ⛔ **There is no `authenticated_member` viewer on `apps/public` today, by any mechanism.**
Inventing one means minting a browser member session, which is a new auth surface the architecture
forbids at this layer, and is not this story.

⭐ **What this story therefore builds:** the composition **contract** — a fragment slot that SSRs the
**public-fallback state only**, a registry that is honestly populated, and the mechanism fork
recorded as an explicit deferral with its trigger. ⛔ **Do not** ship a fragment whose authenticated
half is unreachable and untested and call the pattern "established".

### Trap 2 — ⚠ `renders: false` IS ARMED. Shipping `/members` without flipping it FAILS CI.

`checkRouteCoverage` (`gate.ts:85-95`) emits **`STALE renders:false`** the moment a route ships for a
surface declared `renders: false`. `member-directory` is declared exactly that way. ⇒ if this story
ships `members.astro`, it **must** flip `renders: true` **in the same commit** — and that flip turns
on two more legs against the surface: `checkIndexingReconciliation` (the page must pass a `noindex`
prop, since the surface declares `noindex`) and the live-render tier-leak leg.

⛔ **And the reverse trap:** flipping `renders: true` **without** shipping the page emits
**`ORPHANED SURFACE`**. The two halves move together or the gate fails. That is deliberate.

⚠ **11a.1's own record is internally inconsistent about who ships this route.** Its scope table
assigns *"the `/members` route, pagination"* to **11a.2**; its sprint-status ledger says
*"member-directory is renders:false and a STALE-renders:false check fails **until 11a.3** flips it"*.
⛔ Both cannot be right. **That is D1**, and it is why D1 is not a style question.

### Trap 3 — ⛔ THE MATRIX MUST BE THE *SAME* MATRIX AT RUNTIME AS AT GATE TIME

`<MatrixField>` renders from the matrix. The gate and the live-render spec read
`packages/contracts/public-pages/public-vs-private-matrix.yaml` **from disk by relative path**
(`check-pii-scrape.ts:53`, `scrape-test.spec.ts:64-67`). ⛔ A relative `fs` read **will not work in
the deployed shell**: `astro.config.mjs` bundles `@twt/*` via `vite.ssr.noExternal` precisely because
*"the standalone Docker image copies `dist/`, not the workspace symlinks"* — the `.yaml` is not in
`dist/`.

⇒ Load it as a **Vite `?raw` import** so the bytes are inlined into `dist/server/entry.mjs`
(`@twt/contracts` declares no `exports` map, so the deep path resolves), and add a test asserting the
runtime-loaded matrix is **byte-identical** to the committed file. ⛔ A renderer enforcing a *stale
copy* of the matrix while the gate checks the *real* one is a silent divergence, and it would be
invisible to both.

### Trap 4 — ⛔ FR-91 IS NOT ENFORCED ON `apps/public`. Do not assume Story 1.14 covers you.

The forced-pagination guard walks `openapi/v1.yaml`. `apps/public` Astro routes are **not in it**.
FR-91 (*"`?page=all`-style query rejected. Max page size enforced."*) is, on this surface, **only as
real as the code this story writes**. ⛔ Do not cite 1.14 as coverage — verify it, and it does not.
⚠ Whatever bound ships must be **mechanized**, not conventional: a helper plus a check, in the house
pattern, or the next public list route will forget it exactly as `/blog` forgot `Cache-Control`.

### Trap 5 — ⚠ THE FIRST CLIENT ISLAND CHANGES THE FRICTION-BUDGET STORY (but does not fail it)

`js_bundle_bytes` baseline is `0`, ceiling `153600`. Per `scripts/friction-budget/lib.ts:165-215`:
**measured > baseline but ≤ ceiling → PASS** (delta reported); measured < baseline → **FAIL**
("improved but baseline not lowered"). So a first island does not break the gate — ⛔ but it **cannot
ratchet the baseline up**, and `evaluateDeclaration` (`lib.ts:475-501`) requires that a PR touching a
member-facing surface **also touch `friction-budget.md`** (add or affirm a named-payer declaration).
⚠ Per [[project_friction_budget_baseline_ratchet]] the AC-4 leg diffs **committed** history — it
passes vacuously until you commit, so ⛔ do not read an early green as proof.

### Trap 6 — ⚠ TURBO INPUTS AGAIN. 11a.1 closed this hole; a new scanned path re-opens it.

`turbo.json:48-59` now lists `../../apps/public/src/pages/**/*.astro` and `../../.decision-log.md` in
`contracts:check-pii-scrape.inputs`. ⛔ If this story teaches the gate to scan anything **new** — a
cache-policy reconciliation over page sources is exactly that, and it reads the *same* `.astro`
files, so it is already covered — verify the input list still covers every path read, **in the same
commit**. A gate reading a file outside its `inputs` replays `FULL TURBO` over unscanned content and
passes on stale bytes. This is the trap 11a.1 caught live; ⛔ do not re-introduce it.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| ⛔ Not in scope | Owner |
|---|---|
| The Member **Directory render itself** — member rows, the Tier-1 name decrypt, `resolvePublicMemberName` wired to a render | **11a.3** |
| **Anti-enumeration safeguards** — query throttling, cursor opacity, abuse heuristics, `directory-abuse-rules.yaml`, audit lines for high-volume lookups | **11a.3** ⚠ and they are *load-bearing, not defensive* (`epics.md` C1) |
| Phone/email **obfuscation** | **11a.4** |
| `<NoticeboardStrip>` / `<PinnedNotice>` | **11a.5 / 11a.6** |
| A **browser member session** (cookie auth for `apps/public`) | ⛔ **FORBIDDEN here** — a new auth surface at the page layer, which `architecture.md:515-517` prohibits. Needs its own ruling and probably `apps/member-web/` |
| The **first real authenticated fragment** (FR-77 nominee bank + IFSC + UPI CTA) | **Epic 11b** — architecture names it as the v1 registry entry |
| **Changing any matrix tier** or adding a Tier-1 exception | ⛔ **FORBIDDEN** — one exception exists (`member_name`), and a second **fails to parse** by design (`matrix.ts` cross-field check) |
| **Pre-declaring Epic 11b surfaces** | ⛔ Still deliberately undeclared. The bidirectional route leg fails when an 11b route ships — that is the mechanism, and it is stronger than a guessed entry |
| Amending **In Memoriam / Sahyog Vivran** name form | ⛔ **FORBIDDEN** (`epics.md` C5) |
| Configuring **Cloudflare** | ⛔ Out of the repo. Edge/WAF selection is contingent on DPDPA legal review (architecture §5.8a). ⇒ AC6 discharges the *"edge cache TTL"* AC by **emitting and reconciling correct `Cache-Control` headers**, ⛔ never by claiming an edge config that does not exist |
| `block` / `zone` / `division` / `school` / `designation` | ⛔ **BLOCKED or PERMANENTLY INELIGIBLE** — unchanged from 11a.1. Do not add a matrix row for any of them |

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**Does this story introduce or change a predicate that gates a member's access to a benefit?**

⛔ **No.** Every predicate this story introduces is a **rendering** predicate: `getVisibility()`
decides whether a *viewer* sees a *field*, and the pagination bound decides how many rows a page
returns. ⛔ Neither is read by `is_valid`, `is_assignable`, eligibility, pool assignment, validity, or
peer-mesh selection — and `architecture.md` §2.13.2 makes that structural: *"Directory attributes are
display-only BY DEFAULT … enforced by signature"*. ⛔ **A diff in which a `getVisibility()` verdict or
a matrix value reaches an eligibility path violates §2.13.2** and must be rejected in review, not
argued about.

**The sentence is nevertheless owed, because this story changes what a member's page can show:**

> **In the member's terms:** *"Nothing about what you receive from the trust changes. What changes
> is that the public website now has a members page, and the website itself now refuses to print any
> detail about you that has not been written down and approved in advance — if a detail was never
> classified, the page leaves it out rather than guessing."*

**Checked against the Niyamavali — result carried forward, ⛔ not re-derived.** Story 11a.1 verified
by reading all 23 v1 clause ids in `packages/domain/seed/niyamavali-v1-clauses.sql` that ⛔ **no
clause governs directory publication or name visibility**, and raised it as an **open finding for the
Panel** (Decision `2026-08-20-140` cl.7), ⛔ not closed. ⚠ **That finding is still open and this story
does not close it** — amending the Niyamavali is Story 2.4's workflow and needs its own ruling
([[feedback_supersede_never_reinterpret]]). ⚠ **D1(a) is ruled, so a `/members` page ships here — which means this story ships a members page
while the rulebook still does not mention one.** ⭐ That was BigDev's call, made **knowingly** at
authoring time with the finding in front of them, ⛔ not a detail discovered afterwards. ⚠ It stays an
**open finding for the Panel** and this story ⛔ does not close it.

---

## Acceptance Criteria

### AC1 — `<MatrixField>` renders through `getVisibility()`, and the runtime matrix IS the committed matrix

**Given** `getVisibility()` ships in the pure engine with **zero call sites**
**When** the shell extension is authored
**Then** `<MatrixField surface={…} field={…} viewerContext={…} value={…} />` ships in
`apps/public/src/components/` and **delegates every decision to `getVisibility()`** — ⛔ it must not
re-implement tier comparison, must not import `TIER_RANK`, and must not carry a second copy of the
viewer ceiling (11a.1 collapsed the repo to exactly one copy of the tier ordering; ⛔ do not add a
third)
**And** a **not-visible** verdict renders **nothing at all** — no placeholder element, no empty
`<span>`, no HTML comment naming the omitted field. ⛔ *An omission that announces itself is an
enumeration signal*: a scraper diffing the public and member renders learns exactly which fields
exist and where. The `reason` is for **logs and tests**, ⛔ never for the DOM
**And** the matrix is loaded via a **Vite `?raw` import** so its bytes are inlined into
`dist/server/entry.mjs` (**Trap 3**), parsed once per process by `parsePublicVsPrivateMatrix`, and a
**loud throw** on empty/malformed — ⛔ never a `?? { surfaces: [] }` fallback, which is the exact
degradation 11a.1 deleted from the live-render spec
**And** a test asserts the runtime-loaded matrix is **byte-identical** to
`packages/contracts/public-pages/public-vs-private-matrix.yaml`, so the renderer and the gate can
never enforce different matrices
**And** a **negative control** proves teeth: an `authenticated_member`-tier field asked for at
`public` renders nothing, and an **undeclared** field renders nothing and is distinguishable in the
verdict as `undeclared_field` (fail-closed).

### AC2 — Forced pagination BINDS on `apps/public`, mechanized — because Story 1.14 does not reach here

**Given** ⛔ **verified**: the 1.14 forced-pagination guard walks `openapi/v1.yaml` and `apps/public`
emits none (**Trap 4**), so FR-91 is currently unenforced on every public Astro route
**When** the pagination primitive ships
**Then** a pure, tested helper in `apps/public/src/lib/` parses page params and **rejects**
`?page=all` / `?limit=all` / a limit above the cap / a negative or non-integer page — returning a
decidable rejection, ⛔ never silently clamping to a default (a silent clamp teaches nothing and
hides the probe)
**And** a rejected request renders a **400-shaped state**, ⛔ not a redirect to page 1 and ⛔ not a
successful render of a different page than was asked for
**And** the cap is a **named exported constant with its rationale**, cross-referenced to FR-91, so
the next public list route reuses it rather than inventing one
**And** ⭐ **a CI leg makes it structural, not conventional**: an assertion that every `apps/public`
page whose matrix surface declares a paginated render calls the helper — ⛔ or, if that proves to be
more machinery than it is worth, the fallback is honest: **say so in the README in plain words**, in
the 10.12 fence's confess-the-soft-spot style, ⛔ never leave a comment claiming a protection that
does not exist
**And** ⛔ **no bulk-export affordance ships** — no "download all", no CSV link, no `?format=csv`
(FR-91; the authorized path is Story 10.7's scope-respecting, audit-logged reports library).

### AC3 — The authenticated-fragment composition contract is established HONESTLY — client-hydrated, public-fallback-only, auth boundary at the API

**Given** **Trap 1** — the epic AC contradicts `architecture.md:504-517`, and the shipped
token-bearer member auth makes the AC's server-side version **unbuildable** from a browser navigation
**When** the composition pattern is established
**Then** `<AuthenticatedFragment>` ships as a **slot primitive whose SSR output is the
public-fallback state and nothing else** — ⛔ it reads no session, no cookie, no header, and emits no
auth-derived branch, preserving the §2.5 cache-safe guarantee **structurally**
**And** `apps/public/COMPOSITION-CONTRACT.md` is updated: the fragment registry names the **pattern
and its boundary**, and states plainly that **zero live fragments ship here**, with FR-77 (Epic 11b,
nominee bank + IFSC + UPI CTA) named as the v1 entry the architecture already commits
**And** ⭐ **the hydration mechanism is recorded as an explicit deferral with its trigger**, ⛔ not
guessed: the fork is (a) a client island fetching `apps/api/src/modules/public-pages/` with a bearer
token vs (b) an Astro 6 **server island** (`server:defer`, which fetches the island in a separate GET
with encrypted props and so keeps the shell edge-cacheable). ⛔ **Neither is chosen here** — both need
a token-holding browser, which does not exist. **Re-trigger:** the first real fragment (Epic 11b
FR-77) **or** an `apps/member-web/` split trigger firing
**And** ⛔ **`apps/api/src/modules/public-pages/` is NOT created empty.** A module with no route is
a claim that a boundary exists. Per [[feedback_no_premature_package]], it lands with its first
consumer
**And** the deferral is written into `deferred-work.md` with its trigger, and the shipped
`js_bundle_bytes` stays **0** — ⛔ if it does not, **Trap 5** applies and AC7 owes a declaration.

### AC4 — The `/members` route ships, and the matrix `renders` flag moves with it in the SAME commit

**Given** **Trap 2** — `renders: false` is armed in both directions, and 11a.1's own record
contradicts itself about who ships this route
**When** the route ships — ✅ **D1(a) RULED: it ships HERE**
**Then** `apps/public/src/pages/members.astro` lands, `renders` flips
to `true` in `public-vs-private-matrix.yaml` **in the same commit**, the page passes `noindex` to
`PublicShell` (the surface declares `noindex` — FR-75, ⛔ unchanged by the full-name supersession),
and `pnpm pii:check` is **run and shown green** in Completion Notes
**And** ⛔ the `member-directory` surface's section-header comment and `description:` field
(`public-vs-private-matrix.yaml:217-225`) — which currently read *"Story 11a.3 builds it and flips
`renders` to true"* — are **rewritten to say 11a.2 shipped the route**; a boolean flip that leaves
the surrounding rationale asserting the opposite is a governance record contradicting itself the
moment this story merges
**And** ⚠ the render's field set is **whatever the page actually renders and no more** — derived via
`deriveFieldIds` from a pure render model (`apps/public/src/lib/surface-fields.ts`, ⚠ **Story 11a.1's**
ruling D3(a) — ⛔ not this story's D3),
⛔ never a hand-written list, and ⛔ **`member_name` is not rendered here** (the Tier-1 decrypt is
11a.3's, gated behind 11a.3's safeguards)
**And** ⚠ **the tier-leak leg on this surface must not be silently vacuous.** If the render carries
no fields, say so **loudly** — in the story record and in the page's own header — ⛔ never let a green
check imply the flagship surface is being policed when it is not. That is the exact defect 11a.1
existed to remove, and re-introducing it *on the Member Directory* would be worse than the original
**And** ⛔ the D1(b) *district-only* render is **not** what was ruled — ⛔ **no member row data is
read or rendered here**. The page renders the shell, the pagination controls, and an explicit
not-yet-published empty state; 11a.3 fills it behind its own safeguards.

### AC5 — Cache policy is DECLARED per surface and RECONCILED against committed source, and the `/blog` gap closes

**Given** the epic AC (*"only `public`-tier rendered content is edge-cacheable; `authenticated_member`
and `operator_restricted` content bypass edge cache"*) and ⛔ **verified**: `/blog` and
`/blog/[postId]` set **no `Cache-Control` at all**, and nothing checks any of them
**When** the cache contract is mechanized
**Then** each matrix surface declares a **cache policy** (minimally `edge_cacheable` /
`private_no_store`) and a **new gate leg reconciles it against the `Cache-Control` the page source
actually sets** — provable from committed source, exactly as `checkIndexingReconciliation` already
does for `noindex` (`gate.ts:183`), and a conflict **fails CI**
**And** the reconciliation is **fail-closed**: a rendering surface that sets **no** `Cache-Control`
**fails** — ⛔ absence must never read as "the default is fine", which is how `/blog` shipped
uncached-and-unnoticed for a whole epic
**And** `/blog` + `/blog/[postId]` gain the headers they should always have had (`public,
max-age=60, s-maxage=300` + `Vary: Accept-Language`, matching their `public`-tier siblings)
**And** ⛔ **no claim is made about Cloudflare.** The edge is not in this repo and its selection is
contingent on DPDPA legal review; the gate proves what the **origin emits**, and the README says
exactly that and no more
**And** a **negative control** plants a conflicting header on a real page, proves exit 1, and reverts.

### AC6 — The two Epic-11a friction-budget triggers are DISCHARGED or RE-DEFERRED IN WRITING — ⛔ neither is silently skipped

**Given** two deferrals name this epic as their re-trigger, and one of them **already fired and was
missed**:
  - `critical_render_path_ms` → *"harness lands at Epic 11a (first additional public surface)"*
    (`friction-budget.yaml:69-73`, Decision `2026-06-20-055(b)`)
  - per-route page-weight → *"Epic 11a (second public route) — restructure to `routes: { … }`"*
    (`deferred-work.md:1369`) ⚠ `/terms` (2.6) and `/blog` (10.5) **both shipped**; the manifest is
    still an aggregate. ⛔ The trigger did not fail — **it was not noticed**
**When** this story lands
**Then** each is either **discharged** or **re-deferred with a NEW written trigger and a reason** —
⛔ silence on either is a failure of this AC, and *"we'll get to it in 11a.3"* is only acceptable if
it is **written down as a trigger**, per [[feedback_closure_language_precision]] (*"Closed by
[edit]"* vs *"Resolved via explicit deferral"* are different claims — ⛔ never collapse them)
**And** ✅ **D5(a) RULED — the per-route restructure is DISCHARGED here** and
`critical_render_path_ms` is **re-deferred with a new written trigger**: `page-weight.mjs`
already walks `dist/client/` and this story is the shell story. ⚠ Note the honest limit — the
manifest measures **static client assets**, so a per-route split is a per-route **attribution** of
those assets, ⛔ not a measurement of each route's dynamic HTML. **Say which one you built.**

### AC7 — Friction-budget declaration + microcopy + i18n + empty-state inventory, per the surface actually shipped

**Given** the gates that bite on a new member-facing surface
**When** the `/members` page ships (✅ **D1(a): it does**)
**Then** `friction-budget.md`'s named-payer ledger carries an **affirmed or new** declaration
(`evaluateDeclaration`, `lib.ts:475-501`, requires the file be touched when a member-facing surface
is) — ⚠ and per [[project_friction_budget_baseline_ratchet]] the leg diffs **committed** history, so
⛔ **verify after committing**, not before
**And** new member copy lands in a **new i18n namespace** with **Hindi + English parity**
(`i18n:check-parity`) — ⚠ `t()` defaults to the `common` namespace and **throws** on a miss
([[project_missed_cycle_visibility_substrate]]), so pass `namespace` explicitly, as every existing
page does
**And** `microcopy.yaml` `scope.copy_globs` gains **both** locale files — ⛔ the register grows
surface-by-surface *by being added to*; a new namespace that is not globbed is **unscanned copy**
wearing a green check
**And** `docs/ux/empty-skeleton-error-inventory.md` gains the new surface's empty / skeleton / error
states with ⛔ **no `<TBD>` cells** — Row 6 remains `in-progress` and its closure trigger (full
Phase-1 surface inventory at Epic 11a completion) is ⛔ **not relaxed**, and ⛔ **no trustee
ratification is fabricated or back-dated** ([[feedback_record_unattested_no_backfill]])
**And** ⚠ **a pre-existing gap is recorded, ⛔ not quietly fixed and ⛔ not quietly ignored**: the
inventory covers the 2.5 and 2.6 surfaces but **not** `/blog` or `/blog/[postId]` (10.5). Record it;
route it deliberately.

### AC8 — CR-D0-1.16b is discharged: a non-public snapshot with `html` and no `fields` must not pass silently

**Given** the deferred finding whose trigger is **this story** (`deferred-work.md:2729`): when a
`RenderSnapshot` carries `html` but no `fields` at `authenticated_member` / `operator_restricted`,
neither leg runs and the verdict is **`pass`**
**When** this story lands
**Then** the engine no longer returns a bare `pass` for that shape — minimally a **warning** carried
on the verdict (`SnapshotVerdict.warnings` already exists and is already populated for the
declared-but-empty-fields case, `scrape.ts:330-338`), and the live-render spec **asserts on it**
**And** ⛔ **a warning nobody reads is not a discharge** — if it cannot be made to fail a test, it has
not been closed, and the entry stays open in `deferred-work.md` saying so
**And** the disposition is written into `deferred-work.md` in the project's closure language, ⛔ never
deleted.

### AC9 — Revert-sanity: every new detection route has an independently planted negative control

**Given** the house doctrine — *"a gate that cannot be made to fail has no teeth, and a governance
gate that silently stopped detecting anything would be worse than no gate: the green check would
actively certify an invariant nobody is enforcing"* (`scripts/governance-boundary/README.md`)
**When** the suite runs
**Then** **each** new detection route carries its **own** planted violation: cache-policy conflict ·
missing `Cache-Control` on a rendering surface · `?page=all` · over-cap limit · a tier-above-ceiling
field asked of `<MatrixField>` · an undeclared field asked of `<MatrixField>` · runtime-matrix drift
from the committed file · (if D1 ships the route) `STALE renders:false`
**And** ⛔ **never one fixture tripping several checks** — that is one control wearing several hats,
and it hides which leg actually fired
**And** the whole gate is proven **live at least once against a real planted file**, exit code
recorded in Completion Notes, then reverted
([[feedback_verify_before_committing_governance_claims]] — ⛔ a green scan is not proof; **run it**).

### AC10 — Accessibility + design system, on whatever surface ships

**Given** the inherited accessibility gate (Story 0.10 P0-2c) and the Story 1.17 design system
**When** any new surface renders
**Then** semantic structure, ARIA labelling, keyboard-reachable pagination controls, and visible
focus states — consuming `@twt/tokens` through the existing `theme.server.ts` `:root` block (⛔ the
documented Story 2.5 variance: `@twt/ui` is still a stub and there is no Tailwind pipeline on this
surface — ⛔ do not introduce one)
**And** pagination controls are **real links** (server roundtrip), ⛔ not JS-dependent buttons — the
shell's minimal-JS, works-with-JS-disabled posture (AC3 of Story 2.5) is ⛔ **not** relaxed by this
story.

---

## 🚨 Decisions — ✅ **ALL FIVE RULED BY BIGDEV, 2026-08-20. Nothing here is open.**

> ⚠ **DECISION IDS COLLIDE ACROSS STORIES — read the prefix.** `D1`–`D5` below are **this story's**.
> Story 11a.1 also ruled a `D1`–`D6`, and three of its rulings are still binding here (its **D2** =
> the gate-script / live-render-spec split; its **D3(a)** = snapshot `fields` derived from the render
> model's own keys; its **D5** = `member-directory` declared with `renders: false`). ⛔ Where the text
> means 11a.1's, it says so explicitly. ⛔ Never resolve a bare `D3` by proximity.

⭐ Every one was ruled **as recommended**, so the Tasks below are already written against the ruled
option. ⛔ The rejected options are retained deliberately — a reader must be able to see what was
*not* chosen and why, without re-deriving it.

### D1 — ⭐ Does `/members` ship in **this** story, or in 11a.3? — ✅ **RULED (a) (BigDev, 2026-08-20)**

⚠ **This is not a style question**: 11a.1's scope table says **11a.2**; its sprint-status ledger says
**11a.3**. Both are committed. One is wrong, and **Trap 2** means the matrix moves with whichever
answer is right.

- **(a) ✅ RULED — the route ships here, rendering the shell + pagination + an explicit
  not-yet-published empty state; `renders` flips to `true`.** The epic AC asks for it, 11a.1's scope
  table assigns it here, and it gives `<MatrixField>` and the pagination helper a **real call site**
  instead of shipping primitives nobody consumes. ⚠ **Its cost, stated plainly:** the tier-leak leg
  on `member-directory` is then **armed but empty** until 11a.3 renders fields — which AC4 requires
  be declared **loudly**, ⛔ never left to be inferred from a green check.
- **(b)** ⛔ *Not chosen.* The route ships here rendering **`district` only** (Tier-3, platform-common, already
  declared `public`, no Tier-1 decrypt, no new substrate). ⭐ Gives the flagship surface a
  **non-vacuous** tier-leak leg from day one. ⚠ ⛔ **But it publishes per-district membership
  counts before 11a.3's anti-enumeration exists**, and `epics.md` C1 rules those safeguards
  *"load-bearing, not defensive"*. ⛔ Shipping a member-listing surface ahead of its safeguards is the
  sequencing hazard `2026-08-19-136` cl.4 exists to prevent.
- **(c)** ⛔ *Not chosen.* No route here; 11a.2 ships primitives only and 11a.3 ships `/members`. ✅ Keeps
  `renders: false` **accurate** and keeps every member row behind its safeguards. ⚠ Cost: two
  primitives with **zero consumers**, which is how a renderer drifts from the surface that will
  eventually use it.

> ⚠ **VERIFIED FINDING, added by `bmad-code-review` (2026-08-20), recorded as `.decision-log.md#2026-08-20-142` — ⛔ this note does NOT edit or reopen the ruling above.** The "real call site" half of (a)'s
> stated reason is **false as shipped**: `<MatrixField>` has zero call sites anywhere in the diff
> (only a comment cites it; no page imports or renders it). The pagination helper's half of the same
> claim IS true. This is not a dev-agent deviation — `<MatrixField>` renders individual member
> **fields**, and this story's own (a)-cost ("armed but empty" until 11a.3) means zero fields render
> here, making a real `<MatrixField>` call site structurally unbuildable at this story regardless of
> which option had been chosen. 2026-08-20-142 records this as its own dated finding rather than
> amending the ruling text. Follow-up: `<MatrixField>` gets its first real call site the same moment
> Story 11a.3 arms the tier-leak leg for real.

### D2 — What exactly is `<AuthenticatedFragment>` at this story? — ✅ **RULED (a) (BigDev, 2026-08-20)** (see **Trap 1**)

- **(a) ✅ RULED — a public-fallback-only slot + an honest registry + the mechanism recorded
  as a deferral.** It is the only option that is **both** architecture-compliant and **buildable**:
  there is no token-holding browser, so an authenticated half would be unreachable and untested.
- **(b)** ⛔ *Not chosen.* Build the client-island + `apps/api/src/modules/public-pages/` boundary now. ⛔ Requires
  inventing a browser member session — a new auth surface `architecture.md:515-517` forbids at this
  layer — and creates an empty module claiming a boundary that has no consumer.
- **(c)** ⛔ *Not chosen as the build.* Build it as an Astro 6 **server island** (`server:defer`). ⭐ Genuinely elegant — the island
  is a separate GET with encrypted props, so the shell stays edge-cacheable while the fragment
  renders server-side, which is the *only* reading under which the epic AC and the architecture
  agree. ⛔ But it still needs a viewer the browser cannot identify, and it moves the auth read to the
  **page layer**. ⚠ **Worth recording in the deferral as the leading candidate for 11b** rather than
  discarding.

### D3 — Where does the cache-policy reconciliation leg live? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — a fourth leg in the existing gate** (`gate.ts` pure core +
  `check-pii-scrape.ts` orchestration), reading the **same** `.astro` sources
  `checkIndexingReconciliation` already reads. One file, one turbo input list (already covers the
  path — **Trap 6**), one review surface, and it mirrors ruling D2 of 11a.1: *committed source is the
  gate's job*.
- **(b)** ⛔ *Not chosen.* A new standalone gate + CI job. ⚠ A second job scanning the same files for a sibling
  property, with its own drift surface. ⛔ Not warranted.

### D4 — Does the matrix schema gain a `cache_policy` field, or is it inferred from tiers? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — an explicit per-surface `cache_policy`.** Inference (*"all-public ⇒
  cacheable"*) is a **rule the reader must reconstruct**, and it silently mis-classifies `/500`
  (all-public fields, but `no-store` because the data layer may be the thing that failed) and `/`
  (a redirect). ⛔ An explicit declaration is checkable; an inferred one is an argument.
- **(b)** ⛔ *Not chosen.* Infer from field tiers. ⚠ Cheaper, and immediately wrong on two of the eight shipped
  surfaces.

### D5 — Per-route page-weight: discharge here, or re-defer? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — discharge the per-route restructure here** (`routes: { '/niyamavali': … }`)
  and **re-defer `critical_render_path_ms` with a new written trigger**. The restructure is a small
  change to a script this story already touches, and its trigger **fired two stories ago**. A
  throttled-Lighthouse-CI harness is a genuinely separate piece of infrastructure and ⛔ should not
  be smuggled into a shell story.
- **(b)** ⛔ *Not chosen.* Discharge both. ⚠ Puts a device-throttled Lighthouse harness on this story's critical path.
- **(c)** ⛔ *Not chosen.* Re-defer both. ⛔ The per-route trigger has now been missed **twice**; a third pass without
  a written reason is decay, not deferral ([[feedback_mechanization_split_commitment]]).

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 `<MatrixField>` + runtime matrix identity | T2, T3, T9 |
| AC2 forced pagination on `apps/public` | T4, T9 |
| AC3 fragment contract (honest) | T5, T10 |
| AC4 `/members` + `renders` flip (D1) | T6, T9 |
| AC5 cache policy declared + reconciled | T7, T9 |
| AC6 friction-budget triggers | T8, T10 |
| AC7 declaration + microcopy + i18n + inventory | T6, T8, T10 |
| AC8 CR-D0-1.16b discharge | T3, T10 |
| AC9 revert-sanity | T9 |
| AC10 a11y + design system | T6 |

### Task 0 — Branch, baseline, rulings (AC: all)
- [x] ✅ **D1–D5 are already ruled** (BigDev, 2026-08-20, all as recommended) and §Decisions records
      them. ⛔ No halt. ⛔ Do not re-open a ruling mid-implementation — if one looks wrong once the
      code is in front of you, **stop and raise it**, ⛔ never silently deviate
      ([[feedback_supersede_never_reinterpret]]).
- [x] `git fetch origin`; confirm `origin/main` is still `66ae30d`. Branch off `main`.
- [x] ⛔ Confirm `pnpm pii:check` is **green before you start** and record the surface/field counts,
      so any later failure is provably **yours** ([[feedback_verify_before_committing_governance_claims]]).

### Task 1 — `governance:` — the decision-log entry (AC: all) — ⭐ **COMMITS FIRST, ALONE**
- [x] Write the `.decision-log.md` entry recording **D1–D5 as ruled by BigDev on 2026-08-20 (each
      as recommended)**, the **Trap 1** finding (the
      epic AC contradicts `architecture.md:504-517` **and** is unbuildable against token-bearer member
      auth), the **11a.1 internal inconsistency** about who ships `/members`, and the two verified
      pre-existing gaps (**FR-91 unenforced on `apps/public`**; **`/blog` sets no `Cache-Control`**).
- [x] ⚠ Also record that **Decision `2026-08-20-140` cl.7 remains OPEN** (the Niyamavali still does
      not record directory publication) and that this story ⛔ does not close it.
- [x] Commit `governance(11a.2): …` **before any code**
      ([[feedback_governance_commits_precede_implementation]] — history must read governance →
      implementation).
- [x] ⚠ The escalation-attestation leg parses `^### Decision <id>` headings (`gate.ts:265`) — match
      the existing heading format **exactly** (a known brittleness, `deferred-work.md` §11a.1 review).

### Task 2 — `<MatrixField>` (AC: 1)
- [x] `apps/public/src/lib/matrix.server.ts` — `?raw` import of the committed YAML + parse-once +
      loud throw. ⛔ No `?? { surfaces: [] }`. Add the `*.yaml?raw` module declaration to
      `src/env.d.ts` so `astro check` passes.
- [x] `apps/public/src/components/MatrixField.astro` — delegates to `getVisibility()`. ⛔ No local
      tier comparison, ⛔ no `TIER_RANK` import, ⛔ nothing in the DOM on a not-visible verdict.
- [x] Test: byte-identity of runtime matrix vs committed file; visible / above-ceiling / undeclared;
      ⛔ assert the not-visible render is **empty**, not merely "not the value".

### Task 3 — Engine: discharge CR-D0-1.16b (AC: 8)
- [x] `packages/contracts/src/public-pages/scrape.ts` — a non-public snapshot with `html` and no
      `fields` gains a **warning** on the verdict (reuse the existing `warnings` channel).
- [x] Assert on it in `apps/public/tests/integration/public-pages/scrape-test.spec.ts`. ⛔ If it
      cannot be made to fail a test, it is **not discharged** — say so and leave the entry open.
- [x] ⚠ `packages/contracts` has 1012 unit tests today; keep them green.

### Task 4 — Forced pagination that binds here (AC: 2)
- [x] `apps/public/src/lib/pagination.ts` — pure parse + reject; exported cap constant with rationale
      + FR-91 cross-reference; ⛔ no silent clamp; ⛔ no bulk-export affordance anywhere.
- [x] Tests incl. `?page=all`, `?limit=all`, over-cap, negative, non-integer.
- [x] ⚠ Write into the README, in plain words, **what is and is not mechanized** — ⛔ do not imply
      Story 1.14 covers this surface. It does not (**Trap 4**).

### Task 5 — `<AuthenticatedFragment>` + the composition contract (AC: 3) — ✅ **D2(a) RULED**
- [x] `AuthenticatedFragment.astro` — SSRs the public-fallback slot **only**. ⛔ Reads no session, no
      cookie, no header.
- [x] Update `apps/public/COMPOSITION-CONTRACT.md`: pattern + boundary + ⛔ **zero live fragments**;
      name FR-77 (11b) as the v1 entry.
- [x] ⛔ Do **not** create `apps/api/src/modules/public-pages/`.
- [x] Test that the fragment's SSR output is **identical** for a request with and without arbitrary
      cookies/headers — the cache-safety property, ⛔ asserted rather than asserted-about.

### Task 6 — `/members` (AC: 4, 7, 10) — ✅ **D1(a): the route ships here**
- [x] `apps/public/src/pages/members.astro` mirroring `terms.astro`'s shape: thin frontmatter, all
      display logic in a pure `lib/` module, `withPublicScope` if it reads at all, `noindex` prop,
      explicit `namespace` on every `t()` call.
- [x] ⛔ Flip `renders: true` in `public-vs-private-matrix.yaml` **in the same commit** (**Trap 2**).
- [x] ⛔ Rewrite the surface's section-header comment and `description:` field
      (`public-vs-private-matrix.yaml:217-225`) — they currently say *"Story 11a.3 builds it and
      flips `renders` to true"*, which the D1(a) ruling supersedes. Leaving it says the route both
      did and did not ship here.
- [x] Derive the render's field ids via `deriveFieldIds` from the pure model (⛔ never a hand list);
      ⛔ **do not render `member_name`**.
- [x] New i18n namespace, hi + en parity; add **both** files to `microcopy.yaml` `copy_globs`.
- [x] Extend `docs/ux/empty-skeleton-error-inventory.md` — ⛔ no `<TBD>`, ⛔ no fabricated ratification.
- [x] a11y: semantic landmarks, ARIA, keyboard-reachable pagination as **links**, visible focus.

### Task 7 — Cache-policy declaration + reconciliation leg (AC: 5) — ✅ **D3(a) + D4(a) RULED**
- [x] `matrix.ts`: per-surface `cache_policy`; declare it on all 8 surfaces to match today's reality
      (`/500` → `private_no_store`; `/` → the redirect case, stated).
- [x] `gate.ts`: `checkCachePolicyReconciliation` (pure), fail-closed on a rendering surface with no
      `Cache-Control`; wire into `check-pii-scrape.ts`.
- [x] Add the missing headers to `/blog` + `/blog/[postId]`.
- [x] ⚠ Re-verify `turbo.json` `contracts:check-pii-scrape.inputs` still covers **every** path the
      gate reads (**Trap 6**).
- [x] ⛔ README says the gate proves what the **origin emits** — ⛔ no Cloudflare claim.

### Task 8 — Friction-budget: the two triggers (AC: 6, 7) — ✅ **D5(a) RULED**
- [x] `page-weight.mjs` → per-route `routes: { … }`; `friction-budget.yaml` restructured to match.
      ⚠ Say in the comment that this attributes **static client assets** per route, ⛔ not dynamic HTML.
- [x] Re-defer `critical_render_path_ms` with a **new written trigger + reason**.
- [x] `friction-budget.md` — affirm or add the named-payer declaration.
- [x] ⚠ Verify AC-4 **after committing** ([[project_friction_budget_baseline_ratchet]]); ⛔ do not
      ratchet `page_weight_bytes` on a measured **rise**.

### Task 9 — Revert-sanity (AC: 9) — ⭐ **run it, do not reason about it**
- [x] One **independently planted** violation per detection route (list in AC9). ⛔ Never one fixture
      tripping several checks.
- [x] Prove the gate live against a **real** planted file; record exit codes in Completion Notes;
      revert; confirm the tree is clean.

### Task 10 — Records (AC: 3, 6, 7, 8)
- [x] `deferred-work.md`: fragment-mechanism deferral (with trigger + the server-island candidate);
      CR-D0-1.16b disposition; the per-route / critical-render-path dispositions; the `/blog`
      empty-state-inventory gap. ⛔ Use the project's closure language exactly
      ([[feedback_closure_language_precision]]).
- [x] `gate-inventory.md`: the new cache-policy leg; the Epic-11a friction-budget rows.
- [x] Story record + `sprint-status.yaml` — ⛔ flip **only** `development_status[11a-2-…]`;
      `epic-11a` stays `in-progress` (4 stories remain after this one).
- [x] ⛔ **REBASE-merge this multi-commit story, NEVER squash** — the `governance:` commit must stay
      first ([[project_story_automator_ops]]).

---

## Dev Notes

### Files this story touches, and what must be preserved

| File | Current state | What changes | ⛔ Must not break |
|---|---|---|---|
| `apps/public/src/layouts/PublicShell.astro` | Cache-safe chrome; reads no session; emits robots meta from a `noindex` prop; server-roundtrip lang toggle | Possibly nothing | ⛔ Never read a session/cookie here. ⛔ Keep the `noindex` prop shape — `detectIndexingSignal` (`gate.ts:150`) parses it from the **template**, and the frontmatter is stripped first (load-bearing: `404`/`500` discuss "noindex" in prose) |
| `packages/contracts/src/public-pages/matrix.ts` | 459 lines; `.strict()`; cross-field checks reject duplicate routes, a second Tier-1 exception, and an escalation whose `to` ≠ the field's tier | `+ cache_policy` | ⛔ Do not weaken any cross-field check. ⛔ A second Tier-1 `public` exception must keep failing to parse |
| `packages/contracts/src/public-pages/gate.ts` | 282 lines; 3 pure legs | `+ checkCachePolicyReconciliation` | ⛔ Keep the frontmatter strip. ⚠ `astroTemplate()`'s regex truncates early on an embedded line-starting `---` — a **known deferred** defect, ⛔ do not "fix" it reactively here |
| `packages/contracts/src/public-pages/scrape.ts` | 375 lines; `TIER_RANK` imported from `matrix.ts` — exactly **one** copy in the repo | `+ warning` for AC8 | ⛔ Do not add a second tier ordering. ⛔ `getVisibility` stays fail-closed on unknown surface / undeclared field |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | 8 surfaces, 23 fields, 1 escalation | `+ cache_policy`; `renders` flip per D1 | ⛔ **Read its header first.** It is **not a schema**. ⛔ No `school`/`designation`/`block` rows — a test asserts their absence |
| `apps/public/src/lib/surface-fields.ts` | `deriveFieldIds` — bidirectional, throws both ways; camelCase↔snake_case mapped **by hand** | `+ members mapping` if D1(a)/(b) | ⛔ Never add a mechanical case converter — it would invent an id nobody classified |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | 413 lines; the tier-leak leg lives here (ruling D2 of 11a.1); loads the matrix by relative fs path with ⛔ no empty fallback | `+ members`, `+ AC8` | ⛔ Never restore an empty-matrix fallback |
| `turbo.json` | `contracts:check-pii-scrape.inputs` covers the matrix, `apps/public/src/pages/**/*.astro`, `.decision-log.md` | Verify coverage | ⛔ A gate reading outside its inputs passes on stale bytes (**Trap 6**) |
| `apps/public/scripts/page-weight.mjs` | Walks `dist/client/`; emits aggregate | Per-route (D5) | ⛔ Keep measuring `dist/client/`; ⛔ do not claim to measure dynamic HTML |
| `apps/public/src/pages/blog.astro`, `blog/[postId].astro` | ⛔ **No `Cache-Control`** | `+ headers` | ⛔ No behavioural change to what renders (11a.1 already narrowed the read to six explicit columns — ⛔ do not widen it back) |

### Patterns to reuse — ⛔ do not reinvent

- **Page shape:** `terms.astro` is the cleanest model — thin frontmatter, pure `lib/*.ts` render
  module, `withPublicScope`, explicit `t()` namespace, cache headers set on `Astro.response`.
- **Pure-core / impure-orchestration split:** `gate.ts` (pure) + `scripts/check-pii-scrape.ts`
  (impure), itself mirroring `scripts/friction-budget/{lib,check}.ts`. ⛔ Every new leg follows it.
- **Bidirectional reconciliation:** `checkRouteCoverage` and `deriveFieldIds` both fail in **both**
  directions so neither half can move alone. The cache leg should too.
- **Honest scoping:** `scripts/custom-field-governance/README.md`'s *"⚠ What this gate does NOT
  prove — read this first"* is the **template to copy**, not merely a precedent to cite.
- **Data path:** `withPublicScope` (`db.server.ts`) — `BEGIN` → `SET LOCAL ROLE twt_app` →
  `setPariwarScope` → read → `ROLLBACK`. ⛔ Not a superuser bypass; ⛔ `apps/public` owns its own pool.

### Testing

- `apps/public` runs **vitest** (`test: vitest run --passWithNoTests`); `.astro` components are not
  unit-testable — hence the house convention that **all display logic lives in pure `.ts`** and the
  `.astro` file is a thin wrapper. ⚠ That convention is what makes `deriveFieldIds` sound; ⛔ breaking
  it is a gate evasion before it is a style choice.
- `pnpm ci:local` is the merge gate. ⚠ Run the **unit leg and the live-DB leg separately** —
  a `DATABASE_URL`-global combined run double-runs integration specs and pollutes counts
  ([[project_ci_local_double_run_pollution]]); concurrency is pinned at 4
  ([[project_ci_local_concurrency_oversubscription]]).
- ⚠ `git push` runs the full `ci:local` via a pre-push hook — that is the "hang", ⛔ not a failure
  ([[project_friction_budget_baseline_ratchet]]).
- ⚠ **GitHub Actions flips between working and suspended without warning** — re-verify **live** each
  time; ⛔ never infer from the record ([[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes

- ⛔ **No new package.** `<MatrixField>` and the pagination helper live in `apps/public`; the pure
  engine stays in `@twt/contracts`. There is no second consumer ([[feedback_no_premature_package]]).
- ⛔ **No new DB migration is expected.** If D1 forces one, **stop and raise it** — a migration on a
  shell story is a signal the scope boundary moved.
- ⛔ **Never regenerate an applied migration** (42P07) and ⛔ never `DROP SCHEMA`
  ([[project_live_db_test_gotchas]]).
- ⚠ `@twt/contracts` must **not** import `@twt/domain`'s pg-touching namespaces — it would leak `pg`
  into the RN Metro bundle ([[project_contracts_domain_bundle_boundary]]). The local `PiiTierSchema`
  duplication is **deliberate** for this reason and is a recorded deferral.

### Latest technical information

- **Astro `^6.4.8`**, `@astrojs/node ^10.1.4`, `output: 'server'`, `mode: 'standalone'`.
- ⭐ **Astro 6 server islands (`server:defer`)** are directly relevant to D2(c): the island is fetched
  in a **separate GET** with **encrypted props** (`astro create-key` → `ASTRO_KEY`), so the shell
  stays edge-cacheable under ordinary `Cache-Control` while the island renders **server-side**. ⚠ It
  is the one reading under which the epic AC and `architecture.md` agree — ⛔ but it still needs a
  viewer the browser cannot identify, so it is recorded as a **candidate for 11b**, ⛔ not adopted here.
- ⛔ `vite.ssr.noExternal` must keep listing every `@twt/*` package — moving one to `ssr.external`
  breaks the standalone image.

### References

- `_bmad-output/planning-artifacts/epics.md` §Epic 11a, §Story 11a.2, §Story 11a.3 (+ the
  2026-08-19 C1/C2/C3/C9 reconciliation blocks)
- `_bmad-output/planning-artifacts/architecture.md` §"Cross-surface rendering policy" (L495-546) ·
  §2.7 · §2.13.1–2.13.4 (L1843-1945) · §"Member-Responsive Web" (L486-494)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` FR-74 (L1030-1066) · FR-75
  (L1067-1075) · FR-91 (L1167-1171) · FR-92 · FR-93
- `_bmad-output/implementation-artifacts/11a-1-4-tier-visibility-matrix-codified-per-surface-public-vs-private-replacement.md`
  (Traps 1-7, rulings D1-D6, AC11)
- `_bmad-output/implementation-artifacts/deferred-work.md` L1360, L1368-1373, L2729, L5514+
- `_bmad-output/implementation-artifacts/gate-inventory.md` rows `friction-budget`, `microcopy`,
  `pii-scrape`
- `apps/public/COMPOSITION-CONTRACT.md` · `docs/ux/empty-skeleton-error-inventory.md` ·
  `docs/adr/ADR-0013-pii-scrape-ci-gate.md`
- `packages/contracts/src/public-pages/{matrix,scrape,gate}.ts` ·
  `packages/contracts/public-pages/public-vs-private-matrix.yaml` ·
  `packages/contracts/scripts/check-pii-scrape.ts`
- `apps/api/src/modules/auth/shared/member-session-guard.ts` ·
  `apps/api/tests/integration/forced-pagination.spec.ts`
- `friction-budget.yaml` · `friction-budget.md` · `microcopy.yaml` · `turbo.json`

---

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Code, `bmad-dev-story`)

### Debug Log References

**Baseline (Task 0)** — `HEAD == origin/main == 66ae30d` after `git fetch origin`; branched
`story/11a-2-public-shell-directory` off `main`. `pnpm pii:check` **green before any edit**:
8 surfaces (7 rendering, 1 declared-not-yet-built), 23 tier-classified fields, 1 escalation,
7 shipped pages. ⇒ any later failure is provably this story's.

**Live gate proofs (AC9) — each planted INDEPENDENTLY, each run for real, each reverted.**
Every run produced **exactly ONE finding**, which is the property that matters: ⛔ no fixture
tripped several checks.

| # | Planted violation | Result |
|---|---|---|
| 1 | `renders: false` on `member-directory` while `members.astro` ships | **exit 1** — `[route_coverage] STALE renders:false` |
| 2 | `/members` `Cache-Control` → `no-store` (declaration says `edge_cacheable`) | **exit 1** — `[cache_policy_reconciliation] CACHE POLICY CONFLICT` |
| 3 | `/members` `Cache-Control` line deleted entirely | **exit 1** — `[cache_policy_reconciliation] NO CACHE-CONTROL` (fail-closed) |
| 4 | `parsePageParams()` call removed from `members.astro` | **exit 1** — `[pagination_binding] UNBOUND PAGINATION` |
| 5 | `?raw` import re-pointed at a drifted matrix copy | **1 test failed** — byte-identity control; 10 others still green |
| 6 | `outputForVerdict`'s `visible` guard removed | **5 tests failed** — every `<MatrixField>` omission control |
| 7 | AC8 engine warning condition disabled (`if (false)`) | **2 tests failed** — the CR-D0-1.16b discharge |

Tree confirmed clean after every revert (`git status`, no stray fixtures under `src/lib/`).

**Trap 3 verified LIVE, ⛔ not assumed.** `matrix.server.ts` is tree-shaken out of the build while
nothing imports `<MatrixField>`, so a temporary import was added, `pnpm --filter @twt/public build`
run, and the matrix bytes confirmed present in `dist/server/chunks/members_*.mjs` (`grep` on
`per_pariwar_attribute_rule` and `THIS IS NOT A SCHEMA`). Probe reverted. ⇒ the `?raw` inlining
mechanism is proven for Story 11a.3, ⛔ not merely reasoned about.

**Trap 6 verified.** The gate reads exactly three paths (`matrixPath`, `apps/public/src/pages/**`,
`.decision-log.md`) — enumerated from source. Both new legs consume the SAME page map; ⛔ no new
scanned path. All three are already in `turbo.json` `contracts:check-pii-scrape.inputs`. **No
`turbo.json` change is owed** — verified rather than edited defensively.

**Suites.** `@twt/contracts` 1012 → **1030** green. `@twt/public` 55 → **119** green.
`env -u DATABASE_URL pnpm turbo run test --concurrency=4` → **37/37 tasks**.
`pnpm ci:local` → **31/31 jobs green**. `astro check` → **0 errors, 0 warnings, 0 hints**;
`eslint` clean on both packages.

⚠ **Live-DB leg — 4 pre-existing flakes, confirmed NOT this story's.** Under the 8-package
oversubscribed run, `@twt/api` reported 2–4 E2E failures (nominee-declare, responder-console,
reports, news-blog), all at ~33s = timeout, and a **different subset each run** — the recorded
signature of [[project_ci_local_concurrency_oversubscription]]. Innocence confirmed by running them
in isolation (**392ms / 635ms / 721ms / 826ms, all pass**) and then the full `@twt/api` suite alone:
**1018 passed, 1 skipped, 118/118 files**. ⛔ None touches any path this story changed; the
closest (`news-blog.spec`) exercises the admin API, not `apps/public`.

### Completion Notes List

**⭐ Trap 1 resolved as ruled: the architecture was built, the epic AC was NOT.** The AC asks for
`<AuthenticatedFragment>` slots rendering *server-side when authenticated*; `architecture.md:504-517`
commits the opposite property. Verified LIVE at `66ae30d` that the AC is not merely conflicting but
**unbuildable**: `member-session-guard.ts:1-8` reads the JWT from the **Authorization header**
(`exp ≤ 15 min`), `apps/` holds `admin · api · jobs · mobile · public` with ⛔ no `apps/member-web`
⇒ ⛔ **no browser surface holds a member token**, so there is no `authenticated_member` viewer on
`apps/public` by any mechanism. Shipped D2(a): a public-fallback-only slot that reads no session,
no cookie, no header and takes no `isAuthenticated` prop, with the mechanism fork deferred (Astro 6
`server:defer` recorded as the leading 11b candidate). ⛔ `apps/api/src/modules/public-pages/` was
**not** created.

**AC-by-AC.**
- **AC1** — `MatrixField.astro` + `matrix.server.ts`. Every decision delegates to `getVisibility()`
  (this story is its **first consumer**; ⛔ no `TIER_RANK` import, ⛔ no second ceiling copy). A
  not-visible verdict renders **nothing** — `matrixFieldOutput` returns `null`, asserted directly
  rather than asserted-about, and the two omission kinds are proven **identical in output,
  distinguishable only in the verdict** (the anti-enumeration property). Matrix loaded via Vite
  `?raw`, parsed once, ⛔ loud throw on empty, byte-identity asserted against the committed file.
  ⚠ **The above-ceiling control had to be PLANTED**: every field the committed matrix declares today
  is tier `public`, so asking the real matrix would have been vacuous — `outputForVerdict` was split
  out precisely so the control could feed a planted verdict through the component's own code path.
- **AC2** — `pagination.ts`: rejects `?page=all`/`?limit=all`/over-cap/negative/zero/non-integer,
  ⛔ never clamps, cap re-exported from the FR-91 number already committed in `_common/pagination.ts`
  (⛔ not a second "FR-91 cap"). ⭐ Made **structural**, not conventional: the matrix gained
  `paginated` and the gate gained `pagination_binding`. ⛔ No bulk-export affordance.
- **AC3** — public-fallback-only slot; `COMPOSITION-CONTRACT.md` rewritten to state **zero live
  fragments** with FR-77 named as the v1 entry; `js_bundle_bytes` stays **0**.
  ⚠ The cache-safety property is proven by a **comment-stripped source scan** for auth reads — which
  is *stronger* than rendering twice with different cookies (it proves the capability is absent for
  *any* request, not that two tried requests matched). ⭐ The scan caught itself on first run,
  flagging the component's own ⛔ DO-NOT prose — the mirror of the defect `astroTemplate()` exists to
  prevent; fixed by stripping comments, ⛔ not by softening the documentation.
- **AC4** — `/members` ships, `renders` flipped **in the same commit**, `noindex` passed, and the
  surface's section comment + `description` **rewritten** (they said 11a.3 would ship it).
  `pnpm pii:check` green. ⛔ `member_name` not rendered; field ids derived via `deriveFieldIds`.
- **AC5** — `cache_policy` declared on all 8 surfaces (D4: explicit, ⛔ never inferred — inference is
  wrong on `/500` and `/`), reconciled fail-closed against committed source; `/blog` +
  `/blog/[postId]` gained the headers they should always have had. ⛔ No Cloudflare claim anywhere.
- **AC6** — per-route page-weight **discharged**; `critical_render_path_ms` **re-deferred with a new
  written trigger + reason** (⛔ neither silently skipped).
- **AC7** — friction-budget disposition (⛔ **no new row**, and the FR-91 refusal is recorded as
  *considered and rejected* — it is an error state for a malformed request, not friction a member
  pays); `members` i18n namespace with hi+en parity; both locale files added to `copy_globs`
  (16 copy files scanned, was 14); inventory extended with ⛔ no `<TBD>` cells and ⛔ no fabricated
  ratification; the `/blog` inventory gap **recorded and routed**.
- **AC8** — CR-D0-1.16b **discharged by edit**, and the discharge is provable: disabling the warning
  turns two tests red.
- **AC9/AC10** — see the Debug Log table; pagination controls are real `<a>` links with
  `aria-label`, visible `:focus-visible`, `@twt/tokens` only (⛔ no Tailwind introduced).

**⚠ TWO THINGS RAISED, ⛔ NOT SILENTLY ABSORBED.**

1. ⭐ **`<MatrixField>` has NO call site on the shipped page, and cannot have one.** Ruling D1(a)'s
   stated rationale was that shipping `/members` *"gives `<MatrixField>` and the pagination helper a
   **real call site**"*. The pagination helper does. `<MatrixField>` does not: AC4 forbids rendering
   member data, and the surface's only two declared fields are `member_name` (⛔ forbidden here) and
   `district` (the D1(b) render explicitly **not** chosen). ⇒ **D1(a)'s rationale and AC4 are
   jointly unsatisfiable on this point.** ⛔ No decorative call site was fabricated — a primitive
   "consumed" for appearance is worse than one honestly unconsumed. The component ships fully built
   and fully tested, and the Trap-3 runtime mechanism was proven live so 11a.3 inherits no risk.
   **This is a finding for review, not a deviation**: nothing was built differently from the ruling.
2. ⚠ **The `member-directory` tier-leak leg is ARMED BUT EMPTY**, exactly as D1(a) warned. AC4
   required this be declared **loudly**, so it is stated in six places — the matrix `description`,
   the page header, the render model, the live-render spec (which **asserts the field set IS
   empty**), `deferred-work.md`, and `gate-inventory.md`. ⛔ A green `member-directory` check today
   means "renders no classified field", **not** "the directory is policed".

**⚠ Carried OPEN, ⛔ not closed:** Decision `2026-08-20-140` cl.7 — the Niyamavali still records no
directory publication, and D1(a) ships the page anyway. Ruled knowingly (`2026-08-20-141` cl.8).

### File List

**New — `apps/public`**
- `apps/public/src/components/MatrixField.astro` — the FR-74 tiered-field renderer (AC1)
- `apps/public/src/components/AuthenticatedFragment.astro` — public-fallback-only slot (AC3)
- `apps/public/src/lib/matrix.server.ts` — `?raw` matrix load, parse-once, `matrixFieldOutput` (AC1)
- `apps/public/src/lib/pagination.ts` — FR-91 parse/reject + cap constant + `pageHref` (AC2)
- `apps/public/src/lib/members-render.ts` — the pure `/members` render module (AC4)
- `apps/public/src/pages/members.astro` — the `/members` route (AC4, AC10)
- `apps/public/tests/matrix.server.test.ts` — 11 tests incl. byte-identity + omission controls
- `apps/public/tests/pagination.test.ts` — 15 tests incl. every FR-91 rejection route
- `apps/public/tests/members-render.test.ts` — 13 tests incl. the empty-field-set assertion
- `apps/public/tests/authenticated-fragment.test.ts` — 16 tests (comment-stripped auth-read scan)

**New — i18n**
- `packages/i18n/locales/en/members.json`
- `packages/i18n/locales/hi/members.json`

**Modified — `packages/contracts`**
- `packages/contracts/src/public-pages/matrix.ts` — `CachePolicySchema`; surface `cache_policy` (required) + `paginated`
- `packages/contracts/src/public-pages/gate.ts` — `detectCacheSignal`, `checkCachePolicyReconciliation`, `checkPaginationBinding`, widened `GateFinding.leg`
- `packages/contracts/src/public-pages/scrape.ts` — CR-D0-1.16b `UNVERIFIED SNAPSHOT` warning (AC8)
- `packages/contracts/src/public-pages/README.md` — gaps 4 + 5 (⛔ no-Cloudflare-claim; binding≠behaviour; ⛔ 1.14 does not cover this surface) + two leg rows
- `packages/contracts/scripts/check-pii-scrape.ts` — legs 3 + 4 wired and reported
- `packages/contracts/public-pages/public-vs-private-matrix.yaml` — `cache_policy` × 8; `paginated` on `member-directory`; `renders: false → true`; surface rationale rewritten; schema doc-block
- `packages/contracts/tests/public-pages-gate.test.ts` — +18 tests (cache + pagination legs, planted controls)
- `packages/contracts/tests/public-pages.test.ts` — superseded `renders` assertion updated; new explicit-`cache_policy` test; fixtures
- `packages/contracts/tests/public-pages-matrix-schema.test.ts` — fixtures
- `packages/contracts/tests/public-pages-get-visibility.test.ts` — fixture

**Modified — `apps/public`**
- `apps/public/src/env.d.ts` — `*.yaml?raw` module declaration
- `apps/public/src/lib/surface-fields.ts` — `MembersRenderModel`, `MEMBERS_FIELD_IDS`, `membersSurfaceFieldIds`
- `apps/public/src/pages/blog.astro` — `Cache-Control` + `Vary` (AC5)
- `apps/public/src/pages/blog/[postId].astro` — `Cache-Control` + `Vary` (AC5)
- `apps/public/scripts/page-weight.mjs` — per-route `routes: {…}` attribution (AC6, D5(a))
- `apps/public/COMPOSITION-CONTRACT.md` — honest registry, Trap-1 finding, deferral table, cache column
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts` — AC8 block + `/members` block (+11 tests)

**Modified — governance / repo root**
- `.decision-log.md` — Decision `2026-08-20-141` (committed FIRST, alone)
- `friction-budget.yaml` — per-route note; `critical_render_path_ms` re-deferral + `previous_trigger`; baseline rationale
- `friction-budget.md` — Story 11a.2 disposition (⛔ no new row)
- `microcopy.yaml` — `members` locale files added to `copy_globs`
- `docs/ux/empty-skeleton-error-inventory.md` — `/members` section + the recorded `/blog` gap + attestation
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 11a.2 section + 4 origin entries annotated
- `_bmad-output/implementation-artifacts/gate-inventory.md` — pii-scrape + friction-budget rows
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `11a-2-…` → `review`
- `_bmad-output/implementation-artifacts/11a-2-…-renderers.md` — this record

⛔ **Deliberately NOT created:** `apps/api/src/modules/public-pages/` (AC3 — a module with no route
is a claim that a boundary exists). ⛔ **No migration** — none was needed, as Project Structure Notes
predicted. ⛔ **No `turbo.json` change** — Trap 6 verified: no new scanned path.

## Change Log

| Date | Change |
|---|---|
| 2026-08-20 | `governance(11a.2)`: Decision `2026-08-20-141` — D1–D5 ruled; ⭐ the epic AC contradicts `architecture.md` **and is unbuildable**; ⛔ two verified pre-existing gaps (FR-91 unenforced on `apps/public`; `/blog` emits no `Cache-Control`); ⚠ `2026-08-20-140` cl.7 carried OPEN. Committed FIRST and ALONE, ⛔ before any code. |
| 2026-08-20 | `feat(11a.2)`: `<MatrixField>` + `?raw` runtime matrix (AC1) · FR-91 pagination helper + `pagination_binding` leg (AC2) · `<AuthenticatedFragment>` public-fallback slot (AC3) · `/members` + `renders` flip in the same commit (AC4) · per-surface `cache_policy` + fail-closed reconciliation leg + `/blog` headers (AC5) · CR-D0-1.16b discharged (AC8). |
| 2026-08-20 | `docs(11a.2)`: per-route page-weight discharged + `critical_render_path_ms` re-deferred with a new written trigger (AC6) · friction-budget disposition, i18n + microcopy globs, empty-state inventory + the recorded `/blog` gap (AC7) · deferred-work + gate-inventory records. |
| 2026-08-20 | `chore(11a.2)`: story record + sprint-status → review. |
