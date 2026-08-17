// `surveys` + `survey_responses` tables — Story 10.15 substrate (the Survey/Poll `[SURFACE]`).
//
// ── ⚠ A SURVEY IS ADVISORY. IT HAS NO GOVERNANCE EFFECT (Load-Bearing Decision 1) ────────────
// FR-58's prose calls the threshold a "quorum threshold". That word is NOT used here, anywhere, and
// its absence is deliberate rather than stylistic: in this project `quorum` is already a Deed term
// with a BINDING meaning that is not about members at all — `docs/legal/trust-deed.md:227` fixes the
// TRUSTEE quorum (Cl. 19), and `docs/legal/niyamavali.md:266,270` has already had to disambiguate
// the word once against the Part-9 State-Trustee-panel rule. Members hold no governance vote under
// either document. A survey that reached a "quorum" and thereby decided something would be a member
// vote the Deed does not create — arriving by NAMING, which is the cheapest way for an unintended
// authority to appear. So the column is `response_threshold`, the derived aggregate field is
// `threshold_met`, and the threshold GATES NOTHING: it changes no status, blocks no read, and
// triggers no job. It appears in exactly one place — one boolean on the aggregate projection.
// ⚠ The first request for a survey result that gates, binds or self-executes anything is a Trustee
// Panel routing note and a Deed question (Cl. 19/20, Niyamavali §8.7), NOT a column change here.
//
// ── NOT event-derived-state — a MUTABLE `status` column (LBD-2) ──────────────────────────────
// The direct inheritance of Story 10.5 D1 (`news_posts`) and Story 10.9 D1 (`banners`). Every
// event-derived-state entity in this codebase (`members`, `claims`, `pools`, `alerts`,
// `helpdesk_tickets`) carries a projector + an `app.*_state_writer` DB-trigger guard + a CI
// state-invariant gate. A survey is DIFFERENT IN KIND — authored content with an admin workflow, not
// a legal/audit-critical lifecycle. `status` is a PLAIN pgEnum column transitioned in the caller's
// scope tx, with every create / edit / publish / close written to the Story 1.10 audit log. NO
// projector, NO state-writer trigger, NO CI state-invariant gate, NO `events_log` stream, NO
// `packages/events` registration — and therefore no new event vocabulary, which is why the Story
// 8.10 event-name fence is not in play ([[project_contribution_event_name_contract]]).
//
// ── Responses are stored ATTRIBUTED; the READ is what strips identity (LBD-3) ─────────────────
// `survey_responses` carries `member_id` in its PRIMARY KEY — it must, or "one response per member"
// is unenforceable and a poll is ballot-stuffable. The shield is at the READ boundary, not at rest:
// `getSurveyAggregate` returns counts only, and `listFreeTextAnswers` returns `{answer_text,
// submitted_at}` and nothing else. NO route, DTO or screen in this story joins a response back to a
// member. ⚠ This is the MIRROR IMAGE of the 8.5 convention
// ([[project_anonymous_diagnostic_log_convention]]), where "anonymous" logs stayed member-ATTRIBUTED
// and the anonymity lived in the action name. Same discipline — name what is actually anonymous —
// opposite mechanism. ⚠ Free-text answers are member-authored free text: PII tier 3 at best, never
// logged, never in an audit payload, never exported in v1.
//
// ── The questionnaire is IMMUTABLE after publish (LBD-5) ─────────────────────────────────────
// Once `status = 'published'`, `questions`, `response_threshold`, `audience_scope` and
// `audience_scope_value` are frozen; the ONLY permitted post-publish mutation is EXTENDING
// `valid_until`. A response is an answer TO A QUESTION — change the question and every stored answer
// silently becomes an answer to something nobody asked, the exact re-interpretation failure
// [[feedback_supersede_never_reinterpret]] exists to prevent. To change the questions: CLOSE the
// survey and publish a new one. That is a supersession and it leaves both records intact.
// ⇒ This is also what makes the tone-review content hash a ONE-SHOT binding (the hash covers the
// copy AND the questionnaire, neither of which can move), so unlike 10.9 there is no
// "fresh sign-off after edit" path.
//
// ── valid_from/valid_until are a READ-TIME window, not a schedule (AC2) ───────────────────────
// There is NO pg-boss job, NO worker and NO transition at open or expiry. `valid_from` is INCLUSIVE,
// `valid_until` is EXCLUSIVE (`valid_from <= now < valid_until`). Both NOT NULL. `draft` /
// `scheduled` / `open` / `expired` / `closed` are DERIVED by `deriveSurveyDisplayState`, never
// stored ([[project_yogdaan_status_derivation_convention]]).
//
// ── The enum tuples: the pgEnum SOURCE ───────────────────────────────────────────────────────
// `SURVEY_STATUSES` / `SURVEY_AUDIENCE_SCOPES` / `SURVEY_QUESTION_TYPES` are each the DB
// `CREATE TYPE` source AND the derived TS union (the members.ts / news_posts.ts / banners.ts "one
// spelling authority" discipline). The `@twt/contracts/surveys` wire enums RE-DECLARE the same
// tuples (contracts cannot import domain — the RN Metro bundle boundary,
// [[project_contracts_domain_bundle_boundary]]) and a TEST-ONLY sync-guard asserts they never drift.
//
// Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, table
// snake_case-plural, JSONB inner keys snake_case (so the wire shape matches byte-for-byte).

