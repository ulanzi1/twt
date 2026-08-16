---
baseline_commit: 9fb88c318eed9e22614f16ffd86aa964d65f3ebd
---

# Story 10.13: Fixed-Amount Setter Admin UI `[SURFACE]`

Status: ready-for-dev

Epic: 10 · Story: 13 · Key: `10-13-fixed-amount-setter-admin-ui`
Authored: 2026-08-16 · Baseline: `main` @ `9fb88c3` (clean, fetched, `== origin/main`)

---

> ⛔ **THE SURFACE THIS STORY IS NAMED AFTER ALREADY EXISTS. DO NOT BUILD IT AGAIN.**
> Story 7.5 shipped the whole three-route stack — domain (`packages/domain/src/pool/fixed-amount.ts`),
> contracts (`packages/contracts/src/pools/fixed-amount.ts`), API
> (`apps/api/src/modules/pool-fixed-amount/`), **and the admin page**
> (`apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx`, 372 lines, routed at
> `/p/$pariwarId/pool-fixed-amount` — `apps/admin/src/router.tsx:199-203`). Read all four before
> planning. Every literal clause of `epics.md:3813-3815` — propose with a ≥365-day `effective_from`,
> emergency override with attestations, current value, audit trail, scope-respecting — is **already
> satisfied**, with **one exception** named in AC4.
>
> ⛔ **WHAT IS ACTUALLY OPEN IS THE INHERITED OBLIGATION, AND IT IS A GOVERNANCE QUESTION FIRST.**
> `epics.md:3817-3834` + `fixed-amount.ts:75-88` + `deferred-work.md:4461-4470` all point here for one
> answer: *who may sit on the emergency attesting panel*. The mechanical floor
> (`POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2`) can count attestors; nothing in the tree can enumerate
> **eligible** ones. Today the panel is a free-text textarea of raw UUIDs
> (`FixedAmountPage.tsx:247-257`) and the server validates **only that each id resolves to a
> display name in the GLOBAL `users` table** (`handlers.ts:250-269` → `admin-auth.repo.ts:186-193`,
> a bare `SELECT display_name FROM users WHERE id = $1` with **no tenant and no role predicate**).
> `users` is documented GLOBAL, not Pariwar-scoped (`packages/domain/src/schema/users.ts:1-15`).
> ⇒ **any admin in any Pariwar can today be recorded as an attesting State-Trustee on this Pariwar's
> immutable Emergency Adjustment Record.** That is the gap, stated without euphemism.
>
> ⛔ **THE GOVERNING INSTRUMENTS ALREADY ANSWER "WHO", AND THE CODE DOES NOT MATCH THEM.**
> Trust Deed **Clause 10(b)** (`trust-deed.md:147`): *"a fixed per-Pool amount determined by the
> **Board**"*. **Clause 20(c)** (`:241`): *"open Pools, **fix per-Pool amounts**"*. Niyamavali **§4.2**
> (`niyamavali.md:102`, hi `:100`): *"set by the **Board** for stated periods of not less than 12
> months"*. The shipped route gates on `pool.fixed_amount_set` / `pool.fixed_amount_emergency`, held by
> **`pariwar_admin` alone** (+ `super_admin` by derivation) — `roles.ts:317-325`. A `pariwar_admin` is
> not the Board. This is the **same defect shape Story 10.18 existed to end**: *"before this role
> existed there was no way to distinguish a Panel act from a `pariwar_admin` act"* (`roles.ts:601-605`).
> ⇒ **Task 1 is a Trustee Panel routing note, and no code is written until it is ruled**
> ([[feedback_governance_commits_precede_implementation]]).
>
> ⛔ **DO NOT INVENT A "TRUSTEE DIRECTORY" PRIMITIVE.** The repo already has the eligibility pattern in
> two places — `assertPanelAuthorized` (`r9-voting-persist.ts:314-350`, `appeal-panel-persist.ts:247-274`)
> — and the *directory read* pattern in a third (`resolveShepherdCandidates`,
> `shepherd-assign-persist.ts:190-249`). Compose those. No new table, no new registry, no new
> `trustee_directory` anything.
>
> ⛔ **`POOL_FIXED_AMOUNT_MIN_PANEL_SIZE` DOES NOT CHANGE.** `epics.md:3830-3831` and
> `deferred-work.md:4469-4470` both state it: *"it is the floor, not the directory."* Story 1.18 changed
> no value here and neither does this one. See AC1/Q3 for the Deed-quorum question it raises — the
> question is routed, the constant is not touched.

**Depends on:** Story 7.5 (`done`) — the entire fixed-amount stack this story extends; Story 1.8
(`done`) — `role_grants` + `hasPermission`; Story 1.9 (`done`) — `openScopeTx` / `ScopeTx`;
Story 6.14 (`done`) — `assertPanelAuthorized`, the panel-eligibility precedent; Story 6.12 (`done`) —
`resolveShepherdCandidates`, the directory-read precedent; Story 10.18 (`done`) — the `trustee_panel`
role, which is what makes Q1 answerable at all; Story 10.11 (`done`) — the Trustee-Lite worklist
(context only; **not** a host for this surface, see *Out of scope*).

**Gates this discharges:** `packages/domain/src/pool/fixed-amount.ts:75-88` (the trustee-directory half
of the compound marker), `deferred-work.md:4461-4470`, `deferred-work.md:1847`, and the obligation
recorded in `epics.md:3817-3834`.

---

## Story

As a Trustee Panel member applying the Board's Deed Clause 10(b) power to fix the per-Pool contribution,
I want the setter surface to know who is eligible to attest an emergency adjustment — and to refuse
anyone who is not,
so that the immutable Emergency Adjustment Record records an authority the governing instruments
actually confer, rather than whatever UUIDs were pasted into a textarea.

---

## What this story is, in one paragraph

