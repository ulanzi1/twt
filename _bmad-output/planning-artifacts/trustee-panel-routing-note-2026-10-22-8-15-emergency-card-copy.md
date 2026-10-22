# Trustee Panel routing note — what the member's card says about an emergency change to the contribution

> **§0 gate — author's view: the Panel's. ⏳ Awaiting BigDev's §0 check.** Stripped of citations, the question is
> *"should a member be told, on their own card, that the trustees changed the amount they pay without the usual
> notice?"* That is what the Trust **tells a member** about what they are asked to pay, and it turns on how to read
> one sentence of a ratified ruling. If BigDev rules it is the author's instead, this note is not sent and the
> ruling is recorded in Story 8.15's Decisions section.
> From Story 8.15 (`8-15-fixed-amount-transition-staged-card`), Task 0 / PQ1.
> ⚠ **WRITTEN 2026-10-22 — ⛔ NOT sent.** ⛔ Not "shown to the Panel" until BigDev sends it
> ([[feedback_shown_to_panel_means_sent]]).
> ✅ **Answered 2026-10-22 — option B** (Decision `2026-10-22-383`). The §0 gate passed: BigDev put the question to the
> Panel. The two lines above are kept as written.

---

> ## ✅ RULED 2026-10-22 — OPTION B ([Decision 2026-10-22-383](../../.decision-log.md#decision-2026-10-22-383))
>
> **Ratifying trustees:** Dhiraj Rahul, Kalpana Bharti, relayed by BigDev: *"by DR and KB"* / *"go with option B."*
> (two lines, as sent).
> ⭐ **Facts only, never a warning.** For an emergency change the card states the date when it is set ahead, *"from
> the next cycle"* when it lands inside an open pool, and the note on the first pool at the new amount. ⛔ Never
> *"from next month"*.
> **Not covered:** the card's words (Story 8.15 AC6 tone review); whether the "no stages" sentence is itself ratified
> wording; the stages for standard changes; any other channel.
> ⚠ This note was uncommitted when the ruling arrived; whether the trustees saw it in full or a summary of it is not
> recorded. ⭐ Everything below is kept **unedited** as the question **as it was put**
> ([[feedback_supersede_never_reinterpret]]).

---

# The question

**In one sentence:** when the trustees change the contribution in an **emergency** (without the usual 90 days'
notice), should the member's My Pool card say anything about it — the date it changes, that it changes from the
next cycle, or a short note on the first pool at the new amount — or nothing at all?

**Why it cannot be decided without you:** when you set the 90-day notice, the ruling said the card's step-by-step
warnings are guaranteed for normal changes, and added that *"an emergency adjustment still has no stages, because it
has no notice."* That sentence can be read two ways — "say nothing about an emergency" or "don't pretend there was a
warning, but do state the facts" — and choosing between two readings of your words is yours, not ours.

## The one fact that decides it

⭐ **An emergency change can reach a member in three ways, and today the card handles none of them deliberately:**

1. **Dated ahead.** Trustees may set an emergency change for a date a few weeks away. Today the card already shows
   *"From [date], the contribution becomes ₹[amount]"* for it — the same line it shows for a normal change, by
   accident rather than by design.
2. **Taking effect while a pool is open.** The open pool keeps the old amount (correct), and today the line simply
   disappears — the member gets no word until the next pool asks for a different amount.
3. **The first pool after it.** The member is asked for a new amount with no explanation on the card.

So "say nothing" is not today's behaviour: it would **remove** the line members already see in case 1.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Nothing at all** for an emergency change | The card never mentions an emergency change. The member learns of it when the next pool asks for a different amount, unless the trustees post a news item. | A member meets a changed amount at the moment they pay, with no word on the card — the surprise the step-by-step card exists to prevent. Removes the dated line members see today for an emergency set ahead. |
| **B** | **Facts only, never a warning** | Case 1: the date and the new amount. Case 2: *"from the next cycle"* and the new amount. Case 3: a short note that the new amount starts with this pool. ⛔ Never *"from next month"*, which would suggest notice was given. | The card does speak about a change made without notice. Its words must be checked so they never sound like advance warning (a human tone review is already required). In one rare case (an emergency dated back to before a pool was opened), the case-3 note could compare against the wrong earlier amount; we would guard against it, and we record it. |
| **C** | **Only the after-the-fact note** | Cases 1 and 2: nothing. Case 3: the short note that the new amount starts with this pool. | Strictest about "no advance word", but a member whose emergency change was set weeks ahead hears nothing until they are already paying it, though the date was known. Removes today's dated line in case 1. |

**Our reading:** **B** — **because** the card's whole purpose is that a changed amount never surprises a member at the
moment they pay, and B's words state only things that are already true (a date set, an amount changed). It never
claims a warning that wasn't given, which is what "no stages, because it has no notice" protects against. You may
reject this reading and still use the table: A and C are both buildable as written.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, and no emergency change has been made.
- **Blocked:** only the emergency part of Story 8.15. The step-by-step card for **normal** changes is being built now.
  The story cannot be finished, and ships no emergency behaviour, until you rule.
- **If nothing is decided:** Story 8.15 stays unfinished and the card keeps today's accidental behaviour: the dated
  line in case 1, silence in cases 2 and 3.

---

# How much to trust this note

