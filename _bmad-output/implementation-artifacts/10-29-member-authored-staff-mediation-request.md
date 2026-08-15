---
baseline_commit: 7f5470dc936bf0e3113eb0af72771593cd5f9aa3
---

# Story 10.29: Member-Authored Staff-Mediation Request `[SURFACE]`

Status: done

> ⚠ **THE BASELINE IS NOT ON `main`.** `origin/main` is `4c366f7`; the mint commit `7f5470d`
> (`governance(10.29)`) lives on the branch `governance/10-29-member-authored-staff-mediation-request` and
> is **unmerged**. Branch this story's work off `7f5470d`, not off `main` — branching off `main` silently
> drops the epics.md section + the sprint-status entry this story is written against
> ([[feedback_git_fetch_before_remote_reasoning]] — `git fetch origin` before reasoning about either).
>
> ⭐ **WHAT THIS STORY DISCHARGES.** `Decision 2026-08-15-116` clause 3 ruled Story 10.21's **Escalation 11**
> as **option (c)** — *"a genuinely member-authored artifact, captured at ticket intake and read by the
> route"* — **no conditions**, and deliberately did NOT mint the owner. `7f5470d` named it. This story is
> the WORK; the mint is already discharged.
>
> ⛔ **THE DELIVERY MODEL IS NOT RE-OPENED** (`116` cl.2). Member-direct primary + a narrow staff-mediated
> exception stands. **Elements 2 and 3 are confirmed correctly built and are OUT OF SCOPE** — a diff that
> touches `primary_delivery_not_completed_at`'s predicate (`2026-08-15-117` cl.3 scoped it to the export's
> own member-direct grant) or the Tier-1 attestation posture (`2026-08-14-111` cl.1) is out of scope, in
> either direction, including "while I was in there".
>
> ⚠ **NOTHING HERE IS URGENT, AND NOTHING HERE PAUSES PRODUCTION** (`116` cl.4). The ruling found element
> 1's **evidentiary strength** weak — ⛔ **not** the fallback unsafe to operate. The current
> `z.literal(true)` mechanization stays live until this lands, and this story must **never** ship an
> intermediate state in which the boolean is removed before the read path is complete. One branch, one
> merge; ⛔ no flag, no two-phase rollout.
>
> ⛔ **DO NOT MINT A NEW HELPDESK CATEGORY.** `DEFAULT_ROUTING_POLICY` must stay **byte-identical**
> (`2026-08-14-106` cl.1). A new category is absent from every per-Pariwar override authored before today,
> silently mis-routes to that Pariwar's generic `other` desk under the wrong SLA with **no error anywhere**,
> and trips `packages/domain/tests/helpdesk/default-policy-hash.test.ts`
> ([[project_helpdesk_default_policy_version_trap]] — ⛔ that guard's own suggested remedy is part of the
> trap). The capture is a **structured field**, not a routing surface.
>
> **Depends on:** Story 10.21 (`done`) — the three-part gate + the two delivery routes this corrects.
> Stories 10.1 / 10.2 / 10.3 (`done`) — the create-ticket primitive and the two intake surfaces the field
> is captured on.

## Story

As a member who has asked staff to hand over my data export because I cannot receive the code myself,
I want that request recorded as something **I** said at intake,
so that the exceptional route rests on my own request rather than on an operator asserting I made one.

---

## 🎯 The gap, stated exactly

`Decision 2026-08-14-113` clause 1 ratified a **three-part gate** on staff-mediated delivery. Element 1 is
*"the member's explicit request… author: the member, at intake."* What shipped is:

```
packages/contracts/src/member-data-rights/member-data-rights.ts:184
    member_requested_staff_mediation: z.literal(true),      ← element 1, as a TYPE

apps/admin/src/api/client.ts:722
      member_requested_staff_mediation: true,               ← hardcoded by the ONLY caller

apps/api/src/modules/member-data-rights/handlers.ts:902
              memberRequestRecordedAt: now,                 ← `now` = the instant STAFF submits
```

Three consequences, each independently fatal to what element 1 claims to be:

1. **It is unfalsifiable.** `z.literal(true)` has no `false` — the schema is satisfied by the literal
   alone. There is no state of the world in which element 1 is absent, so it gates nothing.
2. **Its author is the caller, not the member.** The one caller hardcodes it. `2026-08-14-111` clause 3 had
   warned in advance that elements 1 and 3 are *"two separate facts with different authors"* and that *"a
   single staff-authored field would silently absorb the member's trigger into a staff assertion."*
   `2026-08-15-115` found exactly that had shipped.
3. **Its timestamp is the wrong event's.** `member_request_recorded_at` is written as `now` at the moment
   the staff-mediated route is called — a timestamp **for the staff action, wearing the member's field
   name** (`2026-08-15-115` cl.3). Every later reader of that column is misled about what instant it
   records.

⛔ **The "it is implied at intake" defence is unevidenced in code** (`2026-08-15-115` cl.4). The originating
ticket's `body` is free text, **never parsed and never referenced by the gate** — so the "staff are
confirming, not inventing" reading rests entirely on operator conduct, with nothing in the tree testing it.

⚠ **Why this matters more here than it would elsewhere.** `staff_mediated` is the one path in this system
on which a staff actor obtains a member's assembled, **DECRYPTED Tier-1 export**. A gate around a
PII-disclosure path that does not verify what its own ratified text says it verifies is a claimed
protection that does not exist — the same defect class this story's parent had to correct three times
during authoring.

---

## ⛔ THE FIVE TRAPS — read these before anything else

**Trap 1 — adding a read path BESIDE the boolean satisfies nothing.** `116` clause 3 names the **removal**.
A route that reads the captured fact *and still accepts* `member_requested_staff_mediation` leaves the
element-1/element-3 collapse exactly where it was, with one more field. **AC3 is a deletion AC.** When you
are done, `grep -rn member_requested_staff_mediation apps packages` must return **zero** hits outside this
story file.

**Trap 2 — a non-null assertion proves nothing.** `expect(row.member_request_recorded_at).not.toBeNull()`
was already true under `z.literal(true)` — it is in the suite today
(`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts:394`). **AC6 needs a
POLARITY PAIR**: the same route, the same operator, the same export, **refused** against a ticket with no
captured request and **permitted** against one with it — the *only* difference being a fact recorded at
intake. Anything less re-ships the vacuous assertion under a new name.

**Trap 3 — the app read does NOT replace migration 0104's DB CHECK; it FEEDS it.**
`data_export_delivery_grants_three_part_gate_check` (`0104:64-72`) requires
`member_request_recorded_at IS NOT NULL` on `staff_mediated` and must stay exactly as it is. ⛔ Do not
"simplify" it now that the app checks earlier. It gates a PII-disclosure path precisely so a caller-side
bug cannot create an ungated row.
`packages/domain/tests/integration/rls/data-rights-delivery-and-correction-policy-regression.spec.ts:187`
drives it column-by-column and **must pass byte-unchanged**.

**Trap 4 — the DPDPA subcategory is NOT in the routing policy, and must not be added to it.**
`DEFAULT_ROUTING_POLICY` (`packages/domain/src/helpdesk/registry.ts:51-64`) has nine rules, all
`sub_category: null`. `categoriesForPariwar` derives the picker from the policy, so **no intake surface
offers `dpdpa-data-rights` from the registry**. The operator console already solves this **client-side**
(`HelpdeskOperatorShell.tsx:82-94` appends the imported token under `other`). Copy that mechanism; ⛔ do not
add a rule, and ⛔ do not re-declare the literal — `packages/contracts/tests/member-data-rights-single-literal.test.ts`
scans for it, and its SCAN_ROOTS **do not include `apps/mobile`** today (see Task 6).

**Trap 5 — an intermediate red state is forbidden.** The boolean's deletion (AC3) and the read path (AC3)
land in the **same** commit series on one branch. `116` cl.4 keeps the current mechanization in production
until this whole story lands. ⛔ No "delete now, wire later", ⛔ no feature flag, ⛔ no partial merge.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| ⛔ Not in scope | Why |
|---|---|
| Element 2 (`primary_delivery_not_completed_at`) — the predicate, its scoping, its name | `116` cl.2 (confirmed correctly built) + `2026-08-15-117` cl.3 (its scope was ruled 2026-08-15 and stands). The `delivery-terminology-gate` test enforces the name tree-wide. |
| Element 3 (the Tier-1 attestation) — storage, withholding, the textarea | `116` cl.2; `2026-08-14-111` cl.1. |
| The delivery MODEL (primary vs exception, the ordering, the collapsed `<details>` UI posture) | `116` cl.2 — ratified by `2026-08-14-113`, not re-opened. |
| A new helpdesk category, or any `DEFAULT_ROUTING_POLICY` edit | The banner + Trap 4. |
| An UPDATE path for the captured field (a PATCH route, an admin "tick it later" control) | **D4** — an updatable element 1 recreates the collapse with one extra hop. |
| Trustee-panel authority over DPDPA actions | `2026-08-14-109` cl.7 — RULED settled, not pending. ⛔ Do not grant `member.data_rights` to `trustee_panel`. |
| The member-facing ticket-detail DTO gaining the new field | **D5** — the operator surface needs it; the member's own detail view does not, and widening member-facing DTOs is unearned scope. |
| Making `routed_to_role` authoritative, or adding a routing rule for data rights | [[project_helpdesk_routing_is_advisory]] — routing is advisory; enforcement lives in the grant/caller precondition. |
| `attempts = 0` on the element-2 OTP predicate | An open follow-up from 10.21's review, untouched by `116`. Stays open. |

