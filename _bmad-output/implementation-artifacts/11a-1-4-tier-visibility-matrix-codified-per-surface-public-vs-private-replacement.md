---
baseline_commit: bf802b709d8e54c40572950cef0d5db02f7cc19c
---

# Story 11a.1: 4-Tier Visibility Matrix Codified per Surface — Public-vs-Private Replacement `[GOVERNANCE]`

Status: ready-for-dev

> ✅ **ALL SIX DECISIONS (D1–D6) RULED BY BIGDEV, 2026-08-20 — each as recommended. Nothing here is
> open.** They are recorded in §Decisions. ⛔ The dev agent must **not** re-open or re-interpret a
> ruling; a ruling is superseded, never re-read ([[feedback_supersede_never_reinterpret]]).
> ⚠ **This ruling has no independent record yet** — as of authoring, no `.decision-log.md` entry for
> 2026-08-20 exists; this story file and the sprint-status ledger comment are the only trace, both
> written in the same authoring pass. Task 1's decision-log commit is what makes it durable
> governance-of-record — treat it as a **non-optional precondition**, not a formality
> ([[feedback_record_unattested_no_backfill]]).
>
> ✅ **BASELINE IS CLEAN AND ON `main`.** `HEAD == origin/main == bf802b7` (verified by
> `git fetch origin` at authoring time). ⛔ Unlike Story 10.29, there is no unmerged mint commit —
> branch off `main` ([[feedback_git_fetch_before_remote_reasoning]]: re-`fetch` before you branch).
>
> ⭐ **THE GATE THAT UNBLOCKED THIS STORY IS LIFTED.** Decision `2026-08-19-132` closed AI-10-4;
> G1 + G5 (`architecture.md` §2.13) + G6 (`epics.md` C1–C9) landed; ADR-0037/0038/0039 are all
> `ratified` (`2026-08-19-138`, `-139`). The ledger records: *"ALL NINE ADR/GOVERNANCE ARTIFACTS OF
> THIS CORRECT-COURSE ARE NOW RATIFIED OR DISCHARGED. What remains is BUILD."* The 2026-08-18
> *"do NOT author 11a.1"* ruling is **discharged**, ⛔ not overridden.
>
> ⛔ **THIS STORY IS ON THE LAUNCH CRITICAL PATH AND IT IS CIRCULAR.** `2026-08-19-136` clause 4
> makes the PII-scrape **tier-leak leg** launch-blocking: it must be operative **before the Member
> Directory ships** (11a.3). The matrix that arms that guard is populated by **this story**, and the
> guard exists to police **this epic's** surface. ⭐ *"Sequence it deliberately; do not discover it."*
>
> **Depends on (all `done`):** 1.16b (the gate + engine + scaffold this story populates) · 2.5 (the
> Astro shell + 5 public routes) · 2.6 (`/terms`) · 10.5 (`/blog`, `/blog/[postId]`) · 1.14
> (`noindex` / forced pagination) · 1.8 (RBAC) · 1.10 (audit) · 1.17 (design system).

## Story

As Solo Builder authoring the foundational visibility-classification primitive,
I want the 4-tier visibility matrix **populated against the public surfaces that actually ship today**,
with the tier-leak CI leg **armed and proven to have teeth**, and the per-Pariwar public-name
presentation policy made **configurable rather than hard-coded**,
so that every visibility decision in Epic 11 and downstream reads from a single canonical
classification — and so the control that would catch a Tier-1 leak onto a public surface exists
**before** the Member Directory publishes members' full legal names.

---

## 🎯 The gap, stated exactly — and it is verified, not inherited

Run the gate today (`pnpm pii:check`, verified at authoring time):

```
▸ Matrix: version 1, 0 surface(s)
  · no surfaces declared — Epic 11a (Story 11a.1) populates; all checks no-op

▸ Render snapshots: 0
  · no render snapshots available — every surface scrape is a no-op (AC-3)
    (apps/public is a tsc stub until Story 2.5; apps/api public-pages empty until Epic 11b)

✓ pii-scrape gate passed
```

**Three separate defects are visible in that output:**

1. **`0 surface(s)`** — `packages/contracts/public-pages/public-vs-private-matrix.yaml` is still the
   1.16b scaffold (`surfaces: []`). **Seven public routes have shipped** since
   (`/`, `/niyamavali`, `/terms`, `/blog`, `/blog/[postId]`, `/404`, `/500`) and **none is declared**.
2. **`Render snapshots: 0`** — `loadSnapshots()` is literally `return []`
   (`packages/contracts/scripts/check-pii-scrape.ts:39-41`). ⛔ The tier-leak leg is **vacuous**, and
   the green check actively certifies an invariant nobody is enforcing.
3. **The gate's own message is STALE and false** — *"apps/public is a tsc stub until Story 2.5"*.
   `apps/public` is a real Astro app with 7 pages. So is the README's claim that the leak rules
   *"acquire teeth — **without a code change to the gate**"*: `loadSnapshots()` returning `[]` is
   exactly a code change the README promises is unnecessary.

⚠ **The naked-PII leg is genuinely alive and is NOT the problem.** It runs in
`apps/public/tests/integration/public-pages/scrape-test.spec.ts` against real Niyamavali + T&C render
HTML and carries a **negative control** that plants `9876543210 · ramesh@example.org` and asserts the
gate fails. ⛔ Do not "fix" the naked-PII leg; it works. **The tier-leak leg is the vacuous one** —
that spec passes only `html` to `evaluateSnapshot`, never `fields`, and the tier-leak rules only run
when `fields` is present (`scrape.ts:evaluateSnapshot`).

---

## ⛔ THE SEVEN TRAPS — read these before anything else

### Trap 1 — ⭐ THE MATRIX IS NOT A SCHEMA. Populating it with a fixed field list re-commits SD-1.

`2026-08-19-132` **R7** is governing: *"the attribute set is extensible and Pariwar-selected, NOT a
fixed global list. ⛔ There is no canonical directory schema."* The Story 11a.3 table (`epics.md`
§Story 11a.3) is ⛔ **the origin of Significant Discovery SD-1** — three of its member-attribute rows
had **no substrate at all** and no story had ever owned them, unnoticed for **seven epics**.

