# Trustee Panel routing note — 2026-09-07

## Story 11b.14 (**Story D** — live drives on the public index) has been **built and reviewed**. The review found **five** things we will ⛔ not answer for you. **(1)** The progress bar you ruled onto the page **explains itself to ⛔ nobody** — ⛔ unannounced to a visitor who cannot see it, and ⛔ unlabelled for one who can. ⭐ We propose printing **`82%`** on it. **(2)** The nominee's name renders on a **still-collecting** drive as a **bare labelled cell** — ⛔ not through the sentence your ruling described. **(3)** A revealed लक्ष्य below ₹1 lakh renders **`₹ 0 lakh`**. **(4)** A live drive with ⛔ no contributions yet renders *"**₹ 0** and counting, by **0** colleagues—and still going strong!"* **(5)** Any close-date filter makes the **entire Live section vanish**, silently.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE — ⭐ the same discipline as the 2026-09-07 note.**
> Every factual claim below is either (a) **verbatim ratified text** from `.decision-log.md` or a
> prior routing note, or (b) **verified repository state** — an exhaustive search, an absent caller,
> a shipped file's contents, or a function we **executed** and captured the output of. ⛔ **We have
> deliberately ⛔ not rested any part of this escalation on a code comment, a doc-block, or a story
> file's own prose**, because those are our words about the code, ⛔ not the code. ⭐ §10 lists every
> command, so any claim here can be re-run and checked.
> ⚠ Where something is an **inference** rather than a fact, it is labelled **INFERENCE**.

> ⭐⭐ **AND THE ONE THING TO KNOW BEFORE READING FURTHER.** ⛔ **None of these five is a defect in
> what you ruled.** Three of them (**Q1**, **Q3**, **Q4**) are places where a ruling was **correct
> for the case in front of it** and the code then met a case the ruling did not describe. **Q2** is
> a question your record left **explicitly open** and a builder closed. **Q5** is a behaviour ⛔ no
> ruling ever addressed. ⇒ ⭐ we are asking you to **extend**, ⛔ not to reconsider.

---

## 1. What is being asked, precisely

| # | Question | What is blocked |
|---|---|---|
| **Q1** | May the bar **print its own percentage** (`82%`) — visible to everyone, ⛔ rather than a hidden announcement? | ⛔ Nothing. D ships either way; the gap is **recorded** if you decline. |
| **Q2** | Does a **Live** (still-collecting) row carry the **nominee's name**? | ⛔ Nothing ships differently today — ⚠ but a **new Tier-1 exposure** is live on the branch. |
| **Q3** | What does a revealed **लक्ष्य below ₹1 lakh** render? | ⛔ Nothing at launch (the reveal is default-OFF). ⚠ It fires on the **first Pariwar switched on**. |
| **Q4** | What does a live drive with **zero confirmed contributions** say? | ⚠ **Day one of every drive.** |
| **Q5** | Should a **close-date filter** keep or drop the Live section? | ⚠ A visitor who filters loses the section the story exists to add. |

⭐ **Q1 and Q4 are the two we would most like answered.** Q1 because it is a class you have made a
**launch-blocker** (11b.8 / UX-DR70); Q4 because it is the **ordinary first state** of every drive.

---

## 2. ⭐ What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-07-204` **cl.5** (the bar's label)

> 5. ⭐⭐ **THE BAR'S LABEL IS REMOVED, AND A RULED SENTENCE CARRIES THE MEANING INSTEAD.** The Panel,
>    verbatim: *"Around bar above or below do not show '412 of 500 contributions confirmed.'"* ⇒
>    `active_contribution.progress` and `active_contribution.progress_a11y` are ⛔ **NOT** rendered on
>    the public surface — ⭐ both carry the shape *"{confirmed} of **{total}** contributions confirmed"*,
>    which **names its own denominator**, in words, in both locales. ⚠⛔ **That was a channel that
>    required ⛔ no arithmetic at all** — ⛔ not a recovery, ⭐ the number itself, printed.
>    ⇒ ⭐ the bar is **`aria-hidden`** (⛔ the a11y string carries the same shape) and the Panel's
>    sentence beneath it carries the meaning. ⚠ **The cost the Panel accepted, recorded:** the bar's
>    **width** now means something the words do ⛔ not explain.

