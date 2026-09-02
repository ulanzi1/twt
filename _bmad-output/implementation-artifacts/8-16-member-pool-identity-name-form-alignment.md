# Story 8.16: Member-Facing Pool Identity — Name-Form Alignment (closing the public/member INVERSION) `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is minted **by Panel direction** —
> `2026-09-02-179` **cl.3**: *"the public/member inversion gap shall be closed."* ⛔ A future
> `sprint-planning` run must ⛔ not drop it.
>
> ⭐ **WHY EPIC 8 AND ⛔ NOT EPIC 11b.** Epic 11b *surfaced* the inversion; **Epic 8 owns the code** —
> `resolvePoolIdentity` and all four of its consumers are Stories **8.6 / 8.7 / 8.8**. ⚠ This follows
> the **`7-11` precedent** verbatim: that story was *"minted against **Epic 7**, whose Story 7.5 owns
> the **write path** — ⛔ not against Epic 10, whose 10.13 owns only the setter surface."*
> ⛔ And it discharges **`INV-owner`**: *"a directive naming an **EPIC** expires unowned"*
> ([[project_r7_fact_producer_unbuilt]]) — this names a **story key that exists in
> `sprint-status.yaml`**.

> ⛔⛔ **TASK 0 IS A STOP GATE. TWO DECISIONS ARE OPEN AND ONE OF THEM IS THE PANEL'S.**
>
> | Decision | Question | Whose |
> |---|---|---|
> | **`INV-scope`** | Do **all four** consumers rise, or only the in-app two? | ✅ **RULED — ALL FOUR** (`2026-09-02-180`) |
> | **`INV-form`** | **Hard-coded full name**, or **mode-resolved** from the Pariwar's configured public mode? | ⛔ **OPEN — BigDev, BLOCKING** |
>
> ⭐⭐ **`INV-scope` IS RULED: ALL FOUR** (Kalpana Bharti, Dhiraj Rahul). ⇒ the inversion **CLOSES**,
> ⛔ it is ⛔ not narrowed; the resolver's *"one identity everywhere"* property is **PRESERVED**; and
> ⛔ **no split is authorised** — a future story that divides the consumers is **reversing `-180`**,
> ⛔ not optimising.
>
> ⛔ **`INV-form` STILL BLOCKS, and this ruling made it MATTER MORE.** Under a narrow scope a
> hard-coded full name would have been contained to two in-app screens. ⛔ **Under all four it is
> not:** a Pariwar that sets its public mode to `shielded_name` would still have a **full name pushed
> to its members' handsets and printed into a forwardable PDF**. ⇒ ⭐ **the case for MODE-RESOLVED is
> materially stronger than when it was raised.** ⛔ **No code until it is ruled.**

---

## Story

As a **contributing member** opening my pool,
I want to see the family I am supporting named **the same way a stranger sees them named** on the
public Sahyog Drive page,
so that **the app never tells me less about my own Pariwar's drive than it tells the internet** — and
so the Trust is not in the position of shielding a name from the people who are paying for the funeral
while publishing it to everyone else.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It changes a
**presentation form** — which name string is rendered — and ⛔ touches ⛔ no eligibility, ⛔ no
assignability, ⛔ no contribution duty, ⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no moderation
overlay. ⚠ Stated explicitly because *"an absent note is indistinguishable from an unasked question."*

**What it means to the member, in their terms:**
*"When you open your pool, you will see the full name of the colleague whose family you are
supporting — the same name anyone can already see on the public page. Until now the app showed you
less than the public page did."*

✅ **Checked against the Niyamavali:** it governs eligibility, contribution duty and adjudication —
⛔ **it says nothing about the FORM of a name on a member surface.** Per
[[feedback_niyamavali_rulebook_not_spec]] its silence is ⛔ neither a blocker nor authority.
⚠ **Result: no amendment is owed.**

⚠⛔ **AND THE ⛔ NON-PREDICATE, because this story renders a DEAD person's name to LIVING members:**
⛔ nothing here may read `members.state`, and ⛔ **death is an overlay, ⛔ not a lifecycle state**
([[project_death_is_an_overlay_not_a_state]]). ⛔ Do ⛔ not add a "deceased" predicate to gate the form.

---

## 🎯 What already EXISTS — verified live at `79ed41d`

