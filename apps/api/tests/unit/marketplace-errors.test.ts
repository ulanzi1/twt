// The module surface's domain-error → HTTP mapping — Story 12.2 (`2026-11-01-433` QE18; Task 5.3).
//
// Row by row over EVERY row of the QE18 table that `mapModuleError` owns (the idempotency-key rows are the handler's own and
// are pinned through HTTP in `tests/integration/marketplace-admin.spec.ts`). The same domain error maps per OPERATION
// (`OutsideWindow` at author 422 / at publish 409; `IllegalTransition` on publish → `module.not_draft`, on withdraw →
// `module.illegal_transition`). Anything outside the table — `ToneReviewRequiredError`, an `ApiError`, a `ModulePersistError`,
// a plain Error — is rethrown UNCHANGED (the SAME instance) for the central mapper.

import { ModuleStateDirectWriteError, marketplace, toneReview } from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError } from '../../src/http-errors.js';
import { mapModuleError, type ModuleOperation } from '../../src/modules/marketplace/errors.js';

const MID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const PID = '0f8fad5b-d9cb-469f-a165-70867728950e';

/** Invoke the mapper and return whatever it threw. */
function thrown(err: unknown, op: ModuleOperation = 'author'): unknown {
  try {
    mapModuleError(err, op);
  } catch (e) {
    return e;
  }
  throw new Error('mapModuleError returned');
}

function mapped(err: unknown, op: ModuleOperation = 'author'): ApiError {
  const e = thrown(err, op);
  expect(e).toBeInstanceOf(ApiError);
  return e as ApiError;
}

/** A pg-shaped 23505 on `constraint`, wrapped the way drizzle wraps it (a `cause`). */
function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error('Failed query: insert …'), {
    cause: { code: '23505', constraint, message: `duplicate key value violates unique constraint "${constraint}"`, severity: 'ERROR' },
  });
}

const zodError = (path: string): z.ZodError => {
  const r = z.object({ [path]: z.string() }).strict().safeParse({ [path]: 1 });
  if (r.success) throw new Error('expected a ZodError');
  return r.error;
};

