# Per-Shift Note Schema — P0-2d Operator Shadowing

> Per-shift notes are filed in `_bmad-output/research/p0-2d-operator-shadowing-protocol/shift-notes/operator-1-shift-N.md` per ethics-protocol §4 + §6. **All identity pseudonymized.** Per-call rows are categorical-only — no caller identity, no caller-personal-content, no specific case details.

## File header

```yaml
operator_pseudonym: Operator-1   # or Operator-1A if substitute
host_helpline_pseudonym: HostHelpline-1   # or HostHelpline-1A if substitute
host_institution_type: <welfare-trust | cooperative-trust | community-trust>
shift_date: YYYY-MM-DD
shift_number: 1   # 1 for first shift, 2 for second shift, etc.
shift_duration_total_hours: <decimal>   # total time researcher present, including non-call
shift_duration_observed_call_hours: <decimal>   # cumulative observed-call time: caller-consent-given calls only; caller-ended-call-abruptly pre-hang-up duration excluded (per ethics-protocol §3.1 ≥4h gate definition)
language_used_with_operator: <Hindi | Hindi-Bhojpuri-blend | Hindi-English-blend>
observer_positioning: <audio-call-in-room-out-of-line | video-call-behind-operator-out-of-frame>
recording_mode: <notes-only | notes-plus-audio-of-operator-screen-narration | notes-plus-host-helpline-call-recording>
recording_consent_host_helpline: <confirmed-at-shift-start | not-applicable>
notes_authored_within_24h: <true | false>
withdrawal_status: <not-withdrawn | withdrawn-mid-shift | shift-ended-by-host-helpline-operational-emergency | researcher-self-care-end>
shift_ended_early: <true | false>   # true for any withdrawal_status other than not-withdrawn; required when P-39 emergency-shift-end rule triggers
```

## Per-call observation rows

One row per observed call within the shift. The two valid `caller_consent_status` values for a data row are `caller-consent-given` (full observation) and `caller-ended-call-abruptly` (pre-hang-up observations retained per ethics-protocol §3.8). Calls where caller declined, did not respond, or revoked mid-call are NOT data rows — they are tallied in the per_shift_consent_tally only.

