# ADR-0036: GitHub Actions reinstatement — cloud CI restored as primary merge gate; `ci:local` + pre-push downgraded to secondary

> **Status:** drafted
> **Date:** 2026-07-30 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** _pending — Trustee Panel presentation required per the ADR-0017 §5 transition plan_
> **Supersedes:** ADR-0017-local-ci-mirror-merge-gate
> **Superseded by:** —

## Context

ADR-0017 adopted `pnpm ci:local` (via `scripts/ci-local.sh`) + `.githooks/pre-push` as the sanctioned merge gate for the duration of a GitHub Actions account suspension that began during Stories 1.11–1.17 (~2026-06-13 through 2026-06-17). That ADR explicitly scoped itself as **interim policy** and pre-committed its own exit ramp (§5 "Transition: restore GitHub Actions"): (1) confirm Actions are running; (2) verify all ci.yml jobs pass on a test PR; (3) author the successor ADR ratifying the reinstatement; (4) downgrade `ci:local` + pre-push to a secondary/advisory role.

The account-level suspension has been lifted: `gh run list` confirms GitHub Actions runs resumed on `main` on 2026-07-29, after a gap running back to 2026-06-10. This ADR is authored 2026-07-30 to formalize the governance transition ADR-0017 §5 already pre-committed. Nothing inside the repository was disabled to effect the original suspension — `.github/workflows/ci.yml` retained its `pull_request`/`push` triggers on `main` and `release/*` throughout — so no workflow-trigger repair is required; the gap was purely at the GitHub provider/account layer. `scripts/ci-local.sh` mirrors the same 14 static jobs + `integration-tests` that `ci.yml` runs (per ADR-0017 §1, as updated by ADR-0025's `cadence-check` retirement), so the two paths were already command-identical; restoring Actions changes *which one is authoritative*, not what runs.

## Decision

**GitHub Actions is reinstated as the primary, sanctioned merge gate.** A green run of the `ci.yml` workflow on a PR is again the trust signal (provider-attested, per the ADR-0017 "Auditability gap" consequence this ADR now closes). `pnpm ci:local` + `.githooks/pre-push` are retained as a **secondary, local, pre-push developer check** — fast feedback before a push, not the sole enforcement mechanism — per the ADR-0017 §5 downgrade plan and the "`ci:local` script is retained as a developer tool regardless" commitment.

1. **Cloud CI is authoritative again.** Every PR must show a green `ci.yml` run before merge. The sprint-status.yaml per-story ledger entry continues to note `ci:local` green as a local pre-flight signal, but no longer substitutes for the cloud run.
2. **No workflow-file changes were needed.** `ci.yml`'s triggers, job list, and job commands are unchanged by this ADR — verified against the live file at reinstatement (2026-07-30).
3. **`.githooks/pre-push` remains active** as a fast local gate (catches failures before a push reaches GitHub), but `--no-verify` bypass is no longer the sole path to "no gate ran" risk — a failed local run that gets bypassed will still be caught by cloud CI on the PR.
4. **Verification step (ADR-0017 §5 item 2) — owner action required:** `gh run list` confirms Actions runs are resuming on `main`, but a full-jobs-green confirmation on an actual PR (install/lint/typecheck/build/test/db-check/contracts-check/crypto-check/tokens-theme-check/pii-scrape/friction-budget/schema-diff/benefit-mechanism/microcopy/integration-tests) has not yet been separately checked at ADR-authoring time. BigDev should confirm this on the next PR before treating ADR-0017's exit plan as fully discharged. Recorded as an open follow-up per the project's author-draft/ratify-later convention ([[feedback_record_unattested_no_backfill]] — not fabricated as already-run).
5. **Back-attestation is unaffected.** Stories 1.11–1.17 (and every story merged 2026-06-17 through 2026-07-30 under the ADR-0017 regime) keep their `ci:local`-green back-attestation; this ADR does not retroactively require a cloud-CI re-run for already-merged work.

## Alternatives considered

- **Treat `ci:local` as co-equal, permanent dual-gate (require both green cloud CI and green `ci:local` on every PR)** — Rejected as the steady-state policy: doubles CI wall-clock cost for no additional signal once cloud CI is trustworthy again, and re-introduces the exact ambiguity ("which one is the real gate?") ADR-0017 was written to avoid. `ci:local` remains available pre-push (item 3 above) without being mandatory in CI.
- **Immediately delete `scripts/ci-local.sh` and `.githooks/pre-push`** — Rejected. ADR-0017 §5 explicitly commits to retaining `ci:local` as a developer tool regardless of Actions status; it is also the fastest way to reproduce a CI failure locally without waiting on a cloud run.
- **Wait for a full trustee ratification session before treating Actions as primary** — Rejected as the *sequencing*, not the *substance*: per the ADR-0009/ADR-0022 author-draft/ratify-later precedent used throughout this project, the operational switch-back takes effect on author-commit (this ADR), with formal ≥2-trustee ratification following at the next Trustee Panel session, mirroring how ADR-0017 itself was adopted "operative immediately per project convention" ahead of its own ratification.

## Consequences

- **Operational** — No `.githooks` or CI-script changes required; contributors keep `git config core.hooksPath .githooks` as-is. The onboarding runbook's `ci:local` instructions remain valid as pre-push guidance.
- **Security** — Restores the provider-attested trust signal (GitHub Actions run log) that ADR-0017 flagged as a weakened, developer-attested-only signal during the suspension. Closes that ADR's named "Auditability gap" consequence.
- **Performance** — Cloud CI regains parallelism across jobs (vs. `ci-local.sh`'s serial ~3–5 minute run); PR feedback latency should improve for jobs that don't depend on each other.
- **Failure modes accepted** — Until the item-4 verification PR is run, there is a small residual risk that the restored account has a latent configuration drift (e.g., a secret, runner minutes cap, or branch-protection setting) not caught by this ADR. This is recorded, not silently assumed away.
- **Migration / pivot path** — If GitHub Actions is suspended again in the future, ADR-0017's `ci:local` + pre-push mechanism is the pre-built fallback — this ADR does not delete or deprecate that machinery, only changes which path is primary. A future re-suspension would re-invoke ADR-0017's model directly rather than requiring it to be re-authored.

## References

- `docs/adr/ADR-0017-local-ci-mirror-merge-gate.md` — the interim policy this ADR supersedes, including its own pre-committed §5 exit plan
- `.github/workflows/ci.yml` — unchanged triggers/job list, verified live at reinstatement
- `scripts/ci-local.sh` / `.githooks/pre-push` — retained as secondary developer tooling
- `_bmad-output/implementation-artifacts/gate-inventory.md` — Enforcement Floor Status table, updated alongside this ADR
- `docs/knowledge-transfer/adr-index.md` — Section A row for this ADR + the ADR-0017 row status flip
- `.decision-log.md` Decision 2026-07-30-069 — author-commit record for this reinstatement
- Memory: [[project_ci_actions_suspension_local_mirror]]
- Memory: [[feedback_record_unattested_no_backfill]] — governs the item-4 open-verification framing
- Memory: [[feedback_closure_language_precision]] — this ADR is "author-committed, verification pending," not "Closed by edit"

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-30 | (initial draft) | BigDev (Solo Builder) | Authored on report that the GitHub Actions account suspension is lifted; supersedes ADR-0017 per its own §5 transition plan; item-4 live-PR verification recorded as an open follow-up, not yet executed. |
