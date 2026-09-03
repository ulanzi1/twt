---
baseline_commit: ff6e546daad39a171b1b57b2ae7c194e368caae5
---

<!--
⭐ BASELINE — RE-POINTED 2026-09-04 to a `main`-line SHA, exactly as the prior note instructed.

`ff6e546` is `origin/main` at the commit this story's branch
(`story/11b-10-unguessable-address-and-inbound-path`) was cut from — i.e. `main` immediately after
**PR #220** rebase-merged. It carries 11b.3a's shipped surface, its second-pass fixes, and the two
Trustee decisions (`2026-09-03-184` / `2026-09-04-185`) that created this story.

⭐ **THE PREDICTED SHA REWRITE HAPPENED, AND IS RECORDED RATHER THAN QUIETLY PATCHED.** This field
previously held `0cd615f`, the pre-merge branch head. PR #220 merged by **REBASE**
([[project_story_automator_ops]] — ⛔ never squash for multi-commit governance stories), which rewrote
every SHA: `0cd615f` became **`f7370a8`** on `main`, and the branch head `a8125e2` became `ff6e546`.
⇒ the old value was ⛔ never wrong in CONTENT (its tree is identical to `f7370a8`) but it sat off
`main`'s first-parent line, which is why it is now re-pointed.

⛔ **DO ⛔ NOT re-point this to `e16cc69`** (the pre-#220 `origin/main`). That baseline would fold
**all of 11b.3a's review work** into 11b.10's diff and make its review read a change set this story
does ⛔ not own — the one failure this field exists to prevent
([[feedback_story_validate_footguns]]).
-->


# Story 11b.10: Sahyog Vivran — the Unguessable Public Address + the Inbound Path `[SURFACE]`

Status: review

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is created by a **Trustee-ratified
> decision** (`2026-09-03-184`), ⛔ not by epic decomposition — exactly as `11b-3a` was. ⇒ it owes an
> `epics.md` **ANNOTATION** (Task 0), and ⛔ a future `sprint-planning` run must ⛔ not drop it or
> regenerate a ghost.
>
> ⛔⛔ **WHY IT IS ITS OWN STORY AND ⛔ NEITHER 11b.3's NOR 11b.3a's.** `2026-09-03-184`'s follow-ups
> record it in terms: it touches **Story 11b.3's** surface (the drive page and its addressing) **and**
> **11b.3a's** (the four Tier-1 fields that make the address matter), so ⛔ neither may absorb it
> retrospectively. ⚠ It is ⛔ **not** a fourth child of 11b.3's ruled **three-way** split (`D6(b)`,
> `2026-09-02-182`) — ⛔ do not renumber it `11b-3c`, which would misrepresent that ruling.
>
> ⛔⛔ **THIS STORY IS A DEPLOYMENT BLOCKER FOR EPIC 11b.** `deferred-work.md` carries it as
> BLOCKING ON DEPLOYMENT. ⛔ The Sahyog Vivran surface does not ship until this lands.

---

## Story

**As** the Trust,
**I want** a drive's public page to sit behind an address nobody can guess **and** to be reachable by
the people who should reach it,
**so that** four decrypted Tier-1 bank fields stop being collectable by counting — ⛔ **without** the
page becoming reachable by nobody at all.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **This story introduces ⛔ NO predicate that gates a member's access to a benefit.** ⭐ Stated
explicitly rather than omitted, because an absent note is indistinguishable from an unasked question.

⭐ **AND `D1` REMOVED THE ONLY CANDIDATE.** An earlier draft of this note hedged that AC4 *might*
introduce a check on who may open a `live` drive's page. ⛔ **It will not:** D1 ruled the page answers
**200 to anyone presenting a valid address**, with ⛔ no session and ⛔ no reader-side check of any kind.
⇒ there is ⛔ **nothing here to gate on**, which is the strongest form this note can take — the
prohibition is **structural**, ⛔ not a rule someone must remember.

⚠⛔ **THE ONE THING THAT COULD STILL GO WRONG, so it is written down:** if a future change ever refuses
a reader this page, that must ⛔ **never** be because of the reader's **membership standing** — ⛔ no
`members.state`, ⛔ no `is_valid`, ⛔ no moderation overlay. ⭐ A token check is a check on the
**ADDRESS**; a membership check would be a check on the **PERSON**, and only the first is authorised.
⭐ `2026-08-28-160` **cl.10(f)** already rules the neighbouring masking control a
**public-presentation** control that must ⛔ not prevent a **suspended** member from reaching what they
need; ⛔ the same posture binds here.

⭐ **Checked against the Niyamavali:** the Niyamavali is **silent** on public-surface reachability.
⛔ Recorded as silence, ⛔ not read as permission or prohibition
([[feedback_niyamavali_rulebook_not_spec]] — it is an agent-drafted reference and ⛔ never a blocker).

---

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Status |
|---|---|---|
| The drive page | `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro` | ✅ shipped (11b.3 + 11b.3a) |
| Its API route | `apps/api/src/modules/public-pages/handlers.ts` + `routes.ts` | ✅ shipped, `limits.search` |
| The canonical identifier | `packages/domain/src/pool/naming.ts` — `P-YYYY-MM-###`, `sequence` is a **monotonic per-(pariwar, month)** counter (`:185`) | ✅ shipped |
| Tenant resolution on the public site | `apps/public/src/lib/pariwar.server.ts` — `ACTIVE_PARIWAR_ID`, a **server-side constant** | ✅ shipped |
| `/sahyog` index | `apps/public/src/pages/sahyog.astro` + `lib/sahyog-render.ts` | ✅ shipped — lists `closed` + `settled` |
| **A link from the index to a drive page** | — | ⛔ **DOES NOT EXIST** |
| **Any link to a drive page, anywhere** | — | ⛔ **DOES NOT EXIST** |
| A mobile-app path to a drive page | `apps/mobile` | ⛔ **ZERO** references to `sahyog-vivran` |
| A notification carrying a drive link | `packages/channels`, `apps/jobs` | ⛔ none |

⭐⭐ **THE ONE MEASUREMENT THIS STORY IS BUILT ON:** `apps/public/src/lib/sahyog-render.ts` produces
**exactly TWO** `href`s — `:308` (`page - 1`) and `:315` (`page + 1`). ⇒ **⛔ NO drive page is navigable
from anywhere, in ANY state.** The index **LISTS** drives; it ⛔ never **LINKS** to them.

---

## ⛔ THE FIVE TRAPS

### Trap 1 — ⭐⛔⛔ SHIPPING THE TOKEN WITHOUT THE PATH DEFEATS A RATIFIED ANSWER, AND IT WILL LOOK LIKE PROGRESS

`2026-09-03-184` **cl.4**, widened by `2026-09-04-185` **cl.3**: the token and the inbound path are
**ONE deliverable in two parts**.

⚠ The token is the **easy, satisfying** half — it is a contained change and it *feels* like the security
win. ⛔ **Landing it alone makes the ENTIRE Sahyog Vivran surface reachable by NOBODY**, because there
is no link to any drive page today. ⇒ that silently converts the Panel's ratified **(A) YES, a live
drive should be publicly reachable** into *"nobody can"* — ⛔ **while passing every gate and looking
like a security improvement.**

⛔ **A partial landing is ⛔ not a milestone here.** ⛔ Do not split this story to ship the token first.

### Trap 2 — ⚠⛔ THE INDEX LINK IS ⛔ NOT A TRIVIAL ADDITION

`2026-09-04-185`'s second follow-up says so in terms. Adding a per-row link on `/sahyog` puts **every
listed drive ONE CLICK** from a page carrying **four Tier-1 fields** under `D8-default` **FAIL-OPEN**.

⚠ Today those pages are technically reachable but practically un-navigated. ⇒ **this story
simultaneously makes the surface harder to ENUMERATE and much easier to REACH**, and the second half is
a real change in exposure that ⛔ must not ride in unremarked as "just a link". ⭐ Say what it does in
the story record, ⛔ do not let a reviewer discover it in a diff.

### Trap 3 — ⛔ THE CANONICAL IDENTIFIER IS AN AUDIT KEY — ⛔ THE TOKEN IS AN ADDITION, ⛔ NEVER A REPLACEMENT

