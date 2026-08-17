// Survey read-path accessors — Story 10.15 (Task 4; AC1, AC2, AC6, AC7).
//
// ⚠ EVERY dynamic `.limit()` in this file goes through `clampLimit` (the domain-accessor-invariants
// CI gate, [[project_domain_limit_clamp_and_savepoint_retry]] — the gate clamps EVERY dynamic limit,
// not just the ones a reviewer notices).
//
// ── ⛔ THE PII SHIELD LIVES IN THIS FILE (LBD-3) ──────────────────────────────────────────────
// `survey_responses` stores `member_id` in its PRIMARY KEY, because one-response-per-member is
// otherwise unenforceable. Nothing here projects it:
//   · `getSurveyAggregate`   — selects `answers` ONLY, and folds through the pure `aggregateResponses`
//     whose output type has nowhere to put an identifier.
//   · `listFreeTextAnswers`  — projects `{answer_text, submitted_at}` and NOTHING else: no member id,
//     no row id, no stable per-respondent ordinal that could correlate one member's answers across
//     questions.
// ⛔ There is NO accessor in this file — and no route, DTO or screen anywhere in this story — that
// joins a response back to a member. If a "who answered" view is ever wanted it is a NEW story with a
// new key and a DPDPA consent question attached, not a projection widened here.

