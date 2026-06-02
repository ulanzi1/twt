# Per-Interview Note Schema — P0-2b Bereaved-Spouse Conversation

**Authority:** ethics-protocol.md §3.5 + §4 + §6 + §2-bis re-consent-for-quotation · interview-protocol.md §6 post-interview · Story 0.9 AC-1 per-interview-note structure · per-interview-note-schema discipline inherited from Story 0.8

**Scope:** Defines the per-conversation note shape produced by the single P0-2b bereaved-spouse conversation. The per-interview note is **pseudonymized** (Bereaved-Spouse-1 per recruitment-log), authored within 24 hours of the conversation per ethics-protocol §3.5, filed at `interview-notes/bereaved-spouse-1.md` once created, **immutable after author-commit + 24-hour-window close** (corrections after are supersession entries per ethics-protocol §5 + §2-bis re-consent workflow).

---

## Column schema

The per-interview note file (`interview-notes/bereaved-spouse-1.md`) carries the following columns:

### Metadata

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `pseudonym` | `Bereaved-Spouse-1` | Identity reference (per recruitment-log) | Canonical slug; substantive identity NDA per ethics-protocol §4 |
| `interview_date` | YYYY-MM-DD | Date of conversation | Single date (vs Story 0.8 multiple-interview range) |
| `interview_setting_type` | `home` / `family-courtyard` / `village-square` / `trustee-mediated-neutral` / `other` | Spouse-chosen setting | District-level slug NOT raw village name; per ethics-protocol §4 + §3.3 |
| `interview_duration_minutes` | integer | Conversation duration | ≥60 expected per ethics-protocol §3.1; shorter requires reason note |
| `language_used` | `Hindi` / `Hindi+Bhojpuri` / `Hindi+English-code-switching` / `English-at-spouse-preference` | Conversation language | Per ethics-protocol §3.2 |
| `consent_type` | `signed` / `verbal-only` | Per ethics-protocol §2 consent-form discipline | `verbal-only` permitted only when literacy barrier prevents signature per ethics-protocol §2 verbal-consent alternative; researcher reads form aloud + spouse confirms aloud |
| `recording_consent` | `recording-with-consent` / `notes-only-by-spouse-choice` / `notes-only-by-researcher-default` | Recording-vs-notes per spouse's §2 c choice | Researcher's default preference is notes-only per §3.5 |
| `quotation_re-consent_opt-in` | `yes` / `no` | Per §2-bis re-consent-for-quotation checkbox from informed-consent form | Determines whether researcher can route post-conversation re-consent requests via trustee channel |
| `notes_authored_within_24h` | timestamp | When per-interview note was authored | Per ethics-protocol §3.5 + interview-protocol §6.1 |

### Participant demographics (at non-identifying granularity per ethics-protocol §4)

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `age_band` | `30-40` / `41-50` / `51-60` / `60+` / `70+` | Age range | Never exact age |
| `gender` | `female` / `male` / `other` | Spouse's gender | Conventionally female-skewed in widow-spouse population |
| `relation_to_deceased` | `spouse` (+ named other role if material) | Relation | E.g., "spouse, with adult son co-leading the claim" — non-identifying granularity |
| `years_since_claim_event` | integer year band | Claim event recency | Never exact date |
| `claim_trust_precedent` | `TSCT` / `comparable-Bihar-trust` / `comparable-other-trust` | Trust precedent the claim was processed under | TSCT named permissible (~556-deceased-family operational history); smaller trusts may be too identifying — use comparable-* slug |
| `household_composition` | descriptive text | Non-identifying granularity | E.g., "lives with 2 adult children" / "lives alone with extended-family support" |

### Per-dimension observation columns

For each of the 5 AC-named dimensions + dimension-6 cultural-grammar cross-cutting:

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `dimension-1-emotional-pace-tolerance` | structured text per template below | Per ethics-protocol §3.6 spouse-led discipline | ≥3 substantive observations expected if dimension engaged |
| `dimension-2-document-gathering-experience` | same template | Same | Same |
| `dimension-3-interaction-with-trust-staff` | same template | Same | Same |
| `dimension-4-what-felt-dignified-vs-transactional` | same template | Same | Same |
| `dimension-5-role-of-family-community` | same template | Same | Same |
| `dimension-6-cultural-grammar-cross-cutting` | same template | Spouse-led observations outside the 5 dimensions | Captures spontaneous cultural-grammar findings; framework-extensible per README §4 invariant 9 append-only rule |

