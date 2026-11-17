// Teeth for scripts/field-worker-ending-appeal-invariant (Story 13.1f AD7; the 13.1d AD2 model): each flagged form is found, each innocent form is not.

import { describe, expect, it } from 'vitest';

import { formatFinding, isAllowlistedWrite, scanEndingAppealWrites, unseenAllowlistedWriters, type EndingAppealWriteFinding } from './lib.js';

const scan = (src: string) => scanEndingAppealWrites('x.ts', src);

describe('scanEndingAppealWrites', () => {
  it('flags a raw INSERT / UPDATE in a string, a template and a template with substitutions — any case, quoted or schema-qualified', () => {
    for (const src of [
      "async function f(c) { await c.query('INSERT INTO field_worker_ending_appeals (a) VALUES (1)'); }",
      'async function f(c) { await c.query(`update field_worker_ending_appeals set state = 1`); }',
      'async function f(c, t) { await c.query(`UPDATE "field_worker_ending_appeals" SET state = ${t}`); }',
      'async function f(c) { await c.query(`insert into public.field_worker_ending_appeals (a) values (1)`); }',
    ]) {
      expect(scan(src).map((f) => f.detail), src).toEqual(['raw SQL write to field_worker_ending_appeals']);
      expect(scan(src)[0]!.enclosingFunction).toBe('f');
    }
  });

  it('flags the writer setting, and a drizzle insert / update on the table (bare, namespaced, wrapped)', () => {
    expect(scan("const g = async (c) => c.query(\"SET LOCAL app.field_worker_ending_appeal_writer = 'on'\");")[0]).toMatchObject({
      detail: 'the app.field_worker_ending_appeal_writer setting',
      enclosingFunction: 'g',
    });
    for (const src of [
      'function f(db) { db.update(fieldWorkerEndingAppeals).set({ state: 1 }); }',
      'function f(db) { db.insert(schema.fieldWorkerEndingAppeals).values({}); }',
      'function f(db) { db.update((fieldWorkerEndingAppeals as any)).set({}); }',
    ]) {
      expect(scan(src).length, src).toBe(1);
    }
  });

  it('does NOT flag a read, a DELETE (the trigger refuses it), the notices table, or a comment', () => {
    for (const src of [
      "function f(c) { c.query('SELECT * FROM field_worker_ending_appeals FOR UPDATE'); }",
      "function f(c) { c.query('UPDATE field_worker_ending_appeals_archive SET a = 1'); }",
      "function f(c) { c.query('INSERT INTO field_worker_notices (a) VALUES (1)'); }",
      'function f(db) { db.select().from(fieldWorkerEndingAppeals); }',
      '// UPDATE field_worker_ending_appeals SET state = 1\nfunction f() {}',
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });

  it('the allowlist is by FILE + FUNCTION — another function in the projector file is still a violation', () => {
    const allow = [{ file: 'x.ts', functions: new Set(['projectEndingAppealTransition']) }];
    const [inside] = scan("function projectEndingAppealTransition(c) { c.query('UPDATE field_worker_ending_appeals SET a = 1'); }");
    const [outside] = scan("function helper(c) { c.query('UPDATE field_worker_ending_appeals SET a = 1'); }");
    expect(isAllowlistedWrite(inside!, allow)).toBe(true);
    expect(isAllowlistedWrite(outside!, allow)).toBe(false);
  });
});

// Code review CR32 — three reviewers found the same holes in the first version: each spelling below passed the gate.
describe('scanEndingAppealWrites — the spellings the first version missed', () => {
  it('flags a write through a NAME bound to the table: `const t = ...`, an import alias, a destructured one, an alias of an alias declared later, a wrapped initializer', () => {
    for (const src of [
      'const t = fieldWorkerEndingAppeals; function f(db) { db.update(t).set({}); }',
      "import { fieldWorkerEndingAppeals as mr } from './schema'; function f(db) { db.insert(mr).values({}); }",
      'const { fieldWorkerEndingAppeals: mr } = schema; function f(db) { db.update(mr).set({}); }',
      'function f(db) { db.update(b).set({}); } const b = a; const a = fieldWorkerEndingAppeals;', // declared in the "wrong" order
      'const t = (fieldWorkerEndingAppeals as any); function f(db) { db.update(t).set({}); }',
      "const t = schema.fieldWorkerEndingAppeals; function f(db) { db.update(t).set({}); }",
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('flags the table read by element access, and a template whose SUBSTITUTION is the table (bare, namespaced or bound)', () => {
    for (const src of [
      "function f(db) { db.update(schema['fieldWorkerEndingAppeals']).set({}); }",
      'function f(db) { db.update(schema["fieldWorkerEndingAppeals"]).set({}); }',
      'function f(db) { return db.execute(sql`UPDATE ${fieldWorkerEndingAppeals} SET state = 1`); }',
      'function f(db) { return db.execute(sql`INSERT INTO ${schema.fieldWorkerEndingAppeals} (a) VALUES (1)`); }',
      'const t = fieldWorkerEndingAppeals; function f(db) { return db.execute(sql`UPDATE ${t} SET state = ${1}`); }',
    ]) {
      expect(scan(src).length, src).toBeGreaterThan(0);
    }
  });

  it('flags the other raw verbs and spellings: UPDATE ONLY, MERGE INTO, COPY, a comment before the table, spaces around the schema dot', () => {
    for (const sql of [
      'UPDATE ONLY field_worker_ending_appeals SET a = 1',
      'MERGE INTO field_worker_ending_appeals t USING x ON true WHEN MATCHED THEN UPDATE SET a = 1',
      'COPY field_worker_ending_appeals FROM STDIN',
      'UPDATE /* a comment */ field_worker_ending_appeals SET a = 1',
      'UPDATE public . field_worker_ending_appeals SET a = 1',
      'INSERT INTO "public"."field_worker_ending_appeals" (a) VALUES (1)',
    ]) {
      const src = `async function f(c) { await c.query(\`${sql}\`); }`;
      expect(scan(src).map((x) => x.detail), sql).toEqual(['raw SQL write to field_worker_ending_appeals']);
    }
  });

  it('reads a `.js`, `.mjs` and `.jsx` file too', () => {
    for (const file of ['x.js', 'x.mjs', 'x.jsx']) {
      expect(scanEndingAppealWrites(file, "async function f(c) { await c.query('UPDATE field_worker_ending_appeals SET a = 1'); }").length, file).toBe(1);
    }
  });

  it('does NOT flag the innocent neighbours: a read through an alias, an alias of another table, another table in a substitution, a longer table name', () => {
    for (const src of [
      'const t = fieldWorkerEndingAppeals; function f(db) { db.select().from(t); }',
      'const t = fieldWorkerNotices; function f(db) { db.update(t).set({}); }',
      'function f(db) { return db.execute(sql`UPDATE ${fieldWorkerNotices} SET seen_at = now()`); }',
      "function f(c) { c.query('UPDATE ONLY field_worker_ending_appeals_archive SET a = 1'); }",
      "function f(c) { c.query('SELECT * FROM field_worker_ending_appeals FOR UPDATE'); }",
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

// Code review RP-8 (of the round-1 patches) — the forms that still passed: the write METHOD reached some other way than `x.update(...)`, and a
// table held by an assignment, an object property or an array. Each is found; the innocent neighbours stay unflagged.
describe('scanEndingAppealWrites — the callee and alias spellings the patch review found', () => {
  it('flags a write whose METHOD is spelled by element access, with a non-null assertion, in parentheses, or destructured (a bare call)', () => {
    for (const src of [
      "function f(db) { db['update'](fieldWorkerEndingAppeals).set({}); }",
      'function f(db) { db["insert"](fieldWorkerEndingAppeals).values({}); }',
      'function f(db) { db.update!(fieldWorkerEndingAppeals).set({}); }',
      'function f(db) { (db.update)(fieldWorkerEndingAppeals).set({}); }',
      'function f(db) { const { update } = db; update(fieldWorkerEndingAppeals).set({}); }',
      'function f(db) { db?.update(fieldWorkerEndingAppeals).set({}); }',
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('flags a table held by an ASSIGNMENT, an object PROPERTY (read as `.t`, `[\'t\']` or destructured) or an ARRAY (read as `a[0]`)', () => {
    for (const src of [
      'let t; t = fieldWorkerEndingAppeals; function f(db) { db.update(t).set({}); }',
      'const m = { t: fieldWorkerEndingAppeals }; function f(db) { db.update(m.t).set({}); }',
      "const m = { t: fieldWorkerEndingAppeals }; function f(db) { db.update(m['t']).set({}); }",
      'const m = { fieldWorkerEndingAppeals }; function f(db) { db.insert(m.fieldWorkerEndingAppeals).values({}); }',
      'const m = { t: fieldWorkerEndingAppeals }; const { t } = m; function f(db) { db.update(t).set({}); }',
      'const m: any = {}; m.t = fieldWorkerEndingAppeals; function f(db) { db.update(m.t).set({}); }',
      'const a = [fieldWorkerEndingAppeals]; function f(db) { db.update(a[0]).set({}); }',
      'const a = [fieldWorkerEndingAppeals] as const; function f(db) { db.update(a[0]).set({}); }',
      'const a = [fieldWorkerEndingAppeals]; const t = a[0]; function f(db) { db.update(t).set({}); }',
    ]) {
      expect(scan(src).map((x) => x.detail), src).toHaveLength(1);
    }
  });

  it('does NOT flag the innocent neighbours: another table in a property or an array, a read of a held table, an unrelated `update` / `insert`', () => {
    for (const src of [
      'const m = { t: fieldWorkerNotices }; function f(db) { db.update(m.t).set({}); }',
      'const a = [fieldWorkerNotices]; function f(db) { db.update(a[0]).set({}); }',
      'const m = { t: fieldWorkerEndingAppeals }; function f(db) { db.select().from(m.t); }',
      'const a = [fieldWorkerEndingAppeals]; function f(db) { return db.select().from(a[0]); }',
      "function f(db) { db['select']().from(fieldWorkerEndingAppeals); }",
      'function f(update, x) { update(x); }',
      'function f(update) { update(fieldWorkerNotices); }',
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

// Code review R4-6 (round 4) — spellings beside the ones the header named: any schema, a schema by substitution, a `--` comment, the SQL
// name in a constant, a second drizzle table over the name, array destructuring and a `+` chain. Each found once; the neighbours are not.
describe('scanEndingAppealWrites — the spellings round 4 found', () => {
  it('flags a raw write through ANY schema, a schema put in by a substitution, and a `--` line comment', () => {
    for (const src of [
      "function f(c) { c.query('UPDATE app.field_worker_ending_appeals SET a = 1'); }",
      'function f(c) { c.query(\'UPDATE "tenant" . "field_worker_ending_appeals" SET a = 1\'); }',
      'function f(c, schema) { c.query(`UPDATE ${schema}.field_worker_ending_appeals SET a = 1`); }',
      "function f(c) { c.query('UPDATE -- the row\\n field_worker_ending_appeals SET a = 1'); }",
      "function f(c) { c.query('INSERT INTO -- one\\n /* two */ public.field_worker_ending_appeals (a) VALUES (1)'); }",
    ]) {
      expect(scan(src).map((x) => x.detail), src).toEqual(['raw SQL write to field_worker_ending_appeals']);
    }
  });

  it('flags the SQL name held in a constant and substituted, a second pgTable over the name, array destructuring, and a `+` chain - once each', () => {
    for (const src of [
      "const T = 'field_worker_ending_appeals'; function f(c) { c.query(`UPDATE ${T} SET a = 1`); }",
      'const T = \'"public"."field_worker_ending_appeals"\'; function f(c) { c.query(`INSERT INTO ${T} (a) VALUES (1)`); }',
      "const x = pgTable('field_worker_ending_appeals', {}); function f(db) { db.update(x).set({}); }",
      'const [t] = [fieldWorkerEndingAppeals]; function f(db) { db.update(t).set({}); }',
      'const a = [fieldWorkerEndingAppeals]; const [t] = a; function f(db) { db.insert(t).values({}); }',
      "function f(c) { c.query('UPDATE ' + 'field_worker_ending_appeals SET a = 1'); }",
      "const T = 'field_worker_ending_appeals'; function f(c) { c.query('UPDATE ' + T + ' SET a = 1'); }",
      "function f(c) { c.query(('UPDATE ONLY ') + 'field_worker_ending_appeals' + ' SET a = 1'); }",
    ]) {
      expect(scan(src), src).toHaveLength(1);
    }
  });

  it('does NOT flag the neighbours: another table in a constant, a chain with no write, a destructured OTHER element, a longer name, a read', () => {
    for (const src of [
      "const T = 'field_worker_notices'; function f(c) { c.query(`UPDATE ${T} SET a = 1`); }",
      "const T = 'field_worker_ending_appeals'; function f(c) { c.query(`SELECT * FROM ${T}`); }",
      "function f(c) { c.query('SELECT * ' + 'FROM field_worker_ending_appeals'); }",
      'const [a, b] = [fieldWorkerNotices, fieldWorkerEndingAppeals]; function f(db) { db.update(a).set({}); }',
      "function f(c) { c.query('UPDATE app.field_worker_ending_appeals_archive SET a = 1'); }",
      "const x = pgTable('field_worker_notices', {}); function f(db) { db.update(x).set({}); }",
      "function f(c) { c.query('SELECT 1 FROM t WHERE x = 1 -- update\\n'); }",
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

// Code review R5-1 / R5-2 (the review of round 4's patches): the regex is LINEAR on runs of comments, needs no space before a quote or a
// comment, reads up to two qualifiers (quoted with any characters); a held SQL name is transitive, a property, or a call's argument.
describe('scanEndingAppealWrites — round 5', () => {
  it('R5-1: a run of block comments and no table is answered at once (the old lazy body backtracked exponentially)', () => {
    for (const run of ['/**/'.repeat(40), '/* a */ '.repeat(40), '/* a */ only '.repeat(20)]) {
      const t = Date.now();
      expect(scan(`function f(c) { c.query('update ${run}x'); }`)).toEqual([]);
      expect(Date.now() - t, run.slice(0, 12)).toBeLessThan(200);
    }
  });

  it('R5-1: flags no space before a comment or a quote, ONLY then a comment, two qualifiers, a quoted schema with any characters', () => {
    for (const sql of [
      'UPDATE/**/field_worker_ending_appeals SET a = 1',
      'INSERT INTO"field_worker_ending_appeals" (a) VALUES (1)',
      'UPDATE ONLY/* x */field_worker_ending_appeals SET a = 1',
      'UPDATE twt.app.field_worker_ending_appeals SET a = 1',
      'UPDATE "my-schema".field_worker_ending_appeals SET a = 1',
      'UPDATE /* a */ /* b */ -- c\\n ONLY -- d\\n public.field_worker_ending_appeals SET a = 1',
    ]) {
      expect(scan(`function f(c) { c.query('${sql}'); }`).map((x) => x.detail), sql).toEqual(['raw SQL write to field_worker_ending_appeals']);
    }
  });

  it('R5-2: flags a transitive constant, an assigned one, a property, and a call given the SQL name (sql.identifier / sql.raw) - and a spread array', () => {
    for (const src of [
      "const T = 'field_worker_ending_appeals'; const U = T; function f(c) { c.query(`UPDATE ${U} SET a = 1`); }",
      "let T; T = 'field_worker_ending_appeals'; function f(c) { c.query(`UPDATE ${T} SET a = 1`); }",
      "const N = { t: 'field_worker_ending_appeals' }; function f(c) { c.query(`UPDATE ${N.t} SET a = 1`); }",
      "function f(db) { return db.execute(sql`UPDATE ${sql.identifier('field_worker_ending_appeals')} SET a = 1`); }",
      "function f(db) { return db.execute(sql`INSERT INTO ${sql.raw('public.field_worker_ending_appeals')} (a) VALUES (1)`); }",
      'const [, t] = [...pre, fieldWorkerEndingAppeals]; function f(db) { db.update(t).set({}); }',
    ]) {
      expect(scan(src), src).toHaveLength(1);
    }
  });

  it('R5-1 / R5-2: does NOT flag a column of the table after a `-- copy` comment, another table through a call, or a constant of another table', () => {
    for (const src of [
      "function f(c) { c.query('SELECT a, -- copy\\n field_worker_ending_appeals.id FROM field_worker_ending_appeals'); }",
      "function f(db) { return db.execute(sql`UPDATE ${sql.identifier('field_worker_notices')} SET a = 1`); }",
      "const T = 'field_worker_notices'; const U = T; function f(c) { c.query(`UPDATE ${U} SET a = 1`); }",
      "const N = { t: 'field_worker_ending_appeals' }; function f(c) { c.query(`SELECT * FROM ${N.t}`); }",
    ]) {
      expect(scan(src), src).toEqual([]);
    }
  });
});

describe('the allow-list diagnostics and the non-vacuity floor', () => {
  const finding = (over: Partial<EndingAppealWriteFinding>): EndingAppealWriteFinding => ({ file: 'p.ts', line: 1, detail: 'raw SQL write to field_worker_ending_appeals', enclosingFunction: 'w', ...over });
  const allow = [{ file: 'p.ts', functions: new Set(['w']) }];

  it('a write moved into a callback reads `<anonymous>` and the message says why it fails', () => {
    const [f] = scan("function w(c) { return run(async () => c.query('UPDATE field_worker_ending_appeals SET a = 1')); }");
    expect(f!.enclosingFunction).toBe('<anonymous>');
    expect(formatFinding(f!)).toContain('the allow-list matches the innermost NAMED function');
    expect(formatFinding(finding({}))).not.toContain('innermost NAMED');
  });

  it('the floor lists an allow-listed writer that was not SEEN writing — both the raw write and the setting are needed', () => {
    const raw = finding({});
    const setting = finding({ detail: 'the app.field_worker_ending_appeal_writer setting' });
    expect(unseenAllowlistedWriters([raw, setting], allow)).toEqual([]);
    expect(unseenAllowlistedWriters([raw], allow)).toEqual(['p.ts w']); // no setting
    expect(unseenAllowlistedWriters([setting], allow)).toEqual(['p.ts w']); // no raw write
    expect(unseenAllowlistedWriters([], allow)).toEqual(['p.ts w']); // a blind scan
    expect(unseenAllowlistedWriters([finding({ enclosingFunction: 'renamed' }), finding({ enclosingFunction: 'renamed', detail: 'the app.field_worker_ending_appeal_writer setting' })], allow)).toEqual(['p.ts w']); // the projector was renamed
  });
});
