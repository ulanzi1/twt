# Trustee Panel routing note — passing a member's details to a partner when the member asks: may the Trust do it, what may go, how long it is kept, and what happens afterwards

> **Status: WRITTEN 2026-11-21, ⛔ NOT SENT — BigDev sends.** Written from Story 12.5 (the transport that carries a member's registered
> interest to a partner), Task 0.5. ⛔ No member uses the system yet, and none of this is built. Nothing here blocks building or merging.
> Every answer must be in before the first member's details can reach a partner. A question for counsel was written beside this note
> (`counsel-question-2026-11-21-12-5-partner-lead-transfer.md`), also ⛔ not sent.

## §0 — the gate

**It is the Panel's:** every question below decides what the Trust **discloses** about a member and **to whom** (Q1, Q3, Q6), on what
**basis** it handles a member's data (Q1, Q2, Q4, Q5), or what may be done with the details of a member **whose death has been reported**
(Q4, Q7 — you placed that with yourselves on 31 October).

**Split out and ⛔ asked:** how the message to the partner is signed, how often a failed send is retried, which network addresses the
system refuses to send to, how the details are stored, and how a failed send is flagged to staff — ours. BigDev decided them on
2026-11-21. Where one of them costs a member something, it is in "Told — not asked".

**Stripped of every reference, the questions read:** *"a teacher taps 'I am interested' on a partner's offer. May the Trust hand that
teacher's name and number to the partner, what else goes with them, how long does the Trust keep what was sent, and what does it do if
the teacher later changes their mind, leaves, or dies?"* — questions about people, ⛔ about code.

**Already ruled, and kept as ruled:** once a member's death is reported, an erasure request for their record is refused (30 October);
what may be done with a dead member's membership and record is yours (31 October). We build both as you ruled them. **No ruling of yours
mentions partners, offers or the passing-on of a member's details** — that is why this note exists.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the questions **as they were put**.

---

# The question

**In one sentence:** the app will show members offers from partners (a home loan, a term plan, a health camp); when a member registers
interest in one, the Trust would send that member's name, mobile number, district and preferred language to that one partner — and seven
things about doing so are yours to decide.

**Why it cannot be decided without you:** each answer changes whose details leave the Trust, to whom, for how long a copy is kept, and
what a member, or a dead member's family, can expect afterwards. Building any of them our own way would decide it for you.

## The one fact that decides most of it

**The draft privacy policy — the one members will be asked to accept when the Trust goes live — lists everyone the Trust shares personal
data with, and partners are not on that list. The same section says the Trust does not sell personal data.** The policy has not been
published and no member has accepted it, so nothing has been broken: it can still be changed before anyone agrees to it. But as it is
written today, sending a member's details to a partner is something the Trust has told nobody it will do.

---

# Q1 — May the Trust send a member's details to a partner when the member asks?

The member would be shown the offer, shown exactly which details would be sent, and asked to agree for that one offer. Only then is
anything sent, and only to that offer's partner.

**The one fact:** the draft policy names no partner among those the Trust shares with (above), and no ruling of yours covers it.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Yes — on the member's own agreement, given offer by offer; the policy is changed before it is published to name partners.** *Our suggestion.* | A member who registers interest has their details sent to that one partner. A member who does not is never shared. | The Trust becomes an organisation that passes members' details to commercial partners. Once sent, the details cannot be called back, and the Trust is answerable for having sent them even if the partner later misuses them. |
| **B** | **No — the Trust shows the offer and the partner's own contact details; the member contacts the partner themselves.** | Nothing about a member ever leaves the Trust. A member who wants the offer does the work of reaching the partner. | The partner cannot tell which enquiries came through the Trust, so the Trust cannot be credited for them. The "I am interested" button has no purpose. |

**Our reading:** **A** — **because** the member asks for it, sees what will go, and agrees to that one offer; nothing is sent for a member
who has not asked. Counsel is asked what the agreement with each partner must say before A can go live.

