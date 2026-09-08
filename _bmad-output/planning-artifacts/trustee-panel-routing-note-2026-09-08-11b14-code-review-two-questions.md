# Trustee Panel routing note — 2026-09-08

> ## ✅ PANEL RULING — recorded 2026-09-08 (Dhiraj Rahul + Kalpana Bharti)
>
> **Q1 → Option A.** `confirmedPercentage` leaves the public wire for `closed` and `verified` rows —
> it becomes a **Live-row datum** end to end (contract nullable, read path stage-gated). The
> Chunk-A matrix text (*"LIVE rows only; `null` on Closed and Verified"*) is the ruling; ⛔ Option B
> (amend the text) is not taken. The Live-row `82%` and its accepted recoverability are undisturbed.
>
> **Q2 → Option B.** A `closed` / `verified` drive with `amountRaisedInr === 0` renders **no
> `index_line.*` sentence** — silence, the same posture `2026-09-07-205` cl.6 already rules for this
> sentence. ⛔ Option A (a bespoke zero-state pair) is declined; ⛔ Option C (*"₹ 0 contributed…"*
> acceptable) is declined.
>
> Recorded as **Decision `2026-09-08-207`** (cl.1 = Q1, cl.2 = Q2). Both become patches on the
> Story 11b.14 branch. The sections below are the escalation as it was put to the Panel.

---

## Story 11b.14 (**Story D** — live drives on the public index) had a **second code review** (2026-09-08), in two halves — the data/logic layer and the public/API surface. Eighteen findings were fixed in place. **Two** we will ⛔ not answer for you.

**(1)** The progress-bar percentage you ruled onto the page (`confirmedCount ÷ assignedCount`) is
returned on the **JSON API** for **Closed and Verified** rows, ⛔ not only Live ones. On the same row
sits the confirmed-contributor count. ⇒ dividing one by the other recovers the **pool's roster size**
for **every archived drive**, by hitting the JSON route directly. The Chunk-A matrix text this branch
also ships says the percentage is *"⛔ LIVE rows only; `null` on Closed and Verified"* — the wire does
⛔ not do that. **Gate the wire, or amend the text.**

**(2)** A drive that **closed having raised ₹0** — assignees were named, ⛔ nobody confirmed a
contribution before close — renders, on the public index, beside two **named private individuals**:

> **"₹ 0 contributed by colleagues for [nominee name], nominee of Late [family name], who served in
> [district] district."**

The **live** analogue of this — *"₹ 0 and counting, by 0 colleagues—and still going strong!"* — you
replaced on 2026-09-07 with a bespoke pair (`2026-09-07-206` cl.4). The **Closed / Verified**
analogue has ⛔ no such substitution. **The dev agent may ⛔ not mint the copy.**

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE — ⭐ the same discipline as the 2026-09-07 notes.**
> Every factual claim below is either (a) **verbatim ratified text** from `.decision-log.md`, a prior
> routing note, or a shipped locale string, or (b) **verified repository state** — a file's contents
> at a named line, or a function whose output we computed by hand from its shipped source. ⛔ We have
> ⛔ not rested any part of this escalation on a code comment or a story file's prose. §6 lists every
> path so each claim can be re-opened and checked. Where something is an **inference** it is labelled
> **INFERENCE**.

> ⭐⭐ **AND THE ONE THING TO KNOW FIRST.** ⛔ **Neither of these is a defect in what you ruled.**
> **Q1** is a place where a ruling (`2026-09-07-204` cl.1 — the meter measures contributors) was
> correct for the case in front of it and the wire then carried the figure further than the ruling's
> *render* intent. **Q2** is a state — a fully-unfunded closed drive — that ⛔ no ruling has
> addressed, and that your 2026-09-07 zero-state ruling covered only for Live rows. ⇒ ⭐ we are asking
> you to **extend**, ⛔ not to reconsider.

---

## 1. What is being asked, precisely

| # | Question | What is blocked / at risk |
|---|---|---|
| **Q1** | Must `confirmedPercentage` be **absent / null on the JSON wire** for Closed and Verified rows — or is it acceptable that an archived drive's roster size is recoverable from the public JSON route? | ⛔ Nothing ships differently in the **rendered page** either way (the render layer already blanks it off-Live). ⚠ But the figure **is on the public API today**, for every archived drive on the branch. |
| **Q2** | What does a **Closed / Verified** drive that raised **₹0** render on the index — a bespoke sentence, silence, or the current *"₹ 0 contributed…"*? | ⚠ Reachable and contract-valid. A drive can close with assignees named and ⛔ no confirmed contribution; today it prints *"₹ 0 contributed by colleagues for [named nominee]…"* on a public page. |

