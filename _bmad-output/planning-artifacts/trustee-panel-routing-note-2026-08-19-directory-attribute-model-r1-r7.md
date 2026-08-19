# Trustee Panel Routing Note — the Member Directory attribute model (R1–R7) is put to the Panel for ratification

**Status:** ✅ **RULED 2026-08-19 — Dhiraj Rahul and Kalpana Bharti.** Recorded as **Decision
`2026-08-19-132`**. All five questions answered; **Q3 ratified WITH A CLARIFICATION** that adds a new
distinction to the model — see the annotation below.
⛔ **The questions below are left as put. They are annotated, never edited** — a reader must be able to
see what was asked, not only what was answered ([[feedback_supersede_never_reinterpret]]).

> ### ⭐ ANNOTATION — the ruling, 2026-08-19
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ✅ **RATIFY** — R1, R2, R7 |
> | **Q2** | ✅ **RATIFY** — R3, R3(a), (i), (ii); ⛔ Decision `2026-08-13-103` **D5 stands untouched** |
> | **Q3** | ✅ **RATIFY WITH CLARIFICATION** — ⭐ see below; R4 stands, and gains an **eligibility class** |
> | **Q4** | ✅ **RATIFY** — principle only; ⛔ no amendment authorised |
> | **Q5** | ✅ **STANDING** — *"the rules of the model are standing; the attributes and hierarchies adopted are Pariwar-specific"* |
>
> ⭐ **Q3's clarification adds an ORTHOGONAL SECOND AXIS the note did not put:**
> **organizational/hierarchical** attributes (`Block`, `Zone`, `Division`) are **ELIGIBLE** for RBAC
> participation by explicit governed configuration; **individual/member** attributes (`Designation`) are
> ⛔ **PERMANENTLY EXCLUDED** — ineligible, not merely un-promoted.
> The Panel's final position: *"Display-only by default, with explicit RBAC participation for eligible
> organizational attributes; individual attributes are excluded."*
>
> ⚠ **Two precision questions this raises are recorded OPEN in Decision `2026-08-19-132` clause 7 —
> ⛔ not resolved:** **(a)** `School` is organizational but **not** hierarchical, so its eligibility is
> unruled — ⛔ treated as **ineligible** until ruled; **(b)** whether *"explicit, governed configuration
> choice"* is R4's trustee ruling or something weaker.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-19, against `governance/epic-11a-directory-attribute-model` @ `8b09b1e` (clean),
branched from `main` @ `adf3c52`.
**Scope:** the **member directory attribute model** — Epic 11a Stories 11a.1 and 11a.3, with consumers in
Epic 11b (11b.1, 11b.6). ⛔ **This note asks for ratification of a MODEL, not for a story design.**
**Origin:** **G1** of Sprint Change Proposal `2026-08-19` §4.3, approved by BigDev 2026-08-19. Escalated
from Epic 10 Retrospective **SD-1** and action item **AI-10-4** (blocking, pre-authoring). **AI-10-2** ran
gated inside the originating session, as its own ruling required.
**Decision-log head, verified live at authoring:** `2026-08-18-131` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **133** headings, of which one is the `YYYY-MM-DD-NNN` **template**, leaving
**132** numbered headings over **131** distinct numbers — the `+1` is the amendment suffix
`2026-06-01-012-amend-1`. **No gaps in `001…131`** (verified by enumeration, not by eye).
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **from the head at ruling time**.
⚠ **Not pre-assigned** — the G3 note (`…-member-name-pii-posture`) is also open and unrecorded; whichever
lands first takes the next number. Per Decision `2026-08-09-095` the entry must **label per-clause
provenance**.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ⛔ ~~**R1–R7 are NOT in force.**~~ ✅ **SUPERSEDED BY THE RULING ABOVE.** R1–R7 are **in force** as of
> 2026-08-19, per Decision `2026-08-19-132`, subject to Q3's clarification. **AI-10-4 is CLOSED.**
> ⚠ Story 11a.1 still awaits **G5** + **G6**.

> ⛔ **Decision `2026-08-13-103` D5 is RATIFIED and is NOT edited by this note or by any ruling on it.**
> See **D-2**: R3(a) is compatible with D5 and does not supersede, amend or reinterpret it
> ([[feedback_supersede_never_reinterpret]]).

