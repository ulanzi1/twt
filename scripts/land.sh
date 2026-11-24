#!/usr/bin/env bash
#
# land.sh — land a pull request's tip on `main` by FAST-FORWARD, but only if the landing conditions hold.
#
# ADR-0047 cl.1: a story lands on `main` only when `ci.yml`'s run for the PR, at the EXACT tip SHA being landed, concluded
# `success` (all jobs). GitHub does not enforce that — `main` has no required status checks (ADR-0047 alternative D: tested,
# not enabled, because a docs-only tip runs no CI and would be rejected) — so this script is the mechanism. It checks, then
# pushes `<tip>:main`. It never force-pushes, never rebases or merges, and never pushes anything but the PR's own head SHA.
#
# Usage:   scripts/land.sh [--dry-run] <pr-number>
#            --dry-run   run every check and print the verdict; push nothing
# Exit:    0  landed (or, with --dry-run, every check passed)
#          1  a check failed, or the push was refused — nothing was landed
#          2  usage or environment error (no gh, no such PR, fetch failed)
#
# The checks — each is printed with its evidence, and ALL are run even after one fails, so one run shows everything:
#   1  the PR is OPEN and targets main
#   2  `ci.yml`'s newest pull_request run for the PR head SHA is completed, `success`, with every job success or skipped.
#      When that SHA has NO run at all, the change must be docs-only — the same rule as `.githooks/pre-push` and the `paths`
#      filter at the top of `.github/workflows/ci.yml` (keep the three in lockstep): CI skips a docs-only change by design.
#   3  origin/main is an ancestor of the tip — a clean fast-forward (main requires linear history; no rebase, no merge commit)
#   4  no `ci.yml` run is in progress on main. ci.yml's concurrency group cancels an in-progress run for the same ref when a
#      newer push arrives, so landing now would throw away the previous landing's evidence. Wait for it to finish.
#   5  ADVISORY, never blocks: the newest FINISHED ci.yml run on main. When it is not `success` the script says so (run id,
#      commit, conclusion) and goes on: a red main run is often a flake (the same commit was green on its PR run), and a
#      block would stop every landing until some other run happened to pass. Look at it, re-run it, or fix the flake.
#
# Not covered: a direct push of a docs-only commit that has no PR (a records commit) — those stay a plain `git push`.
# `code-escrow-mirror` is a separate workflow, not part of this gate.

WORKFLOW=ci.yml
BASE=main
# the docs-only rule — IDENTICAL to DOCS / GATE_INPUTS in .githooks/pre-push
DOCS_RE='(\.md$|^_bmad-output/|^docs/)'
GATE_INPUTS_RE='^(\.decision-log\.md|friction-budget\.md|docs/launch-gate-inventory/.*)$'

FAILED=0
pass() { printf '  ✓ %s\n' "$*"; }
fail() { FAILED=1; printf '  ✗ %s\n' "$*"; }
warn() { printf '  ! %s\n' "$*"; }
die() { printf '[land] %s\n' "$*" >&2; exit 2; }