⭐ **Q2 is the one we would most like answered** — it puts a **₹ 0** figure beside a **named** nominee
and a **named** deceased member on a public surface, which is the exact shape the Live zero-state
ruling exists to prevent.

---

## 2. What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-07-204` **cl.1** (the meter measures people)

> 1. ⭐⭐ **THE PROGRESS BAR MEASURES CONTRIBUTORS, ⛔ NOT RUPEES.** The Panel, verbatim: *"Progress
>    bar should show the % of contributor already contributed in that pool."* ⇒ the fill is
>    `confirmedContributionCount ÷ assignedCount`, a whole percent, computed server-side. This
>    **supersedes** `2026-09-04-191` cl.4 (*"the progress bar fills against a **rupee** target"*).

### 2.2 Verbatim — the Chunk-A matrix description this branch ships

`packages/contracts/public-pages/public-vs-private-matrix.yaml`, field `drive_progress_percentage`
(added this story, amended by the 2026-09-08 review for a *different* reason — the `82%` text):

> ⭐⛔ **THE DENOMINATOR ITSELF NEVER CROSSES THE WIRE** — `assignedCount` is not a field on this
> surface, under any name. ⚠ RECORDED, ⛔ not glossed: the confirmed count is on the same row, so the
> assignee count is recoverable by division. That is INHERENT to the ruled meter, and it is precisely
> what closed the arithmetic channel that used to recover the hidden rupee target — the division now
> returns a headcount.
>
> ⛔ **LIVE rows only; `null` on Closed and Verified.** ⛔ NOTHING ORDERS BY IT (AC5).

⇒ the matrix says two things: (a) roster-size recovery **for the meter** is accepted (it "returns a
headcount", ⛔ not the old hidden rupee target); (b) the field itself is **null on Closed and
Verified**. The wire honours neither (a)'s *scope* nor (b).

### 2.3 Verbatim — `2026-09-07-206` **cl.4** (the Live zero-state pair)

From the shipped `sahyog-shared` `$comment.zero_line` (English), which quotes the ruling:

> ⭐⭐ TRUSTEE-RATIFIED (Dhiraj Rahul + Kalpana Bharti, 2026-09-07) — the Panel GAVE this wording, in
> BOTH languages, when the code review showed them what a drive renders on its FIRST DAY. Recorded at
> `2026-09-07-206` cl.4. ⛔ It is the LIVE-ROW sentence for a drive with ZERO confirmed contributions,
> rendered INSTEAD of `live_line` — which at zero reads *"₹ 0 and counting, by 0 colleagues—and still
> going strong!"*, the ordinary state on day one of every drive.

Shipped strings:

> `zero_line.full` (en): *"Late {family_name}'s family awaits your support."*
> `zero_line.no_family` (en): *"Family awaits your support."*
> `zero_line.full` (hi): *"स्व० {family_name} का परिवार आपके सहयोग की प्रतीक्षा कर रहा है।"*
> `zero_line.no_family` (hi): *"परिवार आपके सहयोग की प्रतीक्षा कर रहा है।"*

### 2.4 Verbatim — `2026-09-07-205` **cl.6** (silence where ⛔ no ratified variant fits)

The index-line selector returns **nothing** — ⛔ no placeholder, ⛔ no partial sentence, ⛔ no marker —
for a row where ⛔ no `index_line.*` variant's tokens are all present (nominee absent together with
family, or with district). ⇒ **silence is already a ruled outcome on this exact sentence**, for a
*different* trigger.

### 2.5 What was ⛔ NOT ratified

- ⛔ **No ruling** states whether `confirmedPercentage` crosses the API wire on non-Live rows. The
  story's AC2 prose says *"AC2 ships a server-computed `confirmedPercentage` on the public wire"* with
  ⛔ no stage qualifier; the Chunk-A matrix text says *"null on Closed and Verified"*. These are our
  words, ⛔ not yours — hence this question.
- ⛔ **No ruling** addresses a Closed / Verified drive that raised ₹0. `2026-09-07-206` cl.4 is scoped,
  verbatim, to *"the LIVE-ROW sentence for a drive with ZERO confirmed contributions"*.

---

## 3. Q1 — `confirmedPercentage` on the JSON wire for Closed and Verified rows

### 3.1 The fact, at three named sites

