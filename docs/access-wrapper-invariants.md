# Access-wrapper pre-review checklist (AI-4-3)

**Source:** Epic 4 retrospective (`_bmad-output/implementation-artifacts/epic-4-retro-2026-07-05.md`),
action item **AI-4-3** — confirmed by BigDev 2026-07-05 as *checklist + focused AST gate*.

**Why this exists.** Every real correctness/security defect in Epic 4 landed in the
**access wrapper**, not the compute core (retro insight **I-3** — "the access wrapper is
the new TOCTOU"). The pure engine and payload assembly held; the redaction/audit/caller
boundary is where things broke — five times. Epic 5 is **wall-to-wall this family**: every
story adds a new access / webhook / consent path (alert dispatch, WhatsApp inbound
webhook, member opt-in, step-up-OTP delivery). This checklist is the **required walk for
every new access / webhook / consent path** before it merges.

This is the human half of the family. The [`access-wrapper-invariants`](../scripts/access-wrapper-invariants/README.md)
CI gate mechanizes **two** slices (the cheapest, most-corrosive ones):
- **(a)/(b)** — validity access entrypoints fail closed on an omitted caller (AI-4-3, 4.6's default-open failure), scanned over `packages/validity-service/src`.
- **(f)** — channel verification contexts use a constant-time secret compare (AI-5-1, the Story 5.4 `hub.verify_token` timing side-channel), scanned over the Epic-5 channel + `apps/api` access surface.

Items **(c)–(e)** are judgment calls a heuristic lint would false-positive on, so they stay
checklist + required-test. Epic 6's claim access surface inherits both mechanized invariants
from day one.

---

## The checklist

For every new or modified access / webhook / consent entrypoint, verify each item and
name the covering test:

### (a) Caller authorization is verified independently — **gated** ⚙️
Never trust a caller-supplied boolean for "is this allowed". A self/authorization flag
passed *into* the function is not verification — resolve it from the caller's own grants +
the resource locator.
- **Epic 4 defect:** 4.6 trusted a caller-supplied `isSelf` boolean with no verification.
- **Also gated:** the entrypoint must fail **closed** on an omitted caller — `if (!opts.caller && !opts.internal) throw …` — so it can't default to returning a full unredacted payload. A genuine trusted system call passes `{ internal: true }` **explicitly**. Enforced by CI (`pnpm access-wrapper:check`).

### (b) The omitted-caller / default path fails CLOSED — **gated** ⚙️
There is no "no caller supplied → return everything" branch. The default is denial, not
full disclosure.
- **Epic 4 defect:** 4.6's omitted-caller path returned the full, unredacted, **unaudited** payload by default.
- Covered by the same AST gate as (a): an entrypoint that returns the payload without the guard is rejected.

### (c) Audit hashes use HMAC / blind-index, never raw PII
Any hash written to an audit row or used as a lookup key over PII must be an HMAC / blind
index with a server-held key — never `sha256(rawValue)`, which is brute-forceable over a
small domain (phone numbers, IDs).
- **Epic 4 defect:** 4.7 wrote an unsalted `sha256(raw mobile)` audit hash.

### (d) Best-effort writes run on an ISOLATED connection
A non-blocking / best-effort write (cache fill, telemetry, opportunistic upsert) must use
a dedicated `servicePool` connection — never the caller's request/transaction (`scopeTx`).
A Postgres-level failure on the caller's tx would otherwise poison and roll back the whole
request.
- **Epic 4 defect:** 4.8's best-effort cache write on the caller's `scopeTx` could downgrade a cache-write failure into a whole-request rollback.

### (e) A new permission key's scope dimension matches the route's scope check
When you add an RBAC permission key, its **scope dimension** (e.g. `pariwar` vs
`state`/`tenant-wide` vs `self`) must match the scope the route actually enforces. A
**read** permission must not gate a tenant-wide **mutation**; a check at the wrong scope
either over-permits or 403s the legitimate role.
- **Epic 4 defects:** 4.8 gated *tenant-wide* cache invalidation behind a **read** key (`member.view_validity`) — split out to a dedicated `validity.invalidate_cache` key; and a `state_trustee`-vs-`pariwar_admin` scope mismatch 403'd the legitimate caller (only a live-DB test surfaced it, retro H-2).

### (f) Credential compares are constant-time — **gated** ⚙️
Inside a **verification context** (a function that checks an incoming credential — computes
an HMAC, reads a signature / verify-token header, or resolves a channel secret for
comparison), any compare of two runtime values must go through an approved constant-time
comparator (`timingSafeEqual` / `timingSafeEqualString` / `timingSafeHashCompare`) — never
`===`/`!==`/`==`/`!=` or `.includes`/`.startsWith`/`.localeCompare`, which leak an
early-exit / byte-wise timing side-channel.
- **Epic 5 defect:** 5.4 compared the webhook `hub.verify_token` with a plain `!==`.
- Enforced by CI over the channel access surface (`pnpm access-wrapper:check`). Legitimate
  control-flow compares against a literal (`mode !== 'subscribe'`), a `.length` shape guard,
  or a local const-literal prefix are exempt by construction — the gate only bites on a
  runtime-vs-runtime credential compare.

---

## How to use it

- **Author:** walk (a)–(e) before opening the PR; for each, link the test that proves it (a required test, not a vacuous one — retro H-7).
- **Reviewer:** the code-review pass confirms each item is addressed or explicitly N/A with a reason.
- **CI:** `pnpm access-wrapper:check` mechanically enforces (a)/(b) for validity access entrypoints **and** (f) for channel verification contexts. It runs in `ci.yml` (`access-wrapper-invariants` job) and `pnpm ci:local`.

## Relationship to the AST gate

The gate is deliberately **narrow by invariant, but now honest about scope** — one gate,
two mechanized slices, each scanned over the code its commitment is about:
- **(a)/(b)** over `packages/validity-service/src` — the validity caller/internal fail-closed slice.
- **(f)** over the Epic-5 channel surface (`packages/channels/src` + the `apps/api` channel entrypoints: `channel-webhooks`, `wa-opt-in`, `telegram-opt-in`, `channel-config`, `degraded-mode`, `device-token`) — the constant-time secret-compare slice.

This closes the AI-4-3 → AI-5-1 split the Epic-5 retro flagged (I-1, "you can build the gate
and still miss the target"): the gate previously scanned only `validity-service` and read
none of Epic 5's access surface. It now does. Items **(c)–(e)** remain "mechanize the
cheapest / most-corrosive slice, sharpen the review for the rest" — carried by this
checklist + required tests. When a future slice becomes cheaply mechanizable, add it as a
third invariant scanner rather than widening an existing one past its precision.