⇒ This story codifies **what a tier MEANS and what an escalation REQUIRES**. It declares tiers for
**platform-common** fields (`district`, derived from `member_postings`) and for the **surfaces** that
render. ⛔ It must **not** enumerate a global member-attribute set. Per-Pariwar attributes carry a
**rule** in the matrix, not a row.

### Trap 2 — ⛔ THE CI GATE MUST BE HONESTLY SCOPED, AND MUST SAY SO IN PLAIN WORDS.

Per-Pariwar attribute definitions are **database rows** (`pariwar_custom_field_definitions`). ⛔ CI
**cannot** scan them, and ⛔ **must not be widened to read a tenant database** — *"a CI gate that
needed a live tenant database would not be a CI gate"*
(`scripts/custom-field-governance/README.md`, the 10.12 fence). That README's *"⚠ What this gate does
NOT prove — read this first"* section is the **template to copy**, not merely a precedent to cite.

### Trap 3 — ⛔ THE `public` TIER CARRIES ONE RULED TIER-1 EXCEPTION. It is not a relaxation.

`2026-08-19-135` cl.7(c) + `-136`, mirrored at `architecture.md` §2.7: **member name may be decrypted
from Tier-1 and rendered publicly on the Member Directory**, using
`member_kyc_profiles.name_ciphertext`. ⛔ **Exactly one field on exactly one surface class.**

The matrix must represent this as an **explicit, attributed exception carrying its decision ref** —
⛔ never as a general relaxation of the `authenticated_member`-not-on-public rule, and ⛔ **never by
reclassifying the field**. No PII tier changes: member name stays Tier-1 ciphertext + Tier-2 blind
index. A matrix in which the exception is indistinguishable from an ordinary `public` field has
failed this trap.

### Trap 4 — ⛔ `splitFirstNameLastInitial()` IS NOT DEAD CODE, AND FULL-NAME MUST NOT BE HARD-CODED.

`2026-08-19-136` cl.2: `splitFirstNameLastInitial()` (`packages/domain/src/kyc/name.ts:47`) **becomes
the implementation of the `shielded_name` mode** — ⛔ not a helper the directory declines to use.
cl.1: *"The implementation must therefore not hard-code full-name publication as permanent"*, and
⭐ **that is a TESTABLE REQUIREMENT, not a sentiment** — *"a build in which the public name form
cannot be changed without a code change **fails this clause**."* `136`'s own open follow-ups record
the owed artifact: *"A test asserting the public name form is CONFIGURABLE — ⛔ should be proven,
not asserted."*

⚠ It moves in **both directions** — ⛔ not a one-way ratchet toward privacy.

### Trap 5 — ⛔ POPULATING THE MATRIX BREAKS A COMMITTED TEST. Do not "fix" it by staying empty.

`packages/contracts/tests/public-pages.test.ts:324-334` asserts:

```ts
expect(matrix?.surfaces).toHaveLength(0);
```

That assertion encoded 1.16b's self-green scaffold posture. **This story is the event that retires
it.** Rewrite it to assert the populated invariants (every shipped route declared; every field
tier-classified; the escalation count matches). ⛔ Reverting the matrix to keep the old assertion
green is the failure mode.

### Trap 6 — ⚠ TURBO CACHING WILL LIE TO YOU IF THE GATE READS FILES OUTSIDE ITS `inputs`.

`turbo.json:48-56` declares `contracts:check-pii-scrape` `inputs` as `src/**/*.ts`,
`scripts/**/*.ts`, `package.json`, `pnpm-lock.yaml`, `public-vs-private-matrix.yaml`.
⛔ `apps/public/src/pages/**` is **not** in that list. If the gate is extended to scan the `.astro`
pages (route coverage + `noindex` reconciliation), a page change will hit a **stale cache** and the
gate will pass on unscanned content — the exact `FULL TURBO` replay observed at authoring time. Add
the scanned paths to `inputs` **in the same commit** as the scan.

### Trap 7 — ⛔ THE PR TEMPLATE HAS A HARD SIX-PROMPT BUDGET. The AC's new field cannot simply be added.

The AC asks for a *"why is this visibility increase justified?"* PR field. `.github/pull_request_template.md`
is capped: *"adding past these six requires **retiring one or merging categories**"* (architecture
§PR-template review budget). The existing **Security-impact note** already cites *"no PII renders
above its tier in the FR-74 Public-vs-Private matrix"* — ⇒ **merge into it**, ⛔ do not add a seventh.

