# P0-2c VI/Low-Vision Member Accessibility Validation Protocol

> This framework discharges the **UX-DR5 P0-2c empathy-field-work leg** by committing the protocol, consent, recruitment, **trustee-approval-pre-session**, **prototype-operability-verification**, **AT-pre-flight**, **UX-DR clause-evaluation**, **accessibility-debt classification**, and **synthesis-schema** property + scaffolding. Substantive trustee approval + prototype-operability verification + AT-pre-flight + session conduct + synthesis are Tasks 7-9 _AWAITING EXTERNAL ACTION_. Trustee review is Task 10. Divergence reconciliation + UX-DR66/67/68 revision integration + accessibility-debt tracking is Task 11 + downstream Epic 3 / Epic 8 / Story 7.10 design-freeze conversations + NFR-22 Phase-2 audit.

## §1 — Why a vi-validation research-protocol surface

The P0-2c empathy work is **structurally different from P0-2a (Story 0.8 teacher empathy) and P0-2b (Story 0.9 bereaved-spouse conversation)** because the participant exercises **live software prototypes with their own assistive tech**. Recruitment, consent, conduct, synthesis, trustee review, and divergence reconciliation all require **disability-context escalations**:

- **Authority cites:** UX-DR5 P0-2 empathy field-work gate (epics line 375); UX §Phase-0 Prerequisites P0-2 launch-blocker statement (UX spec lines 101-105 — "at minimum one Hindi-using visually-impaired or low-vision member's interaction with TWT surfaces … recruited through Hindi-language disability NGOs or government welfare offices, to validate Devanagari screen reader behavior — engineering validation of TalkBack/VoiceOver Hindi alone is insufficient"); AR-49 Launch Gate Risks row P0-2 Member-Class Validation (architecture line 4782); architecture §External Validation Pending UX Researcher (architecture lines 4855-4859); **NFR-20 WCAG 2.1 AA launch-blocker for member-app primary flows** (epics line 220; PRD §8 line 1354) explicitly enumerating signup + KYC + My Pool + payment + claim filing; **NFR-22 Pre-launch accessibility audit gates Phase 2** (epics line 222); **UX-DR65 Three touch-target categories** (epics line 462; UX spec §13 lines 1182 + 2307 — 44pt default + comfortable + 56pt critical); **UX-DR66 Accessibility ≠ Alternate Experience principle** (epics line 463; UX spec §13 lines 2580-2588 — "the most load-bearing accessibility commitment in §13"); **UX-DR67 WCAG AA Baseline** (epics line 464; UX spec §13 lines 2590-2602); **UX-DR68 TWT-Specific Accessibility Considerations** (epics line 465; UX spec §13 lines 2604-2634); **FM-2 Devanagari rendering validation** (UX spec §6 lines 762-766 + §13.2 lines 2614-2618); **UX spec §13.1 Hindi screen-reader compatibility** ("Hindi screen reader testing is part of P0-2 field work … known limitations require documented fallback behavior and visible recovery"); UX spec line 1203 "Screen-reader-user empathy validation (P0-2 extension)".

The unified protocol directory discharges these commitments as a **single trustee-accessible surface** — protocol, consent, conduct rules, recruitment paths, prototype-operability + AT-pre-flight preconditions, UX-DR clause-evaluation capture instrument, accessibility-debt-classification routing, synthesis-schema, divergence-log, and review log all live together rather than scattered across the repo. The framework-as-research-surface pattern is inherited from Stories 0.2-0.9.

## §2 — Framework lifecycle