Story 7.5 built a complete, correct, well-tested fixed-amount schedule and shipped a working trustee
surface for it. It left exactly one thing unanswerable: the emergency override demands a *State-Trustee
attesting panel*, and there was no way to say who that is. Every guard on that panel is arithmetic —
non-empty, ≥ 2, no duplicates — and the one identity check that exists resolves display names out of a
**global** table. This story supplies the missing predicate: **an attesting panel member is an actor who
holds the emergency key at this Pariwar**, enforced server-side inside the scope transaction with a
typed, audited refusal, and offered to the trustee as a *picker* instead of a textarea. It is a small
build sitting on top of a governance ruling that is larger than the build: the Deed vests the
amount-fixing power in the **Board**, the code vests it in `pariwar_admin`, and only the Trustee Panel
can say whether that divergence is closed, recorded, or deliberate.

---

## ⛔ The governance half lands first

`git log` must read **governance → implementation**, with the implementation work cut from the ruling
commit. This is the 10.18 / 10.20 / 10.22 ritual, unchanged:

1. `governance:`-prefixed commit — `trustee-panel-routing-note-2026-08-16-story-10-13.md`, authored,
   status `⏳ Open`.
2. Panel ruling recorded — a **single** `.decision-log.md` entry, numbered from the current head
   `2026-08-16-122` (verified live: `.decision-log.md:37`; the file carries **123** numbered entries).
   Per Decision `2026-08-09-095` the entry **must label per-clause provenance** — `[Trustee-ratified]`
   vs `[Author-committed]` vs author finding.
3. ⚠ **If — and only if — the ruling amends Niyamavali §4.2**, the amended text must be reproduced
   **verbatim in BOTH locales** inside that entry: `docs/legal/` is gitignored (`.gitignore:68`,
   verified live: `git check-ignore -v docs/legal/niyamavali.md`), so the decision-log entry is the
   **only durable copy**. §4.2 is `niyamavali.md:101-104` / `niyamavali.hi.md:99-102`.
4. Only then: `story(10.13):` commits.

⚠ **Ratified policy is superseded, never re-read** ([[feedback_supersede_never_reinterpret]]). Nothing
in this story re-interprets Deed Clause 10(b) or §4.2. It either matches the code to them, or records
in terms that it does not.

---

## Boundary

### In scope

- **The routing note + ruling** (AC1) — five questions, three blocking.
- **The eligible-attestor read** (AC2) — a domain accessor + a contracts DTO + a GET route field or a
  sibling route, and a picker in the admin page replacing the UUID textarea.
- **The eligibility enforcement** (AC3) — server-side, inside the scope tx, fail-closed on the first
  ineligible member, typed error → stable HTTP code, rejection audited. This is the teeth.
- **The `scheduled` value** (AC4) — the one literal epic AC not satisfied today.
- **Convention alignment + the module's first UI test** (AC5).
- **Marker closure, recorded either way** (AC6).
- **Dispositions, not builds** (AC7) — FR-55's announcement half and the two questions this authoring
  pass surfaced that 10.13 does not own.

### Out of scope — explicitly, with the disposition recorded

| Not built | Why | Recorded where |
|---|---|---|
| A `trustee_directory` table / registry / new primitive | The eligibility predicate and the directory read both already exist as patterns (`assertPanelAuthorized`, `resolveShepherdCandidates`). [[feedback_no_premature_package]] — no second consumer, no extraction. | AC2 note |
| Any change to `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE` | `epics.md:3830`, `deferred-work.md:4469` — ⛔ explicit. It is the floor, not the directory. | AC1/Q3 |
| The FR-55 **announcement composer** (*"drafts the announcement copy; selects channels; schedules publish"* — `prd.md:849`) | Story 10.5 **is** that machinery — News/Blog with `channels[]` per post, `scheduled_publish_at`, author≠reviewer, tone review. Building a second composer inside the setter would be textbook wheel-reinvention. | AC7(a) — **disposition required**, not silence |
| Live channel fan-out on a fixed-amount change | 7.5's D4 decided the seam is a console placeholder and `packages/channels` `dispatch()` has exactly one live call site, which is not this one ([[project_channels_no_live_dispatch_yet]]). | AC7(a) |
| The UX §987-993 three-stage member-card transition (Month −3 / −1 / 0) | The member card surfaces `upcomingAmountChange` as a **single always-on line** (`ActiveContributionCard.tsx:212-218`), not the staged progression the UX spec commits. That is **Story 8.2's** surface, not this one. | AC7(c) — observation with a named owner |
| Enforcing a minimum **duration** (as distinct from minimum notice) | A genuine, reachable divergence from Deed 10(b) / §4.2 — see AC1/Q4. It is routed, not absorbed. | AC1/Q4 + AC7(b) |
| Nav discoverability for the route | The route is reachable by URL only; that is the shipped pattern for ~18 of the 21 admin modules, not a 10.13 defect. Changing it is a console-IA decision with no owner here. | this table |
| Widening `PoolFixedAmountView` beyond AC2/AC4's additive fields | Scope discipline. | — |

---

## Acceptance Criteria

### AC1 — The routing note is authored and RULED before any code `[GOVERNANCE, BLOCKING]`

