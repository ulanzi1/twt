# ADR Ratification — Trustee Consent Sheet (2026-08-19)

**Purpose:** collect Trustee Panel consent for the **two remaining `drafted` Section A ADRs** —
**ADR-0037** (per-tenant custom fields via JSONB) and **ADR-0038** (the geo-tree scope resolver's
source of truth) — and to **retroactively record consent for ADR-0039**, which was ratified earlier
today (Decision `2026-08-19-138`) **without a consent sheet**. Mark **Ratify / Defer / Reject** and
initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> **Status as of 2026-08-19.** Section A breakdown: `slot-reserved-pre-write` 112 · `drafted` **2** ·
> `under-trustee-review` 0 · `ratified` 35 · `superseded` 1 · **Total 150**.
> The two `drafted` rows are **ADR-0037** and **ADR-0038** — both on this sheet. If both ratify,
> **`drafted` reaches 0** for the first time since 2026-08-06.
>
> ⚠ **ADR-0039 is already `ratified`** (Decision `2026-08-19-138`) and is on this sheet only for the
> **missing-consent-sheet** item in §3. ⛔ Its ratification is **not** re-opened.

---

## Read-first priority

⛔ **Three things the panel should read before signing, not discover later.** Two are new as of today.

### 1. ⭐ ADR-0037's own "re-consider" trigger has PARTIALLY FIRED — and it fired today

ADR-0037's Alternatives section records, against the rejected code-file medium:

> *"**Re-consider if** trustees later rule that **tenant self-service authoring is undesirable** — in
> which case the registry table becomes a build-time seed source and the admin surface is withdrawn."*

**Decision `2026-08-19-133` clause 2 ruled exactly that — for one class of field:**

> *"Only Super Admin / Trustee Panel may create or materially redefine directory attributes. Pariwar
> Admins may configure permitted usage of already-governed attributes, but cannot create a new attribute
> or elevate an attribute into an RBAC-capable class."*

⚠ **The trigger fired PARTIALLY, not wholly.** Tenant self-service authoring **stands** for ordinary
custom fields (the *"cadre grade"* case ADR-0037 was written around). It is **withdrawn** for
**directory attributes** (`Block`, `School`, `Designation`, and any future hierarchy attribute).

⭐ **The consequence the panel is being asked to accept:** `pariwar_custom_field_definitions` — the one
table ADR-0037 commits — now hosts **two authorship regimes** in the same registry. ⛔ Neither ADR-0037
nor Decisions `132`–`138` state that consequence in one place; **this sheet is the first place it is
written down.**

⚠ **Precision, because it changes who decided what:** the choice to *extend* ADR-0037's registry (rather
than build a separate directory-attribute table) was **BigDev's**, recorded in the approved Sprint Change
Proposal §3.4. ⛔ It was **not** among R1–R7 and was **never put to the Panel.** A trustee who considers
that vehicle choice worth ruling on should **Defer ADR-0037** and say so.

### 2. ADR-0038's non-scope list is accurate — but its freeze reference is now dated

ADR-0038's *"What this ADR does NOT decide"* opens:

> *"It does not change `GEO_RANK`, `CEILING_RANK`, `scopeContains`'s ordering, the `GeoTreeResolver`
> interface, or the permission-key / scope-dimension model — **architectural freeze row 9**."*

⛔ **That statement is TRUE of ADR-0038 and is not being corrected.** Story 1.18 landed the entire
resolver without touching `rbac/scope.ts`.

⚠ What changed is the **surrounding freeze**: **ADR-0039** (`ratified` today) amends freeze row 9
narrowly, moving dimension ordering into the published hierarchy document. ADR-0039 describes itself as
*"precisely the ADR that ADR-0038 declined to be."*

⇒ **A pre-presentation cross-reference has been added beneath that bullet** so no reader infers the
freeze stands untouched. ⛔ The bullet itself is **unedited**. **The panel is ratifying ADR-0038 with
that cross-reference present.**

### 3. ⚠ ADR-0039 was ratified today WITHOUT a consent sheet — this sheet is the belated record

Every prior ratification session cited in `adr-index.md` produced a consent sheet; five exist
(2026-06-21 → 2026-08-01). Decision `2026-08-19-138` records the omission as a **named forward
obligation** rather than back-filling it. ⛔ §3 below is that record — it does **not** re-open ADR-0039,
and it is **not** presented as though the sheet existed at the time.

### 5. ⚠ **THE PANEL ASKED: "are these ADRs up to date?"** — answered by verification, 2026-08-19