---

# Q2 — If a partner pays the Trust for these leads, is the Trust selling its members' data?

The product plan says commission from partners helps keep a teacher's yearly cost where it is. The terms with the first partners are not
agreed yet. They could be per **lead** (the partner pays for each member whose details it receives) or per **take-up** (the partner pays
only when a member actually takes its loan or plan).

**The one fact:** the draft policy says the Trust does not sell personal data. A payment for each set of details handed over is hard to
describe any other way.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Never per lead. The Trust may be paid only when a member takes up the partner's product, and the policy says so in plain words.** *Our suggestion.* | A member's details are never the thing the partner pays for. The policy tells members the Trust may earn when they take a partner's product. | It limits the terms you can agree with a partner before those talks have happened. Counsel may still see a take-up commission that depends on a hand-over of details as payment for the details. |
| **B** | **Per-lead payment is allowed, and the policy's sentence is rewritten to say what is true.** | The Trust is paid each time a member's details reach a partner. | To a member, that is selling their details. It risks the trust the whole scheme rests on. |
| **C** | **No payment tied to leads or take-up at all** (a flat partnership fee, or none). | Nothing about a member's details has a price. | It gives up the commission the plan relies on. |

**Our reading:** **A** — **because** it keeps the policy's promise true in the way a member would understand it. Counsel is asked whether
A is a sale in law. ⚠ A different question — whether a member is **shown** that the Trust earns from an offer — is not asked here. It
comes to you when the offers themselves are first shown to members.

---

# Q3 — Which details go?

**The one fact:** as planned, every partner receives the same four details. Nothing in this build can send fewer to one partner than to
another.

The four are: **full name, mobile number, district, preferred language (Hindi or English).** Never sent, to any partner: date of birth or
age, Aadhaar or PAN, membership standing, contributions, claims, nominees, school or post, anything about health, any free text.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The four, for every partner. The member sees all four on the form before agreeing.** *Our suggestion; as planned.* | A partner can phone the member, in their language, from an office in their district. | A partner that needs only a name and a number still receives the district and the language. |
| **B** | **Name and mobile number only.** | The least that lets a partner make contact. | A partner cannot route the enquiry to a district office or call in the member's language. Offers in Bihar are run district by district. |
| **C** | **Wait until each offer can list exactly the details it needs, and send only those.** | Each member sees, and sends, only what that offer needs. | A further piece of building before the first offer can go live. |

**Our reading:** **A** for the first partners — **because** all four are needed to make one useful phone call, and the member sees them
before agreeing. If you choose B or C, nothing wider is ever sent without coming back to you.

---

# Q4 — How long does the Trust keep its own copy of what was sent?

To send the details, the Trust holds a locked copy of the four until the send is done.

**The one fact:** the draft policy's table of how long things are kept has no line for this.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Removed at once if the send is stopped; removed 30 days after it is delivered or finally fails.** *Our suggestion; as planned.* | For 30 days the Trust can show exactly what it sent, if a member or a partner disputes it, and staff can re-send one that failed. After that only the fact of the send remains. | For 30 days a second copy of the four details exists. After 30 days the Trust can no longer show what it sent. |
| **B** | **Removed the moment it is delivered or stopped.** | The Trust holds the copy only for as long as the send takes. | Nothing to show in a dispute, and a failed send can never be re-sent. |
| **C** | **Kept for as long as the person is a member.** | — | The Trust holds a copy it has no use for. |

**Our reading:** **A.** The number of days is yours and counsel's to set; changing it needs no rebuilding.

**One edge inside this question.** On 30 October you ruled that once a member's death is reported, a request to erase their record is
refused, and the record is kept. Under A, this copy is removed on the same schedule whoever the member is — including a member whose
death has since been reported. **We have treated this working copy as not part of "the member's record"; that is our reading, not your
ruling.** If you read it as part of the record, we keep the copy for such a member, and how long is counsel's to say.

