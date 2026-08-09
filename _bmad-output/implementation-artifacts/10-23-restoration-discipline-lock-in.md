---
baseline_commit: 6783eba
---

# Story 10.23: Restoration Discipline Lock-In `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Trust enforcing R7(B)–(F),
I want the 3- and 5-month restoration lock-ins to exist in the system,
so that §3.1's prescribed restoration packages are more than seeded data.

---

## What this story is, in one paragraph

Niyamavali §3.1 (`docs/legal/niyamavali.md:74-81`) prescribes a **lock-in** as the consequence of five
of the seven R7 rungs — 3 months for R7(B)/(C)/(D), 5 months for R7(E)/(F). Those durations are
**seeded and live** (`packages/domain/seed/niyamavali-v1-clauses.sql:277,286,295,304,313`), four of the
five clauses are **activated and evaluating in production** since Story 10.24, and the ladder returns
`lockin_3mo_plus_catchup` / `lockin_5mo_complete_all` verdicts against real members **today**. What
does not exist is anything that turns that verdict into a consequence: no clock is started, no coverage
moves, and the member is told nothing. **This story builds the instrument** — a second, event-derived
overlay on the member's own stream, mirroring the shipped moderation overlay, that records an
imposition with its `imposed_at`, its duration, and the **clause versions that supplied both**, folds
into `is_valid` (coverage), and is **invisible to the donor roster**. It also supplies the one
remaining R7 fact, `member.joining_discipline_state`, which it must supply **without** activating
R7(A)/(B).

---

## ⚠ TWO PREMISES IN THE EPIC AC ARE FALSE. Read this before planning.

The epic AC (`epics.md:3874-3894`) was written from the moderation decision brief's §1e survey. Two of
its factual claims have since been overtaken, and a developer who plans against them will build the
wrong thing.

### FALSE #1 — *"`lock_in_months` appears **only** in test fixtures and no production code consumes it"*

It appears in **production seed data** six times (`niyamavali-v1-clauses.sql:38` R7(A)=0, `:277` R7(B)=3,
`:286` R7(C)=3, `:295` R7(D)=3, `:304` R7(E)=5, `:313` R7(F)=5), and **production code reads it today**:

```ts
// packages/validity-service/src/rules.ts:312-318
export const RESTORATION_OBLIGATION_KEYS = [
  'catch_up_required', 'complete_all', 'consecutive_required',
  'core_team_recommendation', 'lock_in_months',
] as const;
```

`imposesRestorationObligation` (`rules.ts:343-355`) reads it, and `contributesViolatorFlag`
(`rules.ts:371-377`) gates the **Trustee-Lite violator-flag channel** on the result — the surface that
feeds suspension decisions. Story 10.26 built that filter deliberately (its **D4**).

> **The true, narrower statement — use this one:** `lock_in_months` is read today only as a
> **presence/positivity signal**. Its *value* is never turned into a date, a clock, a coverage
> consequence, or anything a member can see. **That** is the gap.

⚠ **The consequence for planning:** `imposes-restoration-obligation.test.ts:64-90` walks the **seeded**
payloads and requires every restoration-block key it finds to be classified in
`RESTORATION_OBLIGATION_KEYS` (`rules.ts:306-308`). If this story introduces a new restoration-block
key (`lock_in_days`, `lock_in_basis`, …) without adding it there, that test fails loudly — which is
correct behaviour, not an obstacle.

### FALSE #2 — *"duration comes from a **new** restoration-discipline policy clause in the registry"*

The **per-ground duration already lives in the R7 clause itself**, which is exactly where Niyamavali
§3.1's table puts it — the months are a property of *the rung*, not of the instrument. Minting a second
clause that also carries `lock_in_months` would create **two registry sources for one constitutional
number**, and the Trustee Panel would have to amend both to change one. **D2** resolves this: the R7
clause supplies the duration, a genuinely new clause supplies the instrument-level parameters no R7
clause can express, and **both** clause versions are pinned at imposition. That satisfies the AC's
actual requirement (a new clause; FR-8-style version pinning) without duplicating governance data.

---

## ⚠ The harm this story can cause

**This is the first thing in the substrate that removes a member's coverage automatically, with no
human in the loop.** Moderation removes coverage too, but a trustee decides, records a ground, writes a
Decision Note and passes a step-up OTP. Here, a projection changes, a ladder verdict flips, and a
member stops being covered.

Three failure modes, in descending order of severity:

1. **A member believes they are covered and is not.** They die during the lock-in, the family files,
   and the claim path finds `is_valid: false` on a standing nobody ever told them about. The disclosure
   (AC7) is not decoration — it is the only thing standing between this instrument and that outcome.
2. **The overlay reaches the roster.** If it leaks into `deriveIsAssignable`, a locked-in member is
   removed from the donor roster; pool assignment is the only contribution path (fenced by Story 8.10);
   and R7(D)'s *"catch-up of the missed contribution"* becomes unreachable. That is **exactly** the
   de-facto permanent ban Story 10.17 was written to correct — recreated automatically, at scale,
   without a trustee ever acting. `epics.md:3878` says *"ignored by the roster"* for this reason.
3. **A covered member is told they are not.** Substituting the JOIN lock-in for this instrument
   produces this. Story 10.16's **D3** already refused that substitution in writing
   (`packages/ui/src/contribution-disclosure/presenter.ts:108-125`) — a member in the `lock-in`
   *lifecycle* state is `isValid: true` because `VALID_STATES` contains `'lock-in'`
   (`packages/validity-service/src/payload.ts:67-71`). Do not reopen it.

> **The single most important structural fact: `deriveIsAssignable(state, moderationStatus)` cannot see
> `specialFlags` at all.** Failure mode 2 is impossible *by signature* as long as the overlay reaches
> coverage through `deriveIsValid` and the wire through `specialFlags`. Keep it that way — do not widen
> that signature.

---

## Boundary — read this before anything else

> **This story builds the restoration-discipline lock-in instrument and supplies the last R7 fact. It
> imposes no sanction a trustee chose, activates no held clause, and builds no catch-up mechanism.**

### In scope / out of scope

| In scope (10.23) | Out of scope → owner |
|---|---|
| The **overlay**: a `member.*` event family + an append-only table, folded as-of, mirroring `member_moderation_actions` (**AC1**, **D1**). | Any **lifecycle** change. No `ALTER TYPE member_lifecycle_state`, no `active → lock-in` edge (**D2-b rejected**, `epics.md:3880`), no `TERMINAL_STATES` edit, no `member-state-invariant` allowlist change. |
| **Automatic imposition** from the §3.1 ladder verdict, idempotent per live clause (**AC2**, **D3**). | A **trustee-imposed** lock-in, an early-lift act, or any discretion path. §3.1 grants none; do not invent one. The overlay is *shaped* so a future lift can be added (**D6**). |
| **Version pinning at imposition** — the R7 clause version AND the new instrument-policy clause version (**AC3**, **D2**). | Amending any R7 clause **JSONB**. A Part 11 governance instrument, never a code edit ([[feedback_supersede_never_reinterpret]]). |
| Calendar-correct expiry **derived at read**, no expiry event, no worker (**AC4**, **D6**). | A scheduled expiry job, a `lock_in_expired`-style event for this instrument, or a `current_state` column. |
| **Two clocks, separately expiring**, both representable at once (**AC5**, **D4**). | Reading `contribution.r7a_restorations_used` as an expiry input — **explicitly forbidden** by Story 10.25 **D5**. |
| Folding into `is_valid`; **`deriveIsAssignable` byte-unchanged** (**AC6**). | Bumping `POOL_ASSIGNMENT_HASH_VERSION` (**AC10**). 10.17 D3 + 10.24 AC6(c) + 10.25 AC5(e) all ratified: the roster reads `isAssignable` only. |
| Emitting `'restoration_lock_in'` into `specialFlags` so 10.16's arm lights (**AC7**). | Any change to `@twt/ui`'s disclosure copy, view-model, `SuspensionDisclosure.tsx`, or `pay.tsx`. **All four keys are already authored in en + hi.** This story writes **zero** new disclosure copy. |
| `member.joining_discipline_state`, projected from the payload's `lockInStatus.state` (**AC8**). | **Activating R7(A)/(B).** Decision **2026-08-06-077** is explicit: *"Story 10.23 … should carry the fact-supply half and cite this entry for the registry half — it does **not** inherit the amendment itself."* |
| ⭐ **Widening the falsifiable-hold gate** so the hold does not decay into a decorative one (**AC9**, **D7**). | R8's `contribution.compliance_percent` — still **UNOWNED** (`deferred-work.md`). |
| The **catch-up seam**, named and typed as absent (**D8**). | **Building catch-up.** R7(D) `catch_up_required` / R7(E)/(F) `complete_all` have no mechanism. Decision **2026-08-07-086** names 10.23 as its dependency but states in terms: *"its own scope was NOT expanded or redefined by this entry."* ⛔ Out of scope to **build**. ⚠ **Corrected by Decision `2026-08-08-092`:** this cell read *"Escalation 6's invariant blocks `done`"*, which was the pre-`088` placement. The invariant binds the **AC14 flag flip**, not closure. |
| The member-facing **missed-cycle** surface's unblocking (it becomes creatable). | **Creating** that story. `deferred-work.md:60-61` — it is authored via `bmad-create-story` *after* this lands, carrying Q2/Q3/Q5/Q6 forward verbatim. |

---

## Acceptance Criteria

### AC1 — A SECOND OVERLAY, and the word "overlay" means what it meant in Story 10.10

**Given** `epics.md:3877-3879` (**D2-a**) and the shipped precedent at
`packages/domain/src/member/moderation/`

**Then** the instrument is an **event-derived overlay on the member's own stream**, and it carries every
structural property of the moderation overlay:

| Property | Requirement | Precedent |
|---|---|---|
| Lifecycle | `members.state` **never moves**. The reducer's `default: return state` arm handles it. | `state.ts:120-122`; `0091.sql:7-24` |
| `current_state` column | **NONE.** Status is folded from events; the table is a decision record, not the status. | `schema/member_moderation_actions.ts:3-11` |
| Table posture | **APPEND-ONLY.** `GRANT SELECT, INSERT` to `twt_app`; no UPDATE/DELETE leg on grants **or** policies. | `0091.sql:66,73-76` |
| RLS | `ENABLE` + `FORCE`, fail-closed `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`. | `0091.sql:69-76`; `policies/member-moderation-actions-rls.ts` |
| Fold | **PURE and TOTAL** — an unexpected event is identity, never a throw. | `moderation/overlay.ts:88-116` |
| Query surfaces | **TWO**: `getX(db, memberId, at)` (bounded, for replay) and `getCurrentX(db, memberId)` (**unbounded**, for write-path legality). The clock-domain rationale at `overlay.ts:135-149` applies verbatim. | `overlay.ts:124-155` |
| Event stream | `stream_id = member_id`, event type prefixed **`member.`** | `moderation/events.ts` |

**And** the event payload is `.strict()`, built from `auditShape`
(`packages/domain/src/member/audit-shape.ts`) plus the overlay's own fields, and carries **no free
text and no PII** — this imposition is automatic, so unlike moderation there is no rationale to
encrypt and **no Tier-1 column at all**.

**And** the migration is **hand-authored** as `packages/domain/migrations/0097_*.sql` (head is `0096`),
journalled in `meta/_journal.json`, and **never** produced by `db:generate` — the drizzle baseline is
frozen at `0020` and a regenerate raises `42P07` ([[project_live_db_test_gotchas]]).

**And** `scripts/member-state-invariant/check.ts:32`'s `ALLOWLIST` and `:37`'s `PROJECTION_ALLOWLIST`
are **unchanged**, as they were by Story 10.10.

### AC2 — Imposition is AUTOMATIC and IDEMPOTENT, and it is not a trustee act

**Given** the moderation decision brief's **D1** — *"a restoration package arises from **§3.1
evaluation**, independent of any trustee act"* — and Story 10.25's rejection of an imposition-based
increment point on exactly that ground (`10-25-…md:423`)

**Then** an imposition is written when, and only when, the **R7 ladder's applied clause** for that
member imposes a restoration obligation. The predicate is the **already-shipped, already-tested**
`imposesRestorationObligation` (`rules.ts:343-355`) — **not** a new one, and **not** a clause-id branch.

> ⭐ The symmetry is the argument: the predicate that decides *"does this clause accuse?"* (Story 10.26
> **D4**) is exactly the predicate that decides *"does this clause impose?"* R7(G), which prescribes
> `never_excuses: true` and imposes nothing, correctly imposes no lock-in — **automatically**, with no
> code aware of R7(G). A future declarative clause inherits that for free.

**And** ⚖ **the Stance #5 reconciliation is stated explicitly, not assumed.**
`ux-design-specification.md:89` permits time-as-actor (SIE) *"for **non-punitive** state transitions
only (lock-in expiry, renewal grace close, pool window close). Suspensions, accusations, and asset
actions always require a human edge."* Lock-in **expiry** is on that allowlist; lock-in **imposition**
is **not**. The reconciliation is that a restoration lock-in **is not a sanction**: the moderation
brief's §1c table classifies lock-in as *"**Not** a sanction"* against suspension's *"A sanction"*, and
Niyamavali §1.3 (`docs/legal/niyamavali.md:38`) defines it as *"imposed on joining, rejoining, or
**after a discipline event**"* — a consequence that attaches by rule, not a §8.2 ground a trustee
finds. **Write that argument into the code comment at the imposition site**, because the next reader
will otherwise read an automatic `is_valid: false` as an auto-suspension. **Escalation 3.**

**And** the imposition is **idempotent per live imposition**: before appending, the writer reads the
**unbounded** overlay (AC1) and skips when an un-expired imposition for the same `clause_id` is already
in force. The race is closed by the `events_log (stream_id, event_version)` unique index, as it is for
moderation.

**And** ⛔ ✅ **re-imposition after expiry is RATIFIED, not an implementer's choice** — Decision
**2026-08-07-088** clause 3 (routing-note **Q3**, Option (a)). Idempotency-while-live does not answer
what happens once a lock-in elapses and its clause **still applies** — which it will, because R7(D)/(E)
key on `skips_current_year` and the skip cannot be cleared while no catch-up path exists (Escalation 6).
Left unspecified, the writer re-imposes on the next scan and a member who **cannot** discharge their
obligation is locked continuously until the skip ages out at the IST year boundary (`istYearStartUtc`,
`packages/domain/src/contribution/facts.ts`).

> ### The ratified rule
>
> **An expired imposition does NOT re-impose while the same unresolved episode's completion condition
> remains unsatisfiable.**

The Panel's ground: §3.1 prescribes a **bounded** consequence, and continuous re-imposition converts it
into a **de-facto permanent coverage removal imposed by a machine** — structurally the failure Story
10.17 was written to correct, arriving through a different door. A bounded consequence the member cannot
escape by acting is a different instrument from the one §3.1 prescribes.

**Implement it as stated, and do not re-derive it.** The rule is **stated at the imposition site**
citing Decision `2026-08-07-088`, and **pinned with a test** that runs a member past expiry with the
clause still applying and asserts **no second imposition**. Note the scoping word: the bar is on the
same **unresolved episode**, so a genuinely new episode — a fresh skip in a later period — is not
covered by it and imposes normally. Encode that distinction explicitly; conflating the two silently
re-creates the rejected behaviour.

**And** the writer runs in the **caller's scope tx** — it never opens its own — matching
`moderateMember` (`moderation/write.ts:129-209`).

**And** the writer's call site is named in the story, in `apps/jobs`, and is the **only** one. It must
**not** be the validity service: `assemblePayload` is a read path, and writing from it would put a
second writer on the correctness path, break as-of replay, and make every payload read a mutation.

> ⚠ Reuse the **existing bulk evaluation** at `packages/validity-service/src/r7-candidate-scan.ts`
> rather than adding a second R7 evaluation path. The trustee sees what is imposed and what is imposed
> is what the trustee sees; two paths would let those diverge silently. Its query budget is already
> measured (`tests/bench/p95-budget.md`) — record any growth there (**AC12**).

### AC3 — Version-pinned at imposition, BOTH halves, following FR-8 exactly

**Given** the FR-8 pattern the join lock-in already implements — `member.lock_in_entered` records
`lock_in_days_at_join` **and** `lock_in_policy_version` (a `clause_version_id`), so a later re-tune
*"does NOT re-lock existing members"* (`member/lock-in.ts:1-16`; `member/events.ts:141-158`)

**Then** the imposition event payload records, and the table mirrors:

- the **duration in force at imposition** (the number, resolved from the applied R7 clause's
  `restoration.lock_in_months`);
- the **R7 `clause_version_id`** that supplied it;
- the **instrument-policy `clause_version_id`** (**D2**) that supplied the counting convention;
- `imposed_at` and the derived `expires_at`.

**And** the event payload is the **authority**; the table columns are a derived read-cache, exactly as
`events.ts:135-147` states for the join snapshot.

**And** re-resolution at evaluation uses **`resolveByClauseVersionId`**
(`packages/domain/src/niyamavali/read.ts:61-77`), **never `resolveByClauseId`** — the latter returns the
**current** version and would silently re-lock. `niyamavali-engine/src/evaluate.ts:62-84` states this
in terms for the join lock-in; the same trap applies here.

**And** the new clause conforms to the frozen registry contract: the `clause_id` format
`niy.<section-slug>.<clause-slug>` (`epics.md:1453`), a **`benefit_mechanism` discriminator**
(`'pool'`) — **required on every v1 rule**, frozen row 12 (`epics.md:528`) and enforced by the Story
1.16d CI gate — and an **opaque payload the registry never interprets** (freeze row 14,
`epics.md:530`).

**And** `imposed_at` is **DB-authoritative** (architecture §1.11, `architecture.md:1096-1101`), not an
app-server clock.

