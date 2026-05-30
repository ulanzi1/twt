# Runbook: 7-day Solo-Builder-unavailable table-top exercise

> **Status:** draft (Story 0.4 author-commit 2026-05-29); awaiting first execution per Story 0.4 Task 8
> **Owner role:** Facilitator (backup engineer per Story 0.6 preferred — Story 0.6 framework author-committed 2026-05-30 at `docs/backup-engineer/` per Decision 2026-05-30-006; operational facilitator pending Story 0.6 Tasks 8-10 contract-signature + IAM grant; trustee-authorized substitute via Story 0.1 AC-4 model remains the interim until Tasks 8-10 close)
> **Last material edit:** 2026-05-29 by Solo Builder (BigDev)
> **Architectural authority:** architecture.md Cross-Cutting #20 ("Solo-build operational continuity — degradation policy") + Cross-Cutting #9 ("Staff-fallback at every node") + §3.4 (channel hierarchy) + §5.10 (Solo Builder on-call + backup engineer A-13) · PRD §9.1.1 paragraph 4 ("Degradation policy") · Story 0.4 AC-2 (table-top exercise demonstrates every member-facing decision has a documented answer)

This runbook walks the Trustee Panel through a scripted 7-day Solo-Builder-unavailable scenario to validate that the per-surface degradation stance (`surface-inventory.md`) and the five-channel comms templates (`comms-templates/`) together cover every member-facing decision without ad-hoc improvisation.

**Output is a gap list, not a pass/fail score** (per Story 0.4 AC-2 explicit text). The exercise is a dry run that surfaces gaps so they're resolved in the artifacts, not in live bus-factor activation.

## 1. Prerequisites