**Given** Deed Clause 10(b) (`trust-deed.md:147`) and Clause 20(c) (`:241`) vest the power to fix the
per-Pool amount in the **Board**, Niyamavali §4.2 (`niyamavali.md:102`) repeats it, and the shipped
gate holds both keys on `pariwar_admin` alone (`roles.ts:317-325`)
**When** this story begins
**Then** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-13.md` is
authored, committed under a `governance:` prefix, and carries **five** questions with a stated
non-answer consequence for each
**And** ⛔ **Q1, Q2 and Q3 are BLOCKING** — no implementation commit lands before they are ruled
**And** the ruling is recorded as **one** `.decision-log.md` entry with per-clause provenance labels
**And** ⚠ every recommendation in the note is marked **NON-BINDING** — a ⭐ is a suggestion the Panel
may reject, never a default taken by silence ([[feedback_record_unattested_no_backfill]]).

The five questions, verbatim in intent:

| # | Question | Blocking | ⭐ Non-binding recommendation |
|---|---|---|---|
| **Q1** | The Deed vests amount-fixing in the **Board**; the code vests it in `pariwar_admin`. Does `trustee_panel` gain `pool.fixed_amount_set` + `pool.fixed_amount_emergency`, and does `pariwar_admin` **retain** them concurrently? | ⛔ **YES** | ⭐ Grant both keys to `trustee_panel`; **keep** `pariwar_admin` (the §8.7 *"concurrent, not exclusive"* posture, `niyamavali.md:268`). ⚠ §8.7 constitutes the Panel as *"the Board of Trustees acting in a **moderation capacity**"* — **amount-fixing is a different capacity**, so this grant is **not** implied by 10.18 and cannot be author-defaulted. |
| **Q2** | Is an eligible attestor exactly *"an actor holding `pool.fixed_amount_emergency` at this Pariwar"*, or is panel membership **asserted at attestation time** with no directory read? | ⛔ **YES** | ⭐ Option (a), the key-as-credential — `claim.r9_vote` and `claim.appeal_vote` are already *"ALSO the panel-membership eligibility credential"* (`roles.ts:113-114`, `:315-316`). Option (b) is a legitimate answer and `epics.md:3827-3829` admits it — but it must be **recorded**, not defaulted into. |
| **Q3** | Deed Clause 19(b) (`trust-deed.md:227`) sets Board quorum at *"one-half of the Trustees then in office, or two, whichever is **higher**"*. `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2` is the *lower* bound of that formula. Must the emergency path additionally check the Deed quorum? | ⛔ **YES** | ⭐ **No** — and record why: the system has no roster of *"Trustees then in office"* distinct from grant-holders, so *"one-half"* is uncomputable without inventing the very directory the epic forbids. Record the constant as a **floor that is not the quorum**, and say so at the call site. ⛔ The constant does not move either way. |
| **Q4** | Deed 10(b) / §4.2 fix the amount *"for stated periods of **not less than twelve months**"*. The code enforces minimum **notice** (`effective_from ≥ now+365d`), never minimum **duration**. Two standard writes a day apart can leave an entry in force for **one day** (`closeOpenHead`, `fixed-amount.ts:261-287`, closes the prior head at the new `effective_from`). Defect, recorded divergence, or successor? | No | ⭐ **Successor story, named and minted**, not absorbed here — closing it changes the *write path* 7.5 owns, not the setter surface 10.13 owns. ⛔ Do **not** leave it un-owned; a deferral naming an epic expires unowned ([[project_r7_fact_producer_unbuilt]]). |
| **Q5** | How far back may an emergency `effective_from` reach? 7.5's review flagged the backdating/replay question and its story file says it was *"logged to deferred-work.md"* — ⚠ **verified 2026-08-16: it is NOT there.** The only 7.5 entry in that file is the `documented_reason` PII one (`deferred-work.md:1150-1152`). | No | ⭐ Record the bound (or record that there is none, deliberately) **and** write the entry the 7.5 review claimed to have written. This is the un-mechanized half decaying exactly as [[feedback_mechanization_split_commitment]] predicts. |

### AC2 — The eligible-attestor directory read, and the picker that consumes it

**Given** Q2 is ruled option (a)  *(if it is ruled option (b), AC2 collapses to the recorded assertion
UI + AC3 stands unchanged — see AC6)*
**When** the setter surface offers the emergency-override form
**Then** a domain accessor resolves the eligible attestors for `(pariwarId)` — actors holding
`pool.fixed_amount_emergency` at `dimension: 'pariwar'`, `value: pariwarId` — returning
`{ actorId, displayName }`, ordered deterministically, bounded by a literal `.limit(...)`
**And** the read joins `role_grants × users` under the request's scope tx (RLS-narrowed to this tenant,
plus an **explicit** `pariwar_id` predicate — the `resolveShepherdCandidates` belt-and-braces posture,
`shepherd-assign-persist.ts:187-188`)
**And** an actor with a NULL/whitespace display name is **excluded from the directory**, because a
panel member with no R5 display cannot be written to the attestation record at all
(`handlers.ts:256-268`) — surfacing them as pickable would offer a choice that is guaranteed to 409
**And** the admin page replaces the free-text UUID textarea (`FixedAmountPage.tsx:247-257`) with a
multi-select over that list, showing **display names**, submitting **actor ids**
**And** ⚠ the picker is **convenience, never the boundary** — AC3's server check stands whether or not
the client used it (the `FixedAmountPage.tsx:7-9` posture, restated).

### AC3 — Server-side eligibility enforcement, fail-closed and audited `[THE TEETH]`

**Given** the emergency override writes an **immutable** attestation record naming a panel
**When** `POST …/admin/pool-fixed-amount/emergency` is handled
**Then** **every** submitted `panel_actor_ids` member is verified to hold
`pool.fixed_amount_emergency` at this Pariwar, evaluated with the **pure** `rbac.hasPermission` over
grants loaded from `role_grants` inside the scope tx — the `assertPanelAuthorized` shape verbatim
(`r9-voting-persist.ts:320-350`)
**And** the check **fail-closes on the FIRST** ineligible member with a typed error, mapped in
`translateFixedAmountError` to a stable `4xx` + a `pool.fixed_amount_panel_member_unauthorized` code
**And** the rejection emits `admin_pool_fixed_amount.rejected` **before** throwing (this file's own
stated posture, `handlers.ts:20-21` + `:250-254`) with non-PII context: `action`, `panel_actor_ids`,
`reason`
**And** ⛔ **no schedule row and no attestation row is written** on refusal — the caller's tx rolls back
**And** a test proves the **cross-tenant** case specifically: an actor holding the key in a
*different* Pariwar is refused. ⚠ This is the case today's code lets through, and a same-tenant-only
test would pass against the broken behaviour too ([[feedback_gate_scope_semantic_coverage]] — a green
scan proves nothing; assert the revert-sanity).

⚠ **Ordering:** the eligibility check must run **before** the per-member display resolution, or an
ineligible actor with no display name reports the wrong error (409 `AdminDisplayNameMissing` instead of
the eligibility refusal) and the audit line records the wrong reason.

### AC4 — The surface shows the SCHEDULED value, not only the effective one

**Given** `epics.md:3814` requires *"the UI shows current **+ scheduled** values"*
**When** a future-dated entry exists
**Then** the GET view carries the next change that has **not yet taken effect** — sourced from the
already-shipped `resolveUpcomingFixedAmountChange` (`fixed-amount.ts:212-229`), which today has exactly
one consumer and it is the **member** card (`member-pool/handlers.ts:504-506`), not the trustee's own
setter
**And** `PoolFixedAmountView` gains a nullable `upcoming` field (additive; `.strict()` preserved)
**And** the page renders it as its own labelled region — *"Scheduled"*, distinct from *"Effective now"*
— never as another row in the undifferentiated history list (`FixedAmountPage.tsx:321-367`), which is
how the value hides today
**And** ⚠ `asOf` for that read is the **DB-authoritative** instant, not a JS clock (§1.11 —
`fixed-amount.ts:134-143`).

### AC5 — Convention alignment + the module's first UI test

**Given** the admin console standardized on a per-module English chrome resolver **after** 7.5 shipped
(`banners/i18n-en.ts:1-8`, `claim-appeal/`, `claim-verification/`, `helpdesk/`, `helpline-claims/`,
`ground-inspection/`, `trustee-lite/`)
**When** this story touches the page's copy
**Then** `apps/admin/src/modules/pool-fixed-amount/i18n-en.ts` exists and the **new/changed** strings
resolve through it (`import { resolveEn as t }` — the `BannersPage.tsx:55` form)
**And** ⚠ **do not** mass-rewrite the 7.5 strings that this story does not otherwise touch — a
whole-file churn inflates the diff the friction-budget gate attributes to this story
([[project_friction_budget_baseline_ratchet]])
**And** `apps/admin/tests/fixed-amount-page.test.tsx` exists — the module has **zero** UI tests today,
uniquely among the admin modules this story's siblings shipped — covering: the picker renders eligible
attestors by display name; the emergency submit sends ids; the Scheduled region renders when `upcoming`
is present and is absent when it is null; the step-up 403 → elevate → re-submit loop still works
(`FixedAmountPage.tsx:107-126` — regression protection for the one interaction most likely to break).

### AC6 — The marker is closed against the recorded outcome, in every register, EITHER WAY

**Given** [[feedback_closure_language_precision]] — *"Closed by [edit]"* / *"Resolved via explicit
deferral"* / *"Not addressed"* are three different sentences and may not be collapsed
**When** the ruling lands
**Then** `fixed-amount.ts:75-88`'s trustee-directory bullet is rewritten to state the **outcome**, not
a re-pointer — ⛔ and if Q2 lands on option (b), it says *"panel membership is asserted at attestation
time, by Decision `<id>` clause `<n>`"*, which is a **closure**, not a failure
**And** `deferred-work.md:4461-4470` is updated in place with the discharge (the entry is a live
tracker, not the append-only decision log)
**And** `epics.md:3817-3834`'s inherited-obligation block records the disposition
**And** `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE`'s own doc comment carries Q3's answer — that it is a floor
and **not** the Deed Clause 19(b) quorum
**And** a grep-back proves no marker anywhere still reads *"the trustee directory has no owner"* or
points at Story 10.13 as **pending**. ⚠ A marker naming a `done` story reads as *already delivered* and
is worse than one naming an epic (`deferred-work.md:4578`).

### AC7 — Three dispositions, each with a named owner or a stated closure

**(a) FR-55's announcement half.** `prd.md:849` commits *"drafts the announcement copy; selects
channels; schedules publish"*; 7.5 shipped a console-log seam and D4 decided that deliberately.
**Then** the disposition is recorded explicitly: either **Closed by edit** — Story 10.5's News/Blog
console **is** the announcement workflow, and a fixed-amount change announcement is a news post with
`channels[]` and `scheduled_publish_at` — or a **named, minted successor**. ⛔ Not silence, and ⛔ not a
second composer inside this module.

**(b) Q4's minimum-duration gap** carries whatever owner the ruling gives it, recorded in
`deferred-work.md` with a **re-trigger**, not a bare note.

**(c) The UX §987-993 staged member-card transition** is recorded as an observation against **Story
8.2** (`ux-design-specification.md:987-993` vs `ActiveContributionCard.tsx:212-218`), with no work in
this story. ⚠ Record it as *observed*, not as *deferred by 10.13* — 10.13 never owned it
([[feedback_gap_analysis_observational]]).

---

## Tasks / Subtasks

- [ ] **Task 1 — The routing note (AC1)** ⛔ *governance commit, before any code*
  - [ ] Author `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-13.md`
        on the `trustee-panel-routing-note-2026-08-15-story-10-22.md` template: *Why this note exists* →
        *Story state* → *Disposition on ruling* → the five questions → *What non-answer would mean*.
  - [ ] Pin every citation **live** at `9fb88c3` before writing it down — Deed `:147` / `:227` / `:237` /
        `:241`, Niyamavali `:102` / `:266`, `roles.ts:317-325` / `:595-650`, `permissions.ts:462`.
        ⚠ [[feedback_verify_before_committing_governance_claims]] — and the 10.22 note's own
        "Clause 27(b)" mis-citation (corrected by Decision `2026-08-16-122`) is the worked example of
        what happens when a clause number is carried rather than re-read.
  - [ ] Commit: `governance(10.13): trustee-panel routing note — who may fix, and who may attest`.
  - [ ] ⏸ **STOP.** Do not proceed past Task 2 until Q1/Q2/Q3 are ruled.

- [ ] **Task 2 — Record the ruling (AC1)**
  - [ ] One `.decision-log.md` entry, numbered from head `2026-08-16-122`, per-clause provenance
        labelled. ⛔ Never edit an existing entry ([[feedback_supersede_never_reinterpret]]).
  - [ ] If §4.2 is amended: both locales reproduced **verbatim** in that entry (`docs/legal/` is
        gitignored — the entry is the only durable copy).
  - [ ] Commit: `governance(10.13): Decision <id> — …`.

- [ ] **Task 3 — RBAC, only if Q1 rules a grant (AC1)**
  - [ ] Add the key(s) to the `trustee_panel` bundle in `roles.ts` with the Panel-decision rationale
        inline, in the voice of the existing `member.restore_terminated` /
        `member.decide_moderation_appeal` notes (`roles.ts:630-645`).
  - [ ] Bump `PERMISSION_CATALOG_VERSION` **34 → 35** (`permissions.ts:462`). ⛔ **Key count stays 43**
        — an existing role gaining existing keys moves the capability model, not the catalog. This is
        the **third** application of that rule (10.18 minted a role; 6.17 gave an existing role an
        existing key). Update the pin **and** the ledger comment at
        `packages/domain/tests/rbac/permissions.test.ts:54-56`, following its established prose form.
  - [ ] ⚠ Do **not** grant to `state_trustee` or `district_admin`: their `scopeCeiling` (`state` /
        `district`) can never satisfy a `pariwar`-dimension check, so the grant would be **inert on
        arrival** ([[project_rbac_geo_scope_containment]]; `roles.ts:607-618`).

- [ ] **Task 4 — The eligibility predicate (AC3)** — *build this before the picker; the boundary
      first, the convenience second*
  - [ ] Add the panel-eligibility assertion beside the other emergency guards in
        `packages/domain/src/pool/fixed-amount.ts` (or a sibling in `pool/`), modelled on
        `r9-voting-persist.ts:320-350`. It takes the raw `pg.PoolClient` — `ScopeTx` exposes **both**
        `client` and `tx` (`scope-tx.ts:44-49`), so no new plumbing is needed.
  - [ ] Add `PoolFixedAmountPanelMemberUnauthorizedError` to `pool/errors.ts` alongside
        `PoolFixedAmountPanelTooSmallError`; map it in `translateFixedAmountError`
        (`handlers.ts:53-94`) to a stable code.
  - [ ] Wire it into `postEmergency` **before** the display-resolution loop (`handlers.ts:250-269`);
        emit `admin_pool_fixed_amount.rejected` on refusal.
  - [ ] ⚠ Keep the existing arithmetic guards (non-empty / ≥2 / no-duplicates) exactly where they are —
        eligibility is an **additional** predicate, not a replacement.

- [ ] **Task 5 — The directory read + transport (AC2)**
  - [ ] Domain accessor in `pool/fixed-amount.ts` (or `pool/` sibling), modelled on
        `resolveShepherdCandidates`'s **query shape** (`shepherd-assign-persist.ts:190-249`):
        `role_grants ⋈ users`, explicit `pariwar_id` (+ RLS), non-blank `display_name`, deterministic
        `ORDER BY`, **integer-literal** `.limit(...)`.
    - ⛔ **Do not copy its role-resolution mechanism.** `resolveShepherdCandidates` itself hardcodes
      `eq(roleGrants.role, 'district_admin')` — a literal role-name-string match, correct for a
      single-role duty but **wrong here**: eligibility for this directory is **permission-key-defined**
      (`pool.fixed_amount_emergency`), not single-role-defined. `role_grants.role` is `text`, not an
      enum, and stores **roles**, not permission keys — resolve the holder set through the seeded
      bundles + the pure `hasPermission(grants, 'pool.fixed_amount_emergency', { dimension: 'pariwar',
      value: pariwarId, pariwarId })`, never by hardcoding a role name string. Copy the join/tenant/order
      shape from the precedent; do not copy its shortcut.
    - ⚠ The domain limit-clamp gate clamps every dynamic `.limit()`
      ([[project_domain_limit_clamp_and_savepoint_retry]]) — use a literal or `clampLimit(...)`.
  - [ ] Contracts: a `.strict()` DTO in `packages/contracts/src/pools/fixed-amount.ts`. ⛔ Contracts
        **must not** import `@twt/domain` (`fixed-amount.ts:9-14`; [[project_contracts_domain_bundle_boundary]]).
  - [ ] Expose it on the existing GET view or a sibling GET; gate on the **emergency** key.
  - [ ] `apps/admin/src/api/{client,hooks}.ts` — extend the existing
        `// ── Story 7.5 — the fixed-amount schedule surface ──` section (`hooks.ts:731-762`).

