# Assumption Inventory — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 Task 4 + README §3 four-way property/protocol/policy/gap-analysis discipline + [[feedback_gap_analysis_observational]] gap analysis is observational.

**Purpose:** Pre-state the PRD/UX assumptions about Sushil-class + Reena-class members that this empathy work validates or refutes. Without a pre-stated assumption list, divergence is structurally invisible — every observation reads as "new finding" rather than "contradiction of assumption N". The assumption-inventory IS the gap-detection instrument.

**Schema:** Each row has columns: `assumption_id` (slug) | `source` (PRD / UX spec / architecture cite with line numbers) | `assumption_text` (verbatim or paraphrased with cite) | `validation_status` (`pending-interviews` at author-commit; `validated` | `refuted` | `nuanced` after Task 9 synthesis) | `synthesis_citation` (which synthesis row addresses this; `pending` until Task 9) | `divergence_log_row` (if refuted or nuanced, which divergence-log row captures the divergence; `n/a` for validated; `pending` until Task 9).

**Status:** At author-commit (2026-05-30, Task 4), every row carries `validation_status = pending-interviews`, `synthesis_citation = pending`, `divergence_log_row = pending`. Task 9 synthesis populates these columns from lived data.

---

## Dimension 1: Financial-literacy baseline assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-fin-110-elastic | PRD §2.2 line 51 | ₹110 annual Vyawastha Shulk is "noticeable line item" for Reena-class but not prohibitive | pending-interviews | pending | pending |
| A-fin-310-scrutinized | PRD §2.2 line 51 | ~₹310 monthly contribution gets scrutinized every cycle by Reena-class — the elasticity gradient is steep | pending-interviews | pending | pending |
| A-fin-group-insurance-inadequate | PRD §2.1 line 47 | Group-insurance coverage through state education department (~₹2 lakh for Sushil; analogous for Shikshakamitra) is felt as "math doesn't reach" | pending-interviews | pending | pending |
| A-fin-sole-earner | PRD §2.1 line 47 | Sushil-class is sole earner; spouse's income is supplementary; family's financial fragility is a felt anxiety | pending-interviews | pending | pending |
| A-fin-chanda-familiar | UX spec lines 880-883 | Sushil already understands collecting money for a colleague's family (chanda); culturally familiar practice in Hindi-belt government-teacher cadre | pending-interviews | pending | pending |
| A-fin-no-portfolio-tracking | UX spec lines 890-892 | Sushil's bank balance and TWT participation are separate mental ledgers; member never wonders "how much have I given to TWT this year" | pending-interviews | pending | pending |
| A-fin-no-comparison | UX spec lines 891-892 | Sushil doesn't think about whether his contribution is bigger or smaller than other members' (community model is equal participation, not competitive) | pending-interviews | pending | pending |

---

