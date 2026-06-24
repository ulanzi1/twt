# Domain-Accessor Invariants

> Source: Epic 2 retrospective **AI-2-2** (`epic-2-retro-2026-06-24.md` §7, H-2). Three
> review-finding families recurred across Stories 2.3 / 2.6 / 2.7 — caught every time
> *in review*, never *before*. This document makes them mechanical.

## Why these recur

`@twt/domain` accessors are written as **primitives that trust their consumer**: the
HTTP route validates input with Zod (`.strict()`, `.min(1)`, branded ids), so the
accessor "knows" it receives clean input. But a **direct domain caller** — an
integration test, a seed script, another domain function, a future internal job, a
non-route surface like `apps/public` — **bypasses the Zod boundary entirely**. Every
finding below is the same shape: an invariant enforced *only* at the transport edge,
silently violable one layer down.

The fix is not "review harder" (the Epic 1 → 2 lesson: a commitment with no enforcing
artifact decays). It is to push each invariant **into the domain layer** and, where
mechanizable, **gate it**.

---

## Family (a) — Forced-pagination clamp · **GATED**

**Rule.** Every list accessor that accepts a caller-supplied `limit` MUST route the
page size through `clampLimit(limit, { default, cap })`
(`packages/domain/src/pagination.ts`), or use a fixed integer literal (`.limit(1)`).

```ts
import { clampLimit } from '../pagination.js';
// …
.limit(clampLimit(opts.limit, { default: 50, cap: 200 }))
```

**Why both bounds matter.** `clampLimit` = `Math.max(1, Math.min(limit ?? default, cap))`.
- Upper (`cap`): an unbounded `LIMIT` lets one caller drain a whole table over one connection (Story 1.14 forced-pagination).
- Lower (`1`): a negative limit becomes Postgres `LIMIT -1` = "no limit" → returns **all rows**. `Math.min(limit, cap)` *alone* does not clamp this. This is the **2.7 P2** consent finding — and it was found live in five accessors (`listTcVersions`, `listClauses`, `listAmendments`, `listDrafts`, `listPariwarPassports`), all fixed in the AI-2-2 change.

**Enforcement.** The `domain-accessor-invariants` CI gate
(`scripts/domain-accessor-invariants/`) statically flags any dynamic `.limit(...)` that
is not `clampLimit(...)` or an integer literal. Green-with-teeth.

**Required test.** Covered DB-free by `clampLimit`'s exhaustive unit test
(`packages/domain/tests/pagination.test.ts`) — accessors need no per-accessor cap test
because the clamp lives in one tested place.

---

## Family (b) — Collection-input domain guards · **CONVENTION + REQUIRED-TEST**

**Rule.** A domain accessor that accepts an array / collection input MUST, at the
**domain layer** (not only at the Zod boundary):
- reject an **empty** collection when the operation is meaningless without it;
- reject or de-duplicate **duplicates** where element identity matters.

**Precedents.**
- **2.3 P4 / P5** — `splitClause` / `mergeClauses` accepted `[]` silently (no forward lineage; a merge indistinguishable from a plain create).
- **2.3 P6** — `mergeClauses` accepted duplicate `sourceClauseIds` (confusing audit trail).
- **2.6 P4** — `createTcVersion` accepted empty `pinnedClauseVersionIds` (violates AC7); only the contracts layer enforced `.min(1)`.

**Required test.** Each such writer has an empty-input (and, where relevant,
duplicate-input) rejection test that calls the **domain function directly** (not via the
route).

```ts
if (input.newClauses.length === 0) {
  throw new Error('splitClause requires at least one new clause');
}
```

Not statically gated: "which params are collections, and is empty meaningful?" is a
judgment call a heuristic lint would false-positive on.

---

## Family (c) — Read-then-write concurrency · **CONVENTION + REQUIRED-TEST**

**Rule.** A domain mutation that **reads a row, decides, then writes the same row**
(check-then-update) MUST do all that apply:
1. **Lock or make-conditional.** Either `SELECT … FOR UPDATE` the row before the guard, **or** put the precondition in the UPDATE `WHERE` (e.g. `and(isNull(revokedAt))`) and **re-read on a 0-row result** to throw the typed state error (vs. a generic `Error`).
2. **Map unique-violations.** Catch Postgres `23505` and throw a typed **409** conflict error — never let it surface as an unmapped 500.

**Precedents.**
- **2.4 P1** — concurrent publish had no row lock → duplicate `clause_versions` + orphan audit. Fixed with `SELECT … FOR UPDATE` (`getDraftForUpdateOrThrow`, `niyamavali/drafts.ts` — the canonical lock).
- **2.6 P1** — concurrent `createTcVersion` → unmapped `23505`. Fixed → `TcVersionConflictError` (409). (Mirror `ClauseIdConflictError`.)
- **2.7 P1** — `revokeConsent` TOCTOU double-revoke. Fixed with `and(isNull(revokedAt))` in the UPDATE `WHERE` + a typed re-read on 0-row (`ConsentStateError` vs `ConsentNotFoundError`).

**Required test.** A concurrent / double-operation test (e.g. double-revoke → typed
state error; concurrent create → one 409).

Not statically gated: detecting "is this a read-then-write of the same row?" reliably
is beyond a precision lint without false positives.

---

## Reviewer checklist

Paste into a domain-touching PR review (families b/c are the non-gated half of AI-2-2):

- [ ] **(a)** Every `.limit()` with a caller value uses `clampLimit(...)`. *(also enforced by the `domain-invariants` gate)*
- [ ] **(b)** Every accessor taking an array/collection rejects empty (and duplicates where identity matters) **at the domain layer**, with a direct-call test.
- [ ] **(c)** Every read-then-write-same-row mutation locks (`FOR UPDATE`) or uses a conditional `WHERE` + 0-row re-read, maps `23505` → typed 409, with a concurrency/double-op test.
- [ ] Tests are **not vacuous** — positive assertions prove non-empty results (`expect(rows).not.toHaveLength(0)`); no constant-compared-to-itself; literal values pinned. *(AI-2-3 — see `docs/runbooks/test-runbook.md` Rule 6)*

## References

- `packages/domain/src/pagination.ts` · `scripts/domain-accessor-invariants/` · `packages/domain/tests/pagination.test.ts`
- `_bmad-output/implementation-artifacts/epic-2-retro-2026-06-24.md` (AI-2-2, H-2/H-3/H-4)
- Canonical precedents: `niyamavali/drafts.ts` `getDraftForUpdateOrThrow` (c); `consent/{read,write}.ts` (a/c); `niyamavali/write.ts` `ClauseIdConflictError` (c).