| Layer | File · line | What it does |
|---|---|---|
| Contract | `packages/contracts/src/public-pages/sahyog-drive.ts:245` | `confirmedPercentage: z.number().int().min(0).max(100)` — **non-nullable, required on every row** |
| Domain read | `packages/domain/src/pool/public-read.ts:1041` | `confirmedPercentage: driveConfirmedPercentage(confirmedContributionCount, assignedCount)` — **computed unconditionally**, every status |
| API handler | `apps/api/src/modules/public-pages/handlers.ts:465` | `confirmedPercentage: row.confirmedPercentage` — in `base`, **spread onto every row** |
| Render layer | `apps/public/src/lib/sahyog-render.ts:433` | `driveProgressPercentage: row.status === 'live' ? row.confirmedPercentage : null` — **blanked off-Live for display only** |

⇒ the **rendered HTML** is fine. The **JSON API response** carries, for a Closed or Verified drive,
both `confirmedContributionCount` and `confirmedPercentage`.

### 3.2 The recovery

For any archived-drive row on the public JSON route:

> `assignedCount ≈ round( confirmedContributionCount / confirmedPercentage × 100 )`

`assignedCount` is the **pool's roster size** — the number of members assigned to contribute to that
drive. It is a count of a collection; it names ⛔ no individual. But `2.2` says it *"never crosses the
wire… under any name"*, and the render layer's own comment (`sahyog-render.ts:428-433`) says a closed
row *"must carry ⛔ no fill… even if a future template rendered the meter column somewhere it should
not"* — i.e. the team's build intent is that the percentage is a **Live-row datum**, and the wire is
the gap.

### 3.3 Why this is not `2026-09-07-204` cl.1 being wrong

cl.1 made the meter measure **contributors**, which is what put a headcount (not the old hidden rupee
target) at the end of the division. For **Live** rows the matrix accepts that recovery outright. The
open question is only whether the same figure should reach the wire for **Closed and Verified** rows,
where the matrix text says `null` and the render says `null` but the contract says *"always present"*.

### 3.4 Options

| | Option | Cost |
|---|---|---|
| **A** | **Gate the wire to Live-only.** Contract → `confirmedPercentage: z.number().int().min(0).max(100).nullable()`; domain read gates it (`currentState === 'live' ? … : null`, the exact shape `driveTargetInr` already uses at `public-read.ts:1052`); render layer simplifies. | Touches contract + domain + handler + the `sahyog.server.ts` validator + several tests that currently assert `confirmedPercentage` present on a closed row. Matches `2.2`. |
| **B** | **Accept always-present; amend the matrix text.** Strike *"LIVE rows only; `null` on Closed and Verified"* from the `drive_progress_percentage` description; record that the roster-size recovery is accepted on archived rows as it already is on Live rows. | One-line doc change. Leaves the recovery live on the JSON route for every archived drive. |
| **C** | **Quantise / band the archived percentage** (e.g. nearest 5%) so the division no longer resolves to an exact roster size, keeping the figure for a rough archived bar. | New behaviour; a third rounding rule on this surface; the bar's meaning drifts between stages. |

⭐ Our read: **A** is the smaller *semantic* change (it makes the wire match the render and the
matrix); **B** is the smaller *diff*. Neither ships differently in the page.

---

## 4. Q2 — a Closed / Verified drive that raised ₹0

### 4.1 The fact

`apps/public/src/lib/sahyog-render.ts:443-470`:

- **Live** rows branch on the count: `row.confirmedContributionCount === 0 ? labels.zeroLine(…) :
  labels.participationLine(…)`. The comment, verbatim: *"a zero amount with a nonzero count is a
  state this surface does ⛔ not model"* — the branch is deliberately on the **count**.
- **Closed / Verified** rows call `labels.indexLine({ amountInr: row.amountRaisedInr, nomineeName,
  familyName, districtName })` with **⛔ no count-zero branch**.

`selectIndexLineVariant` picks a variant on **token presence**, ⛔ not on amount. With nominee, family
and district all present it returns `index_line.full`:

> `"{amount} contributed by colleagues for {nominee_name}, nominee of Late {family_name}, who served
> in {district_name} district."`

`formatSahyogLiveAmount(0, locale, 'closed')` (`sahyog-render.ts:638-645`): `stage === 'live'` is
false ⇒ `formatCurrency(0, 'en')` ⇒ `"₹ 0"`.

⇒ **rendered, verbatim:**