| Thing | State | Where |
|---|---|---|
| `resolvePoolIdentity` — the **ONE** place the join lives | ✅ **LIVE**, **hard-codes the SHIELDED form** | `packages/domain/src/notifications/pool-identity.ts:76` |
| ⭐ It emits **PARTS**, ⛔ never a joined string | ✅ returns `deceasedFirstName` + `deceasedLastInitial` **separately** (`:120-127`) ⇒ **the join lives in each consumer** | same file |
| **FOUR** consumers — ⚠ **TWO LEAVE THE APP** | ✅ ① My Pool card (8.6) · ② Yogdaan Bahi (8.6) · ⚠ ③ **Contribution Note PDF** (8.7) · ⚠⚠ ④ **cycle-open push / WhatsApp / SMS** (8.8, runs in `apps/jobs`) | `pool-identity.ts:1-14` |
| ⭐ The **"two different pools"** design property | ✅ *"A divergence between the push a member receives and the card they open would read to Sushil as **two different pools**, so the resolver moves to `@twt/domain` rather than being duplicated by value."* | same header |
| `resolvePublicMemberName` — the **PUBLIC** form | ✅ **Pariwar-CONFIGURED**: `full_name` is the **DEFAULT, ⛔ not a constant** (`2026-08-19-136` cl.1) | `packages/domain/src/kyc/public-name.ts:73` |
| The public form's **ratification** | ✅ **PANEL-RATIFIED** — `/sahyog` (D10, `2026-09-02-179` cl.2) · `sahyog-vivran` (`-173`) | `.decision-log.md` |
| `splitFirstNameLastInitial` | ✅ the shielding implementation (`-136` cl.2) — ⛔ **not** to be reimplemented | `packages/domain/src/kyc/name.ts` |
| The identity on the **contract** | ✅ `ResolvedPoolIdentity` + the Contribution Note's own reference to the shared resolver | `pool-identity.ts:39`, `packages/contracts/src/contributions/contribution-note.ts:137` |

**⛔ What does ⛔ NOT exist:**

- ⛔ **No full-name field on `ResolvedPoolIdentity`.** It carries **parts only** ⇒ this is a **SHAPE
  change**, ⛔ not a one-line swap. See **Trap 2**.
- ⛔ **No mode-resolution on the member side.** The public side reads a stored per-Pariwar mode; the
  member side has ⛔ none. See **`INV-form`**.

---

## ⛔ THE FOUR TRAPS

### Trap 1 — ⭐⛔ TWO OF THE FOUR CONSUMERS **LEAVE THE APP**, AND THAT IS THE WHOLE OF `INV-scope`

A public web page is **PULL** — someone must go and look. ⚠⚠ **A WhatsApp/SMS message is PUSH** — it
delivers a deceased person's full name to **every assigned member's handset**, which may be shared.
⚠ **And the Contribution Note is a PDF** a member downloads, keeps, and can forward.

⇒ ⛔ *"the member app rises to match the public"* is ⛔ **not** one change. It is **four**, and two of
them have an exposure profile the public page does ⛔ **not** have.

⛔⛔ **AND SPLITTING THEM RE-CREATES THE DEFECT THE RESOLVER WAS BUILT TO PREVENT** — its own header
says a divergence between the push and the card *"would read to Sushil as **two different pools**"*,
which is **why 8.8 moved it into `@twt/domain`** rather than duplicating it. ⇒ ⭐ **there is ⛔ no
cheap "in-app only" option**; it is a **deliberate re-divergence** with a named cost. → **`INV-scope`.**

### Trap 2 — ⭐⛔ THE RESOLVER EMITS **PARTS**. THIS IS A SHAPE CHANGE ACROSS FOUR CONSUMERS + A CONTRACT

`ResolvedPoolIdentity` carries **`deceasedFirstName`** and **`deceasedLastInitial`** as *separate*
fields (`:120-127`), and **each consumer joins them**. ⇒ moving to a full name means **changing what
the resolver returns**, ⛔ not editing one string.

⛔ **Do ⛔ NOT "solve" it by stuffing the surname into `deceasedLastInitial`.** That field's name would
then lie, every consumer's join would silently produce the right output for the wrong reason, and the
next reader would find a field called *last **initial*** holding *"Kumar"*.

⭐ **The parts-not-joined shape is the SAME discipline 11b.2's presenter uses** (`-168` cl.6, D9(a) —
*"emits name PARTS and ⛔ never joins them, precisely so ⛔ nothing in it decides the form"*).
⚠ ⇒ **the form decision belongs at the render layer there, and the same question arises here** — so
whatever shape lands must keep the **form decidable**, ⛔ not bake it into the resolver.

