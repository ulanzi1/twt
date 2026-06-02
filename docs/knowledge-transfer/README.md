# Knowledge-Transfer Documentation Pack

This directory holds the **Knowledge-Transfer (KT) pack** — the durable, trustee-accessible documentation surface that lets a contracted external engineer come up to speed on the trust's technical context without consulting Solo Builder, within the AR-67 + PRD §9.1.1 30-day-takeover window.

Authority: PRD §9.1.1 paragraph 5 ("Knowledge-transfer documentation — at minimum: ADRs, Niyamavali → FR mapping, deployment topology, on-call playbook, third-party dependency inventory with renewal dates") commits the pack content. Architecture Cross-Cutting #20 ("Solo-build operational continuity") commits KT pack as one of the discharge surfaces for the bus-factor-of-one risk. Story 0.5 (epics.md) commits the framework + the comprehension-questionnaire gate.

## 1. Why `docs/knowledge-transfer/` is a top-level surface

The KT pack lives at `docs/knowledge-transfer/` — a NEW top-level surface under `docs/`, parallel to `docs/runbooks/` (Story 0.1), `docs/escrow/` (Story 0.2 + 0.3 code-escrow), `docs/degradation-policy/` (Story 0.4), and `docs/adr/` (scaffolded by Story 0.5 Task 1 per Decision 2026-05-29-003 Open Follow-up #6).

The PRD §9.1.1 KT pack content is broader than any single existing directory's scope:

- The **ADR index** lives in the KT pack (not in `docs/adr/`) because the index is a reader-facing cross-walk that must enumerate *all* deferred-decision slots — including slots that live in `[deferred ADR — placeholder procedure]` runbook tags + framework READMEs — not just the `docs/adr/*.md` files. Putting the index in `docs/adr/` would conflate the canonical ADR file directory with the reader-facing cross-walk.
- The **Niyamavali → FR mapping** is a specification → implementation cross-walk that does not belong in any single existing directory; it spans PRD §1 + architecture §1.14 + multiple epics.
- The **deployment topology** is a reader's map keyed to architecture §5.1-§5.10; it is NOT a runbook (it doesn't have a five-section runbook structure; it's descriptive, not procedural).
- The **on-call playbook** uses the runbook five-section schema but is structurally the *meta-playbook* above the seven Phase-0 runbooks; it routes incidents to per-task runbooks + ADR slots + escalation paths.
- The **dependency inventory** is operationally adjacent to `docs/escrow/credential-inventory.md` but covers a different surface — credential envelopes vs vendor / contract / renewal cadence / monitoring owner — and cross-links rather than duplicates.

The unified directory discharges the PRD §9.1.1 trustee-accessible-storage commitment as a single surface the trustees can reference cleanly.

## 2. Framework lifecycle

```
drafted
   ↓
reviewed-pending-comprehension-administration
   ↓
trustee-signed-off
   ↓
backup-engineer-administered
   ↓
80-percent-threshold-met
   ↓
fully-ratified
```

States `trustee-signed-off` and `backup-engineer-administered` are **co-required parallel predecessors** to `80-percent-threshold-met` — they may be reached in any order, but both are required before the pack is `fully-ratified`. The lifecycle is recorded in `kt-pack-ledger.md` per component file OR per pack-as-a-unit; mode is the Trustee Panel's choice at Task 8 execution.

## 3. Property / control / policy / gap-analysis discipline

The KT pack follows the four-way discipline established by Stories 0.2 + 0.3 + 0.4 (per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]] + [[feedback_gap_analysis_observational]]):

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-equivalent) | Technical context is recoverable without Solo Builder; ADR index is the canonical inventory of deferred-decision slots; Niyamavali → FR mapping is the canonical specification → implementation cross-walk; deployment topology is a reader's map keyed to architecture (NOT a duplicate of architecture); on-call playbook routes incidents to runbooks / ADRs / escalation paths; dependency inventory captures monitoring owner + renewal cadence + vendor contact per dependency; comprehension administration discharges the 80% threshold property | This README §4 "Structural invariants"; AC text in Story 0.5; per-component file schemas |
| **Policy** (PRD-equivalent) | What the trust does to recover technical context under bus-factor scenario (PRD §9.1.1 paragraph 5: KT pack minimum content; A-13 backup engineer reads + scores ≥80%); review-cadence policy fallback (quarterly / annual / per-event) | §6 "Review cadence fallback"; per-component file content; comprehension questionnaire section coverage |
| **Control** (ADR territory) | Specific paging integration for on-call surface (per architecture §5.10 deferred); specific provider for telephony / paging / tracing / push (per §3.5 + §5.6 + §5.10 deferred); specific renewal cadence per dependency class (per operations policy); specific Niyamavali rule-registry data model (per Story 2.3 + Epic 4); specific deployment automation (per Story 1.1 + 1.15) | §8 "Open ADR slots"; `adr-index.md` deferred-slot rows; cross-references to `docs/adr/` once substantive content lands per PR-2 |
| **Gap analysis** (observational) | Comprehension administration observes which questions are `unanswerable-from-pack`; periodic re-attestation observes which dependency renewal-dates are stale; ADR-index review observes which deferred slots have lingered without authoring; Niyamavali → FR mapping observes which clauses lack implementing FRs | `kt-pack-ledger.md` "Comprehension administration log" gap-list rows; "Periodic re-attestation log" stale-date rows; "Pack-revision log" gap-discharge rows; §8 "Open ADR slots" |