import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, SurveyId, UserId } from '../ids/index.js';
import type { SurveyAnswer, SurveyQuestion } from '../surveys/types.js';

/**
 * The survey-lifecycle status tuple — the pgEnum source (`CREATE TYPE survey_status`). A PLAIN
 * mutable column (LBD-2), NOT event-derived-state. Legal transitions are the pure `nextSurveyStatus`
 * helper (surveys/status.ts); the DB enum only constrains the VALUE domain.
 *   · `draft`     — authored, freely editable, invisible to members.
 *   · `published` — inside the read-time window members may see and answer it; outside it, not.
 *   · `closed`    — TERMINAL. No reopen: a reopened survey would resume collecting answers into an
 *     aggregate an admin has already read and acted on. To ask again, publish a new survey.
 *
 * ⚠ `scheduled` / `open` / `expired` are DELIBERATELY ABSENT: they are DERIVED display states
 * (`deriveSurveyDisplayState`), never stored (the 8.6/10.9
 * [[project_yogdaan_status_derivation_convention]] discipline). A stored `expired` would be wrong for
 * exactly as long as a sweep lagged — and there is no sweep.
 */
export const SURVEY_STATUSES = ['draft', 'published', 'closed'] as const;
export const surveyStatusEnum = pgEnum('survey_status', SURVEY_STATUSES);
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

/**
 * The five DERIVED display states (AC2) — NOT a pgEnum and NOT a column: a derivation over `status`
 * plus the window at a given `now`. Declared here anyway because this file is the "one spelling
 * authority" for the survey vocabulary, and the contracts sync-guard pins its own copy against this
 * tuple exactly as it does for the three real pgEnums.
 *
 * ⚠ UNLIKE the banner equivalent, the DERIVATION FUNCTION lives HERE (`surveys/status.ts`), not in
 * `@twt/contracts`: 10.9 put it in contracts because the admin console needed it in a browser bundle
 * and @twt/domain cannot be imported there. The survey admin console needs the same thing, so
 * `@twt/contracts/surveys/display-state.ts` carries its own copy of the pure derivation and a
 * behavioural sync-guard test pins the two implementations to identical outputs. Two callers, two
 * bundles, one asserted behaviour.
 */
export const SURVEY_DISPLAY_STATES = ['draft', 'scheduled', 'open', 'expired', 'closed'] as const;
export type SurveyDisplayState = (typeof SURVEY_DISPLAY_STATES)[number];

