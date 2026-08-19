# Sprint Change Proposal — 2026-08-19

## Epic-11a update session (AI-10-4) — the Member Directory attribute model

**Status:** ✅ **APPROVED by BigDev, 2026-08-19.** Approval covers R1–R7 (incl. R3(a), R3(a)(i), R3(a)(ii)) as the ruled model, and the G1–G6 + G4a commit plan as the route.
⛔ **Approval of this proposal is NOT trustee ratification.** R1–R7 bind only once **Decision `2026-08-19-132` (G1)** is recorded and ratified. Until then nothing here is authority.
**Trigger:** Epic 10 Retrospective (2026-08-18), Significant Discovery **SD-1**; action item **AI-10-4** (blocking, pre-authoring). **AI-10-2** (the `epics.md` 11a/11b reconciliation) runs gated inside this session per its ruling.
**Session mode:** Incremental. Row scope widened to **six** by BigDev at session open; the model was then reframed mid-session (see §1) and **R3(a)** + **R7** were ruled during revision.
**Prior art superseded:** none. Prior art **amended**: see §4.
**⛔ POST-APPROVAL AMENDMENT — 2026-08-19, directed by BigDev, recorded not silent.** While preparing
**G4a**, the drift question was found to be **wider than this proposal recorded**. §4.1 row 2 and §4.3
originally gated G4a on `Zone`/`Division` alone. `Block` is **tree-validated** under R3(a), so a *Shikshak*
hierarchy restructure orphans a stored value exactly as a Rail one would — meaning §5.4's prohibition
already reaches Block, and row 2 is gated on G4a too. Amended in six places, each marked **AMENDED**:
§3.1 · §4.1 row 2 · §4.3 G4a · §5 handoff (BigDev/Panel, Amelia) · §5.2 · §5.3 O2 · §5.4.
⚠ The **final scope is the Panel's**, not this amendment's: G4a **Q4** asks whether the ruling covers all
collected hierarchy attributes or Zone/Division only. Until it rules, treat the wider gate as in force.
⛔ This narrows what may be built; it changes **no ruling** (R1–R7 are untouched) and does not re-open
approval.
**Verification posture:** every claim below was checked against the live tree at `adf3c52` (`main`, clean, synced). Story prose was not treated as evidence. Where a claim is carried un-verified it is marked ⚠ **UNVERIFIED**.

---

## 1. Issue Summary

Epic 11a Story 11a.3 specifies a Member Directory tiered-visibility matrix against member attributes that **do not exist in the substrate**. The retrospective identified four such rows; this session identified two more and one mis-scoped consequence.

The defect is **not** primarily "missing columns." It is that the directory was specified as a **fixed cross-Pariwar schema** in a system that is per-Pariwar multi-tenant by construction. Ruling the four rows as originally framed — *build the attribute*, *narrow the matrix*, or *defer the tier* — would have produced a fixed six-column directory that is correct for Shikshak Pariwar and wrong for every subsequent tenant.

⭐ **BigDev's correct-course during this session reframed the problem**, and that reframe is the substance of this proposal. The directory must support **Pariwar-specific attribute selection**: a Pariwar Admin decides which governed directory attributes apply to their Pariwar. `Block` may be enabled for Shikshak Pariwar and disabled for Rail Pariwar; Rail may instead use `Zone` and `Division`; a future Pariwar may require organizational or geographic attributes that do not exist today.

### 1.1 How it was discovered

The Epic 10 retrospective's forward-look at Epic 11a. Not found by a gate, a test, or a failing build — **no mechanism in the project could have caught it**, because the matrix lives in `epics.md` prose and the attributes it names were never minted as contracts. This is the same class as AI-9-2 / AI-10-2 (`epics.md` no longer reliably describes the system), and it predates Epic 10.

### 1.2 Evidence

