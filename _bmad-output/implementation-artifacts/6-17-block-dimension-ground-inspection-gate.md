---
baseline_commit: ba52ba0d88386458669cd89f2ad4b7b45b1a81cc
---

# Story 6.17: Block-Dimension Ground-Inspection Gate `[SURFACE]`

Status: review

> ⚠ **WHY THIS STORY SITS IN A RETROSPECTED EPIC.** `epic-6-retrospective` is `done`. The placement is
> deliberate and is **not** to be "corrected" into whichever epic happens to be open: this story extends the
> **ground-inspection gate Story 6.7 minted** (FR-40), and the project's rule is that *a successor belongs to
> the epic that owns the model it extends, at that epic's next free sequential number* — the same deliberate
> act that placed Story 1.18 in Epic 1 and Story 1.19 beside it. **Minted by Story 1.18 Task 1 (Decision
> `2026-08-12-102`), governance-first.** Do not flip `epic-6-retrospective` back. **Depends on Story 1.18**
> (`done`, merged `9fa4e31`) and reads Story 1.19's dispositions (`done`, merged `ba52ba0`).

## Story

As a Pariwar running ground inspections at block level,
I want the ground-inspection gate checked at the block dimension,
so that FR-40's block-level administrators can actually schedule inspections, instead of holding a grant the
model can never satisfy.

---

## 🎯 The gap, stated exactly

**FR-40** (`prds/prd-TWT-2026-05-22/prd.md:685-687`) names *"a block-/district-level admin"* as the
ground-inspection actor. Story 6.7 shipped the surface gated at `dimension: 'district'`
(`claims.ground-inspection.routes.ts:121-123`) and granted `claim.conduct_ground_inspection` to
`district_admin` **only** — `block_admin` was recorded DEFERRED (`roles.ts:406-435`).

⛔ **That deferral was misclassified, and Story 1.18 proved it.** The denial is **rank order**, not a missing
resolver:

```
GEO_RANK (scope.ts:65-71): state 2 < district 3 < block 4   (lower = BROADER)
grant {block,'Block-1'} → gRank 4;  target {district,'Patna'} → tRank 3
scope.ts:274  `if (tRank < gRank) return false`  →  3 < 4  →  DENIED, before any resolver runs.
```

And the alternative — a district-scoped grant for a block admin — fails the **other** line:
`scopeWithinCeiling('district','block')` reads `CEILING_RANK` and is a pure numeric compare with **no
resolver parameter at all** → `3 >= 4` → false. **Both denial paths are resolver-free.**

> ⚠ **LINE ANCHORS DRIFT, AND THE MINTED TEXT IS NOT EDITED TO CHASE THEM.** The epic ACs and several
> in-repo comments cite `scope.ts:232`, `check.test.ts:184` and `claim_ground_inspections.ts:116` — all
> written at an older head. Every anchor in **this file** is re-derived at `ba52ba0` (`:274`, `:192`,
> `:113-116`). ⛔ Use the re-derived anchors; ⛔ do not "fix" a line number inside minted AC text
> (Story 1.19, Escalation 3).

