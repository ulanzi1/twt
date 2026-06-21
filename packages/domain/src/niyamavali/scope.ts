// Affected-member-scope structural validator — Story 2.3 (Task 3 / architecture §1.10).
//
// architecture §1.10 L1053-1056: "Amendments cannot be committed without a scope
// declaration." The amend write path calls `assertAffectedMemberScope` so a
// malformed/absent scope is rejected BEFORE the amendment row is persisted (the
// DB NOT-NULL guards absence; this guards SHAPE).
//
// This is a domain-LOCAL structural guard, NOT the contracts Zod schema:
// `@twt/domain` must NOT import `@twt/contracts` (turbo cycle). The transport
// boundary's `AffectedMemberScopeSchema` (Story 2.4 route) is value-aligned with
// this guard (the `Locale` / `PariwarIdSchema` precedent), and a contracts test
// asserts the alignment. 2.3 stores + validates the declaration; Epic 4 resolves
// it to member ids + cache invalidation (seam-clean).

import { CLAUSE_ID_REGEX } from '../ids/index.js';
import type { ClauseId } from '../ids/index.js';
import type { AffectedMemberScope } from '../schema/niyamavali_amendments.js';

/** The discriminator values a scope declaration may carry. */
export const AFFECTED_MEMBER_SCOPE_KINDS = [
  'all_members',
  'past_lockin',
  'rule_subclause',
  'named_cohort',
] as const;

/** Thrown when an affected-member-scope declaration is malformed (architecture §1.10). */
export class InvalidAffectedMemberScopeError extends Error {
  public readonly name = 'InvalidAffectedMemberScopeError';
  public constructor(public readonly detail: string) {
    super(`invalid affected_member_scope declaration: ${detail}`);
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a value is a well-formed `AffectedMemberScope` declaration, returning
 * it narrowed (throws `InvalidAffectedMemberScopeError` on any malformation).
 * Pure — no DB, no interpretation (Epic 4 resolves the scope to member ids).
 */
export function assertAffectedMemberScope(value: unknown): AffectedMemberScope {
  if (!isObject(value)) {
    throw new InvalidAffectedMemberScopeError('not an object');
  }
  const kind = value['kind'];
  if (typeof kind !== 'string' || !(AFFECTED_MEMBER_SCOPE_KINDS as readonly string[]).includes(kind)) {
    throw new InvalidAffectedMemberScopeError(
      `kind must be one of ${AFFECTED_MEMBER_SCOPE_KINDS.join(' | ')}; got ${JSON.stringify(kind)}`,
    );
  }

  switch (kind) {
    case 'all_members':
    case 'past_lockin':
      // No additional fields.
      return { kind };
    case 'rule_subclause': {
      const clauseId = value['clause_id'];
      const subclause = value['subclause'];
      if (typeof clauseId !== 'string' || !CLAUSE_ID_REGEX.test(clauseId)) {
        throw new InvalidAffectedMemberScopeError('rule_subclause.clause_id must be a valid clause id');
      }
      if (typeof subclause !== 'string' || subclause.length === 0) {
        throw new InvalidAffectedMemberScopeError('rule_subclause.subclause must be a non-empty string');
      }
      return { kind: 'rule_subclause', clause_id: clauseId as ClauseId, subclause };
    }
    case 'named_cohort': {
      const definition = value['definition'];
      if (typeof definition !== 'string' || definition.length === 0) {
        throw new InvalidAffectedMemberScopeError('named_cohort.definition must be a non-empty string');
      }
      return { kind: 'named_cohort', definition };
    }
    /* c8 ignore next */
    default:
      throw new InvalidAffectedMemberScopeError(`unhandled kind ${String(kind)}`);
  }
}
