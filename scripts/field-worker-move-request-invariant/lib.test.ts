// Teeth for scripts/field-worker-move-request-invariant (Story 13.1d AD2): each flagged form is found, each innocent form is not.

import { describe, expect, it } from 'vitest';

import { formatFinding, isAllowlistedWrite, scanMoveRequestWrites, unseenAllowlistedWriters, type MoveRequestWriteFinding } from './lib.js';

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

// Code review CR32 — three reviewers found the same holes in the first version: each spelling below passed the gate.
describe('scanMoveRequestWrites — the spellings the first version missed', () => {
  it('flags a write through a NAME bound to the table: `const t = ...`, an import alias, a destructured one, an alias of an alias declared later, a wrapped initializer', () => {
    for (const src of [
      'const t = fieldWorkerMoveRequests; function f(db) { db.update(t).set({}); }',
      "import { fieldWorkerMoveRequests as mr } from './schema'; function f(db) { db.insert(mr).values({}); }",
      'const { fieldWorkerMoveRequests: mr } = schema; function f(db) { db.update(mr).set({}); }',
      'function f(db) { db.update(b).set({}); } const b = a; const a = fieldWorkerMoveRequests;', // declared in the "wrong" order
      'const t = (fieldWorkerMoveRequests as any); function f(db) { db.update(t).set({}); }',
      "const t = schema.fieldWorkerMoveRequests; function f(db) { db.update(t).set({}); }",
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('flags the table read by element access, and a template whose SUBSTITUTION is the table (bare, namespaced or bound)', () => {
    for (const src of [
      "function f(db) { db.update(schema['fieldWorkerMoveRequests']).set({}); }",
      'function f(db) { db.update(schema["fieldWorkerMoveRequests"]).set({}); }',
      'function f(db) { return db.execute(sql`UPDATE ${fieldWorkerMoveRequests} SET state = 1`); }',
      'function f(db) { return db.execute(sql`INSERT INTO ${schema.fieldWorkerMoveRequests} (a) VALUES (1)`); }',
      'const t = fieldWorkerMoveRequests; function f(db) { return db.execute(sql`UPDATE ${t} SET state = ${1}`); }',
    ]) {
      expect(scan(src).length, src).toBeGreaterThan(0);
    }
  });

  it('flags the other raw verbs and spellings: UPDATE ONLY, MERGE INTO, COPY, a comment before the table, spaces around the schema dot', () => {
    for (const sql of [
      'UPDATE ONLY field_worker_move_requests SET a = 1',
      'MERGE INTO field_worker_move_requests t USING x ON true WHEN MATCHED THEN UPDATE SET a = 1',
      'COPY field_worker_move_requests FROM STDIN',
      'UPDATE /* a comment */ field_worker_move_requests SET a = 1',
      'UPDATE public . field_worker_move_requests SET a = 1',
      'INSERT INTO "public"."field_worker_move_requests" (a) VALUES (1)',
    ]) {
      const src = `async function f(c) { await c.query(\`${sql}\`); }`;
      expect(scan(src).map((x) => x.detail), sql).toEqual(['raw SQL write to field_worker_move_requests']);
    }
  });

  it('reads a `.js`, `.mjs` and `.jsx` file too', () => {
    for (const file of ['x.js', 'x.mjs', 'x.jsx']) {
      expect(scanMoveRequestWrites(file, "async function f(c) { await c.query('UPDATE field_worker_move_requests SET a = 1'); }").length, file).toBe(1);
    }
  });

  it('does NOT flag the innocent neighbours: a read through an alias, an alias of another table, another table in a substitution, a longer table name', () => {
    for (const src of [
      'const t = fieldWorkerMoveRequests; function f(db) { db.select().from(t); }',
      'const t = fieldWorkerNotices; function f(db) { db.update(t).set({}); }',
      'function f(db) { return db.execute(sql`UPDATE ${fieldWorkerNotices} SET seen_at = now()`); }',
      "function f(c) { c.query('UPDATE ONLY field_worker_move_requests_archive SET a = 1'); }",
      "function f(c) { c.query('SELECT * FROM field_worker_move_requests FOR UPDATE'); }",
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

// Code review RP-8 (of the round-1 patches) — the forms that still passed: the write METHOD reached some other way than `x.update(...)`, and a
// table held by an assignment, an object property or an array. Each is found; the innocent neighbours stay unflagged.
describe('scanMoveRequestWrites — the callee and alias spellings the patch review found', () => {
  it('flags a write whose METHOD is spelled by element access, with a non-null assertion, in parentheses, or destructured (a bare call)', () => {
    for (const src of [
      "function f(db) { db['update'](fieldWorkerMoveRequests).set({}); }",
      'function f(db) { db["insert"](fieldWorkerMoveRequests).values({}); }',
      'function f(db) { db.update!(fieldWorkerMoveRequests).set({}); }',
      'function f(db) { (db.update)(fieldWorkerMoveRequests).set({}); }',
      'function f(db) { const { update } = db; update(fieldWorkerMoveRequests).set({}); }',
      'function f(db) { db?.update(fieldWorkerMoveRequests).set({}); }',
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('flags a table held by an ASSIGNMENT, an object PROPERTY (read as `.t`, `[\'t\']` or destructured) or an ARRAY (read as `a[0]`)', () => {
    for (const src of [
      'let t; t = fieldWorkerMoveRequests; function f(db) { db.update(t).set({}); }',
      'const m = { t: fieldWorkerMoveRequests }; function f(db) { db.update(m.t).set({}); }',
      "const m = { t: fieldWorkerMoveRequests }; function f(db) { db.update(m['t']).set({}); }",
      'const m = { fieldWorkerMoveRequests }; function f(db) { db.insert(m.fieldWorkerMoveRequests).values({}); }',
      'const m = { t: fieldWorkerMoveRequests }; const { t } = m; function f(db) { db.update(t).set({}); }',
      'const m: any = {}; m.t = fieldWorkerMoveRequests; function f(db) { db.update(m.t).set({}); }',
      'const a = [fieldWorkerMoveRequests]; function f(db) { db.update(a[0]).set({}); }',
      'const a = [fieldWorkerMoveRequests] as const; function f(db) { db.update(a[0]).set({}); }',
      'const a = [fieldWorkerMoveRequests]; const t = a[0]; function f(db) { db.update(t).set({}); }',
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('does NOT flag the innocent neighbours: another table in a property or an array, a read of a held table, an unrelated `update` / `insert`', () => {
    for (const src of [
      'const m = { t: fieldWorkerNotices }; function f(db) { db.update(m.t).set({}); }',
      'const a = [fieldWorkerNotices]; function f(db) { db.update(a[0]).set({}); }',
      'const m = { t: fieldWorkerMoveRequests }; function f(db) { db.select().from(m.t); }',
      'const a = [fieldWorkerMoveRequests]; function f(db) { return db.select().from(a[0]); }',
      "function f(db) { db['select']().from(fieldWorkerMoveRequests); }",
      'function f(update, x) { update(x); }',
      'function f(update) { update(fieldWorkerNotices); }',
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

// Code review R4-6 (round 4) — spellings beside the ones the header named: any schema, a schema by substitution, a `--` comment, the SQL
// name in a constant, a second drizzle table over the name, array destructuring and a `+` chain. Each found once; the neighbours are not.
describe('scanMoveRequestWrites — the spellings round 4 found', () => {
  it('flags a raw write through ANY schema, a schema put in by a substitution, and a `--` line comment', () => {
    for (const src of [
      "function f(c) { c.query('UPDATE app.field_worker_move_requests SET a = 1'); }",
      'function f(c) { c.query(\'UPDATE "tenant" . "field_worker_move_requests" SET a = 1\'); }',
      'function f(c, schema) { c.query(`UPDATE ${schema}.field_worker_move_requests SET a = 1`); }',
      "function f(c) { c.query('UPDATE -- the row\\n field_worker_move_requests SET a = 1'); }",
      "function f(c) { c.query('INSERT INTO -- one\\n /* two */ public.field_worker_move_requests (a) VALUES (1)'); }",
    ]) {
      expect(scan(src).map((x) => x.detail), src).toEqual(['raw SQL write to field_worker_move_requests']);
    }
  });

  it('flags the SQL name held in a constant and substituted, a second pgTable over the name, array destructuring, and a `+` chain - once each', () => {
    for (const src of [
      "const T = 'field_worker_move_requests'; function f(c) { c.query(`UPDATE ${T} SET a = 1`); }",
      'const T = \'"public"."field_worker_move_requests"\'; function f(c) { c.query(`INSERT INTO ${T} (a) VALUES (1)`); }',
      "const x = pgTable('field_worker_move_requests', {}); function f(db) { db.update(x).set({}); }",
      'const [t] = [fieldWorkerMoveRequests]; function f(db) { db.update(t).set({}); }',
      'const a = [fieldWorkerMoveRequests]; const [t] = a; function f(db) { db.insert(t).values({}); }',
      "function f(c) { c.query('UPDATE ' + 'field_worker_move_requests SET a = 1'); }",
      "const T = 'field_worker_move_requests'; function f(c) { c.query('UPDATE ' + T + ' SET a = 1'); }",
      "function f(c) { c.query(('UPDATE ONLY ') + 'field_worker_move_requests' + ' SET a = 1'); }",
    ]) {
      expect(scan(src), src).toHaveLength(1);
    }
  });

  it('does NOT flag the neighbours: another table in a constant, a chain with no write, a destructured OTHER element, a longer name, a read', () => {
    for (const src of [
      "const T = 'field_worker_notices'; function f(c) { c.query(`UPDATE ${T} SET a = 1`); }",
      "const T = 'field_worker_move_requests'; function f(c) { c.query(`SELECT * FROM ${T}`); }",
      "function f(c) { c.query('SELECT * ' + 'FROM field_worker_move_requests'); }",
      'const [a, b] = [fieldWorkerNotices, fieldWorkerMoveRequests]; function f(db) { db.update(a).set({}); }',
      "function f(c) { c.query('UPDATE app.field_worker_move_requests_archive SET a = 1'); }",
      "const x = pgTable('field_worker_notices', {}); function f(db) { db.update(x).set({}); }",
      "function f(c) { c.query('SELECT 1 FROM t WHERE x = 1 -- update\\n'); }",
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

describe('the allow-list diagnostics and the non-vacuity floor', () => {
  const finding = (over: Partial<MoveRequestWriteFinding>): MoveRequestWriteFinding => ({ file: 'p.ts', line: 1, detail: 'raw SQL write to field_worker_move_requests', enclosingFunction: 'w', ...over });
  const allow = [{ file: 'p.ts', functions: new Set(['w']) }];

  it('a write moved into a callback reads `<anonymous>` and the message says why it fails', () => {
    const [f] = scan("function w(c) { return run(async () => c.query('UPDATE field_worker_move_requests SET a = 1')); }");
    expect(f!.enclosingFunction).toBe('<anonymous>');
    expect(formatFinding(f!)).toContain('the allow-list matches the innermost NAMED function');
    expect(formatFinding(finding({}))).not.toContain('innermost NAMED');
  });

  it('the floor lists an allow-listed writer that was not SEEN writing — both the raw write and the setting are needed', () => {
    const raw = finding({});
    const setting = finding({ detail: 'the app.field_worker_move_request_writer setting' });
    expect(unseenAllowlistedWriters([raw, setting], allow)).toEqual([]);
    expect(unseenAllowlistedWriters([raw], allow)).toEqual(['p.ts w']); // no setting
    expect(unseenAllowlistedWriters([setting], allow)).toEqual(['p.ts w']); // no raw write
    expect(unseenAllowlistedWriters([], allow)).toEqual(['p.ts w']); // a blind scan
    expect(unseenAllowlistedWriters([finding({ enclosingFunction: 'renamed' }), finding({ enclosingFunction: 'renamed', detail: 'the app.field_worker_move_request_writer setting' })], allow)).toEqual(['p.ts w']); // the projector was renamed
  });
});
