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
// `state` / `role` / `cohort` are STORED, tone-reviewed, and listed in the admin console with an
// explicit "not yet targetable" indicator — but they resolve to FALSE plus a logged seam note. The
// `members` table (schema/members.ts) carries only `state` (LIFECYCLE, not geography) + `pariwar_id`
// — there is NO queryable district / designation / cohort attribute to select on
// ([[project_rbac_geo_scope_containment]] "resolve only what exists").
//
// ── ⛔ THE OWNER IS **STORY 1.19**, NOT STORY 1.18. ─────────────────────────────────────────────
// This seam used to name Story 1.18. That story SHIPPED (the geo-tree scope resolver, ADR-0038) and
// does NOT light this up: a tree answers *"is Patna in Bihar"*, never *"which members are in
// Patna"*. Audience SELECTION needs a per-MEMBER geo attribute; authorization CONTAINMENT does not.
//   · `state`           → **Story 1.19**, which builds member→district attribution over Story 1.18's
//     tree and wires this predicate end-to-end (its AC3). ⚠ Story 1.19 AC6 also owns the
//     QUIET-TURN-ON hazard: `state`-scoped rows authored today are visible to NOBODY, and become
//     live the moment the arm resolves — so existing rows get an explicit disposition, not a
//     surprise appearance.
//   · `role` / `cohort` → no member attribute exists at all; owned by **Story 1.19 AC4**.
// ⛔ Do not collapse the three arms into one pointer.

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
 * scope? `members-all` → true; `public` → true (see the header); `state`/`role`/`cohort` → false +
 * a logged seam note.
 *
 * Takes no member row on purpose: neither resolvable scope depends on any member attribute, and the
 * three unresolvable ones have no attribute to depend on. When **Story 1.19**'s member→geo
 * attribution primitive lands, this signature grows a member argument and the `state` arm lights up
 * — the call sites do not move. ⛔ NOT Story 1.18: that story shipped the geo-tree scope RESOLVER
 * (which answers "is Patna in Bihar") and deliberately did not supply member attribution (which
 * would answer "which members are in Patna"). `role`/`cohort` have no attribute at all and stay
 * seamed under Story 1.19 AC4.
 */
export function isMemberInBannerAudience(
  audienceScope: BannerAudienceScope,
  scopeValue: string | null = null,
  logger: BannerAudienceLogger = defaultLogger,
): boolean {
  switch (audienceScope) {
    case 'members-all':
      return true;
    case 'public':
      // A `public` banner is visible to members AND (from Story 11a.5) to unauthenticated visitors.
      return true;
    case 'state':
    case 'role':
    case 'cohort':
      // Documented seam (Decision 4): no queryable member attribute exists to select on yet.
      logger.info('audience selector not yet resolvable — banner visible to nobody', {
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
 */
export const BANNER_TARGETABLE_AUDIENCE_SCOPES: readonly BannerAudienceScope[] = ['public', 'members-all'];