usage() { sed -n '3,28p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# ── the gh queries, as functions so they can be run (and tested) on their own ────────────────────────────────────────
pr_info() { # PR -> "STATE<TAB>BASE<TAB>TIP<TAB>HEADREF"
  gh pr view "$1" --json state,baseRefName,headRefOid,headRefName --jq '[.state,.baseRefName,.headRefOid,.headRefName]|@tsv'
}
ci_run_for() { # TIP -> id of the newest pull_request run of ci.yml at exactly that SHA, or nothing
  gh run list --workflow "$WORKFLOW" --commit "$1" --event pull_request --limit 1 --json databaseId --jq '.[0].databaseId // empty'
}
run_summary() { # RUN ID -> "STATUS<TAB>CONCLUSION<TAB>HEADSHA<TAB>OK<TAB>TOTAL"  (OK = jobs that are success or skipped)
  gh run view "$1" --json status,conclusion,headSha,jobs \
    --jq '[.status,.conclusion,.headSha,([.jobs[]|select(.conclusion=="success" or .conclusion=="skipped")]|length),(.jobs|length)]|@tsv'
}
main_runs_in_progress() { # -> how many ci.yml runs on main are not completed
  gh run list --workflow "$WORKFLOW" --branch "$BASE" --limit 10 --json status --jq '[.[]|select(.status!="completed")]|length'
}

main_last_finished() { # -> "ID<TAB>CONCLUSION<TAB>HEADSHA" of the newest ci.yml run on main that has finished, or nothing
  gh run list --workflow "$WORKFLOW" --branch "$BASE" --limit 10 --json databaseId,status,conclusion,headSha \
    --jq '([.[]|select(.status=="completed")][0] // empty)|[.databaseId,.conclusion,.headSha]|@tsv'
}

docs_only() { # TIP -> 0 if every file the PR changes vs main is documentation (and none is a file a gate reads)
  local base files
  base=$(git merge-base "origin/$BASE" "$1") || return 1
  files=$(git diff --name-only "$base" "$1") || return 1
  [ -n "$files" ] || return 1
  printf '%s\n' "$files" | grep -Eq "$GATE_INPUTS_RE" && return 1
  printf '%s\n' "$files" | grep -Evq "$DOCS_RE" && return 1
  return 0
}

main() {
  set -euo pipefail
  local dry=0 pr="" a
  for a in "$@"; do
    case "$a" in
      --dry-run) dry=1 ;;
      -h | --help) usage; exit 0 ;;
      -*) die "unknown option: $a (usage: scripts/land.sh [--dry-run] <pr-number>; --help lists the checks)" ;;
      *) if [ -z "$pr" ]; then pr="$a"; else die "one PR number only"; fi ;;
    esac
  done
  case "$pr" in '' | *[!0-9]*) die "give a PR number (usage: scripts/land.sh [--dry-run] <pr-number>; --help lists the checks)" ;; esac
  command -v gh > /dev/null 2>&1 || die "gh (GitHub CLI) not found"
  cd "$(git rev-parse --show-toplevel)" || die "not inside a git checkout"
  git fetch origin --prune --quiet || die "git fetch origin failed"

  local info state base tip headref
  info=$(pr_info "$pr") || die "cannot read PR #$pr"
  IFS=$'\t' read -r state base tip headref <<< "$info"
  [ -n "$tip" ] || die "PR #$pr has no head commit"
  printf '[land] PR #%s (%s) — tip %s → %s%s\n' "$pr" "$headref" "${tip:0:8}" "$BASE" "$([ "$dry" = 1 ] && echo '  [dry run]')"

  # the tip must be here to be pushed
  if ! git cat-file -e "$tip^{commit}" 2> /dev/null; then git fetch origin "pull/$pr/head" --quiet || true; fi
  git cat-file -e "$tip^{commit}" 2> /dev/null || die "the tip ${tip:0:8} is not available locally (fetch of pull/$pr/head failed)"

  # 1 — the PR
  if [ "$state" = OPEN ] && [ "$base" = "$BASE" ]; then pass "the PR is OPEN and targets $BASE"
  else fail "the PR is $state and targets $base (need OPEN, targeting $BASE)"; fi

  # 2 — the CI run at exactly this tip
  local run st concl sha ok total
  run=$(ci_run_for "$tip" || true)
  if [ -n "$run" ]; then
    IFS=$'\t' read -r st concl sha ok total <<< "$(run_summary "$run")"
    if [ "$st" = completed ] && [ "$concl" = success ] && [ "$sha" = "$tip" ] && [ "${total:-0}" -gt 0 ] && [ "$ok" = "$total" ]; then
      pass "$WORKFLOW run $run: success, $ok/$total jobs, on exactly ${tip:0:8}"
    else
      fail "$WORKFLOW run $run: status=$st conclusion=$concl head=${sha:0:8} jobs ok ${ok:-?}/${total:-?} (need completed, success, head ${tip:0:8}, every job ok)"
    fi
  elif docs_only "$tip"; then
    pass "no $WORKFLOW run for ${tip:0:8}, and none is expected: the change is docs-only (the paths filter skips it)"
  else
    fail "no $WORKFLOW run for ${tip:0:8}, and the change is not docs-only — push the branch and let CI run"
  fi

  # 3 — a clean fast-forward
  if git merge-base --is-ancestor "$tip" "origin/$BASE"; then
    fail "the tip ${tip:0:8} is already on $BASE (origin/$BASE is $(git rev-parse --short "origin/$BASE")) — nothing to land"
  elif git merge-base --is-ancestor "origin/$BASE" "$tip"; then
    pass "origin/$BASE ($(git rev-parse --short "origin/$BASE")) is an ancestor of the tip: a clean fast-forward of $(git rev-list --count "origin/$BASE..$tip") commit(s)"
  else
    fail "the branch has diverged from origin/$BASE ($(git rev-parse --short "origin/$BASE")): $BASE has commits the tip lacks — rebase the branch (new SHAs, so CI must run again)"
  fi

  # 4 — landing now must not cancel the previous landing's run
  local busy; busy=$(main_runs_in_progress) || die "cannot read the $WORKFLOW runs on $BASE"
  if [ "$busy" = 0 ]; then pass "no $WORKFLOW run is in progress on $BASE"
  else fail "$busy $WORKFLOW run(s) in progress on $BASE — a push now would cancel them; wait for them to finish"; fi

  # 5 — advisory: how the newest finished run on main ended. It never changes the verdict.
  local lrun lconcl lsha last
  last=$(main_last_finished || true)
  if [ -z "$last" ]; then warn "could not read the newest finished $WORKFLOW run on $BASE — look at it yourself"
  else
    IFS=$'\t' read -r lrun lconcl lsha <<< "$last"
    if [ "$lconcl" = success ]; then pass "the newest finished $WORKFLOW run on $BASE ($lrun, ${lsha:0:8}) succeeded"
    else warn "the newest finished $WORKFLOW run on $BASE ($lrun, ${lsha:0:8}) is $lconcl, not success — landing goes on (advisory), but look at it: is it a flake? re-run it, or fix it"; fi
  fi

  if [ "$FAILED" != 0 ]; then printf '[land] NOT landing — a check failed.\n'; exit 1; fi
  if [ "$dry" = 1 ]; then printf '[land] dry run: every check passed; nothing pushed.\n'; exit 0; fi

  # the one push: the PR's own head SHA, as a fast-forward, with no force
  printf '[land] pushing %s:%s …\n' "${tip:0:8}" "$BASE"
  if ! git push origin "$tip:refs/heads/$BASE"; then printf '[land] the push was refused — nothing landed.\n' >&2; exit 1; fi
  local remote; remote=$(git ls-remote origin "refs/heads/$BASE" | cut -f1)
  if [ "$remote" != "$tip" ]; then printf '[land] pushed, but origin/%s is %s, expected %s — check it.\n' "$BASE" "${remote:0:8}" "${tip:0:8}" >&2; exit 1; fi
  printf '[land] landed %s on %s by fast-forward — PR #%s' "${tip:0:8}" "$BASE" "$pr"
  if [ -n "$run" ]; then printf ', %s run %s %s/%s\n' "$WORKFLOW" "$run" "$ok" "$total"; else printf ', docs-only (no %s run)\n' "$WORKFLOW"; fi
  printf '[land] GitHub shows the PR as merged shortly. A %s run for this push now starts on %s: it is not awaited here, and it must finish before the next landing.\n' "$WORKFLOW" "$BASE"
}

# run main only when executed, not when sourced (the tests source this file to call the query functions)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
