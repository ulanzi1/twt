# Trustee Panel Routing Note — Story 10.19, Termination Ends Membership Privileges

**Status:** ⏳ **Open — six questions, awaiting ruling.** Q1 and Q6 are ⛔ **BLOCKING**.
⚠ **AMENDED 2026-08-10, before any ruling, and the amendment is material to Q6.** An investigation after
this note was first committed established that **the login block does not end a terminated member's
participation — it ends one account's access.** Nothing in the system prevents the same person signing up
again on a different mobile number. The Q6 option table originally credited option (a) with *"closes
ESCALATION 3 immediately"*; that claim was **too strong and has been corrected**, and option (b) has gained
an explicit sub-choice about what the flip is gated on. **No question was added or removed; the question set
is unchanged at six.** The finding is recorded in full at
`_bmad-output/implementation-artifacts/deferred-work.md` (*"identity collision at signup is unenforced"*).
The Panel is asked to rule on the corrected version. Nothing here has been ratified, so this is an
amendment to an open note, **not** a re-reading of a ruled one (`[[feedback_supersede_never_reinterpret]]`).
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-10, against
`_bmad-output/implementation-artifacts/10-19-termination-ends-membership-privileges.md`
at its baseline `main` @ `6f1b165`. **No code has been written.** The story is `ready-for-dev` and stops at
Task 2 until Q1 and Q6 are ruled.
**Story state:** 10.19 is `ready-for-dev`. 10.20, 10.21 and 10.22 are `backlog`. Story 10.18 landed
(`done`) and its Decision `2026-08-10-096` is the head of `.decision-log.md`.
**Disposition on ruling:** a `.decision-log.md` entry in the per-question option-ratification pattern of
Decision `2026-08-07-088`, numbered from the current head `2026-08-10-096`. Per Decision
`2026-08-09-095`, the entry must **label per-clause provenance** — which clauses are Panel rulings, which
are defaults taken, and which are author findings. The amended §8.4 and the new §8.4a must be reproduced
**verbatim in both locales** in that entry, because `docs/legal/` is gitignored and the entry is the only
durable copy.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each is a suggestion the Panel may reject, not a
> default the Panel is assumed to accept by silence. Where silence *does* carry a consequence, that
> consequence is stated per question and again in *"What non-answer would mean"*.

---

## Why this note exists

**The story's own acceptance criterion begins with a ratification that has not happened.** The epic AC for
Story 10.19 opens *"Given D5's **ratified** principles"*. `.decision-log.md` contains **no entry ratifying
D5**. The only Decision in the vicinity — `2026-08-04-072` — ratified the **architecture-recording scope**
of the correct-course and is explicit that it is a process and documentation-convention decision. It did
not ratify D5's substance.

D5's substance is two governing principles and a twelve-row comparison table, drafted at
`sprint-change-proposal-2026-08-04.md:531` and `:540-563`. Nothing in Part 8 states them today. §8.4 reads,
in full:

> **8.4 Termination**
> Termination is recoverable **only by explicit Trustee reinstatement**, and is subject to the
> **[[12-month]] rejoin lock** (§2.5, FR-6).

That is the whole of it. **The instrument does not say that termination ends membership privileges, does
not say that history is preserved, and does not say that statutory rights survive.** Story 10.19 proposes
to make the system enforce all three. Building the enforcement first would mean the code enforces a rule
the governing instrument does not state — the exact inversion
`[[feedback_governance_commits_precede_implementation]]` exists to prevent, and the exact shape Story 10.18
established two days ago.

**So the governance half is routed, not authored.** Which of the twelve §8.4a rows may be stated while the
safeguards they name are unbuilt, whether restoration from termination requires the body that imposed it,
and whether the login block may ship before the replacement access route exists — these are governance
facts. An implementer who settles them has let a delivery schedule decide a constitutional question.

### One premise the epic carried, corrected

⚠ **PRD FR-56 already carries the D5 sentence and already cites §8.4a.** `prd.md:866`, verbatim:

> **Termination is an exceptional governance act, not a stronger suspension.** … Grounds, principles and the
> record model are governed by Niyamavali Part 8 as amended — **including the suspension-vs-termination
> comparison at §8.4a.**

§8.4a **does not exist**. This is a live dangling constitutional cross-reference, flagged in Decision
`2026-08-10-096` as *"not this story's to fix"* — and Q4 is the question that fixes it. **No PRD edit is
required or proposed by this story.** The PRD is already correct about where the rule will live; the
instrument is what is missing.

### ⚠ The queue this note joins

This note opens a **sixth** open Panel obligation while **five** remain undischarged:

| # | Obligation | Source |
|---|---|---|
| 1 | Story 10.23's Escalation 6 — the imposition-flag activation authority | `2026-08-07-089`, reaffirmed four times |
| 2 | The copy-truth defect — routed for owner assignment, **still unassigned** | Story 10.17 review |
| 3 | R7(A)'s unpublished Part 11 amendment | `2026-08-06-077` |
| 4 | The R7(C)/R7(F) lock-in asymmetry | Story 10.23 |
| 5 | **Counsel review of §8.7 — OWED and un-attested** | `2026-08-10-096` clause 5, two days old |

