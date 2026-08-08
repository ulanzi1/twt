---
baseline_commit: 9c08020
---

# Story 10.27: Member Missed-Cycle Visibility `[SURFACE]`

Status: ready-for-dev

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
> the surface's row count for the current IST year equals `skips_current_year` for the same member and `at`.

---

## In scope / out of scope

| In scope (10.27) | Out of scope → owner |
|---|---|
| A **read-only** member-facing list of assigned-and-closed cycles with no live confirmation (**AC1**, **D2**). | Any **write**. No new event, no new table, no `current_state`. This story records nothing. |
| The **epistemic** distinct state and its bilingual copy (**AC2**, **D1**, Q3). | **Cause labels.** No "you gave directly", no "we never notified you", no `out_of_band`-shaped anything — fence (a) and stance 4 both forbid it. |
| A **separate collection** in the existing contribution-history response; the Yogdaan Bahi's attested rows stay byte-unchanged (**AC4**, **D3**). | Widening `ContributionHistoryRow` (nullable `contributionId`/`date`) — it would weaken the contract for every existing consumer. |
| **As-of correctness**: a late or tail-reconciled confirmation removes the row (**AC5**, Q2). | Re-pinning `missed-closed-cycle-v1` (**Q2 forbids it now** — the rename must describe the whole restoration lifecycle, which needs a catch-up path that does not exist). |
| Wiring `cycleRef` so an R7(G) assertion can be filed **against a specific cycle** (**AC6**). | Changing `PersonalEventAssertedPayloadSchema` or the DTO. Q4 KEPT `cycle_ref` as-is; this story **populates** it, nothing more. |
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
- **CLOSED** — the cycle's alert reached `alert.closed`/`alert.settled` at/before `at`;
- **NO LIVE CONFIRMATION** — the shared predicate, reversals honoured, evaluated **at `at`**.

**And** the read **shares the `opportunity`/`sequenced` CTE chain** (`facts.ts:325-357`) with the
existing aggregates — the `missed` predicate itself is already computed once per row and merely
referenced by column in their `FILTER` clauses, so there is nothing to extract there; what must not be
re-typed is the scan that produces the rows. If the scan is duplicated, D2 is defeated and the surface
can drift from the ladder.

**And** ⛔ **a test pins the equality**: for the same member and the same `at`, the number of rows this
read returns **within the IST calendar year of `at`** equals `skips_current_year` from
`deriveContributionFacts`. Use `istYearStartUtc` (`facts.ts:460`), never `getFullYear()` on a UTC
`Date`.

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

**And** a **baseline is captured before any edit**. A live-DB failure here is **not presumptively
innocent** — this story touches a read many specs exercise. Chase each failure to root cause; confirm
innocence by running the suspect spec **in isolation**
([[project_ci_local_double_run_pollution]], [[project_known_livedb_test_failures]]).

**And** never regenerate an applied migration (`42P07`) and never `DROP SCHEMA` (`42P01`)
([[project_live_db_test_gotchas]]). **This story should need no migration at all** — if one appears
necessary, that is a finding.

**And** ⚠ **there is NO validity-cache deploy step, and adding one would be wrong.** This story changes
no fact, no clause and no `validityPayloadHash` — it is a read surface over data the projection already
produces. The `POST …/validity-cache/invalidate-all` lever that Stories 10.24/10.25/10.26 each needed
does **not** apply here. Do not add it out of pattern-matching.

---

## Tasks / Subtasks

- [ ] **Task 1 — Share the opportunity-sequence CTE chain** (AC1)
  - [ ] The `missed` predicate (`NOT liveConfirmationExistsSql('mpa', at) AS missed`, `facts.ts:325-357`)
        is already computed once per row and referenced by column in the aggregates' `FILTER` clauses —
        there is no duplicated predicate to factor out. What Task 2's row-returning read must SHARE is
        the `opportunity`/`sequenced` CTE chain itself (or an equivalent fragment), not a predicate
  - [ ] Prove the existing aggregates are byte-unchanged in behaviour (run the contribution-facts suite first, as a baseline)
- [ ] **Task 2 — The row-returning read** (AC1, AC5)
  - [ ] Add the sibling read in `packages/domain/src/contribution/facts.ts` (or a leaf module in the same directory — see the cycle trap in Dev Notes)
  - [ ] Integer-literal `.limit()`; `istYearStartUtc` for the year window
  - [ ] Live-DB test: row count == `skips_current_year` for the same member + `at`
  - [ ] Live-DB test: a post-close `contribution.confirmed` removes the row (AC5)
