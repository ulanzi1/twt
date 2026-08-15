// Member-moderation typed domain errors — Story 10.10 (AC2, AC3, AC4).
//
// @twt/domain owns these typed errors; the HTTP mapping lands in the apps/api error-mapping
// middleware (the banners / news-blog / helpdesk precedent). Surfaced at the @twt/domain top level
// (../../index.ts) so the middleware imports the class + code constant from `@twt/domain` directly.
//
// ⚠ EVERY error declared here MUST be wired into `apps/api/src/middleware/error-mapping/index.ts`.
// An UNMAPPED domain error becomes a 500 — that was the Story 10.8 Pass-3 finding, and Story 10.9
// called it out explicitly. It is not being repeated here.

import type { ErrorResponseShape } from '../../errors.js';

/** Namespaced error code for an illegal moderation transition (HTTP 409). */
export const MODERATION_INVALID_STATE_CODE = 'member_moderation.invalid_state';

/**
 * Thrown when the requested action is illegal from the member's CURRENT moderation status —
 * `nextModerationStatus` returned `null`. Raised BEFORE any write (AC2), so a no-op never returns
 * 200. Covers `none --terminate-->` (Decision 2), a re-suspend of an already-suspended member, a
 * restore of an unmoderated member, and every other non-arm.
 */
