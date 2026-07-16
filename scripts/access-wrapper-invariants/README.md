# `access-wrapper-invariants` gate

A precision CI gate mechanizing the **cheapest, most-corrosive slices** of the I-3
"access wrapper is the new TOCTOU" family. **One gate, three invariants**, each scanned
over the code its commitment is about:

1. **Validity caller/internal fail-closed (AI-4-3)** — every validity **access entrypoint**
   in `packages/validity-service/src/**` must fail **closed** on an omitted caller, so none
   can default to returning a full, unredacted, unaudited payload (the Story 4.6 defect).
2. **Constant-time secret compare (AI-5-1, AI-6-1)** — within any **verification context** on
   the channel access surface **and the Epic-6 claim surface**, a compare of two runtime values
   must go through an approved constant-time comparator, never `===`/`!==`/`.includes`/
   `.startsWith`/`.localeCompare` (the Story 5.4 `hub.verify_token` timing side-channel).
3. **Compensating-audit mechanization (AI-5-3 / ADR-0030, AI-6-1)** — on the SAME channel **+
   claim** access surface, a direct `audit.writeAuditEntry` call is non-conformant unless the
   file is a named AI-4-3(d) isolated-best-effort exemption; `packages/domain/src/audit/compensating.ts`
   (`withCompensatingAudit` / `writeRolledBackAudit`) is the sole sanctioned caller otherwise
   (the H-4 audit-write-ordering gap from the Epic-5 retro).

- **lib.ts** — pure TS-AST scanners (`scanAccessWrapperInvariant`, `scanSecretCompareInvariant`, `scanCompensatingAuditInvariant`). DB-free, unit-tested in `lib.test.ts`.
- **check.ts** — entrypoint: runs each invariant over its own root set, exits 1 naming file + line.

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

## Invariant 2 — channel constant-time secret compare (AI-5-1)

