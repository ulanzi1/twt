# P0-2d Operator Shadowing Protocol — TERMINAL P0-2 leg

> This framework discharges the **UX-DR5 + AR-49 P0-2d empathy-field-work staff-workflow-observation leg** by committing the protocol, **two-actor consent** (operator written + per-call caller spoken-and-recorded), **host-helpline-institution-approval-pre-recruitment**, **Trustee-Panel-approval-pre-shadowing**, **observer-not-participant** discipline, recruitment, and synthesis-schema property + scaffolding. Substantive shadowing conduct + synthesis are Tasks 7-9 _AWAITING EXTERNAL ACTION_. Trustee review is Task 10. Divergence reconciliation + routing-policy + SLA + helpline-call-to-ticket revision integration is Task 11 + downstream Epic 10 + Story 6.3 + Story 6.10 design-freeze conversations. **Story 0.11 contributes the FOURTH and TERMINAL of four P0-2 legs — full P0-2 launch-gate discharge is unblocked at Story 0.11 closure** (assuming Stories 0.8 + 0.9 + 0.10 closed).

## §1 — Why an operator-shadowing research-protocol surface

The P0-2d empathy work is **structurally different from P0-2a/2b/2c** because the participant is a **paid staff operator at a host helpline institution**, and the observation involves a **two-actor live interaction** with member-callers — the researcher's third presence introduces **member-caller-third-party-privacy** territory not present in the prior P0-2 legs. Recruitment, consent (two-actor: operator + per-call caller), conduct (observer-not-participant), synthesis, trustee review, and divergence reconciliation all require **staff-workplace-context + two-actor-consent + observer-not-participant escalations**:

- **Authority cites:** UX-DR5 P0-2 empathy field-work gate (epics line 375); UX §Phase-0 Prerequisites P0-2 launch-blocker statement (UX spec lines 101-105 — "**Staff-workflow empathy** — minimum 4 hours of observation shadowing an actual small-trust helpline operator (TSCT, NSCT, or analogous Indian welfare/cooperative trust). Document the actual workflow. … No nominee-facing surface, relative-as-deceased flow, or Helpline Operator console ships in v1 without these conversations + observation on record"); AR-49 Launch Gate Risks row P0-2 Member-Class Validation (architecture line 4782); architecture §External Validation Pending UX Researcher (architecture lines 4855-4859); **AR-47 Helpdesk first-class subsystem** (architecture line 323 + lines 2153-2221 — own backend module + admin UI module + shared contracts + member-facing UI + routing-policy registry + integration points); **architecture §3.5 Telephony integration — Helpline Operator console Persona #7** (architecture lines 2098-2151 — CTI provider abstraction + caller-ID-treated-as-hint + call-recording-consent-ordering + telephony fallback policy); **PRD FR-52 Helpdesk first-class subsystem** + **PRD FR-37 helpline-mediated claim filing flow**; **UX-DR45 `<MemberLookupForm>`** (UX spec line 2089); **UX-DR46 `<ReadBackCard>`** (UX spec line 2089); **UX-DR49 `<CallHelplineCTA>`** (epics line 440); **UX-DR55 Pattern 4 Dignified validation — Operator-facing precise-technical-wording permitted carve-out** (epics line 449); **UX-DR62 Pattern 11 three-tier recovery ladder** (epics line 456); **UX spec §10 Tier-2 surface inventory — Helpline Operator intake console** (UX spec line 1219); **UX spec §10 Intake-Console-pattern-(b) decision-strip** (UX spec lines 1686-1688); **UX spec §1467-1513 Journey 3 Helpline-mediated Claim Filing (Priya Path) + two-actor design discipline** (UX spec line 1513); **SM-1 demo beat C3 helpline call-to-ticket** (epics line 3304).

The unified protocol directory discharges these commitments as a **single trustee-accessible surface** — protocol, two-actor-consent (operator written + per-call caller spoken-and-recorded), conduct rules, recruitment paths, host-helpline-institution-approval + Trustee-Panel-approval preconditions, operator-workflow-call-pattern observation worksheet capture instrument, synthesis-schema, divergence-log, host-helpline-engagement-log, and review log all live together rather than scattered across the repo. The framework-as-research-surface pattern is inherited from Stories 0.2-0.10.

## §2 — Framework lifecycle

