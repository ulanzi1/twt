# Counsel Roster

**Authority cite:** Story 0.13 AC-1; `README.md` §4 invariant 11 (multi-counsel permission); `review-scope-charter.md` shortlist criteria; Decision 2026-06-02-013.

**Status:** Author-committed with single template row at `pending-trustee-selection`; named-counsel selection lands at Story 0.13 Task 8.

> **Header note:** The roster is **append-only**. Forbidden-removal rule applied; termination flips status to `terminated` (not row deletion); supersession-marker entry is logged in `engagement-ledger.md` §4 Counsel-selection log. The roster supports MULTIPLE counsel — more than one legal counsel is permitted if the practice-area scope exceeds a single counsel's competence (e.g., one for DPDPA + one for Indian Trust Act + financial-services). At v1 the trust engages one counsel; the framework does not assume one.
>
> **Counsel identity is need-to-know per NDA + COI territory.** The roster lives in the trustee-accessible repo but treats `name` + `firm_affiliation` + `contact` fields as need-to-know per legal counsel's NDA + the trust's operations-policy redaction discipline. If a public mirror context applies, the field is redacted per the ADR-NNNN-engineer-identity-redaction-public-mirror policy + the Story 0.6 / Story 0.13 cross-coupling (cross-reference inventory `kt-5`).

---

## Shortlist criteria

The following criteria inform Story 0.13 Task 7 Trustee Panel scope ratification + Task 8 counsel shortlist + selection process. Mandatory criteria are disqualifying if absent; preferred criteria are tiebreakers.

### Mandatory criteria

| Criterion | Rationale |
|---|---|
| **DPDPA practice** | DPDPA is one of the five AC-named scope items per `review-scope-charter.md` §1(b); MeitY threshold tracking + DPO appointment + breach-reporting tooling + RTBF + consent registry are substantive practice areas. Counsel must have current DPDPA jurisprudence engagement. |
| **Indian Trust Act practice** | The trust is registered (or registering) under Indian Trust Act 1882; Bihar jurisdiction; trust posture per PRD §10.1 + §4.14.1 + FR-94 verbatim phrasings + Niyamavali per Stories 2.3-2.6 are substantive trust-law touchpoints. Counsel must have current Indian Trust Act practice. |
| **Concurrent-review-mode availability** | The engagement is concurrent across the term per `engagement-letter-template.md` §9 + Story 0.13 README §4 invariant 1, NOT per-artifact event-bounded. Counsel must commit availability across the 12-month term per `engagement-letter-template.md` §8. |
| **No prior engagement with TSCT or other operating mutual-aid trust constituting privileged-information conflict** | Per `engagement-letter-template.md` §6 COI disclosure — counsel acknowledges no engagement with TSCT or any other operating mutual-aid trust. TSCT is the precedent + benchmark trust; counsel-side prior engagement with TSCT would create privileged-information conflict. |
| **Professional-indemnity insurance coverage adequate for engagement scope** | Per `engagement-letter-template.md` §12 — counsel carries professional-indemnity coverage protecting against routine review-error claims; coverage limits adequate for the engagement scope per Indian Advocates Act professional-liability framework. |

### Preferred criteria

| Criterion | Tiebreaker rationale |
|---|---|
| **Financial-services regulatory practice** | The trust touches multiple regulatory regimes per PRD §4.14.1 (CPA 2019 + RBI/UPI + Income Tax 12A/12AB + GST + 80G Phase 2/3 + TRAI DLT-transactional + FCRA Phase 2/3). Counsel with financial-services regulatory practice carries cross-statutory analysis competence. |
| **Bihar/Hindi context familiarity** | The Niyamavali is Hindi-primary; Bihar Trust registration; Bihar-specific cooperative-society law nuances (PRD §4.14.1 OQ-pending); Hindi-vernacular legal-text review competence per `review-scope-charter.md` §1(a) trust-posture copy review. Counsel with Bihar + Hindi context engagement is better-fit. |
| **Track record with mutual-aid trusts or cooperative societies** | The mutual-aid trust posture is distinct from for-profit insurance + financial-services + investment-fund. Counsel with mutual-aid trust precedent has frame-fit for FR-94 trust posture clauses + facilitator-not-intermediary framing. |
| **Pre-launch checkpoint coverage commitment** | Counsel commits availability at the named pre-launch checkpoints per `review-scope-charter.md` §6 (Phase-0 closure, T&C version-pin lock, first-claim SM-1 pre-launch, public-launch gate). Counsel with checkpoint-commitment capacity is preferred. |
| **Counsel-side practice-management tool + encrypted document-exchange protocol** | The deferred ADR per `adr-index.md` Section K row #1 + row #2 — counsel with established practice-management + encrypted-exchange infrastructure reduces setup cost + improves audit-readiness. |

### Disqualifying criteria

