# Trustee Panel Routing Note — the RBAC scope model admits **one** organizational hierarchy, and a second Pariwar needs a different one

**Status:** ✅ **RULED 2026-08-19 — Dhiraj Rahul and Kalpana Bharti.** Recorded as **Decision
`2026-08-19-134`**. All five questions answered.
⛔ **The questions below are left as put. They are annotated, never edited.**

> ### ⭐ ANNOTATION — the ruling, 2026-08-19
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ✅ **AMEND** — narrowly, and by ADR |
> | **Q2** | ✅ **(a)** — the published tree document declares its own dimension ordering; the enum keeps constraining **names** so unknowns fail closed |
> | **Q3** | ✅ **When Rail onboards** — ⛔ the *model* lands first, so the enum addition is purely additive |
> | **Q4** | ✅ **New ADR** — **`ADR-0039`** |
> | **Q5** | ✅ **NO** — ⛔ `district_admin` is **not** re-opened (7th deferral stands) |
>
> ⚠ **CORRECTION to this note, recorded in Decision `2026-08-19-134` clause 6.** Q4's text below states
> *"Both ADRs are ratified."* That is **wrong**: **ADR-0008 is `ratified`**, but **ADR-0038 is
> `drafted`** and has never been ratified. ⛔ The **ruling is unaffected** — a new ADR is correct either
> way — but the **disposition changes**: amendment-by-reference is required for **0008**, while
> `ADR-0039` must state its relationship to the **draft** 0038 explicitly. ⛔ The text below is **not
> edited**; the correction lives in `134`.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-19, against `governance/epic-11a-directory-attribute-model` @ `8b09b1e` (clean),
branched from `main` @ `adf3c52`.
**Scope:** the **RBAC scope-dimension model** — `SCOPE_DIMENSIONS`, the `scope_dimension` Postgres enum,
and `GEO_RANK`. ⛔ **Touches architectural freeze row 9 and two ADRs.** ⚠ *(as put: "two **ratified** ADRs" — ⛔ **ADR-0038 is `drafted`**; corrected in `134` clause 6, not edited here)*
**Origin:** **G2** of Sprint Change Proposal `2026-08-19` §4.3, per ruling **R6** (*the amendment carries
in its own ADR + routing note; it does not ride in on a directory ruling*).
**Decision-log head, verified live at authoring:** `2026-08-18-131` (`.decision-log.md:37`). 133 headings
− 1 template = 132 numbered over **131 distinct** (the `+1` is `2026-06-01-012-amend-1`); **no gaps in
`001…131`**, verified by enumeration.
**Disposition on ruling:** a `.decision-log.md` entry **plus** an ADR (**G4**). ⚠ Number not
pre-assigned — G1 and G3 are also open and unrecorded.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ✅ **SATISFIED.** G1 was ruled first, as required — **Decision `2026-08-19-132` clause 4** ratified R5
> and R6 as **principle only**, explicitly authorising no amendment. This note is that amendment.

> ⛔ **ADR-0008 and ADR-0038 are RATIFIED and are NOT edited by this note.** Any correction is recorded as
> a **successor** decision referencing the clause ([[feedback_supersede_never_reinterpret]]).
>
> ⚠ **CORRECTED — this callout is HALF WRONG, and the half that is wrong changes the mechanism.**
> **ADR-0008 is `ratified`** (2026-06-21, Decision `2026-06-21-059`) — the successor discipline applies.
> **ADR-0038 is `drafted`** and has never been ratified, so that discipline does **not** bind it and
> `ADR-0039` must state their relationship explicitly. Per Decision `2026-08-19-134` clause 6. ⛔ The
> claim above is left as put.

> ⚠ **Nothing here is a live authority defect.** Today exactly one organizational hierarchy exists and it
> is internally consistent. **F-4 states precisely when that stops being true.**

---

## Why this note exists

Rail Pariwar's organizational structure is **Zone → Division**. Shikshak's is **State → District →
Block**. A future Pariwar's may be **Region → Area → Branch**.

The RBAC scope model was built for exactly one of those, and it was not built to notice that it had
assumed so.

---

## Findings

### F-1 — the dimension set is a frozen tuple that backs a Postgres enum

`SCOPE_DIMENSIONS = ['global','pariwar','state','district','block','self']`
(`packages/domain/src/rbac/scope.ts:47`), described in place as the *"single source of truth for both the
domain union type and the `scope_dimension` pgEnum"*.

`packages/domain/src/schema/role_grants.ts:32` derives it: `pgEnum('scope_dimension', SCOPE_DIMENSIONS)`
— *"so the DB enum and the domain `ScopeDimension` union can never drift."*

⇒ Adding a dimension is **a migration**, not a constant edit.

### F-2 ⛔ `scope.ts` is architectural freeze row 9

`rbac/scope.ts:40`, in the file's own header: *"The seam itself is unchanged — this file was not modified
to make that work, **and must not be** (architectural freeze row 9)."*