### Trap 3 — ⚠⛔ "ALIGN WITH THE PUBLIC FORM" ⛔ DOES NOT MEAN "HARD-CODE THE FULL NAME"

The **public** form is **Pariwar-CONFIGURED** — `full_name` is the **DEFAULT, ⛔ not a constant**
(`2026-08-19-136` cl.1), and `-136` cl.1 is a **testable requirement**: *"a build in which the public
name form cannot be changed without a code change **FAILS this clause**."*

⇒ ⛔⛔ **if the member side hard-codes `full_name`, then a Pariwar that switches its public mode to
`shielded_name` gets a NEW INVERSION — pointing the other way.** The member app would show **MORE**
than the public page. ⭐ **That is the very defect this story exists to remove**, re-created by the fix.

→ **`INV-form`.** ⚠ ⛔ Applying cl.1 to the *member* side is an **inference** (its subject is the public
directory) — ⛔ it is **raised**, ⛔ not assumed ([[feedback_supersede_never_reinterpret]]; the
`2026-09-02-175` warning).

### Trap 4 — ⚠ MONONYMS ALREADY RENDER IN FULL ON THE MEMBER SIDE, SO PART OF THE "INVERSION" IS ⛔ NOT REAL

`splitFirstNameLastInitial` returns `lastInitial: ''` for a single-token name, and
`resolvePoolIdentity` returns the identity anyway (it only bails when `firstName === ''`). ⇒ for a
**mononymous** deceased member the member app **already renders the entire stored legal name**.

⭐ **Mononyms are common in India** — this is ⛔ not a corner case (`2026-08-21-145` cl.3 ruled exactly
this point for the directory, where the consequence was the opposite: the shield silently did nothing).
⇒ ⚠ **for that class there is ⛔ no inversion today**, and this story must ⛔ not report closing one.
⛔ Do ⛔ not "fix" the mononym path — ⛔ it is not broken here.

---

## Acceptance Criteria

> ⛔ **AC1 is a STOP gate. ⛔ Nothing below it builds until `INV-scope` and `INV-form` are ruled.**

### AC1 — Both decisions exist, are cited, and are transcribed BEFORE any code

**Given** `2026-09-02-179` cl.3 directs the inversion be closed, ⛔ but settles ⛔ neither the **scope**
nor the **form**
**When** Task 0 runs
**Then** **`INV-scope`** is answered **by the Panel** — ⛔ it may ⛔ not be resolved by BigDev alone,
because two consumers **leave the app** and the ruling's words do ⛔ not distinguish push from pull
**And** **`INV-form`** is ruled (BigDev) — hard-coded vs mode-resolved
**And** ⛔ **if either is unruled → STOP and report**
**And** both are **transcribed** into `.decision-log.md` — ⛔ the dev agent transcribes; it ⛔ **never**
authors, paraphrases or re-grounds a ruling.

### AC2 — The member-facing form matches the ruled public form, at the ruled scope

**Given** ✅ **`INV-scope` RULED — ALL FOUR** (`2026-09-02-180`) and `INV-form`
**When** the resolver renders a pool's deceased-family identity
**Then** **ALL FOUR** consumers render the name in the form **`INV-form`** rules — ① My Pool card
· ② Yogdaan Bahi · ③ the **Contribution Note PDF** · ④ the **cycle-open push / WhatsApp / SMS** — and
the public/member gap is **CLOSED**, ⛔ not narrowed
**And** ⛔ **no consumer is excluded and ⛔ no split is authorised** — ⚠ a divergence here reverses
`-180` and re-creates the *"two different pools"* defect 8.8 removed
**And** ⭐ **`resolvePoolIdentity` stays the ONE place the join lives** — ⛔ no consumer grows its own
name resolution, and ⛔ the resolver is ⛔ not duplicated by value (the property 8.8 moved it to protect)
**And** ⛔ **`splitFirstNameLastInitial` is ⛔ NOT reimplemented** — it **is** the `shielded_name`
implementation (`-136` cl.2), and a second one would be the *"second identity system"* that clause
forbids
**And** ⛔ **the stored KYC name is ⛔ NEVER written by this path** — one stored name, N presentation
modes (`-136` cl.2). ⭐ A test asserts the stored name is **byte-identical** across a form change and a
change back.

