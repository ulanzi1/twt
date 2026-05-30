# P0-2a Teacher Empathy Interviews — Research Protocol Framework

**Authority cites:** UX-DR5 (epics line 375 "P0-2 empathy field-work gate") · UX §Phase-0 P0-2 (UX spec lines 101-105 "5 Shikshakamitra (Reena-class) conversations + 1 bereaved-spouse conversation in Vaishali district + ≥1 Hindi-using visually-impaired/low-vision member's interaction") · AR-49 Launch Gate Risks row "P0-2 Member-Class Validation (field work) | UX Researcher | Trustee Panel (logistics)" (architecture line 4782) · architecture §External Validation Pending UX Researcher (architecture lines 4855-4859) · architecture §4.10 Devanagari readability two-gate property (architecture lines 2759-2767) · Story 0.8 file `_bmad-output/implementation-artifacts/0-8-p0-2a-teacher-empathy-interviews-completed.md`

**Status:** Author-committed 2026-05-30 (framework + protocol + ethics + consent + question-bank + assumption-inventory + schemas + synthesis scaffold). Substantive empathy work + synthesis + trustee review + divergence reconciliation are tracked Tasks 7-11 _AWAITING EXTERNAL ACTION_ in Story 0.8 file.

---

## §1 Why a research-protocol surface

The P0-2a empathy work is broader than a single synthesis file. It requires a protocol-level commitment to: ethics (informed consent + identity protection + withdrawal procedure); recruitment (sampling-bias-aware path selection + 5-participant minimum maintenance); conduct (≥45-minute Hindi interviews in participant-preferred locations with researcher peer-register discipline); synthesis (per-dimension lived-data grounding with per-interview citations); trustee review (≥1-trustee sign-off gating Epic 3 substrate work); and divergence reconciliation (gap-detection from PRD/UX assumptions + routing into PRD/UX/architecture amendments before Epic 3 + Epic 8 design freezes).

A single synthesis file cannot carry that protocol-level commitment as a *commitment record*. The unified protocol directory `_bmad-output/research/p0-2a-teacher-interviews-protocol/` discharges the UX-DR5 + UX §Phase-0 P0-2 + AR-49 P0-2 Launch Gate Risks commitments as a single trustee-accessible surface; the synthesis file at `_bmad-output/research/p0-2a-teacher-interviews.md` (per the Story 0.8 AC verbatim path from epics line 833) is the research *output* the protocol produces.

This framework-as-research-surface pattern extends the framework-as-top-level-surface pattern from `docs/runbooks/` (Story 0.1) + `docs/escrow/` (Stories 0.2 + 0.3) + `docs/degradation-policy/` (Story 0.4) + `docs/knowledge-transfer/` (Story 0.5) + `docs/backup-engineer/` (Story 0.6) + `docs/fallback-handler-ledger/` (Story 0.7) to research surfaces under `_bmad-output/research/`. The directory naming (`-protocol` suffix on the framework dir) is structurally required because the AC names a synthesis file path (not a directory) — file-vs-directory collision rule means the protocol must live as a sibling, not inside the AC-named path.

---

## §2 Framework lifecycle

