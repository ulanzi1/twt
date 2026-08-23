# Sprint Change Proposal — 2026-08-23

**Session:** AI-11a-2 — the targeted Epic-11b substrate / publication-model validation session
**Vehicle:** `bmad-correct-course` (Incremental mode)
**Author:** BigDev (solo builder) · **Project:** TWT
**Governance record:** `.decision-log.md#decision-2026-08-23-154`

> ⛔ **THIS SESSION WAS FENCED, AND THE FENCE HELD.** AI-11a-2 is scoped to **substrate and
> publication model only** — SD-2, C-1, C-5. ⛔ It is deliberately **not** a general epic-review
> ceremony. ⚠ C-2, C-3 and C-4 were **touched only where they intersect a ruling** and are
> recorded as ⛔ **still unowned**.

---

## 1. Issue Summary

Epic 11a's retrospective recorded **Significant Discovery SD-2**: Story 11b.3's AR-48
authenticated-fragment AC is specified against the exact contract Story 11a.2 ruled
**UNBUILDABLE** one epic earlier (`2026-08-20-141` cl.6), over a payload of **nominee bank
details on a live pool**. Epic 11b authoring was gated behind a blocking ruling session.

**Issue type:** misunderstanding of original requirements, compounded by a spec/substrate
divergence that **outlived two reconciliations**.

**What this session found that the retrospective did not:**

⭐ **SD-2 is present on THREE stories, not one.** Stories **11b.1** and **11b.6** both carry an
`authenticated_member` tier on `apps/public`, and ⛔ **nothing had recorded either**.

⚠ ⛔ **They are not the same KIND of defect, and are not collapsed.**

| Story | Instance | Payload | Prior record |
|---|---|---|---|
| **11b.1** | *"authenticated sees fuller per Story 11a.3 directory"* | Deceased member's **name form** in search | ⛔ **None** — new finding |
| **11b.3** | AR-48 fragment, *"server-rendered … bypasses edge cache"* | **Nominee bank details, live pool** | ✅ SD-2, BLOCKED |
| **11b.6** | *"authenticated members see fuller per Story 11a.3 directory pattern"* | Deceased member's **attributes** | ⛔ **None** — new finding |

⇒ 11b.3's is a **fragment MECHANISM** over money-routing PII. 11b.1's and 11b.6's are
**NAME-FORM / ATTRIBUTE TIERS**. ⭐ Same root cause, ⛔ different mechanism, ⛔ different stakes,
⛔ different remedy shape.

### Evidence (verified live in the tree at this HEAD)

| Claim | Verified state |
|---|---|
| Members are cookie-session | ⛔ **False** — token-bearer; `member-session-guard.ts:1-8`, `Authorization` header, `exp ≤ 15 min` |
| A browser navigation to the public Astro surface presents a member bearer token in an `Authorization` header | ⛔ **False** — a plain navigation carries no `Authorization` header, and ⛔ **no current browser surface HOLDS the member token to present**. ⚠ ⛔ This is **not** a claim that browsers categorically cannot send an `Authorization` header — script on an authenticated origin can; ⛔ **there is no such origin here** |
| Some browser surface holds a member token | ⛔ **False** — `apps/` = `admin · api · jobs · mobile · public`; ⛔ no `apps/member-web/` |
| Server-side auth branching is permitted on the public shell | ⛔ **False** — `architecture.md:504-517` |
| `apps/public` depends on `@twt/ui` | ⛔ **False** — deps are `@astrojs/node, @twt/contracts, @twt/domain, @twt/i18n, @twt/tokens, astro` |
| `@twt/ui` has React | ⛔ **False** — deps = `@twt/contracts` only; 5 headless presenter modules, zero `.tsx` |
| `@twt/ui` is an empty stub | ⛔ **False** — ⚠ **true at Story 2.5, NOT true now** (see §3, C-1) |

### ⭐ The decisive structural evidence

`cache_policy` (`packages/contracts/src/public-pages/matrix.ts:111`) is a **PER-SURFACE** enum of
exactly `edge_cacheable | private_no_store | redirect`.

Story 11b.3's AC asks for **one surface that is simultaneously edge-cached AND
request-time-rendered-bypassing-cache**. ⛔ **That is not representable in the shipped matrix —
and it must not be made representable.** The split it asks for is the split between a **page**
and an **API call**, which is precisely where `architecture.md:515-517` already puts the auth
boundary.

