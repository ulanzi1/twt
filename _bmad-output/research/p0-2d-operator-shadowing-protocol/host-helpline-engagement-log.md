# Host-Helpline Engagement Log — P0-2d Operator Shadowing

> **Pseudonym-to-engagement-path log** for the host helpline + operator pair (1 host-helpline + 1 operator at AC-1 minimum).
>
> **Substantive identity is NDA territory stored out-of-band per ethics-protocol §4.** This log carries pseudonyms + engagement-paths + dates + outcome-fields ONLY.
>
> At Task 5 author-commit, this log carries the schema header + 1 pending-engagement row (`HostHelpline-1` + `Operator-1`) with `engagement_status = pending-engagement`.

## Schema columns

| Column | Meaning |
|---|---|
| `pseudonym_host_helpline` | `HostHelpline-1` canonical; `HostHelpline-1A` substitute per Story 0.9 P-07 |
| `pseudonym_operator` | `Operator-1` canonical; `Operator-1A` substitute |
| `engagement_path` | Trustee-mediated path: `TSCT-trustee-referral` / `NSCT-analogous-referral` / `trustee-personal-network` / `analogous-Indian-welfare-cooperative-trust-referral` |
| `host_institution_type` | Sector-level only: `welfare-trust` / `cooperative-trust` / `community-trust` |
| `host_helpline_approval_date` | Date of `pre-shadowing-001` approval per `trustee-review-log.md` |
| `host_helpline_named_contact_pseudonym` | Pseudonym for host-institution-named contact for revocation per ethics-protocol §2-quater (e) |
| `trustee_pre_shadowing_approval_date` | Date of `pre-shadowing-002` approval. **Must be ≥ `host_helpline_approval_date`** per ethics-protocol §2-quater sequencing invariant (host-helpline approval is a precondition for Trustee Panel approval). |
| `operator_consent_obtained_date` | Date of operator written consent per ethics-protocol §2 |
| `operator_consent_format` | `hindi-handwritten-signature` / `hindi-thumbprint-with-witness` / `english-handwritten-signature` (per Story 0.9 P-14 alternative) |
| `operator_hindi_fluency_tier` | `native` / `fluent` / `working` (per ethics-protocol §4 non-identifying granularity) |
| `operator_experience_tier` | `<1 year` / `1-3 years` / `3-5 years` / `5+ years` (per ethics-protocol §4 non-identifying granularity) |
| `shift_1_scheduled_date` | Scheduled date of shift 1 |
| `shift_1_conducted_date` | Actual date of shift 1 |
| `shift_2_scheduled_date` | Scheduled date of shift 2 |
| `shift_2_conducted_date` | Actual date of shift 2 |
| `shift_N_scheduled_dates` | Additional shifts if needed for ≥4-hour minimum |
| `shift_N_conducted_dates` | Actual dates |
| `total_observed_call_time_hours` | Cumulative across all shifts; counts `caller-consent-given` call duration only — `caller-ended-call-abruptly` pre-hang-up duration excluded (consistent with ≥4-hour threshold gate per ethics-protocol §3.1) |
| `total_observed_call_count` | Cumulative; counts all data rows: `caller-consent-given` calls AND `caller-ended-call-abruptly` calls (pre-hang-up observations retained per ethics-protocol §3.8) |
| `caller_consent_declined_count` | Tally across shifts |
| `caller_consent_revoked_mid_call_count` | Tally across shifts |
| `caller_consent_no_response_count` | Tally across shifts |
| `caller_ended_call_abruptly_count` | Tally across shifts; caller ended call abruptly before or during consent prompt — pre-hang-up observations retained as data rows (counted in `total_observed_call_count`); separate tally for rate derivation in synthesis-schema §2 |
| `emotional_overload_observer_discretion_end_count` | Tally across shifts |
| `engagement_status` | `pending-engagement` / `engagement-active` / `engagement-complete` / `engagement-suspended` / `engagement-withdrawn` / `host-helpline-revoked-consent` / `operator-withdrawn-before-shadowing` / `operator-withdrawn-mid-shadowing` / `operator-withdrawn-after-shadowing` |
| `withdrawal_status` | If applicable: `withdrawn-before-shadowing` / `withdrawn-mid-shift` / `withdrawn-before-synthesis` / `withdrawn-after-synthesis` / `researcher-self-care-end` (per ethics-protocol §7; triggers substitute-shift escalation per §3.1) |
| `substitute_assignment_status` | If applicable: `substitute-host-helpline-engaged` (→ `HostHelpline-1A`) / `substitute-operator-engaged` (→ `Operator-1A`) |
| `compensation_paid` | `none` / `travel-reimbursement` / `time-stipend` / `travel-plus-stipend` |
| `cross_link_to_trustee_review_log` | Cross-link to `trustee-review-log.md` rows |
| `notes` | Free-text categorical-only notes |

