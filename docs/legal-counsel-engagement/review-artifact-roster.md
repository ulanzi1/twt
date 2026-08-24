# Review-Artifact Roster

**Authority cite:** Story 0.13 AC-1; `review-scope-charter.md` §1 + §3 + §4; `engagement-letter-template.md` §3 + §4; Decision 2026-06-02-013.

**Status:** Author-committed with ≥10 priority-ordered placeholder rows; substantive `actual_submission_date` + `actual_return_date` + `return_summary_link` fields populated at Story 0.13 Tasks 10 + 11.

> **Header note:** The roster is **append-only**. Forbidden-removal rule applied; supersession-only lifecycle exit. Rows added per per-artifact submission event at Task 10 + subsequent submissions. The substantive return content lives in `per-artifact-return-roster.md` (linked per `return_summary_link` field).

---

## Schema

Per Story 0.13 AC-1:

| Field | Description |
|---|---|
| `artifact_id` | Canonical kebab-case slug (e.g., `epic-2-tc-draft-v1`, `fr-43a-denial-appeal-flow-v1`) |
| `artifact_type` | One of: T&C-draft, DPDPA-consent-flow, denial-appeal-flow, Account-State-Machine-transition-table, dual-path-claim-evidentiary-spec, regulatory-surface-row, ADR-slot, comms-template, contract-template-section, other |
| `source_artifact_path` | Canonical file path in `_bmad-output/planning-artifacts/`, `docs/`, or `_bmad-output/implementation-artifacts/` containing the artifact under review |
| `owning_story + epic` | The implementing Story whose closure depends on counsel return + the enclosing Epic |
| `submission_priority` | 1-N ordering (1 = highest priority); AC-1 commits priority-1 = Epic 2 T&C draft; ties permitted within a category (e.g., multiple priority-6 comms-template rows); submission order within a tie resolved by Trustee Panel discretion at Task 10 |
| `target_submission_date` | Committed at Task 9 closure + counted forward from signature date per AC-1 "within 2 weeks of signing" for priority-1 |
| `actual_submission_date` | Populated at Task 10 — the dev-story agent does NOT submit; Solo Builder + Trustee Panel coordinate the submission outside the dev-story scope |
| `sla_target_return_date` | Computed = `actual_submission_date + per_artifact_SLA` per `engagement-letter-template.md` §4 (5-10 biz days default; expedited 2-3 biz days if surge-priced) |
| `actual_return_date` | Populated at Task 11 — the date counsel returns the substantive review opinion |
| `return_summary_link` | Path to the substantive return content stored in `per-artifact-return-roster.md` per-row entry |
| `integration_target_story_or_section` | The Story or PRD/UX section where the counsel-return content is integrated |
| `integration_status` | Lifecycle: `pending-submission` → `awaiting-counsel-return` → `returned-pending-integration` → `integrated-into-Story-X` → `deferred-with-rationale` → `superseded` |
| `deferral_target_story` | The Story or section targeted for integration when `integration_status = deferred-with-rationale`; required when deferral status is set; e.g., `Story 0.15` or `Epic-2-integration-cycle` |
| `notes` | Free-form notes |

**Forbidden statuses:** silent submission, removal, status-flip-without-event-trigger.

**Allowed-values legend for `integration_status`:**
- `pending-submission` — at author-commit; not yet submitted to counsel
- `awaiting-counsel-return` — submitted to counsel; awaiting return per SLA
- `returned-pending-integration` — counsel returned; pending integration into the owning Story
- `integrated-into-Story-X` — counsel-return content integrated into the implementing Story
- `deferred-with-rationale` — integration deferred to a later Story with explicit rationale per [[feedback_closure_language_precision]]
- `superseded` — row superseded by a later submission event (forbidden-removal lifecycle exit)
- `declined-out-of-scope` — counsel declined the specific artifact per `engagement-letter-template.md` §9 decline-with-rationale mechanism; written rationale recorded in `engagement-ledger.md` §7 Return-receipt log; Trustee Panel + Solo Builder evaluate substitute-counsel engagement for the declined scope-area

---

## Priority-1 row (AC-1 commitment — first artifact within 2 weeks of signing)

### Row 1: `epic-2-tc-draft-v1`