⛔ **The honest answer was NO.** ADR-0037 is dated **2026-08-06**, ADR-0038 **2026-08-12**. Three kinds of
staleness were found; **only the third touches a decision**, and all three are now addressed.

**(a) Line-citation drift — pervasive, pre-existing, and partly caused by this very session.**

| Citation | Claimed | Actually at | Cause |
|---|---|---|---|
| ADR-0038 → architecture `§2.6` | L1476-1496 | **1491** | pre-existing |
| ADR-0038 → architecture `§3.13` | L2406-2421 | **2589** | pre-existing, **+148 by G5 today** |
| ADR-0038 → epics freeze row 9 | L510-527 | **547** | pre-existing, **+14 by G6 today** |
| ADR-0037 index → architecture `§1.7` | L943-991 | **943** | ✅ correct |
| ADR-0037 index → architecture `§2.7` | L1507-1531 | **1527** | pre-existing, **+15 by G5 today** |
| ADR-0037 index → epics Story 10.12 | L3593-3605 | **3868** | pre-existing, ~260 off |

⛔ **No decision changed** — every target resolved correctly **by section**; only coordinates were stale.
⚠ **This session caused part of it.** The G5 and G6 amendments moved three of these and did not check the
ADRs citing into them — recorded rather than quietly corrected.
⇒ **FIXED by citing SECTION ANCHORS instead of line ranges**, in ADR-0038's References and in both index
rows. ⭐ Line numbers into a living document drifted **three times in one day**; re-patching the numbers
would have rebuilt the same fragility.