```
author-commit (Tasks 1-6)
    ↓
Host helpline institution (TSCT/NSCT/analogous) grants formal written approval
BEFORE Solo Builder approaches any individual operator
(P0-2d-distinct host-institution-precondition NOT present in P0-2a/b/c)
    ↓
Trustee Panel grants formal approval for the shadowing engagement BEFORE shadowing begins
(inheriting Story 0.9 §2-tris + Story 0.10 §2-tris pattern)
    ↓
Solo Builder identifies 1 named operator-participant via host-institution-mediated path
(host helpline operations lead nominates; cold approach FORBIDDEN)
    ↓
Operator signs Hindi informed-consent BEFORE shadowing-shift-scheduling step activates
    ↓
≥4-hour total observed-call time across ≥2 distinct operator shifts
at host helpline operational location with observer-not-participant discipline
    ↓
Per-call caller-spoken-and-recorded consent obtained at start of each observed call
(caller declines → call proceeds without observation;
 caller revokes mid-call → researcher immediately ceases + destroys partial data)
    ↓
Per-shift note authored within 24h per per-shift-note-schema with per-call observation data
    ↓
Substantive synthesis authored at AC-named path with operator-workflow-call-pattern
observation worksheet section populated
    ↓
≥1 trustee review + sign-off
    ↓
Divergence reconciliation + routing-policy + SLA + helpline-call-to-ticket revisions
integrated before Epic 10 + Story 6.3 + Story 6.10 design freezes
    ↓
P0-2 TERMINAL LEG DISCHARGE — UX-DR5 + AR-49 P0-2 + UX §Phase-0 v1-no-ship clause
(assuming Stories 0.8 + 0.9 + 0.10 closed)
```

## §3 — Four-way property / protocol / policy / gap-analysis discipline

Extending Stories 0.8/0.9/0.10 pattern with staff-workplace-context + two-actor-consent + observer-not-participant distinctions:

- **Property** = the synthesis dimensions + the conduct constraints + the **operator-workflow-call-pattern observation worksheet** + the divergence reconciliation gate are **committed** by this framework.
- **Protocol** = `ethics-protocol.md` + `shadowing-protocol.md` + `informed-consent-template-operator-{hindi,english}.md` + `caller-consent-spoken-script-hindi.md` + `observation-question-bank.md` + `operator-workflow-call-pattern-observation-worksheet.md` are the specific instruments.
- **Policy** = host-helpline-institution-approval-pre-recruitment + Trustee-Panel-approval-pre-shadowing + observer-not-participant + two-actor-consent + caller-revocation-mid-call + emotional-overload-observer-discretion-end + member-caller-privacy + operator-attribution-protection are operations-policy territory **committed at framework level** because the staff-workplace-context-sensitivity escalation requires them as preconditions.
- **Gap analysis** = the `divergence-log.md` + per-pattern verdict captures any gap between PRD/UX/architecture assumption and lived shadowing reality and triggers reconciliation.

Per [[feedback_gap_analysis_observational]]: the divergence-log is **observational** — it captures incompleteness and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture — Task 11 reconciliation is the discharge mechanism.

Per [[feedback_architecture_vs_prd_boundary]]: the framework is research-methodology + research-output, NOT architecture and NOT PRD. The synthesis findings + operator-workflow-call-pattern observation worksheet evaluation *inform* PRD/UX-DR/architecture amendments via the divergence-log + Task 11 reconciliation, but the framework itself commits no architectural state/transition/event and no PRD policy/eligibility/cadence.

Per [[feedback_architecture_vs_adr_boundary]]: the framework commits **properties** (≥4 hours observation across ≥2 shifts; host-helpline-institution-approval-pre-recruitment; Trustee-Panel-approval-pre-shadowing; observer-not-participant; two-actor-consent; per-call caller-spoken-and-recorded-consent; caller-revocation-mid-call; emotional-overload-observer-discretion-end; pseudonymization; per-dimension synthesis; operator-workflow-call-pattern observation worksheet evaluation; ≥1 trustee review; divergence reconciliation before Epic 10 + Story 6.3 + Story 6.10 design freezes) + the **conduct protocol** as a control instrument. Specific operational choices are ADR territory per §8 below.

## §4 — Structural invariants (15)

