# Review-Scope Charter

**Authority cite:** Story 0.13 AC-1; UX §Phase-0 P0-4 (UX spec line 109); epics line 687 + line 908; architecture §External Validation Pending; PRD §4.14.1 + §10.1 + FR-43A + FR-94 + §2.12; Decision 2026-06-02-013.

**Status:** Author-committed; awaiting Trustee Panel ratification at Task 7 + counsel acceptance at Task 9. **The charter is amended only via ≥2-trustee + counsel co-signature + `.decision-log.md` `[LEGAL]` entry per the supersession schema** (per `README.md` §4 invariant 2).

> **Header note:** This charter is the substantive scope commitment for the concurrent-review engagement. It is Trustee-Panel-ratified at Story 0.13 Task 7 (independent of counsel selection — the scope is committed before the counsel is named), then counsel-accepted at Story 0.13 Task 9 (counsel reads the charter and acknowledges its scope as the basis of the engagement before signing the engagement letter).

---

## §1 The five AC-named primary scope items

Per epics line 908 + UX spec line 109, the five primary scope items committed at Trustee Panel ratification:

### §1(a) Trust-posture copy review during drafting (NOT after)

**Authority cites:** PRD §10.1 unified trust posture principle (PRD line 1161-1163); PRD FR-94 lawyer-reviewed verbatim phrasings (PRD lines 1190-1204); UX spec line 75 legal caveat ("Legal counsel is engaged from spec-drafting forward, with concurrent-review scope; their findings shape the spec, not just check it"); epics line 908 AC.

**Counsel-review-target inventory:**
- **PRD FR-94 verbatim T&C phrasings** — "Facilitator, not financial intermediary, not guarantor"; "Commitment is purely ethical" (R5(D)); "Internal resolution via the appeal flow (FR-43A) is the primary path for grievance; judicial challenge is not contractually barred, but core-team discretion under R5(D), R10(D), and R10(E) is preserved"; "Registration alone does not constitute legal membership"; R10(B) missed-information clause; R10(A) office-bearer-disqualification clause; tagline "आज का सहयोग कल का सहारा"
- **Niyamavali clauses** per Stories 2.3 + 2.4 + 2.5 + 2.6 — counsel reviews the canonical Niyamavali version + amendment workflow + public render
- **Trust-posture FR enforcement matrix** per PRD §10.1 (FR-19 + FR-33 + FR-36 + FR-32 + FR-74 + FR-6 + FR-43 + FR-43A) — counsel reviews whether each FR's surface copy enforces the unified posture without internal contradiction
- **Sahyog Vivran public-rendering copy** per Story 11b memorial — DPDPA-consent-gated; counsel reviews public surface copy
- **Close-of-cycle celebration copy** per Pool-Reality #2 (PRD line 491) — under-collection-framing rule; counsel reviews celebrate-actual-outcome wording
- **Disaster-handling slow-roll copy** per FR-98 — never-panic + per-pool-amount-not-raised-reactively
- **Contribution Note PDF copy** per FR-33 — verbatim Yogdaan Diwasinik/Yogdaan Bahi naming; never "receipt"/"invoice"
- **Under-funded-delivers-actual copy** per FR-19 — actual outcome celebration without shortfall framing
- **Facilitated-recovery-never-enforced copy** per FR-36
- **Screenshot-only-on-mismatch copy** per FR-32

**Affected Stories:** Story 2.3 (Niyamavali rule registry), Story 2.4 (Niyamavali amendment workflow), Story 2.5 (public Astro SSR shell + Niyamavali public render), Story 2.6 (T&C version-pinning + public render), Story 11b (memorial), Story 8.5 (close-of-cycle copy), Story 3.6 (signup Vyawastha Shulk), Story 3.8 (annual renewal copy), Stories 6.x (claim flow copy), Story 9.x (reconciliation copy).