⭐ **Story 1.18 landed the entire geo-tree resolver without touching this file.** That is the standard any
amendment inherits: the freeze has held through a substantial capability addition, so a proposal to break
it must show why the same discipline cannot work again.

Ownership: **ADR-0008 + Decision `2026-06-11-044`** (`rbac/scope.ts:20`), with the resolver seam under
**ADR-0038**.

### F-3 ⭐ THE FINDING — `GEO_RANK` is a single **global total order**

```
GEO_RANK = { global: 0, pariwar: 1, state: 2, district: 3, block: 4 }   (rbac/scope.ts:64)
```

Containment and ceiling checks are **pure numeric compares** over this one table. It encodes not just
*"district contains block"* but *"every dimension is comparable to every other dimension"* — a claim that
is true only while exactly one hierarchy exists.

### F-4 ⚠ THE SHARP ONE — the failure is a **confident wrong answer**, and it opens the moment a second hierarchy exists

Add `zone` and `division` to a single global rank table and the model will answer *"is Zone broader than
District?"* — numerically, immediately, and meaninglessly. Zone and District are in **disjoint**
hierarchies; the question has no answer, but a numeric compare always produces one.

⛔ **Silent wrong answers in the containment path are the ADR-0038 failure mode by name.** The resolver's
own header states the discipline: an unknown node *"denies"*, because *"a tree that does not mention Patna
cannot be asked whether Patna is in Bihar, and guessing would be the 'wrong tree grants silently' failure
ADR-0038 exists to avoid."*

⚠ **Not exploitable today.** It requires a second hierarchy to exist, and none does. Rail is a **named
future tenant** (`prd.md:117`), not a live one. This note exists so the model is fixed **before** Rail
onboards, not after.

### F-5 ⭐ THE GENERALIZATION IS NARROWER THAN IT LOOKS

The three universal dimensions are **already** orthogonal to the geo rank:

- `pariwar` short-circuits before any resolver is consulted — *"A pariwar-ceiling grant covers every geo
  target within the (already active-Pariwar-filtered) tenant"* (`rbac/scope.ts:288`).
- `self` is **explicitly excluded** from `GEO_RANK` and special-cased in `scopeContains` — *"it is
  orthogonal to the geo tree: 'own records only', not a node in it"* (`rbac/scope.ts:61-63`).
- `global` is the universal ceiling.

⇒ The change is not *"make everything per-Pariwar."* It is: **those three stay universal, and
`['state','district','block']` becomes ONE NAMED HIERARCHY rather than the only one.** Existing tenants
keep byte-identical behaviour — which is the property any amendment must be held to.

### F-6 — there is a second rank table, and it must not drift from the first

`GEO_TREE_NODE_RANK` (`packages/domain/src/geo-tree/resolver.ts`) is separate from `GEO_RANK`, and
`geo-tree/document.ts:148` enforces *parent must be STRICTLY BROADER by geo rank* at write time against
it. `GEO_TREE_NODE_DIMENSIONS = ['state','district','block']`
(`schema/geo_tree_versions.ts:59`) is a third frozen tuple.

⚠ **Any amendment touches all three or it introduces drift between them.**

### F-7 — the hierarchy substrate itself is already the right shape

`geo_tree_versions` is per-Pariwar, versioned, immutable (`superseded_by_version` forward-pointer only),
in-force-by-instant, and cycle-rejecting at write time. ⭐ **The substrate does not need replacing.** What
needs ruling is whether the **dimension set and its ordering** become per-hierarchy.

---

## The five questions

### Q1 — Is architectural freeze row 9 amended to admit Pariwar-specific hierarchical dimensions? ⛔ BLOCKING

The freeze has held since it was written, including through Story 1.18 (F-2). Amending it is the act this
whole note is about.

> **Non-binding recommendation:** **AMEND, narrowly and by ADR** — per F-5 the change is smaller than the
> freeze's language suggests, and the alternative (a second parallel scope model) is worse: two ways to
> answer one question is the failure ADR-0038 exists to prevent.

### Q2 — Does dimension **ordering** become per-hierarchy, replacing the single global `GEO_RANK`? ⛔ BLOCKING

The substantive design question. Options: **(a)** the published tree document declares its own dimension
ordering, with the enum still constraining dimension *names* so unknowns fail closed; **(b)** a global
rank retained with hierarchy **membership** checked separately before any compare; **(c)** no change —
Rail is refused organizational RBAC.

⚠ Whichever is chosen, the **fail-closed** property is non-negotiable: an unknown or cross-hierarchy
dimension must **deny**, never compare (F-4).

> **Non-binding recommendation:** **(a).** It puts the ordering next to the hierarchy that owns it and
> keeps the enum as the fail-closed name constraint. **(b)** preserves a global table whose global-ness is
> exactly the defect.

### Q3 — Do `zone` and `division` enter the `scope_dimension` enum now, or only when Rail onboards? ⚠ DIRECTIVE

Adding enum values is a migration (F-1). Doing it now means shipping dimensions no tenant uses; doing it
later means a migration on Rail's critical path.

