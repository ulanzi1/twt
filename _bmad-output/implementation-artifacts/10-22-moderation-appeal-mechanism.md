---
baseline_commit: b3e12e1000f1ad0fc6d0d4e18b093eae7c120df1
---

# Story 10.22: Moderation Appeal Mechanism `[SURFACE]`

Status: ready-for-dev

> ⛔ **THIS STORY IS HALF GOVERNANCE, AND THE GOVERNANCE HALF LANDS FIRST.** Niyamavali **§8.8 is a
> RESERVED NUMBER** (`niyamavali.md:274`, hi `:272`) held expressly for this amendment, and §8.6's
> *Recorded gap* clause states in terms that *"its closure requires its own amendment (§8.8,
> reserved)"* (`niyamavali.md:260`, hi `:258`). ⛔ **You may not build a moderation appeal before the
> instrument authorises one.** This is the 10.18 precedent verbatim — *"the Part 8 amendment
> constituting the Trustee Panel lands FIRST — the body is defined in governance before it is granted
> in code"* (`epics.md:3942`) — and the 10.20 precedent operationally: routing note → Panel ruling →
> `.decision-log.md` entry → §8.8 authored in both locales → THEN code.
> `git log` must read **governance → governance → implementation**, with the implementation branch
> **cut from the ratifying commit** ([[feedback_governance_commits_precede_implementation]]).
>
> ⛔ **DO NOT REUSE EPIC 6's APPEAL MACHINERY.** `epics.md:4071`: *"the moderation appeal is a
> **distinct journey** — Epic 6's machinery is a pattern reference, not a reusable path."*
> `claim/appeal-eligibility.ts` reads `claims`, `claim_verifier_decisions`,
> `claim_state_trustee_decisions`, `claim_r9_votes` and enforces *"exactly one journey per claim,
> ever"*. There is no member in it. Part 9 is *"the internal **claim-denial** appeal flow"* and
> **Part 8 never references Part 9** (`niyamavali.md:286`). Copy the *shape*; import nothing.
>
> ⛔ **THIS STORY DOES NOT FLIP `termination_access_block`.** That flag is DEFAULT OFF and its flip is
> a **separate, Trustee-Panel-exclusive act** gated on Story 10.21 (Decision `2026-08-10-097` clause
> 12 bullet 4; `2026-08-10-098` clause 2). 10.21 landed and the gate is **DISCHARGEABLE, not
> discharged**. Nothing here authorises the flip, and the appeal must work **on both sides of it** —
> see AC7's dual-reachability requirement.
>
> **Depends on:** Story 10.10 (`done`) — the overlay + `member_moderation_actions`; Story 10.18
> (`done`) — the `trustee_panel` role; Story 10.19 (`done`) — termination ends access, and the
> self-contained notice; Story 10.20 (`done`) — the record model, the dwell, §8.5/§8.6/§8.9;
> Story 10.21 (`done`) — **the off-portal route AC7 must reuse**; Stories 10.1–10.4 (`done`) — the
> helpdesk substrate; Story 10.29 (`done`) — the member-authored-at-intake capture pattern.
> **Gates:** nothing names 10.22 as its gate. It discharges §8.8, `deferred-work.md:224`, and the
> §8.4a *"no route by which a member may respond"* disclosure.

## Story

As a member who has been suspended or terminated,
I want a route to challenge the decision,
so that the appealability the system already claims is actually true.

---

## 🎯 The gap, stated exactly

**The system already tells members they may appeal. In four places. None of them is true.**

| # | Where | What it says today | Status |
|---|---|---|---|
| 1 | `packages/domain/src/member/moderation/status.ts:17` | *"a trustee must first suspend (itself notified, audited and **appealable**)"* | **Unbacked assertion in a load-bearing comment** |
| 2 | `apps/api/src/modules/member-moderation/handlers.ts:414-419` | Decision 6's justification *"was reaching an appeal CTA that does not exist: the CTA still has no moderation destination, which is Story 10.22's to build"* | **Honest, and names this story** |
| 3 | `packages/ui/src/member-status/presenter.ts:346` | *"the CTA still has no moderation destination — that is **Story 10.22's** to build"* | **Honest, and names this story** |
| 4 | `packages/i18n/locales/{en,hi}/common.json:339` (`moderation.notice.suspended.body`) | *"You can sign in as usual and **request a review from your membership status page**."* — **shipped member-facing copy, both locales** | ⛔ **A promise made to a suspended member that the product cannot keep** |

**And the CTA is a dead button in both apps.** `apps/mobile/app/(membership)/index.tsx:124-131` and
`apps/admin/src/modules/member-status/MemberStatusPanel.tsx:140-150` each render an appeal control
with **no `onPress`/`onClick` handler at all**. `presenter.ts:431` computes `showAppealCta` from
`FAILURE_STATES`; the value is correct and goes nowhere.

⚠ **`epics.md:4066` cites `handlers.ts:228`. That citation is STALE** — Story 10.20 inserted the
escalation-test block ahead of it and line 228 is now the early-legality fast-fail. The appeal-CTA
claim lives at **`:414-419`**. Cite the live line, and record that the epic's is stale.

**Everything else in the moderation arc landed and left this hole deliberately:**

- **§8.6 states the gap and refuses to close it** — an *unnumbered Recorded gap clause*, expressly
  **not** one of the seven principles (`niyamavali.md:260`; Decision `2026-08-12-099` clause 8.1).
- **§8.4a's *Notice + opportunity to respond* row is mechanized to the DWELL ONLY**, and says why:
  *"no response, and no waiver of the opportunity, is recorded or required, because there is as yet
  **no route by which a member may respond** — §8.8 is reserved for it and remains unlanded"*
  (`niyamavali.md:215`, hi `:213`).
- **`dwell.ts:22`**: *"Invoking the exception does NOT forfeit the member's future right of appeal —
  that mechanism is Story 10.22's and is not narrowed by anything here."*
- **`deferred-work.md:224`**: §8.8 stays UNLANDED, owned by Story 10.22.
- **PRD FR-56 as amended** (`prd.md:873`, testable consequence): *"Moderation carries a member-facing
  appeal route **distinct from** the claim-denial appeal flow (Niyamavali Part 9 is claim-scoped and
  Part 8 does not reference it)."*

---

## Verified premises — checked live at `b3e12e1`

**⛔ #1 — §8.8 does not exist, and the number is held open on purpose.**
`niyamavali.md:274` (hi `:272`): *"§8.8 is reserved. §8.7 is deliberately numbered ahead of it; the
intervening number is held for the remaining Part 8 amendment — the moderation appeal (§8.6,
*Recorded gap*) — and is not to be closed up."* ⇒ **§8.8 is authored physically between §8.7 and
§8.9**, and once it lands the reserved-numbers note is **retired**, not edited to reserve nothing.
⛔ Do not renumber §8.7 or §8.9.