### AC3 — The shape change is explicit, and ⛔ no field is made to lie

**Given** Trap 2 — the resolver emits **parts**, and four consumers plus a contract join them
**When** the identity shape changes
**Then** the full name is carried in a **field that says what it holds** — ⛔ **NEVER** by widening
`deceasedLastInitial` to hold a surname
**And** every consumer's join site is updated: the **My Pool card**, **Yogdaan Bahi**, the
**Contribution Note PDF** (⚠ and `packages/contracts/src/contributions/contribution-note.ts:137`
references the shared resolver by name), and the **cycle-open notification copy** in `apps/jobs`
**And** ⚠ **`apps/jobs` cannot import `apps/api`** — the resolver lives in `@twt/domain` for exactly
that reason. ⛔ Do ⛔ not reach for an `apps/api` helper from the job
**And** ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces**
([[project_contracts_domain_bundle_boundary]]).

### AC4 — ⛔ What this story does NOT change

**Then** ⛔ **the PUBLIC surfaces are ⛔ NOT touched.** `/sahyog` and `/sahyog-vivran` render through
`resolvePublicMemberName`, ⛔ never `resolvePoolIdentity` — and `sahyog-drive.ts:96` says so in terms
**And** ⛔ **⛔ no Tier-1 tier changes and ⛔ no matrix entry is added or edited.** The member surfaces
are **authenticated**; ⛔ this story adds ⛔ nothing to `RULED_TIER1_PUBLIC_EXCEPTIONS` and touches
⛔ no public-vs-private matrix field
**And** ⛔ **the mononym path is ⛔ NOT changed** (Trap 4)
**And** ⛔ **no decrypt is added anywhere new** — the resolver already decrypts the KYC name; ⭐ this
story changes **what is rendered from it**, ⛔ not who may read it.

### AC5 — Accessibility + i18n

**Then** every `t()` call passes an explicit `namespace` in the **third** slot — ⚠ `t()` defaults to
`common` and **THROWS** ([[project_missed_cycle_visibility_substrate]])
**And** ⭐ **the notification copy re-check is now LIVE, ⛔ not conditional** — `INV-scope` **includes
consumer ④**, so the rendered string changes and re-enters the microcopy gate
**And** ⚠ **MEASURE THE SMS SEGMENT LENGTH before shipping ④.** The dispatch cascades **push →
WhatsApp → SMS** and WA/SMS are the **PAID** channels; a longer name may push a message past a
**160-character segment** (cost + deliverability). ⛔ An implementation concern, ⛔ **never** a reason to
narrow a ruled scope
**And** ⚠⛔ **SMS is reached when PUSH FAILS** ⇒ the full name lands in an **unencrypted** SMS precisely
for members whose app is not working. ⛔ Recorded as a **precision** — the Panel ruled with all three
channels named — ⛔ **not** grounds to revisit
**And** the a11y family 13 checks hold in their **React-Native** form for the in-app consumers
(`accessible={true}` grouping, `accessibilityLabel`) — ⭐ these ARE RN surfaces, ⛔ unlike the Epic-11b
Astro ones.

### AC6 — What is routed, and what is CLOSED

**Then** `deferred-work.md` **11b.1 item (e)** is **amended in place**: its **first half is CLOSED**
(D10 Panel-ratified, `-179` cl.2) and its **second half is CLOSED BY THIS STORY** at the ruled scope —
⛔ **"Closed by [edit]"**, ⛔ never *"resolved via deferral"* ([[feedback_closure_language_precision]])
**And** ⭐ **`INV-scope` RULED ALL FOUR ⇒ this resolves to CLOSED** — the narrowed-vs-closed branch
does ⛔ not arise (**Q2 VACATED**, `-180` cl.3)
**And** ⚠⛔ **CLOSED ⛔ ON SHIP, ⛔ NOT ON RULING.** ⛔ Do ⛔ not mark 11b.1 item (e) closed until this
story **merges** — a ruling authorises the work, ⛔ it does not perform it
([[feedback_closure_language_precision]]).

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ STOP GATE. ⛔ No code until both decisions land.** (AC: 1)
  - [x] ✅ **The `INV-scope` packet is WRITTEN AND ROUTED (2026-09-02)** —
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md`.
        ⚠⛔ **WRITTEN ⛔ IS NOT ANSWERED** — `INV-scope` stays **OPEN** and this task stays a STOP gate.
    - [x] ✅ **THE PANEL ANSWERED — ALL FOUR** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`, note
        §10). ⛔ Already transcribed — ⛔ do not re-transcribe.
  - [ ] ⛔ **`INV-form` STILL BLOCKS → if unruled, STOP and report.** ⚠ And ⛔ do ⛔ not carry the
        *pre-ruling* weighting into it: under ALL FOUR, hard-coding ignores a Pariwar's shielding
        choice **on handsets and in a forwardable PDF**, ⛔ not just on two screens.
  - [ ] Rule **`INV-form`** (BigDev); transcribe both. Re-read `.decision-log.md` head first.
  - [ ] ⛔ **If either is unruled → STOP and report.**
  - [ ] `governance:` commit first ([[feedback_governance_commits_precede_implementation]]).