- [ ] **Task 3 — The contract** (AC4, AC2)
  - [ ] New `.strict()` entry shape + a new array on the contribution-history response; `ContributionHistoryRow` untouched
  - [ ] Extend the structural no-extra-PII test to cover the new shape
  - [ ] If a sixth `ContributionStatus` member is added: move the lockstep-guard test and `CONTRIBUTION_STATUSES` together
- [ ] **Task 4 — API handler** (AC4)
  - [ ] Extend `apps/api/src/modules/member-pool/handlers.ts` (the Story 8.6 pipeline, `:579`)
  - [ ] Preserve the existing fail-soft posture (`:192`) — a missed-cycle read failure must not empty the attested passbook
  - [ ] Update the `HISTORY_EMPTY` fail-soft sentinel (`:186`) for the widened response shape
- [ ] **Task 5 — Mobile surface** (AC2, AC4, AC6)
  - [ ] Distinct section in `apps/mobile/components/yogdaan-bahi/`; empty/loading/error rendered OUTSIDE the FlatList
  - [ ] ⛔ Render the section in **both** branches of `YogdaanBahi.tsx` — the populated-list return AND
        the zero-attested-rows early return (`rows.length === 0`, today's empty/loading/error-only
        branch). A member with no attested rows but ≥1 missed cycle must still see it (pinned by test)
  - [ ] Zero missed cycles ⇒ section **absent**, not empty (pinned by test)
  - [ ] Instantiate `PersonalEventAssertion` **per missed-cycle row**, passed that row's cycle UUID as a
        prop — not a navigation to the existing membership-screen instance, which has no cycle context
  - [ ] Widen `usePersonalEventAssertion.ts`'s `mutationFn` input (currently `{ kind: PersonalEventKind }`)
        to accept the optional `cycleRef` UUID and thread it into the outgoing
        `PersonalEventAssertionRequest`
  - [ ] Route into the **existing** `PersonalEventAssertion` flow (10.26) with the cycle in hand — do not author a second assertion UI
  - [ ] ⛔ Pass the cycle **UUID**, never the display `cycleRef` (**D4**) — pinned by test
- [ ] **Task 6 — Copy, en + hi** (AC2, AC3, AC7)
  - [ ] Author both locales; run `pnpm microcopy:check` and the i18n-parity gate
  - [ ] ⚠ Expect the `(does|did|will|would)\s+not\s+count` collision; phrase around it
- [ ] **Task 7 — The Q5 fence** (AC8)
  - [ ] State the constraint at the Trustee-Lite consumer; pin with a test that nothing new reaches the suspicion channel
- [ ] **Task 8 — Governance records** (AC3, AC9, Escalations)
  - [ ] `deferred-work.md`: close Escalation 5's re-trigger; record Q6's revisit condition verbatim
  - [ ] Record Escalations 1–3 below as authored; **do not silently absorb any of them**
  - [ ] `sprint-status.yaml`: one combined `last_updated` ledger entry at completion ([[project_sprint_status_ledger]])
  - [ ] ⛔ Governance entries commit **separately and FIRST** with a `governance:` prefix ([[feedback_governance_commits_precede_implementation]])

---

## Escalations owed (raise them; do not silently absorb)

1. ⛔ **Q1's literal gate is met; Q1's RATIONALE is not.** Q1 sequenced this surface after Story 10.23
   because *"showing an obligation with no visible resolution path would be an incomplete disclosure,
   not a kinder one."* Story 10.23 landed — **with Escalation 6 UNDISCHARGED**. There is still **no
   authorized catch-up process**, so R7(D)/(E)/(F) packages name a completion act no workflow can
   perform (Decision `2026-08-08-092` for the corrected binding point: it gates the AC14
   `restoration_discipline_imposition` flag flip, **not** story closure; the flag is default-OFF and
   Trustee-Panel-exclusive per Decision `2026-08-07-089`).

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

---

## Dev Notes

### The type-only → value import trap (this module is a known site)

