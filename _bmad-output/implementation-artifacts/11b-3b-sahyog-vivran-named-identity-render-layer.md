# Story 11b.3b: Sahyog Vivran Named-Identity Render Layer — Deceased Member Name + Contributor List `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is the third of the three-way split of
> Story 11b.3, ruled **D6(b)** by BigDev on **2026-09-01**, and is recorded in `epics.md` as an
> **annotation** owed by **11b.3's Task 0** — exactly as `11b-2a` / `11b-2b` are. ⛔ A future
> `sprint-planning` run must ⛔ not regenerate a ghost 11b.3 or drop this story.
>
> ⛔ **ORDER: runs AFTER `11b-3` is `done` AND MERGED.** ⭐ Independent of **11b.3a**; the two may run
> in parallel.

> ⛔⛔ **AND THIS STORY IS GATED ON A PANEL RULING THAT HAS ⛔ NOT ARRIVED. ⚠ READ THIS BEFORE ANYTHING ELSE.**
>
> ⭐⭐ **UPDATE 2026-09-02 — ✅ BOTH D3 AND D2 ARE RULED (YES · FULL NAME, both) AND THE STOP GATE IS
> LIFTED.**
> ⚠ **Read the history, because it moved twice in one day.** `2026-09-02-174` cl.3 appeared to attach a
> **CONDITION** to D2's permission — a staged disappearance of the name. ⭐ **That was a
> misunderstanding of the Panel's intent and was CORRECTED the same day**, Panel-ratified, at
> `2026-09-02-175`: the staged reduction is the **NOMINEE BANK fields'** (`-160` cl.10's own subject,
> which includes the *nominee's* name) and does ⛔ **NOT** reach a contributor's or the deceased
> member's name. ⇒ **Q1/Q2 stand UNCONDITIONALLY**, and **D14-order · D12-schedule · D13-maskedname ·
> D11-order are VACATED — ⛔ not rejected; their QUESTIONS ceased to exist.**
>
> Each subject needs a `(surface, field)` entry in
> `matrix.ts`'s enumerated Tier-1 allowlist — *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE
> CHANGE … do NOT 'fix' a failing third entry by appending it here — **the gate failing is the gate
> working**"* (`matrix.ts:388-391`).
>
> | Subject | Basis | Declaration | Form |
> |---|---|---|---|
> | **contributor name** | ✅ settled (`2026-08-28-160` cl.7) | ✅ **RULED YES** (`2026-09-02-174`) | ✅ **RULED: FULL NAME**, ⭐ unconditional (`-175`) |
> | **deceased member's name** on `sahyog-vivran` | ✅ settled (member's own T&C, cl.4) | ✅ **RULED YES** (`2026-09-02-173`) | ✅ **RULED: FULL NAME** |
>
> ⏳ **BOTH packets are now written, routed FILES — ⛔ and NEITHER is ratified.**
> · contributor → `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md`
> · deceased member → `trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md` (**written
>   2026-09-02**, discharging the packet half of Task 0)
> ⚠⛔ **A ROUTED PACKET IS ⛔ NOT A RULING.** Both are **ROUTED, ⛔ nothing ratified and ⛔ nothing
> applied** — this story's STOP gate is ⛔ **unchanged** ([[feedback_closure_language_precision]]).
>
> ⇒ ⭐⭐ **Task 0's PANEL STOP GATE IS DISCHARGED.** Both rulings landed — `2026-09-02-173` (deceased
> member) and `2026-09-02-174` Q1/Q2 (contributor) — each **YES at the FULL NAME**, and `-175` removed
> the apparent condition. ⛔ **Task 0's other obligations still run** (transcription is done; the
> `governance:` commit and the routing work are not).
>
> ⚠⛔ **TWO THINGS ⛔ NOT LIFTED, and ⛔ neither is a Panel matter:**
> 1. ⛔⛔ **A ruling is ⛔ NOT a render for the DECEASED member.** `-173`'s counsel clause is **still
>    outstanding** — confirmed in discussion, the written rule had ⛔ not arrived. Until a real
>    `clause_versions` row for `niy.public-disclosure.member-information` exists **and is pinned**, the
>    basis predicate is false for every member and ⛔ **no deceased-member name renders**. That is the
>    ruled inert state (`public-read.ts:171-175`), ⛔ not a bug — and ⛔⛔ **⛔ no placeholder row may be
>    seeded**, a prohibition a favourable ruling makes *more* load-bearing, ⛔ not less.
> 2. ⛔ **`D10`** (the stable per-row key) is still open and **AC5 depends on it**; **`D9`** (the
>    inversion — carry or resolve) is open and is carry-by-recommendation.
>
> ⚠⛔ **AND EVEN FOR D3, A RULING IS ⛔ NOT A RENDER.** `NAME_PUBLICATION_AUTHORISED` needs a real
> `clause_versions` row for `niy.public-disclosure.member-information`, **pinned** into an accepted
> T&C version. Counsel confirmed the **broad** scope **in discussion**; the **written rule has ⛔ not
> arrived**. ⇒ D3 unblocks the **DECLARATION**; the **RENDER** waits on counsel
> ([[feedback_record_unattested_no_backfill]]). ⛔⛔ **And ⛔ do ⛔ NOT seed a placeholder
> `clause_versions` row** — `public-read.ts:171-175` forbids it in terms, and a favourable ruling is
> exactly when that shortcut stops looking like a lie.

---

## Story

As a **non-member visitor** reading a Sahyog Vivran,
I want to see **whose drive this was** and **who stood behind it**,
so that the page reads as a record of a community act rather than an anonymous ledger entry — with
each name appearing on **that person's own instrument**, in **the form the Trustee Panel ruled**, and
⛔ never in a form an engineer chose.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces TWO predicates that gate what a person sees. ⛔ NEITHER IS SETTLED, and that
is the whole reason this story is separate.**