---

## Acceptance Criteria

⛔ **The seven ACs below are MINTED TEXT** (`epics.md:4287-4322`, commit `7f5470d`). They are reproduced
**verbatim**; the ⚙ **Implementation** blocks under each are this story's own guidance and carry no minted
authority. ⛔ Never edit minted AC text — supersede it, never re-read it
([[feedback_supersede_never_reinterpret]]).

### AC1 — The member's request is captured at INTAKE as a STRUCTURED field

> The ticket-intake contract gains an explicit field recording that the member asked for staff-mediated
> delivery, together with the instant it was recorded. ⛔ **Not the ticket `body`** — free text is never
> parsed by a gate, and the `body` is exactly where Decision `2026-08-15-115` clause 4 found the "it is
> implied at intake" defence to be unevidenced. ⛔ Not a new helpdesk category (see the banner).

⚙ **Implementation (per D1).** One nullable `timestamptz` column
`helpdesk_tickets.member_staff_mediation_requested_at` (migration **0106**, hand-authored), written **only**
by `projectTicketGenesis`, and mirrored into the genesis `helpdesk.ticket_created` payload. The wire input is
a boolean on the two intake requests; the server supplies the instant. ⛔ Never a client-supplied timestamp.

### AC2 — Both intake paths can capture it

> A DPDPA ticket is filed either by the member (Story 10.2) or by a helpline operator relaying the call
> (Story 10.3). Every path that can originate a data-rights ticket must be able to record the field, or the
> ruling is satisfied on one route and silently unmet on the other.

⚙ **Implementation.** Both `CreateTicketRequest` (operator, `packages/contracts/src/helpdesk/create-ticket.ts`)
and `MemberCreateTicketRequest` (member app, `packages/contracts/src/helpdesk/member.ts:61-73`) gain the
boolean; both handlers thread it into `projectTicketGenesis`. ⚠ The member route is **multipart** — the field
arrives as a form field string and needs the same `''`-means-absent normalization `sub_category` already has
(`member-handlers.ts:347-353`). The `fields: 12` multipart limit (`member-handlers.ts:184`) has headroom.

### AC3 — The delivery route READS the captured fact, and the caller-supplied boolean is REMOVED

> `grantStaffMediatedDelivery` resolves element 1 from the originating ticket's captured field.
> `member_requested_staff_mediation: z.literal(true)` is **deleted** from `StaffMediatedDeliveryRequest`
> and from the admin client that hardcodes it. ⭐ **The removal is the point** — `116` clause 3 names it
> explicitly, and a read path added *beside* a still-accepted boolean leaves the collapse in place.

⚙ **Implementation.** `requireTicketInScope` (`handlers.ts:252-259`) already loads the row and discards it —
**return it** and read the column from it. Three deletion sites: the contract (`:184`), the admin client
(`client.ts:701,722`), and the audit digest (`handlers.ts:803`, which references `body.member_requested_staff_mediation`
and would not compile). ⚠ Also update the OpenAPI emitter's component
(`packages/contracts/scripts/emit-openapi.ts:3280,3298-3299,3415`) — it derives from the schema, so it follows
automatically, but re-run the emit and confirm.

### AC4 — `member_request_recorded_at` carries the MEMBER's instant, not the operator's

> Today the handler writes `now` at the moment the staff-mediated route is called (`2026-08-15-115` clause
> 3) — a timestamp for the staff action wearing the member's field name. It must carry the instant the
> member's request was recorded at intake.

⚙ **Implementation.** `handlers.ts:902` `memberRequestRecordedAt: now` → the ticket's captured instant.
⚠ **The assertion that proves this** is not "not null" — it is that the persisted grant's
`member_request_recorded_at` **equals the ticket's** `member_staff_mediation_requested_at` and is **strictly
earlier** than the grant's `created_at`. ⛔ A test that only checks non-null cannot tell AC4 from the defect.

### AC5 — Fails closed, at BOTH layers

> A staff-mediated grant whose originating ticket carries no captured member request is refused with a typed
> error **before any row exists**. ⛔ Migration 0104's `data_export_delivery_grants_three_part_gate_check`
> continues to require `member_request_recorded_at` NOT NULL on `staff_mediated` — the app-layer read does
> not replace the DB backstop, it feeds it. The migration-level assertions in
> `packages/domain/tests/integration/rls/data-rights-delivery-and-correction-policy-regression.spec.ts`
> must still pass unchanged.

⚙ **Implementation (per D3).** `ConflictError` **409**, code
`member_data_rights.member_request_not_captured`, thrown after `requireTicketInScope` and **before**
`insertStaffMediatedGrant` — no grant row, and (per the existing `finally`) the idempotency key is released.
⛔ Migration 0104's CHECK is **byte-frozen**; the regression spec is **byte-frozen**. Prove "no row exists"
with a `SELECT` after the refusal, the way the element-2 refusal test already does
(`delivery-and-correction.spec.ts:306-315`).

### AC6 — A test proves element 1 is now MEMBER-authored, not merely PRESENT

> ⛔ Asserting the field is non-null proves nothing that `z.literal(true)` did not already satisfy. The test
> must show a staff-mediated grant **refused** when the member never asked and **permitted** when they did,
> with the difference being a fact recorded at intake rather than a flag set by the caller.

⚙ **Implementation.** The polarity pair, both arms driving the **real** routes, in
`apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`. `seedSubject` (`:173-232`)
already files the originating ticket through the real create route — give it an option that sets the new
intake field, and take **both** arms through `primaryTriedAndLapsed` so element 2 is genuinely true in both
and element 1 is provably the only difference. Plus the AC4 equality/ordering assertion, plus the
**member-app arm** (AC2): a ticket filed through the 10.2 member route with the field set is equally
sufficient.

### AC7 — Elements 2 and 3 are untouched, and the story says so