⚠ **And the mechanism cannot be GitHub review.** `.github/CODEOWNERS` is a single solo-builder handle
(`* @ulanzi1`); the trustees ratify in `.decision-log.md`, not on GitHub. *"Multiple trustee
sign-offs"* is **unmechanizable as a branch-protection rule** in this repo. The repo's real
precedent is `scripts/governance-boundary/`: **trustee attestation in `.decision-log.md` + an entry
carrying `{rationale, decision}` + a `count` bump in the SAME commit**, cross-checked by the gate in
both directions so neither half can move alone.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| ⛔ Not in scope | Owner |
|---|---|
| The `/members` route, pagination, `<MatrixField>` renderer, authenticated-fragment slots | **11a.2** |
| The Member Directory **render**, anti-enumeration safeguards, `directory-abuse-rules.yaml` | **11a.3** |
| Phone/email **obfuscation** patterns | **11a.4** |
| `<NoticeboardStrip>` / `<PinnedNotice>` | **11a.5 / 11a.6** |
| `block` / `zone` / `division` attributes | ⛔ **BLOCKED** — `block` on `2026-08-19-137` cl.7(a)+(b) (member-aware publish path + member choice surface, ⛔ neither exists); `zone`/`division` on ADR-0039 substrate. ⛔ D5 of `2026-08-13-103` is **NOT superseded** — `resolveMemberGeoNode().block` stays permanently `{available:false}` |
| `school` / `designation` as **RBAC** dimensions | ⛔ **PERMANENTLY INELIGIBLE** (`school`: `-133` cl.1; `designation`: `-132` cl.3 / `-133` cl.3). ⛔ Not a deferral — the question is *not available* |
| An **admin UI** for the presentation policy | Out — the change is a **governed act**, ⛔ not a casual Pariwar-Admin toggle (`-136` cl.3) |
| Widening any gate to read a **tenant database** | ⛔ **FORBIDDEN** — Trap 2 |
| Amending **In Memoriam / Sahyog Vivran** name form | ⛔ **FORBIDDEN** — the full-name ruling deliberately does **NOT** reach 11b.6 / 11b.1; they keep first-name + last-initial and are **consent-governed** in a way the directory is not (`epics.md` C5). ⛔ Changing it requires its own Panel ruling |
| Changing any **PII tier** | ⛔ **FORBIDDEN** (`-136` cl.6) |
| **Pre-declaring Epic 11b surfaces** (Sahyog Drive, Sahyog Vivran, In Memoriam) | ⛔ **Deliberately NOT declared.** The epic AC asks for comprehensiveness *"across all v1 surfaces"*, but those surfaces do not render and their field sets do not exist — declaring them means **inventing** field lists, which is **Trap 1** by another route. ⭐ AC1's bidirectional route-coverage leg is what makes the omission safe: when 11b ships a route, the gate **fails** until it is declared. That is a stronger guarantee than a guessed entry, and it is the mechanism, not an excuse |

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**Does this story introduce or change a predicate gating a member's access to a benefit?**
⛔ **No.** The matrix gates **what a viewer may see**, never what a member may *receive*. No
`is_valid` / `is_assignable` / eligibility / pool-assignment predicate is read, written, or
conjoined anywhere in this story. Directory attributes are **display-only by default, enforced by
signature** (`architecture.md` §2.13.2) — ⛔ a diff in which a matrix value reaches an eligibility
path violates that section.

**However, this story does change what the public sees about a member, so the sentence is owed anyway:**

> **In the member's terms:** *"Your full legal name — the one on your KYC record — is shown on the
> public member directory to anyone on the internet who visits it, with no login. Your Pariwar can
> later switch that to 'Ramesh K.' without your KYC record changing, and can switch it back."*

**Checked against the Niyamavali — and the result is a finding, not a confirmation.**
✅ Verified by reading `packages/domain/seed/niyamavali-v1-clauses.sql`: all 23 v1 clause ids
(`niy.contribution-discipline.*`, `niy.special-death.*`, `niy.ninety-percent-rule.*`,
`niy.moderation.dwell`, `niy.lock-in.policy`, `niy.restoration-discipline.policy`,
`niy.retirement-coverage.r12`, `niy.concealment.r14`, `niy.medical.ima-list`). ⛔ **Not one clause
governs directory publication or name visibility.**

⇒ **The authority for publishing members' full legal names is the Trustee Panel (`-135`/`-136`),
and it has NOT been reflected into the member-facing rulebook.** A member reading the Niyamavali
today cannot learn that their full legal name will be published on an unauthenticated page.
⚠ Recorded as an **open finding for the Panel**, ⛔ not fixed here — amending the Niyamavali is
Story 2.4's workflow and needs its own ruling ([[feedback_supersede_never_reinterpret]]). It
compounds `-136` cl.5's already-recorded DPDPA exposure (*"legal counsel not engaged"*).

---

## Acceptance Criteria

### AC1 — Every shipped public route is declared in the matrix, and an undeclared route FAILS CI