1. **Author-commit (2026-05-30, Story 0.8 Tasks 1-6)** — protocol + ethics + consent templates + question-bank + assumption-inventory + per-interview-note-schema + synthesis-schema + divergence-log scaffold + trustee-review-log scaffold + recruitment-log scaffold (with 5 `pending-recruitment` rows) + `interview-notes/` subdirectory placeholder + synthesis file scaffolded at AC-named path with `_AWAITING_INTERVIEW_CONDUCT_` placeholders + `.decision-log.md` Decision 2026-05-30-008 entry.
2. **Recruitment (Story 0.8 Task 7, _AWAITING EXTERNAL ACTION_)** — Solo Builder identifies 5 currently-serving Shikshakamitra in Vaishali district via recruitment paths enumerated in §3; informed consent obtained per ethics-protocol §2 before any interview is scheduled; recruitment-log rows populated; substantive identity stored out-of-band per ethics-protocol §4.
3. **Interview conduct (Story 0.8 Task 8, _AWAITING EXTERNAL ACTION_)** — Solo Builder conducts each ≥45-minute Hindi interview in the participant's preferred location per interview-protocol; per-interview notes authored within 24 hours per per-interview-note-schema.
4. **Synthesis authoring (Story 0.8 Task 9, _AWAITING EXTERNAL ACTION_)** — Solo Builder edits `_bmad-output/research/p0-2a-teacher-interviews.md` replacing `_AWAITING_INTERVIEW_CONDUCT_` placeholders with substantive findings grounded in per-interview citations; assumption-inventory validation_status updated per assumption; divergence-log rows appended per refuted-or-nuanced assumptions.
5. **Trustee review (Story 0.8 Task 10, _AWAITING EXTERNAL ACTION_)** — ≥1 trustee reviews synthesis per ethics-protocol §8 + synthesis-schema authority; verdict appended to trustee-review-log; `.decision-log.md` Decision 2026-05-30-008-trustee-review-N entry appended.
6. **Divergence reconciliation (Story 0.8 Task 11, _AWAITING EXTERNAL ACTION_)** — Each Epic-3-affecting + Epic-8-affecting + cross-cutting divergence row reconciled per `reconciliation_action_plan` before the affected Epic's design freeze; reconciliation outcome recorded in divergence-log + `.decision-log.md` `[CONTINUITY]` or `[OPS]` entry.
7. **Ongoing maintenance** — per-architectural-amendment refresh if PRD/UX assumptions shift materially after synthesis date; per-Story-touch refresh if Epic 3 / Epic 8 stories cite the synthesis and the citation does not match current synthesis state; per-quarter trustee re-review if divergence-log accumulates unresolved entries.

---

## §3 Four-way property/protocol/policy/gap-analysis discipline

Extending the Story 0.4 + 0.5 + 0.6 + 0.7 pattern, the framework separates four concerns:

- **Property** — what the framework commits as *true* about the empathy work: 5 interviews; ≥45 minutes each; Hindi conduct; participant-preferred location; informed consent before recording-or-notes; pseudonymization across all artifacts; per-dimension synthesis grounded in lived data; ≥1-trustee review before Epic 3 substrate work; divergence reconciliation before Epic 3 + Epic 8 design freezes.
- **Protocol** — the *specific instruments* that realize the property: ethics-protocol.md (consent + identity + withdrawal + data handling); interview-protocol.md (conduct runbook); informed-consent-template-{hindi,english}.md (participant-facing instruments); question-bank.md (researcher prompt list); per-interview-note-schema.md + synthesis-schema.md + divergence-log.md + trustee-review-log.md + recruitment-log.md (data-capture instruments).
- **Policy** — *operations-policy territory* committed at framework level but with specific values deferred per [[feedback_architecture_vs_adr_boundary]]: recruitment-path selection rules (§3 below); power-differential mitigation grammar (peer-register vs authority-register); pseudonymization mechanism (canonical slug vs random token); compensation structure (modest travel/time reimbursement vs no-compensation); data retention windows (90-day raw recording retention vs immediate destruction); recording-vs-notes default; cross-participant comparison-without-naming discipline.
- **Gap analysis** — per [[feedback_gap_analysis_observational]]: the divergence-log is the *observational* gap-detection instrument. It captures incompleteness or risk in PRD/UX assumptions and proposes conditional escalation paths via `reconciliation_action_plan`. It does NOT directly prescribe sprint planning or override architecture — Task 11 reconciliation is the discharge mechanism. The assumption-inventory is the *pre-stated* assumption list without which divergence is structurally invisible.

### Recruitment paths (operations-policy committed at framework level)

The 5 Shikshakamitra are recruited via, in priority order:
1. **Bihar state education department directory** — currently-serving Shikshakamitra rolls; researcher identifies candidates by district + block + school; recruitment via cold outreach with informed consent gating.
2. **Vaishali district teacher unions / Shikshakamitra associations** — union halls + association office visits; recruitment via in-person introduction.
3. **Trustee-network referrals** — Trustee Panel members may suggest candidates within their personal networks (NOT TWT-affiliated networks; that would introduce sampling bias).
4. **School-visit recruitment within Vaishali district blocks** — researcher visits primary schools, identifies Shikshakamitra in the staffroom, requests participation.

