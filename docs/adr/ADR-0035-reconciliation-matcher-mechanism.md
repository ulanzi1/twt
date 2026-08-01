# ADR-0035: Reconciliation UTR-matcher mechanism (OQ-2)

> **Status:** ratified
> **Date:** 2026-08-01 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 9.4 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-08-01; logged in `.decision-log.md` Decision 2026-08-01-071
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

### Addendum (Story 9.5 — the reversal-CONSUMER semantics + the `held` state)

Story 9.4 registered `reconciliation.confirmation-reversed` and proved the matcher never emits it; Story 9.5
builds the first CONSUMER of it (Story 9.8 remains the producer). Two consumer-side refinements of the
decision this ADR already owns (recorded here rather than in a new ADR — they are a read-side refinement, not
a new decision):

- **The per-confirmation event-id chain (not per-(member, pool)).** A reversal walks back EXACTLY the
  `contribution.confirmed` event id its `reversedConfirmedEventId` names. A member is live-confirmed iff they
  hold ≥1 confirmed event id NOT named by any reversal; if all their confirmations for a (member, pool) are
  reversed they are `held`; a subsequent FRESH `contribution.confirmed` (new event id) re-greens them. This
  keeps confirmation monotonic on the read side ("only ever moves forward except by an explicit compensating
  event") and makes re-confirmation possible — a reversal must never permanently poison a re-confirmed member.
  Collapsing to "any reversal for (member, pool) ⇒ held forever" would break re-green and is explicitly wrong.
  One shared `hasLiveConfirmation` predicate (`packages/domain/src/contribution/read.ts`) is routed through by
  every confirmed-reading surface (contributor list, Yogdaan Bahi, `getMemberAttestedContribution`, the 8.8
  reminder-suppression `confirmed` set) — never a second derivation.
- **Status precedence green ≻ held ≻ red ≻ yellow ≻ grey (Story 9.5 D4).** A LIVE confirmation outranks a
  stale reversal (the re-confirmed member is green, not held). A reversal (`held`) outranks a mismatch
  (`red`): a trustee-attested walk-back is a stronger, more deliberate signal than an auto-detected mismatch.
  `held` is a STATUS tone (dignified/neutral — "held under review", never "reversed"/"failed"), NOT a fourth
  `contribution.*` event type — so the Story 8.10 vocabulary fence stays green verbatim. The canonical-truth
  invariant is made executable by the Story 9.5 fence `packages/domain/tests/contribution/canonical-financial-truth.test.ts`
  (single-authority-constant scan + the live-DB reversal-consumer proof) and documented in architecture.md §3.6.

## Governance principles

### Decision-support scope: what is automated, and what is never auto-resolved

**Governance posture.** TWT uses deterministic, rule-based automatic confirmation only where the
reconciliation result is mathematically unambiguous (matching pool, UTR, and expected amount all
exact). Any ambiguity or anomaly exits the automatic path and requires explicit human adjudication
through the governed reconciliation workflow (Story 9.8). Regardless of confirmation method, the
system has no authority to move funds, reverse payments, or recover money automatically; all
recovery actions remain human-governed facilitation processes (see the next section).

> **Trustee note.** Trustees may, by future governance decision, require manual confirmation even
> for deterministic exact matches if operational or regulatory requirements change. That would
> constitute a **change to the reconciliation operating model**, not a clarification of the current
> one — tracked here as an option the panel can invoke, not a claim about what ships today.

The mechanism behind that posture, precisely, because "the matcher decides" is true for exactly
one shape of case and false for every other:

- **The one automated path — exact match.** When a `contribution.utr-attested` event's UTR, the
  correct destination pool, and the correct amount ALL match a persisted `BankStatementEntry`
  exactly, the matcher commits `contribution.confirmed` with no human step. This is **not**
  "parser confidence" in a probabilistic sense — there is no confidence score anywhere in this
  design. It is a binary, deterministic, replayable equality check: either all three facts match
  exactly, or they do not. The Governance-boundary and canonical-financial-truth CI gates treat
  this path as the sole live producer of confirmed status specifically because it is exact, not
  because it is trusted to judge an ambiguous case.
- **Every other case is routed to a human, never auto-resolved.** A wrong-pool deposit, an
  amount mismatch, a missing deposit, a self-verify screenshot, or a staff-transcription request
  all land in the Story 9.8 review queue, where a trustee/reviewer takes one of four sanctioned,
  step-up-OTP-gated, reason-coded, audited actions (confirm / reject / facilitate-recovery /
  review-and-reverse). **The matcher itself has no code path that resolves an anomaly** — it can
  only classify one and hand it to a human. This is where "decision-support, not financial
  authority" is exactly true: the system supports the human's decision (surfacing the case with
  full context, ordered by deadline proximity) and never substitutes for it. Every non-exact case
  requires a human trustee/reviewer action before anything is finalized — the Story 7.6
  pool-bound-payment invariant (next section) is what makes that structural rather than
  conventional.

