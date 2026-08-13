---
baseline_commit: 9fa4e31fd7fc74ebdea67662e5d74c1d4194f6c1
---

# Story 1.19: Member Geo Attribution + Geo Audience Consumer `[PRIMITIVE]` + `[CONSUMER]`

Status: done

> ⚠ **WHY THIS STORY SITS IN A RETROSPECTED EPIC.** `epic-1-retrospective` is `done`. The placement is
> deliberate and is **not** to be "corrected" into whichever epic happens to be open: this story extends the
> **geo-tree model Story 1.18 minted** (`packages/domain/src/geo-tree/`), and the project's rule is that *a
> successor belongs to the epic that owns the model it extends, at that epic's next free sequential number.*
> **Minted by Story 1.18 Task 1 (Decision `2026-08-12-102`), governance-first, from that story's Appendix A.**
> Do not flip `epic-1-retrospective` back.

## Story

As Solo Builder and every surface that has stored a geo audience it cannot resolve,
I want a member→geo attribution primitive over Story 1.18's tree, with the `state` audience arm wired
end-to-end,
so that a banner or post targeted at a state reaches the members who are actually in it, instead of being
stored, tone-reviewed, listed — and visible to nobody.

---

## 🎯 The gap, stated exactly

`member_postings.district` (`schema/member_postings.ts:51`, `text NOT NULL`) is the **only per-member
geography that exists anywhere in the schema**. Members carry no `state` and no `block`. Story 1.18 supplies
**district→state ancestry** (`geo_tree_versions`, migration `0101`); what is still missing is the
**member→district read** that turns ancestry into an audience.

> A tree answers *"is Patna in Bihar"*. It never answers *"which members are in Patna"*. Audience
> **selection** and authorization **containment** are different capabilities that merely share the word
> "geo" — which is precisely why Story 1.18 shipped a complete resolver and lit up none of these markers.

⛔ **This story wires ONE consumer end-to-end** (in fact both halves of one consumer family: the banners
read-time predicate and the news-blog dispatch selector). A producer with no consumer is the Story 5.6/5.7
anti-pattern that Story 10.8's Decision 8 exists to prevent.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| Not this story | Why | Owner |
|---|---|---|
| Building, editing, or seeding a **geo tree** | Story 1.18 shipped the registry + resolver and **deliberately no writer surface**. This story is a *reader* of `loadGeoTree`. | a future publishing surface |
| `GEO_RANK` / `CEILING_RANK` / `scopeContains` ordering / permission-key + scope-dimension model | **Architectural freeze row 9** (`epics.md:527`). Would require an ADR. | — |
| Family-A **rank-order** sites | A narrower grant never satisfies a broader check; no resolver and no member attribute changes a numeric compare. Story 10.18 rewrote them in place; Story 1.18 corrected two more (P1/R11). | settled — do not re-open |
| A `role` or `cohort` **member attribute** | No attribute exists at any layer. This story **owns the seam** (AC4) and delivers neither. | **this story AC4** (seam only) |
| **Multi-node** (`IN`-list) report scope | Orthogonal: ancestry is one actor reaching *beneath* a grant; multi-node is one actor holding grants at *sibling* nodes. | **Story 10.28** (permanent) |
| **Block-dimension** ground-inspection gate | Needs a different GATE, not a resolver and not a member attribute. | **Story 6.17** |
| Story 12.2's **targeting wizard** | AC8 records the seam. **No code is written for it here.** | **Story 12.2** (`epics.md:4569`) |
| `helpdesk_tickets.member_scope_context` geo enrichment | Named seam at `apps/api/src/modules/helpdesk/handlers.ts:10-15`; the v1 policy routes at `pariwar` throughout. It is a *future* consumer of this primitive, not a deliverable here. | **Story 10.4** |
| Changing `members` / `member_postings` **schema** | The primitive is a READ. It adds no column and no table. | — |

---

## Acceptance Criteria

> Reproduced from `epics.md:1435-1491` (minted verbatim from Story 1.18's Appendix A, Decision
> `2026-08-12-102`), with evidence and line anchors **re-derived at `9fa4e31`**.

### AC1 — The primitive

`resolveMemberGeoNode` returns the member's **current district** (newest `member_postings` row by
`created_at`), lifted through Story 1.18's **in-force** tree to `{pariwar, state, district, block}`.

⭐ **Every ancestor the tree cannot supply is TYPED-ABSENT** (`{available: false, reason}`) — never guessed,
never null-collapsed (the Story 8.4 nominee-VPA discipline, [[project_nominee_vpa_deferred_seam]]).

⛔ **Nothing in this story may imply a member necessarily resolves to all four levels.** A Pariwar publishing
only districts yields no state and no block, and that is a **first-class answer, not a degraded one**. A
member with **no posting row** resolves to **no geo**, and every consumer treats that as *"in no geo
audience"* — **fail-closed, never "in all."**

### AC2 — The tree is the only ancestry source

`state`/`block` come **only** from Story 1.18's published tree — no second geography, no hardcoded
district→state map, no `IN ('BR','UP',…)` constant anywhere. A Pariwar with **no tree** resolves
**district-only**, so its `state` audience arm denies **exactly as today** (`loadGeoTree` →
`null`, `registry.ts:82-90`).

### AC3 — The `state` arm lights up in BOTH consumers

- banners' read-time predicate `isMemberInBannerAudience` (`banners/audience.ts:58`)
- news-blog's dispatch selector `resolveAudienceMemberIds` (`news-blog/audience.ts:66`)

**Call sites do not move**; banners' signature grows a member argument exactly as the file predicts
(⚠ the epic cites `banners/audience.ts:40-43`; at `9fa4e31` the prediction is the doc comment at
**`:45-57`** — `:40-43` is `defaultLogger`. Use the re-derived anchor).

⛔ **The polarity difference is preserved** (`banners/audience.ts:5-12`):

| scope | banners (read-time predicate) | news-blog (dispatch selector) |
|---|---|---|
| `public` | **`true`** — widens who else may see it | **empty set** — renders on web, no member push |
| `members-all` | `true` | active + active-in-grace ids |
| `state` | **resolves** (this story) | **resolves** (this story) |
| `role` / `cohort` | `false` + seam note | `[]` + seam note |

### AC4 — `role` and `cohort` stay seamed, with a named owner

No member attribute exists for either — `members` carries lifecycle `state` + `pariwar_id` only. Both
continue to resolve `false`/`[]` **plus a logged seam note**; their prose names a **story** and never an
epic; and the per-arm distinction between *"resolvable now"* and *"no attribute exists at all"* is stated
**explicitly**, not inferred.

> ⚠ **Ruled disposition (D8, 2026-08-13):** AC4's *"names a **story**"* clause **cannot be satisfied** — no
> story owns a member `role`/`cohort` attribute, verified at `9fa4e31`. `role`/`cohort` are recorded
> **"Not addressed"** with the re-trigger *"the first surface that must target members by role or cohort"*,
> and **no successor is minted**. Every other obligation in AC4 is delivered in full. See **D8**.

### AC5 — The six re-pointed markers are discharged

`D6`/`D7`/`D8`/`D14`/`D15`/`D16`: **geo half resolved, role/cohort half re-pointed.**

| Marker | File | Line @ `9fa4e31` | Disposition |
|---|---|---|---|
| **D6** | `packages/domain/src/news-blog/audience.ts` | 19-33 (block), 26, 31 | geo → **resolved**; role/cohort → seam, named owner |
| **D7** | `packages/domain/src/banners/audience.ts` | 20-30 (block), 24-25, 29, 51, 56 | geo → **resolved**; role/cohort → seam, named owner |
| **D8** | `packages/domain/src/banners/read.ts` | 24 | single-authority note — rewrite as delivered |
| **D14** | `packages/contracts/src/banners/enums.ts` | 45 | ⛔ **comment/DTO edit only** |
| **D15** | `packages/contracts/src/banners/dto.ts` | 43 | ⛔ **comment/DTO edit only** |
| **D16** | `apps/admin/src/modules/banners/derive.ts` | 60, 63 | ⛔ **comment/DTO edit only** |

⛔ `packages/contracts/src/banners/{enums,dto}.ts` and `apps/admin/.../derive.ts` are **comment/DTO edits
only** — contracts must never import a pg-touching `@twt/domain` namespace, and `apps/admin` is a browser
bundle ([[project_contracts_domain_bundle_boundary]]; `derive.ts:11-14` states the same rule from the other
side).

### AC6 — The quiet-turn-on hazard

`state`-scoped banner rows authored **before** this story are currently visible to **nobody**; when the arm
resolves they become **live**. Therefore:

- the admin console's *"not yet targetable"* indicator (`apps/admin/src/modules/banners/derive.ts:70`) is
  **removed for `state`** and **retained for `role`/`cohort`**;
- **existing `state` rows receive an explicit disposition** — publish, or require re-confirmation — **rather
  than silently appearing**.

### AC6-E — Ruled extension (2026-08-13): the same disposition covers unpublished news posts

⭐ **Not part of the minted AC6 text — a ruled ADDITION recorded separately, never an in-place re-reading.**

Escalation 1 established that news-blog dispatch is one-shot at publish, so already-`published` `state` posts
are genuinely safe, **but `scheduled` is a stored status** (`schema/news_posts.ts:56`) and `runNewsPublish`
transitions `scheduled → published` and *then* fans out. Therefore the AC6 pre-flight disposition **extends
to `news_posts` rows in `draft`/`submitted`/`approved`/`scheduled` with `audience_scope = 'state'`**, under
the identical gate: counts recorded verbatim, **non-zero ⇒ STOP and escalate**, ⛔ no migration.

### AC7 — The dispatch read is bounded

The `state` fan-out is **one query** joining newest-posting-per-member against the tree's district set —
**no N+1 at 4L members**. Watch the `DISTINCT ON` **42P10** gotcha and the domain limit-clamp gate
([[project_domain_limit_clamp_and_savepoint_retry]], [[project_contribution_fact_projection_substrate]]).

### AC8 — Story 12.2 inherits a seam, not a surprise

The targeting wizard's scope filter (`epics.md:4569` — `national/state/district/role/cohort`; ⚠ the epic
text cites the pre-mint line `4429`, which has drifted) is **recorded** as a downstream consumer of this
primitive. **No code is written for it here.**

---

## 🚨 Decisions — **D1–D8 ALL RULED BY BIGDEV 2026-08-13. Nothing here is open.**

