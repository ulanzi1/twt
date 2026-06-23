# Execution-Validation Checklist — Deploy + Rollback (staging)

> **Status:** checklist (procedure to perform) — discharges the gated execution-validation directive of `.decision-log.md` **Decision 2026-06-23-060**. **Not yet executed**; results are recorded in the `operational-readiness-ledger.md` Execution-validation log when the drill runs.
> **Owner role:** Infrastructure on-call (executor must be **non-Solo-Builder** per Story 0.1 AC-4 — backup engineer per A-13 / Story 0.6, or a trustee-authorized substitute)
> **Last material edit:** 2026-06-23 by BigDev (Solo Builder) — initial
> **Authority:** `deploy.md` + `rollback.md` (both ≥2-trustee signed-off 2026-06-23 at git SHA `f247e6d`) · Decision 2026-06-23-060 (trustee directive) · Story 0.1 AC-4 (bus-factor execution-validation) · architecture §5.3/§5.4/§5.5/§1.8.

## Purpose

Prove the signed `deploy.md` and `rollback.md` runbooks actually work, end-to-end, by performing **one documented code deploy + code rollback on `twt-staging`** under simulated bus-factor activation (Solo Builder silent; the executor follows the runbooks unaided). This is the trustee directive from the 2026-06-23 consent session — sign-off attests the *document*; this drill attests it *runs*.

**Scope of this drill:** a **code-only** deploy + rollback on **staging** (no schema migration — the lowest-risk path that exercises the core build → push → Dokploy-API → health → redeploy-prior-image mechanics). The coverage boundary (what this drill does **not** exercise) is recorded in §5 — do not over-claim.

## 0. Pre-conditions (verify before starting)

- [ ] **Executor is non-Solo-Builder** (AC-4). Record identity + role. Solo Builder is reachable but **silent** during execution; every point where the executor must ask is a **gap** to log.
- [ ] **Drill authorized** — AC-4 path recorded in `.decision-log.md` (Path 1 backup engineer, or Path 2 trustee-authorized substitute) per `operational-readiness-ledger.md` §"Execution path selected for AC-4 closure".
- [ ] **Target = `twt-staging`** (live-wired per `deploy.md` §0; prod is **out of scope** for this drill — §5).
- [ ] **Trigger is a planned drill, not a real regression.** Record the trigger verbatim as "execution-validation drill (Decision 2026-06-23-060)" — `rollback.md` §1 requires a deterministic trigger; "planned drill" is that trigger here.
- [ ] **Staging CI green** on the baseline commit; **audit-log integrity check** passed within the operational window (`deploy.md` §1, `audit-log-integrity-verification.md`).
- [ ] **Record the baseline.** Query the staging substrate's currently-serving image SHA per app (`api`/`admin`/`jobs`/`public`) and the top row of the staging deployment log. Call this **`SHA_base`** — it is the rollback target. Write it down before deploying.

## 1. Deploy validation (maps to `deploy.md` §2 + §4)

Use a **trivial, no-behaviour-change** commit (e.g., a comment/whitespace change) on a `release/**` branch so the deploy is real but the blast radius is nil. Call the new image **`SHA_new`**.

- [ ] **1.1 Confirm target env** — WIF binding scoped to `twt-staging`; reject if the binding name doesn't match (`deploy.md` §2.1).
- [ ] **1.2 Confirm commit** — resolve `release/**` HEAD = `SHA_new`; CI green across all required gates (`deploy.md` §2.2). Record `SHA_new`.
- [ ] **1.3 Confirm signed image** — for each app `{api,admin,jobs,public}`, image present at `asia-south1-docker.pkg.dev/<project>/twt-images/<app>:SHA_new` (`deploy.md` §2.3 AS-BUILT).
- [ ] **1.4 Migration phase — N/A** (no schema change in this drill). Record "N/A — no migration" explicitly (a faithful N/A, not a skip).
- [ ] **1.5 Promote to staging** — trigger `deploy-staging.yml` (push to `release/**` or `workflow_dispatch`); WIF auth → Dokploy deploy API → wait for the substrate health probe to return ready (`deploy.md` §2.6).
- [ ] **1.6 Post-deploy verification (`deploy.md` §4)** — record pass/fail for each:
  - [ ] Health probe 200 OK for each app (`api`/`admin`/`jobs`/`public`).
  - [ ] Deployed image SHA == `SHA_new`.
  - [ ] Migration SHA — N/A (no migration).
  - [ ] Synthetic audited action lands in the audit log with a valid hash-chain entry; next integrity-check run shows no chain break.
  - [ ] Cross-Pariwar RLS adversarial read probe — no cross-tenant read.
  - [ ] Observability shows the deploy marker; no unexpected alerts fired.
- [ ] **1.7 Record the deploy** — append a row to the staging deployment log: env, `SHA_new`, deployer identity, timestamp, verification outcomes (`deploy.md` §2.9).

## 2. Rollback validation (maps to `rollback.md` §2.1 + §4)

Now roll **`SHA_new` → `SHA_base`** — a code rollback = redeploy of the prior signed image.