**(b) ⭐ A bounded claim whose bound has been passed — ADR-0038, and the bound did its job.**
ADR-0038 states *"There is no `state` column and no `block` column anywhere in the schema — verified
across all applied migrations at `0100`."* Migration **`0102_ground-inspection-block.sql`** adds `block
text` to **`claim_ground_inspections`**; migrations now run to **`0109`**.
⛔ The sentence was **never false** — it was **correctly bounded**, and its bound has simply been passed.
⭐ **The revisit trigger has NOT fired, and that is the trigger working.** It is scoped to
**`member_postings`** gaining `state`/`block` **with a recorded parent relationship**. `0102`'s block is
the inspection **SITE's** jurisdiction (Story 6.17), ⛔ **not a member attribute** — the exact distinction
Decision `2026-08-19-132` clause 2 later turned on. ⇒ **The rejection stands unchanged.**
⇒ **FIXED by a verification-refresh note**, re-verified at `0109`. ⛔ The original text is unedited.

**(c) Substantive supersession** — items 1 and 2 of this sheet. Both already addressed.

⛔ **THE SYSTEMIC FINDING, recorded and NOT unilaterally fixed.** **31 of 39** Section A index rows carry
line-range citations, and spot-checks show them stale **across the board — including rows describing
`ratified` ADRs** (ADR-0008's row cites the same wrong `§2.6 L1476-1496` / `§3.13 L2406-2421`).
⭐ This is the **AI-10-2 drift class** this session just discharged for `epics.md` — and **nothing performs
that job for ADRs**. ⛔ Only the two rows on this sheet were corrected; **29 others were left untouched**,
because several describe ratified decisions and a sweep is the Panel's call, not the author's.
⚠ **A trustee may treat this as its own agenda item.** It does **not** block items 1 or 2.

---

### 4. ⭐ An inversion currently stands in the record, and ratifying ADR-0038 REMOVES it

**ADR-0039 is `ratified` and explicitly extends ADR-0038, which is `drafted`** — a ratified ADR resting
on an unratified one (Decision `2026-08-19-138` clause 3). ⛔ This does not weaken ADR-0039; its substance
was ruled independently at `2026-08-19-134`. ⚠ But it is an anomaly in the record, and **ratifying
ADR-0038 is what resolves it.**

---

## 1 · ADR-0037 — Per-tenant custom fields via JSONB (FR-54)

**File:** `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` · **Authored:** 2026-08-06, Story 10.12 closure
**Status:** `drafted` · **Never presented to the Panel.**

**What it commits (D1–D7):** definitions live in an append-only, RLS-scoped, trigger-protected **registry
table**, while the type allowlist, forbidden-key patterns and hard limits stay in **code** · **no
code-resident default** · a hand-written imperative validator, never a Zod schema built from a DB row ·
`pii_tier` **required**, and v1 accepts **tier 3 only** plus a naked-PII key/label detector · `indexed:
true` is a recorded **request**, never an action — a tenant admin issues **no DDL, ever** · unknown keys
are **rejected**, never dropped · members-only host, recorded as a gated deferral.

⭐ **The load-bearing half is the three-layer governance fence** (runtime + DB `CHECK` + a CI gate
honestly scoped to committed source). ⚠ It exists because `epics.md:3605` cited a Story 1.16c enforcement
that **does not and cannot exist** — a custom field is a runtime-authored JSONB key, not a table, column,
route literal or Zod export.

**All three original escalations are CLOSED:** ESCALATION 1 (2026-08-07, Decision `2026-08-07-083`) ·
ESCALATIONS 2 and 3 (2026-08-07, Decision `2026-08-07-084`). ⛔ Ratification was never asserted at either.

⚠ **Read §Read-first item 1 before signing.**

| | Ratify | Defer | Reject | Initials | Notes / conditions |
|---|---|---|---|---|---|
| **Dhiraj Rahul** | ☐ | ☐ | ☐ | | |
| **Kalpana Bharti** | ☐ | ☐ | ☐ | | |

---

## 2 · ADR-0038 — The geo-tree scope resolver's source of truth

**File:** `docs/adr/ADR-0038-geo-tree-scope-resolver.md` · **Authored:** 2026-08-12, Story 1.18 closure
**Status:** `drafted` · **Never presented to the Panel.**

**What it commits:** a **versioned per-Pariwar registry table** (`geo_tree_versions`) holding one JSONB
tree document per version row — with ⭐ **no code-resident default**: a Pariwar with no row has **no
tree**, the loader returns `null`, no resolver is passed, and `denyDeeperGeoResolver` applies, so
**today's behaviour is preserved byte-identically by construction**.

**Both rejections are recorded on evidence, not preference:** a projection over `member_postings` is
**impossible, not merely undesirable** (the table carries `district` and nothing else geographic;
*ancestry cannot be projected from data that records no parent*) · a code-resident seeded geography is
rejected on **failure-mode asymmetry** — a wrong tree silently **grants** with no signal, an absent tree
merely **denies**, visibly.

⚠ **Accepted risk, unchanged:** validation rejects cycles, rank inversions and duplicate siblings but
**cannot** catch a factually wrong edge — `Patna ∈ Kerala` is structurally valid. **Publishing a tree
widens authorization**, which is why geography is declared per tenant rather than assumed.

⚠ **Read §Read-first items 2 and 4 before signing.** ⭐ Ratifying this row **removes the standing
inversion** described in item 4.

| | Ratify | Defer | Reject | Initials | Notes / conditions |
|---|---|---|---|---|---|
| **Dhiraj Rahul** | ☐ | ☐ | ☐ | | |
| **Kalpana Bharti** | ☐ | ☐ | ☐ | | |

---

## 3 · ADR-0039 — belated consent record (⛔ ratification NOT re-opened)

**File:** `docs/adr/ADR-0039-pariwar-specific-hierarchical-scope-dimensions.md`
**Status:** ✅ **`ratified` 2026-08-19** — Decision `2026-08-19-138`, Dhiraj Rahul + Kalpana Bharti.
⚠ **No amendments, no conditions** were applied at that ratification.

⛔ **This section does not ask for ratification.** It records trustee consent to the **procedural gap**:
ADR-0039 was ratified without the consent sheet every prior session produced. Signing here attests that
the ratification recorded at `2026-08-19-138` is accurate as recorded.

⚠ If either trustee considers the ratification itself to require re-doing rather than recording, mark
**Defer** and it returns as its own item — ⛔ this sheet will not treat a signature as curing an act it
did not witness.

| | Consent to the record | Defer | Initials | Notes |
|---|---|---|---|---|
| **Dhiraj Rahul** | ☐ | ☐ | | |
| **Kalpana Bharti** | ☐ | ☐ | | |

---

## On ratification — what changes

| Artifact | Change |
|---|---|
| `docs/adr/ADR-0037-*.md`, `ADR-0038-*.md` | `Status:` → `ratified`; ratifying trustees + date; changelog row |
| `docs/knowledge-transfer/adr-index.md` | Both Section A rows flip; breakdown `drafted` 2→**0**, `ratified` 35→**37**; **Total unchanged at 150**. ⛔ Row **and** reconciliation in the **same commit**, per `README.md` §7 |
| `.decision-log.md` | One entry, numbered from the head **at ruling time** (⚠ `2026-08-19-138` is the current head; re-verify) |
| This sheet | Filed alongside the five prior sheets |

⛔ **Nothing else.** No code, no migration, no story status. ⚠ Ratifying ADR-0037 does **not** authorise
the directory-attribute registry extension — that is Epic 11a build work gated separately.

**Quorum:** ≥2 trustees. **Prepared:** 2026-08-19, BigDev (Solo Builder).