**And** a test proves the pin: impose, then publish a **new version** of both clauses with different
values, then re-read the overlay at an instant **after** the new versions' `effective_date` — the
member's `expires_at` **does not move**.

**And** ✅ **the unprovisioned-Pariwar posture is RATIFIED** — Decision **2026-08-07-088** clause 2
(routing-note **Q2**, Option (a)):

> **On a Pariwar with no effective `niy.restoration-discipline.policy` clause, do NOT impose. Surface
> the gap as a named sentinel**, following `R7_REGISTRY_UNPROVISIONED_PRODUCER`
> (`packages/validity-service/src/rules.ts:275`).

**Imposing under a code default is explicitly REJECTED.** The Panel's ground: it is not a fallback but
coverage removal under a duration and month-counting convention **no Pariwar ratified** — an unratified
sanction imposed by a machine. Note also that the sibling `niy.lock-in.policy` states its provisioning
failure mode as a member-facing 503 (`niyamavali-v1-clauses.sql:132-134`); **that does not transfer
here**, because this is a background imposition with no request to fail. A test covers the
unprovisioned path and asserts **no imposition row and no event**, with the sentinel surfaced.

### AC4 — Calendar-correct duration, and expiry is DERIVED, not evented

**Given** AI-3-1 (calendar-correct derivation is the producer's job, never fixed-ms spans) and the
`addCalendarDaysLocal` precedent (`payload.ts:175-179`)

**Then** `expires_at = imposed_at + N months` is computed with `date_trunc`/`interval` semantics (a
calendar-month shift with end-of-month clamping — the `addTwelveMonths` leap-safe pattern at
`apps/api/src/modules/member-moderation/handlers.ts:67-75` is the in-repo reference), **never**
`N * 30 * 86400000`.

**And** **expiry emits no event and runs no job.** The overlay's `state` is derived at read from
`evaluatedAt >= expires_at`, exactly as `projectLockInStatus` derives `in-lock-in → unlocked`
(`payload.ts:157-172`). `VALIDITY_CACHE_TTL_SECONDS = 60`'s own doc comment
(`validity-cache/constants.ts:14-19`) already names that flip as one of the two pure-time-passage
change vectors the TTL exists to cover — this instrument is the second instance of a pattern the cache
was built for.

> ⚠ **Do not add a `member.restoration_discipline.expired` event.** The join lock-in has
> `member.lock_in_expired` because a **lifecycle state** must move; this overlay has no lifecycle
> state, so an expiry event would be a second writer producing information already derivable — and it
> would introduce a window in which the overlay is stale because a job has not run.

### AC5 — NON-SUBSUMPTION: two clocks, separate expiry, and the overlay represents BOTH

**Given** the ratified general principle (moderation brief **§1d**), its applied form (**D8**), and
Story 10.25 **D5** (Decision `2026-08-06-079`):

> *"joining discipline and restoration discipline are INDEPENDENT instruments that run CONCURRENTLY …
> `r7a_restorations_used` … must never be derived from, shortened by, or folded into a joining-discipline
> clock — **and Story 10.23's overlay must not read this count as its own expiry.** One clock never
> absorbs the other."*

**Then**:

- **`lock_in_days_at_join` is NOT read, NOT reused, and NOT extended.** It is join-scoped by name and
  semantics (`epics.md:3886`).
- **`lockInStatus` is left byte-unchanged**, including `projectLockInStatus` and the `LockInStatusDto`.
  The restoration clock is a **separate payload sub-object** with its own `imposedAt` / `expiresAt` /
  `state`.
- **`contribution.r7a_restorations_used` is not read anywhere in this story's expiry path** (10.25
  **D5**, above).
- A test asserts the two are **simultaneously representable and independently expiring**: a member with
  `lockInStatus.state === 'in-lock-in'` **and** a live restoration imposition renders both, with
  different `unlockDate` / `expiresAt`, and expiring one leaves the other untouched.

**And** ✅ **the concurrency rule is RATIFIED** — Decision **2026-08-07-088** clause 1 (routing-note
**Q1**, Option (a)):

> **Where multiple impositions are live at once, the overlay is in force while ANY is un-expired, and
> `expiresAt` is the MAXIMUM over live impositions** — never the minimum, never a replacement, never a
> sum.

§3.1 is silent on combination. The Panel ratified the maximum as the only reading that neither shortens
a live consequence (contrary to §1d's non-subsumption principle and to Story 10.25 **D5** / Decision
`2026-08-06-079`) nor invents a longer one than §3.1's per-rung table prescribes. Replacement was
rejected specifically because it would let a member draw a lesser imposition to escape a greater one
already in force — an incentive the Niyamavali does not contemplate.

⚠ **The rule is REGISTRY DATA, not a code constant.** Per **D2** and the same ruling, the concurrency
rule lands in the `niy.restoration-discipline.policy` clause payload, so the Trustee Panel can amend it
as a governance act. A `Math.max` inlined at the fold with no clause backing does **not** satisfy this
AC even though it computes the right answer today. **Escalation 5 — RULED.**

### AC6 — Folds into `is_valid` (coverage). `deriveIsAssignable` is BYTE-UNCHANGED.

**Given** `epics.md:3878` — *"folds into `is_valid` (coverage), and is **ignored by the roster**"*

**Then** `deriveIsValid` (`payload.ts:84-89`) gains the overlay as a third input and returns `false`
while a restoration lock-in is in force, composed at the **same pinned instant** as `memberState` and
`moderationOverlay` — resolved inside `service.ts`'s existing `Promise.all` (`:92-121`), never in a
second read at a second moment.

**And** `deriveIsAssignable` (`payload.ts:112-117`) is **not modified**. Its signature must keep taking
`(state, moderationStatus)` and nothing else.

**And** a test pins the divergence that makes this instrument survivable, mirroring the shipped
suspended-member case (`payload.test.ts:175`, `apps/jobs/tests/assignable-roster.test.ts:94`):

> a member under a restoration lock-in is **`isValid: false, isAssignable: true`**, and
> `apps/jobs/src/assignable-roster.ts`'s resolver still returns them.

**And** `deriveIsActive` is reconciled deliberately, not by accident: FR-12A defines `is_active` as
*"valid AND past lock-in AND not suspended"*, so a locked-in member must not render as `active`.
Record the choice in the Dev Agent Record either way — Story 10.10 set that precedent at
`payload.ts:122-127`.

### AC7 — The wire is `restoration_lock_in`; the dormant disclosure activates through the flag alone

**Given** Story 10.16 shipped this story's entire consumer side, dark:

```ts
// packages/ui/src/contribution-disclosure/presenter.ts:74-84
// Story 10.23 OWNS the wire name; if it ships a different one, THIS CONSTANT is
// the only line that changes (the copy keys, the view-model shape and `pay.tsx` do not — AC2).
// Nothing emits it today, so the arm is structurally complete and simply not in force.
const RESTORATION_LOCK_IN_FLAG = 'restoration_lock_in';
```

**Then** this story emits the literal **`'restoration_lock_in'`** into `payload.specialFlags` while the
overlay is in force, and adds **no new UI implementation and no new copy** — the already-shipped,
dormant disclosure becomes active **solely through the emitted flag**.

> ⚠ Read that precisely. **What the member sees does change** — a locked-in member is now shown a
> disclosure on the payment surface where previously they were shown nothing, and that change is the
> entire point of the AC. What is **frozen** is the implementation: no new component, no new copy key,
> no new interaction model, and no new arm in the view-model union. The diff in `@twt/ui` and
> `apps/mobile` should be empty; the rendered output should not.

The four copy keys
(`suspension_disclosure.lock_in.{title, what_it_does, what_it_does_not_buy, a11y}`) are **already
authored in `packages/i18n/locales/en/contribution.json:151-154` and the `hi` mirror**. **This story
writes zero new disclosure copy.**

> ⛔ **One of those four strings is not true for this story's own clauses. Read Escalation 6 before
> Task 8.** `lock_in.what_it_does` promises *"Contributing during this period counts toward completing
> your restoration"*, which holds for a consecutive-contribution package and **does not hold** for
> R7(D)/(E)/(F)'s catch-up / complete-all packages while no catch-up channel exists. The freeze in this
> AC stands — **the implementer does not edit that copy** — but the story does not get to ship the
> statement silently either. Escalation 6 routes it, and names the two acceptable dispositions.

**And** the flag is **appended after** the clause-order flags, exactly as the moderation flag is
(`payload.ts:358-363`, the `moderationFlag`/`allSpecialFlags` pattern) — the payload hash is order-sensitive and a non-deterministic position breaks
replay identity. Where both a moderation flag and this flag are present, the order must be **declared
and pinned by test**, not incidental.

**And** the pin test at `packages/ui/tests/contribution-disclosure/presenter.test.ts:256-312` (*"THE AC2
PIN — Story 10.23 lights the lock-in arm up with ZERO copy/render changes"*) goes from
*not-in-force* to *in force* **without its expected view-model changing**. If it needs an edit beyond
its fixture's `specialFlags`, the wire name or the fold is wrong — that is a finding, not a test to
adjust.

⚠ Its `restorationPackage` expectation at `:271` is `{ status: 'package_unavailable', producer:
'story-10-25' }` only because its fixture's `contributionHistorySummary` is the `producer_unavailable`
sentinel. **The answer for a locked-in member with a healthy summary is already determined and is
`no_consecutive_requirement`** — R7(D)/(E)/(F), *precisely this story's clauses*, prescribe
`lock_in_months` + `catch_up_required`/`complete_all` and carry **no** `consecutive_required`, which is
the exact case Story 10.25's **D4** added the third arm for. Add a test case proving that; do **not**
widen the union.

> ⛔ **Showing lock-in progress (months elapsed / months remaining) would be a NEW view-model arm and
> is out of scope.** 10.25 D4 rejected widening `RestorationPackageState` to lock-in shapes by name,
> *"leaving the lock-in-shaped disclosure to 10.23 where it belongs"* — but the epic AC for this story
> asks only that *"the disclosure applies to locked-in members too"*, which the shipped arm already
> satisfies. If a countdown is wanted, it is a separate story, and `docs/tone-guide.md:83-107` binds
> hard: the lock-in clock is *"a friendly presence, not an obstacle"* (`ux-design-specification.md:323`)
> and must never be theatricalized.

### AC8 — `member.joining_discipline_state` is SUPPLIED. R7(A) and R7(B) STAY HELD.

**Given** `epics.md:3888` — *"a new fact `member.joining_discipline_state` is **sourced from the
validity payload**, never computed inside the rule engine — the payload already carries
`lockInStatus.state`, so the producer side is a projection"* — and
[[project_engine_never_infers_contribution_facts]]

**Then** the fact is a **projection of `lockInStatus.state`** (`types.ts:32`:
`'in-lock-in' | 'unlocked' | 'never-entered'`), derived where the payload is assembled and injected
into the engine's fact bag. **No engine change. No `interpretClause` change. No ladder change.** All
three are frozen behind the 100×-thread determinism P0 gate.

**And** — this is the load-bearing half — **R7(A) and R7(B) are NOT activated.** Decision
**2026-08-06-077**, verbatim:

> *"Story 10.23, when authored, should carry the fact-supply half and cite this entry for the registry
> half — it does **not** inherit the amendment itself."*

R7(A) has **three** activation conditions and this story satisfies exactly one of them:

| Condition | Owner | State (verified live, 2026-08-07) |
|---|---|---|
| `contribution.r7a_restorations_used` | Story 10.25 | ✅ supplied |
| `member.joining_discipline_state` | **Story 10.23** | ⬅ **this story** |
| Published Part 11 amendment replacing the `total_count < 10` proxy population | **Trustee Panel** | ⛔ **NOT PUBLISHED** — `docs/legal/niyamavali.md` §3.1 still reads *"Break before 10 contributions"* / *"Registered but never contributed"*, and the seed rows at `:38` / `:277` still carry the proxy `all_of`. |

**And** `prd.md:346` is normative and unconditional: R7(A)/(B) **MUST NOT** be evaluated from the
disclaimed proxies. Adding `r7-a` or `r7-b` to `R7_ACTIVATED_CLAUSE_IDS` or `VALIDITY_RULE_ORDER` is
forbidden and mechanically caught.

**And** the hold entries are **narrowed with an honest reason, not deleted**. Deleting them — or
activating the clauses — to make AC9's red go away is the precise failure the apparatus exists to catch
([[feedback_mechanization_split_commitment]]).

### AC9 — ⭐ THE MECHANIZATION MUST BITE. It currently would not.

**Given** the falsifiable-hold assertion:

```ts
// packages/validity-service/tests/r7-activation-totality.test.ts:130-144
describe('Story 10.24 — the hold is FALSIFIABLE, not decorative (AC3)', () => {
  const supplied: readonly string[] = R7_SUPPLIED_FACT_KEYS;
  it("every held clause's blockedBy names a fact key this producer genuinely does NOT supply", () => {
    expect(R7_HELD_CLAUSES.length).toBe(2);
    for (const clause of R7_HELD_CLAUSES) {
      for (const key of clause.blockedBy) {
        expect(supplied.includes(key), `${clause.clauseId} claims to be blocked by "${key}", but the
          producer DOES supply it — the hold has outlived its reason and must be re-justified or lifted.`)
          .toBe(false);
      }
    }
  });
});
```

**Then** observe that **`R7_SUPPLIED_FACT_KEYS` is the `contribution.*` producer's key set**
(`producer.ts:220-229`), and `member.joining_discipline_state` is a **`member.*`** fact that can never
enter it. **When this story supplies the fact, that assertion stays GREEN — vacuously.** It will keep
certifying the hold as honest at the exact moment its stated reason has been satisfied.

This is [[feedback_gate_scope_semantic_coverage]] in its literal form: *a gate scoped to the wrong
package still misses the target.* The apparatus that correctly went red for Story 10.25 and correctly
allowed deletion for Story 10.26 is **structurally blind to this story**.

**Then** this story **widens the gate before it supplies the fact** (Task 1, first):

- a supplied-facts surface that spans **both** families — the `contribution.*` set and the new
  `member.*` R7 fact(s) — against which `blockedBy` is checked;
- `R7HeldClause` gains a **non-fact blocker** field (the Part 11 amendment, and anything else no
  producer can supply), so `blockedBy` can honestly narrow to `[]` **without** the hold becoming
  decorative;
- the `blockedBy.length > 0` vacuity guard at `:105` becomes a guard over **blockers of any kind**;
- `:172`'s *"the remaining holds are blocked by NON-FACTS"* assertion is re-expressed so it still
  bites — today it only asserts `!key.startsWith('contribution.')`, which a `member.*` key satisfies
  trivially;
- `:199`'s `expect(r7a?.blockedBy).toEqual(['member.joining_discipline_state'])` **will go red.** That
  is the gate working. Update it to the new honest state — do not delete the test.

**And** a **revert-sanity probe** is recorded in the Dev Agent Record: with the widened gate in place,
temporarily supply the fact **without** narrowing the holds and confirm the suite goes **red with the
gate's own message**. A gate that cannot be made to fail is not a gate ([[feedback_gate_scope_semantic_coverage]]).

**And** `R7_HELD_FACTS` (`producer.ts:243`) stays **empty and typed explicitly** — it answers a
different question (which *contribution* facts lack a producer) and must not be collapsed into the new
surface. `rules.ts:124-129` already says so; keep that comment true.

### AC10 — Blast radius: the payload hash moves, the cache is already covered, the roster pin does not

**(a) Every `validityPayloadHash` changes.** A new payload sub-object and a new `specialFlags` entry
both alter the canonical JSON. Discharge as 10.24 and 10.25 did:

- the wire DTO (`packages/contracts/src/members/validity.ts:199-219`) is `.strict()` and **field-order
  sensitive** — append, never insert;
- regenerate via `pnpm contracts:emit-openapi` + `pnpm contracts:check-openapi-determinism`. A
  byte-identical `openapi/v1.yaml` is the **expected** result (the Story 4.6 payload has never been
  registered in the hand-curated emitter) — record that, do not "fix" the emitter (`10-24-…md:292-294`).

**(b) Story 4.8 cache — already covered, but PROVE it.** Migration `0036:93-107`'s
`member_validity_cache_invalidate()` fires `AFTER INSERT ON events_log WHEN (NEW.event_type LIKE
'member.%')` and deletes `WHERE member_id = NEW.stream_id`. **A `member.*` event on the member's own
stream needs no new trigger** — unlike Story 10.24's contribution events, which ride the alert stream
and required `0093`'s sibling trigger. Assert this with a live-DB test
(`packages/domain/tests/integration/contribution/cache-invalidation-trigger.spec.ts` is the shape);
do not assume it.

⛔ **Do NOT add a payload-shape or version component to the frozen 4.8 cache key.** Rejected by name
(10.17 **D5**; restated `10-24-…md:279-281` and `0093_…sql:193-195`). The ≤60 s deploy window in which
a warm pre-deploy cache row can 500 the `.strict()` DTO is handled by the TTL plus the zero-window
lever `POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/routes.ts:68`). Record it as a deploy step, as 10.25 did.

**(c) `POOL_ASSIGNMENT_HASH_VERSION` is NOT bumped** (`packages/domain/src/pool/assign.ts:55`). The
argument is 10.24 AC6(c)'s, and it holds **only because AC6 holds**: the roster reads
`payload.isAssignable`, which is a function of lifecycle state and moderation status alone. Prove it
the way round 2 of 10.24's review demanded — spawn from a frozen `committed_at`, append this story's
events, re-spawn from the **same** instant, assert byte-identical `computeAssignableRosterHash` **and**
`pool_snapshots.member_assignments` **and** `member_pool_assignments`. A test that merely re-runs the
hash function is vacuous and was rejected once already (`10-24-…md:833`).

