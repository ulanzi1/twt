# Out-of-Band Contribution Policy

**Status:** Author-committed 2026-07-24 by Solo Builder (BigDev) per Story 8.10 (`[GOVERNANCE]`). The member-facing and operator-voiced copy this policy governs is **tone-review-gated**: the `out-of-band-blame` microcopy rule is a machine floor, not the sign-off (`docs/tone-guide.md` §5). A **non-author human tone-review** of the Screen-3 rewrite and the helpline script is still owed.

**Authority:** UX-DR76 (`_bmad-output/planning-artifacts/epics.md:476`) · the UX spec's Out-of-Band Contribution Policy section (`_bmad-output/planning-artifacts/ux-design-specification.md:1046-1058`, + the failure-mode note at `:1069`) · Epics §Epic 8 Story 8.10 (`epics.md:3027-3039`) · Niyamavali R7(A)–(E), PART 3 §3.1 (`docs/legal/niyamavali.md:72-79` — **cited, never amended**; clause amendments go through Story 2.4's audit-logged workflow) · FR-47 (audit integrity).

> **Load-bearing warning — no data path may be added for out-of-band gifts.**
> No table, column, event type, endpoint, field, form, or import. The trust's *ignorance* of these gifts is the feature, not a gap to be closed. `packages/domain/tests/contribution/no-ingest-path.test.ts` makes that absence executable and will fail at PR time. A future story that needs to change this must **supersede this document** (§7), not route around it.

---

## 1. What an out-of-band contribution is

A real Bihar cadre dynamic, recognized and designed for rather than treated as an edge case.

A member learns of a colleague's death **personally** — in the school staffroom, at a union meeting, through a family connection — and sends money **directly to the bereaved family**, rather than through the pool the system assigned them for that cycle.

The act is honourable. It is also, structurally, invisible to the Pool Engine: reconciliation matches a UTR that TWT's own UPI Intent issued against the nominee's bank statement intake. A direct transfer never enters the matcher's input, and no amount of good will can retrofit it.

The Pool Engine is **structurally narrower than the cadre's chanda tradition**. That is a property of the mechanism, not a failure of the member.

## 2. The trust's five stances

Structural, not punitive. These are the stances of record; they bind every surface listed in §6.

1. **The gift is honoured as a personal act of mutual aid.** The trust does **not** characterize it as wrong, a failure, or a rule-violation. The member did something dignified that the Pool Engine cannot capture.
2. **It cannot count toward the family's Pool collection.** Reconciliation requires the matched UTR from TWT's own UPI Intent plus the nominee statement intake; a direct transfer is not in that input.
3. **It cannot be retroactively integrated.** The Pool's contributor list is built from matched contributions. Retrofitting a transfer into that ledger after the fact would break audit lineage (FR-47).
4. **It does not appear in the member's Yogdaan Bahi.** The Yogdaan Bahi reflects matched, attested contributions. Out-of-band gifts are out of its scope.
5. **Staff facilitate dignified resolution via Madad.** The four operator steps are §5.

And, stated plainly (`epics.md:3037`): **the trust does not track, audit, or reconcile out-of-band gifts, and never claims credit for them in Sahyog Vivran or in analytics.**

Stances 2–4 are statements about **what the machine can do**, never about the worth of what the member did. Any copy that lets them read as a verdict on the member is a violation of stance 1.

## 3. The R7 boundary — held honestly

The policy honours the **gift**. It does not waive the **cycle**.

- The member's **assigned-Pool contribution for the cycle is still separately expected** if they wish to remain in good contribution-discipline standing.
- Only the **combination** — out-of-band gift **plus a skipped assigned-Pool contribution** — carries discipline consequences, and those consequences attach to the **missed assigned-Pool contribution**, never to the act of personal mutual aid (`ux-design-specification.md:1058`).
- Those consequences are the existing Niyamavali ladder, unchanged and unsoftened by this policy: **R7(D)** (1 skip in a year → 3-month lock-in + catch-up) and **R7(E)** (2+ skips in a year → 5-month lock-in + complete all missed contributions), per `docs/legal/niyamavali.md:72-79`.

A member who gives directly **and** contributes to their assigned pool has done two good things and owes nothing further. Nothing in this policy creates a new obligation, and nothing in it removes one.

## 4. The three prevented unsafe operations — each with its fence

`epics.md:3039` names three operations this policy must prevent. A policy that only *asserts* them is an aspiration; each is paired below with the concrete thing that stops it.