`2026-09-03-184` **cl.2**: `P-YYYY-MM-###` is **RETAINED**. Story 7.1's unique index, every audit line,
the `resource_locator` on abuse records, and the operator-facing vocabulary all key on it.

⛔ Do ⛔ **not** replace the identifier with the token, ⛔ not in the DB, ⛔ not in audit, ⛔ not in
operator copy. ⭐ The token governs the **public address only**.
⚠⛔ **AND THE IDENTIFIER MUST ⛔ NOT LEAK BACK INTO THE PUBLIC URL** as a second addressable form — a
route that accepts *either* the token *or* the bare identifier has ⛔ **not** closed the walk; it has
added a lock beside an open door. ⛔ There must be exactly ONE public address form.

### Trap 4 — ⚠ `D8-default` FAIL-OPEN IS UNCHANGED — THIS STORY CHANGES **WHO CAN FIND**, ⛔ NOT **WHAT IS SHOWN**

`2026-09-03-184` **cl.5**: option (d) was **disclosure only** and the Panel did ⛔ not direct it.
⇒ every Pariwar still renders **complete** details until the Trust configures a window.
⛔ Do ⛔ **not** "improve" the default while in here. ⭐ It is a ratified setting
(`2026-09-02-179` cl.1), and changing it is a Panel act ([[feedback_supersede_never_reinterpret]]).

### Trap 5 — ⛔ THE RATE-LIMIT TIER IS ⛔ NOT YOURS TO TOUCH

The Panel directed option **(c)**, ⛔ **not** option (b). `limits.search` stays as it is.
⚠ 11b.3a's **AC2** rules that tightening it as an authoring act is exactly what may not happen — and
that rule did ⛔ not expire when the note was answered. ⛔ If the token work makes a different tier look
obviously correct, that is a **new routing note**, ⛔ not an edit.

---

## Acceptance Criteria

### AC0 — The governance is transcribed BEFORE any code

**Given** this story exists only because of `2026-09-03-184` (Trustee-ratified) as corrected by
`2026-09-04-185`
**Then** Task 0 writes the `epics.md` **annotation** recording that this story exists, why, and that it
is ⛔ not a member of 11b.3's ruled three-way split
**And** the two decisions are cited in the story record with what each settled and what each left open
**And** ⛔ **no code lands before that commit** ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The public address is unguessable, and there is exactly ONE address form

**Given** `2026-09-03-184` **(B)**
**When** a drive page is addressed publicly
**Then** the URL carries an **opaque token** that cannot be derived by counting
**And** ⛔ the bare `P-YYYY-MM-###` form is **NOT** independently addressable on the public route — a
route accepting either form has ⛔ not closed the walk (Trap 3)
**And** the canonical identifier is **RETAINED** unchanged as the operational/audit key, and still
appears in operator-facing surfaces and audit lines
**And** a test asserts that a request carrying a **valid identifier with a wrong or absent token** is
refused, and that the refusal is **indistinguishable** from the one for a non-existent drive — ⛔ a
different response for "real drive, wrong token" is itself an enumeration oracle.

### AC2 — The token is RANDOM, STORED, ROTATABLE, and BACKFILLED [D2 RULED]

**Given** **D2**, ruled random-stored-rotatable because **D1** made an open link permanent access until
rotation
**Then** the token is **128 bits** of CSPRNG entropy, rendered URL-safe, stored on the pool row under a
**unique index**, and generated at pool spawn
**And** ⛔ it is **NOT derived** from `pool_id`, the canonical identifier, or any pool fact — ⚠ pool
spawn's UUIDv5 determinism ([[project_pool_spawn_saga_atomicity]]) is ⛔ **not** a reason to make the
token reproducible; deriving it from pool identity re-creates the guessability this story removes
**And** ⭐ **ROTATION EXISTS AND IS EXERCISED BY A TEST** — rotating one drive's token invalidates its
old address and ⛔ leaves every other drive's address untouched. ⚠ Without this, D1's open-link ruling
has ⛔ **no remedy** for a link that spread too far
**And** ⛔⛔ **THE MIGRATION BACKFILLS EVERY EXISTING POOL**, and a test asserts **ZERO** NULL tokens
across all visible states — ⚠ a visible pool with a NULL token is a drive whose page **404s**, so a
nullable column left nullable ships a **broken archive**
**And** ⛔ the token is ⛔ **never** presented as a security boundary for the DATA — it bounds
**discovery**, ⛔ not authorisation (D1). ⭐ Say so where it is generated.

### AC3 — The inbound path for `closed` / `settled` — the `/sahyog` per-row link

**Given** `2026-09-04-185` cl.3–4: **all three states** need a path, ⛔ not only `live`
**When** the index renders a drive row
**Then** the row carries a link to that drive's page, built with its token
**And** ⭐ **[D3 RULED]** this is the **necessary consequence** of (A)+(B), ⛔ not a fresh exposure
decision — **but the exposure change is STATED IN THE STORY RECORD IN THESE TERMS**: *"every listed
drive becomes ONE CLICK from four Tier-1 fields under `D8-default` FAIL-OPEN"* ⇒ ⛔ a reviewer must meet
that sentence in **prose**, ⛔ never discover it in a diff (Trap 2)
**And** the link is announced coherently to assistive technology — ⛔ never a bare "click here", and the
row's accessible name identifies **which drive** it opens (family 13, in its web form).

### AC4 — The inbound path for `live` drives