---

## Why this note exists

Story 11a.3 specifies a Member Directory tiered-visibility matrix against member attributes that **do not
exist in the substrate**. That much the Epic 10 retrospective found.

What the retrospective did **not** find — and what makes this a Panel question rather than a story fix —
is that the matrix was written as a **fixed cross-Pariwar schema** for a system that is per-Pariwar
multi-tenant by construction. AI-10-4 offered three dispositions per row: *build the attribute*, *narrow
the matrix*, *defer the tier*. **All three presuppose a fixed schema.** Answering any of them would have
produced a directory correct for Shikshak Pariwar and wrong for every tenant after it.

The model below replaces that framing. It is put to the Panel because it decides **who may create a
member attribute, and whether creating one can move authority** — which is a governance question, not a
design one.

---

## D — The distinctions the Panel is asked to hold

⛔ **These four are the substance of the ruling. Each has been collapsed at least once during authoring,
including by the author. Collapsing any of them changes what is being ratified.**

### D-1 ⭐ THE FOUR LEVERS — the relation is universal; the adoption is not

| # | Lever | Who decides |
|---|---|---|
| 1 | **The relation** — if `Block` exists, its parent is `District` | ⭐ **Platform. Universal.** No Pariwar may parent Block elsewhere, root it, or flatten it |
| 2 | Whether the Pariwar publishes block **nodes** in its geo tree | Pariwar |
| 3 | Whether the Pariwar enables `Block` as a member **directory attribute** | Pariwar |
| 4 | Which **visibility tier** it renders at | Pariwar |

⇒ Rail Pariwar never enables Block, and R3(a) costs it nothing. Shikshak enables it and inherits the
governed parent. ⛔ **R3(a) constrains SHAPE. It is not a mandate to adopt.**

### D-2 ⭐ `Block` is D5-UNDERIVABLE **and** separately selectable as a directory attribute

These are not in tension, and the Panel is asked to ratify both standing together.

- **Decision `2026-08-13-103` D5 rules Block NOT DERIVABLE.** A posting supplies a **district**; ancestry
  walks **up**; `block` sits **below** district. No tree, however complete, populates it by derivation.
  Mechanized as `geoAbsent('no-member-attribute')`, unconditional
  (`packages/domain/src/member-geo/resolve.ts:124`), a member of a **closed five-value union**
  (`member-geo/types.ts:26-32`, D6).
- **Shikshak does not want it derived. It is explicitly COLLECTED and maintained.**

⇒ ⛔ **`resolveMemberGeoNode().block` stays permanently absent. The closed union is untouched. No
mechanized contract moves.** Block enters through a different door — the directory-attribute registry, not
the geo resolver. **Derivation and collection are different acts, and D5 governs only the first.**

⚠ **One imprecision, recorded and deliberately NOT fixed by this note.** Once a Pariwar collects Block,
the literal reason string `'no-member-attribute'` is false on its face — the precise meaning is
*not-derivable-from-tree*. Changing a closed-union value is a **D6 change requiring its own ruling**. It
is carried as open item **O5**, ⛔ **not** bundled here.

### D-3 ⭐ Selecting a directory attribute does **not** grant member authority

⛔ **This is the control the whole model rests on.** Without it, every Pariwar Admin becomes a de-facto
authority-granting authority: define a field, populate it, and RBAC starts matching members by it.

- A directory attribute is **display-only by default** (R2), enforced **by signature** — the shipped
  `routed_to_role` advisory precedent.
- It becomes authority-bearing **only** by explicit **trustee ruling** (R4), and only if tree-validated.
- ⛔ **Defining or populating an attribute is never a promotion. A Pariwar Admin can never promote.**