> Per `116` clause 2. The `primary_delivery_not_completed` scoping (Decision `2026-08-15-117` clause 3 —
> scoped to the export's own member-direct grant) and the Tier-1 attestation posture are out of scope and
> must not be edited in passing.

⚙ **Implementation.** Discharged by the SCOPE BOUNDARY table above **and** by evidence: the Dev Agent Record
records `git diff --stat` proof that `packages/domain/src/data-export/delivery.ts`'s
`primaryDeliveryNotCompletedAt` and the `encTier1` attestation block (`handlers.ts:876-881`) are unchanged.

---

## 🚨 Decisions — ✅ **ALL SIX RULED BY BIGDEV, 2026-08-15. Nothing here is open.**

**Ruled as recommended, all six, no amendments and no conditions** (BigDev, 2026-08-15). Each ruling is
recorded on its own decision below. ⛔ Nothing in the Tasks re-opens them, and ⛔ the recommendations are no
longer recommendations — they are the ruled design.

⚠ **The rulings are NOT yet in `.decision-log.md`.** Task 1 commits them as `Decision 2026-08-15-120` with a
`governance:` prefix and ZERO `packages/`/`apps/` files, **before** any code lands
([[feedback_governance_commits_precede_implementation]]). ⛔ Recording them here is not recording them there.

### D1 — The captured field's SHAPE and NAME — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED:** a single nullable `timestamptz` column,
`helpdesk_tickets.member_staff_mediation_requested_at` (TS `memberStaffMediationRequestedAt`), plus a boolean
`member_requested_staff_mediated_delivery` on the two intake **requests** only.

- **One nullable timestamp, not a boolean + a timestamp.** Two columns can disagree; one cannot. `asked ⇔ NOT
  NULL`, `when ⇔ the value` — the **identical** shape `member_request_recorded_at` already uses on the grant
  row, which is what makes the hand-off to migration 0104's CHECK a copy rather than a translation.
- **A distinct wire name from the deleted one.** ⛔ Reusing `member_requested_staff_mediation` on the intake
  request would make AC3's deletion ungreppable and unreviewable — a token still present tree-wide, meaning
  something different. Trap 1's `grep` check depends on the new name being different.
- ⛔ **Not a separate table.** [[project_no_premature_package]]'s sibling reasoning: one nullable column on
  the ticket that already owns the intake facts, until a second consumer exists.
- ⚠ **Alternative considered and rejected:** a JSONB `intake_facts` blob. It defers naming, defeats a DB-level
  NOT NULL story if one is ever wanted, and repeats the `->>'` TEXT-cast footgun
  ([[feedback_story_validate_footguns]]).

### D2 — How the member app SURFACES it (Trap 4's live edge) — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED:** mirror the operator console exactly. `apps/mobile/app/(helpdesk)/new.tsx` appends the
**imported** `DPDPA_DATA_RIGHTS_SUBCATEGORY` under `category: 'other'` (the `HelpdeskOperatorShell.tsx:82-94`
precedent), and the staff-mediation checkbox renders **only** when that subcategory is selected.

- ⛔ **The coupling is PRESENTATIONAL ONLY.** The server accepts the boolean on any ticket. Enforcing
  "subcategory ⇒ field" in the contract would put the DPDPA token in a **second** enforcement site and make
  the intake schema depend on a routing token — the exact coupling 10.21 spent AC2 avoiding.
- ⚠ Rejected: always-visible checkbox (noise on every `payment-failed` ticket, and it invites ticking
  without context); gating on `category === 'other'` alone (arbitrary — `other` is the catch-all).
- ⚠ Follow-through: this puts the token in `apps/mobile` for the first time ⇒ **Task 6** extends the
  single-literal gate's SCAN_ROOTS, or the convention decays exactly where it is newest
  ([[feedback_gate_scope_semantic_coverage]]).

### D3 — The refusal's status and code — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED:** `409 ConflictError`, code `member_data_rights.member_request_not_captured`.

- **409, matching element 2's sibling refusal** (`member_data_rights.primary_delivery_not_completed_required`)
  — the request is well-formed; a server-observed precondition is unmet.
- ⛔ **Not 404.** The ticket-scoping 404 (`member_data_rights.ticket_not_found`) exists so the route does not
  confirm a ticket's existence. That reasoning does not transfer: this caller has already been shown the
  ticket. A 404 here would make a legitimately-refused fallback unexplainable to the operator.
- ⛔ Not 400 — nothing about the caller's payload is wrong.

### D4 — Is the captured field mutable after intake? — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED: NO.** Genesis-only. No PATCH route, no admin control, no backfill.

- An updatable element 1 recreates the collapse with one extra hop: staff who want the fallback set the flag,
  then call the route. ⛔ That is precisely what `116` forecloses.
- The remedy when a member forgot: **file another ticket** — which is a member act, recorded at its own
  instant, exactly as intended.
- ⛔ **No backfill for existing tickets.** They carry no captured request because none was captured; that is a
  true fact, not a data gap ([[feedback_record_unattested_no_backfill]]).

### D5 — Does the OPERATOR surface show it? — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED: YES** — `member_staff_mediation_requested_at` on `HelpdeskTicketDto` (which
`HelpdeskAdminTicketDetailResponse` extends), and `HelpdeskDetailShell` disables the fallback submit with an
explaining line when it is null.

- ⚠ **This is end-to-end coherence, not scope creep.** Today the operator's *only* signal is a 409 after
  typing an attestation into a textarea. Removing the hardcoded `true` without surfacing the fact leaves a
  control whose refusal is unexplainable at the surface.
- ⛔ **The UI check is presentational.** The server decides; the disabled button is a courtesy, and the 409
  path must still be reachable and tested (a stale client, a direct call).

### D6 — The helpline path's evidentiary status — say it plainly — ✅ **RULED as recommended (BigDev, 2026-08-15)**

⭐ **RULED:** record the limit in the contract doc-comment, in the story, and in the decision-log entry.
Do not paper over it.

On `created_via: 'helpline_call'` the field is **operator-transcribed at intake** — the same posture as `body`
and `operator_attribution`. What it buys over `z.literal(true)`:

1. a **separate act at a separate instant**, by a possibly-different actor, on a ticket the delivery route
   **cannot create**;
2. an **immutable genesis-event record** (D4), not a request-time literal;
3. the delivery caller can **no longer manufacture element 1 at all** — the only way to produce it is to file
   a ticket, which is the intake surface the ruling names.

What it does **not** buy: proof the member spoke. ⛔ Do not claim it does — not in copy, not in a comment, not
in the decision-log entry. ⚠ Option (b) (a staff checkbox at delivery time) was **weighed and rejected** by the
Panel; the member-app path (10.2) is where authorship is genuine, and AC2 requires both. State the asymmetry;
do not resolve it by pretending.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 — structured capture at intake | 2, 3, 4 |
| AC2 — both intake paths | 3, 4, 5, 8 |
| AC3 — read + DELETE the boolean | 6, 7 |
| AC4 — the member's instant | 6, 8 |
| AC5 — fails closed at both layers | 6, 8 |
| AC6 — the polarity pair | 8 |
| AC7 — elements 2/3 untouched | 9 |

### Task 0 — Branch, baseline, rulings (AC: all)
- [x] ✅ **UNBLOCKED.** BigDev ruled **D1–D6 as recommended** on 2026-08-15 — no amendments, no conditions.
      Every ruling is recorded above under the decision it answers. ⛔ Nothing below re-opens them, and ⛔ the
      ruled design is now mandatory, not a suggested default.
- [x] `git fetch origin`. Branch `feature/10-29-member-authored-staff-mediation-request` off **`7f5470d`**
      (⛔ **not** `main` — see the banner), clean tree, verified.
- [x] **Baseline the suites BEFORE any edit** and record real numbers:
      `pnpm --filter @twt/contracts test`, `pnpm --filter @twt/domain test tests/helpdesk/`, the live-DB
      `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`,
      `apps/api/tests/integration/helpdesk/` and
      `packages/domain/tests/integration/rls/data-rights-delivery-and-correction-policy-regression.spec.ts`.
      ⛔ A baseline taken after an edit is not a baseline.
- [x] Re-derive every line anchor in this file against the working tree; record **drift or ZERO DRIFT**
      explicitly.

### Task 1 — `governance:` — the decision-log entry (AC: all) — **COMMITS FIRST**
- [x] Append **Decision `2026-08-15-120`** to `.decision-log.md` (newest first, above `2026-08-15-119`),
      carrying D1–D6 with per-clause provenance (mandatory under `2026-08-09-095`): which clauses are
      BigDev-ruled vs author-committed framing. ⛔ Include **D6's stated limit** — an entry that omits it
      overclaims what the story achieves.
- [x] `deferred-work.md:4753-4770` — the successor item is **DISCHARGED by Story 10.29** once this lands; use
      [[feedback_closure_language_precision]]'s vocabulary exactly ("Closed by [implementation]", ⛔ not
      "Resolved via deferral"). ⚠ Keep the entry — it is the trail from Escalation 11 to its owner.
- [x] ⛔ **Zero `packages/` and `apps/` files in this commit.** History must read governance → implementation.
      Commit manually — branch + selective stage, ⛔ **not** `commit-story` ([[project_story_automator_ops]]).

### Task 2 — The column + migration 0106 (AC: 1) — **D1**
- [x] `packages/domain/src/schema/helpdesk_tickets.ts` — add `memberStaffMediationRequestedAt` beside
      `operatorAttribution`, with a doc comment stating: written only by the projector at genesis, nullable
      means "not asked", and ⛔ never client-timestamped.
- [x] **Hand-author** `packages/domain/migrations/0106_helpdesk-member-staff-mediation-request.sql`:
      `ALTER TABLE "helpdesk_tickets" ADD COLUMN "member_staff_mediation_requested_at" timestamp with time zone;`
      ⛔ **Do NOT run `drizzle-kit generate`** — the snapshots stop at `0020` and regenerating an applied
      migration is the `42P07` footgun ([[project_live_db_test_gotchas]]). Follow `0105`'s hand-authored
      header style.
- [x] Append the `_journal.json` entry: `idx: 106`, `version: "7"`, `when: 1789875600000` (the +86400000
      cadence `0103→0105` uses), `tag: "0106_helpdesk-member-staff-mediation-request"`, `breakpoints: true`.
- [x] ⛔ **No backfill, no DEFAULT, no NOT NULL** (D4). Existing tickets are legitimately null.

### Task 3 — The genesis payload + projector (AC: 1, 2) — **D1**
- [x] `packages/domain/src/helpdesk/events.ts` — `HelpdeskTicketCreatedPayloadSchema` gains
      `member_staff_mediation_requested_at: z.string().datetime({ offset: true }).nullable()`. ⛔ `.strict()` —
      an unknown key is a defect; the field must be **present-and-nullable**, not optional, or old and new
      events become indistinguishable.
- [x] `packages/domain/src/helpdesk/project.ts` — `ProjectTicketGenesisInput` gains
      `memberStaffMediationRequestedAt: Date | null`; write it into **both** the payload (`:154-180`) and the
      row insert (`:214-241`), from the **same** input, so payload and row cannot disagree (the existing
      discipline at `:152-153`).
- [x] `packages/events/src/registry.ts:539-541` — extend the `helpdesk.ticket_created` description to name the
      new field. ⛔ Do **not** mint a new event type — this is not a new name and must not trip the 8.10 fence
      ([[project_contribution_event_name_contract]]).

