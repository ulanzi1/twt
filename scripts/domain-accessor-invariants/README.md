# `domain-accessor-invariants` gate

A precision CI gate enforcing **family (a)** of the domain-accessor invariants
(Epic 2 retrospective **AI-2-2**): every dynamic `.limit(...)` in
`packages/domain/src/**` must route its page size through `clampLimit(...)` (or be a
fixed integer literal).

- **lib.ts** — pure TS-AST scanner (`scanLimitInvariant`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: scans `packages/domain/src`, exits 1 naming file + line.

```
pnpm domain-invariants:test    # vitest run scripts/domain-accessor-invariants (teeth)
pnpm domain-invariants:check   # tsx scripts/domain-accessor-invariants/check.ts
```

## Why

`Math.min(limit, cap)` alone does **not** clamp the lower bound; a negative limit
becomes Postgres `LIMIT -1` = "no limit" → a pagination bypass (the 2.7 P2 consent
finding; the same shape was found live in `listTcVersions`, `listClauses`,
`listAmendments`, `listDrafts`, `listPariwarPassports`). The canonical clamp is
`clampLimit(limit, { default, cap })` = `Math.max(1, Math.min(limit ?? default, cap))`
(`packages/domain/src/pagination.ts`).

## Scope

This gate covers **family (a)** only. Families **(b)** collection-input domain guards
and **(c)** read-then-write `FOR UPDATE` + typed-conflict + re-read are judgment calls
(a heuristic static lint would false-positive) and are enforced by **convention +
required-test + reviewer checklist** in `docs/domain-accessor-invariants.md`.

INVARIANT SCAN of `packages/domain/src` — not a git-diff (no `fetch-depth: 0`; mirrors
`schema-diff` / `microcopy`). Precision-scoped → self-green by construction.
