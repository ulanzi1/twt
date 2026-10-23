# Trustee Panel routing note — 2026-10-23 — Story 11b.4: the family's memorial, five questions and three confirms

> **Status: ANSWERED 2026-10-23 — Q1 A · Q2 A · Q3 B with a rider · Q4 A · Q5 A · Confirms 1–3 A (Decision `2026-10-23-391`).**
> Written by the agent during `bmad-create-story 11b.4` and revised during `bmad-create-story validate 11b.4` (story v0.3) on
> branch `story/11b-4-memorial-authorship-surface-family-writes-the-story`, code baseline `d87d047a`; the first draft was named
> `…-four-questions.md`. A send copy of the meeting part (⛔ no evidence section) was prepared as a Claude Docs doc; ⚠ whether
> that copy or this full note was shown is ⛔ not recorded. Answered the same day, relayed by BigDev. Everything below the
> ruling block is kept UNEDITED, as put.

---

## §0 — THE GATE: is this the Panel's decision at all?

Story 11b.4 lets a bereaved family write a few words about the member who died, optionally add a photo,
and send it to the Trust to appear on that member's Sahyog Vivran page. The story raises many questions.
⭐ **Most are the author's and are decided in the story file itself** (where the draft is kept, how the
reviewer's screen works, which table holds what). They are ⛔ not in this note.

⭐ **Five questions pass the gate**, because each one is about what the Trust **discloses**, what it
**keeps**, or what it **owes a family**:

| # | Plain question | Why it is the Panel's |
|---|---|---|
| **Q1** | Who may write the memorial and give permission for it, for the family? | What the Trust owes a family; whose consent is the basis |
| **Q2** | What of the memorial is shown on the public page, and what is never shown? | What the Trust discloses about people |
| **Q3** | Can the family take the memorial down after the Trust has decided on it? | What the Trust owes a family; withdrawal of their consent |
| **Q4** | When the Trust removes words or declines a memorial, is the family told why, and can they ask again? | What the Trust owes a family |
| **Q5** | How long does the Trust keep what the family sent, and can it be erased? | What the Trust keeps about people, and on what basis |

⭐ **Three confirms** follow Q5. Each is built as described; each asks for an answer (A or B) but ⛔ none holds up
the work, and the memorial does ⛔ not go live until each is answered or BigDev records launching without one.

⚠ **Split, ⛔ not bundled:** "how the reviewer marks a sentence for removal" is an engineering choice and
is ⛔ not asked here. Only whether the family is *told*, and what they may *do* about it, is asked (Q4).

---

> ## ✅ PANEL RULING — `2026-10-23-391` (Trustee-ratified)
>
> **Ratifying trustees:** Dhiraj Rahul, Kalpana Bharti — relayed by BigDev, 2026-10-23, verbatim:
> *"by DR and KB / Q1 A, Q2 A, Q3 B / Make sure to inform the family that memorial once published cannot be taken down.
> However, we will keep the option B for exceptional cases. / Q4 A, Q5 A / Confirm1 A, Confirm2 A, Confirm3 A"*
>
> - **Q1 — A.** The nominee gives permission, with their code, each time a memorial is sent from the member's account.
> - **Q2 — A.** The words and photo appear on the public page as the Trust approved them; the family is told where at
>   sending and asked ⛔ not to name children; the reviewer leaves out any child's name or a photo showing a child.
> - **Q3 — B, with a rider.** The family is **told, when they send, that a published memorial cannot be taken down**; they
>   have ⛔ no take-down of their own; removal through the helpline, by the Trust, is kept **for exceptional cases**.
>   ⚠ "For exceptional cases" is recorded as the Trust's discretion, ⛔ not a family's right on request — `-391` item 3 asks
>   BigDev to confirm that reading with the Panel before the public render goes live.
>   ⭐ **Clarified 2026-10-23 — `-392`** (relayed by BigDev): take-downs are discouraged, since a removal may raise questions
>   among members and the public; a published memorial is taken down only for a **genuine reason** (e.g. it names a child the
>   Trust did not know of, or an outsider the family wants taken out) — the **helpline operator** decides on merit, removes it
>   **within 7 days**, and an **email is sent to the approver**.
> - **Q4 — A.** Told in the app what was left out and the reason for each part; may change it and send again; ⛔ no appeal.
> - **Q5 — A.** Kept with the member's record and erased with it; a family's own erasure request through the helpline is a
>   follow-up.
> - **Confirms 1–3 — A.** The Trustee Panel role (and Super Admin) reviews; the four reasons and ⛔ no others; the permission
>   is kept on each version sent, ⛔ not in the consent register.
>
> **Not covered** (as recorded in `-391`): who decides a case is exceptional, on what grounds and how fast; whether the
> family's notice mentions the exceptional route; the Trust withdrawing its own approval (unaffected); withdrawal before
> review (unchanged); counsel (⛔ not asked about a permission that cannot be withdrawn after publication, nor about Q5); the
> draft T&C's "revocable consent" sentence; the helpline paths; kinship rows; everything else in Story 11b.4.
>
> ⭐ Everything below is kept **unedited** as the questions **as they were put** ([[feedback_supersede_never_reinterpret]]).