### AC11 — The new clause id MUST NOT contain the substring `lock-in`

**Given** `packages/ui/src/member-status/presenter.ts:145-146`:

```ts
const lockInClause =
  payload.applicableNiyamavaliClauses.find((c) => c.clauseId.includes('lock-in')) ?? null;
```

— a **documented known simplification** (`:138-145`, 2026-07-04 review) matching by substring because
`applicableNiyamavaliClauses` has no stable category field, with the recorded risk that *"a future
clause whose id contains 'lock-in' would false-match"*

**Then** the instrument-policy clause (**D2**) is named so the substring cannot occur — `**
niy.restoration-discipline.policy**` is the recommended id — and a test asserts that **no clause id
this story introduces** matches `/lock-in/`.

> ⚠ This is not hypothetical. `niy.lock-in.policy`'s resolved version already reaches
> `resolvedClauseVersionIds` through the engine seam (`niyamavali-engine/src/evaluate.ts:140-141`). A
> clause id containing `lock-in` that ever lands in `applicableNiyamavaliClauses[]` would hijack the
> admin panel's **join** lock-in section and its deep link, silently showing the wrong clause and the
> wrong version to a trustee reading a member's record.

**And** if a name containing `lock-in` is unavoidable for governance reasons, fix `presenter.ts:145`
to match on a stable field instead — and say so. Do not ship the collision.

### AC12 — The architectural record is an `AI-10-n` comment block, NOT an `architecture.md` amendment

**Given** Decision **2026-08-04-072** (`.decision-log.md:1093-1122`), which ratified that
`architecture.md` was frozen at Step 8 (`completedAt: 2026-05-26`, before Epic 4 existed) and contains
**zero** references to `MemberValidityPayload`, `is_valid`, overlays or any `AI-N-M` invariant — and
which commissions this story by name at `:1113`:

> *"Story 10.23 dev-story: introduce the restoration-discipline overlay invariant (D2-a, a second
> overlay mirroring the shipped moderation overlay) with its own `AI-10-n` comment block."*

**Then** this story ships a structured `AI-10-n` doc-comment at the point of use — the canonical
architectural record, following the **AI-7-2 precedent** (`apps/jobs/src/assignable-roster.ts:41-74`,
which Decision 2026-08-04-072 names as canonical *"not `architecture.md`"*).

**And** `_bmad-output/planning-artifacts/architecture.md` is **NOT amended.** Per
[[feedback_architecture_vs_adr_boundary]] the three §4f architecture items are already ratified by the
Sprint Change Proposal; no further design elicitation is required.

**And** the block states, at minimum: that the overlay is orthogonal to the lifecycle machine and
`members.state` never moves; that it reaches **coverage** through `deriveIsValid` and the **wire**
through `specialFlags`, and reaches the **roster through neither**; that the two discipline clocks are
independent (**AC5**); and that expiry is derived, never evented (**AC4**). Write it so a reviewer who
reads only this block can identify a violation.

### AC13 — Validation

