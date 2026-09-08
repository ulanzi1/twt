---
baseline_commit: 4b5e83b3
---

<!--
⭐ BASELINE — `governance(11b.15): D1 RULED`. Carries decisions `2026-09-04-186` … `-198`,
Story 11b.10 closed, and stories A–E `ready-for-dev`.

⚠⛔ RE-PINNED at the 2026-09-08 validate: the previous pin `2b2beb5e` was ⛔ NOT an ancestor of HEAD —
it survives only on `story/11b-10-unguessable-address-and-inbound-path`, which was rebased. `4b5e83b3`
is the SAME commit on the main line (byte-identical tree `36efae74…`), so ⛔ no content baseline moved.
⭐ The same defect the 11b.10 branch already repaired once at `106e9ffc`. ⚠ ALL SEVEN 11b split stories
carry off-main-line pins — recorded here, ⛔ not fixed here.
-->

# Story 11b.16: The Member Sees the Pariwar's **CONFIGURED NAME FORM** — Consistently, Across the App `[CONSUMER]`

Status: ⛔ **WITHDRAWN** (Decision `2026-09-08-208` cl.1) — ⛔ terminal. The work is owned by
`8-16-member-pool-identity-name-form-alignment`, which came FIRST and is ruled WIDER.
⚠⛔ **⛔ DO ⛔ NOT RUN `dev-story` AGAINST THIS FILE.** ⚠ `sprint-status.yaml` still reads
`ready-for-dev` — ⛔ knowingly, ⛔ not by oversight: there is no `withdrawn` enum value and minting one
is a **ratified governance act** (`-208` cl.7). ⭐ This line is the true record.
⏳ **ROUTED 2026-09-08** —
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-08-sprint-status-withdrawn-enum-mint.md`.

> ⛔⛔ **WITHDRAWN 2026-09-08 — KEPT AS THE RECORD, ⛔ NOT DELETED.**
>
> ⭐ **Why.** `8-16` was minted **2026-09-02** by Panel direction (`-179` cl.3) and owns
> `resolvePoolIdentity` and all four of its consumers. This story was authored **2026-09-04** and
> ordered the same edits at a **narrower** scope. ⇒ ⛔ **withdrawn in favour of** `8-16`; ⛔ ⛔ not
> *superseded* (8.16 came first) and ⛔ not *deferred* (the work ships).
>
> ⭐ **Nothing is lost.** Seven of its nine ACs dissolve into `8-16` at **equal or wider** scope.
> **AC3** (the shielded push) ⛔ dies **correctly** — it reversed Trustee-ratified `-180` cl.1.
> **AC9** was already `8-16`'s Task 6 under `-180` cl.2.
>
> ⭐ **What it contributed, and where it went** (`-208` cl.3, cl.5, cl.6):
> `-198` **cl.1** (FORM ONLY — the basis is ⛔ not adopted) → **`8-16` AC4b** ·
> `-189` **cl.3** proven in **both** directions → **`8-16` AC4b** + Task 4 ·
> `-195` **cl.1** compliance statement → **`8-16` AC4b** ·
> the `epics.md:5128` range + the `11b-11:818` F/G mis-keying → **`8-16` Task 0** ·
> the sequencing (*"before E"*) → **`8-16` before `11b-15`**.
>
> ⚠⛔ **AND THE ONE THING THIS STORY GOT RIGHT THAT `-198` GOT WRONG:** its Preflight named
> `-198`'s push carve-out as a reversal of a **Trustee-ratified** clause. `-208` **cl.2** makes that
> formal — the carve-out is ⛔ **VOID**, ⛔ not superseded.
>
> ⭐ The 2026-09-08 validate findings below are ⛔ **not** discarded — they are what produced `-208`.
> ⛔ Read them as the record of why this story ended, ⛔ not as work to do.


> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST** — and ⚠ `epics.md:5128` names the key **`11b-16` as story F**,
> inside a range that says the split is **six** stories. It is **seven**, and `11b-16` is **G**; **F is
> `11b-17`**. ⇒ Task 0 owes an `epics.md` **ANNOTATION** *and* a correction to that range.
>
> ⛔⛔ **IT RUNS BEFORE STORY E** (`-198` cl.2). ⭐ The name form changes **first**, so E's new list is
> built into a codebase that is ⛔ already consistent. ⛔ E must ⛔ never ship a name form the My Pool
> card contradicts, ⛔ not even briefly. ⭐ E corroborates: `11b-15` Task 7 — *"⛔ Confirm story G has
> landed or is landing alongside"*.
>
> ⚠ **⛔ NOT BLOCKED by A/B/C/D** — ⛔ **but it is ⛔ NOT startable.** See the Preflight.

---

## ⛔⛔ PREFLIGHT — ⛔ TWO STOP CONDITIONS, CHECKED BEFORE TASK 0's FIRST LINE

⚠⛔ **These are ⛔ NOT mid-AC caveats. Each is a STOP: it is answered by BigDev, or this story does
⛔ not start.** ⭐ Both were found at the 2026-09-08 `validate` pass by three independent verifiers.

### ⛔ STOP 1 — A `ready-for-dev` STORY ALREADY OWNS THIS WORK, AND IT IS ⛔ NOT NAMED ANYWHERE HERE

⭐ `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md` —
**Status: `ready-for-dev`** (`sprint-status.yaml:16501`), 457 lines, *"Member-Facing Pool Identity —
Name-Form Alignment (**closing the public/member INVERSION**)"*.

⛔ Its Decisions section reads *"✅ **ALL RULED.** `INV-scope` **ALL FOUR** (`-180`, Panel) ·
`INV-form` **MODE-RESOLVED** (`-181`, BigDev). ⛔ **ZERO OPEN.**"* ⇒ it owns `resolvePoolIdentity`, the
same four consumers, the same contract shape, and its stop gate is **discharged**.

⚠⛔ `-197`, `-198`, story **G** and story **E** contain **ZERO** references to `8.16`, `-179`, `-180`
or `-181`. ⇒ ⭐ **the 11b split was authored in ignorance of an already-ratified programme.**

⇒ ⛔ **STOP.** One story does this work, ⛔ not two. BigDev rules which: 11b.16 **supersedes** 8.16,
is **absorbed by** it, or is **withdrawn**. ⭐ The answer is a `.decision-log.md` entry and a
`sprint-status.yaml` flip — ⛔ never a story note.

### ⛔ STOP 2 — AC3 REVERSES A **TRUSTEE-RATIFIED** RULING, ON **AUTHOR-COMMITTED** AUTHORITY

⭐ `.decision-log.md#decision-2026-09-02-180` — **Decision type: Trustee-ratified. Status: RATIFIED.
Ratifying trustees: Kalpana Bharti, Dhiraj Rahul.** cl.1:

