---
baseline_commit: 63c844ee253bbb699ff1a4c55ba42ceab9878de0
---

# Story 1.18: Geo-Tree Scope Resolver `[PRIMITIVE]`

Status: review

> ⚠ **WHY THIS STORY SITS IN A RETROSPECTED EPIC.** `epic-1-retrospective` is `done`. The placement is
> deliberate: this story extends the RBAC scope-containment model **Story 1.8 minted**
> (`packages/domain/src/rbac/`), and the rule Story 10.18 established is that *a successor belongs to the
> epic that owns the model it extends, at that epic's next free sequential number.* It is **not** an Epic 3
> story — Epic 3 supplies the geo *data*, and that is exactly the dependency whose arrival was mistaken for
> the fix. Do not "correct" this into whichever epic happens to be open.
> **Minted by Story 10.18 (Decision `2026-08-10-096`); `deferred-work.md` D1-1.8 (`:1710`).**

## Story

As Solo Builder and every epic that has deferred a geographic authorization check since Epic 6,
I want a real organizational-tree resolver behind the `scopeContains` seam,
so that a grant held at a broader geographic node can authorize an action targeting a node genuinely
beneath it, instead of failing closed at `denyDeeperGeoResolver`.

---

## ⛔ SCOPE BOUNDARY — Family B ONLY

Story 10.18 split the accumulated geo-deferral debt into two families and rewrote the first **in place**.

**Family A (24 blocks) is NOT this story's and must not be re-opened.** Where a grant's `scopeCeiling` is
`state`/`district`/`block` and the check runs at `dimension: 'pariwar'`:

- `scopeWithinCeiling(dimension, ceiling)` (`scope.ts:113-118`) reads **`CEILING_RANK`** and is a pure
  numeric compare with **no resolver parameter**: `scopeWithinCeiling('pariwar','state')` → `1 >= 2` → false.
- `scopeContains` denies independently at **`scope.ts:232`** (`if (tRank < gRank) return false;`), which runs
  **before** any resolver is consulted.

**No org tree, however complete, changes either line.** Those sites were misdiagnoses, not pending work, and
`scope.ts` **§RANK-ORDER** (`:69-106`) now says so canonically. This story fixes only the sites where grant
and target are **in the same tree with the target strictly narrower**.

**Also out of scope (recorded, not silently dropped):**

| Not this story | Why |
|---|---|
| Re-ranking `pariwar` vs `state` in `GEO_RANK`/`CEILING_RANK` | Architectural **freeze row 9** (`epics.md:527`). Would silently re-authorize every grant. ADR + own story. |
| Changing `scopeContains`'s ordering or the permission-key / scope-dimension model | Freeze row 9. |
| Minting any new permission key or bumping `PERMISSION_CATALOG_VERSION` | This story changes no capability *model*; it implements a seam. |
| Member **audience** geo selection (banners / news-blog) | Needs a per-**member** geo attribute, not an org tree. See D5. |
| Multi-node (`IN`-list) report scope | Independent capability. AC4 requires a **disposition**, not necessarily a build. See D6. |
| A cross-Pariwar / national tree | `pariwar` is the tenant and outranks `state`; each Pariwar owns its own subtree. |

---

## Acceptance Criteria

### AC1 — The org tree exists, its shape is an explicitly recorded decision, and the seam is unchanged

**Given** `denyDeeperGeoResolver` (`packages/domain/src/rbac/scope.ts:172-174`, `contains: () => false`) is
the only implementation of the resolver seam, and `member_postings.district` has been live since Story 3.1/3.9

**When** a real resolver is built

**Then** an organizational-tree source of truth exists (`pariwar → state → district → block`), with an
**explicit answer recorded** for whether it is a new table, a projection over `member_postings`, or a
configuration artifact — recorded in **ADR-0038** + a `.decision-log.md` entry, not inferable from the diff

**And** the recorded answer states, on evidence, **why the two rejected options were rejected** — in
particular that a projection over `member_postings` can supply the *set* of district values in use but
**no edge whatsoever** (`members`/`member_postings` carry no `state` and no `block` column anywhere in the
schema; verified at `0100`)

**And** the resolver implements `contains(grantNode, targetNode)` by **genuine ancestry**, replacing the
fail-closed default

**And** the seam's injection point is unchanged — `GeoTreeResolver`'s interface, `GEO_RANK`, `CEILING_RANK`,
`scopeContains`'s ordering, and the permission-key/scope-dimension model are **architectural freeze row 9**
and are **not** modified

**And** `denyDeeperGeoResolver` remains **byte-unchanged** and remains the default when no tree is published,
so a Pariwar with no tree behaves **exactly as it does today**

### AC2 — `hasPermission` stays pure and synchronous

**Given** `hasPermission` is documented and tested as a **PURE, side-effect-free predicate**
(`check.ts:9-11`, ADR-0008 Decision 8) and `GeoTreeResolver.contains` is **synchronous**

**When** the resolver lands

**Then** no DB call, `await`, or I/O is introduced inside `scopeContains`, `hasPermission`, or the resolver's
`contains` — the resolver is constructed from an **already-loaded in-memory tree snapshot**

**And** the tree is loaded **once per request** at the same place `scopeGrants` is loaded
(`apps/api/src/middleware/scope-resolution/index.ts:52`), never per permission check

**And** a test asserts `contains()` performs no I/O for a tree of realistic size (a pure-function
call-count/timing assertion or an injected-loader spy that must not fire)

### AC3 — Every authorization call site gets the same resolver, or the divergence is stated

**Given** `requirePermissionHook` (`apps/api/src/modules/rbac/index.ts:108-118`) passes only
`onAuthorizationDenied` into the domain guard, and **nine further call sites** evaluate authorization
independently — verified at `63c844e`:

| # | Site | Today |
|---|---|---|
| 1 | `apps/api/src/modules/rbac/index.ts:108` `requirePermissionHook` | ctx = `{onAuthorizationDenied}` only |
| 2 | ″ `:181` `requireGlobalPermission` | `global` dimension — resolver irrelevant |
| 3 | ″ `:240`/`:245` pariwar-or-global gate | `hasPermission`, no ctx |
| 4 | `apps/api/src/modules/trustee-lite/handlers.ts:143` | `hasPermission`, no ctx |
| 5 | `apps/api/src/modules/member-moderation/handlers.ts:335` | pariwar dimension |
| 6 | `apps/api/src/modules/multi-tenant/index.ts:49` | grant projection |
| 7 | `apps/api/src/modules/rules/index.ts:104` | `hasPermission`, no ctx |
| 8 | ⭐ **`packages/domain/src/bulk-operations/execute.ts:164`** | `checkPermission` **with no ctx** — per-item, `locator.dimension` is often `district` |
| 9 | ⭐ **`packages/domain/src/reports/assemble.ts:44`** | `checkPermission` **with no ctx** |
| 10 | `apps/jobs/src/reports-export.ts:164` | build-time re-resolution |

⭐ **Sites 8 and 9 are inside `@twt/domain`, not the HTTP adapter.** Reaching them means threading the
resolver through `BulkActorContext` (`bulk-operations/types.ts:125`) and `ReportScopeCtx`
(`reports/types.ts`) — a contract change in two packages, not a one-line wiring. **Do not discover this at
Task 5.**

**When** the resolver is wired

**Then** each site either receives the resolver or is **listed by file:line with a stated reason** why it
does not — because a resolver wired at some sites and not others makes authorization **route-dependent**,
which is a silent privilege asymmetry and worse than not shipping it

**And** the reach of the wiring is stated in the story's Completion Notes, not implied

### AC4 — The nine deny-deeper pins are revisited **per pin**, with the distinction stated

**Given** the nine pins Story 10.18 froze (`scope.test.ts:98`; `check.test.ts:184`, `:64`, `:439`, `:479`,
`:508`, `:539`; `bulk-operations/execute.test.ts:240`; `integration/reports/reports.spec.ts:124`)

**When** the resolver lands

**Then** each pin is **revisited explicitly** — a pin that encoded *"deny because no resolver exists"* is
updated with its new expected behaviour; a pin that encoded the **rank-order asymmetry** stays
**unchanged**, because that asymmetry is unaffected by this story

**And** the distinction is **stated per pin, not inferred** — a written disposition line for all nine

**And** ⭐ where a pin's **prose** misattributes a rank-order denial to the missing resolver, the prose is
corrected even though the assertion stands (see **D2** — `check.test.ts:184` is exactly this case)

### AC5 — All 21 Family-B markers are resolved or re-deferred to a **named story**

**Given** the 21 Family-B marker blocks Story 10.18 re-pointed here (table below)

**When** this story completes

**Then** every one of them is revisited and either **resolved** or **re-deferred with a named story
successor** — **never an epic**, and never a bare "future work"

**And** any story named as a successor **exists in `sprint-status.yaml`** at the time the marker is written,
minted in its own `governance:` commit **before** the marker points at it — the owner must exist before
anything points at it (the Story 10.18 mint precedent)

**And** `deferred-work.md` **D1-1.8** (`:1710`) is **closed or re-scoped explicitly**, using
[[feedback_closure_language_precision]] vocabulary (*"Closed by [edit]"* / *"Resolved via explicit deferral"* /
*"Not addressed"*) — never collapsed

**And** the two other re-pointed `deferred-work.md` entries are dispositioned in the same pass:
`:1091` (unresolved target locator / `global` carve-out) and `:3432` (multi-node report scope → **10.28**)

**And** the **approved dispositions are the only permitted ones** (ruled 2026-08-12) — no marker may invent a
different successor:

| Marker(s) | Disposition | Owner |
|---|---|---|
| S1, S2, S3, D1, D3, D4, D5, P2, P8, R12 | **resolved** | — |
| P1, R11 | **rewritten in place** as rank-order (D2) | — |
| S4 | **Closed by [edit]** — no successor (D4-R) | — |
| D6, D7, D8, D14, D15, D16 (geo half) | re-deferred | **Story 1.19** |
| D2's block-gate question | re-deferred | **Story 6.17** |
| marker D2 / `deferred-work.md:3432` | re-deferred | **Story 10.28** |
| D9 (directory half) | re-pointed | **Story 10.13** *(exists)* |
| `role` / `cohort` audience arms | stay seamed, named owner | **Story 1.19 AC4** |

### AC6 — Multi-node report scope is **dispositioned to Story 10.28**, not built here

**Given** `packages/domain/src/reports/scope.ts` resolves an actor's report scope to a **single** node
(`resolveActorReportScope`, the `v1 LIMITATION` comment at `:67-72`)

**When** the resolver lands

