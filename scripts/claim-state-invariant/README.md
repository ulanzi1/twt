# `claim-state-invariant` gate

A precision CI gate enforcing **Story 6.1 AC3**: `claims.current_state` is a
**replay-derived cache**, not the source of truth — it may be written ONLY by the
event-replay projector (`packages/domain/src/claim/project.ts`). Any other code path
that writes the `current_state` column of `claims` is an architectural violation (the
cache could diverge from the event-sourced source of truth — the ₹50L/decision flow).
The claim-lifecycle twin of `member-state-invariant`.

- **lib.ts** — pure TS-AST scanner (`scanClaimStateWrites`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: scans `packages/domain/src`, applies the projector allowlist, exits 1 naming file + line.

```
pnpm claim-state:test    # vitest run scripts/claim-state-invariant (teeth)
pnpm claim-state:check   # tsx scripts/claim-state-invariant/check.ts
```

## Flagged write forms

- `db.update(claims).set({ currentState: … })` — canonical UPDATE
- `db.insert(claims)…onConflictDoUpdate({ set: { currentState: … } })` — upsert UPDATE
- `claims.currentState = …` — direct assignment

The Drizzle FIELD is `currentState` (camelCase of the `current_state` column). AST-based,
so a `.set({ currentState })` substring in a comment or string literal never matches.

## Why both this gate AND the DB trigger

This is the **static, authoring-time** guard (AC3). Migration `0051` installs the
independent **runtime** guard (AC3): a `BEFORE UPDATE` trigger on `claims` that RAISEs
unless the projector's `app.claim_state_writer` session guard is `'on'` — that one also
catches raw SQL. Both are required; they are different layers (Epic 2 retrospective
**AI-2-2**: a load-bearing invariant needs a *machine* guard, not a reviewer note).

## Scope

INVARIANT SCAN of `packages/domain/src` — not a git-diff (no `fetch-depth: 0`; mirrors
`member-state-invariant` / `domain-accessor-invariants`). Precision-scoped → self-green
by construction: the only file that writes `claims.current_state` is the allowlisted
projector. A new legitimate writer must be a deliberate, reviewed addition to the
`ALLOWLIST` in `check.ts` **and** must set the trigger guard.

**Epic-5 retro H-1 heed** — the AI-4-3 access-wrapper gate was built but scoped to the
wrong `SCAN_ROOT` and scanned none of its target surface ("you can build the gate and
still miss the target"). This gate's `SCAN_ROOT` is `packages/domain/src`, which covers
`claim/project.ts` and any accidental writer; the teeth are proven by a known-bad
fixture inside that discipline (`lib.test.ts`).
