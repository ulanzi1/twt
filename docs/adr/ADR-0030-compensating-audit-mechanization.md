# ADR-0030: Mechanize the compensating-audit pattern (`writeCompensatingAudit` → shared `withCompensatingAudit` helper + AST gate) for `channel-config` + `degraded-mode`

> **Status:** ratified
> **Date:** 2026-07-08 (date entered current status)
> **Author:** BigDev (Solo Builder), at Epic 5 retrospective AI-5-3 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — ratified at the 2026-07-08 Trustee Panel session; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-07-08.md`; logged in `.decision-log.md` Decision 2026-07-08-065
> **Supersedes:** —
> **Superseded by:** —

## Context

Epic 5's retrospective (`epic-5-retro-2026-07-08.md`, H-4/I-1) flagged a systemic gap:
the **compensating-audit pattern is review-enforced, never mechanized.** Four modules
already hand-roll the correct pattern — write the intent audit line FIRST (via
`deps.servicePool`, its own always-committing connection), then perform the state
mutation (via a rollback-capable transaction — either the request-scoped
`request.scopeTx.tx`, committed/rolled back in the `onSend` hook per
`apps/api/src/modules/multi-tenant/index.ts` L21-27, or a handler-opened
`scopeTx.tx` from `openScopeTx`/`closeScopeTx`); on ANY failure after the audit line
durably commits, a `catch` fires a second, best-effort audit line whose `action` ends
in `_rolled_back` (status 500), then rethrows the original error without ever masking
it:

- `apps/api/src/modules/wa-opt-in/handlers.ts` (`writeOptInAudit` / `writeCompensatingAudit`,
  L57-113; e.g. `member.wa_opt_in_requested_rolled_back` at L193,
  `member.wa_opt_in_revoked_rolled_back` at L289)
- `apps/api/src/modules/telegram-opt-in/handlers.ts` (identical closures, e.g.
  `member.telegram_opt_in_requested_rolled_back`, `member.telegram_opt_in_revoked_rolled_back`)
- `apps/api/src/modules/terms/member-terms.handlers.ts` (`member_terms.accept_rolled_back`, L194)
- `apps/api/src/modules/medical/medical.handlers.ts` (`member_medical.disclosure_rolled_back`, L286)

**The property this closes a gap in:** the audit ledger must never claim a state
transition happened when the corresponding mutation did not durably land. The
divergence is structural: the audit write and the domain mutation execute against two
different commit horizons whenever the mutation runs on a still-open, rollback-capable
transaction while the audit runs on `deps.servicePool` (which commits immediately,
independent of what happens to that transaction afterward). Nothing in the
architecture names this compensating-audit shape directly; it emerged story-by-story
and was caught story-by-story in review (3.5 medical, 3.6a terms, 5.4 WA opt-in, 5.5
Telegram opt-in) — never given a durable home or a gate.

**Not every `audit.writeAuditEntry` call site has this risk shape.** Direct inspection
of every call site across the Epic-5 access surface (`packages/channels/src` +
the `apps/api` entrypoints AI-5-1's gate already scans — `channel-webhooks`,
`wa-opt-in`, `telegram-opt-in`, `channel-config`, `degraded-mode`, `device-token`)
surfaces a second, DIFFERENT, already-correct pattern:

- `packages/channels/src/audit.ts` `createAuditPort` — the dispatcher's audit port
  (Story 5.1, AI-4-3(d)) writes via `servicePool` with no surrounding transaction at
  all (the dispatcher holds no request tx); failures are logged and swallowed, never
  thrown into the send path.
- `apps/api/src/modules/device-token/push-invalidation.ts` `writeInvalidationAudit`
  and `apps/api/src/modules/device-token/device-token.handlers.ts`
  `writeRegistrationAudit` — both explicitly documented "isolated best-effort write"
  (AI-4-3(d)): the mutation itself runs on `deps.serviceDb`/`deps.servicePool` (not a
  rollback-capable request tx), so there is nothing for a subsequent audit failure to
  diverge from — the accepted risk is a missing audit line for an event that did
  happen, never a persisted audit line for an event that didn't.

These are correct as shipped and **must not** be disturbed by this ADR's gate (see
Non-goals). The two patterns are distinguished by one structural fact: whether a
rollback-capable transaction handle (`scopeTx.tx` / `request.scopeTx.tx`) is in scope
at the point of the audit write. Where it is, the audit and the mutation can diverge
and compensation is required. Where it isn't, AI-4-3(d)'s isolated-best-effort
discipline already governs and is sufficient.

Two modules shipped in Epic 5 **without** compensation, confirmed by direct
inspection, and both hold a rollback-capable `tx` at the point of the audit write:

- `apps/api/src/modules/channel-config/handlers.ts` — `putWaConfig` (L83-143:
  `channelConfig.upsertWaConfig` on `tx` at L88 → unconditional `audit.writeAuditEntry`
  at L103, action `pariwar.wa_config_update`, no try/catch), `putWaTemplate` (L159+:
  `upsertWaTemplate` → `pariwar.wa_template_update`, no try/catch), `putTelegramConfig`
  (L240+: `upsertTelegramConfig` → `pariwar.telegram_config_update`, no try/catch).
  `tx` here is `request.scopeTx.tx`.
- `apps/api/src/modules/degraded-mode/handlers.ts` — `declare` (L62-103:
  `degradedMode.declareDegradedMode` on `tx` at L69 → unconditional
  `audit.writeAuditEntry` at L79, action `pariwar.degraded_mode.declared`, no
  try/catch), `revoke` (L106-143: `degradedMode.revokeDegradedMode` on `tx` at L111 →
  conditional (`if (revoked)`) `audit.writeAuditEntry` at L120, action
  `pariwar.degraded_mode.revoked`, no try/catch). `tx` here is also
  `request.scopeTx.tx`.

Five call sites total, two files. 5.8's Dev Record noted this explicitly: *"not
specific to this story — `channel-config/handlers.ts` has the identical ordering
unaddressed too."* Confirmed recorded-and-deferred, not silently dropped, per
[[feedback_record_unattested_no_backfill]].

**No shared helper exists.** All four correct implementations are independently
hand-rolled, near-identical local closures (`writeOptInAudit`/`writeCompensatingAudit`
in both opt-in modules; inline equivalents in `terms`/`medical`) — the pattern has
already paid its "rule of three" dues four times over without ever being extracted.
Per [[feedback_mechanization_split_commitment]] (Epic 5's own headline: *"you can build
the gate and still miss the target"*), leaving this convention-only means every future
module (Epic 6's claim state machine, peer verification, ground inspection, internal
appeal — all mutation+audit-heavy, per the retro's Epic 6 preview) inherits the same
risk of a reviewer having to catch it fresh, on a much larger and higher-stakes surface
(₹50L per claim decision).

**Decision deadline:** before Epic 6 begins landing its own mutation+audit surfaces
(claim filing is wall-to-wall the same shape) — flagged critical-path-adjacent
("cheapest-slice candidate") in the Epic 5 retro §8.

## Decision

**Mechanize.** Extract the four-times-duplicated compensating-audit closures into one
shared helper in `packages/domain/src/audit`, apply it to close the five known gaps in
`channel-config` + `degraded-mode`, and add a scoped AST check — modeled on this
epic's own `scripts/access-wrapper-invariants/check.ts` precedent (AI-5-1) — that
enforces the **positive invariant that mutation+audit code must flow through
`withCompensatingAudit`**, rather than trying to detect the deficient shape via
mutation-call-name heuristics. This is the cheap-slice half of BigDev's standing
"mechanize the cheapest, most-corrosive family; sharpen review on the rest" split
([[feedback_mechanization_split_commitment]]): the correct shape already exists four
times over, the gap is five call sites in two files, and the AST-scanning
infrastructure to enforce it going forward was just built this epic.

**Rationale.** The project now has four independently correct implementations of the
same protocol and five confirmed omissions of that protocol. This exceeds the
project's extraction threshold ("rule of three") while keeping the implementation
surface intentionally small. Standardizing the protocol in one helper and enforcing
it with a narrowly scoped AST invariant reduces future review burden without changing
the underlying transaction architecture or audit durability model.

### 0. Normative criteria — when `withCompensatingAudit` is required

A function **MUST** route its audit write through `withCompensatingAudit` when it
holds a **rollback-capable transaction handle** (`scopeTx.tx` from a handler-opened
`openScopeTx`, or `request.scopeTx.tx` set by `scopeResolutionHook`) at the point it
performs a domain-state mutation and then records an audit line for it. That handle's
commit is deferred (to `closeScopeTx` or the `onSend` hook) and can still roll back
after `deps.servicePool`'s audit write has already durably committed — the exact
divergence window this pattern closes.

A function **MAY continue to call `audit.writeAuditEntry` directly** when no such
handle is in scope — i.e. the mutation itself (if any) already runs on an
always-committing connection (`deps.serviceDb` / `deps.servicePool`) with no
surrounding rollback-capable transaction. This is the pre-existing, separate
AI-4-3(d) "isolated best-effort write" discipline (`createAuditPort`,
`writeInvalidationAudit`, `writeRegistrationAudit` — see Context) and is out of this
ADR's remit; the two disciplines are structurally distinguished, not overlapping.

This criterion is what the AST gate in §4 mechanizes — it keys on the **presence of a
rollback-capable transaction handle in the function's scope**, not on enumerating
mutation-call names, so it stays correct as new domain accessors are added without
requiring the gate's vocabulary to grow. The exact detection strategy (which concrete
handle shapes count, how the scan recognizes one) is an implementation detail of §4,
left to the authoring commit rather than fixed by this ADR.

### 1. Extract `withCompensatingAudit` into `packages/domain/src/audit`, owning the full protocol

A single exported helper replaces the duplicated closures and owns **both** audit
writes — callers never call `audit.writeAuditEntry` directly for this class of
call site:

```ts
// packages/domain/src/audit/compensating.ts
export interface AuditIntentArgs {
  pariwarId: string;
  actorId: string | null;
  actorRole: string | null;
  /** The primary action name. The compensating line fires as `${action}_rolled_back`
   *  — never a separately supplied string, so the two can never drift apart. */
  action: string;
  resourceLocator: string;
  requestPayloadHash: string;
  traceId: string | null;
}