> ⭐ **Why a block gate works where the district gate cannot.** Re-gating at `dimension: 'block'` authorizes
> **both** actors: `block_admin` by **exact-node** match (`scope.ts:283`, `gRank === tRank` → value compare),
> and `district_admin` by **district→block ancestry** (`gRank 3 < tRank 4` → falls through to
> `resolver.contains`, `scope.ts:288-292`, which Story 1.18's `createGeoTreeResolver` now answers). A
> resolver can only ever **narrow**; this is the direction it points. **This is a gate redesign, not a
> resolver deferral.**

---

## ⛔ THE THREE TRAPS — read these before anything else

Ruled by BigDev, 2026-08-13, and called out here because each is the *obvious* reading of an AC and each one
breaks the system in a different direction.

| # | ⛔ Do NOT | ✅ The rule that holds instead |
|---|---|---|
| 1 | **Do not make `block` mandatory.** | `block` is **NULLABLE**. Pre-6.17 rows have no block and no honest value exists for one; a `NOT NULL` add would demand a fabricated backfill and would break every existing schedule call. |
| 2 | **Do not make `block` the universal gate.** | The gate dimension is a property of the **ROW**: `block IS NULL` ⇒ **legacy district authorization**, byte-identical to today. `block IS NOT NULL` ⇒ **block-dimension authorization**. |
| 3 | **Do not fall back from `block` → `district` when the tree is absent.** | **Absence must DENY, never widen.** A block-tagged row in a Pariwar with no resolvable tree **denies** ancestry-based district access. Clean 403; the operator omits `block` until their Pariwar publishes a tree. |

⭐ **Why trap 3 is the dangerous one.** It will look like a bug report — *"district_admin can't reach this
assignment"* — and the fix will look like a kindness. It is a **grant-on-absence rule**: it makes the absence
of data widen authorization, and makes publishing a tree narrow it. That inverts ADR-0038's entire posture
(*a wrong tree silently grants; an absent one merely denies*) and installs a config-shaped privilege switch
with no config file. **Pin the deny with a test so nobody "fixes" it later** — the **D6 polarity pair**
(Task 7), both halves mandatory, plus the fallback-probe that proves the pair isolates it.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| Not this story | Why | Owner |
|---|---|---|
| Changing `GEO_RANK` / `CEILING_RANK` / `scopeContains` ordering / the `GeoTreeResolver` interface | **Architectural freeze row 9** (`epics.md:527`) — AC5. Would silently re-authorize every grant in the system. | ADR + a different story |
| Lifting the rank-order pin at `check.test.ts:184` | AC4. This story **routes around** it with a different gate; the assertion stands green and unmodified. | settled — do not re-open |
| Building / editing / seeding a **geo tree** | Story 1.18 shipped registry + resolver and **deliberately no writer surface**. This story is a *reader*. See **Escalation 2**. | a future publishing surface |
| A member `block` **attribute** | `member_postings` carries `district text NOT NULL` and nothing else geographic (`schema/member_postings.ts:51`). `resolveMemberGeoNode` types `block` **permanently absent** (D5 of Decision `2026-08-13-103`). See **D1**. | not minted; no live requirement |
| Granting `claim.override_ground_inspection` to `block_admin` | The D6 supervisor override is a **pariwar-ceiling** authority above the inspector; unchanged by re-gating the *conduct* key. See **D8**. | — |
| `field_worker` ground inspection | `scopeCeiling: 'self'` + the dispatch/assignment substrate. Untouched. | **Epic 12** |
| The unified multi-district verifier view | Story 6.10 owns the console mount. | **Story 6.10** (`done`) |
| Adding `block` to the **verifier-console contract** (`contracts/src/claims/verifier-console.ts:169-170`) | Widening a `@twt/contracts` read shape is a separate reviewed change on 6.10's surface. See **Escalation 4**. | recorded, not minted |
| Re-opening the claim state machine | Ground inspection is an **identity annotation**; it never advances `claims.current_state` (`schema/claim_ground_inspections.ts:12-16`). | settled |

---

## Acceptance Criteria

> ⛔ **The five ACs below are MINTED TEXT (`epics.md:2707-2765`) and are NOT edited**
> ([[feedback_supersede_never_reinterpret]]). Where implementation refines or over/under-specifies one, the
> **disposition is recorded beside it** — the Story 1.19 AC4 precedent — never by rewriting the AC.

### AC1 — the block value's provenance is **recorded, not assumed**

`claim_ground_inspections` gains a block value — **or** block is derived via Story 1.19's primitive. The
choice is **recorded, not assumed** (the table carries `district text NOT NULL` and no block column today,
`schema/claim_ground_inspections.ts:116`).

> ✅ **RESOLVED BY D1 → ARM A (a column).** Arm B is **structurally impossible**, not merely undesirable, and
> the evidence is in the primitive itself. Recorded in full at **D1**.

### AC2 — the gate moves to `dimension: 'block'`, ceiling preserved

`claim.conduct_ground_inspection` is checked at `dimension: 'block'`, preserving `block_admin`'s
`scopeCeiling: 'block'` — ⛔ **no district-scoped grant is issued to a block admin**, which would violate the
ceiling.

> ⚠ **REFINED BY D2 (not contradicted).** The gate dimension is a property of the **ASSIGNMENT**, not of the
> route: a row carrying a block is checked at `dimension: 'block'`; a row carrying none is checked at
> `dimension: 'district'`, **byte-identically to today**. The AC does not say *"every assignment"*, and a
> route that gated block-dimension unconditionally would (a) make every pre-6.17 row unreachable and (b)
> revoke `district_admin`'s existing capability in every Pariwar that has published no tree — i.e. **all of
> them**. Recorded in full at **D2**.

### AC3 — `district_admin` still authorizes, via Story 1.18 ancestry. **Both roles are pinned by test.**

> ⚠ **CONDITIONAL IN PRODUCTION — see Escalation 2.** Ancestry answers only where the Pariwar has published a
> tree containing that `district → block` edge. No tree ⇒ `denyDeeperGeoResolver` ⇒ deny. **No writer surface
> for trees exists anywhere in the repo.** The AC is satisfiable by test (`geoTree.createGeoTreeVersion` is a
> domain function) and the capability is **inert in production** until a publishing surface ships. Recorded,
> not papered over.

### AC4 — the rank-order pin stays green and **unmodified**

⛔ `check.test.ts:184`'s rank-order pin stays **green and unmodified**. This story routes around it with a
different gate; it does not lift it.

> ⚠ **PRECISE READING.** The pin is the `it('RANK-ORDER PIN: a BLOCK-scoped grant can NEVER satisfy a
> district-dimension check')` block at `packages/domain/tests/rbac/check.test.ts:192-224`. Its **assertion
> body** (`member.suspend` @ `{district,'Patna'}` with a `{block,'Block-1'}` grant → `false`) is byte-frozen.
> ⛔ Its **comment** currently ends *"that is **Story 6.17**, not a resolver deferral"* — a marker naming THIS
> story, which must be dispositioned (AC-marker discipline, Task 6). Updating that comment is **not**
> modifying the pin; deleting, weakening or re-targeting the assertion is. ⛔ **Verify the diff of that
> `it(...)` block contains zero non-comment lines** (the Story 1.19 `derive.ts` precedent).
> ⛔ **DISTINCT PIN, and it DOES move:** `roles.test.ts:325-340` (*"block_admin DEFERRED"*, `holders` ==
> `['district_admin','super_admin']`) is a **v1-deferral** pin, not the rank-order pin. AC2/AC3 require it to
> change. Do not confuse the two.

### AC5 — the freeze holds

⛔ **No change to `GEO_RANK`, `CEILING_RANK`, or `scopeContains`** — architectural freeze row 9. Any such
change is an ADR and a different story.

> ✅ **COMMENT-ONLY EXCEPTION, RULED (D7, BigDev 2026-08-13).** `scope.ts:106` still lists *"`block`→`district`
> ancestry"* among the genuine Family-B deferrals — the **exact inverted premise** §RANK-ORDER twelve lines
> above exists to correct, and which Decision `2026-08-12-102` §5 ruled on. Correcting that sentence touches
> no ranking table and no function body. ⛔ **Prove it**: the `scope.ts` diff must contain zero non-comment
> lines, and the proof goes in the Dev Agent Record.

### AC-INH — the inherited governance-boundary obligation (Decision `2026-08-13-103`, D1)

> Story 1.19 shipped `resolveMemberGeoNode` in a **new** `packages/domain/src/member-geo/` and **deliberately
> did NOT admit** that root to `governance_boundary.yaml`'s `prohibited` list. ⚠ That non-admission is
> **conditional**, and this story is one of its two named triggers. ⛔ **The obligation binds ONLY on AC1's
> derive-via-1.19 arm.** Adding a block value to `claim_ground_inspections` carries no such obligation at all.
> **And** the re-assessment's outcome is **RECORDED either way** — *a green scan over an unlisted root proves
> the root is unlisted, not that the behaviour is admissible*.

> ✅ **DOES NOT BIND — because D1 takes arm A.** ⛔ **But "does not bind" is NOT "nothing to do".** The
> re-trigger comment at `packages/domain/src/member-geo/index.ts:26-27` names **Story 6.17** by number. If
> this story ships and that comment is left standing, it reads as **pending forever** — precisely the failure
> mode [[project_r7_fact_producer_unbuilt]] names. **Task 6 records the NON-FIRING at that comment and in the
> decision log**, leaving Story 10.4 as the sole standing trigger. Recorded in full at **D9**.

---

## 🚨 Decisions — **ALL RULED BY BIGDEV, 2026-08-13. Nothing here is open.**

**D1–D9 RULED as recommended** (D6 in the ruling's own words). **Escalations 1–3 ABSORBED; Escalation 4
DEFERRED with a re-trigger.** ⛔ Task 0 is therefore **unblocked** — but a ruling is not a licence to
re-derive: this story's whole subject is an authorization boundary, and each ⛔ below is load-bearing.

### D1 — AC1's either/or: **arm A (a `block` column)**. Arm B is *structurally impossible*.

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — arm A. The derive-via-1.19 arm is closed on the evidence below, and D9 carries the consequence.**

**Ruled: ✅ ARM A.** Three independent lines of evidence, any one sufficient:

1. **The primitive cannot supply it, permanently.** `liftDistrictThroughTree` returns
   `block: geoAbsent('no-member-attribute')` **unconditionally** (`member-geo/resolve.ts:124`), with the
   reason chosen precisely so *"no future edit can make it look tree-dependent"*. Decision `2026-08-13-103`
   D5: *"A posting supplies a **district**; ancestry walks **UP**; `block` sits **BELOW** district. No tree,
   however complete, can ever populate a member's block."*
2. **No member block attribute exists at any layer.** `member_postings` carries `district text NOT NULL` and
   nothing else geographic (`schema/member_postings.ts:51`), verified across all migrations through `0101`.
3. ⭐ **Even if it existed it would be the wrong value.** The assignment's jurisdiction is the **SITE's**, not
   the member's — `GROUND_INSPECTION_SITE_TYPES` includes `workplace`, `school_or_office` and
   `incident_location` (`schema/claim_ground_inspections.ts:59-67`), and `district` is already *"supplied at
   schedule time"* as *"the D6 AUTHORIZATION anchor"* (`:113-116`). Deriving jurisdiction from the deceased
   member's posting would silently re-anchor a shipped authorization boundary.

⇒ `claim_ground_inspections` gains `block text` (migration `0102`). **The choice is recorded here, which is
what AC1 actually asks for.**

### D2 — `block` is **NULLABLE**, and the gate dimension is a property of the **row**

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended. `NULL block` ⇒ legacy district authorization; `non-NULL block` ⇒ block-dimension authorization. See Traps 1 and 2.**

**Ruled: ✅ nullable + per-row dimension selection.** Two problems, one answer:

**(a) Pre-6.17 rows cannot be backfilled.** A `NOT NULL` add needs a value for every existing row, and no
honest value exists — inventing one is exactly the reconstruction [[feedback_record_unattested_no_backfill]]
forbids. ⇒ `block text` (nullable), no default, no backfill.

**(b) An unconditional block gate REVOKES `district_admin` in every treeless Pariwar.** With
`dimension: 'block'` and a `{district,'Patna'}` grant, `scopeContains` falls through to
`resolver.contains(...)`; with no published tree the middleware passes **no** resolver and
`denyDeeperGeoResolver` denies (`scope.ts:186-201`). ⭐ **There is NO code default geography (ADR-0038), so
"no tree" is the state every Pariwar starts in and — with no writer surface — the state every Pariwar is
permanently in today.** An unconditional block gate would therefore ship as a **total outage of the 6.7
surface**, which no AC asks for.

⇒ **The rule:** `block != null` → check at `dimension: 'block'` with the row's block; `block == null` → check
at `dimension: 'district'` with the row's district, **exactly as today**. Implemented as one small
dimension-selecting hook wrapper, not two chained gates.

⛔ **Rejected — an OR of two checks** (`district`-dim OR `block`-dim). It is strictly wider than either gate,
introduces a compound authorization primitive the codebase does not have, and would let a `district_admin`
act on a block-tagged row **without** the ancestry AC3 names — i.e. it would deliver AC3's *outcome* while
deleting its *mechanism*.

### D3 — `block` is supplied at schedule time and is **immutable on reschedule**

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — sibling error, no normalization, idempotency discriminator extended.**

**Ruled: ✅ mirror `district` exactly.** Optional `block` on `ScheduleBody`
(`claims.ground-inspection.routes.ts:41-55`); byte-identical comparison, ⛔ **no normalization** — no
trimming, no case-folding — because `geo-tree/resolver.ts:20-31` made that exact commitment for that exact
reason, and a module that case-folded while the tree did not would resolve `Bihar ⊇ patna` but not
`Patna ⊇ patna` **within one request**.

A reschedule must not move the assignment to a different block, for the identical reason it must not move
districts: *"the gate resolves from the target row, so allowing it to change would mint a replacement in a
[node] the actor was never checked against (cross-[node] authz escalation)"*
(`ground-inspection-persist.ts:122-134`). ⇒ **ADD a sibling** `GroundInspectionBlockImmutableError` →
`ground_inspection.block_immutable`. ⛔ Do **not** generalize the existing error: the code literal
`ground_inspection.district_immutable` is asserted in tests and mapped in the handler
(`claims.ground-inspection.handlers.ts:100-102`); its contract stays byte-identical.
⛔ Also extend the `bound.district !== input.district` idempotency-mismatch discriminator
(`ground-inspection-persist.ts:286-296`) to cover `block`, or a retry with a *different* block silently
returns the first assignment.

### D4 — the AC5 read route gains an **optional `?block=`**, with exactly-one-of enforced

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — exactly-one-of; both ⇒ 400, neither ⇒ 400.**

**Ruled: ✅.** `GET …/ground-inspection` requires `?district=` today and gates on it
(`routes.ts:190-197`); a `block_admin` can never satisfy that. ⇒ `ReadQuery` becomes
`{ district?: string; block?: string }` with a zod `.refine` enforcing **exactly one**; the gate resolves
dimension from whichever is present; the handler's in-memory filter (`handlers.ts:590`) filters on the same
field. ⛔ Supplying both is a **400**, never a silent precedence rule. ⛔ Supplying neither is a 400 — do not
let it degrade into "return everything".

### D5 — `PERMISSION_CATALOG_VERSION` **31 → 32**; `PERMISSION_CATALOG.keys` stays **41**

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — bump the model version, freeze the key count.**

**Ruled: ✅ bump.** This mints **no key**. The rule is already written down at
`permissions.ts:405-409` (Story 10.18's deliberate deviation): *"the catalog version is the version of the
CAPABILITY MODEL, not a count of keys. A consumer caching authorization decisions keyed on `catalogVersion`
must see the model move **when a new role can hold an existing key**"* — which is exactly what
`block_admin` + `claim.conduct_ground_inspection` is. ⇒ update `permissions.ts:423` and
`permissions.test.ts:54`; ⛔ **`permissions.test.ts:56`'s `toHaveLength(41)` must NOT move** — if it does, a
key was minted and this story has exceeded its scope.

### D6 — ⛔ **NO fallback to the district gate when a tree is absent**

> ✅ **RULED (BigDev, 2026-08-13), in the ruling's own words: "No district fallback when the geo tree is
> absent. Absence must deny rather than widen authorization."** This is **Trap 3**, and it is the one most
> likely to be undone later by someone treating the deny as a bug.

**Ruled: ✅ the escape hatch is rejected, permanently.** It will be tempting to write *"if this Pariwar
has no tree, gate the block row at district instead"*. ⛔ **That inverts ADR-0038's whole posture:** *"a wrong
tree silently GRANTS authority; an absent one merely denies"*. A grant-on-absence rule makes **the absence of
data widen authorization**, and makes **publishing a tree narrow it** — a config-shaped privilege switch with
no config file. The correct behaviour is: a `district_admin` in a treeless Pariwar **cannot create or act on
a block-tagged assignment**, gets a clean 403, and simply omits `block` (D2's null path) until their Pariwar
publishes a tree.

> ⛔ **THE POLARITY MUST BE EXECUTABLE, NOT COMMENTED (BigDev, 2026-08-13 — carried into implementation).**
>
> > **Missing geo-tree data is a DENIAL condition, not a FALLBACK condition.**
>
> A comment is **not** the control. This polarity ships as **two paired assertions in the integration
> suite** — the **D6 polarity pair**, Task 7 — and the pair is **non-negotiable**: one half without the other
> proves nothing. Half A alone could pass on a system that denies everything; half B alone could pass on a
> system that has silently re-widened. ⛔ **The story is not done if either half is missing, skipped, or
> `.todo`'d.** Name both tests in the Dev Agent Record (Task 8).

### D7 — correct `scope.ts:106`'s stale Family-B line (**comment-only**)

> ✅ **RULED (BigDev, 2026-08-13): APPROVED — correct it.** ⛔ Comment-only: the `scope.ts` diff must contain
> **zero non-comment lines**, proven and recorded (AC5, freeze row 9). The `deferred-work.md` branch below is
> therefore **not taken**.

**Ruled: ✅ correct it.** The line reads *"grant and target in the same tree with the target strictly
NARROWER (`state`→`district`, `block`→`district` ancestry). Those are real deferrals."* A `block` grant
reaching a `district` target is the target being **BROADER** — the inverted premise Decision
`2026-08-12-102` §5 ruled on and rewrote at `permissions.ts` and `roles.ts`, but which survived here.
Correct to `district`→`block` (the ancestry **this story** uses) and cite Story 6.17. ⛔ Zero non-comment
lines in the diff (AC5) — prove it with `git diff` and record the proof. ⛔ The alternative (leave it
byte-unchanged, record it in `deferred-work.md`) is **NOT taken**: a stale line that is neither corrected nor
recorded is the failure mode this marker discipline exists to prevent.

### D8 — `claim.override_ground_inspection` is **NOT** granted to `block_admin`

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — no override grant.**

**Ruled: ✅ no change.** The D6 supervisor override is *"a pariwar-ceiling authority above the
district inspector"* (`roles.test.ts:342-353`). Re-gating the **conduct** key says nothing about who may act
on an assignment they are not the inspector of. A block admin therefore acts **only** as the assigned
inspector, and the in-handler inspector-identity guard (`handlers.ts`, D6) is unchanged. Recorded so a later
reader does not read the omission as an oversight.

### D9 — the inherited obligation **does not fire**, and the **non-firing is recorded**

> ✅ **RULED (BigDev, 2026-08-13): APPROVED as recommended — record the non-firing at every site naming this story; `governance_boundary.yaml` untouched; Story 10.4 remains the sole standing trigger.**

**Ruled: ✅ record the non-firing at every site that names this story.** D1 takes arm A ⇒ no
authorization consumer of `resolveMemberGeoNode` is created ⇒ `packages/domain/src/member-geo` is **not**
admitted to `governance_boundary.yaml`. ⛔ **The yaml is not edited** — no root added, no `count` touched
(`count: 6` counts `allow` entries, not roots, and no flag is admitted here either way).

**What IS written down** (Task 6):
- `member-geo/index.ts:26-27` — the bullet naming Story 6.17 as a trigger is rewritten to record that the
  trigger **evaluated and did not fire**, with the reason (arm A), leaving **Story 10.4** as the sole
  standing trigger. ⛔ Do not delete the bullet; a deleted trigger is indistinguishable from a forgotten one.
- The decision-log entry states the same, and states plainly that **a passing `governance-boundary` run
  proves nothing here** — the root is unlisted, so the scan was always going to be green
  (`governance_boundary.yaml` README caveat; [[feedback_gate_scope_semantic_coverage]]).

---

## ⚠ ESCALATIONS — **RULED 2026-08-13: 1, 2 and 3 ABSORBED; 4 DEFERRED with a re-trigger.**

### Escalation 1 — the admin UI is **inside** this story, or the capability is unreachable

`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` is the only human path to this surface,
and it hardcodes district in three places: the scope form (`:46-91`), the schedule form's `defaultDistrict`
(`:136,178-179`), and the client contract (`api/client.ts:791-828`). Ship the gate without the UI and
`block_admin` holds a capability with no way to exercise it — **the exact inert-grant failure this story
exists to end**, moved one layer up.

> ✅ **ABSORBED (BigDev, 2026-08-13).**

**Ruled: ✅ absorb, minimally** — an optional `Block` input on both forms, `block` on
`GroundInspectionAssignment` + `ScheduleGroundInspectionBody`, `block` surfaced on the assignment row, and
the read call passing whichever locator the operator supplied. ⛔ **No redesign.** ⚠ `apps/admin/src/**` is
inside the **microcopy gate's** `code_globs` (`microcopy.yaml:270-272`), so new strings go through
`modules/ground-inspection/i18n-en.ts` and any colour comes from `@twt/tokens`, never a hex literal (FM-14).

### Escalation 2 — AC3's ancestry path is **inert in production**, and that must be recorded

`geo_tree_versions` has a domain writer (`geoTree.createGeoTreeVersion`) and **no route** — Decision
`2026-08-12-102` §7: *"No writer surface ships with Story 1.18."* Verified at `ba52ba0`: no `apps/api` route
references `geoTree` beyond the per-request **loader**. ⇒ AC3 is provable by test and **unreachable by a real
operator**, so this story ships `district_admin`-on-block-rows as a **capability, not a live behaviour** —
the `wa_cost_optimization` / `kyc_provider_selection` *"DECLARED, NOT PRODUCTION-ACTIVE"* posture.

> ✅ **ABSORBED (BigDev, 2026-08-13) — the production-inert status AND its re-trigger are both recorded.**

**Ruled: ✅ record it in the decision log with a concrete re-trigger** (*the first surface that publishes a
geo tree*). ⛔ **Do not mint a story from inside this one** — mints are governance acts taken at their owning
story ([[feedback_governance_commits_precede_implementation]]). ⛔ Do not claim AC3 is "live"; the honest
label is **DECLARED, NOT PRODUCTION-ACTIVE**, and it belongs in the Dev Agent Record as well as the decision
log.

### Escalation 3 — `block_admin` has **no other district-surface access**, so a block admin cannot see the claim

`block_admin`'s bundle is `[MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY]` (`roles.ts:433`). It holds neither
`claim.verify` (6.10 console) nor `claim.approve`. After this story it can schedule and complete an
inspection **it was given the id of**, and cannot browse claims to find one.

> ✅ **ABSORBED (BigDev, 2026-08-13) — the no-grant boundary is recorded as ruled.**

**Ruled: ✅ record as a known boundary; grant nothing.** FR-40 asks for the *inspection* actor, not a
claim-reading one, and widening a role's read surface is a separate capability decision. ⛔ Do not
opportunistically add `claim.verify` to `block_admin` — that is a different gate, a different dimension
(district), and would be denied anyway.

### Escalation 4 — the 6.10 verifier console shows `district` only, and would show it for a block-tagged row

`packages/contracts/src/claims/verifier-console.ts:169-170` types each ground-inspection entry as
`{ groundInspectionId, district, … }`. Adding `block` to the row breaks nothing — but after this story a
verifier reading the console sees a **district-only** description of an assignment whose actual jurisdiction
is a block. That is an incomplete signal on the surface FR-40 exists to feed.

> ⏸ **DEFERRED / RE-TRIGGER (BigDev, 2026-08-13), recorded verbatim as ruled:**
>
> > **The verifier-console contract remains district-only for this story. The first block-tagged assignment
> > reaching the verifier console re-triggers Story 6.10's surface for a reviewed contract widening.**

**Ruled: ⛔ NOT absorbed.** Widening a `@twt/contracts` read shape is Story 6.10's surface and a separate
reviewed change; taking it here would grow this story from *"re-gate one action"* into *"re-shape the
verifier console"*. ⛔ **Do not** quietly add the field to the contract "while we are here". ⛔ The deferral
is **recorded, not merely intended** — Task 6 writes the ruling above verbatim into `deferred-work.md` **and**
into the decision-log entry, because a deferral that lives only in a story file decays
([[feedback_mechanization_split_commitment]]). ⛔ The re-trigger names a **STORY** (6.10), never an epic
([[project_r7_fact_producer_unbuilt]]).


---

## Tasks / Subtasks

### Task 0 — Rule the decisions, branch, baseline (AC: all)

- [x] ✅ **DONE — all decisions ruled by BigDev, 2026-08-13.** D1–D9 as recommended (D6 in the ruling's own
      words); Escalations 1, 2, 3 **ABSORBED**; Escalation 4 **DEFERRED** with the verbatim re-trigger above.
      Nothing is open; Task 1 may start.
- [x] ⛔ Re-read **THE THREE TRAPS** at the top of this file before writing the gate. Each is the obvious
      reading of an AC, and each breaks the system in a different direction.
- [x] `git fetch origin` and confirm `origin/main` == `ba52ba0…` before reasoning about merge state
      ([[feedback_git_fetch_before_remote_reasoning]]).
- [x] Branch `feature/6-17-block-dimension-ground-inspection-gate` off `main`.
- [x] Record the **baseline green** BEFORE any change: `pnpm ci:local` + a live-DB single pass. ⛔ Scope
      `DATABASE_URL` **to the command**, never export it globally ([[project_ci_local_double_run_pollution]]).
- [x] Re-derive every line anchor cited in this file against current HEAD; ⛔ if one has drifted, use the
      re-derived anchor and **do not edit minted AC text** to fix a line number (Escalation 3 of 1.19).

### Task 1 — `governance:` — the decision-log entry (AC: 1, INH) — **COMMITS FIRST**

⛔ Governance commits precede implementation and land in their **own** commit with **zero** files under
`packages/` or `apps/` ([[feedback_governance_commits_precede_implementation]]).

- [x] Verify the current decision-log head is `2026-08-13-103` before writing (do not assume).
- [x] Add **Decision `2026-08-__-104`** covering: D1's arm-A ruling **with all three evidence lines**; D2's
      nullable + per-row dimension rule and *why* an unconditional gate is an outage; D5's catalog bump and
      the rule it applies; D6's rejected fallback; **D9's non-firing of the inherited obligation, recorded in
      both directions**; **Escalation 2's inert-in-production disposition with its re-trigger**; and
      **Escalation 4's verbatim deferral + re-trigger** (the verifier-console contract stays district-only).
- [x] ⛔ `Supersedes: nothing.` Decisions `2026-08-12-102` and `2026-08-13-103` are **not** edited, re-read or
      superseded ([[feedback_supersede_never_reinterpret]]).
- [x] Commit: `governance(6.17): Decision 2026-08-__-104 — …`

### Task 2 — Schema + migration (AC: 1)

- [x] `packages/domain/src/schema/claim_ground_inspections.ts` — add `block: text('block')` (**nullable**)
      beside `district`, with a header note stating: nullable **because pre-6.17 rows cannot be backfilled**;
      it is the D2 authorization anchor when present; ⛔ **no normalization** (D3).
- [x] Migration **`0102_ground-inspection-block.sql`** — `ALTER TABLE "claim_ground_inspections" ADD COLUMN
      "block" text;` ⛔ **Never regenerate an applied migration** ([[project_live_db_test_gotchas]] — 42P07).
      ⚠ `pnpm db:generate` emits a **114 KB full-schema dump** because drizzle snapshots stop at `0020`
      (Story 1.18's Change Log) — **hand-author** the file and append the `meta/_journal.json` entry
      (`idx: 102`, `version: "7"`).
- [x] ⛔ No RLS change (the existing tenant-isolation policies cover the row, not the column); no index — the
      block is read from an already-id-addressed row, never scanned.
- [x] Verify `pnpm --filter @twt/domain db:migrate` applies cleanly against a **fresh** test DB.

### Task 3 — RBAC: the grant, the catalog, the pins (AC: 2, 3, 4, 5)

- [x] `roles.ts` — add `CLAIM_CONDUCT_GROUND_INSPECTION` to `block_admin`'s `permissions`; `scopeCeiling`
      stays `'block'` (AC2). **Rewrite** the `:407-431` D1-reconciliation comment: it currently explains why
      the grant is *withheld*. Keep the rank-order explanation (it is still true and still load-bearing);
      replace the deferral with what shipped.
- [x] `permissions.ts` — rewrite the `:113-152` D1 block the same way; bump
      `PERMISSION_CATALOG_VERSION` 31 → 32 with a changelog line applying the 10.18 rule verbatim (D5).
- [x] `permissions.test.ts:54` → `32`. ⛔ `:56` stays `toHaveLength(41)`.
- [x] `roles.test.ts:325-340` — flip the holder set to `['block_admin','district_admin','super_admin']` and
      **rewrite the comment**; keep the not-a-holder loop (`pariwar_admin`, `state_trustee`, `verifier`,
      `field_worker`, `trustee_panel`) unchanged. ⛔ `roles.test.ts:342-353` (override key) is unchanged (D8).
- [x] `check.test.ts:192-224` — **assertion byte-frozen** (AC4); update only the trailing comment to record
      that Story 6.17 shipped and *how* it routed around the pin. **Verify zero non-comment diff lines.**
- [x] `scope.ts:106` — D7's comment-only correction (**ruled**). **Verify zero non-comment diff lines.**
- [x] ⛔ `GEO_RANK` / `CEILING_RANK` / `scopeContains` / `GeoTreeResolver` / `denyDeeperGeoResolver`:
      **byte-unchanged** (AC5). Prove with `git diff --stat` on `scope.ts`.

### Task 4 — Domain writers + accessors (AC: 1, 2)

- [x] `ground-inspection-persist.ts` — thread `block?: string | null` through the schedule + reschedule
      inputs and both inserts (`:314,378,409,427-428,500,530`).
- [x] Add `GroundInspectionBlockImmutableError` (D3) beside the district one (`:126-137`); enforce
      `input.block !== target.block` on reschedule alongside the district check (`:478`).
- [x] Extend the idempotency-mismatch discriminator (`:286-296`) to report `'block'`.
- [x] `ground-inspection-read.ts` — no signature change needed (the row now carries `block`); update the
      `getGroundInspectionById` doc comment (`:82-86`) — it says the read exists to resolve *"the
      assignment's `district`"*, which is now *"the assignment's authorization locator"*.

### Task 5 — API surface (AC: 2, 3) + admin UI (Escalation 1)

- [x] `claims.ground-inspection.routes.ts` — `ScheduleBody` gains optional `block`; `ReadQuery` becomes
      exactly-one-of `district | block` (D4). Replace the three fixed `conductFrom*` hooks with a **single
      dimension-selecting** wrapper: resolve `(dimension, value)` from body / row / query, then delegate to
      `requirePermissionHook`. ⛔ Keep it synchronous — `hasPermission` is a pure predicate and
      `resolveValue` may not query (`apps/api/src/modules/rbac/index.ts:60-66`).
      > ⚠ **`requirePermissionHook` does NOT compose with a per-request dimension as written.**
      > `RequirePermissionOptions.dimension` is read **once, at hook-construction time**
      > (`modules/rbac/index.ts:118`, `const dimension = opts.dimension ?? 'pariwar'`, captured **outside**
      > the returned `preHandler` closure) — unlike `resolveValue`, which correctly re-runs **per request**
      > inside the closure (`:128`). Ground-inspection rows vary block-tagged vs. legacy district-only
      > **row by row under the same route registration** (D2), so a single `requirePermissionHook(deps, key,
      > { dimension: 'block', resolveValue })` built once at startup can never flip to `'district'` for a
      > legacy row. Pick one, both of which require editing `modules/rbac/index.ts` — **explicitly in scope
      > for this story**, unlike `scopeResolutionHook` / `geoTreeResolverForRequest`, which stay untouched:
      > **(a)** call the `requirePermissionHook(...)` factory **fresh, inside the per-request wrapper**, after
      > synchronously resolving `(dimension, value)` from the row — still zero I/O, since the row is already
      > stashed on `request.groundInspection`; or
      > **(b)** extend `RequirePermissionOptions` with a `resolveDimension?: (request) => rbac.ScopeDimension`
      > alongside `resolveValue`, and read both **inside** the closure in `requirePermissionHook` itself.
      > Prefer (b) — it keeps the one-hook-per-route-registration shape every other caller of
      > `requirePermissionHook` relies on, rather than special-casing ground-inspection with an inline
      > factory call.
- [x] ⛔ **Do NOT touch** `scopeResolutionHook` or `geoTreeResolverForRequest` — the tree is already loaded
      once per request and injected (`scope-resolution/index.ts:65-71`; `rbac/index.ts:67-72`). Reuse; do not
      re-load ([[project_domain_limit_clamp_and_savepoint_retry]]'s sibling lesson: never put I/O in a gate).
      ⚠ `apps/api/src/middleware` and `apps/api/src/modules/rbac` are **prohibited roots** in
      `governance_boundary.yaml` — nothing flag-shaped may enter them.
- [x] `claims.ground-inspection.handlers.ts` — accept/echo `block`; map the new immutability error to
      `ground_inspection.block_immutable`; filter the read by whichever locator was supplied (`:582-621`).
- [x] `apps/api/src/audit/audit-sink.ts:280-290` — the `admin_ground_inspection.*` context already carries
      `district`; add `block` (non-PII, same class as district — `schema/claim_ground_inspections.ts:23-25`).
- [x] `packages/events/src/registry.ts:206-211` — extend the `claim.ground_inspection_scheduled` description
      to name `block`. ⛔ Non-PII only; the event carries no free text.
- [x] Admin UI + `api/client.ts` per **Escalation 1**, if ruled ABSORB.

### Task 6 — Markers, seams, and the recorded non-firing (AC: 4, 5, INH)

⛔ Every site naming *"Story 6.17"* is dispositioned. A marker pointing at a shipped story is worse than no
marker: it reads as pending forever.

| # | Site | Disposition |
|---|---|---|
| 1 | `packages/domain/src/rbac/permissions.ts` (D1 block, `:113-152`) | rewrite — shipped |
| 2 | `packages/domain/src/rbac/roles.ts` (`:407-431`) | rewrite — shipped |
| 3 | `packages/domain/tests/rbac/check.test.ts` (`:205-215`) | **comment only** — assertion frozen (AC4) |
| 4 | `packages/domain/src/rbac/scope.ts:106` | D7 (ruled) — **comment-only** correction; zero non-comment diff lines |
| 5 | `packages/domain/src/member-geo/index.ts:26-27` | **D9 — record the NON-FIRING**; 10.4 remains standing |
| 6 | `_bmad-output/implementation-artifacts/deferred-work.md:1726,1730` | close the block-gate line, citing 6.17 as shipped |
| 7 | `_bmad-output/implementation-artifacts/deferred-work.md` (new entry) | **Escalation 4** — record the ruling **verbatim**, re-trigger = *the first block-tagged assignment reaching the verifier console* → **Story 6.10** |
| 8 | `apps/admin/src/routes/GroundInspectionRoute.tsx:3-6` | **rewrite — shipped.** This comment does not name "Story 6.17" and will not be caught by a grep-based marker sweep; it currently describes the pre-6.17 district-only model verbatim (*"a PER-PARIWAR district-scoped grant... `{ dimension: 'district', … }`"*) and must be updated to the per-row block-or-district gate. |

- [x] Flip `sprint-status.yaml` `6-17-…: ready-for-dev → done` at completion, and add **one combined
      reverse-chron `last_updated` comment entry** ([[project_sprint_status_ledger]]).
- [x] ⛔ Do **not** flip `epic-6-retrospective`.

### Task 7 — Tests (AC: 2, 3, 4)

**Pure RBAC** (`packages/domain/tests/rbac/check.test.ts`, a new `describe` — ⛔ not inside the frozen one):
- [x] `block_admin` @ `{block,'Block-1'}` → **ALLOW** `claim.conduct_ground_inspection` on `{block,'Block-1'}`
      (exact node); **DENY** on `{block,'Block-2'}`.
- [x] `district_admin` @ `{district,'Patna'}` on `{block,'Block-1'}` → **DENY** with no resolver;
      **ALLOW** with a resolver placing `Block-1` under `Patna`; **DENY** with a resolver placing it under
      `Vaishali` (⭐ proves the test discriminates **ancestry**, not resolver *presence* — Story 1.18 AC8).
- [x] `block_admin` on a `{district,…}` target → still **DENY** (the rank order is untouched).

**Integration** (`apps/api/tests/integration/claims/ground-inspection.spec.ts`):

#### ⛔ THE D6 POLARITY PAIR — MANDATORY, BOTH HALVES, IN THE INTEGRATION SUITE

> **Missing geo-tree data is a DENIAL condition, not a FALLBACK condition.**

⛔ These two are the **executable form of D6**, not illustrations of it. Write them **first**, before the
happy paths, and ⛔ never `.skip` / `.todo` either one. Give them literal, greppable names so a later reader
finds them from the ruling:

- [x] **`D6 polarity (a): block assignment + NO resolvable tree → access DENIED`**
      · Seed an assignment with **non-NULL `block`**; publish **no** `geo_tree_versions` row for the Pariwar
        (⛔ *not* a tree missing that one edge — **no tree at all**, the resting state of every Pariwar).
      · Actor: `district_admin` @ `{district, <the row's district>}` — i.e. an actor who **would** be
        authorized under the legacy path, so the assertion isolates the tree's absence as the *sole* cause.
      · Expect **403** on the id-addressed verbs **and** on schedule-with-a-block-body.
      · ⛔ Assert it is a **clean authorization denial** — the structured 403 with an `authz.denied` audit
        emission — **not** a 404, a 500, or a validation error. A crash that happens to block access is not
        a deny, and would pass a naive `expect(res.statusCode).not.toBe(200)`.
      · Add the companion that proves the deny is about the **tree** and not about the **block column**:
        the same actor, same row, **with** a tree publishing `district → block` → **200**.
- [x] **`D6 polarity (b): district assignment + existing district path → behaviour UNCHANGED`**
      · Seed an assignment with **`block = NULL`** (the pre-6.17 shape) and publish **no** tree.
      · Actor: `district_admin` @ the row's district → **200**, exactly as before this story; and
        `district_admin` @ a *different* district → **403**, exactly as before this story.
      · ⭐ This is the half that proves the deny in (a) is **targeted**, not a blanket regression. Without it,
        (a) passes on a system that has broken the surface outright.
      · ⛔ Prefer asserting against the **existing** 6.7 expectations rather than fresh ones — the claim is
        *"unchanged"*, and a re-derived expectation can drift into agreeing with a regression.

- [x] Block path with a **published tree** (the AC3 happy path): `block_admin` schedules/completes;
      `district_admin` reaches it by ancestry; a wrong-block admin gets 403.
- [x] Reschedule changing `block` → `ground_inspection.block_immutable`; idempotent retry with a *different*
      block → mismatch, not a silent first-row return.
- [x] Read route: `?block=` allows a block admin; both params → 400; neither → 400.
- [x] `apps/admin/tests/ground-inspection-page.test.tsx` — the block input renders, is optional, and the read
      call sends the locator the operator actually supplied (Escalation 1).
- [x] Cross-tenant: a tree published in Pariwar A must not resolve an edge in Pariwar B.
- [x] ⚠ **Pin `created_at` on every seeded row** you read back through a clock-bounded query
      ([[project_known_livedb_test_failures]] #12 — the DATE-BOMB class: *it fails on a DATE, not a diff*).

**Revert-sanity (teeth)**:
- [x] Revert the `roles.ts` grant → the block-admin tests must go RED.
- [x] Corrupt **one** tree edge (`Block-1` under the wrong district) → the ancestry test must go RED while
      the exact-node test stays GREEN. ⛔ A revert that fails everything proves presence, not discrimination.
- [x] ⭐ **The D6 polarity probe — the one that matters.** Temporarily insert the forbidden fallback (*"if no
      tree, gate this block row at `district`"*) and re-run: **polarity (a) must go RED while polarity (b)
      stays GREEN.** ⛔ If (b) also goes red, the pair is not isolating the fallback and the tests need
      fixing before the story ships. Restore the code and record the probe's output verbatim — this is the
      evidence that the polarity is *enforced* rather than *described*
      ([[feedback_gate_scope_semantic_coverage]]: a green run over uncovered behaviour proves nothing).

### Task 8 — Verification (AC: all)

- [x] `pnpm ci:local` green — ⚠ `git push` runs the full `ci:local` via a pre-push hook (that is "the hang"),
      and the friction-budget AC-4 diffs **committed** history, so it passes vacuously until you commit
      ([[project_friction_budget_baseline_ratchet]]).
- [x] Live-DB **single** pass for `@twt/domain` + `@twt/api`, `DATABASE_URL` scoped to the command; record
      real file/test counts, before and after.
- [x] `governance-boundary` gate green — ⛔ and **state in the Dev Agent Record that this proves nothing
      about `member-geo`**, which is unlisted (D9).
- [x] `pnpm --filter @twt/domain lint` / `--filter @twt/api lint` — ESLint carve-out globs are **cwd-relative**
      ([[project_eslint_config_per_package_cwd]]).
- [x] ⛔ **Name both halves of the D6 polarity pair in the Dev Agent Record, with their real pass output and
      the fallback-probe result.** A story that ships without both halves named has not carried D6 into
      implementation, whatever its comments say.
- [x] Record every number as a **real local run at this branch's HEAD**. ⛔ Un-captured evidence is recorded
      as un-attested and carried as risk, never reconstructed ([[feedback_record_unattested_no_backfill]]).

---

## Dev Notes

### Files being MODIFIED — read each **before** editing

| File | What it does today | What changes | What must NOT break |
|---|---|---|---|
| `packages/domain/src/schema/claim_ground_inspections.ts` | `district text NOT NULL` = the D6 authorization anchor (`:113-116`); no active-uniqueness of any kind; PII tiering on 3 ciphertext columns | + `block text` nullable | ⛔ no new uniqueness constraint; `district` stays NOT NULL; PII classes unchanged |
| `packages/domain/src/rbac/roles.ts` (`:406-435`) | `block_admin` = `[MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY]`, ceiling `block`; a long D1-deferral comment | + the conduct key; comment rewritten | ⛔ ceiling stays `'block'`; ⛔ `MEMBER_SUSPEND` is **deprecated** — honoured, never re-granted, holder set frozen by `roles.test.ts:470-498` |
| `packages/domain/src/rbac/permissions.ts` | key catalog + `PERMISSION_CATALOG_VERSION = 31`; the D1 rank-order block at `:113-152` | version → 32; comment rewritten | ⛔ **no new key**; `keys` stays 41 |
| `packages/domain/src/rbac/scope.ts` | the frozen containment model | **comment-only**, `:106` (D7, ruled) | ⛔ AC5 — zero non-comment diff lines, proof recorded |
| `packages/domain/src/claim/ground-inspection-persist.ts` | schedule/reschedule/findings/complete/refusal writers under `SELECT … FOR UPDATE`; district immutability; idempotency binding | + `block` threading, + block immutability, + mismatch field | ⛔ the transition matrix, the row lock, and the `ground_inspection.district_immutable` code literal |
| `apps/api/src/modules/claims/claims.ground-inspection.routes.ts` | 7 routes; 3 fixed district-dimension hooks | one dimension-selecting hook; `block` in body; exactly-one-of read query | ⛔ per-endpoint chains **differ by design** (AC6 of 6.7) — do not "unify" them; ⛔ `resolveValue` stays synchronous |
| `apps/api/src/modules/claims/claims.ground-inspection.handlers.ts` | encrypt-before-insert; inspector-identity guard; in-memory district filter | + block echo/filter/error mapping | ⛔ the D6 inspector guard; ⛔ Tier-1 ciphertext never logged or echoed in the clear |
| `apps/api/src/audit/audit-sink.ts` (`:280-290`) | `admin_ground_inspection.*` audit-action union carries `district` | + `block` | ⛔ non-PII only, same class as `district` |
| `apps/admin/src/routes/GroundInspectionRoute.tsx` (`:3-6`) | header comment states the **current** model: *"`claim.conduct_ground_inspection` is a PER-PARIWAR district-scoped grant... `requirePermissionHook(claim.conduct_ground_inspection, { dimension: 'district', … })`"* | comment rewritten to describe the per-row block-or-district gate | ⛔ this file does **not** name "Story 6.17" — a grep-based marker sweep will not catch it; it is tracked explicitly here and in Task 6 instead |
| `apps/admin/src/modules/ground-inspection/{GroundInspectionPage.tsx,i18n-en.ts}` + `apps/admin/src/api/client.ts` (shared client, **not** under `modules/ground-inspection/`) | district-only scope + schedule forms | optional block (Escalation 1) | ⛔ microcopy gate: strings via i18n, colours via `@twt/tokens` |
| `packages/domain/tests/rbac/check.test.ts` | 9 deny-deeper pins incl. the AC4 rank-order pin | new `describe` + comment update | ⛔ the `:192-224` assertion body is byte-frozen |
| `apps/admin/tests/ground-inspection-page.test.tsx` | pins the district-only forms | update, do not delete | ⛔ assert the block field in **both** directions (present → block locator; absent → district locator) |
| `packages/events/src/registry.ts:206-211` | `claim.ground_inspection_scheduled` description names the payload fields | + `block` | ⛔ description only; the event carries **no PII and no free text** |

### Reuse — do **NOT** reinvent

- **The resolver, the loader, and the injection point all exist.** `scopeResolutionHook` loads the in-force
  tree **once per request** (`middleware/scope-resolution/index.ts:65-71`) and `geoTreeResolverForRequest`
  turns it into the domain's `GeoTreeResolver` (`modules/rbac/index.ts:67-72`). `requirePermissionHook`
  already passes it (`:140-143`). ⛔ **Write no new loader, no new resolver, no per-check query.**
- **Ancestry is already implemented.** `geoTree.createGeoTreeResolver` walks `descendant → ancestor`; the
  document already admits `block` nodes (`schema/geo_tree_versions.ts:59`) and a `{block, parent: state}`
  edge is legitimate — parents are *"strictly broader"*, not *"exactly one level up"*
  (`geo-tree/document.ts:59`).
- **The `district` field is the template for `block` in every layer** — schema comment, writer threading,
  immutability guard, idempotency discriminator, audit context, event description, route resolver, handler
  filter, client type, form field. Follow it; do not invent a parallel mechanism.
- **Tests publish a tree with `geoTree.createGeoTreeVersion`** (domain). See
  `packages/domain/tests/integration/geo-tree/registry.spec.ts` and
  `tests/integration/member-geo/member-geo.spec.ts` for the seeding shape.
- **Nothing here needs `memberGeo`.** D1 rules arm A. ⛔ Importing `resolveMemberGeoNode` into this surface
  would fire the AC-INH obligation for no benefit and against the evidence.

### Anti-patterns this story is specifically exposed to

1. ⛔ **Gating every assignment at `block`.** It is the obvious reading of AC2 and it is an **outage**: every
   pre-6.17 row becomes unreachable and every treeless Pariwar (i.e. all of them) loses the surface. D2.
2. ⛔ **"Fall back to district when the tree is missing."** Grant-on-absence inverts ADR-0038. D6.
3. ⛔ **Backfilling `block` on existing rows.** No honest value exists.
   [[feedback_record_unattested_no_backfill]].
4. ⛔ **Normalizing the block string** (trim / lowercase). The tree does not, and one-request inconsistency is
   worse than either rule. `geo-tree/resolver.ts:20-31`.
5. ⛔ **Touching `GEO_RANK` / `CEILING_RANK` / `scopeContains`** to "make block work". Freeze row 9; it would
   silently re-authorize every grant in the system.
6. ⛔ **Weakening `check.test.ts:184`.** The pin is the AC; routing around it is the story.
7. ⛔ **Granting `block_admin` a district-scoped row** in `role_grants` to shortcut ancestry. It violates the
   role ceiling (`scopeWithinCeiling('district','block')` → false) and is exactly what AC2 forbids.
8. ⛔ **Making `resolveValue` async** to look the block up. `hasPermission` is pure by ADR-0008 Decision 8;
   the row is already stashed on `request.groundInspection` by the existing preHandler.
9. ⛔ **Claiming the `governance-boundary` green run validates `member-geo`.** The root is unlisted; the scan
   was always going to pass. [[feedback_gate_scope_semantic_coverage]].
10. ⛔ **A type-only import turning into a value import** across `member-geo` / `geo-tree` / `rbac`. It
    materializes a module-init cycle that breaks **consuming** packages at runtime while typecheck, lint and
    the local suite stay green ([[project_type_only_import_cycle_trap]]).
11. ⛔ **Leaking `@twt/domain`'s pg-touching namespaces into `@twt/contracts`.** The admin client defines its
    own zod shapes on purpose (`api/client.ts:776-779`) — keep it that way
    ([[project_contracts_domain_bundle_boundary]]).

### Testing standards

- Vitest. Domain unit tests are DB-free; `*.spec.ts` under `tests/integration/` are live-DB
  (`twt-test-pg`:5433). ⛔ Never `DROP SCHEMA` (42P01); ⛔ never regenerate an applied migration (42P07)
  ([[project_live_db_test_gotchas]]).
- Own-committing writers ⇒ assert **membership**, not counts.
- Suite-level `{ timeout: 20000 }` on live-DB suites; `--concurrency=4` is already set for `turbo run test`
  ([[project_ci_local_concurrency_oversubscription]]).
- **Revert-sanity is required, not optional** — a gate or a test that cannot be made to fail proves nothing
  ([[feedback_gate_scope_semantic_coverage]]).
- ⚠ **The DATE-BOMB class**: pin `created_at` on any seeded row read back through a clock-bounded query.

### Previous-story intelligence

**Story 1.19 (`done`, merged `ba52ba0`)** — the immediate predecessor, and the source of this story's
inherited obligation:
- `resolveMemberGeoNode` ships in `packages/domain/src/member-geo/`, **deliberately not admitted** to the
  prohibited roots, with a **standing, mechanized** re-trigger naming this story. D9 discharges it.
- `block` is permanently typed-absent (`no-member-attribute`) — **the single fact that resolves AC1**.
- Its Deviation 3 is the template for D7 here: a **comment-only** change to a fenced file, with the
  zero-non-comment-lines check stated explicitly.
- Its DATE-BOMB (seeded `created_at` defaulting to wall-clock against a pinned query instant) cost a
  debugging cycle; every posting seed now pins the timestamp.
- Its `ci:local` run recorded an **unreproduced flake honestly**, attributed to nothing. Do the same.

**Story 1.18 (`done`, merged `9fa4e31`)** — the model this story consumes:
- Migration `0101` was **hand-authored** because `db:generate` emits a 114 KB full-schema dump (snapshots
  stop at `0020`). Task 2 inherits that.
- AC8's revert probes proved the tests **discriminate ancestry rather than presence** — Task 7 repeats that
  design deliberately.
- Its D2 is why this story exists at all; its AC7 (`geo-tree` admitted to `governance_boundary.yaml`) is the
  precedent D9 reasons from in the opposite direction.

**Story 6.7 (`done`)** — the surface being re-gated: seven routes, per-endpoint chains that **differ by
design**, one row per **assignment** (never per claim), district as an *authorization boundary* and not an
inspection identity, and both events as **identity annotations** that never move `claims.current_state`.

### Git intelligence (last 5 commits)

```
ba52ba0 Merge PR #186 — 1.19 member geo attribution
a4a3f7d story(1.19): code-review fixes — genuine cross-tenant tests, split log cause, D3/dead-export cleanup
dc25916 story(1.19): member→geo attribution + the state audience arm, wired end-to-end in BOTH consumers
f263ce4 governance(1.19): Decision 2026-08-13-103 — eight rulings, six marker dispositions, D1's MECHANIZED re-trigger
9fa4e31 Merge PR #185 — 1.18 geo-tree scope resolver
```

The shape to copy: **`governance:` first with zero `packages/`/`apps/` files**, then `story(N):`, then
`story(N): code-review fixes`. History must read governance → implementation
([[feedback_governance_commits_precede_implementation]]). Commit manually (branch + selective stage), not via
`commit-story` ([[project_story_automator_ops]]).

### Project Structure Notes

- Domain columns snake_case, TS camelCase (architecture `:3645`, `:3699-3711`) — `block` ↔ `block`, no drift
  risk here, but the **contracts snake_case vs domain camelCase** trap is live for the admin client
  ([[feedback_story_validate_footguns]]).
- Migrations are sequential + hand-authored; next free is **`0102`** (1.19 wrote none).
- New RBAC tests belong in `packages/domain/tests/rbac/`; API integration in
  `apps/api/tests/integration/claims/`.
- ⛔ No new package. No new domain namespace — this story extends `claim/` and `rbac/`, both of which exist.

### References

- `_bmad-output/planning-artifacts/epics.md:2707-2765` — Story 6.17's five minted ACs + the inherited obligation
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:685-687` — FR-40
- `_bmad-output/planning-artifacts/epics.md:527` — architectural freeze row 9 (RBAC key + scope-dimension model)
- `.decision-log.md:99-160` — Decision `2026-08-12-102` (§5 the misclassification; §6 the mint of 6.17)
- `.decision-log.md:37-97` — Decision `2026-08-13-103` (D1 non-admission + re-trigger; D5 permanent block absence)
- `docs/adr/ADR-0038-geo-tree-scope-resolver.md` — no code default geography (`drafted`, **not ratified**)
- `packages/domain/src/rbac/scope.ts:78-115` — §RANK-ORDER, the canonical explanation
- `packages/domain/src/rbac/scope.ts:219-292` — `scopeContains` (`:274` the rank guard; `:288` the resolver call)
- `packages/domain/src/geo-tree/{resolver,registry,document}.ts` — ancestry, loader, validation
- `packages/domain/src/member-geo/{index,resolve}.ts` — the re-trigger comment + the permanent `block` absence
- `governance_boundary.yaml` — the prohibited roots + the README caveat on unlisted roots
- `_bmad-output/implementation-artifacts/1-18-geo-tree-scope-resolver.md` / `1-19-…md` — predecessors
- `_bmad-output/implementation-artifacts/deferred-work.md:1726-1730` — the marker this story closes

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — bmad-dev-story workflow, single execution, 2026-08-13.

### Debug Log References

**Baseline, captured BEFORE any change** (branch `feature/6-17-block-dimension-ground-inspection-gate`
off `main` @ `ba52ba0`; `origin/main` confirmed == `ba52ba0` via `git fetch origin`):

| Run | Result |
|---|---|
| `pnpm ci:local` | **PASSED — 30 job(s) green** (`integration-tests` SKIPPED — no `DATABASE_URL`) |
| live-DB `@twt/domain` | **238 files / 2725 passed, 1 skipped (2726)** |
| live-DB `@twt/api` | **115 files / 944 passed, 1 skipped (945)** |

**After, at this branch's HEAD** — every number a real local run, ⛔ nothing reconstructed
([[feedback_record_unattested_no_backfill]]):

| Run | Result | Δ |
|---|---|---|
| `pnpm ci:local` | **PASSED — 30 job(s) green** | — |
| live-DB `@twt/domain` | **238 files / 2733 passed, 1 skipped (2734)** | **+8 tests** (the new `Story 6.17 block-dimension` describe: 7; the `roles.test.ts` ceiling assertion rides the existing `it`) |
| live-DB `@twt/api` | **115 files / 951 passed, 1 skipped (952)** | **+7 tests** (2 polarity + 5 block-path/immutability/idempotency/read-locator/cross-tenant) |
| `pnpm --filter @twt/domain lint` | clean | — |
| `pnpm --filter @twt/api lint` | clean | — |
| `pnpm --filter @twt/admin lint` | clean | — |
| `pnpm governance-boundary:check` | **✓ gate passed** — 167 source files, 9 roots | ⛔ see the caveat below |
| `pnpm --filter @twt/domain db:migrate` (FRESH db `twt_fresh_0102`, full 0001→0102 chain) | applied cleanly; `block \| text \| (nullable)` verified, then dropped | — |
| admin-UI suite `ground-inspection-page.test.tsx` | 9 passed (was 4) | **+5** |

⚠ **`DATABASE_URL` was scoped to the command on every live run**, never exported globally
([[project_ci_local_double_run_pollution]]). No unreproduced flake was observed in either pass.

⭐ **`ci:local` was run a THIRD time, AFTER the story commit `b0d660e`, and this is the run that
actually means something for the friction budget.** AC-4 diffs **committed** history, so the two runs
above passed it *vacuously* — there was nothing committed to diff
([[project_friction_budget_baseline_ratchet]]). Post-commit: **`✓ friction-budget gate passed` →
`ci:local PASSED — 30 job(s) green`**, with the real 27-file diff in scope. (This is also what the
pre-push hook will run, so "the hang" on `git push` has already been paid.)

⛔ **THE `governance-boundary` GREEN PROVES NOTHING ABOUT `member-geo`, and saying so is the point.**
The gate's scanned roots are `packages/domain/src/{contribution,pool,claim,geo-tree}`,
`apps/api/src/{middleware,modules/rbac,audit,plugins}` and `scripts`. **`packages/domain/src/member-geo`
is not among them** — it was deliberately NOT admitted at Story 1.19 (Decision `2026-08-13-103`, D1), so
the scan was always going to be green whatever this story did. *A green scan over an UNLISTED root proves
the root is unlisted, not that the behaviour is admissible* ([[feedback_gate_scope_semantic_coverage]];
the gate's own README caveat). The real answer is D9's, recorded in prose in two places.

### Completion Notes List

#### ⛔ THE D6 POLARITY PAIR — both halves, named, with their real output

Both live in `apps/api/tests/integration/claims/ground-inspection.spec.ts`, written **before** the happy
paths, neither `.skip`'d nor `.todo`'d:

- ✅ **`D6 polarity (a): block assignment + NO resolvable tree → access DENIED`** — PASSING.
  A `district_admin@Patna` (an actor who **would** pass under the legacy path, so the tree's absence is
  the *sole* cause) is denied on a block-tagged assignment in a Pariwar with **no tree at all**: 403 on
  schedule-with-a-block-body, 403 on the id-addressed `PATCH`, 403 on `?block=`. Asserted as a **clean
  authorization denial** — the structured 403 carries `authz.forbidden` **and** an `authz.denied` audit
  line is emitted with `targetLocator: { dimension: 'block', value: 'Block-1' }` — ⛔ not a 404, not a
  500, not a validation error. The companion then publishes `Patna → Block-1` and the same actor, same
  row, gets **200**, proving the deny was about the **tree** and not about the block **column**.
- ✅ **`D6 polarity (b): district assignment + existing district path → behaviour UNCHANGED`** — PASSING.
  `block = NULL`, no tree: right district → **201/200**, wrong district → **403**, the read returns the
  row with `block: null`, and the id-addressed `PATCH` still reaches it. Asserted against the **existing**
  6.7 expectations, not re-derived ones.

#### ⭐ THE FALLBACK PROBE — the evidence the polarity is ENFORCED, not described

The forbidden fallback was temporarily inserted into `claims.ground-inspection.routes.ts`
(`resolveDimension: … block != null && request.geoTree ? 'block' : 'district'`, i.e. *"if no tree, gate
this block row at district"*) and the suite re-run. Verbatim:

```
=== PROBE: forbidden fallback inserted (if no tree, gate the block row at district) ===
   × Ground-inspection admin surface — E2E (:5433) > D6 polarity (a): block assignment + NO resolvable tree → access DENIED 174ms
     → expected 201 to be 403 // Object.is equality
      Tests  1 failed | 13 passed (14)
=== RESTORED ===
      Tests  14 passed (14)
```

⭐ **(a) went RED; (b) stayed GREEN; nothing else moved.** The pair isolates the fallback. Note *how* (a)
failed — `expected 201 to be 403`: the fallback did not crash anything, it **silently granted** the
schedule. That is precisely the shape D6 exists to forbid, and precisely what a naive "not 200" assertion
would have missed.

#### The other two revert-sanity probes

- **Revert the `roles.ts` grant** → exactly **2** tests RED (`roles.test.ts` holder set +
  `block_admin@Block-1 ALLOWS … (exact node)`), 148 green. Restored → 150 green.
- **Corrupt ONE tree edge** (`PATNA_HAS_BLOCK1` re-parented to `Vaishali`) → exactly **1** test RED, the
  **ancestry** one; the **exact-node** test stayed GREEN. ⭐ That is the Story 1.18 AC8 design repeated on
  purpose: it proves the tests discriminate **ancestry**, not resolver **presence**. A revert that
  reddens everything proves presence, not discrimination.

#### AC dispositions

- **AC1 — SATISFIED, arm A.** `claim_ground_inspections.block text` (nullable), migration `0102`
  hand-authored (⛔ never `db:generate` — snapshots are frozen at `0020`), `meta/_journal.json` entry
  `idx: 102`, `version: "7"`. The choice is **recorded** at D1, in Decision `2026-08-13-104`, in the
  migration header and in the schema comment.
- **AC2 — SATISFIED as REFINED by D2.** The gate dimension is a property of the **row**. `block_admin`'s
  `scopeCeiling` stays `'block'` (now asserted explicitly in `roles.test.ts`); ⛔ no district-scoped grant
  was issued to a block admin.
- **AC3 — SATISFIED BY TEST; `DECLARED, NOT PRODUCTION-ACTIVE` in production.** Both roles are pinned, at
  the pure-predicate layer *and* end-to-end over HTTP. ⚠ Ancestry answers only where the Pariwar has
  published a tree, and **no writer surface for trees exists anywhere in the repo** — verified again at
  this HEAD. The tests publish one via the domain function `geoTree.createGeoTreeVersion`. ⛔ This is not
  claimed as live; the re-trigger (*the first surface that publishes a geo tree*) is recorded in the
  decision log and in `deferred-work.md`.
- **AC4 — HELD.** The `RANK-ORDER PIN` `it(...)` block is **byte-frozen**. Proof: `git diff -U0` on
  `check.test.ts` yields **zero removed non-comment lines**, and a comment-stripped diff of the whole file
  against `HEAD` shows a single hunk — `191a192,270`, a pure **addition** (the new `describe`). The pin's
  comment was updated to record that 6.17 shipped and *how* it routed around it; that is not modifying the
  pin. ⛔ The **different** pin — `roles.test.ts`'s v1-deferral holder set — moved, as AC2/AC3 require, and
  the two are now explicitly distinguished in both comments.
- **AC5 — HELD.** `scope.ts` diff: **1 file changed, 11 insertions(+), 1 deletion(-)**, and
  `git diff -U0 | grep -cv '^[+-]\s*(//|$)'` = **0** — zero non-comment lines. `GEO_RANK`, `CEILING_RANK`,
  `scopeContains`, the `GeoTreeResolver` interface and `denyDeeperGeoResolver` are all byte-unchanged.
- **AC-INH — EVALUATED, DID NOT FIRE, RECORDED (D9).** D1 takes arm A ⇒ no authorization consumer of
  `resolveMemberGeoNode` was created ⇒ `governance_boundary.yaml` is **untouched** (no root, no `count`).
  The re-trigger bullet at `member-geo/index.ts` was **rewritten, not deleted**, to say the trigger
  evaluated and did not fire, with the reason, leaving **Story 10.4** as the sole standing trigger. The
  same is written in the decision log and in `deferred-work.md` — in **both directions**, because a green
  scan over an unlisted root proves nothing.

#### Deviations & things a reviewer should look at first

1. ⚠ **`apps/api/src/modules/rbac/index.ts` was edited — deliberately, and it is the load-bearing change.**
   `RequirePermissionOptions.dimension` is captured **once at hook-construction time**, unlike
   `resolveValue`, which re-runs per request inside the closure. Ground-inspection rows vary block-tagged
   vs. legacy **row by row under one route registration**, so a hook built at startup could never flip.
   Option **(b)** was taken (as the story recommends): a new `resolveDimension?: (request) => ScopeDimension`
   read **inside** the closure. It keeps the one-hook-per-registration shape every other caller relies on,
   and it is **additive** — every existing caller is byte-unaffected. ⛔ `scopeResolutionHook` and
   `geoTreeResolverForRequest` were **not** touched; nothing flag-shaped entered the prohibited roots (the
   gate confirms both roots clean).
2. ⚠ **The `claim.ground_inspection_scheduled` payload gained `block`, typed `.nullish()`.** The story's
   Task 5 asked for the registry **description** to name `block`; a description naming a field the payload
   does not carry would be false, so the payload carries it. `.nullish()` rather than `.nullable()` is
   load-bearing: the payload is `.strict()` and this schema also validates events appended **before** this
   story, which have no `block` key at all. ⛔ No historical event was backfilled.
3. ⚠ **`GroundInspectionBlockImmutableError` also fires on the null↔non-null transitions**, in both
   directions. That is stricter than "cannot change block" reads at first glance, and it is intended:
   *adding* a block moves a row from the district gate to the block gate and *clearing* one moves it back —
   each is a silent **re-gating** of an assignment against an actor who was checked under the other gate.
   Both are new schedules, not reschedules. Asserted in the integration suite.
4. ⚠ **`apps/admin/tests/ground-inspection-page.test.tsx` gained a `beforeEach(vi.clearAllMocks)`.** The
   api-client mock is module-level, so its call log accumulated across tests; every pre-existing
   `mock.calls[0]` happened to be correct only because those tests ran first. Clearing makes each index
   mean what it reads as. No existing assertion changed.
5. **Escalation 3 honoured — nothing opportunistic was granted.** `block_admin` still holds only
   `[member.suspend, member.view_validity, claim.conduct_ground_inspection]`. It can act on an inspection
   **it was given the id of** and cannot browse claims to find one. ⛔ No `claim.verify`, ⛔ no
   `claim.override_ground_inspection` (D8, asserted).
6. **Escalation 4 honoured** — `packages/contracts/src/claims/verifier-console.ts` is **byte-unchanged**.
   The deferral and its re-trigger (→ **Story 6.10**) are recorded verbatim in `deferred-work.md` and in
   Decision `2026-08-13-104`.
7. **`epic-6-retrospective` was NOT flipped**, per the story's placement note.

### File List

**Governance (committed FIRST, zero `packages/`/`apps/` files — commit `9e28fc4`)**
- `.decision-log.md` — Decision `2026-08-13-104` (M)
- `_bmad-output/implementation-artifacts/deferred-work.md` — Escalation 4 deferral + AC3's production-inert status (M; later also the marker closures)

**Schema + migration**
- `packages/domain/src/schema/claim_ground_inspections.ts` (M)
- `packages/domain/migrations/0102_ground-inspection-block.sql` (A)
- `packages/domain/migrations/meta/_journal.json` (M)

**RBAC**
- `packages/domain/src/rbac/roles.ts` (M)
- `packages/domain/src/rbac/permissions.ts` (M)
- `packages/domain/src/rbac/scope.ts` (M — **comment-only**)

**Domain writers / accessors / events**
- `packages/domain/src/claim/ground-inspection-persist.ts` (M)
- `packages/domain/src/claim/ground-inspection-read.ts` (M — comment-only)
- `packages/domain/src/claim/events.ts` (M)
- `packages/events/src/registry.ts` (M — description only)

**API**
- `apps/api/src/modules/rbac/index.ts` (M)
- `apps/api/src/modules/claims/claims.ground-inspection.routes.ts` (M)
- `apps/api/src/modules/claims/claims.ground-inspection.handlers.ts` (M)
- `apps/api/src/audit/audit-sink.ts` (M — comment only)

**Admin UI (Escalation 1)**
- `apps/admin/src/api/client.ts` (M)
- `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` (M)
- `apps/admin/src/modules/ground-inspection/i18n-en.ts` (M)
- `apps/admin/src/routes/GroundInspectionRoute.tsx` (M — comment only, marker #8)

**Markers / seams**
- `packages/domain/src/member-geo/index.ts` (M — D9's recorded NON-FIRING)

**Tests**
- `packages/domain/tests/rbac/check.test.ts` (M — frozen `it` untouched; new `describe`)
- `packages/domain/tests/rbac/roles.test.ts` (M)
- `packages/domain/tests/rbac/permissions.test.ts` (M)
- `apps/api/tests/integration/claims/ground-inspection.spec.ts` (M)
- `apps/admin/tests/ground-inspection-page.test.tsx` (M)

**Story / sprint**
- `_bmad-output/implementation-artifacts/6-17-block-dimension-ground-inspection-gate.md` (A)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (M)

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-13 | 1.0 | **IMPLEMENTED — status `ready-for-dev` → `review`.** Governance committed FIRST (`9e28fc4`, zero `packages/`/`apps/` files): Decision `2026-08-13-104` with D1–D9 + the four escalation dispositions, and Escalation 4's deferral recorded **verbatim** in `deferred-work.md` with **Story 6.10** as its named owner. Then the implementation: migration `0102` adds a **nullable** `claim_ground_inspections.block` (hand-authored — snapshots are frozen at `0020`; fresh-DB chain 0001→0102 verified and dropped); `block_admin` gains `claim.conduct_ground_inspection` with `scopeCeiling` **unchanged** at `'block'`; `PERMISSION_CATALOG_VERSION` 31 → 32 with `keys` **still 41**; and the gate DIMENSION becomes a property of the **ROW** via a new `resolveDimension` option on `requirePermissionHook` — the load-bearing edit, because `dimension` was captured once at hook-construction time and one route registration serves both row shapes. ⛔ **AC4 and AC5 both held, and both are proven rather than asserted**: `scope.ts` shows *11 insertions, 1 deletion, **zero** non-comment diff lines*, and `check.test.ts`'s comment-stripped diff against `HEAD` is the single hunk `191a192,270` — a pure addition, with **zero** removed non-comment lines anywhere in the file. ⭐ **The D6 polarity pair ships as executable control, and the fallback probe proves it isolates the forbidden behaviour**: inserting *"if no tree, gate this block row at district"* turned polarity **(a) RED (`expected 201 to be 403` — the fallback SILENTLY GRANTED, exactly the shape D6 forbids) while (b) stayed GREEN** and nothing else moved. Two further revert probes discriminate rather than merely fail: reverting the grant reddens exactly 2 tests, and corrupting **one** tree edge reddens **only** the ancestry test while the exact-node test stays green. AC-INH **evaluated and did NOT fire** (D9) — arm A creates no authorization consumer of `resolveMemberGeoNode`, `governance_boundary.yaml` is untouched, the `member-geo/index.ts` bullet is **rewritten rather than deleted** to record the non-firing, and the Dev Agent Record states plainly that the green `governance-boundary` run proves nothing there because the root is unlisted. Escalation 1 absorbed (optional Block input on both admin forms, block on the assignment card incl. its **absence**, and the read sends whichever locator the operator actually supplied — asserted in **both** directions). Escalations 3 and 4 honoured by **omission that is recorded**: no opportunistic `claim.verify`, no `claim.override_ground_inspection` (D8), and `verifier-console.ts` byte-unchanged. Verification at branch HEAD: `pnpm ci:local` **PASSED — 30 jobs**; live-DB `@twt/domain` **2733 passed** (+8) and `@twt/api` **951 passed** (+7); domain/api/admin lint clean; `governance-boundary` green. `epic-6-retrospective` **not** flipped. | Claude Opus 5 (dev-story) |
| 2026-08-13 | 0.4 | **Fresh-context validation pass (checklist competition).** Fixed a wrong file path (`audit-sink.ts` lives at `apps/api/src/audit/`, not `apps/api/src/modules/claims/` — its line-range citation `:280-290` was correct, only the directory was wrong) and, more materially, closed a real gap in Task 5: `requirePermissionHook`'s `dimension` option is captured **once at hook-construction time** (`modules/rbac/index.ts:118`), unlike `resolveValue`, which re-runs per request — so the "single dimension-selecting wrapper" instruction as originally written could not actually flip between `'block'` and `'district'` row-by-row under one route registration, the entire mechanism D2 depends on. Task 5 now names two working fixes and explicitly puts `modules/rbac/index.ts` in scope for one of them. Also: added `apps/admin/src/routes/GroundInspectionRoute.tsx` to Task 6's marker table (a stale-model comment that names no story number, so no grep sweep would have caught it); corrected a misattributed 1.19 deviation ordinal (Deviation 3, not 1); corrected a stale `architecture.md` line citation; clarified `api/client.ts`'s real path in the Dev Notes file table. All other citations in the story — dozens, many to the exact line — verified accurate against `ba52ba0`. | Claude (fresh-context validator) |
| 2026-08-13 | 0.3 | **D6's polarity carried into IMPLEMENTATION, not just into comments** (BigDev): *"Missing geo-tree data is a DENIAL condition, not a FALLBACK condition."* Task 7 now opens with the **D6 POLARITY PAIR** — two named, mandatory, never-skippable integration assertions written **before** the happy paths: **(a) `block assignment + NO resolvable tree → access DENIED`** (non-NULL block, *no tree at all*, actor who would pass under the legacy path so the tree's absence is the sole cause; a clean structured 403 + `authz.denied`, ⛔ not a 404/500/validation error; plus the with-a-tree companion proving the deny is about the tree and not the column) and **(b) `district assignment + existing district path → behaviour UNCHANGED`** (`block = NULL`, no tree, right district → 200 and wrong district → 403, asserted against the **existing** 6.7 expectations). ⭐ The pair is non-negotiable as a pair: (a) alone passes on a system that denies everything, (b) alone passes on a system that has silently re-widened. Revert-sanity gains the **fallback probe** — insert the forbidden "if no tree, gate at district" and (a) must go RED while (b) stays GREEN; if (b) also reddens, the pair is not isolating the fallback and the story does not ship. Task 8 requires both halves **named** in the Dev Agent Record with real output. | BigDev |
| 2026-08-13 | 0.2 | **ALL RULINGS CLOSED — D1–D9 approved as recommended; Task 0 unblocked.** D6 ruled in BigDev's own words: *"No district fallback when the geo tree is absent. Absence must deny rather than widen authorization."* D7 approved — the `scope.ts:106` correction is **comment-only** with a zero-non-comment-diff proof, so the `deferred-work.md` branch is **not** taken. Escalations **1** (admin UI), **2** (AC3 is DECLARED, NOT PRODUCTION-ACTIVE, with its re-trigger) and **3** (the `block_admin` no-grant boundary) **ABSORBED**. Escalation **4 DEFERRED**, recorded verbatim: *"The verifier-console contract remains district-only for this story. The first block-tagged assignment reaching the verifier console re-triggers Story 6.10's surface for a reviewed contract widening."* — written into `deferred-work.md` **and** the decision-log entry, because a deferral living only in a story file decays. ⭐ **THE THREE TRAPS hoisted to the top of the handoff**: `block` is never mandatory; `block` is never the universal gate; `block` never falls back to `district` when the tree is absent. NULL block ⇒ legacy district authorization; non-NULL block ⇒ block-dimension authorization; a block row with no resolvable tree **denies** ancestry-based district access. | BigDev |
| 2026-08-13 | 0.1 | Story context created. **D1–D9 + Escalations 1–3 PROPOSED, all open — Task 0 is blocking.** ⭐ The load-bearing finding: **AC1's derive-via-1.19 arm is structurally impossible** (`member-geo/resolve.ts:124` types `block` permanently absent; no member block attribute exists at any layer; and the inspection's jurisdiction is the SITE's, not the member's) ⇒ arm A, ⇒ **the inherited governance-boundary obligation does not bind**, ⇒ D9 records the **non-firing** at the comment that names this story. Second finding: an **unconditional** block gate is an outage — pre-6.17 rows are unbackfillable and no Pariwar has a published tree (no writer surface exists), so D2 makes the gate dimension a property of the row. Third: `scope.ts:106` still carries the inverted Family-B premise Decision `2026-08-12-102` §5 corrected everywhere else. AC4's pin and AC5's freeze are fenced; `roles.test.ts:325` is identified as the **different** pin that must move. | Claude (Story Context Engine) |
