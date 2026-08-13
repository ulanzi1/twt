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
// ── ⭐ `state` RESOLVES (Story 1.19). `role` / `cohort` DO NOT — NOT THE SAME PROBLEM ───────────
// ⛔ Do not collapse these arms into one pointer: they have genuinely different dispositions.
//
//   · `state`            → **DELIVERED by Story 1.19.** The district set beneath the target state is
//     computed IN MEMORY from Story 1.18's published tree, and ONE bounded query selects the members
//     whose NEWEST posting district falls in it. Typed-absent, never guessed; a member with no
//     posting row resolves to NO geo and is read as "in no audience", never "in all" — FAIL-CLOSED.
//   · `role` / `cohort`  → **NOT ADDRESSED, and no story owns them.** There is NO member `role` or
//     `cohort` attribute at ANY layer — the `members` table carries only `state` (LIFECYCLE, not
//     geography) + `pariwar_id` (schema/members.ts). ⚠ This is a DIFFERENT situation from the one
//     `state` was in: `state` was "resolvable, not yet wired"; these are "there is nothing to
//     resolve against". Story 1.19 verified at `9fa4e31` that no story owns the attribute and
//     deliberately MINTED NO SUCCESSOR (Decision `2026-08-13-103`, D8).
//     **Re-trigger: the first surface that must target members by `role` or `cohort`** — that
//     surface raises it WITH ITS LIVE REQUIREMENT ATTACHED.
//     ⛔ Do NOT re-point these at Story 10.8 (`done`; its "cohort" is a FLAG-TARGETING tag, not a
//     member attribute — a pointer at a `done` story reads as already-delivered) or Story 12.2 (a
//     CONSUMER of the filter, not the OWNER of the attribute).
//     They resolve to the empty set + a logged note
//     ([[project_rbac_geo_scope_containment]] "resolve only what exists" discipline).

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { LoadedGeoTree } from '../geo-tree/resolver.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { districtsBeneathState } from '../member-geo/resolve.js';
import { type MemberLifecycleState, members } from '../schema/members.js';
import { memberPostings } from '../schema/member_postings.js';
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
 * `public` → `[]`; `state` → the active/in-grace members whose newest posting district sits beneath
 * the target state in the published tree; `role`/`cohort` → `[]` + a logged note. The caller (the
 * pg-boss publish worker) builds one `alert_published` alert per returned id and fans out on the
 * post's selected channels.
 *
 * ⚠ `geo` is OPTIONAL by design (the Story 1.18 `BulkActorContext`/`ReportScopeCtx` posture): every
 * existing caller keeps today's behaviour with no edit, because a caller that supplies none resolves
 * `state` to the empty set — exactly as before. That is what let this land without a flag day.
 *
 * ⛔ `tree` and `now` travel TOGETHER in one object rather than as two optional positionals, and
 * that is deliberate. `now` must be INJECTED — this module may never call `new Date()`
 * (`banners/read.ts:6-7`) — and an optional `now` would need a clock default to fall back on. More
 * importantly, the READ-TIME banners predicate bounds the newest-posting lookup by its own `now`; if
 * this dispatch selector did not, the two consumers could DISAGREE about a member's current
 * district, dispatching a post to someone the banner predicate then denies. Binding them into one
 * argument makes supplying a tree without an instant unrepresentable.
 */
export interface NewsAudienceGeoContext {
  /** The in-force tree, loaded ONCE by the caller on its own scoped tx. `null` = none published. */
  tree: LoadedGeoTree | null;
  /** The dispatch instant; bounds the newest-posting lookup so it is as-of correct. */
  now: Date;
}

