#!/usr/bin/env bash
#
# land.test.sh — scenario tests for scripts/land.sh. Run:  bash scripts/land.test.sh   (exit 0 = every scenario passed)
#
# It builds a throwaway repository with a bare "remote" and puts a FAKE `gh` first on PATH that returns canned answers, so
# nothing here touches GitHub or this repository: the one `git push` land.sh makes goes to the throwaway remote.
# Not run by CI (ci.yml has no job for it): run it after any change to scripts/land.sh.

set -u
LAND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/land.sh"
T=$(mktemp -d "${TMPDIR:-/tmp}/land-test.XXXXXX")
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/nogh"

# the fake gh: which query it is decides the answer (a --commit query is the CI run for a tip; one that asks for
# `conclusion` is the newest finished run on main; any other `run list` is the in-progress count)
cat > "$T/bin/gh" <<'EOF'
#!/usr/bin/env bash
case "$1 $2" in
  "pr view")  printf '%s\n' "$FAKE_PRINFO" ;;
  "run list") if printf '%s ' "$@" | grep -q -- '--commit'; then printf '%s\n' "$FAKE_RUNID"
              elif printf '%s ' "$@" | grep -q 'conclusion'; then printf '%s\n' "$FAKE_LAST"
              else printf '%s\n' "$FAKE_BUSY"; fi ;;
  "run view") printf '%s\n' "$FAKE_RUNSUM" ;;
  *) echo "fake gh: unexpected call: $*" >&2; exit 9 ;;
esac
EOF
chmod +x "$T/bin/gh"

G() { git -C "$T/work" "$@"; }
git init -q --bare "$T/remote.git"
git clone -q "$T/remote.git" "$T/work" 2> /dev/null
G config user.email t@t; G config user.name t; G checkout -q -b main
echo base > "$T/work/README.md"; G add .; G commit -q -m base; G push -q origin main; BASE=$(G rev-parse HEAD)
G checkout -q -b feature; mkdir -p "$T/work/apps/api/src"; echo 1 > "$T/work/apps/api/src/a.ts"; G add .; G commit -q -m f1
echo 2 >> "$T/work/apps/api/src/a.ts"; G add .; G commit -q -m f2; CODE=$(G rev-parse HEAD); G push -q origin feature
G checkout -q main; G checkout -q -b docsb; mkdir -p "$T/work/docs"; echo d > "$T/work/docs/d.md"; G add .; G commit -q -m d; DOCS=$(G rev-parse HEAD); G push -q origin docsb
G checkout -q main; G checkout -q -b gateb; echo x > "$T/work/.decision-log.md"; G add .; G commit -q -m g; GATE=$(G rev-parse HEAD); G push -q origin gateb
G checkout -q main
# a commit that exists ONLY on refs/pull/7/head (a fresh clone does not have it)
G checkout -q -b tmp; echo p > "$T/work/p.ts"; G add .; G commit -q -m p; PRONLY=$(G rev-parse HEAD); G push -q origin "$PRONLY:refs/pull/7/head"; G checkout -q main; G branch -q -D tmp

rm_main() { git -C "$T/remote.git" update-ref refs/heads/main "$1"; }
remote_main() { git -C "$T/remote.git" rev-parse refs/heads/main; }
OKSUM() { printf 'completed\tsuccess\t%s\t41\t41' "$1"; }
LAST_OK=$(printf '45\tsuccess\tabcdef0123')
LAST_RED=$(printf '46\tfailure\t0123abcdef')
pass=0; failn=0; last_out=""

# case_ NAME WANT_EXIT WANT_MAIN(base|tip|moved) WORKDIR TIP PRINFO RUNID RUNSUM BUSY [land.sh flags]   (env: FAKE_LAST)
case_() {
  local name=$1 want=$2 wantmain=$3 wd=$4 tip=$5 prinfo=$6 runid=$7 runsum=$8 busy=$9; shift 9
  rm_main "$BASE"
  if [ "$wantmain" = moved ]; then G checkout -q main; echo m >> "$T/work/README.md"; G commit -q -am moved; G push -q origin main; MOVED=$(G rev-parse HEAD); fi
  local out rc m expect
  out=$(cd "$wd" && FAKE_PRINFO="$prinfo" FAKE_RUNID="$runid" FAKE_RUNSUM="$runsum" FAKE_BUSY="$busy" FAKE_LAST="${FAKE_LAST-$LAST_OK}" PATH="$T/bin:$PATH" bash "$LAND" "$@" 7 2>&1); rc=$?
  m=$(remote_main)
  case "$wantmain" in base) expect=$BASE ;; tip) expect=$tip ;; moved) expect=$MOVED ;; esac
  if [ "$rc" = "$want" ] && [ "$m" = "$expect" ]; then
    pass=$((pass + 1)); printf 'PASS  %-62s exit=%s  remote main %s\n' "$name" "$rc" "$([ "$m" = "$tip" ] && echo 'ADVANCED to the tip' || echo 'unchanged')"
  else
    failn=$((failn + 1)); printf 'FAIL  %-62s exit=%s (want %s)  remote main=%s (want %s)\n' "$name" "$rc" "$want" "${m:0:8}" "${expect:0:8}"
    printf '%s\n' "$out" | sed 's/^/        | /'
  fi
  if [ "$wantmain" = moved ]; then G checkout -q main; G reset -q --hard "$BASE"; fi
  last_out=$out
}
# said PATTERN LABEL — the output of the last case_ must contain PATTERN
said() {
  if printf '%s\n' "$last_out" | grep -q -- "$1"; then pass=$((pass + 1)); printf 'PASS    … and it said: %s\n' "$2"
  else failn=$((failn + 1)); printf 'FAIL    … it did NOT say: %s\n' "$2"; printf '%s\n' "$last_out" | sed 's/^/        | /'; fi
}
PI() { printf '%s\t%s\t%s\t%s' "$1" main "$2" feature; }
W="$T/work"

