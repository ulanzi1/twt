---
baseline_commit: e4b8844
---

# Story 10.27: Member Missed-Cycle Visibility `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **member**,
I want to see the contribution cycles I was assigned to that closed without a confirmed contribution from me,
so that I can understand my own standing, and point at a **specific cycle** when I file an R7(G) personal-event assertion or contact Madad.

---

## ⛔ Read this before anything else — this story has NO epic AC, by ratified design

`epics.md` contains **no Story 10.27**, and that is deliberate, not an oversight. The commissioning
instrument is **Decision `2026-08-07-086`**, whose "Artifacts changed" section states in terms:

> `epics.md` — **not touched.** The member-facing story is deliberately not created now; it is created
> via `bmad-create-story` only after Story 10.23 lands, carrying Q2/Q3/Q5/Q6's constraints into its AC.

So the **requirements source of record for this story is Decision `2026-08-07-086` Q1–Q6**, plus the
`deferred-work.md` Escalation 5 entry that carries them. Do **not** go looking for an epic AC to
reconcile against, and do **not** add one — the Panel ruled the story is created directly.

**The re-trigger fired:** Story 10.23 (Restoration Discipline Lock-In) landed `done` on 2026-08-08
(`7729951`), which was Q1's stated dependency.

---

## The two findings that shape this story

Both were established against live code while authoring. Neither is optional context — each one
invalidates the obvious implementation.

### ⭐ Finding 1 — Q3's "distinct state" CANNOT be cause-labelled. The causes are structurally unrecorded, and one of them is fenced.

Q3 requires *"a DISTINCT state … for causes the pool engine structurally cannot see (out-of-band
contributions, assigned-but-never-notified, grace/moderation-overlay window)."* The natural reading —
render three cause-labelled states — **is not buildable, and for out-of-band it is actively forbidden**:

- `docs/policies/out-of-band-contributions.md` §2 **stance 4**: *"It does **not** appear in the member's
  Yogdaan Bahi."* And, stated plainly: *"the trust does not track, audit, or reconcile out-of-band
  gifts."*
- §4 fence **(a)** — `packages/domain/tests/contribution/no-ingest-path.test.ts:157` — **proves** that no
  `out_of_band` / `direct_gift` / `outside_payment` / `gift_*` table, column, or event type exists
  anywhere in the schema or the event vocabularies, with revert-sanity. Creating one to populate a
  cause label would **trip this fence** and breach stance 4.

So the system has **no data** distinguishing "gave directly to the family" from "could not pay" from
"never saw the notification". It cannot acquire that data without breaking a ratified policy.

