# Trustee Panel routing note — 2026-09-07

## Story 11b.14 (**Story D** — live drives on the public index) carries three questions we will ⛔ not answer for you. **(1)** You ruled that a Superadmin may reveal the drive target *"separately for member and for public"* — ⭐ we built the switch, and ⛔ nothing anywhere reads it; the story named as its first consumer forbids the render. **(2)** You ratified a drive headline in your own words — ⭐ and it exists in ⛔ no file in this repository. **(3)** The progress bar's own label **names its denominator** — ⭐ so the bar built to hide the target would print it.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE.** Every factual claim below is either (a) **verbatim
> ratified text** from `.decision-log.md`, or (b) **verified repository state** — an exhaustive
> search, an absent caller, a shipped test's assertions, or a function we **executed** and captured
> the output of. ⛔ **We have deliberately ⛔ not rested any part of this escalation on a code
> comment, a doc-block, or a story file's own prose**, because those are our words about the code,
> ⛔ not the code. ⭐ §7 lists every command, so any claim here can be re-run and checked.
> ⚠ Where something is an **inference** rather than a fact, it is labelled **INFERENCE**.

---

## 0. ⚠⛔ CORRECTION TO THIS NOTE — **§4 and §6.2 are NARROWED, 2026-09-07, before the Panel reads it**

⭐ **BigDev supplied the reading we missed, and it is right.** We had asked *"which surface carries
which sentence"* as an open question. ⚠ **It is answerable from your own record, and we should have
traced it before asking.** ⭐ Recorded as a correction with the original claim named, ⛔ not silently
rewritten.

**The two sentences are ⛔ not two surfaces. They are two STAGES of the same list:**

| Row stage | Sentence |
|---|---|
| **Live** | ⭐ *"16,750 members have stood with this family — ₹19.45 lakh, and counting"* (`-190` cl.6) |
| **Closed · Verified** | ⭐ *"{amount} contributed by colleagues for {nominee_name}, nominee of Late {family_name}, who served in {district_name} district."* (ratified 2026-09-05) |

⭐⭐ **AND THE LOAD-BEARING EVIDENCE IS PROVENANCE, ⛔ not tense.** `-190` cl.6 does not stand alone —
it **completes** `2026-09-04-189` **cl.2(e)**, and cl.2 is titled **"(Q2) — YES: A COLLECTING DRIVE IS
LISTED."** cl.2(e) reads:

> **(e)** the surface shows **the amount raised AND the number of contributors** — the Panel's own
> example: *"19.45 lakh and counting, by 43k members"*, with ⭐ **the exact wording delegated to
> BigDev**.

⇒ ⭐ **cl.6's headline is the wording delegated at cl.2(e), inside the ruling that lists COLLECTING
drives.** ⛔ It was never a sentence about a finished drive. *"and counting"* is in the Panel's own
example of a drive still running.

⭐ **And the other direction is equally structural.** The 2026-09-05 index line was ratified against
an index that listed **`closed` + `settled` only** — `live` drives are ⛔ not listed today, and this
very story is what adds them. ⇒ ⛔ it **could not** have been ruled about a live row, because no live
row existed on that page. ⚠ It also occupies the slot of the close-of-cycle outcome sentence, and a
close-of-cycle classification is structurally meaningless for a drive that has not closed.

⇒ ⭐⭐ **§6.2's options (i), (ii) and (iii) are WITHDRAWN. ⛔ We are ⛔ not asking you which surface
carries which — the record answers it.** ⚠ What survives of Q2 is smaller, and stated at §6.2.

### 0.1 ⚠⛔ And one claim of ours was OVER-STATED — ⭐ corrected here

We wrote at §4.2 that the index line *"carries no member count at all"* and therefore *"cannot satisfy
your participation-first ruling"*. ⚠ **That was too strong.** The 2026-09-05 routing note's own §7.1
records the constraint the line was written under: *"**The confirmed count is ⛔ ALREADY on the same
row.** ⇒ ⛔ don't restate a number."* ⇒ ⭐ the count is a **column** on that row; the sentence omits it
**deliberately**, ⛔ not by oversight. ⭐ The row as a whole is participation-bearing.
⛔ The comparison table at §4.2 stands as a description of the two **sentences**; ⚠ the conclusion we
drew from it does ⛔ not.

### 0.2 ⭐ A THIRD question has been added — **§4.4 and §6.3**

⚠ BigDev then asked what appears **above and below the progress bar** to tell a reader what it
measures. ⭐ We checked, and the answer is a finding: **the bar's shipped label names its own
denominator.** ⇒ **Q3**, and it interlocks with Q1.

---

## 1. What is being asked, precisely

**Q1 — the drive target's public reveal.** `2026-09-04-190` **cl.7(c)** reserves to a Superadmin the
power to make the drive target visible, *"separately for member and for public"*. ⭐ The switch is
built, governed and stored. ⛔ **No code anywhere renders the target to a member or to the public**,
and Story D — which `2026-09-04-196` **cl.8** names as the target's *"first consumer"* — currently
carries an acceptance criterion that forbids displaying the target **unconditionally**, with ⛔ no
reference to cl.7(c). ⇒ **Did cl.7(c) mean the public figure would actually appear when a Superadmin
turns it on — and if so, is Story D the story that must make that true?**

**Q2 — the live drive's headline.** ⭐ **NARROWED at §0** — we now know **where** it goes (the
**Live** rows; the 2026-09-05 index line takes **Closed** and **Verified**). ⛔ What remains is that
`2026-09-04-190` **cl.6**'s sentence **exists in ⛔ no file in this repository**, in either language.
⇒ **cl.2(e) delegated the exact wording to BigDev and cl.6 then adopted a specific English sentence —
so is authoring it now BigDev's, or do you want to see the final English and Hindi first?**

**Q3 — what the progress bar says it is measuring.** ⚠ The bar's shipped label, rendered directly
above it, is *"{confirmed} of {total} contributions confirmed"*. ⛔ **It names its own denominator.**
Under the ruling that the public bar fills against the rupee target, `{total}` **is the target** —
the figure cl.2(c) and cl.7(b) say is not to be displayed. ⇒ **What does the public bar's label say
instead — and is a bar with no label at all acceptable on a page whose ruling is that "the UI carries
the understanding"?**

⛔ **⛔ None of the three re-opens a decision you have made.** ⭐ All ask what a ratified decision
requires of the next build, where the record is silent and we would otherwise be guessing.

---

## 2. ⭐ What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-04-190` **cl.7**

> **7. ⭐ THE TARGET — WHO SETS IT AND WHO MAY REVEAL IT ARE SPLIT.**
>   - **(a)** the **PARIWAR ADMIN** sets the target, **from day 1**. ⚠ This **amends `-189` clause 2(d)**,
>     which had said Superadmin-settable.
>   - **(b)** it is ⛔ **NOT visible** to member or public;
>   - **(c)** ⭐ **ONLY A SUPERADMIN may make it visible**, and **separately for member and for public**.
>
> ⇒ **setting** and **revealing** are different authorities.

### 2.2 Verbatim — `2026-09-04-190` **cl.6**

> **6. ⭐ THE DRIVE HEADLINE — copy option (B) is ADOPTED**, participation-first:
> > *"16,750 members have stood with this family — ₹19.45 lakh, and counting"*
>
> ⚠ The Panel's earlier illustrative figures are ⛔ **not** a constraint: *"ignore the arithmetic in
> example, math was not done properly."*

### 2.3 Verbatim — `2026-09-04-196` **cl.8** (the clause that names Story D)

> ⛔ does ⛔ not render the target anywhere (**Story D is its first consumer, server-side**)

### 2.4 ⭐ What was ⛔ NOT ruled

- ⛔ **Whether cl.7(c)'s public reveal has a surface to appear on.** cl.7(c) grants an authority. It
  ⛔ does not name a page, a story, or a render. `-196` cl.8 names Story D as *"its first consumer"*
  — ⚠ but qualifies that with *"**server-side**"*, which is precisely the ambiguity: a server-side
  consumer computes a bar; a **rendered figure** is a different act.
- ✅ ⭐ **WHICH ROWS CARRY WHICH SENTENCE — ⛔ NOT AN OPEN QUESTION.** ⚠ We first listed this as
  unruled. ⭐ **It is answerable from your record** and is traced at **§0**: cl.6 completes
  `-189` cl.2(e), inside *"A COLLECTING DRIVE IS LISTED"* ⇒ **Live** rows; the 2026-09-05 index line
  was ratified against an index carrying **`closed` + `settled` only** ⇒ **Closed · Verified** rows.
  ⛔ Withdrawn as a question.
- ⛔ **Whether cl.6's sentence has a HINDI form.** ⚠ cl.6 adopted an **English** sentence. ⛔ No Hindi
  was ever ratified for it, on a bilingual public page.
- ⛔ **What the progress bar's LABEL says on the public surface.** ⚠ cl.2(b) rules that each drive
  *"carries a progress bar"*; cl.2(c) and cl.7(b) rule the target is not displayed. ⛔ Nothing rules
  what words sit beside the bar — ⭐ and the shipped ones name the target (§4.4).
- ⛔ **Who authors the cl.6 sentence into the product.** ⚠ It is your wording; ⭐ we will ⛔ not
  invent, translate or re-phrase a Trustee-ratified sentence at a render site without being told to.

---

## 3. ⛔⛔ Q1 — the finding, traced to SHIPPED STATE

### 3.1 What exists today — ⭐ verified, ⛔ not asserted

Story 11b.13 (Story C) is `done`. It shipped, and we confirmed each of these by reading the merged
files:

| Artefact | Location | What it does |
|---|---|---|
| The column | `packages/domain/migrations/0115_pariwar-drive-target.sql:104` | `"reveal_to_public" boolean DEFAULT false NOT NULL` |
| The database constraint | `0115:143` | `CHECK (NOT (reveal_to_public AND NOT reveal_to_members))` — your *member ≥ public* rule, enforced in the database |
| The typed model | `packages/domain/src/pool/drive-target.ts:80-84` | `DriveTargetVisibility { revealToMembers; revealToPublic }` |
| The fail-closed default | `drive-target.ts:122-124` | `{ revealToMembers: false, revealToPublic: false }` |
| The read resolver | `drive-target-policy.ts:233` | `resolveDriveTargetVisibility(...)` |
| The target resolver | `drive-target-policy.ts:169` | `resolveEffectiveDriveTargetInr(...)` |
| The write path | `drive-target-policy.ts:519` | `setDriveTargetVisibility(...)` |
| The permission key | `packages/domain/src/rbac/permissions.ts:1079` | `pariwar.manage_drive_target_visibility`. ⭐ We **executed** the role resolver rather than reading the catalog. Result, verbatim: `super_admin` **reveal=YES set=YES** · `pariwar_admin` **reveal=no set=YES** · `district_admin` / `state_trustee` / `member` **reveal=no set=no**. ⇒ ⭐ **cl.7(a) and cl.7(c) are implemented exactly as ruled** — the Pariwar Admin sets, ⛔ only the Trust reveals |
| The admin control | `apps/admin/src/modules/drive-target/RevealSwitchesForm.tsx` | two toggles, with the invalid combination refused in the form |
| The API | `apps/api/src/modules/drive-target/handlers.ts`; `openapi/v1.yaml:3163,3199` | read + write of the two flags |

