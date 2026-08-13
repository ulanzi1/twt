// Banner audience PREDICATE — Story 10.9 (AC7 seam, Load-Bearing Decision 4).
//
// ⚠ This is a read-time VISIBILITY PREDICATE, not a dispatch resolver. Story 10.5's
// `resolveAudienceMemberIds` answers "which members do we PUSH to"; this answers "may THIS member
// see this banner". The shape of the seam is inherited from 10.5 Decision 4; the `public` POLARITY
// is deliberately INVERTED relative to it, and that difference is load-bearing:
//
//   · 10.5 `public` → the EMPTY member set (a public post renders on the web; no member push).
//   · 10.9 `public` → **true**. A `public` banner WIDENS who else may see it (Story 11a.5's
//     `<NoticeboardStrip>` extends the same rows to unauthenticated visitors); it never narrows the
//     banner away from members. Returning false here would make "public" mean "members excluded",
//     which is the opposite of what the word means to the admin authoring it.
//
// ── ⭐ `state` RESOLVES (Story 1.19). `role` / `cohort` DO NOT, AND THE TWO ARE NOT THE SAME ────
// ⛔ Do not collapse these arms into one pointer — they have genuinely different dispositions:
//
//   · `state`           → **DELIVERED by Story 1.19.** The member's district is read from
//     `member_postings` and LIFTED through Story 1.18's published tree
//     (`memberGeo.resolveMemberGeoNode`). The RESOLVED value is injected into this predicate by
//     `listMemberBannerCandidates`; see the D4 note on `isMemberInBannerAudience` below.
//   · `role` / `cohort` → **NOT ADDRESSED, and no story owns them.** There is NO member `role` or
//     `cohort` attribute at ANY layer — the `members` table (schema/members.ts) carries only
//     `state` (LIFECYCLE, not geography) + `pariwar_id`. ⚠ This is a *different* situation from
//     the one `state` was in: `state` was "resolvable, not yet wired"; these are "there is nothing
//     to resolve against". Story 1.19 verified at `9fa4e31` that no story owns the attribute and
//     deliberately MINTED NO SUCCESSOR (Decision `2026-08-13-103`, D8) — an owner minted for work
//     nobody has asked for is an un-gated re-commitment that decays.
//     **Re-trigger: the first surface that must target members by `role` or `cohort`.** That
//     surface raises it WITH ITS LIVE REQUIREMENT ATTACHED.
//     ⛔ Do NOT re-point these at Story 10.8 (it is `done`, and its "cohort" is a FLAG-TARGETING
//     tag, not a member attribute — a pointer at a `done` story reads as already-delivered) or at
//     Story 12.2 (a CONSUMER of the filter, not the OWNER of the attribute).
//   These still resolve FALSE plus a logged seam note
//   ([[project_rbac_geo_scope_containment]] "resolve only what exists").

import type { MemberGeoNode } from '../member-geo/types.js';
import type { BannerAudienceScope } from '../schema/banners.js';

/** Optional structured-log sink so the seam note is observable in tests + prod without a console dep. */
export interface BannerAudienceLogger {
  info(message: string, context?: Record<string, unknown>): void;
}

const defaultLogger: BannerAudienceLogger = {
  info(message, context) {
    console.info('[banner-audience]', message, context ? JSON.stringify(context) : '');
  },
};

