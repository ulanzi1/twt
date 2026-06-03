# Ratify-Decision Template — P0-5 Native-Stack Validation

**Status:** Author-committed scaffolding with §1-§7 carrying `<TO-BE-AUTHORED-AT-TASK-11>` placeholders; §8 cross-link to `.decision-log.md` Decision 2026-06-02-014 entry slot committed.

**Authority cites:** UX spec line 845 (BigDev decision authority + binding-for-v1-substrate); UX spec lines 830-843 (F1-F5 fail-criteria response paths); epics line 941 (re-litigation requires new ADR plus trustee-ratified justification); architecture line 4784 (P0-5 Launch Gate Risks row); architecture lines 150-152 (native-mobile-stack deferred-decision); `pass-criteria-evaluation-framework.md` §3 verdict aggregation rule; `pivot-evaluation-decision-tree.md` F1-F5 paths; `measurement-template.md` 54-cell matrix; `_bmad-output/research/p0-5-native-stack-validation.md` §5-§9; Decision 2026-06-02-014.

## §1 Decision outcome

`<TO-BE-AUTHORED-AT-TASK-11>`

**Possible outcomes per `pass-criteria-evaluation-framework.md` §3:**

- `ratify` — all 54 cells = `pass` (or `pass` + carve-out `not-applicable-iOS-OS-level-different`); substrate-binding-language for Epic 1 = "Expo + React Native + Tamagui is the v1 native member-app substrate per Decision 2026-06-02-014"
- `pivot` — any cell = `fail` after FM-2 tiered escalation exhausts mitigation; substrate-binding-language reflects pivot path per `pivot-evaluation-decision-tree.md` F1-F5
- `mitigated-then-ratify` — cells include `pass` + `mitigated-pass` (with per-mitigation-evidence); no `fail`; substrate-binding-language as in `ratify` with §4 FM-2 escalation trace documenting the per-mitigation-evidence cycle

**Decision authority**: BigDev per UX spec line 845. The ratify (or pivot) decision is BigDev's call; the Trustee Panel acknowledges per §6.

**Author commitment**: this template is populated at Task 11 by Solo Builder + ≥1 acknowledging Trustee. The substantive decision content is recorded as a `.decision-log.md` Decision 2026-06-02-014 supersession entry per §8.

## §2 Per-criterion evidence summary

One row per P1-P6 criterion with aggregate verdict across all three devices + evidence-links.

`<TO-BE-AUTHORED-AT-TASK-11>`

**Template schema** (populated at Task 11):

| Criterion | Aggregate verdict | Per-device cells | Evidence-links | Notes |
|---|---|---|---|---|
| P1 Devanagari | `<verdict>` | Device 1: `<verdict>`, Device 2: `<verdict>`, Device 3: `<verdict>` | `<evidence-links>` | `<notes>` |
| P2 UPI Intent | `<verdict>` | Device 1: `<verdict>`, Device 2: `<verdict>`, Device 3: `<verdict>` (iPhone may be `not-applicable-iOS-OS-level-different` per `experiment-protocol.md` §6.2) | `<evidence-links>` | `<notes>` |
| P3 Push notifications | `<verdict>` | Device 1: `<verdict>`, Device 2: `<verdict>`, Device 3: `<verdict>` (FCM Android + APNs iOS) | `<evidence-links>` | `<notes>` |
| P4 Offline cache | `<verdict>` | Device 1: `<verdict>`, Device 2: `<verdict>`, Device 3: `<verdict>` | `<evidence-links>` | `<notes>` |
| P5 List performance | `<verdict>` | Device 1: `<verdict>`, Device 2: `<verdict>` **LOAD-BEARING per UX spec line 824**, Device 3: `<verdict>` | `<evidence-links>` | `<notes>` |
| P6 No blocking deps | `<verdict>` | Cross-device timebox observation over ~2-week period | `<evidence-links>` | `<notes>` |

## §3 Per-device evidence summary

One row per device with aggregate verdict across all three patterns × six criteria + evidence-links.

`<TO-BE-AUTHORED-AT-TASK-11>`

**Template schema:**

| Device | Aggregate verdict | Per-pattern × per-criterion summary | Evidence-links | Notes |
|---|---|---|---|---|
| `device-mid-range-snapdragon-4-series-android` | `<verdict>` | 18 cells (3 patterns × 6 criteria) — summary table | `<evidence-links>` | `<notes>` |
| `device-entry-level-2gb-android-11` | `<verdict>` | 18 cells — **load-bearing for P5 per UX spec line 824** | `<evidence-links>` | `<notes>` |
| `device-iphone-ios-16-minimum` | `<verdict>` | 18 cells — P2 cells may include `not-applicable-iOS-OS-level-different` carve-out | `<evidence-links>` | `<notes>` |

## §4 FM-2 escalation trace

Populated if any `fail` surfaced during Task 10 measurement; documents the tiered-mitigation steps taken per UX spec line 762 + 831 + 843 + `experiment-protocol.md` §8.

`<TO-BE-AUTHORED-AT-TASK-11>`

**Template schema** (per escalation event):

```yaml
escalation_event_id: <event-N>
triggering_cell_id: <cell-id from measurement-template.md §3>
triggering_criterion: <p1|p2|p3|p4|p5|p6>
triggering_device: <device_id>
triggering_pattern: <pattern_id>
fail_verdict_observed: <observed_value at fail>
F_criteria_activated: [<F1|F2|F3|F4|F5>]  # list; multiple criteria may activate; most-severe-governs per pivot-evaluation-decision-tree.md §1
mitigation_attempts:
  - attempt_N: <description per experiment-protocol.md §8 candidate>
    re_measurement_value: <observed value post-mitigation>
    mitigation_outcome: <succeeded|failed|partial>
final_outcome: <mitigated-pass|fail-after-exhausted-mitigation>
evidence_links: [<paths to evidence>]
notes: <free-form rationale>
```