| # | Finding | Evidence (live at `adf3c52`) |
|---|---|---|
| E1 | `Block` cannot be **derived** from the member geographic substrate | `member_postings` carries `district text NOT NULL` and nothing else geographic (`packages/domain/src/schema/member_postings.ts:51`). The resolver walks descendant→ancestor only and short-circuits an ancestor at or below the descendant's rank (`packages/domain/src/geo-tree/resolver.ts:156-158`). `block` ranks **below** `district` (`packages/domain/src/schema/geo_tree_versions.ts:59`). Mechanized: `const block = geoAbsent('no-member-attribute')`, unconditional (`packages/domain/src/member-geo/resolve.ts:124`), a member of a **closed five-value union** (`member-geo/types.ts:26-32`, Decision `2026-08-13-103` D6) |
| E2 | `School` / `Office` has no column anywhere | Absent from `members` (`schema/members.ts:85-142`) and `member_postings`. ⚠ **False friend:** `school_or_office` exists as a `GROUND_INSPECTION_SITE_TYPES` enum value (`schema/claim_ground_inspections.ts:67`) — that is *where an inspector visits for a claim*, not a member attribute |
| E3 | `Designation` has no column | Recorded already at Story 10.5 Decision 4 (`schema/news_posts.ts:40`) |
| E4 | Member **name** is Tier-1 ciphertext + Tier-2 blind index | `architecture.md:1526`. The sole member name is `member_kyc_profiles.name_ciphertext` (`schema/member_kyc_profiles.ts:71`), `piiColumn(1, 'member_kyc')`, KYC-derived |
| E5 | ⭐ The retro under-counted E4 by one row | **Both** name rows require a Tier-1 decrypt — public (first-name + last-initial) **and** authenticated (full name). The retro flagged the public tier only |
| E6 | The intent existed and was ratified, then dropped | `architecture.md:1530` — **"Tier 3 — Plaintext. School, district, designation."** `prd.md:90` puts all three in Sushil's signup flow. Verified absent from `apps/api/src/modules/signup/` |
| E7 | No story ever owned them | `epics.md:4477` names the supplier: *"Epic 3 (Member Directory data — name + district + block + school)."* Epic 3's thirteen stories (3.1–3.12) contain no such story. 3.3b is DigiLocker KYC (name/DoB/photo); 3.9 Life Events owns posting district |
| E8 | ⚠ The drift is already inside **shipped** work | `epics.md:3864` (Story 10.12, shipped) — *"Tier-3 by direct analogy to the **existing `designation` field**, §2.7."* It does not exist |
| E9 | Two uncounted consumers | UX spec `:1124` — Sahyog List table carries *"donor names, **schools**, districts, **blocks**"* (Epic 11b). `prd.md:1059` — public **verifier profile pages** display **designation** + district |
| E10 | The FR prose is consistently **more permissive** than the story ACs | FR-74 (`epics.md:143`) puts school + designation at the **public** tier; 11a.3's matrix marks both **✗** at public. FR-78 (`epics.md:147`) puts school + designation on In Memoriam; 11b.6's AC (`epics.md:4783`) gives public-tier *"first-name + last-initial + dates + district"* only. **Two independent authors, years apart, both narrowed to district. Neither recorded why** |
| E11 | The 10.12 custom-field fence does **not** block these keys | None of `block` / `school` / `zone` / `division` / `designation` appears in `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS` (`custom-fields/frozen-governance.ts:99-159`) or in either naked-PII marker list (`:168`, `:195`) |
| E12 | `members.custom_fields` is **inert today** | `grep` across `packages/domain/src` + `apps/api/src` returns exactly one comment line outside the custom-fields module itself (`apps/api/src/server.ts:308`). Nothing authority-bearing reads it |
| E13 | `geo_tree_versions` **is** authority-bearing | Read by `rbac/scope.ts:177` and `rbac/permissions.ts:195` via `createGeoTreeResolver` (`apps/api/src/modules/rbac/index.ts:72`) |
| E14 | ⛔ `SCOPE_DIMENSIONS` is frozen, enum-backed, and ADR-owned | Frozen tuple at `rbac/scope.ts:47`; derives `pgEnum('scope_dimension', …)` at `schema/role_grants.ts:32`; `scope.ts` is **architectural freeze row 9** — *"this file was not modified to make that work, and must not be"* (`rbac/scope.ts:40`); owned by **ADR-0008 + Decision `2026-06-11-044`** (`rbac/scope.ts:20`) |
| E15 | ⭐ `GEO_RANK` is a **single global total order** | `rbac/scope.ts:64` — `global 0 < pariwar 1 < state 2 < district 3 < block 4`. Two dimensions from **disjoint** hierarchies would still yield a confident numeric answer. See §3.3 |
| E16 | The universal dimensions are **already** orthogonal to the rank | `pariwar` short-circuits before the resolver (`rbac/scope.ts:288`); `self` is explicitly excluded from `GEO_RANK` and special-cased in `scopeContains` (`rbac/scope.ts:61-63`) |
| E17 | Rail is a **named future tenant**, not v1 | `prd.md:117` — *"future tenants: Rail Parivar, Bank Parivar, Public Servants Parivar."* V1 is Shikshak |
| E18 | The custom-field vocabulary is **flat by design** | Seven scalar types, *"a bounded declarative form, never an expression language"* (`custom-fields/types.ts:1-12`). `CUSTOM_FIELD_MAX_ENUM_VALUES = 64`; `CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR = 32` (`custom-fields/limits.ts`) |

---

## 2. The Rulings

**Seven rulings** (R1–R7, plus clause **R3(a)**), all confirmed by BigDev in session 2026-08-19. These are the substance; the row dispositions in §4 **follow from** them.

⭐ **Read R7 first.** It is the governing principle; R1–R6 operate inside it.

### R1 — The three-category attribute taxonomy

Every directory attribute is exactly one of:

| Category | Definition | Storage today |
|---|---|---|
| **Platform-supported / common** | Canonical, defined once by the platform, cross-Pariwar. A Pariwar **opts in**; it does not author it | Real columns (`member_postings.district`) |
| **Pariwar-specific** | Governed, authored and enabled per Pariwar by the Pariwar Admin | `pariwar_custom_field_definitions` + `members.custom_fields` |
| **Requires new governed substrate** | Cannot be enabled until substrate is built and ruled | — |

⛔ A fixed cross-Pariwar directory schema is **rejected**. ⛔ Globally removing `Block` is **rejected**. Both were the framings AI-10-4 offered; both are wrong.

### R2 — Directory attributes are display-only **by default**

