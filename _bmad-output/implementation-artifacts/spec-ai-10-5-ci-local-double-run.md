---
title: 'AI-10-5 — ci:local double-run: restore `test (unit)` parity with ci.yml'
type: 'bugfix'
created: '2026-08-23'
status: 'done' # draft | ready-for-dev | in-progress | in-review | done
baseline_commit: 'c44c042b5e4205eacd60bd55bf8f207a3803765d'
context:
  - '{project-root}/docs/adr/ADR-0017-local-ci-mirror-merge-gate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `scripts/ci-local.sh` is invoked with `DATABASE_URL` exported for the whole run, so the
`test (unit)` job's DB-gated specs (`describe.skipIf(!hasDatabase)`) execute **and commit rows**, and
then `integration-tests` re-runs those same specs against the same database. Specs asserting exact
counts on the fixed `PARIWAR_A` tenant see two passes' worth, so the sanctioned merge gate cannot
report green on an unmodified tree. The cloud job never had this defect: `ci.yml`'s `test` job sets no
`DATABASE_URL` at all, so the same specs skip there.

**Approach:** Strip `DATABASE_URL` from that one job's environment so the DB-gated specs skip in the
unit phase exactly as they do in the cloud. This restores the mirror's defining property at the level
that matters — **CI-equivalent environment semantics** — while deliberately giving up byte-identical
command strings: `env -u` is precisely the divergence that makes the semantics equivalent. Record the
amendment as a dated update note in ADR-0017 §1, whose ratified command table this line mirrors.

## Boundaries & Constraints

**Always:** `ci-local.sh` mirrors `ci.yml` at the level of **environment semantics**, not byte-identical
command strings — a green run here must still mean a green run there. Any change to a mirrored job's
command carries a dated update note into ADR-0017 §1 (in-file precedent: the 2026-06-24 / ADR-0025
note). Every DB-gated spec must still run exactly once per full invocation. Any remaining failure in a
shared-`PARIWAR_A` count assertion is classified as the separately routed shared-tenant/concurrency
defect and does **not** expand AI-10-5's scope.

**Ask First:** Any change that would remove a spec from `ci:local` coverage entirely. Any edit to
ADR-0017 beyond a dated §1 update note — it is trustee-ratified. Authoring the §5 successor ADR.

