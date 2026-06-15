# Runbook: Deploy

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger) — **reconciled to AS-BUILT by Story 1.15 (material edit, re-sign required)**
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13)
> **Last material edit:** 2026-06-15 by Solo Builder (Story 1.15 AS-BUILT reconciliation — GitHub Actions → Dokploy API leg)
> **Architectural authority:** architecture.md §5.3 (Deployment substrate), §5.4 (CI/CD pipeline), §5.5 (Environment topology), §1.8 (Migration tool — forward-only)

## 0. AS-BUILT reconciliation (Story 1.15)

Story 1.15 wired the **GitHub Actions → Dokploy API** deploy leg (architecture §5.4). The procedure below is reconciled to what shipped:

- **Deploy model:** release-branch push → WIF-keyless auth → build + push per-app images to **Artifact Registry** (`asia-south1-docker.pkg.dev/<project>/twt-images/<app>:<git-sha>`) → `POST` the **Dokploy deploy API**. The 4 deployable workspaces are **`api` / `admin` / `jobs` / `public`** (`apps/member` is a future workspace — not in v1).
- **Workflows:** `.github/workflows/deploy-staging.yml` (trigger: push to `release/**` + `workflow_dispatch`) and `deploy-prod.yml` (trigger: `workflow_dispatch` only — manual promotion after staging green).
- **Env scope:** **dev stays authored** (no live deploy); **staging + prod are live-wired** (operator-applied). WIF per-env (`infra/gcp/wif.tf`); prod carries the strictest claim (`wif_prod_workflow_ref`).
- **The ≥2-principal prod approval gate** is the GitHub **`production` Environment** protection rule (required reviewers), referenced by `deploy-prod.yml` `environment: production`.
- **Dev-agent / operator split:** the dev agent authored + CI-validated the workflows + the live `DeployTrigger` Dokploy-API client + the WIF/Cloud-SQL Terraform; the **operator** runs the live apply-sequence (`infra/gcp/README.md` §Story 1.15) — no live cloud commands ran in dev.
- ADR: the deploy model + the dev-agent-wires/operator-applies split are recorded in **ADR-0011**.

## 1. Prerequisites

Preconditions that must hold before initiating a deploy.

- **Environment scope:** this runbook applies to dev, staging, and prod. Each environment is a separate GCP project (`twt-dev`, `twt-staging`, `twt-prod`) per architecture §5.5; the deployment substrate (Dokploy) lives in a separate isolated GCP project (`twt-dokploy-prod`) per §5.3 IAM isolation commitment.
- **Source state:** the commit to be deployed exists on a release branch in the primary GitHub repo. For prod, the commit is on the production-release branch; for staging, on the staging-release branch; for dev, any feature branch with passing CI.
- **CI state:** all CI gates pass on the commit. CI gates surfaced in architecture §5.4 (OpenAPI breaking-change detection, RLS regression test, cross-Pariwar adversarial read test, etc.) must all be green. A red gate is a hard block — do not bypass.
- **Image build:** the container image for every deployable workspace has been built and pushed to Artifact Registry in `asia-south1`, signed at build time (Sigstore/Cosign or GCP Binary Authorization per §5.4). Tag immutability is enforced for prod images.
- **Schema migration state:** if the deploy includes schema changes, the migration phase has succeeded in the target environment **before** code is promoted (per architecture §1.8 deploy discipline: "Migration phase precedes code deploy"). The verification step below confirms migration success before code promotion.
- **Manual approval gate (prod only):** the staging → prod promotion requires explicit manual approval from one of the ≥2 promotion-approvers (Solo Builder + backup engineer per architecture §5.4 "Promotion-approver backup"). Without an approval, prod deploy is structurally blocked.
- **Credentials:** WIF claim is configured for the deploying workflow per architecture §5.4. No long-lived service-account keys are needed (and none should be used).
- **Audit-log baseline:** the audit-log integrity check has passed within the operational window. A deploy is not initiated against a system whose audit chain is broken (chain break is a P0 incident per §1.5).

## 2. Step-by-step procedure

Numbered, executable steps. Solo Builder is silent during execution if simulating bus-factor activation; gaps the executor encounters are logged in the operational-readiness ledger.

1. **Confirm the target environment.** Identify the GCP project: `twt-dev` / `twt-staging` / `twt-prod`. Verify the WIF trust binding for the deploying workflow is scoped to this environment (architecture §5.4 "WIF claim restrictions"). Reject the deploy if the binding name does not match the target.

2. **Confirm the commit.** Resolve the release-branch HEAD SHA. Verify the CI run for this SHA is green across all required gates. If any gate is red or missing, halt and route to the failing-gate response (see §5).

3. **Confirm the signed image.** For each deployable workspace (`apps/api`, `apps/admin`, `apps/member`, `apps/jobs/audit`, etc. per architecture §Workspace Layout), confirm the image at the workspace's expected tag is present in Artifact Registry, signed by the trusted signer, and matches an immutable tag for prod.

   - **AS-BUILT (Story 1.15, ADR-0011):** the Artifact Registry path is `asia-south1-docker.pkg.dev/<project>/twt-images/<app>:<git-sha>` (app ∈ {`api`,`admin`,`jobs`,`public`}); the build + push runs in `deploy-{staging,prod}.yml` under the WIF deployer SA. Image signing (Sigstore/Cosign or Binary Authorization) remains an operator-hardening follow-on; tag immutability for prod is set on the Artifact Registry repo at apply time.