| Field | Value |
|---|---|
| `artifact_id` | `epic-2-tc-draft-v1` |
| `artifact_type` | T&C-draft |
| `source_artifact_path` | ⭐ **DRAFT NOW EXISTS (2026-08-24):** `docs/legal-counsel-engagement/handover/TWT-Terms-and-Conditions-DRAFT-v0.1-for-counsel-review.docx` — v0.1, 16 clauses + a 7-question counsel annex, assembled **strictly** from committed sources: `prd.md` §FR-94 (the **seven verbatim phrasings**, PRD :1215-1226) + the posture FRs (FR-6 · FR-19 · FR-32 · FR-33 · FR-36 · FR-43A · FR-74) + §4.14.1 regulatory surface + the Niyamavali reference per Stories 2.3/2.4/2.5. ⛔ **Nothing invented; no legal drafting originated** |
| `owning_story + epic` | Story 2.6 T&C version-pinning + Epic 2 demoable closure FR-94 verbatim |
| `submission_priority` | 1 |
| `target_submission_date` | ⛔⛔ **2026-07-05** — **BREACHED.** Computed 2026-08-24 from the engagement-signature date (**2026-06-21**) + 14 calendar days, per AC-1 and `README.md:39` (*"first-artifact-submission within 2 weeks of signing is a structural property"*). ⚠ **50 days overdue at time of computation.** ⭐ The date was uncomputable until 2026-08-24 because the signature date itself was unrecorded — see `notes` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10: actual_submission_date + 5-10 biz days per engagement-letter-template.md §4>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#epic-2-tc-draft-v1` |
| `integration_target_story_or_section` | Story 2.6 T&C version-pinning + Epic 2 demoable closure FR-94 verbatim; if Epic 2 has shipped, integration via Story 2.4 Niyamavali amendment workflow; if Epic 2 has not shipped, integration via the PRD edit + Story 2.4 implementation |
| `integration_status` | `pending-submission` |
| `notes` | AC-1 commits this as the first artifact submitted within 2 weeks of signing per epics line 917. Cross-references scope-charter §1(a) trust-posture copy review.
⚠⛔ **2026-08-24 — WHY THIS ROW SAT AT `pending-submission` FOR 50 DAYS, stated plainly.** ⛔ **The artefact did not exist.** Story 2.6 shipped the T&C **registry** — `terms_and_conditions_versions`, pinned-clause junction, `body_html_rendered`, RLS, public render — but `body_markdown` is *"canonical T&C content authored by the trustee"*, and ⛔ **no T&C prose was ever authored**: verified 2026-08-24, the only T&C-adjacent prose anywhere in the repo is the tagline in `packages/i18n/locales/hi/contribution.json`. ⇒ ⭐ **the overdue item was never a stalled submission — it was an unauthored artefact**, and ⛔ no amount of submission coordination would have discharged it.
⭐ **RESOLVED 2026-08-24: a v0.1 draft is authored** (see `source_artifact_path`). ⛔ **`integration_status` stays `pending-submission`** — this roster's own schema says *"the dev-story agent does ⛔ NOT submit; Solo Builder + Trustee Panel coordinate the submission outside the dev-story scope"*, so ⛔ **the row is ⛔ NOT flipped and `actual_submission_date` stays `<PENDING-TASK-10>`.** ⚠ Authoring the artefact and submitting it are **different acts**; only the first has happened ([[feedback_closure_language_precision]]).
⚠ **The draft is UNREVIEWED and marked so on its face** — ⛔ not adopted, ⛔ not published, ⛔ not shown to any member. Its purpose **is** to be reviewed.
⭐ **AND THIS ROW IS ON THE CRITICAL PATH OF A SECOND ITEM:** counsel cited *"Member Consent of Term of service of TWT"* as the basis for extending his 2026-08-24 clearance to the three Epic 11b surfaces (`2026-08-24-157` cl.3) — ⛔ **this** document. ⇒ counsel's held revisit should follow this submission, ⛔ not precede it. |

---

## Priority-2 to Priority-5 rows (AC-named scope items)

### Row 2: `fr-43a-denial-appeal-flow-v1`

