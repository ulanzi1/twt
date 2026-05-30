# Operations Lead Commitment

**Authority:** UX §Phase-0 Operational Ownership Note (UX spec line 99) + UX §0 Stance #6 (UX spec line 91) + UX §Phase-0 P0-1 launch-blocker statement (UX spec line 97).

**Status:** Author-committed 2026-05-30. Records the commitment + decision-path + substitute-handler-bench fallback per `README.md` §5 sign-off lifecycle. The substantive Operations Lead hire OR substitute-handler-bench formal ratification is **Task 8 territory** — Trustee Panel authority + Story 0.12 P0-3 spec-to-cadence reconciliation linkage.

---

## §1 UX §Phase-0 authority cite

Verbatim quote from UX spec line 99 (UX §Phase-0 Operational Ownership Note):

> This work cannot be discharged on a 3-trustee volunteer panel's monthly-meeting bandwidth. The spec strongly recommends a pre-launch Operations Lead hire (scope: own operational readiness across all v1 loops; report to Trustee Panel; bridge between BigDev's engineering work and the staff layer). If the Operations Lead hire is not made, the spec surfaces P0-1 as a launch-blocker that cannot be resolved at the existing capability level. Owner: Trustee Panel (hire decision) + Operations Lead (execution post-hire).

**Implication for this framework:** Story 0.7 Tasks 8-11 require an authoritative operational owner per loop node. The Operations Lead role is the recommended structural answer; the substitute-handler-bench fallback per §4 below is the explicit-deferral-with-rationale path if the Operations Lead hire is deferred.

## §2 Scope of the Operations Lead role

The Operations Lead role scope per the UX §Phase-0 authority cite + the framework cross-cutting commitments:

1. **Own operational readiness across all v1 loops** — the eight Phase-1 loop nodes enumerated in `ledger.md` §3 + any future loop nodes added per the per-Story-closure rota update cadence
2. **Report to Trustee Panel** — the Trustee Panel retains decision authority on substantive matters (hire decisions, funding postures, SLA ratifications, per-loop-node-handler appointments); the Operations Lead executes the ratified decisions + co-owns the day-to-day operations
3. **Bridge between BigDev's engineering work and the staff layer** — the Operations Lead is the interface between the engineering substrate (architecture-driven; Solo Builder + Story 0.6 backup engineer) and the operations layer (per-loop-node fallback handlers); the bridge ensures operational decisions (rota staffing, SLA windows, comms-channel routing) are consistent with engineering invariants (audit-line emission per Story 1.10; comms-template citation per Story 0.4)
4. **Co-own the fallback-handler ledger with Trustee Panel** — the Operations Lead carries primary authorship rights for routine maintenance (rota window-shifts, contact-info refresh) per Open Question #3 recommended posture; substantive amendments (SLA changes, role-name changes, new loop nodes, funding-status changes) require ≥1-trustee co-sign
5. **Recruit + onboard + manage the per-loop-node fallback handlers** — the per-loop-node-handler appointment is Trustee Panel ratification authority at Task 9; the Operations Lead does the recruitment + onboarding + ongoing management work
6. **Coordinate with Story 0.6 backup engineer per scope-of-work §3 escalation path** — the backup engineer is the third-tier escalation per per-loop-node entry §11; coordination ensures the backup engineer engagement is bus-factor-of-one continuity, not loop-node operational responsiveness (distinct mitigation portfolios per `README.md` §10)
7. **Co-facilitate Story 0.4 table-top exercises per `table-top-exercise.md`** — the Operations Lead is a documented facilitator role for table-top exercises (per Story 0.4 framework); per-loop-node fallback handler engagement is part of the table-top scenario flow
8. **Co-facilitate Story 0.1 runbook re-sign per `operational-readiness-ledger.md`** — Story 0.1 runbook re-sign cadence cross-references this framework's review cadence per `README.md` §6; the Operations Lead participates in the joint re-sign cycle

## §3 Hire decision-path

Trustee Panel authority per the UX §Phase-0 authority cite. Hire decision recorded as `.decision-log.md` `[OPS]` entry when hire is authorized + signed.

**Hire decision steps:**

