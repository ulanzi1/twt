---
baseline_commit: e3257b97bd50c935c026600c0df7e1c816e7ff71
---

# Story 11b.9: Sahyog Drive Publication Authority Switch — T&C-Basis Render Gate + `sahyog_drive_publication` De-authorisation `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` was run at authoring time
> ([[feedback_git_fetch_before_remote_reasoning]]). Every claim in this file was checked by **reading
> the named file at `e3257b9`** — ⛔ none is inherited from an epic line, a retro, or a prior story
> record. ⚠ `e3257b9` sits on **`governance/11b-consent-model`**, two governance commits ahead of
> `origin/main` and **⛔ not yet pushed**. **Branch off whatever `main` is when you start, and
> re-`fetch` first** — if the governance pair has not landed, ⛔ **do not start**: this story
> implements it.

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

> ⚠⛔ **PLACEMENT IS NOT YET RATIFIED.** `epics.md` enumerates Stories **11b.1–11b.8**; this is a
> **ninth**, created by a governance ruling rather than by the epic plan. ⛔ The `epics.md` story
> entry and the `sprint-status.yaml` row are **⛔ NOT created by this file** — both are planning acts
> owed before dev starts. See **§Owed before dev**.

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

## 🎯 What already exists — verified at `e3257b9`, ⛔ not inherited

| Thing | Where | State |
|---|---|---|
| The render gate to be replaced | `packages/domain/src/pool/public-read.ts:152-176` — `NAME_CONSENT_GRANTED(now)`, a set-based `EXISTS` over `consent_records` | ⭐ Shipped, correlated to `"claims"."deceased_member_id"` |
| The type constant | `packages/domain/src/pool/public-read.ts:116` — `SAHYOG_DRIVE_CONSENT_TYPE` | ⭐ Shipped |
| The API consumer | `apps/api/src/modules/public-pages/handlers.ts:430` — `if (!row.nameConsentGranted \|\| row.deceasedNameCiphertext === null)`, gating **before** the Tier-1 decrypt | ⭐ Shipped |
| Claim-screen box (d) | `apps/mobile/app/(claim)/consent.tsx:113 · :129 · :158 · :200-201` | ⭐ Shipped |
| Server-side box (d) | `apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts:76` · `dpdpa-consent-copy.ts:42` | ⭐ Shipped |
| **The T&C acceptance write path** | `apps/api/src/modules/terms/member-terms.routes.ts:43` → records a `tc_acceptance` consent, **`consent_artifact_ref` = the resolved `tcVersionId`** | ⭐ **Exists and is load-bearing** |
| **T&C acceptance is already mandatory** | `packages/domain/src/member/lock-in-gate.ts:70` — `consentExists(db, pariwarId, memberId, 'tc_acceptance', now)` is a **signup lock-in requirement** | ⭐ **Exists** |
| **Version → clauses** | `packages/domain/src/schema/terms_and_conditions_pinned_clauses.ts` — `(tc_version_id, clause_version_id, pariwar_id)`, real FK + cross-tenant domain pre-check | ⭐ **Exists** |
| **Stable clause identity** | `packages/domain/src/schema/clause_versions.ts:82` — `clauseId: text('clause_id')`, distinct from the per-amendment `clause_version_id` uuid | ⭐ **Exists** |

⇒ ⭐⭐ **THE PREDICATE NEEDS ⛔ NO NEW SUBSTRATE AND ⛔ NO MIGRATION.** It is an **existing join over
existing tables**. That is why `-160` clause 11 ruled the switch ships **now** while the acceptance
ceremony goes to v2.

---

## ⛔ THE FIVE TRAPS — read before writing a line

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

**T5. ⚠ TENANCY: THREE TABLES, THREE `pariwar_id`s.** `consent_records`,
`terms_and_conditions_pinned_clauses` and `clause_versions` each carry a tenant key, and
`pinned_clauses`' own header warns the FK *"targets the global PK and would happily link a DIFFERENT
Pariwar's clause version"* — the same-Pariwar guard is a **domain pre-check, ⛔ not the FK**. ⇒ every
join leg must be tenant-scoped **explicitly**; ⛔ do not rely on RLS alone inside a correlated
subquery on a public, unauthenticated route.

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
at all**: verified at `e3257b9`, they have ⛔ **no reader anywhere**, because 11b.3 and 11b.6 are
unbuilt. ⇒ ⛔ do not go looking for a gate to switch on (b)/(c); there isn't one.

**AC4 — ⛔ Nothing is deleted.** The `consent_type` enum value, **migration 0112**, the
`consentArtifactRef`/type plumbing in `@twt/contracts` and `@twt/domain`, and **every existing
`consent_records` row** remain. ⛔ No down-migration, ⛔ no enum surgery, ⛔ no row deletion.
⚠ A test asserts the enum value **still exists** — the guard against a future "cleanup".

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
pins the clause, the surface renders **every row unnamed** and that condition is **distinguishable in
diagnostics from "every member declined"** — a named, member-attributed diagnostic log
([[project_anonymous_diagnostic_log_convention]]). ⭐ This AC exists so the fail-closed day-one state
is ⛔ never debugged as a bug.