---

# Q1 — Who speaks for the family?

**In one sentence:** when a member dies, who may write their memorial and give the Trust permission to
publish it — only the nominee, or someone else in the family too?

**Why it cannot be decided without you:** the Trust has already ruled that what the family writes is
published on **the family's own permission, given when they send it**. But no ruling says **who** the
family is for this purpose, and families often have several people with an equal claim to speak.

## The one fact that decides it

⭐ **After a death, the family uses the member's own account** — they sign in on it with a code sent to the
**member's own phone number**. Each time they send something, a second code goes to the **nominee's phone**; it must
be typed in within three minutes, and then allows sending for five minutes. So the only person the system can tie a
memorial to is **the nominee**, and only together with whoever holds the member's phone. Anyone else would need a new
way of proving who they are, which does ⛔ not exist and would be a separate piece of work.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The nominee** gives permission, with their code, each time a memorial is sent from the member's account. (Later, a helpline volunteer could write the memorial down for the family, on the nominee's instruction — ⛔ not built yet, recorded as a follow-up.) | One clear person speaks for the family. A relative who is not the nominee asks the nominee, or calls the helpline. | A family where the nominee is not the right person to write (e.g. an elderly parent was the nominee) depends on the nominee agreeing. A nominee who does ⛔ not have the member's phone cannot send at all until the helpline path exists. The record proves only "sent from the member's account within five minutes of the nominee's code being typed in there". |
| **B** | **The nominee or the person who filed the claim**, if different. | Two people may write. | The system cannot yet recognise the claimant separately; this needs new sign-in work first. Two people may send two different memorials, and the Trust must choose. |
| **C** | **Any family member the nominee names.** | The nominee can hand the writing to someone else. | New sign-in work, and a new record of who was named. The Trust still has to decide what happens if two people disagree. |

**Our reading:** **A** — **because** it is the only option that works with what exists, it leaves ⛔ no
room for two competing memorials, and a family that wants someone else to write can still have that
person write it and the nominee send it. ⚠ B or C can be added later without undoing A.

## What is at stake right now

- **Live today:** nothing. The surface is unbuilt and nothing is published.
- **Blocked:** ⛔ nothing in the build. The story builds Option A, which is the only one possible today.
  ⚠ The **go-live** waits for this answer.
- **If nothing is decided:** the surface stays switched off.

---

# Q2 — What is shown, and what is never shown?

**In one sentence:** when the Trust has reviewed a family's memorial, which parts appear on the public
Sahyog Vivran page for that member, and which parts never do?

**Why it cannot be decided without you:** what the family writes will often name living people —
a widow, children, parents — and a photo shows a face. Putting those on a public page is a
disclosure, and the Trust's rule is that ⛔ no personal information of that kind reaches a public page
without your ruling.