### 2.2 Verbatim — `2026-09-07-205` **cl.1** (the nominee's name)

> 1. ⭐⭐ **THE RULING.** The public Sahyog Drive **INDEX** row carries the **nominee's name** …
>    - ⭐ It renders through **11b.12's already-shipped `index_line.*` copy**, whose
>      `{nominee_name}` token that story **authored and left DARK** — exactly as it did `{amount}`.

### 2.3 Verbatim — routing note **§13.5** (the target's number form)

> ⭐ *"Expected figure always in Lakh or Crore"* ⇒ ⛔ **the ₹10-lakh cut-off does ⛔ NOT apply to the
> target** — a ₹8,00,000 target renders **₹8 lakh**, ⛔ never ₹8,00,000.

### 2.4 Verbatim — `2026-09-04-189` **cl.2** (the listing itself)

> **2. (Q2) — YES: A COLLECTING DRIVE IS LISTED.** ⇒ **FR-76 is RESTORED** …

### 2.5 ⭐ What was ⛔ NOT ruled

- ⛔ **Nothing** was ruled about the bar carrying **its own percentage**. ⚠ cl.5 refused a **specific
  string** (*"412 of 500"*) on a stated ground (*it names its own denominator*). ⛔ It did ⛔ not
  consider, and ⛔ was never offered, **the bare figure `82%`** — which names ⛔ no denominator and is
  ⛔ not a sentence in either language.
- ⛔ **Nothing** was ruled about the nominee's name on a **Live** row specifically. ⭐ `-205` cl.1
  describes **one vehicle** — the `index_line.*` sentence — and ⛔ that sentence does ⛔ not render on
  a Live row (`2026-09-07-204` cl.6 gives Live rows a different sentence).
- ⛔ **Nothing** was ruled about a target **below ₹1 lakh**. ⭐ §13.5's worked example is ₹8,00,000.
- ⛔ **Nothing** was ruled about a drive with **zero** confirmed contributions.
- ⛔ **Nothing** was ruled about **close-date filters** and live rows.

---

## 3. ⛔⛔ Q1 — the bar is announced to ⛔ NOBODY

### 3.1 What exists today — ⭐ verified, ⛔ not asserted

The meter, as rendered (`apps/public/src/pages/sahyog.astro:666-673`):

```jsx
{col.meter !== undefined && col.meter.fillOf(row) !== null && (
  <div class="sahyog__meter" aria-hidden="true"
       style={`--sahyog-meter-fill:${String(col.meter.fillOf(row))}%`}>
    <span class="sahyog__meter-fill"></span>
  </div>
)}
```

- ⭐ **Verified:** the file contains **`aria-hidden`** 3 times and **`role="progressbar"` /
  `aria-valuenow` / `aria-valuetext` ⛔ ZERO times.**
- ⭐ **Verified:** the string cl.5 refused is
  `active_contribution.progress_a11y` = *"{confirmed} of {total} contributions confirmed so far"*
  (`packages/i18n/locales/en/contribution.json:9`). ⇒ ⭐ **cl.5's stated ground is exactly right** —
  that string names `{total}`, in words.

### 3.2 ⛔⛔ THE FINDING

A **sighted** visitor perceives the proportion. A **screen-reader** visitor receives the
participation sentence — which carries the **amount** and the **contributor count**, and ⛔ **never
the proportion**. ⇒ a state one visitor can perceive and another cannot.

### 3.3 ⭐⭐ **THE SHAPE WE PROPOSE — ⛔ NOT AN ANNOUNCEMENT. ⭐ PRINT THE PERCENTAGE ON THE BAR.**

⚠⛔ **An earlier draft of this note asked you for a *spoken* sentence** — copy that ⛔ only a screen
reader would receive. ⭐ **BigDev corrected it, and the correction is right.** ⇒ ⭐⭐ **show the figure
itself — `82%` — as visible text on the bar.**

