// Survey audience PREDICATE — Story 10.15 (Task 3; AC5, Load-Bearing Decision 7).
//
// A structural PORT of `banners/audience.ts` (Story 10.9 D4) with ONE arm deliberately INVERTED.
// ⚠ IF YOU KNOW THE BANNER PREDICATE, READ THE NEXT PARAGRAPH BEFORE ASSUMING THE POLARITY CARRIED
// OVER — it did not, and a reader who assumes it did will introduce an unauthenticated respondent.
//
// ── ⭐ `public` DENIES HERE. 10.9 ALLOWS IT. THAT DIFFERENCE IS DELIBERATE (LBD-7) ─────────────
//   · 10.5 `resolveAudienceMemberIds`: `public` → the EMPTY member set (a public post renders on the
//     web; no member push).
//   · 10.9 `isMemberInBannerAudience`: `public` → **TRUE**. A public banner WIDENS who else may see
//     it (Story 11a.5's `<NoticeboardStrip>` extends the same rows to unauthenticated visitors); it
//     never narrows the banner away from members.
//   · 10.15 (here): `public` → **FALSE**. A SURVEY IS NOT A BANNER. There is no unauthenticated
//     survey surface, `apps/public` gets nothing from this story, and RESPONDING REQUIRES A MEMBER
//     SESSION BY DEFINITION. "Public" cannot mean "also visible to anonymous visitors" when an
//     anonymous visitor has no way to answer and no identity to enforce one-response-per-member
//     against (LBD-6). It would mean "shown to people who cannot participate", which is not a widening
//     — it is a broken affordance.
//
// `public` remains in `SURVEY_AUDIENCE_SCOPES` ONLY so the enum vocabulary stays legible beside
// `banner_audience_scope` / `news_audience_scope`. ⚠ A scope that can be AUTHORED but can never
// RESOLVE is a trap — an admin publishes, the fan-out reaches nobody, the survey collects nothing,
// and no error is raised anywhere. So the domain WRITE path additionally rejects it with a typed 422
// (`SurveyAudienceUnsupportedError`), and BOTH halves are asserted by test.
//
// ── ⭐ `state` RESOLVES (Story 1.19). `role` / `cohort` DO NOT, AND THE TWO ARE NOT THE SAME ────
// ⛔ Do not collapse these arms into one pointer — their dispositions genuinely differ:
//
//   · `state`           → **DELIVERED by Story 1.19.** The member's district is read from
//     `member_postings` and LIFTED through Story 1.18's published tree
//     (`memberGeo.resolveMemberGeoNode`). The RESOLVED value is injected here by the caller.
//   · `role` / `cohort` → **NOT ADDRESSED, and no story owns them.** There is NO member `role` or
//     `cohort` attribute at ANY layer — `schema/members.ts` carries only `state` (LIFECYCLE, not
//     geography) + `pariwar_id`. ⚠ A *different* situation from the one `state` was in: `state` was
//     "resolvable, not yet wired"; these are "there is nothing to resolve against". Decision
//     `2026-08-13-103` D8 deliberately MINTED NO SUCCESSOR — an owner minted for work nobody has
//     asked for is an un-gated re-commitment that decays
//     ([[feedback_record_unattested_no_backfill]]). **Re-trigger: the first surface that must target
//     members by `role` or `cohort`, arriving WITH ITS LIVE REQUIREMENT ATTACHED.**
//     ⛔ Do NOT re-point these at Story 10.8 (it is `done`, and its "cohort" is a FLAG-TARGETING tag,
//     not a member attribute) or at Story 12.2 (a CONSUMER of the filter, not the OWNER of the
//     attribute).
//
// ── ⭐ THE `resolveMemberGeoNode` RE-EXAMINATION TRIGGER — EVALUATED, DOES NOT FIRE ────────────
// `member-geo/index.ts` carries a standing trigger: *"The first authorization or routing consumer of
// `resolveMemberGeoNode` requires reassessment."* This module consumes it (the `state` arm), so the
// trigger was EVALUATED rather than ignored. **It does not fire**, and that file says why: a
// member-attribution read is not an authorization decision — it answers "which audience is this
// member in", which no permission check consults. A survey audience is the SAME CLASS OF CONSUMER as
// the 10.9 banner audience: it selects who is SHOWN something and who is NOTIFIED; it grants nothing
// and gates no permission check. The non-firing is recorded in that file's trigger list, because a
// deleted trigger is indistinguishable from a forgotten one.

import type { MemberGeoNode } from '../member-geo/types.js';
import type { SurveyAudienceScope } from '../schema/surveys.js';

/** Optional structured-log sink so the seam note is observable in tests + prod without a console dep. */
export interface SurveyAudienceLogger {
  info(message: string, context?: Record<string, unknown>): void;
}

const defaultLogger: SurveyAudienceLogger = {
  info(message, context) {
    console.info('[survey-audience]', message, context ? JSON.stringify(context) : '');
  },
};