1. **Host helpline institution approval is recorded BEFORE Solo Builder approaches any individual operator.** P0-2d-distinct host-institution-precondition NOT present in P0-2a/b/c. The approval row is the **first** entry in `trustee-review-log.md` (`pre-shadowing-001`) with verdict `approved-for-shadowing-engagement` + host-institution-authority-pseudonym + date + scope covering (a) operational-disruption-tolerance + (b) operator-participation-employer-consent + (c) member-caller-privacy-posture-acknowledgment + (d) shadowing-duration ≥4-hour-across-≥2-shifts + (e) host-institution-named-contact for revocation.
2. **Trustee Panel approval is recorded BEFORE shadowing begins.** Second entry in `trustee-review-log.md` (`pre-shadowing-002`) — inheriting Story 0.9 §2-tris + Story 0.10 §2-tris pattern; `approved-for-shadowing` verdict + named approving trustees + date + revision-list co-signed via `.decision-log.md` Decision 2026-05-31-011 sub-entry per Story 0.9 P-10 review-patch precedent.
3. **Operator written informed consent is obtained BEFORE shadowing-shift-scheduling step activates.** Hindi-language consent form signed (or thumbprint-with-witness-co-signature per Story 0.9 P-14 precedent) + retained out-of-band per ethics-protocol §4 NDA territory.
4. **Per-call caller-spoken-and-recorded consent is obtained at start of each observed call.** Operator informs caller in Hindi at call-open per `caller-consent-spoken-script-hindi.md`; **caller declines → call proceeds without observation** (researcher steps out / mutes audio + closes notes); **caller revokes mid-call → researcher immediately ceases observation + destroys any data captured from that call + marks per-shift note row `caller-consent-revoked-mid-call`**.
5. **Researcher does NOT interact with caller.** Observer-not-participant discipline (P0-2d-distinct).
6. **Researcher does NOT prompt or coach operator.** Observer-not-participant discipline (P0-2d-distinct).
7. **Researcher does NOT prescribe operator workflow or interfere with the call.** Observer-not-participant discipline (P0-2d-distinct).
8. **Researcher observes silently with minimal physical presence.** No clipboard ostentation; no recording equipment displayed unless caller-consent reconfirms; minimal-presence positioning behind the operator out-of-caller's-visual-line if video-call OR in-room out-of-caller's-line if audio-call. P0-2d-distinct.
9. **≥4-hour minimum is total observed-call time across ≥2 distinct shifts** (NOT inclusive of breaks / non-call administrative time). Different days OR different shifts on same day with intervening break ≥4 hours.
10. **If fewer than ≥4 hours of observed-call time accrue due to caller-consent declines or host-helpline operational constraints**, the recruitment-log is amended + a third shift is scheduled OR a substitute host-helpline is engaged per the host-institution-substitution discipline.
11. **Researcher accommodates host institution's setting preferences without negotiation + pays for travel.** Host-institution-context discipline. Travel-reimbursement-permitted + time-stipend-permitted-if-Trustee-Panel-approves (operator-context default — operator's professional time at host helpline is occupational labor; modest compensation permitted to operator AND/OR host helpline at Trustee Panel's discretion).
12. **The synthesis MUST classify each routing-policy + SLA + helpline-call-to-ticket finding** with per-pattern verdict + routing to the appropriate Story-X (Story 10.1 routing-policy-category + sub-category + scope-mapping; Story 10.1 SLA-target; Story 10.3 helpline-call-to-ticket-workflow; Story 6.3 helpline-mediated-claim-filing; Story 6.10 verifier-console-context-from-helpline; UX-DR55 operator-facing-register; Intake-Console-pattern-(b) decision-strip). No silent absorption.
13. **Identity is pseudonymized** in all framework artifacts. Canonical operator pseudonym `Operator-1`; canonical host-helpline pseudonym `HostHelpline-1` if institutional identity is sensitive; substitute pseudonyms `Operator-1A` + `HostHelpline-1A` available per Story 0.9 P-07 review-patch precedent. Demographic context preserved at non-identifying granularity — host-institution-type at sector-level (`welfare-trust` / `cooperative-trust` / `community-trust`) NOT specific institution name if disclosure would identify. **Per-call caller identity is NEVER recorded under any circumstance** — caller identity is treated as third-party privacy territory per AR-47 §3.5a member-caller-privacy posture and DPDPA member-data principle by analogy; only category + duration + workflow + escalation + improvisation observations are recorded per call. **Caller-personal-content is NEVER recorded** — specific caller names / specific incidents / specific account details / specific case histories are NEVER recorded.
14. **The synthesis at `_bmad-output/research/p0-2d-operator-shadowing.md` MUST be grounded in lived shadowing data.** Generic LLM-imagined or PRD/UX-paraphrased synthesis is forbidden. Every synthesis row carries citation to per-shift note + per-call row index (`Operator-1 shift-N call-X §dimension-Y`). The **operator-workflow-call-pattern observation worksheet section** must populate the per-pattern verdict for **each pre-stated pattern × observed shadowing data** OR explicitly mark `not-evaluated-due-to-host-helpline-context-mismatch` or `not-evaluated-due-to-observation-coverage-gap` with rationale. The six AC-named synthesis dimensions are **append-only minimum coverage** — the framework may extend dimensions if lived shadowing data surfaces new themes, but the six AC-named dimensions are non-negotiable.
15. **The synthesis cannot be marked `trustee-reviewed` until ≥1 trustee signs off** per the trustee-review-log schema. **Epic 10 + Story 6.3 + Story 6.10 design-freeze conversations cannot proceed** until the divergence-log has reconciliation status `reconciled-via-spec-update` | `reconciled-via-design-adjustment` | `explicitly-deferred-with-rationale` for every divergence row affecting the relevant Epic / Story **before whichever design freeze comes first**, per [[feedback_closure_language_precision]]. The **divergence-log forbidden state** is "synthesis row that contradicts a PRD/UX/architecture assumption but the divergence is silently absorbed into the synthesis without a log entry." No individual operator's identity + no host-helpline institution-name (if sensitive) + no caller identity + no caller-personal-content is inlined in the synthesis file or any framework artifact — identity NDA territory inheriting the Story 0.6 / 0.7 / 0.8 / 0.9 / 0.10 need-to-know discipline; stored out-of-band per operations policy.