> ### D1 — the distinct state is EPISTEMIC, not causal
>
> The state distinguishes **what the system knows** from **what the member did**. It says *"no matched
> contribution is recorded for this cycle"* — a statement about the machine's record — and it **never**
> says or implies *"you missed this"*, which is a verdict the record cannot support.
>
> This is exactly the register the out-of-band policy already demands of every surface it binds
> (§2: *"Stances 2–4 are statements about **what the machine can do**, never about the worth of what the
> member did. Any copy that lets them read as a verdict on the member is a violation of stance 1."*).
> Q3's false-accusation risk is answered by **honesty about the limit of the record**, which is stronger
> than a cause label the system would have to guess at.

⚠ **`assigned-but-never-notified` is the one cause with a possible real signal** — `dispatch` writes
`action: 'alert.channel_send'` audit lines (`packages/channels/src/dispatch.ts:353`). But those land in
the **hash-chained `audit_log_entries`**, which is an integrity log, not a read model, and there is no
per-(member, cycle) delivery projection. **Do not build one in this story.** See Escalation 2.

### ⭐ Finding 2 — the row source already exists. Do NOT write a second opportunity scan.

`packages/domain/src/contribution/facts.ts` already computes exactly this row set. Since Story 10.25's
**D3** the scan was relaxed so that *"the scan now sees the member's whole assigned-and-closed
**OPPORTUNITY SEQUENCE**"*, with the missed/taken predicate moved out of the `WHERE` and into per-
aggregate `FILTER` clauses (`facts.ts:271-278`). The counts `skips_current_year` and
`opportunities_since_last` are aggregates **over the very rows this surface must list**.

> ### D2 — one scan, two consumers
>
> The member surface reads the **same** opportunity sequence the R7 facts are computed from. A second
> scan would let *what the member is shown* and *what the ladder evaluates them on* drift silently —
> the identical hazard Story 10.23's AC2 named when it required reusing `scanR7ViolatorCandidates`
> rather than adding a second R7 evaluation path.
>
> Implement as a **row-returning sibling read in the same module**, sharing the `opportunity`/`sequenced`
> CTE chain with the aggregates by construction (do not re-type an equivalent scan). A test must prove
> the surface's row count for the current IST year equals `skips_current_year` for the same member and `at`
> — **subject to D5**, which is the precondition that makes that equality meaningful at all.

### ⭐ Finding 3 — the CTE chain D2 tells you to share is COVERAGE-BLIND, and the fact layer above it is not

Established live, **after** this story was first authored. The shared chain and the aggregates do **not**
sit at the same altitude with respect to projection coverage:

- `deriveContributionFacts` returns **`null` outright** when coverage is missing or the assessment
  instant precedes it (`packages/validity-service/src/producer.ts:507-509`) — *"with no projection there
  is nothing to reason about, and every check below would otherwise 'pass' over an empty ledger and
  manufacture a clean record."*
- The `opportunity`/`sequenced` chain (`facts.ts:325-357`) has **no coverage gate at all**. Coverage is a
  **separate scalar subquery** (`coveredFromSql`, `facts.ts:132`) applied one layer *up*, in the producer.

⛔ So a row-returning sibling built exactly as **D2** specifies will happily return rows for a member
whose fact layer is refusing to reason about them. Two consequences, and the second one is a trap:

1. **The member is told something the system has already decided it cannot assess.** This is the
   member-facing inverse of the false all-clear that Decision `2026-08-09-093` clause 1 made a hard
   precondition for the *job* — same root cause, one layer down, pointed at a member instead of an operator.
2. ⚠ **AC1's equality cannot hold as written.** With coverage absent there is no `skips_current_year` to
   compare against — the entire struct is `null`. The obvious repair is to skip that case in the test,
   which makes the equality **silently never cover it**.

> ### D5 — no coverage ⇒ the section is ABSENT, and the absence is asserted
>
> When `deriveContributionFacts` would return `null` for this member at this `at`, the missed-cycle
> section renders **nothing** — no rows, no header, no "we cannot show this yet" state.
>
> This is the same posture AC4 already takes for zero missed cycles, for the same reason: the surface
> may only report what the record supports, and with no projection the record supports **no statement in
> either direction**. An "unavailable" state would be a statement — and on this surface, any statement
> the member can read as being about *them* is the harm D1 exists to prevent.
>
> ⛔ **The equality test must assert the coverage-absent case explicitly, not skip it.** Absent coverage
> ⇒ zero rows AND `deriveContributionFacts === null`, asserted together. A test that skips the case
> proves nothing about the branch most likely to be wrong.

---

## In scope / out of scope

| In scope (10.27) | Out of scope → owner |
|---|---|
| A **read-only** member-facing list of assigned-and-closed cycles with no live confirmation (**AC1**, **D2**). | Any **write**. No new event, no new table, no `current_state`. This story records nothing. |
| The **epistemic** distinct state and its bilingual copy (**AC2**, **D1**, Q3). | **Cause labels.** No "you gave directly", no "we never notified you", no `out_of_band`-shaped anything — fence (a) and stance 4 both forbid it. |
| A **separate collection** in the existing contribution-history response; the Yogdaan Bahi's attested rows stay byte-unchanged (**AC4**, **D3**). | Widening `ContributionHistoryRow` (nullable `contributionId`/`date`) — it would weaken the contract for every existing consumer. |
| **As-of correctness**: a late or tail-reconciled confirmation removes the row (**AC5**, Q2). | Re-pinning `missed-closed-cycle-v1` (**Q2 forbids it now** — the rename must describe the whole restoration lifecycle, which needs a catch-up path that does not exist). |
| Wiring `cycleRef` so an R7(G) assertion can be filed **against a specific cycle** (**AC6**). | Changing `PersonalEventAssertedPayloadSchema` or the DTO. Q4 KEPT `cycle_ref` as-is; this story **populates** it, nothing more. |
| The **coverage-absent posture**: no projection ⇒ the section is absent, asserted by test (**AC1**, **D5**). | An **"unavailable" / "we can't show this yet" state.** It is a statement, and with no projection the record supports no statement in either direction (**D1**). |
| Tone-gate + i18n-parity compliance, incl. the `out-of-band-blame` trap (**AC7**). | A **catch-up payment path**. Escalation 6 of Story 10.23 is UNDISCHARGED and this story does not discharge it (**Escalation 1**). |
| The **Q5 non-aggravation constraint**, asserted on this surface *and* Trustee-Lite (**AC8**). | Any notification (**Q6: DISPLAY-ONLY**), push or otherwise. |

---

## Acceptance Criteria

### AC1 — The row source is the EXISTING opportunity scan, and the equality is PINNED

**Given** `packages/domain/src/contribution/facts.ts:227-278` (the missed-cycle aggregate, relaxed by
Story 10.25 D3 to see the whole assigned-and-closed opportunity sequence)

**Then** a **row-returning** read is added **in that same module**, returning one entry per cycle where:

- **ASSIGNED** — a `member_pool_assignments` row, sourced from the pool's persisted snapshot
  `member_assignments` (**never** a recompute of `assignMembersToPools`);
- **CLOSED** — the cycle's alert reached `alert.closed`/`alert.settled` at/before `at`. ⭐ **This
  predicate now has a real producer, and did not when this story was first drafted.** Story 8.14
  (`0f72c37`) shipped `alert.closed`'s **only** production emitter — `apps/jobs/src/scheduler/close-cycle-alert.ts`,
  an hourly IST cross-tenant sweep — and that sweep is **PRIMARY, not recovery** (a Day-15 close is a
  TIME boundary; nothing commits and nothing fires, so the sweep *is* the producer). Before it, every
  `alert.closed` row in the system came from fixtures `INSERT`ed **below the projector**, which is why
  this surface's row source was unverifiable end-to-end. It is verifiable now;
- **NO LIVE CONFIRMATION** — the shared predicate, reversals honoured, evaluated **at `at`**.

**And** the read **shares the `opportunity`/`sequenced` CTE chain** (`facts.ts:325-357`) with the
existing aggregates — the `missed` predicate itself is already computed once per row and merely
referenced by column in their `FILTER` clauses, so there is nothing to extract there; what must not be
re-typed is the scan that produces the rows. If the scan is duplicated, D2 is defeated and the surface
can drift from the ladder.

**And** ⛔ **the coverage precondition (D5) is part of this AC, not a detail of it.** The read must
resolve `coveredFrom` for the member's Pariwar and return **zero rows** whenever
`deriveContributionFacts` would return `null` at this `at` — coverage absent, or `at` earlier than
`coveredFrom`. The CTE chain will not do this for you; it is coverage-blind by construction
(**Finding 3**).

**And** ⛔ **a test pins the equality — in BOTH directions**: for the same member and the same `at`,
(i) with coverage present, the number of rows this read returns **within the IST calendar year of `at`**
equals `skips_current_year` from `deriveContributionFacts`; (ii) with coverage **absent**, the read
returns **zero rows** and `deriveContributionFacts` returns `null`, asserted together. Use
`istYearStartUtc` (`facts.ts:461`), never `getFullYear()` on a UTC `Date`.

**And** ⭐ **do not build the fixture for (i) from scratch — it already exists.**
`apps/jobs/tests/restoration-discipline-production-path-live.test.ts` constructs precisely this shape:
a member driven through the **real** cycle-open worker → the **real** close sweep → real
`alert.closed` rows → `skipsCurrentYear = 1`, and — load-bearing for D5 — it calls
`contribution.backfillContributionProjections(db, pariwarId)` at `:442-444` under the comment
*"The production precondition."* ⚠ **That step was learned the hard way**: the first run of that pass
reported `applied = []` and was misread as a clause gap until the backfill was added. Reuse the shape;
do not rediscover it.

**And** the read is bounded by an **integer literal** `.limit()` per the domain-accessor-invariants gate
([[project_domain_limit_clamp_and_savepoint_retry]] — the gate clamps every dynamic `.limit()`).

### AC2 — The distinct state is EPISTEMIC, and it is a NEW state, not a reuse of `grey`

**Given** **D1**, and the shipped five-tone union `['yellow','green','red','grey','held']`
(`packages/contracts/src/contributions/contribution-history.ts:47`)

**Then** the missed cycle carries a **distinct state** that is **not** `grey`. ⚠ `grey` is already
defined and shipped as *"on record, cycle closed with no verdict — a NEUTRAL 'unreconciled', **never a
shame state**"* and it applies to a cycle the member **did** attest. Reusing it for a cycle with **no
attestation at all** would collapse *"you told us you paid and we haven't matched it"* into *"we have no
record of a contribution from you"* — two materially different statements to a member, and precisely the
conflation Q3 forbids.

**And** the state's copy is a statement about the **record**, never about the member. It must satisfy
all three:

| Must | Must not |
|---|---|
| Name what the record contains (*"no matched contribution recorded for this cycle"*) | Assert what the member did or failed to do |
| Leave the outcome **open** (Q2 — never permanent, never irredeemable) | Imply finality, forfeiture, or a closed door |
| Point at the available human route (Madad / the R7(G) assertion) | Instruct the member to re-pay, re-route, or "do it properly through the app" — fence (b) |

**And** ⚠ **whether this ships as a sixth `ContributionStatus` member or as a state on the separate
collection is D3's call, not a free choice** — see AC4. If a new `ContributionStatus` member is added,
the contracts↔domain **lockstep-guard test** and `CONTRIBUTION_STATUSES` must move together, and
`statusPill.<state>` + `statusPill.<state>_a11y` keys are owed in **both** locales
(`packages/i18n/locales/{en,hi}/common.json:284-293`).

### AC3 — Q2, carried VERBATIM

> **No member-facing copy may imply "missed" is permanent or irredeemable.**

**And** the identifier **`missed-closed-cycle-v1` is NOT re-pinned** by this story. Q2's reason binds
here specifically: *"its full semantic boundary … is only known once Story 10.23 defines the complete
restoration lifecycle; a future rename must describe that whole lifecycle, not today's raw
observation."* Story 10.23 landed, **but its catch-up half did not** (Escalation 1) — so the lifecycle
is still incomplete and the rename is still premature. Leave `CONTRIBUTION_LAPSE_POLICY`
(`packages/validity-service/src/producer.ts:298`) exactly as it is.

**And** the **"proxy" characterization is explicitly rejected** and must not be reintroduced in any
comment this story adds. `missed-closed-cycle-v1` is a real governance fact under an already-ratified
policy (Decision `2026-08-07-086` Q2, building on `2026-08-05-074`), and the underlying fact
**re-evaluates as-of the assessment instant** (`packages/domain/src/contribution/facts.ts`).

### AC4 — A SEPARATE collection; the Yogdaan Bahi's attested rows stay byte-unchanged

**Given** the passbook's shipped identity — *"it lists the member's own **attested** contributions"*
(`contribution-history.ts:6`) — and out-of-band stance 4's *"The Yogdaan Bahi reflects matched, attested
contributions"*

> ### D3 — extend the RESPONSE, not the ROW
>
> The missed cycles ride the **same** `GET /api/v1/member/contribution-history` response in their **own
> array**, rendered as a **visually distinct section**. `ContributionHistoryRow` is **not** widened.
>
> Two reasons. (1) A missed cycle has no `contributionId`, no attestation `date`, and no contribution
> amount — making those nullable weakens the shape for every existing consumer and invites a null-check
> regression on the shipped rows. (2) The Bahi's identity as *the record of what you contributed* is
> load-bearing for stance 4; a member's own missed cycles belong **beside** that record, not inside it.

**And** the new array is `.strict()`, carries **no new PII**, and respects the contract's standing
prohibition: *"NO other-member field, NO UTR, NO `tr`, NO nominee/bank data, NO full names, NO Tier-1
ciphertext"* (`contribution-history.ts:22-26`). The structural no-extra-PII test must cover the new
shape — a green run over the old shape proves nothing about the new one
([[feedback_gate_scope_semantic_coverage]]).

**And** contracts **must not** import `@twt/domain` ([[project_contracts_domain_bundle_boundary]] — `pg`
would leak into the RN Metro bundle).

**And** the mobile render must not regress the New-Arch FlatList hazard: the empty / loading / error
states render **outside** the list, never as an in-place swap
([[project_fabric_flatlist_empty_populated_crash]]).

**And** ⛔ **the empty-passbook branch is not exempt.** `YogdaanBahi.tsx`'s zero-attested-rows early
return — the Fabric-crash-avoidance branch, entirely separate from the populated-list return below it —
renders today only the empty/loading/error copy, footer and helpline CTA. A member who has attested
**nothing** but has **≥1 missed cycle** is exactly this story's primary population, and under a literal
reading of "distinct section in the populated branch" they would see nothing. The missed-cycle section
must render inside **both** branches of `YogdaanBahi.tsx` (still outside any `FlatList`, per the hazard
above). **Pinned by test:** a member with zero attested rows and ≥1 missed cycle sees the section.

**And** ⛔ **the zero-missed-cycles case renders NOTHING** — no section, no header, no "0", no
reassurance line. A member who has missed nothing must not be shown a missed-cycle affordance at all.
An empty-state that says *"no missed cycles"* introduces the frame this whole story exists to avoid,
and a running count is a scoreboard. **Pinned by test:** a member with zero missed cycles gets an
absent section, not an empty one.

**And** the entries are ordered **most-recent-cycle-first**, matching the passbook's presentation. The
ordering is explicit in the query, never incidental.

**And** the new read runs inside the **same scope transaction** as the existing handler (RLS is
fail-closed on `app.pariwar_id`); it does **not** open its own. Ownership is the authenticated member,
resolved from the session — **never** client-supplied.

### AC5 — As-of correctness: a late confirmation REMOVES the row

**Given** the ratified 2026-08-05 rule (`facts.ts:236-238`): *"contribution discipline evaluates member
CONDUCT, not administrative processing latency, so a tail-reconciled confirmation landing after the
cycle closed DOES clear the skip once it is part of the record being evaluated. Hence `at`, never the
close instant."*

**Then** a confirmation that lands **after** the cycle closed causes the cycle to **disappear** from
this surface on the next read. **And** a test proves it: build a member with a missed closed cycle,
assert the row is present, append a `contribution.confirmed` dated after the close, assert the row is
**gone** — with no backfill and no migration.

**And** this is the mechanical guarantee behind AC3's "never permanent": the surface is honest about
impermanence because the **data** is impermanent, not because the copy says so.

### AC6 — `cycleRef` is POPULATED so an R7(G) assertion can name its cycle

**Given** Q4 (BLOCKING, KEEP): *"Where a governance assertion concerns a specific contribution
opportunity, its provenance shall identify that opportunity even if the assertion has no direct
consequence of its own."* `cycle_ref` is **provenance, not causation**. Story 10.26 shipped it optional
and explicitly anticipated this story: *"It ships now so a future cycle-scoped surface needs no new
event type"* (`personal-event.ts:66-70`).

> ### ⛔ D4 — THERE ARE TWO DIFFERENT `cycleRef`s AND THEY ARE NOT INTERCHANGEABLE
>
> | Site | Type | Meaning |
> |---|---|---|
> | `contracts/src/contributions/contribution-history.ts:81` | `z.string().min(1)` | **Display string** — the cycle's freeze month, Gregorian. What the member reads. |
> | `contracts/src/contributions/personal-event.ts:75` | `UuidString.optional()` | **The cycle's UUID.** Machine provenance. |
>
> Same field name, different type, different job. Passing the passbook's `cycleRef` into
> `PersonalEventAssertionRequest` sends a freeze-month string where a UUID is required — a runtime Zod
> rejection at best, corrupted provenance at worst.
>
> **So each missed-cycle entry carries BOTH**: a display `cycleRef` (freeze month, matching the
> passbook's presentation) **and** the cycle's **UUID** under a distinctly-named field. Do **not** name
> the second one `cycleRef` — a third same-named field would make the trap worse. Pin the distinction
> with a test that asserts the assertion request receives the **UUID**, never the display string.

**Then** the surface offers the affordance to file an R7(G) personal-event assertion **for that cycle**,
populating `cycleRef` (the UUID) on the request.

**And** ⚠ **the assertion surface ALREADY EXISTS — do not rebuild it.**
`apps/mobile/components/member-status/PersonalEventAssertion.tsx` + `usePersonalEventAssertion.ts` +
`lib/personal-event-api.ts` shipped in Story 10.26 and are reachable from the membership screen
(`apps/mobile/app/(membership)/index.tsx:112`). This story **routes into** that flow with a cycle in
hand; it does not author a second assertion UI.

**And** the routing mechanism is **per-row instantiation, not navigation**: mount `PersonalEventAssertion`
once per missed-cycle row, passing that row's cycle UUID as a prop — the membership screen's existing
instance carries no cycle context and stays as-is, unaffected. `usePersonalEventAssertion.ts`'s
`mutationFn` input type (currently `{ kind: PersonalEventKind }`, no `cycleRef`) must **widen** to accept
the optional cycle UUID and thread it into the outgoing `PersonalEventAssertionRequest`.

**And** ⛔ **the schema and DTO are NOT changed.** This story is the first **populator** of an
already-shipped optional field. If a schema change looks necessary, that is a finding — raise it, do not
absorb it. Note the request's shipped constraints hold unchanged: **no free text** (D3), **no member
id** (resolved from session), and `Idempotency-Key` + Turnstile ride **headers**, not the body.

**And** the assertion still carries **no consequence of its own** (§3.1, unchanged). Filing one must not
alter the member's state, validity, coverage, or this surface's rows.

### AC7 — Tone gates, and the trap that is already known to bite

**Given** `docs/tone-guide.md` §5 and `pnpm microcopy:check`

**Then** all new copy is authored in **en + hi** and both the `microcopy` and `i18n-parity` gates pass.

**And** ⚠ **the known trap, recorded because a prior author already hit it**: the obvious phrasing
*"recording this does not count against you"* **MATCHES** the `out-of-band-blame` rule's
`(does|did|will|would)\s+not\s+count` pattern. Prior copy shipped *"it takes nothing away from you"*
instead. Expect to hit this; do not "fix" it by weakening the rule.

**And** the `out-of-band-blame` rule's other arms bind every string here: the **mistake frame**
(*accidentally / by mistake / गलती से*), the **defined-by-the-channel frame** (*outside the system / our
app / सिस्टम के बाहर*), the **retrospective correction** (*should have paid/sent / …करना चाहिए था*), and
the **dismissal family** (*doesn't count / irregular / incomplete / नहीं गिना जाएगा*).

**And** ⚠ **the regex is a floor, not a ceiling** (`docs/tone-guide.md` §5: *"the paraphrased and
spelled-out tail is explicitly the reviewer's job"*). A green `microcopy:check` is **not** evidence the
copy is in register. This surface tells a member something about their own standing on a payment-
adjacent surface — it is exactly the case a human tone review exists for.

### AC8 — Q5, carried VERBATIM, and asserted on BOTH surfaces

> **A trustee may NOT cite a member's visibility into their own missed cycles as an aggravating "on
> notice" factor in a suspension decision.**

**Then** this constraint is stated **in the code** at the Trustee-Lite consumer and pinned by a test
asserting that **nothing this story adds reaches the trustee-facing suspicion channel** — no new
violator flag, no new signal, no new column on the Trustee-Lite list.

**And** the reasoning is recorded at the site, because the next reader will otherwise "helpfully" wire
it: this mirrors Decision `081`'s **D4** on the member's side — *a clause may influence trustee
understanding without influencing trustee suspicion*
([[project_r7g_violator_flag_exclusion]]). **Member visibility is not member notice.**

### AC9 — Q6: DISPLAY-ONLY

**Then** this story emits **no notification of any kind** — no push, no SMS, no WhatsApp, no Telegram,
no in-app banner, no `dispatch()` call. The `apps/jobs` notify family is **not** extended.

**And** Q6's revisit condition is recorded verbatim in `deferred-work.md`: *"Revisit once the surface
and Story 10.23's catch-up path both exist."* Half of that condition is still unmet.

### AC10 — Suite + gates green, with a real baseline

**Then** `pnpm ci:local` is green, run with `--concurrency=4`
([[project_ci_local_concurrency_oversubscription]]), and the live-DB suite is run against
`twt-test-pg`:5433.

**And** a **baseline is captured before any edit**, against the frontmatter `baseline_commit`
(`e4b8844`) — **not** against this story's drafting baseline, which is four merges behind. A live-DB
failure here is **not presumptively innocent** — this story touches a read many specs exercise. Chase
each failure to root cause; confirm innocence by running the suspect spec **in isolation**
([[project_ci_local_double_run_pollution]], [[project_known_livedb_test_failures]]).

**And** ⚠ **the live-DB picture changed under this story**: since Story 8.14 there is a real
`alert.closed` producer, so `alerts.current_state` can now legitimately be `closed` in a test database
where it previously never was. A spec that implicitly assumed *"no alert ever closes"* is now wrong for
a reason that has nothing to do with your edit. Attribute such failures to 8.14, not to this story —
and do not "fix" them by suppressing the sweep.

**And** never regenerate an applied migration (`42P07`) and never `DROP SCHEMA` (`42P01`)
([[project_live_db_test_gotchas]]). **This story should need no migration at all** — if one appears
necessary, that is a finding.

**And** ⚠ **there is NO validity-cache deploy step, and adding one would be wrong.** This story changes
no fact, no clause and no `validityPayloadHash` — it is a read surface over data the projection already
produces. The `POST …/validity-cache/invalidate-all` lever that Stories 10.24/10.25/10.26 each needed
does **not** apply here. Do not add it out of pattern-matching.

---

## Tasks / Subtasks

- [x] **Task 1 — Share the opportunity-sequence CTE chain** (AC1)
  - [x] The `missed` predicate (`NOT liveConfirmationExistsSql('mpa', at) AS missed`, `facts.ts:325-357`)
        is already computed once per row and referenced by column in the aggregates' `FILTER` clauses —
        there is no duplicated predicate to factor out. What Task 2's row-returning read must SHARE is
        the `opportunity`/`sequenced` CTE chain itself (or an equivalent fragment), not a predicate
  - [x] Prove the existing aggregates are byte-unchanged in behaviour (run the contribution-facts suite first, as a baseline)
- [x] **Task 2 — The row-returning read** (AC1, AC5, D5)
  - [x] Add the sibling read in `packages/domain/src/contribution/facts.ts` (or a leaf module in the same directory — see the cycle trap in Dev Notes)
  - [x] Integer-literal `.limit()`; `istYearStartUtc` for the year window
  - [x] ⛔ Resolve `coveredFrom` and return **zero rows** when `deriveContributionFacts` would return
        `null` (coverage absent, or `at < coveredFrom`) — the CTE chain will not do this for you (**D5**, **Finding 3**)
  - [x] Live-DB test: row count == `skips_current_year` for the same member + `at`
  - [x] ⛔ Live-DB test: coverage **absent** ⇒ zero rows **and** `deriveContributionFacts === null`,
        asserted together. Do not skip this case (**D5**)
  - [x] Live-DB test: a post-close `contribution.confirmed` removes the row (AC5)
  - [x] ⭐ Build the fixture from `apps/jobs/tests/restoration-discipline-production-path-live.test.ts`
        (real worker → real sweep → real `alert.closed` → `skipsCurrentYear = 1`, incl. the
        `backfillContributionProjections` precondition at `:442-444`) — do not author a third one
- [x] **Task 3 — The contract** (AC4, AC2)
  - [x] New `.strict()` entry shape + a new array on the contribution-history response; `ContributionHistoryRow` untouched
  - [x] Extend the structural no-extra-PII test to cover the new shape
  - [x] If a sixth `ContributionStatus` member is added: move the lockstep-guard test and `CONTRIBUTION_STATUSES` together
- [x] **Task 4 — API handler** (AC4)
  - [x] Extend `apps/api/src/modules/member-pool/handlers.ts` (the Story 8.6 pipeline, `:581`)
  - [x] Preserve the existing fail-soft posture (`:192`) — a missed-cycle read failure must not empty the attested passbook
  - [x] Update the `HISTORY_EMPTY` fail-soft sentinel (`:186`) for the widened response shape
- [x] **Task 5 — Mobile surface** (AC2, AC4, AC6)
  - [x] Distinct section in `apps/mobile/components/yogdaan-bahi/`; empty/loading/error rendered OUTSIDE the FlatList
  - [x] ⛔ Render the section in **both** branches of `YogdaanBahi.tsx` — the populated-list return AND
        the zero-attested-rows early return (`rows.length === 0`, today's empty/loading/error-only
        branch). A member with no attested rows but ≥1 missed cycle must still see it (pinned by test)
  - [x] Zero missed cycles ⇒ section **absent**, not empty (pinned by test)
  - [x] Instantiate `PersonalEventAssertion` **per missed-cycle row**, passed that row's cycle UUID as a
        prop — not a navigation to the existing membership-screen instance, which has no cycle context
  - [x] Widen `usePersonalEventAssertion.ts`'s `mutationFn` input (currently `{ kind: PersonalEventKind }`)
        to accept the optional `cycleRef` UUID and thread it into the outgoing
        `PersonalEventAssertionRequest`
  - [x] Route into the **existing** `PersonalEventAssertion` flow (10.26) with the cycle in hand — do not author a second assertion UI
  - [x] ⛔ Pass the cycle **UUID**, never the display `cycleRef` (**D4**) — pinned by test
- [x] **Task 6 — Copy, en + hi** (AC2, AC3, AC7)
  - [x] Author both locales; run `pnpm microcopy:check` and the i18n-parity gate
  - [x] ⚠ Expect the `(does|did|will|would)\s+not\s+count` collision; phrase around it
- [x] **Task 7 — The Q5 fence** (AC8)
  - [x] State the constraint at the Trustee-Lite consumer; pin with a test that nothing new reaches the suspicion channel
- [x] **Task 8 — Governance records** (AC3, AC9, Escalations)
  - [x] `deferred-work.md`: close Escalation 5's re-trigger; record Q6's revisit condition verbatim
  - [x] Record Escalations 1–3 below as authored; **do not silently absorb any of them**
  - [x] `sprint-status.yaml`: one combined `last_updated` ledger entry at completion ([[project_sprint_status_ledger]])
  - [x] ⛔ Governance entries commit **separately and FIRST** with a `governance:` prefix ([[feedback_governance_commits_precede_implementation]])

---

## Escalations owed (raise them; do not silently absorb)

1. ⛔ **Q1's literal gate is met; Q1's RATIONALE is not.** Q1 sequenced this surface after Story 10.23
   because *"showing an obligation with no visible resolution path would be an incomplete disclosure,
   not a kinder one."* Story 10.23 landed — **with Escalation 6 UNDISCHARGED**. There is still **no
   authorized catch-up process**, so R7(D)/(E)/(F) packages name a completion act no workflow can
   perform (Decision `2026-08-08-092` for the corrected binding point: it gates the AC14
   `restoration_discipline_imposition` flag flip, **not** story closure; the flag is default-OFF and
   Trustee-Panel-exclusive per Decision `2026-08-07-089`).

   ✅ **Reaffirmed twice since this story was drafted, and still open.** Decision `2026-08-09-093`
   clause 5 states in terms that it does **not** discharge Escalation 6 and that *"every precondition
   this entry creates is additional to — never a substitute for — the discharge"*; Decision
   `2026-08-09-094`'s follow-ups repeat that nothing in it discharges Escalation 6, authorizes a flip,
   or moves the flag off default-OFF. The escalation is stronger than when it was written, not weaker.

   **So this story ships the disclosure Q1 authorized, into the exact condition Q1 named as the reason
   to wait.** D1's epistemic framing is what makes that defensible — the surface reports the record,
   and does not assert an obligation it cannot show the member how to discharge. **That is a
   mitigation, not a discharge.** ⚠ **This is the same harm class as the still-owed two-string
   copy-truth defect** (`suspension_disclosure.lock_in.what_it_does` **and** its `a11y` label, both
   asserting completability to members with no completion path, owed to a **Story 2.2 tone sign-off**).
   **Route both together** — they are one question about what the system may tell a member about an
   obligation it cannot let them satisfy. **This escalation is owed to the Trustee Panel before the
   surface is enabled for members, and the implementer does not resolve it.**

2. ⚖ **`assigned-but-never-notified` has a signal but no read model.** `dispatch` writes
   `action: 'alert.channel_send'` audit lines (`packages/channels/src/dispatch.ts:353`), but they land
   in the hash-chained `audit_log_entries` — an integrity log, not a queryable per-(member, cycle)
   delivery projection. **Do not build one here**: a delivery projection is its own story with its own
   retention, PII and RLS questions, and D1 means this surface does not need it. Recorded so a later
   author does not conclude the signal is simply absent. **Re-trigger:** any story building a
   notification-delivery read model, or a Panel request for cause attribution on this surface.

3. ⚖ **Q3's cause enumeration cannot be satisfied as literally written, and D1 is the substitute.**
   Q3 names three causes; two are structurally unrecorded and one (out-of-band) is **fenced against
   ever being recorded** (stance 4 + `no-ingest-path.test.ts`). **The Panel should confirm that D1's
   epistemic state satisfies Q3's intent** — the false-accusation risk Q1/Q2 exist to avoid — rather
   than Q3 being read as commissioning three cause labels. Raised now because a later reader comparing
   the shipped surface against Q3's text will otherwise read a gap where there is a deliberate
   substitution.

4. ⚖ **D5's coverage-absent posture is an AUTHOR decision on a question the Panel has already ruled
   one layer up — in the opposite direction.** Decision `2026-08-09-093` clause 1 ruled that the
   *job's* coverage-absent state must be **named** (a distinct `unavailable` producer), because an
   operator reading `unavailable: null` would mistake it for a clean Pariwar. **D5 rules the other way
   for the member surface**: name nothing, render nothing. The asymmetry is deliberate and mirrors
   [[project_r7g_violator_flag_exclusion]] — an **operator** needs to know the instrument is dark so
   they can provision it; a **member** has no such action, and any state shown to them reads as a
   statement about *them*, which is the harm D1 exists to prevent. ⚠ **But the Panel ruled the adjacent
   question, not this one.** The Panel should confirm that member-facing silence is the intended
   counterpart to operator-facing naming. **Re-trigger:** before the surface is enabled for members.
   The implementer does not resolve this — ship D5 and raise it.

---

## Dev Notes

### The type-only → value import trap (this module is a known site)

Story 10.23 lost real time to exactly this: turning a **type-only** import into a **value** import
materialized a module-init cycle that broke `@twt/jobs` at **runtime** while `typecheck`, `lint` and the
package's own suite all stayed **green** ([[project_type_only_import_cycle_trap]]). `contribution/` is
densely cross-imported. **If you need a value from a module you currently import types from, hoist it to
a leaf module** rather than converting the import.

### What changed under this story since it was drafted (read this before trusting any line number)

This story was first authored at `9c08020`. Three things landed after that and all three touch its
substrate — none of them is a change *to* this story's scope, but each changes what the dev will find:

1. ⭐ **Story 8.14 (`0f72c37`) shipped `alert.closed`'s only production emitter.** Before it, the
   `CLOSED` half of AC1's predicate had no producer anywhere in the system and every `alert.closed` row
   came from fixtures written **below the projector**. The emitter is
   `apps/jobs/src/scheduler/close-cycle-alert.ts` (hourly IST cross-tenant sweep, **primary not
   recovery**) plus `alert.closeCycleAlert` in `@twt/domain`, driven through the existing
   `projectAlertState` — which remains the **only** writer of `alerts.current_state`.
2. ⭐ **Story 10.23's production-path gate landed** —
   `apps/jobs/tests/restoration-discipline-production-path-live.test.ts` — which drives
   `cycle open → assignment → close sweep → alert.closed → projection → facts → skips_current_year →
   R7 scan → imposition → fold` against production-produced rows. It is the fixture template for AC1
   (see AC1's reuse note) **and** the place **Finding 3 / D5** was discovered.
3. **Decisions `2026-08-09-093` / `094` / `095`** ruled the AC14 flag mechanics and twice reaffirmed
   that Escalation 6 remains undischarged — which strengthens **Escalation 1** without changing it.

### Domain / contracts boundaries

- `@twt/domain` **cannot** import `@twt/events` (turbo cycle) — it reads `events_log` directly
  ([[project_member_lifecycle_domain_substrate]]).
- `@twt/contracts` **must never** import `@twt/domain`'s pg-touching namespaces
  ([[project_contracts_domain_bundle_boundary]]).
- Domain is **camelCase**, contracts are **snake_case** — the drift is a known footgun
  ([[project_story_validate_footguns]]).

### The status derivation is a PURE precedence, and it is not this story's to re-tune

`deriveContributionStatus` (`packages/domain/src/contribution/history.ts:113`) is a five-line pure
precedence: `green ≻ held ≻ red ≻ yellow-while-open ≻ grey-when-closed`
([[project_yogdaan_status_derivation_convention]]). The missed-cycle state is **not** a sixth arm of
that function — it applies to rows that function never sees, because it derives status **for an
attested contribution** and a missed cycle has no attestation. Keep the derivation byte-unchanged.

### Files being modified (read each fully before editing)

| Path | Today | This story |
|---|---|---|
| `packages/domain/src/contribution/facts.ts` | The missed-cycle aggregate (counts); the coverage-blind `opportunity`/`sequenced` chain (`:325-357`); `coveredFromSql` (`:132`) | **Adds** a row-returning sibling sharing the CTE chain **and applying the D5 coverage gate the chain lacks**. Aggregates unchanged. |
| `packages/contracts/src/contributions/contribution-history.ts` | Yogdaan Bahi read DTO, 5 tones, strict no-PII | **Adds** a new array + entry shape. `ContributionHistoryRow` untouched. |
| `apps/api/src/modules/member-pool/handlers.ts` | The 8.6 pipeline (`:581`), fail-soft to empty passbook (`:192`) | **Extends** the pipeline; preserves fail-soft. |
| `apps/mobile/components/yogdaan-bahi/` | `YogdaanBahi.tsx` FlatList + `useYogdaanQuery` | **Adds** a distinct section; empty/error OUTSIDE the list. |
| `packages/i18n/locales/{en,hi}/common.json` · `contribution.json` | `statusPill.*` (`:284-293`), `yogdaan.*` | **Adds** keys in both locales. |
| `apps/mobile/components/member-status/PersonalEventAssertion.tsx` | The shipped 10.26 assertion flow | **Consumed**, not rebuilt — instantiated per missed-cycle row, accepts a cycle UUID (**D4**). |
| `apps/mobile/components/member-status/usePersonalEventAssertion.ts` | `mutationFn` input: `{ kind: PersonalEventKind }` (no `cycleRef`) | **Widens** the input type to accept the optional cycle UUID and thread it into `PersonalEventAssertionRequest`. |

### Story key

`10-27` is the next number in Epic 10 (which tops out at 10.26). **No `sprint-status.yaml` key existed
before this story** — consistent with Decision `2026-08-07-086` leaving `epics.md` untouched and
commissioning the story directly. The key is created by this run.

### Testing standards

- Live DB is `twt-test-pg`:5433. Own-committing writers ⇒ assert **membership, not counts**
  ([[project_live_db_test_gotchas]]).
- `DISTINCT ON` needs its leading `ORDER BY` or `42P10`; `max(timestamptz)` comes back as a **string**
  ([[project_contribution_fact_projection_substrate]]).
- Suite-level `{ timeout: 20000 }` for live-DB specs.

### References

- Decision **2026-08-07-086** — the commissioning instrument; Q1–Q6 [Source: `.decision-log.md`]
- Decision **2026-08-08-092** — Escalation 6's corrected binding point (flag flip, not closure)
- Decision **2026-08-07-088** / **2026-08-07-089** — the AC14 flag and its Panel-exclusive authority
- Decision **2026-08-06-081** D4 — understanding without suspicion; the Q5 precedent
- `docs/policies/out-of-band-contributions.md` §2 stance 4, §4 fence (a), §6 — the binding policy
- `docs/tone-guide.md` §5 — the `out-of-band-blame` rule and the reviewer's non-automatable tail
- `packages/domain/tests/contribution/no-ingest-path.test.ts:157` — the fence D1 must not trip
- `packages/domain/src/contribution/facts.ts:227-278` — the opportunity scan (D2); `:325-357` the CTE chain; `:132` `coveredFromSql`; `:461` `istYearStartUtc`
- `packages/validity-service/src/producer.ts:507-509` — the coverage gate that returns `null` (**D5**, Finding 3)
- `apps/jobs/src/scheduler/close-cycle-alert.ts` — Story 8.14's `alert.closed` emitter; the producer behind AC1's `CLOSED`
- `apps/jobs/tests/restoration-discipline-production-path-live.test.ts:442-444` — the production fixture to reuse, incl. `backfillContributionProjections`
- Decision **2026-08-09-093** clause 1 — the operator-facing coverage sentinel D5 deliberately inverts (Escalation 4); clause 5 — Escalation 6 not discharged
- `packages/contracts/src/contributions/contribution-history.ts` — the DTO and its PII discipline
- `_bmad-output/implementation-artifacts/deferred-work.md` — Escalation 5 (all six answers)

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story` workflow).

### Debug Log References

- **AC10 baseline, at frontmatter `baseline_commit` `e4b8844`, captured on a CLEAN tree.** ⚠ The first
  baseline run was CONTAMINATED — it was launched before any edit but still executing when the first
  domain edit landed, and it reported `test (unit)` + `crypto-check` red on a transient backtick
  syntax error of mine inside a SQL template literal. Discarded and re-captured with the work
  `git stash`ed. **The real baseline:** every static gate green (lint, typecheck, build, and all 22
  invariant gates), `crypto-check` green (21/21), and exactly TWO flaky failures, both pre-existing:
  · `@twt/admin` — one `userEvent`-driven RTL test, the known concurrency-oversubscription class
  ([[project_ci_local_concurrency_oversubscription]] names this suite by name);
  · `apps/api` `tests/integration/banners/banners.spec.ts` — "a retracted banner disappears from the
  member surface immediately". **Innocence confirmed by running it in isolation at the clean
  baseline: 26/26 pass** ([[project_ci_local_double_run_pollution]]). Neither is attributable to this
  story, and neither touches contribution history.
- **The live-DB gate's first red was MINE, and instructive.** `missed-cycle-visibility-live.test.ts`
  step (6) read at an instant derived from the sweep's INJECTED clock. The sweep decides *whether* a
  cycle is due from that clock, but `alert.closed`'s `occurred_at` is the real append instant — and
  the AS-OF scan filters on `occurred_at`. So the read instant preceded every closure and the surface
  was legitimately empty for a reason that had nothing to do with AC5. Fixed by reading the close
  instant back out of `events_log` rather than assuming it.
- **Revert-sanity, run three times, each restored immediately after:**
  1. **D5 coverage gate** — removed the two coverage arms from `listMemberMissedCycles` → the read
     returned **2 rows** for a member whose `deriveContributionFacts` was `null`. That is exactly the
     Finding 3 harm, reproduced on a live DB. Restored → green.
  2. **Per-branch mobile scan** — removed `<MissedCycleSection>` from `YogdaanBahi.tsx`'s
     zero-attested-rows branch → red, naming the primary population. Restored → green.
  3. **Q5 non-aggravation fence** — ⚠ the FIRST probe (`const PLANTED_missedCycles = 1`) did **not**
     turn it red, and that was the probe being wrong, not the fence: `\bmissedCycles\b` correctly
     does not match inside a longer identifier. A genuine `import type { MissedCycleEntry }` in the
     trustee-lite handler DID turn it red. Recorded because a weaker probe would have "proven" teeth
     the fence does not have.
- **Tone-gate teeth, verified live against these exact files** rather than inferred from a green run:
  every prohibited `out-of-band-blame` frame FIRES on `packages/i18n/locales/{en,hi}/contribution.json`
  (including the predicted `does not count` collision and the Hindi `गलती से` / `सिस्टम के बाहर` /
  `नहीं गिन` arms), while all 18 shipped `missed_cycle.*` strings are clean
  ([[feedback_gate_scope_semantic_coverage]]).

### Completion Notes List

**What shipped.** A read-only member-facing collection of assigned-and-closed cycles for which the
record holds no matched contribution, riding the existing contribution-history response in its own
array, rendered as a distinct section in **both** branches of the Yogdaan Bahi, and routing into
Story 10.26's assertion flow with a cycle UUID in hand. **No write, no event, no table, no
`current_state` writer, no migration, no notification, no validity-cache invalidation.**

- **AC1 — one scan, two consumers, and the gate the scan lacks.** `facts.ts`'s
  `last_conf`/`opportunity`/`sequenced` chain was extracted verbatim into `opportunitySequenceCtes`,
  now shared by `missedCycleAggregateSql` (the counts the R7 ladder evaluates a member on) and
  `listMemberMissedCycles` (the rows the member is shown). Sharing is the correctness requirement,
  not tidiness — a second "equivalent" scan is how what a member is SHOWN drifts from what the ladder
  EVALUATES them on. The aggregates are behaviourally unchanged (10.24/10.25 fact suites green: 32 +
  132 tests). `cycle_id` was added to the `opportunity` CTE and is inert for the aggregates.
- **⛔ Finding 3 / D5 was REAL and is now mechanized.** The shared chain is coverage-blind; the fact
  layer above it is not. The coverage predicate therefore rides the row statement itself, folded in
  as `coveredFromSql` (the ONE spelling) and mirroring `deriveContributionFacts`'s two reachable
  `null` branches exactly. **The coverage-absent case is ASSERTED, not skipped** — zero rows AND
  `deriveContributionFacts === null`, together, *before* the backfill runs in the same fixture — which
  is what stops AC1's equality silently never covering its most fragile branch.
- **AC2 — the state is EPISTEMIC and structural.** `MISSED_CYCLE_STATE` is
  `no_matched_contribution_recorded`, disjoint from `ContributionStatus` and pinned so by test. It is
  **not** a sixth tone and **not** `grey`: `grey` applies to a cycle the member DID attest, and
  reusing it would collapse *"you told us you paid and we haven't matched it"* into *"we have no
  record of a contribution from you"*. The state is carried by MEMBERSHIP in the separate array
  rather than repeated on every entry — no per-entry tone exists to be mistaken for one.
- **⚖ A judgment call, stated plainly: the entries carry NO deceased-family identity.** The passbook
  row names the family because it records what the member DID for them; naming a bereaved family
  beside "no matched contribution recorded" pairs a person with an absence, which is the reading D1
  exists to prevent. So an entry is `{ cycleId, cycleRef, poolLetterCode, poolCanonicalIdentifier }`
  — the passbook's identity fields MINUS the family. A side effect worth noting: this path performs
  **no Tier-1 decrypt at all**, and a test asserts `decryptKycField` is never called on it.
- **AC4 — absent, never empty, in both branches.** Zero entries renders `null`; `[]` is also what
  absent coverage returns, and the two are deliberately indistinguishable to the renderer. The
  handler's 8.6 early return (`entries.length === 0 → HISTORY_EMPTY`) was the trap: it would have
  silently defeated the surface for a member with nothing attested and a real missed cycle — this
  story's primary population. Fixed and pinned at BOTH layers (handler test + a per-branch source
  scan that brace-matches the early return, which is precisely the limitation the 8.11 helpline fence
  documented for itself).
- **AC6 — the two `cycleRef`s never meet.** Each entry carries the display `cycleRef` (freeze month)
  and the machine `cycleId` (UUID) under distinct names; `personalEventRequestForCycle` is the one
  place the UUID is mapped onto the request's UUID-typed `cycleRef`, and a test asserts the display
  string never gets there. The 10.26 assertion surface is CONSUMED, not rebuilt: one instance per
  row, per-row instantiation rather than navigation, with the membership screen's instance untouched.
  **The schema and DTO are unchanged** — this story is the first populator of an already-shipped
  optional field, exactly as `personal-event.ts` anticipated.
- **AC8 — Q5 is stated in the code and fenced.** The constraint sits at the Trustee-Lite consumer
  with its reasoning, and `missed-cycle-non-aggravation.test.ts` asserts no trustee-facing module
  references this story's read, shape or section; that the seven signal categories, the response
  sections and the frozen four violator-flag keys are all unchanged; and that `.strict()` rejects a
  smuggled `member_has_seen` / `on_notice` field. **Member visibility is not member notice.**

**⚠ Raised, not absorbed** (all four in `deferred-work.md`; **1 and 4 gate MEMBER ENABLEMENT and the
implementer resolves neither**):

1. Q1's literal gate is met; **Q1's rationale is not** — no catch-up process exists, 10.23's
   Escalation 6 is undischarged and was reaffirmed twice since this story was drafted. The surface
   ships into the exact condition Q1 named as the reason to wait. D1's framing is a **mitigation, not
   a discharge**. Routed with the two-string copy-truth defect.
2. `assigned-but-never-notified` has a signal (`alert.channel_send` audit lines) but no read model.
   Deliberately not built.
3. Q3's three cause labels are unbuildable — two unrecorded, out-of-band **fenced**. D1 is the
   substitute; the Panel should confirm it satisfies Q3's intent.
4. D5 inverts, for members, what Decision `2026-08-09-093` clause 1 ruled for operators.

**⚠ A defect found here, fixed here, attributed to Story 10.26.** `PersonalEventAssertion.tsx`
resolved all fourteen `personal_event.*` keys against `t`'s default `common` namespace while the keys
live in `contribution.json`. The resolver is loud-by-default, so that surface **threw on every
mount** — invisible while its only mount was the membership screen, and fatal once AC6 mounts it on
the Yogdaan Bahi. Fixed by passing the namespace explicitly and pinned by test. ⚠ The wider gap is
un-mechanized: nothing fails when a `t()` call names a key from a non-default namespace without
saying so. Recorded with a re-trigger.

**⚠ A human tone review is still owed (AC7).** `microcopy:check` and `i18n-parity` are green and
their teeth were verified against these exact files — but §5 makes the paraphrased tail explicitly
the reviewer's job, and this surface tells a member something about their own standing on a
payment-adjacent surface. A green gate is not evidence the copy is in register.

### File List

**Modified**
- `packages/domain/src/contribution/facts.ts`
- `packages/contracts/src/contributions/contribution-history.ts`
- `packages/contracts/tests/contributions.test.ts`
- `packages/api-client/src/index.ts`
- `apps/api/src/modules/member-pool/handlers.ts`
- `apps/api/src/modules/trustee-lite/handlers.ts`
- `apps/api/tests/unit/contribution-history.test.ts`
- `apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx`
- `apps/mobile/components/member-status/PersonalEventAssertion.tsx`
- `apps/mobile/components/member-status/usePersonalEventAssertion.ts`
- `packages/i18n/locales/en/contribution.json`
- `packages/i18n/locales/hi/contribution.json`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-27-member-missed-cycle-visibility.md`

**Added**
- `apps/jobs/tests/missed-cycle-visibility-live.test.ts`
- `apps/api/tests/unit/missed-cycle-non-aggravation.test.ts`
- `apps/mobile/components/yogdaan-bahi/MissedCycleSection.tsx`
- `apps/mobile/components/yogdaan-bahi/missed-cycles.ts`
- `apps/mobile/tests/unit/missed-cycle-section.test.ts`

**Deleted** — none. No migration was needed, and none was authored.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-09 | 1.0 | **Implemented via `bmad-dev-story`.** All 37 subtasks complete; status `ready-for-dev` → `review`. ⭐ **The row source is the EXISTING scan, shared by construction:** `facts.ts`'s `last_conf`/`opportunity`/`sequenced` chain was extracted verbatim into `opportunitySequenceCtes` and is now read by two consumers — `missedCycleAggregateSql` (the counts the ladder evaluates a member on) and the new `listMemberMissedCycles` (the rows the member is shown) — so the two cannot drift. Aggregates behaviourally unchanged (10.24/10.25 fact suites green). ⛔ **Finding 3 / D5 was real and bit:** revert-sanity on the live DB showed that WITHOUT the coverage gate the read returns 2 rows for a member whose `deriveContributionFacts` is `null`. The gate ships folded into the statement via the one `coveredFromSql` spelling, and the coverage-absent case is **asserted, not skipped** (zero rows AND `facts === null`, together, before the backfill runs in the same fixture). ⭐ **New live gate** `apps/jobs/tests/missed-cycle-visibility-live.test.ts` drives real spawn saga → real cycle-open worker → real close sweep → real `alert.closed` → real backfill → the member read, pinning AC1's equality in BOTH coverage states plus AC5's as-of removal. ⚖ **The state is EPISTEMIC and structural** — `no_matched_contribution_recorded`, disjoint from `ContributionStatus`, carried by membership in the separate array rather than as a per-entry tone; zero entries and absent coverage both render the section ABSENT. **Entries carry NO deceased-family identity** (naming a bereaved family beside an absence is the reading D1 exists to prevent) — which also means no Tier-1 decrypt on this path, asserted by test. **AC4's empty-passbook trap was live in the HANDLER too**, not only the mobile surface: the 8.6 early return would have defeated the story for its primary population; fixed and pinned at both layers, the mobile scan verifying PER-BRANCH coverage by brace-matching the early return. **Four escalations raised, not absorbed**; 1 and 4 gate member enablement. **A defect found and fixed but attributed to Story 10.26:** its assertion surface resolved all fourteen `personal_event.*` keys against the default `common` namespace while they live in `contribution.json` — a loud runtime throw on every mount, invisible until AC6 mounted it on the Yogdaan Bahi. **No migration, no event, no new table, no `current_state` writer, no notification, no validity-cache invalidation.** A human tone review remains owed (AC7). | BigDev |
| 2026-08-09 | 0.3 | Re-validated via `bmad-create-story validate` against `main` @ `e4b8844`, because the story's substrate moved twice after it was drafted at `9c08020`. **Two CRITICAL findings, both at the boundary between this surface and the fact layer, both fixed.** ⭐ **Finding 3 / D5 — the CTE chain D2 mandates sharing is COVERAGE-BLIND while the fact layer above it is not.** Verified live: `deriveContributionFacts` returns `null` outright when coverage is absent or `at < coveredFrom` (`producer.ts:507-509`), but the `opportunity`/`sequenced` chain (`facts.ts:325-357`) has no coverage gate — coverage is a separate scalar (`coveredFromSql`, `:132`) applied one layer up. So a sibling read built exactly as AC1 specified would return rows for a member whose fact layer refuses to reason about them (the member-facing inverse of the false all-clear Decision `2026-08-09-093` clause 1 made a precondition for the job), **and AC1's pinned equality could not hold** — with coverage absent there is no `skips_current_year` to compare against, and the natural repair is to skip the case, which makes the equality silently never cover it. D5 rules the section **ABSENT** when coverage is absent (same posture as AC4's zero-missed-cycles, same reason: the record supports no statement in either direction) and requires the coverage-absent case to be **asserted, not skipped**. ⭐ **Story 8.14 was entirely absent from the story.** It shipped `alert.closed`'s only production emitter (`apps/jobs/src/scheduler/close-cycle-alert.ts`, hourly IST sweep, PRIMARY not recovery) *after* this story was drafted — off this story's own branch — so AC1's `CLOSED` predicate had no producer at drafting time and every `alert.closed` row came from below-the-projector fixtures. Now recorded in AC1, AC10 (live-DB attribution: a spec assuming "no alert ever closes" is now wrong for reasons unrelated to this story) and a new Dev Notes section. **Three enhancements:** AC1 + Task 2 now point at `restoration-discipline-production-path-live.test.ts` as the fixture template rather than inviting a third hand-built one — including its `backfillContributionProjections` precondition at `:442-444`, which is where D5 was discovered and which that pass got wrong on its first run; `baseline_commit` refreshed `9c08020` → `e4b8844` (four merges stale, and AC10's "not presumptively innocent" baseline discipline depends on it); Escalation 1 now cites `2026-08-09-093` clause 5 and `094`, which reaffirm Escalation 6 as undischarged twice over. **New Escalation 4:** D5 inverts a question the Panel ruled one layer up — operator-facing coverage gaps must be NAMED (`093` clause 1), member-facing ones are silent — an asymmetry mirroring [[project_r7g_violator_flag_exclusion]], but the Panel ruled the adjacent question, not this one, so it is routed before member enablement. Citation drift corrected (`facts.ts:460`→`:461`, `handlers.ts:579`→`:581`); all other citations verified exact against live code. No AC removed, no scope widened, status unchanged. |
| 2026-08-08 | 0.2 | Validated via `bmad-create-story validate` (independent fresh-context review against live code, epics, decision log and the 10.25/10.26 story files). One CRITICAL finding fixed: `YogdaanBahi.tsx`'s zero-attested-rows early return (the Fabric-crash-avoidance branch) had no room for the missed-cycle section, silently defeating the surface for members with no attested rows but a real missed cycle — AC4 and Task 5 now require the section in both branches. Three enhancements applied: named `usePersonalEventAssertion.ts` and its required `mutationFn` widening in the Files table and AC6; specified the per-row-instantiation UX mechanism for the assertion affordance (not navigation to the existing cycle-context-free widget); corrected Task 1 / AC1 / Finding 2's D2 box, which described a predicate-extraction that doesn't apply (the `missed` predicate is already computed once) — the actual sharing obligation is the `opportunity`/`sequenced` CTE chain. Everything else the reviewer checked (D1 epistemic framing, D2 scan-reuse intent, D4 two-`cycleRef` disambiguation, the `grey`-reuse rejection, Escalation 1's honest disclosure) was confirmed correct against live code with no changes needed. |
| 2026-08-08 | 0.1 | Story authored via `bmad-create-story`, off branch `feat/10-23-restoration-discipline-lock-in` @ `9c08020`. ⛔ **No epic AC by ratified design** — Decision `2026-08-07-086` states `epics.md` is "not touched" and the story is created directly, so Q1–Q6 are the requirements source of record. Re-trigger fired by Story 10.23 landing `done` (`7729951`). **Two findings established against live code, each invalidating the obvious implementation.** ⭐ **D1 — Q3's "distinct state" cannot be cause-labelled:** of the three causes Q3 names, two are structurally unrecorded and out-of-band is *fenced against ever being recorded* (out-of-band policy stance 4 + `no-ingest-path.test.ts:157`, revert-sanity proven), so the state is made **epistemic** — it reports what the record contains, never what the member did, which is the register that policy already demands of every surface it binds. ⭐ **D2 — the row source already exists:** Story 10.25's D3 relaxed the `facts.ts` scan to see the whole assigned-and-closed opportunity sequence, so the aggregates `skips_current_year`/`opportunities_since_last` are computed over exactly these rows; a second scan would let what the member is SHOWN drift from what the ladder EVALUATES them on, so the predicate is shared and the row-count/aggregate equality is pinned by test. **D3 — extend the response, not the row:** `ContributionHistoryRow` is not widened (a missed cycle has no `contributionId`/`date`/amount, and the Bahi's identity as the record of attested contributions is load-bearing for stance 4). ⛔ **D4 — the two-`cycleRef` trap, found against live contracts:** `contribution-history.ts:81` types `cycleRef` as a **display string** (freeze month) while `personal-event.ts:75` types it as a **UUID** — same name, different type, different job, and wiring the passbook's value into the assertion request would send a freeze-month string where a UUID is required. Each entry therefore carries both, under distinct names, pinned by test. Also confirmed live: the 10.26 assertion surface already exists and is **consumed, not rebuilt**, and its own contract comment names this story as the anticipated populator. Ten ACs. Three escalations — ⛔ **Escalation 1 is the live one:** Q1's literal gate (10.23 landing) is met while Q1's *rationale* (a visible resolution path) is NOT, since Escalation 6 is undischarged and no catch-up process exists; D1's framing mitigates but does not discharge it, and it is routed to the Panel **together with** the still-owed two-string copy-truth defect as one question about what the system may tell a member about an obligation it cannot let them satisfy. Q2/Q3/Q5/Q6 carried verbatim into AC3/AC2/AC8/AC9; Q4's `cycle_ref` is POPULATED (AC6) with schema and DTO untouched. | BigDev |