1. **The contributor predicate.** *"Your name can appear on the public list of people who contributed
   to a drive because **you** accepted the membership Terms & Conditions."*
   ⛔ **Checked, and the answer is NOT SETTLED.** The **basis** is settled (`2026-08-28-160` cl.7); the
   **declaration** and the **form** are ⛔ UNRULED, routed **2026-08-30**, ⏳ nothing ratified.
   ⚠⛔ **And the count of things already assuming an answer is THREE, ⛔ not one** — `epics.md:3145`
   (Story 8.3's own *"I want"*, which names *"any visitor on Sahyog Drive (Epic 11b)"* and specifies
   *"first-name + last-initial only"*), `:3238` (the receipt PDF), `:4931` (11b.2's epic AC). ⭐ ⛔ **An
   epic AC is not a ruling** — that is the only reason *"unruled"* survives against three assumptions.

2. **The deceased-member predicate.** *"Your name can appear on the public page for the drive run in
   your memory because **you** accepted a version of the T&C that says so — ⛔ not because your family
   ticked a box."*
   ✅ **Checked against the Niyamavali:** the disclosure clause is minted **as a Niyamavali clause and
   pinned** to a T&C version (`2026-08-28-161`, Story 11b.9 D6(a)). ⚠ **Result: the clause does ⛔ NOT
   EXIST YET** — counsel's T&C return is due **2026-09-07**. ⇒ even once D3 rules, the predicate reads
   **false for every member** and the surface renders **unnamed**. ⭐ **Fail-closed, and therefore
   correct** ([[project_11b_consent_model_c5_superseded]]).

⭐⛔ **AND THE NON-PREDICATE:** ⛔ **no predicate in this story may read `members.state`, `is_valid`, or
a moderation overlay.** A contributor's name is ⛔ **never removed because they died** (11b.1 D9(a)),
and ⛔ **RTBF is a separate rule that is ⛔ NOT collapsed into it** — see Trap 5.

---

## 🎯 What already EXISTS — verified live at `79ed41d`

| Thing | State | Where |
|---|---|---|
| The `@twt/ui` `contribution-list` **presenter** (11b.2) | ✅ **LIVE** — emits name **PARTS** and ⛔ **never joins them**, precisely so ⛔ nothing in it decides the form (`-168` cl.6 / D9(a)); `unknown` arm **throws** (D8(a)) | `packages/ui/src/contribution-list/{presenter,view-model,i18n-keys}.ts` |
| The confirmed-contributor **wire** | ✅ `ConfirmedContributorRow = { firstName: min(1), lastInitial: max(16) }`, `.strict()` — ⚠ a **BUILT-TO** form, ⛔ **not a ratified one** | `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` |
| The **mobile** render layer (11b.2b) | ✅ **LIVE** — the adapter + per-row `try/catch` pattern to mirror | `apps/mobile/components/contributor-list/PoolContributorList.tsx` |
| `resolvePublicMemberName` | ✅ the **Pariwar-configured** form (`full_name` is the **DEFAULT**, ⛔ not a constant — `2026-08-19-136` cl.1) | ⚠ `packages/domain/src/kyc/public-name.ts:73` — ⛔ **NOT** `pool/public-read.ts`, which holds the different `NAME_PUBLICATION_AUTHORISED` SQL predicate at `:283` |
| `resolvePoolIdentity` | ✅ **hard-codes the SHIELDED** form; used by the **member-facing** My Pool card / Yogdaan Bahi / notifications (8.6/8.7/8.8). ⚠⭐ **Story 8.16 replaces the hard-coding with a read of the SAME stored per-Pariwar mode** (`-181`, `ready-for-dev`) — ⛔ do ⛔ not encode today's form as permanent | `packages/domain/src/notifications/pool-identity.ts:76` |
| The `sahyog-vivran` surface | ✅ **created by 11b.3** with ⛔ **zero** Tier-1 fields + a test asserting that count | `public-vs-private-matrix.yaml` |
| The ruled Tier-1 allowlist | ✅ **two** entries — `member-directory.member_name`, `sahyog-drive.deceased_member_name`. ⛔ **Neither is a contributor** | `matrix.ts:392-404` |
| C-1's ruling: `apps/public` **adds `@twt/ui`** | ✅ *"an **ORDINARY DEPENDENCY ADDITION**"* (`2026-08-23-154` cl.6); ⛔ **there was no prior declination** (`.decision-log.md:1734`) | — |

**⛔ What does ⛔ NOT exist:**

- ⛔ **No contributor entry in the allowlist, on any surface.**
- ⛔ **No `sahyog-vivran.deceased_member_name` entry** — and `matrix.ts:401-402` reserves it: *"Its
  scope does NOT reach 11b.3 (Sahyog Vivran) or 11b.6 (In Memoriam) … moving them requires each
  surface's OWN Panel ruling."*
- ⛔ **No `clause_versions` row for the disclosure clause** — the 11b.9 predicate is **inert**, by
  ruled design.
- ⛔ **No stable per-member row key.** `rowKey` was **vacated by 11b.2a's D5** and ships in ⛔ neither
  `@twt/ui`, the contract, nor `apps/mobile`. ⇒ **Trap 4.**
- ⛔ **`apps/public` does not depend on `@twt/ui`.** Adding it is **this story's** act.

---

## ⛔ THE SIX TRAPS

### Trap 1 — ⭐⛔ THE BASIS IS SETTLED AND THE FORM IS NOT, AND A READER WHO CHECKS ONLY THE BASIS CONCLUDES WRONGLY

The 2026-08-30 routing note's §5 table exists for exactly this failure:

| Layer | State |
|---|---|
| **BASIS** — *why* a contributor's name may render publicly | ✅ **SETTLED** (`-160` cl.7 cleared all three 11b surfaces) |
| **DECLARATION** — the `(surface, field)` matrix pair | ⛔ **NOT MADE** |
| **FORM** — full vs first-name + last-initial vs other | ⛔ **UNRULED since 2026-08-19** |
| **MECHANISM** — what gates it at render time | ⛔ **NOT BUILT** |

⚠ *"A reader who checks only the basis concludes the question is answered. It is not."*
⛔ **Do not build to the shipped wire shape and call it ratified** — `pool-contributor-list.ts:42-51`
implements the shielded form, and the note names it **built-to, ⛔ not ratified**. ⭐ A ruling either
way costs **no migration**, which is precisely why nobody should pre-empt it.

### Trap 2 — ⭐⛔ SHIELDING DOES ⛔ NOT LOWER THE TIER, SO **EVERY** FORM NEEDS AN ALLOWLIST ENTRY

`MatrixFieldSchema.superRefine` is fail-closed both ways (`matrix.ts:174-199`): `pii_tier: 1` at
`tier: public` **without** a `tier1_public_exception` **FAILS**.

⚠ **And *"first-name + last-initial is not really Tier-1"* is ⛔ NOT available as an argument.**
`public-vs-private-matrix.yaml:60` — `pii_tier` is *"a FACT about the data; ⛔ never changed to permit
a render"* — and `2026-08-28-165` **cl.2** ruled the analogous point for masking. ⚠⭐ **But note what
the 2026-08-30 note §4 says about that extension:** applying cl.2 (whose subject was **bank account
fields**) to **a person's name** is *"a SOUND INFERENCE … ⛔ and NOT something the ruling decided."*
⇒ ⛔ **offer it as reasoning, ⛔ never cite it as authority.**

⇒ ⭐ **the shielded form and the full form need the SAME thing: a Panel ruling and an entry.** The form
question is about **which name**, ⛔ not about **whether an entry is needed**.

### Trap 3 — ⚠ THERE ARE **TWO** PUBLIC NAME RESOLVERS, THEY PRODUCE **DIFFERENT FORMS**, AND THE INVERSION IS ALREADY OPEN

`resolvePublicMemberName` = Pariwar-configured (default **full name**). `resolvePoolIdentity()` =
**hard-coded shielded**, and is what the **member app** uses for the same family.

⭐ `/sahyog` renders the **full** name under D10 — ⚠ and **D10 is author-ruled and ⛔ NOT
Panel-ratified** (`deferred-work.md` 11b.1 item **(e)**). ⇒ ⛔ **do not cite `/sahyog`'s form as
precedent for this surface**; `matrix.ts:401-402` fences it out **by name**, and 11b.1's own exception
rationale flags its comparative ground as *"⛔ not to be cited for a third surface."*

⚠ **The INVERSION binds this story now.** After D10 the **public** page shows **MORE** than the
**member app** does for the same pool. 11b.1 item (e) says *"⛔ Not this story's to resolve — it binds
11b.2 and 11b.3."* ⇒ **11b.3 carried it (D7(a)); this story is its binder.** ⛔ **Re-affirm it, ⛔ do
not re-file it** — *"two records of one obligation is its own failure."* Whether this story **resolves**
it is **D9**.

⭐⭐ **AND IT NOW HAS A DESTINATION AND A DATE — read D9's update box before AC8.** The Panel directed
the inversion **CLOSED** (`2026-09-02-179` cl.3); Story **`8-16`** owns the member-side work and is
`ready-for-dev` with **both** its decisions ruled (`-180` ALL FOUR · `-181` MODE-RESOLVED). ⇒ ⚠ **the
member app's shielded form is a state with an expiry**, and ⛔ this story must ⛔ not encode it as
permanent — ⛔ neither in `deferred-work.md` (AC8) nor in a comment. ⭐ **And `-181` is why Trap 6
exists:** with the member side mode-resolved, a hard-coded literal HERE is the only way left to
re-open the divergence.

### Trap 4 — ⛔ THE FlashList `keyExtractor` RE-TRIGGER FIRES **HERE**, AND ITS BLOCKER IS STILL TRUE

The Story 8.3 deferral (*"`keyExtractor` includes `index`, so row identity churns"*) records its
re-trigger as *"if this list ever needs to scale beyond a single pool's roster (e.g. reused for the
Epic 11b **public** render)"*. ⭐ **Story 11b.2b was ⛔ NOT that** — it is the **member** render of a
single pool's roster, the exact scale the deferral's own ground calls fine (*"dozens, not the ~16k
Sahyog Vivran scale"*) — and 11b.2b's authoring pass **wrongly claimed the trigger had fired**, which
was corrected on the record.

⇒ ⭐ **This story IS the public host and the real re-trigger.** ⚠ **And its recorded blocker is still
true verbatim:** *"the PII-shielded shape carries no stable per-member identifier."* `rowKey` was
vacated by **11b.2a's D5** and ships nowhere.

⇒ **D10**: what is the stable key? ⛔ It is ⛔ **not** `index`, and it is ⛔ **not** a `member_id` on a
public wire — 11a.3's handler refuses that **in terms**, because a per-member permalink is an
**enumeration primitive**.

### Trap 5 — ⛔ RTBF REMOVES THE CONTRIBUTOR **ENTIRELY**, AND THE OMITTED ROW **STILL COUNTS**

`2026-08-30-169`: RTBF removes the contributor from the list — ⛔ **no anonymized row, ⛔ no marker,
⛔ no placeholder key** — and the omitted contributor **still counts** toward every confirmed-transaction
aggregate. ⚠ `2026-08-31-170`: the guarantee lives on the **decrypted plaintext**, ⛔ **not** on the
lifecycle-state read (which is an **optimization**), and ⛔⛔ **a per-row state re-check is FORBIDDEN
as a TOCTOU mitigation** — it is the rejected construction *and* it does not close the window.

⚠⛔ **AND A LIVE RESIDUAL IS CARRIED OPEN, ⛔ not closed** (`2026-09-01-172`): the RTBF guarantee **ends
AT THE WIRE**; the device-side persisted cache is out of scope **by ruling**, so an erased
contributor's name can render from MMKV for up to **7 days offline** and **survives sign-out on a
shared device**. ⭐ **That residual is a MOBILE one** — ⛔ this Astro surface has no MMKV — ⚠ but the
**edge cache is this surface's equivalent exposure**: an erasure keeps being served from every warm
PoP at `s-maxage=300`. ⛔ **State it; ⛔ do not re-derive it as new.**


### Trap 6 — ⭐⛔ *"FULL NAME"* IS A **CEILING**, ⛔ NOT A LITERAL — AND HARD-CODING IT RE-CREATES THE INVERSION POINTING THE OTHER WAY

`-173` and `-174` ruled the full name **AUTHORISED**. ⛔ They did ⛔ **not** make it a constant, and
three live facts say so:

- `2026-08-19-136` **cl.1** — *"a build in which the public name form cannot be changed without a code
  change **FAILS** this clause."* `kyc/public-name.ts` implements exactly that: `full_name` is
  `DEFAULT_PUBLIC_NAME_PRESENTATION_MODE`, ⛔ **never a hard-coded literal**, and the mode is **stored
  per Pariwar** under a `super_admin` key (re-affirmed for this class at `2026-09-02-178`).
- ⭐ **The sibling public surface ALREADY resolves through it.** `apps/public/src/lib/sahyog-render.ts:213`:
  the name's form *"was already decided server-side by `resolvePublicMemberName` under the Pariwar's
  configured mode, and ⛔ re-deriving or re-shortening it here would be the second copy of the
  presentation policy that `-136` cl.2 forbids."*
- ⭐⭐ **`2026-09-02-181` just put the MEMBER side on the SAME stored mode** (Story 8.16, `INV-form`
  **MODE-RESOLVED**), *"so the two forms can ⛔ **never diverge again BY CONSTRUCTION**."*

⇒ ⛔⛔ **A HARD-CODED FULL NAME HERE BREAKS THAT GUARANTEE FROM THE PUBLIC SIDE.** For a Pariwar whose
stored mode is `shielded_name`: `/sahyog` shields, the member app (post-8.16) shields, and
`/sahyog-vivran` would publish **in full** — ⭐ the inversion this family just closed, **re-opened
pointing the other way**, on the surface with the widest reach. ⚠ It is also the mirror of the trap
`-181` names for the member side, and it is ⛔ **not** caught by any gate: every allowlist check, tier
check and CI leg passes on a hard-coded literal.

⚠⛔ **AND THE RESOLVER CARRIES A SECOND TRAP — ⛔ MONONYMS.** In `shielded_name` mode
`resolvePublicMemberName` returns **`''`** for a single-token name (`2026-08-21-145` cl.3 — *"a shorter
page beats an unshielded name on a page that promises shielding"*), and **every caller treats `''` as
"omit this row"**. ⛔ Do ⛔ **not** *"fix"* that by falling through to `firstName`: `public-name.ts:84`
records that exact bug — for a mononym it returns **the entire stored legal name**, byte-identical to
what `full_name` publishes, so a Pariwar performed the governed privacy act and **it did nothing**,
with ⛔ no signal anywhere. ⚠ **Mononyms are common in India; ⛔ this is not a corner case.**
⇒ **AC3 rules the behaviour for both subjects** — ⛔ it is ⛔ not discovered at render.

---

## Acceptance Criteria

> ⛔ **AC1 is a STOP gate. ⛔ Nothing below it builds until both rulings land.**

### AC1 — Both rulings exist, are cited, and are transcribed BEFORE any code

**Given** D2 (contributor: declaration + form) is with the **Panel**, ⏳ routed 2026-08-30, and D3
(deceased member on this surface) has ⛔ **no packet yet**
**When** Task 0 runs
**Then** the D3 packet is **written and routed** as a trustee-panel routing note in the house shape —
⛔ it may ⛔ **not** be resolved by BigDev alone, because `matrix.ts:401-402` reserves it to *"each
surface's **OWN Panel ruling**"*
**And** ⛔ **if either ruling is absent → STOP and report.** ⛔ Do not ship *"first-name + last-initial
for now"*, ⛔ do not add a matrix field, ⛔ do not add `@twt/ui` to `apps/public/package.json`
**And** ✅ **BOTH rulings landed 2026-09-02** — `2026-09-02-173` (deceased member) and
`2026-09-02-174` (contributor), each **YES at the FULL NAME** ⇒ this AC is **SATISFIED**
**And** ⚠ `-174` cl.3's apparent **condition** was **corrected the same day, Panel-ratified**
(`2026-09-02-175`) — the staged reduction is the **nominee bank fields'**. ⇒ **the permissions are
UNCONDITIONAL**; ⛔ do ⛔ not carry the withdrawn condition forward into the build
**And** ⛔ **the DECEASED-member name still will ⛔ not RENDER until counsel's clause exists and is
pinned** — ⛔ that is ⛔ not this AC's gate, and ⛔ ⛔ no placeholder row may be seeded to hide it
**And** ⚠⛔ **D3's ruling authorises the DECLARATION, ⛔ not the RENDER** — the basis predicate stays
false until counsel's `clause_versions` row exists and is pinned, so a correctly-built surface renders
**unnamed** in the interim. ⛔ That is the designed inert state, ⛔ not an incomplete implementation
**And** both rulings are **transcribed** into `.decision-log.md` — ⛔ the dev agent transcribes, it
⛔ **never** authors, paraphrases or re-grounds one.

### AC2 — The two allowlist entries land WITH their field declarations, in the SAME commit

**Given** Trap 2 and the §11 timing rule (*"a pre-added entry is a standing permission with ⛔ no
subject"*)
**When** the fields are declared
**Then** `sahyog-vivran.contributor_name` and `sahyog-vivran.deceased_member_name` are added to
`RULED_TIER1_PUBLIC_EXCEPTIONS`, **each citing the ruling that authorised it** — ⭐
`deceased_member_name` cites **`2026-09-02-173`**, `contributor_name` cites **`2026-09-02-174`**, and
⭐ **both are ruled at the FULL NAME**
**And** ⚠ each `tier1_public_exception` `scope:` block states the **ruled form** and fences it to
**this surface** — ⭐ and for `contributor_name` it records that `-174` cl.3's apparent staged-reduction
condition was **CORRECTED away by `2026-09-02-175`**, so a later reader ⛔ cannot re-derive a condition
the Panel withdrew
**And** ⭐ **both land in the SAME commit**, as this AC was always written — `D11-order` is **VACATED**
now that both names are ruled at the same form. ⛔ **Never pre-add an entry** ahead of its field: *"a
pre-added entry is a standing permission with ⛔ no subject"*
**And** ⛔ **the RULED form is the FULL NAME, ⛔ not `first + lastInitial`** — ⚠ the shipped
`ConfirmedContributorRow` (`pool-contributor-list.ts:42-51`) is the **wrong shape for this surface**
and the three epic ACs that assume the shielded form (`epics.md:3145` · `:3238` · `:4931`) are
**STALE**, superseded by `-174`. ⛔ Annotation is folded into **11b.3's Task 0 annotation, item
(iii)**, which names all three by line — ⛔ do ⛔ not write a second one
**And** ⚠⛔⛔ **VERIFY ITEM (iii) ACTUALLY LANDED — ⛔ do not assume it.** The three are ⛔ **NOT** under
`epics.md`'s Story 11b.3 heading and ⛔ not in one place (`:3145` is **Story 8.3**'s own *"I want"*,
`:3238` the **Contribution Note PDF**, `:4931` **Story 11b.2**), and **11b.3 merges BEFORE this story
starts**. ⇒ ⭐ **if item (iii) is absent from the merged annotation, THIS story writes it** — ⛔ an
obligation routed to a story that has already shipped lands **nowhere**
([[feedback_circular_deferral_between_sibling_stories]])
**And** ⭐⭐ **THE RULING IS A CEILING, ⛔ NOT A CONSTANT — THE RENDER RESOLVES THROUGH THE STORED
PER-PARIWAR MODE** (**Trap 6**). `-173`/`-174` authorise the full name; `2026-08-19-136` **cl.1** rules
that *"a build in which the public name form cannot be changed without a code change **FAILS** this
clause"*, and `full_name` is the **DEFAULT** in `kyc/public-name.ts`, ⛔ never a literal
**And** each YAML field carries a full `tier1_public_exception: {decision, rationale, scope}` whose
`scope` fences it to **this surface** and states the **ruled CEILING** — ⛔ never the bare words *"full
name"*, which read as a constant to the next author and would make the entry contradict `-136` cl.1
**And** ⭐ the surface's Tier-1-count test is updated **in the same commit** (⛔ never deleted) — ⚠ its
value depends on whether **11b.3a** has merged first; ⛔ **read it, ⛔ do not assume it**
**And** ⭐⛔ **THE FENCE COMMENT THREE LINES ABOVE THE ENTRIES IS AMENDED IN THE SAME COMMIT — ⛔ IT GOES
FALSE THE MOMENT THEY LAND.** `matrix.ts:401-402` reads *"Its scope does NOT reach 11b.3 (Sahyog
Vivran) or 11b.6 (In Memoriam): **those keep first-name + last-initial**, and moving them requires each
surface's OWN Panel ruling."* ⚠ Its **second half is now SATISFIED** for this surface (it got its own
rulings) and its **first half becomes UNTRUE** for `sahyog-vivran` — ⭐ while staying **TRUE for
11b.6**, which is ⛔ **not** touched and whose fence ⛔ must survive the edit
**And** ⇒ ⭐ **amend the sentence to record `sahyog-vivran` as RULED (citing `-173` / `-174`) and leave
the 11b.6 fence standing** — ⛔ **amendment, ⛔ never a rewrite** of the surrounding grounds
([[feedback_supersede_never_reinterpret]]), ⛔ never a deletion. ⚠ **This story is what makes it stale,
so it is ⛔ THIS story's to fix** — ⛔ that is Trap 6's discipline applied to the one line this diff
falsifies, ⛔ not a sweep of the comment family
**And** ⛔⛔ **an entry is ⛔ NEVER added to make a failing check pass** — *"the gate failing is the gate
working."*