#### Per-dimension template

```
Dimension-X: <dimension name>

Engagement status: [fully-engaged | partially-engaged | declined-to-engage | not-prompted-spouse-anchored-elsewhere]

Observations (paraphrased — per re-consent-for-quotation discipline):
1. <paraphrased observation 1>
2. <paraphrased observation 2>
3. <paraphrased observation 3>
... (≥3 substantive observations expected)

Themes:
- <theme 1>
- <theme 2>
...

Candidate verbatim quotes (re-consent-pending; NOT used in synthesis without re-confirmation):
1. "<candidate verbatim 1>" — re-consent status: [re-consent-pending | re-consent-confirmed-YYYY-MM-DD | re-consent-declined]
2. ...

Divergence-flags (any observation contradicting an assumption-inventory.md row):
- assumption_id: <e.g., A-grief-fursat-cadence> — observation: <paraphrased>
- ...
```

### Pattern 4 evaluation engagement

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `pattern-4-evaluation-engagement-status` | `opted-in-all-8-rows` / `opted-in-partial-N-rows` / `declined-mid-interview` / `not-offered-due-to-pacing-constraint` / `not-offered-due-to-spouse-emotional-state` | Per ethics-protocol §3.7 opt-in workflow | If opted in, the pattern-4-evaluation-worksheet.md per-row verdicts are populated; declined rows marked `not-evaluated-due-to-spouse-non-engagement` |
| `grief-grammar-cross-cutting-engagement-status` | same shape | Per question-bank §7 + ethics-protocol §3.7 opt-in workflow | Same logic as Pattern 4 |

### Quotation log (per ethics-protocol §2-bis re-consent-for-quotation)

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `quotation_log` | table per-quote | Tracks all candidate verbatim quotes + re-consent status | See template below |

#### Quotation log template

```
| quote_id | candidate_quote (Hindi) | candidate_quote (English paraphrase) | re-consent_status | re-consent_date | re-consent_method | synthesis_inclusion |
|---|---|---|---|---|---|---|
| q-001 | "<Hindi verbatim>" | "<English paraphrase>" | re-consent-pending | _ | _ | not-included-pending-re-consent |
| q-002 | ... | ... | re-consent-confirmed | 2026-06-15 | trustee-mediated-email | included-in-synthesis-§3.4 |
| q-003 | ... | ... | re-consent-declined | 2026-06-15 | trustee-mediated-call | paraphrase-only-in-synthesis-§3.4 |
| q-004 | ... | ... | re-consent-confirmed-then-withdrawn | 2026-08-01 | trustee-mediated-call | removed-from-synthesis-supersession-row |
| q-005 | ... | ... | re-consent-re-approved-after-withdrawal | 2026-09-01 | trustee-mediated-email | re-included-in-synthesis-supersession-row |
```

**30-day fallback (per ethics-protocol §2-bis step 9):** If the researcher does not receive a re-consent response within 30 days of the re-consent request, `re-consent_status` is updated to `re-consent-declined` with `re-consent_method = "30-day-timeout-declined"` — no further re-contact on that quote.

### Withdrawal status

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `withdrawal_status` | `active` / `withdrawn-before-synthesis` / `withdrawn-after-synthesis` / `granular-quote-withdrawal-active` | Per ethics-protocol §5 | Updated as withdrawal events occur |
| `withdrawal_log` | structured text | Records withdrawal events with date + scope (full / granular-quote) | Append-only |

### Researcher reflection (optional)

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `researcher_reflection` | free text | Optional researcher note on conduct + framework-conformance | Captures any framework-level observations (e.g., "warm-up took 12 min instead of 5-10 due to spouse's choice; honored"); does NOT include diagnostic or evaluative statements about spouse |

---

## Worked-example skeleton

The following skeleton illustrates the per-interview note shape for the **Dimension 1: Emotional pace tolerance** section. **This is a structural illustration only — all observations and quotes below are intentional placeholders, NOT prefigured findings.** The actual per-interview note is authored at Task 8 by Solo Builder from the real conversation.

