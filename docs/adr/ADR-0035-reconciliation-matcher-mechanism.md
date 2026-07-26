# ADR-0035: Reconciliation UTR-matcher mechanism (OQ-2)

> **Status:** drafted
> **Date:** 2026-07-26 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 9.4 closure
> **Ratifying trustees:** — (Trustee ratification is Story 14.7's AR-69 backlog closure, epics.md L4408; author-drafted/ratify-later split, precedent ADR-0026/0032/0033/0034)
> **Supersedes:** —
> **Superseded by:** —

## Context

adr-index row 104 (`ADR-NNNN-reconciliation-matcher-mechanism`, "Story 9.4 closure") reserved the
matcher-mechanism ADR (architecture §Deferred Decisions L188 OQ-2; §3.6). Story 9.2 landed the pure
parser + the `BankStatementEntry` shape (ADR-0032/0033); Story 9.3 landed the upload transport + the
`reconciliation.*` namespace + the blob store (ADR-0034). Story 9.4 is the `[PRIMITIVE]` **matcher
engine** — the FIRST live producer of `contribution.confirmed` (green), closing the forward contracts
Epic 8 (the Story 8.3 contributor list, the 8.6 Yogdaan Bahi green arm, the whole
[[project_contribution_event_name_contract]]) and Story 9.3 left standing. This ADR records the matcher's
mechanism + the seven ratified decisions (D1–D7) + the code-contract reconciliations.

## Decision

### Matching strategy (AC2)

**Primary** — exact string equality between a Story 8.4 `contribution.utr-attested` event's `utr` and a
persisted `BankStatementEntry.transaction_id_utr` (a null-UTR row is never matchable). **Secondary —
destination FIRST** (the 7.6/7.7 `contribution-binding.ts` precedence, AC3.10): the matched entry's
**provenance pool** (`bank_statement_entries.pool_id`, denormalized from the triggering
`reconciliation.statement-uploaded` event) must equal the attestation's assigned pool — a mismatch is
`wrong_pool` and amount is NEVER checked (AC6, never a silent remap). Only on a correct-destination deposit
is **amount** checked, then an optional **timestamp window**. The `matchPool` engine is PURE, deterministic,
and order-invariant (inputs canonicalized before matching — Story 4.6 replay-identity, mirroring the
pool-assignment engine [[project_pool_assignment_engine]]).

### The units trap (the single most likely wrong-data bug)

`pools.fixed_amount` is **whole INR**; `BankStatementEntry.amount` is **integer PAISE**. The matcher
reconciles `fixedAmount × 100 === amount` (via `classifyContributionAmount`) — a naive `fixed_amount ===
amount` would turn every confirmation into a mismatch. A frozen-vector test with a real ₹-pair locks it.

### The confirmed-event key reconciliation (code contract wins)

The epics §9.5 prose lists the `contribution.confirmed` payload as snake_case; the SHIPPED read contract
(`contribution/read.ts`) greps **`poolId`/`memberId`** (camelCase — `CONFIRMED_PAYLOAD_POOL_KEY`/
`_MEMBER_KEY`). The matcher emits **camelCase** (`poolId`, `memberId`, `alertId`, `utr`, `confirmedAt`,
`matchProvenance`) — the read views are the load-bearing contract; the snake_case is drafting drift (same
class as the `mismatch-detected` → `reconciliation-mismatch` correction).

### D1 — the reversal event is `reconciliation.confirmation-reversed` (the ONLY un-confirm path)

NOT `contribution.confirmation.reversed`. Story 8.10's `no-ingest-path` fence pins the `contribution.*`
vocabulary at exactly three; a fourth would trip it. The compensating reversal lives in the
`reconciliation.*` namespace (the 9.3 D6 precedent), matching the fence-dodge. Story 9.4 REGISTERS the type
+ its Zod payload (poolId, memberId, alertId, reversedConfirmedEventId, reasonCode, attestedByActorIds ≥1,
reversedAt) and PROVES the matcher never emits it (a source-scan structural test); **Story 9.8 is the
producer** (trustee step-up + reason-code + State-Trustee attestation). **Cross-story name contract:** Story
9.5's reversal-consumer read + 9.6's held-pill MUST key on the exact string `reconciliation.confirmation-reversed`.

### D2 — verdicts are appended on the ALERT stream (`stream_id = alertId`)

Co-located with the `contribution.utr-attested` claim they resolve, so a member's yellow-claim → green-verdict
history is linear on one stream for replay/audit. The confirmed READ is stream-agnostic (filters
`event_type` + `payload ->> 'poolId'`), so this is invisible to the read; the payload carries both `poolId`
and `alertId` regardless.

### D3 — the sender-VPA arm ships `{available:false}`

No member/sender VPA is collected anywhere in the substrate (distinct from the deferred nominee/**payee**
VPA, [[project_nominee_vpa_deferred_seam]] — this is the **sender/member** side). The arm returns
`{available:false, reason:'member_vpa_not_collected'}` on every confirmation's provenance and NEVER blocks a
confirmation (UTR + amount + window are the live signals). A dedicated member-VPA-collection story lights it
later — a named forward seam.

### D4 — persist the entries in a NEW `bank_statement_entries` table

Keyed on the deterministic `entry_id` (idempotent `ON CONFLICT DO NOTHING` upsert — a re-parse reproduces
the id, so a re-run never duplicates). `entry_id` is the `bank_statement_entry_id` idempotency-key component.
**Tier-1-adjacent PII posture (ADR-0034):** the source blob is Tier-1-encrypted; these re-derivable rows are a
matcher-read cache protected by tenant-isolation RLS (ENABLE + FORCE) and NEVER logged. Deliberately MINIMAL
columns — only the matcher-load-bearing + provenance fields persist; the high-cardinality free-text PII
(`sender_name`, `description`, verbatim `raw_row`, `running_balance`) is DROPPED, staying only in the
encrypted blob. Hand-authored migration 0083 + journal (never `db:generate` a new applied migration —
[[project_live_db_test_gotchas]]).

### D5 — the matcher EMITS `contribution.reconciliation-mismatch` (red)

The matcher is where a mismatch is DETECTED, so it is the emitter (epics §9.7 L3275); Story 9.7 builds the
member-facing `<SelfVerifySurface>` + screenshot on top. **Emission policy:** the LIVE matcher emits a
mismatch ONLY for a deposit FOUND-and-REJECTED (`wrong_pool` / `amount_mismatch`). A `no_statement_entry`
(the pure matcher still classifies it) is NOT emitted during the open window — a member who attested before
the statement was uploaded is legitimately PENDING (yellow), and a premature red would flip every fresh
attester. The "still no deposit after close" determination is a reconciliation-tail concern (Story 8.9 tail /
a future story), not 9.4's live matcher.

### D6 — 9.4 enqueues `CONTRIBUTION_NOTIFY_CONFIRMED` post-commit (best-effort)

The matcher is the post-commit site, so it fires the Story 8.8 confirmed-push seam best-effort — a failed
enqueue NEVER fails the confirmation (the sweep/next-tick heals). Single-wired at the emit site.

### D7 — build BOTH: enqueue-primary + a 4h cron sweep

The `cycle-open-alert` D4 lineage. The **recovery cron sweep** (`MATCHER_CRON`, default `0 */4 * * *` IST) is
the contracted "cron 6×/day" — it scans live alerts and re-enqueues per cycle. The **enqueue-primary** (the
apps/api reconciliation upload post-commit → `RECONCILIATION_MATCH`) is the latency optimizer (near-real-time
confirmation within the FR-30 p95 < 4h budget). Idempotency (the `(member, alert, entry)` keyed-store claim +
the monotonic pre-read) makes at-least-once delivery from EITHER path safe.

### The monotonic-confirmation invariant (three layers, defense in depth) — AC5

1. **Keyed store** — the `(member, alert, entry)` claim prevents two concurrent ticks double-confirming.
2. **Event-level pre-read** — before emitting `confirmed` for `(member, alert)`, check none exists; a re-run
   is a no-op. Also: no red-after-green (a confirmed member is skipped for ALL verdicts). This is what makes
   "confirmation only moves forward" true across runs.
3. **Append-only events_log** (Story 1.3 immutability trigger) — a direct UPDATE that would un-confirm fails
   at the DB. The matcher simply has NO reversal-emit code path (structural — proven by a source-scan test
   with revert-sanity). The ONLY reversal is the Story 9.8 trustee compensating event.

### The standalone-schema choice (AC7 — keep the 8.10 fence green verbatim)

The `contribution.confirmed` + `contribution.reconciliation-mismatch` Zod payload schemas ship as STANDALONE
exports in `contribution/events.ts`, NOT added to `CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS` / `CONTRIBUTION_EVENT_TYPES`.
The write-map + the Story 8.10 fence + the 8.4 events.test pin the member-facing DIRECT write vocabulary at
exactly `contribution.utr-attested`; the verdicts are produced by the RECONCILIATION matcher (apps/jobs), which
registers its schemas in the `@twt/events` registry directly and passes them explicitly to the domain verdict
writer. Keeping them off the write map is what lets both fences stay GREEN unchanged — the three
`contribution.*` types are still exactly three; nothing here is a fourth ingest door.

### Addendum (code review, 2026-07-26) — three gaps closed post-draft

The initial draft shipped three gaps the code review found and BigDev resolved; recorded here as they
extend the matching-strategy + emission-policy decisions above.

- **Entry exclusivity — a fourth mismatch reason, `entry_already_claimed`.** The initial `matchPool` let
  two different attestations independently resolve to the SAME bank-statement entry (a duplicate/forwarded
  UTR across pariwar members), so one physical deposit could back two members' `contribution.confirmed`.
  Fixed: `matchPool` now takes an optional `claimedEntryIds` set (entries already bound to a confirmation,
  either from an earlier pool in the same tick or a prior tick's `contribution.confirmed`, sourced by the new
  `listConfirmedEntryIds` read) and tracks entries it claims within the call itself. The FIRST attestation (by
  canonical sort order) to resolve to an entry wins; any other attestation resolving to an already-claimed
  entry is `entry_already_claimed` — found-and-rejected, never a second confirmation, never a silent drop.
  `MATCH_MISMATCH_REASONS` / `CONTRIBUTION_MISMATCH_REASONS` both gained this fourth value (the drift-guard
  test still pins them identical); the worker emits it (added to `EMITTABLE_MISMATCH_REASONS`).
- **AC2's timestamp window wired from the alert's own lifecycle.** The `window` parameter existed on
  `matchPool` since the initial draft but the live worker never constructed one, so the check was inert in
  production. Fixed: a new `resolveAlertLiveWindow` read resolves `[alert.live occurredAt, alert.closed
  occurredAt]` from the alert's own `events_log` lifecycle (unbounded on the open side while still `live`) —
  no new config constant, reusing the existing alert-lifecycle primitive.
- **Mismatch dedup keyed on `(pool, member, reason)`, not just `(pool, member)`.** The initial
  `listExistingVerdictKeys` deduped a member's mismatch on pool+member alone, so a member flagged
  `wrong_pool` on one tick would silently absorb a genuinely different `amount_mismatch` reason on a later
  tick (a new entry, a different failure). Fixed: `verdictKey` takes an optional `reason`; the mismatch dedup
  set is now keyed on the triple, so a CHANGED reason re-emits instead of being swallowed by the stale one.
- **The enqueue-primary is now genuinely post-commit on both routes.** The staff upload route
  (`apps/api/src/modules/reconciliation/routes.ts`) fired the D6/D7 enqueue-primary BEFORE the shared
  scope-resolution middleware's `onSend`-hook commit (it rides that middleware's request-scoped tx rather than
  managing its own). Fixed: both routes hand the enqueue off via a `pendingMatchEnqueue` WeakMap to a
  route-level `onResponse` hook, which Fastify guarantees runs strictly after `onSend` — genuinely post-commit
  on both the nominee and staff paths, matching D6/D7 as written.

### AR-45 (AC8) — the jobs-side `ResilientCall` port

The matcher's one external call (`BankStatementStorage.getBytes`) is wrapped with retry + timeout +
circuit-breaker. apps/jobs cannot import apps/api, so the Story 9.3 `ResilientCall` is faithfully PORTED to
`apps/jobs/src/matcher/resilience.ts` (not re-invented). A storage outage / parse crash on one blob is
audit-logged + skipped (§5.3 isolation) — deferred to the next tick, never a whole-run crash. A second
consumer now exists, so extraction of `ResilientCall` to a shared `@twt/*` util is the justified follow-up
([[feedback_no_premature_package]] — real cross-package reuse now exists); the port keeps the seam wired
until then.

## Consequences

- The green pill / contributor list / Yogdaan Bahi green arm now POPULATE from a real producer with zero read
  changes (proven by the live-DB read-population test).
- Story 9.5 owns the yellow→green pill FLIP surface + the canonical-truth CI fence + the reversal-consumer
  read; 9.6 the `<StatusPill>`; 9.7 the mismatch surface; 9.8 the trustee reversal producer. This ADR is the
  forward contract those stories bind to (the `CONFIRMED_*` + `reconciliation.confirmation-reversed` strings).
- The `no_statement_entry`-not-emitted-live policy means a post-close reconciliation-tail story must own the
  "attested but never reconciled" final determination.

## References

- [Source: `_bmad-output/implementation-artifacts/9-4-utr-matching-engine-matcher-mechanism.md`] — the story + Decisions D1–D7
- [Source: `packages/domain/src/reconciliation/matcher.ts`] — the pure `matchPool` engine
- [Source: `packages/domain/src/schema/bank_statement_entries.ts` + migration 0083] — the persisted entries (D4)
- [Source: `apps/jobs/src/matcher/matcher-worker.ts`] — the cron worker + enqueue + sweep (D6/D7)
- [Source: `packages/domain/src/contribution/read.ts` + `history.ts`] — the forward read contracts populated
- ADR-0032 (normalization schema), ADR-0033 (intake pipeline), ADR-0034 (object-storage tier) — the 9.2/9.3 substrate
- Memory: [[project_contribution_event_name_contract]], [[project_reconciliation_transport_substrate]], [[project_domain_limit_clamp_and_savepoint_retry]]
