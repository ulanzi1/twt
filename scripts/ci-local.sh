#!/usr/bin/env bash
#
# ci-local.sh — local mirror of .github/workflows/ci.yml
#
# Runs every CI job that needs no external service (18 jobs), plus the live-DB
# `integration-tests` job (the 19th) when DATABASE_URL is set. Stopgap while
# GitHub Actions is unavailable (account under review). Each job reproduces its
# ci.yml counterpart's ENVIRONMENT SEMANTICS — not a byte-identical command
# string — so a green run here means a green run there. Where a job's text differs
# from its ci.yml counterpart, the divergence is annotated AT THAT LINE and must be
# semantics-preserving (e.g. `crypto-check` sets KMS_TEST_MODE as a prefix where
# ci.yml sets it as a job-level `env:`). ⚠ A divergence that changes what the job
# can DETECT is a defect, not a style difference — see AI-10-5 below.
#
# Usage:
#   pnpm ci:local
#       → 18 static jobs (lint, typecheck, build, unit test, + all gates)
#   DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local
#       → also runs integration-tests against the twt-test-pg container (port 5433)
#
set -uo pipefail

PASSED=()
FAILED=()
SKIPPED=()

run() {
  local name="$1" cmd="$2"
  printf '\n\033[1;34m════ %s ════\033[0m\n' "$name"
  if eval "$cmd"; then
    PASSED+=("$name")
    printf '\033[1;32m✓ %s\033[0m\n' "$name"
  else
    FAILED+=("$name")
    printf '\033[1;31m✗ %s FAILED\033[0m\n' "$name"
  fi
}

# ── static jobs (no external services) ────────────────────────────────────────
run "lint"                  "pnpm turbo run lint"
run "typecheck"             "pnpm turbo run typecheck"
run "build"                 "pnpm turbo run build"
# --concurrency=4: this job's own dedicated re-runs below (determinism-replay, channels-determinism)
# already exist because those two suites are sensitive to CPU contention (8 real OS worker threads each,
# each registering tsx + dynamic-importing a TS module from cold). Running all ~20 packages' test tasks
# fully unbounded oversubscribes an 8-core machine and pushes the flake onto whichever suite gets starved
# that run (observed: validity-service/channels determinism, then apps/admin's userEvent-driven RTL tests).
# Capping concurrency gives each running package real CPU share instead of cascading timeouts.
#
# AI-10-5 (Epic-10 retrospective) — `env -u DATABASE_URL`. ci.yml's `test` job (ci.yml:74-98) sets NO
# DATABASE_URL, so every DB-gated spec there self-skips via `describe.skipIf(!hasDatabase)`. But
# ci:local is invoked with DATABASE_URL exported for the WHOLE run, which leaked it into this job: the
# DB-gated specs executed here AND committed rows, and then `integration-tests` re-ran those same specs
# against the SAME database — so specs asserting exact counts on the fixed PARIWAR_A tenant saw two
# passes' worth, and the merge gate could not report green on an unmodified tree. Stripping the variable
# for this one job restores CI-equivalent environment semantics and makes each DB-gated spec run exactly
# once per invocation. Zero coverage is lost: every directory holding a DB-gated spec (apps/api,
# apps/jobs, packages/{channels,domain,events,niyamavali-engine,queue,validity-service}) is already in
# the `integration-tests` filter set below.
# ⛔ --concurrency=4 is NOT part of this fix — ruled a recorded tax, not a defect (BigDev 2026-08-18).
run "test (unit)"           "env -u DATABASE_URL pnpm turbo run test --concurrency=4"
run "db-check"              "pnpm turbo run db:check"
run "contracts-determinism" "pnpm turbo run contracts:check-openapi-determinism"
run "crypto-check"          "KMS_TEST_MODE=fake pnpm turbo run crypto:check"
run "tokens-theme-check"    "pnpm turbo run tokens:check-theme-determinism"
run "i18n-parity"           "pnpm turbo run i18n:check-parity"
run "pii-scrape"            "pnpm turbo run contracts:check-pii-scrape"
run "friction-budget"       "pnpm friction:test && pnpm friction:check"
run "schema-diff"           "pnpm schema:test && pnpm schema:check"
run "benefit-mechanism"     "pnpm benefit:test && pnpm benefit:check"
run "microcopy"             "pnpm microcopy:test && pnpm microcopy:check"
run "domain-invariants"     "pnpm domain-invariants:test && pnpm domain-invariants:check"
run "member-state-invariant" "pnpm member-state:test && pnpm member-state:check"
run "claim-state-invariant" "pnpm claim-state:test && pnpm claim-state:check"
run "claim-canonical-id-invariant" "pnpm claim-canonical-id:test && pnpm claim-canonical-id:check"
run "claim-adjudication-human-actor-invariant" "pnpm claim-adjudication-human-actor:test && pnpm claim-adjudication-human-actor:check"
run "kyc-provider-boundary" "pnpm kyc-provider:test && pnpm kyc-provider:check"
run "access-wrapper-invariants" "pnpm access-wrapper:test && pnpm access-wrapper:check"
run "pool-state-invariant"  "pnpm pool-state:test && pnpm pool-state:check"
run "pool-support-category-invariant" "pnpm pool-support-category:test && pnpm pool-support-category:check"
run "pool-bound-payment-invariant" "pnpm pool-bound-payment:test && pnpm pool-bound-payment:check"
run "sahyog-vivran-financial-truth" "pnpm sahyog-vivran-financial-truth:test && pnpm sahyog-vivran-financial-truth:check"
run "alert-state-invariant"  "pnpm alert-state:test && pnpm alert-state:check"
run "helpdesk-state-invariant"  "pnpm helpdesk-state:test && pnpm helpdesk-state:check"
run "governance-boundary"  "pnpm governance-boundary:test && pnpm governance-boundary:check"
run "custom-field-governance" "pnpm custom-field:test && pnpm custom-field:check"
# [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): CRITICAL — the gate existed as
# package.json scripts and passed by hand, but was never wired into ci-local.sh or ci.yml, so a
# reintroduced `quorum` (or a deleted/renamed SCAN_PATHS entry) got a green run regardless. That is
# exactly the "by eye" enforcement Task 11 explicitly rejected.
run "survey-advisory-invariant" "pnpm survey-advisory:test && pnpm survey-advisory:check"
run "determinism-replay"    "pnpm --filter @twt/validity-service test:determinism"
run "channels-determinism"  "pnpm --filter @twt/channels test:determinism"