**None of the five is this story's, and this story discharges none of them.** Stated so this note does not
arrive as if the Panel had a clear queue. ⚠ Obligation 2 is worth the Panel's particular attention here:
**this story is itself a copy-truth remediation** — AC9 sweeps five sites and AC10 fixes a screen that tells
a terminated member their correct OTP was wrong — yet the standing copy-truth defect it descends from still
has no owner.

### What is deliberately NOT here

| | Why it is not a question |
|---|---|
| **The wording of §8.4's two new paragraphs** | Author-owned. The text is drafted at `sprint-change-proposal-2026-08-04.md:531` and reproduced in the story's AC1; the Panel settles Q4 and Q5, and drafting follows. |
| **The twelve rows of §8.4a** | Author-owned as *text*. They are the SCP's own table, unchanged. Q4 asks only **which rows may land** while the safeguards they describe are unbuilt. |
| **The five `TERMINAL_STATES` Sets** | ⛔ Not routed and not touched. `packages/domain/src/member/moderation/index.ts:22-25` prohibits adding a moderation predicate to them; doing so would fork `AI-7-2`. |
| **The 15-minute access-token residual** | Disclosed, not routed. `revokeAllMemberSessions` cannot invalidate a live access JWT (`MEMBER_ACCESS_TTL_MS`, default 15 min, `config.ts:377`). Closing it needs a denylist — a larger architectural act than this story owns. Recorded in `deferred-work.md` with a named re-trigger. |
| **§8.5, §8.6, §8.8, §8.9 and the §8.2/§8.3 edits** | Owned by **10.20** (grounds, principles, record model) and **10.22** (appeal). Reserved by the note at `niyamavali.md:196`, which this story leaves unchanged. |
| **Building the off-portal DPDPA route** | **Story 10.21.** Q6 asks only about **sequencing against** it, not about building it. |
| **The appeal CTA's real destination** | **Story 10.22.** This story removes Decision 6's *justification*, not the *need* for an appeal route. |
| **Minting a 10th `AlertCategory`** | ⛔ Refused under every Q3 option. `Alert` is a `.strict()` discriminated union and an 8th push category would redefine FR-71, which Story 5.2 froze in terms. |
| **Amending `architecture.md`** | Not amended — Decision `2026-08-04-072` clause 3. The record is an `AI-10-2` doc block at the point of use. |
| **Building the identity-collision control** (the Aadhaar-HMAC key) | ⚠ **Surfaced by the Q6 amendment, deliberately NOT routed here.** Its policy question — what a collision *means* — is genuinely the Panel's, but it cannot be ruled before a **feasibility answer** the repo does not have: key stability at the DigiLocker boundary is unverified, and one legitimate outcome is *"no stable key is obtainable."* Ruling on a mechanism that may not exist is the manufactured-ratification failure mode this note is built to avoid. Recorded in `deferred-work.md` with an unassigned owner, awaiting its own story. **Q6(b-ii) is the only place it bears on a ruling here, and only as a sequencing choice.** |

---

## ⛔ What this story must not do, and is not asking permission to do

**Identical to Story 10.18's constraint, and it has not moved in two days.** The Niyamavali is an unadopted
draft — `niyamavali.md:5` carries `[[v1.0]]`, `[[date]]` and `[[date]]`, none filled, under a standing
`⚠ DRAFT — NOT LEGAL ADVICE` banner. Part 11 requires a Board-resolution reference and counsel review
before publication, and **counsel is not engaged**: every return field in `docs/legal-counsel-engagement/`
is a placeholder, and Story 0.13 has not closed.

| A ruling here means | A ruling here does NOT mean |
|---|---|
| §8.4 is **amended** and §8.4a **authored**, both locales, **Panel-ratified** | The Niyamavali is versioned or effective |
| The six questions are settled by the body they concern | The Board has resolved anything |
| The amendment has a durable record — a `.decision-log.md` entry quoting both sections verbatim in both locales | Counsel has reviewed or accepted it |
| The implementation half may begin, **to the extent Q6 permits** | Part 8 is legally settled |

Closure verbs per `[[feedback_closure_language_precision]]`: **authored and Panel-ratified**; **counsel
review remains outstanding**. Never "approved", never "final".

⚠ **Why the record must quote both sections verbatim, in both locales.** `docs/legal/` is gitignored
(`.gitignore:68`) and has **no git history** — amendments leave no diff, no blame, and no way to answer
*"what did §8.4 say on date X?"* other than the decision log. The Hindi is a **co-equal governing
instrument, not a translation artifact** (`counsel-roster.md:32`: *"The Niyamavali is Hindi-primary"*), so a
Hindi-omitting record is not a partial record — it is a record of half the instrument.

---

## Q1 — Does restoring a TERMINATED member require a formal Panel act?

