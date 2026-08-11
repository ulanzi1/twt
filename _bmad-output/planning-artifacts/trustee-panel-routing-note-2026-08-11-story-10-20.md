# Trustee Panel Routing Note — Story 10.20, Moderation Record Model

**Status:** ⏳ **Open — seven questions, awaiting ruling.** Q1, Q2, Q4 and Q5 are ⛔ **BLOCKING**.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-11, against
`_bmad-output/implementation-artifacts/10-20-moderation-record-model.md`
at its baseline `main` @ `4c7fdee`. **No code has been written.** The story is `ready-for-dev` and stops
at **Task 2** until this note is ruled.
**Story state:** 10.20 is `ready-for-dev`. 10.21 and 10.22 are `backlog`. 10.16, 10.17, 10.18, 10.19 and
10.23 are `done`. Story 10.19 landed and its Decision `2026-08-10-098` is the head of `.decision-log.md`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-11-099`** from the
current head `2026-08-10-098`, in the per-question option-ratification pattern of Decision
`2026-08-07-088`. Per Decision `2026-08-09-095` the entry must **label per-clause provenance** —
which clauses are Panel rulings (`[Trustee-ratified]`), which are defaults taken (`[Author-committed]`),
and which are author findings. The new §8.5, §8.6 and §8.9 must be reproduced **verbatim in both
locales** in that entry, because `docs/legal/` is gitignored and the entry is the only durable copy.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject,
> not a default the Panel is assumed to accept by silence. Where silence *does* carry a consequence,
> that consequence is stated per question and again in *"What non-answer would mean"*.

---

## Why this note exists

Story 10.20 proposes to make the system **enforce** a two-part escalation test, a dwell precondition,
and a restoration-exhaustion assertion before a member may be terminated. Every one of those rules
rests on principles that **no governing instrument states today**.

The principles exist. They are drafted at
`_bmad-output/implementation-artifacts/moderation-model-decision-brief.md:531-583` and carried into
`prd.md:866-874` (FR-56, amended 2026-08-04). But a decision brief is not a governing instrument and a
PRD is not one either. Niyamavali Part 8 — the instrument — reads, in the relevant places:

> **8.2 Grounds for suspension**
> An R7 sub-clause violation; **R14** forgery; **R10(A)** parallel-org office-bearing; a concealment
> flag **confirmed by a State Trustee** (§5.6); or helpline-escalated abuse.

> **8.4 Termination**
> Termination is recoverable **only by explicit Trustee reinstatement**, and is subject to the
> **[[12-month]] rejoin lock** (§2.5, FR-6).

**There are no grounds for termination in the instrument.** §8.2 enumerates grounds for *suspension*
only. There are no principles governing when the harsher sanction is warranted. There is no test a
future ground must pass. Story 10.19 landed §8.4a — the suspension-vs-termination comparison — but
§8.4a states the *distinction*; it does not state the *grounds*, the *principles*, or the *test*.

`deferred-work.md:3865-3869` routes exactly this gap here, by name:

> **§8.5, §8.6, §8.8 and §8.9 and the §8.2/§8.3 edits stay UNLANDED** — owned by **10.20** (grounds,
> principles, record model) and **10.22** (appeal).

And `niyamavali.md:230` holds the numbers open for it:

> *§8.5, §8.6, §8.8 and §8.9 are reserved. §8.7 is deliberately numbered ahead of them; the intervening
> numbers are held for the remaining Part 8 amendments and are **not to be closed up**.*

**So the governance half is routed, not authored.** Which grounds justify ending a membership, which
principles bind the decision-maker, how long a member must be left suspended before termination may
follow, and whether a data projection may *refuse* a Panel decision — these are governance facts. An
implementer who settles them has let a delivery schedule decide a constitutional question. This is the
same shape Stories 10.18 and 10.19 established, unchanged
(`[[feedback_governance_commits_precede_implementation]]`).

### One finding the Panel should see before ruling anything

⛔ **§8.4a's mechanization disclosure — landed nine days ago by Story 10.19 — is factually wrong, in
both locales.** `niyamavali.md:212` (mirror `niyamavali.hi.md:210`) states:

> · **Prior sanction required** — no precondition requires a prior suspension.

**That is false at HEAD.** `nextModerationStatus('none', 'terminate')` returns `null`
(`packages/domain/src/member/moderation/status.ts:41-42` — the `'none'` arm returns `'suspended'` for
`suspend` and `null` for everything else), so termination structurally **cannot** be reached except
from `suspended`. That was Story 10.10's Decision 2 and it has always been true.

What is actually missing is **dwell**. The decision brief states it precisely
(`moderation-model-decision-brief.md:516-518`): *"No dwell time.
`nextModerationStatus('suspended','terminate')` returns `'terminated'` unconditionally. Two API calls
seconds apart terminate a member…"*

⇒ The row is **corrected, not merely flipped to mechanized**: the precondition exists and is *nominal*.
The instrument **understates its own mechanization**, which is the same copy-truth defect as
overstating it, and is corrected the same way. **This is an author finding, not a question** — it is
recorded here so that no clause of the coming ruling is read against a sentence the Panel now knows to
be wrong. It is disposed by the story's AC3, in both locales, before any row is flipped.

---

## The seven questions

| Q | Subject | Blocking? | Feeds |
|---|---|---|---|
| **Q1** | §8.5 — grounds for termination | ⛔ **BLOCKING** | AC2 |
| **Q2** | §8.6 — the principles | ⛔ **BLOCKING** | AC2, AC6, AC8 |
| **Q3** | §8.2 — the two unanchored codes | — | AC2, AC10 |
| **Q4** | WS-D — the dwell / notice precondition | ⛔ **BLOCKING** | AC8 |
| **Q5** | WS-C — restoration exhaustion | ⛔ **BLOCKING** | AC7 |
| **Q6** | WS-F — `ordinarilyResultsIn` guidance | — | AC10 |
| **Q7** | §8.9 + the §2.5 severity gradient | — | AC2, AC13 |

**Why those four block.** Q1 and Q2 are the *text* — Task 3 cannot author a section whose content is
unruled. Q4 and Q5 each decide **which columns migration `0099` creates**, and `0099` is one
hand-authored migration that the story forbids splitting (AC5). A column not created on the ruling is
not addable later without a second migration and a second review. **The migration cannot be written
before Q4 and Q5 are answered.**

---

### Q1 — §8.5: grounds for termination ⛔ BLOCKING

**The gap.** §8.2 enumerates five grounds for *suspension*. Nothing enumerates grounds for
*termination*. `prd.md:871` lists as a **testable consequence**: *"Grounds for termination are
enumerated separately from grounds for suspension; the two sets are not interchangeable."* That
consequence is untestable today because one of the two sets does not exist.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **The failure-of-trust test PLUS a six-item enumeration** | §8.5 states a general test — *conduct evidencing a failure of the trust on which membership rests* — and then enumerates: **forged documents · identity fraud · financial fraud · deliberate concealment · repeated malicious abuse · persistent conduct materially threatening the Trust after due process**. Both halves govern: the enumeration is not exhaustive of the test, and the test does not license a ground outside it without a Part 11 amendment. |
| **(b)** | **The test alone**, leaving enumeration to case law | §8.5 states the test; grounds accrete through Panel decisions over time. |

⚠ **The cost of (b), stated plainly.** It makes `prd.md:871` **permanently untestable** — there is no
second set to compare against, so "the two sets are not interchangeable" can never be asserted by a
test, only by a reviewer's judgement. It also leaves the first terminating Panel with no text to reason
from, which is precisely the condition this arc exists to end.

⚠ **The cost of (a), stated equally plainly.** An enumeration written before any case has been decided
is an enumeration written from imagination. If it is later found to be wrong, it is corrected by a
**Part 11 amendment and a superseding Decision** — never by re-reading
(`[[feedback_supersede_never_reinterpret]]`).

⭐ **Recommend (a)**, because the enumeration is recoverable and the untestability of (b) is not.

---

### Q2 — §8.6: the principles ⛔ BLOCKING

**The ask.** Land principles 1–7 (`moderation-model-decision-brief.md:531-583`) as §8.6, led
**verbatim** by the constitutional sentence that `prd.md:866` already carries:

> **Termination is an exceptional governance act, not a stronger suspension.** It carries its own
> threshold, its own reasoning and its own record.

plus the **two-part escalation justification** in the form FR-56 already states
(`prd.md:868`): the decision-maker must record BOTH **(a)** why suspension is inadequate to the case —
*what it would fail to protect, what risk would persist through it, or why the restoration path it
preserves is unavailable or futile* — AND **(b)** why termination is proportionate; and **part (a) is
not satisfied by asserting the seriousness of the ground**.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Land principles 1–7 as drafted**, constitutional sentence leading and verbatim | The instrument states what the code will enforce, in the same words the PRD already carries. |
| **(b)** | **Land a subset** | Every declined principle is **named in the ruling**, because WS-C and WS-D mechanize principles **3, 5, 6 and 7** — a declined principle is a mechanism that must not ship. |

⛔ **This is the question with the most direct code consequence.** The story builds:
- **principle 3 / 5** → AC6, the mandatory two-part escalation justification on `terminate`
- **principle 6 / 7** → AC8, the dwell precondition

**If the Panel declines principle 6 or 7, AC8 does not ship** and Q4 becomes moot. If the Panel
declines 3 or 5, AC6 does not ship and D2's two-column split loses its reason to exist. Any decline must
therefore be **explicit and named**, not left to inference.

⭐ **Recommend (a).** These principles are already in the PRD as amended 2026-08-04; §8.6 makes the
instrument agree with the product specification rather than trail it.

---

### Q3 — §8.2: the two unanchored reason codes

**The finding (D7.2, re-verified live).** The shipped registry
(`packages/domain/src/member/moderation/reason-codes.ts:32`) carries **seven** moderation grounds.
§8.2 anchors **five** of them. Two ship with **no anchor in the instrument at all**:

| Code | §8.2 anchor |
|---|---|
| `r7-contribution-discipline` | ✅ *"An R7 sub-clause violation"* |
| `r14-forgery` | ✅ *"**R14** forgery"* |
| `r10a-parallel-org-office` | ✅ *"**R10(A)** parallel-org office-bearing"* |
| `concealment-confirmed` | ✅ *"a concealment flag **confirmed by a State Trustee** (§5.6)"* |
| `helpdesk-escalated-abuse` | ✅ *"helpline-escalated abuse"* |
| **`regulator-action`** | ⛔ **none** |
| **`voluntary-pending-review`** | ⛔ **none** |

Both are epic-only codes, recorded as such in the registry's own header comment
(*"plus the epic-only `regulator-action` + `voluntary-pending-review`"*). A member can be suspended
today on a ground the Niyamavali does not authorise.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Authorise them in §8.2** | §8.2 gains two grounds — regulator or statutory direction, and a member-initiated voluntary suspension pending review. The instrument catches up to what the system already does. |
| **(b)** | **Retire them** | The codes are withdrawn from the vocabulary. |

⛔ **Option (b) is NOT implementable by this story, and the Panel should rule knowing that.**
Retiring a code is a **vocabulary change**, which `epics.md:3867` forbids here in terms
(*"`reason-codes.ts`'s frozen code-level vocabulary **stays as shipped**"*). It would additionally
require its own story and a `moderation_reason_code` enum migration **against live rows** — rows
already written under those codes cannot be orphaned. A (b) ruling is therefore recorded as
**owed work with a named re-trigger** (AC13.2), and the codes keep shipping until that story lands.
**Ruling (b) does not remove them; it schedules their removal.**

⭐ **Recommend (a).** A ground the system can already act on should be a ground the instrument
authorises. (b) leaves an unanchored code live for however long the follow-up story waits.

---

### Q4 — WS-D: the dwell / notice precondition ⛔ BLOCKING

**What the code does today.** `nextModerationStatus('suspended', 'terminate')` returns `'terminated'`
**unconditionally** (`status.ts:44`). Two API calls seconds apart terminate a member. And because the
suspension notice is a best-effort post-commit job, **termination can precede its own notice** — the
member can learn of the suspension and the termination in either order, or the notice can arrive after
the membership has already ended.

§8.4a states the requirement the system does not meet: *"**Notice and an opportunity to respond** must
precede the act."*

**Two sub-questions. Both must be answered.**

**Q4.1 — What satisfies "opportunity to respond"?**

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Elapsed dwell alone** | A fixed interval must separate the suspension from the termination. The member's opportunity is the interval itself. |
| **(b)** | **A recorded response-or-waiver** | Termination additionally requires a recorded member response, or a recorded waiver/non-response after the interval. |

⭐ **Recommend (a) for v1, with (b) named as Story 10.22's.** A response has **nowhere to arrive**
until the appeal route exists — §8.8 is unlanded and 10.22 owns it. Ruling (b) today would require this
story to build an intake surface it does not scope, or to record a "waiver" that is really just silence
under a different name. Under (a), the *opportunity-to-respond* half of §8.4a stays **stated-but-
unmechanized**, disclosed as such in the instrument, with **10.22 as the named owner** (AC13.3).

**Q4.2 — What interval, and where does the duration live?**

The Panel sets the number. The engineering question is only *where it is recorded*:

| | Option | What it means |
|---|---|---|
| **Registry** ⭐ | A **version-pinned policy clause**, the FR-8 / Story 10.23 pattern | The record carries `dwell_policy_version`, so a decision taken in 2026 can be read back against the policy that was **in force when it was taken**, after the policy later changes. |
| **Code constant** | A constant in the caller | Simpler. The record carries no version. |

⭐ **Recommend the registry.** The cost of the constant is not effort — it is that a policy change
becomes **unreadable off a historical decision**. `[[feedback_supersede_never_reinterpret]]` requires
historical payloads to stay correct under the policy in force; without the version pin they can only be
re-read under the current one. If the Panel rules the code constant, that consequence is recorded as
owed (AC13.6) rather than left silent.

⛔ **Column consequence — this is why Q4 blocks.** The registry branch creates
`dwell_policy_version text NULL` on `member_moderation_actions` in migration `0099`. The code-constant
branch **does not create it**. There is no second migration.

**One design note the Panel may wish to constrain.** The dwell precondition lives in the **caller**,
never in `nextModerationStatus` — the reducer is pure, total and exhaustive, takes no clock and no
policy, and four other call sites derive the console's available actions from it (D5). To stop the
admin console offering a button that then 409s, the story adds an additive `termination_available_at`
instant to the response. The Panel may rule whether the console's terminate control is **disabled with
that reason shown**, or **enabled and 409s**. ⛔ A disabled control with no reason is worse than the
409 it replaces.

---

### Q5 — WS-C: restoration exhaustion ⛔ BLOCKING

**What the epic asks.** `epics.md:3852`: terminating on a ground with an available restoration path
*"requires a recorded justification"*, and `contribution.r7a_restorations_used >= 2` *"already evidences
genuine exhaustion, so this is checkable from data rather than assertion"*.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Recorded justification + a fact snapshot on the record** | The Panel records why the available restoration path is futile; the system **snapshots** the restoration-count fact onto the moderation record at decision time. A reviewer can later check the assertion against the number that was true when it was made. The decision is never refused. |
| **(b)** | **A hard server-side block below the threshold** | The API refuses to record a termination while `r7a_restorations_used < 2`. |

#### D6 — the cost analysis the story asks be put in front of the Panel

`contribution.r7a_restorations_used` is a **projection**, not a fact of record. Three properties matter:

1. **It can be `null`.** When R7(A) resolves to no clause version — an unprovisioned or un-versioned
   registry — the fact is **omitted, not zeroed** (`producer.ts:550`). Null is *unknown*, never `0`.
2. **It can lag.** It is produced by `@twt/validity-service` from a projection over `events_log`.
3. **It is not free to reach.** The moderation handler imports **no validity code at all** today. Using
   the fact is a **new dependency edge** from `apps/api/src/modules/member-moderation` to
   `@twt/validity-service`. That edge is legal — `trustee-lite/handlers.ts:60` already establishes it —
   but it is a real coupling, taken deliberately.

⚠ **Therefore option (b) means: a Pariwar whose registry is unprovisioned cannot terminate anyone.**
The fact reads `null`, the threshold cannot be satisfied, and the block holds. That is an **availability
failure wearing a governance costume** — and the members it protects are protected by an accident of
data provisioning rather than by a governing principle.

⚠ **Option (b) also contradicts principle 2**, which assigns the sanction to the Panel. Under (b), a
**projection can refuse a Panel decision**. If the Panel wants that, it is the Panel's to want — but it
should be ruled with the sentence said out loud, not arrived at by picking the stricter-sounding option.

⭐ **Recommend (a).** It makes the exhaustion assertion **checkable by a reviewer**, which is what
`epics.md:3852` actually asks for, without making a projection the decider. **The Panel rules; this note
presents the cost.**

⛔ **Column consequence — this is why Q5 blocks.** Option (a) creates
`r7a_restorations_used_snapshot integer NULL` on `member_moderation_actions`, where **`NULL` means
*unknown*, never `0`**. Option (b) **does not create it**, and the exhaustion assertion becomes
re-derivable only against a projection that has since moved (recorded as owed, AC13.6).

---

### Q6 — WS-F: `ordinarilyResultsIn` guidance

**What is being added.** `ReasonCodeMeta` (`reason-codes.ts:56-64`) gains a new field,
`ordinarilyResultsIn`, which the admin UI surfaces as guidance when a ground is selected. ⛔ It is
**guidance, not a default and not a constraint** — nothing branches on it.

⛔ **What is NOT being asked, and must not be inferred:** `appliesTo` **stays**
`['suspend','terminate']` for all seven moderation grounds (`reason-codes.ts:72`). `epics.md:3866`
forbids narrowing it, because a registry that narrows the sanction has **pre-empted the Panel**. The
FR-56 consequence about separately-enumerated grounds is satisfied at the **governance layer** (§8.5,
Q1), not by hard-coding the registry.

**The value is governance data.** It says *what the Trust holds a ground ordinarily warrants* — so it
is the Panel's to set, per code:

| Code | ⭐ Recommended |
|---|---|
| `r7-contribution-discipline` | `'suspend'` |
| `r14-forgery` | `'suspend'` |
| `r10a-parallel-org-office` | `'suspend'` |
| `concealment-confirmed` | `'suspend'` |
| `helpdesk-escalated-abuse` | `'suspend'` |
| `regulator-action` | `'suspend'` |
| `voluntary-pending-review` | `'suspend'` |

⭐ **`'suspend'` for all seven**, per §8.4a's own test: the Panel escalates **by recording why**, not by
the registry pre-empting it. A ground marked as ordinarily terminating would make the two-part
escalation justification a formality on that ground — the opposite of principle 3.

⚠ **The ruling must also cover the THREE restore grounds.** `rule-clearance`, `trustee-discretion` and
`moderation-error` (`reason-codes.ts:44`) share the one `ReasonCodeMeta` type, so the field exists on
them whether or not it means anything.

⭐ **Ratify `null` for all three** — *a code that justifies no sanction carries no sanction guidance.*
⛔ Without that clause, the type forces a dev agent to **invent guidance the Panel never gave**, which
is the exact failure this question exists to prevent.

---

### Q7 — §8.9 and the §2.5 severity gradient

**Q7.1 — the future-governance test.** §8.9 would state:

> *Any future moderation ground or sanction shall be evaluated against these principles rather than by
> analogy to existing reason codes.*

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Land it here, with §8.6** | The principles land and the test that binds future additions to them lands in the same act. |
| **(b)** | **Defer to 10.22** | §8.9 waits; §8.6 ships without the clause that makes it govern additions. |

⭐ **Recommend (a).** The test is the clause that stops the next ground being added by resemblance to
an existing one — the drafting failure this whole arc corrects. Deferring it leaves §8.6 stating
principles that nothing requires a future amendment to consult.

**Q7.2 — a gradient the Panel should confirm, not assume.**
`sprint-change-proposal-2026-08-04.md:559` raises it and it has never been ruled. §2.5's **12-month
rejoin lock** applies to a member *"terminated **or lapses**"*. So termination's **harshest stated
consequence is shared with ordinary lapsing** — a member who simply stops contributing and a member
terminated for financial fraud face the same rejoin bar.

⚠ This note does **not** propose changing §2.5. Changing it would alter a lapse consequence for
reasons that have nothing to do with lapsing, and that is not this story's. The ask is narrower:
**confirm the gradient is intended**, so it is recorded as a ruled position rather than an unexamined
inheritance. If the Panel finds it unintended, that becomes **named owed work** (AC13), not an edit
made here.

---

## What non-answer would mean

| Q | If not answered |
|---|---|
| **Q1** | ⛔ §8.5 is not authored. The story stops at Task 2. `prd.md:871` stays untestable. |
| **Q2** | ⛔ §8.6 is not authored, and AC6 + AC8 lose the principles they mechanize. The story stops at Task 2. |
| **Q3** | §8.2 is unchanged; the two codes stay live and unanchored. Recorded as an **open governance gap**, carried forward — ⛔ not silently closed. |
| **Q4** | ⛔ Migration `0099` cannot be written: the dwell column's existence is unruled. The story stops at Task 4. |
| **Q5** | ⛔ Migration `0099` cannot be written: the snapshot column's existence is unruled. The story stops at Task 4. |
| **Q6** | AC10 cannot compile — `ordinarilyResultsIn` is a required field across ten codes with no ratified values. ⛔ A dev agent must not invent them. |
| **Q7** | §8.9 stays reserved and unlanded; the §2.5 gradient stays an unexamined inheritance. Both recorded as owed. |

**A blocked ruling stops the story at its governance half, recorded as such** — not worked around, not
proceeded on an assumed answer (`[[feedback_record_unattested_no_backfill]]`).

---

## What this note does NOT ask, and what a ruling would NOT mean

| Not asked here | Owner |
|---|---|
| **§8.8 — the moderation appeal route** | **10.22.** §8.6 principle 8 *states* the gap; it does not close it. |
| **The off-portal DPDPA access route** | **10.21.** |
| **Flipping `termination_access_block`** | Story 10.21's gate, per Decision `2026-08-10-097`. ⛔ Untouched here. |
| **Retiring a reason code** | Its own story + an enum migration against live rows (Q3(b)). |
| **A new `ModerationStatus` label or sanction tier** | **None is added.** `termination-block-seam.ts:116` speculates that *"Story 10.20's sanction tiers"* are the live candidate for a new label. **They are not** — this story adds record structure and preconditions, no state. |
| **A new permission key or catalog bump** | Neither. `trustee_panel` already holds `member.moderate` at a `pariwar` ceiling (`roles.ts:560`); the catalog stands at **31**. |
| **Extracting a generic discipline-record primitive** | One consumer exists. Named as a future extraction point only (`[[feedback_no_premature_package]]`). |

**A ruling on this note would mean:** §8.5, §8.6 and §8.9 are **authored and Panel-ratified** into both
locales, and the record model may be built. **It would NOT mean** a `[[v1.0]]` → `v1.1` version bump, an
`Effective:` date, a `[LEGAL]` counsel-acceptance entry, or any claim that Part 8 is legally settled.
The Niyamavali remains an **unadopted draft** and **counsel is not engaged** — every return field in
`docs/legal-counsel-engagement/` is `<PENDING>`. Use
`[[feedback_closure_language_precision]]` verbs: **authored and Panel-ratified**; **counsel review
remains outstanding**. Never "approved", never "final".

⚠ **`docs/legal/` is gitignored.** The amendment leaves **no diff and no blame**. The `.decision-log.md`
verbatim reproduction, in both locales, **is** the record. Story 10.18's Escalation 7, unchanged and not
this story's to fix.

### The standing Trustee Panel obligation queue

It stood at **seven** after Story 10.19 (`deferred-work.md:3870-3875`). This story's **counsel review of
§8.5/§8.6/§8.9** makes it **eight**, unless a ruling here discharges one. Stated as a count, not as
progress.

---

## Ruling template

The Panel may rule by completing this table. Per Decision `2026-08-09-095`, the recorded entry must
carry per-clause provenance.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** | (a) / (b) | If (a), confirm the six enumerated grounds as listed or amend the list |
| **Q2** | (a) / (b) | If (b), **name every declined principle** — 3, 5, 6 and 7 are mechanized |
| **Q3** | (a) / (b) | If (b), acknowledged as scheduled, not performed |
| **Q4.1** | (a) / (b) | |
| **Q4.2** | interval = ______ ; registry / code constant | The interval is the Panel's number |
| **Q4.3** | console control: disabled-with-reason / enabled-and-409s | |
| **Q5** | (a) / (b) | If (b), the D6 availability consequence is accepted knowingly |
| **Q6** | seven moderation codes = ______ ; three restore grounds = ______ | |
| **Q7.1** | (a) / (b) | |
| **Q7.2** | gradient intended / unintended | If unintended, recorded as owed — no edit here |