A **verification context** is a function (including a class constructor) that establishes
trust by checking an incoming credential: it computes an HMAC (`createHmac`), reads a
signature / verify-token header matching the shape `x-*-signature[-256]` / `x-*-secret-token`
/ `hub.verify_token` (case-insensitive, e.g. `x-hub-signature-256`,
`x-telegram-bot-api-secret-token`, and future channels' headers of the same shape), resolves a
channel secret via a `resolve*Secret*`-named call (e.g. `resolveChannelSecret`), or calls an
approved comparator / `verify*Signature` helper. The invariant is **conditional on the
presence of verification** — where none exists there is nothing to get wrong, so there is **no
synthetic "≥1 compare" canary**; a finding is *produced by* the verification context, not
asserted against a global minimum.

Within such a context, a `===`/`!==`/`==`/`!=` or `.includes`/`.startsWith`/`.localeCompare`
of **two runtime values** is flagged unless routed through `timingSafeEqual` /
`timingSafeEqualString` / `timingSafeHashCompare`. A compare where **either** operand is a
literal, a `.length` read, or a const-literal is exempt — that clears the legitimate
control-flow compares a handler contains (`mode !== 'subscribe'`, `challenge === undefined`,
`provided.length !== expected.length`, `header.startsWith(SIGNATURE_PREFIX)`) while catching
the real defect (`token !== expectedToken`, both runtime). The const-literal exemption is
lexically scoped — a module-top-level const or a const local to the *same* function — so a
same-named literal local to an unrelated function in the file can never exempt a genuine
secret compare elsewhere.

**Known heuristic limits (deferred, not built):** a verification signal and its compare split
across nested closures/factory-method boundaries, `switch`/`case` equality, and
non-import-resolved aliasing (`import { timingSafeEqual as tse }`) are out of scope for this
cheap AST heuristic — see the story's Review Findings for the retrigger conditions.

Scanned over the channel access surface — `packages/channels/src` + the `apps/api` channel
entrypoints (`channel-webhooks`, `wa-opt-in`, `telegram-opt-in`, `channel-config`,
`degraded-mode`, `device-token`) — **and, as of AI-6-1, the Epic-6 claim surface**
(`apps/api/src/modules/{claims,nominee}`, `packages/domain/src/claim`). On the claim surface
this invariant is **vacuous-safe forward-coverage** today: claim step-up-OTP delegates to the
already-scanned auth OTP service, so no local verification context exists yet — but a future
*local* credential compare on the claim surface is caught.

**Known heuristic trade-off on the (larger, compare-dense) claim surface:** the
verification-context signal is name-based and per-function. The first time a function in a
compare-heavy claim file gains a `createHmac` / `resolve*Secret` / `verify*Signature` call, the
*whole* function becomes a verification context and every runtime-vs-runtime `===`/`!==` in it
is flagged — even ones unrelated to a credential. This is expected: if the new call is a genuine
credential check, route the real compare through `timingSafeEqual*`; if it is a **blind-index /
MAC that is not a credential compare** (e.g. a nominee-mobile blind index), the plain compares
around it are legitimate and the finding is a false positive — resolve it the same way the other
documented heuristic limits are (narrow the shape or add a reviewed carve-out), not by weakening
the invariant. Same class as the deferred limits below.

## Invariant 3 — compensating-audit mechanization (AI-5-3 / ADR-0030)

A direct call to `audit.writeAuditEntry` anywhere in the channel **or claim** access surface
(the same scan roots as Invariant 2) is flagged UNLESS the enclosing **file** is on the named
exemption list in `lib.ts` (`COMPENSATING_AUDIT_EXEMPT_FILES`). The invariant is
deliberately a **positive** one — "reaches the canonical helper" — not a heuristic that
tries to detect a mutation call adjacent to an audit write: an open-ended mutation-name
lexicon would drift the moment a new domain accessor is named differently, and would have
missed real call sites in this very codebase (`channel-config`/`degraded-mode` never
mention a `scopeTx` identifier in the handler body at all — they read `request.scopeTx`
through a same-file `scopeCtx()` indirection).

`packages/domain/src/audit/compensating.ts` exports the two sanctioned callers:
- `withCompensatingAudit` — write the intent line, run the mutation, compensate + rethrow
  on failure.
- `writeRolledBackAudit` — fire just the compensating line, for a `mutate` that catches a
  specific recoverable error itself and wants to settle the chain while still returning a
  normal success (the `telegram-opt-in.request()` concurrent-double-tap pattern).

**File exemptions** (not function-name exemptions — an anonymous-arrow return shape like
`channels/audit.ts`'s `createAuditPort` has no stable function name to key on) cover the
pre-existing, reviewed AI-4-3(d) isolated-best-effort writes, where no rollback-capable
transaction is ever in scope: `packages/channels/src/audit.ts`,
`apps/api/src/modules/device-token/push-invalidation.ts`,
`apps/api/src/modules/device-token/device-token.handlers.ts`. Adding a file here is a
deliberate, reviewed scope-widening edit, not something the gate infers.

On the **claim surface** this invariant is **self-green today and has real teeth**: the consent
path uses `withCompensatingAudit` (the canonical helper) and the other ~49 audit sites use the
`emitAuthAudit` post-commit sink (not a bare `audit.writeAuditEntry`), so nothing is flagged —
but a future handler that writes a bare `audit.writeAuditEntry` is caught (revert-sanity
verified on `claims.dpdpa-consent.handlers.ts`). No claim file needs an exemption.

## Per-epic scope-extension convention (AI-6-1)

Expanding this gate's scan scope is complete only when at least one invariant has **meaningful
semantic coverage** of the new surface — a green scan over new files alone proves nothing. When
an epic's primitive (Story-1) access surface lands: (1) add it to a `*_ROOTS` group in
`check.ts`; (2) confirm an invariant materially fires (or is vacuous-safe forward-coverage for a
real defect shape) and do **not** run one where it can only be vacuous for the wrong reason (the
validity invariant is deliberately not run over the claim surface); (3) prove teeth via
revert-sanity. See [`docs/access-wrapper-invariants.md`](../../docs/access-wrapper-invariants.md).

## Scope

The gate covers the **caller/internal fail-closed**, **constant-time secret-compare**, and
**compensating-audit mechanization** slices only. The rest of the pre-review checklist —
independent caller-authorization, HMAC/blind-index audit hashes, and permission-key
scope-dimension match — are judgment calls a heuristic static lint would false-positive on,
and are enforced by **convention + reviewer checklist** in
[`docs/access-wrapper-invariants.md`](../../docs/access-wrapper-invariants.md).

INVARIANT SCAN of the declared roots — not a git-diff (no `fetch-depth: 0`; mirrors
`member-state-invariant` / `domain-invariants`). Precision-scoped → self-green by
construction (each invariant only fires on its own defect shape).
