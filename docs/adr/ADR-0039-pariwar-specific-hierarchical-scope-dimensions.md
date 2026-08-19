# ADR-0039: Scope dimensions belong to a **named hierarchy**, and the published hierarchy document declares its **own dimension ordering** — the global rank table ceases to be the authority on ordering

> **Status:** drafted
> **Date:** 2026-08-19 (date entered current status)
> **Author:** Solo Builder (BigDev), authored under Trustee Panel routing note G2
> **Ratifying trustees:** — (populated at `ratified` status)
> **Supersedes:** —
> **Superseded by:** —

> ⚠ **The SUBSTANCE of this ADR is already trustee-ratified; the DOCUMENT is not.** Decision
> `2026-08-19-134` (Dhiraj Rahul, Kalpana Bharti, 2026-08-19) ruled Q1–Q5 of routing note G2, including
> Q4 — *a new ADR*. This file is that ADR. ⛔ Its `drafted` status reflects that the Panel has **not yet
> reviewed this document**; it does **not** mean the decision is open.
> ⛔ Per Decision `2026-08-19-134` clause 6, do **not** read this as *"both ADRs are ratified"* — see
> **Relationship to prior ADRs** below.

## Context

**The architectural property this ADR is the mechanism for** is committed at
`architecture.md` §2.6 (RBAC enforcement — permission keys + scope dimensions), as amended 2026-08-19:

> *Dimensions belong to a named hierarchy … Comparison is meaningful only WITHIN a hierarchy. Across
> hierarchies it must be structurally impossible — fail-closed — not merely wrong.*

Per `[[feedback_architecture_vs_adr_boundary]]`, §2.6 records the **property**; this ADR records the
**mechanism**, and §2.6 defers to it by name.

### What forced the choice

TWT is per-Pariwar multi-tenant, and Pariwars do not share an organizational shape:

```
Shikshak Pariwar          Rail Pariwar          Future Pariwar
  State                     Zone                  Region
   └─ District               └─ Division           └─ Area
       └─ Block                                        └─ Branch
```

The scope model was built for exactly one of these, and **was not built to notice that it had assumed
so**. `GEO_RANK` (`packages/domain/src/rbac/scope.ts:64`) is a **single global total order**:

```
GEO_RANK = { global: 0, pariwar: 1, state: 2, district: 3, block: 4 }
```

Containment and ceiling checks are **pure numeric compares** over that one table. It encodes not merely
*"district contains block"* but *"every dimension is comparable to every other dimension"* — true only
while exactly one hierarchy exists.

### The constraints that force the shape of the mechanism

| # | Constraint | Evidence |
|---|---|---|
| C1 | `SCOPE_DIMENSIONS` is a frozen tuple and the single source of truth for both the domain union and the DB enum | `rbac/scope.ts:47` |
| C2 | It derives a **Postgres enum**, so adding a dimension is a **migration** | `schema/role_grants.ts:32` — `pgEnum('scope_dimension', SCOPE_DIMENSIONS)` |
| C3 | ⛔ `rbac/scope.ts` is **architectural freeze row 9** — *"this file was not modified to make that work, and must not be"* | `rbac/scope.ts:40` |
| C4 | There are **three** frozen tuples, not one: `SCOPE_DIMENSIONS`, `GEO_TREE_NODE_RANK`, `GEO_TREE_NODE_DIMENSIONS` | `scope.ts:47`, `geo-tree/resolver.ts`, `schema/geo_tree_versions.ts:59` |
| C5 | ⭐ The three universal dimensions are **already orthogonal** to the geo rank — `pariwar` short-circuits before any resolver (`scope.ts:288`), `self` is explicitly excluded (`scope.ts:61-63`), `global` is the universal ceiling | — |
| C6 | The hierarchy substrate itself is already correct: per-Pariwar, versioned, immutable, in-force-by-instant, cycle-rejecting at write time | `geo_tree_versions`, `geo-tree/document.ts` |

⭐ **C5 is why this amendment is narrow.** The change is **not** *"make everything per-Pariwar"*. It is:
those three stay universal, and `['state','district','block']` becomes **one named hierarchy rather than
the only one**. Existing tenants must keep **byte-identical behaviour** — that is the bar.

### Risk if the wrong choice is made

⛔ **The failure mode is a confident wrong answer, not an error.** Add `zone` and `division` to a single
global rank table and the model will answer *"is Zone broader than District?"* — numerically,
immediately, and meaninglessly. Zone and District sit in **disjoint** hierarchies; the question has no
answer, but a numeric compare always produces one.

That is the **ADR-0038 failure mode by name**. Its resolver states the discipline: an unknown node
*"denies"*, because *"a tree that does not mention Patna cannot be asked whether Patna is in Bihar, and
guessing would be the 'wrong tree grants silently' failure ADR-0038 exists to avoid."*

⚠ **Not exploitable today** — it requires a second hierarchy, and none exists. Rail is a **named future
tenant** (`prd.md:117`), not a live one. ⭐ This ADR exists so the model is fixed **before** Rail
onboards, under no schedule pressure.