- [ ] **Task 6 — The picker + the Scheduled region (AC2, AC4)**
  - [ ] Replace the panel textarea with a multi-select over the directory; keep the client-side
        de-dupe (`FixedAmountPage.tsx:79-85`) and the `< 2` guard (`:93`) — the server rejects both
        too, and the client guard is the fast path, not the gate.
  - [ ] Thread `upcoming` through the GET and render the **Scheduled** region between *Effective now*
        and *Standard change*.
  - [ ] ⚠ Render loading / empty / error states **outside** any list that crosses empty→populated
        ([[project_fabric_flatlist_empty_populated_crash]] — the admin app is React-DOM, not Fabric, so
        this is discipline rather than a crash here; keep the existing `view.isLoading` / `isError`
        early-return shape at `FixedAmountPage.tsx:141-147`).

- [ ] **Task 7 — i18n + the module's first UI test (AC5)**
  - [ ] `apps/admin/src/modules/pool-fixed-amount/i18n-en.ts` for new/changed copy only.
  - [ ] `apps/admin/tests/fixed-amount-page.test.tsx` — model on `apps/admin/tests/banners-page.test.tsx`
        / `custom-fields-page.test.tsx`; `_helpers.tsx` + `setup.ts` provide the harness.
  - [ ] ⚠ The copy is **admin chrome**, English-facing — this is not a `packages/i18n` catalog key and
        not member-facing bilingual content (`banners/i18n-en.ts:3-8`).