> **"₹ 0 contributed by colleagues for Sunita Devi Sharma, nominee of Late Rajesh Kumar Sharma, who
> served in Lucknow district."**

### 4.2 Reachability

**INFERENCE (from shipped classifier code, ⛔ not executed against live data):** a drive whose pool
had assignees (`assignedCount > 0`) but ⛔ no confirmed contribution reaches `close` as a valid row —
`fundingOutcome` classifies it `under_funded` (`expectedTotal = assignedCount × fixed_amount > 0`,
`deliveredTotal = 0`, `0 ≥ expectedTotal` is false). `amountRaisedInr` is `0`. Nothing in the read
path or the contract rejects the row. It is rare — a drive that collected **nothing** before close is
a serious community-level event — but it is ⛔ not impossible, and the page names people beside the
`₹ 0`.

### 4.3 Why this is the Live zero-state question, one stage over

`2026-09-07-206` cl.4 exists because you were *"shown what a drive renders on its FIRST DAY"* —
*"₹ 0 and counting, by 0 colleagues—and still going strong!"* — and replaced it. The Closed / Verified
sentence at ₹0 is the same shape (*"₹ 0 contributed by colleagues…"*), on a stage the cl.4 pair does
⛔ not reach, beside two **named** private individuals rather than an anonymous *"0 colleagues"*.

### 4.4 Options

| | Option | Cost |
|---|---|---|
| **A** | **Author a Closed / Verified zero-state sentence** (a pair, parallel to `zero_line.*` — one with the family name, one without, because `deceasedMemberName` is `.nullable()` and `t()` throws on a missing token). We would render it whenever a Closed / Verified row has `amountRaisedInr === 0`. | You author two strings in both languages. Render-site branch mirrors the Live one exactly. |
| **B** | **Suppress the sentence at ₹0 on Closed / Verified rows** — render **nothing** for that row's "About this drive" cell, the same silence `2026-09-07-205` cl.6 already rules for the no-variant-fits case on this exact sentence. | One-line render change (`amountInr === 0 ? null : labels.indexLine(…)`). ⛔ No new copy. A consented row shows an empty summary cell — but cl.6 already accepts that for a different trigger. |
| **C** | **Rule *"₹ 0 contributed…"* acceptable** for a genuinely unfunded closed drive. It is factually true; ₹0 *was* the sum contributed. | ⛔ No code change. Recorded as a ruling. Leaves a `₹ 0` beside named individuals on the public page. |

⭐ Our read: **B** is the cheapest and is consistent with cl.6's existing silence posture on this
sentence; **A** is the most graceful and mirrors what you did for the Live case. We do ⛔ not
recommend **C**.

---

## 5. What is blocked

**Nothing in the shipped page changes on either answer.** Story D's Chunk-A + Chunk-B code review is
complete and green; the 18 other findings are fixed. These two are recorded as **open** in the story's
Review Findings section and in `sprint-status.yaml`; the story stays `in-progress` until they are
ruled. Q1's figure **is on the public JSON API on the branch today** — that is the only live exposure,
and it is a roster **count**, ⛔ no identity.

---

## 6. Commands to re-verify every claim

```
# Q1 — the field at each layer
grep -n "confirmedPercentage" packages/contracts/src/public-pages/sahyog-drive.ts        # :245 non-nullable
grep -n "confirmedPercentage: driveConfirmedPercentage" packages/domain/src/pool/public-read.ts   # :1041 unconditional
grep -n "confirmedPercentage: row.confirmedPercentage" apps/api/src/modules/public-pages/handlers.ts  # :465 spread on every row
sed -n '428,434p' apps/public/src/lib/sahyog-render.ts                                   # render blanks it off-Live only
grep -n "LIVE rows only\|DENOMINATOR ITSELF NEVER CROSSES" packages/contracts/public-pages/public-vs-private-matrix.yaml

# Q2 — the closed/verified path has no count-zero branch
sed -n '437,470p' apps/public/src/lib/sahyog-render.ts
sed -n '638,645p' apps/public/src/lib/sahyog-render.ts                                   # formatSahyogLiveAmount(0,…,'closed') → formatCurrency(0)
grep -n "index_line\.\|zero_line\." packages/i18n/locales/en/sahyog-shared.json
```

---

## Appendix — the same two questions, in plain English

*This appendix says nothing new. It restates §3 and §4 without technical terms, for a quick read
before the meeting. If anything here seems to differ from the sections above, the sections above are
the exact record.*

### The page we are talking about

