// Moderation-appeal transport contracts — Story 10.22. Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// ⛔ THIS MODULE MUST NOT IMPORT A PG-TOUCHING `@twt/domain` NAMESPACE. Contracts are bundled into
// the RN Metro bundle, and pulling a schema module in would drag `pg` with it
// ([[project_contracts_domain_bundle_boundary]]). The bounded vocabulary below is therefore declared
// by value here and SYNC-GUARDED against the domain tuples by a test — the `enums.ts` discipline.
//
// Wire is snake_case; the domain is camelCase. The mapping is explicit at the handler boundary and
// never inferred ([[feedback_story_validate_footguns]]).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * ⭐ THE STEP-UP CONTEXT for deciding a moderation appeal — declared ONCE, here, and imported by BOTH
 * the API route and the admin OTP-request caller.
 *
 * ⚠ THERE IS NO STEP-UP CONTEXT REGISTRY. `requireStepUp(deps, actionContext: string)` compares a
 * BARE STRING by equality and the contract admits any `z.string().min(1).max(128)`. ⛔ Do not go
 * looking for a registry to register this in — there isn't one, and the distinctness this context
 * provides comes from string inequality, which holds but is UNGUARDED.
 *
 * ⚠ That is exactly why this is a shared constant and never a literal at either site. A typo in the
 * ROUTE fails closed (tolerable). A typo in the OTP-REQUEST path yields an elevation that can NEVER
 * satisfy the gate — a permanently broken action with nothing anywhere naming the cause. This is
 * 10.21's recorded footgun, and it is not being repeated.
 *
 * ⛔ DISTINCT from `DATA_RIGHTS_STEP_UP_CONTEXT` on purpose: an elevation obtained to execute a DPDPA
 * right must not also authorise determining a member's appeal against their own sanction.
 */
export const MODERATION_APPEAL_STEP_UP_CONTEXT = 'member_moderation_appeal';

/**
 * ⭐ The helpdesk SUB-CATEGORY token for the off-portal appeal arm.
 *
 * ⛔ NOT a new `HELPDESK_CATEGORIES` member. A new category is guaranteed-UNROUTED: every per-Pariwar
 * routing override is a version-pinned document and a new category resolves under NONE of them, while
 * the golden-hash guard prescribes an unsafe remedy
 * ([[project_helpdesk_default_policy_version_trap]]). The appeal therefore rides the EXISTING
 * `complaint` category — which routes at the `pariwar` dimension with `sub_category: null`, so it
 * matches any subcategory and routing stays green — and carries this token to mark what it is.
 *
 * ⚠ `HelpdeskSubcategory` is `z.string().min(1).max(64)` with NO allow-list, and the `other` catch-all
 * matches anything, so a TYPO routes just as cleanly and nothing complains. Declared once for the same
 * reason `DPDPA_DATA_RIGHTS_SUBCATEGORY` is. ⛔ Never re-declare it; import this symbol.
 */
export const MODERATION_APPEAL_SUBCATEGORY = 'moderation-appeal';

/**
 * The helpdesk CATEGORY the off-portal arm rides. Declared here so the constraint travels with the
 * subcategory token rather than living in a comment at one call site.
 */
export const MODERATION_APPEAL_HELPDESK_CATEGORY = 'complaint';

/** The two ruled intake surfaces. Sync-guarded against `@twt/domain`'s `APPEAL_FILED_VIA`. */
export const APPEAL_FILED_VIA = ['portal', 'helpline'] as const;
export const AppealFiledVia = z.enum(APPEAL_FILED_VIA);
export type AppealFiledVia = z.output<typeof AppealFiledVia>;

/** `open` | `decided`. §8.8 states a single internal review; there is no third status. */
export const APPEAL_STATUSES = ['open', 'decided'] as const;
export const AppealStatus = z.enum(APPEAL_STATUSES);
export type AppealStatus = z.output<typeof AppealStatus>;