import { and, asc, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { LoadedGeoTree } from '../geo-tree/resolver.js';
import type { MemberId, PariwarId, SurveyId } from '../ids/index.js';
import { liftDistrictThroughTree, resolveMemberGeoNode } from '../member-geo/index.js';
import { clampLimit } from '../pagination.js';
import { memberPostings } from '../schema/member_postings.js';
import { type MemberLifecycleState, members } from '../schema/members.js';
import { type SurveyRow, type SurveyStatus, surveyResponses, surveys } from '../schema/surveys.js';
import { aggregateResponses } from './aggregate.js';
import { type SurveyAudienceLogger, isMemberInSurveyAudience } from './audience.js';
import { SurveyNotFoundError } from './errors.js';
import type { SurveyAggregate, SurveyFreeTextAnswer } from './types.js';
import type { SurveyAudienceScope } from '../schema/surveys.js';

/**
 * The member lifecycle states that count as a live notification target — `active` and its in-grace
 * sub-state. Deliberately the same pair `NEWS_DISPATCH_MEMBER_STATES` uses, re-declared rather than
 * imported so a change to the news dispatch set cannot silently move who gets asked a survey.
 */
export const SURVEY_DISPATCH_MEMBER_STATES: readonly MemberLifecycleState[] = ['active', 'active-in-grace'];

/** A survey by id within the active Pariwar, or `null`. */
export async function getSurvey(db: Db, pariwarId: PariwarId, surveyId: SurveyId): Promise<SurveyRow | null> {
  const rows = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.pariwarId, pariwarId), eq(surveys.surveyId, surveyId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * `getSurvey` or `SurveyNotFoundError` (→ 404). The write path's precondition read.
 *
 * ⚠ Also the MEMBER path's answer for a survey in another tenant: RLS scopes the query, so a foreign
 * id simply does not resolve and this raises 404 — never 403 (AC6). A 403 would confirm the row
 * exists, which is exactly what a cross-tenant probe is looking for.
 */
export async function getSurveyOrThrow(db: Db, pariwarId: PariwarId, surveyId: SurveyId): Promise<SurveyRow> {
  const row = await getSurvey(db, pariwarId, surveyId);
  if (!row) throw new SurveyNotFoundError(pariwarId, surveyId);
  return row;
}

export interface ListSurveysOptions {
  /** Filter by the STORED status. ⚠ The DERIVED display state is filtered in the caller — see below. */
  statuses?: readonly SurveyStatus[];
  limit?: number;
  offset?: number;
}

/**
 * The admin list (AC1). Paginated via `clampLimit` + `offset`; newest window first.
 *
 * ⚠ The AC's "filterable by DERIVED display state" is deliberately NOT a SQL predicate. `scheduled` /
 * `open` / `expired` all share `status='published'` and differ only by the clock, so expressing them
 * in SQL would mean a second implementation of `deriveSurveyDisplayState` written in `now()`
 * comparisons — two authorities on one derivation, drifting the first time either changed
 * ([[project_yogdaan_status_derivation_convention]]). This accessor filters on the STORED status
 * (which is what the `(pariwar_id, status, valid_from)` index serves) and the caller applies the pure
 * derivation. `statuses` is passed to `inArray`, so a display-state filter still narrows the scan:
 * asking for `open` fetches only `published` rows.
 *
 * ⚠ Assert MEMBERSHIP, not counts, in tests over this ([[project_live_db_test_gotchas]]).
 */
export async function listSurveysForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: ListSurveysOptions = {},
): Promise<SurveyRow[]> {
  const statuses = opts.statuses;
  return db
    .select()
    .from(surveys)
    .where(
      statuses && statuses.length > 0
        ? and(eq(surveys.pariwarId, pariwarId), inArray(surveys.status, [...statuses]))
        : eq(surveys.pariwarId, pariwarId),
    )
    .orderBy(desc(surveys.validFrom), desc(surveys.createdAt))
    .limit(clampLimit(opts.limit, { default: 30, cap: 200 }))
    .offset(opts.offset ?? 0);
}

/**
 * The published surveys of a Pariwar whose window contains `now` — the raw candidate set, before the
 * audience predicate. Shared by the member read below and the publish fan-out worker's audience
 * resolution, so "which surveys are collecting right now" has ONE definition.
 *
 * ⭐ `valid_from <= now < valid_until` — INCLUSIVE start, EXCLUSIVE end, byte-for-byte the predicate
 * `deriveSurveyDisplayState` derives `open` from and the one `recordResponse` enforces on the write.
 */
export async function listOpenSurveysForPariwar(
  db: Db,
  pariwarId: PariwarId,
  now: Date,
  opts: { limit?: number } = {},
): Promise<SurveyRow[]> {
  return db
    .select()
    .from(surveys)
    .where(
      and(
        eq(surveys.pariwarId, pariwarId),
        eq(surveys.status, 'published'),
        lte(surveys.validFrom, now),
        gt(surveys.validUntil, now),
      ),
    )
    .orderBy(desc(surveys.validFrom))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

/** One open survey plus whether THIS member has already answered it (AC6). */
export interface MemberSurveyCandidate {
  survey: SurveyRow;
  answered: boolean;
}

/**
 * THE member-surface read (AC6): every open survey this member is in the audience for, each flagged
 * with whether they have already answered.
 *
 * Pipeline: SQL (status ∧ window) → the `isMemberInSurveyAudience` predicate → an `answered` flag
 * from one batched lookup.
 *
 * ⭐ ANSWERED SURVEYS ARE RETURNED, NOT FILTERED OUT. AC6 asks for "not-yet-answered surveys plus an
 * `answered` flag for open surveys they have already completed" — a member who answered yesterday and
 * opens the tab today must see that they did, not an empty list that reads as "nothing was ever
 * asked". Dropping them would also make the surface indistinguishable from a bug.
 */
export async function listOpenSurveysForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  now: Date,
  logger?: SurveyAudienceLogger,
  tree?: LoadedGeoTree | null,
  opts: { limit?: number } = {},
): Promise<MemberSurveyCandidate[]> {
  // ⚠ The bound is applied to the CANDIDATE set (before the audience filter), so a member may see
  // fewer than `limit` surveys. That is the honest shape: the alternative — fetching unbounded and
  // trimming after filtering — is exactly the unbounded read the forced-pagination invariant exists
  // to prevent, and `surveys` grows with tenant data. The route declares the same bound in its
  // querystring so it is visible in the OpenAPI surface rather than hidden in this accessor.
  const candidates = await listOpenSurveysForPariwar(db, pariwarId, now, opts);
  if (candidates.length === 0) return [];

  // ⭐ RESOLVE THE MEMBER'S GEO **ONCE**, BEFORE FILTERING (Story 1.19 / the 10.9 D4 shape).
  // ⛔ Never inside the `.filter()` below: `isMemberInSurveyAudience` is pure + synchronous, and
  // loading geo per candidate would make it async AND issue one query per survey — the exact N+1 AC8
  // forbids ("ONE geo resolution per member, not one per survey per member"), acquired by accident.
  //
  // Skipped entirely when no candidate is `state`-scoped, so the common request path pays NOTHING.
  // ⚠ `tree` is OPTIONAL: a caller that passes none resolves geo against a `null` tree, whose `state`
  // is typed-absent, so `state`-scoped surveys deny — fail-closed, per AC5.
  const needsGeo = candidates.some((s) => s.audienceScope === 'state');
  const memberGeo = needsGeo ? await resolveMemberGeoNode(db, pariwarId, memberId, tree ?? null, now) : null;

  const inAudience = candidates.filter((s) =>
    isMemberInSurveyAudience(s.audienceScope, s.audienceScopeValue, memberGeo, logger),
  );
  if (inAudience.length === 0) return [];

  // ONE batched lookup for the `answered` flags rather than one per survey — the same N+1 discipline
  // as the geo resolution above. `member_id` is used here as a PREDICATE and never projected out
  // (LBD-3): the result is a set of survey ids, which carries no identity beyond the member already
  // making the request about themselves.
  const answeredRows = await db
    .select({ surveyId: surveyResponses.surveyId })
    .from(surveyResponses)
    .where(
      and(
        eq(surveyResponses.pariwarId, pariwarId),
        eq(surveyResponses.memberId, memberId),
        inArray(surveyResponses.surveyId, inAudience.map((s) => s.surveyId)),
      ),
    );
  const answered = new Set<string>(answeredRows.map((r) => r.surveyId));

  return inAudience.map((survey) => ({ survey, answered: answered.has(survey.surveyId) }));
}

/**
 * THE fan-out audience read (AC8): which members should be NOTIFIED that this survey opened.
 *
 * ── ⭐ ONE AUTHORITY, NOT TWO ─────────────────────────────────────────────────────────────────
 * AC8 requires the worker to resolve its audience "through the SAME `isMemberInSurveyAudience`
 * predicate the read uses". It does — literally: this function's only job is to produce the
 * per-member `MemberGeoNode` the predicate needs and then ASK the predicate. It contains no
 * membership rule of its own.
 *
 * ⛔ This is deliberately NOT the 10.5 `resolveAudienceMemberIds` shape, which reimplements the
 * audience as a SQL district-set filter. That gives news two authorities on "who is in the
 * audience" — one for the push, one for the surface read — and they can disagree. Here, a member
 * who is notified is by construction a member the read will show it to.
 *
 * ── No N+1 (AC8: "ONE geo resolution per member, not one per survey per member") ──────────────
 * ONE query returns every candidate member with their current district (the correlated-subquery
 * template below); `liftDistrictThroughTree` is PURE and runs IN MEMORY per member against the
 * ONCE-loaded tree. ⛔ Never `resolveMemberGeoNode` in a loop — that is a query per member.
 *
 * ⚠ `public` / `role` / `cohort` resolve to the EMPTY set through the predicate, which is exactly
 * right and is why there is no special case here: a survey with such a scope notifies nobody, and
 * the domain write path rejects authoring one in the first place.
 * ⚠ A `state`-scoped survey in a Pariwar with no published tree also resolves EMPTY — fail-closed.
 * ⛔ NEVER fall back to `members-all`: turning a targeting mistake into a Pariwar-wide broadcast is
 * the one failure mode worse than notifying nobody (ADR-0038 — no code default geography).
 */
export async function resolveSurveyAudienceMemberIds(
  db: Db,
  pariwarId: PariwarId,
  audienceScope: SurveyAudienceScope,
  scopeValue: string | null,
  geo: { tree: LoadedGeoTree | null; now: Date },
  logger?: SurveyAudienceLogger,
): Promise<MemberId[]> {
  // `members-all` needs no geography at all, so the district subquery is skipped entirely — the
  // common case pays nothing. (Asking the predicate anyway would be one call per member for an arm
  // that is constant; the predicate is still the authority for every arm that depends on data.)
  if (audienceScope === 'members-all') {
    const rows = await db
      .select({ memberId: members.memberId })
      .from(members)
      .where(and(eq(members.pariwarId, pariwarId), inArray(members.state, [...SURVEY_DISPATCH_MEMBER_STATES])));
    return rows.map((r) => r.memberId);
  }

  // ⭐ THE CORRELATED SUBQUERY USES **LITERAL** OUTER-TABLE QUALIFIERS, and that is not a style
  // choice — it is the fix for a live bug. Interpolating the `members.memberId` Column object here
  // renders as a BARE `"member_id"` (Drizzle drops the table prefix inside a projection scoped to
  // that table), and because the subquery's own `FROM member_postings p` has a column of that exact
  // name, Postgres binds it to the INNER `p.member_id` (nearest scope wins), collapsing the
  // correlation into an always-true tautology — a reproducible wrong-district bug DB-free tests
  // cannot see ([[project_epic6_drizzle_correlated_subquery_bug]]).
  //
  // ⚠ The `ORDER BY p.created_at DESC, p.posting_id DESC` tie-break is the SAME D3 rule
  // `member-geo/resolve.ts`'s `getMemberCurrentDistrict` implements via Drizzle's `.orderBy()`.
  // Change one, check the other. ⛔ NOT a freshly-invented `DISTINCT ON` (the 42P10 trap).
  //
  // ⛔ NO `.limit()` — the domain-accessor-invariants gate clamps every DYNAMIC limit; it does not
  // require one to exist, and a fan-out that silently truncated its audience would drop real members
  // from a real notification.
  const rows = await db
    .select({
      memberId: members.memberId,
      district: sql<string | null>`(
        SELECT p.district
        FROM ${memberPostings} p
        WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
          AND p.created_at <= ${geo.now}
        ORDER BY p.created_at DESC, p.posting_id DESC
        LIMIT 1
      )`,
    })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), inArray(members.state, [...SURVEY_DISPATCH_MEMBER_STATES])));

  return rows
    .filter((r) =>
      // PURE + in-memory: the lift consults the once-loaded tree, and the PREDICATE decides.
      isMemberInSurveyAudience(
        audienceScope,
        scopeValue,
        liftDistrictThroughTree(pariwarId, r.district, geo.tree),
        logger,
      ),
    )
    .map((r) => r.memberId);
}