**Affected FRs/UX-DRs:** FR-94 (lawyer-reviewed T&C); FR-19; FR-33; FR-36; FR-32; FR-74; FR-6; FR-43; FR-43A; UX-DR55 (operator-facing precise-technical register); UX-DR71 (vocabulary discipline); UX-DR2 (Stance #1 enforced by state machine).

### §1(b) DPDPA consent flow design review

**Authority cites:** Architecture §2.12 DPDPA control surfaces (architecture lines 1722-1778); PRD FR-95 (data export) + FR-96 (RTBF soft-delete) + FR-97 (consent registry); UX spec line 79 claim-time DPDPA consent (UX spec Stance #1); PRD §4.14.1 DPDPA Data Fiduciary registration; PRD OQ-7 DPO appointment.

**Counsel-review-target inventory:**
- **Claim-time DPDPA consent flow** per UX spec line 79 — at claim-time, the nominee/family captures explicit DPDPA consent for (a) public contributor-list rendering, (b) verifier-name publication on Sahyog Vivran, (c) In Memoriam inclusion. Default opt-in is unacceptable; explicit consent + opt-out path required.
- **Consent registry granular records** per FR-97 + Story 2.7 — granular consent records (T&C version, privacy policy version, marketing comms, biometric data, photo) with revocability semantics
- **Data export (FR-95) flow** + Story 3.11 — DPDPA data-portability right
- **RTBF soft-delete + anonymization** per FR-96 + Story 3.12 — soft-delete, contribution anonymization, Aadhaar HMAC hash retention for 12-month rejoin lock per FR-6
- **DPDPA Data Fiduciary registration timing** per PRD §4.14.1 — MeitY threshold + tracking
- **DPO appointment** per PRD §11 OQ-7 — DPO designation timing + escalation tree + replacement procedure
- **Breach-reporting tooling** per architecture §2.12 + Story 14.3 — DPDPA notification timelines + DPO contact baked into runbook
- **Minor-data handling at claim time** per architecture §1771-1778 — DPDPA §9 compliance for minor-PII
- **Audit-log PII handling under RTBF** per architecture §1754-1759 — audit-log retention vs RTBF anonymization trade-off
- **KYC retention policy** per architecture §1761-1763 — counsel commits the retention horizon via ADR
- **Per-data-class retention matrix** per architecture §1748-1752

**Affected Stories:** Story 2.7 (consent registry), Story 3.11 (data export), Story 3.12 (RTBF), Story 3.3a/b (DigiLocker KYC + manual fallback), Story 6.x (claim-time consent), Story 14.3 (DPDPA breach-reporting operational readiness), Story 11b (memorial DPDPA opt-in).

**Affected FRs/UX-DRs:** FR-95; FR-96; FR-97; FR-6 (rejoin lock + 12-month re-attempt); UX-DR-claim-time-DPDPA (Stance #1).

### §1(c) Denial-appeal flow procedural fairness review

**Authority cites:** PRD FR-43A (PRD lines 712-727); PRD §10.1 trust posture re Consumer Protection Act 2019; PRD §4.14.1 CPA 2019 row (PRD line 1186); architecture line 4786 FR-43A external forum destination Launch Gate Risks row.

**Counsel-review-target inventory:**
- **FR-43A internal claim-denial appeal flow** three-stage taxonomy:
  - Stage 1 — District Admin review (reviewer must be different individual from original decision-maker; may uphold, request additional evidence, or escalate)
  - Stage 2 — State Trustee panel vote (≥2 trustees; majority-rules per R9 framework; may uphold, reverse, or partially uphold)
  - Stage 3 — Trustee discretion (R5(D), R10(D)) — final internal outcome
- **Structured `denial_reason` audit-line** per FR-47 — Niyamavali clause + free-text rationale recorded in audit log
- **Denial notification copy** — surfaces appeal CTA + named human shepherd's contact per FR-41 + appeal SLA (30 days per stage)
- **No-formal-time-limit on family's right to appeal** — grief-aware discipline
- **Stage-1-reviewer-≠-original-decision-maker** discipline + reviewer pool considerations + conflict-of-interest review
- **State-Trustee escalation** per Story 6.13 + audit-of-Anita UI per Story 1.11b
- **R9 voting workflow** per Story 6.14 — pre-decision trustee voting for ambiguous claims
- **FR-43A external forum destination** per architecture line 4786 — Trustee Panel + Legal Counsel co-owner; counsel reviews district/state consumer commission + civil court routing
- **CPA 2019 + Indian Evidence Act + Trust law procedural-fairness review** — does the three-stage taxonomy meet statutory procedural-fairness obligations under CPA 2019 service-of-trust framing?
- **PRD §10.1 "judicial challenge is not contractually barred"** verbatim — does the wording adequately preserve the ouster-of-jurisdiction-restraint posture per Indian court precedents on Bhandari + CPA jurisprudence?

**Affected Stories:** Story 6.16 (denial-appeal workflow), Story 6.13 (State Trustee escalation), Story 6.14 (R9 voting workflow), Story 1.11b (audit-of-Anita UI), Story 5.x (denial notification dispatch), Story 0.7 fallback-handler-ledger denial-appeal node §3 + §11.

**Affected FRs/UX-DRs:** FR-43A; FR-43; FR-41; FR-47; FR-94 (T&C posture clause re ouster-of-jurisdiction).

### §1(d) Account State Machine transition-table review for notice/service formalities

**Authority cites:** UX §0 Stance #2 + UX Design Challenge #2 Account State Machine; Cross-Cutting #12 first-class architectural primitive (architecture line 306); architecture §3.4 dispatcher suppression policy (architecture line 2037); UX §164 topology primitive; UX-DR74 Account State Machine framework.

**Counsel-review-target inventory:**
- **The five states** `active → claim-filed-frozen → disbursed-frozen-readable → disabled-T+90 → public-record-∞` — counsel reviews state semantics + member-facing implications
- **Transition-table format** `current_state | event | next_state | side_effects | reversible_by | ux_surface_change` — counsel reviews transition trigger + reversibility + side-effect notice obligations
- **Five mandatory test cases:**
  - Phone-paperwork separation (deceased's phone + paper claim filed separately)
  - Duplicate filing (relative-as-deceased AND helpline-mediated)
  - Rejected-claim un-freeze (denial reversed via appeal)
  - Mid-cycle pool assignment when freeze fires
  - 90-day disable preserving nominee long-term receipts portal per OQ-UX-8
- **Dispatcher suppression policy** per architecture §3.4 + line 2037 — member-class push notifications suppressed in frozen states at the dispatch boundary; claim-shepherd communications continue
- **Module Shelf grief-context exclusion** per UX spec line 77 — enforced state-machine rule; Module Shelf suppressed in all account-frozen states
- **Durable nominee-facing access path** per architecture §2892-2896 — long-term receipts portal independent of deceased member's account lifecycle
- **Notice/service formalities** — counsel reviews whether the state-transition notice cadence + content meets statutory notice obligations under:
  - Indian Trust Act notice obligations (when does the trust owe a member formal notice?)
  - Consumer Protection Act 2019 service-of-trust framing (CPA notice obligations)
  - DPDPA notice obligations (consent flow + RTBF + breach-reporting)
  - Indian Evidence Act formalities (evidentiary basis for state transitions)
- **Claim-filed-frozen** state side-effects — Module Shelf suppression; push suppression; admin-class console messaging; how does the trust notice the member of the state transition?
- **Disbursed-frozen-readable** state — read-only access after disbursement; notice formalities to nominee
- **Disabled-T+90** state — 90-day disable preserving nominee long-term receipts portal; notice obligations on disable
- **Public-record-∞** state — In Memoriam + Sahyog Vivran public-record persistence; consent obligations + retention obligations

**Affected Stories:** Story 1.3 (packages/events event-log primitive), Story 3.1 (member lifecycle state machine), Story 6.x (claim flow), Story 9.x (reconciliation cycle), Story 1.11b (audit-of-Anita UI), Story 5.1 (channel dispatcher), Story 11b (memorial public-record).

**Affected FRs/UX-DRs:** UX-DR74; UX-DR5 (UX-DR clause-evaluation); Cross-Cutting #12; AR-14 (member state machine §1.14 primitive); architecture §3.4 dispatcher suppression.

### §1(e) Dual-path claim authority-to-file evidentiary specification

**Authority cites:** UX Design Challenge #1 dual-path death-claim intake convergence; UX §164 ICP topology primitive; PRD FR-37 (claim filing); PRD §4.6 Claim Flow; PRD Persona #7 Helpline Operator; Story 6.10 verifier console signals panel.

**Counsel-review-target inventory:**
- **Dual-path intake convergence ICP** — relative-as-deceased (via app, deceased's phone+OTP) + helpline-mediated (via phone), converging on a single case object
- **Deceased-phone-OTP authority-to-file evidentiary basis (Ravi-mode)** — uses the deceased's SIM + phone as proxy-credential; counsel reviews whether this constitutes sufficient authority-to-file under Indian Evidence Act + Trust law + Telecom Act SIM-attribution provisions
- **Helpline-mediated authority-to-file evidentiary basis (Persona #7)** — Helpline Operator captures member identification + story + dispatches verification packet; counsel reviews:
  - Identity-verification standard at intake (no-form-just-story discipline + verifier dispatch)
  - Evidentiary chain from helpline-intake → verifier packet → ground inspection → HQ approve → disburse
  - Audit-trail formalities for helpline-mediated intake (per FR-47 audit-log)
- **Dedup semantics** per UX §164 — when relative-as-deceased AND helpline-mediated converge within seconds, what is the override semantics? Counsel reviews evidentiary precedence
- **In-flight session visibility across channels** — counsel reviews privacy + DPDPA implications of cross-channel session visibility
- **Override semantics under race conditions** per UX Design Challenge #1
- **Claim-shepherd assignment** per FR-41 — human shepherd per claim; counsel reviews shepherd-as-proxy authority + scope-of-action
- **Witnessed declaration of relationship** per UX spec Stance #7 — Black-bordered photo, soft consent, witnessed declaration; counsel reviews evidentiary standard
- **OQ-UX-9 transferable-credential proxy patterns** — shepherd-as-proxy for low-literacy members; donor's spouse responding to a dispute; counsel reviews proxy-authority framework
- **Claim authority-to-file evidentiary specification per OQ-15** — Indian Evidence Act + Trust Act + DPDPA cross-cutting

**Affected Stories:** Story 6.2 (claim filing primitive), Story 6.3 (helpline-mediated claim filing UX-DR45 + UX-DR46), Story 6.5 (claim-state machine), Story 6.10 (verifier console signals panel UX-DR39), Story 10.1 (helpline routing policy), Story 10.2 (helpline-call-to-ticket workflow), Story 10.3 (SM-1 demo beat C3).

**Affected FRs/UX-DRs:** FR-37; FR-38; FR-39; FR-40; FR-41; UX-DR45 (member-lookup form); UX-DR46 (read-back card); UX-DR39 (signals panel); UX-DR55 (operator precise-technical register); UX Design Challenge #1.

---

## §2 Cross-Story deferred-scope inventory header

The cross-Story deferred-scope inventory enumerates the upstream Story-deferred legal-review-return obligations that Story 0.13 closure unblocks. The inventory rows are committed at author-commit as citation slots; substantive return text from counsel populates at Task 11 per the per-artifact-return-roster.

Inventory schema per row: `row_id` | `source_file` | `source_line_or_section` | `pre-existing_xref_text` | `scope_category` (one of the five primary scope items OR cross-Story deferred OR regulatory surface OR ADR slot) | `target_artifact_or_resolution` | `priority_class` (1-4) | `dependency_owning_story_or_epic`.

The inventory is **append-only**; forbidden-removal rule applied; supersession is the only allowed lifecycle exit. The substantive enumeration is in §3.

---

## §3 Cross-Story deferred-scope inventory enumeration

**Inventory total at author-commit:** 37 rows (32 at original author-commit + 5 architecture §Launch Gate Risks rows added via code review 2026-06-02; subject to ±5 variance per dev-time `grep` verification). The dev-time `grep -rn "Story 0.13\|PENDING LEGAL REVIEW" docs/ _bmad-output/implementation-artifacts/` yielded 146 raw matches across docs/ at author-commit (Story 0.13 framework files excluded); the inventory below consolidates these to ~32 distinct artifact-roster targets. **Consolidation logic:** the 146 raw matches reduce to 32 rows because (a) multiple matches within a single artifact section count as one row (e.g., `dc-1` push-channel.md has multiple "PENDING LEGAL REVIEW" markers but represents one artifact); (b) cross-links and back-references originating from Story-0.13-authored files are excluded; (c) grouped inventories (e.g., `td-1` through `td-7`, `bc-1` through `bc-4`) are pre-enumerated as distinct rows even when they appear in a single source file.

### Story 0.4 — Degradation policy comms-templates × 5 channels (5 rows)

Each carries the "PENDING LEGAL REVIEW PER STORY 0.13" marker per `docs/degradation-policy/README.md` §4 invariant 6 + Decision 2026-05-29-004 + the per-template body header blockquote.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `dc-1` | `docs/degradation-policy/comms-templates/push-channel.md` | Top blockquote + §"Legal-counsel return (PLACEHOLDER)" | "THIS TEMPLATE BODY IS PROVISIONAL. It remains pending legal counsel review per Story 0.13" | cross-Story deferred (comms-template) | counsel ratifies template body + marker flips to "LEGAL REVIEW RETURNED (YYYY-MM-DD)" via degradation-policy-ledger.md Legal-counsel revision log | 2 | Story 0.4 Task 9 |
| `dc-2` | `docs/degradation-policy/comms-templates/whatsapp-channel.md` | Top blockquote + §"Legal-counsel return (PLACEHOLDER)" | "THIS TEMPLATE BODY IS PROVISIONAL. It remains pending legal counsel review per Story 0.13" | cross-Story deferred (comms-template) | counsel ratifies template body + Meta UTILITY template approval at template-submission time | 2 | Story 0.4 Task 9 |
| `dc-3` | `docs/degradation-policy/comms-templates/sms-channel.md` | Top blockquote + §"Legal-counsel return (PLACEHOLDER)" | "THIS TEMPLATE BODY IS PROVISIONAL. It remains pending legal counsel review per Story 0.13" | cross-Story deferred (comms-template) | counsel ratifies template body + DLT-transactional template registration (PE/OE header) per architecture §2.2 + §3.4 | 2 | Story 0.4 Task 9 |
| `dc-4` | `docs/degradation-policy/comms-templates/email-channel.md` | Top blockquote + §"Legal-counsel return (PLACEHOLDER)" | "THIS TEMPLATE BODY IS PROVISIONAL. It remains pending legal counsel review per Story 0.13" | cross-Story deferred (comms-template) | counsel ratifies template body + email-provider selection ADR | 2 | Story 0.4 Task 9 |
| `dc-5` | `docs/degradation-policy/comms-templates/public-page-banner.md` | Top blockquote + §"Legal-counsel return (PLACEHOLDER)" | "THIS TEMPLATE BODY IS PROVISIONAL. It remains pending legal counsel review per Story 0.13" | cross-Story deferred (comms-template) | counsel ratifies template body + cache-safe SSR review per architecture §5.8a | 2 | Story 0.4 Task 9 |

### Story 0.6 — Backup-engineer contract-template § placeholders (4 rows)

Each carries an explicit "Counsel-return placeholder" marker per `docs/backup-engineer/contract-template.md` per Story 0.6 Task 9.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `bc-1` | `docs/backup-engineer/contract-template.md` | §6 NDA | "Counsel-return placeholder" | cross-Story deferred (contract-template) | substantive NDA template language committed | 3 | Story 0.6 Task 9 |
| `bc-2` | `docs/backup-engineer/contract-template.md` | §9 Insurance | "Counsel-return placeholder" | cross-Story deferred (contract-template) | substantive insurance + liability language committed | 3 | Story 0.6 Task 9 |
| `bc-3` | `docs/backup-engineer/contract-template.md` | §10 Termination | "Counsel-return placeholder" | cross-Story deferred (contract-template) | substantive termination triggers + cure procedures language committed | 3 | Story 0.6 Task 9 |
| `bc-4` | `docs/backup-engineer/contract-template.md` | §11 Dispute resolution | "Counsel-return placeholder" | cross-Story deferred (contract-template) | substantive jurisdiction + dispute resolution language committed | 3 | Story 0.6 Task 9 |

### Story 0.5 — Knowledge-transfer pack ADR slots (5 rows)

Each is a legal-counsel-gated ADR slot per `docs/knowledge-transfer/adr-index.md`.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `kt-1` | `docs/knowledge-transfer/adr-index.md` | Section A row ADR-NNNN-threat-model-actor-inventory | "Solo Builder + legal counsel (Story 0.13)" | ADR slot | substantive ADR content committed | 3 | Story 0.5 + Story 14.x |
| `kt-2` | `docs/knowledge-transfer/adr-index.md` | Section B row ADR-NNNN-cloudflare-pivot | "Solo Builder + Trustee Panel + legal counsel (Story 0.13)" | ADR slot | substantive ADR content committed at DPDPA-incompatible policy event OR pre-launch security review | 3 | Story 0.5 + architecture §5.8a |
| `kt-3` | `docs/knowledge-transfer/adr-index.md` | Section F row ADR-NNNN-hindi-native-trustee-ratification | "Trustee Panel + Solo Builder" + "Story 0.13 closure + operations-policy authoring" | ADR slot | substantive ADR content committed | 3 | Story 0.5 + Story 0.4 |
| `kt-4` | `docs/knowledge-transfer/adr-index.md` | Section H row ADR-NNNN-backup-engineer-contract-substantive-language | "Legal Counsel per Story 0.13" + "Story 0.13 closure + Story 0.6 Task 9 execution" | ADR slot | substantive ADR content committed (cross-coupled with `bc-1` through `bc-4`) | 3 | Story 0.5 + Story 0.6 |
| `kt-5` | `docs/knowledge-transfer/adr-index.md` | Section H row ADR-NNNN-engineer-identity-redaction-public-mirror | "Trustee Panel + Solo Builder + Legal Counsel per Story 0.13" + "Public-mirror provisioning event" | ADR slot | substantive ADR content committed | 4 | Story 0.5 + Story 0.3 + Story 0.6 |

### Story 0.2 — DPO-breach-reporting envelope (2 rows)

Per `docs/escrow/credential-inventory.md` lines 75, 77.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `es-1` | `docs/escrow/credential-inventory.md` | Line 75 `dpo-breach-reporting-portal` | "gated by Story 0.13 (`0-13-...`) for portal identification + access credentials" + "pending-system-availability (DPO not appointed at Story 0.2 closure)" | cross-Story deferred (DPDPA breach-reporting) | envelope identification + DPO-portal access credentials committed; envelope status flips from `pending-system-availability` to active | 2 | Story 0.2 + Story 14.3 + PRD §11 OQ-7 |
| `es-2` | `docs/escrow/credential-inventory.md` | Line 77 `dpo-contact-path` | "Story 14.3 + Story 0.13 + PRD §11 OQ-7 (DPO appointment)" + "pending-system-availability" | cross-Story deferred (DPDPA breach-reporting) | DPO identity + escalation tree + replacement-DPO appointment procedure committed | 2 | Story 0.2 + PRD §11 OQ-7 |

### Story 0.5 — Third-party-dependency-inventory Section E regulatory rows (7 rows)

Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section E (regulatory + governance — Trustee Panel primary monitoring owner; Story 0.13 legal counsel for legal escalation).

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `td-1` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "Indian Trust Act" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 3 | Story 0.5 + PRD §4.14.1 |
| `td-2` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "12A/12AB Income Tax registration" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 3 | Story 0.5 + PRD §4.14.1 |
| `td-3` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "GST registration" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 4 | Story 0.5 + PRD §4.14.1 |
| `td-4` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "80G registration" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates (Phase 2/3 readiness) | 4 | Story 0.5 + PRD §4.14.1 |
| `td-5` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "DPDPA Data Fiduciary registration" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 2 | Story 0.5 + PRD §4.14.1 + PRD §11 OQ-7 |
| `td-6` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "RBI/UPI" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 3 | Story 0.5 + PRD §4.14.1 |
| `td-7` | `docs/knowledge-transfer/third-party-dependency-inventory.md` | Section E row "TDS §194H" | Section E regulatory row | regulatory surface | counsel returns monitoring-owner + escalation-path updates | 4 | Story 0.5 + PRD §4.14.1 |

### Story 0.5 — On-call playbook + KT pack contact lists (3 rows)

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `oc-1` | `docs/knowledge-transfer/on-call-playbook.md` | §5 contact-escalation list | "legal counsel per Story 0.13" | cross-Story deferred (operational-readiness) | counsel identity + contact path committed (post-Task-8 selection) | 2 | Story 0.5 |
| `oc-2` | `docs/knowledge-transfer/README.md` | OQ#5 resolution (line 52) | "Legal escalation routes via Story 0.13 legal counsel" | cross-Story deferred (KT pack) | counsel review of Section E regulatory rows (cross-coupled with td-1 through td-7) | 3 | Story 0.5 OQ#5 |
| `oc-3` | `docs/escrow/README.md` | "Related escrow surfaces owned elsewhere" + sealing-procedure §"Legal counsel escalation" | "The legal counsel engaged under Story 0.13" | cross-Story deferred (escrow operations-policy) | counsel guidance on DPDPA / partner-contract terms for credential operations | 3 | Story 0.2 |

### Story 0.7 — Fallback-handler-ledger denial-appeal node (2 rows)

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `fl-1` | `docs/fallback-handler-ledger/loop-nodes/denial-appeal.md` | §3 + §11 (post-Task-6 Notes-clarification append) | "FR-43A internal claim-denial appeal flow procedural-fairness review per Story 0.13 review-scope-charter §1(c)" | cross-Story deferred (denial-appeal procedural-fairness) | counsel review of FR-43A flow procedural fairness (cross-coupled with §1(c)) | 2 | Story 0.7 + Story 6.16 |
| `fl-2` | `docs/fallback-handler-ledger/README.md` | §9 Related continuity + governance surfaces table (post-Task-6 append) | Story 0.13 framework cross-reference | cross-Story deferred (fallback-handler-ledger) | framework existence acknowledged + denial-appeal escalation legal review | 4 | Story 0.7 |

### Story 0.12 — Spec-to-cadence reconciliation contract-help-path budget (1 row)

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `sc-1` | `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` | §3(c) Contract-help path | "Legal-counsel concurrent-review scope budget cross-coupling per Decision 2026-06-01-012 body item 9" | cross-Story deferred (engagement-budget) | substantive engagement-letter §5 retainer + per-artifact pricing + funding source resolution committed at Story 0.13 Task 9; backfill-status flipped at `docs/spec-to-cadence-reconciliation/backfill-log.md` | 1 | Story 0.12 Task 9 cross-coupling |

### Architecture §Launch Gate Risks legal-counsel rows (5 rows)

Architecture §Launch Gate Risks subsidiary rows (architecture lines 4785-4788) that name legal counsel as owner/co-owner; cross-referenced in README.md authority cites. Each represents an open architecture-level gate that Story 0.13 concurrent-review partially discharges.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `ar-1` | `_bmad-output/planning-artifacts/architecture.md` | Line ~4785 §Launch Gate Risks | "DPDPA grievance officer designation: Trustee Panel + Legal Counsel" | cross-Story deferred (DPDPA operational) | DPDPA grievance officer designation + DPO identity committed per §1(b) scope item + OQ-7 resolution (cross-coupled with `es-2`) | 2 | Story 0.13 Task 11 + PRD §11 OQ-7 |
| `ar-2` | `_bmad-output/planning-artifacts/architecture.md` | Line ~4786 §Launch Gate Risks | "FR-43A external forum destination: Trustee Panel + Legal Counsel co-owner" | cross-Story deferred (denial-appeal forum) | counsel commits district/state consumer commission + civil court routing per §1(c) scope item (cross-coupled with `fl-1` + Row 2 review-artifact-roster) | 1 | Story 0.13 Task 11 + Story 6.16 |
| `ar-3` | `_bmad-output/planning-artifacts/architecture.md` | Line ~4787 §Launch Gate Risks | "Regulatory surface sign-off: Legal Counsel pre-launch" | regulatory surface | counsel pre-launch sign-off on §4 13-row regulatory surface table (cross-coupled with §4 entire table + `ar-4` + `ar-5`) | 1 | Story 0.13 Task 11 + pre-launch gate |
| `ar-4` | `_bmad-output/planning-artifacts/architecture.md` | Line ~4788 §Launch Gate Risks | "Trust formation + legal registration: Legal Counsel" | regulatory surface | counsel confirms Bihar Indian Trust Act registration process + filing strategy (cross-coupled with §4 Indian Trust Act row) | 1 | Story 0.13 Task 11 |
| `ar-5` | `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` | §4.14.1 line 1169 | "Canonical; legal counsel must sign off pre-launch" | regulatory surface | counsel pre-launch sign-off on PRD §4.14.1 canonical regulatory surface inventory; umbrella cross-reference complementing the per-surface §4 rows (`ar-5` = the mandate; §4 rows = per-surface) | 1 | Story 0.13 Task 11 + PRD §4.14.1 |

### Multi-Pariwar provisioning (3 rows)

Per `docs/runbooks/multi-pariwar-provisioning.md` lines 19, 45, 107, 123, 132.

| row_id | source_file | source_line/section | pre-existing_xref_text | scope_category | target_artifact_or_resolution | priority_class | dependency_owning_story |
|---|---|---|---|---|---|---|---|
| `mp-1` | `docs/runbooks/multi-pariwar-provisioning.md` | Line 19 | "Per Story 0.13, legal counsel has concurrent-review scope; the new Pariwar's trust-posture copy, DPDPA consent flow, and procedural fairness specs are reviewed before public-facing surfaces go live" | cross-Story deferred (multi-Pariwar operations) | counsel review of new-Pariwar provisioning before public-facing surfaces (per-Pariwar review event) | 4 | Story 1.15 + Story 0.13 |
| `mp-2` | `docs/runbooks/multi-pariwar-provisioning.md` | Line 45 | "The Niyamavali may be the same as Bihar's at v1 or jurisdiction-specific per legal counsel review (Story 0.13)" | cross-Story deferred (Niyamavali per-Pariwar) | counsel reviews per-Pariwar Niyamavali variant if jurisdiction differs | 4 | Story 2.3 + Story 1.15 |
| `mp-3` | `docs/runbooks/multi-pariwar-provisioning.md` | Lines 107, 123, 132 | "Provisioning a Pariwar without legal counsel review per Story 0.13" forbidden + checklist + contact list | cross-Story deferred (multi-Pariwar runbook) | per-Pariwar legal review checkpoint + contact path | 4 | Story 1.15 |

---

## §4 Phase-0 regulatory surface review

Per PRD §4.14.1 + PRD line 1169 "Canonical; legal counsel must sign off pre-launch."

| Cash flow / surface | Applicable law(s) | Counsel-review-target | Story closure trigger | Priority |
|---|---|---|---|---|
| ₹110 Vyawastha Shulk fee — member to trust | Indian Trust Act 1882; Income Tax Act 12A/12AB; DPDPA; state-cooperative-society laws (Bihar specifics OQ-pending) | Trust posture + 12A/12AB filing strategy + DPDPA member-PII handling | Story 0.13 Task 11 (post-counsel-return on PRD §4.14.1 regulatory surface artifact) | 2 |
| Support-pool contributions — member to nominee (UPI direct) | UPI RBI regulation; personal-transaction rules; PMLA threshold | Facilitator-not-intermediary posture + UPI Intent semantics + RBI compliance | Story 0.13 Task 11 | 2 |
| Module commissions — partner to trust | Income Tax §194H TDS; GST threshold (₹20L p.a.) | TDS withholding mechanics + GST registration trigger + commission-revenue B2B billing | Story 0.13 Task 11 + commission-revenue threshold trigger | 4 |
| Field-worker payments — trust to field worker | Income Tax §194H TDS; PF/ESI evaluation | Independent-contractor vs employment classification + TDS remittance + PAN requirements + quarterly TDS return | Story 0.13 Task 11 + Story 6.7 + Story 1.13 | 3 |
| Phase 2/3 Crowdfunding Module | 80G; PAN ≥₹2k donations; PMLA threshold; FCRA (foreign donors TBD); RBI payment-gateway | Crowdfunding regulatory posture (deferred to Phase 2/3) | Story 0.13 Task 11 (Phase 2/3 trigger event) | 4 |
| Indian Trust Act registration (Bihar) | Indian Trust Act 1882; Bihar Trust registration process | Trust formation + registration filing strategy | Story 0.13 Task 11 + architecture line 4788 Trust formation row | 1 |
| 12A / 12AB Income Tax registration | Income Tax Act; CBDT 12A/12AB process | Income Tax filing strategy + trust-income-tax position | Story 0.13 Task 11 | 2 |
| 80G registration (Phase 2/3 readiness) | Income Tax Act 80G | Donation-eligibility framing + lapse-avoidance discipline | Story 0.13 Task 11 + Phase 2/3 trigger | 4 |
| DPDPA Data Fiduciary registration | DPDPA + MeitY threshold publication | Threshold-tracking + registration-timing + DPO appointment | Story 0.13 Task 11 + PRD §11 OQ-7 + Story 14.3 | 2 |
| Consumer Protection Act 2019 | CPA 2019 + Indian Evidence Act | Trust posture + FR-43A mitigation + court-jurisdiction framing | Story 0.13 Task 11 + cross-coupled with §1(c) denial-appeal procedural-fairness | 1 |
| TRAI DLT-transactional | TRAI DLT-transactional registration (PE/OE) | OTP-SMS + transactional-fallback-SMS + degraded-mode SMS templates | Story 0.13 Task 11 + Story 5.3 + Story 0.4 sms-channel template | 3 |
| RBI/UPI | RBI payment-system regulation | Facilitator-not-intermediary posture + UPI Intent semantics + Payment Aggregator non-license justification | Story 0.13 Task 11 + architecture line 4787 Regulatory surface sign-off row | 2 |
| FCRA (Phase 2/3 if foreign donors permitted) | FCRA + foreign-donation regulations | Foreign-donation framework if Phase 2/3 enables foreign donors | Story 0.13 Task 11 + Phase 2/3 trigger | 4 |

---

## §5 ADR slot review

Per `docs/knowledge-transfer/adr-index.md` Section A-J counsel-gated entries — cross-link to the substantive ADR slots that Story 0.13 closure unblocks. Each slot's substantive ADR content commits at Story 0.13 Task 11 per-slot event.

Cross-reference to §3 inventory rows `kt-1` (threat-model) + `kt-2` (cloudflare-pivot) + `kt-3` (hindi-native-trustee-ratification) + `kt-4` (backup-engineer-contract-substantive-language) + `kt-5` (engineer-identity-redaction-public-mirror).

Additional ADR slots that are NOT in `kt-1` through `kt-5` but are counsel-touching per the Section J + Section K reviews:
- **ADR-NNNN-SM-1-amendment** (Story 0.12 Section J) — if move-SM-1 ratified per Story 0.12 reconciliation, the SM-1 amendment ADR may carry trust-fiduciary implications; counsel review at Story 0.12 Task 9 if move-SM-1 selected
- **ADR-NNNN-KYC-retention-policy** (architecture §1761-1763) — counsel commits the retention horizon via ADR; deferred to Story 0.13 Task 11 + DPDPA Data Fiduciary registration timing
- **ADR-NNNN-Account-State-Machine-composition** (architecture §4802-4815) — Composed Account State enumeration; counsel review touchpoints on notice/service formalities cross-coupled with §1(d)

The `docs/knowledge-transfer/adr-index.md` Section K (Story 0.13's own ADR slots) — see Story 0.13 README §7 — is NOT in scope of this charter §5 (Section K slots are framework-internal Story 0.13 deferred-with-ADR slots, not legal-counsel-gated ADRs for upstream artifacts).

---

## §6 Pre-launch checkpoints

Per architecture §External Validation Pending (architecture lines 4849-4852): "Engagement begins from architecture finalization and remains **concurrent** through Phase-0 and pre-launch checkpoints (not post-hoc review)."

Counsel commits availability at each named checkpoint per `engagement-letter-template.md` §9 Concurrent-review cadence + `engagement-ledger.md` §9 Periodic re-attestation log:

| Checkpoint | Trigger event | Counsel-side commitment | Outcome logged |
|---|---|---|---|
| **Phase-0 closure** | Stories 0.1–0.15 all closed | Counsel reviews the Phase-0 portfolio outcome + AR-49 launch-gate inventory closure status | `engagement-ledger.md` §9 + `.decision-log.md` `[LEGAL]` entry |
| **T&C version-pin lock per Story 2.6** | Story 2.6 T&C version-pinning closure with `legal_review_status = approved` per Story 2.6 substantive integration | Counsel ratifies T&C verbatim phrasing per FR-94 + Niyamavali version-pinning logic + provisional-banner removal | `engagement-ledger.md` §9 + Story 2.6 audit-trail |
| **First-claim SM-1 pre-launch** | First simulated or real claim per Story 6.16 / Story 9.x | Counsel reviews the end-to-end claim flow + FR-43A appeal preparedness + Account State Machine transition handling + dual-path authority-to-file as applied | `engagement-ledger.md` §9 + Story 6.x audit-trail |
| **Public-launch gate** | Phase-1 v1 ship gate per PRD §7 SM-1 | Counsel reviews the public-facing surface (Niyamavali public render + Sahyog Vivran + In Memoriam + T&C public render) + DPDPA compliance posture + breach-reporting tooling activation | `engagement-ledger.md` §9 + `.decision-log.md` `[LEGAL]` entry + Trustee Panel pre-launch sign-off |
| **Per-major-architecture-amendment** | Architecture amendment touching legal-counsel scope (e.g., new regulatory surface, new T&C verbatim phrasing, new Account State Machine transition) | Counsel reviews the architecture amendment per `README.md` §6 re-attestation cadence | `engagement-ledger.md` §9 + ADR-NNNN-architecture-amendment-cross-link |
| **Multi-Pariwar provisioning per Story 1.15** | New Pariwar provisioning event per `docs/runbooks/multi-pariwar-provisioning.md` | Counsel reviews per-Pariwar Niyamavali + DPDPA + procedural-fairness posture (cross-reference inventory rows `mp-1` + `mp-2` + `mp-3`) | `docs/runbooks/multi-pariwar-provisioning.md` checklist + `engagement-ledger.md` §9 |

---

## §7 Out-of-scope items

Per AC-1 + Story 0.13 README §4 invariant 11 (engagement letter forbids exclusivity clauses), the following items are **NOT** in scope under this concurrent-review engagement letter. They may be engaged separately under separate engagement letters with the same or different counsel:

- **Criminal-defense** — if a trust-side employee/contractor faces criminal action, criminal-defense counsel is engaged separately
- **Tax-litigation** — Income Tax disputes + GST audit defense + assessment-appeal proceedings are separate engagements
- **Non-Bihar non-Indian jurisdiction matters** — multi-state expansion (when triggered) engages local counsel per Story 1.15 multi-Pariwar provisioning; foreign-jurisdiction matters (if Phase 2/3 enables foreign donors per FCRA evaluation) engage foreign-jurisdiction counsel
- **Non-trust-related business** — Solo Builder's personal legal matters; trustees' personal legal matters; non-TWT business interests of any party
- **Non-legal accounting + tax-filing** — CA / Tax-Practitioner functions for routine filing are separate engagements; legal review of substantive tax position is in-scope
- **Specific contract negotiations with non-trust parties** — vendor contracts (FCM, WA BSP, OCR provider, payment-gateway Phase 2/3, etc.) may carry counsel review per per-vendor engagement, but routine negotiation is operations-policy
- **HR / employment counsel** — if the trust hires employees (vs the Operations Lead role contracted under Story 0.7 and the backup engineer under Story 0.6 as independent contractors), employment-counsel is engaged separately
- **Specific compliance-audit defense** — DPDPA enforcement actions + RBI/UPI compliance audits + Income Tax assessment audits each engage scope-specific defense counsel; the concurrent-review engagement under this letter does NOT include compliance-defense-counsel scope

If a counsel-return event under this engagement surfaces a substantive need for one of these out-of-scope engagements, the Counsel notes the recommendation in `per-artifact-return-roster.md` `return_open_questions` field + the Trustee Panel evaluates engaging substitute or additional counsel per the framework `README.md` §4 invariant 11 multi-counsel permission.

---

## §8 Charter signature path

**Trustee Panel ratification at Story 0.13 Task 7:**
- Trustee Panel chair + ≥1 additional trustee ratify the charter §1 + §3 + §4 + §5 + §6 + §7 + §2 framework
- Ratification mode per `README.md` §5: pack-as-a-unit (default) OR per-scope-item; mode recorded in `engagement-ledger.md` §3 Trustee scope ratification log header
- Ratification event logged in `engagement-ledger.md` §3 + `.decision-log.md` `[LEGAL]` supersession entry on Decision 2026-06-02-013

**Counsel acceptance at Story 0.13 Task 9:**
- Selected Counsel reads the charter + acknowledges its scope as the basis of the engagement
- Counsel-side acceptance is documented in the executed engagement letter (per `engagement-letter-template.md` §3 cross-reference)
- Counsel-side substantive disagreement on scope is grounds for re-negotiation per Trustee Panel + Counsel + `engagement-ledger.md` §4 Counsel-selection log + Decision 2026-06-02-013 supersession entry; **re-negotiation failure path:** if re-negotiation does not produce counsel-side acceptance within `<RENEGOTIATION WINDOW — pending Trustee Panel decision>` days, the Trustee Panel returns to the shortlist at Task 8; the ratified scope-charter §1 + §3 + §4 survives unchanged; the failed negotiation is logged as a `.decision-log.md` `[LEGAL]` supersession entry documenting the scope-items in disagreement

**Charter amendment:**
- Requires ≥2-trustee + Counsel co-signature
- Documented in `.decision-log.md` `[LEGAL]` supersession entry per the schema
- Out-of-scope items moved to in-scope require Counsel-side scope-acceptance + pricing-structure amendment per `engagement-letter-template.md` §5
- In-scope items moved to out-of-scope require Trustee Panel rationale + Counsel-side acknowledgment + `engagement-ledger.md` §10 Pack-revision log entry
- The charter is **append-only** at the row + sub-section level per `README.md` §4 invariant 2; supersession is the only allowed lifecycle exit