⭐ **This is a complete, correctly-built control.** ⛔ Nothing about it is defective.

### 3.2 ⛔⛔ THE FINDING — ⭐ THE SWITCH HAS NO READER

We searched every source file in the repository — all of `packages/` and `apps/`, every `.ts`,
`.tsx`, `.astro`, `.sql`, `.yaml`, `.json` — for `revealToPublic` and `reveal_to_public`.
⭐ **Every single non-test occurrence is in the list in §3.1**: the column, the constraint, the type,
the default, the resolver, the write path, the admin form, the admin API, and the OpenAPI schema.

⛔ **There is ⛔ NO occurrence in any code path that decides what a member or a visitor SEES.**

Three further facts, each independently checked:

1. ⛔ **`resolveEffectiveDriveTargetInr` — the function that reads the target figure — has ⛔ ZERO
   callers in the entire repository outside its own tests.** ⭐ Not one production caller; ⛔ not
   even the admin API.
2. ⛔ **`resolveDriveTargetVisibility` — the fail-closed reader cl.7(b)'s default exists to serve —
   has ⛔ ZERO callers outside its own tests.** ⚠ The admin API reads the raw row directly for the
   settings screen; ⛔ nothing consults the resolver to decide a render.
3. ⛔⛔ **`apps/public/` and `apps/mobile/` contain ⛔ ZERO references to the drive target in any
   form** — ⛔ not `driveTarget`, ⛔ not `targetInr`, ⛔ not `target_inr`. ⭐ Neither the public
   website nor the member app knows the figure exists.

### 3.3 ⚠⛔⛔ AND THE STRONGEST FACT — ⭐ A SHIPPED TEST ALREADY ASSERTS THE SWITCH HAS NO EFFECT

This is ⛔ not our characterisation. ⭐ It is a test that **runs on every build**, in
`apps/api/tests/integration/public-pages/sahyog-drive.spec.ts`. It sets a real target of
**₹1,234,567**, then — in its own words —

> *"…and REVEAL it to members and the public, so the test proves the PUBLIC SURFACE carries no
> target even in the state most likely to leak one."*

…writes `reveal_to_members = true, reveal_to_public = true`, requests the public index, and asserts
that the response contains none of `1234567`, `targetInr`, `target_inr`, `revealToMembers`,
`reveal_to_members`, `revealToPublic`, `reveal_to_public`.

⇒ ⭐⭐ **The programme has already codified, as a passing test, that turning your reveal switch ON
changes nothing a member or a visitor can see.** ⚠ That test is **correct for today's rulings** —
Story D has not shipped and the target is not meant to be on the index yet. ⛔ But it is also the
exact assertion that would have to be **narrowed** if cl.7(c) is meant to reach the public, and
nobody has been asked whether it should be.

### 3.4 ⚠ The same omission exists on the MEMBER axis

