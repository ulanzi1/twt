// Story 13.1g (Task 5.2; AC8; Invariant I3; decision `2026-11-12-463` AD11) — the move-notice EMAIL ⛔ never writes a notice (⛔ `seen_at`),
// a move request, a field worker, the event log or an IDENTITY table, and ⛔ calls a move-request or field-worker command. 6.25's form
// (`claim-suspicion-staff-email-no-decision.test.ts`): a runtime spy CANNOT see this (an ESM namespace export is ⛔ interceptable), so the
// fence reads the SOURCE of every module of this story — the jobs sweep + child, the template, the domain module and Q4 — and refuses any
// writer's NAME and a WRITE to a forbidden table in every form this codebase writes: raw `INSERT INTO` / `UPDATE [ONLY]` / `DELETE FROM
// [ONLY]` / `MERGE INTO` / `TRUNCATE`, schema-qualified or quoted, a Drizzle `.insert(` / `.update(` / `.delete(` through ANY namespace, and
// ANY write whose table is INTERPOLATED. Its OWN send table (`field_worker_notice_emails`) is the one table it writes. ⚠ LIMIT: it reads
// these modules only — ⛔ the helpers they call. Comments stripped. ⭐ POSITIVE CONTROL: the claim IS referenced; one plant per form into a
// copy of each REAL module IS caught by its own pattern; a commented plant is ⛔; and the table list is checked against the schema's exports.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const NOTICE_EMAIL_MODULES = [
  'apps/jobs/src/scheduler/field-worker-notice-emails.ts',
  'apps/jobs/src/scheduler/field-worker-notice-email-templates.ts',
  'packages/domain/src/field-worker/notice-email.ts',
  'packages/domain/src/field-worker/notice-email-eligibility-read.ts',
] as const;

/**
 * Every writer of a move request, a notice, a field worker or the event log: the commands (13.1d's, and 13.1 / 13.1a / 13.1c's lifecycle),
 * the projectors they call, 13.1d's supersede helpers, and the event append. ⚠ A NAME here must be a REAL export (the guard below reads the
 * source for it) — an invented one (`projectMoveRequest` was) can never match, and a gate that cannot match proves nothing.
 */
const FORBIDDEN = [
  'openFieldWorkerMoveRequest',
  'acceptFieldWorkerMoveRequest',
  'refuseFieldWorkerMoveRequest',
  'withdrawFieldWorkerMoveRequest',
  'closeFieldWorkerMoveRequest',
  'escalateStaleMoveRequest',
  'writeFieldWorkerNotices',
  'markFieldWorkerNoticesSeen',
  'registerFieldWorker',
  'recordFieldWorkerKycCompleted',
  'activateFieldWorker',
  'postFieldWorker',
  'suspendFieldWorker',
  'reactivateFieldWorker',
  'terminateFieldWorker',
  'projectMoveRequestOpened',
  'projectMoveRequestTransition',
  'projectFieldWorkerGenesis',
  'projectFieldWorkerTransition',
  'afterDirectMove',
  'afterEnding',
  'appendEvent',
] as const;
/** Where those writers are defined — the guard that every name above is a real export reads these directories. */
const WRITER_SOURCE_DIRS = ['packages/domain/src/field-worker', 'packages/events/src'] as const;

