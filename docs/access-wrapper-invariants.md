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
CI gate mechanizes **three** slices (the cheapest, most-corrosive ones):
- **(a)/(b)** — validity access entrypoints fail closed on an omitted caller (AI-4-3, 4.6's default-open failure), scanned over `packages/validity-service/src`.
- **(f)** — verification contexts use a constant-time secret compare (AI-5-1, the Story 5.4 `hub.verify_token` timing side-channel), scanned over the Epic-5 channel surface **and — as of AI-6-1 — the Epic-6 claim surface**.
- **(g)** — mutation+audit pairs route through the compensating-audit helper (AI-5-3 / ADR-0030, the H-4 audit-write-ordering gap), scanned over the same channel **and claim** surface.

Items **(c)–(e)** are judgment calls a heuristic lint would false-positive on, so they stay
checklist + required-test. As of **AI-6-1**, Epic 6's claim access surface
(`apps/api/src/modules/{claims,nominee}` + `packages/domain/src/claim`) is scanned by
**(f)** and **(g)** — closing the recurring "gate covers the *previous* epic" miss (retro
H-1/I-1). The validity invariant **(a)/(b)** is deliberately *not* run over the claim surface
(no `MemberValidityPayload` boundary exists there — it would be vacuous for the wrong reason;
see the scope-extension convention below).

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

### (g) A mutation + its audit line are paired via the compensating-audit helper — **gated** ⚙️
When a handler performs a domain-state mutation and records an audit line for it, the
audit write must go through `audit.withCompensatingAudit` (`packages/domain/src/audit/compensating.ts`)
— never a bare `audit.writeAuditEntry` call — so a failure after the intent line durably
commits fires a compensating `${action}_rolled_back` line instead of leaving the ledger
claiming a transition that never landed.
- **Epic 5 defect (H-4):** `channel-config`/`degraded-mode` shipped 5 mutation+audit pairs
  with no compensation at all, while four OTHER modules (`wa-opt-in`, `telegram-opt-in`,
  `terms`, `medical`) had already hand-rolled the correct pattern independently — never
  extracted into a shared helper.
- Enforced by CI over the same channel access surface (`pnpm access-wrapper:check`). A
  handful of pre-existing, reviewed AI-4-3(d) isolated-best-effort writes (no
  rollback-capable transaction in scope at all — dispatch's audit port, device-token's
  invalidation/registration audits) are exempt **by file**, named explicitly in
  `scripts/access-wrapper-invariants/lib.ts`.

---

## How to use it

- **Author:** walk (a)–(e) before opening the PR; for each, link the test that proves it (a required test, not a vacuous one — retro H-7).
- **Reviewer:** the code-review pass confirms each item is addressed or explicitly N/A with a reason.
- **CI:** `pnpm access-wrapper:check` mechanically enforces (a)/(b) for validity access entrypoints, (f) for channel verification contexts, **and** (g) for mutation+audit pairs. It runs in `ci.yml` (`access-wrapper-invariants` job) and `pnpm ci:local`.

## Relationship to the AST gate

The gate is deliberately **narrow by invariant, but now honest about scope** — one gate,
three mechanized slices, each scanned over the code its commitment is about:
- **(a)/(b)** over `packages/validity-service/src` — the validity caller/internal fail-closed slice.
- **(f)** over the channel surface (`packages/channels/src` + the `apps/api` channel entrypoints: `channel-webhooks`, `wa-opt-in`, `telegram-opt-in`, `channel-config`, `degraded-mode`, `device-token`) **and the claim surface** (`apps/api/src/modules/{claims,nominee}`, `packages/domain/src/claim`) — the constant-time secret-compare slice.
- **(g)** over the SAME channel **+ claim** surface — the compensating-audit mechanization slice (AI-5-3 / ADR-0030).

This closes the AI-4-3 → AI-5-1 → AI-5-3 → **AI-6-1** chain the Epic-4/5/6 retros flagged (I-1,
"you can build the gate and still miss the target"): each new mechanized slice — and each
scope extension — reads the code its own commitment was actually about, rather than widening
an existing scanner past its precision or leaving the next corrosive-family instance to
convention alone. Items **(c)–(e)** remain "mechanize the cheapest / most-corrosive slice,
sharpen the review for the rest" — carried by this checklist + required tests. When a future
slice becomes cheaply mechanizable, add it as a fourth invariant scanner rather than widening
an existing one past its precision.

## Per-epic scope-extension convention (AI-6-1)

> **Principle.** Expanding a gate's scan scope is only *complete* when at least one existing
> invariant has **meaningful semantic coverage** of the new surface. Merely producing a green
> scan over additional files is not evidence that the gate now protects that surface.

For **three epics running** the mechanized gate covered the *previous* epic's surface: it scanned
validity (Epic 4), then channels (Epic 5), while each epic in turn built a new access surface
outside the roots — the scope of a control is itself a per-epic commitment that decays. AI-6-1
turns closing that miss into a **standing item on every epic's primitive (Story-1) access story**:

1. **Extend `SCAN_ROOTS`** — add the epic's new access surface to a `*_ROOTS` group in
   `scripts/access-wrapper-invariants/check.ts` (a new group, or an existing one).
2. **Confirm meaningful semantic coverage** — identify at least one invariant that *materially
   fires* on the new surface (or is vacuous-safe forward-coverage for a real defect shape that
   surface can grow), and do **not** run an invariant over a root where it can only be vacuous
   for the wrong reason (e.g. the validity `MemberValidityPayload` invariant over the claim
   surface). A green scan over the new files alone does **not** close the item.
3. **Prove teeth** — revert-sanity: introduce the defect shape on the new surface, confirm the
   gate goes red naming the file, restore.

This is verified **before the epic's first access story merges**, so the gate grows *with* the
code instead of a retro catching the miss two epics later.