**Given** `2026-09-03-184` **(A)** — ratified **YES**
**When** a `live` drive exists
**Then** it is reachable by a real path, ⛔ not by URL construction
**And** ⭐ **[D4 RULED]** that path is a **MEMBER-APP ENTRY ON TAB 1 — "My Pool"** (`(tabs)/index.tsx`),
sitting **beside** `<ActiveContributionCard />` in `<ViewContributorsEntry />`'s ruled shape (8.3 D8:
beside the card, ⛔ never inside it) and **self-suppressing in lock-step** with the card
**And** ⛔⛔ ⛔ **NOT the Shradhanjali tab**, despite its name — it renders `sample-data` and has ⛔ zero
API wiring (D4's table); choosing it would silently re-scope this story
**And** the token reaches the app **SERVER-RETURNED** on `useActiveContributionQuery`'s response — ⛔ the
client ⛔ **never** builds an address from pool facts, which would re-create D2's guessability in the app
**And** ⛔ **no notification**, ⛔ no 8th FR-71 category, ⛔ no new deep-link resource, ⛔ no new route group
**And** ⭐ **[D1 RULED]** the page answers **200 to anyone presenting a valid address** — ⛔ **no member
session**, ⛔ no new auth surface, and ⛔ **no branch on the reader's membership standing** of any kind
(the Policy-meaning note above binds here: ⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no moderation
overlay may ever gate this page)
**And** ⚠ the **price of D1 is carried, ⛔ not hidden**: a forwarded link is permanent public access to
that drive **until its token is rotated** ⇒ the rotation path AC2 requires is what makes D1 survivable,
and ⛔ the two must not be separated
**And** ⛔ `live` drives are **STILL NOT ADDED** to the `/sahyog` index — `public-read.ts:84-87` excludes
them deliberately (*"an open solicitation"*), and ⛔ that ruling is untouched by (A). ⭐ (A) says a live
drive should be **reachable**; it does ⛔ **not** say **listed**.

### AC5 — ⛔ Nothing else moves

**Then** `D8-default` FAIL-OPEN is **unchanged** (Trap 4) · the rate-limit tier is **unchanged**
(Trap 5) · cl.10(a) is **unchanged** · the masking schedule, its knob and its predicate are **untouched**
**And** 11b.3a's Tier-1 allowlist entries and the matrix are **unchanged** — ⛔ this story adds ⛔ no
field and changes ⛔ no tier
**And** a test asserts the `sahyog-vivran` Tier-1-at-`public` **count is unchanged** by this story.

### AC6 — The deployment gate is CLOSED, and said so in the right words

**Given** `deferred-work.md` carries this as **BLOCKING ON DEPLOYMENT**
**When** AC1–AC4 have all landed **together**
**Then** the item is recorded **"Closed by [edit]"** ([[feedback_closure_language_precision]]) — ⛔ never
*"resolved via deferral"*
**And** ⛔ if any of AC1–AC4 is **not** delivered, the item stays **BLOCKING** and the story does ⛔ not
close — ⛔ a partial landing is the one outcome Trap 1 forbids.

---

## ⚖️ Decisions — ✅ **ALL FOUR RULED. ⛔ ZERO BLOCKING.**

> ✅ **THE TASK 0 STOP CONDITION IS DISCHARGED.** D1–D3 ruled the **address** 2026-09-04; **D4** ruled
> the **inbound path for `live`** 2026-09-04b. ⭐ Same shape as 11b.3's Task 0 STOP condition
> (`2026-09-02-176`) — discharged **by a ruling**, ⛔ never by an author's guess.

### ✅ D1 — RULED by BigDev, 2026-09-04: **AN OPEN LINK — anyone holding it, ⛔ no session required**

`2026-09-03-184` ratified *"publicly reachable"* and ⛔ expressly left this open. ⭐ **Ruled: the token
IS the bound, and it bounds DISCOVERY, ⛔ not AUTHORISATION.** A `live` drive's page answers **200** to
anyone presenting a valid address — ⛔ no member session, ⛔ no new auth surface.

⭐ **Ground:** it is the same posture `closed`/`settled` already have ⇒ **ONE surface, ONE rule.** A
split rule would have made the page's access depend on the drive's lifecycle state, which is a second
thing to reason about on the most sensitive surface in the epic.
⭐ **And it dodges a known blocker rather than walking into it:** ⛔ **no browser surface holds the
member token today** — a constraint that has defeated authenticated-tier ACs in **four stories across
two epics** ([[project_no_browser_member_token_surface]]). Choosing member-authentication here would
have made 11b.10 the fifth.

⚠⛔ **AND THE PRICE IS PART OF THE RULING, ⛔ not a footnote:** a link, once forwarded, is **permanent
public access to that drive until the token is ROTATED.** ⇒ **that is exactly why D2 rules the token
ROTATABLE** — the two decisions are one design, and ⛔ a non-rotatable token under D1 would leave a
leaked link with no remedy at all.

### ✅ D2 — RULED by BigDev (author's call), 2026-09-04: **RANDOM · STORED · ROTATABLE** — ⛔ not derived

| | Random + stored | Derived (HMAC over pool identity) |
|---|---|---|
| Storage | ⚠ a column + unique index | ⭐ none |
| Reproducible for audit | ⚠ by reading the row | ⭐ by recomputation |
| **Rotatable per drive** | ⭐ **YES** | ⛔ **NO** — rotating the secret invalidates **EVERY** link at once |

⭐⭐ **ROTATABILITY IS WHAT DECIDES IT, AND ⛔ ONLY BECAUSE D1 WENT THE WAY IT DID.** Under an open-link
rule the sole remedy for a link that has spread further than intended is to **invalidate that one
drive's address**. ⛔ A derived token cannot do that without a per-pool salt — and a per-pool salt **IS**
stored randomness, so the "no storage" advantage evaporates precisely when it is needed.

**Ruled shape:** **128 bits** of CSPRNG entropy, rendered URL-safe · stored on the pool row under a
**unique index** · generated at pool spawn · **backfilled for every existing pool** by the migration.

⚠⛔ **THE BACKFILL IS ⛔ NOT OPTIONAL AND ⛔ NOT A DETAIL:** a visible pool with a NULL token is a drive
whose page **404s** — ⇒ the migration must fill **every** existing row, and a test must assert **zero**
NULL tokens across all visible states. ⛔ A nullable column left nullable ships a broken archive.
⚠ Pool spawn is 7.3's **last-child-finalizes** saga with a **deterministic UUIDv5** `pool_id`
([[project_pool_spawn_saga_atomicity]]) — ⛔ the token is **random and is NOT part of that determinism**;
⛔ do ⛔ not derive it from `pool_id` "to keep spawn reproducible", which would re-introduce exactly the
guessability this story exists to remove.

### ✅ D3 — RULED by BigDev, 2026-09-04: **IMPLIED by (A)+(B) — build the index link, and STATE what it does**

⭐ **Ruled: ⛔ not a fresh Panel question.** (A) says drives should be reachable and (B) removes the only
current path ⇒ a link is the **necessary consequence** of two ratified answers, ⛔ not a new exposure
decision smuggled alongside them.

⚠⛔ **BUT IT IS RECORDED, ⛔ NOT WAVED THROUGH** (Trap 2). This story makes the surface **harder to
ENUMERATE and materially easier to REACH**, and the second half is a real change: every listed drive
becomes **ONE CLICK** from four Tier-1 fields under `D8-default` **FAIL-OPEN**. ⭐ **AC3 requires that
sentence in the story record** so a reviewer meets it in prose, ⛔ never discovers it in a diff.

⚠ ⛔ `live` drives are **STILL NOT LISTED** on `/sahyog` — `public-read.ts:84-87` excludes them
deliberately and (A) says **reachable**, ⛔ never **listed**.

### ✅ D4 — RULED by BigDev, 2026-09-04b: **A MEMBER-APP SCREEN ON AN EXISTING TAB** — ⛔ not a notification

⭐ **Ruled: branch (ii).** ⛔ No notification, ⛔ no new alert category, ⛔ no new deep-link resource,
⛔ no SMS-template act, ⛔ no new route group.

⭐⭐ **AND THE TAB IS `(tabs)/index.tsx` — "MY POOL" (Tab 1). ⛔ IT IS ⛔ NOT SHRADHANJALI.**
⚠⛔ **THIS IS THE ONE THING HERE THAT LOOKS OBVIOUS AND IS WRONG.** Tab 2 is literally named
`Shradhanjali` and its component is literally `ShradhanjaliSahyogVivran` — ⇒ every instinct says the
Sahyog Vivran link belongs there. ⛔ **It does not.** ⭐ Measured 2026-09-04b:

| | Tab 2 `shradhanjali.tsx` | ⭐ Tab 1 `index.tsx` — **My Pool** |
|---|---|---|
| Data source | ⛔ `SAMPLE_CONTRIBUTORS` / `SAMPLE_MEMORIAL` from `./sample-data` | ⭐ live — `useActiveContributionQuery` |
| API wiring | ⛔ **NONE.** It is a **P0-5 measurement prototype** (Story 0.14 §4 FM-2: Devanagari + FlashList perf) | ⭐ shipped, Story 8.2 |
| Can it know a `live` drive's token? | ⛔ **NO** — it would need a data layer built first | ⭐ **YES** — it is already reading that exact pool |

⇒ ⛔ **choosing Tab 2 on its NAME would silently re-scope this story into building the memorial
surface's data layer.** ⭐ Tab 1 already renders `<ActiveContributionCard />`, which self-suppresses
unless the member is `active` **and assigned to a pool whose cycle alert is `live`** — ⭐ that is
**precisely** the `live` drive AC4 owes a path to, and the member is **already looking at it**.

⭐ **The affordance shape is ALREADY RULED and is ⛔ not a fresh design question:** `<ViewContributorsEntry />`
(Story 8.3, **D8**) sits **beside** the card, ⛔ **not inside it**, and self-suppresses in lock-step.
⇒ ⭐ **follow it exactly** — a sibling entry, ⛔ never a new field inside the card.

⚠⛔ **THE TOKEN IS SERVER-RETURNED, ⛔ NEVER CLIENT-DERIVED.** `apps/mobile/lib/public-site.ts` already
carries this discipline in terms — `niyamavaliClauseUrl`'s comment reads *"the clauseId is
SERVER-returned … never hardcoded in the widget"*. ⇒ the token rides `useActiveContributionQuery`'s
response and the app ⛔ **never** constructs an address from pool facts (which would re-create D2's
guessability inside the client).

⭐ **Why this is the cheap branch, stated so it is ⛔ not re-litigated:** it reuses a shipped card, a
ruled affordance pattern, an existing `Linking.openURL` precedent (`(auth)/terminated.tsx:94`) and an
existing URL-builder module. ⛔ Its only new API surface is **one field** on a query that already runs.

<details>
<summary>⛔ The rejected branch (i), kept as the record of WHY — ⛔ do not re-open it</summary>

AC4 said *"the drive-opened notification carrying its link, **or** a member-app screen"*. ⛔ That
**or** is ⛔ not a ruling, and the two branches are ⛔ not the same size. ⭐ **Measured live 2026-09-04,
⛔ not assumed:**

| | Branch (i) — a notification carrying the link | Branch (ii) — a member-app screen |
|---|---|---|
| Does the carrier exist? | ⛔ **NO** — `apps/jobs/src/pool-spawn-trigger.ts:13` records the pool-spawn `dispatch()` / shepherd-hook seam as ⛔ **not live** | ⛔ **NO** — `apps/mobile/app` has ⛔ no `(sahyog)` route group |
| Taxonomy cost | ⛔⛔ **FROZEN**: the **7 FR-71 push categories** (+2 non-push) are exhaustive, and `deep-links/deep-link.ts:78` says in terms that a new thing is ⛔ *"NOT an 8th FR-71 category"* | ⭐ none |
| Can it even carry a **public web** URL? | ⛔ **NO.** `deepLinkTargetForAlert` returns a **mobile URI scheme** over a **closed `resource` enum** (`announcements\|renewals\|contributions\|claims\|tickets\|modules` — ⛔ no `sahyog`). `channels/src/render.ts` composes ⛔ no URLs, and SMS bodies are **pre-registered DLT templates** (`sms-dlt-registry.ts`) | ⭐ n/a — it navigates in-app |

⇒ ⛔ **branch (i) is ⛔ NOT a link-in-a-message; it is a new alert category, a new deep-link resource
and an SMS-template act** — a multi-story build against a **frozen** taxonomy. ⭐ Its nearest existing
carrier is the `cycle_open` kind (`scheduler/contribution-notify-triggers.ts:142`), which rides
`alert_published` and lands on `announcements/:alert_id` — ⛔ **still not** a public drive URL.

⚠⛔ **WHY THIS WAS BLOCKING AND ⛔ WAS NOT AN AUTHOR'S CALL:** Trap 1 forbids landing the token without
a path, so the choice ⛔ could not be deferred past merge; and branch (i) reaches a **ratified FR-71
taxonomy**, which is ⛔ not a tuning knob ([[feedback_supersede_never_reinterpret]]). ⇒ picking it
silently would have been an authoring act over a Panel-scoped artefact — the precise failure
[[feedback_mechanization_split_commitment]] and Trap 5 already forbid one level down.

</details>

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ not change what the page **shows** — only who can **find** it.
- ⛔ It does ⛔ not add `live` drives to the `/sahyog` index (AC4).
- ⛔ It does ⛔ not touch the masking schedule, the knob, the predicate, or `D8-default`.
- ⛔ It does ⛔ not tighten or loosen `limits.search`.
- ⛔ It does ⛔ not build the **authenticated-member** post-masking presentation (`-164` A2 — still
  *"not carried, not foreclosed"*).
- ⛔ It does ⛔ not touch the **Shradhanjali tab** or give it a data layer (D4) — that surface stays a
  P0-5 measurement prototype on `sample-data`, and ⛔ wiring it is ⛔ not this story's to start.
- ⛔ It does ⛔ not add a notification, an 8th FR-71 category, a deep-link `resource`, or an SMS
  template (D4, branch (i) REJECTED).

---

## Tasks / Subtasks

### ⛔ Task 0 — GOVERNANCE FIRST. ⛔ No code lands before this commit. (AC0)

- [x] ✅ **The `epics.md` ANNOTATION is WRITTEN** (2026-09-04c) — appended as a dated `>` block at the
      end of the **Story 11b.3** section, in 11b.3's own Task 0 annotation shape. Seven items: why the
      story exists · the token/path coupling · the corrected premise · ⛔ neither sibling's and ⛔ not
      `11b-3c` · the deployment block · **D1–D4** · what it does ⛔ not touch. ⭐ The sprint-status key
      is named in it so a future `sprint-planning` run can ⛔ neither drop it nor regenerate a ghost.
      ⛔ **ANNOTATION ONLY** — ⛔ no AC in `epics.md` was rewritten and ⛔ no prior block re-worded.
- [x] Flip `sprint-status.yaml` `development_status[11b-10-…]` → `in-progress`, with a combined
      top-of-file `last_updated` COMMENT entry ([[project_sprint_status_ledger]]) — **ONE row moves**.
      ✅ Done 2026-09-04e — ONE row moved, no other row touched.
- [x] Commit with a `governance:` prefix, **separately and FIRST**
      ([[feedback_governance_commits_precede_implementation]]).
- [x] ✅ **THE STOP CONDITION IS DISCHARGED** — D4 ruled 2026-09-04b (member-app entry, My Pool tab).
      ⭐ Record the discharge in the Task 0 commit body. ⛔ There are ⛔ **no** blocking decisions left.

### Task 1 — The token column, its migration, and its BACKFILL (AC2)

- [x] Add the column to `packages/domain/src/schema/pools.ts` (table at `:105`) — **128 bits** of
      CSPRNG entropy rendered URL-safe (`randomBytes(16)` → base64url ⇒ 22 chars).
- [x] Add a **unique index**, named to the file's own convention (`:203` is
      `pools_pariwar_canonical_identifier_uq`) ⇒ `pools_public_token_uq`.