**Given** seven public routes ship today under `apps/public/src/pages/`
**When** the matrix is populated
**Then** each has a surface entry with `id`, `route`, `search_indexing_policy`, and a tier-classified
`fields` list: `/` (redirect), `/niyamavali`, `/terms`, `/blog`, `/blog/[postId]`, `/404`, `/500`
**And** a CI leg asserts **route ⊇ matrix coverage in both directions** — a new `.astro` page with no
matrix surface **fails the gate**, and a matrix surface naming a route that does not exist **also
fails** (fail-closed, mirroring `governance-boundary`'s registry ≡ allowlist bidirectional check)
**And** ⛔ the scanned `.astro` paths are added to `turbo.json` `contracts:check-pii-scrape.inputs`
in the same commit (**Trap 6**).

### AC2 — The tier-leak leg is ARMED against real renders and PROVEN to have teeth

**Given** the leg is currently vacuous — `loadSnapshots()` returns `[]` and no snapshot carries `fields`
**When** this story lands
**Then** at least the `niyamavali` and `terms` surfaces feed `evaluateSnapshot` a snapshot carrying
**both** `html` **and** `fields`, where `fields` is **derived from the render model actually passed to
the template** — ⛔ never a hand-maintained list restating it (**D3**)
**And** the `blog` + `blog-post` surfaces are covered, which requires extracting a pure render model
for them (they currently render inline from a full `select()` row — see AC3)
**And** a **negative control** proves teeth: planting an `operator_restricted` field id into a
`public` snapshot's `fields` fails with a named surface + field, and planting an **undeclared** field
id fails as `unclassified` (fail-closed)
**And** ⛔ **no gate anywhere reads a tenant database** (**Trap 2**).

### AC3 — The blog surfaces stop over-fetching, and the leak they risk is closed at the source

**Given** `listPublishedPublicPosts` / `getPublishedPublicPost` (`packages/domain/src/news-blog/read.ts:82,103`)
issue a bare `db.select()` — returning **every** column, including `author_actor_id`,
`reviewer_actor_id`, `tone_signoff_content_hash`, `tone_signoff_reviewed_at`, `channels`,
`audience_scope_value`
**And** `apps/public/src/pages/blog.astro:6` claims *"`listPublishedPublicPosts` returns only the
member-facing fields"* — ⛔ **which is false**
**When** the blog surfaces are brought under the matrix
**Then** a pure render model is extracted (mirroring `tc-render.ts` / `niyamavali-render.ts`) exposing
only the rendered fields, the `.astro` frontmatter consumes it, and the false comment is corrected
**And** the render model is the field-id source for AC2's snapshot
**And** ⛔ no behavioural change to what renders — this narrows the **model**, not the page.

### AC4 — The ruled Tier-1 public-name exception is represented EXPLICITLY and carries its decision ref

**Given** `2026-08-19-135` cl.7(c) + `-136`, `architecture.md` §2.7
**When** the `member-directory` surface's name field is declared
**Then** the schema carries a dedicated, **attributed** exception construct — minimally
`{ pii_tier: 1, decision: '2026-08-19-136', rationale: <text>, scope: 'this surface only' }` — so the
exception is machine-readable and **cannot be confused with an ordinary `public` field**
**And** the matrix parser **rejects** a Tier-1 field declared `public` **without** such an exception
block (fail-closed)
**And** ⛔ the field's PII tier is **not** changed and ⛔ the general tier rule is **not** relaxed
**And** a test asserts a *second* Tier-1 field declared `public` on **any** surface fails to parse —
proving the exception is scoped to one field on one surface class, ⛔ not a general door.

### AC5 — The public-name presentation policy is CONFIGURABLE, and a test PROVES it

**Given** `2026-08-19-136` cl.1–3 + `architecture.md` §2.13.3, and `136`'s owed follow-up
**When** the presentation policy ships
**Then** a per-Pariwar control selects the mode: `full_name` (⭐ **the launch posture — the default**)
| `shielded_name`, with a **pure resolver** mapping mode + stored KYC name → rendered name, where
`shielded_name` delegates to the **existing** `splitFirstNameLastInitial()` (⛔ do not reimplement)
**And** ⭐ **a test flips the mode and asserts the rendered form changes with NO code change** —
this is `136` cl.1's *"must not hard-code"* discharged by proof
**And** a test asserts the mode moves in **both** directions (⛔ not a one-way ratchet, cl.3)
**And** changing it is a **governed act**: the write path requires an explicit permission key +
audit line; ⛔ **no self-serve Pariwar-Admin toggle UI ships** (scope boundary)
**And** ⛔ the stored KYC/legal name is **never** written by this path, and ⛔ no second identity
system is created (cl.2)
**And** the matrix **references** the policy — ⛔ it does not duplicate it (`epics.md` C2, §2.13.3).

### AC6 — Per-Pariwar attributes carry a RULE in the matrix, never a row — and the gate says what it cannot prove

**Given** `2026-08-19-132` R7 + `-133` (**Trap 1**, **Trap 2**)
**When** the matrix declares per-Pariwar directory attributes
**Then** it declares the **rule** — the tier a Pariwar-selected attribute defaults to, the ceiling it
may never exceed, and that its concrete tier declaration is **registry data** — ⛔ **not** an
enumeration of `school` / `designation` / `block` as global fields
**And** the three-layer authority model is stated where a reader will hit it: **CREATE** (Super Admin /
Trustee only) → **ENABLE** (per-Pariwar scope, governed authority) → **GRANT** (Trustee, over a named
node), ⛔ **and no layer implies the next** (§2.13.2)
**And** the README carries a *"⚠ What this gate does NOT prove — read this first"* section in the
10.12 fence's own words: **definitions are database rows; the gate cannot read them and does not
pretend to**; it names the layers where the runtime prohibition actually lives.

### AC7 — `search_indexing_policy` is reconciled against the real server-side directives, and conflicts fail CI

**Given** `PublicShell.astro:60` emits `<meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'}>`
and `apps/api` stamps `X-Robots-Tag: noindex, nofollow` on **every** response
(`apps/api/src/plugins/security-headers/index.ts:61-64`, using the `X_ROBOTS_TAG_VALUE` constant
defined at `:30`)
**When** the gate runs
**Then** it reconciles each surface's `search_indexing_policy` against the `noindex` prop the page
actually passes — provable from **committed source** — and a conflict **fails CI**
**And** the declared policies match today's reality: `/niyamavali` + `/terms` → `index`; `/404` +
`/500` → `noindex`; `/blog` + `/blog/[postId]` → `index` (**D4(a)** — they emit `index,follow` today;
⛔ this story does not change shipped SEO behaviour)
**And** `member-directory` declares `noindex` per FR-75 (⛔ **unchanged** by the full-name
supersession — `-135` cl.7(c) supersedes *the name form only*; forced pagination and `noindex` **stand**)
**And** the Story 1.14 honeypot trap routes (`apps/api/src/plugins/security-headers/index.ts:69-95`,
which emit `abuse.honeypot`) already inherit the global `X-Robots-Tag` — ⚠ **verify, do not rebuild**;
they are `apps/api` routes, ⛔ not `apps/public` pages, so they are **outside** the route-coverage leg.

### AC8 — Visibility escalation requires trustee attestation, mechanized the way this repo already does it

**Given** **Trap 7** — the six-prompt PR budget and a CODEOWNERS file that cannot express trustee review
**When** any field's tier is escalated (`never_exposed` → `operator_restricted` → `authenticated_member` → `public`)
**Then** the matrix carries an **escalation ledger**: one entry per escalation with
`{ surface, field, from, to, decision, rationale }` where `decision` references a `.decision-log.md`
entry, plus a `count` the gate cross-checks **in both directions** — an orphaned entry, a missing
entry, or a count mismatch **fails** (the `governance-boundary` precedent, `README.md:136-140`)
**And** the *"why is this visibility increase justified?"* prompt is **merged into the existing
Security-impact checklist item** — ⛔ **not** added as a seventh prompt
**And** the gate **fails loudly** on a malformed ledger — ⛔ never degrading to "no entries", which
would make the leg pass vacuously (the `parseCapabilityBar` doctrine).

### AC9 — The stale and false statements in the shipped gate are corrected

**Given** the gate prints *"apps/public is a tsc stub until Story 2.5"* (⛔ false — 7 pages ship) and
the README promises the leak rules acquire teeth *"without a code change to the gate"* (⛔ false —
`loadSnapshots()` is `return []`)
**When** this story lands
**Then** both are corrected to describe what is actually true after this story
**And** the README states plainly **where each leg lives** (**D2**): which checks the gate script
proves from committed source, and which the live-render integration spec proves against real HTML
**And** ⛔ no claim survives that this story does not make good on.

### AC10 — Revert-sanity: every new detection route has a negative control

**Given** the house doctrine — *"a gate that cannot be made to fail has no teeth, and a governance
gate that silently stopped detecting anything would be worse than no gate: the green check would
actively certify an invariant nobody is enforcing"* (`governance-boundary/README.md`)
**When** the test suite runs
**Then** **each** new detection route carries an independently-planted violation proving it fires:
undeclared route · orphaned matrix surface · tier leak · unclassified field · Tier-1 `public` without
exception · a second Tier-1 exception · indexing conflict · escalation count mismatch · malformed ledger
**And** the whole gate is proven **live** at least once against a real planted file, and the result
recorded in Completion Notes ([[feedback_verify_before_committing_governance_claims]] — a green scan
is not proof; ⛔ run it).

### AC11 — `getVisibility()` exists as the single lookup, and the transparency framing is documented where it binds

**Given** the epic AC: *"the matrix is the **single canonical source of visibility truth** — surfaces
query `getVisibility(surface_id, field_id, viewer_context)` and render accordingly"*
**And** ✅ verified: **no such function exists anywhere in the repo today**
**When** this story lands
**Then** `getVisibility(matrix, surfaceId, fieldId, viewerContext)` ships in the **pure** engine
(`src/public-pages/scrape.ts`, beside `evaluateSurfaceRender`, reusing the **same** `TIER_RANK` /
`VIEWER_CEILING` constants — ⛔ never a second copy of the tier ordering) and returns a decidable
verdict: visible, or not-visible-with-reason
**And** it is **fail-closed** on an unknown surface or an undeclared field, matching
`evaluateSurfaceRender`'s existing `unclassified` posture — ⛔ an unknown field must never resolve
to *visible*
**And** Story 11a.2's `<MatrixField>` is its intended consumer; ⛔ this story ships the **function**,
not the component
**And** the **institutional-transparency framing** is documented in the README as the reason the tier
model exists: TWT transparency emphasizes **operational and governance visibility** — auditability,
published rules, contribution transparency, accountable governance — ⛔ **NOT** mass exposure of
member identities (`epics.md` §Epic 11a, load-bearing for 11a **and** 11b).

---

## 🚨 Decisions — ✅ **ALL SIX RULED BY BIGDEV, 2026-08-20. Nothing here is open.**

⭐ Every one was ruled **as recommended**, so the Tasks below are already written against the ruled
option. ⛔ The rejected options are retained deliberately — a reader must be able to see what was
*not* chosen and why, without re-deriving it.

### D1 — Does this story ship the presentation-policy **substrate**, or only the resolver? — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — substrate + resolver.** A per-Pariwar column/row (the
  `pariwar_appeal_config` precedent: one row per Pariwar, `UNIQUE (pariwar_id)`, fail-safe default)
  + the pure resolver + the governed write path. **Only (a) makes AC5's "must not hard-code" test
  real** — with no stored setting there is nothing to flip, and the test would assert about a
  constant.
