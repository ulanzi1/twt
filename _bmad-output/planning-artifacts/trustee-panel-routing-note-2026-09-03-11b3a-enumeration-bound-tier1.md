# Trustee Panel routing note — 2026-09-03
## Four decrypted bank fields sit behind a **guessable** page address, visible for **every** Pariwar by default. Is a rate limit enough?

**Author:** BigDev, Solo Builder — 2026-09-03
**Occasion:** Story **11b.3a**'s **second-pass code review**. ⭐ The review raised it; BigDev ruled the
same day that it is **BLOCKING ON DEPLOYMENT** and routed it here. ⚠ It is ⛔ **not** a new discovery —
the story states the property in three places. ⭐ **What is missing is the JUDGEMENT**, which AC2 rules
only the Panel may make.
**Routed to:** Trustee Panel.
**Status:** ⛔ **OPEN — BLOCKING.** Story 11b.3a is held at `in-progress` on this item alone. ⚠ Its
build is **complete** and all eight acceptance criteria pass; ⛔ nothing else is outstanding.

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end and is **complete on its own** — the whole question, the options, and what follows
> from each, with ⛔ no technical detail. ⭐ **You can answer this note from Appendix A alone.**
> The numbered sections are the engineering record. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE.** Three separate decisions you have already made are individually reasonable and
> **combine into something none of them considered**:
> · `2026-08-28-160` **cl.10(a)** — complete nominee bank details **may** be shown publicly during an
>   active drive. ⭐ Ruled, and this note does ⛔ **not** reopen it.
> · `2026-09-02-178` — the masking knob is held by the **Trust centrally**. ⇒ a Pariwar ⛔ cannot set
>   its own window.
> · `2026-09-02-179` cl.1 — a Pariwar with **no** window configured is **FAIL-OPEN**: details stay
>   visible.
>
> ⇒ ⭐⭐ **PUT TOGETHER: on the day this ships, EVERY Pariwar shows COMPLETE bank details, because the
> Trust will not yet have configured any of them.** That is not a defect — it is the three rulings
> working exactly as written. ⚠ **What was never weighed is what sits in FRONT of them:** the page
> address is **sequential and guessable**, so the details are reachable by counting rather than by
> being given a link.

---

## 1. What is being asked, precisely

**(Q1) — IS THE RATE LIMIT THE RIGHT CONTROL?** The route is bounded only by `limits.search`, the
ordinary search-tier rate limit. Is that an adequate bound for an **unauthenticated** page carrying
**four decrypted Tier-1 fields**, reachable by walking a **sequential** identifier?

**(Q2) — IF NOT, WHICH CONTROL YIELDS?** The tightening options are not equivalent and they trade
against transparency in different ways (§6). ⛔ The build must ⛔ not pick between them.

⚠ **Q1 is the operative one.** ⛔ Q2 only arises if Q1 is answered *"no"*.

## 2. ⛔ Why the build did not simply tighten it — AC2 forbids exactly that

Story 11b.3a's **AC2** rules, in terms:

> *"⚠⛔ **if `limits.search` is judged insufficient for a Tier-1-bearing single-item GET, that is a
> DECISION, ⛔ not a tuning knob** — ⛔ do ⛔ not quietly tighten or loosen the tier here."*

⇒ ⭐ **The most tempting response — quietly raise the rate limit — is the one specifically foreclosed.**
A stricter tier would reduce the exposure *and* silently reduce what the public can verify, which is the
transparency benefit cl.10(a) **accepted on the record**. ⛔ Trading one against the other is a Panel
act.

## 3. ⚠ The three controls, and why two of them are structurally absent

11b.3's **D11(a)** recorded the public-surface control set. For this route:

| # | Control | Status here |
|---|---|---|
| 1 | Rate limit | ✅ `limits.search` — **the only one in force** |
| 2 | `PUBLIC_SURFACE_PAGE_SIZE_CAP` | ⛔ **N/A** — no `page` parameter to bind to |
| 3 | `PUBLIC_DIRECTORY_PAGE_HORIZON` | ⛔ **N/A** — no `limit` parameter to bind to |

⭐ Controls 2 and 3 are N/A **because this is a single-item page**, ⛔ not because anyone waived them.
⚠⛔ **And that is the whole point:** they were the controls that bounded *bulk* reading on every other
public surface. On a single-item route reached by a **countable** address, "one item per request" is
⛔ not a bound — it is just a smaller unit of collection.

## 4. ⭐ The identifier is sequential AND the public URL carries nothing else — verified, not assumed

Two facts, both read in the code rather than assumed:

**(i) The counter is monotonic.** `packages/domain/src/pool/naming.ts:185` documents `sequence` as *"the
per-(pariwar, YYYY-MM) monotonic sequence; 1 = the first pool that month"*, rendered by
`formatPoolCanonicalIdentifier` as `P-YYYY-MM-###`. ⛔ No random component, ⛔ no unguessable token.

**(ii) ⭐⭐ AND THE PUBLIC ADDRESS CONTAINS NO PARIWAR IDENTIFIER — this is the part that matters.** One
might assume the per-Pariwar scoping helps, because the **API** route is
`/api/v1/p/:pariwarId/public-pages/sahyog-vivran/:id` and a `pariwarId` is a UUID nobody guesses.
⛔ **It does not help.** The **public** page is `/sahyog-vivran/[poolCanonicalIdentifier]`, and
`apps/public/src/lib/pariwar.server.ts` resolves the tenant from a **server-side constant**
(`ACTIVE_PARIWAR_ID`, v1 being single-Pariwar). ⇒ the visitor supplies **only the sequence number**; the
server supplies the rest.

⇒ ⭐ **The walk is `/sahyog-vivran/P-2026-09-001`, `-002`, `-003` …** — ⛔ no secret, ⛔ no token, ⛔ no
UUID. ⚠ **Stated plainly because the reassuring version is available and wrong:** the UUID in the API
path never reaches the reader, so it bounds nothing.

⚠ **This was already flagged and left open.** 11b.3's rider **`D4-linkage`** asked whether a `live`
drive's page is linked from anywhere or reachable **by identifier only** — `/sahyog` lists only closed
and settled drives. That rider was routed to **this** story's AC2 by name, and it arrives here.

⚠ **One scoping note, in fairness:** because v1 serves a **single** Pariwar publicly, the walkable set is
that Pariwar's drives — ⛔ not every Pariwar's at once. The *fail-open default* is what applies to every
Pariwar; the *walk* applies to whichever Pariwar a public site is serving. ⛔ Both are true and they are
different claims.

## 5. ⚠⛔ Why this weighs more now than when the identifier was designed

When `D4-linkage` was raised, the page behind the identifier held ⛔ **no Tier-1 field at all** — Story
11b.3 shipped it with a **checkable** property that the count was **zero**.

⭐⭐ **Story 11b.3a is what changed the stakes**, and it did so lawfully: cl.10 and `-165` cl.1 ruled four
named fields onto this surface. But the arithmetic moved:

- **Then:** a guessable address led to a page with **no** personal data.
- **Now:** a guessable address leads to an **account holder's name, full account number, IFSC and VPA**
  — ⛔ and under fail-open, for **every Pariwar**, until the Trust acts.

⇒ ⛔ **Nothing was done wrongly.** The exposure is the sum of three correct rulings plus one property
nobody re-examined when the fourth changed.

## 6. What follows from each answer

**(a) `limits.search` IS sufficient — accept and record.** ⛔ No code change. ⭐ The bound that matters is
then **deployment plus the counsel/Panel process** — the same thing keeping `D5(a)`'s *"built is ⛔ still
not published"* true. ⚠ The judgement is recorded as **made**, so it stops reading as an open question.

**(b) Tighten the rate limit.** Reduces bulk collection; ⚠ also throttles ordinary readers, and ⛔ a
determined collector with patience is bounded only by time. ⭐ Honest framing: this raises the **cost** of
collection, it does ⛔ not prevent it.

**(c) Make the address unguessable** (an opaque token alongside the human-readable identifier). ⭐ The
only option that removes *walking* as an access method. ⚠ Cost: a drive page becomes something you must
be **given** — the public could no longer *discover* a drive, only *be shown* one. ⇒ the set of drives
anyone can examine becomes the set someone published a link to, which moves a **public record** toward a
**disclosed document**. ⛔ That is a policy change, not an engineering one.

⭐⭐ **BUT THE COST IS ⛔ NOT ONE COST — IT SPLITS IN TWO, AND THE HALVES POINT OPPOSITE WAYS.** This was
missed on the first drafting of this note and is the sharpest thing in it:

| Drive state | On the `/sahyog` index? | What a token would cost |
|---|---|---|
| `closed` / `settled` | ✅ **Yes** — listed | ⭐ **Almost nothing.** Already discoverable through a published link; the token changes the address, ⛔ not the discoverability. |
| `live` | ⛔ **No** — deliberately absent | ⚠ **It would close the only door.** A live drive is reachable *today* by constructing the identifier and by ⛔ nothing else. |

⚠⛔ **AND THE `live` HALF INVERTS THE ARGUMENT, WHICH IS WHY IT IS PUT TO YOU RATHER THAN DECIDED.**
`public-read.ts:84-87` excludes `live` from the index **deliberately**, and states the reason in terms:

> *"⛔ `spawned` and `live` are ABSENT deliberately: a drive still collecting is ⛔ not a transparency
> record, **it is an open solicitation**, and publishing it would invite exactly the 'who has given so
> far' reading this surface exists to refuse."*

⇒ ⭐ **So a live drive being reachable by counting is arguably ⛔ not a transparency affordance at all —
it is a side effect of the identifier scheme that hands a reader precisely what the index design
declined to publish.** On that reading, tokenizing **restores** an existing decision rather than
narrowing transparency.

⚠ **The opposite reading is also available and honest:** cl.10(a)'s accepted benefit is verification
*during* an active campaign — a donor checking that a live drive pays a real family. ⛔ If a live drive
can only be reached by a link the Trust hands out, that check depends on the Trust. ⇒ **which reading
governs is exactly the judgement being asked for**, and the build must ⛔ not pick.

**(d) Change the fail-open default** (`2026-09-02-179` cl.1). ⭐ Would shrink the exposed population from
*every* Pariwar to *only those the Trust configured open*. ⚠⛔ **But you ruled fail-open deliberately,
with its cost in front of you**, and this note does ⛔ **not** recommend reopening it — it is listed
because it is the control with the largest effect, and you should know that.

**(e) Gate the bank block behind authentication**, leaving the rest of the page public. ⚠ `-164` **A2**
records the post-masking authenticated-member presentation as *"a separate future decision — ⛔ not
carried, ⛔ not foreclosed"*, so this is available. ⛔ It would narrow cl.10(a)'s accepted transparency
benefit, which is why it is yours and not ours.

## 7. ⛔ What this note does NOT ask

- ⛔ It does **not** reopen **cl.10(a)**. That public display during an active campaign is permitted is
  **ruled**, and the build implements it.
- ⛔ It does **not** ask you to re-decide **`D8-default`** (fail-open). §6(d) is disclosure, ⛔ not a
  request.
- ⛔ It does **not** claim a leak, a breach or a defect. ⚠ Nothing is deployed; ⛔ no member's data has
  been exposed.
- ⛔ It does **not** ask for a technical preference between rate-limit values. If the answer is (b), we
  will bring the specific tier back as its own note.

## 8. What is put to the Panel

> **Is the ordinary search rate limit an adequate bound on an unauthenticated, single-item public page
> carrying four decrypted Tier-1 bank fields, reached by a sequential and therefore guessable address,
> for every Pariwar by default?**
>
> **If yes** — we record the judgement as made and Story 11b.3a closes.
> **If no** — which of (b) / (c) / (d) / (e) do you direct, and we return with that as its own note.

⚠ **Either answer unblocks the story.** ⛔ What cannot happen is the question staying unanswered while
the surface deploys.

## 9. ⚠ Status of the work while this is open

Story 11b.3a is held at **`in-progress`**, and ⛔ **the build is not why** — it is complete, all eight
acceptance criteria pass, and `ci:local` is green across 34 jobs. ⭐ The row is held **solely** on this
note. ⛔ It must not be flipped to `done` by re-reading the build as finished.

## Sources — every one read at `6706ae0`

- `2026-08-28-160` cl.10(a)–(g) — the publication and masking ruling (Trustee-ratified)
- `2026-08-28-165` cl.1 / cl.3 — the four Tier-1 fields and their allowlist entries
- `2026-09-02-177` (`D5(a)`) — build un-gated; *"built is ⛔ still not published"*
- `2026-09-02-178` — masking authority held centrally (`super_admin`)
- `2026-09-02-179` cl.1 (`D8-default`) — **FAIL-OPEN**
- `2026-09-02-176` (`D4`/`D4-linkage`) — visible states, and the linkage rider routed here
- Story 11b.3a **AC2** — the *"that is a DECISION, ⛔ not a tuning knob"* rule
- `apps/api/src/modules/public-pages/routes.ts` — the route registration and its control-set header
- `packages/domain/src/pool/public-read.ts:84-89` — `SAHYOG_DRIVE_VISIBLE_POOL_STATES = ['closed',
  'settled']`, and the recorded reason `live` is excluded (*"an open solicitation"*) — the basis for
  §6(c)'s split cost
- `packages/domain/src/pool/naming.ts:185` — `sequence` as the per-(pariwar, YYYY-MM) monotonic counter
- `apps/public/src/lib/pariwar.server.ts` — `ACTIVE_PARIWAR_ID`, the server-side tenant constant
- `_bmad-output/implementation-artifacts/deferred-work.md` — the blocking item, second-pass section

---

# Appendix A — in plain words

