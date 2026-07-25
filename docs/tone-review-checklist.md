# Tone-Review Checklist

> **Companion to** [`tone-guide.md`](./tone-guide.md). A **non-author reviewer** works
> through this checklist and **records a sign-off** before any member-visible copy is
> published. Each checklist item maps 1:1 to a dimension of the
> [tone guide](./tone-guide.md). The sign-off is recorded in the tamper-evident audit log
> (Story 1.10) as a `tone_review.signoff` entry — see [Publish routing](#publish-routing).

## How to use this checklist

1. The **author** of the copy prepares the surface (clause text, News/Blog post, T&C
   section, push-notification template, or helpdesk macro) and requests tone review.
2. A **reviewer who is not the author** and who holds the surface's review permission
   (see [Publish routing](#publish-routing)) reads the copy against every item below.
3. The reviewer confirms each item, then **records the sign-off** (the publish gate enforces
   that a sign-off exists and that `reviewedBy ≠ authoredBy` before allowing publish).
4. The automated `microcopy` lint floor must **also** be green — a passing lint does not
   waive this human review, and this review does not waive the lint
   ([tone-guide §5](./tone-guide.md#5-automated-floor-vs-human-check)).

---

## Checklist

> Mark every item. **Any unchecked item blocks sign-off.** The reviewer is recording
> human judgement that the automated `microcopy` gate cannot perform.

### 1. Voice — warm, plain, dignified, never sales-y · ([guide §1](./tone-guide.md#1-voice--warm-plain-dignified-never-sales-y))

- [ ] Members are addressed as *सम्मानित साथी* / colleague — **never** "user", "customer",
      or "donor"; a deceased member is a "Deceased Member", never "Late Teacher".
- [ ] The copy reads as a *trustworthy neighbour*, not a service or a sales funnel; no
      gamification, streaks, badges, or novelty-for-its-own-sake.
- [ ] Totals read as a **tally** (*कुल योगदान … आहुति*), never a "balance"; confirmations are
      brief and undramatic.
- [ ] Narration (where present) holds the *sutradhar* "seen by us all" register — no
      donor-ego, no impact-metric strutting.

### 2. Register per surface · ([guide §2](./tone-guide.md#2-register-per-surface))

- [ ] The copy's register matches its **actor class** (member = calm-precise; nominee =
      grief-respectful; admin = operational; partner = contractual).
- [ ] The named surface register holds: **Yogdaan Bahi** = dignified-respectful;
      **Sahyog Vivran** = honorific; **admin warnings** = factual-precise.
- [ ] **No cross-class leakage** — no member-class copy inside a nominee surface; no
      admin-class shortcut language in member navigation.

### 3. Prohibited frames · ([guide §3](./tone-guide.md#3-prohibited-frames))

- [ ] **No loss/scarcity/comparison-to-target framing** on cycle-close — no "we fell short",
      "X% achieved", "target missed", or progress-meter-against-target — *including* the
      paraphrased, spelled-out, and template-literal variants the lint cannot pattern-match.
- [ ] **No sales-y / donor-funnel framing** (no donation-CTA tone, no Charity-Water-style
      donor-impact storytelling).
- [ ] **No panic / manufactured urgency** — no false alarms, no manufactured deadlines, no
      "respond in 24h or be suspended"; prompts are specific and factual.
- [ ] **No bureaucratic framing** — no ticket-number-before-name; the copy holds the person,
      it does not process them.
- [ ] **Hindi is first-class**, not a translation layer — natural Devanagari register, not
      transliteration or English-with-Hindi-subtitles.
- [ ] **No out-of-band blame** (UX-DR76) — a direct-to-family gift is never framed as a
      mistake (*accidentally paid*, *गलती से*), never defined by its relation to the app
      (*outside the system*, *सिस्टम के बाहर*), never retrospectively corrected (*you should
      have gone through the app*, *…करना चाहिए था*), and never dismissed (*doesn't count*,
      *irregular*, *incomplete*) — *including* the paraphrased and spelled-out variants the
      lint cannot pattern-match. Check the separation too: a **wrong-pool payment** is a
      genuine, recoverable mistake and stays framed as one; the gift must not inherit that
      frame, nor the recovery copy the honouring frame. Policy of record:
      [`docs/policies/out-of-band-contributions.md`](./policies/out-of-band-contributions.md).
- [ ] **No "fursat"-pressure framing on the Nominee Console** (Story 9.1) — the console copy
      carries **no gamification** (streaks / badges / achievements / points / leaderboards /
      *"N% complete"*), **no urgency or falling-behind** framing (*"you're behind," "act now,"
      "hurry up," "don't delay," आप पीछे हैं, जल्दी कीजिए*), and **no pre-threshold escalation
      pressure** (*"last chance," "final reminder"* before the staff-takeover threshold) —
      *including* the paraphrased variants the lint cannot pattern-match. Confirm the reassuring
      negations (*"there is no hurry" / "कोई जल्दी नहीं है"*) read as reassurance, and that any
      optimization is friction-reducing (less typing / better OCR / save-and-resume / prefilling),
      **never** throughput-over-pace. Automatable subset: the `fursat-pressure` tone rule.

### 4. Grief-context gate · ([guide §4](./tone-guide.md#4-grief-context-modulation))

- [ ] **Grief-context gate:** if this copy can appear in any account-frozen / bereavement
      context, it uses **"fursat" cadence** and a **witness-not-bailiff** stance, has **no
      countdowns under emotional load**, assumes **no marketing/upsell surface** is present
      (Module-Shelf grief exclusion), and — on memorial surfaces — honours the
      **black-bordered memorial register** (no marigold/diya/sepia costume-drama). Numeral
      register (ceremonial Devanagari prose vs. operational Gregorian) reads correctly in
      context. *If the copy is non-grief-context, confirm that explicitly.*

### 5. Reviewer attestation

- [ ] **Non-author reviewer confirmed:** I am **not the author** of this copy, I hold the
      surface's review permission, and I have read every item above against the actual copy
      being published.

---

## Publish routing

Tone review is a **publish-time gate**. The sign-off recorded here is enforced at the API
layer by the Story 2.2 tone-review publish-gate primitive (the first consuming endpoint is
the Story 2.4 Niyamavali publish route).

**Governed surfaces** (each is member-visible copy that must pass tone review before
publish):

| Surface | Review permission (who may sign off) | First enforcing story |
|---|---|---|
| **Niyamavali clause** | `niyamavali.review` (seeded at Story 1.8, `packages/domain/src/rbac/permissions.ts`) | **Story 2.4** (Niyamavali amendment publish) |
| **News / Blog post** | the surface's own review permission (added in its owning story) | its owning story |
| **Terms & Conditions** | the surface's own review permission (added in its owning story) | its owning story |
| **Push-notification template** | the surface's own review permission (added in its owning story) | its owning story |
| **Helpdesk macro** | the surface's own review permission (added in its owning story) | its owning story |
| **Close-of-cycle framing** (Panchayat Noticeboard pinned notice + Sahyog Vivran per-claim page; the FR-19 celebration copy, `close-of-cycle` i18n namespace) | the consumer surface's own review permission (added by **Epic 8** / **Epic 11b** — no generic `copy.review` key is manufactured, per the Story 2.2 posture) | its owning consumer story (Epic 8 Noticeboard / Epic 11b Sahyog Vivran) |
| **Pool-onboarding tutorial Screen 3** (the UX-DR76 out-of-band framing; `pool-onboarding` i18n namespace, en + hi) | the consumer surface's own review permission (added by **Epic 7** / **Epic 8** — no generic `copy.review` key is manufactured, per the Story 2.2 posture) | its owning consumer story (Story 7.10 tutorial; copy re-authored by Story 8.10) |
| **Helpline out-of-band script** (operator-voiced member-register copy; `contribution` i18n namespace `out_of_band.helpline.*`, en + hi) | the consumer surface's own review permission (added by **Epic 10** when the helpdesk console lands — no generic `copy.review` key is manufactured, per the Story 2.2 posture) | its owning consumer story (**Epic 10** helpdesk console; text authored by Story 8.10) |
| **Nominee Console copy** (Sunita's reconciliation surface; the *fursat* register; `nominee-console` i18n namespace, en + hi) | the consumer surface's own review permission (added by **Epic 9** — no generic `copy.review` key is manufactured, per the Story 2.2 posture) | its owning consumer story (**Story 9.1** shell; later Epic-9 stories that add console copy) |

> **Close-of-cycle note (Story 7.8).** The `close-of-cycle` templates carry the FR-19
> celebration framing that must **never** surface a comparison-to-target / shortfall
> narrative — the **Pool-Reality #2** prohibited frame already listed in
> [§3 Prohibited frames](#3-prohibited-frames) (do not restate it here). The automated floor
> is the Story 1.17 `microcopy` gate, now scoped over the two locale files with a
> strengthened `pool-reality-comparison` pattern (Story 7.8); this human review owns the
> paraphrased / spelled-out variants the lint cannot pattern-match. The runtime sign-off
> enforcement is wired by the **consuming** story (Epic 8 / 11b) via the existing Story 2.2
> `evaluateToneReviewGate` mechanism — exactly as Story 2.4 did for the Niyamavali. Because
> under-funded closes correlate with grief, the [§4 grief-context gate](#4-grief-context-gate)
> also applies to these templates.

> **Out-of-band note (Story 8.10).** The two surfaces above carry the UX-DR76 framing of a
> **direct-to-family gift** — the **out-of-band blame** prohibited frame already listed in
> [§3 Prohibited frames](#3-prohibited-frames) (do not restate it here). The automated floor is
> the Story 1.17 `microcopy` gate's `out-of-band-blame` rule, now scoped over the
> `pool-onboarding` locale files (Story 8.10); this human review owns the paraphrased /
> spelled-out variants the lint cannot pattern-match, and — the part no regex reaches — the
> judgement that the honouring frame and the wrong-pool **recovery** frame stay distinct.
> The helpline script is **operator-voiced member-register copy** (the Story 6.3 read-back
> precedent), so it is reviewed as member copy even though no member reads it on a screen;
> note that `out_of_band.helpline.boundary.instruction` is an **operator instruction that must
> never be voiced to a member** and is keyed `.instruction`, not `.script`, for that reason.
> Because these conversations happen after a colleague's death, the
> [§4 grief-context gate](#4-grief-context-gate) also applies. Stances of record:
> [`docs/policies/out-of-band-contributions.md`](./policies/out-of-band-contributions.md).

> **Nominee Console note (Story 9.1).** The `nominee-console` copy carries the **"fursat"
> cadence** invariant — the **fursat-pressure** prohibited frame already listed in
> [§3 Prohibited frames](#3-prohibited-frames) (do not restate it here). Console copy must pass
> tone review **before any change ships**. The automated floor is the Story 1.17 `microcopy`
> gate's `fursat-pressure` rule, scoped over the `nominee-console` locale files (Story 9.1); this
> human review owns the paraphrased variants the lint cannot reach (a subtly gamified *"keep it
> up!"*, an implicit throughput-over-pace optimization). Because the console is a grief-context
> surface (a bereaved nominee mid-reconciliation), the [§4 grief-context gate](#4-grief-context-gate)
> also applies. The runtime sign-off enforcement is wired by the consuming Epic-9 story via the
> existing Story 2.2 `evaluateToneReviewGate` mechanism — as Story 2.4 did for the Niyamavali.

### Periodic fursat review (Nominee Console)

**Standing item (Story 9.1, AC2).** Beyond the per-change publish gate above, the Nominee
Console's copy **and** its interaction patterns are revisited for *fursat* preservation **at
least once per release cycle**, with **designer sign-off**. This is a proactive audit (not
triggered by a copy change) that asks: has any accumulated optimization drifted the console
toward throughput-over-pace, or introduced a subtly gamified / urgency affordance the
per-change review did not catch in isolation? The permitted friction-reducers (less typing,
better OCR, save-and-resume, field prefilling) are in scope as *good* changes to confirm are
still friction-reducing, not rushing.

- [ ] **Next periodic fursat review due:** before the following release cycle ships (first due
      date to be set when Epic 9's release-cycle cadence is fixed).

**Periodic review log** (Review fix, Story 9.1 — the tracked entry the standing item requires;
the paragraph above is no longer the sole record). One row per review — do not delete prior
rows:

| Date | Reviewer (non-author) | Designer sign-off | Outcome |
|---|---|---|---|
| _(none yet — first review pending)_ | — | — | — |

**Who may review.** A **non-author** holding the surface's review permission. For the
Niyamavali clause this is the already-seeded **`niyamavali.review`** key — Story 2.2 does
**not** manufacture a generic `copy.review` key, because no generic copy-review endpoint
exists; each surface uses its own resource-specific review key, added by the story that
ships that surface. The gate enforces only two invariants at publish time:
**(a) a sign-off is present** and **(b) `reviewedBy ≠ authoredBy`** (the non-author
invariant). *Which* role may submit the review is enforced at the consumer's
review-submission endpoint (Story 2.4), not by this publish gate.

**Sign-off is audit-recorded.** Recording a tone-review sign-off emits a
`tone_review.signoff` entry through the Story 1.10 tamper-evident audit writer
(`writeAuditEntry`), carrying the reviewed artifact's resource locator, the non-author
reviewer's actor id, and a **content hash** of the reviewed copy (never the raw copy
itself). A publish **attempted without** a recorded non-author sign-off is **blocked** at
the API layer (HTTP `409 tone_review.required`) and the blocked attempt is itself audited as
`tone_review.publish_blocked`. **Persistence** of which-artifact-was-reviewed is owned by
the consuming surface (Story 2.4 records tone-reviewer attribution + `clause_version_id`);
Story 2.2 ships the gate mechanism, not a speculative store.