**Then** all of: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm member-state:check` ·
`pnpm domain-invariants:check` · `pnpm i18n:check` · `pnpm microcopy:check` ·
`pnpm contracts:emit-openapi` + `contracts:check-openapi-determinism` · `pnpm ci:local`
**with and without `DATABASE_URL`**.

**And** the query-budget delta (the fact projection, the imposition read, the scan's growth) is measured
and recorded in `packages/validity-service/tests/bench/p95-budget.md` against FR-12A's p95 < 200 ms at
4L — with the 4L figure recorded as **un-attested at production scale**
([[feedback_record_unattested_no_backfill]]).

**And** a live-DB failure is **not presumptively innocent** here — this story changes a payload shape
many specs read. Capture a **baseline before any edit**; chase each failure to root cause; confirm
innocence by running the suspect spec **in isolation**
([[project_ci_local_concurrency_oversubscription]], [[project_ci_local_double_run_pollution]],
[[project_known_livedb_test_failures]]).

### AC14 — ⛔ The automatic writer is GATED behind a rollout flag that DEFAULTS OFF

*Added 2026-08-07 by Decision **2026-08-07-088** clauses 4–5 (routing-note **Q4**, Option (a) + the
Panel's amendment). Numbered after AC13 deliberately — the existing ACs are cross-referenced throughout
this file and are not renumbered.*

**Given** the finding that prompted the ruling: today `scanR7ViolatorCandidates` has exactly **one**
production consumer — `apps/api/src/modules/trustee-lite/handlers.ts:246`, an on-demand read that only
**displays** violator flags. **Task 4 adds a writer**, and Escalation 6's invariant as originally
authored bound story *closure* while every harm it describes lands at *merge*.

**Then** the `apps/jobs` imposition writer is gated behind a **rollout feature flag** on Story 10.8's
existing per-cohort substrate, and:

> **The flag defaults OFF in every environment except an explicit, trustee-authorized rollout.**

**Wiring specifics — Story 10.8's substrate has no existing precedent for this call shape, so both
questions below must be resolved by this story, not left to the implementer's judgment:**

- **Governance-boundary classification.** Every flag key must appear in the repo-root
  `governance_boundary.yaml` allowlist (`packages/domain/src/feature-flags/capability-bar.ts:27-34`) with
  a `kind` of `member_flow`, `provider_selection`, or `channel_routing`, plus a `rationale` and an
  **`adr` reference** — all four are required fields on every entry, and an unlisted key hard-throws
  `FlagKeyNotAllowlistedError` at both the CI gate and the runtime write path
  (`registry.ts:572-578`). This flag is **`kind: member_flow`** — it gates whether an automatic process
  acts on a member's coverage, the closest fit of the three, and that classification is itself a small
  governance act: **name it explicitly in the allowlist entry's `rationale`** ("gates the automatic
  restoration-discipline imposition writer added by Story 10.23; enablement is Trustee-Panel-exclusive
  per Decision 2026-08-07-089") so a future auditor of `governance_boundary.yaml` does not need to
  reverse-engineer why a background job carries a `member_flow` flag. The `adr` field should cite this
  story and Decision `2026-08-07-088`.
- **Evaluation scope.** `resolveFlagAudited` (`packages/domain/src/feature-flags/cache.ts:190`) is a
  **per-member** check — it takes a `MemberFlagContext` — and `apps/jobs` has **no existing caller** of
  the flag-evaluation API to follow as precedent. Checking it once per candidate member inside the R7
  scan loop would reintroduce the N+1 evaluation shape **AC2/D3 explicitly reject** for the imposition
  predicate itself. **Resolve the flag exactly once per job run**, before the scan begins, using a
  cohort-independent context (the flag is a global kill switch on the writer, not a per-member cohort
  decision): if disabled, the job performs its read-only scan (unchanged from today) and skips the
  imposition-writing step entirely; if enabled, every candidate the scan's own predicate
  (`imposesRestorationObligation`) selects is written normally. Per-member re-evaluation of the flag
  inside the loop is **not required** and should not be added — it multiplies audit-log volume for a
  decision that does not vary by member.

**And** ⛔ **enablement authority is part of the AC, not deployment detail:**

- ✅ **The Trustee Panel exclusively owns authorization to activate** (Decision **2026-08-07-089**),
  exercised through a **formal `.decision-log.md` entry**. **You do not hold it.** Operations does not
  hold it either — they own *how* a flip is executed, never *whether* it may occur. A ticket, a PR
  approval on a config change, a deployment sign-off or a verbal go-ahead is **not** an authorization.
  **If there is no Decision entry, the flag is not authorized.**
- Authorization to turn it on is **not an operational act**. It is tied to — and **may not precede** —
  the same governance decision that discharges Escalation 6's invariant.
- **No** environment-level, per-cohort, or convenience enablement substitutes for that decision.
- Enabling it in a **non-production** environment confers **no** authority to enable it in production.
- **Flipping the flag without the discharging Decision is a governance violation, not a configuration
  change.** Say exactly that at the flag's definition site and in its description string — the next
  reader will otherwise treat it as an ordinary rollout toggle.

**And** Escalation 6's invariant is **preserved verbatim** and is **not** reopened. Only its binding
point moved: it now binds the **flag flip**, where the harm begins, rather than story closure. The
consequence for this story is that **merging with the flag off is permitted and closing is still
gated** — see Escalation 6's amended disposition.

**And** a test asserts the default: with no flag configuration present, the writer performs **no**
imposition — no row, no event. Default-off must be the behaviour of the **absent** configuration, not a
value that happens to be seeded off.

⚠ **Rung-splitting is NOT built** (routing-note Q4 option (b), considered and not taken — Decision
`2026-08-07-088` clause 6). Imposing only for the completable rungs would need a payload-keyed
condition at the imposition site, which sits badly with **D3**. If the Panel later wants partial
rollout, the ratified flag expresses it **without** a code change to the trigger.

---

## Load-Bearing Decisions

### D1 — ⭐ RECOMMENDED. Event **plus table**, unlike 10.25 and 10.26.

The last three stories in this arc narrowed the instrument, but not identically: 10.25 **D2** ruled *no
new event, no new table* (a pure derivation); 10.26 **D7** ruled *no new table* but **did** add a new
event type (`10-26-…md:648-657` — the event is the record; the table is what it dropped). A reader
arriving here might expect the same minimalism from both. **Neither reading fully applies here**, for
one reason: **version pinning is not derivable.**

10.25 could be a pure derivation because everything it needed already existed in the log. 10.26 needed a
new event because nothing in the system already knew the fact it recorded — its own **D7** states the
rule: *"a new fact needs an event exactly when nothing in the system already knows it."* That same rule
points toward an event here too: nothing knows which clause version was in force when a member's
lock-in began.

A restoration lock-in's `expires_at` depends on `lock_in_months` **as it stood at the moment of
imposition** — and a Trustee Panel re-tune of that number would, under a pure derivation,
**retroactively move every existing member's unlock date**. That is precisely what FR-8 exists to
prevent (`prd.md:334`; `member/lock-in.ts:1-16`).

So the imposition must be **recorded** as an event, unlike 10.25's pure derivation.

**The table** (in addition to the event) follows `member_moderation_actions`: the event is the
authority and the replay source; the table is the indexed read surface for a per-member history and a
Pariwar-wide list, and carries the structural CHECK constraints. `0091.sql` is the template.

### D2 — ⭐ RECOMMENDED. The R7 clause supplies the **duration**; the new clause supplies the **instrument**. Both pinned.

The epic says *"a new restoration-discipline policy clause"*; the R7 clauses already carry
`lock_in_months`. Three readings:

| Reading | Verdict |
|---|---|
| **(a)** Duplicate `lock_in_months` into a new `niy.restoration-discipline.policy` clause | ❌ **Two registry sources for one constitutional number.** §3.1's table is per-rung: 3 months for R7(B)/(C)/(D), 5 for R7(E)/(F). A single policy clause cannot express that without re-encoding the whole ladder, and the Trustee Panel would have to amend two instruments to change one. |
| **(b)** No new clause; pin only the R7 clause version | ⚠ Honest and minimal, but leaves genuinely instrument-level questions (how a month is counted; whether concurrent impositions extend) as **code constants** — the exact thing FR-8's pattern exists to keep in the registry, and it fails the AC's plain text. |
| **(c) Both, with distinct jobs** ⭐ | ✅ The **R7 clause** supplies `lock_in_months` (per rung, where §3.1 puts it). The **new clause** supplies what no R7 clause can express: the **month-counting convention**, the **concurrency rule** (AC5), and the instrument's own provisioning precondition. **Both `clause_version_id`s are pinned at imposition.** |

**(c) is recommended.** It satisfies the AC literally (a new clause; FR-8 version pinning) without
duplicating governance data, and it puts each parameter in the instrument that owns it.

⚠ ✅ **Provisioning precondition (R6) — RATIFIED, no longer an implementer's choice.**
`niy.lock-in.policy` carries one — *"every production Pariwar MUST carry an effective clause or a paid
member 503s"* (`niyamavali-v1-clauses.sql:132-134`). The new clause inherits the same obligation, but
the failure mode is **not** a 503: this is a background imposition, not a member request. Decision
**2026-08-07-088** clause 2 ratifies the posture: **do not impose, and surface the gap as a named
sentinel**, following `R7_REGISTRY_UNPROVISIONED_PRODUCER` (`rules.ts:275`). Imposing under a code
default is **explicitly rejected** — it is not a fallback but coverage removal under a convention no
Pariwar ratified, i.e. an unratified sanction. See **AC3**. **Escalation 9 — RULED.**

⚠ **The concurrency rule (AC5) is one of this clause's payload parameters.** Decision
`2026-08-07-088` clause 1 ratified the **maximum-over-live-impositions** reading *and* its placement:
it is registry data the Panel can amend, not a code constant. A `Math.max` at the fold with no clause
backing does not satisfy **AC5**.

⚠ **Naming: `niy.restoration-discipline.policy`** — deliberately free of the substring `lock-in`
(**AC11**).

### D3 — ⭐ RECOMMENDED. `imposesRestorationObligation` is the imposition trigger. No clause-id branch, ever.

The engine invariant is *no branch keyed by registry identity* — re-tune the **data**, never add engine
logic ([[project_niyamavali_precedence_is_provenance]]). A trigger spelled
`if (clauseId === 'niy.contribution-discipline.r7-d' || …)` would put the ladder in code and go stale
the first time the Trustee Panel adds a rung.

`imposesRestorationObligation` already reads the clause **payload** and already classifies all seven
seeded clauses correctly (`imposes-restoration-obligation.test.ts:64-90`). Reusing it means:

- R7(G) imposes nothing, with no code aware of R7(G);
- R7(A) (`lock_in_months: 0`) contributes no lock-in **duration** even though it does impose a
  restoration obligation — so the imposition writer must read `lock_in_months > 0` specifically, not
  merely "imposes something". **State that distinction in the code; it is easy to get wrong and it
  decides whether R7(A) members get a spurious zero-length lock-in.**

**Explicitly REJECTED — a new predicate.** A second predicate over the same clause payloads is a second
thing to keep in sync, and 10.24 round 2 already found two seams drifting by omission.

### D4 — The overlay must **represent** both instruments, not merge them.

*"Design the overlay to hold both, not one"* (`epics.md:3883`) is the AC most likely to be
misimplemented as a single merged clock. It is not that. The requirement is that a member serving
**both** a joining lock-in and a restoration lock-in is **representable, with two independent
expiries**, and that neither derives from the other.

Concretely: `lockInStatus` stays exactly as it is (the joining clock), and a **new sibling sub-object**
carries the restoration clock. Two fields, two expiries, one member. The test at AC5 is the proof.

**Explicitly REJECTED — a single `disciplineStatus` object with a merged `unlockDate`.** It cannot
represent concurrency, and the first thing anyone would do with it is take a `max` or a `min` — which
is subsumption by arithmetic.

### D5 — ⭐ RECOMMENDED. The instrument has **no reason code and no actor**.

The moderation overlay carries `reason_code`, `actor_id`, `actor_display` and an encrypted rationale
because a **human** decided. Nothing here decides — §3.1 applies, and the clause id **is** the reason.

So: no reason-code registry, no `actor_id`, no `actor_display`, **no Tier-1 column, no KMS, no RTBF
scrub leg**. The event's `auditShape` carries `actor: 'system'`. Story 10.16 already assumed this —
its lock-in arm returns `reasonLabelKey: null` with the comment *"The lock-in instrument carries no
trustee reason code of its own — it is a consequence of the restoration discipline, not a fresh
finding"* (`presenter.ts:177-178`).

⚠ This also means the pay-screen crash risk 10.10 shipped (a missing
`memberStatus.moderationReason.<code>` locale entry crashes the render at
`apps/mobile/app/(membership)/index.tsx:72-77`) **is not inherited** — because there is no reason code
to look up. Do not introduce one.

### D6 — Expiry by time only. The **lift** seam is shaped, not built.

§3.1 grants no early-clearance act: R7(D) is *"3-month lock-in **and** catch-up"* — conjunctive, so
completing catch-up does not shorten the lock-in. Expiry is therefore pure time (**AC4**).

But the overlay's fold should be written so a future `member.restoration_discipline.lifted` event can
be added **without reshaping the fold** — the moderation `restore` arm is the template. Ship the fold
total over unknown event types (it already must be, per AC1) and say in the barrel that a lift is a
governance act nobody has authorised yet. **Do not add the event.** Building an unauthorised
clearance path is how a discretion nobody granted gets exercised.

### D7 — Widening the gate is **this story's**, and it comes FIRST.

AC9's finding could be handled three ways:

| Option | Verdict |
|---|---|
| Supply the fact, leave the gate as-is | ❌ The hold silently becomes decorative at the exact moment its reason expires. This is the failure mode `deferred-work.md:158-163` warns about in writing (*"EMPTY HELD-FACTS IS NOT AN ALL-CLEAR"*). |
| Supply the fact, record the gap in `deferred-work.md` | ❌ An unowned obligation against no story — the precise shape of the failure that left R7 dark for two epics ([[project_r7_fact_producer_unbuilt]]). |
| **Widen the gate first, then supply the fact** ⭐ | ✅ The gate goes red for the right reason, is narrowed for the right reason, and stays falsifiable for R8's `compliance_percent` when that finally lands. |

**Order matters and is not cosmetic** — Task 1 widens the gate and confirms it is red **before** Task 3
supplies the fact. A gate written after the change it was supposed to catch is a gate written to pass.

### D8 — Catch-up is named as **absent**, on the first-class-absent-seam pattern.

R7(D) prescribes `catch_up_required: true`; R7(E)/(F) prescribe `complete_all: true`. **Neither has a
mechanism, and this story does not build one.** Decision **2026-08-07-086** names 10.23 as the
dependency for the member-facing missed-cycle surface and, in the same entry, states: *"its own scope
was NOT expanded or redefined by this entry."*

Discharge it the way 10.25 discharged its own missing dependency (**D5**), on the
[[project_nominee_vpa_deferred_seam]] pattern: the coupling point is **named, typed and unreachable —
never faked**. A locked-in member's catch-up obligation is real, visible in the clause data, and
carries no completion path. Say that in the code and in `deferred-work.md`.

⛔ **But "not built here" is not the same as "not owed here."** Because this story is what makes the
obligation *bite* — coverage removed, member told — **Escalation 6 is a BLOCKING DISCHARGE INVARIANT,
not an advisory**: *the completion condition of every restoration package this story imposes must be
satisfiable through a ratified system workflow* — ⚠ **and per Decision `2026-08-07-088` clause 4 (as
corrected by `2026-08-08-092`) it blocks the AC14 FLAG FLIP, not `done`.** The words *"before 10.23 is
`done`"* stood here from the original authoring and are superseded. A successor catch-up story is
the expected vehicle, not the requirement — the requirement is the system property. Read Escalation 6
in full before planning Task 11; it also records a **copy-truth defect** in already-shipped strings
that this story is the first to make reachable, and an **open re-imposition question** that AC2 does
not currently answer.

---

## Escalations owed (raise them; do not silently absorb)

> ### ✅ Four of these were RULED before dev — Decision `2026-08-07-088` (2026-08-07)
>
> The Trustee Panel ratified answers to **Escalation 5**, **Escalation 9**, **AC2's re-imposition
> question**, and **Escalation 6's gate placement** — all at Option (a) of
> `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-07-story-10-23.md`, with one
> amendment (the flag's default-OFF scope and enablement authority; now **AC14**).
>
> **Implement the ratified answers; do not re-derive them, and do not treat the recommendations in the
> text below as still-open options.** Escalations **2, 3, 4, 7 and 8** were explicitly **not** ruled on
> and remain owed exactly as written.

1. ⭐ **The falsifiable-hold gate is structurally blind to this story (AC9/D7).** The apparatus that
   went red for 10.25 and permitted deletion for 10.26 checks `blockedBy` against the **contribution**
   producer's key set only. Widened here — flagged because it means the mechanization has been
   half-scoped since 10.24 and nobody noticed until the second fact family arrived
   ([[feedback_mechanization_split_commitment]], [[feedback_gate_scope_semantic_coverage]]).

2. ⚖ **GATE — the non-subsumption principle is NOT in the ratified Niyamavali.** This story's central
   constraint (**AC5**) rests on the moderation brief's §1d/**D8**, which the Sprint Change Proposal
   scheduled as a **Part 11 amendment** — a new §3.0 plus a §3.1 redefinition of R7(A)/(B)'s
   populations by joining-discipline state (`sprint-change-proposal-2026-08-04.md:522`). **Verified
   live 2026-08-07: `docs/legal/niyamavali.md` contains zero occurrences of "subsum" or "joining
   discipline", and §3.0 does not exist.** Of the four amendments the SCP sequenced as **step 0, before
   this story** (`:150` — *"Ratify §1d + D8 + D9 + D7"*), **only D9 has landed** (Decision 2026-08-06-080).
   So the instrument is being built ahead of the governance text that governs it. That is defensible —
   the code implements the *conservative* reading (never subsume, never shorten) and the Niyamavali is
   still unpublished (`niyamavali.md:5` carries `[[v1.0]]` / `[[date]]`) — but it must be **stated and
   routed to the Trustee Panel with this story**, not discovered afterwards.

3. ⚖ **Stance #5: imposition is not on the SIE allowlist (AC2).** `ux-design-specification.md:89`
   permits time-as-actor for *"non-punitive state transitions only (lock-in **expiry**, renewal grace
   close, pool window close)"* and reserves *"suspensions, accusations"* to a human edge. This story
   makes a machine remove a member's coverage. The reconciliation — a lock-in is **not a sanction**
   (brief §1c; Niyamavali §1.3 `:38`) — is sound and is implemented, but it **extends** the SIE
   allowlist in substance. Ratify the extension explicitly rather than letting the implementation
   assert it.

4. ⚖ **The coverage contradiction — a member in JOIN lock-in is `is_valid: true`.** `VALID_STATES`
   contains `'lock-in'` (`payload.ts:67-71`), so the joining instrument does **not** remove coverage,
   while this story's restoration instrument **does**. The system will hold two opposite answers to
   *"does a lock-in remove coverage?"* Niyamavali §3.3 says it does (*"only their eligibility to claim
   as a beneficiary is affected for the lock-in period"*), and the moderation brief's §1c table records
   *"Claim-eligible during? **No**"* for **both** instruments. This is Story 10.17's still-open
   **Escalation 3** (`payload.ts:106-107`: *"the join-`lock-in` coverage question is unresolved"*) and
   `deferred-work.md:2240` (CR-4.6-D7). **This story does not resolve it** — changing `VALID_STATES`
   would move coverage for every existing member and rehash every payload — but it makes the
   contradiction **live and member-visible**, so it must go to the Trustee Panel with this story, not
   after it.

5. ✅ **RULED — Concurrent impositions: §3.1 is silent (AC5).** Whether a second imposition extends,
   replaces, or runs alongside the first is not in the Niyamavali. **Decision `2026-08-07-088` clause 1
   ratifies the non-shortening `max` reading**, and ratifies that it lives in the
   `niy.restoration-discipline.policy` clause payload rather than in code. Replacement was rejected
   because it would let a lesser imposition discharge a greater one already in force. See **AC5**.
   *Was recorded here to stop an implementation choice becoming de-facto policy; it did.*

6. ⛔ **BLOCKING DISCHARGE CONDITION — catch-up has no mechanism and no owner, and this story creates
   the obligation it cannot satisfy (D8).**

   > ✅ **RULED on PLACEMENT ONLY — Decision `2026-08-07-088` clauses 4–5.** The invariant below is
   > **preserved verbatim and is NOT reopened**; the Panel ruled only on *where it binds*. The
   > automatic writer is now gated behind a **default-OFF rollout flag** (**AC14**), and the invariant
   > binds the **flag flip** — where the harm actually begins — **rather than story closure**.
   > **Merging with the flag off is permitted; enabling the flag is not, until the property holds.**
   > Authorization to flip it is tied to, and may not precede, the discharging decision.
   >
   > ⚠ **Corrected by Decision `2026-08-08-092`.** This passage read *"rather than story closure
   > **alone**"*. That word is not in the ratified text — `088` clause 4 reads *"Only its binding point
   > moves: it now binds the flag flip … rather than story closure"* — and it converted an exclusive
   > move into an additive one, re-creating routing-note option **(d)** (*"merge permitted, closure
   > gated"*), which the Panel was offered and did **not** ratify. **Closure is not gated. `done` is
   > correct.** The flag is the only gate, and it is still OFF.
   >
   > **The gap itself is undischarged.** No catch-up mechanism exists. The discharging decision is now
   > **owned by the Trustee Panel** (Decision `2026-08-07-089`) — but an owner is not a discharge, and
   > everything below stands unchanged.

   This is no longer a deferred implementation. It is a **governance gap**, and the 2026-08-06/07
   decisions are what made it one. Four things are now simultaneously true:

   - the restoration lock-in **exists and removes coverage** (this story);
   - a missed cycle is **dischargeable, not closed** — §3.1's ratified interpretive note (2026-08-07)
     says a skip clears when a confirmation *for that cycle* enters the record *"whether through later
     reconciliation or an **authorized catch-up process**"*;
   - **no authorized catch-up process exists.** Contribution flows only through assignment to an
     **open** cycle (pool-bound payment enforcement, Story 7.6; fenced by Story 8.10), so there is no
     channel through which a member can pay a **closed** cycle;
   - three of the four activated clauses — R7(D) `catch_up_required`, R7(E)/(F) `complete_all` — define
     their restoration package **entirely** in terms of that unavailable act.

   > **So this story puts a member into a coverage-removing restoration period whose stated completion
   > condition no workflow in the system can satisfy.** R7(A)/(B)/(C)'s consecutive-contribution
   > packages are completable through ordinary contribution; R7(D)/(E)/(F)'s are not.

   ⚠ **And the already-shipped copy asserts otherwise.** Verified live in both locales —
   `suspension_disclosure.lock_in.what_it_does` (`packages/i18n/locales/en/contribution.json:153`, `hi`
   mirror) reads:

   > *"Contributing during this period counts toward completing your restoration."*
   > *"इस अवधि में किया गया अंशदान आपकी पुनर्बहाली पूर्ण करने की ओर गिना जाता है।"*

   For an R7(D)/(E)/(F) member that sentence is **not true**: contributing to a future cycle does not
   discharge a past missed one. The `no_consecutive_requirement` arm does not cure it — it correctly
   declines to give a *count* (*"not measured as a number of contributions"*) while `what_it_does`
   renders alongside it still asserting completability. This is the same harm class Story 10.16's **D3**
   refused on identical grounds: **a false statement to a member, about their own standing, on a payment
   surface.** It also runs against Decision 2026-08-07-086's constraint that copy must not imply
   *"missed"* is permanent — here the failure is the inverse and equally dishonest: implying a path
   that does not exist.

   **The condition, stated as a SYSTEM PROPERTY rather than a backlog artifact:**

   > ### ⛔ Discharge invariant
   >
   > **Story 10.23 MUST NOT be marked complete until the completion condition of every restoration
   > package it imposes is satisfiable through a ratified system workflow.**

   **As amended by Decision `2026-08-07-088`: not before it merges — before the AC14 flag is enabled,
   and before it is `done`.** (As originally authored this read *"not before it merges — before it is
   `done`"*, which left the interval between merge and discharge open with real member-facing
   consequences inside it. The flag closes that interval; the closure gate is unchanged.) The invariant
   is deliberately phrased over the **system's** state, not over a story key, for two reasons:

   - **It survives re-organisation.** Stories get split, merged, renumbered and superseded. A condition
     that reads *"story X must exist"* is dischargeable by creating a file, and is silently voided if
     that file is later folded into another. A condition that reads *"the obligation must be
     satisfiable"* stays true and stays checkable through any backlog reshuffle
     ([[feedback_architecture_vs_adr_boundary]] — commit the property, not the instrument).
   - **It is falsifiable against the running system**, which is what makes it a gate rather than a
     sentiment. The check is concrete: *take a member under each of R7(D), (E), (F); is there a
     ratified path by which they can reach the state their clause names as completion?*

   **What discharges it** — any of these, and the choice is the **Trustee Panel's, not the
   implementer's**:

   | | Route | What it requires |
   |---|---|---|
   | **(a)** ⭐ *expected* | A **successor catch-up / complete-all payment path** is ratified and owned | The anticipated shape. A story is how this will most likely arrive, but the story is the *vehicle*, not the requirement. |
   | **(b)** | Any **other Trustee-ratified mechanism** satisfying the same invariant | E.g. an authorised out-of-cycle contribution route, or a reconciliation-side discharge. Equally valid; it satisfies the property. |
   | **(c)** | A **Part 11 reinterpretation** under which the packages' completion condition is satisfiable by acts the system already supports | A governance act, not a code change. If "catch-up" is authoritatively read as satisfiable by ordinary forward contribution, the invariant holds and nothing needs building. |
   | **(d)** | 10.23 **imposes no package whose condition is unsatisfiable** | Technically discharges the invariant by narrowing what is imposed — but it removes R7(D)/(E)/(F) from the instrument, which is most of its value. Recorded for completeness, not recommended. |

   ⚠ **Fixing the copy does NOT discharge this.** An earlier framing of this escalation offered
   "10.23 stops asserting completability" as an alternative disposition. Under the invariant as stated
   it is **not one** — honest copy about an unsatisfiable obligation leaves the obligation
   unsatisfiable. The copy-truth defect above is a **separate and additionally-owed** honesty
   obligation that binds *while the gap persists*; it is necessary, and it is not sufficient.

   ⚠ **Do not resolve this by narrowing the disclosure's trigger** so R7(D)/(E)/(F) members see nothing.
   Silence about a coverage removal is worse than an imperfect explanation, and it re-creates the exact
   gap 10.16 was written to close.

   ⚠ **The harm is not merely theoretical, and the story must answer one question to bound it:** does an
   **expired** imposition **re-impose** while its clause still applies? A member with an
   uncatchable-up skip may keep satisfying R7(D)/(E) after the lock-in elapses, and — depending on the
   answer — be re-locked continuously until `skips_current_year` rolls over at the IST year boundary
   (`istYearStartUtc`, `packages/domain/src/contribution/facts.ts`). ✅ **ANSWERED — Decision
   `2026-08-07-088` clause 3: it does NOT re-impose** while the same unresolved episode's completion
   condition is unsatisfiable. AC2 carries the ratified rule and the past-expiry test. *(This paragraph
   previously read "AC2's idempotency rule … is silent on re-imposition after expiry" — stale from an
   earlier draft; AC2 was already carrying the question before the ruling, and now carries the answer.)*

   Without the invariant, 10.23 can be marked complete while the system holds live, coverage-affecting
   obligations that no workflow can satisfy, and tells members otherwise. That is the
   unowned-obligation shape that left R7 dark for two epics, except worse: this one has **member-facing
   consequences already in force** ([[project_r7_fact_producer_unbuilt]],
   [[feedback_record_unattested_no_backfill]]).

7. **A ladder asymmetry this story makes operative.** §3.1 gives R7(C) (gap **≥ 12 months**) a
   **3-month** lock-in and R7(F) (gap **6–11 months**) a **5-month** one — the longer absence draws the
   shorter lock-in. R7(C) also requires 5 consecutive contributions, so it is not a pure inversion, but
   the numbers were inert until now and become consequential the day this ships. Recorded at
   `deferred-work.md:2190` and named in Decision 2026-08-06-080 as *"a separate, unaddressed Trustee-review
   question"* (CR-4.2-D3). Flag for confirmation; do **not** re-tune the seed.

8. **R7(A)'s Part 11 amendment remains unpublished (AC8).** Verified live 2026-08-07: §3.1 and the seed
   rows both still carry the proxy populations. After this story, R7(A)/(B) are blocked on **exactly
   one** thing, and it is a Trustee Panel instrument no story can satisfy (Decision 2026-08-06-077).
   Restate the completion criterion — *ratified → version published → implementation references the new
   version* — so it can be verified **published** rather than assumed.

9. ✅ **RULED — The R6 provisioning precondition for the new clause (D2).** An unprovisioned Pariwar must
   not have lock-ins silently imposed under a code default. **Decision `2026-08-07-088` clause 2
   ratifies: do not impose; surface a named sentinel** per `R7_REGISTRY_UNPROVISIONED_PRODUCER`, and
   **explicitly rejects** imposing under a code default as an unratified sanction. See **AC3**.
   *It was a governance choice, not an implementation one — and it has now been made as one.*

---

## Tasks / Subtasks

### Task 0 — Orient; confirm nothing moved under you (AC: all)
- [x] `git fetch origin`; confirm `main` is `6783eba` ([[feedback_git_fetch_before_remote_reasoning]]).
- [x] Re-confirm `10-18` … `10-22` are still `backlog` in `sprint-status.yaml` — this story must not
      assume any of them landed. In particular **10.19 is not built**, so a terminated member still has
      a live session; the overlay must not assume otherwise.
- [x] Re-verify **live**, do not trust this file: (a) `docs/legal/niyamavali.md` §3.1 R7(A)/(B) rows
      still carry the proxy populations; (b) `niyamavali-v1-clauses.sql:38,277` still carry the proxy
      `all_of`; (c) `R7_HELD_CLAUSES` still has exactly two entries with
      `owner: 'story-10-23'` ([[feedback_verify_before_committing_governance_claims]]).
- [x] Capture a **clean `pnpm ci:local` baseline** before any edit, with and without `DATABASE_URL`.
- [x] Confirm the migration head is `0096` → this story is **`0097`**.
- [x] **Read Decision `2026-08-07-088` before planning.** It ratifies four answers this file previously
      left to you (AC2 re-imposition, AC3 unprovisioned posture, AC5 concurrency, AC14 rollout flag).
      Implement them as ratified; **do not re-derive them**, and do not read the surrounding
      recommendation prose as still-open options. Escalations 2, 3, 4, 7 and 8 were **not** ruled on.

### Task 1 — ⭐ FIRST: widen the gate, and prove it can fail (AC: 9; D7)
- [x] Extend `R7HeldClause` (`packages/validity-service/src/rules.ts:100-106`) with a non-fact blocker
      field, documented as *the blockers no producer can ever supply*.
- [x] Introduce a supplied-facts surface spanning **both** fact families, and re-point
      `r7-activation-totality.test.ts:133-144` at it.
- [x] Re-express the vacuity guard (`:105`) and the NON-FACTS assertion (`:166-173`) so both still bite
      once a `member.*` key is in play.
- [x] **Revert-sanity probe:** supply the fact without narrowing the holds; confirm RED with the gate's
      own message. Record the output verbatim in the Dev Agent Record. Revert the probe.

### Task 2 — The instrument: schema, events, overlay (AC: 1, 3, 5; D1, D5)
- [x] `packages/domain/migrations/0097_*.sql` — hand-authored, journalled. Mirror `0091` clause for
      clause: no `ALTER TYPE`, no `current_state`, no state-writer trigger, append-only grants, RLS
      enable + force, one composite index `(pariwar_id, member_id, imposed_at)`.
- [x] `packages/domain/src/schema/<table>.ts` + `packages/domain/src/policies/<table>-rls.ts`.
- [x] `packages/domain/src/ids/index.ts` — branded id + smart constructor (`:622-633` is the template).
- [x] `packages/domain/src/member/restoration-discipline/{status,events,overlay,errors,write,read,index}.ts`
      — the `moderation/` directory shape, minus `reason-codes.ts` (**D5**).
      *(`errors.ts` deliberately NOT created — see Completion Notes.)*
- [x] Register the event types in `packages/domain/src/member/events.ts` (`MEMBER_EVENT_TYPES` +
      `MEMBER_EVENT_PAYLOAD_SCHEMAS` spread) and `packages/events/src/registry.ts`. Update the event-count
      fixture in `packages/domain/tests/member/life-events-markers.test.ts`.
- [x] Wire typed errors into `apps/api/src/middleware/error-mapping/index.ts` **if any are declared** —
      an unmapped domain error is a 500 (`moderation/errors.ts:7-9`). *(None are declared; vacuous.)*

### Task 3 — The registry clause + the pinning (AC: 3, 11; D2)
- [x] Author the `niy.restoration-discipline.policy` clause seed. **No `lock-in` substring** (AC11);
      add the assertion test.
- [x] Carry `benefit_mechanism = 'pool'` (frozen row 12) and the `niy.<section>.<clause>` id format.
- [x] A resolver following `member/lock-in.ts:26-67` — `resolveByClauseId` + `.safeParse` → null **at
      imposition**; `resolveByClauseVersionId` **at every later read** (`evaluate.ts:62-84` — using
      `resolveByClauseId` there would silently re-lock).
- [x] Implement the **ratified** unprovisioned posture — do not impose; surface the
      `R7_REGISTRY_UNPROVISIONED_PRODUCER`-style sentinel (Decision `2026-08-07-088` clause 2; **AC3**).
      Not a decision to make. Test asserts no row and no event on an unprovisioned Pariwar.
- [x] Carry the **concurrency rule** (max-over-live-impositions) in the clause **payload**, not in code
      (Decision `2026-08-07-088` clause 1; **AC5**, **D2**).
- [x] Test: impose → publish new versions of both clauses → re-read after their `effective_date` →
      `expires_at` unmoved.

### Task 4 — Imposition (AC: 2, 4; D3, D6)
- [x] The trigger reads `imposesRestorationObligation` **and** `lock_in_months > 0` (**D3** — R7(A) is
      `0`). No clause-id branch.
- [x] Idempotency: unbounded overlay read, skip when a live imposition for the same `clause_id` exists.
- [x] ⛔ Implement the **ratified** rule on re-imposition after expiry (Decision `2026-08-07-088`
      clause 3; **AC2**): **do not re-impose** while the same unresolved episode's completion condition
      is unsatisfiable. State it at the imposition site citing the Decision; pin it with a past-expiry
      test. Encode "same unresolved episode" explicitly — a genuinely new episode still imposes.
- [x] Calendar-correct `expires_at` (**AC4**); expiry derived at read, **no** expiry event, **no** job.
- [x] The single call site in `apps/jobs`, reusing `r7-candidate-scan.ts`'s bulk evaluation. Name it in
      the Dev Agent Record and assert it is the only writer.
- [x] ⛔ **Gate that call site behind the AC14 rollout flag, default OFF** (Decision `2026-08-07-088`
      clauses 4–5). Default-off must be the behaviour of **absent** configuration, not a seeded value.
      Write the enablement-authority statement at the flag definition site and in its description
      string: flipping it without the discharging Decision is a governance violation, not a config
      change. Test: no configuration ⇒ no imposition, no row, no event.

### Task 5 — The payload fold (AC: 5, 6, 7)
- [x] `AssembleInput` gains the overlay (optional, `?? NO_RESTORATION_DISCIPLINE`) — the `moderationOverlay?:`
      field at `payload.ts:334` (interface starts `:326`) is the template. `service.ts` resolves it inside
      the existing `Promise.all`, at the same pinned `at`.
- [x] `deriveIsValid` folds it. **`deriveIsAssignable` untouched.** Reconcile `deriveIsActive`
      deliberately and record the choice.
- [x] Append `'restoration_lock_in'` to `specialFlags` after the clause-order flags; pin the ordering
      when a moderation flag co-occurs.
- [x] New payload sub-object for the restoration clock (**D4**); `lockInStatus` byte-unchanged.
- [x] Contracts: `packages/contracts/src/members/validity.ts` — **append**, `.strict()`, camelCase.

### Task 6 — The fact, and the hold that does NOT lift (AC: 8, 9)
- [x] Project `member.joining_discipline_state` from `lockInStatus.state`; inject into the fact bag.
      **No engine, ladder, or `interpretClause` change.**
- [x] Narrow both `R7_HELD_CLAUSES` entries: `blockedBy` → `[]`, non-fact blocker → the Part 11
      amendment, `owner` → the Trustee Panel. **Do not delete the entries. Do not activate.**
- [x] Update `r7-activation-totality.test.ts:180-201` (the *"R7(A) is STILL HELD"* test) to the new
      honest state, keeping its assertions biting.

### Task 7 — Blast radius (AC: 10)
- [x] Live-DB test proving `0036`'s `LIKE 'member.%'` trigger covers the new events.
- [x] The frozen-`committed_at` re-spawn test (byte-identical roster hash **and** snapshot **and**
      assignment rows). Not a re-run of the hash function.
- [x] `contracts:emit-openapi` + determinism check; record the expected no-op.
- [x] Record the ≤60 s cache deploy step + the `invalidate-all` lever in `deferred-work.md`.

### Task 8 — Prove the dormant disclosure activates through the flag alone (AC: 7)
- [x] `packages/ui/tests/contribution-disclosure/presenter.test.ts:256-312` moves from *not-in-force* to
      *in force* with **no** change to its expected view-model.
- [x] Confirm the `@twt/ui` and `apps/mobile` diff is empty while the **rendered** disclosure is now
      reachable — the render test is what proves the second half (Story 10.16 AC3's lesson: a
      view-model assertion alone let AC9's prose reach nobody).
- [x] Decide and state the `restorationPackage` answer for a locked-in member with a healthy summary.
- [x] `pnpm i18n:check` + `pnpm microcopy:check`. **Zero new disclosure copy keys** — if you are adding
      one, re-read AC7.
- [x] ⛔ **Raise Escalation 6's copy-truth finding before merge.** `lock_in.what_it_does` asserts
      completability to R7(D)/(E)/(F) members who have no completion path. Do **not** edit the string
      and do **not** narrow the disclosure's trigger to hide them — record the finding, name the two
      dispositions, and route it. A copy change here needs a Story 2.2 tone sign-off and sits above
      this story.

### Task 9 — The architectural record (AC: 12)
- [x] Author the `AI-10-n` doc-comment block at the point of use, following
      `apps/jobs/src/assignable-roster.ts:41-74`. Pick the next free `n` in the Epic-10 series.
- [x] **Do not touch `architecture.md`** (Decision 2026-08-04-072).

### Task 10 — Measure, then validate (AC: 13)
- [x] Query-budget delta recorded in `tests/bench/p95-budget.md`, 4L marked un-attested.
- [x] The full AC13 command list, with and without `DATABASE_URL`, against the Task 0 baseline.

### Task 11 — Governance records, and the condition on `done`
- [x] `.decision-log.md` — D1–D8, with **D2** (dual clause pinning), **D3** (the shared predicate) and
      **D7** (gate widening) as the substantive entries.
- [x] `deferred-work.md` — Escalations 2, 3, 4 and 7 as **open** rows. **Escalations 5 and 9 are RULED**
      (Decision `2026-08-07-088`): record them as *resolved by ratification*, citing the Decision and
      the ratified answer — **not** as open questions ([[feedback_closure_language_precision]]).
- [x] **Close** Entry A's re-trigger by recording that the missed-cycle story is now creatable
      (`deferred-work.md:60-61`), carrying Q2/Q3/Q5/Q6 forward **verbatim**.
- [x] ⛔ **Escalation 6 is a DISCHARGE INVARIANT, not a `deferred-work.md` row.** Record it as an entry
      whose re-trigger is *this story's own closure*, and record the **invariant verbatim** — *the
      completion condition of every restoration package this story imposes must be satisfiable through
      a ratified system workflow* — **not** a story key. Name the successor story as the *expected
      vehicle* if one exists, but never as the condition itself: a story-shaped condition is
      dischargeable by creating a file and is voided by a merge or rename. **As amended by Decision
      `2026-08-07-088`: merging 10.23 with the AC14 flag OFF is permitted; enabling the flag is not,
      until the property holds.** ⚠ *This item also read "and closing it is not" — struck by Decision
      `2026-08-08-092`; the invariant binds the flag flip, not closure.* Record the flag as the enforcement mechanism
      and the discharging decision as its enablement authority — the entry must make clear that the
      flag is *how* the invariant is enforced, not a deployment toggle that happens to default off.
- [x] ✅ **The discharging decision is OWNED by the Trustee Panel** (Decision `2026-08-07-089`),
      exercised through a formal `.decision-log.md` entry; implementer owns the mechanism, Operations
      owns deployment mechanics, neither owns activation. Record **that** entry as the owner — never a
      presumed successor story, since a story key is not the condition. ⚠ **Record the discharge itself
      as still OUTSTANDING**: naming who may act creates no mechanism
      ([[feedback_closure_language_precision]] — this is an ownership assignment, not a closure).
- [x] **The copy defect is separately owed and NOT discharged by any of the above** (Decision
      `2026-08-07-088` clause 7). Record it with a named Story 2.2 tone sign-off owner. It binds
      **while the gap persists** and is not gated on the discharge.
- [x] `sprint-status.yaml` — flip `10-23-restoration-discipline-lock-in`; one combined `last_updated`
      comment-ledger entry at completion ([[project_sprint_status_ledger]]). The completion entry must
      state Escalation 6's disposition explicitly and in
      [[feedback_closure_language_precision]] terms — *"Resolved via successor story <key>"* or
      *"Resolved via explicit deferral"*, **never** an unqualified "closed".

### Review Findings

Three-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor incl. the
load-bearing-invariant checklist) against the full 51-file / 6971-line diff (the first `git diff HEAD`
pass silently dropped 12 untracked new-file paths — including the entire new primitive — and was
discarded; both invalid runs were stopped and re-launched against the corrected diff).

**Outcome: 1 decision-needed (resolved, fixed), 7 patches applied, 2 deferred, 1 dismissed as a
verified false positive.** One originally-triaged patch (`member.joining_discipline_state`) was
RECLASSIFIED to defer mid-application when the obvious fix turned out to be actively harmful —
recorded honestly below rather than silently applied. Full verification after all fixes: `@twt/domain`
unit suite 1595/1595 (DB-free), `@twt/domain` live-DB integration suite 946/946 (`:5433`, includes the
2 new/updated restoration-discipline specs), `@twt/validity-service` 224/224, `apps/jobs` 228/228
(unit) + the touched live-DB test; `tsc --noEmit` clean across `@twt/domain`, `@twt/validity-service`,
`apps/jobs`.

- [x] [Review][Decision] ~~Episode-key granularity may let a member the ratified rule was written to
      protect get re-locked anyway~~ — **RESOLVED, fixed as a patch (Decision `2026-08-08-091`).**
      `episodeKeyOf` folded `skipsCurrentYear` into the episode identity, and `skipsCurrentYear` is
      IST-CALENDAR-YEAR scoped, so it — and the anchor instant paired with it — moved at the year
      boundary and on every further missed cycle, REGARDLESS of member action. For R7(D)/(E)/(F)
      (Escalation 6: no catch-up channel exists) a further skip is mechanical, not a choice: the roster
      keeps assigning the member (AC6) and they remain unable to pay. Matching the re-imposition bar on
      that value reproduced, through skip-count drift, the exact "de-facto permanent, machine-imposed
      coverage removal" Decision `2026-08-07-088` clause 3 was ratified to bar.

      **User's ruling:** freeze the episode identity while the underlying episode remains unresolved
      and unsatisfiable; an IST-year reset alone must not create a new episode; a new episode requires
      discharge of the prior one or an explicitly ratified policy transition.

      **Fix:** a new pinned event field, `completion_unsatisfiable` (computed via
      `hasUnsatisfiableCompletionCondition(clausePayload)` at imposition, like `lock_in_months` /
      `concurrency_rule` under FR-8), replaces `episode_key` as what the bar matches on — cross-clause,
      preserving the original F→C drift precedent. `episode_key` is retained as AUDIT DATA ONLY.
      `shouldImpose` drops its `episodeKey` parameter (dead for decision purposes) and stays PURE — no
      re-resolution of historical clause versions. The documented discharge path (`UNSATISFIABLE_COMPLETION_KEYS`
      shrinking) still works with no backfill, because the outer gate re-checks the CURRENT candidate's
      payload live on every call.

      Touched: `packages/domain/src/member/restoration-discipline/{events,overlay,write}.ts`;
      `packages/domain/tests/member/restoration-discipline-overlay.test.ts` (2 new regression tests —
      the fixed skip/year-rollover case, and the discharge-lifts-the-bar case — plus updated call
      sites); `packages/domain/tests/integration/member/restoration-discipline.spec.ts` (updated
      `shouldImpose` calls + a `completion_unsatisfiable` round-trip assertion); `apps/jobs/tests/
      assignable-roster-live.test.ts` (fixture field added). `Decision 2026-08-08-091` records the full
      rationale; it does **not** amend the ratified rule text, only the matching mechanism.

      **Verified:** `@twt/domain` unit suite (1596 tests, DB-free) green; the two live-DB integration
      specs touched (`restoration-discipline.spec.ts` 15/15, `assignable-roster-live.test.ts`) green
      against `:5433`; `@twt/validity-service` full suite (224 tests) green; `tsc --noEmit` clean for
      `@twt/domain`, `@twt/validity-service`, and `apps/jobs`.

      Zero production blast radius: AC14's flag defaults OFF and this landed before merge.

- [x] [Review][Patch] ~~Batch imposition writer runs an entire Pariwar's scan-and-write pass in one
      transaction with no per-member SAVEPOINT/retry~~ — **APPLIED.**
      [apps/jobs/src/restoration-discipline.ts]. Each candidate's `imposeRestorationLockIn` call is now
      wrapped in its own `SAVEPOINT restoration_discipline_impose`, caught, rolled back to, released,
      and bumped into `skipped['write-failed']` on failure — isolating one bad candidate (registry data
      mistake, or a `MemberStreamConcurrencyError` race) to itself, no longer aborting every other
      member's already-decided imposition in the same run. The AC14 flag-resolution step is now
      similarly wrapped in its own `SAVEPOINT restoration_discipline_flag`, so a SQL-level failure
      inside `resolveFlagAudited` (which would otherwise leave Postgres in `25P02` and crash the very
      next statement) now genuinely degrades to the documented read-only scan. Both alarm via a new
      injectable `RestorationDisciplineDeps.onAlarm` (the `claim-peer-mesh.ts` precedent). Advisory-lock
      cross-run serialization was considered and NOT added — the Acceptance Auditor rated it
      low-probability (writer not cron-registered, Trustee-exclusive flag) and the SAVEPOINT fix
      already resolves the primary finding (batch-rollback amplification).

- [x] [Review][Patch] ~~`now()` inside the imposition write returns the *transaction* start time~~ —
      **APPLIED.** [packages/domain/src/member/restoration-discipline/write.ts]. Switched to
      `clock_timestamp()`, which reads the actual wall clock per call rather than the transaction start
      instant. Because `clock_timestamp()` is VOLATILE, writing it twice in one `SELECT` list (once for
      `imposed_at`, once inside `expires_at`'s expression) would evaluate it twice and could break the
      exact `expires_at = imposed_at + N months` identity AC4 tests assert — so the statement now
      resolves it ONCE via a `WITH t AS (SELECT clock_timestamp() AS now)` CTE and both columns
      reference that single value.

- [x] [Review][Patch] ~~`combineLiveExpiries` silently assumes its `live` array argument is already
      stream-ordered~~ — **APPLIED.** [packages/domain/src/member/restoration-discipline/overlay.ts].
      The "most recent live imposition" pick is now computed explicitly via `Array.reduce` comparing
      `imposedAt`, rather than trusting `live[live.length - 1]`. No longer depends on the caller
      preserving stream order.

- [x] [Review][Patch] ~~No dedicated RLS policy-regression spec for `member_restoration_impositions`~~
      — **APPLIED.** Added
      `packages/domain/tests/integration/rls/member-restoration-impositions-policy-regression.spec.ts`
      (7 tests): owning-Pariwar positive read, cross-Pariwar SELECT leak (0 rows), cross-Pariwar INSERT
      block (`42501`), fail-closed unset-scope (SELECT 0 rows + INSERT blocked), `ENABLE`+`FORCE` RLS
      both asserted true against `pg_class`, the `members` FK orphan rejection (`23503`), and
      `twt_service`'s grant is SELECT-only (no INSERT). Same-tenant UPDATE/DELETE refusal was already
      covered in `restoration-discipline.spec.ts` and is not duplicated (this table has no UPDATE grant
      at all, unlike the moderation precedent's RTBF-scrub case).

- [x] [Review][Patch] ~~`concurrency_rule` has no DB-level CHECK restricting it to known enum values~~ —
      **APPLIED.** Added CHECK `member_restoration_impositions_concurrency_rule_known` (migration 0097
      + `schema/member_restoration_impositions.ts`, amended directly — unmerged, unshipped migration),
      mirroring `RESTORATION_COMBINATION_RULES`; a future ratified rule needs this list widened in
      lockstep with `combineLiveExpiries`'s exhaustive `switch`. Pinned by a new live-DB revert-sanity
      test in `restoration-discipline.spec.ts`.

- [x] [Review][Defer] ~~`member.joining_discipline_state` is conditionally dropped from the fact
      bag~~ — **RECLASSIFIED from patch to defer during patch application; the obvious fix is wrong.**
      [packages/validity-service/src/service.ts:160-162]. Investigation before applying the originally
      proposed fix ("merge the member-facts bag unconditionally") found it would be ACTIVELY HARMFUL:
      `contributionBag === null` is the D6 sentinel gate `evaluateAppliedR7ClauseSlots` (`rules.ts:480`)
      checks via `if (facts === null) return { slots: [], registryUnavailable: false, restoration: null }`
      — the mechanism that keeps "contribution history not derivable" from ever manufacturing a
      partially-evaluated, false-clean R7 record (exactly the hazard `producer.ts`'s own extensive
      docs on `coveredFrom === null` warn against). Merging `member.joining_discipline_state`
      unconditionally would flip that gate to non-null when contribution facts are genuinely
      unavailable, running the (FROZEN — Task 6: "No engine, ladder change") ladder on a
      half-populated bag. Today this is 100% inert either way (R7(A)/(B) both HELD). The real question
      — should R7(A)/(B), once activated, be evaluatable from `member.joining_discipline_state` ALONE
      even when the unrelated `contribution.*` family is unavailable, or should the family stay
      all-or-nothing gated? — is an architecture decision for whichever story activates R7(A)/(B), not
      a same-story patch against a frozen ladder. Deferred with the corrected reasoning below.

- [x] [Review][Patch] ~~The imposition event's audit `from_state`/`to_state` fields are read via a
      bounded state lookup~~ — **APPLIED.** Added `getCurrentMemberState` (unbounded, no `lte`) to
      `packages/domain/src/member/read.ts`, mirroring `getMemberStateAt`'s doc style and
      `getCurrentMemberRestorationDiscipline`'s clock-domain rationale; `write.ts`'s audit-shape read
      now uses it instead of `getMemberStateAt(db, input.memberId, input.now)`.

- [x] [Review][Patch] ~~Comment in the AC14 gating block says the policy clause is "resolved BEFORE the
      scan so an unprovisioned Pariwar costs nothing"~~ — **APPLIED.**
      [apps/jobs/src/restoration-discipline.ts]. Corrected to state the scan runs unconditionally and
      only the imposition write is skipped when `policy === null`.

- [x] [Review][Defer] No DB-level constraint prevents two simultaneously-live impositions for the same
      `(member_id, clause_id)` beyond the in-process read-then-write check in `shouldImpose`
      [packages/domain/migrations/0097_member-restoration-discipline.sql] — deferred, real gap
      introduced by this story (not pre-existing), but "live" is a function of wall-clock time vs.
      `expires_at` and isn't cleanly expressible as a static UNIQUE/CHECK; a correct fix needs a `tstzrange`
      GiST exclusion constraint, which is a larger schema decision entangled with the transaction-model
      patch above. Not blocking since the writer is unreachable while AC14's flag stays OFF.

**Dismissed as noise (1):** the Blind Hunter's claim that `imposesRestorationObligation` and
`contributesViolatorFlag` are contradictory/undocumented-diverging predicates. Verified false:
`contributesViolatorFlag` (`packages/validity-service/src/rules.ts:429-434`) is a direct, provable
wrapper — `payload !== undefined && imposesRestorationObligation(payload)` — and
`imposesRestorationObligation` already incorporates the `lock_in_months > 0` check via
`RESTORATION_OBLIGATION_KEYS` (`rules.ts:401-412`). The reviewer's "zero grep hits for a direct call"
claim was itself in error (`rules.ts:434` calls it directly).

### Post-merge Findings — production-path validation against the live 8.14 emitter (2026-08-09)

**Context.** Story 8.14 (`0f72c37`) shipped the `alert.closed` producer, so the chain AC13 validates
against can now be driven end to end from real production code rather than fixtures for the first
time. This pass drove `cycle open → assignment → close sweep → alert.closed → projection →
contribution facts → skips_current_year → R7 scan → imposition → payload fold` on the live test DB
(`:5433`). **8.14's own gate (`apps/jobs/tests/close-cycle-alert-live.test.ts`) was re-run first and is
5/5 green** — it proves the chain as far as `skipsCurrentYear = 1` and stops there by design.

**These are OBSERVATIONS against this story's validation scope, not defects in shipped behaviour.**
No production behaviour is wrong in either finding; both concern what the story's evidence covers and
what an operator can see. Neither is a `done`-blocker: AC14's flag defaults OFF, so the imposition
writer remains unreachable in every environment.

- [ ] **[Finding][Observation] Every hop AFTER `skips_current_year` is evidenced only against
      fixtures, and the missing production precondition degrades to a false all-clear at the JOB
      level.** AC13 enumerates suites, not chain coverage, so this was not a gap against the AC as
      written — it is a gap against what the AC was *for*.

      The three shipped suites each stop short of the join: `restoration-discipline-fold.test.ts` is
      DB-free with a literal `liveOverlay()`; `validity-service/tests/integration/contribution-facts.spec.ts`
      inserts `alert.closed` as `'{}'::jsonb` at a hardcoded `event_version 9` **below the projector**;
      `apps/jobs/tests/assignable-roster-live.test.ts` seeds `member.restoration_discipline.imposed`
      directly. Each is legitimate in isolation; collectively nothing connects a production-produced
      skip to the ladder, the writer, or the fold.

      ⚠ **The load-bearing half of this finding is the precondition, not the coverage.** A
      `contribution_projection_coverage` row is required before `deriveContributionFacts` can return
      anything (`packages/validity-service/src/producer.ts:508` — `coveredFrom === null` ⇒ `null`).
      Without it EVERY member degrades to the `producer_unavailable` sentinel and **no clause can
      apply**. `scanR7ViolatorCandidates` handles this honestly and the Trustee-Lite surface renders
      `detection_unavailable` — but `runRestorationDiscipline`'s own result does **not** carry the
      distinction. Measured, with coverage absent:

      ```
      { writerEnabled: false, unavailable: null, membersScanned: 1, impositionsWritten: 0, skipped: {} }
      ```

      That is byte-identical to a genuinely clean Pariwar. `unavailable` is the field built to name
      exactly this class of gap (it already carries `R7_REGISTRY_UNPROVISIONED_PRODUCER` and
      `RESTORATION_POLICY_UNPROVISIONED_PRODUCER`, deliberately kept distinct so an operator is not
      sent to provision the wrong instrument), and projection coverage is a **third** such gap with no
      sentinel of its own. This is the same shape as the `false all-clear` the scan's own comment
      forbids, arriving one layer up in the telemetry. It bit this validation pass directly: the first
      run reported `applied = []` and was misread as a clause gap until the backfill was added.

      ⛔ **Not proposing a fix here** ([[feedback_gap_analysis_observational]]). If the Panel or the
      story owner judges the job-level indistinguishability material, the conditional escalation is
      whether a third sentinel is owed *before* the AC14 flag is ever flipped — because after a flip
      this field is what an operator checks to confirm the writer did nothing for the right reason.
      ⚠ **The sentinel itself is implementer-owned construction** under Decision `2026-08-07-089`'s
      ownership table; only its *sequencing against the flip* is a Panel question. Routed on that
      narrow basis as Q1 of
      `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-09-story-10-23-ac14-mechanics.md`.

- [ ] **[Finding][Observation] AC14 describes enablement as one authorized act; the substrate spreads
      it across a staged ramp whose first step is where coverage removal actually begins, and every
      intermediate state resolves to DISABLED until a cohort is named — so a Panel flip authorized by
      Decision `2026-08-07-089` can land with the writer still off and no signal saying why.**
      Verified live, and all three behaviours below are correct and fail-safe individually. The
      observation is that AC14 is silent on the mechanics, and the mechanics determine both *when* the
      authorized harm begins and *whether the authorized act does anything at all*.

      1. **`off → full` is rejected.** `LEGAL_FLAG_STATE_TRANSITIONS`
         (`packages/domain/src/feature-flags/registry.ts:71-79`) admits `off` only to `off` or
         `canary`, so reaching `full` takes three `createFlagVersion` calls and three audit rows.
         ⚠ **The ladder is not a four-step line, and the count is not the governance-relevant
         number.** Identity transitions are legal in *every* state — deliberately, since
         re-publishing the same state is how a cohort is narrowed — and `rolled_back` is reachable
         from any state that ever served. More importantly, **coverage removal begins at the FIRST
         enabling version**, `off → canary` with a non-empty cohort: one call, not three. The two
         remaining calls only widen *who else* loses coverage. An earlier draft of this finding
         framed the threshold as "three acts to enable"; that mis-locates the harm boundary by two
         steps and is corrected here.
      2. **`canary` and `rollout` with an empty cohort resolve to `enabled: false`**
         (`packages/domain/src/feature-flags/evaluate.ts:164`, `reason: 'cohort_empty'`).
         `FLAG_DEFAULTS.restoration_discipline_imposition` ships `cohortDefinition: { clauses: [] }`
         (`registry.ts:207`), so the natural two-step "flip to canary now, narrow it next"
         leaves the writer **off** — deliberately, per that arm's Review Pass 4 comment. ⚠ That same
         comment records that **the admin console has no cohort editor** and "carries the existing
         (empty) cohort forward", so the path that populates a cohort is not the console path.
      3. **A 5 s in-process TTL** (`FLAG_CACHE_TTL_MS`,
         `packages/domain/src/feature-flags/cache.ts:36`) means a resolution taken shortly
         before the flip continues to serve `state_off` until it expires. Observed in this pass: the
         post-flip run still reported `writerEnabled: false` until `clearFlagCache()` was called.

      AC14's text is otherwise unusually explicit about enablement authority — it names the Panel, the
      Decision entry, and what does *not* count as authorization. It is silent on the mechanics, and
      the mechanics are what makes a correctly-authorized flip look like it did nothing. ⚠ The
      **failure direction is safe** (the writer stays off), which is why this is an observation rather
      than a defect — but it is also why it would not be noticed until someone re-flips, and a
      re-flip attempt on an already-`canary` flag is the path most likely to be mistaken for a
      broken toggle.

      ⛔ **Not proposing a fix.** Conditional escalation: the enabling Decision should authorize what
      will actually be executed, so the scope of a single AC14 authorization — one enabling version
      with a named cohort, or the whole ramp to `full` — is worth settling **before** that Decision is
      authored, not after. ⚠ Note the escalation is about **scope, not act-count**: because the first
      `off → canary` version with a non-empty cohort already removes coverage, "how many acts?" is the
      wrong axis. Routed as Q2 of
      `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-09-story-10-23-ac14-mechanics.md`.

### Evidence (not a finding) — R7(B) confirms expected blocker precedence

**Observation.** With 8.14's emitter live, a member who missed their only assigned cycle now reaches
`contribution.skips_current_year = 1` and `contribution.in_lapse = true` **from production code**,
with facts fully available (`status: 'ok'`, `heldFacts: []`, `coveredFrom` set). The R7 scan
nonetheless returns `imposingClauses = []` — no lock-in is imposed. Measured live:

```
total_count 0 · ever_contributed false · skips_current_year 1 · in_lapse true
imposing = []
```

**Classified as EXPECTED under this story's contract, on the following verification — NOT as a
defect.** The member's clause is R7(B) (`ever_contributed == false`, `restoration.lock_in_months: 3`,
so `imposesRestorationObligation` would return `true` if it were ever evaluated). It is not evaluated
because it is HELD, and the hold is exactly the state AC8/AC9 describe:

| Check | Live state (verified 2026-08-09) |
|---|---|
| AC8 text | *"R7(A) and R7(B) are **NOT** activated"* — stated in terms, not inferred |
| `prd.md:346` | normative and unconditional; adding `r7-b` to `R7_ACTIVATED_CLAUSE_IDS` is forbidden |
| `R7_HELD_CLAUSES` R7(B) entry | `blockedBy: []` · `blockedByNonFacts: ['niyamavali-part-11-amendment:r7a-b-population-replacement']` · `owner: 'trustee-panel'` |

So **every FACT blocker is satisfied and the clause is still correctly held** on a non-fact blocker no
producer can supply. That is precisely the end state AC9's two-bucket split was built to make
representable and honest — the case the pre-10.23 apparatus could not distinguish from an unjustified
hold. ⭐ **Read this as the mechanization working, observed on live data for the first time**, not as
an instrument failing to fire.

⚠ **What this evidence does newly establish**, and why it is recorded rather than discarded: the
fact-side precondition is now genuinely met in production, so R7(B)'s hold rests on the Trustee
Panel's unpublished Part 11 amendment **alone**. Story 10.23 discharged everything a story could and
correctly moved `owner` to `trustee-panel`. This record exists so that ownership stays visible with
evidence attached, rather than decaying into the unowned-deferral shape that left R7 dark for two
epics ([[project_r7_fact_producer_unbuilt]], [[feedback_record_unattested_no_backfill]]). **No
reclassification is proposed and none is owed unless the amendment is published.**

**Method note.** Findings and evidence above were produced by an investigative probe driving the real
production path (11 real cycles, 10 confirmations via `appendConfirmedContribution`, the real sweep,
the real job). The probe is **deliberately NOT hardened into a gate and NOT committed** — it is
console-logging and investigative, and hardening it is a separate decision. The completing case it
measured, recorded here as attested for the record: R7(D) applied, `writerEnabled: false` ⇒ 0
impositions with the flag absent (AC14 holds on the real path), `writerEnabled: true` ⇒ 1 imposition
carrying both version pins, overlay `in-lock-in` imposed 2026-08-08 → expires 2026-11-08 (3 months,
calendar-clamped per AC4), fold `isValid: false` / `isAssignable: true` (the AC6 divergence, on
production-produced data).

---

## Dev Notes

### The arc this story closes, and the one it opens

Stories 10.24–10.26 supplied facts. **This one supplies a consequence.** Every R7 verdict the ladder has
been producing since 10.24 has been, until now, an explanation with nothing behind it. After this story
a ladder verdict moves a member's coverage — which is why AC7's disclosure and AC6's roster pin are not
peripheral. They are what makes an automatic sanction survivable.

It also unblocks two things that have been waiting on it by name: the member-facing missed-cycle surface
(`deferred-work.md:20-61`, six trustee answers already recorded) and the eventual re-pin of
`missed-closed-cycle-v1` (Decision 2026-08-07-086, deferred until *"Story 10.23 defines the complete
restoration lifecycle"*). ⚠ **This story defines the lock-in half of that lifecycle, not the catch-up
half** (**D8**). Do not let the re-trigger language imply otherwise when writing the closure note
([[feedback_closure_language_precision]]).

And read that asymmetry for what it is. Every prior story in this arc could ship a half and leave the
rest honestly dark, because a dark fact harms nobody. **This one cannot.** The moment the lock-in is
real, the missing half stops being an absent feature and becomes an **obligation the member is told
they can discharge and cannot** (Escalation 6). That is why Escalation 6 carries a blocking discharge
invariant and the other eight do not. ⚠ *This sentence read "blocks `done`" — corrected by Decision
`2026-08-08-092`: it blocks the **AC14 flag flip**, which is where the obligation starts biting.*

Note how that condition is phrased: over the **system**, not over the backlog. *"A successor story must
exist"* would be dischargeable by creating a file and voided by a later merge or rename; *"every
package this story imposes must have a satisfiable completion path"* stays true and stays checkable
through any reorganisation, and can be tested against a running system by taking one member under each
of R7(D)/(E)/(F) and asking whether a ratified path reaches the state their clause calls completion.
The successor story is the expected vehicle. It is not the requirement.

### Things that will bite

- **`deriveIsAssignable` must stay signature-frozen.** It is the only structural reason failure mode 2
  is impossible. Widening it "for symmetry" is the single most damaging change available in this diff.
- **`lock_in_months: 0` on R7(A).** `imposesRestorationObligation` returns `true` for R7(A) (it has
  `consecutive_required: 3`), so a trigger that reads only that predicate will impose a zero-length
  lock-in on every R7(A) member. **D3**.
- **The `.strict()` DTO plus a warm cache row.** Any payload-shape change has a ≤60 s window where a
  pre-deploy cache row 500s the parse. Known, handled, must be recorded as a deploy step — 10.25's
  entry is the template (`deferred-work.md:171-179`).
- **`clauseId.includes('lock-in')`.** `member-status/presenter.ts:145`. AC11.
- **`expired-not-renewable (lock-in violation)`** is the MemberStatusPanel's only existing lock-in
  headline (`ux-design-specification.md:1894`; `member-status/presenter.ts:93`) and it means something
  else entirely — a **join** lock-in that is also `!isValid`. **Do not reuse it** for this instrument,
  and note that `deriveHeadlineState` is **byte-pinned by Story 10.16 AC3**. If a locked-in member's
  admin headline needs to change, that is a finding to raise, not an edit to make.
- **The Appeal CTA at `ux-design-specification.md:1893`** still has no moderation destination (Story
  10.22 is `backlog`). If this instrument surfaces on the status panel, do **not** let it render a CTA
  into nothing — the SCP §4e already flags this for the moderation states.
- **Migration regeneration.** Never `db:generate`; `42P07` ([[project_live_db_test_gotchas]]).
- **Raw-SQL rows return timestamps as strings.** If any read uses `db.execute`, Drizzle's column mapper
  is bypassed — coerce with `toDate()`. `moderation/read.ts:238-251` records the TypeError this caused.
- **`R7_HELD_FACTS` and the new supplied-facts surface answer different questions.** `rules.ts:124-129`
  says so; do not collapse them to make a test simpler.
- **`packages/domain/src/trustee-lite/violator-flags.ts` is byte-frozen** (10.24 AC5). If it needs a
  change, that is a finding, not a task.

### Project Structure Notes

- The validity payload lives in **`packages/validity-service/`**, not `packages/domain/src/member/validity/`.
- Contracts must **never** import `@twt/domain`'s pg-touching namespaces — it leaks `pg` into the RN
  Metro bundle ([[project_contracts_domain_bundle_boundary]]). The moderation contracts **re-declare**
  their tuples and guard the drift with a test-only sync check
  (`packages/contracts/tests/member-moderation.test.ts`). Mirror that.
- The validity payload DTO is **camelCase on the wire** — the exception in this codebase. The moderation
  DTOs are snake_case. Do not mix them ([[feedback_story_validate_footguns]]).
- Dynamic `.limit()` calls are clamped by the domain-accessor gate; use `clampLimit` on any paged read.
- **The architectural record is a code comment, not a document.** `architecture.md` was frozen before
  Epic 4 and carries no overlay text at all; the `AI-{epic}-{n}` doc-comment at the point of use is the
  canonical form (Decision 2026-08-04-072). **AC12.**
- If the new module needs a permission key, `PERMISSION_CATALOG_VERSION` is **29**
  (`rbac/permissions.ts:367`) — but it probably does not: imposition is automatic (**D5**), and reads
  ride the existing member/validity surfaces.

### References

- `_bmad-output/planning-artifacts/epics.md:3867-3894` — the story's ACs; `:3651-3660` — the
  Stories 10.16–10.23 preamble and the constitutional frame.
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:70-78` (§1d non-subsumption),
  `:83-104` (§1e the finding + the FR-8 model), `:106-130` (§1f), `:253-268` (**D2**), `:440-470` (**D8**).
