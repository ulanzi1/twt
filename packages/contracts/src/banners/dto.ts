// Banner/Popup transport DTOs — Story 10.9 (Task 3; AC1/AC3/AC5/AC8).
//
// Pure Zod, `.strict()` throughout, snake_case wire (domain camelCase — watch the
// [[project_story_validate_footguns]] drift: `display_mode`/`displayMode`, `valid_from`/`validFrom`,
// `display_once_per_member`/`displayOncePerMember`, `body_hi`/`bodyHi`). NO `@twt/domain` import
// (the RN Metro bundle boundary).
//
// ── Two audiences, two shapes ────────────────────────────────────────────────────────────────
// `BannerResponse` is the ADMIN console shape: the full authoring row plus the DERIVED display
// state. `MemberBannerResponse` is the member-app shape and deliberately carries NO actor ids, NO
// tone-signoff fields, NO `audience_scope_value` and NO `status` — a member surface has no business
// knowing who authored a banner, who reviewed it, or which internal cohort it was aimed at.
//
// ── The member LIST is a RESOLVED pair, not an array ─────────────────────────────────────────
// `MemberBannerListResponse` carries `{ banner, popup }` — at most one of each, resolved SERVER-side
// by the pure `resolveVisibleBanners` (Decision 3) so every client agrees on the winner rather than
// each re-implementing the precedence rules. Both may be non-null at once: the two display modes are
// independent lanes (AC5).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import {
  BannerAudienceScope,
  BannerDismissalKind,
  BannerDisplayMode,
  BannerDisplayState,
  BannerSeverity,
  BannerStatus,
} from './enums.js';

/** Copy length bounds — a banner is chrome, not an article; deliberately tighter than a news post. */
const Title = z.string().min(1).max(200);
const Body = z.string().min(1).max(2_000);
const AudienceScopeValue = z.string().min(1).max(120);

/** The Decision 4 scopes that need a discriminator value to (eventually) resolve against. */
const AUDIENCE_SCOPES_REQUIRING_VALUE: readonly BannerAudienceScope[] = ['state', 'role', 'cohort'];

/**
 * Ties `audience_scope_value` to `audience_scope` (Decision 4): required for the three scopes that
 * need a discriminator (`state`/`role`/`cohort` — a discriminator with nothing to discriminate is
 * authoring nonsense), and forbidden for `public`/`members-all` (there's nothing to discriminate —
 * a stray value there is either a copy-paste leftover from a scope change or a client bug). Only
 * checked when `audience_scope` is present in THIS request: on a PATCH that doesn't touch
 * `audience_scope`, whether the existing scope needs a value is a question about the stored row,
 * not this payload.
 *
 * ⭐ **The rule below is UNCHANGED by Story 1.19, and that is the point.** `state`'s value is now
 * genuinely CONSUMED — the member read compares it against the member's resolved geography — but it
 * was always REQUIRED, so no validation moves. `role`/`cohort` still require a value that nothing
 * consumes, because no member attribute exists to compare it to (Story 1.19 D8, "Not addressed").
 * ⚠ The three are no longer uniform in meaning even though they remain uniform in validation; do
 * not "simplify" this list on the assumption that they are still the same case.
 */
function checkAudienceScopeValue(
  val: { audience_scope?: BannerAudienceScope; audience_scope_value?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (val.audience_scope === undefined) return;
  const requiresValue = AUDIENCE_SCOPES_REQUIRING_VALUE.includes(val.audience_scope);
  if (requiresValue && !val.audience_scope_value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['audience_scope_value'],
      message: `audience_scope_value is required when audience_scope is '${val.audience_scope}'`,
    });
  }
  if (!requiresValue && val.audience_scope_value != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['audience_scope_value'],
      message: `audience_scope_value must be omitted when audience_scope is '${val.audience_scope}'`,
    });
  }
}

// ── Requests ───────────────────────────────────────────────────────────────────

/**
 * Create a banner draft (POST …/banners). The author is the session actor (never client-supplied).
 * Copy is OPTIONAL here — a draft may be authored incrementally; all four fields become mandatory at
 * publish (AC6). The window and `display_mode`/`dismissible` are mandatory from the start: they are
 * what the two DB CHECKs constrain, and a row without them could not exist.
 */
export const CreateBannerRequest = z
  .object({
    title: Title.nullish(),
    body: Body.nullish(),
    title_hi: Title.nullish(),
    body_hi: Body.nullish(),
    audience_scope: BannerAudienceScope,
    audience_scope_value: AudienceScopeValue.nullish(),
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    display_mode: BannerDisplayMode,
    dismissible: z.boolean(),
    display_once_per_member: z.boolean().optional(),
    severity: BannerSeverity,
  })
  .strict()
  .superRefine(checkAudienceScopeValue);
export type CreateBannerRequest = z.output<typeof CreateBannerRequest>;

/**
 * Edit a banner (PATCH …/banners/{bannerId}). Every field optional — ONE unified edit whose
 * server-side CONTENT HASH decides whether a fresh non-author tone-review sign-off and a `revision`
 * bump are required (Decision 5). The client does NOT declare its intent: a copy change is detected,
 * not announced, so there is no way to edit copy while claiming not to.
 */
