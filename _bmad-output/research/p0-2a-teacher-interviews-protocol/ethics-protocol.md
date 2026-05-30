# Ethics Protocol — P0-2a Teacher Empathy Interviews

**Authority:** UX-DR5 (epics line 375) · UX §Phase-0 P0-2 (UX spec lines 101-105) · DPDPA member-data principles by analogy · architecture §1.5 PII shielding by analogy · UX Stance #6 staff-fallback obligation by analogy (research participants are not members but the dignity grammar is inherited) · Story 0.6 engineer-roster need-to-know discipline · Story 0.7 rota contact-identity NDA pattern

**Scope:** Ethics commitments binding the conduct of 5 Shikshakamitra empathy interviews in Vaishali district per Story 0.8.

---

## §1 Authority cites

| Cite | Source | Authority weight |
|---|---|---|
| Informed consent + identity protection + withdrawal-right principles | DPDPA member-data principles by analogy + research-ethics general practice (cite intentionally non-specific to a single ethics-board jurisdiction — Solo Builder is not affiliated with a formal IRB, so the protocol commits the *property* of those principles without claiming IRB certification) | Authoritative for protocol shape |
| PII shielding default | Architecture §1.5 (TWT member-PII shielding) | Authoritative by analogy — research participants are not TWT members but the shielding grammar is inherited |
| Dignity grammar (peer-register; no authority tone) | UX Stance #6 staff-fallback obligation + UX spec §Felt Experience (the *सम्मानित साथी* address) | Authoritative by analogy — TWT members + research participants share the cultural-grammar register |
| Need-to-know identity discipline | Story 0.6 engineer-roster + Story 0.7 rota | Direct precedent inherited |
| Researcher boundary | UX §External Validation Pending UX Researcher (architecture lines 4855-4859) | Solo Builder acknowledged as untrained ethnographer; boundaries declared in §7 |

---

## §2 Informed consent procedure

Informed consent is presented in Hindi at the start of every interview. The consent form (Hindi-primary; English mirror available at `informed-consent-template-english.md`) covers:

### (a) Participation purpose

"Aap is interview mein iss liye shaamil ho rahe hain ki Bihar ke shikshakon ke liye ek welfare trust (TWT) banaya ja raha hai, aur is kaam ko aapki tarah ke logon ki zindagi ke saath sahi tarah se jodne ke liye hum aap se seekhna chahte hain. Aap TWT ke sadasya nahin ban rahe; aap se kuch khareedne ya kisi tarah ki seva mein judne ki maang nahin hai."

(English: "You are part of this interview because we are building a welfare trust for Bihar teachers (TWT) and we want to learn from people like you so the design fits real life. You are not becoming a TWT member; we are not asking you to buy anything or commit to any service.")

### (b) What data is collected

- Interview content (the conversation itself)
- Demographic context at block-level granularity (age band; gender; tenure as Shikshakamitra in years; school grade-level taught; household composition at non-identifying granularity)
- NOT collected: village name (replaced with block-level slug); school name; colleague names; specific identifying incidents

### (c) What is recorded

The participant chooses between:
- **Audio recording** — researcher records the conversation on a phone or dedicated recorder; participant can pause recording at any time; recording is stored securely per §6.
- **Notes only** — researcher takes notes during the conversation; no audio captured. This is the researcher's *default preference* (less invasive per §3.5).

The choice is the participant's. Researcher does not pressure either way. Verbal reconfirmation of recording consent is required at the start of every recorded session.

### (d) How identity is protected

- Pseudonymization across all artifacts: every reference to the participant uses `Shikshakamitra-N` per recruitment-log assignment order.
- Demographic context preserved at non-identifying granularity (block-level slug, not village name; age band, not exact age; tenure in years, not exact join date).
- Substantive name + contact data is stored out-of-band per §4 — never inlined in synthesis, per-interview notes, divergence-log, or any framework artifact.
- Verbatim quotes are permitted only if non-identifying; quotes referencing specific named colleagues / specific schools / specific incidents are paraphrased.

### (e) Data retention

