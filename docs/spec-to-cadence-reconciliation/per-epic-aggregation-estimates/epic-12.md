# Per-Epic-Aggregation Estimate: Epic 12 — Module Marketplace

**Epic ID:** `epic-agg-epic-12`
**Authored:** 2026-06-04 per Tasks 7+8 code-review D-02-resolved (Decision 2026-06-04-016)
**Status:** Solo-builder-author-committed; Trustee ratification pending Task 9 per Decision 2026-06-04-016

---

## §1 Epic identity + worksheet anchor

| Field | Value |
|---|---|
| Worksheet row | `estimation-worksheet.md §7` row `epic-agg-epic-12` |
| Implementing Stories | 12.1–12.6 (6 stories) |
| Story mix | 2 simple + 3 medium + 1 complex = 12 pts |
| Cadence basis | 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved) |
| CI/ADR overhead | 1.32 (Module Marketplace ADR overhead per methodology §4(f)) |
| Substrate-unknown flag | `TBD-pending-external-forum-platform-decision-FR-43A` — surface count may shift ±30% with platform decision |
| Default solo-cadence band given TBD | `low` (per methodology §3 default for `TBD-pending-X-substrate-decision` rows) |
| AI-cadence band | `medium` (this entry's purpose — see §6 rationale) |
| Floor (current) | 0.12 |
| Ceiling (current) | 0.27 |

## §2 Implementation surface inventory (Epic 12 scope per PRD §4.6 FR-43A)

- **External forum integration** — platform-dependent (TBD: Discourse vs Flarum vs Lemmy vs hand-rolled); ~2-4 surfaces depending on platform choice
- **Module-pack discovery + install workflow** — admin UI for trustees to add per-Pariwar custom feature modules; ~2 surfaces
- **Per-Pariwar feature-module activation registry** — Drizzle migration + activation API; ~2 surfaces

Total: ~6-8 surfaces (±30% per platform decision).

## §3 Complexity profile

| Profile | Multiplier | Applies to |
|---|---|---|
| `baseline` | 1.0× | Module-pack discovery + install workflow |
| `external-integration` | +50% | External forum integration (all candidate platforms have integration surface) |
| `multi-tenant-RLS-isolation` | +30% | Per-Pariwar feature-module activation |

Aggregate: bounded. The TBD platform decision affects surface count by ±30% but not complexity profile — every candidate forum platform requires an external-integration surface; the differences are in API shape (REST vs GraphQL) and authentication model (SSO vs federated), not in implementation complexity tier.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — forum integration may surface member identity; baseline-level
- **FR-100 schema-diff + benefit_mechanism tag** — no benefit_mechanism emission (governance content only)
- **UX-DR3 friction-budget gate** — Tier-3 admin surfaces; lower priority
- **Story 1.10 audit-line emission gate** — module-activation events emit audit-log

CI/ADR overhead: 32% (per methodology §4(f) Epic 12 ladder entry — baseline 20% + FR-74 5% + Story 1.10 5% + per-Epic ADR overhead 2% covering forum-platform-selection ADR slot).

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted per `estimation-methodology.md §2 row 2` (D-03-resolved Tasks 7+8 review; ratification pending Task 9 ≥2-trustee co-sign per Decision 2026-06-04-016). 1 AI-cadence month = 346 hr per methodology §2.

**Derivation:** 12 story-points × 4 hr/pt × 1.32 CI/ADR overhead ÷ 346 hr/month = 0.183 months computed midpoint ≈ 0.18 months.

Medium-band asymmetric formula per methodology §3 (factor = 0.5; 1 + factor = 1.5): floor = 0.18 / 1.5 = 0.12; ceiling = 0.18 × 1.5 = 0.27. Medium-band ratio 0.27 ÷ 0.12 = 2.25 ✓ — formula consequence per P-13 tautological-band disclaimer.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.12` |
| `engineer_month_ceiling` | `0.27` |
| `confidence_band` | `medium` (AI-cadence; see §6 rationale below for the `low → medium` reassignment despite TBD platform) |

## §6 AI-cadence band rationale despite TBD FR-43A platform (D-02-resolved 2026-06-04)

`estimation-methodology.md §3` default for `TBD-pending-X-substrate-decision` rows is `low` confidence band (±100%). The Epic 12 worksheet notes column already flags "surface count may shift ±30% with platform decision" — at the `low`-band default, this would yield floor 0.09 / ceiling 0.36, raising `total_estimate_ceiling` by 0.09 (from 13.47 → 13.56) and `ceiling_ratio` from 1.497 → 1.507, crossing the 1.5 trigger.

This entry justifies the `medium` band reassignment on the grounds that **AI-cadence offsets the ±30% surface-count uncertainty** through three mechanisms:

### Mechanism 1 — Substrate-pivot velocity at AI-cadence

The ±30% surface-count uncertainty derives from not knowing which external forum platform will be selected (Discourse / Flarum / Lemmy / hand-rolled). At AI-cadence, the **substrate-pivot velocity** post-platform-decision is dramatically higher than at solo cadence: AI generates per-platform adapter code from API references in hours rather than days. If the platform choice lands at Decision 2026-XX-XXX and the implementation has been built against an abstracted forum-adapter interface, the per-platform adapter swap is a 1-2 day exercise.

This is structurally similar to Epic 4's reassignment (D-01-resolved): substrate-uncertainty is offset by AI-cadence's ability to absorb late-binding decisions efficiently.

### Mechanism 2 — Surface-count delta absorbed within medium-band ceiling

The ±30% surface-count uncertainty translates to ±30% on the midpoint 0.18 → range [0.126, 0.234]. The medium-band ceiling (0.27) covers the upper bound of the ±30% range (0.234) with margin to spare; the low-band ceiling (0.36) is overly conservative because it assumes both ±100% uncertainty AND the ±30% surface-count uncertainty as compounding terms.

The asymmetric-geometric medium-band already encodes "substrate-adjacent; prior art exists elsewhere" — which captures the ±30% surface-count uncertainty more accurately than `low`'s "substrate unbuilt; significant unknowns remain".

### Mechanism 3 — Forum-platform choice is bounded

The TBD is not unbounded — there are ~4 known candidate platforms (Discourse, Flarum, Lemmy, hand-rolled), each with public API documentation and known integration patterns. This is fundamentally different from a `low`-band substrate-unknown case (e.g., Epic 7 Pool Engine atomicity where the substrate ITSELF is the design problem). Epic 12's substrate-unknown is which-of-N rather than what-is-it; AI-cadence handles which-of-N efficiently.

### Trigger-margin disclosure (for trustee review at Task 9)

This reassignment compounds D-01-resolved (Epic 4) in its load-bearing effect on the no-trigger outcome:
- At `low` band (current default): Epic 12 floor 0.09 / ceiling 0.36 (factor 1.0 around midpoint 0.18).
- At `medium` band (this entry): Epic 12 floor 0.12 / ceiling 0.27 (factor 0.5 around midpoint 0.18).
- Delta to total alone: replacing 0.36 → 0.27 reduces `total_estimate_ceiling` by 0.09 (from 13.56 → 13.47).
- Delta to ratio alone: `ceiling_ratio` shifts 1.507 → 1.497, moving below 1.5 trigger.

**Combined with D-01-resolved Epic 4 reassignment**: at the prior code-review state (Epic 4 = `medium`, Epic 12 = `medium`), `ceiling_ratio = 1.497` clears the trigger by 0.003. Reverting EITHER Epic 4 or Epic 12 to `low` fires the trigger; reverting BOTH fires the trigger more decisively (ratio = 1.520 + 0.01 ≈ 1.530).

Trustees should evaluate this rationale on its merits (the three mechanisms above) rather than on its trigger-margin consequence. If trustees reject this reassignment at Task 9 (alone or in combination with D-01), the reconciliation trigger fires and the three-decision-paths taxonomy applies per `reconciliation-decision-framework.md §2`. Decision 2026-06-04-016 records this disclosure transparently alongside the Epic 4 disclosure.

### Open follow-up — Month-3 re-attestation

This row is flagged for **Month-3 re-attestation** along with Epic 4 + the cadence override. By Month 3 the FR-43A platform decision should have landed; the re-attestation will re-baseline Epic 12 surface count against the actual platform choice and either confirm the `medium` band or surface a substrate-pivot ceiling drift requiring mid-cycle escalation per `README.md §6` mid-cycle drift escalation rule.

## §7 Cross-references

- `estimation-worksheet.md §7` row `epic-agg-epic-12`
- `estimation-methodology.md §3` (band tier definitions) + §3-amendment AI-cadence band reassignment sub-rule + §7 explicit-unknowns rule
- `.decision-log.md` Decision 2026-06-04-016 (no-trigger sign-off + Epic 12 reassignment rationale)
- `per-epic-aggregation-estimates/epic-4.md §6` (Epic 4 AI-cadence reassignment — joint rationale class)
- `README.md §6` (Month-3 re-attestation + mid-cycle drift escalation)
- PRD §4.6 FR-43A (Module Marketplace external forum requirement)
- Story 0.15 launch-gate inventory row 12 (Feature-flag tool selection P1 conditional — adjacent observation)