## §5 — Sign-off lifecycle

- **Pre-shadowing host-helpline-approval (`pre-shadowing-001`) is a separate gate from pre-shadowing trustee-approval (`pre-shadowing-002`) is a separate gate from post-synthesis review (`post-synthesis-001`)** — inheriting Story 0.10 distinction with the extra host-helpline-approval gate.
- **≥1-trustee synthesis ratification** is the framework-ratification gate. Per-pattern ratification OR pack-as-a-unit ratification is the trustee's choice (recorded in `trustee-review-log.md` `review_scope` column).
- **Quorum-unavailable fallback:** emergency review by Trustee Panel chair valid under documented trustee incapacitation, time-bounded **30 days**, recorded as `.decision-log.md` `[CONTINUITY]` entry — mirrors the Story 0.5-0.10 emergency-single-trustee fallback path. The trustee-review-log row carries `emergency_approval_expiry_date` + `second_trustee_re_review_required = true` per Story 0.9 D-02 precedent.
- **Emergency approval expiry during active engagement:** if the 30-day emergency window expires while shadowing is in progress (host-helpline approved + Trustee Panel emergency-approved but shadowing shifts not yet conducted), Solo Builder must immediately pause all formal shadowing steps and obtain quorum-level re-approval before proceeding. Prior introductory actions already taken do not lapse and do not need to be repeated.
- **Emergency approval expiry mid-engagement (between shifts):** if the 30-day emergency window expires after shift-1 is conducted but before shift-2 is conducted, shift-1 data already collected within the approved window is valid and does not lapse; Solo Builder must obtain quorum-level re-approval before conducting shift-2 or any subsequent shift. Shift-2 scheduling and conduct are gated steps that cannot proceed on an expired emergency approval.
- **Emergency approval expiry after shifts complete but before synthesis submission:** if the 30-day emergency window expires after all shifts are conducted but before the synthesis is submitted for trustee review, the shift-note data already collected is valid and does not lapse (per-call observations are time-stamped within the approved window); Solo Builder must obtain quorum-level re-approval before submitting synthesis for post-synthesis-001 trustee review. The synthesis submission step is the downstream gate; it cannot proceed on an expired emergency approval.
- **Per Story 0.9 P-23 precedent:** `rejected-pending-rework` verdicts carry a `rework_scope` field — `synthesis-only` (re-engage Tasks 9-10) vs `full-pre-shadowing-cycle` (re-engage Tasks 7-10 because rejection identifies fundamental ethics/protocol defect).

## §6 — Review cadence fallback

- **One-time synthesis review at AC-1 closure** (Task 10).
- **Pre-Epic-10-design-freeze + pre-Story-6.3-design-freeze + pre-Story-6.10-design-freeze divergence reconciliation checkpoints** (Task 11).
- **Per-Story-touch refresh** if Epic 10 / Story 6.3 / Story 6.10 stories cite the synthesis and the citation does not match the current synthesis row.

## §7 — Synthesis-vs-per-shift-note reconciliation

- The **synthesis is authoritative for the cross-shift pattern + the dimension-level finding**.
- The **per-shift note is authoritative for the per-call observation citation**.
- Every synthesis row carries citation to per-shift note + per-call row index.
- Per-shift note revisions are logged in the synthesis Pack-revision log per the Story 0.4-0.10 supersession schema.

