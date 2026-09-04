# Trustee Panel routing note — 2026-09-04
## `2026-09-03-184` asked for **(A) reachable** and **(B) unguessable**. For a **listed** drive those two cannot both hold — and the build has now proven it.

**Author:** BigDev, Solo Builder — 2026-09-04
**Occasion:** Story **11b.10**'s second code review. ⭐ Found by **executing** the shipped surface, ⛔ not
by reading it — the walk below was run end-to-end against a live database before this note was written.
**Routed to:** Trustee Panel.
**Status:** ⏳ **OPEN — awaiting the Panel.** Logged as `.decision-log.md#decision-2026-09-04-186`
(author-committed **factual correction**; the question it raises is this note's).
⛔ **Nothing is applied, and Story 11b.10 is held at `in-progress` until this is answered.**

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end and is **complete on its own** — the whole question, the options, and what follows
> from each, with ⛔ no technical detail. ⭐ **You can answer this note from Appendix A alone.**
> The numbered sections are the engineering record. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE.** On 2026-09-03 you ratified two things about a drive's public page:
> · **(A)** a drive **should be publicly reachable**;
> · **(B)** its public address must be **UNGUESSABLE**.
>
> ⭐ Both were built. ⛔ **But for the drives that appear on the public index — `closed` and `settled` —
> (B) cannot do any work, and the reason is (A) itself.** A page you publish a **link** to is a page
> whose address you have **published**. The link *is* the address.
>
> ⚠⛔ **This is ⛔ NOT a defect in the code, and there is ⛔ no version of the code that fixes it.** It is
> a consequence of the two answers being applied to the same drive. ⇒ only you can resolve it.
>
> ⭐⭐ **WHERE (B) *DOES* WORK, AND IT MATTERS:** `live` drives are ⛔ **not listed** on the index. For
> those there is ⛔ no published link, so the unguessable address is the **whole** protection, and it
> holds completely. **(B) was not wasted.**
>
> ⚠⛔ **AMENDED 2026-09-04 (`#decision-2026-09-04-187`) — AND THE AMENDMENT MATTERS TO THIS NOTE.** This
> paragraph originally justified that exclusion as deliberate, quoting *"an open solicitation"*.
> ⛔ **That phrase is ⛔ NOT a ruling of yours** — it is a code comment written at implementation time,
> and it appears in ⛔ no planning artifact and ⛔ no decision. ⛔ **FR-76 in fact says the OPPOSITE**
> (*"Active page near-real-time during live alert"*) and was never built. ⇒ whether collecting drives
> are listed is now **ITS OWN OPEN QUESTION** —
> `trustee-panel-routing-note-2026-09-04-11b10-collecting-drive-visibility.md`. ⚠⛔ **THE TWO NOTES
> INTERLOCK: if you rule that collecting drives ARE listed, the protection this paragraph describes
> ends for every drive.** ⭐ Please answer both in one sitting.

---

## 1. What is being asked, precisely

**(Q1) — DID YOU INTEND (B) TO PROTECT LISTED DRIVES AT ALL?** For `closed`/`settled` drives the public
index publishes a link to every drive it lists. Was (B) meant to apply to them, or was it aimed at the
`live` drives that have no link?

**(Q2) — WHAT, IF ANYTHING, SHOULD CHANGE NOW?** Four options are set out in §5. ⚠ Our view is offered
as a view in Appendix A; ⛔ we are not asking you to rubber-stamp it.

**(Q3) — DOES THIS RE-OPEN cl.5?** `2026-09-03-184` cl.5 recorded that option **(d)** — reducing what a
drive's page *shows* — was *"disclosure only"* and you did **not** direct it. ⚠ The finding below bears
on that choice, because the thing (B) was protecting turns out to be protected only for one of the three
states. ⛔ We will **not** treat cl.5 as re-opened by implication ([[feedback_supersede_never_reinterpret]]).

## 2. ⭐ What was ratified, and what was built

| Ref | What it says | Status |
|---|---|---|
| `2026-09-03-184` **(A)** | a `live` drive **should be publicly reachable** | Trustee-ratified |
| `2026-09-03-184` **(B)** | the public address must be **UNGUESSABLE** | Trustee-ratified |
| `2026-09-03-184` **cl.2** | `P-YYYY-MM-###` is **RETAINED** as the operational/audit key | Trustee-ratified |
| `2026-09-03-184` **cl.5** | option **(d)** (disclosure reduction) was **not** directed | Trustee-ratified |
| `2026-09-04-185` **cl.3–4** | widened to **all three** visible states; `closed`/`settled` gain a **per-row link** on `/sahyog` | Author-committed correction |
| **D3** (BigDev, 2026-09-04) | that per-row link is the **necessary consequence** of (A)+(B), ⛔ not a fresh exposure decision | Story ruling |

⭐ **All of it shipped.** The address is now a 128-bit random token on the pool row; the sequential
identifier is retained but is ⛔ no longer addressable; the index carries a per-row link built from the
token; and the member app carries an entry for `live` drives.

## 3. ⛔⛔ The finding — and it was **executed**, not inferred

`/sahyog` carries a **public search box** that filters by drive code, and the drive code is the
**sequential** `P-YYYY-MM-###`:

- `apps/public/src/pages/sahyog.astro:410` — `<input name="poolCode" …>`
- `apps/public/src/lib/sahyog.server.ts:112` — forwards it to the API
- `packages/domain/src/pool/public-read.ts:594` — exact match on `pool_canonical_identifier`

⇒ `GET /sahyog?poolCode=P-2026-08-001` returns **HTML containing that drive's link**, and the link
contains the token. **Run live against the test database, 2026-09-04:**

```
GET /api/v1/p/{pariwar}/public-pages/sahyog-drive?poolCode=P-2026-08-b765ec   →  200
{"items":[{ … "poolCanonicalIdentifier":"P-2026-08-b765ec",
            "publicToken":"tok-077e0e83-0580-4a99-a0ed-8c798c971fc0" … }]}
```

⇒ **sequential identifier → token → the drive page's four decrypted Tier-1 bank fields**, in **two**
unauthenticated requests, at the same rate-limit tier as before.

⚠ **The `poolCode` filter is PRE-EXISTING** — Story 11b.1 built it as an ordinary find-my-family's-drive
affordance, and it is a **legitimate product feature**. ⛔ Nothing about it was wrong when it was built.
What is new is that Story 11b.10 put the address on the same row it returns.

⭐⭐ **AND REMOVING THE FILTER WOULD ⛔ NOT CLOSE IT.** The index is paginated and public; walking the
pages harvests the same tokens more slowly. **The link is the disclosure.** There is no wire shape, no
field removal and no filter change that makes a published link unpublished.

## 4. ⚖️ What (B) actually bought — stated fairly, in both directions

**⭐ What it genuinely closed:**
- **`live` drives are fully protected — ⚠ for as long as they stay unlisted.** They have ⛔ no
  published link today, so the address is unguessable in the full sense. This is the state you were
  most concerned about in (A). ⚠⛔ **But their unlisted status is ⛔ NOT a ruling of yours** and is
  itself now open — see `…-collecting-drive-visibility.md` (`#decision-2026-09-04-187`).
- **Direct URL construction is dead everywhere.** Before 11b.10 anyone could type
  `/sahyog-vivran/P-2026-08-001` with **zero** prior requests. That is now impossible for every state.
- **Archived drives past the index horizon** are unreachable without a saved link.

**⛔ What it did not close, for `closed`/`settled`:**
- A targeted lookup by drive code costs **one extra request**. The cost class is unchanged.
- ⇒ the four decrypted Tier-1 bank fields behind a listed drive remain collectable, in bulk, by anyone.

## 5. The options

**(i) ⭐ ACCEPT AND STATE IT.** (B) protects `live` drives and archived-past-horizon drives; listed
drives are *meant* to be reachable, and reachable means discoverable. Amend the three engineering
documents that currently overstate it (§6) and close the story.
· ⛔ No code change. ⛔ No exposure change. ⭐ The honest description of what was built.

**(ii) Gate or remove the `poolCode` search box.** Raises the cost of a *targeted* lookup; ⛔ does not
change the principle, since paging still harvests. ⚠ It also removes a genuine affordance: a family
looking for their own relative's drive by the code on their paperwork.

**(iii) Stop publishing per-row links for `closed`/`settled`.** This *would* restore (B) for them —
⛔ but it directly contradicts `2026-09-04-185` cl.3–4, which you widened **for** those states, and it
would leave the archive reachable only by a link somebody already holds.

**(iv) ⚠ Revisit what a listed drive's page SHOWS — i.e. cl.5's option (d).** ⛔ **Not directed in
`-184`, and ⛔ we are not asking for it by the back door.** It is listed because it is the only option
that reduces the *harm* rather than the *findability*: the drive page renders the bank details **in
full, for every Pariwar, until a Trust configures a masking window** (`D8-default` **FAIL-OPEN**,
`2026-09-02-179` cl.1). ⇒ if the concern behind (B) was the **bank details**, this is the lever that
actually moves them; if the concern was **enumeration**, (i) is the honest answer.

⚠⛔ **`limits.search` is ⛔ NOT on this list, in either direction** — tightening or loosening the rate
tier is a decision of yours (`2026-09-02-183` cl.5) and 11b.3a's AC2 forbids doing it as an authoring
act. ⛔ We have not touched it and will not.

## 6. ⚠ Three live documents currently overstate the protection — and are being corrected

Written during 11b.10 and now known to be too strong for listed drives:

- `apps/api/src/modules/public-pages/routes.ts:309` — *"there is ⛔ no sequence left to walk"*
- `apps/api/tests/integration/public-pages/login-wall.spec.ts:237` — *"there is now ⛔ NO SEQUENCE TO WALK"*
- `packages/contracts/public-pages/public-vs-private-matrix.yaml` — the `D4-linkage` rider

⭐ These are being **amended to state the verified fact** — that (B) bounds discovery for **unlisted**
drives, and that the listed-drive residual is **open with the Panel under this note**. ⛔ The amendment
does **not** pre-empt your answer: it removes a claim we have **proven false**, which is a matter of
record-keeping honesty ([[feedback_record_unattested_no_backfill]]), ⛔ not a decision. Whatever you rule
in §5, the corrected sentence stays true.

## 7. ⛔ What this note does not do

⛔ It does **not** reverse, supersede or vacate `2026-09-03-184` — (A), (B) and cl.2 all stand.
⛔ It does **not** re-open cl.5 by implication (see **Q3**).
⛔ It does **not** propose a rate-limit change.
⛔ It does **not** touch the masking default, its knob or its predicate.
⛔ It changes **no** member-facing behaviour: nothing is published or unpublished by this note.

---

# Appendix A — In plain words

## What you decided

In September you decided two things about the page that shows a closed drive's details:

1. **People should be able to reach it.**
2. **Its web address should be impossible to guess.**

Both were built, exactly as asked.

## What we have since found

**For the drives that appear on the public list, those two decisions work against each other.**

The public list shows each drive with a **link** you can click. A link *contains* the address. So for
any drive on that list, the address is not secret — **we publish it ourselves, to everyone, on purpose,
because you asked that people be able to reach it.**

There is also a **search box** on that page. Type a drive's reference code — the `P-2026-08-001` style
code printed on paperwork — and it hands back that drive's link. We ran this against a real database to
be sure: **two steps, no login, and you are on a page showing the family's bank details.**

⚠ **This is not something we got wrong and can fix.** There is no way to publish a link to a page and
also keep that page's address unguessable. They are the same thing.

## Where the unguessable address *does* work — and it is the important half

**Drives that are still collecting money are not on the public list at all.** For those there is no
published link, so the unguessable address is the only way in — and it works completely. That was the
state you were most concerned about, and it is protected.

⚠ **But we must correct something we told you here.** We described that exclusion as a settled rule,
with the reason *"a drive still asking for money is a solicitation."* **That was not your decision, and
it is not in any plan** — it is a note written inside the source code. The trust's own written
requirement says the opposite. That is now a separate question in front of you, in the companion note.
⇒ **if you decide those drives should be listed, the protection described in this paragraph ends.**

The change also killed something real for *every* drive: before this work, anyone could simply **type a
guessed address** and land on a page. That no longer works anywhere.

## What we would like you to decide

**Option 1 — Accept it, and let us describe it accurately.**
Listed drives are *meant* to be findable; being findable and being unguessable cannot both be true. We
correct our internal notes to say what is actually protected. ⛔ Nothing changes for anyone using the
site.

**Option 2 — Remove the search box.** Makes looking up one specific drive harder. ⚠ It does not really
solve it — someone patient can still page through the list — and it takes away a genuine convenience for
a family looking up their own relative's drive.

**Option 3 — Stop showing links for closed drives.** This would restore the secrecy, but it undoes the
decision you widened on 4 September, and it would mean an archived drive is reachable only by someone
who already saved the link.

**Option 4 — Look again at *how much* a closed drive's page shows.**
⛔ You considered this in September and chose not to do it, and we are **not** asking you to reverse that
by the back door. We raise it because it is the only option that changes what is actually at stake.

⚠ **The thing worth knowing:** the drive page currently shows the family's **bank details in full**, and
it will keep doing that **for every Pariwar until the Trust configures the setting** — because the
default, when nothing is configured, is to **show** rather than to hide. The unguessable address was
chosen to protect those details. For listed drives it cannot.

⚠⛔ **CORRECTED 2026-09-04 — AND THE CORRECTION CHANGES WHAT THE SETTING CAN DO.** This paragraph
originally ended *"a time limit can"*. ⭐ True for a **finished** drive. ⛔ **FALSE for one that is
still collecting:** the time limit is counted from the day a drive **closes**, so a collecting drive
never starts the clock and its details stay visible in full — **even where the limit is set to zero
days.** ⇒ only the **"permanent"** setting reaches a collecting drive. If collecting drives are your
concern, ⛔ a time limit is not the lever; **"permanent"** is.

⭐ **Our view, offered as a view:** **Option 1** is the correct answer to the question you were actually
asked — the address work did what it could, and where it could not, that is because you also asked for
reachability. **But if the bank details were the real worry, Option 1 leaves that worry exactly where it
was**, and Option 4 is the one that addresses it. Those are two different questions and we would rather
you answered them separately than have us blend them.

## What happens either way

Option 1 is free. Option 2 is about an hour's work. Option 3 is a day. Option 4 is a genuine piece of
work and would be its own story, with its own note to you.

⛔ **Nothing has been published to the public site by any of this**, and Story 11b.10 is held open until
you answer.

## What we are asking

1. **Was the unguessable address meant to protect the listed (closed) drives at all, or the still-open ones?**
2. **Which of the four options?**
3. **If Option 4 interests you — should that be raised as its own separate note?** ⛔ We will not treat
   your answer here as re-opening the September decision unless you say so.