**Discouraged paths** (sampling-bias risk):
- TSCT / NSCT operational referrals — these would over-represent existing-welfare-trust-aware respondents whose mental model is *already* shaped by the prior-art reference TWT inherits.
- Researcher's personal-network referrals — bias toward respondents who share researcher demographic markers.
- Snowball sampling from any single seed participant — bias toward a single school / village / association cluster.

---

## §4 Structural invariants

The following invariants are non-negotiable; any framework revision that drops or weakens an invariant requires a `.decision-log.md` supersession entry recording rationale per the Story 0.4-0.7 supersession-schema precedent:

1. **Informed consent before recording-or-notes.** Every interview MUST have informed consent (per ethics-protocol §2 a-h) BEFORE any recording or note-taking activates. Verbal reconfirmation of recording consent is required at the start of every recorded session.
2. **Recording-vs-notes is participant-led.** The participant chooses; researcher does not pressure. Researcher's default preference is detailed notes (less invasive); audio recording is permitted only with explicit reconfirmation + mid-session pause-right.
3. **Pseudonymization across all artifacts.** Canonical pseudonyms `Shikshakamitra-1` through `Shikshakamitra-5` per recruitment-log assignment order. Demographic context preserved at non-identifying granularity (district = Vaishali; block = recorded with block-level slug; village-name is replaced with block-level slug; school-name + colleague-name + specific-incident detail is paraphrased). Substantive name + contact mapping is stored out-of-band per ethics-protocol §4 — NDA territory inheriting Story 0.6 engineer-roster need-to-know discipline + Story 0.7 rota contact-identity NDA pattern.
4. **Synthesis grounded in lived conversation data.** The synthesis at `_bmad-output/research/p0-2a-teacher-interviews.md` MUST be grounded in per-interview citations. Generic LLM-imagined or PRD-paraphrased synthesis is forbidden. A synthesis row without per-interview citation (`Shikshakamitra-N §dimension-X`) is a gap and triggers Open Question recording per Story 0.4 + 0.5 + 0.7 Open-Question precedent.
5. **Five named synthesis dimensions are minimum-coverage append-only.** The five dimensions (financial-literacy baseline; mobile-device usage patterns; comfort with UPI; trust-source mapping; grief experience) per epics line 832 are the minimum coverage; the framework may extend dimensions if lived data surfaces new themes (e.g., dimension-6 mental-model validation added at author-commit per UX spec lines 880-892 hypothesis), but the five named dimensions are non-negotiable. Dimensions are append-only; supersession-schema applies for refinement.
6. **Divergence visibility is forbidden to suppress.** Forbidden status: "synthesis row that contradicts PRD/UX assumption but the divergence is silently absorbed into the synthesis without divergence-log entry." Every refuted-or-nuanced assumption per assumption-inventory MUST produce a divergence-log row.
7. **Trustee review precedes Epic 3 substrate work.** The synthesis cannot be marked `trustee-reviewed` until ≥1 trustee signs off per trustee-review-log schema. Epic 3 substrate work (Stories 3.1-3.12) cannot begin until the trustee-review-log records `accepted` verdict + `sign-off_note` attesting Epic 3 substrate work may begin.
8. **Divergence reconciliation gates design freezes.** Epic 3 + Epic 8 design-freeze conversations cannot proceed until the divergence-log has terminal `reconciliation_status` ∈ {`reconciled-via-spec-update`, `reconciled-via-design-adjustment`, `explicitly-deferred-with-rationale`} for every divergence row affecting the Epic per [[feedback_closure_language_precision]].
9. **No participant identity or contact in framework artifacts.** No individual participant's identity, contact, or precise location (village-name, school-name) is inlined in the synthesis file or any framework artifact. Identity NDA territory stored out-of-band per operations policy.
10. **No compensation as obligation-creating.** Ethics-protocol may permit modest travel/time reimbursement but the reimbursement is NOT contingent on specific findings, NOT contingent on TWT join-ask, NOT contingent on referral-ask. The participant has no obligation to TWT post-interview.
11. **Researcher is Solo Builder, not trained ethnographer.** Researcher limitations are acknowledged in ethics-protocol §7. Researcher does NOT diagnose participants' financial or grief experience; does NOT solicit specific incidents the participant has not voluntarily raised; does NOT recommend TWT or any other product during the interview.
12. **Withdrawal at any time is honored.** Per ethics-protocol §5 — withdrawal before synthesis = per-interview note marked `withdrawn` + content destroyed; withdrawal after synthesis = per-row removal from synthesis + supersession-schema marker. No coercion, no explanation required.

