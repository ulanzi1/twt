# Trustee Panel routing note — 2026-09-02
## When cl.10 said the masking knob is **"Trust-Admin controlled, per Pariwar"** — was that SCOPE, or AUTHORITY, or both?

**Author:** BigDev, Solo Builder — 2026-09-02
**Occasion:** Story **11b.3a**'s **D8**, raised while validating the story family and re-framed the same
day. ⭐ **This note asks the Panel to disambiguate ITS OWN PHRASE** — it does ⛔ not ask for a new
policy, and the substantive principle it turns on is one **the Panel already ruled** (§2).
**Routed to:** Trustee Panel.
**Status:** ✅ **ANSWERED 2026-09-02** — see **§10**. **THE TRUST CENTRALLY — `super_admin`.**
Logged as `.decision-log.md#decision-2026-09-02-178`. ⛔ Nothing is **applied** yet.

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end and is **complete on its own** — the whole question, the options, and what follows
> from each, with ⛔ no technical detail. ⭐ **You can answer this note from Appendix A alone.**
> The numbered sections are the engineering record. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE — AND IT IS SHORT, BECAUSE YOU HAVE ALREADY DECIDED THE PRINCIPLE.**
> `2026-08-28-160` **cl.10(b)** described the masking knob as *"**Trust-Admin controlled, per
> Pariwar**."* ⚠ That phrase contains **two different things**, and the build cannot proceed without
> knowing which you meant:
> · **PER PARIWAR** — the *setting* is stored per Pariwar. ⭐ Not in doubt.
> · **TRUST-ADMIN CONTROLLED** — *who may change it.* ⛔ **This is the question.**
>
> ⭐⭐ **AND YOU HAVE ALREADY RULED THAT THESE ARE TWO SEPARATE AXES THAT MUST NOT BE COLLAPSED** —
> `2026-08-19-136` **cl.3**, verbatim: *"**(a) SCOPE** — the setting is per-Pariwar; **(b) AUTHORITY** —
> changing it is a **governed act**, ⛔ not a casual Pariwar-Admin toggle."*
> ⇒ ⛔ **so "per Pariwar" does ⛔ NOT, by itself, mean "a Pariwar Admin controls it"** — you said so in
> terms, about the closest analogous control. **This note asks whether cl.10 meant to follow that, or
> to depart from it.**
>
> ⚠⛔ **There is also ⛔ no role called "Trust Admin"** in the system (§3). Whatever you meant has to
> resolve to a role that exists.

---

## 1. What is being asked, precisely

**(Q1) — WHAT DID "TRUST-ADMIN" MEAN?** In cl.10(b), does *"Trust-Admin controlled"* describe **who may
change the setting**, or was it a loose way of saying *"the Trust configures it per Pariwar"* with the
authority left to the ordinary governed route?

**(Q2) — WHO HOLDS THE KEY?** Concretely: may a **Pariwar Admin** change how long a family's bank
details stay publicly visible after a drive closes — or is that reserved to **Super Admin / the Trustee
Panel**, as the equivalent name-presentation control already is?

⚠ **Q2 is the operative one.** Q1 exists because the phrase is ambiguous and only the Panel can say
what it meant.

## 2. ⭐⭐ THE PANEL HAS ALREADY DRAWN THIS DISTINCTION — `2026-08-19-136` cl.3

That decision (**Trustee-ratified**, Dhiraj Rahul and Kalpana Bharti, 2026-08-19) governs the
per-Pariwar **public-name presentation policy** — the closest existing analogue to this knob. Its
clause 3 reads, verbatim:

> *"Presentation policy is CONFIGURABLE; the AUTHORITY to change it stays GOVERNED … **Two different
> axes, and they must not be collapsed** … **(a) SCOPE** — the setting is per-Pariwar; **(b)
> AUTHORITY** — changing it is a **governed act**, ⛔ not a casual Pariwar-Admin toggle."*

⭐ It records that this *"mirrors `2026-08-19-133` clause 4 layer 2 exactly"* — *"a deliberate governance
decision, not something a normal Pariwar Admin can casually change."*

⇒ ⭐ **The principle already exists and it is yours.** What is genuinely open is only whether cl.10
intended to **follow** it or to **depart** from it for this particular control.

## 3. ⛔ There is no `trust_admin` role — verified

The seeded roles are: `super_admin` · `pariwar_admin` · `state_trustee` · `district_admin` ·
`block_admin` · `finance_officer` · `it_cell` · `verifier` · `auditor` · `field_worker` ·
`helpline_operator` · `trustee_panel`.

⛔ **A search for `trust_admin` across the whole codebase returns zero results.** ⇒ cl.10's phrase must
resolve to one of the roles above, and the two candidates are **`pariwar_admin`** or **`super_admin` /
`trustee_panel`**.