### Recovery, not automatic reversal

**TWT is a facilitator. It cannot automatically debit or recover funds from a nominee, or from any
party. Any actual recovery of misdirected or disputed money requires human action taken outside
this system.** This is not aspirational — it is structurally enforced today by the **Story 7.6
pool-bound-payment invariant** (`scripts/pool-bound-payment-invariant/` CI gate, LOAD-BEARING): no
code path anywhere in reconciliation — the 9.4 matcher, the 9.5 reads, or any of the Story 9.8
review-queue actions — can reassign a pool, move funds, or edit the original payment record. The
Story 9.8 **facilitate-recovery** action (the queue's sanctioned response to a case that needs real
money movement) is proven **outcome-inert** by a dedicated test: it writes only an attributed audit
line and routes the case to a human via a helpdesk seam; it emits no `contribution.confirmed`, no
reject/reverse event, and triggers no matcher re-run.

**Terminology, used precisely in this document and its siblings (ADR-0032/0033/0034):**

- **"Recovery" / "facilitated recovery"** — the human, out-of-system process that resolves a
  misdirected or disputed deposit. This is always a human action taken outside the reconciliation
  system (helpdesk escalation, direct contact, bank-level correction); the system's role is limited
  to flagging the case and routing it, never performing the recovery itself.
- **"Reversal" (`reconciliation.confirmation-reversed`, the Story 9.8 review-and-reverse action) is
  a LEDGER correction, not a financial transaction.** It changes which `contribution.confirmed`
  event a member's pool-membership status counts (the member's status flips green → held) because a
  trustee determined the original match was wrong. **No money moves as a result of this event, and
  no code path treats it as though money moved.** It is the audit-trail analog of un-marking a
  mis-filed record, not a payment reversal. Where "reversal" risks being read as a financial action,
  prefer **"confirmation under review"** for the member-facing consequence — mirroring the existing
  convention that the member-facing status tone is "held," never "reversed" or "failed" (see the
  Story 9.5 addendum above).
- **The system never had the capacity to move money in the first place.** A member's deposit
  already lands in a real nominee bank account, by a real bank transfer, before the matcher ever
  runs. Everything in this ADR — matching, confirming, reversing, recovering — operates on the
  LEDGER record of that already-completed transfer. "The system moving money" is not a risk this
  ADR accepts and mitigates; it is a capability the system does not have, by construction.

## Consequences

- The green pill / contributor list / Yogdaan Bahi green arm now POPULATE from a real producer with zero read
  changes (proven by the live-DB read-population test).
- Story 9.5 owns the yellow→green pill FLIP surface + the canonical-truth CI fence + the reversal-consumer
  read; 9.6 the `<StatusPill>`; 9.7 the mismatch surface; 9.8 the trustee reversal producer. This ADR is the
  forward contract those stories bind to (the `CONFIRMED_*` + `reconciliation.confirmation-reversed` strings).
- The `no_statement_entry`-not-emitted-live policy means a post-close reconciliation-tail story must own the
  "attested but never reconciled" final determination.

## Forward-looking (planned, not built): Donation Contribution Statement

**Not authored or scheduled to a story as of this ADR — recorded here as a named future direction,
per [[feedback_closure_language_precision]] (this is a plan, not a deferred-but-authored decision).**
A per-member, per-cycle **Donation Contribution Statement** export is planned, giving contributors
and the people who administer a cycle a documented, auditable record of what a `contribution.confirmed`
event actually represents.

- **Availability, stated as governance intent:** the Donation Contribution Statement **shall be
  available** both to (a) **the nominee**, for transparency over the contributions received into
  their pool, and (b) **authorized administrators** responsible for reconciliation and contribution
  confirmation. Trustees additionally retain **read-only** access where appropriate to their
  oversight role, consistent with the rest of this ADR family's trustee-visibility posture.
- **Intended contents:** contributor name, contribution amount, contribution date, UTR/reference,
  cycle, nominee, pool.
- **Intentionally EXCLUDED:** bank account numbers, IFSC codes, phone numbers, internal system
  identifiers, audit IDs, and any other field not needed to evidence a contribution. This is a
  member-readable statement, not an internal audit export — the two must not be conflated.
