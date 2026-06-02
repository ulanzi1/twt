# Per-Artifact Return Roster

**Authority cite:** Story 0.13 AC-1 + AC-2; `review-artifact-roster.md` (linked per `return_summary_link` field); `engagement-letter-template.md` §4 + §10; Decision 2026-06-02-013.

**Status:** Author-committed with ≥19 placeholder rows mirroring `review-artifact-roster.md`; substantive return content populated at Story 0.13 Task 11 per per-artifact return event.

> **Header note:** The roster is **append-only**. Forbidden-removal rule applied; supersession-only lifecycle exit. Rows preserve return content with audit-baseline integrity. Privilege-protected counsel content does NOT enter this roster per `engagement-letter-template.md` §10 work-product-ownership boundary + Story 0.13 README §4 invariant 10 — only non-privileged summaries land here. Specific privileged opinions are counsel-only-archive per operations-policy.

---

## Schema (extension of `review-artifact-roster.md` schema)

Per Story 0.13 AC-1 + AC-2:

| Field | Description |
|---|---|
| (all `review-artifact-roster.md` schema fields) | inherited |
| `return_summary` | Counsel's headline opinion in 1-3 sentences (non-privileged summary) |
| `return_substantive_changes_required` | The specific changes counsel proposes per the artifact (non-privileged summary; specific privilege-protected reasoning is counsel-only-archive) |
| `return_open_questions` | The open questions counsel raises but does not answer; AC-2 commits these as "ongoing dependencies, not blockers" |
| `return_next-review-cycle` | Whether the artifact requires a re-submission after edits (`needs-re-submission` / `final-no-re-submission` / `requires-pre-launch-checkpoint-review`) |
| `integration_pr_or_commit_ref` | The git ref where the changes land |
| `integration_validation_outcome` | Counsel re-confirms the integration meets the substantive review opinion (`integration-validated` / `integration-revision-needed` / `pending-counsel-re-review`) |
| `supersession_marker` | Forbidden-removal + supersession-only lifecycle exit marker |

**Privilege-boundary discipline** per `engagement-letter-template.md` §10:
- `return_summary` + `return_substantive_changes_required` + `return_open_questions` are **non-privileged summaries** suitable for the trustee-accessible repo
- Specific privileged reasoning + counsel-side analysis methodology + counsel's strategic positioning advice are **counsel-only-archive** and do NOT enter this roster
- If a counsel-return contains a content fragment that is ambiguously privileged-vs-non-privileged, the fragment is excluded from this roster pending the privilege-boundary policy ADR per `adr-index.md` Section K row #3

---

## Row 1: `epic-2-tc-draft-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 1 |
| `return_summary` | `<PENDING-COUNSEL-RETURN — populates at Task 11>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to FR-94 verbatim phrasings + Niyamavali clauses + trust-posture FR enforcement>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: CPA 2019 ouster-of-jurisdiction-restraint posture; PRD §10.1 "judicial challenge is not contractually barred" verbatim adequacy; Hindi-vernacular legal-text precision in Niyamavali R10(B) + R10(A)>` |
| `return_next-review-cycle` | `<PENDING — likely `requires-pre-launch-checkpoint-review` per `review-scope-charter.md` §6 T&C version-pin lock checkpoint>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` (active row) |

---

## Row 2: `fr-43a-denial-appeal-flow-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 2 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to FR-43A three-stage taxonomy + denial-notification copy + stage-1-reviewer-≠-original-decision-maker discipline + appeal SLA + State-Trustee escalation>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: CPA 2019 procedural-fairness obligations adequacy; structured denial_reason audit-line evidentiary standard; FR-43A external forum destination per architecture line 4786 (district/state consumer commission, civil court routing)>` |
| `return_next-review-cycle` | `<PENDING>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 3: `account-state-machine-transition-table-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 3 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to five-state transition-table + side-effect notice obligations + reversibility semantics + five mandatory test cases>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: notice/service formalities under Indian Trust Act + CPA 2019 + DPDPA + Indian Evidence Act; claim-filed-frozen → disbursed-frozen-readable transition notice cadence; disabled-T+90 disable-notice formalities; public-record-∞ persistence + consent obligations + retention obligations>` |
| `return_next-review-cycle` | `<PENDING>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 4: `dpdpa-consent-flow-design-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 4 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to claim-time DPDPA consent + consent registry granular records + data export + RTBF mechanics + DPDPA Data Fiduciary registration timing + DPO appointment>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: DPDPA Data Fiduciary registration MeitY threshold timing; DPO appointment timing per PRD §11 OQ-7; minor-data handling DPDPA §9 specifics; audit-log PII handling under RTBF trade-off; KYC retention policy commit per architecture §1761>` |
| `return_next-review-cycle` | `<PENDING>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 5: `dual-path-claim-authority-evidentiary-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 5 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to dual-path intake convergence ICP + deceased-phone-OTP proxy-credential evidentiary basis + helpline-mediated authority-to-file evidentiary basis + dedup semantics + claim-shepherd authority>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: Indian Evidence Act + Telecom Act SIM-attribution provisions adequacy for deceased-phone-OTP proxy-credential; witnessed declaration of relationship evidentiary standard; OQ-UX-9 transferable-credential proxy patterns framework; cross-channel session visibility privacy + DPDPA implications>` |
| `return_next-review-cycle` | `<PENDING>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Rows 6-10: Degradation comms-templates × 5 channels