export async function resolveAudienceMemberIds(
  db: Db,
  pariwarId: PariwarId,
  audienceScope: NewsAudienceScope,
  scopeValue: string | null,
  logger: AudienceResolveLogger = defaultLogger,
  geo?: NewsAudienceGeoContext,
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
    case 'state': {
      // ── Step 1: the district set, computed IN MEMORY from the in-force tree ──────────────────
      // ⛔ There is nothing to join to in SQL — the tree is a JSONB DOCUMENT, not a table. It is
      // bounded by `MAX_NODES = 5000` (`geo-tree/document.ts:29`), so this pass is cheap and runs
      // ONCE per dispatch, never per member.
      const districts =
        scopeValue === null || geo === undefined ? [] : districtsBeneathState(geo.tree, scopeValue);

      // ── Step 2: an empty set is "NO AUDIENCE" ───────────────────────────────────────────────
      // ⛔ NEVER fall back to `members-all`. A Pariwar with no published tree, an unknown state, or
      // a state with no districts beneath it must dispatch to NOBODY — turning a targeting mistake
      // into a Pariwar-wide broadcast is the one failure mode worse than sending nothing.
      //
      // ⚠ `geo === undefined` is re-tested here rather than inferred from `districts.length === 0`.
      // The two conditions coincide today, but only the explicit test lets the compiler prove
      // `geo.now` is defined below — and an inference that happens to hold is not a guarantee.
      if (geo === undefined || districts.length === 0) {
        logger.info('state-scoped dispatch resolved to an EMPTY audience — fail-closed', {
          pariwar_id: pariwarId,
          audience_scope: audienceScope,
          audience_scope_value: scopeValue,
          // Distinguishes "no tree published" from "tree published, but this state is not in it".
          geo_tree_version: geo?.tree?.version ?? null,
        });
        return [];
      }

      // ── Step 3: ONE query, no N+1 (AC7) ─────────────────────────────────────────────────────
      // ⭐ THE CORRELATED SUBQUERY USES **LITERAL** OUTER-TABLE QUALIFIERS, and that is not a style
      // choice — it is the fix for a live bug. Interpolating the `members.memberId` Column object
      // here renders as a BARE `"member_id"` (Drizzle drops the table prefix inside a projection
      // scoped to that table), and because the subquery's own `FROM member_postings p` has a column
      // of that exact name, Postgres binds it to the INNER `p.member_id` (nearest scope wins),
      // collapsing the correlation into an always-true tautology. The subquery would then return
      // the latest posting across EVERY member in the tenant — a reproducible ~30-40% wrong-district
      // bug that DB-free tests cannot see ([[project_epic6_drizzle_correlated_subquery_bug]];
      // `claim/peer-mesh-read.ts:60-73`, the proven template this copies).
      //
      // ⚠ The `ORDER BY p.created_at DESC, p.posting_id DESC` tie-break below is the SAME D3 rule
      // `member-geo/resolve.ts`'s `getMemberCurrentDistrict` implements via Drizzle's `.orderBy()` —
      // a second, independent copy in raw SQL. Change one, check the other (`resolve.ts:30-42`).
      //
      // ⛔ NOT a freshly-invented `DISTINCT ON`: that additionally carries the 42P10 trap (the
      // `ORDER BY` must lead with the `DISTINCT ON` expressions).
      //
      // ⛔ NO `.limit()` — mirrors the `members-all` arm above. The domain-accessor-invariants gate
      // clamps every DYNAMIC `.limit()`; it does not require one to exist, and a fan-out that
      // silently truncated its audience would drop real members from a real announcement.
      const rows = await db
        .select({ memberId: members.memberId })
        .from(members)
        .where(
          and(
            eq(members.pariwarId, pariwarId),
            inArray(members.state, [...NEWS_DISPATCH_MEMBER_STATES]),
            inArray(
              sql`(
                SELECT p.district
                FROM ${memberPostings} p
                WHERE p.member_id = "members"."member_id" AND p.pariwar_id = "members"."pariwar_id"
                  AND p.created_at <= ${geo.now}
                ORDER BY p.created_at DESC, p.posting_id DESC
                LIMIT 1
              )`,
              districts,
            ),
          ),
        );
      // ⭐ A member with NO posting row yields a NULL subquery result, and `NULL IN (...)` is NULL,
      // never TRUE — so they are excluded. Fail-closed falls out of SQL's own semantics here, but it
      // is asserted by test rather than left to be inferred.
      return rows.map((r) => r.memberId);
    }
    case 'role':
    case 'cohort':
      // ⛔ NOT the same disposition as `state` — see the file header. No member attribute exists at
      // any layer, so there is nothing to resolve against; this is not "not yet wired".
      logger.info('audience selector not resolvable — no member attribute exists', {
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
