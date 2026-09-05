# Trustee Panel routing note — 2026-09-05

## We asked you a question in a way that presented your answer as unavailable. And one fact we gave you was wrong.

**Story:** 11b.3a (`done`, merged) · **Bears on:** `2026-09-03-184` (Trustee-ratified — Dhiraj Rahul,
Kalpana Bharti) · **Raised by:** the third code-review pass of Story 11b.3a, chunk G4, 2026-09-05
**Status:** ⛔ **OPEN — put to the Panel.** ⛔ Nothing is being changed on the author's own reading.

> ⭐⭐ **PANEL MEMBERS — PLEASE START AT APPENDIX A.** The numbered sections are the engineering
> record. ⛔ You are not expected to read them.
> ⚠⛔ **AND A WARNING ABOUT THAT INSTRUCTION, BECAUSE IT IS THE SUBJECT OF THIS NOTE.** The
> **previous** note said the same thing — *"You can answer this note from Appendix A alone"* — and its
> Appendix A then framed the choice in a way that left out the combination you actually chose. ⇒ this
> note's Appendix A **deliberately lists the combinations**, including the one where you tell us the
> record is fine and only our bookkeeping was wrong. ⛔ We have tried not to repeat the mistake; if you
> think we have, that is itself worth telling us.

---

## 1. What is being asked, precisely

Two things, both about the **2026-09-03** note and your ruling on it. ⛔ **Neither asks you to revisit
the policy** of whether bank details may be public.

1. **The combination.** Our Appendix A presented *"yes, a live drive should be reachable"* and *"make
   the address unguessable"* as **alternatives**. You answered **both**. ⛔ We never recorded that your
   answer went outside the options as we put them. **Did you intend both, and does your ruling stand?**
2. **The wrong fact.** That Appendix A told you a member on the phone app *"cannot"* reach the page —
   *"there is nowhere to type a web address."* ⛔ **That is false.** **Does knowing it change anything?**

---

## 2. What we put to you, and how Appendix A framed it

The note asked two questions: **(A)** should a still-collecting drive's page be reachable by the public
at all? and **(B)** is the ordinary rate limit an adequate bound, or should we do something else?

Appendix A's *"What happens either way"* section tied the two together like this:

> **"Yes"** — we **leave things as they are for now** and come back to you with a proposal for a
> **proper way in**, together with what should bound it.

and, separately:

> ⭐ **If your answer is "no, not for now"** — then making the address unguessable **costs us nothing
> real**.

⇒ **as written, the unguessable address belonged to the "no" branch.** The "yes" branch was *leave it
alone and come back later*.

---

## 3. What you ruled

`2026-09-03-184`, ratified by **Dhiraj Rahul** and **Kalpana Bharti**:

- **cl.1 — (A) YES**, a `live` drive's page **should** be reachable by the public.
- **cl.2 — (B)** the address **is made unguessable** (an opaque token).
- **cl.3** — the ordinary rate limit is judged **insufficient on its own**.
- **cl.4** — ⚠ *"**THE TWO ANSWERS ARE COUPLED, AND THIS CLAUSE IS THE LOAD-BEARING ONE**"* — making
  the address unguessable removes the **only** way a live drive could be reached, so the token and a
  real way in are **one deliverable in two parts**.

⇒ **you chose `A = Yes` together with the token** — which is the pairing Appendix A had placed on the
other branch.

---

## 4. ⛔ Why this is worth your time rather than a footnote

⭐ **cl.4 shows the coupling WAS understood** — by you, or by whoever wrote the entry, or both. ⛔ What
we cannot tell from the record is **which**, and that is precisely the gap:

- If **you** saw that "yes plus a token" needed a new way in and said so, then cl.4 records your
  reasoning and ⭐ **the only defect is that we never noted your answer went outside our options.** A
  one-line correction closes it.
- If the **author** reconciled it afterwards — writing cl.4 to make the combination cohere — then the
  entry presents as your reasoning something you were never asked. ⇒ that is a **consent** question,
  ⛔ not a bookkeeping one, and only you can settle it.

⚠⛔ **We are ⛔ not asserting which happened.** The record does not say, and ⛔ we will not guess on
your behalf. Our own standing rule is that a ratified decision is **superseded, ⛔ never re-read** by
an author — which is exactly why this comes back to you instead of being quietly tidied.

---

## 5. ⚠ The second defect — a fact we gave you was false

Appendix A told you, about reaching the page by guessing addresses:

> **"In the app it is not even possible"**: there is nowhere to type a web address, and no screen links
> to one.

and §6(c) said *"on **mobile it is not possible at all** — the app has no address bar."*