```
author-commit (Tasks 1-6)
    ↓
Trustee Panel grants formal approval BEFORE recruitment begins (P0-2c-distinct precondition inheriting Story 0.9 §2-tris)
    ↓
TWT prototype surfaces for signup + My Pool + Yogdaan Bahi verified operable (P0-2c-distinct precondition not present in Stories 0.8/0.9 — depends on Story 0.14 P0-5 ratify-decision closure)
    ↓
Solo Builder recruits 1 participant via disability-network path with informed consent (Hindi; large-print + read-aloud + thumbprint-with-witness alternatives offered)
    ↓
AT-pre-flight session ≤15-min validates participant's AT configuration interacts with prototype substrate (P0-2c-distinct precondition)
    ↓
≥60-min Hindi session at participant's chosen setting with AT-configuration-honored discipline
    ↓
Per-session note filed with AT-behavior-documentation populated + UX-DR clause-evaluation worksheet populated
    ↓
Substantive synthesis authored at AC-named path with UX-DR clause-evaluation section populated + accessibility-debt classification applied
    ↓
≥1 trustee review + sign-off
    ↓
Divergence reconciliation + UX-DR66/67/68 clause revisions integrated before Epic 3 + Epic 8 + Story 7.10 design freezes
```

## §3 — Four-way property / protocol / policy / gap-analysis discipline

Extending the Story 0.8/0.9 pattern with disability-context distinctions:

- **Property** = the synthesis dimensions + the conduct constraints + the UX-DR clause-evaluation + the **accessibility-debt classification** + the divergence reconciliation gate are **committed** by this framework.
- **Protocol** = `ethics-protocol.md` + `interview-protocol.md` + `informed-consent-template-{hindi,english}.md` + `question-bank.md` + `ux-dr-clause-evaluation-worksheet.md` are the specific instruments.
- **Policy** = trustee-approval-pre-session + disability-context-recruitment + **AT-configuration-honored** + **reasonable-accommodation-in-conduct** + **accessibility-debt-classification** + **UX-DR-clause-revision-routing** are operations-policy territory **committed at framework level** because the disability-context-sensitivity escalation requires them as preconditions.
- **Gap analysis** = the `divergence-log.md` + accessibility-debt classification per finding captures any gap between PRD/UX/architecture assumption and lived AT-walkthrough reality and triggers reconciliation.

Per [[feedback_gap_analysis_observational]]: the divergence-log is observational — it captures incompleteness and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture — Task 11 reconciliation is the discharge mechanism. **One hard prescriptive boundary applies:** findings classified `wcag-aa-defect-must-fix` per NFR-20 are launch-blockers and CANNOT be deferred to NFR-22 Phase-2 audit.

Per [[feedback_architecture_vs_prd_boundary]]: the framework is research-methodology + research-output, NOT architecture and NOT PRD. The synthesis findings + UX-DR clause evaluation + accessibility-debt classification *inform* PRD/UX-DR66/67/68/UX-spec-§13/architecture amendments via the divergence-log + Task 11 reconciliation, but the framework itself commits no architectural state/transition/event and no PRD policy/eligibility/cadence.

Per [[feedback_architecture_vs_adr_boundary]]: the framework commits **properties** (1 session; ≥60 min; Hindi; participant-chosen setting; trustee approval pre-session; prototype operability pre-session; AT-pre-flight pre-session; informed consent; AT-configuration-honored discipline; re-consent-for-quotation; pseudonymization; per-dimension synthesis; UX-DR clause evaluation; accessibility-debt classification; ≥1 trustee review; divergence reconciliation before Epic 3/8 + Story 7.10 freezes) + the **conduct protocol** as a control instrument. Specific operational choices are ADR territory per §8 below.

## §4 — Structural invariants (18)