- Raw recordings (if audio chosen): retained for 90 days post-synthesis-author-commit, then destroyed; OR destroyed immediately on participant request per §5.
- Per-interview notes (pseudonymized): retained in protocol directory under pseudonymized identity for 12 months for cross-reference + further synthesis revision.
- Recruitment-log (with substantive name-to-pseudonym mapping in out-of-band storage): retained per operations policy; substantive identity data is access-controlled to Solo Builder + Trustee Panel chair per need-to-know basis.
- Synthesis file (`_bmad-output/research/p0-2a-teacher-interviews.md`): retained indefinitely as the research artifact.

### (f) Right to withdraw

The participant may withdraw at any time — before, during, or after the interview. Withdrawal procedures per §5.

### (g) Compensation

- Researcher may offer modest reimbursement for travel + time if the participant has traveled to a non-home interview location OR has taken paid leave to attend (e.g., ₹100-300 range, ADR-deferred per README §8 ADR slot 1).
- Reimbursement is NOT contingent on specific findings, NOT contingent on TWT join-ask, NOT contingent on referral-ask.
- Reimbursement may be declined by participant without affecting participation acceptance.

### (h) No obligation to TWT

The participant has NO obligation to TWT post-interview. Specifically:
- The participant is NOT asked to join TWT as a member.
- The participant is NOT asked to refer colleagues to TWT.
- The participant is NOT asked to use any TWT surface post-interview.
- The participant is NOT entered into any TWT mailing list or contact registry.

**Verbal consent reaffirmation:** before any recording begins, researcher asks: "Kya aap is interview ko start karne ke liye taiyar hain? Kya aap chahte hain ki main audio record karoon ya sirf notes likhoon? Aap kabhi bhi ruk sakte hain, savaal pooch sakte hain, ya jaa sakte hain."

---

## §3 Conduct standards

### §3.1 Duration ≥45 minutes