## Dimension 2: Mobile-device usage assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-dev-smartphone-primary | PRD §2.1 line 47 + UX spec line 56 | Sushil-class is smartphone-primary; WhatsApp daily; no laptop at home | pending-interviews | pending | pending |
| A-dev-basic-android | PRD §2.2 line 51 + UX spec line 56 | Reena-class uses basic Android phone (~2 GB RAM, 4G intermittent) | pending-interviews | pending | pending |
| A-dev-snapdragon-4-floor | architecture line 2821 + UX spec §6 | Snapdragon 4-series, 3 GB RAM is the device floor for member-app primary surfaces | pending-interviews | pending | pending |
| A-dev-whatsapp-universal | UX spec line 427 | WhatsApp is universal in the cadre; informs invite-a-fellow-teacher OS share-sheet flow | pending-interviews | pending | pending |
| A-dev-telegram-not-default | PRD §2.1 line 47 + UX spec line 56 | Sushil is "not a Telegram heavy" — Telegram only if a colleague pulls him in | pending-interviews | pending | pending |
| A-dev-intermittent-4g | PRD §2.1 + UX spec lines 56-57 | 4G coverage is intermittent in Vaishali district; data is a noticeable cost for Reena-class (data-cost ceiling per UX Stance #8) | pending-interviews | pending | pending |
| A-dev-shared-phone | UX spec lines 191-192 | Shared-phone scenarios common — multiple Shikshakamitra women in joint family share devices; OQ-UX-15 surfaces this as unspec'd | pending-interviews | pending | pending |
| A-dev-bus-commute-attention | UX spec line 224 + line 530 | Sushil's bus-commute attention budget is ~2 minutes for contribution loop; cluttered home screens violate this | pending-interviews | pending | pending |

---

## Dimension 3: UPI comfort assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-upi-muscle-memory | UX spec lines 426 + 897-898 | Sushil-class has existing UPI muscle memory from PhonePe/GPay/BHIM; UPI Intent pre-fill aligns with this | pending-interviews | pending | pending |
| A-upi-vpa-verification-habit | UX spec line 898 | Sushil's UPI mental model includes typing recipient name + verifying recipient before sending; UPI Intent pre-fill removes that step (may feel less careful first time) | pending-interviews | pending | pending |
| A-upi-not-power-user | UX spec line 56 | Sushil is "not a UPI power user"; basic transactional usage, not advanced features | pending-interviews | pending | pending |
| A-upi-screenshot-tradition | UX spec line 897 | TSCT's screenshot-receipt model is part of cadre's mental model (member takes screenshot, sends to WhatsApp group, waits for acknowledgment) | pending-interviews | pending | pending |
| A-upi-utr-unfamiliar | UX spec lines 257-258 | UTR as a *concept* is not widely understood; permissive validation (12-digit numeric OR 22-char alphanumeric NEFT/RTGS) accommodates participant confusion | pending-interviews | pending | pending |
| A-upi-intent-pre-fill-works | UX spec lines 255-256 | UPI Intent pre-fill (VPA + amount + transaction reference + transaction note all pre-populated) works — member confirms without double-checking | pending-interviews | pending | pending |
| A-upi-failure-friction | UX spec line 269 | UTR mismatch screenshot upload is acceptable friction-budget cost paid by Sushil to protect Reconciliation integrity | pending-interviews | pending | pending |

---

## Dimension 4: Trust-source mapping assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-trust-colleague-primary | UX spec line 56 + PRD §2.1 line 47 | Colleague-to-colleague is the primary trust register (UJ-1: "a colleague tells him about TWT; he downloads it because the colleague's WhatsApp message includes a 6-digit field-worker code") | pending-interviews | pending | pending |
| A-trust-pariwar-frame | UX spec line 311 | Trust framing is "Pariwar" (extended-family / community), not "service / platform / customer relationship" | pending-interviews | pending | pending |
| A-trust-sammanit-sathi | UX spec lines 309-310 | Hindi address *सम्मानित साथी* (honored colleague) is the felt relationship, not branding decoration | pending-interviews | pending | pending |
| A-trust-helpline-credible | epics line 813 + UX §1 Helpline Operator | Helpline operator as primary claim-time UX is trustworthy to cadre; phone call is preferred channel for high-stakes interactions | pending-interviews | pending | pending |
| A-trust-no-public-donation | PRD §2 line 82 + UX spec line 104 | Public donors / non-teachers wanting to contribute are explicitly out in v1; trust posture is teacher-to-teacher only | pending-interviews | pending | pending |
| A-trust-village-elder | (PRD §2 implicit + UX spec §6 visual references) | Village elders / panchayat figures are part of trust-geography for financial decisions in Bihar villages | pending-interviews | pending | pending |
| A-trust-no-laptop-context | PRD §2.1 line 47 | Sushil-class does NOT have laptop at home; all trust-validation happens on phone / in-person / via family | pending-interviews | pending | pending |

---

## Dimension 5: Grief experience assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-grief-dignity-over-delight | UX spec lines 402-403 | Dignity-over-delight: celebratory animation when first contribution confirms would feel infantilizing in death-support context | pending-interviews | pending | pending |
| A-grief-quiet-confirmation | UX spec line 403 | Emotional reward is "quiet sense of having done the right thing," not dopamine hit | pending-interviews | pending | pending |
| A-grief-fursat-cadence | UX spec line 121 + line 129 | Bereaved spouse (Sunita-mode) uses "fursat" (when comfortable / when ready) cadence, never "complete your task" pressure | pending-interviews | pending | pending |
| A-grief-shok-sabha-grammar | UX spec lines 441-442 | Village remembrance (shok sabha) — when a teacher dies, school gathers, colleagues speak, each one signs "मैं उपस्थित था।" — digital echo informs memorial design | pending-interviews | pending | pending |
| A-grief-1-month-delay | PRD line 63 | Family files claim ~1 month after death (grief eases the rush); Account State Machine handles claim-time entry | pending-interviews | pending | pending |
| A-grief-helpline-first | PRD UJ-3 line 93 | Bereaved family first calls helpline; trustee assigns human shepherd; Anita-class walks them through | pending-interviews | pending | pending |
| A-grief-WhatsApp-collection-prior | UX spec line 897 + TSCT reference | Prior experience with phone-based collection (WhatsApp group, Telegram) shapes expectations for TWT contribution loop | pending-interviews | pending | pending |

---

## Dimension 6: Mental-model + cultural-grammar assumptions

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-mm-chanda | UX spec lines 880-883 (CRITICAL HYPOTHESIS) | Sushil's mental model for TWT is "chanda with rules and a phone reminder"; the phrase used internally is "giving my chanda" not "making a payment" | pending-interviews | pending | pending |
| A-mm-phone-reminder | UX spec lines 887-888 (CRITICAL HYPOTHESIS) | Sushil's mental model assumes the system tells him when to act; he does NOT check the app proactively; without the in-app push (or WhatsApp mirror), contribution drops; phone reminder is load-bearing infrastructure | pending-interviews | pending | pending |
| A-mm-passbook-grammar | UX spec lines 431-432 | Bihar State Cooperative Bank / Gramin Bank passbook visual grammar (date column left, narration middle, amount right, running total at bottom) is what financial trust looks like to a Bihar teacher; Yogdaan Bahi derives from this | pending-interviews | pending | pending |
| A-mm-haazri-grammar | UX spec line 432 | School haazri (attendance register) — ruled rows, name + signature + date — is physical object every government teacher touches daily; "who paid this cycle" surfaces borrow this grammar | pending-interviews | pending | pending |
| A-mm-govt-scheme-cert | UX spec lines 434-435 | Bihar govt scheme portals (RTPS Bihar, Mukhyamantri Kanya Utthan, BPSC) define what "govt-grade" looks like to a Bihar teacher — certificate with watermark, serial number, *सत्यापित* stamp, conservative palette, dense layout | pending-interviews | pending | pending |
| A-mm-panchayat-noticeboard | UX spec line 414 + §6 | Panchayat noticeboard is part of civic-trust visual vocabulary the cadre already trusts the shape of | pending-interviews | pending | pending |
| A-mm-newspaper-obituary | UX spec line 414 | Hindi-belt newspaper obituary is a known cultural form — informs memorial / In Memoriam surfaces | pending-interviews | pending | pending |
| A-mm-no-fintech-aesthetics | UX spec line 426 + line 530 | Sushil-class actively rejects accent-color spectacle and consumer-fintech aesthetics; cluttered home like PayTM violates bus-commute attention budget | pending-interviews | pending | pending |
| A-mm-Hindi-first-default | PRD §2.1 line 47 + UX spec line 133 | Hindi is default for Bihar v1; Devanagari renders with equal affordance to English; copy density calibrated to Reena, not Sushil | pending-interviews | pending | pending |
| A-mm-veranda-test | UX spec line 129 | "Veranda test": every loop section must end with a "Reena/Sunita, on her veranda, will…" sentence — if you can't write that sentence, the loop is fiction | pending-interviews | pending | pending |
| A-mm-anticipatory-care | UX spec line 125 + Stance #5 | System owes Reena a heads-up before she misses something, not a penalty after; anticipatory care is named stance | pending-interviews | pending | pending |
| A-mm-staff-fallback-everywhere | UX spec line 102 + AR-61 + Story 0.7 | Staff-fallback at every node is a load-bearing property — members expect human-on-call when automation fails | pending-interviews | pending | pending |
| A-mm-no-streak-no-gamification | UX-DR78 epics line 478 | No streak counts, no daily-check-in optimization — these are explicit anti-metrics | pending-interviews | pending | pending |
| A-mm-vocab-discipline | UX-DR71 epics line 471 | Member address is *सम्मानित साथी* / "colleague", never "user" / "customer" / "donor"; "Deceased Member" is canonical, "Late Teacher" forbidden | pending-interviews | pending | pending |
| A-mm-numeral-discipline | UX-DR73 epics line 473 | Operational components use Latin numerals; only memorial Devanagari prose permits Hindi numerals in narrative copy — assumption: this matches cadre's lived numeral-reading habit | pending-interviews | pending | pending |

---

## Cross-cutting accessibility + Devanagari assumptions (informing architecture §4.10 field-validation gate)

| `assumption_id` | `source` | `assumption_text` | `validation_status` | `synthesis_citation` | `divergence_log_row` |
|---|---|---|---|---|---|
| A-acc-devanagari-readability | architecture lines 2759-2767 + UX spec §6 | Devanagari has script-specific cognitive-load characteristics (matras, conjuncts, optical sizing) that contrast ratios don't capture; field validation required | pending-interviews (Story 0.10 owns substantive validation; Story 0.8 contributes broader Hindi-readability + copy-density observation) | pending | pending |
| A-acc-copy-density | UX spec line 506 + line 131 | Information hierarchy should prioritize clarity over spaciousness while respecting low-end devices + Hindi readability; copy density carries seriousness but too much density becomes bureaucratic | pending-interviews | pending | pending |

---

## Assumption inventory summary at author-commit

- **Total assumptions enumerated:** 36 across 7 categorizations (Dimensions 1-6 + cross-cutting accessibility)
- **Critical hypotheses (load-bearing for Epic 3/8 design freezes):** A-mm-chanda + A-mm-phone-reminder + A-upi-intent-pre-fill-works + A-upi-muscle-memory + A-fin-110-elastic + A-fin-310-scrutinized + A-trust-colleague-primary + A-trust-helpline-credible + A-dev-shared-phone (OQ-UX-15 anchor)
- **Owning Story for substantive validation:** Story 0.8 owns Dimensions 1-6; cross-cutting accessibility (A-acc-devanagari-readability) is primarily Story 0.10's territory but Story 0.8 contributes broader Hindi-readability + copy-density observation as field-validation-gate input
- **Validation status at author-commit:** all rows `pending-interviews`
- **Task 9 obligation:** Solo Builder updates `validation_status` per row from lived data + populates `synthesis_citation` + populates `divergence_log_row` for any `refuted` or `nuanced` row.

---

## Forbidden lifecycle exits

Per README §4 invariant 6 (divergence visibility is forbidden to suppress):
- Synthesis row that contradicts an assumption-inventory row but is silently absorbed into synthesis without divergence-log entry is FORBIDDEN.
- `validation_status` flipping from `pending-interviews` to `n/a` (without going through `validated` | `refuted` | `nuanced`) is FORBIDDEN.
- Assumption-inventory row deletion is FORBIDDEN (forbidden-removal rule inherited from Stories 0.4 + 0.5 + 0.6 + 0.7); supersession-schema is the only allowed lifecycle exit.

---

## Supersession schema

If an assumption is later determined to be mis-stated (e.g., the PRD/UX cite is interpreted wrong at framework-author-time), the row is NOT edited in place. Instead:
1. The original row carries `validation_status = superseded-by-A-<new-id>` + `supersession_date`.
2. A new row is appended with the corrected `assumption_text` + fresh `validation_status`.
3. `.decision-log.md` `[CONTINUITY]` entry records the supersession with rationale.
