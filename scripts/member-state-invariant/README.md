# `member-state-invariant` gate

A precision CI gate enforcing **Story 3.1 AC2**: `members.state` is a **replay-derived
cache**, not the source of truth — it may be written ONLY by the event-replay projector
(`packages/domain/src/member/project.ts`). Any other code path that writes the `state`
column of `members` is an architectural violation (the cache could diverge from the
event-sourced source of truth).

- **lib.ts** — pure TS-AST scanner (`scanMemberStateWrites`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: scans `packages/domain/src`, applies the projector allowlist, exits 1 naming file + line.

```
pnpm member-state:test    # vitest run scripts/member-state-invariant (teeth)
pnpm member-state:check   # tsx scripts/member-state-invariant/check.ts
```

## Flagged write forms

- `db.update(members).set({ state: … })` — canonical UPDATE
- `db.insert(members)…onConflictDoUpdate({ set: { state: … } })` — upsert UPDATE
- `members.state = …` — direct assignment

AST-based, so a `.set({ state })` substring in a comment or string literal never matches.

## Why both this gate AND the DB trigger

This is the **static, authoring-time** guard (AC2). Migration `0018` installs the
independent **runtime** guard (AC3): a `BEFORE UPDATE` trigger on `members` that RAISEs
unless the projector's `app.member_state_writer` session guard is `'on'` — that one also
catches raw SQL. Both are required; they are different layers (Epic 2 retrospective
**AI-2-2**: a load-bearing invariant needs a *machine* guard, not a reviewer note).

## Scope

INVARIANT SCAN of `packages/domain/src` — not a git-diff (no `fetch-depth: 0`; mirrors
`domain-accessor-invariants` / `schema-diff` / `microcopy`). Precision-scoped →
self-green by construction: the only file that writes `members.state` is the allowlisted
projector. A new legitimate writer must be a deliberate, reviewed addition to the
`ALLOWLIST` in `check.ts` **and** must set the trigger guard.