export class ModerationStateError extends Error {
  public readonly name = 'ModerationStateError';
  public readonly code = MODERATION_INVALID_STATE_CODE;
  public constructor(
    public readonly memberId: string,
    public readonly currentStatus: string,
    public readonly action: string,
  ) {
    super(
      `member '${memberId}' is '${currentStatus}': '${action}' is not a legal moderation transition`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { current_status: this.currentStatus, action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a reason code that cannot justify the requested action (HTTP 422). */
export const MODERATION_REASON_CODE_INVALID_CODE = 'member_moderation.reason_code_invalid';

/**
 * Thrown when the reason code is not in the registry, or its `appliesTo` does not include the
 * requested action (AC3) — e.g. a restore code offered to justify a termination.
 */
export class ModerationReasonCodeInvalidError extends Error {
  public readonly name = 'ModerationReasonCodeInvalidError';
  public readonly code = MODERATION_REASON_CODE_INVALID_CODE;
  public constructor(
    public readonly reasonCode: string,
    public readonly action: string,
  ) {
    super(`reason code '${reasonCode}' cannot justify a '${action}' action`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { reason_code: this.reasonCode, action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a missing / whitespace-only rationale (HTTP 422). */
export const MODERATION_RATIONALE_REQUIRED_CODE = 'member_moderation.rationale_required';

/**
 * Thrown when the free-text rationale is absent, empty or whitespace-only. The rationale is
 * REQUIRED on EVERY action (AC3) — not only on an "other" code. This is deliberately STRICTER than
 * the UX `<ReasonCodeDropdown>` `other-text-required` state (`ux-design-specification.md:2067`):
 * a structured code alone can never explain a suspension to the member who receives it.
 */
export class ModerationRationaleRequiredError extends Error {
  public readonly name = 'ModerationRationaleRequiredError';
  public readonly code = MODERATION_RATIONALE_REQUIRED_CODE;
  public constructor(public readonly action: string) {
    super(`a free-text rationale is required for every moderation action ('${action}')`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { action: this.action },
        request_id: requestId,
      },
    };
  }
}

// ── Story 10.20 (WS-C) — the two-part escalation justification, and evidence references ──────────
//
// Niyamavali §8.6 (Decision `2026-08-12-099`): *"Termination is an exceptional governance act, not a
// stronger suspension."* A termination therefore carries TWO separately-answerable justifications —
// (a) why suspension is INADEQUATE and (b) why termination is PROPORTIONATE — and neither may be
// derived from the other. Migration 0099 enforces PRESENCE structurally
// (`member_moderation_actions_escalation_iff_terminate`); the errors below carry the half a CHECK
// constraint cannot express, because envelope encryption is non-deterministic and two identical
// plaintexts produce different ciphertexts (a `CHECK (a <> b)` would prove nothing).

/** Namespaced code for a missing / insubstantial escalation part on a `terminate` (HTTP 422). */
export const MODERATION_ESCALATION_REQUIRED_CODE = 'member_moderation.escalation_required';

/**
 * Which field the error is about.
 *
 * ⚠ `immediate_termination_reason` is NOT a third half of the two-part test — it is a separate
 * field answering a different question (*why now*, rather than *why termination*). It shares this
 * error only because it shares the substance floor.
 */
export type EscalationPart = 'inadequacy' | 'proportionality' | 'immediate_termination_reason';

/** Human-readable field names — the error has to be actionable, not merely typed. */
const FIELD_DESCRIPTIONS: Record<EscalationPart, string> = {
  inadequacy: 'the escalation justification part (a) — why suspension is inadequate —',
  proportionality: 'the escalation justification part (b) — why termination is proportionate —',
  immediate_termination_reason:
    'the recorded reason for invoking the immediate-termination exception —',
};

/**
 * Thrown when a `terminate` omits an escalation part, or supplies one below the substance floor.
 *
 * ⚠ The floor is a FLOOR, not a quality test: it exists to reject `"n/a"`, not to judge reasoning.
 * The error names WHICH part failed and WHY, because "you must justify the escalation" is not
 * actionable when two independent fields can each fail for two different reasons.
 */
export class ModerationEscalationRequiredError extends Error {
  public readonly name = 'ModerationEscalationRequiredError';
  public readonly code = MODERATION_ESCALATION_REQUIRED_CODE;
  public constructor(
    public readonly part: EscalationPart,
    public readonly reason: 'missing' | 'too_short' | 'too_long',
    // ⚠ Named `minChars` for both bounds — `.minChars` is asserted directly in
    // moderation-dwell.test.ts, so the property name stays put. It holds the MAX when
    // `reason === 'too_long'`; `toErrorResponse` picks the right JSON key per reason.
    public readonly minChars: number,
  ) {
    super(
      `${FIELD_DESCRIPTIONS[part]} is ${
        reason === 'missing'
          ? 'required for a termination'
          : reason === 'too_short'
            ? `too short (minimum ${minChars} characters)`
            : `too long (maximum ${minChars} characters)`
      }`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {
          part: this.part,
          reason: this.reason,
          ...(this.reason === 'too_long' ? { max_chars: this.minChars } : { min_chars: this.minChars }),
        },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for an escalation part supplied on a non-`terminate` action (HTTP 422). */
export const MODERATION_ESCALATION_NOT_APPLICABLE_CODE =
  'member_moderation.escalation_not_applicable';

/**
 * Thrown when a `suspend` or `restore` carries an escalation part. The DB CHECK is an `iff`, so it
 * bites both ways and such a row is impossible; this error is what makes the refusal READABLE
 * instead of a `23514` leaking as a 500. An escalation justification explains a termination — on any
 * other action it is a field that describes something that did not happen.
 */
export class ModerationEscalationNotApplicableError extends Error {
  public readonly name = 'ModerationEscalationNotApplicableError';
  public readonly code = MODERATION_ESCALATION_NOT_APPLICABLE_CODE;
  public constructor(public readonly action: string) {
    super(`an escalation justification is recorded only for a termination, never for a '${action}'`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for part (a) merely restating part (b) (HTTP 422). */
export const MODERATION_ESCALATION_RESTATEMENT_CODE = 'member_moderation.escalation_restatement';

/**
 * Thrown when the two parts are the same text under normalization (AC6).
 *
 * ⛔ This can NEVER be a database constraint. `encryptModerationRationale` is a non-deterministic
 * Tier-1 envelope encrypt, so the same plaintext yields different ciphertexts on every call and a
 * `CHECK (a <> b)` would pass on two byte-identical answers. The comparison has exactly one
 * legitimate home: the PLAINTEXT, in the route, before encryption — which is also where it is
 * cheapest, since a doomed request never spends a KMS round-trip.
 */
export class ModerationEscalationRestatementError extends Error {
  public readonly name = 'ModerationEscalationRestatementError';
  public readonly code = MODERATION_ESCALATION_RESTATEMENT_CODE;
  public constructor() {
    super(
      'part (a) must explain why SUSPENSION is inadequate; restating why termination is proportionate does not answer it',
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, details: {}, request_id: requestId },
    };
  }
}

/** Namespaced code for an evidence reference that is not a reference (HTTP 422). */
export const MODERATION_EVIDENCE_REF_INVALID_CODE = 'member_moderation.evidence_ref_invalid';

/**
 * Thrown when `evidence_refs` is not an array of `{ kind, ref }` identifiers within the cap (AC4).
 *
 * Evidence is *"references only, never free text"*. A sentence is REJECTED, never truncated — a
 * truncation would silently store a prefix of the prose the rule exists to keep out.
 */
export class ModerationEvidenceRefInvalidError extends Error {
  public readonly name = 'ModerationEvidenceRefInvalidError';
  public readonly code = MODERATION_EVIDENCE_REF_INVALID_CODE;
  public constructor(public readonly detail: string) {
    super(`evidence references must be identifiers, not free text: ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { detail: this.detail },
        request_id: requestId,
      },
    };
  }
}

// ── Story 10.20 (WS-D) — the termination DWELL precondition ──────────────────────────────────────
//
// Decision `2026-08-12-099` (Q4): a **7-day** dwell, from the **versioned registry**, separating a
// suspension from the termination that follows it on the ORDINARY path. ⛔ The dwell does NOT make
// immediate termination unavailable — principles 5 and 6 as adopted say termination *normally*
// follows suspension and notice *normally* precedes it, and both carry an express exception.

/** Namespaced code for a termination attempted before the dwell has elapsed (HTTP 409). */
export const MODERATION_DWELL_NOT_ELAPSED_CODE = 'member_moderation.dwell_not_elapsed';

/**
 * Thrown when the ORDINARY termination path is not yet open and the immediate-termination exception
 * was not validly invoked.
 *
 * ⚠ THIS IS NOT A BLANKET REFUSAL TO TERMINATE, and the message must not read like one. It means
 * exactly: *the ordinary path is not yet open, and the exception was not invoked.* A trustee with
 * grounds for immediate termination records the exception reason and proceeds.
 *
 * ⛔ Its code is deliberately DISTINCT from `MODERATION_INVALID_STATE_CODE`. "Too soon" and "illegal
 * transition" are different facts about a member, and a trustee must be able to tell them apart:
 * one resolves by waiting (or by invoking the exception), the other never does.
 */
export class ModerationDwellNotElapsedError extends Error {
  public readonly name = 'ModerationDwellNotElapsedError';
  public readonly code = MODERATION_DWELL_NOT_ELAPSED_CODE;
  public constructor(
    public readonly availableAt: Date,
    public readonly dwellDays: number,
    public readonly policyClauseVersionId: string,
  ) {
    super(
      `the ordinary termination path opens ${dwellDays} days after the suspension (at ${availableAt.toISOString()}); to terminate before then, record a reason for invoking the immediate-termination exception`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {
          available_at: this.availableAt.toISOString(),
          dwell_days: this.dwellDays,
          dwell_policy_version: this.policyClauseVersionId,
        },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for a Pariwar with no effective dwell clause (HTTP 503). */
export const MODERATION_DWELL_UNPROVISIONED_CODE = 'member_moderation.dwell_policy_unprovisioned';

/**
 * Thrown when the ORDINARY termination path is asked for on a Pariwar with no effective
 * `niy.moderation.dwell` clause.
 *
 * ⛔ **`7` IS NOT HARD-CODED AS A FALLBACK.** Decision `2026-08-07-088` clause 2 governs: imposing
 * under a code default is explicitly rejected, because it is not a fallback but a sanction under a
 * convention no Pariwar ratified — an unratified sanction imposed by a machine. The safe direction
 * is to refuse the ordinary path and SAY WHY.
 *
 * ⚠ **503, NOT 409, AND THE DISTINCTION IS THE POINT.** A 409 would tell a trustee to wait, and
 * waiting will never resolve this — no amount of elapsed time provisions a registry clause. This is
 * a configuration gap an administrator fixes, which is what a 503 says. The sibling
 * `niy.lock-in.policy` states its provisioning failure as a member-facing 503 for the same reason;
 * the `niy.restoration-discipline.policy` sibling instead reports a sentinel precisely because it
 * runs as a background imposition with no request to fail. This path HAS a request to fail.
 *
 * ⛔ It does NOT block the immediate-termination exception, which is a separate governance route and
 * is not conditioned on this clause existing.
 */
export class ModerationDwellPolicyUnprovisionedError extends Error {
  public readonly name = 'ModerationDwellPolicyUnprovisionedError';
  public readonly code = MODERATION_DWELL_UNPROVISIONED_CODE;
  public constructor(public readonly pariwarId: string) {
    super(
      'the moderation dwell policy is not provisioned for this Pariwar, so the ordinary termination path cannot be opened — this is a registry gap for an administrator to close, not a waiting period',
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { clause_id: 'niy.moderation.dwell' },
        request_id: requestId,
      },
    };
  }
}

// ── Story 10.20 (WS-E) — the append-only grounds ─────────────────────────────────────────────────

/** Namespaced code for a moderation action that does not exist in this scope (HTTP 404). */
export const MODERATION_ACTION_NOT_FOUND_CODE = 'member_moderation.action_not_found';

/**
 * Thrown when the action a ground would attach to has no row for this Pariwar + member.
 *
 * ⚠ 404, NOT 403, on a cross-tenant or cross-member id. RLS plus the explicit predicate means a
 * mismatched combination simply has no row, and answering 403 would turn this endpoint into an
 * existence oracle for another Pariwar's decisions.
 */
export class ModerationActionNotFoundError extends Error {
  public readonly name = 'ModerationActionNotFoundError';
  public readonly code = MODERATION_ACTION_NOT_FOUND_CODE;
  public constructor(public readonly moderationActionId: string) {
    super(`moderation action '${moderationActionId}' not found`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, details: {}, request_id: requestId },
    };
  }
}

/** Namespaced code for a superseded-ground reference that resolves to nothing (HTTP 404). */
export const MODERATION_GROUND_NOT_FOUND_CODE = 'member_moderation.ground_not_found';

/** Thrown when the ground being superseded is not on the action the append targets. */
export class ModerationGroundNotFoundError extends Error {
  public readonly name = 'ModerationGroundNotFoundError';
  public readonly code = MODERATION_GROUND_NOT_FOUND_CODE;
  public constructor(public readonly groundId: string) {
    super(`ground '${groundId}' is not a ground of this moderation action`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, details: {}, request_id: requestId },
    };
  }
}

/** Namespaced code for any attempt to move the PRIMARY ground (HTTP 409). */
export const MODERATION_PRIMARY_GROUND_IMMUTABLE_CODE =
  'member_moderation.primary_ground_immutable';

/**
 * Thrown when a request would produce a SECOND primary ground — whether by superseding the primary,
 * by appending a fresh `is_primary` row, or both.
 *
 * ⛔ NOT a silent no-op, and ⛔ never a `23505` leaking as a 500. The partial unique index
 * `(moderation_action_id) WHERE is_primary` is the BACKSTOP; this typed error is the INTERFACE.
 * *"The primary ground is fixed at the action"* is a fact a trustee must be able to read off the
 * error rather than infer from a stack trace.
 *
 * ⚠ The immutability is by CONSTRUCTION, not by policy: the partial unique index makes a second
 * primary a `23505`, and clearing the existing row's flag would be an `UPDATE` that the table's
 * `SELECT, INSERT`-only grant does not permit. There is no code path that could move it.
 */
export class ModerationPrimaryGroundImmutableError extends Error {
  public readonly name = 'ModerationPrimaryGroundImmutableError';
  public readonly code = MODERATION_PRIMARY_GROUND_IMMUTABLE_CODE;
  public constructor(public readonly moderationActionId: string) {
    super(
      'the primary ground is fixed at the moderation action and can never be superseded or replaced; append a SUPPORTING ground instead',
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { moderation_action_id: this.moderationActionId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for a supersede target that already has an active superseder (HTTP 409). */
export const MODERATION_GROUND_ALREADY_SUPERSEDED_CODE =
  'member_moderation.ground_already_superseded';

/**
 * Thrown when `supersedes_ground_id` names a ground that ANOTHER row already supersedes.
 *
 * ⛔ "At most one active superseder per target" — without this, two concurrent appends (or one
 * caller who did not re-fetch the console state) could each successfully supersede the same
 * ground, and a reader would have no way to tell which superseding entry is the current one.
 *
 * ⛔ NOT a silent no-op, and ⛔ never a `23505` leaking as a 500, same discipline as
 * `ModerationPrimaryGroundImmutableError`. The pre-check here is the INTERFACE; the partial unique
 * index `member_moderation_grounds_supersedes_target_idx` (migration 0100) is the BACKSTOP that
 * closes the race the pre-check alone cannot — two concurrent appends can both pass the pre-check
 * before either commits, but only one INSERT can win the index.
 */
export class ModerationGroundAlreadySupersededError extends Error {
  public readonly name = 'ModerationGroundAlreadySupersededError';
  public readonly code = MODERATION_GROUND_ALREADY_SUPERSEDED_CODE;
  public constructor(public readonly groundId: string) {
    super(`ground '${groundId}' already has an active superseding entry`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { ground_id: this.groundId },
        request_id: requestId,
      },
    };
  }
}

// NOTE: actor-display resolution (AC4's "missing display name BLOCKS the action" requirement,
// [[project_admin_display_name_attribution]]) happens entirely at the API layer, BEFORE the
// domain is ever called — `moderateMember`'s `actorDisplay` parameter is a required, non-nullable
// `string`. `apps/api/src/modules/member-moderation/handlers.ts` resolves it via
// `getDisplayName(deps.pool, actorId)` and throws the shared `AdminDisplayNameMissingError`
// (`apps/api/src/http-errors.js`) — the same class every other admin-attribution surface uses —
// if it's null. A domain-level `ModerationActorDisplayMissingError` was previously declared here
// to mirror that check, but the domain has no code path that can ever raise it, so it was removed
// as dead code (Story 10.10 review). Do not re-add it unless the domain itself starts resolving
// or validating the display name.

// ── Story 10.22 — the moderation APPEAL (Niyamavali §8.8, Decision `2026-08-15-121`) ─────────────
// ⚠ Every error below MUST be wired into `apps/api/src/middleware/error-mapping/index.ts`. An
// UNMAPPED domain error becomes a 500 — the Story 10.8 Pass-3 finding, not being repeated here.

/** Namespaced code for an appeal filed from a status §8.8 does not make appealable (HTTP 422). */
export const MODERATION_APPEAL_NOT_APPEALABLE_CODE = 'member_moderation.appeal_not_appealable';

/**
 * Thrown when a member who is under NO moderation attempts to file an appeal.
 *
 * §8.8 opens the appeal to "a member under suspension (§8.2) or termination (§8.4)". An unmoderated
 * member has no act to appeal against — this is a 422 (the request is not a coherent one), not a 409.
 */
export class ModerationAppealNotAppealableError extends Error {
  public readonly name = 'ModerationAppealNotAppealableError';
  public readonly code = MODERATION_APPEAL_NOT_APPEALABLE_CODE;
  public constructor(public readonly moderationStatus: string) {
    super(
      `Niyamavali §8.8 permits an appeal from 'suspended' or 'terminated'; this member's moderation standing is '${moderationStatus}'`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { moderation_status: this.moderationStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for a second open appeal against the same act (HTTP 409). */
export const MODERATION_APPEAL_ALREADY_OPEN_CODE = 'member_moderation.appeal_already_open';

/**
 * Thrown when an appeal against this moderation act is ALREADY OPEN.
 *
 * §8.8: "Only one appeal against a given moderation act may be open at any time." ⚠ Note what this
 * error does NOT mean: the right is **not exhausted**. §8.8 permits a further appeal against the same
 * act once the open one has been determined, and does not exhaust the right after any number of
 * determinations — deliberately narrower than Part 9's one-journey-per-claim-ever standard.
 *
 * ⛔ The pre-check that raises this is the INTERFACE; the partial UNIQUE index
 * `member_moderation_appeals_one_open_per_action` is the BACKSTOP that closes the race the pre-check
 * cannot — two concurrent filings can both pass before either commits, but only one INSERT wins.
 * A `23505` leaking to a caller as a 500 is a bug.
 */
export class ModerationAppealAlreadyOpenError extends Error {
  public readonly name = 'ModerationAppealAlreadyOpenError';
  public readonly code = MODERATION_APPEAL_ALREADY_OPEN_CODE;
  public constructor(
    public readonly moderationActionId: string,
    public readonly openAppealId: string,
  ) {
    super(
      `an appeal against moderation action '${moderationActionId}' is already open; a further appeal may be filed once it is determined`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { moderation_action_id: this.moderationActionId, open_appeal_id: this.openAppealId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for an appeal that has already been determined (HTTP 409). */
export const MODERATION_APPEAL_ALREADY_DECIDED_CODE = 'member_moderation.appeal_already_decided';

/** Thrown when a determination is attempted on an appeal that is no longer `open`. §8.8 gives one review. */
export class ModerationAppealAlreadyDecidedError extends Error {
  public readonly name = 'ModerationAppealAlreadyDecidedError';
  public readonly code = MODERATION_APPEAL_ALREADY_DECIDED_CODE;
  public constructor(public readonly appealId: string) {
    super(`appeal '${appealId}' has already been determined; a recorded appeal decision is immutable`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { appeal_id: this.appealId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for the different-individual exclusion (HTTP 409 — ⛔ NEVER 403). */
export const MODERATION_APPEAL_ADJUDICATOR_EXCLUDED_CODE =
  'member_moderation.appeal_adjudicator_excluded';

/**
 * ⭐ Thrown when the adjudicator TOOK PART in the act under appeal — as the authority who imposed it,
 * or by contributing a ground it rests on.
 *
 * §8.8: the appeal "shall be heard by a member of the Panel who did not take part in the act appealed
 * against". That is the natural-justice requirement Deed Clause 26 binds every Board discretion to.
 *
 * ⛔ **THIS IS A 409, NEVER A 403**, and the distinction is not pedantry. A 403 says *you may not do
 * this at all*; this actor holds the key and may decide any other appeal. What is being refused is a
 * relationship between THIS actor and THIS case — a state objection, not an authorization failure.
 * Mapping it to 403 makes the two indistinguishable to the operator, who is then told they lack a
 * capability they in fact hold, with nothing naming the real cause.
 *
 * ⚠ Where the exclusion set leaves NO eligible Panel member, §8.8 is explicit: the appeal "remains
 * filed and open" — neither determined nor dismissed — and constituting an eligible bench is a matter
 * for the Board under Deed Clause 18. This error is that outcome's mechanism: it refuses the
 * determination and leaves the record untouched.
 */
export class ModerationAppealAdjudicatorExcludedError extends Error {
  public readonly name = 'ModerationAppealAdjudicatorExcludedError';
  public readonly code = MODERATION_APPEAL_ADJUDICATOR_EXCLUDED_CODE;
  public constructor(
    public readonly appealId: string,
    public readonly moderationActionId: string,
  ) {
    super(
      'Niyamavali §8.8 requires the appeal to be heard by a Panel member who did not take part in the act appealed against; this actor imposed it or contributed a ground it rests on',
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { appeal_id: this.appealId, moderation_action_id: this.moderationActionId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced code for an appeal id that does not resolve in the caller's scope (HTTP 404). */
export const MODERATION_APPEAL_NOT_FOUND_CODE = 'member_moderation.appeal_not_found';

/** Thrown when no appeal with this id exists in the caller's Pariwar. ⚠ 404, not 403 — an ownership
 *  read must not reveal that a record exists in another tenant. */
export class ModerationAppealNotFoundError extends Error {
  public readonly name = 'ModerationAppealNotFoundError';
  public readonly code = MODERATION_APPEAL_NOT_FOUND_CODE;
  public constructor(public readonly appealId: string) {
    super(`no moderation appeal '${appealId}'`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { appeal_id: this.appealId },
        request_id: requestId,
      },
    };
  }
}