> *"The deceased family's **full name** renders on **every** consumer of `resolvePoolIdentity`:
> ① the My Pool card · ② the Yogdaan Bahi · ③ the Contribution Note PDF · ④ the **cycle-open push /
> WhatsApp / SMS** copy. ⇒ ⛔ **no consumer is excluded**, and ⛔ **no split is authorised.**"*

and, in its Context: *"⛔ **a future story that splits them is reversing this entry, ⛔ not
optimising.**"*

⚠⛔ The Panel was asked **this exact question**. `trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md`
put option **(c)** — *"all except the push (④)"* — to them verbatim, with the lock-screen argument in
Appendix A. ⭐ **They declined it and ruled ALL FOUR.**

⛔ The authority this story relies on, `-198`, is self-labelled at `.decision-log.md:1204`:
**"Decision type: Author-committed (BigDev). ⛔ Not Trustee-ratified."** ⛔ It never names `-180`.

⇒ ⛔ **STOP.** ⭐ Route to the Panel: *does `-198`'s push carve-out supersede `-180` cl.1, or does the
push rise with the screens?* ⛔ Until answered, AC3 is a **STOP gate, ⛔ not an AC** — and Task 6's
push assertion would **pin the reversal in a test** ([[feedback_supersede_never_reinterpret]]).

---

## Story

As a member,
I want the person a drive is for to be named the same way everywhere I look in the app,
so that I am not shown an initial on one screen, a fuller name on another, and something different
again from what a stranger can read on the public website.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed. ⛔ No
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed.

⚠⛔ **BUT IT IS A DISCLOSURE CHANGE AND ⛔ MUST NOT READ AS COSMETIC.** In the member's own terms:
⭐ **"On a drive where no valid `tc_acceptance` consent pins the posthumous-publication clause, a
member will now see the full legal name where they previously saw a first name and an initial."**
⭐ The ground (`-198` cl.1): the publication basis governs **publication to the WORLD**, ⛔ not what a
mutual-aid group is told about the family it is being asked to help. ⛔ Anyone reversing this reverses
**that sentence**.

⚠⛔ **⛔ THE OLD WORDING WAS A SUPERSEDED BASIS AND IS ⛔ NOT RESTORED.** This note previously read
*"a drive whose family did not consent to public publication"*. ⛔ **The family's tick-box is
de-authorised** — `2026-08-28-160` cl.5/cl.6; `public-read.ts:202-204`: *"the basis … is the member's
OWN accepted versioned T&C, ⛔ never a tick-box the family ticked at claim time … this constant is
⛔ NOT consulted"*, and `:323` — *"⛔⛔ **THE FAMILY'S DECLINE PATH IS GONE ON PURPOSE** … ⛔ A later
reader must ⛔ not restore it as a 'missing feature'."* ⚠ `-197`/`-198` carried the stale phrasing
forward uncorrected, and `deferred-work.md:984` still repeats it — ⭐ three sources agreeing with each
other and ⛔ **disagreeing with the code**.

⭐ **CHECKED AGAINST THE NIYAMAVALI — RESULT: ⛔ NOT CONTRADICTED, AND ⛔ NOTHING BINDING FOUND.**
The nearest material is `niyamavali-amendment-draft-2026-08-24-drive-record-consent.md` **Amendment 1**
(§4.4): *"The deceased member is named on that record **only where the claim-time consent at Part 10
has been given**"*. ⛔ It does **not** bind — its own header reads **"⏳ DRAFTED, ⛔ NOT RATIFIED AND
NOT APPLIED"**, and it governs the **public** Sahyog Drive record, ⛔ not the member app; ⛔ and it
predates `-160`'s de-authorisation of the very consent it names. ⚠ It transcribes **Deed cl.15(c)**
(*"Public rendering of any member … [rests on] revocable, purpose-specific consent"*) — ⭐ read
**"public"** literally: an authenticated member surface is ⛔ not a public rendering, which is exactly
`-198` cl.1's ground. ⛔ The Deed text is a transcription in a planning artifact; the corpus itself is
in a private repo ([[project_legal_corpus_private_repo_split]]).

## 🎯 What already EXISTS — ⭐ re-verified live at HEAD `091c3bfe`, 2026-09-08

⚠⛔ **The previous table was dated 2026-09-04 and marked *"verified live"*. ⛔ THREE OF ITS SEVEN
ANCHORS HAD DRIFTED** — story D (11b.14) rewrote those files after the pin. ⭐ Sibling D warned of
exactly this (`11b-14:130`). ⇒ ⛔ do not re-date this table without re-reading it.

