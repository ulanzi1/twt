# Per-Epic-Aggregation Estimate: Epic 4 — Rules Engine + Member Validity Service

**Epic ID:** `epic-agg-epic-4`
**Authored:** 2026-06-04 per Tasks 7+8 code-review D-01-resolved (Decision 2026-06-04-016)
**Status:** Solo-builder-author-committed; Trustee ratification pending Task 9 per Decision 2026-06-04-016

---

## §1 Epic identity + worksheet anchor

| Field | Value |
|---|---|
| Worksheet row | `estimation-worksheet.md §7` row `epic-agg-epic-4` |
| Implementing Stories | 4.1–4.8 (8 stories) |
| Story mix | 1 simple + 3 medium + 3 complex + 1 very complex = 26 pts |
| Cadence basis | 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved) |
| CI/ADR overhead | 1.40 (Rules Engine ADR overhead per methodology §4(f)) |
| Default solo-cadence band | `low` (per `estimation-methodology.md §2` Epic 4 example entry: "Rules Engine — novel domain logic") |
| AI-cadence band | `medium` (this entry's purpose — see §6 rationale) |
| Floor (current) | 0.28 |
| Ceiling (current) | 0.63 |

## §2 Implementation surface inventory (Epic 4 scope per PRD §4.2 FR-7–FR-12A)

- **Rules Engine DSL** — expression-tree evaluator for member-eligibility rules (R1-R12); ~3-4 surfaces (parser, evaluator, validator, rule-loader)
- **Rule-storage substrate** — versioned rule definitions in Drizzle migrations + admin UI for trustee-edited rule changes; ~3 surfaces
- **Member validity service** — per-member rule evaluation at signup + at claim-time; ~2 API surfaces + 1 background-job handler
- **R9 special-case voting workflow** (Story 4.5) — multi-party vote tallying for contested rule application; ~2 UI surfaces + 2 API surfaces
- **R10/R11 eligibility at claim time** — invoked from `loop-node-claim-filing`; reuses Member validity service substrate

Total: ~13-15 surfaces.

## §3 Complexity profile

| Profile | Multiplier | Applies to |
|---|---|---|
| `baseline` | 1.0× | Rule-storage CRUD; admin UI |
| `multi-party-state-machine` | +50% | R9 voting workflow only (1-2 surfaces) |
| `multi-tenant-RLS-isolation` | +30% | All data-touching surfaces |

Aggregate: modest. Below the `safety-critical-with-property-test-coverage` threshold because rule evaluation correctness is testable with exhaustive unit-test enumeration (small finite rule space) — does NOT require property-test infrastructure like Epic 7 Pool Engine.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — minimal (rule definitions are public-trust-governance content)
- **FR-100 schema-diff + benefit_mechanism tag** — rule-evaluation outcomes that bind to claim payouts emit `benefit_mechanism`-tagged audit lines
- **UX-DR3 friction-budget gate** — R9 voting surface is Tier-2 (lower priority)
- **Story 1.10 audit-line emission gate** — every rule-evaluation outcome + every R9 vote emits a tamper-evident audit-log entry

CI/ADR overhead: 40% (per methodology §4(f) Epic 4 ladder entry — baseline 20% + FR-100 5% + UX-DR3 3% + Story 1.10 5% + per-Epic ADR overhead 7% covering Rules-DSL choice).

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved Tasks 7+8 review; ratification pending Task 9 ≥2-trustee co-sign per Decision 2026-06-04-016). 1 AI-cadence month = 346 hr per methodology §2.

**Derivation:** 26 story-points × 4 hr/pt × 1.40 CI/ADR overhead ÷ 346 hr/month = 0.421 months computed midpoint ≈ 0.42 months.