- **(b)** ⛔ *Not chosen.* Resolver + a matrix reference only; substrate deferred to 11a.3. ⚠ Leaves `136`'s owed
  proof un-dischargeable and puts a DB migration on the directory-render story's critical path.

### D2 — Where does the live-render tier-leak leg live? — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — split, and document the split.** The **gate script** owns what is provable
  from committed source (matrix structure, route coverage, indexing reconciliation, escalation
  ledger). The **integration spec** (`apps/public/tests/integration/public-pages/scrape-test.spec.ts`,
  the architecture-committed D13-1.2 slot) owns live-render tier-leak — it already has real render
  HTML, already runs on every PR via `pnpm turbo run test`, and needs no new CI wiring. Then correct
  the README (AC9).
- **(b)** ⛔ *Not chosen.* Implement `loadSnapshots()` to read committed snapshot fixtures. ⚠ Fixtures are a
  restatement of the render and drift silently — the defect class this story exists to close.

### D3 — How are snapshot `fields` derived? — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — from the render model's own keys.** To render a field you must put it in the
  model, so the coupling is real and a new field appears automatically (and fails closed as
  `unclassified`). ⚠ Its limit — *a field rendered from a variable that never enters the model is not
  seen* — must be **written into the README**, in the 10.12 fence's confess-the-soft-spot style.
- **(b)** ⛔ *Not chosen.* AST scan of `.astro` templates. House-style (access-wrapper / custom-field-governance) but
  substantially more machinery for surfaces that already have clean typed models.
- **(c)** ⛔ Hand-written const per surface. Rejected: a restatement that drifts.

### D4 — `search_indexing_policy` for `/blog` and `/blog/[postId]` — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — `index` for both.** They render published, `public`-audience institutional
  content and today emit `index,follow` (no `noindex` prop). Declaring `noindex` would create an
  AC7 conflict the story would then have to resolve by changing shipped behaviour — ⛔ out of scope.
- **(b)** ⛔ *Not chosen.* `noindex` for the detail page. ⚠ Changes shipped SEO behaviour; needs its own rationale.

### D5 — Is `member-directory` declared in the matrix **now**? — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — yes, with `renders: false`.** The AC requires comprehensiveness, AC4's
  Tier-1 exception has nowhere else to live, and 11a.3 then **fills** a declared surface instead of
  **inventing** one. The route-coverage leg (AC1) must tolerate a declared-but-unrouted surface
  **only** when `renders: false` is explicit.
- **(b)** ⛔ *Not chosen.* Defer to 11a.3. ⚠ Re-opens the circularity `136` cl.4 says to sequence deliberately.

### D6 — Escalation-ledger location — ✅ **RULED (a) (BigDev, 2026-08-20)**
- **(a) ✅ RULED — inside `public-vs-private-matrix.yaml`.** One file, one review surface, one
  turbo input; the count-bump cross-check is local. Matches how `governance_boundary.yaml` keeps bar
  + count together.
