# Onboarding Checklist — Backup Engineer

> **Status:** drafted
> **Owner role:** Trustee Panel chair (facilitator); Solo Builder (segment (a)-(b)-(c) content support; silent for segment (d)-(e) per bus-factor simulation discipline); Backup Engineer (engagement recipient + comprehension administration cold-reader); Legal Counsel per Story 0.13 (contract-question escalation)
> **Architectural authority:** architecture §3603-3624 (Essential patterns Day-1 onboarding); architecture §5.10 (backup engineer access posture); architecture §4039-4057 (Onboarding artifacts — `docs/onboarding-tour.md`); PRD §9.1.1 paragraph 6; AR-67; Story 0.5 AC-3 (comprehension administration discipline); Story 0.6 epics.md AC-1 ("an onboarding session is conducted and logged in `.decision-log.md`")

## §1. Prerequisites

Preconditions that must hold before the onboarding session begins.

- **Signed contract on file** with legal counsel per Story 0.13 (Story 0.6 Task 10 closure includes contract signature).
- **A-13 retainer authorization recorded in `.decision-log.md`** Decision 2026-05-30-006 (or supersession thereof per Task 8 trustee ratification).
- **Named engineer in `engineer-roster.md`** with status `contracted-not-onboarded` and `nda_signature_status: signed` + `contract_signature_status: signed`.
- **NDA executed and on file** with legal counsel per contract §6 + Story 0.13 NDA template return.
- **IAM grant ready to provision** per `access-grant-procedure.md` §1 prerequisites (or already provisioned per Task 10).
- **KT pack author-commit complete** per Story 0.5 Task 7 (the pack the engineer will read cold per segment (e) comprehension administration); Story 0.5 Task 8 ≥1-trustee sign-off is the soft prerequisite for the comprehension administration to be authoritative (per Story 0.5 README §5 sign-off lifecycle).
- **Trustee facilitator identified** per `README.md` §6 cadence — Trustee Panel chair OR delegated trustee with onboarding-facilitation authority recorded in `.decision-log.md` `[CONTINUITY]` entry.
- **Session scheduled** with engineer + facilitator + (for segments (a)-(c)) Solo Builder availability; 4.5–7 hour total budget per §2 split across multiple sessions per engineer preference.

## §2. Step-by-step onboarding session

