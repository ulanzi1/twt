---
baseline_commit: a231ca7b3e1ee8b7c8a63de3189095f5427706ea
---

# Story 11b.1: Sahyog Drive Active + Archive — Searchable, Paginated, No Bulk Export + Remembrance-Not-Analytics Invariant `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` was run at authoring time
> ([[feedback_git_fetch_before_remote_reasoning]]): `HEAD == origin/main == a231ca7`, zero ahead /
> zero behind, working tree clean. **Every claim in this file was checked by reading the named file
> at that tree** — ⛔ none is inherited from an epic line, a retro, or a prior story record. Branch
> off `main`; re-`fetch` before you branch.

> ⭐⛔ **READ THIS FIRST — THIS IS EPIC 11b's FIRST STORY, AND FOUR OF ITS ACCEPTANCE CRITERIA
> DESCRIBE THINGS THE SUBSTRATE CANNOT DO. Three of the four were found by THIS authoring pass and
> ⛔ nothing had recorded them.**
>
> 1. ⛔ **The visibility matrix's parser MECHANICALLY REJECTS the deceased member's name on this
>    surface.** `packages/contracts/src/public-pages/matrix.ts:376-395` permits **EXACTLY ONE**
>    Tier-1-PII-at-`public` field **matrix-wide**, and it is already spent on
>    `member-directory.member_name`. Publishing a deceased member's name here — in **any** form,
>    including first-name + last-initial — is a second one. **Both doors are shut:** an undeclared
>    rendered field fails the same gate fail-closed. ✅ **RULED D1(b) — the rule is WIDENED by ruling**,
>    and the name renders consent-gated (AC2). ⚠ That widening is a **governance change** owing its own
>    decision entry, ⛔ not a code edit.
> 2. ⛔ **There is NO name-search substrate, and there never has been.** `member_kyc_profiles` holds
>    `name_ciphertext` (Tier-1 envelope, one DEK **per row**) and ⛔ **no blind index**;
>    `searchMembers` supports exactly `memberId | mobileBlindIndex | pariwar`. ⇒ *"search … by
>    deceased member's name"* cannot be answered without decrypting **every candidate row on every
>    request**, on an **unauthenticated** route. ✅ **RULED D2(a) — search is district + date + pool
>    code; name search DEFERRED** on the `name_blind_index` trigger (AC3).
> 3. ⛔ **No consent type covers this surface.** The `consent_type` pgEnum's two publication values
>    are `sahyog_vivran_publication` (11b.3) and `in_memoriam_listing` (11b.6). ⚠ C-5 requires every
>    11b surface to declare **its own per-subject consent gate**, and this one has **nothing to
>    declare**. ✅ **RULED D4(b) — `sahyog_drive_publication` is MINTED** (AC12). ⭐⛔ **AND IT MUST BE
>    MINTED BEFORE LAUNCH:** consent is recordable only **pre-adjudication**, and pools spawn **one per
>    APPROVED claim** ⇒ by the time a pool exists the window has shut. Every claim filed before the type
>    exists is **permanently unaskable**. Pre-launch, that cohort is **empty by construction**.
> 4. ⚠ **Counsel's DPDPA clearance for this surface is HELD**, by name — `2026-08-24-157` cl.3(a):
>    *"11b.1 and 11b.6 publish DECEASED members and their FAMILIES. ⛔ The families accepted no Terms
>    of Service."* ⇒ ⛔ **this surface may be BUILT; it may ⛔ NOT be PUBLISHED.** See **§Launch
>    posture**.
>
> ⭐ **THE SHIPPED SHAPE, AS RULED:** a **pool-level transparency index** — Active and Archive,
> paginated, filterable by **district + date + pool code**, carrying **confirmed** contribution counts,
> Pool-Reality-#2 close-of-cycle framing, and the deceased member's **FULL NAME where the family
> consented** (D10 — ⚠ Panel ratification **owed**). ⭐ **Consent decides whether a row is NAMED, ⛔ never whether it EXISTS** — the
> index degrades **per-pool, never per-page**. ⛔ The **nominee family identifier** is ⛔ **not** rendered
> at all: a nominee never joined, so no membership term reaches them (AC11(a)).

> ✅ **ALL TEN DECISIONS RULED (BigDev, 2026-08-24): D1(b) · D2(a) · D3(a) · D4(b) · D5(a) · D6(a) ·
> D7(a) · D8(a) · D9(a) · D10.** ⚠ **D10 — the deceased member's FULL NAME — carries an OWED Trustee
> Panel ratification** (two committed records reserve a public name-form change to the Panel). It is
> **ruled and built to**, and **routed**; ⛔ do not record it as Panel-ratified until it is. ⇒ ⛔ **nothing in this file is conditional any more** — every `[GATED ON …]`
> marker is resolved in place, so a later reader ⛔ cannot take pre-ruling text as still governing.
> ⚠ **D1 was ruled AGAINST the recommendation**, deliberately and on a stated institutional-legitimacy
> ground; ⭐ that ruling then **vacated D4(a)**, which was re-put and re-ruled **(b)**. Both sequences
> are recorded at their decisions, ⛔ not tidied away.
> ⚠ ⭐ **RULED ≠ OPTIONAL.** D1(b) and D4(b) turn the matrix widening and the consent migration into
> **required work** (AC2, AC12), ⛔ not recommendations. ⛔ Durability is Task 0's `governance:` commit,
> ⛔ not this file.
>
> ✅ **D9 is a STANDING CONSTRAINT, ⛔ not this story's work** — it binds **11b.2** and **11b.3**, which
> own contributor lists; **11b.1 satisfies it vacuously** (⛔ no contributor rows at any grain).

> ✅ **AI-11a-1(b) FIRES ON THIS PASS AND IS DISCHARGED BY IT.** The retrospective's rule
> (`epic-11a-retro-2026-08-23.md:381`) is that a story-authoring pass which reconciles a defective AC
> writes the reconciliation **back into `epics.md`** as a dated `RECONCILED` block **in the same
> commit family** — *"so the correction lives in the document the next author reads"*. This pass
> found four defects; a `⛔ RECONCILED 2026-08-24 (AI-11a-1(b), Story 11b.1 authoring pass)` block is
> appended to the Story 11b.1 section of `epics.md`, ⛔ annotating and ⛔ never rewriting the ACs.
> ⚠ ⭐ **This is the FIRST instance of vehicle (b), and it is the vehicle the retro said was owed.**