---

# Q5 — The record that the member asked can never be removed. Is that acceptable?

Separately from the copy in Q4, the Trust records the fact that a member registered interest in an offer. That record holds no name or
number, only which member and which offer.

**The one fact:** the way the Trust keeps its records, that fact is permanent. Even when a former member has their data erased, the entry
"this member registered interest in this offer" stays, attached to a member who can no longer be named.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Accepted, and the policy says so:** the fact that a member once registered interest in an offer is kept permanently, without their details. *Our suggestion.* | A member is told before agreeing that the fact of their interest is kept. | The Trust permanently holds that a named, living member once showed interest in a loan, a term plan or a health camp — which says something about that member's money or health. |
| **B** | **Not accepted: the Trust must be able to remove it.** | An erased former member leaves no trace of the offers they looked at. | It needs a change to how the Trust keeps all its records, which were built so that nothing is ever removed. That is a large piece of work and would delay partner offers. |

**Our reading:** **A**, with the policy saying it plainly — **because** the record carries no contact details, and the alternative
reopens a foundation everything else stands on. Counsel is asked whether the law permits A.

---

# Q6 — After the details have been delivered, the member changes their mind or has their data erased. Does the Trust tell the partner?

**The one fact:** once delivered, the details are in the partner's hands. Nothing is built either way, and the agreement with a partner
has no clause about it yet.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The Trust tells the partner and asks it to delete — a duty written into the partner agreement, carried out by staff.** *Our suggestion.* | A member who withdraws need not chase the partner themselves. | Staff work for every withdrawal. Telling the partner "this member withdrew" or "this member was erased" is itself telling the partner something about the member. The Trust cannot check that the partner deleted. |
| **B** | **The Trust tells the member to contact the partner, and gives the partner's contact details.** | The member does it themselves. | The burden falls on the member, when the draft policy says taking an agreement back should be no harder than giving it. |
| **C** | **Nothing. Withdrawing only stops a send that has not happened yet.** | — | Once sent, a member's withdrawal changes nothing in practice. |

**Our reading:** **A**, by staff and under the agreement, not built into the app yet — **because** the Trust did the sending. Counsel is
asked whether the law requires it.

---

# Q7 — Once a member's death has been reported, the Trust stops passing on that member's pending interest — for good. Please confirm.

When a death claim is opened for a member, their account is frozen and nothing of theirs is sent. That much follows from the plan you
already know: offers are hidden for a frozen account, and the Trust does not market to a grieving family.

**The one fact:** the freeze **lifts** when the claim is settled. And a member may register for each offer only once. So "stopped" has
to mean stopped permanently — including for a living member who was reported dead by mistake.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Stop from the moment the death is reported, and stay stopped after the claim is settled.** *Our suggestion; as planned.* | A partner never receives, and never phones about, a member the Trust has been told is dead. | A living member wrongly reported dead loses their place on that offer for good. Your 30 October reason was that a dead member's agreement still stands — said of the claim, the drive and the donors. If you meant it to reach a partner offer too, A is narrower than you intended. |
| **B** | **Stop only while the account is frozen.** | — | After the claim is settled, a dead member's interest could still be sent if staff re-send one that had failed. A sales call could reach a bereaved family. |
| **C** | **As A, and a living member wrongly reported dead gets their place back.** | The mistake costs that member nothing. | It needs a way to register again for the same offer, which does not exist. It can be built later. |

**Our reading:** **A** now, and **C** when a way to register again exists — **because** a mistaken sales call to a bereaved family is
worse than one member's lost place. We are building A meanwhile; your answer does not hold up the building.

---

# Told — not asked

1. **Sent is sent.** Taking the agreement back, leaving, or being erased stops only a send that has not happened yet.
2. **The same details can reach a partner more than once.** If the partner's system does not confirm receipt, the Trust tries again — up
   to 7 times over about a day and a half. The agreement will require the partner to treat repeats as one. If a partner does not, a
   member could be contacted more than once.