**⛔ #2 — `docs/legal/` IS GITIGNORED** (`.gitignore:68`). Verified live: `git check-ignore -v
docs/legal/niyamavali.md` → `docs/legal/`. ⇒ **the `.decision-log.md` entry is the ONLY durable copy
of the §8.8 text.** Both locales' full text goes into the entry verbatim, exactly as 10.20 did.

**⛔ #3 — the Trustee Panel has governance authority and NO OPERATIONAL QUEUE.**
`roles.ts:594-637`: `trustee_panel` holds exactly `[member.moderate, member.restore_terminated]`,
`scopeCeiling: 'pariwar'`. **It holds no helpdesk capability at all** — stated as a settled fact at
`permissions.ts:541`. ⇒ **An appeal filed as a helpdesk ticket is INVISIBLE to the Panel.** A design
that routes the appeal to `trustee_panel` through `routed_to_role` ships an appeal nobody can see.
⚠ And `routed_to_role` is **advisory and inert** ([[project_helpdesk_routing_is_advisory]]) — it
authorises nothing. **The helpdesk is the INTAKE. The adjudication surface is this story's to build.**

**⛔ #4 — a new helpdesk CATEGORY is guaranteed-unrouted.**
`registry.ts:54-62` is the v1 default policy; every per-Pariwar override is a **version-pinned
document** and a new category resolves under **none** of them, while the golden-hash guard prescribes
an unsafe remedy ([[project_helpdesk_default_policy_version_trap]]). ⇒ **Use an EXISTING category with
a `sub_category` token** (⭐ `complaint` / `moderation-appeal`), never a tenth `HELPDESK_CATEGORIES`
member. `sub_category` is free text ≤64 chars and `sub_category: null` rules match any subcategory,
so an existing catch-all keeps routing green.

**⛔ #5 — geo containment is asymmetric, in BOTH directions.**
`scope.ts:56-67` ranks `pariwar`(1) broader than `state`(2); `scopeWithinCeiling` is a pure numeric
compare with no resolver parameter. ⇒ a `state_trustee` (`state` ceiling) can **never** satisfy a
`pariwar`-dimension check, and neither can `district_admin`. ⛔ Any adjudicator role you propose must
be `pariwar`-ceiling-or-broader, or the capability is **inert on arrival** — the Story 10.3 lesson
([[project_rbac_geo_scope_containment]]). Do not "fix" it with a resolver; Story 1.18 owns that and
it would not help here.

**⛔ #6 — restore-from-terminated is ALREADY Panel-exclusive.**
`member.restore_terminated` (catalog v31) is held by `trustee_panel` **alone** (`roles.ts:627-637`),
enforcing §8.4's *"Restoration from termination is an act of the Trustee Panel."* ⇒ **an allowed
appeal against a termination already has a Panel-only execution step.** Do not build a second path
to the same effect; an allowed appeal **directs** a restore, it does not perform one.

**⛔ #7 — moderation is an OVERLAY, and the appeal must not touch it.**
`overlay.ts:1-30` — `members.state` is never written; `nextModerationStatus` is pure and total with
exactly four legal arms. ⛔ An appeal is **not a fourth `ModerationAction`** and **not a fourth
`ModerationStatus`**. Adding either silently mis-classifies five `TERMINAL_STATES` sets and every
`legal_actions` derivation (the Decision-1 blast-radius note, `overlay.ts:17-23`).

**⛔ #8 — new `member.moderation.*` event types must NOT move the overlay.**
`evaluateModerationOverlay` folds `MODERATION_EVENT_TYPES` through `moderationActionForEventType`.
The `ground-appended` precedent (`events.ts`) is the exact template: it spreads `auditShape` and
**deliberately omits `overlayShape`**, *"because NO MODERATION STATUS MOVES ON AN APPEND"*. Appeal
events follow it verbatim — and a test must pin that folding a stream containing them leaves
`status`, `reasonCode` and `since` unchanged.

**⛔ #9 — `events_log.payload` is plaintext JSONB (R1).**
The member's appeal statement is member-authored free text ⇒ **Tier-1 ciphertext in a table, never in
a payload, never in an audit entry.** The event carries the audit shape + bounded machine tokens only
— the `member_moderation_actions.rationale_ciphertext` discipline verbatim.

**⛔ #10 — the closest precedent is `member_data_rights_corrections`, not the claim appeal.**
`schema/member_data_rights_corrections.ts` is Story 10.21 AC-R2: a **record, not a write path**, with
`helpdesk_ticket_id NOT NULL` *"because the ruling places the process ON a helpdesk ticket"*, two
Tier-1 columns (member-authored request + staff-authored action), an outcome enum, and a
`recorded_by_display` snapshot. **Read this file before designing the appeal table.**

**⛔ #11 — the catalog is at v33 with 42 keys.**
`permissions.ts:456` (`PERMISSION_CATALOG_VERSION = 33`), `permissions.test.ts:56`
(`toHaveLength(42)`). Minting an adjudication key moves both. ⚠ Catalog version is **no longer a
proxy for key count** (10.18/6.17 minted zero keys and still bumped) — move the length assertion only
if a key is actually minted.

**⛔ #12 — the last migration is `0106`.** Next is `0107`, **hand-authored**, `_journal` appended by
hand at the +86400000 cadence. ⛔ Never regenerate an applied migration ([[project_live_db_test_gotchas]]).

---

## In scope / out of scope

**In scope**
1. **§8.8** authored in its reserved slot, **both locales**, after a Panel ruling.
2. The **appeal record + its two events**, Tier-1 encrypted, append-only, RTBF-scrubbed.
3. **Two intake surfaces** — in-portal (the CTA acquires a destination) and off-portal (10.21's route).
4. The **adjudication surface**, with the different-individual exclusion enforced server-side.
5. **The four unbacked claims corrected**, and the shipped notice copy made true in both locales.
6. §8.4a's *Notice + opportunity to respond* row **re-dispositioned** against whatever the Panel rules.

**Out of scope — name these, do not silently skip them**
- ⛔ **The `termination_access_block` flip.** Not this story's, not any story's — a Panel act.
- ⛔ **Any change to Epic 6's claim appeal.** No shared table, no shared id, no shared route, no
  import from `claim/appeal*.ts`. A test asserts the absence.
- ⛔ **A "vary the sanction" outcome.** A variation is a *new* moderation act with its own §8.6 record.
- ⛔ **A general admin member-profile editor** (10.21's standing prohibition, unchanged).
- ⛔ **Publication of any appeal outcome.** Part 9's reversed-denial publish hook to Sahyog Vivran is
  claim-scoped; moderation outcomes are member-private + audit. Record the contrast.
- ⛔ **A new `ModerationStatus`, `ModerationAction`, or `member_lifecycle_state` label** (premise #7).
- ⛔ **A generic discipline-appeal package.** One consumer ([[feedback_no_premature_package]]).

---

## Acceptance Criteria

### AC1 — Q1–Q10 are ROUTED to the Trustee Panel, never authored unilaterally

**Given** [[feedback_governance_commits_precede_implementation]] and the 10.18 / 10.19 / 10.20 precedent
**When** the governance half begins
**Then** `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-story-10-22.md` is authored
and **committed ALONE** on a `governance/10-22-moderation-appeal-mechanism` branch, with **zero
`packages/` or `apps/` files in the commit**, carrying ten questions — each with lettered options, a
⭐ recommendation with its reasoning, and a **"Feeds"** column naming the AC the answer unblocks:

| Q | Question | ⭐ Recommendation | Feeds |
|---|---|---|---|
| **Q1** | **§8.8's shape.** Is the moderation appeal (a) a **single-tier review** by an authority who did not take the decision, (b) a two-tier ladder, or (c) a mirror of Part 9's three stages? | **(a)** — Part 9's stage bodies (District Admin → State Trustee panel → Trustee) are geographic claim-adjudication offices that do not map onto a Part 8 act the **Trustee Panel itself may have taken**; §8.7 already states the Panel *"is not the 'State Trustee panel' of Part 9"* | AC2, AC5 |
| **Q2** | **Who hears it.** The Trustee Panel sitting as such? And where the Panel *itself* imposed the sanction, is the requirement satisfied by a **different individual within the Panel**, or must it leave the Panel? | Panel, with a **different individual** — Deed Clause 26 natural justice speaks to the *individual* decision-maker, and §8.7 makes the Panel the Board acting in a moderation capacity, whose quorum is Deed Clause 19's | AC2, AC5 |
| **Q3** | **Eligibility + window.** Appealable from **suspended AND terminated** (status.ts:17 already asserts suspension is appealable)? Any claimant-facing deadline? One journey per **moderation action** or per member? And once an appeal against an action is decided, may a **new** appeal be filed against that **same** action (e.g. new grounds arise), or is the action's appeal right exhausted **forever** (Part 9's D-F standard)? | **Both statuses · NO deadline** (Part 9's D-E grief-aware precedent — there is no `AppealWindowExpired` anywhere in this codebase) · **one per action**, because a later termination is a distinct act with its own record · **one OPEN appeal per action at a time, re-filing permitted after a decision** — narrower than Part 9's per-claim-ever exhaustion, because a moderation act is not adjudicated by a body external to the Trust the way a claim is, and closing the door forever on new grounds would be harsher than Part 9's own standard | AC4, AC5 |
| **Q4** | **Outcomes.** `upheld` \| `allowed` only, or a third *vary* outcome? And does `allowed` **direct** a restore through the existing moderation write path, or perform one itself? | **Two outcomes; `allowed` DIRECTS.** An appeal that writes the overlay would be a second moderation write path bypassing §8.6's record, the dwell, and `member.restore_terminated`'s Panel exclusivity (premise #6) | AC4, AC6 |
| **Q5** | **Suspensive effect.** Does a filed appeal suspend the sanction pending outcome? | **No** — and it is stated in §8.8 rather than left silent. A suspended member is curing and needs the contribution surface (§8.4a); a terminated member's access does not return on filing | AC2, AC4 |
| **Q6** | **§8.4a's *Notice + opportunity to respond* row.** Now that a route exists, does a termination require a **recorded response-or-waiver** as a precondition? | **No for v1.** 10.20's Q4.3 ruled elapsed dwell satisfies v1 and warned that *"inventing a response-record precondition would block ordinary termination"* (`deferred-work.md:237-241`). A route existing is not a precondition. ⚠ **This is the question 10.20 deferred to this story — it must be asked, not assumed** | AC2, AC9 |
| **Q7** | **Intake shape.** Does the appeal ride the helpdesk substrate as its **off-portal** intake artifact (existing category + `sub_category`, premise #4), with a **member-portal route** for the in-portal half — one record, two intake surfaces? | **Yes** — the 10.29 both-intake-routes precedent, and 10.21's ruled *"the process is ON a helpdesk ticket"* for the off-portal half | AC4, AC7 |
| **Q8** | **The adjudication key.** Mint a new key (catalog 33→34, keys 42→43), or reuse `member.moderate`? Holders? | **Mint.** `member.moderate` is held by `pariwar_admin` (`roles.ts:262`) **and** `trustee_panel` (`roles.ts:636`) — a check on it cannot distinguish the appellate authority from the authority that decided, which is the exact indistinguishability 10.18 existed to end. `verifier` (`roles.ts:519`, `district` ceiling) also holds it, but as a documented deliberately-inert grant (Decision `2026-08-10-096` clause 7) — it cannot satisfy a `pariwar`-dimension check either. ⛔ `state_trustee` / `district_admin` cannot hold it (premise #5) | AC5 |
| **Q9** | **Publication.** Does an allowed moderation appeal publish anywhere, as Part 9's reversal does to Sahyog Vivran? | **No.** Sahyog Vivran is claim/memorial-scoped; a moderation outcome is member-private + audit. Record the contrast so a later reader does not read the absence as an omission | AC8 |
| **Q10** | **Legal review.** Does the moderation appeal ride the Story 6.16 `pending_legal_review` **fail-closed config gate** (`docs/appeal-procedural-fairness/README.md` §3), or is it recorded for counsel **without** a gate? | **Recorded for counsel, NO fail-closed gate.** The claim gate protects a ₹50L adjudication by refusing to *adjudicate*; the same gate here would refuse to *hear a member at all*, which inverts the purpose. Author a sibling section in `docs/appeal-procedural-fairness/` flagged for the Story 0.13 engagement | AC8, AC10 |

**And** the ruling is recorded as a single `.decision-log.md` entry with **per-clause provenance** —
mandatory under Decision `2026-08-09-095` on any entry mixing ratification with author analysis; an
author-written clause is labelled **Author-committed**, never flatly "Trustee-ratified"
**And** the note states plainly what a ruling does **and does not** mean, and does **not** discharge
any standing Panel obligation — ⚠ **do not assert a queue count without re-reading `.decision-log.md`
live**; the count is a running figure, not a constant
**And** the implementation branch is **cut from the ratifying commit**, so the ordering is structural
rather than asserted

### AC2 — §8.8 is authored in its RESERVED slot, both locales, and the reserved-numbers note retires

**Given** premise #1 and the Q1–Q6 + Q9 rulings
**When** the Part 8 amendment lands
**Then** `docs/legal/niyamavali.md` gains **§8.8** *physically between §8.7 and §8.9*, and
`niyamavali.hi.md` receives it at the structurally identical position — **the Hindi is a co-equal
governing instrument, not a translation artifact**
**And** §8.8 states, at minimum: **who may appeal** (a member under suspension or termination),
**against what** (the moderation act, identified by its record), **to whom** (the ruled authority),
the **different-individual** requirement (Deed Clause 26 natural justice; Part 9's Stage-1 discipline
as the internal precedent), **notice · a fair hearing · a reasoned outcome**, the **absence of a
claimant-facing deadline**, the **absence of suspensive effect**, and that the **route survives the
end of authenticated access** (§8.4's identity-verified administrative process)
**And** §8.8 states expressly that it is **not** Part 9 and does **not** incorporate it
**And** the reserved-numbers note at `:274` / hi `:272` is **RETIRED** — the sentence *"§8.7 is
deliberately numbered ahead of it"* is preserved as the historical record of why the ordering looks
the way it does, ⛔ the numbers are **not closed up**, §8.7 and §8.9 are **not renumbered**
**And** §8.6's *Recorded gap* clause is updated to record that the gap is **CLOSED BY §8.8**, with
the original wording preserved as superseded ⛔ never edited to pretend it was never open
([[feedback_supersede_never_reinterpret]])
**And** **all new text is reproduced VERBATIM, both locales, inside the `.decision-log.md` entry** —
premise #2: `docs/legal/` is gitignored and the entry is the only durable copy
**And** **no** version bump, `Effective:` date, or `[LEGAL]` line is written, and none may be inferred
**And** an `APPENDIX A` entry is added **only if** the ruling requires one — §8.8 is a procedure, not
an indexable `R`-rule (the `2026-08-10-096` clause 10 precedent); **record the absence** either way

### AC3 — the four unbacked claims are CORRECTED, and the shipped notice copy becomes true

**Given** `epics.md:4066-4068` — *"that claim becomes true, and the unbacked comments are corrected"*
**Then** each of the four sites in §"The gap, stated exactly" is edited to state what the system now
does, naming §8.8 and this story:
1. `moderation/status.ts:17` — *appealable* becomes a statement of fact with its mechanism named
2. `member-moderation/handlers.ts:414-419` — the *"CTA still has no moderation destination"* sentence
   is replaced by the destination; ⚠ **Decision 6 stays SUPERSEDED, not revived** — this story gives
   the CTA a destination, it does **not** restore the justification for open login after termination
3. `ui/member-status/presenter.ts:346` — same correction, same fence
4. `epics.md:4066`'s stale `handlers.ts:228` citation is **recorded as stale** in the story's
   Completion Notes ⛔ do not silently "fix" the epic
**And** `moderation.notice.suspended.body` (en + hi) is verified to be **true as written** — *"request
a review from your membership status page"* is satisfied by AC7's in-portal CTA destination, or the
copy is corrected. ⛔ It is not left as an aspiration
**And** `moderation.notice.terminated.body` (en + hi) **names the appeal route alongside the data-rights
route** — Story 10.19's self-contained-notice requirement means the notice **is** the explanation once
the portal closes; a terminated member who is told only how to fetch their data has not been told they
may object. ⛔ No portal dependency and no deep link in that copy
**And** the **outcome copy states that exhausting the internal appeal does NOT waive external
recourse** — Deed Clause 26 (*"Nothing in this Deed ousts the jurisdiction of any court, consumer
forum, or authority"*), Niyamavali **R10(E)** (`niyamavali.md:166` — internal resolution is
*primary*, judicial challenge *not contractually barred*), and **AR-56**'s CPA-2019 internal-appeal
obligation — ⚠ AR-56 states this obligation in connection with the claim-appeal (FR-43A), not Part 8;
the same CPA-2019 statutory logic applies to any internal appeal mechanism by analogy, but this is not
a direct Part-8 ratification and Completion Notes should record the distinction rather than imply one.
This is the same disclosure `docs/appeal-procedural-fairness/README.md` §4 item 2 flags
for counsel on the claim side; ⛔ it is owed here too and must not be assumed to ride along
**And** every string passes the `scripts/microcopy` tone gate in both locales

### AC4 — the appeal RECORD: one table, two events, Tier-1 by construction

**Given** premise #10 and the `member_data_rights_corrections` posture
**Then** hand-authored migration **`0107`** adds `member_moderation_appeals`, carrying at minimum:
`appeal_id` (PK) · `member_id` · `pariwar_id` · **`moderation_action_id`** (the act under appeal —
FK-shaped to `member_moderation_actions`) · **`grounds_ciphertext`** (Tier-1, *member-authored*) ·
`filed_via` (`portal` | `helpline`) · **`helpdesk_ticket_id`** (nullable, with a **CHECK making it NOT
NULL when `filed_via = 'helpline'`** — the corrections precedent, relaxed only for the in-portal arm) ·
`filed_at` · `status` · `outcome` (`upheld` | `allowed`, null until decided) ·
**`reasoned_outcome_ciphertext`** (Tier-1, *adjudicator-authored*) · `decided_by_actor_id` ·
**`decided_by_display`** (a `users.display_name` **snapshot**, never email-derived —
[[project_admin_display_name_attribution]]) · `decided_at`
**And** the table is **APPEND-ONLY for the filing** and **single-decision** — GRANT `SELECT` +
`INSERT`, plus the narrowest possible `UPDATE` for the decision columns only, or a second row; ⛔ a
recorded appeal decision is immutable either way
**And** it is **RLS tenant-isolated on `pariwar_id`**, with policies declared in
`packages/domain/src/policies/` and exported from `policies/index.ts` (the
`member-moderation-actions-rls.ts` template)
**And** **exactly one open appeal per `moderation_action_id`** is enforced by a **partial UNIQUE
index** — the guard is a read, the index is the truth, and a guard-bypass race hits 23505 (the D-F
`claim_appeals` pattern, keyed to the *action* not the *member*)
**And** re-filing a **new** appeal against the same `moderation_action_id` after a prior one is
**decided** is **intentional**, per Q3's ruling — the partial index scopes uniqueness to open rows
only, which is a narrower rule than Part 9's per-claim-*ever* exhaustion (D4); a test proves a second
filing succeeds once the first is resolved
**And** two events are registered on the **member's own stream**, named for the existing
`member.moderation.ground-appended` hyphenated-third-segment convention:
`member.moderation.appeal-filed` and `member.moderation.appeal-decided`
**And** both payloads spread **`auditShape`** and **deliberately OMIT `overlayShape`** (premise #8) —
no moderation status moves on either — carrying **only** bounded machine tokens (`filed_via`,
`outcome`, the ids); ⛔ **no grounds text, no outcome prose, no member name, no actor display**
**And** a test folds a stream containing both events through `evaluateModerationOverlay` and asserts
`status`, `reasonCode`, `since` and `lastActionAt` are **byte-identical** to the same stream without
them, and through `memberStateMachine` asserting `from_state === to_state`
**And** a new branded id `MemberModerationAppealId` is added in `ids/index.ts` ⛔ **not** reusing
Epic 6's `AppealId`, whose doc-comment binds it to `claim_appeals.appeal_id`

### AC5 — the appeal is heard by a DIFFERENT INDIVIDUAL, enforced server-side

**Given** `epics.md:4074` — *"heard by a **different individual** from the original decision-maker,
with notice, a fair hearing and a reasoned outcome"* — and **Deed Clause 26** (`trust-deed.md:299`),
which binds Board discretion to *"the principles of natural justice"* and expressly does **not** oust
external recourse
**Then** the adjudicator is excluded when they appear in the **exclusion set** for the appealed act:
every `member_moderation_actions.actor_id` for that action, **plus** every
`member_moderation_grounds.added_by` attached to it (a supporting ground is participation in the
decision — the D-D reasoning that pulled R9 voters into the claim exclusion set, applied here)
**And** the exclusion is derived by a **pure DB read in `packages/domain`**, mirroring the *shape* of
`getOriginalDeciderActorIds` ⛔ **importing nothing from `claim/appeal-eligibility.ts`**
**And** it is enforced **at the API layer, inside the scope transaction, before any write**, returning
a typed **409** ⛔ never a 403 — it is a state objection about *who this actor is to this case*, not an
authorization failure, and conflating them makes the two indistinguishable to the operator
**And** the new key from Q8 is minted with a **recorded reuse-check** at the key itself (the
`member.restore_terminated` template), `PERMISSION_CATALOG_VERSION` moves **33 → 34**, and
`permissions.test.ts`'s `toHaveLength` moves **42 → 43** ⛔ **only if a key is actually minted**
**And** the adjudication route sits behind the full chain — `requireAdminSession` ·
`scopeResolutionHook` · `requirePermissionHook(<key>, { dimension: 'pariwar' })` · `requireStepUp`
with a **DISTINCT step-up context constant** exported from `@twt/contracts` and imported by **both**
the route and the admin client ⛔ never a string literal on either side (10.21's recorded footgun:
the context is an unguarded string compared by equality, and a typo on the OTP side yields an
elevation that can never satisfy the gate, with nothing naming the cause)
**And** a live-DB test proves the exclusion with a **polarity pair**: the original actor is refused,
a second Panel member is accepted ⛔ a one-sided assertion passes vacuously
**And** the adjudication surface **lists** the open appeals within the adjudicator's scope — not merely
a single-record view reachable only by a direct link. D6/premise #3 warn that a technically-complete
record + decide-endpoint that nobody can find reproduces the exact defect the helpdesk-is-not-a-queue
finding exists to prevent. A test asserts a newly-filed appeal is returned by the list read before any
decision is made on it

### AC6 — an allowed appeal DIRECTS a restore; it never performs one

**Given** premise #6 and premise #7
**When** an appeal is decided `allowed`
**Then** the appeal record + its event are written, and **nothing in the moderation overlay moves** —
the restore is a subsequent, separately-attributed act through the **existing**
`POST .../moderation` write path, carrying its own reason code, its own Decision Note, and (from
`terminated`) the Panel-exclusive `member.restore_terminated` check
**And** the admin surface **cross-links** the allowed appeal to the restore action it directs, so the
lineage `moderation action → appeal → restore` is readable from either end
**And** a test asserts that deciding an appeal `allowed` leaves `getCurrentMemberModerationOverlay`
**unchanged**, and that no `member.moderation.restored` event is emitted by the appeal path
**And** ⛔ `nextModerationStatus`, `MODERATION_ACTIONS`, `MODERATION_STATUSES` and the five
`TERMINAL_STATES` sets are **untouched** — a diff touching any of them means the design drifted

### AC7 — reachable BOTH in-portal and off-portal, and it must survive the flag flip

**Given** `epics.md:4080` — *"the appeal is reachable **off-portal** for a terminated member (reusing
Story 10.21's route) — the appeal must not depend on the access termination removes"*
**Then** **in-portal**: the `showAppealCta` control in **both** `apps/mobile/app/(membership)/index.tsx`
and `apps/admin/src/modules/member-status/MemberStatusPanel.tsx` acquires a **real destination** —
today both are handler-less. The member route opens **its own `openScopeTx`** for RLS and carries
**Turnstile + `Idempotency-Key` in HEADERS**, the Story 10.2 member-surface discipline
([[project_helpdesk_member_surface_102]]); ownership reads return **404, not 403**
**And** **off-portal**: the appeal is filed through the identity-verified helpline route Story 10.21
built — an existing helpdesk category + the `sub_category` token (premise #4), with the operator
holding `helpdesk.create` and the **member's own request captured at intake** on the 10.29 pattern
(a nullable `timestamptz` written **only** by the projector from the **server's** clock, never a
caller-supplied boolean — [[project_member_authored_intake_capture]])
**And** ⛔ the off-portal arm is **not** gated on `member.data_rights` — filing an appeal is not
executing a DPDPA right, and 10.21 minted that key precisely to separate filing from executing
**And** ⛔ the admin variant's CTA does **not** file an appeal on the member's behalf from the
member-status panel — an appeal is the member's act; the admin panel links to the *record*
**And** a test proves reachability **with `termination_access_block` ENABLED** — a terminated member
with no session must still reach the appeal through the off-portal arm. ⛔ Testing only the
flag-off world tests the world this story exists to make survivable

### AC8 — the record: what this story closes, and what it does not

**Given** [[feedback_closure_language_precision]]
**Then** a `deferred-work.md` section for Story 10.22 records, in the three distinct registers:
**Closed by edit** — §8.8; the four unbacked claims; the dead CTA; the record + surfaces
**Resolved via explicit deferral** — Q10's counsel review (a sibling section in
`docs/appeal-procedural-fairness/` carrying the **structurally-visible PENDING-LEGAL-REVIEW marker**,
routed into the Story 0.13 engagement roster, ⛔ **without** a fail-closed config gate if Q10 rules as
recommended — and the *reason* for the asymmetry with Story 6.16 is recorded, not left to inference)
**Not addressed** — Q9's absence of publication, recorded as a **decided absence**
**And** §8.4a's *Notice + opportunity to respond* row is **re-dispositioned in both locales** against
Q6's ruling ⛔ **a route existing is not the row becoming mechanized** — and per §8.4a's own standing
rule, *"a row leaves this list when the Trust has seen its mechanism work, not merely when the code
exists"*, so the row **stays in the list**
**And** the §8.4a *Statutory rights (DPDPA)* row is **not touched** — it is 10.21's, and its
disposition is unaffected by this story

### AC9 — every new Tier-1 column is erasable, and a test proves it

**Given** the 10.20 AC11 / 10.21 discipline
**Then** `packages/domain/src/member/anonymize.ts` scrubs **both** new Tier-1 columns under a new
field-class constant (the `FIELD_CLASS_DATA_RIGHTS_CORRECTION` template at `:85,:350-357`)
**And** a live-DB test seeds an appeal with both ciphertexts populated, runs `anonymizeMember`, and
asserts **both** are replaced by the encrypted sentinel ⛔ not that the row was deleted — the record
of a governance act survives RTBF; its member-authored *content* does not
**And** `rtbf-legality.ts` is checked for whether a pending appeal is a lawful-retention consideration,
and the answer is **recorded either way**

### AC10 — the gates have teeth on the new surface

**Given** [[feedback_gate_scope_semantic_coverage]] — a green scan proves nothing until ≥1 invariant
**meaningfully covers** the new surface
**Then** each of these is verified as **covering** the new code, and the verification is recorded:
`scripts/member-state-invariant` (no new `members.state` writer) · `scripts/schema-diff` (0107) ·
`scripts/microcopy` (both locales) · `scripts/access-wrapper-invariants` +
`scripts/domain-accessor-invariants` (the new domain module) · `scripts/governance-boundary` ·
`scripts/friction-budget` (⚠ AC-4 diffs **committed** history, so it passes vacuously until you commit
— [[project_friction_budget_baseline_ratchet]])
**And** the domain **limit-clamp gate** is satisfied for every dynamic `.limit()` in the new reads
([[project_domain_limit_clamp_and_savepoint_retry]])
**And** a **revert-sanity check** is run on at least one new invariant: break the code deliberately,
confirm the gate goes red, restore. ⛔ A gate that has never failed has not been shown to work
**And** `pnpm ci:local` is run to completion and the result reported **as observed** ⛔ a partial run
reported as green is the failure mode this project has named repeatedly

---

## Load-Bearing Decisions

### D1 — The governance half is not a preamble; it is half the story.
§8.8 is a reserved number with a ruling behind its reservation. Building the appeal first and
amending afterwards would make the Niyamavali *describe the implementation* rather than govern it —
the exact defect §8.4a's mechanization disclosure exists to prevent.

### D2 — The appeal is a RECORD, not a state machine, and not an overlay action.
Premises #7 and #8. The overlay has exactly three statuses and four legal arms, and every
`legal_actions` derivation reads them. An appeal that appeared as a fourth action would change the
console's buttons, the `TERMINAL_STATES` sets' meaning, and the validity payload's moderation
conjunction — none of which this story is scoped to touch.

### D3 — `allowed` directs; it never writes the overlay.
Two reasons, both structural: (i) a second write path to `restore` bypasses §8.6's record, the dwell,
and `member.restore_terminated`'s Panel exclusivity; (ii) it would make the appeal a moderation act
without a Decision Note. The restore stays a separately-attributed act, and the cross-link carries the
lineage.

### D4 — Keyed to the moderation ACTION, not the member; open-at-a-time, not exhausted-forever.
Part 9's D-F is *"exactly one journey per claim, ever"*. The Part 8 analogue of a claim is a
**moderation act**, not a member: a suspension and a later termination are distinct acts under §8.4a
(*"distinct sanctions with distinct thresholds — not two intensities of one act"*), each with its own
record, and each separately appealable. Keying to the member would make the second act unappealable
because the first was appealed. ⚠ Unlike Part 9, the one-per-action rule here is scoped to **one OPEN
appeal at a time** (AC4's partial UNIQUE index, `WHERE open`) — re-filing against the same action after
a decision is permitted, not exhausted forever. This is a narrower, Panel-ruled distinction (Q3), not
an oversight: do not "tighten" AC4's index to a non-partial UNIQUE constraint to match Part 9's "ever"
language — that would contradict the ruling.

### D5 — Mint the key; do not reuse `member.moderate`.
`pariwar_admin` and `trustee_panel` both hold `member.moderate`. A check on it cannot tell the
appellate authority from the deciding one — the indistinguishability Story 10.18 existed to end,
reopened at the one call site where separation is the whole point. Recorded at the key itself, the
`member.restore_terminated` way.

### D6 — The helpdesk is intake; it is never the adjudication queue.
Premise #3: `trustee_panel` holds no helpdesk capability, and `routed_to_role` is advisory and inert.
Routing an appeal to the Panel through the helpdesk would produce a ticket that resolves to a role
that cannot open it — a green routing decision and an unheard member.

### D7 — Two intake surfaces, one record.
The 10.29 precedent. A second table for the off-portal arm would let the two drift, and drift between
two records of one fact is a defect this project has already paid for.

### D8 — No fail-closed legal gate on the member's right to be heard.
Story 6.16's `pending_legal_review` gate refuses to **adjudicate** while leaving **initiate**
deliberately ungated — *"a claimant's right to FILE an appeal must not be blocked by a trust-side
config"* (`docs/appeal-procedural-fairness/README.md` §3). The same principle, applied to a mechanism
whose entire purpose is being heard, argues against a gate on either half. Routed as Q10 rather than
assumed, because it is a departure from a shipped pattern.

### D9 — `[SURFACE]`, with a named primitive-shaped exception.
The story is classified `[SURFACE]` by the epic. It nonetheless adds a table, two event types and a
permission key — recorded here as a deliberate, bounded exception (the 10.20 D9 precedent), so a later
reader does not read the classification as forbidding them.

---

## Tasks / Subtasks

### Task 0 — Orient (AC: all)
- [x] `git fetch origin`; confirm the tree is clean and `main` matches `origin/main`
      ([[feedback_git_fetch_before_remote_reasoning]])
- [x] Re-verify **every** premise above against the live tree; a premise that has drifted is a
      finding, not a footnote
- [x] Re-read `.decision-log.md`'s newest entries **live** — do not carry any queue count, gate status
      or ruling summary from this file without confirming it

### Task 1 — ⭐ FIRST: the routing note (AC: 1)
- [x] Author `trustee-panel-routing-note-<date>-story-10-22.md` with Q1–Q10, options, ⭐ recommendations
      and the "Feeds" column
- [x] Commit **alone** on `governance/10-22-moderation-appeal-mechanism` — verify with
      `git show --stat` that **no** `packages/` or `apps/` path appears

### Task 2 — Obtain the ruling; record it (AC: 1, 2)
- [x] Record the ruling verbatim at the foot of the note; ⚠ if the Panel re-numbers or redefines a
      question, map its numbering to this note's **before** reading any clause against a Q number
- [ ] Author the `.decision-log.md` entry with **per-clause provenance**, carrying the **full §8.8 text
      in both locales verbatim** (premise #2)
- [ ] Commit as `governance(10.22): …`; **cut the implementation branch from this commit**

### Task 3 — Author §8.8, both locales, atomically (AC: 2, 3, 8)
- [ ] `niyamavali.md` + `niyamavali.hi.md`: §8.8 between §8.7 and §8.9, structurally identical position
- [ ] Retire the reserved-numbers note; preserve the "deliberately numbered ahead" sentence; ⛔ no renumbering
- [ ] Update §8.6's *Recorded gap* to closed-by-§8.8, original preserved as superseded
- [ ] Re-disposition §8.4a's *Notice + opportunity to respond* row per Q6, both locales; the row **stays in the list**
- [ ] ⛔ No version bump, no `Effective:` date, no `[LEGAL]` line

### Task 4 — Migration `0107` + schema + policies (AC: 4, 9)
- [ ] Hand-author `0107_moderation-appeals.sql`; append `_journal` by hand at the +86400000 cadence
- [ ] `schema/member_moderation_appeals.ts` with both `piiColumn(1, …)` Tier-1 columns; grants
      `SELECT` + `INSERT` + the narrowest decision `UPDATE`
- [ ] The **partial UNIQUE index** on `(moderation_action_id)` where open
- [ ] The `filed_via = 'helpline' ⇒ helpdesk_ticket_id IS NOT NULL` CHECK
- [ ] RLS policies + `policies/index.ts` export; `MemberModerationAppealId` in `ids/index.ts`
- [ ] Apply against `twt-test-pg`:5433 ⛔ never regenerate an applied migration

### Task 5 — Domain: events, record, exclusion set (AC: 4, 5, 6)
- [ ] `member/moderation/appeal-events.ts` (or extend `events.ts`) — two payload schemas,
      `auditShape` spread, `overlayShape` **omitted**, `.strict()`
- [ ] Register in `MODERATION_EVENT_PAYLOAD_SCHEMAS` + `EVENT_TYPE_REGISTRY`; ⛔ verify
      `moderationActionForEventType` does **not** map them
- [ ] `member/moderation/appeal.ts` — pure eligibility + status derivation; `appeal-persist.ts` /
      `appeal-read.ts` — DB reads/writes, `clampLimit` on every dynamic limit
- [ ] The exclusion-set read (actions + grounds authors), ⛔ importing nothing from `claim/appeal*`
- [ ] `anonymize.ts` — new field-class constant + both column scrubs

### Task 6 — Contracts + API (AC: 5, 6, 7)
- [ ] Contracts: file/decide/read DTOs, `.strict()`, snake_case wire ↔ camelCase domain
      ([[feedback_story_validate_footguns]]); the step-up context constant exported here
- [ ] `apps/api/src/modules/member-moderation-appeals/{routes,handlers}.ts` — member intake (session +
      Turnstile + `Idempotency-Key` headers, own `openScopeTx`, 404-not-403), operator intake
      (`helpdesk.create`), adjudication (full four-hook chain + step-up)
- [ ] The adjudication **list** read (open appeals within the caller's scope) — the surface the Panel
      actually finds a filed appeal through, not just the single-record decide endpoint (AC5)
- [ ] The typed **409** for the different-individual exclusion; the `decided_by_display` snapshot with
      the fail-closed `AdminDisplayNameMissingError`
- [ ] Post-commit best-effort member notification; ⛔ a dispatch failure never fails the decision
- [ ] Re-emit `openapi/v1.yaml`; the determinism gate must be green

### Task 7 — RBAC (AC: 5)
- [ ] Mint the Q8 key with the recorded reuse-check at the key; bump `PERMISSION_CATALOG_VERSION` 33→34
- [ ] Grant per the ruling; ⛔ verify no `state`/`district`-ceiling role receives it (premise #5)
- [ ] Move `permissions.test.ts`'s `toHaveLength` 42→43 **only if** a key was minted

### Task 8 — The surfaces + the copy (AC: 3, 6, 7)
- [ ] Mobile: the CTA gets an `onPress` → the member appeal flow; ⛔ render empty/loading/error
      **outside** any `FlatList` ([[project_fabric_flatlist_empty_populated_crash]])
- [ ] Admin: the CTA gets an `onClick` → the appeal record / filing view; the adjudication console;
      the allowed-appeal ↔ restore cross-link
- [ ] Correct all four unbacked claims (AC3), naming §8.8 ⛔ Decision 6 stays superseded
- [ ] i18n en + hi: the two notice bodies, the CTA destination copy, outcome copy; microcopy gate green

### Task 9 — Records (AC: 8, 10)
- [ ] `deferred-work.md` §10.22 in the three registers
- [ ] The `docs/appeal-procedural-fairness/` sibling section with the PENDING-LEGAL-REVIEW marker,
      routed into the Story 0.13 roster
- [ ] Record the stale `epics.md:4066` → `handlers.ts:228` citation in Completion Notes

### Task 10 — Validate (AC: all)
- [ ] Unit + live-DB suites for every AC; the **polarity pairs** (AC5 exclusion; AC7 flag-on/flag-off)
- [ ] The overlay-invariance test (AC4) and the `allowed`-does-not-move-the-overlay test (AC6)
- [ ] The RTBF sentinel test (AC9)
- [ ] All gates per AC10, **including the revert-sanity check**
- [ ] `pnpm ci:local` to completion; report the result **as observed**
- [ ] Sprint-status ledger entry per [[project_sprint_status_ledger]]

---

## Dev Notes

### Files to read before writing a line
| File | Why |
|---|---|
| `docs/legal/niyamavali.md:170-292` | Part 8 entire + Part 9. §8.4a, §8.6's Recorded gap, §8.7, the reserved note |
| `docs/legal/niyamavali.hi.md:205-275` | The co-equal Hindi instrument; positions differ by ~2 lines |
| `packages/domain/src/member/moderation/{status,overlay,events}.ts` | The overlay's exactly-four-arms discipline and the `ground-appended` payload template |
| `packages/domain/src/schema/member_data_rights_corrections.ts` | **The closest precedent for this story's table** (premise #10) |
| `apps/api/src/modules/member-data-rights/{routes,handlers}.ts` | 10.21's route — the four-hook chain, the step-up-context footgun, the unauthenticated redemption exception |
| `apps/api/src/modules/member-moderation/handlers.ts` | The 6.11 attributed-decision template, and the Decision-6 comment to correct |
| `packages/domain/src/claim/appeal-eligibility.ts` | **Pattern reference ONLY** — read the shape of `getOriginalDeciderActorIds`, import nothing |
| `docs/appeal-procedural-fairness/README.md` | The go-live-gate pattern Q10 asks whether to copy, and §3's initiate-is-not-gated principle |
| `packages/domain/src/rbac/{permissions,roles,scope}.ts` | v33/42 keys; `trustee_panel`'s bundle; the rank ordering |
| `packages/ui/src/member-status/presenter.ts:325-435` | `FAILURE_STATES`, `showAppealCta`, and the ⛔ do-not-remove fence |
| `_bmad-output/implementation-artifacts/10-21-off-portal-dpdpa-access.md` | The nine findings; the release-gate banner discipline |

### Anti-patterns — the ways this story goes wrong
1. Writing code before §8.8 is ratified. **The instrument governs the mechanism, not the reverse.**
2. Importing anything from `claim/appeal*.ts`, or reusing `AppealId` / `pariwar_appeal_config`.
3. Adding a fourth `ModerationAction` / `ModerationStatus` — silent, and it breaks five sets.
4. Letting an appeal event move the overlay because `overlayShape` was spread out of habit.
5. Putting the member's grounds text in an event payload, an audit entry, or a log line.
6. A new `HELPDESK_CATEGORIES` member — unrouted under every existing per-Pariwar override.
7. Routing the appeal to `trustee_panel` via `routed_to_role` and calling it delivered.
8. Gating the off-portal arm on `member.data_rights` — that key separates *filing* from *executing*.
9. Granting the new key to `state_trustee` or `district_admin` — inert by rank ordering, not by oversight.
10. Making the exclusion a 403. It is a 409.
11. `allowed` writing the overlay directly, bypassing the Decision Note, the dwell and Panel exclusivity.
12. Testing reachability only with `termination_access_block` OFF.
13. Keying the one-appeal-per rule to the member instead of the action (D4).
14. A one-sided exclusion test that passes vacuously.
15. Reviving Decision 6 while correcting its comment. It is **superseded**, permanently.
16. Editing §8.6's Recorded gap in place instead of superseding it.
17. Adding a `member_number`-style invented column, or a second record of one fact.
18. Reporting `ci:local` green from a partial run.

### Reuse map — almost nothing here is new
| Need | Reuse |
|---|---|
| Tier-1 column | `piiColumn(1, '<field_class>')` + `anonymize.ts` scrub |
| Attributed decision | `member-moderation/handlers.ts`'s 6.11 template (display-name first, encrypt before tx, audit post-commit, notify best-effort) |
| One-per-key enforcement | Partial UNIQUE index + a read guard; 23505 on `err.cause.code` |
| Exclusion-set derivation | The *shape* of `getOriginalDeciderActorIds` |
| Off-portal identity verification | Story 10.21's route, unchanged |
| Member-authored-at-intake | Story 10.29's projector-written nullable `timestamptz` |
| Step-up | `requireStepUp` + a distinct exported context constant |
| Member-surface discipline | Story 10.2 — own `openScopeTx`, Turnstile + Idempotency-Key headers, 404-not-403 |
| Record-vs-write-path posture | `member_data_rights_corrections` |

### Testing standards
- Live-DB integration against `twt-test-pg`:5433; suite-level `{ timeout: 20000 }`
  ([[project_known_livedb_test_failures]])
- Own-committing writers ⇒ assert **membership**, never counts
- ⛔ Never `DROP SCHEMA`; never regenerate an applied migration
- Pin both sides of any time comparison to the **same injected clock** — the date-bomb class
- A red spec in a full `@twt/api` run is not evidence of a regression until it fails **in isolation**
- `ci:local` runs at `--concurrency=4` ([[project_ci_local_concurrency_oversubscription]]); the
  `git push` "hang" is the pre-push hook running the full suite

### Project structure
- Domain: `packages/domain/src/member/moderation/appeal*.ts`; schema in `packages/domain/src/schema/`;
  RLS in `packages/domain/src/policies/`
- Contracts: `packages/contracts/src/member-moderation/` ⛔ contracts must never import a pg-touching
  `@twt/domain` namespace ([[project_contracts_domain_bundle_boundary]])
- API: `apps/api/src/modules/member-moderation-appeals/`
- UI: `apps/admin/src/modules/…`, `apps/mobile/app/(membership)/`, `packages/ui/src/member-status/`
- i18n: `packages/i18n/locales/{en,hi}/common.json`
- ⚠ ESLint carve-outs are **cwd-relative role globs**; verify with `pnpm --filter <pkg> lint`
  ([[project_eslint_config_per_package_cwd]])
- ⚠ Hoist any shared type to a leaf module — a type-only→value import can materialize a runtime
  module-init cycle that typecheck and lint both stay green through
  ([[project_type_only_import_cycle_trap]])

### References
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.22` — lines 4058-4081]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-56` — lines 851-874]
- [Source: `docs/legal/niyamavali.md` §8.1-§8.9, Part 9 — lines 170-292]
- [Source: `docs/legal/trust-deed.md` Clause 26 *Consumer and Grievance Posture* — lines 297-299: *"Nothing in this Deed ousts the jurisdiction of any court, consumer forum, or authority… shall be exercised fairly and in accordance with the principles of natural justice."*]
- [Source: `docs/appeal-procedural-fairness/README.md` §1-§5]
- [Source: `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md` — lines 505-530, 575-600, 795-830]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — lines 214-245, 4195-4210]
- [Source: `.decision-log.md` — Decisions `2026-08-10-096`, `2026-08-10-097`, `2026-08-12-099`, `2026-08-14-109`, `2026-08-15-120`]
- [Source: `_bmad-output/implementation-artifacts/10-20-moderation-record-model.md` — AC1/AC2 governance-first template]
- [Source: `_bmad-output/implementation-artifacts/10-21-off-portal-dpdpa-access.md` — the off-portal route]

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, bmad-dev-story)

### Debug Log References

**Task 0 — premise re-verification at `b3e12e1`, all twelve checked live. ALL PASS.**

| # | Claim | Verified |
|---|---|---|
| 1 | §8.8 reserved, note at `niyamavali.md:274` / hi `:272`, between §8.7 and §8.9 | ✅ verbatim match, both locales |
| 2 | `docs/legal/` gitignored | ✅ `git check-ignore -v docs/legal/niyamavali.md` → `.gitignore:68:docs/legal/` |
| 3 | `trustee_panel` = `[MEMBER_MODERATE, MEMBER_RESTORE_TERMINATED]`, `scopeCeiling: 'pariwar'`, no helpdesk capability | ✅ `roles.ts:594-637`; settled-fact note at `permissions.ts:539-541` |
| 4 | `DEFAULT_ROUTING_POLICY` v1, nine categories, `complaint` → `pariwar_admin` @ `pariwar` with `sub_category: null` | ✅ `registry.ts:41,51-64` |
| 5 | `GEO_RANK` `{global:0,pariwar:1,state:2,district:3,block:4}`, pure numeric compare | ✅ `scope.ts:59-70` |
| 6 | `member.restore_terminated` held by `trustee_panel` alone | ✅ `roles.ts:79,636` — the only `MEMBER_RESTORE_TERMINATED` grant site |
| 7 | Overlay never writes `members.state`; 3 statuses | ✅ `overlay.ts:1-30`, `status.ts:21` |
| 8 | `ground-appended` spreads `auditShape`, omits `overlayShape` | ✅ `events.ts:73-79,97,109` |
| 9 | `events_log.payload` is plaintext `jsonb` | ✅ `schema/events_log.ts:60` |
| 10 | `member_data_rights_corrections.ts` exists (48 lines) | ✅ |
| 11 | `PERMISSION_CATALOG_VERSION = 33`; `toHaveLength(42)` | ✅ `permissions.ts:456`; `packages/domain/tests/rbac/permissions.test.ts:56` — ⚠ the story's `permissions.test.ts:56` citation resolves to `packages/domain/tests/rbac/`, **not** a sibling of `permissions.ts` |
| 12 | Last migration `0106`; journal `when: 1789875600000` | ✅ `packages/domain/migrations/` (⚠ **not** `packages/domain/drizzle/` — that path does not exist). Next: `0107`, `when: 1789962000000` |

**Citation checks on the four named gap sites:** `status.ts:17` ✅, `handlers.ts:414-419` ✅,
`presenter.ts:346` ✅, i18n `:339` both locales ✅. No `view-model.ts:86` site exists — the story's
Change Log already records that correction, and it holds.

**`.decision-log.md` read live:** head is `2026-08-15-120` (Story 10.29); **122** numbered entries.
Next entry for this story: `2026-08-15-121`. Standing Panel obligation queue **last enumerated at
NINE** (`deferred-work.md:283`, Story 10.20, 2026-08-12); ⛔ **not re-enumerated** by this story and
no entry since restates it — a last-recorded figure, not a verified current one.

**⭐ Task 0 FINDING — a FIFTH untrue copy site, absent from the story's inventory.**
`moderation.notice.terminated.body_access_retained` (`packages/i18n/locales/{en,hi}/common.json:342`)
tells a **terminated** member *"You can sign in as usual and request a review from your membership
status page."* — the same unkeepable promise as site #4, made to the harsher sanction, in both
locales. Not drift (the copy has not changed); an **omission in the story's inventory**, and material
because AC3's requirement is that the shipped notice copy becomes **true**, not that four named
strings do. Raised as **F-4** in the routing note; proposed disposition is to fold it into AC3
without a separate ruling, with the Panel invited to route it separately if it prefers.

### Completion Notes List

**Governance half — Task 0 and Task 1 complete; Task 2 is BLOCKED on the Panel ruling.**

- Task 0: all twelve premises re-verified live (table above). Two **path** corrections to the story's
  own citations recorded: migrations live in `packages/domain/migrations/`, and the key-count
  assertion in `packages/domain/tests/rbac/permissions.test.ts:56`. Neither changes a premise.
- Task 1: `trustee-panel-routing-note-2026-08-15-story-10-22.md` authored with Q1–Q10 (Q1, Q2, Q3, Q4
  and Q8 marked ⛔ BLOCKING), lettered options, non-binding ⭐ recommendations, the **cost of each
  option stated plainly**, a **"Feeds"** mapping per question, a *What non-answer would mean* table, a
  *What a ruling would NOT mean* section, the queue reported as last-enumerated-not-re-verified, and a
  ruling template. Four findings (F-1…F-4) raised ahead of the ruling.
- Committed **ALONE** as `56663ac` on `governance/10-22-moderation-appeal-mechanism`; AC1's gate
  verified by `git show --name-only` → **zero** `packages/` and **zero** `apps/` paths. The story spec
  and the sprint-status flip were committed separately and **ahead** of it (`c0cb7eb`) precisely so the
  governance commit carries one file.
- ⚠ **`epics.md:4066`'s `handlers.ts:228` citation is STALE** — confirmed live: `:228` is now the
  early-legality fast-fail (Story 10.20 inserted the escalation-test block ahead of it) and the
  appeal-CTA claim lives at `:414-419`. Recorded here per AC3; ⛔ the epic is **not** silently edited.

*(Superseded: the HALT above was awaiting the ruling. The ruling arrived 2026-08-15 — see below.)*

**Task 2 — the ruling arrived and is RECORDED VERBATIM (`41dea31`). It is NOT YET ACTIONABLE.**

All ten questions were answered — every one of them option (a), matching the ⭐ — and then **Q3D was
MATERIALLY AMENDED beyond the options offered**: option (a) was adopted and immediately replaced with a
**three-tier appeal ladder** (1 Trustee → 2 Trustees → all 3, final), majority vote, **automatic
escalation on a 1–1 split with no casting vote**, **no recusal for prior participation**, and
**finality after the third**. Recorded as an **addition**, not read back into option (a) as though it
had been one (the Decision `2026-08-12-099` precedent).

⛔ **STOPPED at the Panel's own standing direction** — *"If any AC cannot be implemented exactly from
these rulings, stop and surface the conflict rather than inventing a rule."* **§8.8 is NOT authored in
either locale, no `.decision-log.md` entry exists, and the implementation branch is NOT cut.** An entry
authored now would have to state a ruling that is not internally consistent, and Decision
`2026-08-09-095`'s per-clause provenance requirement cannot be met while two `[Trustee-ratified]`
clauses contradict each other.

**Seven conflicts, each stated against the instrument or file that establishes it, all verified live:**

| # | Conflict | Breaks |
|---|---|---|
| **C-1** | Q1(a) *"single internal appeal"* vs the three-appeal ladder. §8.8 must say one thing. | AC2 |
| **C-2** | Q2B (*"a **different** Panel member **must** hear it"*) vs Q3D (*"prior participation does **not** create a recusal requirement"*). Head-on; three defensible readings. | ⛔ **AC5 entirely** — the exclusion set, the typed 409 and the mandatory polarity-pair test have **no subject** |
| **C-3** | **Trust Deed Clause 18(a)** (`trust-deed.md:211`) puts the Board at **three-to-nine** Trustees. Q3D presumes exactly three (*"all 3"*, *"1–1 split"*, *"the full three-member Panel"*). `trustee_panel` is a role with **no cardinality**. | AC2, AC4, AC5 |
| **C-4** | **Trust Deed Clause 19(c)** (`trust-deed.md:229`) **mandates** the Chairperson's casting vote on equality, and §8.7 binds the Panel to Clause 19 expressly. Q3D disapplies it. ⛔ A Part 8 amendment **cannot** disapply a Deed clause — that is a **Clause 27(b)** Deed amendment (two-thirds + a supplementary *registered* deed). There is also **no Chairperson concept anywhere in the codebase**. | AC2, and the story's schedule under the amend-the-Deed-first route |
| **C-5** | AC4's record is **singular** (`decided_by_actor_id` / `_display` / `_at`). A majority vote needs a **votes child table**, a **tier** column, a vote→outcome derivation and an auto-escalation transition — none scoped. Also un-asked: does each voting Trustee author their **own** reasoned outcome (N Tier-1 ciphertexts)? | AC4, AC9, Tasks 4/5/6 |
| **C-6** | AC4/D4's partial-UNIQUE rule is superseded by a **third** constraint (≤3 per action, tier-ordered, terminal exhaustion) — neither the shipped rule nor the naive tightening **D4 expressly forbids**. | AC4, D4 |
| **C-7** | The ladder resembles Part 9's three stages (§1.3 glosses them as *"the three escalation tiers"*), so AC2's not-Part-9 sentence must now **distinguish**, not merely assert. | AC2 (drafting guidance, not a new ruling) |

**Clean and ready the moment C-1…C-6 resolve** — recorded so the register is not read as blocking more
than it does: **Q2A · Q3A · Q3B · Q3C · Q4A · Q4B (AC6 stands entire) · Q5 · Q6 · Q7 (AC7 stands
entire) · Q8's RBAC half · Q9 · Q10 (AC8's deferral register stands).**

**Un-ruled, and preserved as recommendations ONLY — never represented as decisions**, per the Panel's
direction: **F-4** (the fifth untrue copy site); **Q2.2's exhausted-Panel sub-point**; and the **Q8 key
NAME** (`member.moderation_appeal.decide` is the author's proposal — Q8(a) ruled *that* a key be
created, not *which*).

### File List

**Added**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-15-story-10-22.md`