## The one fact that decides it

⭐ **The family writes this so that it will be read.** The page it would appear on is already public and
already hidden from search engines. It will show the member's own name once the member's own terms allow it —
today ⛔ no drive's page does (recorded 2026-09-19). The question is ⛔ not *whether* the family's words are
published — they asked for that — but whether **anything inside them** must be held back: the names of
**children**, a **child's face** in the photo, and the names of **living adults** (a widow, a brother).

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The words and photo appear on the public page, **as the Trust approved them**. At the moment of sending, the family is told exactly where it will appear and is asked ⛔ not to name children; the reviewer leaves out any child's name, and the photo if it shows a child, before approval. Living adults named by the family appear as written. | The family's memorial is read by anyone with the page's link. | The reviewer has ⛔ no list of ages, so a child's name can be missed. If it is, it stays public until someone notices and tells the Trust; once the Trust withdraws its approval, the memorial comes down within a few minutes (once the publishing part is built). A living adult is named publicly on the nominee's word alone. |
| **B** | As A, but the **photo appears only to members** who are signed in. | The public sees words only; the photo stays inside the Pariwar. | The family may expect the photo everyone sees. A members-only part on this page is new work. |
| **C** | **Everything appears only to signed-in members.** | Strangers and colleagues outside the Trust see ⛔ no memorial. | The family's words reach far fewer people than they may expect. |

**Our reading:** **A** — **because** the family wrote it to be read, the family is told at the moment of sending
exactly what will happen, and the planning documents already keep a minor nominee's name off this page (⚠ ⛔ not yet
a ruling, and written for nominees — ⛔ not for names inside a family's words, which is why we ask).

⚠ **Our decision, ⛔ not a question:** relationships (spouse, sons, daughters, listed by name) are a separate part of
the design. We will ⛔ not collect them at all until this question is answered, so the Trust holds ⛔ no list of
living relatives it does ⛔ not yet know what to do with.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** the **wording of the permission** the family gives when they send the memorial, and the
  part that puts it on the public page. ⭐ Everything else can be built meanwhile.
- **If nothing is decided:** the surface stays switched off — nothing can be written or sent in production.

---

# Q3 — Can the family take it down?