⛔ **That is wrong.** The phone app opens links in the **phone's own browser** — which has an address
bar. `apps/mobile/lib/public-site.ts` exists for exactly that purpose and its own note says the
requirement is met *"by an **OUTBOUND link**"*. ⇒ a member is **one tap** from a normal browser on the
public site.

⭐ **The narrower claim we made WAS true:** at that date, nothing in the app linked to a Sahyog Vivran
page. ⛔ But the claim doing the argumentative work — that a phone user *could not* do this — was not,
and it sat under the sentence *"the donor-verification reading describes a workflow that does ⛔ not
exist."* ⇒ **it made the risk look smaller than it was.**

---

## 6. ⭐⭐ What has been BUILT on your answer since — read this before answering

⛔ **This is not a hypothetical question.** Story **11b.10** is `done` and **shipped both halves** of
cl.4:

- the **opaque address token** — a drive page is now reached by an unguessable address and by
  ⛔ **nothing else**; the old countable address no longer opens it;
- the **way in** — a member-app entry point to the drive page.

⇒ if your answer changes, ⭐ **there is built and merged code on the other side of it.** ⛔ We are ⛔ not
saying that should stop you — you should answer what you actually meant. ⚠ We are saying it plainly so
you weigh it knowingly, and so ⛔ nobody later claims the cost was hidden.

---

## 7. ⭐ And one thing has changed that may make all of this matter less

The **reason** the guessable address was dangerous was what stood behind it: **four decrypted bank
fields** on a public page, for **every** Pariwar until the Trust set a window.

⚠⛔ **You have since ruled those fields OFF the public page entirely** (`2026-09-04-190` cl.1). Story
**11b.11** implements it: the account number, the last four digits, the IFSC, the VPA, the bank and the
branch all leave the public wire, and only the **nominee's name** remains.

⇒ ⭐ **the exposure that made the walk worth worrying about is being withdrawn anyway.** ⛔ That does
⛔ not make the consent question go away — a ratified entry that misdescribes how it was reached stays
wrong regardless — ⚠ but it may reasonably change how much of your time this deserves, and you should
know it before spending any.

---

## 8. What is put to the Panel

**Question 1 — the combination.** Appendix A of the 2026-09-03 note presented *"yes, keep it
reachable"* and *"make the address unguessable"* as alternatives. You ruled **both**.

> ⛔ **Do we have your answer right?**

**Question 2 — the wrong fact.** We told you a phone-app member could not reach such a page. They can,
via the phone's browser, in one tap.

> ⛔ **Knowing that, does your answer to the 2026-09-03 note change?**

⭐ Appendix A sets out the ways you might answer, ⛔ **as combinations rather than as a fork**, because
presenting them as a fork is what went wrong last time.

---

## 9. ⛔ What this note does NOT ask

- ⛔ It does **not** reopen `2026-08-28-160` cl.10(a) (bank details may show during an active drive).
- ⛔ It does **not** reopen `2026-09-02-179` cl.1 (`D8-default` FAIL-OPEN), which `-184` left standing.
- ⛔ It does **not** ask you to re-rule `2026-09-04-190` (the withdrawal). That ruling stands and 11b.11
  is queued to implement it.
- ⛔ It does **not** ask for anything about the **rate limit**. cl.3 judged it insufficient on its own
  and that is untouched.
- ⛔ It does **not** ask you to review code. Every other finding from this review — sixty-five of them —
  is the author's to handle and is ⛔ not routed here.

---

## 10. ⚠ Status of the work while this is open

- **Story 11b.3a stays `done`.** ⛔ Its build is complete and its own blocking item was answered by
  `-184`. ⛔ This note does **not** reopen it.
- **Story 11b.10 stays `done`.** The token and the way in are merged.
- **Story 11b.11 stays `ready-for-dev`** and is ⛔ **not** blocked by this note — it withdraws the bank
  fields on `-190` cl.1, which this note does not touch.
- ⛔ **Nothing is being changed on the author's reading of your intent.** If Question 1 comes back
  *"you have it right"*, the whole remedy is one recorded line.

---

## Sources — every one read at `955e3cdf`

- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-03-11b3a-enumeration-bound-tier1.md`
  — Appendix A *"What happens either way"*; §6(c); §8; §10.
- `.decision-log.md` — `2026-09-03-184` cl.1-6 and its Status line; `2026-09-02-179` cl.1;
  `2026-08-28-160` cl.10(a); `2026-09-04-190` cl.1/cl.4.
- `apps/mobile/lib/public-site.ts` (header + `publicSiteHomeUrl`); `apps/mobile/app/(auth)/terminated.tsx:94`
  (`Linking.openURL`) — the basis for §5. ⭐ Verified at commit `2c69cd5d`, the state as of the ruling.
- `_bmad-output/implementation-artifacts/11b-3a-…md` — third-pass Review Findings, chunk G4.
- Story 11b.10's merged commits — `4952d77a feat(11b.10): the unguessable public address AND the inbound
  path — ONE deliverable`.

---

# Appendix A — in plain words

## The short version

Two days ago we asked you a question about a page on the public website. You answered it, and we have
built what you decided.

Since then, someone reviewing the paperwork found **two problems with the way we asked**.

1. We laid out the choice as *either* "leave it reachable and we will come back with a proper way in"
   *or* "make the address impossible to guess". ⭐ **You chose both.** That may be exactly what you
   meant — ⛔ but our note had presented it as not being on the menu, and we never wrote down that your
   answer went outside what we offered.
2. We told you something that was **not true**. We said a member using the phone app *could not* reach
   such a page — that there is nowhere in the app to type a web address. ⛔ In fact the app opens links
   in the phone's ordinary browser, which has an address bar. So a member is one tap away from doing
   exactly the thing we told you was impossible.

⭐ Neither of these means your decision was wrong. Both mean **we cannot prove from our own records
that you were asked fairly**, and that is not a thing we are willing to leave sitting.

## Why we are raising it rather than fixing it quietly

We have a rule: once you have ratified something, an author may **replace** it by bringing you a new
question — ⛔ but may **never** quietly re-read what you decided to make it fit. Tidying this up
ourselves would be exactly that. So it comes back to you.

## What has already been built

⚠ Please know this before you answer: **we have built what you decided.** The page address is now
unguessable, and there is a way into it from the app. That work is finished and merged.

⛔ We are **not** telling you this to discourage you from changing your mind. If your answer was based
on something we got wrong, we would rather rebuild than keep something you did not really choose. We
are telling you so the cost is visible to you and not hidden.

## And something that may make this smaller than it looks

The reason a guessable address mattered was **what was behind it**: a family's full bank account
details, on a public page, for every Pariwar by default.

⭐ **You have since decided those details come off the public page altogether.** That work is queued.
Once it lands, the page a stranger could find shows the nominee's **name** and no account details at
all.

⇒ the thing that made the address worth worrying about is going away regardless. ⛔ It does not make
the question of *how we asked you* disappear — ⚠ but it may reasonably make it a smaller matter, and
you should weigh that.

## What we are asking you

**First: did we understand you correctly?**

You said **yes, a collecting drive's page should be reachable by the public**, and **yes, make its
address unguessable**.

> **Is that what you meant — both together?**

**Second: does the wrong fact change anything?**

We told you a phone-app member could not reach such a page. They can, in one tap, through the phone's
own browser.

> **Knowing that, would you answer the original question differently?**

## The ways you might answer — ⭐ as combinations, not a fork

⚠⛔ We are listing these as **whole positions** rather than as a branching choice, because turning it
into a branching choice is what went wrong last time. ⛔ You are not confined to this list.

- **(1) "You have it right — both, together."** Your ruling stands exactly as recorded. We add one line
  to the record noting that your answer went beyond the options as we presented them, so a future
  reader is not misled the way we nearly were. ⛔ No code changes. ⭐ **This is the cheapest outcome and
  it is a perfectly proper one.**
- **(2) "You have it right, and the wrong fact does not change it."** As (1), plus we record that the
  mobile claim was false and that you weighed the question again knowing so. ⛔ No code changes.
- **(3) "We meant leave it alone — the unguessable address was not part of our answer."** Then the
  token and the way in were built on a misreading. We would bring you a proposal for what should
  happen to them, ⛔ rather than acting on our own judgement.
- **(4) "The wrong fact matters — ask us again properly."** We withdraw the 2026-09-03 question and put
  it to you again in a corrected note, saying plainly what a phone member can and cannot do. Work
  already merged stays where it is until you rule.
- **(5) Something else.** ⭐ If the way we have framed this is still not how you see it, tell us that
  instead — including if you think this note repeats the same mistake.

## What this note is not

- ⛔ It does not reopen whether bank details may be shown while a drive is collecting. That is yours,
  it is settled, and we are not touching it.
- ⛔ It does not ask you about the speed limit on the page.
- ⛔ It does not ask you to look at any code.
- ⛔ It does not ask you to re-decide taking the bank details off the public page. That decision stands.

## One honest note about how this was found

⛔ This was **not** found by the people who wrote the original note, and ⛔ not at the time.

It was found by a **third** review of the same story — a review run because two earlier reviews had
each closed it as finished. The first said "done" and was wrong. The second found faults in the
first's own repairs, and closed on its own clean run. ⭐ **The third was run precisely because the
second drew that lesson and then did not apply it to itself** — and it is the third that noticed how
the question had been put to you.

⚠ We record that because it bears on how much weight to give our assurances. ⭐ A clean check has now
been offered three times on this story, and each time a further look found something the check could
not see.

