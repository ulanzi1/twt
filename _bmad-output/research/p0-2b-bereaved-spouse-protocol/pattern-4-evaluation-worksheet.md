# Pattern 4 Dignified-Validation Evaluation Worksheet — P0-2b Bereaved-Spouse Conversation

**Authority:** Story 0.9 AC-1 load-bearing surface ("Sally's UX Pattern 4 dignified-validation grammar is explicitly evaluated against findings; any required revisions are recorded before Epic 6 (claim filing) design freezes" — epics line 853) · UX spec §12 Pattern 4 Dignified Validation pattern (UX spec lines 2334-2360) · UX-DR55 Pattern 4 sample-copy commitment ("Sample error copy table (Hindi + English) validates with P0-2 field work" — UX spec line 449) · question-bank.md §6 + §7 opt-in prompts · ethics-protocol.md §3.7 opt-in Pattern 4 mid-interview presentation · interview-protocol.md §4 mid-interview Pattern 4 opt-in offer

**Scope:** This worksheet is the **AC's load-bearing Pattern 4 capture instrument** — distinct from Story 0.8's mental-model-validation surface. The worksheet captures the per-sample-copy verdict for each of 8 sample-copy rows from UX spec §12 Pattern 4 table at lines 2349-2360 + the per-element verdict for 7 cross-cutting grief-grammar elements. Verdicts requiring revision feed into divergence-log + Task 11 reconciliation into UX spec §12 Pattern 4 sample copy table.

**Author-commit status (2026-05-31):** All 8 sample-copy rows + 7 cross-cutting grief-grammar rows pre-staged with `spouse_verdict = pending-interview-conduct`. Task 9 (post-conversation) populates per-row verdicts.

---

## §1 Authority cite

UX spec §12 Pattern 4 Dignified Validation (UX spec lines 2334-2360):
- Pattern 4 grammar (lines 2338-2342): three required elements in every member-facing validation message — (1) what's wrong, (2) what to do next, (3) helpline fallback.
- Member-facing surface guideline (line 2342): avoid abrupt blame-first phrasing ("Error:", "Invalid", "Failed", "Forbidden") + alarming red iconography.
- Operator surface allowance (line 2343): operator surfaces may use precise technical wording.
- Sample copy table (lines 2349-2360): 8 rows with member-facing (dignified) + operator-facing (precise) Hindi+English copy.

UX-DR55 (UX spec line 449): "Sample error copy table (Hindi + English) validates with P0-2 field work."

The AC commits this Story (0.9) as the validation surface for the sample copy table.

---

## §2 Per-sample evaluation rows (8 rows from UX spec lines 2353-2360)

For each row, populate at Task 9:
- `spouse_verdict` ∈ {`lands-as-intended`, `requires-revision-with-proposed-copy`, `requires-deeper-redesign`, `not-evaluated-due-to-spouse-non-engagement`}
- `spouse_observation_paraphrased` (per re-consent-for-quotation discipline; verbatim only if re-confirmed per ethics-protocol §2-bis with `[quote-re-confirmed YYYY-MM-DD]` marker)
- `proposed_revision` (if verdict ∈ {`requires-revision-with-proposed-copy`, `requires-deeper-redesign`}; proposed Hindi+English copy per Pattern 4 bilingual-parity discipline)
- `divergence_log_row_id` (cross-link to divergence-log row if the verdict triggers a divergence; populated at Task 9 + Task 11)

### §2.1 Sample 1: HRMS not found

**Member-facing copy (verbatim from UX spec line 2353):**
- EN: "We couldn't find this HRMS in our records. Please check the number, or call helpline 1800-XXX-XXXX for help."
- HI: "हमें यह HRMS नहीं मिला। नंबर जांचें, या मदद के लिए हेल्पलाइन पर कॉल करें: 1800-XXX-XXXX"

**Operator-facing copy (verbatim from UX spec line 2353):**
- "HRMS [value] not found in member directory. Verify via state HRMS portal or escalate to data-team."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "couldn't find this HRMS in our records"
- (2) What to do next: ✅ "check the number"
- (3) Helpline fallback: ✅ "call helpline 1800-XXX-XXXX for help"

| Field | Value |
|---|---|
| `sample_id` | `pattern4-hrms-not-found` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.2 Sample 2: Document upload network failure

**Member-facing copy (verbatim from UX spec line 2354):**
- EN: "Photo upload did not complete. Tap to try again, or save and continue later."
- HI: "फोटो अपलोड पूरा नहीं हुआ। पुनः प्रयास करें, या सहेजकर बाद में जारी रखें।"

**Operator-facing copy:**
- "Upload failed: network timeout at chunk N of M. Retry or escalate."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "upload did not complete"
- (2) What to do next: ✅ "tap to try again, or save and continue later"
- (3) Helpline fallback: ⚠️ NOT inline — implied by Pattern 5 save-and-resume + system-wide helpline access

