// The TERMINATION-ACCESS seam — Story 10.19 (Task 4; AC4, AC6, AC12).
//
// THE SINGLE read-point for "is session issuance denied for this member, and what does the
// termination notice carry?". Mirrors `apps/api/src/modules/kyc/manual-fallback-seam.ts`, the
// established Story 10.8 flag-consumer pattern.
//
// ── ⛔ THE DOMAIN VOCABULARY IS RULED, AND THIS FILE IS WHERE IT IS SET ───────────────────────────
// Decision `2026-08-10-098` clause 3, on the Trustee Panel's own direction:
//
//   "Login succeeds but returns 403." That's technically confusing. […] OTP verification succeeds →
//   termination status is established → session issuance is denied → structured termination response
//   returned → client renders termination surface. […] identity verification succeeded;
//   authorization to establish a member session did not.
//
// ⛔ NOTHING here — symbol, comment, test title or copy — may say "login failed" or "login succeeds
// but returns 403". It collapses two distinct things: identity verification, which SUCCEEDS (the
// caller proved possession of the OTP for that mobile, so they ARE the member), and authorization to
// establish a member session, which is DENIED. The HTTP status code is a TRANSPORT DETAIL; the
// domain semantics are not. Everything below is named for session-issuance denial.
//
// ── ⛔ WHAT THIS SEAM MUST NEVER DO ───────────────────────────────────────────────────────────────
// It must never mint a session of any kind. Decision `097` clause 11, adopted BY RULING at `098`
// clause 1: a restricted, notice-only or reduced-scope session is EXPRESSLY FORECLOSED. Notice
// access is distinguished from ordinary member access STRUCTURALLY — one path issues a session and
// the other does not — never by a flag, scope, audience or claim on a session object. AC12 pins it.

import { featureFlags, ids, member as memberDomain } from '@twt/domain';

import type { AppDeps } from '../../../context.js';

/** The domain's moderation standing union — reached through the namespace, the `member-moderation`
 *  handlers' established convention (`handlers.ts:51`); it is not re-exported from the root barrel. */
type ModerationStatus = memberDomain.moderation.ModerationStatus;

/** The capability-bar-admitted flag key (`governance_boundary.yaml`, `member_flow`). */
export const TERMINATION_ACCESS_BLOCK_FLAG = 'termination_access_block';

/**
 * The i18n key for a moderation reason-code LABEL — never the raw code (UX a11y `:1896`).
 *
 * ⚠ DUPLICATED BY VALUE from `packages/ui/src/member-status/i18n-keys.ts:83`, which is the canonical
 * definition; `apps/jobs/src/scheduler/moderation-notify.ts:79` is the other existing copy. Copied
 * rather than imported because `@twt/ui` is a React package with no `exports` map and no existing
 * consumer in `apps/api` — importing it here to reach one string builder would pull React into the
 * API's module graph for a template literal. The protocol is a stable three-copy convention in this
 * repo, not a new divergence; `termination-block-seam.test.ts` pins the shape.
 */
export function moderationReasonLabelKey(reasonCode: string): string {
  return `memberStatus.moderationReason.${reasonCode}`;
}

/**
 * The structured termination notice (AC4). ⛔ VALUES, NEVER SENTENCES — the API returns data and the
 * client renders prose from the i18n catalog under the en/hi parity gate. A server-rendered sentence
 * would bypass that gate and put member-facing copy outside the tone guide.
 *
 * ⛔ It carries NO rationale, NO reason CODE, NO actor name — the reason reaches the member as a
 * resolved LABEL KEY only, exactly as the moderation notice does.
 */
