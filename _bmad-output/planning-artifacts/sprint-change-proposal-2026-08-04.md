# Sprint Change Proposal — The Moderation Model (Epic 10 / Story 10.10 follow-up)

- **Date:** 2026-08-04
- **Author:** BigDev (via `bmad-correct-course`)
- **Input artifact:** `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md` (867 lines, raised 2026-08-03)
- **Trigger:** Story 10.10 merged (PR #160, `8d9fcd4`). Design review found the shipped enforcement mechanism makes the Niyamavali's primary restoration path unreachable.
- **Change scope classification:** **Major** — PRD amendment + Niyamavali Part 11 amendments + 7 new stories + 2 story-scope amendments + a frozen-invariant amendment
- **Mode:** Batch
- **Status:** **Approved 2026-08-04 by BigDev, subject to seven conditions — all applied below**

### Conditions of approval (BigDev, 2026-08-04)

| # | Condition | Applied at |
|---|---|---|
| 1 | Rename Story 10.18 to reflect **governance authority**, not RBAC | §4a Story 10.18 (+ framing note), §3.4, §4g |
| 2 | Split Story 10.20 into clearly labelled **workstreams** | §4a Story 10.20 — **WS-A** record structure · **WS-B** schema migration · **WS-C** proportionality safeguards · **WS-D** due-process preconditions · **WS-E** append-only grounds · **WS-F** vocabulary boundary |
| 3 | Add the constitutional sentence — *"Termination is an exceptional governance act, not a stronger suspension."* | §4d (verbatim, §8.6 principle 1) · §4c FR-56 |
| 4 | Add a **suspension vs. termination comparison table** in D5 / Part 8 | §4d — new Niyamavali **§8.4a**, 12 dimensions |
| 5 | State explicitly that violator flags are **detection only, never recommendations** | §4b (iii) Story 10.11 amendment — with prohibited-field list + CI assertion |
| 6 | Keep `member.suspend` **deprecated** during migration, not immediately retired | §4a Story 10.18 · §5 Known residuals |
| 7 | Strengthen the escalation requirement to require **why suspension was inadequate**, not merely why termination was chosen | §4a Story 10.20 **WS-C** (two-part test) · §4c FR-56 · §4d §8.6 · §5 success criterion 5 |

---

## Section 1 — Issue Summary

### 1.1 The defect chain

Story 10.10 enforces suspension by setting `is_valid: false` in the Validity Service payload. Five verified facts compose into a constitutional contradiction:

| # | Fact | Source |
|---|---|---|
| 1 | Suspension sets `is_valid: false` | `packages/validity-service/src/payload.ts:77` |
| 2 | Pool assignability is `is_valid` and nothing else (frozen AI-7-2 invariant) | `apps/jobs/src/assignable-roster.ts:52` |
| 3 | A member off the roster is told they have no pool | `assignable-roster.ts:31-33` |
| 4 | No contribution path exists outside an assigned pool — and a CI fence asserts the absence of one | Story 8.10 |
| 5 | R7(A) restoration = 3 consecutive contributions | Niyamavali §3.1, §8.3; PRD FR-56 `:853` |

**⇒ Every suspension is a de-facto permanent ban until a trustee manually intervenes.** Six of the seven R7 clauses can only be cleared by contributing; all six are unreachable today.

### 1.2 Why this is a rule contradiction, not only a design gap

Niyamavali §3.3 states discipline consequences affect standing and beneficiary eligibility, never the ability to participate: *"A member in lock-in remains a member and may continue to contribute."* The codebase **already honours this for lock-in** — `VALID_STATES = ['lock-in','active','active-in-grace']` keeps a lock-in member on the roster. Story 10.10 did the opposite for suspension.

### 1.3 The shipped enforcement claim is wrong in both directions

`payload.ts:46-48` claims that because the roster reads `isValid`, *"pool assignability, claim eligibility and the rules engine ALL inherit suspension with no code change."* Only the first is true. Claim eligibility runs the human R5/R8 ladder and does not read `is_valid`; the niyamavali engine produces inputs to the payload and does not read it either. The one edit reached the single consumer it should not have, and missed the two it claimed.

### 1.4 The finding widened under analysis

The brief's investigation surfaced nine further decisions beyond the roster defect. Three are load-bearing constitutional gaps that the roster fix does not touch:

- **No source anywhere defines grounds for termination** (D10). Niyamavali Part 8 has §8.2 for suspension and no equivalent section; PRD FR-56 covers recovery only; the code applies **the same 7 reason codes to both sanctions** (`MODERATION_APPLIES_TO = ['suspend','terminate']`). `voluntary-pending-review` can therefore justify termination on the same footing as `r14-forgery`, carrying a 12-month rejoin lock.
- **The discipline lock-in does not exist in the system** (D2/§1e). `lock_in_months` appears only in test fixtures. R7(B)–(F) prescribe 3- and 5-month lock-ins; none is built. The system implements join-time lock-in only.
- **Restoration currently substitutes for unfinished joining discipline** (D8/§1f), creating an incentive to lapse deliberately in order to shorten it — the precise adverse-selection risk that "level playing field" exists to prevent.

### 1.5 Verification findings — three corrections to the brief

Per `[[feedback_verify_before_committing_governance_claims]]`, the brief's load-bearing capability-model claims were checked against live source before being carried into this proposal. Three need correcting, and **all three make D6 cheaper and its early sequencing more clearly right**.

**V1 — `state_trustee` can never satisfy a pariwar-dimension check, and no geo-tree resolver would change that.**
The brief attributes the failure to the missing geo-tree resolver. The actual mechanism is the rank ordering. `packages/domain/src/rbac/scope.ts:56-61` defines `GEO_RANK` as `global:0, pariwar:1, state:2, district:3, block:4` — **`pariwar` is ranked *broader* than `state`**. A state node cannot contain a pariwar target under any resolver, because containment runs high→low. This is decisive: the route "supply a geo-tree resolver so `state_trustee` works" is structurally impossible without re-architecting the scope model. The only viable route is a **pariwar-ceiling role**.

**V2 — the geo-tree deferral marker is stale, and D6 must not absorb it.**
`denyDeeperGeoResolver` (`scope.ts:133-135`, `contains: () => false`) is the only implementation in the repo, and no org-hierarchy table exists in any migration. At least fourteen comment sites in `rbac/roles.ts` and `permissions.ts` defer geo containment **"to Epic 3"** — and Epic 3 is fully `done` (3.1–3.12). The pointer has been stale since Epic 3 closed. This is a real accumulating debt across 6.7, 10.3, 10.4, 10.10, `cycle.freeze` and `claim.appeal_vote` — but it is **separate from and larger than D6**, and scoping it into the Trustee-capability story would convert a cheap early unblock into a long one. Re-point the markers; do not merge the work.

**V3 — the Niyamavali does not define a "Trustee Panel."**
D10 principle 2 assigns the sanction decision to the *Trustee Panel*. Part 8 names *"a State Trustee"* (§8.2), *"Trustee discretion"* (§8.3) and *"explicit Trustee reinstatement"* (§8.4). Part 9 Stage 2 names a *"State Trustee panel"* for claim appeals. There is no `trustee_panel` among the 12 seeded roles (`rbac/roles.ts:30-42`). **D10 principle 2 introduces new governance vocabulary that Part 8 must define before the capability model can represent it** — which is exactly why D6 gates D10, and why the governance amendment must precede the code.

**V4 — the appealability claim is already asserted in shipped code.**
`packages/domain/src/member/moderation/status.ts:17` justifies the suspend-before-terminate routing on the grounds that suspension is *"itself notified, audited and **appealable**"*, and `handlers.ts:228` cites Decision 6's *"reach the appeal CTA."* `appeal-eligibility.ts` is entirely claim-scoped and Part 8 never references Part 9. The D10 principle-8 gap is therefore **a live unbacked claim in shipped rationale**, not merely a future absence.

---

## Section 2 — Impact Analysis

### 2.1 Epic impact

| Epic | Status | Impact |
|---|---|---|
| **Epic 10** (host) | 10.1–10.10 `done`; 10.11–10.15 `backlog` | Epic **cannot be completed as planned**. 7 new stories; 10.11 scope reframed; 10.10 gains a retro-note. Epic FR list gains FR-56A. |
| **Epic 7** (pool) | done | The **frozen AI-7-2 invariant is amended** — assignability stops being `is_valid` alone. Recorded as an amendment, not a violation: the roster still reads a single pre-derived field, which is what AI-7-2 exists to protect. Requires a replay-determinism pin. |
| **Epic 4** (Validity Service) | done | `MemberValidityPayload` gains `is_assignable`; contracts DTO + OpenAPI regenerate. Cache unaffected (`0036:106` already invalidates on `member.%`). |
| **Epic 1** (RBAC) | done | New pariwar-ceiling role + `PERMISSION_CATALOG_VERSION` 28 → 29. Stale "deferred to Epic 3" markers re-pointed. |
| **Epic 8** (contribution) | done | Behaviour newly switches on: suspended members receive contribution alerts (8.8) and their contributions render green (8.6). Copy reconciliation required. |
| **Epic 3** (member lifecycle) | done | **No change** — D2-a keeps the discipline lock-in as an overlay, so `members.state` and the lifecycle machine are untouched. Story 3.11's export is member-portal-scoped, which is what creates the D5 off-portal gap. |
| **Epic 6** (claims) | done | Appeal machinery (6.16) is claim-scoped and is **not** reusable as-is; the moderation appeal is a distinct journey. |
| **Epics 11a / 11b / 12** | backlog | No impact. |

**Resequencing required.** Two changes to the intended order:
1. **D6 must precede the D10 record model** (user directive 2, confirmed by V3 — the governance body must be defined before it can be granted).
2. **D4 must ship with or before D3**, not after it as the brief's §5 sequence has it. The moment the roster unblocks, suspended members start receiving contribution requests with no coverage and no explanation. Shipping D3 without D4 creates the exact harm D4 exists to prevent, for a bereaved family.

### 2.2 Story impact

| Story | Change |
|---|---|
| **10.10** (done) | Retro-note only. Not reopened — its audit, event, notice, RTBF-scrub and RLS work is correct; one derivation line is wrong. |
| **10.11** (backlog) | **Scope input, per user directive 3.** ESCALATION 2's "phantom queue" resolves constructively: the aggregation target is D1's violator-flagging mechanism. 10.11 aggregates it; it does not invent it. |
| **10.16–10.22** | Seven new stories (§4a). |

### 2.3 Artifact conflicts

| Artifact | Conflict |
|---|---|
| **PRD** | FR-56 states suspension grounds but no termination grounds; says nothing about roster/contribution obligation during suspension. FR-9 (R7) carries the R7(A)/(B) populations D8 supersedes. FR-8 is join-scoped and must not be reused for restoration discipline. FR-95/96 are portal-scoped and do not survive termination. |
| **Niyamavali** | Part 8 has no termination-grounds section, no Trustee Panel definition, no appeal reference, no non-subsumption principle. §3.1 documents only R7(A)–(E) while (F)/(G) are seeded and shipped. §2.2 says `[[15 days]]` where FR-8 and the seeded policy say 30. All are **Part 11 amendments**. |
| **UX** | No disclosure copy for contributing-without-coverage. Termination notice is not self-contained. MemberStatusPanel (`:1893`) renders an "Appeal this decision" CTA with no moderation destination. The suspended-and-contributing *combination* is unrendered (`presenter.ts:81-91` — the largest exposure, and it is copy, not code). |
| **Architecture** | Owns the overlay's states/transitions/events and the auth-path overlay read. Does **not** own grounds/thresholds/eligibility — those are PRD + Niyamavali, per `[[feedback_architecture_vs_prd_boundary]]`. |
| **Other** | `.decision-log.md` entries for each ratified decision; `deferred-work.md` re-pointing of the stale Epic-3 geo markers; a `docs/` governance reference as the permanent home for the principles (§5a's own note). |

### 2.4 Technical impact

- **Tier 1 (the unblock)** — 5 files, ~1 real logic line: `payload.ts:77` + `:290`, `types.ts:167`, `contracts/validity.ts:111`, `emit-openapi.ts`, `assignable-roster.ts:52` + its frozen-invariant doc block.
- **Tier 2 (behaviour switching on)** — pool spawn comment; 8.8 alerts to suspended members (*this is the cure working*); 8.6 yogdaan green-beside-suspension; `presenter.ts` combination.
- **Tier 3 (replay determinism)** — `assignable-roster.ts` promises byte-identical re-spawn from a frozen `committed_at`. Nothing diverges yet (10.10 shipped 2026-08-03; no moderation event predates any frozen cycle) — **pin it with a test before that stops being true.**
- **Tier 4 (verified NOT affected)** — validity cache, redaction, peer mesh, news audience, claim eligibility, the five `TERMINAL_STATES` sets.

---

## Section 3 — Recommended Approach

### 3.1 Options evaluated

| Option | Verdict |
|---|---|
| **1 — Direct Adjustment** | **VIABLE, CHOSEN.** The defect is one derivation line; everything around it is sound. New stories fit inside Epic 10's existing structure. Effort High (7 stories), Risk Low-Medium. |
| **2 — Rollback 10.10** | **NOT VIABLE.** 10.10 shipped substantial correct work — append-only action table with RLS/FORCE/CHECK policy-regression specs, Tier-1 rationale encryption, migration 0092 RTBF scrub, notice delivery, step-up gating, session cascade. One line is wrong. Rollback discards ~7,885 reviewed lines to fix it. Effort High, Risk High, benefit negative. |
| **3 — MVP scope reduction** | **PARTIAL, FOLDED IN.** MVP is not invalidated: moderation stays v1. But two items are compliance-shaped and need an explicit v1 call rather than silent inclusion — see §3.3. |

### 3.2 Chosen path — Hybrid (Option 1 primary, with a scoped MVP call)

Direct adjustment: amend PRD + Niyamavali + UX, add 7 stories inside Epic 10, amend the AI-7-2 invariant with a replay pin, and reframe 10.11.

**Rationale.** The defect is narrow and the surrounding work is sound, so rollback is pure loss. The constitutional gaps the review surfaced (no termination grounds, no appeal, no discipline lock-in) are real and pre-existing — they were exposed by this review, not caused by it, and they do not become cheaper by deferring. Sequencing the roster unblock first restores Niyamavali compliance in one small, well-fenced change; the larger governance work then proceeds without a live contradiction sitting in production.

### 3.3 MVP calls requiring explicit ratification

Two items should be decided consciously rather than absorbed:

1. **Moderation appeal (10.22)** — Deed Clause 26 requires natural justice, Part 9 Stage 1 requires a different reviewer, and shipped code already *claims* appealability (V4). Recommended: **v1-blocking if termination is enabled at launch**; deferrable only if termination is switched off for v1.
2. **Off-portal DPDPA access (10.21)** — gated on the first termination, not on launch date. Recommended: **must land before the first termination is permitted**, enforced as a release gate rather than a calendar date.

Neither is a scope reduction to the roster fix; both are conditions on enabling termination.

### 3.4 Sequencing

| # | Story | Why here |
|---|---|---|
| 0 | Ratify §1d + D8 + D9 + D7 (Niyamavali, no code) | Governs everything below; D9 needs no code change and can run in parallel |
| 1 | **10.16** — Contribution-during-suspension disclosure (D4) | **Co-requisite of 10.17.** Must not lag the roster unblock |
| 2 | **10.17** — Moderation roster unblock (D3, Tiers 1–3) | Closes the live constitutional contradiction |
| 3 | **10.18** — Constituting the Trustee Panel as a sanctioning authority (D6) | **Gates 10.20.** Cheap per V1/V2 — sequence early, as directed |
| 4 | **10.19** — Termination ends membership privileges (D5) | Closes ESCALATION 3, a live open harm |
| 5 | **10.20** — Moderation record model (D10) | Needs 10.18 |
| 6 | **10.21** — Off-portal DPDPA access (D5 req. 1) | Release gate on enabling termination |
| 7 | **10.22** — Moderation appeal mechanism (D10 p8) | Retires the unbacked appealability claim |
| 8 | **10.23** — Restoration discipline lock-in (D2) | Largest build; constrained by §1d/D8 |
| — | **10.11** amended (violator flagging) | Consumes D1's mechanism |

> **Note on 10.23.** D2 is sequenced last by dependency, not by importance — it is constrained by D8's independence constraint (which must ratify first) and is the largest single build. It is not optional: §3.1 prescribes the lock-ins independently of everything above.

---

## Section 4 — Detailed Change Proposals

### 4a — `epics.md`: seven new stories (Epic 10)

Inserted after Story 10.15, numbered in **execution order**. Each cites the decision it discharges.

---

**Story 10.16: Contribution-During-Suspension Disclosure `[SURFACE]`** *(D4)*

> As a member who is suspended and being asked to contribute,
> I want the payment surface to tell me plainly what this payment does and does not buy,
> So that I am never asked for money under a misapprehension about my own coverage.

**AC (Given/When/Then):**
- **Given** D4-a + `docs/tone-guide.md` + §4.5 no-shortfall-framing discipline
  **When** a member with `moderationStatus === 'suspended'` (or an active restoration-discipline lock-in) is rendered a contribution request
  **Then** the surface renders, on the payment surface itself and not in a status panel: *"Contributions made during suspension restore standing but do not create beneficiary entitlement for deaths occurring during the suspension period."*
  **And** it states what the payment does, what it does not buy, and how many contributions remain in the restoration package
- **Given** the disclosure applies to **both** instruments
  **When** a member is in a discipline lock-in rather than suspension
  **Then** the equivalent disclosure renders — a locked-in member contributes without coverage and is equally entitled to know
- **Given** `packages/ui/src/member-status/presenter.ts:81-91`
  **When** the suspended-and-contributing combination renders
  **Then** the headline logic is unchanged (it reads `specialFlags`) and the new *combination* is explicitly covered by a render test, not only a view-model test
  *(10.10's second review pass found AC9's prose reached nobody because tests asserted the view-model and never the render — do not repeat it)*

**Dependency:** must land **with or before 10.17**. `[GATE]` — 10.17 must not deploy without it.

---

**Story 10.17: Moderation Roster Unblock — Suspension Keeps the Donor Roster `[SURFACE]`** *(D3 + §4 Tiers 1–3)*

> As a suspended member with an available restoration path,
> I want to remain on the donor roster so I can make the contributions that restore me,
> So that the Niyamavali's primary restoration path is actually reachable.

**Principle to record in the story (this is the *why*, and it must be explicit):**
> A suspension removes a member's **entitlement to receive support**, not their **obligation to contribute** toward the Pariwar while completing an available restoration path.

**AC:**
- **Given** D3 + Niyamavali §3.3
  **When** the assignability predicate is derived
  **Then** `is_assignable = VALID_STATES.includes(state) && moderationStatus !== 'terminated'` — a **single predicate, no reason-code branching**
  **And** `is_valid` keeps its current meaning (coverage; suspended → false); only the roster switches fields
- **Given** the AI-7-2 frozen invariant
  **When** `apps/jobs/src/assignable-roster.ts:52` reads the new field
  **Then** the roster still reads **one pre-derived field** — no eligibility logic enters `apps/jobs`, which is what AI-7-2 exists to protect
  **And** the frozen-invariant doc block at `:43-48` is rewritten, and this is **recorded as an amendment to AI-7-2, not a violation**
- **Given** Tier 1 (5 files)
  **Then** `payload.ts:77` adds `deriveIsAssignable` wired at `:290`; `types.ts:167` and `contracts/src/members/validity.ts:111` add the field; OpenAPI regenerates with corrected prose
- **Given** Tier 3 replay determinism
  **When** the predicate changes
  **Then** a test **pins** byte-identical re-spawn from a frozen `committed_at`. Nothing diverges today (no moderation event predates any frozen cycle) — the pin exists so that stays true
- **Given** Tier 2
  **Then** pool-spawn comments, 8.6 yogdaan status and 8.8 alert copy are reconciled: a suspended member receiving a contribution alert **is the cure working**, and the copy must say so

**Depends on:** 10.16 (`[GATE]`).

---

**Story 10.18: Constituting the Trustee Panel as a Sanctioning Authority `[GOVERNANCE]`** *(D6 — prerequisite for 10.20)*

> As the Trustee Panel named by the Niyamavali as the body that determines moderation sanctions,
> I want the Trust's governing instruments to constitute me as an authority the system can recognise,
> So that the governance document does not describe an authority the system cannot express.

> **Framing.** This story is **not an RBAC task**. Its subject is *who holds the authority to sanction a
> member*, and the permission key is the last and smallest step in expressing that. The governance
> work — defining the body in Part 8, establishing its composition and scope, and settling that it is
> a **Pariwar-level governing body rather than a geographic office** — is the substance. A role bundle
> that preceded that definition would be a capability without a constituted holder.

**AC:**
- **Given** V3 — Part 8 names *"a State Trustee"* / *"Trustee discretion"* and never defines a **Trustee Panel**
  **When** the capability work begins
  **Then** the **Niyamavali Part 8 amendment defining the Trustee Panel lands first** (§4d) — the body is defined in governance before it is granted in code
- **Given** V1 — `GEO_RANK` ranks `pariwar`(1) broader than `state`(2), so a state-ceiling grant can never contain a pariwar target under **any** resolver
  **When** the role is modelled
  **Then** a **pariwar-ceiling** role is introduced (`trustee_panel`, `scopeCeiling: 'pariwar'`) holding `member.moderate`
  **And** the story records explicitly that supplying a geo-tree resolver would **not** have solved this — the constraint is the rank ordering, not the missing resolver
- **Given** V2 — the geo-tree resolver is absent and its "deferred to Epic 3" markers are stale (Epic 3 is `done`)
  **Then** this story **does NOT build the geo-tree resolver.** It re-points the stale markers to a named successor item and leaves the resolver deferred
  **And** the ~14 marker sites in `rbac/roles.ts` / `permissions.ts` are updated so the deferral is honestly addressed
- **Given** `PERMISSION_CATALOG_VERSION = 28`
  **Then** the catalog bumps 28 → 29 with the seeded role
- **Given** `member.suspend` is superseded by `member.moderate`
  **Then** it is marked **`deprecated`, NOT removed**, for the duration of the migration. Concretely: the key stays in the catalog and stays enforceable; **existing grants continue to be honoured**; **no new grants** are issued against it; every declaration site carries a deprecation note naming `member.moderate` as its successor; and a CI assertion fails if a new grant appears
  **And** removal is a **separate, later catalog bump**, taken only once no live grant references it — never bundled into this story
  **Rationale:** retiring a key while grants may still reference it converts a governance migration into an access outage. Deprecation makes the supersession legible without making it abrupt
- **Given** the epic's own drafting
  **Then** `epics.md:3540`'s *"As a State Trustee with `member.moderate`"* is corrected (§4b)

**Gates:** 10.20.

---

**Story 10.19: Termination Ends Membership Privileges `[SURFACE]`** *(D5 — dissolves ESCALATION 3)*

> As the Trust,
> I want termination to end authenticated member access rather than leave an expelled person with a live portal account,
> So that ESCALATION 3's write access closes at its root instead of being patched at five gates.

**AC:**
- **Given** D5's principles (§4d)
  **When** a member is terminated
  **Then** login is blocked. Moderation is an **overlay, not a lifecycle state**, so this adds an **overlay read to the auth path** at `member-auth.handlers.ts:71` — not a string added to a set
  **And** the block is **timing-equalised** exactly like the existing withdrawn block (P6, `:77`), or the response-time difference becomes a membership-enumeration oracle
- **Given** ESCALATION 3
  **Then** the five `TERMINAL_STATES` sets are **untouched** — with no authenticated session there is no write path to gate. No AC5 deviation is required
- **Given** `revokeAllMemberSessions` already runs on suspend and terminate
  **Then** this closes the half where revocation did not block re-login
- **Given** requirement 2 — the notice **is** the explanation
  **Then** the termination notice is **self-contained**: Decision · Ground · Summary · Effective date · Further communication. No portal dependency, no deep link
  **And** the Summary is member-facing prose **derived from** the Decision Note — never the Tier-1 Decision Note verbatim, which may carry detail that must not ride SMS or WhatsApp
- **Given** requirement 3
  **Then** **suspension is unaffected** — a suspended member retains login; they are curing, they need the contribution surface, and 10.16's disclosure lives there
- **Given** Decision 6's basis is removed (its justification was reaching an appeal CTA that does not exist — V4)
  **Then** the story records Decision 6 as superseded

---

**Story 10.20: Moderation Record Model `[PRIMITIVE]`** *(D10)*

> As a Trustee Panel recording a moderation decision,
> I want the record to separate the ground, the facts, and the proportionality reasoning,
> So that a decision can be reconstructed, tested against the principles, and enriched without being rewritten.

This story carries six distinct concerns. They are labelled as **workstreams** so they can be
sequenced, reviewed and — if capacity requires — split into separate stories along these lines
without re-cutting the scope. **WS-B is the only one that touches the schema**; WS-A/C/D/E/F build on
it. WS-F is data and copy only.

---

**WS-A — Record structure.** *What a moderation record must contain.*

- **Given** D10's three separable parts
  **Then** the record carries: **(1)** reason code(s) — structured, exactly one **primary**, any number of supporting; **(2)** **Decision Note** — prose, governance-grade, always required; **(3)** **evidence** — *references only, never free text* (complaint #, investigation #, helpdesk ticket, document IDs, external order number)
- **Given** reporting and analytics must stay tractable while a case reflects its real complexity
  **Then** exactly one ground is **primary**; supporting grounds are unbounded in number

---

**WS-B — Schema migration.** *One migration, bundled deliberately.*

- **Given** the migration
  **Then** it adds `escalation_justification` + `evidence_refs` + primary/supporting grounds **and renames `rationale` → `decision_note`**
- **Given** `rationale` ships with Tier-1 encryption, a decrypt endpoint and an RTBF scrub (migration 0092)
  **Then** **the rename is bundled here, not taken standalone** — a standalone rename would re-do all four of those surfaces for no functional gain
- **Given** `[[project_live_db_test_gotchas]]`
  **Then** the migration is authored fresh — never a regeneration of an applied migration

---

**WS-C — Proportionality safeguards.** *What makes principles 3–5 testable rather than aspirational.*

- **Given** principles 3 and 5
  **Then** an **escalation justification is mandatory when `action === 'terminate'`**
- **Given** that a justification naming only the seriousness of the conduct would restate the ground rather than test the escalation
  **Then** the field's requirement is stated as a **two-part test**, and both parts are required:
  > **(a) Why suspension is inadequate** — the decision-maker must record why the lesser sanction cannot meet the case: what suspension would fail to protect, what risk would persist through it, or why the restoration path it preserves is unavailable or futile.
  > **(b) Why termination is proportionate** — why the chosen sanction fits the conduct.
  **And** part (a) is **not satisfied** by asserting the seriousness of the ground, by citing the reason code, or by restating (b). The form and the copy must make the two parts separately answerable, and neither may be pre-filled from the other
  **Rationale:** *"the conduct was grave"* explains the ground, not the escalation. Requiring the decision-maker to confront the lesser sanction on its own terms is what makes principle 3's "final measure" test operative — it forces the comparison the principle exists to compel
- **Given** principle 4
  **Then** terminating on a ground with an available restoration path requires a recorded justification. `contribution.r7a_restorations_used >= 2` already evidences genuine exhaustion, so this is checkable from data rather than assertion

---

**WS-D — Due-process preconditions.** *Principles 6–7, without inventing a state.*

- **Given** principles 6–7
  **Then** a dwell/notice precondition is added in `nextModerationStatus`'s **caller** — a new precondition, **not a new state**
- **Given** today's behaviour
  **Then** the story records what it corrects: `nextModerationStatus('suspended','terminate')` returns `'terminated'` unconditionally, so two API calls seconds apart terminate a member — and because the suspension notice is a best-effort post-commit job, **termination can precede its own notice**

---

**WS-E — Append-only grounds.** *History is enriched, never rewritten.*

- **Given** the operational act of appending a finding
  **Then** `member_moderation_grounds` is keyed to `moderation_action_id`, carrying code · primary flag · added_by · added_at · note · evidence refs
  **And** codes may be **added, superseded, or corrected by a further append-only record** — never edited or removed. A later finding **attaches to** the original action; it does not alter it
- **Given** the worked example
  **Then** a member suspended for forgery whose police report later concludes identity theft gains `identity-fraud` as an **appended supporting ground**, attributed and reasoned — with the original action, its primary ground and its Decision Note untouched

---

**WS-F — Vocabulary boundary.** *Data and copy only; no engine change.*

- **Given** principle 2 and `[[project_niyamavali_precedence_is_provenance]]`
  **Then** **do not hard-narrow `appliesTo`.** It stays `['suspend','terminate']`; add **guidance** metadata (`ordinarilyResultsIn: 'suspend'`) the admin UI surfaces. If the Trustee Panel determines the sanction, the registry must not pre-empt it
- **Given** the ratified operational/governance vocabulary split
  **Then** `reason-codes.ts`'s frozen code-level vocabulary **stays as shipped**; what is added is the append-only grounds record beneath it. Creating a **new** reason code remains a Part 11 amendment → registry version → trustee approval → audit → publication. **Never a runtime mint path**
- **Given** `[[feedback_no_premature_package]]`
  **Then** build it **moderation-only**. Keep the grounds record subject-agnostic in its columns so it *could* generalise, name it in the story as a recognised future extraction point, and extract only when a second discipline surface actually exists

**Depends on:** 10.18.

---

**Story 10.21: Off-Portal DPDPA Access `[SURFACE]`** *(D5 requirement 1)*

> As a terminated member with no portal account,
> I want an identity-verified route to my statutory data rights,
> So that ending membership does not silently end rights the DPDPA guarantees.

**AC:**
- **Given** Niyamavali Part 10 guarantees access, correction, portability and erasure, and Story 3.11's export is a **member-portal** feature
  **When** a terminated member exercises a statutory right
  **Then** an **identity-verified helpline/helpdesk route** delivers access, correction, portability and erasure without a standing authenticated surface
- **Given** the D5 principle promises a **process, not a portal**
  **Then** the route is administrative and identity-verified; it does not reinstate authenticated access
- **Given** Epic 10's helpdesk subsystem
  **Then** the route reuses the 10.1 helpdesk substrate rather than inventing a parallel intake
- **Given** `[[project_consent_subject_key_convention]]`
  **Then** subject-scoped reads are **member-scoped**, not artifact-scoped

**Release gate:** must land before the first termination is permitted (§3.3).

---

**Story 10.22: Moderation Appeal Mechanism `[SURFACE]`** *(D10 principle 8)*

> As a member who has been suspended or terminated,
> I want a route to challenge the decision,
> So that the appealability the system already claims is actually true.

**AC:**
- **Given** V4 — `moderation/status.ts:17` already asserts suspension is *"notified, audited and appealable"* and `handlers.ts:228` cites reaching an appeal CTA
  **When** this story ships
  **Then** that claim becomes true, and the unbacked comments are corrected
- **Given** `appeal-eligibility.ts` is entirely claim-scoped (`claims`, `claimVerifierDecisions`, `claimStateTrusteeDecisions`, `claimR9Votes`; *"exactly one journey per claim, ever"*) and Part 8 never references Part 9
  **Then** the moderation appeal is a **distinct journey** — Epic 6's machinery is a pattern reference, not a reusable path
- **Given** Deed Clause 26 natural justice and Part 9's Stage-1 discipline
  **Then** the appeal is heard by a **different individual** from the original decision-maker, with notice, a fair hearing and a reasoned outcome
- **Given** UX `:1893`'s existing "Appeal this decision" CTA
  **Then** the CTA acquires a real moderation destination
- **Given** D5
  **Then** the appeal is reachable **off-portal** for a terminated member (reusing 10.21's route) — the appeal must not depend on the access termination removes

---

**Story 10.23: Restoration Discipline Lock-In `[PRIMITIVE]`** *(D2 — the largest missing piece)*

> As the Trust enforcing R7(B)–(F),
> I want the 3- and 5-month restoration lock-ins to exist in the system,
> So that §3.1's prescribed restoration packages are more than seeded data.

**AC:**
- **Given** §1e — `lock_in_months` appears **only** in test fixtures and no production code consumes it
  **When** the instrument is built
  **Then** **D2-a: a second overlay**, mirroring the shipped moderation overlay. The `lock-in` *lifecycle state* stays join-only; the overlay carries `imposed_at` + duration + policy version, folds into `is_valid` (coverage), and is **ignored by the roster**
  **And** D2-b (an `active → lock-in` lifecycle transition) is rejected — it carries the Decision-1 defect: expiry cannot know which state to return to, so a member locked from `active-in-grace` cannot be routed back
- **Given** §1d and D8 — joining and restoration discipline are **independent instruments that run concurrently**
  **Then** the overlay tracks them **separately, with separate expiry**. One clock must never absorb or shorten the other. Design the overlay to hold **both**, not one
- **Given** the FR-8 pattern
  **Then** duration comes from a **new restoration-discipline policy clause** in the registry, resolved and **version-pinned at imposition**. **Do not reuse `lock_in_days_at_join`** — that field is join-scoped by name and semantics
- **Given** D8 consequence 3 and `[[project_engine_never_infers_contribution_facts]]`
  **Then** a new fact `member.joining_discipline_state` is **sourced from the validity payload**, never derived inside the rule engine. Low cost — the payload already carries `lockInStatus.state`
- **Given** 10.16
  **Then** the disclosure applies to locked-in members too

---

### 4b — `epics.md`: amendments to existing stories

**(i) Story 10.10 — retro-note** *(append after `:3551`)*

```
> **Retro-note (2026-08-04, Sprint Change Proposal).** This story's suspension enforcement
> (`is_valid: false`) made the Niyamavali's primary restoration path unreachable — `is_valid` is
> also the sole pool-assignability predicate, and pool assignment is the only contribution path.
> Corrected by Story 10.17. The enforcement-scope claim at `payload.ts:46-48` is also wrong:
> claim eligibility and the niyamavali engine do NOT read `is_valid`. Stories 10.16–10.23 carry
> the full model. ESCALATION 1 → 10.18 · ESCALATION 2 → 10.11 (below) · ESCALATION 3 → 10.19.
```

**(ii) Story 10.10 — actor correction** *(D6 / V1)*

- **OLD** (`:3540`): `As a State Trustee with `member.moderate` permission,`
- **NEW**: `As a member of the Trustee Panel with `member.moderate` permission,`
- **Rationale:** `state_trustee`'s `state` ceiling can never satisfy a `pariwar`-dimension check — `GEO_RANK` ranks `pariwar` broader than `state`, so no geo-tree resolver would fix it. The epic's actor was the drafting error. Corrected by 10.18.

**(iii) Story 10.11 — scope amendment** *(user directive 3; resolves ESCALATION 2)*

- **OLD** (`:3563`): `... reconciliation review queue items (Story 9.8) at trustee's scope, moderation pending items (Story 10.10)`
- **NEW**: `... reconciliation review queue items (Story 9.8) at trustee's scope, and **moderation violator flags (Story 10.17's D1 surfacing mechanism)**`
- **Plus a new AC:**
  > **Given** D1 — the human gate stands and nothing auto-suspends, but nothing surfaces suspension **candidates** either
  > **When** the signals view aggregates moderation items
  > **Then** it renders **violator flags** — members in R7 violation, detected automatically and presented for trustee action. **The system detects and presents; the trustee decides and acts.**
  > **And** a violator flag is **DETECTION ONLY — never a recommendation.** It states a fact that is true of the member's record and stops there. Specifically it MUST NOT: propose or name a sanction; carry a `recommended_action`, `suggested_outcome` or equivalently-named field; rank, score or sort members by inferred severity or "urgency of action"; pre-select an action in any downstream moderation form; or use verbs of advice ("should be suspended", "action required", "overdue for review") in its copy. The permitted content is the **clause in violation, the facts establishing it, and the date from which it has held.**
  > **And** a CI assertion pins this: the flag's payload contract carries no recommendation-shaped field, and the moderation form's action selector is never pre-populated from a flag
  > **Rationale:** a flag that recommends is a soft auto-suspend — it relocates the decision from the trustee to the detector while preserving the appearance of a human gate. D1's ratified position, and the four standing no-auto-suspend prohibitions (`ux-design-specification.md:123,203,1066`; `docs/fallback-handler-ledger/README.md:67`; `epics.md:4089`), are prohibitions on the **decision moving**, not merely on the API call firing automatically. Detection is automated; the sanction, and the reasoning toward it, are not.
  > **And** the story records that Story 10.10 defines no pending/queue concept and none is invented here — moderation items carry no deadline and no severity, so the `deadline-proximity` sort and `severity` signal at `:3564` **do not apply to the moderation rows** and must degrade explicitly rather than render empty. **Note this is reinforced by the detection-only rule**: a severity score on a moderation row would itself be a recommendation.
- **Rationale:** ESCALATION 2 is not "a queue we forgot to build" but "discretionary suspension needs a candidate-surfacing mechanism, and that mechanism is what 10.11 should aggregate." Reframes 10.11's scope rather than blocking it.

**(iv) Epic 10 header** *(`:3363`)* — add `FR-56A (moderation model: termination grounds, record model, appeal, restoration discipline)` to the FR list.

---

### 4c — PRD amendments

**(i) FR-56 — replace the section** (`prd.md:847-855`)

- **OLD:** `State transitions: active ↔ suspended → terminated. Restoration paths are governed by Niyamavali (R7, R14).` + three consequence bullets.
- **NEW:** retain the existing text and consequences, and add:
  ```
  **Suspension preserves the obligation to contribute.** A suspension removes a member's
  entitlement to RECEIVE support, not their obligation to CONTRIBUTE while completing an
  available restoration path. Suspended members remain on the donor roster; only termination
  removes. (Niyamavali §3.3; the restoration path requires ongoing contribution.)

  **Contributions during suspension do not create entitlement.** Disclosed on the payment
  surface: contributions made during suspension restore standing but do not create beneficiary
  entitlement for deaths occurring during the suspension period.

  **Termination is an exceptional governance act, not a stronger suspension.** It carries its own
  threshold, its own reasoning and its own record. Grounds, principles and the record model are
  governed by Niyamavali Part 8 (as amended) — including the suspension-vs-termination comparison
  at §8.4a. Termination ends authenticated member access; statutory rights survive through an
  identity-verified administrative process.

  **Termination requires a two-part escalation justification.** The decision-maker must record
  BOTH why suspension is inadequate to the case AND why termination is proportionate. The first
  is not satisfied by asserting the seriousness of the ground.
  ```
- **Rationale:** FR-56 today states suspension grounds and no termination grounds, and is silent on roster/contribution obligation — the two omissions that produced this defect.

**(ii) FR-9 — R7 population note** (`prd.md:~343`)

- **ADD:**
  ```
  **Restoration never substitutes for joining discipline (D8).** R7(A) and R7(B) apply only
  while the original joining discipline remains incomplete. The v1 populations
  (`total_count < 10`; `ever_contributed == false`) are implementation proxies, not the
  constitutional definitions — a lifetime contribution count is not a joining-discipline state.
  Superseded by the Niyamavali §3.1 amendment.
  ```
- **Rationale:** §1f — the current reading lets a member shorten a 12-month joining discipline to ~8 months by lapsing deliberately, inverting its purpose.

**(iii) FR-8 — scope fence** (`prd.md:~334`)

- **ADD:** `**Scope fence.** `lock_in_days_at_join` is join-scoped by name and semantics. Restoration discipline (R7(B)–(F)) uses a SEPARATE registry policy clause, version-pinned at imposition. The two clocks run concurrently and never absorb one another.`

**(iv) FR-95/96 — off-portal carve-out** (`prd.md:1209-1220`)

- **ADD:** `**Terminated members.** FR-95's export and FR-96's RTBF are member-portal features. Termination ends authenticated access, so these rights are exercised for terminated members through an identity-verified administrative route (Niyamavali Part 10; Story 10.21).`

---

### 4d — Niyamavali amendments (all **Part 11**, legal-counsel-reviewed per §1(a)/(c))

| # | Section | Amendment | Source |
|---|---|---|---|
| 1 | **New §3.0 (or Part 8 preamble)** | **Non-subsumption principle**: *"Every restoration mechanism must require the member to satisfy all outstanding obligations independently. No restoration package may reduce, replace or subsume any other outstanding governance obligation unless this Niyamavali explicitly states that it does."* | §1d |
| 2 | **§3.1** | Define the intended governance populations for **R7(A)/(B)** by joining-discipline state, not lifetime contribution count | D8 |
| 3 | **§3.1 + Appendix A** | Document **R7(F)** (6–11 months) and **R7(G)**; record **12 months** as the ratified R7(C) threshold so it can drop `provisional: true`. **No code change** — the registry already seeds both | D9 (agreed) |
| 4 | **§8.2** | Either authorise `regulator-action` and `voluntary-pending-review`, or retire them. They ship today with **no §8.2 anchor** | D7.2 |
| 5 | **§2.2** | Resolve `[[15 days]]` vs FR-8's and the seeded policy's **30 days**. Part 11 pins each member's obligations to the version they accepted, so this drift is **substantive, not cosmetic** | D7.3 |
| 6 | **New §8.5 — Grounds for termination** | The **termination test is a failure of TRUST, not merely seriousness**: conduct that irreparably destroys the relationship of trust, or presents a continuing material risk. Enumerate: forged documents · identity fraud · financial fraud · deliberate concealment · repeated malicious abuse · persistent conduct materially threatening the Trust after due process | D10 p5 |
| 7 | **New §8.6 — Principles** | (1) **the constitutional sentence** below, verbatim and leading; (2) **reason codes establish the ground; the Trustee Panel determines the sanction** after considering seriousness, prior history, the member's response, the possibility of restoration, and the duty to protect the Pariwar; (3) **termination is the final measure**; (4) **restoration is ordinarily exhausted first** unless specific reasons are recorded; (5) the **failure-of-trust test**; (6) termination **follows a prior suspension** absent an express exception; (7) **documented notice and opportunity to respond** must precede termination; and the **two-part escalation justification** (WS-C) | D10 p1–7 |
| 8 | **New §8.7 — The Trustee Panel** | **Define the body.** Part 8 currently names *"a State Trustee"* and *"Trustee discretion"*; principle 2 introduces the **Trustee Panel** as the decider. Define its composition and scope. **Blocks Story 10.18** — V3 | D6 / V3 |
| 9 | **§8.3 + new §8.8** | **Appeal.** Part 8 does not reference Part 9, and Part 9 is explicitly the *claim-denial* flow. State the moderation appeal route expressly | D10 p8 |
| 10 | **§8.4** | **Termination ends membership, not history.** Preserve the historical record per retention obligations while ending all membership privileges and authenticated access. **Statutory rights survive** — exercised through an identity-verified administrative process designated by the Trust | D5 |
| 11 | **New §8.9 — Future governance test** | *"Any future moderation ground or sanction shall be evaluated against these principles rather than by analogy to existing reason codes."* Guards the D7.2 failure mode from recurring | D10 |

#### The constitutional sentence (§8.6 principle 1 — verbatim, leading)

> **Termination is an exceptional governance act, not a stronger suspension.**

This sentence is **load-bearing and must be reproduced verbatim** in Niyamavali §8.6, in PRD FR-56, and in the `docs/` governance reference. It is the shortest statement of the constitutional distinction, and it forecloses the specific failure mode this review found in the shipped code: applying **the same 7 reason codes to both sanctions**, which makes termination read as suspension turned up. An *exceptional act* requires its own threshold, its own reasoning and its own record — a *stronger suspension* requires only a harsher mood. Every downstream safeguard in D10 (the failure-of-trust test, the two-part escalation justification, restoration-exhaustion, notice) is an operationalisation of this one sentence, and should be read as subordinate to it.

#### Suspension vs. termination — the comparison table (new Niyamavali §8.4a, per D5)

Reproduced in Part 8 and in the `docs/` governance reference. This table is the practical form of the constitutional sentence: the two columns differ **in kind at every row**, not in degree.

| Dimension | **Suspension** | **Termination** |
|---|---|---|
| **Nature** | A corrective sanction | **An exceptional governance act** |
| **Test** | Restoration is realistically possible | The trust relationship is **fundamentally and irreparably broken**, or a continuing material risk persists |
| **Curable by the member?** | **Yes** — rule-clearance or trustee discretion | **No** — recoverable only by explicit Trustee reinstatement |
| **Donor roster** | **Remains on it** — the obligation to contribute survives, because it is the mechanism of cure (§3.3) | **Removed** |
| **Beneficiary entitlement** | Withdrawn during suspension | Ended |
| **Portal access** | **Retained** — the member is curing and needs the contribution surface | **Ended** — all membership privileges and authenticated access cease |
| **Membership** | Continues | **Ends.** History does not — the record is preserved per retention obligations |
| **Statutory rights (DPDPA)** | Exercised through the portal | **Survive**, exercised through an identity-verified administrative process |
| **Escalation justification** | Not required | **Mandatory** — two-part: why suspension is inadequate, *and* why termination is proportionate |
| **Prior sanction required?** | No | **Yes** — follows a prior suspension, absent an express Niyamavali exception |
| **Notice + opportunity to respond** | Notice required | **Notice and an opportunity to respond** must precede the act; the notice is **self-contained** |
| **Rejoin** | Not applicable — membership continues | **12-month rejoin lock** (§2.5, FR-6) |

> **Note on the severity gradient (D10).** §2.5 applies the 12-month rejoin lock to a member who is *"terminated **or lapses**"* — so termination's harshest *consequence* is shared with ordinary lapsing. What termination uniquely adds is the loss of a cure, roster removal, and the end of membership itself. **Confirm this gradient is intended** as part of ratifying §8.5/§8.6; if the rejoin lock is meant to distinguish the two, §2.5 needs its own amendment.

> **Standing requirement (D10).** No immediate-termination exception is proposed. Any future exception under principle 6 must be **drafted by counsel**, routed through `docs/legal-counsel-engagement/` §1(a) and §1(c), with `[LEGAL]` acceptance in `.decision-log.md`, **before** ratification. The earlier candidate — terminating a member for filing a court case — was **withdrawn on review**: it sits in direct tension with §1.2, R10(E) and Deed Clause 26, and would functionally reintroduce the clause R10(E) deliberately dropped. Where the concern is protecting the pool during litigation, a **claims-participation hold** achieves the effect without penalising recourse.

---

### 4e — UX specification amendments

| # | Section | Change |
|---|---|---|
| 1 | Contribution surface | **New disclosure block** (Story 10.16) — the no-entitlement sentence rendered on the payment surface itself, plus what the payment does, does not buy, and how many remain. Route through `docs/tone-guide.md`; §4.5 no-shortfall-framing applies |
| 2 | `:1893` MemberStatusPanel | The **"Appeal this decision" CTA** currently has no moderation destination. Either wire it (10.22) or suppress it for moderation states until 10.22 lands. **Do not leave it rendering into nothing** |
| 3 | `:1894` states | Add the **suspended-and-contributing** combination. `presenter.ts:81-91` headline logic is unchanged, but the rendered combination is new — **the largest exposure, and it is copy, not code** |
| 4 | New — termination notice | The **self-contained** shape (Decision · Ground · Summary · Effective · Further communication). No portal dependency. Summary is derived prose, **never** the Tier-1 Decision Note verbatim |
| 5 | Stance #5 (`:89`, `:123`, `:203`) | **Reaffirmed, not amended.** D1 confirms the human gate stands. Add the D1 corollary: *detection is automated, the sanction is not* — violator flagging surfaces candidates without auto-action |

---

### 4f — Architecture, docs and governance records

Per `[[feedback_architecture_vs_prd_boundary]]` and `[[feedback_architecture_vs_adr_boundary]]` — architecture commits **state, transitions and events**; PRD and Niyamavali commit **policy, eligibility and grounds**.

| Target | Change |
|---|---|
| **Architecture** | (a) `MemberValidityPayload` gains `is_assignable` as a **pre-derived field**; (b) the restoration-discipline **overlay**'s states/transitions/events (10.23); (c) the **auth-path overlay read** for termination, timing-equalised (10.19). **No grounds or thresholds** — those are §4c/§4d |
| **AI-7-2** | Record the **amendment** (not violation): assignability stops being `is_valid` alone; the roster still reads one pre-derived field. Update `[[project_assignability_predicate_is_isvalid_only]]`, which currently states the frozen predicate |
| **`docs/` governance reference** | **New** — the permanent home §5a asks for. Carries the record model, the operational/governance vocabulary split, and the primitive-extraction note. Precedent: `docs/tone-guide.md`, `docs/access-wrapper-invariants.md`. Cited by 10.20/10.21/10.22/10.23 |
| **`.decision-log.md`** | One entry per ratified decision (§1d, D1, D5, D6, D8, D9, D10), using the file's existing template. D1 and D9 are already agreed and can be recorded now |
| **`deferred-work.md`** | **Re-point the stale geo-tree markers.** ~14 sites defer to "Epic 3", which is `done` (V2). Record the geo-tree containment resolver as an open item with a real successor, distinct from 10.18 |
| **Decision brief** | On ratification, split per §5a: governance text → Niyamavali Part 8; record model + vocabulary split → the `docs/` reference. The brief retains findings, decisions and implementation impact. **Do this at ratification, not later**, or the principles get re-derived from a stale artifact |

---

### 4g — `sprint-status.yaml`

Add seven `backlog` entries after `10-15-survey-poll`, in execution order, and flip `10-11` to reflect its amended scope:

```yaml
  10-16-contribution-during-suspension-disclosure: backlog
  10-17-moderation-roster-unblock: backlog
  10-18-constituting-the-trustee-panel-sanctioning-authority: backlog
  10-19-termination-ends-membership-privileges: backlog
  10-20-moderation-record-model: backlog
  10-21-off-portal-dpdpa-access: backlog
  10-22-moderation-appeal-mechanism: backlog
  10-23-restoration-discipline-lock-in: backlog
```

Plus a top-of-file reverse-chron ledger entry per `[[project_sprint_status_ledger]]`, recording the proposal, the seven stories, the 10.10/10.11 amendments and the three verification corrections.

---

## Section 5 — Implementation Handoff

**Scope classification: Major.** This is not backlog reorganisation — it amends the PRD, requires eleven Niyamavali Part 11 amendments subject to legal-counsel review, amends a frozen architectural invariant, and adds seven stories.

| Recipient | Responsibility |
|---|---|
| **PM / Trustee Panel** | Ratify §1d, D2, D3, D4, D5, D6, D7, D8, D10. **D1 and D9 are already agreed.** Own the §3.3 MVP calls (appeal + off-portal DPDPA as conditions on enabling termination) |
| **Legal counsel** | The eleven Part 11 amendments per `docs/legal-counsel-engagement/` §1(a) trust-posture and §1(c) appeal fairness. **§4d #8 (defining the Trustee Panel) is the critical-path item — it blocks Story 10.18, which blocks 10.20** |
| **Architect** | The `is_assignable` payload field, the restoration-discipline overlay, the auth-path overlay read, and the AI-7-2 amendment record |
| **PO / Dev** | Story files for 10.16–10.23 via `bmad-create-story`; the 10.10/10.11 `epics.md` amendments; `sprint-status.yaml` |
| **UX** | The five §4e items — item 2 (the CTA rendering into nothing) is the one with a live user-facing consequence |

### Success criteria

1. A suspended member with an available restoration path **appears on the donor roster, receives a contribution alert, and can complete the contributions that restore them** — with the no-entitlement disclosure on the payment surface.
2. Replay determinism is **pinned by a test** before any moderation event predates a frozen cycle.
3. A terminated member **cannot log in**, receives a **self-contained** notice, and has a **working off-portal route** to statutory rights.
4. The Trustee Panel is **defined in the Niyamavali and grantable in the capability model** before D10 principle 2 is ratified.
5. **No termination is possible without a recorded two-part escalation justification** — and the "why suspension is inadequate" part is separately answerable, not pre-fillable from, and not satisfied by, the seriousness of the ground.
6. The **appealability claim in `moderation/status.ts:17` is either true or removed.**
7. Joining discipline and restoration discipline are **separately tracked and separately expiring** — neither clock absorbs the other.

### Known residuals carried forward

- **The geo-tree containment resolver remains deferred** — deliberately out of 10.18's scope (V2). It blocks direct `state_trustee` / `district_admin` / `block_admin` gating across 6.7, 10.3, 10.4, `cycle.freeze` and `claim.appeal_vote`. Its "deferred to Epic 3" markers are stale and are re-pointed by 10.18, **not discharged**.
- **`member.suspend` is DEPRECATED, not retired.** It stays in the catalog and stays enforceable for the duration of the migration; existing grants are honoured; no new grants are issued; a CI assertion fails if one appears. Removal is a **separate, later catalog bump** taken only once no live grant references it.
- **The moderation record model is a recognised future extraction point**, not extracted — one consumer exists today (`[[feedback_no_premature_package]]`).

---

## Appendix — Change Navigation Checklist completion

| § | Item | Status |
|---|---|---|
| 1.1–1.3 | Trigger, problem, evidence | **[x]** Story 10.10 / PR #160 / `8d9fcd4`; five-fact chain, all file-anchored |
| 2.1–2.5 | Epic impact, changes, future epics, new epics, resequencing | **[x]** Epic 10 cannot complete as planned; 7 stories added; no new epic; **2 resequencings** (D6 early; D4 before D3) |
| 3.1–3.4 | PRD, architecture, UX, other artifacts | **[x]** All four conflict; secondary artifacts (`.decision-log.md`, `deferred-work.md`, `docs/`) identified |
| 4.1 | Option 1 Direct Adjustment | **[x] Viable** — effort High, risk Low-Medium |
| 4.2 | Option 2 Rollback | **[x] Not viable** — discards ~7,885 reviewed lines to fix one line |
| 4.3 | Option 3 MVP review | **[x] Partial** — folded in as §3.3's two conditional calls |
| 4.4 | Selected path | **[x] Hybrid** (Option 1 primary + scoped MVP call) |
| 5.1–5.5 | Proposal components | **[x]** All five sections produced |
| 6.1–6.2 | Review and accuracy | **[x]** Three brief claims corrected against live source (V1–V4) |
| 6.3 | User approval | **[x] APPROVED** 2026-08-04 by BigDev, subject to seven conditions — all applied and recorded in the header table |
| 6.4 | `sprint-status.yaml` update | **[x]** Eight `backlog` entries added + ledger entry |
| 6.5 | Handoff confirmation | **[x]** Routed per §5. Niyamavali Part 11 amendments and the two §3.3 MVP calls remain with PM / Trustee Panel / legal counsel — **not applied by this workflow** |