- [x] Write migration **`0114_…`** — `0113_nominee-bank-masking-schedule.sql` is the last applied.
      ⛔ **Never regenerate an applied migration** (42P07, [[project_live_db_test_gotchas]]).
- [x] ⛔⛔ **BACKFILL EVERY EXISTING ROW IN THE SAME MIGRATION, THEN `SET NOT NULL`.** ⚠ The AC demands
      *"zero NULL tokens"*; a nullable column left nullable makes that a **snapshot**, ⛔ not a
      structural truth, and a visible pool with a NULL token is a drive whose page **404s**.
- [x] Mint the token at spawn in `packages/domain/src/pool/spawn.ts` — the insert at `:454` uses **raw
      snake_case** column names (`pool_canonical_identifier: …`); the token goes in the same values
      object. ⚠ Check the idempotent already-spawned returns at `:426` / `:490` stay correct.
- [x] ⛔ **Do ⛔ NOT derive the token from `pool_id`.** 7.3's UUIDv5 determinism
      ([[project_pool_spawn_saga_atomicity]]) is ⛔ not a reason to make the token reproducible.
- [x] State **where it is generated** that the token bounds **DISCOVERY, ⛔ not AUTHORISATION** (D1).

### Task 2 — Rotation (AC2)

- [x] Ship rotation as a **domain function** with a test that rotates ONE drive and asserts every other
      drive's address is untouched.
- [x] ⛔⛔ **DECIDE-AND-STATE, ⛔ do not guess:** if rotation is given an **admin route**, it needs a
      permission key ⇒ `PERMISSION_CATALOG_VERSION` (`packages/domain/src/rbac/permissions.ts:598`)
      goes **39 → 40**, which is a **governance act** in this repo (10.3 minted `helpdesk.create`
      v22→23 as a story act, [[project_helpdesk_operator_surface_103]]). ⭐ **The cheap, in-scope shape
      is a domain-function-only seam with ⛔ NO route and ⛔ NO key** — if you take it, say so in the
      story record; if you need the route, that is a **routing note**, ⛔ not an edit.
      ✅ **TAKEN: the DOMAIN-FUNCTION-ONLY seam. ⛔ NO route, ⛔ NO permission key,
      `PERMISSION_CATALOG_VERSION` stays 39.** Ground: this story's Panel-ratified scope is the
      ADDRESS and the PATH — an operator surface is neither, and minting a key for it would be a
      governance act arriving as a side effect of a security fix. ⇒ **an operator-facing rotation
      control is a NEW ROUTING NOTE**, ⛔ not an edit. Recorded in `deferred-work.md`'s closure entry
      and in `pool/public-token.ts`'s own doc-block.

### Task 3 — ONE public address form (AC1)

- [x] Rename the address parameter everywhere. ⚠ **This is a breaking contract change**, ⛔ not a
      rename-in-one-file:
  - [x] `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro` → the **file name itself**
        is the route param (`Astro.params` at `:83`, normalised at `:186`).
  - [x] `apps/api/src/modules/public-pages/routes.ts:257` — the path `:poolCanonicalIdentifier`.
  - [x] `packages/contracts/src/public-pages/sahyog-vivran.ts` — **TWO** declarations, `:277` and `:345`.
  - [x] Re-emit OpenAPI (`packages/contracts/scripts/emit-openapi.ts`) — the determinism gate will fail
        if you don't.
  - [x] Update the specs that address the old form: `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`,
        `apps/public/tests/integration/public-pages/scrape-test.spec.ts`, `apps/api/tests/integration/login-wall.spec.ts`.