export interface TerminationNotice {
  /** The decision itself. A literal, so the client branches on data rather than on an error code. */
  readonly decision: 'terminated';
  /** The reason-code LABEL key; `null` when the overlay carries no reason code. */
  readonly ground_label_key: string | null;
  /** When the termination took effect (the producing event's `occurred_at`), ISO-8601. */
  readonly effective_at: string | null;
  /**
   * ⛔ STRUCTURALLY ABSENT until Story 10.20's structured `decision_note` exists — Q2 option (a),
   * Decision `097` clause 2. `{ available: false }`-shaped (the nominee-VPA deferred-seam
   * precedent), NEVER an empty string: a blank rendered as prose is a worse lie than an absence.
   */
  readonly summary: { readonly available: false };
  /**
   * The administrative channel through which records and statutory rights are obtained.
   *
   * ⚠ `route_available` is `false` and must stay `false` until **Story 10.21** ships the off-portal
   * DPDPA route. §8.4 promises those rights are exercised "through an identity-verified
   * administrative process designated by the Trust"; that process does not exist yet, and the
   * surface must be honest about what exists TODAY rather than promise a route that is `backlog`.
   * Story 10.21 flips this — and 10.21 landing is also what unlocks the flag flip (Q6 (b-i)), so
   * the two move together by construction.
   */
  readonly further_communication: {
    readonly channel: 'administrative_request';
    readonly route_available: false;
  };
}

/**
 * Why session issuance is denied. `null` is the overwhelmingly common answer.
 *
 * The three reasons are kept in ONE discriminated union, not three booleans, because AC4 requires
 * the audit `reason` and the error `code` to be read OFF the verdict rather than re-derived at the
 * throw site — that is what keeps a single branch and a single timing-equalisation sleep honest.
 */
export type SessionDenial =
  | { readonly reason: 'withdrawn'; readonly code: 'auth.member_withdrawn'; readonly notice?: undefined }
  | { readonly reason: 'anonymized'; readonly code: 'auth.member_withdrawn'; readonly notice?: undefined }
  | { readonly reason: 'terminated'; readonly code: 'auth.member_terminated'; readonly notice: TerminationNotice };

/**
 * Does this moderation standing deny session issuance?
 *
 * ⛔ EXHAUSTIVE OVER `ModerationStatus`, NOT A BARE `=== 'terminated'` EQUALITY — and the `never`
 * arm is the point, not defensive decoration. `MODERATION_STATUSES` is `['none','suspended',
 * 'terminated']`, and this story makes that union LOAD-BEARING ON AN AUTHENTICATION GATE for the
 * first time. The codebase has already written the warning against itself at
 * `packages/domain/src/member/moderation/overlay.ts:18-21`: the blast radius of a new label is
 * SILENT — there is no `never` guard, so new labels produce ZERO compile errors while
 * mis-classifying five `TERMINAL_STATES` Sets.
 *
 * A bare equality inherits exactly that failure mode, and it fails OPEN: a future status label —
 * **Story 10.20's sanction tiers are the live candidate** — would be admitted to a full session with
 * no compile error and no test failure. With the `never` arm, adding a label BREAKS THE BUILD and
 * forces an explicit admit/deny decision at this gate.
 *
 * ⚠ `suspended` returns `false` DELIBERATELY (AC7 / D5 requirement 3): a suspended member must
 * retain access — they are curing, they need the contribution surface, and Story 10.16's disclosure
 * lives there. That is a requirement, not an oversight.
 */
export function moderationDeniesSession(status: ModerationStatus): boolean {
  switch (status) {
    case 'none':
    case 'suspended':
      return false;
    case 'terminated':
      return true;
    default: {
      const unreachable: never = status;
      throw new Error(`[termination-block] unhandled ModerationStatus: ${String(unreachable)}`);
    }
  }
}

/** What the caller must supply. Kept minimal — only dimensions this pre-scope call site truly has. */
export interface SessionDenialInput {
  readonly memberId: string;
  readonly pariwarId: string;
  /** The Story 3.1 lifecycle state the caller already read; never re-read here. */
  readonly lifecycleState: string;
  readonly now: Date;
  /** Best-effort observability; the seam degrades to "not denied" either way. */
  readonly onError?: (err: unknown) => void;
  readonly onAccess?: (decision: { reason: string; enabled: boolean }, source: string | null) => void;
}

