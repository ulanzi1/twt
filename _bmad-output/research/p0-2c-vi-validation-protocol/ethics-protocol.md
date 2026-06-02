# Ethics Protocol — P0-2c VI/Low-Vision Member Accessibility Validation

> **Researcher is Solo Builder (BigDev), NOT a trained ethnographer or accessibility-research specialist or disability-rights advocate.** Limitations are acknowledged + disability-context limitation acknowledged explicitly. This protocol commits the conduct discipline; specific operational choices are README §8 Open ADR slots.

## §1 — Authority cites

- **DPDPA member-data principles by analogy** — informed consent + identity protection + retention + withdrawal-right discipline (operational principles applied to research context).
- **Trust posture commitments per architecture §1.5** — PII shielding + identity-as-NDA-territory discipline inherited as research-data discipline.
- **UX Stance #6 staff-fallback obligation by analogy** — researcher's witnessing register is a research-conduct analog of staff-shepherding register.
- **UX spec §13 Accessibility Strategy lines 2576-2634** — research-conduct register inherits the system's design register: **dignified validation, accessibility-debt-tracked-not-accepted, AT-configuration-honored** apply to the researcher's conduct itself, not only to the design under test.
- **Story 0.8 ethics-protocol §1 precedent** — Hindi-language member-class field-work conduct discipline.
- **Story 0.9 ethics-protocol §1 + §2-bis + §2-tris + §3.0 + §3.7 precedent** — bereavement-context escalations extended here as disability-context escalations: re-consent-for-quotation; trustee-approval-pre-recruitment; recruitment-discipline-forbidding-cold-contact; opt-in-instrument-mid-session.
- **UX spec line 1203 Screen-reader-user empathy validation (P0-2 extension)** — engineering validation of TalkBack/VoiceOver Hindi output alone is insufficient; lived AT-walkthrough is required.

## §2 — Informed consent procedure

The consent form **MUST be presented in Hindi at the start of the session**. Large-print Hindi alternative offered + provided if requested. Read-aloud option offered + provided if requested. Thumbprint-as-signature-alternative + witness co-signature for low-vision participants who cannot easily sign per Story 0.9 P-14 precedent. Consent is **verbally reconfirmed before any recording or AT walkthrough begins**.

Consent covers, in canonical order (a)-(h) per Story 0.9 P-02 precedent:

- **(a) Participation purpose** — informing TWT design with **Reena-class accessibility-validation focus** across signup + My Pool + Yogdaan Bahi prototype surfaces.
- **(b) What data is collected** — session content + AT-behavior observations + demographic context at district-level granularity + disability category at WHO-ICF level (`visually-impaired` or `low-vision`) NOT specific etiology if disclosure would identify.
- **(c) What is recorded** — audio recording AND/OR screen-recording of prototype AND/OR notes per participant choice. Notes-only is the framework's default if participant declines all recording.
- **(d) How identity is protected** — pseudonymization in all artifacts as `VI-Member-1` (substitute `VI-Member-1A` per Story 0.9 P-07 precedent if first participant withdraws after synthesis).
- **(e) Data retention** — raw recordings retained for **60 days** post-synthesis (between Story 0.8's 90 days and Story 0.9's 30 days — disability-context default; the framework permits a participant-requested shorter retention to 30 days); **after 60 days, raw recordings are destroyed** — only the per-session note + synthesis remain (D-01 review-patch: destruction policy, not archival). Per-session notes archived in `session-notes/archived/` subdirectory after 6 months per Story 0.9 P-13 + P-04 precedent — "retained for 6 months, then archived (not destroyed) in `session-notes/archived/` subdirectory unless participant requests immediate destruction."
- **(f) Right to withdraw** — participant may withdraw at any time before, during, or after the session. Withdrawal after synthesis triggers per-row removal from synthesis + supersession-schema marker. **Granular withdrawal of specific quotation or AT-behavior observation post-synthesis** is permitted per §2-bis extended discipline.
- **(g) Compensation** — disability-context default is **travel-reimbursement-permitted** (higher than Story 0.9's no-compensation default because disability-context often involves higher travel cost — assistive-aide companion travel, accessible-transport premium). Reasonable time-stipend permitted only if Trustee Panel approves at §2-tris pre-session approval. NOT contingent on specific findings or specific verdicts.
- **(h) No obligation to TWT** — participant is not asked to join TWT, refer others, or use TWT post-session. Researcher does NOT recommend TWT during the session.

### §2-bis — Re-consent for direct quotation

(Inheriting Story 0.9 §2-bis discipline.)

- **No verbatim quotation is included in any artifact** (synthesis, per-session note, divergence-log, ux-dr-clause-evaluation-worksheet) **unless specifically re-confirmed at the quote in question.** Default is paraphrase only.
- Re-confirmed quotes carry a `[quote-re-confirmed YYYY-MM-DD]` marker.
- **30-day re-consent-fallback-timeout** per Story 0.9 P-15 precedent: if re-consent request goes unanswered for 30 days via the trustee-mediated channel, the quote is removed from synthesis and replaced with paraphrase; `quotation_log` row marked `re-consent-pending-fallback-timeout`.
- **Re-approval after withdrawal** is permitted: a participant who withdrew a quote may later re-approve it; the `quotation_log` row carries the most recent `re-consent-re-approved-after-withdrawal-YYYY-MM-DD` status per Story 0.9 P-16 precedent. Most recent status is authoritative.
- **AT-behavior-observation re-consent** is structurally similar: AT-behavior observations are paraphrased by default; verbatim AT-event citations follow the same re-consent discipline.

### §2-tris — Trustee Panel approval BEFORE recruitment

(Inheriting Story 0.9 §2-tris discipline as a **disability-context precondition**.)

The workflow:

1. Solo Builder presents the framework + ethics-protocol + interview-protocol + recruitment-path candidates + travel-reimbursement budget + time-stipend proposal + UX-DR clause-evaluation worksheet to Trustee Panel.
2. Trustee Panel votes approval OR provides `revision-list-pending-approval`.
3. **Approval is recorded as the first row** in `trustee-review-log.md` with verdict `approved-for-recruitment` + named approving trustees + date + `revision_list` (if applicable) **co-signed by trustee via `.decision-log.md` sub-entry** per Story 0.9 P-10 precedent.
4. **Solo Builder begins recruitment ONLY after the approval row exists.**

Per Story 0.9 D-06 precedent: **broad trustee approval covers all four enumerated recruitment paths broadly** — no re-approval is needed for path-change between approval and recruitment, as long as the path stays within the enumerated set.

Quorum-unavailable fallback: emergency approval by Trustee Panel chair valid under documented trustee incapacitation, time-bounded **30 days**, recorded with `emergency_approval_expiry_date` + `second_trustee_re_review_required = true` per Story 0.9 D-02 precedent.

### §2-quater — Hindi-comprehension pre-check

(Inheriting Story 0.9 D-07 review-decision; D-05 review-patch: Solo Builder conducts pre-check alone.)

- **Eligibility is restricted to Hindi-comprehensible participants.**
- Pre-check conducted via **phone screening by Solo Builder only, before consent-form presentation. Trustee must NOT be present, listening, or otherwise informed of the participant's identity or screening outcome beyond the pseudonymized `hindi_comprehension_pre_check_outcome` field in `recruitment-log.md`** — to preserve the §8 trustee identity-isolation discipline.
- If the participant is Bhojpuri-only or other-language-only, the recruitment-log row is marked `hindi-comprehension-pre-check-failed-not-eligible` and a substitute participant is recruited per the same disability-network paths.
- Hindi-Bhojpuri blend is permitted (researcher accommodates per §3.2) — only fully-Bhojpuri-only or other-language-only is deflected at pre-check.

## §3 — Conduct standards

### §3.0 — Disability-context recruitment discipline

(Inheriting Story 0.9 §3.0.)

- **Cold recruitment via cold-call / cold-visit / cold-text is FORBIDDEN.**
- Recruitment is exclusively via disability-network-mediated paths enumerated in README §3 + `interview-protocol.md` §0:
  - **Bihar disability network** — National Federation of the Blind Bihar chapter / NAB Bihar / analogous
  - **School-inclusion network** — Vaishali district govt-aided inclusion programmes
  - **Bihar State Welfare Board for Persons with Disabilities** or analogous govt welfare body
  - **Trustee referral** leveraging trustee personal-network
  - **Hindi-language disability NGO referral** if such with appropriate ethical standing exists
- **TWT operational referrals NOT APPLICABLE** because TWT has not yet operated (will revisit at NFR-22 Phase-2 audit when TWT has operational history).

### §3.1 — Session duration + surface coverage

- **≥60-minute session duration.** Shorter is permitted only if:
  - participant withdraws,
  - AT-pre-flight failure-mode surfaces mid-session,
  - external interruption ends the session early.
  All shorter-than-60 cases are logged in per-session note with reason.
- **Surface coverage minimum: 2 of 3 named prototype surfaces** (signup + My Pool + Yogdaan Bahi) per Story 0.9 D-01 review-decision applied to natural-close sessions. ≥60-min natural close covering fewer than 2 surfaces triggers substitute-participant recruitment.
- **AT-pre-flight partial-failure interaction:** if AT-pre-flight has already excluded 1 surface (marked `partial-operability-N-of-3-surfaces`), the 2-of-3 minimum is assessed against the **remaining operable surfaces only**. A ≥60-min natural-close session covering both of the 2 operable surfaces satisfies the minimum. The excluded surface is recorded as `not-evaluated-due-to-prototype-surface-coverage-gap` a priori — it does NOT trigger substitute recruitment (the AT-pre-flight exclusion already accounts for it).
- **Substitute-participant recruitment time bound:** substitute recruitment triggered by a sub-60-min session or fewer-than-2-surface closure begins a **60-day recruitment window from the triggering session date**. If no substitute is recruited within 60 days, formal escalation to Trustee Panel per README §8 slot 10.

### §3.2 — Hindi language

- Researcher speaks **Hindi throughout**.
- If participant prefers Bhojpuri / local dialect, that preference is **honored and noted** per Story 0.9 §3.2 precedent (Hindi-Bhojpuri blend permitted).
- Fully-Bhojpuri-only participants are deflected at §2-quater Hindi-comprehension pre-check.

### §3.3 — Participant's preferred setting

- **Researcher travels to participant's chosen setting.** Researcher does NOT propose location per Story 0.9 §3.3 precedent.
- Researcher pays for travel + assistive-aide-companion travel if requested.
- Candidate settings include: participant's home / disability-org office / accessible public location / trustee-mediated neutral location.

### §3.4 — Power-differential mitigation + reasonable-accommodation discipline

(P0-2c-distinct extension of Story 0.9 §3.4.)

- Researcher does NOT use authority register.
- Researcher uses **witnessing register** inheriting Story 0.9 §3.4.
- Researcher **accommodates participant's setting preferences without negotiation**.
- Researcher **provides large-print Hindi consent if requested**.
- Researcher **reads consent aloud if requested**.
- Researcher **waits ≥5 seconds before filling silence** (inheriting Story 0.9's bereavement-context pacing extension — longer than Story 0.8's ≥3-second wait because disability-context AT navigation often requires longer pauses).
- Researcher does NOT signal expected verdict through leading prompts during UX-DR clause-evaluation per §3.7.

### §3.5 — Recording-or-notes discipline

- **Participant chooses.** Researcher's default-offer is **detailed notes + screen-recording-of-prototype-surfaces** (less invasive than audio).
- Audio recording is permitted only with **explicit reconfirmation at start of session AND right-to-pause-recording reaffirmed mid-session**.
- Per Story 0.9 P-18 review-patch precedent: **device failure mid-session defaults to notes-only with verbal reconfirmation** to participant.

### §3.6 — Question-bank usage

- The question bank is a **prompt list, NOT a script**.
- Researcher uses prompts as conversation starters between surface walkthroughs, not as a fixed sequence.
- **Participant-initiated topics that fall outside the four AC-named dimensions are followed and noted** as potential dimension extensions.
- **Anti-leading carve-out** per Story 0.9 P-05: §1-§4 prompts MUST NOT pre-frame TWT-specific UX categories; §5-§6-§7 prompts necessarily introduce TWT-specific content but are opt-in mid- or late-session per §3.7.

### §3.7 — UX-DR clause-evaluation worksheet presentation is opt-in mid-session

(Inheriting Story 0.9 §3.7 precedent.)

- Researcher offers the UX-DR clause-evaluation review **only after AT walkthrough across at least 1 surface is complete** AND **only if the participant opts in to seeing specific clause text**.
- The offer wording:

  > *"Hum kuch design rules likhe hain — accessibility ke baare mein. Agar aap chahen, hum kuch dikha sakte hain aur poochh sakte hain ki kya woh aapke experience ke saath match karte hain. Par agar aap aaram se nahin hain to bilkul zaroori nahin."*
  >
  > (Free translation: "We have written some design rules — about accessibility. If you wish, we can show you some and ask whether they match your experience. But if you aren't comfortable, it isn't necessary at all.")

- Participant may decline. Declined clauses are recorded as `not-evaluated-due-to-participant-non-engagement` in the UX-DR clause-evaluation worksheet.

### §3.8 — AT-configuration-honored discipline (P0-2c-distinct)

- **Researcher does NOT prescribe, configure, modify, or troubleshoot the participant's AT setup.**
- If the participant's AT cannot interact with the prototype substrate at AT-pre-flight (fully blocking failure), the session does NOT proceed with that participant.
- **AT-pre-flight is a separate ≤15-min pre-flight session conducted before the ≥60-min session is scheduled** — verifies the participant's screen reader / magnification / voice control can navigate the prototype substrate per Story 0.14 P0-5 ratify decision.
- AT-pre-flight outcomes are recorded in `recruitment-log.md` per the schema:
  - `prototype-operable-with-participant-at-config` — proceed to ≥60-min session
  - `partial-operability-N-of-3-surfaces` — proceed; inaccessible surface(s) marked `not-evaluated-due-to-prototype-surface-coverage-gap` in the worksheet
  - `at-pre-flight-blocking-failure-unable-to-proceed` — recruit substitute participant per disability-network paths
- **Partial AT-pre-flight failures** (one surface inaccessible) proceed to the ≥60-min session with the inaccessible surface marked `not-evaluated-due-to-prototype-surface-coverage-gap` in the UX-DR clause-evaluation worksheet + flagged in the divergence-log.

### §3.9 — Distress-or-frustration mid-session pause

(Inheriting Story 0.9 P-19 review-patch precedent applied to disability-context.)

- If the participant shows frustration or distress with AT failure during the walkthrough:
  - Researcher **immediately pauses the surface walkthrough**.
  - Researcher offers to **switch surfaces or continue with conversational dimensions**.
  - Researcher marks remaining clauses `not-evaluated-due-to-participant-emotional-state`.

## §4 — Identity protection

- **Pseudonymization rule:** every artifact references the participant as `VI-Member-1` per recruitment-log assignment. Substitute pseudonym `VI-Member-1A` available for post-synthesis-withdrawal substitution per Story 0.9 P-07 review-patch precedent.
- **Demographic context** preserved at **district-level granularity** — `Bihar district <slug>` — never village-level + never block-level.
- **Disability category** preserved at **WHO-ICF visual-impairment-level granularity** — `visually-impaired` or `low-vision` — never specific etiology (e.g., specific genetic condition or specific cause) if disclosure would identify.
- **Verbatim quotes** are permitted only per the §2-bis re-consent-for-quotation discipline.
- The substantive **name-to-pseudonym mapping** is **NDA territory** per the Story 0.6 + 0.7 + 0.8 + 0.9 need-to-know discipline — **stored out-of-band per operations policy, NOT in the framework directory**. The framework-directory `recruitment-log.md` carries pseudonyms + recruitment-paths + dates + outcome-fields ONLY.
- **Signed consent form storage (D-04 review-patch):** the signed consent form (whether handwritten-signature or thumbprint-with-witness-co-signature) is **retained by Solo Builder in out-of-band secure storage only** — the same physical/digital location as the substantive name-and-contact roster. The signed consent form **MUST NOT be filed in the framework directory** (`session-notes/`, `session-notes/archived/`, or any other subdirectory), because it contains the participant's real name or thumbprint. Only the pseudonymized receipt (`consent_obtained_date` + `consent_type` + `consent_format` fields in `recruitment-log.md`) enters the framework directory. Post-consent pre-session withdrawal: the out-of-band form is marked `withdrawn-pre-session`; the withdrawal-audit function is served by the `recruitment-log.md` `withdrawal_status = withdrawn-before-session` field.

## §5 — Withdrawal procedure

Participant may withdraw at any time per Story 0.9 §5 precedent. Five lifecycle variants:

1. **Withdrawal before session.** Per-session note marked `withdrawn`; content destroyed; raw recording destroyed if applicable.
2. **Withdrawal during session.** Researcher stops immediately; partial per-session note marked `withdrawn-mid-session`; participant's preference is honored — three sub-options: (a) **destroy content** — all partial session data destroyed; (b) **retain partial content for participant's own benefit** — content retained in anonymized form for own study of AT behavior, not for synthesis; (c) **retain content under modified consent** — participant specifies which portions may be used. Sub-option is recorded in `withdrawal_status` field.
3. **Withdrawal after session, before synthesis.** Per-session note marked `withdrawn`; content destroyed; raw recording destroyed; **signed consent form retained as withdrawal audit record** per Story 0.9 P-17 precedent (out-of-band; only `withdrawal_status = withdrawn-before-synthesis` enters framework directory); substitute pseudonym `VI-Member-1A` assigned if substitute participant recruited.
4. **Withdrawal after synthesis.** Synthesis suspended as a unit — the entire synthesis file is marked with a `_SUSPENDED_PENDING_SUBSTITUTE_VI-Member-1A_` header (D-03 review-patch: the 62-cell verdict matrix is not a row structure; blanking individual rows is undefined; suspension as a unit is the correct operation). The suspended synthesis is archived and a substitute participant's session re-runs from scratch. Substitute pseudonym `VI-Member-1A` assigned. Recruitment-log `withdrawal_status = withdrawn-after-synthesis`.
5. **Granular withdrawal of specific quotation or AT-behavior observation post-synthesis** per §2-bis precedent. Specific quote or observation removed from synthesis + `quotation_log` row marked `re-consent-declined-participant-withdrew-quote` or `at-behavior-observation-withdrawn-YYYY-MM-DD`.

**Post-consent pre-session withdrawal:** the signed consent form is **retained as withdrawal audit record** per Story 0.9 P-17 precedent. Only session data/notes are destroyed; the consent form's existence and withdrawal-status are retained for trustee-audit visibility into withdrawal-rate.

## §6 — Post-synthesis data handling

- **Raw recording** (audio AND/OR screen-recording) — retained for **60 days** post-synthesis (disability-context default; Story 0.10) OR earlier on participant request; **destroyed after 60 days** (D-01 review-patch: destruction policy, not archival); only the per-session note + synthesis remain.
- **Per-session note** — archived in `session-notes/archived/` subdirectory after **6 months** for cross-reference + further synthesis revision per Story 0.9 P-13 + P-04 precedent. Wording: "retained for 6 months, then archived (not destroyed) in `session-notes/archived/` subdirectory unless participant requests immediate destruction."
- **Recruitment-log (framework-directory copy)** — retained in framework directory as pseudonymized audit trail (pseudonyms + recruitment-paths + dates + outcome-fields only). The **substantive name-to-pseudonym mapping** is retained out-of-band per operations policy as NDA territory (P-30 review-patch: "out-of-band" applies to the substantive identity mapping only, NOT to the pseudonymized framework-directory log itself).
- **Synthesis file** — retained **indefinitely** as the research artifact.
- **UX-DR clause-evaluation worksheet** — retained as the research artifact alongside the synthesis.
- **Divergence-log + trustee-review-log** — retained indefinitely as audit trail.

## §7 — Researcher boundaries

- Researcher is **Solo Builder (BigDev), NOT a trained ethnographer or accessibility-research specialist or disability-rights advocate**. Limitations acknowledged + disability-context limitation acknowledged explicitly in the per-session note + synthesis.
- Researcher does NOT diagnose participant's disability or AT setup quality.
- Researcher does NOT solicit personal disability narratives beyond what the participant voluntarily shares.
- **Researcher offers warm acknowledgment of accessibility friction without expressing pity or attempting to "fix" the participant's AT setup** — the witnessing register inheriting Story 0.9 §7.
- Researcher does NOT recommend TWT or any other product during the session.
- Researcher does NOT offer counseling, referrals, or post-session follow-up beyond pre-agreed re-consent-for-quotation contact.
- **Researcher does NOT modify participant's AT configuration per §3.8** (P0-2c-distinct boundary).

## §8 — Trustee review boundary

- **Trustee review verifies:** dimension coverage + UX-DR clause-evaluation completeness + accessibility-debt-classification application + divergence-log completeness + synthesis grounding in per-session citation + re-consent-for-quotation compliance (every verbatim quote in synthesis carries `[quote-re-confirmed YYYY-MM-DD]` marker).
- **Trustee does NOT re-conduct the session.**
- **Trustee does NOT have access to substantive identity** in recruitment-log per Identity Protection §4 — only pseudonym-to-recruitment-path mapping is in the framework-directory log; substantive identity is out-of-band per operations policy.
- **Trustee receives:** synthesis + per-session note + divergence-log + UX-DR-clause-evaluation-worksheet + recruitment-log-by-pseudonym only.
- **Per Story 0.9 P-10 precedent:** `revision_list` (if applicable to a `accepted-with-revisions` or pre-session `revision-list-pending-approval` verdict) is **countersigned by the reviewing trustee via a `.decision-log.md` sub-entry** to make the revision-list scope auditable.
- **Per Story 0.9 P-23 precedent:** `rejected-pending-rework` verdicts carry a `rework_scope` field — `synthesis-only` (re-engage Tasks 9-10) vs `full-pre-session-cycle` (re-engage Tasks 7-10 because rejection identifies fundamental ethics/interview-protocol defect).