| Field | Value |
|---|---|
| `artifact_id` | `fr-43a-denial-appeal-flow-v1` |
| `artifact_type` | denial-appeal-flow |
| `source_artifact_path` | `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` FR-43A lines 712-727 + `_bmad-output/planning-artifacts/epics.md` Story 6.16 |
| `owning_story + epic` | Story 6.16 denial-appeal workflow + Story 6.13 State Trustee escalation + Story 6.14 R9 voting workflow + Story 1.11b audit-of-Anita UI |
| `submission_priority` | 2 |
| `target_submission_date` | `<computed at Task 9: per Counsel + Trustee Panel scheduling>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#fr-43a-denial-appeal-flow-v1` |
| `integration_target_story_or_section` | Story 6.16 + Story 6.13 + Story 6.14 + Story 1.11b audit-of-Anita UI + Story 0.7 fallback-handler-ledger denial-appeal node §3 + §11 (cross-coupled with inventory `fl-1`) |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references scope-charter §1(c) denial-appeal flow procedural fairness. Architecture line 4786 FR-43A external forum destination is co-coupled. |

### Row 3: `account-state-machine-transition-table-v1`

| Field | Value |
|---|---|
| `artifact_id` | `account-state-machine-transition-table-v1` |
| `artifact_type` | Account-State-Machine-transition-table |
| `source_artifact_path` | `_bmad-output/planning-artifacts/ux-design-specification.md` UX §0 Stance #2 + UX Design Challenge #2 + `_bmad-output/planning-artifacts/architecture.md` §3.4 dispatcher suppression (lines 2037-2043) + Cross-Cutting #12 (line 306) |
| `owning_story + epic` | Story 1.3 packages/events event-log primitive + Story 3.1 member lifecycle state machine + architecture §3.4 amendment if substantive changes |
| `submission_priority` | 3 |
| `target_submission_date` | `<computed at Task 9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#account-state-machine-transition-table-v1` |
| `integration_target_story_or_section` | Story 1.3 + Story 3.1 + architecture §3.4 amendment + Story 5.1 channel dispatcher (suppression policy) + Story 11b memorial (public-record-∞ state) |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references scope-charter §1(d) Account State Machine transition-table review for notice/service formalities. Five mandatory test cases per scope-charter §1(d). |

### Row 4: `dpdpa-consent-flow-design-v1`

| Field | Value |
|---|---|
| `artifact_id` | `dpdpa-consent-flow-design-v1` |
| `artifact_type` | DPDPA-consent-flow |
| `source_artifact_path` | `_bmad-output/planning-artifacts/architecture.md` §2.12 DPDPA control surfaces (lines 1722-1778) + UX spec line 79 claim-time DPDPA consent + `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` FR-95 + FR-96 + FR-97 |
| `owning_story + epic` | Story 2.7 consent registry + Story 3.11 data export + Story 3.12 RTBF + Epic 14 DPDPA |
| `submission_priority` | 4 |
| `target_submission_date` | `<computed at Task 9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#dpdpa-consent-flow-design-v1` |
| `integration_target_story_or_section` | Story 2.7 + Story 3.11 + Story 3.12 + Epic 14 DPDPA + Story 14.3 breach-reporting + DPO appointment per PRD §11 OQ-7 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references scope-charter §1(b) DPDPA consent flow design review. Cross-coupled with inventory `es-1` + `es-2` DPO-breach-reporting envelope. |

### Row 5: `dual-path-claim-authority-evidentiary-v1`

| Field | Value |
|---|---|
| `artifact_id` | `dual-path-claim-authority-evidentiary-v1` |
| `artifact_type` | dual-path-claim-evidentiary-spec |
| `source_artifact_path` | `_bmad-output/planning-artifacts/ux-design-specification.md` UX Design Challenge #1 dual-path death-claim intake convergence + UX §164 ICP + `_bmad-output/planning-artifacts/epics.md` Epic 6 dual-path claim ICP + Story 6.3 helpline-mediated + Story 6.10 verifier console |
| `owning_story + epic` | Story 6.2 + Story 6.3 + Story 6.5 + Story 6.10 + Story 10.1 + Story 10.2 + Story 10.3 SM-1 demo beat C3 |
| `submission_priority` | 5 |
| `target_submission_date` | `<computed at Task 9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#dual-path-claim-authority-evidentiary-v1` |
| `integration_target_story_or_section` | Story 6.2 + Story 6.3 helpline-mediated claim filing UX-DR45 + UX-DR46 + Story 6.10 verifier console signals panel UX-DR39 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references scope-charter §1(e) dual-path claim authority-to-file evidentiary specification. Deceased-phone-OTP proxy-credential + helpline-mediated Persona #7 authority. |

