# P0-2b Bereaved-Spouse Conversation — Research Protocol Framework

**Authority cites:** UX-DR5 (epics line 375 "P0-2 empathy field-work gate") · UX §Phase-0 P0-2 (UX spec lines 101-105 "5 Shikshakamitra (Reena-class) conversations + 1 bereaved-spouse conversation in Vaishali district") · AR-49 Launch Gate Risks row "P0-2 Member-Class Validation (field work) | UX Researcher | Trustee Panel (logistics)" (architecture line 4782) · architecture §External Validation Pending UX Researcher (architecture lines 4855-4859 "Engineering analytics alone cannot surface bereavement-flow friction, trust-eroding error copy, or cycle-event confusion") · **UX-DR55 Pattern 4 dignified-validation sample-copy table** (UX spec lines 2334-2360 — sample error copy "validated with P0-2 field work" — the surface this protocol evaluates against actual grief) · UX-DR31-33 (Ravi-mode: `<ClaimProxyFlowShell>` + `<HandoverTrustOTP>` + `<ClaimDocumentUpload>`) · UX-DR35 (`<NomineeConsole>` — "fursat" cadence + staff-takeover by day N) · UX-DR38 (`<MemorialAuthorshipSurface>`) · UX-DR50 (`<SaveAndResumeAffordance>` on grief-paced flows) · UX spec §0 Stance #4 (UX spec line 295 "Grief is held, not processed") + Stance #7 (UX spec line 129 "Grief-aware design for Ravi and Sunita") · UX spec §Held-ness Under Grief (UX spec line 315) · architecture §1.5 PII shielding by analogy · Story 0.8 sister-leg framework `_bmad-output/research/p0-2a-teacher-interviews-protocol/` · Story 0.9 file `_bmad-output/implementation-artifacts/0-9-p0-2b-bereaved-spouse-conversation-completed.md`

**Status:** Author-committed 2026-05-30 (framework + protocol + ethics + consent + question-bank + Pattern 4 evaluation worksheet + assumption-inventory + schemas + synthesis scaffold). **Trustee Panel pre-conversation approval** + substantive empathy work + Pattern 4 evaluation population + synthesis + trustee review + divergence reconciliation are tracked Tasks 7-11 _AWAITING EXTERNAL ACTION_ in Story 0.9 file.

---

## §1 Why a bereaved-spouse research-protocol surface

The P0-2b empathy work is *more delicate than P0-2a* (Story 0.8 Shikshakamitra interviews) because the participant is a **bereaved spouse** — someone who has been through a death-benefit claim process (TSCT or comparable small-trust precedent) and whose lived experience of grief, document-gathering, trust-staff interaction, and family/community involvement is the irreducible signal TWT's grief-aware design surfaces depend on.

The framework discharges the UX-DR5 + UX §Phase-0 P0-2 + AR-49 P0-2 Launch Gate Risks commitments AND the **UX-DR55 Pattern 4 dignified-validation grammar evaluation** commitment as a single trustee-accessible surface. Pattern 4 evaluation is the AC's load-bearing surface (distinct from Story 0.8's mental-model-validation surface) — the per-sample-copy verdict for each of the 8 sample-copy rows in UX spec §12 Pattern 4 table at lines 2349-2360 + the cross-cutting grief-grammar verdict for 7 grief-grammar elements + revisions integrated into UX spec §12 via Task 11 divergence reconciliation.