A Pariwar-selected directory attribute is rendering data. It may **never** feed RBAC scope containment, pool assignment, `is_valid` / `is_assignable`, or peer-mesh selection **by virtue of a Pariwar Admin defining or populating it**.

Enforced **by signature**, following the shipped precedents: `routed_to_role` is advisory and inert (`[[project_helpdesk_routing_is_advisory]]`); the restoration overlay is coverage-only by signature (`[[project_restoration_discipline_overlay_substrate]]`).

⭐ **Rationale.** Without R2, every Pariwar Admin becomes a de-facto authority-granting authority. E12 confirms this property holds *accidentally* today; R2 makes it hold *deliberately*.

### R3 — An organizational hierarchy **may** bear RBAC authority

R2 governs the **member's attribute**. It does **not** exclude the underlying **hierarchy** from RBAC. Trustees may legitimately delegate authority by organizational scope — a Rail administrator responsible for a Zone should be able to hold RBAC authority for that Zone and, where appropriate, its Divisions.

⭐ **This distinction is already load-bearing in shipped code.** Story 6.17: `block` is a genuine RBAC scope dimension (a `block_admin` holds real authority; `district_admin` reaches blocks by ancestry) **while members have no block attribute at all**. The tree bears authority; member attribution is a separate question that was answered *no* for block. R3 generalizes exactly that shape.

Zone → Division requires **cascading selection**: selecting a Zone constrains available Divisions to that Zone's. Stored combinations validate against the in-force hierarchy. This comes largely free — `tree.parents` already drives containment.

#### R3(a) — `Block` is governed under `District`, for **every** Pariwar

⭐ **Ruled by BigDev, 2026-08-19.** `Block` is never a flat attribute. Wherever a Pariwar enables it, it is a **governed child of `District`**. Enablement stays per-Pariwar (R1, R7); the **relation is platform-governed** and not a per-Pariwar invention.

**The relation is universal; the adoption is not.** Four levers are separable and must not be collapsed:

| # | Lever | Who decides | Status |
|---|---|---|---|
| 1 | **The relation** — if `Block` exists, its parent is `District` | ⭐ **Platform. Universal.** No Pariwar may parent Block elsewhere, root it, or flatten it | **R3(a)** — new |
| 2 | Whether the Pariwar publishes block **nodes** in its geo tree | Pariwar | Already per-Pariwar. A tree may contain no blocks at all; `loadGeoTree` returns `null` when none is published |
| 3 | Whether the Pariwar enables `Block` as a member **directory attribute** (collected per member, rendered) | Pariwar | **R7** — the new selection |
| 4 | Which **visibility tier** it renders at | Pariwar | Per-attribute tier declaration (§3.4) |

⇒ Rail simply never enables Block, and R3(a) costs it nothing. Shikshak enables it and inherits the governed parent. ⛔ R3(a) constrains **shape**; it is **not** a mandate to adopt.

##### R3(a)(i) — Enablement fails closed without the substrate

> **A Pariwar may not enable Block as a member directory attribute unless its in-force hierarchy contains the required Block nodes. If the required hierarchy substrate is absent, enablement fails closed; it must not silently fall back to free-text or an unvalidated value.**

⭐ Levers 2 and 3 are **not independent**: a collected Block cannot be validated against a tree that has no block nodes. The project already carries both the vocabulary (`no-tree-published` as a typed absence, `member-geo/types.ts:20`) and the posture (503-when-unprovisioned, `[[project_moderation_record_model_substrate]]`). ⚠ Unstated, this becomes a runtime surprise in the row-2 story.

##### R3(a)(ii) — Directory adoption does not confer authority

> **Publishing a Block hierarchy may support Block-scoped RBAC independently of directory adoption. Enabling Block as a member directory attribute does not, by itself, make that attribute authority-bearing or extend RBAC to members. R2 and R4 continue to govern member-authority use.**

⭐ A Pariwar publishing block nodes already gets block-scoped RBAC today (Story 6.17) whether or not it enables the directory attribute. The two directions stay independent — which is the entire point of the R2/R3 split.

⭐ **Consequence: this needs no new substrate, and it moves Shikshak off the critical path.** `district→block` is one of exactly three edge kinds the shipped resolver supports — *"the resolver therefore only ever sees three edge kinds: `state→district`, `state→block`, `district→block`. That is the entire surface"* (`schema/geo_tree_versions.ts:56-57`). `validateGeoTreeDocument` already enforces *parent must be STRICTLY BROADER by geo rank* at write time (`geo-tree/document.ts:148`), and the substrate is already versioned, per-Pariwar and cycle-rejecting.

⇒ **Shikshak's Block hierarchy validates against the in-force geo tree using shipped substrate. It does not wait on G4.** Only Rail's `Zone → Division` — genuinely new dimensions — needs the R5 amendment.

⚠ **But R3(a) is NARROWER than the substrate currently permits, and nothing enforces the difference.** `state→block` is a legal edge today: a Pariwar could publish a block parented directly to a state, skipping district, and `validateGeoTreeDocument` would **accept it**. R3(a) forbids that; the validator does not yet know. This is the *"an app-layer rule with no mirror"* class (migration 0088 doctrine) and must be closed by an explicit validation rule — ⛔ **not** assumed to hold because the ruling exists. Carried as **O8**.