> ⛔ **BLOCKING. Feeds AC3.**
> ⚠ **SECOND DEPOSIT. A third deferral is not an available outcome.**

**Why this question is here and cannot move again.** Decision `2026-08-10-096` clause 8, verbatim:

> **Q8 — Option (a) ratified: whether restoring a TERMINATED member requires a formal Panel ceremony is
> deferred to Story 10.19**, which must carry it **as an acceptance criterion, not as a note**. Today's
> single-actor `trustee-discretion` path stands meanwhile. ⚠ **This is the question's second deposit.**
> Story 10.17's review deposited it at `deferred-work.md:3260` with the re-trigger *"Story 10.18 lands and
> defines what 'sanctioning authority' actually gates"* — that trigger has now fired. **A deferral to a
> story that does not carry it as an AC is how it lapsed the first time.**

It is carried here as **AC3**. The Panel deferred it *to this story*; this story is where it terminates.

**The gap.** Part 8 uses **two different phrases** for two different reversals, and has never said whether
the difference is meant:

- **§8.3 (restoring a suspended member)** — *"either **rule-clearance** … or **Trustee discretion**"*.
- **§8.4 (recovering from termination)** — *"recoverable **only by explicit Trustee reinstatement**"*.

*"Explicit Trustee reinstatement"* is a stronger phrase than *"Trustee discretion"*, and the instrument
never says whether it names a **different authority** or merely a **more deliberate exercise of the same
one**. In code there is no difference at all: both run the single-actor `trustee-discretion` admin action.

**What has changed since the question was first deposited.** Two things, and both make the question
answerable now where it was not before:

1. **The `trustee_panel` role exists.** Story 10.18 seeded it across all six parity surfaces. A
   Panel-act precondition is now *implementable* — it was not when the question was first filed.
2. **Decision `2026-08-10-096` clause 3 ruled Panel authority CONCURRENT, not exclusive.** ⚠ This cuts
   **against** a Panel-only restore unless the Panel says so expressly: under concurrency, silence in §8.4
   means any authority Part 8 already names may reinstate. **A new exclusivity must be stated to exist.**

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **A formal Panel act is required.** §8.4 states it expressly; the implementation adds a **precondition on the caller** at `performAction`'s legality path (`handlers.ts:174-258`). | Matches the shape of the sanction: if termination is an exceptional governance act, its reversal is not an ordinary one. ⚠ Creates the **first stated exclusivity** in Part 8 — it must be written into §8.4, because clause 3's concurrency ruling means silence defaults the other way. ⛔ The `terminated --restore--> none` arm at `status.ts:47-48` is **not removed**; a precondition is added, mirroring 10.20's WS-D shape. |
| **(b)** | **Today's single-actor `trustee-discretion` path stands**, recorded as a **ruled outcome**. | Cheapest, and consistent with clause 3's concurrency. ⚠ Fixes today's behaviour as *intended* rather than *incidental*, on the basis of a system in which termination has never been exercised. If the Panel means this, it should be recorded as a decision, not left as a default nobody examined. |
| **(c)** | **A Panel act is required as a governance rule, but not gated in code** — an attestation field on the restore action. | ⛔ Not recommended. This is **enforcement by convention**, which is precisely the condition Story 10.18 existed to end. The Panel spent that story making its acts machine-distinguishable; recording this one as a text field would spend the capability the day after it was minted. |

**Recommendation (non-binding): (a).** The instrument already gestures at the distinction — *"explicit
Trustee reinstatement"* against *"Trustee discretion"* — and (a) makes that phrase mean something. The role
that makes it enforceable now exists. ⚠ **Under (a) the exclusivity must be written into §8.4 expressly.**
Under (b) or (c), `deferred-work.md:3594` closes with *Resolved via explicit ruling*, not *Closed by edit*.

---

## Q2 — Where does the termination notice's **Summary** line come from?

> **Non-blocking. Default if unruled: option (a).** Feeds **AC8**.

**The gap.** Once the portal closes, **the notice is the explanation** — there is no status page to return
to. AC8 gives it five elements: **Decision · Ground · Summary · Effective date · Further communication**.
Four have sources today. **Summary does not.** Story 10.20's structured `decision_note` — the field that
would naturally feed it — does not exist yet, and 10.20 is `backlog`.

⛔ **One source is foreclosed before the Panel is asked.** The Tier-1 Decision Note may carry detail that
must not ride SMS or WhatsApp. The epic AC prohibits sending it verbatim, and this note does not reopen
that. Today the reason reaches the member as a resolved **label** only (`moderationReasonLabelKey`,
`moderation-notify.ts:78-80`), carrying no rationale, no reason code and no actor name.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Omitted as a first-class ABSENT element** until 10.20 lands — `{ available: false }`-shaped, the `[[project_nominee_vpa_deferred_seam]]` precedent. | The notice still carries Decision, Ground (a resolved label), Effective date and Further communication — thin, but every element true. No member-facing field is minted now and restructured by 10.20's WS-B weeks later. ⛔ **Never an empty string rendered as prose** — absent must be structurally absent, not blank. |
| **(b)** | **Authored by the trustee at termination time**, as a separate non-Tier-1 member-facing field. | The member gets real prose at the moment it matters most. ⚠ Costs an **admin capture field on the terminate action**, which the epic AC does not budget, and 10.20's `decision_note` work will restructure it — churning a member-facing surface twice. |
| **(c)** | **Derived from the Tier-1 rationale.** | ⛔ Prohibited by the epic AC. Recorded for completeness only. |