- **Trustee panel availability** — ≥2 trustees minimum. Quorum (per Story 0.2 quorum-open procedure) required for the most disruptive Day-7 escalation step that may rehearse the credential-escrow quorum-open path.
- **Facilitator identity** — backup engineer per Story 0.6 (preferred; allows the exercise to rehearse under bus-factor silence per Story 0.2 + 0.3 simulation discipline). **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the backup-engineer framework + `activation-procedure.md` §2.4 + `scope-of-work.md` §3 bus-factor mode exist at `docs/backup-engineer/`; the substantive engineer + signed contract + IAM grant are pending Story 0.6 Tasks 8-10. Substitute = Solo Builder OR trustee-authorized substitute per the Story 0.1 AC-4 substitute-engineer model remains the interim until Tasks 8-10 close (record as a `.decision-log.md` `[CONTINUITY]` entry citing the Story 0.6 dependency).
- **Artifacts current** — `surface-inventory.md` + `comms-templates/*.md` + `README.md` author-committed and current at exercise time. The exercise validates the artifacts; if any artifact is stale (a surface that has shipped but is not in the inventory; a template that has been revised but the marker state is not in the ledger) the exercise blocks on the affected step.
- **Meeting venue** — in-person preferred for the Day-7 escalation step that may rehearse the Story 0.2 quorum-open procedure (co-location reduces simulation friction). Remote-meeting acceptable for Day-1 through Day-5.
- **Pre-flight check** — the Story 0.3 "30-day takeover joint-discharge" anchor is referenced: the exercise records its contribution to the joint discharge in §5 below (the Table-top exercise log row's Joint-discharge contribution column).
- **Activation ceremony procedure familiar** — facilitator and attending trustees have read `README.md §14` (activation/deactivation ceremony). The Day-1 step rehearses the activation declaration path; the facilitator must be able to walk the trigger-test requirements (§14.3), the declaration-recording locations (§14.4), and the technical flag-set deferred-ADR status (§14.5) without consulting the Solo Builder.
- **Recording discipline** — every step logged in `degradation-policy-ledger.md` "Table-top exercise log" by the facilitator OR a named scribe trustee. Audio recording with attendee consent permitted; transcript NOT load-bearing (the ledger is the durable record).
- **Bus-factor simulation discipline** — when facilitator is non-Solo-Builder, Solo Builder is **silent for the duration**: Solo Builder must not speak, respond, answer questions, or intervene during the exercise — including in side channels (chat, phone, asides). Any question addressed to Solo Builder during the exercise is itself the gap signal: the policy artifacts are insufficient and the question goes directly to the gap list. The quorum-open procedure is rehearsed via `docs/escrow/sealing-procedure.md` (Story 0.2 credential escrow); the restoration procedure is rehearsed via `docs/escrow/code-escrow/restoration-procedure.md` (Story 0.3 code escrow).

## 2. Step-by-step procedure

The scenario walks Day-1 through Day-7+1 of a Solo-Builder-unavailable bus-factor activation. At every step, the facilitator (a) presents the simulated event, (b) names the artifact to consult, (c) reads the trustee action aloud, (d) records the outcome + any gap.

### 2.1 — Day 1: Solo Builder unreachable; in-flight cycle continues; degraded posture activates

**Simulated event:** Solo Builder is unreachable as of 0000 IST. There is an active monthly cycle in flight (Day-N of the cycle window per Pariwar config); claim processing has 2 cases in Anita's verifier queue; reconciliation cron is scheduled to run at 0600 IST.

**Artifacts to consult:**

- `README.md §14` — activation/deactivation ceremony procedure. Verify: (a) has the contact-attempt log been kept for the required channels (mobile call, email, WhatsApp) across multiple calendar days? (b) is the log formatted with date, time (IST), channel, and outcome per §14.3? (c) are ≥2 trustees present who can jointly certify the trigger condition?
- `degradation-policy-ledger.md` "Activation declaration log" — the row that will be appended by the Trustee secretary to record this declaration; verify the schema fields are understood before proceeding.
- `surface-inventory.md` — confirm: (i) My Pool card = `live`; (ii) Yogdaan Bahi = `live`; (iii) Sushil's contribution-in-flight is unaffected; (iv) Anita's verifier console = `live`; (v) reconciliation review queue = `degraded-mode` per the Tier 2 row.
- `comms-templates/push-channel.md` — the body the dispatcher SHOULD fire to every active-cycle member on next-app-open.
- `comms-templates/public-page-banner.md` — the banner that SSR should render on twt.org from this hour forward.

**Trustee action (read aloud):** "Step 1 — Activation ceremony: review the contact-attempt log aloud. Confirm all three channels are represented, attempts span multiple calendar days, and every entry has a timestamp and outcome. Two trustees jointly certify the trigger condition is met. The Trustee secretary appends a row to `degradation-policy-ledger.md` 'Activation declaration log' citing the contact-attempt log location, records the declaration in the Trustee resolution register, and posts the public status notice. The technical flag-set path is marked 'deferred-ADR' in the ledger row. Step 2 — Surface posture: under degraded posture, the active cycle continues. We are NOT pausing claim processing. We are NOT pausing member signup. The push-channel template is the body our members will see. The public-page banner is rendered via the cache-safe SSR shell per architecture §5.8a. Reconciliation cron continues; failure triage queue grows until manual capacity returns. Field-worker dispatch is `gracefully-suspended` — no new dispatches scheduled until resolution."

**Recording:** outcome (decision unambiguous OR gap surfaced); ledger row appended.

### 2.2 — Day 3: Member helpdesk ticket about UPI fails; fallback handler engages

**Simulated event:** A member files a helpdesk ticket: their UPI Intent payment failed at the QR-scan step; they got a partial deduction notification from their bank but the Yogdaan Bahi doesn't show the contribution. Standard triage requires a developer to read the dispatch logs; under degraded posture, that path is unavailable.

**Artifacts to consult:**

- `surface-inventory.md` Helpline Operator console row — `live` (inbound) / `degraded-mode` (outbound) per architecture §3.5.
- Story 0.7 P0-1 fallback-handler ledger — author-committed 2026-05-30 at `docs/fallback-handler-ledger/` per Decision 2026-05-30-007. The framework includes `ledger.md` §3 "helpdesk" row + `loop-nodes/helpdesk.md` substantive per-loop-node entry; substantive `fallback_handler_role` naming pending Story 0.7 Task 9 (Trustee Panel + Operations Lead). Pre-Task-9 closure, the row carries `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` placeholder and the exercise gap shifts from "P0-1 not yet closed" to "P0-1 framework author-committed; substantive helpdesk fallback-handler-role naming pending Task 9".

**Trustee action:** "Route the ticket to the helpline operator's queue per the helpdesk routing-policy registry (Story 10.4). The operator (a) confirms the partial deduction via the member's bank screenshot, (b) annotates the ticket: `awaiting-reconciliation-cron`, (c) reassures the member via the in-app push template body. The matcher cron will detect or fail-to-detect the UTR on its next run; if it fails to detect, the screenshot upload self-verify surface (Story 9.7) handles the recovery path without developer intervention."

**Recording:** as of Story 0.7 author-commit 2026-05-30, the gap shifts from "Story 0.7 not closed" to "Story 0.7 framework author-committed at `docs/fallback-handler-ledger/ledger.md` §3 'helpdesk' row; substantive helpdesk fallback-handler-role naming pending Story 0.7 Task 9 (Trustee Panel + Operations Lead naming event)." Remediation owner: Story 0.7 Task 9. Remediation target: Trustee Panel + Operations Lead per-loop-node ratification event.

### 2.3 — Day 5: Pariwar admin needs a feature toggle; degradation policy declares "feature changes paused"

**Simulated event:** The Pariwar admin needs to toggle the in-app-engagement cost optimization (per architecture §3.4 FR-58C-flag-gated optimization) ON for the current cycle to reduce WA send costs. The toggle is a feature-flag change.

**Artifacts to consult:**

- `surface-inventory.md` — Trustee tooling rows: Niyamavali amendment workflow = `gracefully-suspended`; fixed-amount setter = `gracefully-suspended`. By extension (per PRD §9.1.1 "feature changes pause"), feature-flag changes are also `gracefully-suspended` under degraded posture.
- `comms-templates/email-channel.md` (trustee-class) — the body that the admin sees when attempting the toggle.

**Trustee action:** "The Pariwar admin sees the email-channel banner: 'Feature changes are paused under degraded posture; toggle requests are queued for post-resolution.' The admin's toggle request is queued, NOT executed. If the toggle is genuinely urgent (e.g., the WA quota is about to be exceeded mid-cycle), the emergency-override path is Story 0.2 credential-escrow quorum-open + State Trustee approval — which is itself the Day-7 path below."

**Recording:** does the surface-inventory row clearly cover the feature-flag class? If the inventory only enumerates Niyamavali amendment + fixed-amount setter, the feature-flag class is implicit — gap: "Add an explicit `surface-inventory.md` row for feature-flag toggles under degraded posture; stance = `gracefully-suspended`."

### 2.4 — Day 7: Claim Stage-1 review needs decision; degradation policy preserves Anita's authority; State Trustee escalation per Story 6.13

**Simulated event:** A claim that entered the verifier queue on Day 1 has reached the Stage-1 review SLA (per FR-43A appeal flow + Story 6.13 State Trustee escalation). The reviewing Anita-class staff member is unsure (R9 special case — ambiguous documentation). Normally, Anita escalates to a State Trustee panel for voting (per Story 6.14).

**Artifacts to consult:**

- `surface-inventory.md` Anita's verifier console row — `live`; State Trustee escalation per Story 6.13 remains the substantive fallback for high-uncertainty cases under degraded posture; banner overlay informs of reduced reviewer bandwidth.
- `surface-inventory.md` R9 voting workflow row — `live`; claim processing continues per PRD §9.1.1; voting workflow remains functional.

**Trustee action:** "Anita's decision authority is preserved under degraded posture. The State Trustee panel can convene without Solo Builder. The R9 voting workflow is `live`. The audit-trail discipline (structured reason-code on every decision per UX §Key Design Challenges item 11) is preserved. The decision proceeds normally — degraded posture does NOT introduce a 'defer until Solo Builder returns' rule on claim decisions."

**Recording:** confirm that the verifier console's audit-trail integrity is preserved under degraded posture (a degraded-posture banner does NOT relax the structured-reason-code requirement). If the inventory row's user_facing_copy doesn't explicitly call out the audit-trail preservation, gap: "Strengthen the verifier console row Notes to call out audit-trail-discipline preservation under degraded posture."

### 2.5 — Day 7+1: Decision point — extend degraded posture OR activate backup engineer OR open credential escrow

**Simulated event:** Solo Builder is still unreachable on Day 7+1. The Trustee Panel must decide: (a) extend degraded posture indefinitely; (b) activate the backup engineer per Story 0.6; (c) open the credential escrow per Story 0.2 quorum-open procedure.

**Artifacts to consult:**

- `surface-inventory.md` — confirm no surface requires immediate action that's blocked by Solo Builder.
- Story 0.2 quorum-open procedure (`docs/escrow/sealing-procedure.md`) — the path if credential access is required (e.g., to rotate a compromised credential mid-degraded-posture).
- Story 0.6 backup engineer activation procedure — the path if engineering work is required (e.g., a parser shipped under Epic 9 needs a hotfix mid-cycle).
- Story 0.3 code-escrow restoration procedure (`docs/escrow/code-escrow/restoration-procedure.md`) — the path if codebase access is required (e.g., the backup engineer needs to clone from the mirror to investigate).

**Trustee action:** "Walk through each decision branch and confirm the artifact answers the question. (a) Extending degraded posture indefinitely — no immediate artifact required; the framework supports indefinite degraded posture as long as no surface requires immediate engineering action. (b) Activating backup engineer per Story 0.6 — if Story 0.6 has closed, the activation path is documented; if Story 0.6 has not closed, gap: 'Backup engineer is not yet contracted; activation path is not yet executable.' (c) Opening credential escrow per Story 0.2 quorum-open — if Story 0.2 has progressed past Task 6, the path is executable; if not, gap: 'Credential escrow is not yet operational under quorum-open.'"

**Recording:** confirm the joint-discharge contribution per the §5 column — this Day-7+1 step is the strongest contribution to the 30-day takeover joint discharge because it exercises the Stories 0.2 + 0.3 + 0.6 paths in scenario.

### 2.6 — Post-exercise: gap-list discharge planning

**Simulated event:** The exercise concludes. The facilitator reads the gap list aloud; the panel assigns remediation owners + target dates per gap.

**Trustee action:** "For each gap: (i) determine if the gap is in this framework (surface-inventory row needs amending; comms-template needs revising; README needs strengthening) or in a related Story (Story 0.7 framework is author-committed at `docs/fallback-handler-ledger/` per Decision 2026-05-30-007 — gap is now Task 9 territory: substantive helpdesk fallback-handler-role naming pending Trustee Panel + Operations Lead naming event; Story 0.6 needs to contract); (ii) assign a remediation owner; (iii) set a target date; (iv) record in the ledger."

**Recording:** the Table-top exercise log row in `degradation-policy-ledger.md` carries the gap-list cite, remediation owner per gap, remediation target dates. Re-execution schedule is set per the README §9 cadence (annual default; sooner if the gap remediation is dependent on a specific Story closure).

## 3. Rollback procedure

Standard rollback semantics don't apply (the exercise is a dry run, not a state-mutating operation). Failure modes:

- **Facilitator unprepared** — facilitator hasn't read the artifacts cold; exercise blocks on the first decision point. Rollback: reschedule the exercise after facilitator preparation; log the calendar gap in the ledger; do NOT proceed with an unprepared facilitator (defeats the dry-run purpose).
- **Trustees unavailable mid-exercise** — quorum breaks during Day-N. Rollback: record partial outcome in the ledger; reschedule the remaining Day-N steps; the partial exercise contributes to the joint discharge proportional to the steps completed.
- **Artifact stale at exercise time** — a surface has shipped under another Story but is not in `surface-inventory.md`; OR a template has been revised but the marker state is not in the ledger. Rollback: HALT the exercise on the affected step; amend the inventory OR the ledger inline; re-execute the affected step; record both the gap AND the in-flight amendment in the ledger. The exercise resumes from the next step.
- **Solo Builder violates bus-factor silence** — Solo Builder answers a question during the exercise. Rollback: this IS the gap to log — the policy artifacts are insufficient; the gap goes in the gap list; the exercise continues but the violation is recorded.

## 4. Verification checks

- [ ] Every Day-N step has a logged outcome in the ledger Table-top exercise log row.
- [ ] Every decision point cites a specific artifact (surface-inventory row OR comms-template file OR cross-referenced Story 0.X framework).
- [ ] Every gap has a remediation owner + target date.
- [ ] The joint-discharge contribution column is populated (records this exercise's contribution to the 30-day takeover joint discharge).
- [ ] Closure-status-precision per [[feedback_closure_language_precision]] — "no gaps" is a strong outcome that should be tested against scenario revisions before being treated as terminal. A zero-gap first execution triggers a re-execution under scenario revisions to confirm the outcome is genuine vs scenario-coverage-insufficient.
- [ ] AC-2 closure state determined: provisional (≥1 execution complete; gap list recorded) OR full (gap list discharged + "no new gaps" on re-execution OR ≥6 months without remediation-triggering live incident).

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

- **Primary:** Facilitator (backup engineer per Story 0.6 OR substitute per Story 0.1 AC-4 model).
- **Secondary (if primary unreachable within scheduling SLA):** Trustee Panel chair on rota; trustee-authorized substitute.
- **Trustee escalation (when operation affects trustee-relevant invariants — e.g., the exercise surfaces a gap that requires inventory amendment under trustee re-attestation):** Trustee Panel chair on rota.
- **Backup engineer per Story 0.6** — for the Day-7+1 scenario branch (b) execution.
- **Legal counsel per Story 0.13** — for template-revision questions surfaced mid-exercise (e.g., counsel has returned a revision and the exercise wants to ratify the new body inline).
- **Helpline operator team** — for cross-link verification of the operator-surface steps (Day-3 helpdesk routing).
- **State Trustee panel** — for the Day-7 R9 voting workflow step.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial commit_ | Solo Builder (BigDev) | initial runbook commit per Story 0.4 Task 1 | yes (≥2 trustees) per Story 0.4 Task 7 | `degradation-policy-ledger.md` Framework-commit record |