1. **Trustee Panel approval is recorded BEFORE Solo Builder approaches any candidate.** P0-2c-distinct precondition inheriting Story 0.9 §2-tris pattern. The approval row is the first entry in `trustee-review-log.md` with verdict `approved-for-recruitment` + named approving trustees + date.
2. **TWT prototype surfaces (signup + My Pool + Yogdaan Bahi) are verified operable for real AT walkthrough BEFORE recruitment begins.** P0-2c-distinct precondition not present in Stories 0.8/0.9 (which require no software). Operability per Story 0.14 P0-5 ratified-substrate behavior + minimum viable navigation + AT API surface area per UX-DR67 + UX spec lines 1199-1201 React Native Accessibility props (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityLiveRegion`) + Tamagui/Radix accessibility wired per UX spec lines 685-687.
3. **AT-pre-flight session ≤15-min validates participant's AT configuration interacts with prototype substrate BEFORE the ≥60-min session is scheduled.** P0-2c-distinct precondition not present in prior P0-2 legs. Recorded in `recruitment-log.md` + `ethics-protocol.md` §3.8 (`prototype-operable-with-participant-at-config` | `partial-operability-N-of-3-surfaces` | `at-pre-flight-blocking-failure-unable-to-proceed`).
4. **Informed consent** (Hindi-primary; large-print Hindi if requested; read-aloud if requested; thumbprint-as-signature-alternative + witness co-signature for low-vision participants per Story 0.9 P-14 precedent) is obtained BEFORE any session-scheduling step.
5. **Researcher does NOT prescribe, configure, modify, or troubleshoot the participant's AT setup.** P0-2c-distinct discipline (ethics-protocol §3.8). Participant's AT configuration is honored without modification. If AT-pre-flight produces blocking failure, the session does NOT proceed with that participant.
6. **Researcher accommodates participant's setting preferences without negotiation + pays for travel.** Reasonable-accommodation discipline per ethics-protocol §3.4. Disability-context default is travel-reimbursement-permitted (higher than Story 0.9's no-compensation because disability-context often involves higher travel cost — assistive-aide companion travel, accessible-transport premium).
7. **Disability-context recruitment.** Cold recruitment via cold-call / cold-visit / cold-text is **FORBIDDEN** (inheriting Story 0.9 §3.0); recruitment exclusively via disability-network-mediated paths enumerated in `interview-protocol.md` §0. TWT operational referrals **NOT APPLICABLE** because TWT has not yet operated.
8. **Hindi-comprehension pre-check is conducted by Solo Builder only before consent-form presentation** (inheriting Story 0.9 D-07; D-05 review-patch: trustee must NOT be present or informed beyond the pseudonymized `hindi_comprehension_pre_check_outcome` field in `recruitment-log.md`). Bhojpuri-only or other-language-only participants are deflected at `hindi-comprehension-pre-check-failed-not-eligible` and a substitute participant recruited.
9. **The synthesis MUST classify each accessibility-relevant finding** as `wcag-aa-defect-must-fix` (NFR-20 hard launch-blocker — CANNOT defer) | `accessibility-debt-tracked-and-fix` (UX-DR68 debt; must close before NFR-22 Phase-2 audit) | `wcag-aaa-aspiration-deferred-with-rationale` (UX spec §13 explicit non-commitment) | `participant-class-extension-needed-for-coverage` (deferred to Story 0.10-bis or NFR-22 Phase-2 audit) | `not-applicable`. No silent absorption.
10. **Identity is pseudonymized** in all framework artifacts (canonical pseudonym `VI-Member-1`; substitute pseudonym `VI-Member-1A` available per Story 0.9 P-07 precedent). Demographic context preserved at non-identifying granularity — district-level slug + disability category at WHO-ICF level (`visually-impaired` or `low-vision`) NOT specific etiology if disclosure would identify.
11. **The synthesis at `_bmad-output/research/p0-2c-vi-validation.md` MUST be grounded in lived AT-walkthrough data.** Generic LLM-imagined or PRD/UX-paraphrased synthesis is forbidden. Every synthesis row carries citation to the per-session note (`VI-Member-1 §dimension-X`).
12. **The UX-DR clause-evaluation section** (synthesis §4) MUST populate the per-clause verdict for **each enumerated UX-DR66/67/68 + UX-DR65 clause × each of the 3 named prototype surfaces** OR explicitly mark `not-evaluated-due-to-participant-non-engagement` or `not-evaluated-due-to-prototype-surface-coverage-gap` with rationale. This is the AC's load-bearing surface — distinct from Story 0.8's mental-model-validation surface and Story 0.9's Pattern 4 evaluation surface.
13. **The four AC-named synthesis dimensions** (where they succeeded; where they got stuck; AT-behavior that surprised the designer; copy or interaction patterns that broke) are **append-only minimum coverage** — the framework may extend dimensions if lived data surfaces new themes, but the four are non-negotiable.
14. **The divergence-log forbidden state** is "synthesis row that contradicts a PRD/UX/architecture assumption but the divergence is silently absorbed into the synthesis without a log entry."
15. **The synthesis cannot be marked `trustee-reviewed` until ≥1 trustee signs off** per the trustee-review-log schema; **Epic 3 + Epic 8 + Story 7.10 design-freeze conversations cannot proceed** until the divergence-log has terminal `reconciliation_status` (`reconciled-via-spec-update` | `reconciled-via-design-adjustment` | `explicitly-deferred-with-rationale` | `deferred-to-nfr-22-phase-2-audit` per the classification rules in `divergence-log.md` severity enum + `ux-dr-clause-evaluation-worksheet.md` accessibility-debt classification enum; `wcag-aa-defect-must-fix` findings CANNOT use `deferred-to-nfr-22-phase-2-audit`) for every divergence row affecting the relevant Epic **before whichever Epic design freeze comes first**. If a cross-cutting `wcag-aa-defect-must-fix` divergence affects both Epic 3 and Epic 8 simultaneously, reconciliation must reach terminal state before the earlier of the two design freezes, per [[feedback_closure_language_precision]].
16. **No individual participant's identity, contact, or precise location is inlined in the synthesis file or any framework artifact** — identity NDA territory inheriting Stories 0.6/0.7/0.8/0.9 need-to-know discipline; stored out-of-band per operations policy.
17. **Travel-reimbursement is permitted as disability-context default.** No participant compensation is structured as obligation-creating; modest reimbursement for travel/time but not as quid-pro-quo for specific findings or specific verdicts.
18. **`wcag-aa-defect-must-fix` findings MUST be reconciled via spec-update or design-adjustment.** They CANNOT be classified as `deferred-to-nfr-22-phase-2-audit`. This is the only hard prescriptive boundary in an otherwise observational framework.

## §5 — Sign-off lifecycle

- **≥1-trustee synthesis ratification** is the framework-ratification gate. Per-surface ratification OR pack-as-a-unit ratification is the trustee's choice (recorded in `trustee-review-log.md` `review_scope` column).
- **Quorum-unavailable fallback:** emergency review by Trustee Panel chair valid under documented trustee incapacitation, time-bounded **30 days**, recorded as `.decision-log.md` `[CONTINUITY]` entry — mirrors the Story 0.5-0.9 emergency-single-trustee fallback path. The trustee-review-log row carries `emergency_approval_expiry_date` + `second_trustee_re_review_required = true` per Story 0.9 D-02 precedent.
- **Emergency approval expiry during active recruitment:** if the 30-day emergency window expires while recruitment is in progress (candidate identified but AT-pre-flight not yet conducted), Solo Builder must immediately pause all formal recruitment steps (consent presentation, AT-pre-flight scheduling) and obtain quorum-level re-approval before proceeding. Prior introductory actions already taken do not lapse and do not need to be repeated.
- **Pre-session trustee-approval is a separate gate from post-synthesis review** (inheriting Story 0.9 distinction). The pre-session approval row in `trustee-review-log.md` has `review_id = pre-session-001` + `review_scope = approval-for-recruitment-pre-session`.

## §6 — Review cadence fallback

- **One-time synthesis review at AC-1 closure** (Task 10).
- **Pre-Epic-3-design-freeze + pre-Epic-8-design-freeze + pre-Story-7.10-design-freeze divergence reconciliation checkpoints** (Task 11).
- **Per-Story-touch refresh** if Epic 3 / Epic 8 / Story 7.10 stories cite the synthesis and the citation does not match the current synthesis row.
- **NFR-22 Phase-2 pre-launch accessibility audit consumes this synthesis as authoritative input** (epics line 222; Story 11b.8 Real-Data Test + Accessibility Audit Gate per epics lines 3918-3919). Any `not-evaluated-due-to-prototype-surface-coverage-gap` finding MUST be re-evaluated at the Phase-2 audit per Story 0.9 P-08 precedent.

## §7 — Synthesis-vs-per-session-note reconciliation

- The **synthesis is authoritative for the cross-section pattern + the dimension-level finding**.
- The **per-session note is authoritative for the AT-walkthrough-data citation**.
- Every synthesis row carries citation to the per-session note.
- Per-session note revisions are logged in the synthesis Pack-revision log per the Story 0.4-0.9 supersession schema.

## §8 — Open ADR slots

Operations-policy ADR territory NOT committed at framework level:

1. **Recruitment-incentive structure** — travel-reimbursement-permitted default (disability-context) vs modest-time-stipend; Trustee Panel approves at §2-tris.
2. **Recording technology** — phone audio vs dedicated recorder vs notes-only vs screen-recording-of-prototype.
3. **Transcription mechanism** — manual vs Hindi-ASR + manual review.
4. **Pseudonymization mechanism** — canonical slug + disability-category granularity (WHO-ICF level).
5. **Data-retention policy for raw recording post-synthesis** — 60-day disability-context default committed; specific archival mechanism deferred.
6. **AT-pre-flight failure-mode classification** — which failure types are blocking vs proceed-with-degradation (3-value enum committed; per-failure-type taxonomy deferred).
7. **UX-DR clause-evaluation worksheet presentation format mid-session** — printed cards vs prototype-overlay vs spoken.
8. **Per-surface coverage prioritization** if ≥60-min budget cannot cover all 3 surfaces equally (2-of-3 minimum committed per ethics-protocol §3.1; per-surface priority deferred).
9. **Accessibility-debt classification operational discipline** — who owns the tracker (Solo Builder, Trustee Panel chair, or named other); deferred to operations policy.
10. **Coverage-gap escalation routing** — Story 0.10-bis (additional sessions) vs NFR-22 Phase-2 audit (broader accessibility audit consumes); deferred to Trustee Panel post-synthesis decision.

## §9 — Related continuity / research surfaces

| Surface | Path | Relationship |
|---|---|---|
| TSCT reference learnings | `_bmad-output/research/tsct-reference-learnings.md` | Prior-art reference — read-only from this Story's perspective |
| Story 0.8 P0-2a teacher empathy protocol | `_bmad-output/research/p0-2a-teacher-interviews-protocol/` | First sister-leg of P0-2 four-leg discharge |
| Story 0.8 P0-2a synthesis | `_bmad-output/research/p0-2a-teacher-interviews.md` | First sister-leg synthesis destination |
| Story 0.9 P0-2b bereaved-spouse protocol | `_bmad-output/research/p0-2b-bereaved-spouse-protocol/` | Second sister-leg of P0-2 four-leg discharge |
| Story 0.9 P0-2b synthesis | `_bmad-output/research/p0-2b-bereaved-spouse.md` | Second sister-leg synthesis destination |
| **Story 0.10 P0-2c vi-validation protocol (this surface)** | `_bmad-output/research/p0-2c-vi-validation-protocol/` | Third sister-leg of P0-2 four-leg discharge |
| **Story 0.10 P0-2c vi-validation synthesis (AC-named destination)** | `_bmad-output/research/p0-2c-vi-validation.md` | Third sister-leg synthesis destination |
| Story 0.11 P0-2d operator-shadowing | `_bmad-output/research/p0-2d-operator-shadowing.md` (pending) | Fourth co-leg — pending Story 0.11 author-commit |
| Story 0.1 operational runbooks | `docs/runbooks/` | Operational continuity sister surface |
| Story 0.2 credential escrow | `docs/escrow/` | Continuity sister surface |
| Story 0.3 code escrow | `docs/escrow/` (extension) | Continuity sister surface |
| Story 0.4 degradation policy | `docs/degradation-policy/` | Continuity sister surface |
| Story 0.5 knowledge-transfer pack | `docs/knowledge-transfer/` | Continuity sister surface |
| Story 0.6 backup engineer | `docs/backup-engineer/` | Continuity sister surface |
| Story 0.7 fallback-handler ledger | `docs/fallback-handler-ledger/` | Continuity sister surface |

## §10 — P0-2 four-leg joint-discharge anchor

Story 0.10 contributes the **third of four P0-2 legs**:

- **P0-2a** = Story 0.8 (teacher empathy interviews) — author-committed; external action pending
- **P0-2b** = Story 0.9 (bereaved-spouse conversation) — author-committed; external action pending
- **P0-2c** = Story 0.10 (this Story; VI/low-vision-member accessibility validation)
- **P0-2d** = Story 0.11 (operator shadowing) — pending Story 0.11 author-commit

The full P0-2 launch-gate property (UX-DR5 + AR-49 P0-2 Launch Gate Risks row at architecture line 4782) discharges **only when all four legs close**. Story 0.10 closure DOES NOT independently discharge UX-DR5 or AR-49 P0-2; only the P0-2c leg-closure is contributed.

## §11 — UX-DR clause-evaluation provenance

The AC's **load-bearing surface** is the per-clause verdict for UX-DR66/67/68 + UX-DR65 acceptance criteria. This is distinct from:

- **Story 0.8's mental-model-validation surface** (does the participant's mental model of TWT match the design?)
- **Story 0.9's Pattern 4 evaluation surface** (do the sample-copy + grief-grammar elements land?)

Story 0.10 evaluates the **specific UX-DR66/67/68 acceptance criteria** against lived AT-walkthrough data. The per-clause verdict + accessibility-debt classification feeds the divergence-log + Task 11 reconciliation routing to:

- **UX spec §13** (Accessibility Strategy, lines 2576-2634) amendment via UX-edit workflow
- **UX-DR66/67/68 epics edit** (epics lines 463-465) via epics-edit workflow
- **Architecture §1.5** if a finding touches an architectural property (e.g., RN Accessibility props are a substrate commitment)

Revisions are integrated into UX spec §13 + UX-DR66/67/68 epics text **via the divergence-log + Task 11 reconciliation, NOT directly at framework-author-commit** per [[feedback_architecture_vs_prd_boundary]].

## §12 — Domain glossary

| Term | Meaning |
|---|---|
| P0-2 | UX §Phase-0 Prerequisites P0-2 launch-blocker — member-class validation field work (Hindi-using teacher + bereaved spouse + VI/low-vision member + operator shadowing) |
| P0-2c | The VI/low-vision-member accessibility-validation leg of P0-2 |
| UX-DR5 | Empathy field-work gate (epics line 375) — the UX-DR that names P0-2 as a launch-blocker |
| UX-DR65 | Three touch-target categories — 44pt default + comfortable + 56pt critical (epics line 462; UX spec §13 lines 1182 + 2307) |
| UX-DR66 | Accessibility ≠ Alternate Experience principle (epics line 463; UX spec §13 lines 2580-2588) — "the most load-bearing accessibility commitment in §13" |
| UX-DR67 | WCAG AA Baseline (epics line 464; UX spec §13 lines 2590-2602) — 9-row commitment table |
| UX-DR68 | TWT-Specific Accessibility Considerations (epics line 465; UX spec §13 lines 2604-2634) — Hindi screen-reader + Devanagari conjunct + operator zoom + field-worker outdoor + Hindi voice input + low-bandwidth resilience |
| UX-DR79 | Reduced-motion handling (UX spec §13 lines 2654-2666) |
| NFR-20 | WCAG 2.1 AA launch-blocker for member-app primary flows (epics line 220; PRD §8 line 1354) — signup + KYC + My Pool + payment + claim filing |
| NFR-22 | Pre-launch accessibility audit gates Phase 2 (epics line 222) |
| FM-2 | Devanagari rendering validation gate + tiered escalation (UX spec §6 lines 762-766 + §13.2 lines 2614-2618) |
| Visually-impaired (VI) | WHO-ICF visual-impairment category — used at framework-artifact granularity without specific etiology if disclosure would identify |
| Low-vision | WHO-ICF low-vision sub-category — distinct from VI; framework treats both as eligible TWT member-class participants |
| Assistive tech (AT) | Screen reader / magnification / voice control — participant brings own configuration; researcher does NOT modify per ethics-protocol §3.8 |
| Screen reader | Software that reads UI to user via synthesized speech — TalkBack (Android default); VoiceOver (iOS); NVDA / JAWS (desktop reference) |
| TalkBack | Android default screen reader — Hindi pronunciation is the canonical P0-2c validation target per UX spec §13.1 |
| VoiceOver | iOS default screen reader |
| NVDA / JAWS | Desktop screen readers — Story 0.10 scope is mobile-first per Reena member-class but desktop AT noted in question-bank §7 |
| Magnification | OS-level zoom / browser-zoom / app-zoom — used by low-vision participants; touch-target reachability under magnification is the critical-touch-target validation per UX-DR65 |
| Voice control | OS-supported voice activation — Hindi voice input is UX-DR68 commitment per UX spec §13.2 |
| OS-supported Hindi voice input | UX-DR68 commitment: Hindi-speaking users can voice-activate critical UI elements |
| Devanagari conjunct | Multi-consonant ligature in Hindi script (e.g., क्ष, त्र, ज्ञ) — FM-2 validation gate per UX spec §6 |
| FuneralFrame / PortraitFrame | Memorial / Sahyog Drive visual components (Epic 11b; Story 11b.5) — secondary consumers of Story 0.10 canonical-device perf contract |
| ARIA-live | HTML/RN accessibility attribute that announces UI state changes to screen-reader users; polite vs assertive setting is a critical evaluation point for the 15-day countdown on My Pool card |
| Semantic HTML | Use of correct HTML elements (`<button>`, `<nav>`, `<main>`) for AT semantics |
| Focus order | DOM/RN focus traversal sequence — must be logical for keyboard + screen-reader users |
| Skip link | Affordance for keyboard users to skip past repetitive nav (UX-DR67 commitment) |
| Reduced motion | OS setting that requests reduced animation — UX-DR67 + UX-DR79 commit to honoring |
| Color independence | UX-DR67 commitment: state never conveyed by color alone (status pills carry text labels) |
| Touch target category | UX-DR65 three-tier system: 44pt default / comfortable / 56pt critical (UPI Intent / Approve / Submit) |
| 44pt / 56pt | Apple HIG / WCAG AAA touch-target sizes; UX-DR65 commits ≥56pt for critical actions |
| Canonical validation device | Entry-level Android device specified for perf + AT validation (Story 0.10 establishes per epics line 2959 + 3791) |
| Entry-level Android | The lowest-spec Android device TWT supports — substrate for the 60fps/30fps virtualization perf contract |
| Story 0.14 P0-5 substrate | The native-stack-validation prototype-ratify-decision (RN + Tamagui) that this Story's prototype-operability precondition depends on |
| Prototype operability | The state where signup + My Pool + Yogdaan Bahi prototype surfaces have substrate + minimum viable navigation + AT API surface area — P0-2c-distinct precondition |
| AT-pre-flight | ≤15-min pre-flight session validating participant's AT configuration interacts with prototype substrate — P0-2c-distinct precondition (`prototype-operable-with-participant-at-config` | `partial-operability-N-of-3-surfaces` | `at-pre-flight-blocking-failure-unable-to-proceed`) |
| AT-configuration-honored | The discipline that researcher does NOT prescribe, configure, modify, or troubleshoot participant's AT setup — P0-2c-distinct (ethics-protocol §3.8) |
| Reasonable accommodation | Researcher accommodates participant's setting preferences without negotiation + pays for travel + provides large-print / read-aloud consent on request (ethics-protocol §3.4) |
| Accessibility debt | UX-DR68 debt that must be tracked + closed before NFR-22 Phase-2 audit — "never accepted as a permanent condition" per UX spec line 2612 |
| WCAG 2.1 AA | Web Content Accessibility Guidelines 2.1 Conformance Level AA — NFR-20 launch-blocker commitment for member-app primary flows |
| WCAG 2.1 AAA | Conformance Level AAA — explicitly non-committed for v1 per UX spec line 2578; `wcag-aaa-aspiration-deferred-with-rationale` classification |
| NFR-22 Phase-2 audit | Pre-launch accessibility audit gating Phase 2 — consumes Story 0.10 synthesis + accessibility-debt tracker as authoritative input |
| Accessibility ≠ Alternate Experience | UX-DR66 principle: the spec never produces two apps; every member uses the same TWT with the same surfaces, flows, data |
| Informed consent | Hindi-primary consent form covering participation purpose, data collection, recording, identity protection, retention, withdrawal, compensation, no-obligation per ethics-protocol §2 (a)-(h) |
| Disability-context recruitment | Recruitment via Bihar disability network / school-inclusion network / Bihar State Welfare Board for Persons with Disabilities / trustee referral / Hindi-language disability NGO — cold recruitment forbidden |
| Large-print consent | Visual accommodation: consent form printed in larger font for low-vision participants |
| Read-aloud consent | Auditory accommodation: researcher reads consent form aloud for VI participants |
| Thumbprint signature | Signature alternative for participants who cannot easily sign — with witness co-signature per Story 0.9 P-14 precedent |
| Pseudonymization | `VI-Member-1` canonical pseudonym; substitute `VI-Member-1A` for post-withdrawal substitute |
| Divergence-log | Append-only log of synthesis findings that contradict, nuance, extend, or trigger revision of pre-stated PRD/UX/architecture assumptions or UX-DR clause expectations |
| Synthesis dimension | One of the 4 AC-named observation dimensions (where they succeeded; where they got stuck; AT-behavior that surprised the designer; copy or interaction patterns that broke) + cross-cutting Hindi-Devanagari-AT-grammar |
| Trustee approval pre-session | Recorded in `trustee-review-log.md` as the first row BEFORE recruitment begins (P0-2c-distinct precondition inheriting Story 0.9 §2-tris) |

## §13 — File index

| File | Purpose | Author-commit state |
|---|---|---|
| `README.md` | This framework charter | Closed by [edit] (this file) |
| `ethics-protocol.md` | Ethics protocol with 8 sections + §2-bis/tris/quater + §3.0/3.7/3.8/3.9 disability-context escalations | Closed by [edit] (Task 2) |
| `interview-protocol.md` | Conduct runbook with §0 + §0-bis prototype-operability + §1 + §1-bis AT-pre-flight + §2-§6 | Closed by [edit] (Task 3) |
| `informed-consent-template-hindi.md` | Hindi participant-facing consent form | Closed by [edit] (Task 3) |
| `informed-consent-template-english.md` | English mirror for researcher reference + trustee review | Closed by [edit] (Task 3) |
| `question-bank.md` | 4 AC-named dimensions + §5 cross-cutting + §6 UX-DR opt-in + §7 AT-specific prompts | Closed by [edit] (Task 4) |
| `ux-dr-clause-evaluation-worksheet.md` | AC's load-bearing UX-DR clause-evaluation capture instrument | Closed by [edit] (Task 4) — scaffolded with `pending-session-conduct` verdicts |
| `assumption-inventory.md` | ≥40 pre-stated PRD/UX/architecture accessibility assumptions; 20 critical-hypothesis-tagged | Closed by [edit] (Task 4) — `pending-session` validation status |
| `per-session-note-schema.md` | Per-session note shape definition | Closed by [edit] (Task 5) |
| `synthesis-schema.md` | 12-section synthesis structure | Closed by [edit] (Task 5) |
| `divergence-log.md` | Append-only divergence log schema + empty rows | Closed by [edit] (Task 5) |
| `trustee-review-log.md` | Trustee review log with pre-session-001 row slot pre-staged | Closed by [edit] (Task 5) |
| `recruitment-log.md` | Pseudonym-to-recruitment-path log with 1 pending row | Closed by [edit] (Task 5) |
| `session-notes/README.md` | Placeholder explaining per-session note destination | Closed by [edit] (Task 5) |
| `session-notes/archived/README.md` | Placeholder explaining 6-month archive destination per Story 0.9 P-13 | Closed by [edit] (Task 5) |
| `../p0-2c-vi-validation.md` (one level up; AC-named) | Scaffolded synthesis file with `_AWAITING_SESSION_CONDUCT_` placeholders | Closed by [edit] (Task 6) |