| # | Unsafe operation | The fence that prevents it |
| --- | --- | --- |
| **(a)** | Attributing out-of-band gifts to pool contribution stats | **`packages/domain/tests/contribution/no-ingest-path.test.ts`** — proves the contribution read surfaces admit exactly three event types (`contribution.utr-attested` / `contribution.confirmed` / `contribution.reconciliation-mismatch`), so no fourth ingest path exists through which a gift could reach a pool stat, contributor list, progress meter, or Yogdaan Bahi; and asserts that **no** `out_of_band` / `direct_gift` / `outside_payment` / `gift_*` table, column, or event type exists anywhere in the schema or the event vocabularies. Revert-sanity proven. Reinforced by the Story 8.3 *confirmed-only visibility* and Story 8.4 *attestation-is-not-confirmation* invariants, which this fence surrounds and never relaxes. |
| **(b)** | Compelling members or families to retroactively route gifts through the app | **The copy prohibition + the helpline script boundary.** No surface may ask a member to re-send, re-route, or "redo it properly through the app"; the operator is explicitly instructed not to (`contribution.json` → `out_of_band.helpline.boundary.instruction`), and not to contact the receiving family to reconcile the gift. Mechanized on the retrospective-correction arm of the tone rule ("should have gone/paid/sent…", "…करना चाहिए था"). |
| **(c)** | Interpreting out-of-band gifts as "incomplete", "irregular", or a failure | **The `out-of-band-blame` tone rule** (`microcopy.yaml`, `pnpm microcopy:check`) + the **human tone-review**. The rule catches the mistake frame (*accidentally paid / by mistake / गलती से*), the defined-by-the-channel frame (*outside the system / सिस्टम के बाहर*), and the doesn't-count / irregular / incomplete family. The paraphrased and spelled-out tail is explicitly the reviewer's job (`docs/tone-guide.md` §5) — the regex is a floor and is deliberately not exhaustive over natural language. |

**Why the tone rule is trustworthy.** It was authored *before* the copy it governs was fixed, and it failed on real committed strings. Story 7.10 shipped tutorial Screen 3 as *"If you accidentally pay outside the system"* / *"अगर आप गलती से सिस्टम के बाहर भुगतान कर दें"* — a mistake frame applied to an honourable act, and an act defined by its relation to the software, which is exactly the framing `epics.md:3038` forbids. Adding the rule turned `pnpm microcopy:check` **red with 8 findings across both locales**; Story 8.10's rewrite turned it green. Those pre-8.10 strings are pinned as fixtures in `scripts/microcopy/out-of-band.test.ts` so the proof outlives the copy it removed.

## 5. The Madad resolution path (operator steps)

When the member raises the situation via Madad (Contact page), the Helpline Operator:

1. **Acknowledges the act** and confirms the member's standing with the trust is not diminished.
   → `contribution.json` `out_of_band.helpline.acknowledge.{title,script}` (en + hi)
2. **Clarifies** that the assigned Pool's contribution for this cycle is still expected separately if the member wishes to remain in good contribution-discipline standing per the Niyamavali R7 sub-clauses. Factual, never corrective.
   → `contribution.json` `out_of_band.helpline.clarify.{title,script}` (en + hi)
3. **Offers a privately-visible note on the member's own profile**, recording the gift for the member's own record-keeping.
   → **`[PENDING CAPABILITY — Epic 10]`. Not scripted, deliberately.** No member-profile private-note surface exists in the codebase today (recon at Story 8.10, Task 0: no such table, column, endpoint, or screen). An operator must not be scripted to offer a capability that does not exist, so this step ships as this line rather than as a live operator-voiced key. Recorded un-built, with an Epic-10 re-trigger, in `_bmad-output/implementation-artifacts/deferred-work.md`.
4. **Does not contact the receiving family** to "reconcile" the gift. That family's relationship with the gift-giver is theirs to hold, not TWT's to mediate.
   → `contribution.json` `out_of_band.helpline.boundary.{title,instruction}` (en + hi). Keyed `.instruction`, **not** `.script`, precisely so it cannot be voiced to a member as if it were reassurance about their own conduct.

## 6. Surfaces bound by this policy

| Surface | Status |
| --- | --- |
| Pool-onboarding tutorial **Screen 3** (`pool-onboarding` namespace, en + hi) | **Live.** Re-authored by Story 8.10; in `microcopy.yaml` `scope.copy_globs`. The gift and the wrong-pool payment are kept distinct: a wrong-pool payment genuinely *is* a recoverable mistake and is framed as one (Story 7.6 facilitated recovery — "your pool assignment stays as it is"); a direct-to-family gift is not, and must never inherit that frame. |
| **Helpline out-of-band script** (`contribution` namespace, en + hi) | **Live** as bilingual i18n keys (the Story 6.3 read-back precedent). The **helpdesk console that displays it is Epic 10's**; Story 8.10 authored the text only. |
| **Sahyog Vivran** (Epic 11b, Story 11b.3) | **Forward commitment — declared, not wired.** When the report renderer is built, it must never claim credit for out-of-band gifts, and must not surface them as a category, a footnote, or an aggregate. Recorded in `deferred-work.md`. |
| **Analytics / measurement** (incl. Story 8.12 loop instrumentation) | Same constraint: out-of-band gifts are not a metric, a funnel step, or a denominator. There is nothing to measure, because there is nothing recorded. |
| Member profile **private note** | **Un-built** (§5 step 3). |

## 7. How to change this policy

By **supersession, never by silent edit**.

A change here is a change to what the trust says to a grieving member about an act of generosity, so it carries the same weight as the surfaces it governs:

1. A story must **name this document** and state what it supersedes and why.
2. The Niyamavali is **not** amended by editing this file. R7 clause changes go through Story 2.4's audit-logged amendment workflow.
3. Any change that would add a data path for out-of-band gifts must first retire the §4(a) fence **explicitly and in the same change**, so the deletion is visible in review rather than incidental.
4. Copy changes re-enter the tone gate and still require the non-author human tone-review.