- [ ] **Task 8 — Tests with teeth (AC3, AC4)**
  - [ ] Domain integration (`packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts` —
        extend, do not fork): eligible panel accepted; ineligible refused; **cross-tenant holder
        refused**; refusal writes **no** schedule row and **no** attestation row.
  - [ ] API E2E (`apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts` — extend): the
        refusal's HTTP code + the `admin_pool_fixed_amount.rejected` audit line via the capturing sink;
        the directory GET is gated; the `upcoming` field appears/disappears correctly.
  - [ ] ⚠ Own-committing seed writes + a fresh random `pariwarId` per test, `role_grants` cleaned in
        `afterAll` — the file's existing posture (`fixed-amount.spec.ts:1-11`); assert **membership**,
        not counts ([[project_live_db_test_gotchas]]).
  - [ ] ⚠ **Revert-sanity:** confirm the cross-tenant test **fails** with the eligibility check removed.
        A test that passes both ways proves nothing.

- [ ] **Task 9 — Records + gates (AC6, AC7)**
  - [ ] The four marker sites (AC6) + the grep-back.
  - [ ] `deferred-work.md` entries for AC7(b) and AC7(c), each with a **re-trigger**; AC7(a)'s
        disposition recorded in the closure language it actually is.
  - [ ] `friction-budget.md`, `.decision-log.md` cross-reference, sprint-status ledger entry.
  - [ ] `pnpm ci:local` (DATABASE_URL on `:5433`). ⚠ Record the result **AS OBSERVED**, never as green
        ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]],
        [[project_ci_local_double_run_pollution]]). `git push` runs the full `ci:local` via a pre-push
        hook — that is the "hang", not a failure.