1. Trustee Panel meeting agenda includes the Operations Lead hire authorization item per Task 8 dependency
2. Trustee Panel selects candidate per substantive criteria (per-candidate scope-of-work alignment with §2 above; per-candidate cultural fit with the trust's mission; per-candidate availability + start-date)
3. Trustee Panel authorizes the hire via `.decision-log.md` `[OPS]` entry recording: candidate identity (recorded with appropriate confidentiality — substantive identity may be NDA-territory per the Story 0.6 engineer-roster precedent + the `rota.md` NDA discipline); salary range; scope-of-work referencing §2 above; start date; reference to Story 0.12 P0-3 spec-to-cadence reconciliation funding-tradeoff outcome
4. Signed contract per the analogue to Story 0.6 contract-template (with Operations-Lead-specific scope substitution)
5. Start-date + IAM grant per analogue to Story 0.6 access-grant-procedure (read-access to `docs/fallback-handler-ledger/` + `docs/degradation-policy/` + `docs/runbooks/` + `docs/escrow/` framework documents; read-access to architecture / PRD / epics; no member-PII access without trustee co-sign — per architecture §1.5 PII-shielding; **scoped write-access:** Operations Lead receives write access to `rota.md` + `ledger.md` §8 Periodic re-attestation log for routine operational maintenance — rota-window updates, contact-ref refreshes, re-attestation log entries; substantive governance changes — SLA amendments, new loop nodes, funding-status changes, schema revisions — require ≥1-trustee co-sign per Open Question #3 recommended posture)
6. The new hire row is appended to a (potentially new) `operations-lead-roster.md` OR as a §-level entry in this file's §3 hire decision-path log (the rostering decision is operations-policy not framework-binding; the framework commits the hire decision-path discipline, not the rostering mechanism)
7. Operations Lead onboarding includes: review of all six bus-factor-portfolio framework READMEs (Story 0.1-0.6); review of this framework's `ledger.md` §3 per-loop-node rows + the eight `loop-nodes/<id>.md` entries; introduction to Trustee Panel members + Story 0.6 backup engineer (if engaged) + helpline operations team

**Hire decision-path log** (empty at author-commit; populated post-Task-8 closure):

| Decision date | Trustee Panel members ratifying | Candidate identity reference | Salary range | Start date | `.decision-log.md` entry id |
|---|---|---|---|---|---|
| _(pending Task 8)_ | _(pending)_ | _(pending — substantive identity NDA-territory per operations-policy)_ | _(pending; Trustee Panel + Story 0.12 reconciliation territory)_ | _(pending)_ | _(pending `.decision-log.md` `[OPS]` entry id)_ |

## §4 Substitute-handler-bench fallback

If the Operations Lead hire is deferred — Trustee Panel decides funding cannot support v1, OR no qualified candidate found within the launch window, OR Operations Lead hire formally postponed pending Story 0.12 P0-3 spec-to-cadence reconciliation — the trust commits to a **substitute-handler-bench fallback** per `README.md` §5 fallback path.

**Substitute-handler-bench composition:**

(a) **Trustee Panel + Story 0.6 backup engineer + named trustee-on-rota collectively cover the eight loop nodes' fallback obligation at degraded operational responsiveness**:

- Trustee Panel chair: per-loop-node escalation second tier
- Trustee Panel members on rota: per-loop-node primary handlers (rotating coverage; per-loop-node coverage may concentrate on a subset of trustees with explicit-deferral-with-rationale per [[feedback_closure_language_precision]])
- Story 0.6 backup engineer: third-tier escalation per per-loop-node entry §11; not primary (the backup engineer's role per Story 0.6 is bus-factor-of-one continuity, NOT loop-node operational responsiveness — see `README.md` §10 disjoint-anchor discipline)
- Named trustee-on-rota: the specific per-loop-node primary handler designation (per Task 9 ratification)

**Substitute bench representative designation (required in the Task 8 `[OPS]` entry):** The Task 8 `[OPS]` ratification entry under path (b) MUST explicitly name one bench member as the substitute bench representative — the person who holds the Task 9 handler-recruitment + onboarding authority equivalent to the Operations Lead role. Tasks 9-11 framework language ("Operations Lead or substitute-bench representative") cannot be acted upon until this designation is recorded. The substitute bench representative must be named in the ratification entry before Task 9 begins. A bench composition entry without a named representative is incomplete per this framework.

(b) **Time-bounded 90 days** from formal ratification date; renewable per `README.md` §5 (no auto-roll-over per Open Question #4 recommended posture)

(c) **Does NOT discharge UX-DR4** — the launch-gate property "named, funded, on-rota fallback handler" remains in **explicit-deferral-with-rationale** status per [[feedback_closure_language_precision]]; the substitute-bench is a degraded-mode close, NOT discharge of UX-DR4. AC-1 named-Operations-Lead-leg + named-role-leg + funding-leg are **Resolved via explicit deferral** with rationale (substitute-bench is degraded-mode close)

(d) **Renewal requires a new `.decision-log.md` `[OPS]` entry** — substitute-bench renewals do NOT auto-roll-over per Open Question #4 recommended posture; the panel MUST confront whether the Operations Lead hire can finally happen each quarter; renewal entry references the prior substitute-bench ratification entry per the supersession schema

**Substitute-handler-bench formal-ratification log** (empty at author-commit; populated post-Task-8 closure if path (b) chosen):

| Ratification date | Trustee Panel members ratifying | Bench composition | Time-bound expiry date | Renewal trigger date | `.decision-log.md` entry id |
|---|---|---|---|---|---|
| _(pending Task 8 path (b))_ | _(pending)_ | _(pending — enumerate Trustee Panel members + backup engineer + named trustee-on-rota per loop node)_ | _(pending; ratification date + 90 days)_ | _(pending; expiry date - 14 days)_ | _(pending `.decision-log.md` `[OPS]` entry id)_ |

(e) **Story 0.12 P0-3 spec-to-cadence reconciliation** is cross-linked for the long-term funding-decision resolution path. If Story 0.12 ratifies cut-scope OR contracted-help, Operations Lead hire may be re-prioritized in the reconciliation; the substitute-bench can then be replaced with the Operations Lead per Task 8 path (a) supersession.

## §5 Funding posture

**The Operations Lead salary is a Trustee Panel funding-decision territory.**

- Salary range is **operations-policy not committed in the framework** — the framework commits the *property* (Operations Lead is needed; substitute-bench is the explicit-deferral fallback) + the *decision-path* (Trustee Panel authority + Story 0.12 reconciliation linkage); does NOT inline a specific salary range or funding source
- Story 0.12 P0-3 spec-to-cadence reconciliation is the appropriate forum for the funding-tradeoff conversation — the spec-to-cadence reconciliation explicitly addresses scope-vs-resources tradeoffs at the launch boundary; Operations Lead hire is one of the structural funding decisions in scope
- **Funding source** — Trustee Panel funding-decision territory (donor capital? per-Pariwar contribution allocation? blended? — substrate choice is deferred ADR per [[feedback_architecture_vs_adr_boundary]]; ADR slot reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7)

**Salary range ADR slot** — reserved in `docs/knowledge-transfer/adr-index.md` Section I; populated when Story 0.12 reconciliation closes + the Trustee Panel authors the substantive ADR.

## §6 Closure trigger

This commitment document closes — meaning Task 8 closes — when one of the following events occurs, recorded as a `.decision-log.md` `[OPS]` entry:

- **Path (a): Operations Lead hire** — Trustee Panel authorizes + signs contract + start-date scheduled per §3 hire decision-path. AC-1 funding-leg + named-Operations-Lead-leg are **Closed by [edit]** (substantive content lands in the framework — the `operations-lead-roster.md` row OR this file's §3 hire decision-path log row).
- **Path (b): Substitute-handler-bench formally ratified** — Trustee Panel formally ratifies the substitute-bench composition per §4 (a) + time-bound expiry + renewal-trigger date. AC-1 named-Operations-Lead-leg is **Resolved via explicit deferral** with rationale per [[feedback_closure_language_precision]] (substitute-bench is degraded-mode close, NOT discharge of UX-DR4). Story 0.12 spec-to-cadence reconciliation is cross-linked for long-term resolution.

**Whichever path closes first activates the AC-1 named-role + funding legs** (note: path (b) activates a *degraded-mode* close of those legs per [[feedback_closure_language_precision]] — explicit-deferral-with-rationale, NOT discharge).

After Task 8 closure, Tasks 9-11 proceed per the framework lifecycle in `README.md` §2.