describe('mapModuleError — the QE18 table, row by row', () => {
  it('ModuleManifestInvalidError → 422 module.manifest_invalid with each issue path + message', () => {
    const e = mapped(new marketplace.ModuleManifestInvalidError(zodError('name_hi')));
    expect([e.statusCode, e.code]).toEqual([422, 'module.manifest_invalid']);
    expect(e.details).toEqual({ issues: [{ path: ['name_hi'], message: expect.any(String) }] });
  });

  it('ModuleOutsideWindowError → 422 at author, 409 at publish (module.window_ended)', () => {
    const err = () => new marketplace.ModuleOutsideWindowError(MID, 'x', new Date(), new Date(), new Date());
    expect([mapped(err(), 'author').statusCode, mapped(err(), 'author').code]).toEqual([422, 'module.window_ended']);
    expect([mapped(err(), 'publish').statusCode, mapped(err(), 'publish').code]).toEqual([409, 'module.window_ended']);
  });

  it('ModuleIllegalTransitionError → 409 module.not_draft on publish, 409 module.illegal_transition on withdraw', () => {
    const err = () => new marketplace.ModuleIllegalTransitionError(MID, 'archived', 'module.archived');
    expect([mapped(err(), 'publish').statusCode, mapped(err(), 'publish').code]).toEqual([409, 'module.not_draft']);
    expect([mapped(err(), 'withdraw').statusCode, mapped(err(), 'withdraw').code]).toEqual([409, 'module.illegal_transition']);
  });

  it('ModuleGenesisMissingError → 404 module.not_found (the publish pre-check reuses it — no new class)', () => {
    for (const op of ['publish', 'withdraw'] as const) {
      const e = mapped(new marketplace.ModuleGenesisMissingError(MID), op);
      expect([e.statusCode, e.code]).toEqual([404, 'module.not_found']);
    }
  });

  it('ModuleArchiveReasonNotSatisfiedError → 409 module.archive_not_allowed', () => {
    const e = mapped(new marketplace.ModuleArchiveReasonNotSatisfiedError(MID, 'valid_until_reached', 'too early'), 'withdraw');
    expect([e.statusCode, e.code]).toEqual([409, 'module.archive_not_allowed']);
  });

  it('ModuleStreamConcurrencyError → 409 module.concurrent_change', () => {
    const e = mapped(new marketplace.ModuleStreamConcurrencyError(MID, 3), 'publish');
    expect([e.statusCode, e.code]).toEqual([409, 'module.concurrent_change']);
  });

  it('ModuleGenesisAlreadyExistsError → 409 module.already_exists', () => {
    const e = mapped(new marketplace.ModuleGenesisAlreadyExistsError(MID));
    expect([e.statusCode, e.code]).toEqual([409, 'module.already_exists']);
  });

  it('23505 marketplace_module_publications_pkey → 409 module.already_published', () => {
    const e = mapped(uniqueViolation('marketplace_module_publications_pkey'), 'publish');
    expect([e.statusCode, e.code]).toEqual([409, 'module.already_published']);
  });

  it('23505 marketplace_partners_pariwar_name_en_unique → 409 module_partner.name_taken', () => {
    const e = mapped(uniqueViolation('marketplace_partners_pariwar_name_en_unique'), 'partner');
    expect([e.statusCode, e.code]).toEqual([409, 'module_partner.name_taken']);
  });

  it('ModulePartnerUnknownError → 422 module.partner_unknown with { partner_id }', () => {
    const e = mapped(new marketplace.ModulePartnerUnknownError(PID));
    expect([e.statusCode, e.code, e.details]).toEqual([422, 'module.partner_unknown', { partner_id: PID }]);
  });

  it('ModuleScopeRequiresGeoTreeError → 422 module.state_scope_requires_geo_tree with {}', () => {
    const e = mapped(new marketplace.ModuleScopeRequiresGeoTreeError());
    expect([e.statusCode, e.code, e.details]).toEqual([422, 'module.state_scope_requires_geo_tree', {}]);
  });

  it('ModuleScopeValueUnknownError → 422 module.scope_value_unknown with { scope, values } (the offending values)', () => {
    const e = mapped(new marketplace.ModuleScopeValueUnknownError('district', ['Atlantis', 'Lemuria']));
    expect([e.statusCode, e.code, e.details]).toEqual([
      422,
      'module.scope_value_unknown',
      { scope: 'district', values: ['Atlantis', 'Lemuria'] },
    ]);
  });

  it('ModulePartnerNameInvalidError → 422 module_partner.name_invalid with { issues: { path, message }[] }', () => {
    const e = mapped(new marketplace.ModulePartnerNameInvalidError(zodError('display_name_hi')), 'partner');
    expect([e.statusCode, e.code]).toEqual([422, 'module_partner.name_invalid']);
    expect(e.details).toEqual({ issues: [{ path: ['display_name_hi'], message: expect.any(String) }] });
  });

  it('ModuleCursorInvalidError → 400 module.cursor_invalid with {}', () => {
    const e = mapped(new marketplace.ModuleCursorInvalidError('alphabet'), 'read');
    expect([e.statusCode, e.code, e.details]).toEqual([400, 'module.cursor_invalid', {}]);
  });

  it('ModuleStateDirectWriteError → 500 module.state_direct_write_rejected (a bug, logged)', () => {
    // The title promises "logged" (12.2 review RP15): spy on the log, and silence it for the run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const e = mapped(new ModuleStateDirectWriteError('unguarded UPDATE'), 'publish');
      expect([e.statusCode, e.code]).toEqual([500, 'module.state_direct_write_rejected']);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0]?.[0])).toContain('direct write rejected');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('mapModuleError — everything else is rethrown UNCHANGED (the same instance)', () => {
  it.each([
    [
      'ToneReviewRequiredError',
      () =>
        new toneReview.ToneReviewRequiredError({
          reason: 'author-is-reviewer',
          resourceLocator: `module/${MID}`,
          authoredBy: PID,
          reviewedBy: PID,
        }),
    ],
    ['an ApiError', () => new ApiError(409, 'module.not_draft', 'x')],
    ['ModulePersistError', () => new marketplace.ModulePersistError(MID, new Error('boom'))],
    ['ModuleProjectorInputError', () => new marketplace.ModuleProjectorInputError('bad input')],
    ['a plain Error', () => new Error('anything')],
    ['a 23505 on an unrelated constraint', () => uniqueViolation('events_log_stream_id_event_version_uq')],
  ])('%s', (_name, make) => {
    const err = make();
    expect(thrown(err, 'publish')).toBe(err);
  });
});