| Field | Value |
|---|---|
| `sample_id` | `pattern4-doc-upload-failure` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.3 Sample 3: Date outside lock-in period

**Member-facing copy (verbatim from UX spec line 2355):**
- EN: "This date is outside the lock-in period. Helpline can review if there's a special case."
- HI: "यह तिथि लॉक-इन अवधि के बाहर है। विशेष मामले के लिए हेल्पलाइन से बात करें।"

**Operator-facing copy:**
- "Date [value] outside lock-in window [member.lockin_start, member.lockin_end]. Trustee-only override available."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "outside the lock-in period"
- (2) What to do next: ⚠️ Implicit (review through helpline)
- (3) Helpline fallback: ✅ "Helpline can review if there's a special case"

| Field | Value |
|---|---|
| `sample_id` | `pattern4-date-outside-lockin` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.4 Sample 4: UPI Intent cancelled by user

**Member-facing copy (verbatim from UX spec line 2356):**
- EN: "The contribution did not complete. Try again now, or come back later — your pool stays open until cycle close."
- HI: "योगदान पूरा नहीं हुआ। अभी पुनः प्रयास करें, या बाद में आएं — चक्र समाप्ति तक आपका पूल खुला रहेगा।"

**Operator-facing copy:** (none — UPI cancellation is member-side only)

**Pattern 4 element check:**
- (1) What's wrong: ✅ "contribution did not complete"
- (2) What to do next: ✅ "try again now, or come back later"
- (3) Helpline fallback: ⚠️ NOT inline; relies on system-wide helpline access

| Field | Value |
|---|---|
| `sample_id` | `pattern4-upi-cancelled` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.5 Sample 5: Bank statement format unrecognized (Sunita)

**Member-facing copy (verbatim from UX spec line 2357):**
- EN: "We're working on this bank format. Staff can process it manually. We'll notify you when matching is complete."
- HI: "हम इस बैंक प्रारूप पर काम कर रहे हैं। स्टाफ इसे मैन्युअली प्रोसेस कर सकता है। मिलान पूरा होने पर हम सूचित करेंगे।"

**Operator-facing copy:**
- "Statement format [hash] not in recognized-banks registry. Routed to manual-processing queue with priority [auto-computed]."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "working on this bank format" (re-framed as "we're working on", not "format failed")
- (2) What to do next: ✅ Staff handles it; member waits for notification
- (3) Helpline fallback: ⚠️ Implicit (system handles + notifies)

