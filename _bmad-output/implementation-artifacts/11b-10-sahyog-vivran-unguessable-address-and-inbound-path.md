---
baseline_commit: PENDING — set to `origin/main` at the commit this story starts from
---

# Story 11b.10: Sahyog Vivran — the Unguessable Public Address + the Inbound Path `[SURFACE]`

Status: ready-for-dev

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
**Then** it is reachable by a real path — ⭐ the **drive-opened notification** carrying its link, or a
**member-app screen**, ⛔ not by URL construction
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

## ⚖️ Decisions — ✅ **ALL THREE RULED 2026-09-04. ⛔ ZERO BLOCKING.**

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

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ not change what the page **shows** — only who can **find** it.
- ⛔ It does ⛔ not add `live` drives to the `/sahyog` index (AC4).
- ⛔ It does ⛔ not touch the masking schedule, the knob, the predicate, or `D8-default`.
- ⛔ It does ⛔ not tighten or loosen `limits.search`.
- ⛔ It does ⛔ not build the **authenticated-member** post-masking presentation (`-164` A2 — still
  *"not carried, not foreclosed"*).
