# Native-Stack-Validation Framework

**Authority cites:** UX §Phase-0 P0-5 (UX spec line 111); UX spec §6 Phase-0 Native-Stack Validation Experiment (UX spec lines 795-854); epics line 564 cross-cutting Phase-0 prereq gates; epics line 688 Epic 0 Deliverable P0-5; epics line 693 Epic 0 demoable closure; epics line 376 UX-DR6; architecture line 331 AR-49 substrate-conditional commitments; architecture lines 150-152 §Deferred Decisions native-mobile-stack; architecture line 4784 §Launch Gate Risks P0-5 row; architecture lines 4873-4878 §PoC Validation Pending; architecture §4.1 + §4.5 + §4.6 + §4.12 (Frontend Stack + MMKV CNG + list virtualization + device-support matrix); PRD §8 NFR Performance (PRD line 1350); Decision 2026-06-02-014.

**Status:** Author-committed 2026-06-02; awaiting Trustee Panel experiment-scope + device-procurement-budget ratification (Task 7) + Solo Builder three-device procurement (Task 8) + ~2-week Expo + RN + Tamagui prototype build (Task 9) + measurement collection (Task 10) + ratify-or-pivot decision proposal + Trustee Panel acknowledgement (Task 11).

## §1 Why a top-level surface

This framework is a new top-level surface under `docs/`, parallel to `docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`, `docs/knowledge-transfer/`, `docs/adr/`, `docs/backup-engineer/`, `docs/fallback-handler-ledger/`, `docs/spec-to-cadence-reconciliation/`, and `docs/legal-counsel-engagement/`. It is broader than any single existing directory's scope — experiment-protocol + device-procurement-roster + measurement-template + pass-criteria-evaluation-framework + ratify-decision-template + pivot-evaluation-decision-tree + engagement-ledger. The unified directory discharges the UX §Phase-0 P0-5 launch-blocker + epics line 564 cross-cutting Phase-0 prereq gate P0-5 + epics line 688 Epic 0 Deliverable P0-5 + epics line 693 Epic 0 demoable closure ("P0-5 prototype produces ratify decision logged in `.decision-log.md`. Engineering substrate gate is open") + AR-49 substrate-conditional commitments + architecture §Launch Gate Risks P0-5 row at architecture line 4784 + architecture §PoC Validation Pending P0-5 commitment as a single trustee-accessible surface.

The rationale mirrors Stories 0.2 / 0.3 / 0.4 / 0.5 / 0.6 / 0.7 / 0.12 / 0.13 README §1 — the native-stack-validation portfolio requires its own unified surface, distinct from but parallel to the other framework portfolios. The portfolio constitutes the **SIXTH Phase-0 portfolio** (see §9 disjoint anchor).

## §2 Framework lifecycle