---

## §5 Sign-off lifecycle

- **Framework-ratification gate:** ≥1-trustee synthesis review (Story 0.8 Task 10). Per-dimension ratification OR pack-as-a-unit ratification is the trustee's choice; the trustee-review-log row `review_scope` column records which.
- **Quorum-unavailable fallback path:** If the Trustee Panel cannot convene a full review within the launch window (e.g., trustee incapacitation; co-occurring sprint-change-proposal review consuming all panel bandwidth), emergency review by the Trustee Panel chair alone is valid, time-bounded 30 days, recorded as a `.decision-log.md` `[CONTINUITY]` entry with rationale per [[feedback_closure_language_precision]] — mirrors the Story 0.5 + 0.6 + 0.7 emergency-single-trustee fallback path. The chair review carries the same Epic-3-substrate-work-may-begin gating authority but the 30-day window forces re-review by a second trustee before lifting.
- **Verdict states:** `accepted` (Epic 3 substrate work may begin per the sign-off note); `accepted-with-revisions` (synthesis must be revised per revision list before Epic 3 begins); `rejected-pending-rework` (Tasks 7-9 cycle re-engages with revised protocol per trustee feedback).
- **No tie-breaking required for single-trustee reviews.** If multiple trustees review and disagree, the trustee-review-log records each verdict separately; resolution path: Trustee Panel convenes for deliberative discussion + records consensus or majority outcome as a follow-up trustee-review-log row.

---

## §6 Review cadence fallback

- **One-time synthesis review** at AC-1 closure (Story 0.8 Task 10).
- **Per-architectural-amendment refresh** if PRD/UX assumptions shift materially after the synthesis date — the assumption-inventory rows are re-evaluated against the new PRD/UX surface; divergence-log rows are re-attested or re-opened as needed.
- **Pre-Epic-3-design-freeze + pre-Epic-8-design-freeze divergence reconciliation checkpoints** (Story 0.8 Task 11) — every Epic-affecting divergence row is gating input for the affected design freeze.
- **Per-Story-touch refresh** if Epic 3 or Epic 8 stories cite the synthesis and the citation does not match the current synthesis row state — synthesis row supersession is logged in synthesis Pack-revision log; the citing Story is amended if the supersession changes the citation's substance.
- **Per-quarter trustee re-review** if divergence-log accumulates unresolved entries beyond a target threshold (suggested ≥3 unresolved rows after 90 days) — trustee re-engages to either approve closures or escalate to Trustee Panel deliberation.

---

## §7 Synthesis-vs-per-interview-note reconciliation

The synthesis at `_bmad-output/research/p0-2a-teacher-interviews.md` is authoritative for the cross-interview pattern + the dimension-level finding. The per-interview notes under `interview-notes/shikshakamitra-N.md` are authoritative for the lived-data citation + the verbatim observation. Reconciliation rules:

- Every synthesis row carries citations to ≥1 per-interview note (`Shikshakamitra-N §dimension-X`); per invariant 4, uncited synthesis rows are gaps.
- Per-interview notes are *immutable after author-commit + 24-hour-window close* — corrections within the 24-hour window are permitted; corrections after are supersession entries.
- Per-interview note revisions (rare; only if participant withdraws or factual correction is necessary) are logged in the synthesis Pack-revision log per the Story 0.4 + 0.5 + 0.6 + 0.7 supersession schema with a synthesis re-attestation row.
- If a synthesis row contradicts the per-interview notes it cites, the per-interview notes win; the synthesis is amended per the supersession-schema with a Pack-revision log entry.

---

## §8 Open ADR slots

The framework commits properties + protocol shape; specific operational choices are deferred to operations policy / future ADRs per [[feedback_architecture_vs_adr_boundary]]:

1. **Recruitment-incentive structure** — modest travel/time reimbursement amount + cadence + tax-treatment; ADR pending decision on whether reimbursement is offered at all. Open Question recorded.
2. **Recording technology** — phone audio vs dedicated recorder; ADR pending choice criteria (audio quality vs participant comfort vs cost).
3. **Transcription mechanism** — manual transcription vs Hindi-ASR (e.g., Bhashini or commercial Hindi-ASR) + manual review pass; ADR pending evaluation of ASR accuracy on Bihar-dialect Hindi.
4. **Pseudonymization mechanism** — canonical slug (`Shikshakamitra-N`) committed at framework level; whether random-token-based pseudonyms are used for cross-study deduplication (if Story 0.9-0.11 share participants — unlikely) is ADR territory.
5. **Data-retention policy for raw recordings** — 90-day default committed in ethics-protocol §6; specific destruction mechanism + audit-trail evidence is ADR territory.
6. **Consent-withdrawal procedure if participant withdraws after synthesis** — per-row removal + supersession-schema marker committed at framework level; specific notification to upstream consumers of the synthesis (Epic 3 / Epic 8 stories cited) is ADR territory.
7. **Cross-participant comparison-without-naming discipline** — verbatim quotes are non-identifying only; the boundary between "non-identifying" and "identifying" needs operational guidance; ADR pending.
8. **Per-dimension synthesis depth vs breadth tradeoff** — synthesis-schema commits ≥3 substantive observations per dimension per participant; whether deeper depth at fewer dimensions is permitted is ADR territory.

---

## §9 Related continuity / research surfaces table

| Surface | Owning Story | Path |
|---|---|---|
| TSCT reference learnings (prior-art) | pre-existing | `_bmad-output/research/tsct-reference-learnings.md` |
| **This empathy-interview protocol** | **Story 0.8** | **`_bmad-output/research/p0-2a-teacher-interviews-protocol/` + `_bmad-output/research/p0-2a-teacher-interviews.md`** |
| Bereaved-spouse conversation synthesis | Story 0.9 | `_bmad-output/research/p0-2b-bereaved-spouse.md` (pending creation) |
| VI/low-vision accessibility validation | Story 0.10 | `_bmad-output/research/p0-2c-vi-validation.md` (pending creation) |
| Operator shadowing | Story 0.11 | `_bmad-output/research/p0-2d-operator-shadowing.md` (pending creation) |
| Operational runbooks | Story 0.1 | `docs/runbooks/` |
| Credential escrow | Story 0.2 | `docs/escrow/credential-escrow/` |
| Code escrow | Story 0.3 | `docs/escrow/code-escrow/` |
| Per-surface degradation policy | Story 0.4 | `docs/degradation-policy/` |
| Knowledge-transfer pack | Story 0.5 | `docs/knowledge-transfer/` |
| Backup-engineer contract | Story 0.6 | `docs/backup-engineer/` |
| Fallback-handler ledger | Story 0.7 | `docs/fallback-handler-ledger/` |

The pre-existing `_bmad-output/research/tsct-reference-learnings.md` is the *prior-art anchor* — it documents the TSCT model TWT inherits structurally. Story 0.8 does NOT modify the TSCT reference file; it is referenced as the prior-art anchor that frames the assumption-inventory's hypothesis structure (the *chanda + phone reminder* mental model derives from TSCT's screenshot-receipt + WhatsApp-group-mediated practice that the cadre already knows).

---

## §10 P0-2 four-leg joint-discharge anchor

Story 0.8 contributes the **first of four P0-2 legs** of the UX-DR5 + AR-49 P0-2 Launch Gate Risks discharge:

| Leg | Owning Story | Scope | Synthesis output path |
|---|---|---|---|
| P0-2a | **Story 0.8 (this Story)** | 5 Shikshakamitra (Reena-class) interviews in Vaishali district | `_bmad-output/research/p0-2a-teacher-interviews.md` |
| P0-2b | Story 0.9 | 1 bereaved-spouse conversation in Vaishali district | `_bmad-output/research/p0-2b-bereaved-spouse.md` |
| P0-2c | Story 0.10 | ≥1 Hindi-using VI/low-vision member's interaction with TWT prototype surfaces | `_bmad-output/research/p0-2c-vi-validation.md` |
| P0-2d | Story 0.11 | ≥4 hours operator shadowing actual small-trust helpline operator | `_bmad-output/research/p0-2d-operator-shadowing.md` |

