# claim-canonical-id-invariant

CI gate for **Story 6.4 AC6/AC8** (the Intake Convergence Point).

## The invariant

After ICP convergence the **only** id any downstream flow references is the canonical
`claim_case_id`. The channel-originating `intake_attempt_id` (branded `IntakeAttemptId`) is a
**temporary** id — AC7 discards it post-convergence (intake-attempt rows are retained for audit,
marked `superseded_by_claim_case_id`, and never referenced by downstream flows).

This gate mechanizes the AC8 boundary in its **honest, mechanizable** form (Story 6.4 Dev Notes,
"how to make it real, not theatre"): **no downstream code path references the intake-attempt id at
all.** A narrower-but-real invariant beats a broad-but-hand-wavy "used as a lookup key" heuristic.

## What it flags

A static TypeScript-AST scan (`lib.ts`) over the downstream-flow roots (`check.ts`
`DOWNSTREAM_ROOTS`) flags any:

- identifier named `intakeAttemptId` (param / variable / object key / `.intakeAttemptId` / import), or
- string literal `'intake_attempt_id'` or `'intakeAttemptId'` (a snake/camel lookup key).

A token inside a **comment** never matches (AST-level, not text grep). A token inside a **string
literal** does — a downstream `.where(eq(col, x))` keyed on `'intake_attempt_id'` is exactly the smell.

## Scope (and why it is self-green)

`DOWNSTREAM_ROOTS` aims at where downstream callers live / will live:

- **Notification (Story 5.1)** — `packages/contracts/src/alerts`, `.../notifications`,
  `apps/mobile/components/notifications`. These exist today and are scanned for real (they carry
  `claim_case_id` in `provenance_refs`, never the attempt id).
- **Verification (6.6/6.7/6.10/6.11)**, **Appeal (6.16)**, **Publication (Epic 11b Sahyog Vivran)** —
  FUTURE stories. Those roots do not exist yet; the runner logs them as "not present (future)"
  rather than silently covering nothing (no silent cap). Coverage grows as each story lands and its
  root is added.

The ICP's **own** files (`packages/domain/src/claim/icp.ts`, the convergence handlers/routes, the
schema/ids/contracts, and the intake handlers' audit provenance) legitimately name the intake-attempt
id — they are **outside** `DOWNSTREAM_ROOTS` and are never scanned. The gate is therefore self-green
by construction.

The teeth are proven independently by the known-bad fixtures in `lib.test.ts` (a downstream fn taking
`intakeAttemptId` as a lookup param, a string-literal key, a brand import, a `.intakeAttemptId` read) —
so the gate demonstrably bites even before real downstream callers exist.

## Run

```
pnpm claim-canonical-id:test    # vitest — the scanner's teeth + self-green cases
pnpm claim-canonical-id:check   # the invariant scan (exit 1 on any finding)
```

Wired into `scripts/ci-local.sh` (adjacent to `claim-state-invariant`) and `.github/workflows/ci.yml`
as an INVARIANT SCAN job (no `fetch-depth: 0`). Twin structure of `scripts/claim-state-invariant/`.