> **Non-binding recommendation:** **when Rail onboards.** ⛔ But the **model** (Q2) must land first, so the
> later addition is purely additive and needs no second freeze amendment.

### Q4 — Who owns the ADR, and does it supersede or amend ADR-0008 / ADR-0038? ⚠ DIRECTIVE

**G4** in the proposal's commit plan. Both ADRs are ratified; the project's record-correction precedent is
a **successor entry referencing the clause**, not an in-place edit.

> **Non-binding recommendation:** a **new ADR** that amends both by reference. Neither is wrong today;
> both were correct for a single-hierarchy system and are being **extended**, not corrected.

### Q5 — Confirm explicitly: does this reopen the `district_admin` deferral? ⚠ DIRECTIVE

⛔ **The author's position is NO, and the Panel is asked to confirm it in terms**, because the two look
similar and have been conflated before.

`district_admin` is **rank-order** debt, not tree-shape debt. `rbac/scope.ts` §RANK-ORDER states it
directly: *"A grant whose ceiling is `state`/`district`/`block` can NEVER satisfy a `pariwar`-dimension
check, and NO organizational tree — however complete — changes that."* Story 10.18 found that sites across
the codebase had **misdiagnosed** this as pending resolver work; those comments were wrong, not waiting.

> **Non-binding recommendation:** **CONFIRM NO.** ⚠ Recording this explicitly is the point — it is the
> 7th deferral of `district_admin`, and each prior one is pinned by a 403 revert-sanity test so a grant
> cannot land silently.

---

## What a non-answer would mean

⛔ **Rail Pariwar cannot be onboarded with organizational RBAC.** Zone/Division is row 5 of the directory
model and is already recorded as **blocked** on this note plus **G4a**.

⚠ Shikshak is **unaffected** — ruling **R3(a)** put `Block` on shipped substrate (`district→block` is an
existing edge kind), so Epic 11a's Shikshak-facing rows do not wait on this. **There is no urgency here,
and that is precisely the argument for ruling it now** rather than under onboarding pressure.

⛔ **The failure mode if it is neither ruled nor recorded:** the first Rail-shaped requirement arrives,
someone adds `zone` and `division` to the existing global `GEO_RANK` because that is the smallest diff,
and the model begins answering cross-hierarchy containment questions confidently and wrongly — with no
test asserting it should not, because until now there was nothing to assert.

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** ask to ratify R5 or R6. Those are **G1** Q4. This note rules the **amendment**; G1
  rules the **principle**. ⚠ Rule G1 first.
- ⛔ It does **not** touch the directory attribute model (R1–R4, R7), member names (**G3**), or
  hierarchy-version drift (**G4a**).
- ⛔ A ruling does **not** make any directory attribute authority-bearing. **R2 and R4 continue to
  govern** — a Zone hierarchy bearing RBAC is a separate matter from a member's Zone attribute doing so
  (G1 **D-4**, R3(a)(ii)).
- ⛔ It does **not** resolve `district_admin` — see **Q5**, which asks the Panel to say so in terms.
- ⛔ It does **not** authorise the migration. Q3 governs when enum values are added.

---

## Ruling template

```
Decision 2026-08-__-___ : RBAC scope-dimension model — Pariwar-specific hierarchies

Q1  amend architectural freeze row 9      : AMEND / REFUSE / DEFER            — reasoning:
Q2  per-hierarchy ordering                : (a) TREE-DECLARED / (b) GLOBAL+MEMBERSHIP / (c) NO CHANGE
                                            — reasoning:
      ⚠ fail-closed on unknown/cross-hierarchy dimension is non-negotiable : CONFIRMED / NOT
Q3  zone + division into the enum         : NOW / ON RAIL ONBOARDING / NOT YET — reasoning:
Q4  ADR disposition                       : NEW ADR AMENDING 0008+0038 / SUPERSEDE / OTHER — reasoning:
Q5  does this reopen district_admin?      : NO (confirm) / YES              — reasoning:

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | One `.decision-log.md` entry, per-clause provenance labelled. ⚠ Re-verify the head — G1 and G3 are also open | BigDev / Panel |
| 2 | **G4** — the ADR proper, amending ADR-0008 + ADR-0038 by reference | Winston |
| 3 | `architecture.md` §2.6 amended; the three frozen tuples (F-1, F-6) reconciled **together** or not at all | Winston |
| 4 | An adversarial test asserting cross-hierarchy containment **denies** — ⛔ proven, not merely absent | Murat |
| 5 | Row 5 (Zone/Division) remains blocked until this **and G4a** land | BigDev |
| 6 | ⚠ Stale in-code citation (**O7**): `geo-tree/resolver.ts` cites `rbac/scope.ts:236`; the line is now **288**. Same drift class, in the file this ADR amends | BigDev |

---

*Routed 2026-08-19. ✅ **RULED 2026-08-19** — Dhiraj Rahul, Kalpana Bharti — recorded as Decision
`2026-08-19-134`. ⚠ Q4's ADR-status claim is corrected by that entry's clause 6.*