**No-escalation case**: if all 54 cells = `pass` (or `pass` + carve-out), this §4 is populated with "No FM-2 escalation events; all measurements at first-pass within threshold; ratify decision per §1".

## §5 Substrate-binding-language for Epic 1

The verbatim text Epic 1 Story 1.1 line 990 consumes via "Given Story 0.14's ratified substrate decision".

`<TO-BE-AUTHORED-AT-TASK-11>`

**Template — ratify outcome:**

> "Expo + React Native + Tamagui is the v1 native member-app substrate per Decision 2026-06-02-014; substrate-dependent engineering proceeds with this binding. ADR-NNNN-native-mobile-stack-ratify slot at `docs/knowledge-transfer/adr-index.md` line 52 substantively populated with the per-criterion evidence summary + Trustee Panel acknowledgement event."

**Template — pivot outcome:**

> "<pivot-substrate-name per pivot-evaluation-decision-tree.md F<N> path> is the v1 native member-app substrate per Decision 2026-06-02-014; substrate-pivot rationale documented in §4 FM-2 escalation trace. ADR-NNNN-native-mobile-stack-ratify slot substantively populated with the FM-2 escalation trace + pivot decision + Trustee Panel acknowledgement event."

**Template — mitigated-then-ratify outcome:**

> "Expo + React Native + Tamagui with [N] documented mitigations per §4 FM-2 escalation trace is the v1 native member-app substrate per Decision 2026-06-02-014; substrate-dependent engineering proceeds with this binding + the §4 mitigations applied as binding configuration. ADR-NNNN-native-mobile-stack-ratify slot substantively populated."

## §6 Trustee acknowledgement record

≥1-trustee acknowledgement per epics line 937 + UX spec line 845 BigDev decision authority. **The trustee-quorum threshold here is ≥1** (distinct from the ≥2-trustee quorum used in Stories 0.1/0.2/0.3/0.4/0.5/0.6/0.7/0.12/0.13).

`<TO-BE-AUTHORED-AT-TASK-11>`

**Rationale for ≥1-trustee threshold (not ≥2):**

- BigDev's decision authority per UX spec line 845 makes this **BigDev-decision-with-trustee-acknowledgement** rather than trustee-ratified-decision.
- The trustee acknowledgement event records the Trustee Panel's awareness + non-objection; it is not a co-decision event.
- The threshold is documented explicitly in `README.md` §5 + invariant 14 to prevent quorum-confusion at Task 11.

**Re-litigation discipline (post-Epic-1 substrate change)** per `README.md` invariant 6 + §5 + epics line 941: heightened threshold of **≥2-trustee ratification** + new ADR superseding ADR-NNNN-native-mobile-stack-ratify; rationale: post-Epic-1 substrate change carries higher disruption-cost (rewrite all substrate-dependent code) than initial Phase-0 ratification.

**Template schema** (populated at Task 11):

```yaml
acknowledgement_event:
  date: <YYYY-MM-DD>
  acknowledging_trustees: [<trustee-name-1>, ...]  # ≥1 required
  decision_outcome_acknowledged: <ratify|pivot|mitigated-then-ratify>
  substrate_binding_name: <Expo + RN + Tamagui | <pivot-substrate>>
  trustee_notes: <free-form>
  cross_reference: ".decision-log.md Decision 2026-06-02-014 supersession entry"
```

## §7 Re-litigation discipline

Per epics line 941 verbatim: "re-litigation requires a new ADR plus trustee-ratified justification".

**Substantive content** (populated at Task 11):

Any future proposal to amend the substrate decision (e.g., RN+Tamagui → Flutter pivot after v1 ships; FM-2 escalation that surfaces post-launch) requires:

1. A new ADR superseding ADR-NNNN-native-mobile-stack-ratify per architecture §Implementation Handoff PR-2 ADR-transcription discipline
2. A new `.decision-log.md` Decision entry with **≥2-trustee ratification** (heightened threshold per substrate-change-disruption-cost discipline)
3. A new substrate-validation experiment (mini-P0-5) appropriate to the change scope — full ~2-week experiment for major substrate change (e.g., RN → Flutter); narrower experiment for minor change (e.g., Tamagui → custom theme system)
4. A new substrate-binding-language commitment for affected Epic surfaces (per §5)

**Cross-reference**: re-litigation events are recorded in `engagement-ledger.md` §10 Pack-revision log + `.decision-log.md` new Decision entry; the prior Decision 2026-06-02-014 is preserved as the historical baseline.

## §8 Cross-link

- `.decision-log.md` Decision 2026-06-02-014 entry slot (author-commit entry; supersession entry at Task 11 with substantive outcome)
- `pass-criteria-evaluation-framework.md` §3 verdict aggregation rule
- `pivot-evaluation-decision-tree.md` F1-F5 fail-criteria response paths
- `measurement-template.md` 54-cell matrix
- `_bmad-output/research/p0-5-native-stack-validation.md` §5-§9 substantive evidence sections
- `docs/knowledge-transfer/adr-index.md` line 52 — ADR-NNNN-native-mobile-stack-ratify slot
- `engagement-ledger.md` §7 Pass-criteria-evaluation log + §8 Ratify-or-pivot decision log + §9 Epic 1 substrate-work unblock signal + §10 Pack-revision log
- `_bmad-output/planning-artifacts/epics.md` Story 1.1 line 990 — Epic 1 substrate-work precondition consumer
- `_bmad-output/planning-artifacts/architecture.md` §Implementation Handoff PR-2 ADR-transcription discipline
