# Estimation Methodology

**Status:** Author-committed 2026-06-01 per Decision 2026-06-01-012. This document commits the estimation discipline applied at Task 7 (Solo Builder substantive estimate authoring). Substantive estimates are NOT authored here — they live in `per-loop-node-estimates/<id>.md` + `per-tier-surface-estimates/<tier>.md` + `estimation-worksheet.md`.

---

## §1 Authority cites

- **UX §Phase-0 P0-3** (UX spec line 107): "Before §1 Trust Loops is drafted, BigDev commits to a single-engineer-month estimate per loop + per Tier-N surface, and reconciles against the SM-1 target. Rough back-of-envelope from this Executive Summary's scope lands at ~22-34 single-engineer-months at solo cadence; SM-1 target is 6-9 months. The 3-4× mismatch must be resolved via cut scope, moved SM-1 target, or changed build model (contract help, staged team-up). Silent acceptance of the gap is not an option. Owner: BigDev."
- **AR-49 P0-3 Launch Gate Risks** (architecture line 4779): "P0-3 Spec-to-Cadence Reality Check | BigDev | Trustee Panel (scope decisions)".
- **Architecture §P0-3 reconciliation note** (architecture lines 4793-4800): "The architecture's discipline surface accrued substantially across elicitation — additional cross-cutting concerns, ongoing-maintenance disciplines, structural protections beyond the original PRD scope. The architecture discipline increased implementation obligations; implementation planning should re-baseline scope before commitment."
- **PRD §7 SM-1 target** (PRD line 1329): "SM-1: First end-to-end claim closes without manual heroics. Target: 6–9 months from v1 ship." This is the reconciliation baseline: `SM_1_floor = 6`; `SM_1_ceiling = 9`.
- **PRD §9.0 + §9.1.1 patience as discipline** (PRD line 1441 + reconcile-brief.md line 199): "v1 ships when the first end-to-end claim closes cleanly (SM-1) — not on a runway-dictated date."
- **Epics line 564 Phase-0 prereq gates**: "Phase-0 prereq gates (P0-1, P0-3, P0-4, P0-5) — gate *all* engineering, not just the epics that explicitly list them."

## §2 Granularity — single-engineer-month at solo cadence

The canonical estimation unit is the **single-engineer-month at Solo Builder cadence**. Not engineer-week. Not engineer-quarter. Month.

**Why month?** It matches the SM-1 ship-target granularity (6-9 months) directly. Week-granularity introduces false precision at Phase-0 when most surfaces are unbuilt. Quarter-granularity loses the resolution needed to distinguish a 6-month estimate from a 9-month estimate.

**Solo cadence definition (row 1 — default):** Solo Builder (BigDev) working on TWT as primary engineering obligation, at ~25 hours/week of focused engineering (net of context-switching, code-review, trustee-coordination, and operations duties). See §5 Assumption catalogue for the productivity assumption sources.