The protocol-level commitment covers: **ethics with bereavement-context escalations** (informed consent + identity protection + withdrawal-right + re-consent-for-quotation + trustee-approval-pre-recruitment); **recruitment exclusively via trustee-mediated paths** (cold recruitment forbidden); **conduct** (≥60-minute Hindi conversation at the spouse's chosen setting with witnessing register + no-grief-topic-initiation + opt-in Pattern 4 mid-interview); **synthesis** (per-dimension lived-data grounding with per-interview citations + Pattern 4 evaluation section); **trustee review** (≥1-trustee sign-off gating Epic 6 + Epic 9 + Epic 11b substrate work); and **divergence reconciliation + Pattern 4 revision integration** (gap-detection from PRD/UX assumptions + routing into PRD/UX/architecture amendments before Epic 6 + Epic 9 + Epic 11b design freezes).

A single synthesis file cannot carry that protocol-level commitment as a *commitment record*. The unified protocol directory `_bmad-output/research/p0-2b-bereaved-spouse-protocol/` discharges the launch-gate commitments; the synthesis file at `_bmad-output/research/p0-2b-bereaved-spouse.md` (per the Story 0.9 AC verbatim path from epics line 852) is the research *output* the protocol produces.

This framework-as-research-surface pattern extends the framework-as-top-level-surface pattern from `docs/runbooks/` (Story 0.1) + `docs/escrow/` (Stories 0.2 + 0.3) + `docs/degradation-policy/` (Story 0.4) + `docs/knowledge-transfer/` (Story 0.5) + `docs/backup-engineer/` (Story 0.6) + `docs/fallback-handler-ledger/` (Story 0.7) + `_bmad-output/research/p0-2a-teacher-interviews-protocol/` (Story 0.8) to a second research surface under `_bmad-output/research/`. The directory naming (`-protocol` suffix on the framework dir) is structurally required because the AC names a synthesis file path (not a directory) — file-vs-directory collision rule means the protocol must live as a sibling, not inside the AC-named path.

---

## §2 Framework lifecycle

1. **Author-commit (2026-05-30, Story 0.9 Tasks 1-6)** — protocol + ethics-protocol (with §2-bis re-consent-for-quotation + §2-tris trustee-approval-pre-recruitment + §3.0 bereavement-context recruitment discipline + §3.7 opt-in Pattern 4) + interview-protocol (with §0 pre-recruitment trustee-approval checklist) + consent templates Hindi+English (with re-consent-for-quotation checkbox) + question-bank (5 AC dims + §6 Pattern 4 opt-in + §7 grief-grammar opt-in) + **pattern-4-evaluation-worksheet** (load-bearing AC surface — 8 sample-copy rows + 7 cross-cutting grief-grammar rows pre-staged) + assumption-inventory + per-interview-note-schema + synthesis-schema + divergence-log scaffold + trustee-review-log scaffold (with pre-conversation approval row slot pre-staged) + recruitment-log scaffold (1 `pending-recruitment` row) + `interview-notes/` subdirectory placeholder + synthesis file scaffolded at AC-named path with `_AWAITING_CONVERSATION_CONDUCT_` placeholders + `.decision-log.md` Decision 2026-05-30-009 entry.
2. **Trustee Panel pre-conversation approval (Story 0.9 Task 7 first half, _AWAITING EXTERNAL ACTION_)** — **P0-2b-distinct precondition not present in Story 0.8.** Solo Builder presents the framework + ethics-protocol + interview-protocol + pattern-4-evaluation-worksheet + recruitment-path candidates to Trustee Panel; Trustee Panel votes approval; approval recorded as the first row in trustee-review-log with verdict `approved-for-recruitment` + named approving trustees + date. Recruitment does NOT begin until this row exists.
3. **Recruitment (Story 0.9 Task 7 second half, _AWAITING EXTERNAL ACTION_)** — Solo Builder identifies 1 bereaved spouse via the trustee-mediated recruitment paths enumerated in §3; informed consent obtained per ethics-protocol §2 + §2-bis re-consent-for-quotation checkbox + §2-tris trustee-approval transparency before the conversation is scheduled; recruitment-log row populated; substantive identity stored out-of-band per ethics-protocol §4.
4. **Conversation conduct (Story 0.9 Task 8, _AWAITING EXTERNAL ACTION_)** — Solo Builder conducts the ≥60-minute Hindi conversation at the spouse's chosen setting per interview-protocol; per-interview note authored within 24 hours per per-interview-note-schema; **re-consent-for-quotation discipline enforced** — no verbatim quotes captured without per-quote re-confirmation; Pattern 4 sample-copy mid-interview opt-in per ethics-protocol §3.7 (declined samples marked `not-evaluated-due-to-spouse-non-engagement`).
5. **Synthesis authoring (Story 0.9 Task 9, _AWAITING EXTERNAL ACTION_)** — Solo Builder edits `_bmad-output/research/p0-2b-bereaved-spouse.md` replacing `_AWAITING_CONVERSATION_CONDUCT_` placeholders with substantive findings grounded in per-interview citations; **Pattern 4 evaluation §4 populated per-sample verdict + cross-cutting grief-grammar verdict + proposed revisions** (the AC's load-bearing surface); assumption-inventory validation_status updated per assumption; divergence-log rows appended per refuted-or-nuanced assumptions + Pattern 4 verdicts requiring revision.
6. **Trustee review (Story 0.9 Task 10, _AWAITING EXTERNAL ACTION_)** — ≥1 trustee reviews synthesis per ethics-protocol §8 + synthesis-schema authority (dimension coverage + Pattern 4 evaluation completeness + divergence-log completeness + synthesis grounding in per-interview citation + re-consent-for-quotation compliance); verdict appended to trustee-review-log; `.decision-log.md` Decision 2026-05-30-009-trustee-review-N entry appended.
7. **Divergence reconciliation + Pattern 4 revision integration (Story 0.9 Task 11, _AWAITING EXTERNAL ACTION_)** — Each Epic-6-affecting + Epic-9-affecting + Epic-11b-affecting + cross-cutting divergence row reconciled per `reconciliation_action_plan` before the affected Epic's design freeze; each Pattern 4 sample-copy verdict ∈ {`requires-revision-with-proposed-copy`, `requires-deeper-redesign`} integrated into UX spec §12 Pattern 4 sample copy table at lines 2349-2360 (the AC's load-bearing reconciliation path); reconciliation outcomes recorded in divergence-log + `.decision-log.md` `[CONTINUITY]` or `[OPS]` entry.
8. **Ongoing maintenance** — per-architectural-amendment refresh if PRD/UX assumptions shift materially after synthesis date; per-Story-touch refresh if Epic 6 / Epic 9 / Epic 11b stories cite the synthesis and the citation does not match current synthesis state; per-quarter trustee re-review if divergence-log accumulates unresolved entries.

---

## §3 Four-way property/protocol/policy/gap-analysis discipline

Extending the Story 0.4 + 0.5 + 0.6 + 0.7 + 0.8 pattern, the framework separates four concerns:

- **Property** — what the framework commits as *true* about the empathy work: 1 conversation; ≥60 minutes; Hindi conduct; spouse-chosen setting; **trustee approval before recruitment** (P0-2b-distinct); informed consent before recording-or-notes; **re-consent-for-quotation discipline** (P0-2b-distinct — no verbatim without per-quote re-confirmation); pseudonymization across all artifacts; per-dimension synthesis grounded in lived data covering five AC-named dimensions (emotional pace tolerance + document-gathering experience + interaction with trust staff + what felt dignified vs transactional + role of family/community); **Pattern 4 dignified-validation grammar evaluation** (load-bearing AC surface); ≥1-trustee review before Epic 6 + Epic 9 + Epic 11b substrate work; divergence reconciliation + Pattern 4 revision integration before Epic 6 + Epic 9 + Epic 11b design freezes.
- **Protocol** — the *specific instruments* that realize the property: ethics-protocol.md (consent + identity + withdrawal + data handling + re-consent-for-quotation + trustee-approval-pre-recruitment + bereavement-context recruitment); interview-protocol.md (conduct runbook with §0 pre-recruitment approval check + §4 mid-interview Pattern 4 opt-in offer); informed-consent-template-{hindi,english}.md (participant-facing instruments with re-consent-for-quotation checkbox); question-bank.md (researcher prompt list across 5 AC dimensions + §6 Pattern 4 opt-in + §7 grief-grammar opt-in); **pattern-4-evaluation-worksheet.md** (the AC's load-bearing Pattern 4 capture instrument); per-interview-note-schema.md + synthesis-schema.md + divergence-log.md + trustee-review-log.md + recruitment-log.md (data-capture instruments).
- **Policy** — *operations-policy territory* committed at framework level but with specific values deferred per [[feedback_architecture_vs_adr_boundary]]: recruitment-path selection rules (§3 below, trustee-mediated only); power-differential mitigation grammar with bereavement-context register (witnessing-not-bailiff vs comforting vs authority); pseudonymization mechanism (canonical slug `Bereaved-Spouse-1`); compensation structure (**bereavement-context default is no-compensation**, modest travel-reimbursement-only if applicable); data retention windows (**30-day raw recording retention vs Story 0.8's 90-day** — bereavement-context shortened default); recording-vs-notes default (researcher prefers notes-only); Pattern 4 sample-copy mid-interview presentation format (printed cards vs spoken vs phone-screen-shown — ADR-deferred per §8); cross-participant comparison-without-naming discipline.
- **Gap analysis** — per [[feedback_gap_analysis_observational]]: the divergence-log is the *observational* gap-detection instrument. It captures incompleteness or risk in PRD/UX assumptions + Pattern 4 sample-copy verdicts and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture — Task 11 reconciliation is the discharge mechanism. The assumption-inventory + pattern-4-evaluation-worksheet are the *pre-stated* assumption + sample-copy lists without which divergence is structurally invisible.

### Recruitment paths (operations-policy committed at framework level — bereavement-context restricted)

The 1 bereaved spouse is recruited exclusively via **trustee-mediated paths**, in priority order:
1. **TSCT trustee referral** — TSCT (the prior-art reference trust documented at `_bmad-output/research/tsct-reference-learnings.md`) has supported ~556 deceased-member families per its operational history. TSCT trustees may identify candidates from their direct support relationships with informed consent gating. This path is **explicitly allowed** for Story 0.9 (in contrast to Story 0.8 which discouraged TSCT operational referrals to avoid sampling bias toward existing-welfare-trust-aware respondents — for Story 0.9 the population of interest IS bereaved spouses who have been through a claim process, so TSCT operational history is the natural recruitment surface).
2. **Trustee Panel personal-network referral** — TWT Trustee Panel members may suggest candidates within their personal networks of bereaved spouses (e.g., a teacher colleague's wife, a community member who has been through a comparable claim).
3. **Bihar Widow Welfare Board (BSWLB) referral** — or analogous Bihar government welfare body that maintains contact with widows / bereaved spouses for benefit administration; referral via trustee-mediated request to the welfare body.
4. **Bihar grief-support NGO referral** — if any Bihar-based NGO with appropriate ethical standing maintains a contact registry of bereaved spouses willing to participate in research, referral via trustee-mediated request.

**Forbidden paths** (bereavement-context discipline):
- **Cold recruitment** — cold-call / cold-visit / cold-text any candidate identified without trustee-mediated introduction is FORBIDDEN per ethics-protocol §3.0. The bereaved spouse is in a vulnerable population; cold recruitment is unethical.
- **TWT operational referrals** — TWT has not yet operated, so no TWT operational referral path exists. (When TWT operates post-launch, TWT operational referrals will introduce sampling bias toward TWT-experienced spouses and may not be appropriate for future research either.)
- **Researcher's personal-network referrals** — bias toward respondents who share researcher demographic markers + the personal-network discipline is inappropriate for bereavement-context research.

---

## §4 Structural invariants

The following invariants are non-negotiable; any framework revision that drops or weakens an invariant requires a `.decision-log.md` supersession entry recording rationale per the Story 0.4-0.8 supersession-schema precedent:

1. **Trustee Panel approval BEFORE recruitment.** Solo Builder MUST NOT approach any candidate until the Trustee Panel approval row exists in `trustee-review-log.md` per ethics-protocol §2-tris. This is the P0-2b-distinct precondition not present in Story 0.8 which begins with recruitment.
2. **Informed consent before recording-or-notes.** The interview MUST have informed consent (per ethics-protocol §2 a-h + §2-bis re-consent-for-quotation checkbox) BEFORE any recording or note-taking activates. Verbal reconfirmation of recording consent is required at the start of every recorded session.
3. **No direct verbatim quotation without per-quote re-consent.** Per ethics-protocol §2-bis: no verbatim quotation is included in any artifact (per-interview note, synthesis, divergence-log, framework documentation) unless **specifically re-confirmed at the quote in question**. This is the P0-2b-distinct discipline distinct from Story 0.8's default-quotation-with-consent. Re-confirmed quotes carry a `[quote-re-confirmed YYYY-MM-DD]` marker; any synthesis or framework artifact containing a quote without the marker is a framework defect.
4. **Researcher does NOT initiate grief topics.** Per ethics-protocol §3.6 + interview-protocol §3: the spouse leads all bereavement-specific content depth. This is the P0-2b-distinct discipline distinct from Story 0.8 where dimension-5 grief is researcher-prompted-but-spouse-led; here ALL grief content is spouse-led-only.
5. **Recording-vs-notes is spouse-led.** Spouse chooses; researcher does not pressure. Researcher's default preference is detailed notes (less invasive); audio recording is permitted only with explicit reconfirmation + mid-session pause-right.
6. **Pseudonymization across all artifacts.** Canonical pseudonym `Bereaved-Spouse-1`. Demographic context preserved at district-level granularity (Bihar district level + claim-trust-precedent slug, NOT village-level + NOT block-level + NOT specific trust name if disclosure would identify the spouse). Substantive name + contact mapping is stored out-of-band per ethics-protocol §4 — NDA territory inheriting Story 0.6 + 0.7 + 0.8 need-to-know discipline.
7. **Synthesis grounded in lived conversation data.** The synthesis at `_bmad-output/research/p0-2b-bereaved-spouse.md` MUST be grounded in per-interview citations (`Bereaved-Spouse-1 §dimension-X`). Generic LLM-imagined or PRD-paraphrased synthesis is forbidden. A synthesis row without per-interview citation is a gap and triggers Open Question recording per Story 0.4-0.8 Open-Question precedent.
8. **Pattern 4 evaluation section must populate per-sample verdict.** The Pattern 4 evaluation §4 of synthesis must populate the per-sample-copy verdict for **each of the 8 sample-copy rows** in UX spec §12 Pattern 4 table at lines 2349-2360 + the 7 cross-cutting grief-grammar rows OR explicitly mark `not-evaluated-due-to-spouse-non-engagement` with rationale (Pattern 4 sample-copy review is opt-in mid-interview per ethics-protocol §3.7). Honest non-engagement is permitted and honored; silent omission is forbidden.
9. **Five AC-named synthesis dimensions are minimum-coverage append-only.** The five dimensions (emotional pace tolerance; document-gathering experience; interaction with trust staff; what felt dignified vs transactional; role of family/community in the claim) per epics line 851 are the minimum coverage; the framework adds dimension-6 cultural-grammar cross-cutting at author-commit for spouse-led observations outside the five dimensions. The five named dimensions are non-negotiable. Dimensions are append-only; supersession-schema applies for refinement.
10. **Divergence visibility is forbidden to suppress.** Forbidden status: "synthesis row that contradicts PRD/UX assumption but the divergence is silently absorbed into the synthesis without divergence-log entry." Every refuted-or-nuanced assumption per assumption-inventory + every Pattern 4 verdict requiring revision MUST produce a divergence-log row.
11. **Trustee review precedes Epic 6 + Epic 9 + Epic 11b substrate work.** The synthesis cannot be marked `trustee-reviewed` until ≥1 trustee signs off per trustee-review-log schema. Epic 6 (Stories 6.1-6.16), Epic 9 (Stories 9.1-9.12), Epic 11b (Stories 11b.1-11b.8) substrate work cannot begin until the trustee-review-log records `accepted` verdict + `sign-off_note` attesting Epic 6 / Epic 9 / Epic 11b substrate work may begin (per affected-Epic-by-divergence cross-reference).
12. **Divergence reconciliation + Pattern 4 revision integration gate design freezes.** Epic 6 + Epic 9 + Epic 11b design-freeze conversations cannot proceed until the divergence-log has terminal `reconciliation_status` ∈ {`reconciled-via-spec-update`, `reconciled-via-design-adjustment`, `explicitly-deferred-with-rationale`} for every divergence row affecting the Epic per [[feedback_closure_language_precision]]. Pattern 4 sample-copy revisions requiring integration into UX spec §12 must be integrated OR explicitly deferred before the affected design freeze.
13. **No participant identity or contact in framework artifacts.** No individual participant's identity, contact, or precise location (village-name, school-name, specific-trust-name if identifying, named family members) is inlined in the synthesis file or any framework artifact. Identity NDA territory stored out-of-band per operations policy.
14. **No compensation as obligation-creating; bereavement-context default is no-compensation.** Ethics-protocol may permit modest travel-reimbursement (not specified amount; ADR-deferred per §8) but the reimbursement is NOT contingent on specific findings, NOT contingent on TWT join-ask, NOT contingent on referral-ask. The bereavement-context default is no-compensation entirely; reimbursement is offered only if the spouse has traveled or taken paid leave to attend. The participant has no obligation to TWT post-interview.
15. **Researcher is Solo Builder, not trained ethnographer or grief counselor.** Researcher limitations are acknowledged in ethics-protocol §7. Researcher does NOT diagnose participants' grief or financial experience; does NOT solicit specific incidents the participant has not voluntarily raised; does NOT offer counseling, referrals, or post-interview follow-up beyond pre-agreed re-consent-for-quotation contact; does NOT recommend TWT or any other product during the interview. **Researcher offers warm acknowledgment of grief without expressing pity or attempting consolation** — the witnessing register, not the comforting register.
16. **Withdrawal at any time is honored; granular quotation-withdrawal-post-synthesis permitted.** Per ethics-protocol §5 — withdrawal before synthesis = per-interview note marked `withdrawn` + content destroyed + raw recording destroyed if applicable; withdrawal after synthesis = per-row removal from synthesis + supersession-schema marker. Granular withdrawal of specific quotation post-synthesis is permitted per §2-bis — spouse may consent to synthesis broadly while withdrawing a specific quote; the quote is removed + paraphrased in supersession. No coercion, no explanation required.

---

## §5 Sign-off lifecycle

- **Framework-ratification gate:** ≥1-trustee synthesis review (Story 0.9 Task 10). Per-dimension ratification OR pack-as-a-unit ratification is the trustee's choice; the trustee-review-log row `review_scope` column records which.
- **Pre-conversation trustee approval is a *separate* gate** (Story 0.9 Task 7, ethics-protocol §2-tris) — this is the P0-2b-distinct gate not present in Story 0.8. The pre-conversation approval can be granted by the same trustee(s) who later perform the synthesis review, but the two reviews are recorded as distinct rows in trustee-review-log.md (different `review_scope` values).
- **Quorum-unavailable fallback path:** If the Trustee Panel cannot convene a full review within the launch window (e.g., trustee incapacitation; co-occurring sprint-change-proposal review consuming all panel bandwidth), emergency review by the Trustee Panel chair alone is valid, time-bounded 30 days, recorded as a `.decision-log.md` `[CONTINUITY]` entry with rationale per [[feedback_closure_language_precision]] — mirrors the Story 0.5 + 0.6 + 0.7 + 0.8 emergency-single-trustee fallback path. The chair review carries the same Epic-substrate-work-may-begin gating authority but the 30-day window forces re-review by a second trustee before lifting. The 30-day clock starts at chair sign-off date per the inherited Story 0.8 review-defer convention (the Story 0.8 review noted the 30-day-clock-trigger as deferred ADR territory; this framework anchors the start at chair sign-off date).
- **Verdict states (pre-conversation):** `approved-for-recruitment` (Solo Builder may begin recruitment); `revision-list-pending-approval` (ethics-protocol / interview-protocol / Pattern 4 worksheet must be revised per revision list before approval).
- **Verdict states (post-synthesis):** `accepted` (Epic 6 / Epic 9 / Epic 11b substrate work may begin per the sign-off note); `accepted-with-revisions` (synthesis must be revised per revision list before affected Epic begins); `rejected-pending-rework` (Tasks 7-9 cycle re-engages with revised protocol per trustee feedback).
- **No tie-breaking required for single-trustee reviews.** If multiple trustees review and disagree, the trustee-review-log records each verdict separately; resolution path: Trustee Panel convenes for deliberative discussion + records consensus or majority outcome as a follow-up trustee-review-log row.

---

## §6 Review cadence fallback

- **One-time pre-conversation trustee approval** at Story 0.9 Task 7 (P0-2b-distinct precondition).
- **One-time synthesis review** at AC-1 closure (Story 0.9 Task 10).
- **Per-architectural-amendment refresh** if PRD/UX assumptions shift materially after the synthesis date — the assumption-inventory rows are re-evaluated against the new PRD/UX surface; divergence-log rows are re-attested or re-opened as needed; Pattern 4 sample-copy verdicts are re-evaluated if UX spec §12 Pattern 4 sample copy table changes substantively.
- **Pre-Epic-6-design-freeze + pre-Epic-9-design-freeze + pre-Epic-11b-design-freeze divergence reconciliation checkpoints** (Story 0.9 Task 11) — every Epic-affecting divergence row + every Pattern 4 verdict requiring revision is gating input for the affected design freeze.
- **Per-Story-touch refresh** if Epic 6 / Epic 9 / Epic 11b stories cite the synthesis and the citation does not match the current synthesis row state — synthesis row supersession is logged in synthesis Pack-revision log; the citing Story is amended if the supersession changes the citation's substance.
- **Per-quarter trustee re-review** if divergence-log accumulates unresolved entries beyond a target threshold (suggested ≥3 unresolved rows after 90 days) — trustee re-engages to either approve closures or escalate to Trustee Panel deliberation.

---

## §7 Synthesis-vs-per-interview-note reconciliation

The synthesis at `_bmad-output/research/p0-2b-bereaved-spouse.md` is authoritative for the cross-section pattern + the dimension-level finding + Pattern 4 evaluation verdicts. The per-interview note under `interview-notes/bereaved-spouse-1.md` is authoritative for the lived-data citation + the (paraphrased; verbatim only via re-consent) observation. Reconciliation rules:

- Every synthesis row carries citation to the per-interview note (`Bereaved-Spouse-1 §dimension-X`); per invariant 7, uncited synthesis rows are gaps.
- Per-interview note is *immutable after author-commit + 24-hour-window close* — corrections within the 24-hour window are permitted; corrections after are supersession entries.
- Per-interview note revisions (rare; only if participant withdraws or factual correction is necessary OR if a quote re-consent status changes via §2-bis re-consent workflow) are logged in the synthesis Pack-revision log per the Story 0.4-0.8 supersession schema with a synthesis re-attestation row.
- If a synthesis row contradicts the per-interview notes it cites, the per-interview notes win; the synthesis is amended per the supersession-schema with a Pack-revision log entry.
- **Pattern 4 evaluation verdict supersession:** if a per-sample verdict is revised at re-consent time (rare; only if the spouse re-engages with the Pattern 4 sample-copy review post-interview via the re-consent-for-quotation channel and provides a revised verdict), the pattern-4-evaluation-worksheet row is superseded; the synthesis §4 row is re-attested; the divergence-log row (if applicable) is re-evaluated.

---

## §8 Open ADR slots

The framework commits properties + protocol shape; specific operational choices are deferred to operations policy / future ADRs per [[feedback_architecture_vs_adr_boundary]]:

1. **Recruitment-incentive structure** — bereavement-context default is no-compensation; ADR pending decision on whether modest travel-reimbursement is offered + the amount + tax-treatment. Open Question recorded.
2. **Recording technology** — phone audio vs dedicated recorder vs notes-only-default; ADR pending choice criteria (audio quality vs spouse comfort vs cost vs bereavement-context invasiveness).
3. **Transcription mechanism** — manual transcription vs Hindi-ASR (Bhashini or commercial Hindi-ASR) + manual review pass; ADR pending evaluation of ASR accuracy on Bihar-dialect Hindi + bereavement-context emotional speech (irregular pacing, soft volume, dialect shifts).
4. **Pseudonymization mechanism** — canonical slug (`Bereaved-Spouse-1`) committed at framework level; whether substantive identity is split across multiple out-of-band stores (e.g., name in store-A, contact in store-B) is ADR territory.
5. **Data-retention policy for raw recordings** — 30-day default committed in ethics-protocol §6 (vs Story 0.8's 90-day — bereavement-context shortened); specific destruction mechanism + audit-trail evidence is ADR territory.
6. **Consent-withdrawal procedure including granular quotation-withdrawal-post-synthesis** — per-row removal + supersession-schema marker committed at framework level; specific notification mechanism to upstream consumers of the synthesis (Epic 6 / 9 / 11b stories cited) is ADR territory. Granular quotation-withdrawal mechanism is committed in §2-bis but the specific contact-channel workflow is ADR territory.
7. **Pattern 4 sample-copy presentation format mid-interview** — printed cards vs spoken aloud vs phone-screen-shown vs paper-handout; ADR pending choice criteria (spouse comfort vs accessibility vs evaluation accuracy). The opt-in mid-interview presentation is committed in ethics-protocol §3.7; the format is operations-policy territory.
8. **Per-dimension synthesis depth vs breadth tradeoff** — synthesis-schema commits ≥3 substantive observations per dimension; whether deeper depth at fewer dimensions is permitted under spouse-non-engagement on certain dimensions is ADR territory.
9. **Cross-participant comparison-without-naming discipline** — only 1 participant in Story 0.9 so cross-participant comparison is N/A within Story 0.9; if Story 0.9 conducts a substitute participant under withdrawal logic, cross-comparison rules inherit from Story 0.8 ADR territory.

---

## §9 Related continuity / research surfaces table

| Surface | Owning Story | Path |
|---|---|---|
| TSCT reference learnings (prior-art + recruitment-path anchor) | pre-existing | `_bmad-output/research/tsct-reference-learnings.md` |
| Teacher empathy interviews (P0-2a sister-leg) | Story 0.8 | `_bmad-output/research/p0-2a-teacher-interviews-protocol/` + `_bmad-output/research/p0-2a-teacher-interviews.md` |
| **This bereaved-spouse conversation protocol** | **Story 0.9** | **`_bmad-output/research/p0-2b-bereaved-spouse-protocol/` + `_bmad-output/research/p0-2b-bereaved-spouse.md`** |
| VI/low-vision accessibility validation | Story 0.10 | `_bmad-output/research/p0-2c-vi-validation.md` (pending creation) |
| Operator shadowing | Story 0.11 | `_bmad-output/research/p0-2d-operator-shadowing.md` (pending creation) |
| Operational runbooks | Story 0.1 | `docs/runbooks/` |
| Credential escrow | Story 0.2 | `docs/escrow/credential-escrow/` |
| Code escrow | Story 0.3 | `docs/escrow/code-escrow/` |
| Per-surface degradation policy | Story 0.4 | `docs/degradation-policy/` |
| Knowledge-transfer pack | Story 0.5 | `docs/knowledge-transfer/` |
| Backup-engineer contract | Story 0.6 | `docs/backup-engineer/` |
| Fallback-handler ledger | Story 0.7 | `docs/fallback-handler-ledger/` |

The pre-existing `_bmad-output/research/tsct-reference-learnings.md` is the *prior-art anchor + recruitment-path anchor* — it documents TSCT's ~556-deceased-family operational history that frames the model TWT inherits structurally AND supplies the trustee-mediated recruitment-path anchor per §3 (TSCT trustee referral is the primary recruitment path because TSCT has the natural population of bereaved spouses). Story 0.9 does NOT modify the TSCT reference file; it is referenced as the prior-art + recruitment-path anchor that frames the assumption-inventory's TSCT-precedent-credible hypothesis.

The Story 0.8 P0-2a sister-leg artifacts are read-only from this Story's perspective. The sister-leg pattern is inherited (framework-as-research-surface; closure-language-precision; assumption-inventory + divergence-log + trustee-review-log + recruitment-log + synthesis-schema schemas; Story 0.8 review-patch learnings — see §11).

---

## §10 P0-2 four-leg joint-discharge anchor

Story 0.9 contributes the **second of four P0-2 legs** of the UX-DR5 + AR-49 P0-2 Launch Gate Risks discharge:

| Leg | Owning Story | Scope | Synthesis output path |
|---|---|---|---|
| P0-2a | Story 0.8 | 5 Shikshakamitra (Reena-class) interviews in Vaishali district | `_bmad-output/research/p0-2a-teacher-interviews.md` |
| P0-2b | **Story 0.9 (this Story)** | 1 bereaved-spouse conversation (TSCT or comparable claim-process precedent) | `_bmad-output/research/p0-2b-bereaved-spouse.md` |
| P0-2c | Story 0.10 | ≥1 Hindi-using VI/low-vision member's interaction with TWT prototype surfaces | `_bmad-output/research/p0-2c-vi-validation.md` |
| P0-2d | Story 0.11 | ≥4 hours operator shadowing actual small-trust helpline operator | `_bmad-output/research/p0-2d-operator-shadowing.md` |

**Joint-discharge condition:** UX-DR5 + the AR-49 P0-2 Launch Gate Risks row (architecture line 4782) discharge ONLY when all four legs close (AC-equivalents for each Story + divergence reconciliations + Pattern 4 revisions for P0-2b leg complete). Story 0.9 closure alone does NOT discharge UX-DR5 or AR-49 P0-2 — it contributes the P0-2b leg.

**Per-leg gating dependencies:**
- Epic 3 (Member Identity & Lifecycle) design freeze depends on **Story 0.8 (P0-2a) + Story 0.10 (P0-2c)** closures + reconciliations. Story 0.9 (P0-2b) does NOT gate Epic 3.
- **Epic 6 (Claim Filing) design freeze depends on Story 0.9 (P0-2b — bereaved-spouse claim-filing lived experience) + Story 0.11 (P0-2d — operator shadowing) closures + reconciliations.** (Epics line 2263 explicit dependency.)
- Epic 8 (Sushil's Contribution Loop) design freeze depends on **Story 0.8 (P0-2a) + Story 0.10 (P0-2c)** closures + reconciliations. Story 0.9 (P0-2b) does NOT gate Epic 8.
- **Epic 9 (Reconciliation Engine — NomineeConsole Sunita's surface) design freeze depends on Story 0.9 (P0-2b — bereaved-spouse "fursat" cadence + staff-takeover lived experience)** + Story 0.10 (P0-2c — accessibility on grief-paced flows) closures + reconciliations. (Epics line 3088 explicit dependency.)
- **Epic 11b (Memorial + Sahyog Drive) design freeze depends on Story 0.9 (P0-2b — bereaved-spouse memorial-consent + portrait/kinship-lattice cultural appropriateness + family-authorship pacing lived experience)** + Story 0.11 (operator shadowing for moderator-side surfaces) closures + reconciliations. (Epics lines 3750 + 3850 + 3862 explicit dependencies.)
- Epic 10 (Admin Operations Console) design freeze depends on **Story 0.11 (P0-2d)** closure + reconciliation. Story 0.9 does NOT gate Epic 10.

**Disjoint anchor** (per Story 0.7 §10 + Story 0.8 §10 disjoint-anchor precedent): Story 0.9 is NOT a 30-day-takeover joint-discharge contributor (the joint-discharge is the bus-factor-of-one mitigation portfolio per Stories 0.3 + 0.4 + 0.5 + 0.6 + 0.7 framework legs). Story 0.9 is the *member-class empathy P0-2b* leg, a parallel portfolio with distinct closure semantics. Closure does NOT contribute to the 30-day-takeover joint discharge.

---

## §11 Pattern 4 evaluation provenance (the AC's load-bearing surface)

The AC names "Sally's UX Pattern 4 dignified-validation grammar is explicitly evaluated against findings; any required revisions are recorded before Epic 6 (claim filing) design freezes" (epics line 853). This is the AC's load-bearing surface distinct from Story 0.8's mental-model-validation surface.

**Pattern 4 reference:** UX spec §12 lines 2334-2360 (Dignified Validation pattern + sample copy table). The sample copy table at lines 2349-2360 carries 8 rows of member-facing Hindi+English copy that the AC names as evaluated against actual grief:

| # | Sample-copy row | UX spec line |
|---|---|---|
| 1 | HRMS not found | 2353 |
| 2 | Document upload network failure | 2354 |
| 3 | Date outside lock-in period | 2355 |
| 4 | UPI Intent cancelled by user | 2356 |
| 5 | Bank statement format unrecognized (Sunita) | 2357 |
| 6 | OTP not received | 2358 |
| 7 | Member already enrolled (Invite flow) | 2359 |
| 8 | Eligibility check failed | 2360 |

Plus the cross-cutting grief-grammar elements that Pattern 4 evaluation also assesses:

| # | Grief-grammar element | Source cite |
|---|---|---|
| 1 | "fursat" cadence | UX spec line 67 + 295 + 315 |
| 2 | witness-not-bailiff register | UX spec line 67 + 315 + 295 |
| 3 | black-bordered visual treatment | UX spec line 295 + 315 + 390 |
| 4 | no-countdowns-under-grief | UX spec line 295 + 390 |
| 5 | no-penalties-under-grief | UX spec line 295 + 390 |
| 6 | named-human-shepherd dignity | UX spec line 390 + PRD §UJ-3 line 93 |
| 7 | opt-in-for-memorial-consent posture | UX spec §0 Stance #1 (DPDPA consent) + Epic 11b Story 11b.6 commitment |

**Instruments and surfaces:**
- The **pattern-4-evaluation-worksheet.md** (Task 4) is the *capture instrument* for the per-sample-copy verdict and the per-grief-grammar-element verdict.
- The **question-bank.md** §6 (Task 4) is the *prompting instrument* for opt-in mid-interview Pattern 4 sample-copy presentation; §7 is the *prompting instrument* for opt-in late-interview cross-cutting grief-grammar presentation.
- The **synthesis-schema.md** §4 (Task 5) is the *output surface* that requires Pattern 4 evaluation population.
- The **divergence-log.md** (Task 5) is the *gap-detection instrument* — every Pattern 4 verdict ∈ {`requires-revision-with-proposed-copy`, `requires-deeper-redesign`} produces a divergence-log row with severity `pattern4-copy-revision-required`.
- The **Task 11 reconciliation** (Story 0.9 file) is the *integration mechanism* into UX spec §12 Pattern 4 sample copy table — proposed revisions are routed through the UX-edit workflow before Epic 6 / Epic 9 / Epic 11b design freezes.

**Critical:** Pattern 4 evaluation is **opt-in mid-interview** per ethics-protocol §3.7. The researcher offers the Pattern 4 sample-copy review only after rapport is established AND only if the spouse opts in. Declined samples are marked `not-evaluated-due-to-spouse-non-engagement` in the worksheet — this is an honest research outcome, not a framework failure. The framework permits and honors spouse non-engagement.

---

## §12 Domain glossary

- **P0-2** — UX §Phase-0 Empathy Field Work gate (UX spec lines 101-105); a launch-blocker that cannot defer to Open Questions because the spec materially depends on the findings before any v1 surface ships.
- **P0-2b** — the bereaved-spouse-conversation leg of P0-2 (Story 0.9); validates UX Pattern 4 dignified-validation grammar + grief-grammar against actual grief.
- **UX-DR5** — UX Design Requirement 5; the P0-2 empathy field-work gate per epics line 375.
- **UX-DR55** — UX Design Requirement 55; Pattern 4 dignified-validation per UX spec line 449 + §12 lines 2334-2360.
- **UX-DR31-33** — UX Design Requirements 31-33; Ravi-mode primitives (`<ClaimProxyFlowShell>` + `<HandoverTrustOTP>` + `<ClaimDocumentUpload>`).
- **UX-DR35** — UX Design Requirement 35; `<NomineeConsole>` — Sunita's surface with "fursat" cadence + staff-takeover by day N.
- **UX-DR38** — UX Design Requirement 38; `<MemorialAuthorshipSurface>` — post-close authorship with Trustee review wiring.
- **UX-DR50** — UX Design Requirement 50; `<SaveAndResumeAffordance>` on grief-paced flows.
- **bereaved spouse** — the participant in Story 0.9; a spouse who has been through a death-benefit claim process (TSCT or comparable small-trust precedent) and whose lived experience of grief + document-gathering + trust-staff interaction + family/community involvement is the irreducible signal TWT's grief-aware design depends on.
- **nominee** — TWT term for the deceased member's designated benefit recipient; PRD §2 nominee persona = Sushil's wife / mother / adult son; PRD §UJ-3 narrative = receives ~₹49 lakh payouts to two nominee bank accounts over 15-day window; assigned a named human shepherd per claim. The bereaved-spouse participant may or may not have been a nominee in their reference-trust claim.
- **Sunita-mode** — UX framing for the validated nominee post-claim operating the Nominee Reconciliation Console during the 15-day pool window with "fursat" cadence + witness-not-bailiff stance.
- **Ravi-mode** — UX framing for the relative-as-deceased claim filing flow — a relative logs into TWT using the deceased member's phone+OTP, triggers explicit consent + witnessed declaration of relationship, then files the death claim.
- **fursat cadence** — Hindi *फुर्सत* (leisure); grief-respectful pacing register applied to Sunita-mode console + Ravi-mode flows + all grief-context surfaces. "Aaram se, jab fursat ho" (at ease, when you have leisure) is the register lexeme.
- **witness-not-bailiff** — register grammar per UX spec line 67 + 315 — the surface witnesses the user's experience rather than enforcing administrative compliance ("bailiff"). Critical at grief-context surfaces.
- **held-ness under grief** — felt-experience commitment per UX spec line 295 + 315 — the user feels the system is *holding* them, not *processing* them or *managing* them through a workflow.
- **black-bordered portrait** — visual treatment per UX spec line 295 + 390 + UX-DR17 `<PortraitFrame>` — Hindi-belt obituary convention; the deceased member's photo is rendered in a black-bordered white-inset funeral frame.
- **FuneralFrame** — UX-DR17 component; the black-bordered-white-inset funeral frame pattern used in Shradhanjali memorial page, In Memoriam thumbnails, Ravi-mode home, and any future deceased-member visual surface (UX spec line 704).
- **PortraitFrame** — UX-DR17 component variant; renders the deceased member's photo in a culturally-appropriate Hindi-context visual treatment.
- **KinshipLattice** — UX-DR18 component; renders optional kinship relationships (parent / spouse / child / sibling) as a respectful structural diagram (NOT social-network-style graph).
- **SahyogVivran** (सहयोग विवरण) — the per-claim story surface per Epic 11b Story 11b.3; renders the family's narrative with consent.
- **In Memoriam** — Epic 11b Story 11b.6; consent-governed revocable list of deceased members.
- **named human shepherd** — per PRD §UJ-3 line 93 + UX spec line 390 — Anita-class District Admin assigned per claim to walk the bereaved family through the claim filing surface + Sahyog Vivran authorship + memorial publication; named (not anonymous) is the dignity grammar commitment.
- **opt-in memorial consent** — per Epic 11b Story 11b.6 + Story 6.9 claim-time DPDPA consent — opt-in (not opt-out) default for memorial publication; the bereaved family must affirmatively opt in for Sahyog Vivran / In Memoriam / Memorial Authorship Surface.
- **dignified-validation grammar** — UX-DR55 Pattern 4 + UX spec §12 lines 2334-2360 — member-facing error/validation copy with three required elements: what's wrong + what to do next + helpline fallback; avoids blame-first phrasing ("Error:", "Invalid", "Failed", "Forbidden") + alarming red iconography; frames what to do next, not what went wrong.
- **informed consent** — the ethics-protocol §2 (a)-(h) commitment; verbal + signed; revocable at any time per §5.
- **re-consent for quotation** — ethics-protocol §2-bis P0-2b-distinct discipline; no verbatim quotation in any artifact unless specifically re-confirmed at the quote in question; re-confirmed quotes carry `[quote-re-confirmed YYYY-MM-DD]` marker.
- **trustee approval pre-conversation** — ethics-protocol §2-tris P0-2b-distinct precondition; Trustee Panel approval recorded as the first row in trustee-review-log.md BEFORE Solo Builder approaches any candidate.
- **bereavement-context recruitment discipline** — ethics-protocol §3.0 P0-2b-distinct rule; cold recruitment forbidden; trustee-mediated paths only; TWT operational referrals not applicable (TWT has not yet operated).
- **pseudonymization** — identity protection via canonical slug (`Bereaved-Spouse-1`); substantive name-to-pseudonym mapping stored out-of-band per ethics-protocol §4.
- **divergence-log** — observational gap-detection instrument per [[feedback_gap_analysis_observational]]; one row per refuted-or-nuanced assumption + one row per Pattern 4 verdict requiring revision.
- **synthesis dimension** — a named focus area within the synthesis; the framework commits 5 AC-named dimensions (emotional pace tolerance + document-gathering experience + interaction with trust staff + what felt dignified vs transactional + role of family/community) + dimension-6 cultural-grammar cross-cutting (added at author-commit for spouse-led observations outside the five dimensions).
- **AR-49** — architectural commitment "Launch Gate Risks" per architecture line 4768 ff; P0-2 Member-Class Validation row at line 4782 cites UX-DR5 as the launch gate.
- **TSCT** — the prior-art reference trust documented at `_bmad-output/research/tsct-reference-learnings.md`; ~556 deceased-member families supported; recruitment-path anchor per §3.
- **NDA territory** — identity / contact / sensitive operational data stored out-of-band per Story 0.6 engineer-roster + Story 0.7 rota + Story 0.8 Shikshakamitra contact-identity discipline.

---

## §13 File index

| File | Purpose | Schema |
|---|---|---|
| `README.md` (this file) | Framework charter + invariants + lifecycle | 13 sections |
| `ethics-protocol.md` | Consent + identity + withdrawal + data handling + re-consent-for-quotation + trustee-approval-pre-recruitment + bereavement-context recruitment + opt-in Pattern 4 | 8 sections + §2-bis + §2-tris + §3.0 + §3.7 |
| `interview-protocol.md` | Conduct runbook with pre-recruitment trustee-approval check + opt-in Pattern 4 mid-interview offer | 7 sections (§0-§6) |
| `informed-consent-template-hindi.md` | Participant-facing Hindi consent form with re-consent-for-quotation checkbox + trustee-approval transparency line | a-h per ethics-protocol §2 + §2-bis checkbox |
| `informed-consent-template-english.md` | English mirror | a-h per ethics-protocol §2 + §2-bis checkbox |
| `question-bank.md` | Researcher prompt list across 5 AC dimensions + §6 Pattern 4 opt-in + §7 grief-grammar opt-in | ≥5 prompts per dimension; 8 Pattern 4 prompts; 7 grief-grammar prompts |
| `pattern-4-evaluation-worksheet.md` | **AC's load-bearing Pattern 4 capture instrument** — 8 sample-copy rows + 7 cross-cutting grief-grammar rows | Per-sample verdict + proposed_revision + divergence-log cross-link |
| `assumption-inventory.md` | Pre-stated PRD/UX grief-grammar + claim-filing + memorial assumptions | ≥30 rows across 8 categorizations |
| `per-interview-note-schema.md` | Per-conversation note shape with re-consent-for-quotation tracking + Pattern 4 engagement status | Column-per-field |
| `synthesis-schema.md` | Cross-section synthesis structure with Pattern 4 evaluation §4 load-bearing section | 12 sections |
| `divergence-log.md` | Observational gap-detection log (assumption divergences + Pattern 4 revisions required) | Column-per-field, append-only, permitted-pre-staging objective criterion |
| `trustee-review-log.md` | Trustee review event log (pre-conversation approval + synthesis review) | Column-per-field, append-only, pre-conversation-approval row slot pre-staged |
| `recruitment-log.md` | Pseudonym-to-recruitment-path log with quotation-re-consent-engagement column | Column-per-field, append-only |
| `interview-notes/` | Per-conversation pseudonymized note (1 file post-Task-8) | Per per-interview-note-schema |
| `interview-notes/README.md` | Subdirectory placeholder explaining post-Task-8 authoring | Plain text |
| `../p0-2b-bereaved-spouse.md` (sibling) | **AC-named synthesis destination** per epics line 852 | Per synthesis-schema |

**File-vs-directory collision rule:** The protocol framework directory is `_bmad-output/research/p0-2b-bereaved-spouse-protocol/` (with `-protocol` suffix). The synthesis is the file `_bmad-output/research/p0-2b-bereaved-spouse.md`. These are siblings under `_bmad-output/research/`. The two paths cannot collide because they have distinct last-path-segment slugs.