## The short version

When a family receives support, a public page shows their **bank details** so anyone can check the
money went to a real family. You approved that.

The page has an address like **`P-2026-09-004`**. ⚠ The number simply **counts up**, and the web address
contains **nothing else** — no code, no key. So someone who finds one page reaches the next by
**changing the number by one**. They do not need a link, and they do not need to be told anything.

Today the only thing slowing that down is a limit on **how fast** anyone can load pages. ⛔ Nothing
stops them going through the pages one by one, patiently.

**The question is: is "slowly" good enough, or should something stronger stand in the way?**

## Why this is being asked now

Until last week, the page behind that address held **nothing personal**. Now it holds **four** personal
things: the **account holder's name**, the **full account number**, the **IFSC code** and the **UPI
ID**.

⚠ And because you decided the **Trust** sets the hiding rule centrally, and that details stay **visible**
until the Trust sets it — **on the day this goes live, every Pariwar's details will be showing.** ⛔ Not
by mistake. That is exactly what the three decisions say when you put them together.

⭐ **Nothing was done wrongly here.** Each decision was sound on its own. This is what they add up to,
and the adding-up is what nobody has looked at.

## What we are asking you

**Is a speed limit enough protection for this page?**

## What we could do instead, if it is not

- **Slow it down more.** Easy. ⚠ Also makes the page slower for ordinary people — and someone patient
  still gets through eventually. It raises the **effort**, it does not close the door.
- **Make the address unguessable.** Add a long random code to the address. ⭐ This is the only option
  that actually stops someone counting their way through. ⚠ But then the page is something you must be
  **given** — someone has to send you the link. Nobody could go looking on their own; they could only
  be shown. ⇒ what the public can check would become **what we chose to publish a link to**, and the
  question *"is there a drive you are not telling me about?"* could no longer be answered by an
  outsider. ⭐ **See the note below — this cost is not the same for all drives.**
- **Change the starting position** so details are hidden until the Trust decides otherwise. ⚠ You chose
  the opposite deliberately, and we are ⛔ **not** asking you to change it. We mention it only because
  it would make the biggest difference and you should know that.
- **Ask people to sign in** to see the bank details, keeping the rest of the page open to all. ⚠ This
  would reduce what the public can check without an account.

## ⭐ One thing worth knowing before you weigh the "unguessable address" option

That option costs **very different things** for two kinds of drive, and it is easy to miss.

**For drives that have finished** (closed, or paid out) — ⭐ **it costs almost nothing.** Those are
already **listed** on the public `/sahyog` page, so anyone can find them from that list. Changing the
address would not hide them; they would still be listed.

**For drives still collecting** — ⚠ **it would close the only way in.** A running drive is **not** on
that list, so today the *only* way to reach it is by typing the number.

⚠⭐ **And here is the part that may change your view.** A running drive was left off the list **on
purpose**. The reason written down at the time was that a drive still collecting is *"not a transparency
record, it is an open solicitation"* — the concern being that showing it invites people to read it as
*"who has given so far,"* which we specifically did not want.

⇒ ⭐ So one honest way to see it: **someone reaching a running drive by counting is getting the very
thing we decided not to publish.** Making the address unguessable would not be taking transparency
away — it would be restoring a decision already made.

⚠ **But the other way is just as honest:** part of why you allowed bank details to show during a drive
was so a donor could check, *while giving*, that the money goes to a real family. ⛔ If a running drive
can only be reached through a link we hand out, that check depends on **us** — the very people being
checked on.

⇒ **We are not choosing between those two readings. That is what we are asking you to do.**

## What happens either way

- **If you say the speed limit is enough** — we write that down as a decision you made, and the work
  finishes. Nothing changes in the software.
- **If you say it is not** — you tell us which of the above to do, and we come back to you with that
  one specific proposal.

⭐ **Either answer lets the work finish.** The only thing that does not work is leaving it unanswered,
because then the page could go live while the question is still open.

## What this note is not

- ⛔ It is **not** saying anything has leaked. **Nothing is live.** ⛔ No family's details have been
  exposed to anyone.
- ⛔ It is **not** asking you to change your mind about showing bank details during a drive. You decided
  that, and we built it.
- ⛔ It is **not** saying anyone made a mistake — including you. Three sound decisions met a fourth
  thing nobody looked at again.

## One honest note about how this was found

⚠ This was found by **reviewing the review**. A first check of this work passed and marked it finished.
A second check, run over the **fixes the first one made**, found this — along with two mistakes in
those very fixes.

⭐ We mention it because it is the useful part: **the first review said "done", and it was wrong.** That
is worth knowing the next time a green check is offered as proof.