⚠ **Validation is not promotion.** Checking a collected Block against the geo tree confirms the *value*; it confers no authority. Per R3(a)(ii), only an R4 ruling changes that.

### R4 — Promotion is a governed act

A member's hierarchy attribute is display-only **by default** (R2). It becomes authority-bearing **only** by explicit **trustee ruling** that promotes it, and **only** if it is tree-validated against the Pariwar's in-force hierarchy.

⛔ Defining or populating an attribute is **never** a promotion. ⛔ A Pariwar Admin can never promote.

⭐ **Why this middle step exists.** "A Rail administrator responsible for a Zone" almost certainly means authority over **members** in that Zone, and a member's Zone is a collected attribute. Without R4, R2 and R3 would contradict each other the first time Rail onboards. R4 is what keeps both literally true.

### R5 — Hierarchy-scoped dimensions; no cross-hierarchy comparison

> **The RBAC scope model must support Pariwar-specific hierarchical dimensions without imposing meaningless comparisons between unrelated hierarchies.**

```
Shikshak Pariwar          Rail Pariwar          Future Pariwar
  State                     Zone                  Region
   └─ District               └─ Division           └─ Area
       └─ Block                                        └─ Branch
```

**Dimensions belong to a named hierarchy. Comparison is meaningful only *within* a hierarchy; across hierarchies it must be structurally impossible — fail-closed — not merely wrong.**

⭐ **This is narrower than it first appears (E16).** `global`, `pariwar` and `self` are *already* orthogonal to `GEO_RANK`. The generalization is: those three stay universal, and `['state','district','block']` becomes **one named hierarchy** rather than the only one. Existing tenants keep byte-identical behaviour.

⚠ Without R5, `GEO_RANK`'s single total order (E15) would answer *"is Zone broader than District?"* — confidently and meaninglessly. Silent wrong answers in the containment path are the **ADR-0038 failure mode by name**.

### R6 — The scope-dimension amendment carries separately

The `SCOPE_DIMENSIONS` / freeze-row-9 / ADR-0008 amendment gets **its own ADR + Trustee Panel routing note**, recorded here as a **named blocking prerequisite**. ⛔ It does **not** ride in on a directory ruling.

Governance commits precede implementation and commit first (`[[feedback_governance_commits_precede_implementation]]`).

### R7 — The directory attribute set is extensible and Pariwar-selected

> **Pariwar directory attributes are extensible and Pariwar-selected. They are NOT a fixed global list.**

⛔ There is **no** canonical six-row directory schema, and the six rows this session examined are **not** one. They are the rows Story 11a.3 happened to name; they carry no privileged status and must never be re-read as a global default.

A Pariwar Admin **selects** which governed directory attributes apply to their Pariwar. Future Pariwars may select **different attributes and different hierarchies** — including ones that do not exist today — **where an approved substrate exists** for them (R1 category 3). Adding a Pariwar must not require a new fixed schema column, and must not require re-ruling this decision.

⭐ **R7 is the governing principle; R1 is its taxonomy.** Where a later reading of R1–R6 could be taken to imply a fixed set, **R7 controls**.

⚠ **This is the ruling that makes AI-10-4's original framing obsolete.** Its three offered dispositions — *build the attribute*, *narrow the matrix*, *defer the tier* — all presuppose a fixed schema. Under R7 the question is not *which columns exist* but *which attributes a Pariwar may select, and on what substrate*.

---

## 3. Impact Analysis

### 3.1 Epic impact

| Epic | Impact |
|---|---|
| **11a** | 🚨 **Cannot proceed as written.** 11a.1 and 11a.3 both change materially. 11a.1's matrix becomes *tiers + rules*, not *a fixed column list*. 11a.2, 11a.4, 11a.5, 11a.6 unaffected. ⭐ **Under R3(a) the Shikshak-facing rows (1–4) need no new substrate**, so 11a is gated on governance and re-authoring, not on the G4 ADR. ⛔ **AMENDED:** row 2 (`Block`) is nonetheless gated on **G4a** pending its Q4 — see §4.1 |
| **11b** | ⚠ **Affected, previously uncounted.** 11b.1 (Sahyog List — schools/districts/blocks, UX `:1124`) and 11b.6 (In Memoriam — FR-78 school + designation) consume the same attribute model |
| **1 (Story 1.16b)** | ⚠ The PII-scrape CI gate consumes the 11a.1 matrix. The per-Pariwar attribute set is **runtime DB rows**, so the gate cannot scan it. See §3.4 |
| **6 (Story 6.6)** | Recorded, not changed. FR-39's *"district > block > school proximity"* shipped narrowed to `district_cohort_v1`. See §3.5 |
| **10 (Story 10.12)** | Extension target. Additive only |
| **12, 13, 14** | No impact identified |

⛔ **No epic is invalidated. No new epic is required.**

### 3.2 Artifact conflicts

