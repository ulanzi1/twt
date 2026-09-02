# Trustee Panel routing note — 2026-09-02
## Closing the public/member name gap: does it reach the **notifications and the PDF**, or only the **in-app screens**?

**Author:** BigDev, Solo Builder — 2026-09-02
**Occasion:** Story **8.16**'s Task 0. The Panel directed at `2026-09-02-179` **cl.3** that *"the
public/member inversion gap shall be closed."* ⭐ **The direction is ⛔ not in question.** What the
ruling's words do ⛔ not settle is **how far the closure reaches** — and two of the four places the
name appears **leave the app**.
**Routed to:** Trustee Panel.
**Status:** ✅ **ANSWERED 2026-09-02** — see **§10**. **ALL FOUR.** Logged as
`.decision-log.md#decision-2026-09-02-180`. ⛔ Nothing is **applied** yet — Story 8.16 does the work.

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end and is **complete on its own** — the whole question, the options, and what follows
> from each, with ⛔ no technical detail. ⭐ **You can answer this note from Appendix A alone.**
> The numbered sections are the engineering record. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE.** The shielded member-side name lives in **ONE** resolver with **FOUR**
> consumers. Two are screens inside the app. ⚠ **The other two leave it:** a **PDF** the member
> downloads and can forward, and the **cycle-open push / WhatsApp / SMS** message.
>
> ⭐ **A public web page is PULL** — someone has to go and look for it.
> ⚠⚠ **A message is PUSH** — it puts the name on a phone that nobody asked to look at, and that may be
> shared.
>
> ⛔ **`-179` cl.3's words do ⛔ not distinguish the two**, and ⛔ this is ⛔ not a difference an
> engineer should decide.
>
> ⚠⛔ **AND THERE IS ⛔ NO CHEAP MIDDLE.** Splitting them re-creates, by hand, the exact divergence the
> resolver was **built to prevent** (§5).

---

## 1. What is being asked, precisely

**⭐ NOT in question:** *whether* the gap closes (`-179` cl.3 — ruled), or *which direction* it closes
in (the member side rises; the public form is ratified full name on both surfaces, so lowering the
public side would reverse three rulings of 2 September).

**⛔ IN question — the SCOPE.** Of the four places the member-side name appears, which rise to the
public form?

## 2. The four consumers — verified

| # | Consumer | Story | Leaves the app? |
|---|---|---|---|
| ① | **My Pool card** | 8.6 | ⛔ No — in-app |
| ② | **Yogdaan Bahi** (the passbook) | 8.6 | ⛔ No — in-app |
| ③ | **Contribution Note PDF** | 8.7 | ⚠ **YES** — downloaded, kept, forwardable |
| ④ | **Cycle-open push / WhatsApp / SMS** | 8.8 | ⚠⚠ **YES** — delivered to a handset |

⭐ **This is the COMPLETE set — verified, ⛔ not assumed.** A fifth candidate was checked and ruled out:
the close-of-cycle copy carries a `{familyName}` token, but it has **zero production suppliers** and
the Panchayat Noticeboard does ⛔ not render a family name. ⇒ ⛔ **there is no fifth surface.**

## 3. ⚠ The notification DOES carry the name — verified, ⛔ not assumed

It would be reasonable to hope consumer ④ only says *"Pool F"*. ⛔ It does not.
`apps/jobs/src/scheduler/contribution-notify-triggers.ts:251-253` **joins the name parts** and the copy
interpolates them — e.g. `contribution.json`: *"Standing with **{family}**'s family"*, and *"…please
contribute to support **{family}**'s family."*

⇒ ⭐ **the family's name is in the message body today**, in first-name + last-initial form. The
question is whether it becomes the **full** name.

## 4. ⭐ The exposure, bounded honestly — ⛔ it is smaller than "a broadcast"

`contribution-notify-triggers.ts:10` — *"one `alert_published` notification **per member assigned to a
pool in that cycle**."* ⇒ the audience is **the pool roster**, ⛔ not the Pariwar and ⛔ not the
membership. The project's own recorded scale for a pool roster is *"**dozens**, not the ~16k Sahyog
Vivran scale."*

