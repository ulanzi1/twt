# Trustee Panel routing note — 2026-09-07

## Story 11b.14 (**Story D** — live drives on the public index) carries two questions we will ⛔ not answer for you. **(1)** You ruled that a Superadmin may reveal the drive target *"separately for member and for public"* — ⭐ we built the switch, and ⛔ nothing anywhere reads it; the story that was named as its first consumer forbids the render. **(2)** You ratified a drive headline in your own words — ⭐ and it exists in ⛔ no file in this repository.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE.** Every factual claim below is either (a) **verbatim
> ratified text** from `.decision-log.md`, or (b) **verified repository state** — an exhaustive
> search, an absent caller, a shipped test's assertions, or a function we **executed** and captured
> the output of. ⛔ **We have deliberately ⛔ not rested any part of this escalation on a code
> comment, a doc-block, or a story file's own prose**, because those are our words about the code,
> ⛔ not the code. ⭐ §7 lists every command, so any claim here can be re-run and checked.
> ⚠ Where something is an **inference** rather than a fact, it is labelled **INFERENCE**.

---

## 1. What is being asked, precisely

**Q1 — the drive target's public reveal.** `2026-09-04-190` **cl.7(c)** reserves to a Superadmin the
power to make the drive target visible, *"separately for member and for public"*. ⭐ The switch is
built, governed and stored. ⛔ **No code anywhere renders the target to a member or to the public**,
and Story D — which `2026-09-04-196` **cl.8** names as the target's *"first consumer"* — currently
carries an acceptance criterion that forbids displaying the target **unconditionally**, with ⛔ no
reference to cl.7(c). ⇒ **Did cl.7(c) mean the public figure would actually appear when a Superadmin
turns it on — and if so, is Story D the story that must make that true?**

**Q2 — the drive headline.** `2026-09-04-190` **cl.6** adopts, in your words, *"16,750 members have
stood with this family — ₹19.45 lakh, and counting"*. ⭐ Story D was told to take that sentence from
the shared copy source Story B owns. ⛔ **Story B shipped ⛔ no such string, and no string resembling
it exists anywhere in this repository's copy files.** ⇒ **Who authors the ratified sentence, and —
because a second ratified money sentence now also exists — which surface carries which?**

⛔ **Neither question re-opens a decision you have made.** ⭐ Both ask what a ratified decision
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
- ⛔ **Which surface carries the cl.6 headline.** cl.6 says *"THE DRIVE HEADLINE"* — **singular**.
  ⚠ On 2026-09-05 you separately ratified an **index line** that also carries money
  (§3.2 below). ⛔ Nothing in the record says whether these are the same sentence, two sentences on
  two surfaces, or two sentences on one.
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

### 6.2 Q2 — the drive headline

- **(i) ⭐ THE INDEX LINE IS THE ONLY SENTENCE.** ⛔ cl.6's headline is retired as superseded by your
  2026-09-05 ratification. ⭐ Zero copy authored; the product already has the string. ⚠ ⛔ But your
  *"participation-first"* ruling is then ⛔ not satisfied — the index line carries no member count.
- **(ii) ⭐ TWO SENTENCES, TWO SURFACES** — the **index row** carries the 2026-09-05 index line; the
  **individual drive's page** carries cl.6's participation headline. ⭐ This matches cl.6's singular
  *"drive headline"* most naturally. ⚠ Requires (iv).
- **(iii) BOTH ON THE INDEX ROW.** ⚠ Two money sentences on one row. ⛔ We think this reads poorly
  against cl.8's *"the UI carries the understanding"*, ⭐ but it is yours to rule, not ours.
- **(iv) ⭐ AND IN EVERY CASE WHERE cl.6's SENTENCE SURVIVES — ⭐ YOU GIVE US THE WORDING.**
  ⚠ Specifically: the **English** sentence as it should render, the **Hindi** sentence, and whether
  the amount reads `₹ 19,45,000` (what the product produces today) or a *"lakh"* word-form (which
  would need a rounding rule). ⛔ We will ⛔ not author or translate it ourselves.

### 6.3 ⚠ One interaction you should know about before answering

⭐ A separate open question on this story (**`D3`**, ⛔ not escalated here) is that the progress bar's
**fill geometry** lets a reader recover the hidden target by division, from two figures the story
publishes on purpose. ⚠ **Two of your answers here move it:**

- ⭐ If **Q1(i)**, then for any Pariwar with the public reveal ON there is **⛔ nothing hidden to
  recover** — D3 narrows to Pariwars with the switch OFF.
- ⚠ If **Q2** produces a **coarsened** amount (*"19.45 lakh"* rather than an exact rupee figure),
  the division becomes **less** precise — ⭐ which is one of D3's own candidate mitigations arriving
  from an unrelated direction.

⛔ **We are ⛔ not asking you to rule D3.** ⭐ We flag the interaction so your answers here are not
made in ignorance of it.

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

⚠ Meanwhile, a month later, you approved a **different** money sentence — the one that goes on each
row of the list, naming the nominee. ⭐ That one **is** built, in both languages. ⛔ So we now have
one approved sentence that exists and one that does not, both about money, and no instruction about
which goes where.

⭐ We could write the missing sentence ourselves. ⚠ **We would rather not.** These are your words on
a public page about money and about families, and the whole reason there is a single shared copy
source is so that nobody quietly writes a second version. ⇒ we are asking you to tell us the
sentence, in both languages, and which page it belongs on.

### What happens meanwhile

⭐ Most of the story is unaffected and proceeds: live drives get listed, the sections and stage words
work, the progress bar's behaviour when no target is set is settled, and we will state plainly how
stale the figures can be.

⛔ Two things wait for you: **the meter's treatment of the reveal switch**, and **the headline's
words and its surface**. ⛔ Nothing is being built on a guess about either.