- **Earlier versions of this question:** none put to the Panel. The question was first written into Story 8.15 on
  2026-10-22 with **two** cases.
- **Corrected in this note:** checking the story against the code found a **third** case (case 2: a change taking
  effect while a pool is open), so it is included here. The same check found that the case-3 note needs a guard
  against an emergency dated back before a pool was opened; that guard is part of option B's cost above.
- **Still uncertain:** whether the sentence *"an emergency adjustment still has no stages"* is itself your ruling or
  our explanation of it. It sits in the body of the clause you ratified, but that clause's record of what you
  ratified names only the guarantee for normal changes (E2). Either way, its meaning is yours to settle.

---

# In plain English

When the Trust changes the contribution in the normal way, it gives at least 90 days' notice, and the member's card
says so calmly, step by step: the date first, then "from next month", then a short note on the first pool at the new
amount. An emergency change skips the notice — that is its purpose — so the card cannot honestly do the "step by step"
part. The question is whether it should still state the plain facts (the date, or that this pool is the first at the
new amount), or stay silent. We suggest stating the facts and never pretending there was a warning: a member who is
asked for a different amount should be able to see why on their own card. Staying silent is also safe to build, but it
means the member finds out at the moment of paying. If this summary and the evidence below ever disagree, the evidence
is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> **Decision `2026-08-16-124`, clause 2** (body): *"The four-stage card pattern is restored as a **policy guarantee**
> for every conforming standard change, rather than surviving as a **practice expectation nothing enforces** … ⛔ **It
> is not built here.** … ⛔ **An emergency adjustment still has no stages**, because it has no notice. That is the point
> of it."*

> **Decision `2026-08-16-124`, per-clause provenance, clause 2:** *"2 — Q6: the UX-DR25 four-stage member-card pattern
> is thereby **restored as a policy guarantee**, not a practice expectation | **[Trustee-ratified]** — the stated
> ground of option (d)"*

> **Decision `2026-08-16-124`, clause 3** — Niyamavali §4.2 (EN), as amended: *"Each open Pool invites a **fixed
> per-Pool contribution of ₹[[310]] (range ₹[[310–400]])**, set by the Board and changed on **not less than 90 days'
> notice**, save under a recorded emergency adjustment."*

> **Decision `2026-08-16-124`, clause 8:** *"the emergency mechanism remains, with no floor of its own … ⛔
> `applyEmergencyOverride` keeps **no notice floor at all**"*

> **Decision `2026-08-16-125`, clause 2:** *"⇒ **An emergency superseding a pending future standard change remains
> legal.** An emergency reaching behind the amount actually in force does not."*

> **Decision `2026-08-16-125`, clause 3:** *"choosing between two readings of ratified words is not a developer's call"*

## E2 — What is NOT ratified

- **What the card says about an emergency.** No clause rules on it. Clause 2's "no stages" sentence is in the clause
  body, but the provenance row records only the four-stage guarantee for standard changes as `[Trustee-ratified]`.
- **Case 2 (an emergency taking effect inside an open pool's window).** It is named by no ruling, story or spec.
- The UX spec's 2026-08-16 note (*"⛔ An **emergency** adjustment has no stages at all, because it has no notice"*)
  and `deferred-work.md`'s 7.11 entry (*"must not imply a warning the emergency path cannot give"*) are **author
  records**, not rulings.

## E3 — What the code actually does

- `resolveUpcomingFixedAmountChange` (`packages/domain/src/pool/fixed-amount.ts`) returns the nearest future
  schedule row **without regard to `change_type`**, and the card (`ActiveContributionCard.tsx`) renders one un-staged
  dated line for it. ⇒ A future-dated emergency is shown today (case 1). Verified by reading the WHERE clause.
- `applyEmergencyOverride` enforces only a **lower** bound on `effective_from` (the amount in force), so a
  **future-dated** emergency is accepted. Verified: no upper bound and no notice check in the function.
- The upcoming read is taken at the request instant, so a change whose date falls inside an open pool's window stops
  being "upcoming" and the line disappears (case 2). Story 8.15 Trap 4.
- Nothing on the card explains a pool whose amount differs from the previous one (case 3).
- Inference (labelled): in the rare backdated-emergency case, the case-3 "previous amount" is read from the schedule,
  not from the member's last pool, and can differ. Story 8.15 D5 records this as a known residue under option B.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision .*-124\b' .decision-log.md
grep -n '^### Decision .*-125\b' .decision-log.md
grep -n 'An emergency adjustment still has no stages' .decision-log.md
grep -n 'restored as a policy guarantee\*\*, not a practice expectation' .decision-log.md
grep -n 'An emergency superseding a pending future standard change remains' .decision-log.md
grep -n 'choosing between two readings of ratified words' .decision-log.md
sed -n '/export async function resolveUpcomingFixedAmountChange/,/^}/p' packages/domain/src/pool/fixed-amount.ts
sed -n '/export async function applyEmergencyOverride/,/meetsEmergencyBackdatingFloor/p' packages/domain/src/pool/fixed-amount.ts
grep -n 'upcomingAmountChange' apps/mobile/components/active-contribution/ActiveContributionCard.tsx
grep -n 'emergency' _bmad-output/planning-artifacts/ux-design-specification.md
```
