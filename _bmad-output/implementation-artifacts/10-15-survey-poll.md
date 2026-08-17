---
baseline_commit: 5b469b36b79ca6670fbcf788cf84c8beddbb34eb
---

# Story 10.15: Survey/Poll `[SURFACE]`

Status: review

Epic: 10 · Story: 15 · Key: `10-15-survey-poll`
Authored: 2026-08-17 · Baseline: `main` @ `5b469b3` (clean working tree, fetched, `HEAD == origin/main`)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin or trustee gathering member input,
I want a survey/poll surface to author questions, scope the audience, and collect responses,
so that member feedback flows into product and policy decisions structurally rather than through anecdote — and so that it is unmistakable to everyone that a survey **informs** a decision and never **makes** one.

---

> ## ⚠ READ FIRST — TWO THINGS THAT ARE NOT NEGOTIABLE
>
> **1. A SURVEY IS ADVISORY. IT HAS NO GOVERNANCE EFFECT.** See *Load-Bearing Decision 1*. The word
> **"quorum"** does not appear in this story's code, columns, DTOs, admin copy, or member copy —
> because in this project that word already means something else and something binding.
>
> **2. FR-58 IS `[v1-S]` AND IS MISSING FROM THE PRD's §6.1 FR ENUMERATION.** See *Question Zero*.
> The disposition is **PROCEED** — the evidence is materially different from the FR-48 case that was
> deferred one commit ago — but you must read the reasoning before you assume the scope is settled.

---

## Question Zero — is FR-58 in v1? (verified live at `5b469b3`)

The immediately preceding story, **10.14, was DEFERRED TO v2** (`Decision 2026-08-17-126`, commit
`5b469b3`) on a Question-Zero finding: FR-48 was absent from `prd.md:1325`'s §4.7 v1 enumeration.
**The same enumeration also omits FR-58.** Do not discover this halfway through Task 6.

`prd.md:1325` (§6.1 In Scope, the Admin-UI bullet) enumerates:

> `(§4.7, FRs 44–47, 49–57, 58A, 58B, 58C)`

**FR-48 and FR-58 are the only two §4.7 FRs missing from that list.** Both are `[v1-S]`
(`review-rubric.md:62` enumerates the twelve `[v1-S]` FRs; FR-58 is one of them).

**The dispositions differ, and the difference is the whole answer:**

| | FR-48 (Story 10.14) | FR-58 (this story) |
|---|---|---|
| In `prd.md:1325` §6.1 enumeration | ✗ absent | ✗ absent |
| In §6.2 **Out of Scope for MVP** | ✅ **named explicitly** — *"Permission delegation with date range — `[v1-S]` (FR-48); may slip to v2 depending on cadence"* (`prd.md:1350`) | ⛔ **NOT named.** Verified: `grep -n "FR-58" prd.md` returns no §6.2 hit; the §6.2 list has no survey/poll entry |
| Substrate at baseline | none — would be the **first production write into the authorization substrate** | none, but the substrate it needs (mutable-status content table, audience predicate, tone gate, fan-out worker) is **all built and proven twice** (10.5, 10.9) |
| Governance weight | authority-bearing; six blocking Trustee questions | advisory content; **zero** questions requiring a ruling, provided LBD-1 holds |

⇒ **PROCEED.** FR-48 was carried in the PRD's own "may slip" register; FR-58 was not. An FR that is
absent from an enumeration but absent from the cut register too is an **enumeration gap**, not a
deferral, and the epic carries Story 10.15 with a full AC block. **Escalation 1** raises the register
correction — it is a PM bookkeeping fix, **not** a gate on this story.

⛔ **Do not author a Trustee Panel routing note for this story.** 10.13 and 10.14 needed one because
the real question was upstream of the surface. Here the conservative posture (LBD-1) requires no
ruling — it *declines* an authority rather than claiming one. A routing note that asks permission to
build something advisory manufactures a governance question where none exists.

---

## Scope Boundary (read before writing a line — prevents over-build AND under-build)

**10.15 is the THIRD `[SURFACE]` in the Epic-10 "authored member-facing copy" family.** Its shape is
**10.5's skeleton (it fans out) wearing 10.9's read-time window and audience predicate**, plus one
thing neither had: **a member WRITE that returns data the admin reads back**.

**Read these two story files before starting** — 10.15 reuses their shape almost verbatim:
- `_bmad-output/implementation-artifacts/10-9-banner-popup-manager-valid-from-until-dismiss.md` — the closer sibling. Mutable status, read-time window, audience predicate, per-member row, member route pattern.
- `_bmad-output/implementation-artifacts/10-5-news-blog-dual-surface-*.md` — the fan-out half: pg-boss enqueuer in `apps/api`, worker + `fanOutAlert` in `apps/jobs`.

### What 10.15 takes from 10.9 unchanged (do NOT redesign these)

1. **Mutable `status` column, NOT event-derived-state.** No projector, no `app.*_state_writer` DB trigger, no CI state-invariant gate, no `events_log` stream, no `packages/events` registration. Accountability is the Story 1.10 hash-chain audit line on every create/edit/publish/close.
2. **`valid_from`/`valid_until` are a pure READ-TIME window.** No sweep, no expiry job, no transition at open or close-by-clock. `valid_from` INCLUSIVE, `valid_until` EXCLUSIVE. Both NOT NULL, `CHECK (valid_until > valid_from)`.
3. **The display state is DERIVED, never stored** ([[project_yogdaan_status_derivation_convention]]).
4. **The audience is a read-time PREDICATE**, injected with a pre-resolved `MemberGeoNode` — never a `Db` handle inside a `.filter()`.
5. **Member routes touch NO RBAC key**, open their OWN `openScopeTx`, and answer a foreign `:pariwarId` with **404, never 403**.

### What 10.15 has that 10.9 did NOT — build these

1. **A fan-out.** The epic AC is explicit: *"member receives notification via Story 5.1"*. Banners were in-app-only; a survey is announced. → a `SURVEY_PUBLISH` pg-boss queue, an `apps/api` send-only enqueuer, and an `apps/jobs` worker. ⚠ **The fan-out lives in `apps/jobs`, never in `apps/api`** — the 10.4 member-Tier-1-crypto-boundary lesson ([[project_helpdesk_responder_surface_104]]).
2. **A member WRITE with a payload** (the response), not a bare acknowledgement. Turnstile + `Idempotency-Key` + per-member rate limit.
3. **A tenant-authored bounded question vocabulary** in JSONB — the 10.12 `custom-fields` discipline, scoped down hard.
4. **An aggregate read** that must not leak who said what.

### In scope / out of scope