/**
 * Write the intent audit line FIRST (own tx via `pool`), then run the mutation. On
 * any failure, fire a best-effort `${action}_rolled_back` compensating line (status
 * 500, own swallowed try/catch) and rethrow the original error, never masked.
 * Callers invoke this helper only after determining that an audit is required (see
 * §0/§2 for the idempotent-no-op pre-check pattern); once invoked, the helper always
 * emits both the intent audit and any required compensating audit.
 */
export async function withCompensatingAudit<T>(
  pool: Pool,
  args: { auditIntent: AuditIntentArgs; mutate: () => Promise<T> },
): Promise<T> {
  await audit.writeAuditEntry(pool, { ...args.auditIntent, responseStatus: 200 });
  try {
    return await args.mutate();
  } catch (err) {
    try {
      await audit.writeAuditEntry(pool, {
        ...args.auditIntent,
        action: `${args.auditIntent.action}_rolled_back`,
        responseStatus: 500,
      });
    } catch {
      // swallow — the original error is the one the caller must see.
    }
    throw err;
  }
}
```

Versus the originally-sketched shape (a separate `auditFirst`/`rollbackAction` pair of
caller-supplied closures/strings), this tightens the contract: the helper — not each
call site — owns firing both audit writes, deriving the compensating action name, and
swallowing the compensating write's own failure. A caller can no longer pass a
`rollbackAction` that drifts from `action`, and can no longer accidentally skip the
compensating attempt.

### 2. Apply to the five known gaps

- `putWaConfig` / `putWaTemplate` / `putTelegramConfig` — each becomes one
  `withCompensatingAudit(deps.servicePool, { auditIntent: {...}, mutate: () =>
  channelConfig.upsertWaConfig(tx, ...) })` call. Each is a single unconditional
  upsert; no re-entrancy concern.
- `declare` — same shape, `action: 'pariwar.degraded_mode.declared'`.
- `revoke` — this is the one call site that is genuinely NOT the "always audit"
  shape (its own comment: *"a no-op must not produce an audit line claiming a
  revocation happened"*). Rather than teach the helper a second, conditional-audit
  mode, **refactor `revoke` to match the established idempotent-precheck idiom**
  `wa-opt-in`/`telegram-opt-in` already use for their own idempotent paths (e.g.
  `wa-opt-in`'s `revoke` pre-reads `getOptInForMember` and short-circuits before ever
  reaching the audit-or-mutate section): call `degradedMode.getActiveDegradedMode`
  (already used at the end of the handler for the response read) FIRST; if the
  target declaration isn't active, return `{ active: null }` immediately with **no**
  `withCompensatingAudit` call at all. Only when there is something to revoke does
  the handler enter `withCompensatingAudit` — which then always audits, uniformly
  with every other call site. This keeps the helper's contract narrow (§1) instead of
  growing a `null`-returning branch to accommodate one caller.

### 3. Backfill the four existing correct implementations onto the shared helper

`wa-opt-in`, `telegram-opt-in`, `terms`, `medical` refactor their local closures to
call `withCompensatingAudit` too — not because they're broken, but because leaving
four hand-rolled copies alongside one shared helper guarantees the next mirror-copy
(I-2, AI-5-5) forks from a duplicate instead of the canonical helper, and because §4's
AST gate needs exactly one conformant shape to check against across the whole
surface. Zero behavior change; refactor-only, covered by each module's existing test
suite.

### 4. AST gate — positive invariant, not mutation-name heuristics

Model directly on `scripts/access-wrapper-invariants/lib.ts`'s existing shape (both of
its invariants are already "conformant iff X" checks with a narrow precondition — the
fail-closed guard, and the constant-time-compare-within-a-verification-context — never
an open-ended "does this look like a mutation" heuristic). The new invariant:

> Within a function that holds a rollback-capable transaction handle in its own scope,
> every `audit.writeAuditEntry` call must resolve to a call **inside**
> `packages/domain/src/audit/compensating.ts` (i.e. reached only via
> `withCompensatingAudit`) — a direct `audit.writeAuditEntry` call anywhere else in
> such a function is flagged.

A function with **no** such transaction handle in scope is outside the invariant's
reach by construction — exactly like invariant 2's "verification context" gating, no
synthetic global minimum is asserted. This is what keeps `createAuditPort` /
`writeInvalidationAudit` / `writeRegistrationAudit` (§0, Non-goals) green without any
per-file exemption list: they simply never hold a rollback-capable transaction handle,
so the invariant never fires on them. The exact detection mechanics (which handle
shapes today's codebase uses, and how the scan recognizes them) are an implementation
choice for the authoring commit, not fixed by this ADR — today that shape happens to
be `scopeTx.tx` / `request.scopeTx.tx`, but the invariant is stated in terms of the
architectural property (rollback-capable transaction handle in scope) so the ADR
stays accurate if that concrete shape is later renamed or refactored. DB/network-free
static scan, same discipline as AI-5-1. Scope: the same `packages/channels/src` +
`apps/api` access-entrypoint roots AI-5-1's `SCAN_ROOT` already declares, so the two
gates share one surface definition rather than drifting independently.

### 5. Land in two commits

1. **Commit 1** — this ADR + the `withCompensatingAudit` helper + the five missing
   call sites (`channel-config` ×3, `degraded-mode` ×2, including the `revoke`
   precheck refactor).
2. **Commit 2** — backfill the four existing implementations onto the helper (§3) +
   the AST gate (§4).

Splitting this way means if the helper's API needs to change during review of Commit
1, only that focused commit is touched — the four-module backfill and the gate (which
both depend on the helper's final shape) land once it's settled, instead of needing a
second pass across six files.

## Non-goals

- **Not** changing the two-commit-horizon architecture itself (`deps.servicePool`
  always-commits vs. a request-scoped/handler-opened `tx` that can roll back later).
  That split is a deliberate Story 1.10 design choice (the audit ledger's durability
  must not depend on the outcome of the request it describes) and is not reopened
  here.
- **Not** fixing the residual risk that `closeScopeTx`'s own COMMIT can fail
  end-of-request (a deferred-constraint violation at commit time, outside any
  application-level try/catch) — see Consequences → Failure modes accepted. This is a
  smaller, already-shared risk across all nine implementations (the four backfilled
  plus the five fixed) and is not introduced or worsened by this ADR.
- **Not** touching the isolated-best-effort audit writes identified in Context
  (`packages/channels/src/audit.ts` `createAuditPort`,
  `device-token/push-invalidation.ts` `writeInvalidationAudit`,
  `device-token/device-token.handlers.ts` `writeRegistrationAudit`). These hold no
  rollback-capable transaction handle, are governed by the pre-existing AI-4-3(d)
  discipline, and the §4 gate is specifically designed to leave them alone.
- **Not** a whole-codebase retrofit beyond the four backfilled + five fixed call sites
  named here. Any other module the AST gate surfaces later (in Epic 6+) is handled at
  that time through the same helper, not pre-emptively hunted down by this ADR.
- **Not** specifying the exact CI-job wiring (a new job vs. extending the
  `access-wrapper-invariants` job) — left to the implementing commit, consistent with
  how ADR-0013/0014/0015 left exact script/job topology to their authoring stories.

## Alternatives considered

- **Accept as a documented per-surface convention (no gate)** — Rejected: this is
  exactly the split-commitment shape Epic 4/5 diagnosed twice already
  ([[feedback_mechanization_split_commitment]]); a convention with zero enforcement
  decays the moment review attention moves to Epic 6's much larger claim-filing
  surface. The marginal cost here is low (helper already proven 4x; 5 call sites) —
  this is the "mechanize the cheapest slice" case, not the "sharpen review" case.
- **Detect the deficient shape via mutation-call-name heuristics** (flag a
  `@twt/domain` call matching `upsert*`/`declare*`/`revoke*`/`create*` adjacent to a
  bare `audit.writeAuditEntry`) — Rejected (this was the original sketch; superseded
  during review). An open-ended verb lexicon drifts the moment a new accessor is
  named differently, produces false negatives silently, and inverts the burden of
  proof. Keying on the **positive** invariant — "reached only through
  `withCompensatingAudit`," gated on a rollback-capable transaction handle being in
  scope — is closed-vocabulary and stable, and mirrors how both of
  `access-wrapper-invariants`'s existing checks are already phrased ("conformant iff
  guard present or pure delegator"; "conformant iff routed through an approved
  comparator").
- **Wrap the mutation in a DB-level compensating transaction/trigger instead of an
  application-level catch** — Rejected: the actual race is between two *different*
  connections/pools (`deps.servicePool` vs. the request-scoped `tx`), not a single-tx
  invariant a DB trigger could enforce. Collapsing that separation is out of scope
  (see Non-goals).
- **A generic ESLint rule requiring `try/catch` around every `writeAuditEntry` call** —
  Rejected: too broad — it would flag the isolated-best-effort call sites (Context)
  that correctly call `writeAuditEntry` directly with no mutation to compensate for.
  The invariant must be conditioned on transaction-handle presence, not fire
  universally.
- **Defer the AST gate; ship only the extracted helper + the 5-site fix** — Considered
  but not preferred: this is the same split-commitment shape as AI-4-3 one retro ago
  (a control built but not applied, or applied but not gated) — BigDev's standing
  guidance is to close the loop when the marginal gate cost is this low, given the
  scanning infra now exists from AI-5-1.

## Consequences

- **Operational** — One new (or extended) CI job, DB/network-free, runs in parallel
  with the existing `access-wrapper-invariants` job; negligible runtime.
- **Security / governance** — Directly hardens the audit ledger's integrity guarantee
  (Story 1.10 hash-chain) against the "mutation and audit diverge across a commit-tx
  boundary" failure mode, ahead of Epic 6's claim-filing surface where the same shape
  recurs at much higher stakes (₹50L/decision).
- **Performance** — No runtime performance impact (compile-time/CI-time check only);
  the runtime helper is a thin wrapper around the existing two `writeAuditEntry` calls,
  same DB round-trips as today.
- **Cost** — Negligible (two small PRs touching 7 files total + one new/extended CI
  job).
- **Failure modes accepted** — The helper does not protect against `closeScopeTx`'s own
  COMMIT failing at end-of-request (a deferred-constraint violation at commit time,
  outside any application-level try/catch) — this is a pre-existing, narrower residual
  risk shared by all nine implementations; out of scope for AI-5-3 (see Non-goals).
  Recorded as an accepted residual, not silently dropped.
- **Migration / pivot path** — If the AST check produces excessive false positives once
  scanning `packages/channels` + `apps/api` broadly (unlike `access-wrapper-invariants`,
  which had a full epic of stable code to calibrate against), the fix is to correct
  how the scan recognizes a rollback-capable transaction handle (the closed,
  structural signal), never to fall back to a mutation-name lexicon — that
  reintroduces the rejected alternative.

## References

- [Source: `epic-5-retro-2026-07-08.md` §3 H-4, §4 I-1, §7 AI-5-3, §8, §9] — the
  originating retrospective finding and action item
- [Source: `apps/api/src/modules/wa-opt-in/handlers.ts` L57-298] — the canonical
  correct pattern (`writeOptInAudit`/`writeCompensatingAudit`, audit-first + catch +
  `_rolled_back` compensation) including the idempotent-precheck idiom `revoke`'s
  409-on-nothing-to-revoke shape uses, mirrored for `degraded-mode.revoke`'s refactor
- [Source: `apps/api/src/modules/telegram-opt-in/handlers.ts`] — identical duplicated
  pattern
- [Source: `apps/api/src/modules/terms/member-terms.handlers.ts` L194,
  `apps/api/src/modules/medical/medical.handlers.ts` L286] — the earlier (3.5/3.6a)
  precedent this pattern originates from
- [Source: `apps/api/src/modules/channel-config/handlers.ts` L83-143, L159+, L240+;
  `apps/api/src/modules/degraded-mode/handlers.ts` L62-143] — the five confirmed gaps
- [Source: `apps/api/src/modules/multi-tenant/index.ts` L19-35] — the `onSend`
  commit-on-2xx/rollback-otherwise scope-tx lifecycle that creates the two-commit-horizon
  race this pattern compensates for
- [Source: `packages/channels/src/audit.ts` `createAuditPort`;
  `apps/api/src/modules/device-token/push-invalidation.ts` `writeInvalidationAudit`;
  `apps/api/src/modules/device-token/device-token.handlers.ts`
  `writeRegistrationAudit`] — the pre-existing AI-4-3(d) isolated-best-effort-write
  discipline this ADR's gate must not disturb (Non-goals)
- [Source: `scripts/access-wrapper-invariants/lib.ts` + `check.ts` +
  `docs/access-wrapper-invariants.md`] — the AI-5-1 multi-root AST-scanner precedent
  this gate is modeled on, including its "conformant iff X, precondition-gated" shape
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`] — 5.8's recorded
  deferral cross-referencing `channel-config/handlers.ts`