| Fact | Where (⭐ re-anchored) | Verified |
|---|---|---|
| The public wire carries **ONE** name field, in the configured form | `contracts/.../sahyog-drive.ts:130` `deceasedMemberName` — doc-block `:125-129`: *"the Pariwar's configured form (`full_name` is the **DEFAULT, ⛔ not a constant**)"* | ⭐ read |
| ⛔⛔ …and it says so itself: | same doc-block `:128` — *"⛔ **NEVER through `resolvePoolIdentity()`, which hard-codes the shielded form**"* | ⭐ read |
| The public name is **also** gated by the publication **BASIS** | `domain/src/pool/public-read.ts:380-397` `NAME_PUBLICATION_AUTHORISED` (⛔ **not** `:512`, which is `DECEASED_DISTRICT`) | ⭐ read |
| ⛔⛔ The shielded pair lives in the **CONTRIBUTIONS** contracts, ⛔ NOT in `sahyog-drive.ts` | `active-contribution-card.ts:124,130` · `contribution-history.ts:73,77` · `contribution-note.ts:118,120` | ⭐ read |
| ⛔⛔ `member-pool/pool-identity.ts` **DELEGATES to `notifications.resolvePoolIdentity`** | `member-pool/pool-identity.ts:60-74` | ⭐ read |
| ⛔⛔ **FOUR consumers, THREE risk classes** (⭐ complete — `-180` note §2 confirms no fifth) | `handlers.ts:630` + `:835` · `contribution-note.ts:144` · ⛔ **push** `contribution-notify-triggers.ts:683` | ⭐ read |
| The three in-API consumers differ on `null` | *"the card and the passbook treat `null` as omit; the Note treats it as a **404**"* (`member-pool/pool-identity.ts:55-58`) | ⭐ read |
| A push with no name is **skipped LOUDLY** | `contribution-notify-triggers.ts:679-681`, skip at `:694-701` | ⭐ read |
| ⭐ **THE CONFIGURED MODE'S SUBSTRATE** — never named by the old draft | table `pariwar_public_name_presentation.mode` (`migrations/0110…sql:34-39`; schema `:50-63`); reader `kyc.resolvePublicNamePresentationMode(db, pariwarId)` (`presentation-policy.ts:63-70`, absent row → `'full_name'`) | ⭐ read |
| ⭐ …and it is **already reachable** from the member path | `notifications/pool-identity.ts:22` already imports `* as kycDomain`; `kyc/index.ts:27` re-exports `presentation-policy.js` ⇒ ⛔ **no new dependency edge**. RLS is plain per-tenant on `app.pariwar_id` (`0110…sql:64-65`) | ⭐ read |
| ⚠ …but it has **two production readers today, both PUBLIC** | `public-pages/handlers.ts:170`, `:364` — resolved **once per request, ⛔ never per row** | ⭐ read |

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ THE RESOLVER FEEDS **OUTBOUND PUSH**. ⛔ ITS DEFAULT IS GOVERNED BY `-180`

`resolvePoolIdentity` is ⛔ **not** a member-app helper — the member-pool one **delegates to the
notifications resolver**, which `apps/jobs` calls **directly** at `contribution-notify-triggers.ts:683`,
bypassing the API wrapper entirely.

⇒ ⛔⛔ **a one-line change to the shared resolver's default would put a FULL LEGAL NAME into an
SMS/WhatsApp push** — onto a lock screen, into a telecom log, forwardable. ⭐ **The mechanism is real
and verified.**

⚠⛔ **⛔ WHAT IS CONTESTED IS THE CONCLUSION, ⛔ NOT THE MECHANISM.** `-198` follow-up (i) recommends
the push keeps the shielded form; **Trustee-ratified `-180` cl.1 ruled the opposite and forbade the
split** (Preflight STOP 2). ⛔ Do ⛔ not implement either arm before that is answered. ⚠ The Panel had
the SMS argument in front of it: *"the full name lands in an **unencrypted SMS** precisely for the
members whose app is not working"* — and ruled ALL FOUR anyway.

### Trap 2 — ⚠ THE CONTRIBUTION NOTE IS A **DURABLE ARTIFACT** — AND IT CARRIES **TWO** NAMES

The Yogdaan Pratigya is *"render-ready"* — a document a member holds — and it **404s** on a null name
because *"a Note with a blank family name is a DEFECTIVE ARTIFACT"*.

⇒ changing its name form changes **the document**. ⚠ Notes rendered **before** and **after** this
story will differ, and ⛔ **nothing re-renders old ones**. ⭐ Recommended: the Note follows the
**in-app** form — ⚠ **state the discontinuity**, ⛔ do not paper over it.

⚠⛔ **⛔ AND THERE ARE TWO NAMES IN THAT DOCUMENT.** `contribution-note.ts:159-161` also resolves the
**contributing member's OWN** name, also shielded, also 404-on-null — surfaced as
`memberFirstName`/`memberLastInitial` (`contracts/.../contribution-note.ts:123-124`) and rendered
through the **same** `familyDisplay` helper (`note-template.ts:144-145`). ⇒ ⛔ **only the DECEASED's
name moves.** ⛔ `resolveOwnName`'s pair stays shielded.

### Trap 3 — ⛔ THE CONTRACT SHAPE ⛔ CANNOT CARRY A CONFIGURED NAME — IN **THREE** CONTRACTS

`ActiveContributionCard` declares `deceasedFirstName: z.string().min(1)` (`:124`) and
`deceasedLastInitial: z.string().max(16)` (`:130`) — **two fields encoding the shielded form in the
CONTRACT**. ⇒ a configured `full_name` does ⛔ not fit.

⚠⛔ **⛔ AND THE IDENTICAL PAIR IS IN TWO MORE**: `contribution-history.ts:73,77` (**the passbook —
which AC1 requires to change**) and `contribution-note.ts:118,120` (**the Note — AC4**). ⛔ Changing
one leaves the other two lying.

