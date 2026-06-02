# Assumption Inventory — P0-2b Bereaved-Spouse Conversation

**Authority:** Story 0.9 AC-1 + AC-2 · UX spec §0 Stance #4 + Stance #7 · UX spec §1.5 grief-frame table (line 390) · UX spec §5 grief-context surfaces (Ravi-mode + Sunita-mode + memorial-state) · UX spec §11 grief-context handling · UX spec §12 Pattern 4 sample copy (lines 2334-2360) · UX spec §Held-ness Under Grief (line 315) · UX-DR31-33 Ravi-mode primitives · UX-DR35 NomineeConsole + "fursat" cadence · UX-DR38 MemorialAuthorshipSurface · UX-DR50 SaveAndResumeAffordance · UX-DR55 Pattern 4 dignified-validation · PRD §2 nominee persona (PRD lines 60-63) · PRD §UJ-3 nominee files claim narrative (PRD lines 93-94) · architecture §1.5 grief-aware-design property · TSCT reference learnings (`_bmad-output/research/tsct-reference-learnings.md`) — operational claim-filing precedent

**Scope:** Pre-stated assumptions that this Story's empathy work is designed to **validate or refute**. Pre-stating the assumptions is the *only* way the divergence-log can detect divergence. The synthesis (Task 9) updates `validation_status` per assumption. Per [[feedback_gap_analysis_observational]]: this inventory IS the gap-detection instrument.

**Discipline:**
- ≥30 assumptions across 8 categorizations (Dimensions 1-5 + Pattern 4 sample copy + grief-grammar cross-cutting + memorial).
- Each row: `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` | `affected_epic_stories`.
- At author-commit, every row carries `validation_status = pending-interview`.
- **Critical hypotheses tagged** (gate Epic 6 + Epic 9 + Epic 11b design freezes) are marked with **⚠️ CRITICAL** in the inventory.
- Synthesis Task 9 populates `validation_status` per assumption + appends divergence-log rows for `refuted` / `nuanced` outcomes.
- **Coverage-gap acknowledgment:** If the spouse declines Pattern 4 evaluation mid-interview (per ethics-protocol §3.7 opt-in), the per-sample-copy assumptions in "Pattern 4 sample copy assumptions" and the cross-cutting assumptions in "Grief-grammar cross-cutting assumptions" remain `not-evaluated-due-to-spouse-non-engagement`. This is an honest research gap, not a framework defect. The divergence-log records the gap per pattern-4-evaluation-worksheet.md §6-§7 non-engagement protocol, and affected Epic design freezes proceed under explicit gap-acknowledgment.

---

## Dimension 1: Emotional pace tolerance (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-pace-grief-month` | PRD line 63 ("Files a claim ~1 month after death (grief eases the rush)") | Bereaved families file claims approximately 1 month after death; the grief pace eases the rush within that window. | pending-interview | Epic 6 Stories 6.2 + 6.3 (claim filing flow timing assumptions) |
| `A-pace-no-rush` ⚠️ CRITICAL | UX spec line 295 Stance #4 ("Grief is held, not processed") | Every claim-process interaction takes 3-5× longer than baseline post-grief; flows must accommodate this without anxiety triggers. | pending-interview | Epic 6 + Epic 9 (all claim + reconciliation surfaces) |
| `A-pace-broken-flow` ⚠️ CRITICAL | UX spec line 295 + UX-DR50 (`<SaveAndResumeAffordance>` line 441) | Grief flows are interrupted by emotional waves; multi-step forms must save state always; resume must be friction-free. | pending-interview | Story 9.1 NomineeConsole; Story 6.2 ClaimProxyFlowShell; Story 11b.4 Memorial Authorship |
| `A-emotion-pace-no-multitasking` ⚠️ CRITICAL | UX spec line 315 ("System is holding me. Not 'processing my case'") | Bereaved spouse cannot multitask; single-decision-per-screen + clear focus is required; complex compound forms are overwhelming. | pending-interview | Epic 6 + Epic 9 + Epic 11b (all multi-step grief-context surfaces) |
| `A-pace-fursat-language` | UX spec line 67 ("'fursat' tone, never 'complete your task'") + UX spec line 283 (Reena renewal example "Aaram se, jab fursat ho") | The Hindi term "fursat" (when you have leisure) lands as warm + dignified rather than dismissive or cold. | pending-interview | Story 9.1 NomineeConsole copy; Stories 3.X member-renewal copy under grief; all grief-context Pattern 4 copy |