**Recommendation (non-binding): (a).** Smaller and more reversible, and the absent-element shape has
precedent in this codebase. ⚠ **If the Panel judges that a notice without a summary is not an explanation**
— a defensible reading, given that this is the only communication a terminated member receives — then (b)
is the right answer and the admin capture field is its acknowledged price. That is a governance judgement
about adequacy of notice, which is why it is asked rather than assumed.

---

## Q3 — Must the termination notice attempt at least one OFF-PORTAL channel?

> **Non-blocking. Default if unruled: NO — in-app-only, recorded in AC11 as a ruled-upon reach limitation.**
> Feeds **AC8**.

**The gap.** An in-app-only notice to a member **who can no longer log in** reaches nobody. That is not a
delivery-quality concern; it is the notice failing at the moment the story makes the portal unreachable.

### ⚠ The option set the Panel must actually see — there is no free lever

A "yes" on Q3 is **not free**, and this note states the price rather than letting it surface after the
ruling. `evaluateCostOptimization` (`packages/channels/src/cost-optimization.ts:162-197`) exposes exactly
**four** levers. **Three are closed to this story:**

| Lever | Scope | Available? |
|---|---|---|
| `timeCritical` (`:129`, checked FIRST at `:164`) — the only full per-alert bypass | per-alert | ⛔ AC8 pins `time_critical: false`. A termination notice is not AR-18 time-critical, and marking it so is the countdown pressure UX Stance #5 forbids (`moderation-notify.ts:145-146` already says so in its own comment) |
| `toggleEnabled` (`:131`) | per-Pariwar | ✗ not per-alert — flipping it changes every alert in the Pariwar |
| `lastEngagementAt` (`:133`) | per-member state | ✗ not addressable by a sender |
| `windowMsByCategory` (`:137`) | per-**category** | ⚠ the notice ships `alert_category: 'alert_published'` (`moderation-notify.ts:151`) — **shared** with `news-publish.ts:161` and `contribution-notify-triggers.ts:310`. Retuning it silently changes Story 10.5's announcements and contribution reminders. **Verified live; not a local fix.** |

⇒ **A "yes" therefore costs a fifth mechanism that does not exist today**: a new per-alert exemption field
on `CostOptimizationInput` (`:125-138`) plus its branch in `evaluateCostOptimization` — i.e. a
**`packages/channels` contract change**, landing with its own pure unit test asserting both that the
exemption bypasses suppression *and* that every other category's behaviour is unchanged.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Yes — and authorise the new `CostOptimizationInput` exemption field** as the mechanism. | The notice reaches a member who cannot open the app. Costs a `packages/channels` contract change plus its test. The two forbidden levers stay forbidden and the shared-category lever is not touched. |
| **(b)** | **No — in-app-only.** | Zero implementation cost. ⚠ Means the one communication a terminated member receives is delivered to a surface they can no longer authenticate into. Must be recorded in **AC11** as a **ruled-upon** reach limitation with the exemption field named as the re-trigger — never left implicit. |

**Recommendation (non-binding): (a).** A notice nobody can receive is not notice. But the Panel rules, not
this story — and the Panel should rule knowing that "yes" opens a shared-package contract, not a config
value.

---

## Q4 — May §8.4a state rows whose safeguards are not yet built?

> **Non-blocking. Default if unruled: option (a), with the disclosure.** Feeds **AC1**.

**The gap.** The twelve-row table is the practical form of the constitutional distinction — the two columns
*"differ in kind at every row, not in degree"* (`sprint-change-proposal-2026-08-04.md:542`). **Three rows
describe safeguards that do not exist in the system today:**

| Row | States | Built? |
|---|---|---|
| **Escalation justification** | *"**Mandatory** — two-part: why suspension is inadequate, *and* why termination is proportionate"* | ✗ **Story 10.20** (WS-B) |
| **Notice + opportunity to respond** | *"**Notice and an opportunity to respond** must precede the act"* | ✗ **Story 10.20 / 10.22** |
| **Prior sanction required?** | *"**Yes** — follows a prior suspension, absent an express Niyamavali exception"* | ✗ **Story 10.20** |