> **Depends on (all `done` + merged):** **11a.1** (the FR-74 matrix + its parser + the escalation
> ledger) · **11a.2** (`apps/public` shell, `pagination.ts` — ⭐ which already names *"Sahyog
> archive"* in `PUBLIC_BULK_EXPORT_IS_FORBIDDEN`) · **11a.3** (the `/members` surface — ⭐ **this
> story's template in every respect**: the API hop, the forwarded address, the kill switch, the
> abuse counter, the cache/status branching) · **11a.4** (phone/email obfuscation) · **7.1/7.2**
> (the pool primitive + the dual identifier) · **7.8** (`close-of-cycle` framing — Pool-Reality #2)
> · **8.6/8.7/8.8** (`resolvePoolIdentity`) · **9.5** (`contribution.confirmed` as canonical
> financial truth) · **6.1/6.4** (`claims.deceased_member_id`, the account-frozen overlay).

---

## Story

As a non-member visitor or a member's family checking whether this trust actually moves money,
I want a **Sahyog Drive** page listing the drives that are running now and the drives that have
closed — one bounded page at a time, findable by district, date and pool code, each row carrying the
number of contributions **confirmed as money received**,
so that anyone can verify the trust's activity for themselves, without the page ever becoming a
leaderboard, a scoreboard, or a way to harvest who gave what.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces TWO predicates, and BOTH gate a RENDER, ⛔ never a benefit.**

**Predicate 1 — *"which pools appear on the public Sahyog Drive"*:** a pool is listed iff its
`pools.current_state` is `closed` (→ **Active**) or `settled` (→ **Archive**), and its Pariwar's
publication switch is on.

**In the member's terms:** *"a drive shows up on the public page once its collection window has
closed, and moves to the archive once the family has been paid. Nothing about which drives are
listed changes anyone's coverage, anyone's pool, or what anyone is owed."*

**Predicate 2 — *"whether that drive carries the deceased member's NAME"* (D1(b) + D4(b) + D10):** the
name renders iff `consentExists(…, 'sahyog_drive_publication')` is true at render time.
⭐ **It is stated separately BECAUSE IT IS THE ONE A READER WILL MISTAKE FOR THE FIRST.**

**In the member's terms:** *"if your family declines — or later withdraws — the drive still appears on
the public page, with its code, its district, its date and its contribution count. Your relative's
name is the only thing that goes. Declining removes a name, ⛔ never a drive, and ⛔ never anything
your family is owed."*

**Checked against the Niyamavali, and the two predicates return DIFFERENT results — ⛔ do not collapse
them:**
· **Predicate 1 — ⛔ no clause governs it, and that is the CORRECT result, ⛔ not a gap.** The
  Niyamavali governs eligibility, coverage, contribution and restoration. A public transparency index
  changes ⛔ no member's `is_valid`, ⛔ no `is_assignable`, ⛔ no pool assignment, ⛔ no claim outcome,
  and ⛔ no disbursement.
· **Predicate 2 — ⭐ §4.4 GOVERNS IT DIRECTLY, and this build COMPLIES.** *"Public rendering of any
  personal information is consent-gated and never default opt-in"*, reinforced by **Part 10**
  (*"Default opt-in is not permitted; an opt-out path is provided"*) and — ⭐ above both — **Trust Deed
  cl.15(c)**, which fixes the same posture for every 11b surface and **prevails** (cl.28). ⇒ the
  fourth box is **unchecked by default** and **revocable** (AC12), which is what §4.4 requires.
  ⚠ Making it mandatory would be a **rulebook amendment**, routed 2026-08-24 — ⛔ not this story's act.

⛔ **AND THE STORY-10.10 SHAPE IS FORBIDDEN HERE BY NAME.** This predicate reads `pools.current_state`
and a per-Pariwar publication flag. ⛔ Neither may be conjoined into, read by, or referenced from any
eligibility, assignability, validity, pool-assignment or peer-mesh path. `directory-read.ts` states
the same fence for `/members` (*"⛔ THIS MODULE DECIDES A RENDER, NEVER A BENEFIT"*) — copy that
posture verbatim into the new read module. A diff in which this predicate reaches an eligibility path
must be **rejected in review** ([[project_moderation_model_correct_course]]).

⚠ **AND ONE SHARP EDGE THE EPIC STATES ONCE FOR THE WHOLE EPIC (C-5), RESTATED HERE BECAUSE IT BITES
THIS STORY HARDEST.** `MEMBER_LIFECYCLE_STATES` carries ⛔ **no `deceased` label**; death is the
`account-frozen` **overlay**, ⛔ never a lifecycle label ([[project_death_is_an_overlay_not_a_state]]).
⇒ ⛔ **no predicate in this story may derive "is this member deceased?" from `members.state`.** It
does not need to: **the pool→claim link IS the death fact** (`pools.claim_id` →
`claims.deceased_member_id`). ⭐ The failure mode here is the **inverse** of Story 11a.3's and it is
⛔ not hypothetical — 11a.3 wrongly **published** a deceased member; a drive index filtered on
lifecycle state would wrongly **omit** the very people it exists to commemorate.

---

## 🚦 Launch posture — ⛔ BUILT IS NOT PUBLISHED

⚠ **Three independent gates stand between this code and a live page. ⛔ None discharges another, and
⛔ this story closes ⛔ NONE of them.**

| Gate | State at `a231ca7` | Who closes it |
|---|---|---|
| **DPDPA counsel review of THIS subject** | ⛔ **HELD.** `2026-08-24-157` cl.3 narrows the 2026-08-24 clearance to `/members` and **holds** A3.2/A3.3, naming 11b.1 in cl.3(a). ⭐ The T&C draft counsel cited as his basis was submitted 2026-08-24 and returns **2026-09-07**. ⚠ Write *"counsel has not reviewed X"* — ⛔ **never** *"counsel is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`). | Counsel's revisit — ⚠ ⭐ **D1(b) was taken WITH THIS HOLD OPEN**, deliberately. ⛔ Recorded, ⛔ not silent. |
| **Row 17 — ≥2-trustee publication ratification** | Row 17 is `closed` for `/members`. ⭐ C-5 extends the **posture** (⛔ not a new roster row) to 11b.1 · 11b.3 · 11b.6 → **AI-11a-5**. This surface has ⛔ **no ratification of its own**. | Trustee Panel |
| **The per-subject consent gate** | ✅ **RULED D4(b) — `sahyog_drive_publication` is minted by this story** (AC12), declinable + revocable. ⚠ It gates the **name**, ⛔ not the row. | This story builds the gate · ⚠ the **basis** for treating the name as constitutive is routed to the Panel + counsel (Niyamavali §4.4 / T&C amendment, 2026-08-24) |

⚠ **AND THE PULL-LEVER IS ⛔ NOT IMMEDIATE.** At `s-maxage=300`, a revoked consent or a pulled
Pariwar keeps being served **from every warm PoP, per page number**, for up to five minutes after the
switch flips. ⛔ **Direct SQL is NOT the operational fallback.** This is inherited unchanged from
`/members` and is ⛔ not softened by anything in this story.

⇒ ⭐ **What this means for the dev agent, concretely:** build it, test it, merge it. ⛔ Do **not**
write anywhere that Epic 11b is launch-ready, that the DPDPA question is settled, or that Row 17's
posture is discharged. ⛔ Do not enable the surface for any Pariwar.

---

## 🎯 What already exists — verified at `a231ca7`, not inherited

Every row checked by reading the named file at this tree.

| Claim | Verified state |
|---|---|
| A public list surface with pagination, caps, and a deep-page horizon exists | ⭐ ✅ **YES, and it is surface-generic already.** `apps/public/src/lib/pagination.ts` — `parsePageParams()` (⛔ no silent clamp: an over-cap request is **refused** with a decidable reason), `PUBLIC_PAGE_SIZE_MAX` = `PUBLIC_SURFACE_PAGE_SIZE_CAP` (50), `PUBLIC_PAGE_HORIZON` = `PUBLIC_DIRECTORY_PAGE_HORIZON` (200), `pageHref()`. ⛔ **REUSE IT — do not write a second parser.** ⭐ Its own doc-block already names *"the Sahyog archive"* (`PUBLIC_BULK_EXPORT_IS_FORBIDDEN`). |
| A public surface template exists | ⭐ ✅ **YES — `apps/public/src/pages/members.astro` is this story's blueprint.** Thin frontmatter, ALL display logic in a pure `lib/*-render.ts`, explicit `namespace` on every `t()`, `<MatrixField>` on every value, four distinct empty/failure states, cache/status branching. ⛔ **Do not invent a new page shape.** |
| `apps/public` can decrypt Tier-1 | ⛔ **NO, BY ASSERTION.** `apps/public/tests/no-kms-in-public.test.ts` scans the **whole app** for any encryption symbol or key reference. ⇒ any read needing a decrypt **must** go over the `apps/api` hop. ⛔ Do not add a `withPublicScope` member read here (`2026-08-20-143` cl.1). |
| A cross-app hop client exists | ✅ `apps/public/src/lib/directory.server.ts` — module-load-validated `API_ORIGIN` (throws in production if unset), 4s timeout, ⛔ **one attempt, no retry**, never throws, `ok:false` = **OUTAGE ⛔ never "empty"**. ⭐ `buildForwardedFor()` is **exported and pure** — ⛔ **reuse it verbatim**. |
| The forwarded address rule | ⭐ ✅ **RULED AND LOAD-BEARING.** `2026-08-21-145` cl.2: forward **ONLY `Astro.clientAddress`**; ⛔ **the inbound `X-Forwarded-For` chain is DISCARDED, never appended.** `apps/api` runs `trustProxy: true` and keys on the **leftmost** entry, so appending handed the attacker the rate-limit key **and** a fresh abuse-counter window per request. ⛔ Return `null`, ⛔ never `''` — an empty header reads as "no chain" and falls back to the SSR socket. |
| The anti-enumeration mechanism the epic AC points at | ⚠ **INHERITED AS A FLOOR, ⛔ NOT A CEILING — and the recorded IP is ⛔ NOT EVIDENCE** (`2026-08-21-145` RD2). `evaluateDirectoryAbuse` emits **a COUNTER, ⛔ not a forensic record**: no column stores query context, so the rule id + a coarse non-PII query shape ride `action` + `resource_locator`. ⛔ Never describe it as carrying the query. ⚠ And it runs **AFTER** the kill switch, deliberately. |
| A per-Pariwar publication kill switch exists | ✅ `packages/domain/src/member/directory-publication.ts` — `resolveDirectoryPublicationEnabled(db, pariwarId)`, default **`true`**, changes are a **GOVERNED ACT** (`UngovernedDirectoryPublicationChangeError`). ⚠ It is named for the **Member Directory**. Whether this surface reuses it or mints its own is **D3**. |
| The Row 17 admin UI | ✅ **SHIPPED 2026-08-24** — the kill switch is now an operational control, ⛔ no longer hand-run SQL. Row 17 is `closed`. ⛔ It is `closed` **for `/members`**; C-5 extends the **posture**, ⛔ not the closure, to this surface. |
| The 4-tier matrix declares Epic 11b surfaces | ⛔ **NO — DELIBERATELY.** `public-vs-private-matrix.yaml` says so in terms: *"Sahyog Drive, Sahyog Vivran and In Memoriam do not render and their field sets do not exist … **when 11b ships a route, the gate FAILS until it is declared here.**"* ⇒ ⭐ **declaring this surface is REQUIRED WORK of this story**, and the gate is what makes forgetting impossible. |
| ⭐⛔ A **second** Tier-1-at-`public` field can be declared | ⛔⛔ **NO. THE PARSER REJECTS IT, AT THE ROOT.** `packages/contracts/src/public-pages/matrix.ts:376-395` — *"EXACTLY ONE Tier-1 public exception is permitted matrix-wide"*, scoped at the root **on purpose** (*"a per-surface check would permit one exception on EVERY surface, which is a general door wearing the costume of an exception"*). ⚠ The filter is over **all fields of all surfaces** with ⛔ **no `renders:` exemption** — so the field cannot even be **pre-declared unbuilt**. The one exception is spent: `member-directory.member_name`. ✅ **RULED D1(b) — WIDENED by ruling**; the widening owes its own decision clause. |
| The 11a.3 exception's scope reaches this surface | ⛔ **NO, AND IT SAYS SO.** `public-vs-private-matrix.yaml`, `member_name.tier1_public_exception.scope`: *"⛔ It does NOT reach In Memoriam or Sahyog Vivran, which keep first-name + last-initial and are consent-governed in a way the directory is not; **changing those requires its own Panel ruling**."* ⚠ Sahyog Drive is not even named — it is **further** outside the fence, not nearer. |
| A resolver for the deceased family's shielded name exists | ⭐ ✅ **YES, COMPLETE.** `packages/domain/src/notifications/pool-identity.ts` — `resolvePoolIdentity()` returns `{ deceasedFirstName, deceasedLastInitial, poolLetterCode, poolName, poolCanonicalIdentifier, fixedAmount }`, joining `pools.claim_id → claims.deceased_member_id → member_kyc_profiles` and decrypting Tier-1. **Fail-soft**: unresolvable → `null`. ⚠ ⭐ **So the name is ONE CALL away — the blocker is ⛔ the matrix, ⛔ not the substrate.** Its three consumers today (8.6 card, 8.7 PDF, 8.8 notifications) are all **member-authenticated**; a public consumer would be the first. |
| ⭐⛔ A name **SEARCH** substrate exists | ⛔⛔ **NO, AND THERE NEVER HAS BEEN ONE.** `packages/domain/src/schema/member_kyc_profiles.ts:70-78` — `name_ciphertext`, `dob_ciphertext`, `photo_ciphertext`, all `piiColumn(1,'member_kyc')`, ⛔ **no blind-index column of any kind**. `member/search-read.ts:41-44` — `MemberSearchCriteria` is **exactly** `memberId | mobileBlindIndex | pariwar`. ⚠ Envelope encryption gives each name **its own DEK** ⇒ there is no ciphertext equality to match on. ✅ **RULED D2(a) — name search DEFERRED**; search is district + date + pool code. |
| The KMS cost of decrypting a page is bounded | ⚠ **ONLY BECAUSE 11a.3 BOUNDED IT**, and ⭐ **only inside `apps/api`'s existing handler** — ⛔ a new route inherits nothing. `handlers.ts:55` `DIRECTORY_DECRYPT_CONCURRENCY = 8` + `mapWithConcurrency` (`:205`). ⇒ ⭐ **this constant governs TWO things in this story and they are ⛔ not the same thing:** it is why **name search is not built** (Trap 2) *and* it is a **required control on the route you ARE building** (AC2 + Task 2). ⛔ Do not treat the second as discharged by the first. |
| A consent type covers Sahyog Drive | ⛔ **NO.** `packages/domain/src/schema/consent_records.ts:102-127` — the enum's two publication values are `sahyog_vivran_publication` and `in_memoriam_listing`, both added by **Story 6.9** (migration 0058), *"CONSUMED at publication-time by Epic 11b's render gate (`consentExists`)"*. ⛔ Neither names this surface. ✅ **RULED D4(b) — `sahyog_drive_publication` MINTED** (AC12). ⭐⛔ Cheap now, **impossible after launch**. |
| A pool LIST read model exists | ⛔ **NO.** `packages/domain/src/pool/` has `assign · contribution-binding · contribution-reference · cycle-events · errors · events · fixed-amount · fixed-amount-panel · names · naming · project · snapshot · spawn · state` — ⛔ **no list/index accessor of any kind.** ✅ **RULED D7(a) — ONE set-based query** with a lateral aggregate. |
| A per-pool confirmed-contribution **count** read exists | ⚠ **PER-POOL ONLY, AND IT RETURNS MEMBER IDS.** `contribution/read.ts:132` — `listConfirmedContributorsForPool(db, {pariwarId, poolId})` scans `events_log` for `contribution.confirmed` + its `reconciliation.*` reversals and reconciles the event-id chain **in JS**. ⇒ ⛔ **calling it per row is 25 event-log scans for one page** — the AR-65 N+1 Story 10.11 already paid 44s → 220s for. ✅ **RULED D7(a) — ⛔ never per-row.** |
| The canonical financial-truth event names | ✅ `contribution.confirmed` · `contribution.reconciliation-mismatch` · `contribution.utr-attested` ([[project_contribution_event_name_contract]]). ⛔ Yellow/attested/pending can ⛔ **never** enter a public count (Story 9.5). ⚠ A **reversal** is `reconciliation.*`, deliberately off the 8.10 `contribution.*` fence — ⛔ do not filter it out by prefix. |
| Pool-Reality #2 framing is a shared primitive | ✅ `packages/domain/src/close-of-cycle/framing.ts` — its header names *"Epic 11b's Sahyog Vivran (FR-77)"* as a consumer. ⭐ **`classifyCycleOutcome` QUARANTINES the target**: totals flow in, only the `CycleFundingOutcome` enum flows out, so a shortfall figure **physically cannot reach the copy path**. ⛔ Do not re-implement, and ⛔ do not pass a target into any render model here. |
| The `close-of-cycle` copy is inside the microcopy gate | ✅ **YES** — `microcopy.yaml:308-309`. ⭐ The `pool-reality-comparison` tone rule bites it: `fell short`, `shortfall`, `\d+% of the target`, `लक्ष्य से कम`… ⇒ a comparison-to-target frame **fails at PR time**. |
| ⭐⛔ The UX spec's Sahyog List columns are buildable | ⛔ **THREE OF TEN ARE NOT, AND TWO ARE MICROCOPY-PROHIBITED.** `ux-design-specification.md:1158` specifies `Donation ID \| Member ID \| HRMS \| Donor Name \| School \| District \| Block \| Pool \| Late Teacher \| Date`. Verified: ⛔ **no `donation_id`** anywhere in `packages/`; ⛔ **no HRMS field** on any member table; ⛔ **`Member ID` on a public wire is what 11a.3's handler refuses in terms** (*"⛔ No `member_id`"* — a per-member permalink is an enumeration primitive). ⚠ ⭐ **AND `microcopy.yaml:42` prohibits *"donor"* (→ *colleague / सम्मानित साथी*) and `:48` prohibits *"Late Teacher"* (→ *Deceased Member*)** — both `member_only: true`, so both bite the moment this surface's namespace enters `copy_globs`. ✅ **RULED D5(a) — the POOL index**; that table is 11b.2's on 11b.3's host, and the UX inventory owes an amendment. |
| `school` / `block` are available as columns | ⛔ **NO.** `school` and `designation` are **PERMANENTLY INELIGIBLE** (`-133` cl.1, `-132` cl.3); `block` is gated on `2026-08-19-137` cl.7(a)+(b) — a member-aware publish path **and** a member choice surface, ⛔ **neither of which exists**. ⚠ And they are **Pariwar-selected** directory attributes, ⛔ not a fixed column set: a Pariwar selecting neither renders neither, and the table **must degrade without them**. |
| An `apps/api` public route may simply be added | ⛔ **NO — `routes.ts` forbids a quiet addition in terms:** *"⛔ NO SECOND ROUTE. One collection-returning GET. If a follow-up needs another, it needs **its own allowlist entry, its own defence, and its own rate-limit choice** — ⛔ never a quiet addition here."* ⇒ ⭐ **that is this story's Task, spelled out by the file it edits.** The two places the decision is defended in writing are `routes.ts`'s header and `login-wall.spec.ts`'s allowlist entry, and **their control counts must match**. |
| An accessibility CI gate exists | ⛔ **NO.** 19 gate directories in `scripts/`; ⛔ none is an a11y gate. ⭐ **Accessibility is FAMILY 13 of the load-bearing-invariant checklist** (`_bmad/custom/load-bearing-invariant-checklist.md`, added 2026-08-24, live on merge via `bmad-code-review.toml:9`). ⚠ It applies to **every COMPONENT or SURFACE story** — this is one. Its four checks are RN-shaped; **AC10** states the web equivalents. ⚠ Mechanization is re-examined at **11b.8**, ⛔ not here. |
| `apps/public` depends on `@twt/ui` | ⛔ **NO — and this story does ⛔ NOT add it.** C-1 ruled the addition is *"an ordinary dependency addition, ⛔ NOT a governance reversal"*, but its consumers are **11b.2 / 11b.5 / 11b.7**. ⛔ Do not add the dep here for a surface that needs no presenter ([[feedback_no_premature_package]]). |
| `.decision-log.md` head | `2026-08-24-158`. ⛔ **Do not hardcode the next number** — read the head **live** at implementation time. |
| i18n | ⚠ `t()` **defaults to `common` and THROWS** on a miss ([[project_missed_cycle_visibility_substrate]]). ⭐ The 11a.2 defect — `{{max}}` vs `{max}` — made `/members` throw on **every** request and ⛔ **no test caught it, because every test bypassed `t()`**. A new namespace must be registered in **both** literals of `packages/i18n/src/catalog.ts`. |

---

## ⛔ THE SEVEN TRAPS — read these before anything else

### Trap 1 — ⭐⛔ THE MATRIX PARSER IS THE BLOCKER, ⛔ NOT THE CRYPTO. Both doors are shut.

It is natural to read *"public visitor sees first-name + last-initial"* and reach for
`resolvePoolIdentity()`, which returns exactly that. **The resolver works.** What stops you is one
`superRefine` at `matrix.ts:376-395`:

```
EXACTLY ONE Tier-1 public exception is permitted matrix-wide, found 2:
member-directory.member_name, sahyog-drive.deceased_member_name.
```

⚠ **And you cannot dodge it by not declaring the field.** The same gate is **fail-closed** in the
other direction: *"a rendered field this file does not declare is a leak"*, and
`membersSurfaceFieldIds(model)`-style derivation (`surface-fields.ts`) **throws** on a model key with
no mapping. ⇒ ⛔ **declared → parser rejects; undeclared → gate rejects.** There is no third door that
is not a ruling. ✅ **RULED D1(b): the rule IS widened — by a ruling, in Task 3c, after Task 0's decision entry exists.** ⚠ It stays an **enumerated** admission: a **third** exception must still FAIL, and Task 3c proves it with a planted third.

⛔ **AND THE FOUR NON-DOORS, NAMED SO NOBODY TRIES THEM:** ⛔ do not lower `pii_tier` to 2 or 3 (it is
*"a FACT ABOUT THE DATA, never a visibility control"* — `matrix.ts:125`) · ⛔ do not add a second
`escalations:` entry (an escalation records a **tier move**, ⛔ not a licence for a Tier-1 render) ·
⛔ do not compute the name inline in the `.astro` frontmatter to dodge the model-key derivation (a
**convention violation before it is a gate evasion** — `surface-fields.ts:16-27`) · ⛔ do not widen
the `superRefine` (that is **D1(b)**, a ruling, ⛔ not a code change).

### Trap 2 — ⭐⛔ "SEARCH BY NAME" IS NOT A MISSING FEATURE. IT IS A MISSING COLUMN, AND THE OBVIOUS WORKAROUND IS AN ATTACK.

There is ⛔ **no `name_blind_index`**. Envelope encryption gives each name its own DEK, so two members
named *Sushil Kumar* have **unrelated ciphertext** — there is nothing to `WHERE` on.

⚠ **The workaround that will occur to you — decrypt the roster and filter in JS — is the exact
amplification lever `DIRECTORY_DECRYPT_CONCURRENCY = 8` was introduced to close**, one order of
magnitude worse: a page decrypt is **50 rows per request**; a name search is **the whole roster, per
request, per keystroke**, with the cache **structurally unable to help** (every query string is a
fresh key). ⛔ **Do not build it.** ✅ **RULED D2(a): ⛔ not built.** Search is district + date + pool
code; name search is deferred on the `name_blind_index` trigger.

⚠ ⭐ **AND ⛔ DO NOT OVER-READ THIS TRAP INTO REFUSING THE DECRYPT YOU ARE ⛔ REQUIRED TO DO.** D10 puts
one decrypt on **each consented row of the page you already selected** — ⛔ bounded, ⛔ cacheable,
⛔ nothing like a roster scan. ⇒ **AC2 + Task 2 are the canonical statement of how to do it safely;**
⛔ this trap is about **search**, ⛔ not about rendering.

### Trap 3 — ⛔ THE AUTHENTICATED TIER HAS NO VIEWER, AND THAT IS ALREADY RULED. ⛔ Do not re-litigate it.

The AC reads *"public visitor sees first-name + last-initial; **authenticated sees fuller**"*.
⛔ **That authenticated tier has no viewer** — ⛔ no browser surface holds or presents the member
token, `apps/` holds `admin · api · jobs · mobile · public`, and there is ⛔ no `apps/member-web/`
([[project_no_browser_member_token_surface]]).

⭐ **`2026-08-23-154` already ruled it: DISPOSITION (c)** — search ships **public-tier-only**, and the
authenticated tier is **deferred** onto the browser-member-token trigger. ⚠ **Resolved via explicit
deferral, ⛔ not *Closed by [edit]*** ([[feedback_closure_language_precision]]). ⛔ Do not build an
authenticated tier, ⛔ do not add an `Authorization` path, ⛔ do not re-raise the question.

⚠ ⭐ **AND HOW THAT DEFECT SURVIVED IS THE WARNING FOR THIS PASS:** two prior reconciliations (2026-08-19
and 2026-08-23) both **edited this exact AC** and neither asked whether the tier had a viewer. *"A
reconciliation answers the question it was pointed at; it does ⛔ not sweep the sentence it edits."*

### Trap 4 — ⚠ D10 MOVED THE *DECEASED MEMBER'S* NAME FORM. ⛔ IT MOVED NOTHING ELSE.

✅ **RULED D10 (BigDev, 2026-08-24): the DECEASED MEMBER's name renders in FULL** on this surface, in
the Pariwar's configured form. ⚠ **Ratification is OWED** — see D10; two committed records reserve a
public name-form change to the **Trustee Panel**, and it is routed.

⛔⛔ **AND THE FENCE AROUND D10 IS NARROW. THREE THINGS IT DOES ⛔ NOT TOUCH:**
· ⛔ **Contributor and donor name forms** on this surface remain **UNRULED**, exactly as the 2026-08-19
block left them. `-135`/`-136` still ⛔ does not reach them, and ⛔ neither does D10 — it is a ruling
about **the person the drive is FOR**, ⛔ not about the people who gave.
· ⛔ **The nominee / family identifier** — ⛔ not rendered at all (AC11(a)). Deed 15(c) names *"nominee"*
expressly.
· ⛔ **11b.3 and 11b.6.** D10 is scoped to **this surface**. ⚠ The matrix exception's own `scope:` text
asserts that In Memoriam and Sahyog Vivran *"keep first-name + last-initial"* — ⛔ **do not read D10 as
having moved that**; those are their own stories' rulings to seek.

⚠ ⛔ And ⛔ do **not** read the SD-2 deferral as having settled anything here: *"a deferral of the
authenticated tier is ⛔ not a ruling on the public tier's name form"*
([[feedback_supersede_never_reinterpret]]).

### Trap 5 — ⚠ THE EPIC AC AND THE UX SPEC DESCRIBE TWO DIFFERENT TABLES.

The epic AC describes a **POOL index** (*"per-pool entries show confirmed contribution count, pool
name, nominee family identifier, close-of-cycle framing"*). `ux-design-specification.md:1158`
describes a **CONTRIBUTION-level** 10-column table, one row per contribution. ⭐ **Different grain,
different row count, different story.** The contribution-level table's components are **11b.2**'s and
its per-claim host is **11b.3**'s. → **D5**.

### Trap 6 — ⚠ THE CACHE MAKES THE ABUSE COUNTER BLIND, AND THAT IS RECORDED, ⛔ NOT DISCOVERED.

A cached hit **never reaches the origin**, so the origin-side rate limit and every abuse signal see
only cache **MISSES**. A scraper walking pages 1..N through a warm edge is **invisible** to the
detection this story ships. ⚠ Inert today (no edge configured; `architecture.md` §5.8a) but a
**NAMED DEPENDENCY**. ⛔ Do not write that the origin sees everything. ⛔ And do **not** "fix" it by
making the surface `private_no_store` — that discards the edge for a public surface and was already
**REJECTED** at 11a.3 (option (b)).

### Trap 7 — ⚠ FOUR OUTCOMES ARE NOT TWO, AND CACHING THE WRONG ONE PINS A LIE.

`members.astro` learned this the hard way: keying the cacheable branch on *"not a rejection"* meant
the API-outage render, the visitor's own 429, and the kill-switched empty roster **all** took the
`edge_cacheable` arm at HTTP 200 — *"one transient upstream blip pinned 'could not be loaded' into a
shared edge for FIVE MINUTES … and one visitor's throttle was cached for everyone."*

⇒ ⭐ **This surface owes FOUR distinct states, and they are ⛔ not interchangeable:**
**(1)** a **400 rejection** (`no-store`, status 400) · **(2)** an **outage** (`no-store`, **503** +
`Retry-After`, ⛔ never 200, ⛔ never "no drives") · **(3)** **past-the-end** (`edge_cacheable`, 200 —
⭐ a **true statement about a real index**) · **(4)** **genuinely empty / publication off**
(`edge_cacheable`, 200 — ⚠ and ⛔ the two must be **indistinguishable in shape** from each other, per
the kill-switch's own no-new-oracle rule).

---

## Acceptance Criteria

> ✅ **⛔ NOTHING BELOW IS GATED, CONDITIONAL, OR PENDING A RULING.** All ten decisions are ruled
> (D1(b) · D2(a) · D3(a) · D4(b) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a) · D10) and every AC below is
> written **to the ruling as taken**, ⛔ not to the recommendation.
> ⚠ ⭐ **D1 WAS RULED (b) — AGAINST the recommendation — SO ANY SENTENCE THAT READS AS IF THE NAME IS
> ABSENT OR SHIELDED IS STALE BY CONSTRUCTION AND IS A DEFECT, ⛔ NOT A NUANCE.** The deceased member's
> **FULL NAME** renders, consent-gated (AC2 + AC12). ⛔ Build to that; ⛔ never reinterpret an AC at
> build time ([[feedback_supersede_never_reinterpret]]).

### AC1 — The Sahyog Drive route ships, Active + Archive, on the `/members` skeleton

**Given** the `apps/public` shell (11a.2) and the `/members` surface (11a.3)
**When** `/sahyog` is implemented
**Then** ONE Astro route renders two sections from ONE bounded page read: **Active** = pools whose
`pools.current_state` is `closed` (window closed, ⛔ not yet disbursed); **Archive** = pools at
`settled` (disbursed; terminal)
**And** the page follows the `members.astro` shape **exactly**: thin frontmatter, ALL display logic
in a pure `apps/public/src/lib/sahyog-render.ts`, an explicit `namespace` on **every** `t()` call,
and every value emitted through `<MatrixField>`
**And** it declares `noindex` via `PublicShell`, mirroring `/members` under FR-75
**And** ⛔ **NO** per-pool detail route, ⛔ **no** per-member permalink, and ⛔ **no** `member_id` on
any wire — a detail surface is **11b.3's** and a per-entity permalink is an enumeration primitive in
its own right (11a.3, control 5)
**And** the four Trap-7 states are each rendered distinctly, with the cache/status branching of
**AC7**.

### AC2 — The deceased member's FULL NAME renders CONSENT-GATED, in the Pariwar's configured form [D1(b) + D4(b) + D10 RULED]

**Given** D1(b) — the matrix's exactly-one Tier-1-at-`public` rule is **widened by ruling** to admit
this surface — and D4(b) — `sahyog_drive_publication` is minted as the per-subject gate
**When** a pool row renders
**Then** the deceased member's name renders as their **FULL NAME** (D10) — ⛔ **not** first-name +
last-initial
**And** ⭐⛔ **IT IS RESOLVED THROUGH `resolvePublicMemberName(mode, storedName)`, ⛔ NEVER THROUGH
`resolvePoolIdentity()` AND ⛔ NEVER AS A LITERAL.** ⚠ **This is the sharpest build consequence of D10
and it is easy to get wrong**: `resolvePoolIdentity()` — the resolver 8.6/8.7/8.8 share — **hard-codes**
`splitFirstNameLastInitial`, so it can ⛔ **only** ever return the shielded form. Reaching for it here
because it is "the pool identity resolver" would silently ship the form D10 rejected
**And** ⛔ **the form is MODE-RESOLVED, ⛔ never hard-coded** — `2026-08-19-136` cl.1: *"a build in
which the public name form cannot be changed without a code change **FAILS this clause**."* ⇒ read the
Pariwar's stored mode via `resolvePublicNamePresentationMode`, exactly as `/members` does. `full_name`
is the **DEFAULT** (⛔ not a constant) and a Pariwar that shields still shields, in both directions
(`-136` cl.3)
**And** ⚠ **an unresolvable name returns `''` and omits the NAME, ⛔ never the row** (see below) —
⭐ note that under `full_name` the **mononym** case resolves normally, whereas `shielded_name` returns
`''` for every single-token name (`2026-08-21-145` cl.3). ⛔ Do not re-implement that branch
**And** it renders **only** where consent for `sahyog_drive_publication` is valid **at render time**,
subject = the **deceased member** ([[project_consent_subject_key_convention]]) — ⛔ a missing consent
and a **revoked** consent are the same verdict
**And** ⭐⛔ **THE CONSENT LOOKUP IS BATCHED, ⛔ NEVER PER ROW — THIS IS D7(a) AGAIN, ⛔ NOT A NEW
QUESTION.** `consentExists(db, pariwarId, subjectId, type, validAt?)`
(`packages/domain/src/consent/read.ts:36`) issues **one `LIMIT 1` query per subject**. Calling it once
per rendered pool is **50 round-trips for one page** — ⛔ the *identical* AR-65 N+1 that D7(a) ruled
the contribution count out of, reintroduced through a different door. ⇒ resolve consent for the
page's whole subject set in **ONE set-based read** (`inArray` over the page's `deceased_member_id`s,
or a lateral join in Task 1's query), with **ONE injected `now`** shared with the count accessor so
the two cannot disagree about the instant
**And** ⭐⛔ **CONSENT IS EVALUATED *BEFORE* THE DECRYPT, ⛔ NEVER AFTER.** An unconsented row must cost
**zero** KMS calls. Decrypting a name the gate is about to discard is both a wasted round-trip on a
quota-limited service **and** a decrypt with no authorising basis
**And** ⭐⛔ **THE TIER-1 DECRYPT IS BOUNDED, AND IT IS `apps/api`'s WORK — ⛔ NOT the domain read's and
⛔ NOT `apps/public`'s.** Envelope encryption gives every stored name **its own DEK** ⇒ one
`decryptDek` round-trip **per consented row**, on an **unauthenticated** route. Reuse
`handlers.ts`'s existing machinery **verbatim**: `mapWithConcurrency(rows, DIRECTORY_DECRYPT_CONCURRENCY, …)`
(⛔ **never** `Promise.all`, whose only ceiling is `limit` ⇒ 50×N concurrent KMS calls for N visitors),
`encryption.decryptKycField(...)` for the decrypt, a **pre-sized slot array indexed by row position**
so completion order can ⛔ never re-sort the page, and a per-row `try/catch` that omits **the name**
(⛔ not the row — see below). ⚠ ⭐ **This is the SAME constant this story cites three times as the
reason not to build name search — ⛔ it is not optional here just because the page is smaller.**
`handlers.ts:196` records why the previous form was a defect: *"a comment asserting a bound that the
code does not impose is worse than no comment: it stops the next reader from looking."*
**And** ⭐ **AN UNNAMED POOL STILL RENDERS, IN FULL.** Consent decides whether a row is **named**,
⛔ never whether it **exists**: letter code, canonical identifier, district, close date, confirmed
count and close-of-cycle framing all render regardless. ⇒ ⛔ **the index degrades PER-POOL, never
per-page**, and a family's declination removes a name, ⛔ never a drive from the public record
**And** ⛔ **the nominee family identifier is NOT rendered at all** — ⚠ D10 moves the **deceased
member's** name form and ⛔ **nothing else**. A nominee never joined the Trust, Deed Clause 15(c) names
*"nominee"* expressly, and counsel's `-157` cl.3(b) third-party objection stands. ⚠ **Routed, ⛔ not
built** (AC11(a))
**And** ⛔ the omission does **not** announce itself per-row: a not-visible verdict renders **nothing**
— ⛔ no placeholder, ⛔ no empty span, ⛔ no comment naming the omitted field (*"an omission that
announces itself is an ENUMERATION SIGNAL"*), and the `<th>`/`<td>` pair is suppressed together via
the `visibleDirectoryColumns()` pattern
**And** ⚠ **a decrypt failure or an unresolvable name omits the NAME, ⛔ never the row** — the
`resolvePoolIdentity` / `pool-identity.ts` fail-soft precedent. ⛔ A shorter index is not acceptable
here; a nameless row is. ⚠ ⛔ Note this **differs deliberately from `/members`**, which omits the
whole row — there, a row with no name has no purpose; here it still carries the drive.

### AC3 — Search + filter is DISTRICT + DATE-RANGE + POOL CODE; name search is deferred [D2(a) RULED]

**Given** `member_kyc_profiles` carries ⛔ no name blind index and envelope encryption gives each name
its own DEK
**When** a visitor filters the drive index
**Then** the supported dimensions are exactly: **district** (the raw latest-posting string already
classified `pii_tier: 3` and public on `/members`), **date range** over the pool's close/settle
instant, and **pool code** (letter code or canonical identifier) — ⛔ all three queryable **without a
single decrypt**
**And** every filter is a **plain GET query parameter** on a **real link/form**, honouring the
shell's works-with-JS-disabled posture (Story 2.5 AC3)
**And** an unknown query parameter is a **refusal**, ⛔ not an ignored no-op — which is what makes
`?format=csv` a 400 rather than a silent success
**And** **name search is DEFERRED**, recorded in `deferred-work.md` as **Resolved via explicit
deferral** ([[feedback_closure_language_precision]]) on a **single** trigger — a `name_blind_index`
substrate story. ⚠ ⭐ **Its second condition is now DISCHARGED, ⛔ not dropped:** the deferral was
written as *"(i) a blind index AND (ii) D1 reversing so a name may be rendered at all"*, and **D1(b)
discharges (ii)** — the name IS renderable now. ⛔ Do not carry the two-condition form forward
**And** ⚠ ⭐ **A RENDERED NAME IS STILL ⛔ NOT A SEARCHABLE ONE — AND D10 MAKES THIS SHARPER, ⛔ NOT
SOFTER.** The index publishes the deceased member's **FULL NAME** on consented rows (AC2), and that
⛔ still does **not** make the roster queryable by name: rendering reads **one row you already
selected**, searching requires a predicate over **every row you have not**. ⛔ No filter may be
implemented by scanning, caching or re-reading rendered pages
**And** ⛔ **no decrypt-and-filter path is built**, and the page header records **why** (Trap 2), so
the next author does not reach for it.

### AC4 — Per-pool figures come from `contribution.confirmed` ONLY, and the framing cannot compare to a target

**Given** Story 9.5's canonical financial truth and Story 7.8's Pool-Reality #2
**When** a pool row renders its contribution figure
**Then** the count is derived **only** from live `contribution.confirmed` events with their
`reconciliation.confirmation-reversed` compensations applied — ⛔ **never** yellow / attested /
pending / projected, and ⛔ never a sum of per-event amounts
**And** the close-of-cycle framing comes from `selectCloseOfCycleFraming()` — ⛔ never a locally
authored outcome branch, ⛔ never a re-implementation
**And** ⛔ **NO target, expected-total, percentage, shortfall or comparison figure enters any render
model on this surface**, in any field, under any name — `classifyCycleOutcome` quarantines the target
by construction and this surface must not smuggle one past it
**And** the surface's i18n namespace is added to `microcopy.yaml` `scope.copy_globs`, with the teeth
**proven** by a planted-violation fixture + revert-sanity — ⛔ not merely scanned
([[feedback_gate_scope_semantic_coverage]]: *"a green scan over unscanned files proves nothing"*).

### AC5 — Remembrance, not analytics — the invariant is written where it is read, in THREE places

**Given** this story's load-bearing commitment
**When** any future feature is considered for Sahyog Drive
**Then** the invariant block is recorded verbatim in the page frontmatter, in the pure render module,
**and** in the surface's abuse-rules README — the same three-place discipline `/members` uses for its
legitimacy-surface block
**And** it states the **five explicit prohibitions**: (a) contributor **leaderboards** · (b)
**rankings** ("top contributors", "supporter of the month") · (c) **gamification** (badges, streaks,
achievements) · (d) **social-performance metrics** (most-supportive district, public scoreboards) ·
(e) **popularity metrics** (most-viewed memorial, trending pools)
**And** it states the **acceptable** directions: legitimate trust verification, district/date
historical research, accessibility, performance
**And** it states **THE TEST**, in the `/members` form: *"does this serve remembrance, transparency or
claim discoverability?"* — if the honest answer is **engagement**, **ranking** or **social
performance**, the proposal is **rejected at design time**
**And** ⛔ **the sort order is not a ranking**: the index orders by the pool's close/settle instant
descending with a deterministic tie-break, ⛔ never by contribution count, ⛔ never by amount, and
⛔ no "most-supported" ordering is offered at any tier.

### AC6 — Anti-enumeration is inherited as a FLOOR, using the CORRECTED mechanism

**Given** FR-91 and `2026-08-21-145` RD2
**When** any visitor reaches the surface
**Then** `parsePageParams()` from `apps/public/src/lib/pagination.ts` is **reused unchanged** — the
page-size cap (50), the deep-page horizon (200), and **⛔ no silent clamp**: an over-cap or
out-of-horizon request is **refused** with a decidable reason
**And** ⛔ **NO bulk-export affordance exists at any tier**: no "download all", no CSV link, no
`?format=`, no `?limit=<total>` escape hatch. The authorized export path is **Story 10.7's**
scope-respecting, audit-logged reports library
**And** the visitor's address is forwarded to `apps/api` using **`buildForwardedFor(Astro.clientAddress)`
reused verbatim** — ⛔ the inbound `X-Forwarded-For` chain is **discarded, never appended**; `null`
⇒ the header is **omitted**, ⛔ never sent empty
**And** the abuse counter is invoked **after** the publication switch and **before** the read,
⛔ non-blocking, and is described in code and docs as **a COUNTER, ⛔ not a forensic record**
**And** the edge-cache blindness of that counter (Trap 6) is written into the surface's abuse-rules
README and `deferred-work.md` with the **edge-configuration re-trigger**.

### AC7 — The matrix declares this surface EXPLICITLY, and the cache policy is declared, not inferred

**Given** `public-vs-private-matrix.yaml`'s standing instruction — *"when 11b ships a route, the gate
FAILS until it is declared here"* — and C-5(iii)
**When** the route ships
**Then** a `sahyog-drive` surface entry is added carrying: `route`, `renders: true`,
`search_indexing_policy: noindex`, **`cache_policy` stated EXPLICITLY** (⛔ never inferred from field
tiers), `paginated: true`, and a `fields:` list in which **every** rendered field is classified
**And** the tier-leak leg is **OPERATIVE, ⛔ not armed-but-empty**: a `sahyogDriveSurfaceFieldIds(model)`
derivation returns a **non-empty** set through `deriveFieldIds()`, so a planted
`authenticated_member`-tier or **undeclared** field at `public` **FAILS** a run that previously passed
— ⛔ and the story is not complete on a green scan alone ([[feedback_gate_scope_semantic_coverage]])
**And** the page's actual `Cache-Control` **agrees** with the declaration (the gate's cache-policy leg
fails if they disagree), with the four-way branching of Trap 7: `edge_cacheable`
(`public, max-age=60, s-maxage=300` + `Vary: Accept-Language`) for a real render **and** for
past-the-end; **`no-store`** for a 400 and for an outage; **503 + `Retry-After: 60`** on outage
**And** ⭐⛔ **A SECOND `tier1_public_exception` IS ADDED, AND IT IS MANDATORY — ⛔ NOT optional and
⛔ NOT avoidable.** Verified at `matrix.ts:176-197`: the relation is **BICONDITIONAL**. A Tier-1 field
at tier `public` **without** an exception block **FAILS fail-closed** (*"declaring it public without
one is not a shortcut, it is the leak this matrix exists to prevent"*), and an exception block on a
field that is **not** Tier-1-at-`public` **also FAILS** (*"an exception that does not except anything
dilutes the one that does"*). ⇒ under D10 the block on `deceased_member_name` is **required work**
(Task 4), and it is the **second** matrix-wide — which is exactly what **D1(b)'s widening** (Task 3c)
exists to admit. ⛔ There is no configuration in which the name renders and the block is absent
**And** ⛔ **NO new ESCALATION entry is added** — `escalation_count` stays **`1`** (verified:
`public-vs-private-matrix.yaml:417`). ⚠ ⭐ **The two ledgers are NOT the same ledger and ⛔ must never
be conflated:** an `escalations:` entry records a **tier MOVE** (`from` → `to`) for a field that was
already declared; ⛔ there is no honest `from` tier for a field being declared for the first time.
*"Declaring a surface for the first time is NOT an escalation."*

### AC8 — The read is over the `apps/api` hop, and the new route is DEFENDED IN WRITING in both places

**Given** `apps/public` verifiably holds no KMS material, no rate-limit store and no audit-write pool,
and `routes.ts` forbids a quiet second route
**When** the read path is built
**Then** a **second** `public-pages` route is added with its **own** defence block in `routes.ts`
enumerating its controls, its **own** entry in `login-wall.spec.ts`'s allowlist, and
`config: { rateLimit: limits.search }` — ⛔ **not** `limits.read`, ⛔ **not** an inline ceiling,
⛔ **not** a hand-rolled `keyGenerator`
**And** the two written defences state the **SAME control count** — ⛔ two authoritative documents
disagreeing on how many controls exist is the defect `routes.ts` records having already had once
**And** the request schema is `.strict()` with a bounded `limit` and a bounded `page`, so
Story 1.14's forced-pagination guard **covers** this route
**And** the response carries **only** the classified fields — ⛔ no `member_id`, ⛔ no ciphertext,
⛔ no raw lifecycle value, ⛔ no claim id. ⚠ *"A public JSON route that over-returns is a leak the
HTML tier-leak gate structurally CANNOT see"* — hold it here, by construction **and** by test
**And** the `apps/public` client mirrors `directory.server.ts`: module-load-validated origin,
4s timeout, ⛔ **one attempt, no retry**, ⛔ never throws, and `ok:false` presented as an **OUTAGE**,
⛔ never as an empty index.

### AC9 — The publication switch gates this surface, and a pulled Pariwar is INDISTINGUISHABLE from an empty one

**Given** C-5's ruling that Row 17's per-Pariwar kill switch extends to this surface
**When** a Pariwar's publication is disabled
**Then** the switch is checked **FIRST**, before any read and before the abuse counter — a pulled
Pariwar must cost nothing beyond that one read
**And** it returns the **IDENTICAL SHAPE** as a genuinely empty index (`{items:[],total:0}`) —
⛔ **never** a distinct error, 403 or 404: a differently-shaped response is **itself a new oracle**
**And** the page renders the empty state without disclosing a reason (`2026-08-21-144` cl.5 — the
directory discloses ⛔ **no reason** for an omission)
**And** the **non-immediacy** of the lever is recorded on the surface and in `deferred-work.md`:
at `s-maxage=300` a pulled Pariwar keeps being served **from every warm PoP, per page number**, and
⛔ **direct SQL is NOT the operational fallback**.

### AC10 — Accessibility: family 13 of the load-bearing-invariant checklist, in its web form

**Given** family 13 (added 2026-08-24; live on merge via `bmad-code-review.toml:9`) applies to every
COMPONENT or SURFACE story, and 11b.8 makes an accessibility audit a **LAUNCH-BLOCKER** (UX-DR70)
**When** the surface renders
**Then** the four checks are satisfied in their **web** equivalents: **(a)** every grouping container
carrying an accessible name has an explicit semantic role (a real `<table>` + `<caption>` +
`<th scope="col">`, ⛔ not `<div>`s with labels) · **(b)** any element implying a measurable value
carries that value programmatically · **(c)** every element announced as interactive **has a real
handler** — ⛔ never a `role="button"` over an empty body (the exact defect 11a.6 removed) ·
**(d)** every state the ACs ratify as reachable (each of Trap 7's four) is **announced**, ⛔ not
merely styled
**And** the table's accessible name (`<caption>`) is **distinct** from the intro paragraph — ⛔ never
the same string twice, which a screen reader announces consecutively
**And** focus is visible on every interactive control (`:focus-visible`, Story 0.10 P0-2c)
**And** ⛔ **this story mints NO accessibility CI gate** — mechanization is 11b.8's call
([[feedback_no_premature_package]]).

### AC11 — What this story does NOT build is ROUTED, each with a re-trigger

**Then** each of the following is written into `deferred-work.md` with a named re-trigger, and
⛔ none is described as *closed*:
(a) the **nominee family identifier** — ⛔ **NOT** the deceased member's name, which D1(b) admits.
A nominee never joined, so no membership term reaches them and no consent was captured for this
surface. ⚠ **Counsel's `-157` cl.3(b) third-party objection binds it directly.** Trigger: counsel's
A3.2/A3.3 revisit (due 2026-09-07) **plus** a consent basis that reaches a non-member;
(b) **name search** — trigger: a `name_blind_index` substrate story (⚠ its second condition was **discharged** by D1(b), ⛔ not dropped);
(c) the **authenticated tier** — trigger: an `apps/member-web/` split or a browser-member-session
story (`2026-08-23-154`, disposition (c)) — ⚠ **Resolved via explicit deferral**, ⛔ not closed;
(d) the **basis** for the deceased member's own name — the Niyamavali §4.4 / T&C amendment routed 2026-08-24 (⚠ the consent gate itself is ⛔ **built** here, per AC12; what is routed is whether membership terms supply an **additional** basis);
(e) the **UX-spec Sahyog List column inventory** reconciliation — per **D5**;
(f) the **edge-cache blindness** of the abuse counter — trigger: edge configuration;
(g) `school` / `block` columns — permanently ineligible / gated on `2026-08-19-137` cl.7.

---

### AC12 — The consent substrate is MINTED AND CAPTURED, and it must be minted BEFORE LAUNCH [D4(b) RULED]

**Given** `DPDPA_CONSENT_RECORDABLE_STATES` is **five pre-adjudication states**, and `pool/spawn.ts`
spawns pools **one per APPROVED claim** ⇒ ⭐ **by the time a pool exists, the recording window has
already shut** — a consent not captured at intake can ⛔ **never** be captured for that claim
**When** the consent type is added
**Then** `sahyog_drive_publication` is appended to the `consent_type` pgEnum **at the END** — ⛔ never
reordered (stored ordinals) — by an `ALTER TYPE … ADD VALUE` migration **in its own file**, because
that DDL ⛔ cannot run in a transaction or in the same tx it is added
**And** it is added to the `@twt/contracts` `DpdpaConsentType` enum **and** to
`DpdpaRevocableConsentType`, with the existing **lockstep equality test** (pgEnum `.enumValues` ⇄
schema `.options`) covering it — ⛔ contracts must not import domain
**And** a **fourth box** joins Story 6.9's capture step: **unchecked by default** (UX-DR2), **outside**
the `.refine()` that forces `claimTimeDpdpa`, with canonical bilingual copy in
`resolveDpdpaConsentCopy` **and** the mobile `claim.json` `dpdpa.*` keys held **identical by value** —
⚠ that copy is the **evidence** persisted as `checkboxTextShown`; a drifted pair means the family read
one thing and the record says another
**And** ⭐ the copy carries the **same declinability sentence its two siblings carry**, in both
locales — *"You may decline this without affecting the claim."* / *"आप इसे अस्वीकार कर सकते हैं, इससे दावे
पर कोई असर नहीं होगा।"* ⛔ **It is NOT mandatory**, and ⛔ the `.refine()` is not extended: Niyamavali
**§4.4** and **Part 10** both forbid default opt-in, and a consent that cannot be refused is not
consent ⇒ ⚠ making it mandatory is a **rulebook amendment**, routed 2026-08-24, ⛔ not this story's act
**And** **revocation** reaches it: 6.9's revoke path is open at **any** claim state (*"the whole point
of AC3 is a post-settlement takedown"*), so a family may withdraw the name after settlement and the
next render drops it — ⚠ bounded by `s-maxage=300`, ⛔ **not immediate**, and that non-immediacy is
stated on the surface
**And** ⭐⛔ **THE TIMING IS THE LOAD-BEARING PART, AND IT IS RECORDED AS SUCH:** every claim filed
**before** this type exists is **permanently unaskable** and its pool can ⛔ **never** carry a name.
⇒ ⭐ mint it **before the first real claim** and the unreachable cohort is **empty by construction**;
after launch there is ⛔ **no remedy**. ⚠ The dev agent **confirms the cohort is empty** before
merging and records the count — ⛔ never assumes it.

---

## Tasks / Subtasks

> ⭐⛔ **EXECUTION ORDER IS BINDING FOR THE FIRST FOUR, AND IT IS ⛔ NOT THE NUMBERING ORDER.** Task
> numbers are stable identifiers (the ACs, the Traps and D1 all cite them by name) — ⛔ they are not a
> schedule. Do them in this order:
>
> **Task 0** (governance commit) → **Task 3b** (the consent substrate — ⭐ a **ONE-WAY DOOR**: cheap
> today, ⛔ *impossible* after the first real claim) → **Task 3c** (the matrix widening — ⛔ needs Task
> 0's decision entry to cite) → **Task 4** (the matrix declaration — ⛔ needs 3c's widening or it fails
> the parser) → **Tasks 1, 2, 3** (the code) → **Tasks 5–9**.
>
> ⚠ Everything after Task 4 is ordinary implementation and may be sequenced freely.

- [x] **Task 0 — Governance first (AC: all)** ⛔ **BEFORE any code.** [[feedback_governance_commits_precede_implementation]]
  - [x] Read `.decision-log.md` **live** for the head number — ⛔ do not hardcode `-159`
  - [x] Mint the decision entry recording **D1(b) · D2(a) · D3(a) · D4(b) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a)**, in a `governance:` commit
  - [x] ⭐ The entry must carry **D1(b)'s matrix-governance widening** as its own clause — ⛔ the `escalations:` ledger is the wrong vehicle (a first-time declaration is ⛔ not an escalation; there is no honest `from` tier)
  - [x] ⚠ Record that **D1(b) was taken while counsel's `-157` cl.3(a) hold is OPEN**, and that **D4(a) was VACATED, ⛔ not reversed** — its question ceased to exist
  - [x] ⚠ Write *"counsel has not reviewed X"* — ⛔ **never** *"counsel is not engaged"* (`2026-08-24-158`)
  - [x] Confirm the `epics.md` `RECONCILED 2026-08-24 (AI-11a-1(b))` block is present (authored by this pass) and rides the **same commit family**
  - [x] ⛔ Do **not** flip any launch-gate row, do **not** record Row 17 as advanced, do **not** describe counsel's hold as lifted
- [ ] **Task 1 — The pool index read model (AC: 1, 4)** — per **D7**
  - [ ] `packages/domain/src/pool/public-read.ts`: ONE set-based query, ⛔ never a per-row fan-out (AR-65)
  - [ ] Predicate: `pariwar_id` explicit **alongside** RLS + `current_state IN ('closed','settled')` + the D-ruled district/date/pool-code filters
  - [ ] Confirmed count as a **lateral aggregate** over `events_log`, applying `reconciliation.confirmation-reversed` compensation — ⛔ never `listConfirmedContributorsForPool` per row
  - [ ] `clampLimit()` on every dynamic `.limit()` (the `domain-accessor-invariants` gate clamps **every** one — [[project_domain_limit_clamp_and_savepoint_retry]])
  - [ ] Deterministic `ORDER BY` with a PK tie-break — offset paging over a non-deterministic order duplicates rows across pages
  - [ ] A matching `count*` accessor sharing the **same** predicate function; ⛔ never two spellings; ONE injected `now` for both
  - [ ] ⚠ `count(*)` returns `bigint` ⇒ a **string** from the driver — coerce at the accessor
  - [ ] ⭐ **Return each row's `deceased_member_id`** (from `pools.claim_id → claims.deceased_member_id`) as the **consent subject key** ([[project_consent_subject_key_convention]]) — ⚠ it is an **internal** field for the consent join and the decrypt, ⛔ **never** serialized onto the public wire (AC8)
  - [ ] ⭐⛔ **BATCH THE CONSENT VERDICT — ⛔ never `consentExists` per row.** One set-based read over the page's subject set (`inArray`, or a lateral join in this same query), sharing the **ONE injected `now`** ⇒ ⛔ the D7(a) AR-65 N+1 must not return through the consent door (AC2)
  - [ ] Copy `directory-read.ts`'s *"decides a render, never a benefit"* fence into the header verbatim
  - [ ] ⛔ **This module stays decrypt-free** — it returns the *ciphertext* + the consent verdict; the decrypt is **Task 2's**, at `apps/api`, where the KMS binding lives
- [ ] **Task 2 — The `apps/api` route (AC: 8, 9)**
  - [ ] Add the route to `apps/api/src/modules/public-pages/` with its **own** defence block enumerating its controls
  - [ ] Add its **own** `login-wall.spec.ts` allowlist entry — ⚠ **matching control count** in both places
  - [ ] `config: { rateLimit: limits.search }`, `.strict()` schemas, bounded `page` + `limit` from `@twt/contracts` (⛔ imported, ⛔ never re-declared)
  - [ ] Publication switch checked **FIRST** (per **D3**), returning the identical empty shape
  - [ ] Abuse counter after the switch, before the read, passing `pariwarId` **and** `traceId`
  - [ ] ⭐⛔ **THE TIER-1 NAME RESOLUTION LIVES HERE, AND NOWHERE ELSE (AC2).** ⚠ It is easy to leave this task unowned: Task 1's module is decrypt-free by rule and `apps/public` **cannot** decrypt (`no-kms-in-public.test.ts` scans the whole app). ⇒ ⛔ if this handler does not do it, **nothing does**:
    - [ ] **Consent verdict FIRST** — skip the decrypt entirely for an unconsented row (⛔ zero KMS calls, and ⛔ no decrypt without an authorising basis)
    - [ ] `mapWithConcurrency(rows, DIRECTORY_DECRYPT_CONCURRENCY, …)` — ⛔ **never** `Promise.all`, whose only ceiling is `limit` ⇒ 50×N in-flight KMS calls for N visitors on an **unauthenticated** route (`handlers.ts:192-200`, the defect 11a.3 fixed)
    - [ ] `encryption.decryptKycField(ciphertext, pariwarId, deps.encryption)` inside a per-row `try/catch` — ⛔ **omit the NAME, keep the ROW** (⚠ this is the deliberate inverse of `/members`, which omits the row); ⛔ never let one bad row 500 the page
    - [ ] `resolvePublicMemberName(await resolvePublicNamePresentationMode(tx, pariwarId), storedName)` — ⛔ **never** `resolvePoolIdentity()` (it hard-codes `splitFirstNameLastInitial`), ⛔ never a literal (`-136` cl.1)
    - [ ] **Pre-sized slot array indexed by row position** — ⛔ never completion order; nothing here may re-sort, or *"page N is the same page N"* stops being true
    - [ ] ⛔ The decrypted value **never leaves the closure** except through `resolvePublicMemberName`, and is ⛔ **never logged**
  - [ ] Response DTO carries only classified fields — a test asserts the **absence** of `member_id`, `deceased_member_id`, ciphertext and claim id
- [ ] **Task 3 — The `apps/public` client + route (AC: 1, 6, 7)**
  - [ ] `apps/public/src/lib/sahyog.server.ts` mirroring `directory.server.ts`; **reuse `buildForwardedFor`**, ⛔ do not re-implement
  - [ ] `apps/public/src/lib/sahyog-render.ts` — ALL display logic, pure, DB-free-testable
  - [ ] `apps/public/src/pages/sahyog.astro` — thin frontmatter, `<MatrixField>` on every value, explicit `t()` namespace everywhere
  - [ ] `parsePageParams()` reused **unchanged**; the four Trap-7 states each rendered and each with the right cache header + status
- [ ] **Task 3b — The consent substrate (AC: 12)** — per **D4(b)** ⭐ **DO THIS EARLY: it is cheap now and impossible after launch**
  - [ ] ⚠ **Confirm the existing claim cohort is EMPTY and record the count** — every claim already filed is permanently unaskable. ⛔ Do not assume; query it
  - [ ] `ALTER TYPE consent_type ADD VALUE 'sahyog_drive_publication'` — **its own migration file**, appended at the **END** (⛔ never reorder a pgEnum; stored ordinals). ⚠ That DDL ⛔ cannot run in a tx or in the same tx it is added
  - [ ] `@twt/contracts`: add to `DpdpaConsentType` **and** `DpdpaRevocableConsentType`; ⚠ the lockstep equality test (pgEnum `.enumValues` ⇄ schema `.options`) must cover it — ⛔ contracts must not import domain
  - [ ] Story 6.9 capture path: a **fourth box**, **unchecked by default**, ⛔ **OUTSIDE** the `.refine()` that forces `claimTimeDpdpa`
  - [ ] Canonical bilingual copy in `resolveDpdpaConsentCopy` **and** the mobile `claim.json` `dpdpa.*` keys, held **identical by value** — ⚠ that text is the persisted EVIDENCE (`checkboxTextShown`)
  - [ ] ⭐ The copy carries the **same declinability sentence its siblings carry**, both locales. ⛔ It is NOT mandatory — Niyamavali §4.4 + Part 10 forbid default opt-in
  - [ ] Wire the render gate on `sahyog_drive_publication`, subject = the **deceased member**; ⛔ missing and **revoked** are the same verdict. ⚠ ⭐ **BATCHED, ⛔ not per row** — `consentExists(db, pariwarId, subjectId, type, validAt?)` (`consent/read.ts:36`) is **one query per subject**; the page's verdicts resolve in Task 1's set-based read (⛔ the D7(a) N+1 must not return through this door)
- [ ] **Task 3c — The matrix widening (AC: 2, 7)** — per **D1(b)**, ⛔ AFTER Task 0's decision entry exists
  - [ ] Widen `matrix.ts`'s exactly-one `superRefine` to admit this surface, citing the decision entry **in the message text** — ⛔ never a bare relaxation
  - [ ] ⚠ Keep it an **enumerated** admission, ⛔ not a removal of the check: a third exception must still FAIL. Prove it with a planted third
  - [ ] ⛔ `escalation_count` stays `1`; ⛔ no `tier1_public_exception` count is "fixed" by deleting the rule
- [ ] **Task 4 — The matrix declaration (AC: 7)**
  - [ ] Add the `sahyog-drive` surface with **explicit** `cache_policy`, `paginated: true`, `renders: true`, `noindex`, and a fully-classified `fields:` list
  - [ ] The `deceased_member_name` field carries `pii_tier: 1`, `tier: public`, its own `tier1_public_exception` naming the D1(b) decision entry, and a `scope:` that ⛔ **does not reach 11b.3 or 11b.6**
  - [ ] ⚠ Amend the file header's *"Epic 11b surfaces are DELIBERATELY NOT DECLARED"* note for **this surface only** — ⛔ 11b.3 and 11b.6 stay undeclared and the note must still say so
  - [ ] ⭐⚠ **Amend the EXISTING `member-directory.member_name` exception's `scope:` text** — it currently asserts that the 11b surfaces *"keep first-name + last-initial"*, which **D10 makes false for this surface**. ⛔ **Annotate, ⛔ never rewrite**, and ⛔ keep it true for **11b.3 and 11b.6**, which D10 does ⛔ not reach
  - [ ] ⚠ **AND WHILE THAT EXCEPTION BLOCK IS OPEN — correct the FALSE COUNSEL CLAIM one field below it.** `public-vs-private-matrix.yaml:412` (the `member-directory.member_name` **escalation** rationale) still reads *"records DPDPA exposure with legal counsel **NOT engaged**"*. ⛔ That is false and has been since **2026-06-21** (`2026-08-24-158`; Adv. Mohit Agrawal — [[project_dpdpa_counsel_engaged_but_unrecorded]]). ⭐ **Annotate to *"counsel had not REVIEWED this publication"*, ⛔ never delete the finding** — the DPDPA exposure it records is still open. ⚠ This is a **live machine-read governance artifact** asserting present tense, ⛔ unlike the historical ledger entries that correctly keep their original wording ([[feedback_supersede_never_reinterpret]])
  - [ ] `deriveFieldIds()` mapping — every model key mapped or explicitly `null`; ⛔ never guess an id
  - [ ] ⭐⚠ **`escalation_count` stays `1` — and that is ⛔ NOT in tension with adding the exception block above.** ⚠ **Two different ledgers:** `escalations:` records a **tier MOVE** (`from` → `to`) and a first-time declaration has ⛔ no honest `from`; `tier1_public_exception` records an **attributed authorisation** and is **mandatory** for a Tier-1 field at `public` (`matrix.ts:176-197`, biconditional). ⇒ **exception blocks: 1 → 2** (admitted by Task 3c) · **`escalation_count`: 1 → 1** (verified `:417`)
  - [ ] **Prove the teeth**: a planted `authenticated_member`-tier field and a planted **undeclared** field each FAIL; revert-sanity green
  - [ ] ⭐ **And prove the fail-closed direction the other way:** `deceased_member_name` declared `pii_tier: 1` at `public` **with its `tier1_public_exception` REMOVED** must FAIL (`matrix.ts:177`) — ⛔ the block is not decoration, and a green run without that proof does not show it is load-bearing
- [ ] **Task 5 — i18n + microcopy (AC: 4, 5)**
  - [ ] New namespace, hi-primary + en parity — ⚠ ⭐ **`catalog.ts` has THREE registration sites, ⛔ not two**, and a namespace registered in only some of them is the 11a.2 shape again: **(i)** the two `import` lines · **(ii)** the `catalogs` map's `en:` **and** `hi:` entries (`:62`, `:63`) · **(iii)** ⭐ **`KNOWN_NAMESPACES` (`:67`) — a SEPARATE hand-maintained literal that can drift from the map.** ⚠ `packages/i18n/tests/catalog-registration.test.ts:70` asserts both directions, so the drift **fails loudly** ⛔ rather than silently — ⭐ run it, ⛔ do not merely add the files
  - [ ] ⚠ Verify **every** interpolation token spelling against `t()` (the 11a.2 `{{max}}`/`{max}` defect threw on **every** request and ⛔ no test caught it — assert through `t()`, ⛔ not around it)
  - [ ] Add the namespace to `microcopy.yaml` `scope.copy_globs` + prove the teeth (planted `shortfall` fixture + revert-sanity)
  - [ ] ⚠ Check the copy against the prohibited vocabulary: ⛔ *"donor"*, ⛔ *"Late Teacher"*, ⛔ *"report"*, ⛔ *"receipt"*, ⛔ *"passbook"*
  - [ ] Latin numerals + Gregorian dates (operational register, UX-DR73) — ⛔ never Devanagari digits on this surface
- [ ] **Task 6 — The remembrance-not-analytics invariant (AC: 5)**
  - [ ] Record it in all three places; state THE TEST verbatim; state the sort-order prohibition
- [ ] **Task 7 — Tests**
  - [ ] Pure unit: render module (all four states), field-id derivation (both drift directions), filter parsing
  - [ ] Live-DB integration: the read model's predicate, the confirmed-count reversal compensation, the kill switch's identical-shape guarantee, page stability across pages
  - [ ] Negative controls that **bite**: a planted undeclared field, a planted over-tier field, a planted `shortfall` string, a planted `?format=csv`
  - [ ] ⚠ Live-DB gotchas: never regenerate an applied migration; assert **membership**, ⛔ not counts, on the shared `PARIWAR_A` tenant ([[project_live_db_test_gotchas]])
- [ ] **Task 8 — Route the deferrals (AC: 11)** — all seven items, each with a re-trigger, ⛔ none marked closed
- [ ] **Task 9 — Sprint status + Change Log** — flip `11b-1-…` to `done` at review; one combined reverse-chron ledger entry ([[project_sprint_status_ledger]])

---

## ⚖️ Decisions — ✅ **ALL TEN RULED (BigDev, 2026-08-24).** ⚠ **D10's Panel ratification is OWED.**

> ✅ **D1(b) · D2(a) · D3(a) · D4(b) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a) · D10.** ⚠ **D1 was ruled AGAINST
> the recommendation, deliberately** — the reasoning is recorded at D1 and ⛔ is not re-litigated here.
> ⇒ ⛔ **nothing in this file is conditional any more**: every `[GATED ON …]` marker has been resolved
> in place, so a later reader ⛔ cannot take pre-ruling text as still governing.
> ⚠ ⛔ **DURABILITY IS TASK 0's `governance:` COMMIT, ⛔ NOT THIS FILE** — history must read
> governance → implementation ([[feedback_governance_commits_precede_implementation]]).
> ⭐ **AND TWO RULINGS CHANGED EACH OTHER.** D1(b) removed D4(a)'s entire ground (*"no subject PII ⇒ no
> subject to gate"*), so **D4 was re-put and re-ruled (b)**. ⛔ A reader must not take D4(a)'s original
> recommendation as this story's posture — it answers a question that no longer exists.

### ✅ D1 — RULED **(b)** (BigDev, 2026-08-24) — ⚠ **AGAINST THE RECOMMENDATION, AND RECORDED AS SUCH.** (Trap 1, AC2)

> ✅ **RULING: widen the matrix's exactly-one Tier-1-at-`public` rule to admit this surface.** The
> deceased member's name renders, consent-gated (AC2). ⚠ ⭐ **The FORM is D10's, ⛔ not D1's: it is the
> member's FULL NAME**, resolved through `resolvePublicMemberName(mode, …)` — ⛔ never the shielded form
> and ⛔ never `resolvePoolIdentity()`, which can only return it.
>
> ⚠ ⭐ **THE GROUND BIGDEV GAVE, RECORDED VERBATIM IN SUBSTANCE BECAUSE IT IS THE REASONING A FUTURE
> READER NEEDS:** an unnamed beneficiary on a public transparency index reads as *the trust diverting
> funds to its own account*. *"The Trust cannot explain to lakhs of contributing members that the
> claimant does not want the name to be public."* ⇒ ⭐ **publication of the beneficiary is treated as
> CONSTITUTIVE of the mutual-aid model, ⛔ not as a courtesy** — an institutional-legitimacy argument,
> ⛔ not a convenience one.
>
> ⛔⛔ **WHAT THIS RULING DOES ⛔ NOT DO, AND THE DISTINCTION IS LOAD-BEARING:** it does ⛔ **not** make
> the consent mandatory. Niyamavali **§4.4** (*"Public rendering of any personal information is
> consent-gated and never default opt-in"*) and **Part 10** (*"Default opt-in is not permitted; an
> opt-out path is provided"*) both forbid that, and a consent that cannot be refused is not consent.
> ⇒ ⭐ the argument above is an argument that **consent is the wrong INSTRUMENT** — the right one is a
> **term of membership**, which the deceased member accepted *themselves*, in advance, with capacity.
> ⚠ **That is routed, ⛔ not decided here** — both drafts live in `_bmad-output/planning-artifacts/`:
> `niyamavali-amendment-draft-2026-08-24-drive-record-consent.md` + its routing note
> `trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md`, in counsel's hands before
> his **2026-09-07** return.
>
> ⚠ **THREE CONSEQUENCES THAT ARE NOW REQUIRED WORK, ⛔ not recommendations:**
> (i) the `superRefine` widening is a **matrix-governance change** needing its own `.decision-log.md`
> entry — ⛔ the `escalations:` ledger is the wrong vehicle (a first-time declaration is ⛔ not an
> escalation and there is no honest `from` tier);
> (ii) it **reactivated D4**, which was re-ruled **(b)**;
> (iii) it is taken **while counsel's review of this exact subject is HELD** (`-157` cl.3(a),
> returning 2026-09-07). ⛔ Recorded as taken-with-the-hold-open, ⛔ never silently. ⚠ Nothing publishes
> regardless: Row 17's posture and the per-Pariwar switch both stand.

⚠ **The pre-ruling analysis is retained below UNEDITED**, because the ruling was taken against it and a
reader is owed both halves ([[feedback_closure_language_precision]]).

**The fact:** `matrix.ts:376-395` permits **exactly one** Tier-1-at-`public` field **matrix-wide**;
it is spent on `member-directory.member_name`, whose own `scope` says it *"does NOT reach In Memoriam
or Sahyog Vivran"*. ⚠ And the check has **no `renders:` exemption**, so the field cannot even be
pre-declared unbuilt.

- **(a) ⭐ RECOMMENDED — ship v1 with NO member PII; route the name question to the Panel.** The
  surface becomes a **pool-level transparency index**: letter code + canonical identifier + district
  + close date + confirmed count + close-of-cycle framing. ⛔ No name, ⛔ no family identifier, ⛔ no
  member id. **Why:** it is the only option that ships something true **today** — the other two both
  wait on a Panel that is **already** going to be asked (counsel's A3.2/A3.3 revisit returns
  2026-09-07). ⭐ **The cost is one matrix row and one `resolvePoolIdentity()` call when the answer
  arrives** — the substrate is built and waiting. ⚠ **Held costs nothing**, in the `-157` cl.3 sense.
- **(b) Widen the `superRefine` to permit a second exception now.** ⛔ Rejected as an authoring
  choice: the rule is scoped at the root **on purpose** — *"a per-surface check would permit one
  exception on EVERY surface, which is a general door wearing the costume of an exception."* Widening
  it is a **ruling**, ⛔ not a code change, and it would be taken **while counsel's clearance for this
  exact subject is HELD**.
- **(c) Block the story until the Panel and counsel both answer.** ⛔ Rejected: it stalls Epic 11b's
  first story on a question whose answer changes **one field**, when a genuinely useful surface ships
  without it.

### ✅ D2 — RULED **(a)** (BigDev, 2026-08-24) — "Search by deceased member's name". **There is no name-search substrate.** (Trap 2, AC3)

> ✅ **RULING:** Search ships **district + date range + pool code**; name search deferred on the `name_blind_index` trigger alone (its second condition **discharged** by D1(b)).

- **(a) ⭐ RECOMMENDED — v1 search = district + date range + pool code; name search DEFERRED with a
  named trigger.** All three are queryable **without a decrypt**. **Why:** it is the honest form of
  the AC's own purpose — *"claim discoverability"* — and a district+date filter finds a drive in the
  way a mourner actually searches. ⚠ Recorded as **Resolved via explicit deferral**, ⛔ not *Closed by
  [edit]*.
- **(b) Decrypt the roster and filter in JS.** ⛔ **Rejected on the record.** It is the exact
  amplification `DIRECTORY_DECRYPT_CONCURRENCY = 8` exists to prevent, one order of magnitude worse,
  on an unauthenticated route, with the cache structurally unable to absorb it.
- **(c) Add a `name_blind_index` column in this story.** ⛔ Rejected here: a new derived index over
  Tier-1 data is its own substrate story with its own PII posture, and ⚠ **it is pointless before D1
  — a searchable name nobody may display is not a feature.**

### ✅ D3 — RULED **(a)** (BigDev, 2026-08-24) — Which publication switch gates this surface? (AC9)

> ✅ **RULING:** ONE per-Pariwar switch, its **documented** meaning generalised to *"this Pariwar's public member-data surfaces"*. ⛔ No new column, ⛔ no new roster row.

- **(a) ⭐ RECOMMENDED — reuse the ONE existing per-Pariwar switch**, generalizing its **documented**
  meaning to *"this Pariwar's public member-data surfaces"*. ⛔ No new column, ⛔ no new flag, ⛔ no
  new launch-gate roster row. **Why:** C-5 ruled exactly this — *"⛔ No new launch-gate roster rows
  are minted — a per-surface roster turns a posture into a checklist, and the posture is what binds."*
  ⇒ **one lever, one governed act, one audit line.**
- **(b) Mint a per-surface flag.** ⛔ Rejected: it lets a Pariwar be pulled from `/members` while
  still publishing its drives, which is the opposite of what the posture means.

### ✅ D4 — RE-PUT AND RULED **(b)** (BigDev, 2026-08-24) — ⚠ **(a) WAS RULED FIRST AND THEN VACATED BY D1(b).** (AC12)

> ⚠ ⭐ **THE SEQUENCE MATTERS AND IS RECORDED, ⛔ NOT TIDIED AWAY.** D4 was first ruled **(a)**
> — *"no subject PII ⇒ the gate has no subject ⇒ NOT APPLICABLE"*. That answer was **derived entirely
> from D1(a)**, and D1 was then ruled **(b)**. ⇒ ⛔ **(a) did not become wrong; its question ceased to
> exist.** It was re-put and re-ruled. ⛔ Do not read (a) anywhere as this story's posture.
>
> ✅ **RULING (b): mint `sahyog_drive_publication`** — declinable and revocable, matching its two
> siblings. Built at **AC12**.
>
> ⭐⛔ **AND THE REASON IT COULD NOT WAIT — the finding that decided it.** Consent may only be
> **RECORDED** in five **pre-adjudication** states (`DPDPA_CONSENT_RECORDABLE_STATES`), and
> `pool/spawn.ts` spawns pools *"one per **approved** claim"*. ⇒ ⭐ **by the time a pool exists at all,
> the recording window has already shut.** There is ⛔ **no moment** in this system where a pool is
> listable on Sahyog Drive **and** its family can still be asked. ⇒ every claim filed **before** this
> type exists is **permanently unaskable**, with ⛔ **no remedy**. ⭐ **The trust is pre-launch, so
> minting it now makes that cohort EMPTY BY CONSTRUCTION** — this is cheap today and impossible later.
>
> ⚠ **AN ASYMMETRY IN STORY 6.9 IS RECORDED OBSERVATIONALLY, ⛔ not fixed here**
> ([[feedback_gap_analysis_observational]]): **revocation** is open at any claim state (*"the whole
> point of AC3 is a post-settlement takedown"*) while **granting** is closed after adjudication. That
> window was drawn for the **processing** consent, whose rationale — *"consent captured after
> adjudication would be evidentially meaningless for the claim it was supposed to gate"* — ⛔ does not
> reach a **publication** consent, since publication happens after adjudication by nature. ⚠ It binds
> **11b.3** and **11b.6** as much as this story. ⛔ Not this story's to change.

**The fact:** the enum's two publication values are `sahyog_vivran_publication` (11b.3) and
`in_memoriam_listing` (11b.6). ⛔ Nothing names Sahyog Drive.

- **(a) ⭐ RECOMMENDED — under D1(a) this surface publishes NO subject PII, so the per-subject gate
  has NO SUBJECT. Record it as ⛔ NOT APPLICABLE, ⛔ never as discharged.** ⚠ And record the
  **conditional**: it becomes **required** the moment D1 reverses. **Why:** C-5's gate protects a
  *subject*; a surface naming no one has none. ⛔ Writing "consent gate: satisfied" would be false.
- **(b) Mint `sahyog_drive_publication` now.** ⛔ Rejected under D1(a): a consent type with no field
  to gate is a row nothing reads. ⚠ And Story 6.9 **already shipped**, so every claim already captured
  carries no such consent ⇒ minting it creates a **retroactive consent gap** on the same day.
- **(c) Reuse `sahyog_vivran_publication`.** ⛔ Rejected: it was captured for a **different
  publication** and reusing it would silently widen what a family agreed to
  ([[feedback_supersede_never_reinterpret]]).

### ✅ D5 — RULED **(a)** (BigDev, 2026-08-24) — Is this the POOL index, or the UX spec's contribution-level Sahyog List? (Trap 5)

> ✅ **RULING:** 11b.1 is the **POOL index**; the UX spec's contribution-level table is 11b.2's components on 11b.3's host, and the UX inventory owes an amendment.

- **(a) ⭐ RECOMMENDED — 11b.1 is the POOL index; the epic AC governs.** The UX spec's 10-column
  contribution table is **11b.2's components** on **11b.3's** per-claim host. Record a **UX-spec
  amendment** naming the three unbuildable columns (`Donation ID`, `HRMS`, `Member ID`) and the two
  **microcopy-prohibited** labels (`Donor Name`, `Late Teacher`). **Why:** the epic AC is explicit
  about grain (*"per-pool entries"*), and three of the UX columns have **no substrate at all** —
  building them would re-commit SD-1 (rows no substrate backs, unowned for seven epics).
- **(b) Build the UX table here.** ⛔ Rejected: wrong grain, three unbuildable columns, two prohibited
  labels, and it collides head-on with 11b.2.

### ✅ D6 — RULED **(a)** (BigDev, 2026-08-24) — Where does the read live? (AC8)

> ✅ **RULING:** A second `public-pages` route on `apps/api`, with its own written defence and allowlist entry.

- **(a) ⭐ RECOMMENDED — a second `public-pages` route on `apps/api`, with its own written defence and
  allowlist entry**; `apps/public` fetches over the hop. **Why:** capability, ⛔ not taste —
  `apps/public` has no rate-limit store and no audit-write pool, and `no-kms-in-public.test.ts`
  asserts it holds no key material. `routes.ts` **prescribes this exact path** for a second route.
- **(b) A local `withPublicScope` read in `apps/public`.** ⛔ Rejected — and rejected **twice
  already**, at 11a.3 (`2026-08-20-143` cl.1) and by the standing test.

### ✅ D7 — RULED **(a)** (BigDev, 2026-08-24) — The shape of the pool index read. (AC1, AC4)

> ✅ **RULING:** ONE set-based query with a lateral confirmed-count aggregate.

- **(a) ⭐ RECOMMENDED — ONE set-based query with a lateral confirmed-count aggregate.** **Why:**
  `listConfirmedContributorsForPool` scans `events_log` and reconciles in JS **per pool** — calling it
  for 25 rows is 25 scans, the AR-65 N+1 Story 10.11 paid 44s → 220s for.
- **(b) Per-row fan-out.** ⛔ Rejected on that precedent.
- ⚠ **Either way:** literal outer-table qualifiers in any correlated subquery
  ([[project_epic6_drizzle_correlated_subquery_bug]]), and `DISTINCT ON` must **lead** its `ORDER BY`
  or Postgres raises **42P10**.

### ✅ D8 — RULED **(a)** (BigDev, 2026-08-24) — Cache policy. (AC7, Trap 6, Trap 7)

> ✅ **RULING:** `edge_cacheable` for a real render and past-the-end; `no-store` + 503 + `Retry-After` on outage; `no-store` on a 400.

> ⚠ ⭐ **THE RULING STANDS; ITS ORIGINAL GROUND DOES ⛔ NOT. RESTATED, ⛔ NOT QUIETLY PATCHED.**
> (a) was argued as *"the content is non-PII **by construction under D1(a)**, so it is cacheable by
> construction."* ⛔ **D1(b) + D10 destroyed that ground**: the page now shared-caches **Tier-1 PII**
> — a deceased member's full legal name — behind a **REVOCABLE** consent, for `s-maxage=300`.
> ⇒ ⭐ **the ruling now rests on the `/members` PRECEDENT, ⛔ not on an absence of PII:** `/members`
> renders the same class of field under the same policy, and that pairing was **re-decided at 11a.3
> and kept** (`2026-08-20-143`). ⚠ **The accepted cost is therefore LARGER than (a) as written
> supposed, and it is the same cost the Launch-posture section already states:** a family's
> revocation keeps being served from every warm PoP, per page number, for up to **five minutes**.
> ⛔ Direct SQL is **not** the operational fallback. ⇒ ⛔ **do not read (a)'s original "non-PII by
> construction" sentence as still governing** — it answers a question D1(b) removed
> ([[feedback_supersede_never_reinterpret]]).

- **(a) ⭐ RECOMMENDED — `edge_cacheable` (`public, max-age=60, s-maxage=300` + `Vary: Accept-Language`)
  for a real render and for past-the-end; `no-store` for a 400 and for an outage; 503 + `Retry-After`
  on outage.** **Why:** identical to `/members`, re-decided there and **kept**; the content is
  non-PII by construction under D1(a), so it is cacheable **by construction**, and the cache absorbs
  scraper load. ⚠ **The cost is recorded, ⛔ not discovered** (Trap 6).
- **(b) `private_no_store`.** ⛔ Rejected — already rejected at 11a.3 as discarding the edge for a
  public surface.
- **(c) Cache page 1 only.** ⛔ Rejected — needs per-branch headers that `detectCacheSignal`'s
  whole-file textual scan is structurally blind to.


### ✅ D9 — RULED (a) (BigDev, 2026-08-24) — ⛔ A CONTRIBUTOR'S NAME IS NEVER REMOVED BECAUSE THEY DIED. ⚠ RTBF IS A SEPARATE RULE AND IS ⛔ NOT COLLAPSED INTO IT.

⭐ **THE RULING, IN THE MEMBER'S TERMS:** *"a contribution you made while you were alive stays in the
record with your name on it. Dying does not un-give it."* ⇒ ⛔ **no death-derived predicate may filter,
mask or anonymize a contributor row**, on any surface, at any tier.

⚠ ⭐ **WHY IT NEEDED RECORDING EVEN THOUGH THE ANSWER IS OBVIOUS: TODAY IT IS TRUE BY ACCIDENT, ⛔ NOT
BY DESIGN.** `resolveMemberDisplayName(state, name)` (`packages/domain/src/member/display-name.ts`) —
the ONE seam every contributor display path routes through, and whose own header names *"Sahyog Drive
contributor lists"* as its future consumer — takes a **`MemberLifecycleState`**. Death is an
**overlay**, ⛔ never a lifecycle label ⇒ ⭐ **that seam is blind to death BY CONSTRUCTION.** The right
behaviour falls out of a gap, ⛔ not a choice.

⛔⛔ **AND THAT IS PRECISELY THE FAILURE MODE EPIC 11b CREATES.** This is the epic that makes every
surface death-aware; C-5's sharp edge instructs authors to **add the `account-frozen` overlay conjunct**
to predicates that lack it, because 11a.3 wrongly **published** a deceased member without it. ⚠ An
author applying that correction to a **contributor** read — the same words, the same conjunct, the
obvious fix — would **silently delete dead contributors from the historical record**, and ⛔ nothing
would catch it: no gate covers it, and a shorter contributor list looks exactly like a shorter
contributor list. ⇒ ⭐ **the right conjunct in the wrong read is this ruling's whole subject.**

⚠⛔ **THE CARVE-OUT, AND IT IS ⛔ NOT AN EXCEPTION TO NEGOTIATE:** *"contribution history is never
rewritten"* is **ALREADY FALSE for RTBF**, and correctly so. `resolveMemberDisplayName` resolves an
`anonymized` member to *"an anonymous member"* **regardless of any residual name passed in** — an
explicit defense-in-depth guard so a stale join cannot leak past an erasure (Story 3.12; architecture
§2.12: the record holds a `member_id`, ⛔ never a denormalized name, so erasure needs ⛔ no history
mutation). ⚠ **And a deceased member IS reachable:** `member.rtbf_anonymized` transitions to
`anonymized` from **every** lifecycle state (`member/state.ts:192-…`, eight `from` states), and death
touches ⛔ none of them.

⇒ ⭐ **TWO RULES, ⛔ NEITHER SUBSUMING THE OTHER, AND THE DISTINCTION IS THE POINT:**
· **death** → the name **STAYS**. A historical fact about what someone did. ⛔ Nobody asked for it to go.
· **RTBF** → the name **GOES**, via the existing `anonymized` branch. A **legal obligation** the member
(or their representative) **exercised**.
⛔ **Do not write a predicate that treats them as one case**, and ⛔ do not describe this ruling as
*"contribution history is immutable"* — it is not, and a future author reading that sentence would
implement the wrong thing in the RTBF direction.

⭐ **WHAT THIS OBLIGES, CONCRETELY:** **11b.2** and **11b.3** — the stories that own contributor lists —
each carry this constraint into their own AC and Tasks lists ([[feedback_spec_edits_must_propagate_to_tasks]]:
the dev agent works from the Tasks list; a constraint living only in a decision record does not reach
the implementation). ⛔ **11b.1 builds nothing for it** and must not claim to have discharged it.

⚠ ⛔ **AND IT SETTLES ⛔ NOTHING ABOUT THE NAME *FORM*.** Contributor and donor name forms on these
surfaces remain **UNRULED**, and `-135`/`-136` still ⛔ does not reach them (Trap 4). ⛔ Do not read a
ruling that a name **stays** as a ruling on **what that name looks like**
([[feedback_supersede_never_reinterpret]]).


### ✅ D10 — RULED (BigDev, 2026-08-24) — ⭐ THE DECEASED MEMBER'S **FULL NAME**, ⛔ NOT first-name + last-initial. ⚠ **PANEL RATIFICATION IS OWED.** (AC2, Trap 4)

> ✅ **RULING: the deceased member's name renders in FULL**, in the Pariwar's configured form
> (`resolvePublicMemberName`, `full_name` default). ⛔ The shielded form is **rejected** for this surface.

⭐ **WHY IT IS THE COHERENT ANSWER, ⛔ NOT THE AGGRESSIVE ONE — three grounds, each checkable:**

**(1) ⭐ A SHIELDED NAME DEFEATS D1(b)'s OWN GROUND.** D1(b) admitted the name because *an unnamed
beneficiary reads as the Trust diverting funds to its own account*. *"Sushil K."* on a **district-level**
index barely improves on that — and the UX spec's own **Real Data Test** (`ux-design-specification.md:1252`)
is built around precisely this failure: *"duplicate surnames within the same district, duplicate **full
names** disambiguated only by Member ID + HRMS lookup."* ⇒ ⭐ **if duplicate FULL names already need a
second identifier to disambiguate, first-name + last-initial is useless for verification** — which is
the entire purpose the name was admitted for. ⛔ A half-measure here buys the DPDPA exposure of
publishing and ⛔ none of the legitimacy.

**(2) ⭐⭐ IT IS STRICTLY MORE PROTECTIVE THAN WHAT IS ALREADY AUTHORISED.** `/members` publishes the
**full legal names of LIVING members**, **by default**, with ⛔ **no member opt-out** (`2026-08-19-135`
cl.7(c) / `-136`, ratified). This surface publishes a **deceased** member's full name **only where the
family explicitly consented**, revocably (AC12). ⇒ ⭐ **shielding here while the directory publishes
living members unconsented would be incoherent**, and the incoherence would run in the *less* protective
direction.

> ⚠⛔ **A TENSION IN GROUND (2), RECORDED OBSERVATIONALLY BY THE PASS THAT CREATED IT — ⛔ NOT FIXED,
> and ⛔ NOT a reason to reopen D10** ([[feedback_gap_analysis_observational]]).
> Ground (2) reasons **from the `/members` baseline**. ⭐ **The same pass that ruled D10 found that
> baseline non-compliant with the instrument ABOVE it**: **Trust Deed cl.15(c)** requires public
> rendering of member information *"only with explicit, revocable, purpose-specific consent and
> **never on a default opt-in basis**"*; the Deed **prevails** (cl.28); cl.20(a) forbids amending the
> rulebook into inconsistency with it; and the pending 2026-08-21 directory amendment — which would
> have §4.4 read that the directory renders *"not on consent"* — is recorded **⛔ do not ratify as
> drafted**. ⇒ ⚠ **ground (2) argues *"more protective than X"* where X is itself flagged.**
>
> ⭐⛔ **WHY D10 IS UNDISTURBED ANYWAY — THE LOAD-BEARING PART:** grounds **(1)** (a shielded name
> defeats D1(b)'s own verification purpose) and **(3)** (`shielded_name` omits **every mononym**) are
> ⛔ **wholly independent of `/members`** and are **each sufficient alone**. ⛔ Do not re-put D10 on
> this. ⚠ ⭐ **AND THE DIRECTION OF TRAVEL RUNS TOWARD THIS SURFACE, ⛔ NOT AWAY FROM IT:** if cl.15(c)
> is enforced, `/members` moves **to** consent-gating — which is what **this** surface already does.
> ⇒ ⭐ **11b.1 is the compliant shape and the DIRECTORY is the outlier** — the ⛔ *opposite* of how
> ground (2) frames the pair. ⇒ ⛔ **do not cite ground (2) as precedent for a THIRD surface**
> (11b.3, 11b.6): cite (1) and (3), or seek that surface's own ruling.

**(3) ⭐ THE SHIELD IS ⛔ NOT EVEN SAFE FOR MONONYMS.** `resolvePublicMemberName` returns `''` — omit —
for **every single-token stored name** under `shielded_name` (`2026-08-21-145` cl.3), because a mononym
cannot be shielded. ⚠ **Mononyms are common in India.** ⇒ under the shielded form, an entire class of
deceased members would appear on the public drive record **unnamed**, ⛔ with no signal — reproducing
D1(b)'s fund-diversion appearance for exactly the people least able to object.

⚠⛔ **RATIFICATION IS OWED, AND THIS IS RECORDED AS *AUTHORISED, NOT MADE*.** ⭐ **Two committed records
reserve a public name-form change to the Trustee Panel**, in terms: the matrix exception's `scope:`
(*"changing those requires its own Panel ruling"*) and the 2026-08-19 `RECONCILED` block on this story
(*"Changing them requires its own Panel ruling"*). ⇒ D10 is BigDev's **position, ruled and built to**,
and it is **routed for Panel ratification** in
`trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md`. ⛔ Do not record it as
Panel-ratified until it is. ⚠ The `-144` precedent governs the form: **authorised, ⛔ not made**.

⚠ **AN INVERSION THIS CREATES, RECORDED OBSERVATIONALLY ⛔ NOT FIXED HERE**
([[feedback_gap_analysis_observational]]): `resolvePoolIdentity` shields the same deceased family's name
on the **member-facing** My Pool card, passbook and notifications (8.6/8.7/8.8). ⇒ after D10 the
**public** page shows **more** than the **member** app does for the same pool. ⛔ Not this story's to
resolve — it binds **11b.2** and **11b.3**, and it is a real question for whoever authors them.

---

## Dev Notes

**The one-line summary of this story:** it is `/members` again, over **pools instead of members**,
with the **PII removed** and a **filter added** — and almost every hard decision has already been
made, in files you can read.

- **⛔ Do not re-derive the anti-enumeration posture.** It is five controls, enumerated twice, in
  `routes.ts` and `login-wall.spec.ts`. Copy the shape; ⛔ do not invent a sixth or drop one.
- **⛔ Do not "tidy" the forwarded-address handling.** `buildForwardedFor` returning `null` rather than
  `''` is load-bearing, and the discarded-hops cost is a **known, accepted** limit — re-examined only
  when a CDN is actually configured.
- **⚠ `total` is index size, ⛔ not rendered-row count** — ⭐ **but the reason DIFFERS from `/members`,
  and you are told to copy `members.astro` "in every respect", so this is the seam where that
  instruction stops.** On `/members` an unresolvable name suppresses the **ROW**, so the page really
  can come up short of `total`. **Here AC2 rules the opposite: an unresolvable or unconsented name
  omits the NAME and the ROW SURVIVES.** ⇒ on this surface rendered rows and `total` agree except for
  pagination and the publication switch — a *nameless* row still counts. ⛔ Still never describe
  `total` as a rendered count (the invariant holds), and ⛔ never add an omission count: a per-row
  "name withheld" tally is exactly the enumeration signal AC2 forbids announcing.
- **⚠ An outage is not an empty index; past-the-end is not "never published".** Four states, four
  renders, four cache/status pairs. `members.astro` shipped a bug here that pinned an outage message
  into a shared edge for five minutes.
- **⭐ `t()` defaults to `common` and THROWS.** Every call site passes an explicit namespace. Assert
  copy **through** `t()`, ⛔ not around it — that is precisely how the 11a.2 interpolation defect
  reached production green.
- **⚠ Type-only → value import cycles** materialize a module-init cycle that breaks **consuming**
  packages at runtime while typecheck, lint and local tests all stay green
  ([[project_type_only_import_cycle_trap]]). Be deliberate about what the new domain module imports.
- **⚠ `git push` runs the full `ci:local` via a pre-push hook** — that is the "hang", ⛔ not a failure
  ([[project_friction_budget_baseline_ratchet]]). And the friction-budget AC diffs **committed**
  history, so it passes vacuously until you commit.
- **⚠ `pnpm ci:local`:** `integration-tests` concurrency is `1` and is **LOAD-BEARING** — ⛔ never
  raise it ([[project_ci_local_concurrency_oversubscription]]).
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes

| Path | New/Update | Note |
|---|---|---|
| `packages/domain/src/pool/public-read.ts` | **NEW** | The pool index read + count. Barrelled from `pool/index.ts`. ⛔ Transport-free, ⛔ decrypt-free, ⛔ audit-free — the `directory-read.ts` posture. |
| `packages/domain/src/pool/index.ts` | UPDATE | One `export *` line + its comment, matching the file's existing per-story annotation style. |
| `packages/contracts/src/public-pages/` | UPDATE | The request/response schemas + shared bounds. ⛔ Import the pagination constants; ⛔ never re-declare a cap. |
| `packages/contracts/src/public-pages/matrix.ts` | UPDATE | ⭐ **Task 3c** — the D1(b) widening of the exactly-one `superRefine` (`:376-395`), citing the decision entry in the message. ⛔ Enumerated, ⛔ never removed: a **third** exception must still FAIL. |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | UPDATE | The `sahyog-drive` surface + its **mandatory** `tier1_public_exception` (`matrix.ts:176-197` is biconditional). ⛔ `escalation_count` stays `1` — ⚠ a **different ledger**. ⚠ Replace the *"Epic 11b surfaces are DELIBERATELY NOT DECLARED"* header note for **this** surface only (⛔ 11b.3/11b.6 stay undeclared, and the note must still say so); annotate `member_name`'s `scope:`; and ⚠ correct the false *"legal counsel NOT engaged"* claim at `:412`. |
| `packages/domain/src/kyc/public-name.ts` | ⚠ **READ-ONLY — reuse** | `resolvePublicMemberName(mode, storedName)`. ⛔ **Never** `resolvePoolIdentity()` (hard-codes `splitFirstNameLastInitial`), ⛔ never a literal. ⚠ Under `full_name` a **mononym** resolves normally — ⛔ do not re-implement that branch. |
| `packages/domain/src/kyc/presentation-policy.ts` | ⚠ **READ-ONLY — reuse** | `resolvePublicNamePresentationMode(db, pariwarId)` — the per-Pariwar form. `full_name` is the **DEFAULT, ⛔ not a constant** (`-136` cl.1). |
| `packages/domain/src/consent/read.ts` | ⚠ **READ-ONLY — reuse** | `consentExists(db, pariwarId, subjectId, type, validAt?)` — ⭐ **one query PER SUBJECT.** ⛔ Never call it per row; batch the page's subject set (AC2). |
| `packages/domain/src/schema/consent_records.ts` + a new migration | UPDATE / **NEW** | `sahyog_drive_publication` appended at the **END** of the pgEnum, ⛔ never reordered, in **its own migration file** (the DDL cannot run in a tx). |
| `apps/api/src/modules/public-pages/{routes,handlers}.ts` | UPDATE | Second route + its defence block. ⚠ `routes.ts`'s *"NO SECOND ROUTE"* header is **updated, not deleted** — it becomes the two-route rule with both defences. ⭐ **`handlers.ts` also owns the Tier-1 decrypt** — reuse `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY` (`:55`, `:205`) and `encryption.decryptKycField`. ⛔ Nothing else in the repo can do this. |
| `apps/api/src/modules/public-pages/abuse-rules.ts` (+ its README) | UPDATE | AC6's per-surface rules + the **remembrance-not-analytics** block (one of AC5's three places) + the **Trap-6 edge-blindness** note. ⚠ Described as **a COUNTER, ⛔ not a forensic record**. |
| `apps/api/tests/**/login-wall.spec.ts` | UPDATE | The allowlist entry. ⚠ Control count must match `routes.ts`. |
| `apps/public/src/pages/sahyog.astro` | **NEW** | Thin frontmatter, `members.astro` shape. |
| `apps/public/src/lib/sahyog-render.ts` | **NEW** | ALL display logic, pure. |
| `apps/public/src/lib/sahyog.server.ts` | **NEW** | The hop client, `directory.server.ts` shape. |
| `apps/public/src/lib/surface-fields.ts` | UPDATE | The `sahyog-drive` field-id mapping. |
| `packages/i18n/locales/{hi,en}/*.json` + `src/catalog.ts` | UPDATE | New namespace — ⭐ **THREE registration sites in `catalog.ts`, ⛔ not two**: the two `import`s, the `catalogs` map's `en:`+`hi:` (`:62-63`), and ⭐ **`KNOWN_NAMESPACES` (`:67`)**, a separate literal that can drift. `catalog-registration.test.ts:70` fails loudly on drift — run it. |
| `microcopy.yaml` | UPDATE | `copy_globs` + proven teeth. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | The seven AC11 items. |
| `_bmad-output/planning-artifacts/epics.md` | ✅ **DONE by this pass** | The AI-11a-1(b) `RECONCILED` block. |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11b.1`] — the AC + all four annotation blocks
- [Source: `_bmad-output/planning-artifacts/epics.md#Epic-11b`] — C-1…C-5, the C-5 sharp edge, the AI-11a-2 rulings
- [Source: `.decision-log.md#decision-2026-08-24-157` cl.3] — the clearance narrowed; 11b.1 named
- [Source: `.decision-log.md#decision-2026-08-24-158`] — ⛔ *"counsel is not engaged"* may never be written again
- [Source: `.decision-log.md#decision-2026-08-23-154`] — SD-2 disposition (c); C-1 and C-5 ruled
- [Source: `.decision-log.md#decision-2026-08-21-145`] — the forwarded-address ruling; the IP-is-not-evidence finding; the third roster conjunct
- [Source: `.decision-log.md#decision-2026-08-20-143`] — why the read lives at `apps/api`; the page horizon; the cache re-decision
- [Source: `packages/contracts/src/public-pages/matrix.ts:376-395`] — the exactly-one Tier-1 rule
- [Source: `packages/contracts/public-pages/public-vs-private-matrix.yaml`] — the 11b non-declaration note; the exception's scope
- [Source: `packages/domain/src/member/directory-read.ts`] — the render-never-a-benefit fence; the three-half predicate
- [Source: `packages/domain/src/schema/member_kyc_profiles.ts:70-78`] — ⛔ no name blind index
- [Source: `packages/domain/src/member/search-read.ts:41-44`] — the three search criteria
- [Source: `packages/domain/src/schema/consent_records.ts:102-127`] — the consent-type enum
- [Source: `packages/contracts/src/public-pages/matrix.ts:176-197`] — ⭐ the **biconditional** Tier-1-at-`public` ⇄ `tier1_public_exception` rule (both directions fail-closed)
- [Source: `packages/contracts/public-pages/public-vs-private-matrix.yaml:412,417`] — the stale counsel claim; `escalation_count: 1`
- [Source: `packages/domain/src/consent/read.ts:36`] — `consentExists(db, pariwarId, subjectId, type, validAt?)`, ⭐ **one query per subject**
- [Source: `packages/domain/src/kyc/public-name.ts` · `kyc/presentation-policy.ts`] — `resolvePublicMemberName` · `resolvePublicNamePresentationMode`
- [Source: `apps/api/src/modules/public-pages/handlers.ts:55,192-225`] — `DIRECTORY_DECRYPT_CONCURRENCY`, `mapWithConcurrency`, the pre-sized slot array, the per-row fail-soft decrypt
- [Source: `packages/i18n/src/catalog.ts:62,63,67`] — ⭐ the **three** registration sites; `packages/i18n/tests/catalog-registration.test.ts:70` is the drift guard
- [Source: `packages/domain/src/schema/pools.ts:71`] — `POOL_LIFECYCLE_STATES` = `spawned · live · closed · settled`
- [Source: `packages/domain/src/notifications/pool-identity.ts`] — `resolvePoolIdentity`
- [Source: `packages/domain/src/close-of-cycle/framing.ts`] — Pool-Reality #2, target quarantined
- [Source: `packages/domain/src/contribution/read.ts:132`] — `listConfirmedContributorsForPool`
- [Source: `apps/api/src/modules/public-pages/routes.ts`] — the five controls; ⛔ NO SECOND ROUTE
- [Source: `apps/public/src/lib/pagination.ts`] — FR-91 on this surface; ⛔ bulk export forbidden
- [Source: `apps/public/src/lib/directory.server.ts`] — the hop client; `buildForwardedFor`
- [Source: `apps/public/src/pages/members.astro`] — the surface template
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md:1158`] — the Sahyog List column inventory (see D5)
- [Source: `microcopy.yaml:42,48,296-356`] — prohibited terms; `copy_globs`
- [Source: `_bmad/custom/load-bearing-invariant-checklist.md`] — family 13
- [Source: `_bmad-output/implementation-artifacts/epic-11a-retro-2026-08-23.md:381`] — AI-11a-1(b)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-24 | 1.2 | **Validation pass — ⭐ the ruling text was current, the ACs and Tasks were ⛔ NOT.** D1(b) + D10 were ruled *after* the ACs were drafted and the rewrite did not reach everywhere. ⛔ **Six contradictions removed:** the AC preamble still declared AC2/AC3 *"gated on … the recommended rulings (D1(a) + D2(a))"*; **AC7 forbade the `tier1_public_exception` Task 4 requires** — and `matrix.ts:176-197` is **biconditional**, so under D10 the block is mandatory (the `escalation_count` **stays 1**, a *different* ledger); AC3 still published the shielded form; **D8's cache ruling rested on *"non-PII by construction under D1(a)"***, a ground D1(b) destroyed (restated on the `/members` precedent, with revocation latency as the accepted cost); D1's Niyamavali-draft filename was **dangling**; and the Policy-meaning note stated only **one** of the story's **two** render predicates. ⭐⛔ **AND TWO PERFORMANCE DEFECTS D10 CREATED, BOTH UNOWNED:** the **Tier-1 decrypt had no task at all** (Task 1 is decrypt-free by rule, `apps/public` provably cannot decrypt) ⇒ assigned to Task 2 with `mapWithConcurrency` + `DIRECTORY_DECRYPT_CONCURRENCY` **required, ⛔ not merely cited**; and **`consentExists` is one query PER SUBJECT** ⇒ per-row calling is the identical AR-65 N+1 **D7(a) had just ruled out**, now batched with consent evaluated **before** the decrypt. ⚠ Also: `catalog.ts` has **three** registration sites (`KNOWN_NAMESPACES` is a separate literal); a binding **execution order** added (Task 3b's one-way door first); D10's ground (2) carries an **observational** note that it argues from the `/members` baseline the same pass found Deed-cl.15(c)-non-compliant (⛔ grounds (1)+(3) are independently sufficient — D10 undisturbed); and `epics.md`'s DISPOSITIONS paragraph, which contradicted D10 one paragraph above it, annotated in place. | BigDev + Claude |
| 2026-08-24 | 1.1 | **D10 ruled (BigDev): the deceased member's FULL NAME renders**, ⛔ not first-name + last-initial. ⭐ Three grounds: a shielded name **defeats D1(b)'s own ground** (the UX Real Data Test shows duplicate *full* names already need a second identifier); it is **strictly more protective** than `/members`, which publishes **living** members' full names unconsented; and `shielded_name` **omits every mononym** (`-145` cl.3), common in India. ⚠ **Panel ratification OWED** — recorded *authorised, ⛔ not made*, and routed. ⭐ Build consequence: `resolvePublicMemberName(mode, …)`, ⛔ **never** `resolvePoolIdentity()`, which hard-codes the split. ⚠ Observational: the public page now shows **more** than the member app does for the same pool — binds 11b.2/11b.3. | BigDev + Claude |
| 2026-08-24 | 1.0 | **All nine decisions RULED (BigDev): D1(b) · D2(a) · D3(a) · D4(b) · D5(a) · D6(a) · D7(a) · D8(a) · D9(a).** ⚠ D1 ruled **against** the recommendation on a stated institutional-legitimacy ground — an unnamed beneficiary reads as fund diversion. ⭐ That vacated **D4(a)** (whose ground was D1(a)), re-put and re-ruled **(b)**. AC2 rewritten (name renders consent-gated; ⭐ consent gates the NAME, ⛔ never the ROW); **AC12 added** (the consent substrate — ⭐ cheap now, **impossible after launch**); AC3/AC11 re-scoped; Tasks 3b/3c added. ⚠ Recorded: D1(b) taken with counsel's hold open, and the mandatory-consent question routed as a **Niyamavali §4.4 / T&C amendment**, ⛔ not encoded here. | BigDev + Claude |
| 2026-08-24 | 0.2 | **D9 raised and RULED (a) by BigDev**: a contributor's name is never removed because they died — ⭐ recorded because the seam that would enforce it (`resolveMemberDisplayName`) is **blind to death by construction**, so the right behaviour holds by accident; and because **RTBF already erases a contributor's name** and a deceased member is reachable by `member.rtbf_anonymized` from every lifecycle state, so the two rules must ⛔ never be collapsed. Binds **11b.2 / 11b.3**; 11b.1 satisfies it vacuously. | BigDev + Claude |
| 2026-08-24 | 0.1 | Story authored. ⭐ Four defective ACs found and reconciled — three of them **new findings of this pass** (the matrix's exactly-one Tier-1 rule, the absent name-search substrate, the absent consent type); the fourth (counsel's held clearance) carried from `2026-08-24-157`. AI-11a-1(b) discharged: the reconciliation is written back to `epics.md`. Eight decisions raised, ⛔ all unruled. | BigDev + Claude |