> ✅ **D1–D8 ruled, and Escalations 1 + 2 ABSORBED into this story.** Implement as written. Do not
> re-litigate any of them — and do not settle an *unruled* question quietly: raise it instead.
>
> **Ruling summary.** **D1** → new `member-geo` module, **not** admitted to the prohibited roots, decision
> + re-trigger recorded. **D2** → existing `state` rows **keep their authored status** and become targetable,
> **only after** the pre-flight query runs and its result is recorded; **non-zero live/scheduled ⇒ STOP and
> escalate**, ⛔ never bypass the state machine with a migration. **D3** → `created_at DESC, posting_id DESC`.
> **D4** → resolved-geo injection; the predicate stays sync + pure. **D5** → `block` permanently typed-absent
> with `no-member-attribute`. **D6** → the closed five-value `reason` union, exactly as proposed. **D7** →
> the peer-mesh correlated-scalar-subquery with literal outer qualifiers.
> **D8** → AC4's *"name a story"* clause **cannot be satisfied**; `role`/`cohort` are **"Not addressed"** with
> a concrete re-trigger and **no successor minted**.
> **Esc. 1** → **absorbed**; the pre-flight extends to unpublished/scheduled `state`-targeted news posts.
> **Esc. 2** → **absorbed**; both lists updated **and** the admin visibility verdict explicitly tested.
> **Esc. 3** → informational; use the **re-derived current-head anchors**.

### D1 — ✅ **RULED: new `packages/domain/src/member-geo/`; NOT admitted to the prohibited roots**

**Ruled 2026-08-13.** Create `packages/domain/src/member-geo/`, exported as the `memberGeo` namespace. **Do
not** add it to `governance_boundary.yaml`'s `prohibited` list. **Record the decision** and **retain the
re-trigger as stated**: *the first authorization or routing consumer of `resolveMemberGeoNode` requires
reassessment.*

⭐ **The re-trigger is MECHANIZED, not merely stated** (ruled 2026-08-13, second pass). Unlike D2 — a
one-time act discharged at Task 0 — D1 leaves a **standing** obligation that fires in a story nobody has
scheduled. An obligation recorded only in `.decision-log.md` and this story file decays the same way an
epic-shaped deferral does. So **Task 1 writes it into both successors' OWN `epics.md` sections** (Story 6.17
`:2707-2735`, Story 10.4 `:3576-3590`) — the fix Story 1.18's D9-R applied to Story 10.13.
[[feedback_mechanization_split_commitment]]: *decay concentrates in the un-mechanized half.*

Evidence:

- It **cannot** live in `packages/domain/src/geo-tree/`: that root **is** on the `prohibited` list
  (`governance_boundary.yaml:302-305`, prohibition (d) — *"the resolver's answers ARE authorization
  decisions"*). A member-attribution read is **not** an authorization decision today; folding it under a
  prohibition it does not earn makes the prohibition mean less, not more.
- It **cannot** live in `rbac/` either (`governance_boundary.yaml:238`) and it touches a DB, which `rbac/`
  deliberately never does (`geo-tree/index.ts:7-11`).
- ⚠ **The answer must be RECORDED whichever way it goes.** *A passing scan over an UNLISTED root proves the
  root is unlisted, not that the behaviour is admissible* — the gate's own README (`:169-174`), and the
  exact lesson Story 1.18 AC7 paid for.
- **Concrete re-trigger for admission** (replacing a vague one): *the first time any authorization or
  routing path consumes `resolveMemberGeoNode`* — specifically Story 10.4's `member_scope_context` geo
  enrichment (`apps/api/src/modules/helpdesk/handlers.ts:10-15`) or Story 6.17's block gate. At that moment
  a flag that could weaken it becomes a config-shaped privilege switch, and the root must be admitted.

### D2 — ✅ **RULED: option (a) — authored status retained, gated on the pre-flight**

**Ruled 2026-08-13.** Existing `state`-scoped banners **retain their authored status** and become targetable
when the `state` arm ships — **but only after the mandatory pre-flight query is run and its result is
recorded**. ⛔ **If affected live/scheduled rows are non-zero: STOP and escalate.** ⛔ **Do not bypass the
state machine through a migration** — neither (b) nor (c) below is authorized without a fresh ruling.

⛔ **`published → draft` is NOT a legal transition.** `banners/status.ts:18-19` permits exactly
`publish: draft → published` and `retract: {draft, published} → retracted`, and **`retracted` is terminal**
(`schema/banners.ts:91`). So the three candidate mechanisms are not equivalent:

| Option | Mechanism | Cost |
|---|---|---|
| **(a) Publish** *(recommended)* | Change nothing in the data; the rows become live as authored. | Requires **evidence** that the affected population is bounded. |
| (b) Re-confirm via draft-back | Migration sets `status='draft'`. | **Bypasses the state machine** — writes a transition the domain forbids. |
| (c) Re-confirm via retract | Migration sets `status='retracted'`. | **Terminal** — destroys rows an admin authored deliberately. |

**The ruled mechanism (a), gated on a mandatory pre-flight disposition query** recorded verbatim in
Completion Notes, per environment:

```sql
SELECT status,
       (valid_until IS NOT NULL AND valid_until <= now()) AS already_expired,
       count(*)
FROM banners
WHERE audience_scope = 'state'
GROUP BY 1, 2;
```

Rationale: the *"not yet targetable"* indicator (`derive.ts:70`) was on screen when these rows were
authored, and banners carry a **validity window** — a row whose `valid_until` has passed can never render
regardless of this story. If the query returns **zero live/scheduled rows**, the hazard is discharged **by
evidence rather than by ceremony**, which is the [[feedback_record_unattested_no_backfill]] discipline:
record what is actually true; do not manufacture a mechanism for an empty population. If it returns
**non-zero**, ⛔ **STOP — escalate to BigDev with the counts.** Choosing (b) or (c) unilaterally is
explicitly not authorized by this ruling.

⛔ **The pre-flight query is not optional and its result is not assumed.** "Probably zero" is not a
disposition.

### D3 — ✅ **RULED: the deterministic `created_at DESC, posting_id DESC` tie-break**

AC1 says *"newest `member_postings` row by `created_at`"*. The repo has **two** existing readers and they
**disagree**:

- `member/posting.ts:117-129` `getMemberPostingLatest` — `ORDER BY created_at DESC` **only**. Ties are
  **nondeterministic**.
- `claim/peer-mesh-read.ts:83-88` / `:122-128` — `ORDER BY p.created_at DESC, p.posting_id DESC`.

**Ruled 2026-08-13: adopt the peer-mesh form (`created_at DESC, posting_id DESC`).** Two rows can share
`created_at` (same-transaction inserts; `defaultNow()` resolution), and a nondeterministic audience is a
nondeterministic *test*. This **refines** AC1's prose rather than contradicting it.

⛔ **Do not "fix" `getMemberPostingLatest` in this story.** It serves Story 3.9's panel summary and Epic 4's
retirement anchor; changing its ordering is a different blast radius. **Record the divergence in a comment
at both sites** so the next reader sees it as deliberate.

### D4 — ✅ **RULED: resolved-geo injection; the predicate stays SYNCHRONOUS and PURE**

⭐ **The load-bearing structural finding.** `isMemberInBannerAudience` is a **pure, synchronous** predicate
called inside a `.filter()` (`banners/read.ts:188`). AC3's *"signature grows a member argument"* must **not**
be read as *"grows a `Db` argument"*: that would make the filter async and would issue **one query per
candidate banner** — the N+1 AC7 forbids, in the *other* consumer.

**Ruled shape** (the same split Story 1.18 used for `hasPermission`/`GeoTreeResolver`):

1. `listMemberBannerCandidates` (`read.ts:180`) resolves the member's geo **ONCE**, before filtering.
2. It passes the resolved value into the predicate:
   `isMemberInBannerAudience(scope, scopeValue, memberGeo, logger)`.
3. `isMemberInBannerAudience` stays **pure and synchronous**.

⛔ Never load geo inside the filter. ⛔ Never make the predicate async.

### D5 — ✅ **RULED: `block` is permanently typed-absent, with `no-member-attribute`**

⭐ **A member's posting supplies a `district`. Ancestry walks UP. `block` sits BELOW `district`.** Therefore
**no tree, however complete, can ever populate a member's `block`** — the tree resolver itself only walks
`descendant → ancestor` (`geo-tree/resolver.ts:152-157`).

**Ruled 2026-08-13:** `block` ships **unconditionally** `{available: false, reason: 'no-member-attribute'}`, with
a `reason` **distinct** from the tree-shaped absences. Collapsing it into `'not-in-tree'` would tell a future
reader that a richer tree lights it up. It does not. Only a new member attribute would — and that is not
this story.

Realistic resolution matrix, to be stated in the module header:

| Level | Available when |
|---|---|
| `pariwar` | **always** (`members.pariwar_id`) |
| `district` | the member has ≥1 `member_postings` row |
| `state` | ⋯ **and** the in-force tree contains that district **and** an ancestor at `state` |
| `block` | **never** — no member attribute exists |

### D6 — ✅ **RULED: the closed FIVE-value `reason` union, exactly as proposed**

**Ruled closed union** — exactly these five, no additions without a fresh ruling (so consumers can branch
and logs stay greppable):

| reason | meaning |
|---|---|
| `no-posting-row` | member has no `member_postings` row → **no geo at all** |
| `no-tree-published` | the Pariwar has published no tree (`loadGeoTree` → `null`) |
| `node-not-in-tree` | the district value is not a node in the in-force tree |
| `no-ancestor-at-dimension` | the tree has the district but no `state` above it |
| `no-member-attribute` | permanent — `block` (D5) |

⛔ A free-text `reason` is rejected: it is the *"anonymous" diagnostic log* discipline
([[project_anonymous_diagnostic_log_convention]]) — the signal lives in a **closed vocabulary**, not prose.

### D7 — ✅ **RULED: the peer-mesh correlated-scalar-subquery with literal outer qualifiers**

**Ruled 2026-08-13: reuse the `peer-mesh-read.ts` correlated-scalar-subquery form with LITERAL outer-table
qualifiers. ⛔ NOT a freshly-invented `DISTINCT ON`.**

- The peer-mesh form is **proven against the exact bug class**: interpolating a Drizzle `Column` into a
  subquery over a table with a same-named column collapses the correlation into a tautology
  (`peer-mesh-read.ts:60-73`, [[project_epic6_drizzle_correlated_subquery_bug]]) — a live ~30-40% wrong-district
  bug, invisible to DB-free tests.
- `DISTINCT ON` additionally carries the **42P10** trap (the `ORDER BY` must lead with the `DISTINCT ON`
  expressions) — [[project_contribution_fact_projection_substrate]].
- The **district set** is computed **in memory** from the in-force tree document (bounded by `MAX_NODES =
  5000`, `geo-tree/document.ts:29`) and passed as one `IN`-list. ⭐ Note the tree is a **JSONB document**,
  not a table — there is nothing to join *to* in SQL.
- The member fan-out takes **no `.limit()`**, exactly as the existing `members-all` arm
  (`news-blog/audience.ts:75-79`). The domain-accessor-invariants gate clamps every **dynamic** `.limit()`;
  it does not require one to exist.

### D8 — ✅ **RULED: AC4's "name a story" CANNOT be satisfied — record `role`/`cohort` as "Not addressed" with a concrete re-trigger**

**Ruled 2026-08-13.** AC4 requires the `role`/`cohort` seam prose to *"name a **story** and never an epic"*.
**No such story exists**, and this was verified rather than assumed at `9fa4e31`:

- `members` carries lifecycle `state` + `pariwar_id` only — **no `role` and no `cohort` member attribute at
  any layer** (`schema/members.ts`; both consumer headers say so independently:
  `banners/audience.ts:16-18`, `news-blog/audience.ts:13-17`).
- **Story 10.8** (`10-8-feature-flags-per-cohort-…`, **`done`**) is **not** the owner. Its "cohort" is a
  *flag-targeting* tag — by `pariwar_id`, scope, role, or arbitrary tag (`epics.md:115`, FR-58C) — not a
  member attribute on the audience axis. ⛔ Naming it would be the **worst** available option: a re-deferral
  pointing at a `done` story reads as **already-delivered**.
- **Story 12.2** (`epics.md:4569`) *consumes* a `role`/`cohort` scope filter but does not **own** the
  attribute. Naming it would be the same failure in a fresher coat.

⭐ **The ruling: record `role`/`cohort` as "Not addressed"** ([[feedback_closure_language_precision]] — the
third label, used honestly), **with a concrete re-trigger replacing the vague one:**

> **Re-trigger: the first surface that must target members by `role` or `cohort`.**

⛔ **No successor is minted.** There is no FR behind a member role/cohort attribute, no live consumer and no
backlog consumer demanding it; minting an owner for work nobody has asked for manufactures exactly the
un-gated re-commitment [[feedback_record_unattested_no_backfill]] warns decays. This is the disposition
Story 1.18 gave `deferred-work.md:1091`, for the same reason.

⚠ **Say plainly that AC4 over-specified.** The minted AC assumed a story existed to name; none does. ⛔ **Do
not edit AC4's text** to fix this ([[feedback_supersede_never_reinterpret]]) — record the disposition beside
it and let the AC stand as written. The seam behaviour AC4 actually demands (resolve `false`/`[]`, log the
note, state the *"no attribute exists at all"* distinction explicitly) is delivered **in full**; it is only
the successor-naming clause that cannot be met.

---

## ⚠ ESCALATIONS — **RULED 2026-08-13: 1 and 2 ABSORBED into this story; 3 informational**

### Escalation 1 — ✅ **ABSORBED** — news-blog's `scheduled` posts carry the same hazard

Banners are a **read-time predicate**, so every published `state` row turns on the moment this ships — which
is what AC6 addresses. News-blog dispatch is **one-shot at publish** (`news-publish.ts:199`), so posts
already `published` **never re-fan-out** and are genuinely safe.

⛔ **But `scheduled` is a stored status** (`schema/news_posts.ts:56`), and `runNewsPublish` transitions
`scheduled → published` and then fans out. **A post scheduled today with `audience_scope='state'` will
dispatch for real after this story lands** — the same quiet turn-on, in the consumer AC6 does not mention.

**Ruled 2026-08-13 — ABSORBED into this story.** Extend D2's pre-flight disposition to
**unpublished/scheduled `state`-targeted news posts**:

```sql
SELECT status, count(*)
FROM news_posts
WHERE audience_scope = 'state'
  AND status IN ('draft', 'submitted', 'approved', 'scheduled')
GROUP BY 1;
```

The same gate applies as D2: record the counts verbatim; **non-zero ⇒ STOP and escalate**; ⛔ no migration
and no status rewrite without a fresh ruling. Already-`published` posts are **out of scope by evidence** —
dispatch is one-shot and they never re-fan-out.

⛔ **This does NOT edit AC6's minted text.** It is a ruled extension, recorded as **AC6-E** below
([[feedback_supersede_never_reinterpret]] — minted acceptance criteria are not re-read in place).

### Escalation 2 — ✅ **ABSORBED** — `BANNER_TARGETABLE_AUDIENCE_SCOPES` has **three** consumers

The list is **duplicated by design**: `banners/audience.ts:91` (domain authority) and
`contracts/src/banners/enums.ts:63` (browser mirror), pinned by an **order-sensitive** `toEqual` sync-guard
(`packages/contracts/tests/banners.test.ts:56-62`).

⭐ The third consumer is **not** the indicator: `apps/admin/src/modules/banners/derive.ts:171` calls
`isTargetableAudience` inside the **AC5 visibility verdict**, splicing a draft into the live candidate set.
Adding `'state'` therefore changes what the admin console tells an author about whether their draft would be
**seen** — not just whether it is targetable. **That is correct behaviour, but it must be asserted, not
discovered.**

**Ruled 2026-08-13 — ABSORBED.** Update **both** targetable-scope lists **and explicitly test the admin
visibility verdict** at `derive.ts:171`. The verdict change is a required assertion, not an incidental one.

⛔ Both lists must gain `'state'` **in the same position** or the sync-guard fails on ordering.

### Escalation 3 — ✅ **RULED: informational only — use the re-derived current-head anchors**

`banners/audience.ts:40-43` (AC3) and `epics.md:4429` (AC8) are **pre-mint** anchors. Re-derived at
`9fa4e31`: the prediction is `banners/audience.ts:45-57`; the wizard is `epics.md:4569`. **Recorded, not
silently corrected** — the ACs are minted text and are not edited by the implementing story.

---

## Tasks / Subtasks

### Task 0 — Confirm decisions, branch, baseline (AC: all)

- [x] ✅ **D1–D7 RULED and Escalations 1 + 2 ABSORBED** (BigDev, 2026-08-13). **Task 1 is UNBLOCKED.**
      Implement the rulings as written; ⛔ do not re-litigate them.
- [x] `git fetch origin` before reasoning about `main` ([[feedback_git_fetch_before_remote_reasoning]]).
      Branch `feature/1-19-member-geo-attribution-geo-audience-consumer` off `main`. Do not work on `main`.
- [x] **Re-derive the marker table** against the working tree — the AC5 table's numbers are `9fa4e31` and
      will drift as you edit:
      `grep -rn "Story 1\.19" --include="*.ts" --include="*.tsx" packages apps | grep -v node_modules | grep -v /dist/`
      (at `9fa4e31`: **12 marker lines → 6 marker subjects across 6 files**; ⚠ `banners/audience.ts` carries
      **two** comment blocks for one subject — the file header at `:20-30` and the function doc at `:51-56`
      — so a block count and a subject count are not the same number here). Where the re-derived list
      disagrees with the AC5 table, **the re-derived list wins**; record the discrepancy in Completion Notes.
- [x] Record the **baseline green** before any change, so dispositions are measured from a known start:
      `packages/domain/tests/banners/audience.test.ts`, `packages/domain/tests/integration/news-blog/news-blog.spec.ts`
      (esp. `:219-242`, which pins `state`/`role`/`cohort` → `[]`), `packages/contracts/tests/banners.test.ts`.
- [x] Run **BOTH pre-flight disposition queries** — D2's over `banners` **and** AC6-E's over `news_posts`
      (Escalation 1, absorbed). Record the counts **verbatim**, per environment, in Completion Notes
      **whether or not any rows are found**. ⛔ Do not assume zero; "probably zero" is not a disposition.
- [x] ⛔ **If either query returns non-zero live/scheduled rows: STOP and escalate to BigDev with the
      counts.** Do **not** proceed, and do **not** bypass the state machine with a migration — the D2 ruling
      authorizes option (a) only.

### Task 1 — `governance:` — the decision-log entry + marker owners (AC: 5, 8) — **COMMITS FIRST**

⛔ **Zero files under `packages/` or `apps/` in this commit** ([[feedback_governance_commits_precede_implementation]]).

- [x] Append `.decision-log.md` with the D1–D7 rulings. **Verify the current head id before writing**;
      newest-first; ⛔ never edit an existing entry in place ([[feedback_supersede_never_reinterpret]]).
- [x] `deferred-work.md` — disposition the six re-pointed markers using
      [[feedback_closure_language_precision]] vocabulary (*"Closed by [edit]"* / *"Resolved via explicit
      deferral"* / *"Not addressed"*), **never collapsed**. The geo half and the role/cohort half get
      **separate** labels — they are not the same disposition.
- [x] ✅ **Apply D8 (RULED — do not re-derive it).** Record `role`/`cohort` as **"Not addressed"** with the
      re-trigger **"the first surface that must target members by `role` or `cohort`"**, and state plainly
      that **AC4's "name a story" clause cannot be met because no story owns the attribute**.
      ⛔ **Mint no successor.** ⛔ **Do not name Story 10.8** (`done`; its "cohort" is a flag-targeting tag,
      not a member attribute — a pointer at a `done` story reads as already-delivered) **or Story 12.2**
      (a consumer of the filter, not the owner of the attribute).
      ⛔ **Do not edit AC4's text.** The disposition is recorded beside it; the AC stands as minted.
- [x] Record **AC8**: Story 12.2 (`epics.md:4569`) as a downstream consumer, in **12.2's own `epics.md`
      section** — a marker pointing at a story whose text never mentions the obligation is exactly how an
      inherited deferral goes unnoticed (the Story 10.13 lesson from 1.18's D9-R).
- [x] Record **D1's ruling**: `packages/domain/src/member-geo/` is **deliberately NOT admitted** to
      `governance_boundary.yaml`'s `prohibited` list, because member attribution is not an authorization
      decision today. ⚠ State the reason **explicitly** — a passing scan over an unlisted root proves the
      root is unlisted, not that the behaviour is admissible (the gate's own README, `:169-174`). Retain the
      **re-trigger verbatim**: *the first authorization or routing consumer of `resolveMemberGeoNode`
      requires reassessment* (Story 10.4's helpdesk geo enrichment, or Story 6.17's block gate).
- [x] ⭐ **MECHANIZE THE RE-TRIGGER — write it into BOTH successors' OWN `epics.md` sections.** D1's
      non-admission is a **standing** obligation, not a one-time act, and nothing enforces it. A re-trigger
      recorded only in `.decision-log.md` and this story decays exactly like an epic-shaped deferral
      ([[project_r7_fact_producer_unbuilt]]) — *a marker pointing at a story whose own text never mentions
      the obligation is how an inherited deferral goes unnoticed.* This is the fix Story 1.18's **D9-R**
      applied to Story 10.13, applied here to its own successors:
      - **Story 6.17** (`epics.md:2707-2735`) — its **AC1 already names 1.19's primitive** (*"block is
        derived via Story 1.19's primitive… the choice is recorded, not assumed"*). Add the
        governance-boundary half it does **not** carry: **if 6.17 derives block via `resolveMemberGeoNode`,
        that read becomes an AUTHORIZATION input** (it feeds `claim.conduct_ground_inspection` at
        `dimension: 'block'`), and `packages/domain/src/member-geo` must then be **re-assessed for admission
        to `governance_boundary.yaml`'s `prohibited` list**. ⚠ 6.17's AC1 offers a genuine choice — the
        obligation binds **only** on the derive-via-1.19 arm, and must say so, or a reader will think a new
        `claim_ground_inspections` column carries it too.
      - **Story 10.4** (`epics.md:3576-3590`) — ⛔ **its section mentions the geo obligation NOWHERE.** The
        seam exists only as a code comment (`apps/api/src/modules/helpdesk/handlers.ts:10-15`: *"that
        enrichment (a member-geo read) lands with the geo-dimension routing consumer (Story 10.4)"*), which
        is precisely the invisible-inherited-deferral shape. Record **both** halves in 10.4's own text: it
        is the named consumer of `resolveMemberGeoNode` for `member_scope_context` enrichment, **and**
        enriching it makes the read a **routing** input, triggering the same re-assessment.
- [x] ⛔ **Do NOT edit either successor's acceptance criteria to add a new AC.** Record the obligation as a
      note in each section, the shape 1.18 used for 10.13. Minting scope into another story's ACs from
      outside is not this story's to do ([[feedback_supersede_never_reinterpret]]).
- [x] ⚠ Both edits land in the **`governance:` commit** with Task 1's other files — ⛔ still zero files under
      `packages/` or `apps/`.
- [x] Commit `governance:`-prefixed.

### Task 2 — The primitive (AC: 1, 2)

- [x] New module `packages/domain/src/member-geo/` (per D1): `resolve.ts` + `types.ts` + `index.ts`.
      Export as `export * as memberGeo from './member-geo/index.js'` in `packages/domain/src/index.ts`
      (alphabetical-ish, beside `member`).
- [x] `resolveMemberGeoNode(db, pariwarId, memberId, tree, now)`:
      - reads the newest posting via **`created_at DESC, posting_id DESC`** (D3);
      - lifts through the **in-force** tree only (D2 above / AC2): `geoTree.loadGeoTree` is the **caller's**
        job, exactly as `scope-resolution/index.ts:71` does it — ⛔ **never load the tree per member**;
      - returns `{pariwar, state, district, block}` where each level is
        `{available: true, value} | {available: false, reason}` (D6's closed union).
- [x] ⛔ **No normalization.** Compare district values **byte-identically** — strict, case-sensitive,
      untrimmed. `member_postings.district` and the tree's node values are both free `text`; the geo-tree
      resolver made exactly this commitment for exactly this reason (`geo-tree/resolver.ts:20-31`), and a
      resolver that case-folds while the tree does not produces a same-request contradiction. **Test the
      agreement explicitly.**
- [x] ⛔ **No `pg` import creep into `@twt/contracts`.** The primitive is domain-only
      ([[project_contracts_domain_bundle_boundary]]).
- [x] Module header states the **D5 resolution matrix** (`block` is permanently absent and why) and the
      **D3 divergence** from `getMemberPostingLatest`.
- [x] Add the divergence note at `member/posting.ts:117-129` too — **comment only, no behaviour change**.

### Task 3 — Tests for the primitive (AC: 1, 2)

- [x] `packages/domain/tests/member-geo/resolve.test.ts` — pure/DB-free where possible (the lift is pure
      once the posting row and tree are in hand; consider splitting `liftDistrictThroughTree` as a pure
      function so most cases need no DB).
- [x] `packages/domain/tests/integration/member-geo/member-geo.spec.ts` — live DB. Cases, each asserted:
      - member with **no posting row** → **no geo at all** (`no-posting-row`), and every consumer reads it
        as *"in no audience"*;
      - Pariwar with **no tree** → district present, `state` **typed-absent** (`no-tree-published`);
      - tree published but district **not a node** → `node-not-in-tree`;
      - **district-only tree** (a real Pariwar shape) → `state` absent with `no-ancestor-at-dimension`;
      - `block` absent with `no-member-attribute` **under a tree that HAS blocks** — the case that proves
        D5 rather than assuming it;
      - two postings sharing `created_at` → the **`posting_id` tie-break** decides (D3);
      - a district differing only by **case** → **not** matched (the no-normalization pin).
- [x] ⚠ Live-DB rules: never regenerate an applied migration; never `DROP SCHEMA`; own-committing writers ⇒
      assert **membership, not counts** ([[project_live_db_test_gotchas]]). Test DB `twt-test-pg`:5433.

### Task 4 — Banners consumer (AC: 3, 5, 6)

- [x] `banners/audience.ts` — grow `isMemberInBannerAudience` per **D4**: a resolved-geo argument, **still
      pure, still synchronous**. Light up `state` by comparing the banner's `audienceScopeValue` against the
      member's resolved `state` — **typed-absent ⇒ `false`**, never `true`.
- [x] ⛔ Preserve the polarity: `public` → **`true`** for banners (`banners/audience.ts:5-12`). Do not
      "harmonize" it with news-blog.
- [x] `banners/read.ts:180-189` — resolve the member's geo **ONCE** in `listMemberBannerCandidates`, then
      filter. ⛔ Not inside the filter.
- [x] `apps/api/src/modules/banners/member-handlers.ts:91-97` — this is a **member** route: it opens its own
      `openScopeTx` and does **not** run `scope-resolution` (which is admin-session-gated,
      `scope-resolution/index.ts:41-45`). ⭐ **So the geo tree must be loaded here**, on `scopeTx.tx`, with
      `deps.clock()`. Follow [[project_helpdesk_member_surface_102]] (member routes own their RLS tx).
- [x] `BANNER_TARGETABLE_AUDIENCE_SCOPES` — add `'state'` to **both** `banners/audience.ts:91` and
      `contracts/src/banners/enums.ts:63`, **same position** (Escalation 2; the sync-guard is an
      order-sensitive `toEqual`).
- [x] `apps/admin/src/modules/banners/derive.ts` — ⛔ **comment edits only**. The indicator follows the
      shared list automatically (`:70-72`).
- [x] ✅ **Escalation 2, absorbed — REQUIRED, not optional.** Explicitly test the **AC5 visibility verdict**
      at `derive.ts:171`: a draft `state` banner is now counted as potentially visible, which changes what
      the console tells an author. It is a real behaviour change and must be **asserted, not discovered**.

### Task 5 — News-blog consumer (AC: 3, 7)

- [x] `news-blog/audience.ts:84-93` — split `state` out of the seam arm. `role`/`cohort` **keep** the seam
      note and the empty set (AC4).
- [x] The `state` arm is **ONE query** (D7 / AC7):
      1. compute the district set beneath the target `state` **in memory** from the in-force tree document;
      2. if the set is **empty** → return `[]` (fail-closed) with a typed log — ⛔ never fall back to
         `members-all`;
      3. one query: active/in-grace members of the Pariwar whose **newest** posting district ∈ that set,
         using the **peer-mesh literal-qualifier correlated subquery** (⛔ not a `Column` interpolation, not
         a fresh `DISTINCT ON`).
- [x] ⛔ Do **not** add a `.limit()` — mirror the existing `members-all` arm (`:75-79`).
- [x] The tree must be loaded on the **job's** scoped tx: `runNewsPublish` already runs inside
      `withPariwarScope` (`news-publish.ts:190-201`, `packages/domain/src/db.ts:161`). Load once inside that
      callback, beside the post read. ⛔ Not once per member.
- [x] ⚠ `resolveAudienceMemberIds` signature grows the tree. **Make it OPTIONAL** so every existing caller
      keeps today's behaviour with no edit — the Story 1.18 `BulkActorContext`/`ReportScopeCtx` posture,
      which is what let 1.18 wire 10 sites without a flag day.

### Task 6 — Tests for both consumers (AC: 3, 4, 6, 7)

- [x] `tests/banners/audience.test.ts` — the `state` matrix incl. **typed-absent ⇒ false**, and that
      `role`/`cohort` still log + return `false`.
- [x] `tests/integration/banners/banners.spec.ts` — end-to-end: two members in **different** districts under
      one tree, one `state` banner, exactly one member sees it. Plus a member with **no posting** seeing it
      **not**.
- [x] `tests/integration/news-blog/news-blog.spec.ts:219-242` — the pinned `state → []` assertion **moves**;
      `role`/`cohort` → `[]` **stay unchanged**. ⛔ State the distinction **per assertion**, not per file —
      a pin that encoded "no attribute exists" is not the same pin as one that encoded "not yet wired".
- [x] `packages/contracts/tests/banners.test.ts:56-62` — the sync-guard must still pass with `'state'` in
      both lists.
- [x] **N+1 proof (AC7):** assert the `state` fan-out issues **one** member query regardless of member
      count (count queries via a spy/`pg` hook, or assert on a seeded population large enough that an N+1
      would time out — prefer the deterministic count).

### Task 7 — Markers, seams, and the quiet-turn-on disposition (AC: 4, 5, 6, 8)

- [x] Rewrite all **six** marker blocks so the **geo half reads as DELIVERED** and the **role/cohort half
      names its owner**. ⛔ Do not collapse the arms into one pointer — the files say so themselves
      (`banners/audience.ts:30`, `news-blog/audience.ts:32-33`).
- [x] **Grep-back:** no `Story 1.19` marker may remain reading as *pending*:
      `grep -rn "Story 1\.19" --include="*.ts" --include="*.tsx" packages apps | grep -v node_modules | grep -v /dist/`
- [x] Apply the **ruled D2 disposition (option (a))**: existing `state`-scoped banners **retain their
      authored status** and become targetable when the arm ships. ⛔ No migration, no status rewrite.
- [x] Record **both** pre-flight results (banners + news posts, AC6-E) in Completion Notes **whether or not**
      any rows were found. A zero result is the evidence that discharges the hazard and must be written down;
      an unrecorded zero discharges nothing.
- [x] Record the AC8 seam (Task 1 committed the governance half; nothing further in code).

### Task 8 — Revert-sanity + verification (AC: 1, 3, 7)

- [x] ⭐ **Two revert probes, run RED, output recorded, then restored** ([[feedback_gate_scope_semantic_coverage]]):
      1. revert the `state` arm to `return false` / `return []` → record which assertions fail;
      2. **corrupt ONE tree edge** (re-parent one district to the wrong state, resolver otherwise intact) →
         record which assertions fail.
      ⛔ **The two failure sets MUST DIFFER.** A suite that only detects *"the arm is unwired"* would stay
      green on a **wrong audience** — which is the failure that actually matters here, because a wrong geo
      audience shows the wrong members a banner rather than showing nobody one.
- [x] A third probe worth its cost: make a typed-absent level **collapse to `null`** and confirm a test goes
      red. AC1's typed-absence is a *contract*, and a contract nothing tests is prose.
- [x] `pnpm ci:local` — all jobs green. ⚠ `git push` runs the full `ci:local` via a pre-push hook (that is
      the "hang") ([[project_friction_budget_baseline_ratchet]]).
- [x] Live-DB **single-pass** (`@twt/domain`, `@twt/api`). ⛔ Do **not** export `DATABASE_URL` globally — it
      runs integration specs twice and produces phantom failures ([[project_ci_local_double_run_pollution]]).
      Confirm any suspect spec's innocence by **running it in isolation**, never by assuming
      ([[project_known_livedb_test_failures]]).
- [x] Record every gate result and test count as a **real local run at this branch's HEAD**. ⛔ Nothing is
      attested that was not run ([[feedback_verify_before_committing_governance_claims]]).

---

## Dev Notes

### Files being MODIFIED — read each before editing

| File | Current state | What changes | What must be preserved |
|---|---|---|---|
| `packages/domain/src/banners/audience.ts` | Pure sync predicate; `state`/`role`/`cohort` → `false` + log; `BANNER_TARGETABLE_AUDIENCE_SCOPES` at `:91` | `state` arm resolves; signature grows resolved-geo (D4); list gains `'state'` | **Purity + synchrony**; `public → true` polarity (`:5-12`); the exhaustiveness `never` guard (`:78-82`) |
| `packages/domain/src/banners/read.ts` | `listMemberBannerCandidates` at `:180` filters with the predicate at `:188` | Resolve geo once, pass it in | The **single-authority** rule (`:20-27`) — audience is applied in TS, never duplicated as SQL; the explicit **LEFT JOIN** for dismissals (`:9-17`) |
| `packages/domain/src/news-blog/audience.ts` | `resolveAudienceMemberIds` at `:66`; seam arm at `:84-93` | `state` resolves via one bounded query | `public → []` polarity; `NEWS_DISPATCH_MEMBER_STATES` = active **+ active-in-grace** (`:47`) — a raw `state='active'` scan silently drops grace members; deliberate **moderation-blindness** (`:6-9`) |
| `apps/api/src/modules/banners/member-handlers.ts` | Member route, own `openScopeTx` (`:92`), `listMemberBannerCandidates` at `:97` | Load the tree on `scopeTx.tx` | The `ok`/`finally` `closeScopeTx` discipline; the 404-not-403 `:pariwarId` mismatch shape (`:73-76`) |
| `apps/jobs/src/scheduler/news-publish.ts` | `withPariwarScope` gate at `:190-201`; audience resolved at `:199` | Load the tree in the same callback | The **per-member idempotency claim before send** (`:210+`) — the at-most-once guarantee; the transition-vs-fan-out separation (`:186-189`) |
| `packages/contracts/src/banners/{enums,dto}.ts` | `:45` / `:43` markers; list at `enums.ts:63` | Comments + `'state'` in the list | ⛔ **No `@twt/domain` import** — RN Metro bundle boundary |
| `apps/admin/src/modules/banners/derive.ts` | `:60-63` marker; `isTargetableAudience` at `:70`; verdict at `:171` | Comments only | ⛔ Browser bundle — no `@twt/domain` (`:11-14`). The verdict consequence at `:171` is **behaviour**, assert it |

### Reuse — do NOT reinvent

- **The newest-posting-per-member read** already exists twice. Use `claim/peer-mesh-read.ts:74-105` as the
  template for the **set** read (correlated scalar subquery, literal outer qualifiers) and
  `member/posting.ts:117-129` as the template for the **single-member** read (adding the D3 tie-break).
- **The tree**: `geoTree.loadGeoTree` (`geo-tree/registry.ts:82-90`) and `geoTree.buildGeoTree`
  (`resolver.ts:92-106`) are done. ⛔ Do not re-parse the JSONB document by hand; ⛔ do not add a `Db`
  parameter to anything in `geo-tree/resolver.ts` (`:8`).
- **The per-request load pattern**: `apps/api/src/middleware/scope-resolution/index.ts:64-71` is the
  canonical shape — load once, close over it, never inside a predicate.
- **The optional-contract-field posture** for widening a shared signature without a flag day: Story 1.18's
  `BulkActorContext` / `ReportScopeCtx` change.

### Anti-patterns this story is specifically exposed to

1. **N+1 in the wrong consumer.** Banners looks like the risky one (a filter over candidates) but is
   per-member; news-blog looks safe (one call) but fans out over **4L members**. Both are covered by D4/D7 —
   in *opposite* directions.
2. **Guessing an ancestor.** A district whose state is unknown is `no-ancestor-at-dimension`, not a lookup in
   some Indian-geography constant. ⛔ There is deliberately **no code default geography** anywhere in this
   system (ADR-0038) — *a wrong tree silently GRANTS; an absent tree merely DENIES.*
3. **Null-collapsing typed absence.** `state: null` and `state: {available:false, reason}` are not the same
   value, and the difference is the entire point of AC1.
4. **Normalizing on one side.** Case-fold the district here and not in the tree, and `Bihar ⊇ patna`
   resolves while `Patna ⊇ patna` does not — the exact contradiction `geo-tree/resolver.ts:20-31` refused.
5. **Treating "no geo" as "all geo".** Fail-closed. A member with no posting is in **no** state audience.
6. **A type-only import becoming a value import** across `member-geo` → `geo-tree`: it materializes a
   module-init cycle that breaks consuming packages at runtime while typecheck, lint and the local suite all
   stay green ([[project_type_only_import_cycle_trap]]). Keep shared types in a leaf module.

### Testing standards

- Vitest. Domain unit tests in `packages/domain/tests/<module>/`; live-DB specs in
  `packages/domain/tests/integration/<module>/` (see `_helpers.ts`).
- Suite-level `{ timeout: 20000 }` for live-DB suites; `--concurrency=4` is already configured
  ([[project_ci_local_concurrency_oversubscription]]).
- Contracts↔domain **test-only** cross-package imports are safe and are how the sync-guard works; source
  imports are not.
- ⚠ The **DATE-BOMB class**: a pinned query instant read against a clock-defaulted seed fails on a *date*, not
  a diff, and a baseline comparison can never see it ([[project_known_livedb_test_failures]] #12). Inject
  `now` into every window-sensitive read — `banners/read.ts` already requires this (`:6-7`).

### Previous-story intelligence (Story 1.18 — `done`, merged `9fa4e31`)

- ⛔ **`pnpm db:generate` MUST NOT be used** for a new migration here: drizzle snapshots stop at `0020`, so it
  emits a ~114 KB full-schema dump. **Hand-author** it per `0100`'s own header. Next free is **`0102`**
  (`packages/domain/migrations/0101_geo-tree-versions.sql` is the highest). ⚠ This story should need **no**
  migration at all — if you find yourself writing one, re-read the scope boundary first.
- Story 1.18's load-bearing property was *"applying this changes NO authorization outcome anywhere."*
  ⭐ **This story does NOT have that property** — it deliberately **changes what members see**. That is the
  whole reason AC6 exists. Do not paste 1.18's reassurance into this story's notes.
- 1.18's code review fixed a **NUL-byte `nodeKey` delimiter** vs a space-delimited `identity()`; the
  unification means `geoTree.nodeKey` (`resolver.ts:68`) is now the single key authority. **Reuse it** if you
  key anything by node.
- 1.18 left `roles.ts:582` future-tense and **fenced from edit**. ⛔ Not this story's either.
- Story 10.27's lesson applies directly: a helper can be **coverage-blind** while the layer above returns
  null, so *every row-returning consumer owes its own gate, asserted not skipped*
  ([[project_missed_cycle_visibility_substrate]]).

### Git intelligence (last 5 commits)

`9fa4e31` (merge) ← `587ef12` `story(1.18): code-review fixes` ← `a586623` `story(1.18): the geo-tree scope
resolver` ← `f3cf933` `governance(1.18): ADR-0038` ← `3fa8d03` `governance(1.18): mint the three Family-B
successors`.

⭐ The **shape** to copy: `governance:` commits carrying **zero** `packages/`/`apps/` files land **first**,
then `story(N):`. History must read governance → implementation
([[feedback_governance_commits_precede_implementation]]). Commit **manually** — branch + selective stage, not
`commit-story` ([[project_story_automator_ops]]).

### Project Structure Notes

- New: `packages/domain/src/member-geo/{index,resolve,types}.ts` + `packages/domain/tests/member-geo/` +
  `packages/domain/tests/integration/member-geo/`.
- Namespace export in `packages/domain/src/index.ts` beside `member` (`:153`) / `geoTree` (`:214`).
- DB columns snake_case, TS camelCase, JSONB inner keys snake_case (architecture L3663-3677).
- No new table, no new column, no new permission key, no `PERMISSION_CATALOG_VERSION` bump — this story
  changes no capability *model*.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:1435-1491`] — Story 1.19 §, the eight ACs
- [Source: `_bmad-output/planning-artifacts/epics.md:4559-4569`] — Story 12.2 targeting wizard (AC8 seam)
- [Source: `_bmad-output/implementation-artifacts/1-18-geo-tree-scope-resolver.md:835-905`] — Appendix A (the minting source)
- [Source: `_bmad-output/implementation-artifacts/1-18-geo-tree-scope-resolver.md:398-412`] — D5, why the six markers are 1.19's
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:4296-4345`] — the three-mint governance table
- [Source: `packages/domain/src/geo-tree/{resolver,registry,document,index}.ts`] — the tree this story reads
- [Source: `packages/domain/src/schema/member_postings.ts:34-66`] — the only per-member geography
- [Source: `packages/domain/src/claim/peer-mesh-read.ts:60-105`] — the proven newest-posting-per-member query
- [Source: `packages/domain/src/banners/{audience,read}.ts`], [`packages/domain/src/news-blog/audience.ts`] — the two consumers
- [Source: `apps/api/src/middleware/scope-resolution/index.ts:19-71`] — the load-once-per-request pattern
- [Source: `governance_boundary.yaml:232-305`] — the prohibited roots + the gate's own README caveat
- [Source: `docs/adr/ADR-0038-geo-tree-scope-resolver.md`] — no code default geography (`drafted`)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via `bmad-dev-story`. Branch
`feature/1-19-member-geo-attribution-geo-audience-consumer` off `main` @ `9fa4e31` (= `origin/main`,
confirmed after `git fetch origin`).

### Debug Log References

**Three revert-sanity probes, each run RED, output recorded, then RESTORED** (Task 8;
[[feedback_gate_scope_semantic_coverage]]). Suite scope for every probe:
`tests/banners tests/member-geo tests/integration/banners tests/integration/member-geo` — **126 tests**
green at baseline.

| Probe | Injected fault | Result |
|---|---|---|
| **1** | the `state` arm reverted to `return false` / `districts = []` in BOTH consumers | **9 failed / 117 passed** |
| **2** | ONE tree edge corrupted — `district=Vaishali` re-parented under `state=UP`, applied in BOTH directions (the ancestry walk *and* the district-set read), resolver otherwise intact | **3 failed / 123 passed** |
| **3** | a typed absence null-collapsed (`no-tree-published` → `null`) | **4 failed / 122 passed** |

⭐ **The two failure sets DIFFER, which is the property that mattered.**

- **Probe 1** (arm unwired): `state` arm resolves · CLOSED-absence-reason log · targetable⇔predicate ·
  the 5 news-blog `state` dispatch tests · the banners end-to-end geo test.
- **Probe 2** (arm wired but WRONG): `districtsBeneathState` expected-set · news-blog "selects EXACTLY
  the members…" · the N+1 proof. **Only 1 of these 3 also fails under probe 1**, so the suite genuinely
  detects a *wrong audience* and not merely an *unwired arm* — the failure that actually matters here,
  because a wrong geo audience shows the WRONG members a banner rather than showing nobody one.
- ⚠ **A finding worth recording:** the `districtsBeneathState` ↔ `liftDistrictThroughTree` **round-trip**
  test stayed GREEN under probe 2. A *consistently* corrupted edge is self-consistent in both
  directions, so a round-trip property can never catch it. What caught it was the **explicit
  expected-set assertion**. A suite relying on round-tripping alone would have passed a wrong tree.
- **Probe 3**: three pure typed-absence assertions + one live-DB one. AC1's typed absence is a
  *contract*, and it is tested rather than merely asserted in prose.

⛔ **Probe residue verified absent** after restore (`grep PROBE-1|PROBE-2|PROBE-3|probeParent` → no
hits), and the 8-file suite re-run green (**139 passed**).

### Completion Notes List

#### ⭐ The mandatory pre-flight disposition (D2 + AC6-E) — DISCHARGED BY EVIDENCE

Both queries were **run**, not assumed, before any code was written. Results recorded **verbatim**:

```
-- D2, over `banners`
SELECT status, (valid_until IS NOT NULL AND valid_until <= now()) AS already_expired, count(*)
FROM banners WHERE audience_scope = 'state' GROUP BY 1, 2;
 status | already_expired | count
--------+-----------------+-------
(0 rows)

-- AC6-E / Escalation 1, over `news_posts`
SELECT status, count(*) FROM news_posts WHERE audience_scope = 'state'
  AND status IN ('draft','submitted','approved','scheduled') GROUP BY 1;
 status | count
--------+-------
(0 rows)
```

⚠ **Environment scope, stated honestly.** The **local dev/test DB (`twt-test-pg`:5433/`twt_dev`) is the
ONLY environment that exists.** `infra/gcp/` authors dev/staging/prod Cloud SQL, but the Terraform has
**never been applied** — no `.tfstate`, **no remote backend block** in any `infra/gcp/*.tf`, no real
`terraform.tfvars` (only `.example`), and no `gcloud` on the workstation. **Verified live rather than
assumed** ([[feedback_verify_before_committing_governance_claims]]). There is therefore no second
environment where the answer could differ.

⇒ **Zero affected rows ⇒ the ruled option (a) applies**: existing `state`-scoped rows **retain their
authored status** and become targetable as the arm ships. ⛔ **No migration was written** and no status
was rewritten. *An unrecorded zero discharges nothing* — which is why it is written down here, in
`.decision-log.md`, and in `deferred-work.md`.

#### The AC5 marker re-derivation (Task 0)

`grep -rn "Story 1\.19" --include=*.ts --include=*.tsx packages apps` at branch point returned
**12 marker lines → 6 subjects across 6 files**, matching the AC5 table **exactly**. **No discrepancy
to record.** (`banners/audience.ts` carries two blocks for one subject — the file header and the
function doc — so a block count and a subject count differ there, as the task warned.)

#### Baseline green, recorded BEFORE any change

`tests/banners/audience.test.ts` **9 passed** · `packages/contracts/tests/banners.test.ts` **38 passed** ·
`tests/integration/news-blog/news-blog.spec.ts` **13 passed**.

#### What shipped

- **The primitive** — `packages/domain/src/member-geo/{types,resolve,index}.ts`, exported as the
  `memberGeo` namespace. `resolveMemberGeoNode` reads the newest posting (**`created_at DESC,
  posting_id DESC`**, D3) and lifts it through the caller's already-loaded tree. Every level is
  independently **typed-absent** with a reason from the **closed five-value union** (D6); `block` is
  **permanently** `no-member-attribute` (D5).
- **Banners** — `isMemberInBannerAudience` grew a **resolved-geo** argument and stayed **pure +
  synchronous** (D4). `listMemberBannerCandidates` resolves geo **ONCE** before filtering, and **skips
  the resolve entirely** when no candidate is `state`-scoped, so the common request path pays nothing.
  The member route loads the tree on its **own** `openScopeTx` with `deps.clock()`.
- **News-blog** — the `state` arm is **ONE query** using the **peer-mesh literal-outer-qualifier
  correlated subquery** (D7), with the district set computed **in memory** from the JSONB document.
  Empty set ⇒ `[]` **fail-closed**, never a `members-all` fallback. **No `.limit()`**, mirroring
  `members-all`. The tree loads once inside `runNewsPublish`'s existing `withPariwarScope` callback.
- **`'state'` added to BOTH targetable lists** in the same position; the order-sensitive sync-guard
  passes.

#### ⚠ Deviations and judgment calls — each deliberate, none silent

1. **`geoTree.parseNodeKey` was ADDED to `packages/domain/src/geo-tree/resolver.ts`** (pure, sync, no
   `Db`). Walking up to the ancestor **at `state`** requires reading a dimension back out of a node
   key. The alternative was re-encoding the NUL delimiter inside `member-geo` — a **second copy of the
   key format**, which is precisely the drift Story 1.18's code review removed when it unified two key
   functions with different delimiters. Keeping it beside `nodeKey` preserves that file as the single
   key authority. ⛔ This is **not** a flag-conditioned change and touches no `GEO_RANK`/`scopeContains`
   ordering, so it does not engage the prohibited-root prohibition (which is about **flag evaluation**
   reaching the module, verified against `governance_boundary.yaml:232-305` and the gate's README).
   The `governance-boundary` gate is green.
2. **`resolveAudienceMemberIds` grew ONE optional `geo: { tree, now }` object, not a bare optional
   `tree`.** ⭐ **This was a correctness fix, found by a failing test, not a style preference.** The
   banners read bounds its newest-posting lookup by its injected `now`; an unbounded dispatch selector
   would have let the **two consumers disagree about a member's current district** — dispatching a post
   to someone the banner predicate then denies. Binding the two into one argument makes "tree without
   an instant" unrepresentable, and keeps `new Date()` out of the domain (`banners/read.ts:6-7`).
   It remains **fully optional**, so every existing caller is unedited (the Story 1.18 posture).
3. **Two stale comments OUTSIDE the six-marker list were corrected**, because this story's own change
   made them false: `schema/banners.ts` and `derive.ts`'s `visibilityVerdict` note both still claimed
   `state`/`role`/`cohort` resolve to visible-to-nobody. Leaving a now-untrue comment in place because
   it was not on the marker list would defeat the point of the marker discipline. `derive.ts` remains
   **comment-only** (verified: the diff contains zero non-comment lines).
4. **Two existing `apps/admin` tests were UPDATED, not deleted** — they asserted the old behaviour
   (`state` never wins the visibility verdict). That is the Escalation-2 change, now asserted
   explicitly in both directions: `state` **competes**; `role`/`cohort` still **cannot**.
5. **The `TARGETABLE ⇔ predicate` invariant was RESTATED** in `tests/banners/audience.test.ts`. Its old
   form (`includes(scope) === predicate(scope, null, silent)`) silently encoded *"targetable means true
   for a member with nothing supplied"*, which breaks the moment a scope depends on member data. It now
   states the property that actually matters: **targetable ⇔ SOME member can see it.**

#### ⚠ A DATE-BOMB, caught and defused

The first end-to-end banners test failed with an empty audience. Cause: `seedMemberPosting` defaults
`created_at` to the **real wall clock** (`_helpers.ts:515`, `Date.now()`), while these reads are bounded
by a **pinned** query instant — so every seeded posting landed in the *future* relative to the query and
silently vanished from the audience. This is exactly [[project_known_livedb_test_failures]] #12: **it
fails on a DATE, not a diff, and a baseline comparison can never see it.** Every posting seed in the new
and touched specs now pins `created_at` explicitly, with the reason stated in-file so it is not
"tidied" away later.

#### `role` / `cohort` — "Not addressed" (D8), and NO successor minted

AC4's *"name a **story**"* clause **cannot be satisfied**: no story owns a member `role`/`cohort`
attribute (verified at `9fa4e31`). Recorded with the re-trigger *"the first surface that must target
members by `role` or `cohort`"*. ⛔ Story 10.8 (`done`, flag-targeting tag) and Story 12.2 (consumer,
not owner) were both explicitly **not** named. ⛔ **AC4's text was not edited.** Every other AC4
obligation is delivered in full, and the *"no attribute exists at all"* distinction is asserted
**per arm**, in every consumer's tests — not stated once per file.

#### Verification — every number below is a real local run at this branch's HEAD

- **`pnpm ci:local` → PASSED, 30/30 jobs green** (`integration-tests` skipped by design in that run;
  covered separately below).
  ⚠ **Recorded honestly:** on the FIRST full `ci:local` the `test (unit)` job failed. It did **not**
  reproduce — a direct `pnpm test` was fully green across every package, and a second full `ci:local`
  was 30/30. The failing suite was **not captured** before the re-run, so it is recorded as an
  **unreproduced flake, not attributed** to a named suite (the [[project_ci_local_concurrency_
  oversubscription]] class). ⛔ Nothing is claimed about it that was not observed.
  ⚠ Two REAL failures were found and fixed by that first run, not waved off: a `tsc` narrowing error on
  `geo.now` (fixed by testing `geo === undefined` explicitly) and its downstream `build`/`crypto-check`
  cascade.
- **Live-DB SINGLE pass** (⛔ `DATABASE_URL` scoped to the command, never exported globally —
  [[project_ci_local_double_run_pollution]]):
  `@twt/domain` **238 files, 2723 passed / 1 skipped** · `@twt/api` **115 files, 944 passed / 1 skipped**.
- New/changed suites: `member-geo/resolve.test.ts` **20** · `integration/member-geo/member-geo.spec.ts`
  **11** · `integration/member-geo/news-blog-state-audience.spec.ts` **7** · `banners/audience.test.ts`
  **25** (was 9) · `integration/banners/banners.spec.ts` **36** (was 33) ·
  `integration/news-blog/news-blog.spec.ts` **13** · `contracts/banners.test.ts` **38** ·
  `admin/banners-derive.test.ts` **23** (was 20).
- ⛔ **No migration written** (next free remains `0102`); no new table, column, permission key, or
  `PERMISSION_CATALOG_VERSION` bump — this story changes no capability *model*.

### File List

**Governance commit (`f263ce4`) — zero files under `packages/` or `apps/`:**

- `.decision-log.md` — Decision `2026-08-13-103` (new head; prior head `2026-08-12-102` verified first)
- `_bmad-output/implementation-artifacts/deferred-work.md` — the six marker dispositions, split into
  geo / role-cohort halves with separate labels; the one non-mint; the standing obligation
- `_bmad-output/planning-artifacts/epics.md` — section notes in Story **6.17**, Story **10.4**, Story
  **12.2** (⛔ no acceptance criteria edited)

**Story commit — new:**

- `packages/domain/src/member-geo/types.ts`
- `packages/domain/src/member-geo/resolve.ts`
- `packages/domain/src/member-geo/index.ts`
- `packages/domain/tests/member-geo/resolve.test.ts`
- `packages/domain/tests/integration/member-geo/member-geo.spec.ts`
- `packages/domain/tests/integration/member-geo/news-blog-state-audience.spec.ts`

**Story commit — modified:**

- `packages/domain/src/index.ts` — `memberGeo` namespace export
- `packages/domain/src/geo-tree/resolver.ts` — pure `parseNodeKey` (deviation 1)
- `packages/domain/src/banners/audience.ts` — `state` arm + resolved-geo arg + `'state'` in the list
- `packages/domain/src/banners/read.ts` — resolve geo once; D8 marker rewritten as delivered
- `packages/domain/src/news-blog/audience.ts` — `state` arm (one bounded query) + `geo` context
- `packages/domain/src/member/posting.ts` — D3 divergence note (⛔ comment only, no behaviour change)
- `packages/domain/src/schema/banners.ts` — stale audience-resolution comment corrected
- `packages/contracts/src/banners/enums.ts` — D14: comment + `'state'` in the mirror list
- `packages/contracts/src/banners/dto.ts` — D15: comment only
- `apps/admin/src/modules/banners/derive.ts` — D16: ⛔ **comment only** (verified)
- `apps/api/src/modules/banners/member-handlers.ts` — load the tree on the member route's own scope tx
- `apps/jobs/src/scheduler/news-publish.ts` — load the tree once in the existing scoped callback
- `packages/domain/tests/banners/audience.test.ts`
- `packages/domain/tests/integration/banners/banners.spec.ts`
- `packages/domain/tests/integration/news-blog/news-blog.spec.ts`
- `apps/admin/tests/banners-derive.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/1-19-member-geo-attribution-geo-audience-consumer.md`

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-13 | 1.0 | **IMPLEMENTED — all 8 ACs satisfied, all 50 task items complete, status → review.** Governance committed FIRST (`f263ce4`, `governance(1.19):`, zero files under `packages/`/`apps/`), then the story code. ⭐ **The quiet-turn-on hazard was discharged BY EVIDENCE, not ceremony:** both mandatory pre-flight queries returned ZERO rows, recorded verbatim, and the environment scope was VERIFIED live — `infra/gcp/` Terraform was never applied (no tfstate, no remote backend, no real tfvars, no `gcloud`), so the local dev DB is the only environment that exists. Ruled option (a) applies and ⛔ **no migration was written**. **Three revert probes run RED and restored**, with **differing failure sets** (9 / 3 / 4): probe 2 proves the suite detects a **wrong audience**, not merely an unwired arm. ⚠ **A finding:** the districtsBeneathState↔lift **round-trip test stayed GREEN under probe 2** — a consistently-corrupted edge is self-consistent in both directions, so only the **explicit expected-set assertion** catches it; a suite relying on round-tripping alone would have passed a wrong tree. ⚠ **A DATE-BOMB was caught and defused:** `seedMemberPosting` defaults `created_at` to the REAL wall clock while these reads are bounded by a pinned instant, so seeded postings landed in the future and silently emptied the audience ([[project_known_livedb_test_failures]] #12 — fails on a DATE, not a diff). ⚠ **Deviations, each deliberate and recorded, none silent:** (1) a pure `parseNodeKey` was added to `geo-tree/resolver.ts` so the NUL delimiter stays in the ONE file that owns it, rather than being re-encoded in `member-geo` — the exact drift 1.18's review removed; (2) `resolveAudienceMemberIds` grew one optional `geo: { tree, now }` object rather than a bare optional `tree`, a **correctness fix found by a failing test** — an unbounded dispatch read would have let the two consumers DISAGREE about a member's current district; (3) two stale comments outside the six-marker list were corrected because this story made them false; (4) two `apps/admin` tests were UPDATED not deleted (the Escalation-2 verdict change, asserted in both directions); (5) the `TARGETABLE ⇔ predicate` invariant was restated to "targetable ⇔ SOME member can see it" — its old form silently encoded an assumption that breaks once a scope depends on member data. **D8 applied as ruled:** `role`/`cohort` recorded "Not addressed", ⛔ no successor minted, ⛔ AC4's text unedited, ⛔ neither Story 10.8 nor 12.2 named. **VERIFICATION:** `pnpm ci:local` **30/30 green**; live-DB single pass `@twt/domain` **2723 passed/1 skipped**, `@twt/api` **944 passed/1 skipped**. ⚠ Recorded honestly: the FIRST `ci:local` had a `test (unit)` failure that did **not** reproduce (direct `pnpm test` fully green; second `ci:local` 30/30) — the suite was not captured before the re-run, so it is logged as an **unreproduced flake, not attributed**; that same run did surface two REAL failures (a `tsc` narrowing error on `geo.now` + its build/crypto cascade), both fixed. | Amelia (Dev Agent) |
| 2026-08-13 | 0.4 | **D8 ruled — the `role`/`cohort` successor-naming clause is closed honestly.** A readiness check surfaced that **AC4 asks for a story name that does not exist**: verified at `9fa4e31`, **no story owns a member `role` or `cohort` attribute**. Story 10.8 (`done`) is *not* the owner — its "cohort" is a *flag-targeting* tag by `pariwar_id`/scope/role/arbitrary tag (`epics.md:115`, FR-58C), and ⛔ pointing a re-deferral at a `done` story is **worse than pointing at an epic**, because it reads as already-delivered. Story 12.2 *consumes* a role/cohort filter but does not **own** the attribute. So the minted AC and the anti-decay discipline pulled against each other, and Task 1 had been leaving that tension for the dev agent to settle — which contradicts this story's own rule that an unruled question is **raised, not settled quietly**. ⭐ **RULED: record `role`/`cohort` as "Not addressed"** ([[feedback_closure_language_precision]], the third label used honestly) **with a concrete re-trigger — *the first surface that must target members by `role` or `cohort`* — and ⛔ mint NO successor**: there is no FR behind the attribute, no live consumer and no backlog consumer, so an owner minted here is the un-gated re-commitment [[feedback_record_unattested_no_backfill]] warns decays. This is the disposition Story 1.18 gave `deferred-work.md:1091`, for the same reason. ⚠ The story now says plainly that **AC4 over-specified** — it assumed a story existed to name — while recording that **every other obligation in AC4 is delivered in full**; only the successor-naming clause cannot be met. ⛔ AC4's text is **not edited** ([[feedback_supersede_never_reinterpret]]); the disposition sits beside it. Task 1's instruction is now **pre-ruled** rather than a judgment call, and names both wrong answers explicitly so neither can be reached for. | BigDev |
| 2026-08-13 | 0.3 | **D1's re-trigger MECHANIZED into both successors** (BigDev, 2026-08-13). D1 is the one ruling that leaves a **standing** obligation rather than a one-time act: it fires at the first authorization/routing consumer of `resolveMemberGeoNode`, in a story nobody has scheduled — so recording it in `.decision-log.md` and this story file alone would let it decay exactly like the epic-shaped deferrals this lineage exists to abolish ([[project_r7_fact_producer_unbuilt]], [[feedback_mechanization_split_commitment]]). **Task 1 now writes the obligation into both successors' OWN `epics.md` sections**, the fix Story 1.18's D9-R applied to Story 10.13 — *a marker pointing at a story whose own text never mentions the obligation is how an inherited deferral goes unnoticed.* ⚠ The two are **not symmetric**: **Story 6.17** (`:2707-2735`) **already names 1.19's primitive** in its AC1, so what it lacks is the governance-boundary half — and because AC1 offers a genuine either/or (a new `claim_ground_inspections` column **or** derive-via-1.19), the obligation must be scoped to the derive arm only. **Story 10.4** (`:3576-3590`) mentions the geo obligation **nowhere at all** — it exists solely as a code comment at `apps/api/src/modules/helpdesk/handlers.ts:10-15`, which is the invisible-inherited-deferral shape in its purest form. ⛔ Neither successor's **acceptance criteria** are edited: the obligation lands as a section note, because minting scope into another story's ACs from outside is not this story's to do ([[feedback_supersede_never_reinterpret]]). Both edits ride Task 1's `governance:` commit — still zero files under `packages/`/`apps/`. | BigDev |
| 2026-08-13 | 0.2 | **All rulings closed; Task 1 unblocked.** ✅ **D1–D7 ruled by BigDev; Escalations 1 and 2 ABSORBED into this story; Escalation 3 informational.** **D1** → `packages/domain/src/member-geo/`, **deliberately NOT admitted** to the prohibited roots, with the decision recorded and the re-trigger retained verbatim: *the first authorization or routing consumer of `resolveMemberGeoNode` requires reassessment.* **D2** → option (a): existing `state`-scoped banners **retain their authored status** and become targetable when the arm ships, **but only after the mandatory pre-flight query is run and its result recorded**; ⛔ **non-zero live/scheduled ⇒ STOP and escalate**, and the state machine is **never** bypassed by a migration (options (b) and (c) are unauthorized). **D3** → `created_at DESC, posting_id DESC`. **D4** → resolved-geo injection; `isMemberInBannerAudience` stays synchronous and pure. **D5** → `block` permanently typed-absent with `no-member-attribute`. **D6** → the closed five-value `reason` union exactly as proposed. **D7** → the peer-mesh correlated-scalar-subquery with literal outer qualifiers. ⭐ **Escalation 1 absorbed** — the pre-flight disposition now extends to unpublished/scheduled `state`-targeted news posts under the identical stop-and-escalate gate, recorded as **AC6-E**, a ruled ADDITION rather than an in-place re-reading of minted AC text ([[feedback_supersede_never_reinterpret]]); already-`published` posts stay out of scope **by evidence** (dispatch is one-shot and never re-fans-out). ⭐ **Escalation 2 absorbed** — both targetable-scope lists gain `'state'` in the same position, **and the admin visibility verdict at `derive.ts:171` is explicitly tested**: it is a real behaviour change and must be asserted, not discovered. **Escalation 3** → informational; use the re-derived current-head anchors, and ⛔ leave the epic's minted AC text unedited. PROVENANCE: rulings are BigDev's, recorded verbatim in intent. Every code fact cited remains commit-pinned at `9fa4e31`. **NOTHING is attested by a test run — still an authoring pass.** | BigDev |
| 2026-08-13 | 0.1 | Story created (`bmad-create-story`) off `main` @ `9fa4e31`. Eight ACs reproduced from `epics.md:1435-1491` with line anchors **re-derived at `9fa4e31`**. **Seven decisions raised (D1, D2, D6 BLOCKING) and three escalations, none absorbed.** ⭐ Load-bearing findings: (D4) `isMemberInBannerAudience` is a **pure sync predicate called inside a `.filter()`**, so AC3's "grows a member argument" must be a *resolved geo*, never a `Db` — otherwise the banners consumer acquires the very N+1 AC7 forbids in the other consumer; (D5) **`block` can NEVER be populated** — a posting supplies a district and ancestry walks *up*, so `block` is permanently typed-absent and needs its own `reason`, or a future reader will believe a richer tree lights it up; (D2) **`published → draft` is not a legal banner transition**, so AC6's "require re-confirmation" cannot be a plain migration — recommended disposition is *publish*, **gated on a mandatory pre-flight count**; (Esc. 1) news-blog's **`scheduled`** posts carry the same quiet-turn-on hazard AC6 names only for banners; (Esc. 2) the targetable-scopes list has a **third** consumer — the AC5 visibility verdict at `derive.ts:171` — and its sync-guard is **order-sensitive**; (D3) the repo's two newest-posting readers **disagree on tie-break**. PROVENANCE: every line number, count and file fact is commit-pinned at `9fa4e31` on a clean tree, read from source. **No code was written, no gate was run** — this is an authoring pass only. | BigDev |

### Review Findings

Reviewed diff `9fa4e31...dc25916` (branch `feature/1-19-member-geo-attribution-geo-audience-consumer`) via three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor found **zero AC/Decision/Escalation violations** — every AC1–AC8, D1–D8, and both absorbed Escalations verified compliant against the shipped code. All findings below come from the Blind Hunter and Edge Case Hunter layers; each was independently re-verified against source before triage.

#### Patch

- [x] [Review][Patch] Duplicate import split for `members`/`MemberLifecycleState` from the same module [packages/domain/src/news-blog/audience.ts] — combined into one import.
- [x] [Review][Patch] No genuine cross-tenant regression test for the new member-geo read paths — the "is tenant-scoped" test uses a nonexistent member id rather than seeding a second real Pariwar; zero `PARIWAR_B`-equivalent references anywhere in the new specs, despite `news-blog/audience.ts`'s own comment calling out that exactly this class of query previously produced a silent ~30-40% wrong-district bug DB-free tests can't see [packages/domain/tests/integration/member-geo/member-geo.spec.ts:226, packages/domain/tests/integration/member-geo/news-blog-state-audience.spec.ts] — added a genuine `PARIWAR_B` same-district cross-tenant test to both specs (RLS-gated, not id-mismatch-gated); all pass live.
- [x] [Review][Patch] Conflated diagnostic log message — the `'state'` case logs the same message ("member geo unresolved") for two distinct denial causes (member geo genuinely unresolved vs. banner missing `audience_scope_value`), undercutting the closed-vocabulary/greppable-by-cause discipline D6 establishes elsewhere in this file [packages/domain/src/banners/audience.ts:86-91] — split into two distinct log messages, one per cause.
- [x] [Review][Patch] Dead exports `geoValueOrNull` and `MemberGeoDimension` — defined but never imported or called anywhere in the diff or the rest of the tree [packages/domain/src/member-geo/types.ts:85,104] — removed (plus the now-unused `GeoTreeNodeDimension` import).
- [x] [Review][Patch] D3 tie-break (`created_at DESC, posting_id DESC`) is implemented independently in two places — Drizzle `.orderBy()` in `getMemberCurrentDistrict` and a hand-written `ORDER BY` in the news-blog correlated subquery — with no comment cross-referencing them, unlike the file-header's existing cross-reference to `claim/peer-mesh-read.ts` [packages/domain/src/member-geo/resolve.ts:26-34, packages/domain/src/news-blog/audience.ts:165] — added reciprocal cross-reference comments at both sites.
- [x] [Review][Patch] Round-trip test only exercises `districtsBeneathState(FULL_TREE, 'Bihar')`; the fixture's second state (`UP`/`Lucknow`) is defined but never round-tripped [packages/domain/tests/member-geo/resolve.test.ts] — extended to round-trip both states.

#### Defer

- [x] [Review][Defer] The `listMemberBannerCandidates`-scoped comment "the common request path pays NOTHING" is accurate for the per-candidate geo resolve it describes, but both real callers (`apps/api/src/modules/banners/member-handlers.ts:106`, `apps/jobs/src/scheduler/news-publish.ts`) call `loadGeoTree` unconditionally on every request/job regardless of whether any audience is `state`-scoped — a modest, pre-existing-pattern (mirrors 1.18's admin scope-resolution middleware) per-request query cost not captured by the comment's scope — deferred, non-blocking optimization/doc nuance
- [x] [Review][Defer] `ancestorAtDimension`/`districtsBeneathState`'s `steps < tree.parents.size` cycle guard (defensive against a malformed/cyclic persisted tree, mirroring `createGeoTreeResolver`'s Story 1.18 pattern) is never exercised by a test that actually constructs a cyclic document — deferred, pre-existing gap class, non-blocking
- [x] [Review][Defer] `member_postings.district` is `text NOT NULL` with no empty-string guard at the DB or domain-read layer; the only write path (`POST /member/life-events/posting`) already enforces non-empty via `z.string().trim().min(1)` at the contract boundary, so this is a theoretical defense-in-depth gap, pre-existing to this diff (schema unchanged by Story 1.19) — deferred, not introduced by this change

#### Dismissed as noise (4)

- Hardcoded literal `"members"."member_id"`/`"members"."pariwar_id"` SQL qualifiers — this is D7's **required** fix for the proven Epic 6 correlated-subquery tautology bug, not an oversight (confirmed against `.decision-log.md` and cross-checked by the Acceptance Auditor)
- `districtsBeneathState`'s "understated as cheap" complexity claim — the geo tree has exactly 3 fixed dimensions (`state`/`district`/`block`; `packages/domain/src/schema/geo_tree_versions.ts:59`), so every ancestor chain is depth-bounded by a small constant in valid data; the `tree.parents.size` loop bound is a defensive cycle guard, not the actual expected complexity
- N+1 proof tested only at n=2/n=12, not "4L members" scale — the property under test (query count stays flat) does not change with member count, so the test already proves what it needs to; true 400K-row load testing isn't this suite's job
- Newest-posting row with `is_retirement=true` treated as an ordinary current district — no spec, AC, or domain-model text requires excluding retirement-flagged rows from current-district resolution; `is_retirement` only anchors a distinct fact (Story 3.9/4.5's retirement date), the row's `district` value is still a real, required, non-PII posting location

**Review layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor — all three completed, none failed.
**Totals:** 0 decision-needed, 6 patch, 3 deferred, 4 dismissed.
