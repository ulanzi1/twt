# ADR-0017: Local CI mirror (`pnpm ci:local` + pre-push hook) as sanctioned merge gate during GitHub Actions suspension

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** BigDev (Solo Builder), at Epic 1 retrospective AI-4 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session). Ratified as **interim policy** until GitHub Actions is restored — a successor ADR is required on restoration (Decision 2026-06-20-052). Logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Architecture commits a continuous enforcement model: every PR must pass the full gate cluster before merge. The 14 ci.yml jobs collectively constitute the enforcement floor — lint, typecheck, test, build, db-check, contracts-check, crypto-check, tokens-theme-check, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, and integration-tests (opt-in via `DATABASE_URL`).

During Stories 1.11–1.17 (approximately 2026-06-13 through 2026-06-17), the GitHub Actions account was placed under review and all workflow runs were suspended by the provider. Seven stories — including the entire 1.16x governance gate cluster and the Story 1.17 design-system foundation — were merged without cloud CI runs. This created a gap between the enforcement model ("the gates run on every PR") and the trust record ("we can demonstrate the gates ran").

The gap was mitigated immediately: `scripts/ci-local.sh` was authored (commit `480128e`) to mirror all 14 ci.yml jobs sequentially, and `.githooks/pre-push` was installed to run `pnpm ci:local` before every push. Stories 1.11–1.17 were subsequently reconciled green on 2026-06-17 via `ci:local`. The sprint-status.yaml ledger entry for 2026-06-17b records this explicitly.

This ADR adopts the `ci:local` + pre-push model as the sanctioned merge gate while GitHub Actions remains unavailable, back-attests the 2026-06-17 reconciliation, and records the residual hardening gaps (AI-5). Adoption is solo-builder-authored and operative immediately per project convention; formal `ratified` status (per the adr-index legend: ≥2-trustee sign-off) remains pending.

## Decision

**`pnpm ci:local` (via `scripts/ci-local.sh`) + `.githooks/pre-push` is the sanctioned merge gate while GitHub Actions is unavailable.** A green `ci:local` run is a valid substitute for a green GitHub Actions run; the sprint-status.yaml ledger is the per-story attestation record.

### 1. What `ci:local` runs

`scripts/ci-local.sh` invokes the exact command each ci.yml job runs, in order:

| Job | Command |
|---|---|
| lint | `pnpm turbo run lint` |
| typecheck | `pnpm turbo run typecheck` |
| build | `pnpm turbo run build` |
| test (unit) | `pnpm turbo run test` |
| db-check | `pnpm turbo run db:check` |
| contracts-check | `pnpm turbo run contracts:check-openapi-determinism` |
| crypto-check | `KMS_TEST_MODE=fake pnpm turbo run crypto:check` |
| tokens-theme-check | `pnpm turbo run tokens:check-theme-determinism` |
| pii-scrape | `pnpm turbo run contracts:check-pii-scrape` |
| friction-budget | `pnpm friction:test && pnpm friction:check` |
| schema-diff | `pnpm schema:test && pnpm schema:check` |
| benefit-mechanism | `pnpm benefit:test && pnpm benefit:check` |
| microcopy | `pnpm microcopy:test && pnpm microcopy:check` |
| integration-tests | `pnpm db:migrate && pnpm turbo run test --force --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue` _(opt-in: `DATABASE_URL` must be set to the twt-test-pg container on port 5433)_ |

A non-zero exit from any job fails the run and blocks the push.

> **Update 2026-06-24 (ADR-0025):** the `cadence-check` job was removed from this mirror when the AI-cadence instrument was retired — the list above is now 14 static jobs + `integration-tests`.

