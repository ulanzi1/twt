// The module surface's error mapper — Story 12.2 (`2026-11-01-433` QE18; Task 5.3).
//
// The 12.1 domain errors carry ⛔ HTTP ("the 12.2 / 12.3 / 12.6 routes map them"); this is 12.2's mapping of the QE18
// table's DOMAIN-ERROR rows — the author / partner pre-check refusals included, because they throw typed domain errors
// (`ModulePartnerUnknownError`, the two scope errors, `ModulePartnerNameInvalidError`; publish's unknown id is
// `ModuleGenesisMissingError`). NOT every row (12.2 review RB7 / PT18): the handler raises some rows itself as an `ApiError`.
// Publish's `module.not_draft` / `module.window_ended` pre-checks are thrown inside the write's `try`, so they pass THROUGH
// this mapper unchanged (the rows below answer the same codes when the COMMAND refuses: a concurrent publish that lost the
// row lock, or the defensive window check). The detail read's `module.not_found` and the idempotency rows
// (`module.idempotency_key_required`, `module.idempotency_in_progress`) are raised OUTSIDE it — they never reach this
// mapper. `withCompensatingAudit` RETHROWS after writing its `_rolled_back` line, so mapping here (in the handler's outer
// `catch`) keeps the compensating line. The
// central mapper is ⛔ touched: anything not in the table — `ToneReviewRequiredError`, an `ApiError`, `StepUpRequiredError`,
// a bug — is rethrown UNCHANGED for it to answer (409 `tone_review.required`; an unknown error → 500).
//
// ⛔ Copy, a manifest or a member in a message: codes, ids and the admin's own audience values only.

import { marketplace, ModuleStateDirectWriteError } from '@twt/domain';

import { ApiError } from '../../http-errors.js';

/** Which command an `OutsideWindow` / `IllegalTransition` came from — the same domain error maps per operation. */
export type ModuleOperation = 'author' | 'publish' | 'withdraw' | 'read' | 'partner';

const NOT_FOUND = (): ApiError => new ApiError(404, 'module.not_found', 'This offer was not found');

/**
 * Map a domain error to its transport error and THROW it; rethrow anything else unchanged. ⛔ Returns.
 */
export function mapModuleError(err: unknown, op: ModuleOperation): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof marketplace.ModuleManifestInvalidError) {
    throw new ApiError(422, 'module.manifest_invalid', 'The offer details are not valid', {
      issues: err.issues.map((i) => ({ path: i.path.map(String), message: i.message })),
    });
  }
  if (err instanceof marketplace.ModuleOutsideWindowError) {
    // At author: `valid_until ≤ now()` (A5). At publish: defensive only — the pre-read and the command share ONE
    // transaction, hence one `now()` (TR3).
    throw new ApiError(op === 'author' ? 422 : 409, 'module.window_ended', 'The offer window has already ended');
  }
  if (err instanceof marketplace.ModuleIllegalTransitionError) {
    throw op === 'publish'
      ? new ApiError(409, 'module.not_draft', 'Only a draft can be published')
      : new ApiError(409, 'module.illegal_transition', 'This offer cannot be changed from its current state');
  }
  if (err instanceof marketplace.ModuleGenesisMissingError) throw NOT_FOUND();
  if (err instanceof marketplace.ModuleArchiveReasonNotSatisfiedError) {
    throw new ApiError(409, 'module.archive_not_allowed', 'This offer cannot be withdrawn for that reason');
  }
  if (err instanceof marketplace.ModuleStreamConcurrencyError) {
    // ⛔ Retried by 12.2 (QE21 / RVD2): a drift is surfaced, never looped.
    throw new ApiError(409, 'module.concurrent_change', 'This offer was changed at the same time — reload it');
  }
  if (err instanceof marketplace.ModuleGenesisAlreadyExistsError) {
    // Unreachable with server-minted ids (QE13).
    throw new ApiError(409, 'module.already_exists', 'This offer already exists');
  }
  if (err instanceof marketplace.ModulePartnerUnknownError) {
    throw new ApiError(422, 'module.partner_unknown', 'That partner is not registered in this Pariwar', {
      partner_id: err.partnerId,
    });
  }
  if (err instanceof marketplace.ModuleScopeRequiresGeoTreeError) {
    throw new ApiError(422, 'module.state_scope_requires_geo_tree', 'A state audience needs a published place list with states', {});
  }
  if (err instanceof marketplace.ModuleScopeValueUnknownError) {
    // The offending values are the admin's OWN input (⛔ PII).
    throw new ApiError(422, 'module.scope_value_unknown', 'Some audience places are not recorded for this Pariwar', {
      scope: err.scope,
      values: [...err.values],
    });
  }
  if (err instanceof marketplace.ModulePartnerNameInvalidError) {
    throw new ApiError(422, 'module_partner.name_invalid', 'The partner name is not valid', {
      issues: err.issues.map((i) => ({ path: i.path.map(String), message: i.message })),
    });
  }
  if (err instanceof marketplace.ModuleCursorInvalidError) {
    throw new ApiError(400, 'module.cursor_invalid', 'The list position is not valid — start again from the first page', {});
  }
  if (err instanceof ModuleStateDirectWriteError) {
    // The 0193 trigger — a BUG (the projector writes under the guard). Logged at error; the central
    // `ClaimStateDirectWriteError` precedent, done locally. `packages/domain/src/index.ts` names this route as its mapper.
    console.error('[marketplace] marketplace_modules direct write rejected', JSON.stringify({ detail: err.detail }));
    throw new ApiError(500, err.code, 'The offer could not be saved');
  }
  const constraint = marketplace.uniqueViolationConstraint(err);
  if (constraint === marketplace.MODULE_PUBLICATION_PKEY_CONSTRAINT) {
    throw new ApiError(409, 'module.already_published', 'This offer has already been published');
  }
  if (constraint === marketplace.PARTNER_NAME_EN_UNIQUE_CONSTRAINT) {
    throw new ApiError(409, 'module_partner.name_taken', 'A partner with this English name is already registered');
  }
  // ModuleProjectorInputError, ModulePersistError, ToneReviewRequiredError, StepUpRequiredError, anything else: unchanged.
  throw err;
}