### Task 4 — The operator intake path (AC: 1, 2) — Story 10.3's surface
- [x] `packages/contracts/src/helpdesk/create-ticket.ts` — `CreateTicketRequest` gains
      `member_requested_staff_mediated_delivery: z.boolean().optional()`. Doc-comment it with **D6's limit**:
      on `helpline_call` this is operator-transcribed at intake.
- [x] `apps/api/src/modules/helpdesk/handlers.ts` — thread it into `projectTicketGenesis` (`:252-278`) as
      `body.member_requested_staff_mediated_delivery === true ? createdAt : null`. ⛔ The **server's**
      `createdAt`, never a client value.
- [x] Add it to the create-route audit digest (`:210-224`) — the routing-decision audit should record that the
      ticket carried the request.
- [x] `apps/admin/src/api/client.ts` + `hooks.ts` (`useCreateHelplineTicket`) + `HelpdeskOperatorPage.tsx:77-84`
      + `HelpdeskOperatorShell.tsx` — a checkbox in the intake form, rendered when the DPDPA subcategory is
      selected (**D2**), with copy in `apps/admin/src/modules/helpdesk/i18n-en.ts`.

### Task 5 — The member intake path (AC: 1, 2) — Story 10.2's surface — **D2**
- [x] `packages/contracts/src/helpdesk/member.ts:61-73` — `MemberCreateTicketRequest` gains the same boolean.
- [x] `apps/api/src/modules/helpdesk/member-handlers.ts:347-353` — parse the multipart field with the **same**
      `''`-means-absent normalization `sub_category` has; thread it into `projectTicketGenesis` (`:448-476`).
      ⚠ The value arrives as a **string** (`'true'`/`'false'`/absent) — normalize explicitly; ⛔ do not hand a
      raw string to `z.boolean()`.
- [x] `apps/mobile/app/(helpdesk)/new.tsx` — append the **imported** `DPDPA_DATA_RIGHTS_SUBCATEGORY` under
      `other` (the `HelpdeskOperatorShell.tsx:82-94` mechanism), render the checkbox only when it is selected,
      append the field to the `FormData` (`:131-137`), and persist it in the MMKV draft alongside
      `category`/`subCategory` ([[project_mmkv_asyncstorage_equivalent]]).
- [x] Copy in **both** `packages/i18n/locales/en/helpdesk.json` and `.../hi/helpdesk.json` under the `new.*`
      group. ⛔ `helpdesk` is a **member-facing** namespace — the en/hi parity gate
      (`packages/i18n/tests/parity.test.ts`) fails on a missing or whitespace-only `hi` entry.

### Task 6 — The single-literal gate's scope (AC: 2) — **D2's follow-through**
- [x] `packages/contracts/tests/member-data-rights-single-literal.test.ts:43-52` — add `apps/mobile` to
      `SCAN_ROOTS`. ⛔ Do not narrow the existing roots; the comment above them records why `tests` trees are
      in scope and that history is load-bearing.
- [x] ⭐ **Prove the extension has teeth**: temporarily re-declare the literal in the mobile screen, run the
      test, record it **RED with its real output**, revert, re-run green. A gate that cannot be made to fail
      proves nothing ([[feedback_gate_scope_semantic_coverage]]).

### Task 7 — The delivery route: READ, and DELETE the boolean (AC: 3) — **Trap 1**
- [x] `packages/contracts/src/member-data-rights/member-data-rights.ts:184` — **DELETE**
      `member_requested_staff_mediation`. Rewrite the schema's doc-comment (`:169-176`) so it describes where
      element 1 now comes from; ⛔ leave the element-2 "never accepted from the caller" paragraph unchanged.
- [x] `apps/admin/src/api/client.ts:699-726` — delete the field from the body and rewrite the `⚠` comment
      (`:701-703`), which currently asserts the very reading `116` rejected.
- [x] `apps/api/src/modules/member-data-rights/handlers.ts` — `requireTicketInScope` (`:252-259`) **returns the
      row**; `grantStaffMediatedDelivery` reads `memberStaffMediationRequestedAt` from it; the AC5 refusal
      (D3) fires before any write; `memberRequestRecordedAt: now` (`:902`) → the captured instant (AC4); the
      audit digest (`:798-806`) swaps `member_requested_staff_mediation` for the captured instant's ISO string.
- [x] Rewrite the route's header comment (`:777-786`) — element 1's description is now a **read**, not a
      caller-supplied element.
- [x] `packages/contracts/scripts/emit-openapi.ts` — re-run the emit; confirm the component drops the field.
- [x] **D5** — `packages/contracts/src/helpdesk/ticket.ts:50-87` `HelpdeskTicketDto` gains
      `member_staff_mediation_requested_at: Iso8601Datetime.nullable()`; map it in
      `apps/api/src/modules/helpdesk/handlers.ts` `toTicketDto`/`toAdminDetail`; disable the fallback submit in
      `HelpdeskDetailShell.tsx:271-283` when it is null, with a new `i18n-en.ts` line. ⛔ Presentational only —
      the 409 stays reachable.
- [x] ⛔ **THE SWEEP:** `grep -rn "member_requested_staff_mediation" apps packages` must return **zero** hits.
      Record the command and its empty output in the Dev Agent Record.

### Task 8 — Tests (AC: 2, 3, 4, 5, 6) — **the mandatory pair, and it is a PAIR**
- [x] ⭐ **AC6 — THE POLARITY PAIR (live DB), in
      `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`.** Give `seedSubject`
      (`:173-232`) an option that files the originating ticket **with** the intake field.
      **(a)** ticket WITHOUT it ⇒ `409 member_data_rights.member_request_not_captured`, and a `SELECT` proving
      **zero** `staff_mediated` rows for that member.
      **(b)** ticket WITH it ⇒ `200`, grant persisted.
      ⛔ **Both arms must run `primaryTriedAndLapsed`** so element 2 is genuinely true in both — otherwise arm
      (a) may be refusing for element 2's reason and the test proves nothing about element 1.
- [x] ⭐ **AC4 — the instant is the MEMBER's.** In arm (b): the grant's `member_request_recorded_at`
      **equals** the ticket's `member_staff_mediation_requested_at` **and is strictly less than** the grant's
      `created_at`. ⛔ `not.toBeNull()` is Trap 2 and does not satisfy AC4 or AC6.
- [x] **AC2 — the member-app arm.** A ticket filed through the **10.2 member route** (multipart, Turnstile +
      Idempotency-Key headers — see `apps/api/tests/integration/helpdesk/` for the existing harness) with the
      field set is equally sufficient for the same grant. ⛔ Without this, AC2 is met on one route and unproven
      on the other — the exact failure the AC names.
- [x] **AC5 — the DB backstop still bites.** `packages/domain/tests/integration/rls/data-rights-delivery-and-correction-policy-regression.spec.ts`
      runs **byte-unchanged** and green. Record the count.
- [x] **Unit (DB-free):** the genesis payload schema round-trips the new field and **rejects** an unknown key
      (`.strict()`); `projectTicketGenesis` writes payload and row from the same input (extend
      `packages/domain/tests/helpdesk/events.test.ts`).
- [x] ⭐ **REVERT-SANITY, mandatory (AC6).** Restore `memberRequestRecordedAt: now` in the handler, run the AC4
      assertion, record it **RED with its real output**, restore, re-run green.
- [x] Update every existing caller of the deleted field: `delivery-and-correction.spec.ts:297,372,462,617,1031`.
      ⛔ **Update — do not delete.** `:339-344` (member-direct carries none of the three) and `:402-407` (the
      converse) are the `member_direct_clean_check` proofs and must keep proving it.

### Task 9 — Elements 2 and 3 untouched, proven (AC: 7)
- [x] `git diff` proof that `packages/domain/src/data-export/delivery.ts`'s `primaryDeliveryNotCompletedAt`
      and the `encTier1` attestation block (`handlers.ts:876-881`) are **unchanged**. Paste the `--stat` line
      into the Dev Agent Record.
- [x] `packages/contracts/tests/delivery-terminology-gate.test.ts` green — the mandated
      `primary_delivery_not_completed` naming is enforced tree-wide (`2026-08-14-113` cl.2).
- [x] `packages/domain/tests/helpdesk/default-policy-hash.test.ts` green and **unmodified** —
      `DEFAULT_ROUTING_POLICY` is byte-identical (the banner).

### Task 10 — Verification (AC: all)
- [x] `pnpm ci:local` — all static gates. ⚠ `git push` runs the full `ci:local` via a pre-push hook (that is
      the "hang") ([[project_friction_budget_baseline_ratchet]]).
- [x] Live-DB **single-pass** for `@twt/domain` and `@twt/api`. ⛔ Do **not** export `DATABASE_URL` globally —
      that double-runs integration specs into polluted counts and worker timeouts
      ([[project_ci_local_double_run_pollution]]). Confirm a suspect spec's innocence by running it in
      isolation, never by assumption ([[project_known_livedb_test_failures]] — `@twt/api` full-suite runs
      surface a *different* red spec each run; one red spec is not evidence of a regression).