**In one sentence:** once the Trust has decided on a memorial — and after it appears — may the family ask for
it to be removed, and must the Trust remove it?

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
| **A** | The family can **take it down themselves**, any time, from the app. | It disappears within a few minutes (the page's refresh time). | A family member acting in grief or in a dispute may remove something others in the family valued. |
| **B** | The family asks **through the helpline**, and the Trust removes it. | Removal takes a call and a day or two. | Slower; a person must act for the Trust each time. |
| **C** | Once published, it **stays**, unless the Trust itself removes it. | The family cannot change its mind. | Probably at odds with the family's permission being the reason it is there at all. Counsel has ⛔ not been asked. |

**Our reading:** **A** — **because** the family's permission is the only reason the words are public.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** ⛔ nothing in this story. ⭐ Before review, a family will be able to withdraw a memorial
  it has sent (this story builds it; that is ⛔ not publication). After the Trust has decided, the family cannot
  withdraw it in this build — only the Trust can withdraw its own approval, and it records "the family asked" as
  the reason when that is why. Taking down a *published* memorial belongs with the part that publishes it, and
  follows your answer.
- **If nothing is decided:** the publishing part cannot launch — and the memorial does ⛔ not go live without it,
  so in effect this also holds up go-live.

---

# Q4 — If the Trust removes words or declines, what is the family owed?

**In one sentence:** when a reviewer removes a sentence, or declines a memorial, is the family told
why, and can they do anything about it?

**Why it cannot be decided without you:** this decides what the Trust owes a grieving family when it
says no to their words. ⚠ The planning text asks for *"notification + appeal"*; our reading gives notification
and a fresh try, ⛔ not an appeal.

## The one fact that decides it

⭐ **The Trust never changes the family's words — it may only leave a part out, or say no.** So the family can
always see exactly what was left out, and after a part is left out or the memorial is declined, they can write again.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The family is **told in the app** what was left out and, for each part, which of these reasons applies — *it attacks someone named in it*, *it accuses someone of wrongdoing*, *it is against the law*, or *it names or shows a child* — and may **change it and send it again**, as many times as they like. | A gentle explanation; the next version is reviewed fresh. | ⛔ No one outside the reviewer looks again unless the family sends a new version. ⛔ No other reason can be given — words that fit none of the four cannot be left out. |
| **B** | As A, **plus a formal appeal** — to trustees other than the one who reviewed it. | A second look by different people within the Panel. | A new appeal process for families (today only members can appeal). The reviewers are already the Panel (Confirm 1), so an appeal needs enough trustees to keep the second look separate from the first. |
| **C** | The family is told **only that it was approved or not**. | Less is said. | A family whose words were cut does ⛔ not know which, or why. |

**Our reading:** **A** — **because** nothing is lost (the family can always try again), the reason is
always given, and B can be added later if families need it.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** ⛔ nothing in the build. The story builds A, which B extends without undoing. ⚠ The **go-live**
  waits for this answer.
- **If nothing is decided:** A is built and launches only after you rule.

---

# Q5 — How long is what the family sent kept, and can it be erased?

**In one sentence:** the family's words and photo — which often name a spouse or children — are stored by the
Trust; how long are they kept, and can they be erased?

**Why it cannot be decided without you:** keeping names of living people, including children, is personal
information held about them, and the only permission for it is the nominee's when they send. How long the Trust
keeps it, and whether a family can have it erased, is what the Trust owes the people named.

## The one fact that decides it

⭐ **The words are kept with the member's record and erased only when that record is erased.** A deceased member's
record is ⛔ not erased today: erasure is allowed only after a membership is withdrawn or ended by the Trust. ⇒ In
practice the words would be kept **indefinitely**. ⛔ No one can ask today to erase *only* the memorial.

## What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Kept with the member's record; erased with it. The family may also ask the helpline to erase their own words (⛔ not built yet, recorded as a follow-up). | The memorial is added to the existing erasure; ⛔ no new way to ask for erasure is built now. | In practice kept indefinitely. Until the helpline path exists, a family cannot have only the memorial erased. |
| **B** | As A, and the family can **erase it themselves** from the app at any time. | The family controls their words fully. | A one-tap erase in grief may remove something others in the family valued; more work now. |
| **C** | Erased automatically a set time after the Trust declines it or the family withdraws it. | Unpublished words do ⛔ not stay with the Trust for ever. | The Trust loses the record of what it declined and why. Published words would still be kept indefinitely. |

**Our reading:** **A** — **because** it uses the erasure that already exists and adds ⛔ no new way to lose a family's
words in grief; B or C can be added later without undoing it. ⚠ It means keeping living people's names without a
time limit, which is why we ask.

## What is at stake right now

- **Live today:** nothing.
- **Blocked:** ⛔ nothing in the build — the story builds A's erasure. ⚠ The **go-live** waits for this answer.
- **If nothing is decided:** the surface stays switched off.

---

# Confirm 1 — The reviewers are you

**In one sentence:** the story gives the power to read and approve memorials to the **Trustee Panel role** (the
role constituted by Niyamavali §8.7) and to the Super Admin — is that right?

## The one fact that decides it

⭐ The planning text says *"content moderation by trustees"*, but the system can read "trustees" two ways. There is
a **Trustee Panel role** (the Panel of Niyamavali §8.7, seeded provisionally), and elsewhere the build has read
"trustees" as the **Pariwar Admin acting as a Trustee-Lite** (for example the cycle-freeze vote). A state-level trustee
role also exists but cannot hold a power inside one Pariwar. This story chooses the Panel role. You decided once before
who holds a comparable power (the masking setting, 2026-09-02, held by the Trust centrally).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As built:** the Trustee Panel role (and Super Admin) reviews every memorial. | Families' words are read only by the Trustee Panel role and the Super Admin. | Every memorial in every Pariwar needs a trustee's time; a Pariwar with ⛔ no trustee cannot have memorials reviewed. |
| **B** | **Pariwar Admins review**, as the Trustee-Lite reading used elsewhere. | Reviews are faster and local. | Words about a death are read by more people, inside the family's own Pariwar. |

**Our reading:** **A** — **because** a family's words about a death should be read by as few people as possible, and
by people outside their own Pariwar.

---

# Confirm 2 — The only reasons words may be left out

**In one sentence:** are the four reasons in Q4 option A the only grounds on which the Trust may leave out a family's
words or decline them?

## The one fact that decides it

⭐ The planning text says moderation is *"for harmful or policy-violating content only (e.g., personal attacks on
third parties, false accusations, illegal content)"*, and ⛔ no wider content policy exists. Two of our reasons
differ from it: *"it accuses someone of wrongdoing"* counts **any** accusation, because a reviewer cannot check
whether it is true; *"it names or shows a child"* follows Q2 option A and is retired if you rule otherwise on Q2.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As built:** the four reasons, and ⛔ no others. | A family is never told something vague like "policy". | A true accusation the family wanted to make is still left out. Something hurtful that fits none of the four stays in. |
| **B** | **Only false accusations** may be left out, as the planning text says; the reviewer must have grounds to think it false. | Closer to the planning text. | The reviewer must judge truth about a family's private life, with ⛔ no means of checking. |