/**
 * PURE: is an authenticated MEMBER of this Pariwar in this survey's audience? `members-all` → true;
 * `public` → **false** (see the header — the OPPOSITE of 10.9, deliberately); `state` → resolves
 * against the member's geo; `role`/`cohort` → false + a logged seam note.
 *
 * ── ⛔ WHY `memberGeo` IS A RESOLVED VALUE AND NOT A `Db` HANDLE ───────────────────────────────
 * This predicate is **PURE and SYNCHRONOUS**, and it is called inside a `.filter()` (read.ts) and
 * once per member in the fan-out worker. A `Db` argument would make the filter async and issue ONE
 * QUERY PER CANDIDATE — the exact N+1 AC8 forbids ("ONE geo resolution per member, not one per survey
 * per member"). So the caller resolves the member's geo ONCE, before filtering, and injects the
 * result here. Same split Story 1.18 used for `hasPermission`/`GeoTreeResolver`.
 * ⛔ Never load geo inside the filter. ⛔ Never make this function async.
 *
 * ⭐ ONE AUTHORITY, TWO CONSUMERS: the member READ and the publish FAN-OUT both call this exact
 * function (AC8). A second "who gets notified" resolver would be a second definition of the audience,
 * and the two would drift the first time either changed.
 *
 * `memberGeo` defaults to `null` — meaning *"the caller resolved no geo"* — under which `state` denies.
 */
export function isMemberInSurveyAudience(
  audienceScope: SurveyAudienceScope,
  scopeValue: string | null = null,
  memberGeo: MemberGeoNode | null = null,
  logger: SurveyAudienceLogger = defaultLogger,
): boolean {
  switch (audienceScope) {
    case 'members-all':
      return true;
    case 'public':
      // ⭐ FALSE — the LBD-7 inversion. `public` is additionally rejected at the write path, so a
      // published survey should never carry this scope; the log fires only if one somehow did (a
      // pre-existing row, a raw SQL write), and it is deliberately worded so a reader who expects
      // 10.9's polarity understands immediately that this is a decision, not a bug.
      logger.info('public is not a survey audience; there is no unauthenticated respondent', {
        audience_scope: audienceScope,
      });
      return false;
    case 'state': {
      // ⭐ RESOLVED (Story 1.19). ⛔ FAIL-CLOSED at every uncertain step: no resolved geo, a
      // TYPED-ABSENT state (no posting row / no published tree / district not in the tree / no
      // ancestor), or a survey with no scope value — all deny. A member whose geo cannot be
      // established is in NO state audience, never in ALL of them.
      const memberState = memberGeo?.state;
      if (scopeValue === null) {
        // The survey itself is missing `audience_scope_value` — a data problem, not a member-geo
        // problem. Kept distinct from the branch below so a log reader can grep by ACTUAL cause
        // (Story 1.19 D6's closed-vocabulary discipline). The write path rejects this case up front
        // (`SurveyAudienceValueRequiredError`), so this arm is the belt to that braces.
        logger.info('state-scoped survey denied — survey has no audience_scope_value', {
          audience_scope: audienceScope,
        });
        return false;
      }
      if (!memberState?.available) {
        logger.info('state-scoped survey denied — member geo unresolved', {
          audience_scope: audienceScope,
          audience_scope_value: scopeValue,
          // The CLOSED reason vocabulary (Story 1.19 D6), so this log is greppable by cause.
          member_geo_absence_reason: memberState ? memberState.reason : null,
        });
        return false;
      }
      // ⛔ BYTE-IDENTICAL comparison — case-SENSITIVE, untrimmed. Agrees with
      // `geo-tree/resolver.ts:20-31` and `rbac/scope.ts:241`; normalizing on one side only would
      // produce a same-request contradiction.
      return memberState.value === scopeValue;
    }
    case 'role':
    case 'cohort':
      // ⛔ NOT the same disposition as `state`, and NOT the same as `public` either — hence a third,
      // differently-worded note. `public` is "resolvable but wrong for this surface"; these are
      // "there is nothing to resolve against at any layer".
      logger.info('audience selector not resolvable — no member role/cohort attribute exists at any layer', {
        audience_scope: audienceScope,
        audience_scope_value: scopeValue,
      });
      return false;
    default: {
      // Exhaustiveness guard — a new scope must add its own arm (the banners/news-blog pattern).
      const _exhaustive: never = audienceScope;
      return _exhaustive;
    }
  }
}

/**
 * The audience scopes that resolve to a real survey audience TODAY. Exported so the admin console can
 * render the "not yet targetable" indicator from the same authority the read uses, rather than
 * hard-coding a second list that could drift.
 *
 * ⚠ ⭐ NOTE THE ABSENCE OF `'public'` — `BANNER_TARGETABLE_AUDIENCE_SCOPES` contains it and this list
 * must NOT. That is the LBD-7 inversion showing up in the admin console: a survey author is told
 * `public` is not targetable, where a banner author is told it is.
 *
 * Two consumers, pinned together: this module (the read-time predicate's authority) and
 * `@twt/contracts`' `SURVEY_TARGETABLE_AUDIENCE_SCOPES` (the browser mirror the admin console reads),
 * held by an ORDER-SENSITIVE `toEqual` sync-guard — so both lists must change in the SAME POSITION or
 * the guard fails on ordering.
 */
export const SURVEY_TARGETABLE_AUDIENCE_SCOPES: readonly SurveyAudienceScope[] = ['members-all', 'state'];