⭐ **The architecture's pattern IS representable; the AC's is not.** That asymmetry is the
ruling's evidence, ⛔ not its rhetoric.

---

## 2. Impact Analysis

**Epic impact.** Epic 11b ⛔ **cannot be authored as written** — 3 of 8 stories carry SD-2.
⛔ No other epic is affected (Epics 12/13/14 carry no `apps/public` authenticated-tier ACs).

**Story impact.** 11b.1 · 11b.3 · 11b.6 need rulings (SD-2). 11b.2 · 11b.5 · 11b.7 need the C-1
shape ruling. 11b.4 · 11b.8 ⛔ untouched by this session.

**Artifact conflicts.**

| Artifact | Status |
|---|---|
| `epics.md` | `[!]` **4 ruling blocks** — 11b.1, 11b.3, 11b.6, epic header (C-1 + C-5) |
| `.decision-log.md` | `[!]` **New entry `2026-08-23-154`** — commits FIRST |
| `architecture.md:495-525` | `[!]` ⛔ **NEW OPEN FINDING — routed to Winston, ⛔ NOT amended here** (BigDev ruling) |
| PRD | `[x]` ⛔ **No conflict.** FR-77 describes *what* is visible, ⛔ not *how* it renders |
| UX spec | `[N/A]` UX-DR42 `<DocumentPreview>` styling unaffected by a rendering-mechanism ruling |
| `matrix.ts` | `[x]` ⛔ **No change.** Its three-valued `cache_policy` is **evidence for** the ruling, ⛔ not a target of it |
| `sprint-status.yaml` | `[!]` Ledger comment **`2026-08-23e`** (P6); ⛔ **zero rows flip** — ⛔ no `development_status` key changes |

**Technical impact.** ⭐ **Net-negative build cost.** Every ruling *removes* work from Epic 11b
rather than adding it. ⛔ No new package, ⛔ no new CI gate, ⛔ no new auth surface, ⛔ no schema
change, ⛔ no migration.

---

## 3. Recommended Approach — **Direct Adjustment**

⛔ *Rollback* is **not viable** — Epic 11b is entirely `backlog`; there is nothing to roll back.
⛔ *MVP review* is **not viable** — FR-76 / FR-77 / FR-78 survive intact under every disposition;
what defers is a **render tier**, ⛔ not a requirement.

### SD-2 → **Disposition (c): defer the authenticated half with a written trigger**

All three surfaces ship **public-tier-only**:

- **11b.1** — search returns **first-name + last-initial**.
- **11b.3** — public story, verifiers, contributor count; `edge_cacheable`. ⛔ **No nominee-bank fragment.**
- **11b.6** — **first-name + last-initial + dates + district**.

⚠ **Resolved via explicit deferral**, ⛔ **NOT** *Closed by [edit]*
([[feedback_closure_language_precision]]). The AR-48 registry concept is **carried, not deleted**
— what defers is its **first entry**.

⭐ **The trigger is NOT new.** This ruling **joins** the existing 11a.2 / 11a.3 deferral rather
than minting a second one: an `apps/member-web/` split firing, **or** a dedicated member
browser-session story carrying its own PII-posture routing note.

**Why (c) over (a) or (b):**

- ⛔ **(a) mint a browser member session** — puts a large unplanned story on Epic 11b's critical
  path, mints a **new auth surface** the architecture forbids at this layer, and needs its own
  Panel routing because the payload is **money-routing PII**. ⚠ It is the right eventual answer;
  ⛔ it is the wrong thing to make Epic 11b wait for.
- ⛔ **(b) narrow permanently** — same build outcome as (c), but **deletes** AR-48's anchoring
  and would need a fresh architecture ruling to ever reintroduce. ⛔ Discards information for no
  gain.
- ⭐ **(c)** — inherits **11a.3 cl.7's precedent exactly**, which deferred the *identical*
  `authenticated_member` tier onto this *same* trigger. ⭐ Consistency with a standing ruling,
  ⛔ not a new invention.

⚠ **Effort: Low · Risk: Low · Timeline: unblocks Epic 11b immediately.**

### ⛔ What this ruling does NOT close

`architecture.md:495-525` commits a composition contract whose fragments *"hydrate client-side"*
— ⛔ **and that pattern is equally unbuildable today**, for the identical reason. ⇒ ⭐ **the
architecture commits a property the substrate cannot satisfy**, and ⚠ it names **FR-77 nominee
bank details as its own worked example**.