/**
 * `upheld` | `allowed`. ⛔ There is deliberately NO third `varied` outcome — §8.8 makes a lesser
 * sanction a FRESH moderation act with its own ground, its own §8.6 record and its own right of
 * appeal. An appeal outcome that varied the sanction would be a moderation act with no record.
 */
export const APPEAL_OUTCOMES = ['upheld', 'allowed'] as const;
export const AppealOutcome = z.enum(APPEAL_OUTCOMES);
export type AppealOutcome = z.output<typeof AppealOutcome>;

/** Bounds on the member's own grounds of appeal. Generous — §8.8 promises a fair hearing. */
export const APPEAL_GROUNDS_MIN_CHARS = 20;
export const APPEAL_GROUNDS_MAX_CHARS = 5000;

/** Bounds on the adjudicator's reasoned outcome. §8.8 requires it; the DB CHECK requires it too. */
export const APPEAL_REASONED_OUTCOME_MIN_CHARS = 20;
export const APPEAL_REASONED_OUTCOME_MAX_CHARS = 5000;

/**
 * File an appeal — the MEMBER's own act, from the in-portal surface.
 *
 * ⚠ Note what is NOT here: no `member_id`. The member is the SESSION, never a request field — a
 * member-supplied member id on a member route is a cross-member write waiting to happen.
 * ⚠ Turnstile and `Idempotency-Key` ride HEADERS, not this body (the Story 10.2 member-surface
 * discipline, [[project_helpdesk_member_surface_102]]).
 */
export const FileModerationAppealRequest = z
  .object({
    /** The act being appealed. §8.8 identifies the appeal by the act's §8.6 record. */
    moderation_action_id: UuidString,
    /** The member's own grounds. PLAINTEXT on the wire, Tier-1 at rest — the route encrypts. */
    grounds: z.string().min(APPEAL_GROUNDS_MIN_CHARS).max(APPEAL_GROUNDS_MAX_CHARS),
  })
  .strict();
export type FileModerationAppealRequest = z.output<typeof FileModerationAppealRequest>;

/**
 * File an appeal on the OFF-PORTAL arm — an operator recording a member's appeal taken by helpline.
 *
 * ⛔ This route is NOT gated on `member.data_rights`. Filing an appeal is not executing a DPDPA
 * right, and 10.21 minted that key precisely to separate FILING from EXECUTING. It gates on
 * `helpdesk.create`, which is what an operator taking a call actually holds.
 *
 * ⚠ `helpdesk_ticket_id` is REQUIRED here and the DB CHECK backstops it: the ruling puts the
 * off-portal process ON a helpdesk ticket, so a helpline filing with no ticket would be a filing
 * outside the ruled process.
 */
export const FileModerationAppealOffPortalRequest = z
  .object({
    /** The subject member. Required here — the operator has no member session to read it from. */
    member_id: UuidString,
    moderation_action_id: UuidString,
    /** The originating ticket. ⛔ Required — see above. */
    helpdesk_ticket_id: UuidString,
    grounds: z.string().min(APPEAL_GROUNDS_MIN_CHARS).max(APPEAL_GROUNDS_MAX_CHARS),
  })
  .strict();
export type FileModerationAppealOffPortalRequest = z.output<
  typeof FileModerationAppealOffPortalRequest
>;

/** What a filing returns. ⛔ Never echoes the grounds back — it is Tier-1 the moment it lands. */
export const ModerationAppealFiledResponse = z
  .object({
    appeal_id: UuidString,
    moderation_action_id: UuidString,
    filed_via: AppealFiledVia,
    filed_at: Iso8601Datetime,
    status: AppealStatus,
  })
  .strict();
export type ModerationAppealFiledResponse = z.output<typeof ModerationAppealFiledResponse>;