- `docs/legal/niyamavali.md:74-83` (§3.1 ladder + the 2026-08-07 skip interpretation), `:92` (§3.3).
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:323-334` (FR-8), `:344-346` (the proxy
  disclaimer + the normative prohibition), `:864` (the disclosure applies to lock-in).
- `.decision-log.md` — `2026-08-04-072` (⚠ **the `AI-10-n` record, not `architecture.md`** — AC12),
  `2026-08-06-076` (consumed on completion), `2026-08-06-077` (the Part 11 owner), `2026-08-06-078`
  (supersede ≠ reinterpret), `2026-08-06-079` (**D5** non-subsumption), `2026-08-06-080` (R7(F)/(G)
  ratified; CR-4.2-D3 named open), `2026-08-07-086` (the missed-cycle ruling + the catch-up note).
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:150` (the ratify-first
  sequencing), `:158-161` (10.23 is the largest build), `:522` (the unratified §3.0 amendment),
  `:571-574` (the §4e UX amendments), `:631` (success criterion 7).
- `ux-design-specification.md:89` (Stance #5 / the SIE allowlist), `:313`/`:323` (the lock-in clock as a
  calm presence), `:1889-1897` (`<MemberStatusPanel>`); `docs/tone-guide.md:83-142` (prohibited frames).