> ⭐ **ANNOTATED 2026-08-19 (Decision `2026-08-19-132` clause 3) — D-3 as put was INCOMPLETE, and the
> Panel supplied the missing half.** D-3 asked only *whether* promotion is governed. The Panel also ruled
> *which attributes may ever be promoted at all*: **organizational/hierarchical** attributes (`Block`,
> `Zone`, `Division`) are **eligible**; **individual/member** attributes (`Designation`) are ⛔
> **permanently excluded** — ineligible, not merely un-promoted. ⛔ The bullets above are **not edited**;
> read them together with this. ⚠ `School` is organizational but **not** hierarchical and is therefore
> **unruled** — treated as ineligible pending clause 7(a).

⚠ **Verified today, and worth preserving deliberately rather than by accident:** `members.custom_fields`
is currently **inert** — a `grep` across `packages/domain/src` and `apps/api/src` returns exactly one
comment line outside its own module. Nothing authority-bearing reads it. R2 makes that property
intentional.

### D-4 ⭐ A hierarchy MAY bear authority even though the member's attribute does not

D-3 governs the **member's attribute**. It does **not** exclude the underlying **hierarchy** from RBAC.
Trustees may legitimately delegate authority by organizational scope.

⭐ **This distinction is already load-bearing in shipped code.** Story 6.17: `block` is a genuine RBAC
scope dimension today — a `block_admin` holds real authority, and `district_admin` reaches blocks by
ancestry — **while members have no block attribute at all.** The tree bears authority; member attribution
is a separate question that was answered *no* for block.

⇒ **R3(a)(ii) states the consequence directly:** publishing a Block hierarchy may support Block-scoped
RBAC **independently of directory adoption**, and enabling Block as a member directory attribute does
**not**, by itself, make that attribute authority-bearing or extend RBAC to members.

---

## The rulings put for ratification

### R1 — The three-category attribute taxonomy

Every directory attribute is exactly one of: **platform-supported / common** (canonical, cross-Pariwar,
Pariwar opts in) · **Pariwar-specific** (authored and enabled per Pariwar) · **requires new governed
substrate** (cannot be enabled until substrate is built and ruled).

### R2 — Directory attributes are display-only by default

Never authority-bearing by Pariwar-Admin action. May not feed RBAC scope containment, pool assignment,
`is_valid` / `is_assignable`, or peer-mesh selection. Enforced **by signature**. See **D-3**.

### R3 — An organizational hierarchy may bear RBAC authority

See **D-4**.

#### R3(a) — `Block` is governed under `District`, for **every** Pariwar

Relation universal, adoption Pariwar-selected. See **D-1**.

> **R3(a)(i)** — *A Pariwar may not enable Block as a member directory attribute unless its in-force
> hierarchy contains the required Block nodes. If the required hierarchy substrate is absent, enablement
> fails closed; it must not silently fall back to free-text or an unvalidated value.*

> **R3(a)(ii)** — *Publishing a Block hierarchy may support Block-scoped RBAC independently of directory
> adoption. Enabling Block as a member directory attribute does not, by itself, make that attribute
> authority-bearing or extend RBAC to members. R2 and R4 continue to govern member-authority use.*

### R4 — Promotion to authority-bearing is a governed act

Trustee ruling only, tree-validated attributes only. See **D-3**.

### R5 — Hierarchy-scoped dimensions; no cross-hierarchy comparison

> *The RBAC scope model must support Pariwar-specific hierarchical dimensions without imposing meaningless
> comparisons between unrelated hierarchies.*

```
Shikshak Pariwar          Rail Pariwar          Future Pariwar
  State                     Zone                  Region
   └─ District               └─ Division           └─ Area
       └─ Block                                        └─ Branch
```

Comparison is meaningful only **within** a hierarchy; across hierarchies it must be **structurally
impossible — fail-closed — not merely wrong**.

### R6 — The scope-dimension amendment carries separately

In its **own ADR + routing note**. ⛔ It does not ride in on a directory ruling. *(Those are **G2** and
**G4**, prepared separately and not before the Panel in this note.)*

### R7 — ⭐ GOVERNING — the attribute set is extensible and Pariwar-selected

> *Pariwar directory attributes are extensible and Pariwar-selected. They are NOT a fixed global list.*

⛔ There is **no** canonical directory schema. The rows examined during authoring carry **no privileged
status** and must never be re-read as a global default. Future Pariwars may select **different attributes
and different hierarchies** — including ones that do not exist today — **where an approved substrate
exists** (R1 category 3). Adding a Pariwar must not require a new fixed schema column, and must not
require re-ruling this decision.

