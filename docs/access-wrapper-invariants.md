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

This is the human half of AI-4-3. Item **(a)** is additionally **mechanized** by the
[`access-wrapper-invariants`](../scripts/access-wrapper-invariants/README.md) CI gate (the
cheapest, most-corrosive slice — 4.6's default-open failure). Items **(b)–(e)** are
judgment calls a heuristic lint would false-positive on, so they stay checklist + required-test.

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

---

## How to use it

- **Author:** walk (a)–(e) before opening the PR; for each, link the test that proves it (a required test, not a vacuous one — retro H-7).
- **Reviewer:** the code-review pass confirms each item is addressed or explicitly N/A with a reason.
- **CI:** `pnpm access-wrapper:check` mechanically enforces (a)/(b) for validity access entrypoints. It runs in `ci.yml` (`access-wrapper-invariants` job) and `pnpm ci:local`.

## Relationship to the AST gate

The gate is deliberately **narrow** (validity-service access entrypoints, the (a)/(b)
default-open slice) — "mechanize the cheapest / most-corrosive slice, sharpen the review
for the rest". As Epic 5's channel/webhook/consent entrypoints stabilize, the gate's scan
scope can be widened to cover them; until then (c)–(e) and the Epic 5 surfaces are carried
by this checklist + required tests.
