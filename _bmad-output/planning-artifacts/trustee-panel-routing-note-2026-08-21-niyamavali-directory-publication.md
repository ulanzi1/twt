# Trustee Panel Routing Note — the Member Directory publishes three things the Niyamavali does not describe, and ⭐ the rulebook members actually read **cannot carry** the description

**Status:** ✅ **FULLY RULED 2026-08-21 — Dhiraj Rahul and Kalpana Bharti.** Recorded as Decision
**`2026-08-21-144`**. ⚠ **All five questions and all six in-session follow-ups answered; one
recommendation NOT followed; ⛔ Q3's contradiction RESOLVED at FQ-6 by a third position neither
reading held.** ⛔ **The questions below are left as put. They are annotated, never edited.**

> ### ⭐ ANNOTATION — the ruling, 2026-08-21
>
> | Q | Ruling |
> |---|---|
> | **Q1** | ✅ **YES — amend, into (a) the prose rulebook** *(as recommended)* |
> | **Q2** | ✅ **YES** — §8 amended to record the de-listing. ⛔ **Sub-question (§8.8 appeal sentence): NO** |
> | **Q3** | ⚠ *As first given:* **a member's name being public does NOT imply lock-in status should be public; lock-in is INTERNAL.** ✅ **Resolved at FQ-6** — value internal, **label *"Waiting period"* public**, member stays listed |
> | **Q4** | ✅ **RE-AFFIRM `full_name`** — posture does not move *(as recommended)* |
> | **Q5** | ✅ **(iii) then (i)** — track `docs/legal/`, then render it *(as recommended)* |
>
> **In-session follow-ups (FQ-1…FQ-6), all ruled:**
>
> | FQ | Ruling |
> |---|---|
> | **FQ-1** | lock-in member **stays listed** ⇒ ⚠ contradicted Q3; escalated to **FQ-6** |
> | **FQ-2** | ✅ **Acknowledged — no additional mitigation required.** Omission may permit an observer to infer a status/moderation change. ⛔ **The directory shall not disclose the REASON for omission** |
> | **FQ-3** | ✅ **Winning an appeal automatically re-lists.** ⚠ Recorded in `144` as **resolved via explicit deferral** — per Q2-sub the rulebook stays silent, so the entry is its only durable record |
> | **FQ-4** | ✅ **Code is not in production** — independently verified, `deploy-prod.yml` has **zero runs**. Epic proceeds; cl.7 carried **OPEN** |
> | **FQ-5** | ✅ **BigDev drafts, Panel ratifies**; ✅ the text **names the shielding lever** |
> | **FQ-6** | ✅ **Value internal, label public** — see the Q3 resolution below |
>
> ⛔ **ONE RECOMMENDATION WAS NOT FOLLOWED.** The note recommended **YES to both** halves of Q2. The
> Panel ruled **YES** on the §8 de-listing clause and ⛔ **NO** on the §8.8 appeal sentence. ⇒ The
> rulebook will describe the **de-listing** but ⛔ **not** the automatic **re-listing** that
> `directory-read.ts:136,150` already performs. ⚠ Carried as **FQ-3**.
>
> ⚠ **Q3 AS FIRST GIVEN was not buildable — it and FQ-1 pointed opposite ways.** Q3 said the status
> is internal; FQ-1 said the pill renders it; and on a surface with ⛔ **no authenticated viewer**
> (`-143` cl.7) rendering **is** publishing. Per the `2026-08-19-135` clause 6 precedent both
> readings were put back rather than resolved by the author
> ([[feedback_supersede_never_reinterpret]]).
>
> ✅ **RESOLVED 2026-08-21 at FQ-6 — and it is a THIRD position neither reading held:**
> ⛔ the **internal lifecycle value `LOCK-IN` remains NON-PUBLIC**; ✅ the **public presentation
> label *"Waiting period"* is APPROVED** for members whose internal state is `lock-in`; the member
> **stays listed**.
> ⇒ `2026-08-20-143` cl.8(ii) closes by **DISCLOSURE**, ⛔ not by removal ⇒ ⚠ **Q1's amendment must
> cover THREE disclosures** — name, de-listing, **and waiting-period status**.
> ⇒ ⭐ **AND IT SURFACED A VERIFIED GAP IN SHIPPED CODE:**
> `apps/api/src/modules/public-pages/handlers.ts:128` emits the literal internal value `lock-in`
> over the public JSON contract (`directory.ts:62`), which this ruling makes non-public. ✅ The
> rendered **HTML is clean** (`members-render.ts:106` maps to the label first). ⇒ a
> **wire-vocabulary change** is owed at Story 11a.3 — Decision `2026-08-21-144` clause 8.
>
> ⛔ **Q1 + Q5 do NOT close `2026-08-20-140` cl.7 on their own.** The amendment lands in **untracked
> prose** that ⛔ does not render at `/niyamavali` until Q5's two stories ship. Until then cl.7's harm
> sentence stands **verbatim**. ⚠ Carried as **FQ-4**.