3. **One registration per offer.** If a member's interest is stopped, or cannot be delivered, the place on that offer is not given
   back. Staff will be able to re-send one that failed, within the 30 days of Q4 — but no staff screen for that exists yet.
4. **What stops a send by itself**, each of them only ever holding details back: the member's agreement was taken back; the member left
   the Trust or was terminated (a suspended member is still a member, and the send goes ahead); the member's data was erased; the
   member's death was reported; the Trust itself withdrew the offer.
5. **Members cannot yet take an agreement back in the app.** No screen for it exists. It is built with the screen that shows the
   offers, and no offer goes live before it.
6. **Withdrawing an offer cancels its pending interest for good.** Any administrator who may manage offers can withdraw one, without
   a second person's approval and without re-entering a code. Correcting a mistake in an offer means withdrawing it and making a new one; members may register on the new one.
7. **Nothing a partner sends back changes a member's record.** The Trust stores only a short reference number from the partner's reply.
8. **Whether a member is told that their interest was stopped or could not be delivered is not decided.** It is built with the screen
   that shows the offers, and it will come to you then.
9. **The Trust cannot prove to an outsider that it sent a lead.** The partner can check a message came from the Trust, but the method
   does not let either side prove it to a third party. The Trust's evidence is its own record and the partner's acknowledgement.

---

# What is at stake right now

- **Live today:** nothing. No member uses the system, no offer has been shown, and nothing that sends details to a partner is built.
- **Blocked:** nothing in building or merging. Before the first member's details can reach a partner: Q1 to Q6, counsel's answer, the
  privacy policy changed before it is published, and a signed agreement with each partner. Q7 does not block anything; we build A.
- **If nothing is decided:** the sending can be built and tested, and stays switched off. No partner receives anything.

---

# How much to trust this note

- **Earlier versions of this question:** none sent. The story behind it was written and then checked on 21 November. The first draft
  called the privacy policy the one members had "accepted". That was wrong: it is unpublished, and nobody has accepted it. This matters,
  because it means the remedy is a change before publication, not asking members to agree again.
- **Corrected in this note:** the first draft would have told you that a member whose interest was stopped "registers again". That is
  false — a member registers once per offer — so it is now Told 3 and part of Q7. The check also first summarised your 30 October
  reason wrongly (as though a dead member's agreement lapsed); it says the opposite, and Q7 now quotes it. Q2 and Q7 were not in the
  first draft at all.
- **Still uncertain:**
  - Whether your 30 October reason was meant to reach a member's agreement to a partner offer (Q7), and whether "the record" in that
    ruling includes the working copy (Q4). Both are our readings.
  - Whether any partner will in fact want to pay per lead. The terms are not agreed.
  - Two drafts of the trust deed exist and say different things about partner arrangements. Which one governs is recorded nowhere. We
    have not relied on either here.
  - Nothing is built. Everything above describes a plan, and "as planned" means BigDev's decisions of 21 November, which are still to
    be entered in the decision log.
  - Counsel has not been asked yet.

---

# In plain English

The app will show teachers offers from partners. When a teacher taps "I am interested", the plan is to send that teacher's name, mobile
number, district and language to that one partner, so the partner can phone them. The Trust has never said it would do this: the privacy
policy it has drafted lists who it shares with, partners are not on the list, and the same page says the Trust does not sell personal
data. Nobody has accepted that policy yet, so there is still time to get it right.

We suggest: yes, send — but only when the member asks, sees what goes, and agrees for that one offer (Q1 A); the Trust is never paid
per lead, only when a member actually takes a partner's product (Q2 A); the four details and nothing more (Q3 A); the Trust's own copy is
removed 30 days after the send, or at once if the send is stopped (Q4 A); the bare fact that a member once registered interest is kept,
and the policy says so (Q5 A); if a member withdraws after the details were delivered, staff tell the partner and ask it to delete
(Q6 A); and once a death is reported, nothing of that member's is passed on, ever (Q7 A).

If this section and the evidence below ever disagree, **the evidence is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

How this note's questions map to Story 12.5's: Q1 = PQ1 (a) · Q2 = PQ1 (b) · Q3 = PQ2 · Q4 = PQ3 (a) · Q5 = PQ3 (b) · Q6 = PQ5 ·
Q7 = PQ6 · "Told" = PQ4.

## E1 — What is already ratified, verbatim

> **Decision `2026-10-30-423`, ruling 1 (Q1 (a) — A), Trustee-ratified:** "Never erased once a death is reported." "From the moment a
> claim is filed for the member's death, an erasure request is refused, for good — unless the report is closed as false (Q1 (b))." The
> reason, as put: "the member agreed to how their data is used while they were alive; that agreement is what the claim, the drive and the
> donors rely on, and no one can withdraw it on their behalf afterwards." Cost as put, accepted: "Nobody — not the nominee, not the
> family — can have a dead member's record erased; it is kept indefinitely. Whether the law allows the Trust to refuse is counsel's to
> confirm." Not covered, in its own words: "the retention PERIOD and the legal basis for keeping a dead member's record (counsel's …)".