| In scope (10.15) | Out of scope → owning story / seam |
|---|---|
| **`surveys` data model** — NEW migration **`0109`** (0108 is the highest at baseline; 10.14's planned 0109 was never written — it deferred), NEW `packages/domain/src/schema/surveys.ts`. Columns per AC1. | A survey **template library** / reusable question banks — no requirement, no FR. Documented non-goal. |
| **`survey_responses` data model** (same migration). Composite PK `(pariwar_id, survey_id, member_id)` — **one response per member, structurally**. | Multi-submission / editable-after-submit responses → LBD-6 rules them out for v1 with the reason. |
| **Domain module** `packages/domain/src/surveys/`: `createDraft` / `updateSurvey` / `publish` (tone-gated) / `close`; pure `nextSurveyStatus`, pure `deriveSurveyDisplayState`, pure `validateQuestionnaire`, pure `validateAnswers`, pure `aggregateResponses`, pure `isMemberInSurveyAudience`. Reads: `listSurveysForPariwar` (admin, paginated, **`clampLimit`**), `getSurvey`, `listOpenSurveysForMember`, `getSurveyAggregate`, `listFreeTextAnswers`. Write: `recordResponse`. | A general "forms" primitive → **no premature package** ([[project_no_premature_package]]). This is survey-specific until a second consumer exists. |
| **Bounded question vocabulary** (LBD-4): exactly three types — `single_choice`, `multi_choice`, `free_text`. JSONB `questions` array on the survey row, snake_case inner keys, hard caps. | Branching/skip logic, conditional questions, scoring, weights, an expression language → **explicitly forbidden**, not deferred (LBD-4). |
| **The questionnaire is IMMUTABLE after publish** (LBD-5). Editing questions on a published survey is a typed **409**. To change the questions, close it and publish a new one. | An amend-with-diff flow (the Niyamavali 2.3/2.4 shape) → not in AC; a survey is not a rule. |
| **`response_threshold`** — FR-58's *"optional quorum threshold"*, nullable integer, **renamed** (LBD-1). Purely informational: the aggregate derives `threshold_met`. It gates NOTHING. | Anything that makes a survey result binding, gating, or self-executing → **forbidden** (LBD-1); would require a Trustee ruling and does not have one. |
| **Audience resolution** — `isMemberInSurveyAudience`, a direct port of `isMemberInBannerAudience` (`packages/domain/src/banners/audience.ts`). `members-all` → true; **`public` → FALSE** (⚠ opposite polarity to 10.9 — see LBD-7); `state` → resolves via `memberGeo.resolveMemberGeoNode`; `role`/`cohort` → false + logged seam note. | A member `role`/`cohort` attribute → still **NOT ADDRESSED, no owner** (Decision `2026-08-13-103` D8). Do NOT mint a successor; do NOT re-point at 10.8 (done; its "cohort" is a flag-targeting tag, not a member attribute). |
| **Read-time window** — `status='published' ∧ valid_from <= now < valid_until`. Both NOT NULL + `CHECK`. No scheduler, no expiry job. | A "reopen a closed survey" transition → illegal by `nextSurveyStatus`; `closed` is terminal. |
| **Tone-review (Story 2.2) gates PUBLISH** — non-author `ToneReviewSignoff`, `resourceLocator = survey:<surveyId>`, `contentHash` = SHA-256 of the RFC-8785 canonical JSON of the copy fields **and the questionnaire** (LBD-5 makes this a one-shot binding). Deny → typed 409, no status change. Reuse `apps/api/src/modules/tone-review/index.ts` + its `ToneReviewAuditSink`. **Never** the auth taxonomy; **never** raw copy in the audit. | A separate author≠reviewer identity check — **not needed**: `evaluateToneReviewGate` is already default-deny on `reviewedBy === authoredBy`, and there is no reviewer-assignment step here (the 10.9 posture, not 10.5's). |
| **Notification fan-out on publish** — NEW `QUEUE_NAMES.SURVEY_PUBLISH = 'survey.publish'`; `apps/api/src/modules/surveys/queue.ts` (send-only enqueuer, `singletonKey`); `apps/jobs/src/scheduler/survey-publish.ts` (the worker) reusing `resolveMemberDeliveryContext` + `fanOutAlert` from `contribution-notify.ts` with a `survey.publish:<alertId>:<memberId>` idempotency key. Reuses the EXISTING `alert_published` variant (`packages/contracts/src/alerts/alert.ts:112`, `{title, body}`) — **no new alert variant, no new event vocabulary**. | A reminder/nudge cadence for non-responders ("you haven't answered yet") → not in AC; would be the 6th member of the 8.8 notify family and needs its own story. Documented non-goal. |
| **RBAC:** mint **`survey.manage`**, dimension `pariwar`, `PERMISSION_CATALOG_VERSION` **35 → 36**, key count **43 → 44**. Granted to `pariwar_admin` (+ `super_admin` auto-derives). `district_admin` **DEFERRED** with the standard acceptance condition. | A `survey.view` read/write split → the 10.5/10.9 **one-key** posture: FR-58 states no transparency property forcing the read broader than the write. |
| **Admin UI** — NEW `apps/admin/src/modules/surveys/`: list (derived-display-state filter + pagination), authoring editor (bilingual copy, questions, audience, window, `response_threshold`), the **aggregate results dashboard** (AC7), publish/close actions gated on `nextSurveyStatus` legality. New `/p/$pariwarId/surveys` route in `apps/admin/src/router.tsx`. Precedent: `apps/admin/src/modules/banners/`. | CSV/JSON export of responses → **Story 10.7's reports library is the seam** (`packages/domain/src/reports/templates/`). Not built here; the aggregate is on-screen only. |
| **Member UI** — NEW `apps/mobile/app/(polls)/` (route group + `index.tsx` list + `[surveyId].tsx` answer screen), NEW `apps/mobile/components/polls/`, NEW `apps/mobile/lib/poll-api.ts`, + a `@twt/api-client` member-survey SDK (the `createMemberBannerClient` precedent). Entry point from the **Panchayat** tab. | A dedicated 4th bottom tab → the tab bar is at three and the UX spec does not add one. Enter from Panchayat. |
| **Contracts DTOs** `packages/contracts/src/surveys/` + enum sync-guard tests + `scripts/emit-openapi.ts` + `openapi/v1.yaml` regen. | — |
| **en/hi parity** for new member-facing **chrome** strings via `packages/i18n`. The survey's own title/body/questions are **authored content** validated in the domain, not catalog keys (the `components/banners/copy.ts` split). | — |

---

## 🚨 Load-Bearing Decisions

### LBD-1 — A survey is ADVISORY. The word "quorum" is banned from this story.

**This is the decision the whole story hangs on.** FR-58 says *"optional quorum threshold"*. In this
project, **quorum is already a Deed term with a binding meaning**, and it is not about members:

- `docs/legal/trust-deed.md:227` — *"(b) The **quorum** shall be **[one-half of the Trustees then in office, or two, whichever is higher]**."*
- `docs/legal/trust-deed.md:229` — questions are decided by a majority **of Trustees present and voting**.
- `docs/legal/niyamavali.md:266` — the Trustee Panel's *"meetings, quorum, and manner of resolution"* are governed by **Deed Clause 19**, directly.
- `docs/legal/niyamavali.md:270` — the Deed's quorum is explicitly distinguished from the Part-9 State-Trustee-panel rule. The project has **already had to disambiguate this word once.**

**Members have no governance vote anywhere in the Deed or the Niyamavali.** A survey that reached a
"quorum" and thereby decided something would be a member vote the Deed does not create — and it
would do it by naming, which is the cheapest way for an unintended authority to arrive.

**Therefore:**
- The column is **`response_threshold`**, never `quorum_threshold`. The derived aggregate field is **`threshold_met`**, never `quorum_met`.
- The literal string `quorum` **must not appear** in any file this story adds — not in a column, a DTO field, a TS identifier, an i18n key, an admin label, or member copy. Task 11 greps for it.
- `response_threshold` **gates nothing**. It changes no status, blocks no read, triggers no job, and appears in exactly one place: the aggregate's `threshold_met` boolean.
- Member-facing and admin-facing copy for a survey says it **gathers views**. It never says a survey "decides", "approves", "ratifies", "passes", "carries", or "votes". The Story 2.2 tone gate is the enforcement point; the microcopy gate (`scripts/microcopy`) is the automated floor.

⚠ **If anyone ever wants a survey result to bind a decision, that is a Trustee Panel routing note and
a Deed question, and it is not this story.** Recorded as **Escalation 2** so the re-trigger is
written down rather than rediscovered.

### LBD-2 — Mutable `status`, NOT event-derived-state (inherited from 10.5 D1 / 10.9 D1)

Every event-derived-state entity here (`members`, `claims`, `pools`, `alerts`, `helpdesk_tickets`)
carries a projector + an `app.*_state_writer` trigger + a CI state-invariant gate. A survey is
**different in kind**: authored content with an admin workflow, not a legal/audit-critical lifecycle.
`status` is a plain `pgEnum` column transitioned in the caller's scope tx. **No projector, no
state-writer trigger, no CI state-invariant gate, no `events_log` stream, no `packages/events`
registration.** Every create/edit/publish/close writes a Story 1.10 audit line.

⇒ Because there is **no new event vocabulary**, the Story 8.10 event-name fence is not in play
([[project_contribution_event_name_contract]]). Do not add one to be safe — an unused stream is a
liability, and 10.5/10.9 both proved a content surface does not need one.

### LBD-3 — Responses are stored ATTRIBUTED; the READ is what strips identity

`survey_responses` carries `member_id` in its **primary key** — it must, or "one response per member"
is unenforceable and a poll is ballot-stuffable. **The shield is at the read boundary, not at rest:**

- `getSurveyAggregate` returns **counts per option** + a response count + `threshold_met`. It never returns a member id, and no aggregate DTO has a field that could carry one.
- `listFreeTextAnswers` returns free-text answers **UNATTRIBUTED** — `{ answer_text, submitted_at }` and nothing else. No member id, no ordinal that could be joined back, no `.strict()` escape hatch.
- **No route, DTO, or admin screen in this story joins a response to a member.** There is no "who answered" view. If one is ever wanted it is a new story with a new key and a DPDPA consent question attached.

⚠ **This is the mirror image of the 8.5 convention, and the contrast is the point.** There
([[project_anonymous_diagnostic_log_convention]]) "anonymous" logs stayed member-**attributed** and the
anonymity lived in the *action name*. Here the storage is attributed and the anonymity lives in the
*projection*. Same discipline — **name what is actually anonymous** — opposite mechanism. Do not
copy 8.5's shape across; copy its honesty.

⚠ Free-text answers are **member-authored free text** and must be treated as **PII tier 3 at best**.
They are `.strict()`-bounded, length-capped, never logged, never put in an audit payload, and never
exported in v1.

### LBD-4 — A bounded question vocabulary, never an expression language

Exactly **three** question types: `single_choice`, `multi_choice`, `free_text`. The 10.12
`custom-fields/types.ts` doctrine applies with full force — *"NEVER an expression language: no
JSONLogic, no eval, no mini-DSL"* — and harder, because the author is a **tenant**.

⚠ **This three-way split is an authored interpretation, not a requirement quote.** `epics.md:3989`'s
own AC for this story says only *"questions (multiple choice / free text)"* — two categories — and
FR-58's prose does not enumerate types at all. Splitting "multiple choice" into `single_choice` vs
`multi_choice` is a defensible, disclosed design decision (it mirrors how every choice-question UI
actually behaves — you cannot render one control for both), but it is this story's addition. If a
reviewer wants exactly two types instead of three, that is a story-file change, not a bug.

⛔ **Forbidden in v1, and forbidden as "just a small addition":** branching / skip logic, conditional
visibility, scoring or weights, ranking questions, matrix/grid questions, file-upload answers, "other
(please specify)" hybrid options, computed questions. A fourth type is a code change and a review.
That is the feature, not the limitation.

Hard caps (constants in `packages/domain/src/surveys/limits.ts`, mirrored in contracts):
`MAX_QUESTIONS_PER_SURVEY = 20`, `MAX_OPTIONS_PER_QUESTION = 10`, `MAX_QUESTION_TEXT = 300`,
`MAX_OPTION_TEXT = 120`, `MAX_FREE_TEXT_ANSWER = 1000`. JSONB inner keys are **snake_case** (the
`clause_versions` / `cohort_definition` / `custom-fields` convention) so the `@twt/contracts` wire
shape matches byte-for-byte — the round-trip sync-guard test is what keeps this honest
([[feedback_story_validate_footguns]]).

### LBD-5 — The questionnaire is IMMUTABLE after publish

Once a survey is `published`, its `questions` JSONB, its `response_threshold`, and its audience are
**frozen**. `updateSurvey` on a published survey may change **nothing but `valid_until` (extend
only)**. Everything else is a typed **409**.

Why: a response is an answer *to a question*. Change the question and every stored answer silently
becomes an answer to something nobody asked — the exact re-interpretation failure
[[feedback_supersede_never_reinterpret]] exists to prevent. **To change the questions: close the
survey and publish a new one.** That is a supersession, and it leaves both records intact.

This is also what makes the tone-review content hash a **one-shot binding**: the hash covers the copy
**and** the questionnaire, and since neither can change after publish, there is no
"fresh sign-off after edit" path to build (10.9 needed one; 10.15 does not).

### LBD-6 — One response per member, structurally; submission is final

`PRIMARY KEY (pariwar_id, survey_id, member_id)`. `recordResponse` is an **idempotent insert that
409s on conflict** — not an upsert. A member answers once.

Editing an answer is deferred **with its reason stated**: an editable answer means the aggregate is a
moving target, and there is no requirement for it in FR-58 or the epic AC. A member who submits by
mistake raises a helpdesk ticket (Story 10.2) — a human path that already exists and leaves a record.
⚠ Do **not** silently make this an upsert "for convenience"; it changes the meaning of the aggregate.

### LBD-7 — `public` DENIES here (⚠ opposite polarity to 10.9 — this is deliberate)

`isMemberInBannerAudience` resolves `public → true`, because a public banner **widens** who else may
see it. **A survey is not a banner.** There is no unauthenticated survey surface, `apps/public` gets
nothing from this story, and responding requires a member session by definition. So:

- `members-all` → **true**
- `public` → **false** + a logged seam note (*"public is not a survey audience; there is no unauthenticated respondent"*)
- `state` → **resolves** via the pre-injected `MemberGeoNode` (Story 1.19), fail-closed at every uncertain step, **byte-identical** comparison (case-sensitive, untrimmed — agrees with `geo-tree/resolver.ts:20-31` and `rbac/scope.ts:241`)
- `role` / `cohort` → **false** + a logged seam note. Not the same disposition as `state`: there is no member `role`/`cohort` attribute at **any** layer, and no story owns one.

`SURVEY_TARGETABLE_AUDIENCE_SCOPES = ['members-all', 'state']` — exported for the admin console's
"not yet targetable" indicator, and pinned to the contracts mirror by an **order-sensitive `toEqual`**
sync-guard (the `banners.test.ts:56-62` shape). ⚠ Consider whether `public` should even be in the
survey audience enum: it is included **only** so the enum vocabulary stays legible next to
`banner_audience_scope`, and it is rejected at the domain write path with a typed 422. That rejection
is asserted by test — a scope that can be authored but never resolve is a trap.

### LBD-8 — Fan-out on publish lives in `apps/jobs`, and is per-member idempotent

`apps/api` **enqueues**; `apps/jobs` **fans out**. `resolveMemberDeliveryContext` / `fanOutAlert`
resolve **member Tier-1 field crypto**, and `apps/api`'s request path carries **admin-identity** keys
([[project_helpdesk_responder_surface_104]]). Copy `apps/jobs/src/scheduler/news-publish.ts` almost
line for line, substituting the idempotency prefix (`survey.publish:`) and the audience resolver.
A pg-boss redelivery re-attempts fan-out; **per-member idempotency claims — not a status re-check —
are what prevent a duplicate send.**

---

## Acceptance Criteria

### AC1 — The survey data model + the admin authoring surface

**Given** FR-58 + Story 1.8 RBAC,
**When** the survey/poll surface is implemented,
**Then** a `surveys` model exists (NEW migration **`0109`** + `packages/domain/src/schema/surveys.ts`) carrying: `survey_id` (PK, `gen_random_uuid()`, branded `SurveyId`), `pariwar_id` (RLS), bilingual `title`/`body`/`title_hi`/`body_hi` (**all four required at publish** — FR-68; ⚠ `body`/`body_hi` are inferred from the 10.9 banner precedent, not a field epics.md's own AC for 10.15 names — `epics.md:3989` mentions only `title`; carried over by analogy because a one-line survey with no description is a worse authoring experience than 10.9's banners have), `questions` (JSONB, NOT NULL, `DEFAULT '[]'`), `audience_scope` + `audience_scope_value`, `valid_from` + `valid_until` (**both NOT NULL**, `CHECK (valid_until > valid_from)`), `response_threshold` (nullable integer, `CHECK (response_threshold IS NULL OR response_threshold >= 1)`), `status` (`draft | published | closed`), `created_by_actor_id`, the three tone-signoff columns, `published_at`, `closed_at`, timestamps, and an index on `(pariwar_id, status, valid_from)`;
**And** a `survey_responses` model exists in the same migration with `PRIMARY KEY (pariwar_id, survey_id, member_id)`, `answers` (JSONB NOT NULL), `submitted_at`, and an index on `(pariwar_id, survey_id)`;
**And** a holder of `survey.manage` opens `/p/:pariwarId/surveys`, sees the Pariwar's surveys (paginated, filterable by **derived** display state, via a real `listSurveysForPariwar` using **`clampLimit`**), creates and edits drafts, and publishes / closes;
**And** `status` is a **plain mutable column, NOT event-derived-state** (LBD-2) — no projector, no state-writer trigger, no `events_log` stream, no CI state-invariant gate — while **every** create / edit / publish / close writes a Story 1.10 audit line with actor attribution (`survey.created` / `survey.updated` / `survey.published` / `survey.closed`);
**And** a pure `nextSurveyStatus(status, action)` reducer defines the legal transitions (`draft --publish--> published`; `draft --close--> closed` as a discard; `published --close--> closed`; **everything else illegal**, `closed` terminal, **no reopen**) and the API rejects an illegal transition with a typed **409 BEFORE any write** (the `nextTicketState` / `nextPostStatus` / `nextBannerStatus` discipline).

### AC2 — The window is read-time; the display state is DERIVED, never stored

**Given** a published survey with `valid_from` / `valid_until`,
**When** the member surface and the admin list read it,
**Then** openness is computed **entirely at read time** — `status = 'published' ∧ valid_from <= now < valid_until` — with **no scheduler, no pg-boss expiry job, no worker, and no state transition at open or expiry**;
**And** a pure `deriveSurveyDisplayState(row, now)` returns `draft | scheduled | open | expired | closed` — a **derivation over stored fields**, never a persisted column ([[project_yogdaan_status_derivation_convention]]);
**And** `valid_from` is **INCLUSIVE** and `valid_until` **EXCLUSIVE**, asserted by boundary tests at exactly `valid_from` and exactly `valid_until`;
**And** a response write against a survey that is not `open` at `now` is a typed **409** — expiry is enforced on the **write path**, not only hidden from the read.

### AC3 — The question vocabulary is bounded and validated (LBD-4)

**Given** a tenant-authored questionnaire,
**When** `validateQuestionnaire(questions)` runs on every create/update and again at publish,
**Then** exactly three types are accepted — `single_choice`, `multi_choice`, `free_text` — with snake_case JSONB inner keys matching the `@twt/contracts` wire shape byte-for-byte (round-trip sync-guard test);
**And** each question carries a stable `question_id` (client-supplied UUID, unique within the survey — a positional index would break the moment a draft reorders), `question_text` + `question_text_hi`, `type`, and (choice types only) `options: [{ option_id, option_text, option_text_hi }]`;
**And** every cap in `limits.ts` is enforced with a **typed 422 naming the violated bound**, never a generic parse error;
**And** a `free_text` question with `options`, or a choice question with fewer than 2 options, is a typed 422;
**And** a survey with **zero** questions cannot be published (422) — an empty survey is authoring nonsense, not a legitimate draft-to-publish path;
**And** there is **no** branching, scoring, conditional, ranking, matrix, file-upload, or "other (specify)" construct anywhere in the vocabulary, and a test asserts an unknown `type` is rejected rather than ignored.

### AC4 — Publish is tone-gated and freezes the questionnaire (LBD-5)

**Given** Story 2.2's `evaluateToneReviewGate` + `apps/api/src/modules/tone-review/index.ts`,
**When** a holder of `survey.manage` publishes a survey,
**Then** publish requires a **non-author** `ToneReviewSignoff` with `resourceLocator = survey:<surveyId>` and `contentHash` = SHA-256 hex of the RFC-8785 canonical JSON of the four copy fields **plus the `questions` array**; a deny is a typed **409** with **no status change**, routed through the module's own `ToneReviewAuditSink` (`tone_review.signoff` / `tone_review.publish_blocked`) — **never** the auth taxonomy, and **never** raw copy or raw questions in an audit line;
**And** after publish the `questions`, `response_threshold`, `audience_scope` and `audience_scope_value` are **immutable**: an update touching any of them is a typed **409** naming the frozen field;
**And** the **only** post-publish mutation permitted is **extending `valid_until`** (a shortening is a 422 — shortening a live window is a `close`, and `close` is the transition that exists for it);
**And** all four copy fields are required at publish (a missing `title_hi` is a typed 422 — FR-68).

### AC5 — Audience resolution is a pure, injected predicate (LBD-7)

**Given** `packages/domain/src/banners/audience.ts` as the shape authority,
**When** `isMemberInSurveyAudience(scope, scopeValue, memberGeo, logger)` resolves,
**Then** it is **PURE and SYNCHRONOUS** — it takes a **pre-resolved `MemberGeoNode | null`**, never a `Db` handle, and is **never** made async (it is called inside a `.filter()`; a `Db` handle there is the N+1 that AC8 forbids);
**And** `members-all` → true; **`public` → false** + a logged seam note (⚠ **opposite polarity to 10.9**, and asserted by a test whose name says so); `state` → resolves against `memberGeo.state` with a **byte-identical, case-sensitive, untrimmed** comparison, **fail-closed** on every uncertain step (no posting row, no published tree, district not in the tree, no ancestor, or a null `audience_scope_value`) each with its own distinct log reason; `role`/`cohort` → false + a **differently-worded** seam note recording that no member attribute exists at any layer;
**And** `audience_scope = 'public'` is rejected at the domain **write** path with a typed 422, asserted by test;
**And** `SURVEY_TARGETABLE_AUDIENCE_SCOPES = ['members-all', 'state']` is exported and pinned to its `@twt/contracts` mirror by an **order-sensitive `toEqual`** sync-guard;
**And** the exhaustiveness `default:` arm uses the `const _exhaustive: never` guard so a future scope cannot be added without an arm.

### AC6 — The member surface: read, answer once, and never see a foreign tenant

**Given** the Story 10.2 member-route pattern,
**When** a member opens the polls surface,
**Then** `GET /api/v1/p/:pariwarId/member/surveys` returns the member's **open, in-audience, not-yet-answered** surveys plus an `answered` flag for open surveys they have already completed, and `POST /api/v1/p/:pariwarId/member/surveys/:surveyId/responses` records one response;
**And** both routes are `requireMemberSession`-gated, touch **NO RBAC key and no `scopeResolutionHook`**, and the handler opens its **OWN** `openScopeTx` — a `:pariwarId` that does not match the token is a **404, never a 403**, and a `surveyId` from another tenant or an unpublished survey is likewise a **404**;
**And** the POST carries **Turnstile** (architecture §2.11/§5.8a), an **`Idempotency-Key` header**, and the FR-88 write rate limit keyed **`perMemberKey`** with `hook: 'preHandler'` (**not** `namedRateLimits.write`, which is `perSessionKey` and rate-limits every member behind one NAT together);
**And** a second response from the same member is a typed **409** (LBD-6) — an idempotent **insert**, not an upsert — while a replay carrying the **same** `Idempotency-Key` returns the original 201 result;
**And** `validateAnswers(questions, answers)` rejects, with a typed 422 naming the offending `question_id`: an unknown question id, a missing answer for a question, an unknown `option_id`, more than one option on a `single_choice`, zero options on any choice answer, and free text over `MAX_FREE_TEXT_ANSWER`;
**And** the mobile surface renders empty / loading / error states **OUTSIDE** any `FlatList` ([[project_fabric_flatlist_empty_populated_crash]] — a New-Arch FlatList red-boxes crossing empty→populated in place);
**And** the survey's own authored copy is selected **Hindi-first** by a pure function split out of the `.tsx` (the `components/banners/copy.ts` precedent — the mobile harness is pure Vitest with no RN mount renderer), while the surrounding chrome strings go through `packages/i18n` with **en/hi parity** (⚠ `t()` defaults to the `common` namespace and **throws** on a missing key — [[project_missed_cycle_visibility_substrate]]).

### AC7 — Aggregate analytics in the admin UI, with raw responses PII-shielded (LBD-3)

**Given** the epic AC — *"aggregate analytics surface in admin UI; raw PII-shielded"*,
**When** a holder of `survey.manage` opens a published survey's results,
**Then** `getSurveyAggregate` returns, per choice question, **counts per `option_id`**, plus `response_count`, plus `threshold_met` (`response_threshold === null ? null : response_count >= response_threshold`);
**And** **no aggregate DTO carries a member identifier in any field**, and the aggregate query never selects `member_id` — asserted by a test that inspects the returned shape, not by inspection;
**And** free-text answers are readable **only** through `listFreeTextAnswers`, which returns `{ answer_text, submitted_at }` and **nothing else** — no member id, no stable per-respondent ordinal, no row id that could be joined back — paginated with **`clampLimit`**, and ordered by `submitted_at` with `survey_response_id`-free tie-breaking that does not reconstruct submission identity;
**And** there is **no route, DTO, or screen anywhere in this story that joins a response to a member**;
**And** a free-text read writes a `survey.responses_viewed` audit line carrying the `survey_id` and a **count** — **never** answer content;
**And** the aggregate is computed by a **pure `aggregateResponses(questions, responses)`** with its own unit tests (zero responses, a member who skipped an optional question, an option with zero votes still present in the output at 0, `threshold_met` null / false / true).

### AC8 — Publish fans out via Story 5.1, from `apps/jobs` (LBD-8)

**Given** the epic AC — *"member receives notification via Story 5.1"* — and the 10.4 crypto-boundary lesson,
**When** a survey is published,
**Then** `apps/api` **enqueues only**: a NEW `QUEUE_NAMES.SURVEY_PUBLISH = 'survey.publish'`, a send-only enqueuer in `apps/api/src/modules/surveys/queue.ts` carrying the ALS envelope + `{ surveyId }`, with a `singletonKey` of `<surveyId>` — and **never** calls `boss.work()`;
**And** the fan-out lives in NEW `apps/jobs/src/scheduler/survey-publish.ts`, resolving the audience through the **same** `isMemberInSurveyAudience` predicate the read uses (one authority, not two), and calling the per-member `resolveMemberDeliveryContext` + `fanOutAlert` building blocks from `contribution-notify.ts`;
**And** it reuses the **existing** `alert_published` variant (`packages/contracts/src/alerts/alert.ts:112`) — **no new alert variant, no new event vocabulary, no `packages/events` registration**;
**And** each send is claimed under a `survey.publish:<alertId>:<memberId>` idempotency key with a generous TTL, so a pg-boss redelivery re-attempts fan-out without duplicating a member's notification, and only **non-PII** fields (channels + booleans, never an address) are persisted in the idempotency record (the `nonPiiRecord` sibling);
**And** the audience resolution issues **ONE** geo resolution per member, not one per survey per member — no N+1;
**And** a fan-out failure **never** rolls back the publish: the survey is published, the notification is retried.

### AC9 — RBAC, gates, and the registers

**Given** Story 1.8's catalog,
**When** the key is minted,
**Then** `survey.manage` is added at `dimension: 'pariwar'` (value = `scopeTx.pariwarId` — the `helpdesk.create` / `news.manage` / `feature_flag.*` / `banner.manage` precedent), `PERMISSION_CATALOG_VERSION` moves **35 → 36** and the key count **43 → 44**, with the version-bump note in `permissions.ts` written in the established prose form and `packages/domain/tests/rbac/permissions.test.ts:54` updated;
**And** it is granted to `pariwar_admin` (the same content-authoring authority that holds `news.manage` and `banner.manage`) with `super_admin` auto-deriving; **`district_admin` is DEFERRED** because a `district`-ceiling grant can never satisfy a `pariwar`-dimension check ([[project_rbac_geo_scope_containment]]) — an inert grant is **not** seeded — and `state_trustee` is excluded for the same asymmetry in the other direction; the **acceptance condition** is recorded verbatim: *district_admin survey-manage may be enabled only if a survey gains a server-derived district AND the gate moves to `dimension: 'district'` — never by widening a pariwar gate to a role that cannot satisfy it*;
**And** it is **NOT** step-up-gated (publishing a survey is not freeze-firing and is not in the AR-24 list); accountability is the non-author tone sign-off + the §1.5 hash-chain audit line;
**And** the member survey routes touch **NO** key at all;
**And** `pnpm ci:local` is run and its result is reported **AS OBSERVED** — including the known-red specs ([[project_known_livedb_test_failures]] #3, #12, #13, #14) named individually rather than folded into a "green" claim ([[feedback_record_unattested_no_backfill]]).

---

## ⚠ Escalations

**Escalation 1 — `prd.md:1325` omits FR-58 from the §4.7 v1 enumeration.** `[NON-BLOCKING]`
FR-58 is `[v1-S]`, absent from §6.1's FR list, and **absent from §6.2's out-of-scope register** —
unlike FR-48, which §6.2 names. This story reads that as an enumeration gap and proceeds. **Raise it
for the PM register**: either add FR-58 to the §6.1 §4.7 enumeration, or add it to §6.2 and defer this
story. ⛔ Do **not** edit `prd.md` from inside this story — a story does not amend a planning artifact
by convenience ([[feedback_architecture_vs_prd_boundary]]).

**Escalation 2 — the re-trigger for a binding poll.** `[RECORDED, NOT OPEN]`
LBD-1 makes surveys advisory. **The first request for a survey result that gates, binds, or
self-executes anything is a Trustee Panel routing note and a Deed question** (Cl. 19 quorum, Cl. 20
Board powers, Niyamavali §8.7), and it arrives **with its live requirement attached** — not
pre-emptively minted here ([[feedback_record_unattested_no_backfill]]: an un-gated re-commitment
decays).

**Escalation 3 — `architecture.md:4234` names `apps/mobile/app/p/[pariwarId]/polls/`.**
`[DECLARED SUBSTITUTION]` The repo's member app uses **route groups** (`app/(helpdesk)/`,
`app/(claim)/`, `app/(nominee)/`…), not a `p/[pariwarId]/` path segment — the pariwarId comes from
`lib/session-context`. This story ships `app/(polls)/` and **declares** the substitution rather than
smuggling it (the [[project_mmkv_asyncstorage_equivalent]] note-the-substitution discipline).
`architecture.md:4282`/`4341` (`apps/admin/src/modules/surveys/`, `apps/api/src/modules/surveys/`) are
followed **exactly**.

**Escalation 4 — free-text answers have no export path.** `[SEAM, OWNED]`
AC7 makes free text on-screen-only. The export seam is **Story 10.7's reports library**
(`packages/domain/src/reports/templates/`), whose mask-by-default posture already fits. Not built
here; named so it is not rediscovered as a gap.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 data model + admin authoring | 1, 2, 4, 8 |
| AC2 read-time window + derived state | 2, 3, 4 |
| AC3 bounded question vocabulary | 2, 3, 5 |
| AC4 tone gate + questionnaire freeze | 3, 4, 6 |
| AC5 audience predicate | 3, 5 |
| AC6 member surface | 4, 5, 7, 9 |
| AC7 aggregate + PII shield | 3, 4, 8 |
| AC8 fan-out | 6, 10 |
| AC9 RBAC + gates + registers | 6, 7, 11 — Task 7 discharges the "member survey routes touch NO key at all" clause specifically |

### Task 0 — Branch + baseline
- [x] `git fetch origin` and confirm `HEAD == origin/main` ([[feedback_git_fetch_before_remote_reasoning]]). Baseline is `5b469b3`.
- [x] Cut `feature/10-15-survey-poll` from `main`. ⚠ Commit **manually** (branch + selective stage) — do **not** use `commit-story` ([[project_story_automator_ops]]).
- [x] ⚠ `git push` runs the full `ci:local` via a pre-push hook — that is the "hang", not a failure ([[project_friction_budget_baseline_ratchet]]).

### Task 1 — Schema + migration `0109` (AC: 1)
- [x] NEW `packages/domain/src/schema/surveys.ts`. Model the file header on `schema/banners.ts`: state LBD-2 (mutable status), LBD-3 (attributed storage / stripped read), LBD-5 (post-publish freeze), and the enum "one spelling authority" convention.
- [x] Declare the pgEnum sources + derived TS unions: `SURVEY_STATUSES = ['draft','published','closed']`, `SURVEY_AUDIENCE_SCOPES = ['public','members-all','state','role','cohort']` (own `CREATE TYPE survey_audience_scope` — **never** share `banner_audience_scope`), `SURVEY_QUESTION_TYPES = ['single_choice','multi_choice','free_text']`, and the non-column `SURVEY_DISPLAY_STATES = ['draft','scheduled','open','expired','closed']`.
- [x] `surveys` + `survey_responses` tables per AC1, all cross-table refs **unFK'd** (house convention), branded ids, `pariwar_id` first.
- [x] NEW `SurveyId` (+ `SurveyResponseId` only if a surrogate is genuinely needed — prefer not; the composite PK is the identity) in `packages/domain/src/ids/index.ts`.
- [x] Register both in `packages/domain/src/schema/index.ts`.
- [x] Handwrite `packages/domain/migrations/0109_survey-poll.sql`: tables, `CREATE TYPE`s, CHECKs, indexes, **RLS enable + policies**, and the `GRANT SELECT, INSERT, UPDATE` posture (⛔ **never** `DELETE` — a deleted survey makes its stored responses uninterpretable). ⚠ **Never regenerate an applied migration** (42P07) and **never `DROP SCHEMA`** (42P01) ([[project_live_db_test_gotchas]]).
- [x] ⚠ The column-**GRANT** footgun: verify the new tables' grants against `app_user` explicitly — no unit test catches a missing grant ([[project_moderation_appeal_substrate]]).

### Task 2 — Domain: vocabulary, limits, status, display state (AC: 1, 2, 3)
- [x] NEW `packages/domain/src/surveys/{types.ts,limits.ts,status.ts,errors.ts,index.ts}`.
- [x] `types.ts` — the question/answer shapes with **snake_case JSONB inner keys**; header modelled on `custom-fields/types.ts` including the "never an expression language" paragraph.
- [x] `limits.ts` — the five caps from LBD-4 as exported constants (the contracts mirror imports nothing; it re-declares and a sync-guard pins them).
- [x] `status.ts` — pure `nextSurveyStatus` + `deriveSurveyDisplayState(row, now)`. `closed` terminal, **no reopen**.
- [x] `errors.ts` — one typed error per rejection reason in AC3/AC4/AC6, each naming its field or bound.

### Task 3 — Domain: pure validators, audience, aggregate (AC: 2, 3, 4, 5, 7)
- [x] `validate.ts` — `validateQuestionnaire` + `validateAnswers` per AC3/AC6, every rejection a distinct typed error.
- [x] `audience.ts` — `isMemberInSurveyAudience` + `SURVEY_TARGETABLE_AUDIENCE_SCOPES`. **Port `banners/audience.ts` structurally**, invert the `public` arm per LBD-7, and write a file header that states the inversion and why (a reader who knows 10.9 must not assume the polarity carried over).
- [x] `aggregate.ts` — pure `aggregateResponses(questions, responses)` → per-question option counts, `response_count`, `threshold_met`. Zero-vote options appear at 0.
- [x] `content-hash.ts` — SHA-256 over the RFC-8785 canonical JSON of copy **+ questions** (reuse `canonicalJsonStringify` from `@twt/domain`).

### Task 4 — Domain: reads + writes (AC: 1, 2, 4, 6, 7)
- [x] `write.ts` — `createDraft`, `updateSurvey` (enforcing the LBD-5 freeze + extend-only `valid_until`), `publish`, `close`, `recordResponse` (insert; 409 on conflict — **not** an upsert).
- [x] `read.ts` — `listSurveysForPariwar` (**`clampLimit`**), `getSurvey`, `listOpenSurveysForMember` (resolve `MemberGeoNode` **ONCE** before filtering — ⛔ never inside the `.filter()`, never async), `getSurveyAggregate`, `listFreeTextAnswers` (**`clampLimit`**, no member id in the projection).
- [x] ⚠ Every dynamic `.limit()` must be `clampLimit`-wrapped or the domain limit-clamp gate fails ([[project_domain_limit_clamp_and_savepoint_retry]]).
- [x] ⚠ Watch the Drizzle correlated-subquery trap if any aggregate uses one — interpolating an outer `Column` into a same-named-column subquery collapses correlation into a tautology, and DB-free tests cannot catch it ([[project_epic6_drizzle_correlated_subquery_bug]]).

### Task 5 — Contracts (AC: 3, 5, 6)
- [x] NEW `packages/contracts/src/surveys/{enums.ts,dto.ts,display-state.ts,index.ts}`. Pure Zod, `.strict()` throughout, **snake_case wire**. ⛔ **No `@twt/domain` import** — the RN Metro bundle boundary ([[project_contracts_domain_bundle_boundary]]).
- [x] Two audiences, two shapes (the `banners/dto.ts` split): the **admin** shape carries the full row + derived display state; the **member** shape carries **no** actor ids, **no** tone-signoff fields, **no** `audience_scope_value`, **no** `status`.
- [x] The aggregate + free-text DTOs per AC7 — structurally incapable of carrying a member id.
- [x] Sync-guard tests: the four enum tuples + `SURVEY_TARGETABLE_AUDIENCE_SCOPES` (**order-sensitive `toEqual`**) + the limits constants + a **camelCase↔snake_case round-trip** test ([[feedback_story_validate_footguns]]).
- [x] Regenerate: `scripts/emit-openapi.ts` + `openapi/v1.yaml`.

### Task 6 — RBAC key + API module (AC: 4, 8, 9)
- [x] `permissions.ts`: add `'survey.manage'`, bump `PERMISSION_CATALOG_VERSION` 35 → 36, write the version-bump note **and** the per-key note in the established prose form (mirror the `banner.manage` entries at `:356` and `:786`), including the district_admin deferral + acceptance condition.
- [x] `roles.ts`: `const SURVEY_MANAGE = permissionKey('survey.manage')` → `pariwar_admin`. ⛔ No inert `district_admin` / `state_trustee` grant.
- [x] `packages/domain/tests/rbac/permissions.test.ts:54` → `36`, with the note appended in the existing style.
- [x] NEW `apps/api/src/modules/surveys/{index.ts,routes.ts,handlers.ts,member-routes.ts,member-handlers.ts,queue.ts}` — model on `modules/banners/` + `modules/news-blog/queue.ts`.
- [x] Admin routes gated by `requirePermissionHook('survey.manage')`; publish additionally gated by the tone-review pre-handler.
- [x] ⚠ Fastify: use `onRequest` (not async `onSend`) for any body-independent header work — async `onSend` exposes `ERR_HTTP_HEADERS_SENT` ([[project_fastify_onsend_doublesend]]).
- [x] Add `QUEUE_NAMES.SURVEY_PUBLISH = 'survey.publish'` to `packages/queue/src/index.ts` with a doc comment in the established form (job class, producer, consumer, idempotency).

### Task 7 — Member API surface (AC: 6)
- [x] `member-routes.ts` / `member-handlers.ts`: `requireMemberSession`, **own `openScopeTx`**, **404-not-403**, Turnstile on the POST, `Idempotency-Key`, `perMemberKey` rate limit with `hook: 'preHandler'`. Copy `modules/banners/member-routes.ts` for the header discipline and `modules/helpdesk/member-routes.ts` for the Turnstile posture.
- [x] Extend `packages/api-client/src/index.ts` with `createMemberSurveyClient` (the `createMemberBannerClient` block at `:1237` is the template).

### Task 8 — Admin UI (AC: 1, 7)
- [x] NEW `apps/admin/src/modules/surveys/{SurveysPage.tsx,SurveyEditor.tsx,SurveyResults.tsx,derive.ts,i18n-en.ts}` — model on `apps/admin/src/modules/banners/`.
- [x] Register `/p/$pariwarId/surveys` in `apps/admin/src/router.tsx` (the `bannersRoute` block at `:140`/`:244` is the pattern).
- [x] The results screen renders the aggregate + the unattributed free-text list, with copy that states plainly that a survey **gathers views and does not decide anything** (LBD-1).
- [x] ⚠ Do not misattribute UI across sibling admin modules ([[feedback_story_validate_footguns]]) — `surveys` is its own module, not a tab inside `banners` or `news-blog`.

### Task 9 — Member UI (AC: 6)
- [x] NEW `apps/mobile/app/(polls)/{_layout.tsx,index.tsx,[surveyId].tsx}` + `apps/mobile/components/polls/` + `apps/mobile/lib/poll-api.ts`.
- [x] Split the pure bits (Hindi-first copy selection, answer-draft validation) out of the `.tsx` into plain `.ts` — the mobile harness is pure Vitest with **no RN mount renderer** (`components/banners/copy.ts` precedent).
- [x] Empty / loading / error render **OUTSIDE** any `FlatList` ([[project_fabric_flatlist_empty_populated_crash]]).
- [x] Entry point from the **Panchayat** tab (`apps/mobile/app/(tabs)/panchayat.tsx` → `components/panchayat/PanchayatNoticeboard.tsx`). ⛔ Do **not** add a 4th bottom tab.
- [x] `packages/i18n` catalog entries for chrome strings, **en/hi parity**.

### Task 10 — The fan-out worker (AC: 8)
- [x] NEW `apps/jobs/src/scheduler/survey-publish.ts` — copy `news-publish.ts` structurally: consume `SURVEY_PUBLISH`, resolve the audience via `isMemberInSurveyAudience`, call `resolveMemberDeliveryContext` + `fanOutAlert` per member, claim `survey.publish:<alertId>:<memberId>`, persist only `nonPiiRecord`-shaped results.
- [x] Register the worker in the `apps/jobs` boot.
- [x] ⛔ **No new alert variant** — reuse `alert_published` (`{title, body}`).

### Task 11 — Tests, gates, registers (AC: all)
- [x] Domain unit tests for every pure function (status, display state, questionnaire/answer validation, audience — including the **`public` → false** test named for the 10.9 inversion — aggregate, content hash).
- [x] Live-DB integration tests (test DB `twt-test-pg`:5433): RLS isolation, the one-response-per-member 409, the publish freeze 409s, the window boundary at exactly `valid_from` and exactly `valid_until`, the 404-not-403 cross-tenant leg, and the aggregate's member-id-free shape. ⚠ Assert **membership, not counts** where own-committing writers are involved ([[project_live_db_test_gotchas]]).
- [x] ⚠ **The date-bomb class**: any test pinning a query instant against a clock-defaulted seed will fail on a future DATE and a baseline comparison can never see it ([[project_known_livedb_test_failures]] #12). Seed windows **relative to a fixed injected `now`**.
- [x] Contracts sync-guards + round-trip. Admin **render** tests (not only view-model tests — the 10.10 AC9 lesson: prose asserted only at the view-model reaches nobody).
- [x] **The LBD-1 grep gate**: `grep -rni "quorum" packages/domain/src/surveys/ packages/domain/src/schema/surveys.ts packages/domain/migrations/0109_survey-poll.sql packages/contracts/src/surveys/ apps/api/src/modules/surveys/ apps/admin/src/modules/surveys/ apps/mobile/app/\(polls\)/ apps/mobile/components/polls/ apps/mobile/lib/poll-api.ts apps/jobs/src/scheduler/survey-publish.ts` must return **zero** hits, asserted in CI or in a test, not by eye. ⚠ This list is every path this story adds — if a later task adds a path not on it, add it here too before declaring the gate green.
- [x] Run `pnpm ci:local`. ⚠ Use `--concurrency=4` semantics already baked into the script ([[project_ci_local_concurrency_oversubscription]]); a single red spec in a `@twt/api` full-suite run is **not** evidence of a regression — confirm innocence by running the suspect spec in isolation ([[project_known_livedb_test_failures]] #14).
- [x] Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: flip `development_status[10-15-survey-poll]` and prepend **one combined** reverse-chron `last_updated` COMMENT entry ([[project_sprint_status_ledger]]).
- [x] Verify the **friction-budget** ratchet, **PII-scrape**, **schema-diff**, **microcopy**, **benefit-mechanism**, **domain-accessor-invariants** and **access-wrapper** gates. ⚠ The friction-budget AC-4 diffs **COMMITTED** history — it passes vacuously until you commit ([[project_friction_budget_baseline_ratchet]]).
- [x] ⭐ Evaluate the `resolveMemberGeoNode` re-trigger (`packages/domain/src/member-geo/index.ts:21`) and **write the outcome down** — see Dev Notes. It does **not** fire; a silent non-evaluation is the failure mode, not a wrong answer.
- [x] ⛔ Verify **no** state-invariant gate was added and **no** `packages/events` registration exists (LBD-2). A green scan over a surface no invariant covers proves nothing ([[feedback_gate_scope_semantic_coverage]]) — the correct outcome here is *deliberately uncovered*, and it must be **stated**, not silently true.

---

## Dev Notes

### The single most important fact: this is 10.9's shape plus 10.5's fan-out

`packages/domain/src/banners/` and `apps/api/src/modules/banners/` are the structural template for
everything except the notification. `apps/jobs/src/scheduler/news-publish.ts` +
`apps/api/src/modules/news-blog/queue.ts` are the template for the notification. **Read all four
before designing anything.** Almost every design question this story raises has already been answered
in one of them, in a file header, with the reasoning attached.

### Migration number, catalog version, key count — pinned at baseline `5b469b3`

- Highest migration on disk: **`0108_moderation-appeal-decided-at-grant.sql`**. ⇒ this story takes **`0109`**. (10.14 *planned* 0109 and never wrote it — it deferred. The number is free; verify with `ls packages/domain/migrations | tail -3` before writing.)
- `PERMISSION_CATALOG_VERSION` = **35** (`packages/domain/src/rbac/permissions.ts:475`) ⇒ **36**.
- Key count = **43** ⇒ **44**. ⚠ Catalog version is **not** a proxy for key count (10.18 / 6.17 / 10.13 each bumped the version with **zero** new keys). Say both numbers explicitly in the bump note.

### Where the substrate already exists — do not rebuild it

| You need | It already exists at |
|---|---|
| Mutable-status content table shape | `packages/domain/src/schema/banners.ts`, `news_posts.ts` |
| Read-time window + derived display state | `packages/domain/src/banners/status.ts`, `packages/contracts/src/banners/display-state.ts` |
| Audience predicate + geo resolution | `packages/domain/src/banners/audience.ts`, `packages/domain/src/member-geo/` |
| Tone-review publish gate | `packages/domain/src/tone-review/gate.ts` + `apps/api/src/modules/tone-review/index.ts` |
| Canonical JSON for the content hash | `packages/domain/src/canonical-json.ts` (`canonicalJsonStringify`) |
| Audit line writer | `packages/domain/src/audit/write.ts` (`writeAuditEntry`) |
| pg-boss send-only enqueuer | `apps/api/src/modules/news-blog/queue.ts` |
| Per-member fan-out + idempotency claim | `apps/jobs/src/scheduler/{news-publish.ts,contribution-notify.ts}` |
| Member route pattern (own scope tx, 404-not-403, per-member rate limit) | `apps/api/src/modules/banners/member-routes.ts`, `apps/api/src/modules/helpdesk/member-routes.ts` |
| Member API SDK | `packages/api-client/src/index.ts:1237` |
| Bounded tenant-authored JSONB vocabulary | `packages/domain/src/custom-fields/{types.ts,validate.ts,limits.ts}` |
| Mask-by-default projection posture | `packages/domain/src/reports/{types.ts,assemble.ts}` |
| Admin module + route registration | `apps/admin/src/modules/banners/`, `apps/admin/src/router.tsx:140` |
| Mobile pure-copy split | `apps/mobile/components/banners/copy.ts` |

### ⚠ Files this story MODIFIES (not creates) — read each before editing, and preserve what is there

Everything else is greenfield (`grep -rli "survey" apps packages` returns **zero** hits at `5b469b3`).
These are the seams where a regression is possible:

| File | Current state | What 10.15 changes | What must NOT break |
|---|---|---|---|
| `packages/domain/src/schema/index.ts` | barrel of every table module | add the `surveys` export | export ordering/shape used by `schema.*` consumers |
| `packages/domain/src/ids/index.ts` | branded-id registry | add `SurveyId` | every existing brand |
| `packages/domain/src/rbac/permissions.ts` | `PERMISSION_CATALOG_VERSION = 35` (`:475`); key list (`:750`–`:800`) | +1 key, version → 36, + the two prose notes | the catalog is asserted by `permissions.test.ts` — bump **both** the version and the note |
| `packages/domain/src/rbac/roles.ts` | `const BANNER_MANAGE = permissionKey('banner.manage')` (`:206`) | add `SURVEY_MANAGE` → `pariwar_admin` | ⛔ no inert `district_admin`/`state_trustee` grant |
| `packages/domain/tests/rbac/permissions.test.ts` | `expect(PERMISSION_CATALOG_VERSION).toBe(35)` (`:54`) | → `36`, note appended in the existing chain style | the note is a **running history** — append, never rewrite |
| `packages/queue/src/index.ts` | `QUEUE_NAMES` (`:41`+), `NEWS_PUBLISH` at `:305` | add `SURVEY_PUBLISH: 'survey.publish'` + its doc comment | `QueueName` union consumers |
| `packages/api-client/src/index.ts` | member-banner client at `:1237` | append `createMemberSurveyClient` | existing exported client factories |
| `packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml` | generated spec | regenerate | the diff must be **additive only** |
| `packages/i18n/src/catalog.ts` | `KNOWN_NAMESPACES` (`:50`) — `['common','niyamavali','terms','claim','contribution','close-of-cycle','pool-onboarding','nominee-console','helpdesk','banners']` | append `'polls'` | ⚠ `t()` defaults to the **`common`** namespace and **throws** on a missing key — an unregistered namespace fails at runtime, not at build ([[project_missed_cycle_visibility_substrate]]) |
| `apps/api/src/context.ts` | `NewsPublishEnqueuer` (`:347`), `newsPublishQueue?` (`:572`) | add `SurveyPublishEnqueuer` + an **optional** `surveyPublishQueue?` dep | keep it **optional/best-effort** — the API must boot without a queue, exactly as news does |
| `apps/api/src/server.ts` | `registerBannerModule` (`:63`, `:319`) | add `registerSurveyModule` alongside | route-registration ordering + the login-wall CI gate's guard tags |
| `apps/jobs/src/boot.ts` | `registerNewsPublishWorker` (`:103`) | add `registerSurveyPublishWorker` | SIGTERM drain + health endpoint behaviour |
| `apps/admin/src/router.tsx` | `bannersRoute` (`:140`, `:244`) | add `surveysRoute` in **both** places | a route declared but not added to the tree is a silent 404 |
| `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx` | the Panchayat tab body | add the polls entry point | ⛔ do not restructure the noticeboard; add an entry, not a rewrite |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | `10-15-survey-poll: ready-for-dev` (`:7603`) — this story's own authoring already flipped it from `backlog`; the row is a live target, not a frozen snapshot | status flips to `review`/`done` per the dev-story lifecycle + **one combined** `last_updated` COMMENT entry | preserve ALL comments + the STATUS DEFINITIONS block ([[project_sprint_status_ledger]]) |

⚠ **A story implementation must leave the system working end-to-end, not merely satisfy its ACs.**
If the app must be rebooted, a barrel re-exported, or a generated file regenerated for the feature to
actually work, that is a requirement whether or not an AC names it.

### There is NO UX specification for surveys — and that is a finding, not an omission to fill in

`grep -ni "survey\|poll\|quorum" _bmad-output/planning-artifacts/ux-design-specification.md` returns
**nothing**. Do not hunt for a pattern that does not exist, and do not invent a new visual language.
Follow the existing admin console conventions (`modules/banners/`) and the member app's existing
screens (`app/(helpdesk)/` is the closest member flow: a list, a detail, a form that posts). The
**tone guide** (`docs/tone-guide.md`) and the microcopy gate still apply in full.

### The `[SURFACE]` label is correct here (unlike 10.14)

10.14's story file argued its own `[SURFACE]` label was wrong because it wrote **authorization**.
10.15 writes **content and member opinion**. It stands up two tables, but so did 10.9 — and neither
is an authority-bearing table. `[SURFACE]` means *"do not stand up a new primitive"*, and a survey is
not one: it introduces no new state machine that anything else reads, no new event stream, no new
identity, and no new capability beyond its own key.

### Naming discipline

DB columns `snake_case`; TS domain fields `camelCase`; wire/contracts `snake_case`; JSONB inner keys
`snake_case`; tables `snake_case`-plural (architecture L3663-3677). ⚠ The camelCase-domain vs
snake_case-contracts boundary is this project's most repeated bug class — the contracts round-trip
test is what keeps it honest ([[feedback_story_validate_footguns]]).

### Audit action names (closed set for this story)

`survey.created` · `survey.updated` · `survey.published` · `survey.closed` · `survey.responses_viewed`

⛔ **Never** in an audit line: answer content, free text, a member id joined to an answer, raw copy, or
raw questions. The tone-gate audit carries a `contentHash`, never the content
([[project_anonymous_diagnostic_log_convention]] — the signal lives in the action name).

### ⭐ The `resolveMemberGeoNode` re-trigger — EVALUATE IT AND WRITE DOWN THE OUTCOME

`packages/domain/src/member-geo/index.ts:21` carries a **standing re-examination trigger**:
*"The first authorization or routing consumer of `resolveMemberGeoNode` requires reassessment."*
This story consumes it (AC5's `state` arm), so the trigger must be **evaluated, not ignored**.

**It does not fire**, and the same file says why (`:10-14`): *"A member-attribution read is **not an
authorization decision today**. It answers 'which audience is this member in', which no permission
check consults."* A survey audience is the **same class of consumer as the 10.9 banner audience** —
it selects who is *shown* something; it grants nothing and gates no permission check.

⛔ **Record the non-firing explicitly** in the Completion Notes and append a bullet to that file's
trigger list, in its established form. That file's own discipline: *"a deleted trigger is
indistinguishable from a forgotten one"*, and *"a green `governance-boundary` run proved nothing —
the root is unlisted, so the scan was always going to pass."* ⚠ Story 10.4's trigger bullet is
**THE SOLE STANDING ONE** and this story does **not** discharge it.

### Type-only → value import trap

If you find yourself changing a `import type { … }` to a value import to reach a constant, **hoist the
constant to a leaf module instead**. A materialized module-init cycle breaks *consuming* packages at
runtime while typecheck, lint and the local suite all stay green
([[project_type_only_import_cycle_trap]]).

### Testing standards summary

- **Domain**: Vitest units for every pure function; live-DB integration against `twt-test-pg`:5433 for RLS, constraints, and the transition/uniqueness 409s.
- **Contracts**: enum + limits sync-guards (order-sensitive) and a camelCase↔snake_case round-trip.
- **API**: integration specs for the RBAC gate, the tone gate deny, the member 404-not-403 leg, Turnstile, and idempotent replay.
- **Admin**: **render** tests for the results screen — a view-model assertion does not prove the copy reached anyone (the 10.10 AC9 lesson).
- **Mobile**: pure Vitest only; no RN mount renderer, so anything worth testing lives in a `.ts`, not a `.tsx`.
- **Jobs**: a worker test asserting per-member idempotency across a simulated redelivery.
- ⚠ Report `ci:local` **as observed**, naming known-red specs individually ([[feedback_record_unattested_no_backfill]]).

### Project Structure Notes

- `apps/api/src/modules/surveys/` and `apps/admin/src/modules/surveys/` match `architecture.md:4282` / `:4341` **exactly**.
- `apps/mobile/app/(polls)/` is a **declared substitution** for `architecture.md:4234`'s `apps/mobile/app/p/[pariwarId]/polls/` — see Escalation 3.
- New packages: **none**. No `packages/*` is created; the domain module lives inside `@twt/domain` ([[feedback_no_premature_package]]).
- `apps/public` is **untouched**. `packages/events` is **untouched**. `packages/channels` is **untouched** (the worker uses the existing composition).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.15` — lines 3979–3993]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-58` — line 882]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#6.1 In Scope` — line 1325 (the FR-58 omission)]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#6.2 Out of Scope` — line 1350 (FR-48 named; FR-58 not)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — lines 4234, 4282, 4341, 4558]
- [Source: `docs/legal/trust-deed.md#19. Meetings, Quorum, and Resolutions` — lines 223–229]
- [Source: `docs/legal/niyamavali.md` — lines 266, 270 (the Trustee-Panel quorum disambiguation)]
- [Source: `_bmad-output/implementation-artifacts/10-9-banner-popup-manager-valid-from-until-dismiss.md` — the structural template]
- [Source: `_bmad-output/implementation-artifacts/10-5-news-blog-dual-surface-*.md` — the fan-out template]
- [Source: `_bmad-output/implementation-artifacts/10-14-permission-delegation.md` — the Question-Zero method]
- [Source: `packages/domain/src/schema/banners.ts` · `packages/domain/src/banners/audience.ts` · `packages/domain/src/custom-fields/types.ts` · `packages/domain/src/rbac/permissions.ts:475,786` · `apps/jobs/src/scheduler/news-publish.ts` · `apps/api/src/modules/banners/member-routes.ts`]

---

## Dev Agent Record

### Agent Model Used

claude-opus-5 (bmad-dev-story)

### Debug Log References

- Migration `0109` applied to `twt-test-pg`:5433; `surveys` + `survey_responses` verified live, including the GRANT posture (`survey_responses` → `twt_app` holds **SELECT, INSERT only** — no UPDATE, no DELETE).
- `pnpm survey-advisory:check` — proven to FAIL on a planted `QUORUM_THRESHOLD` identifier and pass once reverted (a gate that has never failed is not known to work).
- `npx turbo run test --concurrency=4` — **37/37 packages green** after the forced-pagination fix below.

### Completion Notes List

**Question Zero stands: PROCEED, and no routing note was authored.** Nothing in the build changed the story's disposition. LBD-1 *declines* an authority rather than claiming one, so there was no ruling to route — a routing note asking permission to build something advisory would manufacture a governance question where none exists. No `governance:` commit precedes this story because there is no governance decision in it.

**⭐ LBD-1 is MECHANIZED, and the gate's form is a DECLARED DEVIATION from Task 11.**
Task 11 specifies the gate as a raw `grep -rni "quorum"` returning **zero** hits over the survey paths. That gate can never return zero, and the reason matters: every survey file's header *explains at length why the word is banned*, citing `trust-deed.md:227` (Deed Cl. 19) and `niyamavali.md:266,270`. Passing the literal grep would mean **deleting the reasoning**, leaving a `response_threshold` column whose renaming no future reader could account for — the exact decay [[feedback_record_unattested_no_backfill]] exists to prevent.

So `scripts/survey-advisory-invariant/` enforces **the invariant the story states** — *"not in a column, a DTO field, a TS identifier, an i18n key, an admin label, or member copy"* — rather than its raw-text proxy: comments are stripped, **identifiers, string literals and JSON keys are not**. 14 declared paths, 40 files, zero violations. A *missing* declared path is a hard failure, so a moved file trips the gate rather than shrinking the scan in silence ([[feedback_gate_scope_semantic_coverage]]). The deviation is recorded in the gate README, in `lib.ts`, and here — not silently.

**⭐ ONE REAL REGRESSION, found by an existing gate and fixed rather than worked around.** The Story 1.14 AC-3 forced-pagination guard failed on `GET /member/surveys`: a collection GET declaring no bounded `limit`. The domain accessor already clamped internally, but *a bound hidden in an accessor is invisible to the contract*, and `surveys` grows with tenant data — precisely the hazard the invariant names. Fixed by declaring a bounded `limit` on the route **and** in `emit-openapi.ts`. ⛔ Deliberately NOT added to `NON_LIST_GET_ALLOWLIST`.

**⭐ The `resolveMemberGeoNode` re-trigger was EVALUATED and DID NOT FIRE — and the non-firing is written down** in `member-geo/index.ts`'s trigger list, not inferred from a passing scan. 10.15 consumes the resolver twice (the member read and the fan-out audience), so the trigger genuinely bound. It does not fire because a survey audience selects who is *shown* and *notified*; it grants nothing and gates no permission check, and the `survey.manage` gate is `dimension: 'pariwar'` against `scopeTx.pariwarId` with no geo involved at all. ⚠ Story 10.4 remains **THE SOLE STANDING TRIGGER**. ⛔ A green `governance-boundary` run proved nothing here — the root is unlisted, so it was always going to pass.

**⛔ LBD-2's negative claims were VERIFIED, not assumed.** No projector, no `app.*_state_writer` trigger, no CI state-invariant gate, no `packages/events` registration, no `events_log` stream (the single textual hit is a comment saying so). `apps/public`, `packages/events` and `packages/channels` are git-verified untouched. The surface is **deliberately uncovered** by any state invariant, and that is *stated* rather than silently true.

**RBAC: both numbers stated.** `PERMISSION_CATALOG_VERSION` 35 → 36 **and** the key count 43 → 44 — catalog version is not a proxy for key count (10.18 / 6.17 / 10.13 each bumped with zero keys). `pariwar_admin` only (+ `super_admin` auto). `district_admin` DEFERRED and `state_trustee` excluded: both would be **inert on arrival** under [[project_rbac_geo_scope_containment]], so no inert grant is seeded. The acceptance condition is recorded verbatim in `permissions.ts` and `roles.ts`.

**Design decisions taken during the build, disclosed rather than buried:**
- **`resolveSurveyAudienceMemberIds` feeds the shared predicate rather than reimplementing the audience in SQL** (as 10.5's `resolveAudienceMemberIds` does). AC8 requires "the SAME predicate the read uses"; a parallel SQL filter would give two authorities on "who is in the audience" that could disagree, letting a member be notified about a survey the read then refuses to show them. One query + the pure `liftDistrictThroughTree` in memory keeps it N+1-free.
- **Copy is frozen at publish alongside the questionnaire**, reported under the same 409. The tone sign-off is bound to the copy by content hash, so a post-publish copy edit would leave a published survey carrying a sign-off for text nobody reviewed.
- **`updateSurvey` compares REQUESTED KEYS, not resulting values.** Diff-based tolerance would let a whole-row PUT silently "succeed" at editing a published questionnaire whenever the edit happened to be a no-op — unpredictable from outside. The admin console sends only `valid_until` on a published survey.
- **`listFreeTextAnswers` orders by `submitted_at` with NO tie-break column.** A stable tie-break would let two reads of two different questions be aligned row-for-row, reconstructing one member's whole submission. The unstable relative order of same-instant answers is the correct trade — a stable order *is* the identity leak.
- **`SURVEY_DISPATCH_MEMBER_STATES` is re-declared rather than imported** from the news equivalent, so a change to news dispatch cannot silently move who gets asked a survey.
- **The admin display-state filter is applied in TypeScript, not SQL.** `scheduled`/`open`/`expired` differ only by the clock, so a SQL predicate would be a second implementation of `deriveSurveyDisplayState` drifting from the first.
- **The mobile answer draft is component state only, never MMKV.** A resumed draft would submit against a poll that has since closed, and free-text answers are PII tier 3.

**⚠ Escalations unchanged.** Escalation 1 (`prd.md:1325` omits FR-58 from the §4.7 v1 enumeration) remains **NON-BLOCKING and open for the PM register** — ⛔ this story did not edit `prd.md` ([[feedback_architecture_vs_prd_boundary]]). Escalation 2 (a binding poll) remains **RECORDED, NOT OPEN**. Escalation 3's `app/(polls)` route-group substitution is **declared in the layout file's own header**. Escalation 4 (no free-text export path) is unchanged and named on screen.

**Tests, AS OBSERVED.** 72 domain unit · 31 domain live-DB (:5433) · **17 API live-DB E2E** (the RBAC revert-sanity pair incl. the inert `district_admin` 403, the tone-gate deny with the status re-read unchanged, the LBD-5 freeze 409/422 pair, the `public` write-path 422, 404-not-403, and the replay-201-vs-second-submission-409 distinction) · 20 contracts sync-guard · 34 admin (21 view-model + **13 RENDER** — prose asserted only at the view-model reaches nobody, the 10.10 AC9 lesson) · 22 mobile pure · 12 jobs worker (including per-member idempotency across a **simulated redelivery**, the claim a status re-check could not make) · 13 gate-scanner. Full suite: **37/37 packages green**. Gates run and passing: schema-diff, benefit-mechanism, microcopy, domain-accessor-invariants, access-wrapper, member-state, alert-state, governance-boundary, PII-scrape, i18n parity (en/hi, `polls` namespace), and the new survey-advisory-invariant.
**`pnpm ci:local` — RUN, and reported AS OBSERVED (AC9), both ways:**

| invocation | result |
|---|---|
| `pnpm ci:local` (no `DATABASE_URL`) | ✅ **PASSED — 30/30 jobs green**; `integration-tests` correctly SKIPped |
| `DATABASE_URL=… pnpm ci:local` | ❌ **FAILED — 2 jobs** (`test (unit)`, `integration-tests`) |

⚠ **The red run is the KNOWN double-run pollution, not a regression — and the evidence is stated rather than asserted.** With `DATABASE_URL` set globally, the integration specs execute **twice** (once inside `test (unit)`, once inside `integration-tests`) — visible directly in the log as two `Test Files` lines for `@twt/api` reporting **different** failure sets from the same 118 files (`2 failed | 116 passed` and `6 failed | 112 passed`). That is [[project_ci_local_double_run_pollution]] exactly.

Innocence confirmed three independent ways, per [[project_known_livedb_test_failures]] #14 ("confirm innocence by running the suspect spec in isolation"):
1. `pnpm ci:local` without the global var — **30/30 green**.
2. `@twt/api` alone against the live DB — **118/118 files pass**, including all 17 new survey specs.
3. The failing set is **non-deterministic across runs** (three moderation specs, then five unrelated ones, then two/six) — the concurrency-oversubscription signature ([[project_ci_local_concurrency_oversubscription]]), not a deterministic break. Specs that failed under load — `banners`, `news-blog`, `niyamavali-workflow`, `verifier-console-shape`, `moderation-*` — all pass in isolation, and two of my own survey specs appeared in one such set and pass in isolation too.

⛔ I am **not** folding any of this into a green claim: the red run happened and is reported. None of the pre-existing known-red specs (#3, #12, #13) surfaced in any run.

### File List

**NEW — domain**
- `packages/domain/migrations/0109_survey-poll.sql`
- `packages/domain/src/schema/surveys.ts`
- `packages/domain/src/surveys/{types,limits,status,errors,validate,audience,aggregate,content-hash,write,read,index}.ts`
- `packages/domain/tests/surveys/{status,validate,aggregate,audience}.test.ts`
- `packages/domain/tests/integration/surveys/surveys.spec.ts`

**NEW — contracts**
- `packages/contracts/src/surveys/{enums,display-state,dto,index}.ts`
- `packages/contracts/tests/surveys.test.ts`

**NEW — api**
- `apps/api/src/modules/surveys/{index,routes,handlers,member-routes,member-handlers,queue}.ts`
- `apps/api/tests/integration/surveys/surveys.spec.ts`

**NEW — admin**
- `apps/admin/src/modules/surveys/{SurveysPage.tsx,SurveyEditor.tsx,SurveyResults.tsx,derive.ts,i18n-en.ts}`
- `apps/admin/src/routes/SurveysRoute.tsx`
- `apps/admin/tests/{surveys-derive.test.ts,surveys-page.test.tsx}`

**NEW — mobile**
- `apps/mobile/app/(polls)/{_layout.tsx,index.tsx,[surveyId].tsx}`
- `apps/mobile/components/polls/{copy.ts,usePollQueries.ts,PollsEntry.tsx}`
- `apps/mobile/lib/{poll-api.ts,poll-i18n.ts}`
- `apps/mobile/tests/unit/polls-copy.test.ts`

**NEW — jobs**
- `apps/jobs/src/scheduler/survey-publish.ts`
- `apps/jobs/tests/survey-publish.test.ts`

**NEW — i18n + gate**
- `packages/i18n/locales/{en,hi}/polls.json`
- `scripts/survey-advisory-invariant/{check.ts,lib.ts,lib.test.ts,README.md}`

**MODIFIED**
- `packages/domain/src/{index.ts,ids/index.ts,schema/index.ts}` — barrels + the `SurveyId` brand
- `packages/domain/src/rbac/{permissions.ts,roles.ts}` — `survey.manage`, v35 → v36, keys 43 → 44
- `packages/domain/tests/rbac/permissions.test.ts` — version + key-count assertions
- `packages/domain/src/member-geo/index.ts` — the re-trigger's non-firing, recorded
- `packages/domain/migrations/meta/_journal.json` — the 0109 entry
- `packages/contracts/src/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`
- `packages/queue/src/index.ts` — `QUEUE_NAMES.SURVEY_PUBLISH`
- `packages/api-client/src/index.ts` — `createMemberSurveyClient`
- `packages/i18n/src/catalog.ts` — the `polls` namespace
- `apps/api/src/{context.ts,deps.ts,server.ts,middleware/error-mapping/index.ts}`
- `apps/admin/src/api/{client.ts,hooks.ts}`, `apps/admin/src/router.tsx` (route + tree)
- `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx` — the polls entry point
- `apps/jobs/src/boot.ts` — the worker registration
- `package.json` — `survey-advisory:check` / `survey-advisory:test`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-17 | 0.1 | Story drafted from epics.md §10.15 + FR-58, against baseline `5b469b3`. Status → ready-for-dev. | bmad-create-story |
| 2026-08-17 | 0.2 | Independent validation pass (`bmad-create-story validate`): every load-bearing citation (PRD, architecture.md, legal docs, RBAC catalog, sibling-story code refs) re-checked against live repo state — zero critical issues, all verified correct. Applied 5 fixes: corrected the stale `sprint-status.yaml` citation, added Task 7 to the AC9 coverage-matrix row, enumerated the concrete path list for the Task 11 LBD-1 grep gate, and flagged two authored (not requirement-sourced) design choices — the three-way question-type split and the `body`/`body_hi` fields — as disclosed interpretations. No AC or LBD changed in substance. | bmad-create-story validate |
| 2026-08-17 | 1.0 | Implemented on `feature/10-15-survey-poll` from baseline `5b469b3`. All 11 tasks complete; all 9 ACs satisfied. LBD-1 mechanized as a new CI gate (with a DECLARED deviation from Task 11's literal grep — see Completion Notes). One real regression found by the existing forced-pagination guard and fixed properly. The `resolveMemberGeoNode` re-trigger was evaluated and its non-firing recorded. Status → review. | bmad-dev-story |