/**
 * The audience-scope tuple — the pgEnum source (`CREATE TYPE survey_audience_scope`). A SEPARATE DB
 * type from `banner_audience_scope` / `news_audience_scope` on purpose: three independently-evolving
 * tables must not share one `CREATE TYPE` (adding a scope for one would silently widen the others'
 * value domains).
 *
 * ── ⚠ `public` DENIES HERE — THE OPPOSITE POLARITY TO 10.9, AND IT IS DELIBERATE (LBD-7) ──────
 * `isMemberInBannerAudience` resolves `public → TRUE`, because a public banner WIDENS who else may
 * see it (Story 11a.5's `<NoticeboardStrip>` extends the same rows to unauthenticated visitors).
 * A SURVEY IS NOT A BANNER: there is no unauthenticated survey surface, `apps/public` gets nothing
 * from this story, and RESPONDING REQUIRES A MEMBER SESSION BY DEFINITION. An anonymous respondent
 * is not a narrower case of a member respondent — it is a different thing that does not exist here.
 * So `public` resolves FALSE, and it is additionally rejected at the domain WRITE path with a typed
 * 422. It is present in the tuple ONLY so the enum vocabulary stays legible beside its two siblings.
 * ⚠ A scope that can be authored but can never resolve is a trap — hence the write-path rejection,
 * and hence a test named for the inversion.
 *
 * `members-all` → true; `state` → RESOLVES against the member's geography (Story 1.19);
 * `role`/`cohort` → false + a DIFFERENTLY-WORDED seam note: there is NO member `role` or `cohort`
 * attribute at ANY layer and no story owns one (Decision `2026-08-13-103`, D8). ⛔ Do not mint a
 * successor and do not re-point them at Story 10.8 (done; its "cohort" is a FLAG-TARGETING tag, not
 * a member attribute).
 */
export const SURVEY_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const surveyAudienceScopeEnum = pgEnum('survey_audience_scope', SURVEY_AUDIENCE_SCOPES);
export type SurveyAudienceScope = (typeof SURVEY_AUDIENCE_SCOPES)[number];

/**
 * The BOUNDED question vocabulary — the pgEnum source (`CREATE TYPE survey_question_type`).
 * ⚠ It is a pgEnum even though questions live in JSONB (where the DB cannot enforce it) because this
 * tuple is the one spelling authority the domain validator, the contracts mirror and the two UIs all
 * derive from; a bare string union would give four places to drift.
 *
 * EXACTLY THREE TYPES. The 10.12 `custom-fields/types.ts` doctrine applies with full force — NEVER
 * an expression language: no JSONLogic, no eval, no mini-DSL — and HARDER, because the author here is
 * a TENANT rather than a platform operator.
 *
 * ⛔ FORBIDDEN in v1, and forbidden as "just a small addition": branching / skip logic, conditional
 * visibility, scoring or weights, ranking questions, matrix/grid questions, file-upload answers,
 * "other (please specify)" hybrid options, computed questions. A fourth type is a code change and a
 * review. THAT IS THE FEATURE, not the limitation.
 *
 * ⚠ DISCLOSED INTERPRETATION: `epics.md:3989`'s own AC says only "questions (multiple choice / free
 * text)" — TWO categories — and FR-58 enumerates none. Splitting "multiple choice" into
 * `single_choice` vs `multi_choice` is THIS STORY'S addition, defensible because you cannot render
 * one control for both. If a reviewer wants exactly two types, that is a story-file change, not a bug.
 */