---

## Dev Notes

### The one-paragraph mental model

`pool_fixed_amount_schedule` is an effective-dated, append-only, per-Pariwar window table with **at most
one open head** (partial-unique index). Two write paths append to it and differ in exactly four things:
the `effective_from` floor, the required attestation, the `change_type` discriminator, and the
notification cadence. The resolver is `change_type`-**blind**. Pools snapshot the amount at cycle-freeze
`committed_at`, so **no schedule write can ever reach an already-spawned pool** — non-retroactivity is
architectural, not guarded. None of that changes here. This story adds one predicate to one write path
and one field to one read.

### Architecture compliance — the constraints that bind this work

| Constraint | Where it lives | What it means here |
|---|---|---|
| **DB-authoritative time** (§1.11) | `fixed-amount.ts:127-143` | Every `asOf` / floor comparison sources `SELECT now()`. ⛔ Never `new Date()` server-side — a trustee-controllable app clock could shrink the cooling-off window (`architecture.md:1324`, the hostile-trustee control). |
| **RLS is transaction-scoped** | `scope-tx.ts:34-55` | Every scoped read opens a scope tx, GET included — verified during 7.5's own review as *architecturally mandatory, not an inefficiency*. |
| **Domain accessors don't open transactions** | `fixed-amount.ts:21-27` | Atomicity comes from the **caller's** tx. Keep it that way. |
| **`hasPermission` is a pure sync predicate** (ADR-0008 D8) | `rbac/permissions.ts` | The eligibility check loads grants **then** calls the predicate. ⛔ No I/O inside the predicate. |
| **RBAC is a `prohibited` flag root, and containment is freeze row 9** | `governance_boundary.yaml:238-242` | The boundary forbids **flag-conditioning** RBAC (*"a flag-conditioned permission check is a privilege escalation with a config-shaped switch on it"*); freeze row 9 forbids changing scope/containment **semantics**. A role-bundle grant in `roles.ts` (Task 3) is neither — ⛔ but nothing in this story may be flag-gated, and `rbac/scope.ts` is not touched. |
| **Contracts ⊥ domain** | `contracts/src/pools/fixed-amount.ts:9-14` | Re-declare constants value-aligned + lockstep-tested; never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]). |
| **Human-actor CI gate scans the `preHandler` array statically** | `pool-fixed-amount/index.ts:56-59` | Any new route inlines `[adminSession, scope, require…]` **literally**. A shared/spread variable is opaque to the scanner. |
| **Pool-support-category invariant gate** | `fixed-amount.ts:29-32` | `pool/` is recursively scanned — no hardcoded support-category strings in anything added there. |
| **Domain limit-clamp gate** | `fixed-amount.ts:547-553` | Every `.limit()` is an integer literal or a literal `clampLimit(...)`. |
| **Append-only attestations** | `pool_fixed_amount_emergency_attestations` | Write-once; **no** mutating accessor exists and none is added. A refused override must leave **nothing** behind. |

### The two precedents to copy, and the one to avoid

**Copy — eligibility:** `assertPanelAuthorized` exists twice, near-identically
(`r9-voting-persist.ts:320-350`, `appeal-panel-persist.ts:249-274`). Both load
`SELECT user_id, pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = ANY($1)`
on the **scoped client** (RLS narrows to the tenant), fold to `EffectiveGrant[]` per actor, and run
`hasPermission(grants, KEY, { dimension: 'pariwar', value: pariwarId, pariwarId })`, throwing on the
first failure. This will be the **third** instance — ⚠ and per [[feedback_no_premature_package]] that is
the point at which extraction becomes arguable, but *arguable* is not *now*: ship it as the third
instance and note the extraction question. Do not refactor the two shipped call sites.