export const UpdateBannerRequest = z
  .object({
    title: Title.nullish(),
    body: Body.nullish(),
    title_hi: Title.nullish(),
    body_hi: Body.nullish(),
    audience_scope: BannerAudienceScope.optional(),
    audience_scope_value: AudienceScopeValue.nullish(),
    valid_from: Iso8601Datetime.optional(),
    valid_until: Iso8601Datetime.optional(),
    display_mode: BannerDisplayMode.optional(),
    dismissible: z.boolean().optional(),
    display_once_per_member: z.boolean().optional(),
    severity: BannerSeverity.optional(),
  })
  .strict()
  .superRefine(checkAudienceScopeValue);
export type UpdateBannerRequest = z.output<typeof UpdateBannerRequest>;

/** Publish (POST …/banners/{bannerId}/publish). The publisher is the session actor; no body fields. */
export const PublishBannerRequest = z.object({}).strict();
export type PublishBannerRequest = z.output<typeof PublishBannerRequest>;

/** Retract (POST …/banners/{bannerId}/retract). No body fields. */
export const RetractBannerRequest = z.object({}).strict();
export type RetractBannerRequest = z.output<typeof RetractBannerRequest>;

/**
 * Record a member's acknowledgement (POST …/member/banners/{bannerId}/dismiss). The acted-on
 * `revision` is resolved SERVER-side from the banner row and is deliberately NOT a field here — a
 * client must not be able to suppress a revision it has never seen.
 */
export const DismissBannerRequest = z.object({ kind: BannerDismissalKind }).strict();
export type DismissBannerRequest = z.output<typeof DismissBannerRequest>;

// ── Responses ────────────────────────────────────────────────────────────────────

/** The full ADMIN banner DTO (the authoring console read). */
export const BannerResponse = z
  .object({
    banner_id: UuidString,
    pariwar_id: UuidString,
    title: Title.nullable(),
    body: Body.nullable(),
    title_hi: Title.nullable(),
    body_hi: Body.nullable(),
    audience_scope: BannerAudienceScope,
    audience_scope_value: AudienceScopeValue.nullable(),
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    display_mode: BannerDisplayMode,
    dismissible: z.boolean(),
    display_once_per_member: z.boolean(),
    severity: BannerSeverity,
    revision: z.number().int().positive(),
    status: BannerStatus,
    /**
     * The DERIVED display state at the moment the server answered (AC2). Computed, never stored —
     * a client that caches this DTO across a window boundary will see a stale value, which is
     * correct and expected: the authority is the server's `now`, not the client's.
     */
    display_state: BannerDisplayState,
    created_by_actor_id: UuidString,
    tone_signoff_content_hash: z.string().nullable(),
    tone_signoff_reviewed_at: Iso8601Datetime.nullable(),
    tone_signoff_reviewed_by: UuidString.nullable(),
    published_at: Iso8601Datetime.nullable(),
    retracted_at: Iso8601Datetime.nullable(),
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict();
export type BannerResponse = z.output<typeof BannerResponse>;

/** The paginated admin list response. `next_offset` is null when the page is the last. */
export const BannerListResponse = z
  .object({
    items: z.array(BannerResponse),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type BannerListResponse = z.output<typeof BannerListResponse>;

/**
 * The MEMBER-facing banner DTO. Bilingual copy + presentation only — deliberately NO actor ids, NO
 * tone-signoff fields, NO `audience_scope_value`, NO `status` (a member sees a banner because it is
 * live; the workflow that made it live is not their concern). `revision` IS carried: the client
 * echoes nothing, but it lets a cached client detect that the copy it is showing is superseded.
 */
export const MemberBannerResponse = z
  .object({
    banner_id: UuidString,
    title: Title.nullable(),
    body: Body.nullable(),
    title_hi: Title.nullable(),
    body_hi: Body.nullable(),
    display_mode: BannerDisplayMode,
    dismissible: z.boolean(),
    display_once_per_member: z.boolean(),
    severity: BannerSeverity,
    revision: z.number().int().positive(),
    valid_until: Iso8601Datetime,
  })
  .strict();
export type MemberBannerResponse = z.output<typeof MemberBannerResponse>;

/**
 * THE member surface read (AC5): at most one banner AND at most one popup, ALREADY RESOLVED
 * server-side. Both fields may be non-null at once — the two display modes are independent lanes, so
 * a winning popup never suppresses the strip. A `null` field means "no banner of that mode is
 * visible to you right now", not "an error".
 */
export const MemberBannerListResponse = z
  .object({
    banner: MemberBannerResponse.nullable(),
    popup: MemberBannerResponse.nullable(),
  })
  .strict();
export type MemberBannerListResponse = z.output<typeof MemberBannerListResponse>;

/**
 * The dismiss acknowledgement. Returns the recorded revision so a client can reconcile: a replayed
 * dismiss is a clean no-op that answers with the same (or a higher) revision, never an error.
 */
export const DismissBannerResponse = z
  .object({
    banner_id: UuidString,
    dismissed_revision: z.number().int().positive(),
    kind: BannerDismissalKind,
    dismissed_at: Iso8601Datetime,
  })
  .strict();
export type DismissBannerResponse = z.output<typeof DismissBannerResponse>;