⚠⭐ **And who those dozens ARE matters:** they are **the people contributing to that family's drive** —
and under **every** option they will see the full name **inside the app** anyway.

⇒ ⭐ **the real delta of including ④ is narrow and should be stated as exactly what it is:** the name
moves from *"inside the app, where a contributor looks"* to *"on a lock screen, in a WhatsApp thread,
or in an SMS."* ⚠ ⛔ That is ⛔ not nothing — a lock screen is visible to whoever holds the phone, an
SMS is carrier-visible and unencrypted, and a WhatsApp message persists in a chat history — ⛔ but it
is ⛔ not a broadcast to strangers, and ⛔ it must not be argued as one.

## 5. ⛔⛔ SPLITTING IS ⛔ NOT FREE — the resolver exists BECAUSE of this

The resolver's own header, verbatim:

> *"A divergence between the push a member receives and the card they open would read to Sushil as
> **two different pools**, so the resolver moves to `@twt/domain` rather than being duplicated by
> value."*

⇒ ⭐ **all four render identically BY CONSTRUCTION, and that identity IS the design.** Story 8.8 moved
the resolver into the shared domain layer **specifically** so a member could not receive a message
about one pool and open a card that looked like another.

⚠⛔ ⇒ **choosing "in-app only" is ⛔ not a narrowing — it is a deliberate RE-DIVERGENCE**, and it
re-introduces the confusion 8.8 was built to remove. ⛔ It remains available; ⛔ it is ⛔ not cheap, and
the note refuses to present it as the safe default.

## 6. ⚠ Part of the gap is ⛔ NOT REAL — and it should not be argued as though it were

For a member with a **single-name** record (a mononym), the member side **already renders the entire
stored legal name today** — the shielding helper returns an empty initial, and the resolver returns the
name anyway.

⭐ **Mononyms are common in India**, and this was ruled on for the public directory in August, where
the consequence ran the *other* way (the shield silently did nothing). ⇒ ⚠ **for that class of family
there is ⛔ no gap to close**, and Story 8.16 is instructed ⛔ **not** to report closing one.

⛔ This is recorded because it makes the problem **smaller than it sounds**, and the Panel should have
that before weighing the exposure.

## 7. ⛔ What is NOT changed, whichever way you answer

⛔ **The public pages are untouched** — they render through a different resolver, and the code says so
in terms. ⛔ **No data becomes newly readable**: the name is already decrypted for every one of these
four surfaces today; what changes is **which characters are printed**, ⛔ not who may read them.
⛔ **No privacy tier moves**, ⛔ no public-matrix entry is added or edited, and ⛔ no new permission is
minted.

## 8. What is put to the Panel

1. **Q1 — the SCOPE.** Which consumers rise to the full name?
   **(a) ALL FOUR** · **(b) the IN-APP TWO only** · **(c) all except the push (④)** — the PDF is
   *pulled* (the member asks for it), the message is not.
   ⚠ **This author's view**, offered as a view: **(a)**. The recipients are the contributors to that
   family's drive, the audience is dozens, they will see the full name in the app under any option, and
   (b)/(c) buy a narrow reduction by re-creating the *"two different pools"* defect 8.8 removed.
   ⛔ It is a **view**, ⛔ not a recommendation the Panel should feel bound by — a lock screen is
   genuinely not an app, and that is a legitimate ground to answer otherwise.
2. **Q2 — if you choose (b) or (c): is the remainder ACCEPTED, or does it stay OPEN?** ⚠ Under (b)/(c)
   the gap is **NARROWED, ⛔ not closed** — a member would still see less in a message than a stranger
   sees on the web. ⛔ Story 8.16 is instructed ⛔ **not** to report a partial fix as a closure, so the
   record must say which it is.

## 9. What this note does ⛔ NOT do

⛔ Does **not** rule, ratify, amend or apply anything · ⛔ does **not** re-open `-179` cl.3, the
direction of the closure, or any of the 2 September name rulings · ⛔ does **not** touch the public
surfaces (§7) · ⛔ does **not** change the mononym behaviour (§6) · ⛔ does **not** add a permission, a
tier, or a matrix entry · ⛔ does **not** ask about the **contributor** or **nominee** names, which are
separate subjects already ruled · ⛔ and it publishes nothing: **built is not published.**

