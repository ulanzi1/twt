# For the Trustee Panel — told, not asked: a CORRECTION (Story 6.37d, 2026-10-20)

**For:** Dhiraj Rahul · Kalpana Bharti
**Prepared by:** BigDev (Solo Builder) · **Status:** **WRITTEN 2026-10-20 — TOLD 2026-10-20** (sent to the Panel by BigDev: *"report has been
sent"*). Kept as sent; ⛔ a ruling was asked (BigDev decided it is told, not asked — Decision `2026-10-20-370`). It corrects the item sent earlier today
(`trustee-panel-told-2026-10-20-6-37d-whatsapp-and-forged-reports.md`), which is kept exactly as sent.
**What this is:** a correction of something we told you, for your information. Nothing here asks you to decide anything.

---

## We told you "at most one WhatsApp message per follow-up, ever". The true limit is two.

**What we said earlier today.** That a forged "not delivered" report could now cause **one** WhatsApp message to the claimant, and that
there is *"at most one WhatsApp message per follow-up, ever"*.

**What is actually true.** If Meta answers "server error" at the moment we send, we treat the message as not sent and try once more.
If Meta had in fact sent the first one, the claimant gets **the same message twice** — the same reminder, in the daytime, to the same
person. We now stop there: **the claimant can get the same message at most twice per follow-up, ever.** (Before this correction, a retry the next morning could start
afresh, so in a bad case it could have been more than two. That is fixed.)

**Why we did not make it one.** The other choice is to count every Meta error as "maybe sent" and never retry. Then one short Meta outage
would silently use up the claimant's only WhatsApp reminder. We chose one possible duplicate over that silent loss. This goes slightly
beyond what you accepted when you ruled on the timing ("two messages are sent that day, one never arrived"): here both may arrive.

**Three smaller corrections to the same item.**
- *"At most one follow-up per person at a time"* — it is one follow-up per person **for each of the two reminders** (the bank-details
  correction and the death certificate). A person in both at once could get one WhatsApp for each.
- *"It cannot go before … Meta has approved the message (the go-live list's row 36)"* — Meta refuses to send a message it has not
  approved, so the first half is true. But row 36 does **not** check it: the check that the messages were approved as the kind Meta
  allows for reminders was dropped from row 36, as a known and recorded risk.
- *"It cannot reach a nominee"* — it cannot reach a nominee **as a nominee**. A nominee who is also the person who made the claim is
  reached as the claimant.

**What we did.** ADR-0042 gains a second dated note with these corrections (no word of the ratified text changed). Nothing about who is
contacted, or when, has changed.

---

*Evidence (for the record): Decisions `2026-10-20-370` decisions 1 and 5 and `2026-10-20-371` (migration 0176); Decision `2026-10-20-369` decision 5; `-366` decision 2 (the retry rule, as 6.31 uses it); Story 6.37d I4
and code review round 2 P3; deferred-work's 6.37d item "A post-send 500 / 503 is retried and MAY send a second WhatsApp"; roster Row 36
(c) dropped by `-367` decision 4; `-367` PQ1 A.*