- **(b)** ⛔ *Not chosen.* A sibling `matrix-escalations.yaml`. ⚠ Two files that can drift, and a second turbo input.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 route coverage | T3, T5 |
| AC2 tier-leak armed | T6, T7 |
| AC3 blog render model | T4 |
| AC4 Tier-1 exception | T2, T3, T7 |
| AC5 presentation policy | T8 |
| AC6 per-Pariwar rule + honest scoping | T2, T3, T9 |
| AC7 indexing reconciliation | T5 |
| AC8 escalation ledger | T2, T5, T10 |
| AC9 stale/false statements | T9 |
| AC10 revert-sanity | T7 |
| AC11 `getVisibility` + framing | T2b, T9 |

### Task 0 — Branch, baseline, rulings (AC: all)
- [ ] `git fetch origin`; confirm `origin/main` is still `bf802b7`. Branch off `main`.
- [ ] ✅ D1–D6 are **already ruled** (BigDev, 2026-08-20, all as recommended) and §Decisions records
      them. ⛔ No halt. ⛔ Do not re-open a ruling mid-implementation — if one looks wrong once the
      code is in front of you, **stop and raise it**, never silently deviate
      ([[feedback_supersede_never_reinterpret]]).

### Task 1 — `governance:` — the decision-log entry (AC: all) — ⭐ **COMMITS FIRST, ALONE**
- [ ] Write the `.decision-log.md` entry recording D1–D6 as ruled, the Niyamavali finding from
      §Policy meaning (⛔ record it as an **open finding for the Panel**, not as closed), and the
      three verified defects from §The gap.
- [ ] Commit `governance(11a.1): …` **before any code**
      ([[feedback_governance_commits_precede_implementation]] — history must read governance →
      implementation).

### Task 2 — Matrix schema extension (AC: 4, 6, 8) — `packages/contracts/src/public-pages/matrix.ts`
- [ ] Add to `MatrixSurfaceSchema`: `route` (string), `renders` (boolean, default `true` — **D5**).
- [ ] Add to `MatrixFieldSchema`: optional `pii_tier`, optional `tier1_public_exception`
      (`{ decision, rationale, scope }`), optional `presentation_policy_ref`.
- [ ] `superRefine`: a field with `pii_tier: 1` and `tier: 'public'` **without**
      `tier1_public_exception` → reject; **more than one** such exception across the whole matrix →
      reject (AC4).
- [ ] Add `escalations` + `escalation_count` to the root schema (**D6**); count mismatch → reject.
- [ ] Add the per-Pariwar attribute **rule** block (AC6) — ⛔ a rule, not a field list.
- [ ] ⛔ Keep `.strict()` everywhere and the loud-throw posture — a malformed matrix must **never**
      degrade to "no entries".

### Task 2b — `getVisibility()` (AC: 11) — `packages/contracts/src/public-pages/scrape.ts`
- [ ] Add the lookup beside `evaluateSurfaceRender`, **reusing** `TIER_RANK` + `VIEWER_CEILING`.
      ⛔ Do not duplicate the tier ordering — two copies drift and one of them stops being the truth.
- [ ] Fail-closed on unknown surface / undeclared field.
- [ ] ⛔ Keep the module **pure** — no fs, no db, no env.

### Task 3 — Populate the matrix (AC: 1, 4, 6) — `packages/contracts/public-pages/public-vs-private-matrix.yaml`
- [ ] Bump `version`. Declare the 7 shipped routes + `member-directory` (`renders: false`, **D5**).
- [ ] Per-field tiers from the **actual** render models (T4/T6 supply the field ids).
- [ ] `member-directory`: `district` (platform-common, `public`), the name field carrying
      `tier1_public_exception` + `presentation_policy_ref`. ⛔ **No** `school` / `designation` /
      `block` rows (**Trap 1**, scope boundary).
- [ ] Rewrite the file header: it currently says *"Do NOT pre-populate real surfaces here — that is
      Epic 11a's job."* ⇒ that job is **this story**.

### Task 4 — Blog render model (AC: 3) — `apps/public/src/lib/`
- [ ] Extract `blog-render.ts` mirroring `tc-render.ts`: a pure `buildBlogListModel` /
      `buildBlogPostModel` exposing **only** rendered fields.
- [ ] Rewire `blog.astro` + `blog/[postId].astro` frontmatter through it. ⛔ No render-output change.
- [ ] Correct the false comment at `blog.astro:6`.
- [ ] ⚠ Consider narrowing `read.ts`'s `db.select()` to an explicit column list — **only if** it does
      not disturb other consumers (`getPublishedPublicPost` is also used by the admin preview path;
      check before narrowing).

### Task 5 — Gate script legs (AC: 1, 7, 8) — `packages/contracts/scripts/check-pii-scrape.ts`
- [ ] **Leg — route coverage.** Enumerate `apps/public/src/pages/**/*.astro` → compare to matrix
      surfaces **bidirectionally** (fail-closed; `renders: false` exempts a surface from needing a route).
- [ ] **Leg — indexing reconciliation.** Parse each page's `noindex` prop → compare with
      `search_indexing_policy`; conflict fails.
- [ ] **Leg — escalation ledger.** Entry ⇄ count cross-check both directions; each entry's
      `decision` must be a non-empty ref.
- [ ] ⛔ **Add the scanned globs to `turbo.json:48-56` `inputs` in this same commit** (**Trap 6**).
- [ ] Keep the pure-core / impure-entry split — logic in `src/`, orchestration in `scripts/`.

### Task 6 — Field-id derivation (AC: 2) — **D3**
- [ ] Per D3(a): expose the field-id set from each render model. Ids must match the matrix field ids
      exactly (snake_case; see [[feedback_story_validate_footguns]] on camelCase↔snake_case drift —
      ⚠ the render models are camelCase and the matrix is snake_case; the mapping must be **explicit
      and tested**, never implicit).