## §8 — Open ADR slots

Operations-policy ADR territory NOT committed at framework level:

1. **Operator-recruitment-incentive structure** — host-institution-mediated time-stipend default vs no-incentive; Trustee Panel approves at §2-tris.
2. **Recording technology** — host-helpline's existing call-recording-consent procedure vs notes-only researcher (notes-only is the safer default; rule of "host-helpline records OR researcher does not record" applies).
3. **Transcription mechanism** — manual notes-only vs host-helpline-call-recording with permission.
4. **Pseudonymization mechanism** — canonical slug + host-institution-type + per-call category granularity.
5. **Data-retention policy for raw notes post-synthesis** — 90-day operator-context default committed; specific archival mechanism deferred.
6. **Observer-positioning** — physical co-location vs remote-listen-only vs remote-watch-shoulder.
7. **Per-call caller-consent-spoken-script word-for-word Hindi phrasing** per host-helpline's existing consent procedure (the framework commits a default Hindi script in `caller-consent-spoken-script-hindi.md`; host-helpline may substitute its existing consent phrasing if equivalent in scope).
8. **Emotional-overload-observer-discretion-end specific trigger criteria** — distress markers + duration thresholds; deferred to per-engagement clinical judgment.
9. **Host-helpline-substitution discipline** if first host declines OR caller-consent-decline-rate too high; deferred to Trustee Panel decision.
10. **Operator-attribution mapping** operator workflow to TWT operator-attribution data model per Story 10.3.

## §9 — Related continuity / research surfaces

| Surface | Path | Relationship |
|---|---|---|
| TSCT reference learnings | `_bmad-output/research/tsct-reference-learnings.md` | Prior-art reference — read-only from this Story's perspective; potential host helpline if TSCT is chosen |
| Story 0.8 P0-2a teacher empathy protocol | `_bmad-output/research/p0-2a-teacher-interviews-protocol/` | First sister-leg of P0-2 four-leg discharge |
| Story 0.8 P0-2a synthesis | `_bmad-output/research/p0-2a-teacher-interviews.md` | First sister-leg synthesis destination |
| Story 0.9 P0-2b bereaved-spouse protocol | `_bmad-output/research/p0-2b-bereaved-spouse-protocol/` | Second sister-leg of P0-2 four-leg discharge |
| Story 0.9 P0-2b synthesis | `_bmad-output/research/p0-2b-bereaved-spouse.md` | Second sister-leg synthesis destination |
| Story 0.10 P0-2c vi-validation protocol | `_bmad-output/research/p0-2c-vi-validation-protocol/` | Third sister-leg of P0-2 four-leg discharge |
| Story 0.10 P0-2c vi-validation synthesis | `_bmad-output/research/p0-2c-vi-validation.md` | Third sister-leg synthesis destination |
| **Story 0.11 P0-2d operator-shadowing protocol (this surface)** | `_bmad-output/research/p0-2d-operator-shadowing-protocol/` | **Fourth and TERMINAL sister-leg** |
| **Story 0.11 P0-2d operator-shadowing synthesis (AC-named destination)** | `_bmad-output/research/p0-2d-operator-shadowing.md` | **Fourth and TERMINAL sister-leg synthesis destination** |
| Story 0.1 operational runbooks | `docs/runbooks/` | Operational continuity sister surface |
| Story 0.2 credential escrow | `docs/escrow/` | Continuity sister surface |
| Story 0.3 code escrow | `docs/escrow/` (extension) | Continuity sister surface |
| Story 0.4 degradation policy | `docs/degradation-policy/` | Continuity sister surface |
| Story 0.5 knowledge-transfer pack | `docs/knowledge-transfer/` | Continuity sister surface |
| Story 0.6 backup engineer | `docs/backup-engineer/` | Continuity sister surface |
| Story 0.7 fallback-handler ledger | `docs/fallback-handler-ledger/` | Continuity sister surface |

## §10 — P0-2 four-leg joint-discharge anchor — **TERMINAL LEG**

Story 0.11 contributes the **fourth and TERMINAL of four P0-2 legs**:

- **P0-2a** = Story 0.8 (teacher empathy interviews) — contributed; sister-leg
- **P0-2b** = Story 0.9 (bereaved-spouse conversation) — contributed; sister-leg
- **P0-2c** = Story 0.10 (VI/low-vision-member accessibility validation) — contributed; sister-leg
- **P0-2d** = Story 0.11 (this Story; operator shadowing) — **the TERMINAL leg**