---

**Original status when routed:** ⏳ OPEN — put to the Trustee Panel 2026-08-21.

**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-21, against `story/11a.3-member-directory-pii-shielded` @ `440bde6`
(working tree **clean**, verified `git status --porcelain` → 0 lines).
**Scope:** the three open Niyamavali findings accumulated across Stories 11a.1 → 11a.3. ⛔ **Not** a
build question — every one of them was raised *because* it could not be ruled by an implementer.
**Origin:** `2026-08-20-140` cl.7 (raised), carried by `2026-08-20-141`, and joined by
`2026-08-20-143` cl.8(i) and cl.8(ii). ⛔ All three were **raised, not fixed**, by design.
**Decision-log head, verified live at authoring:** `2026-08-20-143` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **145** headings, of which one is the `YYYY-MM-DD-NNN` **template**
(`:9467`) and one is the amendment suffix `2026-06-01-012-amend-1` (`:8615`), leaving **143** distinct
numbers. **No gaps in `001…143`** — verified by enumeration against `seq`, not by eye.
**Disposition on ruling:** a single `.decision-log.md` entry, next free number **`2026-08-21-144`**.
⚠ **Re-verify the head at ruling time.** Per Decision `2026-08-09-095` the entry must **label
per-clause provenance**.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ⛔ **This is NOT a re-litigation of `2026-08-19-135` / `-136`.** The Panel ruled full legal names
> publicly visible, knowingly, going **wider than the author's recommendation on both Q1 and Q2**.
> That ruling stands and is not reopened here ([[feedback_supersede_never_reinterpret]]). This note
> asks a **different** question: whether the **rulebook** is made to say what the **build** does.

> ⚠ **This is live, not hypothetical.** Story 11a.3 is at `review`
> (`sprint-status.yaml:9042`) and `/members` renders real members' full legal names today. `-140`
> cl.7 was raised before the page existed; `-141` noted it had become sharper; `-143` recorded it at
> its sharpest. ⛔ A fourth carry-forward without a ruling is **decay, not deferral**
> ([[feedback_mechanization_split_commitment]]).

---

## Why this note exists

Three consequences of the shipped Member Directory are **not described anywhere a member can read**:

| # | What the build does | Where it was raised |
|---|---|---|
| 1 | A member's **full legal name** — the KYC name — is published on an **unauthenticated** page | `2026-08-20-140` cl.7 |
| 2 | A **moderation sanction removes a member from the public directory** | `2026-08-20-143` cl.8(i) |
| 3 | A member's **lock-in status is published** to anyone on the internet with no login | `2026-08-20-143` cl.8(ii) |

Each is authorised. ⛔ **None is written down where the member governed by it would find it.**

⭐ **And the obvious remedy — "amend the Niyamavali" — runs into a structural bar this note exists to
put in front of the Panel BEFORE it rules, not after.** See **F-2** and **F-3**.

---

## Findings

### F-1 ⭐ THE INVENTORY — 23 v1 clauses, and ⛔ not one governs publication or name visibility