⚠ **The phrasing rule binds every line above:** *"counsel has not reviewed X"* — ⛔ **never** *"counsel
is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`).

---

## Sources — every one read at `79ed41d`

- `.decision-log.md#decision-2026-09-02-179` **cl.3** (the direction; `INV-scope` recorded OPEN) · `#decision-2026-09-02-173` / `-174` / cl.2 (the ratified public full-name form — why the direction is settled)
- ⭐ `packages/domain/src/notifications/pool-identity.ts:1-14` (the **four** consumers + the *"two different pools"* design property) · `:76` (the resolver) · `:120-127` (it emits **parts**)
- ⭐ `apps/jobs/src/scheduler/contribution-notify-triggers.ts:251-253` (the **join** — the name IS in the message) · `:10` (*"one … notification **per member assigned to a pool in that cycle**"* — the audience bound in §4)
- `packages/i18n/locales/en/contribution.json` (*"Standing with **{family}**'s family"*) — the rendered copy
- `packages/domain/src/kyc/name.ts` (`splitFirstNameLastInitial` — the mononym behaviour, §6) · `.decision-log.md#decision-2026-08-21-145` cl.3 (the August mononym ruling for the directory)
- `packages/contracts/src/public-pages/sahyog-drive.ts:96` (*"⛔ NEVER through `resolvePoolIdentity()`"* — why §7's public surfaces are untouched)
- ⭐ **The verified negative (§2):** `packages/domain/src/close-of-cycle/framing.ts:56` (`familyName` is a required param) with **zero production suppliers**, and the Panchayat Noticeboard rendering no family name ⇒ ⛔ no fifth consumer
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md` (**`INV-scope`**, and the AC6 closure-language guard Q2 turns on) · `_bmad-output/implementation-artifacts/deferred-work.md` 11b.1 item **(e)**
- Memory: [[feedback_closure_language_precision]] · [[project_death_is_an_overlay_not_a_state]]

---

## 10. ✅ ANSWERED — 2026-09-02 (BigDev, relaying the Panel). Logged as `2026-09-02-180`

**Ratifying trustees:** **Kalpana Bharti**, **Dhiraj Rahul**.

| | Question | Answer |
|---|---|---|
| **Q1** | Which consumers rise to the full name? | ✅ **ALL FOUR** — card · passbook · **PDF** · **push/WhatsApp/SMS** |
| **Q2** | If narrower: is the remainder accepted, or open? | ⭐ **VACATED** — its antecedent did ⛔ not obtain |

⇒ ⭐⭐ **THE INVERSION CLOSES, ⛔ IT IS NOT NARROWED.** Story 8.16's AC6 guard resolves to **CLOSED** —
⚠ **on SHIP, ⛔ not on ruling:** `deferred-work.md` 11b.1 item (e) stays **OPEN until 8.16 merges**.

⇒ ⭐ **THE RESOLVER'S DESIGN PROPERTY SURVIVES INTACT.** By ruling all four the Panel **avoided a
deliberate re-divergence** of the *"two different pools"* property (§5). ⛔ There is now ⛔ no authorised
reason for any consumer to resolve a name differently, and ⛔ **a future story that splits them is
reversing `-180`, ⛔ not optimising.**

### ⚠ What the answer sharpens — `INV-form`, still open and ⛔ not the Panel's

Under a **narrow** scope, hard-coding the full name on the member side would have been contained to two
in-app screens. ⛔ **Under ALL FOUR it is not:** a Pariwar that sets its public mode to `shielded_name`
would still push a **full name to its members' handsets** and print it into a **forwardable PDF**.
⇒ ⭐ **the case for MODE-RESOLVED is materially stronger after this ruling.** ⛔ BigDev's to rule.

### ⚠ Two precisions recorded, ⛔ neither grounds to revisit

- The dispatch is **live** and cascades **push → WhatsApp → SMS**; WA and SMS are the **PAID** channels
  and are reached **when push fails** ⇒ the full name lands in an **unencrypted SMS** precisely for
  members whose app is not working. ⛔ The Panel ruled with all three channels named in §2.
- A longer name may push an **SMS past a 160-character segment** (cost + deliverability). ⛔ An
  implementation concern for 8.16, ⛔ never a reason to narrow a ruled scope.

---

# Appendix A — In plain words

*Added 2026-09-02 for the Panel, in the same form as the notes you answered earlier today. ⛔ Nothing
here is new — it is §1–§9 without the technical detail. Where the two differ, the numbered sections
govern.*

> ## ✅ **ANSWERED — 2026-09-02, by Kalpana Bharti and Dhiraj Rahul: ALL FOUR.**
> **The family's full name will appear in all four places — both screens in the app, the Contribution
> Note PDF, and the message sent when a cycle opens.**
>
> ⇒ ⭐ **The gap closes properly**, and the four places go on showing the name **identically** — so no
> member will ever see one name in a message and a different one on the card.
>
> ⚠ **Two honest notes:**
> · **Nothing changes until the work ships.** Your decision authorises it; it does not perform it.
> · **For families with a single name, nothing changes at all** — the app already showed the whole
>   name for them.
>
> *The rest of this appendix is kept as the record of what was asked.*

## What you already decided

Earlier today you said the gap should be closed: **a member should not see less about their own
Pariwar's drive than a stranger sees on the public website.** ⭐ That is settled and ⛔ we are not
asking again.

## What we did not think to ask

The family's name appears in **four** places on the member side. ⚠ Two of them are **not screens
inside the app**:

| Where the name appears | Is it inside the app? |
|---|---|
| The **My Pool** card | ✅ Yes |
| The **Yogdaan Bahi** passbook | ✅ Yes |
| The **Contribution Note** (a PDF a member downloads and can forward) | ⚠ **No** |
| The **message** sent when a cycle opens — app notification, WhatsApp, SMS | ⚠⚠ **No** |

⭐ **A website is something you go and look at. A message arrives whether you asked for it or not** —
on a phone that might be lying on a table, or shared with family.

⇒ **Should the full name go into the message and the PDF as well, or only onto the two screens?**

## ⚠ What actually changes if you include the message

The message **already names the family** — today as *"Ramesh K."*. It would become *"Ramesh Kumar"*.

**Who gets it:** only the **members assigned to that pool** — typically **dozens** of people, ⛔ not
the whole Pariwar and ⛔ not the public. ⭐ **They are the very people contributing to that family's
drive**, and under **every** option they will see the full name when they open the app.

⇒ **The real change is narrow:** the name moves from *inside the app* to *also on a lock screen, in a
WhatsApp chat, or in a text message*. ⚠ That is a real difference — a text message is not private in
the way an app screen is — ⛔ but it is not the name going out to strangers, and we will not argue it
as though it were.

## ⚠ Why "screens only" is not the safe, simple answer

The four places were **deliberately built to show the name identically**. The reason is written into
the code: if the message said one thing and the card said another, *a member would think they were
looking at **two different pools***.

⇒ ⛔ **Choosing screens-only means deliberately re-introducing that confusion.** It is a legitimate
choice — ⛔ it is just not a free one, and we will not present it as the cautious default.

## ⚠ One thing that makes the problem smaller than it sounds

For families whose record holds a **single name** — common in India — the member side **already shows
the whole name today**. ⇒ **for those families there is no gap at all**, and we have instructed the
work not to claim it fixed one.

## What we are asking

1. **Should the full name appear in all four places, only the two in-app screens, or everywhere except
   the message?**
   ⚠ *Our view, offered as a view:* **all four** — the recipients are the contributors to that family's
   drive, the audience is dozens, and they will see the full name in the app regardless. ⛔ But a lock
   screen is genuinely not an app, and that is a fair reason to answer differently.
2. **If you choose one of the narrower options — is the remainder acceptable, or does it stay open?**
   ⚠ Under those options a member would **still** see less in a message than a stranger sees on the
   website. ⛔ We will record that as *narrowed*, ⛔ **not** as *closed* — so the record does not
   overstate what was fixed.

## What this note does not do

⛔ It decides nothing — it only asks · ⛔ it does **not** reopen your decision that the gap should close
· ⛔ it does **not** change anything on the public website · ⛔ **no new information becomes readable to
anyone** — the name is already available to all four of these places; only which characters get printed
would change · ⛔ and it publishes nothing.