/**
 * PURE: is an authenticated MEMBER of this Pariwar eligible to see a banner with this audience
 * scope? `members-all` → true; `public` → true (see the header); `state` → resolves against the
 * member's geo; `role`/`cohort` → false + a logged seam note.
 *
 * ── ⛔ WHY `memberGeo` IS A RESOLVED VALUE AND NOT A `Db` HANDLE (Story 1.19, D4) ───────────────
 * This predicate is **PURE and SYNCHRONOUS**, and it is called inside a `.filter()`
 * (`read.ts:188`). AC3's *"the signature grows a member argument"* must NOT be read as *"grows a
 * `Db` argument"*: that would make the filter async and issue **one query per candidate banner** —
 * the exact N+1 that AC7 forbids in the OTHER consumer. So the caller resolves the member's geo
 * **ONCE**, before filtering, and injects the result here. It is the same split Story 1.18 used for
 * `hasPermission`/`GeoTreeResolver`.
 * ⛔ Never load geo inside the filter. ⛔ Never make this function async.
 *
 * `memberGeo` defaults to `null` — meaning *"the caller resolved no geo"* — under which `state`
 * denies. Every existing call site therefore keeps today's behaviour with no edit.
 */
export function isMemberInBannerAudience(
  audienceScope: BannerAudienceScope,
  scopeValue: string | null = null,
  memberGeo: MemberGeoNode | null = null,
  logger: BannerAudienceLogger = defaultLogger,
): boolean {
  switch (audienceScope) {
    case 'members-all':
      return true;
    case 'public':
      // A `public` banner is visible to members AND (from Story 11a.5) to unauthenticated visitors.
      return true;
    case 'state': {
      // ⭐ RESOLVED (Story 1.19 AC3). ⛔ FAIL-CLOSED at every uncertain step: no resolved geo, a
      // TYPED-ABSENT state (no posting row / no published tree / district not in the tree / no
      // ancestor above it), or a banner with no scope value — all deny. A member whose geo cannot
      // be established is in NO state audience, never in ALL of them.
      const memberState = memberGeo?.state;
      if (!memberState?.available || scopeValue === null) {
        logger.info('state-scoped banner denied — member geo unresolved', {
          audience_scope: audienceScope,
          audience_scope_value: scopeValue,
          // The CLOSED reason vocabulary (Story 1.19 D6), so this log is greppable by cause.
          member_geo_absence_reason: memberState && !memberState.available ? memberState.reason : null,
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
      // ⛔ NOT the same disposition as `state` — see the file header. No member attribute exists at
      // any layer, so there is nothing to resolve against; this is not "not yet wired".
      logger.info('audience selector not resolvable — no member attribute exists', {
        audience_scope: audienceScope,
        audience_scope_value: scopeValue,
      });
      return false;
    default: {
      // Exhaustiveness guard — a new scope must add its own arm (the news-blog audience.ts pattern).
      const _exhaustive: never = audienceScope;
      return _exhaustive;
    }
  }
}

/**
 * The audience scopes that resolve to a real member audience TODAY. Exported so the admin console
 * can render the "not yet targetable" indicator from the same authority the read uses, rather than
 * hard-coding a second list that could drift.
 *
 * ⚠ **THIS LIST HAS THREE CONSUMERS, NOT TWO** (Story 1.19, Escalation 2):
 *   1. this module — the read-time predicate's own authority;
 *   2. `@twt/contracts`' `BANNER_TARGETABLE_AUDIENCE_SCOPES` — the browser mirror the admin console
 *      reads, pinned to this one by an **ORDER-SENSITIVE `toEqual`** sync-guard
 *      (`packages/contracts/tests/banners.test.ts:56-62`), so both lists must change in the SAME
 *      POSITION or the guard fails on ordering;
 *   3. ⭐ `apps/admin/src/modules/banners/derive.ts:171` — the **AC5 visibility verdict**, which is
 *      NOT an indicator: it splices a draft into the live candidate set and decides what the
 *      console tells an author about whether their draft would be **SEEN**.
 *
 * ⭐ `'state'` was added by Story 1.19 when the arm lit up. Consumer (3) means that is a real
 * behaviour change in the admin console — a live `state` banner now COMPETES with a draft for the
 * visibility verdict — and it is asserted by test, not left to be discovered.
 */
export const BANNER_TARGETABLE_AUDIENCE_SCOPES: readonly BannerAudienceScope[] = [
  'public',
  'members-all',
  'state',
];