### AC3 — `apps/public` adds `@twt/ui`, and the Astro render layer is authored over the SHARED presenter

**Given** C-1 — RULED: **headless presenter + per-stack render layer**, and *"an ORDINARY DEPENDENCY
ADDITION"* (⛔ **not** a governance reversal; ⛔ **there was no declination** — the Story 2.5 variance is
about where **tokens** live)
**When** the layer is built
**Then** `@twt/ui` is added to `apps/public/package.json`, and `@twt/ui`'s **own** dependency list stays
**exactly `@twt/contracts`** — ⛔ no React, ⛔ no `.astro`, ⛔ no framework of any kind enters it
**And** the `.astro` component consumes `deriveContributionRowViewModel` and renders the **name parts**
in the ruled form — ⭐ **the JOIN happens in the render layer, ⛔ never in the presenter** (D9(a) is what
keeps the form question open, and moving the join would make a routed deferral false)
**And** ⭐⭐ **THE FORM COMES FROM `resolvePublicMemberName(mode, storedName)` UNDER THE PARIWAR'S
STORED MODE — ⛔ NEVER FROM A LITERAL** (**Trap 6**). It is resolved **server-side at `apps/api`**,
exactly as the sibling public surface already does (`sahyog-render.ts:213`), and the render layer joins
**parts** — ⛔ it does ⛔ **not** choose a form, ⛔ does not re-shorten one, and ⛔ does not hold a
second copy of the presentation policy (`-136` cl.2)
**And** ⚠⛔ **THE MONONYM PATH IS RULED HERE, ⛔ not discovered at render.** Under `shielded_name`
`resolvePublicMemberName` returns **`''`** for a single-token name and every caller treats `''` as
**omit this row**. ⇒ ⭐ **the row is OMITTED, the omission is COUNTED like any other (AC5), and ⛔ NO
marker announces it** — an omission that announces itself is an enumeration signal. ⛔⛔ **Do ⛔ NOT
fall through to `firstName`**: `public-name.ts:84` records that as publishing the **entire stored legal
name** on a page that promises shielding
**And** ⚠⛔ **AND SAY WHAT IT COSTS, because ⛔ nothing distinguishes the two omissions:** on this
surface a mononym omission is **indistinguishable from an RTBF omission** (AC5) and widens the
count-vs-rows gap with ⛔ no signal. ⭐ That is **accepted**, ⛔ not a defect to file — ⛔ and it is
⛔ **not** grounds to mint a marker, a placeholder or a per-row diagnostic
**And** ⚠ for the **deceased member's name** a mononym under `shielded_name` yields `''` ⇒ the page
renders **unnamed** — ⛔ correct, and ⛔ **a DIFFERENT reason** from AC1's unpinned-clause inert state.
⛔ Do ⛔ not collapse the two in the write-up ([[feedback_closure_language_precision]])
**And** the presenter's **input** name kind is `'name'`; `'nameParts'` is **OUTPUT only** — ⚠ 11b.2b's
AC9 got this wrong ([[project_contribution_row_render_layer_substrate]])
**And** ⭐ **every row is wrapped in its own `try/catch`** — the `unknown` arm **throws** by design
(D8(a)), and this Astro producer is the **first** that can legitimately reach it. ⛔ One bad row must
⛔ not take down the surface
**And** ⭐ **`packages/ui/src/index.ts` has stated since Story 9.12** that `<PoolProgressCard>` is
*"shared by the apps/mobile RN progress meter today **+ the Epic-11b public Sahyog Vivran render
later**"* — ⇒ ⛔ `apps/public` lacked the dep because it had **no presenter to consume**, ⛔ not because
anyone declined one.

### AC3b — ⭐ **THE AMOUNT-RAISED RENDER — moved here by `D1(b)` (`2026-09-02-176`)**

**Given** BigDev ruled **D1(b)** on Story 11b.3: the surface consumes the **shipped canonical**
`amountRaisedInr`, ⛔ and the `@twt/ui` fence is **NOT lifted** for 11b.3 ⇒ **the amount lands HERE**,
in the story that adds the dependency (**AC3**)
**When** the Sahyog Vivran renders a pool's figures
**Then** the rupee figure is `derivePoolProgressCardViewModel(...).amountRaisedInr` — *"the **SINGLE
canonical definition** of 'amount raised'"* (`packages/ui/src/pool-progress/presenter.ts:10,69`, Story
9.12 **Decision 3**), consumed **UNCHANGED**
**And** ⛔⛔ **it is ⛔ NEVER re-derived inline.** `confirmedCount × fixedAmount` written anywhere in this
diff is **D1(c)**, which is **REFUSED** — it forks the canonical definition of a money figure into a
second site
**And** ⚠⭐ **the presenter's INPUT is FIVE keys** — `pool` · `confirmedCount` · `rosterSize` ·
`fixedAmount` · `daysRemaining` (`packages/ui/src/pool-progress/view-model.ts:30-50`). ⇒ **`rosterSize`
and `fixedAmount` must reach the DTO** (11b.3 authored it **without** them, deliberately leaving room —
⛔ this story extends it)
**And** ⚠ **`daysRemaining` is a 15-day-WINDOW concept with ⛔ no meaning for a `closed`/`settled` pool**
⇒ supply **`0`** and render **nothing** from it. ⛔ Not a ruling — nothing derived from it reaches the
page
**And** ⛔⛔ **ONLY `amountRaisedInr` IS AUTHORISED.** The presenter also emits `confirmedPercentage`,
`isComplete`, `meterFillTokenRole` and `daysRemaining` — ⭐ **a progress meter designed for a LIVE
pool.** ⛔ Rendering completion framing on a **settled** drive is a **different act**, is ⛔ **not**
authorised by D1(b), and is the same family as 11b.1's `0 >= 0` → *"fully_funded"* defect. ⛔ It needs
its own decision
**And** ⚠ **the presenter THROWS on `confirmedCount > rosterSize`** — an impossible state by design.
⭐ The per-row `try/catch` discipline (**AC3**) covers this call too; ⛔ one bad pool must ⛔ not take
down the surface
**And** ⭐ **the interim asymmetry 11b.3 shipped with is CLOSED HERE** — until this story merged, the
public page showed a count while the member app showed an amount. ⛔ That was **ordering**, ⛔ not a
ruling, and ⛔ it is ⛔ **not** a second instance of the D7/D9 inversion.

