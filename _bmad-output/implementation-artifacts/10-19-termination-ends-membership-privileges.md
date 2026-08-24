---
baseline_commit: 6f1b1654a457e34549ad06b26bbf87243b4aeecd
---

# Story 10.19: Termination Ends Membership Privileges `[SURFACE]`

Status: done

## Story

As the Trust,
I want termination to end authenticated member access rather than leave an expelled person with a live portal account,
so that ESCALATION 3's write access closes at its root instead of being patched at five gates.

---

## What this story is

**Today a terminated member logs in.** `apps/api/tests/integration/member-moderation/moderation-auth-effects.spec.ts:242`
is a **pinning test** that asserts exactly that — *"a TERMINATED member can still log in too (the appeal
path stays open)"* — and it passes. Story 10.10's Decision 6 justified it: a moderated member must be able
to sign in to *"read the dignified explanation and reach the appeal CTA."*

**The appeal CTA has no destination.** `packages/ui/src/member-status/presenter.ts:328-341` renders it from
`terminated-with-reason`, and there is no moderation-scoped appeal route anywhere in the codebase — Story
10.22 is `backlog`. Decision 6's justification rests on a mechanism that does not exist.

This story does **two things, in this order**:

1. **Governance.** Niyamavali **§8.4** is amended and **§8.4a** is authored — the two Part 8 items D5 owns,
   routed here by Story 10.18 (`deferred-work.md:3649-3652`). PRD FR-56 (`prd.md:866`) **already cites
   §8.4a as if it exists**; this story is what makes that citation true.
2. **Implementation.** An **overlay read on the auth path** blocks a terminated member's login, timing-
   equalised like the withdrawn block; the refresh chain closes the same way; the termination notice becomes
   **self-contained**, because once the portal is shut the notice *is* the explanation.

**Framing, from the moderation-model decision brief's D5 section (`:348-350`):** *"This dissolves ESCALATION 3 rather than patching
it. With no authenticated session there is no write path, so the five `TERMINAL_STATES` sets need no change
and no AC5 deviation is required."*

⚠ **That sentence is true with one bounded exception this story must state rather than inherit** — see
**Verified premise #4**.

---

## Verified premises — checked live at `6f1b165`