- [ ] **Task 1 — The identity SHAPE** (AC: 3) — a field that says what it holds; ⛔ never widen
      `deceasedLastInitial`.
- [ ] **Task 2 — The resolver** (AC: 2) — one join site; ⛔ no reimplementation of
      `splitFirstNameLastInitial`; ⛔ the stored KYC name is never written.
- [ ] **Task 3 — The consumers `INV-scope` names** (AC: 3) — My Pool card · Yogdaan Bahi · the PDF ·
      the `apps/jobs` notification copy.
- [ ] **Task 4 — Tests** (AC: 2) — ⭐ the **byte-identical stored name** assertion across a form change
      and back; per-consumer render assertions; ⛔ the mononym path unchanged.
- [ ] **Task 5 — a11y + microcopy** (AC: 5).
- [ ] **Task 6 — Amend 11b.1 item (e); record CLOSED or NARROWED** (AC: 6) — ⛔ never report a partial
      fix as a closure.

---

## ⚖️ Decisions — ✅ **`INV-scope` RULED ALL FOUR** (`2026-09-02-180`). ⛔ **ONE OPEN: `INV-form` (BigDev, BLOCKING)**

### ⛔ `INV-scope` — **PANEL, BLOCKING.** All four consumers, or the in-app two?

⭐ `2026-09-02-179` cl.3 directs closure and ⛔ **does not distinguish push from pull.** Two consumers
leave the app: the **Contribution Note PDF** (shareable) and the **cycle-open push/WhatsApp/SMS**
(a possibly-shared handset).

- **(a) ALL FOUR** — the gap closes completely, and the resolver's *"one identity everywhere"* property
  is preserved intact. ⚠ Then a deceased member's **full name is pushed to every assigned member's
  phone** at cycle open.
- **(b) IN-APP ONLY** (card + passbook) — the smaller exposure. ⚠⛔ **But it re-creates the *"two
  different pools"* divergence 8.8 moved the resolver to prevent**, and ⛔ the inversion is then
  **NARROWED, ⛔ not closed** — AC6 must say so.
- **(c) ALL FOUR EXCEPT THE PUSH** — the PDF is pulled (the member asks for it); the push is not.
  ⚠ A principled middle, ⛔ and it still splits the resolver.

⛔ **Only the Panel can rule this**, because the exposure it decides is ⛔ not the one they were shown.