**Copy — the directory read:** `resolveShepherdCandidates` (`shepherd-assign-persist.ts:190-249`) is
the repo's only existing *"who is eligible for this role-bound duty"* read: `role_grants ⋈ users`,
tenant predicate **and** RLS, `status = 'active'`, non-blank display name, deterministic order, literal
limit. ⚠ Copy that shape, not its role-resolution mechanism — see Task 5. Its `getShepherdContactability`
sibling (`:278-307`) is the matching single-actor validator and
is worth reading for the *"exists but holds no such grant resolves to `null`, exactly like a nonexistent
user"* posture — the same fail-closed shape AC3 needs.

**Avoid — the R9 voting lifecycle.** `fixed-amount.ts:15-19` is explicit: the emergency path's
governance posture is *equivalent to* R9 (step-up + recorded attestation + auditability) and is
**deliberately not** the R9 voting lifecycle — no session, no quorum, no per-vote encrypted rationale.
⛔ Do not pull the R9 subsystem in. Copy `assertPanelAuthorized`; import nothing else from `claim/`.

### The exact hole, restated so it cannot be missed

```
FixedAmountPage.tsx:247-257   textarea, comma/newline-separated raw UUIDs
        ↓
contracts:107-125             z.array(z.string().uuid()).min(2).max(20) + no-duplicates refine
        ↓                     ← shape only; says nothing about WHO
handlers.ts:250-269           for each id: getDisplayName(deps.pool, actorId)
        ↓
admin-auth.repo.ts:186-193    SELECT display_name FROM users WHERE id = $1
                              ← users is GLOBAL (schema/users.ts:1-15). No pariwar. No role. No grant.
        ↓
fixed-amount.ts:393-401       non-empty · ≥2 · no duplicates      ← arithmetic only
        ↓
poolFixedAmountEmergencyAttestations   ← immutable, append-only, forever
```

Every box is correct in isolation. The composition has no authorization in it.

### Previous-story intelligence

**Story 10.12 (`10-12-per-pariwar-custom-fields-jsonb`, `done`)** — the numerically-previous story, and
its opening lesson transfers directly: *the epic cited a gate that could not enforce its own AC*, and
the story's job became **supplying the enforcement the citation assumed existed**. 10.13 is the same
shape at the identity layer: the epic assumes a directory behind a panel that has none. Also from 10.12:
the catalog bump form, the `apps/admin/tests/custom-fields-page.test.tsx` harness, and the discipline of
touching a shipped governance artifact **loudly** when you must.

**Story 10.22 (`done`, HEAD)** — the freshest governance-first execution: routing note → ruling →
instrument amendment in both locales → code, with the branch cut from the ratifying commit. Its
`.decision-log.md` entry (`2026-08-15-121`) and the record correction that followed
(`2026-08-16-122` — a mis-cited Deed clause number) are the model for Task 1's citation discipline.

**Story 10.18 (`done`)** — the reason Q1 is answerable at all. It constituted `trustee_panel` because
*"there was no way to distinguish a Panel act from a `pariwar_admin` act"*. That sentence describes the
fixed-amount setter today, one epic later. ⚠ But 10.18's ruling constitutes the Panel as *"the Board of
Trustees acting in a **moderation capacity**"* — so it does **not** carry over by itself, and must not
be author-defaulted.

**Story 7.5 (`done`)** — everything this story stands on. Read its D3 (governance posture), D4
(notification is a seam), D5 (non-retroactivity is structural) before proposing anything that looks
like a change to the write model.

### Git intelligence (last 12 commits, `9fb88c3`)