⛔⛔ **⛔ THE REAL BOTTLENECK IS UPSTREAM OF ALL THREE.** `ResolvedPoolIdentity`
(`notifications/pool-identity.ts:40-41`) **returns the two parts**, and every consumer joins them
itself. ⇒ threading a `mode` into a resolver whose **return type is two shielded parts** cannot carry
`full_name` honestly.

⚠⛔ ⛔ Do ⛔ **not** "solve" it by stuffing a full name into `deceasedFirstName` and blanking the
initial. ⭐ That leaves a **lying field name** — precisely the class of defect this epic has logged
four times — and ⚠ it is the **cheapest compliant-looking move**, because all three in-app consumers
use a `lastInitial ? … : first` join and would render correctly while the field lies.

### Trap 4 — ⛔ FORM ONLY. ⛔ THE BASIS GATE IS ⛔ NOT ADOPTED

`-198` cl.1: the member path takes the **configured FORM** and ⛔ **not** the publication **BASIS**.

⛔ Adopting the basis would mean a member sees **⛔ NOTHING** on a drive with no basis — ⛔⛔ a
**REGRESSION** from today's always-present first-name + initial, and it would leave the contribution
card unable to say who died **on the screen that asks the member to pay**.

### Trap 5 — ⛔⛔ SHARE THE **MODE**, ⛔ NEVER THE WHOLE FUNCTION — THE MONONYM PATH

⛔ **The obvious implementation of AC1 is the one `-181` forbids by name** (`.decision-log.md:2647`):

> *"⛔⛔ **`resolvePublicMemberName` MAY ⛔ NOT BE REUSED VERBATIM ON THE MEMBER SIDE.** It is the
> obvious move … ⛔ **and it would silently break a member surface.** … ⇒ ⛔ reusing the public
> resolver would turn *'show the family's single name'* into *'omit the pool'* on the My Pool card,
> the Yogdaan Bahi, the PDF and the notification — ⭐ and **mononyms are common in India**, so this is
> ⛔ **not** a corner case. … ⇒ ⛔ **share the MODE, ⛔ never the whole function.**"*

⭐ The mechanism, live: `kyc/public-name.ts:98` — `if (lastInitial === '') return '';` under
`shielded_name`. The member side cannot absorb `''`: `handlers.ts:637` `if (identity === null) return
UNASSIGNED` (**the whole card vanishes**) and `contribution-note.ts:151` → **404**.

⇒ ⚠ **the two surfaces need the same FORM RULE and ⛔ DIFFERENT ABSENCE BEHAVIOUR.** ⛔ And every
existing test stays green through the defect — ⭐ **no fixture is a mononym.**

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 annotates `epics.md` (⭐ story **G**, the **seventh**) **and corrects `epics.md:5128`'s
six-story range**; flips the sprint row; lands in a `governance:` commit before any code.

### AC1 — In-app member screens show the CONFIGURED form
The **My Pool card** and the **passbook/history** read the deceased's name through the Pariwar's
configured presentation mode (`full_name` by default), resolved via
`kyc.resolvePublicNamePresentationMode`.

**And** the member path uses the **same resolved MODE** as the public index for the same drive, while
keeping its **own absence behaviour** — ⛔ a mononym renders the whole stored name, ⛔ **never `''`**
(Trap 5, `-181`).

**And** *"the same name"* is proven as: for the same `(pariwar_id, claim.deceased_member_id)` and the
same stored mode, the member DTO's name field is **string-equal** to `PublicSahyogDriveEntry.deceasedMemberName`
as produced at `public-pages/handlers.ts:522-534` (post-`resolvePublicMemberName`, post-`.trim()`) —
⛔ **not** the rendered `/sahyog` HTML, which wraps it in copy.
⚠⛔ **The two shielded forms differ today by a trailing `.`** — public emits `` `${first} ${initial}.` ``
(`public-name.ts:98`), the member consumers emit no period (`ActiveContributionCard.tsx:102`,
`YogdaanBahiRow.tsx:39`, `note-template.ts:82-84`). ⇒ ⭐ **Task 1 rules which form wins**; ⛔ do not
discover this mid-diff.

### AC2 — ⛔ The BASIS gate is ⛔ NOT adopted
A member sees a name **always**, including where the publication basis is **absent** (Trap 4).
**And** a test asserts a member sees the configured name on a drive with **no** basis, while the
**public** sees ⛔ none — ⭐ the `-189` cl.3 direction, proven.

**And** ⛔⛔ **both fixtures construct the basis through the LIVE mechanism** — `consent_records`
(`consent_type = 'tc_acceptance'`, `subject_id = deceased_member_id`) → `terms_and_conditions_pinned_clauses`
→ `clause_versions` (`niy.public-disclosure.member-information`); helpers at
`packages/domain/tests/integration/_helpers.ts:200,241,267`. ⛔ **A fixture touching
`sahyog_drive_publication` proves nothing** — it is de-authorised and **read-never** (`-160` cl.5).
⚠ The negative half is the DEFAULT state, so it goes green either way; ⭐ **the load-bearing half is
the basis-SATISFIED case in AC1**, which passes vacuously against a `null` if the fixture is wrong.

### AC3 — ⛔⛔ THE OUTBOUND PUSH — ⛔ BLOCKED, ⛔ NOT DECIDED
⛔⛔ **⛔ THIS AC DOES ⛔ NOT SHIP UNTIL PREFLIGHT STOP 2 IS ANSWERED.** `-198` follow-up (i)
(shielded) conflicts with **Trustee-ratified `-180` cl.1** (ALL FOUR, ⛔ no split authorised).

**And** whichever way it is ruled, the outcome is **STATED** in `Dev Notes → Pull vs push` **and** in
the doc-block at `contribution-notify-triggers.ts:249` — ⭐ so a future reader of the **code** meets
it, ⛔ not only a reader of this file.

