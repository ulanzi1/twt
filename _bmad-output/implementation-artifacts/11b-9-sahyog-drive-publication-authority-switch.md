---
baseline_commit: b87fb0450dc39a3dc00d94a9df49a279480fed57
---

# Story 11b.9: Sahyog Drive Publication Authority Switch — T&C-Basis Render Gate + `sahyog_drive_publication` De-authorisation `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐ **BASELINE RE-PINNED 2026-08-29 to `b87fb04` (= `origin/main`), and ⛔ NOT A SINGLE VERIFIED CLAIM MOVED.**
> The three commits since `b18d188` (`1fd985f` · `44ad1cb` · `b87fb04`) touched **only**
> planning artifacts, `package.json` and the new `scripts/provision-admin.ts` — ⛔ **no file this
> story cites for a line reference was modified**, checked with `git diff --name-only`. ⇒ every
> `:NNN` below still resolves byte-for-byte. ⚠ ⛔ Do ⛔ not re-verify them on the SHA change alone.
>
> ✅ **ORIGINALLY VERIFIED LIVE 2026-08-29 at `b18d188`.** `git fetch origin` was
> re-run ([[feedback_git_fetch_before_remote_reasoning]]) and every claim below was re-checked by
> **reading the named file at `b18d188`** — ⛔ none is inherited from an epic line, a retro, or a
> prior story record.
>
> ⭐⭐ **THE GOVERNANCE HAS LANDED — Task 0's precondition is SATISFIED.** Decisions **`-160` through
> `-167`** are all on `main` (verified in `.decision-log.md`), and the signed consent sheet is at
> `docs/knowledge-transfer/trustee-consent-sheet-2026-08-28-11b-consent-model.md`.
>
> ⚠⛔ **BUT THE OLD BASELINE SHA IS GONE, AND ⛔ NOT BECAUSE ANYTHING WAS LOST.** This file was
> authored against `e3257b9` on **`governance/11b-consent-model`**. That branch was **rebased onto
> `main`**, so every commit has a **new SHA** (`e3257b9` → `06626a4`, … `1f002c8` → `b18d188`) and
> `git merge-base --is-ancestor e3257b9 HEAD` returns **false**. ⛔ **Do not read that as "the
> governance never landed"** — the content is identical and present. ⭐ Branch off `main`.

> ⭐⛔ **READ THIS FIRST — THIS STORY CHANGES THE BEHAVIOUR OF MERGED, SHIPPED CODE, AND IT IS A
> GOVERNANCE CORRECTION, ⛔ NOT A FEATURE.**
>
> Story 11b.1 shipped a render gate that Decision `2026-08-28-160` has **de-authorised**. The surface
> currently decides whether a deceased member's name renders by reading a **tick-box the family
> ticked at claim time**. The Panel has ruled that the authority is the **member's own accepted
> versioned T&C**. Until this story lands, `/sahyog` reads the **superseded** authority.
>
> 1. ⛔⛔ **PRESERVE, ⛔ DO NOT DELETE.** `-160` clause 5 is explicit: the `sahyog_drive_publication`
>    consent type, **migration 0112**, and every existing `consent_records` row **STAY**. Deletion
>    requires a **separate** decision finding they have no remaining purpose. ⚠ After this story the
>    type is **write-never and read-never**, so it will look exactly like dead code to the next
>    reader — ⛔ it is not, and AC9 makes the record say so in place.
> 2. ⛔⛔ **"KEEP THE CODE" DOES ⛔ NOT MEAN "KEEP THE OLD BEHAVIOUR".** The old behaviour
>    (*family tick-box → name visible/hidden*) must **stop being authoritative**. ⛔ Leaving both
>    predicates live as an AND/OR is ⛔ **not** what was ruled — see **D2**.
> 3. ⛔ **THE FAMILY'S DECLINE PATH IS DELIBERATELY REMOVED** (`-160` clause 6, sheet Row 4). The
>    family does **not** get a veto over the member's own name. ⚠ 11b.1 shipped this gate as
>    *"declinable and revocable"* (`-159` D4(b)) — that is **reversed on purpose**. ⛔ A later reader
>    must ⛔ not restore it as a "missing feature".
> 4. ⚠⛔ **THIS STORY IS FAIL-CLOSED AND WILL LOOK BROKEN ON DAY ONE.** The new predicate reads
>    **false for every member** until counsel's post-death clause is drafted **and pinned into an
>    effective T&C version** ⇒ ⛔ **no names render at all**. ⭐ That is **correct, safe and expected**
>    — the surface is **inert, ⛔ not broken**. AC8 makes it observable so nobody debugs it as a bug.
> 5. ⭐ **WHAT IS SUPERSEDED IS THE MECHANISM, ⛔ NOT THE PER-DATA-CLASS BASIS.** C-5 fell **wholly as
>    a governance mechanism** — no per-subject consent gate is required on any 11b surface. ⛔ It did
>    ⛔ **not** make the member's T&C reach **anyone else's** data. Nominee information and bank
>    details rest on the **nominee's own Claim Terms**; family-owned information on the **family's own
>    consent**. ⛔ Nothing in this story may be cited to the contrary.