- Memory: [[feedback_mechanization_split_commitment]] — mechanize-the-cheapest-slice
  discipline anchor
- Memory: [[feedback_record_unattested_no_backfill]] — recorded-and-deferred, not
  silently dropped, discipline anchor
- Memory: [[project_access_wrapper_gate_pending_scope]] — the AI-5-1 sibling gate this
  one is modeled on and shares a scan-surface definition with

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-08 | (initial draft) | BigDev (Solo Builder) | Authored at Epic 5 retrospective AI-5-3 closure |
| 2026-07-08 | drafted (revised) | BigDev (Solo Builder) | Pre-ratification amendments: AST gate keys on the positive "reaches `withCompensatingAudit`" invariant gated on transaction-handle presence (not mutation-name heuristics); helper tightened to own both audit writes (no caller-supplied `rollbackAction`); `degraded-mode.revoke` refactored to an idempotent precheck instead of teaching the helper a conditional-audit mode; added Non-goals; sequenced as two commits |
| 2026-07-08 | drafted (revised 2) | BigDev (Solo Builder) | Second pre-ratification pass: added a Rationale paragraph after Decision (rule-of-three threshold; scope of what changes vs. doesn't) for trustee-facing justification; softened AST-mechanics language throughout (`scopeTx`/`ScopeTx`-typed handle → "rollback-capable transaction handle") so the ADR states the architectural property, not the current implementation shape, leaving exact detection mechanics to the authoring commit; clarified the caller/helper responsibility split in `withCompensatingAudit`'s doc comment |
| 2026-07-08 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-07-08 Trustee Panel session (consent sheet `adr-ratification-consent-sheet-2026-07-08.md`, light-touch — same family as ADR-0012–0015); no amendment recorded; Decision 2026-07-08-065. |