**Then** the limitation recorded at `deferred-work.md:3432` is **re-deferred to Story 10.28**, its
**permanent** owner (ruled 2026-08-12) — ⛔ **this story does not extend `ResolvedReportScope`'s
cardinality**, even if it looks cheap after the ancestry work

**And** the `v1 LIMITATION` comment at `reports/scope.ts:67-72` is rewritten to name Story 10.28 and to stop
describing the horizon as *"the same deferral horizon as deny-deeper geo"* — that horizon arrives with this
story and the limitation outlives it

**And** because ancestry now makes a *broader* report scope reachable where it previously denied,
`reports/templates/_shared.ts:40`'s `deny` branch **is** re-examined and its behaviour re-pinned — that
examination is in scope; the cardinality change is not

### AC7 — The resolver cannot be weakened by a feature flag, and the gate proves it

**Given** `packages/domain/src/rbac` and `apps/api/src/modules/rbac` are **prohibited roots** in
`governance_boundary.yaml` (`:238`, `:289`) — no feature-flag evaluation may reach inside them

**When** the resolver + its wiring land

**Then** neither the resolver, the tree loader, nor the injection site reads a feature flag, and
`pnpm governance-boundary:check` (leg b, the load-bearing one) passes over the **new** files

**And** if the tree loader lands in a **new** domain directory, that directory is evaluated for admission to
the `prohibited` list, and the answer is recorded either way — a passing scan over an **unlisted** root
proves the root is unlisted, not that the behaviour is admissible (the gate's own README, `:169-174`)

### AC8 — Revert-sanity: the new coverage has teeth

**Given** [[feedback_gate_scope_semantic_coverage]] — a green scan proves nothing without a revert probe

**When** the ancestry tests land

**Then** at least one new assertion is **probed RED** by temporarily reverting the resolver to
`contains: () => false`, the failure output is recorded, and the revert is undone

**And** at least one assertion is probed RED by corrupting a single tree **edge** (not the whole resolver),
proving the tests discriminate ancestry rather than merely "a resolver is present"

---

## 🔍 THE TABLE — 21 Family-B blocks, line numbers **re-verified at `63c844e`**

> ⚠ Story 10.18's Task 7 table carries **post-Task-4/5/6 line numbers that have since drifted.** The
> numbers below were re-derived on a clean tree at `63c844e`. **Re-derive again before Task 6** with:
> `grep -rn "Story 1\.18" --include="*.ts" --include="*.tsx" packages apps | grep -v node_modules | grep -v /dist/`
> (28 marker **lines** → 21 **blocks**; one block per deferral subject.)

| Label | File | Line(s) @ `63c844e` | Subject | Expected disposition |
|---|---|---|---|---|
| **P1** | `packages/domain/src/rbac/permissions.ts` | 122 | `claim.conduct_ground_inspection`, `block_admin` → district | ⛔ **MISCLASSIFIED — see D2** |
| **P2** | ″ | 162 | `claim.verify`, `state`→`district` console (D3a) | ✅ genuine Family B |
| **P8** | ″ | 519 | `state`→`district` check | ✅ genuine Family B |
| **R11** | `packages/domain/src/rbac/roles.ts` | 414 | `block_admin` ancestry | ⛔ **MISCLASSIFIED — see D2** |
| **R12** | ″ | 460 | `verifier` `state`→`district` (D3a) | ✅ genuine Family B |
| **S1** | `packages/domain/src/rbac/scope.ts` | 29 | injectable geo-tree seam (header) | ✅ resolve |
| **S2** | ″ | 157, 159 | canonical org tree / `GeoTreeResolver` doc | ✅ resolve |
| **S3** | ″ | 170 | `denyDeeperGeoResolver` doc comment | ✅ resolve *(doc only — see D3)* |
| **S4** | ″ | 218 | `self` target fail-closed until org tree | ⚠ **NOT resolvable by this story — see D4** |
| **D1** | `packages/domain/src/reports/scope.ts` | 16 | district-narrowing below ceiling | ✅ resolve |
| **D2** | ″ | 71 | multi-node scope | → **AC6 / D6** |
| **D3** | `packages/domain/src/reports/templates/_shared.ts` | 5, 24, 40 | deny-deeper narrowing | ✅ resolve |
| **D4** | `packages/domain/src/reports/templates/member-roster.ts` | 44 | deny-deeper | ✅ resolve |
| **D5** | `.../reports/templates/contribution-rate-by-district.ts` | 45 | deny-deeper | ✅ resolve |
| **D6** | `packages/domain/src/news-blog/audience.ts` | 17, 19 | geo/designation selector | ⚠ **re-defer — see D5** |
| **D7** | `packages/domain/src/banners/audience.ts` | 18, 40 | geo/designation selector | ⚠ **re-defer — see D5** |
| **D8** | `packages/domain/src/banners/read.ts` | 23 | geo selector drift | ⚠ **re-defer — see D5** |
| **D9** | `packages/domain/src/pool/fixed-amount.ts` | 78 | trustee directory + geo resolver *(compound)* | ⚠ **split** — resolver half here, directory half re-deferred |
| **D14** | `packages/contracts/src/banners/enums.ts` | 45 | selection primitive | ⚠ **re-defer — see D5** |
| **D15** | `packages/contracts/src/banners/dto.ts` | 43 | selection primitive | ⚠ **re-defer — see D5** |
| **D16** | `apps/admin/src/modules/banners/derive.ts` | 60 | selection primitive | ⚠ **re-defer — see D5** |

**Two marker lines are NOT Family B and must not be touched as such:**

- `scope.ts:95` — inside **§RANK-ORDER**; names Story 1.18 to say *where Family B lives*. Family-A prose.
- `roles.ts:582` — the `trustee_panel` bundle note; says the pariwar ceiling *"must not be re-read as a
  workaround when that resolver lands (Story 1.18)"*. **That sentence becomes load-bearing the moment this
  story lands** — it is the exact misreading this story could trigger. Leave it, and do not weaken it.

⚠ **Label collision, stated so it cannot bite:** Story 10.18's *Decisions* `D1…D6` and its Task-7 *marker
labels* `D1…D16` are two different namespaces. `10.18 D6` = *"do not touch `GEO_RANK`…"*; `marker D6` =
`news-blog/audience.ts`. This story's own decisions are numbered `D1…D7` in yet a third namespace. Always
qualify.

**Excluded and settled — do not re-litigate:** `packages/domain/src/schema/cycle_freeze_commits.ts:23` is an
**FK-posture** note, not a geo-deferral. Do not edit it.

---

## 🚨 Decisions — **ALL RULED BY BIGDEV 2026-08-12. Nothing here is open.**

> ✅ **D1–D7 and the three refinements (D4-R, D9-R, D7-R) are all ruled.** Implement as written. Do not
> re-litigate any of them, and do not settle an *unruled* question quietly — raise it instead.
>
> ✅ **Task 1 is UNBLOCKED.** Successor scope + ACs are approved and reproduced verbatim in **Appendix A**;
> mint from that text, do not re-derive it.
>
> **Ruling summary — the disposition of every re-deferral:**
> **D4-R** → S4 *closed by edit*, **no successor**. **D9-R** → D9's directory half re-points to **existing
> Story 10.13**, no mint. **D7-R** → **three** mints: **1.19**, **6.17**, **10.28**.
> ⛔ **D6's *"unless it falls out cheaply"* branch is CLOSED** — Story 10.28 is the *permanent* owner of
> multi-node report scope, so this story dispositions it and never builds it.

### D1 — The org tree is a **versioned per-Pariwar registry table holding a JSONB tree document**, with **no code default**

**Recommended.** AC1 demands an explicit answer among *new table / projection over `member_postings` /
configuration artifact*. On the evidence:

- **Projection over `member_postings` — IMPOSSIBLE, not merely undesirable.** `member_postings` carries
  `district text NOT NULL` and nothing else geographic (`schema/member_postings.ts:51`). There is **no
  `state` column and no `block` column anywhere in the schema** — `helpdesk_tickets`'
  `MemberScopeContextSnapshot` (`:83-89`) *declares* `state`/`district`/`block`, and the producer leaves
  **all three null** (`apps/api/src/modules/helpdesk/handlers.ts:10-15`). A projection can enumerate the
  district values in use; it can supply **zero edges**. Ancestry cannot be projected from data that records
  no parent.
- **A code constant alone — rejected.** There is no universally-correct Indian state→district→block tree,
  and the tenant model puts each Pariwar *above* its geography. A wrong seeded tree silently **grants**
  authority; an absent one merely denies. Fail-closed must be the resting state.
- **Recommended shape:** `geo_tree_versions` — the **exact `helpdesk_routing_policy_versions` posture**
  (`packages/domain/src/helpdesk/registry.ts:1-19`) which is itself the `clause_versions` posture: append a
  new version row, never mutate a prior one except its `superseded_by_version` forward pointer;
  `(pariwar_id, version)` is unambiguous; one JSONB document per row. **Unlike routing policy, there is no
  version-1 code default** — a Pariwar with no row has **no tree**, the loader returns `null`, the caller
  passes no resolver, and `denyDeeperGeoResolver` applies. **Today's behaviour, byte-identical, by
  construction.**

**Consequence if BigDev rules otherwise:** a `geo_nodes` row-per-node table works too but costs an N-query
walk or a recursive CTE per request; the single-document read is what keeps AC2's purity cheap.

### D2 — ⛔ **P1 and R11 are MISCLASSIFIED. `block_admin` → district is RANK-ORDER, and no resolver lifts it.**

**This is the story's most consequential finding and it contradicts its own source.**

Story 10.18 placed **P1** (`permissions.ts:122`) and **R11** (`roles.ts:414`) in Family B, writing that
*"`block`→parent-`district` is same-tree ancestry with the target strictly narrower."* **The target is not
narrower — it is the parent, hence broader.** Traced at `63c844e`:

- `GEO_RANK` (`scope.ts:56-62`): `global:0, pariwar:1, state:2, district:3, block:4`. **Lower = broader.**
- Grant `{block,'Block-1'}` → `gRank = 4`. Target `{district,'Patna'}` → `tRank = 3`.
- `scope.ts:232`: `if (tRank < gRank) return false;` → `3 < 4` → **denied, before the resolver is reached.**
- The alternative — granting `block_admin` a district-scoped grant — fails the other line:
  `scopeWithinCeiling('district','block')` → `CEILING_RANK` `3 >= 4` → **false**.

Both denial paths are resolver-free. `contains(ancestor, descendant)` can only ever answer *"is X beneath
Y"*; P1/R11 need the opposite. **This is Family A wearing a Family-B label**, and re-pointing it here
preserved the very error Story 10.18 existed to remove — one epic later, under a fresher date.

**Recommended disposition:** rewrite P1 and R11 **in place** to the rank-order reason, citing
`scope.ts` §RANK-ORDER — the same treatment Story 10.18 gave the other 24. `check.test.ts:184`'s assertion
**stands unchanged**; its *comment* (*"no geo-tree resolver maps block→parent-district yet"*) repeats the
misdiagnosis and is corrected (AC4). Also correct the ACCEPTANCE CONDITION prose at `permissions.ts:130-133`
and `roles.ts:416-419`, which promises block_admin support *"when the authorization layer can resolve a
block grant through verified block→district ancestry"* — that is not a thing this model can do.

⚠ **The honest path for FR-40's block-level actor is a different gate, not a resolver:** re-gating
ground-inspection at `dimension: 'block'` against a block value the inspection does not currently carry
(`claim_ground_inspections` has `district text NOT NULL` and no block column, `:116`). That is a schema +
gate-design change and **belongs to a named story, not to this one.** Re-defer it under AC5.

**Consequence:** if BigDev rules P1/R11 stay in Family B, this story cannot discharge them and must say so
explicitly rather than write a resolver that appears to cover them.

### D3 — `denyDeeperGeoResolver` stays; only its **doc comment** changes

**Recommended.** Story 10.18's D6 froze the const byte-unchanged. That freeze had a deadline — this story —
but the *const itself* should still not change: it remains the correct fail-closed default for every Pariwar
with no published tree (D1), and the nine pins depend on it. **S3 is a documentation edit only**: the comment
says *"until Story 1.18 builds the org tree"*, which becomes false. Rewrite to state that it is the standing
default when no tree is published, not a placeholder.

### D4 — **S4 (`self` targets) is NOT discharged by this story.** ✅ **RULED: close by edit, NO successor.**

**Recommended.** `scope.ts:218-221` denies a `self` target to any grant narrower than `pariwar`, and the
comment blames *"Story 1.18's org tree + a richer self-resolution."* But `GeoNode` **excludes `self` by
type** (`scope.ts:149`), and `self` is deliberately outside `GEO_RANK` (`:50-55`) — *"orthogonal to the geo
tree: own records only, not a node in it."* Placing a self-target in the tree requires a **member → geo
attribution** capability (which member sits in which district — a `member_postings` read), which is a
different primitive and would put an I/O dependency inside a pure predicate (AC2).

⛔ **SUPERSEDED BY D4-R (ruled 2026-08-12).** D4's original disposition — *"re-defer the self-resolution
half to a named story"* — is **withdrawn**. Kept visible rather than deleted, because the reason it was
wrong is the point: it assumed a consumer without checking for one.

#### ✅ D4-R — **RULED 2026-08-12: S4 is *"Closed by [edit]"*. NO successor is minted.**

Scoping the successor turned up evidence D4 did not have. **There is exactly ONE live `dimension: 'self'`
check in the repo** — `apps/api/src/modules/member-validity/handlers.ts:132` — and it passes
**`grants: []` with `isSelf: true`**, bypassing the grant path entirely. So the branch S4 defers
(`scope.ts:219-221`: a narrower-than-`pariwar` grant reaching a `self` target) has **zero live consumers,
zero backlog consumers, and no FR behind it**.

`scope.ts:50-55` already states the design fact: `self` is *"orthogonal to the geo tree — own records only,
not a node in it,"* and `GeoNode` excludes `self` **by type** (`:149`). The comment's forward promise is not
a deferral; it is a **misdescription of a deliberate design choice**.

Minting an owner for work nobody has asked for manufactures exactly the un-gated re-commitment
[[feedback_record_unattested_no_backfill]] warns decays.

**RULED (BigDev, 2026-08-12):** *"Close S4 by edit. Do not mint a successor. `self` is intentionally
orthogonal to the geo-tree model and has no current or backlog consumer requiring a resolver."*

**Required edit at `scope.ts:216-221`:** delete the forward promise (*"until Story 1.18's org tree + a richer
self-resolution lands"*) and replace it with the design fact — `self` is not a node in the geo tree
(`:50-55`), `GeoNode` excludes it by type (`:149`), a `pariwar` grant reaches a self target and nothing
narrower does, **by design and not pending anything**. `deferred-work.md` records it **"Closed by [edit]"**
([[feedback_closure_language_precision]]).

⛔ **Do not weaken the behaviour** — the deny stays. This is a comment correction, not a logic change. If a
`self`-scoped actor ever becomes real (`field_worker`, `scopeCeiling: 'self'`, permissions currently empty),
that story raises it with a live requirement attached.

### D5 — The **six banners / news-blog audience markers** (D6, D7, D8, D14, D15, D16) are re-deferred → ✅ **Story 1.19**

**RULED as recommended.** These are **audience selection**, not authorization containment. They need a per-**member**
geo attribute (`members` carries none — `schema/banners.ts:125`, `schema/news_posts.ts:40` both say so).
An org tree answers *"is Patna in Bihar"*; it cannot answer *"which members are in Patna."* Six of the 21
blocks are therefore re-deferred, not resolved.

⚠ Their prose must change anyway: *"until Story 1.18's geo selector lands"* becomes false the moment this
story lands, and a marker that names a **completed** story is worse than one naming an epic — it reads as
already-delivered. **Re-point all six to Story 1.19 in one governance commit.**

⭐ Note the split within each marker: the **geo** half goes to 1.19; the **`role` / `cohort`** halves have no
member attribute at all and stay seamed under 1.19's AC4 with their own named owner. Do not re-point all
three arms to 1.19 as if it delivered them.

### D6 — Multi-node report scope → ✅ **RULED: re-defer to Story 10.28. Story 1.18 does NOT absorb it.**

`ResolvedReportScope` is single-valued (`reports/scope.ts:66-75`); making it multi-valued means changing
`ResolvedReportScope`, `resolveActorReportScope`'s tie-break, `_shared.ts`'s narrowing modes, and the SQL in
at least two templates. That is orthogonal to ancestry — a *multi-district* admin and a
*state-above-district* admin are different problems.

⛔ **D6's original *"unless it falls out cheaply"* branch is CLOSED.** BigDev ruled Story **10.28** the
**permanent** owner of multi-node report scope, *"not conditional on 1.18 implementation."* A permanent
owner born already-discharged is a contradiction, so **Story 1.18 re-defers and does not build it**, even if
it looks cheap after the ancestry work. **AC6 is a disposition, never a build.**

⚠ Note the interaction the dev must still check: with ancestry live, a `state`-scoped actor resolves to
`{state}` **and** the district-narrowing query can reach below it. `_shared.ts:40`'s `deny` branch and
`reports.spec.ts:124` must be re-examined against real behaviour, not assumed — that examination **is** in
scope; changing `ResolvedReportScope`'s cardinality is not.

### D7 — ✅ **RULED 2026-08-12: THREE successors, approved by name. Scope + ACs approved (Appendix A).**

Per [[feedback_governance_commits_precede_implementation]], each mint is a **`governance:`-prefixed commit
that lands first**, touching `sprint-status.yaml` + `epics.md` + `deferred-work.md` and **zero files under
`packages/` or `apps/`**.

#### ✅ D7-R — RULED: the re-deferrals do not share an owning model, so they do not share a story

D7 originally proposed **one** successor holding everything. Scoping it against the project's own numbering
rule (*a successor belongs to the epic that owns the model it extends*) found otherwise. **Final disposition
of all five re-deferrals:**

| Re-deferral | Model it extends | Owner | Action |
|---|---|---|---|
| D5 — geo audience selection | member→geo attribution over 1.18's tree | **Story 1.19** (Epic 1) | **MINT** |
| D2 — block-dimension ground-inspection gate | Story 6.7's ground-inspection gate (FR-40) | **Story 6.17** (Epic 6) | **MINT** |
| D6 — multi-node report scope | Story 10.7's `ResolvedReportScope` | **Story 10.28** (Epic 10) | **MINT — unconditional** |
| D9 — trustee-directory half | Story 7.5's fixed-amount attesting panel | **Story 10.13** | **RE-POINT — exists, no mint** |
| D4 — `self` targets | *(nothing — no consumer exists)* | **none** | **CLOSE BY EDIT** |

Bundling four unrelated capabilities into one Epic-1 story would recreate the epic-shaped bucket this whole
correct-course exists to abolish, in story clothing. **Three mints, and D4-R + D9-R cut the count from five
to three.** Approved AC text for all three is in **Appendix A** — mint from it verbatim; do not re-derive.

#### ✅ D9-R — **RULED 2026-08-12: re-point D9's directory half to existing Story 10.13. No mint.**

`pool/fixed-amount.ts:78` is compound: *"needs a trustee directory / RBAC geo-scope resolver — the resolver
half is Story 1.18; **the trustee directory has no owner yet**."* It does now.
**`10-13-fixed-amount-setter-admin-ui`** (`sprint-status.yaml`, `backlog`; `epics.md:3657`) is the surface
that consumes Story 7.5's workflow **including the emergency attesting panel** — the exact place
"who may attest" has to be answered.

**Required:** rewrite `:78` so the **resolver half reads as delivered** (this story) and the **directory
half names Story 10.13**. ⚠ The obligation must also be recorded in `epics.md`'s Story 10.13 section —
a marker pointing at a story whose own text never mentions the obligation is how an inherited deferral
goes unnoticed. `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2` stays as the mechanical floor; this story changes
no value.

---

## Tasks / Subtasks

### Task 0 — Confirm decisions and re-derive the marker table (AC: 1, 5)

- [x] ✅ **D1–D7 RULED, including refinements D4-R, D9-R, D7-R** (BigDev, 2026-08-12). Task 1 is
      **UNBLOCKED** — mint the three successors from Appendix A verbatim.
- [x] `git fetch origin` before reasoning about `main` ([[feedback_git_fetch_before_remote_reasoning]]).
      Branch off `main`; do not work on `main`. — `git fetch origin` clean; `HEAD == origin/main == 63c844e`;
      branch `feature/1-18-geo-tree-scope-resolver` cut from `main`.
- [x] **Re-derive the 21-block table** against the working tree (the grep in the table header). Where the
      re-derived list and the table above disagree, **the re-derived list wins** and the discrepancy is
      recorded in Completion Notes. — **28 marker lines → 21 Family-B blocks + 2 excluded Family-A lines.
      ZERO drift**: every line number in THE TABLE matches the working tree exactly.
- [x] Record the **baseline**: run the nine pins green *before* any change, so AC4's dispositions are
      measured against a known-green start. — `scope.test.ts` 16 / `check.test.ts` 53 /
      `execute.test.ts` 23 = **92 passed**; `reports/reports.spec.ts` **8 passed** (live DB, single-pass).
      All nine pins confirmed present at their stated line numbers.

### Task 1 — `governance:` — mint the three successors (AC: 5) — **COMMITS FIRST**

✅ **UNBLOCKED — scope + ACs approved by BigDev 2026-08-12. Mint from Appendix A verbatim.**

- [x] `sprint-status.yaml` — add all three at `backlog`, each in its epic's block, each with a placement
      comment (mirror the 1-18 mint block at `sprint-status.yaml:5192-5197`):
      - `1-19-member-geo-attribution-geo-audience-consumer` → Epic 1, after `1-18-…`
      - `6-17-block-dimension-ground-inspection-gate` → Epic 6, after `6-16-…`
      - `10-28-multi-node-report-scope` → Epic 10, after `10-27-…`
- [x] ⚠ Epic 6 and Epic 10 both have `epic-N-retrospective` entries **already `done`/`optional`**. Adding a
      story to a retrospected epic is the **same deliberate act** that put this story in Epic 1 — write the
      placement comment so a later reader does not "correct" it. Do **not** flip a retrospective back.
- [x] `epics.md` — add all three sections **with the Appendix A acceptance criteria**. A successor with no
      ACs is an epic in disguise and expires unowned.
- [x] `epics.md` Story 10.13 — record the inherited **trustee-directory** obligation (D9-R). No new story.
- [x] `deferred-work.md` — the D4 *"Closed by [edit]"* entry and the three re-deferral pointers.
- [x] Commit `governance:`-prefixed. ⛔ **Zero files under `packages/` or `apps/` in this commit.**
- [x] ⛔ **Do not implement any successor here.** In particular, Story 1.18 does **not** build multi-node
      report scope — 10.28 is its permanent owner (D6).

### Task 2 — `governance:` — ADR-0038 + the decision-log entry (AC: 1)

- [x] Author `docs/adr/ADR-0038-geo-tree-scope-resolver.md` from `docs/adr/_adr-template.md`, status
      `drafted`. Record the D1 choice **and both rejected options with their evidence** (AC1).
- [x] ⛔ **Do NOT edit ADR-0008.** It is `ratified` ([[feedback_supersede_never_reinterpret]]). ADR-0038
      **discharges** ADR-0008 Decision 4's deferred seam without superseding the ADR. Cross-reference only.
- [x] Append `.decision-log.md` **Decision `2026-08-12-102`** (head is `2026-08-12-101`; verify before
      writing). Newest-first, never edit an existing entry in place.
- [x] Add the ADR-0038 row to `docs/knowledge-transfer/adr-index.md`.
- [x] Commit `governance:`-prefixed. Zero files under `packages/`/`apps/`.

### Task 3 — The tree substrate (AC: 1, 7)

- [x] Schema + **migration `0101`** (next free — `0100` is the highest applied). ⛔ Never regenerate an
      applied migration ([[project_live_db_test_gotchas]]).
- [x] Tenant RLS policy mirroring `helpdesk_routing_policy_versions`. Add the table to the adversarial
      `cross-pariwar-leak.spec.ts` **must-return-0** set — a leaked org tree is a leaked authorization input.
- [x] Version-conflict handling: a typed error, the `RoutingPolicyVersionConflictError` shape.
- [x] Document validation: reject cycles, reject a node whose parent is not strictly broader by `GEO_RANK`,
      reject duplicate node values at the same dimension under one parent.
- [x] ⛔ **No feature flag reaches this module** (AC7). If it lands in a new domain directory, evaluate that
      directory for `governance_boundary.yaml` `prohibited` admission and **record the answer either way**.
- [x] `pnpm db:check` clean.

### Task 4 — The resolver (AC: 1, 2, 8)

- [x] Implement a `GeoTreeResolver` factory over a loaded tree document. **Synchronous. Pure. No I/O.**
- [x] ⭐ **Value comparison must be byte-identical to the exact-node path.** `scope.ts:241` compares
      `grant.value === target.value` — strict, case-**sensitive**, no trimming. `member_postings.district`
      and `role_grants.scope_value` are both free `text`. If the resolver normalizes (case-folds, trims) and
      the exact-node path does not, **`state=Bihar ⊇ district=patna` allows while `district=Patna ⊇
      district=patna` denies** — a same-request contradiction. Pick one rule, apply it to both, or apply it
      to neither. **Test the disagreement explicitly.**
- [x] ⛔ `denyDeeperGeoResolver` const **byte-unchanged** (D3). The doc comment above it changes; the const
      does not.
- [x] ⛔ Do not touch `GEO_RANK`, `CEILING_RANK`, `scopeContains`'s ordering, or the `GeoTreeResolver`
      interface (freeze row 9).
- [x] Tests: `state`→`district`, `state`→`block`, `district`→`block`; non-ancestry denies; unknown node
      denies; empty tree denies; the **pariwar ancestor never reaches the resolver** (short-circuited at
      `scope.ts:236`) — assert that rather than assuming it.
- [x] Reuse the `BIHAR_TREE` fixture shape already in `tests/rbac/scope.test.ts:20-32` and
      `check.test.ts:31-33` — it is the intended in-memory resolver, already proving `hasPermission` allows
      with one injected (`check.test.ts:71`). **Do not invent a second fixture idiom.**
- [x] ⭐ **AC8 revert-probe, both halves.** (a) Revert to `contains: () => false`, confirm RED, record
      output, restore. (b) Corrupt **one edge**, confirm RED, record, restore. A gate that only detects
      "resolver absent" does not detect "resolver wrong".

### Task 5 — Wire it (AC: 2, 3)

- [x] Load the tree **once per request** in `apps/api/src/middleware/scope-resolution/index.ts` beside
      `request.scopeGrants` (`:52`); attach as `request.geoTree` (declare on `apps/api/src/types.ts:45`).
      A `null` tree ⇒ pass no resolver ⇒ today's behaviour.
- [x] Thread it into `rbac.requirePermission`'s ctx at `apps/api/src/modules/rbac/index.ts:115-118` — that
      object currently carries `onAuthorizationDenied` only.
- [x] **Walk all ten sites in AC3's table.** For each: wire it, or write the file:line reason it is not
      wired. `requireGlobalPermission` (`:172`) has no scope tx and checks at `global` — a resolver is
      irrelevant there; **say so**, do not leave it silently unwired.
- [x] ⭐ **Sites 8 and 9 are domain contract changes.** Add an optional resolver to `BulkActorContext`
      (`bulk-operations/types.ts:125`) and `ReportScopeCtx` (`reports/types.ts`), thread into the
      `checkPermission` ctx at `execute.ts:164` and `assemble.ts:44`. ⛔ Optional + defaulting to the
      deny-deeper resolver, so every existing caller keeps today's behaviour. Threading site 8 **flips**
      `execute.test.ts:240` — expected, and Task 6 covers it.
- [x] ⛔ `bulkExecute` must **not** branch on `operationType` for this
      ([[project_bulk_operations_open_closed_invariant]]) — the resolver rides the actor context, not the
      harness.
- [x] `apps/jobs/src/reports-export.ts:164` re-resolves scope at **build** time (`reports/scope.ts:12-14`).
      If the tree changes between request and build, the build re-resolves against the newer tree — state
      whether that is intended (it matches the existing revoked-grant posture) in Completion Notes.
- [x] AC2 purity test: an injected-loader spy that must **not** fire during `contains()`.

### Task 6 — The nine pins, one disposition line each (AC: 4)

Write the disposition **in the test file**, next to the pin. Expected classification — **verify each; do not
copy this table**:

| Pin | Expected | Note |
|---|---|---|
| `scope.test.ts:98` | **unchanged** | Explicitly passes `denyDeeperGeoResolver`. Tests the default. Still true. |
| `check.test.ts:64` | **unchanged assertion, prose updated** | Already tests both directions with `BIHAR_TREE` (`:71`). Comment says *"the Epic-3 geo tree"* — stale. |
| `check.test.ts:184` | **unchanged assertion, prose CORRECTED** | ⛔ **D2.** Rank-order, not resolver-blocked. The comment misattributes it. |
| `check.test.ts:439` | **unchanged** | district-ceiling vs **pariwar** target — rank-order. |
| `check.test.ts:479` | **unchanged** | ″ |
| `check.test.ts:508` | **unchanged** | ″ |
| `check.test.ts:539` | **unchanged** | ″ |
| `tests/bulk-operations/execute.test.ts:240` | ⭐ **UPDATE — the pin most at risk** | Genuine Family B. See below. |
| `tests/integration/reports/reports.spec.ts:124` | **unchanged assertion, prose re-examined** | Not RBAC. See below. |

⚠ **Path correction:** the bulk-operations pin is at `packages/domain/tests/bulk-operations/execute.test.ts:240` —
**not** under `tests/integration/`. Story 10.18's D6 list gives the short form.

⭐ **`execute.test.ts:240` — *"deny-deeper geo pin: a state-ceiling grant does not reach a district-level
item (Epic-3 deferral)"*.** Genuine Family B: `STATE_TRUSTEE_BIHAR_GRANT` against a `{district,'Patna'}`
item, denied only because `checkPermission` at `execute.ts:164` passes **no ctx** and therefore gets the
default resolver. **The moment site 8 is threaded, this flips.** Required: keep the no-resolver assertion
(it still pins the default), **add** a companion asserting the with-resolver ALLOW, and drop the stale
`(Epic-3 deferral)` from the title.

⭐ **`reports.spec.ts:124` — *"deny-deeper: a state-scoped actor resolves nothing below its ceiling"*.**
Read it before touching it: `checkPermission` **already ALLOWS** here (a real `state_trustee` holds
`member.view_validity` at `{state,'Bihar'}` — an exact-node match at the *same* dimension, no resolver
involved). The zero rows come from the **query-level** narrowing in `_shared.ts:40`. So the ancestry
resolver does **not** move this pin — but AC6's `_shared.ts` work would. Classify it as a **query**
deny-deeper pin, not an RBAC one, and say so in the disposition.

- [x] All nine dispositioned in writing. **Silence is not a disposition.**

### Task 7 — Sweep the 21 markers (AC: 5)

- [x] Execute against the **re-derived** table (Task 0).
- [x] Resolve: S1, S2, S3, D1, D3, D4, D5, P2, P8, R12 (+ D9's resolver half).
- [x] Rewrite in place as rank-order: **P1, R11** (D2) — including the ACCEPTANCE CONDITION prose in both.
- [x] **Close by edit, no successor: S4** (D4-R) — delete the forward promise at `scope.ts:216-221`, state
      the design fact. ⛔ The deny does not change.
- [x] **Re-point to Story 1.19** (geo half only): D6, D7, D8, D14, D15, D16. The `role`/`cohort` arms carry
      their own named owner per 1.19 AC4 — do **not** let one pointer imply all three arms.
- [x] **Re-point to Story 6.17**: the block-dimension gate question (D2's honest path).
- [x] **Re-point to Story 10.28**: marker D2 (`reports/scope.ts:71`) + `deferred-work.md:3432`.
- [x] **Re-point to Story 10.13**: D9's directory half (`pool/fixed-amount.ts:78`) — resolver half reads as
      delivered, directory half names 10.13.
- [x] ⛔ Do not touch `scope.ts:95` or `roles.ts:582` (Family-A prose).
- [x] ⛔ Do not touch `schema/cycle_freeze_commits.ts:23`.
- [x] `deferred-work.md`: dispose **D1-1.8** (`:1710`), **`:1091`**, **`:3432`** in closure-precision
      vocabulary. Every re-deferral names a **story**.
- [x] ⭐ **Grep back**: after the sweep, no `Story 1.18` marker may remain that reads as *pending*. A marker
      naming a **done** story is worse than one naming an epic.

### Task 8 — Full verification (AC: all)

- [x] `pnpm typecheck`, `pnpm lint` across touched packages.
- [x] `pnpm test` — full turbo sweep. Nine pins green.
- [x] Live-DB integration, **single-pass, `DATABASE_URL` NOT exported globally**
      ([[project_ci_local_double_run_pollution]]). Test DB `twt-test-pg:5433`.
- [x] `pnpm ci:local` — every static gate, notably `governance-boundary` (AC7), `schema-diff`,
      `domain-invariants`, `access-wrapper`.
- [x] ⚠ **Confirm innocence, do not assume it** ([[project_known_livedb_test_failures]]). Known pre-existing
      failures at the last measurement: `tests/integration/feature-flags/registry.spec.ts` (1) and
      `tests/integration/custom-fields/registry.spec.ts` (3). If anything fails: reproduce in isolation, then
      re-run at the baseline commit via stash + detached checkout. **Never claim green for a suite that
      failed.**
- [x] Update `sprint-status.yaml`: `1-18-geo-tree-scope-resolver` → `done`, plus **one combined** top-of-file
      reverse-chron `last_updated` comment entry ([[project_sprint_status_ledger]]).

---

## Dev Notes

### The one-paragraph version

`scopeContains` already has the seam and `check.ts` already threads a `resolver` through `AuthzContext`
(`check.ts:91`, `:110`, `:162`, `:191`). **The predicate side is done.** What is missing is (a) a tree to
read, (b) a loader, and (c) the ten call sites that must all receive it. The hard parts are not the
algorithm — they are D2 (two of the 21 blocks are not this story's), AC2 (purity), AC3 (**two of the ten
sites are domain contract changes, not HTTP wiring**), and AC5 (nothing may be re-deferred to an epic).

### Why purity is the binding constraint (AC2)

`hasPermission` is a **pure synchronous predicate** — ADR-0008 Decision 8, `check.ts:9-11`, and the entire
`tests/rbac/check.test.ts` matrix depend on it. `GeoTreeResolver.contains` is synchronous by interface
(`scope.ts:162`). So the resolver **cannot** query the DB. The tree must be loaded before the check and
closed over. `request.scopeGrants` is the exact precedent: loaded once in scope-resolution middleware,
consumed synchronously by every downstream gate. Mirror it. Making `contains` async would change the seam
interface — freeze row 9, out of bounds.

### Why the tree is per-Pariwar

`GEO_RANK` puts `pariwar: 1` **above** `state: 2` — the Pariwar is the tenant, the geography sits inside it
([[project_rbac_geo_scope_containment]]). Each Pariwar owns its own `state → district → block` subtree.
`scopeContains:236` returns `true` for any pariwar grant before the resolver is reached, so the resolver only
ever sees `state→district`, `state→block`, `district→block`. Three edge kinds — that is the whole surface.

### The value-normalization trap

Geo node values are free `text` everywhere: `member_postings.district`, `role_grants.scope_value`,
`claim_ground_inspections.district`. The exact-node path (`scope.ts:241`) is strict `===`. If the resolver
normalizes and the exact-node path does not, the two paths contradict each other **within one request**.
Decide once, apply to both or to neither, and pin the decision with a test.

### Existing patterns to extend — do not reinvent

| Need | Use | Do not |
|---|---|---|
| Versioned per-Pariwar registry | `helpdesk_routing_policy_versions` + `helpdesk/registry.ts:1-19` | invent a new versioning idiom |
| In-memory resolver fixture | `BIHAR_TREE` (`tests/rbac/scope.test.ts:20-32`) | write a second fixture style |
| Per-request preload | `request.scopeGrants` (`scope-resolution/index.ts:52`) | query inside the predicate |
| Tenant RLS on a new table | `policies/role-grants-rls.ts` | rely on app-layer filtering |
| Typed version conflict | `RoutingPolicyVersionConflictError` | throw bare `Error` |
| Code-data default | `DEFAULT_ROUTING_POLICY` / `defaultRoleBundles` | seed a guessed geography (D1) |

### Regression surface — read before editing

- `packages/domain/src/rbac/scope.ts` (250 lines) — read **all** of it. §RANK-ORDER (`:69-106`) is the
  canonical explanation of what this story does **not** do.
- `packages/domain/src/rbac/check.ts:82-118, 155-200` — the resolver already flows through here.
- `apps/api/src/modules/rbac/index.ts:76-193` — the wiring target.
- `packages/domain/src/reports/scope.ts` (79 lines) — both its markers, and AC6.
- `packages/domain/src/reports/templates/_shared.ts:40` — the `deny` branch ancestry may now change.

**What must not break:** every currently-denied authorization that is denied for a **rank-order** reason must
stay denied. The nine pins are the tripwire, and four of them (`check.test.ts:439/:479/:508/:539`) exist
precisely because a district-ceiling grant must never satisfy a pariwar check. If the resolver ever makes one
of those pass, the implementation has reached into Family A.

### Governance ordering (non-negotiable)

[[feedback_governance_commits_precede_implementation]]: Tasks 1 and 2 commit **first**, `governance:`-prefixed,
touching **zero** files under `packages/` or `apps/`. Story 10.18's Task 10 mechanized this check —
assert across every non-merge commit via `git merge-base`, not by eye.

### Live-DB gotchas ([[project_live_db_test_gotchas]])

Never regenerate an applied migration (42P07). Never `DROP SCHEMA` (42P01). Own-committing writers ⇒ assert
membership, not counts. Test DB `twt-test-pg`:5433. Run the live suite **single-pass** with `DATABASE_URL`
scoped to that run only.

### Project Structure Notes

- New domain namespace (if D1 is taken as recommended): `packages/domain/src/geo-tree/` — `index.ts`,
  `registry.ts`, `resolver.ts`, `errors.ts`, mirroring `helpdesk/`. Export from
  `packages/domain/src/index.ts` as `export * as geoTree from './geo-tree/index.js';` (alphabetically near
  the other namespaces at `:142-305`).
- ⛔ **Do NOT put the resolver inside `packages/domain/src/rbac/`.** `rbac/` is a
  `governance_boundary.yaml` prohibited root and must not gain a DB-reading module; keeping the loader
  outside it preserves that root's cleanliness. The **pure** resolver factory may live in `rbac/` if it
  reads nothing — decide and record.
- ⛔ **`packages/contracts` must never import a pg-touching `@twt/domain` namespace**
  ([[project_contracts_domain_bundle_boundary]]) — it leaks `pg` into the RN Metro bundle. Marker **D15**
  (`contracts/src/banners/dto.ts:43`) is a **comment edit only**; do not add an import.
- ⚠ **Type-only → value import cycle trap** ([[project_type_only_import_cycle_trap]]): if the resolver needs
  a type from `rbac/scope.ts` and `rbac/` ever needs a value back, hoist the shared type to a leaf module.
  Typecheck and the local suite stay green while consuming packages break at runtime.
- Migration `0101`; snapshot via the normal `db:check` flow.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md:1385-1441`] — Story 1.18, four ACs + scope boundary
- [Source: `_bmad-output/planning-artifacts/epics.md:510-527`] — Architectural Freeze Boundaries, **row 9**
- [Source: `_bmad-output/implementation-artifacts/10-18-…-sanctioning-authority.md:526-528`] — 10.18 D6, the nine pins
- [Source: `_bmad-output/implementation-artifacts/10-18-…-sanctioning-authority.md:702-781`] — Task 7 label→site table
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:1710-1716`] — D1-1.8, rewritten + re-scoped
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:1091`] — unresolved target locator / `global` carve-out
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md:3432`] — multi-node report scope
- [Source: `docs/adr/ADR-0008-rbac-permission-model.md` Decision 4, §Consequences "Deferred seams"] — the seam this story discharges
- [Source: `packages/domain/src/rbac/scope.ts:56-106, 161-250`] — `GEO_RANK`, §RANK-ORDER, the seam, `scopeContains`
- [Source: `packages/domain/src/rbac/check.ts:82-118, 155-200`] — `AuthzContext.resolver` threading
- [Source: `apps/api/src/modules/rbac/index.ts:76-193`] — the primary injection point
- [Source: `packages/domain/src/bulk-operations/execute.ts:164` + `types.ts:125`] — AC3 site 8 (domain)
- [Source: `packages/domain/src/reports/assemble.ts:44`] — AC3 site 9 (domain)
- [Source: `packages/domain/tests/bulk-operations/execute.test.ts:240`] — the pin that flips
- [Source: `packages/domain/src/helpdesk/registry.ts:1-19`] — the versioned per-Pariwar registry precedent
- [Source: `packages/domain/src/schema/member_postings.ts:44-62`] — the only geo column that exists
- [Source: `governance_boundary.yaml:238, 289`] — `rbac` prohibited roots
- Memory: [[project_rbac_geo_scope_containment]], [[feedback_closure_language_precision]],
  [[feedback_supersede_never_reinterpret]], [[feedback_governance_commits_precede_implementation]],
  [[feedback_record_unattested_no_backfill]], [[feedback_gate_scope_semantic_coverage]],
  [[project_r7_fact_producer_unbuilt]] (*a deferral naming an EPIC expires unowned*),
  [[project_live_db_test_gotchas]], [[project_ci_local_double_run_pollution]],
  [[project_contracts_domain_bundle_boundary]], [[project_type_only_import_cycle_trap]]

---

## Escalations owed

1. ⛔ **D2 charges Story 10.18's own table with a misclassification.** Two of the 21 blocks it re-pointed
   here are rank-order, which 10.18's central thesis says can never be resolver-fixed. Raised, not silently
   corrected — BigDev rules whether P1/R11 are rewritten in place or stay Family B.
2. ⚖ **Six of the 21 blocks (banners/news-blog audience) are not authorization at all.** They were swept in
   under the "a mirror is swept with its origin" rule, but their origin needs a member attribute, not a tree.
   This story re-points them; it does not deliver them.
3. ⚖ **The successors are the third generation of this deferral.** Epic 3 → Story 1.18 → {1.19, 6.17,
   10.28}. All three carry acceptance criteria (Appendix A), which is the whole difference — but three
   owners is three chances to repeat the failure. Recorded so it cannot be waved through.
4. ⚖ **`docs/legal/` is gitignored** (`.gitignore:68`). If any part of this work needs a Niyamavali
   reference, the durable record is the `.decision-log.md` entry, not a committed file. Not expected to bite
   here — recorded because Story 10.18 found it late.

---

## Appendix A — Approved successor specs (Task 1 mints from this **verbatim**)

> ✅ **Approved by BigDev 2026-08-12.** Copy these into `epics.md` as-written. Do **not** re-derive, re-word
> the ACs, or "improve" them at mint time — the approval is of *this text*.

### Story 1.19: Member Geo Attribution + Geo Audience Consumer `[PRIMITIVE]` + `[CONSUMER]`

**Key:** `1-19-member-geo-attribution-geo-audience-consumer` · **Epic 1** — it extends the geo-tree model
Story 1.18 mints. Same numbering rule that placed 1.18 here; the retrospected-epic placement is deliberate.

As Solo Builder and every surface that has stored a geo audience it cannot resolve,
I want a member→geo attribution primitive over Story 1.18's tree, with the `state` audience arm wired
end-to-end,
So that a banner or post targeted at a state reaches the members who are actually in it, instead of being
stored, tone-reviewed, listed — and visible to nobody.

> **The gap.** `member_postings.district` is the only per-member geography that exists. Members carry no
> `state` and no `block`. Story 1.18 supplies district→state ancestry; what is still missing is the
> member→district read that turns ancestry into an audience.
>
> ⛔ **Wires ONE consumer end-to-end.** A producer with no consumer is the Story 5.6/5.7 anti-pattern that
> Story 10.8's Decision 8 exists to prevent.

1. **The primitive.** `resolveMemberGeoNode` returns the member's current district (newest `member_postings`
   row by `created_at`), lifted through Story 1.18's in-force tree to `{pariwar, state, district, block}`.
   ⭐ **Every ancestor the tree cannot supply is TYPED-ABSENT** (`{available: false, reason}`) — never
   guessed, never null-collapsed (the Story 8.4 nominee-VPA discipline). ⛔ **Nothing in this story may
   imply a member necessarily resolves to all four levels**: a Pariwar publishing only districts yields no
   state and no block, and that is a first-class answer, not a degraded one. A member with **no posting
   row** resolves to **no geo**, and every consumer treats that as *"in no geo audience"* — **fail-closed,
   never "in all."**
2. **The tree is the only ancestry source.** State/block come **only** from Story 1.18's published tree — no
   second geography, no hardcoded district→state map. A Pariwar with no tree resolves district-only, so its
   `state` audience arm denies **exactly as today**.
3. **The `state` arm lights up in BOTH consumers** — banners' read-time predicate
   (`isMemberInBannerAudience`) and news-blog's dispatch selector (`resolveAudienceMemberIds`). Call sites do
   not move; banners' signature grows a member argument exactly as `banners/audience.ts:40-43` predicts.
   ⛔ **The polarity difference is preserved**: `public` → `true` for banners, empty set for news-blog
   (`banners/audience.ts:5-12`).
4. **`role` and `cohort` stay seamed, with a named owner.** No member attribute exists for either — `members`
   carries lifecycle `state` + `pariwar_id` only. Both continue to resolve false/empty + a logged seam note,
   their prose names a **story** and never an epic, and the per-arm distinction between *"resolvable now"*
   and *"no attribute exists"* is stated explicitly.
5. **The six re-pointed markers are discharged.** D6/D7/D8/D14/D15/D16: geo half resolved, role/cohort half
   re-pointed. ⛔ `contracts/src/banners/{enums,dto}.ts` and `apps/admin/.../derive.ts` are **comment/DTO
   edits only** — contracts must never import a pg-touching `@twt/domain` namespace (the RN Metro bundle
   boundary).
6. ⚠ **The quiet-turn-on hazard.** `state`-scoped banner rows authored before this story are currently
   visible to **nobody**; when the arm resolves they become live. The admin console's *"not yet targetable"*
   indicator (`apps/admin/src/modules/banners/derive.ts:60`) is removed for `state` and retained for
   `role`/`cohort`, and **existing `state` rows receive an explicit disposition** — publish, or require
   re-confirmation — rather than silently appearing.
7. **The dispatch read is bounded.** The `state` fan-out is one query joining newest-posting-per-member
   against the tree's district set — **no N+1 at 4L members**. Watch the `DISTINCT ON` 42P10 gotcha and the
   domain limit-clamp gate.
8. **Story 12.2 inherits a seam, not a surprise.** The targeting wizard's scope filter
   (`epics.md:4429` — `national/state/district/role/cohort`) is recorded as a downstream consumer of this
   primitive. **No code is written for it here.**

### Story 6.17: Block-Dimension Ground-Inspection Gate `[SURFACE]`

**Key:** `6-17-block-dimension-ground-inspection-gate` · **Epic 6** — it extends Story 6.7's
ground-inspection gate. **Depends on Story 1.18.**

As a Pariwar running ground inspections at block level,
I want the ground-inspection gate checked at the block dimension,
So that FR-40's block-level administrators can actually schedule inspections, instead of holding a grant the
model can never satisfy.

> ⭐ **Why a block gate works where the district gate cannot.** Re-gating at `dimension: 'block'` authorizes
> **both** actors: `block_admin` by exact-node match, and `district_admin` by *district→block ancestry
> through Story 1.18's resolver* (`tRank 4 > gRank 3` → falls through to the resolver, which now answers).
> The current district gate can never authorize `block_admin` — Story 1.18's D2 traced that to rank order,
> not to a missing resolver. This is a **gate redesign**, not a resolver deferral.

1. `claim_ground_inspections` gains a block value — **or** block is derived via Story 1.19's primitive. The
   choice is **recorded, not assumed** (the table carries `district text NOT NULL` and no block column today,
   `:116`).
2. `claim.conduct_ground_inspection` is checked at `dimension: 'block'`, preserving `block_admin`'s
   `scopeCeiling: 'block'` — ⛔ **no district-scoped grant is issued to a block admin**, which would violate
   the ceiling.
3. `district_admin` still authorizes, via Story 1.18 ancestry. **Both roles are pinned by test.**
4. ⛔ `check.test.ts:184`'s rank-order pin stays **green and unmodified**. This story routes around it with a
   different gate; it does not lift it.
5. ⛔ **No change to `GEO_RANK`, `CEILING_RANK`, or `scopeContains`** — architectural freeze row 9. Any such
   change is an ADR and a different story.

### Story 10.28: Multi-Node Report Scope `[PRIMITIVE]`

**Key:** `10-28-multi-node-report-scope` · **Epic 10** — it extends Story 10.7's `ResolvedReportScope`.
⭐ **The permanent owner. Its existence is NOT conditional on Story 1.18's implementation.**

As a district administrator holding a report key at more than one district,
I want report scope to carry every node I hold,
So that an export covers all of them, instead of silently returning one district and no signal that the rest
were dropped.

1. `ResolvedReportScope` carries **multiple** same-dimension values; `resolveActorReportScope` returns every
   grant at the broadest dimension instead of the strict-`<` tie-break winner (`reports/scope.ts:73`).
2. Report templates narrow `WHERE district IN (...)` — `member-roster` and `contribution-rate-by-district`.
3. **A silent single-district export is impossible**: a two-grant test asserts both districts appear. The
   failure this story exists to remove is *silent*, so the test must prove presence, not absence of error.
4. `_shared.ts`'s narrowing modes are extended, and `reports.spec.ts:124` is re-pinned as a **query**
   deny-deeper pin (it is not an RBAC pin — `checkPermission` already allows there).
5. **Composition with Story 1.18's ancestry is stated**: a state grant reaches districts beneath it, and
   multi-node + ancestry must not double-count a district reachable by both paths.

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via `bmad-dev-story`.

### Debug Log References

**Baseline (Task 0), measured before any change at `63c844e`:** `scope.test.ts` 16 + `check.test.ts` 53 +
`execute.test.ts` 23 = **92 passed**; `integration/reports/reports.spec.ts` **8 passed** (live DB,
single-pass). All nine pins confirmed present at their stated line numbers.

**Marker table re-derivation (Task 0):** **28 marker lines → 21 Family-B blocks + 2 excluded Family-A
lines. ZERO DRIFT** — every line number in THE TABLE matched the working tree exactly, so the table
was used as written.

**⭐ AC8 revert probes (Task 4) — both halves run against the REAL resolver, RED confirmed, restored:**

| Probe | Mutation | Result | What it proves |
|---|---|---|---|
| (a) resolver-absent | `createGeoTreeResolver`'s `contains` → `return false` (i.e. `denyDeeperGeoResolver`) | **6 failed / 21 passed** | the ancestry assertions depend on a resolver existing |
| (b) ⭐ ONE-EDGE corruption | `buildGeoTree` re-parents ONLY `district Patna` from `Bihar` to `UP`; resolver otherwise fully intact | **5 failed / 22 passed** | the tests discriminate **ancestry**, not "a resolver is present" |

The two failure SETS differ, which is the load-bearing observation. Under (b) `district → block: Danapur
∈ Patna` and `state → block DIRECTLY: Phulwari ∈ Bihar` still **passed** — the resolver was present and
working — while `non-ancestry denies at block depth: Danapur ∉ UP` **flipped from deny to a wrong
ALLOW** (`expected true to be false`). A suite that only detected "resolver absent" would have stayed
green on a WRONG tree. Both probes were reverted; the standing in-suite form of each lives in
`tests/geo-tree/resolver.test.ts` so the discrimination cannot silently rot.

**⚠ `db:generate` MUST NOT be used in this repo (Task 3).** Running it produced a **114 KB full-schema
dump** as `0101_wonderful_texas_twister.sql`: drizzle snapshots stop at `0020`, so drizzle-kit diffed
against a five-year-stale baseline. Reverted in full (SQL + snapshot + journal via `git checkout`) and
migration `0101_geo-tree-versions.sql` hand-authored instead, per the discipline `0100`'s own header
states. Verified at the catalog level: `relrowsecurity`/`relforcerowsecurity` both `t`, 3 policies,
`geo_tree_versions_immutability_guard` present, composite self-FK present, no DELETE grant.

**Golden-hash re-pin (Task 8), and the gate working as designed:** `feature-flags/capability-bar.test.ts`
went RED on the first full sweep because adding a `prohibited` root is a semantic change to
`governance_boundary.yaml`. Re-pinned `11da8ec7…` → `d178ea95…` **with the reason recorded next to the
constant**, including that nothing under `allow` moved (`count` still 6, no flag minted).

**Innocence confirmation (Task 8), NOT assumed.** `pnpm ci:local` with `DATABASE_URL` exported globally
reported 2 API failures; both were `Error: [vitest-worker]: Timeout calling "fetch"` — **worker
timeouts, not assertions** — i.e. the documented [[project_ci_local_double_run_pollution]] /
[[project_ci_local_concurrency_oversubscription]] class. Re-run the documented way (**no global
`DATABASE_URL`**): **`ci:local PASSED — 30 jobs green`**. The live-DB suites were then run separately
and single-pass, both fully green. ⭐ The two failures the story flagged as *known pre-existing*
(`feature-flags/registry.spec.ts` ×1, `custom-fields/registry.spec.ts` ×3) **PASSED** in this run —
recorded as an observation, not claimed as a fix by this story.

### Completion Notes List

#### What shipped

`geo_tree_versions` (migration `0101`) + `@twt/domain`'s new `geoTree` namespace implement
`scopeContains`' injectable seam by **genuine ancestry**, discharging ADR-0008 Decision 4's deferral —
the worked example of a deferral that named an EPIC and expired unowned for seven epics.

⭐ **The single most important property: applying this changes NO authorization outcome anywhere.**
There is no code default geography, so every Pariwar starts with **no tree**; the loader returns `null`,
the caller passes no resolver, and `denyDeeperGeoResolver` (**byte-unchanged**, verified by diff)
applies. Behaviour moves only when a Pariwar *publishes* a tree — a deliberate act that widens
authorization. `GEO_RANK`, `CEILING_RANK`, `scopeContains`'s ordering and the `GeoTreeResolver`
interface were **not touched** (architectural freeze row 9).

#### AC3 — the reach of the wiring, stated rather than implied (all TEN sites)

| # | Site | Disposition |
|---|---|---|
| 1 | `apps/api/.../modules/rbac/index.ts` `requirePermissionHook` | ✅ **WIRED** — the primary injection point, via `geoTreeResolverForRequest(request)` |
| 2 | ″ `requireGlobalPermission` | ⛔ **NOT wired, reason in-code** — checks at `global`, answered at `scope.ts:202/:214` before the geo branch; and it has no scope tx, so no tree could have been loaded. **Unreachable, not merely unnecessary** |
| 3 | ″ `requireGlobalOrAnyPariwarPermission` | ⛔ **NOT wired, reason in-code** — both arms check at `global` / `pariwar`; `pariwar` is answered at `scope.ts:236` before the resolver |
| 4 | `trustee-lite/handlers.ts` | ⛔ **NOT wired, reason in-code** — every key at `pariwar` dimension |
| 5 | `member-moderation/handlers.ts` | ⛔ **NOT wired, reason in-code** — `pariwar` dimension |
| 6 | `multi-tenant/index.ts` | ⛔ **NOT wired, reason in-code** — a grant **projection**; no predicate is called at all |
| 7 | `rules/index.ts` | ⛔ **NOT wired, reason in-code** — both keys at `pariwar` dimension |
| 8 | ⭐ `domain/bulk-operations/execute.ts` | ✅ **WIRED** — contract change: `BulkActorContext.geoResolver` (optional) |
| 9 | ⭐ `domain/reports/assemble.ts` | ✅ **WIRED** — contract change: `ReportScopeCtx.geoResolver` (optional) |
| 10 | `apps/jobs/reports-export.ts` | ✅ **WIRED** — the tree is re-loaded at BUILD time beside the grants |

Every un-wired site carries its reason **as a code comment at the site**, plus a re-visit trigger. Both
domain contract fields are **optional and default to the deny-deeper resolver**, so every pre-existing
caller keeps today's behaviour with no edit. `bulkExecute` still branches on nothing
([[project_bulk_operations_open_closed_invariant]]) — the resolver rides the **actor context**, which is
where `grants` and `pariwarId` already live.

**Site 10's build-time semantics, stated rather than left to be discovered:** if the tree changes between
request and build, the build re-resolves against the **newer** tree. That is deliberate and matches the
revoked-grant posture two lines above it — build-time authorization is re-validated from current state,
not frozen at request time. So a removed edge narrows an export and an added edge widens it, exactly as a
revoked or added grant does.

⚠ **Recorded, because it bounds what "wired" means today:** `bulkExecute` has **no production caller**
yet (Story 10.6 built the harness; no surface consumes it), and `assembleReport`'s only production caller
is the jobs worker. So site 8's deliverable is the **contract**, exercised by tests; the resolver reaches
real traffic there when a bulk surface is built.

#### ⭐ D2 — the correction to Story 10.18's own table (the story's most consequential finding)

**P1** (`permissions.ts`) and **R11** (`roles.ts`) were re-pointed here as Family B on the reasoning that
*"block→parent-district is same-tree ancestry with the target strictly narrower."* **The target is the
PARENT, hence BROADER** — `tRank 3 < gRank 4` denies at `scope.ts` before any resolver runs, and the
alternative (a district grant to a block admin) fails `scopeWithinCeiling`'s pure `CEILING_RANK` compare.
Both were **rewritten in place as rank order**. Their **ACCEPTANCE CONDITION prose was REMOVED, not
reworded**: it promised block_admin support "when the authorization layer can resolve block→district
ancestry", which this model can never do — an unmeetable condition reads as pending work forever. The
honest path is a different **gate** → **Story 6.17**.

#### AC4 — all nine pins, one written disposition each

| # | Pin | Disposition |
|---|---|---|
| 1 | `scope.test.ts` | **UNCHANGED** — explicitly passes `denyDeeperGeoResolver`; tests the DEFAULT, still true |
| 2 | `check.test.ts` state→district | **assertion unchanged, prose updated** — "the Epic-3 geo tree" was stale |
| 3 | `check.test.ts` block→district | **assertion unchanged, prose CORRECTED** (D2); title `DEFERRAL PIN` → `RANK-ORDER PIN` |
| 4–7 | `check.test.ts` ×4 district-ceiling vs pariwar | **UNCHANGED** — Family A; titles `DEFERRAL PIN` → `RANK-ORDER PIN`; each notes it is the tripwire for the resolver reaching into Family A |
| 8 | ⭐ `execute.test.ts` | **UPDATED** — the only pin whose behaviour moves. No-resolver assertion KEPT (it still pins the default) + a companion asserting the with-resolver ALLOW + a third proving a resolver is **not** a blanket allow. `(Epic-3 deferral)` dropped from the title |
| 9 | `reports.spec.ts` | **assertion unchanged, CLASSIFICATION corrected** — a **QUERY** deny-deeper pin, not RBAC. Now **asserts** that classification: re-runs the same assembly WITH a real resolver and still gets zero rows |

#### AC5 / AC6 — dispositions

All 21 Family-B blocks swept against the approved table; no marker invented a different successor.
`deferred-work.md` **D1-1.8** discharged (seam *Closed by [edit]*, residue re-deferred to named stories);
**`:3432`** re-deferred to **Story 10.28**, with its 2026-07-31 premise (*"multi-value scope naturally
lands alongside the geo-tree resolver"*) **superseded on evidence** — the resolver landed and multi-node
fell out of it not at all.

⭐ **`:1091` is recorded as *"Not addressed"*, deliberately.** Its re-pointing to Story 1.18 was itself a
misclassification: it asks whether a `global` grant should bypass the **unresolved-target-locator** guard
(a NULL-VALUE question), which a resolver never reaches — proven by the fact that a complete resolver
shipped and the guard is bit-for-bit unaffected. Rather than mint a story to tidy the ledger, the entry
keeps its original owner and gains a **concrete re-trigger** replacing the vague one. Minting an owner
for work nobody has asked for is the un-gated re-commitment [[feedback_record_unattested_no_backfill]]
warns decays.

**AC6 examination (in scope) — `_shared.ts`'s `deny` branch re-examined per dimension and re-pinned.**
The branch does **not** change, but the REASON does: `state` now denies because `DistrictNarrowing` and
`ResolvedReportScope` are **single-valued**, not because a resolver is missing; `block` is rank order; and
`self` is not a tree node. ⛔ Cardinality untouched — Story 10.28's, permanently.

#### AC7 — the governance-boundary answer, recorded either way

`packages/domain/src/geo-tree` was **ADMITTED** to `governance_boundary.yaml`'s `prohibited` list under
prohibition (d). The loader was kept **outside** `rbac/` so that root gains no DB-reading module, but
moving it did not move it out of the prohibition's reach — and per the gate's own README, a passing scan
over an **unlisted** root proves the root is unlisted, not that the behaviour is admissible. Gate green
over the new root (5 files, 13 prohibited roots).

#### Decisions taken inside the ruled envelope

- **Uniqueness is stronger than the task specified, and forced by the model.** The task said reject
  "duplicate node values at the same dimension under one parent"; the validator rejects duplicate
  `(dimension, value)` across the **whole document**, because a `GrantScope` carries **no path** — two
  districts both named "Patna" are indistinguishable to `scopeContains`, and accepting them would make
  authorization depend on map insertion order.
- **Cycle detection is exported and tested DIRECTLY.** The rank rule already makes every constructible
  cycle a rank violation, so a test asserting only "invalid" would have proven nothing about the
  detector.
- **`contains(X, X)` is `false`** (strict ancestry). Unreachable from `scopeContains`; returning `false`
  keeps the resolver from becoming a second answer to a question settled upstream.
- **A runtime walk bound** guards against a cyclic document persisted by an older validator hanging a
  synchronous authorization predicate. It is a HANG guard, not a correctness guard.

#### ⚠ Raised, not silently settled

1. **`roles.ts` `trustee_panel` note still reads as future tense** — *"must not be re-read as one when
   that resolver lands (Story 1.18)"*. The story ⛔ explicitly forbids touching it (Family-A prose whose
   force becomes load-bearing precisely now), so it was **left byte-unchanged**. But AC5's grep-back asks
   that no marker read as pending, and this one arguably does. **The sentence's warning is now live
   rather than hypothetical; only its tense is stale.** Flagged for BigDev — a one-word tense fix is the
   whole remedy, and it was not taken unilaterally.
2. **Story 10.27 has no `epics.md` section** (it exists only in `sprint-status.yaml`), noticed while
   placing Story 10.28 after it. Not this story's to fix; recorded so it is not lost.
3. **Validation cannot catch a factually wrong edge.** `Patna ∈ Kerala` is structurally valid and IS
   accepted — pinned by a test that says so out loud, so nobody reads a published tree as verified
   geography. Accepted risk, recorded in ADR-0038.
4. **Publishing a tree widens authorization, and no writer surface ships here.** The substrate, loader
   and resolver ship; the publishing UI and its own authorization gate + audit line do not.

### File List

**Governance / planning (committed FIRST, `governance:`-prefixed):**

- `_bmad-output/implementation-artifacts/sprint-status.yaml` *(modified — 3 mints + status)*
- `_bmad-output/planning-artifacts/epics.md` *(modified — Stories 1.19 / 6.17 / 10.28 + 10.13's inherited obligation)*
- `_bmad-output/implementation-artifacts/deferred-work.md` *(modified — the mint section + D1-1.8, `:1091`, `:3432`)*
- `docs/adr/ADR-0038-geo-tree-scope-resolver.md` *(new)*
- `.decision-log.md` *(modified — Decision `2026-08-12-102`)*
- `docs/knowledge-transfer/adr-index.md` *(modified — Section A row + reconciliation note + counts)*

**New — the geo-tree substrate:**

- `packages/domain/src/geo-tree/index.ts`
- `packages/domain/src/geo-tree/resolver.ts` *(PURE + SYNCHRONOUS — no DB)*
- `packages/domain/src/geo-tree/registry.ts` *(the ONLY DB-touching file)*
- `packages/domain/src/geo-tree/document.ts`
- `packages/domain/src/geo-tree/errors.ts`
- `packages/domain/src/schema/geo_tree_versions.ts`
- `packages/domain/src/policies/geo-tree-versions-rls.ts`
- `packages/domain/migrations/0101_geo-tree-versions.sql` *(HAND-AUTHORED)*

**New — tests:**

- `packages/domain/tests/geo-tree/resolver.test.ts`
- `packages/domain/tests/geo-tree/document.test.ts`
- `packages/domain/tests/integration/geo-tree/registry.spec.ts`
- `apps/api/tests/unit/geo-tree-resolver-wiring.test.ts`

**Modified — wiring + barrels:**

- `packages/domain/src/index.ts`, `packages/domain/src/schema/index.ts`,
  `packages/domain/src/policies/index.ts`, `packages/domain/src/ids/index.ts`
- `packages/domain/migrations/meta/_journal.json`
- `apps/api/src/middleware/scope-resolution/index.ts`, `apps/api/src/types.ts`,
  `apps/api/src/modules/rbac/index.ts`
- `apps/api/src/modules/{trustee-lite/handlers.ts,member-moderation/handlers.ts,multi-tenant/index.ts,rules/index.ts}`
- `apps/jobs/src/reports-export.ts`
- `packages/domain/src/bulk-operations/{types.ts,execute.ts}`
- `packages/domain/src/reports/{types.ts,assemble.ts}`
- `governance_boundary.yaml`

**Modified — the marker sweep:**

- `packages/domain/src/rbac/{scope.ts,permissions.ts,roles.ts}`
- `packages/domain/src/reports/scope.ts`,
  `packages/domain/src/reports/templates/{_shared.ts,member-roster.ts,contribution-rate-by-district.ts}`
- `packages/domain/src/{news-blog/audience.ts,banners/audience.ts,banners/read.ts,pool/fixed-amount.ts}`
- `packages/contracts/src/banners/{enums.ts,dto.ts}`
- `apps/admin/src/modules/banners/derive.ts`

**Modified — pins + fixtures:**

- `packages/domain/tests/rbac/{scope.test.ts,check.test.ts}`
- `packages/domain/tests/bulk-operations/{execute.test.ts,fixtures.ts}`
- `packages/domain/tests/integration/reports/reports.spec.ts`
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`
- `packages/domain/tests/feature-flags/capability-bar.test.ts` *(golden-hash re-pin)*

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-13 | 1.0 | **IMPLEMENTED — all 8 tasks, all 8 ACs.** `geo_tree_versions` (migration `0101`, HAND-AUTHORED — `db:generate` emits a 114 KB full-schema dump because drizzle snapshots stop at `0020`) + the `geoTree` domain namespace implement `scopeContains`' seam by genuine ancestry, discharging ADR-0008 Decision 4. ⭐ **Applying it changes NO authorization outcome anywhere**: no code default geography ⇒ every Pariwar starts with no tree ⇒ `denyDeeperGeoResolver` (BYTE-UNCHANGED, verified by diff) applies; behaviour moves only on publication. Freeze row 9 untouched. **Governance committed FIRST** in two `governance:` commits (zero `packages/`/`apps/` files): Stories 1.19 / 6.17 / 10.28 minted with ACs, 10.13's inherited trustee-directory obligation recorded in its own `epics.md` section, ADR-0038 + Decision `2026-08-12-102` + the adr-index row & counts. **AC3: all ten sites dispositioned** — 4 wired (incl. the two domain contract changes, both OPTIONAL so every existing caller keeps today's behaviour), 6 not wired with the reason AT THE SITE. **AC4: nine pins, one written disposition each**; only `execute.test.ts` moved (no-resolver assertion kept + a with-resolver ALLOW companion + a not-a-blanket-allow guard). **D2 applied**: P1/R11 rewritten as rank-order and their unmeetable ACCEPTANCE CONDITION prose REMOVED, not reworded. **AC6**: `_shared.ts`'s `deny` re-examined per dimension and re-pinned — `state` now denies because the TYPE is single-valued, not because a resolver is missing; cardinality left to 10.28. **AC7**: `geo-tree` ADMITTED to `governance_boundary.yaml`'s prohibited list (a scan over an unlisted root proves nothing). **AC8**: both revert probes run RED and restored, with DIFFERENT failure sets — the one-edge corruption left the resolver fully working and still flipped a deny into a wrong ALLOW, proving the tests discriminate ancestry rather than presence. ⚠ RAISED not settled: the `roles.ts` `trustee_panel` note still reads as future tense but is ⛔ fenced from edit, so it was left byte-unchanged for BigDev's call; `deferred-work.md:1091` recorded as **"Not addressed"** because its re-pointing here was itself a misclassification (an unresolved-target-locator NULL question a resolver never reaches). VERIFICATION: `ci:local` **30 jobs green**; domain **2666 passed** / api **944 passed** live-DB single-pass; the 2 failures seen with `DATABASE_URL` exported globally were vitest-worker timeouts (the documented double-run pollution), innocence confirmed by re-run. | Amelia (Dev Agent) |
| 2026-08-12 | 0.3 | **All rulings closed; Task 1 unblocked.** D4-R ruled: S4 **closed by edit, no successor** — `self` is intentionally orthogonal to the geo-tree model and has no current or backlog consumer; the deny does not change, only the prose. D9-R ruled: the directory half re-points to **existing Story 10.13** (no mint), with the obligation recorded in 10.13's own `epics.md` section so an inherited deferral is not invisible at its owner. D7-R ruled: **three mints** — 1.19 / 6.17 / 10.28 — with Story 1.19's eight ACs approved and **typed-absence/fail-closed semantics made explicit** (⛔ nothing may imply a member necessarily resolves to all four geographic levels; a district-only tree is a first-class answer). Story 6.17 confirmed the correct owner of the block-dimension gate and fenced off `GEO_RANK`/`CEILING_RANK`/`scopeContains`. ⭐ **Story 10.28 is the PERMANENT owner of multi-node report scope and its existence is unconditional** — so **D6's *"unless it falls out cheaply"* branch is CLOSED** and Story 1.18 must **not** absorb it (a permanent owner born already-discharged is a contradiction); AC6 rewritten from *"revisit"* to *"disposition, never a build"*, while the `_shared.ts:40` re-examination stays in scope. Approved successor text added as **Appendix A** for verbatim minting; AC5 gained a closed disposition table so no marker can invent a different successor. | BigDev |
| 2026-08-12 | 0.2 | **D1–D6 ruled as recommended by BigDev; D7 accepted in principle with the mint gated on scope+AC approval.** Successor scoping then produced three evidence-driven refinements, raised not applied: **D4-R** — S4 has **zero** live consumers (the repo's only `dimension:'self'` check, `member-validity/handlers.ts:132`, passes `grants: []` + `isSelf: true` and bypasses the grant path), no backlog consumer and no FR, so the comment is a misdescription of a deliberate design choice (`scope.ts:50-55`; `GeoNode` excludes `self` by type) → recommend **"Closed by [edit]", no successor**. **D9-R** — the trustee-directory half's *"has no owner yet"* is stale: `10-13-fixed-amount-setter-admin-ui` (backlog, `epics.md:3657`) is the surface consuming Story 7.5's emergency attesting panel → **re-point, no mint**. **D7-R** — the re-deferrals do not share an owning model, so one bundled successor would recreate the epic-shaped bucket in story clothing → recommend **three mints** (1.19 geo audience / 6.17 block gate / 10.28 multi-node scope), which D4-R + D9-R cut down from five. Task 1 marked BLOCKED pending approval. | BigDev |
| 2026-08-12 | 0.1 | Initial story context. Marker table re-derived at `63c844e` (line numbers had drifted from 10.18's post-Task-4/5/6 figures). ⭐ **D2: P1/R11 found misclassified** — `block_admin`→district is rank-order (`tRank < gRank`, `scope.ts:232`), denied before the resolver, so no org tree lifts it; Story 10.18's *"target strictly narrower"* is inverted (the parent district is broader). ⭐ **AC2 added**: `hasPermission` is pure+sync and `GeoTreeResolver.contains` is sync, so the resolver cannot query — the tree preloads per-request beside `scopeGrants`. ⭐ **AC3 added**: **ten** authorization call sites, only one of which is `requirePermissionHook`; a partially-wired resolver is route-dependent authorization. Two of the ten (`bulk-operations/execute.ts:164`, `reports/assemble.ts:44`) call `checkPermission` **inside `@twt/domain` with no ctx**, so reaching them is a contract change to `BulkActorContext` + `ReportScopeCtx`, not HTTP wiring — and threading the first **flips** the `execute.test.ts:240` pin. Both remaining pins traced rather than assumed: `execute.test.ts:240` is genuine Family B and must be updated; `reports.spec.ts:124` is a **query-level** deny-deeper pin whose `checkPermission` already allows, so the resolver does not move it. ⭐ **AC7 added**: `rbac` is a `governance_boundary.yaml` prohibited root, so the resolver cannot be flag-gated. D1 recommends the `helpdesk_routing_policy_versions` posture with **no** code default, on the evidence that a `member_postings` projection can supply node values but zero edges (no `state`/`block` column exists anywhere). Seven decisions flagged for BigDev, four escalations raised, none absorbed. | BigDev |