---

## Priority-6 to Priority-N rows (cross-Story deferred scope items)

These rows track the cross-Story deferred-scope inventory from `review-scope-charter.md §3`. Each row maps to one inventory row. Substantive submission timing is per the engagement-cadence + Trustee Panel + Solo Builder coordination per Task 10/11 + ongoing concurrent-review per `engagement-letter-template.md` §9.

### Row 6: `degradation-comms-template-push-v1`

| Field | Value |
|---|---|
| `artifact_id` | `degradation-comms-template-push-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `docs/degradation-policy/comms-templates/push-channel.md` |
| `owning_story + epic` | Story 0.4 Task 9 per-template ratification |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#degradation-comms-template-push-v1` |
| `integration_target_story_or_section` | Story 0.4 — `docs/degradation-policy/degradation-policy-ledger.md` Legal-counsel revision log row + trustee co-sign + supersession-schema marker + push-channel.md PENDING LEGAL REVIEW marker flip per README §4 invariant 6 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `dc-1`. Marker preservation rule: silent unflipping is framework violation. |

### Row 7: `degradation-comms-template-whatsapp-v1`

| Field | Value |
|---|---|
| `artifact_id` | `degradation-comms-template-whatsapp-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `docs/degradation-policy/comms-templates/whatsapp-channel.md` |
| `owning_story + epic` | Story 0.4 Task 9 per-template ratification |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#degradation-comms-template-whatsapp-v1` |
| `integration_target_story_or_section` | Story 0.4 — degradation-policy-ledger + whatsapp-channel.md marker flip; cross-coupled with Meta UTILITY template approval lead-time policy |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `dc-2`. |

### Row 8: `degradation-comms-template-sms-v1`

| Field | Value |
|---|---|
| `artifact_id` | `degradation-comms-template-sms-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `docs/degradation-policy/comms-templates/sms-channel.md` |
| `owning_story + epic` | Story 0.4 Task 9 per-template ratification |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#degradation-comms-template-sms-v1` |
| `integration_target_story_or_section` | Story 0.4 — degradation-policy-ledger + sms-channel.md marker flip; cross-coupled with DLT-transactional template registration (PE/OE) per architecture §2.2 + §3.4 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `dc-3`. |

### Row 9: `degradation-comms-template-email-v1`

| Field | Value |
|---|---|
| `artifact_id` | `degradation-comms-template-email-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `docs/degradation-policy/comms-templates/email-channel.md` |
| `owning_story + epic` | Story 0.4 Task 9 per-template ratification |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#degradation-comms-template-email-v1` |
| `integration_target_story_or_section` | Story 0.4 — degradation-policy-ledger + email-channel.md marker flip; cross-coupled with email-provider selection ADR |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `dc-4`. |

### Row 10: `degradation-comms-template-public-banner-v1`

| Field | Value |
|---|---|
| `artifact_id` | `degradation-comms-template-public-banner-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `docs/degradation-policy/comms-templates/public-page-banner.md` |
| `owning_story + epic` | Story 0.4 Task 9 per-template ratification |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#degradation-comms-template-public-banner-v1` |
| `integration_target_story_or_section` | Story 0.4 — degradation-policy-ledger + public-page-banner.md marker flip; cross-coupled with cache-safe SSR review per architecture §5.8a |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `dc-5`. |

### Row 11: `backup-engineer-contract-substantive-language-v1`

| Field | Value |
|---|---|
| `artifact_id` | `backup-engineer-contract-substantive-language-v1` |
| `artifact_type` | contract-template-section |
| `source_artifact_path` | `docs/backup-engineer/contract-template.md` §6 NDA + §9 Insurance + §10 Termination + §11 Dispute resolution (single combined artifact per Story 0.6 Task 9) |
| `owning_story + epic` | Story 0.6 Task 9 |
| `submission_priority` | 7 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#backup-engineer-contract-substantive-language-v1` |
| `integration_target_story_or_section` | Story 0.6 contract-template.md §6 + §9 + §10 + §11 substantive language populated; backup-engineer-ledger.md Contract-signature log header recorded |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `bc-1` + `bc-2` + `bc-3` + `bc-4` + ADR slot `kt-4`. Story 0.6 Task 9 blocks until this returns. |