The gap-analysis layer does NOT prescribe sprint planning or override architecture per [[feedback_gap_analysis_observational]] — it observes incompleteness/risk and proposes conditional escalation paths.

**Open Question #5 (resolved):** Regulatory and governance rows in `third-party-dependency-inventory.md` Section E assign **Trustee Panel** as primary monitoring owner (not Solo Builder), because the Trust as a legal entity — not the engineer — is the registered compliance and accountability party. Solo Builder is secondary (operational-implementation role only). Legal escalation routes via Story 0.13 legal counsel. This choice is recorded here so the comprehension-questionnaire answer key (`comprehension-questionnaire-answer-key.md` Q-E.6) can cite it unambiguously.

## 4. Structural invariants — what the KT pack MUST NOT violate

These are load-bearing properties; silent violation is a framework-gap signal:

1. **No silent duplication of canonical sources.** The PRD is the canonical source for Niyamavali clauses; architecture is the canonical source for FRs + the §1.14 state table + the §5.1-§5.10 topology; the runbooks are canonical for per-task operational procedures. The KT pack is a *reader's map* keyed to those canonical sources — it does NOT re-author content. The single permitted duplication is the verbatim transcription of architecture §1.14 lines 1238-1246 state table in `niyamavali-fr-mapping.md` §"Account State Machine extract", documented as a deliberate exception below.
2. **No orphan rows in Niyamavali → FR mapping.** Every row cross-links to (a) the PRD §1 clause it summarizes, (b) the FR(s) implementing it, (c) the owning Story key from sprint-status. An orphan row is a gap.
3. **No dependency rows that omit the monitoring owner per §3.10.** Every external dependency has a named monitoring owner — Solo Builder by default at v1, Trustee Panel for regulatory-gate rows, with explicit secondary + escalation. The monitoring-owner column is the single most important operational handle; omission is a framework violation.
4. **No ADR-index rows that omit the expected-author or expected-close trigger.** Every deferred-ADR slot names *who* will author the substantive content + *what closure* unblocks the authoring (typically an owning Story).
5. **No comprehension-questionnaire revision that lowers the 80% threshold.** The threshold is committed by Story 0.5 AC-3; lowering it without a new `.decision-log.md` `[CONTINUITY]` entry under Trustee Panel authority is a framework violation.
6. **No pack-revision event that fails to log the supersession-schema marker.** Every revision that supersedes a prior row / section / paragraph records the supersession in `kt-pack-ledger.md` "Pack-revision log" with the gap-list row (if any) that triggered it.
7. **No substantive ADR content authored in `docs/adr/` by the KT pack.** Story 0.5 scaffolds `docs/adr/` (README + template); substantive ADR drafting is PR-2 / implementation-time work per architecture §Implementation Handoff. A KT-pack-driven substantive ADR is a scope-discipline violation.
8. **No leakage of operational secrets into the topology / on-call / dependency-inventory documents.** Secrets live in `docs/escrow/` per Story 0.2; the KT pack cross-references envelope rows by name, never inlines secret values.
9. **No member PII / claim PII / nominee PII anywhere in the pack.** The pack is a technical-context surface; it must not become an exfiltration vector under bus-factor scenario.