export const SURVEY_QUESTION_TYPES = ['single_choice', 'multi_choice', 'free_text'] as const;
export const surveyQuestionTypeEnum = pgEnum('survey_question_type', SURVEY_QUESTION_TYPES);
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const surveys = pgTable(
  'surveys',
  {
    // The survey's canonical id. Plain DB-defaulted random UUID — no natural key, NOT a stream id
    // (there is no survey event stream; LBD-2). Branded `SurveyId` (ids/index.ts).
    surveyId: uuid('survey_id').defaultRandom().primaryKey().$type<SurveyId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The bilingual copy. Nullable at the COLUMN level (a draft is authored incrementally); ALL FOUR
    // are required at PUBLISH (FR-68 — a missing `title_hi` is a typed 422 in the domain write path).
    // ⚠ DISCLOSED INTERPRETATION: `epics.md:3989`'s AC for this story names only `title`.
    // `body`/`body_hi` are carried over by analogy with the 10.9 banner precedent — a one-line survey
    // with no description is a worse authoring experience than banners already have.
    title: text('title'),
    body: text('body'),
    titleHi: text('title_hi'),
    bodyHi: text('body_hi'),

    // The tenant-authored questionnaire (LBD-4). JSONB, NOT NULL, `DEFAULT '[]'` so a freshly created
    // draft is never null-questioned. Inner keys are snake_case so the `@twt/contracts` wire shape
    // matches byte-for-byte; the round-trip sync-guard test is what keeps that honest
    // ([[feedback_story_validate_footguns]]). FROZEN after publish (LBD-5).
    questions: jsonb('questions').notNull().default(sql`'[]'::jsonb`).$type<SurveyQuestion[]>(),

    // The audience scope + its optional selector value (the state/role/cohort discriminator; null for
    // members-all). `public` is REJECTED at the write path (LBD-7). FROZEN after publish (LBD-5).
    audienceScope: surveyAudienceScopeEnum('audience_scope').notNull(),
    audienceScopeValue: text('audience_scope_value'),

    // The read-time response window. BOTH NOT NULL; `valid_from` INCLUSIVE, `valid_until` EXCLUSIVE.
    // `CHECK (valid_until > valid_from)` below (mirrored as a domain 422). After publish the ONLY
    // permitted mutation on this row is EXTENDING `valid_until` — a shortening is a 422, because
    // shortening a live window is a `close` and `close` is the transition that exists for it.
    validFrom: timestamp('valid_from', { withTimezone: true, mode: 'date' }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'date' }).notNull(),

    // ⚠ FR-58's "optional quorum threshold", RENAMED (LBD-1 — read the file header before touching
    // this). PURELY INFORMATIONAL: the aggregate derives one boolean `threshold_met` from it and
    // NOTHING ELSE consults it. It gates no status, no read, no job and no decision. Nullable (the
    // "optional" half); `>= 1` when present (a threshold of 0 is met before anyone answers, which is
    // not a threshold). FROZEN after publish (LBD-5) — a threshold moved mid-flight is a moved
    // goalpost.
    responseThreshold: integer('response_threshold'),

    // The PLAIN mutable lifecycle status (LBD-2). No DB default: `createDraft` writes `draft`.
    status: surveyStatusEnum('status').notNull(),

    // Attribution: the authoring actor (NOT NULL — a survey is always human-authored). This is the
    // `authoredBy` the tone-review gate's non-author invariant is evaluated against.
    createdByActorId: uuid('created_by_actor_id').notNull().$type<UserId>(),

    // Tone-review sign-off (AC4), folded onto the row (the news_posts / banners precedent).
    // `tone_signoff_content_hash` is the SHA-256 hex of the RFC-8785 canonical JSON of the four copy
    // fields PLUS the `questions` array. Covering the questionnaire is what makes the sign-off a
    // ONE-SHOT binding: LBD-5 freezes both halves at publish, so unlike 10.9 there is no
    // re-sign-after-edit path to build. NEVER the raw copy and NEVER the raw questions.
    toneSignoffContentHash: text('tone_signoff_content_hash'),
    toneSignoffReviewedAt: timestamp('tone_signoff_reviewed_at', { withTimezone: true, mode: 'date' }),
    toneSignoffReviewedBy: uuid('tone_signoff_reviewed_by').$type<UserId>(),

    // Lifecycle instants. Null until the corresponding transition.
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Both hot reads are per-(tenant, status) with a window predicate on `valid_from` — the member
    // open-survey read and the admin list (AC1).
    index('surveys_pariwar_status_valid_from_idx').on(t.pariwarId, t.status, t.validFrom),
    // AC2 — the window must be non-empty. A zero/negative window is a survey that can never be
    // answered: authoring nonsense, not a legitimate state.
    check('surveys_window_non_empty', sql`${t.validUntil} > ${t.validFrom}`),
    // LBD-1 — informational only, but still structurally sane: a threshold of 0 (or below) is met
    // before a single member answers, which makes it not a threshold.
    check('surveys_response_threshold_positive', sql`${t.responseThreshold} IS NULL OR ${t.responseThreshold} >= 1`),
  ],
);

