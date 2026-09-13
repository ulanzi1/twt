# Trustee Panel routing note — 2026-09-13
## Does the Panel's message block (AC10) render on a `live` drive's first day — zero confirmed contributions — or does it wait for the first contribution?

> ## ✅ ANSWERED — 2026-09-13, **Dhiraj Rahul** and **Kalpana Bharti**
>
> **Q1 → Option A.** The message block renders **nothing** on any ₹0 drive, `live` included, until
> the first confirmed contribution lands. AC9's `zero_line.*` line is the only day-one copy. ⛔
> Option B (new zero-day message-block copy) and ⛔ Option C (render the completed-past-tense copy
> as-is on day one) are both declined.
>
> ⭐ Recorded as **`#decision-2026-09-13-216`**, Trustee-ratified, extending `-207` cl.2's ₹0-silence
> to the message block on both stages. ⛔ No code change follows — the shipped
> `selectMessageBlockHeadline` already implements exactly this.
>
> ⛔ **The body below is kept AS PUT, ⛔ not rewritten** ([[feedback_record_unattested_no_backfill]]).

**Author:** BigDev, Solo Builder — 2026-09-13
**Occasion:** Story 11b.17 (the member's per-drive detail) code review, post-implementation. One
finding was triaged as a **decision**, not a patch, because the code's own justification for its
behaviour is the developer's reasoning, not a cited ruling — and the two readings genuinely diverge.
**Routed to:** Trustee Panel.
**Status:** ✅ **ANSWERED 2026-09-13** — see the ruling above. ⛔ It blocked nothing shipped — the
story was already `done` on the reading currently in the code, and the ruling confirms that reading.

> ⭐⛔ **THE ONE THING TO KNOW FIRST.** ⛔ **This is not a defect in anything you ruled.** `-207` cl.2
> (2026-09-08) rules ₹0-silence for the **public index page's** "About this drive" sentence, scoped
> explicitly to `closed`/`verified` rows. AC10's message block (`11b-17`/`11b-19`, ratified
> 2026-09-05, `-214` cl.4(b)) is a **different render, on a different surface**, and its own text
> extends that silence to **every** ₹0 case — `live` included — citing `-207` cl.2 as the ground. ⭐
> **Our read is that the extension is very likely correct** (§4 explains why the shipped copy would
> read as false if forced onto a zero-contribution drive) — but no ruling has said so in those words,
> and we would rather have it on the record than leave it resting on a code comment's own reasoning.

---

## 1. What is being asked, precisely

| # | Question | What is at stake |
|---|---|---|
| **Q1** | On a **`live`** drive with **zero** confirmed contributions — every drive, on its first day — does the Panel's message block (headline + solidarity + gratitude + tagline + join + the nominee/district table) render **nothing**, exactly as it does today? Or must it render **something** on day one, alongside AC9's zero-day summary line? | ⛔ Nothing changes in the shipped page unless the answer is "render something" — that would require **new, day-one-appropriate copy**, since the shipped copy is written in the past tense of a completed contribution. |

---

## 2. What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-08-207` **cl.2** (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti)

> A `closed` or `verified` drive with `amountRaisedInr === 0` renders **no** `index_line.*`
> sentence — **silence**, the same posture `2026-09-07-205` cl.6 already rules for this sentence.

⚠ This is the **public index page's** "About this drive" sentence (`apps/public`), and the ruling's
own text scopes it to the **wire tokens `closed`/`verified`** — the archived stages. It says nothing
about a `live` drive, and nothing about the message block, which did not exist as a render obligation
on 2026-09-08 (`-214`, which routed AC10 to `11b-17`/`11b-20` by name, is dated 2026-09-11).

### 2.2 Verbatim — `2026-09-11-214` **cl.4(b)** (the routing that gave AC10 its home)

> `11b-17` carries the MEMBER render — AC10 / Task 5d — and ⛔ nothing more.

This tells us **who** builds the message block. It does not say **when** it renders relative to a
drive's contribution count.

### 2.3 What the shipped code actually does, traced

`packages/i18n/locales/{en,hi}/sahyog-shared.json` (shipped by `11b-19`, done):

> `message_block.headline.full`: *"Late {family_name}'s family received contributions of {amount}
> from colleagues."*
> `message_block.gratitude`: *"Our heartfelt gratitude to every colleague who stood beside the
> family."*

