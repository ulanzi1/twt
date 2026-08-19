# Trustee Panel Routing Note — when a Pariwar restructures its hierarchy, whose organizational record survives?

**Status:** ✅ **RULED 2026-08-19 — Dhiraj Rahul and Kalpana Bharti.** Recorded as **Decision
`2026-08-19-137`**. ⚠ **Q1 was answered with a FOURTH option, not among the three put.**
⛔ **The questions below are left as put. They are annotated, never edited.**

> ### ⭐ ANNOTATION — the ruling, 2026-08-19
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ⚠ **MIGRATION** — ⛔ none of the three offered postures (typed staleness · reject publish · version pin) |
> | **Q2** | ✅ **Pariwar Admin, no deadline** — ⛔ but may **not** resolve ambiguity; the **member** chooses |
> | **Q3** | ✅ **ACCEPT, RECORDED** |
> | **Q4** | ✅ **BOTH** — every collected hierarchy attribute, ⭐ `Block` included |
>
> **The ruled matrix:** rename → automatic · one-to-one → automatic if explicitly mapped · **split →
> MEMBER CHOOSES** · merge → automatic if unambiguous · **delete/orphan a node with members → ⛔
> FORBIDDEN** · no successor yet → the old node remains.
> ⭐ **Governing rule:** *deterministic migration may be automatic; ambiguous migration requires member
> choice.* ⛔ **The system must never silently guess a mapping.**
>
> ⭐ **THE ORPHAN IS DESIGNED OUT, NOT REPRESENTED** (`137` clause 6): *every node referenced by a live
> member assignment must exist in the in-force hierarchy.* This is **stronger** than the typed staleness
> this note recommended, which would have represented the broken state rather than preventing it. ⛔ The
> recommendation was not followed, and the ruled posture is the better one.
>
> ⚠ **Three things must now be BUILT that do not exist** (`137` clause 7): the geo-tree publish path
> becomes **member-aware** (verified: it has zero member awareness today) · a **member-facing choice
> surface** for splits · and **§5.4's prohibition LIFTS**, replaced by an obligation to implement *this*
> policy — ⛔ latitude narrowed, not restored.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-19, against `governance/epic-11a-directory-attribute-model` @ `8b09b1e` (clean),
branched from `main` @ `adf3c52`.
**Scope:** hierarchy-version drift for **collected member hierarchy attributes** — open item **O2** of
Sprint Change Proposal `2026-08-19`.
**Origin:** **G4a** of that proposal §4.3, ruled by BigDev 2026-08-19 to be *Trustee/architecture-routed
before Zone/Division becomes an operational member attribute*, with an explicit prohibition on the
implementation choosing a policy (§5.4).
**Decision-log head, verified live at authoring:** `2026-08-18-131` (`.decision-log.md:37`). 133 headings
− 1 template = 132 numbered over **131 distinct**; **no gaps in `001…131`**, verified by enumeration.
**Disposition on ruling:** a single `.decision-log.md` entry. ⚠ Number not pre-assigned — G1, G2 and G3
are also open and unrecorded.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ✅ **DISCHARGED 2026-08-19 by Decision `2026-08-19-137` clause 7(c)** — for the **full** ruled scope
> (Q4 = both). ⛔ **Replaced by a positive specification:** implementation must now implement the *ruled*
> migration policy. ⛔ The text below stands as put.
>
> ⛔ **THIS IS A PROHIBITION IN FORCE, NOT MERELY A PENDING QUESTION.** Per Sprint Change Proposal §5.4,
> ruled by BigDev 2026-08-19: **the implementation must not invent the orphan/version-drift policy.**
> Until this note is ruled, none of the following may enter the tree — silently nulling, dropping or
> hiding an orphaned combination · auto-migrating a stored value to a *"nearest"* node · treating an
> orphan as a validation failure that blocks an unrelated member write · a version-pin, staleness marker
> or fallback introduced *"for now"* pending the ruling.

> ⚠ **Nothing is broken today.** No Pariwar collects a hierarchy attribute, so no stored combination can
> be orphaned. **F-1 states exactly when that changes.**

---

## Why this note exists

A Pariwar publishes an organizational hierarchy. Members are then collected against it — Shikshak members
carry a `Block`, Rail members would carry a `Zone` and `Division`.

Then the Pariwar **restructures**: a district is split, blocks are renumbered, a Rail division is merged
into another zone. A new hierarchy version is published. Some members' stored combinations no longer name
anything in the in-force hierarchy.

