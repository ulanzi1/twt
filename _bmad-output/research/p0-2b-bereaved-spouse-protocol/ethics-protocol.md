# Ethics Protocol — P0-2b Bereaved-Spouse Conversation

**Authority:** UX-DR5 (epics line 375) · UX §Phase-0 P0-2 (UX spec lines 101-105) · DPDPA member-data principles by analogy · architecture §1.5 PII shielding by analogy · UX Stance #4 grief-is-held (UX spec line 295) + Stance #6 staff-fallback obligation by analogy + Stance #7 grief-aware design for Ravi and Sunita (UX spec line 129) · UX spec §Held-ness Under Grief (UX spec line 315 — the system witnesses, not bailiff) — research-conduct register inherits the system's design register · Story 0.6 engineer-roster need-to-know discipline · Story 0.7 rota contact-identity NDA pattern · Story 0.8 ethics-protocol §1 precedent

**Scope:** Ethics commitments binding the conduct of 1 bereaved-spouse conversation in Vaishali district (TSCT or comparable claim-process precedent) per Story 0.9, with bereavement-context escalations (§2-bis re-consent-for-quotation + §2-tris trustee-approval-pre-recruitment + §3.0 bereavement-context recruitment discipline + §3.7 opt-in Pattern 4 sample-copy mid-interview presentation) distinct from Story 0.8 Shikshakamitra interviews.

---

## §1 Authority cites

| Cite | Source | Authority weight |
|---|---|---|
| Informed consent + identity protection + withdrawal-right principles | DPDPA member-data principles by analogy + research-ethics general practice (cite intentionally non-specific to a single ethics-board jurisdiction — Solo Builder is not affiliated with a formal IRB, so the protocol commits the *property* of those principles without claiming IRB certification) | Authoritative for protocol shape |
| PII shielding default | Architecture §1.5 (TWT member-PII shielding) | Authoritative by analogy — research participants are not TWT members but the shielding grammar is inherited |
| **Grief-aware register inheritance** — the system's "held-not-processed" + "witness-not-bailiff" + "fursat cadence" register applies to research conduct itself | UX spec §0 Stance #4 (UX spec line 295) + Stance #7 (UX spec line 129) + §Held-ness Under Grief (UX spec line 315) + grief-frame table (UX spec line 390) | **Authoritative as the framework-conduct register** — bereavement-context distinct from Story 0.8 where peer-register inheritance was sufficient |
| Need-to-know identity discipline | Story 0.6 engineer-roster + Story 0.7 rota + Story 0.8 Shikshakamitra | Direct precedent inherited |
| Researcher boundary | UX §External Validation Pending UX Researcher (architecture lines 4855-4859: "Engineering analytics alone cannot surface bereavement-flow friction") | Solo Builder acknowledged as untrained ethnographer + untrained grief counselor; bereavement-context limitations declared in §7 |
| **Bereavement-context recruitment escalation** | Research-ethics general practice — bereaved populations require trustee-mediated recruitment to mitigate vulnerability + power-differential | Authoritative for §3.0 cold-recruitment-forbidden rule |
| **Re-consent for quotation escalation** | Research-ethics general practice — bereavement-context speech requires per-quote re-confirmation to honor the spouse's authority over their own grief narrative | Authoritative for §2-bis discipline |
| **Trustee approval pre-recruitment escalation** | Story 0.6 trustee-authorization-pre-engagement precedent + bereavement-context vulnerability | Authoritative for §2-tris precondition |

---

## §2 Informed consent procedure

Informed consent is presented in Hindi at the start of the conversation. The consent form (Hindi-primary at `informed-consent-template-hindi.md`; English mirror at `informed-consent-template-english.md`) covers:

### (a) Participation purpose

"Aap is baatcheet mein iss liye shaamil ho rahe hain ki Bihar ke shikshakon ke liye ek welfare trust (TWT) banaya ja raha hai, aur jab kisi shikshak ke ghar mein kuch hota hai, parivar ko sahara dene ka tareeka theek se banaya ja sake — is mein aapke jaisa anubhav rakhne wale logon se humein seekhna zaroori hai. Aap TWT ke sadasya nahin ban rahe; aap se kuch khareedne ya kisi tarah ki seva mein judne ki maang nahin hai. Main aapke samay ka shukriya karta hoon."

(English: "You are part of this conversation because we are building a welfare trust for Bihar teachers (TWT), and to design the way a family is supported when something happens at a teacher's home, we need to learn from people who have lived this experience. You are not becoming a TWT member; we are not asking you to buy anything or commit to any service. I thank you for your time.")

### (b) What data is collected

- Conversation content (paraphrased; verbatim only via §2-bis re-consent rule)
- Demographic context at district-level granularity (age band; gender; relation to deceased; years since claim event; household composition at non-identifying granularity; claim-trust-precedent slug — TSCT / comparable-Bihar-trust / comparable-other-trust — NOT specific trust name if disclosure would identify the spouse)
- NOT collected: village name; block-level slug if identifying; school-name of deceased; specific named family members; specific identifying incidents beyond what the spouse voluntarily shares