```markdown
# Per-Interview Note — Bereaved-Spouse-1

## Metadata

- pseudonym: Bereaved-Spouse-1
- consent_type: <signed | verbal-only>
- interview_date: <YYYY-MM-DD>
- interview_setting_type: <home | family-courtyard | village-square | trustee-mediated-neutral | other>
- interview_duration_minutes: <integer>
- language_used: <Hindi | Hindi+Bhojpuri | Hindi+English-code-switching | English-at-spouse-preference>
- recording_consent: <recording-with-consent | notes-only-by-spouse-choice | notes-only-by-researcher-default>
- quotation_re-consent_opt-in: <yes | no>
- notes_authored_within_24h: <YYYY-MM-DD HH:MM IST>

## Participant demographics

- age_band: <30-40 | 41-50 | 51-60 | 60+ | 70+>
- gender: <female | male | other>
- relation_to_deceased: <e.g., spouse, with adult son co-leading later claim steps>
- years_since_claim_event: <integer year band>
- claim_trust_precedent: <TSCT | comparable-Bihar-trust | comparable-other-trust>
- household_composition: <non-identifying descriptive text>

## Dimension-1: Emotional pace tolerance

Engagement status: <fully-engaged | partially-engaged | declined-to-engage | not-prompted-spouse-anchored-elsewhere>

Observations (paraphrased):
1. <paraphrased observation 1 — no verbatim; ≥3 expected if dimension fully engaged>
2. <paraphrased observation 2>
3. <paraphrased observation 3>

Themes:
- <theme 1>
- <theme 2>

Candidate verbatim quotes (re-consent-pending; NOT used in synthesis without re-confirmation):
1. "<Hindi verbatim placeholder>" — re-consent status: re-consent-pending

Divergence-flags:
- assumption_id: <e.g., A-grief-fursat-cadence> — observation: <paraphrased> — verdict: <validated | nuanced | factual-contradiction> (use these exact terms; validated = assumption confirmed; nuanced = partially right; factual-contradiction = assumption is wrong)

[... continue with Dimensions 2-6, Pattern 4 evaluation engagement, quotation log, withdrawal status, researcher reflection ...]
```

---

## Authoring discipline

- **24-hour window:** per-interview note authored within 24 hours of conversation per ethics-protocol §3.5 + interview-protocol §6.1. Timestamp `notes_authored_within_24h` records the authoring date.
- **Pseudonymization verification:** researcher reviews the note for any inadvertent identity leak (village-name, school-name, specific named family member, specific named colleague, specific identifying incident); identity leaks are paraphrased to non-identifying granularity per ethics-protocol §4.
- **Re-consent-for-quotation discipline:** no verbatim quotes appear in `dimension-N-*` observation columns; candidate verbatim quotes are captured in the `quotation_log` table with `re-consent-pending` status per ethics-protocol §2-bis.
- **Dimension partial-coverage:** if a dimension was not engaged or only partially engaged, the `Engagement status` field records honestly (`declined-to-engage`, `not-prompted-spouse-anchored-elsewhere`); the dimension may have <3 observations and that is honest research outcome, not framework failure.
- **Divergence-flags:** every observation that contradicts (or confirms) an assumption-inventory.md row is flagged with the assumption_id reference; the divergence-log row population happens at Task 9 synthesis-author-commit (the per-interview-note divergence-flags are the source data the synthesis aggregates).
- **Immutability after 24-hour window close:** the per-interview note is immutable after the 24-hour window. Corrections after the 24-hour window take one of two paths: (a) **substantive corrections** (corrections affecting observation wording, synthesis content, or re-consent status) are full supersession entries per ethics-protocol §5 + §2-bis + Story 0.4-0.8 supersession-schema precedent; (b) **minor corrections** (formatting fixes, timestamp corrections, or typos that do not affect synthesis content) may be appended as a dated `[addendum-YYYY-MM-DD]` block below the `[AUTHOR-COMMIT-IMMUTABLE AFTER YYYY-MM-DD HH:MM]` marker — the addendum must be signed by the researcher and must NOT modify or delete any original text above the marker.

---

## Authoring location

`_bmad-output/research/p0-2b-bereaved-spouse-protocol/interview-notes/bereaved-spouse-1.md`

(The `interview-notes/` subdirectory is pre-created at Task 5 with a README placeholder; the actual per-interview note is authored at Task 8 by Solo Builder.)