**Never:** Touch **`test (unit)`'s** `--concurrency=4` — a *performance* cap, ruled a recorded tax and
out of AI-10-5's scope (BigDev 2026-08-18, split disposition). ⚠ **AMENDED BigDev 2026-08-23, renegotiated
in review:** this originally read *"in either job."* That conflated two different settings —
`integration-tests`' concurrency is a **correctness serialization requirement** that `ci.yml:972-984`
declares load-bearing, with three demonstrated main-run failures predating the retro. Syncing it to
`--concurrency=1` is now IN scope. Never add a second database or a maintained glob list — a set DERIVED
from the tree at run time is not a glob list.
Never edit the shared-`PARIWAR_A` count-assertion specs; they belong to their owners. Never modify
`.github/workflows/ci.yml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mirror parity (happy path) | `DATABASE_URL` exported, full `pnpm ci:local` | `test (unit)` reports DB-gated specs **skipped**; `integration-tests` runs them **once** | N/A |
| Static-only run | No `DATABASE_URL` | Unchanged from today: DB specs skip, `integration-tests` not run at all | N/A |
| Accumulated dirty DB | Test DB already carrying prior runs' `PARIWAR_A` rows | Single-pass green is restored, but a long-accumulated DB may still fail — that is the separate accumulation class, not this defect | Report honestly; do not re-scope |
| Coverage regression | A DB-gated spec outside the 8-package integration filter | Would silently stop running anywhere — HALT | Verified zero such specs exist at this HEAD; re-verify before landing |

</frozen-after-approval>

## Code Map

- `scripts/ci-local.sh:47` -- the `test (unit)` job; the single line to change
- `scripts/ci-local.sh:80` -- `integration-tests`; re-runs the same 8 packages with `--force`
- `.github/workflows/ci.yml:74-98` -- cloud `test` job; sets **no** `DATABASE_URL` — the parity target
- `.github/workflows/ci.yml:913-953` -- cloud `integration-tests`; own ephemeral postgres service
- `turbo.json` -- `test` task declares `env: ["DATABASE_URL"]`, so unsetting propagates and re-keys the hash
- `docs/adr/ADR-0017-local-ci-mirror-merge-gate.md` §1 -- ratified table; row `test (unit)` → `pnpm turbo run test`

## Tasks & Acceptance

**Execution:**
- [x] `scripts/ci-local.sh` -- wrap the `test (unit)` command in `env -u DATABASE_URL`, with a comment naming AI-10-5 and the ci.yml parity rationale -- the fix
- [x] `scripts/ci-local.sh:7-9` -- amend the header docblock: "invokes the exact command its `ci.yml` counterpart runs" becomes false the moment `env -u` lands -- a stale comment contradicting the line beneath it
- [x] `scripts/ci-local.sh` -- re-verify the 8 DB-gated directories still equal the `integration-tests` filter set before landing -- proves zero coverage loss
- [x] `docs/adr/ADR-0017-local-ci-mirror-merge-gate.md` -- dated update note under §1 recording this change **and** the pre-existing undocumented `--concurrency=4` drift -- a recorded amendment, never a silent rewrite
- [x] `scripts/ci-local.sh` -- sync `integration-tests` to `--concurrency=1` to match `ci.yml:984` -- the cloud declares it load-bearing for correctness; the mirror ran at 4 and could not reproduce the cloud's failure
- [x] `scripts/ci-local.sh` -- add the AI-10-5 coverage guard (both sets DERIVED) before the integration job -- the fix creates a silent-coverage-loss mode that must not rest on a one-time manual check
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- route what this fix does NOT close: the shared-`PARIWAR_A` count assertions, the cross-day accumulation class, the now-owed ADR-0017 §5 successor, and the failing `code-escrow-mirror` workflow -- observed here, owned elsewhere

**Acceptance Criteria:**
- Given `DATABASE_URL` is exported, when `pnpm ci:local` runs, then each DB-gated spec executes exactly **once** across the whole invocation.
- Given a freshly recreated `twt-test-pg`, when the full `pnpm ci:local` runs, then the `test (unit)` phase does not execute the DB-gated specs, and each DB-gated spec is exercised exactly once by `integration-tests`.
- Given no `DATABASE_URL`, when `pnpm ci:local` runs, then behavior is byte-identical to today.
- Given the change has landed, when ADR-0017 §1 is read, then it carries a dated note recording both amendments, while the ratified table row itself stays byte-unchanged ([[feedback_supersede_never_reinterpret]]).
- Given the change has landed, when the two `run` lines are inspected, then `test (unit)` still runs `--concurrency=4` and `integration-tests` runs `--concurrency=1`.
- Given `ci-local.sh`'s `integration-tests` line is compared to `ci.yml:984`, then both run `--concurrency=1`.
- Given a package holding a DB-gated spec is absent from the `--filter` set, when `pnpm ci:local` runs with `DATABASE_URL`, then the coverage guard fails the run and names the missing package.

## Spec Change Log

**2026-08-23 — iteration 1, `intent_gap` resolved by human renegotiation (not a loopback).**
*Triggering finding:* review found `ci-local.sh`'s `integration-tests` running `--concurrency=4` where
`ci.yml:984` runs `--concurrency=1` and declares it **load-bearing for correctness**, citing three
consecutive main-run failures observed 2026-08-04 — two weeks *before* the 2026-08-18 retrospective that
excluded concurrency on the stated grounds that *"no false-negative risk has ever been demonstrated."*
*Amended:* the frozen `Never` (by BigDev, 2026-08-23) to scope the exclusion to `test (unit)`'s cap only;
added two tasks, three ACs, one corrected AC.
*Known-bad state avoided:* shipping a fix whose stated goal is "the gate can report green on an unmodified
tree" while leaving in place the very divergence that stops it doing so.
*Code was NOT reverted* — the `env -u` change was independently verified before the gap was found and is
not what the gap concerns; reverting would have destroyed working evidence.
**KEEP:** the derived-not-hand-listed shape of the coverage guard; the two-settings-are-different-things
distinction; ADR-0017's ratified prose left byte-unchanged with the amendment carried in a dated note.

## Design Notes

Zero-coverage-loss proof — DB-gated specs (`grep -rl DATABASE_URL` over spec/test files) resolve to
exactly: `apps/api`, `apps/jobs`, `packages/channels`, `packages/domain`, `packages/events`,
`packages/niyamavali-engine`, `packages/queue`, `packages/validity-service` — identical to the
`integration-tests` filter set. This equality is the load-bearing precondition; if it ever breaks, the
fix starts hiding tests. That is why re-verifying it is its own task, not a footnote.

```bash
run "test (unit)"  "env -u DATABASE_URL pnpm turbo run test --concurrency=4"
```

`env -u` is preferred over a subshell `unset` because it scopes the removal to this one command
without disturbing the `run` helper's `eval` or the exported value the later job still needs. This is
also the one line where the mirror stops being command-identical to `ci.yml` and becomes
environment-equivalent instead — the header docblock must say so, or the next reader will read the
divergence as drift.

## Verification

**Commands:**
- `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local` -- expected: every job green in one pass on a recreated DB
- `grep -n 'run "test (unit)"\|run "integration-tests"' scripts/ci-local.sh | grep -o 'concurrency=[0-9]'` -- expected: `concurrency=4` then `concurrency=1`, in that order (a file-wide grep would also count comment mentions and is NOT the invariant)
- `git diff --stat` -- expected: `ci-local.sh` + ADR-0017 + deferred-work.md only; zero files under `packages/` or `apps/`

**Manual checks (if no CLI):**
- `test (unit)` job output names the DB-gated suites as skipped, not passed.

## Suggested Review Order

**The fix itself — execution topology**

- The one line AI-10-5 was scoped to: strips the leaked variable so DB-gated specs skip here.
  [`ci-local.sh:61`](../../scripts/ci-local.sh#L61)

- Why it works: `ci.yml`'s cloud `test` job sets no `DATABASE_URL`, so those specs already skip there.
  [`ci.yml:74`](../../.github/workflows/ci.yml#L74)

**The finding review surfaced — correctness, not performance**

- Synced to the cloud's load-bearing cap; a cap of 4 only lowers the failure rate.
  [`ci-local.sh:127`](../../scripts/ci-local.sh#L127)

- The cloud's own declaration, and the three main-run failures that predate the retrospective.
  [`ci.yml:972`](../../.github/workflows/ci.yml#L972)

**The new failure mode, mechanized**

- Both sets derived from the tree, never hand-listed; fails loudly rather than testing less.
  [`ci-local.sh:96`](../../scripts/ci-local.sh#L96)

**Governance record**

- Dated amendment note; the ratified §1 table row stays byte-unchanged.
  [`ADR-0017:49`](../../docs/adr/ADR-0017-local-ci-mirror-merge-gate.md#L49)

- The retro-premise correction, recorded without editing the retrospective.
  [`deferred-work.md:6399`](./deferred-work.md#L6399)

- Four items this fix observes but does not close.
  [`deferred-work.md:6387`](./deferred-work.md#L6387)

**Peripheral**

- Header now claims semantics-equivalence, not command-identity; divergences annotated at their line.
  [`ci-local.sh:7`](../../scripts/ci-local.sh#L7)
