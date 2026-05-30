# Per-Interview Note Schema — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 Task 5 + ethics-protocol.md §4 pseudonymization rule + interview-protocol.md §5 post-interview note authoring.

**Purpose:** Define the per-conversation note shape that each of the 5 interviews produces. Per-interview notes are pseudonymized, filed at `interview-notes/shikshakamitra-N.md` in this protocol directory once created. Append-only after 24-hour author-commit window; supersession-schema applies for withdrawal-driven corrections.

**File naming convention:** `interview-notes/shikshakamitra-N.md` where N ∈ {1, 2, 3, 4, 5} per recruitment-log assignment order.

---

## Schema fields (per note file)

Each per-interview note file follows this structure verbatim. Researcher fills in each section within 24 hours of interview close per interview-protocol §5.

### Header block

```
# Per-Interview Note — Shikshakamitra-N

**Pseudonym:** Shikshakamitra-N
**Interview date:** YYYY-MM-DD
**Interview location type:** home / school staffroom / chai stall / verandah / square / other
**Block-level slug:** vaishali-block-<a/b/c/...>  (NEVER village name)
**Interview duration (minutes):** ≥45 expected; shorter logged with reason
**Language used:** Hindi default; dialect mix noted
**Recording consent:** recording-with-consent | notes-only-by-participant-choice | notes-only-by-researcher-default
**Notes authored within 24h:** YYYY-MM-DD HH:MM (timestamp; interview close was YYYY-MM-DD HH:MM)
**Reach-back permission:** granted | declined
**Withdrawal status (at author-commit):** active
```

### Participant demographics (non-identifying granularity)

```
## Participant demographics

- **Age band:** 20-30 / 31-40 / 41-50 / 51-60 / 60+
- **Gender:** as participant identifies
- **Tenure as Shikshakamitra (years):** at category granularity (e.g., 2-5 years, 5-10, 10-15, 15+)
- **School grade-level taught:** primary 1-2 / primary 1-5 / upper primary / mixed / other
- **Household composition:** at non-identifying granularity (e.g., "nuclear with 2 children + spouse" — NOT specific names or ages of family members)
```

### Per-dimension observations

For each dimension, the researcher records:
- **≥3 substantive observations** grounded in lived conversation
- **Verbatim quotes** where participant's own phrasing carries cultural-grammar meaning (Hindi quotes preserved; English glossary in parens if helpful for trustee review)
- **Paraphrased themes** that aggregate across the conversation
- **Anti-leading verification:** brief note confirming researcher avoided pre-framing in this dimension's exploration

```
## Dimension 1: Financial-literacy baseline

### Substantive observations
1. [observation]
2. [observation]
3. [observation]
...

### Verbatim quotes (Hindi-primary)
> "[participant's words verbatim]" — [non-identifying context, e.g., "in response to prompt 1"]

### Paraphrased themes
- [theme 1 aggregating across the conversation]
- [theme 2]

### Anti-leading verification
[brief note confirming researcher used open-ended prompts; no UPI pre-framing in this dimension]
```

Repeat the same structure for:
- `## Dimension 2: Mobile-device usage patterns`
- `## Dimension 3: Comfort with UPI`
- `## Dimension 4: Trust-source mapping`
- `## Dimension 5: Grief experience` (sensitive — only what participant volunteered; researcher does NOT extrapolate beyond what was shared)
- `## Dimension 6: Mental-model validation (chanda + phone reminder hypothesis)`

### Divergence flags

```
## Divergence flags

For each observation contradicting a pre-stated assumption per `assumption-inventory.md`, record:

- **Flag 1**
  - **Assumption ID:** A-<id>
  - **Pre-stated assumption text:** [from assumption-inventory.md]
  - **Observation:** [the contradiction; specific to this interview]
  - **Severity (researcher's first read):** factual-contradiction | nuance | extension
  - **Suggested divergence-log row:** [draft text for synthesis-time aggregation]

- **Flag 2**
  ...
```

If no flags surfaced in this interview, record:
```
## Divergence flags

None surfaced in this interview. All observations align with the pre-stated assumptions per `assumption-inventory.md` (specifically: A-<id-1>, A-<id-2>, ...) within the bounds of single-interview signal.
```

### Researcher reflections (post-interview)

```
## Researcher reflections (post-interview)

### What surprised me
[brief reflection — not synthesis; signal for the cross-interview pattern]

### What I missed or should ask in next interview
[adjustments to question-bank or prompt phrasing for subsequent interviews]

### Conduct quality self-assessment
- Peer-register maintained: yes / no (with note if no)
- ≥3-second silence tolerance honored: yes / no
- Anti-leading discipline held: yes / no
- Participant comfort throughout: yes / partial / no
- Recording (if applicable) consent reaffirmation honored: yes / no
```

### Cross-references

```
## Cross-references

- **Recruitment-log row:** Shikshakamitra-N in `recruitment-log.md`
- **Substantive identity:** stored out-of-band per ethics-protocol §4 (NOT in this file)
- **Raw recording (if applicable):** [pseudonym]-[date].m4a — local secure storage; 90-day retention per ethics-protocol §6
- **Synthesis aggregation status:** pending Task 9 (synthesis-author-commit)
- **Trustee review status:** pending Task 10
```

---

## Authoring discipline

### Within the 24-hour window

- Researcher authors the note within 24 hours of interview close.
- Within 24h, corrections to factual data (date, duration, demographics) are permitted in-place edits.
- After 24h, the note is *append-only*; corrections are supersession-schema entries.

### Pseudonymization verification (mandatory before commit)

Researcher verifies before committing the note:
- [ ] No participant name in note body
- [ ] No specific village name (block-level slug only)
- [ ] No specific school name
- [ ] No specific colleague / family names (paraphrased)
- [ ] No specific identifying incidents (paraphrased with non-identifying date framing)
- [ ] Verbatim quotes checked for non-identifying content
- [ ] Filename matches pseudonym (`shikshakamitra-N.md`)

### Withdrawal-driven corrections (supersession-schema)

If participant withdraws after the per-interview note is committed:
- **Withdrawal before synthesis-author-commit:** entire note content is destroyed; file is replaced with a header block carrying only `withdrawal_status = withdrawn-before-synthesis` + the withdrawal date + the pseudonym.
- **Withdrawal after synthesis-author-commit:** note status updated to `withdrawn-after-synthesis`; content retained only if participant explicitly consents to retention (default is destruction); supersession-schema marker added to synthesis Pack-revision log per ethics-protocol §5.

### Forbidden states

- A note with `withdrawal_status` other than {`active`, `withdrawn-before-interview`, `withdrawn-during-interview`, `withdrawn-before-synthesis`, `withdrawn-after-synthesis`} — invalid lifecycle state.
- A note with `interview_duration_minutes < 45` AND no documented reason — violation of conduct standard.
- A note with no `notes_authored_within_24h` timestamp — violation of authoring discipline; ageing notes lose recall fidelity.
- A note with verbatim quote containing village name, school name, colleague name, or specific identifying incident — violation of pseudonymization rule; mandatory correction before commit.
