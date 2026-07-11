# claim-adjudication-human-actor-invariant

Story 6.10 (AC4/AC5, D5) — the human-adjudication invariant gate.

## What it enforces

Every claim-**adjudication** route must be composed with the **human-actor guard chain** and carry
**no** machine/service/system/null-actor path:

```
[ requireAdminSession, scopeResolutionHook, requirePermissionHook(...) ]
```

- **session** — an authenticated admin session (`requireAdminSession`).
- **scope** — tenant scope resolution (`scopeResolutionHook`).
- **permission** — a permission hook (`requirePermissionHook`).
- **no forbidden actor** — no `system` / `service` / `machine` / `sie` / null-actor hook.

## Why it exists (defense-in-depth, not the security boundary)

The **runtime** chain is the real control: the verifier-console read (and every future adjudication
route) independently requires an authenticated human actor + `claim.verify` (or the write key) +
resolved scope + tenant match — fail-closed, audited. This **structural** gate is defense-in-depth
against a future machine principal being silently wired into an adjudication route. The ₹50L
auto-approval failure mode justifies the teeth before Story 6.11's endpoints exist
(`feedback_mechanization_split_commitment` — "you can build the gate and still miss the target", so the
coverage set must AIM at where adjudication routes live).

## How it works

Structured **TypeScript-AST** scan (not a text grep for hook order). It parses each Fastify route
registration `r.get('/…', { preHandler: [ … ] }, handler)` and classifies each `preHandler` entry by
resolving it to the hook-**factory** it was constructed from (`const scope = scopeResolutionHook(deps)`
→ `scope` is a scope hook), so a rename of the local binding cannot fool it and a token in a comment or
unrelated string never matches.

## Coverage set (Story 6.11 MUST extend it)

`check.ts` holds the explicit `COVERAGE_SET`: the route-registration files + path substrings that
identify adjudication routes. Story 6.10 covers the READ-ONLY verifier console. **Story 6.11 MUST add
its approve/deny/escalate route file + substrings.** A coverage entry that matches no route is a failure
(missing coverage), never a silent skip.

## Teeth

The known-bad + known-good fixtures are embedded **inline in `lib.test.ts`** (the exact
claim-state-invariant / claim-canonical-id-invariant precedent — not a separate fixture file): a route
missing the session/scope/permission hook, or carrying a forbidden `system`/`service` actor, is flagged;
the conformant 6.10 chain passes.

## Run

```
pnpm claim-adjudication-human-actor:test   # vitest — the fixtures
pnpm claim-adjudication-human-actor:check  # AST scan of the coverage set
```
