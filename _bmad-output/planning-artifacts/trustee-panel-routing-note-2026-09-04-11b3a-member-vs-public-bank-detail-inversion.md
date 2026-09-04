# Trustee Panel routing note — 2026-09-04
## You ruled the family's bank details may be shown publicly. ⚠ The consequence is that a **member** now sees **less** of them than a **stranger** does — and we do not think you were told that.

**Author:** BigDev, Solo Builder — 2026-09-04
**Occasion:** BigDev asked a one-line question of the Trustee-facing disclosure sheet — *"does the
member-facing app show less than the public-facing one?"* ⭐ It does, on this data class, and ⛔ nobody
had written that down.
**Routed to:** Trustee Panel.
**Status:** ⏳ **OPEN — awaiting the Panel.** Logged as `.decision-log.md#decision-2026-09-04-188`.
⭐⭐ **THIS NOTE ⛔ DOES NOT QUESTION A RULING.** `2026-08-28-165` is Trustee-ratified, the exposure it
authorised is ⛔ not in doubt, and ⛔ nothing here asks you to revisit it. It asks whether **one
consequence** of it was in view when you ruled.

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> ⭐ You can answer this note from Appendix A alone.

> ⭐⛔ **THE HEADLINE.** On 28 August you ratified that four of the family's bank fields — account
> holder's name, full account number, IFSC and UPI ID — may appear on a drive's **public** page.
> ⭐ That was built exactly as ruled.
>
> ⚠⛔ **WHAT FOLLOWS FROM IT, WHICH IS ⛔ NOT RECORDED ANYWHERE:** a **member** of the trust can see
> those details **only for the one drive they have been asked to contribute to, and only while it is
> still collecting.** Anyone at all, with no login, can see them for **every finished drive** — and,
> under today's default, **for as long as the page exists**.
>
> ⇒ ⛔⛔ **ON THIS DATA, THE PUBLIC IS LESS RESTRICTED THAN A MEMBER.** For a drive that has finished,
> the member's own app shows these fields to **⛔ nobody**, while a stranger holding the link sees them
> **in full**.

---

## 1. What is being asked

**(Q1) — WAS THE INVERSION IN VIEW?** When you ruled the four fields public, was it understood that a
member's access would remain narrower than the public's — one drive, one window — or was the ruling
made on the understanding that members would see at least as much?

**(Q2) — IF IT WAS NOT, DOES IT CHANGE ANYTHING?** ⛔ We are ⛔ not proposing it should. §5 sets out
the three things that could follow, including *"nothing"*, which is a perfectly coherent answer.

⚠⛔ **⛔ NOT BEING ASKED:** whether the fields may be public (⭐ ruled, `-165`), the masking default
(⭐ ruled, `2026-09-02-179` cl.1), or the rate limit (⛔ a decision, ⛔ not a knob).

## 2. ⭐ What was ruled, and what was built — both correct

| Ref | What it says | Status |
|---|---|---|
| `2026-08-28-165` **cl.1–2** | **FOUR** named `(surface, field)` pairs on `sahyog-vivran` are `tier: public` — `nominee_account_holder_name`, `nominee_account_number`, `nominee_ifsc`, `nominee_vpa` | ⭐ **Trustee-ratified** |
| `2026-09-02-179` **cl.1** | `D8-default` is **FAIL-OPEN** — details render in full until a Trust configures a window | ⭐ **Trustee-ratified** |
| `2026-09-03-184` **D1** | the drive page answers **200 to anyone presenting a valid address** — ⛔ no session | ⭐ **Trustee-ratified** |

⭐ The implementation matches all three. ⛔ **There is no unauthorised exposure and no defect here.**

## 3. ⛔ The member side — and it is FR-74-compliant, which is the point

The donor payment path (`packages/contracts/src/contributions/nominee-accounts.ts`, Story **9.9**)
returns the same four values **unmasked** — deliberately, and the contract says why: *"a masked
account# cannot be transferred to."* ⛔ But it is **gated twice**:

- to the member's **own assigned pool** (a member-scoped read), and
- to a pool that is **`live`** — `apps/api/src/modules/payment/handlers.ts` answers
  `{ available: false }` when there is ⛔ no live pool.

⇒ ⭐ that is **exactly** what **FR-74** specifies: *"Members-only: … nominee bank/IFSC **during active
alert window only**."* **The member side implements the requirement faithfully.**

## 4. ⚠ The comparison, stated plainly