/**
 * Determine an appeal (§8.8). Behind the full four-hook chain PLUS step-up.
 *
 * ⚠ There is NO `decided_by` field, and the omission is deliberate: the adjudicator is the SESSION
 * and their display name is SNAPSHOT server-side from `users.display_name`
 * ([[project_admin_display_name_attribution]]). A client-supplied attribution is not an attribution.
 */
export const DecideModerationAppealRequest = z
  .object({
    outcome: AppealOutcome,
    /**
     * §8.8's reasoned outcome. PLAINTEXT on the wire, Tier-1 at rest.
     * ⛔ Required, and the DB's decision-coherence CHECK requires it too — "reasoned" is not advisory.
     */
    reasoned_outcome: z
      .string()
      .min(APPEAL_REASONED_OUTCOME_MIN_CHARS)
      .max(APPEAL_REASONED_OUTCOME_MAX_CHARS),
  })
  .strict();
export type DecideModerationAppealRequest = z.output<typeof DecideModerationAppealRequest>;

/** What a determination returns. */
export const ModerationAppealDecidedResponse = z
  .object({
    appeal_id: UuidString,
    moderation_action_id: UuidString,
    outcome: AppealOutcome,
    decided_at: Iso8601Datetime,
    decided_by_display: z.string(),
    /**
     * ⭐ Whether this outcome DIRECTS a restore — `true` iff `outcome === 'allowed'`.
     * ⛔ INFORMATIONAL. The appeal path performs NO restore: §8.8 makes an allowed appeal direct that
     * the act be undone, and the restore is a subsequent, separately-attributed act through the
     * existing moderation write path with its own Decision Note and the Panel-exclusive
     * `member.restore_terminated` check. The console uses this to surface the next step, never to
     * report a completed one.
     */
    directs_restore: z.boolean(),
  })
  .strict();
export type ModerationAppealDecidedResponse = z.output<typeof ModerationAppealDecidedResponse>;

/**
 * One appeal, as it appears on a LIST.
 * ⛔ Carries NO `grounds` and NO `reasoned_outcome` — both are Tier-1 and neither ever rides a list
 * shape. The single-item decrypt-on-demand read below is the only place either appears.
 */
export const ModerationAppealDto = z
  .object({
    appeal_id: UuidString,
    member_id: UuidString,
    moderation_action_id: UuidString,
    filed_via: AppealFiledVia,
    helpdesk_ticket_id: UuidString.nullable(),
    filed_at: Iso8601Datetime,
    status: AppealStatus,
    outcome: AppealOutcome.nullable(),
    decided_by_display: z.string().nullable(),
    decided_at: Iso8601Datetime.nullable(),
  })
  .strict();
export type ModerationAppealDto = z.output<typeof ModerationAppealDto>;

/**
 * ⭐ THE ADJUDICATION QUEUE (AC5) — open appeals within the caller's scope.
 *
 * ⚠ Not a convenience endpoint. `trustee_panel` holds NO helpdesk capability at all and
 * `routed_to_role` is advisory and inert, so there is no operator queue an appeal could surface on.
 * Without this list a filed appeal would be reachable only by direct link — a technically complete
 * record nobody can find, which is the helpdesk-is-not-a-queue defect in a new costume (D6).
 */
export const ModerationAppealsListResponse = z
  .object({ items: z.array(ModerationAppealDto) })
  .strict();
export type ModerationAppealsListResponse = z.output<typeof ModerationAppealsListResponse>;

/**
 * The single-item decrypt-on-demand read — the ONLY shape that ever carries either Tier-1 field,
 * behind the same gate as the determination. The `ModerationRationaleResponse` precedent.
 */
export const ModerationAppealDetailResponse = z
  .object({
    appeal: ModerationAppealDto,
    /** The member's own grounds, decrypted. */
    grounds: z.string().nullable(),
    /** The adjudicator's reasoned outcome, decrypted. `null` while the appeal is open. */
    reasoned_outcome: z.string().nullable(),
  })
  .strict();
export type ModerationAppealDetailResponse = z.output<typeof ModerationAppealDetailResponse>;
