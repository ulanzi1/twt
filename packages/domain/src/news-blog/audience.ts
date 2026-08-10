// News/Blog audience member-resolution — Story 10.5 (AC5, Load-Bearing Decision 4).
//
// Resolves which MEMBERS a published post dispatches to, per its `audience_scope`. Only two scopes
// are fully wireable today:
//   · `members-all` → every active/in-grace member in the Pariwar (the states that count as
//     "reachable/valid" — the [[project_assignability_predicate_is_isvalid_only]] "incl.
//     active-in-grace" authority, i.e. `VALID_STATES`). NOT a single-state scan (that would silently
//     drop grace members). NOTE: this is a LIFECYCLE-state scan and is deliberately moderation-blind —
//     it is neither `is_valid` (coverage) nor `is_assignable` (roster), which Story 10.17 split apart;
//     a suspended member still receives Pariwar news, which is the intended reach.
//   · `public`      → the EMPTY member set: a public post renders on apps/public (web), no push.
//
// `state` / `role` / `cohort` are STORED + rendered + they DRIVE the bilingual requirement, but the
// `members` table carries only `state` (LIFECYCLE, not geography) + `pariwar_id` (schema/members.ts)
// — there is NO queryable district / designation / cohort attribute to filter on. So their dispatch
// selector is a DOCUMENTED SEAM: resolve to the empty set + a logged "not yet resolvable" note, and
// they light up for free when Story 1.18's geo / a member-designation attribute lands ([[project_rbac_
// geo_scope_containment]] "resolve only what exists" discipline). Fabricating an attribute now would
// collide with Story 1.18 (Geo-Tree Scope Resolver)'s geo.

import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberLifecycleState, members } from '../schema/members.js';
import type { NewsAudienceScope } from '../schema/news_posts.js';

/**
 * The member lifecycle states that count as a live dispatch target for `members-all` — `active` and
 * its in-grace sub-state. This is the "who is reachable" authority (a grace member is still a
 * member and still gets announcements); a raw `state = 'active'` scan would wrongly exclude them.
 */
export const NEWS_DISPATCH_MEMBER_STATES: readonly MemberLifecycleState[] = ['active', 'active-in-grace'];

/** Optional structured-log sink so the seam note is observable in tests + prod without a console dep. */
export interface AudienceResolveLogger {
  info(message: string, context?: Record<string, unknown>): void;
}

const defaultLogger: AudienceResolveLogger = {
  info(message, context) {
    console.info('[news-audience]', message, context ? JSON.stringify(context) : '');
  },
};

/**
 * Resolve the member ids a published post dispatches to. `members-all` → active/in-grace member ids;
 * `public` → `[]`; `state`/`role`/`cohort` → `[]` + a logged seam note (Decision 4). The caller
 * (the pg-boss publish worker) builds one `alert_published` alert per returned id and fans out on
 * the post's selected channels.
 */
export async function resolveAudienceMemberIds(
  db: Db,
  pariwarId: PariwarId,
  audienceScope: NewsAudienceScope,
  scopeValue: string | null,
  logger: AudienceResolveLogger = defaultLogger,
): Promise<MemberId[]> {
  switch (audienceScope) {
    case 'members-all': {
      const rows = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(and(eq(members.pariwarId, pariwarId), inArray(members.state, [...NEWS_DISPATCH_MEMBER_STATES])));
      return rows.map((r) => r.memberId);
    }
    case 'public':
      // Public posts render on apps/public (web); no member push.
      return [];
    case 'state':
    case 'role':
    case 'cohort':
      // Documented seam (Decision 4): no queryable member attribute exists to select on yet.
      logger.info('audience selector not yet resolvable — dispatching to empty set', {
        pariwar_id: pariwarId,
        audience_scope: audienceScope,
        audience_scope_value: scopeValue,
      });
      return [];
    default: {
      // Exhaustiveness guard — a new scope must add its own arm.
      const _exhaustive: never = audienceScope;
      return _exhaustive;
    }
  }
}
