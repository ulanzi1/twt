---
baseline_commit: bb6712bd9d17ba5e06aae149048a1b74578735d7
---
<!-- Powered by BMAD-CORE™ -->

Status: done

# Story 8.10: Out-of-Band Contribution Policy (UX-DR76 — Direct-to-Family Gifts) `[GOVERNANCE]`

## ⚠️ Read this first — the shipped Screen-3 copy VIOLATES this story's own AC

Story 7.10 shipped the pool-onboarding tutorial's Screen 3 as the first live surface carrying
out-of-band framing. Its **current, committed copy blames the member for an honourable act**:

| Key | Shipped value (`packages/i18n/locales/{en,hi}/pool-onboarding.json`) |
| --- | --- |
| `screen3.title` (en) | "If you **accidentally** pay **outside the system**" |
| `screen3.title` (hi) | "अगर आप **गलती से** **सिस्टम के बाहर** भुगतान कर दें" |
| `screen3.progress_a11y` | same phrasing, both locales |
| `screen3.body` + `screen3.body2` | conflate **two different events** into one screen — the honoured direct-to-family gift AND a genuinely-mistaken wrong-pool payment |

`epics.md:3038` requires that Screen-3 copy honour the policy with **"no 'you should have gone
through the app' framing"**. *"Accidentally / गलती से"* names the gift a **mistake**; *"outside the
system / सिस्टम के बाहर"* defines a member's personal act of mutual aid by its relation to the
app. UX spec `L1046-1058` is explicit: **"The trust does not characterize it as wrong, failure, or
rule-violation."** A wrong-pool payment *is* a mistake; a direct-to-family gift is **not** — and one
screen currently applies the mistake frame to both.

**This is the story's headline deliverable, not a cleanup.** 8.10 re-authors that copy, and — the
part that makes it stick — lands the **`out-of-band-blame` microcopy tone rule** whose introduction
is *proven* by the fact that it fails on today's committed strings before the rewrite
([[feedback_gate_scope_semantic_coverage]] — a green scan over newly-scanned files proves nothing).

---

## Story

As **Solo Builder authoring the trust's stance on out-of-band contributions**,
I want **a formal policy document, dignified member-facing + helpline copy, and structural fences
that make the three named unsafe operations impossible or PR-time-detectable**,
So that **a member who sends money directly to a bereaved family is honoured rather than corrected,
and the trust never pretends it controls — or takes credit for — their personal generosity.**

## Context & Scope (read this before Task 0)

This story is `[GOVERNANCE]`, in the shape Story 7.9 established: the deliverable is **a committed
document + copy + mechanized fences + registrations**, not a feature. It ships **no migration, no
schema, no endpoint, no screen, no new data model** — and that last one is load-bearing rather than
incidental: **"the trust system does not track, audit, or reconcile them"** (`epics.md:3037`) means
the correct engineering artefact for out-of-band gifts is *the demonstrable absence of a data path*,
not a new one.