| | Which drives | For how long | Login |
|---|---|---|---|
| **A member, in the app** | **one** — their own assignment | ⛔ only while it is **collecting** | ⭐ required |
| **Anyone with a link** | **every listed drive** | **indefinitely** (today's default) | ⛔ none |

⭐ **The member app's "My Pool" card carries ⛔ no bank details at all** — the fields appear only on the
payment screen, at the moment of paying, which is what they exist for.

⇒ ⛔ **for a FINISHED drive the member app shows them to nobody**, while the public page shows them in
full.

## 5. What could follow — including nothing

**(i) ⭐ NOTHING — record it and move on.** A public transparency record and a member convenience are
different things serving different purposes; there is ⛔ no principle that says a member must see at
least as much as the public. ⭐ **A coherent and quite possibly correct answer.** The FR-74 annotation
this note ships alongside is then the whole remedy.

**(ii) The member app gains a read of its own drive's page.** Members could reach a finished drive's
record from the app rather than only through the public site. ⛔ A build, ⛔ not a policy change — and
it does ⛔ not reduce any public exposure.

**(iii) The inversion is treated as a signal about the DEFAULT.** ⚠ If it feels wrong that a stranger
sees more than a member, the lever is ⛔ not the member side — it is `D8-default` **FAIL-OPEN**, which
is what makes the public exposure permanent. ⛔ **We are ⛔ not asking for that**; it is `-184` cl.5's
option (d), which you considered and did ⛔ not direct, and it is already surfaced in a separate note.
⛔ We flag the connection and stop.

## 6. ⚠ How this was missed, recorded honestly

**FR-74** classifies **data**, ⛔ not surfaces: *"Members-only: full member lookup, **nominee bank/IFSC
during active alert window only**, contribution history."* And its **`Public (no auth)`** enumeration
of what Sahyog Vivran carries lists story, verifier names, contributor count and contributor name form
— ⛔ it does **not** mention bank details, because it predates them.

⇒ when `-165` moved those fields to the public tier it **superseded half of an FR-74 clause**, and
⛔ **that supersession was never annotated.** `epics.md` carries **two** careful FR-74 annotations from
2026-08-19, each explicitly scoped (*"⛔ Scoped to the Member Directory ONLY"*) — ⭐ so the discipline
exists here and is well applied; ⛔ this clause simply was not swept.

⇒ anyone consulting the requirements today still reads *"nominee bank/IFSC is members-only"*.
**⭐ CORRECTED in the same commit as this note** — FR-74 now carries a third annotation recording the
supersession, its exact scope, that the member half is **⛔ not** superseded, and this inversion.

⚠⛔ **THIS IS THE THIRD FINDING OF THE SAME SHAPE IN TWO DAYS**, and it is the mildest: here the
**ruling exists** and only the **record** was missing. In the other two
(`#decision-2026-09-04-186`, `-187`) the ruling did ⛔ not exist at all. ⇒ recorded as a pattern, ⛔ not
as three separate accidents.

## 7. ⛔ What this note does not do

⛔ It does **not** question `-165`, `-179` cl.1 or `-184` D1. · ⛔ It does **not** propose reducing any
public exposure. · ⛔ It does **not** re-open `-184` cl.5. · ⛔ It changes **no** behaviour: the only
edit shipping with it is an annotation to a requirements document.

---

# Appendix A — In plain words

## What you decided, and what was built

In August you decided that a family's bank details — the account holder's name, the full account
number, the IFSC code and the UPI ID — may be shown on a drive's public page, so that anyone can see
where the money went.

⭐ **That was built exactly as you asked, and this note does not question it.**

## What we noticed this week

A **member** of the trust — someone who pays into these drives — can see those bank details **only for
the one drive they have personally been asked to contribute to, and only while that drive is still
collecting.** The moment it closes, the details disappear from their app.

**Anyone else — with no login at all — can see the same details for every finished drive, and under
today's settings, for as long as the page exists.**

⇒ **So on this one kind of information, a stranger is less restricted than a member.**

## Why it happened

Both halves are working as written. The member side follows an old written rule that says these
details are *"for members only, during the active drive window."* The public side follows **your**
August decision, which came later.

⚠ **What never happened is that the old rule was updated to say so.** It still reads as though these
details are members-only. That is a paperwork gap on our side, and we have fixed it in the same change
that carries this note.

## Why we are telling you rather than just fixing the paperwork

Because we cannot find any record that this consequence was **put in front of you** when you decided.
You may well have intended it — a public record of where a family's money went is a different thing
from a convenience for the member who paid, and there is no rule saying members must see at least as
much as the public.

⭐ **But we would rather you confirm that than have us assume it.**

## What we are asking

1. **Was it understood, when you ruled, that members would see less of this than the public?**
2. **If not — does it change anything?** ⭐ *"No, that is fine"* is a perfectly good answer, and may
   well be the right one. The alternative worth considering is letting members see their own past
   drives in the app — which adds nothing to what the public already sees.
3. ⚠ **One connection, flagged and then dropped:** if what feels wrong is that a stranger sees these
   details *forever*, the setting that governs that is the timing control described in the disclosure
   sheet — ⛔ not anything on the member side. ⛔ We are **not** asking you to change it here.

## What happens either way

⛔ Nothing changes for anyone using the site. The only edit shipping with this note is a correction to
an internal requirements document so it stops contradicting your own decision.