**And** if the ruling preserves the shielded push, a test asserts the push payload carries ⛔ no full
legal name, **and** that the shielded output is reached by an **explicit argument**, ⛔ never a default.

### AC4 — The Contribution Note is decided DELIBERATELY
Per Trap 2 and `-198` follow-up (ii) — ⚠ **an OPEN decision (`G-note`), ruled at Task 1.**
**And** ⛔ **only the DECEASED's name moves**; `memberFirstName`/`memberLastInitial` stay shielded.
**And** the **discontinuity** — Notes before vs after this story — is recorded, with ⛔ no back-fill
and ⛔ no re-render implied ([[feedback_record_unattested_no_backfill]]).
**And** what proves it: a `.decision-log.md` entry ruling `G-note`, **cited at `note-template.ts`**.

### AC5 — The contract carries the name HONESTLY — in **ALL THREE**
`ActiveContributionCard` (`:124,130`), **`ContributionHistory` (`:73,77`)** and **`ContributionNote`
(`:118,120`)** shed the two shielded fields for a shape that can hold a configured name (Trap 3).
**And** `ResolvedPoolIdentity` (`notifications/pool-identity.ts:40-41`) moves with them — ⛔ the parts
are ⛔ not preserved upstream while the contracts pretend otherwise.
**And** ⛔ ⛔ no field keeps a name it no longer holds. **And** every consumer moves with it (see
*Project Structure Notes*). **And** `openapi/v1.yaml` is **re-emitted** via
`packages/contracts/scripts/emit-openapi.ts` — ⛔ never hand-edited.
**And** the stored KYC name is **byte-identical** across a form change and back (`-136` cl.2), and
`splitFirstNameLastInitial` is ⛔ **not** reimplemented.

### AC6 — The member's meaning is STATED **where a code reader meets it**
The one-sentence policy meaning is carried into the header doc-block of
`packages/domain/src/notifications/pool-identity.ts` **and** into the `governance:` commit body.
⛔ Not satisfied by the sentence already present in this file — ⭐ it must be **put** somewhere.

### AC7 — ⛔ Nothing else moves
⛔ No public surface · ⛔ no publication basis · ⛔ no drive list (**E**) · ⛔ no banking field (**A/F**)
· ⛔ no stage vocabulary (**B**) · ⛔ no target (**C**) · ⛔ nothing a member owes.

**And the fences that bound THIS story's own blast radius:**
⛔ `resolvePoolIdentity` gains ⛔ **no new default** — a test asserts the legacy/no-argument path still
yields the shielded form (Trap 1) · ⛔ `kyc/name.ts` is ⛔ not touched (⛔ no second shielding
implementation, `-136` cl.2) · ⛔ the mononym path is ⛔ not "fixed" on the **public** side · ⛔ no new
decrypt · ⛔ no `public-vs-private-matrix.yaml` row · ⛔ no `RULED_TIER1_PUBLIC_EXCEPTIONS` entry —
⭐ these are **authenticated** surfaces · ⛔ `public_name_presentation_mode` is ⛔ **NOT renamed**.

**And ⛔ NOT the NOMINEE's name form** — ruled **FULL NAME** at `2026-09-07-205` cl.1 and built in
story **D**; `public_name_presentation_mode` has ⛔ **no subject** there (the nominee value is
claim-scoped free text with *"⛔ no member identity behind it"*, `deferred-work.md:349`).
⚠ `11b-17:107` and `:60` attribute the nominee's form to **G** in error — ⭐ record it, ⛔ do not
build it.

### AC8 — i18n / copy is SOURCED, ⛔ not minted
⭐ The name reaches copy through the **existing `{family}` interpolation param** in
`packages/i18n/locales/{en,hi}/contribution.json` (`active_contribution.family_parichay`,
`active_contribution.tone.*`, `note.label.family`, `notify.cycle_open.body`,
`notify.deadline.day_14.subject`, `yogdaan.row_a11y`). ⛔ **No new locale key is minted**, and ⛔ no
name form is composed at a render site once the contract carries one honest field.
**And** every `t()` passes an explicit **namespace in the THIRD slot** — it defaults to `common` and
**throws** ([[project_uset_fresh_closure_memo_trap]] neighbourhood; the 11b.2 `rowA11y` precedent).
**And** the name renders per locale; ⛔ money keeps **Latin** numerals (amendment-A2).

### AC9 — The deferral is DISPOSITIONED, in the ruled language
`deferred-work.md` **11b.1 item (e)** is amended in place.
⭐ If any consumer is left shielded, the record says **NARROWED** — ⛔ **never CLOSED** (`-180` cl.2:
*"⛔ **CLOSED-ON-SHIP, ⛔ not closed today**"*, and [[feedback_closure_language_precision]]).
**And** item (e)'s own stale *"declinable and revocable"* framing is **annotated** against `-160`
cl.6 — ⛔ not edited away.
⚠⛔ **And it is reconciled with `8-16`'s Task 6**, which currently owns that same closure (STOP 1).

---

## ⚖️ Decisions — ⚠⛔ **TWO OPEN, ⛔ BOTH BLOCKING**

⛔⛔ **⛔ THE PREVIOUS "NONE OPEN" WAS FALSE.** `-198`'s own heading reads, verbatim:
**"Open follow-ups — ⛔ both BLOCKING story G's scope:"** — and both entries are *recommendations*
(*"BigDev **recommends**"* / *"⭐ **Recommend**"*), ⛔ not rulings.