> **Governance basis (all committed, ⛔ none inferred):**
> `.decision-log.md#decision-2026-08-28-160` **clauses 3 · 4 · 5 · 6 · 7 · 11** ·
> `docs/knowledge-transfer/trustee-consent-sheet-2026-08-28-11b-consent-model.md` **Part A (counsel-signed) + Part B Rows 1 · 2 · 3 · 4 · 8** ·
> superseding `#decision-2026-08-23-154` **C-5** (mechanism only) and `#decision-2026-08-24-159` **D4(b)** (the gate's authority, ⛔ not its existence).

> **Depends on (all `done` + merged):** **11b.1** (the surface this corrects) · **2.6** (the T&C
> registry + `terms_and_conditions_pinned_clauses`) · **2.7** (the consent registry + `consentExists`)
> · **2.3/2.4** (`clause_versions` + the Niyamavali clause substrate) · **3.6a** (the signup
> `tc_acceptance` write path) · **6.9** (the claim-time DPDPA consent screen this story edits).

> ✅ **PLACEMENT IS NOW RECORDED — both planning acts are DISCHARGED (verified 2026-08-29).**
> `epics.md:5141` carries the **Story 11b.9** section with its dated **ADDED-BY-RULING** block
> (`epics.md:5143`), and `sprint-status.yaml:11747` carries
> `11b-9-sahyog-drive-publication-authority-switch: ready-for-dev`. ⚠ This story is still a **ninth**
> created by a **ruling** rather than by the epic plan — ⛔ that provenance is permanent and stays on
> the record. See **§Owed before dev** for what genuinely remains.

---

## Story

As a family who lost a member of this trust,
I want the decision about whether my relative's name appears publicly to rest on **what they
themselves agreed to while alive**, recorded against a specific version of the terms they accepted,
so that the trust neither asks me to speak for them at the worst moment of my life, nor publishes
their name on an authority nobody can point to.

---

## 📜 Policy meaning

The Trustee Panel ruled on **2026-08-28** that a member's own acceptance of a versioned T&C —
carrying an **express clause permitting post-death publication of their name** — is the basis for
publishing that name after they die. The family is not asked, because **the member already answered**.

⚠ **This is a narrowing of who gets asked, ⛔ not a widening of what gets published.** The Sahyog
Drive still shows exactly what 11b.1 shipped: pool code, district, close date, confirmed contribution
count, and the deceased member's name **where a basis exists**. ⭐ **The basis decides whether a row
is NAMED, ⛔ never whether it EXISTS** — that 11b.1 invariant is unchanged and AC5 re-proves it.

⛔ **And the nominee family identifier is still not rendered at all** (11b.1 AC11(a)). ⛔ Nothing here
touches it.

⛔⛔ **TWO CONJUNCTS THAT LOOK MISSING AND ARE ⛔ DELIBERATELY ABSENT — ⛔ do not add either.**
1. ⛔ **⛔ No "the accepted version is still EFFECTIVE" conjunct.** AC1/AC7 gate on the version the
   member **accepted**, ⛔ not on whether that version is still the Pariwar's current one. ⭐ The
   member consented to **what they consented to**; a later effective-window change is ⛔ not a
   withdrawal of their authority. ⚠ Adding `AND the version is effective` is the **10.10
   `is_valid: false` shape** exactly — a one-line conjunct carrying constitutional meaning that every
   CI gate stays green through.
2. ⛔ **⛔ No physical-document conjunct** — see Dev Notes (`-160` cl.8).

⚠⭐ **AND THE CONSEQUENCE A TRUSTEE WOULD ⛔ NOT EXPECT, STATED SO NOBODY DISCOVERS IT LATER:**
because the basis is **the version the member accepted**, publishing a **new** T&C version that
**drops** the clause ⛔ does **not** un-publish anyone who accepted an earlier version carrying it.
⭐ That is **correct** under `-160` — the authority is the member's own act, ⛔ not the Trust's current
text — but ⛔ **"amend the T&C" is ⛔ NOT an un-publish lever**, and a Panel that assumes it is will be
wrong. ⚠ Withdrawal runs through revocation of the member's own `tc_acceptance` (AC7), ⛔ nothing else.

**✅ Checked against the Niyamavali — and the result is ⛔ NOT a clean match, so it is stated plainly.**
**§4.4 (Transparency)** reads: *"Public rendering of any personal information is **consent-gated** and
never default opt-in."* ⚠ On its face that is **in tension** with this story, which rests publication
on a **condition of membership** (T&C clause 14) rather than on a separate, declinable act — the same
tension `-163` raised against draft Deed cl.15(c).
⭐⛔ **DISPOSITION (BigDev, 2026-08-29): the Niyamavali is ⛔ NOT RATIFIED.** It is part of the same
unexecuted, agent-drafted corpus as the Deed — a **design reference, ⛔ not binding authority**
(`docs/legal-corpus-location.md`, `2026-08-28-167`). ⇒ **§4.4 is ⛔ not a blocker, ⛔ not a conflict
with a binding instrument, and ⛔ NO Niyamavali amendment is required or routed by this story.**
⚠ What survives is **hygiene, ⛔ not compliance**, and it is **already inside Task 4**: two shipped
code comments cite §4.4 **as though it forbids** what the Trust has now decided to do. ⛔ A later
reader must ⛔ not resurrect §4.4 as an objection to a ruled model — and ⛔ must not cite it as binding
either.

---

## 🚦 Launch posture — ⛔ STILL BUILT-NOT-PUBLISHED

⭐ **The DPDPA hold is LIFTED** — `-160` clause 7 cleared all three 11b surfaces, superseding
`-157` cl.3. ⛔ **That does ⛔ not make `/sahyog` live.**

Per `-159` **D1** and `-160` clause 4(e), what keeps the surface dark is **deployment plus the
counsel/Panel process** — ⛔ **not** a code mechanism. ⛔ **The publication kill switch may ⛔ NOT be
cited as this surface's technical launch gate**: it is an **emergency operational control**, a missing
row resolves to **ENABLED by design**, and it is ⛔ not a consent mechanism
([[project_directory_launch_gated_on_killswitch_ui]]).

⚠ **The code is not in production and no members exist.** ⇒ there is ⛔ **no re-consent migration**
and ⛔ **no retroactive gap** — provided every member who ever joins accepts a T&C version already
carrying the clause. ⭐ That property is what made the deferral in **D5** safe; ⛔ it expires the day
a real member signs up.

---

## 🎯 What already exists — ⭐ RE-VERIFIED AT `b18d188`, ⛔ not inherited

| Thing | Where | State |
|---|---|---|
| The render gate to be replaced | `packages/domain/src/pool/public-read.ts` — the `sql` expression is **`:167-175`**; the doc-comment above it (carrying 11b.1's ⛔ **no-`::text`-cast** warning) opens `:151`. `NAME_CONSENT_GRANTED(now)`, a set-based `EXISTS` over `consent_records`; consumed at **`:398`** | ⭐ Shipped, correlated to `"claims"."deceased_member_id"` |
| The type constant | `packages/domain/src/pool/public-read.ts:116` — `SAHYOG_DRIVE_CONSENT_TYPE` | ⭐ Shipped |
| The API consumer | `apps/api/src/modules/public-pages/handlers.ts:430` — `if (!row.nameConsentGranted \|\| row.deceasedNameCiphertext === null)`, gating **before** the Tier-1 decrypt | ⭐ Shipped |
| Claim-screen boxes (b)/(c)/(d) | `apps/mobile/app/(claim)/consent.tsx` — header comment **`:4-7`** (names all four) · state **`:111 · :112 · :113`** · hydration **`:127 · :128 · :129`** · submit **`:156 · :157 · :158`** · `<ConsentRow>` blocks **`:189-193 · :194-198 · :199-203`** (labels `:192 · :197 · :202`) | ⭐ Shipped — ⚠ **all three** leave, per AC3 |
| Server-side box (d) | `apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts:76` · `dpdpa-consent-copy.ts:42` | ⭐ Shipped |
| **The T&C acceptance write path** | ⚠⛔ **CORRECTED — `-160` cl.11 cites `member-terms.routes.ts:43`, which is only the `r.post('/api/v1/member/terms/accept')` REGISTRATION.** The write is `apps/api/src/modules/terms/member-terms.handlers.ts` — effective version resolved **server-side** at `:132` (⛔ the client `tcVersionId` is advisory), `recordConsent` at **`:153`**, **`consentArtifactRef: tcVersionId` at `:157`** | ⭐ **Exists and is load-bearing** |
| **T&C acceptance is already mandatory** | `packages/domain/src/member/lock-in-gate.ts:70` — `consentExists(db, pariwarId, memberId, 'tc_acceptance', now)` is a **signup lock-in requirement** (`:44` — lock-in item **(d)**) | ⭐ **Exists**, re-verified |
| **Version → clauses** | `packages/domain/src/schema/terms_and_conditions_pinned_clauses.ts` — PK `(tc_version_id, clause_version_id)` at `:67`, `pariwar_id` at `:58`, real FKs at `:46`/`:54`, cross-tenant domain pre-check documented `:14` | ⭐ **Exists**, re-verified |
| **Stable clause identity** | `packages/domain/src/schema/clause_versions.ts:82` — `clauseId: text('clause_id')`, distinct from the per-amendment `clause_version_id` uuid | ⭐ **Exists** |

⇒ ⭐⭐ **THE PREDICATE NEEDS ⛔ NO NEW SUBSTRATE AND ⛔ NO MIGRATION.** It is an **existing join over
existing tables**. That is why `-160` clause 11 ruled the switch ships **now** while the acceptance
ceremony goes to v2.

---

## ⛔ THE SEVEN TRAPS — read before writing a line

**T1. ⛔⛔ THE CAST IS THE OPPOSITE OF 11b.1's CAST TRAP, AND GETTING IT BACKWARDS IS THE SAME 42883.**
11b.1 warns: *"⛔ NO `::text` CAST ON THE SUBJECT COMPARISON — `consent_records.subject_id` is a
`uuid` COLUMN … both sides are already uuid."* ⚠ **This story's join is the mirror image.**
`consent_records.consent_artifact_ref` is **`text` and NULLABLE with ⛔ no FK**
(`schema/consent_records.ts:235` — *"the ref is polymorphic across artifact tables; resolution is the
consumer's concern"*), while `terms_and_conditions_pinned_clauses.tc_version_id` is **`uuid`**.
⇒ this comparison **DOES** need an explicit cast, and ⛔ casting the wrong side (or neither) raises
`operator does not exist: uuid = text` (42883).

**T2. ⛔ `consent_artifact_ref` IS UNCONSTRAINED TEXT — A `::uuid` CAST CAN RAISE 22P02.** No FK, no
check, nullable. A row whose ref is `NULL`, `''` or any non-UUID string will make a naive
`consent_artifact_ref::uuid` throw **invalid input syntax for type uuid**, taking down the whole
public page. ⇒ **join defensively** (see AC2(c)); ⛔ do not assume every `tc_acceptance` row carries a
well-formed uuid just because the current writer happens to.
⭐⭐ **THE SAFE DIRECTION, NAMED SO IT IS ⛔ NOT RE-DERIVED AT THE KEYBOARD: CAST THE `uuid` COLUMN TO
`text`, ⛔ NEVER THE `text` COLUMN TO `uuid`** — `tcpc.tc_version_id::text = cr.consent_artifact_ref`.
⭐ `uuid → text` is **total** (every uuid has a text form) and settles T1; `text → uuid` is **partial**
and *is* T2. ⇒ **one cast, in one direction, closes BOTH traps**: a malformed, empty or NULL ref
simply fails to match and **excludes that member**, ⛔ it does not raise.

**T3. ⛔ MATCH THE STABLE `clause_id`, ⛔ NEVER THE `clause_version_id`.** The post-death clause **will
be amended** (it is Niyamavali content, and the Niyamavali is a rulebook that gets amended —
[[feedback_niyamavali_rulebook_not_spec]]). Pinning the predicate to a single `clause_version_id`
means the **first amendment silently un-publishes every name**. ⇒ resolve through
`clause_versions.clause_id`, so **any version** of the clause satisfies it.

**T4. ⛔ THE N+1 MUST NOT RETURN THROUGH THIS DOOR.** 11b.1's D7(a) forced the consent verdict to be
**set-based, one pass, correlated in SQL** — ⛔ never `consentExists` per row (*"`consentExists` is ONE
`LIMIT 1` QUERY PER SUBJECT. Calling it per rendered pool is 50 …"*, `public-read.ts:50`). ⚠ The new
predicate is a **two-join** subquery, so the temptation to hoist it into JS is stronger. ⛔ Resist it.
⭐ And the "change one, check the other" pairing in that file's comments must be **updated, not left
pointing at the retired predicate**.
⚠⭐ **AND THE PREDICATE ACQUIRES A ⛔ SECOND PAIRING THE FILE DOES ⛔ NOT YET NAME.** `public-read.ts:157`
today pairs the verdict with `consent/read.ts` (the validity window), and that half stays. The new
predicate is **also** coupled to the **T&C acceptance WRITER** —
`apps/api/src/modules/terms/member-terms.handlers.ts:157` writes `consentArtifactRef: tcVersionId`.
⛔ If that writer ever stores anything else in `consent_artifact_ref`, this predicate returns **false
for every member**, silently, with ⛔ no error anywhere and ⛔ no failing test. ⇒ record **both**
pairings in the comment.

**T5. ⚠ TENANCY: THREE TABLES, THREE `pariwar_id`s.** `consent_records`,
`terms_and_conditions_pinned_clauses` and `clause_versions` each carry a tenant key, and
`pinned_clauses`' own header warns the FK *"targets the global PK and would happily link a DIFFERENT
Pariwar's clause version"* — the same-Pariwar guard is a **domain pre-check, ⛔ not the FK**. ⇒ every
join leg must be tenant-scoped **explicitly**; ⛔ do not rely on RLS alone inside a correlated
subquery on a public, unauthenticated route.

**T6. ⛔⛔ THE CLAIM-TIME TUPLES FEED TWO EVENT PAYLOAD SCHEMAS — NARROWING THEM BREAKS REPLAY.**
`packages/domain/src/schema/consent_records.ts:160` (`CLAIM_TIME_CONSENT_TYPES`) and `:174`
(`CLAIM_TIME_PUBLICATION_CONSENT_TYPES`) are ⛔ **not documentation**:
`packages/domain/src/claim/events.ts:249` derives `claim.dpdpa_consent_recorded`'s
`consent_types_granted` from the first, and `:268` derives `claim.dpdpa_consent_revoked`'s
`consent_type` from the second. ⇒ **shrinking either tuple makes every HISTORICAL event carrying a
retired type UNPARSEABLE** — in a system whose `events_log` is the source of truth and whose reducers
must stay **total**.
⚠⭐ **AND THIS FILE HAS ALREADY PAID FOR EXACTLY THIS ONCE.** The tuple exists *because* the subset was
re-spelled in five places and one was missed: 11b.1's addition parsed fine at the API boundary and
then **500'd at the event append**, ⛔ only on the path where a family actually **ticked** the box —
and *"a test that appended the new field as `false` everywhere would have stayed green"*
(`consent_records.ts:148-156`, in terms).
⇒ ⛔⛔ **THE TUPLES DO ⛔ NOT SHRINK. Task 4 removes BOOLEANS FROM A REQUEST, ⛔ not values from a type.**

**T7. ⛔ `DPDPA_CONSENT_COPY` IS A `Record<DpdpaConsentType, …>` — YOU ⛔ CANNOT DELETE ITS ENTRIES.**
`apps/api/src/modules/claims/dpdpa-consent-copy.ts:21` is keyed **totally** over the enum AC4
preserves. ⇒ deleting the three entries is a **typecheck failure**, and the tempting fix — deleting
the enum values to make the Record legal again — is ⛔ **precisely the AC4 violation `-160` cl.5
forbids**. ⚠ Recognise that failure when you meet it; ⛔ do not "resolve" it downward.
⭐⭐ **THERE ARE TWO DIFFERENT THINGS CALLED "COPY", AND ⛔ ONLY ONE OF THEM LEAVES:**

| | What it is | Where | Fate |
|---|---|---|---|
| **UI labels** | the checkbox text the family reads | `packages/i18n/locales/en/claim.json:79 · :81` **and** `hi/claim.json:79 · :81` (⚠ **both** locales — there is an **i18n-parity CI leg**) | ⛔ **REMOVED** with the boxes |
| **Canonical evidence text** | the server-resolved copy recorded **against each written row** | `dpdpa-consent-copy.ts` `DPDPA_CONSENT_COPY` | ⭐ **STAYS** — it is what makes a historical row explicable, and it is read back **today** at `dpdpa-consent-helpline.spec.ts:177` |

⚠ The two are **byte-identical by design** (Story 6.9 — one source per locale), and
`apps/api/tests/unit/dpdpa-consent-copy.test.ts:38-41 · :69-71` asserts the type→key mapping. ⇒
changing one side without the other turns that test red for the **right** reason: ⛔ read it, ⛔ do not
delete it.
⭐ **The declinability sentence lives INSIDE each of the three label strings** (*"You may decline this
without affecting the claim."*), so it leaves with them — see Task 4.

---

## Acceptance Criteria

**AC1 — The render authority is the member's accepted T&C, ⛔ not the family's tick-box.**
`/sahyog` renders a deceased member's name **iff** that member holds a **valid `tc_acceptance`
consent** (`granted_at <= now AND (revoked_at IS NULL OR now < revoked_at)`, the existing
`consentExists` window) whose **accepted T&C version pins the post-death-publication clause**.
⛔ `sahyog_drive_publication` is **not consulted**.

**AC2 — The predicate is one set-based, tenant-scoped, defensive SQL expression.**
(a) Set-based and correlated in the Task-1 read — ⛔ **no per-row query** (T4).
(b) Every join leg tenant-scoped explicitly to the pool's `pariwar_id` (T5).
(c) The `consent_artifact_ref` → `tc_version_id` join is **cast-correct** (T1) **and** defensive
against malformed/NULL refs (T2) — a bad row **excludes that member**, ⛔ it does **not** raise.
(d) Resolution is through **`clause_versions.clause_id`** (T3), against a single exported named
constant — ⛔ never an inline string literal, ⛔ never a `clause_version_id`.

**AC3 — ⭐ WIDENED by `2026-08-28-162`: the claim consent screen reduces to box (a) ALONE.** All three
publication checkboxes — **(b) `sahyog_vivran_publication`**, **(c) `in_memoriam_listing`** and
**(d) `sahyog_drive_publication`** — are **removed** from the claim consent screen and from the
request contract, so ⛔ **no new rows of any of the three types are written**.
⚠ **(a) `claim_time_dpdpa` is UNCHANGED** — still required, still the basis for claim-time processing.
⛔ **RETIRED, ⛔ NOT REINTERPRETED** (`-162` cl.2): re-wording (b)/(c) to cover family content was on
the table and **rejected** — a box that survives by having its meaning quietly rewritten is worse than
no box, because the family reasons about it using the **old** meaning.
⭐ **An asymmetry the implementer must know** (`-162` cl.6): removing **(d)** is a **behaviour change**
— it has a live reader (`pool/public-read.ts`). Removing **(b)/(c)** changes ⛔ **no runtime behaviour
at all**: **re-verified at `b18d188`**, they have ⛔ **no reader anywhere**, because 11b.3 and 11b.6 are
unbuilt.
⚠⛔ **BUT A GREP WILL RETURN ~49 HITS IN `src` AND ⛔ ANOTHER ~73 ACROSS ELEVEN TEST FILES, AND THAT IS
⛔ NOT A CONTRADICTION — know the SHAPE before you doubt the claim** (counted at `b18d188`).
⛔⛔ **AND ⛔ DO NOT LET THIS LINE TEACH YOU TO WAVE GREP HITS AWAY: THE ~73 TEST HITS ARE ⛔ NOT
HARMLESS** — they are the eleven suites **Task 7** must migrate, and they will go red. It is only the
`src` hits that are inert; every one of those is a **declaration, a union member, copy, or a
comment**, ⛔ never a gate:
`schema/consent_records.ts:126/162/175` + `contracts/src/consent/consent-record.ts:48/49/56` +
`contracts/src/claims/dpdpa-consent.ts:67/89` (enum/union declarations — ⛔ **PRESERVED**, `-162` cl.5)
· `dpdpa-consent-copy.ts:26/30` (copy map) · `claims.dpdpa-consent.handlers.ts:70-71` (the **writer**,
which Task 4 removes) · `consent.tsx:5-6/127-128` (the screen Task 4 removes).
⭐ **There is ⛔ no `NAME_CONSENT_GRANTED`-shaped predicate for (b) or (c) anywhere** — that is what
"no reader" means, and it is the whole of the asymmetry. ⇒ ⛔ do not go looking for a gate to switch on (b)/(c); there isn't one.

**AC4 — ⛔ Nothing is deleted, and ⭐ WHAT COUNTS AS "NOTHING" IS ENUMERATED — ⛔ do not infer it.**
⛔ No down-migration, ⛔ no enum surgery, ⛔ no row deletion. ⚠ A test asserts the enum value **still
exists** — the guard against a future "cleanup".

| ⭐ **ONLY THESE SHRINK** | ⛔ **ALL OF THIS STAYS — deleting any of it FAILS AC4** |
|---|---|
| the **three booleans** on `RecordDpdpaConsentRequest` (`contracts/src/claims/dpdpa-consent.ts`) | the `consent_type` pgEnum + `ConsentTypeSchema` · **migrations 0112 AND 0058** · **every existing `consent_records` row** |
| the **three checkboxes** in `consent.tsx` + their state, hydration and submit fields | `DpdpaConsentType` (`dpdpa-consent.ts:65`) · `DpdpaRevocableConsentType` (`:86`) |
| the **three UI label keys** in `packages/i18n/locales/{en,hi}/claim.json` | `CLAIM_TIME_CONSENT_TYPES` · `CLAIM_TIME_PUBLICATION_CONSENT_TYPES` (`consent_records.ts:160 · :174`) — **T6** |
| | `DPDPA_CONSENT_COPY` (`dpdpa-consent-copy.ts:21`) — **T7** |
| | the `consentArtifactRef` / consent-type plumbing in `@twt/contracts` and `@twt/domain` |
| | ⭐ **the GET presence view** — `claims.dpdpa-consent.handlers.ts:52` (`ALL_TYPES = DpdpaConsentType.options`) and `:92` |
| | ⭐⭐ **BOTH REVOKE ROUTES** — member `claims.routes.ts:220` + helpline `claims.helpline.routes.ts:218`, and the `claim.manage_dpdpa_consent` key |

⭐⛔ **WHY THE REVOKE PATH SURVIVES A STORY THAT RETIRES THE BOX — ⛔ read this before you "finish the
cleanup".** Retiring the box stops **new** rows; it ⛔ does **not** extinguish the rights attached to
rows that already exist. ⚠ Revocation is the **only remaining data-subject action** on those rows,
and `-160` cl.5 preserves them precisely so they stay **actionable**, not merely stored. ⇒ ⛔ a family
that granted (b)/(c)/(d) **before** this story can still withdraw it **after**, and the GET presence
view still shows them what they granted. ⛔ **Removing either would be a rights regression wearing a
cleanup's clothes.**
⚠⛔ **PROVENANCE, ⛔ STATED ⛔ NOT DRESSED UP:** `-162` cl.5 preserves the **types, migration 0058 and
every existing row**, and `-160` cl.5 does the same for (d) — ⛔ but **neither ruling mentions the
revoke path or the presence view either way**. ⇒ this is **D7, ruled (a) by BigDev on 2026-08-29** at
**story level**: `-162` retired a **capture** surface and ⛔ not a **withdrawal** one, and preserving
rows means preserving what can be *done* with them, ⛔ not merely that they sit in a table.
⛔ **It is ⛔ NOT a trustee-ratified clause** and ⛔ must not later be cited as one
([[feedback_closure_language_precision]]). ⭐ It is also the **status-quo** option, which is why
adopting it needed no ratification — ⛔ **reversing** it would.

**AC5 — Consent decides NAME, ⛔ never ROW (11b.1's invariant, re-proved).** A pool whose deceased
member has **no basis** still appears with its code, district, close date and confirmed contribution
count. ⭐ Degradation stays **per-pool, ⛔ never per-page**.

**AC6 — The decrypt stays gated, and gated on the NEW predicate.** The Tier-1 name decrypt at
`handlers.ts:430` runs **only** when the new predicate is true — ⛔ the unauthenticated route must
never decrypt for a member with no basis. ⚠ The field is **renamed** from `nameConsentGranted` to a
basis-accurate name; ⛔ leaving the old name is a documentation defect, since the value no longer
reflects a consent.

**AC7 — Revocation and the missing case are the same verdict.** No `tc_acceptance`, a **revoked**
one, or an accepted version that **does not pin the clause** all yield **false**. ⛔ Fail-closed in
every direction.

**AC8 — The inert state is OBSERVABLE, ⛔ not silent.** When ⛔ no effective T&C version in a Pariwar
pins the clause, the surface renders **every row unnamed**, and that condition is **distinguishable
in diagnostics** — a named, member-attributed diagnostic log
([[project_anonymous_diagnostic_log_convention]]). ⭐ This AC exists so the fail-closed day-one state
is ⛔ never debugged as a bug.
⚠⛔ **THE CONTRAST PAIR IS ⛔ NOT "EVERYONE DECLINED" — ⛔ NOBODY CAN DECLINE ANY MORE.** The family's
decline path is gone by ruling and the member's clause is a **condition of membership**, so that
state is **unreachable by construction**. ⇒ the two states the diagnostic must **separate** are:
**(i) PROVISIONING-INERT** — ⛔ no effective T&C version in this Pariwar pins the clause, so ⛔ **no**
member in it can ever be named (the **D4** state, whole-Pariwar); versus
**(ii) PER-MEMBER** — the clause **is** pinned, but *this* member has ⛔ no valid `tc_acceptance`, a
**revoked** one, or one against a version that ⛔ does not pin it.
⛔ A diagnostic that cannot tell (i) from (ii) sends the first responder to the **wrong half of the
system** — and (i) is a **provisioning** answer while (ii) is a **member-record** one.

**AC9 — The record says why the preserved code is preserved.** In-place comments at the `consent_type`
enum, migration 0112, and the retired predicate's former site state that the type is **preserved by
ruling** (`-160` cl.5), is **write-never/read-never**, and ⛔ **must not be deleted without a separate
decision**. ⚠ ⛔ Not a commit message — the next reader is holding the **file**.

**AC10 — 11b.1's other invariants are untouched and proved so.** Pagination + caps, the district
freeze at the drive's close/settle instant, `NULLS LAST` ordering, the letter-code lookup, the
no-bulk-export posture, and the abuse counter all behave exactly as at **`b18d188`**.

---

## Tasks / Subtasks

- [x] **Task 0 — ✅ SATISFIED 2026-08-29. The governance is on `main`.**
      Verified at `b18d188`: `.decision-log.md` carries **`2026-08-28-160` through `-167`**, and the
      signed sheet is at `docs/knowledge-transfer/trustee-consent-sheet-2026-08-28-11b-consent-model.md`
      ([[feedback_governance_commits_precede_implementation]]).
      ⚠ ⛔ **Do ⛔ not re-open this on a SHA mismatch** — see the baseline banner: the governance branch
      was **rebased**, so `e3257b9` is genuinely absent from `main` while its content is present.
      ⭐ **Re-`fetch` and re-confirm anyway** if you start days later; ⛔ this tick is dated.
- [ ] **Task 1 — ⛔⛔ THE ONE TASK THAT WAITS. ✅ D6 RULED (a): mint the clause through the AMENDMENT
      WORKFLOW, ⛔ not a seed.**
      ⚠⛔ **GATED ON COUNSEL'S FINAL CLAUSE (D3, BigDev 2026-08-29).** The 2026-08-28 text below is
      **v0.2 DRAFT**, still in the Annex round. ⛔ **Do ⛔ not run the amendment cycle on draft text**:
      the sign-off is **content-hash-bound**, so a later edit clears it and the whole cycle repeats.
      ⭐⭐ **⛔ THIS DOES ⛔ NOT BLOCK TASKS 2-8.** They build against the **Task 2** constant and merge
      **inert** — see **D3**. ⚠ ⛔ Do ⛔ not treat Task 1 as a merge gate.
      ⚠ **The clause TEXT is reproduced below so the SHAPE is unambiguous.** ⛔ **What does not exist
      is the `clause_versions` row — and it may ⛔ not be inserted directly ⛔ nor stubbed.**

      > ⭐⭐ **THE TEXT, AND WHERE IT ACTUALLY LIVES — ⛔ DO NOT GO LOOKING IN `docs/legal/`.**
      > ⚠ Since **`2026-08-28-167`** the legal corpus is **⛔ NOT in this repository**: `docs/legal/`
      > is **`.gitignore`d on purpose** (the absence **is** the control) and its canonical home is the
      > **private** repo **`ulanzi1/twt-legal`** — see the tracked pointer `docs/legal-corpus-location.md`
      > ([[project_legal_corpus_private_repo_split]]).
      > ⭐ **But you do ⛔ not need that repo for this task.** The counsel-supplied clause is in a file
      > that **IS tracked here**, verified at `b18d188`:
      > **`docs/legal-counsel-engagement/handover/TWT-Terms-and-Conditions-DRAFT-v0.2-for-counsel-review.docx`**,
      > **clause 14 — “Public Disclosure of Member Information”**, marked *“Text supplied by counsel,
      > 28 August 2026. Reproduced verbatim.”*:
      >
      > > *As a condition of membership, every Member shall accept these Terms and Conditions and
      > > acknowledges that the Trust may, during the Member's membership and, where applicable, after
      > > the Member's death, make the Member's full name and other personal information provided to or
      > > held by the Trust available to Members and/or the public, as the Trust deems necessary for the
      > > establishment, administration, verification, transparency, operation and smooth functioning of
      > > the Trust and its programmes.*
      > > *The Member expressly authorizes and agrees to such disclosure as a term of membership. This
      > > authority applies to the Member's own personal information and continues, to the extent
      > > applicable, after the Member's death.*
      > > *The Trust shall determine, having regard to the purposes for which the information is
      > > required, what information is made available, to whom, and for how long.*
      >
      > ⛔ **Reproduce it VERBATIM into the clause payload.** ⚠ Any edit to the payload **clears the
      > content-hash-bound sign-off** and the tone-review cycle repeats — so get the text right the
      > **first** time.
      > ⚠⛔ **`docs/legal/terms-and-conditions.md` has only 13 sections and ⛔ NO clause 14.** That file
      > is also headed **“ALL INDIA PARIWAR WELFARE TRUST”**, ⛔ not Tirhut Wing Trust, and `-163`
      > recorded its status as **UNKNOWN**. ⛔ Do ⛔ not treat it as the source, and ⛔ do not
      > "reconcile" it as part of this story.
      > ⭐ **Clause 15** in the same v0.2 file is the **NOMINEE's** disclosure clause and belongs to the
      > **Claim Terms** (`-162` cl.1). ⛔ It is ⛔ not this story's basis and ⛔ must not be pinned here.
      - [ ] Run the **Story 2.4 Niyamavali amendment cycle** for the disclosure clause: draft →
            **tone review by a NON-AUTHOR reviewer** → sign-off → **audit-logged publish**.
            ⚠ The sign-off is **content-hash-bound** — ⛔ any edit to the payload clears it and the
            cycle repeats. ⛔ **Do ⛔ not route around `requireToneReviewSignoff`.**
      - [ ] **Pin** the published clause version into the **effective** T&C version via
            `terms_and_conditions_pinned_clauses`. ⚠ Per-Pariwar — see **D4**.
      - [ ] ⚠⭐ **THE SECOND HUMAN — RESOLVED TO A CONCRETE ACT, ⛔ NOT LEFT AS "PLAN FOR IT".**
            ⭐ Verified at `b18d188`. The sign-off is an **in-app act**, ⛔ not a document signature:
            **`POST /api/v1/p/:pariwarId/niyamavali/clauses/drafts/:draftId/tone-review`**
            (`apps/api/src/modules/rules/index.ts:410`), guarded
            `[requireAdminSession, scopeResolutionHook, requirePermissionHook('niyamavali.review')]`.
            `reviewedBy` is taken from **`request.requestContext.actorId`** — ⛔ it cannot be supplied
            in the body, so ⛔ **it cannot be faked from the author's session**.
            ⛔⛔ **THE GATE IS A BARE IDENTITY COMPARISON:** `signoff.reviewedBy === authoredBy` ⇒
            **409 `author-is-reviewer`** (`packages/domain/src/tone-review/gate.ts:94-105`). ⚠ It also
            denies on a **different-artifact** sign-off (`:80-92`, fail-closed). ⇒ the reviewer must be
            a **genuinely different account**, ⛔ not a second session or a role swap.
            ⛔⛔ **AND THE OBVIOUS CANDIDATE ⛔ DOES NOT WORK — CHECK THIS BEFORE YOU BRIEF ANYONE.**
            `state_trustee` **holds `niyamavali.review`** (`rbac/roles.ts:409`) ⛔ **but cannot use
            it**: `requirePermissionHook` defaults to **`dimension: 'pariwar'`**
            (`apps/api/src/modules/rbac/index.ts:136`), and a `state`-ceiling role is **fail-closed
            against a `pariwar`-dimension check** *"regardless of what grant row exists for it"*
            (`roles.ts:278-281`; [[project_rbac_geo_scope_containment]]).
            ⇒ ⭐ **THE ELIGIBLE REVIEWER IS A SECOND `pariwar_admin` (or `super_admin`) ACCOUNT IN THE
            SAME PARIWAR**, with an `actorId` different from the draft's author. ⚠ `pariwar_admin`
            holds **both** `niyamavali.amend` and `niyamavali.review` (`roles.ts:370-371`), so the
            **only** thing separating author from reviewer is the **identity check** — ⛔ which is
            exactly why it must be two accounts.
            ✅⭐ **⇒ THE ACCOUNT CAN NOW BE CREATED — `pnpm provision:admin` (added 2026-08-29).**
            `scripts/provision-admin.ts` creates the admin identity + the role grant out of band, and
            **proves the role can do the job** before writing: it validates the role against the
            DECLARED bundles and reports whether it holds `niyamavali.review` **and** whether its
            `scopeCeiling` can reach a `pariwar`-dimension check. ⚠ It **refuses** to write a
            pariwar-shaped grant for a narrower-ceiling role (the `state_trustee` trap, caught
            automatically). Idempotent; `PROVISION_DRY_RUN=1` writes nothing;
            `PROVISION_ALLOW_REMOTE=yes` is required against a non-local database.
            ⚠ Against a live environment it needs the API's KMS env (`KMS_TEST_MODE=live` + the
            `ADMIN_*_RESOURCE` vars) — ⛔ otherwise the email blind index is derived with the FAKE
            provider and ⛔ will not match what the running API computes.
            ⭐ **Verified end-to-end 2026-08-29** against the local DB: create → grant → enrollment
            token, re-run reused the admin and did ⛔ not duplicate the grant, and the verification
            rows were removed afterwards.

            ⚠⛔ **THE GAP IT CLOSED IS STILL WORTH KNOWING, because it explains why this was missing:**
            · `createAdminAccount` exists (`apps/api/src/modules/auth/admin/admin-auth.service.ts:271`)
            but ⛔ **no route calls it** — the admin auth surface is login / session / passkey /
            recovery / password-reset / logout **only** (`admin-auth.routes.ts:49-109`). Its **42**
            callers are ⛔ **all test fixtures**.
            · ⛔⛔ **`role_grants` has ⛔ NO WRITE PATH ANYWHERE IN `src`.** The only non-schema mention
            is a **type export** (`schema/role_grants.ts:93`). Every grant that has ever existed in
            this system is a **raw `INSERT` in a test fixture** (e.g.
            `apps/api/tests/integration/pariwar-provisioning.spec.ts:117 · :133`).
            · `/api/v1/provisioning/pariwars` provisions **Pariwars**, ⛔ not admins.
            ⇒ ⭐ **Stories 1.8/1.9 shipped the `users` + `role_grants` SUBSTRATE and ⛔ nothing was ever
            built to write it.** ⚠ This blocks ⛔ **every** Niyamavali amendment, ⛔ not just this
            story — the Story 2.4 workflow has ⛔ never been runnable by two real people.
            ⚠⛔ **AND IT IS ⛔ NOT FIXABLE BY A LOCAL `INSERT`.** The only databases reachable from a
            dev machine are **localhost:5432 / :5433** — dev and test — so a row written there
            ⛔ authorises nothing and ⛔ must ⛔ never be cited as "the second reviewer exists".
            ⭐ **Deployment tooling DOES exist** (`.github/workflows/deploy-staging.yml` ·
            `deploy-prod.yml`, Dokploy + Cloudflare/GCP terraform under `infra/`); ⚠ whether a
            staging/prod environment is currently **running** is ⛔ not determinable from the repo —
            **BigDev knows**, and the answer decides where any provisioning act has to land.
            ⭐⭐ **AND THE PRIMITIVES ARE ⛔ NOT MISSING — ONLY THE CALLER IS.**
            `createAdminAccount` (`admin-auth.service.ts:271`) and `mintEnrollmentToken` (`:194`)
            both exist, and the latter's own doc comment says it is *"an out-of-band enrollment link
            (bootstrap / post-reset) … **Issued by an ops/super-admin path (NOT a public route)**"*.
            ⇒ ⭐ the ops path was **designed and never written**. ⛔ The single piece with ⛔ no
            primitive at all is the **`role_grants` write**.
            ⭐ **Recorded observationally, ⛔ NOT routed and ⛔ not sized here**
            ([[feedback_gap_analysis_observational]]) — it is **BigDev's** call whether this becomes a
            story, a deployment, or an out-of-band act.
            ⚠ **Observational, ⛔ not this story's to fix:** `state_trustee`'s `niyamavali.review`
            grant is **inert by construction** — a key it can never exercise. ⛔ Recorded, ⛔ not
            raised as a defect and ⛔ not routed ([[feedback_gap_analysis_observational]]).
- [ ] **Task 2 — Build the predicate.** Replace `NAME_CONSENT_GRANTED` in
      `packages/domain/src/pool/public-read.ts` with the T&C-basis expression: `consent_records`
      (`tc_acceptance`, subject = `"claims"."deceased_member_id"`, existing validity window) →
      `terms_and_conditions_pinned_clauses` (cast-correct, defensive — T1/T2) → `clause_versions`
      (`clause_id` = the constant below). Tenant-scope **every** leg (T5). Keep it **set-based** (T4).
      - [ ] ⭐⭐ **FIRST — export the single `clause_id` constant in `@twt/domain`** (alongside
            `SAHYOG_DRIVE_CONSENT_TYPE`, which stays). ⚠ Document that it is a **`clause_id`**, ⛔ not
            a `clause_version_id`, and **why** (T3).
            ⚠⛔ **ITS VALUE IS PENDING COUNSEL'S FINAL CLAUSE (D3) — and that is ⛔ FINE.** ⭐ Ship it
            with a **provisional** value and a comment saying so. Until a matching `clause_versions`
            row exists and is pinned, the predicate is **false for every member** — **AC8's inert
            state**, ⛔ not a bug.
            ⛔⛔ **THIS CONSTANT IS THE ⛔ ONLY PLACE THE LITERAL MAY APPEAR.** ⛔ No inline string in
            the predicate, ⛔ none in the API layer, ⛔ **none in a test** (T3 / D3). ⇒ counsel's final
            answer is a **one-line** change.
            ⭐⭐ **⛔ DO NOT INVENT THE SHAPE — THERE IS AN ESTABLISHED PRECEDENT, VERIFIED AT
            `b18d188`.** Four exported policy clause-ids already exist and are built with the
            **`clauseId()` smart constructor**, ⛔ never a bare string:
            `member/lock-in.ts:26` `clauseId('niy.lock-in.policy')` ·
            `member/moderation/dwell.ts:57` `clauseId('niy.moderation.dwell')` ·
            `medical/ima-list.ts:21` `clauseId('niy.medical.ima-list')` ·
            `medical/concealment.ts:21` `clauseId('niy.concealment.r14')`.
            ⚠ **Use `clauseId()`** — it validates against `CLAUSE_ID_REGEX`
            (`packages/domain/src/ids/index.ts:149`) and throws `InvalidClauseIdError` on a malformed
            slug, so a typo fails at **module load**, ⛔ not silently at render time as an
            everyone-unnamed page.
            ⚠ **The format is `niy.<topic>.<slug>`** (optionally a third segment), lowercase kebab
            only: `/^niy\.[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)?$/`.
            ⭐ **RECOMMENDED PROVISIONAL VALUE: `niy.public-disclosure.member-information`** — valid
            against the regex, on-convention, and descriptive of T&C clause 14 (*"Public Disclosure of
            Member Information"*). ⚠ ⛔ **Provisional by D3** — counsel's final clause decides it, and
            changing it is the **one line** this seam exists to protect.
      - [ ] Update the file's *"change one, check the other"* pairing comments so they point at the
            **live** predicate, ⛔ not the retired one.
- [ ] **Task 3 — Rewire the API surface.** Rename the row field (AC6) through
      `apps/api/src/modules/public-pages/handlers.ts` and its contract; keep the decrypt gated
      **before** the Tier-1 read. Update `routes.ts:58`'s explanatory comment — it currently names
      `sahyog_drive_publication` as the gate.
      - [ ] ⚠ **AND FIX A STALE COMMENT IN THE MATRIX — routed here by `2026-08-28-163` finding 3.**
            `packages/contracts/src/public-pages/matrix.ts` describes 11b.1's Tier-1 exception as
            *"⚠ Consent-gated per subject (`sahyog_drive_publication`), which the directory's is
            NOT."* ⛔ **Stale as of `-160` cl.5 and `-162`** — that gate is de-authorised and the box
            retired. ⇒ rewrite it to name the **T&C-clause basis**.
            ⛔ **Change the COMMENT only** (`matrix.ts:396`). ⛔ Do ⛔ **not** touch
            `RULED_TIER1_PUBLIC_EXCEPTIONS` itself — the entry and its cited decision stay exactly as
            they are.
      - [ ] ⭐⭐ **AND THE SAME FALSIFIED SENTENCE IS IN ⛔ FOUR PLACES, ⛔ NOT ONE — `-163` finding 3
            routed only the `.ts` copy.** ⚠ Verified at `b18d188`. Fixing one and leaving three is
            the **`-166` cl.3 defect class repeating inside its own remedy**: the survivors then read
            as though they were checked.
            · `packages/contracts/public-pages/public-vs-private-matrix.yaml:367-368` — *"consent-gated
            per subject (`sahyog_drive_publication`) in a way this directory field is ⛔ NOT."*
            · ⛔⛔ **`…/public-vs-private-matrix.yaml:527`** — *"It renders only where
            `consentExists(…, 'sahyog_drive_publication')` holds at render time"*. ⚠ This one is
            ⛔ **not a comment**: the YAML is the **canonical matrix DATA the PII-scrape CI gate
            parses** (`packages/contracts/scripts/check-pii-scrape.ts:64`; `matrix.ts` is only its
            schema + parser). ⭐ The surrounding claims — *"consent decides whether a row is NAMED,
            never whether it EXISTS"*, per-pool degradation, the `full_name`/`shielded_name` form —
            all stay **TRUE**; ⛔ only the **basis** sentence moves.
            · `packages/contracts/public-pages/directory-abuse-rules.yaml:155-156` — same sentence.
            · `apps/api/tests/integration/login-wall.spec.ts:137` — the same sentence in a test
            comment (Task 7 territory, listed here so the sweep is complete).
            ⛔⛔ **RAIL — edit the `description:` PROSE ONLY.** ⛔ Do ⛔ not touch `escalations:`
            (`…matrix.yaml:624`), `escalation_count`, or any `tier1_public_exception` entry: those are
            cross-checked in **both directions** and a change there is a **governance act**, ⛔ not a
            comment fix.
      - [ ] ⚠⛔ **AND `routes.ts` ASSERTS A THREE-GATE LAUNCH POSTURE IN WHICH ⛔ ALL THREE GATES ARE
            NOW FALSIFIED** — `apps/api/src/modules/public-pages/routes.ts:63-70`, ⛔ a separate block
            from `:58`. ⚠ Verified at `b18d188`:
            **(1)** *"counsel's HELD DPDPA review of this exact subject (`2026-08-24-157` cl.3(a),
            returning 2026-09-07)"* — ⛔ **LIFTED** by `-160` cl.7 (see §Launch posture).
            **(2)** *"Row 17's ≥2-trustee publication posture extended by C-5"* — ⛔ **C-5 fell wholly
            as a mechanism** ([[project_11b_consent_model_c5_superseded]]).
            **(3)** *"the per-subject consent gate"* — ⛔ **de-authorised by this very story.**
            ⚠ And `:69-70` states *"Counsel HAS NOT REVIEWED this subject"* — ⛔ **false since
            `-160`**, which records counsel as **FULLY VERIFIED** and delivering the clause text on
            2026-08-28.
            ⇒ rewrite the block to the **actual** posture: what keeps `/sahyog` dark is **deployment
            plus the counsel/Panel process**, ⛔ **not** a code mechanism — and ⛔ **the publication
            kill switch may ⛔ NOT be written in as the technical gate**
            ([[project_directory_launch_gated_on_killswitch_ui]]). ⛔ Do ⛔ not simply delete the
            block: *"BUILT IS ⛔ NOT PUBLISHED"* is still **true**, and this file is where the next
            reader looks for it.
- [ ] **Task 4 — ⭐ WIDENED (`-162`): reduce the claim consent screen to box (a) alone.**
      Retire **(b) `sahyog_vivran_publication`**, **(c) `in_memoriam_listing`** and
      **(d) `sahyog_drive_publication`**. ⚠ **(a) `claim_time_dpdpa` stays byte-identical.**
      - [ ] `apps/mobile/app/(claim)/consent.tsx` — drop all three `<ConsentRow>` blocks
            (**`:189-193 · :194-198 · :199-203`**), their state (**`:111 · :112 · :113`**), their
            hydration (**`:127 · :128 · :129`**) and ⚠ **all three** submit fields
            (**`:156 · :157 · :158`** — ⛔ not just `:158`). ⚠ The screen's header comment (`:3-9`)
            describes **four** boxes — rewrite it, ⛔ do not leave it describing a screen that no
            longer exists.
            ⭐ **The reassurance copy needs ⛔ no separate hunt: it is embedded INSIDE each of the
            three label strings** (*"You may decline this without affecting the claim."*), so it
            leaves with them. ⚠ What **stays** is `dpdpa.processing_required_hint` (`:211-215`) —
            that belongs to **(a)** and is a *required*-box hint, ⛔ not an optional-box reassurance.
            ⭐ Still re-read the whole screen as a user would: a one-checkbox consent step reads
            differently from a four-checkbox one.
      - [ ] `apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts:70-71 · :76` — stop writing
            all three (`grantedTypesFromRequest`).
            ⭐ **ONE EDIT CLOSES BOTH SURFACES, and knowing that saves a hunt:** the helpline route
            `apps/api/src/modules/claims/claims.helpline.routes.ts:200` shares the **same**
            `createDpdpaConsentHandlers` core, so the operator-assisted path retires with the member
            one. ⭐ **Verified: there is ⛔ no admin UI rendering these boxes** — `apps/admin`'s only
            `dpdpa` hit is an unrelated helpdesk subcategory string.
      - [ ] Contract: retire the three **booleans** on `RecordDpdpaConsentRequest`. ⛔⛔ **That is the
            WHOLE of the contract shrink** — see **AC4's table** and **T6**: `DpdpaConsentType`,
            `DpdpaRevocableConsentType` and both claim-time tuples ⛔ **do not move**.
      - [ ] i18n: remove the `dpdpa.sahyog_vivran` / `dpdpa.in_memoriam` / `dpdpa.sahyog_drive` **UI
            label** keys from `packages/i18n/locales/en/claim.json:79 · :81` **and**
            `hi/claim.json:79 · :81`. ⚠ **Both locales, in the same commit** — there is an
            **i18n-parity CI leg**.
            ⛔⛔ **AND ⛔ NOT `DPDPA_CONSENT_COPY`** (`dpdpa-consent-copy.ts:21`) — that is the *other*
            thing called "copy", it is `Record`-total over the preserved enum, and it is what keeps
            **already-written rows explicable**. ⚠ See **T7** before you touch either.
      - [ ] ⛔ **PRESERVE the enum values and migration 0058** (`-162` cl.5) — retiring a **box** is
            ⛔ not deleting a **type**. Extend the AC9 in-place comments to cover (b) and (c).
      - [ ] ⚠⭐ **TWO STALE DEED CITATIONS FALL INSIDE THIS TASK — routed here by `2026-08-28-166`
            cl.3.** `packages/contracts/src/claims/dpdpa-consent.ts:110` and
            `apps/api/src/modules/claims/dpdpa-consent-copy.ts:39` both cite **Trust Deed cl.15(c)**
            as the reason claim-time publication consent is compulsory / not default-opt-in.
            ⛔ **Falsified twice over:** `-160` cl.3 superseded that mechanism, and this very task
            **retires the boxes those comments explain**. ⇒ rewrite both comments as part of the
            retirement. ⚠ ⛔ Do ⛔ **not** simply delete the Deed reference — the Deed is an
            **unratified draft** (`-164` cl.1), so if a citation survives it needs that qualifier.
      - [ ] ⭐⭐ **AND THE SWEEP CAUGHT ONLY ONE THIRD OF EACH COMMENT — AND ONLY TWO OF THE THREE
            SITES. READ ALL OF THEM BEFORE YOU EDIT.**
            ⚠ Verified at `b18d188`. **THREE** sites each cite **THREE** authorities — *"Niyamavali
            §4.4, Part 10 and Trust Deed cl.15(c) each **forbid**"* making publication consent
            compulsory / default opt-in:
            · `packages/contracts/src/claims/dpdpa-consent.ts:108-110`
            · `apps/api/src/modules/claims/dpdpa-consent-copy.ts:38-40`
            · ⛔⛔ **`packages/domain/migrations/0112_consent-type-sahyog-drive.sql:21-24`** — the
            **third site, ⛔ unrouted by `-166` cl.3**, and it goes further than the other two:
            *"IT IS DECLINABLE AND REVOCABLE, AND THAT IS NOT NEGOTIABLE … and — prevailing above
            both under cl.28 — Trust Deed cl.15(c)."* ⚠ **Task 5 sends you into this exact file** to
            add the AC9 preservation note — ⛔ do not add it beside a paragraph asserting the
            opposite. See **Task 5**.
            `-166` cl.3 routed **only the Deed third, of only two sites**.
            ⛔ **Fixing only that third leaves the comment still asserting that the Niyamavali forbids
            exactly what this story now does** — a worse artifact than before, because it now reads as
            though the remaining authorities were checked and survived.
            ⭐⛔ **THE DISPOSITION, RULED BY BigDev 2026-08-29: THE NIYAMAVALI IS ⛔ NOT RATIFIED
            EITHER.** It sits in the **same** corpus and the **same** category as the Deed —
            unexecuted, agent-drafted, a **design reference, ⛔ not binding authority**
            (`docs/legal-corpus-location.md`; `2026-08-28-167`).
            ⇒ ⭐ **the SAME "unratified draft" qualifier covers all three citations**, and ⛔ **NO
            Niyamavali amendment is required, owed, or routed by this story** — ⛔ there is no ratified
            instrument to amend. ⛔ Do ⛔ not open one, and ⛔ do not treat §4.4 as a blocker.
            ⚠ ⛔ Do ⛔ not silently delete the Niyamavali reference either: it records the Trust's
            **intended** model, which is legitimate to cite — ⛔ what is not legitimate is citing it
            **as though it binds** (the `-164` cl.5 / `-158` defect class, ⛔ not a new one).
- [ ] **Task 5 — Preserve, and say so (AC4 + AC9).** In-place comments at
      `schema/consent_records.ts`, `migrations/0112_consent-type-sahyog-drive.sql`,
      `migrations/0058_consent-type-publication.sql` and `pool/public-read.ts`. Add the
      enum-still-exists guard test.
      - [ ] ⛔⛔ **MIGRATION 0112 IS ⛔ NOT A BLANK MARGIN — RECONCILE WHAT IS ALREADY THERE.**
            ⚠ Verified at `b18d188`, its header asserts **five things this story falsifies**, and
            bolting an AC9 note onto the end without touching them produces a file that argues with
            itself:
            **(a)** `:21-24` — the three-authority *"DECLINABLE AND REVOCABLE … NOT NEGOTIABLE"*
            paragraph (the third citation site — see **Task 4**), incl. the **cl.28 prevailing
            hierarchy**.
            **(b)** `:24` — *"Making it mandatory would be a RULEBOOK AMENDMENT (routed 2026-08-24),
            never a migration."* ⚠ The routing it names is **discharged differently** than it
            anticipated: see §Policy meaning — ⛔ **no Niyamavali amendment is owed by this story**.
            **(c)** `:7-14` — the whole *"PERMANENTLY UNASKABLE cohort / minting PRE-LAUNCH makes it
            EMPTY BY CONSTRUCTION"* rationale. ⛔ **Moot**: nobody is asked again, ever. ⚠ ⛔ Do ⛔ not
            delete it — it is **why the type exists**, and AC9's whole point is that the next reader
            can tell preserved-by-ruling from dead code.
            **(d)** `:16-19` — *"IT GATES THE NAME, NEVER THE ROW"*. ⭐ **Still TRUE** (AC5). ⛔ Leave
            it.
            **(e)** `:26-33` — the ADD-VALUE / do-not-regenerate mechanics. ⭐ **Still TRUE.** ⛔ Leave
            them ([[project_live_db_test_gotchas]]).
            ⇒ ⭐ the note to write is: **preserved by `-160` cl.5 · write-never and read-never since
            11b.9 · ⛔ not deletable without a separate decision** — and the paragraphs above it
            **re-dated, ⛔ not erased**.
      - [ ] ⭐ **Extend the same treatment to migration 0058** (`-162` cl.5 preserves it identically)
            and to `schema/consent_records.ts:87-92` — the Story 6.9 D2 NOTE explaining that Epic 11b
            is the *"render-consumer"* of (b)/(c). ⛔ That consumer is now ⛔ never going to exist:
            11b.3 and 11b.6 are built to the **new** basis from the start (**D5**).
- [ ] **Task 6 — The inert-state diagnostic (AC8).**
- [ ] **Task 7 — Tests. ⭐ TWO HALVES: ELEVEN EXISTING SUITES TO MIGRATE, THEN THE NEW ONES.**

      > ⛔⛔ **THE MIGRATION HALF IS ⛔ NOT OPTIONAL AND ⛔ NOT DISCOVERABLE AT TASK 8.** ⚠ Verified at
      > `b18d188`: **~73 assertions across ELEVEN files** reference the three retired types. If you
      > reach `pnpm ci:local` without having read this list, you will meet a wide red surface with
      > ⛔ **no way to tell an EXPECTED break from a REGRESSION** — and the tempting "fix" for several
      > of them is restoring the behaviour this story removes. ⭐ **Work the list first.**
      >
      > | Suite | Why it goes red | ⭐ What it must BECOME |
      > |---|---|---|
      > | `packages/domain/tests/integration/pool/sahyog-drive-public-read.spec.ts` **`:310-386`** | 6 `nameConsentGranted` assertions on the retired predicate | ⭐⭐ **REWRITE, ⛔ do not delete.** `:376`'s case becomes the **de-authorisation proof** below; the rest re-express against the T&C basis. ⚠ Field renamed per **AC6**. |
      > | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts` **`:31 · :104`** | seeds `sahyog_drive_publication` rows to make a name render | ⭐ **REWRITE** to seed `tc_acceptance` + a pinned clause. |
      > | `apps/api/tests/integration/claims/dpdpa-consent.spec.ts` | `expectedGranted` cases + the *"FOURTH optional box"* comment (`:169`) | ⭐ Reduce to **box (a)**; ⛔ keep the revoke + presence cases (**AC4**). |
      > | `apps/api/tests/integration/claims/dpdpa-consent-helpline.spec.ts` | operator-assisted grant of (b) | ⭐ Same reduction; ⛔ **keep** `:177`'s canonical-copy read-back — it is **T7**'s evidence. |
      > | `apps/api/tests/unit/dpdpa-consent-copy.test.ts` **`:38-41 · :69-71`** | asserts the type→key map | ⛔ **KEEP GREEN, ⛔ do not narrow** — it guards **T7**. |
      > | `packages/domain/tests/claim/dpdpa-consent-events.test.ts` | event payloads carrying the three types | ⛔⛔ **MUST STAY GREEN UNCHANGED** — it is the live proof of **T6**. ⚠ If this goes red you narrowed a tuple. **Revert, ⛔ do not adjust the test.** |
      > | `packages/contracts/tests/claims-dpdpa-consent.test.ts` · `packages/contracts/tests/consent.test.ts` | enum/union lockstep | ⛔ **KEEP GREEN** — the pgEnum↔z.enum lockstep is untouched (**AC4**). |
      > | `packages/domain/tests/integration/consent/dpdpa-claim-consent.spec.ts` | `consentExists` over (b)/(c) | ⛔ **KEEP GREEN** — it tests the **registry**, ⛔ not the retired boxes. |
      > | `apps/api/tests/unit/dpdpa-consent-record-atomicity.test.ts` **`:80`** | two-box fixture | ⭐ Re-fixture to one box. |
      > | `apps/api/tests/integration/login-wall.spec.ts` **`:137`** | comment copy of the falsified gate sentence | ⭐ Rewrite with the **Task 3** sweep. |
      >
      > ⭐⛔ **THE DISCRIMINATOR, IN ONE LINE:** a suite that breaks because a **REQUEST** lost three
      > booleans is **expected** — migrate it. A suite that breaks because a **TYPE, TUPLE, ENUM or
      > COPY ENTRY** lost a value is a **⛔ VIOLATION OF AC4** — ⛔ revert the source, ⛔ never the test.

      - [ ] Domain integration (live DB): basis present → named; **no `tc_acceptance`** → unnamed;
            **revoked** → unnamed; **accepted version does not pin the clause** → unnamed;
            **different Pariwar's** clause version pinned → unnamed (T5); **malformed
            `consent_artifact_ref`** → unnamed, ⛔ no throw (T2).
      - [ ] ⭐ **A row-still-renders test for every unnamed case** (AC5) — ⛔ the whole-union assertion
            trap that made a 11b.1 fixture green on nothing must not repeat: assert the **row is
            present and the name is absent**, ⛔ not merely that the call succeeded.
      - [ ] API integration: decrypt ⛔ not called when the predicate is false (AC6).
      - [ ] A test proving `sahyog_drive_publication` rows are **ignored** — present-and-granted must
            ⛔ **not** produce a name on its own (the de-authorisation, proved).
- [ ] **Task 8 — `pnpm ci:local`** + the sprint-status ledger entry.

---

## ⚖️ Decisions — ✅ ALL SEVEN DISPOSED (BigDev, 2026-08-29) — D1 · D2 · D3 · D4 · D5 · D6 · D7

> ⚠ Unlike 11b.1, these were ⛔ **not** pre-ruled. Each changes the built shape.
> ⭐⭐ **UPDATED 2026-08-29 (BigDev) — ALL SEVEN ARE DISPOSED AND THE STORY IS BUILDABLE.**
> **D6(a) STANDS** (`-161`) and is ⛔ **CLOSED — ⛔ do not reopen it.** **D4(a)**, **D7(a)** and
> **D5(NO)** are adopted as ruled. **D3** is disposed as a **counsel-dependent SEAM**, ⛔ not a
> blocker: build on the D6(a) architecture **now**, leave the `clause_id` **literal** and the clause
> **content** pending counsel's final clause.
> ⚠⭐ **WHAT REMAINS IS ⛔ NOT A DECISION — it is counsel's final clause plus Task 1's NON-AUTHOR tone
> reviewer.** ⛔ Neither is a thing BigDev can rule; both are things that have to **arrive**.

**D1 — ✅ RULED (a) — ⛔ NO LONGER OPEN. Superseded by `2026-08-28-162` cl.2 (trustee-ratified).**
⭐ The question was *"does box (d) leave the UI, or merely stop being read?"*. `-162` answered it and
went **further than D1 asked**: **(b) and (c) leave too**, and the screen reduces to **box (a) alone**.
⚠ `-162` cl.2 also **rejected** the re-wording alternative on the record — *"a control that survives by
having its meaning quietly rewritten is worse than no control"*. ⇒ **AC3 + Task 4 already implement
this**; ⛔ nothing here is left for BigDev to rule.
⚠⛔ **The ledger line *"D1/D2/D4/D5 remain unruled"* is dated `2026-08-28d` (the `-161` entry) and
PREDATES `-162` (entry `2026-08-28f`).** ⛔ Do not read it as current.
> _Options as put, retained for the record:_ (a) ⭐ remove it — (d)'s only documented purpose is the
> Sahyog Drive name (`consent.tsx:7`), and a live checkbox that changes nothing is **consent theatre**;
> (b) keep it rendering, stop reading it — ⛔ not recommended; (c) repurpose it — ⛔ no such class
> identified, and ⛔ now foreclosed by `-162` cl.2.

**D2 — ✅ RULED (a) IN SUBSTANCE by `2026-08-28-160` cl.5 (trustee-ratified) — ⛔ treat as CLOSED.**
⭐ Verified in the clause text at `b18d188`: cl.5 states the prohibition **in both directions** and its
own table moves *"`sahyog_drive_publication` rows"* from **"the render gate"** to
**"historical / unused"**. ⇒ **retired**, ⛔ not ANDed or ORed. AC1 is written to this.
⚠ ⭐ **And `-162` has since made it mechanically moot as well:** with box (d) removed from the write
path, ⛔ **no new rows of that type are ever written** — so an `OR` would publish only for historical
rows and an `AND` would block **everything**, permanently.
> _Options as put, retained:_ (b) `OR` — ⛔ re-authorises the family tick-box the Panel removed;
> (c) `AND` — ⛔ restores the family veto `-160` cl.6 deliberately removed.

**D3 — ✅ DISPOSED (BigDev, 2026-08-29): the ARCHITECTURE is committed, the VALUE stays
counsel-dependent. ⛔ It is ⛔ NO LONGER A DEV BLOCKER.**
✅ **The external half is discharged:** counsel delivered clause text on 2026-08-28
(`2026-08-28-160` cl.4(b) / sheet A2.1), integrated **verbatim** as **clause 14** of
`handover/TWT-Terms-and-Conditions-DRAFT-v0.2-for-counsel-review.docx`.
⭐⛔ **THE DISPOSITION: build on the D6(a) architecture — Niyamavali clause + T&C pinning — but leave
the `clause_id` LITERAL and the clause CONTENT dependent on counsel's FINAL clause.** ⇒ **Tasks 2-8
are UNBLOCKED**; ⛔ only **Task 1's mint-and-pin** waits.
⚠⭐ **AND THE SEAM IS ⛔ ALREADY DESIGNED FOR THIS — ⛔ this is not a workaround.** **AC2(d)** already
requires resolution through **one exported named constant**, ⛔ never an inline literal. ⇒ counsel's
final answer changes **exactly one line**, and ⛔ nothing else in the predicate, the API surface or
the tests.
⭐⭐ **AND SHIPPING BEFORE THE CLAUSE EXISTS IS ⛔ NOT A DEFECT — IT IS AC8's INERT STATE, BY DESIGN.**
With no `clause_versions` row and nothing pinned, the predicate is **false for every member** and
⛔ **no name renders**. ⚠ That is the **fail-closed day-one posture** the Read-This-First banner
already promises and **AC8** already makes observable. ⛔ Do ⛔ not "fix" it, ⛔ do not seed a
placeholder to make it go away, and ⛔ do not gate the merge on it.
⛔⛔ **TWO THINGS THAT WOULD BREAK THIS AND ARE ⛔ FORBIDDEN:**
1. ⛔ **⛔ NO PLACEHOLDER `clause_versions` ROW.** A seeded stand-in makes names render on an authority
   that ⛔ **does not exist** — the exact defect this whole story corrects. ⚠ The **constant** may
   carry a provisional value; the **row** may ⛔ **not** be invented.
2. ⛔ **⛔ TESTS MAY ⛔ NOT HARDCODE THE LITERAL.** Live-DB fixtures create their **own** clause row and
   read the **constant** — so counsel's final value changes **one line** and ⛔ **zero tests**.

**D6 — ✅ RULED (a) (BigDev, 2026-08-28 — `.decision-log.md#decision-2026-08-28-161`). MINT AND PIN.**
⛔⛔ **RE-AFFIRMED 2026-08-29 AND ⛔ CLOSED — ⛔ DO NOT REOPEN.** ⚠ The options table below is retained
**for the record only**; ⛔ it is ⛔ not live, and ⛔ (b)/(c) are ⛔ not available to a later reader who
finds the pin-table join awkward. ⭐ The architecture is **settled**: Niyamavali clause + T&C pinning.
⭐ The disclosure clause is represented as a **Niyamavali clause** carrying a stable `clause_id` and
**pinned** into the effective T&C version. ⇒ **AC1/AC2(d) ship exactly as written**, on existing
substrate, ⛔ no migration — and `-160` cl.11's *"no new substrate"* sizing **survives**.
⚠⛔ **THE RULING COSTS MORE THAN IT LOOKS. IT IS ⛔ NOT A SEED SCRIPT.** Verified: `createClause` is
`packages/domain/src/niyamavali/write.ts:129` and publish is gated by `requireToneReviewSignoff`
(`apps/api/src/modules/rules/index.ts:464`). ⇒ minting runs the **Story 2.4 amendment workflow**:
draft → **tone review by a NON-AUTHOR reviewer** → sign-off (**content-hash-bound**, so any edit
clears it) → **audit-logged publish**. ⛔ **Do ⛔ not seed directly into `clause_versions` to skip the
gate** — the gate is why the rulebook is trustworthy.
⚠ **And the characterisation is on the record, ⛔ not inherited silently:** (a) asserts that a
**disclosure authorisation is a rulebook rule**. Supported by T&C v0.2 clause 17 (*"These terms are
tied to a version of the Niyamavali"*) — ⛔ but it is properly **counsel's** to confirm, and is put to
him in the v0.2 Annex round. ⛔ Ruled now because this story cannot be built without it; ⛔ **not**
ruled as beyond his revision.

> _The options as put, retained for the record:_
> **⛔⛔ THE BLOCKER WAS: counsel's clause arrived as T&C BODY TEXT; this story's predicate joins
> through the PIN TABLE. Those two do not meet.**
⚠ **The gap, re-verified at `b18d188`:** `schema/terms_and_conditions_versions.ts:11-13` states in terms
that *"The T&C only REFERENCES pinned clause versions by id (via the
`terms_and_conditions_pinned_clauses` junction table) — it never interprets the Niyamavali payload"*.
⇒ **`pinned_clauses` pins NIYAMAVALI clauses** (`clause_versions`); the T&C's own prose lives in
`terms_and_conditions_versions.body_markdown`. ⛔ **Counsel's disclosure clause is T&C prose.** As
drafted, AC1/AC2(d) would join to a `clause_versions` row that ⛔ **does not exist and has no obvious
right to exist**.
| | Option |
|---|---|
| **(a)** | ⭐ **Mint the disclosure clause as a Niyamavali clause too, and pin it.** The predicate ships **exactly as designed**, on existing substrate, ⛔ no migration. ⚠ Coherent with the T&C's own clause 17 (*"These terms are tied to a version of the Niyamavali"*) — ⛔ but it asserts that a **disclosure authorisation is a rulebook rule**, which is a real characterisation question and arguably counsel's, not the author's. |
| **(b)** | **Key the predicate off the T&C VERSION rather than a pinned clause** — e.g. a marker column on `terms_and_conditions_versions`. ⛔ Needs a **migration**, which is precisely what `-160` cl.11's "no new substrate" sizing assumed away. ⚠ A bare version-number threshold is ⛔ **not** acceptable: fragile, per-Pariwar, and silently wrong the first time a Pariwar's numbering diverges. |
| **(c)** | **Match on `body_markdown` content.** ⛔ **Rejected on sight** — a legal basis resolved by substring search over prose is the worst option available. Recorded only so nobody proposes it later. |
⚠ **Bearing:** (a) keeps `-160` cl.11's sizing honest (existing join, no migration); (b) invalidates
it. ⚠⛔ **The line that stood here — *"do not start Task 2 before this is ruled"* — is ⛔ SPENT.**
D6 was ruled (a) on 2026-08-28 and re-affirmed **CLOSED** on 2026-08-29; **Task 2 is buildable now**
(D3). ⛔ Retained only so the retired instruction is ⛔ not mistaken for a live one.

**D4 — ✅ RULED (a) (BigDev, 2026-08-29). Per-Pariwar divergence is a VALID, INERT state.**
⭐ A Pariwar whose effective T&C omits the clause renders **every row unnamed**; **AC8** makes that
visible and **distinguishes it from the per-member case**. ⇒ ⛔ **not** a provisioning error, ⛔ not a
hard failure, ⛔ it does not block the surface. ⚠ Multi-Pariwar means Pariwars adopt T&C versions at
**different times** — a build that treated ordinary rollout skew as an error would be wrong on day
one. ⇒ **AC8 ships as a DIAGNOSTIC**, exactly as written.
> _Option as put, retained:_ (b) a provisioning error that blocks the surface — ⛔ heavier, and it
> would convert normal rollout skew into an outage.

**D7 — ✅ RULED (a) (BigDev, 2026-08-29). The REVOKE routes and the GET presence view SURVIVE.**
⭐ Member `claims.routes.ts:220` + helpline `claims.helpline.routes.ts:218` +
`DpdpaRevocableConsentType` + the `ALL_TYPES`-driven presence view **all stay**, exactly as **AC4**
builds them. ⇒ a family that granted (b)/(c)/(d) **before** this story can still **withdraw** it
after, and can still **see** what they granted.
⚠ **Surfaced because `-160` cl.5 and `-162` cl.5 preserve the types and the ROWS and are ⛔ SILENT on
what may still be DONE with them** — so a dev "finishing the cleanup" would have removed the **last
remaining data-subject action** on preserved rows, with ⛔ nothing in the record to stop them.
⛔⛔ **PRECISION ON WHAT THIS IS — ⛔ do not upgrade it later.** A **BigDev story-level disposition
dated 2026-08-29**; ⛔ **not** a trustee-ratified clause, and ⛔ **not** a re-reading of `-160`/`-162`
([[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]]). ⭐ It is the
**status-quo** option — it preserves existing behaviour rather than changing it — which is why
adopting it needs no ratification. ⛔ **Reversing** it would.
> _Options as put, retained:_ (b) retire them with the boxes — ⛔ **rejected**: it converts a preserved
> record into an unactionable one, and ⛔ nothing in `-160`/`-162` asks for it; (c) route it to the
> Panel — ⛔ disproportionate, (a) being both free and reversible.

**D5 — ✅ RULED NO (BigDev, 2026-08-29). This story does ⛔ NOT touch 11b.6 or 11b.3.**
⭐ `-160` cl.7 cleared **In Memoriam** too, ⛔ but 11b.6 is `backlog` and **unbuilt** — it is built to
the new basis **from the start**, ⛔ never switched afterwards. ⚠ 11b.3 likewise: it rests on the
**nominee's own Claim Terms** — a **different data class on a different basis** — and this story
⛔ does not reach it. ⇒ ⛔ **no 11b.6 or 11b.3 file is edited here**, and a diff that touches either is
**out of scope**.

---

## ✅ Owed before dev — ⭐ ALL DECISIONS DISPOSED (BigDev, 2026-08-29); ⛔ TASK 1 ALONE STILL WAITS

✅ **1. `epics.md` — DISCHARGED.** The Story 11b.9 section is at `epics.md:5141`, carrying its dated
**ADDED-BY-RULING** block at `:5143` (per **AI-11a-1(b)**, in the document the next author reads).

✅ **2. `sprint-status.yaml` — DISCHARGED.** `11b-9-sahyog-drive-publication-authority-switch:
ready-for-dev` at `:11747`.

✅ **3a. Task 0's governance precondition — DISCHARGED.** `-160` … `-167` are on `main`.

✅ **3b. D1 · D2 · D6 — RULED.** D1 by `-162` cl.2; D2 in substance by `-160` cl.5; D6 by `-161`.

✅ **3c. EVERY DECISION IS DISPOSED (BigDev, 2026-08-29) — ⭐ NOTHING IS WAITING ON A RULING.**
**D6(a)** stands and is ⛔ **CLOSED, ⛔ do not reopen.** **D4(a)** · **D7(a)** · **D5(NO)** adopted.
**D3** disposed as a **counsel-dependent seam**, ⛔ not a blocker.

⛔ **3d. WHAT REMAINS IS ⛔ NOT A DECISION — it is two things that have to ARRIVE, and they gate
⛔ ONE task between them:**

| | What is owed | Who | Gates | ⭐ When / how it clears |
|---|---|---|---|---|
| **Counsel's FINAL clause** | the clause **content**, and through it the `clause_id` **value**. ⚠ The 2026-08-28 text is **v0.2 DRAFT**, back with counsel carrying **Annex Q9-11**. | **Counsel** | ⛔ **Task 1 only** | ⭐ **DATED, ⛔ not open-ended:** the T&C return is **due 2026-09-07, earliest 2026-08-31** (`-160` open follow-ups). ⇒ **2-9 days** from 2026-08-29. |
| **A SECOND REAL PERSON** | the tone-review sign-off needs a **different `actorId`** holding **`niyamavali.review`** at **`pariwar`** dimension. | **BigDev** (run the tool) **+ the reviewer** (the act) | ⛔ **Task 1 only** | ✅ **The TOOL now exists** — `pnpm provision:admin` (see **Task 1**). ⚠ What remains is ⛔ not technical: **a second human**, and an environment for them to log in to. |

⚠⭐ **AND `-160` cl.9 (trustee-ratified) ALREADY SAYS DEVELOPMENT PROCEEDS:** *"Development continues
on the current wording. The final T&C version before launch will align the wording to DPDPA.
⛔ Recorded as a **pre-launch obligation**, ⛔ **not a blocker**."* ⇒ ⭐ **Tasks 2-8 are not merely
permitted — they are the ruled posture.**
⭐⛔ **AND THAT MAKES "WAIT FOR THE FINAL CLAUSE BEFORE MINTING" A CHOICE, ⛔ NOT A CONSTRAINT — the
choice BigDev made on 2026-08-29, and here is the reason it is the right one.** Minting on the
current text would run the amendment cycle against wording still under **Annex Q11** (*does
family-owned information sit outside clause 14?*). ⚠ The sign-off is **content-hash-bound**, so if
Q11 moves clause 14 at all, the sign-off **clears** and the **second human has to be asked twice**.
⇒ ⭐ waiting ~9 days costs nothing; minting early risks spending the scarcest resource in this story
**twice**.

⭐⭐ **SO: BUILD TASKS 2-8 NOW.** They depend on the **architecture** (D6(a)), ⛔ not on the clause's
**value** — and **AC2(d)**'s single named constant is the seam that keeps it that way. ⚠ **Task 1
waits, and ⛔ only Task 1.**
⭐⛔ **THE STORY MERGES INERT, AND THAT IS ⛔ NOT AN INCOMPLETE BUILD.** No clause row, nothing pinned,
⛔ no name renders — **AC8's designed day-one state**. ⚠ ⛔ Do ⛔ not hold the merge for Task 1, and
⛔ do ⛔ not seed a placeholder clause to make the surface look alive. See **D3**.

---

## Dev Notes

**Why this is a `[SURFACE]` story with no migration.** Every table it reads already exists and is
already load-bearing: `member-terms.handlers.ts:153-157` has been writing `tc_acceptance` with the
server-resolved `tcVersionId` in `consent_artifact_ref` since Story 3.6a (⚠ ⛔ **not**
`member-terms.routes.ts:43`, which is only the route REGISTRATION — the `-160` cl.11 slip the
§What-already-exists table corrects), and `lock-in-gate.ts:70` already makes that consent a **signup
requirement**. ⇒ the "new" model is mostly **already built** — which is precisely
the finding that let `-160` clause 11 ship the switch now and defer the ceremony.

**What is NOT in this story, and where it went.** Scroll-through enforcement, the **digital
signature**, and the **90-day physical-document tracking** are **v2 / pre-launch** (`-160` cl.11,
sheet Row 8). ⚠ Deferral is safe **only** because the code is not in production and no members exist;
⛔ that property expires at first signup, and the ceremony must land before it does.

**The 90-day document has ⛔ no effect here.** Track-and-chase, ⛔ no punitive effect (`-160` cl.8):
the **digital acceptance is operative**, and a missing physical copy ⛔ must **not** stop publication.
⛔ Do not add a physical-document conjunct to the predicate.

**Related but ⛔ NOT this story:** Story 11b.3's per-Pariwar bank-detail **masking-delay** control
(`-160` cl.10). ⭐ Its shape precedent is `pool_fixed_amount_schedule`, itself modelled 1:1 on
`terms_and_conditions_versions`' effective-window. ⛔ Different surface, different data class,
different basis.

**Memory:** [[project_11b_consent_model_c5_superseded]] · [[project_consent_subject_key_convention]] ·
[[project_directory_launch_gated_on_killswitch_ui]] · [[project_death_is_an_overlay_not_a_state]] ·
[[feedback_supersede_never_reinterpret]] · [[feedback_spec_edits_must_propagate_to_tasks]] ·
[[project_live_db_test_gotchas]] · [[project_legal_corpus_private_repo_split]] ·
[[feedback_niyamavali_rulebook_not_spec]] · [[feedback_negative_claims_checkable_in_repo]] ·
[[feedback_git_fetch_before_remote_reasoning]] · [[feedback_gap_analysis_observational]]

---

## Dev Agent Record

_(empty until dev-story runs)_