⛔ Ruled **outside this session's fence** by BigDev. → **Winston**, on the trigger above.
⛔ Recorded **un-attested**; ⛔ **not back-filled** ([[feedback_record_unattested_no_backfill]]).

### C-1 → **headless presenter + per-stack render layer**

`apps/public` **adds `@twt/ui`**; `@twt/ui`'s deps stay **exactly `@twt/contracts`**. ⛔ No
React, ⛔ no `.astro`, ⛔ no framework enters `@twt/ui` — that headlessness is what lets **one**
presenter serve the RN bundle **and** an Astro surface without either dictating to the other.

⚠ ⛔ **A PRIOR CHARACTERISATION IS CORRECTED ON THE EVIDENCE.** Story 11b.7's 2026-08-23 block
states an Astro consumer *"requires reversing a prior story's deliberate declination, which is a
ruling, ⛔ not an authoring choice."*

⛔ **Verified: there was no declination.** `2-5-…-public-astro-ssr-shell-foundation.md:152-153`
records that **`@twt/ui` was an empty stub (`export {}`)** at Story 2.5, so the epic AC's
*"`packages/ui` tokens + typography"* correctly resolved to **`@twt/tokens`**. ⇒ ⭐ the variance
is about **where TOKENS live** — ⛔ not a refusal to depend on `@twt/ui`.

⭐ **And the composition was planned IN THE PACKAGE ITSELF.** `packages/ui/src/index.ts` has
stated since **Story 9.12** that `<PoolProgressCard>` is *"shared by the apps/mobile RN progress
meter today **+ the Epic-11b public Sahyog Vivran render later**."* ⇒ ⛔ `apps/public` lacks the
dep because it had **no presenter to consume**, ⛔ not because anyone declined one.

⇒ ⭐ **C-1 IS AN ORDINARY DEPENDENCY ADDITION, ⛔ NOT A GOVERNANCE REVERSAL** — materially
cheaper than both the retrospective and that block assumed.
⇒ ⭐ Story 11a.5's `<NoticeboardStrip>` public-embed variant (deferral (c)) **now has a host**.
⛔ Recorded, ⛔ not built here.

⚠ **C-1 is ruled; C-3 is ⛔ NOT.** Story 11b.7 still has ⛔ **no producer**. ⛔ A settled **shape**
is ⛔ not a settled **source**.

### C-5 → **two levers, ⛔ neither discharging the other**

⭐ Row 17's **per-Pariwar publication kill switch EXTENDS** to 11b.1 / 11b.3 / 11b.6. ⛔ **No new
launch-gate roster rows** — a per-surface roster turns a **posture** into a **checklist**, and
the posture is what binds. ⇒ Row 17's second leg (**≥2-trustee ratification**) gates Epic 11b's
public surfaces exactly as it gates `/members` → **AI-11a-5**.

⭐ **Plus each surface's own consent gate** — `sahyog_vivran_publication` (11b.3),
`in_memoriam_listing` (11b.6). ⚠ **A DIFFERENT LEVER, ⛔ not a second copy of Row 17:** the kill
switch is **per-Pariwar** and **operational**; consent is **per-subject** and **family-authored**.
⛔ **Neither discharges the other**; ⛔ a surface is not launch-ready on one alone.

⚠ **Three inherited properties bind all three surfaces, ⛔ none softened:**
(i) the lever is ⛔ **NOT IMMEDIATE** — `s-maxage=300` per page number, so a revoked consent or a
pulled Pariwar keeps being served **from every warm PoP**; ⛔ direct SQL is **NOT** the fallback.
(ii) **DPDPA counsel is ⛔ NOT ENGAGED** (`2026-08-19-136` cl.5) — ⚠ and Epic 11b **widens** the
exposure from members to **the deceased and their families**.
(iii) `cache_policy` is declared **explicitly** in the matrix, ⛔ never inferred from field tiers;
a rendering surface with ⛔ no `Cache-Control` **fails CI**.

---

## 4. Detailed Change Proposals

⭐ **All edits follow the `99b4a46` / AI-11a-1(a) discipline: blocks are APPENDED, ⛔ nothing is
removed.** Every original AC line stands and carries an annotation beside it. ⛔ Recorded as
rulings and reconciliations, ⛔ **never silent rewrites**.