**Our reading:** **A** — **because** the reviewer can apply it without judging the truth of a family's grief.

---

# Confirm 3 — Where the family's permission is kept

**In one sentence:** the family's permission is kept with the words it covers, ⛔ not in the consent register — is
that right?

## The one fact that decides it

⭐ Each version the family sends carries its own permission for exactly those words and that photo. The planning text
asks for a register of consents *"T&C version, privacy policy version, marketing comms, biometric data, photo.
Revocable."* — written for the member's own consents.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As built:** the permission is kept on each version the family sends. The family can withdraw it before review; after the Trust has decided, only the Trust can withdraw it in this build; after publication it follows your answer to Q3. | One record of one act. | Departs from the planning text's single register; someone checking consents must look in two places. |
| **B** | **Also record it in the consent register**, one entry per version. | One place lists every consent. | Two records of the same act, which can disagree. |

**Our reading:** **A** — **because** the permission belongs with the words it covers.

---

# How much to trust this note

- **Earlier versions of these questions:** none put to you. ⚠ The planning text called the deciding person "a
  designated representative" without ever defining the phrase; Q1 replaces it.
- **Corrected in this note:** the planning text said the family's memorial was covered by consent boxes
  on the claim screen. ⚠ Those boxes were retired on 2026-08-28 (⛔ not re-worded); the family's permission is now given
  when they send the memorial. This note is written on the new basis.