A fourth row — **Portal access: *"Ended"*** — becomes true only if Q6 permits the login block to ship.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Land the table complete, with an explicit mechanization-status disclosure** naming which rows are not yet enforced and which story owns each. | The instrument states the distinction it is there to state. The table is a **constitutional statement, not a status report on the codebase** — a partial table would make the Niyamavali describe the implementation rather than govern it. Precedent exists: Decision `2026-08-06-080` landed ratified clauses carrying `provisional` flags. |
| **(b)** | **Land only the rows already true**, adding the rest as 10.20/10.22 build them. | Nothing in the instrument outruns the system. ⚠ Costs **three further amendments** to the same section, each needing its own Panel act — and a reader of the partial table would reasonably infer that the omitted safeguards are **not required**, which is the opposite of D5's intent. |

**Recommendation (non-binding): (a).** ⚠ **With a stated caution:** per
`[[feedback_mechanization_split_commitment]]`, decay concentrates in the un-mechanized half. If the table
lands complete, the three unbuilt rows must carry **named owners and re-triggers** in the Decision entry —
not a general "10.20 will do it", which is how `[[project_r7_fact_producer_unbuilt]]` happened.

⚠ **This ruling also settles the index question.** AC1 adds **no `APPENDIX A — RULE INDEX` entry** in either
locale unless Q4 requires one — §8.4a is a comparison, not an indexable `R`-rule (the Decision
`2026-08-10-096` clause 10 precedent). The absence is recorded so a later reader does not read it as an
omission. **The `niyamavali.md:196` reserved-numbers note is left unchanged** — verified live: it reserves
§8.5, §8.6, §8.8 and §8.9, and **§8.4a is not among them**.

---

## Q5 — Does the Panel-attestation-only precedent extend to §8.4 and §8.4a?

> **Non-blocking. Default if unruled: proceed on `080`/`096`, counsel review recorded as OWED.** Feeds
> **AC1**.

**The gap.** Decision `2026-08-06-080` amended `niyamavali.md` §3.1 and Appendix A on **Trustee Panel
attestation alone**, `Status: Trustee-ratified`, with no `[LEGAL]` entry. Decision `2026-08-10-096`
clause 5 extended that precedent to §8.7 **two days ago**, recording counsel review as owed and
un-attested, and noting the tension in terms: Part 11 requires counsel review before publication, but
*"Story 0.13 has not closed, no counsel is selected, and waiting has no termination condition."*

**Q5 asks whether that extends a second time** — rather than having this story assume it by analogy.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Yes — the precedent extends to §8.4/§8.4a.** Counsel review recorded as **OWED and un-attested** per `[[feedback_record_unattested_no_backfill]]`. | Consistent with `080` and `096`. ⛔ Under no reading does this constitute counsel acceptance, and **no `[LEGAL]` line is written**. |
| **(b)** | **No — hold §8.4/§8.4a for counsel.** | Honest about Part 11. ⚠ Has **no termination condition**: Story 0.13 is not closed and no counsel is selected, so this is an indefinite hold on a story that closes a live open harm. |

**Recommendation (non-binding): (a).** ⚠ The Panel should note that this is the **third** amendment landing
on attestation alone. That is not an objection — the alternative is indefinite — but the count is worth
stating, because a precedent applied three times without review stops reading as an exception.

---

## Q6 — Ship the login block now, behind a default-OFF flag, or hold?

> ⛔ **BLOCKING. Feeds AC4, AC5, AC7, AC8, AC9, AC10, AC11 — the entire implementation half.**
> **This is the widest-blast-radius question in the set.**

**The gap.** This story **creates** the gap Story 10.21 closes. Today a terminated member can still log in
and reach Story 3.11's member-portal export. After the block, they cannot — and **no off-portal route
exists**, because that route is Story 10.21 and 10.21 is `backlog`.

⚠ **The SCP already positioned 10.21 as a gate on this.** `sprint-change-proposal-2026-08-04.md:156` lists
Story 10.21 with the disposition *"**Release gate on enabling termination**"*. **Shipping the block now is
therefore not an implementer's sequencing call — it is a request to restate a gate the correct-course
itself set.** That is why it is routed.

### ⚠ AMENDMENT — what the block actually buys is smaller than this note first claimed

**The login block ends one account's access. It does not end a terminated member's participation.** Traced
live after this note was first committed, and recorded in full in `deferred-work.md`:

| Layer | Why a second account is not caught |
|---|---|
| **Signup dedup** | `resolveMembersByMobile` (`member-auth.repo.ts:82`) resolves by `mobile_blind_index` **and nothing else**. A different mobile ⇒ zero rows ⇒ clean signup. No 409, no 403, no flag. |
| **The rejoin lock** | Keys on `terminated` (`signup.handlers.ts:119`) and is scoped to the **same Pariwar**. A **suspended** member has no lock at all — not even on the same mobile. |
| **DigiLocker KYC** | The Aadhaar reference is discarded at the provider boundary — `mapper.ts:89` keeps the **last 4 digits only**, stored with **no unique constraint** (migration `0024:33`). Not an identity key. |
| **Manual KYC** | Written `self_declared`, `trusteeVerified: false` — and **nothing ever writes `true`**. There is no reviewer surface (`apps/admin/src` has no KYC module). |

