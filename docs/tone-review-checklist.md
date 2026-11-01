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
| **Sahyog Vivran page copy** (the PUBLIC per-claim drive page; `sahyog-vivran` i18n namespace, en + hi) | the consumer surface's own review permission (added by **Epic 11b** — no generic `copy.review` key is manufactured, per the Story 2.2 posture) | its owning consumer story (**Story 11b.3** shell; **11b.3a** adds the nominee-bank copy and **11b.3b** the named-identity copy, and each owes its own review) |
| **Partner module** (the offer card copy a Pariwar admin authors in the module wizard — `name_en` / `name_hi`, `description_en` / `description_hi`, and the partner's display names; en + hi) | `module.manage` (added by **Story 12.2**; it doubles as the surface's review key, as `banner.manage` / `news.manage` do — decision `2026-11-01-433` QE2). The publisher is never the module's author (invariant (b)); the sign-off is stored as a `marketplace_module_publications` row | **Story 12.2** (module publish, `POST /api/v1/p/:pariwarId/modules/:moduleId/publish`) |

> **Sahyog Vivran note (Story 11b.3).** The `sahyog-vivran` namespace is the PUBLIC per-claim
> drive page — the widest-reach member-visible copy in Epic 11b, read by strangers rather than
> members. Four automated families bite it (the `member_only` vocabulary including **`report`**,
> whose canonical replacement *is this surface's own name*; the strengthened
> `pool-reality-comparison` rule; the `out-of-band-blame` rule, whose Story 8.10 text names
> **Story 11b.3** as its re-trigger; and the UX-DR73 numeral discipline), and the teeth are proven
> by planted violation + revert sanity in `scripts/microcopy/sahyog-vivran.test.ts`.
> ⚠ **What the automated floor CANNOT reach, and what this human review owns:** the live-drive copy
> must promise a LATER outcome and ⛔ never an ESTIMATE, a PROJECTION, or an *"X% confirmed so far"*
> frame that exposes the attested↔confirmed gap (Story 11b.3 AC3 (b)/(c)). ⛔ No regex expresses that
> over natural language. The [§4 grief-context gate](#4-grief-context-gate) applies: every drive on
> this page is a drive for someone who died.
>
> ⛔⛔ **AND ITS SIGN-OFF IS ⛔ UN-ATTESTED — see the un-audited human-review section below.**

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

---

## Ad-hoc copy-review record (surfaces with no publish endpoint yet)

The publish routing above is a **runtime** gate: a sign-off becomes a `tone_review.signoff`
audit entry submitted through the consuming surface's own review endpoint. Surfaces that have
**not yet shipped such an endpoint** — most of the `copy_globs` namespaces — therefore have
**no mechanism** to record a sign-off, even though `tone-guide.md §5` requires one before
publish. ⛔ A review of that copy must **not** be written as a `tone_review.signoff`, because
no publish gate evaluated it and no audit entry was emitted. It is recorded here instead, as
what it is: a **human review, recorded in the repo, ⛔ not an audited publish-gate sign-off.**

⚠ This section is **not** the Nominee Console periodic-review log above (Story 9.1), which
tracks a different, surface-specific obligation. ⛔ Do not merge the two.

| Date | Reviewer (non-author) | Artifact reviewed | Authored by | Outcome |
|---|---|---|---|---|
| 2026-08-31 | BigDev (Solo Builder) | `contribution.json` (en+hi) — the four corrections in commit `bb77a53`: `amount_mismatch_over.body` (hi), `missed_cycle.section_note` (en), `personal_event.before_you_record` (en), `missed_cycle.state_a11y` (hi) | Claude (second code-review pass, Story 11b.2a session) | ✅ **Reviewed and accepted.** `reviewedBy ≠ authoredBy` holds — BigDev authored none of the four. |
| 2026-09-02 | — **NONE** — | `sahyog-vivran.json` (en+hi) — the whole namespace, minted by Story 11b.3 | Claude (dev agent, Story 11b.3 session) | ⛔ **UN-ATTESTED.** ⛔ Not signed, ⛔ not waived, ⛔ not met — recorded as owed. See the note below. |
| 2026-10-24 | — **NONE** — | `memorial.json` (en+hi) — the whole namespace, minted by Story 11b.4 — **and** the permission text `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS['2026-10-24.v2-pending-hi-review']` (en+hi, `packages/domain/src/memorial/authorisation-copy.ts` — the CURRENT version; v1 `2026-10-23.v1-pending-hi-review` is superseded by the 11b.4 code review, R1, and stays in the registry unchanged because a sent row cites its version). ⭐ The review must check, in hi **and** en, that **M2** (the helpline sentence, ADDRESSED TO THE NOMINEE — *"if you, the nominee, ever want it changed or taken down …"*; `-393` M2, `-395` item 3), the TWO sentences v2 adds (the nominee-only sentence right after M2, and — after "Often a small change is enough." since the fix-diff review, V7 — the Trust sentence, last; *"Only the nominee can ask for it to be taken down; the helpline will not remove it at anyone else's request."* and — added by the third code-review pass, T1, BigDev's decision (B) — *"The Trust itself may still withdraw its approval, but only if something in the words or the photo speaks against a person by name, says that someone did something wrong, may be against the law, or names or shows a child."*, each with its Hindi) — plain, not cold, not accusing a relative, **and accurate against MA16** (the Trust's own withdrawal, on MA6's four reasons only — ⛔ never a family's request) — and **M3′** (`preview.before_publish`, BigDev's words polished) are present and gentle — ⛔ guilt, ⛔ count of readers, ⛔ take-down button. Keys added or reworded by the third code-review pass (2026-10-24, agent-drafted): ~~NEW `send.still_sending` (T3)~~ — REMOVED again with the row-held Send key (nothing is ever "still being sent"), REWORDED `outcome.earlier_approval_stands` (now offers writing a new version, shown only when the family may send again) and NEW `outcome.earlier_approval_stands_helpline_only` (the old wording, when it may not) (T1), REMOVED `render.omitted_a11y` (T11); REWORDED `outcome.title` "What you sent" → "About your words" / "आपने जो भेजा" → "आपके शब्दों के बारे में" (device run, D2); NEW `handover.resend` ("Send a new code" / "नया कोड भेजें") and `handover.resend_note` ("We can send a new code to the nominee's phone." / "हम नॉमिनी के फ़ोन पर नया कोड भेज सकते हैं।") (final review, Z0); the mixed address in `outcome.earlier_approval_stands` — "you can write a new version … or the nominee can call the helpline" (deferred V16 — check who "you" is on that screen); and the two "earlier version" lines that can show together with no version named (deferred T18) | Claude (dev agent, Story 11b.4 session) | ⛔ **UN-ATTESTED.** ⛔ Not signed, ⛔ not waived, ⛔ not met — recorded as owed; a launch-gate Row 41 criterion (its `hiReviewed` flips only on a non-author acceptance). The agent ⛔ never self-attests. |
| 2026-10-25 | BigDev (Solo Builder) — **Hindi review only** | `memorial.json` (hi, against en) and the permission text's Hindi (`MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS`, `packages/domain/src/memorial/authorisation-copy.ts`) — every line the agent wrote | Claude (dev agent, Story 11b.4 session) | ✅ **Hindi accepted** — BigDev's words: *"hindi reviewed. It's fine."* BigDev also edited two texts, which therefore need a **non-author** reviewer (Hindi AND tone), ⛔ not covered by this row: the permission text's changed sentence (now `2026-10-25.v3-pending-hi-review`, `-405`; `hiReviewed` stays false) and `outcome.earlier_approval_stands` (en + hi — "or the nominee can call the helpline" → "or call the helpline", which also settles deferred V16); and `preview.before_publish` (M3′) is BigDev's own words. ⚠ The **AC14 tone review** (the checklist above) is ⛔ NOT yet run: BigDev is an eligible reviewer for every agent-written line, ⛔ not for the three above. |
| 2026-10-27 | — **NONE** — | Story 11b.4a's copy (`2026-10-27-412`; text APPROVED by BigDev 2026-10-27 — *"all as recommended"* and, for the reworded line, *"approve Question 10 as proposed"* — an approval of the WORDS, ⛔ not a tone review): (1) `sahyog-vivran:family_memorial.heading` (en *"In the family's words"* · hi *"परिवार के शब्द"*); (2) NEW `memorial:outcome.taken_down` (en + hi — the take-down at the nominee's request, off the page, may write again; ⛔ no "removed by the Trust", "deleted" or "immediately"); (3) REWORDED `memorial:outcome.approved_with_omissions` (en + hi — *"… left out a part, marked below. On the member's Sahyog Vivran page the part left out is simply not there — nothing marks where it was."*, `-411` item 3); (4) the helpline operator's script (English only — `apps/admin/src/modules/memorial-takedown/i18n-en.ts`, `takedown.script.*` and `takedown.confirm.latency`) and ⚠ *(widened 2026-10-28, code review RT8 — AC14 asks for the admin English strings, and these were in no row)* EVERY other new operator line in that file (74 keys, all new with this story — ⛔ the words of `takedown.script.*` (⚠ *except `takedown.script.title`, which is agent-written — corrected 2026-10-28, review RU10*) and `takedown.confirm.latency` are BigDev-approved; the rest are AGENT-WRITTEN), the policy-bearing first: `takedown.subtitle`, `takedown.callBack.body`, `takedown.drive.onPage` / `takedown.lookup.drives` (they say "on the page" while a switch may be off — RT10), `error.memorial_takedown.shown_changed` (now also the answer to a late `kept` — RT2; reworded 2026-10-28 by the agent, review RU4: *"… Close the request as changed. If a version is shown now, ask its nominee to call."* — nothing may be shown), `error.memorial_takedown.shown_unchanged`, `error.memorial_takedown.first_contact_out_of_range`, `error.record.shown_changed`, the `takedown.outcome.*` and `takedown.action.*` labels, and `takedown.callBack.unreadable` ("Not readable just now", which RR19 found mid-sentence in the script — the dedicated sentence it deferred does ⛔ not exist yet); plus the three Trust-console lines in `apps/admin/src/modules/memorial-review/i18n-en.ts` (`memorial.list.takenDown`, `memorial.detail.withdrawnByHelpline`, `memorial.state.taken_down`); (5) the approver email (plain text, English — Subject *"A family memorial you approved was taken down"*; Body *"A family memorial you approved for a Sahyog Vivran page has been taken down by the helpline at the nominee's request. You do not need to do anything. To see which, open Memorial reviews in the Trust console."* — MP10). ⭐ The review must check the Hindi of (1)–(3) against the English (the author's Hindi is ⛔ not a review), that (2) names the nominee (the reader may be a LATER nominee than the one who asked) and is gentle, and that (3) is honest about the page without blaming the family | Claude (dev agent, Story 11b.4a session) | ⛔ **UN-ATTESTED.** ⛔ Not signed, ⛔ not waived, ⛔ not met — recorded as owed. The agent ⛔ never self-attests. |

⛔⛔ **THE 2026-09-02 ROW IS A RECORD OF AN OBLIGATION, ⛔ NOT OF A REVIEW — Story 11b.3 AC7.**
AC7 requires a tone-review Publish-routing row whose reviewer is a **NON-AUTHOR REAL PERSON** (the
11b.9 / 11b.2a precedent). The `sahyog-vivran` copy was authored by the dev agent, so the agent is
disqualified by construction; **BigDev is not disqualified** (BigDev authored none of it) and is the
available qualified reviewer — but the review **has not happened**, so ⛔ nothing may be written as
though it had ([[feedback_record_unattested_no_backfill]]).
⚠ It is ⛔ **not** a `tone_review.signoff` either, and ⛔ could not be: the Sahyog Vivran ships **no
review endpoint**, so there is no publish gate to evaluate it and no audit entry to emit — the same
structural gap this whole section exists to record.
⭐ **What IS discharged, and is not the same thing:** the automated floor. Both locale files are in
`microcopy.yaml` `scope.copy_globs`, four rule families bite them, and the teeth are proven by planted
violation + revert sanity — ⛔ but `tone-guide.md §5` is explicit that the lint is the FLOOR and the
human review is the check ABOVE it. **Trigger: before this surface is deployed to any Pariwar.**
⚠⛔ AND IT IS ⛔ NOT A LAUNCH BLOCKER MANUFACTURED HERE — what keeps this surface dark is deployment
plus the counsel/Panel process, ⛔ never a code mechanism.

⛔⛔ **THIS ROW DOES ⛔ NOT DISCHARGE STORY 11b.2a's AC8.** AC8 attaches to
`contributor_list.empty` (en+hi) — a **different pair of strings**, ⛔ none of the four above —
and those were **authored by BigDev** (ruled verbatim in Story 11b.2a's D7(c)). ⇒
`reviewedBy ≠ authoredBy` **fails** for BigDev on that pair, exactly as it fails for the
transcribing agent. AC8 stays **OPEN and un-attested** until a qualified third party reviews it
([[feedback_record_unattested_no_backfill]]).
