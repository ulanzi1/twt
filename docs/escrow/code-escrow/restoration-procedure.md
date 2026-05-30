# Runbook: Code-Escrow Restoration + Bus-Factor Switch-to-Mirror

> **Status:** draft / signed-off (with ledger entry at git SHA `<sha>`) / superseded
> **Owner role:** Trustee Panel for execution authorization; backup engineer (Story 0.6) for execution under bus-factor; Solo Builder for planned-drill execution if Story 0.6 has not yet closed (substitute path per Story 0.1 AC-4 model)
> **Last material edit:** 2026-05-29 by Solo Builder (BigDev) — initial author-commit
> **Architectural authority:** architecture.md §5.4 (CI/CD pipeline — mirror is per Step 2 §9.1.1) · architecture.md §5.7 (Backup + Disaster Recovery — mirror inaccessibility-independence property) · architecture.md §5.10 (Operations — backup engineer access posture; bus-factor escalation) · PRD §9.1.1 (Solo-build operational continuity — code escrow + 30-day takeover property) · AR-67 (Solo-build operational continuity commitment) · ADR-`<NNN>`-code-escrow-mirror-destination ([deferred ADR — placeholder procedure])

This runbook covers two related procedures:

- **AC-1 Restoration drill** — a planned exercise to verify the mirror destination is a usable code-survival surface. Executor is the Story 0.6 backup engineer (preferred) or trustee-authorized substitute. Performed under normal operations (not under bus-factor).
- **AC-2 Switch-to-mirror** — an under-bus-factor exercise (or real activation) where primary repo access is lost and the mirror becomes the source-of-truth. Executor is non-Solo-Builder under bus-factor silence per the Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2 discipline.

The two procedures share scaffolding (clone + verify + build) but diverge at the deploy / continuity step. §2.1–§2.4 are shared; §2.5a is AC-1-specific; §2.5b is AC-2-specific.

## 1. Prerequisites

Preconditions that must hold before either procedure begins.

### Shared prerequisites (both procedures)

- **Mirror destination is `verified` in `mirror-destination-inventory.md`.** Status `wired-pending-verification` is insufficient — ≥2-trustee read-access verification (per `code-escrow-ledger.md` "Read-access verification log") must already have closed at least one cycle for this destination. The procedure aborts if the destination is not yet `verified`.
- **Executor identity is recorded.** The execution authorization is recorded in `.decision-log.md` as a `[CONTINUITY]` entry naming the executor + the procedure (AC-1 drill or AC-2 switch) + the authorizing Trustee Panel chair. **Self-authorized execution is forbidden** — even Solo Builder executing the AC-1 drill under the substitute path must be trustee-authorized in the ledger.
- **Non-prod target available** (for AC-1 drill §2.5a). Acceptable targets: local Docker (preferred for first drill — minimizes external dependencies); GCP `twt-dev` per architecture §5.5; Dokploy sandbox once Story 1.15 closes. **Forbidden targets** for AC-1: prod / staging environments; any environment in the prod-deploy WIF binding; any environment with audit-mirror IAM grants per architecture §2.10a.
- **Mirror destination access credential.** The executor has read-access credentials to the mirror destination per the ADR-recorded credential model. Read-access is sufficient for AC-1 §2.5a (clone-only); read+write is required for AC-2 §2.5b (the switch-to-mirror exercise demonstrates push-back-to-mirror).
- **§2.10a surface separation property preserved.** Per `README.md` §"Surface separation": the executor MUST NOT use the procedure to gain access to audit-mirror credentials, the prod-deploy WIF binding, or the §5.9 high-sensitivity tier. The procedure deploys to non-prod only; the procedure does not touch the audit-mirror project.

### AC-1 (planned drill) additional prerequisites