4. **Migration phase (only if the deploy includes schema changes).** Execute migrations against the target environment's Postgres before promoting code.

   1. Open the migration runbook context (drizzle-kit per architecture §1.8) and apply forward-only migrations. Do not use `drizzle-kit drop`.
   2. Verify migration success: query the migrations table; confirm the expected migration SHA is present.
   3. If migration fails, halt the deploy. Code is NOT promoted against an unmigrated DB. Migration-rollback is a *new forward migration* (see `rollback.md`), not a `--down`.

5. **Code promotion: dev.** Trigger the dev-deploy workflow in GitHub Actions. The workflow uses WIF to authenticate to GCP, pushes the signed image to the dev Dokploy substrate, and waits for the substrate's health probe to return ready.

6. **Code promotion: staging.** After dev verification (§4 of this runbook), trigger the staging-deploy workflow. Same shape as dev; WIF binding is staging-scoped.

7. **Code promotion: prod (requires manual approval).** The staging → prod promotion gate is enforced in the workflow file. The deployer initiates the workflow; an approver (Solo Builder OR backup engineer, per §5.4 promotion-approver backup) must explicitly approve before the workflow proceeds. The approver should verify:
   - The signed image matches the staging-verified image (same SHA).
   - The migration phase (if any) succeeded in prod and the migrations table reflects the new SHA.
   - No active incident requires holding the deploy (check the incident channel before approving).
   Once approved, the workflow pushes the image to the prod Dokploy substrate.

8. **Post-deploy verification.** Execute the verification checks in §4. Any failed check triggers immediate rollback per `rollback.md`.

9. **Record the deploy.** Append a row to the deployment log (location committed in operations policy; do not invent a location). Capture: target environment, image SHA, deployer identity, deploy timestamp, verification outcomes.

## 3. Rollback procedure

If post-deploy verification (§4 of this runbook) fails, OR if a regression manifests after deploy:

1. **Code rollback** is a redeploy of the previously-signed image. Identify the prior image SHA from the deployment log (§2 step 9). Trigger the deploy workflow with that prior SHA as the target. The same manual-approval gate applies for prod.

2. **Schema rollback** is **never** `drizzle-kit drop` (per architecture §1.8 forward-only commitment). If the deploy included a migration that contributed to the regression, schema rollback is a **new forward migration** authored to invert the effect:
   - Open `rollback.md` runbook for the schema-rollback decision tree.
   - Do NOT attempt to revert the migration row from the migrations table directly. The migration row is authoritative; an attempted reversion through DB-direct access breaks the audit-log chain (per architecture §1.5 single-DB-access tampering posture).

3. **Re-verify after rollback** using the same checks in §4. Confirm the rolled-back image is serving traffic. Update the deployment log with the rollback action.

4. **Incident review.** Open an incident record (operations policy locates the incident store). Capture: what triggered the rollback, what verification failed, what was changed in the rollback, what investigation is owed.

## 4. Verification checks

Every check below must return a deterministic pass/fail. Failures escalate per §5.

- [ ] **Health probe pass.** Each deployed workspace's health endpoint returns 200 OK. Endpoint names and locations are committed per workspace; the Dokploy substrate's health probe is the canonical source.
- [ ] **Image SHA matches expected.** Query the deployed substrate's currently-serving image SHA. Confirm it equals the SHA selected in §2 step 3.
- [ ] **Migration SHA matches expected (if migrations applied).** Query the migrations table; confirm the expected migration SHA is present and is the latest.
- [ ] **Audit-log writes confirmed.** Generate a synthetic audited action (a no-op admin event) and verify it lands in the audit log with a valid hash-chain entry, per architecture §1.5. The integrity-check job's next run must show no chain break.
- [ ] **Cross-Pariwar RLS isolation intact.** Run the adversarial RLS read test (architecture §5.4 CI gate; the test is also executable as a one-off probe). Any cross-tenant read is a P0 incident.
- [ ] **Bot/edge protection live (prod only).** Confirm Cloudflare front sits in front of the deployed backend (architecture §1 Epic 1 demoable closure). A test request bypassing Cloudflare with the prod backend's direct address must be rejected.
- [ ] **Observability surfaces report the deploy.** The deploy marker is visible in the observability stack (specific surfaces named in operations policy per architecture §5.6). No alerts have fired post-deploy beyond expected steady-state.

## 5. Contact escalation list

Roles, not individuals. Specific contacts live in operations policy.

- **Primary (operational issue):** Infrastructure on-call (Solo Builder at v1; backup engineer surge per A-13).
- **Failed CI gate:** Engineering Lead (Solo Builder at v1).
- **Failed verification check escalating to P0:** Trustee Panel chair on rota.
- **Audit-log chain break (P0):** Audit-mirror integrity-check on-call (this is a separately-routed page per architecture §1.5; do not consolidate with infra on-call).
- **WIF trust-relationship broken (rare; recovery requires GCP IAM admin):** IAM-admin secondary (≥3 principals per §5.4 "WIF trust-relationship recovery").

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending in `operational-readiness-ledger.md`_ |
| 2026-06-15 | _Story 1.15_ | Solo Builder | **yes — AS-BUILT reconciliation** (§0 added; GitHub Actions → Dokploy API leg, `deploy-{staging,prod}.yml`, Artifact Registry path, `production` Environment ≥2-reviewer gate, dev authored / staging+prod live-wired) | **yes (≥2 trustees)** | _pending_ |