| # | Artifact | Insertion point | Nature |
|---|---|---|---|
| **P5** | `.decision-log.md` | Top (reverse-chron) | **Decision `2026-08-23-154`** — ⭐ commits **FIRST**, own `governance:` commit |
| **P1** | `epics.md` Story 11b.3 | After the BLOCKED block (`:4908`) | **RULED** — discharges SD-2's gate by **ruling**; ⛔ the BLOCKED block **stays** as the record of why |
| **P2** | `epics.md` Story 11b.1 | Before `### Story 11b.2` (`:4844`) | **RULED** — ⭐ second SD-2 instance, **new finding** |
| **P3** | `epics.md` Story 11b.6 | Before `### Story 11b.7` (`:4989`) | **RULED** — ⭐ third SD-2 instance, **new finding** |
| **P4** | `epics.md` Epic 11b header | Before `### Story 11b.1` (`:4802`) | **RULED** — C-1 + C-5, incl. the ⛔ **corrected characterisation** |
| **P6** | `sprint-status.yaml` | Top of file (reverse-chron) | **Ledger comment `2026-08-23e`** — ⛔ **ZERO row flips** |

⛔ **Commit order is load-bearing** ([[feedback_governance_commits_precede_implementation]]):
**P5 first**, in its own `governance:` commit. History must read **governance → implementation**.
**P6 lands last**, with the `epics.md` commit family it records.

### P6 — the `sprint-status.yaml` ledger entry

⛔ **ZERO `development_status` KEYS CHANGE. ⛔ This is a governance doc act with no story row**
— the same shape as `24b19d5` (AI-11a-1(a)), which also flipped nothing.

| Key | Before | After |
|---|---|---|
| `epic-11b` | `backlog` | ⛔ **`backlog`** — unchanged |
| `11b-1` … `11b-8` (all eight) | `backlog` | ⛔ **`backlog`** — unchanged |
| `epic-11a` | `in-progress` | ⛔ **`in-progress`** — unchanged (the never-flipped epic-row convention) |
| `epic-11a-retrospective` | `done` | ⛔ **`done`** — unchanged |
| Launch-gate **Row 17** | `open` | ⛔ **`open`** — unchanged |

⚠ ⛔ **A RULING THAT UNBLOCKS AUTHORING IS ⛔ NOT A STATUS CHANGE.** Story 11b.1 does ⛔ **not**
become `ready-for-dev` here — ⭐ it becomes **authorable**, and `bmad-create-story` is what moves
it. ⛔ Flipping a row now would claim work that has not happened.

**Ledger comment, prepended above the existing `2026-08-23d` entry:**