- `_bmad-output/implementation-artifacts/deferred-work.md:20-61` (Entry A, six answers), `:124-166`
  (the R7 fact-hold entry), `:171-179` (the cache deploy step), `:2190`, `:2240`.
- `_bmad-output/implementation-artifacts/10-25-r7a-restoration-accounting.md:515-533` (**D5**, the
  coupling this story must honour); `10-26-…md:631-647` (**D6**, why activating a clause with its fact
  was legitimate there and is not here).
- Code: `packages/domain/migrations/0091_member-moderation.sql` · `packages/domain/src/member/moderation/*`
  · `packages/domain/src/member/lock-in.ts` · `packages/domain/src/member/read.ts:170-228` ·
  `packages/validity-service/src/{payload,service,rules,producer,types}.ts` ·
  `packages/validity-service/tests/r7-activation-totality.test.ts` ·
  `packages/ui/src/contribution-disclosure/*` · `packages/ui/src/member-status/presenter.ts:68-165` ·
  `apps/jobs/src/assignable-roster.ts:41-74` · `scripts/member-state-invariant/check.ts`.

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code `/bmad-dev-story`), 2026-08-07.

### Debug Log References

#### Task 0 — baseline + live governance re-verification (2026-08-07)

| Check | Result |
|---|---|
| `git fetch origin`; `origin/main` | `6783eba` — matches the story's `baseline_commit`. ✅ |
| Working branch | `feat/10-23-restoration-discipline-lock-in`, cut off `f2d90cd` (the Decision `2026-08-07-088`/`089` governance commit, which sits one ahead of `main`) — history reads governance → implementation ([[feedback_governance_commits_precede_implementation]]). |
| `10-18` … `10-22` in `sprint-status.yaml` | all still `backlog`. ✅ 10.19 is not built; the overlay assumes nothing about terminated-member sessions. |
| §3.1 R7(A)/(B) populations | still the proxies — *"Break **before 10 contributions**"* / *"Registered but **never contributed**"*. ✅ Part 11 amendment **NOT published**. |
| `niyamavali-v1-clauses.sql` R7(A) `:38` / R7(B) `:277` | still carry the proxy `all_of` (`contribution.total_count < 10`; `ever_contributed == false`). ✅ |
| `docs/legal/niyamavali.md` "subsum" / "joining discipline" / §3.0 | **0 / 0 / absent** — Escalation 2 stands exactly as written. |
| `R7_HELD_CLAUSES` | exactly two entries, both `owner: 'story-10-23'`, both `blockedBy: ['member.joining_discipline_state']`. ✅ |
| Migration head | `0096_members-custom-fields` (journal idx 96) → this story is **`0097`**. ✅ |
| `pnpm ci:local` (no `DATABASE_URL`) | **30 jobs green**, `integration-tests` skipped. Clean baseline. |