### Row 12: `phase-0-regulatory-surface-inventory-v1`

| Field | Value |
|---|---|
| `artifact_id` | `phase-0-regulatory-surface-inventory-v1` |
| `artifact_type` | regulatory-surface-row |
| `source_artifact_path` | `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` §4.14.1 (lines 1167-1188) + `review-scope-charter.md` §4 13-row regulatory surface table |
| `owning_story + epic` | Story 0.5 + PRD §4.14.1 + architecture §Launch Gate Risks subsidiary rows 4785-4788 |
| `submission_priority` | 7 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#phase-0-regulatory-surface-inventory-v1` |
| `integration_target_story_or_section` | Story 0.5 third-party-dependency-inventory.md Section E × 7 monitoring-owner + escalation-path updates (cross-coupled with inventory `td-1` through `td-7`); architecture §Launch Gate Risks subsidiary rows 4785-4788 substantive engagement; PRD §4.14.1 amendment if substantive position changes; ADR-NNNN-KYC-retention-policy substantive write per scope-charter §5 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `td-1` through `td-7` + scope-charter §4 regulatory surface review. |

### Row 13: `kt-pack-adr-slot-threat-model-v1`

| Field | Value |
|---|---|
| `artifact_id` | `kt-pack-adr-slot-threat-model-v1` |
| `artifact_type` | ADR-slot |
| `source_artifact_path` | `docs/knowledge-transfer/adr-index.md` Section A row ADR-NNNN-threat-model-actor-inventory + architecture.md §2.1 |
| `owning_story + epic` | Story 0.5 + architecture §2.1 + pre-launch security review |
| `submission_priority` | 8 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#kt-pack-adr-slot-threat-model-v1` |
| `integration_target_story_or_section` | adr-index.md Section A row ADR-NNNN-threat-model-actor-inventory status flipped from `slot-reserved-pre-write` to `Trustee-ratified`; substantive ADR content committed |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `kt-1`. |

### Row 14: `kt-pack-adr-slot-cloudflare-pivot-v1`

| Field | Value |
|---|---|
| `artifact_id` | `kt-pack-adr-slot-cloudflare-pivot-v1` |
| `artifact_type` | ADR-slot |
| `source_artifact_path` | `docs/knowledge-transfer/adr-index.md` Section B row ADR-NNNN-cloudflare-pivot + architecture §5.8a |
| `owning_story + epic` | Story 0.5 + architecture §5.8a + DPDPA-incompatible policy event OR pre-launch security review |
| `submission_priority` | 8 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#kt-pack-adr-slot-cloudflare-pivot-v1` |
| `integration_target_story_or_section` | adr-index.md Section B row substantive ADR content committed; cross-coupled with architecture §Launch Gate Risks Edge/WAF DPDPA-compatibility row at line 4780 |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `kt-2`. |

### Row 15: `kt-pack-adr-slot-hindi-native-trustee-ratification-v1`

| Field | Value |
|---|---|
| `artifact_id` | `kt-pack-adr-slot-hindi-native-trustee-ratification-v1` |
| `artifact_type` | ADR-slot |
| `source_artifact_path` | `docs/knowledge-transfer/adr-index.md` Section F row ADR-NNNN-hindi-native-trustee-ratification + degradation-policy/README.md §8 |
| `owning_story + epic` | Story 0.5 + Story 0.4 + Hindi-native trustee ratification policy |
| `submission_priority` | 8 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#kt-pack-adr-slot-hindi-native-trustee-ratification-v1` |
| `integration_target_story_or_section` | adr-index.md Section F row substantive ADR content + degradation-policy/README.md §126 cross-reference |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `kt-3`. |

### Row 16: `kt-pack-adr-slot-backup-engineer-contract-substantive-language-v1`