- **Drill cadence requirement met.** The drill is one-time at Story 0.3 closure; subsequent drills follow operations-policy cadence (fallback pre-operations-policy: annual). The cadence requirement is recorded in the trustee-authorization `.decision-log.md` entry.
- **Build dependencies available at non-prod target.** `pnpm` + `node` per architecture §Workspace Layout; Docker per the chosen non-prod target. If Story 1.1 (turborepo-monorepo-bootstrap) has not yet closed, workspace tooling may not yet be wired — fall back to per-package install per the alternation path in `0-3-code-escrow-auto-mirror-pipeline-live.md` Task 10.

### AC-2 (under-bus-factor switch) additional prerequisites

- **Primary-inaccessibility scenario is reversible.** Per Story 0.3 Task 11 guardrail: the simulation method is one of (a) revoke Solo Builder's GitHub access at org level (Trustee Panel restores after exercise); (b) rename primary repo to placeholder + restore after exercise; (c) "pretend Solo Builder is unreachable" with strict no-interaction. **Forbidden simulations**: deleting the primary repo (irreversible without restore-from-backup); revoking Solo Builder's GCP IAM (affects prod operations outside the exercise scope).
- **Solo Builder is silent for the duration.** Per the bus-factor simulation discipline (Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2): Solo Builder does not answer questions, does not observe, does not provide consultation. If Solo Builder must answer a question during the exercise, the procedure is insufficient — the gap is the dominant outcome.
- **Trustee Panel oversight throughout.** Trustee Panel chair on rota is reachable for escalation if the exercise needs to be aborted (e.g., the data-loss check reveals unacceptable divergence).

## 2. Step-by-step procedure

Steps §2.1–§2.4 are shared between AC-1 drill and AC-2 switch. §2.5a is AC-1-specific. §2.5b is AC-2-specific. The executor follows the steps in order; ledger rows are appended at the end of each step group.

### 2.1 — Clone from mirror

The executor clones the mirror destination using the trustee-authorized read credential:

```
git clone <MIRROR_DESTINATION_URL> twt-restoration
cd twt-restoration
```

The clone target directory name `twt-restoration` is conventional; the executor records the local path in their drill notes.

### 2.2 — Verify HEAD SHA against ledger

The executor:

1. Runs `git log --oneline -10` to inspect recent history.
2. Runs `git rev-parse HEAD` to capture the mirror HEAD SHA.
3. Compares the mirror HEAD SHA against the most recent `code-escrow-ledger.md` "Mirror-workflow run record" row's `pushed_sha_range_to` value. Match = ok; mismatch = data-loss gap (the missing commits are the difference; the recovery path per AC-2 text is re-push from out-of-band trustee-held clone, pull from backup engineer's local clone, or accept the loss as residual risk within the 10-minute SLA window).

> `[deferred ADR — placeholder procedure]` — until the code-escrow-mirror-destination ADR ratifies the destination, the ledger reconciliation may not yet have rows for the destination. In that case, compare the mirror HEAD against (a) Solo Builder's primary-repo HEAD captured at exercise scheduling time + (b) any out-of-band trustee-held clones' HEADs. The ADR's read-verification mechanism resolves this placeholder.

### 2.3 — Install dependencies

The executor installs workspace dependencies:

```
pnpm install
```

If Story 1.1 has not yet closed (workspace tooling not wired), fall back to per-package install per `0-3-code-escrow-auto-mirror-pipeline-live.md` Task 10 alternation path. Record the fall-back in the drill notes.

### 2.4 — Build at least one apps/* workspace

The executor builds at least one workspace successfully. Default target: `apps/api` (the architecture §Workspace Layout commits Fastify HTTP API as the central workspace). Alternates: `apps/admin`, `apps/mobile`, `apps/public`. If `apps/api` is not yet scaffolded per Story 1.1, the executor selects the most-mature workspace at exercise time. Record the choice + the build command + the build outcome in the drill notes.

```
pnpm --filter @twt/api build  # or equivalent for the chosen workspace
```

**Success criterion**: build exits 0 with no missing-dependency errors. **Failure** = drill gap — the dependency tree is incomplete at the mirror, the workspace tooling is misconfigured, or the source is corrupted. Escalate per §3.