### AC4 — The list is paginated, deterministically ordered, and ⛔ never a leaderboard

**Given** FR-91 and the **remembrance-not-analytics** invariant this epic enforces in three places
**When** the list renders
**Then** it binds `apps/public/src/lib/pagination.ts`'s `parsePageParams()` **unchanged** (page-size
cap 50, deep-page horizon 200, ⛔ no silent clamp), and the surface's `paginated` **flips `false` →
`true`** in the matrix — ⚠ 11b.3 declared it `false` because it renders no list; ⛔ read the current
value, ⛔ do not assume it
**And** ⭐⛔ **THAT FLIP RESTORES THE TWO CONTROLS THE THIRD ROUTE COULD NOT CARRY, AND THE ROUTE'S
WRITTEN DEFENCE MUST MOVE WITH IT — ⛔ IN THIS COMMIT.**
`apps/api/src/modules/public-pages/routes.ts:52-55` rules that the control set is a property of *"an
unauthenticated, **PAGINATED**, PII-bearing public collection"*; 11b.3 shipped the route
**unpaginated** under **D11**, so controls **2** (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and **3**
(`PUBLIC_DIRECTORY_PAGE_HORIZON`) were recorded as structurally N/A. ⇒ the `routes.ts` header **and**
the `login-wall.spec.ts` allowlist entry are both updated to the set that applies now, ⛔ **both
stating the SAME count** — *"two authoritative documents disagreeing on how many controls exist is the
defect this file records having already had once"*
**And** ⚠ this story ALSO makes the route **PII-bearing** (two Tier-1 fields) — ⭐ **11b.3a does the
same, independently and in parallel.** ⛔ Whichever lands second must **read** what the other wrote and
extend it; ⛔ neither may overwrite the other's control set
**And** the order is the **deterministic** one 11b.3 established at the read (confirmation
`event_version`) — ⛔ **never `member_id`**, which leaks an arbitrary identifier ordering onto a
PII-shielded surface
**And** ⭐⛔⛔ **THE DECRYPT IS BOUNDED AT `apps/api`, AND THIS IS THE MOST EXPENSIVE PAGE IN THE
EPIC.** Contributor names live ⛔ **only** as `member_kyc_profiles.nameCiphertext` (**Tier-1**), so a
rendered page is **one KMS `decryptDek` round-trip PER ROW** — envelope encryption gives every stored
name its **own DEK**, so there is ⛔ nothing to decrypt once and reuse
(`apps/api/src/modules/public-pages/handlers.ts:162-163`). ⇒ at the page-size cap that is **50 decrypts
+ 1** for the deceased member, per request. ⚠ `packages/contracts/src/public-pages/sahyog-drive.ts:154-156`
already states this cost in terms (*"a page decrypt is 50 rows per request"*) — ⛔ do ⛔ not re-derive it
**And** ⛔ **reuse `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY`**
(`apps/api/src/modules/kyc/bounded-decrypt.ts` — as `public-pages/handlers.ts:42` and
`member-pool/handlers.ts:65` both already do) — ⛔ never an unbounded `Promise.all`, ⛔ never a new
constant, ⛔ never a per-surface copy of the bound
**And** ⛔⛔ **`apps/public` gains ⛔ NO KMS dependency and ⛔ no `withPublicScope` read** — D6(a) /
`2026-08-20-143` cl.1: *"the KEK is shared across EVERY Tier-1 field class"*, so the capability for one
class is the capability for **all** of them. ⚠ ⭐ This is the same fence 11b.3a's Trap 6 holds for a
page costing **at most eight** values; ⛔ it does ⛔ not loosen for a page costing fifty
**And** ⭐ **the publication-basis gate is evaluated BEFORE the decrypt**, on the second route's own
precedent (`routes.ts`: *"a PUBLICATION-BASIS gate … evaluated BEFORE the Tier-1 decrypt so a row with
no basis costs zero KMS calls"*) — ⚠ ⇒ while counsel's clause is unpinned the deceased-member name
costs **zero** decrypts and the surface is **cheap**, ⛔ not broken (AC1's inert state)
**And** ⚠ a **decrypt failure** degrades the way the existing handler degrades — the row's name is
**absent**, ⛔ never a placeholder, ⛔ never an error page; ⭐ and the per-row `try/catch` (AC3) is what
keeps one bad row from taking the surface down
**And** ⛔ **PROHIBITED:** contributor leaderboards · rankings (*"top contributors"*, *"supporter of the
month"*) · gamification (badges, streaks, achievements) · social-performance metrics · popularity
metrics. ⛔⛔ **AND THE SORT ORDER IS NOT A RANKING** — there is deliberately **no sortable column
header**: *"sort by contributions" is a leaderboard wearing a table affordance*
**And** ⭐ **THE TEST:** *"Does this serve remembrance, transparency or claim discoverability?"* If the
honest answer is **engagement, ranking or social performance**, it is **REJECTED at design time**
**And** ⛔ **no bulk-export affordance** — ⛔ no `format`, ⛔ no `csv`, ⛔ no `all` parameter (FR-91). The
authorized export path is Story 10.7's scope-respecting, audit-logged library.

### AC5 — RTBF and the row key

**Given** Trap 4 and Trap 5
**When** a contributor has exercised RTBF
**Then** they are **absent from the list entirely** — ⛔ no anonymized row, ⛔ no marker, ⛔ no
placeholder key — **and still counted** in every confirmed aggregate
**And** ⛔ **no per-row lifecycle-state re-check is added** as a TOCTOU mitigation — forbidden by
`2026-08-31-170`
**And** ⭐⭐ **`D10(a)` RULED: there is ⛔ NO ROW KEY.** ⛔ Do ⛔ not add `index`, ⛔ not `member_id`,
⛔ not a token, ⛔ not an "opaque positional key" — **nothing.** Astro SSR emits static HTML with ⛔ no
reconciler, so a key would be an identifier with ⛔ no consumer
**And** ⛔ **Story 8.3's `keyExtractor` deferral is RE-AFFIRMED OPEN and its trigger RE-POINTED** to
*"the first VIRTUALIZED render of a multi-pool contributor list"* — ⛔ **explicitly and citing
`2026-09-02-177`**, ⛔ never silently, and ⛔ **NOT discharged** by this story
**And** the **edge-cache residual is stated in writing** on the surface's own file: an erasure keeps
being served from every warm PoP for up to `s-maxage` seconds, and ⛔ **direct SQL is NOT the
operational fallback**. ⛔ Recorded, ⛔ not re-derived as a new finding.

### AC6 — The buildable public column inventory is NAMED here [11b.1 D5(a)'s remaining half]

**Given** `deferred-work.md` 11b.1 item **(f)**: the UX-spec amendment **records** the defect but
*"does ⛔ NOT repair the surface — ⛔ **naming the BUILDABLE inventory is 11b.3's**, at the point it has
a host"*
**When** the contributor table lands
**Then** ⭐⛔ **THE BUILDABLE HALF IS NAMED POSITIVELY — ⛔ a second negative list does NOT discharge
this AC.** The UX spec's `:1160` annotation **already** records what is not buildable; restating it is
⛔ not the obligation. ⇒ name what a reader can actually be shown: **`District` · `Pool` · `Date`** are
buildable today (district from the deceased member's Pariwar geography, pool from
`PoolContributorListPoolIdentity`'s letter code, date from the confirmation event) — ⭐ **plus
`Donor Name`, CONDITIONAL on D2**, and ⚠ its *label* is separately microcopy-PROHIBITED
(`microcopy.yaml:42`, `member_only: true`) even if the field is ruled in, so the ruled form ships under
a permitted label
**And** the not-buildable half is named against the ten columns at
`ux-design-specification.md:1158`, each with its disposition: **`Donation ID` · `HRMS` · `Member ID`**
have ⛔ **no substrate** (the last **refused in terms** on a public wire as an enumeration primitive) ·
**`Donor Name` · `Late Teacher`** are **microcopy-PROHIBITED** (`microcopy.yaml:42`, `:48`, both
`member_only: true`) · **`School` / `Block`** are separately ineligible or gated
(`2026-08-19-133` cl.1, `-132` cl.3, `2026-08-19-137` cl.7)
**And** ⛔ **the UX spec is ANNOTATED at the canonical anchor (`:1287-1298`), ⛔ never rewritten** — ⛔ no
column is deleted and ⛔ no replacement inventory is authored elsewhere
([[feedback_supersede_never_reinterpret]])
**And** ⚠ **the Real Data Test's disambiguation question stays OWED** — its scenarios rest on
`Member ID` + `HRMS`, which do not exist. ⛔ **The gate is not weakened**; the **means** must be re-posed
against fields that do exist, and re-posing it is ⛔ not this story's act.

### AC7 — Accessibility + i18n

**Then** the list holds **family 13 (Semantic accessibility, AI-11a-3)** of
`_bmad/custom/load-bearing-invariant-checklist.md:72` — each row a coherent unit, ⛔ never a stream of
disconnected text nodes
**And** ⚠⛔ **family 13 is written in REACT-NATIVE vocabulary and this is an ASTRO surface** — 11a.6's
worked example is `apps/mobile/components/panchayat/PinnedItem.tsx` (⛔ **not** in `@twt/ui`), and
`accessible={true}` / `accessibilityLabel` have ⛔ **no HTML equivalent**. ⇒ hold it in its **web
form**: a real table with `<th scope="col">`, each row one coherent announced unit, `aria-label` on a
grouping element that carries a role — ⛔ never a labelled `<div>` no role announces. ⛔ **Do ⛔ not
record family 13 as held by pointing at the RN file**
**And** every `t()` call passes an explicit `namespace` in the **third** slot — ⚠ `t()` defaults to
`common` and **THROWS**
**And** ⭐⛔ **THE NAMESPACE IS `contribution` FOR THE TEN REFS, ⛔ NOT `sahyog-vivran` — ⛔ AND THEY ARE
⛔ NOT COPIED INTO ONE.** Verified live: every entry in `CONTRIBUTION_LIST_I18N_REFS` carries
`namespace: 'contribution'` (`packages/ui/src/contribution-list/i18n-keys.ts`), the keys ship
bilingually at `packages/i18n/locales/{en,hi}/contribution.json:30-39`, and that file's header rules it
in terms: *"**REUSE ONLY. NOTHING IS MINTED HERE, AND NO NAMESPACE IS CREATED.**"* ⇒ the render layer
calls **`t(ref.key, params, { namespace: ref.namespace })`** — the ref carries its own namespace and
⛔ **nothing re-points it**. ⚠ `contribution` is **already globbed** (`microcopy.yaml:317-318`), so no
gate is dodged by leaving it there — ⛔ and duplicating ten keys into `sahyog-vivran` to make one
namespace true would be the copy this module exists to prevent
**And** ⭐ **only copy this surface MINTS** — headings, the reversed-appeal narrative, the memorial
framing — lands in the `sahyog-vivran` namespace 11b.3 added to `scope.copy_globs`; ⛔ do not add a
third namespace
**And** ⭐ **all ten `CONTRIBUTION_LIST_I18N_REFS` resolve through the REAL `t()` in BOTH locales** —
⚠ this is the obligation that survived a **circular deferral** between 11b.2 and 11b.2b and was
discharged only at the 2026-09-01 combined review; ⛔ **do not let a third instance open here**, and
⛔ **a test that resolves them against the wrong namespace is a third instance wearing a green run**
([[feedback_circular_deferral_between_sibling_stories]]).

### AC8 — What this story does ⛔ NOT build is ROUTED

**Then** `deferred-work.md` gains this story's section recording, each with a trigger: **11b.2 items
(i) / (ii) / (iii)** — ⭐ **discharged if AC1–AC3 complete, ⛔ and explicitly re-affirmed OPEN if the
rulings do not arrive** · the **public/member name INVERSION** (11b.1 item (e) — ⛔ re-affirmed, ⛔ not
re-filed; **D9** decides whether it moves) · ⭐ the **FlashList `keyExtractor`** deferral — **`D10(a)` supplied NO key**, so it is
**RE-AFFIRMED OPEN** and its trigger is **RE-POINTED** to *"the first VIRTUALIZED render of a
multi-pool contributor list"*, ⛔ **explicitly and citing `2026-09-02-177`** · ⭐ the **public/member INVERSION**
(**`D9(a)`** — ⛔ re-affirmed, ⛔ not re-filed). ⚠⛔⛔ **READ ITEM (e)'s CURRENT STATE FIRST — ⛔ do
⛔ NOT restate it from this file.** It moved from *"carried"* to **DIRECTED TO CLOSE**
(`2026-09-02-179` cl.3) and is **owned by `8-16`**, whose own decisions are **ruled** (`-180` ALL FOUR ·
`-181` MODE-RESOLVED). ⇒ ⛔ **if 8.16 has MERGED, record the CLOSURE — ⛔ never re-affirm it open, and
⛔ never write *"the member app shields on three"***, which `-180` makes false. ⭐ If 8.16 has ⛔ not
merged, re-affirm it open and name **8.16** as its binder · the
**Real Data Test disambiguation** question (AC6)
**And** ⛔ **the `epics.md` annotation is 11b.3's Task 0, ⛔ not this story's** — ⛔ do not write a
second one.

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ STOP GATE. ⛔ No code until both rulings land.** (AC: 1)
  - [ ] ⛔ Verify `11b-3` is `done` AND MERGED.
  - [x] ✅ **The D3 packet is WRITTEN AND ROUTED (2026-09-02)** —
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`,
        in the house shape, ⛔ not re-arguing D2. ⚠⛔ **This discharges the WRITING, ⛔ not the
        question** — D3 stays **UNRULED** and this task stays a STOP gate.
  - [x] ✅ **THE PANEL ANSWERED — 2026-09-02** (Kalpana Bharti, Dhiraj Rahul): **Q1 YES · Q2 FULL
        NAME · Q3 the BROAD clause scope**. Recorded at the note's **§10** and transcribed as
        `.decision-log.md#decision-2026-09-02-173`. ⛔ **Already transcribed — ⛔ do not re-transcribe
        and ⛔ do not renumber it.**
  - [ ] ⚠⛔ **Q3 IS ⛔ NOT AN INSTRUMENT — verify before building to it.** Counsel confirmed the broad
        scope **in discussion**; the written rule *"will soon follow"* and ⛔ had not arrived at
        2026-09-02. ⇒ ⛔ **check for a real `clause_versions` row for
        `niy.public-disclosure.member-information`, pinned into an accepted T&C version.** If it is
        absent, the field may be **DECLARED** and the surface **still renders unnamed** — that is
        correct, ⛔ not a bug. ⛔⛔ **Do ⛔ NOT seed a placeholder row** (`public-read.ts:171-175`).
  - [x] ✅ **D2 ANSWERED — 2026-09-02** (Dhiraj Rahul, Kalpana Bharti): **Q1 YES · Q2 THE FULL NAME ·
        Q3 cl.10's staged schedule EXTENDED to a person's name**. Note §12; transcribed
        `.decision-log.md#decision-2026-09-02-174`. ⛔ Already transcribed — ⛔ do not re-transcribe.
  - [x] ⭐⭐ **THE PANEL STOP GATE IS DISCHARGED.** ⚠ `-174` cl.3 briefly appeared to attach a
        CONDITION (a staged disappearance of the name); **that was corrected the same day and
        Panel-ratified** at `2026-09-02-175` — the staged reduction is the **NOMINEE BANK fields'**.
        ⇒ **Q1/Q2 stand unconditionally**, and `D14-order` / `D12-schedule` / `D13-maskedname` /
        `D11-order` are **VACATED** (⛔ their questions ceased to exist; ⛔ they were not rejected).
  - [ ] ⛔⛔ **BUT VERIFY THE COUNSEL CLAUSE BEFORE EXPECTING A DECEASED-MEMBER NAME TO RENDER.**
        `-173`'s Q3 clause was confirmed **in discussion**; the written rule had ⛔ not arrived. Check
        for a real `clause_versions` row for `niy.public-disclosure.member-information`, **pinned**
        into an accepted T&C version. If absent, the field is **DECLARED** and the surface renders
        **unnamed** — correct, ⛔ not a bug. ⛔⛔ **⛔ Do NOT seed a placeholder row**
        (`public-read.ts:171-175`).
  - [ ] ⚠ **`D10` (the row key) is still open and AC5 depends on it; `D9` (the inversion) is open.**
        ⛔ Neither is a Panel matter.
  - [ ] Check whether **D2** has been answered (`§8`-style appendix on the 2026-08-30 note, or a new
        `.decision-log.md` entry). ⛔ Do ⛔ not infer an answer from silence.
  - [ ] ⛔ **If either is unruled → STOP and report.** ⚠ This is the one story in the family where
        stopping is the expected outcome on a first pass.
  - [ ] Transcribe both rulings; re-read `.decision-log.md` head first (⚠ 11b.3a mints against the
        same head). `governance:` commit first.

- [ ] **Task 1 — Declare the two fields + their two allowlist entries, in ONE commit** (AC: 2)
  - [ ] ⛔ **READ** the surface's Tier-1-count assertion and update it by **+2** — ⛔ never hard-code;
        **11b.3a** runs in parallel and may already have added **four**.
  - [ ] ⭐ **Amend the `matrix.ts:401-402` fence comment IN THE SAME COMMIT** — it goes **false** for
        `sahyog-vivran` the moment these entries land. ⛔ **Keep the 11b.6 fence standing**;
        ⛔ amendment, ⛔ never a rewrite, ⛔ never a deletion.
  - [ ] ⭐ Write the `scope:` blocks as a **ruled CEILING**, ⛔ never the bare words *"full name"*.
  - [ ] ⚠ **Verify 11b.3's Task 0 annotation carried item (iii)** (the three stale epic ACs at
        `:3145` / `:3238` / `:4931`); ⭐ **write it here if it did not** — ⛔ it lands nowhere otherwise.
- [ ] **Task 2 — Add `@twt/ui` to `apps/public`; author the Astro render layer** (AC: 3, 3b)
  - [ ] Per-row `try/catch`; the join lives in the render layer, ⛔ never in the presenter.
  - [ ] ⭐⭐ **Resolve the name FORM through `resolvePublicMemberName(mode, storedName)` under the
        Pariwar's stored mode** (**Trap 6**), server-side at `apps/api` — ⛔ **never a hard-coded full
        name**, which re-creates the inversion pointing the other way (`-136` cl.1, `-181`).
  - [ ] ⚠ **Mononym: `''` ⇒ OMIT the row**, count it like any other, ⛔ no marker. ⛔ **Never fall
        through to `firstName`** (`public-name.ts:84` — that publishes the whole stored legal name).
  - [ ] ⭐ **Bound the Tier-1 decrypt at `apps/api`** — `mapWithConcurrency` +
        `DIRECTORY_DECRYPT_CONCURRENCY`, ⛔ never an unbounded `Promise.all`, ⛔ never a new constant.
        ⚠ **50 decrypts + 1 per page** at the cap; the basis gate runs **before** the decrypt.
        ⛔ `apps/public` gains ⛔ no KMS dependency.
  - [ ] ⛔ `@twt/ui`'s own dependency list stays exactly `@twt/contracts`.
  - [ ] ⭐ **Wire the AMOUNT-RAISED render (`D1(b)`, moved here):** extend the DTO with `rosterSize` +
        `fixedAmount`, consume `derivePoolProgressCardViewModel(...).amountRaisedInr` **unchanged**,
        supply `daysRemaining: 0` for non-`live` pools, and render ⛔ **only** the amount — ⛔ **not**
        the meter, ⛔ not `isComplete`, ⛔ not a percentage. ⛔ **Never** re-derive the multiplication.
- [ ] **Task 3 — Pagination + ordering + the anti-leaderboard invariant, written where it is read** (AC: 4)
  - [ ] ⭐ Flip the surface's `paginated` **`false` → `true`** (⛔ read it first), and update the
        `routes.ts` header **and** the `login-wall.spec.ts` allowlist entry to the control set that
        applies now the route is paginated and PII-bearing — ⛔ both stating the **same** count. ⚠ If
        11b.3a landed first, **extend** what it wrote; ⛔ never overwrite it.
  - [ ] Record the remembrance-not-analytics invariant in **three** places, as 11b.1 did
        (`sahyog.astro`, `lib/sahyog-render.ts`, the abuse-rules README) — the equivalent three here.
- [ ] **Task 4 — RTBF behaviour + the row key** (AC: 5)
- [ ] **Task 5 — Name the buildable column inventory; annotate the UX spec at `:1287-1298`** (AC: 6)
- [ ] **Task 6 — a11y family 13 (in its WEB form) + the real-`t()` assertion across both locales** (AC: 7)
  - [ ] ⛔ Resolve the ten refs through **`ref.namespace` (`contribution`)** — ⛔ never re-pointed at
        `sahyog-vivran`, ⛔ never copied into it. Only surface-minted copy uses `sahyog-vivran`.
- [ ] **Task 7 — Route what is not built; re-affirm what stays open** (AC: 8)

---

## ⚖️ Decisions — ✅ **ALL RULED.** D2 + D3 (Panel, 2026-09-02, YES · FULL NAME, unconditional) · **D9(a)** + **D10(a)** (BigDev, `2026-09-02-177`). ⛔ **ZERO OPEN.** ⭐ **FOUR VACATED by `-175`: D14-order · D12-schedule · D13-maskedname · D11-order**

### ✅ D2 — **RULED by the Trustee Panel, 2026-09-02** (Dhiraj Rahul, Kalpana Bharti) — **YES, at the FULL NAME**, ⭐ **UNCONDITIONALLY**

⭐ **Transcribed at `.decision-log.md#decision-2026-09-02-174`**; the packet's **§12** carries the
answers. **Q1 YES** · **Q2 THE FULL NAME**.

⚠⭐ **Q3 MOVED TWICE IN ONE DAY — read `2026-09-02-175` with `-174`.** `-174` cl.3 recorded that cl.10's
staged schedule was **extended to a person's name**. ⛔ **That did not reflect the Panel's intent.**
BigDev put the correction **back to the Panel**, and the Panel **ratified it** (`-175`): the staged
reduction is the **NOMINEE BANK fields'** — `-160` cl.10's own subject, which already includes the
**nominee's** name — and it does ⛔ **NOT** reach a contributor's name or the deceased member's.
⇒ ⭐ **Q1/Q2 stand unconditionally**, and the word *"conditionally"* is **withdrawn**.
⛔ `-174` is ⛔ **not edited** — ⛔ ratified entries are never edited in place
([[feedback_supersede_never_reinterpret]]).

⇒ **`sahyog-vivran.contributor_name`** is authorised for `RULED_TIER1_PUBLIC_EXCEPTIONS`, citing
`2026-09-02-174`.

⚠⛔ **Q2 OVERTURNED THE STANDING PRACTICE, AND THAT HAS CONSEQUENCES IN THIS DIFF.** The note's §6
disclosed **three** epic ACs assuming first-name + last-initial (`epics.md:3145` · `:3238` · `:4931`)
**and** the shipped wire implementing it. ⭐ The Panel ruled **against all four**. ⇒
- ⛔ **`ConfirmedContributorRow = { firstName, lastInitial }` is the WRONG SHAPE for this surface**
  (`pool-contributor-list.ts:42-51`). ⚠ ⛔ Whether the **member** surface follows is ⛔ **not** decided —
  and note it narrows the public/member inversion **from the other side** (**D9**).
- ⛔ The three epic ACs are **stale** and owe **annotation** (⛔ never a rewrite) — folded into
  **11b.3's Task 0 annotation, item (iii)**, which names all three by line, ⛔ **not** a second one.
  ⚠⛔ **Verify it landed** — 11b.3 merges first, and ⭐ **if (iii) is absent, THIS story writes it**;
  an obligation routed to a story that has already shipped lands nowhere
  ([[feedback_circular_deferral_between_sibling_stories]]).
- ⚠ **11b.2's presenter emits name PARTS and never joins them** (D9(a)) — ⭐ that design **survives
  intact**: it kept the form question open, and the render layer still owns the join. ⛔ The join now
  produces a **full name**, ⛔ not `first + initial`.

⚠ **Q3-as-asked — whether basis and form are independent — is recorded ⛔ NOT ANSWERED**, ⛔ not
answered in the negative ([[feedback_closure_language_precision]]). The Panel answered a different and
more useful question.

### ⛔ VACATED 2026-09-02 by `2026-09-02-175` — **D14-order · D12-schedule · D13-maskedname**

⭐⭐ **VACATED, ⛔ NOT rejected, ⛔ NOT closed, ⛔ NOT "answered in the negative". Their QUESTIONS CEASED
TO EXIST** — the `2026-08-24-159` precedent: *"(a) did not become wrong, its QUESTION ceased to
exist"* ([[feedback_closure_language_precision]]).

All three existed **only** because `-174` cl.3 appeared to put contributor names under a staged
disappearance. `-175` corrected that, Panel-ratified: the staged reduction is the **nominee bank
fields'**. ⇒ there is ⛔ no name schedule, so there is ⛔ nothing to order against (**D14-order**),
⛔ no substrate to share (**D12-schedule**), and ⛔ no masked name state to define (**D13-maskedname**).

⚠ **And the ratified per-Pariwar ladder** — `full_name` → `shielded_name` → omitted — ⛔ was **never
adopted** for this surface by `-174`, and is ⛔ **not** adopted by `-175` either. It remains what it
always was: the **Member Directory's** presentation mode (`2026-08-19-136` cl.1-3, `2026-08-21-145`
cl.3). ⛔ Do ⛔ not reach for it here.

<details><summary>⛔ The question as originally put (kept as the record — ⛔ not deleted)</summary>

**May `contributor_name` be declared at `public` on `sahyog-vivran`, and in what FORM?**
⏳ Routed 2026-08-30 — Q1 (declaration) · Q2 (form) · Q3 (are basis and form independent?).

</details>

### ✅ D3 — **RULED by the Trustee Panel, 2026-09-02** (Kalpana Bharti, Dhiraj Rahul) — **(b): YES, at the FULL NAME**

⭐ **Transcribed at `.decision-log.md#decision-2026-09-02-173`.** The packet
(`trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md` §10) carries the answers:
**Q1 YES** · **Q2 FULL NAME** · **Q3 the BROAD clause scope**, ✅ confirmed **in discussion**,
⛔ **written instrument OUTSTANDING**.

⇒ the `matrix.ts:401-402` fence is **satisfied for `sahyog-vivran`**, and **AC2's
`sahyog-vivran.deceased_member_name` entry is authorised**, citing `2026-09-02-173`.

⚠⛔ **FOUR THINGS THE RULING DOES ⛔ NOT DO — ⛔ do not over-read it:**
1. ⛔ **It does ⛔ not unblock this story.** **D2** is ⏳ still open; Task 0's STOP gate holds.
2. ⛔⛔ **It does ⛔ not make a name render.** The clause row must exist and be pinned. ⛔ **No
   placeholder** (`public-read.ts:171-175`).
3. ⛔ **It does ⛔ not ratify D10** — a different surface. 11b.1 item (e) stays *"authorised, ⛔ NOT
   made"*, and **D9** is untouched. ⚠ The **inversion is now WIDER**: the public side names the member
   in full on **two** surfaces while the member app shields them on three. The Panel ruled with that
   fact in front of them (§6 of the note).
4. ⛔ **It does ⛔ not reach 11b.6 (In Memoriam)**, fenced by the same sentence.

⚠ **The GROUNDS were ⛔ not relayed and are ⛔ not reconstructed.** ⛔ Do ⛔ not cite this story as
having adopted D10's grounds (1) and (3) — the relay carried the answers, ⛔ not the reasoning
([[feedback_record_unattested_no_backfill]]).

⚠ **AC2 declares BOTH names in ONE commit, and only one is ruled** → **D11-order** below.

<details><summary>⛔ The question as originally put (kept as the record — ⛔ not deleted)</summary>

**Does `sahyog-vivran.deceased_member_name` get an allowlist entry, and in what form?**

⭐ **A NEW FINDING of the 2026-09-01 authoring pass — ⛔ nothing had recorded it.** `matrix.ts:401-402`
says 11b.3/11b.6 *"keep first-name + last-initial"* and that *"moving them requires each surface's OWN
Panel ruling"* — ⚠ **but keeping a shielded form is not the same act as having an entry**, and the
gate is fail-closed regardless of form (Trap 2). ⇒ as things stand this surface ⛔ **cannot name the
deceased member at all**, beside a `/sahyog` that names them in **full**.

- **(a)** Route at **first-name + last-initial** — the form `matrix.ts` already reserves for this
  surface. ⭐ *Authoring recommendation: the smallest widening, and the one the file contemplates.*
- **(b)** Route at the **full name**, aligning with `/sahyog` D10. ⚠ D10 is **author-ruled and ⛔ NOT
  Panel-ratified**, and 11b.1's own exception rationale flags its comparative ground as ⛔ not to be
  cited for a third surface. ⇒ (b) builds on unratified ground **twice over**.
- **(c)** Ship the surface **un-named** and defer. ⚠ Legitimate and fail-closed — ⛔ but a **choice**,
  ⛔ never a default, and it must be recorded as such ([[feedback_closure_language_precision]]).

⭐ **RULED (b).** ⚠ ⛔ (a) did ⛔ not become wrong — the Panel chose the wider of two authorised forms.

</details>

### ⛔ VACATED 2026-09-02 — **D11-order**

⭐ It asked whether the deceased-member field could land **alone**, ahead of the contributor field,
**because D2 was open**. ⇒ **both** names are now ruled — unconditionally and at the **same form** — so
they land **together** in one commit, as AC2 was always written. ⛔ **VACATED: its question ceased to
exist**, ⛔ it was ⛔ not answered.

⚠⛔ **The §11 timing rule survives it and still binds: field declaration and its allowlist entry land
in the SAME commit.** *"A pre-added entry is a standing permission with ⛔ no subject."*

✅ **THE PACKET NOW EXISTS AND IS ROUTED (2026-09-02):**
`trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`. ⛔ **Written, ⛔ not answered** —
D3 stays open and blocking ([[feedback_closure_language_precision]]).

⭐⭐ **AND THE PACKET SURFACED A THIRD QUESTION THAT CHANGES WHETHER (a) OR (b) IS EVEN BUILDABLE —
`Q3`, THE CLAUSE SCOPE.** Story 11b.9's shipped basis predicate
(`pool/public-read.ts:283-299`) pins the clause id **`niy.public-disclosure.member-information`**
(`:181-183`) — ⚠ a **GENERAL** disclosure clause carried under a constant *named*
`SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`. **The constant's name is surface-scoped; the clause id is ⛔
not.** ⇒ whether a D3 "yes" is **buildable** depends on counsel's clause TEXT, which returned
**2026-09-07**:

| Counsel's clause drafted… | A D3 "yes" is… |
|---|---|
| **narrowly** (the Sahyog Drive index) | ⛔ **unbuildable** — the entry is ruled, the predicate stays false here, the page renders unnamed regardless |
| **generally** (the Trust's public transparency surfaces) | ✅ **live the moment it is pinned**, with ⛔ no further code |

⛔ **Do ⛔ not read a Q1 ruling alone as clearance to build.** ⚠ And ⛔ do ⛔ not "fix" a narrow clause
by pinning a second one, or by seeding a `clause_versions` row — `public-read.ts:171-175` forbids the
placeholder in terms: *"a stand-in makes names render on an authority that does ⛔ not exist."*

### ✅ D9 — RULED **(a)** by BigDev, 2026-09-02 — **CARRY it**

⭐ `2026-09-02-177`. ⛔ **Re-affirmed, ⛔ NOT re-filed** — it stays open at `deferred-work.md` 11b.1 item
**(e)**. ⭐ Ground: resolving it means changing the **MEMBER** app's form (`resolvePoolIdentity`,
`notifications/pool-identity.ts:76`), which is ⛔ not this surface's act and would change 8.6/8.7/8.8.

> ⭐⭐ **UPDATE 2026-09-02 — THE PANEL HAS DIRECTED THAT THE INVERSION BE CLOSED** (`2026-09-02-179`
> cl.3). ⛔ **`D9(a)` IS ⛔ NOT REVERSED, AND THAT DISTINCTION IS LOAD-BEARING:** D9(a) ruled that **THIS
> STORY** does ⛔ not resolve it, because resolving means changing the **MEMBER** app — ⛔ not this
> surface's act. ⭐ The ruling gives the carry a **DESTINATION**; it does ⛔ **not** move the work here.
> ⇒ **D9(a) STANDS**, and 11b.1 item (e) moves from *"carried"* to **DIRECTED TO CLOSE**.
> ⚠⛔ **Two things are OPEN and ⛔ neither is this story's:** **`INV-scope`** — the shielded form is one
> resolver with **FOUR** consumers, and **two leave the app** (the Contribution Note **PDF**, and the
> cycle-open **push/WhatsApp/SMS**); ⛔ splitting them re-creates the *"two different pools"* divergence
> 8.8 moved the resolver to prevent. **`INV-owner`** — ⛔ **no story owns it**; the consumers are Epic
> 8's (8.6/8.7/8.8), and ⭐ a directive naming an **epic** expires unowned.
> ⇒ ✅ **`INV-owner` IS DISCHARGED (2026-09-02):** the work is owned by
> **`8-16-member-pool-identity-name-form-alignment`** (`ready-for-dev`), minted against **Epic 8** on
> the `7-11` precedent.
> ⇒ ✅✅ **AND 8.16's OWN DECISIONS ARE NOW RULED — ⛔ `INV-scope` IS ⛔ NOT OPEN.** `2026-09-02-180`
> ruled it **ALL FOUR** (the My Pool card, the Yogdaan Bahi, the **Contribution Note PDF** and the
> cycle-open **push / WhatsApp / SMS**) ⇒ the inversion **CLOSES**, ⛔ it is ⛔ not narrowed, and the
> resolver's *"one identity everywhere"* property is **PRESERVED**. `2026-09-02-181` then ruled
> **`INV-form` MODE-RESOLVED** — the member side reads the **same stored per-Pariwar mode** the public
> side reads, *"so the two forms can ⛔ never diverge again **BY CONSTRUCTION**."*
> ⇒ ⭐⭐ **8.16 IS FULLY UNBLOCKED AND `ready-for-dev` TODAY**, while this story is gated behind 11b.3
> — ⛔ **expect 8.16 to MERGE FIRST**, and ⛔ do not write this file's state as though it will not
> (AC8 reads item (e)'s current state rather than restating it).
> ⚠⛔⛔ **AND `-181` BINDS THIS STORY'S OWN RENDER — read Trap 6 before Task 2.** A hard-coded full
> name here would re-create the inversion **pointing the other way**, on the very surfaces `-180`
> just aligned.

⚠⛔ **AND IT IS CARRIED AT ITS WIDENED SIZE — ⛔ recorded, ⛔ not left implicit.** After `-173` and
`-174` the **public** side names people **in full on TWO surfaces** (`/sahyog` and `/sahyog-vivran`,
deceased member **and** contributor) while the **member app** shields the same family on **three**
(My Pool card, Yogdaan Bahi, notifications). ⇒ **D7(a) carried it; D9(a) carries it BIGGER.** ⛔ Do
⛔ not record it as unchanged.

<details><summary>⛔ The question as put (kept as the record)</summary>

**Does this story RESOLVE the public/member name inversion, or carry it? (Trap 3, AC8)**

11b.3 ruled **D7(a) carry**, which makes this story the binder.
- **(a) Carry** — re-affirm, ⛔ do not re-file. ⭐ *Authoring recommendation: resolving it means
  changing the **member** app's form (`resolvePoolIdentity`), which is not this surface's act.*
- **(b) Resolve** — out of this story's natural diff, and it would change 8.6/8.7/8.8 behaviour.

</details>

### ✅ D10 — RULED **(a)** by BigDev, 2026-09-02 — ⛔ **NO ROW KEY IS MINTED**

⭐ `2026-09-02-177`. `keyExtractor` is a **FlashList** concern; this surface is **Astro SSR** — static
HTML, ⛔ no virtualization, ⛔ no reconciler, ⛔ no re-render. ⇒ there is ⛔ **nothing for a row key to
be stable FOR**, and minting one would create an identifier this surface does not need on **the
surface where a per-row identifier is most expensive**. ⭐ **Nothing is added.**
⇒ ⛔ not `index` · ⛔ not `member_id` · ⛔ not a new token (11b.2a's D5 vacated `rowKey`).

⚠⛔ **AND STORY 8.3's `keyExtractor` DEFERRAL IS RE-AFFIRMED OPEN, WITH ITS TRIGGER RE-POINTED —
⛔ EXPLICITLY, ⛔ never silently.** Its recorded blocker — *"the PII-shielded shape carries no stable
per-member identifier"* — is **still true** and D10(a) supplies none. ⛔ **NOT discharged here.**
⭐ **The trigger MOVES** from *"reused for the Epic 11b public render"* — which this surface proves is
⛔ **not** the scale case, because SSR has no key at all — **to *"the first VIRTUALIZED render of a
multi-pool contributor list."*** ⚠ **AC8 required this be explicit and cite its ruling; `-177` is that
ruling** ([[feedback_closure_language_precision]]).

<details><summary>⛔ The question as put (kept as the record)</summary>

**What is the stable per-row key? (Trap 4, AC5)**

⛔ Not `index` (the 8.3 defect). ⛔ Not `member_id` on a public wire (an enumeration primitive, refused
in terms by 11a.3's handler). ⚠ `rowKey` was **vacated** by 11b.2a's D5 and ships nowhere.

⚠⭐ **AND THE PRIOR QUESTION IS ASKED FIRST, BECAUSE THE OBVIOUS ANSWER MAY BE "NONE".** `keyExtractor`
is a **FlashList** concern. This surface is **Astro SSR** — it emits static HTML with ⛔ no list
virtualization, ⛔ no reconciler and ⛔ no re-render, so there is ⛔ **nothing for a row key to be
stable FOR**. ⇒ inventing one to satisfy the 8.3 deferral's wording would mint an identifier this
surface does not need, on the surface where a per-row identifier is most expensive.

- **(a)** ⭐⛔ **NO ROW KEY IS MINTED. The 8.3 deferral is RE-AFFIRMED OPEN and its re-trigger
  RE-POINTED** — Astro SSR is ⛔ not the scale case the deferral was waiting for, and the trigger moves
  to *"the first VIRTUALIZED render of a multi-pool contributor list"*. ⭐ *Authoring recommendation:
  it is the only option that adds nothing and states the truth.* ⚠ It must be recorded as a **ruling**,
  ⛔ never as the deferral quietly evaporating ([[feedback_closure_language_precision]]).
- **(b)** A per-render **opaque positional key** scoped to the page — ⛔ stable within a page, ⛔ not
  across pages; ⚠ and it does ⛔ not discharge the 8.3 mobile deferral either, so it buys the cost of
  (c) with the outcome of (a).
- **(c)** Mint a **stable non-identifying row token** on the wire — ⚠ reopens what 11b.2a's D5 vacated,
  and a per-row stable token on a public surface is an **enumeration primitive** unless it is
  per-render salted. ⛔ Not free, and ⛔ not needed by anything on this surface.

</details>

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- ⛔ **`@twt/ui` stays React-free**; its dependency list stays **exactly `@twt/contracts`**. That
  headlessness is what lets **one** presenter serve the RN bundle **and** an Astro surface without
  either dictating to the other ([[project_contracts_domain_bundle_boundary]]).
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces** — it leaks `pg`
  into the RN Metro bundle.
- ⛔ **The auth boundary lives at the API** (`architecture.md:504-517`). ⛔ No `Astro.cookies` /
  `Astro.request.headers` / `Astro.session` on this surface; ⛔ no `isAuthenticated` prop on
  `<AuthenticatedFragment>` ([[project_no_browser_member_token_surface]]).
- ⚠ **Type-only → value import** materializes a module-init cycle that breaks **consuming** packages at
  runtime while typecheck/lint/local tests stay green ([[project_type_only_import_cycle_trap]]) —
  ⭐ **directly relevant**: this story adds a new cross-package import edge (`apps/public` → `@twt/ui`).
- ⛔⛔ **THE TIER-1 DECRYPT HAPPENS AT `apps/api`, BOUNDED — and this is the epic's most expensive
  page.** Envelope encryption gives every stored name its **own DEK** ⇒ **one KMS round-trip per row**,
  **50 + 1** at the page cap. ⛔ `apps/public` gains ⛔ no KMS capability: *"the KEK is shared across
  EVERY Tier-1 field class"* (`2026-08-20-143` cl.1), so the capability for one class is the capability
  for all. ⭐ Reuse `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY` — ⛔ never a second bound.
- ⭐⛔ **THE PUBLIC NAME FORM IS STORED CONFIGURATION, ⛔ NOT A LITERAL** — `-136` cl.1 makes a build
  whose form cannot change without a code change **FAIL** the clause, `/sahyog` already resolves
  through it (`sahyog-render.ts:213`), and `-181` put the **member** side on the same mode. ⛔ A
  hard-coded form here is the one remaining way to re-open the inversion (**Trap 6**).

### Testing standards

- **Test through the pure render module**, ⛔ not the `.astro` file.
- ⭐ **Call `t()` for real, in both locales, for all ten refs** — namespace in the **third** slot, on
  the `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:21,141` mount-free pattern. ⛔ Do
  ⛔ not assert *around* `t()` by reading locale JSON from disk: that is the 11a.2 defect shape, the
  ground *"no mount"* was found **false**, and this exact obligation already survived a **circular
  deferral** once.
- **Prove the allowlist gate with a planted violation** — add an unruled Tier-1-at-public field, watch
  it fail, revert, confirm green; record the revert-sanity
  ([[feedback_gate_scope_semantic_coverage]]).
- **Test the `unknown` arm reaches the `try/catch`** — ⚠ it has been **un-attested / unexercised**
  since 11b.2 precisely because no producer could reach it; ⭐ **this story's producer can**, so the
  arm stops being un-attested here ([[feedback_record_unattested_no_backfill]]).
- ⚠ **`ci:local`**: `integration-tests` concurrency `=1` is **LOAD-BEARING**
  ([[project_ci_local_concurrency_oversubscription]]).

### Previous-story intelligence (11b.2 / 11b.2a / 11b.2b)

- ⭐⭐ **The circular deferral** — 11b.2 and 11b.2b each routed the same `t()` obligation to the other;
  five single-story review passes let it through because the loop is only visible with both files
  open. ⇒ ⛔ **when routing to a sibling, name the sibling AND the artefact, and ⛔ never route to a
  story that routes back.**
- ⭐ **11b.2's presenter emits PARTS and never joins them** (D9(a)) — that is load-bearing for D2 being
  still open, and this story is where the join finally happens.
- ⭐ **11b.2a's D6(a) DELETED the anonymized presenter variant** — *"a render arm that never fires is
  dead code."* ⛔ Do not reintroduce one for RTBF; RTBF **omits the row**.
- ⚠ **11b.2b's second pass shipped a whole-surface crash in its own diagnostic**, and its `try/catch`
  *"didn't guard everything it claimed to."* ⇒ ⛔ verify the guard's **scope**, not its presence.
- ⚠ **Concurrent review agents mutate the tree** — re-check `git status` after parallel passes.

### Project Structure Notes

| Path | New / Update |
|---|---|
| `apps/public/package.json` | **UPDATE** — add `@twt/ui` (⭐ this story's act, ⛔ not 11b.3's) |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — two fields + two exception blocks |
| `packages/contracts/src/public-pages/matrix.ts` | **UPDATE** — two allowlist entries, ⛔ nothing else |
| `apps/public/src/components/ContributorList.astro` (or similar) | **NEW** — the render layer |
| `apps/public/src/lib/sahyog-vivran-render.ts` | **UPDATE** — the row adapter + the name join + ⭐ the **amount-raised** consumption (D1(b)) |
| `packages/contracts/src/public-pages/sahyog-vivran.ts` | **UPDATE** — ⭐ add `rosterSize` + `fixedAmount` for the presenter (D1(b)); 11b.3 left room deliberately |
| `packages/i18n/locales/{en,hi}/sahyog-vivran.json` | **UPDATE** — ⛔ surface-minted copy ONLY; the ten `contributor_list.*` keys stay in `contribution.json` |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — also flips `paginated` `false` → `true` |
| `apps/api/src/modules/public-pages/handlers.ts` | **UPDATE** — the **bounded Tier-1 decrypt** (`mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY`) + the **mode-resolved** name form; basis gate **before** the decrypt |
| `apps/api/src/modules/public-pages/routes.ts` | **UPDATE** — the header defence, now paginated + PII-bearing (D11). ⚠ **11b.3a rewrites the same header in parallel — EXTEND, ⛔ never overwrite** |
| `apps/api/tests/integration/login-wall.spec.ts` | **UPDATE** — the same control count as the header |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | **UPDATE** — annotate `:1287-1298` (AC6) |
| `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md` | ✅ **WRITTEN 2026-09-02** — ⛔ the RULING it seeks is still open |
| ⛔ `packages/ui/` | ⛔ **NOT TOUCHED** — the presenter is consumed, ⛔ not changed |

### References

- [Source: `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md` — §1 (the two separable questions) · §2 (the two entries, ⛔ neither a contributor) · §4 (the inference, offered ⛔ not ruled) · §5 (the asymmetry table) · §6 (the THREE assuming documents) · §9 (Q1/Q2/Q3) · §10 (the inversion)]
- [Source: `packages/contracts/src/public-pages/matrix.ts:174-199` (fail-closed both ways) · `:388-391` (*"the gate failing is the gate working"*) · `:392-404` (the two entries) · `:401-402` (the 11b.3/11b.6 fence)]
- [Source: `packages/contracts/public-pages/public-vs-private-matrix.yaml:60` (`pii_tier` is a FACT about the data)]
- [Source: `.decision-log.md#decision-2026-08-30-168` cl.4 (D7-nameform) · cl.6 (D9(a) — parts, never joined) · `#decision-2026-08-30-169` (RTBF omits entirely) · `#decision-2026-08-31-170` (the guarantee is on the plaintext; ⛔ no per-row re-check) · `#decision-2026-09-01-172` (RTBF ends at the wire)]
- [Source: `.decision-log.md#decision-2026-08-23-154` cl.6 (C-1 — the ordinary dependency addition) · `.decision-log.md:1734` (⛔ there was no declination)]
- [Source: `packages/ui/src/contribution-list/` · `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` (built-to, ⛔ not ratified)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.2 items (i) (ii) (iii) · 11b.1 items (e) (f) · the `keyExtractor` re-trigger correction]
- [Source: `_bmad-output/implementation-artifacts/11b-3-…md` (the host surface, AC2's Tier-1 count test) · `11b-3a-…md` (the sibling; ⛔ different subject, same `.decision-log.md` head)]
- Memory: [[project_contribution_row_render_layer_substrate]] · [[project_epic9_confirmed_producer_is_live]] · [[project_no_browser_member_token_surface]] · [[project_11b_consent_model_c5_superseded]] · [[project_uset_fresh_closure_memo_trap]] · [[feedback_circular_deferral_between_sibling_stories]] · [[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]] · [[feedback_record_unattested_no_backfill]]

---

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-09-02 | **Second combined validation of 11b.3 / 11b.3a / 11b.3b.** Six fixes, and ⭐⭐ **the two sharpest are NEW — created by rulings that landed after this file was last validated.** **(1) `-173`/`-174` rule a CEILING, ⛔ not a literal** (new **Trap 6**): `-136` cl.1 fails any build whose public name form cannot change without a code change, `/sahyog` already resolves through the stored per-Pariwar mode (`sahyog-render.ts:213`), and **`-181` just put the MEMBER side on that same mode** — so a hard-coded full name here re-creates the inversion **pointing the other way** for a Pariwar set to `shielded_name`, on the surface with the widest reach. **(2) The mononym path**: `resolvePublicMemberName` returns `''` and every caller omits the row — here indistinguishable from an RTBF omission — and ⛔ falling through to `firstName` publishes the whole stored legal name (`public-name.ts:84`). **(3) The Tier-1 DECRYPT was never mentioned**: names are ciphertext, one KMS round-trip per row, **50 + 1 per page** — while 11b.3a, whose page costs **at most eight**, documents the bound and the `apps/public`-no-KMS fence. **(4)** The `epics.md` fold now **verifies item (iii) landed and writes it here if not** — 11b.3 merges first. **(5) `INV-scope` is ⛔ no longer open** (`-180` ALL FOUR · `-181` MODE-RESOLVED); 8.16 is `ready-for-dev` **today** and will likely merge first, so AC8 **reads** item (e)'s state rather than restating *"the member app shields on three"*. **(6)** `matrix.ts:401-402`'s fence comment goes **false** when these entries land and is amended in the same commit — ⛔ keeping the 11b.6 fence standing. |
| 2026-09-02 | ⭐⭐ **THE PANEL DIRECTED THAT THE PUBLIC/MEMBER INVERSION BE CLOSED** (`2026-09-02-179` cl.3) — 11b.1 item (e) moves from *"carried"* to **DIRECTED TO CLOSE**. ⛔ **`D9(a)` is ⛔ NOT reversed:** it ruled that **this story** does not resolve it, and the ruling supplies a **destination**, ⛔ not a relocation of the work here. ⇒ **D9(a) stands.** ⚠⛔ Two OPEN and ⛔ neither this story's: **`INV-scope`** (the resolver has **four** consumers; **two leave the app** — the Contribution Note **PDF** and the cycle-open **push/WA/SMS** — and splitting them re-creates the *"two different pools"* divergence 8.8 prevented) and **`INV-owner`** (⛔ no story owns it; Epic 8 owns the consumers, and a directive naming an epic expires unowned). |
| 2026-09-02 | ✅ **D9(a) + D10(a) RULED by BigDev** (`2026-09-02-177`) ⇒ ⭐⭐ **THIS STORY NOW HAS ZERO OPEN DECISIONS.** **D9(a)** carries the public/member inversion — ⛔ re-affirmed, ⛔ not re-filed — ⚠ **at its WIDENED size**: the public names in full on **two** surfaces while the member app shields on **three**. **D10(a)** mints ⛔ **no row key at all** — Astro SSR has no reconciler, so a key would be an identifier with no consumer — and Story 8.3's `keyExtractor` deferral is **RE-AFFIRMED OPEN** with its trigger **RE-POINTED** to *"the first VIRTUALIZED render of a multi-pool contributor list"*, ⛔ explicitly and citing the ruling, ⛔ **not discharged**. |
| 2026-09-02 | ⭐ **THIS STORY GAINED AN OBLIGATION: the AMOUNT-RAISED render (new `AC3b`).** BigDev ruled **`D1(b)`** on 11b.3 (`2026-09-02-176`) — consume the shipped canonical `amountRaisedInr` — ⛔ and did ⛔ **not** lift the `@twt/ui` fence for 11b.3, so **the amount MOVES here**, to the story that adds the dependency. ⚠ A real **scope addition**, ⛔ not a clarification: the DTO gains `rosterSize` + `fixedAmount`, `daysRemaining: 0` is supplied for non-`live` pools, and ⛔ **only** `amountRaisedInr` is authorised — the presenter's progress meter is ⛔ **not** (completion framing on a settled drive needs its own decision). ⭐ Also closes the interim count-only asymmetry 11b.3 ships with — ⛔ ordering, ⛔ not a second inversion. |
| 2026-09-02 | ⚠⭐ **`-174` cl.3 CORRECTED, Panel-ratified** (`2026-09-02-175`) — the *"progressive reduction of public exposure"* is the **NOMINEE BANK fields'** (`-160` cl.10's own subject, which already includes the *nominee's* name) and does ⛔ **not** reach a contributor's or the deceased member's name. BigDev identified it and put the correction **back to the Panel**, who ratified it. ⇒ **Q1/Q2 stand UNCONDITIONALLY**; the **STOP GATE IS LIFTED**; and **D14-order · D12-schedule · D13-maskedname · D11-order are VACATED** — ⛔ their questions ceased to exist, ⛔ they were not rejected. ⛔ `-174` is ⛔ not edited. ⭐ Caught between transcription and implementation ⇒ **zero rework**. ⚠ Still open: **D10** (AC5 depends on it) · **D9**; and the deceased-member name still will ⛔ not render until counsel's clause is pinned. |
| 2026-09-02 | ✅ **D2 RULED by the Trustee Panel** (Dhiraj Rahul, Kalpana Bharti) — contributor name **YES**, at the **FULL NAME**; transcribed `2026-09-02-174`. ⭐ Q2 **overturned** the standing practice: three epic ACs **and** the shipped wire all assumed first-name + last-initial, and §6 of the note existed to make exactly that outcome possible. ⚠⛔ **Q3 EXTENDED `-160` cl.10's staged schedule from bank fields to a PERSON'S NAME** — full while current, then progressively reduced, then hidden. ⛔⛔ **No story builds that**, so the STOP gate **holds on the new `D14-order`**: may full names ship before the disappearance exists? Also raised: **D12-schedule** (shared substrate with 11b.3a — a policy question) and **D13-maskedname** (what "masked" means for a name; the ratified ladder is the analogue but is ⛔ not adopted). |
| 2026-09-02 | ✅ **D3 RULED by the Trustee Panel** (Kalpana Bharti, Dhiraj Rahul) — **YES**, at the **FULL NAME**; transcribed `2026-09-02-173`. ⚠⛔ **Task 0's STOP gate HOLDS — D2 is still open**, and ⛔ one of two rulings is ⛔ not "the rulings". ⛔ **And a ruling is ⛔ not a render:** counsel confirmed the broad clause scope **in discussion** only; until the `clause_versions` row exists and is pinned the surface stays **inert by design**, and ⛔ **no placeholder row** may be seeded. New decision **D11-order** raised: may the deceased-member field land alone, ahead of the contributor field? |
| 2026-09-02 | **The D3 packet is WRITTEN AND ROUTED** — `trustee-panel-routing-note-2026-09-02-11b3b-deceased-name-form.md`. ⛔ Task 0 stays a STOP gate: the packet is written, D3 is ⛔ not answered. ⭐ The packet surfaced a **third question (Q3, the CLAUSE SCOPE)**: 11b.9's basis predicate pins `niy.public-disclosure.member-information` — a **general** clause under a Sahyog-Drive-*named* constant — so whether a D3 "yes" is **buildable** turns on counsel's clause text (returned 2026-09-07), ⛔ not on the ruling alone. |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b.** Six fixes, the sharpest being AC7's namespace: all ten `CONTRIBUTION_LIST_I18N_REFS` resolve in **`contribution`**, ⛔ not `sahyog-vivran` — pointing them at this surface's namespace would have opened a **third** instance of the 11b.2↔11b.2b circular deferral wearing a green run. Also: this story flips `paginated` and makes the third route PII-bearing, so it now owes `routes.ts` + `login-wall.spec.ts` their update (11b.3's **D11**); **D10 gains option (a)** — Astro SSR needs no row key at all; AC6 now names the **buildable** columns; `resolvePublicMemberName`'s path corrected to `kyc/public-name.ts:73`. |
| 2026-09-01 | Story created by the D6(b) three-way split of Story 11b.3 (ruled by BigDev, 2026-09-01). ⭐ Carries **BOTH** named-identity questions — the contributor list (**D2**, Panel, routed 2026-08-30) and the deceased member's name (**D3**, a **new finding** of the authoring pass, ⛔ no packet yet). That pairing is what lets 11b.3 ship with **zero Tier-1 fields** and no Panel dependency. Task 0 is a **STOP gate**; stopping on a first pass is the expected outcome. |