`apps/mobile/components/drive-detail/format.ts`, `selectMessageBlockHeadline` (11b-17's own code):

```
// ⭐ (3) — the ₹0 silence. ⛔ NO `no_amount` variant exists and ⛔ none may be minted; the block says
// NOTHING rather than something false or half-formed.
if (detail.amountRaisedInr <= 0) return null
```

The guard fires on **any** stage — `live` included — and the function's own doc-comment argues why:

> "On a `live` drive a ₹0 figure is the ordinary day-one state and AC9's ratified zero-day line
> covers it, so this block simply does not speak for it either."

That argument is the developer's own reasoning, made **at the moment of writing the code**, citing
`-207` cl.2 as its ground even though `-207` cl.2's own text is scoped to `closed`/`verified`. It may
well be the right call — see §4 — but it is not, today, a ruling.

### 2.4 What was ⛔ NOT ratified

⛔ No decision text says whether the message block's ₹0-silence is scoped to archived stages only
(matching `-207` cl.2's literal words) or extends to `live` zero-day drives (matching the developer's
extension). AC10's own story text (`11b-17`, property (3)) states the silence rule without a stage
qualifier, then cites `-207` cl.2 in parenthesis — which, read literally, only supports the archived
half of what the code does.

---

## 3. Reachability

⛔ This is **not a rare edge case.** Every `live` drive starts at `confirmedContributionCount === 0` —
it is the state of **every drive on its first day**, by construction. The question is not "does this
ever happen" but "what does every member see on day one of every drive, until the first contribution
lands."

---

## 4. Why we think the shipped behaviour is very likely correct — and are asking anyway

The message block's ratified copy is written in the **completed past tense**, thanking colleagues for
contributions that have **already happened**:

- *"…family received contributions of {amount} from colleagues."*
- *"Our heartfelt gratitude to **every colleague who stood beside the family**."*

Forcing this onto a drive with **zero** confirmed contributions would render, literally: *"Late
[name]'s family received contributions of ₹0 from colleagues. Our heartfelt gratitude to every
colleague who stood beside the family"* — thanking colleagues who have not yet contributed, for an
amount that is zero. That is not a rendering gap; it would be a **false statement**, on a page whose
whole purpose is accurate disclosure. AC9's day-one line (*"Late {family_name}'s family awaits your
support"*) already exists precisely because you rejected an equivalent false-sounding day-one
sentence once before (`-206` cl.4, 2026-09-07).

⇒ We think the developer's extension is the right reading of your intent — but it was made by a
developer reasoning from a citation, not by a ruling that says so, and the message block was ratified
after `-207` cl.2 was written, so `-207` cl.2 could not have contemplated it. We would rather have
this confirmed on the record than leave a member-facing disclosure rule resting on an inference.

---

## 5. Options

| | Option | Cost |
|---|---|---|
| **A** | **Ratify the current behaviour.** The message block renders nothing on any ₹0 drive, `live` included, until the first confirmed contribution lands; AC9's zero-day line is the only day-one copy. Record this as an explicit extension of `-207` cl.2's silence posture to the message block, on both stages. | ⛔ No code change. One decision-log entry recording the extension by name. |
| **B** | **The message block must speak on `live` zero-day drives too**, alongside AC9's line — but with **new, day-one-appropriate copy** (a `message_block.headline.zero_day.*` variant, parallel to how `zero_line.*` was authored for the summary sentence). | New copy in both languages, a new i18n key pair, a new selector branch, new render-fence tests. The solidarity/gratitude/tagline/join paragraphs would also need a zero-day-appropriate review — they may or may not still fit. |
| **C** | **Leave `-207` cl.2 exactly as scoped (archived only)** and treat the current `live`-inclusive silence as an unauthorized widening that must be narrowed — i.e. render the **existing** (completed-past-tense) message block on `live` zero-day drives as-is. | ⛔ No new copy, but ships the literal false-reading sentence described in §4 on every drive's first day. **Not recommended.** |

⭐ **Our steer: Option A.** It matches what is already shipped, requires no code change, and the copy
itself argues for it — but we are not the Panel, and a member-facing disclosure rule should not rest
on our reading alone.

---

## 6. What is blocked

**Nothing.** Story 11b.17 is `done`; this question does not gate it. It is raised so the current
reading is confirmed (or corrected) on the record before the next story that touches this block
(`11b-20`, the public render) inherits the same question by symmetry.

---

## 7. Commands to re-verify every claim

```
grep -n "amountRaisedInr <= 0" apps/mobile/components/drive-detail/format.ts
sed -n '86,132p' apps/mobile/components/drive-detail/format.ts
grep -n "message_block\." packages/i18n/locales/en/sahyog-shared.json
sed -n '784,820p' .decision-log.md   # Decision 2026-09-08-207, cl.2
grep -n "cl.4(b)" .decision-log.md | grep -i 214
```

---

## Appendix A — the same question, in plain English

*This appendix says nothing new. It restates §1 and §4 without technical terms. If anything here
seems to differ from the sections above, the sections above are the exact record.*

### The screen we are talking about

When a member opens one specific fundraising drive on their phone, the app shows a short block of
text the Trustee Panel wrote: a headline naming the family, a line about the Pariwar standing
together, a thank-you to the colleagues who contributed, and a small table with the nominee's name
and district. This is the same block that will eventually also appear on the public page.

### The question

That block's wording is written as a **thank-you after the fact** — it says colleagues **already**
gave, and thanks them for it. On the very first day a drive is created, **nobody has contributed
yet.** If the app showed that block on day one, it would be thanking people for something that has
not happened, and would say a family "received contributions of ₹0" — which reads as both premature
and slightly odd.

The app currently **hides the whole block** until the first contribution comes in. Instead, it shows
a different, shorter line you already approved for exactly this situation — one that says the family
"awaits support," which was written for a different sentence on a different page (the drive list) but
covers the same day-one moment here.

**We think hiding the block on day one is clearly the right call** — showing it as written would be
inaccurate. But nobody has explicitly told us that is the rule for **this** block; we inferred it from
a rule you gave for a different sentence on a different page. We would like you to confirm it applies
here too, on the record, rather than let it stand only on our inference.

### What we need from you — pick one

- **Option A — confirm what is already shown (hide the block until the first contribution).**
  Nothing changes on the screen. We just record that this is the intended rule.
- **Option B — give us new day-one wording** for the block, so it says something true and
  appropriate before any contribution has landed, and we show that instead of hiding it.
- **Option C — show the block exactly as written, even on day one.** We do not recommend this — it
  would say a family "received ₹0," which is likely to read as a mistake.

*Our steer: Option A. Nothing changes; we simply want it on the record.*

---

*Prepared by the 2026-09-13 code review of Story 11b.17. This note is an addition to the record, ⛔
not a correction of it.*