- [x] `pnpm --filter @twt/i18n test` (parity), `pnpm --filter @twt/contracts test` (single-literal + helpdesk
      sync-guard + terminology gate), `pnpm --filter @twt/admin test`, `pnpm --filter @twt/mobile test`.
- [x] Per-package `lint` for every package touched — the ESLint config resolves per-package cwd
      ([[project_eslint_config_per_package_cwd]]).
- [x] Record every count as a **real local run**; anything not captured is recorded **un-attested**, never
      reconstructed ([[feedback_record_unattested_no_backfill]], [[feedback_verify_before_committing_governance_claims]]).
- [x] Flip `development_status[10-29-member-authored-staff-mediation-request]` and add ONE combined
      reverse-chron `last_updated` comment at completion ([[project_sprint_status_ledger]]).

---

### Review Findings

_(none yet — populated by `bmad-code-review`)_

## Dev Notes

### Files being MODIFIED — read each **before** editing

| File | What it does today | What changes | What must NOT break |
|---|---|---|---|
| `packages/domain/src/schema/helpdesk_tickets.ts` | The 5th event-derived-state primitive's table; `current_state` is projector-only, trigger- + CI-gated | +1 nullable `timestamptz` column | The `current_state`/`state_event_version` guard posture; the `subject_xor` CHECK; the category/state pgEnum tuples the contracts sync-guard pins |
| `packages/domain/src/helpdesk/events.ts` | Strict genesis + transition payload schemas; the genesis carries the full routing snapshot | +1 present-and-nullable field on the genesis | `.strict()`; the subject-XOR and `created_via`/`operator_attribution` superRefines; every transition schema |
| `packages/domain/src/helpdesk/project.ts` | Appends genesis (`event_version = 1`) + inserts the row in ONE tx, under the state-writer guard | +1 input field, written into **both** payload and row | The empty-stream genesis guard; the actor/actorId consistency check; the `SET LOCAL … writer` bracket and its swallowed reset |
| `packages/contracts/src/helpdesk/create-ticket.ts` | Operator/admin create request; server-authoritative routing + attribution | +1 optional boolean | The subject-XOR superRefine; `created_via: 'member_app'` staying rejected at the admin route |
| `packages/contracts/src/helpdesk/member.ts` | Member-app create request (subject/body caps, newline-collapsing transform) | +1 optional boolean | The `subject` transform + `.min(1)` pipe; the caps that mobile reads |
| `packages/contracts/src/helpdesk/ticket.ts` | `HelpdeskTicketDto` — the wire ticket, `sub_category` spelling is load-bearing | +1 nullable ISO field (**D5**) | `.strict()`; `sub_category`'s spelling (a prior drift bug); the subject-XOR superRefine |
| `packages/contracts/src/member-data-rights/member-data-rights.ts` | The 10.21 wire contracts + the two SHARED tokens | **DELETE** `member_requested_staff_mediation` (`:184`) | `DPDPA_DATA_RIGHTS_SUBCATEGORY` + `DATA_RIGHTS_STEP_UP_CONTEXT` staying declared **exactly here**; element 2 never being caller-supplied |
| `apps/api/src/modules/helpdesk/handlers.ts` | The 10.1/10.3 create+route primitive; ADR-0030 compensating audit; operator attribution server-resolved | Thread the field; digest it; **D5** DTO mapping | `withCompensatingAudit` (⛔ not a bare `writeAuditEntry`); the `AdminDisplayNameMissingError` fail-closed; `void reply.status(201)` then `return` ([[project_fastify_onsend_doublesend]]) |
| `apps/api/src/modules/helpdesk/member-handlers.ts` | The 10.2 member route: Turnstile → Idempotency claim → multipart → routing → SLA → storage → persist | Parse + thread the field | The gate ORDER (both header gates before multipart); the idempotency claim/replay/release; best-effort orphan cleanup of `putKeys` |
| `apps/api/src/modules/member-data-rights/handlers.ts` | The 10.21 fulfilment routes; `grantStaffMediatedDelivery` at `:787-937` | `requireTicketInScope` returns the row; read element 1; AC5 refusal; AC4 instant; digest | The RTBF advisory lock; the `off_portal_admin`-only 404; the `ready` guard; element 2's server observation; `expireStaleGrantForExport`; the `isUniqueViolation` → 409; the `finally` idempotency release |
| `apps/admin/src/api/client.ts` | Typed fetch wrappers; the staff-mediated body at `:716-726` | Delete the field + rewrite `:701-703` | Every other body shape; `Idempotency-Key` on all four mutating calls |
| `apps/admin/src/modules/helpdesk/HelpdeskDetailShell.tsx` | The responder detail + the collapsed data-rights fallback `<details>` (`:250-285`) | **D5** disabled-state + copy | ⛔ The **subordinate** presentation of the fallback (`116` cl.2 — collapsed by default, primary prominent); the attestation textarea |
| `apps/admin/src/modules/helpdesk/HelpdeskOperatorShell.tsx` | The 10.3 intake form; appends the DPDPA token client-side at `:82-94` | +1 checkbox (**D2**) | The `canSubmit` gate incl. "category still in the in-force policy"; the subcategory picker's `subCategories.length > 0` guard |
| `apps/mobile/app/(helpdesk)/new.tsx` | The member filing form; MMKV draft; per-instance idempotency key | Token append + checkbox + FormData field + draft key (**D2**) | The once-per-instance `idempotencyKey` (⛔ never regenerated on retry); the contracts-sourced limits; `canSubmit` |
| `packages/contracts/tests/member-data-rights-single-literal.test.ts` | The source-scan gate for the DPDPA + step-up tokens | +`apps/mobile` in `SCAN_ROOTS` | The self-reference defence (needle read from the import; this file excluded by name) — ⛔ never hardcode the literal |

### Reuse — do **NOT** reinvent

- **`requireTicketInScope` already loads the ticket row** (`member-data-rights/handlers.ts:252-259`) and throws
  it away. Return it. ⛔ Do not add a second `getTicketById` call in `grantStaffMediatedDelivery`.
- **`helpdesk.getTicketById`** returns the full `HelpdeskTicketRow` — a new column flows through with no
  accessor change.
- **The client-side DPDPA subcategory append** already exists at `HelpdeskOperatorShell.tsx:82-94`, comment and
  all. Copy the mechanism into mobile; ⛔ do not invent a second approach and ⛔ do not re-declare the literal.
- **`seedSubject`** (`delivery-and-correction.spec.ts:173-232`) already files the originating ticket through the
  **real** create route with the imported token. Extend it with an option; ⛔ do not hand-insert a ticket row.
- **`primaryTriedAndLapsed`** (`:248-275`) is the only honest way to make element 2 true — it drives the real
  member-direct route and ages only the OTP. ⛔ Do not hand-insert an OTP row; that is the exact fixture the
  round-2 review deleted.
- **`ConflictError` / `NotFoundError`** from `apps/api/src/http-errors.js` with a dotted code — the house typed-error
  shape. ⛔ No bare `throw new Error`.
- **`piiColumn` / `encTier1`** — untouched here, but the reason matters: element 3 is Tier-1 and withheld.

### Anti-patterns this story is specifically exposed to

1. **A read added beside the boolean** (Trap 1). The sweep in Task 7 is the check.
2. **`expect(...).not.toBeNull()` as the AC6 proof** (Trap 2). It was already true before this story.
3. **"While I was in there" edits to element 2 or 3** (AC7). Both were confirmed correct 2026-08-15; a
   drive-by change re-opens a ruled question.
4. **Weakening migration 0104's CHECK** because the app now checks earlier (Trap 3). It gates a PII-disclosure
   path; the app read **feeds** it.
5. **Adding a routing rule / a category / a `DEFAULT_ROUTING_POLICY` edit** so the subcategory appears in the
   picker (Trap 4). It mis-routes silently and trips the golden-hash fence, whose own suggested remedy is part
   of the trap ([[project_helpdesk_default_policy_version_trap]]).
6. **Re-declaring `DPDPA_DATA_RIGHTS_SUBCATEGORY`** in mobile. A typo routes just as cleanly, produces no
   error, and is invisible in the queue — and today's scan roots would not catch it (Task 6).
7. **A client-supplied timestamp.** The wire carries a boolean; the **server** stamps the instant. A
   client-settable `..._at` re-creates AC4's defect with a new author.
8. **Domain-camelCase vs contracts-snake_case drift** across the new field's five hops
   ([[feedback_story_validate_footguns]]).
9. **A type-only import becoming a value import** when threading the field through packages
   ([[project_type_only_import_cycle_trap]]) — typecheck and lint stay green while consumers break at runtime.
10. **Editing the minted AC text** to match what was built. Supersede; never re-read
    ([[feedback_supersede_never_reinterpret]]).

### Testing standards

