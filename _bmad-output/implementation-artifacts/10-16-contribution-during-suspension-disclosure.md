---
baseline_commit: e357ac115ffb146299c3f2ef19fcf29950b249ec
---

# Story 10.16: Contribution-During-Suspension Disclosure `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member who is suspended and being asked to contribute,
I want the payment surface to tell me plainly what this payment does and does not buy,
so that I am never asked for money under a misapprehension about my own coverage.

## Why this story is first in the moderation model

Story 10.17 unblocks the donor roster so a suspended member can make the contributions that restore
them. **The moment that lands, suspended members start receiving contribution requests with no
coverage and no explanation.** This story is the disclosure that makes that ask honest.

> **`[GATE]` — Story 10.17 MUST NOT deploy without this story.**
> (`epics.md:3681`; Sprint Change Proposal 2026-08-04 §2.1 item 2: *"Shipping D3 without D4 creates
> the exact harm D4 exists to prevent, for a bereaved family."*)

Today no suspended member can reach `/pay` at all — `is_valid: false` keeps them off the roster, so
the intent read returns `{ available: false, reason: 'unassigned' }`. **That is not a reason to defer
this work; it is the reason it must ship first.** Build the disclosure now, against a state that is
currently unreachable, so it is already live on the day 10.17 makes it reachable.

## Scope Boundary (read first — prevents over-build AND under-build)

**10.16 owns NO state.** No new table, no migration, no new event type, no new projector, no new
endpoint, no new permission key, no `PERMISSION_CATALOG_VERSION` bump, no OpenAPI change. Every input
it needs already crosses the wire on a shipped read. If you find yourself writing an `INSERT`, a
migration, or a route, **stop — you have left the story.**

| In scope (10.16) | Out of scope → owning story / seam |
|---|---|
| **A pure disclosure derivation** in `@twt/ui` — `(MemberValidityPayloadDto) → ContributionDisclosureViewModel \| null`. Emits i18n KEYS + structured data; no react/react-native, no I/O. The `status-pill` / `pool-progress` presenter shape, verbatim. | Any change to `deriveHeadlineState` (`presenter.ts:68-95`) or to `buildMemberStatusViewModel`. AC3 pins the headline logic **unchanged**. |
| **Rendering it on `apps/mobile/app/(contribution)/pay.tsx`** — the payment surface itself, above the pay CTA. | Rendering it in `<MemberStatusPanel>` (`apps/mobile/app/(membership)/index.tsx`). AC1 is explicit: *"on the payment surface itself and **not** in a status panel."* The panel already has its own moderation notice (10.10); do not touch it. |
| **Reusing `useMemberValidityQuery`** (`apps/mobile/components/member-status/useMemberValidityQuery.ts`) to source moderation standing on `/pay`. | A new `moderationStatus` field on `ContributionIntentResponse` / `NomineeAccountsResponse`, or a new endpoint. Both contracts are `.strict()` and bundle-fenced; the data already exists on a shipped member-self read. |
| **New i18n copy** in `packages/i18n/locales/{en,hi}/contribution.json` (flat dotted keys, the `upi_intent.*` sibling convention). | Copy in `common.json` under `memberStatus.*` — that namespace belongs to the panel. |
| **The restoration-count degraded state** (D1) — an explicit, first-class "we cannot tell you this yet" that names the missing producer. | **Building the `contribution.*` fact producer** → Story 10.24. It changes every validity payload hash + the 7.4 assignment version pin. See D1. |
| **The `restoration_lock_in` arm, structurally present and not-in-force today** (D3). | **Building the restoration-discipline lock-in overlay** → Story 10.23. And do **not** substitute `lockInStatus.state === 'in-lock-in'` for it — see D3, that substitution states a falsehood to the member. |
| **A render-layer fence test** on `pay.tsx` (D2) + pure unit tests on the derivation. | `is_assignable` / `deriveIsAssignable` / `assignable-roster.ts` → Story 10.17. This story does not touch the roster predicate. |

---

## Acceptance Criteria

**AC1 — The disclosure renders on the payment surface, and says all three things.**
**Given** D4-a + `docs/tone-guide.md` §3 + the §4.5 no-shortfall-framing discipline
(`ux-design-specification.md:151`)
**When** a member **under a suspension that still permits contribution** is rendered a contribution
request on `apps/mobile/app/(contribution)/pay.tsx`
**Then** the surface renders, **on the payment surface itself and not in a status panel**, the
substance of: *"Contributions made during suspension restore standing but do not create beneficiary
entitlement for deaths occurring during the suspension period."*
**And** the rendered block states **all three** of: (a) **what the payment does** — it counts toward
restoring standing; (b) **what it does not buy** — no beneficiary entitlement for a death occurring
during the suspension; (c) **how many contributions remain in the restoration package** — subject to
AC4's honest-absence rule.
**And** it renders **before** the member can act — above the `<UPIIntentButton>` / the account-choice
list, never below the fold of the pay CTA. A disclosure the member reads after paying is not a
disclosure.
**And** every string routes through `@twt/i18n` (`t(key, params, { namespace: 'contribution' })`) with
`en` + `hi` parity — no literal member-facing copy in the TSX (the `i18n-parity` CI gate, `ci.yml:214`).

> **The triggering condition is the RULE, not the flag.** *The disclosure is shown whenever the member
> is under a suspension that still permits contribution.* That sentence is the acceptance criterion.
>
> **The current implementation detects that condition via the `suspended_per_<code>` moderation
> special flag** on the validity payload (`parseModerationFlag`, D4) — because that is what the
> transport carries today. The flag is a **detection mechanism, not the requirement.** If a later story
> changes how suspension crosses the wire (10.17 adds `is_assignable` to this same payload; 10.20's
> moderation record model may add more), the detector changes and this AC does not. **Write the
> derivation so the rule is legible in the code**: name the predicate for the condition, not for the
> flag, and put the flag-parsing behind it.
>
> *Corollary, and it is why the qualifier matters:* a **terminated** member is under moderation but is
> **not** permitted to contribute (10.17's predicate excludes them from the roster), so the condition
> is false and the derivation returns `null`. Detecting on "has a moderation flag" would get that
> wrong; detecting on the rule gets it right.

**AC2 — The disclosure applies to both instruments.**
**Given** the disclosure applies to **both** the suspension instrument and the restoration-discipline
lock-in instrument
**When** the derivation is written
**Then** it returns a **discriminated union on `instrument`** — `'suspension' | 'restoration_lock_in'`
— with a distinct copy key set per arm, so a locked-in member gets the equivalent disclosure (*a
locked-in member contributes without coverage and is equally entitled to know*)
**And** the `restoration_lock_in` arm is **structurally complete but not in force today**: Story
10.23's overlay is the only thing that can set it, and 10.23 has not shipped. The detector for that
arm reads the overlay's absence honestly and returns "not in force" — it does **not** fall back to
`lockInStatus.state === 'in-lock-in'` (D3: that is the *join* lock-in, whose members **are** covered —
`VALID_STATES` at `payload.ts:56-60` includes `'lock-in'` — so the fallback would tell a covered
member their contribution buys no coverage, which is the precise harm this story exists to prevent)
**And** a test pins that Story 10.23 lights this arm up with **zero changes** to the copy keys, the
view-model shape, or `pay.tsx`.

**AC3 — The headline logic is untouched, and the combination is covered by a RENDER-layer test.**
**Given** `packages/ui/src/member-status/presenter.ts:68-95`
**When** the suspended-and-contributing combination renders
**Then** `deriveHeadlineState` is **byte-unchanged** — it still reads `specialFlags` via
`parseModerationFlag`, and this story adds no input to it and no branch inside it
**And** the new *combination* is covered by a test that asserts the **render layer**, not only the
view-model.

> **Why this AC exists, verbatim from the 10.10 record (do not repeat it):**
> *"`presenter.ts` attached the moderation prose to the `headline` section, and BOTH render layers
> drop that section (`.filter((s) => s.id !== 'headline')`) — so AC9's 'full prose, not an error code'
> reached nobody: a suspended member saw 'Under review' and an appeal button, with no reason. **The UI
> tests were green because they asserted the view-model, never the render.**"*
> (`10-10-…md:468-473`)
>
> A green view-model test on the new derivation proves **nothing** about whether the member sees it.
> See D2 for what "render-layer test" means in this repo's mobile harness.

**AC4 — The restoration count is honest, never fabricated.**
**Given** the ratified decision D1-B (BigDev, 2026-08-04) and the fact that the `contribution.*` fact
producer does not exist (`[[project_r7_fact_producer_unbuilt]]`; Story 10.24 owns it)
**When** AC1(c)'s "how many contributions remain in the restoration package" is derived
**Then** the view-model carries a **first-class `package_unavailable` state naming the missing
producer** — never `0`, never `null`-rendered-as-blank, never a number derived outside the rule engine
**And** the rendered copy for that state is a plain, calm sentence that does **not** imply the member
has no restoration path and does **not** imply they have completed one — it says the count is not yet
something the system can tell them, and routes them to the helpline (`<CallHelplineCTA>`)
**And** AC1(a) and AC1(b) still render in full — **the count being unavailable never suppresses the
what-it-does / what-it-does-not-buy disclosure.** Those two are the load-bearing halves; the count is
the third.
**And** the day the producer lands, the count arm lights up with **zero changes** to `pay.tsx` and
zero changes to the copy keys for (a) and (b).

**AC5 — Tone: no shortfall framing, no coercion, no blame.**
**Given** `docs/tone-guide.md` §3 (Prohibited frames) + §4 (Grief-context modulation)
**When** the copy is authored
**Then** it carries **none** of: scarcity/shortfall framing, progress-against-target framing,
manufactured urgency, *"24-hour-or-suspended"* coercion patterns, ticket-number-before-name
bureaucracy, or any framing that characterises the member's suspension as a moral failing
**And — the positive requirement — the disclosure explains the member's current position FACTUALLY,
without implying misconduct beyond the trustee's recorded moderation reason.**
**Then** the copy states the standing and its consequence (*your membership is suspended; contributions
during suspension restore standing and do not create entitlement for a death during this period*), and
attributes cause **only** through `moderationReasonLabelKey` — the bounded, trustee-recorded reason
code, rendered as its catalogued label.
**And** the copy carries **no accusatory construction of its own** — forbidden: *"because you
violated…"*, *"due to your failure to…"*, *"as a result of your non-compliance"*, and any second-person
verb that assigns fault the reason code does not itself assert. A recorded reason may be purely
procedural (`voluntary-pending-review`, `regulator-action`); the copy must read correctly for **every**
code in the registry, not only for `fraud` or `concealment`.
**And** it is **Hindi-first parity** (`hi` is authored copy, not a transliteration of `en`)
**And** it passes `pnpm microcopy:check` (`ci.yml:389`) and is submitted for the Story 2.2 tone review
before merge — this is member-facing money copy addressed to someone under sanction, which is exactly
the register §4 modulates.

**AC6 — Accessibility (Story 0.10 P0-2c).**
**Given** the mobile a11y contract every sibling surface on `/pay` already meets
**When** the disclosure renders
**Then** it carries an explicit `accessibilityRole` and is announced (`accessibilityLiveRegion`) — a
disclosure a screen-reader user never hears is the same failure as one below the fold
**And** any numeral it renders is a Latin operational numeral (amendment-A2, the `pay.tsx` convention)
**And** it is not colour-only — the meaning is in the words, not in a red border.

---

## Decisions

**Decisions 4 and 5 follow shipped precedent — implement to them. Decisions 1, 2 and 3 are the calls
this story makes. D1 is CONFIRMED and CLOSED — cite it, do not re-litigate it.**

### D1 — CONFIRMED (D1-B, BigDev, 2026-08-04). The restoration count has no fact source, so 10.16 ships the DISCLOSURE, not the producer. ⭐

The ratified decision, verbatim:

> *"Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly render
> `detection_unavailable` until the contribution-fact producer exists. The story shall not derive R7
> violations outside the rule engine."* — BigDev, 2026-08-04

**10.16 hits the same gap and takes the same answer.** AC1(c)'s "how many contributions remain in the
restoration package" is R7 restoration data (`consecutive_required` / `lock_in_months`), which lives
**only** in `packages/domain/seed/niyamavali-v1-clauses.sql:232-281` and
`packages/niyamavali-engine/tests/fixtures/r7-clauses.ts` — **with no production consumer.** And
counting contributions-made-so-far needs the `contribution.*` facts that
`assemblePayload` has no input for at all (`payload.ts:281`; `CONTRIBUTION_UNAVAILABLE` is pinned at
`payload.ts:294`).

- **D1-B (CONFIRMED) — render the arm, degraded and honest.** `package_unavailable`, naming Story
  10.24 as the producer. This is the codebase's own repeated discipline:
  `ContributionHistoryUnavailable` (`validity-service/types.ts:62-66`),
  `CONTRIBUTION_MISMATCH_EVENT_TYPE` (`domain/src/contribution/history.ts:63-75`), and the 10.11
  violator-flag arm.
- **D1-C — derive the count here, from `listMemberContributionHistory` or an ad-hoc `events_log`
  scan — is REJECTED.** That read anchors on `contribution.utr-attested` (yellow), not confirmation,
  and caps at 500 rows; a lifetime count off it is wrong for a high-count member. More importantly it
  would derive R7 facts outside the rule engine, which D1-B forbids by name
  (`[[project_engine_never_infers_contribution_facts]]`).

**If implementation pressure tempts you toward D1-C, that is the rejected branch — escalate, do not
implement.**

### D2 — NEW, load-bearing. What "a render test, not only a view-model test" means here, and where the derivation lives.

**Two halves.**

**(a) Where the pure derivation lives — RECOMMEND: a new `packages/ui/src/contribution-disclosure/`
module.** It is a sibling of `status-pill/` and `pool-progress/`, exported from `packages/ui/src/index.ts`
alongside them. It **imports** `parseModerationFlag` from `./member-status/i18n-keys.js` rather than
re-deriving the flag protocol (the flag prefixes are already the one source of truth). Rejected
alternative: adding it to `member-status/presenter.ts` — that file is the `<MemberStatusPanel>`
presenter, AC1 says the disclosure is *not* a status-panel concern, and AC3 pins that file's headline
logic unchanged. Keeping it out of that file is the cheapest way to make "unchanged" verifiable.

**(b) How it is render-tested — the comment-stripped source-scan fence over the render file.** That is
the repository standard (six shipped tests, incl. `pay-screen-choice-render.test.ts`, the direct
sibling). It satisfies AC3 because it asserts what the **render source** does with the view-model —
exactly the layer 10.10's bug lived in — which a view-model test structurally cannot reach.

Its one real limit is that it cannot prove visual placement or runtime reachability, so **the fence
must scan for the anatomy that encodes those properties** (≥2 render sites; disclosure JSX before
`<UPIIntentButton>` in source order; the pay CTA not gated on the validity read) rather than for the
mere presence of a key. Task 4 specifies it, and the revert-sanity probe gives it teeth.

**Building a React Native mount harness is outside the scope of this story and should be tracked
independently** — see Escalation 2.

### D3 — NEW. AC2's lock-in arm is a FORWARD CONTRACT. Do not map it onto the join lock-in.

`epics.md:3885` (Story 10.23) is explicit: *"`lock_in_days_at_join` is **NOT** reused — it is
join-scoped by name and semantics"*, and `epics.md:3890` points back at this story: *"Given Story
10.16 / Then the disclosure applies to locked-in members too."* 10.23's overlay is the instrument AC2
names, and it does not exist yet.

**The tempting shortcut — reading `payload.lockInStatus.state === 'in-lock-in'` — is wrong, and it is
wrong in the dangerous direction.** `LockInStatusPayload` (`validity-service/types.ts:26-33`) is
join-scoped (`daysAtJoin` / `unlockDate`), and a member in the `lock-in` lifecycle state is
**`isValid: true`** — `VALID_STATES` at `payload.ts:56-60` is `['lock-in', 'active', 'active-in-grace']`.
So that member **is** covered. Telling them *"your contribution does not create beneficiary
entitlement"* would be a **false statement to a member about their own coverage** — the exact harm
AC1 exists to prevent, inflicted on a different member.

**So: ship the arm structurally, detect it honestly, leave it dark.** The detector for
`restoration_lock_in` looks for the 10.23 overlay signal; absent it, the arm is simply not in force
and the derivation returns whatever the suspension arm says (or `null`). AC2's pin-test proves 10.23
lights it up with no copy or render change.

> **Open question raised, deliberately NOT resolved here (escalation candidate).** FR-8 describes the
> join lock-in as a *general-death* lock-in, yet `VALID_STATES` treats `'lock-in'` as covered. Either
> `isValid`'s docstring (*"covered for support if death today"*) or `VALID_STATES` is imprecise.
> Resolving it changes `deriveIsValid`, which changes **every validity payload hash** → Story 4.8
> cache epochs + the Story 7.4 assignment version pin. That is never a side-quest inside a `[SURFACE]`
> story. **Record it in the Dev Agent Record; do not touch `VALID_STATES`.**

### D4 — Shipped precedent. The moderation flag reaches the member unredacted; reuse the existing self-read.

`redaction.ts` strips only `STATE_TRUSTEE_ONLY_FLAGS = { CONCEALMENT_REVIEW_FLAG }` from `specialFlags`
— the moderation flags are **deliberately excluded** from that set, with the reason recorded at
`payload.ts:96-103`: *"These flags are MEMBER-VISIBLE … because the member must be told WHY."* So
`GET /api/v1/member/validity` already carries `suspended_per_<code>` on a member's own self-call.

**Therefore: `/pay` sources moderation standing by calling the existing `useMemberValidityQuery`
hook** (`memberAuth.memberValidity()` → `GET /api/v1/member/validity`, TanStack key `['member','validity']`,
Zod-validated in the SDK). **No contract change, no OpenAPI regen, no new route.** The query is already
warm on most sessions (the membership screen uses it), so this is usually a cache hit.

### D5 — Shipped precedent. Copy lives in the `contribution` namespace, flat dotted keys, `en` + `hi`.

`packages/i18n/locales/{en,hi}/contribution.json` are **flat** objects with dotted keys
(`"upi_intent.title"`, `"active_contribution.progress"`). Add a new `suspension_disclosure.*` family
there — not to `common.json`, whose `memberStatus.*` family belongs to the panel. Both locales must
carry every key (`i18n-parity` gate). `t()` **throws** on a missing key and on a missing interpolation
param (`packages/i18n/src/resolver.ts:35-43`) — the 10.10 trap that turned a fallback branch into dead
code that crashed a job loop. **Prefer keys with no interpolation params** for this block.

---

## Tasks / Subtasks

### Task 0 — Orient, and confirm nothing shifted under you (AC: all)
- [x] Read `epics.md:3660-3681` (this story) and `:3683-3713` (10.17, the story you are gating).
- [x] Read the D1/D2/D3 blocks above. **D1 is closed.** Do not re-open the producer question mid-story.
- [x] `git fetch origin` and diff `baseline_commit` → `origin/main` (`[[feedback_git_fetch_before_remote_reasoning]]`).
      Nothing between 10.11's authoring and now touches the validity payload — but 10.17 lands *after*
      this story and **adds a field to that payload**, so do not write anything that assumes the payload
      shape is closed.
- [x] Confirm `pnpm ci:local` is green on a fresh DB **before** you start, so a pre-existing flake is not
      attributed to your change (`[[project_known_livedb_test_failures]]`, `[[project_ci_local_double_run_pollution]]`).
      Test DB is `twt-test-pg` on `:5433` (`[[project_live_db_test_gotchas]]`).

### Task 1 — The pure disclosure derivation (AC: 1, 2, 4)
- [x] NEW `packages/ui/src/contribution-disclosure/view-model.ts` — the types:
  - `ContributionDisclosureViewModel` = `{ instrument: 'suspension' | 'restoration_lock_in'; reasonLabelKey: string | null; whatItDoesKey: string; whatItDoesNotBuyKey: string; restorationPackage: RestorationPackageState }`
  - `RestorationPackageState` = `{ status: 'package_unavailable'; producer: 'story-10-24' } | { status: 'ok'; remaining: number; required: number }`
    — the `ok` arm is **declared and unreachable today** (D1); declaring it is what makes 10.24 a
    zero-change activation.
- [x] NEW `packages/ui/src/contribution-disclosure/i18n-keys.ts` — the key catalogue, mirroring the
      `member-status/i18n-keys.ts` shape. Reason-code labels reuse `moderationReasonLabelKey` from
      `member-status/i18n-keys.js` — **do not fork the reason-code label protocol.**
- [x] NEW `packages/ui/src/contribution-disclosure/presenter.ts` —
      `deriveContributionDisclosure(payload: MemberValidityPayloadDto): ContributionDisclosureViewModel | null`.
      **STRICTLY PURE**: no react/react-native, no I/O, no clock, no permission check. Same input →
      same output.
  - Suspension arm: **name the predicate for the RULE, not the transport** (AC1's triggering-condition
    note). Write a small `isUnderContributionPermittingSuspension(payload): boolean` and put the flag
    parsing *inside* it — `parseModerationFlag(payload.specialFlags)?.status === 'suspended'` is the
    current detection mechanism, not the requirement, and 10.17/10.20 will both touch this payload.
    A reader must be able to see the business rule without decoding a flag prefix.
  - **`terminated` returns `null`** — a terminated member is under moderation but is **not** permitted
    to contribute (10.17's predicate excludes them from the roster), so the rule's condition is false.
    This is exactly why the predicate is written against the rule: detecting on "has a moderation flag"
    would get this case wrong.
  - `restoration_lock_in` arm: detector reads the Story-10.23 overlay signal. **It does not exist
    today** → the arm never fires. **Do NOT read `payload.lockInStatus`** (D3). Leave a one-line
    comment naming 10.23 as the producer, in the `CONTRIBUTION_UNAVAILABLE` house style.
  - `restorationPackage` is **always** `{ status: 'package_unavailable', producer: 'story-10-24' }`
    today (D1/AC4).
- [x] NEW `packages/ui/src/contribution-disclosure/index.ts` barrel; wire `export * from
      './contribution-disclosure/index.js'` into `packages/ui/src/index.ts` alongside the two sibling
      presenters.
- [x] **Do not touch** `packages/ui/src/member-status/presenter.ts`. AC3 requires it byte-unchanged;
      a diff on that file is a review finding.

### Task 2 — The i18n copy, `en` + `hi` (AC: 1, 4, 5)
- [x] Add a `suspension_disclosure.*` family to **both** `packages/i18n/locales/en/contribution.json`
      and `packages/i18n/locales/hi/contribution.json`. Flat dotted keys (D5). At minimum:
      `title`, `what_it_does`, `what_it_does_not_buy`, `package_unavailable`, `reason_prefix`,
      plus the `restoration_lock_in` variants of the two substantive lines, plus `_a11y` companions
      where the sibling `upi_intent.*` keys carry them.
- [x] The `what_it_does_not_buy` string must carry the substance of AC1's sentence — *contributions
      during suspension restore standing but do not create beneficiary entitlement for deaths occurring
      during the suspension period.* Say it plainly; do not soften it into ambiguity.
- [x] **Read the copy against EVERY reason code in the registry, not just `fraud` (AC5).** The strings
      state the member's position factually and attribute cause only through the trustee-recorded
      reason label; they carry no accusatory construction of their own (*"because you violated…"*,
      *"due to your failure to…"*). Sanity-check the rendered sentence with
      `voluntary-pending-review` and `regulator-action` substituted — if it reads as an accusation
      there, the sentence is wrong.
- [x] Hindi is **authored**, not transliterated (tone-guide §3, Hindi-as-translation-layer prohibition).
      The same no-accusation test applies to the Hindi — a neutral English line can acquire blame in
      translation through verb choice.
- [x] Prefer zero-interpolation keys (D5 — `t()` throws on a missing param). If the reason code must be
      surfaced, resolve it via `moderationReasonLabelKey` and pass it explicitly, exactly as
      `app/(membership)/index.tsx:72-77` does.
- [x] Run `pnpm microcopy:check` and the `i18n-parity` gate locally.

### Task 3 — Render it on the payment surface (AC: 1, 6)
- [x] `apps/mobile/app/(contribution)/pay.tsx`: add `useMemberValidityQuery()` (D4) and
      `deriveContributionDisclosure` from `@twt/ui`.
- [x] NEW `apps/mobile/components/active-contribution/SuspensionDisclosure.tsx` — a module-level
      component (never render-nested, the `FieldRow` / `ChooseOtherAccountButton` convention at
      `pay.tsx:64-90`) taking the view-model + `t` and rendering the three parts.
- [x] **Placement is load-bearing (AC1).** Render it above the pay affordances on **every** branch a
      member can act from:
  - the account-choice list branch (`selectedRank === null`),
  - the chosen-account branch (above the banking-info panel and the `<UPIIntentButton>`).
  It need not render on the `attested` confirmation branch (the ask is already complete) or the
  loading branch. **It must not render only inside the `intent.available` branch** — a member in the
  manual/NEFT fallback is still being asked for money.
- [x] **Fail-soft on the validity read.** If `useMemberValidityQuery` is loading or errored, render the
      pay flow as it renders today — **do not block payment on the disclosure read**, and do not render
      a half-disclosure. Log the error to the console the way `pay.tsx` already does for its two reads.
      An un-suspended member must see **zero** change.
- [x] a11y (AC6): `accessibilityRole` + `accessibilityLiveRegion="polite"` on the block; Latin
      operational numerals for any count; meaning in the words, not the border colour.
- [x] The `package_unavailable` line routes to `<CallHelplineCTA>` (already imported in `pay.tsx`).

### Task 4 — Tests: the pure derivation AND the render layer (AC: 2, 3, 4)
- [x] NEW `packages/ui/tests/contribution-disclosure/presenter.test.ts` (pure unit, DB-free):
  - suspended payload → suspension arm, all three parts present;
  - **terminated payload → `null`** (not a suspension disclosure);
  - unmoderated payload → `null`;
  - `restorationPackage` is `package_unavailable` on **every** firing path (AC4) — assert the
    literal, so a future `0` fabrication fails;
  - **the D3 pin**: a payload with `lockInStatus.state === 'in-lock-in'` and **no** moderation flag
    → `null`. This is the test that stops the wrong shortcut from being reintroduced;
  - **the AC2 pin**: the `restoration_lock_in` arm's copy keys and view-model shape are asserted
    against a hand-constructed view-model, proving 10.23 needs no copy/render change to light it;
  - **the AC5 no-accusation pin**: the derivation emits **only** `moderationReasonLabelKey(code)` as
    its cause attribution and carries no code-specific branching — i.e. the view-model is identical
    for `fraud` and for `voluntary-pending-review` apart from that one key. A future "special copy for
    serious codes" is precisely the drift this pin catches.
- [x] NEW `apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts` — the **render fence** (D2).
      Follow `pay-screen-choice-render.test.ts` verbatim in structure (comment-stripped source read of
      `apps/mobile/app/(contribution)/pay.tsx` + the new component). Assert the **anatomy**, not just
      key presence:
  - `pay.tsx` calls `useMemberValidityQuery` and `deriveContributionDisclosure`;
  - `<SuspensionDisclosure` appears in the account-choice branch **and** the chosen-account branch —
    assert **≥2 occurrences**, so a single placement cannot pass;
  - the disclosure JSX appears **before** `<UPIIntentButton` in source order — the placement property
    AC1 requires, expressed as something a scan can prove (`indexOf` comparison);
  - the component resolves all three copy keys and routes them through `t(`;
  - **no literal member-facing English/Devanagari string literal** in the new component (the i18n
    fence the sibling scans apply);
  - the validity read is **not** awaited as a gate on the pay CTA (assert the pay branch does not
    early-return on `isLoading` of the validity query).
- [x] **Revert-sanity, and record the probe result** (`[[feedback_gate_scope_semantic_coverage]]`): delete the
      `<SuspensionDisclosure` render from `pay.tsx`, confirm the fence goes **red**, restore. A fence
      that stays green when the render is removed is the 10.10 failure with extra steps. Record the
      probe in the Dev Agent Record.

### Task 5 — Tone review + governance record (AC: 5)
- [x] Submit the new member-facing copy for the Story 2.2 tone review before merge. This is money copy
      addressed to a member under sanction — tone-guide §4 grief/dignity modulation applies.
- [x] Record in the Dev Agent Record: the D3 open question (join lock-in vs `VALID_STATES`, **not**
      resolved here); the D2 harness decision and its known limit; the D1 citation.
- [x] Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip
      `development_status[10-16-contribution-during-suspension-disclosure]` and add ONE combined
      `ready-for-dev → in-progress → review` ledger comment at the top
      (`[[project_sprint_status_ledger]]`).
- [x] **Note the gate discharge explicitly in the ledger entry**: *10.17's `[GATE]` precondition is now
      satisfied.* 10.17 is the next story and its reviewer must be able to see that without archaeology.

### Task 6 — Validate (AC: all)
- [x] `pnpm --filter @twt/ui test` · `pnpm --filter @twt/mobile test` · `pnpm --filter @twt/mobile typecheck`
      · `pnpm --filter @twt/mobile lint` (per-package cwd matters for eslint, `[[project_eslint_config_per_package_cwd]]`).
- [x] `pnpm microcopy:check` + the `i18n-parity` gate.
- [x] `pnpm ci:local` on `:5433`. Expect the documented-innocent `@twt/jobs` / `@twt/admin`
      concurrent-load flakes; confirm innocence by running a suspect spec in isolation
      (`[[project_known_livedb_test_failures]]`). **This story touches no DB, no route and no
      migration — a live-DB failure is almost certainly not yours.**
- [x] `git push` runs the full `ci:local` via a pre-push hook — that is the "hang," not credentials
      (`[[project_friction_budget_baseline_ratchet]]`). Branch off `main`; commit manually
      (`[[project_story_automator_ops]]`).

### Review Findings

- [x] [Review][Defer] Fail-soft design races against AC1's "before they can act" guarantee [apps/mobile/app/(contribution)/pay.tsx:120-121] — deferred, accepted trade-off. `disclosure` stays `null` while `useMemberValidityQuery` is in flight (no `isLoading` is destructured), and Task 3 explicitly forbids gating the pay CTA on this read — so on a slow network a member can tap Pay before the disclosure has ever rendered. **Reason for deferring:** Task 3 mandates fail-soft; race is an accepted trade-off. The only test touching this (`pay-screen-disclosure-render.test.ts:98-105`) asserts the absence of an `isLoading` destructure that was never introduced in the first place — a hollow guard, not a real regression check; worth tightening in a future pass even though the underlying race itself is accepted.
- [x] [Review][Defer] `en`/`hi` register mismatch on `suspension_disclosure.reason_line` [packages/i18n/locales/{en,hi}/contribution.json] — deferred, covered by pending tone review. English is a complete sentence ("The reason on record is {reason}."); Hindi is a colon-terminated fragment ("अभिलेख में दर्ज कारण: {reason}") with no closing punctuation. **Reason for deferring:** covered by the pending Story 2.2 tone review (already flagged un-attested in the Dev Agent Record).
- [x] [Review][Patch] Termination guard is not enforced on the `restoration_lock_in` arm [packages/ui/src/contribution-disclosure/presenter.ts:97-150] — fixed. `isUnderRestorationDisciplineLockIn` now short-circuits to `false` when `parseModerationFlag` reports `terminated`, mirroring `isUnderContributionPermittingSuspension`'s exclusion. Pinned by a new presenter test: a payload carrying both `terminated_per_fraud` and `restoration_lock_in` now returns `null` from `deriveContributionDisclosure`.
- [x] [Review][Patch] Accessibility container doesn't actually suppress child announcements [apps/mobile/components/active-contribution/SuspensionDisclosure.tsx:49-107] — fixed. Added `accessible` to the outer `YStack` alongside `accessibilityLabel`, so the subtree actually collapses into one announced element as the component's own comment already claimed. Pinned by a new render-fence test; revert-sanity probe confirmed it goes red on removal.
- [x] [Review][Patch] Render fence doesn't verify the i18n namespace argument survives [apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts] — fixed. Added a paren-balancing `extractBalancedCalls` helper and a test requiring every `t(...)` call (except the deliberate D5 reason-label lookup) to end with the `NS` argument. Revert-sanity probe confirmed it goes red when `NS` is dropped from one call.
- [x] [Review][Patch] "No literal string" fence is too narrow to catch real copy leaks [apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts:144-148] — fixed. Added a second, broader regex alongside the original three-word-cadence check, disallowing any run of Latin letters/punctuation between `>` and `<` that isn't a `{...}` expression. Revert-sanity probe confirmed it catches a lowercase-starting literal the original regex would have missed.
- [x] [Review][Patch] `restorationPackage`'s `ok` arm has zero test coverage at any layer [packages/ui/src/contribution-disclosure/view-model.ts; apps/mobile/components/active-contribution/SuspensionDisclosure.tsx:95-106] — fixed. Added a render-fence test asserting the `ok` branch's anatomy: `RESTORATION_PACKAGE_REMAINING_KEY` resolved through `t(`, both counts wrapped in `String(...)`, and the `$tabular` numeral face. Revert-sanity probe confirmed it goes red when the `String()` wrap is removed.
- [x] [Review][Defer] Missing-catalog-entry crash risk on `moderationReasonLabelKey` [packages/ui/src/contribution-disclosure/presenter.ts:132-133; apps/mobile/components/active-contribution/SuspensionDisclosure.tsx:73] — deferred, pre-existing. If a reason code has no matching `memberStatus.moderationReason.<code>` locale entry, `t()` throws at render, crashing the pay screen for that member. This risk is inherited unchanged from the shipped Story 10.10 pattern (`app/(membership)/index.tsx:72-77` performs the identical lookup) — Story 10.16 reuses it exactly as instructed by D5 and does not introduce it.

---

## Dev Notes

### The three files you must read before writing a line

| File | Why | What must not change |
|---|---|---|
| `apps/mobile/app/(contribution)/pay.tsx` | The surface. 27KB, six render branches, two async reads (`memberNomineeAccounts`, `memberContributionIntent`), a 9.9 donor-choice flow, an 8.5 failure coach, an 8.12 debug-gated AppState listener. | Every existing branch's behaviour for an **unmoderated** member. Your change is additive: one hook, one component, two render sites. |
| `packages/ui/src/member-status/presenter.ts` | `deriveHeadlineState` at `:68-95` is what AC3 pins. `parseModerationFlag` is the flag protocol you reuse. | **Byte-unchanged.** Read it; do not edit it. |
| `apps/mobile/app/(membership)/index.tsx` | The 10.10 moderation-notice render — the pattern for resolving a KEY + `{reason}` at the render layer, and the file whose bug AC3 exists to prevent recurring. | Untouched. AC1 says the disclosure is *not* a status-panel concern. |

### Current state of the surface (what `/pay` does today)

`pay.tsx` renders, in order: `attested` confirmation → loading → accounts-load-failed →
`!accounts.available` (unassigned / not-collected) → account-choice list (`selectedRank === null`) →
the chosen-account panel with the banking info, the intent, the `<UPIIntentButton>`, the coach, and the
UTR-paste step. It reads **nothing** about member standing. Adding the validity read is the only new
data dependency this story introduces.

**A suspended member cannot reach the actionable branches today** — `is_valid: false` keeps them off
the roster, so `memberNomineeAccounts()` returns `{ available: false, reason: 'unassigned' }`. That
is why the render fence and the pure unit tests carry this story's proof: there is no live path to
exercise until 10.17 lands. **Build it correctly against the unreachable state.**

### The data path, end to end

```
member_moderation_actions (10.10)
  → validity-service overlay resolution (service.ts, same pinned instant as getMemberStateAt)
  → payload.ts moderationSpecialFlag() → 'suspended_per_<reason_code>'
  → appended AFTER clause-order flags (deterministic; the payload hash is order-sensitive)
  → redaction.ts: NOT in STATE_TRUSTEE_ONLY_FLAGS → survives the member self-read
  → GET /api/v1/member/validity → MemberValidityResponse.validity.specialFlags[]
  → useMemberValidityQuery (TanStack key ['member','validity'])
  → deriveContributionDisclosure()  ← YOU BUILD THIS
  → <SuspensionDisclosure> on pay.tsx  ← AND THIS
```

Verified against source, not assumed: `redaction.ts:28` is
`STATE_TRUSTEE_ONLY_FLAGS = new Set([CONCEALMENT_REVIEW_FLAG])` — moderation flags are **not** in it,
and `payload.ts:96-103` records that as deliberate.

### Anti-patterns — the seven ways this story goes wrong

1. **Deriving the restoration count.** D1-C, rejected. `listMemberContributionHistory` is not a viable
   source (anchors on `utr-attested`, caps at 500 rows). Any number you produce here is outside the
   rule engine.
2. **Rendering `0` remaining, or omitting the count line entirely.** `package_unavailable ≠ 0` and
   `≠ absent`. On a disclosure surface, a silent omission reads as "there is nothing more to know."
3. **Falling back to `lockInStatus.state === 'in-lock-in'` for AC2.** D3. That member **is** covered;
   the disclosure would be false.
4. **Putting the disclosure in `<MemberStatusPanel>`.** AC1 forbids it in one clause. The member
   deciding whether to pay is on `/pay`, not on the panel.
5. **Asserting only the view-model.** AC3 exists because that is precisely how 10.10 shipped prose
   that reached nobody.
6. **Writing the condition as `has a suspended_per_ flag`.** AC1's rule is *"under a suspension that
   still permits contribution."* The flag is today's detection mechanism. Naming the predicate after
   the transport is how a rule silently becomes an implementation detail — and it gets `terminated`
   wrong, which has a flag and is not permitted to contribute.
7. **Letting the copy accuse.** AC5. The reason code is the only cause the copy may attribute, and it
   is often procedural. *"Because you violated…"* reads as a finding of misconduct the trustee may
   never have recorded.

### Reuse map — do not reinvent

| Need | Already exists | Path |
|---|---|---|
| Parse the moderation flag | `parseModerationFlag` | `packages/ui/src/member-status/i18n-keys.ts:97` |
| Reason-code → label key | `moderationReasonLabelKey` | same file, `:81` |
| Member-self validity read | `useMemberValidityQuery` | `apps/mobile/components/member-status/useMemberValidityQuery.ts` |
| SDK method | `memberAuth.memberValidity()` | `packages/api-client/src/index.ts:754` |
| Helpline CTA | `<CallHelplineCTA>` | already imported in `pay.tsx` |
| Pure-presenter package shape | `status-pill/`, `pool-progress/` | `packages/ui/src/` |
| Render-fence test shape | `pay-screen-choice-render.test.ts` | `apps/mobile/tests/unit/` |
| Degraded-state house style | `CONTRIBUTION_UNAVAILABLE`, `ContributionHistoryUnavailable` | `validity-service/{payload,types}.ts` |

### Testing standards

- `@twt/ui` tests are **pure Vitest, DB-free**, under `packages/ui/tests/<module>/`.
- `apps/mobile` tests are **pure Vitest, node env, `.ts` only**, under `apps/mobile/tests/unit/`.
  Comment-stripped source scans of `.tsx` render files (the six-file convention). `vitest.config.ts`
  `include` is `tests/unit/**/*.test.ts` — a `.tsx` test will be silently skipped.
- No new DB-gated spec is needed or wanted; this story adds no DB surface.

### Project Structure Notes

- New: `packages/ui/src/contribution-disclosure/{presenter,view-model,i18n-keys,index}.ts`;
  `packages/ui/tests/contribution-disclosure/presenter.test.ts`;
  `apps/mobile/components/active-contribution/SuspensionDisclosure.tsx`;
  `apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts`.
- Modified: `packages/ui/src/index.ts` (one export line); `apps/mobile/app/(contribution)/pay.tsx`;
  `packages/i18n/locales/{en,hi}/contribution.json`.
- Unchanged, and asserted so: `packages/ui/src/member-status/presenter.ts`;
  `apps/mobile/app/(membership)/index.tsx`; every contract in `packages/contracts`; `openapi/v1.yaml`;
  every migration; `PERMISSION_CATALOG_VERSION` (stays **28**).
- `packages/ui` depends only on `@twt/contracts` — keep it that way. Do **not** import `@twt/domain`
  (`[[project_contracts_domain_bundle_boundary]]`: `@twt/domain`'s barrels drag `pg` into the Metro
  bundle).

### Latest technical notes

No library upgrades are needed or wanted. The stack this story touches is pinned and current:
React 19.2 / React Native 0.83.6 / Expo SDK 55 / Tamagui 2.1 / TanStack Query 5.101 / Vitest 3
(`@twt/ui` is on Vitest 2.1.8 — leave it; a version bump is not this story's business). The Fabric
`FlatList` empty→populated crash (`[[project_fabric_flatlist_empty_populated_crash]]`) does **not**
apply — the disclosure is a plain `YStack`, not a virtualized list.

---

## Escalations

**Escalation 1 — the join-lock-in coverage question (D3's open question).** `VALID_STATES` treats the
join `lock-in` state as covered while FR-8 describes it as a general-death lock-in. Not resolved here:
the fix would change `deriveIsValid` → every validity payload hash → Story 4.8 cache epochs + the 7.4
assignment version pin. Route to `bmad-correct-course` if it turns out to be a real defect rather than
a docstring imprecision.

**Escalation 2 — the mobile mount harness (the reasoning behind D2(b)).** `apps/mobile` has **no
component-mount capability**: `vitest.config.ts` is `environment: 'node'` with
`include: ['tests/unit/**/*.test.ts']` — `.ts` only, so a `.tsx` mount test is not even collected —
and there is no `@testing-library/react-native` or `react-test-renderer` dependency. Six shipped
stories have now reached for a render assertion and used a source scan instead
(`status-pill-render`, `pay-screen-choice-render`, `self-verify-surface-render`, `banner-host-render`,
`helpdesk-screens-render`, `helpline-cta-presence`). That is a converging signal, not a one-off.

Standing the harness up means a new dependency, a vitest-config change, jsdom/RN-preset wiring, and
Tamagui + expo-router + TanStack Query mocking — disproportionate to a `[SURFACE]` story, and it would
land untested infrastructure in the same PR as the disclosure that infrastructure is meant to protect.
**It deserves its own story** (`[[feedback_no_premature_package]]` reasoning, applied to test
infrastructure). Until then the fence stands.

**Escalation 3 — the disclosure is currently unreachable by design.** Until 10.17 ships, no suspended
member can reach `/pay`. This story's evidence is therefore entirely test-level. That is correct and
intended (it is what `[GATE]` means), but it must be recorded openly rather than implied as validated
behaviour (`[[feedback_record_unattested_no_backfill]]`). **The first real-path validation of this
disclosure happens during 10.17** — 10.17's dev agent should be told to confirm it renders live.

---

## References

- `_bmad-output/planning-artifacts/epics.md:3660-3681` — Story 10.16 AC + the `[GATE]` on 10.17
- `_bmad-output/planning-artifacts/epics.md:3683-3713` — Story 10.17 (the story this gates)
- `_bmad-output/planning-artifacts/epics.md:3867-3890` — Story 10.23 (AC2's actual instrument; the
  `lock_in_days_at_join` non-reuse rule at `:3885`; the pointer back here at `:3890`)
- `_bmad-output/planning-artifacts/epics.md:3905-3934` — Story 10.24 (AC4's missing producer)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:173-194` — the D4 proposal
- `…sprint-change-proposal-2026-08-04.md:92` — *"D4 must ship with or before D3"*
- `_bmad-output/implementation-artifacts/10-10-…md:468-473` — the second-review-pass finding AC3 encodes
- `_bmad-output/implementation-artifacts/10-11-…md:141-150, 303` — D1-B, verbatim and ratified
- `docs/tone-guide.md` §3 (prohibited frames), §4 (grief-context modulation)
- `_bmad-output/planning-artifacts/ux-design-specification.md:151` — the no-shortfall discipline
- `_bmad-output/planning-artifacts/ux-design-specification.md:1890-1896` — `<MemberStatusPanel>` spec
- `packages/ui/src/member-status/presenter.ts:68-95` — `deriveHeadlineState` (AC3's pin)
- `packages/ui/src/member-status/i18n-keys.ts:75-113` — the moderation flag protocol
- `packages/validity-service/src/payload.ts:56-60, 96-113, 281-300` — `VALID_STATES`,
  `moderationSpecialFlag`, `assemblePayload`
- `packages/validity-service/src/redaction.ts:28` — moderation flags are member-visible
- `packages/validity-service/src/types.ts:26-33, 62-66` — `LockInStatusPayload`,
  `ContributionHistoryUnavailable`
- `packages/domain/seed/niyamavali-v1-clauses.sql:232-281` — the R7 `restoration` params, no consumer
- `apps/mobile/app/(contribution)/pay.tsx` — the surface
- `apps/mobile/tests/unit/pay-screen-choice-render.test.ts` — the render-fence pattern
- `apps/mobile/vitest.config.ts` — `environment: 'node'`, `tests/unit/**/*.test.ts`
- `.github/workflows/ci.yml:214` (`i18n-parity`), `:389` (`microcopy`)

---

## Dev Agent Record

### Agent Model Used

claude-opus-5 (bmad-dev-story workflow)

### Debug Log References

**Pre-flight baseline (Task 0) — `pnpm ci:local` was RED before any edit.**
`@twt/domain tests/db.test.ts > createDb > builds a pool with defaults` timed out at 5000 ms under
concurrent load (33/37 tasks successful; the only failure). **Confirmed innocent** by running the
suspect spec in isolation per `[[project_known_livedb_test_failures]]`: **3 tests passed in 477 ms** —
roughly 10× inside the timeout. This is the documented `ci:local` concurrency-oversubscription flake
class (`[[project_ci_local_concurrency_oversubscription]]`), it predates this story, and this story
touches no DB, no route and no migration. Recorded here so it is not attributed to this change.

**Final validation — two runs, and the difference between them is the whole story.**

- **`pnpm ci:local` (no `DATABASE_URL`) — PASSED, 29/29 green**, including `lint`, `typecheck`,
  `build`, `test (unit)`, `i18n-parity`, `microcopy`, and every domain/state invariant gate. The
  `@twt/domain db.test.ts` spec that failed at baseline passed in this run.
- **`DATABASE_URL=…:5433 pnpm ci:local` — FAILED 2 jobs** (`test (unit)`, `integration-tests`).
  **Both confirmed innocent; neither is in a file this story touches.**
  1. `@twt/admin tests/moderation-section.test.tsx` — `Test timed out in 5000ms`. **In isolation:
     1 test passed in 175 ms** (~28× inside the limit). The job reported `environment 111.81s` /
     `setup 21.36s`, i.e. heavy concurrent load. Same flake class as the baseline failure.
  2. `@twt/api tests/integration/member-moderation/member-moderation.spec.ts` — `AC4: an audit line is
     written per action` failed with `expected [] to include 'member_moderation.suspended'`.
     **In isolation: all 22 tests passed (1929 ms).** The mechanism is named by the test's own comment:
     *"The audit write is fire-and-forget (it must never block the request path); give it a turn"* —
     followed by a fixed `setTimeout(200)`. Under concurrent load the spec ran **6463 ms vs 1929 ms
     isolated (3.3×)**, so 200 ms was not enough for the fire-and-forget audit write to land and the
     read came back empty. A load-sensitive race in a pre-existing spec, not a regression.

  *I initially suspected `[[project_ci_local_double_run_pollution]]` and checked rather than assumed:
  the integration specs ran in the `integration-tests` job only (68 collected there, **0** in the unit
  job), so the double-run mechanism is NOT what happened here. The cause is concurrent-load timing in
  both cases.* This story adds no DB surface, no route, no migration and no audit path.

**Revert-sanity probe (Task 4, `[[feedback_gate_scope_semantic_coverage]]`) — the fence has teeth, and
the probe earned its keep.** Deleting both `<SuspensionDisclosure … />` render sites from `pay.tsx`
turned the fence **red (3 failures)**. But the probe also exposed that three `lastIndexOf`-based
placement assertions were passing **VACUOUSLY**: `lastIndexOf` returns `-1` when the render is absent,
and `-1 < anchorIndex` is trivially true, so those specs would have stayed green on a deleted render —
the precise 10.10 failure mode this fence exists to prevent, reproduced inside the fence itself. Added
explicit `expect(idx).toBeGreaterThan(-1)` guards; the probe now turns the fence red with **5**
failures. Restored, re-verified green (18 specs). *A revert-sanity probe that only confirms what you
expected is worth less than one that finds this.*

**Test-anchor correction.** The first draft of the "disclosure above the banking-info panel" spec
anchored on `selectedAccount.accountHolderName`, which first occurs ~5 KB earlier inside the
`selectedAccountAllFieldsUnavailable` const computation, not in the panel JSX. The fence caught it;
re-anchored on the panel's `'upi_intent.paying_to_label'` render.

### Completion Notes List

- **AC1 — the disclosure renders on the payment surface, saying all three things.** New pure
  `deriveContributionDisclosure` in `@twt/ui`; rendered on `pay.tsx` at **two** sites (the
  account-choice branch and the chosen-account branch), both **above** the pay affordances and
  **outside** the `intent.available` sub-branch, so the manual/NEFT payer is owed and gets the same
  disclosure. Every string routes through `@twt/i18n` with `en` + `hi` parity; the `i18n-parity` gate
  passes.
- **The predicate is named for the RULE, not the transport (AC1's triggering-condition note).**
  `isUnderContributionPermittingSuspension(payload)` carries the business rule; `parseModerationFlag`
  is called *inside* it as today's detection mechanism. `terminated` therefore returns `null` —
  a terminated member is moderated but not permitted to contribute, and a detector spelled "has a
  moderation flag" would get that wrong. Pinned by a dedicated spec.
- **AC2 — discriminated union on `instrument`, lock-in arm structurally complete and dark.** The
  `restoration_lock_in` detector reads a Story-10.23 overlay signal on `specialFlags` — which is the
  substrate's established extension point for a member-visible standing with no dedicated DTO field
  (exactly how 10.10's moderation standing arrived on this `.strict()` payload). Nothing emits it
  today, so the arm is genuinely not in force. **Story 10.23 owns the wire name; if it ships a
  different one, the single `RESTORATION_LOCK_IN_FLAG` constant is the only line that changes** — the
  copy keys, the view-model shape and `pay.tsx` do not. The AC2 pin asserts the full lock-in
  view-model against the shipped key catalogue, so 10.23 is a zero-change activation.
- **AC3 — headline logic byte-unchanged, verified.** `git diff` confirms
  `packages/ui/src/member-status/presenter.ts` and `apps/mobile/app/(membership)/index.tsx` are both
  **UNCHANGED**. The derivation lives in its own sibling module (D2a) precisely to make that
  verifiable. The new combination is covered at the **render layer** by the source-scan fence, not
  only by the view-model.
- **AC4 — the count is honestly absent.** `restorationPackage` is **always**
  `{ status: 'package_unavailable', producer: 'story-10-24' }` today, asserted as a **literal** so a
  future `0` fabrication fails. (a) and (b) render **outside** that branch — a fence spec pins their
  source position ahead of it, so the count's absence can never suppress the load-bearing halves. The
  `ok` arm and its copy key are **declared and unreachable**, which is what makes 10.24 a zero-change
  activation. **D1-C was not implemented and was not attempted.**
- **AC5 — no accusation, verified against every reason code.** Cause is attributed *only* through
  `moderationReasonLabelKey`. I read the rendered sentence with the **procedural** codes substituted:
  *"The reason on record is a pause you requested, pending review."* / *"…a regulatory or statutory
  action."* — factual in both locales, no fault assigned. Hindi is authored (*"अभिलेख में दर्ज कारण:
  {reason}"*), not transliterated, and carries no blame-bearing verb. A pin asserts the view-model is
  **byte-identical across six reason codes** apart from `reasonLabelKey`, so "special copy for the
  serious codes" cannot be added silently. `pnpm microcopy:check` passes.
- **AC6 — accessibility.** `accessibilityRole="summary"` + `accessibilityLiveRegion="polite"` + a
  full-prose `accessibilityLabel` on the block (one label, rather than making a screen-reader user
  stitch four `<Text>` nodes together). Deliberately **not** colour-coded: no `$red10`/`$red11`, no
  `role="alert"` — a disclosure is not an error, and AC5 forbids framing the standing as a failing.
  Counts use the `$tabular` (Latin operational numeral) face. Fence specs pin all of this.
- **Fail-soft, deliberately.** The validity read never gates payment: on loading or error,
  `disclosure` is `null` and the screen renders exactly as today. An un-suspended member sees **zero**
  change. Fence specs assert no early-return on the validity query.

**Deviations from the story spec, both additive and deliberate:**

1. **The view-model carries `titleKey` and `a11yLabelKey`** beyond the five fields Task 1 enumerates.
   Both are required by ACs the five fields cannot serve: AC2 demands a *distinct copy key set per
   arm* (a hard-coded title in the component would break the zero-change 10.23 activation), and AC6
   demands an explicit announcement. No other field was added — in particular there is deliberately
   **no** `severity`/`tone`/`colorToken` field, since that is how the AC5/AC6 "meaning in the words,
   not the border" discipline would erode.
2. **`suspension_disclosure.package_remaining` is declared in both locales now**, alongside the
   unreachable `ok` arm it renders. AC4 requires zero copy changes for (a)/(b) when the producer
   lands; declaring the count key too makes 10.24 a pure data change. It is unreachable today, so the
   `t()`-throws-on-missing-param risk (D5) does not apply to it.

**Recorded open question (D3 / Escalation 1) — NOT resolved here, by instruction.** FR-8 describes the
join lock-in as a *general-death* lock-in, yet `VALID_STATES` (`validity-service/payload.ts:56-60`) is
`['lock-in','active','active-in-grace']`, treating `'lock-in'` as **covered**. Either `isValid`'s
docstring or `VALID_STATES` is imprecise. Resolving it would change `deriveIsValid` → **every validity
payload hash** → Story 4.8 cache epochs + the Story 7.4 assignment version pin. `VALID_STATES` was
**not touched**. Route to `bmad-correct-course` if it proves a real defect rather than a docstring
imprecision.

**D2 harness decision and its known limit.** The render evidence is a comment-stripped **source scan**
(`pay-screen-disclosure-render.test.ts`), the repo's seventh such fence and the direct sibling of
`pay-screen-choice-render.test.ts`. `apps/mobile` has **no component-mount capability** —
`vitest.config.ts` is `environment: 'node'` with `include: ['tests/unit/**/*.test.ts']` (`.ts` only,
so a `.tsx` mount test is not even collected) and there is no `@testing-library/react-native` /
`react-test-renderer` dependency. **Known limit: a source scan cannot prove visual placement or
runtime reachability**, so the fence scans for the *anatomy* that encodes those properties (≥2 render
sites, source-order precedence over `<UPIIntentButton>`, placement outside the `intent.available`
sub-branch, no pay-CTA gating). Standing up a mount harness remains **Escalation 2**, unresolved and
owed its own story.

**Un-attested evidence, recorded openly (Escalation 3 + Task 5, per
`[[feedback_record_unattested_no_backfill]]`) — two items:**

1. **This disclosure has never rendered on a live path, by design.** Until Story 10.17 ships,
   `is_valid: false` keeps a suspended member off the roster, so `/pay` returns
   `{ available: false, reason: 'unassigned' }` and the disclosure's branches are unreachable. **All
   evidence for this story is test-level.** That is what `[GATE]` means, not a gap — but it is
   *not* validated runtime behaviour and must not be read as such. **The first real-path validation
   happens during Story 10.17; its dev agent must be told to confirm the disclosure renders live.**
2. **The Story 2.2 tone review is SUBMITTED, NOT SIGNED OFF.** The copy is catalog copy with no
   runtime tone-review gate on this surface (the 10.10 precedent), so there is no endpoint to record
   a sign-off against. I authored it against `docs/tone-guide.md` §3/§4 and verified the automatable
   floor (`pnpm microcopy:check` passes), but **a non-author human reviewer has not signed off**, and
   I cannot self-attest that. This is member-facing money copy addressed to someone under sanction —
   §4 grief/dignity modulation binds. **Owed before merge; carried as un-attested, not backfilled.**

### File List

**New**
- `packages/ui/src/contribution-disclosure/view-model.ts`
- `packages/ui/src/contribution-disclosure/i18n-keys.ts`
- `packages/ui/src/contribution-disclosure/presenter.ts`
- `packages/ui/src/contribution-disclosure/index.ts`
- `packages/ui/tests/contribution-disclosure/presenter.test.ts`
- `apps/mobile/components/active-contribution/SuspensionDisclosure.tsx`
- `apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts`

**Modified**
- `packages/ui/src/index.ts` (one export block)
- `apps/mobile/app/(contribution)/pay.tsx`
- `packages/i18n/locales/en/contribution.json` (+12 keys)
- `packages/i18n/locales/hi/contribution.json` (+12 keys)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-16-contribution-during-suspension-disclosure.md`

**Verified unchanged (asserted, not assumed)**
- `packages/ui/src/member-status/presenter.ts` — AC3's byte-unchanged pin
- `apps/mobile/app/(membership)/index.tsx` — the panel is not this story's concern
- `packages/contracts/**`, `openapi/v1.yaml`, every migration, `PERMISSION_CATALOG_VERSION` (stays 28)

## Change Log

| Date | Change |
|---|---|
| 2026-08-04 | Story 10.16 implemented (bmad-dev-story). NEW `packages/ui/src/contribution-disclosure/` pure presenter (the `status-pill`/`pool-progress` sibling shape): rule-named suspension predicate with the flag parsing behind it, `terminated → null`, structurally-complete-but-dark `restoration_lock_in` arm reading a 10.23 overlay signal (explicitly NOT `lockInStatus`, D3), and an always-`package_unavailable` restoration count naming Story 10.24 (D1-B; D1-C not attempted). NEW `<SuspensionDisclosure>` rendered at two sites on `pay.tsx` above the pay affordances and outside the `intent.available` sub-branch, sourced fail-soft from the shipped `useMemberValidityQuery` (D4 — no contract change, no new endpoint). +12 bilingual `suspension_disclosure.*` keys (Hindi authored; no accusatory construction, verified against the procedural reason codes). Render fence + 20 pure specs; revert-sanity probe run and it caught 3 vacuous `lastIndexOf` assertions, since hardened. `deriveHeadlineState` byte-unchanged (AC3). Owed before merge: the Story 2.2 non-author tone sign-off. `[GATE]` for Story 10.17 discharged. |
