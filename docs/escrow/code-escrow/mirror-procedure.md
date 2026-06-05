# Runbook: Code-Escrow Mirror Operation

> **Status:** draft / signed-off (with ledger entry at git SHA `<sha>`) / superseded
> **Owner role:** Solo Builder primary (source-of-truth for workflow configuration); Trustee Panel for destination + credential ratification; trustee-authorized engineer for reconciliation under bus-factor
> **Last material edit:** 2026-05-29 by Solo Builder (BigDev) — initial author-commit
> **Architectural authority:** architecture.md §5.4 (CI/CD pipeline — Source-code host: GitHub primary; escrow mirror to trustee-controlled location per Step 2 §9.1.1) · architecture.md §5.9 (Secret rotation policy — applies to the mirror-push credential) · architecture.md §2.10a (Surface separation invariant — mirror is NOT the audit-mirror) · PRD §9.1.1 (Solo-build operational continuity — code escrow + 30-day takeover property) · AR-67 (Solo-build operational continuity commitment) · [ADR-0002 code-escrow-mirror-destination](../../adr/adr-0002-code-escrow-mirror-destination.md) (ratified 2026-06-05 — GitLab.com under trustee-owned foundation account + SSH deploy key + branch protection enforced + annual rotation)

## 1. Prerequisites

Preconditions that must hold before the mirror operation fires. Cite architecture sections for non-obvious prerequisites.

- **Mirror destination ADR-ratified.** [ADR-0002 code-escrow-mirror-destination](../../adr/adr-0002-code-escrow-mirror-destination.md) ratified 2026-06-05 per `.decision-log.md` Decisions 2026-06-05-019 + 2026-06-05-034 + 2026-06-05-037 (amendment for deploy-key branch-protection exemption). Destination platform = GitLab.com under trustee-owned foundation account; credential model = SSH deploy key (push-only scope, whitelisted to bypass branch protection per ADR-0002 body item 3); replication mechanism = `git push --mirror` from GitHub Actions (force-push semantics permitted via the deploy-key exemption); branch-protection rules = no force-push + signed-commits required + ≥1 trustee approval for write on `main` + `release/*` EXCEPT the configured mirror-push deploy key (which is exempt to make `git push --mirror` operationally viable).
- **Mirror destination provisioned.** The destination exists at the chosen platform; trustee-administrative-control attestation in `mirror-destination-inventory.md` names the trustee(s) holding owner-account credentials at the destination. **Sole-Solo-Builder admin is FORBIDDEN** per `README.md` §"Surface separation — Trustee-administrative-control attestation"; the procedure aborts if the inventory row lacks trustee attestation.
- **GitHub Actions secrets wired.** `MIRROR_PUSH_CREDENTIAL` and `MIRROR_DESTINATION_URL` are populated in the primary GitHub repository's Actions secrets (per Story 0.3 Task 8). The wiring event is recorded in `code-escrow-ledger.md` "Workflow-secret-wiring log."
- **Release-branch set defined.** The `on: push: branches:` list in `.github/workflows/code-escrow-mirror.yml` matches the canonical release-branch set per `README.md` §"Release-branch set." At Story 0.3 author-commit time the set is `{main}` as the Story 1.1 amendment placeholder.
- **Mirror-push credential is in `prod-credential` envelope.** The credential value is sealed under Story 0.2's framework with the inventory row added at Story 0.3 Task 8. Rotation triggers per architecture §5.9 are wired to re-seal triggers per Story 0.2's framework.
- **`§2.10a` surface separation property preserved.** Per `README.md` §"Surface separation — Structural property — mirror compromise does not transitively grant production access": (i) the mirror has no access to the audit-mirror credentials; (ii) the mirror destination is NOT in the prod-deploy WIF trust binding per architecture §5.4; (iii) the mirror destination has no IAM grants into the §5.9 high-sensitivity tier. **A procedure step that would violate any of these is aborted.**
- **Trustee-administrative-control attestation check.** Verify that `mirror-destination-inventory.md` row for the active destination names a trustee in the `Trustee-administrative-control attestation` column. A mirror destination under sole Solo Builder admin MUST NOT receive the workflow secret — the procedure aborts.
- **Trust-on-first-use (TOFU) disclosure for SSH credential model.** When the credential model is deploy-key SSH, the workflow uses `StrictHostKeyChecking=accept-new`. Because GitHub Actions runners are ephemeral, every workflow run is a "first connection" — TOFU accepts the destination's currently-presented host key with no comparison against a pinned fingerprint. This is the **pre-ADR interim posture** per Story 0.3 code-review 2026-05-29 Decision 1. A network MITM on the runner-to-mirror path during this window could substitute its host key and capture the push. The Task 7 ADR commits a host-key pinning mechanism that closes this window (a `KNOWN_HOSTS` GitHub Actions secret with `StrictHostKeyChecking=yes`, or a SHA256 host-key-fingerprint check, per the ADR's selected mechanism). Until Task 7 lands, TOFU is the accepted residual risk; the workflow's header comment documents it; Story 0.3 Open Question #9 tracks it. Trustees ratifying mirror destination selection at Task 7 MUST commit a host-key pinning mechanism as part of the ADR scope.