| Key | Question | State |
|---|---|---|
| **`G-push`** | Does `-198` follow-up (i)'s push carve-out **supersede Trustee-ratified `-180` cl.1**, or does the push rise with the screens? | ⛔ **OPEN — Panel.** Preflight STOP 2. Blocks AC3, Task 2, Task 6 |
| **`G-note`** | Does the Contribution Note follow the **in-app** form, stay **shielded**, or stay shielded until re-issued? | ⛔ **OPEN — BigDev.** Task 1. Blocks AC4, Task 5 |

⚠ And ⛔ **not a decision but a precondition**: **Preflight STOP 1** — the `8-16` overlap — is answered
before either.

---

## ⚠ What this story does ⛔ NOT do

⛔ It does ⛔ **not** adopt the publication basis (AC2) · ⛔ not touch any public surface · ⛔ not
re-render past Contribution Notes · ⛔ not build the drive list (**E**) · ⛔ not change the shared
resolver's **default** (Trap 1) · ⛔ not touch the **nominee's** name form (AC7) · ⛔ not change the
contributing member's **own** shielded name (Trap 2) · ⛔ not rename `public_name_presentation_mode`.

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0) — ⛔ one `governance:` commit, ⛔ no code.
  - [ ] ⛔⛔ **Read the PREFLIGHT first. If either STOP is unanswered → ⛔ STOP and report.**
  - [ ] **CREATE** a `### Story 11b.16` section in `epics.md` — ⚠ headings stop at **11b.9**
        (`epics.md:5353`), so there is ⛔ nothing to annotate. ⭐ Precedent: `epics.md:3048`, Story
        7.11 — *"had **no `epics.md` entry** until it **created its own**"*.
  - [ ] **CORRECT `epics.md:5128`** — the split is ⛔ not six stories `11b-11 … 11b-16`; it is
        **seven**: `11b-11 … 11b-15` **plus `11b-17`**, with `11b-16` the seventh, added at
        `-197`/`-198`. ⭐ **F = `11b-17`; G = `11b-16`.** ⛔ Supersede by name, ⛔ do not delete.
  - [ ] ⭐ **Record (⛔ do not edit)** that `11b-11:818` — a **`done`, committed** story — names
        `11b-16` as *"story F"*. ⇒ a reader chasing the `-190` cl.3 residual lands on the wrong file.
  - [ ] Flip the sprint row; `governance:` prefix
        ([[feedback_governance_commits_precede_implementation]]).
- [ ] **Task 1 — ⛔ THE STOP GATE. ⛔ No code until it clears.** (AC3, AC4)
  - [ ] ⛔⛔ **STOP 1 — reconcile with `8-16`.** BigDev rules: supersede / absorb / withdraw. ⭐ A
        `.decision-log.md` entry **and** a `sprint-status.yaml` flip. ⛔ Not a story note.
  - [ ] ⛔⛔ **STOP 2 — route `G-push` to the Panel** with `-180` cl.1 and the 2026-09-02 routing
        note's option **(c)** in front of them. ⛔ Do ⛔ not assume `-198` wins.
  - [ ] ⚠ Rule **`G-note`** (BigDev) — ⛔ do ⛔ not assume.
  - [ ] ⚠ Rule the **trailing-period** form question (AC1) — ⭐ one form wins, on both surfaces.
  - [ ] ⛔ **If any is unruled → STOP and report.**
- [ ] **Task 2 — ⛔ REQUIRED parameter. ⛔ NO new default** (AC1, AC3, AC7, Trap 1)
  - [ ] ⛔⛔ **Read Trap 5 FIRST.** ⛔ Do ⛔ not call `resolvePublicMemberName` — it **omits mononyms**
        and turns *"show the single name"* into *"omit the pool"*. ⭐ **Share the MODE, ⛔ never the
        function** (`-181`).
  - [ ] Add `mode: PublicNamePresentationMode` as a ⛔ **REQUIRED** input parameter to
        `notifications.resolvePoolIdentity` — ⛔ **never a DB read inside it**: the mode is
        per-Pariwar while the fan-out is per-member ⇒ an **N+1**. ⭐ The public path's pattern:
        resolve once per request (`public-pages/handlers.ts:362-364`).
  - [ ] ⚠ **Two signatures, ⛔ different shapes** — state where the parameter goes in each:
        `member-pool/pool-identity.ts:60-66` `(deps, tx, request, pariwarId, input)` vs
        `notifications/pool-identity.ts:76-82` `(db, encryption, pariwarId, input, log)`.
        ⛔ The wrapper is ⛔ not a pass-through.
  - [ ] ⛔ **`contribution-notify-triggers.ts` passes its form EXPLICITLY** — per `G-push`.
        ⛔ No default is added; a test asserts it (AC7).
- [ ] **Task 3 — The contracts, ⛔ ALL THREE** (AC5, Trap 3) — ⭐ change `ResolvedPoolIdentity` to one
      honest field; move all three contracts and every producer/consumer in *Project Structure Notes*;
      re-emit `openapi/v1.yaml`. ⛔ No field keeps a name it no longer holds.
  - [ ] ⚠⛔ **`apps/mobile/tests/unit/missed-cycle-section.test.ts:171`** bans the OLD field names in a
        `forbidden` list. ⛔ Renaming without updating it makes it **pass vacuously**.
  - [ ] ⚠ `packages/ui/tests/contribution-list/forbidden-imports.test.ts:70-71` bans binding
        `resolvePublicMemberName` **and** `resolvePoolIdentity` inside `@twt/ui` ⇒ ⛔ the form decision
        may ⛔ **not** be pushed into a shared presenter.
  - [ ] ⭐ Discharge or re-affirm `deferred-work.md:7731`'s **standing hazard** (the hand-maintained
        tuple re-spellings) — ⚠ this story **meets its re-trigger**.