> **Decision `2026-10-31-424`, §0 gate, Trustee-ratified:** "the Panel's — … what may be done with a dead member's membership and record
> (Q2: CONSENT — `-423` Q1 (a)'s own reason)".

> **Decision `2026-08-21-146`, the adopted sentence (about the Member Directory):** "…you stop appearing once your death has been
> reported to the trust, from the moment a claim naming you is opened."

> **Decision `2026-08-21-147` cl.3, Trustee-ratified:** "Any future change that introduces a new **source/reason** for account-frozen
> must re-examine the directory exclusion predicate and the ratified member-facing sentence".

Relation of Q7 option A to these, in match / widen / narrow terms: `-423` rules on **erasure requests** and is untouched (MATCH). Its
reason, read as reaching a partner-offer agreement — OUR reading, ⛔ its words — would allow a send after death; option A withholds, so
against that reading it is a NARROWING, which is why it is asked. `-147` cl.3's re-examination was done for this transport: the
directory's exclusion and the `-146` sentence are untouched; the transport only reads a second, durable fact that a death report stands.

## E2 — What is NOT ratified

- ⛔ No ruling mentions partners, offers, modules, leads or commission. `grep` of the Trustee-ratified headings returns none (E4).
- The decisions this build rests on are **author-commits**, ⛔ rulings: `2026-10-31-427` and `-429` (the offer record; a member
  registers for an offer once — `-427` Consequence 3: "A member who registered interest and wants to register again (for example after
  a partner lost the lead) cannot, until a later story adds a re-register or withdraw path."), `2026-11-01-433` (the admin screens; ⛔
  commission data is stored — QE6 (A)).
- BigDev answered Story 12.5's twelve build questions on 2026-11-21 ("all as recommended"). That author-commit is owed to the decision
  log (≥ `-483`) before any code and is ⛔ there yet.
- The privacy policy and the trust deed are **drafts**. `2026-11-20-469` item 3: "The privacy policy and the Terms are published at
  go-live." `docs/legal-corpus-location.md` rule 2: they are a design reference, ⛔ binding authority. They are cited here by section
  and described in our own words; their text is ⛔ reproduced (the legal files are kept out of this repository).
  - Draft privacy policy §6 — who the Trust shares with (five groups; ⛔ partners), and the no-sale commitment. §4.1 — taking a consent
    back. §7 — where data is processed. §8 — the retention table (⛔ line for a lead).
  - Trust deed: `-433` QE6 (A) records that TWO drafts exist (2026-07-21, Clause 7.2(i) and Clause 20(i); and the 2026-08-06 objects
    draft v4, Object 10) and that "WHICH governs is recorded nowhere".