⭐ **Where any reading of R1–R6 could imply a fixed set, R7 controls.**

---

## Supporting findings

Full evidence table: Sprint Change Proposal `2026-08-19` §1.2 (E1–E18), each verified live at `adf3c52`.
The four that bear most directly on ratification:

| # | Finding |
|---|---|
| **E6** | The intent existed and was **ratified**, then dropped. `architecture.md:1530` — *"Tier 3 — Plaintext. School, district, designation."* `prd.md:90` puts all three in the signup flow. Verified absent from `apps/api/src/modules/signup/` |
| **E7** | **No story ever owned them.** `epics.md:4477` names Epic 3 as supplier; Epic 3's thirteen stories contain no such story. The attribute fell between two stories and went unnoticed for seven epics |
| **E8** | The drift is already inside **shipped** work — `epics.md:3864` (Story 10.12) cites *"the existing `designation` field"*, which does not exist |
| **E10** | FR-74 / FR-78 prose is consistently **more permissive** than the story ACs. Two independent authors, years apart, both narrowed to district — **and neither recorded why.** This is the failure mode R7 and this note exist to prevent |

---

## The five questions

### Q1 — Ratify **R1, R2 and R7** — the model, the display-only default, and extensibility? ⛔ BLOCKING

These three are interdependent and are put together: R7 governs, R1 is its taxonomy, R2 is the safety
property that makes Pariwar-Admin authorship safe.

> **Non-binding recommendation:** **RATIFY.** R2 in particular preserves a property the system already has
> by accident (D-3) and would otherwise lose silently the first time a Pariwar defines an attribute.

### Q2 — Ratify **R3, R3(a), R3(a)(i) and R3(a)(ii)**? ⛔ BLOCKING

⚠ **The Panel is asked to confirm explicitly that D-2 holds** — that ratifying R3(a) leaves Decision
`2026-08-13-103` D5 **untouched and in force**, because collection and derivation are different acts.

> **Non-binding recommendation:** **RATIFY.** ⭐ R3(a) also removes Shikshak from the critical path:
> `district→block` is one of exactly three edge kinds the shipped resolver supports
> (`schema/geo_tree_versions.ts:56-57`) and `validateGeoTreeDocument` already enforces
> parent-strictly-broader (`geo-tree/document.ts:148`). Shikshak's Block validates on **shipped
> substrate** and does not wait on the G4 ADR.

### Q3 — Ratify **R4** — promotion to authority-bearing is a governed act? ⛔ BLOCKING

> **Non-binding recommendation:** **RATIFY.** Without R4, R2 and R3 contradict each other the first time a
> Pariwar wants organizational authority over members (D-3, D-4). R4 is the step that keeps both true.

### Q4 — Ratify **R5 and R6** as principles? ⚠ DIRECTIVE

⛔ **This is ratification of the PRINCIPLE only.** The amendment itself — `SCOPE_DIMENSIONS`, the
`scope_dimension` pgEnum, architectural freeze row 9, ADR-0008 and ADR-0038 — is **G2 + G4**, prepared
separately. Nothing in this note authorises a change to any of them.

> **Non-binding recommendation:** **RATIFY the principle; rule the amendment on G2.** R5 is what prevents
> a confident, meaningless answer to *"is Zone broader than District?"* — the ADR-0038 failure mode by
> name.

### Q5 — Is this a **standing model** future Pariwars inherit without re-ruling? ⚠ DIRECTIVE

R7 says the set is extensible. This asks the complementary question: when Rail, Bank or Public Servants
Parivar onboard (`prd.md:117`), do they operate **under this ruling as-is**, or does each new Pariwar's
attribute set require its own Panel act?

> **Non-binding recommendation:** **STANDING**, with the R1 category-3 gate as the natural brake — a new
> Pariwar selects freely from attributes whose substrate exists, and returns to the Panel only when it
> needs substrate that does not. That is exactly Rail's position today.

---

## What a non-answer would mean