## 4. ⚠⛔ The catalog ALREADY ENCODES cl.3's answer for the analogous control — and warns against widening it

`pariwar.manage_public_name_presentation` — the key that governs the per-Pariwar public **name**
presentation mode — is granted to **`super_admin` ONLY**. The code says the exclusion **is** the ruling:

> *"granted to super_admin ONLY — ⛔ **deliberately NOT `pariwar_admin`**, which holds every other
> tenant-content key. **That exclusion IS the ruling, expressed in the catalog.**"*

And its stated ground transfers directly to this knob:

> *"changing the public name form is a GOVERNED ACT … the authority that ruled full names would be
> published is the **Trustee Panel**, so the authority to change that form is **theirs** too."*

⭐ **The parallel is exact:** the authority that ruled nominee bank details publicly displayable is
**the Panel** (cl.10 itself). ⇒ on that reasoning the authority to decide **how long they stay
visible** would also be the Panel's.

⚠⛔ **AND THE FILE NAMES THE EXACT MOVE TO AVOID:** granting this class to `pariwar_admin` *"for
symmetry"* with the other tenant keys would *"**reverse a ratified ruling by way of a catalog edit. It
requires its own Panel decision, not a tidy-up.**"* ⇒ **that sentence is why this note exists rather
than a code change.**

## 5. ⚠ Why the answer weighs more than it did when cl.10 was written

Story **11b.3a** now ships the nominee bank render **UN-GATED** (`2026-09-02-177`, D5(a)) — on the
strength of cl.10(a)'s own authorisation, with the missing Claim Terms instrument recorded
**un-attested** and counsel's third-party objection **carried as risk**.

⇒ ⭐ **the masking schedule is the ONLY live control over how long that exposure lasts.** There is
⛔ no consent gate beneath it and ⛔ no second lever. ⚠ Whoever holds this key holds the whole control.

⛔ **This is context, ⛔ not an argument for either answer** — a tenant-held knob is defensible on the
ground that a Pariwar knows its own families. It is recorded so the choice is made with the weight
visible.

## 6. What follows from each answer

| Answer | What it means | What it costs |
|---|---|---|
| **`super_admin` / `trustee_panel`** | Follows cl.3 and the name-presentation precedent exactly. Changing a Pariwar's masking window is a **governed act**. | ⚠ A Pariwar cannot adjust its own window without going through the Trust. |
| **`pariwar_admin`** | Reads cl.10's *"Trust-Admin"* as a tenant control. | ⛔ **Departs from the class cl.3 reserved.** It must be your ruling, ⛔ never a catalog edit — and it should say whether it changes the **name**-presentation control too, or ⛔ only this one. |

⭐ **Either answer is buildable and neither costs a migration.** The knob's accountability is unchanged
in both cases: a required **rationale**, the **actor** snapshotted at action time, and a tamper-evident
audit line — the shape the existing presentation-policy control already enforces and refuses to write
without.

## 7. ⛔ Two roles that CANNOT hold it, whichever way you answer

⚠ Recorded so an otherwise reasonable choice is not made and then found inert:

- ⛔ **`district_admin`** — a *district*-ceiling grant can **never** satisfy a Pariwar-dimension check.
- ⛔ **`state_trustee`** — a *state* ceiling is **broader** than the gate's dimension.

⇒ either grant would seed a capability that **looks real and does nothing**. ⛔ Neither is offered.

## 8. What is put to the Panel

1. **Q1 — the PHRASE.** In cl.10(b), did *"Trust-Admin controlled, per Pariwar"* speak to **authority**,
   or only to **scope**?
2. **Q2 — the HOLDER.** Who may change a Pariwar's masking window: **`pariwar_admin`**, or **`super_admin`
   / `trustee_panel`**? ⚠ **This author's view**, offered as a view: the `2026-08-19-136` cl.3 axis
   separation and the name-presentation precedent both point to the **governed** answer, and choosing
   `pariwar_admin` would be a **departure** that needs saying out loud. ⛔ It is ⛔ not a recommendation
   on Q1.
3. **Q3 — REACH, if you choose `pariwar_admin`.** Does that change apply **only** to this masking knob,
   or does it also revisit the **name**-presentation control that cl.3 reserved? ⛔ **Do not let it move
   by implication.**

## 9. What this note does ⛔ NOT do