- [ ] **2.1 Identify the prior SHA** — from the staging deployment log, the row immediately prior to §1.7 = `SHA_base` (`rollback.md` §2.1.1). Confirm it matches the §0 baseline.
- [ ] **2.2 Confirm signed image presence** — query Artifact Registry for `...:SHA_base`; signature valid; tag-immutability means it was not overwritten (`rollback.md` §2.1.2, §1).
- [ ] **2.3 Redeploy prior image** — re-run `deploy-staging.yml` with `SHA_base` as the `image_tag` input; note "rollback to `SHA_base` — drill" in the run (`rollback.md` §0 + §2.1.3).
- [ ] **2.4 Rollback verification (`rollback.md` §4 + `deploy.md` §4)** — record pass/fail for each:
  - [ ] Deployed image SHA == `SHA_base`.
  - [ ] All `deploy.md` §4 checks pass against `SHA_base` (health / audit-write / RLS / observability).
  - [ ] Application starts cleanly against the rolled-back image (no schema-mismatch runtime errors — trivially true here, no migration).
  - [ ] Audit chain intact — next integrity-check run shows no chain break introduced by the rollback.
  - [ ] Rollback target serves correctly. _(The `rollback.md` §4 "originally-failing check now passes" criterion is replaced by this, since the trigger was a planned drill, not a real failure — record that substitution.)_
- [ ] **2.5 Update the deployment log** — rollback row: target `SHA_base`, deployer identity, timestamp, trigger = "execution-validation drill (Decision 2026-06-23-060)" (`rollback.md` §2.1.5).

## 3. Success / gap criteria

- **PASS** if: the deploy reached `SHA_new` with all §1.6 checks green, the rollback returned staging to `SHA_base` with all §2.4 checks green, the audit chain stayed intact throughout, and the **executor completed both runbooks without needing Solo Builder** to fill a step.
- **GAP** if: any check failed, any runbook step was ambiguous/blocking/wrong, the executor had to ask Solo Builder, or staging did not return cleanly to `SHA_base`. **Record the gap verbatim** (which runbook, which step, what was missing).
- A gap triggers the **AC-3 protocol**: fix the runbook → ≥2-trustee **re-sign** the corrected runbook → **re-execute** this drill. A gap therefore **re-opens** that runbook's sign-off (the `f247e6d` sign-off no longer covers the corrected SHA).

## 4. What to record (do this when the drill runs — not before)

1. **`operational-readiness-ledger.md` Execution-validation log** — add **two rows** (one per runbook), replacing the seeded `PENDING` row:

   | Runbook file | Runbook git SHA at execution | Executor identity | Executor role | Date | Target environment | Outcome (success / gaps) | Linked ledger re-sign (if gaps) |
   |---|---|---|---|---|---|---|---|
   | `deploy.md` | _SHA at execution_ | _executor_ | non-Solo-Builder | _date_ | `twt-staging` | _success / gaps_ | _link if gaps_ |
   | `rollback.md` | _SHA at execution_ | _executor_ | non-Solo-Builder | _date_ | `twt-staging` | _success / gaps_ | _link if gaps_ |

2. **`.decision-log.md`** — append a successor entry recording the drill outcome and, on PASS, **discharging the Decision 2026-06-23-060 deploy/rollback execution-validation gate**. On GAP, record the gap + the AC-3 re-sign/re-execute follow-up; the gate stays open.
3. **AC-4 box** — if this drill also serves as the Story 0.1 AC-4 execution-validation for the deploy/rollback topic, check the selected path box in `operational-readiness-ledger.md`.

## 5. Coverage boundary (what this drill does NOT exercise — record so it is not over-claimed)

This staging code-deploy/rollback validates the core mechanics. It does **not** cover, and these remain separately un-validated:

- **Prod-only gates:** the `deploy-prod.yml` `workflow_dispatch`-only trigger, the `production` Environment **≥2-reviewer manual-approval** gate, and prod tag-immutability enforcement (`deploy.md` §2.7, `rollback.md` §1).
- **Edge/WAF:** the Cloudflare-in-front-of-backend check + direct-ingress rejection (`deploy.md` §4 "prod only").
- **Schema rollback:** the forward-migration inverse-effect path (`rollback.md` §2.2) — heavier; validate separately (it requires authoring + CI-gating an inverse migration).
- **New-Pariwar rollback:** `rollback.md` §2.4 (defers to `multi-pariwar-provisioning.md` §3) — a distinct data-state rollback.

A future drill (or a prod-promotion exercise under the real approval gate) should cover these; record them as the remaining execution-validation surface.

## 6. Escalation

- **Drill blocked / runbook gap:** Infrastructure on-call → Engineering Lead (Solo Builder, but only *after* the gap is logged — the point is to surface gaps, not paper over them).
- **Audit-chain break during the drill (P0):** Audit-mirror integrity-check on-call (separately routed per architecture §1.5).
- **Failed rollback — staging will not return to `SHA_base` (P0):** Trustee Panel chair on rota + Infrastructure on-call; follow `rollback.md` §3 (recovering from a failed rollback).

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-06-23 | _initial_ | BigDev (Solo Builder) | initial | n/a (checklist — the underlying `deploy.md`/`rollback.md` carry the sign-off) | execution rows land in `operational-readiness-ledger.md` on drill execution |