---

## Dimension 2: Document-gathering experience (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-doc-death-certificate-hardest` | Inferred from common Bihar bureaucratic patterns + TSCT operational learnings | Death certificate procurement is the longest single-document delay in claim-filing; weeks to months. | pending-interview | Story 6.5 Death Certificate OCR + Story 6.7 Ground Inspection |
| `A-doc-multiple-trips` | Inferred + TSCT operational learnings | Bereaved family makes 5-10+ trips for document collection (death certificate office + bank + IFSC verification + nominee bank account opening). | pending-interview | Story 6.5 + Story 6.7 + Story 6.8 Claim-Time Nominee Bank Detail Collection |
| `A-doc-collection-burden` | Inferred from PRD §UJ-3 + UX spec grief-context patterns | Document-gathering is the heaviest practical burden post-bereavement; emotional + logistical strain compounds. | pending-interview | Story 6.5 + Story 6.7 + Story 9.3 Bank Statement Upload |
| `A-doc-staff-helps` ⚠️ CRITICAL | UX-DR36 ("Hum aapke liye padh lenge" / "We'll read for you" fallback) + Story 9.3 staff-fallback commitment | Staff helping with document collection (or document interpretation as in bank statement OCR fallback) feels dignified rather than condescending. | pending-interview | Story 9.3 BankStatementUpload "Hum aapke padh lenge" fallback; Story 6.5 Death Certificate OCR + parity check; Story 6.7 Ground Inspection |
| `A-doc-village-collection` | Inferred + Bihar cadre operational patterns | Document collection often requires village elder / sarpanch / school principal endorsement; this validation step is dignifying when handled with respect. | pending-interview | Story 6.7 Ground Inspection + Story 6.10 Verifier Console |

---

## Dimension 3: Interaction with trust staff (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-staff-named-shepherd` ⚠️ CRITICAL | UX spec line 390 + PRD §UJ-3 line 93 ("a human shepherd — Anita-class — to walk them through") | A named (not anonymous) human shepherd assigned per claim and surfaced on claim status page provides dignity grammar that members + family deeply value. | pending-interview | Story 6.12 Human Shepherd Assignment; Story 6.10 Verifier Console; Story 9.1 NomineeConsole staff-takeover |
| `A-staff-village-visit` | Inferred + Bihar cadre operational patterns | Staff visiting the village / spouse's home is high-trust; remote-only interaction (phone, app) feels distant in bereavement context. | pending-interview | Story 6.7 Ground Inspection Scheduling |
| `A-staff-trust-call` | PRD §UJ-3 line 94 (helpline call + shepherd assignment) | Phone calls from named staff (not generic helpline numbers) feel trustworthy + supportive. | pending-interview | Story 6.3 Helpline-Mediated Claim Filing; Story 6.12 Human Shepherd |
| `A-staff-no-questioning` | UX spec line 295 ("Grief is held, not processed") + UX spec line 315 (witness-not-bailiff) | Staff asking detailed verification questions during ground inspection feels invasive vs caring; bereaved family wants to feel believed, not investigated. | pending-interview | Story 6.7 Ground Inspection; Story 6.10 Verifier Console signals panel; Story 6.11 Verification Decision Strip |
| `A-staff-helpline-credible` | UX spec line 449 UX-DR55 Pattern 4 helpline fallback commitment | A trust helpline number is credible + members will actually call when stuck (as opposed to giving up or seeking informal help). | pending-interview | Stories 5.X (helpline architecture); Story 8.11 Call Helpline CTA; cross-cutting Pattern 4 helpline fallback rows |

---