Author-commit → Trustee Panel experiment-scope + device-procurement-budget ratification (per `device-procurement-roster.md` Rows 1-3 cost_estimate_inr substantive authoring at Task 7 cross-coupled with Story 0.12 contract-help-path budget per `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c)) → Solo Builder three-device procurement (per `device-procurement-roster.md` procurement_status transitions: pending-budget-ratification → budget-ratified → procurement-in-progress → procured → received-and-verified at Task 8) → ~2-week Expo + RN + Tamagui prototype build of the three named patterns under CNG workflow per architecture §4.5 (Task 9) → measurement collection on all three devices under throttled cellular with 54-cell measurement matrix population + evidence capture in `_bmad-output/research/p0-5-native-stack-validation-evidence/` per-device subfolders (Task 10) → pass-criteria evaluation per all-must-hold discipline + FM-2 tiered escalation per pivot-evaluation-decision-tree if any P-criterion fails + ratify-or-pivot decision proposal (Task 11) → Trustee Panel acknowledgement (≥1-trustee per BigDev decision authority per UX spec line 845) + `.decision-log.md` Decision 2026-06-02-014 supersession entry + ADR-NNNN-native-mobile-stack-ratify substantive content + Epic 1 substrate-work unblock signal + Story 0.10 P0-2c PRECONDITION-2 unblock signal.

## §3 Four-way property/control/policy/gap-analysis discipline

Mirroring Story 0.4 + 0.5 + 0.6 + 0.7 + 0.12 + 0.13 pattern, per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]] + [[feedback_gap_analysis_observational]] + [[feedback_closure_language_precision]]:

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-committed) | Substrate ratifies on P0-5; substrate-conditional engineering not frozen until P0-5 closes (AR-49); FM-2 tiered escalation discipline; CNG workflow not Expo Go; MMKV is the offline persister; FlatList → FlashList criteria (specific threshold = P0-5 output); Android 9+ Snapdragon 4-series 3GB floor; iOS 16+; Devanagari typography stack (Tiro/Noto/Plex) | architecture §4.1 + §4.5 + §4.6 + §4.12 + architecture lines 150-152 + AR-49 line 331 |
| **Policy** (PRD/UX-committed) | Experiment scope (three named patterns × three test devices × ~2-week timebox); pass criteria P1-P6 all-must-hold; fail criteria F1-F5 + FM-2 tiered escalation; BigDev decision authority per UX spec line 845; binding-for-v1-substrate; re-litigation requires new ADR plus trustee-ratified justification per epics line 941; validate-or-pivot NOT decide-from-scratch per UX spec line 799 | UX spec §6 lines 795-854; epics lines 564 + 688 + 693 + 376 + 941; PRD §8 NFR Performance |
| **Control** (this Story's framework + the ratify decision) | `experiment-protocol.md` + `device-procurement-roster.md` + `measurement-template.md` + `pass-criteria-evaluation-framework.md` + `ratify-decision-template.md` + `pivot-evaluation-decision-tree.md` + `engagement-ledger.md` + Decision 2026-06-02-014 + ADR-NNNN-native-mobile-stack-ratify substantive content at Task 11 | This directory (`docs/native-stack-validation/`) + `_bmad-output/research/p0-5-native-stack-validation.md` + `docs/knowledge-transfer/adr-index.md` line 52 |
| **Gap analysis** (observational) | Story 0.15 architectural launch-gate inventory consumes Story 0.14 closure as closure-evidence for the architecture line 4784 P0-5 row; Story 0.10 P0-2c PRECONDITION-2 prototype-operability depends on Story 0.14 closure; Story 0.12 P0-3 reconciliation device-procurement budget cross-couples with Story 0.14 Task 7 budget ratification | `engagement-ledger.md` §11 cross-links; Story 0.15 architectural launch-gate inventory; Story 0.10 + Story 0.12 cross-references |

The gap-analysis layer does NOT prescribe sprint planning or override architecture — it observes incompleteness/risk and proposes conditional escalation paths per [[feedback_gap_analysis_observational]].

## §4 Structural invariants

The following invariants are load-bearing properties of this framework. Violation of any invariant is a framework-discipline breach and triggers an Open Question.

1. **Experiment is bounded ~2-week timebox** per UX spec line 801. F4 fail-criterion activates if >3× target timebox per UX spec line 839; measured calendar-time NOT wall-clock-engineering-time per `experiment-protocol.md` §7.
2. **Pass criteria is all-must-hold** per UX spec line 814 "Pass criteria — all must hold". The verdict aggregation rule (per `pass-criteria-evaluation-framework.md` §3) requires all 54 cells = `pass` OR `mitigated-pass` with per-mitigation-evidence; any single `fail` after FM-2 escalation exhausts mitigation triggers pivot decision.
3. **FM-2 tiered escalation is mandatory + substrate pivot is last resort** per UX spec line 762 + 831 + 843. The Phase-0 experiment surfaces issues and documents mitigation outcomes; does NOT auto-trigger substrate pivot; pivot is never first response. F1-F5 response paths committed in `pivot-evaluation-decision-tree.md`.
4. **BigDev is the decision authority** per UX spec line 845. The ratify (or pivot) decision is BigDev's call recorded as `.decision-log.md` Decision 2026-06-02-014 with trustee acknowledgement (not trustee-ratified-decision).
5. **Ratify decision binds v1 substrate** per UX spec line 845. The substrate-binding-language for Epic 1 (per `ratify-decision-template.md` §5) is the verbatim text Epic 1 Story 1.1 line 990 consumes via "Given Story 0.14's ratified substrate decision".
6. **Re-litigation requires new ADR plus trustee-ratified justification** per epics line 941. Any future proposal to amend the substrate decision post-Epic-1 (e.g., RN+Tamagui → Flutter pivot after v1 ships; FM-2 escalation that surfaces post-launch) requires a new ADR superseding ADR-NNNN-native-mobile-stack-ratify + a new `.decision-log.md` Decision entry with **≥2-trustee ratification** (heightened threshold per substrate-change-disruption-cost discipline; distinct from the initial ≥1-trustee acknowledgement threshold at Task 11).
7. **The experiment is validate-or-pivot NOT decide-from-scratch** per UX spec line 799. The working assumption is RN + Tamagui ratifies-unless-fail; the experiment surfaces measurement evidence to confirm OR trigger FM-2 escalation; the experiment is NOT a "decide native vs PWA from scratch" exercise per UX spec line 850.
8. **Design-spec-work-proceeds-in-parallel-non-blocking** per UX spec line 847. UX/design spec work continues during the ~2-week experiment; the experiment is the engineering-substrate validation lane, not a design freeze.
9. **The experiment is NOT a deep accessibility audit** per UX spec line 851. WCAG 2.1 AA + Radix primitives validation is Story 0.10 P0-2c territory; the P0-5 experiment validates Devanagari rendering as FM-2's validation gate (P1) only.
10. **The experiment is NOT a security review** per UX spec line 852. Security review is handled separately per PRD §4.13.
11. **The experiment is NOT a full functional test** per UX spec line 853. Three named patterns are representative samples of the broader Tier-1 + Tier-2 + Tier-3 surface inventory; the experiment validates substrate fitness, not full functional coverage.
12. **The experiment is NOT optional** per UX spec line 854. Substrate-dependent engineering does not begin without the experiment's ratify decision per Epic 1 Story 1.1 line 990 precondition.
13. **The more-protective-governs disposition forbids rounding-up sub-threshold measurements** per [[feedback_closure_language_precision]] + `pass-criteria-evaluation-framework.md` §2. A 28-fps measured value on the older entry-level Android is NOT rounded to "30 fps minimum" — the cell is `fail` and the pivot-evaluation-decision-tree fires; a 93% push delivery rate is NOT rounded to "≥95% delivery success" — the cell is `fail` and F3 evaluation fires.
14. **The trustee threshold is ≥1-trustee acknowledgement** (distinct from prior Stories ≥2-trustee quorum) per BigDev decision authority per UX spec line 845. BigDev-decision-with-trustee-acknowledgement, not trustee-ratified-decision. Re-litigation post-Epic-1 requires ≥2-trustee ratification (heightened threshold per invariant 6).
15. **CNG workflow not Expo Go** per architecture §4.5 + §4.12. MMKV + native modules require Continuous Native Generation. Expo Go shortcuts are forbidden for the P0-5 prototype build at Task 9.
16. **54-cell completeness is structural** — at Task 11 ratify-decision proposal, no cell may remain `_PENDING-MEASUREMENT_` literal; silent-pass is forbidden per `pass-criteria-evaluation-framework.md` §6. The 54-cell matrix is the load-bearing evidence artifact.

## §5 Sign-off lifecycle

**Framework-ratification gate:** ≥1-trustee acknowledgement at Task 11 ratify-or-pivot decision event (distinct from prior Stories ≥2-trustee quorum per BigDev decision authority per UX spec line 845). The Trustee Panel scope ratification at Task 7 ratifies experiment scope + device-procurement budget (≥2-trustee per prior-Story pattern because this is a budget commitment, not a substrate decision); the substrate decision at Task 11 acknowledgement is the BigDev-decision-with-trustee-acknowledgement event.

**Ratification modes at Task 7 (per Trustee Panel choice):**
- **Pack-as-a-unit** (default) — Trustee Panel ratifies the experiment-protocol + device-procurement-roster + cost-estimate in one session
- **Per-component** — Trustee Panel ratifies experiment-scope + device-procurement-budget + per-device cost separately; requires both trustees to agree on the per-component mode

**Quorum-unavailable fallback path (Task 7 budget ratification only):** emergency single-trustee budget-ratification valid under documented trustee incapacitation, time-bounded 30 days per Story 0.9 D-02 + Story 0.7 README §5 precedent; recorded as `.decision-log.md` `[VALIDATION]` entry per the supersession schema; second-trustee re-review required at day 30; if second-trustee reverses, all procurement events made under the now-reversed decision must be rolled back via supersession entry + return-to-vendor where possible OR retain-as-test-device + treat as sunk cost per Solo Builder + ≥1-trustee co-sign.

**Re-litigation discipline (post-Epic-1 substrate change):** heightened threshold of ≥2-trustee ratification + new ADR superseding ADR-NNNN-native-mobile-stack-ratify; rationale: post-Epic-1 substrate change carries higher disruption-cost (rewrite all substrate-dependent code) than initial Phase-0 ratification.

**Fail-criterion-triggered FM-2 escalation:** per `pivot-evaluation-decision-tree.md`, any single P-criterion `fail` on any device triggers FM-2 tiered escalation (NOT auto-trigger of substrate pivot); mitigation steps documented in `measurement-template.md` mitigation_notes_if_fail + re_measurement_after_mitigation columns; mitigated-then-ratify decision authored if mitigation succeeds; pivot decision authored if mitigation exhausted.

## §6 Re-attestation cadence fallback

**NOT applicable as periodic re-attestation** — the P0-5 ratify decision is one-time per substrate; re-litigation is event-driven not periodic; substrate-pivot evaluation is FM-2 escalation event-driven per UX spec line 831.

**Event-driven re-evaluation triggers:**
- **Post-launch FM-2 escalation surfaces** — e.g., post-v1-ship Devanagari rendering issue on a previously-untested device class → re-evaluation via FM-2 tiered escalation → if mitigation exhausted, ADR-NNNN-native-mobile-stack-ratify supersession + new substrate ratify decision per re-litigation discipline (§5 + invariant 6)
- **Tamagui or React Native community-direction shift** (F5 fail-criterion post-launch) — breaking release announced; maintainer departure; license change; published critical CVE without timely patch → re-evaluation per `pivot-evaluation-decision-tree.md` F5 path; if substantive shift, new ADR + ≥2-trustee ratification per re-litigation discipline
- **Architecture-amendment surfaces native-stack assumption change** — e.g., architecture §4.5 MMKV-CNG dependency drops; architecture §4.12 device-support matrix changes the floor → re-evaluation triggered by the architecture-amendment Story (PR-2 ADR-transcription discipline per architecture §Implementation Handoff)
- **Per-major-platform-version-update** — annual iOS major version (e.g., iOS 17 release) OR Android major version updates that materially affect P1-P6 measurements MAY trigger re-evaluation; Solo Builder discretion; non-binding cadence anchor

## §7 Open ADR slots

Per [[feedback_architecture_vs_adr_boundary]], the framework commits the property; specific control mechanisms are ADR territory. The following slots are deferred-with-ADR or pending-substantive-write at Task 11:

1. **Specific Snapdragon 4-series Android model choice** — candidate options: Redmi 10A / Realme C30 / Moto G14 / Samsung Galaxy A05 / Tecno Spark 10C; selection at Task 8 trustee-or-Solo-Builder discretion
2. **Specific 2GB-RAM Android 11 model choice** — candidate options: Redmi 9A / Lava Yuva 2 / Itel A60 / Samsung Galaxy A04e; selection at Task 8
3. **Specific iPhone iOS 16+ model choice** — candidate options: iPhone SE 2nd-gen / iPhone 8 / iPhone XR; cost-vs-spec tradeoff at Task 8
4. **FlatList → FlashList threshold** per architecture line 2913 + line 2670 — the prototype-experiment establishes the row-count threshold; landing at Task 10 measurement output + Task 11 decision
5. **Specific MMKV persister configuration** — encryption-at-rest (yes/no for non-PII operational state); storage-key namespacing scheme; cross-process access pattern
6. **Specific FCM topic-strategy** — per-user topic vs per-cohort topic vs broadcast topic; cross-coupling with FR-94 push messaging architecture
7. **Specific push notification batch test methodology** — test-notification batch size; latency-measurement instrumentation; cross-device clock-synchronization
8. **Specific 4G throttling tool selection** — Network Link Conditioner iOS vs developer-options throttling Android vs Charles Proxy vs commercial mid-tier-Android cellular emulator
9. **Specific Devanagari font-loading mechanism** — bundled with the app vs CDN-loaded vs OS-fallback-only; cross-coupling with offline cache + P4 measurement
10. **Specific Tamagui theme configuration for prototype** — Tamagui v1.x theme tokens; design-token consumption pattern (hand-rolled `@twt/tokens` TS module per UX spec line 651); per-pattern theme override mechanism
11. **ADR-NNNN-native-mobile-stack-ratify substantive content** — slot pre-staged at `docs/knowledge-transfer/adr-index.md` line 52 (`slot-reserved-pre-write` status); substantive ADR content populated at Task 11 per architecture §Implementation Handoff PR-2 ADR-transcription discipline; cites Decision 2026-06-02-014 + per-criterion evidence summary + FM-2 escalation trace if applicable

## §8 Related continuity + governance surfaces table

| Framework portfolio | Owning Story | Discharges | Location |
|---|---|---|---|
| Operational runbooks | Story 0.1 | Operational-readiness ledger + 7 Phase-0 runbooks | `docs/runbooks/` |
| Credential escrow | Story 0.2 | Production credentials sealed; trustee quorum recovery | `docs/escrow/` |
| Code escrow | Story 0.3 | Repo auto-mirror to trustee-controlled location | (Story 0.3 framework path) |
| Degradation policy | Story 0.4 | Per-surface stance + 5-channel comms templates + table-top runbook | `docs/degradation-policy/` |
| Knowledge transfer pack | Story 0.5 | ADRs + Niyamavali→FR mapping + deployment topology + on-call playbook + third-party-dependency inventory | `docs/knowledge-transfer/` |
| Backup engineer | Story 0.6 | A-13 retainer + scope-of-work + access-grant + onboarding + activation procedure | `docs/backup-engineer/` |
| Fallback-handler ledger | Story 0.7 | Per-loop-node fallback-handler ledger + SLA + rota + Operations Lead | `docs/fallback-handler-ledger/` |
| Spec-to-cadence reconciliation | Story 0.12 | Engineer-month estimate vs SM-1 6-9 month reconciliation + cut-scope/move-SM-1/contract-help framework | `docs/spec-to-cadence-reconciliation/` |
| Legal-counsel engagement | Story 0.13 | Concurrent-review engagement covering 5 AC-named scope items + ~32-row cross-Story deferred-scope inventory + regulatory surface + ADR slot review | `docs/legal-counsel-engagement/` |
| **Native-stack validation** | **Story 0.14** | **~2-week prototype + P1-P6 pass criteria + ratify decision (or FM-2-traced pivot)** | **`docs/native-stack-validation/` (this directory)** |
| Architectural launch-gate inventory | Story 0.15 | All architecture §Launch Gate Risks entries scheduled with named owner + closure criteria + target date | (Story 0.15 framework path; pending) |

## §9 Disjoint anchor — Story 0.14 is the SIXTH Phase-0 portfolio

Story 0.14 is **distinct from five preceding Phase-0 portfolios** and constitutes the sixth:

- **Bus-factor-of-one mitigation portfolio (Stories 0.1-0.6)** discharges "the trust survives Solo Builder unavailability >7 days"
- **Loop-node operational-responsiveness portfolio (Story 0.7)** discharges "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails"
- **Empathy field-work portfolio (Stories 0.8-0.11)** discharges "downstream design decisions in Epics 3, 6, 8, 10 are grounded in lived experience, not assumption"
- **Spec-to-cadence-funding-reconciliation portfolio (Story 0.12)** discharges "the engineer-month estimate vs SM-1 6-9 month target mismatch is resolved on-the-record via cut-scope / move-SM-1 / contract-help before Epic 1 substrate work commits"
- **Legal-counsel-concurrent-review portfolio (Story 0.13)** discharges "trust-posture copy + DPDPA consent flow + denial-appeal flow procedural fairness + Account State Machine transition table + dual-path claim authority-to-file evidentiary specification gain counsel review BEFORE Epic 1 substrate work commits"
- **Native-stack-validation portfolio (Story 0.14)** discharges "RN + Tamagui working assumption is empirically validated on three test devices before substrate-dependent engineering begins; ratify (or FM-2-traced pivot) decision binds the v1 substrate"

The six portfolios have **disjoint closure semantics**:

- All other portfolios fully discharged but Story 0.14 undischarged → trust commits to substrate-dependent engineering on an aspirational-not-validated working assumption; first P1-P6 surface in Epic 1 substrate work catches a fail-criterion → rewrite under time pressure → schedule slip + technical-debt accrual; architecture §Launch Gate Risks P0-5 row remains `open`; AR-49 substrate-conditional commitments never resolve
- Story 0.14 fully discharged but bus-factor portfolio undischarged → trust ships Phase-1 on validated substrate but cannot survive Solo Builder unavailability >7 days
- Story 0.14 fully discharged but loop-node portfolio undischarged → trust ships Phase-1 with no fallback handlers reachable when automation fails
- Story 0.14 fully discharged but legal-counsel portfolio undischarged → trust ships Phase-1 with legal-exposure surface unreviewed
- Story 0.14 fully discharged but Story 0.12 undischarged → trust ships Phase-1 on aspirational 6-9 month timeline despite the engineer-month vs SM-1 mismatch
- Story 0.14 fully discharged but empathy portfolio undischarged → trust ships Phase-1 with PRD/UX assumptions unvalidated against lived experience
- **All six portfolios required for Phase-1 launch readiness.** Story 0.14 closure unblocks the Epic 1 substrate work P0-5 leg + Story 0.10 P0-2c PRECONDITION-2 prototype-operability unblock + AR-49 P0-5 commitment + architecture §Launch Gate Risks P0-5 row closure-evidence path + architecture §PoC Validation Pending P0-5 commitment.

The 30-day-takeover joint-discharge anchor (per Story 0.3 + 0.4 + 0.5 + 0.6 + 0.7 + 0.12 + 0.13 disjoint-anchor patterns) is the bus-factor-portfolio joint-discharge; Story 0.14 does NOT contribute to it. The UX §Phase-0 P0-5 + epics line 564 + 688 + 693 + AR-49 + architecture §Launch Gate Risks P0-5 + architecture §PoC Validation Pending P0-5 discharge is the native-stack-validation-portfolio closure; Stories 0.1-0.13 do NOT contribute to it.

## §10 Domain glossary

- **P0-5** — Phase-0 launch-blocker #5, the native-stack validation experiment per UX spec line 111 + UX §6 + epics line 688
- **UX §Phase-0 P0-5** — UX spec line 111 launch-blocker text; UX spec lines 795-854 full experiment specification
- **epics line 564 Phase-0 prereq gate** — "Phase-0 prereq gates (P0-1, P0-3, P0-4, P0-5) — gate *all* engineering, not just the epics that explicitly list them"
- **AR-49** — architecture line 331 commitment "Substrate-conditional implementation commitments not frozen until P0-5 closes; exploration/prototyping/validation may proceed"
- **UX-DR6** — epics line 376 P0-5 Native-Stack Validation Experiment derivation rule with pass criteria P1-P6 enumeration
- **FM-1** — substrate-agnostic adapter layer (Stories 1.x); not load-bearing for P0-5; cross-referenced in F5 fail-criterion pivot path
- **FM-2** — Devanagari validation gate + tiered escalation (empirical, no hardcoded ladder, no auto-pivot) per UX spec line 762; mandatory mitigation discipline before pivot evaluation per UX spec line 831
- **Expo** — React Native managed-workflow toolchain; the prototype build at Task 9 uses Expo CNG (Continuous Native Generation) per architecture §4.5
- **React Native** — RN; the native substrate working assumption per architecture §4.1; ratifies via P0-5
- **Tamagui** — RN/Web component + theming library; the working-assumption design-system per architecture §4.1 + UX §6 token consumption
- **CNG workflow** — Continuous Native Generation; Expo's prebuild-then-build flow for native modules (MMKV, etc.); NOT Expo Go shortcut
- **Expo Router** — Expo's file-system routing per architecture §4.7
- **Hermes** — RN's JS engine default per architecture line 589; no alternative considered at v1
- **MMKV** — JSI-based key-value storage per architecture §4.5; ~10-30× faster than AsyncStorage; the P4 offline cache backbone
- **FCM** — Firebase Cloud Messaging (Android push notifications) per architecture §3.3
- **APNs** — Apple Push Notification service (iOS push notifications) per architecture §3.4
- **FlatList** — RN's default virtualized list with tuned `windowSize` + `maxToRenderPerBatch` per architecture §4.6
- **FlashList** — Shopify's drop-in FlatList replacement with consistently better performance at scale per architecture §4.6; the prescribed library above the threshold
- **Tiro Devanagari Hindi** — display serif typeface per UX spec line 712
- **Noto Sans Devanagari** — body sans-serif typeface per UX spec line 713
- **IBM Plex Mono Devanagari** — tabular monospace typeface per UX spec line 714
- **UPI Intent** — Unified Payments Interface deep-link mechanism (`upi://pay?` URL scheme); launches default UPI app per architecture line 90
- **PhonePe / GPay / BHIM** — three named UPI apps validated in P2 measurement per UX spec line 818
- **Throttled cellular simulation** — Network Link Conditioner iOS / developer-options throttling Android; simulates intermittent 4G per UX spec line 820
- **Cold-start** — first launch from no-process state; performance benchmark per PRD §8 NFR Performance ("< 3 s on mid-range Android (Snapdragon 4-series, 3 GB RAM)" per PRD line 1350)
- **p95** — 95th percentile latency measure; the P3 push notification latency benchmark target is ≤5s per UX spec line 820
- **Per-pattern build checklist** — Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard build checklist per `experiment-protocol.md` §4
- **Per-device run checklist** — mid-range Android + entry-level Android + iPhone iOS 16+ run checklist per `experiment-protocol.md` §5
- **Per-criterion measurement procedure** — P1-P6 measurement procedures per `experiment-protocol.md` §6
- **Pass-criteria all-must-hold** — verdict aggregation rule per UX spec line 814 + `pass-criteria-evaluation-framework.md` §3
- **Fail-criteria F1-F5** — F1 Devanagari render fail / F2 UPI Intent fail / F3 push fail / F4 velocity fail / F5 community-direction shift per UX spec lines 830-843
- **Pivot-evaluation** — F1-F5 fail-criteria response paths per `pivot-evaluation-decision-tree.md`
- **Ratify-or-pivot** — Task 11 decision outcomes per `ratify-decision-template.md` §1
- **Mitigated-then-ratify** — mixed verdict (some cells `pass`, some `mitigated-pass` with per-mitigation-evidence) — the FM-2 escalation succeeded
- **Substrate-binding-language** — the verbatim text Epic 1 Story 1.1 line 990 consumes via "Given Story 0.14's ratified substrate decision" per `ratify-decision-template.md` §5
- **Re-litigation discipline** — post-Epic-1 substrate-change requires new ADR + ≥2-trustee ratification per epics line 941 + §5 + invariant 6

## §11 File index

| File | Purpose | Author-commit status |
|---|---|---|
| `README.md` (this file) | Framework manifesto + 11 sections per Story 0.14 Task 1 | Closed by [edit] 2026-06-02 |
| `experiment-protocol.md` | UX spec §6 protocol skeleton + per-pattern/device/criterion procedures + timebox + FM-2 + decision authority | Closed by [edit] 2026-06-02 |
| `device-procurement-roster.md` | 3 placeholder rows for the three target devices; cost_estimate_inr at Task 7; procurement event at Task 8 | Closed by [edit] 2026-06-02 (rows pre-staged at `pending-budget-ratification`) |
| `measurement-template.md` | 54-cell measurement matrix (3 devices × 3 patterns × 6 criteria) with `_PENDING-MEASUREMENT_` literal in every cell; substantive measurements at Task 10 | Closed by [edit] 2026-06-02 (cells pre-staged) |
| `pass-criteria-evaluation-framework.md` | All-must-hold discipline + more-protective-governs disposition + verdict aggregation rule + WCAG 2.1 AA cross-coupling + silent-pass forbidden rule | Closed by [edit] 2026-06-02 |
| `ratify-decision-template.md` | §1-§8 decision schema; substantive content at Task 11 | Closed by [edit] 2026-06-02 (scaffolded) |
| `pivot-evaluation-decision-tree.md` | F1-F5 fail-criteria response paths verbatim from UX spec lines 830-843 | Closed by [edit] 2026-06-02 (structural-only) |
| `engagement-ledger.md` | 12 §-log sections tracking the experiment lifecycle | Closed by [edit] 2026-06-02 (schema-only) |

**External (referenced from this framework):**

- `_bmad-output/research/p0-5-native-stack-validation.md` — AC-named research artifact per epics line 936 scaffolded with `_PENDING-MEASUREMENT_` + `<TO-BE-AUTHORED-AT-TASK-11>` placeholders
- `_bmad-output/research/p0-5-native-stack-validation-evidence/` — evidence subdir with per-device subfolders + README scaffold
- `.decision-log.md` — Decision 2026-06-02-014 (author-commit) + supersession entry at Task 11 (substantive ratify-or-pivot outcome)
- `docs/knowledge-transfer/adr-index.md` line 52 — ADR-NNNN-native-mobile-stack-ratify slot (`slot-reserved-pre-write` at author-commit; substantive content at Task 11)