**Modified**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `10-22…: ready-for-dev → in-progress`
- `_bmad-output/implementation-artifacts/10-22-moderation-appeal-mechanism.md` — this record

*(No `packages/`, `apps/`, `docs/` or migration file has been touched. §8.8 is **not** authored, no
`.decision-log.md` entry exists, and the implementation half has **not** begun.)*

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-15 | **Task 2, partial — the ruling is RECORDED, not actionable.** All ten questions ruled (every one option (a)), and **Q3D materially amended beyond the options offered** into a three-tier appeal ladder with majority voting, tie auto-escalation, no casting vote, no recusal, and finality at the third. Recorded verbatim at the foot of the routing note (`41dea31`) with a numbering map and an addition-not-option flag. ⛔ **SEVEN CONFLICTS SURFACED (C-1…C-7)** — including two against the **Trust Deed** itself (Clause 18(a): the Board is 3–9 Trustees, not 3; Clause 19(c): the Chairperson's casting vote is **mandated** and cannot be disapplied by a Part 8 amendment). **§8.8 NOT authored, no `.decision-log.md` entry, implementation branch NOT cut** — per the Panel's own direction to surface rather than invent. |
| 2026-08-15 | **Task 0 + Task 1 (AC1).** Twelve premises re-verified live at `b3e12e1` — all PASS; two path citations in the story corrected (`packages/domain/migrations/`, `packages/domain/tests/rbac/permissions.test.ts`). ⭐ Task 0 finding: a **fifth** untrue copy site (`moderation.notice.terminated.body_access_retained`, en+hi) absent from the story's inventory — raised as routing-note **F-4**. Routing note authored with Q1–Q10 and committed **ALONE** (`56663ac`, zero `packages/`/`apps/` paths) on `governance/10-22-moderation-appeal-mechanism`. ⛔ **Story HALTED at Task 2 awaiting the Trustee Panel ruling.** |
| 2026-08-15 | Story created — status `ready-for-dev`. Baseline `b3e12e1`. |
| 2026-08-15 | Validated against live tree at `b3e12e1`: corrected a wrong `view-model.ts:86` citation (2 sites), corrected Q8's `roles.ts` line numbers and named `verifier`'s inert `member.moderate` grant, added an AC5 adjudication-list requirement (Panel discoverability), added a Q3 sub-clause + D4 clarification + AC4 clause on re-filing after a decision, and flagged AR-56's citation in AC3 as analogy not direct ratification. All 12 verified premises independently re-confirmed PASS. |