**AC9 — The record says why the preserved code is preserved.** In-place comments at the `consent_type`
enum, migration 0112, and the retired predicate's former site state that the type is **preserved by
ruling** (`-160` cl.5), is **write-never/read-never**, and ⛔ **must not be deleted without a separate
decision**. ⚠ ⛔ Not a commit message — the next reader is holding the **file**.

**AC10 — 11b.1's other invariants are untouched and proved so.** Pagination + caps, the district
freeze at the drive's close/settle instant, `NULLS LAST` ordering, the letter-code lookup, the
no-bulk-export posture, and the abuse counter all behave exactly as at `e3257b9`.

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ VERIFY THE GOVERNANCE LANDED FIRST.** Confirm `2026-08-28-160` + the signed
      consent sheet are on `main` ([[feedback_governance_commits_precede_implementation]]). ⛔ If they
      are not, **stop** — this story has no authority without them.
- [ ] **Task 1 — ✅ D6 RULED (a). Mint the clause through the AMENDMENT WORKFLOW, ⛔ not a seed.**
      ⚠ **The clause TEXT exists** (counsel, 2026-08-28 — T&C v0.2 clause 14, verbatim). ⛔ **What does
      not exist is the `clause_versions` row, and it may ⛔ not be inserted directly.**
      - [ ] Run the **Story 2.4 Niyamavali amendment cycle** for the disclosure clause: draft →
            **tone review by a NON-AUTHOR reviewer** → sign-off → **audit-logged publish**.
            ⚠ The sign-off is **content-hash-bound** — ⛔ any edit to the payload clears it and the
            cycle repeats. ⛔ **Do ⛔ not route around `requireToneReviewSignoff`.**
      - [ ] **Pin** the published clause version into the **effective** T&C version via
            `terms_and_conditions_pinned_clauses`. ⚠ Per-Pariwar — see **D4**.
      - [ ] Export a single constant for the **stable `clause_id`** in `@twt/domain` (alongside
            `SAHYOG_DRIVE_CONSENT_TYPE`, which stays). Document that it is a **`clause_id`**, ⛔ not a
            `clause_version_id`, and why (T3).
      - [ ] ⚠ **Sequencing:** the amendment cycle needs a **second human** (the non-author reviewer).
            ⛔ It is ⛔ not a dev-time step and ⛔ cannot be completed unilaterally — plan for it, ⛔ do
            not discover it at the end.
- [ ] **Task 2 — Build the predicate.** Replace `NAME_CONSENT_GRANTED` in
      `packages/domain/src/pool/public-read.ts` with the T&C-basis expression: `consent_records`
      (`tc_acceptance`, subject = `"claims"."deceased_member_id"`, existing validity window) →
      `terms_and_conditions_pinned_clauses` (cast-correct, defensive — T1/T2) → `clause_versions`
      (`clause_id` = the Task-1 constant). Tenant-scope **every** leg (T5). Keep it **set-based** (T4).
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
            ⛔ **Change the COMMENT only.** ⛔ Do ⛔ **not** touch `RULED_TIER1_PUBLIC_EXCEPTIONS`
            itself — the entry and its cited decision stay exactly as they are.
- [ ] **Task 4 — ⭐ WIDENED (`-162`): reduce the claim consent screen to box (a) alone.**
      Retire **(b) `sahyog_vivran_publication`**, **(c) `in_memoriam_listing`** and
      **(d) `sahyog_drive_publication`**. ⚠ **(a) `claim_time_dpdpa` stays byte-identical.**
      - [ ] `apps/mobile/app/(claim)/consent.tsx` — drop all three checkboxes, their state
            (`:113` and the (b)/(c) equivalents), their hydration (`:127-129`) and their submit
            fields (`:158`). ⚠ The screen's header comment describes **four** boxes — rewrite it, ⛔ do
            not leave it describing a screen that no longer exists.
            ⚠⭐ **The "declining never blocks the claim" reassurance copy loses its subject** — with
            only a **required** box left there is nothing optional to reassure about. ⛔ Do not leave
            orphaned reassurance text; re-read the whole screen as a user would.
      - [ ] `apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts:76` — stop writing all three.
      - [ ] Contract + i18n: retire the three request fields and the `dpdpa.sahyog_drive` /
            `dpdpa.sahyog_vivran` / `dpdpa.in_memoriam` copy keys from the **active** path.
            ⚠ ⛔ Do **not** delete the consent-copy records for **already-written** rows — historical
            rows must stay explicable.
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
- [ ] **Task 5 — Preserve, and say so (AC4 + AC9).** In-place comments at
      `schema/consent_records.ts`, `migrations/0112_consent-type-sahyog-drive.sql`, and
      `pool/public-read.ts`. Add the enum-still-exists guard test.