✅ **RULED (a) ALL FOUR — 2026-09-02** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`).
Packet: `trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md` §10.
⇒ ⭐ **Q2 VACATED** (its antecedent did ⛔ not obtain) ⇒ **AC6 resolves to CLOSED**, ⛔ not narrowed —
⚠ **closed ON SHIP**, ⛔ not today; 11b.1 item (e) stays OPEN until this story merges.
⇒ ⭐ **the resolver's *"one identity everywhere"* property is PRESERVED** — ⛔ no split, and ⛔ a future
story that divides the consumers reverses `-180`.

⭐ **THREE FINDINGS OF THE PACKET-WRITING PASS, all verified and all narrowing the question:**
1. ⚠ **The notification DOES carry the name — ⛔ it is ⛔ not just "Pool F".**
   `apps/jobs/src/scheduler/contribution-notify-triggers.ts:251-253` **joins the parts**, and the copy
   renders it (*"Standing with **{family}**'s family"*). ⇒ consumer ④ is ⛔ **not** hypothetical.
2. ⭐ **The audience is BOUNDED and it is smaller than "a broadcast":** *"one … notification **per
   member assigned to a pool in that cycle**"* (`:10`) ⇒ **the pool roster — dozens**, ⛔ not the
   Pariwar and ⛔ not the membership. ⚠ And they are **the contributors to that family's drive**, who
   see the full name in-app under **every** option. ⇒ the real delta is *"also on a lock screen / in a
   WhatsApp thread / in an SMS"*, ⛔ **not** *"to strangers"*. ⛔ Do ⛔ not argue it as the latter.
3. ⭐ **The FOUR consumers are the COMPLETE set — a fifth was checked and ruled out.**
   `close-of-cycle/framing.ts:56` makes `familyName` a **required param**, ⚠ but it has **ZERO
   production suppliers** and the Panchayat Noticeboard renders ⛔ no family name. ⇒ ⛔ **there is no
   fifth surface**, and a future reader who finds `close-of-cycle.json` should ⛔ not re-derive one.

### ⛔ `INV-form` — **BigDev, BLOCKING.** Hard-coded full name, or MODE-RESOLVED?

⚠ **Trap 3.** The public form is **Pariwar-configured**; hard-coding `full_name` on the member side
means a Pariwar that shields publicly ends up with the **member app showing MORE** — a **new
inversion**, pointing the other way.

- **(a) MODE-RESOLVED** — the member side reads the **same stored per-Pariwar mode** the public side
  does. ⭐ *Authoring recommendation: it is the only option that stays closed under a later mode change,
  and it is what `-136` cl.1's "must not hard-code" requirement asks for on the public side.* ⚠ ⛔ Note
  the mode's **write authority** is `super_admin` only — ⛔ this story adds ⛔ no new key and ⛔ no
  toggle.
- **(b) HARD-CODED full name** — simpler today. ⛔ Re-creates the inversion the moment any Pariwar
  shields. ⛔ Not recommended.

⚠⛔ **Applying `-136` cl.1 to the MEMBER side is an INFERENCE** — its subject is the public directory.
⛔ Raised, ⛔ not assumed (the `2026-09-02-175` warning).

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- ⭐ **`resolvePoolIdentity` lives in `@twt/domain` because `apps/jobs` cannot import `apps/api`.**
  `apps/api/src/modules/member-pool/pool-identity.ts` keeps its signature and **delegates**. ⛔ Do
  ⛔ not re-home it.
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces**
  ([[project_contracts_domain_bundle_boundary]]).
- ⚠ **Type-only → value import** materializes a module-init cycle that breaks **consuming** packages at
  runtime while typecheck/lint/local tests stay green ([[project_type_only_import_cycle_trap]]).
- ⛔ **Fail-soft is the resolver's posture and ⛔ must not change:** an unresolvable name / decrypt
  failure / bad pool index **omits THIS pool**, ⛔ never throws — *"letting it throw would blank an
  entire passbook or abort an entire cycle's fan-out."*

### Testing standards

- ⭐ **The byte-identical stored-name assertion is the load-bearing test** — flip the form, flip it
  back, assert `member_kyc_profiles.name_ciphertext` is unchanged. It is the mechanization of `-136`
  cl.2's *"one stored name; N presentation modes."*
- **Live-DB:** ⛔ never regenerate an applied migration (42P07), ⛔ never `DROP SCHEMA` (42P01), assert
  **membership, not counts** ([[project_live_db_test_gotchas]]).
- ⚠ **`ci:local`**: `integration-tests` concurrency `=1` is **LOAD-BEARING**
  ([[project_ci_local_concurrency_oversubscription]]). `git push` runs full `ci:local` via a pre-push hook.

### Project Structure Notes

| Path | New / Update |
|---|---|
| `packages/domain/src/notifications/pool-identity.ts` | **UPDATE** — the shape + the form |
| `apps/mobile/…` My Pool card · Yogdaan Bahi | **UPDATE** — join sites |
| Contribution Note PDF (8.7) + `packages/contracts/src/contributions/contribution-note.ts` | **UPDATE** — ⚠ only if `INV-scope` includes it |
| `apps/jobs/…` cycle-open notification copy | **UPDATE** — ⚠ only if `INV-scope` includes it |
| `_bmad-output/implementation-artifacts/deferred-work.md` | **UPDATE** — 11b.1 item (e), amended in place |
| ⛔ `apps/public/**` · the matrix · `RULED_TIER1_PUBLIC_EXCEPTIONS` | ⛔ **NOT TOUCHED** (AC4) |
| ⛔ `packages/domain/src/kyc/name.ts` | ⛔ **NOT TOUCHED** — ⛔ no second shielding implementation |

### References

- [Source: `.decision-log.md#decision-2026-09-02-179` **cl.3** (the direction; `INV-scope` + `INV-owner` recorded open) · **cl.2** (D10 Panel-ratified) · `#decision-2026-09-02-173` / `-174` (the ratified public form)]
- [Source: `.decision-log.md#decision-2026-08-19-136` **cl.1** (must not hard-code — Trap 3) · **cl.2** (one stored name, N modes; `splitFirstNameLastInitial` IS the shield) · **cl.3** (scope vs authority) · `#decision-2026-08-21-145` cl.3 (mononyms — Trap 4)]
- [Source: `packages/domain/src/notifications/pool-identity.ts:1-14` (the four consumers + the *"two different pools"* property) · `:76` · `:120-127` (the PARTS shape)]
- [Source: `packages/domain/src/kyc/public-name.ts:73` (the Pariwar-configured public form) · `packages/contracts/src/public-pages/sahyog-drive.ts:96` (⛔ the public surface NEVER uses `resolvePoolIdentity`)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.1 item **(e)**. ⚠ Cite the ITEM LETTER, ⛔ not a line number]
- [Source: `_bmad-output/implementation-artifacts/11b-3b-…md` **D9(a)** — ⛔ NOT reversed; it ruled that 11b.3b does not resolve this, and `-179` cl.3 supplies the destination]
- Memory: [[project_death_is_an_overlay_not_a_state]] · [[project_contracts_domain_bundle_boundary]] · [[project_r7_fact_producer_unbuilt]] · [[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]]

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
| 2026-09-02 | ✅✅ **`INV-scope` RULED — ALL FOUR** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`). The full name renders on **every** consumer, including the **Contribution Note PDF** and the **cycle-open push / WhatsApp / SMS**. ⇒ ⭐ the inversion **CLOSES** (⛔ not narrowed — **Q2 VACATED**, so AC6's narrowed branch does not arise), ⚠ **on SHIP, ⛔ not on ruling**; and ⭐ **the resolver's *"one identity everywhere"* property is PRESERVED** — ⛔ no split, and a future divergence reverses `-180`. ⛔ **`INV-form` STILL BLOCKS, and this ruling made it matter MORE:** under all four, hard-coding the full name means a Pariwar that shields publicly still pushes a full name to handsets and into a forwardable PDF ⇒ the case for **mode-resolved** is materially stronger. ⚠ AC5's microcopy re-check is now **live, ⛔ not conditional**, and the **SMS segment length** must be measured (WA/SMS are the paid channels, reached when push fails). |
| 2026-09-02 | ⭐ **The `INV-scope` packet is WRITTEN AND ROUTED to the Panel** — `trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md`. ⏳ Routed, ⛔ nothing ratified; Task 0 stays a STOP gate. ⭐ **Three findings of the packet-writing pass, all verified:** ① the cycle-open notification **does** carry the name (`contribution-notify-triggers.ts:251-253` joins the parts; the copy renders *"Standing with {family}'s family"*) ⇒ consumer ④ is ⛔ not hypothetical · ② the audience is **bounded** — *"per member assigned to a pool in that cycle"* ⇒ the **pool roster, dozens**, and they are the contributors who see the full name in-app anyway ⇒ the real delta is *"also on a lock screen"*, ⛔ not *"to strangers"* · ③ ⭐ **the four consumers are the COMPLETE set** — `close-of-cycle`'s `{familyName}` has **zero production suppliers** and the Noticeboard renders none, so ⛔ **no fifth surface**. |
| 2026-09-02 | Story minted by **Panel direction** (`2026-09-02-179` cl.3 — *"the public/member inversion gap shall be closed"*), discharging **`INV-owner`**. ⭐ Against **Epic 8**, which owns `resolvePoolIdentity` and its four consumers (the **`7-11` precedent**: mint against the epic that owns the **write path**). Two decisions carried OPEN: **`INV-scope`** (⛔ the **Panel's** — two consumers leave the app, and the ruling does not distinguish push from pull) and **`INV-form`** (hard-coded vs mode-resolved — ⚠ hard-coding re-creates the inversion the moment a Pariwar shields publicly). ⚠ Two findings of the authoring pass: the resolver emits **PARTS**, so this is a **shape change** across four consumers plus a contract; and **mononyms already render in full** on the member side, so part of the "inversion" is ⛔ not real and must ⛔ not be reported as closed. |
