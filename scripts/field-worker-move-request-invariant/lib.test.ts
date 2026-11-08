// Teeth for scripts/field-worker-move-request-invariant (Story 13.1d AD2): each flagged form is found, each innocent form is not.

import { describe, expect, it } from 'vitest';

import { isAllowlistedWrite, scanMoveRequestWrites } from './lib.js';

const scan = (src: string) => scanMoveRequestWrites('x.ts', src);

describe('scanMoveRequestWrites', () => {
  it('flags a raw INSERT / UPDATE in a string, a template and a template with substitutions — any case, quoted or schema-qualified', () => {
    for (const src of [
      "async function f(c) { await c.query('INSERT INTO field_worker_move_requests (a) VALUES (1)'); }",
      'async function f(c) { await c.query(`update field_worker_move_requests set state = 1`); }',
      'async function f(c, t) { await c.query(`UPDATE "field_worker_move_requests" SET state = ${t}`); }',
      'async function f(c) { await c.query(`insert into public.field_worker_move_requests (a) values (1)`); }',
    ]) {
      expect(scan(src).map((f) => f.detail), src).toEqual(['raw SQL write to field_worker_move_requests']);
      expect(scan(src)[0]!.enclosingFunction).toBe('f');
    }
  });

  it('flags the writer setting, and a drizzle insert / update on the table (bare, namespaced, wrapped)', () => {
    expect(scan("const g = async (c) => c.query(\"SET LOCAL app.field_worker_move_request_writer = 'on'\");")[0]).toMatchObject({
      detail: 'the app.field_worker_move_request_writer setting',
      enclosingFunction: 'g',
    });
    for (const src of [
      'function f(db) { db.update(fieldWorkerMoveRequests).set({ state: 1 }); }',
      'function f(db) { db.insert(schema.fieldWorkerMoveRequests).values({}); }',
      'function f(db) { db.update((fieldWorkerMoveRequests as any)).set({}); }',
    ]) {
      expect(scan(src).length, src).toBe(1);
    }
  });

  it('does NOT flag a read, a DELETE (the trigger refuses it), the notices table, or a comment', () => {
    for (const src of [
      "function f(c) { c.query('SELECT * FROM field_worker_move_requests FOR UPDATE'); }",
      "function f(c) { c.query('UPDATE field_worker_move_requests_archive SET a = 1'); }",
      "function f(c) { c.query('INSERT INTO field_worker_notices (a) VALUES (1)'); }",
      'function f(db) { db.select().from(fieldWorkerMoveRequests); }',
      '// UPDATE field_worker_move_requests SET state = 1\nfunction f() {}',
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });

  it('the allowlist is by FILE + FUNCTION — another function in the projector file is still a violation', () => {
    const allow = [{ file: 'x.ts', functions: new Set(['projectMoveRequestTransition']) }];
    const [inside] = scan("function projectMoveRequestTransition(c) { c.query('UPDATE field_worker_move_requests SET a = 1'); }");
    const [outside] = scan("function helper(c) { c.query('UPDATE field_worker_move_requests SET a = 1'); }");
    expect(isAllowlistedWrite(inside!, allow)).toBe(true);
    expect(isAllowlistedWrite(outside!, allow)).toBe(false);
  });
});