Medium-band asymmetric formula per methodology §3 (factor = 0.5; 1 + factor = 1.5): floor = 0.42 / 1.5 = 0.28; ceiling = 0.42 × 1.5 = 0.63. Medium-band ratio 0.63 ÷ 0.28 = 2.25 ✓ — formula consequence per P-13 tautological-band disclaimer.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.28` |
| `engineer_month_ceiling` | `0.63` |
| `confidence_band` | `medium` (AI-cadence; see §6 rationale below for the `low → medium` reassignment) |

## §6 AI-cadence band reassignment rationale (D-01-resolved 2026-06-04)

`estimation-methodology.md §2` lists Epic 4 as the canonical `low`-band example at solo cadence: "Rules Engine — novel domain logic". This entry justifies the `low → medium` reassignment when the operative cadence basis is `estimation-methodology.md §2 row 2` (AI-assisted 80 hr/week NET).

The methodology §3-amendment (added 2026-06-04 per D-01-resolved) permits AI-cadence band reassignment when **all three criteria** hold:

### Criterion (a) — Specification completeness

Epic 4's functional requirements are fully enumerated in **PRD §4.2 FR-7 through FR-12A**:

- FR-7: Member eligibility evaluation at signup
- FR-8: Per-rule version + supersession
- FR-9: Trustee-edited rule changes via Niyamavali amendment workflow
- FR-10: R10 eligibility at claim time
- FR-11: R11 eligibility at claim time
- FR-12: R12 cross-cutting eligibility
- FR-12A: R9 special-case voting workflow

There are no remaining "TBD" specification gaps. The rule semantics are concrete (e.g., R1 = "member is active in this pool"; R7 = "member is within deceased-member-class definition"). The DSL design space is bounded — expression-tree evaluation over enumerated member-attribute predicates is a well-defined problem. **Criterion (a) is met.**

### Criterion (b) — AI prior-art availability

AI substrate (Claude + GPT-class models) has extensive training-data exposure to rule-evaluation engines, including:

- **Expression-tree evaluators** — standard library implementations in dozens of languages (Python's `ast.literal_eval`, JavaScript's `expr-eval`, Java's `MVEL`).
- **Decision tables** — `decision-table` libraries (PyDST, OpenDecisionTable, DROOLS subset).
- **RETE-pattern matchers** — open-source implementations (Pyke, py-rete) for forward-chaining rule engines.
- **JSON-schema validators** — Ajv, jsonschema (Python), every-validator. Member-eligibility rules map directly to JSON-schema "if/then" patterns.
- **Config DSLs** — TypeScript-based DSL prototyping with `ts-pattern`, `zod` discriminated unions is a 1-2 day exercise leveraging AI's prior art.

DSL prototyping with AI is a **1-2 day exercise** rather than a 1-2 week novel-design exercise. **Criterion (b) is met.**

### Criterion (c) — Substrate-adjacency

The Rules Engine substrate is **adjacent to** well-supported patterns even though novel to TWT:

- **Adjacent to JSON-schema validators**: member-eligibility rules ARE JSON-schema "if/then" patterns with member-attribute predicates.
- **Adjacent to config DSLs**: the Niyamavali amendment workflow that trustees use to edit rules is structurally identical to a config-DSL admin UI with versioning + diff view.
- **Adjacent to decision tables**: per-rule per-member evaluation is structurally a decision-table lookup.

The Rules Engine is novel to TWT but the implementation patterns are mature in the open-source ecosystem. **Criterion (c) is met.**

### Consistency check — substrate maturity at AI-cadence

The `low` band at solo cadence reflects the assumption that "substrate unbuilt; significant unknowns remain" — interpreted as Solo Builder facing the design + implementation problem from scratch, with weeks of design iteration before code lands. At AI-cadence with the three criteria above met, the design phase compresses to days (AI generates 3-5 DSL prototype options in hours; Solo Builder selects + iterates within a few days), and implementation tracks `medium`-band patterns (substrate-adjacent; prior art exists elsewhere).

### Trigger-margin disclosure (for trustee review at Task 9)

This reassignment is load-bearing for the no-trigger SM-1 reconciliation outcome:
- At `low` band: Epic 4 floor 0.21 / ceiling 0.84 (factor 1.0 around midpoint 0.42).
- At `medium` band: Epic 4 floor 0.28 / ceiling 0.63 (factor 0.5 around midpoint 0.42).
- Delta to total: replacing 0.84 → 0.63 reduces `total_estimate_ceiling` by 0.21 (from 13.68 → 13.47).
- Delta to ratio: `ceiling_ratio` shifts 1.520 → 1.497, moving from above-1.5-trigger to below-1.5-trigger.

Trustees should evaluate this rationale on its merits (the three criteria above) rather than on its trigger-margin consequence. If trustees reject the reassignment at Task 9, Epic 4 reverts to `low` band and the reconciliation trigger fires — at which point the three-decision-paths taxonomy (cut-scope / move-SM-1 / contract-help) applies per `reconciliation-decision-framework.md §2`. Decision 2026-06-04-016 records this disclosure transparently.

## §7 Cross-references

- `estimation-worksheet.md §7` row `epic-agg-epic-4`
- `estimation-methodology.md §2` Epic-4 example entry + §3-amendment AI-cadence band reassignment sub-rule
- `.decision-log.md` Decision 2026-06-04-016 (no-trigger sign-off + Epic 4 reassignment rationale)
- `per-loop-node-estimates/claim-filing.md §5` (R10/R11 eligibility at claim time)
- `per-loop-node-estimates/peer-mesh.md §5` (R9 voting workflow share)
- `per-loop-node-estimates/denial-appeal.md §5` (R9 voting workflow share)
- PRD §4.2 FR-7 through FR-12A (Epic 4 functional requirements)
