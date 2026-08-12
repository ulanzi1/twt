---
baseline_commit: 4c7fdee490c18b3010dcdb3b392cc1806b5dc262
---

# Story 10.20: Moderation Record Model `[PRIMITIVE]`

Status: review

## Story

As a Trustee Panel recording a moderation decision,
I want the record to separate the ground, the facts, and the proportionality reasoning,
so that a decision can be reconstructed, tested against the principles, and enriched without being rewritten.

---

## What this story is

Today a moderation action carries **one** structured `reason_code` and **one** free-text
`rationale_ciphertext`. That single field is asked to answer three different questions at once — *what
happened*, *why this sanction*, and *how can the case be reconstructed* — and it answers none of them
testably. `member_moderation_actions` (migration `0091`) has exactly eleven columns and no notion of a
supporting ground, an evidence reference, or a proportionality test.

This story does **three things, in this order**:

1. **Governance.** Niyamavali **§8.5** (grounds for termination), **§8.6** (the principles, led by the
   constitutional sentence) and **§8.9** (the future governance test) are authored — three of the four
   numbers `niyamavali.md:230` reserves, routed here by Story 10.19
   (`deferred-work.md:3865-3869`). §8.4a's **mechanization-status disclosure is corrected and updated**
   in both locales. ⛔ **Do not pre-commit to a count.** AC3 disposes §8.4a's four rows as one
   *correction*, one *mechanization*, one *partial* and one *untouched* — **a correction is not a
   mechanization**, and the true number is whatever AC3's dispositions add up to once Q4 rules.
2. **The record model** (WS-A/WS-B/WS-E). One hand-authored migration `0099` splits the conflated
   field into: **primary + supporting grounds** (a new append-only table), a renamed **Decision Note**,
   a **two-part escalation justification**, and **evidence references that are references, not prose**.
3. **The safeguards** (WS-C/WS-D/WS-F). The escalation justification becomes **mandatory and
   structurally two-part** on `terminate`; a **dwell/notice precondition** enters
   `nextModerationStatus`'s *caller*; and the frozen reason-code registry gains **guidance** metadata
   without narrowing what it permits.

**The constitutional frame, from the ratified §8.4a and PRD FR-56 (`prd.md:866`):**
**Termination is an exceptional governance act, not a stronger suspension.** Every acceptance
criterion below is subordinate to that sentence.

> **⚠ Six labelled workstreams; split along them, never across them.** `epics.md:3832`: *"WS-B is the
> only one that touches the schema; WS-A/C/D/E/F build on it; WS-F is data and copy only. If capacity
> requires splitting, split along these lines rather than re-cutting the scope."* A split that ships
> WS-B's columns without WS-C's enforcement leaves nullable governance fields nobody fills.

---

## Verified premises — checked live at `4c7fdee`