### 2.5a — AC-1 Restoration drill: deploy to non-prod target

For the AC-1 planned drill only. The executor deploys the built workspace to a non-prod target:

- **Local Docker (preferred)**: `docker compose up` or equivalent per the workspace's Dockerfile. The executor verifies the workspace responds to a smoke-test (e.g., HTTP GET / for `apps/api`). No external GCP credentials required.
- **GCP `twt-dev`**: deploy per Story 1.x dev-deploy workflow (once Story 1.15 closes). Requires the executor to have `twt-dev` IAM grants per architecture §5.5; verify before exercise.
- **Dokploy sandbox**: deploy per Story 1.15 Dokploy workflow once Story 1.15 closes.

**Success criterion**: the workspace deploys and responds to the smoke-test. **Failure** = drill gap — the restoration is incomplete; the 30-day-takeover property per PRD §9.1.1 is in question. Escalate per §3.

Record the drill outcome in `code-escrow-ledger.md` "Restoration drill log" per the schema in that file.

### 2.5b — AC-2 Switch-to-mirror: demonstrate continuity-of-development

For the AC-2 under-bus-factor switch only. The executor demonstrates the mirror can serve as the primary source-of-truth for continued development:

1. **Obtain write access** to the mirror destination under the mirror's own access-control model (the trustee-authorized engineer's write credential per the ADR — distinct from the workflow's `MIRROR_PUSH_CREDENTIAL` which is for the workflow's automated push).
2. **Branch a working ref** from `main` (or the destination's equivalent default branch): `git checkout -b bus-factor-exercise-YYYY-MM-DD`.
3. **Make a trivial commit** (e.g., add a comment to a README) and commit it: `git add . && git commit -m "Bus-factor exercise YYYY-MM-DD"`.
4. **Push the commit to the mirror**: `git push origin bus-factor-exercise-YYYY-MM-DD`. **Success criterion**: the push completes; the mirror destination's UI shows the new branch + commit.
5. **Snapshot the executor's commit SHA to the ledger BEFORE §2.6 primary restoration.** The exercise branch (`bus-factor-exercise-YYYY-MM-DD`) is **ephemeral** — once primary is restored per §2.6 and the next release-branch push at primary triggers the workflow, `git push --mirror` will delete refs at the mirror that don't exist at primary, INCLUDING this exercise branch. The git history of the branch is destroyed; the **SHA captured in the ledger row is the durable evidence**. Append to `code-escrow-ledger.md` "Bus-factor switch-to-mirror log" the executor's commit SHA, the branch name, the commit message, and an explicit note that the branch is expected to be deleted on the next primary `--mirror` run.
6. **Queue a hypothetical release**: open a hypothetical PR or merge request at the mirror UI (do not merge; this is exercise scope only). **Success criterion**: the PR/MR UI is functional; the executor could in principle continue development from the mirror.

**Data-loss check** (per AC-2 text): compare the mirror's HEAD SHA at switch start time against `code-escrow-ledger.md` "Mirror-workflow run record" most recent row's `pushed_sha_range_to`. Any divergence is data loss; record the missing-commits range; document the recovery path (re-push from out-of-band trustee clone; pull from backup engineer's local clone; accept as residual risk within the 10-minute SLA window).

**Deployment is OUT OF SCOPE** for AC-2 — the continuity-of-deployment property is owned by Story 1.15 + Story 0.4 degradation policy; AC-2 demonstrates **continuity-of-development**. Do not extend the exercise to a non-prod deploy under bus-factor — that's a separate exercise.

**Exercise branch is ephemeral by design** (Story 0.3 code-review 2026-05-29 Decision 4 — "Snapshot SHA to ledger row + document branch as ephemeral"): the executor's `bus-factor-exercise-*` branch will be deleted from the mirror by the next workflow run after §2.6 primary restoration. This is by design — the workflow's `git push --mirror` is a faithful-copy operation; refs absent at primary are deleted at the mirror. The **ledger row captured at step 5 above is the durable evidence**; trustees verifying AC-2 closure consult the ledger row, not the mirror's git history. If a future trustee posture requires preserving the exercise branch beyond the next workflow run, a reserved-name convention (e.g., `archived/bus-factor-*`) with workflow-level `--exclude` is the option to revisit; recorded as a Story 0.3 Open Question.

Record the exercise outcome in `code-escrow-ledger.md` "Bus-factor switch-to-mirror log" per the schema in that file.

### 2.6 — Restore primary (AC-2 only)

After the AC-2 exercise concludes, the Trustee Panel chair restores the primary repo per the simulation method:

- **Revoked Solo Builder GitHub access**: restore access via GitHub org admin.
- **Renamed primary repo**: rename back to canonical name.
- **Strict-no-interaction**: Solo Builder re-engages per the post-exercise debrief.

The restoration step is recorded in the ledger row with the restoration timestamp.

### 2.7 — Emit decision-log entry

Both procedures conclude with a `.decision-log.md` `[CONTINUITY]` entry summarizing the outcome:

- For AC-1: "Decision YYYY-MM-DD-NNN: Code-escrow restoration drill executed; outcome <success | gap with details>; closure status <provisional | full>"
- For AC-2: "Decision YYYY-MM-DD-NNN: Code-escrow bus-factor switch-to-mirror exercise executed; outcome <success | gap with details>; data-loss-check outcome <match | divergence with details>; closure status <provisional | full>"

The entry references the ledger row, the executor's drill notes, the trustee-authorization entry, and any gap-triggered procedure revisions.

## 3. Rollback procedure

The restoration drill (AC-1) and switch-to-mirror exercise (AC-2) are reversible at the procedure level — neither procedure makes durable changes to production substrate. Rollback per failure mode:

### 3.1 — Clone failure (network / auth)

- **Action**: verify the executor's read credential is current; verify network connectivity to the destination platform; retry. If failure persists, the mirror destination is unavailable — escalate per §5 trustee escalation; the drill / exercise is aborted; the destination's inventory row's status remains unchanged (no demotion from `verified` to `pending-ADR` unless ≥2-trustee re-verification confirms the destination is structurally broken).

### 3.2 — Install / build failure

- **Action**: record the failure mode in drill notes; if the failure is workspace-tooling-related (Story 1.1 dependency), record as gap and proceed with alternate workspace; if the failure is source-corruption-related, escalate per §3.5 mirror-procedure.md mirror-corruption path.

### 3.3 — Deploy failure (AC-1 only)

- **Action**: record the failure mode in drill notes; the non-prod target is not affecting prod by construction; clean up the non-prod target per the target's own cleanup procedure (docker compose down; gcp dev de-deploy; etc.); escalate per §5.

#### 3.3.1 — Executor-machine cleanup (both drill + bus-factor exercise)

When the drill or exercise concludes (success or gap), the executor MUST clean their workstation per this contract:

- **Cloned working tree**: remove the `twt-restoration` directory (or whatever local clone path was used). The cloned tree contains repo source code; under bus-factor activation it may also contain trust-sensitive material (audit logs in repo if accidentally committed; in-progress incident notes; etc.). Cleanup command: `rm -rf <clone-path>`.
- **Package manager caches** (`~/.pnpm-store`, `~/.npm`, `~/.cache/yarn`, Docker image cache as appropriate): the trust's source-code-sourced packages are non-secret, but lock-file artifacts may reference internal package registries. Cleanup command: scope to the drill's packages only via `pnpm store prune` (or equivalent) rather than wiping the entire cache.
- **Docker images** pulled during the drill: `docker image prune -f` or list-and-delete via `docker image ls --filter "reference=twt-*" -q | xargs docker image rm`. If the executor is a paid consultant who maintains other client environments, scope the image removal to TWT-tagged images only — do NOT wipe the global Docker cache.
- **GCP credentials** (if drill used GCP dev environment): revoke any `gcloud` access tokens via `gcloud auth revoke <account>`; remove any `application-default credentials` file.
- **Executor's clean-state attestation**: the executor records in the `code-escrow-ledger.md` "Restoration drill log" or "Bus-factor switch-to-mirror log" row a final field: `cleanup_attestation: <executor name> attests workstation is clean of TWT artifacts as of YYYY-MM-DDTHH:MM:SSZ`. Trustees verifying the drill row consult this attestation.
- **Paid-consultant cross-client posture**: if the executor is a paid consultant who operates across multiple clients, the cleanup contract is non-negotiable — TWT-sourced material MUST NOT cross-contaminate other clients' environments. Trustee Panel reviews the executor's cleanup attestation as part of drill sign-off.

### 3.4 — Push-back-to-mirror failure (AC-2 only)

- **Action**: record the failure mode; if auth-related, the executor's write credential is the issue (this is not a workflow-credential issue — the workflow's `MIRROR_PUSH_CREDENTIAL` is unrelated); rotate the executor's credential or use an alternate trustee-authorized credential; retry. If push fails for protocol reasons (`--force` rejected; branch protection blocks), record as gap; the exercise concludes with the gap as the dominant outcome.

### 3.5 — Exercise abort (AC-2 only)

- **Action**: if the Trustee Panel chair determines mid-exercise that the data-loss is unacceptable or the exercise has revealed a structural issue (e.g., the mirror is missing >24h of commits), the Trustee Panel chair aborts the exercise: the primary is restored per §2.6; the gap is the dominant outcome; a `.decision-log.md` `[CONTINUITY]` entry is authored; a procedure revision is triggered per `mirror-procedure.md` change-log discipline.

## 4. Verification checks

Observable post-conditions that prove the procedure succeeded.

### Shared checks (both procedures)

- [ ] **Clone succeeded.** Mirror was readable; the executor obtained a local working copy.
- [ ] **HEAD SHA verified against ledger.** Match = ok; mismatch = data-loss gap (record range; record recovery path).
- [ ] **Build succeeded.** At least one apps/* workspace built clean.
- [ ] **Ledger row appended.** The drill / exercise outcome is recorded in `code-escrow-ledger.md` with the appropriate fields populated.
- [ ] **Decision-log entry authored.** A `[CONTINUITY]` entry cites the ledger row + the trustee authorization + the closure status.
- [ ] **§2.10a surface separation property preserved.** The procedure did not touch audit-mirror credentials, prod-deploy WIF binding, or §5.9 high-sensitivity tier.

### AC-1 (drill) checks

- [ ] **Non-prod deploy succeeded.** Smoke-test verified the deployed workspace responds.
- [ ] **Cleanup completed.** The non-prod target is in its pre-drill state (no leaked resources). Executor's workstation cleanup attestation recorded per §3.3.1.
- [ ] **LFS-dependent workspaces flagged if applicable.** If the built workspace depends on LFS-tracked binaries, the drill cannot succeed without out-of-band LFS recovery — the workflow does NOT mirror LFS object payloads (only pointer files). Per `README.md` §"Surface separation — LFS object payloads are NOT mirrored," any LFS-blocked failure is recorded as a documented gap, not a drill failure. The framework assumes substantially LFS-free workspaces; deviation is escalated to Story 1.x for LFS-handling commitment.
- [ ] **Closure-status precision.** The ledger row's closure status uses [[feedback_closure_language_precision]] language: "Closed by [edit]" if the executor is a non-Solo-Builder engineer per AC-1 full closure; "Provisionally closed via substitute path" if Solo Builder executes per the substitute-engineer model.

### AC-2 (switch) checks

- [ ] **Bus-factor silence held throughout.** Solo Builder was not consulted; if a question was raised, the gap is recorded as the dominant outcome.
- [ ] **Write-to-mirror demonstrated.** The executor's commit landed at the mirror; the destination's UI showed the new branch.
- [ ] **Executor commit SHA captured to ledger BEFORE §2.6 restoration.** Per §2.5b step 5: the exercise branch is ephemeral; the SHA in the ledger row is the durable evidence. Without the snapshot, the next primary `--mirror` run silently deletes the executor's commit and AC-2 closure has no evidence.
- [ ] **Data-loss check completed.** The HEAD-vs-workflow-record cross-match is recorded; divergences are documented with recovery path.
- [ ] **Primary restoration succeeded.** Per §2.6, the primary repo is back to its pre-exercise state; production operations are unaffected.
- [ ] **Executor-machine cleanup attestation recorded.** Per §3.3.1.
- [ ] **30-day takeover joint-discharge condition noted.** Per `code-escrow-ledger.md` §"Bus-factor switch-to-mirror log" framework-level note: AC-2 closure alone does NOT discharge the 30-day takeover property; that joint discharge requires AC-1 + AC-2 + Story 0.5 (KT pack) + Story 0.6 (backup engineer). The ledger row MUST cite the joint-discharge condition explicitly.
- [ ] **Closure-status precision.** Per [[feedback_closure_language_precision]]: "Closed by [edit]" if executor is non-Solo-Builder under bus-factor; "Provisionally closed via substitute path" if Story 0.6 has not yet contracted the backup engineer.

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

### Normal operations (AC-1 planned drill)

- **Primary executor**: backup engineer per Story 0.6 (read+local-build access; no production write access). **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the backup-engineer framework exists at `docs/backup-engineer/` (including `activation-procedure.md` §2.4 activation-scenario procedure which is the analog for planned drills + `access-grant-procedure.md` for the IAM grant scope); the substantive engineer + signed contract + IAM grant are pending Story 0.6 Tasks 8-10. Until Tasks 8-10 close, the primary-executor branch is structurally available (framework leg complete) but operationally unavailable (operational principal pending).
- **Secondary executor**: trustee-authorized substitute per the Story 0.1 AC-4 model (if Story 0.6 has not yet closed). This interim path remains in effect during the pre-Story-0.6-Tasks-8-10-closure window.
- **Authorizing trustee**: Trustee Panel chair on rota; the authorization is recorded in `.decision-log.md` as a `[CONTINUITY]` entry.
- **Solo Builder**: available for drill support if the executor needs procedure clarification; the drill is NOT a bus-factor exercise — consultation is permitted (but documented in drill notes for procedure refinement).

### Bus-factor operations (AC-2 switch-to-mirror)

- **Primary executor**: backup engineer per Story 0.6 (preferred; write access to the mirror destination granted per the bus-factor activation procedure per architecture §5.10). **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the bus-factor activation procedure exists at `docs/backup-engineer/activation-procedure.md` §2.3; the substantive engineer + signed contract + IAM grant are pending Story 0.6 Tasks 8-10.
- **Secondary executor**: trustee-authorized substitute per the Story 0.1 AC-4 model (if Story 0.6 has not yet closed; the substitute path's authorization is in the `.decision-log.md` entry). This interim path remains in effect during the pre-Story-0.6-Tasks-8-10-closure window.
- **Authorizing trustee**: Trustee Panel chair on rota; oversees the exercise; aborts if mid-exercise issues warrant.
- **Solo Builder**: **silent throughout**; not consulted; not observing; not providing feedback. The bus-factor simulation discipline (Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2) applies.
- **Legal counsel**: if the AC-2 exercise is real (not simulated) and the primary repo loss is permanent, legal counsel is engaged per Story 0.13 to assess any DPDPA / trust-fiduciary implications of the recovery path.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _filled at commit_ | Solo Builder (BigDev) | initial | yes (≥2 trustees) | `code-escrow-ledger.md` framework-commit row (Story 0.3 v0.3.0) |