---

## Engagement rows

### Row 1 — Primary engagement

```yaml
pseudonym_host_helpline: HostHelpline-1
pseudonym_operator: Operator-1
engagement_path: pending
host_institution_type: pending
host_helpline_approval_date: pending
host_helpline_named_contact_pseudonym: pending
trustee_pre_shadowing_approval_date: pending
operator_consent_obtained_date: pending
operator_consent_format: pending
operator_hindi_fluency_tier: pending
operator_experience_tier: pending
shift_1_scheduled_date: pending
shift_1_conducted_date: pending
shift_2_scheduled_date: pending
shift_2_conducted_date: pending
shift_N_scheduled_dates: []
shift_N_conducted_dates: []
total_observed_call_time_hours: 0
total_observed_call_count: 0
caller_consent_declined_count: 0
caller_consent_revoked_mid_call_count: 0
caller_consent_no_response_count: 0
caller_ended_call_abruptly_count: 0
emotional_overload_observer_discretion_end_count: 0
engagement_status: pending-engagement
withdrawal_status: not-withdrawn
substitute_assignment_status: not-applicable
compensation_paid: pending
cross_link_to_trustee_review_log:
  - pre-shadowing-001
  - pre-shadowing-002
  - post-synthesis-001
notes: |
  Author-commit row at Task 5 (2026-05-31). Engagement details populated at Task 7 _AWAITING EXTERNAL ACTION_:
  - Host helpline institution approach via trustee-mediated path (TSCT/NSCT/analogous; cold approach FORBIDDEN per ethics-protocol §3.0)
  - Host helpline operations lead grants formal written approval covering (a)-(e) per ethics-protocol §2-quater
  - Trustee Panel approves shadowing engagement per ethics-protocol §2-tris
  - Operator nomination by host helpline operations lead (multiple candidates may be suggested; Solo Builder selects based on shift-availability + Hindi-fluency + experience-tier)
  - Operator signs Hindi informed consent per ethics-protocol §2 (a)-(i)
  - Shifts scheduled: ≥2 distinct shifts within 60 days; total observed-call time target ≥4 hours
```

### Row 2 — Substitute engagement (reserved; populated only if needed)

```yaml
pseudonym_host_helpline: HostHelpline-1A
pseudonym_operator: Operator-1A
engagement_path: pending
# ... rest of structure as Row 1; populated only if substitute engagement triggered
engagement_status: not-applicable-unless-substitute-triggered
notes: |
  Reserved row for substitute engagement. Activated if:
  - First host helpline declines approval OR revokes mid-engagement
  - First operator withdraws OR withdraws-after-synthesis
  - Caller-consent-decline-rate too high to accrue ≥4-hour observed-call time at first host helpline
  Substitute pseudonyms `HostHelpline-1A` + `Operator-1A` assigned per Story 0.9 P-07 + ethics-protocol §4 precedent.
```

---

## Substitute discipline

Per ethics-protocol §3.1 + README §8 ADR slot 9 + Story 0.9 P-07 precedent:

- **Operator withdraws before shadowing:** substitute operator recruited via same host-institution-mediated path (same host helpline if approval still active); pseudonym `Operator-1A`
- **Host helpline revokes consent:** substitute host helpline engaged via same trustee-mediated path; pseudonyms `HostHelpline-1A` + `Operator-1A`
- **Caller-consent-decline-rate too high (observed-call time falls short of ≥4 hours):** third shift scheduled OR substitute host helpline engaged
- **Operator withdraws after synthesis:** synthesis suspended as unit per Story 0.10 D-03 precedent; substitute operator's shadowing re-runs from scratch

## Append-only discipline

Rows are append-only. Engagement status changes (e.g., `pending-engagement` → `engagement-active` → `engagement-complete`) are recorded via in-place column updates (NOT supersession rows; per Story 0.10 precedent). Substantive identity changes (e.g., substitute pseudonym assignment) trigger Row 2 activation, not Row 1 supersession.

**Intentional asymmetry vs trustee-review-log:** The trustee-review-log records verdict changes via supersession rows (discrete review decisions requiring audit trail). This log uses in-place updates for engagement status (continuous operational state). For engagement events with audit significance (revocation, withdrawal, emergency-approval-expiry triggered suspension), a dated entry in the `notes` field is the required record.

## Substantive identity NDA territory

Per ethics-protocol §4:
- Operator real name + contact stored out-of-band per operations policy
- Host helpline real institutional name + contact stored out-of-band per operations policy
- Signed consent form + host-helpline approval letter stored out-of-band per operations policy
- Per-call caller identity NEVER recorded (no out-of-band, no in-framework)

This log carries pseudonyms + engagement-paths + dates + outcome-fields ONLY.