```yaml
per_call_rows:
  - call_index: 1
    call_start_time: HH:MM
    call_end_time: HH:MM
    call_duration_seconds: <integer>
    caller_consent_status: caller-consent-given
    caller_demographic_summary_at_non_identifying_granularity:
      # Non-identifying categorical only — NO names, NO mobile, NO Aadhaar, NO Pariwar-ID
      # Examples: rough age band, rough gender (if discernible from voice), rough emotional state
      # RE-IDENTIFICATION WARNING: In sub-50-member trusts, caller_age_band + caller_emotional_state + call_category_primary may narrow to 1-2 individuals. Apply additional coarsening (e.g., omit age_band or use only "member-class-typical" descriptor) if the combination risks re-identification.
      caller_age_band: <youth | adult | senior | unclear>
      caller_emotional_state: <calm | concerned | distressed | unclear>
    call_category_primary: <claim-related | contribution-related | KYC | technical | complaint | other>
    call_category_sub: <free-text categorical only; e.g., claim-status-inquiry, claim-document-submission>
    operator_workflow_steps_taken:
      # Per Story 10.3 5-step workflow
      - step_1_member_lookup: <observed | not-observed | improvised>
      - step_2_category_selection: <observed | not-observed | improvised>
      - step_3_body_capture: <observed | not-observed | improvised>
      - step_4_readback_confirmation: <observed | not-observed | skipped>
      - step_5_submit: <observed | not-observed | improvised>
    operator_member_lookup_criteria_used:
      # Per UX-DR45 4-criteria — categorical only
      - name: <used | not-used>
      - mobile: <used | not-used>
      - aadhaar_masked: <used | not-used>
      - pariwar_id: <used | not-used>
      - other: <free-text; e.g., school-name, district>
    operator_readback_fields_used:
      # Per UX-DR46 3-field — categorical only
      - name: <used | not-used>
      - mobile_last4: <used | not-used>
      - school_district: <used | not-used>
      - other: <free-text>
    caller_pain_point_category_if_observed:
      # Dimension 3 (common caller pain points) — per question-bank §3 anti-leading carve-out
      # CRITICAL: categorical level only. DO NOT capture specific caller incident, account detail, or case history.
      pain_point_observed: <yes | no>
      pain_point_category: <lookup-failure | status-confusion | payment-failure | document-confusion | escalation-frustration | other | not-observed>
      pain_point_resolution_status: <apparently-resolved | pending | escalated | unclear>
    escalation_status: <no-escalation | escalated-to-supervisor | escalated-to-peer-operator | escalated-to-host-helpline-operations-lead>
    escalation_trigger_if_applicable: <caller-request | non-standard-scenario | policy-boundary | technical-limitation | other>
    operator_improvisation_if_observed:
      # Categorical only — no specifics; record category, trigger, recurrence flag
      improvisation_observed: <yes | no>   # gate field — if no, sub-fields are N/A
      improvisation_category: <workflow-step-skip | workflow-step-reorder | informal-routing | informal-escalation-shortcut | informal-data-capture-format | informal-closing-pattern | other | N/A>
      improvisation_trigger: <caller-specific-need | tool-limitation | time-pressure | supervisor-unavailability | other | N/A>
      improvisation_recurrence: <one-time | routine-pattern | N/A>
    operator_wishlist_comment_if_volunteered:
      # Only if operator voluntarily mentioned; categorical only
      wishlist_volunteered: <yes | no>   # gate field — if no, sub-fields are N/A
      wishlist_category: <member-lookup-improvement | category-selection-improvement | readback-card-improvement | escalation-handover-improvement | sla-tracking-improvement | other | N/A>
      wishlist_concreteness: <concrete-specific-tooling-change | aspirational-general-improvement | N/A>
    register_grammar_observations:
      # Categorical only — operator's language patterns, NOT caller's words
      call_opening_register: <formal-hindi | informal-hindi | hindi-bhojpuri-blend | english-hindi-blend>
      closing_pattern: <standard | improvised>
      pacing_under_caller_emotional_load: <slowed | repeated | special-register | normal>
      ux_dr55_operator_uses_precise_technical: <yes | no | mixed>
      ux_dr55_translates_to_informal_for_caller: <yes | no | not-applicable>
    decision_strip_options_used:
      # Per UX spec line 1688 — observed during call
      - save_progress: <used | not-used>
      - finalize_intake: <used | not-used>
      - transfer_to_supervisor: <used | not-used>
      - suspend_call: <used | not-used>
      - other: <free-text; e.g., case-held-pending-document-receipt>
    per_call_divergence_flag:
      # Does this call's observation contradict an assumption-inventory.md row?
      - flagged: <yes | no>
        affected_assumption_id: <if flagged>
        divergence_observation: <categorical-only description>
    notes_pseudonymization_verified:
      no_operator_real_identity: <true>
      no_host_helpline_real_identity: <true>
      no_caller_identity: <true>
      no_caller_personal_content: <true>
```

## Per-shift consent tally

At end of shift, the researcher records the consent tally per ethics-protocol §3.8 + caller-consent-spoken-script §5:

```yaml
per_shift_consent_tally:
  total_calls_in_shift: N   # in-scope calls only: calls for which the consent prompt was attempted. Excludes wrong-number calls, internal admin calls, and calls ended before consent prompt was delivered.
  caller_consent_given: N   # data rows (per_call_rows)
  caller_consent_declined: N   # tally only — NOT data rows
  caller_consent_no_response: N   # tally only
  caller_consent_revoked_mid_call: N   # tally only
  caller_ended_call_abruptly: N   # tally only
  emotional_overload_observer_discretion_end: N   # tally only
```

## Shift summary