## Dimension 4: What felt dignified vs transactional (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-dignity-direct-bank` | TSCT reference + PRD §1.1 facilitator model + UX spec §5 | Direct UPI to nominee (not via trust intermediation) feels dignified vs facilitator model that intermediates the money. | pending-interview | Story 8.4 UPI Intent flow; Story 7.6 Pool-bound payment enforcement; broader facilitator-not-intermediary architecture commitment |
| `A-dignity-amount-not-published` | Inferred + UX spec §0 Stance #1 DPDPA consent | Public amount publication (e.g., "₹49 lakh raised") feels exposing for the family; consent-gated publication per Story 6.9 is the correct posture. | pending-interview | Story 11b.3 Sahyog Vivran per-claim story (amount visibility); Story 6.9 Claim-time DPDPA consent; Story 11b.6 In Memoriam |
| `A-dignity-no-marketing` | UX spec §0 Stance #4 + Module Shelf grief-context suppression (UX spec line 77 + 204 + 295) | Marketing-grade copy or partner-marketing modules during grief-context surfaces is offensive; structural suppression per Module Shelf state-machine rule is correct. | pending-interview | Module Shelf grief-context suppression (state-machine-enforced); Stories 12.X module marketplace surfaces; cross-cutting Pattern 4 copy register |
| `A-dignity-witness-cadence` ⚠️ CRITICAL | UX spec line 67 + 315 (witness-not-bailiff) | Witness-not-bailiff register feels dignified; administrative-enforcer register feels cold or invasive. | pending-interview | Story 9.1 NomineeConsole (load-bearing "fursat cadence operational-posture invariant" per epics line 3094); all grief-context surfaces |
| `A-pattern4-no-blame-register` ⚠️ CRITICAL | UX spec line 2342 Pattern 4 member-facing surface guideline | Avoiding blame-first phrasing ("Error:", "Invalid", "Failed", "Forbidden") + alarming red iconography lands as dignified; spouse feels the system is helping rather than punishing. | pending-interview | All member-facing error/validation surfaces; Pattern 4 sample copy rows in pattern-4-evaluation-worksheet.md |

---