**⭐ Why that is better than an announcement, on four grounds:**

1. ⭐⭐ **ONE SOURCE, ⛔ NOT TWO.** A hidden announcement is a **second definition** of a fact the bar
   already carries. ⚠ `packages/i18n/locales/en/sahyog-shared.json`'s own `$comment` records why that
   is dangerous here, verbatim: *"⛔ There is NO second definition of the three stage words, and there
   may not be: **two sources is exactly how 'Active' came to mean two different things**."* ⇒ ⭐ a
   **visible** figure is read by **both** senses from **one** string.
2. ⭐⭐ **IT CLOSES THE COST YOU RECORDED — ⭐ FOR EVERYONE, ⛔ not only for screen readers.** cl.5's
   accepted cost is *"the bar's **width** now means something the words do ⛔ not explain."* ⚠ An
   announcement repairs that ⛔ only for a visitor who cannot see. ⭐ **A printed figure repairs it for
   the sighted visitor too** — who today sees a bar and is told ⛔ nothing about what it measures.
3. ⭐ **IT MEETS cl.5's STATED GROUND EXACTLY.** You refused *"412 of 500"* because it **names its
   denominator**. ⭐ `82%` names ⛔ none.
4. ⭐⭐ **IT IS ARGUABLY ⛔ NOT NEW COPY AT ALL.** A bare percentage is **OPERATIONAL DATA** — the same
   class as `formatCount` and `formatCurrency`, which under **amendment-A2** render **LATIN** numerals
   in both locales and carry ⛔ no locale-varying prose. ⇒ ⭐ **`82%` is identical in English and
   Hindi.** ⚠ This drops the question from *"author a sentence in two languages"* to *"confirm a
   number may be shown"* — ⛔ and we still ⛔ do not take it as ours to confirm.

### 3.4 ⭐⭐ AND THE PROPORTION IS **ALREADY PUBLISHED** — ⭐ so ⛔ nothing is disclosed by printing it

- ⭐ **Verified:** `drive_progress_percentage` is **`tier: public`** in
  `packages/contracts/public-pages/public-vs-private-matrix.yaml:789-790`.
- ⭐ **Verified:** `confirmedPercentage` is a **required field on the public wire**
  (`packages/contracts/src/public-pages/sahyog-drive.ts:222`) and is asserted in the exact-key-set test.
- ⭐ **Verified:** `confirmed_contribution_count` is **ALSO `tier: public`**
  (`public-vs-private-matrix.yaml:694-695`), is a **RENDERED COLUMN** (*"Contributions confirmed"*),
  and is ⛔ **NOT** among the three field ids dropped on a Live row.

⇒ ⭐⭐ **THE ROSTER SIZE IS ALREADY RECOVERABLE TODAY, BY ANYONE, WITHOUT THIS CHANGE** — the count is
on the screen and the percentage is on the wire, so `count ÷ percentage` returns it. ⇒ ⭐ printing
`82%` widens ⛔ **NOTHING**; it names ⛔ no denominator, so cl.5's stated ground does ⛔ not reach it,
and it changes ⛔ only **whether the page explains its own bar.**

### 3.5 ⚖️ INFERENCE — ⛔ labelled as such

⚠ We **infer** that cl.5's `aria-hidden` was a consequence of the **only string available** carrying
the forbidden shape, ⛔ not an independent ruling that the bar must be silent. ⭐ Ground: cl.5 gives
that reason in its own parenthesis (*"⛔ the a11y string carries the same shape"*). ⛔ We do ⛔ not
treat the inference as a fact, and ⛔ we have not acted on it.

⚠ **AND ONE OBJECTION WE RAISE AGAINST OURSELVES, ⛔ rather than waiting for it.** `2026-09-04-189`
**cl.2(c)** resolved **Pool-Reality #2** (⛔ no comparison-to-target framing) *by the target's
invisibility* ⇒ ⚠ **does a printed `82%` make the bar a comparison again?** ⭐ **We think ⛔ not** —
the **bar itself** is already that comparison and you **ratified the bar** at cl.2(b); the figure
⛔ adds no comparison, it ⭐ **names the one already drawn**. ⚠ ⛔ But that is our reading, ⛔ not a
ruling, and it is **yours to reject**.

