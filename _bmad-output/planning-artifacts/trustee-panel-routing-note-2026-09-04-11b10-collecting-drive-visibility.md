# Trustee Panel routing note — 2026-09-04
## A drive that is **still collecting** does not appear on the public list. ⛔ Nobody ruled that — and the written requirement says the opposite.

**Author:** BigDev, Solo Builder — 2026-09-04
**Occasion:** BigDev read this project's own Trustee-facing material, saw the sentence *"a drive still
asking for money is a solicitation"*, and asked **who had decided that.** ⭐ The answer is that ⛔ nobody
did. This note exists because the question was asked.
**Routed to:** Trustee Panel.
**Status:** ⏳ **OPEN — awaiting the Panel.** Logged as `.decision-log.md#decision-2026-09-04-187`
(author-committed **provenance correction**; the substantive question is this note's).
⚠⛔ **ANSWER THIS TOGETHER WITH `…-listed-drive-discoverability.md`** — they interlock (§6).

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end and is **complete on its own**. ⭐ You can answer this note from Appendix A alone.

> ⭐⛔ **THE HEADLINE.** The public drive list shows only **finished** drives. A drive that is
> **currently collecting** — the one where members are actively rallying to help a family — is
> ⛔ **not on it at all.**
>
> ⚠⛔ **We have been describing that as settled policy. It is not.** ⛔ No decision of yours rules
> `live` drives in or out. The justification everyone has been citing is a **comment in the source
> code**, written while the feature was being built, which asserts its own authority.
>
> ⛔⛔ **AND THE WRITTEN REQUIREMENT SAYS THE OPPOSITE.** **FR-76** reads: *"Sahyog Drive — Active +
> Archive. **Active page near-real-time during live alert.**"* ⇒ that only means something if the page
> shows a drive **while it is running**. It was ⛔ never built, and FR-76 is cited in **⛔ ZERO**
> implementation records.

---

## 1. What is being asked

**(Q1) — SHOULD A COLLECTING DRIVE APPEAR ON THE PUBLIC LIST?** FR-76 says yes. The code says no.
⛔ Only you can settle it.

**(Q2) — IF YES, SHOWING WHAT?** A progress meter is the obvious content, and it comes in two strengths:
**how many members have contributed** (a count — already public elsewhere), or **how much has been
raised** (a rupee figure — ⛔ no public page carries one today). ⚠ These are different asks; see §5.

**(Q3) — WHAT WOULD THE LABELS BE?** Today the public sees two words for three states, and one of them
is actively misleading (§4). Three states cannot share two labels.

## 2. ⛔ Where the current behaviour actually came from — the full provenance

`/sahyog` lists `closed` + `settled`. `live` is absent. Three sources, ⛔ none of them a ruling:

| # | Source | Weight |
|---|---|---|
| 1 | **Story 11b.1's AC** (`epics.md:4865`): *"Active drive shows currently-live pools **(closed but not yet settled)**"* | A **planning artifact**. ⭐ The implementation followed this parenthetical — the most specific of the three statements, and a **defensible reading**. |
| 2 | **The code comment** (`public-read.ts:84-89`): *"a drive still collecting is not a transparency record, **it is an open solicitation** … widening this tuple is a **ruling change**"* | ⛔ **Author-added prose.** The phrase appears in ⛔ NO planning artifact, ⛔ NO PRD clause and ⛔ NO decision. It **asserts** its own authority. |
| 3 | **`.decision-log.md`**, `-184` References | ⛔ Cites the comment as *"the recorded reason"*. ⛔ A citation, ⛔ not a ratification. |

⇒ ⭐ **This is ⛔ not somebody going rogue.** It is a specific instruction in an epic being followed
faithfully. **What ⛔ never happened is the reconciliation** — because the same document says two other
things:

- **FR-76** (`epics.md:155`): *"Active page **near-real-time during live alert**."*
- **Story 11b.1's own statement** (`epics.md:~4860`): *"showing **currently-live** and historical pools."*

⛔ Both point the other way. ⛔ Nobody noticed the contradiction, and the parenthetical won by being
the most specific line rather than by being decided.

⚠ **It was half-noticed once.** Story 11b.1's review found the page headline claiming *"Every drive
this trust has run"* over a predicate that excludes collecting drives. ⇒ the **headline was reworded**;
⛔ the predicate was never questioned.

## 3. ⛔ FR-76 is live, unbuilt, and un-superseded — verified

- **⛔ ZERO** files under `_bmad-output/implementation-artifacts/` cite `FR-76` — ⚠ including **Story
  11b.1 itself**, the story that built this surface.
- **⛔ ZERO** decision-log entries mention it.
- `sprint-change-proposal-2026-08-23.md:99` records that *"**FR-76** / FR-77 / FR-78 **survive intact**
  under every disposition."*

⇒ it is a **standing requirement that was not implemented**, ⛔ not one that was consciously dropped.

## 4. ⚠ The label collision, which makes this worse than a missing feature

The public vocabulary maps the internal state `closed` → the word **"Active"** (`public-read.ts:81-82`).

⇒ **"Active" on the public site means the drive has FINISHED collecting.** A visitor who reads
"Active" and assumes money is still being gathered has been misled by our own vocabulary. And FR-76's
*"Active page … during live alert"* means a **different thing** from the shipped "Active".

⛔ If collecting drives join the list, the labels must be re-decided — three states, two words.

## 5. ⭐⭐ A component already exists for this, was ruled, and has nowhere to land

`packages/ui/src/pool-progress/` is the **single canonical producer** of a drive's progress meter —
*"amount raised" = confirmed contributors × the fixed amount* — ruled at Story **9.12 (Decision 3)**.
Its own header names its intended next consumers in terms:

> *"the Epic-11b public **Sahyog Vivran / Sahyog Drive**"* — `view-model.ts:3`

⇒ the meter was built expecting to appear on this surface. ⚠ It is meaningful ⛔ only while a drive is
**collecting**, which is the one state the list excludes. **It has been sitting unused.**

⚠⛔ **TWO EXISTING CONSTRAINTS BEAR ON IT, AND THEY ARE YOURS TO WEIGH, ⛔ not ours:**

- ⭐ **The *"remembrance, not analytics"* invariant** (Story 11b.1, *"this story's load-bearing
  commitment, per user direction"*) prohibits **leaderboards, rankings, gamification, social-performance
  and popularity metrics**. ⇒ a **per-drive progress meter is ⛔ none of those** — it ranks nobody and
  names nobody. ⭐ On a plain reading it is permitted.
- ⚠⛔ **Pool-Reality #2** (Story 7.8, carried into 11b.1's AC) says the framing must *"celebrate
  solidarity, ⛔ not shortfall"* with **⛔ no comparison-to-target framing in any aggregate.**
  ⇒ a meter reading ***"412 of 500"* IS comparison-to-target framing.** ⛔ This is the real tension in
  Q2, and it is ⛔ not for us to resolve. ⭐ A count with no denominator (*"412 members have
  contributed"*) would sit inside Pool-Reality #2; a **bar against a target** would ⛔ not, as written.

## 6. ⚠⛔ This note INTERLOCKS with the other open one — please answer them together

`trustee-panel-routing-note-2026-09-04-11b3a…listed-drive-discoverability.md` records a proven fact:
**publishing a link to a page publishes that page's address.** Today that only bites finished drives,
because collecting drives have ⛔ no published link — which is exactly why we told you the unguessable
address *"works completely"* for them.

⇒ ⛔⛔ **IF YOU ANSWER Q1 "YES", THAT PROTECTION ENDS FOR EVERY DRIVE.** A listed collecting drive is a
linked collecting drive, and its address becomes public like any other. ⚠ That is ⛔ not an argument
against listing them — it is a consequence that must be **decided with the decision**, ⛔ not
discovered afterwards.

## 7. ⛔ What this note does not do

⛔ It does **not** propose listing collecting drives — it asks. · ⛔ It does **not** reverse, supersede
or vacate any ratified decision. · ⛔ It does **not** touch the rate limit, the masking default, or the
bank-detail fields. · ⛔ It changes **nothing** until you answer: nothing is published by this note.

---

# Appendix A — In plain words

## What is happening today

The public "drive list" on the website shows only drives that have **finished** collecting.

A drive that is **running right now** — where members are actively contributing to help a family who
has just lost someone — **does not appear on that page at all.**

## Who decided that?

**Nobody did.** That is why this note exists.

We had been describing it to you as a settled rule, with a reason attached: *"a drive still asking for
money is a solicitation, not a public record."* ⚠ **That sentence is not yours, and it is not in any
plan or decision.** It is a note somebody wrote inside the source code while building the feature. It
reads as though it were a rule, and everything written since — including material we prepared for you
this week — has repeated it as though you had agreed it.

⛔ **You had not been asked.** We are asking now.

## And the written requirement says the opposite

The trust's own requirement for this page (**FR-76**) reads:

> *"Sahyog Drive — Active + Archive. **Active page near-real-time during live alert.**"*

A page that updates *"near-real-time"* while a drive is *"live"* only makes sense if it is showing a
drive **while that drive is running**. That was never built, and no record of the work refers to this
requirement at all. It was not rejected — it was **overlooked**.

What happened instead is that a more detailed line elsewhere in the same document said the "Active"
page should show drives that had *already closed*. The builder followed that line. It was a reasonable
reading. ⚠ **Nobody noticed the two lines disagreed.**

## ⚠ A word that is currently misleading people

On the site today, a drive marked **"Active"** has **finished** collecting money.

So a visitor who sees "Active" and assumes members are still contributing is being misled — by our
choice of word, not by anything you decided. If collecting drives are added to the page, this has to
be fixed anyway: there would be three kinds of drive and only two words.

## ⭐ Why this may matter more than a missing page

A drive in progress is the clearest thing this trust can show anyone: *"a family lost someone last
week, and 412 members have already stepped in."*

That is the trust working, visible, in the present tense. A page of finished drives shows only that it
**worked** — in the past, to people who already know what to look for.

⭐ A progress display for exactly this was **already built** and approved for use, and its own notes say
it was meant for this page. ⚠ **It has never been used, because the one page it was built for excludes
the only kind of drive it can describe.**

## ⚠ One genuine complication, which is yours to weigh

You have a standing principle that these pages *"celebrate solidarity, not shortfall"* — and
specifically that nothing should be framed as **progress towards a target**.

A bar reading **"412 of 500"** is exactly that framing. Saying **"412 members have contributed"**,
with no target, is not.

⇒ so Q2 is genuinely two questions: **may a running drive be shown at all**, and if so, **may it show a
target**, or only a count? ⛔ We have deliberately not answered either.

## ⚠ And one consequence you should decide with it, not after

The other note in front of you explains that **publishing a link to a page publishes that page's
address**. Right now, running drives are the one case where that does not bite — precisely because
nothing links to them.

⇒ **If you say yes to listing them, that protection goes away for every drive.** That is not a reason
to say no. It is a reason to answer both notes in one sitting.

## What we are asking

1. **Should a drive that is currently collecting appear on the public list?**
   *Our view, offered as a view:* FR-76 says yes, the component for it is already built and approved,
   and it is the most persuasive thing the trust can show. But it is your call, and the reason it has
   never been put to you is an oversight we are correcting.
2. **If yes — a plain count of contributors, or a progress bar against a target?** The second sits
   awkwardly with your "not shortfall" principle.
3. **If yes — should the money figure be shown, or only the number of members?** ⛔ No public page
   carries a rupee figure today.
4. **What should the three states be called?** "Active" currently means *finished*, which will confuse
   people whatever you decide.

## What happens either way

⛔ Nothing is published by this note. ⛔ No page changes until you answer. Adding collecting drives is
a modest piece of work; the progress display already exists. ⛔ We have not built any of it, and will
not until you have ruled.