### Decision deadline

⛔ Before **Rail Pariwar onboarding**. ⚠ Not before Epic 11a: Decision `2026-08-19-133` put `Block` under
`District` on **shipped** substrate, so Shikshak's directory work does **not** wait on this ADR.

## Decision

**Dimension ordering moves out of the global rank table and into the published hierarchy document. The
`scope_dimension` enum continues to constrain dimension NAMES, so an unknown name fails closed. Comparison
is defined only within a single named hierarchy; across hierarchies it denies.**

Load-bearing details:

1. **A published hierarchy document declares its own dimension ordering.** The ordering is data belonging
   to the hierarchy that owns it — ⛔ not a code-resident global table. This preserves ADR-0038's
   *"no code-resident default"* posture and extends it from tree **content** to tree **shape**.

2. **The enum remains the name constraint, and remains fail-closed.** A dimension name not in
   `scope_dimension` is rejected at the DB boundary; a dimension not present in the in-force hierarchy
   **denies** rather than compares.

3. ⛔ **Cross-hierarchy comparison is structurally impossible, not merely discouraged.** Containment must
   resolve *within one named hierarchy* or deny. ⚠ Carried on two independent grounds — R5 as ratified
   (`2026-08-19-132` clause 4: *"structurally impossible — fail-closed — not merely wrong"*) **and**
   option (a)'s own text.

4. **`global`, `pariwar` and `self` remain universal** and outside any hierarchy — the behaviour they
   already have (C5). ⛔ They are not hierarchy members and must not be given an ordering.

5. **`zone` and `division` enter the `scope_dimension` enum when Rail onboards — not now**
   (`-134` Q3). ⛔ The **model** lands first, so the later enum addition is **purely additive** and
   requires **no second freeze amendment**.

6. ⛔ **The three frozen tuples (C4) move together or not at all.** Amending one alone introduces drift
   between the domain union, the DB enum, and the tree-document validator.

7. ⭐ **This ADR and Decision `2026-08-19-133` clause 3 are ONE design, not two.** `133` requires a
   hierarchical attribute to declare **which hierarchy it belongs to** at layer 1 (CREATE); this ADR puts
   the **ordering** inside that hierarchy's document. ⇒ **The attribute names its hierarchy; the
   hierarchy declares its own ordering; ⛔ no global table mediates between them.**

### Relationship to prior ADRs

⛔ **Stated explicitly, per Decision `2026-08-19-134` clause 6 — which corrected the G2 routing note's
claim that "both ADRs are ratified."**

- **ADR-0008 (RBAC permission model v1) — `ratified` 2026-06-21** (Dhiraj Rahul, Kalpana Bharti; Decision
  `2026-06-21-059`). ⛔ **Not edited.** This ADR **amends it by reference**: ADR-0008's scope model was
  correct for a single-hierarchy system and is **extended**, not corrected.
- **ADR-0038 (geo-tree scope resolver) — `drafted`, never ratified.** ⛔ **Stands; extended.** Its source
  of truth, its no-code-default posture, and its resolver seam are unchanged.
  ⭐ **This ADR is precisely the ADR that ADR-0038 declined to be.** Its own *"What this ADR does NOT
  decide"* opens: *"It does not change `GEO_RANK`, `CEILING_RANK`, `scopeContains`'s ordering, the
  `GeoTreeResolver` interface, or the permission-key / scope-dimension model — architectural freeze row
  9."* ADR-0039 crosses that boundary, **authorised by Decision `2026-08-19-134` clause 1**.
  ⚠ **ADR-0038's eventual ratification must account for ADR-0039**, since its non-scope list will by then
  be partly superseded.

### What this ADR does NOT decide

- ⛔ It does **not** re-rank `pariwar` vs `state`, or reorder any existing dimension. Existing tenants
  keep byte-identical behaviour.
- ⛔ It does **not** place `self` in any hierarchy. `self` remains orthogonal by design.
- ⛔ It does **not** discharge the **`district_admin`** deferral (7th, Story 10.18). Ruled **NO** in terms
  at `2026-08-19-134` clause 5: that is **rank-order** debt, not tree-shape debt, and *"NO organizational
  tree — however complete — changes that."*
- ⛔ It does **not** authorise the `zone`/`division` migration (see Decision item 5).
- ⛔ It does **not** make any **directory attribute** authority-bearing. `2026-08-19-132` R2/R4 and `-133`
  clauses 3–4 continue to govern; a hierarchy bearing RBAC is a separate question from a member's
  attribute doing so.
- ⛔ It does **not** supply member→hierarchy attribution, nor the migration mechanism for collected
  assignments — that is `2026-08-19-137`.

## Alternatives considered