/**
 * Resolve whether session issuance is denied, and with what notice (AC4).
 *
 * ── Resolution order, and why the flag is read FIRST ──────────────────────────────────────────────
 *   1. The `termination_access_block` flag. **Default OFF**, so on every login in production today
 *      this is one CACHED lookup and the function returns after step 2's lifecycle check.
 *   2. The lifecycle terminal states (`withdrawn` / `anonymized`) — checked regardless of the flag,
 *      because that block is Story 3.2's and predates this story entirely.
 *   3. Only if the flag is ENABLED: the moderation overlay read, and the exhaustive status check.
 *
 * Reading the flag first is what keeps the default path from paying for an overlay query it would
 * discard. It also means the overlay read cannot fail a login while the block is disabled.
 *
 * ── ⚠ THE POLARITY, TRACED (Decision `097` clause 7(ii)) ──────────────────────────────────────────
 * `callerDefault: false` = "do NOT deny". Trace it to the member: a degraded path — no version in
 * force, a malformed cohort rule, a lookup error — yields `false`, this function returns `null`, and
 * the member RECEIVES A NORMAL SESSION. **This safeguard FAILS OPEN.** That is deliberate and
 * ratified (Q6 (b-i)): it is today's behaviour, so no degraded path is a regression, and the block
 * must not become active by accident. ⛔ Do not "harden" this to fail closed — that would enable the
 * block with zero flips and zero Panel decision, which the capability-bar entry calls a governance
 * violation.
 *
 * ⚠ Runs on `deps.serviceDb` (BYPASSRLS) with an EXPLICIT `pariwarId`: `completeMemberLogin` is
 * PRE-SCOPE — there is no `app.pariwar_id` set yet — so the tenant cannot come from RLS and must be
 * passed. Same posture as the surrounding `getMemberStateAt` read.
 */
export async function resolveSessionDenial(
  deps: AppDeps,
  input: SessionDenialInput,
): Promise<SessionDenial | null> {
  // (2) The Story 3.2 lifecycle block — unconditional, and NOT gated by this story's flag. Only the
  // two terminal states block; `getMemberStateAt` is non-nullable so there is no "unavailable" arm.
  if (input.lifecycleState === 'withdrawn') {
    return { reason: 'withdrawn', code: 'auth.member_withdrawn' };
  }
  if (input.lifecycleState === 'anonymized') {
    return { reason: 'anonymized', code: 'auth.member_withdrawn' };
  }

  // (1) The flag. Never throws outward: a flag problem must not deny a member their session.
  let blockEnabled = false;
  try {
    const pariwarId = ids.pariwarId(input.pariwarId);
    const decision = await featureFlags.resolveFlagAudited(
      deps.serviceDb,
      TERMINATION_ACCESS_BLOCK_FLAG,
      pariwarId,
      { pariwarId: input.pariwarId, memberState: input.lifecycleState },
      input.now,
      // ⛔ FAIL OPEN. See the polarity trace above before changing this.
      false,
      {
        ...(input.onAccess ? { onAccess: input.onAccess } : {}),
      },
    );
    blockEnabled = decision.enabled;
  } catch (err) {
    input.onError?.(err);
    blockEnabled = false; // FAIL OPEN — the ratified degraded outcome.
  }

  if (!blockEnabled) return null;

  // (3) The overlay read — only reached with the block enabled.
  //
  // ⛔ THE UNBOUNDED VARIANT, NEVER THE `at`-BOUNDED ONE. `occurred_at` is DB-generated while every
  // `deps.clock()` is the app clock; under app-clock-behind-DB skew the bounded read would exclude
  // the terminating event, fold `status: 'none'`, and LET A TERMINATED MEMBER IN. The rationale is
  // written out at `packages/domain/src/member/moderation/overlay.ts:132-149` — read it before
  // changing this line. It is the legality check that must see the present, and the present has no
  // clock in it.
  let overlay;
  try {
    overlay = await memberDomain.moderation.getCurrentMemberModerationOverlay(
      deps.serviceDb,
      ids.memberId(input.memberId),
    );
  } catch (err) {
    input.onError?.(err);
    return null; // FAIL OPEN, consistent with the flag path.
  }

  if (!moderationDeniesSession(overlay.status)) return null;

  return {
    reason: 'terminated',
    code: 'auth.member_terminated',
    notice: {
      decision: 'terminated',
      ground_label_key: overlay.reasonCode ? moderationReasonLabelKey(overlay.reasonCode) : null,
      effective_at: overlay.since ? overlay.since.toISOString() : null,
      summary: { available: false },
      further_communication: { channel: 'administrative_request', route_available: false },
    },
  };
}
