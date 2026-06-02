# Recruitment Log — P0-2c VI/Low-Vision Member Accessibility Validation

> **Pseudonym-to-recruitment-path mapping.** Does NOT carry substantive name or contact data — those are stored out-of-band per ethics-protocol §4 NDA territory.
>
> This log is the **framework-level audit trail** proving 1 participant was recruited per the protocol. Substantive identity verification is trustee-side via the out-of-band roster.

## Schema columns

| Column | Type / Allowed Values |
|---|---|
| `pseudonym` | `VI-Member-1` (canonical); `VI-Member-1A` (substitute per Story 0.9 P-07 if first participant withdraws after synthesis) |
| `recruitment_path` | enum — see below |
| `recruitment_date` | YYYY-MM-DD |
| `hindi_comprehension_pre_check_outcome` | `passed` \| `failed-not-eligible` per ethics-protocol §2-quater |
| `consent_obtained_date` | YYYY-MM-DD; MUST be after Trustee Panel approval per ethics-protocol §2-tris (P-16 review-patch: ordering invariant — `consent_obtained_date` must be after `trustee-review-log.md` row `pre-session-001` `review_date` with `review_verdict = approved-for-recruitment`; auditor should cross-reference both logs to verify ordering) |
| `consent_type` | `written-signature` \| `thumbprint-with-witness-co-signature` per Story 0.9 D-03 + P-14 precedent |
| `consent_format` | `standard-print` \| `large-print-Hindi` \| `read-aloud` |
| `at_pre_flight_session_date` | YYYY-MM-DD; MUST be after consent + before ≥60-min session |
| `at_pre_flight_outcome` | enum — see below |
| `at_modality_pre_flighted` | enum — see below |
| `prototype_operability_signup` | `operable` \| `partial` \| `non-operable-pre-session` |
| `prototype_operability_my_pool` | `operable` \| `partial` \| `non-operable-pre-session` |
| `prototype_operability_yogdaan_bahi` | `operable` \| `partial` \| `non-operable-pre-session` |
| `session_scheduled_date` | YYYY-MM-DD |
| `session_conducted_date` | YYYY-MM-DD |
| `withdrawal_status` | `active` \| `withdrawn-before-session` \| `withdrawn-during-session-destroy` \| `withdrawn-during-session-retain-anonymized` \| `withdrawn-during-session-retain-modified-consent` \| `withdrawn-before-synthesis` \| `withdrawn-after-synthesis-synthesis-suspended` \| `granular-quote-withdrawal-active` \| `granular-at-behavior-observation-withdrawal-active` (P-22/D-03 review-patches: mid-session sub-options + synthesis-suspended state added) |
| `quotation_re_consent_engagement` | `pending-synthesis` \| `re-consent-requested-on-N-quotes` \| `re-consent-confirmed-on-N-quotes` \| `re-consent-declined-on-N-quotes` \| `re-consent-pending-fallback-timeout` |
| `at_behavior_documentation_re_consent_engagement` | similar shape — `pending-session` \| `documented-with-opt-in` \| `documented-with-partial-opt-in-N-events` \| `not-documented-per-opt-out` |

## Recruitment path enum

| Value | Meaning |
|---|---|
| `bihar-disability-network` | Bihar disability network (National Federation of the Blind Bihar chapter / NAB Bihar / analogous) |
| `school-inclusion-network` | School-inclusion network (Vaishali district govt-aided inclusion programmes) |
| `bihar-state-welfare-board` | Bihar State Welfare Board for Persons with Disabilities or analogous govt welfare body |
| `trustee-referral` | Trustee referral leveraging trustee personal-network |
| `hindi-disability-ngo` | Hindi-language disability NGO referral if such with appropriate ethical standing exists |

## AT-pre-flight outcome enum (P0-2c-distinct)