Verified live by reading `packages/domain/seed/niyamavali-v1-clauses.sql` and enumerating distinct
clause ids (**23**, matching `-140` cl.7's count exactly):

```
niy.concealment.r14                    niy.ninety-percent-rule.r8
niy.contribution-discipline.r7-a…r7-g  niy.ninety-percent-rule.r8-a / r8-b
niy.lock-in.policy                     niy.restoration-discipline.policy
niy.medical.ima-list                   niy.retirement-coverage.r12
niy.moderation.dwell                   niy.special-death.r5-c-2 / r5-d / r5-e / r5-f
                                       niy.special-death.r9 / r9-a / r9-suicide-murder
```

Every one is an **eligibility or benefit** rule. ⛔ There is no publication clause, no name-visibility
clause, and no clause describing any public surface at all.

⚠ **`niy.lock-in.policy` and `niy.moderation.dwell` are near-misses that must not be mistaken for
coverage.** They govern what lock-in and moderation **are**; ⛔ neither says a word about either being
**published**.

### F-2 ⭐ THE STRUCTURAL ONE — there are **TWO** rulebooks, and the public page renders the one the amendments never reach

They are different artifacts with different audiences, and the project has been amending only one:

| | (a) the **prose** rulebook | (b) the **clause registry** |
|---|---|---|
| Where | `docs/legal/niyamavali.md` + `.hi.md` | `packages/domain/seed/niyamavali-v1-clauses.sql` → `clause_versions` |
| Tracked in git? | ⛔ **NO** — `git ls-files docs/legal` → **empty** | ✅ yes |
| Shape | §-numbered legal prose (Part 8 §8.4, §8.5, §8.8 …) | 23 machine-evaluable `niy.*` payloads |
| Read by | the engine? ⛔ never | `@twt/niyamavali-engine` (Epic 4) |
| **Rendered at `/niyamavali`?** | ⛔ **NO** | ✅ **YES** |

⭐ **The public Niyamavali page renders (b), not (a).** `apps/public/src/pages/niyamavali.astro:94-97`
reads clause rows through `withPublicScope` and `renderNiyamavaliClauses`, with per-clause version
history and diffs (`:61-90`).

⇒ **Every Niyamavali amendment this Panel has made landed in (a):** §8.4 / §8.4a (Decision `-097`),
§8.5 / §8.6 / §8.9 (`-099`), §8.8 (`-121`). ⛔ **None of them is in (b), and therefore none of them
has ever rendered on the public page.** Those entries reproduce the amended text verbatim precisely
because *"`docs/legal/` is untracked and this entry is its only durable copy."*

⚠ **This reframes `-140` cl.7's stated harm.** Its words were: *"A member reading the Niyamavali
today cannot learn this."* ⛔ **Amending (a) does not fix that sentence** — the member reading the
Niyamavali is reading (b).

### F-3 ⭐ THE SHARP ONE — a publication clause is **NOT REPRESENTABLE** in (b) without a governance act on the architectural freeze

`clause_versions.benefit_mechanism` is **`.notNull()`** over the enum `['pool','reserve']`
(`packages/domain/src/schema/clause_versions.ts:57,103`) — **architectural-freeze row 12**. The
repo-global gate `benefit-mechanism.yaml` sets `v1_permitted: [pool]`, points `seed_globs` at
`packages/domain/seed/niyamavali-*.sql`, and **asserts every rule record carries a v1-permitted
value**.

⛔ **A clause saying "your name is published on a public page" confers NO benefit.** It is neither a
crowdfunded `pool` benefit nor a trust-paid `reserve` one. There is **no honest value for the column**
— structurally the same shape as `-143` cl.13, where `MatrixEscalationSchema` had no honest `from`
tier for a first-time `public` field and ⛔ none was invented.

Three ways out, **all of which require a ruling**:

1. ⛔ **Tag it `pool`** — false on its face, and it corrupts the one gate whose entire job is to assert
   that tag is meaningful.
2. ⛔ **Widen the enum** — freeze row 12, plus `benefit-mechanism.yaml:29-32`'s explicit **v2-flip
   governance** on admitting non-`pool` rules.
3. ✅ **Put it in (a) only** — ⚠ but then per **F-2** it never renders, and the harm sentence stands.

### F-4 — the engine has **no descriptive clause kind** either, and adding one anyway has a known failure mode

`packages/niyamavali-engine/src/interpret.ts` accepts a discriminated union of exactly **two**
literals: `rule_kind: 'conditional'` (`:192`) and `rule_kind: 'computed'` (`:210`). ⛔ **Both are
evaluated.** There is no display-only or descriptive kind in the shipped engine — the seed's own
comments record that the *"provisional display stub"* was **upgraded away** at Stories 4.2/4.3.

⚠ **And a descriptor added anyway does not sit inert.** `assembleClauses`
(`packages/validity-service/src/payload.ts:333`) pushes **every non-null slot**, so a plain descriptor
would attach to **every member's** validity payload ([[project_applicable_clauses_applied_only]]).

⇒ F-3 and F-4 together: **(b) is a registry of evaluable eligibility rules.** ⛔ It is not, and was
never built to be, a place to record what the Trust publishes.

### F-5 — the clause registry is **Pariwar-scoped**; directory publication is **platform-common**

`clause_versions` carries `pariwar_id`, and all 23 rows are seeded to a **single synthetic Pariwar**
(`aaaaaaaa-…-aaaaaaaaaaaa`); the public page reads `ACTIVE_PARIWAR_ID`
(`niyamavali.astro:94`). ⚠ A publication posture set by **this Panel** binds the Trust, not one
Pariwar — so even setting F-3 and F-4 aside, (b)'s **tenancy shape is wrong for the content**.

⚠ **One genuine exception the Panel should note:** the *presentation mode* (F-7) **is** correctly
per-Pariwar. ⛔ The **posture** is not.

### F-6 — the two new consequences are real, shipped, and the source code already points at this note

Verified in `packages/domain/src/member/directory-read.ts`:

- **`:96`** — `DIRECTORY_EXCLUDED_MODERATION_ACTIONS = ['suspend', 'terminate']` ⇒ **a suspension
  de-lists a member from the public directory.**
- **`:73-81`** — `DIRECTORY_VISIBLE_MEMBER_STATES` includes `'lock-in'`, with a source comment naming
  this exact finding: *"its presence is exactly what publishes a member's lock-in standing to the
  internet — the consequence raised to the …"*
- **`:136,150`** — the moderation read `COALESCE`s to `'restore'` ⇒ ✅ **a successful appeal re-lists
  the member automatically.** Mechanically sound; ⛔ **also undescribed.**

⚠ **This bears on §8.8 (the appeal), which the Panel authored at Decision `-121`.** A member appealing
a suspension is now also appealing a **public de-listing**, and ⛔ §8.8 does not say so. That is not a
defect in the code — it is a **change in what the sanction means to the member**, which is the
`-143` cl.14 hazard ([[project_moderation_model_correct_course]]: *"termination is an exceptional
governance act, not a stronger suspension"*).

### F-7 — the Panel holds a lever that needs **no code change**, and it is separable from the rulebook question

`resolvePublicNamePresentationMode` (`packages/domain/src/kyc/presentation-policy.ts`) reads a stored
per-Pariwar row; an absent row resolves to the **ruled default `full_name`**, and the source states
the asymmetry is deliberate: *"shielding on a missing row would silently contradict a ratified Panel
ruling."* Changing it is a **governed act** — `UngovernedPresentationChangeError` rejects a mode
change that arrives without its governance record (`2026-08-19-136` cl.3).

⇒ ⭐ **Posture and rulebook are two separate dials.** The Panel can amend the rulebook without
touching the posture, or move the posture without amending the rulebook. ⛔ This note does not assume
they move together.

### F-8 — ⚠ a Niyamavali clause does **NOT** discharge the DPDPA notice question

`2026-08-19-136` cl.5 records public full-name display as carrying DPDPA exposure with **legal counsel
not engaged** (Story 0.13). ⛔ **Different instrument, different audience, different legal test.** A
member-facing rulebook clause is a governance record; a DPDPA notice is a statutory obligation.

⚠ **The failure mode this finding exists to prevent:** the Panel amends the Niyamavali, the three
findings close, and `-136` cl.5 is quietly treated as covered. ⛔ It is not, and this note does not
ask the Panel to rule on it.

---

## The five questions

### Q1 — Is the Niyamavali amended to record that a member's **full legal name is published on an unauthenticated page**? ⛔ BLOCKING

`2026-08-20-140` cl.7, open since it was raised and carried by `-141` and `-143`.

⚠ **A YES requires a second answer: WHICH rulebook** — (a) prose, (b) registry, or both (F-2).
⛔ Per F-3/F-4/F-5, **(b) cannot carry it** without widening architectural-freeze row 12.

> **Non-binding recommendation:** **YES, into (a)** — the instrument this Panel has already used four
> times — with F-3's structural bar recorded **in terms** as the reason (b) is not the vehicle.
> ⛔ Do **not** direct a `benefit_mechanism` widening to make (b) fit; that is a freeze amendment
> serving a documentation goal, and it would put a non-benefit row inside the gate whose whole
> purpose is to assert benefit tagging is meaningful.

### Q2 — Is a clause authored recording that **a moderation sanction changes what the public sees**? ⛔ BLOCKING

`2026-08-20-143` cl.8(i). Part 8 already carries the grounds (§8.5), the mechanics (§8.4/§8.4a) and
the appeal (§8.8), all authored by this Panel — so there is a natural home.

⚠ **Sub-question the Panel should answer explicitly (F-6):** does **§8.8** need amending too, so that
a member appealing a sanction is told the appeal also concerns their **public listing**?

> **Non-binding recommendation:** **YES to both** — a §8 amendment recording the de-listing as a
> consequence of suspension and termination, **and** a §8.8 sentence stating that a successful appeal
> restores the listing. ⭐ The second costs nothing to say and is **already true in code** (`:136,150`);
> ⛔ leaving it unsaid is what turns a working mechanism into an unkept-looking promise.

### Q3 — Is **lock-in status published**, and is that recorded, changed, or stopped? ⛔ BLOCKING

`2026-08-20-143` cl.8(ii). ⛔ `-143` cl.8 states plainly this is **not** a licence to quietly drop the
pill — the epic's row-by-row disposition left it **unchanged**, so a change here is a **Panel act**.

Options: **(i)** amend to record it · **(ii)** stop publishing the lock-in state · **(iii)** publish a
single undifferentiated "active" pill so lock-in is not distinguishable.

⚠ **What is at stake in the choice.** Lock-in is a **waiting** status: publishing it tells the
internet that this member **cannot yet be claimed for**. That is either exactly what a nominee
verifying coverage needs (FR-75's *"institutional legitimacy and trust verification"*), or it is a
member's financial standing published without their asking. ⛔ **I do not think this one is mine to
recommend** — it turns on what the Panel believes the directory is *for*.

> **Non-binding recommendation:** ⚠ **none on (i)/(ii)/(iii).** ✅ **One process recommendation only:**
> rule it **explicitly**, because option (i) and option (iii) produce identical-looking code diffs and
> ⛔ a later reader could not tell which the Panel chose.

### Q4 — Does the **launch posture** change while the rulebook catches up? ⚠ DIRECTIVE

The F-7 lever moves `public_member_name` from `full_name` to `shielded_name` **without a code change**.

⛔ **This is NOT a request to reopen `-135`/`-136`.** It asks only whether the **new** facts —
rulebook silence now verified across all 23 clauses, the page live, `-136` cl.5's counsel still not
engaged — change the **initial** posture the Panel set knowingly.

> **Non-binding recommendation:** **RE-AFFIRM `full_name`; do not move the posture.** The Panel ruled
> this with the DPDPA exposure already on the record, and `-136` cl.1 requires only that it not be
> **permanent** — which F-7 proves it is not. ⚠ But record the re-affirmation **explicitly**, so the
> posture surviving a third sitting reads as a decision rather than as drift.

### Q5 — ⭐ Must whatever is amended actually **RENDER** at `/niyamavali`? ⚠ DIRECTIVE

This is F-2's teeth, and ⛔ it is the question that decides whether this whole exercise closes
`-140` cl.7 or merely files it.

`-140` cl.7's harm was: *"A member reading the Niyamavali today cannot learn this."* ⛔ Amending (a)
alone leaves that sentence **exactly as true as it is today**, because the public page renders (b).

Options: **(i)** the public page is made to render the prose rulebook alongside the clause registry
(a real story — F-3 says the content cannot go into (b)); **(ii)** the amendment is record-only and
⛔ the harm sentence is carried **openly as still-open**; **(iii)** `docs/legal/` is brought under
version control first, so there is a tracked source to render at all.

> **Non-binding recommendation:** **(iii) then (i)** — track `docs/legal/` (it is the Trust's legal
> corpus and is currently **untracked**, which is why **six** decision entries — `-096`, `-097`,
> `-099`, `-100`, `-108`, `-124` — carry verbatim copies as their *"only durable copy"*), then author
> a story to render it. ⚠ If the Panel prefers (ii), the
> ruling must say so **in terms** and `-140` cl.7 stays **OPEN** — ⛔ it must not be marked closed by
> an amendment that no member can read ([[feedback_closure_language_precision]]).

---

## What a non-answer would mean

⛔ **Story 11a.3 does not unblock or re-block on this** — it is at `review` and its build rulings are
already given. ⚠ **That is exactly the risk.** The story merges, the epic moves on, and three findings
raised at their sharpest become three findings carried at their quietest.

⛔ **A fourth silent carry-forward is the decay pattern this project already named**
([[feedback_mechanization_split_commitment]]): `-140` raised it, `-141` carried it, `-143` carried it
and added two more. The next entry that carries them without a ruling is not deferring — it is
**letting them settle**.

⚠ **And nothing mechanically watches this.** Per `-143` cl.13, `checkEscalationAttestation` only looks
for decision headings referenced by `matrix.escalations`, and these findings add **no** escalation
entry ⇒ ⛔ **no gate will ever notice they are unruled.** The governance record is the only mechanism.

---

## What this note does NOT ask, and what a ruling would NOT mean

- ⛔ It does **not** reopen `2026-08-19-135` / `-136`. The full-name authorisation stands.
- ⛔ It does **not** ask the Panel to rule on **DPDPA** (F-8). That is Story 0.13 and external counsel.
- ⛔ It does **not** ask for a `benefit_mechanism` enum widening. F-3 names it as an option **to
  reject**; if the Panel wants it, that is a **freeze amendment** needing its own ADR and its own note.
- ⛔ It does **not** touch In Memoriam or Sahyog Vivran, which keep first-name + last-initial and are
  consent-governed (`epics.md` C5, re-affirmed at `-140` cl.9).
- ⛔ It does **not** ask about `block` / `school` / `designation`. Those are settled (`-133`, `-137`).
- ⛔ A ruling here does **not** amend the moderation record model (Story 10.20). Q2 adds a
  **consequence** to an existing sanction; ⛔ it does not redefine the sanction.
- ⛔ It does **not** ask to change the status pill's code. Q3 may direct that; ⛔ this note does not
  pre-empt it.

---

## Ruling template

```
Decision 2026-08-21-144 : Niyamavali — Member Directory publication (11a.1 cl.7, 11a.3 cl.8(i)/(ii))

Q1  full legal name published        : AMEND (a) / AMEND (b) / AMEND BOTH / NO AMENDMENT / DEFER
                                       — reasoning:
Q2  sanction changes public view     : AMEND §8 : YES / NO      — reasoning:
    §8.8 appeal sentence             : AMEND     : YES / NO      — reasoning:
Q3  lock-in published                : (i) RECORD / (ii) STOP PUBLISHING / (iii) UNDIFFERENTIATED PILL
                                       — reasoning:
Q4  launch posture                   : RE-AFFIRM full_name / MOVE TO shielded_name — reasoning:
Q5  must the amendment RENDER        : (i) RENDER IT / (ii) RECORD-ONLY, cl.7 STAYS OPEN / (iii) TRACK docs/legal FIRST
                                       — reasoning:

If any amendment is ruled: amended text reproduced VERBATIM in both locales in the decision entry
(docs/legal/ is untracked — precedent: Decisions -097, -099, -121).

Ratifying trustees:                    , 
Date:
Provenance label per clause (Decision 2026-08-09-095):
```

---

## Disposition

| # | On ruling | Owner |
|---|---|---|
| 1 | One `.decision-log.md` entry `2026-08-21-144`, per-clause provenance labelled. ⚠ Re-verify the head first | BigDev / Panel |
| 2 | This note **annotated** with the outcome — ⛔ **annotated, never edited** ([[feedback_supersede_never_reinterpret]]) | BigDev |
| 3 | `2026-08-20-140` cl.7 closed, **or** explicitly carried OPEN per Q5(ii) — ⛔ never silently | BigDev |
| 4 | `2026-08-20-143` cl.8(i) and cl.8(ii) closed or carried, **separately labelled** | BigDev |
| 5 | If any amendment: text reproduced **verbatim, both locales**, in the entry (untracked-corpus precedent: `-096`, `-097`, `-099`, `-100`, `-108`, `-121`, `-124`) | Panel / BigDev |
| 6 | If Q2 amends §8.8: reconcile with Decision `-121`'s appeal text — ⛔ supersede, never reinterpret | BigDev |
| 7 | If Q3 is (ii) or (iii): a story against `directory-read.ts:73-81` + the status-pill render | John / Amelia |
| 8 | If Q5 is (i) or (iii): a story to track `docs/legal/` and render it — ⛔ **not** bundled into 11a.3 | John |
| 9 | ⛔ `2026-08-19-136` cl.5 (DPDPA) remains **OPEN** regardless of every answer above (F-8) | Story 0.13 |

---

*Routed 2026-08-21. Verified live at `440bde6`, clean tree. ⏳ **AWAITING RULING.***