⚠ **The control that would close this is architecturally committed and unbuilt.** `architecture.md:1748-1749`
promises *"Aadhaar HMAC hash retained for the 12-month rejoin lock (FR-6); **cross-attempts under same
Aadhaar fail attribution**"*. The column exists (`member_withdrawals.aadhaar_hmac`) and the table GRANTs
UPDATE specifically so it can be backfilled — **the only writer in the repo is a test.**

**Why the Panel is being told this before ruling.** Q6 is a trade: an exposure accepted in exchange for a
harm closed. This note originally priced the "harm closed" side at **all of ESCALATION 3**. The honest
price is **the fraction of terminated members who do not obtain a second mobile number** — unknown, and
plausibly not large. ⛔ **This is not an argument that the block is worthless.** A member who does not get a
second SIM is genuinely blocked, and no identity control can be built on top of an authentication gate that
does not exist. It is an argument that **the exposure and the benefit are closer in size than the original
table implied**, which is the Panel's judgement to make and not the author's to absorb silently.

| | Option | Consequence |
|---|---|---|
| **(a)** | **Ship now**, under a restated release gate. | Closes ESCALATION 3 **for the terminated account, not for the terminated person** (see the amendment above). ⛔ Requires the Panel to **expressly withdraw or restate** the `:156` release gate and accept a bounded window in which a terminated member has **no route at all** to their statutory rights. ⚠ **The amendment cuts hardest here:** this option pays a DPDPA exposure in full for a partial close. |
| **(b)** | ⭐ **Ship behind a default-OFF flag** — the Story 10.23 precedent (`2026-08-07-088` clause 4 / `2026-08-07-089`). | The mechanism lands built, tested and revert-proven; the flip becomes a **single auditable act the Panel itself authorises**. The release gate is honoured rather than withdrawn. ⚠ Costs the copy conditionality below, and **requires the sub-choice below on what the flip is gated on**. |
| **(c)** | **Hold.** The story lands as its **governance half only** (AC1, AC2, AC3, AC11). | Nothing ships that outruns 10.21. ⚠ Leaves ESCALATION 3 open with no date — though the amendment shows it would remain **partially open under (a) and (b) as well**, so "hold" forgoes less than it first appeared. AC4–AC10 recorded as ruled-deferred with this Q6 entry as their re-trigger. |

### ⚠ Sub-choice, live only under (b): what is the flip gated on?

Option (b) defers the decision to a later flip. **This note originally left unstated what that flip waits
for**, which is how an un-gated re-commitment decays (`[[feedback_record_unattested_no_backfill]]`). The
Panel is asked to name it:

| | The flip is authorised once… | Consequence |
|---|---|---|
| **(b-i)** ⭐ | **Story 10.21 lands** — the off-portal DPDPA route exists. | Honours the `:156` release gate exactly as the SCP wrote it. The identity gap stays open and is carried as a **known, recorded** limitation with its own owner. **Terminating a member means something enforceable, if incompletely.** |
| **(b-ii)** | **Story 10.21 lands AND the identity-collision control is built.** | The block means what the Niyamavali will say it means. ⚠ Gates the flip on a story that **does not exist and may not be buildable** — key stability at the DigiLocker boundary is unverified, and one legitimate outcome of that work is *"no stable key is obtainable."* This risks an indefinite hold wearing the clothes of a plan. |

**Recommendation on the sub-choice (non-binding): (b-i).** Do not gate an authentication fix on an identity
feature whose feasibility is unproven. ⚠ **But the Panel should rule (b-i) knowingly** — under it, the
Niyamavali will state that termination *"ends all membership privileges and authenticated member access"*
while the system enforces that against one account and not one person. **That gap must be recorded in AC11
as a ruled-upon limitation**, not discovered later by a reader comparing the instrument to the code.

### ⚠ The branch note — under (a) and (c), two ACs would write falsehoods

AC8 and AC9 both correct copy **whose truth value this story's block is what changes**:

- **AC8** strips *"You can sign in as usual and request a review from your membership status page"* from
  `moderation.notice.terminated.body` (`packages/i18n/locales/en/common.json:334` and `hi/common.json:334`
  — verified live). **If the block is held, that sentence is still true**, and removing it makes the notice
  wrong in both locales. *(The identical sentence in the **suspended** body at `:332` stays — suspension
  keeps login under every option here.)*
- **AC9** rewrites five sites to say *"suspension keeps login, termination does not."* **If the block is
  held, termination does still keep login**, and the sweep would replace five accurate comments with five
  inaccurate ones — the copy-truth defect class this story exists to close, inverted.

### ⚠ The cost of (b), stated plainly

Under a default-OFF flag the **shipped default is that termination still keeps login**. So:

- **AC7's test posture doubles.** `moderation-auth-effects.spec.ts:242` asserts `403` +
  `auth.member_terminated` **with the flag forced ON**, *and* a second test pins that with the flag **OFF**
  the member still logs in (`200`). ⛔ A test asserting `403` while the shipped flag defaults OFF is a
  **false green** — it proves the code path exists, not that termination ends access.