### Task 7 — Arm the tier-leak leg + revert-sanity (AC: 2, 4, 10) — `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- [ ] Extend the existing snapshots to pass **`fields` as well as `html`** — this is the single
      change that takes the leg from vacuous to live.
- [ ] Add `blog` + `blog-post` snapshots from T4's models.
- [ ] ⛔ **Do not touch** the existing naked-PII negative control — it works.
- [ ] Add the AC10 negative controls, **one per detection route, independently planted**.

### Task 8 — Presentation policy (AC: 5) — **D1**
- [ ] Per **D1(a)**: migration **`0110_*`** (latest applied is `0109_survey-poll.sql` — ⛔ never
      regenerate an applied migration, 42P07, [[project_live_db_test_gotchas]]) + a per-Pariwar row on
      the `pariwar_appeal_config` shape (one row per Pariwar, `UNIQUE (pariwar_id)`, RLS policy in
      `packages/domain/src/policies/`), default **`full_name`** (⭐ the launch posture, `-136` cl.1).
- [ ] Pure resolver in `packages/domain/src/kyc/` next to `name.ts`; `shielded_name` delegates to
      `splitFirstNameLastInitial()` (⛔ do not reimplement).
- [ ] Governed write path: permission key + audit line. ⛔ No admin UI.
- [ ] ⭐ The **configurability test**: flip the stored mode, assert the rendered form changes, assert
      it flips **back**, assert the stored KYC name is **byte-identical** throughout.

### Task 9 — README + honest scoping (AC: 6, 9) — `packages/contracts/src/public-pages/README.md`
- [ ] Add *"⚠ What this gate does NOT prove — read this first"* (**Trap 2**), naming the DB-rows
      limit and D3(a)'s render-model soft spot.
- [ ] Add the three-layer CREATE / ENABLE / GRANT statement (AC6).
- [ ] Fix the false *"without a code change to the gate"* claim and the stale *"apps/public is a tsc
      stub"* strings (in **both** the README and `check-pii-scrape.ts`'s console output).
- [ ] Document which leg lives where (**D2**).

### Task 10 — PR template (AC: 8) — `.github/pull_request_template.md`
- [ ] **Merge** the visibility-escalation prompt into the existing **Security-impact note**.
      ⛔ Do **not** add a seventh checklist item (**Trap 7**).

### Task 11 — Retire the scaffold assertion (AC: 1) — `packages/contracts/tests/public-pages.test.ts`
- [ ] Rewrite `describe('committed scaffold matrix (AC-3/AC-6 self-green)')` (line 323) to assert the
      **populated** invariants. ⛔ Do not revert the matrix to keep it green (**Trap 5**).

### Task 12 — Verification (AC: all)
- [ ] `pnpm pii:check` — ⭐ paste the **real** output into Completion Notes. It must now report
      non-zero surfaces and non-zero evaluated snapshots.
- [ ] Prove the gate **live**: plant a real violation, capture the exit-1 output, revert (AC10).
- [ ] `pnpm turbo run lint typecheck test build`; then `pnpm ci:local`
      (⚠ `--concurrency=4`; [[project_ci_local_concurrency_oversubscription]],
      [[project_ci_local_double_run_pollution]]).
- [ ] ⚠ `git push` triggers full `ci:local` via the pre-push hook — that is the "hang", not a failure
      ([[project_friction_budget_baseline_ratchet]]).
- [ ] Flip `development_status[11a-1-…]` → `review`; add the combined `last_updated` ledger entry
      ([[project_sprint_status_ledger]]). ⭐ **REBASE-merge** this multi-commit governance story,
      ⛔ never squash ([[project_story_automator_ops]]).

---

## Dev Notes

### Files being MODIFIED — read each **before** editing

| File | Current state | What changes | ⛔ Must be preserved |
|---|---|---|---|
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | `version: 1`, `surfaces: []`; header forbids populating | Populated + header rewritten | The documented schema comment block stays accurate |
| `packages/contracts/src/public-pages/matrix.ts` | Zod schema, `.strict()`, loud-throw parser, dup-id `superRefine` | New optional fields + refinements + escalations | ⛔ The loud-throw posture; `null` = empty-document sentinel |
| `packages/contracts/src/public-pages/scrape.ts` | Pure engine: `TIER_RANK`, `VIEWER_CEILING`, fail-closed `unclassified`, `detectNakedPii` | ⚠ Likely **unchanged** — the rules already work | ⛔ Purity; the fail-closed `unclassified` rule; the PII regexes + their `lastIndex` discipline |
| `packages/contracts/scripts/check-pii-scrape.ts` | `loadSnapshots(): return []`; stale console text | New source-provable legs; corrected text | The impure-orchestration-only split; structured per-finding output; `process.exit(1)` |
| `packages/contracts/tests/public-pages.test.ts` | 38 tests; **line 324 asserts 0 surfaces** | That assertion retired (**Trap 5**) | The other 37 |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | Real renders, `html`-only snapshots, working naked-PII negative control | `fields` added; blog snapshots; new negative controls | ⛔ The existing naked-PII negative control, untouched |
| `apps/public/src/pages/blog.astro` · `blog/[postId].astro` | Inline render from full `select()` row; false comment at `:4` | Routed through a pure model | ⛔ Rendered output identical; the 404-no-enumeration-oracle behaviour |
| `turbo.json:48-56` | `inputs` exclude `apps/public` | Scanned globs added | Cache correctness (**Trap 6**) |
| `.github/pull_request_template.md` | Exactly six prompts | Merged into Security-impact | ⛔ The six-prompt budget |
| `packages/contracts/src/public-pages/README.md` | Two false claims | Corrected + honest-scoping section | The files table + tier table |

### Reuse — do **NOT** reinvent

- `evaluateSurfaceRender` / `evaluateSnapshot` / `detectNakedPii` — **the leak rules already exist and
  are correct.** They are inert only because nothing feeds them `fields`. ⛔ Do not write a second engine.