| Artifact | Conflict |
|---|---|
| **PRD** | `:90` signup captures school/district/designation — not built (E6). `:1059` public verifier profiles show designation — no column (E3, E9). `:681` peer selection by block/school — shipped narrowed, never reconciled back (E10, §3.5). `:1098` In Memoriam school + designation |
| **Architecture** | `:1530` Tier-3 line ratified school + designation as plaintext member attributes — **the ruling stands, the storage model changes** (they are Pariwar-specific per R1, not fixed columns). `:1538` — *"CI guards that no Tier 1 field is rendered to a public surface"* — this is the clause the public-tier name row runs into. §2.6 requires the R5 amendment (carried per R6) |
| **UX** | `:1124` Sahyog List assumes schools + blocks available |
| **epics.md** | E7, E8, E10 — all three reconciled under AI-10-2, §4.2 |

### 3.3 Technical impact — the R5 amendment

⛔ **Highest-risk item in this proposal. Carried out of scope per R6; stated here so the ADR inherits a complete brief.**

| Surface | Change |
|---|---|
| `rbac/scope.ts:47` `SCOPE_DIMENSIONS` | Dimensions become hierarchy-qualified. **Architectural freeze row 9** (E14) |
| `schema/role_grants.ts:32` `scope_dimension` pgEnum | Migration required (`CREATE`/`ALTER TYPE`) |
| `rbac/scope.ts:64` `GEO_RANK` | Single global total order → per-hierarchy ordering. **The substantive change** |
| `geo-tree/resolver.ts` `GEO_TREE_NODE_RANK` | Second rank table; `document.ts:148` enforces *parent strictly broader* against it |
| `schema/geo_tree_versions.ts:59` | `GEO_TREE_NODE_DIMENSIONS` frozen tuple |
| **ADR-0008**, **ADR-0038**, Decision `2026-06-11-044` | Amendment / supersede |

⚠ **Preserve fail-closed.** An unknown or cross-hierarchy dimension must **deny**, never compare. The existing pattern is already correct — *"A dimension that cannot be a tree node (`pariwar`) fails closed"* (`geo-tree/resolver.ts:151-153`) — and must be extended, not replaced.

⛔ **This ruling does NOT resolve the `district_admin` deferral (7th, Story 10.18).** That is **rank-order debt**, not tree-shape debt: *"A grant whose ceiling is `state`/`district`/`block` can NEVER satisfy a `pariwar`-dimension check, and NO organizational tree — however complete — changes that."* (`rbac/scope.ts:§RANK-ORDER`). Do not read R5 as unblocking it.

### 3.4 Technical impact — the registry extension (R1, R2)

Vehicle: **extend `pariwar_custom_field_definitions`** (BigDev-selected). Additive; reuses versioning, immutability + `superseded_by_version`, the frozen-key + naked-PII fence, actor attribution, and the 32-per-Pariwar cap.

Required additions:
1. **A directory-visibility declaration** per attribute — `public` / `authenticated_member` / `operator_restricted` / `hidden`. This is what 11a.1's matrix codifies *rules* for.
2. **A category marker** (R1) distinguishing platform-common opt-in from Pariwar-authored.
3. **A hierarchy reference** (R3) — an attribute may declare a parent attribute + hierarchy source. Additive; the flat vocabulary (E18) is preserved for flat attributes.

⚠ **Three honest limits, to be recorded rather than discovered:**

- **The DB mirror gets weaker.** Migration 0088's doctrine — *"an app-layer rule with no DB mirror is a rule that holds only for the callers who happen to go through the app layer."* The 10.12 fence honours it (`pariwar_custom_field_definitions_frozen_key_ck`, 0095). *"This JSONB Zone/Division pair exists in hierarchy version N"* **cannot be a CHECK constraint.** It needs a trigger, or it is app-layer-only. Either way the control is **weaker than the fence beside it** and must say so.
- **The CI gate cannot scan definitions.** Identical to the problem `frozen-governance.ts:20-27` already solved: *"Definitions are DATABASE ROWS, so the gate cannot scan them."* Story 1.16b must be **honestly scoped** — assert what CI *can* prove — and say so in plain words in its README. ⛔ Do not widen a CI gate to read a tenant database.
- **`CUSTOM_FIELD_MAX_ENUM_VALUES = 64` binds** *if* a controlled list is expressed as an `enum`; free-text `string` reintroduces the spelling drift that makes grouping useless. ⚠ **UNVERIFIED:** the actual Shikshak block count was not checked in this session. ⭐ **Under R3(a) this is largely moot for `Block`** — the controlled vocabulary is the in-force geo tree's block nodes, not an enum, so the 64-value cap does not bind it. The limit still binds any flat attribute (`School`, `Designation`) that wants a controlled list.

⚠ **Do not extract a shared hierarchy-validation package.** The new validator will resemble `validateGeoTreeDocument`; coupling a display-default validator to an authority-bearing one is how the R2/R3 separation leaks back. Ship the duplication, record it (`[[feedback_no_premature_package]]`).

### 3.5 Consequence requiring deliberate record — FR-39

FR-39 specifies peer first-witness selection as *"district > block > school proximity."* Story 6.6 shipped it narrowed to a single metric, `district_cohort_v1`, and recorded why (`claim/peer-mesh-metric-registry.ts:4-12`).

**`district_cohort_v1` remains the currently supported posture.** Expansion of the `nearest` metric beyond it — to Block, School, or any other collected attribute — **requires the relevant governed substrate to exist and an R4 promotion decision**, because a display-only attribute steering claim verification would otherwise let a Pariwar Admin's data entry influence peer selection (R2).