case_ "S1  all checks pass, dry run"                                  0 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0 --dry-run
case_ "S2  all checks pass, REAL landing (pushes the tip)"            0 tip   "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0
case_ "S3  the run concluded failure"                                 1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(printf 'completed\tfailure\t%s\t40\t41' "$CODE")" 0
case_ "S4  the run is for a DIFFERENT sha than the tip"               1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$BASE")" 0
case_ "S5  the run is still in progress"                              1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(printf 'in_progress\t\t%s\t30\t41' "$CODE")" 0
case_ "S6  success but 40 of 41 jobs ok"                              1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(printf 'completed\tsuccess\t%s\t40\t41' "$CODE")" 0
case_ "S7  success but the run has 0 jobs"                            1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(printf 'completed\tsuccess\t%s\t0\t0' "$CODE")" 0
case_ "S8  a ci.yml run is in progress on main"                       1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 1
case_ "S9  main has moved (the branch diverged)"                      1 moved "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0
case_ "S10 the PR is CLOSED"                                          1 base  "$W" "$CODE" "$(PI CLOSED "$CODE")" 101 "$(OKSUM "$CODE")" 0
case_ "S11 no run, docs-only change: lands (dry run)"                 0 base  "$W" "$DOCS" "$(PI OPEN "$DOCS")" "" "" 0 --dry-run
case_ "S12 no run, docs-only change: REAL landing"                    0 tip   "$W" "$DOCS" "$(PI OPEN "$DOCS")" "" "" 0
case_ "S13 no run, but the change is code"                            1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" "" "" 0
case_ "S14 no run, docs-only but touches a gate-input file"           1 base  "$W" "$GATE" "$(PI OPEN "$GATE")" "" "" 0

# S15: the tip exists only on refs/pull/7/head — a fresh file:// clone does not have it, so land.sh must fetch it
git clone -q "file://$T/remote.git" "$T/work2" 2> /dev/null
if git -C "$T/work2" cat-file -e "$PRONLY^{commit}" 2> /dev/null; then echo "  !! SETUP PROBLEM: work2 already has the tip, S15 would prove nothing"; failn=$((failn + 1)); fi
case_ "S15 the tip is not local: fetched from pull/7/head"            0 base  "$T/work2" "$PRONLY" "$(PI OPEN "$PRONLY")" 101 "$(OKSUM "$PRONLY")" 0 --dry-run

# S16: the remote refuses the push (a pre-receive hook) -> exit 1, nothing landed
# shellcheck disable=SC2016  # the single quotes are deliberate: this is the text of the hook script, not ours to expand
printf '#!/bin/sh\nwhile read o n r; do [ "$r" = refs/heads/main ] && { echo "refused by the test hook" >&2; exit 1; }; done; exit 0\n' > "$T/remote.git/hooks/pre-receive"
chmod +x "$T/remote.git/hooks/pre-receive"
case_ "S16 the remote REFUSES the push"                               1 base  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0
rm -f "$T/remote.git/hooks/pre-receive"

# S17: gh missing -> exit 2 (an empty PATH directory, so it holds on any machine whatever its gh location)
rm_main "$BASE"; out=$(cd "$W" && PATH="$T/nogh" "$BASH" "$LAND" 7 2>&1); rc=$?
if [ "$rc" = 2 ]; then pass=$((pass + 1)); printf 'PASS  %-62s exit=%s  (%s)\n' "S17 gh not installed" "$rc" "$(printf '%s' "$out" | head -1)"
else failn=$((failn + 1)); printf 'FAIL  S17 exit=%s\n%s\n' "$rc" "$out"; fi

# check 5 — ADVISORY: the newest finished run on main. It must say so, and it must NEVER change the verdict.
FAKE_LAST=$LAST_OK  case_ "S18 newest finished main run SUCCEEDED: said so"                0 base "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0 --dry-run
said "the newest finished ci.yml run on main (45, abcdef01) succeeded" "it succeeded (run 45)"
FAKE_LAST=$LAST_RED case_ "S19 newest finished main run is RED: warns, dry run still 0"    0 base "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0 --dry-run
said "! the newest finished ci.yml run on main (46, 0123abcd) is failure, not success" "a warning naming run 46 and 'failure'"
FAKE_LAST=$LAST_RED case_ "S20 newest finished main run is RED: a REAL landing still lands" 0 tip  "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0
said "! the newest finished ci.yml run on main" "the warning, before it landed"
FAKE_LAST=''        case_ "S21 the newest-finished query returns nothing: warns, still 0"  0 base "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0 --dry-run
said "could not read the newest finished ci.yml run" "it could not read it"
FAKE_LAST=$(printf '47\tcancelled\tfeedfeed00') case_ "S22 newest finished main run CANCELLED: warns" 0 base "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(OKSUM "$CODE")" 0 --dry-run
said "is cancelled, not success" "a warning naming 'cancelled'"
# …and a red check 5 must not MASK a real failure: a failing check 2 with a red main run is still exit 1
FAKE_LAST=$LAST_RED case_ "S23 red main run AND a failed PR run: still refused (exit 1)"  1 base "$W" "$CODE" "$(PI OPEN "$CODE")" 101 "$(printf 'completed\tfailure\t%s\t40\t41' "$CODE")" 0

echo; echo "scenarios passed: $pass, failed: $failn"
[ "$failn" = 0 ]
