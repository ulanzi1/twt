# `access-wrapper-invariants` gate

A precision CI gate mechanizing the **cheapest, most-corrosive slice** of the Epic-4
retrospective **AI-4-3** action item (the I-3 "access wrapper is the new TOCTOU"
family): every validity **access entrypoint** in `packages/validity-service/src/**`
must fail **closed** on an omitted caller, so none can default to returning a full,
unredacted, unaudited payload (the exact Story 4.6 omitted-caller defect).

- **lib.ts** — pure TS-AST scanner (`scanAccessWrapperInvariant`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: scans `packages/validity-service/src`, exits 1 naming file + line.

```
pnpm access-wrapper:test    # vitest run scripts/access-wrapper-invariants (teeth)
pnpm access-wrapper:check   # tsx scripts/access-wrapper-invariants/check.ts
```

## What is an "access entrypoint"

An exported **`async`** function whose declared return type is
`Promise<…MemberValidityPayload>` — it hands a validity payload across the service
boundary (`getValidity`, `getValidityAt`, `getValidityCached`). The pure sync
assemblers/redactors (`assemblePayload`, `redactForCaller`) return a **bare**,
non-Promise payload and are not boundaries, so keying on `Promise<…MemberValidityPayload>`
excludes them by construction.

## The invariant

An entrypoint is CONFORMANT iff **either**:

- **(G) it contains the fail-closed guard** — `if (!opts.caller && !opts.internal) throw …`
  (operand order-insensitive; the `getValidityAt` / `getValidityCached` step 0), **or**
- **(D) it is a pure delegator** — its sole `return` forwards its own options parameter,
  unchanged, to another call (the `getValidity` → `getValidityAt` shape, which inherits
  the delegate's guard). Forwarding a **literal** `{ internal: true }` does **not**
  qualify — that is an auto-internal bypass and is flagged.

## Why

In Story 4.6 an **omitted-caller path returned the full, unredacted, unaudited payload
by default** — a caller that forgot to authenticate silently received everything. The
fix made the absence of both markers throw. This gate freezes that: a future entrypoint
(the Epic 5 channels are wall-to-wall new access paths) that assembles + returns the
payload without the guard is rejected at CI, not at the next adversarial review.

## Scope

This gate covers the **entrypoint-must-declare-caller/internal** slice only. The rest of
the AI-4-3 pre-review checklist — independent caller-authorization, HMAC/blind-index
audit hashes, isolated best-effort writes, and permission-key scope-dimension match — are
judgment calls a heuristic static lint would false-positive on, and are enforced by
**convention + reviewer checklist** in [`docs/access-wrapper-invariants.md`](../../docs/access-wrapper-invariants.md).

INVARIANT SCAN of `packages/validity-service/src` — not a git-diff (no `fetch-depth: 0`;
mirrors `member-state-invariant` / `domain-invariants`). Precision-scoped → self-green by
construction.