The full P0-2 launch-gate property (UX-DR5 + AR-49 P0-2 Launch Gate Risks row at architecture line 4782 + UX §Phase-0 "no nominee-facing surface, relative-as-deceased flow, or Helpline Operator console ships in v1 without these conversations + observation on record" clause) **discharges WHEN Story 0.11 closes** (assuming Stories 0.8 + 0.9 + 0.10 also closed). Story 0.11 closure is the joint-discharge trigger for the full P0-2 launch-gate.

Specifically, Story 0.11 discharges the **"Helpline Operator console" clause** of the UX §Phase-0 v1-no-ship commitment (Stories 0.8/0.9 discharged the nominee-facing-surface + relative-as-deceased-flow clauses; Story 0.10 contributed to nominee-facing + member-app-accessibility-validation; Story 0.11 closes the operator-console clause).

## §11 — Operator-workflow-call-pattern observation worksheet provenance

The AC's **load-bearing surface** is the per-pattern verdict for routing-policy + SLA + helpline-call-to-ticket + member-lookup-form + read-back-card + operator-facing UX-DR55 register + Intake-Console-pattern-(b) decision-strip + verifier-console-context-from-helpline against lived shadowing data. This is **distinct from**:

- **Story 0.8's mental-model-validation surface** (does the participant's mental model of TWT match the design?)
- **Story 0.9's Pattern 4 sample-copy evaluation surface** (do the UX spec §12 sample-copy + grief-grammar elements land for *member-facing* dignified-validation?)
- **Story 0.10's UX-DR66/67/68 clause-evaluation surface** (do the accessibility commitments hold against lived AT-walkthrough?)

Story 0.11 evaluates **operator-side workflow + tooling + improvisation** against pre-stated:

- **Routing-policy category candidates** (Story 10.1 line 3322 `claim-related` + `contribution-related` + `KYC` + `technical` + `complaint` + sub-categories)
- **SLA-target candidates** (epics line 3296 `24h first-response` + `5 biz-day resolution` + `10 biz-day resolution` per category)
- **Helpline-call-to-ticket-workflow steps** (Story 10.3 5-step workflow)
- **Member-lookup-form patterns** (UX-DR45 4-criteria search: name + mobile + Aadhaar-masked + Pariwar-ID)
- **Read-back-card patterns** (UX-DR46 3-field read-back: name + mobile + school/district)
- **Operator-facing UX-DR55 precise-technical-register** (UX-DR55 operator-facing carve-out)
- **Intake-Console-pattern-(b) decision-strip** (UX spec line 1688 4-option strip: `save-progress` + `finalize-intake` + `transfer-to-supervisor` + `suspend-call`)
- **Verifier-console-context-from-helpline** (Story 6.10 line 2460 dependency — whether operator-mediated case context flows into Anita's signals panel as informative context vs. noise)

The per-pattern verdict feeds the divergence-log + Task 11 reconciliation routing to:

- **Story 10.1 routing-policy registry + SLA target** (epics line 3322 + 3296) — routing-policy-registry-category-revision + SLA-target-revision routed through Story 10.1 Dev Notes
- **Story 10.3 helpline call-to-ticket workflow** (epics line 3349 + SM-1 demo beat C3) — workflow-step-revision routed through Story 10.3 Dev Notes
- **Story 6.3 helpline-mediated claim filing** (epics line 2319) — UX-DR45 / UX-DR46 / operator-attribution / supervisor-escalation revision routed through UX-edit workflow
- **Story 6.10 verifier console signals panel** (epics line 2460) — verifier-console-context-from-helpline revision routed through Story 6.10 Dev Notes
- **UX-DR55 operator-facing register** (epics line 449) — operator-facing precise-technical-register revision routed through UX-edit workflow
- **UX spec §10 Intake-Console-pattern-(b)** (UX spec line 1688) — decision-strip option revision routed through UX-edit workflow

Revisions are integrated into Story-level Dev Notes / PRD FR-52 / UX-DR45/46/55 / architecture §3.5/3.5a via the divergence-log + Task 11 reconciliation, **NOT directly at framework-author-commit** per [[feedback_architecture_vs_prd_boundary]].

## §12 — Domain glossary

| Term | Meaning |
|---|---|
| P0-2 | UX §Phase-0 Prerequisites P0-2 launch-blocker — member-class validation field work (Hindi-using teacher + bereaved spouse + VI/low-vision member + operator shadowing) |
| P0-2d | The operator-shadowing leg of P0-2 — the TERMINAL leg |
| UX-DR5 | Empathy field-work gate (epics line 375) — the UX-DR that names P0-2 as a launch-blocker |
| UX-DR45 | `<MemberLookupForm>` member-lookup-with-disambiguation by name / mobile / Aadhaar-masked / Pariwar-ID scope-respecting (UX spec line 2089) |
| UX-DR46 | `<ReadBackCard>` operator-read-back caller-confirms 3-field (UX spec line 2089) |
| UX-DR49 | `<CallHelplineCTA>` cross-cutting fallback CTA three-tier recovery ladder (epics line 440) |
| UX-DR55 | Pattern 4 Dignified validation — member-facing dignified copy AND **operator-facing precise-technical-wording permitted** carve-out (epics line 449) |
| UX-DR62 | Pattern 11 Helpline fallback CTA placement three-tier recovery ladder (epics line 456) |
| FR-52 | Helpdesk first-class subsystem (PRD) |
| FR-37 | Helpline-mediated claim filing flow (PRD) |
| AR-47 | Helpdesk first-class subsystem architecture §3.5a (architecture line 323 + lines 2153-2221) |
| AR-49 | Launch Gate Risks — P0-2 row at architecture line 4782 |
| AR-65 | Verifier console signals panel (Story 6.10 dependency) |
| Architecture §3.5 | Telephony integration — Helpline Operator console (Persona #7); architecture lines 2098-2151 |
| Architecture §3.5a | Helpdesk ticketing subsystem (FR-52); architecture lines 2153-2221 |
| Persona #7 Priya | Paid trust staff at HQ, first TWT-side actor on any phone-initiated claim or dispute; intake budget ~10-15 min per call (UX spec lines 62 + 1467-1513) |
| Helpline Operator | Persona #7 Priya role; this Story's shadowing subject by analogy |
| TSCT | Trustees of Shikshakamitra Cooperative Trust — potential host helpline (prior-art reference at `_bmad-output/research/tsct-reference-learnings.md`) |
| NSCT | Northern States Cooperative Trust — analogous host-helpline candidate |
| Small-trust helpline | Welfare-trust / cooperative-trust / community-trust helpline operations; host-helpline-context for this Story |
| Observer-not-participant | P0-2d-distinct discipline: researcher does NOT interact with caller + does NOT prompt or coach operator + does NOT prescribe workflow + does NOT interfere with call + observes silently with minimal physical presence |
| Two-actor consent | P0-2d-distinct: operator written consent (one-time, before shadowing) + per-call caller spoken-and-recorded consent (dynamic, at start of each observed call) |
| Per-call-caller-spoken-recorded-consent | Operator informs caller in Hindi at call-open; caller's spoken response captured per host-helpline's existing call-recording-consent procedure OR per-shift notes |
| Caller-revocation-mid-call | Caller may revoke consent mid-call by stating revocation OR by ending call abruptly; researcher immediately ceases observation of that call + destroys any data captured from that call |
| Emotional-overload-observer-discretion-end | If a caller is in emotional distress + operator is managing the distress + observer's presence may compound that distress, researcher exits the call at observer-discretion per ethics-protocol §3.9 |
| Member-caller-privacy | AR-47 §3.5a tickets-owned-by-frozen-members suppression posture + DPDPA member-data principle by analogy applied to caller-identity-NEVER-recorded + caller-personal-content-NEVER-recorded |
| Routing-policy registry | Story 10.1 deterministic + audit-replayable invariant: `(category, sub_category, member_scope_context) → (target_role, target_scope, sla_first_response, sla_resolution)` mapping |
| SLA target | FR-52 24h first-response; 5/10 biz-day resolution per category (epics line 3296) |
| Helpline call-to-ticket | Story 10.3 workflow: operator receives call → member-lookup → category-selection → body-capture → submit → ticket created with `created_via: helpline_call` + `operator_attribution` + member-visible "We filed this for you — Operator [Name]" header |
| Member-lookup-form | UX-DR45 search-by-name/mobile/Aadhaar-masked/Pariwar-ID 4-criteria; used by Priya intake console |
| Read-back-card | UX-DR46 operator-reads-back + caller-confirms-verbally; 3-field card |
| Operator-attribution | Story 10.3 + 6.3 `created_via: helpline_call` + `operator_attribution: <operator_id>` + member-visible operator-name header |
| Supervisor-escalation | Story 6.3 AC line 2326-2328: operator encounters non-standard scenario → escalates to supervisor; case held with `intake_pending` |
| Intake-Console-pattern-(b) | UX spec line 1688 4-option decision-strip: `save-progress` · `finalize-intake` · `transfer-to-supervisor` · `suspend-call`; suited to data-entry surfaces |
| Operator-facing precise-technical register | UX-DR55 carve-out: member-facing dignified copy vs operator-facing precise-technical wording permitted; sample error copy table Hindi + English validates with P0-2 field work |
| Two-actor design discipline | UX spec line 1513: the spec designs *both* surfaces — the caller's voice experience AND Priya's screen |
| Sustained-multi-shift | P0-2d-distinct: ≥4 hours total observed-call time across ≥2 distinct shifts (vs Story 0.8 ≥45-min × 5 / Story 0.9 ≥60-min × 1 / Story 0.10 ≥60-min × 1) |
| Host-helpline-institution-approval | P0-2d-distinct precondition: host helpline institution operations lead grants formal written approval BEFORE Solo Builder approaches individual operator |
| Pseudonymization | Canonical pseudonyms `Operator-1` + `HostHelpline-1`; substitute `Operator-1A` + `HostHelpline-1A` for post-withdrawal substitution; caller identity NEVER recorded |
| Informed consent (operator) | Hindi-primary consent form covering participation purpose, data collection, identity protection, retention, withdrawal, compensation, no-obligation per ethics-protocol §2 (a)-(i) |
| Disability-context recruitment | NOT APPLICABLE to this Story — operator-context recruitment is via host-helpline operations lead's nomination |
| Cold approach | Cold-call / cold-visit / cold-text to host helpline OR to individual operator — **FORBIDDEN** per ethics-protocol §3.0 |
| Trustee approval pre-shadowing | Recorded in `trustee-review-log.md` as the second pre-shadowing row (P0-2d-distinct precondition inheriting Story 0.9 §2-tris + Story 0.10 §2-tris) |

## §13 — File index

| File | Purpose | Author-commit state |
|---|---|---|
| `README.md` | This framework charter | Closed by [edit] (this file) |
| `ethics-protocol.md` | Ethics protocol with 8 sections + §2-bis/tris/quater + §3.0/3.4/3.7/3.8/3.9 staff-workplace-context escalations | Closed by [edit] (Task 2) |
| `shadowing-protocol.md` | Conduct runbook with §0 + §0-bis host-helpline + Trustee Panel pre-engagement checklists + §1-§7 shadowing flow | Closed by [edit] (Task 3) |
| `informed-consent-template-operator-hindi.md` | Hindi operator-facing consent form | Closed by [edit] (Task 3) |
| `informed-consent-template-operator-english.md` | English mirror for researcher reference + trustee review | Closed by [edit] (Task 3) |
| `caller-consent-spoken-script-hindi.md` | Operator-spoken script for per-call caller-consent at call-open | Closed by [edit] (Task 3) |
| `observation-question-bank.md` | 6 AC-named observation dimensions + 7th cross-cutting register-grammar dimension; observer-side note-prompts NOT operator-prompts | Closed by [edit] (Task 4) |
| `operator-workflow-call-pattern-observation-worksheet.md` | AC's load-bearing observation-capture instrument; 12-section verdict-matrix | Closed by [edit] (Task 4) — scaffolded with `pending-shadowing` verdicts |
| `assumption-inventory.md` | 32 pre-stated PRD/UX/architecture operator-workflow assumptions; 17 critical-hypothesis-tagged | Closed by [edit] (Task 4) — `pending-shadowing` validation status |
| `per-shift-note-schema.md` | Per-shift note shape definition including per-call observation rows | Closed by [edit] (Task 5) |
| `synthesis-schema.md` | 12-section synthesis structure with §4 operator-workflow-call-pattern observation worksheet evaluation load-bearing surface | Closed by [edit] (Task 5) |
| `divergence-log.md` | Append-only divergence log schema with 7 P0-2d-distinct severity values | Closed by [edit] (Task 5) |
| `trustee-review-log.md` | Trustee review log with 3 pre-staged row slots | Closed by [edit] (Task 5) |
| `host-helpline-engagement-log.md` | Pseudonym-to-engagement-path log with 1 pending-engagement row | Closed by [edit] (Task 5) |
| `shift-notes/README.md` | Placeholder explaining per-shift note destination | Closed by [edit] (Task 5) |
| `shift-notes/archived/README.md` | Placeholder explaining 6-month archive destination per Story 0.9 P-13 | Closed by [edit] (Task 5) |
| `../p0-2d-operator-shadowing.md` (one level up; AC-named) | Scaffolded synthesis file with `_AWAITING_SHADOWING_CONDUCT_` placeholders | Closed by [edit] (Task 6) |