The 10.22 sequence is the current house rhythm and worth imitating literally: `governance(10.22):` for
the Deed-citation correction, then `story(10.22):` commits in build order — contracts + key mint →
routes/UI → live-DB spec + the migration it caught → the records (counsel sibling, deferred-work "in
three registers", the gates) → the reachability proof as a route-shape test → status flip with
`ci:local` recorded **AS OBSERVED (29 green, 2 red)**, explicitly *not* as green. Commit **selectively
by hand** on a feature branch; ⛔ do not use `commit-story` ([[project_story_automator_ops]]).

### Testing standards

- Vitest throughout. DB-gated suites use `describe.skipIf(!hasDatabase)` against `twt-test-pg`:5433.
- Domain: extend `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts`; DB-free unit tests
  in `packages/domain/tests/pool/fixed-amount.test.ts`.
- API: extend `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts` (it already provides
  `CapturingAuditSink`, `CapturingStepUpDelivery`, `CapturingPoolFixedAmountHook`).
- Admin: `apps/admin/tests/` + `_helpers.tsx` + `setup.ts`.
- ⚠ Never regenerate an applied migration (42P07); never `DROP SCHEMA` (42P01)
  ([[project_live_db_test_gotchas]]). If a migration is needed at all here, it is only for a new error
  path — there is **no schema change** in this story's plan.
- ⚠ `@twt/api` full-suite runs surface a **different** red spec per run; one red spec is not evidence of
  a regression — confirm innocence by running the suspect spec in isolation.

### Project structure — files this story touches

**New**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-13.md`
- `apps/admin/src/modules/pool-fixed-amount/i18n-en.ts`
- `apps/admin/tests/fixed-amount-page.test.tsx`

**Modified**
- `packages/domain/src/pool/fixed-amount.ts` (eligibility assertion + directory read + the `:75-88`
  marker rewrite)
- `packages/domain/src/pool/errors.ts` (one error class)
- `packages/domain/src/rbac/roles.ts` + `packages/domain/src/rbac/permissions.ts` +
  `packages/domain/tests/rbac/permissions.test.ts` — **only if Q1 rules a grant**
- `packages/contracts/src/pools/fixed-amount.ts` (two additive `.strict()` shapes)
- `apps/api/src/modules/pool-fixed-amount/{handlers,index}.ts`
- `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx`
- `apps/admin/src/api/{client,hooks}.ts`
- `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts`,
  `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`,
  `packages/contracts/tests/pools-fixed-amount.test.ts`
- `.decision-log.md`, `_bmad-output/implementation-artifacts/deferred-work.md`,
  `_bmad-output/planning-artifacts/epics.md`, `friction-budget.md`,
  `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Library / framework notes

No new dependency, and none is warranted. React 19 + TanStack Router + TanStack Query in `apps/admin`;
Fastify + `fastify-type-provider-zod` in `apps/api`; Drizzle + `pg` in `packages/domain`; Zod in
`packages/contracts`. The multi-select is plain React over the existing Tailwind classes — ⛔ do not
introduce a select/combobox library for one field.

---

## References

- `_bmad-output/planning-artifacts/epics.md:3803-3834` — Story 10.13 + the inherited obligation
- `_bmad-output/implementation-artifacts/deferred-work.md:4461-4470`, `:1847`, `:1150-1152`, `:4578`
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:463-470` (FR-15), `:847-849` (FR-55)
- `_bmad-output/planning-artifacts/architecture.md:1324` — hostile-trustee control; `:998` — FR-15 as
  system-integrity policy
- `_bmad-output/planning-artifacts/ux-design-specification.md:987-993` (member card transition),
  `:241` / `:1219` (trustee tooling is Tier-2, web-responsive), `:2479`
- `docs/legal/trust-deed.md:147` (Cl. 10(b)), `:227` (Cl. 19(b) quorum), `:237` (Cl. 20(a)), `:241`
  (Cl. 20(c)), `:75` ("Board" defined)
- `docs/legal/niyamavali.md:101-104` (§4.2) / `niyamavali.hi.md:99-102`; `:262-274` (§8.7)
- `packages/domain/src/pool/fixed-amount.ts:15-19`, `:75-88`, `:127-143`, `:212-229`, `:261-287`,
  `:385-401`, `:547-553`
- `packages/domain/src/claim/r9-voting-persist.ts:314-350`;
  `packages/domain/src/claim/appeal-panel-persist.ts:247-274`;
  `packages/domain/src/claim/shepherd-assign-persist.ts:190-249`, `:278-307`
- `packages/domain/src/rbac/roles.ts:110-129`, `:317-325`, `:595-650`;
  `packages/domain/src/rbac/permissions.ts:256-262`, `:462`, `:699-705`
- `packages/domain/tests/rbac/permissions.test.ts:54-56` — the pin + the bump ledger
- `packages/domain/src/schema/users.ts:1-15` (GLOBAL identity), `role_grants.ts:1-20` (scoped join)
- `apps/api/src/modules/pool-fixed-amount/index.ts:42-102`, `handlers.ts:14-23`, `:53-94`, `:250-269`
- `apps/api/src/modules/auth/admin/admin-auth.repo.ts:186-193`
- `apps/api/src/modules/multi-tenant/scope-tx.ts:34-55`
- `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx:1-9`, `:79-93`, `:107-126`, `:247-257`,
  `:321-367`; `apps/admin/src/api/hooks.ts:731-762`; `apps/admin/src/router.tsx:199-203`
- `apps/admin/src/modules/banners/i18n-en.ts:1-8` — the admin chrome convention
- `_bmad-output/implementation-artifacts/7-5-fixed-amount-snapshot-at-spawn-12-month-notice-workflow-emergency-adjustment-override.md`
  — AC1/AC3/AC4, D3/D4/D5, and the review round
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-15-story-10-22.md` — the note template
- `.decision-log.md:37` (head `2026-08-16-122`), `:52` (`2026-08-15-121`)

---

## Open questions for BigDev (raised at authoring; none blocks Task 1)

1. **Q1's shape.** Should the routing note offer *"grant to `trustee_panel`, retain on `pariwar_admin`"*
   as the recommendation, or is the Deed's *"determined by the Board"* strong enough that concurrency is
   itself the thing needing a ruling? The 10.22 note's practice is to recommend and mark non-binding —
   this note follows it, but the recommendation is a judgment call you may want to set.
2. **AC7(a).** I have recommended *Closed by edit* (Story 10.5 **is** FR-55's announcement workflow).
   If you would rather mint a named successor — *"fixed-amount change announcement, composed in
   News/Blog"* — say so and the disposition flips; the story does not change otherwise.
3. **Q5's absent record.** Story 7.5's file says the backdating question was *"logged to
   deferred-work.md"*; verified 2026-08-16, it is not there. I have scoped this as *write the missing
   entry* rather than *audit 7.5's other logging claims*. Widen it if you want the audit.

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-16 | Story created via `bmad-create-story` off `main` @ `9fb88c3` (clean, fetched). Status `backlog` → `ready-for-dev`. Authoring pass only — no code written, no gate run, nothing here attested by a test run. |
| 2026-08-16 | Checklist validation pass (`bmad-create-story validate`), three parallel forks against live source: epics.md coverage, dependency status, git provenance (all PASS, no gaps); Trust Deed/Niyamavali/`.decision-log.md`/`deferred-work.md`/PRD/architecture/UX citations (2 line-precision drifts fixed: `.decision-log.md` entry count 124→123, `deferred-work.md:4608`→`:4578`); ~30 code file:line citations (5 line-range drifts fixed, all 1–3 lines). One substantive fix: Task 5 told the dev to model the eligible-attestor accessor on `resolveShepherdCandidates`, which itself hardcodes `eq(roleGrants.role, 'district_admin')` — directly contradicting the same bullet's "never hardcode a role name string" instruction. Reconciled: copy the join/tenant/order **shape**, resolve eligibility via `hasPermission` against the seeded bundle, not the precedent's hardcoded-role shortcut. No epic-coverage gaps, no false citations, no scope changes. Status remains `ready-for-dev`. |