**Joint-discharge condition:** UX-DR5 + the AR-49 P0-2 Launch Gate Risks row (architecture line 4782) discharge ONLY when all four legs close (AC-equivalents for each Story + divergence reconciliations complete). Story 0.8 closure alone does NOT discharge UX-DR5 or AR-49 P0-2 — it contributes the P0-2a leg.

**Per-leg gating dependencies:**
- Epic 3 (Member Identity & Lifecycle) design freeze depends on **Story 0.8 (P0-2a — Reena onboarding empathy) + Story 0.10 (P0-2c — accessibility validation)** closures + reconciliations.
- Epic 6 (Claim Filing) design freeze depends on **Story 0.9 (P0-2b — bereaved-spouse) + Story 0.11 (P0-2d — operator shadowing)** closures + reconciliations.
- Epic 8 (Sushil's Contribution Loop) design freeze depends on **Story 0.8 (P0-2a — Sushil contribution mental model) + Story 0.10 (P0-2c — accessibility validation)** closures + reconciliations.
- Epic 10 (Admin Operations Console) design freeze depends on **Story 0.11 (P0-2d — operator shadowing)** closure + reconciliation.

**Disjoint anchor** (per Story 0.7 §10 disjoint-anchor precedent): Story 0.8 is NOT a 30-day-takeover joint-discharge contributor (the joint-discharge is the bus-factor-of-one mitigation portfolio per Stories 0.3 + 0.4 + 0.5 + 0.6 + 0.7 framework legs). Story 0.8 is the *member-class empathy* leg of P0-2, a parallel portfolio with distinct closure semantics. Closure does NOT contribute to the 30-day-takeover joint discharge.

---

## §11 Domain glossary

- **P0-2** — UX §Phase-0 Empathy Field Work gate (UX spec lines 101-105); a launch-blocker that cannot defer to Open Questions because the spec materially depends on the findings before any v1 surface ships.
- **P0-2a** — the 5-Shikshakamitra-interviews leg of P0-2 (Story 0.8); validates Reena-class member assumptions.
- **P0-2b** — the bereaved-spouse-conversation leg of P0-2 (Story 0.9); validates dignified-validation grammar per UX §12 Pattern 4.
- **P0-2c** — the VI/low-vision-member-accessibility leg of P0-2 (Story 0.10); validates UX-DR66/67/68 acceptance criteria against real assistive-tech usage.
- **P0-2d** — the operator-shadowing leg of P0-2 (Story 0.11); validates Epic 10 helpdesk-subsystem operator-reality grounding.
- **UX-DR5** — UX Design Requirement 5; the P0-2 empathy field-work gate per epics line 375.
- **Shikshakamitra** (शिक्षकमित्र) — teacher aides; eligible category for TWT membership per PRD §3 + FR-1 eligibility dropdown. PRD §2.2 names Reena as the Shikshakamitra primary-margin-of-error persona.
- **Reena-class** — the margin-of-error member persona per UX spec line 57 — Shikshakamitra, ~₹15k/month stipend, scrutinizes every ₹, Hindi-first, marginal English, basic Android phone with intermittent 4G; the named UX design constraint per SM-C1 anti-pattern.
- **Sushil-class** — the primary member persona per PRD §2.1 + UX spec line 56 — Bihar primary-school assistant teacher, ~₹45k/month, Hindi-first, smartphone-primary, intermittent 4G, transacts on bus commute in ~2 minutes.
- **chanda** (चंदा) — community contribution; the cultural-grammar mental model the cadre already uses for collecting money at a colleague's death per UX spec §5 lines 880-892. The *chanda + phone reminder* hypothesis posits this is the cadre's internal mental model for TWT.
- **phone reminder** — the load-bearing infrastructure assumption from UX spec lines 887-888: Sushil's mental model assumes the system tells him when to act; without the in-app push (or WhatsApp mirror), the contribution drops.
- **Yogdaan Bahi** (योगदान बही) — the passbook-format contribution history per UX spec §5 + Epic 8 Story 8.6; the always-available emotional-anchor surface.
- **lock-in** — the 30-day membership lock-in period before first contribution per FR-3 + UX spec line 90.
- **Vyawastha Shulk** (व्यवस्था शुल्क) — the ₹110 annual administrative fee per FR-1 + UX spec + PRD §4.1; functionally distinct from contribution support money.
- **UPI Intent** — UPI deep-link flow with VPA + amount + transaction reference + transaction note pre-populated; the contribution payment substrate per Epic 8 Story 8.4.
- **UTR self-attestation** — member-attested Unique Transaction Reference after UPI Intent return; the one-tap reconciliation primitive per Epic 8 Story 8.4 + Epic 9 Story 9.4 matcher.
- **financial-literacy baseline** — synthesis dimension 1; participant's understanding of money-management practices, savings, debt, insurance, pension, chit-fund, cooperative-fund, chanda.
- **mobile-device usage** — synthesis dimension 2; participant's phone ownership, family-sharing, app usage patterns, WhatsApp/Telegram/SMS practices, coverage/data/battery experience.
- **trust-source mapping** — synthesis dimension 4; whom the participant consults about money decisions — family member, colleague, friend, village elder, shopkeeper, financial advisor — and the cultural-grammar of "trustworthy on money matters".
- **grief experience** — synthesis dimension 5; participant's lived experience with bereavement in colleague-circle / family / community, and the financial + emotional dimensions of that experience.
- **informed consent** — the ethics-protocol §2 (a)-(h) commitment; verbal + signed; revocable at any time per §5.
- **pseudonymization** — identity protection via canonical slug (`Shikshakamitra-N`); substantive name-to-pseudonym mapping stored out-of-band per ethics-protocol §4.
- **divergence-log** — observational gap-detection instrument per [[feedback_gap_analysis_observational]]; one row per refuted-or-nuanced assumption from the assumption-inventory.
- **synthesis dimension** — a named focus area within the synthesis; the framework commits 6 dimensions (5 named in AC + dimension-6 Mental-model validation added at author-commit per UX spec lines 880-892 hypothesis).
- **AR-61** — architectural commitment "Staff-fallback at every node" per architecture lines 296-298 + 349; cross-references Story 0.7 fallback-handler ledger.
- **NDA territory** — identity / contact / sensitive operational data stored out-of-band per Story 0.6 engineer-roster + Story 0.7 rota contact-identity discipline.

---

## §12 File index

| File | Purpose | Schema |
|---|---|---|
| `README.md` (this file) | Framework charter + invariants + lifecycle | 12 sections |
| `ethics-protocol.md` | Consent + identity + withdrawal + data handling | 8 sections |
| `interview-protocol.md` | Conduct runbook | 5 sections |
| `informed-consent-template-hindi.md` | Participant-facing Hindi consent form | a-h per ethics-protocol §2 |
| `informed-consent-template-english.md` | English mirror for researcher / trustee / English-preferring participant | a-h per ethics-protocol §2 |
| `question-bank.md` | Researcher prompt list across 6 dimensions | ≥6 prompts per dimension |
| `assumption-inventory.md` | Pre-stated PRD/UX assumptions to validate/refute | ≥25 rows |
| `per-interview-note-schema.md` | Per-conversation note shape | Column-per-field |
| `synthesis-schema.md` | Cross-interview synthesis structure | 10 sections |
| `divergence-log.md` | Observational gap-detection log | Column-per-field, append-only |
| `trustee-review-log.md` | Trustee review event log | Column-per-field, append-only |
| `recruitment-log.md` | Pseudonym-to-recruitment-path log | Column-per-field, append-only |
| `interview-notes/` | Per-conversation pseudonymized notes (5 files post-Task-8) | Per per-interview-note-schema |
| `interview-notes/README.md` | Subdirectory placeholder explaining post-Task-8 authoring | Plain text |
| `../p0-2a-teacher-interviews.md` (sibling) | **AC-named synthesis destination** per epics line 833 | Per synthesis-schema |

**File-vs-directory collision rule:** The protocol framework directory is `_bmad-output/research/p0-2a-teacher-interviews-protocol/` (with `-protocol` suffix). The synthesis is the file `_bmad-output/research/p0-2a-teacher-interviews.md`. These are siblings under `_bmad-output/research/`. The two paths cannot collide because they have distinct last-path-segment slugs.
