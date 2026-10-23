# Trustee Panel routing note — 2026-10-23 — Story 11b.4: the family's memorial, four questions

> ⚠ **DRAFTED — ⛔ NOT YET SENT.** Written by the agent during `bmad-create-story 11b.4` on branch
> `story/11b-4-memorial-authorship-surface-family-writes-the-story`, baseline `d87d047a`.
> ⚠ It is "shown to the Panel" only once BigDev has actually sent it ([[feedback_shown_to_panel_means_sent]]).

---

## §0 — THE GATE: is this the Panel's decision at all?

Story 11b.4 lets a bereaved family write a few words about the member who died, optionally add a photo,
and send it to the Trust to appear on that member's Sahyog Vivran page. The story raises many questions.
⭐ **Most are the author's and are decided in the story file itself** (where the draft is kept, how the
reviewer's screen works, which table holds what). They are ⛔ not in this note.

⭐ **Four questions pass the gate**, because each one is about what the Trust **discloses**, or what it
**owes a family**:

| # | Plain question | Why it is the Panel's |
|---|---|---|
| **Q1** | Who may write the memorial and give permission for it, for the family? | What the Trust owes a family; whose consent is the basis |
| **Q2** | What of the memorial is shown on the public page, and what is never shown? | What the Trust discloses about people |
| **Q3** | Can the family take the memorial down after it appears? | What the Trust owes a family; withdrawal of their consent |
| **Q4** | When the Trust removes words or declines a memorial, is the family told why, and can they ask again? | What the Trust owes a family |