**⛔ #1 — `member-auth.handlers.ts:71` is the right line, and it is a *lifecycle-state* read, not a set.**
`epics.md:3806` says the block is *"an overlay read to the auth path at `member-auth.handlers.ts:71` — not
a string added to a set."* Confirmed exactly: `:71` reads
`if (state === 'withdrawn' || state === 'anonymized')` where `state` came from
`memberDomain.getMemberStateAt(deps.serviceDb, …)` at `:61-65`. **There is no set here to add to** — the
five `TERMINAL_STATES` Sets live in five *other* modules (premise #3). The overlay is a **second, orthogonal
event-derived machine**; its verdict is not a `MemberLifecycleState` and cannot be OR'd into this
expression without a second read.

**⛔ #2 — the timing-equalisation the AC names is at `:77-80`, and it is a `setTimeout`, not a constant-time
compare.** `await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100))`. "Exactly like
the existing withdrawn block" therefore means *the same jittered sleep on the same code path*, and the
cheapest correct implementation is **one branch covering both blocks**, not a second sleep bolted on.

**⛔ #3 — the five `TERMINAL_STATES` Sets are confirmed and enumerated.** All five are
`new Set(['withdrawn', 'anonymized'])`, none of them import anything from `member/moderation`:

| # | File | Set | Guard |
|---|---|---|---|
| 1 | `apps/api/src/modules/nominee/nominee.handlers.ts` | `:40` | `:107` |
| 2 | `apps/api/src/modules/terms/member-terms.handlers.ts` | `:39` | `:116` |
| 3 | `apps/api/src/modules/medical/medical.handlers.ts` | `:62` | `:141` |
| 4 | `apps/api/src/modules/life-events/handlers.ts` | `:42` | `:99` |
| 5 | `apps/api/src/modules/vyawastha-shulk/handlers.ts` | `:43` | `:141`, `:257` |

**They stay untouched.** Touching them would fork the AI-7-2 invariant into N places, which
`packages/domain/src/member/moderation/index.ts:22-25` explicitly prohibits.

**⛔ #4 — "no authenticated session" is true of REFRESH chains, not of the LIVE ACCESS TOKEN.**
`revokeAllMemberSessions` (`member-auth.repo.ts:438-447`) `DELETE`s `member_refresh_tokens` and
`member_trusted_devices`. It does **not** and cannot invalidate an already-issued access JWT — there is no
denylist. `MEMBER_ACCESS_TTL_MS` defaults to **15 minutes** (`apps/api/src/config.ts:377`). So a member
terminated while holding a fresh access token retains write access to all five `TERMINAL_STATES`-gated
surfaces for **up to 15 minutes**. This is a **real, bounded residual**, and the SCP's "there is no write
path" sentence is written as if it were zero. **Record it; do not silently inherit the claim, and do not
close it by touching the five Sets** (→ **AC6**, **D4**).

**⛔ #5 — Niyamavali Part 8 has §8.1–§8.4 and §8.7. No §8.4a.** `docs/legal/niyamavali.md:170-198`. §8.4 in
full today is two clauses about reinstatement and the rejoin lock — **it says nothing about access,
privileges, history, or statutory rights.** The reserved-numbers note at `:196` names §8.5/§8.6/§8.8/§8.9
and does **not** mention §8.4a, so inserting §8.4a immediately after §8.4 does not violate it.

**⛔ #6 — the shipped terminated notice copy asserts something this story makes FALSE.**
`packages/i18n/locales/en/common.json:334`: *"Your membership has been ended on the grounds of {reason}.
Your record and history are retained. **You can sign in as usual and request a review from your membership
status page.**"* Hindi mirror at `hi/common.json:334`. After this story that final sentence is a lie in both
locales. **Correcting it is not optional polish — it is the copy-truth defect class already standing as an
open Trustee Panel obligation** (`deferred-work.md`, Story 10.18 §"What this story does NOT unblock" item 3).

**✅ #7 — ALREADY DISCHARGED: PRD FR-56 needs no edit.** `prd.md:866` already carries *"Termination ends
authenticated member access; statutory rights survive through an identity-verified administrative
process"* and already cites §8.4a. The SCP §4c(i) amendment landed on 2026-08-04. **This changes no work** —
record as discharged-before-start so the dev agent does not re-apply it.

**✅ #8 — ALREADY DISCHARGED: the architecture question was answered before this story.** Decision
`2026-08-04-072` clause 1: *"The three §4f architecture items are **ratified by the Sprint Change
Proposal** — no further design elicitation is required before Stories 10.17, 10.19, and 10.23 implement
them."* Its open follow-up names this story literally: *"Story 10.19 dev-story: introduce the auth-path
overlay-read invariant at `member-auth.handlers.ts:71` with its own `AI-10-n` comment block."*
`architecture.md` is **NOT** amended (clause 3). **`AI-10-1` is taken by Story 10.23
(`restoration-discipline/overlay.ts:10`) ⇒ this story's invariant is `AI-10-2`.**

**⚠ #9 — the epic's own premise is UNMET as written.** `epics.md:3801` opens *"Given **D5's ratified
principles**."* `.decision-log.md` contains **no entry ratifying D5**. Decision `2026-08-04-072` ratified
only the *architecture-recording scope*, and is explicit that it is a "process/documentation-convention
decision." **D5's governance half is unratified**, which is precisely why AC1/AC2 exist and why this story
follows the Story 10.18 shape (route → rule → author → record) rather than asserting a ratification it
does not have.

---

## ⛔ The one thing this story must not do: manufacture a ratification

Identical constraint to Story 10.18, and it has not moved. The Niyamavali is an **unadopted draft**
(`niyamavali.md:5` — `[[v1.0]]`, `[[date]]`, `[[date]]`, all unfilled) and **counsel is not engaged** (every
return field in `docs/legal-counsel-engagement/` is `<PENDING>`; Story 0.13 has not closed).

> ⛔ **CORRECTED 2026-08-24 (sweep — Decision `2026-08-24-158`): the *"counsel not engaged"* claim above is FALSE, and was false when written.**
> **Adv. Mohit Agrawal** has been Story 0.13 **engaged counsel since 2026-06-21** (`2026-06-21-057`; ⭐ launch-gate **Row 3** is `closed` **on his return**). ⛔ Annotated, ⛔ never rewritten.
> ⚠ **The correct form of words, and what was really true:** counsel had ⛔ not reviewed **this** subject — the 2026-06-21 clearance is fenced to the **ADR-0010 edge design** and reaches nothing else. ⇒ write *"counsel has not reviewed X"*, ⛔ never *"counsel is not engaged"*.
> ⭐ **The other half of this sentence STANDS, ⛔ untouched:** the **Niyamavali is still an unadopted draft** (`docs/legal/niyamavali.md:5` — `[[v1.0]]` / `[[date]]` unfilled, DRAFT banner). ⛔ Only the counsel clause is corrected.

| Landing means | Landing does NOT mean |
|---|---|
| §8.4 amended and §8.4a authored into `niyamavali.md` **and** `niyamavali.hi.md` | A `[[v1.0]]` → `v1.1` version bump |
| Q1–Q6 routed to the Panel and ruled (AC2) | An `Effective:` or `Adopted by Board resolution` date |
| The ruling — **quoting §8.4/§8.4a verbatim, both locales**, since `docs/legal/` is gitignored — recorded in `.decision-log.md` | A `[LEGAL]` counsel-acceptance entry |
| The owed counsel review recorded **as owed** in `deferred-work.md` | Any claim Part 8 is legally settled |

Use `[[feedback_closure_language_precision]]` verbs: **authored and Panel-ratified**; **counsel review
remains outstanding**. Never "approved", never "final".

⚠ **`docs/legal/` is gitignored** (`.gitignore:68`) — the amendment leaves **no diff and no blame**. The
`.decision-log.md` verbatim reproduction **is** the record, in both locales. This is Story 10.18's
Escalation 7, unchanged and not this story's to fix.

---

## In scope / out of scope

| In scope | Out of scope → owner |
|---|---|
| Niyamavali **§8.4** (amend) + **§8.4a** (new comparison table), `en` + `hi` | §8.5, §8.6, §8.8, §8.9 and the §8.2/§8.3 edits → **10.20** (grounds/principles), **10.22** (appeal) |
| A routing note + `.decision-log.md` Decision settling **Q1–Q6** | Building the off-portal DPDPA route → **10.21** |
| **Q8-carryover** (restoration from termination) as an **AC, not a note** — mandated by Decision `2026-08-10-096` clause 8 | Building the moderation appeal → **10.22** |
| The terminated **login block** — an overlay read at `member-auth.handlers.ts:71`, timing-equalised | The `decision_note` rename / escalation justification / evidence refs → **10.20 (WS-B, WS-C)** |
| The **refresh-rotation** block (`member-auth.service.ts:198-208`) | The five `TERMINAL_STATES` Sets — **untouched by AC6** |
| The **self-contained notice**: shape, `en`+`hi` copy, no portal dependency | A 10th `AlertCategory` / FR-71 amendment → PM (Story 5.2 froze "FR-71 = 7. Full stop.") |
| Correcting **every** Decision-6 assertion site (AC9's five-site table) | Story 10.10 is **not reopened** — its audit, event, notice, RTBF-scrub and RLS work stands |
| `AI-10-2` invariant block at the point of use | `architecture.md` — **not amended** (Decision `2026-08-04-072` clause 3) |
| The member app's terminated 403 rendering ⚠ *scope addition, see below* | The `alert_published` deep-link landing on the announcement feed — a **pre-existing** 10.10 forward commitment |

⚠ **Scope additions beyond the epic's literal AC, flagged per the Story 10.18 convention:**

- **The Niyamavali §8.4/§8.4a work (AC1–AC2).** The epic AC does not name it. Its provenance is
  (a) Story 10.18's routing — *"the ten remaining Part 8 items … owned by Stories 10.19 and 10.20"*
  (`deferred-work.md:3650`), (b) the SCP §4d table rows sourced **D5**, and (c) premise #9: the epic's own
  *"Given D5's ratified principles"* is otherwise unsatisfiable.
- **AC6's access-token residual disclosure** (premise #4) — the epic asserts the residual is zero.
- **AC10's member-app rendering** — `apps/mobile/app/(auth)/otp.tsx:73-79` funnels every non-`rejoin_locked`
  error into `t('auth.otp_error_invalid')` ("invalid code"). A terminated member would be told their
  correct OTP was wrong. That is the copy-truth defect class, on the one surface where the AC promises the
  member an honest explanation.

---

## Acceptance Criteria

> ## ✅ RULED 2026-08-10 — Decision `2026-08-10-097`, confirmed by `2026-08-10-098`
>
> **Every conditional below reads against these values.** Branches not taken are retained as the reasoning
> that motivated the ruling, not as live options.
>
> | Q | Ruling | Binds |
> |---|---|---|
> | **Q1** | **(a)** restoration from termination requires a formal **Trustee Panel act**, stated expressly in §8.4 | AC3 |
> | **Q2** | **(a)** the notice's *Summary* is a **first-class ABSENT element** (`{ available: false }`) until 10.20 | AC8 |
> | **Q3** | **(b)** ⚠ **NO** off-portal channel guarantee — in-app-only. *Ruled against the author's recommendation.* | AC8, AC11 |
> | **Q4** | **(a)** §8.4a lands **complete**, with the four-row mechanization disclosure. No `APPENDIX A` entry. | AC1 |
> | **Q5** | **(a)** attestation-only precedent extends; counsel review **OWED, un-attested** | AC1 |
> | **Q6** | **(b-i)** default-OFF flag; **flip gated on Story 10.21 landing only** — ⛔ *not* on the identity control | AC4–AC11 |
> | **Annex** | **All three affirmed, ratified-as-written** (`098`): the capability bar extends into authentication; the block fails open; the flag is overlay-named. **The capability-bar entry is authorised.** | AC4 |
>
> ### ⭐ The Panel's member-facing direction — and the domain model it requires
>
> Decision `097` clause 8 (Panel-authored) requires a **controlled termination state, not a generic
> authentication failure**. `098` adopts the **no-session** implementation of it and fixes the vocabulary:
>
> ⛔ **"Login succeeds but returns 403" is the wrong model and must not appear in code, comments, tests or
> copy.** It collapses two distinct things. The domain sequence is:
>
> > **1.** OTP verification **succeeds** → **2.** termination status is **established** → **3.** session
> > issuance is **denied** → **4.** a **structured termination response** is returned → **5.** the client
> > renders the **termination surface**.
>
> **Identity verification succeeded; authorization to establish a member session did not.** The HTTP
> representation may remain whatever the existing auth flow requires — the status code is a transport
> detail. **The domain semantics are not.** Name things for step 3, never for a failed login.

**Given** SCP §4d row 10 (D5) and the §8.4a comparison table at `sprint-change-proposal-2026-08-04.md:540-563`
**When** the Part 8 amendment lands
**Then** `docs/legal/niyamavali.md` §8.4 **retains its existing two clauses** (reinstatement-only recovery;
the `[[12-month]]` rejoin lock) and **gains** the D5 principles:

> **Termination ends membership, not history.** The Trust shall preserve the historical record of the
> member's participation, moderation decisions and financial transactions in accordance with its retention
> obligations, while ending all membership privileges and authenticated member access.
>
> **Statutory rights survive termination.** Termination ends authenticated member access. Any statutory
> rights of access, correction, portability or erasure shall be exercised through an **identity-verified
> administrative process designated by the Trust**.

**And** a new **§8.4a** carries the twelve-row suspension-vs-termination comparison table
**And** `docs/legal/niyamavali.hi.md` receives both at the structurally identical position — **the Hindi is
a co-equal governing instrument, not a translation artifact** (`counsel-roster.md:32`: *"The Niyamavali is
Hindi-primary"*)
**And** the `:196` reserved-numbers note is left **unchanged** — §8.4a is not one of the numbers it reserves
**And** both texts are reproduced **verbatim, both locales**, in the `.decision-log.md` entry, because
`docs/legal/` is gitignored and that entry is the only durable copy
**And** **no** version bump, `Effective:` date, or `[LEGAL]` line is written, and none may be inferred
**And** **no `APPENDIX A — RULE INDEX` entry** is added in either locale unless the Panel's Q4 ruling
requires one — §8.4a is a comparison, not an indexable `R`-rule (the Decision `2026-08-10-096` clause 10
precedent); record the absence so a later reader does not read it as an omission

### AC2 — Q1–Q6 are ROUTED to the Trustee Panel, never authored unilaterally

**Given** `[[feedback_governance_commits_precede_implementation]]` and the Story 10.18 precedent
**When** the governance half begins
**Then** a routing note `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-story-10-19.md`
is authored **and committed ALONE** on a `governance/…` branch **before any `packages/` or `apps/` change**,
carrying six questions, each with options, a ⭐ recommendation, and a **"Feeds"** column naming which AC the
answer unblocks:

| Q | Question | Feeds |
|---|---|---|
| **Q1** | **Restoration from termination** — does restoring a *terminated* member require a formal Panel act, distinct from the single-actor `trustee-discretion` path that restores a *suspended* member? ⚠ **Second deposit. May not be deferred again.** | AC3 |
| **Q2** | **The Summary line** — 10.20's structured `decision_note` does not exist yet. Is the notice's *Summary* (a) **omitted as a first-class absent element** until 10.20 lands, (b) **authored by the trustee** at termination time as a separate non-Tier-1 member-facing field, or (c) derived from the Tier-1 rationale (⛔ prohibited by the epic AC) | AC8 |
| **Q3** | **Channel guarantee** — must the termination notice attempt at least one **off-portal** channel (SMS/WhatsApp), exempt from cost-optimisation suppression? An in-app-only notice to a member who can no longer log in reaches nobody. ⚠ **The Panel must be told what "yes" costs — see the Q3 mechanism note below; there is no free lever** | AC8 |
| **Q4** | **§8.4a rows that name safeguards not yet built** — the *escalation justification*, *notice-and-opportunity-to-respond* and *prior-sanction-required* rows describe 10.20/10.22 work. Land the table **complete with a mechanization-status disclosure**, or land only the rows already true? | AC1 |
| **Q5** | **Counsel** — does Decision `2026-08-06-080`'s Panel-attestation-only precedent, extended to §8.7 by Decision `2026-08-10-096` clause 5, extend again to §8.4/§8.4a? | AC1 |
| **Q6** | **Sequencing against Story 10.21** — this story *creates* the DPDPA gap 10.21 closes: after the block, a terminated member cannot reach Story 3.11's member-portal export, and no off-portal route exists. Ship the block now under a restated release gate, ship it behind a default-OFF flag (the 10.23 precedent), or hold it? ⚠ **This is the widest-blast-radius question in the set — it decides whether the implementation half ships at all** | **AC4, AC5, AC7, AC8, AC9, AC10**, AC11 |

⚠ **Q3 mechanism note — the option set the Panel must actually see.** A "yes" on Q3 is not free, and the
routing note must say so rather than letting the cost surface after the ruling. `evaluateCostOptimization`
(`packages/channels/src/cost-optimization.ts:162-197`) exposes exactly four levers, and three of them are
closed to this story:

| Lever | Scope | Available? |
|---|---|---|
| `timeCritical` (`:164`) — the only full per-alert bypass | per-alert | ⛔ AC8 pins `time_critical: false` (UX Stance #5) |
| `toggleEnabled` (`:168`) | per-Pariwar | ✗ not per-alert |
| `lastEngagementAt` (`:172`) | per-member state | ✗ not addressable |
| `windowMsByCategory` (`:177`) | per-**category** | ⚠ the notice ships `alert_category: 'alert_published'` (`moderation-notify.ts:151`), **shared** with `news-publish.ts:161` and `contribution-notify-triggers.ts:310` — retuning it silently changes Story 10.5's announcements and contribution reminders |

⇒ a "yes" therefore costs a **fifth mechanism that does not exist today**: a new per-alert exemption field on
`CostOptimizationInput` (`:125-138`) plus its branch in `evaluateCostOptimization`, i.e. a **`packages/channels`
contract change**. Present that to the Panel as the explicit price of "yes", alongside the two ⛔ options
(`time_critical: true`; a 10th `AlertCategory`) and **why both are refused**. ⭐ Recommendation: rule "yes"
**and** authorise the `CostOptimizationInput` field, since an in-app-only notice to a member who can no longer
open the app is a notice to nobody — but the Panel rules, not this story
⚠ **Q6 branch note — a "hold" ruling makes two ACs write falsehoods, so they are conditional too.** AC8 and
AC9 both correct copy whose truth value **this story's block is what changes**:

- **AC8** strips *"You can sign in as usual and request a review from your membership status page"* from the
  terminated notice body. If the block is held, **that sentence is still true** and removing it makes the
  notice wrong in both locales.
- **AC9** rewrites five sites to say *"suspension keeps login, termination does not."* If the block is held,
  **termination does still keep login**, and the sweep would replace five accurate comments with five
  inaccurate ones — the copy-truth defect class this story exists to close, inverted.

⇒ under a **hold** ruling the story lands as its **governance half only** (AC1, AC2, AC3, AC11), and AC4–AC10
are recorded in AC11 as ruled-deferred with the Q6 entry as their re-trigger. Under **default-OFF**, AC8/AC9
land but must describe the **flag's default** as the shipped truth, not the flag-on behaviour. ⛔ Neither
branch is a licence to sweep first and reconcile later
**And** the ruling is recorded as a single `.decision-log.md` entry with **per-clause provenance** — Decision
`2026-08-09-095` made per-clause provenance **mandatory on any entry mixing ratification with author
analysis**; an author-written clause must be labelled `[Author-committed]`, never flatly "Trustee-ratified"
**And** the note states plainly what a ruling does **and does not** mean (the AC-preamble table above)
**And** `git log` reads **governance → governance → implementation**; the implementation branch is **cut
from the ratifying commit**, so the ordering is structural rather than asserted

### AC3 — Q8-carryover: restoration from termination is answered HERE, as an acceptance criterion

**Given** Decision `2026-08-10-096` clause 8, verbatim: *"whether restoring a TERMINATED member requires a
formal Panel ceremony is deferred to **Story 10.19**, which must carry it **as an acceptance criterion, not
as a note**. … ⚠ **This is the question's second deposit.** … A deferral to a story that does not carry it as
an AC is how it lapsed the first time"*
**When** the Panel rules Q1
**Then** the ruling is **implemented or explicitly recorded as an implemented decision** in this story — a
third deferral is **not an available outcome**
**And** if the ruling requires a distinct authority for restore-from-terminated, the implementation point is
`performAction`'s legality path in `apps/api/src/modules/member-moderation/handlers.ts:174-258` **and**
`nextModerationStatus`'s `terminated --restore--> none` arm (`status.ts:47-48`) — the arm is **not removed**;
a *precondition on the caller* is added, mirroring 10.20's WS-D shape
**And** if the ruling is that the single-actor path stands, that is recorded as a **ruled outcome**, not as
an unexamined default, and the deferred-work entry at `deferred-work.md:3594` is **closed** with
`[[feedback_closure_language_precision]]` verbs
**And** either way the entry stops being carried forward — this story is where the question terminates

### AC4 — The login block is an OVERLAY READ, timing-equalised in ONE branch

**Given** moderation is an **overlay, not a lifecycle state**
**When** `completeMemberLogin` gates a session (`apps/api/src/modules/auth/member/member-auth.handlers.ts:50-82`)
**Then** it performs a **second read** — `memberDomain.moderation.getCurrentMemberModerationOverlay(deps.serviceDb, ids.memberId(…))`
— alongside the existing `getMemberStateAt` call, and **blocks a `terminated` overlay standing** (⛔ not via a
bare `=== 'terminated'` equality — see the exhaustiveness clause below, which governs the form this check takes)
**And** the **unbounded** (`getCurrentMemberModerationOverlay`) variant is used, **never** the `at`-bounded
`getMemberModerationOverlay`: `occurred_at` is DB-generated while every `deps.clock()` is the app clock, and
under app-clock-behind-DB skew the bounded read would fold `status: 'none'` and let a terminated member in.
The rationale is already written out at `packages/domain/src/member/moderation/overlay.ts:132-149` — **read
it before choosing**
**And** the terminated block and the existing withdrawn block share **ONE branch and ONE
`setTimeout(100 + Math.random() * 100)`** — a second, separately-written sleep is a divergence waiting to
happen, and the AC's "exactly like" is a same-code-path requirement
**And** the audit event stays `member_login.failure` with a **distinct `reason`** (`terminated`), so the two
blocks remain separable in the audit log
**And** the thrown error carries a **distinct code** — `auth.member_terminated`, **not** a reuse of
`auth.member_withdrawn`: the caller has already proven possession of the OTP for that mobile, so they *are*
the member, and an honest code is what AC10 renders. `ForbiddenError(message, code, details?)` takes a
free-form `code` string (`apps/api/src/http-errors.ts:54-58`); there is no enum to extend

**And** ⭐ **the response is STRUCTURED, not a bare error code** (Decision `097` clause 12, confirmed `098`).
A bare code forces the client to invent the notice, which is how the two locales drift apart and how the
notice stops matching what §8.4 says. The `details` payload carries **the information required to render the
termination notice** — the same elements AC8 defines, minus what the rulings removed:

| Element | Source | Ruling |
|---|---|---|
| **Decision** | `terminated` | — |
| **Ground** | the resolved **label** (`moderationReasonLabelKey`) — ⛔ never a reason CODE, never the Tier-1 rationale, never an actor name | AC8 |
| **Summary** | ⛔ **omitted as a first-class ABSENT element** — `{ available: false }`-shaped, **never an empty string** | **Q2 (a)** |
| **Effective date** | the moderation action's `acted_at` | — |
| **Further communication** | the administrative channel, honest about what exists today | AC10, **Q6 (b-i)** |

⛔ **The payload is the notice's data, not its prose.** Rendered strings live in the i18n catalog with en/hi
parity (AC10); the API returns values, never sentences. A server-rendered sentence would bypass the parity
gate and put member-facing copy outside the tone guide.
**And** ⛔ **nothing about the naming may describe a failed login** — per the ruled domain model, this is
*session issuance denied after successful identity verification*. `blockReason` and the audit `reason` stay
as specified (they name the **cause**, which is correct); it is the doc-comments, test titles and any new
symbol that must not say "login failed"

**And** ⭐ **no session, of any kind, is minted on this path** (Decision `097` clause 11, confirmed `098`).
`issueFullSession` is **not reached**. ⛔ **A restricted, notice-only, or reduced-scope session is expressly
foreclosed** — it would be a new authentication primitive, and it is strictly worse against the direction's
own words, since a restricted session *does* establish privileges and would then need a mechanism proving
they are not "normal" ones. **Notice access is distinguished from ordinary access STRUCTURALLY** — one path
issues a session and the other does not — **never by a flag, scope or claim on a session object.** AC12
pins this.
**And** ⛔ the status check is **exhaustive over `ModerationStatus`, not a bare equality** — a doc-comment is
not a guard. `MODERATION_STATUSES` is `['none', 'suspended', 'terminated']` (`status.ts:21`), and this story
makes that union **load-bearing on the authentication gate** for the first time. The codebase has already
written the warning against itself at `overlay.ts:18-21`: *"the blast radius is SILENT: there is no `never`
guard … so two new labels produce ZERO compile errors while mis-classifying five `TERMINAL_STATES` Sets …"*
An `=== 'terminated'` check inherits exactly that failure mode, and it fails **OPEN**: a future status label
— **Story 10.20's sanction tiers are the live candidate** — would admit a sanctioned member to a full
session with no compile error and no test failure. Write the gate as an exhaustive `switch` (or a
`satisfies`-checked map) over `ModerationStatus` with a `never`-typed default arm, so that adding a label
**breaks the build** and forces an explicit admit/block decision at this gate
**And** ⭐ **the resolved shape — these four clauses are jointly satisfiable in exactly one way, and it is
stated here so the dev agent does not have to rediscover it.** "ONE branch + ONE sleep" and "a *distinct*
audit reason + a *distinct* error code" pull in opposite directions if the check is written as two `if`s.
Resolve by computing the verdict **before** the branch, then branching once:

> 1. Read both signals (`getMemberStateAt`, `getCurrentMemberModerationOverlay`).
> 2. Derive a single nullable `blockReason` — `'withdrawn' | 'anonymized' | 'terminated' | null` — where the
>    moderation contribution comes from the **exhaustive `switch`** over `ModerationStatus` (`none`/`suspended`
>    → not blocking, `terminated` → blocking, `default: never`).
> 3. `if (blockReason !== null) { … }` — **one** branch, **one** `setTimeout(100 + Math.random() * 100)`,
>    with the audit `reason` and the `ForbiddenError` code both read **off `blockReason`**.

This keeps the timing equalisation on a single code path (D2) while still emitting the distinct `terminated`
reason and `auth.member_terminated` code the audit log and AC10 need
**And** ⭐ the block carries the **`AI-10-2`** invariant doc-comment block at the point of use, following the
`AI-10-1` (`packages/domain/src/member/restoration-discipline/overlay.ts:10-53`) and `AI-7-2`
(`apps/jobs/src/assignable-roster.ts:1-53`) shape. It must state: what is read (one overlay field), what is
**not** (no `TERMINAL_STATES` Set, no `members.state` write, no lifecycle label), why the unbounded variant,
and that **suspension is deliberately not blocked**
**And** `architecture.md` is **NOT** amended (Decision `2026-08-04-072` clause 3)

### AC5 — The refresh chain closes the same way

**Given** `rotateRefresh` already re-checks lifecycle state at `member-auth.service.ts:198-208` as
*"belt-and-suspenders over the suspension cascade (`revokeAllMemberSessions`), **which a later epic
wires**"*
**When** a refresh token is presented by a terminated member
**Then** the same overlay read runs there, the device chain is revoked, and the existing
`reason: 'member_blocked'` arm is returned — the handler at `member-auth.handlers.ts:350-357` already maps
it to a 403
**And** ⛔ the `RotateResult` union is **widened to carry the cause** — without this the next clause is not
implementable. `member-auth.service.ts:152-156` today is:

> `| { ok: false; reason: 'member_blocked'; memberId: string; deviceId: string };`

There is **no discriminator**, so the handler cannot know *why* the member is blocked. Add
`cause: 'withdrawn' | 'anonymized' | 'terminated'` to that arm and set it at **both** return sites — the
existing lifecycle arm (`:207`) and the new terminated arm. This is exception 1 of the two the **"Reuse map
— almost nothing here is new"** section below records: the type genuinely must change, and a dev agent that
treats that table as absolute will ship the wrong code
**And** that handler's error code is **corrected**: it currently throws `auth.member_withdrawn` with the
message *"Member is not active"* for **every** `member_blocked` cause. It must report the actual cause,
switching on the new `cause` field — `auth.member_terminated` for `terminated`, `auth.member_withdrawn`
otherwise. ⛔ **Do not** implement this by re-reading member state in the handler: that is a second query to
recover information the service already had and threw away
**And** the stale comment *"which a later epic wires"* is updated — **this is that epic**, and leaving the
sentence makes the next reader hunt for work already done

### AC6 — The five `TERMINAL_STATES` Sets stay untouched, and the residual is stated rather than inherited

**Given** ESCALATION 3
**Then** none of the five Sets (premise #3 table) is modified, and no moderation predicate is added to
`assignable-roster.ts`, `peer-mesh-read.ts`, the niyamavali `member_state_in` operator, or any of them —
the prohibition at `packages/domain/src/member/moderation/index.ts:22-25` is load-bearing and this story
does not become its first exception
**And** **no AC5 deviation is required** (the epic's claim, confirmed)
**And** the story records, in the `AI-10-2` block and in the Decision entry, the **bounded residual**:
`revokeAllMemberSessions` deletes refresh tokens and trusted devices but **cannot invalidate a live access
JWT**, whose TTL is `MEMBER_ACCESS_TTL_MS` (default 15 min, `apps/api/src/config.ts:377`). A member
terminated mid-session retains write access to the five gated surfaces for that window
**And** the residual is **NOT** closed by touching the Sets, by shortening the TTL, or by inventing a
token denylist — each is a larger architectural act than this story owns. It is recorded in
`deferred-work.md` with a named re-trigger, per `[[feedback_record_unattested_no_backfill]]`

### AC7 — Suspension is unaffected, and the pinning test that proves it survives

**Given** D5 requirement 3 — *"a suspended member must retain login: they are curing, they need the
contribution surface, and Story 10.16's disclosure lives there"*
**Then** `moderation-auth-effects.spec.ts:220` (*"a SUSPENDED member can STILL log in — this is the
requirement, not a bug"*) **passes unchanged**, and its defensive comment is preserved
**And** `:242` (*"a TERMINATED member can still log in too"*) is **INVERTED** — same seed, asserting `403`
and `auth.member_terminated` — and its title and rationale are rewritten to name **this** story
**And** the spec's file-header block (`:1-23`) is rewritten: it currently instructs the reader that adding
terminated to the block-list *"is WRONG (Decision 6)"*. Left as-is, it is a comment telling a future
reviewer to revert this story
**And** ⭐ a **revert-sanity PAIR** proves the teeth: revert the handler change and confirm the terminated
test **fails**; confirm the suspended test **still passes** under both states. A gate that passes green
before and after the change proves nothing (`[[feedback_gate_scope_semantic_coverage]]`)
**And** ⚠ **this AC's test posture is conditional on the Q6 ruling, and the branch is stated here rather
than discovered at implementation time** — two of Q6's three outcomes change what `:242` may assert:

| Q6 ruling | `:242` asserts | Revert-sanity pair |
|---|---|---|
| **Ship now** (restated release gate) | `403` + `auth.member_terminated`, unconditionally | as written above |
| **Default-OFF flag** (the 10.23 precedent) | `403` + `auth.member_terminated` **with the flag explicitly forced ON in the test**, plus a second test pinning that with the flag OFF the member still logs in (`200`) — the flag's default is itself the shipped behaviour and must be pinned | the pair runs in the flag-ON state |
| **Hold** | `:242` is **left unchanged and still passing**; AC4/AC5/AC7/AC10 do not ship, and the story lands as its governance half only, recorded as such in AC11 | not applicable — nothing to revert |

⛔ A test that asserts `403` while the shipped flag defaults OFF is a **false green**: it proves the code
path exists, not that termination ends access. Under the default-OFF branch **both** tests are required

### AC8 — The termination notice is self-contained

**Given** the notice **is** the explanation once the portal is closed
**When** a `terminate` action's notice is built
**Then** it carries **Decision · Ground · Summary · Effective date · Further communication**, with **no
portal dependency and no deep link**
**And** the Summary is member-facing prose **derived from** the Decision Note — **never the Tier-1 Decision
Note verbatim**, which may carry detail that must not ride SMS or WhatsApp. Its source is settled by the
Panel's **Q2** ruling; if option (a), it is a **first-class absent element** (`{ available: false }`
shaped, the `[[project_nominee_vpa_deferred_seam]]` precedent), never an empty string rendered as prose
**And** ⛔ `moderation.notice.terminated.body` in **both** `packages/i18n/locales/en/common.json:334` and
`hi/common.json:334` **loses** *"You can sign in as usual and request a review from your membership status
page"* — after this story that sentence is false. The suspended and restored bodies (`:332`, `:336`) are
**unchanged**
**And** en/hi parity holds (the i18n parity gate) and Hindi is authored as **primary**, not translated
**And** the notice still carries **no rationale, no reason CODE, no actor name** — the reason reaches the
member as a resolved **LABEL** (`moderationReasonLabelKey`, `apps/jobs/src/scheduler/moderation-notify.ts:78-80`)
**And** the Q3 ruling on channel guarantee is implemented at `fanOutAlert`'s cost-optimisation step
(`apps/jobs/src/scheduler/contribution-notify.ts:282-300`, reached via `fanOutAlertToMembers` → `fanOutAlert`)
if the Panel rules an off-portal attempt is mandatory — ⛔ **without minting a 10th `AlertCategory`**: `Alert`
is a `.strict()` discriminated union and a new category would redefine FR-71 from 7 push categories to 8,
which Story 5.2 froze in terms
**And** ⛔ **the exemption is carried by whichever mechanism the Q3 ruling authorised, and by no other.** The
two forbidden levers (`time_critical: true`, a 10th category) stay forbidden, and the per-category
`windowMsByCategory` lever is **not** an available substitute — `alert_published` is shared with
`news-publish.ts:161` and `contribution-notify-triggers.ts:310`, so tuning it is a cross-story side effect on
Stories 10.5 and 8.x, not a local fix. If the Panel authorised the new `CostOptimizationInput` exemption
field, the `packages/channels` change lands **with its own pure unit test** asserting that the exemption
bypasses suppression *and* that every other category's behaviour is unchanged. If the Panel ruled "no", the
in-app-only reach limitation is recorded in **AC11** as a known, ruled-upon gap — never left implicit
**And** `time_critical` stays **`false`** — a termination notice is not AR-18 time-critical, and marking it
so would be the countdown pressure UX Stance #5 forbids

### AC9 — Decision 6 is recorded as superseded at every site that asserts it

**Given** Decision 6's justification was reaching an appeal CTA that does not exist
**Then** it is recorded as **superseded** — per `[[feedback_supersede_never_reinterpret]]`, the original
Decision-6 record is **NOT edited in place**; a new record supersedes it
**And** **all five live assertion sites** are corrected — a partial sweep leaves the codebase arguing with
itself:

| # | Site | What it says today |
|---|---|---|
| 1 | `apps/api/src/modules/member-moderation/handlers.ts:226-230` | *"⚠ This is NOT a login block … a moderated member MUST be able to sign back in to read the dignified explanation and reach the appeal CTA (Decision 6) … never a locked door"* |
| 2 | `apps/api/src/modules/auth/member/member-auth.repo.ts:432-437` | *"⚠ This is NOT a login block. A suspended or terminated member MUST still be able to sign in … (Decision 6)"* |
| 3 | `apps/api/tests/integration/member-moderation/moderation-auth-effects.spec.ts:1-23` | the AC6 header block (see AC7) |
| 4 | `packages/ui/src/member-status/view-model.ts:87-88` | *"the dignity commitment that justifies Decision 6 keeping login open at all"* |
| 5 | `packages/ui/src/member-status/presenter.ts:322-336` (`FAILURE_STATES` definition) and `:410` (`showAppealCta` render gate) | `FAILURE_STATES` includes `terminated-with-reason` so the appeal CTA renders for a member who can no longer reach it |

**And** each correction states the **new** truth — suspension keeps login, termination does not — rather
than deleting the sentence and leaving a silent gap
**And** site 5 is **not** resolved by removing `terminated-with-reason` from `FAILURE_STATES`: the panel is
also rendered in the **admin** variant (`apps/admin/tests/member-status-panel.test.tsx`), where a terminated
member's record is legitimately viewed by staff. Record the member-variant unreachability; leave the
CTA's real destination to **Story 10.22**

### AC10 — The member app tells a terminated member the truth

**Given** `apps/mobile/app/(auth)/otp.tsx:73-79` maps every `verifyOtp` failure to
`t('auth.otp_error_invalid')` ("invalid code")
**When** the API returns 403 `auth.member_terminated`
**Then** the app keys on `ApiError.code` (**not** a bare 403), following the *technique* of the
`auth.rejoin_locked` precedent at `:52-54`, and renders a dignified surface mirroring
`apps/mobile/app/(auth)/rejoin-locked.tsx`: what has happened, and the channel through which records and
statutory rights are obtained
**And** ⚠ **the edit site is the OUTER catch at `:73-79`, not the precedent's own block.** `:52-54` sits in
the **inner** `catch (createErr)` wrapping `signupCreate` — the *signup* path. `auth.member_terminated` is
thrown by `completeMemberLogin` on the *verifyOtp* path, so it lands in the **outer** `catch (e)`, which today
resolves to the 429 branch or `auth.otp_error_invalid`. Add the code-keyed branch there, **ahead of** the
existing 429/generic ternary; a dev agent that edits `:52-54` will have written a branch the terminated
response never reaches
**And** it does **not** claim the OTP was wrong, and does **not** link into the portal
**And** its copy lives in the i18n catalog with en/hi parity, Hindi primary
**And** ⚠ the surface names an **administrative channel**, and the route behind that channel is **Story
10.21's** — the copy must be honest about what exists today rather than promising a route that is `backlog`

**And** ⭐ **the surface RENDERS FROM THE AC4 PAYLOAD**, not from hardcoded strings keyed off the code alone
— Decision, Ground label, Effective date, Further communication, with **Summary structurally absent**
(`{ available: false }`, ⛔ never a blank line rendered as prose). The screen must degrade honestly if an
element is missing rather than substituting placeholder text.

**And** ⭐ **access to PUBLIC TRUST CONTENT is expressly PRESERVED, without authentication** (Decision `097`
clause 8, confirmed `098`). The termination surface is **not a dead end**:

- The member reaches public Trust content (the public pages surface) **with no session and no
  re-authentication** — it is already unauthenticated, so this is a **preservation** requirement, not a new
  capability. ⛔ **The AC is that nothing in this story breaks it**, and a test proves the route is reachable
  from the termination surface.
- ⚠ **The termination surface must not be rendered inside an authenticated navigator or shell.** It sits on
  the `(auth)` stack alongside `rejoin-locked.tsx` — a surface reached from a member-tab layout would drag a
  session-shaped context behind it and quietly contradict AC12.
- ⛔ **No link into the portal, and no CTA that would require a session.** "Public content" means public;
  a link that lands on a login wall is a worse dead end than no link.

### AC11 — What this story does NOT close is recorded

**Given** the Story 10.18 convention (its AC9)
**Then** the story records explicitly:
1. **Story 10.21 is not unblocked and the DPDPA gap is OPEN.** Terminated members lose Story 3.11's
   member-portal export with no off-portal replacement. The disposition is the **Q6 ruling** — recorded,
   not assumed
2. **Story 10.22 is not unblocked.** The appeal CTA still has no moderation destination; this story removes
   the *justification* Decision 6 built on it, not the *need* for it
3. **The access-token residual stays open** (AC6) with a named re-trigger
4. **§8.5, §8.6, §8.8, §8.9 and the §8.2/§8.3 edits stay unlanded** — 10.20 and 10.22 own them
5. **None of the standing Trustee Panel obligations is discharged**, and this story opens at least one more
   (whatever Q1–Q6 leave owed). State the count honestly rather than implying progress
6. **If Q3 ruled "no"**, the termination notice is **in-app-only** to a member who can no longer open the
   app in an authenticated state. Record that as a **ruled-upon reach limitation**, with the
   `CostOptimizationInput` exemption field named as the re-trigger — never as an unexamined default
7. **If Q6 ruled "hold" or "default-OFF"**, record exactly which of AC4–AC10 did not ship and under which
   ruling, with the Q6 entry as the named re-trigger. ⛔ A story that lands its governance half and silently
   drops its implementation half is how `[[project_r7_fact_producer_unbuilt]]` happened — the deferral must
   name **this story's Q6 decision**, not "a later epic"

---

### AC12 — ⭐ The termination-notice path establishes NO session and NO member privileges, and a test proves it

**Given** Decision `2026-08-10-097` clause 8 — *"The notice-only path must not establish normal member
privileges"* — adopted as the **no-session** implementation by clause 11 and confirmed by `2026-08-10-098`
**And** the failure this AC exists to prevent, stated plainly: **a future implementation quietly issuing a
normal session because OTP authentication succeeded.** That is not a hypothetical — it is the most natural
mistake at this seam, because step 1 of the domain sequence genuinely *does* succeed, and the code path sits
inside a function whose name and history are about completing a login
**When** a terminated member completes OTP verification with the flag **enabled**
**Then** a test asserts **all** of the following, and asserts them **positively** rather than by the absence
of a 200:

| # | Assertion | Why a weaker form is insufficient |
|---|---|---|
| 1 | **No session token of any kind** is present in the response — no access token, no refresh token, no `Set-Cookie` session material | Asserting only "not 200" passes even if a token is issued alongside a 403 |
| 2 | **No refresh-token row and no trusted-device row** is created for the member by this request | A response-only assertion cannot see a server-side write |
| 3 | **`issueFullSession` is not invoked** | The one assertion that fails if a future edit re-enters the session path *before* the block |
| 4 | **The structured payload IS present** — Ground label, Effective date, Further communication, and Summary structurally absent | Proves the path is a *controlled termination state*, not a generic failure (clause 8) |
| 5 | **A subsequent authenticated call, using anything the response returned, is refused** | Closes the "it wasn't a session, it was just a token" reading |

**And** ⛔ **the OTP-succeeded premise is explicit in the test**, not incidental: the test verifies a
**correct** OTP and asserts the outcome is nonetheless session-denial. A test that supplies a wrong OTP
would pass for the wrong reason and would keep passing after the block was deleted
**And** ⭐ a **revert-sanity PAIR** proves teeth (`[[feedback_gate_scope_semantic_coverage]]`): revert the
session-denial branch and confirm assertions 1–3 **fail**; confirm the **suspended** member's session is
still issued under both states. A gate green before and after the change proves nothing
**And** the test names the **domain sequence**, not a failed login — *"identity verified, session issuance
denied"* — so the next reader inherits the ruled vocabulary rather than re-deriving it
**And** ⚠ with the flag **OFF** (the shipped default under Q6 (b-i)) a **second** test pins that the member
**does** receive a normal session, because that is the shipped truth until Story 10.21 lands and the Panel
authorises the flip. ⛔ Asserting only the flag-ON behaviour while the default is OFF is a **false green**

---

## Load-Bearing Decisions

### D1 — ⭐ The governance half is not a preamble; it is half the story.

The epic's AC begins *"Given D5's ratified principles"* and D5 is not ratified (premise #9). Shipping the
login block first would mean the system enforces a rule the governing instrument does not yet state — the
exact inversion `[[feedback_governance_commits_precede_implementation]]` exists to prevent, and the exact
shape Story 10.18 established. **Commit order is structural: routing note alone → Decision → implementation,
branch cut from the ratifying commit.**

### D2 — One branch, one sleep.

The AC says "timing-equalised **exactly like** the existing withdrawn block." Two sleeps drift; one branch
cannot. Fold the terminated check into the existing `if` rather than adding a sibling block below it.

### D3 — The unbounded overlay read, always.

`getCurrentMemberModerationOverlay`, never `getMemberModerationOverlay`. The reasoning is already written at
`overlay.ts:132-149` and it is a *correctness* argument, not a preference: an app clock behind the DB clock
makes the bounded read fold `none` and admit a terminated member. The `at`-bounded variant remains right for
point-in-time validity replay and wrong here.

### D4 — The residual is disclosed, not engineered away.

15 minutes of live access token is real. Closing it properly means a token denylist or a per-request
revocation check — an architectural act with its own performance and design consequences, and not something
to smuggle in under a `[SURFACE]` story. **Disclose, name a re-trigger, move on.**
`[[feedback_record_unattested_no_backfill]]`.

### D5 — The five Sets are not this story's to touch, even though they look like the obvious fix.

They are the ESCALATION-3 framing the SCP explicitly *dissolved*. Adding a moderation predicate to them
forks AI-7-2 into five places and re-creates the coupling Story 10.17 spent a story unwinding.

### D6 — Correcting the Decision-6 comments is load-bearing, not tidy-up.

Site 1 and site 2 are instructions to a future reader that this story's change is a bug. Site 3 is the same
instruction inside the test that guards it. Leaving any of them is how a correct change gets reverted six
months later with a confident commit message.

### D7 — Notice copy is SYSTEM copy; no tone-review gate applies.

`moderation-notify.ts:26-31` is explicit: the moderation notice is catalog copy, Hindi-first, **not**
per-action authored copy — so unlike Stories 10.5/10.9 no human tone-review gate fires. That does not lower
the bar; it means the bar is the catalog's en/hi parity gate plus this story's own review.

### D8 — `[SURFACE]`, not `[PRIMITIVE]`.

No new table, no new event type, no new state machine. The overlay, the events, the notice worker and the
cascade all exist. This story reads them from one more place and tells the truth in three more.

---

## Tasks / Subtasks

### Task 0 — Orient (AC: all)

- [ ] Read, in order: `epics.md:3797-3830` (this story's AC) · `moderation-model-decision-brief.md:322-380`
      (D5 in full) · `sprint-change-proposal-2026-08-04.md:540-563` (the §8.4a table) · `.decision-log.md` Decision `2026-08-04-072` (architecture
      scope) and `2026-08-10-096` clauses 5, 8, 10 (the precedent + the Q8 mandate)
- [ ] Read the five files AC9 lists **before** editing any of them
- [ ] Confirm premises #1–#6 at the current SHA. Any drift → **record it, do not silently re-pin**
      (`[[feedback_verify_before_committing_governance_claims]]`)
- [ ] Cite **symbols, not line numbers**, in anything destined for `.decision-log.md` — Story 10.18's own
      code review found **five** stale line pins inside a ratified entry, all from the same door

### Task 1 — ⭐ FIRST: the routing note (AC: 2)

- [ ] Branch `governance/10-19-termination-part-8`; author
      `trustee-panel-routing-note-<date>-story-10-19.md`, six questions, options + ⭐ + **Feeds** column
- [ ] Include the "What a ruling means / does NOT mean" table and the queue of undischarged Panel obligations
      this note joins
- [ ] **Commit the note ALONE.** No `packages/`, no `apps/`, no `docs/legal/` change in this commit

### Task 2 — Obtain the ruling (AC: 1, 2, 3)

- [ ] Present Q1–Q6; record the outcome per question
- [ ] ⛔ **Q1 may not return "defer."** If the Panel does not rule it, the story **blocks** — a third deposit
      is the failure mode Decision `2026-08-10-096` clause 8 exists to prevent
- [ ] Write the `.decision-log.md` entry with **per-clause provenance** (Decision `2026-08-09-095`)

### Task 3 — Author §8.4 + §8.4a, both locales, and record verbatim (AC: 1)

- [ ] Amend `docs/legal/niyamavali.md` §8.4 (retain existing clauses, add the two D5 principles); insert
      §8.4a after it
- [ ] Mirror both into `docs/legal/niyamavali.hi.md` at the structurally identical position, Hindi authored
      as primary
- [ ] Leave the `:196` reserved-numbers note unchanged
- [ ] Reproduce **both texts, both locales, verbatim** in the Decision entry — `docs/legal/` is gitignored
- [ ] Apply the Q4 ruling on un-mechanized rows; record `APPENDIX A`'s deliberate absence

### Task 4 — The login block + `AI-10-2` (AC: 4, 6)

- [ ] In `completeMemberLogin`, add the overlay read beside `getMemberStateAt`; fold `terminated` into the
      existing block branch; single jittered sleep
- [ ] Distinct audit `reason: 'terminated'`; `ForbiddenError('…', 'auth.member_terminated')`
- [ ] Write the `AI-10-2` block: what is read, what is not, why unbounded, why suspension is exempt, and the
      access-token residual
- [ ] Verify **all three** entry points are covered — `otpVerify` single-membership (`:288`),
      `selectPariwar` (`:330`), and the refresh path (Task 5). The first two both route through
      `completeMemberLogin`; **confirm, do not assume**

### Task 5 — The refresh path (AC: 5)

- [ ] ⭐ **First**: widen `RotateResult`'s `member_blocked` arm with `cause: 'withdrawn' | 'anonymized' |
      'terminated'` (`member-auth.service.ts:152-156`) and set it at **both** return sites. The rest of this
      task does not compile into a correct result without it
- [ ] Add the overlay read to `rotateRefresh` beside the existing `getMemberStateAt` check; revoke the chain;
      return `member_blocked` **with its cause**
- [ ] Correct the handler's error code so `member_blocked` reports its actual cause — switch on `cause`, do
      **not** re-read member state in the handler
- [ ] Update the *"which a later epic wires"* comment

### Task 6 — The notice (AC: 8)

- [ ] Implement the Q2 Summary ruling and the Q3 channel ruling
- [ ] Rewrite `moderation.notice.terminated.body` in `en` **and** `hi`; leave suspended/restored untouched
- [ ] Confirm no rationale / no reason code / no actor name rides the payload; `time_critical` stays `false`
- [ ] ⛔ No 10th `AlertCategory`

### Task 7 — Sweep every Decision-6 site (AC: 9)

- [ ] All five sites in the AC9 table, each stating the new truth
- [ ] Invert `moderation-auth-effects.spec.ts:242`; rewrite the file header; **leave `:220` passing**

### Task 8 — The member app (AC: 10)

- [ ] Key on `ApiError.code === 'auth.member_terminated'`; route to a dignified surface mirroring
      `rejoin-locked.tsx`
- [ ] Catalog copy, en/hi parity, honest about what exists today

### Task 9 — Q8-carryover (AC: 3)

- [ ] Implement or record the Q1 ruling at `performAction` / `nextModerationStatus`'s caller — **the
      `terminated --restore--> none` arm is not removed**
- [ ] Close `deferred-work.md:3594` with precise closure language

### Task 10 — Governance records + what is NOT closed (AC: 11)

- [ ] `deferred-work.md`: the access-token residual, the owed counsel review, the open DPDPA gap, plus
      whatever Q1–Q6 leave owed — each with a **named re-trigger**, never "a later epic"
      (`[[project_r7_fact_producer_unbuilt]]`: a deferral naming an epic expires unowned)
- [ ] The AC11 five-item "does NOT close" list, in the story and in the Decision entry
- [ ] `sprint-status.yaml`: flip `development_status[10-19-termination-ends-membership-privileges]` and
      prepend **one combined** reverse-chron `last_updated` comment entry

### Task 11 — Validate (AC: all)

- [ ] The **revert-sanity PAIR** of AC7 — terminated test fails on revert, suspended test passes both ways
- [ ] `pnpm ci:local` green (`--concurrency=4`; `[[project_ci_local_concurrency_oversubscription]]`)
- [ ] Live-DB suites: run any suspect spec **in isolation** before blaming this story
      (`[[project_known_livedb_test_failures]]`; test DB `twt-test-pg`:5433). Do **not** regenerate an applied
      migration and do **not** `DROP SCHEMA`
- [ ] Any failure claimed pre-existing must be **proven** pre-existing at `baseline_commit`

---

### Review Findings

_bmad-code-review, 2026-08-11 — branch diff `6f1b165..HEAD`, three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor)._

- [x] [Review][Patch] `onAccess` audit hook is defined on `resolveSessionDenial`'s input but never supplied by either production call site — the audit-observability pattern `manual-fallback-seam.ts` establishes isn't followed here. Resolved: wire it at both call sites, matching `manual-fallback-seam.ts`'s audit-event shape. [`termination-block-seam.ts:144,198-200`, `member-auth.handlers.ts:132-138`, `member-auth.service.ts:252-257`]
- [x] [Review][Patch] `terminated.tsx`'s own doc-comment claims the screen is "Reached when `verifyOtp` or a token refresh returns 403 `auth.member_terminated`," but `apps/mobile/lib/session.ts`'s `refreshAccessToken()` (unchanged by this diff) clears the session and returns `null` on any 4xx without ever navigating there — a member terminated mid-session during a background token refresh is silently logged out with no notice. Resolved: implement the navigation so a background-refresh 403 `auth.member_terminated` routes to `/(auth)/terminated`, making the comment's claim true. [`apps/mobile/lib/session.ts:107-123`, `apps/mobile/app/(auth)/terminated.tsx:1-3`]

- [x] [Review][Patch] `moderationDeniesSession`'s exhaustive-switch `throw` (the `never`-guard defense against a future `ModerationStatus` label) is never caught anywhere in the call chain — not in `resolveSessionDenial`, not at either call site — contradicting the module's own repeated "FAIL OPEN" invariant for every other degraded path in the same function; a new status value would 500 login/refresh instead of degrading gracefully. [`apps/api/src/modules/auth/member/termination-block-seam.ts:121-133,229`]
- [x] [Review][Patch] The mobile termination surface never reads `further_communication.channel`/`route_available` from the AC4 payload — `otp.tsx` only forwards `ground_label_key`/`effective_at` to the router, and `terminated.tsx` renders a hardcoded i18n string unconditionally. AC10 explicitly requires the surface to "RENDER FROM THE AC4 PAYLOAD... Further communication" and "degrade honestly if an element is missing." Confirmed: the API does return `further_communication: { channel, route_available }` (`handlers.ts`) but it's dropped on the client. [`apps/mobile/app/(auth)/otp.tsx`, `apps/mobile/app/(auth)/terminated.tsx:3796-3799`]
- [x] [Review][Patch] AC12 assertion 5 ("A subsequent authenticated call, using anything the response returned, is refused") is not implemented by the shipped test — it substitutes a JWT-shape scan of the response body (`jwtLikeStrings`), which re-proves assertion 1 (no token present) rather than assertion 5 (a second authenticated call using the response is refused). [`apps/api/tests/integration/member-moderation/termination-access-block.spec.ts:2957-3424`, JWT-scan at `:3154-3199`]
- [x] [Review][Patch] `rotateRefresh` (refresh path) passes no `onError` to `resolveSessionDenial`, unlike `completeMemberLogin` (login path) — refresh-path flag/overlay lookup failures are silently swallowed with zero telemetry. [`apps/api/src/modules/auth/member/member-auth.service.ts:252-257` vs `member-auth.handlers.ts:132-138`]
- [x] [Review][Patch] `SessionDenialInput.lifecycleState` is typed as bare `string` rather than the domain's `MemberLifecycleState` union, so the `'withdrawn'`/`'anonymized'` string-literal checks have no compile-time typo protection — the same failure class the exhaustive `ModerationStatus` switch three lines below it was written specifically to prevent. [`apps/api/src/modules/auth/member/termination-block-seam.ts:140,179-183`]
- [x] [Review][Patch] `resolveSessionDenial`'s doc-comment header ("why the flag is read FIRST", numbered 1-flag/2-lifecycle/3-overlay) doesn't match execution order — the code runs the lifecycle check first (self-labeled `(2)`), then the flag (`(1)`), then the overlay (`(3)`), against its own header's numbering. [`termination-block-seam.ts:150-159` vs `:177-227`]
- [x] [Review][Patch] `otp.tsx` casts `e.details` to a typed shape without runtime validation of field types before forwarding values into router params. [`apps/mobile/app/(auth)/otp.tsx`, the `verifyOtp` catch block]
- [x] [Review][Patch] `termination-access-block.spec.ts`'s `enableBlockFor` test helper hardcodes an unasserted magic `version: 2`, relying on an unstated coupling to the flag registry's default version numbering; if the versioning baseline ever changes this row could silently become inert. [`apps/api/tests/integration/member-moderation/termination-access-block.spec.ts:3109-3118`]

- [x] [Review][Defer] `ForbiddenError`'s message hardcodes "Member is withdrawn" even when `denial.reason === 'anonymized'` — deferred, pre-existing (predates this story; the diff only touches the surrounding line, the inaccuracy itself is Story 3.2's). [`apps/api/src/modules/auth/member/member-auth.handlers.ts`, the withdrawn/anonymized `ForbiddenError` construction]

_Dismissed as noise (4): moderation-notify's `accessEnded` defaulting to "access retained" on a flag-lookup error, plus repeated-alarm volume on a sustained outage — verified as the deliberate, heavily-documented ratified fail-open design (Decision `097` clause 7(ii)), not an oversight; the Dev Agent Record's "shortened to 505 chars, pinned by a unit assertion" claim — verified the string is in fact exactly 505 chars, and the shipped generic `<=512` assertion is the correct test design (an exact-505 pin would be needlessly brittle); the near-verbatim rationale duplicated across `.decision-log.md`/story/routing-note/`deferred-work.md` — this repo's governance convention deliberately restates rationale per-artifact rather than cross-referencing; a `restore` action on an already-non-terminated member "bypassing" the Panel-permission gate — verified the gate is correctly scoped to fire only when `overlay.status === 'terminated'`, with `moderateMember`'s own transition-legality guard covering every other case, exactly as designed._

**All 10 patches applied 2026-08-11.** Files touched: `termination-block-seam.ts` (caught-and-fail-open on the `moderationDeniesSession` throw, `MemberLifecycleState` typing, reworded resolution-order comment), `member-auth.handlers.ts` + `member-auth.service.ts` (`onAccess`/`onError` wired at both call sites), `otp.tsx` + `terminated.tsx` (runtime-validated `e.details`, `further_communication` rendered from payload presence), `lib/session.ts` + `lib/session-context.tsx` + `app/_layout.tsx` (a refresh-triggered termination now routes to `/(auth)/terminated` instead of a silent logout — new `TerminationDuringRefresh` handler wiring), `termination-access-block.spec.ts` (AC12 assertion 5 implemented as a real subsequent-call attempt; `enableBlockFor`'s version tied to `featureFlags.DEFAULT_FLAG_VERSION`). New test: `apps/mobile/tests/unit/terminated-during-refresh.test.ts`. Verified: `@twt/api`/`@twt/mobile`/`@twt/domain` typecheck + lint clean; `termination-access-block.spec.ts` (6/6), `moderation-auth-effects.spec.ts` (7/7), `member-auth.spec.ts` (18/18), `member-moderation.spec.ts` (26/26) all green live-DB; `capability-bar.test.ts`/`permissions.test.ts`/`roles.test.ts` (94/94) unaffected; mobile unit suites (17/17) green.



### Files to read before writing a line

| File | Why |
|---|---|
| `apps/api/src/modules/auth/member/member-auth.handlers.ts:50-127` | The gate. Note `deps.serviceDb` is BYPASSRLS and pre-scope — the overlay read must use it, not a tenant pool |
| `packages/domain/src/member/moderation/overlay.ts:118-181` | Both read variants and the clock-skew argument that picks between them |
| `packages/domain/src/member/moderation/status.ts:36-55` | The four legal arms. `terminated --restore--> none` is one of them |
| `apps/api/src/modules/member-moderation/handlers.ts:174-258` | The one write path; the cascade at `:231-233`; the Decision-6 comment at `:226-230` |
| `apps/jobs/src/scheduler/moderation-notify.ts` | The notice worker end to end — copy keys, the `alert_published` reuse, the deliberate absence of a 10th category |
| `apps/api/tests/integration/member-moderation/moderation-auth-effects.spec.ts` | The pinning tests; the header that argues against this story |
| `_bmad-output/implementation-artifacts/10-18-…​.md` | The governance-first shape this story repeats |

### Anti-patterns — the twelve ways this story goes wrong

1. **Adding `'terminated'` to a `TERMINAL_STATES` Set.** Forks AI-7-2; explicitly prohibited (AC6, D5).
2. **Adding `'terminated'` to the `state === 'withdrawn' || …` expression.** Type-wrong — moderation status
   is not a `MemberLifecycleState`, and there is no `never` guard to catch it.
3. **Using the `at`-bounded overlay read.** Silently admits a terminated member under clock skew (D3).
4. **A second `setTimeout`.** Two equalisations drift (D2).
5. **Blocking suspended members too.** The single most likely "improvement" and the one D5 requirement 3
   forbids by name. AC7's surviving test is the guard.
6. **Leaving the Decision-6 comments.** They instruct the next reader to revert this story (D6).
7. **Shipping code before the Panel rules.** Inverts the ordering the epic and Story 10.18 both establish (D1).
8. **Minting a 10th `AlertCategory` to carry the notice.** Redefines FR-71; a PRD amendment, not a story call.
9. **A bare `status === 'terminated'` equality at the gate.** Fails OPEN on a future `ModerationStatus`
   label, silently, with no compile error — the hazard `overlay.ts:18-21` documents against itself (AC4).
10. **Reporting the refresh block's cause without widening `RotateResult`.** The information is not in the
    type; re-reading state in the handler to recover it is the wrong fix (AC5).
11. **Retuning `alert_published`'s cost-optimisation window** to exempt the notice. The category is shared
    with `news-publish.ts` and `contribution-notify-triggers.ts` — a cross-story side effect, not a local fix (AC8).
12. **Adding the mobile terminated branch to the inner `signupCreate` catch** (`otp.tsx:52-54`). The
    terminated 403 arrives on the verifyOtp path and lands in the OUTER catch; the branch would be dead (AC10).

### Reuse map — almost nothing here is new

⚠ **Two deliberate exceptions**, both introduced by the spec-review pass and both mandatory where they
apply — do not let this table override them:

1. **`RotateResult` gains a `cause` field** (AC5). The union genuinely must change; there is no way to report
   the actual block cause otherwise.
2. **`CostOptimizationInput` may gain an exemption field** (AC8) — **only** if the Panel's Q3 ruling
   authorises it. Not a dev-agent call.

Everything below is reuse-only.

| Need | Existing thing | Do NOT |
|---|---|---|
| Terminated standing | `getCurrentMemberModerationOverlay` | write a new query |
| Session kill | `revokeAllMemberSessions` (already runs on terminate) | add a second call |
| Notice delivery | `runModerationNotify` + `fanOutAlertToMembers` | build a second dispatcher |
| Notice identity | `deriveModerationAlertId` (UUIDv5 per action) | key on member id |
| Dignified block screen | `apps/mobile/app/(auth)/rejoin-locked.tsx` | invent a new pattern |
| Reason rendering | `moderationReasonLabelKey` + `resolveReasonLabel` | render the raw code |
| Invariant record | the `AI-10-1` / `AI-7-2` doc-block shape | amend `architecture.md` |

### Testing standards

- Live-DB integration specs under `apps/api/tests/integration/`, own-committing seeds, fresh random mobile
  per test — the `moderation-auth-effects.spec.ts` shape. **Assert membership, not counts**
  (`[[project_live_db_test_gotchas]]`).
- Pure/unit for the notice builder (`buildModerationAlert` is already pure) and any presenter change.
- The **revert-sanity PAIR** is the acceptance evidence for AC7, not a nice-to-have.
- `t()` **throws** on an unknown key and defaults to the `common` namespace — a copy change without its
  catalog entry fails loudly at runtime, and inside a batch loop it takes its batch-mates down
  (`moderation-notify.ts:132-137`).

### Project structure

- Domain-camelCase ↔ contracts-snake_case at the boundary (`[[feedback_story_validate_footguns]]`).
- `packages/contracts` must **never** import a pg-touching `@twt/domain` namespace
  (`[[project_contracts_domain_bundle_boundary]]`) — the overlay read stays in `apps/api`.
- Governance commits use the `governance(10.19):` prefix; implementation uses `story(10.19):`.

### References

- `_bmad-output/planning-artifacts/epics.md:3797-3830` — this story's AC
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:322-380` (D5 in full)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:540-563` (§8.4a), `:255-285` (the draft AC)
- `.decision-log.md` — Decision `2026-08-04-072` (architecture scope + the `AI-10-n` follow-up naming this story), `2026-08-10-096` clauses 5/8/10, `2026-08-09-095` (per-clause provenance)
- `_bmad-output/implementation-artifacts/deferred-work.md:3594-3598` (the Q8 second deposit), `:3648-3652` (what 10.18 does not unblock)
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:322-380` — D5 in its original brief form
- `docs/legal/niyamavali.md:170-198` — Part 8 as it stands
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:847-880` — FR-56 as amended

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`).

### Debug Log References

Four issues found during implementation, each recorded because each failed SILENTLY:

1. **`termination_access_block`'s `description` shipped at 618 chars** against
   `FeatureFlagInventoryResponse`'s `z.string().max(512)`. The inventory handler projects EVERY flag
   into one strict response, so the overrun 500'd the endpoint and blanked **every** flag on the admin
   console — 7 live-DB assertions. Shortened to 505 and pinned by a new unit assertion over all
   descriptions, because a live-DB E2E is a slow, indirect way to learn about a string cap.
2. **The AC12 JWT scan false-positived on this story's own reason-label key.** A first draft matched
   three dot-separated `[A-Za-z0-9_-]` runs — the exact shape of
   `memberStatus.moderationReason.r14-forgery` and of most dotted i18n keys. Anchored on the `eyJ`
   prefix (a real JWT's first segment is base64url of a JSON header).
3. **The test seed left every member in `lock-in`, never `active`.** `member.lock_in_expired` must
   carry `{ kyc_verified: true }`; the reducer safeParses and returns state UNCHANGED on a malformed
   payload (`state.ts:91-96`, whose own comment names this case). Nothing failed — login does not gate
   on `lock-in` — so assertions passed while testing the wrong state.
4. **The withdrawal event is `member.withdrawal_completed`, not `member.withdrawn`.** The STATE is
   named `withdrawn` but no event carries that name; an unrecognised type replays to no transition.
   Initially misread as clock skew; checking the transition table rather than trusting the theory
   found it.

### Completion Notes List

- **Governance ran first and separately**, per `[[feedback_governance_commits_precede_implementation]]`:
  the routing note committed ALONE, then the ruling + Niyamavali amendment as one atomic act, then the
  AC fold, and only then implementation. `git log` reads governance → governance → implementation.
- **Two Panel-issued corrections landed mid-story and changed the work.** The member-facing direction
  (Decision `097` clause 8) was not selected from any option offered and is not covered by any original
  AC — it produced AC12 and reshaped AC4/AC10. The domain-vocabulary correction (`098` clause 3) is
  enforced throughout: nothing in code, comments, test titles or copy describes a failed login.
- **⚠ THE BLOCK IS INERT AS SHIPPED.** `termination_access_block` defaults OFF and the flip is gated on
  Story 10.21 plus a Panel decision. Every flag-ON behaviour is tested with the flag forced on, and
  every flag-OFF default is tested too — asserting only one side would let the default invert with
  nothing failing.
- **Two judgement calls beyond the ACs' literal text, both recorded in `deferred-work.md`:** the notice
  body is selected from the flag rather than stripped-or-deferred (AC8), and the refresh denial carries
  the structured notice (AC5). Both avoid a decay window gated on a `backlog` story.
- **Revert-sanity run on every gate this story added or relies on** — the capability-bar count and
  allowlist, the frozen-marker naming rule, the flag polarity, the `never` exhaustiveness arm, the
  session-denial branch, the AC5 cause switch, the notice body selection, the mobile fence, and the
  Panel precondition in both directions (removed, and widened).
- **What is NOT closed is recorded in `deferred-work.md`**, including that the standing Trustee Panel
  obligation queue GREW from five to seven. Stated as a count, not as progress.

### File List

**Governance / records**
- `.decision-log.md` — Decisions `2026-08-10-097`, `2026-08-10-098`
- `docs/legal/niyamavali.md`, `docs/legal/niyamavali.hi.md` — §8.4 amended, §8.4a authored (UNTRACKED;
  the Decision entry's verbatim reproduction is the only durable copy)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-10-story-10-19.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`

**Capability model**
- `governance_boundary.yaml` — `termination_access_block` admitted; `count` 5 → 6
- `packages/domain/src/feature-flags/registry.ts` — the flag default
- `packages/domain/src/rbac/permissions.ts` — `member.restore_terminated`; catalog 30 → 31, keys 40 → 41
- `packages/domain/src/rbac/roles.ts` — granted to `trustee_panel` ALONE
- `packages/domain/tests/feature-flags/capability-bar.test.ts`, `packages/domain/tests/rbac/permissions.test.ts`

**API**
- `apps/api/src/modules/auth/member/termination-block-seam.ts` (new) — the single read-point
- `apps/api/src/modules/auth/member/member-auth.handlers.ts` — the gate + the `AI-10-2` block
- `apps/api/src/modules/auth/member/member-auth.service.ts` — `RotateResult.cause` + the refresh gate
- `apps/api/src/modules/auth/member/member-auth.repo.ts` — Decision-6 sweep + the residual at its source
- `apps/api/src/modules/member-moderation/handlers.ts` — the Panel precondition + Decision-6 sweep
- `apps/api/tests/integration/member-moderation/termination-access-block.spec.ts` (new) — AC12 + AC5
- `apps/api/tests/integration/member-moderation/member-moderation.spec.ts`,
  `.../moderation-auth-effects.spec.ts`

**Jobs / i18n / UI / mobile**
- `apps/jobs/src/scheduler/moderation-notify.ts` + its test — the flag-selected notice body
- `packages/i18n/locales/{en,hi}/common.json` — notice + termination-surface copy, Hindi primary
- `packages/ui/src/member-status/{presenter,view-model}.ts` — Decision-6 sweep
- `apps/mobile/app/(auth)/terminated.tsx` (new), `apps/mobile/app/(auth)/otp.tsx`,
  `apps/mobile/lib/public-site.ts` (new), `apps/mobile/lib/niyamavali-link.ts`,
  `apps/mobile/tests/unit/terminated-surface.test.ts` (new)

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-10 | Story authored via `bmad-create-story` off `main` @ `6f1b165`. |
| 2026-08-10 | **Spec-review pass** (pre-Task-1, `bmad-code-review` on the spec rather than a diff — the story is `ready-for-dev`, so there is no implementation to review). ~30 citations independently re-verified at `6f1b165`; **no citation drift found**. Five AC-satisfiability defects fixed, all load-bearing on the routing note and so applied BEFORE Task 1: **(1)** AC5/Task 5 mandated reporting the refresh-block cause, but `RotateResult`'s `member_blocked` arm (`member-auth.service.ts:152-156`) carries no discriminator — now requires widening the union with `cause`, flagged as a deliberate exception to the reuse map. **(2)** AC8's Q3 exemption was unsatisfiable under its own two prohibitions: `evaluateCostOptimization`'s only per-alert bypass is `timeCritical` (⛔ pinned false) and the per-category window keys on `alert_published`, shared with `news-publish.ts:161` + `contribution-notify-triggers.ts:310` — Q3 now discloses the real price (a `CostOptimizationInput` contract change) so the Panel rules with the cost visible. **(3)** Q6's "Feeds" column claimed AC5+AC11 but its default-OFF and hold branches change what AC7 may assert — Feeds corrected to AC4/AC5/AC7/AC10/AC11 and AC7 gained a per-branch test-posture table (a `403` assertion under a default-OFF flag is a false green). **(4)** AC4's `status === 'terminated'` was a bare equality over `ModerationStatus`, failing OPEN on a future label per the hazard `overlay.ts:18-21` documents — now requires an exhaustive `switch` with a `never` arm. **(5)** AC10 cited `otp.tsx:52-54` as the edit site, but that is the inner `signupCreate` catch; the terminated 403 lands in the OUTER catch at `:73-79`. Anti-patterns 9–12 added. |
| 2026-08-10 | **Re-review of the patched ACs + Q-table**, same pass. Three further defects, two of them exposed by fix (3) rather than pre-existing in isolation: **(6)** ⭐ Q6's **"hold"** branch makes **AC8 and AC9 write falsehoods** — AC8 strips *"You can sign in as usual…"* from the notice and AC9 rewrites five sites to *"termination does not keep login"*, both of which are **only true if the block ships**. Under a hold ruling the sweep would replace five accurate comments with five inaccurate ones: the copy-truth defect class this story exists to close, inverted. Q6's Feeds extended to **AC8, AC9**; a Q6 branch note now states the governance-half-only landing, and AC11 gained items 6–7 requiring the un-shipped ACs be recorded with Q6 as their named re-trigger. **(7)** AC4's four requirements — one branch, one sleep, distinct audit reason, distinct error code, plus the new exhaustive `switch` — are jointly satisfiable in only one shape (derive a nullable `blockReason` **before** the branch, then branch once, reading reason and code off it). Stated explicitly so the dev agent does not resolve the tension by writing two `if`s and two sleeps, which D2 forbids. AC4's `Then` clause also no longer prescribes the bare `=== 'terminated'` form it now forbids further down. **(8)** Fix (1) cited the reuse-map heading by its **pre-patch** title — the citation-drift class this story's own Task 0 warns about, corrected in place. |
| 2026-08-10 | Validated via `bmad-create-story validate` — 62 citations checked at `6f1b165` (no drift from HEAD). Corrected two governance-provenance misattributions: the epigraph quote and Task 0/References' "D5 in full" citation both pointed at `sprint-change-proposal-2026-08-04.md:322-380`/`:349`, which is Story 10.20 content; the correct source is `moderation-model-decision-brief.md:322-380`/`:348-350`. Tightened AC9 site 5's citation to include `presenter.ts:410` (the `showAppealCta` render gate, not just the `FAILURE_STATES` definition at `:322-336`). All other citations (~45 checked) confirmed accurate. |