| artifact_id | Status |
|---|---|
| `degradation-comms-template-push-v1` (Row 6) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `degradation-comms-template-whatsapp-v1` (Row 7) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `degradation-comms-template-sms-v1` (Row 8) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `degradation-comms-template-email-v1` (Row 9) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `degradation-comms-template-public-banner-v1` (Row 10) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |

**Per-template `return_substantive_changes_required` anticipated scope** (counsel-return-pending):
- Member-facing copy precision in Hindi + English bilingual parity
- Trust-posture-coherent wording per FR-94 + PRD §10.1
- Channel-specific compliance (Meta UTILITY template policy for WA; TRAI DLT-transactional for SMS; provider-specific for email + push)
- Public-page-banner cache-safe SSR review per architecture §5.8a

**Per-template integration target:** `docs/degradation-policy/degradation-policy-ledger.md` Legal-counsel revision log row + trustee co-sign + supersession-schema marker + per-template body PENDING LEGAL REVIEW marker flip per Story 0.4 README §4 invariant 6.

---

## Row 11: `backup-engineer-contract-substantive-language-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 11 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed substantive language for: §6 NDA (definitions; permitted-use; survival; remedies; choice-of-law); §9 Insurance (professional-indemnity coverage + liability bounds); §10 Termination (for-cause triggers; cure procedures; handover); §11 Dispute resolution (jurisdiction Bihar; arbitration vs court-route per counsel guidance)>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: indemnification carve-outs + force-majeure scope under Indian Contract Act; backup-engineer's professional-indemnity coverage limits vs trust-side indemnification of backup-engineer for permitted-use of work-product; signature path coordination with backup-engineer firm-affiliation>` |
| `return_next-review-cycle` | `<PENDING — likely `final-no-re-submission` after Story 0.6 Task 9 integration; with periodic re-attestation per `engagement-letter-template.md` §8 annual renewal>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration into docs/backup-engineer/contract-template.md §6/§9/§10/§11>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 12: `phase-0-regulatory-surface-inventory-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 12 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed substantive updates to: 13-row regulatory surface table; per-statute filing strategy; per-row monitoring-owner + escalation-path per Story 0.5 Section E; PRD §4.14.1 amendment if substantive position changes>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: Bihar-specific Indian Trust Act registration process; 12A/12AB filing-strategy timing; GST registration trigger interpretation; DPDPA Data Fiduciary registration MeitY threshold tracking; FCRA Phase 2/3 readiness scope>` |
| `return_next-review-cycle` | `<PENDING — likely `requires-pre-launch-checkpoint-review` per `review-scope-charter.md` §6 Phase-0 closure checkpoint>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration into docs/knowledge-transfer/third-party-dependency-inventory.md Section E + PRD §4.14.1 amendment if substantive change>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Rows 13-17: KT-pack ADR slot artifacts

| artifact_id | Status |
|---|---|
| `kt-pack-adr-slot-threat-model-v1` (Row 13) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `kt-pack-adr-slot-cloudflare-pivot-v1` (Row 14) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `kt-pack-adr-slot-hindi-native-trustee-ratification-v1` (Row 15) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `kt-pack-adr-slot-backup-engineer-contract-substantive-language-v1` (Row 16) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |
| `kt-pack-adr-slot-engineer-identity-redaction-v1` (Row 17) | `<ALL RETURN FIELDS PENDING-COUNSEL-RETURN>` |

**Per-ADR `return_substantive_changes_required` anticipated scope** (counsel-return-pending):
- Substantive ADR content commit per architecture §Implementation Handoff PR-2 ADR-transcription discipline
- Status flip from `slot-reserved-pre-write` to `Trustee-ratified` (counsel-co-signed if applicable)
- Cross-coupling with the substantive architecture / PRD / UX-spec impact per the ADR target

---