**Those members' organizational records are now in question, and nobody has said what should happen to
them.** The question is not technical. It decides whose record survives an administrative restructure, and
that is a governance act.

---

## Findings

### F-1 — this becomes live the moment a hierarchy attribute is collected, not when one is orphaned

No Pariwar collects a hierarchy attribute today, so the condition cannot arise. It arises **as soon as
Story 11a.3's row 2 (`Block`) ships for Shikshak** — not only for Rail's Zone/Division.

⚠ **The proposal recorded this as blocking Zone/Division specifically. That is too narrow.** Shikshak's
Block is validated against the in-force geo tree under R3(a), so a Shikshak tree restructure produces
exactly the same orphan condition. **Q4 asks the Panel to say whether the ruling covers both.**

### F-2 — the hierarchy substrate already versions correctly; nothing needs fixing to create the problem

`geo_tree_versions` is per-Pariwar, versioned, immutable (prior rows *"are NEVER mutated except the
`superseded_by_version` forward-pointer"*), in-force-resolved by instant, and cycle-rejecting at write
time.

⇒ ⭐ **The substrate is working as designed. The orphan is a consequence of correct versioning, not a
defect.** History is preserved precisely so a restructure does not rewrite the past — which is why the
question of what the *member's* record means afterwards has to be answered deliberately.

### F-3 — the project has three established postures, and they are genuinely different, not variants

| Posture | Precedent in this codebase |
|---|---|
| **Typed absence / staleness** | `member-geo`'s **closed five-value union** — *"`{available: false, reason}` and `null` are NOT the same value, and the difference is the whole point"*; a consumer learns *which* situation produced the gap |
| **Reject the write** | `validateGeoTreeDocument` refuses a malformed or cyclic document outright at publish time |
| **Version pin** | The pool assignment engine, where a version pin *"gates the WHOLE algorithm"* and the snapshot is truth |

⚠ **All three are defensible here, and they produce materially different outcomes for a real member.**
That is why this is routed rather than decided.

### F-4 — the DB mirror will be weaker than the fence beside it, and that must be said plainly

Migration 0088's doctrine: *"an app-layer rule with no DB mirror is a rule that holds only for the callers
who happen to go through the app layer."* The 10.12 custom-field fence honours it —
`pariwar_custom_field_definitions_frozen_key_ck` in migration 0095.

⛔ **"This stored combination exists in hierarchy version N" cannot be expressed as a CHECK constraint.**
It requires a trigger, or it is app-layer-only. Either way the control is **weaker than its neighbour**,
and whichever posture the Panel selects inherits that limit.

⇒ **Q3 asks the Panel to acknowledge the weaker control explicitly**, so it is a recorded limit rather
than an assumed parity.

### F-5 ⭐ THE SHARP ONE — an orphan policy chosen in code is a silent constitutional ruling

Whichever behaviour ships first becomes the de-facto answer to *"whose organizational record survives a
restructure?"* — decided by whoever wrote the null-check, recorded nowhere, and discovered later.

⭐ **This is the class Epic 10 was largely spent correcting.** Its retrospective thesis: *"a one-line
predicate turned out to be constitutional law, and the fix was an instrument amendment, not a patch."* The
suspension predicate was a de-facto permanent ban that nobody ruled and nobody noticed.

⇒ **§5.4's prohibition exists because the failure is not that the wrong policy gets chosen — it is that a
policy gets chosen without anyone recognising a decision was made.**

### F-6 — "nothing happens" is not available as a non-decision

⚠ If the ruling is deferred and Block ships, **something** will happen to an orphaned member's directory
row: it renders, or it does not; it filters, or it does not. Silence produces a policy.

⛔ That is why §5.4 instructs implementation to **stop and route** rather than pick a least-bad default and
record it as a note.

---

## The four questions

### Q1 — What becomes of a stored combination that the new in-force version no longer contains? ⛔ BLOCKING

> **Non-binding recommendation:** **typed staleness.** The stored value is **never mutated**; it resolves
> as a typed marker against the in-force version, so a consumer can render, suppress or flag it
> *knowingly*. It matches the shipped `member-geo` discipline (F-3), it is the only option that
> **fabricates nothing**, and it keeps the member's own record intact through an administrative act they
> had no part in. ⚠ Cost: every consumer must handle the marker, and one that forgets renders a stale
> value as current.

⚠ **Rejecting the publish** (option 2) is the strongest integrity answer but can block a large Pariwar from
restructuring at all — the members' records hold the tree hostage. ⚠ **Version-pinning** each stored value
is historically exact but makes cross-version filtering ambiguous: two members "in Zone 4" may mean
different zones.

### Q2 — Who is responsible for resolving an orphaned value, and is anyone obliged to? ⚠ DIRECTIVE

The member (via a life-events-style update) · the Pariwar Admin (bulk re-assignment) · nobody, and it
stays stale indefinitely.

⚠ **This is the question that decides whether Q1's typed marker is a transient state or a permanent
one**, and it should not be inferred from Q1's answer.

> **Non-binding recommendation:** **Pariwar Admin, with no deadline.** They performed the restructure. ⛔
> A member should not be asked to fix a record broken by an administrative act — and per R2 the attribute
> is display-only, so a stale value withholds nothing from them.

### Q3 — Is the weaker DB control accepted, and recorded as weaker? ⚠ DIRECTIVE

Per F-4, hierarchy-membership integrity cannot be a CHECK constraint.

> **Non-binding recommendation:** **ACCEPT, RECORDED** — with a trigger if the chosen posture needs
> write-time enforcement. ⛔ The recording matters more than the mechanism: the next reader must not assume
> parity with the 0095 fence.

### Q4 — Does this ruling cover **Shikshak's Block**, or only Rail's Zone/Division? ⚠ DIRECTIVE

Per F-1, the proposal scoped this to Zone/Division, and that is **too narrow** — Block is tree-validated
under R3(a) and produces the identical condition on a Shikshak restructure.

> **Non-binding recommendation:** **BOTH — rule it as a general posture for any collected hierarchy
> attribute.** A per-attribute ruling would need re-litigating for every future Pariwar, which is exactly
> what R7's extensibility principle is meant to avoid.

---

## What a non-answer would mean

⛔ **Zone/Division cannot become an operational member attribute** — already recorded as blocking in the
proposal's sequencing.

⛔ **And per Q4, `Block` cannot either.** ⚠ That is a **wider block than the proposal recorded**, and the
Panel should see it stated: leaving this unruled gates row 2, not only row 5 — which means it gates the
Shikshak-facing directory work that R3(a) had otherwise freed from the G4 critical path.

⚠ Implementation is prohibited from proceeding on an invented policy (§5.4), so a non-answer is a stop,
not a slowdown.

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** ask whether hierarchies may exist or bear RBAC authority. That is **G1** (R3, R3(a))
  and **G2**.
- ⛔ It does **not** ask about member **names** (**G3**) or the scope-dimension amendment (**G2 + G4**).
- ⛔ A ruling does **not** make any attribute authority-bearing. **R2 and R4 continue to govern**; an
  orphaned or stale value is a *display* question throughout.
- ⛔ It does **not** authorise a schema change. Q3 acknowledges a control limit; the mechanism follows the
  chosen posture.
- ⛔ It does **not** amend `geo_tree_versions`' versioning. Per F-2 that substrate is correct, and the
  orphan is a consequence of its correctness.

---

## Ruling template

```
Decision 2026-08-__-___ : Hierarchy-version drift for collected member attributes

Q1  orphaned stored combination : TYPED STALENESS / REJECT PUBLISH / VERSION PIN — reasoning:
Q2  who resolves it, and must they : MEMBER / PARIWAR ADMIN / NOBODY  — deadline:    — reasoning:
Q3  weaker DB control accepted     : ACCEPT+RECORD / REQUIRE TRIGGER / OTHER — reasoning:
Q4  scope of this ruling           : ALL COLLECTED HIERARCHY ATTRIBUTES / ZONE+DIVISION ONLY
                                     — reasoning:

⛔ On ruling, the §5.4 prohibition LIFTS for the ruled scope only.

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | One `.decision-log.md` entry, per-clause provenance labelled. ⚠ Re-verify the head — G1, G2, G3 also open | BigDev / Panel |
| 2 | Open item **O2** closed | BigDev |
| 3 | ⛔ §5.4's prohibition **lifts for the ruled scope only** — an unruled attribute class stays prohibited | BigDev |
| 4 | The chosen posture mechanized **before** any hierarchy attribute ships; a test asserts an orphan behaves as ruled | Amelia / Murat |
| 5 | If Q4 = ALL: proposal §4.1 row 2 re-marked — `Block` gated on this note too | BigDev |
| 6 | Q3's control limit recorded where the 0095 fence is documented, so parity is never assumed | BigDev |

---

*Routed 2026-08-19. ✅ **RULED 2026-08-19** — Dhiraj Rahul, Kalpana Bharti — recorded as Decision
`2026-08-19-137`. **O2 closed.***