---

## 4. ⛔⛔ Q2 — the nominee's name renders on a **still-collecting** drive, as a **bare cell**

### 4.1 What exists today — ⭐ verified

`nominee_account_holder_name` is its **own column** (`apps/public/src/lib/sahyog-render.ts:750`),
⛔ separate from `drive_index_line` (`:757`). The live-stage column filter (`:835-843`) drops
**exactly three** field ids:

```ts
stage === 'live'
  ? all.filter((c) =>
      c.fieldId !== 'drive_closed_at' &&
      c.fieldId !== 'close_of_cycle_framing' &&
      c.fieldId !== 'drive_index_line')
  : all.filter((c) => c.meter === undefined)
```

⇒ ⭐ `drive_index_line` **is** dropped on Live rows. ⇒ ⛔ `nominee_account_holder_name` **is NOT**.

### 4.2 ⛔⛔ THE FINDING — the ruling described a vehicle the Live row does ⛔ not use

`-205` cl.1 says the name *"renders through 11b.12's already-shipped `index_line.*` copy."*
⭐ On **Closed** and **Verified** rows, it does. ⛔ **On a Live row, that sentence is not rendered at
all** — `2026-09-07-204` cl.6 gives Live rows the participation headline instead, and that headline
has ⛔ **no `{nominee_name}` slot**.

⇒ ⭐⭐ **on a Live row the nominee's name appears as a bare labelled cell — "Nominee Name: ‹name›" —
beside a drive that is still collecting money.** ⛔ Not inside a sentence, ⛔ not in the context the
ruling described.

### 4.3 ⚠ And your own record left this **explicitly open**

The 2026-09-07 note's `D5` recorded, in terms, that cl.6's sentence *"has ⛔ no `{nominee_name}`
slot, so 'does a Live row carry the nominee name, and where?' is an **open consequence** … ⛔ Do
⛔ not assume either way."*

