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
    public readonly reason: 'missing' | 'too_short',
    public readonly minChars: number,
  ) {
    super(
      `${FIELD_DESCRIPTIONS[part]} is ${
        reason === 'missing'
          ? 'required for a termination'
          : `too short (minimum ${minChars} characters)`
      }`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { part: this.part, reason: this.reason, min_chars: this.minChars },
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
