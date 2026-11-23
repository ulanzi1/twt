# ADR-0047: GitHub Actions is the primary merge gate again; `pnpm ci:local` and the pre-push hook become advisory (successor to ADR-0017)

> **Status:** drafted
> **Date:** 2026-11-23 (date entered current status)
> **Author:** BigDev (Solo Builder). Drafted by the session on BigDev's go-ahead: BigDev asked whether to cancel the mandatory `ci:local` run before every push ("it's waste of time"), the session recommended doing it through this successor ADR, and BigDev answered "yes do it" to the offer to draft this ADR and its decision-log entry. **Revised 2026-11-23 (decision `-497`) before reaching the Panel:** BigDev asked whether the Panel would know what a pre-push hook is; it would not, and PQ1 was the wrong question. PQ1 is now the plain question of what counts as proof the checks ran (below), and the hook's default is the author's choice, told to the Panel, ⛔ not asked. ⛔ BigDev has not sent the Panel note.
> **Ratifying trustees:** _pending_ — ⛔ no ratification is claimed.
> **Supersedes:** ADR-0017-local-ci-mirror-merge-gate — **on ratification only.** ADR-0017 stays `ratified` and byte-unchanged until then.
> **Superseded by:** —

## Context

ADR-0017 was ratified by the Trustee Panel as an **interim** policy, with its own end condition. Verbatim (its header): *"Ratified as **interim policy** until GitHub Actions is restored — a successor ADR is required on restoration (Decision 2026-06-20-052)."* Its Decision sentence: *"`pnpm ci:local` (via `scripts/ci-local.sh`) + `.githooks/pre-push` is the sanctioned merge gate while GitHub Actions is unavailable."* Its §5 and its migration path say what the successor must do:

> §5: *"When GitHub Actions is restored, this ADR is superseded by a successor entry that records the reinstatement and the transition from `ci:local` back to cloud CI as the primary gate. The `.githooks/pre-push` hook becomes a secondary local check (not the sole enforcement mechanism). The `ci:local` script is retained as a developer tool regardless."*
>
> Migration path: *"(1) confirm Actions are running; (2) verify all ci.yml jobs pass on a test PR; (3) author the successor ADR ratifying the reinstatement; (4) downgrade `ci:local` + pre-push to a secondary/advisory role."*

This ADR is that successor. It follows the four steps in order.

**Step 1 — Actions is running (checked live 2026-11-23, run results, not repository settings flags).** An earlier reinstatement attempt (2026-07-30) was reverted because the repository's "enabled" flags were true while zero runs existed; this check therefore reads runs only.
- `gh api repos/ulanzi1/twt/actions/runs --jq .total_count` → **813**.
- The most recent 400 `ci.yml` runs (2026-08-04 → 2026-11-23) are **351 success / 27 failure / 22 cancelled**, with runs in every month August–November (123 / 69 / 156 / 52). Both failures and successes are present, so the run log is not a rubber stamp.

**Step 2 — every `ci.yml` job passes on a PR (checked live 2026-11-23).**
- PR run `45169126164` (Story 3.15b, head `57f541b3…`): **41 of 41 jobs success**.
- The push of that same SHA to `main`, run `45172653375`: **41 of 41 jobs success**.
- `code-escrow-mirror` is a **separate workflow** (`code-escrow-mirror.yml`), not part of `ci.yml`; its red on every push to `main` (its secret is unset) is a pre-existing, unrelated condition and is not part of the gate defined here.

