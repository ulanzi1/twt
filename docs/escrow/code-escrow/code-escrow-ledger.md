# Code-Escrow Ledger

This ledger is the sole source of truth for trustee-attested code-escrow events. A mirror destination state claim, a verification claim, a drill outcome, or a bus-factor exercise outcome is durable only when a corresponding row exists in this ledger.

**Authority:** Story 0.3 (epics.md) AC-1 / AC-2. Stored alongside the framework documents under the trustee-accessible repo, with code-escrow mirror coverage inherited from this story once Tasks 7–9 close (recursive self-coverage; see `README.md` §"`docs/escrow/code-escrow/` is on the trustee-accessible storage surface" via Story 0.3 Dev Notes).

## Framework-commit record

Each row records one framework-commit event. The framework-commit row is analogous to Story 0.2's `escrow-ledger.md` framework-commit row and Story 0.1's `operational-readiness-ledger.md` to-be-signed inventory — the row registers that the framework is operational + names what trustee sign-off attests to.

| Date | Framework version | git SHA at commit | Author | Awaiting signers | Attestation scope |
|---|---|---|---|---|---|
| 2026-05-29 | v0.3.0 (Story 0.3 author-commit) | _filled at commit_ | Solo Builder (BigDev) | ≥2 trustees | Framework documents (`README.md`, `mirror-destination-inventory.md`, `code-escrow-ledger.md`, `mirror-procedure.md`, `restoration-procedure.md`) + mirror workflow (`.github/workflows/code-escrow-mirror.yml`) committed at this SHA implement the AR-67 + PRD §9.1.1 + architecture §5.4 commitment to code escrow. Trustee sign-off attests: (a) the framework structurally satisfies the property commitments in `README.md` §"Property / control / policy three-way discipline"; (b) the workflow's secret-name contract is acceptable; (c) the release-branch set placeholder `{main}` is acceptable until Story 1.1 amendment trigger; (d) Tasks 7–9 are explicitly `_AWAITING EXTERNAL ACTION_` and the framework cannot reach `verified` (lifecycle state 5) without their closure; Tasks 10 and 11 reach `restoration-drilled` (state 6) and `bus-factor-table-topped` (state 7) respectively per `README.md` §"Framework lifecycle"; framework attestation covers the FULL 7-state lifecycle, not only `verified` |
| _Story 0.3 trustee sign-off rows go here once trustees review_ | | | | | |

## Mirror-destination ratification log

Each row records one Trustee Panel + Solo Builder ratification of a mirror destination + credential model per Story 0.3 Task 7. Authority: `.decision-log.md` `[CONTINUITY]` entry + the code-escrow-mirror-destination ADR.

| Date | Destination row in inventory | Platform | Credential model | Ratifying trustees (≥2) | ADR cite | Decision-log entry | Notes |
|---|---|---|---|---|---|---|---|
| _first ratification row goes here once Task 7 closes_ | | | | | | | |

## Workflow-secret-wiring log

Each row records one GitHub Actions secret-wiring event per Story 0.3 Task 8. The wiring action is Solo Builder; trustee attestation accompanies. A row also triggers a Story 0.2 credential-inventory row addition (envelope_class: `prod-credential`; owning Story: 0.3) per `README.md` §"Surface relationship to credential escrow."

| Date | Secret names wired | Wiring engineer | Attesting trustee (≥1) | Story 0.2 inventory row added (cross-link) | Notes |
|---|---|---|---|---|---|
| _first wiring row goes here once Task 8 executes_ | | | | | |

## Mirror-workflow run record

The mirror workflow appends rows here automatically via the build artifact `mirror-push-record-<run-id>.json` (Task 2 mechanism). Each row records one workflow run; rows are reconciled from the artifact at a cadence committed in operations policy (fallback pre-operations-policy: at each ≥2-trustee read-access verification cycle).

| Date | Workflow run ID | Triggering ref | Triggering SHA | Pushed SHA range (from → to) | Mirror destination | Outcome (success / SLA breach / auth failure / network failure / partial push) | Wall-clock duration | Notes |
|---|---|---|---|---|---|---|---|---|
| _first workflow run row goes here once Task 9 fires the first push_ | | | | | | | | |