- **Live DB** at `twt-test-pg`:5433 ([[project_live_db_test_gotchas]]). ⛔ Never `DROP SCHEMA`; ⛔ never
  regenerate an applied migration; assert **membership, not counts**, against own-committing writers.
- The delivery spec deliberately **does not delete helpdesk tickets** in teardown (`:88-91`) — they carry
  hash-chained audit entries. Keep that posture.
- ⛔ Do not export `DATABASE_URL` globally ([[project_ci_local_double_run_pollution]]).
- **Revert-sanity is mandatory twice** (Task 6's gate, Task 8's AC4 assertion). Record the RED output; a test
  that cannot be made to fail proves nothing.
- The **en/hi parity gate** is a real blocker for `helpdesk` (member-facing namespace).
- ⚠ **A named test must actually assert what the task claims** ([[feedback_spec_edits_must_propagate_to_tasks]])
  — 10.21's round-2 review found nine checked boxes whose tests did not exist.

### Previous-story intelligence

**From Story 10.21 (`done`, the direct parent — its review is why this story exists):**
- Five review findings needed Panel rulings; the ones that mattered were **claimed protections that did not
  exist** (an inert `23505` catch, an inert `ON DELETE CASCADE` comment, a vacuous `pii-scrape` gate). This
  story's whole subject is a sixth. ⛔ Write assertions that can fail.
- **Escalation 12 was raised and then WITHDRAWN on evidence** (`2026-08-15-119`) because reachability was
  assumed rather than traced ([[feedback_trace_reachability_before_escalating]]). Before escalating anything
  here, trace it: creation path + DB constraint, not the type.
- The round-2 review found a fixture that **hand-inserted an OTP row**, making the gate look proven when it was
  not. The replacement drives the real route. ⛔ Do not regress it (Task 8).
- `2026-08-15-117` cl.7 added the **`off_portal_admin`-only** guard to the staff-mediated route. It is recent,
  correct, and easy to break while refactoring the same handler.

**From Story 10.28 (`done`, the numerically-previous story):**
- Task 1 was a `governance:`-prefixed decision-log commit touching **zero** `packages/`/`apps/` files, landing
  **before** implementation. Same shape here (Task 1).
- Its AC3 lesson: prove **PRESENCE**, not absence-of-error, when the failure mode is silent. AC6's polarity
  pair is the same instrument.
- Its review found a **stale doc comment two lines below a correctly-updated interface** — the "stale reason
  left behind" class. This story rewrites four doc-comments that currently assert the reading `116` rejected
  (Task 7); ⛔ leaving any of them is the same defect.

### Git intelligence (last 5 commits)

```
7f5470d governance(10.29): mint the Escalation 11 successor — Member-Authored Staff-Mediation Request  ← BASELINE
4c366f7 Merge pull request #189 from ulanzi1/governance/10-21-off-portal-dpdpa-access                   ← origin/main
5245cca governance(10.21): Decision 2026-08-15-119 — Escalation 12 WITHDRAWN on evidence; the 409 reclassified
15ffbe8 story(10.21): round-2 review closed — 28 patches checked off, Status → done, sprint status synced
c5c10f4 story(10.21): round-2 review — the tests nine checked boxes claimed but did not exist
```

The pattern is unambiguous and this story follows it: **`governance:` first, `story:` after**; rulings recorded
in `.decision-log.md` before the code they authorise; ⛔ never a decision edited in place.

### Library / framework context — ⛔ NO NEW DEPENDENCIES

This story adds **zero** packages. Everything it needs is already pinned, and the pins matter:

- **`zod ^3.23.0`** (`packages/contracts/package.json:21`) — ⛔ **v3, not v4.** Use `z.boolean()`,
  `z.string().datetime({ offset: true })` and `.strict()` as the surrounding code does. ⛔ Do **not** reach for
  v4-only idioms (`z.iso.datetime()`, top-level `z.strictObject`) — they do not exist on this pin and the
  failure is a confusing type error, not a clean one.
- **`drizzle-orm ^0.45.0`** (`packages/domain/package.json:22`) — `timestamp(..., { withTimezone: true, mode: 'date' })`
  is the house column shape; `mode: 'date'` is what makes the value a JS `Date` in the read path, which AC4's
  equality assertion depends on. ⛔ Migrations are **hand-authored** here; `drizzle-kit generate` is not the
  workflow (the snapshots stop at `0020`).
- **`fastify ^5.8.0`** (`apps/api/package.json:38`) — set the status then **return** the value; ⛔ never chain
  `void reply.status(N).send()` inside an async handler ([[project_fastify_onsend_doublesend]]).
- **Mobile**: Expo + Tamagui + React Query as already used by `new.tsx`; the checkbox uses whatever the
  surrounding form already uses. ⛔ Do not add a UI library for one control.

### Project Structure Notes

- **Sweep at `7f5470d`: `grep -rn "10\.29\|10-29" apps packages` → ZERO hits.** Nothing in the tree points at
  this story yet; the pointers this story creates are the ones it must later discharge.
- The five hops the new field crosses — contracts (snake_case wire) → api handler → domain projector input
  (camelCase) → genesis payload (snake_case JSONB) → column (snake_case) — are the documented naming
  discipline (architecture L3663-3677). ⛔ Each hop is a drift opportunity.
- `packages/contracts` must **never** import `@twt/domain`'s pg-touching namespaces
  ([[project_contracts_domain_bundle_boundary]]) — the mobile Metro bundle. Importing
  `DPDPA_DATA_RIGHTS_SUBCATEGORY` from `@twt/contracts` **into** mobile is fine and is the prescribed direction.
- Migration numbering: `0106` is next; hand-authored; `_journal.json` appended by hand.

### References

- `_bmad-output/planning-artifacts/epics.md:4248-4322` — the minted section + the 7 ACs.
- `.decision-log.md:240` — `2026-08-15-116` (the ruling; option (c), no conditions).
- `.decision-log.md:327` — `2026-08-15-115` (the defect: cl.3 the timestamp, cl.4 the unevidenced defence).
- `.decision-log.md:445` — `2026-08-14-113` (the three-part gate; cl.2 the mandated terminology).
- `.decision-log.md:651` — `2026-08-14-111` cl.3 (two facts, different authors — the warning).
- `.decision-log.md:188` — `2026-08-15-117` cl.3 (element 2's scope; ⛔ out of scope here).
- `docs/knowledge-transfer/trustee-consent-sheet-2026-08-15-story-10-21-escalation-11.md` — options (a)–(d),
  their costs, and the session resolution (DR + KB, 2026-08-15).
- `_bmad-output/implementation-artifacts/deferred-work.md:4741-4770` — the owed-mint trail, discharged by
  `7f5470d`; the **work** item Task 1 closes.
- `packages/domain/migrations/0104_data-rights-delivery-and-correction.sql:38,64-72` — the column + the CHECK.
- `packages/domain/src/helpdesk/registry.ts:51-64` — `DEFAULT_ROUTING_POLICY`, byte-frozen.

### Review Findings

_From the 3-layer adversarial code review (Blind Hunter / Edge Case Hunter / Acceptance Auditor), 2026-08-15. All items independently verified against the working tree before being recorded here — none taken on a subagent's word alone._

- [x] [Review][Patch] Cross-member ticket authorization gap in `grantStaffMediatedDelivery` — element 1 is read off ANY ticket in the pariwar, not the requesting member's own ticket [apps/api/src/modules/member-data-rights/handlers.ts:839,854] — fixed: `memberRequestRecordedAt` now folds a `ticketRow.subjectMemberId !== memberId` mismatch into the same "not captured" 409; regression test added (`delivery-and-correction.spec.ts`, CROSS-MEMBER case), full spec green (28 tests).
- [x] [Review][Patch] Admin operator checkbox doesn't reset on category/sub-category change, letting a stale `true` ride onto an unrelated ticket [apps/admin/src/modules/helpdesk/HelpdeskOperatorPage.tsx:124-127] — fixed: subcategory-change handler now clears the flag whenever the new subcategory isn't the DPDPA token (also covers category changes, which force a subcategory reset); `@twt/admin` suite green (310 tests).
- [x] [Review][Patch] `SCAN_ROOTS` in the single-literal gate omits `apps/mobile/tests`, the exact blind spot the gate's own comment warns against [packages/contracts/tests/member-data-rights-single-literal.test.ts:57-58] — fixed: root added; `@twt/contracts` suite green (891 tests).
- [x] [Review][Patch] D2's mobile checkbox + reset-on-category-change behavior has zero test coverage at any level [apps/mobile/app/(helpdesk)/new.tsx] — fixed: source-scan fence added to `helpdesk-screens-render.test.ts` (matching this harness's pure-Vitest, no-RTL convention), proving both reset paths + the boolean-gated wire send; `@twt/mobile` suite green (262 tests).
- [x] [Review][Patch] D5's admin responder disabled-fallback-button + explanatory-line behavior has zero test coverage [apps/admin/src/modules/helpdesk/HelpdeskDetailShell.tsx] — fixed: two RTL tests added to `helpdesk-responder-console.test.tsx` covering both the null and captured states; `@twt/admin` suite green (310 tests).
- [x] [Review][Defer] Operator create-ticket route (Story 10.3) has no Idempotency-Key protection, unlike the member route — a retried/duplicated create can now diverge on `member_staff_mediation_requested_at` [apps/api/src/modules/helpdesk/handlers.ts:212-303] — deferred, pre-existing (predates this story; baseline at `7f5470d` already lacked it)
- [x] [Review][Defer] New nullable `member_staff_mediation_requested_at` column has no index; harmless today since every read is a single-row lookup by ticket id, but would matter for a future "outstanding staff-mediation requests" list view [packages/domain/migrations/0106_helpdesk-member-staff-mediation-request.sql] — deferred, pre-existing pattern (no current query needs it)