**Why the mandatory local run is now a cost without a matching benefit** (each point checkable):
- GitHub runs the same jobs on a fresh container on every non-docs-only PR and push to `main`. A `ci.yml` run takes about 22–30 minutes wall-clock (run `45172653375`: 12:15:59 → 12:38:16 UTC; run `45142550627`: 08:55:36 → 09:25:18 UTC).
- The local mirror is not a byte-for-byte copy and has drifted before: ADR-0017 §1's own 2026-08-23 amendments record that the mirror did not mirror `ci.yml`'s `integration-tests` concurrency, so it "could not reproduce the cloud's failure", and that `test (unit)` needed `env -u DATABASE_URL` to stop double-counting.
- The mirror produces reds the record itself attributes to the local run, not to the change. Since 2026-11-07, the records of five stories name one: a load timeout in files the story did not touch, green when run alone, or a known local-database failure — `12b49b14` (13.1c), `31f1938e` (13.1g), `133a70bc` / `366605e1` (13.1f), `5e9171c1` (14.3, "a different unrelated unit flake each time"), `685a09b8` (6.39, known failure #18 on a reused database). That is the records' own attribution; ⛔ it was not re-run for this ADR. (Story 3.15's `9f2ccb0f` is ⛔ not counted: its red was a flaky wait in a test file the story itself wrote, fixed in the story's own previous commit.)
- The hook already skips docs-only pushes and already-pushed fast-forwards (BigDev 2026-10-12), so what remains is the cost on every code push.
- The ADR-0017 performance line ("~3–5 minutes", written at 14 jobs) is out of date: the gate is now 41 jobs. ⛔ The current local duration was not re-measured for this ADR.
- The repository is public (`gh repo view` → `PUBLIC`); a red push costs wall-clock time, not money. (GitHub's free standard-runner minutes for public repositories are provider policy, not re-checked here.)

**What does not change, stated so it is not lost.** `main` is protected (`gh api repos/ulanzi1/twt/branches/main/protection`, 2026-11-23) against force-push, deletion and non-linear history, with `enforce_admins` on. It has ⛔ **no required status checks, ⛔ no required reviews and ⛔ no push restrictions.** Stories land by pushing the PR tip to `main` as a fast-forward (SHAs unchanged). So the rule "land only on a green PR run" has never been enforced by the provider: ADR-0017's hook was per-clone and bypassable, and the landing condition was and remains a discipline. This ADR does not change that; it states the condition (cl.1) and leaves enforcement as a separate, named question (alternative D).

The architecture's enforcement model (ADR-0017 Context: *"every PR must pass the full gate cluster before merge"*) is the property this ADR serves; this ADR records the control that carries it now.

## Decision

**GitHub Actions' `ci.yml` is the primary merge gate. `pnpm ci:local` is retained as an advisory developer tool, and the pre-push hook no longer runs it by default.**

1. **cl.1 — primary gate.** A story lands on `main` only when `ci.yml`'s run for the PR, at the exact tip SHA being landed, has concluded `success` (all jobs). Landing is a fast-forward, so the PR run's SHA is the SHA on `main`. A change that `ci.yml`'s `paths` filter skips (documentation only, bar the gate-read files) runs no CI and needs none — unchanged.
2. **cl.2 — attestation.** ADR-0017 §4 is replaced. A story's ledger line cites the GitHub Actions run — run id, tip SHA, jobs passed over jobs total — for the PR run and for the push to `main`. A `ci:local` result may be cited when one was run; it is **not required**, and its absence is **not** a process violation. This replaces developer-attested evidence with provider-attested evidence, which narrows the "Auditability gap" ADR-0017's Consequences named (*"No immutable third-party log that 'the gates ran.'"*) for every story that cites a run id.
3. **cl.3 — `ci:local` stays, as advice.** `pnpm ci:local` and `scripts/ci-local.sh` remain. It is recommended, not required, before pushing: a database migration, an edit to a gate script under `scripts/`, an edit to `.github/workflows/ci.yml` or to `scripts/ci-local.sh` itself (the drift class above), or anything whose failure the author would rather learn in minutes than wait ~25 minutes for.
4. **cl.4 — the pre-push hook is off by default (the author's choice; the Panel is told, ⛔ not asked).** `.githooks/pre-push` stops running `ci:local` unless the author asks for it. The hook mechanism (for example an opt-in variable) is **not decided here** and is a separate change. **This narrows ADR-0017 §5's literal sentence**, *"The `.githooks/pre-push` hook becomes a secondary local check"*, which can be read as a hook that still runs and still blocks, and migration step (4)'s *"secondary/advisory role"*, which can be read as one that does not block. Because the ratified text reads two ways, this ADR **supersedes the sentence explicitly** instead of reading it either way. The sentence falls only if the Panel ratifies this ADR as a whole, and the Panel note tells them so in plain words (§0 of the Panel template: the governance half is ruled, the engineering half is built, and the note says it has been split). ⛔ **No Panel delegation of the hook's mechanics was found**, so none is claimed.
5. **cl.5 — bypass wording.** ADR-0017 §2's *"`--no-verify` … is an emergency escape only — its use must be justified"* has nothing left to govern once cl.4 is in force, and is superseded with it.
6. **cl.6 — return path.** If `ci.yml` runs stop appearing for pushed non-docs-only PRs (the 2026-06 and 2026-07-30 pattern), the local gate returns by BigDev turning the hook back on, recording the date and the evidence (a PR head SHA with no run, and `gh api …/actions/runs` showing no new run) in the ledger line. Re-adopting a local gate as **policy** is a new ADR, as ADR-0017 was.

**Interim, until ratified.** ADR-0017 stays `ratified`. Its §2 and §4 literally stand until the Panel rules; a push that skips `ci:local` says so where §2 says to (the commit or the ledger line), including why. Drafting this ADR waives nothing in ADR-0017.

**PQ1 — the one question put to the Panel, in plain words.** *"Do you accept the record that GitHub keeps of the 41 automated checks as the proof that they ran, in place of the developer's own written note?"* Option A: yes (our reading). Option B: no, keep the June arrangement. It decides **cl.2** (which supersedes ADR-0017 §4, a ratified clause) and with it the evidence cl.1 relies on. The note is `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-23-checks-proof-github-record.md` — written, ⛔ **not sent**, and ⛔ not "shown to the Panel" until BigDev sends it. cl.3–5 (the hook and `ci:local`) are the author's engineering half and are *told* in that note, ⛔ not asked. **If the answer is A, the same note also asks two trustees to sign this ADR off.** A ruling on PQ1 alone does not make it `ratified`; the sign-off is its own step (Decision 2026-11-23-498), and the On-ratification list below is carried by roster Row 56.

## Alternatives considered

- **A — keep the hook mandatory (status quo; ADR-0017 §5 read literally).** Rejected for the author's proposal: ADR-0017's own end condition has been met; GitHub runs the same jobs on a fresh container; and the recorded cost is repeated load reds in untouched files. Residual risk: a red tip is found on GitHub in about 25 minutes instead of earlier on the author's machine. **This is close to option B of PQ1's plain question (keep the June arrangement, the developer's note as the proof), so it is stated in full.**
- **B — keep the hook running but warn-only.** Rejected: the same time cost with no gate, and a warning nobody is blocked by.
- **C — a fast subset in the hook (lint and typecheck only).** Deferred, not rejected. Of the 27 failed `ci.yml` runs in the window above, the failing job was `integration-tests` in 17 (11 PR runs, 6 pushes) and `test` in 8 (7 pushes, 1 PR); `lint` alone failed 1, and `crypto-check` with `typecheck` failed 1. So a lint-and-typecheck subset would have named at most 2 of the 27. The failures that dominate are in the two jobs where the local mirror is slowest and, per the records above, flakiest. ⛔ This does not say whether `ci:local` was run on those pushes, or what it reported. Named trigger: lint- or typecheck-class reds on GitHub become frequent.
- **D — required status checks on `main`.** Deferred, not rejected. It would make cl.1 provider-enforced. ⛔ Whether a branch with required checks accepts this repo's fast-forward landing push (`git push origin <tip>:main`, with linear history required and `enforce_admins` on) has **not been tested**; test it on a throwaway repository before any decision. Named trigger: the first time a red tip reaches `main` through a skipped or misread PR run.
- **E — `act` or a self-hosted runner.** Not reconsidered: ADR-0017 rejected both for a suspension that has ended.

## Consequences

- **Operational** — The pre-push hook's default changes (separate change). ADR-0017 Consequences' *"Every contributor must have `.githooks` activated"* no longer applies. Story ledger and landing-record wording changes from "ci:local N/N" to the run id and job count. The `ci:local` mirror still has to be kept in step with `ci.yml` for as long as it exists (ADR-0017's drift note stands).
- **Security** — Gate evidence becomes provider-attested again for every story that cites a run id.
- **Performance** — No local wait by default. A code push's feedback arrives from GitHub in about 22–30 minutes (measured above); ⛔ the local figure was not re-measured.
- **Cost** — None in money (public repository). The cost moves from the author's laptop to GitHub's wall-clock.
- **Failure modes accepted** — (1) cl.1 is discipline, not provider enforcement (alternative D). (2) GitHub CI is not flake-free: run `44889919025` failed the `test` job on a push to `main` (2026-11-21) and the next `main` run, `44909175460`, passed; the cause was ⛔ not investigated here. (3) GitHub can withhold runs again (cl.6).
- **Migration / pivot path** — Trigger: no `ci.yml` run for a pushed non-docs-only PR head. Steps: cl.6. Re-adopting a local gate as policy is a new ADR.

## On ratification, apply (⛔ none of this is applied by drafting)

1. ADR-0017: `Status: superseded`, `Superseded by:` this ADR, a Changelog row (byte-unchanged until then).
2. `docs/knowledge-transfer/adr-index.md`: the ADR-0017 row `ratified` → `superseded`; this ADR's row `drafted` → `ratified`; counts RE-COUNTED with `grep -cE '^\| ADR-'`, not added.
3. `.githooks/pre-push` (header and default) and the header of `scripts/ci-local.sh` (it still reads "Stopgap while GitHub Actions is unavailable").
4. `_bmad-output/implementation-artifacts/gate-inventory.md` lines 13–16 and 112, which still read "GitHub Actions … Suspended" and "`ci:local` + pre-push — Active as merge gate". They are already stale against the live run log above; they should be corrected with this change.
5. A decision-log entry recording the Panel's ruling on PQ1, then the `decision-flow-sync` skill for `docs/governance/decision-flow-end-to-end.md` (line 193 is conditional and stays true).
6. Re-run the Step 1 live check at ratification time. Provider state flips, and a note written today can be wrong by then.

## References

- ADR-0017-local-ci-mirror-merge-gate — the predecessor; §1 amendments (drift), §2, §4, §5, Consequences, Migration path
- Decision 2026-06-20-052 (successor ADR required on restoration); Decision 2026-06-21-059 (ratification as interim policy)
- Decision 2026-11-23-496 — this ADR's decision-log entry (author-commit, ⛔ not ratified); Decision 2026-11-23-497 — amends `-496`'s PQ1 (plain question; the hook is the author's choice, told)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-23-checks-proof-github-record.md` — the Panel note for PQ1 and the conditional sign-off ask (written, ⛔ not sent)
- Decision 2026-11-23-498 — the sign-off ask and roster Row 56; `docs/launch-gate-inventory/inventory-roster.md` Row 56 `adr-0047-checks-proof-ratified-and-applied` — carries the On-ratification list
- `.github/workflows/ci.yml` (`on.paths`, 41 jobs); `.github/workflows/code-escrow-mirror.yml`; `.githooks/pre-push`; `scripts/ci-local.sh`
- `_bmad-output/implementation-artifacts/gate-inventory.md` — stale "Suspended" rows (above)
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-11-23 | (revision, still `drafted`) | BigDev (Solo Builder), revised by the session | The Panel note also asks two trustees to sign this ADR off if the answer to PQ1 is A (a PQ1 ruling alone does not ratify it); the On-ratification list is carried by roster Row 56. `.decision-log.md` Decision 2026-11-23-498. ⛔ Still `drafted`, ⛔ not sent. |
| 2026-11-23 | (revision, still `drafted`) | BigDev (Solo Builder), revised by the session | PQ1 reworded as the plain question "do you accept GitHub's record as the proof the checks ran" (decides cl.2); cl.4 (the hook's default) recorded as the author's engineering choice, told to the Panel and ⛔ not asked; ⛔ no delegation claimed. Panel note written, ⛔ not sent. `.decision-log.md` Decision 2026-11-23-497. |
| 2026-11-23 | (initial draft) | BigDev (Solo Builder), drafted by the session | Successor to ADR-0017 per its §5 and migration path; steps 1–2 checked live 2026-11-23 (813 runs; 41/41 on PR run `45169126164` and `main` run `45172653375`). `drafted`, ⛔ not ratified; one open Panel question (PQ1: cl.4, hook default off vs ADR-0017 §5 read literally). `.decision-log.md` Decision 2026-11-23-496. |