Story **E** (`11b-15`, the member's drive list, `ready-for-dev`) states, in its scope section:
*"⛔ no target (story **C** keeps it hidden)"*. ⛔ It carries no `revealToMembers` branch either.

⇒ ⛔⛔ **As the seven-story programme is currently written, `-190` cl.7(c) has ⛔ no consumer on
either axis it names.** ⭐ A Superadmin could set both switches on for every Pariwar in the country
and ⛔ no screen anywhere would change.

### 3.5 ⚖️ INFERENCE — ⛔ labelled as such

⚠ **We do ⛔ not know** whether this was intended. ⭐ Two readings are both coherent:

- **(A) It is a gap.** cl.7(c) reserved a disclosure act to the Trust; a reserved authority that
  can never be exercised is not a control, and `-196` cl.8 named Story D as the consumer.
- **(B) It is deliberate sequencing.** ⭐ You ruled the target *"BUILT but ⛔ NOT DISPLAYED"*
  (`-189` cl.2(c)/(d)) and cl.7(b) hides it. ⚠ Building the authority ahead of any surface is a
  perfectly ordinary thing to do, and the reveal may simply be for a later story nobody has written.

⛔ **We are ⛔ not asserting (A).** ⭐ That is the question.

---

## 4. ⛔⛔ Q2 — the finding, traced to SHIPPED STATE

### 4.1 ⭐ The sentence you ratified is ⛔ not in this repository

`packages/i18n/locales/en/sahyog-shared.json` and `.../hi/sahyog-shared.json` are the **one shared
Sahyog copy source** — the single-source rule you ratified at `2026-09-04-193` cl.3. ⭐ We listed
their **complete** contents. Both files hold **exactly these keys**:

```
$comment · stage.live · stage.closed · stage.verified
stage.live.help · stage.closed.help · stage.verified.help
stage.explainer.summary · stage.explainer.a11y
$comment.index_line · index_line.full · index_line.no_nominee
index_line.no_family · index_line.no_district
```

⛔ **There is no headline key.** ⭐ We then searched **every locale file in the repository** for the
sentence's distinctive fragments:

| Fragment | Files containing it, anywhere under `packages/i18n/locales/` |
|---|---|
| `"and counting"` | ⛔ **0** |
| `"lakh"` | ⛔ **0** |
| `"have stood with"` | ⛔ **0** |
| `"members have stood"` | ⛔ **0** |

⚠ The only near-match in the entire copy corpus is `close-of-cycle.json`, which says *"Every hand
**stood with this family**"* — ⭐ a **closed-cycle** outcome sentence, ⛔ the opposite of *"and
counting"*, in a different namespace, for a different surface.

### 4.2 ⚠⛔ And there are now TWO ratified money sentences, with ⛔ no rule about which goes where

On **2026-09-05** you ratified an **index line**, which Story B shipped on 2026-09-06 and which
Story D is required to render. Verbatim, from `sahyog-shared.json`:

> `index_line.full` — *"{amount} contributed by colleagues for {nominee_name}, nominee of Late
> {family_name}, who served in {district_name} district."*

⭐ Both sentences are yours. ⚠ They are ⛔ not interchangeable:

| | cl.6's headline | the 2026-09-05 index line |
|---|---|---|
| Leads with | ⭐ **participation** — *"16,750 members have stood with this family"* | ⭐ **the amount** |
| Carries a member count | ⭐ yes | ⛔ **no — none at all** |
| Names a private individual | ⛔ no | ⭐ yes — the nominee |
| Exists in the product | ⛔ **NO** | ⭐ yes, both locales |

⚠⛔ **cl.6 says *"THE DRIVE HEADLINE"* — singular — and your ruling that the headline is
"PARTICIPATION-FIRST" cannot be satisfied by the index line**, which carries no member count.

### 4.3 ⚠ A smaller, purely factual point about the figures

⭐ You already said the figures are illustrative (§2.2). ⚠ We note only that the ruled **form** does
not exist either. We **executed** the product's currency formatter rather than reading its
documentation:

```
formatCurrency(1945000, 'en')  =  "₹ 19,45,000"
formatCurrency(1945000, 'hi')  =  "₹ १९,४५,०००"
```

⇒ ⛔ the product renders `₹ 19,45,000`, ⛔ never `₹19.45 lakh`. ⚠ Rendering *"lakh"* means rounding
₹19,45,000 to *"19.45 lakh"* — ⭐ **a rounding rule nobody has ruled**, and one that interacts with a
separate open question (see §6.3). ⛔ We are ⛔ not asking you to rule the formatter; ⭐ we flag it so
that whoever authors the sentence knows a word-form does not exist yet.

### 4.4 ⛔⛔ Q3 — THE BAR'S OWN LABEL NAMES THE NUMBER YOU HID

⭐ We were asked what a reader sees around the bar that tells them what it is. ⚠ We read the shipped
render rather than describing it, at
`apps/mobile/components/active-contribution/ActiveContributionCard.tsx`. **In order down the card:**

| Position | What renders | The actual string |
|---|---|---|
| above the bar | days label | *"{days} days remaining in this cycle"* / *"इस चक्र में {days} दिन शेष"* |
| ⭐ **directly above the bar** | ⛔⛔ **the meter label** | ⛔ *"{confirmed} of {total} contributions confirmed"* / *"{total} में से {confirmed} अंशदान पुष्ट"* |
| on the bar | the screen-reader label | *"{confirmed} of {total} contributions confirmed so far"* |
| below the bar | the amount label | *"Raised so far"* / *"अब तक जुटाई गई राशि"* |
| below that | the amount | the rupee figure |

⛔⛔ **THE LABEL STATES BOTH OPERANDS, INCLUDING THE DENOMINATOR.** On the member's own card today
`{total}` is the pool's roster — *"412 of 500 contributions confirmed"*. ⚠ **On the public drive, the
ruling makes the denominator the rupee target.** ⇒ rendering the shipped label unchanged prints the
hidden target, **as a number, in words, in both languages**, directly above the bar.

⚠ ⭐ **This is a different channel from the one already recorded.** A separate open item (`D3`) is
that the bar's **fill width** lets the target be *recovered by division*. ⛔ This is not a recovery —
⭐ **it is the number itself, printed.**

⚠⛔ **AND SUPPRESSING THE LABEL IS ⛔ NOT OBVIOUSLY THE ANSWER EITHER.** cl.8 rules that *"the UI
carries the understanding"* and that *"the arithmetic is SHOWN, ⛔ never ASSERTED."* ⭐ A bar with
⛔ no label is a coloured rectangle: it shows nothing and asserts nothing. ⇒ the public bar needs
**copy that says what it measures without naming what it measures against** — ⛔ and no such string
exists, in either language.

⭐⭐ **AND Q3 INTERLOCKS WITH Q1.** ⚠ If you answer **Q1 as §6.1(i)** — the Superadmin's public reveal
does reach the screen — then for a Pariwar with the switch **ON** the shipped label is ⛔ **not** a
leak at all: it names a figure that Pariwar has chosen to publish. ⇒ **Q3 then applies only to
Pariwars with the reveal OFF.** ⛔ We are ⛔ not using that to steer your answer to Q1; ⭐ we state it
so the two are not answered as though independent.

---

## 5. ⚖️ Stated fairly, in both directions

⭐ **What is ⛔ NOT wrong here.**

- ⛔ Nothing you ruled is contradictory. cl.6, cl.7(b), cl.7(c) and the 2026-09-05 index line are
  each coherent; ⭐ what is missing is a **bridge** between two of them and the build.
- ⛔ Story C is ⛔ not defective. It built exactly what cl.7 describes and, per `-196` cl.8, was
  explicitly told ⛔ not to render anything.
- ⛔ Story B is ⛔ not obviously defective either. ⚠ It shipped the sentence you ratified **on
  2026-09-05** into the shared source. ⭐ Whether it also owed the **2026-09-04** headline is exactly
  the ambiguity in Q2 — ⛔ we are ⛔ not accusing it of an omission.
- ⭐ Neither question blocks the majority of Story D. The listing, the sections, the meter's
  no-target path and the staleness disclosure proceed regardless.

⚠ **What is genuinely at risk if we guess.**

- ⛔ If we guess on **Q1** and stay silent, a `super_admin`-only authority you described as *"a
  disclosure act"* becomes permanently inert, ⛔ with no record saying so — ⭐ and the person who
  toggles it will believe they have published something.
- ⛔ If we guess on **Q1** the other way, we put a rupee target on a public page on our own reading
  of a clause — ⚠ **a disclosure act performed on an inference.** ⭐ That is precisely the class of
  act this Panel has reserved to itself.
- ⛔ If we guess on **Q2**, we author or translate a Trustee-ratified sentence at a render site —
  ⭐ recreating the two-source drift that `-193` cl.3 exists to prevent, on the one sentence where
  wording is yours.

---

## 6. The options

### 6.1 Q1 — the drive target's public reveal

- **(i) ⭐ cl.7(c) IS MEANT TO REACH THE SCREEN, AND STORY D BUILDS IT.** When a Superadmin sets
  `reveal_to_public`, the public surface shows the target; when they set `reveal_to_members`, the
  member surface does. ⛔ Default stays hidden. ⚠ **Cost, stated honestly:** a second render path and
  a second copy string on both surfaces; the *"no comparison-to-target framing"* commitment
  (`-189` cl.2(c), Story 7.8) needs an explicit carve-out for the revealed case; and the shipped
  test in §3.3 must be **narrowed** — ⭐ narrowed and named, ⛔ never deleted.
- **(ii) ⭐ cl.7(c) IS A BUILT-AHEAD AUTHORITY; ⛔ NO SURFACE IS OWED YET.** ⛔ Story D changes
  nothing. ⚠ **Then we ask one thing of you:** let us **record openly** that the switch is inert on
  both axes and name the story that will make it live — ⛔ a deferral naming an *epic* expires
  unowned, so it must name a story that exists. ⭐ Zero build; ⛔ nothing hidden.
- **(iii) ⭐ THE REVEAL WAS MEANT FOR MEMBERS ONLY.** ⚠ cl.7(c) says *"separately for member and for
  public"*, so this would be a **narrowing** of what you ruled — ⛔ we do not propose it, ⭐ but if
  the public half was never the intent, saying so retires the question cleanly and the
  `reveal_to_public` column and its CHECK can be recorded as reserved.

⭐ **We recommend ⛔ nothing here.** ⚠ (i) and (ii) are both fully coherent readings of your own
words, and the difference between them is an intent only you hold.

### 6.2 Q2 — the live drive's headline ⚠ **NARROWED — see §0**

⛔ **WITHDRAWN: the three "which surface" options this section first carried.** ⭐ The record answers
it — **Live** rows take cl.6's headline, **Closed** and **Verified** take the 2026-09-05 index line.
⚠ We are ⛔ not asking you to rule what you have already ruled.

⭐ **What actually remains is one question about authorship, and it may not even be yours:**

- **(i) ⭐ BigDev AUTHORS IT — you have already delegated this.** `-189` cl.2(e) says *"the exact
  wording delegated to BigDev"*, and cl.6 adopted option (B) as the shape. ⇒ ⭐ BigDev writes the
  final English and the Hindi and it ships; ⛔ nothing comes back to you. ⚠ **The one caveat we owe
  you:** ⛔ **no Hindi was ever ratified for this sentence** — cl.6's adopted wording is English only,
  and this is a public memorial page in a bilingual product.
- **(ii) ⭐ YOU SEE IT FIRST.** ⭐ BigDev drafts both languages; you confirm before it ships.
  ⚠ One round, ⛔ no build blocked meanwhile.
- **(iii) ⭐ YOU GIVE THE WORDING**, as you did for the 2026-09-05 index line.

⚠ **In every case, one small thing needs a decision from whoever authors it:** the amount. ⭐ The
product produces **`₹ 19,45,000`** (verified by execution). ⛔ It does ⛔ not produce *"₹19.45 lakh"* —
that is a **word-form plus a rounding rule**, and neither exists. ⚠ Rounding also interacts with `D3`
(§6.4).

### 6.3 Q3 — what the public bar's label says

- **(i) ⭐ A LABEL THAT NAMES ⛔ NO DENOMINATOR.** e.g. *"Contributions confirmed so far"* with the
  count, and the amount below — ⭐ the count and the amount are already ruled public (cl.2(e), cl.6).
  ⚠ **What is lost, stated plainly:** the bar's **width** then means something the words do not
  explain, and a reader may read a nearly-full bar as *"nearly done"* with ⛔ no way to know
  done-against-what.
- **(ii) ⭐ ⛔ NO LABEL — the bar is decorative.** ⭐ Simplest, and it leaks nothing. ⚠ ⛔ But cl.8 says
  the UI must carry the understanding; a rectangle carries none, and an unexplained bar on a page
  about a bereaved family may read worse than no bar.
- **(iii) ⭐ ⛔ NO BAR ON THE PUBLIC SURFACE AT ALL** — the Live row shows the headline figures only.
  ⚠ This would **narrow `-189` cl.2(b)** (*"each carries a progress bar"*), so ⛔ we do not propose
  it; ⭐ we list it because it is the one option that retires Q3 and `D3` together.
- **(iv) ⭐ THE LABEL NAMES THE TARGET WHERE THE TARGET IS REVEALED** — i.e. **Q1(i)**, and the
  shipped label is then correct as it stands for those Pariwars. ⛔ Only available if Q1 is answered
  that way.

### 6.4 ⚠ One interaction you should know about before answering

⭐ A separate open question on this story (**`D3`**, ⛔ not escalated here) is that the progress bar's
**fill geometry** lets a reader recover the hidden target by division, from two figures the story
publishes on purpose. ⚠ **Two of your answers here move it:**

- ⭐ If **Q1(i)**, then for any Pariwar with the public reveal ON there is **⛔ nothing hidden to
  recover** — D3 narrows to Pariwars with the switch OFF.
- ⚠ If **Q2** produces a **coarsened** amount (*"19.45 lakh"* rather than an exact rupee figure),
  the division becomes **less** precise — ⭐ which is one of D3's own candidate mitigations arriving
  from an unrelated direction.

- ⚠ **`Q3` is the same channel, only blunter.** `D3` is the target **recovered by division**; Q3 is
  the target **printed in the label**. ⇒ ⛔ an answer to Q3 that removes the denominator from the
  words does ⛔ **not** close `D3`, and ⭐ an answer to Q1 that reveals the target closes **both**, for
  the Pariwars that reveal it.

⛔ **We are ⛔ not asking you to rule D3.** ⭐ We flag the interactions so your answers here are not
made in ignorance of them.

---

## 7. ⭐ How every fact above was established — ⛔ re-runnable

⚠ Stated so that nothing here has to be taken on our word. All run against commit `f15c3bb9`.

| Claim | How it was checked |
|---|---|
| The reveal switch has no reader | Exhaustive search for `revealToPublic\|reveal_to_public` across `packages apps openapi scripts`, all source extensions, excluding build output. **Every** hit classified; ⛔ none in a member- or public-facing render path. |
| `resolveEffectiveDriveTargetInr` has no caller | Search for the identifier across `packages/*/src apps/*/src`. ⭐ Only its own definition. |
| `resolveDriveTargetVisibility` has no caller | Same. ⭐ Only its own definition and one doc reference. |
| The public/member apps don't know the target exists | Search for `driveTarget\|DriveTarget\|targetInr\|target_inr\|drive.target` across `apps/public/src` and `apps/mobile`. ⛔ Zero hits. |
| The shipped test asserts the reveal is inert | Read `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:350-392` — it writes `reveal_to_public = true` then asserts seven target-related tokens are absent from the response. |
| Only `super_admin` holds the reveal key | **Executed** `bundleForRole(role)` from the built domain package for all five roles and tested membership of both keys. Output in §3.1. ⛔ Not read off the catalog's own comments. |
| The headline does not exist | Full key dump of both `sahyog-shared.json` files (14 keys each, listed in §4.1) + a case-insensitive search of **all** files under `packages/i18n/locales/` for four distinct fragments. ⛔ Zero hits each. |
| The formatter produces `₹ 19,45,000` | **Executed** `formatCurrency` from the built package and captured its output for `en` and `hi`. |
| All ratified quotations | Copied verbatim from `.decision-log.md`, decisions `2026-09-04-189`, `-190`, `-196`. |
| What renders above and below the bar | Read the render in order at `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` (days label, meter label, the bar with its screen-reader label, the amount label, the amount) and resolved each key to its actual string in **both** locale files. ⛔ Not described from the component's own comments. |
| The meter label names its denominator | The key `active_contribution.progress` resolves to *"{confirmed} of {total} contributions confirmed"* (en) and *"{total} में से {confirmed} अंशदान पुष्ट"* (hi), read from `packages/i18n/locales/{en,hi}/contribution.json`. |
| The Live/Closed sentence split (§0) | Traced through the ratified record: `-189` cl.2 heading and cl.2(e) → `-190` cl.6; and the 2026-09-05 index line against `SAHYOG_DRIVE_VISIBLE_POOL_STATES = ['closed','settled']`, still the shipped value. |

⚠⛔ **AND WHAT WE DELIBERATELY DID ⛔ NOT USE.** ⛔ No claim above rests on a code comment, a
doc-block, a story file's own prose, or a prior review's summary. ⭐ Where a comment is quoted (the
test's own description in §3.3), it is quoted **alongside** the executable assertion it describes,
⛔ never in place of it.

---

## Appendix A — In plain words

### The first question

Some months of drives raise a target amount. You decided two things about that target: **ordinary
Pariwar administrators can set it**, and **only the Trust itself can decide to show it to anyone** —
and you were specific that showing it to members and showing it to the public are two separate
switches.

⭐ We built all of that. The switches exist, the database refuses the one combination you forbade,
and only a Superadmin can touch them.

⛔ **But we never built anything that looks at the switches.** If a Superadmin turns the public
switch on today, nothing happens. No page changes. ⭐ We only found this because we searched for
every place in the code that reads the switch, and there were none — and then found a test we
ourselves wrote that deliberately turns the switch on and checks that nothing appears.

⚠ That test is right for today. ⭐ The question is whether it should stay right forever. Either you
meant the switch to actually show the number one day — in which case the story we are about to build
is where that happens — or it was always meant to sit unused until some later decision, ⛔ in which
case we want to write that down plainly rather than leave a control that quietly does nothing.

### The second question

You approved a sentence for the top of a drive: *"16,750 members have stood with this family —
₹19.45 lakh, and counting."* ⭐ You told us the numbers in it were just an example.

⛔ **That sentence is not written down anywhere in the product.** We checked every copy file in both
English and Hindi. The words *"and counting"* and *"lakh"* do not appear in a single one.

⚠ We first also asked you *where* it should go, because a month later you approved a **different**
money sentence for the list. ⭐ **We should not have asked that** — your own record answers it, and
we have withdrawn the question. The list will have three kinds of row: drives still running, drives
closed, and drives verified. **Your first sentence — the one with *"and counting"* — is for the
drives still running.** **The later sentence, which speaks of contributions in the past tense, is for
the closed and verified ones.** ⭐ That is what you ruled; ⛔ we just had not traced it.

⇒ **What is left is only this:** the running-drive sentence has never actually been written into the
product, in either language, and the English you approved has no Hindi twin. ⭐ You once told us to
choose the wording ourselves. ⚠ We are happy to — ⛔ we would just rather ask than assume, on a
public page about a family who has died.

### The third question

Under the bar, and above it, there is a small line of words telling the reader what the bar means.
Today it reads: **"412 of 500 contributions confirmed."**

⛔ **That line names the total.** On a member's own screen the total is the number of colleagues in
their pool, which is fine. ⚠ **On the public page the total becomes the target amount** — ⭐ the very
figure you decided should not be shown to anyone.

⇒ if we leave the line as it is, the bar built to hide the target **prints it**. ⛔ If we delete the
line, the public sees a coloured bar with no words at all, on a page about a family, filling up
toward something nobody explains — ⚠ and you told us the page itself must carry the understanding.

⭐ So we need to know what that line should say. ⚠ And it is worth knowing that **if you answer the
first question by letting the Trust reveal the target, this third question mostly disappears** — the
line would then be naming a number that Pariwar had chosen to publish.

### What happens meanwhile

⭐ Most of the story is unaffected and proceeds: live drives get listed, the sections and stage words
work, the progress bar's behaviour when no target is set is settled, and we will state plainly how
stale the figures can be.

⛔ Two things wait for you: **the meter's treatment of the reveal switch**, and **the headline's
words and its surface**. ⛔ Nothing is being built on a guess about either.

---

## 11. ✅ THE PANEL'S ANSWERS — **DR + KB, 2026-09-07** — ⭐ and the four things they open

### 11.1 ⭐ Answered verbatim

| # | Question | The Panel's answer, verbatim |
|---|---|---|
| **Q1** | Does cl.7(c)'s reveal reach a screen? | *"of course the switches are meant to show the number one day."* |
| **Q2** | The Live drive's headline | **EN:** *"19,45,000 and counting, by 43,000 colleagues—and still going strong!"* · **HI:** *"43,000 सहकर्मियों द्वारा 19,45,000 का योगदान अभी तक... योगदान जारी है!"* |
| **Q3** | The bar's label | *"Around bar above or below do not show '412 of 500 contributions confirmed.' Instead it would show —"* **HI:** *"43 हज़ार सहकर्मियों द्वारा 19.45 लाख का योगदान अभी तक... योगदान जारी है!"* · **EN:** *"19.45 lakh and counting, by 43,000 colleagues—and still going strong!"* |

### 11.2 ✅ What is now SETTLED

- ⭐⭐ **Q1 — §6.1 option (ii) is REFUSED.** The reveal is ⛔ not a built-ahead authority owed no
  surface. ⇒ **INFERENCE (A) at §3.5 was right**, and the switch is **owed a consumer**. ⭐ The shipped
  test asserting the switch is inert is therefore **correct-until-that-consumer-ships** and owes a
  **narrowing**, ⛔ never a deletion.
- ⭐⭐ **Q3 — §6.3 option (i).** The bar carries a **participation sentence naming ⛔ no denominator**.
  ⇒ ⭐ **the target-printing channel is CLOSED.** ⚠ The cost stated at §6.3(i) — the bar's **width**
  now means something the words do not explain — is **accepted**, ⛔ not re-opened.
- ⭐ **Q2 — §6.2 option (iii).** The Panel gave the wording rather than delegating it. ⭐ **The Hindi
  rider is discharged**: a Hindi sentence now exists where cl.6 had English only. ⭐ And both Hindi
  strings use **Latin numerals**, which ⭐ already complies with the **amendment-A2** contract — ⛔ no
  further ruling needed.
- ⭐ *"colleagues"* / *"सहकर्मियों"* matches the shipped `index_line.*` exactly ⇒ ⭐ cl.6's earlier
  *"members"* is superseded by this wording and the two stages speak in one voice.

### 11.3 ⏳ FOUR FOLLOW-UPS — ⛔ none is a re-litigation

**(1) ⭐⭐ ARE Q2 AND Q3 ONE SENTENCE, OR TWO?** ⚠ They are **the same sentence in two number forms**:

| | amount | count |
|---|---|---|
| **Q2** (headline) | `19,45,000` | `43,000` |
| **Q3** (around the bar) | `19.45 lakh` / `19.45 लाख` | `43,000` / `43 हज़ार` |

⇒ if **both** render, a Live row shows the same sentence **twice**. ⭐ Our reading is that there is
**ONE** sentence on a Live row and it sits **around the bar** — ⛔ but we will ⛔ not assume it.
⚠⛔ **AND IT MOVES `D3`:** if only the **coarsened** form renders, recovery-by-division is materially
weakened; ⛔ if the **exact** figure also renders in a headline, that channel stays open.

**(2) ⛔⛔ ⛔ NO `₹` APPEARS IN ANY OF THE FOUR STRINGS.** ⚠ Today the product's only money formatter
produces **`₹ 19,45,000`** (verified by execution). ⭐ The ratified strings read *"19,45,000"* and
*"19.45 lakh"* — **bare**. ⇒ **is the `₹` dropped deliberately, or omitted in shorthand?**
⚠⛔ **It matters across stages:** the **Closed · Verified** sentence (`index_line.*`) begins
*"{amount} contributed by colleagues…"*, and its `{amount}` form is ⛔ **still undecided**. ⇒ as
written, Closed rows could show `₹ 19,45,000` beside Live rows showing `19,45,000` — ⭐ two money
forms on one page.

**(3) ⭐ THE WORD-FORMS NEED A ROUNDING RULE — ⛔ AND A FORMATTER THAT DOES ⛔ NOT EXIST.** ⚠ Verified:
*"lakh"*, *"लाख"*, *"हज़ार"* and *"crore"* appear in **⛔ ZERO** copy or code files in this repository.
⇒ we must be told:
- ⚠ `19,45,000` → *"19.45 lakh"* is **two decimal places of a lakh**. What is `19,45,678`? *"19.46
  lakh"* (rounded) or *"19.45 lakh"* (truncated)?
- ⚠ `43,000` → *"43 हज़ार"*. What is `43,472`? *"43 हज़ार"*, or *"43.5 हज़ार"*?
- ⚠ **The two languages abbreviate differently in the same answer** — Q3's Hindi says *"43 हज़ार"*
  while its English keeps *"43,000"*. ⭐ Intended, or should English read *"43 thousand"*?
- ⚠ And below what value does the word-form stop? *"0.05 lakh"* would be an odd thing to print on a
  drive that has just opened.

**(4) ⏳ *"one day"* IS ⛔ NOT A STORY — AND `D6`'s ANSWER REMOVED THE SLOT.** ⭐ Two parts:
- ⚠ **Does THIS story build the reveal, or a named later one?** ⛔ A deferral naming an *epic* expires
  unowned; it must name a **story key that exists**.
- ⚠⛔⛔ **AND THE HARDER HALF:** the label the Panel just chose names ⛔ **no denominator at all**. ⭐ The
  old label (*"412 of 500"*) was the natural place a revealed target would have appeared. ⇒ **when a
  Superadmin turns the public switch ON, ⛔ WHERE does the number render?** A second line? Inside the
  same sentence? ⛔ We will ⛔ not invent a slot.

### 11.4 ⚠ One observation, ⭐ recorded once and ⛔ not pressed

⚠ *"—and still going strong!"* / *"योगदान जारी है!"* is an **energetic** register on a page that is
also a bereaved family's record. ⭐ `-189` cl.2(f) expressly rules the purpose — the surface should
show what the trust does *"in such a way they get motivated to join"* — ⇒ ⭐ **this may be exactly the
intended tone, and the Panel has ruled it.**
⚠ We note only that the 2026-09-05 routing note's §7.1(6) set the counter-constraint in the Panel's
own service: *"It is a public memorial page. It must never read as 'not enough people helped', and
⛔ never as an advertisement placed on a family's record."* ⇒ ⭐ **recorded so both constraints sit in
one place**; ⛔ we are ⛔ not asking for a change, and ⛔ nothing is blocked on it.


---

## 12. ✅ THE FOUR FOLLOW-UPS ANSWERED — **DR + KB, 2026-09-07** — ⚠ and THREE new questions the answers open

⚠⛔ **ATTRIBUTION.** Relayed as *"DR and KP"*. ⭐ `2026-09-05` already established the rulings are
**DR + KB** (Kalpana Bharti) and recorded *"KP"* as a **typo**. ⇒ ⭐ recorded here as **DR + KB**;
⛔ correct us if a third person is meant.

### 12.1 ⭐ Answered verbatim

| # | Answer |
|---|---|
| **1** | *"One sentence on a running drive"* |
| **2** | *"Yes rupee sign should appear"* |
| **3** | *"Cut off. Begin cutting off only if amount contibuted exceeds 10 lakh, till then show exact number - this applies to Live drive. For Closed,verified shows exact figure. For colleagues shows exact number."* |
| **4** | *"Target is revealed in Live drive. On right top or right of progress bar 'Expected: 50 lakh' where 50 lakh is target amount."* |

### 12.2 ✅ Settled

- ⭐ **`D5` follow-up 1 CLOSED** — ⛔ **ONE** sentence on a Live row, at the bar. ⛔ No second headline.
- ⭐ **`D5` follow-up 2 CLOSED** — the **`₹`** appears. ⇒ ⭐ it also settles `index_line.*`'s `{amount}`
  form for Closed · Verified: **exact rupees with the sign**.
- ⭐ **`D5` follow-up 3 CLOSED** — **TRUNCATE, ⛔ never round up**; the short form applies **⛔ only on
  Live**, and **⛔ only above ₹10 lakh**. ⭐ Closed · Verified always exact. ⭐ Colleague counts always
  exact ⇒ ⭐ **the *"43 हज़ार"* form is DROPPED** and the language asymmetry is resolved.
- ⭐ **`D4` / `D6` follow-up 4 — the SLOT IS NAMED:** *"Expected: 50 lakh"*, right-top or right of the
  bar. ⇒ ⭐ `D6`'s *"the bar's width means something the words do not explain"* cost is **retired** —
  the words now explain it.

### 12.3 ⚠⛔ THREE NEW QUESTIONS THE ANSWERS OPEN — ⛔ none is a re-litigation

**(A) ⛔⛔ IS THE EXPECTED FIGURE ALWAYS SHOWN, OR ONLY WHERE THE SWITCH IS ON?** ⚠ `-190` **cl.7(b)**
rules the target *"⛔ NOT visible to member or public"* and **cl.7(c)** reserves revealing it to a
Superadmin. ⭐ Answer 4 puts it on the page. ⇒ **two readings, and they differ materially:**
- **A1 — always shown on Live rows.** ⇒ ⛔ **cl.7(b) is SUPERSEDED**, and `revealToPublic` has ⛔
  nothing left to gate (⚠ or inverts into a *hide* switch).
- **A2 — shown where a Superadmin has switched it on.** ⇒ ⭐ cl.7(b)/(c) stand and the switch finally
  has a consumer. ⚠⛔ **But the default is FAIL-CLOSED for every Pariwar** ⇒ ⛔ **on the day this
  ships, ⛔ no expected figure renders anywhere** until someone acts.
⛔ We will ⛔ not choose between a supersession and a switch-read on our own.

⚠⛔ **AND TWO CONSEQUENCES TRAVEL WITH EITHER READING:**
1. ⭐ **`-189` cl.3 — *member ≥ public*.** If the public sees the expected figure, **story E
   (`11b-15`) must show it to members too** — ⛔ it currently says *"no target"*. ⭐ Recorded as a
   change we will make, ⛔ not a question.
2. ⚠⛔⛔ **POOL-REALITY #2 IS RE-OPENED, AND IT WAS CLOSED BY THE THING THIS CHANGES.** `-189` cl.2(c)'s
   own consequence block reads: *"⭐⭐ **AND (c) IS WHAT RESOLVES POOL-REALITY #2** … a bar with ⛔ no
   visible target is ⛔ not a comparison to a target."* ⇒ ⛔ **naming the target beside the bar makes
   it a comparison again**, which Story 7.8 and 11b.1's AC5 forbid, and whose ⛔ only current
   resolution was the target's invisibility. ⚠ *"Expected ₹50 lakh"* beside a bar at 39% lets a
   visitor read that a family is **short** — the *"not enough people helped"* shape the 2026-09-05
   note's §7.1(6) ruled out. ⭐ **The Panel may want exactly this** (cl.2(f): the surface should make
   people *"get motivated to join"*) — ⛔ but it must be **ruled**, ⛔ not inherited.

**(B) ⭐ HOW IS THE EXPECTED FIGURE ITSELF WRITTEN?** ⚠ Three details, ⛔ none settled:
- ⛔ **Does it carry the `₹`?** Answer 4 writes *"Expected: 50 lakh"*; answer 2 says the sign appears.
- ⛔ **Does the ₹10-lakh cut-off apply to it?** A target of ₹8,00,000 → *"₹8,00,000"* or *"₹8 lakh"*?
  ⚠ Answer 3 scopes the rule to *"amount contributed"*, ⛔ not to the target.
- ⛔ **The Hindi word.** ⛔ Not given. ⭐ We would use **लक्ष्य**; ⚠ **अपेक्षित** is the literal
  *"expected"*. ⛔ Not ours to pick unasked.

**(C) ⚠ THE CUT-OFF CHANGES SHAPE MID-DRIVE — ⭐ confirming, ⛔ not querying the rule.**
₹9,99,900 → *"₹9,99,900"* · ₹10,00,000 → *"₹10,00,000"* (⭐ *"exceeds"* ⇒ ten lakh exactly stays
exact) · ₹10,00,300 → *"₹10.00 lakh"*. ⇒ ⭐ a visitor watching a drive sees the figure **change form**
as it crosses the line. ⛔ Intended, we assume — ⭐ confirm and it is closed.

### 12.4 ⭐ THE BAR'S MOTION — BigDev asked for a ripple; ⚠ ONE reservation, ⛔ then it is theirs

⭐ Three treatments are rendered in the preview: **(A)** fills once on load then rests · **(B)** fills,
then a slow shine every few seconds · **(C)** the continuous rightward ripple as described.
⚠⛔ **THE RESERVATION, STATED ONCE:** a continuously-moving bar reads as *"money is arriving right
now"*. ⭐ `/sahyog` is edge-cached at **`s-maxage=300`** (Trap 3) ⇒ the figure can be **five minutes
old** and ⛔ will not change while the visitor watches. ⇒ ⛔ **(C) asserts something the page cannot
honour**; ⭐ (A) and (B) do not. ⛔ Not a refusal — ⭐ **BigDev's call**, recorded either way.
⭐ All three respect `prefers-reduced-motion` and render the finished bar with ⛔ no motion.
⭐ Motion applies to **Live rows only** — Closed · Verified carry ⛔ no bar.


---

## 13. ✅✅ §12.3 ANSWERED — **DR + KB, 2026-09-07** — ⭐ `D4` CLOSES, and cl.7(b)/(c) STAND

### 13.1 ⭐ Answered verbatim

> *"expected figure shows only when Trust switches on. And it should be turned off.*
> *Expected figure always in Lakh or Crore.*
> *Cut off at Exactly ten lakh."*

### 13.2 ✅✅ **`D4` IS CLOSED — AND IT CLOSES THE RIGHT WAY**

⭐⭐ **§12.3(A) is answered as A2.** ⛔ `-190` **cl.7(b)** and **cl.7(c)** are ⛔ **NOT** superseded —
they **STAND**. ⇒ ⭐⭐ **`revealToPublic` finally acquires a CONSUMER, and Story D builds it:**

| | Before | After this ruling |
|---|---|---|
| The switch | ⛔ **zero** production readers | ⭐ read by the public Live row |
| Default state | fail-closed, frozen | ⭐ **unchanged — and the Panel confirms it stays OFF** |
| What launches | — | ⛔ **⛔ no expected figure anywhere**, until a Superadmin acts |

⭐ **The shipped test that asserts the switch is inert** (`public-pages/sahyog-drive.spec.ts`, which
writes `reveal_to_public = true` then asserts seven target tokens are absent) is now **NARROWED, ⛔ not
deleted** — it becomes *"absent while the switch is OFF"*, and gains a mirror case for ON.

⚠ *"And it should be turned off"* is read as **confirming the ruled fail-closed default and directing
that ⛔ no Pariwar be switched on at launch.** ⭐ ⛔ Nothing is switched on today — ⛔ no visibility row
exists for any Pariwar — so ⛔ no action is required to comply; ⭐ the state is already correct.

### 13.3 ✅ **POOL-REALITY #2 — the concern is CONDITIONAL, ⛔ no longer live**

⭐⭐ §12.3(A)(2) raised that naming the target beside the bar re-opens what `-189` cl.2(c) closed.
⇒ ⭐ **with the switch OFF, ⛔ it does not arise at all** — the bar carries ⛔ no visible target, which
is exactly cl.2(c)'s own resolution. ⛔ The concern is ⛔ **not withdrawn**; ⭐ it is **deferred to the
act that would trigger it**, and is recorded **against the switch itself** so that whoever first
turns it on meets it before they do.
⚠ Likewise `-189` cl.3 (*member ≥ public*): ⭐ it binds ⛔ only where a Pariwar has revealed publicly.
⇒ story **E** must show the figure to members **on that same condition** — ⛔ not unconditionally.

### 13.4 ✅ §12.3(C) ANSWERED — ⚠ **AND IT MOVES THE BOUNDARY**

⛔ *"Cut off at **Exactly** ten lakh"* **supersedes** the earlier *"only if amount contributed
**exceeds** 10 lakh"*. ⇒ the test is **`>=`**, ⛔ not `>`:

| Contributed | Shown |
|---|---|
| ₹9,99,900 | **₹9,99,900** — exact |
| **₹10,00,000** | ⭐ **₹10 lakh** — ⚠ the short form **begins here**, ⛔ it was exact under the earlier wording |
| ₹19,45,678 | **₹19.45 lakh** — cut off, ⛔ never 19.46 |
| 6,485 colleagues | **6,485** — counts exact at every size |

### 13.5 ✅ §12.3(B) PARTLY ANSWERED — ⭐ the target is **always** short-form

⭐ *"Expected figure always in Lakh or Crore"* ⇒ ⛔ **the ₹10-lakh cut-off does ⛔ NOT apply to the
target** — a ₹8,00,000 target renders **₹8 lakh**, ⛔ never ₹8,00,000. ⇒ ⭐ **two different rules, and
that is deliberate:** the *contributed* amount is exact below ten lakh; the *target* never is.

⚠⛔ **THREE DETAILS REMAIN, AND WE ARE BUILDING THEM AS ASSUMPTIONS — ⭐ stated, ⛔ not silent:**

| Detail | What we build | Ground |
|---|---|---|
| The `₹` on the target | **Expected ₹50 lakh** | ⚠ the Panel's example wrote *"50 lakh"*, ⛔ but §12.1 answer 2 rules the sign appears — ⭐ the general rule is applied |
| Where lakh becomes crore | **₹99.99 lakh → ₹1 crore** | ⭐ the natural join; `MAX_DRIVE_TARGET_INR` is **₹10 crore**, so crore is reachable |
| Trailing zeros | **₹50 lakh**, ⛔ not ₹50.00 lakh | ⭐ matches the Panel's own writing |

⏳ **AND ONE WE WILL ⛔ NOT ASSUME — THE HINDI WORD.** ⛔ Not given, twice asked. ⭐ We would write
**लक्ष्य** (*goal*) over **अपेक्षित** (the literal *expected*, which reads stiffly beside the ruled
sentence's register). ⛔ One word settles it.

### 13.6 ⏳ Outstanding

- ⏳ **The Hindi word for *"Expected"*** — the Panel's.
- ⏳ **The bar's motion** — ⭐ BigDev's, ⛔ not the Panel's. Three treatments rendered; recommendation
  **(A) fills once, then rests**, on the `s-maxage=300` honesty ground at §12.4.


---

## 14. ✅ CLOSED OUT — 2026-09-07

### 14.1 ✅ The bar's motion — **RULED (A) by BigDev**

⭐ **The bar grows from nothing on page load, then holds still.** ⛔ No continuous ripple, ⛔ no
repeating shine. ⭐ Ground, recorded: `/sahyog` is edge-cached at **`s-maxage=300`**, so a
continuously-moving bar would assert money is arriving while a visitor watches, which the page ⛔
cannot honour (§12.4).
⭐ CSS-only (`@keyframes` on width, `animation-fill-mode: both`) — ⛔ no JS, ⛔ no library on a static
Astro page. ⭐ `prefers-reduced-motion: reduce` renders the finished bar with ⛔ no motion.
⭐ **Live rows only** — Closed · Verified carry ⛔ no bar.

⚠⛔ **AND ONE CONSEQUENCE WE ARE DECIDING, ⛔ not asking.** `D6` removed the visible label
(`active_contribution.progress`); its **screen-reader twin** (`active_contribution.progress_a11y`)
carries the **same `{confirmed} of {total}` shape** and would name the denominator to assistive tech.
⇒ ⭐ **the bar is `aria-hidden` and the ruled sentence beneath it carries the meaning.** ⛔ Nothing is
announced twice, and ⛔ no new a11y string is minted that would name a hidden figure.

### 14.2 ⏳ The Hindi word for *"Expected"* — proceeding on the stated default

⛔ Asked twice, ⛔ not answered. ⇒ ⭐ we build **लक्ष्य**, as declared at §13.5, and it stays
**revocable on one word**. ⛔ Recorded as an assumption, ⛔ not as a ruling.

### 14.3 ⚠⛔⛔ `D3` IS ⛔ **NOT** CLOSED BY ANY OF THIS — ⭐ and its shape barely moved

⚠ It would be easy to read the last three days as having closed `D3`. ⛔ **They did not.** ⭐ Traced,
⛔ not assumed:

- ⭐ The **target is hidden by default** (§13.2) ⇒ ⛔ there is still a hidden figure to recover.
- ⭐ The bar's **fill is a rendered percentage** — `amount / target`, an integer 0–100 in the markup.
- ⚠⛔ **BELOW ₹10 lakh the amount renders EXACTLY** (`₹8,55,000`) ⇒ `target ≈ 8,55,000 ÷ 0.17`.
  ⭐ With the percentage rounded to a whole number the band is roughly **±3%** — ⛔ recovery, ⛔ not
  noise.
- ⚠ **Above ₹10 lakh** the amount is cut to two places of a lakh (±₹500 on ~₹19 lakh ≈ **±0.03%**)
  ⇒ the band is still set by the **percentage's** rounding, ⛔ not the amount's. ⭐ **The cut-off
  barely helps.**

⇒ ⛔ **`D3` remains OPEN and still blocks Task 3's denominator wiring.** ⭐ Its three recorded options
stand: **(i)** quantize/band the rendered fill · **(ii)** accept-and-record with a re-examination
trigger · **(iii)** escalate. ⚠ ⛔ It is ⛔ **not** the Panel's by default — it was routed to BigDev
from Story C — ⭐ but §13.3's finding now applies to it too: **with the switch OFF there is a hidden
figure; with it ON for a Pariwar, ⛔ nothing about that Pariwar is hidden and `D3` does not arise.**


---

## 15. ⏳⛔⛔ `D3` IS ESCALATED TO THE PANEL — BigDev's direction, 2026-09-07

⭐ `D3` was **routed to BigDev from Story C** and has stood open since 2026-09-06. ⇒ ⭐ BigDev now
**escalates it**, the Panel being available. ⛔ It is ⛔ **not** re-opening anything the Panel ruled —
⭐ it is the **consequence of two of their rulings being true at once**, and it is the last thing
blocking Task 3.

### 15.1 ⛔ The finding, in one line

The page publishes **the amount** and **the bar**. ⭐ The bar's width **is** `amount ÷ target`.
⇒ ⛔ **dividing one by the other returns the target** — the figure `-189` cl.2(c) and `-190` cl.7(b)
say is not displayed.

### 15.2 ⭐ How precisely — **computed, ⛔ not estimated**

⚠ Against a hidden ₹50 lakh target, with the bar rendered to the nearest whole percent:

| Drive shows | Bar | Reader recovers | Band |
|---|---|---|---|
| ₹1,50,000 | 3% | ₹42.9 – 60.0 lakh | ± 17.1% |
| ₹8,55,000 | 17% | ₹48.9 – 51.8 lakh | ± 3.0% |
| ₹19.45 lakh | 39% | ₹49.3 – 50.5 lakh | ± 1.3% |
| ₹30 lakh | 60% | ₹49.6 – 50.4 lakh | ± 0.8% |
| ₹45 lakh | 90% | ₹49.7 – 50.3 lakh | ± 0.6% |

⭐⭐ **IT SHARPENS AS THE DRIVE FILLS.** ⚠ The one case where it fails is a bar **clamped at 100%**.

⛔⛔ **AND THE 2026-09-07 CUT-OFF RULING DOES ⛔ NOT MITIGATE IT — ⭐ verified.** Writing *"₹19.45
lakh"* rather than the exact rupees moves the recovered band by **less than a thousandth**
(`₹19,45,000` → ₹49.2–50.5 L; `₹19,45,999` → ₹49.3–50.5 L). ⇒ ⭐ **the band is set by the BAR's
rounding, ⛔ never the amount's.** ⚠ ⇒ ⛔ **coarsening the money is ⛔ not a lever; only the bar is.**

### 15.3 ⚖️ Both readings are in the Panel's own record — ⛔ we take neither

- ⭐ **To let it stand.** cl.2(c)'s stated purpose was **presentational**: its own consequence block
  says hiding the target *"IS WHAT RESOLVES POOL-REALITY #2 … a bar with ⛔ no visible target is ⛔ not
  a comparison to a target."* ⇒ ⭐ **the page still displays no comparison.** A reader who does
  arithmetic learns a number; ⛔ the page never puts one in front of anyone.
- ⛔ **To close it.** `-196` cl.8 and `permissions.ts:1056` call revealing the target **"a DISCLOSURE
  ACT"**, reserved to `super_admin` alone. ⇒ ⚠ **if revealing is an act only the Trust may perform,
  a page that gives it away to anyone who divides has performed that act with ⛔ nobody deciding to.**

### 15.4 The options — ⛔ none pre-ruled

- **(1) ACCEPT AND RECORD**, with a named re-examination trigger. ⭐ Zero build. ⚠ The derivability
  is then a **known, written** property, ⛔ not a latent one.
- **(2) COARSEN THE BAR** — e.g. ten steps rather than a smooth line. ⭐ Widens the band to **±12%**
  at 39% fill and **±23%** early. ⚠ Costs fidelity: the bar sits still, then jumps. ⛔ And at a 0%
  first step an early drive shows an **empty** bar, which reads badly on a family's record.
- **(3) ⛔ NO BAR on the public surface** — the sentence alone. ⭐ Retires the question **entirely**.
  ⚠⛔ **But it narrows `-189` cl.2(b)** (*"each carries a progress bar"*) ⇒ ⛔ a Panel act, which is
  why it is listed rather than proposed.

⭐ **Interlock, ⛔ not a steer:** where a Pariwar has switched the expected figure **ON** (§13.2),
⛔ nothing about that Pariwar is hidden and `D3` does ⛔ not arise for it.

### 15.5 ⚠ What is ⛔ NOT being asked

⛔ ⛔ Not whether the target stays hidden by default — ⭐ §13.2 settled that, and it stands.
⛔ ⛔ Not the sentence, the rupee sign, the cut-off, or the bar's motion — ⭐ all closed.
⛔ ⛔ Not a re-run of Pool-Reality #2 — ⭐ §13.3 records it as conditional on the switch.


---

## 16. ✅✅ `D3` ANSWERED — **DR + KB, 2026-09-07** — ⭐ the bar changes what it MEASURES

> *"Progress bar should show the % of contributor already contributed in that pool."*

### 16.1 ⚠⛔⛔ THIS SUPERSEDES A TRUSTEE-RATIFIED CLAUSE — ⭐ recorded as a SUPERSESSION, ⛔ never a re-reading

⛔ `2026-09-04-191` **cl.4** — **Trustee-ratified, DR + KB** — reads, verbatim:

> **4. ⭐ THE PROGRESS BAR FILLS AGAINST A **RUPEE** TARGET.** Closes `-190` follow-up (ii)/(iii)-units.
> ⇒ the meter is `amountRaisedInr` over the Pariwar's configured rupee target … ⭐ the **headline stays
> participation-first** — people lead, the bar tracks money.

⇒ ⭐⭐ **cl.4 IS SUPERSEDED BY THIS RULING.** ⚠ `-190` **follow-up (ii)** framed exactly this binary —
*"What does the bar FILL AGAINST — rupees or contributors?"* — and cl.4 took **rupees**. ⭐ The Panel
now takes **contributors**. ⛔ Same Panel, ⛔ three days later, ⛔ a legitimate change of mind on a
question the record shows was always two-sided.
⛔ It is ⛔ **NOT** a reinterpretation of cl.4 ([[feedback_supersede_never_reinterpret]]) — ⭐ the prior
text is preserved above and the change is named. ⚠ **⛔ The headline stays participation-first either
way**, so cl.4's other half is undisturbed.

### 16.2 ✅✅ `D3` IS CLOSED **BY CONSTRUCTION**, ⛔ not by mitigation

⭐ The bar's width is now `confirmedCount ÷ rosterSize`. ⇒ dividing the published amount by the
published fill returns the **roster size**, ⛔ **not the rupee target**. ⇒ ⭐⭐ **the hidden figure is
⛔ no longer derivable from the page at all.** ⛔ No quantising, ⛔ no banding, ⛔ no accept-and-record.
⭐ §15.4's three options are all **moot**.

### 16.3 ⭐⭐ AND IT SIMPLIFIES THE BUILD SHARPLY — `D1`'s costs FALL AWAY

⚠ `D1(a)` ruled *"extend `pool-progress` with an optional rupee denominator"*. ⇒ ⭐ **with a
contributor denominator the shipped component ALREADY DOES EXACTLY THIS** (`presenter.ts:73-74`,
`min(100, round(confirmedCount / rosterSize × 100))`). ⇒ **Trap 1's three mechanical blocks ⛔ all
vanish:**

| Blocker (Trap 1) | Status |
|---|---|
| The anti-widening test rejects any new input key | ⭐ **MOOT** — ⛔ no new key |
| `rosterSize` is a required operand with no rosterless input | ⭐ **MOOT** — ⭐ the roster **is** the denominator |
| `fixedAmount` required; ⛔ no pre-derived-amount input | ⭐ **MOOT** — ⛔ unchanged from the shipped path |
| The `confirmedCount > rosterSize` **THROW** | ⭐ **CORRECT AS SHIPPED** — ⛔ ⛔ it needed re-scoping only for the rupee path, which is now gone |

⭐ `D1`'s *"⛔ no target ⇒ ⛔ no bar"* fallback is likewise **superseded**: ⭐ a roster always exists, so
**the bar always renders**. ⚠ Its successor is narrower — *"⛔ no target ⇒ ⛔ no **Expected** figure"*.
⚠ Edge case recorded: a pool with **zero assignees** renders a **0% bar** (the presenter's
`rosterSize > 0 ? … : 0` guard), ⛔ not an error.

### 16.4 ⚠ ONE CONSEQUENCE, RECORDED ⛔ NOT ASKED

⭐ A participation percentage **cannot be shown without the roster size becoming derivable**
(`roster ≈ confirmedCount ÷ fill`). ⇒ ⛔ that is **inherent to the ruling**, ⛔ not an oversight, and
⛔ we will ⛔ not ask the Panel to re-decide what they have just decided. ⚠ Recorded because
`assignedCount` is presently **quarantined on this read path** (`public-read.ts:703`, `:739-743`) and
has ⛔ never crossed the public wire.
⭐ **Build decision, ours:** the wire carries **the percentage only** — ⛔ not `rosterSize` — computed
server-side. ⭐ Minimum disclosure for the ruled render.
⚠ ⭐ A roster size is an **organisational scale** figure, ⛔ not money and ⛔ not a person; ⛔ 11b.1
AC5's bans (leaderboard · ranking · popularity) are ⛔ untouched — ⛔ nothing orders by it.

### 16.5 ⏳ ONE NEW QUESTION THE RULING OPENS — ⛔ small, ⛔ but real

⚠⛔ **THE BAR AND THE "EXPECTED" FIGURE NOW MEASURE DIFFERENT THINGS.**
⭐ The bar counts **people**. ⭐ *"Expected ₹50 lakh"* (§13.2, shown only where a Superadmin switches
it on) is **money**. ⇒ ⛔ they need ⛔ not agree:

| | Pariwar sets target ≈ roster × ₹300 | Pariwar sets a **lower** target |
|---|---|---|
| Bar (people) | 39% | **39%** |
| Against *"Expected"* (money) | ~39% — ⭐ they agree | ⚠ **78%** — ⛔ they contradict |

⇒ ⚠ a reader sees a bar at **39%** beside *"Expected ₹25 lakh"* on a drive that has already raised
**78%** of it. ⭐ **Three ways, ⛔ none pre-ruled:** **(i)** drop *"Expected"* — the bar no longer
tracks it · **(ii)** keep both, ⭐ accepting they answer different questions · **(iii)** express the
expected figure in **people** instead. ⛔ Nothing is blocked meanwhile: the switch is **off**.


---

## 17. ✅ लक्ष्य CONFIRMED · and a FACTUAL ANSWER — **does the system know what members are to contribute?**

### 17.1 ✅ The Hindi word

⭐ **लक्ष्य** is confirmed by the Panel (DR + KB, 2026-09-07). ⇒ §13.5's stated assumption is
**discharged**; ⛔ it is no longer an assumption.

### 17.2 ✅ **YES — and it is ⛔ not a new build. ⭐ It is ALREADY COMPUTED ON THIS EXACT READ PATH.**

⚠ Asked by BigDev. ⭐ Answered from the code, ⛔ not from memory:

| The figure | Where it lives | Status |
|---|---|---|
| **What ONE member contributes** | `pools.fixed_amount` (`schema/pools.ts:193`) — whole rupees, ⭐ **frozen at spawn** so a later change ⛔ never retro-alters a live pool | ⭐ shipped |
| **Who sets it** | `pool_fixed_amount_schedule` — the per-Pariwar, effective-dated, **trustee-governed** schedule; ⭐ the spawn saga reads the amount in force at cycle-freeze | ⭐ shipped |
| **How many members owe it** | `ASSIGNED_MEMBER_COUNT` (`public-read.ts:488`) — *"the **EXPECTED side** of the outcome"*, in the file's own words | ⭐ shipped |
| ⭐⭐ **THE WHOLE DRIVE'S EXPECTED CONTRIBUTION** | **`expectedTotal = assignedCount × fixedAmount`** (`public-read.ts:760`) | ⭐⭐ **ALREADY COMPUTED — then QUARANTINED at `:739-743`** |

⇒ ⭐⭐ **The system has known this figure all along.** It is computed on the very read path this story
edits, fed to `classifyCycleOutcome`, and then deliberately discarded so ⛔ only the opaque outcome
enum leaves. ⭐ And it is available **from the moment a pool spawns** — the roster is assigned and the
amount frozen at spawn — so ⛔ **no configuration, ⛔ no admin action, ⛔ no waiting.**

### 17.3 ⭐⭐ WHY THIS MATTERS — **it would dissolve `D7` BY IDENTITY**

⚠ `D7` (§16.5) is that the bar counts **people** while *"Expected"* counts **rupees**, so the two can
contradict. ⇒ ⭐ **that is true only of the ADMIN-TYPED target.** With the **derived** figure:

```
bar             = confirmed / roster
amount raised   = confirmed × fixedAmount
expected total  = roster     × fixedAmount
⇒ amount / expected = (confirmed × fA) / (roster × fA) = confirmed / roster = bar
```

⭐ **Verified numerically** (roster 16,700 · ₹300 · 6,485 confirmed): bar **38.8323%**, money against
expected **38.8323%** — ⭐ identical, for **every** drive and **every** value.
⇒ ⛔ **the contradiction cannot arise.** ⛔ No ruling needed to prevent it; ⭐ it is arithmetic.

### 17.4 ⚖️ ⛔ BUT IT IS A DIFFERENT FIGURE FROM THE ONE THE PANEL RULED — ⭐ stated, ⛔ not proposed

⚠⛔ **`-189` cl.2(d)** ruled the target is *"a **Superadmin-settable, PER-PARIWAR** value, **the SAME
target for every drive in that Pariwar**"*, and **`-190` cl.7(a)** gave the **Pariwar Admin** the
setting authority. ⇒ ⭐ the derived figure is **PER-DRIVE** and moves with each pool's roster
⇒ ⛔ **it contradicts cl.2(d)**, and ⛔ it needs ⛔ **no setter at all**.

⚠⛔ **AND IT WOULD RETURN STORY C's SUBSTRATE TO HAVING NO CONSUMER** — the `D4` problem, from the
other direction: `pariwar_drive_target_schedule`, its two keys, its RLS and its admin surface would
again gate ⛔ nothing.

⇒ ⭐ **Three ways to hold it, ⛔ none proposed here:**
- **(i)** ⭐ Keep the **admin-set** target as ruled; ⏳ `D7` stays open and is answered when a Pariwar
  first switches the figure on.
- **(ii)** ⭐ Use the **derived** total as *"लक्ष्य"* ⇒ ⛔ `D7` dissolves, ⛔ no admin action, ⭐ always
  correct — ⚠ but this **supersedes `-189` cl.2(d)** and re-strands Story C's substrate.
- **(iii)** ⭐ Keep **both**, for different purposes — the derived total as what the drive *needs*, the
  Pariwar's figure as what it *aims for*. ⚠ ⛔ Two "expected" numbers on one surface is the shape most
  likely to confuse a reader; ⛔ we would ⛔ not recommend it without a clear split of meaning.

⛔ **Nothing is blocked meanwhile** — the switch is **off**, so ⛔ no *"लक्ष्य"* renders at launch.


---

## 18. ✅✅ **RULED — DR + KB, 2026-09-07: USE THE DERIVED TOTAL.** ⭐ `D7` dissolves; ⚠⛔ two more ratified clauses are superseded

> *"Use the derived total."*

⇒ ⭐ **लक्ष्य = `assignedCount × pools.fixed_amount`** — the drive's own expected contribution,
computed per drive, ⛔ never typed by anyone.

### 18.1 ✅✅ `D7` IS DISSOLVED BY IDENTITY, ⛔ not by ruling

⭐ `amount / expected = (confirmed × fA) / (roster × fA) = confirmed / roster = the bar`.
⇒ ⛔ the bar and लक्ष्य **cannot disagree**, for any drive, at any value. ⭐ §16.5's three options are
**moot**. ⚠ ⭐ And the bar now reads correctly **both ways at once** — it is the share of colleagues
who have contributed **and** the share of the expected amount raised, ⛔ because they are the same
number.

### 18.2 ⚠⛔⛔ TWO MORE TRUSTEE-RATIFIED CLAUSES ARE SUPERSEDED — ⭐ named, ⛔ never re-read

| Clause | Verbatim | Effect |
|---|---|---|
| **`-189` cl.2(d)** | *"the target is **BUILT** — a **Superadmin-settable, PER-PARIWAR** value, **the SAME target for every drive in that Pariwar**, with an **enable switch** so it can be displayed later ⛔ without a rebuild"* | ⛔ **SUPERSEDED as to the VALUE.** The derived total is **PER-DRIVE** and moves with each pool's roster. ⭐ **The "enable switch" half SURVIVES** — see §18.3 |
| **`-190` cl.7(a)** | *"the **PARIWAR ADMIN** sets the target, **from day 1**"* | ⛔ **SUPERSEDED.** ⭐ There is ⛔ **no setter** — the figure derives itself |

⭐ Recorded with the prior text preserved ([[feedback_supersede_never_reinterpret]]). ⚠ This is the
**second** supersession in one day (§16.1 took `-191` cl.4); ⛔ both are legitimate, ⭐ both are named.

### 18.3 ⭐ WHAT SURVIVES — **cl.7(b) and cl.7(c) STAND.** ⛔ We are ⛔ not treating them as collateral

⚠ The ruling replaces **the VALUE's source**, ⛔ not **the VISIBILITY rule**. ⇒ ⭐ §13.2's ruling —
*"shows only when Trust switches on. And it should be turned off"* — is the **most recent word on
visibility** and ⛔ is not disturbed. ⇒ we build:

- ⭐ **The value:** derived, always available, ⛔ no configuration.
- ⭐ **The visibility:** still gated on `pariwar_drive_target_visibility.reveal_to_public`,
  **`super_admin`-only**, **default OFF** ⇒ ⛔ **no लक्ष्य renders at launch.**

⇒ ⭐⭐ **`pariwar.manage_drive_target_visibility` KEEPS its consumer.** ⚠ Its *meaning* shifts slightly
and should be stated: it now reveals **what the drive needs**, ⛔ no longer *"the Trust's aim"*.
⛔ If the Panel meant to retire the switch as well, ⭐ one word reverses this — ⛔ we will ⛔ not infer it.

### 18.4 ⚠⛔ THE COST — **HALF OF STORY C IS NOW UNCONSUMED**, in a story marked `done`

⭐ Stated plainly, ⛔ not buried:

| Story C artefact | After this ruling |
|---|---|
| `pariwar_drive_target_visibility` + its CHECK + RLS | ⭐ **LIVE** — gates the derived figure |
| `pariwar.manage_drive_target_visibility` (`super_admin`) | ⭐ **LIVE** |
| **`pariwar_drive_target_schedule`** (the value, versioned, ₹ ceiling, positivity CHECKs) | ⛔ **NO CONSUMER** |
| **`pariwar.manage_drive_target`** (`pariwar_admin`) — minted at `PERMISSION_CATALOG_VERSION` **41** | ⛔ **GATES NOTHING** |
| `resolveEffectiveDriveTargetInr`, `setDriveTargetSchedule`, the admin target form | ⛔ **NO CONSUMER** |

⭐⭐ **THE HOUSE PRECEDENT APPLIES EXACTLY, and we are following it** — `-190` **cl.4**, on the masking
window: *"We may use it in future. ⛔ Do ⛔ not delete … ⚠⛔ **BUT ITS STATUS CHANGES AND MUST BE
STATED:** … it has ⛔ **no public consumer**. ⛔ Do ⛔ not describe it as a live control on any
Trustee-facing material until it has one."*
⇒ ⭐ **RETAIN, ⛔ do not delete; ⭐ and STATE the status change** at the schedule table, at the resolver,
at the admin route and in the permission catalog.

⏳ **ONE ITEM WE WILL ⛔ NOT DECIDE ALONE:** `pariwar.manage_drive_target` is a **minted permission key
that now gates nothing**. ⛔ Un-minting moves `PERMISSION_CATALOG_VERSION` and is a catalog act.
⇒ ⭐ **retain-and-state** is the default we will apply; ⛔ say the word to retire it instead.

### 18.5 ⭐ CONSEQUENCES FOR THE BUILD

- ⛔⛔ **`public-read.ts:739-743`'s QUARANTINE IS NOW FULLY SUPERSEDED.** It reads *"⛔ Do not widen
  `SahyogDriveEntry` to carry **either of them, under any name**"* — and **both** totals now cross:
  `deliveredTotal` as the ruled amount, `expectedTotal` as लक्ष्य. ⭐ **Amend and NAME it**, ⛔ never
  edit past it (⭐ this is D2's discipline, applied a second time to the same comment).
- ⭐ **⛔ No new admin surface, ⛔ no new write path, ⛔ no migration.** The figure is a read-time product
  of two values already selected on this query.
- ⚠ **Zero-assignee pool ⇒ ⛔ NO लक्ष्य.** `assignedCount === 0` makes the expected total ₹0, which is
  ⛔ not a figure to publish. ⭐ The same guard the read path already applies to `fundingOutcome`
  (`:757`) — ⭐ **silence, ⛔ never ₹0**.
- ⭐ **Formatting is unchanged** — §13.5 stands: लक्ष्य is **always lakh or crore**, cut off, trailing
  zeros trimmed, with the `₹`. ⚠ A 16,700-member pool at ₹300 renders **लक्ष्य ₹50.1 lakh**.


---

## 19. ✅ RULED — **BigDev, 2026-09-07: RETIRE `pariwar.manage_drive_target`.** ⭐ Scoped here; ⛔ built elsewhere

⭐ §18.4's default (*retain-and-state*) is **overridden**. ⇒ the key is **RETIRED**.
⛔ This section **scopes** the act and records what it collides with; ⛔ it does ⛔ **not** perform it —
see §19.4.

### 19.1 ⛔⛔ THE HOUSE MECHANISM IS ⛔ NOT REMOVAL — ⭐ and this key ⛔ cannot use it

`permissions.ts:1130-1131`, verbatim:

> ⛔ **DEPRECATED ≠ REMOVED.** A deprecated key stays in the catalog, stays enforceable, and its
> existing grants stay honoured. Deprecation forbids only NEW grants. **Removal is a separate, later
> catalog bump.**

⇒ ⭐ removal **is** contemplated — ⛔ but it has **⛔ NEVER BEEN DONE**. `DEPRECATED_PERMISSION_KEYS`
holds exactly one entry (`member.suspend`), and it **stayed**.
⚠⛔ **AND `pariwar.manage_drive_target` ⛔ CANNOT BE DEPRECATED EITHER:** `:1150` —
*"**Every deprecated key MUST name one**"* (a successor), enforced by the typed
`DEPRECATED_KEY_SUCCESSOR` record. ⛔ This key has **no successor** — the figure now derives itself,
⇒ ⛔ nothing replaces it. ⭐ Deprecating it would require changing the **mechanism**, ⛔ not just a list.
⇒ ⭐⭐ **removal is the only fitting act, and it is the project's FIRST.**

### 19.2 ✅ REMOVAL IS SAFE — ⭐ verified, ⛔ not assumed

`check.ts:156-159`: *"**Unknown / malformed key → deny.** Only enumerated catalog keys can ever
allow."* ⇒ ⭐ **fail-closed.** ⛔ A route left gating a removed key **denies**, ⛔ it does ⛔ not fail
open. ⚠ Orphaned `role_grants` rows in a live DB become **inert** rather than dangerous — ⭐ a
data-hygiene item, ⛔ not a security one.

### 19.3 ⭐ THE COMPLETE SURFACE — ⛔ it is ⛔ not one line

| Layer | Sites |
|---|---|
| Catalog | `permissions.ts:1054` (the entry) + its ~30-line doc-block · `:650` **`PERMISSION_CATALOG_VERSION`** |
| Roles | `roles.ts:275` `PARIWAR_MANAGE_DRIVE_TARGET` + the `pariwar_admin` bundle grant |
| Domain | `drive-target-policy.ts:111` `DRIVE_TARGET_PERMISSION_KEY` · `:278` · `:333` (the `hasPermission` gate) · `:343` · `setDriveTargetSchedule` itself |
| API | `apps/api/src/modules/drive-target/handlers.ts` (**445 lines**) · `routes.ts` (**139**) — ⚠ the **visibility** half lives in the same module and **must survive** |
| Admin | `DriveTargetForm.tsx` (**355**) · `DriveTargetRoute.tsx` (**46**) — ⚠ `RevealSwitchesForm.tsx` **must survive** |
| Contracts | `contracts/src/drive-target/` target-write DTOs · `openapi/v1.yaml` |
| Tests | `rbac/roles.test.ts:203,239` · `rbac/permissions.test.ts:54,78,87,90` · `pool/drive-target.test.ts:16,119,124` · `integration/drive-target/admin.spec.ts` · `integration/pool/drive-target*.spec.ts` |
| Schema | `pariwar_drive_target_schedule` — ⚠ ⛔ **KEEP** (`-190` cl.4 precedent); ⛔ no migration, ⛔ no drop |

⚠⛔⛔ **THE TRAP: `PERMISSION_CATALOG_VERSION` MUST BE COMPUTED LIVE, ⛔ NEVER TRANSCRIBED.**
`permissions.test.ts:54` records the rule in its own words: *"**AND THE 41 IS COMPUTED, NOT
TRANSCRIBED:** Story **6.18** bumps this **SAME** counter … what `-203` cl.2 rules is **+2 FROM THE
LIVE VALUE** — whichever story lands second takes the next numbers."*
⇒ ⭐ **6.18 is still `ready-for-dev` and unlanded.** ⛔ Do ⛔ not write `42`; ⭐ read the live value at
the moment the retirement lands and take **+1** from it.

### 19.4 ⏳ WHERE IT LANDS — ⛔ NOT in Story 11b.14

⭐ Three reasons, ⛔ none of them reluctance:
1. ⛔ **It un-ships part of a `done`, merged story** (11b.13) — ~1,000 lines across five packages.
2. ⛔ **11b.14's own AC6 is *"Nothing else moves"***; ⭐ its scope is a **public read surface**, and
   ⛔ deleting C's admin write half is ⛔ not that ([[feedback_spec_edits_must_propagate_to_tasks]]).
3. ⚠ **It is the project's first key removal** and collides with 6.18's bump ⇒ ⭐ it wants its own
   change with its own review, ⛔ not a subtask.

✅⭐ **VEHICLE CHOSEN — BigDev, 2026-09-07: A NEW STORY.**
⇒ ⭐ **`11b-18-drive-target-write-authority-retired`**, minted `backlog` in `sprint-status.yaml`
between `11b-17` and the epic retrospective, with the full surface, the survivors and the
catalog-version trap recorded on its block.
⭐ **It lives on its OWN BRANCH, `story/11b-18-drive-target-write-authority-retired`, cut from
`main`** — ⛔ **not** stacked on this story's. ⇒ ⭐ it may land **independently**; ⛔ it depends on
⛔ none of 11b.14's code. ⚠ Both branches edit `sprint-status.yaml`, so expect a **ledger merge**,
⛔ not a conflict of substance. ⭐ It is a **story key that exists**, ⛔ not an epic-named
deferral ([[project_r7_fact_producer_unbuilt]]).

⛔⛔ **TWO BOUNDARIES, BigDev's words, recorded as binding:**
1. ⛔ **⛔ Do ⛔ NOT amend 11b.13 retrospectively.** ⭐ Its story file, its record and its decision
   entries **STAND as written**. The supersession lives in the decision log and in `11b-18`
   ([[feedback_supersede_never_reinterpret]]) — ⛔ 11b.13 was ⛔ not wrong when it shipped, and ⛔ the
   record must ⛔ not be made to read as though it were.
2. ⛔ **⛔ Do ⛔ NOT fold it into 11b.14.** ⭐ That story's **AC6** is *"Nothing else moves"* and its
   scope is a **public read surface**.

⛔ **The §18.4 status-statement still applies in the meantime** and is ⛔ not superseded: until
`11b-18` lands, the key and its substrate are **described as unconsumed**, and ⛔ **not** as a live
control on any Trustee-facing material.