⇒ ⭐ the builder resolved it — **retain the column on all three stages** — and the reasoning survives
⛔ **only in a test's title.** ⚠ **That is a Tier-1 public exposure settled without a ruling**, which
`-205` cl.2 is precise that it must not be (*"a NEW exposure on a NEW surface … `-190` cl.2 does
⛔ NOT auto-widen to it"*).

⚖️ **Stated fairly, the other way:** `-205` cl.1 says *"the public Sahyog Drive **INDEX** row carries
the nominee's name"* with ⛔ **no stage qualification**, and the index now has three stages. ⭐ A
reader could fairly hold that the ruling already covers it. ⛔ We take neither reading.

---

## 5. ⛔⛔ Q3 — a revealed लक्ष्य below ₹1 lakh renders **`₹ 0 lakh`**

### 5.1 The finding — ⭐ **EXECUTED**, ⛔ not reasoned

लक्ष्य is `assignedCount × pools.fixed_amount`, rendered **always** short-form per §13.5. The short
formatter has ⛔ **no sub-lakh floor.** Executed against the shipped code:

| Target (₹) | Renders (EN) | Renders (HI) |
|---|---|---|
| **300** | **`₹ 0 lakh`** | **`₹ 0 लाख`** |
| **800** | **`₹ 0 lakh`** | **`₹ 0 लाख`** |
| 15,000 | `₹ 0.15 lakh` | `₹ 0.15 लाख` |
| 50,000 | `₹ 0.5 lakh` | `₹ 0.5 लाख` |
| 99,999 | `₹ 0.99 lakh` | `₹ 0.99 लाख` |
| 1,00,000 | `₹ 1 lakh` | `₹ 1 लाख` |

⭐ **`300` is ⛔ not hypothetical:** it is the value the story's **own API fixture** produces —
3 assignees × `fixed_amount` **100** (`apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:467`).

### 5.2 ⚠ Why this collides with your own posture

⭐ You ruled that a **zero-assignee** pool renders **⛔ NO लक्ष्य — silence, ⛔ never `₹0`.** The code
honours that exactly (`resolveDriveTargetForPublic` returns `null` when `assignedCount <= 0`).
⇒ ⛔ but a **nonzero** target of ₹300 reaches the page as the string **`₹ 0 lakh`** by a different
route — ⭐ the number form, ⛔ not the guard.

⚠ **Latent at launch** (the reveal is default-OFF for every Pariwar). ⭐ It fires on the **first
small Pariwar switched on** — i.e. exactly the moment §13.5 exists to govern.

---

## 6. ⛔⛔ Q4 — a live drive with ⛔ no contributions yet

### 6.1 The finding — ⭐ **EXECUTED**, ⛔ not reasoned

The participation sentence is rendered for **every** Live row, with ⛔ no zero guard. Executed with
`amountRaisedInr = 0`, `confirmedContributionCount = 0`, against the **ratified** strings:

> **EN:** `₹ 0 and counting, by 0 colleagues—and still going strong!`
>
> **HI:** `0 सहकर्मियों द्वारा ₹ 0 का योगदान अभी तक... योगदान जारी है!`

### 6.2 ⚠ Why it matters more than it looks

⭐ **This is the ordinary state on day one of every drive** — a pool spawns `live` and confirmations
arrive over the following days. ⇒ ⛔ it is ⛔ not an edge case; it is the **first thing a visitor sees**
about a family whose drive has just opened.

⚠ And it is the **one place** on this surface that does ⛔ not take silence at zero: `fundingOutcome`
returns `null`, लक्ष्य returns `null`, and the bar renders at 0%.

⚠⛔ **Suppression is ⛔ not free, and we will ⛔ not choose it for you.** The bar is `aria-hidden`
(Q1) ⇒ if the sentence is also suppressed, a zero-contribution Live row says **⛔ nothing at all**
about its participation — to anyone.

---

## 7. ⛔ Q5 — any close-date filter makes the **entire Live section vanish**

### 7.1 The finding — ⭐ verified

- `DRIVE_CLOSED_AT` (`packages/domain/src/pool/public-read.ts:449-457`) selects the `pool.closed` /
  `pool.settled` event's `occurred_at`. ⇒ ⭐ for a **live** pool it is **structurally NULL**.
- The filters (`:853-857`) push `DRIVE_CLOSED_AT >= closedFrom` and `<= closedTo`. ⇒ ⛔ **NULL fails
  both comparisons**, so every live row is excluded.

⇒ ⭐ a visitor who sets **any** close-date filter loses the **whole Live section**, with ⛔ no copy
explaining it — the *"no drives match your filter"* copy ⛔ never fires, because archive rows remain.

### 7.2 ⚖️ Both readings are defensible — ⛔ we take neither

- ⭐ **Keep them:** FR-76 makes the live drive the point of the page; a filter about *when a drive
  closed* arguably should ⛔ not hide drives that have ⛔ not closed.
- ⭐ **Drop them:** a live drive genuinely **has** no close date; including it in a close-date range
  asserts something false.

---

## 8. ⚖️ Stated fairly, in both directions

**What argues for leaving all five alone:**

- ⭐ **Q1, Q3, Q4** are each downstream of a ruling that was **correct for the case it faced.**
  ⛔ None is a misreading of your words.
- ⭐ **Q3** cannot be seen by anyone at launch — the reveal is OFF for every Pariwar.
- ⭐ **Q2** may already be covered by `-205` cl.1's unqualified *"INDEX row"*.
- ⚠ Story D has already absorbed **five days** of Panel rulings and **seven strata** of superseded
  record. ⛔ More questions have a real cost.

**What argues for answering them now:**

- ⛔ **Q4 is visible on day one of every drive**, in both languages, and it is your **ratified
  sentence** that renders it. ⛔ No switch hides it.
- ⛔ **Q1 is a class you have already made a launch-blocker** (11b.8 / UX-DR70). ⭐ Answering it here
  costs one string; ⛔ meeting it at the audit costs a gate.
- ⛔ **Q2 is a live Tier-1 exposure** decided by a builder, on the exact class `-205` cl.2 says
  ⛔ cannot auto-widen.
- ⭐ **Q3 and Q5 are cheap now and awkward later** — both become visible the first time someone acts.

---

## 9. The options — ⛔ none is pre-ruled

### 9.1 Q1 — the bar's announcement

| | Option |
|---|---|
| **(A)** ⭐ **what we propose** | ⭐⭐ **PRINT THE PERCENTAGE ON THE BAR — `82%`.** ⭐ Visible to **everyone**, read by **both** senses from **one** string, identical in both languages (⛔ no translation owed). ⭐ Names ⛔ no denominator ⇒ cl.5's ground untouched; ⭐ and it closes the **width-means-nothing** cost cl.5 recorded, ⛔ which an announcement would have closed ⛔ only for screen readers. |
| **(B)** | ⚠ **Announce it to screen readers only** — hidden text, ⛔ nothing visible changes. ⚠⛔ **A SECOND SOURCE** for a fact the bar already carries, and it leaves the **sighted** visitor's bar unexplained. ⛔ We ⛔ no longer recommend this; it is kept as an option because it was what we first asked for. |
| **(C)** | ⭐ **Defer to 11b.8**, the accessibility audit that is already a launch-blocker for this class. ⛔ Nothing renders meanwhile; the gap is recorded with a named trigger. |
| **(D)** | ⭐ **Confirm the bar stays silent and unlabelled.** cl.5's accepted cost stands as ruled; we record it as *not-constructible under the current ruling* and ⛔ stop re-raising it. |
| **(E)** | ⭐ Something else. |

### 9.2 Q2 — the nominee's name on a Live row

| | Option |
|---|---|
| **(A)** | ⭐ **Ratify it as built** — the name renders on all three stages; `-205` cl.1 is amended to say so, ⛔ replacing its *"through `index_line.*`"* description. |
| **(B)** | ⭐ **Narrow it to Closed · Verified** — the name is dropped on Live rows, so the exposure follows the **sentence** the ruling described. ⚠ A family's nominee is then named ⛔ only after the drive closes. |
| **(C)** | ⭐ **Ratify it, but inside a sentence** — you supply a Live-row phrasing carrying `{nominee_name}`, so a bare cell is ⛔ never rendered. |
| **(D)** | ⭐ Something else. |

### 9.3 Q3 — a revealed लक्ष्य below ₹1 lakh

| | Option |
|---|---|
| **(A)** | ⭐ **Silence below ₹1 lakh** — the same posture as a zero-assignee pool. ⛔ No लक्ष्य renders. |
| **(B)** | ⭐ **Exact form below ₹1 lakh** — `₹ 300`, ⛔ never `₹ 0 lakh`; short form resumes at ₹1 lakh. |
| **(C)** | ⭐ **Thousands word-form** — `₹ 15 हज़ार` / `₹ 15 thousand`. ⚠ Your earlier *"हज़ार"* form was **dropped** for counts on 2026-09-07; this would reinstate it for money ⛔ only. |
| **(D)** | ⭐ Something else. |

### 9.4 Q4 — a live drive with zero contributions

| | Option |
|---|---|
| **(A)** | ⭐ **Suppress the sentence at zero** — the row shows the bar (at 0%) and ⛔ no participation line. ⚠ With the bar `aria-hidden`, the row then says ⛔ nothing to a screen reader (see Q1). |
| **(B)** | ⭐ **A ratified opening sentence** — you supply a zero-state line in both languages (e.g. *"This drive has just opened."*). ⭐ Says something true, ⛔ claims no participation. |
| **(C)** | ⭐ **Leave it as ruled** — *"₹ 0 and counting, by 0 colleagues—and still going strong!"* is accepted as the day-one state. |
| **(D)** | ⭐ Something else. |

### 9.5 Q5 — close-date filters and the Live section

| | Option |
|---|---|
| **(A)** | ⭐ **Live rows are exempt** — a close-date filter narrows the archive; the Live section is always shown. |
| **(B)** | ⭐ **Live rows are filtered out, and the page SAYS SO** — you supply one line of copy explaining that a date filter hides drives that have not closed. |
| **(C)** | ⭐ **Leave it** — the section vanishes silently. |
| **(D)** | ⭐ Something else. |

---

## 10. ⭐ How every fact above was established — ⛔ re-runnable

⭐ All paths relative to the repository root; branch
`story/11b-14-live-drives-listed-and-the-progress-meter` at `b6f80cea`.

| # | Claim | Command |
|---|---|---|
| C1 | The refused a11y string names `{total}` | `grep -rn "active_contribution.progress_a11y" packages/i18n/locales/` |
| C2 | The percentage is `tier: public` | `grep -n "id: drive_progress_percentage" -A 3 packages/contracts/public-pages/public-vs-private-matrix.yaml` |
| C3 | The bar has ⛔ no ARIA value; `aria-hidden` ×3 | `grep -c "aria-hidden" apps/public/src/pages/sahyog.astro` · `grep -n 'role="progressbar"\|aria-valuenow\|aria-valuetext' apps/public/src/pages/sahyog.astro` |
| C4 | Live stage drops **3** field ids, ⛔ not the nominee | `sed -n '834,845p' apps/public/src/lib/sahyog-render.ts` |
| C5 | The nominee is its **own** column | `grep -n "fieldId: '" apps/public/src/lib/sahyog-render.ts` |
| C6 | Close-date filters compare a NULL column | `sed -n '853,858p' packages/domain/src/pool/public-read.ts` |
| C7 | `DRIVE_CLOSED_AT` is NULL for a live pool | `sed -n '449,457p' packages/domain/src/pool/public-read.ts` |
| C8 | The fixture's target is **₹300** | `grep -n "assignedCount (3)" apps/api/tests/integration/public-pages/sahyog-drive.spec.ts` |
| C9 | Q3's table (**executed**) | `node -e` over the shipped `formatCurrencyShort` body — inputs 300 / 800 / 15000 / 50000 / 99999 / 100000 |
| C10 | Q4's two sentences (**executed**) | `node -e` interpolating the shipped `live_line` strings from `packages/i18n/locales/{en,hi}/sahyog-shared.json` with `formatCurrency(0)` and `formatCount(0)` |

---

## Appendix A — In plain words

### The first question
We put a progress bar on the page, and it **explains itself to nobody.** Someone who **cannot see** it
gets no idea of it at all. ⚠ And someone who **can** see it is shown a part-filled bar with ⛔ no
number anywhere — they are left to guess what it measures.

You told us ⛔ not to print *"412 of 500 contributions confirmed"*, and you were right: that sentence
gives away the drive's roster size in words. ⭐ **But `82%` on its own gives away ⛔ nothing** — it is
just a number, the same in both languages, and anyone who wants the roster size can already work it
out from the page as it stands today.

⇒ **may the bar simply show `82%`?** ⭐ Then the same number serves the person who reads it and the
person whose screen reads to them — ⛔ one figure, ⛔ not two versions of it.

### The second question
On a drive that is **still collecting**, we are showing the nominee's name in a little labelled box
of its own. ⭐ You ruled the name onto the index, and you described it appearing **inside a sentence**.
⚠ On a still-collecting drive that sentence isn't used — so the name sits there on its own. ⇒ **is
that what you meant, or should the name wait until the drive closes?**

### The third question
When the Trust switches on the "expected figure", a **small** drive shows **"Expected: ₹ 0 lakh"** —
because you asked for lakh or crore always, and a small number in lakh rounds to nothing. ⇒ **what
should a small drive show?**

### The fourth question
On the **first day** of a drive, before anyone has given, the page says: *"₹ 0 and counting, by 0
colleagues—and still going strong!"* ⇒ **should it say something else, or nothing, until the first
contribution arrives?**

### The fifth question
If a visitor filters by date, the live drive **disappears** — because a live drive has no closing
date to match. ⇒ **should live drives stay visible when someone filters, or is disappearing right?**

### What happens meanwhile
⛔ **Nothing is blocked.** Story D is built and reviewed. **Q3** cannot be seen by anyone until the
Trust switches the expected figure on. **Q1**, **Q2**, **Q4** and **Q5** are live on the branch as
described above, and ⛔ we have changed ⛔ none of them while waiting.

---

## 11. ✅✅ THE PANEL'S ANSWERS — **DR + KB, 2026-09-07.** ⭐ All five, ⛔ none deferred

### 11.1 ⭐ Answered verbatim

> **1 - A**, Print the percentage on the bar
> **2 - A**, Ratify the nominee name as built
> **3 - B**, Exact figure below one lakh
> **4 - B**, *"Late Ram Prakash Verma's family awaits your support."* /
> *"स्व० राम प्रकाश वर्मा का परिवार आपके सहयोग की प्रतीक्षा कर रहा है।"* — *"If you think of better
> opening sentence we are open to hear it."*
> **5 - A**, Live drives always stay visible

⭐ And, on the review's finding that the ruled sentence names a value that can be **absent**:

> **For name missing** — *"Family awaits your support."* / *"परिवार आपके सहयोग की प्रतीक्षा कर रहा है।"*

⇒ ⭐ **Recorded at [`2026-09-07-206`](../../.decision-log.md#decision-2026-09-07-206).**

### 11.2 ⚠⛔ TWO THINGS THE PANEL WAS TOLD BEFORE `Q4` WAS FINALISED — ⭐ ⛔ neither slid past

**(a) ⛔⛔ THE RULED SENTENCE WOULD HAVE 500'd THE PAGE, and the Panel supplied the fix.**
⭐ The wording was given around the brief's **illustrative** name. ⚠ `deceasedMemberName` is
**`.nullable()`** on the wire and **`t()` THROWS** on an unsupplied token ⇒ ⛔ one unconsented drive
would take down the **whole page**. ⭐ The review raised it, ⛔ did not paper over it, and ⛔ did ⛔ not
mint the companion itself — ⭐ **the Panel wrote both variants.** ⚠ This is the ⛔ **same** structural
reason 11b.12 shipped **four** `index_line.*` variants; ⛔ it is ⛔ not a new class of problem.

**(b) ⚖️ THE SOLICITATION CONCERN WAS PUT, AND THE PANEL RULED (B) ANYWAY.**
⭐ *"…awaits your support"* is the page's **first line that asks the reader for something**.
⭐ [`-190`](../../.decision-log.md#decision-2026-09-04-190) **cl.8** is ⛔ **not** tripped — it rejects
**insurance-shaped claims**, and this carries ⛔ no claim, promise, projection or figure. ⚠ ⛔ But
`-187`'s ground for excluding live drives was *"⛔ not a transparency record, **it is an open
solicitation**"*, which `-189` cl.2 overruled **as to LISTING** — ⚠ and **listing is ⛔ not appealing**.
⭐ **Verified:** the public page carries ⛔ **no contribution path** — ⛔ no donate link, ⛔ no UPI,
⛔ nothing ⇒ *"your support"* addresses a reader the page gives ⛔ no way to act.
⇒ ⭐⭐ **The Panel was shown this and ruled (B). ⛔ It is RULED, ⛔ not overlooked**, and it is written
here so the next reader meets the reasoning ⛔ rather than re-deriving it.

### 11.3 ⭐ What the alternative shape was, and that it was ⛔ NOT taken

⚠ The review offered, on the Panel's own invitation, a shape carrying ⛔ no appeal —
*"This drive has just opened for Late {family_name}'s family."* ⇒ ⛔ **declined.** ⭐ The Panel kept
its own wording. ⛔ Recorded so the option is ⛔ not re-proposed as though it had never been put.

### 11.4 ✅ Settled

⭐ **⛔ ⛔ NOTHING REMAINS OPEN ON THIS NOTE.** ⭐ All five become **patches** on Story 11b.14's branch;
⛔ none needs a further ruling, ⛔ none needs a migration, ⛔ none needs a permission key, and ⛔ none
adds a wire field (`confirmedPercentage` already crosses — ⭐ only the **render** changes).