- Whether the fee arrangement is **disclosed** to a member is deferred by `-433` QE6 (A) to its own trigger (OQ-4 answered, the first
  production publish, or Story 12.3's create-story). Q2 here asks only whether a paid lead is a sale.
- The first partners' terms — "commission %, lead/conversion tracking, exclusivity clauses" — are open (PRD, OQ-4).

## E3 — What the code actually does (at `90535934`)

⛔ None of the transport exists. Story 12.5 is `ready-for-dev`; what follows is what is there today.

- A member's registered interest is an event, `module.lead_submitted`, carrying ⛔ personal details, with ⛔ production caller
  (`packages/domain/src/marketplace/commands.ts`, `submitModuleLead`). The screen that shows offers (Story 12.3) and the grief-context
  suppression (Story 12.4) are `backlog`.
- One registration per member per offer is enforced twice: `decideLead` (`already_submitted`) and the unique index
  `module_lead_member_uq` (migration `0193`).
- An offer's record holds the partner's web address and the NAME of a signing secret; it holds ⛔ commission terms.
- The `consent_type` list has ⛔ `module_lead_handoff` value. The only callers that take a consent back are the Telegram and WhatsApp
  opt-ins and the claim consent route — ⛔ member screen.
- ⛔ Route in the API accepts anything from a partner. The one route with "partners" in its path is the admin's own partner list.
- INFERENCE, ⛔ traced: "up to 7 times over about a day and a half" and "30 days" are the story's planned constants (QE6, QE24), ⛔
  built behaviour.

## E4 — Commands to re-verify every claim

```
# the rulings quoted, by bare number (expect ONE heading each)
grep -nE '^### Decision 2026-[0-9-]+-(423|424|146|147|427|429|433|469):' .decision-log.md
grep -n 'no one can withdraw it on their behalf afterwards' .decision-log.md
grep -n 'what may be done with a dead member' .decision-log.md
grep -n 'wants to register again' .decision-log.md
grep -n 'published at go-live' .decision-log.md

# no Trustee-ratified ruling names partners, offers, modules, leads or commission (expect 0)
grep -nE '^### Decision .*(TRUSTEE-RATIFIED|Trustee Panel RATIFIES)' .decision-log.md | grep -icE 'partner|module|marketplace|commission|lead-handoff'

# BigDev's 2026-11-21 answers are not in the log yet (expect 0 until the author-commit lands)
grep -cE '^### Decision 2026-11-21-48[3-9].*12\.5' .decision-log.md

# the draft policy (private copy, main checkout): partners absent from §6 (expect 0), and it is a draft (expect 1)
grep -ciE 'partner' /Users/dev/Developer/projects/TWT/docs/legal/privacy-policy.md
grep -c 'DRAFT' /Users/dev/Developer/projects/TWT/docs/legal/privacy-policy.md

# the lead event carries no personal details and has no production caller (expect test files only)
grep -rn 'submitModuleLead(' apps packages --include='*.ts' -l | grep -vE 'tests?/|\.test\.|\.spec\.|marketplace/commands\.ts|marketplace/index\.ts'

# one registration per member per offer
grep -n 'module_lead_member_uq' packages/domain/migrations/0193_marketplace-modules.sql
grep -n 'already_submitted' packages/domain/src/marketplace/commands.ts

# no consent value for a lead yet (expect 0); who can take a consent back
grep -c 'module_lead_handoff' packages/contracts/src/consent/consent-record.ts
grep -rln 'revokeConsent\b\|revokeOpenConsentsOfType' apps/*/src packages/*/src

# no route takes anything from a partner; the only "partners" path is the admin list
grep -rnE "'/api/v1/[^']*partner[^']*'" apps/api/src

# the go-live row this note is carried on — not written yet (Story 12.5 Task 0.6, >= Row 54)
grep -n 'partner-lead-handoff-live' docs/launch-gate-inventory/inventory-roster.md
```
