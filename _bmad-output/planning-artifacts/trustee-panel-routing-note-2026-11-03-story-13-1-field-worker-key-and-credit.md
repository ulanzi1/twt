# Trustee Panel routing note — who may add a field worker, and whether a not-yet-verified field worker earns credit (one question, one confirm)

> **Status: SENT by BigDev and ANSWERED — recorded as [`2026-11-03-441`](../../.decision-log.md#decision-2026-11-03-441).** Drafted
> 2026-11-03 by Story 13.1 (`13-1-field-worker-identity-lifecycle-state-machine`); the date it was sent and the date the Panel ruled were
> not given to the session. **As put in the note** (kept unedited below):
> its asks **Q-1** and **Q-5** are Question 1 and Question 2 below. **Question 1 does not stop the build but it does stop go-live:** we
> build on our suggestion, and a field worker can be added in production only after you have answered. **Question 2 stops nothing:** it
> asks you to confirm a rule BigDev settled for the build on 2026-11-03. Both are tracked as legs of one go-live record, to be opened at
> the story's Task 0.4.

## §0 — the gate

**It is the Panel's.** In June you decided that permissions for field workers *"are to be ratified when their feature sets ship"*. The first
of those features is being built, and with it the first such permission. Whether your words cover that permission is a reading of what you
ratified — it is for you to say, not for us to settle. The second question is whom the Trust credits for a signup, which is what it may
later owe a person.

Everything else in this build is ours and is ⛔ in this note: what the permission is called, how a worker's record is stored, the order of
steps, and the list of reasons recorded when a worker is suspended or ended (we kept it to neutral ones). Three more questions in the same
story are ⛔ yours and go to other people: where the screens get built (BigDev's schedule); whether any code has already been handed out by
hand (a fact BigDev holds); and the legal footing for holding a field worker's name and phone number (counsel's — sent separately).

⚠ **One question that IS yours is deliberately not asked here:** if a field worker is suspended or ended, is money they already earned
still paid? Nothing built in this story touches it; it comes to you with the commission story.

---

> ## ✅ PANEL RULED — recorded as `2026-11-03-441`
>
> **Ruled by DR and KB, relayed by BigDev — verbatim:**
> *"by DR and KB*
> *Q1 - Go with option A and also  District Admin may add a field worker. The goal is District Admin will manage field workers, however if District Admin is unable to discharge his duties for any reason, including District Admin is yet to be Join, Pariwar Admin will fill in. Keep the full log of field worker.*
> *Q2 A"*
>
> ⭐ **Question 1: A, widened** — a District Admin may also add a field worker (the District Admin is the intended manager; the Pariwar
> Admin fills in); the full log is kept. **Question 2: A** — our suggestion taken. ⚠ NOT covered: whether the fill-in is enforced; how a
> worker belongs to a district; what "manage" covers beyond adding; the scope of "the full log" — see the decision entry.
>
> ⭐ Everything **below this block is kept UNEDITED** — it is the question as it was put ([[feedback_supersede_never_reinterpret]]).

---

# Question 1 — who may add a field worker?

**In one sentence:** a field worker is a person the Trust pays to bring in members, and when an administrator adds one the system gives them
a six-digit code; may a Pariwar Admin hold the permission to add a field worker, or must it be someone else — or wait for you?

**Why it cannot be decided without you:** in June you said permissions for the field-worker area are to be ratified when the features
ship. We do not know whether you meant every permission about field workers, or only the powers a field worker has over their own work.
Guessing which would be deciding what you meant.

## The one fact that decides it

**Whether your June words were meant to cover a permission held by someone who is *not* a field worker — a Pariwar Admin — that lets them
add one.** If they were, this permission needs your ratification before it is used. If they were about the field worker's own powers, a
Pariwar Admin holding this one is inside what you already agreed. The Trust has gone both ways before: Pariwar Admins manage news, partner
modules and "people who know me" campaigns, but only the Super Admin may add to the list of workplaces.

This question is about **adding only.** Suspending or ending a field worker is a different act, has no screen yet, and will have its own
permission and come to you with the work that builds it.

---

# What you are choosing between (Question 1)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A Pariwar Admin may add a field worker** (the Super Admin can too). *Our suggestion.* | A Pariwar Admin registers the person (name and mobile number) and the system issues the code; the Pariwar Admin tells the worker. | If your June words were meant to cover this, the permission exists ahead of your ratification. Nothing is live, and we change the grant before go-live if you say so. |
| **B** | **Only the Super Admin may add a field worker** — the way the list of workplaces works. | Every new field worker is registered by one central person; a Pariwar Admin has to ask. | Slower for a recruiter in the field, and one person becomes the bottleneck for every Pariwar. We change the grant before go-live. |
| **C** | **Wait: you ratify adding, suspending and ending together.** | Nobody can add a field worker, so no six-digit code can be issued, until you rule. | The registration screen waits on your sitting. The rest of the build goes ahead. |

**Our reading:** A — **because** a Pariwar Admin already holds the other Pariwar-level powers the Trust has built; adding a name and number
to a list moves no money and changes nothing a member is covered for; and the six-digit code is only a way of recording who introduced a
member. You can reject this reading and still use the note: B and C are costed above on the same terms.

---

# Question 2 — a confirm: does a field worker earn credit before the Trust has verified them?

**In one sentence:** a field worker has been added and given a code, but the Trust has not yet verified and activated them — should people
who sign up with that code be credited to them? We have built it so they are credited only once the worker is active; please confirm, or
change it before go-live.

**Why it cannot be decided without you:** credit is what a later commission would be based on, so this decides who the Trust may end up
owing — and a signup made before activation cannot be credited afterwards.

## The one fact that decides it

**Whether the Trust would rather lose an early signup's credit than credit a person it has not yet verified.** The member who signs up is
unaffected either way: their membership and cover do not depend on who introduced them.

## What you are choosing between (Question 2)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Credit only once the worker is active.** *Built; settled as the build rule by BigDev on 2026-11-03; our suggestion.* | A worker who shares their code before the Trust activates them is not credited for signups in that gap, and cannot be credited for them later. | The cost falls on the worker, permanently. And today **nothing in the system can activate a worker** — the screens for that are separate work, not yet scheduled — so until they exist no worker could be credited at all. |
| **B** | **Credit from the moment they are added.** | Nothing is lost for the worker. | The Trust credits someone it has not verified. Any payment would still be gated separately, later. |

**Our reading:** A — **because** it keeps credit tied to someone the Trust has checked, and payment is gated on that anyway; the cost to a
worker is avoided if the code is shared only after activation, which we will say in the worker's instructions. You can reject this reading
and still use the note.

---

# What is at stake right now

- **Live today:** nothing. No field worker can be added, no code has been issued through the system, and no field-worker permission exists.
- **Blocked:** Question 1 — adding a field worker in production waits for your answer (the build is on A; a different answer changes who
  holds one permission, before go-live). Question 2 — nothing; the build is on A.
- **If nothing is decided:** no field worker can be added in production (the go-live record stays open on Question 1); on Question 2 our
  rule A stands.

---

# How much to trust this note

- **Earlier versions of this question:** our first draft proposed a single permission covering adding, suspending *and* removing a field
  worker. BigDev chose the narrower permission for adding only, because those are different acts and the other two have no screen yet.
  Question 2 was first treated as a build choice of ours; we moved it here because it decides who is credited and so, later, paid.
- **Corrected in this note:** Question 1 first asked "who may add *and remove*" — only adding is built, so it now asks only that. A first
  draft of the story stated Question 2's rule to workers as settled policy; it now says "as built, pending your confirm". A first check
  assumed the Pariwar Admin was the obvious holder; a second found the Trust had kept "add to the workplace list" for the Super Admin —
  which is why B is an option.
- **Still uncertain:** whether "Field Worker" in your June words meant the role's own powers or the whole area; whether "deactivated" in the
  product requirement was meant to include "not yet activated"; and whether a field worker is an independent contractor or an employee
  (the classification is open with counsel — it may change what notice they are given, not these two questions).

---

# In plain English

In June you agreed that the permissions for field workers would be ratified when the field-worker features ship. The first feature is ready
to be built: an administrator adds a field worker, and the system gives them a six-digit code to share with the teachers they recruit. We
suggest that a Pariwar Admin holds the permission to add a field worker — the way Pariwar Admins already manage news, partner modules and
"people who know me" campaigns — and that suspending or ending a field worker is a separate permission that comes to you later, with the
screens that do it. If you meant otherwise, the alternatives are that only the Super Admin adds field workers (as with the workplace list),
or that adding waits until you ratify all three acts together. Nothing goes live until you have answered this.

Separately: a field worker gets a code before the Trust has verified them. We built it so that people who sign up with that code are
credited to the worker only once the Trust has activated them. That protects the Trust from crediting someone it has not checked, at the
cost of a worker who shares their code too early. A member who signs up is a member in full either way. One honest caveat: nothing can
activate a worker yet, because that screen is separate work not yet scheduled, so until it exists no worker could be credited. Nothing is
blocked on this second point; please tell us if you would rather credit from the moment of adding.

⇒ If this section and the evidence below ever disagree, the **evidence is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

*Traced at commit `268d86b5`, 2026-11-03. The decision log is cited by decision id + clause (never by line); each id was located by its
bare number first.*

## E1 — What is already ratified, verbatim

**[`2026-06-21-059`](../../.decision-log.md#decision-2026-06-21-059) amendment B (3)** — Trustee-ratified:

> **B. OQ-3 resolved (amends ADR-0008 rbac-permission-model).** (1) The 12-role catalogue is approved. (2) The seed permission matrix is
> approved **subject to implementation of the trustee-approved amendments**. (3) Future permission additions for Finance Officer,
> Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship.

**[`2026-09-08-210`](../../.decision-log.md#decision-2026-09-08-210) cl. 2** — Trustee-ratified; what is *not* delegated to the author:

> ⛔ anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key

So a new permission key is never a silent mint by us; it is recorded as the author's call or put to you.

**Author-commit precedents for a permission key (not Panel rulings):**

> [`2026-11-01-433`](../../.decision-log.md#decision-2026-11-01-433) (2): *the key `module.manage` is the author's, RECORDED here: `-210` cl.2
> puts a permission key OUTSIDE the delegated enum-mint class, so it is ⛔ a silent mint (the `-421` QE6 precedent);*
>
> [`2026-10-30-421`](../../.decision-log.md#decision-2026-10-30-421) QE14 (A): *a NON-BLOCKING confirm note with three questions … drafted for
> BigDev to send; ⛔ sent by the session.*

**What the Panel did with that precedent** — [`2026-10-30-422`](../../.decision-log.md#decision-2026-10-30-422) Consequence 1, Trustee-ratified:

> `-421` QE5 (A), QE6 (A) and QE7 (a) are CONFIRMED by the Panel as built — ⛔ change to the build. `-421` is ⛔ edited; this entry is the
> confirmation.

**A key minted for a role named in B (3)** — [`2026-11-01-438`](../../.decision-log.md#decision-2026-11-01-438) DL6, author-commit:

> **(DL6) Two permission keys MINTED here** (outside `-210`'s delegated mint — *"⛔ anything touching `PERMISSION_CATALOG_VERSION`, a role,
> or a permission key"*; the `-421` QE6 / `-433` QE2 precedent): `claim.flag_fraud` (dimension pariwar; seeded `helpline_operator`; ⛔
> step-up) and `claim.record_fraud_finding` (dimension district; seeded `district_admin`; step-up `FRAUD_FINDING_STEP_UP_CONTEXT`).

**The product requirement** (PRD, `prds/prd-TWT-2026-05-22/prd.md`):

> FR-81: Code generated on admin "Add Field Worker." Unique per Pariwar.
>
> FR-85: Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected.

**Also relevant, not a ruling:** the draft Trust Deed (private repo `twt-legal`; **draft, not executed, binds nothing**) has a clause on the
Trustees' power over the Trust's service providers — Clause 20(h), cited by number only; read it in the private copy. The PRD's open
question OQ-5 (the field-worker recruitment plan) names its owner as "Trustee Panel + Solo Builder".

## E2 — What is NOT ratified

- No decision covers who may add a field worker, or the field-worker lifecycle at all. A search of the decision log for field-worker terms
  finds six decisions that mention them, and none rules on either: `2026-06-01-012` and its amendment (funding cross-references for
  field-worker compensation), `-059` (the June role ratification above), `2026-08-13-104` (a deferral of ground-inspection dispatch),
  `2026-09-21-241` (the retention matrix names "field-worker payout records"; the matrix lives outside this repo) and `2026-10-28-413`
  (offline saving deferred until the field-worker surface is placed).
- Whether B (3) covers a permission held by a role *other than* the field worker. That is Question 1; we have not read it either way.
- What "deactivated" in FR-85 means for a worker who has been added but never activated. That is Question 2.
- What a suspension or ending does to money already earned — yours, and NOT asked here; it comes with the commission story.
- The legal footing for holding a field worker's name and mobile number, and what they must be told — counsel's, in a separate note.

## E3 — What the code actually does

*(A code comment is a claim; these were traced to the role bundles and the catalog, not to comments.)*

- The permission catalog is at version 58, and **no key beginning `field_worker.` exists** — nothing is minted yet.
- The Pariwar Admin's bundle holds `news.manage`, `known_people.run_campaign` and `module.manage`. `workplace.manage` is in the catalog but in
  **no** bundle, so it reaches only the Super Admin, who is given every key by construction.
- The `field_worker` role exists with an empty permission list and a self-only ceiling.
- No route creates a login for anyone but an administrator; accounts are created only by a provisioning script and by test helpers.
- The six-digit code registry is built and merged (Story 13.2) and **has no caller yet.** `acceptsNewAttributions` and `activateFieldWorker`
  do not exist.
- *Inference, labelled:* once the story is built to plan, nothing in production could activate a worker, because no route for it is
  scheduled. So under Question 2's rule A, no worker would be credited until such a route is built. This follows from the plan, not from
  shipped code.

## E4 — Commands to re-verify every claim

```
grep -nE '^### Decision 20[0-9-]+-059\b' .decision-log.md                       # 2026-06-21-059 — find it by the bare number
grep -n 'Future permission additions' .decision-log.md                          # the B (3) sentence
grep -nE '^### Decision 20[0-9-]+-210\b' .decision-log.md                       # 2026-09-08-210 — cl. 2, what is NOT delegated
grep -n 'anything touching `PERMISSION_CATALOG_VERSION`' .decision-log.md       # the sentence quoted in E1
grep -nE '^### Decision 20[0-9-]+-(421|422|433|438)\b' .decision-log.md         # the four precedents
grep -n 'is the author.s, RECORDED here' .decision-log.md                       # -433 (2)
grep -nE '^#### FR-8[15]:' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md   # FR-81, FR-85 (read the line after each)
awk '/^### Decision /{d=$3} tolower($0) ~ /field.worker/ {c[d]++} END{for(k in c) print k, c[k]}' .decision-log.md | sort   # six ids (E2)
grep -n 'PERMISSION_CATALOG_VERSION =' packages/domain/src/rbac/permissions.ts  # 58
grep -n 'field_worker\.' packages/domain/src/rbac/permissions.ts                # EMPTY expected: no field-worker key exists
grep -nE 'NEWS_MANAGE|MODULE_MANAGE|KNOWN_PEOPLE_RUN_CAMPAIGN' packages/domain/src/rbac/roles.ts   # inside the pariwar_admin bundle
grep -nE 'workplace\.manage|WORKPLACE_MANAGE' packages/domain/src/rbac/roles.ts # comments only: in NO bundle
grep -rn 'acceptsNewAttributions\|activateFieldWorker' packages apps --include='*.ts'  # EMPTY expected: not built
git log --oneline -1 268d86b5                                                   # the commit these claims were traced at
```

*Run on 2026-11-03 before drafting: every decision id resolved; the two "EMPTY expected" greps were empty; `workplace.manage` is in the
catalog and in no bundle; the field-worker search returned six decision ids (`2026-06-01-012`, `-012-amend-1`, `2026-06-21-059`,
`2026-08-13-104`, `2026-09-21-241`, `2026-10-28-413`), read one by one.*