- **(b) Retain the global rank table; check hierarchy MEMBERSHIP separately before any compare.**
  ⛔ **Rejected** (`-134` Q2). Its global-ness *is* the defect: it keeps a table that asserts every
  dimension is comparable to every other, and adds a guard in front of it. ⚠ A guard that must be
  remembered at every call site is the failure mode this ADR exists to remove. *Residual option:* if
  per-hierarchy ordering proves impractical to thread through the resolver, this becomes the fallback —
  but only with the membership check enforced **inside** `scopeContains`, never at call sites.

- **(c) No change — refuse Rail Pariwar organizational RBAC.**
  ⛔ **Rejected** (`-134` Q2). It resolves the modelling problem by declining the requirement. Trustees
  ruled at `2026-08-19-132` clause 4 that the scope model **must** support Pariwar-specific hierarchies.

- **A second, parallel scope model for non-geo hierarchies.** ⛔ **Rejected** — two ways to answer one
  containment question is precisely the *"second competing answer to a question already settled
  upstream"* that the geo-tree resolver's own header warns against.

- **Per-Pariwar dimension NAMES (free-form).** ⛔ **Rejected** — it removes the enum's fail-closed name
  constraint (Decision item 2) and makes an unknown dimension indistinguishable from a typo.

## Consequences

- **Operational.** No runbook change at v1: no tenant has a second hierarchy. ⚠ Rail onboarding gains a
  **migration step** (enum addition) that must precede its first hierarchy publish.

- **Security.** ⭐ The threat surface **narrows**: cross-hierarchy containment moves from *"answers
  confidently and wrongly"* to *"denies"*. ⛔ The fail-closed property is the security control, and it
  must be **proven by an adversarial test**, not left absent — the Story 1.6 adversarial cross-Pariwar
  precedent is the model.

- **Performance.** Ordering resolves from the in-force hierarchy document already loaded **once per
  request** by the scope-resolution middleware. ⛔ No additional per-check IO; ⚠ do not reintroduce a
  per-member or per-check tree load.

- **Cost.** None.

- **Failure modes accepted.**
  ⚠ **Ordering becomes tenant-authored data.** A Pariwar publishing a malformed ordering is a **write-time
  validation** concern, not a read-time one — `validateGeoTreeDocument` already rejects cycles and
  enforces parent-strictly-broader, and must extend to the declared ordering.
  ⚠ **The three tuples can drift** if amended separately (Decision item 6). A sync-guard test is the
  control.
  ⚠ **`district_admin` remains deferred** — its 8th deferral if counted from here; each pinned by a 403
  revert-sanity test so a grant cannot land silently.

- **Migration / pivot path.** Reversal is a successor ADR restoring a global ordering, viable only while
  exactly one hierarchy exists. ⛔ **Once a second Pariwar publishes its own hierarchy, this decision is
  effectively irreversible** without re-authoring that tenant's scope data — trigger to revisit is
  therefore **before Rail's first hierarchy publish**, not after.

- **Housekeeping owed with this change.** ⚠ `geo-tree/resolver.ts`'s header cites `rbac/scope.ts:236` for
  the `pariwar` short-circuit; the line is now **288** (open item **O7**). Same drift class this ADR's
  surrounding governance exists to correct, in the file this ADR amends.

## References

- [Source: `architecture.md` §2.6 — RBAC enforcement, scope dimensions] — the property this ADR controls
- [Source: `architecture.md` §2.13 — Member directory attributes] — the model this ADR's hierarchies serve
- [Source: `.decision-log.md`, Decision `2026-08-19-134`] — the ratification of Q1–Q5; clause 6 corrects the ADR-status claim; clause 7 the one-design convergence
- [Source: `.decision-log.md`, Decision `2026-08-19-132` clause 4] — R5/R6 ratified as principle only
- [Source: `.decision-log.md`, Decision `2026-08-19-133` clause 3] — the hierarchy declaration this converges with
- [Source: `.decision-log.md`, Decision `2026-08-19-137`] — collected-assignment migration; ⛔ not this ADR
- [Source: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-19-scope-dimension-model.md`] — routing note G2 (F-1…F-7)
- [Source: ADR-0008 — RBAC permission model v1, `ratified`] — amended **by reference**
- [Source: ADR-0038 — geo-tree scope resolver, `drafted`] — stands; extended
- [Source: `packages/domain/src/rbac/scope.ts:40,47,61-63,64,288`] — freeze row 9, the tuple, the universal dimensions, the rank table
- [Source: `packages/domain/src/schema/role_grants.ts:32`] — the derived pgEnum
- [Source: `packages/domain/src/schema/geo_tree_versions.ts:59`] — `GEO_TREE_NODE_DIMENSIONS`
- [Source: `prd.md:117`] — Rail / Bank / Public Servants Parivar as future tenants
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[feedback_supersede_never_reinterpret]] — why ADR-0008 is amended by reference, never edited

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-19 | (initial draft) | BigDev | Authored under Trustee Panel routing note **G2**, following Decision `2026-08-19-134` Q4 (*a new ADR*). ⚠ The **substance** is trustee-ratified; the **document** has not been reviewed — hence `drafted`. |