Story 10.23 lost real time to exactly this: turning a **type-only** import into a **value** import
materialized a module-init cycle that broke `@twt/jobs` at **runtime** while `typecheck`, `lint` and the
package's own suite all stayed **green** ([[project_type_only_import_cycle_trap]]). `contribution/` is
densely cross-imported. **If you need a value from a module you currently import types from, hoist it to
a leaf module** rather than converting the import.

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
| `packages/domain/src/contribution/facts.ts` | The missed-cycle aggregate (counts) + `deriveContributionFacts` | **Adds** a row-returning sibling; extracts the shared predicate. Aggregates unchanged. |
| `packages/contracts/src/contributions/contribution-history.ts` | Yogdaan Bahi read DTO, 5 tones, strict no-PII | **Adds** a new array + entry shape. `ContributionHistoryRow` untouched. |
| `apps/api/src/modules/member-pool/handlers.ts` | The 8.6 pipeline (`:579`), fail-soft to empty passbook (`:192`) | **Extends** the pipeline; preserves fail-soft. |
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
- `packages/domain/src/contribution/facts.ts:227-278` — the opportunity scan (D2)
- `packages/contracts/src/contributions/contribution-history.ts` — the DTO and its PII discipline
- `_bmad-output/implementation-artifacts/deferred-work.md` — Escalation 5 (all six answers)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-08 | 0.2 | Validated via `bmad-create-story validate` (independent fresh-context review against live code, epics, decision log and the 10.25/10.26 story files). One CRITICAL finding fixed: `YogdaanBahi.tsx`'s zero-attested-rows early return (the Fabric-crash-avoidance branch) had no room for the missed-cycle section, silently defeating the surface for members with no attested rows but a real missed cycle — AC4 and Task 5 now require the section in both branches. Three enhancements applied: named `usePersonalEventAssertion.ts` and its required `mutationFn` widening in the Files table and AC6; specified the per-row-instantiation UX mechanism for the assertion affordance (not navigation to the existing cycle-context-free widget); corrected Task 1 / AC1 / Finding 2's D2 box, which described a predicate-extraction that doesn't apply (the `missed` predicate is already computed once) — the actual sharing obligation is the `opportunity`/`sequenced` CTE chain. Everything else the reviewer checked (D1 epistemic framing, D2 scan-reuse intent, D4 two-`cycleRef` disambiguation, the `grey`-reuse rejection, Escalation 1's honest disclosure) was confirmed correct against live code with no changes needed. |
| 2026-08-08 | 0.1 | Story authored via `bmad-create-story`, off branch `feat/10-23-restoration-discipline-lock-in` @ `9c08020`. ⛔ **No epic AC by ratified design** — Decision `2026-08-07-086` states `epics.md` is "not touched" and the story is created directly, so Q1–Q6 are the requirements source of record. Re-trigger fired by Story 10.23 landing `done` (`7729951`). **Two findings established against live code, each invalidating the obvious implementation.** ⭐ **D1 — Q3's "distinct state" cannot be cause-labelled:** of the three causes Q3 names, two are structurally unrecorded and out-of-band is *fenced against ever being recorded* (out-of-band policy stance 4 + `no-ingest-path.test.ts:157`, revert-sanity proven), so the state is made **epistemic** — it reports what the record contains, never what the member did, which is the register that policy already demands of every surface it binds. ⭐ **D2 — the row source already exists:** Story 10.25's D3 relaxed the `facts.ts` scan to see the whole assigned-and-closed opportunity sequence, so the aggregates `skips_current_year`/`opportunities_since_last` are computed over exactly these rows; a second scan would let what the member is SHOWN drift from what the ladder EVALUATES them on, so the predicate is shared and the row-count/aggregate equality is pinned by test. **D3 — extend the response, not the row:** `ContributionHistoryRow` is not widened (a missed cycle has no `contributionId`/`date`/amount, and the Bahi's identity as the record of attested contributions is load-bearing for stance 4). ⛔ **D4 — the two-`cycleRef` trap, found against live contracts:** `contribution-history.ts:81` types `cycleRef` as a **display string** (freeze month) while `personal-event.ts:75` types it as a **UUID** — same name, different type, different job, and wiring the passbook's value into the assertion request would send a freeze-month string where a UUID is required. Each entry therefore carries both, under distinct names, pinned by test. Also confirmed live: the 10.26 assertion surface already exists and is **consumed, not rebuilt**, and its own contract comment names this story as the anticipated populator. Ten ACs. Three escalations — ⛔ **Escalation 1 is the live one:** Q1's literal gate (10.23 landing) is met while Q1's *rationale* (a visible resolution path) is NOT, since Escalation 6 is undischarged and no catch-up process exists; D1's framing mitigates but does not discharge it, and it is routed to the Panel **together with** the still-owed two-string copy-truth defect as one question about what the system may tell a member about an obligation it cannot let them satisfy. Q2/Q3/Q5/Q6 carried verbatim into AC3/AC2/AC8/AC9; Q4's `cycle_ref` is POPULATED (AC6) with schema and DTO untouched. | BigDev |