- **Likely home:** the Story 10.7 Reports & Exports library (`report_exports`,
  actor-scoped, mask-only-PII precedent — [[project_reports_exports_surface_substrate]]) is the
  natural substrate for this export when a story is scheduled to build it, rather than a bespoke
  mechanism. Not yet scoped to a story; no code exists for this today.

## References

- [Source: `_bmad-output/implementation-artifacts/9-4-utr-matching-engine-matcher-mechanism.md`] — the story + Decisions D1–D7
- [Source: `packages/domain/src/reconciliation/matcher.ts`] — the pure `matchPool` engine
- [Source: `packages/domain/src/schema/bank_statement_entries.ts` + migration 0083] — the persisted entries (D4)
- [Source: `apps/jobs/src/matcher/matcher-worker.ts`] — the cron worker + enqueue + sweep (D6/D7)
- [Source: `packages/domain/src/contribution/read.ts` + `history.ts`] — the forward read contracts populated
- ADR-0032 (normalization schema), ADR-0033 (intake pipeline), ADR-0034 (object-storage tier) — the 9.2/9.3 substrate
- [Source: `_bmad-output/implementation-artifacts/7-6-pool-bound-payment-enforcement.md` + `scripts/pool-bound-payment-invariant/`] — the LOAD-BEARING no-remap/no-fund-movement invariant + its CI gate (the Governance principle section's teeth)
- [Source: `_bmad-output/implementation-artifacts/9-8-reconciliation-review-queue-ordered-by-alert-deadline-proximity.md`] — the confirm/reject/facilitate-recovery/review-and-reverse human review-queue mechanism + the facilitate-recovery outcome-inertness test
- [Source: `_bmad-output/implementation-artifacts/9-11-over-payment-facilitated-recovery.md`] — the established "facilitated recovery" terminology this ADR's Governance principle section reuses rather than reinvents
- Memory: [[project_contribution_event_name_contract]], [[project_reconciliation_transport_substrate]], [[project_domain_limit_clamp_and_savepoint_retry]], [[project_reports_exports_surface_substrate]], [[feedback_closure_language_precision]]

## Ratification (2026-08-01)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-08-01 Trustee Panel session,
as part of the ADR-0032/0033/0034/0035 batch (the highest-stakes item in it); logged in
`.decision-log.md` Decision `2026-08-01-071`. Consent sheet:
`docs/knowledge-transfer/adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`.

**Ratified as revised, no amendments beyond the two pre-presentation revision passes already
folded into the body:** the "Governance principles" section (Decision-support scope; Recovery, not
automatic reversal) and the "Forward-looking: Donation Contribution Statement" section, both
requested and reviewed by the panel ahead of signing — see the Changelog below for the exact
wording history. The panel noted, without objection, that the initial draft had three real bugs
caught and fixed at code review before this presentation (entry-exclusivity, an inert timestamp
window, a pre-commit enqueue-ordering bug — see the Addendum above). The `matchPool` engine, the
monotonic three-layer confirmation invariant, the mismatch-emission policy, and the AR-45
resilience port are ratified as shipped.

---

## Changelog

| Date | Change | Author | Notes |
|---|---|---|---|
| 2026-08-01 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-08-01 Trustee Panel session as part of the ADR-0032/0033/0034/0035 batch, alongside ADR-0036 ratified earlier the same day. `.decision-log.md` Decision `2026-08-01-071`; consent sheet `adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`. |
| 2026-08-01 | Pre-ratification revision | BigDev (Solo Builder) | Trustee-requested revisions ahead of presentation: added a "## Governance principles" section with two subsections — "Decision-support scope" (the deterministic-exact-match-only automation posture; every anomaly requires human adjudication via Story 9.8; a stricter human-gate-on-every-confirmation posture is named as a future, trustee-invocable operating-model change, not today's shipped behavior — verified against `apps/jobs/src/matcher/matcher-worker.ts` before writing this, since an earlier draft of the request would have misdescribed the shipped system) and "Recovery, not automatic reversal" (making the existing Story 7.6 pool-bound-payment invariant + Story 9.8 facilitate-recovery outcome-inertness explicit, and distinguishing "reversal" as a ledger correction from a financial transaction). Also added the "Forward-looking: Donation Contribution Statement" section (planned, not built, not yet scoped to a story). Refined per a second trustee pass: availability restated as an explicit governance-intent "shall be available" clause naming the nominee and authorized administrators as the two primary audiences (trustee read-only access retained as an additional line); contents list tightened to contributor name / contribution amount / contribution date / UTR-reference / cycle / nominee / pool. |
| 2026-07-26 | (initial draft) | BigDev (Solo Builder) | Authored under Story 9.4 (UTR matching engine) closure. |