/** Has this member already answered this survey? The member route's idempotency/replay precondition. */
export async function hasMemberResponded(
  db: Db,
  pariwarId: PariwarId,
  surveyId: SurveyId,
  memberId: MemberId,
): Promise<boolean> {
  const rows = await db
    .select({ surveyId: surveyResponses.surveyId })
    .from(surveyResponses)
    .where(
      and(
        eq(surveyResponses.pariwarId, pariwarId),
        eq(surveyResponses.surveyId, surveyId),
        eq(surveyResponses.memberId, memberId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * The aggregate results read (AC7).
 *
 * ⛔ THE PROJECTION IS THE SHIELD: this selects `answers` ONLY — `member_id` is not in the select
 * list, and the pure `aggregateResponses` it folds through returns a type with nowhere to put one.
 * Asserted by a test that inspects the RETURNED SHAPE, not by inspection.
 *
 * ⚠ Deliberately fetches rows and folds in TypeScript rather than aggregating in SQL. A SQL
 * `jsonb_array_elements` roll-up would be faster at scale, and it would also be a SECOND
 * implementation of the counting rules (zero-vote options present, unknown ids skipped, per-question
 * `answered_count`) written in a language the unit tests cannot reach. One authority, unit-tested,
 * beats two — and a survey's response set is bounded by the Pariwar's membership, not by time.
 * ⚠ If this is ever moved into SQL, mind the Drizzle correlated-subquery trap: interpolating an outer
 * `Column` into a same-named-column subquery collapses correlation into a tautology, and DB-free
 * tests cannot catch it ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export async function getSurveyAggregate(
  db: Db,
  pariwarId: PariwarId,
  surveyId: SurveyId,
): Promise<SurveyAggregate> {
  const survey = await getSurveyOrThrow(db, pariwarId, surveyId);
  const rows = await db
    .select({ answers: surveyResponses.answers })
    .from(surveyResponses)
    .where(and(eq(surveyResponses.pariwarId, pariwarId), eq(surveyResponses.surveyId, surveyId)));
  return aggregateResponses(survey.questions, rows, survey.responseThreshold);
}

export interface ListFreeTextAnswersOptions {
  limit?: number;
  offset?: number;
}

/**
 * The free-text answers to ONE question, UNATTRIBUTED (AC7, LBD-3).
 *
 * ⛔ THE PROJECTION IS THE WHOLE POINT, and every absence in it is deliberate:
 *   · no `member_id`   — the obvious one;
 *   · no row id        — `survey_responses` has no surrogate key at all (see `ids/index.ts`), so there
 *     is nothing to accidentally expose;
 *   · no `question_id` — the caller asked about one question and gets exactly those answers; echoing
 *     the id back would add nothing except a correlation key across a multi-question read;
 *   · no ordinal       — ⭐ the ORDER BY is `submitted_at` alone, with NO tie-break on any
 *     row-identifying column. A `member_id` tie-break would reconstruct submission identity through
 *     the sort itself: two reads of two different questions, ordered identically, would align one
 *     member's answers row-for-row. The cost is that answers submitted in the same instant have an
 *     unstable relative order across reads — which is the correct trade, because a stable order here
 *     IS the identity leak.
 *
 * ⚠ Free text is PII tier 3 at best: never logged, never in an audit payload, and never exported in
 * v1 (Escalation 4 names Story 10.7's reports library as the owning seam if an export is ever wanted).
 * The CALLER writes a `survey.responses_viewed` audit line carrying the survey id and a COUNT —
 * ⛔ never the answer content.
 */
export async function listFreeTextAnswers(
  db: Db,
  pariwarId: PariwarId,
  surveyId: SurveyId,
  questionId: string,
  opts: ListFreeTextAnswersOptions = {},
): Promise<SurveyFreeTextAnswer[]> {
  // The `answers` JSONB is an ARRAY of per-question answers, so the free text for one question is
  // extracted by a containment-filtered element lookup. `jsonb_path_query_first` returns the first
  // (and, per `validateAnswers`' duplicate check, only) element whose `question_id` matches.
  const answerText = sql<string | null>`
    jsonb_path_query_first(
      ${surveyResponses.answers},
      '$[*] ? (@.question_id == $qid).answer_text',
      jsonb_build_object('qid', ${questionId}::text)
    ) #>> '{}'
  `;
  const rows = await db
    .select({ answerText, submittedAt: surveyResponses.submittedAt })
    .from(surveyResponses)
    .where(and(eq(surveyResponses.pariwarId, pariwarId), eq(surveyResponses.surveyId, surveyId)))
    // ⛔ NO tie-break column — see the doc block above. This is the one place in the codebase where a
    // non-deterministic sort is the CORRECT choice.
    .orderBy(asc(surveyResponses.submittedAt))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }))
    .offset(opts.offset ?? 0);

  // A member who skipped this question (or answered a choice question) yields null — dropped here
  // rather than in SQL so the page size stays predictable for the caller.
  return rows
    .filter((r): r is { answerText: string; submittedAt: Date } => typeof r.answerText === 'string')
    .map((r) => ({ answer_text: r.answerText, submitted_at: r.submittedAt }));
}