```yaml
# last_updated: 2026-08-23e (⭐ AI-11a-2 RULED — the targeted Epic-11b substrate/publication-model
#   validation session. ⛔ ZERO ROWS FLIP. Governance doc act, ⛔ no story row, ⛔ no
#   development_status key. ⛔ epic-11b stays backlog and ⛔ all EIGHT 11b story rows stay
#   backlog; ⛔ epic-11a stays in-progress; ⛔ Row 17 untouched and still `open`.
#
#   WHAT LANDED: Decision 2026-08-23-154 + FOUR ruling blocks APPENDED to
#   `_bmad-output/planning-artifacts/epics.md` (Epic 11b header, 11b.1, 11b.3, 11b.6) —
#   ⛔ recorded as RULINGS, ⛔ NEVER silent rewrites; every original AC line stands and carries
#   an annotation beside it, matching `24b19d5`/`99b4a46` discipline. SCP:
#   _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-23.md
#
#   ⭐ THE HEADLINE: SD-2 WAS PRESENT ON THREE STORIES, ⛔ NOT ONE. 11b.1 and 11b.6 carry the
#   same absent `authenticated_member` viewer and ⛔ NOTHING HAD RECORDED EITHER. ⚠ They are
#   ⛔ NOT the same KIND of defect as 11b.3's and are ⛔ NOT collapsed: 11b.3's is a fragment
#   MECHANISM over money-routing PII; 11b.1's and 11b.6's are NAME-FORM / ATTRIBUTE TIERS.
#
#   RULINGS: SD-2 -> disposition (c), the authenticated half DEFERRED across all three, ⭐ on the
#   EXISTING 11a.2/11a.3 trigger (⛔ not a second, parallel deferral). ⚠ Resolved via explicit
#   deferral, ⛔ NOT "Closed by [edit]". · C-1 -> headless presenter + per-stack render layer;
#   `apps/public` adds `@twt/ui`; `@twt/ui` deps stay EXACTLY `@twt/contracts`. · C-5 -> Row 17
#   EXTENDS to 11b.1/11b.3/11b.6, ⛔ no new roster rows, PLUS each surface's own per-subject
#   consent gate — ⛔ two levers, ⛔ NEITHER discharging the other.
#
#   ⚠⛔ WHAT THIS DOES ⛔ NOT MEAN: the SD-2 PRE-AUTHORING BLOCK is discharged — ⛔ Epic 11b is
#   ⛔ NOT launch-ready, and ⛔ "authorable" is ⛔ NOT "ready-for-dev". Still OPEN and ⛔ untouched:
#   Row 17's >=2-trustee ratification (⚠ now WIDER — it gates all three 11b public surfaces) ·
#   DPDPA counsel NOT engaged (⚠ widened to the deceased + their families) · C-3 no aggregate-stat
#   producer · C-4 no FR-19 producer + the separate consent gate · C-2 no a11y CI gate ·
#   2026-08-20-140 cl.7. ⭐ A story may reach `done` with every one of these still open.
#
#   ⚠ A NEW OPEN FINDING AGAINST `architecture.md` ITSELF, recorded UN-ATTESTED and ⛔ NOT
#   back-filled: :495-525 commits a composition contract whose fragments "hydrate client-side",
#   and ⛔ THAT pattern is equally unbuildable today — ⭐ the architecture commits a property the
#   substrate cannot satisfy, naming FR-77 nominee bank details as its own worked example.
#   ⛔ Amending it was ruled OUTSIDE this session's fence by BigDev -> routed to Winston.
#
#   ⭐ ONE PRIOR CHARACTERISATION CORRECTED ON THE EVIDENCE, ⛔ not propagated and ⛔ not silently
#   dropped: Story 11b.7's 2026-08-23 block calls the `apps/public` <-> `@twt/ui` link a
#   "deliberate declination". ⛔ VERIFIED FALSE — `@twt/ui` was an EMPTY STUB (`export {}`) at
#   Story 2.5, so that variance is about where TOKENS live. ⭐ And `packages/ui/src/index.ts` has
#   said since Story 9.12 that <PoolProgressCard> is for "the Epic-11b public Sahyog Vivran render
#   later" ⇒ ⭐ C-1 is an ORDINARY DEPENDENCY ADDITION, ⛔ NOT a governance reversal. ⇒ 11a.5's
#   <NoticeboardStrip> public-embed deferral (c) now HAS a host. ⛔ Recorded, ⛔ not built.
#
#   ⚠ AI-11a-1(b) is ⛔ NOT discharged — it fires at Epic 11b's FIRST AUTHORING PASS, which is
#   the next act. ⭐ AND A PROCESS FINDING RECORDED OBSERVATIONALLY, ⛔ NOT elevated to an action
#   item by this fenced session: AI-11a-1(a) would ⛔ NOT have caught SD-2's 2nd/3rd instances —
#   11b.6's defective phrase was ITSELF REWRITTEN by the 2026-08-19 pass, and 11b.1's survived
#   TWO passes. ⇒ a reconciliation answers the question it was POINTED AT; it does ⛔ NOT sweep
#   the sentence it edits. ⚠ That is a SCOPE failure, ⛔ not a TIMING one ⇒ ⛔ a close-of-epic
#   pass would ⛔ NOT have caught it either. -> the next retrospective's call, ⛔ not this session's.)
```

---

## 5. Implementation Handoff

**Scope classification: MODERATE** — backlog reorganisation, ⛔ no code, ⛔ no replan.

⛔ **Not Minor:** it rules three stories' ACs and corrects a prior characterisation.
⛔ **Not Major:** ⛔ no epic is added, removed, resequenced or redefined; ⛔ the PRD is untouched;
⛔ the MVP is unchanged. ⭐ FR-76 / FR-77 / FR-78 survive intact — what defers is a **render
tier**, ⛔ not a requirement.

| Recipient | Responsibility |
|---|---|
| **BigDev** | Commit P5, then P1–P4. Then author **Story 11b.1** — ⭐ **AI-11a-1(b) fires on that pass** |
| **Winston** (architect) | ⚠ **NEW** — `architecture.md:495-525` commits an unbuildable composition contract. ⛔ Open, un-attested |
| **Trustee Panel** | **AI-11a-5** — ⚠ Row 17's ≥2-trustee ratification, now **wider in scope**: it gates Epic 11b's three public surfaces too. Jointly with the **DPDPA** counsel dependency |