- **AC8's member-facing copy cannot be true in both flag states with one string.** Either the notice body
  becomes flag-conditional (two strings selected at fan-out), or the copy edit defers to the flip. **This
  is a real cost of (b) and the Panel should see it before choosing.** The author's reading: defer the copy
  edit to the flip and record it in AC11 as flag-gated — a notice is read once, at send time, and a
  conditional string is the smaller of the two evils only if the flip is genuinely near.

⛔ **Neither (a) nor (b) is a licence to sweep first and reconcile later.** Under (c) the sweep does not run
at all.

**Recommendation (non-binding): (b), with sub-choice (b-i).** It is the only option that neither withdraws
a gate the correct-course set nor leaves the harm open indefinitely, and it moves the decision to a single
auditable flip — the shape the Panel has already used once, on Story 10.23.

⚠ **The amendment did not change this recommendation, and the Panel should know why.** If anything it
**strengthens** (b) against (a): the weaker the block's real effect, the worse the trade in (a), which pays
a full DPDPA exposure up front for it. Against (c) the amendment cuts the other way and narrows the
margin — (c) now forgoes less than it appeared to. **The author's judgement remains (b)**, because a
partially-effective block is still the substrate every later identity control has to sit on, and because
(b) is the only option that lets the Panel see 10.21 land before anything takes effect. **A Panel that
weighs the corrected numbers differently and rules (c) would not be ruling against the evidence.**

---

## What non-answer would mean

Stated as a **governance consequence** per question, not as a prediction about implementer behaviour.

| Q | Feeds | If unruled |
|---|---|---|
| **Q1** | AC3 | ⛔ **The story halts.** A third deferral is not available — Decision `2026-08-10-096` clause 8 required this story to carry it as an AC precisely because a deferral is how it lapsed twice. Nothing enters `.decision-log.md`; a **BLOCK RECORD** is written instead, which is explicitly not a decision-log entry. |
| **Q2** | AC8 | Defaults to **(a)** — Summary is a first-class absent element, `{ available: false }`-shaped, until 10.20 lands. Recorded as a default taken, never as a ruling. |
| **Q3** | AC8 | Defaults to **NO**. The notice is in-app-only, and **AC11 records it as a ruled-upon reach limitation** with the `CostOptimizationInput` exemption field named as the re-trigger. ⚠ Failure direction: a member who cannot open the app receives nothing. |
| **Q4** | AC1 | Defaults to **(a) with the disclosure** — the full twelve rows, three of them flagged un-mechanized with named owners. No `APPENDIX A` entry; `niyamavali.md:196` unchanged. |
| **Q5** | AC1 | Defaults to **proceed on `080`/`096`**; counsel review recorded as **OWED**. No `[LEGAL]` line is written under any circumstance. |
| **Q6** | AC4–AC11 | ⛔ **The implementation half cannot begin.** The story lands as its governance half only (AC1, AC2, AC3, AC11) and AC4–AC10 are recorded as **ruled-deferred with this Q6 entry as their named re-trigger** — not "a later epic". ⚠ `:242` is left unchanged and still passing; the AC9 sweep does not run. ⚠ **If (b) is ruled without the sub-choice**, the flip is authorised with nothing named as its precondition — the un-gated re-commitment this note exists to avoid. Default sub-choice if (b) is ruled bare: **(b-i)**, recorded as a default taken. |

⚠ **The failure direction is NOT uniformly safe here, and that is why Q6 blocks.** In Story 10.18 every
non-blocking default granted no capability and imposed no sanction. Here, **Q6's default direction leaves a
live open harm open** — ESCALATION 3, a terminated member retaining authenticated access to the system —
while **the opposite direction opens a DPDPA gap**. There is no direction in which nothing happens. The
Panel is choosing which exposure to carry, and for how long.

⚠ **And per the amendment, no available direction closes ESCALATION 3 fully.** Under every option — ship,
flag, or hold — a terminated member who obtains a second mobile number re-enters as a new member, unlinked
to the old record. **That is true today, and this story does not change it.** The Panel is choosing how much
of the harm to close and what to pay for it, not whether to close it. ⛔ **No ruling here should be recorded
as having ended termination-evasion**, and the Decision entry must say so in terms — an overstated closure
is how a gap stops being looked at.

⚠ **A default taken must be recorded in the Decision entry as a default taken, never as a ruling.** A safe
default later read as a Panel decision is how convention hardens into apparent authority — the condition
Story 10.18 existed to end, one story ago.

---

## References