/**
 * One member's answers to one survey. Deliberately survey-SPECIFIC, not a generic "member responses"
 * primitive — no premature generalisation until a second consumer exists
 * ([[feedback_no_premature_package]]).
 *
 * ── The composite PK IS the "one response per member" invariant (LBD-6) ───────────────────────
 * `PRIMARY KEY (pariwar_id, survey_id, member_id)`. `recordResponse` is an idempotent INSERT that
 * 409s on conflict — ⛔ NOT an upsert. A member answers once, and submission is FINAL.
 * Editing an answer is deferred WITH ITS REASON STATED: an editable answer makes the aggregate a
 * moving target, and no requirement in FR-58 or the epic AC asks for one. A member who submits by
 * mistake raises a helpdesk ticket (Story 10.2) — a human path that already exists and leaves a
 * record. ⚠ Do NOT quietly make this an upsert "for convenience"; it changes what the aggregate means.
 *
 * ── `member_id` is in the KEY, and the READ is what strips it (LBD-3) ─────────────────────────
 * It must be, or one-response-per-member is unenforceable and a poll is ballot-stuffable. No
 * aggregate DTO, route or admin screen in this story joins a row here back to a member. If a
 * "who answered" view is ever wanted it is a NEW story with a new key and a DPDPA consent question
 * attached — not a projection change.
 */
export const surveyResponses = pgTable(
  'survey_responses',
  {
    // Multi-tenant scope (RLS predicate column) — also the first PK component.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The answered survey. unFK'd (the house convention for cross-table references).
    surveyId: uuid('survey_id').notNull().$type<SurveyId>(),

    // The responding member. unFK'd; branded. In the PK by necessity — see the doc block above.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // The member's answers, keyed by `question_id` (LBD-4). JSONB with snake_case inner keys matching
    // the wire shape. ⚠ `free_text` answers are MEMBER-AUTHORED FREE TEXT — PII tier 3 at best. They
    // are `.strict()`-bounded and length-capped on the way in, and on the way OUT they are readable
    // only through `listFreeTextAnswers`, which projects `{answer_text, submitted_at}` and nothing
    // else. Never logged, never in an audit payload, never exported in v1.
    answers: jsonb('answers').notNull().$type<SurveyAnswer[]>(),

    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // ⭐ The structural half of LBD-6. The domain 409 is the other half; this one holds on every
    // write path including a raw SQL one.
    primaryKey({ columns: [t.pariwarId, t.surveyId, t.memberId] }),
    // The aggregate read is per-(tenant, survey) over every response row. The PK's leading
    // `(pariwar_id, survey_id)` prefix would serve, but the aggregate is the ONLY hot read on this
    // table and naming it explicitly keeps the intent legible next to `surveys`' own index.
    index('survey_responses_pariwar_survey_idx').on(t.pariwarId, t.surveyId),
  ],
);

// Inferred row types for the accessor read/write paths (news_posts / banners / helpdesk precedent).
export type SurveyRow = typeof surveys.$inferSelect;
export type SurveyInsert = typeof surveys.$inferInsert;
export type SurveyResponseRow = typeof surveyResponses.$inferSelect;
export type SurveyResponseInsert = typeof surveyResponses.$inferInsert;
