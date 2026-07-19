# pool-bound-payment-invariant

CI gate for **Story 7.6 AC3** — the facilitated-recovery invariant.

## What it enforces

A wrong-pool deposit is **never** silently remapped, auto-reassigned, or moved. The three forbidden
operations (auto-**move** the payment to the assigned pool, auto-**reassign** the member to the pool they
paid into, auto-**create a phantom** contribution in the assigned pool) all share one code shape: a
function that takes a `(wrong-pool-payment, target-pool)` pair **and writes records**. This gate fails if
any such **cross-pool remap surface** appears.

The invariant is a **negative** commitment (D4) enforced by ABSENCE + this gate: don't build a remap
endpoint, and fail CI if one ever shows up. The only sanctioned alteration is the **≥2-trustee
attestable-correction seam** (`packages/contracts/src/pools/pool-bound-payment.ts`,
`TrusteeAttestableCorrectionRequest`). The only allowed write is to the **wrong-pool record itself** (its
validity flag + helpdesk-case linkage) — never cross-pool.

## How it works

`lib.ts` is a pure TS-AST scanner (not a substring scan, so a `targetPool` in a comment never matches). A
function is flagged iff **all three** hold: a payment-shaped param **and** a target-pool-shaped param
**and** a DB-mutation in the body. The pure classifier `classifyContributionDestination({ assignedPoolId,
depositedToPoolId })` is the near-miss — it names two pool ids but has no target/remap param and does no
write, so it passes.

`check.ts` walks `SCAN_DIRS` and exits 1 on any finding. Teeth are proven by `lib.test.ts` (a
`remap(payment, targetPool)` that writes → RED).

## The per-epic scope-extension convention (standing)

Today only the pool-engine domain surface exists. As Epic 8 (contribution-intent), Epic 9 (reconciliation +
the contributions record), and Epic 10 (helpdesk console) land, **each new root MUST be added to
`SCAN_DIRS`** in `check.ts` — see `DEFERRED_SCOPE`. A gate that does not cover the new surface silently
under-protects.

## Run

```
pnpm pool-bound-payment:test   # the scanner unit tests (teeth)
pnpm pool-bound-payment:check  # the invariant scan over SCAN_DIRS
```

Wired into both `scripts/ci-local.sh` and `.github/workflows/ci.yml`.