##### The live-DB baseline, and both of its failures chased to root cause (AC13)

The `DATABASE_URL` baseline run reported `✗ test (unit)` and `✗ integration-tests`. AC13 forbids
treating either as presumptively innocent, so both were chased:

**(1) `ReferenceError: R7_SUPPLIED_FACT_KEYS is not defined` (`@twt/jobs`, 2 suites) — MINE, a real
defect, now fixed.** The run overlapped my in-flight Task 1 edit and caught a **module
initialization-order hazard** I had just introduced. `rules.ts` held
`import type { AppliedRestorationRequirement } from './producer.js'` — type-only, therefore fully
**erased at runtime**. Adding a *value* import of `R7_SUPPLIED_FACT_KEYS` for the widened surface
materialized a real runtime edge into a graph (`payload.ts → rules.ts`, plus the barrel re-exporting
both) that the erased edge had been keeping safe, and the top-level spread then read a binding still
in its temporal dead zone.

⚠ **What did NOT catch it:** `pnpm typecheck`, `pnpm lint`, and `@twt/validity-service`'s own full
suite were all green — the cycle only bites through a *consuming* package's entry point. Fixed by
hoisting the union into its own leaf module, `packages/validity-service/src/r7-fact-surface.ts`,
which imports only two leaves and has no importer but the barrel and the gate's test; `rules.ts`'s
producer import is back to type-only with a comment saying why it must stay that way. Re-verified by
running the two suites that failed — `assignable-roster-live` + `measured-validation-pool-spawn` —
green.

**(2) `member-moderation.spec.ts` → "AC4: an audit line is written per action" — INNOCENT, the known
double-run pollution.** `expected [] to include 'member_moderation.suspended'`. Confirmed by running
the suspect spec **in isolation on a stashed, pristine tree**: **22 passed (22)**. Root cause is
[[project_ci_local_double_run_pollution]] — a global `DATABASE_URL` makes `ci:local`'s *unit* job run
the live-DB specs too, so `@twt/api`'s integration suite executes **twice** and the second pass reads
audit rows the first pass had already consumed. Pre-existing, unrelated to this story, and not
introduced by it.

**Baseline of record:** 30/30 static jobs green; live-DB green once the double-run artifact is
discounted.

#### Task 1 — ⭐ revert-sanity probe (AC9/D7): the widened gate CAN be made to fail

With the widened gate in place, `member.joining_discipline_state` was added to
`R7_SUPPLIED_MEMBER_FACT_KEYS` **without** narrowing the holds. The suite went RED with the gate's
own message — verbatim:

```
 ❯ tests/r7-activation-totality.test.ts (11 tests | 1 failed) 13ms
   × Story 10.24 — the hold is FALSIFIABLE, not decorative (AC3) > every held clause's blockedBy
     names a fact key NO producer, in ANY family, supplies 6ms
     → niy.contribution-discipline.r7-a claims to be blocked by "member.joining_discipline_state",
       but a producer DOES supply it — the hold has outlived its reason and must be re-justified or
       lifted.: expected true to be false // Object.is equality

 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```

**This is the finding, mechanized.** Before the widening, that *same* edit left the suite fully
GREEN: the assertion checked `blockedBy` against `R7_SUPPLIED_FACT_KEYS` — the `contribution.*`
producer's key set — which a `member.*` key can never enter. The hold would have been certified
honest at the exact moment its stated reason was satisfied. Probe reverted immediately; suite back to
**11 passed**, `typecheck` and `lint` clean.

#### Task 10 — the final AC13 validation record (2026-08-08)

| Run | Result |
|---|---|
| `pnpm ci:local` (no `DATABASE_URL`) | ✅ **30 / 30 jobs green — PASSED.** |
| `DATABASE_URL=… pnpm ci:local` | **29 / 30 green**, `integration-tests` red on ONE spec — chased below. |
| `pnpm --filter @twt/validity-service exec vitest run tests/integration/p95-bench.spec.ts` | p50 **6.88 ms** · p95 **9.91 ms** · p99 **10.36 ms** (200 ms budget). |
| `pnpm contracts:emit-openapi` + `contracts:check-openapi-determinism` | `openapi/v1.yaml` **byte-identical** — the expected no-op (AC10a). |
| `pnpm member-state:check` · `domain-invariants:check` · `i18n:check` · `microcopy:check` · `governance-boundary:check` · `benefit:check` · `schema:check` | ✅ all green. |

**The one red spec, chased to root cause and CONFIRMED INNOCENT.**
`apps/api/tests/integration/member-moderation/member-moderation.spec.ts` → *"AC4: an audit line is
written per action"*, `expected [] to include 'member_moderation.suspended'`. **`1 failed | 870
passed`.** Innocence established twice, not assumed:

1. It failed **identically in the Task 0 baseline, on a stashed pristine tree, before any edit of
   mine existed** — so it cannot be a regression from this story.
2. Re-run **in isolation on the FINAL tree**: **22 passed (22)**.

Root cause is [[project_ci_local_double_run_pollution]] — a global `DATABASE_URL` makes `ci:local`'s
*unit* job run the live-DB specs as well, so `@twt/api`'s integration suite executes **twice** and the
second pass reads audit rows the first already consumed. A pre-existing harness artifact, unrelated to
this story, and **not** papered over.

⚠ One cosmetic edit (merging two `@twt/domain` import statements in
`tests/restoration-discipline-fold.test.ts`) landed after the live-DB run's `lint`/`typecheck` jobs had
already passed. Independently re-verified: `lint` clean and the file's own suite **13 passed**. The
no-DB `ci:local` above covers the exact final tree.

### Completion Notes List

**All 14 ACs satisfied; all 12 tasks complete.** Escalation 6's discharge invariant is undischarged and
the AC14 flag is OFF.

> ⚠ **As written at implementation time this read: *"The story is `review`, NOT closed."*** Corrected by
> Decision `2026-08-08-092` — Decision `2026-08-07-088` clause 4 had already moved the invariant's
> binding point to the **flag flip** rather than closure, so closure was never gated. The story is
> `done`; **the flag is still OFF and the gap is still open.**

- **AC1 — the SECOND overlay.** `member_restoration_impositions` mirrors `member_moderation_actions`
  clause for clause: append-only grants, RLS enable + force, no `current_state`, no `ALTER TYPE`, no
  state-writer trigger, one composite `(pariwar_id, member_id, imposed_at)` index. The fold is PURE
  and TOTAL (unknown type or malformed payload → identity). `members.state` provably never moves —
  pinned by a live-DB test that builds a REAL `signup → lock-in → active` stream. The
  `member-state-invariant` ALLOWLIST is **byte-unchanged**.
- **AC2 — automatic, idempotent, and it does not re-lock the undischargeable.** Trigger is the
  already-shipped `imposesRestorationObligation` **and** `lock_in_months > 0` (D3). The ratified
  no-re-imposition rule is implemented with an explicit episode identity and stated at the imposition
  site citing Decision `2026-08-07-088`.
- **AC3 / AC11 — both halves pinned; the clause id carries no `lock-in` substring**, asserted by test.
- **AC4 — expiry derived, never evented.** No `…expired` event, no job. Calendar-correct via Postgres
  `make_interval`, DB-authoritative instants.
- **AC5 / D4 — two clocks, simultaneously representable, independently expiring.** `lockInStatus` is
  byte-unchanged; the restoration clock is a sibling sub-object. The concurrency rule is REGISTRY DATA.
- **AC6 — coverage yes, roster never.** A locked-in member is `isValid: false, isAssignable: true`.
  `deriveIsAssignable` is untouched and its **signature** is the guarantee. `deriveIsActive` was
  reconciled deliberately (FR-12A is *"valid AND past lock-in AND not suspended"*, and a locked-in
  member satisfies neither of the first two conjuncts) — recorded here rather than inferred, following
  the precedent Story 10.10 set at that same function.
- **AC7 — activation through the flag alone.** The `@twt/ui`, `apps/mobile` and `packages/i18n`
  **source diffs are empty**; zero new copy keys.
- **AC8 / AC9 — the fact is supplied and R7(A)/(B) are STILL HELD**, narrowed to `blockedBy: []` with
  the unpublished Part 11 amendment as their only remaining blocker and their owner moved to
  `trustee-panel`.
- **AC10 — `openapi/v1.yaml` byte-identical** (the expected no-op); the Story 4.8 cache needed **no
  new trigger**; `POOL_ASSIGNMENT_HASH_VERSION` not bumped, licensed by a genuine re-spawn test.
- **AC12 — `AI-10-1`** at the point of use (`overlay.ts`); `architecture.md` NOT amended.
- **AC13 / AC14** — see the validation record and the flag notes below.

#### ⚠ Deliberate variances and judgement calls, recorded rather than left to be inferred

1. **`errors.ts` was deliberately NOT created**, though Task 2's file list names it. This instrument
   declares **no typed domain errors**: imposition is automatic, has no request path, and returns a
   typed `ImpositionDecision` instead of throwing. An empty error module would be dead code — and
   `moderation/errors.ts` records that a dead error class was *removed* in review for exactly this
   reason. The paired subtask ("wire typed errors into the API error-mapping **if any are declared**")
   is therefore satisfied vacuously and honestly.
2. **The job is exported but NOT registered on a cron.** Scheduling something nobody may yet enable
   would imply an operational cadence the governance position does not support. Stated at the export
   site; it is the successor concern of whichever change discharges Escalation 6.
3. **`scanR7ViolatorCandidates` gained an additive `impositionInputs` field** rather than the writer
   getting a second R7 evaluation path. AC2 requires reusing the bulk evaluation — *"the trustee sees
   what is imposed and what is imposed is what the trustee sees"* — and the new field costs **zero**
   queries (built from data the scan already holds above its own loop). It sits deliberately OUTSIDE
   `payload`, so the accusation channel handed to `summarizeViolatorFlags` stays byte-identical.
4. **The episode key deliberately excludes the clause id.** Including it looked right (R7(D) and
   R7(E) are different rungs) but would re-lock a gap-rung member who merely drifted from R7(F) into
   R7(C) **without acting or resolving anything** — the continuous machine-imposed removal the Panel
   barred. The skip count already distinguishes the D→E case, which is the one involving a genuinely
   new missed cycle.
5. **The concurrency rule rides the imposition EVENT**, resolved from the policy clause at imposition,
   rather than being re-resolved at read. This satisfies AC5's "registry data, not a code constant"
   *and* AC3's pinning (a later Panel amendment cannot move an existing member's effective expiry),
   with no read-path query.

#### ⛔ Findings raised, not absorbed

- **A REAL DEFECT OF MINE, caught by the baseline and worth recording as a repeatable trap.** Adding
  a **value** import to `rules.ts` where only a **type** import had existed materialized a
  module-initialization cycle and broke `@twt/jobs` at RUNTIME
  (`ReferenceError: R7_SUPPLIED_FACT_KEYS is not defined`). `typecheck`, `lint` **and the package's
  own full suite** were all green — only a *consuming* package's entry point fails. Fixed by hoisting
  the union into its own leaf module (`r7-fact-surface.ts`); `rules.ts`'s producer import is back to
  type-only with a comment saying why it must stay that way.
- **⭐ AN OVER-APPLICATION IN MY OWN AC2 BAR, caught in self-review before merge.** The first
  implementation tested `overlay.impositions.some((i) => i.episodeKey === episodeKey)` — every
  imposition, regardless of liveness. The ratified rule says *"**An expired imposition** does NOT
  re-impose…"*: it bars **re**-imposition, not **concurrent** imposition. Liveness-blind, it would
  have **UNDER-imposed**: within one scan where R7(D) (3 months) and R7(F) (5 months) both apply to a
  single episode, ascending clause-id order writes R7(D) first and the bar would then refuse R7(F) —
  leaving the member with 3 months where §3.1 prescribes 5. Fixed to test expired impositions only;
  concurrency is AC5's job and resolves to the MAXIMUM, which is the §3.1-faithful answer. Pinned by
  a named regression test. ⚠ Worth noting the direction: this bug was *lenient* toward the member on
  the individual rung and *unfaithful* to §3.1 overall, which is exactly the kind of error that does
  not announce itself in a green suite.
- **The copy-truth defect is TWO strings, not one.** The story text says one of the four shipped
  strings is untrue; `suspension_disclosure.lock_in.a11y` repeats the same sentence verbatim, so a
  screen-reader user hears the false claim too. Both pinned by a test asserting the defect is
  REACHED. Routed to a Story 2.2 tone sign-off; **not** fixed here (AC7 freezes the implementation).
- **Escalations 2, 3, 4, 7 and 8 remain OPEN** exactly as authored, re-verified live and recorded in
  `deferred-work.md`. Escalations 5 and 9 are recorded as **resolved by ratification**, not as open
  questions ([[feedback_closure_language_precision]]).

#### ⛔ The condition on the FLAG FLIP — closing this story is NOT a discharge

**Escalation 6's discharge invariant is UNDISCHARGED**, and its honest disposition is
***"Resolved via explicit deferral to a Trustee Panel decision that does not yet exist"*** — never an
unqualified "closed". No authorized catch-up process exists, so R7(D)/(E)/(F)'s packages remain
unsatisfiable. The AC14 flag (default OFF) is the enforcement mechanism, and the invariant binds the
**flag flip**. **Merging and closing with the flag off are permitted; enabling it is not.** Enablement
authority is the Trustee Panel's exclusively (Decision `2026-08-07-089`); naming the owner is an
ownership assignment, **not** a discharge.

> ⚠ **Corrected by Decision `2026-08-08-092`.** This block was headed *"The condition on `done` — this
> flip is NOT a closure"* and read *"binds the flag flip **as well as** closure"*. Both carried the
> additive misreading traced in `092`; `088` clause 4 moved the binding point **to** the flag flip,
> **not** onto closure as well. **Nothing about the gap itself changes** — the flag is OFF, the
> catch-up mechanism does not exist, and only the Trustee Panel may release it.

### File List

**New — the instrument**
- `packages/domain/migrations/0097_member-restoration-discipline.sql` (hand-authored)
- `packages/domain/migrations/meta/_journal.json` (journalled idx 97)
- `packages/domain/src/schema/member_restoration_impositions.ts`
- `packages/domain/src/policies/member-restoration-impositions-rls.ts`
- `packages/domain/src/member/restoration-discipline/status.ts`
- `packages/domain/src/member/restoration-discipline/events.ts`
- `packages/domain/src/member/restoration-discipline/overlay.ts` *(carries the `AI-10-1` block)*
- `packages/domain/src/member/restoration-discipline/policy.ts`
- `packages/domain/src/member/restoration-discipline/write.ts`
- `packages/domain/src/member/restoration-discipline/read.ts`
- `packages/domain/src/member/restoration-discipline/index.ts`
- `apps/jobs/src/restoration-discipline.ts` *(the ONLY production writer, AC14-gated)*

**New — the validity-service seams**
- `packages/validity-service/src/member-facts.ts`
- `packages/validity-service/src/r7-fact-surface.ts`

**Modified — domain / events**
- `packages/domain/src/ids/index.ts` · `packages/domain/src/member/events.ts`
- `packages/domain/src/member/index.ts` · `packages/domain/src/schema/index.ts`
- `packages/domain/src/policies/index.ts` · `packages/domain/src/feature-flags/registry.ts`
- `packages/domain/seed/niyamavali-v1-clauses.sql` · `packages/events/src/registry.ts`

**Modified — validity-service / contracts**
- `packages/validity-service/src/rules.ts` · `.../payload.ts` · `.../service.ts` · `.../types.ts`
- `packages/validity-service/src/r7-candidate-scan.ts` · `.../index.ts`
- `packages/contracts/src/members/validity.ts`

**Modified — jobs / governance config**
- `apps/jobs/src/index.ts` · `governance_boundary.yaml`

**Tests — new**
- `packages/domain/tests/member/restoration-discipline-overlay.test.ts`
- `packages/domain/tests/member/restoration-discipline-policy.test.ts`
- `packages/domain/tests/integration/member/restoration-discipline.spec.ts`
- `packages/validity-service/tests/restoration-discipline-fold.test.ts`

**Tests / fixtures — modified**
- `packages/validity-service/tests/r7-activation-totality.test.ts` *(the widened gate)*
- `apps/jobs/tests/assignable-roster-live.test.ts` *(the AC10c re-spawn proof)*
- `packages/domain/tests/feature-flags/capability-bar.test.ts` *(both golden hashes re-attested)*
- `packages/domain/tests/member/life-events-markers.test.ts` · `.../personal-event-assertion.test.ts`
- `packages/ui/tests/contribution-disclosure/presenter.test.ts` *(AC2 pin → in force)*
- `packages/ui/tests/member-status/presenter.test.ts` · `.../moderation.test.ts`
- `apps/admin/tests/member-status-panel.test.tsx` · `apps/admin/tests/verifier-console.test.tsx`
- `scripts/benefit-mechanism/seed-records.test.ts`

**Docs / governance**
- `.decision-log.md` *(Decision 2026-08-08-090)*
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/validity-service/tests/bench/p95-budget.md`
- `_bmad-output/implementation-artifacts/10-23-restoration-discipline-lock-in.md` *(this file)*