- [x] ⛔ The bare `P-YYYY-MM-###` must ⛔ **NOT** remain independently addressable (Trap 3) — a route
      accepting **either** form has added a lock beside an open door.
- [x] ⭐ **The indistinguishable-refusal AC is CHEAP — reuse the existing control, ⛔ don't invent one.**
      `apps/api/src/modules/public-pages/handlers.ts:496` already documents *"404 COLLAPSES THREE CASES
      ON PURPOSE"* (`:534` / `:555`). ⇒ *"real drive, wrong token"* becomes the **fourth** collapsed
      case, byte-identical to the others. ⚠ ⛔ **Not** the 503 arm (`buildSahyogVivranOutageView`, astro
      `:219`) — that is the outage path and is a different response.
- [x] ⛔ Keep `pool_canonical_identifier` **RENDERED** on the page — astro `:309` shows it via
      `<MatrixField>`. Trap 3 forbids it being **addressable**, ⛔ not **displayed**. ⛔ Do not delete it.

### Task 4 — ⭐⛔ The matrix declarations the token/link force (AC1, AC3, AC5)

> ⛔⛔ **THIS IS THE TASK THAT WILL BREAK THE BUILD IF IT IS SKIPPED, AND AC5 WILL ⛔ NOT CATCH IT.**

- [x] `apps/public/src/lib/surface-fields.ts` derives each surface's tier-leak field set from the render
      model's **OWN KEYS** (`:362` index, `:590` drive page), and `:382-387` states **`deriveFieldIds`
      throws in BOTH directions** — a model key with no field id, **and** a field id with no model key.
- [x] ⇒ **every new key needs its matrix field declared IN THE SAME COMMIT**:
  - [x] an index row link ⇒ `SAHYOG_DRIVE_ROW_FIELD_IDS` (`:319`) **and** `SAHYOG_DRIVE_ROW_SHAPE` (`:344`).
  - [x] a token on the drive page model ⇒ `SAHYOG_VIVRAN_FIELD_IDS` (`:513`).
  - [x] the declaration itself in `packages/contracts/src/public-pages/sahyog-drive.ts` /
        `sahyog-vivran.ts` — `tier: public`, `pii_tier: 3`.
- [x] ⭐ **A token/href is `pii_tier: 3`** ⇒ it needs ⛔ **no** `tier1_public_exception` and ⛔ **no**
      `RULED_TIER1_PUBLIC_EXCEPTIONS` entry (`packages/contracts/src/public-pages/matrix.ts:393`, whose
      comment says adding to that list *"IS A RULING, NEVER A CODE CHANGE"*). ⛔ Do not touch that map.
- [x] AC5's count assertion lives in `apps/public/tests/surface-fields.test.ts` — assert the
      `sahyog-vivran` **Tier-1-at-`public` count is UNCHANGED**. ⚠ That is necessary but is ⛔ **not**
      the constraint that breaks; the undeclared-key throw is. ⭐ Both must pass.

### Task 5 — The `/sahyog` per-row inbound link (AC3)

- [x] Build the row href in `apps/public/src/lib/sahyog-render.ts`. ⚠ Today it produces **exactly TWO**
      hrefs — `:308` (`page - 1`) and `:315` (`page + 1`); `PaginationLink` (`:101`) is the only link
      type. A drive link is a **third kind** and is ⛔ not a `PaginationLink`.
- [x] Accessible name identifies **WHICH drive** it opens — ⛔ never a bare "click here" (family 13).
      Copy goes through `t()`: ⚠ `t()` defaults to the `common` namespace and **throws** on a missing
      key ([[project_missed_cycle_visibility_substrate]]).
- [x] ⚠ **A11y test coverage may already be routed elsewhere:** 11b.3a's review **deferred family-13
      Astro `role`/`aria-label` test coverage to 11b.8** (sprint-status ledger, 2026-09-03). ⇒ either
      assert it here and say the deferral is **narrowed**, or route to 11b.8 and say so — ⛔ do not
      leave it ambiguous ([[feedback_closure_language_precision]]).
      ✅ **NARROWED, ⛔ not closed and ⛔ not left ambiguous.** `apps/public/tests/sahyog-drive-link-a11y.test.ts`
      asserts the family-13 markup for **exactly one affordance** — the drive link this story adds
      (real `<a href>`, `aria-label` present, the name built from the DRIVE CODE and ⛔ never from
      the consent-gated `deceasedMemberName`, the value still through `<MatrixField>`, and the copy
      keys present in BOTH locales with `{code}` intact). ⚠ **11b.8 still owes the GENERAL family-13
      Astro sweep** across every public surface; ⛔ this file must not be cited as discharging it.
      ⭐ Why narrow rather than defer: a deferred a11y test on an affordance that does not exist yet
      costs nothing — one on an affordance shipping in the same commit leaves the link's accessible
      name unchecked at the moment it goes live.