### (c) What is recorded

The participant chooses between:
- **Audio recording** — researcher records the conversation on a phone or dedicated recorder; participant can pause recording at any time; recording is stored securely per §6.
- **Notes only** — researcher takes notes during the conversation; no audio captured. This is the researcher's *default preference* (less invasive per §3.5 + bereavement-context default).

The choice is the spouse's. Researcher does not pressure either way. Verbal reconfirmation of recording consent is required at the start of every recorded session AND mid-session (right to pause recording reaffirmed mid-interview).

### (d) How identity is protected

- Pseudonymization across all artifacts: every reference to the participant uses `Bereaved-Spouse-1`.
- Demographic context preserved at non-identifying granularity (district-level slug, NOT village-level; claim-trust-precedent slug, NOT specific trust name if identifying; age band, not exact age; years since claim event, not exact claim date).
- Substantive name + contact data is stored out-of-band per §4 — never inlined in synthesis, per-interview note, divergence-log, or any framework artifact.
- **Verbatim quotes are permitted only per §2-bis re-consent rule** — no verbatim without per-quote re-confirmation.

### (e) Data retention

- Raw recording (if audio chosen): **retained for 30 days post-synthesis-author-commit, then destroyed**; OR destroyed immediately on participant request per §5. **Bereavement-context shortened default** distinct from Story 0.8's 90-day retention.
- Per-interview note (pseudonymized): retained in protocol directory under pseudonymized identity for **6 months** for cross-reference + further synthesis revision, then **archived (not destroyed) in `interview-notes/archived/`** with an `[archived-YYYY-MM-DD]` marker per §6. **Bereavement-context shortened default** distinct from Story 0.8's 12-month retention.
- Recruitment-log (with substantive name-to-pseudonym mapping in out-of-band storage): retained per operations policy; substantive identity data is access-controlled to Solo Builder + Trustee Panel chair per need-to-know basis.
- Synthesis file (`_bmad-output/research/p0-2b-bereaved-spouse.md`): retained indefinitely as the research artifact.

### (f) Right to withdraw

The participant may withdraw at any time — before, during, or after the conversation. Withdrawal procedures per §5, including **granular withdrawal of specific quotation post-synthesis** per §2-bis re-consent rule (the spouse may consent to the synthesis broadly while withdrawing a specific quote).

### (g) Compensation

- **Bereavement-context default is no-compensation.** Research participation is not a transaction; the spouse's voluntary participation is honored as such.
- Researcher may offer modest reimbursement for travel + time only if the participant has traveled to a non-home location OR has taken paid leave to attend (e.g., ₹100-300 range, ADR-deferred per README §8 ADR slot 1).
- Reimbursement is NOT contingent on specific findings, NOT contingent on TWT join-ask, NOT contingent on referral-ask.
- Reimbursement may be declined by participant without affecting participation acceptance.

### (h) No obligation to TWT

The participant has NO obligation to TWT post-conversation. Specifically:
- The participant is NOT asked to join TWT as a member.
- The participant is NOT asked to refer colleagues to TWT.
- The participant is NOT asked to use any TWT surface post-conversation.
- The participant is NOT entered into any TWT mailing list or contact registry.
- The participant is NOT asked to provide ongoing access or follow-up beyond the pre-agreed re-consent-for-quotation contact (if §2-bis opt-in is checked).

**Verbal consent reaffirmation:** before any recording begins, researcher asks (in Hindi): "Kya aap is baatcheet ko start karne ke liye taiyar hain? Kya aap chahte hain ki main audio record karoon ya sirf notes likhoon? Aap kabhi bhi ruk sakte hain, savaal pooch sakte hain, ya jaa sakte hain. Aap ko kuch kehna hai jo aap nahin chahte ki main note karoon, to mujhe bata dijiye."

**Illiterate-participant alternative (P-14):** If the participant is unable to sign the consent form (illiterate or physically unable to write), a thumbprint in lieu of signature is acceptable. Researcher writes "Consented by thumbprint" next to the mark and verbally reconfirms consent aloud with the participant before the thumbprint is taken. This is recorded in the per-interview note metadata.

**Verbal-only consent alternative (D-03 — edge case):** If the participant declines to sign but confirms willingness verbally, researcher **explicitly confirms consent aloud before any note-taking begins** and records "Verbal consent given — participant declined to sign" in the per-interview note. The conversation is treated as informational only: no verbatim notes are taken; notes are destroyed immediately after; the conversation is NOT cited as research in the synthesis. This path is rare; typically participants willing to engage are willing to sign after the consent form is explained.

**Principal-only consent (D-04):** Only the bereaved spouse (the research participant, `Bereaved-Spouse-1`) may provide consent. Guardian proxy signing on the spouse's behalf is NOT permitted. No family member, community elder, or trustee intermediary may sign the consent form in place of the participant.