```yaml
shift_summary:
  total_observed_call_count: N
  total_observed_call_time_hours: <decimal>
  category_distribution:
    claim_related: <count>
    contribution_related: <count>
    kyc: <count>
    technical: <count>
    complaint: <count>
    other: <count>
  escalation_distribution:
    no_escalation: <count>
    escalated_to_supervisor: <count>
    escalated_to_peer_operator: <count>
    other: <count>
  pain_point_distribution:
    lookup_failure: <count>
    status_confusion: <count>
    payment_failure: <count>
    document_confusion: <count>
    escalation_frustration: <count>
    other: <count>
  improvisation_observed_count: <count>
  wishlist_volunteered_count: <count>
  cross_shift_pattern_seed_notes:
    # Seed observations the researcher wants to follow up in subsequent shifts (NOT synthesis-level findings)
    - <categorical observation>
```

## Supplementary addendum log

(Per Story 0.9 P-21 + Story 0.10 precedent.)

```yaml
supplementary_addendum:
  # Any addendum to the per-shift note authored AFTER initial 24-hour authoring window
  - addendum_date: YYYY-MM-DD
    addendum_reason: <re-consent-for-quotation | trustee-review-revision | divergence-flag-clarification | other>
    addendum_content: <free-text>
```

## Quotation log

(Per ethics-protocol §2-bis.)

```yaml
quotation_log:
  # Per-quote re-consent tracking
  - quote_index: 1
    quote_paraphrase: <paraphrase; default state>
    quote_verbatim_pending_re_consent: <true | false>
    re_consent_status:
      requested_date: YYYY-MM-DD
      requested_via: host-helpline-institution-mediated channel
      response_date: <YYYY-MM-DD | pending>
      response_status: <approved | declined | pending | pending-fallback-timeout>
      response_marker: <[quote-re-confirmed YYYY-MM-DD] | re-consent-declined-operator-withdrew-quote | re-consent-re-approved-after-withdrawal-YYYY-MM-DD>
```

## Pseudonymization verification at note finalization

Before filing the per-shift note, the researcher verifies:

- [ ] No operator real name in any field
- [ ] No host-helpline real institutional name in any field
- [ ] No caller identity (name, mobile, Aadhaar, Pariwar-ID, school, district at identifying granularity) in any field
- [ ] No caller-personal-content (specific case details, specific incidents, specific account details) in any field
- [ ] All identifier fields use pseudonyms (`Operator-1`, `HostHelpline-1`)
- [ ] Demographic context at non-identifying granularity only (host-institution-type sector-level; Hindi-fluency-tier proficiency-level; experience-tier band-level; caller-age-band; caller-emotional-state)

## Structural-placeholder-only worked-example skeleton

(Per Story 0.9 P-11 + Story 0.10 precedent — showing how a per-call dimension-1 call-category observation is recorded WITHOUT inventing substantive content.)

```yaml
# WORKED EXAMPLE STUB (not real data; structural placeholder only)
per_call_rows:
  - call_index: 1
    call_start_time: HH:MM
    call_end_time: HH:MM
    call_duration_seconds: <number>
    caller_consent_status: caller-consent-given
    caller_demographic_summary_at_non_identifying_granularity:
      caller_age_band: <adult or whatever observed>
      caller_emotional_state: <calm or whatever observed>
    call_category_primary: <one of the categories observed>
    call_category_sub: <free-text categorical sub-category if any>
    operator_workflow_steps_taken:
      - step_1_member_lookup: observed
      # ... rest of structure as above
    operator_improvisation_if_observed:
      improvisation_category: <category if observed; else 'none'>
    register_grammar_observations:
      call_opening_register: <register observed>
    per_call_divergence_flag:
      - flagged: <yes if observation contradicts an assumption row; else no>
        affected_assumption_id: <if flagged>
        divergence_observation: <categorical-only description if flagged>
```

This skeleton illustrates the per-call data shape **without inventing substantive content**. Task 9 substantive synthesis authoring populates real per-call observations from lived shadowing.