## 2. Step-by-step procedure

The mirror workflow runs automatically on every release-branch push. This section documents what the workflow does + what manual reconciliation closes the ledger loop.

### 2.1 — Workflow trigger

The workflow `code-escrow-mirror.yml` fires on `push` to any branch in the release-branch set. The trigger is the GitHub Actions event timestamp — the start-of-SLA clock.

### 2.2 — Configure the mirror remote

> Per ADR-0002 (ratified 2026-06-05): the workflow's mirror-configuration step uses `MIRROR_PUSH_CREDENTIAL` = SSH ED25519 private key (push-only scope) and `MIRROR_DESTINATION_URL` = `git@gitlab.com:<trust-foundation>/<repo>.git`. Solo Builder generates the deploy key via `ssh-keygen -t ed25519`; private key is wired to GitHub Actions secret; public key is registered at GitLab project deploy keys with push-only authority. The workflow runs `StrictHostKeyChecking=yes` against a `KNOWN_HOSTS` secret containing GitLab.com's published SSH host-key fingerprint per ADR-0002 body item 7 (closes Story 0.3 OQ #9 TOFU exposure window).

The workflow step:
1. Checks out the full git history with `actions/checkout@v4` using `fetch-depth: 0` and `persist-credentials: false`. The full history is required for `git push --mirror` semantics.
2. Reads `MIRROR_PUSH_CREDENTIAL` and `MIRROR_DESTINATION_URL` from GitHub Actions secrets.
3. Configures the mirror destination as a git remote (the specific configuration commands are ADR-recorded per the chosen credential model — SSH config for deploy keys; URL with token for OAuth; remote name `mirror` by convention).

### 2.3 — Mirror push

The workflow executes `git push --mirror "<MIRROR_REMOTE_URL>"`. The `--mirror` flag:

- Pushes all refs (branches + tags + notes + remote-tracking refs).
- Updates the mirror to match the primary exactly — deletes refs at the mirror that have been deleted at the primary.

**Force-push semantics.** `git push --mirror` is force-push-equivalent at the mirror — a force-push at the primary propagates to the mirror without prompt. This is intentional (the mirror is a faithful copy, not an independent fork) but means a malicious or accidental force-push at the primary destroys mirror history. Mitigations:

- Primary repo branch protection at GitHub (Story 1.1 + Story 1.16x territory) prevents force-push to release branches under normal conditions.
- The mirror destination's branch protection (ADR-recorded per Task 7) MAY layer additional protection — but if the mirror's branch protection blocks the workflow's push, the workflow fails and the SLA breaches; the trade-off is recorded in Open Question #6.

### 2.4 — Capture pushed SHA range to ledger artifact

The workflow appends a structured record to a build artifact named `mirror-push-record-<run-id>.json` and uploads it via `actions/upload-artifact@v4`. The record's schema (Story 0.3 code-review 2026-05-29 patches: `pushed_sha_range_from` is now actual previous mirror HEAD via `git ls-remote mirror HEAD`; `wall_clock_duration_seconds` is now event-timestamp-to-push-complete via `GITHUB_EVENT_PATH` parse; outcome enum includes the failure-pre-push / failure-during-push values):

```
{
  "workflow_run_id": "<github-actions-run-id>",
  "triggering_ref": "<refs/heads/...>",
  "triggering_sha": "<primary-repo-HEAD-at-push>",
  "pushed_sha_range_from": "<previous-mirror-HEAD-via-ls-remote OR empty on first push>",
  "pushed_sha_range_to": "<new-mirror-HEAD = post-push-primary-HEAD = local HEAD>",
  "mirror_destination_url": "<scheme + host-only; userinfo + path redacted>",
  "outcome": "success | failure-during-push | failure-pre-push",
  "event_epoch_seconds": "<unix epoch of push event timestamp from GITHUB_EVENT_PATH>",
  "wall_clock_duration_seconds": "<from event_epoch_seconds to push complete>"
}
```

**Outcome enum semantics:**

- `success` — the mirror_push step completed; `pushed_sha_range_*` reflect the actual mirror state transition.
- `failure-during-push` — the mirror_push step was reached and failed; specific cause requires inspection of the GitHub Actions run logs (auth failure | network failure | partial push | SLA breach via job timeout); route to §3.1 / §3.2 / §3.3 / §3.4 by inspecting the failure detail.
- `failure-pre-push` — a step BEFORE the mirror_push step failed (checkout, event timestamp capture); the push was never attempted; route to §3.1 (auth never tried) and check the GitHub Actions UI for the failing step name.

The artifact is the reconciliation source for `code-escrow-ledger.md` "Mirror-workflow run record" rows. Artifact retention: GitHub Actions default (90 days at v0.3 commit; check GitHub policy at reconciliation time); rows in the ledger are durable beyond artifact retention.

**SLA measurement note.** `wall_clock_duration_seconds` measures the AC-1 wall-clock SLA — push event timestamp → push complete. This INCLUDES runner-queue time and checkout time (which the original implementation excluded). The 8-minute `timeout-minutes` is an in-job upper bound for push-side hangs; it is NOT the SLA enforcement mechanism. Actual SLA enforcement requires monitoring of the artifact's `wall_clock_duration_seconds` field (Story 0.3 Open Question #4 tracks the monitoring wiring).

### 2.5 — On-failure path

If any step fails (auth, network, partial push, SLA breach via `timeout-minutes: 8`), the workflow:

1. Emits a structured failure record to the ledger artifact (per §2.4 schema with the corresponding `outcome` value).
2. Exits non-zero. The GitHub Actions run history records the failure; the on-call surface MAY subscribe to workflow-failure webhook events for paging — wiring deferred per Story 0.3 Open Question #4.

**Manual escalation under workflow failure.** Solo Builder (or trustee-authorized engineer under bus-factor) inspects the failure record, classifies the failure mode (auth → §3.1; network → §3.2; partial push → §3.3; SLA breach → §3.4), and follows the rollback procedure §3.

### 2.6 — Manual reconciliation to ledger

At the cadence committed in operations policy (fallback pre-operations-policy: at each ≥2-trustee read-access verification cycle), Solo Builder or a trustee-authorized engineer:

1. Downloads `mirror-push-record-<run-id>.json` for every workflow run since the last reconciliation.
2. Appends a row to `code-escrow-ledger.md` "Mirror-workflow run record" per the artifact's schema.
3. Cross-checks the artifact's `outcome` against the GitHub Actions UI run history; drift triggers a `.decision-log.md` `[CONTINUITY]` entry per `README.md` §"Ledger-vs-workflow reconciliation."

### 2.7 — Emit audit line (forward-link to architecture §1.5)

The workflow failure event is itself an operationally significant event that the audit-log surface (architecture §1.5) MAY ingest once the audit surface is wired (Story 1.10). At Story 0.3 closure time, audit-log integration is out of scope — the ledger reconciliation is the durable record.

## 3. Rollback procedure

The mirror operation is forward-only at its core (per architecture §1.8 forward-only analogy applied to source replication). The rollback path is "fix the cause + re-fire the workflow," not "undo the push." Per failure mode:

### 3.1 — Auth failure

- **Symptom**: workflow fails at §2.3 with permission-denied / 401 / SSH key rejected.
- **Cause**: mirror-push credential rotated at the mirror destination but not yet at GitHub Actions secrets; or destination's owner-account credentials revoked.
- **Action**: rotate the GitHub Actions secret per `docs/runbooks/secret-rotation.md`; re-seal the new credential under Story 0.2's framework (record in `code-escrow-ledger.md` "Workflow-secret-wiring log" + Story 0.2 `escrow-ledger.md` re-seal row); re-run the workflow manually via the GitHub Actions UI.

### 3.2 — Network failure

- **Symptom**: workflow fails at §2.3 with timeout / connection-refused / DNS-resolution-failed.
- **Cause**: transient network issue at GitHub Actions runner; or destination platform outage.
- **Action**: wait 5 minutes; re-run the workflow manually. If failure persists, check the destination platform's status page; escalate to Trustee Panel chair if the destination is in sustained outage (mirror coverage is degraded; the trust accepts the gap or activates the secondary destination if hybrid dual-mirror is selected per Open Question #3).

### 3.3 — Partial push

- **Symptom**: workflow reports `outcome: partial-push` — some refs propagated, others did not.
- **Cause**: destination's branch protection blocked a subset of refs; or `git push --mirror` aborted midway.
- **Action**: inspect the failure record's pushed-SHA-range field; identify the missing refs; if destination branch protection is the cause, escalate to the ADR for review (the protection rule may be incompatible with `--mirror` semantics); if abort midway, re-run the workflow — `--mirror` is idempotent and re-fires propagate the missing refs.

### 3.4 — SLA breach via `timeout-minutes: 8`

- **Symptom**: workflow times out at 8 minutes; the mirror push did not complete; ledger artifact records `outcome: sla-breach`.
- **Cause**: large push (e.g., LFS migration; history rewrite); destination platform slow; runner slow.
- **Action**: this is the **fast-failure-beats-silent-SLA-drift** intentional design — the workflow fails rather than masking the breach. Investigate the cause; if legitimate (large push), file an Open Question to revisit the 8-minute timeout vs the 10-minute SLA (or split the workflow into refs-only fast path + LFS-only batched path). If artificial (network slow during peak hours), re-run; persistent breaches are a `.decision-log.md` `[CONTINUITY]` entry triggering procedure revision.

### 3.5 — Mirror corruption (mirror side)

- **Symptom**: ≥2-trustee read-access verification detects mirror HEAD divergence from primary HEAD that workflow records say should match.
- **Cause**: someone with mirror destination push access pushed directly to the mirror, bypassing the workflow; or the mirror's storage corrupted.
- **Action**: re-mirror from primary via manual workflow re-run; if primary is the source-of-truth (typical), the mirror is restored. If primary is suspected of corruption, see §3.6.

### 3.6 — Mirror corruption (primary side) — Solo Builder UNAVAILABLE

- **Symptom**: primary HEAD has unexpected commits or missing commits relative to last-known-good ledger record.
- **Cause**: hostile force-push to primary; primary repo compromised.
- **Pre-condition**: Solo Builder is unreachable / silent per the bus-factor activation criteria. If Solo Builder is reachable, follow §3.6a instead.
- **Action**: this is the AC-2 bus-factor switch-to-mirror trigger. Follow `restoration-procedure.md` §2 switch-to-mirror sub-procedure; the mirror becomes the source-of-truth; primary is locked/quarantined; recovery is owned by the Trustee Panel under bus-factor.

### 3.6a — Mirror corruption (primary side) — Solo Builder AVAILABLE (normal incident response)

- **Symptom**: same as §3.6.
- **Cause**: same as §3.6.
- **Pre-condition**: Solo Builder is reachable; this is NOT a bus-factor scenario; the bus-factor simulation discipline does NOT apply.
- **Action**: Solo Builder + Trustee Panel chair execute normal incident response:
  1. Identify the last-known-good primary HEAD from the most recent `code-escrow-ledger.md` "Mirror-workflow run record" row with `outcome: success`. This SHA is the recovery target.
  2. Lock primary write access (revoke push permissions for all non-Solo-Builder principals; suspend the prod-deploy WIF binding) until investigation is complete.
  3. Force-push primary back to the last-known-good SHA from (a) Solo Builder's local out-of-band clone, OR (b) the mirror's last-verified HEAD if the mirror is known clean (cross-check against ledger artifact SHA + ≥2-trustee verification per the most recent "Read-access verification log" row), OR (c) a trustee-held clone from the Story 0.5 KT pack distribution.
  4. The forced restoration is a `.decision-log.md` `[CONTINUITY]` entry citing the incident date, the lost SHA range (forensic record), the recovery SHA, and the trustee co-sign.
  5. Run a manual workflow_dispatch of `code-escrow-mirror.yml` immediately after restoration to re-align the mirror against the restored primary.
  6. Post-incident review: per `mirror-procedure.md` change-log discipline + Trustee Panel review of access controls; identify the root cause + revisions to primary-side branch protection.
- **Why this matters**: §3.6 routes to bus-factor switch-to-mirror, which requires Solo Builder silence. The "primary corrupted but Solo Builder fine" scenario is a real incident response path — common, recoverable, and explicitly NOT a bus-factor activation. Documenting it here prevents the procedure from being misapplied (which would either force unnecessary bus-factor activation OR leave the incident without a procedure).

## 4. Verification checks

Observable post-conditions that prove the operation succeeded. Each check returns a deterministic pass/fail signal.

- [ ] **Workflow exit code = 0.** Verified via GitHub Actions UI run history.
- [ ] **Ledger artifact uploaded.** `mirror-push-record-<run-id>.json` exists in the workflow run's artifacts; downloadable for reconciliation.
- [ ] **Pushed SHA range matches primary HEAD.** Compare artifact's `pushed_sha_range_to` against primary repo's HEAD at workflow run time (recoverable from GitHub Actions checkout step's commit SHA). Match = ok; mismatch = gap.
- [ ] **Mirror HEAD matches workflow-recorded SHA.** Clone the mirror; check HEAD; compare against artifact. Match = ok; drift = gap (escalate per §3.5 or §3.6).
- [ ] **Wall-clock duration < 10-minute SLA.** Compare artifact's `wall_clock_duration_seconds` against 600 seconds. Under = ok; ≥ 600 = SLA breach (the `timeout-minutes: 8` should have prevented this; if it landed at 8–10 min, the workflow timed out and the breach is also a fast-failure event — both records are gaps).
- [ ] **Ref/tag count parity.** `git ls-remote $MIRROR_DESTINATION_URL | wc -l` matches `git ls-remote $PRIMARY_REMOTE_URL | wc -l`. Match = ok; divergence = gap (escalate per §3.3 partial-push or §3.5 mirror corruption).
- [ ] **§2.10a surface separation property holds.** The mirror destination has no IAM grants into prod / audit-mirror / high-sensitivity tier; verified by ADR cite + Task 7 ratification.
- [ ] **Trustee-administrative-control attestation valid.** The inventory row for the active destination names a trustee in the attestation column; the named trustee is still on the Trustee Panel (no resignation drift).

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

### Normal operations

- **Primary:** Solo Builder (workflow source-of-truth; runbook author).
- **Secondary (if primary unreachable within SLA):** Trustee Panel chair on rota.
- **Trustee escalation (when operation affects trustee-relevant invariants — surface separation property; mirror destination ADR revision; data loss):** Trustee Panel chair on rota; ≥2-trustee quorum for any procedure revision affecting §2.10a-adjacent properties.

### Bus-factor operations (Solo Builder unreachable)

- **Primary:** backup engineer per Story 0.6 (read-only by default per architecture §5.10; write/admin requires per-action trustee approval).
- **Secondary:** trustee-authorized substitute engineer per the Story 0.1 AC-4 model (if Story 0.6 has not yet closed).
- **Trustee oversight throughout:** Trustee Panel chair on rota verifies the bus-factor exercise is logged in the ledger; Solo Builder is silent throughout per the bus-factor simulation discipline (Story 0.1 AC-4 + Story 0.2 AC-3 + this story AC-2).

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _filled at commit_ | Solo Builder (BigDev) | initial | yes (≥2 trustees) | `code-escrow-ledger.md` framework-commit row (Story 0.3 v0.3.0) |