**Dismissed as noise (5):** `HelpdeskTicketDto` "member-facing scope creep" claim (verified false — `HelpdeskTicketDto` is the operator/create-route response shape; the member-facing DTOs in `packages/contracts/src/helpdesk/member.ts` do not declare the field); audit-digest reshape "hash-chain discontinuity" (no mechanism re-verifies historical digests against current code — it's a write-once fingerprint, not a chain); near-identical wire field names (`member_staff_mediation_requested_at` / `member_requested_staff_mediated_delivery` / the deleted `member_requested_staff_mediation`) flagged as a typo hazard (the distinct name is a deliberate D1 ruling, not an oversight); untested malformed-truthy multipart strings (`'True'`, `'1'`) (already fail-closed by explicit design — anything not the literal string `'true'` is `false`); unconfirmed `finally`/idempotency-release claim on the new 409 path (verified correct by direct read — `handlers.ts:980-982`).

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-08-15.

### Debug Log References

#### Task 0 — baselines, taken BEFORE any edit (real local runs)

| Suite | Baseline | After |
|---|---|---|
| `pnpm --filter @twt/contracts test` | 55 files / **891** | 55 files / **891** |
| `pnpm --filter @twt/domain test tests/helpdesk/` | 7 files / **89** | 7 files / **95** (+6) |
| `delivery-and-correction.spec.ts` (live DB) | 1 file / **23** | 1 file / **27** (+4) |
| `apps/api/tests/integration/helpdesk/` (live DB) | 4 files / **29** | 4 files / **29** |
| `…/rls/data-rights-delivery-and-correction-policy-regression.spec.ts` | 1 file / **17** | 1 file / **17**, byte-unchanged |

#### Task 0 — line-anchor re-derivation: **ZERO DRIFT**

Every anchor cited in this story was re-derived against the working tree at `7f5470d` and matched
exactly: contract `:184`; admin client `:701`/`:722`; `requireTicketInScope` `:252-259`; the audit digest
`:803`; `memberRequestRecordedAt: now` `:902`; `DEFAULT_ROUTING_POLICY` `registry.ts:51-64`;
`HelpdeskOperatorShell.tsx:82-94`; `SCAN_ROOTS` `:43-52`; `member-handlers.ts:184` (`fields: 12`),
`:347-353`, `:448-476`; `member.ts:61-73`; `events/registry.ts:539-541`; `seedSubject` `:173`;
`primaryTriedAndLapsed` `:248`; the `not.toBeNull()` at `:394`. The `_journal.json` cadence check also
held: `0105.when = 1789789200000`, `+86400000 = 1789875600000` — exactly the value the story prescribes.

⚠ **ONE DRIFT FOUND, in the story's own prose, not in the tree** — recorded rather than silently worked
around. **D5 states** that `member_staff_mediation_requested_at` should go on `HelpdeskTicketDto`
*"(which `HelpdeskAdminTicketDetailResponse` extends)"*. It does **not**: `admin.ts:116` shows
`HelpdeskAdminTicketDetailResponse = HelpdeskQueueItem.extend({…})`. Adding the field to the DTO alone
would therefore **never have reached the operator surface D5 exists to serve**. Resolved by declaring it
on **both** — the DTO (where D5 names it) and the admin detail response (where the console actually reads
it) — with a comment on each recording why the duplication is deliberate. ⛔ No ruled decision is
re-opened by this; D5's *intent* is met exactly.

#### Revert-sanity #1 (Task 6) — the SCAN_ROOTS extension has teeth

Temporarily re-declared the literal in `apps/mobile/app/(helpdesk)/new.tsx`. **RED, real output:**

```
AssertionError: 'dpdpa-data-rights' must be a literal in exactly ONE module
(packages/contracts/src/member-data-rights/member-data-rights.ts).
Found in: apps/mobile/app/(helpdesk)/new.tsx, packages/contracts/src/member-data-rights/member-data-rights.ts.
  Array [
+   "apps/mobile/app/(helpdesk)/new.tsx",
    "packages/contracts/src/member-data-rights/member-data-rights.ts",
  ]
 Tests  1 failed | 2 passed (3)
```

Reverted → **3 passed (3)**. The new root names the mobile file explicitly; it is not a decorative entry.

#### Revert-sanity #2 (Task 8, AC4) — the equality assertion has teeth

Restored the defect `memberRequestRecordedAt: now` in `grantStaffMediatedDelivery`. **RED, real output:**

```
× ⭐ AC6 (b) + AC4 — PERMITTED when the ticket records the request, and the grant carries the MEMBER's instant
  → the grant must carry the TICKET's instant — not a `now` minted when staff submitted:
    expected 1786799586393 to be 1786799586367
× ⭐ AC2 — a ticket filed through the MEMBER app (10.2, multipart) is equally sufficient
  → expected 1786799586494 to be 1786799586466
 Tests  2 failed | 25 passed (27)
```

Restored → **27 passed (27)**. The ~26ms delta is exactly the gap between ticket intake and staff submit.

⚠ **A CORRECTION I MADE TO MY OWN TEST COMMENT, because revert-sanity disproved it.** I had written that
the *strictly-earlier-than-`created_at`* assertion would also catch the defect. **It does not**: under
`memberRequestRecordedAt: now` the handler's clock still precedes the DB's insert-time `created_at`, so
that assertion stayed green. **The EQUALITY assertion is the sole discriminator.** The comment now says
so, and warns against "simplifying" to the ordering check alone.

#### RED-first evidence for the read path itself (AC3/AC5)

After deleting the boolean and wiring the read — but **before** seeding any ticket with the capture — the
existing suite went red in exactly the four places that reach a real staff-mediated grant:

```
× element 2 fails closed        → expected 'member_data_rights.member_request_not_captured'
                                   to be 'member_data_rights.primary_delivery_not_completed_required'
× records all three elements    → expected 409 to be 200
× lazy-expire-on-read           → expected 409 to be 200
× staff-mediated not redeemable → expected 400 to be 404
 Tests  4 failed | 19 passed (23)
```

⭐ **That refusal is the feature.** Those four were then given `{ memberRequestedStaffMediation: true }`,
which restored 23/23 — the capture is the only thing that opens the route.

#### Trap 1 — THE SWEEP (AC3's deletion is a deletion)

```
$ grep -rn "member_requested_staff_mediation" apps packages   # (build output excluded)
── hits: 0 ──

$ grep -rIl "member_requested_staff_mediation" apps packages --exclude-dir=node_modules
✅ ZERO — even compiled output no longer carries it
```

⚠ Five of the residual hits during implementation were **my own new prose** (doc-comments and the
migration header referring to the deleted field by name) plus one test using it as a `.strict()` unknown
key. All were reworded/renamed, because Trap 1's check is a literal tree-wide grep and a comment defeats
it exactly as a live field would.

#### Task 9 — AC7 evidence: elements 2 and 3 untouched

```
$ git diff --stat packages/domain/src/data-export/delivery.ts
✅ UNCHANGED — no diff at all (primaryDeliveryNotCompletedAt untouched)

$ git diff apps/api/src/modules/member-data-rights/handlers.ts \
    | grep -E '^[+-].*(encTier1|attestationCiphertext|primaryDeliveryNotCompletedAt|primary_delivery_not_completed)'
✅ ZERO +/- lines
```

Also verified **unmodified and green**: `delivery-terminology-gate.test.ts` (6), `default-policy-hash.test.ts`
(2), `registry.ts` (`DEFAULT_ROUTING_POLICY` byte-identical), migration `0104` and the RLS regression spec
(both byte-unchanged, 17 green).

#### Task 10 — verification (all real local runs)

| Command | Result |
|---|---|
| `pnpm ci:local` | ✅ **PASSED — 30 jobs green** (integration-tests SKIP by design: no global `DATABASE_URL`) |
| `pnpm --filter @twt/domain test` (single-pass, inline `DATABASE_URL`) | ✅ 242 files / **2802 passed, 1 skipped** |
| `pnpm --filter @twt/api test` (single-pass, inline `DATABASE_URL`) | ✅ 116 files / **984 passed, 1 skipped** |
| `pnpm --filter @twt/contracts test` | ✅ 55 / **891** |
| `pnpm --filter @twt/admin test` | ✅ 31 / **308** |
| `pnpm --filter @twt/mobile test` | ✅ 25 / **259** |
| `pnpm --filter @twt/i18n test` | ✅ 9 / **57** (en/hi parity green) |
| `lint` — domain, contracts, events, api, admin, mobile, i18n | ✅ all clean |

⚠ **RECORDED UN-ATTESTED, NOT RECONSTRUCTED** ([[feedback_record_unattested_no_backfill]]): the **first**
`pnpm ci:local` run failed its `test (unit)` job. **I did not capture which package failed** — the output
was filtered before I saw it, and I will not reconstruct it. The two subsequent full `ci:local` runs were
green, and every touched package's suite passes **in isolation** (table above). This matches the known
unbounded-`turbo run test` oversubscription flake ([[project_ci_local_concurrency_oversubscription]]) — but
⛔ that is a *consistent* explanation, not a proven one, and it is logged here as such.

⛔ `DATABASE_URL` was never exported globally; every live-DB run was a single-pass inline invocation
([[project_ci_local_double_run_pollution]]).

### Completion Notes List

**What landed, against what the ruling actually asked for.**

- **AC1 — the capture is STRUCTURED and at INTAKE.** New nullable `timestamptz`
  `helpdesk_tickets.member_staff_mediation_requested_at` (hand-authored migration `0106`, `_journal.json`
  appended by hand at the `+86400000` cadence; ⛔ no `drizzle-kit generate` — the snapshots stop at `0020`).
  Written **only** by `projectTicketGenesis`, from the **server's** clock, and mirrored into the
  `helpdesk.ticket_created` genesis payload as **present-and-nullable** (⛔ not `.optional()`, so a
  pre-10.29 genesis stays distinguishable from "the member did not ask"). ⛔ No DEFAULT, no NOT NULL, no
  backfill — a NULL on an existing ticket is a **true fact**, not a data gap.
- **AC2 — both intake paths.** The operator route (`CreateTicketRequest`) and the member route
  (`MemberCreateTicketRequest`, multipart) both accept
  `member_requested_staff_mediated_delivery: z.boolean().optional()`. The multipart value arrives as a
  **string** and is normalized explicitly with the same `''`-means-absent rule `sub_category` uses;
  anything that is not literally `'true'` is false.
- **AC3 — the READ, and the DELETION.** `requireTicketInScope` now **returns** the row it was already
  loading and discarding (⛔ no second `getTicketById`), and `grantStaffMediatedDelivery` reads element 1
  from it. The caller-supplied literal is **gone** from the contract, the admin client and the audit
  digest; the OpenAPI component was re-emitted and confirmed to have dropped it. The sweep returns **zero**.
- **AC4 — the member's instant.** `memberRequestRecordedAt: now` → the ticket's captured instant. Proven by
  **equality with the ticket's column** plus strict ordering against the grant's `created_at` — and the
  equality assertion is demonstrably the one that catches the defect (revert-sanity #2).
- **AC5 — fails closed at BOTH layers.** `409 member_data_rights.member_request_not_captured`, thrown after
  the ticket is resolved in scope and **before** any write; a `SELECT` filtered by channel proves zero
  `staff_mediated` rows survive the refusal, and the `finally` releases the idempotency key so a legitimate
  retry is not locked out. Migration `0104`'s CHECK and its regression spec are **byte-frozen** and green —
  the app read **feeds** the backstop, it does not replace it.
- **AC6 — the polarity pair.** Two arms, same route, same operator, same export, **both** driven through
  `primaryTriedAndLapsed` so element 2 is genuinely true in both: refused without the capture, permitted
  with it. Plus a **member-app arm** filing through the real 10.2 multipart route (Turnstile +
  Idempotency-Key on headers), and its **converse** — an unticked box records NULL and is refused — which
  is what stops a permissive multipart parse from passing the positive arm while manufacturing element 1.
- **AC7 — elements 2 and 3 untouched**, with `git diff` evidence above.

**Decisions implemented as ruled (D1–D6), logged as `Decision 2026-08-15-120` in a `governance:` commit
that landed FIRST and touched zero `packages/`/`apps/` files.** `deferred-work.md`'s Escalation-11
successor item is marked **"Closed by [implementation]"** — ⛔ not "Resolved via deferral" — and the entry
is kept as the trail from escalation → ruling → mint → implementation.

**D6's limit is stated, not papered over.** On `created_via: 'helpline_call'` the field is
**operator-transcribed**. It buys a separate act at a separate instant, an immutable genesis record, and
the delivery caller's **total inability to manufacture element 1** — ⛔ it does **not** prove the member
spoke, and no copy, comment, decision-log clause or audit line here claims that it does. The admin
checkbox copy says *"The caller asked us to…"* deliberately, and never implies verification.

**Traps, each explicitly discharged:** (1) the sweep returns zero; (2) AC6 is a polarity pair, not a
non-null assertion; (3) `0104` and its regression spec are byte-frozen; (4) no category minted,
`DEFAULT_ROUTING_POLICY` byte-identical, the token imported client-side in mobile exactly as the operator
console does; (5) one branch, one commit series, no flag, no intermediate red state — the deletion and the
read path land together.

**Follow-ups NOT taken (correctly out of scope):** `attempts = 0` on element 2's OTP predicate stays open
(an untouched 10.21 review item); the member-facing ticket-detail DTO deliberately does not gain the field
(D5); no `trustee_panel` grant for `member.data_rights` (`2026-08-14-109` cl.7 is settled).

### File List

**Added**
- `packages/domain/migrations/0106_helpdesk-member-staff-mediation-request.sql`

**Modified — domain**
- `packages/domain/src/schema/helpdesk_tickets.ts`
- `packages/domain/src/helpdesk/events.ts`
- `packages/domain/src/helpdesk/project.ts`
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/tests/helpdesk/events.test.ts`
- `packages/domain/tests/integration/helpdesk/projector-trigger.spec.ts`
- `packages/domain/tests/integration/helpdesk/read.spec.ts`

**Modified — contracts / events / openapi**
- `packages/contracts/src/helpdesk/create-ticket.ts`
- `packages/contracts/src/helpdesk/member.ts`
- `packages/contracts/src/helpdesk/ticket.ts`
- `packages/contracts/src/helpdesk/admin.ts`
- `packages/contracts/src/member-data-rights/member-data-rights.ts`
- `packages/contracts/tests/helpdesk.test.ts`
- `packages/contracts/tests/member-data-rights-single-literal.test.ts`
- `packages/events/src/registry.ts`
- `openapi/v1.yaml`

**Modified — api**
- `apps/api/src/modules/helpdesk/handlers.ts`
- `apps/api/src/modules/helpdesk/member-handlers.ts`
- `apps/api/src/modules/member-data-rights/handlers.ts`
- `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`

**Modified — admin**
- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/helpdesk/HelpdeskOperatorPage.tsx`
- `apps/admin/src/modules/helpdesk/HelpdeskOperatorShell.tsx`
- `apps/admin/src/modules/helpdesk/HelpdeskDetailShell.tsx`
- `apps/admin/src/modules/helpdesk/i18n-en.ts`
- `apps/admin/tests/helpdesk-operator-console.test.tsx`
- `apps/admin/tests/helpdesk-responder-console.test.tsx`

**Modified — mobile / i18n**
- `apps/mobile/app/(helpdesk)/new.tsx`
- `apps/mobile/lib/helpdesk-draft.ts`
- `packages/i18n/locales/en/helpdesk.json`
- `packages/i18n/locales/hi/helpdesk.json`

**Modified — governance (committed FIRST, separately)**
- `.decision-log.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`

**Modified — story bookkeeping**
- `_bmad-output/implementation-artifacts/10-29-member-authored-staff-mediation-request.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Change |
|---|---|
| 2026-08-15 | `governance(10.29)`: **Decision `2026-08-15-120`** appended to `.decision-log.md` carrying D1–D6 with per-clause provenance and D6's stated limit; `deferred-work.md`'s Escalation-11 successor marked **Closed by [implementation]**. ⛔ Zero `packages/`/`apps/` files — governance precedes implementation. |
| 2026-08-15 | `story(10.29)`: element 1 of the ratified three-part gate becomes **member-authored**. Migration `0106` + `helpdesk_tickets.member_staff_mediation_requested_at`, captured at genesis on **both** intake routes and mirrored into the `helpdesk.ticket_created` payload; `grantStaffMediatedDelivery` **reads** it, refuses `409 member_request_not_captured` before any write, and records the **member's** instant. The caller-supplied `z.literal(true)` is **DELETED** from the contract, the admin client, the audit digest and the emitted OpenAPI — tree-wide sweep returns zero. Operator + member surfaces capture it under the DPDPA subcategory (imported token, presentational coupling only); the responder console explains a refusal at the control. Single-literal gate extended to `apps/mobile`. All 7 ACs satisfied; two mandatory revert-sanity checks recorded RED with real output. |