/** The tables the email must ⛔ write (I3): the notices (it never marks one seen), the requests, the workers, the event log, the identity family. */
const FORBIDDEN_TABLE_NAMES = [
  'field_worker_notices',
  'field_worker_move_requests',
  'field_workers',
  'events_log',
  'role_grants',
  'users',
  'admin_credentials',
] as const;
const camel = (t: string) => t.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const TABLES = FORBIDDEN_TABLE_NAMES.join('|');
const TABLES_TS = FORBIDDEN_TABLE_NAMES.map(camel).join('|');
/** `[schema.]table`, either part optionally quoted. ⚠ `\b` after the name: `field_worker_notice_emails` is ⛔ `field_worker_notices`. */
const QUALIFIED = `(?:"?\\w+"?\\.)?"?(?:${TABLES})"?\\b`;
const FORBIDDEN_WRITES = {
  insert: new RegExp(`\\bINSERT\\s+INTO\\s+${QUALIFIED}`, 'i'),
  update: new RegExp(`\\bUPDATE\\s+(?:ONLY\\s+)?${QUALIFIED}`, 'i'),
  delete: new RegExp(`\\bDELETE\\s+FROM\\s+(?:ONLY\\s+)?${QUALIFIED}`, 'i'),
  merge: new RegExp(`\\bMERGE\\s+INTO\\s+${QUALIFIED}`, 'i'),
  truncate: new RegExp(`\\bTRUNCATE\\s+(?:TABLE\\s+)?(?:ONLY\\s+)?${QUALIFIED}`, 'i'),
  drizzle: new RegExp(`\\.(?:insert|update|delete)\\(\\s*(?:[\\w$]+\\.)?(?:${TABLES_TS})\\b`),
  interpolated: /\b(?:INSERT\s+INTO|UPDATE(?:\s+ONLY)?|DELETE\s+FROM(?:\s+ONLY)?|MERGE\s+INTO|TRUNCATE(?:\s+TABLE)?)\s+\$\{/i,
} as const;
type WriteForm = keyof typeof FORBIDDEN_WRITES;

/** Every forbidden NAME or WRITE form in `src` (comments stripped) — ONE function for the fence and its positive control. */
function violationsOf(src: string): string[] {
  const code = stripComments(src);
  const forms = (Object.keys(FORBIDDEN_WRITES) as WriteForm[]).filter((k) => FORBIDDEN_WRITES[k].test(code));
  // A whole identifier (⛔ a substring): `registerFieldWorkerNoticeEmailWorkers` is ⛔ `registerFieldWorker`.
  return [...FORBIDDEN.filter((name) => new RegExp(`\\b${name}\\b`).test(code)), ...forms];
}

describe('⛔ I3 — the move-notice email writes ⛔ notice, request, worker, event or identity row, and calls ⛔ command', () => {
  for (const rel of NOTICE_EMAIL_MODULES) {
    it(`${rel} names ⛔ writer and WRITES ⛔ forbidden table (comments stripped)`, () => {
      expect(violationsOf(read(rel)), `${rel} must not write`).toEqual([]);
    });
  }

  it('⭐ POSITIVE CONTROL — ⛔ vacuous: the child calls its claim, the domain WRITES its own send table, and a plant in each REAL module IS caught', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/field-worker-notice-emails.ts'))).toContain('beginFieldWorkerNoticeEmail(');
    const domain = stripComments(read('packages/domain/src/field-worker/notice-email.ts'));
    expect(domain).toContain('export async function beginFieldWorkerNoticeEmail(');
    expect(domain).toMatch(/INSERT INTO field_worker_notice_emails/); // its OWN table is written — and is ⛔ a match below
    expect(domain).toMatch(/UPDATE field_worker_notice_emails/);
    const plants: readonly (readonly [string, string])[] = [
      ['markFieldWorkerNoticesSeen', 'await fieldWorker.markFieldWorkerNoticesSeen(db, P, u, [id]);'],
      ['writeFieldWorkerNotices', 'await writeFieldWorkerNotices(client, facts, groups, null);'],
      ['escalateStaleMoveRequest', 'await fieldWorker.escalateStaleMoveRequest(client, input);'],
      ['appendEvent', 'await appendEvent(client, e);'],
      ['registerFieldWorker', 'await fieldWorker.registerFieldWorker(client, input);'],
      ['update', 'await client.query(`UPDATE field_worker_notices SET seen_at = now() WHERE notice_id = $1`, [id]);'],
      ['update', "await client.query(`UPDATE ONLY \"public\".\"field_worker_move_requests\" SET state = 'closed'`);"],
      ['insert', 'await client.query(`INSERT INTO public.events_log (stream_id) VALUES ($1)`, [id]);'],
      ['delete', 'await client.query(`DELETE FROM role_grants WHERE user_id = $1`, [id]);'],
      ['merge', 'await client.query(`MERGE INTO field_workers w USING x ON true WHEN MATCHED THEN DO NOTHING`);'],
      ['truncate', 'await client.query(`TRUNCATE TABLE field_worker_notices`);'],
      ['insert', 'await client.query(`INSERT INTO admin_credentials (user_id) VALUES ($1)`, [id]);'],
      ['update', "await client.query(`UPDATE users SET status = 'active' WHERE id = $1`, [id]);"],
      ['drizzle', 'await db.update(schema.fieldWorkerNotices).set({ seenAt: new Date() });'],
      ['drizzle', 'await tx.insert(fieldWorkerMoveRequests).values(row);'],
      ['drizzle', 'await db.delete(schema.eventsLog);'],
      ['interpolated', 'await db.execute(sql`UPDATE ${schema.fieldWorkerNotices} SET seen_at = now()`);'],
    ];
    // R3-2: ONE plant per forbidden NAME (derived from the list, so a name added to it is planted too).
    const namePlants: readonly (readonly [string, string])[] = FORBIDDEN.map((name) => [name, `await fieldWorker.${name}(client, input);`] as const);
    for (const rel of NOTICE_EMAIL_MODULES) {
      for (const [form, plant] of [...plants, ...namePlants]) {
        expect(violationsOf(`${read(rel)}\n${plant}\n`), `${rel} + ${plant}`).toContain(form);
      }
      expect(violationsOf(`${read(rel)}\n// ${plants[4]![1]}\n`)).toEqual([]);
    }
  });

  it('⭐ the writer list is REAL — every forbidden NAME is a function or constant the domain / events source exports (an invented or renamed entry is red)', () => {
    const files = (dir: string): string[] =>
      readdirSync(path.join(repoRoot, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);
        return e.isDirectory() ? files(rel) : e.name.endsWith('.ts') ? [rel] : [];
      });
    const exported = new Set<string>();
    for (const rel of WRITER_SOURCE_DIRS.flatMap(files)) {
      for (const m of read(rel).matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+(\w+)/gm)) exported.add(m[1]!);
    }
    for (const name of FORBIDDEN) expect(exported, name).toContain(name);
  });

  it('⭐ the table list is REAL — every name is a table the schema exports', () => {
    for (const t of FORBIDDEN_TABLE_NAMES) expect(Object.keys(schema), t).toContain(camel(t));
  });
});