⚠ **Split, ⛔ not bundled:** "how the reviewer marks a sentence for removal" is an engineering choice and
is ⛔ not asked here. Only whether the family is *told*, and what they may *do* about it, is asked (Q4).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into
> `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the questions
> **as they were put** ([[feedback_supersede_never_reinterpret]]).

---

# Q1 — Who speaks for the family?

**In one sentence:** when a member dies, who may write their memorial and give the Trust permission to
publish it — only the nominee, or someone else in the family too?

**Why it cannot be decided without you:** the Trust has already ruled that what the family writes is
published on **the family's own permission, given when they send it**. But no ruling says **who** the
family is for this purpose, and families often have several people with an equal claim to speak.

## The one fact that decides it

⭐ **After a death, the only person the system can recognise is the nominee** — they sign in to the
member's account with a code sent to the nominee's own phone. Anyone else would need a new way of
proving who they are, which does ⛔ not exist and would be a separate piece of work.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The nominee** writes and gives permission. (Later, a helpline volunteer could type it in for them on their instruction — ⛔ not built yet, recorded as a follow-up.) | One clear person speaks for the family. A relative who is not the nominee asks the nominee, or calls the helpline. | A family where the nominee is not the right person to write (e.g. an elderly parent was the nominee) depends on the nominee agreeing. |
| **B** | **The nominee or the person who filed the claim**, if different. | Two people may write. | The system cannot yet recognise the claimant separately; this needs new sign-in work first. Two people may send two different memorials, and the Trust must choose. |
| **C** | **Any family member the nominee names.** | The nominee can hand the writing to someone else. | New sign-in work, and a new record of who was named. The Trust still has to decide what happens if two people disagree. |

**Our reading:** **A** — **because** it is the only option that works with what exists, it leaves ⛔ no
room for two competing memorials, and a family that wants someone else to write can still have that
person write it and the nominee send it. ⚠ B or C can be added later ⛔ without undoing A.

## What is at stake right now

- **Live today:** nothing. The surface is unbuilt and nothing is published.
- **Blocked:** ⛔ nothing in the build. The story builds Option A, which is the only one possible today.
  ⚠ The **go-live** waits for this answer.
- **If nothing is decided:** the surface stays un-launched.

---

# Q2 — What is shown, and what is never shown?

**In one sentence:** when the Trust has reviewed a family's memorial, which parts appear on the public
Sahyog Vivran page for that member, and which parts never do?

**Why it cannot be decided without you:** what the family writes will often name living people —
a widow, children, parents — and a photo shows a face. Putting those on a public page is a
disclosure, and the Trust's rule is that ⛔ no personal information of that kind reaches a public page
without your ruling.

## The one fact that decides it

⭐ **The family writes this so that it will be read.** The page it would appear on is already public,
is already hidden from search engines, and already names the member who died. The question is ⛔ not
*whether* the family's words are published — they asked for that — but whether **anything inside them**
must be held back, especially the names of **children**.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The words and photo appear on the public page, **as the Trust approved them**. The reviewer removes any child's name before approval. | The family's memorial is read by anyone with the page's link. | Relies on the reviewer catching every child's name; a mistake is public for up to 5 minutes after it is corrected. |
| **B** | As A, but the **photo appears only to members** who are signed in. | The public sees words only; the photo stays inside the Pariwar. | The family may expect the photo everyone sees. A members-only part on this page is new work. |
| **C** | **Everything appears only to signed-in members.** | Strangers and colleagues outside the Trust see ⛔ no memorial. | The family's words reach far fewer people than they may expect. |

**Our reading:** **A** — **because** the family wrote it to be read, and the planning documents already keep a
minor nominee's name off this page (⚠ ⛔ not yet a ruling, and written for nominees — ⛔ not for names inside a
family's words, which is why we ask). ⭐ We would also tell the family, **at the moment they send
it**, exactly where it will appear and that a child's name will be removed — so their permission is
given knowing what happens.

⚠ **Relationships (spouse, sons, daughters, listed by name)** are a separate part of the design. We
propose ⛔ not to collect them at all until this question is answered, so the Trust holds ⛔ no names of
living relatives it does ⛔ not yet know what to do with.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** the **wording of the permission** the family gives when they send the memorial, and the
  part that puts it on the public page. ⭐ Everything else can be built meanwhile.
- **If nothing is decided:** memorials can be written and reviewed but ⛔ never appear anywhere.

---

# Q3 — Can the family take it down?

**In one sentence:** after a memorial appears, may the family ask for it to be removed, and must the
Trust remove it?

**Why it cannot be decided without you:** the family's permission is what allows the Trust to publish
their words. Whether that permission can be withdrawn — and how fast the Trust must act — is what the
Trust owes them.

## The one fact that decides it

⭐ **The memorial is published *only* because the family said yes.** The member's own name does ⛔ not
depend on the family (your 2026-08-28 ruling), so taking the memorial down never removes the member
from the page — only the family's words and photo.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The family can **take it down themselves**, any time, from the app. | It disappears within about 5 minutes (the page's refresh time). | A family member acting in grief or in a dispute may remove something others in the family valued. |
| **B** | The family asks **through the helpline**, and the Trust removes it. | Removal takes a call and a day or two. | Slower; a person must act for the Trust each time. |
| **C** | Once published, it **stays**, unless the Trust itself removes it. | The family cannot change its mind. | Probably at odds with the family's permission being the reason it is there at all. Counsel has ⛔ not been asked. |

**Our reading:** **A** — **because** the family's permission is the only reason the words are public.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** ⛔ nothing in this story. ⭐ Before review, a family will be able to withdraw a memorial
  it has sent (this story builds it; that is ⛔ not publication). Taking down a *published* memorial belongs with the part that
  publishes it.
- **If nothing is decided:** the publishing part cannot launch.

---

# Q4 — If the Trust removes words or declines, what is the family owed?

**In one sentence:** when a reviewer removes a sentence, or declines a memorial, is the family told
why, and can they do anything about it?

**Why it cannot be decided without you:** this decides what the Trust owes a grieving family when it
says no to their words.

## The one fact that decides it

⭐ **The Trust never changes the family's words — it may only leave a sentence out, or say no.** So
the family can always see exactly what was left out, and can always write again.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The family is **told in the app** what was left out and why, and may **change it and send it again**, as many times as they like. | A gentle explanation; the next version is reviewed fresh. | ⛔ No one outside the reviewer looks again unless the family sends a new version. |
| **B** | As A, **plus a formal appeal** to the Trustee Panel. | A second look by different people. | A new appeal process for families (today only members can appeal). More work for the Panel. |
| **C** | The family is told **only that it was approved or not**. | Less is said. | A family whose words were cut does ⛔ not know which, or why. |

**Our reading:** **A** — **because** nothing is lost (the family can always try again), the reason is
always given, and B can be added later if families need it.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** ⛔ nothing. The story builds A, which B extends without undoing.
- **If nothing is decided:** A is built and launches only after you rule.

---

# How much to trust this note

- **Earlier versions of these questions:** none. ⚠ The planning text called the deciding person "a
  designated representative" without ever defining the phrase; Q1 replaces it.
- **Corrected in this note:** the planning text said the family's memorial was covered by consent boxes
  on the claim screen. ⚠ Those boxes were retired on 2026-08-28 (⛔ not re-worded); the family's permission is now given
  when they send the memorial. This note is written on the new basis.
- **Still uncertain:**
  - Counsel has ⛔ not answered whether a photo of the member who died is the *member's* information or
    the *family's*. Q2 is written so that either answer works.
  - The research conversations with bereaved families planned before launch (Story 0.9) have ⛔ not yet
    happened, so ⛔ none of these readings is based on what a family has told us.

---

# In plain English

A family who has lost someone can write a few words about them and, if they like, add a photo. The
Trust reads it before anyone else does, and may leave out a sentence that would hurt someone — but
never rewrites what the family said. We suggest: the **nominee** sends it (Q1); it appears on the public
page **as approved**, with ⛔ no child's name (Q2); the family can **take it down** whenever they wish
(Q3); and if anything is left out, the family is **told why** and can **send a new version** (Q4).
⭐ Everything except publication can be built while you decide. ⚠ If this summary and the evidence below
ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `#decision-2026-08-28-162` **cl.3** (Trustee-ratified): *"FAMILY-OWNED MATERIAL IS AUTHORISED AT THE
> POINT OF SUBMISSION. Any genuinely family-owned or family-authored material that needs authorisation
> is authorised where and when it is submitted — ⛔ never prospectively, at claim time, about content
> that does ⛔ not yet exist."*