⛔ Does **not** rule, ratify, amend or apply anything · ⛔ does **not** re-open cl.10, D5(a), or the
decision to publish nominee bank details during an active campaign · ⛔ does **not** ask you to change
the **name**-presentation control (that is Q3's *conditional* half only) · ⛔ does **not** mint a
permission key — minting is a **catalog version bump**, a governed act, and it waits on this answer ·
⛔ does **not** grant anything to `district_admin` or `state_trustee` (§7) · ⛔ and it publishes nothing:
**built is not published**, and no surface goes live on the strength of this note.

⚠ **The phrasing rule binds every line above:** *"counsel has not reviewed X"* — ⛔ **never** *"counsel
is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`).

---

## Sources — every one read at `79ed41d`

- ⭐⭐ `.decision-log.md#decision-2026-08-19-136` **cl.3** — *"Two different axes, and they must not be collapsed … (a) SCOPE … (b) AUTHORITY — changing it is a governed act, ⛔ not a casual Pariwar-Admin toggle"*; ⭐ **Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, 2026-08-19**. ⚠ cl.3 also records the policy may move **in either direction**
- `.decision-log.md#decision-2026-08-28-160` **cl.10(b)–(d)** — the masking knob, *"Trust-Admin controlled, per Pariwar"*, and *"configuration over one record, ⛔ never a boolean"* · **cl.10(a)** — the authorisation D5(a) rests on
- `.decision-log.md#decision-2026-09-02-177` **D5(a)** — the render ships **un-gated**; the Claim Terms substrate is **un-attested** and counsel's objection is **carried as risk** (§5)
- `packages/domain/src/kyc/presentation-policy.ts:11-13` — *"granted to super_admin ONLY — deliberately NOT `pariwar_admin` … that exclusion IS the ruling, expressed in the catalog"*; and the required **rationale + actor + audit anchor**, which the module **refuses a write without**
- `packages/domain/src/rbac/permissions.ts` — the key's own entry (*"reverse a ratified ruling by way of a catalog edit … its own Panel decision, not a tidy-up"*); `PERMISSION_CATALOG_VERSION = 38`. ⚠ The version is ⛔ **not** a key count — two prior bumps minted **zero** keys, because it versions the **capability model**
- `packages/domain/src/rbac/roles.ts` — the twelve seeded roles + `trustee_panel`; ⛔ **no `trust_admin`** (§3)
- `packages/domain/src/schema/pool_fixed_amount_schedule.ts` — the effective-window precedent **cl.10 itself named** for 10(c)/(d)
- `_bmad-output/implementation-artifacts/11b-3a-…md` — **D8**, AC5, and the story's own record of this question
- Memory: [[project_rbac_geo_scope_containment]] (§7) · [[project_helpdesk_operator_surface_103]] (a key is a catalog version bump) · [[feedback_closure_language_precision]]

---

## 10. ✅ ANSWERED — 2026-09-02 (BigDev, relaying the Panel). Logged as `2026-09-02-178`

**Ratifying trustees:** **Dhiraj Rahul**, **Kalpana Bharti**.

| | Question | Answer |
|---|---|---|
| **Q1** | Did *"Trust-Admin controlled"* speak to authority, or only scope? | ✅ **AUTHORITY** — and the authority is the **Trust's** |
| **Q2** | Who may change it? | ✅ **THE TRUST CENTRALLY — `super_admin`.** ⛔ Not `pariwar_admin` |
| **Q3** | If `pariwar_admin`, does it reach the name control? | ⭐ **VACATED** — its antecedent did ⛔ not obtain. ⛔ Not answered, ⛔ not answered in the negative; the name control is **untouched** |

⇒ ⭐⭐ **`2026-08-19-136` cl.3 is FOLLOWED, ⛔ not departed from.** The knob is **per-Pariwar in SCOPE**
and **central in AUTHORITY** — exactly like the public-name presentation policy. ⭐ **The two controls
are now aligned**, ⛔ not divergent.

⭐ **AND §2's INFERENCE WAS PUT, ⛔ NOT ASSUMED — AND ADOPTED.** Applying cl.3 (subject: the **name**
policy) to **bank masking** was flagged as an inference and cited `2026-09-02-175` as the live warning
against extending a ruling past its subject. ⇒ it was **asked**, and is now **ruled**. ⛔ For **this
control** only; ⛔ nothing extends by analogy further.

⛔ **`pariwar_admin` is FORECLOSED**, and ⛔ `district_admin` / `state_trustee` stay excluded — either
grant would be **inert** (§7).

### ⛔⛔ ONE NEW QUESTION THE ANSWER CREATED — `D8-default`

⚠ **Because authority is central, a Pariwar ⛔ cannot set its own window** ⇒ **whatever the code does
for a Pariwar with NO schedule row governs EVERY Pariwar until the Trust acts.** ⛔ cl.10 states ⛔ no
default — only what it is **not** (*"immediate masking is ⛔ NOT hard-coded"*).
⇒ **fail-OPEN** (stays visible until configured), **fail-CLOSED** (masked at close), or **a single
Trust-set global default** the per-Pariwar row overrides. ⛔ Raised on Story 11b.3a, ⛔ **not** decided
here.