⭐ **The extension path is already built.** The metric registry was designed for exactly this: *"richer metrics drop in as NEW registry entries (+ their substrate) WITHOUT touching the pure engine"*, re-tuned *"BY EDITING DATA, NEVER BY BRANCHING IN THE ENGINE"* (`claim/peer-mesh-metric-registry.ts:13-23`). A future `district_block_cohort_v2` is a registry entry plus a promotion ruling — not a re-architecture.

⛔ **Not a defect and not debt.** Recorded here so the current posture is visible and its expansion path is explicit, rather than being rediscovered as a gap.

---

## 4. Detailed Change Proposals

### 4.1 Row dispositions — derived from §2

⛔ **These seven rows are an EXAMINATION of the rows Story 11a.3 named. They are not a schema, not a default, and not a list any Pariwar inherits (R7).**

| # | Row | Category (R1) | Disposition |
|---|---|---|---|
| 1 | **District** | Platform-common | ✅ **Exists.** Derived from `member_postings`. Needs the opt-in layer only |
| 2 | **Block** (any Pariwar that selects it) | Pariwar-specific *enablement* of a **platform-governed relation** (R3(a)) | ✅ **Enable as a collected attribute, governed under `District`**, validated against the in-force geo tree. ⭐ **Uses shipped substrate — does NOT wait on G4.** ⛔ **AMENDED 2026-08-19 — ALSO GATED ON G4a**, pending its **Q4**: Block is tree-validated, so a *Shikshak* restructure orphans a stored value exactly as a Rail one would. §5.4's prohibition therefore already reaches Block. ⛔ **Decision `2026-08-13-103` D5 is NOT superseded** — see 4.1.1. ⚠ Enforcement gap **O8** |
| 3 | **School / Office** | Pariwar-specific | ✅ **Enable as a flat collected attribute**, Tier-3. Controlled-vocabulary question deferred to the story (§3.4 limit 3) |
| 4 | **Designation** | Pariwar-specific | ✅ **Enable as a flat collected attribute**, Tier-3. Added to scope by BigDev at session open |
| 5 | **Zone → Division** (Rail) | **Requires new governed substrate** | ⛔ **BLOCKED** on the R6 ADR (G4) **and** on **O2** being Trustee/architecture-routed. Cannot become an operational member attribute before both land |
| 6 | **Full name** (authenticated) | ⛔ Not a directory-attribute question | **PII posture.** Own routing note — see 4.1.2 |
| 7 | **Public-tier name** | ⛔ Not a directory-attribute question | **PII posture.** Own routing note — see 4.1.2 |

#### 4.1.1 ⭐ Block — why D5 needs no supersede

D5 rules block **not derivable**: a posting gives a district, ancestry walks up, block sits below. Shikshak does not want it derived — it is **explicitly collected and maintained**. These do not collide.

`resolveMemberGeoNode().block` stays permanently `{available:false, reason:'no-member-attribute'}`. The closed five-value union is untouched. **No mechanized contract moves.** Block enters through a different door: the directory-attribute registry, not the geo resolver.

⚠ **One imprecision, recorded and deliberately NOT fixed.** Once Shikshak collects the attribute, the literal string `'no-member-attribute'` is false on its face — the precise meaning is *not-derivable-from-tree*. Changing a closed-union value is a **D6 change requiring a fresh ruling** (`member-geo/types.ts:17`). ⛔ Recorded here; **not** changed by this proposal. `[[feedback_supersede_never_reinterpret]]`.

⚠ **The two-answers hazard.** The geo-tree resolver's own header warns against a value *"quietly becoming a second, competing answer to a question already settled upstream."* Under R2 the two never merge: the resolver answers *what the tree derives*; the registry answers *what the Pariwar collected*. **Separated by signature, and they must stay that way.**

#### 4.1.2 The two name rows — a separate routing note

⛔ **Out of scope for the attribute model. Neither row is a rendering decision.**

Both require decrypting `member_kyc_profiles.name_ciphertext` — Tier-1, KYC-derived (E4). AI-10-4 required a routing note for the public tier; **E5 extends that to the authenticated tier**, which the retrospective did not flag.

Facts for that note:
- ⛔ `architecture.md:1538` — *"CI guards that no Tier 1 field is rendered to a public surface."*
- Story 10.7 ruled *"Tier-1 NOT decrypted in v1"*, mask-by-default, `decryptIfPermitted` as a named seam. ⚠ Its logic was *admin exports others' data* vs 3.11's *member reads own*. **A member browsing peers is neither** — the distinction is untested and must not be assumed to carry.
- ⭐ The rendering is **already solved**: `splitFirstNameLastInitial()` (`packages/domain/src/kyc/name.ts`) is the shipped Story-1.16b PII-shield rule, serving two consumers.
- ⭐ Nothing mechanical blocks a decrypt: `apps/public` already depends on `@twt/domain` (`apps/public/package.json:18`). **This is a policy question, not a wiring one.**

### 4.2 `epics.md` reconciliations (AI-10-2 — narrowed to 11a + 11b, gated inside this session)