- [ ] **Task 6 — The inert-state diagnostic (AC8).**
- [ ] **Task 7 — Tests.**
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

## ⚖️ Decisions — ✅ D6 RULED · ⛔ FOUR STILL OPEN (D1 · D2 · D4 · D5) + D3's repo half

> ⚠ Unlike 11b.1, these are ⛔ **not** pre-ruled. Each changes the built shape.
> ⚠⭐ **UPDATED 2026-08-28 — counsel's clause landed, and it did ⛔ NOT open this story.** D3's
> **external** half is discharged (the text exists, verbatim, in T&C v0.2), ⛔ but its **repo** half is
> not — and integrating the clause **exposed D6**, a shape blocker that ⛔ did not exist when this
> file was written. ⇒ **five open became six.** ⛔ Do ⛔ not read "the clause arrived" as
> "ready to build".

**D1 — Does box (d) leave the UI, or merely stop being read?**
(a) ⭐ **Remove it** (recommended, and what AC3 is written to). The Panel said *"remove the family
tick-box from the active publication decision"*, and (d)'s **only** documented purpose is the Sahyog
Drive name (`consent.tsx:7`). Leaving a live checkbox that changes nothing is a **consent-theatre
defect** — it asks a grieving family a question with no effect.
(b) Keep it rendering, stop reading it. ⛔ Not recommended.
(c) Keep it and repurpose it for some other data class. ⛔ No such class is identified.

**D2 — Is the old predicate retired, or ANDed/ORed with the new one?**
(a) ⭐ **Retired** (recommended; AC1). `-160` cl.5 is explicit that the old behaviour stops being
authoritative.
(b) `OR` — either basis publishes. ⛔ Re-authorises the family tick-box the Panel just removed.
(c) `AND` — both required. ⛔ Restores the family veto that clause 6 deliberately removed.

**D3 — What is the clause's `clause_id` literal?** ⚠ **PARTIALLY RESOLVED 2026-08-28 — and resolving
it EXPOSED D6, which is now the harder half.**
✅ **The external half is discharged:** counsel delivered the clause text on 2026-08-28
(`2026-08-28-160` cl.4(b) / sheet A2.1), integrated **verbatim** as **clause 14** of
`handover/TWT-Terms-and-Conditions-DRAFT-v0.2-for-counsel-review.docx`. ⇒ ⛔ this story is **no longer
waiting on counsel** for content.
⛔ **The repo half is ⛔ NOT discharged.** The `clause_id` is an identifier **this repo assigns at
seeding time** — ⛔ counsel does not supply it. Nothing is seeded, nothing is pinned, and ⛔ **the
literal cannot be chosen until D6 is ruled**, because D6 decides whether a `clause_versions` row is
the right home for it at all.

**D6 — ✅ RULED (a) (BigDev, 2026-08-28 — `.decision-log.md#decision-2026-08-28-161`). MINT AND PIN.**
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
⚠ **The gap, verified at `e3257b9`:** `schema/terms_and_conditions_versions.ts:10-12` states in terms
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
it. ⛔ **Do ⛔ not start Task 2 before this is ruled** — it decides what Task 2 builds.

**D4 — Per-Pariwar divergence: is a Pariwar whose T&C omits the clause an error or a valid state?**
(a) ⭐ **Valid, inert** (recommended) — renders unnamed, AC8 makes it visible. Multi-Pariwar means
Pariwars will adopt T&C versions at different times.
(b) A provisioning error that blocks the surface. ⛔ Heavier, and ⛔ not what was ruled.

**D5 — Does this story touch 11b.6 (In Memoriam)?** ⭐ **Recommend NO.** `-160` cl.7 cleared it, but
11b.6 is `backlog` and unbuilt — it should be **built to the new basis from the start**, ⛔ not
switched afterwards. ⚠ 11b.3 likewise: it carries the **nominee's own Claim Terms** basis, which this
story ⛔ does not touch.

---

## ⛔ Owed before dev — planning acts this file does ⛔ NOT perform

1. **`epics.md`** — a Story 11b.9 entry. The epic enumerates 11b.1–11b.8; this is a ninth created by
   a **ruling**, not by the plan. ⚠ Per **AI-11a-1(b)** the reconciliation belongs in the document
   the next author reads.
2. **`sprint-status.yaml`** — an `11b-9-sahyog-drive-publication-authority-switch` row.
   ⛔ Not created here; a story file is ⛔ not a sprint-plan entry.
3. **D1–D5 ruled** by BigDev (D3 needs counsel's clause).

---

## Dev Notes

**Why this is a `[SURFACE]` story with no migration.** Every table it reads already exists and is
already load-bearing: `member-terms.routes.ts:43` has been writing `tc_acceptance` with the
`tcVersionId` in `consent_artifact_ref` since Story 3.6a, and `lock-in-gate.ts:70` already makes that
consent a **signup requirement**. ⇒ the "new" model is mostly **already built** — which is precisely
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
[[project_live_db_test_gotchas]]

---

## Dev Agent Record

_(empty until dev-story runs)_