**⛔ #1 — §8.5, §8.6 and §8.9 do not exist, and §8.7 already sits ahead of them.**
`docs/legal/niyamavali.md:230` (mirror `niyamavali.hi.md:228`): *"§8.5, §8.6, §8.8 and §8.9 are
reserved. §8.7 is deliberately numbered ahead of them; the intervening numbers are held for the
remaining Part 8 amendments and are **not to be closed up**."* So §8.5/§8.6/§8.9 are authored **in
their reserved slots, physically before §8.7**, and the reserved-numbers note is **edited to drop the
three now-landed numbers while keeping §8.8** (10.22's). Do **not** renumber §8.7.

**⛔ #2 — §8.4a's mechanization disclosure is WRONG on one of its four rows, in both locales.**
`niyamavali.md:212` (hi `:210`) states: *"**Prior sanction required** — no precondition requires a
prior suspension."* **That is false at HEAD.** `nextModerationStatus('none','terminate')` returns
`null` (`packages/domain/src/member/moderation/status.ts:41-42`), so termination structurally *cannot*
be reached except from `suspended` — Story 10.10's Decision 2. What is actually missing is **dwell**:
the decision brief states it precisely (`moderation-model-decision-brief.md:516-518`) — *"No dwell
time. `nextModerationStatus('suspended','terminate')` returns `'terminated'` unconditionally. Two API
calls seconds apart terminate a member …"*  ⇒ the row must be **corrected, not merely flipped to
mechanized**: the precondition exists and is *nominal*. Correcting an over-stated gap is the same
copy-truth discipline as correcting an over-stated capability.

**⛔ #3 — `rationale_ciphertext` carries FOUR attachments a standalone rename would re-do.** Confirmed
at all four sites: `piiColumn(1, 'member_moderation')` (`schema/member_moderation_actions.ts:90`), the
decrypt endpoint (`apps/api/.../member-moderation/routes.ts:208-215` → `handlers.ts:414-461`), the
RTBF scrub (`packages/domain/src/member/anonymize.ts:183-185`), and migration `0092`'s
**column-level** `GRANT UPDATE ("rationale_ciphertext")` (`0092:32`). This is exactly why
`epics.md:3843` bundles the rename here.

**⛔ #4 — ⭐ THE TRAP: a Postgres column-level GRANT does NOT extend to a new column.** `0092` granted
UPDATE on **one named column**. Every *new* Tier-1 column this story adds
(`escalation_*`, the grounds `note`) is therefore **structurally un-erasable** the moment it ships —
the identical defect `0092`'s own header describes (`0092:1-14`), reintroduced. **Migration `0099`
must carry its own `GRANT UPDATE (…)` for every new PII column, and `anonymize.ts` must scrub them.**
A column rename is different and safe: Postgres tracks privileges by attribute, so
`GRANT UPDATE ("rationale_ciphertext")` follows `rationale_ciphertext → decision_note_ciphertext`
automatically. **The rename needs no re-grant; the new columns do.**

**⛔ #5 — the two-part "not a restatement" check CANNOT be a DB constraint or a ciphertext compare.**
Envelope encryption is non-deterministic (`encryptModerationRationale` →
`encryption.encryptTier1` + `serializeEnvelope`), so two identical plaintexts produce different
ciphertexts and a `CHECK (a <> b)` proves nothing. ⇒ the anti-restatement guard runs on **plaintext,
in the route, before encryption**, alongside the existing `assertRationalePresent` placement
(`handlers.ts:197-208`). The DB half is what a CHECK *can* express: **presence**, `NOT NULL` iff
`action = 'terminate'` — the `member_moderation_actions_rejoin_iff_terminate` shape (`0091:61`)
reused verbatim.

**⛔ #6 — the last applied migration is `0098`.** `packages/domain/migrations/meta/_journal.json` ends
at `idx: 98`, `tag: "0098_story-8-14-close-cycle-alert-indexes"`, `when: 1789184400000`. This story's
migration is **`0099`**, journal `idx: 99`, `when: 1789270800000` (+1 day, the file's own cadence).
⛔ **HAND-AUTHORED. Never `db:generate`** — the drizzle snapshot baseline is frozen at `0020` and a
regenerate raises `42P07` ([[project_live_db_test_gotchas]]; `0091:3-5` states the rule).

**⛔ #7 — WS-F and PRD FR-56 pull in opposite directions, and the resolution must be stated.**
`epics.md:3866` forbids narrowing `appliesTo` (*"it stays `['suspend','terminate']`"*), while
`prd.md:871` lists as a **testable consequence**: *"Grounds for termination are enumerated separately
from grounds for suspension; the two sets are not interchangeable."* **Both hold, at different
layers:** the *enumeration* is **governance text** (Niyamavali §8.5), the *registry* stays permissive
with `ordinarilyResultsIn` **guidance**, and the Trustee Panel — not the registry — determines the
sanction (principle 2). ⛔ A dev agent that "satisfies FR-56" by narrowing `MODERATION_APPLIES_TO`
(`reason-codes.ts:72`) has violated the epic AC and pre-empted the Panel.

**✅ #8 — ALREADY DISCHARGED: PRD FR-56 needs no edit.** `prd.md:866-874` already carries the
constitutional sentence verbatim, the two-part escalation justification with part (a)'s three
alternatives, and the four testable consequences. The SCP §4c amendment landed 2026-08-04. **Record as
discharged-before-start so the dev agent does not re-apply it.**

**✅ #9 — ALREADY DISCHARGED: 10.18 unblocked this story and said so.** `deferred-work.md:3710`:
*"Story 10.20 is unblocked."* `trustee_panel` exists at `scopeCeiling: 'pariwar'`
(`packages/domain/src/rbac/roles.ts:560`) holding `member.moderate`, and Panel authority under Part 8
is **concurrent, not exclusive** (Decision `2026-08-10-096` clause 3). ⇒ **no new permission key, no
`PERMISSION_CATALOG_VERSION` bump** (it stands at **31**, `permissions.ts:397`). Do not invent one.

**⚠ #10 — the epic's "checkable from data" claim is reachable, but not from where you'd guess.**
`contribution.r7a_restorations_used` is produced by `@twt/validity-service`
(`producer.ts:550`) from `readContributionFactInputs` (`packages/domain/src/contribution/facts.ts:633`
— the **per-member** reader; `:867` is the Pariwar-wide scan variant Story 10.11 uses). The moderation
handler currently imports no validity code at all. ⇒ using the fact is a **new dependency edge** from
`apps/api/src/modules/member-moderation` to `@twt/validity-service`, which
`apps/api/src/modules/trustee-lite/handlers.ts:60` already establishes as legal. **It is not free, and
Q5 decides whether it is worth it.**

**⚠ #11 — there is NO `docs/` governance reference for the moderation model.** SCP §4f promises one
(*"New — the permanent home §5a asks for … Cited by 10.20/10.21/10.22/10.23"*). It does not exist;
`docs/` was checked. Unlike `docs/legal/`, **`docs/` is tracked** — so this file is the record model's
one *diffable* home, and it is this story's to create (AC13).

---

## ⛔ The one thing this story must not do: manufacture a ratification

Identical constraint to Stories 10.18 and 10.19, unmoved. The Niyamavali is an **unadopted draft**
(`niyamavali.md:5` — `[[v1.0]]`, `[[date]]`, unfilled) and **counsel is not engaged** (every return
field in `docs/legal-counsel-engagement/` is `<PENDING>`).

| Landing means | Landing does NOT mean |
|---|---|
| §8.5, §8.6, §8.9 authored into `niyamavali.md` **and** `niyamavali.hi.md` | A `[[v1.0]]` → `v1.1` version bump |
| Q1–Q7 routed to the Panel and ruled (AC1) | An `Effective:` or `Adopted by Board resolution` date |
| The ruling — **quoting every new section verbatim, both locales** — recorded in `.decision-log.md` | A `[LEGAL]` counsel-acceptance entry |
| The owed counsel review recorded **as owed** in `deferred-work.md` | Any claim Part 8 is legally settled |

Use `[[feedback_closure_language_precision]]` verbs: **authored and Panel-ratified**; **counsel review
remains outstanding**. Never "approved", never "final".

⚠ **`docs/legal/` is gitignored** (`.gitignore`) — the amendment leaves **no diff and no blame**. The
`.decision-log.md` verbatim reproduction **is** the record, in both locales. Story 10.18's Escalation 7,
unchanged and not this story's to fix.

---

## In scope / out of scope

| In scope | Out of scope → owner |
|---|---|
| Niyamavali **§8.5**, **§8.6**, **§8.9** (new) + the **§8.2 disposition** of the two unanchored codes, `en` + `hi` | **§8.8** (the appeal route) → **10.22** |
| **§8.4a's mechanization disclosure**: corrected (premise #2) and updated for what this story mechanizes | Building the moderation **appeal** → **10.22** |
| A routing note + `.decision-log.md` Decision settling **Q1–Q7** | Building the **off-portal DPDPA** route → **10.21**; flipping `termination_access_block` |
| **WS-B** migration `0099`: rename + `escalation_*` + `evidence_refs` + `member_moderation_grounds` | A **generic** discipline-record primitive → recorded extraction point ONLY (WS-F, D7) |
| **WS-A/C/D/E/F** domain, contracts, API and the intrinsic admin authoring surface | A new `ModerationStatus` label / sanction tier — **none is added** (D8) |
| The **RTBF completeness** of every new Tier-1 column (premise #4) | `member_moderation_actions.reason_code`'s **removal** — it stays, as the primary ground (D3) |
| `docs/moderation-record-model.md` — the tracked governance reference (premise #11) | A new permission key or catalog bump (premise #9) |
| The `ordinarilyResultsIn` **guidance** metadata + its admin rendering | Narrowing `appliesTo` — ⛔ forbidden (premise #7) |

⚠ **Scope additions beyond the epic's literal AC, flagged per the 10.18/10.19 convention:**

- **The Niyamavali §8.5/§8.6/§8.9 work (AC1–AC3).** Provenance: `deferred-work.md:3865-3869` routes
  them here by name, and the SCP §4d rows 6/7/11 source them to D10. Without them, WS-C/WS-D enforce
  rules the governing instrument does not yet state.
- **AC3's §8.4a correction** (premise #2) — the instrument currently understates its own mechanization.
- **AC11's RTBF completeness** (premise #4) — the epic does not name it; shipping without it
  reintroduces `0092`'s defect on three new columns.
- **AC13's `docs/` reference** (premise #11) — promised by the SCP, owned by nobody, and the only
  tracked home for a record model whose constitutional half lives in an untracked file.
- **D2's TWO escalation columns**, where `epics.md` WS-B names one `escalation_justification`. The
  epic's very next line requires the two parts be *"separately answerable"* and neither *"pre-filled
  from the other"*, which a single column cannot deliver. This is a deviation from the epic's
  **literal column name** — taken deliberately, recorded here per the 10.18/10.19 convention.
- **AC5's `NOT VALID` escalation CHECK** — the repo's **first**. Forced by the table already being
  populated with `terminate` rows (AC5 item 4); the un-validated legacy rows become an **owed
  obligation** (AC13.5), never a silent gap.
- **AC4's `IMMUTABLE` validator FUNCTION** — a new DB object the epic does not name, taken because
  Postgres permits **neither** a subquery **nor** a set-returning function inside a `CHECK`, so the
  per-entry shape has no other legal home. Precedented (`0001`, `0035`, `0036` and seven more
  migrations declare functions), and the alternative is not "a simpler CHECK" but **no per-entry
  enforcement at all**.
- **AC9's denormalized `member_id` on the grounds table** — the epic's WS-E column list does not
  include it. Without it AC11's RTBF scrub cannot be written in the shape every other scrub uses, in
  the one path where a miss leaves PII behind an erasure request.

---

## Acceptance Criteria

### AC1 — Q1–Q7 are ROUTED to the Trustee Panel, never authored unilaterally

> ✅ **SATISFIED 2026-08-12.** The note was authored and committed **alone** on
> `governance/10-20-moderation-record-model` (`5ea5213`), with no `packages/` or `apps/` file in the
> commit, and the Panel has **ruled all seven**. The ruling is recorded verbatim at the foot of
> `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-11-story-10-20.md`, to be
> entered as Decision `2026-08-12-099` with the §8.5/§8.6/§8.9 verbatim text at Task 3.
> ⚠ **The Panel's Q4 sub-numbering is not this note's** — the mapping is recorded in the note and must
> be consulted before any clause is read against a question number.
> ⚠ **Two dimensions were ADDED by the ruling** (the immediate-termination exception, and a third
> console shape) and **Q7.2 was materially redefined** rather than merely confirmed. See AC8 and AC13.8.

**Given** [[feedback_governance_commits_precede_implementation]] and the 10.18/10.19 precedent
**When** the governance half begins
**Then** a routing note `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-story-10-20.md`
is authored **and committed ALONE** on a `governance/…` branch **before any `packages/` or `apps/`
change**, carrying seven questions, each with lettered options, a ⭐ recommendation, and a **"Feeds"**
column naming the AC the answer unblocks:

| Q | Question | Feeds |
|---|---|---|
| **Q1** | **§8.5 — grounds for termination.** Land (a) the failure-of-trust **test** plus the six-item enumeration (forged documents · identity fraud · financial fraud · deliberate concealment · repeated malicious abuse · persistent conduct materially threatening the Trust after due process), or (b) the test alone, leaving enumeration to case law? ⚠ (b) makes `prd.md:871`'s "enumerated separately" consequence untestable | AC2 |
| **Q2** | **§8.6 — the principles.** Land principles 1–7 (`moderation-model-decision-brief.md:531-583`) with the constitutional sentence **verbatim and leading**, plus the two-part escalation justification? Any principle the Panel declines must be named, because WS-C/WS-D mechanize 3, 5, 6 and 7 | AC2, AC6, AC8 |
| **Q3** | **§8.2 — the two unanchored codes.** `regulator-action` and `voluntary-pending-review` ship today with **no §8.2 anchor** (D7.2). (a) **authorise** them in §8.2, or (b) **retire** them. ⛔ **The routing note must state that (b) is not implementable by this story**: retiring a code is a vocabulary change WS-F forbids here (`epics.md:3867`) and would need its own story plus a `moderation_reason_code` enum migration against live rows | AC2, AC10 |
| **Q4** | **WS-D — the dwell/notice precondition.** What interval must separate a suspension from the termination that follows it, and is *"opportunity to respond"* satisfied by **elapsed dwell alone** (a), or does it require a **recorded response-or-waiver** (b)? ⭐ Recommend (a) for v1 with (b) named as 10.22's, since a response has nowhere to arrive until the appeal route exists. Also: does the duration live in the **registry as a version-pinned policy clause** (the FR-8 / Story 10.23 pattern) or as a code constant? ⭐ Registry | AC8 |
| **Q5** | **WS-C — restoration exhaustion.** `epics.md:3852` says terminating on a ground with an available restoration path "requires a recorded justification", and that `contribution.r7a_restorations_used >= 2` makes exhaustion *checkable from data*. Is that (a) a **recorded justification + a fact snapshot on the record**, or (b) a **hard server-side block** below the threshold? ⚠ (b) makes a Panel decision refusable by a projection — see premise #10 for the cost, and D6 | AC7 |
| **Q6** | **WS-F — `ordinarilyResultsIn` guidance.** The per-code guidance value is *governance data*, not an implementation default. Ratify the value for each of the seven moderation codes (⭐ recommend `'suspend'` for all seven, per §8.4a's test — the Panel escalates by recording why, not by the registry pre-empting it). ⚠ **The ruling must also cover the THREE restore grounds** (`rule-clearance`, `trustee-discretion`, `moderation-error`), which share the one `ReasonCodeMeta` type: ⭐ ratify **`null`** for all three — *a code that justifies no sanction carries no sanction guidance*. Without that clause the type forces a dev agent to invent guidance the Panel never gave (AC10) | AC10 |
| **Q7** | **§8.9 + the severity gradient.** Land the future-governance test (*"Any future moderation ground or sanction shall be evaluated against these principles rather than by analogy to existing reason codes"*) here or with 10.22? **And** confirm the §2.5 gradient the SCP asks about (`sprint-change-proposal-2026-08-04.md:559`): the 12-month rejoin lock applies to a member *"terminated **or lapses**"*, so termination's harshest consequence is shared with ordinary lapsing | AC2, AC13 |

**And** the ruling is recorded as a single `.decision-log.md` entry with **per-clause provenance** —
Decision `2026-08-09-095` made per-clause provenance **mandatory** on any entry mixing ratification with
author analysis; an author-written clause is labelled `[Author-committed]`, never flatly
"Trustee-ratified"
**And** the note states plainly what a ruling does **and does not** mean (the fence table above)
**And** `git log` reads **governance → governance → implementation**, with the implementation branch
**cut from the ratifying commit**, so the ordering is structural rather than asserted

### AC2 — §8.5, §8.6 and §8.9 are authored in their RESERVED slots, both locales

✅ **RULED — the content is now fixed** (Decision `2026-08-12-099`):
- **Q1 (a)** — §8.5 carries **both** a general test (*termination requires conduct evidencing a
  fundamental failure of the trust on which membership rests*) **and** the six enumerated grounds:
  forged documents · identity fraud · financial fraud · deliberate concealment · repeated malicious
  abuse · persistent conduct materially threatening the Trust after due process. **Both govern.**
  ⛔ The six are **not** a licence to invent further termination grounds in application code.
- **Q2 — all seven principles adopted.** §8.6 carries them, constitutional sentence leading and
  verbatim — **seven** numbered principles (the brief's 1–7, including principle 3 *Proportionality*,
  which the ruling's summary bullets do not restate — **Panel-confirmed 2026-08-12 that it STANDS**).
  ⛔ The appeal gap is **stated, not closed**, as an **unnumbered *Recorded gap* clause — NOT an eighth
  principle** — do not implement §8.8 here. See Decision `2026-08-12-099` clause 8.1.
- **Q3 (a)** — §8.2 is amended to **authorise** `regulator-action` and `voluntary-pending-review`.
  ⛔ No retirement, **no vocabulary-removal migration**, no enum change.
- **Q7.1 Yes** — §8.9 lands here, establishing that any future moderation ground or sanction is
  evaluated **against the principles**, never justified by analogy to an existing reason code. ⛔ A new
  reason code is therefore **not** a route to new moderation policy.

⚠ **Principles 5 and 6 as adopted each carry an express immediate-termination exception** — the wording
must preserve *"normally"*, because AC8's mechanization depends on it and an absolute reading would
contradict the ruling (see AC8's reshaping banner).

**Given** premise #1 and the Q1/Q2/Q3/Q7 rulings
**When** the Part 8 amendment lands
**Then** `docs/legal/niyamavali.md` gains **§8.5**, **§8.6** and **§8.9** *physically between §8.4a and
§8.7*, and `niyamavali.hi.md` receives them at the structurally identical position — **the Hindi is a
co-equal governing instrument, not a translation artifact**
**And** §8.6 opens with the constitutional sentence **verbatim and leading**:
> **Termination is an exceptional governance act, not a stronger suspension.**

**And** the `:230` / hi `:228` reserved-numbers note is **edited to reserve §8.8 only**, and the
sentence *"§8.7 is deliberately numbered ahead of them"* is retained as the historical record of why
the ordering looks the way it does — ⛔ the numbers are **not closed up** and §8.7 is **not renumbered**
**And** the §8.2 disposition lands **in §8.2 as an amendment** — Q3 ruled (a), so both codes are
authorised in the instrument and nothing is recorded as owed on this question
**And** all new text is reproduced **verbatim, both locales**, in the `.decision-log.md` entry, because
`docs/legal/` is gitignored and that entry is the only durable copy
**And** **no** version bump, `Effective:` date, or `[LEGAL]` line is written, and none may be inferred
**And** an `APPENDIX A — RULE INDEX` entry is added **only if** the Panel's ruling requires one —
§8.5/§8.6/§8.9 are principles and grounds, not indexable `R`-rules (the Decision `2026-08-10-096`
clause 10 / `2026-08-10-097` precedent); **record the absence** so a later reader does not read it as
an omission

### AC3 — §8.4a's mechanization disclosure is CORRECTED, then updated

**Given** premise #2 — the *"Prior sanction required"* row asserts a gap that does not exist
**When** this story updates the §8.4a disclosure to reflect the **mechanisms actually landed and
green** and the **prior-sanction correction** — ⛔ which is **not** one of them — with **all four rows
dispositioned, including the one this story leaves untouched**
**Then** the disclosure block (`niyamavali.md:209-215`, hi `:207-213`) is rewritten in **both locales**
so that:
- **Prior sanction required** — is recorded as **already structurally enforced** (`none --terminate-->`
  is illegal) and previously **understated**, with what was actually missing named: **dwell**
- **Escalation justification** — flips to **mechanized** (WS-C)
- **Notice + opportunity to respond** — flips to **mechanized to the extent Q4 rules**; if Q4 rules
  (a), the *opportunity to respond* half is recorded as **still unmechanized, owned by 10.22**
- **Portal access** — is **untouched**: still gated on the `termination_access_block` flip, which is
  Story 10.21's and **not this story's**

**And** the block's count sentence (*"Four of its rows…"*) is rewritten to match the four dispositions
above **row by row**, rather than collapsed into a single count — ⛔ **a correction is NOT a
mechanization**, and a sentence claiming this story "mechanized three of four rows" would repeat
premise #2's defect in the opposite direction. If a count is retained at all, it counts **only** rows
an AC actually mechanized, and its arithmetic must be checkable against AC3's own list
**And** ⛔ a row is flipped to mechanized **only after** the enforcing code and its test are green — a
disclosure that runs ahead of its mechanism is the same defect class, inverted

### AC4 — WS-A: the record carries three separable parts, and each is structurally distinct

**Given** `epics.md:3836-3838`
**Then** a moderation record carries:

| Part | Form | Required | Where |
|---|---|---|---|
| **(1) Reason code(s)** | Structured registry vocabulary — **exactly one primary**, any number of supporting | Always | `member_moderation_actions.reason_code` (primary, unchanged) + `member_moderation_grounds` |
| **(2) Decision Note** | Prose, governance-grade, Tier-1 | Always, every action | `member_moderation_actions.decision_note_ciphertext` (renamed) |
| **(3) Evidence** | **References only, NEVER free text** — complaint #, investigation #, helpdesk ticket, document id, external order number | Optional | `evidence_refs` JSONB, on the action **and** on each ground |

**And** ⭐ **evidence references are structurally incapable of carrying prose.** Each entry is a
`.strict()` object `{ kind, ref }` where `kind` is a **bounded enum** and `ref` matches a restricted
identifier charset with a short max length — **a sentence must be REJECTED, not truncated**, and a test
plants one and asserts the 422
**And** the array is **cardinality-capped** and validated in the domain; the DB asserts
`jsonb_typeof(evidence_refs) = 'array'`, **the cap, AND the per-entry shape**
**And** ⚠ **be exact about what the DB actually backstops.** Array-ness and cardinality alone do
**not** stop a raw-SQL writer: `[{"kind":"anything","ref":"<a full sentence of prose>"}]` satisfies
both, and is precisely the free-text evidence this AC exists to make structurally impossible. **The
per-entry shape check is the half that closes it.**
**And** ⛔ **THE PER-ENTRY SHAPE CANNOT BE AN INLINE `CHECK` EXPRESSION — both obvious spellings are
hard errors, verified against `twt-test-pg` (PG 16.14):**
- `CHECK ((SELECT bool_and(…) FROM jsonb_array_elements(evidence_refs) e))` →
  **`ERROR: cannot use subquery in check constraint`**
- `CHECK (jsonb_array_elements(evidence_refs) ? 'kind')` →
  **`ERROR: set-returning functions are not allowed in check constraints`**

⇒ the per-entry shape rides an **`IMMUTABLE` SQL helper function** the CHECK calls — the set-returning
scan lives inside the function body, where it is legal. `0099` therefore declares, before the table
DDL, a function in the `0001`/`0035`/`0036` `CREATE FUNCTION`-in-a-migration voice, and the CHECK is
`CHECK (moderation_evidence_refs_valid(evidence_refs))`. The verified-working body shape:

```sql
CREATE OR REPLACE FUNCTION moderation_evidence_refs_valid(v jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(v) = 'array' AND jsonb_array_length(v) <= <cap> AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v) e
     WHERE jsonb_typeof(e) <> 'object'
        OR (SELECT count(*) FROM jsonb_object_keys(e)) <> 2
        OR NOT (e ? 'kind' AND e ? 'ref')
        OR e->>'kind' NOT IN (<the bounded kind set>)
        OR e->>'ref' !~ '<the ref charset + length bound>' );
$$;
```

Driven live, this shape **accepts** `[]` and `[{"kind":"complaint","ref":"CMP-2026-0001"}]` and
**rejects** a prose `ref`, an unknown `kind`, and a third key — i.e. it is the half AC4 needs, not a
weaker restatement of the array/cap pair
**And** ⛔ **the array + cap CHECKs stay INLINE and separate** from the function call, so a violation
names which rule it broke; ⛔ the function is **not** used to re-implement them
**And** ⛔ If the shape check is judged not worth its cost, the honest statement is *"the entry shape
is enforced in the domain only; a raw-SQL writer can bypass it"* — written into the migration header
**and** `docs/moderation-record-model.md`, never the stronger claim
([[feedback_record_unattested_no_backfill]]). ⛔ What is **not** available is the middle position of
claiming a shape CHECK that the DDL could never have created
**And** ⛔ **no query in this story filters or sorts on `evidence_refs`** — no `->>'` cast is
introduced anywhere ([[project_story_validate_footguns]]: JSONB `->>'` yields TEXT and silently
mis-compares against integers)

### AC5 — WS-B: ONE hand-authored migration `0099`, and the rename is bundled

**Given** premise #6 and `epics.md:3841-3844`
**Then** **one** migration `packages/domain/migrations/0099_moderation-record-model.sql`:
1. **RENAMES** `member_moderation_actions.rationale_ciphertext` → `decision_note_ciphertext`
   (`ALTER TABLE … RENAME COLUMN`). ⚠ Privileges follow the attribute, so `0092`'s column-level
   `GRANT UPDATE` and its RLS UPDATE policy survive the rename **untouched** — state this in the
   migration header so a reader does not "helpfully" re-grant it (premise #4)
2. **ADDS** `escalation_inadequacy_ciphertext` and `escalation_proportionality_ciphertext` — **TWO
   columns, not one JSON blob**: the two-part test is enforced by the *shape of the record*, and one
   column would let a UI concatenate the parts and satisfy the check with a single paragraph
3. **ADDS** `evidence_refs` JSONB (default `'[]'::jsonb`, NOT NULL) with its array + cap CHECKs
   **inline** and its per-entry shape CHECK **through the `IMMUTABLE` helper function declared
   earlier in the same migration** — ⛔ an inline `jsonb_array_elements` or subquery is a migrate-time
   `ERROR`, not a style preference (AC4 carries both verbatim). ⚠ **These are added VALID, and the
   contrast with item 4 is the lesson**: every
   pre-existing row acquires the `'[]'` default, which satisfies all three checks, so the validating
   scan passes. ⛔ Do **not** blanket-apply `NOT VALID` to item 3 because item 4 needs it — a
   constraint added `NOT VALID` without cause leaves a permanent un-validated gap for nothing
4. **ADDS** the escalation-presence CHECK — ⭐ **`NOT VALID`, and the qualifier is load-bearing**:
   `(action = 'terminate') = (escalation_inadequacy_ciphertext IS NOT NULL AND escalation_proportionality_ciphertext IS NOT NULL)`
   — the **structural half** of WS-C, in the `member_moderation_actions_rejoin_iff_terminate` shape
   (`0091:61`): a termination without both parts, or a suspend/restore carrying one, is impossible on
   **every** write path including a raw SQL one.
   ⛔ **Why `NOT VALID` and not a bare `ADD CONSTRAINT`.** `0091:61`'s identically-shaped CHECK was
   created **inside `CREATE TABLE`, on an empty table**. This one is an `ALTER TABLE` against a
   **populated** one — 10.10 and 10.19 have been writing `action = 'terminate'` rows since they
   shipped, and every one carries `NULL` in both new columns, so a bare `ADD CONSTRAINT` scans the
   existing rows and dies **`23514` at migrate time**.
   ⛔ **A sentinel backfill is NOT available and must not be attempted.** `encSentinel` is a
   per-Pariwar Tier-1 envelope encrypt (`anonymize.ts:183-185`); a `.sql` migration cannot make a KMS
   round-trip, and writing a plaintext literal into a ciphertext column would poison `decryptSafe`
   for those rows forever.
   ⇒ `NOT VALID` skips the scan of pre-existing rows while enforcing **every INSERT and UPDATE from
   that moment on** — and because this table is append-only, that is **full forward enforcement**,
   not a weakened constraint.
   ⚠ **This is the repo's FIRST `NOT VALID`** — `grep -l "NOT VALID" packages/domain/migrations/`
   returns nothing at `4c7fdee`. It is a deliberate precedent: state in the migration header why the
   ordinary `ADD CONSTRAINT` shape does not apply to a table that was already accumulating rows.
   The un-validated legacy rows are recorded as an **owed obligation** (AC13.5), never left silent
5. **CREATES** `member_moderation_grounds` (WS-E) — append-only, tenant-isolated, RLS FORCE'd, with
   `GRANT SELECT, INSERT` for `twt_app` and **no `twt_service` grant** (the pre-scope signup rejoin
   guard reads `action`/`rejoin_permitted_at` only and has no business here — state it)
6. **GRANTS** `UPDATE` on **each new Tier-1 column by name** (`escalation_*`, and the grounds `note`)
   plus the matching tenant-scoped RLS UPDATE policy on the new table — **premise #4's trap, closed
   at the point it opens**
7. ✅ **RULED — ADDS THE THREE RULING-DEPENDENT COLUMNS.** Both conditional columns were ruled INTO
   existence, and the ruling's Q4.1 addition creates a third. Decision `2026-08-12-099`:
   - **Q5 (a) ruled ⇒** `r7a_restorations_used_snapshot integer NULL` on `member_moderation_actions` —
     AC7's as-of-decision fact snapshot. ⛔ **NULLABLE, and `NULL` is a first-class value meaning
     *unknown*, never `0`** (AC7). *(The Q5 (b) branch, under which this column was not created, was
     rejected.)*
   - **Q4.4 registry ruled ⇒** `dwell_policy_version text NULL` on `member_moderation_actions` —
     AC8's version pin, in the `resolveRestorationDisciplinePolicy` shape. *(The code-constant branch,
     under which this column was not created, was rejected — so **AC13.6 is DISCHARGED**, not carried:
     neither column was left uncreated.)*
   - ⭐ **Q4.1 ruled ⇒ a THIRD column the pre-ruling story did not have:** the
     **immediate-termination exception reason**. The Panel preserved an immediate path conditioned on
     *"the authorised actor records the reason/justification for using that exception"* — a recorded
     reason with no column is not recorded. ⛔ **It is Tier-1 free text** (it describes the case), so
     unlike the other two it **DOES** take a `GRANT UPDATE` by name (item 6) and **IS** scrubbed
     (AC11). ⛔ It is a **separate field from both escalation parts**: the two-part test answers *why
     termination*, this answers *why now*. ⛔ It is `NULL` on the ordinary path and non-`NULL` exactly
     when the exception was invoked — which makes "how often is the exception used?" answerable, and
     that is the point of recording it.
   ⚠ **The first two columns are not Tier-1.** A bounded integer and a version string are non-PII ⇒
   **neither takes a `GRANT UPDATE`** (item 6) and **neither is scrubbed** (AC11). State that reasoning
   where they are declared, because the default posture on this table is the opposite and a reviewer
   will read the omission as premise #4's trap recurring. ⛔ **The exception-reason column is the
   opposite case and must not be swept into the same sentence.**
   ⛔ **Item 7 is why WS-B cannot be split AHEAD of WS-C/WS-D.** The epic permits splitting along the
   workstream lines, and WS-B is *"the only one that touches the schema"* — so WS-C's and WS-D's
   columns must ride WS-B's migration, and WS-B must therefore land **after** the Q4/Q5 rulings that
   determine them. A split that ships WS-B first strands item 7 and forces the second migration this
   AC forbids

**And** the migration is authored **after the Task-2 ruling** — items 1–6 are fixed, **item 7 is
determined by it**, and there is **still exactly ONE migration**: a follow-up migration to add a
column the ruling implied is a second migration this AC forbids
**And** the file is **hand-authored**, carries **only this story's DDL**, and `_journal.json` gains
`{ "idx": 99, "version": "7", "tag": "0099_moderation-record-model", "when": 1789270800000,
"breakpoints": true }`
**And** ⛔ **`0091`/`0092` are NOT regenerated and NOT edited.** They are applied and journalled;
drizzle skips by journal `when`, and a regen raises `42P07`
**And** the drizzle schema module, the `policies/` declarations (`policies/index.ts` barrel included)
and the migration agree — `pnpm db:check` is green, and the RLS policy-regression spec is extended to
the new table in the `member-moderation-actions-policy-regression.spec.ts` shape

### AC6 — WS-C: the escalation justification is mandatory, two-part, and neither part is derivable from the other

**Given** principles 3 and 5, and `epics.md:3846-3851`
**When** `action === 'terminate'`
**Then** **both** parts are required and each is separately answerable:
- **(a) Why suspension is inadequate** — what suspension would fail to protect, what risk would persist
  through it, or why the restoration path it preserves is unavailable or futile
- **(b) Why termination is proportionate** — why the chosen sanction fits the conduct

**And** part (a) is **NOT satisfied** by (i) asserting the seriousness of the conduct, (ii) citing the
reason code, or (iii) restating (b). Per premise #5 the anti-restatement guard runs **on plaintext, in
the route, before encryption** — the `assertRationalePresent` placement (`handlers.ts:197-208`), so a
doomed request never spends a KMS round-trip. A normalized-equality match between (a) and (b) is a
typed **422**, never a silent accept
**And** a minimum-substance floor applies to each part independently (a length floor is a floor, not a
quality test — say so where it lives; it exists to reject `"n/a"`, not to judge reasoning)
**And** ⛔ **neither field may be pre-filled from the other** in the admin surface: two separate
controls, no copy-across affordance, no shared state — pinned by a **render** test, not only a
view-model test (the `epics.md:3729` finding: *"AC9's prose reached nobody because tests asserted the
view-model and never the render"*)
**And** both parts are **Tier-1 encrypted** under `MEMBER_MODERATION_FIELD_CLASS`, via the existing
`moderation-crypto.ts` helpers — the **domain never encrypts** (`write.ts:9-15`)
**And** the domain writer takes them as **already-serialized ciphertext**, with a non-empty backstop
mirroring `write.ts:136-139`

### AC7 — WS-C: terminating over an available restoration path requires a recorded justification

**Given** principle 4 and `epics.md:3852`, under **Q5 ruled (a)** (Decision `2026-08-12-099`)
**When** the ground is one with a Niyamavali-defined restoration path
**Then** a justification addressing that path is recorded — part (a)'s third alternative (*"why the
restoration path it preserves is unavailable or futile"*) is the field it lands in, not a fourth column
**And** ⛔ **restoration exhaustion is NEVER a hard technical gate.** The Panel ruled that an
unresolved projection must not refuse an otherwise-authorised Trustee decision. The fact is
**evaluated**, **snapshotted** and **justified against** — it never blocks
**And** the record carries a **snapshot of
`contribution.r7a_restorations_used` as of the decision instant**, so a later reviewer can test the
assertion against the data that existed *then* rather than re-deriving it against a moved projection —
the `actor_display` snapshot rationale (`schema/member_moderation_actions.ts:92-95`), applied to a fact
**And** ⛔ **the snapshot is `produceContributionFacts(...).r7aRestorationsUsed`
(`packages/validity-service/src/producer.ts:687-693`) — the DERIVED fact, never the raw input.**
`produceContributionFacts` is the per-member entry point: it calls
`readContributionFactInputs` (`packages/domain/src/contribution/facts.ts:633` — **not** the `:867`
Pariwar scan) and hands the result to `deriveContributionFacts`. ⚠ **Snapshotting the input directly
is the defect this AC forbids, wearing a different hat**: `inputs.completedRestorationEpisodes` is
always a number, while the *fact* is `null` whenever `consecutiveRequired` did not resolve —
`r7aRestorationsUsed: consecutiveRequired === null ? null : input.completedRestorationEpisodes`
(`producer.ts:550`). Reading the input would therefore record a confident count on exactly the
Pariwars where the threshold was never provisioned, which is the false-all-clear the next paragraph
bans. **Only the producer knows the difference between `0` and *unknown*.**
⛔ Never re-derive the count in `apps/api` ([[project_engine_never_infers_contribution_facts]])
**And** a **null snapshot is a first-class value, never zero**: R7(A) resolves to no clause version on
an unprovisioned Pariwar and the fact is then **omitted** (`producer.ts:586-587`;
`contribution-facts.test.ts:447-453`). ⛔ Recording `0` where the answer is *unknown* would let
"restorations exhausted" read as "never restored" — the false-all-clear class D1-B forbids
**And** ⛔ **Q5 option (b) — the hard server-side block — was PUT and REJECTED.** It is not implemented
in the caller, not behind a flag, and not "for later". D6's cost was ruled decisive.

**And** ⭐ **RESTORATION IS PROSPECTIVE, NOT RETROACTIVE** (Decision `2026-08-12-099`, the Panel's
volunteered clarification). Two distinct cases, **never merged**: *suspension restoration*
(`active → suspended → restored`, the ordinary lifecycle) and *termination restoration*
(`terminated → restored`, requiring the Story 10.19 Panel authority — Decision `2026-08-10-097`
clause 1). The three restoration grounds are **reasons for a decision, not permissions**.
Restoration restores membership **from the restoration point forward** and does **not** erase the
terminated period ⇒ **no retroactive contribution credit**, missed obligations are **not** treated as
fulfilled, R7 continues to determine resulting standing, and renewal / lapse / rejoin rules evaluate on
the member's **actual state and dates**. If the elapsed time means the member has lapsed, **the
ordinary lapse rules apply.**
**And** ⛔ **no special "restored terminated member" state is created**, in this story or by inference
from it — a state that bypasses R7 or any ordinary membership rule is expressly forbidden. Restoration
is **not amnesty**. ✅ Verified consistent with the code as shipped: the signup guard maps the *latest*
action so a `restore` clears the block by making the identity not-currently-terminated
(`apps/api/src/modules/auth/member/member-auth.repo.ts:72-76`), and no such state exists to remove.
Recorded as **verified-consistent, not as fixed** — nothing was changed to make it so.
**And** ⚠ **the REJOIN half of this model diverges from shipped behaviour and is NOT reconciled here**
— see AC13.8 and the routing note's D-1. `[[feedback_supersede_never_reinterpret]]`

### AC8 — WS-D: a 7-day dwell on the ORDINARY path, in the CALLER, with an express immediate-termination exception

> ⭐ **RESHAPED BY THE RULING — read this before the clauses below.** The story originally specified
> dwell as an **absolute** precondition on `terminate`. **The Panel did not accept that framing**
> (Q4.1), and was right not to: **principle 5 as adopted says termination *normally* follows
> suspension and principle 6 says notice and opportunity *normally* precede it** — both carry an
> express exception. An absolute gate would have **contradicted the very principles it was built to
> mechanize**. The dwell governs the **ordinary** path only.

**Ruled parameters** (Decision `2026-08-12-099`): **7 days** · sourced from the **versioned registry**,
never a code constant · elapsed dwell **satisfies** v1 opportunity-to-respond · the Terminate control
stays **enabled**, gated by re-confirmation.

**Given** principles 5–7 and `epics.md:3854-3857`
**Then** the precondition is added in **`nextModerationStatus`'s caller** — `moderateMember`
(`packages/domain/src/member/moderation/write.ts:129-209`), or the route's legality path, per D5 —
and ⛔ **`nextModerationStatus` itself is not touched**: it stays the pure, total, four-arm
`(status, action) => status | null` reducer, and its `suspended --terminate--> terminated` arm
**remains legal**. What changes is *when* it may be asked for, not *whether* it exists
**And** the story records what it corrects, verbatim from `epics.md:3857`: *"`nextModerationStatus('suspended','terminate')`
returns `'terminated'` unconditionally, so two API calls seconds apart terminate a member — and because
the suspension notice is a best-effort post-commit job, termination can precede its own notice"*
**And** the dwell is measured from the **producing suspension's `acted_at`** on the latest
`member_moderation_actions` row, read **inside the same scope transaction** as the write — checked
outside, it is a TOCTOU, exactly as the Story 10.19 Panel precondition documents
(`apps/api/src/modules/member-moderation/handlers.ts:214-258`)
**And** ⭐ **`acted_at` — the APP clock — is the pinned base, and the alternative is named so it is
not picked by accident.** `getCurrentMemberModerationOverlay` is already read in-tx and already
returns `since`, the producing event's `occurred_at` — which is the **DB** clock. It is the closer
value to hand and it is the **wrong** one here: the dwell comparison's *now* is `deps.clock()`, the
injected app clock, so measuring against `since` compares two different clocks and the elapsed
interval silently carries their skew. Both sides of the comparison come from the same clock, or the
gate is un-testable ([[project_known_livedb_test_failures]] #12 — the date-bomb class: a spec that
pins one side and lets the other default is a failure that arrives on a DATE, and a baseline
comparison can never see it). ⇒ compare `input.now` against `acted_at`, and the spec pins **both**
**And** ⚠ `read.ts:190-197` records that `acted_at` **can tie** (it is injected, not `DEFAULT now()`),
which is why the moderated-members list breaks ties on `created_at`. That does not transfer here: the
row this precondition reads is the one the legality check has *already* established as the current
suspension, so it is identified by status, not by an ordering — ⛔ do not import the tie-break and do
not re-derive "latest" independently of the overlay the write path already trusts
**And** ⭐ **the duration is SEVEN DAYS, resolved from the REGISTRY as a version-pinned policy clause**
(Q4.4 ruled) in the `resolveRestorationDisciplinePolicy` shape
(`packages/domain/src/member/restoration-discipline/policy.ts:96-108`), with the **version pinned onto
the record** (`dwell_policy_version`, AC5 item 7) and an **unprovisioned registry surfacing a named
sentinel, never a code default** (Decision `2026-08-07-088` clause 2: an unratified sanction imposed by
a machine is explicitly rejected — here the safe direction is **do not permit the ORDINARY
termination**, and the error must say why). ⛔ **`7` is never hard-coded in the moderation service.**
The Trust runs versioned per-Pariwar rules (FR-7); a decision must stay readable against the dwell
policy that governed it
**And** ⭐ **THE IMMEDIATE-TERMINATION EXCEPTION IS PRESERVED** (Q4.1 ruled). Immediate termination
remains available where the governing rules permit the exception **and the authorised actor records
the reason for invoking it**. ⛔ **Do not eliminate immediate termination merely because a 7-day dwell
exists.** The recorded exception reason is a **first-class field on the record**, not a re-use of
either escalation part — the two-part test answers *why termination*, the exception reason answers
*why now*, and collapsing them makes both unfalsifiable
**And** ⛔ **invoking the exception does NOT forfeit the member's future right of appeal.** The appeal
mechanism is Story 10.22's and is **not narrowed** by anything in this AC
**And** ⭐ **elapsed dwell SATISFIES v1 opportunity-to-respond** (Q4.3 ruled). ⛔ **No response or
waiver record is required, and none may be invented as a precondition** — a response has nowhere to
arrive until §8.8 exists. Inventing one would block ordinary termination on a surface this story does
not build. The richer response/appeal capability is **10.22's**
**And** the violation is a typed **409** with its own code, distinct from
`MODERATION_INVALID_STATE_CODE` — "too soon" and "illegal transition" are different facts and a
trustee must be able to tell them apart. ⚠ Under the ruling this 409 means **"the ordinary path is not
yet open and the immediate-termination exception was not validly invoked"** — it is not a blanket
refusal to terminate during dwell
**And** ⭐ **the console must not offer a button the server will refuse.** D5 rejects dwell-in-the-reducer
because it would fork `legal_actions` and make *"the console's buttons disagree with the server"* —
but leaving dwell **only** in the caller produces that same disagreement from the other side:
`legalActions` derives purely from `isLegalModerationTransition(overlay.status, a)`
(`handlers.ts:380-382`), so `terminate` stays in the list for the whole dwell window and the console
renders an enabled control that 409s. ⇒ the status / history response carries a **separate, additive**
`termination_available_at` **alongside** `legal_actions`
**And** ⛔ **`legal_actions` itself is NOT filtered.** Legality and precondition are different facts;
collapsing them into one list is exactly the fork D5 forbids, and it would make the reducer's output
depend on a clock. ✅ **The Panel ruled this correction explicitly right** (Q4.2): *"legal_actions
should not silently be rewritten merely because the dwell exists."*

**And** ⭐ **THE CONSOLE SHAPE IS RULED — a third one, neither of the two the note offered** (Q4.2).
During the seven-day dwell:
1. the Terminate control **remains visible and enabled** — ⛔ **do NOT disable it until day 7**;
2. selecting it **requires an explicit re-confirmation**;
3. that confirmation must state **that the seven-day dwell is still open** and that the actor is
   **invoking the immediate-termination route** — not a generic "are you sure";
4. the **server remains authoritative**: server-side validation determines whether immediate
   termination is actually permitted;
5. ⛔ **the UI confirmation does NOT grant authority.** It obtains informed intent. A client that
   treats its own confirmation as the authorisation has reimplemented the gate in the one place the
   Trust does not control.
**And** ⛔ **suspension, restore and the first suspension are unaffected.** A test pins that a
`suspend` immediately following a `restore` is still accepted

### AC9 — WS-E: grounds are append-only; a later finding attaches, it never rewrites

**Given** `epics.md:3859-3862`
**Then** `member_moderation_grounds` is keyed to `moderation_action_id` and carries: `code` ·
`is_primary` · `added_by` (+ `added_by_display` snapshot) · `added_at` · `note` (Tier-1, optional) ·
`evidence_refs` · `supersedes_ground_id` (nullable self-reference) · `pariwar_id` (RLS) ·
**`member_id`**
**And** ⭐ **`member_id` is DENORMALIZED onto this table deliberately, and AC11 is why.** Every scrub
in `anonymize.ts` is `.where(eq(<table>.memberId, memberId))` — the RTBF has a member id and nothing
else. A grounds table reachable only through `moderation_action_id` would make AC11's
*"every `member_moderation_grounds.note` for the member"* **unexpressible in the shape every other
scrub uses**, forcing either a correlated subquery inside an UPDATE or a two-step read-then-write, in
the one code path where a miss means PII survives an erasure request. This is the **same**
denormalization `pariwar_id` already takes on this table for RLS, for the same reason: the row must
be findable by the axis its guard queries on. ⛔ It is NOT a second source of truth — it is written in
the action's own transaction from the action's own `member_id`, both rows are append-only, and a
live-DB test asserts the pair agrees (the D3 argument, applied a second time)
**And** **exactly one primary** is structurally enforced by a **partial unique index** on
`(moderation_action_id) WHERE is_primary`, and the primary row is written **in the same transaction as
the action** — so "at most one" is the DB's job and "at least one" is the writer's, pinned by a test
**And** the primary ground's `code` **equals** `member_moderation_actions.reason_code` — a deliberate
denormalization (D3), guarded the way `listModeratedMembersForPariwar` guards its own
(`read.ts:183-199`): a **live-DB equivalence test** that drives a member through suspend → append a
**supporting** ground → supersede **that supporting** ground → terminate, and asserts the two agree at
every step
**And** codes may be **added, superseded, or corrected by a further append-only record** — ⛔ **never
`UPDATE`d, never `DELETE`d.** The GRANT posture is `SELECT, INSERT` only, with the single column-level
`UPDATE` on `note` existing **solely** for the RTBF scrub (AC11), exactly as `0092` did for the
rationale
**And** ⛔ **supersede applies to SUPPORTING grounds ONLY — the primary ground is immutable BY
CONSTRUCTION, and that is deliberate, not an oversight.** The partial unique index and the
`SELECT, INSERT` grant together make it structurally unmovable: a second `is_primary` row raises
**`23505`**, and clearing the existing row's flag would be an `UPDATE` that no grant permits. ⇒
`epics.md` WS-E's *"added, superseded, or corrected"* is satisfied **for supporting grounds**; for the
primary the answer is that it **never moves at all**
**And** ⭐ **this is what makes D3's denormalization safe, and the story states it rather than leaving
it implicit.** `member_moderation_actions` is append-only too, so `reason_code` cannot move either —
the held-equivalent pair is immutable on **both** sides. That is strictly stronger than the
`read.ts:183-199` argument it is modelled on: that one holds because one writer writes both in one tx;
this one holds because **neither can ever be rewritten**
**And** ⛔ **any request that would produce a SECOND primary is a typed 409** — whether it supersedes
the primary, appends a fresh `is_primary: true` row, or both. Not a silent no-op, and ⛔ **never a
`23505` leaking as a 500**: the partial unique index is the *backstop*, the typed error is the
*interface*. *"The primary ground is fixed at the action"* is a fact a trustee must be able to read
off the error
**And** a **supersede** inserts a new **supporting** row referencing the superseded one; the read folds
them so the console can render the current set **and** the history that produced it. The superseded
row is still returned — an audit trail that hides what was superseded is not an audit trail
**And** the append path emits a registered `member.moderation.ground-appended` event on the **member's
own stream**, via `projectMemberState` (the `write.ts:163-177` shape): lifecycle-**identity**,
`.strict()` payload = **`...auditShape`** + the bounded `code` + the superseded id — ⛔ **NO note, NO
evidence refs, NO actor display, NO free text of any kind** (R1: `events_log.payload` is plaintext
JSONB; `events.ts:15-19`)
**And** ⛔ **the `auditShape` spread is REQUIRED, not optional decoration.** Every `member.*` payload
carries `from_state` / `to_state` / `trigger` / `actor`, `projectMemberState` **parses the payload
against the registered schema before the insert**, and this AC's own `from_state === to_state` test
has nothing to assert without them. ⚠ `overlayShape` (`moderation_from`/`moderation_to`) is
**deliberately NOT spread** — no moderation status moves on an append, and claiming a from/to pair
would be a false statement about the overlay
**And** ⛔ **the new type has THREE registration points, and missing the domain two fails at RUNTIME,
not at compile time.** All three are this story's:
1. `packages/domain/src/member/events.ts:300` — `MEMBER_EVENT_TYPES` (the tuple `MemberEventType` is
   derived from; `projectMemberState`'s `eventType` parameter is typed by it, `project.ts:50`)
2. `packages/domain/src/member/events.ts:324` — `MEMBER_EVENT_PAYLOAD_SCHEMAS`, whose `satisfies`
   makes a type without a schema a compile error **only once step 1 has landed**. `projectMemberState`
   does `MEMBER_EVENT_PAYLOAD_SCHEMAS[input.eventType].parse(input.payload)` (`project.ts:78`) — an
   unregistered type is `undefined.parse(…)`, a **TypeError on the live write path**
3. `packages/events/src/registry.ts` — `EVENT_TYPE_REGISTRY`, in the `member.moderation.*` block's
   voice (`registry.ts:129-152`)

⚠ The `MemberEventType` doc block at `events.ts:313-315` states the union's size as **21** in prose;
this story makes it **22** and the sentence is updated with it — a stale count is a comment that lies
**And** ⛔ **`is_primary` is NOT in the payload, and the omission is reasoned rather than accidental.**
The primary ground is written in the action's own transaction and is already on the timeline via that
action's `member.moderation.suspended` / `.terminated` event `reason_code`; appends are
supporting-only by construction, so `is_primary` here would be a field that is **always `false`**. A
test pins that **no `ground-appended` event is ever emitted for a primary ground**
**And** the reducer stays **TOTAL by construction, and the story says why**: `memberStateMachine`'s
`default: return state;` arm (`packages/domain/src/member/state.ts:123-124`) makes every
`member.moderation.*` type an identity transition — `state.ts:23` says it in terms, *"they need no arm
below, only the `default` one"*, and `moderation/events.ts:11-13` records the same for the existing
three. ⇒ this fourth type needs **NO new reducer arm** and `members.state` provably cannot move.
⛔ Do not add an arm — **do** add the `from_state === to_state` test that pins it, the way the
existing three are pinned
**And** ⚠ **that identity test proves less than it looks like it proves, so it does not stand alone.**
`memberStateMachine` `safeParse`s the payload and returns the state **UNCHANGED** on a malformed one
(`state.ts:91-96`, whose own comment names the case) — this is precisely Story 10.19's debug-log
finding #3, where a seed carrying a malformed payload left every member in the wrong state while
every assertion passed. An identity assertion is therefore satisfied by a **correct** payload and by a
**rejected** one alike. ⇒ pin the payload's acceptance **separately**, by parsing it against the
registered schema directly, so a payload that silently fails validation cannot pass as identity
**And** the append route is gated on the existing `member.moderate` key with a **fourth step-up action
context** (`member_moderation_append_ground`), so an elevation minted for a restore can never be spent
on a finding (the 10.10 three-context precedent, `routes.ts:108-110`)

### AC10 — WS-F: guidance is added; the vocabulary boundary is NOT reopened

**Given** principle 2 and `epics.md:3864-3868`
**Then** ⛔ **`appliesTo` is NOT hard-narrowed** — it stays `['suspend','terminate']`
✅ **Q6 RULED — recommendation accepted in full** (Decision `2026-08-12-099`). The ratified values, and
⛔ **no dev agent may substitute its own**: `'suspend'` for **all seven** moderation grounds
(`r7-contribution-discipline`, `r14-forgery`, `r10a-parallel-org-office`, `concealment-confirmed`,
`helpdesk-escalated-abuse`, `regulator-action`, `voluntary-pending-review`) and `null` for **all three**
restore grounds (`rule-clearance`, `trustee-discretion`, `moderation-error`). The Panel restated the
constraint that makes this guidance and not policy: *"a reason code does not itself terminate a member;
the Trustee Panel decides whether the actual case warrants suspension or termination"* — principle 2.

(`reason-codes.ts:72`). `ReasonCodeMeta` gains **`ordinarilyResultsIn`** (Q6-ratified values), the
registry read (`listReasonCodeMeta` → `ReasonCodesListResponse`) carries it, and the admin dropdown
**surfaces it as guidance** — ⛔ never as a default selection, a pre-selected action, a severity score,
or a recommendation. FR-57's prohibition is a prohibition **on the decision moving**, and a
pre-selected sanction moves it
**And** ⛔ **the field is typed `readonly ordinarilyResultsIn: ModerationAction | null` — REQUIRED,
nullable, and `null` on all three RESTORE grounds.** `ReasonCodeMeta` is the metadata type for
**every** code in the registry, and `ReasonCode` spans **ten**: the seven moderation grounds *and*
`rule-clearance` / `trustee-discretion` / `moderation-error` (`reason-codes.ts:44-49`). Q6 ratifies
guidance for the seven. The two lazy readings both fail:
- **optional (`?:`)** ⇒ `satisfies Record<ReasonCode, ReasonCodeMeta>` no longer bites and a
  moderation ground can ship with **no** guidance, silently — the exact discipline this AC invokes;
- **required and non-nullable** ⇒ the three restore grounds need a value **the Panel never ratified**,
  and a dev agent invents one. *"What does `moderation-error` ordinarily result in?"* has no
  governance answer, and manufacturing one is the registry pre-empting the Panel in miniature —
  principle 2's defect, at one-tenth scale.

⇒ `null` is the **ratified** answer for a restore ground: *this code carries no sanction guidance
because it justifies no sanction*. The Q6 ruling states it, so the value has provenance rather than
being a placeholder
**And** the exhaustiveness discipline then holds as claimed: `satisfies Record<ReasonCode,
ReasonCodeMeta>` makes a code without guidance a **compile error** (`reason-codes.ts:139,172-176`)
**And** the admin dropdown renders guidance **only where it is non-null**, and renders **nothing** —
not "n/a", not an empty chip — where it is `null`
**And** `reason-codes.ts`'s frozen code-level vocabulary **stays exactly as shipped**: creating a
**new** reason code remains a Part 11 amendment → registry version → trustee approval → audit →
publication, **never a runtime mint path**. ⛔ No per-tenant reason-code table, no `moderation_reason_code`
enum values added or removed (the Q3 (b) branch is explicitly out of scope — AC1)
**And** the **operational/governance split** is recorded at the point of use: *appending a ground to an
existing action* is operational (built here); *creating a new code* is a governance act (not built,
ever, at runtime)
**And** the record model is built **moderation-only**, with the grounds table's columns kept
**subject-agnostic** (`code`/`is_primary`/`note`/`evidence_refs` name no member concept), and the
**future extraction point is named in `docs/moderation-record-model.md`** — extracted only when a
second discipline surface actually exists ([[feedback_no_premature_package]])

### AC11 — Every new Tier-1 column is erasable, and a test proves it

**Given** premise #4 — a column-level GRANT does not extend to new columns, and an RTBF is a **soft**
delete so the `ON DELETE cascade` FK never fires
**Then** `packages/domain/src/member/anonymize.ts` scrubs `escalation_inadequacy_ciphertext`,
`escalation_proportionality_ciphertext` and every `member_moderation_grounds.note` for the member,
using the **sentinel** (`encSentinel`), never `NULL` — the columns are NOT NULL where required and the
append-only posture forbids deleting the row (`anonymize.ts:172-176`)
**And** the grounds scrub is `.where(eq(memberModerationGrounds.memberId, memberId))` — **the
identical one-liner shape every other table in this file uses**, which is what AC9's denormalized
`member_id` exists to make possible. ⛔ A scrub that has to reach through `moderation_action_id` is
the signal that the column was dropped from the migration
**And** the rename is followed through: the existing scrub at `anonymize.ts:183-185` targets
`decisionNoteCiphertext` after the rename, with **no behaviour change**
**And** the bounded governance facts are **retained** — `action`, `reason_code`, ground `code`,
`is_primary`, `added_at`, `rejoin_permitted_at`: FR-6's rejoin lock and the audit trail depend on the
rows existing
**And** `evidence_refs` are **retained**, because they are bounded references to other records, not
free text — ⚠ **state this decision explicitly**; a reviewer will ask, and "they are identifiers" is
the answer only because AC4 makes it structurally true
**And** the live-DB `rtbf-anonymize.test.ts` is extended to assert **every** new column, by name. ⛔ A
test that asserts "the rationale is scrubbed" and stops is what let `0092`'s gap ship the first time

### AC12 — The record surfaces where the decision is made and where it is reviewed

**Given** the `[PRIMITIVE]` + one-slice-one-surface named exception (`epics.md:563`) — a primitive
whose only viable population mechanism is administrator-authored data may include the **minimal
authoring surface intrinsic to its existence**
**Then** `apps/admin/.../member-status/ModerationStrip.tsx` gains, on `terminate` **only**: the two
escalation controls (AC6), the supporting-ground picker, and the evidence-reference rows —
⛔ **not** a free-text evidence box
**And** ⭐ **the terminate control follows the RULED console shape (Q4.2), which is neither of the two
this clause previously offered.** While the 7-day dwell is unelapsed the control **stays visible and
enabled** — ⛔ **it is NOT disabled until day 7** — and selecting it opens an **explicit
re-confirmation** that states (i) the seven-day dwell is still open and (ii) the actor is invoking the
**immediate-termination route**, requiring the exception reason (AC5 item 7) before it will submit.
⛔ **The confirmation obtains informed intent; it does not grant authority** — the server decides
whether the immediate route is permitted, and a client that treats its own dialog as the authorisation
has moved the gate somewhere the Trust does not control. The `termination_available_at` instant is
rendered in that dialog, which is where it is actually decision-relevant
**And** the Decision Note label, placeholder and helper copy are renamed from *rationale* throughout
the admin surface and its i18n modules — the field is now the **Decision Note**, and a UI that still
says "rationale" describes a field that no longer exists
**And** `MODERATION_RATIONALE_MAX_CHARS` (`packages/contracts/src/member-moderation/dto.ts:37`) is
renamed alongside it and stays the **single exported source** the textarea's `maxLength` reads — the
duplication-by-value defect its own doc block records was already fixed once
**And** the history read renders each action's grounds (primary, supporting, superseded) and its
evidence references; the **Decision Note and both escalation parts stay decrypt-on-demand**, per-action,
never in a list DTO (`dto.ts:9-16`) — ⛔ **three new Tier-1 fields must not become three new list
columns**
**And** the OpenAPI spec regenerates deterministically (`pnpm contracts:check-openapi-determinism`)
**And** domain-camelCase ↔ contracts-snake_case is walked at the boundary for **every** new field
(`decision_note`, `escalation_inadequacy`, `escalation_proportionality`, `evidence_refs`,
`is_primary`, `ordinarily_results_in`, `supersedes_ground_id`, `termination_available_at`, and **all
three** ruled columns per AC5 item 7 — `r7a_restorations_used_snapshot`, `dwell_policy_version` and the
immediate-termination **exception reason**) — [[feedback_story_validate_footguns]]

### AC13 — What this story does and does NOT close is recorded

**Given** [[feedback_record_unattested_no_backfill]]
**Then** `docs/moderation-record-model.md` is created (premise #11) carrying: the three-part record
model, the operational-vs-governance vocabulary split, the two-part escalation test, and the named
**future extraction point** — the tracked companion to the untracked Niyamavali text
**And** `deferred-work.md` records, without softening:
1. **§8.8 stays UNLANDED** — the moderation appeal, owned by **10.22**. §8.6's unnumbered *Recorded gap* clause states the
   gap; it does not close it
2. ✅ **DISCHARGED — Q3 ruled (a).** Both codes are authorised in §8.2; no retirement story and no enum
   migration is owed. Recorded as discharged-by-ruling so a later reader does not carry it forward
3. **The *opportunity to respond* half of §8.4a** — Q4.3 ruled that **elapsed dwell satisfies v1**, so
   this is mechanized **as dwell only**. The richer response/waiver workflow is **10.22's**, named.
   ⛔ Record it as *deliberately scoped to dwell by ruling*, never as *"partially done"*
4. **The generic discipline-record primitive is NOT extracted** — one consumer exists. Re-trigger: a
   second discipline surface (trustee removal, volunteer discipline, vendor blacklisting)
5. **`0099`'s escalation CHECK ships `NOT VALID`** — every `member_moderation_actions` row written
   before this migration is **grandfathered unvalidated**. Forward enforcement is complete (the table
   is append-only), but **`VALIDATE CONSTRAINT` is OWED** and is dischargeable only once those legacy
   `terminate` rows are dispositioned by a governance act — which is not this story's. ⛔ Record the
   row count **observed at migrate time**; ⛔ never backfill a justification nobody wrote
   ([[feedback_record_unattested_no_backfill]])
6. ✅ **DISCHARGED — both columns were ruled INTO existence** (Q4.4 registry, Q5 (a)), so neither
   consequence below materialised. Retained struck-through as the record of what was at stake:
   ~~if Q4 ruled the code-constant
   branch, the dwell duration is **unversioned on the record** and a later policy change cannot be
   read off a historical decision; if Q5 ruled (b), no fact snapshot exists and the exhaustion
   assertion is **re-derivable only against a moved projection**. Name the consequence, not just the
   absence
7. **The standing Trustee Panel obligation queue**, restated as a **count** rather than as progress:
   it stood at **seven** after Story 10.19 (`deferred-work.md:3870-3875`); this story's counsel review
   of §8.5/§8.6/§8.9 makes it **eight**, and item 8 below makes it **nine**. No ruling here discharged
   a queue item. ⛔ State the number this story leaves, verified at the time of writing — never
   asserted from this file

8. ⭐ **NEW — GOVERNANCE DRIFT on the rejoin model, SURFACED AND NOT CLOSED.** ✅ **ALREADY WRITTEN to
   `deferred-work.md` (2026-08-12), ahead of implementation, as its own `governance(10.20):` commit** —
   ⛔ **Task 11 VERIFIES this section, it does not re-author it.** Duplicating it would create two
   records that can drift apart, which is the defect this entry is about. Decision
   `2026-08-12-099` (Q7.2) ruled that an **uncleared** termination confers **no ordinary rejoin
   eligibility**; and that on authorised restoration/clearance, membership is restored
   **prospectively** and the ordinary membership / R7 / lapse / **rejoin** rules are then **evaluated
   from the member's actual state and dates**.
   ⛔ **The model is NOT "12 months after restoration."** It is *restoration first, then evaluate the
   ordinary rules against actual dates and state*. ⛔ **Do not create a new restoration-relative
   12-month clock** — none is ratified, and none may be introduced unless a future governance
   amendment says so **expressly**. Restoration supplies neither a new start instant nor a new
   duration.
   **Four texts and one shipped code path still state the older, flat model**,
   and this story edits **none** of them:
   - `niyamavali.md:64` / hi `:68` — **§2.5**, base instrument, no numbered ratification;
   - `niyamavali.md:182` / hi `:180` — **§8.4**, ⛔ **RATIFIED** by Decision `2026-08-10-097`
     (reproduced verbatim at `.decision-log.md:170` / `:181`);
   - `niyamavali.md:207` / hi `:205` — **§8.4a** *Rejoin* row, ⛔ **RATIFIED** by the same decision
     (`.decision-log.md:214` / `:244`);
   - `prd.md:858` — FR-56's rejoin consequence;
   - ⭐ **the live guard**: `signup.handlers.ts:118-123` blocks only while
     `moderationStatus === 'terminated' && now < rejoin_permitted_at`, where `rejoin_permitted_at` is
     `addTwelveMonths(now)` fixed at termination (`handlers.ts:269`) ⇒ **at month 13 an uncleared
     termination passes the guard.** Time alone currently cures it.

   ⛔ **Reconciling these is a Part 11 amendment against RATIFIED text** — its own routing note, its
   own ruling, its own **superseding** decision ([[feedback_supersede_never_reinterpret]]). ⛔ **The
   guard is NOT changed here**: doing so would make the code enforce a rejoin model no instrument
   states, which is the inversion D1 exists to prevent. Until the amendment lands, **§2.5 governs as
   written**. Full analysis in the routing note's *Governance Drift* section (D-1, D-2).
   ⚠ ⛔ **`prd.md:300` (FR-6, voluntary withdrawal) is NOT in scope of that amendment** — it is a
   second, independent lock arising from a voluntary act. Do not conflate the two.

9. ⭐ **NEW — the prospective-restoration model is recorded, and it closes nothing by itself.**
   Restoration restores membership **forward only**; the terminated period is not erased; no
   retroactive contribution credit; ordinary R7 / renewal / lapse rules then govern; ⛔ no special
   "restored terminated member" state exists or may be created. ✅ **Verified consistent with the code
   as shipped** (AC7) — recorded as *verified-consistent*, **not** as *fixed*, because nothing was
   changed to make it so ([[feedback_closure_language_precision]]).

**And** ⛔ **no `termination_access_block` flag change**, no Story 10.21 claim, no assertion that Part 8
is settled

---

## Load-Bearing Decisions

### D1 — ⭐ The governance half is not a preamble; it is half the story.
WS-C/WS-D mechanize principles 3, 5, 6 and 7. Those principles exist today only in a **decision brief**
and a **sprint change proposal** — neither is a governing instrument. Shipping the enforcement first
would mean the system enforces a rule the Niyamavali does not state, which is the inverse of the defect
this whole arc exists to close. Route → rule → author → record → implement, as 10.18 and 10.19 both did.

### D2 — Two columns for the escalation justification, never one.
`epics.md:3851` requires the two parts be "separately answerable" and neither "pre-filled from the
other". One column (or one JSON blob) satisfies a presence check with a single concatenated paragraph
and makes the anti-restatement guard meaningless. **The record's shape is the enforcement**; the route
guard and the UI guard are the second and third layers, not the first.

### D3 — `member_moderation_actions.reason_code` STAYS, as the primary ground.
It is read by the event payload (`events.ts:44`), the history DTO, the moderated-members list, the
notice worker and the admin console. Moving the primary ground into the grounds table would rewrite six
read paths for zero governance gain, and the FR-6 rejoin guard would then depend on a join. The
denormalization is deliberate, and it is guarded the way this codebase already guards its other
held-equivalent pair — by a live-DB test that drives every arm ([[project_contribution_fact_projection_substrate]]).

### D4 — The rename needs no re-grant; the new columns do.
Premise #4. Postgres column privileges follow the attribute through a rename, so `0092`'s
`GRANT UPDATE ("rationale_ciphertext")` becomes a grant on `decision_note_ciphertext` with no action.
Every **new** PII column starts with **no** UPDATE grant and is therefore un-erasable until `0099`
grants it. The failure is silent: the scrub compiles, runs, and raises a permission error only against
a real database — or worse, is simply never written, which is how `0091` shipped.

### D5 — The precondition goes in the CALLER, and the reducer stays pure.
`epics.md:3856` says it in terms. `nextModerationStatus` is pure, total and exhaustive
(`status.ts:36-55`); it takes no clock, no db and no policy. Putting dwell inside it would make it
async, un-testable in isolation, and would fork the one place four other call sites derive
`legal_actions` from (`handlers.ts:380-382`) — the console's buttons would then disagree with the
server. **A precondition is a caller's concern; legality is the reducer's.**

### D6 — A fact must not be able to refuse a Panel decision (Q5's shape, and why (a) is recommended).
`contribution.r7a_restorations_used` is a **projection**. It can be `null` (unprovisioned registry), it
can lag, and it is *omitted* rather than zeroed when R7(A) resolves to no clause version. A hard block
below `>= 2` would mean a Pariwar with an unprovisioned registry cannot terminate anyone — an
availability failure wearing a governance costume — and it would contradict principle 2, which assigns
the sanction to the Panel. ⭐ Recommend the **snapshot + recorded justification**: it makes the
assertion *checkable* by a reviewer, which is what `epics.md:3852` actually asks for, without making a
projection the decider. **The Panel rules; this story presents the cost.**

### D7 — Subject-agnostic columns, no extraction.
The shape (primary ground · supporting grounds · findings · proportionality · evidence) would serve
trustee removals or vendor blacklisting unchanged. **One consumer exists today.** A generic version
needs a polymorphic subject, and `member_moderation_actions` carries a member FK plus member-scoped
RLS. Keep the grounds columns subject-agnostic, name the extraction point in `docs/`, extract when a
second surface is actually being built ([[feedback_no_premature_package]]).

### D8 — No new `ModerationStatus` label, and no sanction tier.
`apps/api/src/modules/auth/member/termination-block-seam.ts:116` speculates that *"Story 10.20's
sanction tiers"* are the live candidate for a new label. **They are not.** This story adds no status,
no tier and no lifecycle state — it adds *record structure and preconditions*. The `never` arm at
`termination-block-seam.ts:131-133` must stay unbroken, and the speculative comment should be corrected
where it is cheap to do so.

### D9 — `[PRIMITIVE]`, with the named authoring-surface exception.
The primary deliverable is the record model (schema, validation, governance, enforcement). The admin
form changes are admitted under the `epics.md:563` exception — the two-part test is only real if the
form makes the parts separately answerable, so the surface is *intrinsic to the primitive*, not an
independent product surface. It does **not** reclassify the story to `[SURFACE]`.

---

## Tasks / Subtasks

### Task 0 — Orient (AC: all) ✅ DONE 2026-08-12
- [x] Read every file in **Files to read before writing a line**. Re-verify each cited line at
      `4c7fdee` — citation drift is this repo's recurring defect class and a wrong line number is a
      wrong instruction.
- [x] Confirm premise #2 yourself: `nextModerationStatus('none','terminate') === null` — **confirmed
      live** at `status.ts:41-42` (`case 'none': return action === 'suspend' ? 'suspended' : null`).
      The story turns on the instrument being wrong about its own code.
- [x] Confirm `_journal.json` still ends at `idx: 98`. ⚠ **It now ends at `idx: 99` — this story's
      own Task-4 entry** (`0099_moderation-record-model`, `when: 1789270800000`). No foreign
      migration landed in between; the number is unchanged and correct.

### Task 1 — ⭐ FIRST: the routing note (AC: 1) ✅ DONE 2026-08-11
- [x] Author `trustee-panel-routing-note-2026-08-11-story-10-20.md` with Q1–Q7, lettered options, ⭐
      recommendations, verified citations, and the **"Feeds"** column.
- [x] For **Q3** state plainly that option (b) is not implementable by this story, and why.
- [x] For **Q5** present D6's cost analysis, not just the two options.
- [x] Commit **ALONE** on `governance/10-20-moderation-record-model` with a `governance(10.20):` prefix
      (`5ea5213`). ⛔ No `packages/` or `apps/` file was in this commit.

### Task 2 — Obtain the ruling (AC: 1) — ⏳ ruled 2026-08-12, entry pending
- [x] Present the note. **All seven ruled 2026-08-12**; recorded verbatim at the foot of the routing
      note, with the Panel's Q4 sub-numbering mapped to this note's.
- [x] ⭐ **Reconcile the story, the routing note and the decision record against the ruling** — done
      **before** Task 3, at the Panel's direction. Two dimensions added (immediate-termination
      exception; console shape), one question materially redefined (Q7.2), one drift class surfaced.
- [x] Write Decision `2026-08-12-099` in `.decision-log.md` with **per-clause provenance**
      (`[Trustee-ratified]` clauses 1–7 / `[Author-committed]` 8, 9, 11 / `[Author-finding]` 10, 12),
      the fence table, and what the ruling does not mean. ✅ Landed **with Task 3** as one atomic
      governance act, carrying the §8.5/§8.6/§8.9 verbatim both-locale text.
- [x] ⛔ Do not proceed to Task 3 on an assumed answer. *(Not needed — nothing was blocked.)*
- [x] ⛔ **Carry the ruling's own prohibitions into the entry, not just its permissions:** no §8.8
      appeal work; no invented termination grounds beyond §8.5; `7` never hard-coded; immediate
      termination not eliminated; no response-record precondition; no `ordinarilyResultsIn` value
      invented for a restore ground; no special restored-terminated state; **no rejoin-model edit**.

### Task 3 — Author §8.5, §8.6, §8.9 + the §8.2 disposition, both locales, atomically (AC: 2, 3) ✅ DONE 2026-08-12
- [x] Insert into `niyamavali.md`; mirror into `niyamavali.hi.md` at the structurally identical
      position. Hindi authored as a **co-equal** instrument, not a translation artifact.
      ⚠ **DEVIATION, recorded as Decision `2026-08-12-099` clause 9:** §8.5 and §8.6 went **between
      §8.4a and §8.7** as instructed, but **§8.9 went AFTER §8.7**. Taken literally, this task's
      original wording produced §8.6 → §8.9 → §8.7, which is numerically wrong. Part 8 now reads
      **8.1 · 8.2 · 8.3 · 8.4 · 8.4a · 8.5 · 8.6 · 8.7 · [8.8 reserved] · 8.9** in both locales.
      ⛔ §8.7 not renumbered, text unchanged.
- [x] ✅ **Q3(a) also landed: §8.2 AMENDED** to authorise `regulator-action` and
      `voluntary-pending-review`, both locales. ⛔ No enum migration, no vocabulary removal.
- [x] Edit the reserved-numbers note to reserve **§8.8 only**; the §8.7-ordering sentence is kept and
      now names what §8.8 is held for (the moderation appeal, §8.6 *Recorded gap*).
- [x] **AC3**: correct and update §8.4a's mechanization block in both locales — the *"Four of its
      rows"* count sentence is **replaced by per-row dispositions**, because the four dispositions now
      differ in kind. ⛔ **Only the correction landed.** Escalation justification and notice remain
      *not yet mechanized* and flip only when Tasks 5 and 6 are green; portal access is untouched
      (Story 10.21's). The block also gained the standing rule that a row leaves the list **only once
      its enforcing mechanism and test are in place**.
- [x] ⚠ **Ten verbatim reproductions verified programmatically** against both instruments after
      writing (§8.2, §8.4a disclosure, §8.5, §8.6, §8.9 and the reserved-numbers note × 2 locales) —
      byte-for-byte, ignoring blank lines. ⛔ `docs/legal/` is gitignored, so a drifted quote in the
      decision entry would be worse than no quote: the entry **is** the record.
- [x] Reproduce every new section **verbatim, both locales**, in the Decision entry. Committed with
      the ruling as **one atomic governance act**.

⚠ **CARRIED FORWARD OUT OF TASK 3 — the two §8.4a flips are Tasks 5 and 6, not this task.**
`niyamavali.md` / `.hi.md` must be edited **again**, in both locales, when each mechanism is green:
**escalation justification** → *mechanized* at **Task 5**; **notice + opportunity to respond** →
*mechanized to the extent of dwell only* at **Task 6**, with the *opportunity to respond* half left
recorded as unmechanized and owned by **10.22**. ⛔ Neither flip may be made early, and each rides its
own commit with its own evidence. Portal access stays untouched — Story 10.21's.

### Task 4 — WS-B: migration `0099` + schema + policies (AC: 5, 4) ✅ DONE 2026-08-12
- [x] Hand-author `0099_moderation-record-model.sql` with **all seven** items in AC5 — items 1–6 fixed,
      **item 7 determined by the Task-2 ruling** — a header in the `0091`/`0092` voice, the premise-#4
      note about which grants survive the rename and which do not, and the **`NOT VALID` rationale**
      (item 4: populated table, `23514`, no KMS in `.sql`). ⛔ Never `db:generate`. ⛔ One migration
      only — no follow-up for a ruling-implied column.
- [x] Declare the **`IMMUTABLE` evidence-ref validator function** ahead of the table DDL (AC4) — an
      inline `jsonb_array_elements` or subquery in a CHECK is a migrate-time `ERROR`. Verify the two
      rejections and the two acceptances against `twt-test-pg` before moving on.
- [x] Update `schema/member_moderation_actions.ts` (rename + three new columns) and add
      `schema/member_moderation_grounds.ts`; export from `schema/index.ts`.
- [x] Add `policies/member-moderation-grounds-rls.ts` and export from `policies/index.ts`.
- [x] Journal entry; `pnpm db:check` green.

### Task 5 — WS-A + WS-C: the record, the guards, the crypto (AC: 4, 6, 7) ✅ DONE 2026-08-12
- [x] Domain: the evidence-ref schema (bounded `kind`, restricted `ref`, cap), the escalation inputs on
      `ModerateMemberInput`, the ciphertext backstops, the plaintext guards exported for the route.
      Four new typed errors (`escalation_required` / `escalation_not_applicable` /
      `escalation_restatement` / `evidence_ref_invalid`), all four mapped in the middleware.
- [x] Route (`apps/api/.../member-moderation/handlers.ts`): presence + anti-restatement + substance
      floor on **plaintext**, before `encryptModerationRationale`; then encrypt both parts; then
      `openScopeTx`.
- [x] Q5 (a): read the fact snapshot via `produceContributionFacts` (**the derived fact, not
      `completedRestorationEpisodes`** — AC7), and carry `null` through as `null`.
- [x] Contracts: `ModerateMemberRequest` gains the two parts + evidence refs, `.strict()`, snake_case;
      the evidence-ref schema follows the **two-copy + test-only drift guard** pattern.
- [x] ⛔ **The Task-4/Task-5 KNOWN-RED window is CLOSED** — the 3 documented failures are green.
- [x] ⚠ **ORDERING CORRECTION, found by an existing revert-sanity test rather than by inspection.**
      The escalation/evidence backstops were first written ahead of the `assertReasonCodeAppliesTo`
      registry guard, which broke Story 10.10's *"the appliesTo guard fires before any DB access"*
      pin (2 failures). Moved to **after** (1) and still ahead of (2): the vocabulary objection is
      the more fundamental one — a caller offering a restore code for a `terminate` must not be told
      to write an escalation justification for an action that code can never support.

### Task 6 — WS-D: the dwell precondition (AC: 8) ✅ DONE 2026-08-12
- [x] Resolve the duration per Q4 — **registry clause `niy.moderation.dwell`, `dwell_days: 7`**, seeded
      in `niyamavali-v1-clauses.sql` in the `niy.restoration-discipline.policy` voice; the resolved
      `clause_version_id` is **version-pinned onto the record** (`dwell_policy_version`), including
      when the exception route is taken. ⛔ `7` appears in no service code path.
- [x] Read the producing suspension's `acted_at` **inside the scope tx** (`getProducingSuspensionActedAt`,
      on the caller's client — checked outside it is a TOCTOU); throw a distinct typed **409**
      (`member_moderation.dwell_not_elapsed`, ⛔ NOT `invalid_state`); mapped in
      `middleware/error-mapping/index.ts` alongside the existing moderation errors.
- [x] ⭐ **The IMMEDIATE-TERMINATION EXCEPTION is preserved** (Q4.1) — a separate Tier-1 field whose
      PRESENCE selects the route, with its own substance floor. ⛔ Not a re-use of either escalation
      part: they answer *why termination*, it answers *why now*.
- [x] ⭐ **An unprovisioned registry refuses the ORDINARY path with a named 503**, never a code
      default (Decision `2026-08-07-088` clause 2). ⚠ **503, not 409, and the distinction is
      load-bearing**: a 409 tells a trustee to wait, and waiting never provisions a clause. The
      exception route still works on an unprovisioned Pariwar — it is not conditioned on the clause.
- [x] ⛔ `nextModerationStatus` **untouched**; `legal_actions` **unfiltered** (Q4.2), with
      `termination_available_at` added as the separate additive fact. Pinned that a `suspend`
      following a `restore` is unaffected.
- [x] ⭐ **Both sides of the comparison pinned** — the spec drives a mutable injected clock and
      asserts the suspension's `acted_at` equals the pinned instant, so the gate cannot silently
      start measuring from wall-clock time ([[project_known_livedb_test_failures]] #12).

### Task 7 — WS-E: append-only grounds (AC: 9) ✅ DONE 2026-08-12
- [x] `member_moderation_grounds` writer + reader (`grounds.ts`) — the fold RETAINS superseded rows and
      flags them; `superseded` is DERIVED from the ids actually pointed at, never stored, so it cannot
      go stale.
- [x] Registered `member.moderation.ground-appended` at **all three** points; the `21` → `22` prose
      count and **both** count fixtures (`life-events-markers`, `personal-event-assertion`) moved with
      it. `.strict()` payload = `auditShape` + `code` + the superseded id.
      ⛔ NOT added to `MODERATION_EVENT_TYPES` / `MODERATION_ACTION_EVENT_TYPES` — it is action-less.
      ⚠ `overlayShape` deliberately NOT spread: no status moves on an append, and claiming a from/to
      pair would be a false statement about the member's standing.
- [x] New route + the **FOURTH** step-up context (`member_moderation_append_ground`); the
      primary-ground row written in the action's own tx. ⛔ No event for a primary ground — it already
      rides the action's own event; pinned by a test.
- [x] ⭐ **Broke a `write ↔ grounds` module cycle** by moving `assertReasonCodeAppliesTo` to
      `reason-codes.ts`, its natural leaf home — the failure mode that stays green through typecheck,
      lint and the local suite while breaking CONSUMING packages at module-init
      ([[project_type_only_import_cycle_trap]]).
- [x] ⭐ **Revert-sanity from raw SQL**: a second `is_primary` row → `23505`; `twt_app` UPDATE and
      DELETE → `42501` (each probe on its own SAVEPOINT, or the second reports `25P02` and the test
      would be asserting Postgres error-recovery rather than the grant).
- [x] ⭐ **The identity test does NOT stand alone.** `memberStateMachine` `safeParse`s and returns the
      state unchanged on a malformed payload, so an identity assertion is satisfied by a correct
      payload and a REJECTED one alike (Story 10.19 debug finding #3) — the payload's acceptance is
      pinned SEPARATELY by parsing it against the registered schema.

### Task 8 — WS-F: guidance metadata (AC: 10) ✅ DONE 2026-08-12 *(domain/contracts/API; the dropdown rendering rides Task 10)*
- [x] `ordinarilyResultsIn: ModerationAction | null` on `ReasonCodeMeta` — **required and nullable**,
      Q6's `'suspend'` for **all seven** moderation grounds and **`null` for all three** restore
      grounds; through `listReasonCodeMeta` → `ReasonCodesListResponse` unchanged (⛔ the server never
      substitutes a value for a restore ground's `null` — that null IS the ratified answer).
- [x] ⛔ `MODERATION_APPLIES_TO` unchanged, pinned by a test that asserts every moderation ground
      still reads `['suspend','terminate']`. ⛔ No enum values added or removed; the vocabulary is
      pinned at **ten**.
- [x] ⭐ A test pins that **every moderation ground says `'suspend'` even though each may equally
      justify a termination** — the Panel escalates by RECORDING WHY, not by the registry pre-empting
      it. The literal values are asserted rather than derived from `appliesTo`, because they are
      governance data a dev agent may not substitute.

### Task 9 — WS-A: RTBF completeness (AC: 11) ✅ DONE 2026-08-12
- [x] `anonymize.ts`: sentinel-scrubs **all three** new action-level Tier-1 columns (both escalation
      parts **and** the immediate-termination exception reason) plus every ground `note` — the grounds
      scrub keyed on the table's **own** `member_id`, in the same one-liner shape as every sibling
      scrub; the rename followed through with no behaviour change.
- [x] `rtbf-anonymize.test.ts` asserts **each** new column BY NAME, and asserts the non-PII columns
      (`r7a_restorations_used_snapshot`, `dwell_policy_version`, `evidence_refs`) are **RETAINED**.
      The table-count fixture moved 7 → 8.
      ⚠ **The ground note is NULLed, not sentineled** — unlike the action's Decision Note that column
      is NULLABLE, so no NOT NULL constraint forces a placeholder, and writing a sentinel where the
      honest answer is *"there was never a note"* would fabricate a record.

### Task 10 — The surfaces (AC: 12) ✅ DONE 2026-08-12
- [x] `ModerationStrip.tsx` / `ModerationSection.tsx` / `i18n-en.ts`: **two separate escalation
      controls** (distinct ids, independent state, ⛔ no copy-across affordance), **evidence rows**
      (bounded `kind` `<select>` + restricted-charset `<input>` — ⛔ never a free-text box), the
      **ruled console shape** (terminate stays ENABLED during the dwell; the re-confirmation names
      the open dwell and the immediate route, renders `termination_available_at`, requires the
      exception reason, and says the SERVER decides), the **guidance** line (non-null only), and the
      **Decision Note renaming** throughout including `MODERATION_RATIONALE_MAX_CHARS` →
      `MODERATION_DECISION_NOTE_MAX_CHARS`.
- [x] History renders each action's **grounds** (primary · supporting · superseded, the superseded
      ones struck through rather than hidden) and its evidence references; the Decision Note and both
      escalation parts stay **decrypt-on-demand** — ⛔ three new Tier-1 fields did NOT become three
      new list columns (only `has_note` crosses the wire).
- [x] **RENDER tests, not view-model tests** — and they earned their keep: they caught that the
      escalation validation errors were being set into state and rendered **NOWHERE**, so the submit
      silently did nothing. ⭐ A view-model assertion would have PASSED, because the state was
      correct all along — exactly the `epics.md:3729` failure mode.
- [x] The camelCase ↔ snake_case walk at the boundary for **every** new field; OpenAPI regenerated,
      determinism check green.
- [x] ⚠ **NOT BUILT, and named rather than silently dropped:** the *supporting-ground picker* as an
      affordance on the terminate form. AC12 lists it, but the action request carries no supporting
      grounds — appending one is `POST …/:moderationActionId/grounds` (Task 7), which is an operation
      on an EXISTING decision. Wiring a picker into the terminate form would have required either a
      contract field the story does not define or a second request the harness cannot make atomic
      with the action. The API is built and tested; the console affordance for it is not, and that is
      recorded in `docs/moderation-record-model.md` rather than left to be discovered.

### Task 11 — Records + what is not closed (AC: 13, 3) ✅ DONE 2026-08-12
- [x] Created `docs/moderation-record-model.md` — the three-part record model, the
      operational-vs-governance vocabulary split, the two-part escalation test, the dwell and its
      exception, prospective restoration, and the **named future extraction point**.
- [x] `deferred-work.md`: all seven AC13 items **plus two more this story surfaced** (the missing
      supporting-ground picker; what the story did not touch). ⚠ **AC13.8/13.9 were VERIFIED, not
      re-authored** — the rejoin-drift section was committed ahead of implementation and duplicating
      it would create two records that can drift apart, which is the defect that entry is about.
- [x] ⭐ The Panel-obligation count is **VERIFIED BY ENUMERATION**, not asserted: the seven open after
      10.19 are listed by name, plus this story's two ⇒ **NINE**. No ruling discharged an item.
- [x] ⭐ **AC13.5's row count is recorded for exactly what it is.** `pg_constraint.convalidated = f`
      verified live; **260** failing legacy rows observed **in the local `twt-test-pg` dev database**,
      explicitly flagged as **NOT a production figure** (no production DB was queried, and the number
      is inflated by this story's own test runs). ⛔ The production count is recorded as UNOBSERVED
      and must be measured before the obligation is discharged
      ([[feedback_record_unattested_no_backfill]]).
- [x] Flipped §8.4a's two mechanized rows in **both locales**, on green evidence — escalation
      justification → *mechanized*; notice → *mechanized to the extent of the dwell only*. ⛔ Portal
      access untouched (10.21's); ⛔ no count sentence reintroduced.
- [x] ⭐ **The flip rides a NEW decision entry, `2026-08-12-100`, NOT an edit of `2026-08-12-099`.**
      `docs/legal/` is gitignored, so the entry IS the record — and a ratified entry is never edited
      in place ([[feedback_supersede_never_reinterpret]]): 099's reproduction stays correct for the
      state in force when it was taken. Both locales reproduced **verbatim and verified
      byte-for-byte programmatically**. Marked **[Author-committed]**, ⛔ not presented as a new
      Panel ruling — the Panel ratified the RULES; this records that two are now enforced.

### Task 12 — Validate (AC: all) ✅ DONE 2026-08-12
- [x] typecheck + lint green on `@twt/domain`, `@twt/contracts`, `@twt/api`, `@twt/admin`,
      `@twt/events`.
- [x] Live-DB: `member-moderation.spec.ts` (26) · `moderation-escalation.spec.ts` (18) ·
      `moderation-dwell.spec.ts` (10) · `moderation-grounds.spec.ts` (14) ·
      `moderation-auth-effects.spec.ts` (7) · `termination-access-block.spec.ts` (6) ·
      `trustee-lite.spec.ts` (19) · **both** RLS policy-regression specs ·
      `rtbf-anonymize.test.ts` (11).
      ⭐ **`member-moderation-grounds-policy-regression.spec.ts` was MISSING and is now written** —
      AC5 makes it acceptance evidence, not a nice-to-have; 13 tests in the sibling's shape.
- [x] `db:check` · `contracts:check-openapi-determinism` · `domain-invariants:check` ·
      `governance-boundary:check` · `schema:check` — **all five green**.
- [x] **Revert-sanity on every new gate, driven from RAW SQL past every TypeScript layer:**
      evidence array/cap CHECKs + the function-backed **shape** CHECK (prose ref · unknown kind ·
      third key · non-object entry · missing ref · over-length · non-array · over-cap — each a clean
      `23514`, plus the accepting cases); the escalation-presence CHECK **in both directions**; the
      one-primary partial unique index (**`23505`**) **and** its partiality (two supporting grounds
      accepted — without which the assertion would pass on a plain unique index); the grounds
      `UPDATE` **and** `DELETE` privilege denials (**`42501`**); the FK orphan rejection (`23503`);
      the anti-restatement guard; the dwell precondition; and the RTBF scrub asserting every new
      column **by name** plus the retained non-PII ones.
- [x] ⛔ No applied migration regenerated; no `DROP SCHEMA`.
- [x] ⚠ **The 4 `sms-rate-buckets` failures are PROVEN pre-existing**, not asserted: re-run with this
      story's entire working tree **stashed** at `baseline_commit`, still 4/4 red. They fail at
      CONNECTION (*"The server does not support SSL connections"* — `createDb` defaults to SSL and
      that spec passes no override), before any query, and nothing here touches SMS rate limiting.

**Final counts:** `@twt/domain` **2600 passed** (+ the 4 pre-existing) · `@twt/api` **939 passed** ·
`@twt/contracts` **881** · `@twt/admin` **300** · `@twt/events` **20**.

---

## Dev Notes

### Files to read before writing a line

| File | Why |
|---|---|
| `packages/domain/migrations/0091_member-moderation.sql` | The table, the CHECK shape, the grant posture, the header voice |
| `packages/domain/migrations/0092_member-moderation-rtbf.sql` | ⭐ The column-level GRANT trap (premise #4) stated in its own words |
| `packages/domain/src/member/moderation/write.ts:129-209` | The one write path; where the guards and the insert live |
| `packages/domain/src/member/moderation/status.ts:36-55` | The reducer D5 forbids touching |
| `packages/domain/src/member/moderation/reason-codes.ts:56-80,139-176` | `ReasonCodeMeta`, `MODERATION_APPLIES_TO`, the exhaustiveness argument |
| `packages/domain/src/member/anonymize.ts:165-186` | The scrub AC11 extends, and its sentinel-not-NULL reasoning |
| `apps/api/src/modules/member-moderation/handlers.ts:174-321` | Encrypt-before-`openScopeTx`; the 10.19 in-tx precondition AC8 mirrors |
| `packages/domain/src/member/restoration-discipline/policy.ts:42-108` | The version-pinned registry-clause pattern Q4 (a) reuses |
| `packages/validity-service/src/producer.ts:502-570,687-693` | `produceContributionFacts` (AC7's snapshot) and the `consecutiveRequired === null ⇒ null` rule at `:550` |
| `packages/domain/src/contribution/facts.ts:633` | The per-member input reader the producer wraps — **not** the `:867` Pariwar scan, and **not** what AC7 snapshots |
| `docs/legal/niyamavali.md:190-232` (hi `:188-230`) | §8.4a, its mechanization block, and the reserved-numbers note |
| `_bmad-output/implementation-artifacts/10-19-…​.md` | The governance-first shape this story repeats |

### Anti-patterns — the eighteen ways this story goes wrong

1. **Narrowing `appliesTo`** to "satisfy" `prd.md:871`. Forbidden by `epics.md:3866`; pre-empts the
   Panel (premise #7, AC10).
2. **One escalation column, or a JSON blob.** Defeats the two-part test at the record layer (D2).
3. **Shipping new Tier-1 columns without a `GRANT UPDATE`.** Re-creates `0092`'s defect, silently
   (premise #4, D4).
4. **A `CHECK (a <> b)` for the anti-restatement rule.** Structurally impossible under non-deterministic
   envelope encryption (premise #5).
5. **Putting dwell inside `nextModerationStatus`.** Forks `legal_actions`; makes a pure reducer async
   (D5).
6. **Regenerating `0091`/`0092`, or running `db:generate`.** `42P07`
   ([[project_live_db_test_gotchas]]).
7. **Adding a `ModerationStatus` label or a sanction tier.** Not this story; breaks the `never` arm at
   an authentication gate (D8).
8. **Free-text evidence.** `epics.md:3838` says *"references only, never free text"* — a `z.string()`
   with a long max is free text with extra steps (AC4).
9. **Flipping §8.4a rows to "mechanized" before the mechanism is green.** The disclosure would then
   overstate in the other direction (AC3).
10. **Putting the Decision Note or an escalation part into a list DTO, an event payload, an audit line
    or a log.** R1; `dto.ts:9-16`; `events.ts:15-19`.
11. **Testing the two-part separation at the view-model layer only.** The exact finding `epics.md:3729`
    records against Story 10.10 (AC6).
12. **Hard-blocking termination on `r7a_restorations_used`** without the Q5 ruling. A projection cannot
    be allowed to refuse a Panel decision (D6).
13. **Importing `@twt/contracts` from `@twt/domain`** to share the evidence-ref schema. Turbo cycle;
    `errors.ts:41` forbids it by name, and a type-only import fails **silently** at module-init in
    consuming packages ([[project_type_only_import_cycle_trap]]). Two copies + a drift guard.
14. **A bare `ADD CONSTRAINT` for the escalation CHECK.** `23514` at migrate time against a table that
    already holds `terminate` rows — and a sentinel backfill is impossible from `.sql` (no KMS).
    `NOT VALID` (AC5 item 4).
15. **Trying to supersede the PRIMARY ground.** Structurally impossible (`23505` / no UPDATE grant) and
    deliberately so; supersede is a supporting-ground operation (AC9).
16. **Shipping AC7's snapshot or AC8's version pin without a column in `0099`.** Both are ruling-gated
    and both live in AC5 **item 7** — a second migration to add them is forbidden (AC5).
17. **Adding `ground-appended` to `MODERATION_EVENT_TYPES` / `MODERATION_ACTION_EVENT_TYPES`**
    (`status.ts:66-88`) because it is spelled `member.moderation.*`. Those tuples are the
    **action-bearing** three: `MODERATION_ACTION_EVENT_TYPES` is `satisfies Record<ModerationAction,
    string>` and the overlay's `inArray` filter reads from them. An append carries **no action** —
    `moderationActionForEventType` returning `null` and the fold skipping it (`overlay.ts:98-100`) is
    the CORRECT behaviour, not a gap to close (AC9).
18. **Snapshotting `inputs.completedRestorationEpisodes` instead of the derived fact.** Always a
    number; the fact is `null` when the threshold never resolved (`producer.ts:550`). Records a
    confident count precisely where the honest answer is *unknown* (AC7, D6).

### Reuse map — almost nothing here is new

⚠ **Three deliberate exceptions**, all mandatory: the **new table** (WS-E), the **new event type**
(AC9), and the **fourth step-up context** (AC9). Everything else is reuse.

| Need | Existing thing | Do NOT |
|---|---|---|
| Tier-1 encrypt/decrypt | `moderation-crypto.ts` (`encrypt`/`decryptSafe`) | encrypt in the domain |
| Append an event | `projectMemberState` via `write.ts:163-177` | write `events_log` directly |
| Structural presence rule | the `rejoin_iff_terminate` CHECK shape (`0091:61`) | enforce presence only in TS |
| Version-pinned policy | `resolveRestorationDisciplinePolicy` (`policy.ts:96`) | a code constant for a duration |
| Per-member facts | `produceContributionFacts` (`producer.ts:687`) | snapshot the raw input, or re-derive in `apps/api` |
| In-tx precondition | `handlers.ts:214-258` (the 10.19 Panel gate) | check outside the tx (TOCTOU) |
| Attribution snapshot | `getDisplayName` + fail-closed (`handlers.ts:109-115`) | an email-derived fallback |
| Held-equivalent pair | `listModeratedMembersForPariwar`'s argument (`read.ts:183-199`) | assert equivalence without a driving test |
| RLS policy shape | `policies/member-moderation-actions-rls.ts` | a bespoke policy |
| Cross-package schema | two copies + a **test-only** drift guard (`review-reason-codes.ts:15-19`) | ⛔ import `@twt/contracts` from `@twt/domain` |

### Testing standards

- Live-DB integration specs under `apps/api/tests/integration/member-moderation/`, own-committing
  seeds, fresh random mobile per test. **Assert membership, not counts**
  ([[project_live_db_test_gotchas]]).
- The **RLS policy-regression spec** for the new table is acceptance evidence, not a nice-to-have —
  the `member-moderation-actions-policy-regression.spec.ts` shape, including the negative leg.
- **Revert-sanity pairs** for every DB constraint and every guard (Task 12).
- Pure/unit for the evidence-ref schema, the anti-restatement guard, the dwell arithmetic and the
  grounds fold. **Render** tests — not view-model tests — for AC6's separation.
- `t()` **throws** on an unknown key and defaults to the `common` namespace: a copy change without its
  catalog entry fails loudly at runtime.
- ⚠ Pin **both sides** of any in-force / as-of comparison in a spec — a pinned query instant read
  against a clock-defaulted seed is the 2026-08-10 **date-bomb** class
  ([[project_known_livedb_test_failures]] #12), and a baseline comparison can never see it.

### Project structure

- Domain-camelCase ↔ contracts-snake_case at the boundary ([[feedback_story_validate_footguns]]).
- ⛔ **The dependency direction is one-way: `@twt/contracts` depends on `@twt/domain`, NEVER the
  reverse.** `packages/domain/src/errors.ts:41` states it in terms — *"`@twt/domain` must NOT import
  `@twt/contracts` (turbo cycle — contracts depends on domain, never the reverse)"* — and
  `contracts/package.json` carries `"@twt/domain": "workspace:*"`. A domain→contracts import is a
  **turbo cycle**; a **type-only** one is worse, because typecheck, lint and the local suite all stay
  green while consuming packages break at module-init ([[project_type_only_import_cycle_trap]]).
- ⇒ **The evidence-ref schema therefore follows the TWO-COPY pattern, not a shared import.** The
  canonical Zod schema lives in `@twt/domain` (the defence-in-depth enforcement point); a
  **value-aligned copy** lives in `@twt/contracts` (it produces the 400 at the boundary and drives the
  admin control); the two are held in lockstep by a **test-only** drift guard. This is the shape
  already used at `packages/domain/src/reconciliation/review-reason-codes.ts:15-19` (the BankCode /
  verifier precedent) — reuse it verbatim rather than inventing a third arrangement.
- `packages/contracts` must **never** import a pg-touching `@twt/domain` namespace
  ([[project_contracts_domain_bundle_boundary]]) — which is why the **contracts** copy is pure Zod and
  imports nothing from domain, not even a type.
- Governance commits use `governance(10.20):`; implementation uses `story(10.20):`.
- ⚠ `git push` runs the full `ci:local` via the pre-push hook — that is the "hang", not a failure
  ([[project_friction_budget_baseline_ratchet]]).

### References

- `_bmad-output/planning-artifacts/epics.md:3826-3870` — this story's AC; `:3701-3708` the sequencing
  frame; `:563` the authoring-surface exception
- `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:495-731` — D10 in full
  (principles at `:529-586`; the record model at `:588-626`; the vocabulary split at `:645-672`; the
  extraction note at `:628-643`; the implementation shape at `:696-715`)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:518-532` (the §4d Niyamavali
  table, rows 4/6/7/11), `:534-538` (the constitutional sentence), `:559` (the severity gradient)
- `.decision-log.md` — `2026-08-10-096` (the Panel's constitution; concurrency at clause 3),
  `2026-08-10-097`/`-098` (§8.4/§8.4a; §8.5–§8.9 named as 10.20's and 10.22's at `:275`),
  `2026-08-09-095` (per-clause provenance)
- `_bmad-output/implementation-artifacts/deferred-work.md:3710` (10.20 unblocked), `:3865-3869` (what
  10.19 does not close), `:3870-3875` (the obligation queue at seven)
- `docs/legal/niyamavali.md:170-232` — Part 8 as it stands; `:63` §2.5 (the rejoin lock Q7 asks about)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:851-874` — FR-56 as amended; `:880`
  FR-57's detection-only prohibition

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via `bmad-dev-story`, entered at **Task 4** (Tasks 1–3 were the
governance half, completed and committed beforehand as `governance(10.20):`).

### Debug Log References

**✅ THE KNOWN-RED WINDOW BELOW IS CLOSED (Task 5, 2026-08-12).** All 3 documented failures are
green; `@twt/api` now runs **915 passed / 1 skipped, 0 failed** (112 files). The route supplying both
escalation ciphertexts is what closed it — ⛔ the constraint was not relaxed.

**⚠ FOUR PRE-EXISTING FAILURES, PROVEN pre-existing rather than asserted.**
`packages/domain/tests/integration/sms-rate-limit/sms-rate-buckets.spec.ts` fails 4/4 with
*"The server does not support SSL connections"*. `createDb` defaults to `ssl: {rejectUnauthorized:
false}` and this spec passes no override, so it cannot connect to the local Docker Postgres at all —
it fails at CONNECTION, before any query. **Proven by re-running it with this story's entire working
tree stashed: still 4/4 red at `baseline_commit`.** Nothing in Story 10.20 touches SMS rate limiting.
⛔ Recorded as an environment artifact of the local `:5433` container, NOT as a green claim.

**⚠ ORDERING DEFECT I INTRODUCED, caught by an EXISTING test — recorded rather than smoothed over.**
The Task-5 escalation and evidence backstops were first placed ahead of the `assertReasonCodeAppliesTo`
registry guard in `moderateMember`, which broke Story 10.10's *"the appliesTo guard fires before any
DB access (revert-sanity)"* pin — 2 failures in `moderation-reason-codes.test.ts`. The fix is an
ordering one, and the reasoning is worth keeping: the **vocabulary** objection is more fundamental
than the **completeness** one. A caller offering a restore code for a `terminate` must be told the
code cannot justify that action, not told to write an escalation justification for an action the code
can never support. The backstops moved to after (1) and still ahead of (2), so a doomed request still
never reaches the database. ⭐ This is the value of a no-query revert-sanity pin: it caught a
regression that every new Task-5 test would have passed.

**⛔ KNOWN-RED WINDOW between Task 4 and Task 5 — 3 tests, and it is STRUCTURAL, not a defect.**
`apps/api/tests/integration/member-moderation/member-moderation.spec.ts` has 3 failures at the Task 4
boundary:
- *"a pariwar_admin still SUSPENDS and TERMINATES"* → **500** (expected 200)
- *"the full legal walk suspend → terminate → restore"* → **500** (expected 200)
- *"a pariwar_admin CANNOT restore a TERMINATED member"* → **200** (expected 403) — a **cascade**:
  the test needs a terminated member to exist, and the termination above failed, so the member was
  never terminated and the restore legitimately succeeded.

**Cause:** AC5 item 4's `member_moderation_actions_escalation_iff_terminate` CHECK is the STRUCTURAL
half of WS-C and it lands in Task 4, while the writer that satisfies it — the route supplying both
escalation ciphertexts — is **Task 5 (AC6)**. A `terminate` written by the current route carries NULL
in both columns and is correctly rejected.
⛔ **The constraint is not at fault and must not be relaxed to make these green.** The story's own
sequencing puts the record's shape first, deliberately (D2: *"the record's shape is the enforcement;
the route guard and the UI guard are the second and third layers, not the first"*). Closing this
window is Task 5's first job.

**Everything else is green at this boundary:** `@twt/domain` **229 files / 2560 tests**, `@twt/api`
**110 of 111 files / 894 tests**, typecheck clean on domain + contracts + api, `db:check` green.

**Live verification driven while authoring (not asserted from the story):**
1. **Both inline CHECK spellings are hard errors**, re-confirmed on `twt-test-pg` (PG 16.14):
   subquery → *"cannot use subquery in check constraint"*; `jsonb_array_elements` → *"set-returning
   functions are not allowed in check constraints"*. The `IMMUTABLE` helper is forced, not stylistic.
2. ⭐ **FINDING — a non-array raised `22023`, not a check violation.** The first cut spelled the cap
   as `CHECK (jsonb_array_length(evidence_refs) <= 10)`. Inserting a JSON **object** then raised
   *"cannot get array length of a non-array"* — a runtime error, NOT the `23514` a constraint
   violation must produce — and Postgres does **not** guarantee `AND` short-circuits, so the sibling
   `jsonb_typeof = 'array'` CHECK cannot be relied on to run first. ⇒ the cap CHECK is **guarded**
   (`jsonb_typeof(...) <> 'array' OR …`) and the function uses **`CASE`** (which does guarantee
   ordering) rather than an `AND` chain. All **9** rejection cases then returned a clean `23514`:
   prose ref · unknown kind · third key · non-object entry · missing ref · over-cap · object-not-array
   · ref-with-space · ref-too-long; all **3** acceptance cases passed.
3. **The `NOT VALID` rationale is proven, not assumed.** Against a seeded legacy `terminate` row:
   bare `ADD CONSTRAINT` → **`23514` at migrate time** (*"is violated by some row"*); the `NOT VALID`
   form applied cleanly; a **forward** `terminate` missing both parts → `23514`; a **suspend**
   carrying the parts → `23514` (the iff bites both ways). Full forward enforcement holds.
4. ⭐ **Premise #4 proven in BOTH directions** via `information_schema.column_privileges`:
   `decision_note_ciphertext` retains its UPDATE grant **with no re-grant in 0099** (privileges
   follow the attribute through a rename), the three new Tier-1 columns carry theirs **because 0099
   names them**, and the two non-PII columns (`r7a_restorations_used_snapshot`, `dwell_policy_version`)
   correctly carry **none**.

**Two incidental fixes, both mine, both recorded rather than smoothed over:**
- `KMS_TEST_MODE=1` is invalid (it takes `fake`|`live`) and made **77 apps/api files** fail at
  `buildTestDeps` — an operator error on my part, not a code regression.
- The raw-SQL seeds needed `$3::moderation_action` in the VALUES position rather than `$3::text` in
  the CASE arm: referencing the same parameter as both the enum and text raises *"inconsistent types
  deduced for parameter $3"*.

### Completion Notes List

**Task 4 (WS-B) complete.** One hand-authored migration `0099_moderation-record-model.sql` carrying
all seven AC5 items, the AC4 `IMMUTABLE` validator declared ahead of the DDL, the two new schema
modules, the new RLS policy module, both barrel exports, the `ModerationGroundId` brand, and journal
`idx: 99`. ⛔ Never `db:generate`.

⚠ **The rename fanned out to 29 call sites** across 9 files, and the compiler named every one of them
— which is the rename working as intended. ⛔ Only `member_moderation_actions` sites were moved: the
repo has **six other tables** with a `rationale_ciphertext` (claim verifier decisions, R9 votes,
appeal panel votes, appeal decisions, state-trustee decisions, restoration impositions) and all of
them are deliberately untouched, including the verifier INSERT that sits in the *same spec file* as a
moderation INSERT (`trustee-lite.spec.ts`).

**Deviation from AC4's illustrative snippet, taken deliberately:** AC4's example function body folds
array-ness and the cap *into* the function, while AC4's prose requires those to stay **inline and
separate** so a violation names which rule it broke, and says the function must not re-implement them.
The prose governs — the shipped function checks the **per-entry shape only** and returns `true` for a
non-array, leaving that violation to the array CHECK.

### File List

**Added (14)**
- `packages/domain/migrations/0099_moderation-record-model.sql`
- `packages/domain/src/member/moderation/evidence-refs.ts`
- `packages/domain/src/member/moderation/escalation.ts` *(Task 5)*
- `packages/domain/src/schema/member_moderation_grounds.ts`
- `packages/domain/src/policies/member-moderation-grounds-rls.ts`
- `packages/contracts/src/member-moderation/evidence-refs.ts` *(Task 5 — the value-aligned copy)*
- `packages/domain/tests/member/moderation-escalation.test.ts` *(Task 5)*
- `packages/contracts/tests/member-moderation-evidence-refs.test.ts` *(Task 5 — the drift guard)*
- `apps/api/tests/integration/member-moderation/moderation-escalation.spec.ts` *(Task 5)*
- `packages/domain/src/member/moderation/dwell.ts` *(Task 6)*
- `packages/domain/tests/member/moderation-dwell.test.ts` *(Task 6)*
- `apps/api/tests/integration/member-moderation/moderation-dwell.spec.ts` *(Task 6)*
- `packages/domain/src/member/moderation/grounds.ts` *(Task 7)*
- `apps/api/tests/integration/member-moderation/moderation-grounds.spec.ts` *(Task 7)*

**Modified — schema/domain (12)**
- `packages/domain/migrations/meta/_journal.json` (idx 99)
- `packages/domain/src/schema/member_moderation_actions.ts` (rename + 6 columns)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts` (barrels)
- `packages/domain/src/ids/index.ts` (`ModerationGroundId`)
- `packages/domain/src/member/anonymize.ts` (rename, moderation scrub only)
- `packages/domain/src/member/moderation/read.ts`, `.../events.ts` (rename)
- `packages/domain/src/member/moderation/write.ts` (rename; Task 5 inputs + backstops + insert)
- `packages/domain/src/member/moderation/errors.ts` (Task 5 — four new typed errors)
- `packages/domain/src/member/moderation/index.ts` (Task 5 — barrel)
- `packages/domain/src/index.ts` (Task 5 — the four errors surfaced at the top level; Task 6 — two more)
- `packages/domain/src/member/moderation/escalation.ts` (Task 6 — the exception-reason guard)
- `packages/domain/seed/niyamavali-v1-clauses.sql` (Task 6 — the ratified `niy.moderation.dwell` clause)
- `openapi/v1.yaml` (regenerated; determinism check green)
- `docs/moderation-record-model.md` *(Task 11 — NEW, the tracked governance reference)*
- `_bmad-output/implementation-artifacts/deferred-work.md` (Task 11 — the 10.20 section)
- `.decision-log.md` (Task 11 — Decision `2026-08-12-100`)
- `docs/legal/niyamavali.md`, `docs/legal/niyamavali.hi.md` (Task 11 — the §8.4a flips; ⚠ gitignored)
- `apps/admin/src/modules/member-status/ModerationStrip.tsx`, `.../ModerationSection.tsx`,
  `.../i18n-en.ts` (Task 10), `apps/admin/tests/moderation-strip.test.tsx`,
  `apps/admin/tests/moderation-section.test.tsx` (Task 10)
- `packages/domain/src/member/moderation/events.ts` (Task 7 — the ground-appended payload schema)
- `packages/domain/src/member/events.ts` (Task 7 — registration point 1 + the 21→22 prose count)
- `packages/events/src/registry.ts` (Task 7 — registration point 3)
- `packages/domain/src/member/moderation/reason-codes.ts` (Task 7 — the guard moved here; cycle broken)
- `packages/domain/src/member/moderation/read.ts` (Task 7 — `evidenceRefs` on the history entry)
- `packages/domain/src/member/moderation/reason-codes.ts` (Task 8 — `ordinarilyResultsIn`)
- `packages/domain/tests/member/moderation-reason-codes.test.ts` (Task 8 — the guidance pins)
- `packages/domain/src/member/anonymize.ts` (Task 9 — all new Tier-1 columns + the grounds note)
- `apps/api/src/modules/member-moderation/routes.ts` (Task 7 — the grounds route, 4th step-up context)
- `packages/domain/tests/member/life-events-markers.test.ts`,
  `packages/domain/tests/member/personal-event-assertion.test.ts` (Task 7 — the 21→22 count fixtures)
- `packages/domain/tests/member/rtbf-anonymize.test.ts` (Task 9 — every new column by name; 7→8 tables)
- `packages/domain/tests/integration/rls/member-moderation-grounds-policy-regression.spec.ts`
  *(Task 12 — NEW; AC5's acceptance evidence for the new table)*
- `packages/contracts/tests/member-moderation.test.ts` (Task 7 — the history fixture)

**Modified — contracts/api (5)**
- `packages/contracts/src/member-moderation/dto.ts` (comment; Task 5 request fields)
- `packages/contracts/src/member-moderation/index.ts` (Task 5 — barrel)
- `apps/api/src/modules/member-moderation/handlers.ts` (rename; Task 5 guards + crypto + snapshot)
- `apps/api/src/middleware/error-mapping/index.ts` (Task 5 — four new 422 arms)

**Modified — tests (8)**
- `packages/domain/tests/integration/rls/member-moderation-actions-policy-regression.spec.ts`
  (rename + the legal-`terminate` seed now carries both escalation parts)
- `packages/domain/tests/member/moderation-reason-codes.test.ts`, `.../rtbf-anonymize.test.ts`
- `apps/api/tests/integration/member-moderation/member-moderation.spec.ts`,
  `.../moderation-auth-effects.spec.ts`, `.../termination-access-block.spec.ts`
- `apps/api/tests/integration/trustee-lite/trustee-lite.spec.ts` (moderation INSERT only — the
  `claim_verifier_decisions` INSERT in the same file is deliberately untouched)
- `apps/api/tests/integration/member-moderation/member-moderation.spec.ts` (Task 5 — `body()` is now
  action-aware so a `terminate` carries both escalation parts; the 26 tests below keep testing
  legality/RBAC/step-up rather than failing for the wrong reason)

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-12 | ✅ **Task 6 (WS-D) — the dwell precondition, in the CALLER, with the exception preserved.** `epics.md:3857`'s defect (*"two API calls seconds apart terminate a member"*) is closed by a **7-day dwell resolved from the versioned registry**, and there is a test asserting exactly that case. `@twt/api` **925 passed / 0 failed** (113 files), `@twt/domain` green but for the 4 proven-pre-existing SSL failures, lint + typecheck clean on all three, and **`db:check` · `domain-invariants:check` · `governance-boundary:check` · `schema:check` · `contracts:check-openapi-determinism` all green** (the OpenAPI was regenerated — the history response gained `termination_available_at` and the request gained three fields). ⭐ **The dwell governs the ORDINARY path only, and the story's original framing was wrong on its own terms** — principles 5 and 6 as adopted say termination *normally* follows suspension and notice *normally* precedes it, so an absolute gate would have contradicted the principles it exists to mechanize. The **immediate-termination exception** (Q4.1) is a separate Tier-1 field whose **presence selects the route**, with its own substance floor; ⛔ it is not a re-use of either escalation part (they answer *why termination*, it answers *why now*), and a live test proves it still works **during** the dwell. ⭐ **`7` is hard-coded nowhere in the service:** the duration is the seeded `niy.moderation.dwell` clause (`dwell_days: 7`), authored in the `niy.restoration-discipline.policy` voice, and its resolved `clause_version_id` is **pinned onto every termination** — including one taken via the exception, because which policy GOVERNED is part of the record independently of which route was used. ⭐ **An unprovisioned registry refuses the ordinary path with a named 503, and 503-not-409 is the load-bearing choice:** a 409 would send a trustee away to wait for something no amount of waiting produces, and Decision `2026-08-07-088` clause 2 forbids falling back to a code default (a sanction under a convention no Pariwar ratified is an unratified sanction imposed by a machine). The exception route still works there, because it is not conditioned on the clause existing. ⛔ **`nextModerationStatus` untouched and `legal_actions` unfiltered** (Q4.2 — the Panel ruled this correction explicitly right): `termination_available_at` is the separate ADDITIVE fact, surfaced only while still in the future, so the console can say *when* without the reducer's output ever depending on a clock. ⭐ **Both sides of the comparison are pinned** — the spec drives ONE app over a mutable injected clock, writes every instant out explicitly (no `new Date()` in the file), and **asserts the suspension's `acted_at` equals the pinned instant**, so the gate cannot silently start measuring from wall-clock time; each test also authenticates AT the instant it acts, since moving a clock eight days under a live session would expire the step-up and the 403 would masquerade as a dwell failure ([[project_known_livedb_test_failures]] #12). ⚠ **The existing moderation specs now terminate via the exception**, documented in place: they assert legality/RBAC/step-up and suspend-then-terminate seconds apart. ⛔ The alternative — seeding a `dwell_days: 0` clause — was **rejected**, because fabricating governance data to make tests pass would put a duration in the registry no Panel ratified. |
| 2026-08-12 | ✅ **Task 5 (WS-A + WS-C) — the record's three separable parts, the guards, and the crypto.** The two-part escalation justification is now mandatory, two-part and non-restatable on `terminate`; evidence references are structurally incapable of carrying prose at three layers; and AC7's as-of-decision fact snapshot is taken. **The Task-4/Task-5 known-red window is CLOSED** — `@twt/api` **915 passed / 0 failed** (was 894 + 3 red), `@twt/contracts` **880 green**, `@twt/domain` **2570 green**; typecheck and lint clean on all three. ⛔ The `escalation_iff_terminate` constraint was **not** relaxed to close the window — the route now supplies both parts, which is what the sequencing intended. **Four new typed errors**, each with its own code and all four mapped in the middleware (an unmapped domain error is a 500 — the Story 10.8 finding). ⭐ **A DEFECT I INTRODUCED, caught by an EXISTING test rather than by inspection:** the new backstops were first placed ahead of `assertReasonCodeAppliesTo`, breaking Story 10.10's *"the appliesTo guard fires before any DB access"* revert-sanity pin. Moved to after the registry guard and still ahead of the legality read — the **vocabulary** objection is more fundamental than the **completeness** one, since a caller offering a restore code for a termination must not be told to write a justification for an action that code can never support. Every new Task-5 test would have passed with the wrong ordering; the no-query pin is what caught it. ⭐ **Revert-sanity driven from RAW SQL, past every TypeScript layer:** the `escalation_iff_terminate` CHECK bites in **both** directions (a `terminate` missing either part → `23514`; a `suspend` carrying one → `23514`; both parts → accepted), and all six per-entry evidence rejections plus the non-array and over-cap cases each return a clean `23514`. **AC7's `null` is pinned as *unknown*:** the snapshot reads `produceContributionFacts(...).r7aRestorationsUsed` — the DERIVED fact, never `completedRestorationEpisodes` — and a Pariwar with no resolved R7(A) threshold records `NULL`, not `0`; a companion test pins that the same unresolved projection still returns **200**, because Q5 option (b) was put and rejected (D6). **The two-copy pattern, not a shared import:** the evidence-ref schema is canonical in `@twt/domain` and value-aligned in `@twt/contracts`, held in lockstep by a test-only drift guard that asserts both copies agree on ten accept/reject cases — ⛔ a domain→contracts import is a turbo cycle and a contracts→domain source import would drag `pg` into the RN bundle. ⚠ **Four pre-existing failures PROVEN pre-existing, not asserted:** `sms-rate-buckets.spec.ts` fails 4/4 at CONNECTION (*"The server does not support SSL connections"* — `createDb` defaults to SSL and that spec passes no override), and re-running it with this story's entire working tree **stashed** reproduces all four at `baseline_commit`. |
| 2026-08-12 | ✅ **Task 4 (WS-B) — migration `0099`, both schema modules, the RLS policy module, the `ModerationGroundId` brand, both barrels, journal `idx: 99`.** `db:check` green; typecheck green on domain + contracts + api; `@twt/domain` **2560 tests green**; `@twt/api` **894 green, 3 red at the documented Task-4/Task-5 boundary** (the `escalation_iff_terminate` CHECK lands with the record's shape in Task 4; the route that supplies both parts is Task 5 — see the Debug Log, and ⛔ do not relax the constraint to make them green). **Four things driven live rather than asserted:** (1) both inline CHECK spellings re-confirmed as hard Postgres errors, so the `IMMUTABLE` helper is forced not stylistic; (2) ⭐ **a FINDING — the first cut of the cap CHECK raised `22023` (*"cannot get array length of a non-array"*) instead of a `23514` when handed a JSON object, and since Postgres does not guarantee `AND` short-circuits the sibling array CHECK could not be relied on to run first ⇒ the cap is now GUARDED and the function uses `CASE`, which does guarantee ordering; all 9 rejection cases now return a clean 23514**; (3) the `NOT VALID` rationale proven against a seeded legacy row — bare `ADD CONSTRAINT` dies `23514` at migrate time, the `NOT VALID` form applies, and forward enforcement still bites **both** ways; (4) ⭐ premise #4 proven in BOTH directions via `column_privileges` — the renamed column kept its grant with **no re-grant**, the three new Tier-1 columns have theirs **because 0099 names them**, and the two non-PII columns correctly have none. **The rename fanned out to 29 sites across 9 files**; ⛔ only `member_moderation_actions` moved — six other tables carry their own `rationale_ciphertext` and are untouched, including a verifier INSERT sitting in the same spec file as a moderation one. **One deliberate deviation from AC4's illustrative snippet:** the shipped function checks the per-entry shape ONLY (returning `true` for a non-array), because AC4's prose requires array-ness and the cap to stay inline and separate so a violation names which rule it broke. |
| 2026-08-12 | ⭐ **§8.6 principle-count reconciliation, before Task 4 — presentational, not substantive.** §8.6 was authored with **eight** numbered clauses (appeal gap as 8), which made the instrument assert eight principles where the ruling adopted **seven**. Collating the ruling's summary bullets against the source brief showed the mismatch was not where it was first flagged: **the seven bullets map to brief principles {1, 2, 4, 5, 6, 7, 8} — brief 3, *"Proportionality — termination is the final measure"*, appears in no bullet.** So the bullet list cannot be the enumeration of *"all seven"*, since that reading silently drops brief 3. **Brief 1–7 is the ratified set**, because (a) Q2 as put asked to land *"principles 1–7"* and required any decline to be **named** — none was; (b) brief 3 is the governing basis for the two-part escalation justification the same ruling ratified and AC6 mechanizes, so ratifying the mechanization while dropping its principle is incoherent; (c) the ruling reads *"All seven principles are Trustee-ratified. **In particular**, implementation must preserve these distinctions"* — *in particular* is emphasis, not enumeration; (d) the ruling cites *"principles 6 and 7"* on the brief's numbering. ⇒ **§8.6 clauses 1–7 unchanged and byte-identical**; the appeal-gap statement is **de-numbered** into an unnumbered closing clause ***Recorded gap — the moderation appeal***, which states in terms that it is *"not one of the seven principles above"*; the opening line now reads *"The following **seven** principles govern"*. ⛔ **No principle added, removed or reworded.** Both locales; cross-references repointed from *"§8.6, principle 8"* to *"§8.6, Recorded gap"* in the reserved-numbers note (×2 locales), AC2, AC13.1, Task 3 and the routing note. All **ten** verbatim reproductions in Decision `2026-08-12-099` **resynced and re-verified byte-for-byte**, and both locales now assert exactly **7** numbered principles (checked programmatically). Recorded as Decision clause 8.1. |
| 2026-08-12 | ✅ **Task 3 complete — the governance half of the story is landed.** Niyamavali **§8.5** (grounds for termination: the failure-of-trust test **and** six enumerated grounds, both governing), **§8.6** (constitutional sentence leading verbatim, eight principles, the two-part escalation justification) and **§8.9** (the future-governance test) authored in **both locales**; **§8.2 amended** to authorise `regulator-action` and `voluntary-pending-review` (Q3(a)); the reserved-numbers note reduced to **§8.8 only**, now naming what it is held for; and **§8.4a's mechanization disclosure corrected** (AC3). Recorded as Decision **`2026-08-12-099`**, committed with the instrument as one atomic governance act, with per-clause provenance — `[Trustee-ratified]` clauses 1–7, `[Author-committed]` 8/9/11, `[Author-finding]` 10/12. **Three judgement calls recorded rather than taken silently.** **(1) §8.9 placement.** AC2 and Task 3 both said to insert all three sections *"between §8.4a and §8.7"*; followed literally that yields **§8.6 → §8.9 → §8.7**, numerically wrong. §8.5/§8.6 went where instructed, **§8.9 after §8.7**. Part 8 now reads **8.1 · 8.2 · 8.3 · 8.4 · 8.4a · 8.5 · 8.6 · 8.7 · [8.8 reserved] · 8.9**, identically in both locales; §8.7 not renumbered. **(2) Principle numbering.** The ruling said *"all seven principles"* and listed seven distinctions ending with the appeal gap, while the source brief states **eight**, with the appeal gap as **#8** (`:583`) — and the ruling itself cites *"principles 6 and 7"* on the brief's numbering. §8.6 authored with **eight clauses**: seven substantive + the appeal gap as 8, matching what AC2 and AC13.1 already assumed. ⚠ Flagged in the decision entry as correctable rather than assumed silently — if the Panel meant a substantive principle to be dropped, clause 8 is wrong and must be **superseded**, not re-read. **(3) AC3 landed the CORRECTION ONLY.** The *"Four of its rows"* count sentence is replaced by **per-row dispositions**, because the four now differ in kind and a single count would misdescribe them; the block also gained a standing rule that a row leaves the list **only once its enforcing mechanism and test are in place**. ⛔ **No row was flipped to mechanized** — escalation justification and notice flip at Tasks 5 and 6 on green evidence, and that requirement is now carried forward explicitly under Task 3 so a later agent does not read the task as finished with the instrument. **Ten verbatim reproductions verified programmatically** against both instruments after writing (§8.2, §8.4a, §8.5, §8.6, §8.9, reserved note × 2 locales) — byte-for-byte. `docs/legal/` is gitignored, so a drifted quote would be worse than no quote: the entry **is** the record. ⛔ No `packages/` or `apps/` file touched; no version bump, no `Effective:` date, no `[LEGAL]` line; counsel review of §8.5/§8.6/§8.9 recorded as **owed**. Panel obligation queue stands at **nine**. |
| 2026-08-12 | ⭐ **Trustee Panel ruled all seven questions; story reconciled against the ruling BEFORE Task 3, at the Panel's direction.** The ruling was not a straight selection from the options offered — it **added two dimensions** and **redefined one question**, and the reconciliation is correspondingly structural, not cosmetic. **(1) AC8 was RESHAPED, not parameterised.** The story specified dwell as an **absolute** precondition on `terminate`; the Panel ruled it governs the **ordinary path only**, preserving an **immediate-termination exception** conditioned on a recorded reason. The story's own framing was wrong on its own terms — principles 5 and 6 **as adopted** say termination *normally* follows suspension and notice *normally* precedes it, so an absolute gate would have contradicted the very principles AC8 exists to mechanize. Ruled parameters: **7 days**, from the **versioned registry** (never hard-coded, FR-7), elapsed dwell **satisfies** v1 opportunity-to-respond, with ⛔ no response-record precondition invented. **(2) AC5 item 7 gained a THIRD column.** Both conditional columns were ruled *into* existence (`r7a_restorations_used_snapshot` via Q5(a), `dwell_policy_version` via Q4.4), **discharging AC13.6**; the Q4.1 exception then requires an **immediate-termination exception reason** — Tier-1, therefore `GRANT UPDATE` by name **and** scrubbed, unlike the other two, and a **separate field from both escalation parts** (they answer *why termination*; it answers *why now*). **(3) AC12's console clause was CONTRARY to the ruling and is rewritten.** It specified a disabled control; the Panel ruled a third shape neither option offered — **enabled, gated by explicit re-confirmation** naming the open dwell and the immediate route, with the **server authoritative** and ⛔ the dialog explicitly **not** granting authority. The Panel affirmed the story's earlier D5 correction by name (`legal_actions` is not rewritten because a dwell exists). **(4) AC7 hardened**: Q5(b) was **put and rejected** — a projection may never refuse an authorised decision — and the Panel volunteered the **prospective-restoration model** (restoration is forward-only, the terminated period is not erased, no retroactive contribution credit, ordinary R7/lapse rules then govern, ⛔ no special "restored terminated member" state). Verified **consistent with the code as shipped** and recorded as *verified-consistent, not fixed*. **(5) ⛔ GOVERNANCE DRIFT surfaced, not closed (new AC13.8).** Q7.2 was asked as a *confirmation* and answered with a **materially more precise governing model**: an uncleared termination confers **no ordinary rejoin eligibility**; on authorised clearance, membership is restored *prospectively* and the ordinary membership / R7 / lapse / rejoin rules are then evaluated **from the member's actual state and dates**. ⛔ Not *"12 months after restoration"* — restoration starts **no new clock**, and none may be introduced without an express governance amendment. Four texts and one live code path still state the flat model — §2.5 (base), **§8.4 and §8.4a (both RATIFIED by Decision `2026-08-10-097`)**, `prd.md:858`, and the signup guard, which blocks only while `now < terminated_at + 12mo` (`signup.handlers.ts:118-123`, `handlers.ts:269`) ⇒ **at month 13 an uncleared termination passes**. Time alone currently cures it. ⛔ **Nothing was edited**: reconciling ratified text is a Part 11 amendment needing its own routing note, ruling and *superseding* decision, and changing the guard first would make code enforce a rule no instrument states — the inversion D1 exists to prevent. The Panel obligation queue moves **seven → nine**. ⚠ `prd.md:300` (FR-6, voluntary withdrawal) deliberately excluded — a second, independent lock from a voluntary act. |
| 2026-08-11 | Story authored via `bmad-create-story` off `main` @ `4c7fdee`. Eleven premises verified live, two of them findings: §8.4a's mechanization disclosure is **wrong** about the prior-sanction row in both locales (premise #2), and a Postgres column-level `GRANT UPDATE` does **not** extend to new columns, so every new Tier-1 column ships structurally un-erasable unless `0099` grants it (premise #4). Recorded the WS-F ↔ FR-56 tension and its two-layer resolution (premise #7), and that PRD FR-56 needs no edit (premise #8). |
| 2026-08-11 | **Two stale counts corrected.** (1) AC3's **`When` clause** still read *"this story mechanizes three of the four disclosed rows"* — the exact sentence the same AC forbids twenty lines later (*"a correction is NOT a mechanization"*). The earlier S3 fix reached the instrument's count sentence but not the AC's own header, so a dev agent reading only the Given/When could still infer three rows must be flipped to *mechanized*. Rewritten to bind the `When` to the **mechanisms actually landed and green** plus the prior-sanction **correction** — *"which is not one of them"* — with all four rows dispositioned including the untouched one. The count is gone, the correction sits structurally outside the mechanisms, and the header now states the same green-before-flip condition the AC's closing `And` enforces instead of describing an intention that clause has to walk back. (2) Task 11 said *"all five items"* against AC13's **seven** (AC13.1–AC13.7, grown by the `NOT VALID` and ruling-gated-column items added in earlier passes) ⇒ **all seven**, cited by number. ⚠ The two surviving *"three of four"* strings are **correct and deliberate**: `:28` counts the reserved §-numbers this story lands (§8.5/§8.6/§8.9 of the four `niyamavali.md:230` holds), and `:272` quotes the forbidden sentence in order to ban it. |
| 2026-08-11 | **Second validation pass — all 11 premises re-verified live at `4c7fdee` (every line citation resolves exactly, including `niyamavali.md:230`/hi `:228`, `deferred-work.md:3865-3869`/`:3870-3875`, `0091:61`, journal `idx:98`, catalog version 31, and the no-`NOT VALID`-in-repo claim); 4 blockers + 2 should-fix + 2 minor closed by edit.** (B1) ⭐ **AC4's per-entry evidence CHECK was not implementable.** Driven against `twt-test-pg` (PG 16.14): the subquery spelling raises `cannot use subquery in check constraint` and the bare `jsonb_array_elements` spelling raises `set-returning functions are not allowed in check constraints` — while the surviving array+cap CHECK **accepts** `[{"kind":"x","ref":"<a full sentence of prose>"}]`, the exact residual AC4 exists to close. Replaced with an `IMMUTABLE` helper function called from the CHECK, proven live to reject a prose `ref`, an unknown `kind` and a third key; precedented by ten `CREATE FUNCTION` migrations. (B2) **AC11's grounds scrub was unreachable** — every `anonymize.ts` scrub keys on `member_id` and AC9's table had none ⇒ `member_id` denormalized onto `member_moderation_grounds`, on the same reasoning `pariwar_id` already is. (B3) **The new event type has THREE registration points and the story named one**; the domain two (`member/events.ts:300,324`) fail at RUNTIME (`MEMBER_EVENT_PAYLOAD_SCHEMAS[type].parse` on `undefined`), and AC9's payload spec omitted the `auditShape` its own identity test needs. (B4) **AC10's compile-error guarantee could not hold**: `ReasonCodeMeta` spans ten codes, Q6 ratified seven ⇒ `ordinarilyResultsIn: ModerationAction \| null`, required, `null` ratified for the three restore grounds and Q6 rescoped to say so. (S1) AC7 named `readContributionFactInputs`, whose raw `completedRestorationEpisodes` is always a number ⇒ `produceContributionFacts`, the derived fact, which is `null` when the threshold never resolved (`producer.ts:550`). (S2) AC8's dwell base was unpinned between `acted_at` (app clock) and the in-hand `overlay.since` (DB clock) ⇒ `acted_at` pinned, the skew named as the date-bomb class. (M1) Anti-pattern 17 — `ground-appended` must not join `MODERATION_EVENT_TYPES`. (M2) 10.19's debug-log #3 carried: the reducer `safeParse`s and returns state unchanged, so the identity test passes on a malformed payload too ⇒ pin the parse separately. |
| 2026-08-11 | **Adversarial spec review — all 11 premises re-verified live at `4c7fdee` and all 11 hold; 4 blockers + 3 should-fix + 2 minor closed by edit.** (B1) Dev Notes stated the package dependency direction **backwards** and offered `@twt/domain` → `@twt/contracts` as one of two options — a turbo cycle forbidden by name at `errors.ts:41`; replaced with the two-copy + drift-guard pattern (`review-reason-codes.ts:15-19`). (B2) AC7's fact snapshot and AC8's version pin each needed a column **AC5's DDL never created**, while AC5 forbade a second migration ⇒ new ruling-dependent **item 7**. (B3) AC5 item 4's CHECK was an `ALTER TABLE` against a **populated** table (`0091:61`'s twin was created inside `CREATE TABLE`, on an empty one) ⇒ `23514` at migrate time; a sentinel backfill is impossible from `.sql` (no KMS round-trip) ⇒ **`NOT VALID`**, the repo's first, with `VALIDATE CONSTRAINT` recorded as owed (AC13.5). (B4) The one-primary partial unique index + `SELECT, INSERT` grant make the **primary ground un-supersedable**, contradicting AC9's prose and its own driving test ⇒ supersede scoped to **supporting** grounds, typed 409 on the primary, and D3's now-explicit both-sides-immutable argument. (S1) AC4's *"a raw-SQL writer cannot bypass the domain"* was false for the **entry shape** ⇒ per-entry `jsonb_array_elements` CHECK, or the residual stated honestly. (S2) D5's own anti-fork argument turned against AC8 — dwell in the caller alone leaves `terminate` in `legal_actions` (`handlers.ts:380-382`) so the console renders a button that 409s ⇒ additive `termination_available_at`, `legal_actions` **unfiltered**. (S3) The "mechanizes three of four rows" count contradicted AC3's own dispositions (a correction is not a mechanization). (M1) D2's two-column split and the `NOT VALID` precedent added to the scope-additions list. (M2) Reducer totality for `ground-appended` stated as covered-by-construction via `memberStateMachine`'s `default: return state` arm. Anti-patterns 13–16 added. |