## 5. Sign-off lifecycle

A KT-pack component (or the pack as a unit) is only `trustee-signed-off` after ≥2-trustee ratification recorded in `kt-pack-ledger.md` "Trustee sign-off log". Permitted modes:

- **Pack-as-a-unit ratification** — the trustees ratify the seven component files + ledger + answer key + ADR scaffold as a single unit; one Decision 006 supersession; one ledger entry per ratifying trustee (≥2 rows).
- **Per-component ratification** — the trustees ratify each component file individually; one Decision 006 supersession per bundle; one ledger entry per ratifying trustee per component (≥2 rows per component).

The mode is recorded in the sign-off log header at the time of the first ratification. Quorum note: each sign-off event requires ≥2 rows (one per ratifying trustee); a single-row sign-off event is incomplete (this quorum rule mirrors the Story 0.4 review-decision precedent).

**Material edits after sign-off** trigger re-sign per the Story 0.1 lifecycle (≥1 trustee re-attestation for minor edits; ≥2 for material edits). Re-sign is logged in the same "Trustee sign-off log" with the supersession-schema marker.

**Emergency quorum exception.** If only 1 trustee is available at sign-off time due to the other trustee being incapacitated, a single-trustee emergency ratification is valid under ALL of the following conditions: (a) the incapacitation is documented in `.decision-log.md` as a `[CONTINUITY]` entry under Trustee Panel authority; (b) the single-trustee ratification is time-bounded (≤ 90 days — the second trustee's ratification must follow within 90 days of their return to availability); (c) the sign-off log row Notes column records the emergency-exception basis explicitly. ≥2-trustee quorum remains the default; this exception is a narrow operational fallback.

## 6. Review cadence fallback (pre-operations-policy)

Until operations policy is authored, the review cadence falls back to:

- **Quarterly** _(Owner: Solo Builder initiates + Trustee Panel reviews findings)_ — dependency-inventory renewal-date review (every row checked against current vendor / contract / next renewal); ADR-index status review (every `slot-reserved-pre-write` row checked against the owning Story's status; stale rows surfaced as Open Follow-ups).
- **Annual** _(Owner: administering Trustee as facilitator + contracted backup engineer per Story 0.6 as examinee)_ — comprehension re-administration to the contracted backup engineer; re-administration row appended to `kt-pack-ledger.md` "Comprehension administration log".
- **Per-architectural-amendment** _(Owner: Solo Builder, triggered on any architecture.md amendment per AR-69)_ — when architecture.md is amended (per AR-69 ADR-backlog ratification cadence), the affected `adr-index.md` rows + `deployment-topology.md` sections + `niyamavali-fr-mapping.md` rows are refreshed. The refresh is logged in "Pack-revision log".
- **Per-Story-closure** _(Owner: Solo Builder or the closing Story's author)_ — when an owning Story closes:
  - Niyamavali → FR mapping row's `current_status` flips (`spec-only → in-implementation → partially-implemented → fully-implemented`).
  - Dependency inventory row's `status` flips (`pending-system-availability → active` or `pending-ADR-selection → active` once the ADR ratifies the selection).
  - ADR-index row's `current_status` flips (`slot-reserved-pre-write → drafted` etc).
- **On-incident** _(Owner: Solo Builder or backup engineer serving as incident responder)_ — when a P0-class incident occurs, a post-mortem is conducted (per the Story 0.4 framework Activation/deactivation ceremony pattern adapted). On-call playbook revisions per the post-mortem are logged in "Pack-revision log".

Specific cadence numbers (exact dates, exact thresholds) belong in operations policy, not in this README — when operations policy is authored, the fallback values are superseded.

## 7. Ledger-vs-component-files reconciliation

`kt-pack-ledger.md` is **authoritative** for:

- Trustee sign-off status (per component OR pack-as-a-unit)
- Comprehension administration outcomes (per administration; per gap)
- Pack-revision events (every supersession recorded)
- Periodic re-attestation events (per cadence)
- 30-day-takeover joint-discharge contribution per administration

The component files (`adr-index.md`, `niyamavali-fr-mapping.md`, `deployment-topology.md`, `on-call-playbook.md`, `third-party-dependency-inventory.md`, `comprehension-questionnaire.md`, `comprehension-questionnaire-answer-key.md`) are **authoritative** for content. If the ledger says a row is `trustee-signed-off` but the corresponding file content shows `drafted`, the ledger wins (and the file content is stale + needs the supersession-schema marker applied).

## 8. Open ADR slots (what this framework defers to ADRs)

Specific control mechanisms that the KT pack does NOT decide; substantive content lives in `docs/adr/` post-PR-2:

- **Paging surface integration** — the specific paging SaaS the on-call playbook references is `[deferred ADR — placeholder procedure]` per architecture §5.10; selection at operations-policy authoring time.
- **Operations-policy re-attestation cadence** — the README §6 fallback values are superseded once operations policy lands; the cadence ADR slot is reserved in `adr-index.md`.
- **Vendor-contact format for the dependency inventory** — the specific contact-recording format (support portal URL? escalation contact? credential-envelope cross-link?) is operations-policy territory; rows currently use a hybrid format pending the ADR.
- **Niyamavali → FR mapping precision threshold** — the per-row status flip (`spec-only → in-implementation`) currently triggers when ANY implementing FR ships; a stricter threshold (e.g., ALL implementing FRs must ship for `partially-implemented`) is operations-policy territory.
- **Comprehension-questionnaire administration cadence** — Story 0.5 commits annual re-administration as the fallback; operations policy may tighten or loosen.
- **Substantive ADR drafting cadence** — the ≥40 deferred-ADR slots inventoried in `adr-index.md` are authored as PR-2 + downstream-Story implementation lands per architecture §Implementation Handoff (lines 5069-5096); the per-slot drafting cadence is operations-policy + per-owning-Story.
- **30-day-takeover joint-discharge ratification path** — when Stories 0.3 + 0.4 + 0.5 + 0.6 all close, the joint-discharge achievement is recorded in `.decision-log.md` per the Story 0.3 Decision 003 closure path; the specific ratification mechanism (single Decision OR per-Story chain) is operations-policy territory.

## 9. Related continuity surfaces owned elsewhere

The KT pack is one of six continuity surfaces; the others live in their own framework directories:

| Surface | Owning Story | Framework directory |
|---|---|---|
| Operational runbooks (the seven Phase-0 runbooks) | Story 0.1 | `docs/runbooks/` |
| Credential escrow (the seven PRD §9.1.1 credential domains) | Story 0.2 | `docs/escrow/` |
| Code escrow (auto-mirror pipeline + restoration-drill) | Story 0.3 | `docs/escrow/code-escrow/` |
| Per-surface degradation policy (5 channel comms templates + table-top exercise) | Story 0.4 | `docs/degradation-policy/` |
| **Knowledge-Transfer Pack (ADR index + Niyamavali → FR mapping + deployment topology + on-call playbook + dependency inventory + comprehension questionnaire)** | **Story 0.5** | **`docs/knowledge-transfer/` (this directory)** |
| Backup engineer contract (named external engineer + retainer + NDA + scope-of-work + activation procedure + onboarding checklist + engineer roster + ledger) | Story 0.6 | `docs/backup-engineer/` (author-committed 2026-05-30 per Decision 2026-05-30-006; framework includes README + contract-template + scope-of-work + access-grant-procedure + onboarding-checklist + activation-procedure + engineer-roster + backup-engineer-ledger; substantive contract documents + named engineer + IAM grant pending Story 0.6 Tasks 8-10) |
| Fallback-handler ledger (per-loop-node funded on-rota staff fallback per UX §0 Stance #6 + UX-DR4 + AR-61 + UX §Phase-0 P0-1) | Story 0.7 | `docs/fallback-handler-ledger/` (author-committed 2026-05-30 per Decision 2026-05-30-007; framework includes README + ledger + loop-nodes/ × 8 + rota + operations-lead-commitment + backfill-log; Operations Lead hire OR substitute-handler-bench formal ratification pending Story 0.7 Task 8; per-loop-node named role + funding pending Task 9; ≥2-trustee ledger sign-off pending Task 10; synthetic SLA test pending Task 11. This is the **parallel** loop-node-operational-responsiveness portfolio, distinct from the bus-factor-of-one mitigation portfolio per `docs/fallback-handler-ledger/README.md` §10 disjoint-anchor discipline — closure does NOT contribute to the 30-day-takeover joint discharge in §10 below) |
| Spec-to-cadence reconciliation (engineer-month estimate vs SM-1; mismatch-ratio computation; cut-scope / move-SM-1 / contract-help per UX §Phase-0 P0-3 + AR-49 P0-3) | Story 0.12 | `docs/spec-to-cadence-reconciliation/` (author-committed 2026-06-01 per Decision 2026-06-01-012; framework includes README + estimation-methodology + estimation-worksheet + per-loop-node-estimates × 8 + per-tier-surface-estimates × 3 + reconciliation-decision-framework + backfill-log; substantive estimate authoring + reconciliation-decision + ≥2-trustee ratification + Epic List + sprint plan updates + Step 4 validation pending Tasks 7–11. AR-49 P0-3 discharge path per `docs/spec-to-cadence-reconciliation/README.md §9` disjoint-anchor discipline — distinct from bus-factor-of-one mitigation portfolio + loop-node operational-responsiveness portfolio + empathy field-work portfolio) |
| Legal counsel concurrent-review engagement (5 AC-named scope items: trust-posture copy + DPDPA consent flow + denial-appeal procedural fairness + Account State Machine transition-table + dual-path claim authority-to-file evidentiary spec per UX §Phase-0 P0-4 + epics line 564 + 687) | Story 0.13 | `docs/legal-counsel-engagement/` (author-committed 2026-06-02 per Decision 2026-06-02-013; framework includes README + engagement-letter-template + review-scope-charter + review-artifact-roster + per-artifact-return-roster + counsel-roster + engagement-ledger; Trustee Panel scope ratification + counsel selection + engagement-letter signature + first-artifact submission + counsel returns + Epic 2/3/6 integration pending Tasks 7–11. UX §Phase-0 P0-4 + epics line 564 + 687 + architecture §Launch Gate Risks subsidiary legal-counsel-naming rows 4785-4788 discharge path per `docs/legal-counsel-engagement/README.md §9` disjoint-anchor discipline — FIFTH Phase-0 portfolio distinct from bus-factor-of-one mitigation + loop-node operational-responsiveness + empathy field-work + spec-to-cadence-funding-reconciliation portfolios. Concurrent-review nature is load-bearing per UX spec line 75 — counsel reviews during drafting, NOT post-hoc audit. Cross-Story coupling: counsel returns at Task 11 unblock Story 0.4 per-template marker flips + Story 0.6 contract-template §6/§9/§10/§11 substantive language + Story 0.5 ADR slot population × 5 + Story 0.2 DPO envelope flip + Story 0.5 dependency-inventory Section E × 7 + Story 0.7 denial-appeal node updates + Story 2.6 T&C legal_review_status flip + Story 6.16 denial-appeal workflow + Story 1.3 + 3.1 Account State Machine + Story 2.7 + 3.11 + 3.12 DPDPA + Story 6.2 + 6.3 + 6.10 dual-path claim) |

The six surfaces jointly discharge the AR-67 + PRD §9.1.1 30-day-takeover property. No single surface discharges it alone (per [[feedback_closure_language_precision]]).

## 10. 30-day-takeover joint-discharge anchor

Per Story 0.3 Decision 2026-05-29-003 Open Follow-ups + Story 0.4 Decision 2026-05-29-004 Open Follow-ups, the AR-67 + PRD §9.1.1 30-day-takeover property is **jointly discharged** by:

- Story 0.3 AC-1 (mirror pipeline auto-replicates) + AC-2 (bus-factor switch-to-mirror demonstrated)
- Story 0.4 AC-1 (per-surface degradation policy authored + trustee-signed-off) + AC-2 (table-top exercise gap-discharged)
- **Story 0.5 AC-1 (KT pack compiled with 5 PRD §9.1.1 components) + AC-2 (stored in trustee-accessible repo + cross-linked) + AC-3 (backup engineer reads cold and scores ≥80%)**
- Story 0.6 (backup engineer contracted with trustee authorization)

The joint discharge is recorded in `kt-pack-ledger.md` "Comprehension administration log" header (mirroring the Story 0.4 ledger anchor pattern). When all eight conditions close, a follow-up `.decision-log.md` `[CONTINUITY]` entry records the joint-discharge achievement per the Story 0.3 Decision 003 closure path.

A closure of any one of these eight MUST NOT be conflated with the joint discharge per [[feedback_closure_language_precision]].

## 11. Mechanism-level revision path

The framework is durable but revisable. Mechanism-level revisions follow the Story 0.2 + 0.3 + 0.4 supersession schema:

- A new `.decision-log.md` `[CONTINUITY]` entry **supersedes** the prior; the prior is not modified.
- The revised component file content carries the supersession-schema marker; the prior content is preserved in a `superseded-YYYY-MM-DD.md` snapshot OR (for inline supersession) the prior row in the table is marked `superseded` with a cross-link to the new row.
- The `kt-pack-ledger.md` "Pack-revision log" records every revision with the trigger (gap-list row, periodic re-attestation finding, architectural amendment, on-incident post-mortem).

## 12. File index

- `README.md` (this file) — framework existence + lifecycle + property/control/policy/gap-analysis discipline + structural invariants + sign-off lifecycle + review cadence fallback + ledger reconciliation + open ADR slots + related surfaces + joint-discharge anchor + revision path
- `adr-index.md` — live ADR index + deferred-slot inventory (≥40 slots catalogued); the canonical reader-facing cross-walk for ADR status
- `niyamavali-fr-mapping.md` — Niyamavali clause → FR cross-walk + inverse-lookup section + Account State Machine extract (the single deliberate verbatim transcription per §4 invariant 1)
- `deployment-topology.md` — reader's map keyed to architecture §5.1-§5.10 (GCP project topology + service map + network topology + deployment substrate + backup+DR posture + per-Pariwar tenancy + workspace layout + cross-link index)
- `on-call-playbook.md` — five-section meta-playbook above the seven Phase-0 runbooks (incident-class taxonomy + triage steps + escalation paths)
- `third-party-dependency-inventory.md` — vendor / contract / renewal-date / monitoring-owner / vendor-contact / cross-link rows for every external dependency named in architecture
- `comprehension-questionnaire.md` — ≥25 questions across 5 sections (one per PRD §9.1.1 component) for the backup engineer cold-read administration
- `comprehension-questionnaire-answer-key.md` — deterministic answers + per-question scoring rubric (full / partial / incorrect / unanswerable-from-pack); held in the trustee-accessible repo for trustee-facilitated scoring
- `kt-pack-ledger.md` — authoritative status surface (Framework-commit record + Trustee sign-off log + Comprehension administration log + Pack-revision log + Periodic re-attestation log + Procedure-revision log)

## 13. Domain glossary

Key terms a cold-read external engineer will encounter in this pack. Expanded on first use here; all component files assume this glossary is read first.

| Term | Full form / meaning |
|---|---|
| **Pariwar** | Hindi for "family" — the tenancy unit of the system. Each Pariwar is an independent instance of the mutual-aid fund with its own member registry, Niyamavali rules, and operational context. |
| **Niyamavali** | Hindi for "rules / bylaws" — the Pariwar's governing rule set, analogous to bylaws. Implemented via the per-Pariwar rule registry (FR-7). |
| **AR-67** | Architecture Requirement 67 — the operational-continuity invariant committing the 30-day-takeover property (a contracted external engineer must be able to take over the codebase + operations within 30 days using only the KT pack + escrow surfaces). |
| **FR** | Functional Requirement — a numbered requirement from PRD §4 (e.g., FR-7 = versioned per-Pariwar rule registry; FR-12A = Member Validity Service). |
| **DPDPA** | Digital Personal Data Protection Act — India's data-protection legislation (2023) governing personal data processing by Data Fiduciaries. Relevant to member PII handling, KYC flows, consent architecture, and breach-reporting obligations (Story 14.3). |
| **DLT** | Distributed Ledger Technology — TRAI's (Telecom Regulatory Authority of India) mandatory pre-registration platform for SMS templates used in commercial messaging. All SMS templates must be DLT-registered before dispatch. |
| **WA Business** | WhatsApp Business API — Meta's channel for business-initiated messaging; used for per-Pariwar member-facing notifications. Requires Meta template pre-approval per message category. |
| **SIE** | Scheduled / Implicit Event — the time-as-actor mechanism in architecture (Cross-Cutting #14) that fires time-driven member-state transitions (e.g., `active → active_in_grace` on `valid_through + 1 day`). |
| **Vyawastha Shulk** | Hindi for "administration fee" — the ₹110 annual membership fee that triggers the member lifecycle (FR-1 / FR-1A). |
| **R-class (R5, R7 ...)** | Niyamavali rule class — e.g., R5 = special death eligibility rules; R7 = contribution discipline / restoration rules; R14-adapted = concealment penalty. Defined in PRD §1. |

## References

- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, lines 1371-1382] — PRD §9.1.1 paragraph 5 KT pack content commitment
- [Source: `_bmad-output/planning-artifacts/architecture.md`, Cross-Cutting #20 (lines 332-336)] — Solo-build operational continuity commitment including KT pack
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Implementation Handoff (lines 5069-5096)] — PR-2 / implementation-time substantive ADR commitment
- [Source: `_bmad-output/planning-artifacts/architecture.md`, AR-67 + AR-69] — operational continuity invariant + ADR backlog ratification
- [Source: `_bmad-output/planning-artifacts/epics.md`, lines 771-783] — Story 0.5 user-story statement + ACs + `[CONTINUITY]` tag
- [Source: `_bmad-output/implementation-artifacts/0-5-knowledge-transfer-documentation-pack-compiled.md`] — Story 0.5 spec; Tasks 1-7 author-committable; Tasks 8-10 `_AWAITING EXTERNAL ACTION_`
- [Source: `.decision-log.md`, Decision 2026-05-29-003 Open Follow-up #6] — `docs/adr/` scaffold closure leg
- [Source: `docs/runbooks/README.md`] — Story 0.1 runbook framework
- [Source: `docs/escrow/README.md`] — Story 0.2 credential escrow framework
- [Source: `docs/escrow/code-escrow/README.md`] — Story 0.3 code escrow framework
- [Source: `docs/degradation-policy/README.md`] — Story 0.4 degradation policy framework
- [Source: `docs/adr/README.md`] — ADR directory README scaffolded by Story 0.5 Task 1
- Memory: [[feedback_architecture_vs_adr_boundary]] — property-driven design; ADRs commit cloud controls
- Memory: [[feedback_architecture_vs_prd_boundary]] — architecture commits state/transitions/events; PRD commits policy/eligibility/cadence
- Memory: [[feedback_gap_analysis_observational]] — gap analysis observes incompleteness; proposes conditional escalation paths
- Memory: [[feedback_closure_language_precision]] — distinguish "Closed by [edit]" from "Resolved via explicit deferral" from "Not addressed"