> **Update 2026-08-23 (AI-10-5, Epic-10 retrospective):** two amendments to the `test (unit)` row above — recorded here rather than silently absorbed into the table.
>
> **(a) `--concurrency=4`, pre-existing and previously undocumented.** It was added to both `test (unit)` and `integration-tests` in commit `23f7810` to stop cascading oversubscription timeouts, and the table above was never updated. This note closes that drift.
>
> **(b) `env -u DATABASE_URL` now prefixes `test (unit)`.** `ci:local` is invoked with `DATABASE_URL` exported for the whole run, which leaked into `test (unit)` and made every DB-gated spec execute — and commit rows — there, before `integration-tests` re-ran those same specs against the same database. Specs asserting exact counts on the fixed `PARIWAR_A` tenant then saw two passes' worth, so the gate could not report green on an unmodified tree. `ci.yml`'s `test` job sets no `DATABASE_URL`, so those specs skip in the cloud. The effective row is now `env -u DATABASE_URL pnpm turbo run test --concurrency=4`. No coverage is lost: every directory holding a DB-gated spec is already inside the `integration-tests` filter set.
>
> ⚠ Consequently, §1's framing — *"invokes the exact command each ci.yml job runs"* — is **no longer literally true**. The mirror is equivalent in **environment semantics**, not in command strings, and (b) is precisely the divergence that produces the equivalence. The ratified sentence is left byte-unchanged; this note is the amendment record.
>
> **(c) `integration-tests` moves from `--concurrency=4` to `--concurrency=1`, mirroring `ci.yml:984`.** Found during this change's review. The cloud job has carried `--concurrency=1` since 2026-08-04 with an explicit declaration that it **IS LOAD-BEARING, NOT A PERFORMANCE KNOB**: all eight filtered packages share one Postgres, several write the one global `audit_log_entries` chain via `writeAuditEntry`, and running them in parallel interleaves rows into the global sequence, breaking the chunk-walk specs' *"the rows I wrote are consecutive"* assumption. That note records the failure on **three consecutive `main` runs**, a different count-assertion spec each time, and instructs: *"Keep the two invocations in sync — a cap of 4 is NOT equivalent, it merely lowers the failure rate."* The mirror never adopted it, so it could not reproduce the cloud's failure — the precise sense in which it could not report green on an unmodified tree.
>
> **(d) A coverage guard now precedes the live-DB job.** Amendment (b) means a DB-gated spec in a package outside the `--filter` set would run in *neither* phase. The guard derives both sets from the tree at run time — never a hand-maintained list — and fails loudly if they diverge.
>
> ⛔ **Scope correction, recorded rather than silently absorbed.** The AI-10-5 split disposition (BigDev 2026-08-18) excluded `--concurrency=4` as a *recorded tax* on the stated grounds that *"no false-negative risk has ever been demonstrated."* Amendment (c) does not overturn that ruling — it observes that the ruling addressed **two different settings as if they were one**. `test (unit)`'s cap is a performance knob and **remains at 4, untouched, still a recorded tax**. `integration-tests`' is a correctness serialization requirement whose false-negative risk *had* been demonstrated and documented in `ci.yml` two weeks before the retrospective was authored. Ruled in scope by BigDev 2026-08-23 ([[feedback_supersede_never_reinterpret]] — the retrospective's text is **not** edited; this note is the correction record).

### 2. Pre-push hook enforcement

`.githooks/pre-push` runs `pnpm ci:local` before every push. The hook is activated via `git config core.hooksPath .githooks` (set at repo clone / onboarding). The bypass path `git push --no-verify` is an emergency escape only — its use must be justified in the subsequent commit message or sprint-status ledger entry.

### 3. Back-attestation: Stories 1.11–1.17

Stories 1.11–1.17 were merged without cloud CI. They were reconciled green on 2026-06-17 via `ci:local` (all 13 static jobs; integration-tests run separately with DATABASE_URL against twt-test-pg on :5433). The sprint-status.yaml `# last_updated: 2026-06-17a` ledger entry is the attestation record. No story in this range introduced a regression that `ci:local` would have caught; the enforcement model was satisfied retrospectively.

### 4. Attestation model going forward

Each story's sprint-status.yaml ledger entry must include a note confirming `ci:local` green (+ integration-tests when DATABASE_URL available) before the story is flipped to `done`. This is the per-story audit trail substitute for a GitHub Actions run URL.

### 5. Transition: restore GitHub Actions

When GitHub Actions is restored, this ADR is superseded by a successor entry that records the reinstatement and the transition from `ci:local` back to cloud CI as the primary gate. The `.githooks/pre-push` hook becomes a secondary local check (not the sole enforcement mechanism). The `ci:local` script is retained as a developer tool regardless.

## Alternatives considered

- **Merge with no gate (continue as-is without mitigation)** — Rejected. For an audit-first trust platform, "merged without the gates running" is an integrity gap. The substrate enforces rules; that enforcement requires the gates to run.
- **GitHub Actions `act` (local runner)** — Considered. `act` can run ci.yml jobs locally with Docker; it preserves the ci.yml source-of-truth. Rejected for this stopgap because: it requires Docker Desktop configuration, network-fetches runner images, and the `act`-vs-actual-runner environment divergence is harder to reason about than a direct command mirror. The direct command mirror (`ci:local`) is simpler and immediately trustworthy. Revisit if the GitHub Actions suspension extends beyond Epic 2.
- **Self-hosted GitHub Actions runner** — Considered. Adds infrastructure complexity (runner host, registration, secrets); the suspension is account-level and a self-hosted runner may also be blocked. Rejected for stopgap; revisit if suspension is prolonged.

## Consequences

- **Operational** — Every contributor must have `.githooks` activated (`git config core.hooksPath .githooks`). The onboarding runbook must document this. `--no-verify` pushes must be justified in the commit / ledger; unilateral use is a process violation.
- **Security** — The gate-ran status is now developer-attested (sprint-status ledger) rather than provider-attested (GitHub Actions audit log). This is a weaker trust signal; it is the best available alternative while the suspension persists.
- **Auditability gap** — No immutable third-party log that "the gates ran." The sprint-status ledger + ADR-0017 + the commit history collectively constitute the attestation. Trustee Panel should be informed of this posture at the next review.
- **Performance** — `ci:local` runs serially; a full static run takes ~3–5 minutes on a modern laptop. No parallelism between jobs (unlike GitHub Actions matrix). Acceptable as a stopgap.
- **Failure modes accepted** — A developer who bypasses the pre-push hook (`--no-verify`) and does not justify it in the ledger creates an un-attested merge. The AI-2 meta-fix (every commitment gets a gate) applies: the ledger entry IS the gate; skipping it is a process violation to be caught in code review.
- **Migration / pivot path** — GitHub Actions restoration triggers the successor ADR. Transition: (1) confirm Actions are running; (2) verify all ci.yml jobs pass on a test PR; (3) author the successor ADR ratifying the reinstatement; (4) downgrade `ci:local` + pre-push to a secondary/advisory role.

## References

- Commit `480128e` — `ci-local.sh` + pre-push hook authorship
- `scripts/ci-local.sh` — the local mirror script
- `.githooks/pre-push` — the enforcement hook
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — per-story attestation ledger
- `_bmad-output/implementation-artifacts/gate-inventory.md` (AI-9) — enforcement floor status table
- Epic 1 retrospective AI-4 + AI-5 — `epic-1-retro-2026-06-20.md`
- Decision 2026-06-20-052 — this ADR's decision-log entry
- Memory: [[project_ci_actions_suspension_local_mirror]]

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session as **interim policy** — discharges the "formal trustee ratification pending" caveat from the initial draft. **Sunset:** a successor ADR is required when GitHub Actions is restored (Decision 2026-06-20-052). `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-20 | (initial draft) | BigDev (Solo Builder) | Authored at Epic 1 retrospective AI-4 closure — adopts `ci:local` + pre-push as sanctioned merge gate (formal trustee ratification pending); back-attests 1.11–1.17 reconciliation green 2026-06-17; records AI-5 hardening gaps as open follow-ups |