| Criterion | Disqualification rationale |
|---|---|
| Disclosed-with-unmanaged-conflicts COI per `engagement-letter-template.md` §6 | Unmanaged conflicts that cannot be mitigated via management plan are grounds for non-engagement. |
| Lack of concurrent-review-mode availability | Per-artifact-only engagement pattern is incompatible with the engagement nature per `engagement-letter-template.md` §2 + §9. |
| Inadequate professional-indemnity insurance coverage | Sub-threshold coverage is grounds for non-engagement per `engagement-letter-template.md` §12. |
| Prior engagement with TSCT or operating mutual-aid trust constituting privileged-information conflict | Per the mandatory criterion above. |
| Non-Bar-Council-of-India enrollment | Counsel must be enrolled with Bar Council of India; non-enrolled or sub-enrolled status is disqualifying. |

---

## Schema

| Field | Description |
|---|---|
| `counsel_id` | Slug; assigned post-selection (e.g., `lc-1`); at template row, `template-pending-selection` |
| `name` | Counsel's name (need-to-know per NDA) |
| `firm_affiliation` | Sole practitioner OR firm OR chambers; firm name (need-to-know per NDA) |
| `practice_areas` | DPDPA practice + Indian Trust Act practice + financial-services regulatory practice + Bihar/Hindi context familiarity + concurrent-review-mode availability per shortlist criteria |
| `qualification_status` | Lifecycle: `pending-trustee-shortlist` → `shortlisted` → `interviewed` → `selected` → `engaged` → `terminated` |
| `nda_signature_status` | `unsigned` OR `signed` + signature date + NDA-on-file-location |
| `engagement_letter_signature_status` | Same shape as `nda_signature_status` |
| `coi_disclosure_status` | `pending` OR `disclosed-no-conflicts` OR `disclosed-with-managed-conflicts` (with management plan documented) OR `disclosed-with-unmanaged-conflicts-disqualifying` |
| `last_quarterly_review_date` | Per `engagement-ledger.md` §9 quarterly engagement-health review |
| `last_engagement_event_date` | Most recent counsel-engagement event (return-receipt, COI re-disclosure, SLA acknowledgment, etc.) |
| `status` | Lifecycle: `pending-trustee-selection` → `shortlisted` → `engaged-not-onboarded` → `active` → `paused` → `terminated` |

**Allowed-values legend for `status`:**
- `pending-trustee-selection` — at author-commit (template row); awaiting Trustee Panel shortlist process at Task 7
- `shortlisted` — appended to roster by Trustee Panel + Solo Builder per Task 8 outreach; interview-pending
- `engaged-not-onboarded` — selected + signed engagement letter + NDA + COI disclosure on file; pre-onboarding window
- `active` — onboarded + first-artifact submitted + ongoing concurrent-review per term
- `paused` — temporary suspension (e.g., counsel on extended leave; Trustee Panel-initiated pause for specific scope-area review). **SLA clock rules during pause:** Trustee-Panel-initiated pauses suspend all per-artifact SLA clocks for the duration; counsel-initiated pauses do NOT suspend SLA clocks — the SLA-breach-tracking per `engagement-ledger.md` §8 continues and may trigger the ≥3-in-quarter Trustee Panel review. `paused → active` reactivation requires written Trustee Panel re-activation notice recorded in `engagement-ledger.md` §4 Counsel-selection log.
- `terminated` — engagement ended (mutual / for-cause / 60-day-notice per `engagement-letter-template.md` §13); row preserved with `terminated` status + supersession-marker; substitute counsel engagement (per `README.md` §5 fallback) is a new row append

**Allowed-values legend for `qualification_status`:**
- `pending-trustee-shortlist` — added to roster pre-shortlist (e.g., suggested by Trustee Panel network)
- `shortlisted` — Trustee Panel + Solo Builder added to shortlist per criteria match
- `interviewed` — interview conducted; outcome documented in `engagement-ledger.md` §4 Counsel-selection log
- `selected` — Trustee Panel + Solo Builder ratified selection; awaiting engagement-letter signature event
- `engaged` — engagement-letter signed; equivalent to `status = active`
- `terminated` — engagement ended; row preserved with `qualification_status = terminated`

---

## Template row (at author-commit; `pending-trustee-selection` status)

| Field | Value |
|---|---|
| `counsel_id` | `template-pending-selection` |
| `name` | `<PENDING-TASK-8-SELECTION>` (need-to-know per NDA; populates post-selection) |
| `firm_affiliation` | `<PENDING-TASK-8-SELECTION>` (need-to-know per NDA; populates post-selection; one of: sole practitioner, firm, chambers) |
| `practice_areas` | `<PENDING per shortlist outreach: DPDPA practice required; Indian Trust Act practice required; concurrent-review-mode availability required; no-TSCT-conflict required; professional-indemnity insurance coverage required; financial-services regulatory practice preferred; Bihar/Hindi context familiarity preferred; mutual-aid trust track record preferred>` |
| `qualification_status` | `pending-trustee-shortlist` |
| `nda_signature_status` | `unsigned` |
| `engagement_letter_signature_status` | `unsigned` |
| `coi_disclosure_status` | `pending` |
| `last_quarterly_review_date` | `<not-yet>` |
| `last_engagement_event_date` | `<not-yet>` |
| `status` | `pending-trustee-selection` |