**AI-assisted cadence definition (row 2 — operational override per D-03-resolved 2026-06-04):** Solo Builder + AI pair-programming substrate (BMad + Claude Code) at 80 hours/week NET focused engineering (equivalent to 16 hr × 5 d or 11.4 hr × 7 d sustained). Per-month basis: **1 AI-cadence month = 346 hr** (80 hr/week × 52/12 = 346.67, floored to 346 for arithmetic stability — floors against the ceiling, increasing safety margin per `reconciliation-decision-framework.md §1` more-protective-governs). Supporting evidence catalogue: throughput measurement on Phase-0 framework authoring — 15 Phase-0 stories author-committed in 5 calendar days (per `per-loop-node-estimates/claim-filing.md §5`); the 2× difficulty premium for implementation-vs-Phase-0 work baked into the 80 hr/week figure is itself an unsourced assumption — flagged as Month-3 re-attestation re-evaluation target (the actual implementation-vs-framework ratio may be 3-5×; if so, this row's basis is itself overoptimistic). **Override-trigger row added to §5 below.** Authorship of this cadence override requires ratification per `reconciliation-decision-framework.md §4`: Solo Builder + ≥2-trustee co-sign at Task 9 trustee panel session; see `.decision-log.md` Decision 2026-06-04-016 supersession entry.

**Estimation scope per row:** one row in `estimation-worksheet.md` covers the implementation effort for a single Phase-1 loop node OR a single Tier-N aggregation. "Implementation effort" means: design-to-merge, including tests, CI gate participation, documentation, and ADR overhead. It does NOT include Solo Builder's operations / governance / coordination overhead outside the specific implementation task.

## §3 Floor + ceiling + confidence band

Every estimate row carries **three numbers**: `engineer_month_floor`, `engineer_month_ceiling`, and `confidence_band`. Single-point estimates are forbidden (see §4 Structural Invariant 1 in `README.md`).

**Confidence band tiers (Cone-of-Uncertainty at Phase-0):**

| Band | Meaning | Range | Phase-0 applicability (default at solo cadence) |
|---|---|---|---|
| `high` | Tightly scoped; substrate well-understood | ±20% of midpoint | Rare at Phase-0 — reserve for tightly-scoped CI gates with prior implementations (e.g., FR-74 PII scrape gate if prior CI framework is established). |
| `medium` | Substrate-adjacent; prior art exists elsewhere | ±50% of midpoint | Most common. Appropriate for Epic 1 (Turborepo + Cloud SQL + Drizzle), Epic 2 (Niyamavali publishing), Epic 3 (member onboarding + DigiLocker), Epic 5 (channel dispatcher) — established patterns, specific implementation unknown. |
| `low` | Substrate unbuilt; significant unknowns remain | ±100% of midpoint | Expected for unbuilt-substrate Epics: Epic 4 (Rules Engine — novel domain logic at solo cadence; `medium` at AI-cadence per §3-amendment 2026-06-04 below — see worked-example block), Epic 6 (Verifier Console — complex multi-party state machine), Epic 7 (Pool Engine atomicity — novel financial substrate), Epic 9 (bank-parser allowlist — external-integration + format unknowns), Epic 11b (memorial + Sahyog Drive — novel cultural domain). |

**§3-amendment (added 2026-06-04 per D-01-resolved Tasks 7+8 review): AI-cadence band reassignment sub-rule.** When the §2 row 2 AI-cadence is the operative cadence basis, a row's default solo-cadence band may be reassigned upward (e.g., `low → medium`) IF all three criteria hold: (a) **specification completeness** — the implementing Epic's functional requirements are fully enumerated in PRD or epics (no remaining "TBD" specification gaps); (b) **AI prior-art availability** — the substrate has extensive AI-tractable prior art (open-source reference implementations, well-documented patterns); (c) **substrate-adjacency** — the substrate is adjacent to a band-supported pattern even if novel to TWT. Worked example — **Epic 4 Rules Engine**: at solo cadence = `low` (novel domain logic, DSL design unbuilt); at AI-cadence = `medium` (PRD §4.2 FR-7 through FR-12A fully specifies eligibility rules — criterion a; AI has extensive prior art on rule evaluation engines including expression-tree evaluators, decision tables, RETE-pattern matchers — criterion b; DSL prototyping with AI is a 1-2 day exercise leveraging adjacency to JSON-schema validators and config DSLs — criterion c). Reassignment requires explicit `per-epic-aggregation-estimates/<epic-id>.md §6` rationale documenting how all three criteria are met; assignment-only-via-prose is rejected at peer review. See `per-epic-aggregation-estimates/epic-4.md §6` for the canonical worked rationale; `per-epic-aggregation-estimates/epic-12.md §6` for a separate (D-02-resolved) rationale documenting how AI-cadence offsets ±30% surface-count uncertainty when a TBD platform decision is pending.

**How floor + ceiling relate to confidence band — geometric Cone-of-Uncertainty:**

```
midpoint_estimate = sqrt(engineer_month_floor × engineer_month_ceiling)   # geometric mean
ceiling = midpoint × (1 + confidence_band_factor)
floor   = midpoint / (1 + confidence_band_factor)

Where: high → 0.20; medium → 0.50; low → 1.00
```

The band is **geometric (multiplicative)**, not arithmetic (additive) — Cone-of-Uncertainty discipline at Phase-0 is best modeled multiplicatively because estimate uncertainty compounds with surface count + complexity. Worked example for `low` band (factor = 1.00), midpoint = 4 months: `floor = 4 / 2 = 2 months`; `ceiling = 4 × 2 = 8 months` — a true ±100% band that never collapses to a 0-floor.

**Tautological-band disclaimer (added 2026-06-04 per Tasks 7+8 review P-13):** The band ratios (`ceiling / floor`) of **2.25 for medium** and **4.0 for low** are mechanical consequences of the asymmetric geometric formula above: `medium` factor = 0.5 → `ceiling/floor = 1.5 / (1/1.5) = 1.5 × 1.5 = 2.25`; `low` factor = 1.0 → `ceiling/floor = 2 × 2 = 4.0`; `high` factor = 0.2 → `ceiling/floor = 1.2 / (1/1.2) ≈ 1.44`. A row whose computed ratio matches the assigned-band ratio is NOT independently validated — it has only confirmed that the formula was applied. The ratio test is therefore **not an independent integrity check**; band assignment must be justified by the §3 criteria (substrate maturity + prior art + surface unknowns + Phase-0 applicability — and §3-amendment AI-cadence criteria when applicable), not by ratio match. Entry-file derivations that write "ratio: X ÷ Y = 2.25 ✓" are confirming arithmetic consistency only, not validating band assignment.

**Confidence-band formula citation discipline (added 2026-06-04 per Tasks 7+8 review P-07):** Entry-file §5 derivations must cite the asymmetric form by name and notation: `floor = midpoint / (1 + factor)`, `ceiling = midpoint × (1 + factor)`. For medium-band (factor = 0.5), the form `÷ 1.5 / × 1.5` is *numerically equivalent* to `÷ (1 + 0.5) / × (1 + 0.5)` and may be written either way, but each entry file must note "(medium-band: 1 + 0.5 = 1.5; symmetric form coincides with asymmetric)" so future re-attestation editors do not mistake the rows for using the superseded symmetric methodology (per Decision 2026-06-01-012-amend-1 item 6 supersession).

**Consistency-check enforcement (not optional):** the §3 formula is the *consistency check*, applied *after* the floor + ceiling are estimated bottoms-up from §4 inputs. If the ratio `ceiling / floor` implies a confidence band that differs from the assigned band (e.g., a row with floor=2, ceiling=8 implies `low` but the row asserts `medium`), the row is rejected at Task 7 peer review unless Solo Builder either (a) reassigns the band to match the ratio, or (b) supplies explicit assumption-catalogue rationale in the entry's §6 documenting why the ratio is wider/narrower than the band tier suggests. A "logged-and-accepted discrepancy" without rationale is not a valid resolution.

## §4 Estimation inputs per row

Each per-loop-node entry file (§2 + §3 + §4 sections) and per-tier-surface entry file (§2 + §3 + §4 sections) carry the following estimation inputs. The combination produces the floor + ceiling in §5.

### (a) Implementation surface count

Count of discrete implementation surfaces scoped to this row's loop node or Tier-N aggregation:
- **UI screens** — unique views/pages/modals requiring layout + state management + i18n + a11y. Sub-surfaces (e.g., empty state, loading state, error state) do not count separately unless they require significantly different logic.
- **API endpoints** — distinct HTTP endpoints or tRPC procedures, counting each method separately (GET /members + PATCH /members = 2 endpoints).
- **Data-model migrations** — discrete Drizzle migration files. A migration that adds a table + a column is 1 migration (not 2 surfaces).
- **Background-job handlers** — discrete pg-boss job handler functions. Each job type is 1 handler regardless of complexity.

If the surface count for a row is not yet enumerable from the Epic spec (e.g., substrate decision pending Story 0.14; external forum design pending Story 0.15), the row carries `surface_count = TBD-pending-Epic-X-substrate-decision`. See §7 Explicit unknowns.

### (b) Complexity multiplier per surface

Applied as a multiplier on a `baseline` effort assumption (baseline = vanilla CRUD surface, single-tenant, no cross-cutting CI gate):

| Profile | Multiplier | Example |
|---|---|---|
| `baseline` | 1.0× | Simple read/write CRUD UI; single GET endpoint; standard migration |
| `multi-party-state-machine` | +50% | Claim state machine (multiple actors, transitions, audit trail); Pool spawn saga |
| `external-integration` | +50% | DigiLocker KYC flow; UPI intent round-trip; bank-statement parser; FCM/APNS push |
| `safety-critical-with-property-test-coverage` | +100% | Epic 7 Pool Engine atomicity (FR-100 property-test-coverage requirement per architecture §7.5); denial-appeal flow (multi-actor vote tallying) |
| `multi-tenant-RLS-isolation` | +30% | Any surface that requires per-Pariwar RLS enforcement per AR-2/3 (architecture §1.2) — applies to most data-touching surfaces in Epics 1-14 |

Multipliers are additive: a surface that is both `multi-party-state-machine` AND `external-integration` AND `multi-tenant-RLS-isolation` carries +50% + 50% + 30% = +130% above baseline. Cap at +200% for any single surface (beyond +200%, the surface should be decomposed into sub-stories before estimation).

### (c) Cross-cutting CI-gate participation overhead

Every implementation surface in TWT participates in four cross-cutting CI gates:
- **FR-74 PII scrape gate** — CI job that rejects commits introducing new unencrypted PII fields. Estimated overhead: 5-10% of surface effort (schema design + encryption choice).
- **FR-100 schema-diff + benefit_mechanism tag gate** — CI job per architecture §5.2 that validates schema diff against contract + verifies `benefit_mechanism` tag on every claimed payment. Overhead: 5-15% (tag discipline + contract schema discipline at each PR).
- **UX-DR3 friction-budget gate** — CI job that verifies no new Tier-1 flow exceeds friction-budget thresholds per UX-DR3. Overhead: 3-8% (flow timing discipline; primarily design + acceptance-test cost).
- **Story 1.10 audit-line emission gate** — CI job that verifies every state-transition emits a tamper-evident audit-log line per Story 1.10 substrate. Overhead: 8-15% (emit-call discipline at every state-transition; Story 1.10 substrate required).

**Aggregate cross-cutting overhead:** 20-45% of surface effort (baseline cross-cutting burden on top of complexity-multiplied surface estimate). This is NOT a per-surface multiplier in (b) — it is a separate term added after the (b) multiplied surface estimate.

### (f) CI/ADR overhead aggregation rule (added 2026-06-04 per Tasks 7+8 review P-17)

The `estimation-worksheet.md §7` Epic-aggregation rows apply a discrete overhead ladder (`1.30 / 1.32 / 1.34 / 1.37 / 1.40 / 1.42 / 1.45 / 1.50 / 1.55` — i.e., 30 % to 55 % multiplier). The mapping from per-gate percentages in (c) + per-Epic factors in (d)+(e) to the row's overhead figure follows this rule:

```
row_overhead_multiplier = 1.0
                          + baseline_audit_line_overhead     # Story-1.10 audit-line emission is universal across all data-touching surfaces; baseline 20% per Epic
                          + sum(applicable_per_gate_overheads)   # FR-74 (PII density), FR-100 (benefit_mechanism), UX-DR3 (friction-budget) at per-Epic incident rate
                          + per_epic_adr_overhead             # documentation + ADR overhead per (d); 10-20% baseline
                          + per_epic_integration_overhead     # cross-Epic handoff per (e); 0-15% per Epic depending on coupling count

# bounded:
#   floor 1.30 (the lowest-overhead Epic: Epic 2 Niyamavali publishing — no benefit_mechanism, low PII density)
#   ceiling 1.55 (the highest-overhead Epic: Epic 6 / Epic 7 — multi-party state machine + safety-critical property-test + bank PII + benefit_mechanism on every state transition)
```

Back-cite per `estimation-worksheet.md §7`:
- `Epic 2` at 1.30 — content management + versioning; FR-74 + Story-1.10 only at low rate; no FR-100.
- `Epic 11a` at 1.30 — public identity shell; read-heavy; FR-74 PII shielding moderate; no FR-100.
- `Epic 1` at 1.42 — platform substrate; audit-log emission infrastructure itself; FR-74 + FR-100 + Story-1.10 + UX-DR3 (Tier-1 surfaces emerge here).
- `Epic 3 / 5 / 8` at 1.37 — standard member/contribution patterns; baseline + 2 gates active.
- `Epic 4` at 1.40 — Rules Engine novel; baseline + FR-100 + UX-DR3 + extra ADR overhead (Rules-DSL choice).
- `Epic 9` at 1.50 — bank-parser allowlist; baseline + bank PII density (FR-74 +15%) + FR-100 + every contribution-status transition emits Story-1.10.
- `Epic 6 / Epic 7` at 1.55 — multi-party state machine + safety-critical-with-property-test + every claim-state-transition emits Story-1.10 + FR-100 benefit_mechanism on each transition.
- `Epic 11b / 12 / 13 / 14` at 1.32–1.34 — bounded scopes; mostly UI + low-FR-100; standard baseline.

Material drift from this rule at a future re-attestation requires either (i) re-derivation per the formula above, or (ii) a per-Epic entry file at `per-epic-aggregation-estimates/epic-N.md §6` documenting the deviation. The ladder is informative, not prescriptive — drift within ±0.03 is within rounding tolerance.

### (d) Documentation + ADR overhead

Per architecture §Implementation Handoff PR-2 ADR-transcription discipline: each implementation story that introduces a net-new architectural decision (not pre-committed in architecture.md) requires an ADR authored in `docs/adr/`. ADR authoring overhead:
- **Baseline documentation overhead:** 10-20% of implementation effort (PR descriptions; inline code comments for non-obvious choices; `adr-index.md` row updates).
- **Per-net-new-ADR overhead:** 0.5 engineer-days per ADR (half-day to research + draft + review a substantive ADR). Most Epics 1-14 implementation stories involve 1-3 net-new ADRs.

### (e) Integration + handoff overhead

Per epics line 563 "one-slice-one-surface story discipline" — minimizes per-story file-churn for solo-build dev-agent context windows. The story discipline bounds per-story integration overhead. Per-Epic integration (when all stories within an Epic merge and their outputs are composed) is a real additional cost:
- **Per-Epic integration overhead:** 0.5-1.5 engineer-days per Epic (composing multiple stories; resolving cross-story schema drift; integration test pass).
- **Cross-Epic handoff overhead:** 0.25-0.5 engineer-days per explicit dependency (e.g., Epic 6 claim filing depends on Epic 3 member onboarding; Epic 9 reconciliation depends on Epic 6 claim state machine).

## §5 Assumption catalogue per row

Every per-loop-node + per-Tier-N estimate entry carries an explicit §6 Assumption dependencies section enumerating the productivity assumptions that gate the estimate. Default assumptions at author-commit (Task 7 Solo Builder overrides if substantively different):

| Assumption | Default value | Override trigger |
|---|---|---|
| **Focused engineering hours/week** | 25 hours/week NET (solo cadence — §2 row 1) — already deducted for context-switching, code-review, trustee-coordination, and operations duties (per §2 definition). Do not apply an additional context-switching deduction; 25 is the post-deduction figure. **Operational default at 2026-06-04: 80 hours/week NET AI-assisted cadence per §2 row 2** (D-03-resolved Tasks 7+8 review); see override-trigger column. | (1) Story 0.12 reconciliation contract-help path activation → contracted engineer's hours/week is a separate assumption per contractor scope-of-work. (2) Operations Lead hire per Story 0.7 Task 8 path a → governance-overhead component shrinks; net focused hours may increase above 25 (re-baseline trigger). (3) **AI-assisted cadence amendment 2026-06-04 per D-03-resolved (Tasks 7+8 review)** → 80 hr/week NET sustained becomes the default basis when AI pair-programming substrate (BMad + Claude Code) is the active development environment; supporting evidence catalogue cites Phase-0 framework-authoring throughput (15 stories in 5 calendar days; see `per-loop-node-estimates/claim-filing.md §5`); ratification requires Solo Builder + ≥2-trustee co-sign per `reconciliation-decision-framework.md §4` at Task 9 trustee panel session (slot pending; see `.decision-log.md` Decision 2026-06-04-016). The 2× implementation-vs-Phase-0 difficulty premium is itself an unsourced assumption flagged as Month-3 re-attestation re-evaluation target. |
| **Legal-counsel-return latency** | 5-10 business days per artifact requiring legal review (Story 0.13 concurrent review; denial-appeal legal compliance; consent flows) | Story 0.13 closure may establish a faster turnaround SLA if counsel is on retainer |
| **Trustee-ratification latency** | Variable; Trustee Panel meeting cadence estimated 1-2 meetings/month; ratification typically 3-5 business days from Solo Builder submission to ≥2-trustee sign-off | If Trustee Panel establishes an async-ratification protocol, latency reduces |
| **Architecture-decision freeze status** | Frozen as of architecture acceptance per architecture §Decision Freeze; net-new ADRs at implementation-time per architecture §Implementation Handoff; zero architecture-renegotiation overhead assumed | If architecture §Decision Freeze is lifted (e.g., a major new cross-cutting concern surfaces), re-baseline trigger fires |
| **Substrate readiness** | Epic 1 (Turborepo + Cloud SQL + Drizzle + pg-boss + KMS + RLS) is available before Epic 2+ stories begin. If Epic 1 substrate is delayed (e.g., P0-3 reconciliation cuts Epic 1 scope), downstream Epic estimates are revised. | Story 0.12 reconciliation outcome |
| **DigiLocker + UPI integration readiness** | External API integration latency estimated at 1-2 weeks per integration (discovery + sandbox access + integration implementation + testing); not blocked on contract negotiation at Phase-0 | Story 0.13 legal counsel may gate UPI terms; any re-scope is Task 8-9 territory |

## §6 Round-number-forbidden rule

Every estimate row's §5 engineer-month estimate MUST carry the §4 input itemization. Specifically:

- The per-loop-node or per-tier-surface entry file must enumerate (in §4 Implementation surface count): the specific UI screens + API endpoints + migrations + background-job handlers scoped to this row.
- The entry file must enumerate (in §3 Complexity profile): which multipliers apply per surface and why.
- The entry file must enumerate (in §4 Cross-cutting CI participation): which gates apply and estimated overhead.
- The floor + ceiling in §5 must be derivable from the §2-§4 inputs.

**Examples of rejected estimates:**
- "2–4 months because it feels about right" — rejected. No §4 input itemization.
- "3 months flat" — rejected. Single-point, no floor + ceiling, no confidence band.
- "10–20 months, low confidence" — accepted IF the §4 itemization shows why 10 is the floor and 20 is the ceiling.

**Examples of accepted estimates:**
- "Claim-filing loop node: 4–8 months, medium confidence. §2 surfaces: 3 UI screens (claim submission form + status tracker + document upload) + 5 API endpoints (POST /claims + GET /claims/:id + PATCH /claims/:id/status + GET /claims + DELETE /claims/:id) + 2 migrations (claim table + claim_audit_log table) + 1 background-job handler (claim-deadline-reminder). §3 complexity: 2 surfaces multi-party-state-machine (+50%), 1 external-integration (+50%), all 11 surfaces multi-tenant-RLS (+30%). §4 cross-cutting: FR-74 + FR-100 + Story 1.10 audit-line + UX-DR3 overhead estimated 35%. §4 documentation: 15% + 2 ADRs × 0.5 days = 1 day. §4 integration: 1 day Epic 6 integration. Total surface estimate: [detailed calculation]. Floor = 4 months at high assumption; ceiling = 8 months at low assumption per Cone-of-Uncertainty."

The `estimation-worksheet.md` row carries the numeric values; the per-entry file carries the itemization narrative.

## §7 Explicit unknowns

When a row's surface count is not yet enumerable from the Epic spec or a pending substrate decision, the row carries:

```
surface_count = TBD-pending-<reason>
engineer_month_floor = TBD
engineer_month_ceiling = TBD
confidence_band = low (pending substrate decision)
```

Examples of valid explicit-unknowns reasons:
- `TBD-pending-Epic-4-rules-engine-DSL-substrate-decision` — Rules Engine DSL choice gates how many API surfaces the rule evaluation engine needs.
- `TBD-pending-Story-0.14-native-stack-ratify-decision` — If native stack is React Native (Expo), UPI intent flow surface count differs from Flutter implementation.
- `TBD-pending-external-forum-platform-decision-FR-43A` — Module Marketplace external forum destination (platform choice affects integration surface count).
- `TBD-pending-bank-parser-allowlist-scope` — Epic 9 bank-parser allowlist scope (number of banks in v1 allowlist affects per-parser integration surface count).

When the substrate decision lands (e.g., Story 0.14 closes; Epic 4 Rules Engine DSL ADR is authored), the explicit-unknown row is updated with a substantive estimate. The update is a new `.decision-log.md` supersession entry if it changes the mismatch-ratio result.

## §8 Cross-link to estimation-worksheet

`estimation-worksheet.md` is the index that aggregates all per-loop-node + per-Tier-N estimates into the total-estimate + SM-1 reconciliation computation. The worksheet's rows cross-link to the per-entry files for §4 input itemization. The worksheet does NOT duplicate the per-entry narrative; it carries the numeric values only.

The worksheet's §8 Total estimate + SM-1 reconciliation section populates the deterministic mismatch-ratio computation at Task 8 (post-Task 7 substantive estimate authoring). The reconciliation formula is committed in `reconciliation-decision-framework.md §1`.

---

**References:**
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` #Phase-0 Prerequisites P0-3 (line 107)] — estimation-discipline authority
- [Source: `_bmad-output/planning-artifacts/architecture.md` #AR-49 P0-3 (line 4779)] — launch gate
- [Source: `_bmad-output/planning-artifacts/architecture.md` #P0-3 reconciliation note (lines 4793-4800)] — architecture-scope authority
- [Source: `_bmad-output/planning-artifacts/architecture.md` #Confidence Level (line 5021)] — Moderate delivery predictability
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` #SM-1 (line 1329)] — 6-9 month target baseline
- [Source: `estimation-worksheet.md`] — the consumer of this methodology
- [Source: `reconciliation-decision-framework.md §1`] — the mismatch-ratio formula this methodology feeds
- Memory: [[feedback_architecture_vs_adr_boundary]] — methodology commits properties (estimation discipline); specific tool choices are ADR territory