> `#decision-2026-08-28-162` **cl.2** (Trustee-ratified): *"(b) AND (c) ARE RETIRED — ⛔ NOT
> REINTERPRETED, ⛔ NOT RE-SCOPED."*

> `#decision-2026-08-28-160` **cl.3** table row: *"Family-owned information | the family's own consent |
> ⛔ No [per-subject gate]"*; **cl.5**: *"Family/nominee consent remains fully applicable to information
> belonging to the family/nominee."*; **cl.6**: ⛔ no family veto over the member's own name.

> `architecture.md` §Minor-data handling (planning text, ⛔ not a ruling): *"Suppresses minor identity
> from public surfaces (Sahyog Vivran shows family without minor's name …)"*.

> PRD FR-77 (planning text): *"Family story is human-written; no AI-generated narratives in v1. Story is
> reviewed by trust before publish."*

## E2 — What is NOT ratified

- **Q1:** ⛔ no ruling defines who gives the *family's* consent. "Designated representative" appears
  only in the epic's acceptance-criteria prose (`epics.md`, `### Story 11b.4`), defined nowhere.
- **Q2:** ⛔ no ruling sets the `pii_tier` of a family narrative, a portrait, or kinship rows, and ⛔ no
  `RULED_TIER1_PUBLIC_EXCEPTIONS` entry covers them (`packages/contracts/src/public-pages/matrix.ts`).
- **Q3:** ⛔ no ruling on withdrawal of the family's consent after publication; counsel ⛔ not asked.
  ⚠ The **draft** T&C (private corpus, local copy `docs/legal/terms-and-conditions.md`, ⛔ not ratified)
  reads: *"Public display of any contributor/verifier/memorial information is only with your
  **explicit, revocable consent** — never by default."* That is the member's instrument, ⛔ not the
  family's, and its "consent" wording predates `-160`/`-162` — but it points the same way as Option A.
  The Niyamavali's claim-time consent list (*"(c) In Memoriam inclusion"*) is likewise pre-`-162` and
  binds ⛔ nothing ([[feedback_niyamavali_rulebook_not_spec]]).
- **Q4:** ⛔ no ruling. The member appeal (`#decision` family of Story 10.22) is for **members** under
  sanction, ⛔ not for a family's content.
- **Counsel:** T&C v0.2 Annex **Q11** (*"family-owned information sits outside clause 14"*) is
  unanswered; Claim Terms v0.2 **Annex B** has ⛔ never been submitted (`review-artifact-roster.md`).

## E3 — What the code actually does (at `d87d047a`)

- **Q1:** the only post-death principal is the "Ravi-mode" session-as-deceased, elevated by
  `requireMemberStepUp(deps, 'claim_handover')` with the OTP sent to the nominee's declared mobile
  (`apps/api/src/modules/claims/claims.service.ts` `CLAIM_HANDOVER_ACTION_CONTEXT`). `claim_contacts`
  stores a claimant block but ⛔ no sign-in exists for it.
- **Q2:** the `sahyog-vivran` matrix surface (`packages/contracts/public-pages/public-vs-private-matrix.yaml`)
  declares ⛔ no family-story, portrait or kinship field; the page renders ⛔ nothing in that slot
  (`apps/public/src/pages/sahyog-vivran/[driveToken].astro` header). Cache: `edge_cacheable`, `s-maxage=300`.
- **Q4:** ⛔ no content-moderation substrate exists; `MODERATION_ACTIONS` is member-only
  (`packages/domain/src/member/moderation/status.ts`).

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-08-28-162' .decision-log.md
grep -n '^### Decision 2026-08-28-160' .decision-log.md
grep -rln 'designated representative' _bmad-output/planning-artifacts docs packages apps   # epics.md (+ this note) only
grep -nE '^\s*-? *id: .*(family|memorial|portrait|kinship|narrative)' packages/contracts/public-pages/public-vs-private-matrix.yaml   # EMPTY (exit 1) at d87d047a — ⚠ a plain word grep hits only prose comments
grep -n "MODERATION_ACTIONS" packages/domain/src/member/moderation/status.ts
grep -n "CLAIM_HANDOVER_ACTION_CONTEXT" apps/api/src/modules/claims/claims.service.ts
```