---

## Outreach paths (Task 8 reference)

Per Story 0.13 Task 8, Solo Builder + Trustee Panel execute the counsel shortlist outreach through the following paths:

1. **Trustee Panel professional network** — direct trustee referrals from existing legal-counsel contacts
2. **Bar Council of Bihar referrals** — published-practice-area referrals from the Bar Council
3. **Existing legal-counsel contacts of board members** — pre-existing relationships with qualified counsel
4. **Published-practice-DPDPA-experts in Hindi-language jurisdictions** — published-case-list + DPDPA-jurisprudence-author counsel + trade-press identified
5. **Mutual-aid-trust precedent network** — TSCT board's network for counsel-recommendation (cross-checked against the no-TSCT-conflict mandatory criterion); other operating mutual-aid trusts' counsel-recommendations (subject to COI clearance)

**Minimum shortlist size:** ≥2 candidates per the framework discipline. Single-candidate selection is permitted per Trustee Panel discretion but the rationale is documented per `engagement-ledger.md` §4 Counsel-selection log.

**Interview process:** Trustee Panel + Solo Builder conduct interviews with shortlisted candidates per `engagement-ledger.md` §4 schema; outcomes documented per the schema.

---

## Multi-counsel pattern (README §4 invariant 11)

The framework permits multiple counsel if practice-area coverage requires. If at Task 8 selection no single counsel satisfies all mandatory practice-area criteria, the Trustee Panel may engage 2-3 counsel under separate engagement letters per `engagement-letter-template.md` (separate engagement letter per counsel; cross-coordination protocol per the deferred ADR `adr-index.md` Section K row #8).

**Multi-counsel engagement-letter discipline:** each counsel signs a separate engagement letter; pricing structures + SLAs are committed per-counsel; the Trustee Panel coordinates per the deferred ADR `adr-index.md` Section K row #8.

> **Note:** the specific multi-counsel coordination mechanism — per-scope-area lead counsel assignment, artifact-routing protocol, cross-coupling artifact handling — is ADR-territory per `README.md` §7 ADR slot #8. The coordination design commits at the ADR, not at this roster-level property commit.

---

## Lifecycle log

(Populated as the roster lifecycle progresses through Tasks 8-11. Schema-only at author-commit.)

| Date | Event | counsel_id | Old status | New status | Note |
|---|---|---|---|---|---|
| 2026-06-02 | Author-commit — template row created at `pending-trustee-selection` | `template-pending-selection` | (none) | `pending-trustee-selection` | Story 0.13 Task 5 author-commit. |
| `<PENDING-TASK-8>` | Shortlist candidate appended | `<lc-N>` | (none) | `shortlisted` | Per Trustee Panel + Solo Builder outreach. |
| `<PENDING-TASK-8>` | Interview conducted | `<lc-N>` | `shortlisted` | `interviewed` | Per `engagement-ledger.md` §4. |
| `<PENDING-TASK-8>` | Selection ratified | `<lc-N>` | `interviewed` | `selected` | Trustee Panel + Solo Builder selection event. |
| `<PENDING-TASK-9>` | NDA signed | `<lc-N>` | `selected` | `selected` (nda_signature_status flipped) | Counsel-side NDA signature event. |
| `<PENDING-TASK-9>` | COI disclosure filed | `<lc-N>` | `selected` | `selected` (coi_disclosure_status flipped to `disclosed-no-conflicts` / `disclosed-with-managed-conflicts` / `disclosed-with-unmanaged-conflicts-disqualifying`) | Per `engagement-letter-template.md` §6. If `disqualifying`, status flips to `terminated` + new shortlist candidate selected. |
| `<PENDING-TASK-9>` | Engagement letter signed | `<lc-N>` | `selected` | `engaged-not-onboarded` | Per `engagement-letter-template.md` §14. NDA + COI on file; pre-onboarding window begins. |
| `<PENDING-TASK-10>` | First artifact submitted — `engaged-not-onboarded → active` transition | `<lc-N>` | `engaged-not-onboarded` | `active` | First-artifact submission (Epic 2 T&C draft, Row 1 priority-1) is the `engaged-not-onboarded → active` trigger; ongoing concurrent-review per term commences. |
| `<PENDING-TASK-10>` | First artifact submitted — engagement event | `<lc-N>` | `active` | `active` (last_engagement_event_date updated) | Per `engagement-ledger.md` §7. |
| `<PENDING-TASK-11>` | Counsel returns first artifact | `<lc-N>` | `active` | `active` (last_engagement_event_date updated) | Per `engagement-ledger.md` §7. |