| Value | Meaning | Next action |
|---|---|---|
| `prototype-operable-with-participant-at-config` | Participant's AT navigates all 3 prototype surfaces successfully in ≤15-min pre-flight | Proceed to ≥60-min session |
| `partial-operability-N-of-3-surfaces` | Participant's AT navigates N (1 or 2) of 3 surfaces; inaccessible surface(s) noted | Proceed to ≥60-min session; inaccessible surface(s) marked `not-evaluated-due-to-prototype-surface-coverage-gap` in worksheet |
| `at-pre-flight-blocking-failure-unable-to-proceed` | Participant's AT cannot interact with prototype substrate at all | Recruit substitute participant per disability-network paths; recruitment-log row marked accordingly |

## AT modality enum

| Value | Meaning |
|---|---|
| `screen-reader-talkback-hindi` | Android TalkBack in Hindi (canonical P0-2c validation target) |
| `screen-reader-talkback-english` | Android TalkBack in English |
| `screen-reader-voiceover` | iOS VoiceOver |
| `screen-reader-nvda` | NVDA (desktop reference) |
| `screen-reader-jaws` | JAWS (desktop reference) |
| `magnification-os-level` | OS-level zoom |
| `magnification-browser-zoom` | Browser zoom (web/Astro surfaces) |
| `magnification-app-zoom` | App-level zoom (RN apps) |
| `voice-control-os-supported-hindi` | OS-supported Hindi voice input |
| `voice-control-os-supported-english` | OS-supported English voice input |
| `multiple-at-combination` | Participant uses multiple AT modalities simultaneously (record primary modality in per-session-note-schema `participant_at_primary_modality`) |
| `braille-display` | Refreshable Braille display (P-21 review-patch) |
| `switch-access-scanning` | Switch access + scanning interface (P-21 review-patch) |
| `eye-tracking` | Eye-tracking / gaze control interface (P-21 review-patch) |
| `other-non-enumerated-at` | Non-enumerated AT modality — describe in per-session note (P-21 review-patch) |

## Recruitment window (per Story 0.9 D-05 precedent)

**90 days from author-commit** (2026-05-31). If all enumerated paths yield no candidate within 90 days, formal escalation to Trustee Panel for:
- Expanded paths, OR
- Deferral to NFR-22 Phase-2 audit per Story 0.9 D-05 + P-08 precedent.

90-day deadline: **2026-08-29**.

**Substitute recruitment window (P-25 review-patch):** substitute recruitment triggered by a sub-60-min session or fewer-than-2-surface natural close begins a **60-day window from the triggering session date**. If the triggering session occurs on day 89 of the original 90-day window, the substitute window is 60 days from that date (NOT anchored to the original 90-day window). Escalation to Trustee Panel if substitute not found within 60 days per ethics-protocol §3.1.

---

## Recruitment rows

| pseudonym | recruitment_path | recruitment_date | hindi_comprehension_pre_check_outcome | consent_obtained_date | consent_type | consent_format | at_pre_flight_session_date | at_pre_flight_outcome | at_modality_pre_flighted | prototype_operability_signup | prototype_operability_my_pool | prototype_operability_yogdaan_bahi | session_scheduled_date | session_conducted_date | withdrawal_status | quotation_re_consent_engagement | at_behavior_documentation_re_consent_engagement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `VI-Member-1` | **pending-recruitment** | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | `active` | `pending-synthesis` | `pending-session` |

*(Substitute `VI-Member-1A` row appended only if first participant withdraws after synthesis per Story 0.9 P-07 precedent.)*

---

## Notes

- **Substantive identity NDA territory** per ethics-protocol §4 — name + contact stored out-of-band per operations policy, NOT in this log.
- **Trustee does NOT have access to substantive identity** per ethics-protocol §8 — trustee receives only this pseudonymized log + synthesis + per-session note (pseudonymized) + divergence-log + worksheet.
- **`prototype-operability` per-surface columns are populated at AT-pre-flight (Task 7 PRECONDITION-3)** — distinct from the trustee-side prototype-operability checklist at Task 7 PRECONDITION-2 (which is Solo Builder's a-priori operability sign-off before recruitment).
- **`hindi_comprehension_pre_check_outcome = failed-not-eligible`** triggers substitute recruitment per ethics-protocol §2-quater inheriting Story 0.9 D-07.