| Belongs to 8.10 (this story) | Deferred / owned elsewhere |
| --- | --- |
| **The policy document** `docs/policies/out-of-band-contributions.md` — a new top-level `docs/` surface (the `docs/degradation-policy/` + `docs/escrow/` precedent), path fixed by `epics.md:3037` | The **Niyamavali** itself. R7(A)–(E) already govern contribution discipline (`docs/legal/niyamavali.md:72-79`); 8.10 **cites** them, never amends them — a clause change is Story 2.4's audit-logged amendment workflow, not a docs edit |
| **Re-authored Screen-3 copy** (`pool-onboarding` namespace, en + hi) — the blame frame removed; the gift and the wrong-pool mistake **separated** | The **tutorial component**. `PoolOnboardingTutorial.tsx` renders `screen3.title` / `.body` / `.body2` / `.progress_a11y` by key (`:49,:147,:150,:156`) — **keys stay; only values change.** No `apps/mobile` `.tsx` edit unless a body key must be added |
| **The helpline out-of-band script** as en/hi i18n keys (the Story 6.3 `claim.json` `readback.*` precedent — the operator voices it, so it is member-register copy and is translated) | The **helpdesk console** that displays it. Epic 10 owns the operator surface; 8.10 authors the script text, exactly as 6.3 authored read-back text before Epic 10 |
| **The `out-of-band-blame` microcopy tone rule** + `pool-onboarding.json` (en + hi) added to `microcopy.yaml` `copy_globs`, with planted-violation + revert-sanity teeth | **New scanner code.** `scripts/microcopy/lib.ts` already evaluates `tone[]` rules over `copy_globs`; this is a **config + teeth** extension, zero gate-engine change (the 7.8 / 8.2 pattern) |
| **The no-ingest-path fence** — a test proving the contribution readers admit only the three known event types, and that no `out_of_band`-shaped table / column / event type exists | **A new CI scanner.** The `schema-diff` gate (1.16c) already owns "zero payout-destination surface"; 8.10 does **not** manufacture a second scanner ([[feedback_mechanization_split_commitment]] — mechanize the cheapest family, don't over-gate) |
| **Governance registrations** — tone-guide prohibited-frame bullet, `tone-review-checklist.md` Publish-routing rows, `docs/onboarding-tour.md` companion-reading entry, `friction-budget.md` disposition | **Sahyog Vivran rendering.** Epic 11b Story 11b.3 is unbuilt; 8.10 records the binding constraint + registers the governed surface, then stops (the 8.9 declared-seam convention) |
| **Honest recording of the un-built capability** — the UX spec's helpline step (c) "privately-visible note on the member's own profile" has **no surface today** | **Building it.** Deferred to Epic 10 with a re-trigger, per [[feedback_record_unattested_no_backfill]] + [[feedback_closure_language_precision]] — recorded as *un-built*, never scripted as if it works |

**Two things this story must not do.** It must not create a "record an out-of-band gift" field,
event, table, or endpoint anywhere — that would *be* unsafe operation (a). And it must not soften the
R7 consequence: the member's assigned-Pool contribution is still separately expected, and a missed
one still lands on R7. The policy honours the **gift**; it does not waive the **cycle**.

## Acceptance Criteria

Each AC cites the authority it honours.

**AC1 — The policy document (the `epics.md:3037` deliverable).**
**Given** UX-DR76 (`epics.md:476`) + the UX spec's Out-of-Band Contribution Policy section
(`ux-design-specification.md:1046-1058`)
**When** the policy is authored at **`docs/policies/out-of-band-contributions.md`** (path fixed by the AC)
**Then** it states the trust's five structural stances verbatim in substance: (i) the gift **is honoured
as a personal act of mutual aid** and is never characterized as wrong, failure, or rule-violation;
(ii) it **cannot count toward the Pool collection** (reconciliation requires a matched UTR from TWT's
own UPI Intent + nominee statement intake); (iii) it **cannot be retroactively integrated** (contributor
lists are built from matched contributions — audit integrity, FR-47); (iv) it **does not appear in the
member's Yogdaan Bahi**; (v) **staff facilitate dignified resolution via Madad** with the four operator
steps (acknowledge → clarify the separately-expected assigned-Pool contribution per Niyamavali R7 → offer
a private own-record note → **never contact the receiving family to "reconcile" the gift**)
**And** it states plainly that **the trust does not track, audit, or reconcile out-of-band gifts, and
never claims credit for them in Sahyog Vivran or analytics** (`epics.md:3037`)
**And** it names the **three explicitly-prevented unsafe operations** (`epics.md:3039`) — (a) attributing
out-of-band gifts to pool contribution stats; (b) compelling members or families to retroactively route
gifts through the app; (c) interpreting out-of-band gifts as "incomplete", "irregular", or a failure —
each paired with **the concrete fence that prevents it** (AC5 for (a); the copy prohibition + tone rule
for (b) and (c)), so the document is a map to enforcement, not an aspiration
**And** it holds the R7 boundary honestly: only the **combination** (out-of-band gift + *skipped* assigned-Pool
contribution) has discipline consequences, and those land on the **missed assigned-Pool contribution**, never
on the act of personal mutual aid (`ux-design-specification.md:1058`, `docs/legal/niyamavali.md:72-79`).

**AC2 — Screen-3 copy re-authored: the blame frame removed (the banner).**
**Given** `epics.md:3038` ("no 'you should have gone through the app' framing") + the shipped violating strings
**When** the `pool-onboarding` copy is re-authored (en **and** hi, key-for-key parity preserved)
**Then** `screen3.title`, `screen3.body`, `screen3.body2`, and `screen3.progress_a11y` carry **no
mistake-framing** of the direct-to-family gift — no *accidentally / गलती से*, no *outside the system /
सिस्टम के बाहर*, no *should have*, no *wrong / गलत* applied to the gift
**And** the two distinct events are **separated**: the direct-to-family gift is honoured (it is not an
error), while the wrong-pool payment stays framed as the recoverable mistake it genuinely is, with the
Story 7.6 facilitated-recovery framing intact ("the helpdesk works with you; your pool assignment stays
as it is") — the honouring frame must not be diluted into the recovery frame, nor vice-versa
**And** the a11y string matches the re-authored title (screen-reader parity), the i18n **key set is
unchanged** so `PoolOnboardingTutorial.tsx` needs no edit, and `pnpm --filter @twt/i18n i18n:check-parity`
passes
**And** the Hindi is **first-class register**, not a transliteration of the English rewrite
(`docs/tone-guide.md §3`).

**AC3 — The helpline out-of-band script (bilingual keys; the 6.3 precedent).**
**Given** UX-DR76's Madad resolution path (`epics.md:476`) + `ux-design-specification.md:1056` + the
Story 6.3 convention that operator-voiced text ships as **en/hi i18n keys**, not prose in a doc
**When** the script is authored under the existing `contribution` namespace (already inside `copy_globs`)
**Then** keys exist for the operator's four-step resolution — **acknowledge** (the member's standing with
the trust is not diminished), **clarify** (the assigned-Pool contribution for this cycle is still separately
expected if they wish to remain in good standing per the Niyamavali R7 sub-clauses), **offer** the private
own-record note, and the **do-not-contact-the-family** boundary — with en/hi parity
**And** the script **never** asks the member to re-route, re-send, or "redo it properly through the app"
(unsafe operation (b)); it never labels the gift incomplete or irregular (unsafe operation (c))
**And** the **private-note step is authored as a `[PENDING CAPABILITY]` line in the policy document, NOT
shipped as a live operator-voiced key**, unless Task 0 recon finds a real member-profile private-note
surface — an operator must not be scripted to promise a capability that does not exist
([[feedback_record_unattested_no_backfill]]).

**AC4 — Mechanized blame-frame prohibition (the teeth, not the scan).**
**Given** [[feedback_gate_scope_semantic_coverage]] (a gate-scope extension is complete only when ≥1
invariant has *meaningful semantic coverage* of the new surface) + the Story 7.8 / 8.2 config-only
extension pattern
**When** `microcopy.yaml` is extended
**Then** a **new `tone` rule labelled `out-of-band-blame`** is added — one valid case-insensitive regex
(`assertValidRegex`-validated) covering the high-signal English **and** Devanagari blame forms
(*should have*, *accidentally*, *by mistake*, *outside the system*, *गलती से*, *सिस्टम के बाहर*, and the
irregular/incomplete/doesn't-count family) — and `packages/i18n/locales/{en,hi}/pool-onboarding.json` are
added to `scope.copy_globs`
**And** the rule's teeth are **proven, not asserted**: `scripts/microcopy/out-of-band.test.ts` (the
`close-of-cycle.test.ts` precedent — load the REAL `microcopy.yaml` + the REAL locale files, run the REAL
`checkTone`) demonstrates (i) the rule **fires on the pre-8.10 committed Screen-3 strings** as fixtures,
(ii) it fires on planted violations in both locales, and (iii) it is **clean on the re-authored copy**
**And** `pnpm microcopy:check` is green across **all** existing `copy_globs` after the rule lands — if the
new pattern false-positives on `niyamavali` / `terms` / `close-of-cycle` / `contribution` copy, the *pattern*
is narrowed with a recorded reason; a blanket `allow` entry over a real member surface is **not** acceptable
**And** the paraphrased/spelled-out tail remains explicitly the **human** tone-review's job
(`docs/tone-guide.md §5`) — the regex is deliberately not exhaustive over natural language.

**AC5 — The no-ingest-path fence (unsafe operation (a), mechanized).**
**Given** `epics.md:3039(a)` + Story 8.3's reconciliation-confirmed-only invariant + Story 8.4's
attestation-is-not-confirmation invariant
**When** the fence is authored
**Then** a test proves the contribution read surfaces admit **only** the three known event types —
`contribution.utr-attested` (member claim / yellow), `contribution.confirmed` (Epic 9 / green), and
`contribution.reconciliation-mismatch` (Epic 9 / red) — pinned against the shipped constants
(`packages/domain/src/contribution/events.ts:85,97`, `read.ts` `CONFIRMED_EVENT_TYPE`, `history.ts:67`),
so **no fourth ingest path exists** through which an out-of-band gift could reach a pool stat, a
contributor list, a progress meter, or the Yogdaan Bahi
**And** the fence asserts the **absence** of any out-of-band-shaped surface: no `out_of_band` /
`direct_gift` / `outside_payment` table, column, or event type anywhere in `packages/domain/src/schema`
or the event vocabularies (the "the system does not track them" commitment expressed as an executable
negative, mirroring the `schema-diff` gate's zero-surface posture)
**And** the fence is **revert-sanity proven** (plant a fourth event type / a matching column name → the
test fails → revert → green), recorded in the Dev Agent Record — a green negative assertion that cannot
fail is worthless.

**AC6 — Governance registrations + forward commitments.**
**Given** the Story 7.8 / ADR-0031 convention that a governed copy surface is *registered*, and
[[feedback_closure_language_precision]]
**When** the registrations land
**Then** (i) `docs/tone-guide.md §3` gains an **out-of-band blame** prohibited-frame bullet cross-linking
the policy doc, and `docs/tone-review-checklist.md` gains the matching checklist item **plus** Publish-routing
rows for the out-of-band surfaces (review permission "added by its owning consumer story" — no generic
`copy.review` key is manufactured, per the Story 2.2 posture); (ii) `docs/onboarding-tour.md` Companion
reading gains the `docs/policies/` entry; (iii) `friction-budget.md` gains a **Story 8.10 disposition
(declaration affirmed, no new row)** — docs + locale-string changes only, zero new member friction, zero
page-weight change, baseline untouched per [[project_friction_budget_baseline_ratchet]]
**And** the **Sahyog Vivran** constraint is recorded as a forward commitment binding **Epic 11b Story 11b.3**
(the trust never claims credit for out-of-band gifts in Sahyog Vivran or analytics) — declared, not wired
**And** the **private-note capability gap** is recorded in `_bmad-output/implementation-artifacts/deferred-work.md`
with an explicit re-trigger (Epic 10 helpdesk), stated as *un-built*, never as *resolved*.

## Tasks / Subtasks

### Task 0 — Recon (do this first; do NOT skip)
- [x] Read `ux-design-specification.md:1046-1058` end-to-end — it is the **substantive source**; the epics AC is its summary. Every stance in AC1 must trace to a line there.
- [x] Read the shipped Screen-3 copy in **both** locales (`packages/i18n/locales/{en,hi}/pool-onboarding.json`) and `apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx:44-60,140-160` — confirm the four `screen3.*` keys are rendered **by key** so a values-only rewrite needs no component edit.
- [x] Read `microcopy.yaml` (`tone:` list shape, `scope.copy_globs`) + `scripts/microcopy/lib.ts` `checkTone` + `scripts/microcopy/close-of-cycle.test.ts` — your rule is **config**, your test is that file's structure. Confirm `contribution.json` is already in `copy_globs` (it is, Story 8.2) so AC3's keys need **no** scope change.
- [x] Read `packages/domain/src/contribution/{events.ts,read.ts,history.ts}` and write down the exact exported event-type constants you will pin in AC5. Do **not** re-declare them — import them.
- [x] **Search for a member-profile private-note surface** (`grep -ri "private note\|member note\|profile note" apps/ packages/`). Expectation from story recon: **none exists.** If you find one, AC3's note-offer arm becomes a live key; if not, it stays a `[PENDING CAPABILITY]` policy line + a deferred-work entry. Record what you found either way.
- [x] Read `docs/degradation-policy/README.md:1-20` for the policy-doc header shape (Status / Authority / load-bearing warning) and `docs/legal/niyamavali.md:72-79` for the exact R7 ladder wording you will cite.

### Task 1 — The policy document (AC1)
- [x] Create `docs/policies/out-of-band-contributions.md`. Header block on the `docs/degradation-policy/README.md` model: **Status** (authored by Solo Builder per Story 8.10; the copy it governs is tone-review-gated), **Authority** (UX-DR76 `epics.md:476`; UX spec `L1046-1058`; `epics.md:3027-3039`; Niyamavali R7 §3.1; FR-47 audit integrity), and a load-bearing warning that **no data path for out-of-band gifts may be added** without superseding this document.
- [x] Sections: (1) What an out-of-band contribution is (the real Bihar cadre dynamic — staffroom, union meeting, family connection); (2) The five stances (AC1); (3) The R7 boundary (gift honoured; assigned-Pool contribution still separately expected; consequences land on the *missed contribution*); (4) The three prevented unsafe operations, **each with its fence named** (a → the AC5 no-ingest-path fence + the 8.3/8.4 confirmed-only invariants; b → the copy prohibition + helpline script boundary; c → the `out-of-band-blame` tone rule + the human tone-review); (5) The Madad resolution path (four operator steps, with the private-note step marked `[PENDING CAPABILITY — Epic 10]` unless Task 0 found one); (6) Surfaces bound by this policy (pool-onboarding Screen 3, helpline script, **Sahyog Vivran — Epic 11b Story 11b.3, forward**, analytics); (7) How to change this policy (supersession, never silent edit).
- [x] Language check on the document itself: it is an internal governance doc, but quote member-facing phrasing only in its re-authored form — do not immortalize the blame strings outside the clearly-labelled AC2 "before" table.

### Task 2 — Re-author Screen-3 copy (AC2)
- [x] Rewrite `screen3.title` / `.body` / `.body2` / `.progress_a11y` in `packages/i18n/locales/en/pool-onboarding.json` and `hi/pool-onboarding.json`. **Same key set** — values only.
  - The title must not name the act a mistake or define it by the app ("outside the system"). Aim at the *relationship*, not the *channel* (the tone-guide's "trustworthy neighbour" register, `docs/tone-guide.md §1`).
  - `body` = the honoured direct-to-family gift. `body2` = the genuinely-mistaken wrong-pool payment + the Story 7.6 facilitated-recovery reassurance ("your pool assignment stays as it is"). Keep them **distinct**; the reader must not come away thinking a gift needs recovering.
  - Do not promise reconciliation, crediting, or retroactive integration of the gift — that would contradict AC1 stances (ii)/(iii).
- [x] Hindi authored as first-class Devanagari register (not transliteration). Latin numerals if any number appears (operational surface, §8 v4 — `ux-design-specification.md:1121-1127`).
- [x] Run `pnpm --filter @twt/i18n i18n:check-parity`.
- [x] Confirm no `apps/mobile` change is needed; if a body key must be **added** (avoid if possible), update `PoolOnboardingTutorial.tsx`'s `bodyKeys` array (`:49`) and say so explicitly in the Dev Agent Record.

### Task 3 — Helpline out-of-band script (AC3)
- [x] Add keys under the existing `contribution` namespace (e.g. `out_of_band.helpline.*`) in `packages/i18n/locales/{en,hi}/contribution.json` — en/hi parity — for **acknowledge**, **clarify** (R7-cited, separately-expected assigned-Pool contribution), and the **do-not-contact-the-family** operator boundary.
- [x] The clarify line must be *factual and non-punitive*: it states what remains expected, it does not scold, and it never implies the gift was the wrong choice.
- [x] The **private-note offer**: ship as a live key **only if** Task 0 found a real capability. Otherwise it is a `[PENDING CAPABILITY — Epic 10]` line in the policy doc + a `deferred-work.md` entry (Task 6). Record the decision.
- [x] The do-not-contact boundary is an **operator instruction**, not caller-facing speech — key it so it cannot be voiced to a member as if it were reassurance about their own conduct (or home it in the policy doc if a translated key would be misleading; state which you chose and why).

### Task 4 — The `out-of-band-blame` tone rule + scope extension + teeth (AC4)
- [x] Add the `out-of-band-blame` entry to `microcopy.yaml` `tone:` with a **single valid case-insensitive regex** and a comment block explaining, in the file's established style, what it catches and why (mirror the `pool-reality-comparison` comment's density).
- [x] Add `packages/i18n/locales/hi/pool-onboarding.json` + `packages/i18n/locales/en/pool-onboarding.json` to `scope.copy_globs` with a Story-8.10 comment (the 7.8 / 8.2 comment convention).
- [x] Write `scripts/microcopy/out-of-band.test.ts` on the `close-of-cycle.test.ts` skeleton: parse the **real** `microcopy.yaml`, read the **real** locale files, run the **real** `checkTone`. Assert (i) the pre-8.10 Screen-3 strings (inlined as fixtures, both locales) **are flagged**; (ii) planted violations in en and hi are flagged; (iii) the re-authored real copy is **clean**; (iv) the `contribution` out-of-band script keys are clean.
- [x] Run `pnpm microcopy:check` over the **full** `copy_globs` set. Any false positive on `niyamavali` / `terms` / `close-of-cycle` / `contribution` → **narrow the regex** and record why. Do not add an `allow` entry that blankets a real member surface.
- [x] Run `pnpm microcopy:test` (the pure `lib.test.ts` suite) to confirm the config still parses under the strict parser.

### Task 5 — The no-ingest-path fence (AC5)
- [x] Add the fence test at `packages/domain/tests/contribution/no-ingest-path.test.ts` (DB-free — sibling to the existing `events.test.ts` / `history.test.ts` / `read.test.ts` in that same directory, not a new top-level location): import `CONTRIBUTION_EVENT_TYPES` / `CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS` (`events.ts:85,96`), `CONFIRMED_EVENT_TYPE` (`read.ts`), `CONTRIBUTION_MISMATCH_EVENT_TYPE` (`history.ts:67`) and pin the **complete** set of contribution-bearing event types at exactly those three. A fourth type must fail the test.
- [x] Assert the negative surface: scan `packages/domain/src/schema/**` + the event-type vocabularies for `out_of_band` / `direct_gift` / `outside_payment` / `gift_` shaped identifiers → must be **zero**. Keep the scan narrow and name the offender on failure (the "name the offender" contract).
- [x] **Revert-sanity, recorded:** plant a fourth event type and a matching schema column name → confirm the test fails → revert → green. Paste the evidence into the Dev Agent Record. An unproven negative assertion is not a fence.
- [x] Do **not** add a new CI scanner script or a new `ci.yml` job — this rides the existing `test` job.

### Task 6 — Governance registrations + forward commitments (AC6)
- [x] `docs/tone-guide.md §3` — add the **out-of-band blame** prohibited-frame bullet, cross-linking `docs/policies/out-of-band-contributions.md`, with the UX-spec citation.
- [x] `docs/tone-review-checklist.md` — add the matching §3 checklist item **and** Publish-routing table rows for the out-of-band surfaces (pool-onboarding Screen 3; helpline out-of-band script), following the Story 7.8 close-of-cycle row's "review permission added by its owning consumer story" wording.
- [x] `docs/onboarding-tour.md` Companion reading — add `docs/policies/` (Story 8.10 authored).
- [x] `friction-budget.md` — append the **Story 8.10 disposition (declaration affirmed, no new row)** after the 8.8 entry: docs + locale strings only; the Screen-3 rewrite is a values-only change inside an already-affirmed skippable, non-gating tutorial; no new step, form, gate, or upload; `apps/public` untouched so no page-weight/baseline movement ([[project_friction_budget_baseline_ratchet]]).
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` — new dated section for this story recording (i) the **private-note capability** gap with an Epic-10 re-trigger, and (ii) the **Sahyog Vivran / analytics no-credit** constraint as a forward commitment on Epic 11b Story 11b.3. Use [[feedback_closure_language_precision]] wording: these are *deferred with a gate*, not *closed*.
- [x] Optional (say so if skipped): note the microcopy row in `_bmad-output/implementation-artifacts/gate-inventory.md` — the `copy_globs` surface + the new tone rule. 7.8 and 8.2 did not update it; consistency argues either way, so make a call and record it.

### Task 7 — Verification
- [x] `pnpm microcopy:check` ✓ · `pnpm microcopy:test` ✓ · `pnpm --filter @twt/i18n i18n:check-parity` ✓.
- [x] `pnpm ci:local` green with `DATABASE_URL` on `:5433` ([[project_ci_actions_suspension_local_mirror]], `--concurrency=4` already in `ci-local.sh`).
- [x] Confirm `openapi/v1.yaml` is **byte-identical** (no contract touched) and `git diff --stat` shows **no** migration, schema, route, or handler file.
- [x] Re-read the re-authored Screen-3 + helpline copy against `docs/tone-review-checklist.md` §1–§4 yourself, and record in the Dev Agent Record that the **non-author** human sign-off is still owed (the lint floor does not waive it — `docs/tone-guide.md §5`).

### Review Findings

_3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 2026-07-24. The Acceptance Auditor independently re-derived both new regexes and re-ran the recon claims; zero AC violations survived verification. The findings below are regex/scan-completeness gaps the Blind and Edge-Case layers surfaced — none contradict a passing AC, but several narrow the absoluteness AC5 claims for the no-ingest-path fence._

- [x] [Review][Patch] Hindi mistake-frame arms (`गलती\s*से`, `चाहिए\s*था`) are unbound to any verb/noun, unlike the carefully-bound English counterparts (`accidentally PAY`, `should have GONE/PAID/…`) — risks false positives on genuine Hindi mistake-copy elsewhere (e.g. a natural wrong-PIN message phrased with गलती से). BigDev decision (2026-07-24): narrow now, with a recorded reason mirroring the English "accidental"-arm narrowing. **Applied**: adjacency-binding (mirroring the English arms) doesn't work in Hindi — the real pre-8.10 fixture has "सिस्टम के बाहर" sitting between गलती से and भुगतान, so an adjacent-verb bind would have broken the load-bearing fixture. Bound instead via a ≤60-char bidirectional proximity lookaround to भुगतान/पैसे/राशि/योगदान/दान/उपहार. Verified against every existing fixture in `out-of-band.test.ts` plus 2 new cases (a Hindi analogue of the already-permitted "should have received an SMS," and an unrelated गलती से with no payment context) — all pass; `pnpm microcopy:check` still green on all 76 code + 10 copy files. [microcopy.yaml:115]
- [x] [Review][Defer] `out_of_band.helpline.boundary.instruction` (must never be voiced to a member) is distinguished from the spoken `.script` keys only by naming convention + human review discipline — no mechanized guard stops a future Epic-10 console from rendering it to a member [packages/i18n/locales/{en,hi}/contribution.json — `out_of_band.helpline.boundary.instruction`] — deferred, BigDev decision (2026-07-24): record as a forward risk binding Epic 10 rather than build a guard now (no live consumer exists yet).
- [x] [Review][Patch] `FORBIDDEN_IDENTIFIERS` has no case-insensitive flag and misses PascalCase/SCREAMING_SNAKE/kebab-case identifier forms (e.g. `OutOfBandGift`, `OUT_OF_BAND_TYPE`, `out-of-band-id`) — undermines AC5's "no such surface exists anywhere" absolute claim. **Applied**: added the `i` flag + optional-underscore separators (covers snake_case/camelCase/PascalCase/SCREAMING_SNAKE_CASE via one alternative each). Kebab-case was attempted too but **reverted with a recorded reason**: running the patched fence against the real repo surfaced two live false positives — `member_search_projection.ts:39` ("any **out-of-band** write") and `pariwar_wa_templates.ts:48` ("registers with Meta **out-of-band**") — both the ordinary English idiom, unrelated to this policy. Unlike the other three case conventions, this codebase's DB/TS identifiers are never kebab-case, so the hyphen alternative was pure risk with no real upside; dropped. [packages/domain/tests/contribution/no-ingest-path.test.ts:135]
- [x] [Review][Patch] The fourth-event-type scan regex (`/'(contribution\.[A-Za-z0-9._-]+)'/g`) only matches single-quoted string literals — a double-quoted, template-literal, or concatenated form of a new event type would evade detection, undermining "a fourth literal … fails here." **Applied**: added double-quote support. Backtick was attempted too but **reverted with a recorded reason**: it turned `events_log.ts`'s own doc comment — which lists `` `contribution.matched` `` backtick-quoted as a hypothetical illustrative example, never a real literal — into a live false positive. This codebase uses backtick-quoted `code.refs` inside prose comments; matching them collides with that convention. Concatenated/dynamically-built literals remain out of scope (accepted, matches the fence's own stated "high-signal, not exhaustive" posture). [packages/domain/tests/contribution/no-ingest-path.test.ts:106]
- [x] [Review][Patch] `packages/events/src/registry.ts` is scanned as a single file, not its containing directory (`packages/events/src`) — a sibling module declaring a literal and merely re-exported by registry.ts evades the scan, unlike the other two scanned roots which are full directories. **Applied**: `SCANNED_ROOTS` now scans `packages/events/src` (5 files). [packages/domain/tests/contribution/no-ingest-path.test.ts:56-58]
- [x] [Review][Patch] `collectTsFiles`'s `.ts`-only filter misses `.mts`/`.cts` module files and raw `.sql` migration files under `packages/domain/migrations/` — the policy doc's load-bearing claim ("no table, column… may be added") is broader than what the fence mechanically enforces. **Applied**: `collectSourceFiles` now matches `.ts`/`.mts`/`.cts`/`.sql`, and `packages/domain/migrations` was added to `SCANNED_ROOTS` (83 `.sql` files). [packages/domain/tests/contribution/no-ingest-path.test.ts:66]
- [x] [Review][Patch] English "should have" verb list omits give/given/gives — the single most natural verb for "you should have given it through the app," and inconsistent with the sibling "accidental" arm which does include give-forms. **Applied**: added `given`. [microcopy.yaml:115]
- [x] [Review][Patch] Hindi "doesn't count" arm (`नहीं\s*गिन`) only matches negation-before-verb word order; the more natural Hindi SOV word order ("गिना नहीं जाएगा") isn't matched — a Hindi-first-parity gap in the newly authored regex. **Applied**: added the reverse-order alternative (verb stem + up to 4 Devanagari combining chars + नहीं), covering both "नहीं गिन…" and "गिन…नहीं" constructions. [microcopy.yaml:115]
- [x] [Review][Defer] `e.parentPath ?? abs` fallback in `collectTsFiles` could silently corrupt nested-file paths if `Dirent.parentPath` is ever unavailable (older Node) [packages/domain/tests/contribution/no-ingest-path.test.ts:67] — deferred, pre-existing latent portability risk, not live under the current pinned Node/ci:local environment.
- [x] [Review][Defer] Policy doc §4(a) fence description overclaims relative to what's mechanically scanned — it says the fence guards a new "endpoint, field, form," but `SCANNED_ROOTS` (even after this review's patches) still covers only `packages/domain/src/{contribution,schema}`, `packages/domain/migrations`, and `packages/events/src` — not `apps/api`, `apps/mobile`, or `packages/contracts` [docs/policies/out-of-band-contributions.md §4] — deferred, doc-wording tightening for a follow-up, not blocking for this governance/copy story.
- [x] [Review][Defer] Several narrower tone-rule phrasing gaps ("outside of the app," contraction "isn't counted," "irregular transfer") [microcopy.yaml:115] — deferred, explicitly covered by AC4's own stated design intent that the regex is a floor and the paraphrase/spelled-out tail is the still-owed non-author tone-reviewer's job.

**Post-patch verification:** `npx vitest run packages/domain/tests/contribution/no-ingest-path.test.ts` (7/7) · `npx vitest run scripts/microcopy` (148/148 across all 5 suites) · `pnpm microcopy:check` (green, 76 code + 10 copy files, zero findings) · `pnpm --filter @twt/i18n i18n:check-parity` (green). Full `pnpm ci:local` re-run not performed as part of this review pass (no schema/migration/endpoint files were touched by these patches — only the two new test files' scan logic and the tone-rule regex).

## Dev Notes

### Substrate map — what already exists (reuse it; do NOT reinvent)

| Need | Shipped at | Location |
| --- | --- | --- |
| The out-of-band stance, in full prose | UX spec | `_bmad-output/planning-artifacts/ux-design-specification.md:1046-1058` (+ the failure-mode note at `:1064`) |
| The first live out-of-band surface (Screen 3) | 7.10 | `packages/i18n/locales/{en,hi}/pool-onboarding.json`, `apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx` |
| Operator-voiced script as bilingual i18n keys | 6.3 | `packages/i18n/locales/{en,hi}/claim.json` `readback.{identity,nominee}.{title,script}` |
| Tone rule + `copy_globs` extension, config-only | 7.8 / 8.2 | `microcopy.yaml` `tone[]` + `scope.copy_globs`; engine in `scripts/microcopy/lib.ts` |
| Real-config / real-copy teeth test | 7.8 | `scripts/microcopy/close-of-cycle.test.ts` (copy this file's structure) |
| Contribution event vocabulary (the only ingest paths) | 8.4 / 8.3 / 8.6 | `packages/domain/src/contribution/events.ts:85,97`; `read.ts` `CONFIRMED_*`; `history.ts:67` |
| Confirmed-only visibility invariant | 8.3 | `packages/domain/src/contribution/read.ts` + its tests |
| Attestation-is-not-confirmation invariant | 8.4 | `packages/domain/src/contribution/{events.ts,write.ts}` |
| Policy-doc-as-top-level-`docs`-surface precedent | 0.4 | `docs/degradation-policy/README.md` |
| Governed-surface registration precedent | 7.8 / ADR-0031 | `docs/tone-review-checklist.md` Publish routing; `docs/tone-guide.md §3,§5` |
| Niyamavali R7(A)–(E) ladder (cite, never amend) | 2.3 | `docs/legal/niyamavali.md:72-79` |
| Friction-budget disposition convention | many | `friction-budget.md` §The ledger (8.8 entry at `:647`) |

### Load-bearing invariants this story must NOT break
- **No data path for out-of-band gifts.** No table, column, event type, endpoint, or field. The system's ignorance of these gifts is the *feature* (`epics.md:3037`). AC5 makes that executable.
- **Confirmed-only visibility (8.3) + attestation-is-not-confirmation (8.4).** Untouched. 8.10 adds a fence *around* them; it never relaxes them.
- **R7 is not softened.** The assigned-Pool contribution remains separately expected; a skip still lands on R7(D)/(E). The policy honours the gift, not the omission.
- **i18n key parity + key-set stability.** Values change; keys don't (the tutorial renders by key). `i18n:check-parity` is the floor.
- **Tone-review is a human gate.** The new regex is a floor, not a ceiling — the paraphrased tail is explicitly the reviewer's job (`docs/tone-guide.md §5`). Do not claim the lint discharges the review.
- **Niyamavali amendments go through Story 2.4.** This story cites clauses; it never edits `docs/legal/niyamavali.md`.

### Decisions — ratified defaults, build to these
1. **D1 — The policy lives at the epic's literal path.** `docs/policies/out-of-band-contributions.md`, creating `docs/policies/` as a new top-level surface. The 0.4 precedent would suggest a framework directory; the AC names a single file, and a single file is honest for a single policy. Add the directory to the day-1 reading list (`docs/onboarding-tour.md`) so it is discoverable.
2. **D2 — Helpline script = i18n keys, not doc prose.** The 6.3 precedent is decisive: operator-voiced text that reaches a member is member-register copy, is bilingual, and belongs where the microcopy gate can see it. The `contribution` namespace is already scanned; no scope change needed for this arm.
3. **D3 — The tone rule is the story's mechanization, and it is the *right* one to add.** Per [[feedback_mechanization_split_commitment]]: blame-framing is the cheapest, most-corrosive, most-likely-to-recur family here (it already recurred once, in shipped copy). Unsafe operation (a) is structurally prevented and only needs a fence; (b) is a process rule; (c) is exactly what a regex catches. One new rule, one scope extension, one fence — not three new gates.
4. **D4 — The private-note offer does not ship as a script line unless the capability exists.** Recon expectation is that it does not. Scripting an operator to offer a non-existent feature is precisely the integrity failure [[feedback_record_unattested_no_backfill]] names. Record it un-built; give it an Epic-10 re-trigger.
5. **D5 — Sahyog Vivran is a declared forward constraint, not wiring.** Story 11b.3 is unbuilt (the 8.9 declared-seam convention). Register the surface, record the commitment, write no renderer code.
6. **D6 — No new CI job, no new scanner script.** The tone rule rides `microcopy:check`; the fence rides `test`. Adding a third gate for a docs-and-copy story would be over-gating a family the existing gates already reach.

### Anti-patterns — do NOT do these
- ❌ Adding an "out-of-band gift" field/table/event/endpoint anywhere — that *is* unsafe operation (a).
- ❌ Counting, displaying, or aggregating an out-of-band gift on any pool stat, contributor list, progress meter, Yogdaan Bahi row, Sahyog Vivran, or analytics surface.
- ❌ Keeping (or paraphrasing) *accidentally / गलती से / outside the system / सिस्टम के बाहर / should have* in member-facing copy.
- ❌ Scripting the operator to ask the member to re-route or re-send the gift through the app (unsafe operation (b)).
- ❌ Editing `docs/legal/niyamavali.md` (Story 2.4 owns clause amendments) or softening R7.
- ❌ Adding a blanket `microcopy.yaml` `allow` entry over a real member-copy file to make the new rule green.
- ❌ Shipping the tone rule with only a green scan and no planted-violation proof ([[feedback_gate_scope_semantic_coverage]]).
- ❌ Renaming or removing `screen3.*` keys (the tutorial renders by key).
- ❌ Claiming the human tone-review sign-off is discharged because the lint is green.

### Testing standards
- The **teeth** are the deliverable, not the green: `scripts/microcopy/out-of-band.test.ts` must fail on the pre-8.10 real strings and on planted violations in both locales, and be clean on the rewrite — the `close-of-cycle.test.ts` structure, loading the real config and real files.
- The **fence** must be revert-sanity proven (plant a fourth event type + a matching column identifier → red → revert → green), with the evidence pasted into the Dev Agent Record.
- No live-DB work is expected. If a spec you touch turns out to be DB-gated, follow [[project_live_db_test_gotchas]] (test DB `twt-test-pg` on `:5433`; never regenerate an applied migration; never `DROP SCHEMA`; assert membership, not counts).
- Merge gate = `pnpm ci:local` green ([[project_ci_actions_suspension_local_mirror]]); confirm a suspected failure in isolation before attributing it to this story ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]]).

### Project Structure Notes
- **New:** `docs/policies/out-of-band-contributions.md`; `scripts/microcopy/out-of-band.test.ts`; the AC5 fence test under `packages/domain/tests/`.
- **Modified (copy):** `packages/i18n/locales/{en,hi}/pool-onboarding.json` (values only); `packages/i18n/locales/{en,hi}/contribution.json` (+ `out_of_band.helpline.*`).
- **Modified (config):** `microcopy.yaml` (+1 `tone` rule, +2 `copy_globs`).
- **Modified (governance):** `docs/tone-guide.md`, `docs/tone-review-checklist.md`, `docs/onboarding-tour.md`, `friction-budget.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Expected to be untouched:** every `packages/domain/migrations/*`, every `apps/api` route/handler, `openapi/v1.yaml`, `apps/mobile/**/*.tsx` (unless a body key is added — flag it), `docs/legal/**`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.10 (L3027-3039) — the AC of record, incl. the `docs/policies/` path + the three unsafe operations]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR76 (L476) — act honored as personal mutual aid; not "failing" the Pool Engine; the Madad four-step resolution]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.10 Screen 3 (L2829) — the surface this story's copy binds]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Out-of-Band Contribution Policy (L1046-1058) — the substantive five stances + operator steps (a)-(d)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Failure Modes (L1069) — "it is not a failure mode and is not characterized as one"]
- [Source: docs/legal/niyamavali.md#PART 3 §3.1 (L72-79) — R7(A)-(E), the discipline ladder the clarify-step cites]
- [Source: microcopy.yaml#tone + scope.copy_globs — the config-only extension surface; `pool-onboarding.json` is NOT yet scanned]
- [Source: scripts/microcopy/close-of-cycle.test.ts — the real-config / real-copy teeth-test structure to copy]
- [Source: packages/domain/src/contribution/events.ts:85,96 · read.ts CONFIRMED_EVENT_TYPE · history.ts:67 — the three (and only three) contribution event types AC5 pins]
- [Source: _bmad-output/implementation-artifacts/6-3-helpline-mediated-claim-filing-flow-member-lookup-read-back.md:86,278 — operator script as bilingual i18n keys]
- [Source: _bmad-output/implementation-artifacts/7-9-pool-engine-pre-launch-measured-validation-gate.md — the `[GOVERNANCE]` story shape (scope table + evidence + registration)]
- [Source: docs/tone-review-checklist.md#Publish routing — the governed-surface registration table]
- [Source: friction-budget.md:450,647 — the 7.10 and 8.8 disposition entries this story's entry follows]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / `bmad-dev-story`), 2026-07-24.

### Debug Log References

**Task 0 — recon findings (all six subtasks; the two that changed decisions are marked ⚑).**

1. `ux-design-specification.md:1046-1058` read end-to-end. Every AC1 stance traces to a line there; the epics AC is its summary. The `:1069` failure-mode note ("it is not a failure mode and is not characterized as one") is quoted into the policy's framing.
2. Screen-3 copy confirmed rendered **by key**: `PoolOnboardingTutorial.tsx:49` declares `{ key: 'screen3', bodyKeys: ['screen3.body','screen3.body2'] }`, and the render path is `t(`${step.key}.title`)` / `t(`${step.key}.progress_a11y`)` / `step.bodyKeys.map(t)` (`:141-160`). ⇒ a values-only rewrite needs **no** component code change. (One header **comment** was updated — see Completion Notes #3.)
3. `microcopy.yaml` / `lib.ts` / `close-of-cycle.test.ts` read. `checkTone` (`lib.ts:353`) applies **every** `tone[]` entry to both `code_globs` and `copy_globs` — load-bearing, and it is what produced the one false positive below. `contribution.json` confirmed already in `copy_globs` (Story 8.2, `microcopy.yaml:148-149`) ⇒ AC3's keys needed **no** scope change, as predicted.
4. Event-type constants pinned by **import**, never re-declared: `CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE` (`write.ts:44` — note: `events.ts:85` holds the `CONTRIBUTION_EVENT_TYPES` tuple, the dotted literal itself is exported from `write.ts`), `CONFIRMED_EVENT_TYPE` (`read.ts:62`), `CONTRIBUTION_MISMATCH_EVENT_TYPE` (`history.ts:67`), plus `CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS` (`events.ts:96`).
5. ⚑ **Private-note surface search: NONE EXISTS** — as the story's recon expectation predicted. `grep -ril -e "private note" -e "member note" -e "profile note" -e "privateNote" -e "memberNote" -e "private_note" apps packages docs` returned exactly one non-`dist` hit, `apps/api/src/modules/member-pool/contribution-note.ts:97` → `deriveMemberNoteRef(pariwarId, memberId)`, which is the member reference **mark printed on the Contribution Note PDF** — an unrelated concept, not a member-profile note. No such table exists either (`packages/domain/src/schema/` has no `member_notes`-shaped file among its 80 tables). ⇒ **D4 holds**: the note-offer arm ships as a `[PENDING CAPABILITY — Epic 10]` policy line, **not** a live operator key (Completion Notes #5).
6. `docs/degradation-policy/README.md:1-20` header shape adopted (Status / Authority / load-bearing warning). R7 ladder wording taken verbatim from `docs/legal/niyamavali.md:72-79` — R7(D) 3-month lock-in + catch-up; R7(E) 5-month lock-in + complete all missed. `docs/legal/**` **not edited** (Story 2.4 owns clause amendments).

---

**AC4 teeth — the RED, recorded (the headline evidence).** The tone rule and the `copy_globs` extension were landed **before** the copy was fixed, so the rule's teeth are proven by a real gate failure on real committed strings rather than by a green scan:

```
$ pnpm microcopy:check          # rule + scope added, copy NOT yet rewritten
  ✗ [tone] packages/i18n/locales/en/pool-onboarding.json:11 — "accidentally pay"
  ✗ [tone] packages/i18n/locales/en/pool-onboarding.json:11 — "outside the system"
  ✗ [tone] packages/i18n/locales/en/pool-onboarding.json:14 — "accidentally pay"
  ✗ [tone] packages/i18n/locales/en/pool-onboarding.json:14 — "outside the system"
  ✗ [tone] packages/i18n/locales/hi/pool-onboarding.json:11 — "गलती से"
  ✗ [tone] packages/i18n/locales/hi/pool-onboarding.json:11 — "सिस्टम के बाहर"
  ✗ [tone] packages/i18n/locales/hi/pool-onboarding.json:14 — "गलती से"
  ✗ [tone] packages/i18n/locales/hi/pool-onboarding.json:14 — "सिस्टम के बाहर"
✗ microcopy gate FAILED with 8 finding(s).
```

Both locales, both the title and the a11y string, both blame arms (mistake frame + defined-by-the-app frame). After the AC2 rewrite: `✓ microcopy gate passed`. Those eight strings are pinned as fixtures in `scripts/microcopy/out-of-band.test.ts` §(a) so the proof outlives the copy it removed.

**AC4 — the one false positive, and why the PATTERN was narrowed rather than allow-listed.** The first draft of the regex used a bare `\baccidental(ly)?\b`, which fired on a **developer comment** in the `code_globs` slice: `apps/admin/src/modules/claim-verification/ConcealmentAssessmentControl.tsx:52` — *"an accidental double-click on the submit button silently re-records…"*. That is not the prohibited frame in any sense. Per AC4 ("the *pattern* is narrowed with a recorded reason") the mistake arm was bound to a giving/paying verb or noun (`accidentally pay|gave|sent|made|…`, `accidental payment|gift|…`), which is where the frame actually lives ("you accidentally **paid**"). No `allow` entry was added. Re-run: exactly the 8 intended findings, zero collateral. A regression test for this narrowing lives in `out-of-band.test.ts` §(c).

**AC5 revert-sanity — recorded, with both offenders named.** Planted (1) a fourth event type `contribution.out-of-band-recorded` in `CONTRIBUTION_EVENT_TYPES` (`events.ts:85`) and (2) a matching column-shaped identifier `outOfBandGiftAmount` in `packages/domain/src/schema/pools.ts:105`:

```
$ npx vitest run tests/contribution/no-ingest-path.test.ts     # WITH PLANTS
 × the WRITE vocabulary carries exactly the one type the app itself may emit
 × no FOURTH contribution.* event type exists anywhere in the vocabulary or the schema
   → unrecognised contribution.* event type(s):
       packages/domain/src/contribution/events.ts: contribution.out-of-band-recorded
 × no out_of_band / direct_gift / outside_payment / gift_* table, column, or event type exists
   → an out-of-band gift surface appeared — this is unsafe operation (a) of epics.md:3039.
       packages/domain/src/schema/pools.ts:105 — outOfBandGiftAmount
      Tests  3 failed | 4 passed (7)

$ # plants reverted (git diff --stat on both files → empty)
$ npx vitest run tests/contribution/no-ingest-path.test.ts     # AFTER REVERT
 ✓ tests/contribution/no-ingest-path.test.ts (7 tests)      Tests  7 passed (7)
```

**AC5 — a real vacuity the fence's own self-check caught.** The first draft of the forbidden-identifier regex was `/\b(out_of_band|…)\b/`. Its self-check (`the forbidden-identifier pattern is itself live`) **failed immediately** on the sample `out_of_band_gifts`: `_` is a word character, so the **trailing** `\b` cannot match after `band`, meaning a table literally named `out_of_band_gifts` — the exact thing the fence exists to catch — would have slipped through and left a permanently, silently green assertion. The pattern now anchors on the left only (`/\b(out_of_band|…|gift)[A-Za-z_]*/`) and the self-check samples were widened (`out_of_band_gifts`, `outOfBandGiftId`, `gifts`, …). This is the "a green negative assertion that cannot fail is worthless" clause doing real work, not ceremony.

**Task 7 — `pnpm ci:local` (merge gate, `DATABASE_URL` on `:5433`).** Four runs; **runs 2 and 4 PASSED — 28 job(s) green**, run 4 being the final state of the tree. Runs 1 and 3 each failed on a **different** unrelated package, and each was confirmed innocent in isolation before being attributed, per [[project_known_livedb_test_failures]]. Both are recorded here rather than quietly re-run:

- **Run 1 — `@twt/channels#test`** (surfaced as `✗ test (unit)` + `✗ integration-tests`). This story touches no file under `packages/channels`. `pnpm --filter @twt/channels test` in isolation → **168 passed | 4 skipped**, including the 100-threaded-render `determinism.test.ts`. The known [[project_ci_local_concurrency_oversubscription]] class — a parallel turbo run starving a thread-pool-heavy suite.
- **Run 3 — `@twt/jobs` `tests/audit/integrity-check.test.ts`** ("chunk-boundary deletion → caught by cross-chunk stitch", `AssertionError: expected 9850 to be 9851`). A **cross-suite live-DB interference** flake: the assertion pins a global audit sequence captured earlier in the test, and a concurrently-running suite committed an audit row in between, shifting it by one. Textbook [[project_live_db_test_gotchas]] ("own-committing writers accumulate rows — assert membership, not counts") crossed with the concurrency class. In isolation → **11 passed | 11**, including that exact case. This story touches no `apps/jobs`, audit, or DB file.

Neither is a Story 8.10 regression, and neither was introduced by this diff; both are pre-existing test-isolation weaknesses in suites this story does not touch. Flagged rather than fixed — fixing run 3's sequence assertion is a real (small) hardening job that belongs to the suite's owner, not to a `[GOVERNANCE]` copy story.

### Completion Notes List

1. **The headline deliverable was a correction, not an addition.** Story 7.10 shipped tutorial Screen 3 carrying the exact frame this story's own AC forbids — *"If you accidentally pay outside the system"* / *"अगर आप गलती से सिस्टम के बाहर भुगतान कर दें"*. `accidentally / गलती से` names an honourable act a mistake; `outside the system / सिस्टम के बाहर` defines a member's personal act of mutual aid by its relation to the app. Both are now gone from both locales, and the `out-of-band-blame` rule is what stops them coming back.

2. **AC2 — the two events are now SEPARATED, which was the substantive half the regex cannot reach.** The shipped screen conflated an honoured direct-to-family gift with a genuinely-mistaken wrong-pool payment under one mistake-framed title. Now: `screen3.body` honours the gift (*"That is your own act of support, and the trust holds it in respect. It stays between you and that family; the trust keeps no record of it."*), and `screen3.body2` opens with *"Separately:"* and keeps the wrong-pool payment framed as the recoverable mistake it genuinely is, with the Story 7.6 facilitated-recovery reassurance intact (*"your pool assignment stays as it is"*). The body also states plainly that the assigned pool's contribution for the cycle **still stands separately** — honest about R7 without scolding, and it forecloses the harmful inference that the gift substitutes for the cycle. No reconciliation, crediting, or retroactive integration is promised anywhere (AC1 stances (ii)/(iii)). Hindi authored as first-class Devanagari register, not a transliteration of the English rewrite. **Key set unchanged** (4 `screen3.*` keys, values only); `i18n:check-parity` green.

3. ⚠️ **One `apps/mobile` file IS in the diff — a comment, flagged as the story instructs.** No body key was added, so no `bodyKeys` change was needed. But `PoolOnboardingTutorial.tsx`'s header comment **quoted the removed blame title verbatim** (`Screen 3 — "If you accidentally pay outside the system"`). Leaving it would have immortalized the blame string in source, which is exactly what Task 1's language check guards against; it was updated to the new title plus a short note on why the copy changed. **Zero rendered or behavioural effect** — it is a comment. Because it touches `apps/mobile`, the friction-budget attribution-on-change rule bites, and the Story 8.10 disposition entry (required by AC6 anyway) satisfies it. `friction-budget` gate green.

4. **AC3 — the do-not-contact boundary is keyed `.instruction`, not `.script`, on purpose.** The story asked for a decision and a reason. Chosen: **ship it as a bilingual key** (not policy-doc prose), because the helpdesk console is an operator surface used by Bihar helpline staff working in Hindi, so an English-only instruction would be the misleading option. But it is keyed `out_of_band.helpline.boundary.instruction` while the two spoken arms are `.script`, and its `title` reads *"Operator boundary — do not voice this to the member"* / *"संचालक के लिए निर्देश — यह सदस्य से न कहें"*, so it cannot be read off to a member as if it were reassurance about their own conduct. It carries both unsafe-operation-(b) prohibitions: do not contact the receiving family, and do not ask the member to re-send/re-route/repeat the payment through the app. The `clarify` script cites R7 factually and never implies the gift was the wrong choice.

5. **AC3/D4 — the private-note step is NOT scripted, because the capability does not exist.** Recon (Debug Log #5) found no member-profile private-note surface. It ships as `[PENDING CAPABILITY — Epic 10]` in the policy doc §5 plus a `deferred-work.md` entry with an Epic-10 re-trigger, per [[feedback_record_unattested_no_backfill]]. Stated honestly in both places: **the UX-DR76 four-step resolution path is three steps in practice today.** Recorded as *un-built*, never as *resolved* ([[feedback_closure_language_precision]]).

6. **AC5 — the fence pins the vocabulary two ways, not one.** A constants-only assertion would only restate what the constants say. So it also **source-scans** `packages/domain/src/contribution/**`, `packages/domain/src/schema/**` and `packages/events/src/registry.ts` for `'contribution.*'` string literals and fails on any that is not one of the three admitted types — naming the offender. The one known non-event-type literal, `'contribution.utr_attested'` (the underscore-form `trigger` name inside the yellow payload), is explicitly enumerated rather than silently pattern-excluded. Two anti-vacuity guards ride along: the scan asserts it actually reached the vocabulary (>20 files, and it saw all three types), and the forbidden-identifier regex asserts it matches its own targets — the guard that caught the `\b` bug in Debug Log.

7. **AC6 — `gate-inventory.md` was deliberately NOT updated (the call the story asked me to make and record).** Its stated update cadence is "revise when a gate **flips status** … or a **new gate lands**." Story 8.10 does neither: it extends an existing active gate's scope by config, exactly as Stories 7.8 and 8.2 did, and neither of those updated the inventory. Updating for a scope extension would also make the row a per-story changelog rather than a one-page map. Consistency with both the documented cadence and the two nearest precedents ⇒ skip. (Note for a future reader: the `microcopy` row's prose still describes `copy_globs` as of Story 2.5 and is now three stories stale — worth one refresh pass covering 7.8 + 8.2 + 8.10 together, not a partial edit here.)

8. **What this story deliberately did NOT build.** No migration, no schema change, no endpoint, no screen, no data model — verified: `openapi/v1.yaml` byte-identical, zero files touched under `packages/domain/migrations/`, `packages/domain/src/schema/`, or `apps/api/src/`. That absence is the deliverable, not an omission: "the trust system does not track, audit, or reconcile them" means the correct artefact for out-of-band gifts is a demonstrable **absence** of a data path, which is what AC5 makes executable. No new CI job and no new scanner script (D6) — the rule rides `microcopy:check`, the fence rides `test`. `docs/legal/niyamavali.md` untouched; R7 cited, never amended, never softened.

9. ⚠️ **The human tone-review sign-off is still OWED and is NOT discharged by this story.** I re-read the re-authored Screen-3 copy and the helpline script against `docs/tone-review-checklist.md` §1–§4 myself and found them clean, but I am the **author** of that copy, and `docs/tone-guide.md` §5 requires a **non-author** reviewer. The `out-of-band-blame` regex is a machine floor, deliberately not exhaustive over natural language; the paraphrased and spelled-out tail — and the judgement that the honouring frame and the wrong-pool recovery frame stay distinct — remain the reviewer's job. Recorded as owed in the policy document's own Status header so it cannot be lost.

### File List

**New**
- `docs/policies/out-of-band-contributions.md` — the AC1 policy document (new top-level `docs/policies/` surface, D1)
- `scripts/microcopy/out-of-band.test.ts` — the AC4 teeth test (real config + real locale files + real `checkTone`; 38 tests)
- `packages/domain/tests/contribution/no-ingest-path.test.ts` — the AC5 no-ingest-path fence (DB-free; 7 tests)

**Modified — copy (values only; no key added, renamed, or removed)**
- `packages/i18n/locales/en/pool-onboarding.json` — `screen3.{title,body,body2,progress_a11y}` re-authored (AC2)
- `packages/i18n/locales/hi/pool-onboarding.json` — same four keys, first-class Devanagari register (AC2)
- `packages/i18n/locales/en/contribution.json` — `+6` keys: `out_of_band.helpline.{acknowledge,clarify}.{title,script}` + `out_of_band.helpline.boundary.{title,instruction}` (AC3)
- `packages/i18n/locales/hi/contribution.json` — the same 6 keys, en/hi parity (AC3)

**Modified — config**
- `microcopy.yaml` — `+1` `tone` rule (`out-of-band-blame`) with its comment block; `+2` `scope.copy_globs` entries (both `pool-onboarding.json` files) (AC4)

**Modified — governance / docs**
- `docs/tone-guide.md` — §3 out-of-band blame prohibited-frame bullet, cross-linking the policy doc (AC6.i)
- `docs/tone-review-checklist.md` — §3 checklist item + 2 Publish-routing rows + the Story 8.10 note (AC6.i)
- `docs/onboarding-tour.md` — Companion reading entry for `docs/policies/` (AC6.ii)
- `friction-budget.md` — Story 8.10 disposition (declaration affirmed, no new row; baseline untouched) (AC6.iii)
- `_bmad-output/implementation-artifacts/deferred-work.md` — the private-note capability gap (Epic-10 re-trigger) + the Sahyog Vivran / analytics no-credit forward commitment on Epic 11b Story 11b.3 (AC6)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `8-10-…` → `in-progress` → `review`
- `_bmad-output/implementation-artifacts/8-10-out-of-band-contribution-policy.md` — this file

**Modified — comment only (flagged; zero behavioural effect)**
- `apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx` — header comment updated; it quoted the removed blame title (Completion Note #3)

**Verified untouched**
- `openapi/v1.yaml` (byte-identical) · `packages/domain/migrations/**` · `packages/domain/src/schema/**` · `apps/api/**` · `docs/legal/**` · `apps/public/**`

## Change Log

| Date | Change |
| --- | --- |
| 2026-07-24 | Story 8.10 drafted — out-of-band contribution policy document, Screen-3 blame-frame correction, bilingual helpline script, `out-of-band-blame` microcopy rule + `pool-onboarding` scope extension, the no-ingest-path fence, and the governance registrations. |
| 2026-07-24 | Story 8.10 implemented (all 7 tasks, AC1–AC6). Authored `docs/policies/out-of-band-contributions.md` (new top-level surface). Re-authored tutorial Screen-3 copy in both locales, removing the shipped blame frame and separating the honoured gift from the wrong-pool mistake (keys unchanged). Added the bilingual helpline out-of-band script (6 keys × 2 locales) under `contribution`. Landed the `out-of-band-blame` tone rule + `pool-onboarding` `copy_globs` extension **before** the copy fix, so its teeth are proven by a real 8-finding gate failure on the pre-8.10 strings; narrowed the mistake arm (recorded reason) after one admin-comment false positive rather than allow-listing. Added the no-ingest-path fence (3 admitted event types, zero out-of-band-shaped surface), revert-sanity proven — its own self-check caught a `\b`-anchoring bug that would have made the negative assertion permanently vacuous. Registered the surfaces in tone-guide §3, tone-review-checklist (§3 + 2 Publish-routing rows), onboarding-tour, and friction-budget (declaration affirmed, no new row, baseline untouched); recorded the un-built private-note capability and the Sahyog Vivran no-credit forward commitment in `deferred-work.md`. No migration, schema, endpoint, or screen; `openapi/v1.yaml` byte-identical. `pnpm ci:local` green (28 jobs). Non-author human tone-review still owed. |
