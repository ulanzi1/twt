# `scripts/pool-support-category-invariant/` — the no-death-branch PR CI gate (Story 7.1 AC4)

The static CI gate for **Story 7.1 AC4**: the pool engine has **NO death-specific
branches**. Every pool-engine code path operates on the `support_category` ENUM values,
never on a hardcoded `'death'` / `'death_support'` string. This is what makes v2 `_daan`
activation (Kanyadan / Jivandan / Retirementdaan — PRD §4.3) a **configuration change**
(a new enum label + a new insert) rather than an **engine refactor**. Twin of
`scripts/benefit-mechanism/` (the enum-tag scan model).

Authority: Story 7.1 AC4 · FR-20 · the `support_category` discriminator (architecture
Epic 7). The `POOL_SUPPORT_CATEGORIES` tuple in `packages/domain/src/schema/pools.ts` is
the ONE enum-definition authority — the sole legitimate home for the `death_support`
literal, allowlisted here.

## Files

- `check.ts` — entrypoint (impure: pool-engine file walk + `process.exit`). Run via `pnpm pool-support-category:check`.
- `lib.ts` — pure, importable scanner (`scanDeathBranches`, a line-oriented `death` string match). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests, incl. the KNOWN-BAD fixtures that turn the scanner RED (a `=== 'death'` branch / a `'death_support'` literal / a death comment) + the PASSES negatives (enum-keyed code, `deceased`, generic `supportCategory`). Run via `pnpm pool-support-category:test`.

## What it flags

Any `death` string match (case-insensitive — `death_support` contains `death`, so both
AC4 tokens are covered) on a pool-engine source line, **including comments** — the
discriminator's whole point is that the engine is category-agnostic, so even a comment
that special-cases death is a smell. The only exception is the allowlisted enum
definition file.

## Scope — the pool-engine surface (NOT all of domain)

The scan is scoped to the **pool-engine** surface — `packages/domain/src/pool/`,
`packages/domain/src/snapshot-adapters/`, `schema/pools.ts` (allowlisted enum def),
`schema/pool_snapshots.ts` — NOT all of `packages/domain/src`: the death-CLAIM subsystem
(`claim/*`, `schema/claims.ts`) legitimately says "death" everywhere, so an all-domain
scan would be all false positives. The invariant is about the **pool engine** being
category-agnostic.

⚠ **Standing per-epic scope-extension convention**
(`[[project_access_wrapper_gate_pending_scope]]`): as pool-engine code lands in `apps/*`
/ other packages (Story 7.3 spawn saga, 7.5+ payment enforcement), those roots MUST be
ADDED to `SCAN_DIRS` / `SCAN_FILES` in `check.ts`. A gate that a later story's new
pool-engine surface silently escapes has failed
(`[[feedback_gate_scope_semantic_coverage]]`). The gate's teeth are proven by
`lib.test.ts`'s known-bad fixtures, not by a green scan over new files.