**Note:** This is THE Sunita-facing sample. Particularly important to evaluate for "Hum aapke padh lenge" (we'll read for you) fallback per UX-DR36 + Story 9.3.

| Field | Value |
|---|---|
| `sample_id` | `pattern4-bank-statement-format-unrecognized` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.6 Sample 6: OTP not received

**Member-facing copy (verbatim from UX spec line 2358):**
- EN: "OTP did not arrive. Try resending shortly, or call helpline for assistance — we can verify identity by other means."
- HI: "OTP नहीं आया। कुछ समय बाद पुनः भेजें, या सहायता के लिए हेल्पलाइन पर कॉल करें — हम अन्य तरीकों से पहचान सत्यापित कर सकते हैं।"

**Operator-facing copy:**
- "OTP delivery failed: provider [name] returned [code]. Failover to provider [name2] in progress."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "OTP did not arrive"
- (2) What to do next: ✅ "try resending shortly"
- (3) Helpline fallback: ✅ "call helpline for assistance — we can verify identity by other means"

| Field | Value |
|---|---|
| `sample_id` | `pattern4-otp-not-received` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.7 Sample 7: Member already enrolled (Invite flow)

**Member-facing copy (verbatim from UX spec line 2359):**
- EN: "Great news — this member is already with TWT! Your invite quota stays available for other colleagues."
- HI: "अच्छी खबर — यह सदस्य पहले से TWT के साथ हैं! आपका आमंत्रण कोटा अन्य सहयोगियों के लिए उपलब्ध है।"

**Operator-facing copy:**
- "Duplicate enrollment attempt: member [id] already active. Quota refund [issued]."

**Pattern 4 element check:**
- (1) What's wrong: ✅ Re-framed as good news ("already with TWT")
- (2) What to do next: ✅ "invite quota stays available" — no action required
- (3) Helpline fallback: ⚠️ NOT applicable (positive outcome)

**Note:** Invite flow is NOT directly relevant to bereaved-spouse experience but evaluated for overall dignified-validation grammar.

| Field | Value |
|---|---|
| `sample_id` | `pattern4-member-already-enrolled` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §2.8 Sample 8: Eligibility check failed (HRMS verified but lock-in not yet complete)

**Member-facing copy (verbatim from UX spec line 2360):**
- EN: "Your membership is still in the lock-in period until [date]. Once lock-in completes, your pool participation begins automatically."
- HI: "आपकी सदस्यता [तारीख] तक लॉक-इन अवधि में है। लॉक-इन पूरा होने पर, आपकी पूल भागीदारी स्वतः शुरू हो जाएगी।"

**Operator-facing copy:**
- "Member [id] ineligible: lock-in window not complete. Lock-in remaining: [N days]."

**Pattern 4 element check:**
- (1) What's wrong: ✅ "still in the lock-in period"
- (2) What to do next: ✅ "lock-in completes, pool participation begins automatically" — system handles
- (3) Helpline fallback: ⚠️ NOT inline; relies on system-wide helpline access

| Field | Value |
|---|---|
| `sample_id` | `pattern4-eligibility-check-failed` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

---

## §3 Cross-cutting grief-grammar evaluation rows (7 rows)

These are the grief-grammar elements that span beyond individual sample-copy rows. Evaluation per question-bank.md §7 opt-in prompts. Same verdict structure as §2.

### §3.1 "Fursat" cadence

**Design commitment:** UX spec line 67 + 295 + 315 — grief-respectful pacing register; system register is "aaram se, jab fursat ho" not "complete your task".

**Affected surfaces:** Story 9.1 NomineeConsole (Sunita's surface); Stories 6.X claim filing flows (Ravi-mode); Stories 11b.X memorial surfaces; all member-facing notification cadence per Stories 8.X.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-fursat-cadence` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.2 Witness-not-bailiff register

**Design commitment:** UX spec line 67 + 295 + 315 — system witnesses user's experience rather than enforcing administrative compliance.

**Affected surfaces:** all grief-context surfaces — Ravi-mode + Sunita-mode + memorial.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-witness-not-bailiff` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.3 Black-bordered visual treatment

**Design commitment:** UX spec line 295 + 315 + 390 + UX-DR17 `<PortraitFrame>` + UX-DR17 `<FuneralFrame>` (UX spec line 704) — Hindi-belt obituary convention; deceased member's photo rendered in black-bordered white-inset funeral frame.

**Affected surfaces:** Story 11b.5 Memorial Visual Components (PortraitFrame + KinshipLattice); Ravi-mode home surface; In Memoriam thumbnails; any future deceased-member visual surface.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-black-bordered-portrait` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.4 No-countdowns-under-grief

**Design commitment:** UX spec line 295 + 390 — no countdowns shown on bereaved-family surfaces; the "X days left" affordance applies to normal members but is suppressed under grief-context.

**Affected surfaces:** Sunita-mode console (Epic 9 Story 9.1); Ravi-mode home (Epic 6 Story 6.2); any account-frozen-state surface per UX spec line 295 Stance #4.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-no-countdowns` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.5 No-penalties-under-grief

**Design commitment:** UX spec line 295 + 390 — no penalties under emotional load; missed deadlines under grief context do not trigger penalty cascade.

**Affected surfaces:** all grief-context surfaces; particularly Story 3.8 Annual Renewal under bereavement (grace + waiver); Story 9.1 NomineeConsole staff-takeover-by-day-N (no penalty for nominee disengagement); Story 8.10 Out-of-band contribution policy.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-no-penalties` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.6 Named human shepherd dignity

**Design commitment:** UX spec line 390 + PRD §UJ-3 line 93 — Anita-class District Admin assigned per claim, named (not anonymous) on the claim status page; the dignity grammar commitment.

**Affected surfaces:** Story 6.12 Human Shepherd Assignment; Story 6.X claim status surfaces showing named shepherd; Story 9.1 NomineeConsole staff-takeover with named human shepherd identity.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-named-human-shepherd` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

### §3.7 Opt-in for memorial consent

**Design commitment:** UX spec §0 Stance #1 + Epic 11b Story 11b.6 — opt-in (not opt-out) default for memorial publication; explicit DPDPA consent at claim-time per Story 6.9; bereaved family can choose private processing of claim without compromising disbursement.

**Affected surfaces:** Story 6.9 Claim-time DPDPA consent; Story 11b.3 Sahyog Vivran per-claim story; Story 11b.4 Memorial Authorship; Story 11b.6 In Memoriam consent-governed revocable.

| Field | Value |
|---|---|
| `element_id` | `grief-grammar-opt-in-memorial-consent` |
| `spouse_verdict` | `pending-interview-conduct` |
| `spouse_observation_paraphrased` | _AWAITING_CONVERSATION_CONDUCT_ |
| `proposed_revision` | _AWAITING_CONVERSATION_CONDUCT_ |
| `divergence_log_row_id` | _AWAITING_CONVERSATION_CONDUCT_ |

---

## §4 Synthesis cross-link

The Pattern 4 evaluation worksheet rows feed into synthesis sections:
- **Synthesis §3.4** (Dimension 4: What felt dignified vs. transactional) — per-dimension implications drawn from Pattern 4 verdicts.
- **Synthesis §4** (Pattern 4 dignified-validation grammar evaluation — load-bearing AC surface) — direct verdicts + revisions.
- **Synthesis §9** (Cross-cutting findings) — grief-grammar verdicts inform cross-cutting design implications.

Every Pattern 4 verdict requiring revision (`requires-revision-with-proposed-copy` OR `requires-deeper-redesign`) ALSO produces a divergence-log row with severity `pattern4-copy-revision-required`.

---

## §5 Revision-integration handoff

Any verdict ∈ {`requires-revision-with-proposed-copy`, `requires-deeper-redesign`} triggers Task 11 reconciliation:

1. **Solo Builder routes the proposed_revision through the UX-edit workflow** — UX spec §12 Pattern 4 sample copy table (lines 2349-2360) update with the revised Hindi+English copy; citation: this Story 0.9 + the divergence-log row.
2. **Reconciliation is recorded as `reconciled-via-spec-update`** in the divergence-log; cross-link to the UX spec patch commit.
3. **Affected Stories notified** — Epic 6 Story 6.X claim filing copy (if HRMS / document upload / date / OTP / eligibility samples revised); Epic 9 Story 9.X reconciliation copy (if bank statement format sample revised); any Story citing UX-DR55 Pattern 4 (e.g., epics lines 1697, 1785, 1802, 2299, 3088, 3836).
4. **Cross-cutting grief-grammar verdicts** route similarly — UX spec amendments (e.g., §0 Stance #4 grief-is-held; §1.5 grief-frame table; §12 Pattern 4 + Pattern 5 + Pattern 11; UX-DR55 + UX-DR50 + UX-DR35 + UX-DR38 + UX-DR17/18 anchors) integrated via the UX-edit workflow before affected Epic design freezes.
5. **If a verdict is `requires-deeper-redesign`** (more than a copy revision — a fundamental pattern revision), the reconciliation may route through architecture amendment (e.g., §1.5 grief-aware-design property refinement) AND UX spec amendment + affected Story design re-scope; this is recorded as a deeper-reconciliation cycle in `.decision-log.md` per the Story 0.4-0.8 spec-change precedent.

---

## §6 Sample-copy non-engagement protocol

If spouse declines Pattern 4 sample-copy review mid-interview (per ethics-protocol §3.7 + interview-protocol §4.2):

- All 8 sample-copy rows are marked `not-evaluated-due-to-spouse-non-engagement`.
- Researcher does NOT ask for explanation.
- The synthesis §4 records this honestly: "Pattern 4 sample-copy evaluation not conducted at spouse's preference (per ethics-protocol §3.7 opt-in)."
- This is an **honest research outcome, not a framework failure**. The framework permits + honors spouse non-engagement.
- Pattern 4 sample-copy validation against actual grief remains UN-VALIDATED in this case; the divergence-log records this gap as `pattern-4-validation-deferred-due-to-spouse-non-engagement` with affected_epic_stories noting that downstream Epic 6 / Epic 9 / Epic 11b design freezes should proceed with the assumption that Pattern 4 grammar is UN-VALIDATED and may require subsequent validation surface (e.g., a second bereaved-spouse conversation under a future trustee-approved framework refresh).

If spouse opts in partially (e.g., 5 of 8 samples evaluated, 3 declined), the 3 declined are marked `not-evaluated-due-to-spouse-non-engagement`; the 5 evaluated populate verdicts normally; the divergence-log gap-row enumerates which samples remain UN-VALIDATED.

---

## §7 Cross-cutting grief-grammar non-engagement protocol

Same logic as §6. If spouse declines the §7 cross-cutting grief-grammar prompts entirely, all 7 elements are marked `not-evaluated-due-to-spouse-non-engagement` + divergence-log gap-row enumerates the UN-VALIDATED grief-grammar elements + downstream Epic design freezes proceed under that explicit gap-acknowledgment.

---

## §8 Author-commit attestation

This worksheet is author-committed 2026-05-31 per Story 0.9 Task 4. All 8 sample-copy rows + 7 cross-cutting grief-grammar rows are pre-staged with `pending-interview-conduct` status. The verbatim member-facing copy is pulled from UX spec lines 2353-2360 (sample-copy rows) and from UX spec lines 67 + 129 + 295 + 315 + 390 + UX-DR17 + UX-DR55 (grief-grammar elements).

Task 9 (post-conversation) is responsible for populating per-row verdicts per the §6 + §7 non-engagement protocol if spouse declines.