---

# Appendix A — In plain words

*Added 2026-09-02 for the Panel, in the same form as the two notes you answered today. ⛔ Nothing here
is new — it is §1–§9 without the technical detail. Where the two differ, the numbered sections govern.*

> ## ✅ **ANSWERED — 2026-09-02, by Dhiraj Rahul and Kalpana Bharti: THE TRUST CENTRALLY.**
> **The Trust decides centrally how long a family's bank details stay visible after a drive closes —
> ⛔ not a Pariwar Admin.** That matches what you decided in August for the names setting, so the two
> now work the same way.
>
> ⚠ **One thing your answer creates, and we will come back to you on it.** Because the Trust decides
> centrally, a Pariwar **cannot** set its own window. ⇒ whatever happens for a Pariwar the Trust has
> **not yet configured** applies to **everyone**, by default. ⛔ Your August ruling did not say what
> that should be: **do the details stay visible until the Trust sets a window, or are they hidden
> automatically once the drive closes?**
>
> *The rest of this appendix is kept as the record of what was asked.*

## The short version

When a Sahyog Drive is running, the public page shows the family's bank details so anyone can check the
money goes to a real family. **After the drive closes, someone decides how long those details stay
visible** — hidden at once, hidden after so many days, or hidden permanently.

**The question is simply: who is that someone?**

## Why we are asking

In August you wrote that the setting would be *"**Trust-Admin controlled, per Pariwar**."*

That sentence contains **two** things:

- **"per Pariwar"** — each Pariwar has **its own** setting. ⭐ Clear, and not in question.
- **"Trust-Admin controlled"** — **who is allowed to change it.** ⛔ This is the part we cannot resolve
  ourselves.

⚠ And there is **no role called "Trust Admin"** in the system. The realistic options are a **Pariwar
Admin** (a senior person within one Pariwar) or the **Trust centrally** (Super Admin / this Panel).

## ⭐ You have already answered the underlying principle

In August, for the closely-related setting that controls **how members' names appear on the public
directory**, you ruled that these are **two separate things that must not be run together**:

> *the setting is **per Pariwar** — but **changing** it is a **governed act, not a casual Pariwar-Admin
> toggle**.*

So *"per Pariwar"* by itself does **not** mean a Pariwar Admin controls it. **You said so.**

⇒ We are not asking you to invent a rule. **We are asking whether the August sentence meant to follow
that, or to make an exception for this one.**

## ⚠ What the system does today

For that name setting, the control sits with the **Trust centrally** — deliberately not with Pariwar
Admins, even though they control almost everything else about their own Pariwar's content. The reason
recorded at the time was:

> *the Panel decided the names would be published, so the authority to change that decision belongs to
> the Panel too.*

The same reasoning would apply here: **you** decided the bank details may be shown, so deciding how
long they stay shown may be **yours** as well.

⚠ The code also carries a warning that quietly giving this kind of control to Pariwar Admins would
**undo a decision of yours through a technical change** — which is exactly why this is a note to you
and not an engineering choice.

## ⚠ One thing that makes this weigh a little more

The drive page now shows the bank details **without any separate permission step** — that was decided
on the strength of your own August ruling that the details may be shown during an active campaign.

⇒ **This timing setting is therefore the only control over how long that exposure lasts.** There is no
second safeguard underneath it.

⛔ That is **not** an argument for either answer — a Pariwar knowing its own families is a real
argument for local control. It is here so the choice is made with the weight in view.

## What we are asking

1. **Did "Trust-Admin controlled" mean who may change it, or only that each Pariwar has its own
   setting?**
2. **Who may change it — a Pariwar Admin, or the Trust centrally?**
   ⚠ *Our view, offered as a view:* your August ruling and the way the name setting already works both
   point to **the Trust centrally**. Choosing the Pariwar Admin is perfectly possible — it just needs
   to be **said**, because it steps away from what you decided in August.
3. **If you choose the Pariwar Admin — does that apply only to this bank-details timing, or does it
   also reopen the names setting?** ⛔ We will not let that move by assumption.

## What happens either way

**Both answers are equally easy to build and neither costs any rework.** In both cases the person
changing it must give a **written reason**, their name is **recorded at the time**, and the change is
written to a **tamper-evident log**.

## What this note does not do

⛔ It decides nothing — it only asks · ⛔ it does **not** reopen your decision that bank details may be
shown during a drive · ⛔ it does **not** change the names setting unless you say so in question 3 ·
⛔ and it publishes nothing: **built is not published.**
