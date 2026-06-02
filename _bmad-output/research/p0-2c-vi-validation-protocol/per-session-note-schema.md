# Per-Session Note Schema — P0-2c VI/Low-Vision Member Accessibility Validation

> Pseudonymized; filed in `session-notes/vi-member-1.md` (substitute `session-notes/vi-member-1a.md` if Story 0.9 P-07 substitute pattern triggers); **append-only with supersession-schema for withdrawal + re-consent-for-quotation tracking**; supplementary-addendum permitted within 24-hour window per Story 0.9 P-21 precedent.
>
> **Worked-example skeleton uses structural placeholders only** per Story 0.9 P-11 review-patch precedent — NO fabricated verbatim content; status enum values match schema.

## Per-session note shape

| Field | Type / Allowed Values | Meaning / Population Rule |
|---|---|---|
| `pseudonym` | `VI-Member-1` \| `VI-Member-1A` | Canonical pseudonym; substitute per Story 0.9 P-07 if first participant withdraws after synthesis |
| `session_date` | YYYY-MM-DD | Session conduct date |
| `session_setting_type` | `participant-home` \| `disability-org-office` \| `accessible-public-location` \| `trustee-mediated-neutral-location` | Participant's chosen setting per ethics-protocol §3.3 |
| `session_setting_district_slug` | district-level slug (NOT village; NOT block) | `Bihar district <slug>` per ethics-protocol §4 |
| `session_duration_minutes` | int (≥60 expected) | Shorter logged with reason per ethics-protocol §3.1 |
| `session_natural_close_surfaces_walked` | int (**minimum 2** of 3; value < 2 at natural close triggers substitute-participant recruitment per ethics-protocol §3.1; P-10 review-patch: bare int with no minimum is ambiguous) | Surface coverage; ≥60-min natural close covering fewer than 2 triggers substitute-participant recruitment |
| `language_used` | `Hindi` \| `Hindi-Bhojpuri-blend` | Pre-checked at ethics-protocol §2-quater; Bhojpuri-only deflected at pre-check |
| `recording_consent` | `audio-recording-plus-screen-recording-with-consent` \| `screen-recording-only` \| `notes-only` | Per ethics-protocol §3.5 |
| `quotation_re_consent_opt_in` | `yes` \| `no` | Per consent form §2-bis checkbox |
| `at_behavior_documentation_opt_in` | `yes` (default) \| `no` | Per consent form opt-in checkbox; default `yes` because AT-behavior-documentation is load-bearing observation surface |
| `participant_age_band` | `18-30` \| `31-45` \| `46-60` \| `60+` | Demographic context at non-identifying granularity |
| `participant_gender` | `female` \| `male` \| `non-binary` \| `prefer-not-to-say` | Per participant's voluntary disclosure |
| `participant_disability_category` | `visually-impaired` \| `low-vision` \| `blind` \| `partially-sighted` | WHO-ICF level only; specific etiology NOT recorded if disclosure would identify per ethics-protocol §4 |
| `participant_at_modality_used` | enum: `screen-reader-talkback-hindi` \| `screen-reader-talkback-english` \| `screen-reader-nvda` \| `screen-reader-voiceover` \| `magnification-os-level` \| `magnification-browser-zoom` \| `magnification-app-zoom` \| `voice-control-os-supported-hindi` \| `voice-control-os-supported-english` \| `multiple-at-combination` \| `braille-display` \| `switch-access-scanning` \| `eye-tracking` \| `other-non-enumerated-at` (P-21 review-patch; non-enumerated AT modalities added so AT-pre-flight outcome can be captured) | Participant's own AT configuration; researcher does NOT modify per ethics-protocol §3.8. **If `multiple-at-combination`: also populate `participant_at_primary_modality` sub-field** (P-11 review-patch: UX-DR clause evaluation is modality-specific; primary modality must be recorded) |
| `participant_at_primary_modality` | same enum as `participant_at_modality_used`; populated only when `participant_at_modality_used = multiple-at-combination` (P-11 review-patch) | The primary / dominant AT modality when participant uses multiple simultaneously; used to correctly attribute UX-DR clause evaluation verdicts |
| `participant_household_composition` | non-identifying granularity (e.g., "lives independently with weekly family visit") | Voluntary disclosure |
| `prototype_operability_pre_flight_outcome_signup` | `operable` \| `partial` \| `blocking-failure` | AT-pre-flight per surface per ethics-protocol §3.8 |
| `prototype_operability_pre_flight_outcome_my_pool` | `operable` \| `partial` \| `blocking-failure` | AT-pre-flight per surface |
| `prototype_operability_pre_flight_outcome_yogdaan_bahi` | `operable` \| `partial` \| `blocking-failure` | AT-pre-flight per surface |
| `surfaces_walked_through_in_session` | list ⊂ {`signup`, `my-pool`, `yogdaan-bahi`} | Which surfaces were actually walked through during the ≥60-min session — minimum 2-of-3 per ethics-protocol §3.1 |
| `dimension_1_where_they_succeeded` | structured observations + themes + paraphrased participant-words | ≥3 substantive observations expected; verbatim only if re-consent-confirmed per ethics-protocol §2-bis |
| `dimension_2_where_they_got_stuck` | structured observations + themes + paraphrased participant-words + per-stuck-point severity proposal | ≥3 substantive observations expected; severity proposal ∈ {`wcag-aa-defect-must-fix-candidate`, `accessibility-debt-candidate`, `participant-class-extension-needed-candidate`} per finding |
| `dimension_3_at_behavior_that_surprised_the_designer` | researcher-led observations + participant-confirmed | ≥5 distinct AT-events expected; AT-event-by-event log |
| `dimension_4_copy_or_interaction_patterns_that_broke` | paraphrased observations + specific copy/interaction citations + severity proposal | Per-finding severity proposal as above |
| `dimension_5_cultural_grammar_cross_cutting` | participant-led observations about Hindi-Devanagari-AT-grammar | Cross-cutting observations the trust must respect |
| `ux_dr_clause_evaluation_engagement_status` | `opted-in-all-clauses` \| `opted-in-partial-N-clauses` \| `declined-mid-session` \| `not-offered-due-to-pacing-constraint` \| `not-offered-due-to-participant-emotional-state` | Per ethics-protocol §3.7 mid-session opt-in offer |
| `cross_cutting_at_grammar_engagement_status` | same shape as above | Per ethics-protocol §3.7 |
| `divergence_flags` | list of `{assumption_id, observation_paraphrased}` | Any observation that contradicts a pre-stated assumption per `assumption-inventory.md` — source data for divergence-log Task 9 population |
| `quotation_log` | list of `{quote_paraphrase, quote_verbatim_if_any, re_consent_status}` | Re-consent-status enum: `paraphrased-only` \| `re-consent-pending` \| `re-consent-confirmed-YYYY-MM-DD` \| `re-consent-declined-participant-withdrew-quote` \| `re-consent-re-approved-after-withdrawal-YYYY-MM-DD` per Story 0.9 P-16; most recent status entry is authoritative |
| `at_behavior_event_log` | timestamped list of `{timestamp, at_event_type, surface, observed_behavior, researcher_interpretation, participant_confirmation_or_correction, severity_proposal}` | AT-event-by-event log; opt-out default if `at_behavior_documentation_opt_in = no` |
| `withdrawal_status` | `active` \| `withdrawn-mid-session-destroy` \| `withdrawn-mid-session-retain-anonymized-for-participant` \| `withdrawn-mid-session-retain-under-modified-consent` \| `withdrawn-before-synthesis` \| `withdrawn-after-synthesis-synthesis-suspended` \| `granular-quote-withdrawal-active` \| `granular-at-behavior-observation-withdrawal-active` | Per ethics-protocol §5; P-22 review-patch: three mid-session sub-options from variant 2 now representable; D-03 review-patch: `withdrawn-after-synthesis-synthesis-suspended` captures variant 4 suspension state |
| `note_authored_within_24h` | boolean (timestamp check) | Per ethics-protocol §3 + §6 post-session window |
| `supplementary_addendum_log` | list of `{addendum_timestamp, addendum_content, addendum_within_24h}` | Within-24-hour-window supplementary content per Story 0.9 P-21 precedent |