---

## §2-bis Re-consent for direct quotation

**P0-2b-distinct discipline** (not present in Story 0.8 which permits default-quotation-with-consent).

No verbatim quotation is included in any artifact (per-interview note, synthesis, divergence-log, framework documentation) unless **specifically re-confirmed at the quote in question**. The workflow:

1. **In conversation:** researcher hears the spouse's words mid-conversation; researcher does NOT directly transcribe verbatim into notes (paraphrase only); researcher silently flags noteworthy phrasings mentally.
2. **In per-interview note (within 24 hours of conversation):** researcher paraphrases all observations; if the researcher believes verbatim is essential for synthesis fidelity, researcher records the candidate verbatim in a `quotation_log` table within the per-interview note with status `re-consent-pending`.
3. **At synthesis authoring (Task 9):** if Solo Builder believes verbatim is essential for a synthesis row, researcher routes a re-consent request to the spouse via the trustee-mediated channel (the spouse's pre-agreed contact path documented in the informed-consent form §2-bis checkbox — typically through a trustee intermediary, NOT direct contact unless explicitly authorized by the spouse).
4. **Re-consent request format:** the researcher sends the proposed quote (in Hindi) + the synthesis context (where the quote will appear + the synthesis row it supports) + a checkbox: "Yeh shabd publish kiye ja sakte hain" / "Yeh shabd nahin publish kiye ja sakte hain — paraphrase use kiya jaye".
5. **Re-consent receipt:** the spouse's response is recorded in the `quotation_log` table within the per-interview note + in the recruitment-log `quotation_re-consent_engagement` column.
6. **Only re-confirmed quotes appear in synthesis or framework artifacts.** Re-confirmed quotes carry a `[quote-re-confirmed YYYY-MM-DD]` marker. Any synthesis or framework artifact containing a quote without the marker is a framework defect requiring immediate correction.
7. **Re-consent decline is honored without question.** If the spouse declines re-consent for a specific quote, the synthesis uses the paraphrase only; the spouse's authority over their own grief narrative is irreducible.
8. **Re-consent opt-in is opt-in by default per informed-consent §2-bis checkbox.** If the spouse does not opt in to the re-consent-for-quotation contact, the researcher does NOT contact the spouse post-conversation for quote re-consent and no verbatim quotes are included in any artifact (paraphrase-only synthesis).
9. **30-day fallback timeout:** If the researcher routes a re-consent request and receives no response from the spouse within 30 days, the request is treated as declined — the synthesis uses paraphrase only for that quote. The 30-day clock starts at the date the re-consent request is sent via the trustee intermediary channel.

**Granular quotation-withdrawal post-synthesis:** the spouse may consent to the synthesis broadly while withdrawing a specific quote at any later date via the trustee-mediated channel. The quote is removed + paraphrased in supersession per §5 withdrawal logic.

---

## §2-tris Trustee Panel approval BEFORE recruitment

**P0-2b-distinct precondition** (not present in Story 0.8 which begins with recruitment).

Bereavement-context vulnerability requires Trustee Panel formal approval BEFORE Solo Builder approaches any candidate. The workflow:

1. **Solo Builder presents the framework to Trustee Panel:** the framework (this directory) + ethics-protocol (this file) + interview-protocol + pattern-4-evaluation-worksheet + recruitment-path candidates (specific TSCT trustee contacts, Trustee Panel personal-network contacts, BSWLB contact channels, Bihar grief-support NGO contact channels — at the level of recruitment-path identification, NOT specific candidate names).
2. **Trustee Panel reviews:** Trustee Panel reviews the framework + the proposed recruitment paths + the bereavement-context discipline (§3.0); Trustee Panel may request revisions to ethics-protocol / interview-protocol / Pattern 4 worksheet before approval.
3. **Trustee Panel votes approval:** verdict ∈ {`approved-for-recruitment`, `revision-list-pending-approval`}; approval requires named trustees (≥1 trustee; ≥2 strongly preferred for sensitivity). **Broad approval scope (D-06):** The approval covers all four enumerated recruitment paths (TSCT trustee referral, Trustee Panel personal-network referral, BSWLB referral, Bihar grief-support NGO referral) generically — a single `approved-for-recruitment` verdict authorizes use of any of these paths without requiring a separate approval per path, unless the Trustee Panel explicitly restricts scope in the `sign-off_note`.
4. **Approval recorded as the first row in trustee-review-log.md:** `review_id` = `pre-conversation-001`; `review_date` = approval date; `reviewing_trustee` = named approving trustees; `review_scope` = `approval-for-recruitment-pre-conversation`; `review_verdict` = `approved-for-recruitment` (or `revision-list-pending-approval` if revisions required); `sign-off_note` = explicit "Recruitment may begin" attestation.
5. **Solo Builder begins recruitment ONLY after the approval row exists.** Any recruitment activity before the approval row exists is a framework defect.
6. **If revisions required:** Solo Builder revises the framework per the revision_list; re-presents; Trustee Panel re-reviews; approval lifecycle iterates until `approved-for-recruitment` verdict. The revision list must be counter-signed by the requesting trustee(s) on the trustee-review-log row before the `revision-list-pending-approval` row is considered closed (P-10).
7. **Trustee Panel approval is recorded in `.decision-log.md` as a follow-up Decision 2026-05-30-009-trustee-approval entry per the Story 0.8 trustee-review-N supersession schema.**

The pre-conversation approval is a *separate* gate from the post-synthesis trustee review (Task 10). The same trustee(s) may grant both, but the two reviews are recorded as distinct trustee-review-log rows with different `review_scope` values.

---

## §3 Conduct standards

### §3.0 Bereavement-context recruitment discipline

**P0-2b-distinct rule** (not present in Story 0.8 which permits cold outreach via official directories).

The bereaved spouse is in a vulnerable population. Recruitment via cold outreach is **FORBIDDEN**. Specifically:

- **Cold-call FORBIDDEN.** Researcher does NOT cold-call any candidate identified without trustee-mediated introduction.
- **Cold-visit FORBIDDEN.** Researcher does NOT visit any candidate's home without trustee-mediated introduction + scheduled appointment.
- **Cold-text FORBIDDEN.** Researcher does NOT send WhatsApp / SMS / email to any candidate without trustee-mediated introduction.
- **Trustee-mediated paths only:** recruitment is exclusively via the paths enumerated in README §3 (TSCT trustee referral + Trustee Panel personal-network referral + Bihar Widow Welfare Board referral + Bihar grief-support NGO referral).
- **TWT operational referrals NOT APPLICABLE:** TWT has not yet operated, so no TWT operational referral path exists.
- **Researcher's personal-network referrals FORBIDDEN:** bias toward respondents who share researcher demographic markers + the personal-network discipline is inappropriate for bereavement-context research.

If no trustee-mediated path identifies a willing candidate within the launch window, the framework's escalation path is to Trustee Panel: Trustee Panel may approve expanded recruitment paths (e.g., a Bihar academic researcher with bereavement-context research experience as an intermediary) via a follow-up trustee-review-log row + Decision-log supersession entry.

**90-day recruitment window (D-05):** If no trustee-mediated path identifies a willing candidate within **90 days of the first `approved-for-recruitment` trustee-review-log row**, a formal escalation meeting with the Trustee Panel is required. The escalation meeting reviews whether the recruitment paths should be expanded, whether the framework should be revised to increase accessibility to bereaved-spouse candidates, or whether the recruitment window should be formally extended. The 90-day clock starts at the date of the first `approved-for-recruitment` row.

### §3.1 Duration ≥60 minutes

The conversation is ≥60 minutes (distinct from Story 0.8's ≥45 minutes — bereavement-context warm-up + spouse-led pacing requires more time). Shorter duration is permitted only if:
- Participant withdraws mid-session (per §5 — conversation ends; per-interview note marked accordingly).
- External interruption ends the session early (e.g., family member needs attention, participant emotionally overwhelmed) — per-interview note records the interruption + the session is rescheduled with same-participant continuation OR marked complete with partial coverage gap-flagged. **An externally-interrupted session counts toward the 1-participant minimum if ≥3 of the 5 AC-named dimensions have substantive observations in the per-interview note.** If fewer than 3 dimensions are covered and the spouse declines to reschedule, a substitute spouse is recruited per ethics-protocol §5 withdrawal logic + §2-tris trustee-approval refresh (new substitute requires trustee approval refresh — but a streamlined re-approval per the Trustee Panel chair fallback in README §5 is acceptable to avoid recruiting delay).

Researcher does NOT artificially extend a conversation past natural close to reach 60 minutes; if the conversation reaches natural close at 52 minutes with rich dimension coverage, that is logged + the session is closed.

**Natural-close 3-dimension rule (D-01):** If the conversation reaches natural close with fewer than 3 of the 5 AC-named dimensions having substantive observations, the same substitute-or-reschedule logic applies as for externally-interrupted sessions — the session may be rescheduled with the same participant OR a substitute spouse recruited per §5 withdrawal logic + §2-tris trustee-approval refresh, at the researcher's judgment in consultation with the trustee intermediary. If the spouse declines to reschedule and fewer than 3 dimensions are covered at natural close, the participant is treated equivalently to a mid-session withdrawal for the purposes of 1-participant-minimum accounting.

### §3.2 Hindi language

**Hindi-comprehension pre-check (D-07):** Before presenting the consent form, researcher confirms that the participant can understand spoken Hindi at a conversational level. If the participant indicates they cannot understand Hindi, the conversation does not proceed — participation is restricted to Hindi-comprehensible spouses per the field-work design (UX §Phase-0 P0-2 Hindi-conduct commitment). Researcher records `hindi_comprehension = confirmed` or `hindi_comprehension = not-confirmed-conversation-did-not-proceed` in the per-interview note metadata.

Researcher speaks Hindi throughout. If participant prefers English / Bhojpuri / local dialect, that preference is honored:
- **English preference:** researcher accommodates; informed-consent-template-english.md is used; per-interview note language_used column records "English at participant preference".
- **Bhojpuri / local dialect:** researcher uses whatever Hindi-Bhojpuri blend participant naturally uses; researcher does NOT artificially shift register to match participant; per-interview note language_used column records the dialect mix.
- **Code-switching:** common in Bihar; researcher records language_used as "Hindi with English code-switching as participant uses it".

### §3.3 Spouse's preferred setting

The researcher travels to the spouse's chosen setting. **Researcher does NOT propose the setting** — the spouse's choice is honored without negotiation per §3.4 power-differential mitigation. Candidate settings the spouse may identify (presented as a brief mention if asked, NOT prescribed):
- Participant's home
- Family courtyard / verandah
- Village square / panchayat bhawan
- Trustee-mediated neutral location (e.g., a community hall at the trustee intermediary's suggestion)
- Any other setting the participant prefers

Researcher does NOT propose a researcher-convenient location. This is bereavement-context power-differential mitigation per §3.4 — researcher accommodates participant absolutely.

If participant proposes a setting with privacy concerns (e.g., crowded courtyard during a family event), researcher gently raises the concern + offers alternatives but defers to participant's choice. Per-interview note records setting_type + privacy_observation if applicable.

### §3.4 Power-differential mitigation + bereavement-context register

The researcher is Solo Builder — a software developer building a welfare trust. The participant is a bereaved spouse — someone who has been through a death-benefit claim process. This is a power differential the researcher must actively mitigate, **and the bereavement-context register escalates Story 0.8's peer-register to a witnessing register** per UX spec line 67 + 295 + 315.

**Researcher does:**
- Use **witnessing register** (P0-2b-distinct extension of Story 0.8 peer-register): "Main TWT ka kaam kar raha hoon — main aapke samay ka shukriya karta hoon. Aap jab tak chahein, jitni baat karna chahein — main sun raha hoon. Aap jo bhi batayein, woh sahi hai." The researcher's posture is the *witness* who is listening, not the *bailiff* who is questioning.
- Offer **warm acknowledgment of grief without expressing pity or attempting consolation**: "Aapke saath jo hua, mujhe iska gehra dukh hai. Main yahaan aapse seekhne ke liye hoon — kisi bhi tarah ki advise ya counseling ke liye nahin." The acknowledgment is the witnessing register; pity is the comforting register (researcher avoids); consolation attempt is the counselor register (researcher avoids per §7 boundary).
- Sit at the participant's eye level (not standing over them or sitting on a higher chair).
- **Wait ≥5 seconds before filling participant silence** (extended from Story 0.8's ≥3 seconds — bereavement-context pacing extension).
- Reaffirm participant's authority over the conversation: "Aap jo bhi batana chahein, jitni gehrai mein chahein — main sun raha hoon. Aap kuch bhi nahin batana chahein, woh bhi theek hai."
- Acknowledge limitations: "Main koi grief counselor nahin hoon, na hi koi specialist hoon. Mujhe sirf aapke anubhav se seekhna hai."
- Allow extended warm-up (5-10 minutes of non-sensitive conversation per interview-protocol §2, vs Story 0.8's 2-3 minutes) before engaging dimension prompts.

**Researcher does NOT:**
- Use authority register: "Sir / Madam / Madam-ji" formality directed at the participant (Hindi *aap* is appropriate; English *sir/madam* signals authority distance).
- Wear formal attire that signals institutional authority (researcher wears plain comfortable clothes; no clipboard ostentation; no recording equipment displayed before consent).
- Signal expected answer through leading questions (forbidden per §3.6).
- Correct participant statements that contradict PRD/UX assumptions (those go into divergence-log + assumption-inventory `validation_status` updates).
- **Initiate grief topics** (P0-2b-distinct rule per §3.6 — spouse leads ALL bereavement-specific content depth).
- Express pity ("Hai re, kitna dukh hua aapko" — comforting register, forbidden).
- Attempt consolation ("Sab theek ho jayega" — counselor register, forbidden).
- Solicit specific incidents the participant has not voluntarily raised.

### §3.5 Recording-or-notes discipline

- Participant chooses (per §2 c).
- Researcher's *default preference* is detailed notes (less invasive; no audio storage; no transcription overhead; participant typically more candid; bereavement-context default is notes-only unless spouse explicitly opts in to audio).
- If recording is chosen: explicit reconfirmation at start of session + right to pause recording reaffirmed mid-session. If participant pauses recording, the pause-content is NOT retroactively recorded from memory. The pause is honored.
- If notes only: researcher writes notes during conversation but maintains eye contact + active listening; notes do not consume more than ~20% of session time.
- **Re-consent-for-quotation discipline (§2-bis) applies regardless of recording-or-notes choice** — no verbatim quotes in any artifact without per-quote re-confirmation. The recording (if any) is a researcher-internal aid for synthesis fidelity; it does NOT bypass the re-consent-for-quotation rule.
- **Device failure mid-interview (P-18):** If the recording device fails mid-interview, researcher immediately notifies the participant, switches to notes-only mode for the remainder of the session, and records the device-failure timestamp in the per-interview note. Content captured before the failure remains subject to the re-consent-for-quotation discipline. Content captured after the failure is notes-only. Researcher does NOT ask the participant to repeat prior statements.
- Per-interview note authored within 24 hours per §5 of interview-protocol.md.

### §3.6 Question-bank usage + spouse-led grief discipline

The question bank (`question-bank.md`) is a *prompt list*, NOT a script. Discipline:
- Researcher uses prompts as conversation starters, not as a fixed sequence.
- Participant-led order: participant may anchor on a specific dimension first; researcher follows their lead.
- Participant-initiated topics that fall outside the five AC-named dimensions are followed AND noted as potential dimension extensions (per-interview note dimension-6 cultural-grammar cross-cutting column or divergence-flag).
- Open-ended phrasing: open prompts let participants generate their own mental model.
- Anti-leading discipline: researcher does NOT pre-frame the answer; researcher does NOT lead participant toward TWT-specific scenarios; researcher does NOT introduce TWT-specific terminology ("fursat", "human shepherd", "dignified-vs-transactional", "Ravi-mode", "Sunita-mode") until participant has independently generated the concept; researcher lets participant define their own categories.
- **Researcher does NOT initiate grief topics** (P0-2b-distinct discipline distinct from Story 0.8 where dimension-5 grief is researcher-prompted-but-spouse-led; here ALL grief content is spouse-led-only). If the spouse does not voluntarily raise specific grief-experience content within a dimension, researcher does NOT prompt for it. The dimension may be marked partial-coverage in the per-interview note if the spouse declines to engage; this is honest research outcome, not failure.

### §3.7 Pattern 4 sample-copy presentation is opt-in mid-interview

**P0-2b-distinct discipline** (not present in Story 0.8 which has no sample-copy review).

The Pattern 4 evaluation (the AC's load-bearing surface) is opt-in mid-interview. Workflow:

1. **Researcher offers Pattern 4 sample-copy review only AFTER rapport is established** — typically mid-interview at earliest, after dimensions 1-3 have been substantively engaged AND the spouse has settled into the conversational pacing.
2. **Researcher offers the opt-in with explicit acknowledgment of optionality:** "TWT ki team ne kuch sample messages likhe hain — jo error ya problem ke time members ko dikhte hain. Agar aap chahen, hum kuch dikha sakte hain aur poochh sakte hain ki kya woh thik lagte hain ya behtar ho sakte hain — par agar aap aaram se nahin hain to bilkul zaroori nahin." (English: "TWT's team has written some sample messages that members see when there's an error or problem. If you'd like, we can show some and ask whether they feel right or could be better — but if you're not comfortable, it's absolutely not required.")
3. **Spouse may decline:** if spouse declines, all 8 sample-copy rows + 7 cross-cutting grief-grammar rows are marked `not-evaluated-due-to-spouse-non-engagement` in the Pattern 4 evaluation worksheet. This is an honest research outcome.
4. **Spouse may opt in partially:** spouse may opt in to some samples and decline others; per-sample verdicts are captured for opted-in samples; declined samples are marked `not-evaluated-due-to-spouse-non-engagement`.
5. **Sample-copy presentation format:** ADR-deferred per README §8 (printed cards vs spoken aloud vs phone-screen-shown vs paper-handout). The researcher presents in whichever format minimizes invasiveness for the spouse + maximizes comprehension.
6. **Cross-cutting grief-grammar prompts are §7 of the question-bank** — these are also opt-in, typically late-interview, distinct from §6 Pattern 4 sample-copy prompts.
7. **No spouse-initiated correction of researcher's framing during sample review.** The researcher captures spouse's verdict + paraphrased observation; the researcher does NOT defend the sample copy or argue for it. The spouse is the authority.

---

## §4 Identity protection

### Pseudonymization rule

Every artifact references the participant as `Bereaved-Spouse-1` per recruitment-log assignment.

### Demographic context granularity

Preserved at non-identifying granularity:
- **District-level slug:** "Bihar district <slug>" — NOT village-level + NOT block-level if disclosure would identify (e.g., a small block with few comparable bereavement cases would be identifying).
- **Claim-trust-precedent slug:** "TSCT" / "comparable-Bihar-trust" / "comparable-other-trust" — NOT specific trust name if disclosure would identify the spouse (TSCT named as a specific trust is permissible since TSCT has ~556 supported families per `tsct-reference-learnings.md`; a smaller trust may be too identifying).
- **Age band:** 30-40 / 41-50 / 51-60 / 60+ / 70+; never exact age.
- **Years since claim event:** integer year band; never exact claim date.
- **Relation to deceased:** "spouse" + named other family role if material to the conversation (e.g., "spouse, with adult son co-leading the claim") — never specific named family members.
- **Household composition:** "lives with [N] adult children" / "lives alone with extended-family support" — at non-identifying granularity.

### Verbatim quote discipline (per §2-bis)

Verbatim quotes are permitted ONLY via the §2-bis re-consent-for-quotation rule — re-confirmed quotes carry `[quote-re-confirmed YYYY-MM-DD]` marker. Quotes referencing specific named colleagues / specific schools / specific incidents / specific named family members are paraphrased regardless of re-consent status (the §2-bis re-consent permits the spouse's own words to be published; it does not extend to third-party named identity).

### Substantive name + contact storage out-of-band

The recruitment-log carries the substantive name-to-pseudonym mapping but is **NDA territory** per the Story 0.6 engineer-roster + Story 0.7 rota + Story 0.8 Shikshakamitra need-to-know discipline. Storage:
- Substantive name + contact data is stored out-of-band per operations policy, NOT in the framework directory.
- Access is controlled to Solo Builder + Trustee Panel chair per need-to-know basis.
- The framework directory's `recruitment-log.md` carries the pseudonym + recruitment-path + dates only.

---

## §5 Withdrawal procedure

The spouse may withdraw at any time. Withdrawal lifecycle variants:

### Before conversation
- Recruitment-log row marked `withdrawn-before-conversation`.
- No data has been collected; nothing to destroy.
- Substitute spouse recruited per the same trustee-mediated path; 1-participant minimum maintained; Trustee Panel chair fallback re-approval per README §5 acceptable to avoid recruiting delay.

### During conversation
- Conversation ends immediately when spouse signals withdrawal (verbally OR via body language indicating distress + spouse's affirmation when asked).
- Researcher does NOT continue or attempt to recover the session.
- Per-interview note marked `withdrawn-during-conversation` + content destroyed (notes shredded if physical; deleted if digital); raw recording destroyed if applicable.
- Recruitment-log row marked `withdrawn-during-conversation`.
- Substitute spouse recruited per the same path; 1-participant minimum maintained.

### Before synthesis (after conversation but before Task 9 synthesis-author-commit)
- Recruitment-log row marked `withdrawn-before-synthesis`.
- Per-interview note marked `withdrawn` + content destroyed; raw recording destroyed if applicable.
- **Signed consent form retained (P-17):** The signed consent form (substantive name + date of consent + pseudonym mapping) is retained in out-of-band storage per §4 even when interview content is destroyed. The signed form is the audit-trail evidence that consent was given; it must not be destroyed as part of interview-content destruction.
- Substitute spouse recruited per the same path; 1-participant minimum maintained.

### After synthesis (post-Task 9)
- Recruitment-log row marked `withdrawn-after-synthesis`.
- Per-interview note marked `withdrawn-after-synthesis` (retained as historical record but no longer cited).
- Synthesis: per-row removal of every row cited from the withdrawn per-interview note + supersession-schema marker noting "Bereaved-Spouse-1 withdrew on <date>, contributions removed; synthesis re-attested by trustee per §5 sign-off lifecycle".
- If the withdrawal occurs after trustee review (Task 10), trustee re-attestation is required before downstream Epic 6 / Epic 9 / Epic 11b stories may continue citing the synthesis.
- Substitute spouse recruitment is at Trustee Panel discretion (substitute may or may not be recruited depending on timeline + scope of withdrawn synthesis content).

### Granular quotation-withdrawal post-synthesis (P0-2b-distinct per §2-bis)
- Recruitment-log row `quotation_re-consent_engagement` updated to reflect per-quote withdrawal counts.
- Synthesis: the specific withdrawn quote is removed + paraphrased in supersession; the `[quote-re-confirmed]` marker is removed; per-interview note `quotation_log` table row updated to `re-consent-confirmed-then-withdrawn-YYYY-MM-DD`.
- Trustee re-attestation NOT required for granular quote-withdrawal (the synthesis broadly remains valid; only the specific quote is removed).

---

## §6 Post-synthesis data handling

### Raw recording (if applicable)
- Retained for **30 days post-synthesis-author-commit, then destroyed**. (Bereavement-context shortened default vs Story 0.8's 90-day retention.)
- OR destroyed immediately on participant request per §5.
- Destruction is logged in the recruitment-log `data_destruction_log` column (added at destruction time): destruction_date + destruction_method (e.g., "shredded physical media" / "secure-delete digital file").
- Trustee Panel chair receives a confirmation of destruction within 7 days of the destruction event.

### Per-interview note
- Retained in protocol directory under pseudonymized identity for **6 months** for cross-reference + further synthesis revision. (Bereavement-context shortened default vs Story 0.8's 12-month retention.)
- At 6 months, the per-interview note is archived (NOT destroyed — retained for historical research integrity) per the supersession-schema; archived note is moved to `interview-notes/archived/` subdirectory; future synthesis revision cites archived note with `[archived-YYYY-MM-DD]` marker.

### Recruitment-log
- Retained out-of-band per operations policy.
- Substantive identity data access-controlled to Solo Builder + Trustee Panel chair per need-to-know basis.

### Synthesis file
- Retained indefinitely as the research artifact at `_bmad-output/research/p0-2b-bereaved-spouse.md`.

---

## §7 Researcher boundaries

The researcher is **Solo Builder (BigDev) — a software developer building a welfare trust**, NOT a trained ethnographer, NOT a trained anthropologist, **NOT a trained grief counselor**. Limitations are explicitly acknowledged + bereavement-context limitations declared:

### Researcher does NOT:
- Diagnose the spouse's grief experience (e.g., does NOT label the spouse's emotional state as "grief" / "depression" / "trauma" — those are clinical terms; researcher uses neutral language).
- Diagnose the spouse's financial experience (e.g., does NOT label the family's financial state as "distressed" / "vulnerable" / "below poverty line" — those are policy labels; researcher uses descriptive language).
- Solicit specific incidents of bereavement beyond what the spouse voluntarily shares (per §3.6 spouse-led grief discipline).
- **Offer counseling, referrals, or post-interview follow-up beyond the pre-agreed re-consent-for-quotation contact** (per §2-bis opt-in). The researcher is not a service provider; the conversation is not a therapeutic intervention.
- Recommend TWT or any other product during the conversation (per §2 h no-obligation rule).
- Express pity or attempt consolation (per §3.4 — comforting register and counselor register are forbidden).
- Engage with the spouse outside the scope of the conversation + the pre-agreed re-consent contact.

### Researcher does:
- Offer **warm acknowledgment of grief without expressing pity or attempting consolation** — the witnessing register, not the comforting register (per §3.4).
- Honor the spouse's authority over the conversation pacing + depth + content.
- Honor the spouse's right to decline any prompt without explanation.
- Honor the spouse's right to withdraw at any time per §5.
- Honor the spouse's right to re-consent or decline re-consent for any specific quote per §2-bis.
- Refer the spouse to a Bihar grief-support NGO or BSWLB counseling service if the spouse asks for such a referral (researcher provides the referral contact, does NOT mediate the referral relationship).

### Researcher's escalation path if spouse is distressed during conversation
1. **Pause conversation** — researcher pauses prompts; researcher offers silence + presence.
2. **Offer to end conversation** — "Hum yahaan ruk sakte hain, ya kabhi aur baat kar sakte hain. Aap kya chahein?"
3. **Honor spouse's response** — if spouse opts to end, conversation ends per §5 withdrawal-during-conversation logic; if spouse opts to continue, researcher honors spouse's pacing.
4. **Researcher does NOT diagnose distress or attempt clinical intervention.**

---

## §8 Trustee review boundary

Trustee review (Task 10 post-synthesis) verifies:
- **Dimension coverage:** all 5 AC-named dimensions are substantively populated in synthesis OR explicitly marked partial-coverage with rationale.
- **Pattern 4 evaluation completeness:** all 8 sample-copy rows + 7 cross-cutting grief-grammar rows have per-row verdict OR explicit `not-evaluated-due-to-spouse-non-engagement` marker.
- **Divergence-log completeness:** every refuted-or-nuanced assumption per assumption-inventory + every Pattern 4 verdict requiring revision produces a divergence-log row.
- **Synthesis grounding in per-interview citation:** every synthesis row carries `Bereaved-Spouse-1 §dimension-X` citation; uncited rows are gaps.
- **Re-consent-for-quotation compliance:** every verbatim quote in synthesis carries `[quote-re-confirmed YYYY-MM-DD]` marker; unmarked quotes are framework defects requiring immediate correction.
- **Closure-language precision:** every AC leg labeled with `Closed by [edit]` | `Resolved via explicit deferral` | `Not addressed` per [[feedback_closure_language_precision]].

Trustee review does NOT:
- Re-interview the spouse.
- Have access to substantive identity in recruitment-log (per §4 NDA territory).
- Override the spouse's re-consent decisions.

Trustee receives:
- Synthesis (`_bmad-output/research/p0-2b-bereaved-spouse.md`).
- Per-interview note (pseudonymized; verbatim quotes only re-confirmed ones).
- Divergence-log.
- Pattern 4 evaluation worksheet.
- Recruitment-log (by-pseudonym only, NOT substantive identity).

Pre-conversation trustee approval (Task 7 per §2-tris) is a *separate* review event distinct from post-synthesis trustee review (Task 10). Same trustee(s) may grant both, but the two reviews are recorded as distinct trustee-review-log rows with different `review_scope` values.