## Dimension 5: Role of family/community in the claim (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-family-relative-as-proxy` ⚠️ CRITICAL | UX spec line 66 Ravi-mode + UX-DR31 `<ClaimProxyFlowShell>` + PRD §2 nominee persona | Relative-as-deceased (Ravi-mode) is the dominant pattern; the spouse / adult son / brother typically operates the deceased member's phone to file the claim. | pending-interview | Story 6.2 Member App Claim Filing Flow Ravi-mode; UX-DR31 + UX-DR32 + UX-DR33 primitives |
| `A-family-eldest-male-spokesperson` ⚠️ CRITICAL | Inferred + Bihar cultural cadre patterns | The eldest male in the family (adult son / brother / brother-in-law) typically serves as primary spokesperson during claim filing; spouse may be secondary in conversational interactions even though she is the nominee. | pending-interview | Story 6.2 ClaimProxyFlowShell — proxy identity registration; Story 6.3 Helpline-Mediated Claim Filing — operator interaction with family spokesperson; Story 9.1 NomineeConsole authority modeling |
| `A-family-multiple-decision-makers` | Inferred + Bihar joint-family patterns | Multiple family members are involved in claim decisions (slow consensus typical); single-decision-maker assumption is over-simplified. | pending-interview | Story 6.2 + Story 6.8 nominee bank detail collection — multi-person verification expected |
| `A-family-village-elder-validation` | Inferred + Bihar cultural cadre patterns | Village elder / school principal / colleague endorsement is important for family trust in the system; trust without local endorsement feels suspicious. | pending-interview | Story 6.7 Ground Inspection (peer mesh verification + village context); Story 6.6 Peer Mesh; Story 0.7 fallback handler ledger village context |
| `A-family-shared-phone` | UX spec line 191 OQ-UX-15 (shared-phone scenarios + open question) | Bereaved family shares one smartphone (deceased member's phone OR another family phone); single-phone-per-member assumption may not hold. | pending-interview | Story 6.2 Ravi-mode authentication (phone+OTP transferability); cross-cutting Stories 3.X account/session architecture |

---

## Pattern 4 sample copy assumptions (8 assumptions — one per sample-copy row)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-pattern4-hrms-not-found-lands` | UX spec line 2353 | The "We couldn't find this HRMS in our records. Please check the number, or call helpline" copy lands as dignified for the bereaved-spouse context (or claim-filing-by-Ravi context). | pending-interview | Story 6.2 + Story 6.3 — claim filing HRMS validation copy |
| `A-pattern4-doc-upload-failure-lands` | UX spec line 2354 | The "Photo upload did not complete. Tap to try again, or save and continue later" copy lands as dignified — particularly the "save and continue later" affordance for grief-paced flows. | pending-interview | Story 6.5 Death Certificate OCR + parity check; Story 9.3 BankStatementUpload |
| `A-pattern4-date-outside-lockin-lands` | UX spec line 2355 | The "This date is outside the lock-in period. Helpline can review if there's a special case" copy lands as dignified — particularly the "special case" framing for grief context. | pending-interview | Story 3.6 ₹110 Vyawastha Shulk via UPI Intent; Story 3.10 Voluntary withdrawal (lock-in period contexts) |
| `A-pattern4-upi-cancelled-lands` | UX spec line 2356 | The "The contribution did not complete. Try again now, or come back later — your pool stays open until cycle close" copy lands as dignified. (Note: spouse may not have experienced UPI Intent failures in their claim — Pattern 4 evaluation may be context-extrapolated rather than directly lived.) | pending-interview | Story 8.4 UPI Intent flow; Story 8.5 UPI Failure Coach |
| `A-pattern4-bank-statement-format-lands` ⚠️ CRITICAL | UX spec line 2357 (the Sunita-facing sample) | The "We're working on this bank format. Staff can process it manually. We'll notify you when matching is complete" copy lands as dignified — particularly the "Staff can process it manually" framing of the "Hum aapke padh lenge" fallback. | pending-interview | Story 9.3 BankStatementUpload + "Hum aapke padh lenge" fallback; Story 9.1 NomineeConsole staff-takeover-by-day-N |
| `A-pattern4-otp-not-received-lands` | UX spec line 2358 | The "OTP did not arrive. Try resending shortly, or call helpline for assistance — we can verify identity by other means" copy lands as dignified. | pending-interview | Story 3.2 Member Mobile OTP Authentication; Story 6.2 ClaimProxyFlowShell Ravi-mode handover-trust-OTP |
| `A-pattern4-member-already-enrolled-lands` | UX spec line 2359 | The "Great news — this member is already with TWT! Your invite quota stays available for other colleagues" copy lands as dignified. (Note: invite flow is not directly relevant to bereaved-spouse claim experience.) | pending-interview | Story 13.7 Invite Share Sheet |
| `A-pattern4-eligibility-failed-lands` | UX spec line 2360 | The "Your membership is still in the lock-in period until [date]. Once lock-in completes, your pool participation begins automatically" copy lands as dignified — particularly the "begins automatically" reassurance. | pending-interview | Story 3.7 Lock-in clock widget; Stories 3.X eligibility surfaces |
| `A-pattern4-helpline-third-tier` | UX spec line 449 UX-DR55 Pattern 4 grammar element (3) helpline-fallback + cross-cutting assumption A-staff-helpline-credible | The helpline fallback (Pattern 4's required third element: what's wrong + what to do next + **helpline fallback**) lands as credible and usable in grief context — bereaved spouses and Ravi-mode users will actually call the helpline when they encounter it in an error message, rather than giving up or seeking informal help. | pending-interview | All member-facing error/validation surfaces carrying inline helpline fallback copy; Stories 5.X (helpline architecture); Story 8.11 Call Helpline CTA; cross-cutting Pattern 4 samples 1, 3, 6 (inline helpline present) |

---

## Grief-grammar cross-cutting assumptions (7 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-grief-fursat-cadence` ⚠️ CRITICAL | UX spec line 67 + 295 + 315 + UX-DR35 fursat cadence commitment | The "fursat" cadence (grief-respectful pacing register) lands as warm and dignified — bereaved spouse responds positively to "aaram se, jab fursat ho" framing rather than "complete your task" deadline framing. | pending-interview | Story 9.1 NomineeConsole (epics line 3094 load-bearing); Story 8.X notification cadence; all grief-context Pattern 4 copy |
| `A-grief-witness-not-bailiff` ⚠️ CRITICAL | UX spec line 67 + 295 + 315 | The witness-not-bailiff register (system witnesses user's experience, does not enforce compliance) lands as dignified. | pending-interview | Story 9.1 NomineeConsole; Story 6.X claim filing flows; Story 11b.X memorial surfaces |
| `A-grief-no-countdowns` ⚠️ CRITICAL | UX spec line 295 + 390 | No-countdowns-under-grief discipline lands correctly — bereaved family does not want urgency framing; "X days left" countdowns trigger anxiety rather than helpful awareness. | pending-interview | Sunita-mode console (Epic 9 Story 9.1); Ravi-mode home (Epic 6 Story 6.2); account-frozen-state surfaces |
| `A-grief-no-penalties` ⚠️ CRITICAL | UX spec line 295 + 390 | No-penalties-under-grief discipline lands correctly — bereaved family may miss deadlines under grief; penalty enforcement deepens distress rather than driving compliance. | pending-interview | Story 3.8 Annual Renewal grace; Story 9.1 NomineeConsole staff-takeover (no penalty for nominee disengagement); Story 8.10 Out-of-band contribution policy |
| `A-grief-held-not-processed` ⚠️ CRITICAL | UX spec line 295 + 315 (Stance #4 "Grief is held, not processed" + Felt-Experience "the system is holding me") | The "held-not-processed" felt-experience commitment lands — bereaved spouse describes the experience as being held (presence, witnessing) rather than being processed (workflow, queue management). | pending-interview | All grief-context surfaces — Ravi-mode + Sunita-mode + memorial + Module Shelf grief-context suppression |
| `A-grief-black-bordered-portrait` | UX spec line 295 + 315 + 390 + UX-DR17 `<PortraitFrame>` + `<FuneralFrame>` (UX spec line 704) | Black-bordered visual treatment of deceased member's portrait is culturally appropriate Hindi-belt obituary convention; lands as dignified rather than morbid. | pending-interview | Story 11b.5 Memorial Visual Components (PortraitFrame + KinshipLattice); Ravi-mode home surface |
| `A-grief-no-marketing-in-frozen-states` | UX spec line 77 + 204 + 295 (Module Shelf grief-context exclusion enforced state-machine rule) | Module Shelf grief-context structural suppression lands correctly — bereaved family opens deceased's phone and finds no partner-marketing cards; this is the right grammar. | pending-interview | Module Shelf grief-context suppression (state-machine-enforced via Story 3.1 account-frozen derived overlay); Stories 12.X module marketplace surfaces |

---

## Memorial assumptions (5 assumptions)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-memorial-consent-opt-in` ⚠️ CRITICAL | UX spec §0 Stance #1 (DPDPA claim-time consent) + Epic 11b Story 11b.6 commitment | Opt-in (not opt-out) default for memorial publication is the right posture — bereaved family must affirmatively opt in; default opt-in is unacceptable per Stance #1. | pending-interview | Story 6.9 Claim-time DPDPA consent; Story 11b.3 Sahyog Vivran; Story 11b.4 Memorial Authorship; Story 11b.6 In Memoriam |
| `A-memorial-portrait-cultural-treatment` ⚠️ CRITICAL | UX spec line 295 + UX-DR17/18 + epics line 3865 ("culturally-appropriate Hindi-context visual treatment validated against Story 0.9") | Family wants to upload a portrait for the memorial — the black-bordered cultural treatment lands; alternative non-bordered or social-network-style treatments do not. | pending-interview | Story 11b.5 PortraitFrame + KinshipLattice; Story 11b.4 Memorial Authorship Surface |
| `A-memorial-family-writes-story` | Epics line 3830 (Story 11b.4 "family writes the story" stance) + UX-DR38 MemorialAuthorshipSurface | Family wants to write the memorial story themselves (not have it auto-generated or written by trust); the family-authorship pacing per UX-DR50 save-and-resume lands. | pending-interview | Story 11b.4 Memorial Authorship Surface; Story 11b.3 Sahyog Vivran |
| `A-memorial-relations-private` | UX-DR18 `<KinshipLattice>` optional kinship + UX spec line 3866 "respectful structural diagram, NOT social-network-style graph" | Family wants kinship relationships to be optional + private by default; not all families want extended family relationships publicly listed. | pending-interview | Story 11b.5 KinshipLattice (optional + consent-governed) |
| `A-memorial-opt-out-respected` | Epics line 870 + UX spec Stance #1 ("opt-out rates may run 15-35% in target population") | Some families prefer private processing of the claim with no public memorial; this opt-out path must be respected without compromising disbursement. | pending-interview | Story 6.9 DPDPA consent opt-out path; Story 11b.X memorial surfaces consent-respect; Yogdaan Bahi alternative emotional-anchor |

---

## TSCT-precedent meta-assumption (1 assumption)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `affected_epic_stories` |
|---|---|---|---|---|
| `A-tsct-precedent-credible` ⚠️ CRITICAL | TSCT reference learnings (~556 deceased-member families supported per `_bmad-output/research/tsct-reference-learnings.md`) | The TSCT precedent makes TWT credible to bereaved spouses — TSCT operational history is a trust signal that TWT can inherit. Bereaved spouse who has been through TSCT (or comparable) trusts the TWT model more readily than a from-scratch trust. | pending-interview | Cross-cutting trust posture; PRD §1 facilitator model; Stories 2.X Niyamavali publishing; Stories 11a.X public trust identity |

---

## Critical hypothesis summary (18 critical-tagged assumptions)

These 18 assumptions, if refuted or nuanced, gate Epic 6 + Epic 9 + Epic 11b design freezes per AC-2:

1. `A-pace-no-rush` — Epic 6 + Epic 9 + Epic 11b all-surfaces grief-paced flow assumption
2. `A-pace-broken-flow` — Story 9.1 + Story 6.2 + Story 11b.4 save-and-resume assumption
3. `A-emotion-pace-no-multitasking` — Epic 6 + Epic 9 + Epic 11b single-decision-per-screen assumption
4. `A-doc-staff-helps` — Story 9.3 + Story 6.5 + Story 6.7 staff-fallback dignity assumption
5. `A-staff-named-shepherd` — Story 6.12 + Story 6.10 + Story 9.1 named-shepherd dignity assumption
6. `A-dignity-witness-cadence` — Story 9.1 load-bearing "fursat cadence operational-posture invariant" (epics line 3094)
7. `A-pattern4-no-blame-register` — all member-facing error/validation surfaces; Pattern 4 sample copy rows
8. `A-family-relative-as-proxy` — Story 6.2 Ravi-mode; UX-DR31 + 32 + 33 primitives
9. `A-family-eldest-male-spokesperson` — Story 6.2 + 6.3 + 9.1 family-spokesperson modeling
10. `A-pattern4-bank-statement-format-lands` — Story 9.3 + Story 9.1 staff-takeover-by-day-N
11. `A-grief-fursat-cadence` — Story 9.1 load-bearing + Story 8.X notification cadence
12. `A-grief-witness-not-bailiff` — all grief-context surfaces
13. `A-grief-no-countdowns` — Sunita-mode + Ravi-mode + account-frozen-state surfaces
14. `A-grief-no-penalties` — Story 3.8 + Story 9.1 + Story 8.10
15. `A-grief-held-not-processed` — all grief-context surfaces (felt-experience commitment)
16. `A-memorial-consent-opt-in` — Story 6.9 + Stories 11b.3/4/6 memorial-consent posture
17. `A-memorial-portrait-cultural-treatment` — Story 11b.5 PortraitFrame culturally-appropriate
18. `A-tsct-precedent-credible` — cross-cutting trust posture

(The canonical count is 18 critical-tagged assumptions. This is the authoritative count for synthesis §5 + synthesis-schema §5 + divergence summary cross-references.)

---

## Synthesis cross-reference

At Task 9 synthesis-author-commit, the synthesis populates each assumption row's:
- `validation_status` ∈ {`validated`, `refuted`, `nuanced`, `not-evaluated-due-to-spouse-non-engagement`}
- `synthesis_citation` — which synthesis row addresses this assumption (e.g., `Synthesis §3.1 finding-2`)
- `divergence_log_row` — populated if `validation_status` ∈ {`refuted`, `nuanced`}; divergence-log row ID

For each `refuted` or `nuanced` assumption (and each Pattern 4 verdict requiring revision per pattern-4-evaluation-worksheet.md), Solo Builder appends a row to `divergence-log.md` with the schema columns populated; Task 11 reconciliation closes the divergence per the affected Epic design freeze.