⛔ **Epic 11a cannot be authored.** Story 11a.1 codifies the visibility matrix and is the direct consumer
of R1/R7; 11a.3 consumes all seven. Both are `backlog` and gated.

⛔ **AI-10-4 does not close.** It is a **blocking, pre-authoring** retrospective action item, confirmed by
BigDev 2026-08-18. It closes when this ruling lands, not when the proposal was approved.

⚠ **And the specific decay this note is written to prevent:** absent a ruling, a story author faced with
attributes that do not exist will narrow the matrix to what does exist, ship it, and record nothing. That
has now happened **twice** in this codebase (E10), and the second time it survived review and merge (E8).
A third occurrence would not be an accident; it would be the predicted outcome.

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** ask about member **names** at any tier. That is **G3**
  (`…-2026-08-19-member-name-pii-posture`), open, five questions, ruled independently. A ruling here
  neither answers nor constrains it.
- ⛔ It does **not** ask the Panel to amend `SCOPE_DIMENSIONS`, the `scope_dimension` pgEnum, freeze row 9,
  ADR-0008 or ADR-0038. Q4 ratifies a **principle**; the amendment is **G2 + G4**.
- ⛔ It does **not** ask about hierarchy-version drift — what becomes of a stored combination when a
  published version orphans it. That is **G4a**, prepared separately. ⚠ Until G4a is ruled, the
  implementation is **prohibited from inventing an orphan policy** (Sprint Change Proposal §5.4).
- ⛔ It does **not** amend, reinterpret or reopen Decision `2026-08-13-103` D5. See **D-2**.
- ⛔ It does **not** put the **PII-scrape tier-leak finding (F-5 of G3)** to the Panel. ⭐ **That is
  engineering work, not a governance question** — the gate's `loadSnapshots()` stub and the unpopulated
  matrix are owed regardless of any ruling, and are tracked on their own track. It is named here only so
  its exclusion is deliberate and visible.
- ⛔ A ruling does **not** authorise any code change by itself. G5 (`architecture.md`) and G6 (`epics.md`)
  follow the ruling; implementation follows those.
- ⛔ It does **not** resolve the `district_admin` deferral (7th, Story 10.18). That is **rank-order** debt,
  not tree-shape debt, and no organizational tree changes it.

---

## Ruling template

```
Decision 2026-08-__-___ : Member Directory attribute model (R1–R7)

Q1  R1 + R2 + R7  — model, display-only default, extensibility : RATIFY / REJECT / AMEND — reasoning:
Q2  R3 + R3(a) + (i) + (ii)                                     : RATIFY / REJECT / AMEND — reasoning:
      ⚠ confirm explicitly: Decision 2026-08-13-103 D5 stands UNTOUCHED (D-2)  : YES / NO
Q3  R4 — promotion is a governed act                            : RATIFY / REJECT / AMEND — reasoning:
Q4  R5 + R6 — principle only, amendment deferred to G2/G4       : RATIFY / REJECT / DEFER  — reasoning:
Q5  standing model for future Pariwars                          : STANDING / PER-PARIWAR   — reasoning:

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | One `.decision-log.md` entry, per-clause provenance labelled. ⚠ Number taken from the head **at ruling time** — G3 is also open | BigDev / Panel |
| 2 | **AI-10-4 closed.** ⛔ Not before | BigDev |
| 3 | **G5** — `architecture.md` §2.7 storage model reconciled; §2.6 cross-referenced to G4 | Winston |
| 4 | **G6** — `epics.md` reconciliations C1–C9 (AI-10-2) | John |
| 5 | 11a.1 / 11a.3 re-authored; open item **O6** (does the registry extension belong inside Epic 11a) decided | John |
| 6 | Open item **O8** — R3(a) is unenforced; `state→block` is a legal edge today and would be accepted by `validateGeoTreeDocument`. ⛔ Must be **closed, not assumed** | BigDev / Murat |
| 7 | Open items **O1, O5** carried; **O2** routed as G4a; **O4** belongs to G3 | BigDev |

---

*Routed 2026-08-19. Verified live at `8b09b1e`. ✅ **RULED 2026-08-19** — Dhiraj Rahul, Kalpana Bharti —
recorded as Decision `2026-08-19-132`.*