⛔ Recorded as **reconciliations, not silent rewrites** (`[[feedback_closure_language_precision]]`).

| # | Locus | Change |
|---|---|---|
| C1 | `:4550` 11a.3 matrix | Fixed six-column matrix → **per-Pariwar attribute set + per-attribute tier declaration**. Fixed rows retained only for platform-common attributes |
| C2 | `:4481` 11a.1 | Matrix codifies **tiers and rules**; the attribute set is **registry data**. Note the 1.16b honest-scoping consequence (§3.4) |
| C3 | `:4477` 11a dependencies | *"Epic 3 (… name + district + block + school)"* → **reconcile**: Epic 3 never owned these (E7); the supplier is the registry extension |
| C4 | `:143` FR-74 vs `:4550` | Contradiction (E10) resolved: public-tier school/designation is a **per-Pariwar tier declaration**, not a global default |
| C5 | `:147` FR-78 vs `:4783` 11b.6 | Same contradiction, same resolution |
| C6 | `:4657` 11b.1 | Record the Sahyog List dependency on the same attribute model (UX `:1124`) |
| C7 | `:3864` Story 10.12 | ⚠ *"the existing `designation` field"* — **factually wrong** (E8). Annotate; ⛔ do **not** edit the shipped story's ruling |
| C8 | `:89` FR-39 | Record §3.5: `district_cohort_v1` is the **currently supported posture**; expansion requires governed substrate + an R4 promotion |
| C9 | 11a.3 + 11b.6 generally | ⛔ Remove any implication of a **fixed global attribute list** (R7). The examined rows are examples, not a schema |

### 4.3 Governance commits required — in order

Per `[[feedback_governance_commits_precede_implementation]]`, these commit **first**, `governance:` prefix, before any implementation.

| Seq | Artifact | Content |
|---|---|---|
| G1 | **Decision `2026-08-19-132`** | R1–R7, including **R3(a)** (`Block` governed under `District`, every Pariwar) and **R7** (extensible, Pariwar-selected, not a fixed list). Next number confirmed: latest is `2026-08-18-131` (`.decision-log.md:37`) |
| G2 | **Trustee Panel routing note** — scope-dimension model | The R5/R6 brief: freeze row 9, the `scope_dimension` enum, ADR-0008 + ADR-0038 amendment, §3.3 |
| G3 | **Trustee Panel routing note** — member-name PII posture | §4.1.2. **Both** tiers. A PII-posture change, not a rendering decision |
| G4 | **ADR** — Pariwar-specific hierarchical scope dimensions | The R5 amendment proper. ⛔ Blocking prerequisite for row 5. ⭐ **Not** a prerequisite for row 2 — R3(a) uses shipped substrate |
| G4a | **Trustee / architecture routing** — hierarchy-version drift (**O2**) | ⛔ **Required before ANY collected hierarchy attribute becomes operational** — ⛔ **AMENDED 2026-08-19**, was *"before `Zone`/`Division`"*, which was **too narrow**. Rules what happens to a stored combination when a published hierarchy version orphans it. Its **Q4** asks the Panel to set the scope: all collected hierarchy attributes, or Zone/Division only. ⛔ **The implementation MUST NOT invent this policy** — see §5.4 |
| G5 | `architecture.md` | §2.7 Tier-3 line — storage model reconciled (ruling stands, mechanism changes); §2.6 cross-referenced to G4 |
| G6 | `epics.md` | C1–C9 |

---

## 5. Implementation Handoff

**Scope classification: MAJOR.** Fundamental replan of Epic 11a's premise; amends a frozen architectural row and two ADRs.

| Recipient | Responsibility |
|---|---|
| **BigDev / Trustee Panel** | G1–G3 **+ G4a**. Ratify R1–R7. ⛔ Nothing downstream starts before G1; ⛔ **rows 2 AND 5 stall until G4a** (amended) |
| **Winston (Architect)** | G4, G5. The R5 amendment brief is §3.3 |
| **John (PM) / BigDev** | G6. Re-author 11a.1 + 11a.3; assess whether the registry extension belongs **in** Epic 11a at all — it is member-attribute substrate, not a public-surface concern, and may deserve its own story or an amendment to the 10.12 line |
| **Amelia (Dev)** | Blocked until G1. Rows 1, 3, 4 unblock at G1 + G5 + G6. ⛔ **AMENDED:** **row 2 (`Block`) additionally requires G4a**; row 5 requires **G4 + G4a**. ⛔ See §5.4 |
| **Murat (TEA)** | Story 1.16b honest re-scoping (§3.4); adversarial cases for R5 cross-hierarchy fail-closed |

### 5.1 Success criteria

1. R1–R7 ratified and recorded; ⛔ **AI-10-4 does not close until G1 lands**.
2. No fixed cross-Pariwar directory schema exists in any artifact, and no artifact implies the examined rows are a default set (R7).
3. `resolveMemberGeoNode().block` unchanged; the closed five-value union unchanged.
4. Cross-hierarchy scope comparison is **structurally impossible**, proven by an adversarial test — not merely absent.
5. `members.custom_fields` remains unreachable from every authority path absent an R4 promotion.
6. C1–C9 landed as reconciliations, with the SD-1 findings visible as findings.
7. ⛔ No orphan/version-drift behaviour exists in code that G4a did not rule (§5.4).
8. `Block` enablement **fails closed** when the in-force hierarchy lacks block nodes — proven by a test, with ⛔ no free-text or unvalidated fallback path anywhere (R3(a)(i)).