### Success criteria

1. ⭐ **Story 11b.1 is authorable** — SD-2 no longer blocks Epic 11b **authoring**.
   ⚠ ⛔ **AND THAT IS THE ONLY GATE THIS SESSION LIFTS. ⛔ "AUTHORABLE" IS NOT "LAUNCH-READY",
   AND THE TWO MUST NOT BE COLLAPSED** — Epic 11a's own headline was that **"done" and "live"
   separated**, and the same distinction binds here one layer earlier.
   ⇒ ⛔ **What is discharged:** the **SD-2 pre-authoring block** — the `epics.md` instruction
   *"⛔ Do NOT author this story until AI-11a-2's blocking session rules it"*, and the
   retrospective's *"⛔ Do NOT start 11b.1 until this lands."*
   ⇒ ⛔ **What is ⛔ NOT discharged, and ⛔ NONE of it is touched by this session:**
   **(a)** ⛔ **Row 17's ≥2-trustee ratification** — ⚠ now **wider in scope**, gating all three
   11b public surfaces → **AI-11a-5**; **(b)** ⛔ **DPDPA counsel ⛔ NOT ENGAGED**
   (`2026-08-19-136` cl.5), ⚠ **widened** by Epic 11b from members to the deceased and their
   families; **(c)** ⛔ **C-3** — Story 11b.7 has ⛔ no aggregate-stat producer; **(d)** ⛔ **C-4**
   — ⛔ no FR-19 close-of-cycle read model, **plus** the separate consent gate, ⛔ neither
   discharging the other; **(e)** ⛔ **C-2** — ⛔ no a11y CI gate while Story 11b.8 makes an
   accessibility audit a **launch-blocker** → **AI-11a-3**; **(f)** ⛔ **`2026-08-20-140` cl.7**
   — ⛔ still no Niyamavali clause governing directory publication.
   ⇒ ⭐ **A story may be authored, developed and marked `done` with every one of (a)–(f) still
   open.** ⛔ Epic 11b's public surfaces ⛔ **must not go live** on the strength of this ruling.
2. ⛔ **No 11b story retains an OPERATIVE `authenticated_member` viewer requirement on
   `apps/public`; every such premise is explicitly ruled DEFERRED onto the shared trigger.**
   ⚠ ⛔ Stated this way deliberately. Under the **append-only** discipline this proposal commits
   to, the original AC sentences ⛔ **still physically contain those phrases** — ⭐ that is the
   point of appending rather than rewriting. ⇒ ⛔ A criterion reading *"no AC presumes …"* would
   **contradict the very history the SCP preserves**, and would be **false on a literal read of
   the file** ([[feedback_closure_language_precision]]).
3. ⭐ The deferral is **traceable to one trigger** shared with 11a.2 / 11a.3 — ⛔ not a second,
   parallel deferral.
4. ⛔ The architecture finding is **carried open**, ⛔ never silently closed.
5. ⛔ `sprint-status.yaml` records the session with **zero row flips**.

---

## 6. ⭐ A process finding this session owes AI-11a-1

⚠ **AI-11a-1(a) would ⛔ NOT have caught SD-2's second and third instances — and this matters,
because that vehicle was minted to catch exactly this class.**

- **Story 11b.6's** defective phrase **was itself rewritten** by the 2026-08-19 pass. That pass
  ruled, correctly and bindingly, what *"fuller"* means — ⛔ **without ever asking whether the
  tier had a viewer.**
- **Story 11b.1's** survived **two** passes (2026-08-19 **and** 2026-08-23) the same way.

⇒ ⭐ **A RECONCILIATION ANSWERS THE QUESTION IT WAS POINTED AT. It does ⛔ NOT sweep the sentence
it edits.**

⚠ ⛔ **This is a sharper failure mode than AI-11a-1(a) addresses.** That vehicle fixes **WHEN**
reconciliation runs (epic close, against that epic's own rulings). ⛔ **This failure is about
SCOPE** — and a close-of-epic pass would ⛔ **not** have caught it either, because the pass
**did** run over these exact sentences and ⛔ still missed them.

⭐ **Recorded here as an observation for the next retrospective** ([[feedback_gap_analysis_observational]])
— ⛔ **not** elevated to a new action item by this session, which is fenced to substrate and
publication model. ⛔ A vehicle is **not** proposed here; ⛔ that is the retrospective's call.