⚠ **Deliberately NOT in this list:** `packages/ui/src/**`, `apps/mobile/**`, `packages/i18n/**` (AC7 —
the disclosure activates through the emitted flag alone), `_bmad-output/planning-artifacts/architecture.md`
(AC12 — Decision 2026-08-04-072), `packages/domain/src/trustee-lite/violator-flags.ts` (byte-frozen,
10.24 AC5), and `scripts/member-state-invariant/check.ts` (AC1 — the allowlist is unchanged).

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-08 | 1.1 | **Record correction — Decision `2026-08-08-092`. Status UNCHANGED at `done`; no code touched; the AC14 flag remains OFF and Escalation 6 remains UNDISCHARGED.** This file simultaneously reported the story `done` (header + `sprint-status.yaml`) and reported closing it as a governance violation, in six places. ⭐ **The divergence was one word, and it is traceable:** Decision `2026-08-07-088` clause 4 reads *"Only its binding point moves: it now binds the **flag flip** … **rather than story closure**"*, and the Escalation 6 block transcribed it as *"rather than story closure **alone**"* — converting an exclusive move into an additive one and re-creating routing-note option **(d)** (*"merge permitted, closure gated"*), which the Panel was offered and did **not** ratify. Every later restatement (the disposition block's *"as well as closure"*, the v0.2 row's *"from closure alone to the flag flip **and** closure"*, and Decision `2026-08-08-090`'s *"closing the story are not"*) inherited it from that one word. **Three independent grounds settle it exclusive:** clause 4's own wording (*"only its binding point moves"* + *"rather than"*, no "alone"); the option table, where (a) and (d) are distinguished on precisely this axis and (a)'s consequence column reads *"10.23 merges and **is reviewable in full**"*; and Q4's purpose — the Panel's finding was that a closure gate is the **wrong instrument** because it gates paperwork while the harm lands at merge, so ratifying (a) **replaced** a process gate with a technical one rather than stacking them. This file's own operative sentence already agreed (*"Merging with the flag off is permitted; enabling the flag is not"* — closure unmentioned). **Corrected in place with `092` pointers** at: the in-scope table, the D8 Dev Note, the Escalation 6 ruling block, Task 11, the "asymmetry" Dev Note, the Completion Notes, and the disposition block (re-headed *"The condition on the FLAG FLIP"*). ⚠ **Historical Change Log rows 0.1/0.2/1.0 are deliberately NOT rewritten** — they record what was believed when written and are correct as history ([[feedback_supersede_never_reinterpret]]). ⛔ **Nothing about the gap changed:** `restoration_discipline_imposition` is default-OFF with Trustee-Panel-exclusive enablement (`2026-08-07-089`), R7(D)/(E)/(F) packages still name a completion act no workflow can perform, and the two-string copy-truth defect is still separately owed to a Story 2.2 tone sign-off. Also recorded in `092` as a process gap: the `bmad-code-review` pass that flipped `review → done` recorded **no basis** on a story whose own text labelled an escalation ⛔ BLOCKING against `done` — the flip was right, but a correct flip and an unnoticed one were indistinguishable in the record. | BigDev |
| 2026-08-08 | 1.0 | **Implemented via `bmad-dev-story`; status `ready-for-dev` → `review`.** All 14 ACs satisfied, all 12 tasks complete. Branch `feat/10-23-restoration-discipline-lock-in`, cut from `f2d90cd` (the Decision `2026-08-07-088`/`089` governance commit, one ahead of `main` @ `6783eba`) so history reads governance → implementation. **The instrument:** migration `0097` + `member_restoration_impositions` + the `member/restoration-discipline/` module + the 21st `member.*` event; `members.state` provably never moves (pinned by a live-DB test over a REAL lifecycle stream) and the `member-state-invariant` allowlist is byte-unchanged. ⭐ **D7/AC9 — the finding was real:** the falsifiable-hold gate was structurally blind to this story (it checked `blockedBy` against the `contribution.*` producer's key set, which a `member.*` fact can never enter), so it would have certified the hold as honest at the exact moment its reason expired. Widened FIRST, revert-probed RED, then went RED for real when the fact was supplied; holds NARROWED to `blockedBy: []` + a non-fact blocker, owner → `trustee-panel`, never deleted and never activated. ⚠ **A real defect of mine, caught by the baseline:** turning a type-only import into a value import materialized a module-init cycle that broke `@twt/jobs` at RUNTIME while `typecheck`, `lint` and the package's own suite all stayed green — fixed by hoisting the union to a leaf module. **Ratified answers implemented, not re-derived** (AC5 max-over-live as registry data; AC3 refuse-and-surface on an unprovisioned Pariwar; AC2 no re-imposition for the same unresolved episode; AC14 default-OFF flag resolved once per run, `governance_boundary.yaml` 4→5 with both golden hashes deliberately re-attested). **AC6 proven on the live path** by a genuine re-spawn of the same cycle id (byte-identical roster hash + snapshot + assignment rows) and revert-probed (leaking the overlay into `deriveIsAssignable` dropped the roster 4→2); `POOL_ASSIGNMENT_HASH_VERSION` not bumped. **AC7 zero-diff:** `@twt/ui`, `apps/mobile` and `packages/i18n` source diffs are empty. Measured p95 **9.91 ms**; the Pariwar scan gained **zero** queries (counted-query pins unchanged at 3 and 10). ⛔ **This flip is NOT a closure:** Escalation 6's discharge invariant is UNDISCHARGED — *Resolved via explicit deferral to a Trustee Panel decision that does not yet exist* — the AC14 flag stays OFF, and the copy-truth defect (refined: **two** strings, not one — the `a11y` label repeats it) is separately owed to a Story 2.2 tone sign-off. Escalations 2/3/4/7/8 remain open; 5 and 9 recorded as resolved by ratification. Decision `2026-08-08-090` records D1–D8. | BigDev |
| 2026-08-07 | 0.2 | **Amended to carry Decision `2026-08-07-088` — the Trustee Panel's pre-implementation ruling on the four questions this file had left to the implementer.** Routed via `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-07-story-10-23.md`; all four ratified at Option (a), with one Panel amendment. **(1) AC5 — concurrency:** the combined expiry is the **maximum** over live impositions (never min, never replacement, never sum), *and* the rule lives in the `niy.restoration-discipline.policy` clause **payload**, not in code — a `Math.max` at the fold with no clause backing no longer satisfies the AC. **(2) AC3 — unprovisioned Pariwar:** do **not** impose; surface the `R7_REGISTRY_UNPROVISIONED_PRODUCER`-style sentinel. Imposing under a code default is explicitly rejected as coverage removal under a convention no Pariwar ratified. **(3) AC2 — re-imposition after expiry:** it does **not** re-impose while the same unresolved episode's completion condition is unsatisfiable; "same unresolved episode" must be encoded explicitly, since a genuinely new episode still imposes. **(4) NEW AC14 — the automatic `apps/jobs` writer is gated behind a rollout feature flag that defaults OFF**, numbered after AC13 deliberately so the existing cross-referenced ACs are not renumbered. AC14 arose from a call-graph finding made while preparing the routing note: `scanR7ViolatorCandidates` today has exactly ONE production consumer (`apps/api/src/modules/trustee-lite/handlers.ts:246`, an on-demand read that only *displays* flags), while Task 4 adds a **writer** — so Escalation 6's invariant, as authored, bound story *closure* while every harm it describes landed at *merge*. ⭐ **The Panel's amendment made the flag's default and its enablement authority part of the AC rather than deployment detail:** it defaults OFF in every environment except an explicit trustee-authorized rollout; authorization is not an operational act and may not precede the decision that discharges Escalation 6's invariant; non-production enablement confers no production authority; **flipping it without that decision is a governance violation, not a configuration change**, and that sentence must appear at the flag's definition site. **Escalation 6's invariant is preserved VERBATIM and was not reopened** — only its binding point moved, from closure alone to the flag flip *and* closure. Merging with the flag off is permitted. **Rung-splitting (imposing only for the completable rungs R7(A)/(B)/(C)) was considered and NOT taken** — it needs a payload-keyed condition at the imposition site, which sits badly with **D3**; the ratified flag can express partial rollout without touching the trigger. Escalations **5** and **9** are now RULED and are recorded in `deferred-work.md` as *resolved by ratification*, not as open questions. Escalations **2, 3, 4, 7 and 8** were explicitly **not** ruled on and remain owed as written; the **E4 coverage contradiction** becomes live and member-visible at the flag flip and is expected to return to the Panel then. The **copy defect** (`suspension_disclosure.lock_in.what_it_does` asserting completability to members with no completion path) is recorded as **separately owed and discharged by none of the above** — it needs a Story 2.2 tone sign-off owner, binds while the gap persists, and must not be "fixed" by narrowing the disclosure's trigger. ⚠ **The discharging decision still has no owner**, and Task 11 now requires recording that fact explicitly rather than naming a presumed successor story. Also corrected: a stale cross-reference in Escalation 6 claiming AC2 was "silent on re-imposition after expiry". **Followed by Decision `2026-08-07-089`, which closes `088`'s unowned follow-up: the Trustee Panel EXCLUSIVELY owns authorization to activate the AC14 flag, exercised through a formal `.decision-log.md` entry — the implementer owns building the mechanism and holds no authority to enable it in any environment including their own; Operations owns deployment mechanics and owns *how* a flip executes, never *whether* it may occur; a ticket, config-PR approval, deployment sign-off or verbal go-ahead is not an authorization and does not become one retroactively. ⚠ Naming the owner does NOT discharge the invariant — the catch-up gap persists unchanged, and Task 11 records the discharge as outstanding.** | BigDev |
| 2026-08-07 | 0.1 | Story authored via `bmad-create-story` off `main` @ `6783eba`. Eight decisions recorded (**D1** event **plus** table — version pinning is not derivable, so 10.25/10.26's "no new table" rule points the other way; **D2** the R7 clause supplies the duration and a new `niy.restoration-discipline.policy` clause supplies the instrument, both pinned; **D3** `imposesRestorationObligation` is the imposition trigger — the same predicate that decides accusation decides imposition; **D4** the overlay represents both clocks and never merges them; **D5** no reason code, no actor, no Tier-1 column; **D6** expiry by time only, the lift seam shaped but not built; **D7** widen the falsifiable-hold gate FIRST; **D8** catch-up as a first-class absent seam). Thirteen ACs. Nine escalations — one of them, **Escalation 6, a ⛔ BLOCKING DISCHARGE CONDITION on `done` rather than an advisory**: the 2026-08-06/07 decisions together made catch-up a governance gap rather than a deferred implementation, because §3.1's ratified note says a skip clears only through *"reconciliation or an authorized catch-up process"*, no such process exists, contribution flows only to OPEN cycles (7.6 + the 8.10 fence), and R7(D)/(E)/(F) — three of the four activated clauses — define their entire package in terms of that unavailable act. So this story imposes a coverage-removing period whose stated completion condition no workflow can satisfy, and the already-shipped `suspension_disclosure.lock_in.what_it_does` (verified live, en + hi) tells those members *"Contributing during this period counts toward completing your restoration"* — untrue for them, the same false-statement-to-a-member harm class Story 10.16's D3 refused. **The condition is phrased as a SYSTEM PROPERTY, not a backlog artifact** — *"the completion condition of every restoration package it imposes is satisfiable through a ratified system workflow"* — so it survives story splits, merges and renames and is falsifiable against the running system; a successor catch-up story is the expected vehicle, not the requirement, and a Trustee-ratified alternative mechanism or a Part 11 reinterpretation discharges it equally. ⚠ The property phrasing also **demotes the copy fix**: honest copy about an unsatisfiable obligation leaves it unsatisfiable, so correcting the string is necessary and NOT sufficient. Merging first is permitted, closing first is not. A consequence surfaced by the same analysis and folded into **AC2**: re-imposition after expiry was unspecified, and left implicit it would re-lock an uncatchable-up member continuously until the IST year boundary — a machine-imposed permanent coverage removal, structurally 10.17's failure through a different door. Also including ⭐ **the falsifiable-hold gate being structurally blind to this story** (it checks `blockedBy` against the contribution producer's key set, which a `member.*` fact can never enter — so supplying the fact would leave the hold certified honest at the moment its reason expired), and ⚖ **the coverage contradiction** (join lock-in is `is_valid: true` via `VALID_STATES`; restoration lock-in will be `false`), ⚖ **the non-subsumption principle never reaching the ratified Niyamavali** although the Sprint Change Proposal sequenced it as step 0 before this story, and ⚖ **Stance #5** (lock-in *expiry* is on the SIE allowlist; *imposition* is not). Two premises in the epic AC corrected against live code: `lock_in_months` **is** consumed in production (`RESTORATION_OBLIGATION_KEYS` → `imposesRestorationObligation` → the violator-flag channel), and the per-ground duration already lives in the R7 clauses. The architectural record is fixed as an `AI-10-n` comment block per Decision 2026-08-04-072 — **`architecture.md` is not amended**. | Bob (SM) |