| Field | Value |
|---|---|
| `artifact_id` | `kt-pack-adr-slot-backup-engineer-contract-substantive-language-v1` |
| `artifact_type` | ADR-slot |
| `source_artifact_path` | `docs/knowledge-transfer/adr-index.md` Section H row ADR-NNNN-backup-engineer-contract-substantive-language + `docs/backup-engineer/contract-template.md` §6/§9/§10/§11 |
| `owning_story + epic` | Story 0.5 + Story 0.6 Task 9 |
| `submission_priority` | 8 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#kt-pack-adr-slot-backup-engineer-contract-substantive-language-v1` |
| `integration_target_story_or_section` | adr-index.md Section H row ADR-NNNN-backup-engineer-contract-substantive-language substantive ADR content committed; cross-coupled with inventory `bc-1` through `bc-4` |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `kt-4`. Cross-coupled with `bc-1` through `bc-4`: ADR commits the backup-engineer contract §6/§9/§10/§11 substantive language post Story 0.13 Task 11 + Story 0.6 Task 9 integration. |

### Row 17: `kt-pack-adr-slot-engineer-identity-redaction-v1`

| Field | Value |
|---|---|
| `artifact_id` | `kt-pack-adr-slot-engineer-identity-redaction-v1` |
| `artifact_type` | ADR-slot |
| `source_artifact_path` | `docs/knowledge-transfer/adr-index.md` Section H row ADR-NNNN-engineer-identity-redaction-public-mirror + `docs/backup-engineer/engineer-roster.md` |
| `owning_story + epic` | Story 0.5 + Story 0.3 + Story 0.6 + public-mirror provisioning event |
| `submission_priority` | 9 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#kt-pack-adr-slot-engineer-identity-redaction-v1` |
| `integration_target_story_or_section` | adr-index.md Section H row substantive ADR content; cross-coupled with Story 0.13 counsel-roster identity-redaction discipline |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `kt-5`. Priority-9 due to operations-policy + public-mirror-event gating. |

### Row 18: `dpo-breach-reporting-envelope-v1`

| Field | Value |
|---|---|
| `artifact_id` | `dpo-breach-reporting-envelope-v1` |
| `artifact_type` | other (DPDPA breach-reporting operational-readiness) |
| `source_artifact_path` | `docs/escrow/credential-inventory.md` lines 75, 77 + Story 14.3 spec |
| `owning_story + epic` | Story 14.3 + Story 0.2 + PRD §11 OQ-7 |
| `submission_priority` | 7 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#dpo-breach-reporting-envelope-v1` |
| `integration_target_story_or_section` | escrow/credential-inventory.md `dpo-breach-reporting-portal` + `dpo-contact-path` envelope status flip from `pending-system-availability` to active per DPO appointment + DPDPA portal identification |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `es-1` + `es-2`. Cross-coupled with Story 14.3 + Story 4 DPDPA consent flow row 4. |

### Row 19: `fallback-handler-denial-appeal-procedural-fairness-v1`

| Field | Value |
|---|---|
| `artifact_id` | `fallback-handler-denial-appeal-procedural-fairness-v1` |
| `artifact_type` | other (fallback-handler procedural-fairness) |
| `source_artifact_path` | `docs/fallback-handler-ledger/loop-nodes/denial-appeal.md` §3 + §11 |
| `owning_story + epic` | Story 0.7 + Story 6.16 |
| `submission_priority` | 7 |
| `target_submission_date` | `<computed per engagement cadence post-Task-9>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#fallback-handler-denial-appeal-procedural-fairness-v1` |
| `integration_target_story_or_section` | docs/fallback-handler-ledger/loop-nodes/denial-appeal.md §3 + §11 substantive updates per counsel return on FR-43A procedural-fairness review; cross-coupled with Row 2 fr-43a-denial-appeal-flow |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `fl-1`. Cross-coupled with Row 2 scope-charter §1(c). |

### Row 20: `multi-pariwar-legal-review-checkpoint-v1`

| Field | Value |
|---|---|
| `artifact_id` | `multi-pariwar-legal-review-checkpoint-v1` |
| `artifact_type` | other (multi-Pariwar operations) |
| `source_artifact_path` | `docs/runbooks/multi-pariwar-provisioning.md` lines 19, 45, 107, 123, 132 |
| `owning_story + epic` | Story 1.15 multi-Pariwar provisioning + Story 2.3 Niyamavali per-Pariwar |
| `submission_priority` | 9 |
| `target_submission_date` | `<computed per per-Pariwar provisioning event>` |
| `actual_submission_date` | `<PENDING per-Pariwar event>` |
| `sla_target_return_date` | `<PENDING per-Pariwar event>` |
| `actual_return_date` | `<PENDING per-Pariwar event>` |
| `return_summary_link` | `per-artifact-return-roster.md#multi-pariwar-legal-review-checkpoint-v1` |
| `integration_target_story_or_section` | per-Pariwar provisioning checklist completion + Niyamavali per-Pariwar variant approval if jurisdiction differs |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references inventory `mp-1` + `mp-2` + `mp-3`. Per-Pariwar event-triggered rather than calendar-bound; ongoing concurrent-review per `engagement-letter-template.md` §9. Naming convention: `multi-pariwar-legal-review-checkpoint-v1` is the template `artifact_id`; per-Pariwar submissions append as `multi-pariwar-legal-review-checkpoint-<pariwar-slug>-v1` at the per-Pariwar provisioning event. |