- [ ] **Task 4 — The screens** (AC1) — My Pool card + passbook/history, both contract and producer.
- [ ] **Task 5 — The Note** (AC4) — per Task 1's `G-note`; ⛔ deceased only; record the discontinuity.
- [ ] **Task 5b — Record the SEMANTIC WIDENING at the setting** (AC7) — `public_name_presentation_mode`
      now governs **member-facing** surfaces too (`-181`). ⛔ **Do ⛔ NOT rename it** — a governed
      config table's rename is a migration **and** a governance act.
- [ ] **Task 6 — Tests** (AC1-AC9) — ⭐ paths named; see *Testing standards*.
  - [ ] Member name **string-equals** the public producer's output where the basis holds (AC1).
  - [ ] Member sees a name where the public sees ⛔ **none** (AC2) — ⛔ `tc_acceptance` fixtures.
  - [ ] ⭐⭐ **THE MODE-FLIP TEST** — set the Pariwar to `shielded_name`, assert the member surfaces
        follow. ⭐ `-136` cl.1's *"must not hard-code"* is a **testable requirement** and is **proven
        here, ⛔ not asserted**. ⚠ Without it every other test passes against a hard-coded `full_name`.
  - [ ] ⭐⭐ **THE MONONYM TEST** — a mononym family under `shielded_name` still renders a card, a
        passbook row and a Note on ⛔ **every** consumer, in ⛔ **both** modes (Trap 5).
  - [ ] ⛔⛔ **The push assertion** (AC3) — ⭐ per `G-push`. ⚠ `apps/jobs/tests/contribution-notify-triggers.test.ts:937`
        already exercises `deceasedLastInitial: ''` — extend, ⛔ do not duplicate.
  - [ ] The three contracts reject the old shielded shape (AC5).
  - [ ] ⛔ The resolver's legacy path still yields the shielded form — ⛔ no new default (AC7).
  - [ ] ⭐ **Execute them** against `twt-test-pg` `:5433` — ⛔ *"written but not run"* is ⛔ not attested.
- [ ] **Task 7 — `deferred-work.md` item (e)** (AC9) — amend in place, in the ruled language;
      reconcile with `8-16` Task 6.

---

## Dev Notes

### Project Structure Notes

⚠⛔ The old draft had ⛔ **no file list** for a change spanning **4 packages**. ⭐ It is here.