Five segments executed in author-suggested order (deviation requires logging in `backup-engineer-ledger.md` Onboarding session log + Notes attachment per Open Question #6 resolution). Segment (e) is the explicit gate and MUST remain last because it tests pack-internalization.

### §2(a). Trust mission + Niyamavali primer (30-60 min)

**Facilitator:** Trustee Panel chair (preferred — best-positioned to convey trust mission); Solo Builder may participate as content support.

**Content covered:**

- Trust mission overview: who TWT serves (Sushil-class members; Reena-class accessibility; Anita-class verifier discipline; Vikram-class field workers; Ravi-mode bereaved-family flow); the bus-factor risk that motivates this engagement.
- PRD §1 Niyamavali primer per `../knowledge-transfer/niyamavali-fr-mapping.md` — the R-classes (R5(C.2), R5(D), R5(E), R5(F), R7(A-G), R8/R8(A)/R8(B), R9, R9(A), R14-adapted), the lock-in TWT divergence, the annual renewal + grace mechanism, the retirement coverage extension, the member validity canonical answer, the Niyamavali amendment workflow.
- Member-class context: how Sushil, Anita, Ravi, Reena, Vikram experience the system per UX-DR persona definitions; why the trust's mutual-aid posture matters in the Vaishali district context.
- Trust governance: Trustee Panel role per PRD §2.6 + §11; Solo Builder role per PRD §9.1; legal counsel role per Story 0.13; the bus-factor mitigation surfaces (Stories 0.1-0.6) the engineer is part of.

**Engineer's expected outputs from this segment:**

- The engineer can articulate the trust's mission in one sentence.
- The engineer can name 3+ R-classes and their general purpose.
- The engineer can describe Sushil-class member context.
- The engineer understands the bus-factor risk the engagement mitigates.

### §2(b). Architecture orientation (60-90 min)

**Facilitator:** Solo Builder (preferred — best-positioned to convey architecture decisions); Trustee Panel chair observes.

**Content covered:**

- `../knowledge-transfer/deployment-topology.md` walkthrough (all 8 sections): GCP project topology (twt-dev / twt-staging / twt-prod / twt-audit-mirror-prod / twt-dokploy-prod); cloud provider service map; network topology; deployment substrate; backup + DR posture; per-Pariwar tenancy; workspace layout; cross-link index.
- Architecture §3603-3624 essential-patterns Day-1 onboarding 10-pattern table: DB ↔ TS naming; API JSON naming; Branded IDs; Generated types; Error emission; Context propagation; Service boundaries; Zustand discipline; TS strictness; ESLint hard-stops.
- `docs/onboarding-tour.md` walkthrough per architecture §4039-4057 (the named ordered list of files: golden-example `service.ts`; canonical `repo.ts`; canonical `handler.ts`; canonical Zustand store; canonical feature test; canonical `packages/contracts/` schema; canonical ADR; canonical runbook). **Note:** `docs/onboarding-tour.md` is itself a Story 0.5+ / Story 1.1+ deferred artifact — until it lands, the segment substitutes architecture §3603-3624 + the architecture §"Workspace Layout" enumeration as the orientation surface.
- Three uncompromisable subsystems per PRD §9.1: Pool Engine; Reconciliation pipeline; RBAC + multi-tenant data isolation. The engineer internalizes these as the load-bearing correctness surfaces.

**Engineer's expected outputs from this segment:**

- The engineer can identify the three GCP environments + the audit-mirror project + the rationale for audit-mirror separation per §2.10a.
- The engineer can name 5+ of the 10 essential patterns.
- The engineer can identify the three uncompromisable subsystems.

### §2(c). Operational continuity framework walkthrough (90-120 min — comprehensive)

**Facilitator:** Solo Builder (preferred — best-positioned to convey framework history); Trustee Panel chair observes + adds trustee-perspective context.

**Content covered:**

- **Story 0.1 — Operational Runbooks:** walkthrough of `../runbooks/` (7 Phase-0 runbooks + `_template.md` + `README.md` + `operational-readiness-ledger.md`); the five-section runbook template; the substitute-engineer authorization model per Story 0.1 AC-4.
- **Story 0.2 — Credential Escrow:** walkthrough of `../escrow/` (README + `credential-inventory.md` + `escrow-ledger.md` + `sealing-procedure.md` + `_envelope-template.md`); the audit-mirror structural fix per Decision 3 (which the engineer's existence enables per §2.10a); the pre-ADR sealing rule.
- **Story 0.3 — Code Escrow + Auto-Mirror:** walkthrough of `../escrow/code-escrow/` (README + `mirror-procedure.md` + `restoration-procedure.md` + `mirror-destination-inventory.md` + `code-escrow-ledger.md`); the restoration drill the engineer will primary-execute per §2.5b.
- **Story 0.4 — Per-Surface Degradation Policy:** walkthrough of `../degradation-policy/` (README + `surface-inventory.md` + 5 comms templates + `degradation-policy-ledger.md` + `table-top-exercise.md`); the table-top exercise the engineer will primary-facilitate per Owner role.
- **Story 0.5 — Knowledge-Transfer Pack:** walkthrough of `../knowledge-transfer/` (README + 8 component files); the comprehension questionnaire the engineer will read cold per segment (e).
- **Story 0.6 — Backup Engineer Framework (this framework):** walkthrough of `.` (README + 8 component files); the engineer's own framework — the contract, the scope-of-work, the access-grant procedure, the activation procedure, the engineer-roster (the engineer's own row in it), the ledger.
- **`docs/adr/`:** walkthrough of the scaffold (README + `_adr-template.md`); the substantive ADRs will land per PR-2 / implementation-time per architecture §Implementation Handoff.

**Engineer's expected outputs from this segment:**

- The engineer can navigate the six framework directories without consultation.
- The engineer can identify their own role in each framework (executor for Story 0.1 AC-4 path 1; non-Solo-Builder principal for Story 0.2 audit-mirror; primary executor for Story 0.3 restoration drill; primary facilitator for Story 0.4 table-top; cold-reader for Story 0.5 AC-3; the subject of Story 0.6).
- The engineer understands the 30-day takeover joint-discharge property + the eight-condition union.

### §2(d). Bus-factor simulation briefing (30-45 min)

> **⚡ SEGMENT HANDOFF — bus-factor silence begins here.** At the conclusion of segment (c) and before segment (d) begins, the trustee facilitator executes the following handoff protocol:
> 1. Trustee facilitator states explicitly: "We are now entering bus-factor simulation mode. Solo Builder is silent from this point through the end of segment (e) including the comprehension administration."
> 2. Solo Builder acknowledges the silence engagement and does not speak or communicate via any channel (including side channels) with the engineer for the remainder of segments (d) and (e).
> 3. Trustee facilitator logs the handoff timestamp in `backup-engineer-ledger.md` "Onboarding session log".
> This handoff is not optional — the silence discipline requires a named, logged transition point to be enforceable and auditable. Any Solo Builder communication after the handoff timestamp is a gap signal.

**Facilitator:** Trustee Panel chair (Solo Builder is **silent** for this segment + segment (e) — bus-factor simulation discipline activates per Story 0.5 AC-3 + Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2 + Story 0.4 AC-2).

**Content covered:**

- What bus-factor activation means per PRD §9.1.1 + AR-67: Solo Builder unreachable >7 days OR trustee-declared incapacitation triggers activation; the engineer takes over on-call duties; the activation is trustee-authorized never self-initiated per `activation-procedure.md` structural-invariant block.
- **Solo Builder silence discipline:** during bus-factor + activation-scenario + comprehension administration, Solo Builder is silent including side channels. Any question to Solo Builder is a gap signal — the artifact is insufficient.
- **The substitute-engineer authorization model** per Story 0.1 AC-4 path 2: if the engineer is unreachable at activation, a trustee-authorized substitute fills in; the engineer is the preferred (Path 1) executor; substitute is the fallback (Path 2). Story 0.6 closure makes Path 1 available.
- **The comprehension administration discipline** per Story 0.5 AC-3: the engineer reads the KT pack cold; ≤4 hours; scored per `../knowledge-transfer/comprehension-questionnaire-answer-key.md` rubric; ≥80% threshold; gaps logged in `kt-pack-ledger.md`; pack-revision per Story 0.5 Task 10 for `unanswerable-from-pack` gaps. **The threshold cannot be lowered** without Trustee Panel `.decision-log.md` entry per `../knowledge-transfer/README.md` §4 invariant 5.
- **The activation-scenario exercise** per Story 0.6 AC-2: a rehearsal (not real bus-factor); 48-hour completion window for selected non-production task; bus-factor-silence discipline applies; outcome logged in both `backup-engineer-ledger.md` AND `docs/runbooks/operational-readiness-ledger.md` (the latter discharges Story 0.1 AC-4 path 1).
- **The 30-day takeover joint-discharge property** per the eight-condition union (Story 0.3 AC-1 + AC-2 + Story 0.4 AC-1 + AC-2 + Story 0.5 AC-1 + AC-2 + AC-3 + Story 0.6 AC-1 + AC-2); the engineer's role in completing the joint discharge.

**Engineer's expected outputs from this segment:**

- The engineer can describe the bus-factor activation flow.
- The engineer commits to the bus-factor-silence discipline during segment (e) + future bus-factor / activation-scenario / comprehension administration events.
- The engineer understands the 80% threshold + the no-question-lowering invariant.

### §2(e). On-call playbook walkthrough + comprehension administration (60-90 min walkthrough + ≤4 hour comprehension administration)

**Facilitator:** Trustee Panel chair (Solo Builder silent per bus-factor simulation discipline).

**Walkthrough content (60-90 min, with Solo Builder silent + Trustee Panel chair facilitating):**

- `../knowledge-transfer/on-call-playbook.md` walkthrough of all 13 incident classes: audit-integrity failure; P0 capacity-indicator breach; push-provider outage; paging SaaS outage; Dokploy substrate failure; Cloudflare edge outage; Cloud SQL HA failover; KMS unavailability; DigiLocker integration failure; WhatsApp Business suspension; helpdesk SLA breach; member-mass-event; DPDPA breach response (deferred to Story 14.3).
- For each incident class: trigger; action (cross-link to per-task runbook OR ADR slot OR framework activation); verification check; escalation trigger per architecture Cross-Cutting #9 `{primary_actor, fallback_actor, escalation_trigger}`.
- The §5 contact escalation list discipline (roles, not individuals where possible).

**Comprehension administration (≤4 hours, immediately after walkthrough or scheduled separately per engineer preference):**

1. Engineer reads the KT pack (`../knowledge-transfer/` — README + adr-index + niyamavali-fr-mapping + deployment-topology + on-call-playbook + third-party-dependency-inventory) **cold** (no Solo Builder consultation; bus-factor simulation discipline applies).
2. Engineer completes the 30-question comprehension questionnaire (`../knowledge-transfer/comprehension-questionnaire.md`) under timed conditions.
3. Trustee facilitator scores per `../knowledge-transfer/comprehension-questionnaire-answer-key.md` rubric (`correct` × 1.0; `partial` × 0.5; `incorrect` × 0; `unanswerable-from-pack` × 0 + gap-list trigger).
4. **80% threshold** computed as `(correct × 1.0 + partial × 0.5) / 30 ≥ 0.80`.
5. **Closure-language precision per [[feedback_closure_language_precision]]:**
   - Threshold met + no `unanswerable-from-pack` gaps → onboarding completes; AC-3 of Story 0.5 closes as **Closed by [edit]**.
   - Threshold met + `unanswerable-from-pack` gaps → onboarding provisionally completes; AC-3 of Story 0.5 closes as **Provisionally closed; full closure pending gap discharge per Story 0.5 Task 10**.
   - Threshold not met → onboarding does NOT complete; Story 0.5 Task 10 pack-revision per gap is triggered; re-administration scheduled.

**Engineer's expected outputs from this segment:**

- The engineer demonstrates KT-pack internalization at ≥80% threshold.
- All `unanswerable-from-pack` gaps are logged for remediation per `kt-pack-ledger.md`.

## §3. Rollback / interruption procedure

What to do if the engineer cannot complete onboarding.

### 3.1 Engineer interruption (partial-completion)

1. **Log partial-completion entry** in `backup-engineer-ledger.md` "Onboarding session log" with: segments-covered + remaining-segments + reason for interruption + scheduled-resumption date.
2. If interruption is short-term (engineer expects to resume within 4 weeks): scheduled-resumption per engineer + facilitator availability; no escalation.
3. If interruption is long-term (engineer cannot resume within 4 weeks): Trustee Panel + BigDev re-evaluate engagement per contract §10; may trigger renewal-decline cascade or for-cause termination per the specific circumstances.

### 3.2 Engineer cannot complete onboarding (e.g., comprehension threshold repeatedly missed)

1. If the comprehension threshold is not met on first administration: per Story 0.5 Task 10, pack-revision per gap is triggered; re-administration scheduled.
2. If the comprehension threshold is not met on second administration: Trustee Panel + BigDev evaluate technical-fit; may trigger alternate-engineer selection per `README.md` §8 deferred-ADR slot 5 OR retain engineer with documented limitation (e.g., the engineer is fit for surge engagement but not bus-factor activation; this is a contract-amendment scope-narrowing per Task 8 material-edit threshold).
3. **Alternate engineer process:** add new row to `engineer-roster.md` with status `pending-trustee-selection`; original row supersession-marker entry recorded in ledger; the alternate engineer goes through the full Story 0.6 Tasks 8-12 cycle.

### 3.3 Facilitator interruption

1. If trustee facilitator is unavailable mid-session: substitute facilitator per Trustee Panel chair authorization (the substitute MUST be a trustee, not Solo Builder, for segments (d)-(e)).
2. Substitute identity logged in `backup-engineer-ledger.md` "Onboarding session log".

## §4. Verification checks

Observable post-conditions that prove the onboarding succeeded.

- [ ] **Signed contract on file** — verified via `engineer-roster.md` `contract_signature_status: signed` + legal counsel files reference.
- [ ] **A-13 entry in `.decision-log.md`** — verified via Decision 2026-05-30-006 (or supersession) entry presence.
- [ ] **NDA on file** — verified via `engineer-roster.md` `nda_signature_status: signed` + legal counsel files reference.
- [ ] **IAM grant active** per `access-grant-procedure.md` §4 verification checks.
- [ ] **KT pack walked through** — segments (a) + (b) + (c) completed per `backup-engineer-ledger.md` "Onboarding session log".
- [ ] **On-call playbook walked through** — segment (e) walkthrough portion completed per ledger.
- [ ] **Comprehension questionnaire administered + scored** — segment (e) administration portion completed per `kt-pack-ledger.md` "Comprehension administration log" + `backup-engineer-ledger.md` "Comprehension administration log" cross-reference.
- [ ] **≥80% threshold met** per Story 0.5 AC-3 — verified via the kt-pack-ledger administration row.
- [ ] **`engineer-roster.md` row updated** — status flips from `contracted-not-onboarded` to `active` + `onboarding_status: completed` + completion date + comprehension-score columns.
- [ ] **Onboarding completion logged in `.decision-log.md`** — `[CONTINUITY]` entry recorded per AC-1 commitment ("an onboarding session is conducted and logged in `.decision-log.md`").

If any check fails, do not declare onboarding complete; escalate per §5.

## §5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

- **Primary:** Trustee Panel chair (overall onboarding facilitator + segment (a)-(c) collaborator + segment (d)-(e) sole facilitator).
- **Secondary (segment (a)-(c) content only):** Solo Builder (silent for segments (d)-(e) per bus-factor simulation discipline).
- **Tertiary (contract questions; NDA questions; scope-of-work clarifications):** Legal Counsel per Story 0.13.
- **Quaternary (technical-fit re-assessment):** Solo Builder + Trustee Panel jointly per the Launch Gate Risks row pattern.
- **Substitute facilitator** (when trustee chair unavailable mid-session): trustee per `README.md` §5 quorum-unavailable fallback (90-day time-bound interim per the Story 0.5 review patch P12 inheritance).

---

## Cross-references

- `README.md` §1 retainer-band finalization guidance — informs the engineer's segment (c) understanding of the framework's authorization context
- `README.md` §5 sign-off lifecycle — informs the trustee facilitator's verification of pre-session ratification status
- `README.md` §6 review cadence fallback — informs the engineer's understanding of ongoing engagement cadence post-onboarding
- `README.md` §10 30-day-takeover joint-discharge anchor — informs segment (d) bus-factor briefing content
- `contract-template.md` §2 engagement scope — informs segment (c) Story 0.6 framework walkthrough
- `scope-of-work.md` §5 exclusions — informs segment (d) bus-factor briefing content + engineer's understanding of what they MUST NOT do
- `access-grant-procedure.md` §4 verification checks — required pre-onboarding per §1 prerequisites
- `activation-procedure.md` — referenced in segments (c) + (d) + (e)
- `engineer-roster.md` row — updated per §4 verification checks at onboarding completion
- `backup-engineer-ledger.md` "Onboarding session log" — primary record of this session's execution
- `../knowledge-transfer/README.md` — segment (c) Story 0.5 walkthrough
- `../knowledge-transfer/niyamavali-fr-mapping.md` — segment (a) primer content
- `../knowledge-transfer/deployment-topology.md` — segment (b) walkthrough content
- `../knowledge-transfer/on-call-playbook.md` — segment (e) walkthrough content
- `../knowledge-transfer/comprehension-questionnaire.md` — segment (e) administration content
- `../knowledge-transfer/comprehension-questionnaire-answer-key.md` — segment (e) scoring rubric
- `../knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log" — segment (e) administration outcome record (primary per Story 0.5 ownership)
- `../runbooks/README.md` + `_template.md` + ledger — segment (c) Story 0.1 walkthrough
- `../escrow/README.md` + `credential-inventory.md` + `sealing-procedure.md` + ledger — segment (c) Story 0.2 walkthrough
- `../escrow/code-escrow/README.md` + `mirror-procedure.md` + `restoration-procedure.md` + ledger — segment (c) Story 0.3 walkthrough
- `../degradation-policy/README.md` + `surface-inventory.md` + 5 comms templates + ledger + `table-top-exercise.md` — segment (c) Story 0.4 walkthrough
- `../adr/README.md` + `_adr-template.md` — segment (c) `docs/adr/` scaffold walkthrough
- `../../.decision-log.md` — Decision 006 + Task 11 onboarding-completion `[CONTINUITY]` entry

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