---

### Row 21: `contribution-note-copy-fr33-v1`

| Field | Value |
|---|---|
| `artifact_id` | `contribution-note-copy-fr33-v1` |
| `artifact_type` | comms-template |
| `source_artifact_path` | `packages/i18n/locales/{hi,en}/contribution.json` (`note.*` keys — the full authored Contribution Note copy in both locales) + `apps/api/src/modules/member-pool/note-template.ts` (the artifact's structure, headings and status blocks) |
| `owning_story + epic` | Story 8.7 Contribution Note PDF (FR-33) + Epic 8 contribution loop |
| `submission_priority` | 6 |
| `target_submission_date` | `<computed at Task 9: per Counsel + Trustee Panel scheduling>` |
| `actual_submission_date` | `<PENDING-TASK-10>` |
| `sla_target_return_date` | `<PENDING-TASK-10: actual_submission_date + 5-10 biz days per engagement-letter-template.md §4>` |
| `actual_return_date` | `<PENDING-TASK-11>` |
| `return_summary_link` | `per-artifact-return-roster.md#contribution-note-copy-fr33-v1` |
| `integration_target_story_or_section` | Story 8.7 `note.*` copy keys + the Note template; a counsel-required wording change is a copy-only edit (the artifact's structure, status derivation and PII shape are unaffected) |
| `integration_status` | `pending-submission` |
| `notes` | Cross-references `review-scope-charter.md:26`, which already names "Contribution Note PDF copy per FR-33" as in-scope. The copy ships **authored-but-not-counsel-reviewed** — engagement Tasks 7-11 are `_AWAITING EXTERNAL ACTION_` and Story 8.7 does not and cannot close them. Two review-relevant characteristics of the artifact: (a) it is deliberately NOT a receipt/invoice — the document is framed as a record of a trust relationship between colleagues, and both locales state explicitly that it is not a transactional document (FR-33 / the `microcopy.yaml` vocabulary register, CI-enforced); (b) the status copy is legally load-bearing because the artifact is SHAREABLE — a pending (non-green) Note must state that verification is still outstanding and must carry neither the UTR nor the सत्यापित verification stamp, so that a forwarded copy cannot be read as proof of a settled payment. Per Story 8.7 AC6/D8 the pending-review status is tracked HERE (internally) and is deliberately NOT stamped on the member's artifact — unlike the Story 2.6 T&C surface, which marks itself publicly because it IS the legal instrument under review; a "pending legal review" marker on a trust artifact would corrode the trust the artifact exists to build. |

---

## Roster total + subsequent submissions

**Row count at author-commit:** 21 priority-ordered rows (20 at Story 0.13 author-commit; Row 21 appended by Story 8.7 per the ongoing-concurrent-review append rule below).

**Subsequent submissions:** Per `engagement-letter-template.md` §9 ongoing-concurrent-review nature, additional artifacts submitted during the term are appended as new rows to this roster per the same schema. The 2-week-of-signing AC-1 deadline applies to the priority-1 row only.

**Per-artifact submission coordination:** Solo Builder + Trustee Panel coordinate submission per priority ordering + the per-artifact SLA timing per `engagement-letter-template.md` §4. Counsel-side acknowledgment is logged in `engagement-ledger.md` §6 First-artifact-submission log + subsequent §7 Return-receipt log.

**Forbidden-removal rule:** Rows are never removed. Status `superseded` is the lifecycle exit for rows that have been replaced by a follow-up submission (e.g., `epic-2-tc-draft-v1` superseded by `epic-2-tc-draft-v2` after counsel-required revisions; both rows preserved with cross-reference).