There is a **public web page that lists Sahyog Drives** — one row per drive. Anyone on the internet
can open it; no login. Each row shows the drive's pool code, the district, the deceased member's name
(where the family agreed to show it), the nominee's name, how many colleagues have contributed, and —
for drives that are **still collecting** — a **progress bar**.

Two separate things sit behind that page:

1. **What a visitor sees** — the page itself, the words and the bar.
2. **A data feed behind the page** — the raw numbers the page is built from. It is not meant for the
   public, but it is on the same public address, so a curious person *can* read it directly. Think of
   it as the page's "kitchen" versus its "dining room".

Both questions below are about a mismatch between the kitchen and the dining room, or about a
situation nobody wrote a rule for yet. **Neither one changes what a visitor sees today.** Nothing is
broken. We just need your decision on record before the story is marked done.

---

### Question 1 — the progress bar's percentage

**The bar you approved** fills up to show *"what share of the assigned colleagues have already
contributed"* — for example, 82%.

**On the visible page**, that percentage only appears on **still-collecting** drives. On drives that
have already **closed**, the bar and its number are hidden. That is correct and intended.

**In the data feed behind the page**, the percentage is present for **every** drive, including closed
ones. And the same feed also lists **how many colleagues have contributed**. If you have both of those
numbers, a little arithmetic gives you a third: **how many colleagues were assigned to that drive in
the first place** (its "roster size").

- This is **a headcount of a group** — how many people were asked to chip in. It is **not** anyone's
  name, contact, or amount.
- For **still-collecting** drives, we already accept that this headcount can be worked out this way —
  it was discussed and it was fine.
- The question is only about **closed and settled** drives. Our own written note for this field says
  the percentage should be **absent** for those. The data feed does not currently do that.

**What we need from you — pick one:**

- **Option A — take it out of the feed for closed drives.** The percentage would be blank in the data
  feed for closed and settled drives, exactly as it already is on the visible page. This is more work
  for the engineers but makes everything consistent.
- **Option B — leave it, and change our note.** Accept that the roster headcount can be worked out for
  closed drives too — the same way it already can for live ones — and update the internal note to say
  so. This is a one-line change.
- **Option C — round it off.** Keep a rough percentage on closed drives but round it (say, to the
  nearest 5%) so the arithmetic no longer lands on an exact roster size. This adds a new rounding rule
  and makes the bar mean slightly different things at different stages.

*Our steer: Option A is the tidiest outcome; Option B is the least effort. Neither changes the page a
visitor sees.*

---

### Question 2 — a drive that closed having raised nothing

Picture a drive where colleagues **were assigned** to contribute, but — for whatever reason — **not
one contribution came in** before the drive closed. Rare, and a sad outcome, but possible.

On the public list, that row would currently read, word for word:

> **"₹ 0 contributed by colleagues for Sunita Devi Sharma, nominee of Late Rajesh Kumar Sharma, who
> served in Lucknow district."**

So a **"₹ 0"** sits right next to a **named nominee** and a **named deceased member**, on a public
page.

**You have already dealt with the live version of this.** When the review showed you what a
brand-new drive says on **day one** — *"₹ 0 and counting, by 0 colleagues—and still going strong!"* —
you replaced it with the gentler line *"Late [name]'s family awaits your support."* That fix only
covers **still-collecting** drives. A **closed** drive that raised nothing has no such gentler line —
it still prints the *"₹ 0 contributed…"* sentence.

**What we need from you — pick one:**

- **Option A — give us the words.** You write a short replacement line (with and without the family
  name, in both languages), the way you did for the live version, and we show that instead whenever a
  closed drive raised ₹0.
- **Option B — show nothing.** For a closed drive that raised ₹0, leave that sentence off the row
  entirely — no line at all. The page already does exactly this for a different situation, so it is a
  small, safe change and needs no new wording.
- **Option C — leave it as is.** Rule that *"₹ 0 contributed…"* is acceptable — ₹0 genuinely is what
  was raised, and the sentence is true.

*Our steer: Option B is the cheapest and matches how the page already handles a similar case;
Option A is the kindest and mirrors what you did for live drives. We would not recommend Option C.*

---

### What happens next

Neither question blocks anything from shipping. The rest of Story D's review is finished. These two
sit as open items until you rule; then the engineers apply your choice (or record it, if you choose
an option with no code change) and the story is closed.

---

*Prepared by the 2026-09-08 code review of Story 11b.14. Both questions are additions to the record,
⛔ not corrections of it.*