**Reconciliation procedure**: at each periodic re-verification cycle (or on-demand after a workflow failure), the reconciling party (Solo Builder or trustee-authorized engineer) downloads the `mirror-push-record-<run-id>.json` artifact for every workflow run since the last reconciliation, appends rows per the schema above, and verifies the workflow's outcome against the GitHub Actions UI. Drift between the artifact and the UI triggers a `.decision-log.md` `[CONTINUITY]` entry per `README.md` §"Ledger-vs-workflow reconciliation."

## Read-access verification log

Each row records one trustee's independent read-access verification per Story 0.3 Task 9. AC-1 requires ≥2 trustees per destination per verification cycle.

| Date | Destination row in inventory | Verifying trustee | Method (clone + log + HEAD-match) | Workflow-recorded SHA at verification time | Primary-repo HEAD SHA at verification time | Mirror HEAD SHA at verification time | Outcome (success / gap) | Notes |
|---|---|---|---|---|---|---|---|---|
| _first verification row goes here once Task 9 executes_ | | | | | | | | |

## Restoration drill log

Each row records one restoration drill per Story 0.3 Task 10. The drill executor is the Story 0.6 backup engineer (preferred) OR a trustee-authorized substitute per the Story 0.1 AC-4 model. AC-1 full closure requires a non-Solo-Builder executor; provisional closure is acceptable when the substitute path is exercised. **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the backup-engineer framework exists at `docs/backup-engineer/` (including `activation-procedure.md` §2.4 activation-scenario procedure which is the operational analog for planned restoration drills + `access-grant-procedure.md` for the IAM grant scope); the substantive engineer + signed contract + IAM grant are pending Story 0.6 Tasks 8-10. Until Tasks 8-10 close, the substitute path per Story 0.1 AC-4 model remains the interim executor option.

| Date | Destination row in inventory | Executor identity | Executor role (backup engineer / substitute / Solo-Builder-provisional) | Build-target workspace | Deploy-target (local Docker / GCP dev / Dokploy sandbox / other) | Outcome (success / gap) | Gaps discovered | Closure status (provisional / full) | Linked procedure-revision entry (if gaps) |
|---|---|---|---|---|---|---|---|---|---|
| _first drill row goes here once Task 10 executes_ | | | | | | | | | |

## Bus-factor switch-to-mirror log

Each row records one bus-factor switch-to-mirror exercise per Story 0.3 Task 11. AC-2 full closure requires a non-Solo-Builder executor under bus-factor silence; provisional closure is acceptable when the substitute path is exercised. Solo Builder is **silent** for the duration of the exercise.

**30-day takeover joint-discharge anchor** (per AC-2 explicit requirement: "AC-2 alone does not discharge the 30-day takeover property — record this dependency explicitly in the ledger when closing"):

The AR-67 + PRD §9.1.1 **30-day takeover property** ("sufficient documentation for a contracted external engineer to take over within 30 days") is jointly discharged by:

- **AC-1 + Tasks 7-10** — code accessibility + restoration drill verified.
- **AC-2 + Task 11** — continuity-of-development verified under bus-factor silence (this surface).
- **Story 0.5 (Knowledge-Transfer Documentation Pack)** — the KT pack the external engineer reads to come up to speed.
- **Story 0.6 (Backup Engineer Contracted)** — the contracted external engineer who is the subject of the 30-day takeover. **Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006) establishes the framework at `docs/backup-engineer/`; the operational legs (named engineer + signed contract + IAM grant + onboarding + activation-scenario test) close per Story 0.6 Tasks 8-12; Story 0.6 AC-1 + AC-2 jointly satisfy the Story 0.6 contribution to the eight-condition union (Story 0.3 AC-1 + AC-2 + Story 0.4 AC-1 + AC-2 + Story 0.5 AC-1 + AC-2 + AC-3 + Story 0.6 AC-1 + AC-2).

A Bus-factor switch-to-mirror log row that marks AC-2 closed MUST cite this joint-discharge condition in its Notes column. Closure-language precision per [[feedback_closure_language_precision]]:

- "Provisionally closed via Task 11 substitute-engineer switch-to-mirror dated YYYY-MM-DD; full AC-2 closure deferred to Story 0.6 backup engineer re-execution; 30-day takeover property jointly discharged with Story 0.5 + 0.6 + AC-1 — currently `Resolved via explicit deferral`."
- "Closed by [edit] for AC-2 via Task 11 execution by [backup engineer name] dated YYYY-MM-DD; 30-day takeover property `Closed by [edit]` only when Story 0.5 + 0.6 + AC-1 also closed — verify all four before claiming end-to-end discharge."

Never collapse the AC-2 closure with the 30-day takeover discharge — they are separate properties; AC-2 is one of four contributing surfaces.

| Date | Destination row in inventory | Executor identity | Executor role | Primary-inaccessibility-simulation method (revoked GitHub access / renamed primary / strict-no-interaction) | Mirror state at switch (HEAD SHA + ref/tag count) | Data-loss check (workflow-recorded SHA cross-match) | Continuity verification (clone + branch + build + push-back-to-mirror) | Outcome (success / gap) | Gaps discovered | Closure status (provisional / full) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| _first switch-to-mirror row goes here once Task 11 executes_ | | | | | | | | | | | |

**Scope-freeze rule** (inherited from Story 0.2 review-decision patch precedent): the in-scope state for a bus-factor exercise is the set of destinations marked `verified`-or-higher at exercise start time. Mid-exercise inventory state changes do not retroactively expand or contract scope.

## Periodic re-verification log

Each row records one periodic re-verification cycle per `README.md` §"Review cadence" (fallback cadence: quarterly ≥2-trustee read-access re-verification per destination; annual restoration drill; on-rotation-event mirror-push credential re-seal).

| Review date | Reviewer (≥1 trustee per destination) | Destinations in scope | Inventory status drift findings | Workflow-runs-since-last-review count | Re-seals triggered | Procedure revisions triggered | Notes |
|---|---|---|---|---|---|---|---|
| _first periodic-re-verification row goes here once cadence begins_ | | | | | | | |

**Re-verification scope** includes: (a) destination-existence-at-platform check (the destination still exists; trustee-administrative-control attestation still valid); (b) non-mutating clone-authenticates check (the mirror-push credential still works); (c) HEAD-SHA cross-match against the workflow's last-recorded SHA (no silent divergence); (d) mirror-push credential rotation date is within the §5.9 cadence (no missed rotation).

## Procedure-revision log

Each row records one procedure revision per `README.md` §"Sign-off lifecycle" + `mirror-procedure.md` / `restoration-procedure.md` change-log discipline. Procedure revisions follow Story 0.1's re-sign protocol (≥1 trustee for minor; ≥2 for material).

| Date | Document revised | Revision summary | Triggering gap (ledger row reference) | Reviewing trustee(s) | Material? (yes/no — material if rollback / verification check / contact escalation / surface separation property changed) | Re-sign required? | `.decision-log.md` entry |
|---|---|---|---|---|---|---|---|
| _first procedure-revision row goes here once a gap is discovered_ | | | | | | | |

## Cross-references

- `.decision-log.md` — canonical decisions log; Story 0.3 author-commit recorded as Decision 2026-05-29-003; future trustee ratifications recorded as supersession entries
- `README.md` — framework lifecycle, property/control/policy discipline, surface separation, sign-off lifecycle, review cadence
- `mirror-destination-inventory.md` — inventory rows (the ledger is authoritative when ledger and inventory disagree per `README.md` §"Ledger-vs-inventory reconciliation")
- `mirror-procedure.md` — operational procedure (the workflow this ledger records runs of)
- `restoration-procedure.md` — restoration drill + bus-factor switch-to-mirror procedure
- `../README.md` (Story 0.2 credential escrow README) — sibling framework
- `../escrow-ledger.md` (Story 0.2 ledger) — sibling event-record
- `../../runbooks/operational-readiness-ledger.md` (Story 0.1 ledger) — sibling event-record; "Mirror coverage" section cross-links to this ledger
- Architecture §5.4 — CI/CD pipeline (workflow-runtime authority)
- Architecture §5.9 — Secret Manager + rotation policy (mirror-push credential rotation interlocks)
- PRD §9.1.1 — bus-factor mitigation rationale
- AR-67 — solo-build operational continuity commitment
- Epics.md Story 0.3 — original AC text and trustee gates