- [x] ⭐ **Write the exposure sentence into the story record in these words** (AC3, D3): *"every listed
      drive becomes ONE CLICK from four Tier-1 fields under `D8-default` FAIL-OPEN"*. ⛔ A reviewer must
      meet it in prose, ⛔ never discover it in a diff.
      ✅ **WRITTEN, VERBATIM, IN FIVE PLACES** — chosen so a reviewer meets it whichever door they
      come in by: the matrix declaration (`drive_href`'s `description`), the wire contract
      (`sahyog-drive.ts`'s `publicToken`), the render model (`surface-fields.ts`'s `driveHref`), the
      pure builder (`sahyog-render.ts`'s `driveHref()`), and the API handler that serializes it.
      ⭐ Plus the `deferred-work.md` closure entry and this story's Completion Notes.

### Task 6 — The `live`-drive inbound path — the My Pool entry (AC4) ✅ **D4 RULED**

- [x] Carry the token to the client: add it to `useActiveContributionQuery`'s response
      (`apps/mobile/components/active-contribution/useActiveContributionQuery.ts`) and to the contract
      backing it. ⭐ **ONE new field on a query that already runs** — that is the whole API change.
- [x] Add `sahyogVivranUrl(token, locale)` to `apps/mobile/lib/public-site.ts`, beside
      `niyamavaliClauseUrl` (`:32`). ⭐ Reuse `publicSiteOrigin` (`:18`,
      `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN`) — ⛔ do ⛔ not hardcode an origin.
- [x] ⛔⛔ **The token is SERVER-RETURNED.** `public-site.ts:29-30` already states the discipline for
      `clauseId`: *"never hardcoded in the widget"*. ⇒ ⛔ the app ⛔ **never** derives the address from
      `poolId` or the canonical identifier — that would re-create D2's guessability inside the client.
- [x] Build the entry as a **sibling** of `<ActiveContributionCard />` in `apps/mobile/app/(tabs)/index.tsx`,
      following `components/contributor-list/ViewContributorsEntry.tsx` **exactly**: `return null` to
      self-suppress (`:31`), `Pressable` + `onPress` (`:42`). ⛔ **Beside the card, ⛔ NOT inside it**
      (Story 8.3 **D8**) — ⛔ do not add a field to the card's view model.
- [x] Open it with `Linking.openURL`, precedent `apps/mobile/app/(auth)/terminated.tsx:94`.
- [x] ⛔ **Self-suppress in LOCK-STEP with the card** — the card renders only for an `active` member
      assigned to a pool whose cycle alert is `live`. ⛔ An entry that outlives the card is a dead link.
- [x] ⛔ **Do ⛔ NOT touch the Shradhanjali tab** (`(tabs)/shradhanjali.tsx`). It is a P0-5 measurement
      prototype over `components/shradhanjali/sample-data.ts` with ⛔ zero API wiring (D4).
- [x] ⚠ `useT()` returns a **fresh closure each render** — depend on `locale`, ⛔ never on `t`
      ([[project_uset_fresh_closure_memo_trap]]). The entry's label is Hindi-first, ≥56pt touch target.

### Task 7 — Close out (AC5, AC6)

- [x] Assert **nothing else moved**: `D8-default` FAIL-OPEN unchanged (Trap 4) · `limits.search`
      unchanged on all three routes (Trap 5) · masking schedule/knob/predicate untouched · 11b.3a's
      Tier-1 allowlist entries and the matrix unchanged.
- [x] ⛔ **Only after AC1–AC4 have ALL landed together**, record the `deferred-work.md` item
      **"Closed by [edit]"** ([[feedback_closure_language_precision]]) — ⛔ never *"resolved via
      deferral"*. ⚠ If AC4 is undelivered the item **stays BLOCKING** and the story does ⛔ not close.

---

## Dev Notes

### 🎯 Files to CHANGE (the "what EXISTS" table above is read-only context; ⭐ this is the target list)

| File | Change | AC |
|---|---|---|
| `packages/domain/src/schema/pools.ts` (`:105`, index conv. `:203`) | + token column, + `pools_public_token_uq` | AC2 |
| `packages/domain/migrations/0114_*.sql` | create · **backfill** · `SET NOT NULL` | AC2 |
| `packages/domain/src/pool/spawn.ts` (`:454`, raw snake_case) | mint at spawn | AC2 |
| `packages/domain/src/pool/` (new) | rotation domain function | AC2 |
| `packages/contracts/src/public-pages/sahyog-vivran.ts` (`:277`, `:345`) | param rename ×2 | AC1 |
| `packages/contracts/src/public-pages/sahyog-drive.ts` / `sahyog-vivran.ts` | + matrix field decls | AC1/AC3 |
| `apps/api/src/modules/public-pages/routes.ts` (`:257`) | path param | AC1 |
| `apps/api/src/modules/public-pages/handlers.ts` (`:496`, `:534`, `:555`) | 4th collapsed 404 case | AC1 |
| `apps/public/src/pages/sahyog-vivran/[…].astro` (`:83`, `:186`) | **file rename** + param | AC1 |
| `apps/public/src/lib/sahyog-vivran.server.ts` (`:78`, `:105`, `:182`) | SSR resolver param | AC1 |
| `apps/public/src/lib/sahyog-render.ts` (`:101`, `:308`, `:315`) | per-row drive link | AC3 |
| `apps/public/src/lib/surface-fields.ts` (`:319`, `:344`, `:513`) | field-id mappings | AC1/AC3 |
| `apps/public/tests/surface-fields.test.ts` | Tier-1 count unchanged | AC5 |
| `apps/mobile/components/active-contribution/useActiveContributionQuery.ts` | + token field (server-returned) | AC4 |
| `apps/mobile/lib/public-site.ts` (`:18`, `:32`) | + `sahyogVivranUrl(token, locale)` | AC4 |
| `apps/mobile/components/…/SahyogVivranEntry.tsx` (new) | sibling entry, `ViewContributorsEntry`'s shape | AC4 |
| `apps/mobile/app/(tabs)/index.tsx` | mount it beside `<ActiveContributionCard />` | AC4 |
| ~~`_bmad-output/planning-artifacts/epics.md`~~ | ✅ the annotation — **DONE** 2026-09-04c | AC0 |
| `_bmad-output/implementation-artifacts/deferred-work.md` (`:7932`) | "Closed by [edit]" | AC6 |

### ⛔ The three ways this story fails silently

1. **A green AC5 over a red build.** Task 4 — `deriveFieldIds` throws on an undeclared key. AC5 measures
   the Tier-1 **count**; the token is `pii_tier: 3`, so AC5 passes while the surface-fields test throws.
2. **A backfill that is a snapshot.** Task 1 — a nullable column plus a point-in-time "zero NULLs" test
   passes today and ships a broken archive the first time a spawn path misses the mint.
3. **A partial landing that looks like a milestone.** Trap 1 — the token alone makes the **whole**
   Sahyog Vivran surface reachable by nobody. ⇒ **Tasks 5 and 6 are the path, and AC6 refuses closure
   without them** — ⛔ a branch carrying Tasks 1–4 alone is ⛔ not mergeable, however green it is.

### Substrate facts (⭐ measured live 2026-09-04)

- `PERMISSION_CATALOG_VERSION = 39` — `packages/domain/src/rbac/permissions.ts:598`.
- Last applied migration: `0113_nominee-bank-masking-schedule.sql`.
- Alert taxonomy: **9** categories (7 FR-71 push + `niyamavali_amended` + `step_up_otp`);
  `deepLinkTargetForAlert` is an **exhaustive switch**, `resource` is a **closed enum**.
- `apps/mobile/app` route groups: no `(sahyog)`. Zero repo-wide mobile references to `sahyog-vivran`.
- `packages/channels/src/render.ts` composes **no URLs**; SMS bodies are pre-registered DLT templates.
- `apps/public/astro.config.mjs:21` — `site: process.env.PUBLIC_SITE_ORIGIN ?? 'https://twt.org'` is
  the only public-origin source, ⭐ needed if any absolute drive URL is ever built.

### Testing

- Live-DB specs: assert **membership, ⛔ not counts**; ⛔ never `DROP SCHEMA`
  ([[project_live_db_test_gotchas]]). `integration-tests` concurrency `=1` is **load-bearing**
  ([[project_ci_local_concurrency_oversubscription]]).
- `git push` runs full `ci:local` via a pre-push hook — the "hang" is expected
  ([[project_friction_budget_baseline_ratchet]]).
- Required new assertions: wrong/absent token ⇒ **byte-identical** 404 (AC1) · rotation isolates to one
  drive (AC2) · **zero** NULL tokens across all visible states (AC2) · Tier-1-at-`public` count
  unchanged (AC5).

### Project Structure Notes

- ⛔ **No new package.** Rotation is a domain function beside `pool/spawn.ts`
  ([[feedback_no_premature_package]] — no second consumer exists).
- `@twt/domain` may ⛔ not import `@twt/events` (turbo cycle) — read `events_log` directly
  ([[project_member_lifecycle_domain_substrate]]).
- `@twt/contracts` may ⛔ not import pg-touching `@twt/domain` namespaces
  ([[project_contracts_domain_bundle_boundary]]) — the token type stays a plain `string` in contracts.

### References

- `.decision-log.md#decision-2026-09-03-184` (`:111`) — Trustee-ratified **(A)** + **(B)**, cl.2
  (identifier RETAINED), cl.4 (the coupling), cl.5 (option (d) not directed).
- `.decision-log.md#decision-2026-09-04-185` (`:37`) — the FALSE premise corrected; cl.3 widens the
  coupling to **all three** states.
- `.decision-log.md#decision-2026-09-02-179` cl.1 (`D8-default` FAIL-OPEN) · `#decision-2026-09-02-182`
  (`D6(b)`, the three-way split this story is ⛔ **not** part of) · `#decision-2026-08-28-160` cl.10(f).
- `_bmad-output/implementation-artifacts/deferred-work.md:7932` — the BLOCKING-ON-DEPLOYMENT item.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-03-11b3a-enumeration-bound-tier1.md`
  — ⚠ the note whose §6(c) carried the premise `-185` corrects.

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-09-04.

### Debug Log References

**⚠⛔ ONE PRE-EXISTING `ci:local` FAILURE, RECORDED OPENLY AND ⛔ NOT WORKED AROUND**
([[feedback_record_unattested_no_backfill]]).

`integration-tests` fails on **3 assertions in `apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`**
(`:357` `lockInEntered` false, `:391` 200 where 503 expected, `:494` `lockInEntered` false).

⭐ **INNOCENCE PROVEN, ⛔ not asserted** — three independent checks:
1. **It reproduces with THIS STORY'S ENTIRE WORKING TREE STASHED** (`git stash push -u`) — i.e. on
   the baseline. That is the decisive one.
2. The spec contains **ZERO** references to `pools` or `pool_id`; this story touches no membership-fee,
   lock-in or Niyamavali-clause path.
3. The spec **PASSES IN ISOLATION** against the same database
   ([[project_known_livedb_test_failures]] — "confirm innocence by running a spec in isolation"),
   and so does the **exact** `integration-tests` command (`pnpm db:migrate && turbo run test --force
   --concurrency=1 --filter=…` over all eight packages): **domain 3194 · api 1176 · jobs 346 ·
   validity 284 · channels 204 · niyamavali 144 · events 33 · queue 3 — all green.**

⇒ the cause is the documented shared-database ACCUMULATION residual
([[project_ci_local_double_run_pollution]] — "Residual = shared-`PARIWAR_A` counts + accumulation"):
the failures are all "clause already provisioned / lock-in already entered", i.e. a *prior* run's rows
making an "unprovisioned ⇒ 503" test see a 200. ⚠ A full DB drop-and-recreate would confirm it
directly; that is a destructive action and was ⛔ **not** taken unilaterally.

⛔ **NOT fixed here, and ⛔ not silently absorbed:** it is outside this story's scope, it is not
caused by it, and "make the failing test pass" on an unrelated live-DB spec would be exactly the
scope creep the story's own traps forbid.

⭐ **EVERY OTHER `ci:local` JOB IS GREEN — 33 of 34**, including the ones this story could plausibly
break: `lint` · `typecheck` · `build` · `test (unit)` · `db-check` · `contracts-determinism` ·
`i18n-parity` · `pii-scrape` · `friction-budget` · `schema-diff` · `microcopy` ·
`pool-state-invariant` · `sahyog-vivran-financial-truth` · `access-wrapper-invariants` ·
`domain-invariants` · `ai-10-5-coverage-guard`.

**⚠ TWO GATES BIT DURING THE BUILD, and both are recorded because each caught a real defect:**
- **`microcopy`** rejected the member-app entry's a11y hint: *"Opens the public trust website **outside
  the app**"* matched the `out-of-band-blame` tone rule's arm (3) — DEFINED-BY-THE-CHANNEL. ⭐ Fixed
  by **changing the COPY** (*"…in your browser"*), ⛔ **not** by adding an `allow` entry over a live
  member surface — the discipline that rule's own header states in terms ("Narrowing the PATTERN, not
  an `allow` entry over a live surface").
- **`deriveFieldIds`** threw in BOTH directions the moment `driveHref` / `driveLinkA11yLabel` entered
  the render model without matrix entries — Dev Notes' failure mode #1, arriving exactly as predicted.
  ⭐ The gate working, ⛔ not an obstacle.

**⭐ THE MIGRATION WAS VERIFIED LIVE, ⛔ not assumed** (`0114`, applied to `twt-test-pg`):
`SELECT count(*), count(public_token), count(DISTINCT public_token), min(length), max(length) FROM pools`
⇒ **1132 / 1132 / 1132 / 22 / 22** — every pre-existing row backfilled, every token distinct, every one
22 chars. `\d pools` confirms `public_token | text | not null` and `pools_public_token_uq UNIQUE`.

**⭐ REVERT-SANITY PROVEN on the fence that matters most** (the client-derivation guard): renaming
`sahyogVivranUrl`'s parameter to `poolCanonicalIdentifier` turned
`sahyog-vivran-entry.test.ts` RED (1 failed / 11 passed); restoring it returned it GREEN (12 passed).
⛔ A fence that cannot fail is not a fence.

### Completion Notes List

⭐⭐ **BOTH HALVES LANDED TOGETHER — which is the story's own hardest requirement, ⛔ not a bonus.**
Trap 1 forbids landing the token without a path: it would make the ENTIRE Sahyog Vivran surface
reachable by NOBODY and silently invert the Panel's ratified **(A)**, *while passing every gate and
looking like a security improvement*. This branch carries AC1–AC4 as one change set.

**AC0 — governance first.** The `epics.md` annotation landed separately at `d2f11b6`; the
sprint-status flip + its ledger entry at `a6f5ffe`, both `governance:`-prefixed and both BEFORE the
first line of code ([[feedback_governance_commits_precede_implementation]]). The Task 0 STOP
condition was discharged by **rulings** (D1–D3 2026-09-04, D4 2026-09-04b), ⛔ never by an author's
guess.

**AC1 — one address form.** `:driveToken` on `apps/api`, `[driveToken].astro` on `apps/public`,
`PublicSahyogVivranParams.driveToken` in contracts, `readPublicSahyogVivran(db, pariwarId, driveToken)`
in the domain. ⛔ There is **no** `OR` arm for the identifier anywhere, and `.strict()` makes
`poolCanonicalIdentifier` a **400 as a param key** — asserted in both directions
(`public-pages-sahyog-vivran.test.ts`). The identifier is **RETAINED**, still selected, still returned,
still `<MatrixField>`-rendered, and still the **audit** key on the appeal-disclosure line — ⛔ Trap 3
forbids it being *addressable*, ⛔ not *displayed*.
⭐ **The indistinguishable refusal reuses the EXISTING control** rather than inventing one: the token
is part of the read's `WHERE`, so "real drive, wrong token" becomes the **fourth** case collapsed into
the handler's already-documented 404. Asserted as an **EQUALITY between two live responses**, ⛔ not as
two independent "is it 404?" checks — the second form would pass even if bodies or statuses diverged.

**AC2 — random, stored, rotatable, backfilled.** 128 bits of `randomBytes`, base64url (22 chars),
minted in `pool/project.ts`'s genesis INSERT; `pools_public_token_uq` is **GLOBAL**, deliberately
(an ADDRESS must name one thing without a second value to disambiguate it — and a colliding mint then
fails LOUDLY at 23505 instead of silently re-pointing one drive's address at another's).
⛔ **Not derived** — asserted structurally: the minted token shares no prefix with the `pool_id` hex,
does not contain the canonical identifier, and two pools spawned in the SAME cycle at adjacent
`pool_index` get different addresses. ⭐ A re-delivered spawn takes `onConflictDoUpdate`, which does
⛔ **not** touch `publicToken` — a retry never re-addresses a published drive.
⭐ **Rotation exists and is exercised**: rotating one drive changes its address, leaves the neighbour's
byte-identical, makes the OLD address resolve to zero rows, returns `null` (⛔ never throws) for an
unknown pool, and provably does ⛔ **not** engage the 0071 state-writer trigger.
⛔ **Zero NULL tokens is STRUCTURAL, ⛔ not a snapshot**: the migration backfills then `SET NOT NULL`
(verified live, above), and the spec asserts both the count across all four lifecycle states **and**
that the column REFUSES a NULL (23502).

**AC3 — the `/sahyog` per-row link.** ⭐ **The exposure sentence is written verbatim in FIVE places**
so a reviewer meets it in prose whichever door they come in by: *"every listed drive becomes ONE CLICK
from four Tier-1 fields under `D8-default` FAIL-OPEN."* `drive_href` is declared `tier: public`,
`pii_tier: 3` — an ADDRESS, ⛔ not a person and ⛔ not derived from one ⇒ ⛔ **no**
`tier1_public_exception`, ⛔ **no** `RULED_TIER1_PUBLIC_EXCEPTIONS` entry, and `matrix.ts` **untouched**.
⚠ The link is a **third kind of href** on a module that had only two (both pagination), so it rides
`visibleSahyogColumns` — which means the `<th>`/`<td>` pair still suppresses TOGETHER and an announced
omission is still impossible. It carries **only `lang`** forward, ⛔ never the index filters: a filter
shape on a single-drive URL would read as an onward collection affordance on the one surface whose
control 5 is the absence of one.

**AC4 — the `live`-drive path (D4).** A member-app entry on **Tab 1, "My Pool"** — ⛔ **not**
Shradhanjali, whose name makes it the obvious-and-wrong choice (it is a `sample-data` P0-5 prototype
with zero API wiring; picking it would have re-scoped this story into building the memorial data
layer). `<SahyogVivranEntry />` follows `<ViewContributorsEntry />` exactly: a SIBLING of the card
(8.3 **D8**), `return null` to self-suppress, ≥56pt, `accessibilityRole="link"`, Hindi-first copy
through `t()` with an explicit namespace, `locale` from `useLocale()` (⛔ never a `t`-derived value —
[[project_uset_fresh_closure_memo_trap]]).
⭐ **ONE new field on a query that already runs** — that is the whole API change. The token is
**SERVER-RETURNED**; the client derives nothing, fenced by a source scan asserting neither the entry
nor the URL builder mentions `poolId` or `poolCanonicalIdentifier`.
⛔⛔ **LOCK-STEP IS ASSERTED, ⛔ not documented**: when the token read returns `null` the handler
fail-softs the **whole card** to `{ assigned: false }` (the same arm `identity === null` already uses),
so an entry can never outlive its card and leave a dead link. And D1's price is carried openly — a
forwarded link is permanent public access until rotation, which is exactly why AC2's rotation is not
separable from it.

**AC5 — nothing else moved.** `D8-default` FAIL-OPEN unchanged · `limits.search` unchanged on **all
three** routes, now fenced by a test that counts the registrations and forbids `limits.read`, an inline
ceiling and a `keyGenerator` (⚠ the pull is real in BOTH directions once the address is opaque, which
is why it is a test and not a comment) · masking schedule/knob/predicate untouched (⛔ zero masking
files in the diff) · `matrix.ts` untouched · Tier-1-at-`public` asserted **by identity** on BOTH
surfaces: `sahyog-vivran` still exactly the four ruled nominee-bank fields, `sahyog-drive` still
exactly `deceased_member_name`.

**AC6 — the deployment gate.** `deferred-work.md` records **"Closed by [edit]"**
([[feedback_closure_language_precision]] — ⛔ never *"resolved via deferral"*, and ⛔ not *"closed by
ruling"*: a ruling closed the QUESTION at `-184`; what was outstanding was an IMPLEMENTATION). The
predecessor item's note is **amended, ⛔ not rewritten** ([[feedback_supersede_never_reinterpret]]).
⚠ The entry also states, in the same breath, what is ⛔ **not** closed: `D8-default`, the rate-limit
tier, the DPDPA exposure, counsel's review, Row 17's posture — and that **built is still ⛔ not
published**.

**⚠ ONE THING WORTH FLAGGING TO REVIEW, stated rather than buried:** `buildSahyogVivranOutageView()`
lost its argument. It used to echo the URL segment back into `pool_canonical_identifier` on the
ground that *"the visitor supplied it and it is already in their URL bar"*. ⭐ That ground is GONE —
the URL now carries an opaque ADDRESS — so echoing it would print a live public address into a
classified field on a degraded page, a fabricated drive fact of exactly the kind that function's own
doc-block forbids. Its test was amended to assert the empty string **with the reason**, ⛔ not silently
flipped.

### File List

⭐ **NEW (6)**

| File | What |
|---|---|
| `packages/domain/src/pool/public-token.ts` | the mint · `rotatePoolPublicToken` · `readPoolPublicToken`, with D1/D2's grounds |
| `packages/domain/migrations/0114_pool-public-address-token.sql` | add column · **BACKFILL every row** · `SET NOT NULL` · global unique index |
| `packages/domain/tests/integration/pool/public-token.spec.ts` | 11 live-DB tests: mint · not-derived · rotation isolation · zero NULLs · 23502 · 23505 |
| `apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx` | the `live`-drive entry (D4) — sibling of the card, lock-step suppression |
| `apps/mobile/tests/unit/sahyog-vivran-entry.test.ts` | 12 source-scan fences: on Tab 1, ⛔ not Tab 2 · server-returned · ⛔ no route group |
| `apps/public/tests/sahyog-drive-link-a11y.test.ts` | family-13 markup for the drive link — **narrows** 11b.8's deferral, ⛔ does not close it |

⭐ **MODIFIED (44)**

| File | What |
|---|---|
| `packages/domain/src/schema/pools.ts` | `+ publicToken` (NOT NULL) · `+ pools_public_token_uq` (GLOBAL) |
| `packages/domain/src/pool/project.ts` | mint at the genesis INSERT; ⛔ untouched by `onConflictDoUpdate` |
| `packages/domain/src/pool/index.ts` | export the new namespace |
| `packages/domain/src/pool/sahyog-vivran-read.ts` | resolve by token; the 404 now collapses **FOUR** cases |
| `packages/domain/src/pool/public-read.ts` | carry `publicToken` onto the index row |
| `packages/domain/migrations/meta/_journal.json` | `0114` entry |
| `packages/contracts/src/public-pages/sahyog-vivran.ts` | `Params.driveToken`; the entry field amended to RENDERED-not-addressable |
| `packages/contracts/src/public-pages/sahyog-drive.ts` | `+ publicToken` on the wire row, with the exposure sentence |
| `packages/contracts/src/contributions/active-contribution-card.ts` | `+ sahyogVivranToken` — the ONE new field |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | `+ drive_href` (`public`/`pii_tier: 3`) · route → `[driveToken]` · `D4-linkage` CLOSED |
| `apps/api/src/modules/public-pages/routes.ts` | `:driveToken` · **control 7** added (count now SEVEN) · enumeration-bound clause amended |
| `apps/api/src/modules/public-pages/handlers.ts` | read by token · 4th collapsed 404 · `+ publicToken` on index rows · audit keeps the identifier |
| `apps/api/src/modules/member-pool/handlers.ts` | server-side token read + fail-soft to `UNASSIGNED` (lock-step) |
| `apps/public/src/pages/sahyog-vivran/[driveToken].astro` | **file renamed** + param |
| `apps/public/src/pages/sahyog.astro` | the `<a href>` arm + the three new labels |
| `apps/public/src/lib/sahyog-vivran.server.ts` | `driveToken` fetch option |
| `apps/public/src/lib/sahyog-vivran-render.ts` | `buildSahyogVivranOutageView()` — ⛔ echoes no address |
| `apps/public/src/lib/sahyog-render.ts` | `SAHYOG_VIVRAN_ROUTE` · `driveHref()` · the link column · 2 new labels |
| `apps/public/src/lib/surface-fields.ts` | `+ driveHref` / `+ driveLinkA11yLabel` on the row, its mapping and its shape |
| `apps/mobile/lib/public-site.ts` | `+ sahyogVivranUrl(token, locale)` |
| `apps/mobile/app/(tabs)/index.tsx` | mount the entry beside the card |
| `packages/i18n/locales/{en,hi}/sahyog-drive.json` | `table.col.open` · `link.view_drive` · `link.view_drive_a11y` |
| `packages/i18n/locales/{en,hi}/contribution.json` | `sahyog_vivran.entry_{cta,a11y,hint}` |
| `scripts/sahyog-vivran-financial-truth/check.ts` | the renamed astro path (⛔ or the gate goes vacuous) |
| `packages/contracts/tests/public-pages.test.ts` · `…-matrix-schema.test.ts` | route rename |
| `packages/contracts/tests/contributions.test.ts` | card fixture `+ sahyogVivranToken` |
| `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` | params → token; `+` the Trap-3 refusal test |
| `apps/api/tests/integration/login-wall.spec.ts` | allowlist path + **control 5** (count now FIVE, matching `routes.ts`) |
| `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` | `tokenFor` + **3 new AC1 tests** |
| `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts` | seed `public_token`; `+ publicToken` in the exact key set |
| `apps/api/tests/integration/public-pages/rate-limit-key.spec.ts` | `+` the **Trap 5** fence |
| `apps/api/tests/unit/active-contribution-card.test.ts` | stub + **2 new AC4 tests** (server-returned · lock-step) |
| `apps/api/tests/unit/contribution-history.test.ts` | stub the token read |
| `apps/public/tests/sahyog-render.test.ts` | fixtures + **4 new AC3 tests**; the sort fence split in two |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | field set 8→9; `+` the **AC5** Tier-1-unchanged test |
| `apps/public/tests/sahyog-vivran-render.test.ts` · `sahyog-vivran-client.test.ts` | outage arg · `driveToken` |
| `packages/domain/tests/integration/_helpers.ts` + 3 domain specs | seed `publicToken` |
| `apps/api/tests/integration/{self-verify,contributions,payment}/…` (4 specs) | seed `publicToken` |
| `packages/validity-service/tests/integration/contribution-facts.spec.ts` | seed `public_token` |
| `_bmad-output/implementation-artifacts/deferred-work.md` | **"Closed by [edit]"** + the predecessor note amended |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | the row + the ledger |
| `_bmad-output/planning-artifacts/epics.md` | the annotation (`d2f11b6`) |

## Change Log

| Date | Change |
|---|---|
| 2026-09-04 | **Task 0 (AC0)** — the `epics.md` annotation (`d2f11b6`), then the sprint-status flip + ledger (`a6f5ffe`). Both `governance:`-prefixed, both BEFORE any code. |
| 2026-09-04 | **Tasks 1–7 (AC1–AC6)** — the unguessable public address **and** the inbound path for all three drive states, as ONE change set. ⛔ A partial landing is the one outcome Trap 1 forbids. |
| 2026-09-04 | `deferred-work.md`'s **BLOCKING ON DEPLOYMENT** item recorded **"Closed by [edit]"**, with what it does ⛔ *not* close stated alongside it. |