Each interview is ≥45 minutes. Shorter duration is permitted only if:
- Participant withdraws mid-session (per §5 — interview ends; per-interview note marked accordingly).
- External interruption ends the session early (e.g., participant called to a school emergency, family member needs attention) — interview note records the interruption + the session is rescheduled with same-participant continuation OR marked complete with partial coverage gap-flagged. **An externally-interrupted session counts toward the 5-participant minimum if ≥3 dimensions have substantive observations in the per-interview note.** If fewer than 3 dimensions are covered and the participant declines to reschedule, a substitute participant is recruited per ethics-protocol §5 withdrawal logic (substitute gets next available pseudonym number; the interrupted session's per-interview note is retained as partial-coverage evidence).

Researcher does NOT artificially extend an interview past natural close to reach 45 minutes; if the conversation reaches natural close at 38 minutes with rich dimension coverage, that is logged + the session is closed.

### §3.2 Hindi language

Researcher speaks Hindi throughout. If participant prefers English / Bhojpuri / local dialect, that preference is honored:
- **English preference:** researcher accommodates; informed-consent-template-english.md is used; per-interview note language_used column records "English at participant preference".
- **Bhojpuri / local dialect:** researcher uses whatever Hindi-Bhojpuri blend participant naturally uses; researcher does NOT artificially shift register to match participant; per-interview note language_used column records the dialect mix.
- **Code-switching:** common in Bihar; researcher records language_used as "Hindi with English code-switching as participant uses it".

### §3.3 Participant's preferred location

The researcher travels to the participant's chosen location. Candidates the participant may choose from (presented as options, NOT prescribed):
- Participant's home
- Participant's school staffroom
- Village chai stall
- Village verandah / courtyard
- Village square / panchayat bhawan
- Any other location the participant prefers

Researcher does NOT propose a researcher-convenient location (e.g., a city café or hotel). This is power-differential mitigation per §3.4 — researcher accommodates participant.

If participant proposes a location with privacy concerns (e.g., crowded staffroom during break), researcher gently raises the concern + offers alternatives but defers to participant's choice. Per-interview note records location_type + privacy_observation if applicable.

### §3.4 Power-differential mitigation

The researcher is Solo Builder — a software developer building a welfare trust. The participant is a Shikshakamitra — a teacher aide on ~₹15k/month stipend. This is a real power differential the researcher must actively mitigate.

**Researcher does:**
- Use peer register: "Namaste, main TWT ka kaam kar raha hoon — aap jaisey shikshakon ke baare mein samajhne ki koshish kar raha hoon."
- Sit at the participant's eye level (not standing over them or sitting on a higher chair).
- Wait ≥3 seconds before filling participant silence.
- Reaffirm participant's authority over the conversation: "Aap jo bhi batayein, woh sahi hai. Yeh kaam aapse seekhne ka hai."
- Acknowledge limitations: "Main koi bahut bara expert nahin hoon. Mujhe aapse seekhna hai."

**Researcher does NOT:**
- Use authority register: "Sir / Professor / Madam" formality directed at the participant (Hindi *aap* is appropriate; English *sir* signals authority distance).
- Wear formal attire that signals institutional authority (researcher wears plain comfortable clothes; no clipboard ostentation; no recording equipment displayed before consent).
- Signal expected answer through leading questions: "Aap UPI use karte ho na?" (forbidden; substitute: "Aap apna paisa kahaan rakhte ho?")
- Correct participant statements that contradict PRD/UX assumptions (those go into divergence-log + assumption-inventory `validation_status` updates).
- Solicit specific incidents the participant has not voluntarily raised.

### §3.5 Recording-or-notes discipline

- Participant chooses (per §2 c).
- Researcher's *default preference* is detailed notes (less invasive; no audio storage; no transcription overhead; participant typically more candid).
- If recording is chosen: explicit reconfirmation at start of session + right to pause recording reaffirmed mid-session. If participant pauses recording, the pause-content is NOT retroactively recorded from memory. The pause is honored.
- If notes only: researcher writes notes during conversation but maintains eye contact + active listening; notes do not consume more than ~20% of session time.
- Per-interview note authored within 24 hours per §5 of interview-protocol.md.

### §3.6 Question-bank usage

The question bank (`question-bank.md`) is a *prompt list*, NOT a script. Discipline:
- Researcher uses prompts as conversation starters, not as a fixed sequence.
- Participant-led order: participant may anchor on a specific dimension first; researcher follows their lead.
- Participant-initiated topics that fall outside the five named dimensions are followed AND noted as potential dimension extensions (per-interview note divergence-flag).
- Open-ended phrasing: "aap apna paisa kahaan rakhte ho?" NOT "do you use a bank account?" — open prompts let participants generate their own mental model.
- Anti-leading discipline: researcher does NOT pre-frame the answer; researcher does NOT lead participant toward TWT-specific scenarios; researcher lets participant define their own categories.

---

## §4 Identity protection

### Pseudonymization rule

Every artifact references participants as `Shikshakamitra-N` per recruitment-log assignment order (1-5). Pseudonyms are assigned at recruitment time (Task 7) and persist across all subsequent artifacts.

### Demographic context granularity

- **District:** Vaishali (named, as required by AC scope)
- **Block:** recorded with **block-level slug** (e.g., `vaishali-block-a`), NOT block name; the slug is mapped out-of-band per operations policy
- **Village:** replaced with block-level slug; village name NEVER inlined
- **School:** school name NEVER inlined; school grade-level taught preserved at category granularity (e.g., "primary 1-5", "primary 1-2", "all classes")
- **Colleagues / family:** named persons in participant's narration are paraphrased ("a colleague", "a family member"); specific names NEVER inlined
- **Specific identifying incidents:** if participant volunteers a specific incident (e.g., "two years ago, on the morning of August 14, the principal of my school..."), the incident is paraphrased with non-identifying date framing ("a few years ago, on a morning")

### Verbatim quote discipline

Verbatim quotes are permitted ONLY if non-identifying. Quotes that include specific named colleagues / specific school names / specific identifying incidents are paraphrased. The synthesis file MAY include verbatim Hindi quotes as direct cultural-grammar evidence (e.g., participant's own words for `chanda`, `pension`, `app`, `family`, `colleague`, `trust`, `money`, `death`); those quotes are explicitly checked for non-identifying content before publication.

### Recruitment-log

The recruitment-log (`recruitment-log.md`) carries the pseudonym-to-recruitment-path mapping per columns: `pseudonym` | `recruitment_path` | `recruitment_date` | `consent_obtained_date` | `interview_scheduled_date` | `interview_conducted_date` | `withdrawal_status`. The log does NOT carry substantive names or contacts.

The substantive name-to-pseudonym mapping is stored **out-of-band** per operations policy — in a researcher-only access-controlled file outside the trustee-accessible repo. Trustee Panel chair may access the mapping under documented need-to-know per Story 0.6 engineer-roster precedent (e.g., to verify a participant withdrawal request authenticates).

### Trustee review boundary

Per §8 below, trustee reviewers receive synthesis + per-interview notes (pseudonymized) + divergence-log + recruitment-log (by-pseudonym only, NOT substantive identity). Trustees do NOT have direct access to the substantive name-to-pseudonym mapping; access is need-to-know.

---

## §5 Withdrawal procedure

The participant may withdraw at any time. Researcher does NOT require an explanation.

### Withdrawal before interview

- Recruitment-log row marked `withdrawn-before-interview`.
- Pseudonym is *not* re-assigned to a substitute participant (the pseudonym number is preserved for audit-trail consistency); the substitute participant receives the next available number (e.g., Shikshakamitra-6) and the 5-participant minimum is maintained by re-recruitment.
- Consent form copy returned or destroyed per participant preference.

### Withdrawal during interview

- Researcher acknowledges with empathy: "Bilkul. Aap kabhi bhi ruk sakte hain. Dhanyavaad ki aapne shuru kiya."
- Recording (if active) stopped immediately.
- Notes from session destroyed OR per-interview note marked `withdrawn-during-interview` with the partial-coverage note destroyed per participant preference.
- Recruitment-log withdrawal_status updated to `withdrawn-during-interview`.

### Withdrawal after interview but before synthesis-author-commit

- Per-interview note marked `withdrawn-before-synthesis`.
- Per-interview note content destroyed.
- Raw recording (if applicable) destroyed immediately.
- Recruitment-log withdrawal_status updated to `withdrawn-before-synthesis`.
- 5-participant minimum re-evaluated; substitute participant recruited if synthesis dimension coverage is impacted.

### Withdrawal after synthesis-author-commit

- Per-row removal from synthesis: every synthesis row citing the withdrawing participant is reviewed; if removal would leave the row uncited, the row is also removed.
- Supersession-schema marker added to the synthesis Pack-revision log: "Shikshakamitra-N withdrew on <date>; contributions removed; synthesis re-attested per §5 sign-off lifecycle on <date>".
- Trustee re-attestation of the synthesis is required per §5 sign-off lifecycle; review-scope is `withdrawal-driven-resynthesis`.
- Raw recording (if applicable) destroyed immediately.
- Per-interview note retained under `withdrawn-after-synthesis` status for audit-trail purposes ONLY if participant explicitly consents to retention; default is destruction.
- Recruitment-log withdrawal_status updated to `withdrawn-after-synthesis`.

---

## §6 Post-synthesis data handling

### Raw recordings (if audio chosen)

- Default retention: 90 days post-synthesis-author-commit.
- Earlier destruction: on participant request (per §5 withdrawal procedures) OR researcher discretion if audio quality / privacy concerns surface.
- Storage: encrypted on researcher's local device; NOT in the trustee-accessible repo; NOT in cloud storage without operations-policy ADR.
- Destruction evidence: a `.decision-log.md` `[CONTINUITY]` entry per batch destruction (one entry covering all 5 recordings destroyed together at 90-day milestone).

### Per-interview notes (pseudonymized)

- Default retention: 12 months in protocol directory under pseudonymized identity.
- After 12 months: notes are archived (moved to a `_archive/` subdirectory) for cross-Story-0.9/0.10/0.11 reference; substantive identity remains out-of-band.
- Notes are append-only after the 24-hour author-commit window; supersession-schema applies for withdrawal-driven corrections.

### Recruitment-log

- Retained per operations policy (no specific time-bound at framework level; ADR pending).
- Substantive name + contact data stored out-of-band; access need-to-know.

### Synthesis file

- Retained indefinitely as the research artifact at `_bmad-output/research/p0-2a-teacher-interviews.md`.
- Supersession-schema applies for any post-trustee-review revision; the synthesis Pack-revision log tracks revisions.

---

## §7 Researcher boundaries

The researcher (Solo Builder / BigDev) acknowledges:

1. **Not a trained ethnographer or anthropologist.** Solo Builder is a software developer with empathy-research training equivalent to "read a few research methodology resources + spent time observing in TSCT-related contexts." The framework does NOT claim IRB certification or formal ethnographic methodology rigor.

2. **Does NOT diagnose.** Researcher does NOT diagnose participants' financial literacy level, mental-health state, digital-literacy band, grief processing status, or any other clinical-or-quasi-clinical category. Synthesis observations are descriptive, NOT diagnostic.

3. **Does NOT solicit specific incidents.** Researcher does NOT push past participant reluctance on grief topics. Researcher does NOT request specific bereavement incidents the participant has not voluntarily raised. If participant says "I don't want to talk about this," researcher moves on with empathic acknowledgment ("Bilkul. Doosri baat karte hain.").

4. **Does NOT recommend TWT or any other product.** Researcher does NOT pitch TWT, describe TWT features, or solicit participation in TWT during the interview. The interview is informational extraction *for design*, not promotion.

5. **Does NOT analyze in real-time.** Researcher does NOT correct participant statements that contradict PRD/UX assumptions during the interview. Those go into the per-interview note's divergence-flags + the divergence-log.

6. **Acknowledges asymmetric outcome.** The researcher gains design insight; the participant gains (at most) modest reimbursement + the satisfaction of being heard. This asymmetry is named in §2 (h) and the consent form.

7. **Holds dignity invariant.** Even when participants share emotionally charged content, researcher maintains peer-register + empathic posture. Researcher does NOT use the conversation as a confessional or therapy session — participant may share what they choose, researcher listens without intervention.

---

## §8 Trustee review boundary

Trustee reviewers receive (per §4 + §5 sign-off lifecycle):

- The synthesis file (`_bmad-output/research/p0-2a-teacher-interviews.md`)
- The per-interview notes (pseudonymized; under `interview-notes/`)
- The divergence-log (`divergence-log.md`)
- The recruitment-log (by-pseudonym only; substantive identity is out-of-band)
- The assumption-inventory (`assumption-inventory.md`) with populated validation_status
- This framework documentation (README + ethics-protocol + protocols + schemas)

Trustees do NOT:

- Re-interview participants (the trustee reviews the synthesis + lived-data citations, not the participants directly)
- Access the substantive name-to-pseudonym mapping in the recruitment-log out-of-band store unless a documented need-to-know condition applies (e.g., authenticating a withdrawal request)
- Modify synthesis content directly; trustee feedback is logged in trustee-review-log + revision is Solo Builder's territory per the per-Story dev-author commit pattern
- Override participant withdrawal: even if trustee verdict is `accepted`, a subsequent participant withdrawal triggers per-row removal + re-attestation per §5

Trustees DO:

- Verify dimension coverage (all 6 dimensions populated with substantive findings)
- Verify divergence-log completeness (every refuted-or-nuanced assumption per assumption-inventory has a divergence-log row)
- Verify synthesis grounding in per-interview citations (every synthesis row carries ≥1 `Shikshakamitra-N §dimension-X` citation per README §4 invariant 4)
- Verify pseudonymization compliance (no participant identity, contact, or specific identifying detail in synthesis or notes)
- Issue verdict per trustee-review-log schema: `accepted` | `accepted-with-revisions` | `rejected-pending-rework`
- Issue sign-off note attesting "Epic 3 substrate work may begin" (or the gating note explaining what must close before Epic 3 may begin)