## Worked-example structural skeleton

> **Structural placeholder only** per Story 0.9 P-11 precedent. NO fabricated verbatim content. Researcher populates from lived session data at Task 8.

```yaml
pseudonym: VI-Member-1
session_date: YYYY-MM-DD
session_setting_type: <participant-chosen-setting-type>
session_setting_district_slug: Bihar district <slug>
session_duration_minutes: <int>
session_natural_close_surfaces_walked: <int>
language_used: Hindi  # or Hindi-Bhojpuri-blend
recording_consent: <enum>
quotation_re_consent_opt_in: <yes|no>
at_behavior_documentation_opt_in: <yes|no>
participant_age_band: <band>
participant_gender: <gender>
participant_disability_category: <category>
participant_at_modality_used: <modality>
participant_household_composition: <description>
prototype_operability_pre_flight_outcome_signup: <operable|partial|blocking-failure>
prototype_operability_pre_flight_outcome_my_pool: <operable|partial|blocking-failure>
prototype_operability_pre_flight_outcome_yogdaan_bahi: <operable|partial|blocking-failure>
surfaces_walked_through_in_session:
  - <surface-1>
  - <surface-2>
dimension_1_where_they_succeeded:
  - observation: <paraphrased>
    theme: <theme>
    participant_words_paraphrased: <paraphrase>
    verbatim_if_re_consented: <quote OR null>
dimension_2_where_they_got_stuck:
  - observation: <paraphrased>
    theme: <theme>
    severity_proposal: <wcag-aa-defect-must-fix-candidate | accessibility-debt-candidate | participant-class-extension-needed-candidate>
    participant_words_paraphrased: <paraphrase>
dimension_3_at_behavior_that_surprised_the_designer:
  - at_event_type: <type>
    surface: <surface>
    observed_behavior: <description>
    researcher_interpretation: <interpretation>
    participant_confirmation_or_correction: <participant input>
dimension_4_copy_or_interaction_patterns_that_broke:
  - observation: <paraphrased>
    specific_copy_or_interaction_citation: <citation>
    severity_proposal: <enum>
dimension_5_cultural_grammar_cross_cutting:
  - observation: <paraphrased>
    theme: <theme>
ux_dr_clause_evaluation_engagement_status: <enum>
cross_cutting_at_grammar_engagement_status: <enum>
divergence_flags:
  - assumption_id: <e.g., A-ux-dr66-same-product>
    observation_paraphrased: <paraphrase>
quotation_log:
  - quote_paraphrase: <paraphrase>
    quote_verbatim_if_any: <null OR quote>
    re_consent_status: <enum>
at_behavior_event_log:
  - timestamp: <HH:MM>
    at_event_type: <type>
    surface: <surface>
    observed_behavior: <description>
    researcher_interpretation: <interpretation>
    participant_confirmation_or_correction: <participant input>
    severity_proposal: <enum>
withdrawal_status: active
note_authored_within_24h: true
supplementary_addendum_log: []
```

## Cross-references

- Schema-derived columns map to synthesis-schema §3 per-dimension sections
- `divergence_flags` feed `divergence-log.md` rows at Task 9 synthesis time
- `quotation_log` re-consent statuses gate verbatim inclusion in synthesis per ethics-protocol §2-bis
- `at_behavior_event_log` feeds synthesis §3 dimension-3 observation + UX-DR clause-evaluation worksheet population