## Row 18: `dpo-breach-reporting-envelope-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 18 |
| `return_summary` | `<PENDING-COUNSEL-RETURN>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed: DPO appointment per PRD §11 OQ-7; DPO contact path; DPDPA enforcement authority's portal identification; breach-reporting tooling operations-policy>` |
| `return_open_questions` | `<PENDING-COUNSEL-RETURN — anticipated: DPDPA breach-report notification timelines; DPO replacement procedure; cross-coupling with Story 14.3 spec>` |
| `return_next-review-cycle` | `<PENDING — likely `requires-pre-launch-checkpoint-review`>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration into docs/escrow/credential-inventory.md lines 75 + 77>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 19: `fallback-handler-denial-appeal-procedural-fairness-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 19 |
| `return_summary` | `<PENDING-COUNSEL-RETURN — cross-coupled with Row 2>` |
| `return_substantive_changes_required` | `<PENDING-COUNSEL-RETURN — counsel-proposed changes to docs/fallback-handler-ledger/loop-nodes/denial-appeal.md §3 + §11 per the FR-43A procedural-fairness review on Row 2>` |
| `return_open_questions` | `<PENDING — likely subset of Row 2 open questions applied to fallback-handler context>` |
| `return_next-review-cycle` | `<PENDING — likely `final-no-re-submission` after Row 2 integration>` |
| `integration_pr_or_commit_ref` | `<PENDING-TASK-11-integration>` |
| `integration_validation_outcome` | `<PENDING-COUNSEL-RE-REVIEW>` |
| `supersession_marker` | `none` |

---

## Row 20: `multi-pariwar-legal-review-checkpoint-v1`

| Field | Value |
|---|---|
| (inherited fields) | per `review-artifact-roster.md` Row 20 |
| `return_summary` | `<PENDING per-Pariwar event>` |
| `return_substantive_changes_required` | `<PENDING per-Pariwar event — per-Pariwar Niyamavali variant approval if jurisdiction differs; trust-posture copy review per new-Pariwar jurisdiction; DPDPA + procedural fairness review per new-Pariwar context>` |
| `return_open_questions` | `<PENDING per-Pariwar event>` |
| `return_next-review-cycle` | `<PENDING per-Pariwar event — per-Pariwar provisioning event-triggered>` |
| `integration_pr_or_commit_ref` | `<PENDING per-Pariwar event>` |
| `integration_validation_outcome` | `<PENDING per-Pariwar event>` |
| `supersession_marker` | `none` |

---

## Roster total + integration coordination

**Row count at author-commit:** 20 placeholder rows mirroring `review-artifact-roster.md`.

**Substantive content lifecycle** (per Story 0.13 Task 11):
1. Counsel returns substantive review opinion on submitted artifact per `engagement-letter-template.md` §4 SLA (5-10 biz days; expedited 2-3 biz days if surge-priced)
2. Counsel's return event is logged in `engagement-ledger.md` §7 Return-receipt log
3. The per-row `return_summary` + `return_substantive_changes_required` + `return_open_questions` fields are populated (non-privileged summary content only — privileged content is counsel-only-archive)
4. The `integration_status` field on `review-artifact-roster.md` row flips from `awaiting-counsel-return` to `returned-pending-integration`
5. The owning Story owner (Solo Builder for Solo-Builder-owned Stories; Trustee Panel for governance Stories) coordinates the integration of the counsel-return content into the implementing Story
6. The `integration_pr_or_commit_ref` field is populated with the git ref where the changes land
7. Counsel re-reviews the integration per the per-artifact `return_next-review-cycle` field; `integration_validation_outcome` flips from `pending-counsel-re-review` to `integration-validated` or `integration-revision-needed`
8. If `integration-revision-needed`, the cycle re-runs from Step 1 with a `v2` artifact_id; the original row is preserved with `supersession_marker` set per the supersession schema

**Open-questions ledger cross-link:** non-blocking open-questions per AC-2 "remaining feedback is tracked as ongoing dependencies, not blockers on demoable closure" are logged in `engagement-ledger.md` §11 Open-questions ledger; the per-row `return_open_questions` field cross-references the ledger entries.

**Forbidden-removal rule:** Rows are never removed. Status `superseded` is the lifecycle exit for rows that have been replaced by a follow-up submission; both rows preserved with cross-reference per `supersession_marker`. For rows where counsel declines a specific artifact per `engagement-letter-template.md` §9, the row is preserved with `<DECLINED-OUT-OF-SCOPE>` as the value for return-content fields; the corresponding `review-artifact-roster.md` `integration_status` flips to `declined-out-of-scope`.

**Privilege boundary discipline** (per Story 0.13 README §4 invariant 10): privilege-protected counsel content does NOT enter this roster. Specific privileged opinions are counsel-only-archive per `engagement-letter-template.md` §10 work-product-ownership. If a counsel-return fragment is ambiguously privileged-vs-non-privileged, the fragment is excluded from this roster pending the privilege-boundary policy ADR per `adr-index.md` Section K row #3.
