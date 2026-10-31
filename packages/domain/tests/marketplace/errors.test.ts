// Story 12.1 review RV2 / RV6 — the typed errors carry the pg text only. DB-free.
//
// drizzle-orm >= 0.44 wraps a failed query in a `DrizzleQueryError` whose message is `Failed query: <sql>` +
// `params: <every bound value>`, with the pg error on `.cause`. Nothing that can reach a client — the
// `toErrorResponse().message` of `ModuleStateDirectWriteError`, the message of `ModulePersistError` — may carry
// the bound manifest (the lead URL, the signing-key secret name, the bilingual text).

import { describe, expect, it } from 'vitest';

import {
  MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX as PREFIX,
  ModulePersistError,
  ModuleStateDirectWriteError,
  isModuleStateDirectWriteError,
  pgMessageOf,
  pgSqlstateOf,
  ModuleStreamConcurrencyError,
} from '../../src/marketplace/errors.js';
import { mapModuleWriteError } from '../../src/marketplace/project.js';

const BOUND = 'https://leads.partner.example/hdfc/twt-bihar';
const TRIGGER_TEXT = `${PREFIX} — only the event-replay projector may create a module row (Story 12.1 I1); attempted INSERT of module m1`;

function pgError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

/** What `db.insert(...)` throws on drizzle-orm 0.45: the wrapper's message holds the SQL and every parameter. */
function drizzleWrapped(cause: unknown): Error {
  return Object.assign(
    new Error(`Failed query: insert into "marketplace_modules" ("lead_handoff_url") values ($1)\nparams: ${BOUND}`),
    { cause },
  );
}

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('pgMessageOf / pgSqlstateOf', () => {
  it('returns the pg error’s text from a drizzle-wrapped error, never the wrapper’s', () => {
    const wrapped = drizzleWrapped(pgError('P0001', TRIGGER_TEXT));
    expect(pgMessageOf(wrapped)).toBe(TRIGGER_TEXT);
    expect(pgSqlstateOf(wrapped)).toBe('P0001');
  });

  it('with no pg error on the chain, falls back to the INNERMOST error’s message (not the wrapper’s)', () => {
    const wrapped = drizzleWrapped(new Error('expected 1 row inserted, got 0'));
    expect(pgMessageOf(wrapped)).toBe('expected 1 row inserted, got 0');
    expect(pgSqlstateOf(wrapped)).toBeNull();
  });

  it('handles a bare pg error, a plain Error and a non-Error', () => {
    expect(pgMessageOf(pgError('23514', 'check violated'))).toBe('check violated');
    expect(pgMessageOf(new Error('boom'))).toBe('boom');
    expect(pgMessageOf('just a string')).toBe('just a string');
  });
});

describe('pgSqlstateOf — a SQLSTATE is five upper-case alphanumerics (RP8)', () => {
  it.each(['ECONNRESET', 'ETIMEDOUT', 'p0001', '4001', '400011'])('%s is not a SQLSTATE ⇒ null', (code) => {
    expect(pgSqlstateOf(drizzleWrapped(pgError(code, 'socket')))).toBeNull();
  });

  it.each(['40P01', '42501', '23514', 'P0001', '22P02'])('%s is returned', (code) => {
    expect(pgSqlstateOf(drizzleWrapped(pgError(code, 'pg')))).toBe(code);
  });

  it('a cyclic cause chain terminates (depth-bounded) and yields no SQLSTATE', () => {
    const a: Error & { cause?: unknown } = new Error('a');
    const b: Error & { cause?: unknown } = new Error('b');
    a.cause = b;
    b.cause = a;
    expect(pgSqlstateOf(a)).toBeNull();
    expect(typeof pgMessageOf(a)).toBe('string');
  });

  it('a chain deeper than the walker’s bound terminates without finding the pg error at the far end', () => {
    let chain: Error = pgError('40P01', 'deadlock detected');
    for (let i = 0; i < 12; i += 1) chain = Object.assign(new Error(`wrapper ${String(i)}`), { cause: chain });
    expect(pgSqlstateOf(chain)).toBeNull();
    expect(typeof pgMessageOf(chain)).toBe('string');
  });
});

describe('ModuleStateDirectWriteError (RV2)', () => {
  it('built from a drizzle-wrapped trigger refusal: the prefix ONCE, and no SQL, no params, no bound value', () => {
    const wrapped = drizzleWrapped(pgError('P0001', TRIGGER_TEXT));
    expect(isModuleStateDirectWriteError(wrapped)).toBe(true);

    const err = new ModuleStateDirectWriteError(pgMessageOf(wrapped));
    expect(err.message.startsWith(`${PREFIX}: `)).toBe(true);
    expect(occurrences(err.message, PREFIX)).toBe(1);
    expect(err.message).toContain('only the event-replay projector may create a module row');
    for (const leaked of ['Failed query', 'params:', 'insert into', BOUND]) expect(err.message).not.toContain(leaked);

    // …and that message is exactly what `toErrorResponse` hands a client.
    expect(err.toErrorResponse('req-1').error.message).toBe(err.message);
  });

  it('a detail WITHOUT the prefix still gets it once', () => {
    const err = new ModuleStateDirectWriteError('something else');
    expect(err.message).toBe(`${PREFIX}: something else`);
  });
});

describe('mapModuleWriteError — the projector’s mapper, end to end (RV2)', () => {
  it('a drizzle-wrapped trigger refusal becomes a ModuleStateDirectWriteError whose message leaks no params', () => {
    const mapped = mapModuleWriteError(drizzleWrapped(pgError('P0001', TRIGGER_TEXT)), 'm1', 2, null);
    expect(mapped).toBeInstanceOf(ModuleStateDirectWriteError);
    const message = (mapped as ModuleStateDirectWriteError).message;
    expect(occurrences(message, PREFIX)).toBe(1);
    for (const leaked of ['Failed query', 'params:', BOUND]) expect(message).not.toContain(leaked);
  });

  it('a stream-version 23505 is still the typed concurrency error, and an unknown failure propagates unchanged', () => {
    const dup = Object.assign(pgError('23505', 'duplicate key'), { constraint: 'events_log_stream_id_event_version_uq' });
    expect(mapModuleWriteError(drizzleWrapped(dup), 'm1', 2, null)).toBeInstanceOf(ModuleStreamConcurrencyError);
    const rls = drizzleWrapped(pgError('42501', 'new row violates row-level security policy'));
    expect(mapModuleWriteError(rls, 'm1', 2, null)).toBe(rls);
  });
});

describe('ModulePersistError (RV6)', () => {
  it('keeps the SQLSTATE readable (40P01 / 42501 / 23514 …) and puts no params in the message', () => {
    for (const code of ['40P01', '42501', '23514']) {
      const err = new ModulePersistError('m1', drizzleWrapped(pgError(code, `pg said ${code}`)));
      expect(err.sqlstate).toBe(code);
      expect(err.message).toBe(`failed to persist module row m1: pg said ${code}`);
      expect(err.message).not.toContain('params:');
      expect(err.message).not.toContain(BOUND);
    }
  });

  it('a non-pg cause (a 0-row UPDATE) has a null sqlstate and keeps its own message', () => {
    const err = new ModulePersistError('m1', new Error('expected 1 row updated, got 0'));
    expect(err.sqlstate).toBeNull();
    expect(err.message).toBe('failed to persist module row m1: expected 1 row updated, got 0');
  });
});