# ── live-DB job (opt-in via DATABASE_URL) ─────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  # ⚠ AI-10-5 coverage guard. `test (unit)` no longer runs DB-gated specs, so a DB-gated spec living in a
  # package this job does NOT filter to would now run in NEITHER phase — silently, with a green result.
  # Before the fix such a spec still ran (the exported DATABASE_URL leaked into the unit job), so this
  # failure mode is CREATED by the fix and must not rest on a one-time manual check. Both sets are DERIVED,
  # never hand-listed: if they ever diverge, this fails loudly instead of quietly testing less.
  # Matches on `hasDatabase` (the actual `describe.skipIf(!hasDatabase)` gating identifier), not the
  # literal string `DATABASE_URL` — most gated specs import `hasDatabase` from a shared setup helper and
  # never spell out `DATABASE_URL` themselves, so that literal was a coincidental, not structural, proxy.
  gated=$(grep -rl "hasDatabase" --include="*.spec.ts" --include="*.test.ts" packages apps 2>/dev/null \
            | sed 's|/tests/.*||; s|/src/.*||' | sort -u)
  filtered=$(grep '^  run "integration-tests"' "$0" | grep -o '@twt/[a-z-]*' | sed 's|@twt/||' | sort -u \
            | while read -r pkg; do
                if [ -d "packages/$pkg" ]; then echo "packages/$pkg"; else echo "apps/$pkg"; fi
              done | sort -u)
  if [ "$gated" != "$filtered" ]; then
    missing=$(comm -23 <(printf '%s\n' "$gated") <(printf '%s\n' "$filtered"))
    extra=$(comm -13 <(printf '%s\n' "$gated") <(printf '%s\n' "$filtered"))
    printf '\n\033[1;31m✗ AI-10-5 coverage guard FAILED\033[0m — DB-gated packages != integration filter set.\n'
    [ -n "$missing" ] && printf 'Missing from --filter (has DB-gated specs, not integrated):\n%s\n\n' "$missing"
    [ -n "$extra" ] && printf 'In --filter but no DB-gated specs found (stale entry?):\n%s\n\n' "$extra"
    printf 'Full sets — gated:\n%s\n\nintegration-tests filters to:\n%s\n\n' "$gated" "$filtered"
    printf 'Add the missing package to the --filter list below, or those specs run NOWHERE.\n'
    FAILED+=("ai-10-5-coverage-guard")
  else
    PASSED+=("ai-10-5-coverage-guard")
  fi

  # ⚠ AI-10-5 (2026-08-23) — `--concurrency=1` MIRRORS ci.yml:984 AND IS LOAD-BEARING, NOT A PERF KNOB.
  # ci.yml's note (added 2026-08-04) states it directly: all eight filtered packages share ONE Postgres,
  # several write the ONE global `audit_log_entries` chain via writeAuditEntry, and running them in
  # parallel interleaves rows into the global seq — breaking the chunk-walk specs' "the rows I wrote are
  # consecutive" assumption. Observed there on THREE consecutive main runs, a different count-assertion
  # spec each time. That note ends: "Keep the two invocations in sync — a cap of 4 is NOT equivalent, it
  # merely lowers the failure rate." This mirror ran at 4 until now, so it could not reproduce the cloud's
  # failure and could not report green on an unmodified tree.
  # ⛔ This is NOT the `test (unit)` oversubscription cap that the AI-10-5 split disposition excluded as a
  # recorded tax — that one is a PERFORMANCE knob and stays at 4 above. These two settings are different
  # things; conflating them is what left this divergence in place. Ruled by BigDev 2026-08-23.
  run "integration-tests" "pnpm db:migrate && pnpm turbo run test --force --concurrency=1 --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue --filter=@twt/niyamavali-engine --filter=@twt/validity-service --filter=@twt/channels"
else
  SKIPPED+=("integration-tests — set DATABASE_URL (twt-test-pg on :5433) to enable")
fi

# ── summary ───────────────────────────────────────────────────────────────────
printf '\n\033[1m════════════ ci:local summary ════════════\033[0m\n'
if [ ${#PASSED[@]} -gt 0 ];  then for p in "${PASSED[@]}";  do printf '  \033[32m✓\033[0m %s\n' "$p"; done; fi
if [ ${#SKIPPED[@]} -gt 0 ]; then for s in "${SKIPPED[@]}"; do printf '  \033[33m·\033[0m SKIP %s\n' "$s"; done; fi
if [ ${#FAILED[@]} -gt 0 ];  then for f in "${FAILED[@]}";  do printf '  \033[31m✗\033[0m %s\n' "$f"; done; fi

if [ ${#FAILED[@]} -gt 0 ]; then
  printf '\n\033[1;31mci:local FAILED — %d job(s)\033[0m\n' "${#FAILED[@]}"
  exit 1
fi
printf '\n\033[1;32mci:local PASSED — %d job(s) green\033[0m\n' "${#PASSED[@]}"
exit 0