- **Corrected before sending (the story's validation, 2026-10-23):** the first draft of Q1 said the sign-in code goes
  to the nominee; it goes to the member's own number, and the nominee's code is a separate check when sending. The
  first draft of Q2 said the page already names the member; ⛔ no drive's page does today. Q5 and the three confirms
  were added.
- **Still uncertain:**
  - Counsel has ⛔ not answered whether a photo of the member who died is the *member's* information or
    the *family's*. Q2 is written so that either answer works.
  - Counsel has ⛔ not been asked how long a family's words naming living people may be kept (Q5).
  - The research conversations with bereaved families planned before launch (Story 0.9) have ⛔ not yet
    happened, so ⛔ none of these readings is based on what a family has told us.
  - ⛔ No collection in production can yet reach "closed" (that part is still being built), so the memorial cannot
    open anywhere until it is.

---

# In plain English

A family who has lost someone can write a few words about them and, if they like, add a photo. The
Trust reads it before anyone else does, and may leave out a sentence or the photo that would hurt someone — but
never rewrites what the family said. We suggest: the **nominee** sends it, with their code (Q1); it appears on the
public page **as approved**, with any child's name or face the reviewer finds left out (Q2); the family can **take it down** whenever they wish
(Q3); if anything is left out, the family is **told the reason for each part** and can **send a new version** (Q4);
and it is kept with the member's record — in practice indefinitely — and erased with it (Q5). Three confirms: you are
the reviewers; only four reasons; the permission is kept with the words.
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

> `#decision-2026-09-02-178` (Trustee-ratified, Confirm 1's precedent): *"the masking knob is held by the TRUST
> CENTRALLY — `super_admin`"*.

## E1b — Planning text (⛔ not rulings)

> `architecture.md` §Minor-data handling: *"Suppresses minor identity from public surfaces (Sahyog Vivran shows family
> without minor's name …)"*.

> PRD FR-77: *"Family story is human-written; no AI-generated narratives in v1."* and *"Story is reviewed by trust
> before publish."* (two separate bullets).

> PRD FR-97: *"Granular consent records: T&C version, privacy policy version, marketing comms, biometric data, photo.
> Revocable."* (Confirm 3).

> `epics.md` `### Story 11b.4`: *"content moderation by trustees occurs for harmful or policy-violating content only
> (e.g., personal attacks on third parties, false accusations, illegal content)"* (Confirms 1–2) and *"moderation may
> **remove** harmful or policy-violating content (with notification + appeal — referencing the family by a designated
> representative)"* (Q1, Q4).

## E2 — What is NOT ratified

- **Q1:** ⛔ no ruling defines who gives the *family's* consent. "Designated representative" appears
  only in the epic's acceptance-criteria prose (`epics.md`, `### Story 11b.4`), defined nowhere.
- **Q2:** ⛔ no ruling sets the `pii_tier` of a family narrative, a portrait, or kinship rows, and ⛔ no
  `RULED_TIER1_PUBLIC_EXCEPTIONS` entry covers them (`packages/contracts/src/public-pages/matrix.ts`). "⛔ No drive's page
  names the deceased today" is `#decision-2026-09-19-223` — an **author-commit** (BigDev), ⛔ not a Panel ruling.
- **Q3:** ⛔ no ruling on withdrawal of the family's consent after publication; counsel ⛔ not asked.
  ⚠ The **draft** T&C (private corpus, local copy `docs/legal/terms-and-conditions.md`, ⛔ not ratified)
  reads: *"Public display of any contributor/verifier/memorial information is only with your
  **explicit, revocable consent** — never by default."* That is the member's instrument, ⛔ not the
  family's, and its "consent" wording predates `-160`/`-162` — but it points the same way as Option A.
  The Niyamavali's claim-time consent list (*"(c) In Memoriam inclusion"*) is likewise pre-`-162` and
  binds ⛔ nothing ([[feedback_niyamavali_rulebook_not_spec]]).
- **Q4:** ⛔ no ruling. The member appeal (Story 10.22) is for **members** under sanction, ⛔ not for a family's
  content; the epic's *"notification + appeal"* is planning text.
- **Q5:** ⛔ no retention ruling for family-authored material; counsel ⛔ not asked.
- **Confirms:** ⛔ no ratified content policy (Confirm 2); Confirm 3 departs from PRD FR-97's single register.
- **Counsel:** T&C v0.2 Annex **Q11** (*"Confirm that family-owned information requires the family's own consent
  and is outside clause 14."* — `docs/legal-counsel-engagement/handover/build_tc.py`) is unanswered; Claim Terms v0.2
  **Annex B** has ⛔ never been submitted (`review-artifact-roster.md`).

## E3 — What the code actually does (at `d87d047a`), and what the story plans

- **Q1:** the only post-death principal is the "Ravi-mode" session-as-deceased — signed in with a login code
  sent to the **deceased's own number** (`apps/api/src/modules/auth/member/member-auth.handlers.ts` `otpRequest`),
  elevated by `requireMemberStepUp(deps, 'claim_handover')` with the OTP sent to the nominee's declared mobile
  (`apps/api/src/modules/claims/claims.service.ts` `CLAIM_HANDOVER_ACTION_CONTEXT`); the code is valid 3 minutes
  (`stepUpOtpTtlMs`), the elevation 5 (`stepUpElevatedMs`, `apps/api/src/config.ts`). The elevation records ⛔ not who
  received the code. `claim_contacts` stores a claimant block but ⛔ no sign-in exists for it.
- **Q2:** the `sahyog-vivran` matrix surface (`packages/contracts/public-pages/public-vs-private-matrix.yaml`)
  declares ⛔ no family-story, portrait or kinship field; the page renders ⛔ nothing in that slot
  (`apps/public/src/pages/sahyog-vivran/[driveToken].astro` header). Cache: `public, max-age=60, s-maxage=300`,
  `noindex`. The deceased's name needs a pinned `clause_versions` row for `SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`
  (`packages/domain/src/pool/public-read.ts`); ⛔ none exists.
- **Q4:** ⛔ no content-moderation substrate exists; `MODERATION_ACTIONS` is member-only
  (`packages/domain/src/member/moderation/status.ts`).
- **Q5:** erasure (`packages/domain/src/member/anonymize.ts`) is legal only for a `withdrawn` membership or a
  `terminated` overlay (`packages/domain/src/member/rtbf-legality.ts` `resolveRtbfLegality`); death is neither.
  (Planned — story MA15: the memorial joins that erasure.)
- **Confirm 1:** `packages/domain/src/rbac/roles.ts` — `trustee_panel`, *"the Trustee Panel constituted by Niyamavali
  §8.7"*. (Planned — story MA7: it is granted `memorial.review`.)
- **All:** the only production writer of a pool's state is `projectPoolState`, called only by `spawn.ts`
  (`pool.spawned`); ⛔ nothing in production appends `pool.closed`.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-08-28-162' .decision-log.md
grep -n '^### Decision 2026-08-28-160' .decision-log.md
grep -n '^### Decision .*-178' .decision-log.md        # Trustee-ratified
grep -n '^### Decision .*-223' .decision-log.md        # Author-committed (BigDev)
grep -rln 'designated representative' _bmad-output/planning-artifacts docs packages apps   # epics.md (+ this note) only
grep -nE '^\s*-? *id: .*(family|memorial|portrait|kinship|narrative)' packages/contracts/public-pages/public-vs-private-matrix.yaml   # EMPTY (exit 1) at d87d047a — ⚠ a plain word grep hits only prose comments
grep -n "MODERATION_ACTIONS" packages/domain/src/member/moderation/status.ts
grep -n "CLAIM_HANDOVER_ACTION_CONTEXT" apps/api/src/modules/claims/claims.service.ts
grep -n 'async otpRequest' apps/api/src/modules/auth/member/member-auth.handlers.ts
grep -n 'stepUpOtpTtlMs\|stepUpElevatedMs' apps/api/src/config.ts   # 3 min / 5 min
grep -n 'constituted by Niyamavali' packages/domain/src/rbac/roles.ts
grep -n 'harmful or policy-violating content only\|notification + appeal' _bmad-output/planning-artifacts/epics.md
grep -n -A2 '^#### FR-97' _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
grep -n "s-maxage\|noindex" 'apps/public/src/pages/sahyog-vivran/[driveToken].astro'   # quote the path (zsh glob)
grep -n "'withdrawn'\|'terminated'" packages/domain/src/member/rtbf-legality.ts
git grep -n 'SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID' packages/domain/src/pool/public-read.ts
git grep -n 'projectPoolState(' -- packages/domain/src   # project.ts + spawn.ts only
```