### 5.2 Sequencing

```
G1 ──┬── G2 ── G4 ───────────────┐
     │        (G4 unblocks the    ├──> [row 5 operational: Zone/Division]
     │         DIMENSION, not     │
     │         the attribute)     │
     ├── G4a ────────────────────┴┬─> [row 2 operational: Block]  ⛔ AMENDED
     │                            │   needs G4a, NOT G4
     ├── G3 ──────────────────────┴─> [name rows ruled: rows 6, 7]
     │
     └── G5 ── G6 ── [11a.1 / 11a.3 re-authored] ── [11a.1 authoring starts]
                     └─> rows 1, 3, 4 operational
```

⛔ **Story 11a.1 does not start until G1, G5 and G6 land.**
⭐ **Rows 1, 3 and 4 need nothing beyond that.** Shikshak is off the **G4** critical path.
⛔ **AMENDED 2026-08-19 — row 2 (`Block`) waits on G4a**, though not on G4. R3(a) freed it from the *dimension* amendment, not from the *drift* ruling.
⛔ **Row 5 waits on G4 *and* G4a.**

### 5.3 Open items carried, not closed

| # | Item | State |
|---|---|---|
| O1 | Shikshak block count vs `CUSTOM_FIELD_MAX_ENUM_VALUES = 64` | ⚠ **UNVERIFIED** |
| O2 | Hierarchy-version drift — a published version orphans a stored combination | ⛔ **NOT RULED — and ROUTED, not left open.** Becomes **G4a**: Trustee/architecture-routed, required before **any collected hierarchy attribute** becomes operational (⛔ **amended** from `Zone`/`Division` only — G4a Q4 sets the final scope). ⛔ **Implementation must not invent the policy.** See §5.4 |
| O3 | Whether Shikshak's own Block is flat or governed parent-child under District | ✅ **RULED 2026-08-19 → R3(a).** Governed under `District`, for **every** Pariwar. ⭐ Needs no new substrate (`district→block` is a shipped edge kind); ⚠ opens **O8** |
| O4 | Is a nameless directory worth building, if §4.1.2 rules against decryption? | Open — belongs to G3 |
| O5 | `'no-member-attribute'` reason-string imprecision | Recorded; D6 ruling required to change (§4.1.1) |
| O6 | Whether the registry extension belongs inside Epic 11a | Open — §5 |
| O8 | ⚠ **R3(a) is unenforced.** `state→block` is a legal edge today (`schema/geo_tree_versions.ts:56-57`); `validateGeoTreeDocument` would accept a block parented to a state, which R3(a) forbids. An explicit validation rule is required | ⛔ **Must be closed, not assumed.** Belongs to the row-2 story |
| O7 | ⚠ Stale in-code citation, found incidentally while verifying E16: `geo-tree/resolver.ts`'s header cites *"`rbac/scope.ts:236` returns `true` for ANY pariwar grant"* — the line is now **288**. Trivial in itself, but it is the **same drift class** this proposal corrects, in the file that owns the authority path G4 will amend | Recorded, not fixed here |

### 5.4 ⛔ Prohibition — the implementation must not invent the version-drift policy

**Ruled by BigDev, 2026-08-19.**

Hierarchy-version drift (**O2**) — what becomes of a member's stored hierarchy combination when a newly published version orphans it — is a **governance question routed to the Trustee Panel and architecture (G4a)**. It is **not** an implementation detail.

⛔ **AMENDED 2026-08-19: this prohibition is NOT limited to `Zone`/`Division`.** It reaches **every collected hierarchy attribute**, `Block` included — Block is tree-validated under R3(a), so a Shikshak restructure produces the identical orphan. G4a's **Q4** asks the Panel to confirm the scope; until it rules, treat the prohibition as covering all of them.

⛔ **A story author, dev agent or reviewer must NOT choose an orphan policy by writing code.** Specifically, none of the following may appear in the tree before G4a lands:

- silently nulling, dropping or hiding an orphaned combination;
- auto-migrating a stored value to a "nearest" node in the new version;
- treating an orphan as a validation failure that blocks an unrelated member write;
- a version-pin, staleness marker or fallback introduced *"for now"* pending the ruling.

⭐ **Why this is a prohibition and not a preference.** An orphan policy chosen in code is a *de-facto* ruling about whose organizational record survives a restructure — the same class of silent constitutional decision Epic 10 was spent correcting (*"a one-line predicate turned out to be constitutional law"*). Whichever posture G4a selects — typed staleness on the member-geo union discipline, rejecting the publish, or a per-value version pin on the pool-assignment precedent — it must be **ruled first and mechanized second**.

⚠ If implementation reaches a point where *some* behaviour is unavoidable, the correct move is to **stop and route**, not to pick the least-bad default and record it as a note. `[[feedback_record_unattested_no_backfill]]`.

---

*Generated by `bmad-correct-course`, session 2026-08-19. Verified against `adf3c52`. Awaiting BigDev approval.*