- `splitFirstNameLastInitial()` (`packages/domain/src/kyc/name.ts:47`) — **is** `shielded_name` (Trap 4).
- `scripts/custom-field-governance/README.md` — the honest-scoping template (Trap 2).
- `scripts/governance-boundary/` — the attestation + `count`-bump + bidirectional cross-check +
  revert-sanity pattern (Trap 7, AC8, AC10).
- `scripts/friction-budget/{lib.ts,check.ts}` — the pure-core / impure-entry split.
- `pariwar_appeal_config` — the minimal per-Pariwar governed-config table shape (D1).
- `tc-render.ts` / `niyamavali-render.ts` — the pure-render-model pattern for T4.

### Anti-patterns this story is specifically exposed to

1. ⛔ **Making the gate green by narrowing what it looks at.** The whole defect being fixed is a green
   gate that proved nothing.
2. ⛔ **Enumerating member attributes into the matrix** (Trap 1) — re-commits SD-1.
3. ⛔ **Reaching for a tenant DB** to classify per-Pariwar attributes (Trap 2).
4. ⛔ **Reclassifying member name out of Tier-1** to make the public render "clean" (Trap 3) — the
   ruling authorises a **decrypt at a named surface**, not a reclassification.
5. ⛔ **Hard-coding `full_name`** because the launch posture is `full_name` (Trap 4) — the posture is
   the **default**, not the constant.
6. ⛔ **Adding a seventh PR prompt** (Trap 7).
7. ⛔ **Touching In Memoriam / Sahyog Vivran** "for consistency" — the non-propagation is deliberate
   and ruled (scope boundary).
8. ⚠ **Type-only → value import drift**: the matrix types are consumed by `@twt/public` and
   `@twt/contracts`. ⛔ Keep `import type` where it is type-only
   ([[project_type_only_import_cycle_trap]] — a module-init cycle breaks consuming packages at
   runtime while typecheck/lint stay green).
9. ⚠ **`@twt/contracts` must not import `@twt/domain`'s pg-touching namespaces**
   ([[project_contracts_domain_bundle_boundary]]) — if the presentation resolver is needed in
   contracts, keep it pure and pg-free.

### Testing standards

- Vitest throughout. Contracts tests ride `pnpm turbo run test`; the integration spec rides the same
  task from inside `@twt/public` (⛔ do **not** add new CI wiring — AC's leg placement is D2).
- ⭐ **Every detection route gets an independently-planted negative control** (AC10). The house
  doctrine is explicit that a gate which cannot be made to fail has no teeth.
- Live-DB specs only if D1(a) adds a table: never regenerate an applied migration (42P07), never
  `DROP SCHEMA` (42P01), assert membership not counts ([[project_live_db_test_gotchas]]).

### Previous-story intelligence

⚠ **11a.1 is the first story of Epic 11a — there is no previous story in this epic.** The last twelve
commits are **all `governance:`** — this story is the **first BUILD commit** after a nine-artifact
correct-course. What that history teaches:

- **`e0437b9`** — a trustee caught a finding sitting *in the consent sheet* rather than *in the
  artifact being ratified*. ⇒ ⭐ **Put the constraint in the artifact the reader will actually open.**
  Applied here: the honest-scoping limit belongs in the **README next to the gate**, not only in this
  story file ([[feedback_spec_edits_must_propagate_to_tasks]] — the dev agent works from the Tasks
  list, so a constraint recorded only in prose does not reach the implementation).
- **`8bcc924`** — *"answer the Panel's 'are these up to date?' by VERIFICATION — no; three staleness
  classes found"*; 31 of 39 index rows carried the same defect. ⇒ AC9 exists because **this story's
  own gate carries exactly that defect class**.
- **`99b4a46`** — the full-name ruling was **deliberately NOT propagated** to In Memoriam. ⇒ The
  scope boundary's most likely violation is a well-meaning "consistency" edit.

### Git intelligence (last 5 commits)

`bf802b7` ADR-0037+0038 ratified, `drafted` → **zero** · `e0437b9` finding moved into the artifact ·
`8bcc924` staleness found by verification · `68ff96f` consent sheet · `8fc28e5` ADR-0039 ratified.
⇒ **Pattern:** governance commits land alone, first, with `⭐/⚠/⛔` semantics in the subject; claims
are **verified live, not inherited** ([[feedback_verify_before_committing_governance_claims]]).

### Project Structure Notes

- No new package. New code lands in `packages/contracts/{src,scripts}/public-pages/`,
  `apps/public/src/lib/`, and (under D1(a)) `packages/domain/src/kyc/` + one migration.
- ⛔ **No premature package extraction** ([[project_no_premature_package]]) — one consumer.
- DB columns snake_case ↔ TS camelCase (`architecture.md` §Naming). ⚠ Matrix field ids are
  **snake_case**; render models are **camelCase**. T6's mapping must be explicit and tested.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` #Story 11a.1] — ACs + the C2/C9 four corrections
- [Source: `_bmad-output/planning-artifacts/epics.md` #Story 11a.3] — the C1/C9 row-by-row disposition (SD-1)
- [Source: `_bmad-output/planning-artifacts/architecture.md` §2.13] — attribute model, authority layering, presentation
- [Source: `_bmad-output/planning-artifacts/architecture.md` §2.7] — PII tiers + the ruled Tier-1 exception
- [Source: `.decision-log.md#2026-08-19-132`] — R1–R7; R7 controls
- [Source: `.decision-log.md#2026-08-19-133`] — CREATE / ENABLE / GRANT; `School` ineligible
- [Source: `.decision-log.md#2026-08-19-135`, `#2026-08-19-136`] — full name; presentation policy; ⛔ cl.4 launch-blocking
- [Source: `.decision-log.md#2026-08-19-137`] — hierarchy migration; ⛔ gates `block`
- [Source: PRD `prd.md#FR-74`, `#FR-75`, `#FR-93`]
- [Source: `scripts/custom-field-governance/README.md`] · [`scripts/governance-boundary/README.md`]
- [Source: `apps/public/COMPOSITION-CONTRACT.md`] — the AR-48 registry ⚠ (stale: omits `/blog`)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