| Path | Disposition |
|---|---|
| `packages/domain/src/notifications/pool-identity.ts` | **UPDATE** — `:40-41` the shape · `:76-82` the signature · `:112` the absence guard · `:122-123` the producer · header ← AC6 |
| `packages/contracts/src/contributions/active-contribution-card.ts` | **UPDATE** — `:79` doc · `:124`, `:130` |
| `packages/contracts/src/contributions/contribution-history.ts` | **UPDATE** — `:55` doc · `:73`, `:77` |
| `packages/contracts/src/contributions/contribution-note.ts` | **UPDATE** — `:118`, `:120` ⛔ **only**; `:123-124` (member's own) ⛔ NOT TOUCHED |
| `apps/api/src/modules/member-pool/pool-identity.ts` | **UPDATE** — `:55-58` doc · `:60-74` the delegation |
| `apps/api/src/modules/member-pool/handlers.ts` | **UPDATE** — calls `:630`, `:835`; producers `:748-749`, `:866-867` |
| `apps/api/src/modules/member-pool/contribution-note.ts` | **UPDATE** — call `:144`; producer `:185-186`. ⛔ `:159-161` `resolveOwnName` NOT TOUCHED |
| `apps/api/src/modules/member-pool/note-template.ts` | **UPDATE** — `:144` (deceased) ⛔ only; `:145` (member) NOT TOUCHED |
| `apps/jobs/src/scheduler/contribution-notify-triggers.ts` | ⛔ **PER `G-push`** — call `:683`, join `:249-253`, doc-block ← AC3 |
| `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` | **UPDATE** — `:101-103` |
| `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx` | **UPDATE** — `:39` |
| `apps/mobile/components/yogdaan-bahi/sample-data.ts` | **UPDATE** — `:9` doc · `:57-58` fixtures |
| `apps/mobile/tests/unit/missed-cycle-section.test.ts` | **UPDATE** — `:171` ⚠ the vacuous-pass trap |
| `apps/api/tests/unit/_pool-identity-fake.ts` | **UPDATE** — encodes the return shape; read by 3 suites |
| `openapi/v1.yaml` | **RE-EMIT** via `packages/contracts/scripts/emit-openapi.ts` — ⛔ never by hand |
| `_bmad-output/implementation-artifacts/deferred-work.md` | **UPDATE** — 11b.1 item (e) ← AC9 |
| ⛔ `packages/domain/src/kyc/name.ts` · `kyc/public-name.ts` | ⛔ **NOT TOUCHED** — `-136` cl.2; ⛔ no second shielding implementation |
| ⛔ `packages/contracts/src/public-pages/sahyog-drive.ts` · `apps/public/**` | ⛔ **NOT TOUCHED** — AC7 |
| ⛔ `packages/ui/src/contribution-list/**` | ⛔ **NOT TOUCHED** — its `kind: 'name'` model is about **contributors**, ⛔ not the deceased |

### The whole risk is in ONE line you must ⛔ not write

⭐ A single change to `notifications.resolvePoolIdentity`'s **default** would satisfy AC1 in one edit —
⛔ and simultaneously put a **full legal name into an outbound SMS**. ⚠ **That edit is the story's
one REAL hazard**, and Trap 1 exists to stop it.

⇒ **thread the form from the CALL SITE, as a REQUIRED parameter.** ⭐ Four callers.

⚠⛔ **⛔ AND THE SECOND HAZARD IS QUIETER**: returning `{deceasedFirstName: "Rajesh Kumar Sharma",
deceasedLastInitial: ""}`. ⭐ It renders **correctly** on all three in-app consumers, ships a **lying
field**, and leaves the push full-name too — defeating AC3 with every test green.

### Pull vs push — ⭐ the asymmetry, STATED (AC3)

⚠ If `G-push` preserves the shielded push, a member may see a **fuller name in the app than in the
notification that sent them there**. ⭐ That is a defensible **pull vs push** asymmetry — a screen the
member opens versus a message that arrives on a lock screen, into a telecom log, forwardable.
⛔ It must be **stated**, ⛔ not discovered — here **and** at `contribution-notify-triggers.ts:249`.

⚠⛔ **⛔ The Panel has already weighed this and ruled the other way** (`-180` cl.1, Preflight STOP 2).
⇒ ⛔ this section records the asymmetry; it does ⛔ **not** authorise it.

### Why G runs before E

⭐ E builds a list that must show *"at least what the public shows"*. ⚠ If E lands first, that list
would be **correct** while the My Pool card beside it is **inconsistent** — a member seeing two name
forms in one app, ⛔ which is the very finding G exists to close.

### Testing standards

⚠⛔ **⛔ A GREEN `pnpm test` PROVES NOTHING HERE.** `scripts/ci-local.sh:137` — the integration suites
**skip silently** unless `DATABASE_URL` is set. ⇒ Task 6's *"execute them"* is otherwise satisfied
vacuously.

```
DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' \
  pnpm turbo run test --filter=@twt/domain --filter=@twt/api --filter=@twt/jobs
```

| What | Where |
|---|---|
| Resolver, mode-resolved + **mononym**, live-DB | `packages/domain/tests/integration/notifications/pool-identity-name-form.spec.ts` (new dir) |
| Member-vs-public equality (AC1) · basis-absent divergence (AC2) · **mode-flip** | `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts` |
| ⛔ The push (AC3) | `apps/jobs/tests/contribution-notify-triggers.test.ts` — ⭐ **extend**, `:937` already covers the empty-initial case |
| The three contracts reject the old shape (AC5) | `packages/contracts/tests/contributions.test.ts` |
| Mobile consumers | `apps/mobile/tests/unit/*-name-form.test.ts` |

⚠ [[project_ci_local_concurrency_oversubscription]] — `integration-tests` concurrency `=1` is
**LOAD-BEARING**; ⛔ never raise it. ⚠ [[project_live_db_test_gotchas]].

### References

- ⛔⛔ `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md` —
  **`ready-for-dev`, zero open decisions, owns this work** (Preflight STOP 1)
- ⛔ `.decision-log.md#decision-2026-09-02-180` **cl.1** (Trustee-ratified — ALL FOUR, ⛔ no split) ·
  **cl.2** (item (e) closure language) · `#decision-2026-09-02-181` (MODE-RESOLVED; Trap 5) ·
  `#decision-2026-09-02-179` cl.3
- `.decision-log.md#decision-2026-09-04-197` · `-198` cl.1, cl.2 + its **two BLOCKING** follow-ups
- `.decision-log.md#decision-2026-08-28-160` **cl.5/cl.6** — the **live** publication basis
- `.decision-log.md#decision-2026-09-04-189` cl.3 · `-195` cl.1 · `#decision-2026-08-19-136`
  **cl.1** (testable: ⛔ must not hard-code) · **cl.2** (one stored name, N modes) · **cl.3** (per-Pariwar,
  `super_admin`) · `#decision-2026-09-07-205` cl.1 (the **nominee's** form — ⛔ story D, ⛔ not G)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md` —
  ⭐ option **(c)** = this story's AC3; the Panel **declined it**
- PRD: `prd.md:520-522` **FR-21** (the card's `first-name + last-initial` — **superseded in form**
  here) · `:627-633` **FR-33** (the Note, incl. its trust-legal copy-review duty) · `:1055` **FR-74**
  (untouched — AC7)
- `packages/domain/src/kyc/presentation-policy.ts:63-70` · `kyc/public-name.ts:98` (the mononym `''`)
- `deferred-work.md:984` item **(e)** (⚠ itself stale) · `:7731` (the tuple standing hazard) ·
  `:349` (the nominee has **no subject** for the mode)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `-197` / `-198` (story **G**, the seventh). ⭐⭐ Finding at authoring: the shared resolver also feeds **OUTBOUND PUSH**. ⇒ AC3 keeps the push shielded and tests it. | BigDev + Claude |
| 2026-09-08 | 0.2 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`) — 17 findings, three independent verifiers, ALL APPLIED. ⛔ THE STORY IS NO LONGER STARTABLE AS WRITTEN.** ⭐ **TWO STOP CONDITIONS**: (1) `8-16` is `ready-for-dev`, fully ruled, and owns this work — named ⛔ nowhere in the 11b split; (2) AC3 reverses **Trustee-ratified `-180` cl.1**, the exact option the Panel was shown and **declined**, on **author-committed** authority. ⭐ *"Zero open decisions"* → **TWO OPEN, both BLOCKING** (`-198`'s own heading says so). ⭐ **Trap 5 added** (the mononym — `-181`'s named forbidden move, which AC1's word *"identical"* was ordering). ⭐ The policy-meaning basis was the **superseded** one (`-160` de-authorised the family tick-box) and now carries its **Niyamavali check**. ⭐ Contracts **1 → 3** + `ResolvedPoolIdentity`. ⭐ Baseline **re-pinned to the main line**. ⭐ Added: file table, real test paths, the **mode-flip** test (`-136` cl.1 is *testable*), i18n sourcing (AC8), item (e)'s ruled closure language (AC9), and the `epics.md:5128` / `11b-11:818` **F-vs-G** mis-keying. ⛔ Zero code. ⛔ Zero rows flipped. | BigDev + Claude |
