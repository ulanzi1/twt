#!/usr/bin/env bash
#
# ci-local.sh — local mirror of .github/workflows/ci.yml
#
# Runs every CI job that needs no external service (15 jobs), plus the live-DB
# `integration-tests` job (the 16th) when DATABASE_URL is set. Stopgap while
# GitHub Actions is unavailable (account under review). Each job invokes the
# exact command its ci.yml counterpart runs, so a green run here means a green
# run there.
#
# Usage:
#   pnpm ci:local
#       → 15 static jobs (lint, typecheck, build, unit test, + all gates)
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
run "test (unit)"           "pnpm turbo run test"
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
run "cadence-check"         "pnpm cadence:check"

# ── live-DB job (opt-in via DATABASE_URL) ─────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  run "integration-tests" "pnpm db:migrate && pnpm turbo run test --force --filter=@twt/domain --filter=@twt/events --filter=@twt/jobs --filter=@twt/api --filter=@twt/queue"
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