- `_bmad-output/implementation-artifacts/10-19-termination-ends-membership-privileges.md` — the story; AC1 (the amendment), AC2 (this note), AC3 (Q1), AC8 (Q2, Q3), AC4–AC10 (Q6), AC11 (what is not closed)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:531` — SCP §4d row 10, the §8.4 amendment text (D5); `:540-563` — the twelve-row §8.4a comparison table; `:156` — **Story 10.21 as "release gate on enabling termination"** (Q6); `:262-269` — Story 10.19's own SCP entry
- `.decision-log.md:37` — head, Decision **`2026-08-10-096`**; **clause 8** (Q1's second deposit), clause 3 (concurrency — cuts against a silent Panel-only restore), clause 5 (Q5's precedent), clause 10 (the `APPENDIX A` precedent), clause 11 (the four pre-existing Panel obligations, plus the fifth this opened)
- Decision **`2026-08-06-080`** — amended the Niyamavali on Panel attestation alone; the precedent Q5 turns on, and the `provisional`-flag precedent Q4 turns on
- Decision **`2026-08-07-088`** clause 4 / **`2026-08-07-089`** — the default-OFF flag with Panel-held activation authority; the shape Q6(b) proposes to reuse
- Decision **`2026-08-09-095`** — per-clause provenance, mandatory on any entry mixing ratification with author analysis
- Decision **`2026-08-04-072`** clause 3 — `architecture.md` is not amended
- `docs/legal/niyamavali.md:5` (unfilled version/effective/adoption placeholders), `:181` (**§8.4 as it stands today**, two clauses), `:196` (the reserved-numbers note — §8.5/§8.6/§8.8/§8.9, **not** §8.4a), `:184-194` (§8.7, landed by 10.18)
- `docs/legal/niyamavali.hi.md` — the co-equal Hindi instrument (`counsel-roster.md:32`, *"the Niyamavali is Hindi-primary"*)
- `docs/legal-counsel-engagement/` — every return field `<PENDING>`; Story 0.13 not closed (Q5)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:866` — FR-56 already carries the D5 sentence and **already cites §8.4a**, which does not yet exist
- `_bmad-output/implementation-artifacts/deferred-work.md:3593-3599` — Q8's second deposit, closed by Q1; `:3650` — the ten remaining Part 8 items routed to 10.19/10.20; `:3260` — Story 10.17's original deposit
- `packages/channels/src/cost-optimization.ts:125-138` (`CostOptimizationInput`), `:162-197` (`evaluateCostOptimization`, the four levers) — Q3
- `apps/jobs/src/scheduler/moderation-notify.ts:145-146` (`time_critical: false` and why), `:151` (`alert_category: 'alert_published'`), `:78-80` (the resolved reason **label**) — Q2, Q3
- `apps/jobs/src/scheduler/news-publish.ts:161`, `apps/jobs/src/scheduler/contribution-notify-triggers.ts:310` — the two other `alert_published` senders; why `windowMsByCategory` is not a local lever
- `packages/i18n/locales/en/common.json:334` + `hi/common.json:334` — the terminated body carrying *"You can sign in as usual…"*; `:332` — the suspended body, which keeps it — Q6
- `apps/api/tests/integration/member-moderation/moderation-auth-effects.spec.ts:242` — the pinning test asserting a terminated member **can** log in; `:1-23` — the header instructing the reader that blocking is *"WRONG (Decision 6)"* — Q6
- `apps/api/src/modules/member-moderation/handlers.ts:174-258` (`performAction`'s legality path — Q1's implementation point), `:226-230` (Decision-6 assertion site 1)
- `packages/domain/src/member/moderation/status.ts:47-48` — the `terminated --restore--> none` arm, **not removed** under Q1(a); `index.ts:22-25` — the `TERMINAL_STATES` prohibition
- `apps/api/src/config.ts:377` — `MEMBER_ACCESS_TTL_MS`, default 15 min; the bounded residual disclosed rather than routed
- `.gitignore:68` — `docs/legal/` untracked; why the Decision entry must quote both sections verbatim in both locales

**Added by the 2026-08-10 amendment (Q6):**

- `_bmad-output/implementation-artifacts/deferred-work.md` — *"identity collision at signup is unenforced"*; the full trace, the three constraints on any fix, and the re-trigger
- `_bmad-output/planning-artifacts/architecture.md:1748-1749` — the committed-but-unbuilt Aadhaar-HMAC rejoin key: *"cross-attempts under same Aadhaar fail attribution"*
- `apps/api/src/modules/auth/member/member-auth.repo.ts:82` — `resolveMembersByMobile`, keyed on `mobile_blind_index` alone
- `apps/api/src/modules/auth/member/signup.handlers.ts:119` — the rejoin guard, keyed on `terminated` and scoped to `priorInThisPariwar`
- `apps/api/src/modules/kyc/providers/digilocker/mapper.ts:79-89` — where the Aadhaar reference is read and masked to last-4; the only boundary at which a stable key could be captured
- `packages/domain/src/schema/member_withdrawals.ts:30-34`, `:75` — the `aadhaar_hmac` seam column and its own account of why it is empty
- `packages/domain/migrations/0024_member-kyc-profiles.sql:33`, `:36` — `aadhaar_masked_id` with no unique constraint; `trustee_verified` defaulting false, never written true
- `apps/api/src/modules/kyc/kyc.handlers.ts:416` — the manual path writing `trusteeVerified: false`, with no reviewer surface anywhere in `apps/admin/src`
