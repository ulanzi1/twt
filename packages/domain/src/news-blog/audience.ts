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
// selector is a DOCUMENTED SEAM: resolve to the empty set + a logged "not yet resolvable" note
// ([[project_rbac_geo_scope_containment]] "resolve only what exists" discipline).
//
// ── ⛔ THE OWNER IS **STORY 1.19**, NOT STORY 1.18. THE TWO ARMS ARE NOT THE SAME PROBLEM. ──────
// This seam used to name Story 1.18. Story 1.18 SHIPPED (the geo-tree scope resolver, ADR-0038) and
// it does NOT light this up — a tree answers *"is Patna in Bihar"*, and it cannot answer *"which
// members are in Patna"*. That needs a per-MEMBER geo attribute, which does not exist: audience
// SELECTION and authorization CONTAINMENT are different capabilities that happen to share the word
// "geo". Leaving this pointing at a completed story would be worse than pointing at an epic — it
// would read as already-delivered.
//   · `state`            → **Story 1.19: Member Geo Attribution + Geo Audience Consumer**, which
//     builds member→district attribution ON TOP of Story 1.18's tree and wires THIS selector
//     end-to-end (its AC3). Typed-absent, never guessed; a member with no posting row resolves to
//     NO geo and is read as "in no audience", never "in all" — fail-closed.
//   · `role` / `cohort`  → NO member attribute exists for either, at any layer. They stay seamed
//     under **Story 1.19 AC4**, which owns them explicitly as a separate question from the geo arm.
// ⛔ Do not collapse the three arms into one pointer: 1.19 delivers the geo arm and merely OWNS the
// other two.

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
