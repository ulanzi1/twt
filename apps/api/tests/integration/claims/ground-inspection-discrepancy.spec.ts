// Story 6.27d (Task 4.5; AC2 – AC7) — the inspector's discrepancy through HTTP, on a live DB (:5433). One HTTP request per
// step (each its own scope transaction). The neighbours' answers are saved through the REAL member route (real encryption,
// the date's three indexes under the REAL index helper), the completion through the REAL route.
//   · AC3 / AC4 — the three response shapes (`null` / `withheld` / `shown`), the response's key set, the shape ⛔ varying with
//     the number of neighbours; the override completer receives it; a HIDDEN override completer gets `withheld` and ⛔ no
//     showing is written; a fault in the hidden check ⇒ `withheld/check_failed`; a swallowed completion COMMIT ⇒ `withheld`
//     (`own_visit` for the assigned inspector, `check_failed` for an override completer), ⛔ never `shown`, ⛔ no row;
//   · R4 — a non-assigned Block Admin ⇒ 403 on all three routes;
//   · AC5 — the re-read after a lost response; a showing write LOST without an error and a delivery whose own COMMIT
//     FAILS (code review round 2, R2-10) — neither ⛔ fails the response nor changes the re-read's keys after a later
//     answer; a withheld completion then an un-hidden re-read records the same keys; an EMPTY
//     showing; the re-read's 404 for every non-completed status, a `certificate_check`, and a pre-0147 NULL-source row; a
//     hidden caller's re-read ⇒ withheld with `notes: []`; a fault in the re-read's hidden check ⇒ withheld;
//   · AC6 — the note rules (once, key-not-shown, the window, a missing showing recomputed), the HIDDEN probe (identical
//     status, code, message, ⛔ details), the display name (409 `admin.display_name_missing`; a non-holder still 403), an
//     override holder's note read back by the assigned inspector WITH its author, the audit line (codes only);
//   · R5 / AC7 — the console's neighbours' section carries the block for the District Admin and is ABSENT for a hidden
//     reader; a later answer is on the console, ⛔ on the re-read;
//   · ⭐ code review round 2 — R2-7: an ERASED or undecryptable family date and note are `unavailable` on the re-read and in
//     the staff block (⛔ the sentinel text, ⛔ a 500), and the block parses under the STRICT console contract; R2-15: a
//     blank note is refused (400) and fills ⛔ the once-only slot.

import { randomUUID } from 'node:crypto';

import { InspectionDiscrepancyStaffView } from '@twt/contracts';
import { claim, ids, member } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ⭐ Fault injection on the request's own handles (the 6.27b X6 pattern): the hide check fails with a REAL SQL error; a
// completion / showing write is LOST without an error by rolling the work back and opening an empty transaction for the
// COMMIT; ⭐ R2-10 — `deliveryCommit`: the delivery's OWN COMMIT throws (after its showing write answered `persisted`).
const fault = vi.hoisted(() => ({ hideCheck: false, swallowCompletion: false, showingCommit: false, deliveryCommit: false }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  const { sql } = await import('drizzle-orm');
  type Exec = { execute: (q: unknown) => Promise<unknown> };
  const isActorOwnVisitPending: typeof actual.claim.isActorOwnVisitPending = async (db, ...rest) => {
    if (fault.hideCheck) await (db as unknown as Exec).execute(sql`SELECT 1/0`);
    return actual.claim.isActorOwnVisitPending(db, ...rest);
  };
  const completeGroundInspection: typeof actual.claim.completeGroundInspection = async (client, input) => {
    const out = await actual.claim.completeGroundInspection(client, input);
    if (fault.swallowCompletion) {
      await client.query('ROLLBACK');
      await client.query('BEGIN');
    }
    return out;
  };
  const recordInspectionDiscrepancyShowing: typeof actual.claim.recordInspectionDiscrepancyShowing = async (db, input) => {
    const out = await actual.claim.recordInspectionDiscrepancyShowing(db, input);
    if (fault.showingCommit) {
      await (db as unknown as Exec).execute(sql`ROLLBACK`);
      await (db as unknown as Exec).execute(sql`BEGIN`);
    }
    return out;
  };
  return { ...actual, claim: { ...actual.claim, isActorOwnVisitPending, completeGroundInspection, recordInspectionDiscrepancyShowing } };
});
// ⭐ R2-10 — a scope transaction that WROTE a showing gets a client whose COMMIT rolls the work back and THROWS: the handler's
// own `client.query('COMMIT')` after `persisted = true` — the one failure it answers `shown` for. Every other transaction
// (the completion's own, the request's) passes through untouched.
vi.mock('../../../src/modules/multi-tenant/scope-tx.js', async (importActual) => {
  const actual = await importActual<typeof import('../../../src/modules/multi-tenant/scope-tx.js')>();
  const { bindScopedDb } = await vi.importActual<typeof import('@twt/domain')>('@twt/domain');
  const openScopeTx: typeof actual.openScopeTx = async (deps, pariwarId) => {
    const scopeTx = await actual.openScopeTx(deps, pariwarId);
    if (!fault.deliveryCommit) return scopeTx;
    let wroteShowing = false;
    const client = new Proxy(scopeTx.client, {
      get(target, prop, receiver) {
        if (prop !== 'query') return Reflect.get(target, prop, receiver);
        return (q: unknown, ...rest: unknown[]) => {
          const text = typeof q === 'string' ? q : ((q as { text?: string } | null)?.text ?? '');
          if (/insert into claim_ground_inspection_discrepancy_showings/i.test(text)) wroteShowing = true;
          if (wroteShowing && /^\s*commit\s*$/i.test(text)) {
            return target.query('ROLLBACK').then(() => {
              throw new Error('simulated: the delivery COMMIT failed');
            });
          }
          return (target.query as (...a: unknown[]) => unknown).call(target, q, ...rest);
        };
      },
    });
    return { ...scopeTx, client, tx: bindScopedDb(client) };
  };
  return { ...actual, openScopeTx };
});

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { assemblePeerMesh } from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { encryptGroundInspectionField } from '../../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import * as fx from '../_peer-reply-fixture.js';
import { insertDeathCertificate } from '../_nominee-name-check-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingAuditSink, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Res = Awaited<ReturnType<Client['inject']>>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const BLOCK = 'Block-1';
const FAMILY_DATE = '2026-06-15';
const errOf = (res: Res) => res.json<{ error: { code: string; message: string; details?: unknown; request_id?: string } }>().error;

describe.skipIf(!hasDatabase)('Story 6.27d — the inspector\'s discrepancy through HTTP (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let env: fx.PeerFixtureEnv;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    env = { pool: td.pool, deps, app };
  });

  afterAll(async () => {
    Object.assign(fault, { hideCheck: false, swallowCompletion: false, showingCommit: false, deliveryCommit: false });
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(display: string | null = 'Inspector One'): Promise<{ client: Client; userId: string }> {
    const email = `gid-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (display !== null) await td.pool.query('UPDATE users SET display_name = $2 WHERE id = $1', [userId, display]);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      userId,
      pariwarId,
      role,
      dim,
      value,
    ]);
  }

  /** Run `fn` on a COMMITTED scope transaction. */
  async function inScope<T>(pariwarId: string, fn: (tx: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(scopeTx);
      await closeScopeTx(scopeTx, true);
      return out;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  interface World {
    readonly p: string;
    readonly cid: string;
    readonly uploadId: string;
    readonly neighbours: readonly string[];
    readonly pingIds: readonly string[];
    readonly inspector: { client: Client; userId: string };
  }

  /** A Pariwar, a District Admin who is ALSO the inspector, a claim in the window with `n` texted neighbours and a current
   *  certificate. */
  async function world(n = 1): Promise<World> {
    const p = randomUUID();
    const inspector = await authenticate();
    await grant(inspector.userId, p, 'district_admin', 'district', DISTRICT);
    const neighbours: string[] = [];
    for (let i = 0; i < n; i += 1) neighbours.push(await fx.seedNeighbour(env, p, `Neighbour ${i}`, `+9198765432${String(10 + i)}`));
    const { cid, pingIds } =
      n > 0 ? await fx.seedClaimWithPings(env, p, neighbours, neighbours.map(() => true)) : await fx.seedClaimWithPings(env, p, [], []);
    const uploadId = await inScope(p, async (tx) => (await insertDeathCertificate(tx, p, String(cid))).uploadId);
    return { p, cid: String(cid), uploadId, neighbours, pingIds, inspector };
  }

  const say = (w: World, key: string, value: Json, i = 0) => fx.put(env, w.p, w.neighbours[i]!, w.pingIds[i]!, key, value);

  /** A scheduled assignment for `inspector` with its original's photo (the domain writers, committed). */
  async function assign(w: World, opts: { inspector?: string; stage?: 'initial' | 'certificate_check'; block?: string | null } = {}): Promise<string> {
    return inScope(w.p, async (tx) => {
      const { groundInspection } = await claim.scheduleGroundInspection(tx.client, {
        claimCaseId: ids.claimId(w.cid),
        pariwarId: ids.pariwarId(w.p),
        district: DISTRICT,
        block: opts.block ?? null,
        inspectionStage: opts.stage ?? 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: opts.inspector ?? w.inspector.userId,
        scheduledAt: new Date('2026-07-10T12:00:00.000Z'),
        scheduledByActor: w.inspector.userId,
        idempotencyKey: randomUUID(),
      });
      const gid = groundInspection.groundInspectionId;
      await claim.addGroundInspectionPhoto(tx.client, {
        pariwarId: ids.pariwarId(w.p),
        groundInspectionId: gid,
        actingActorId: opts.inspector ?? w.inspector.userId,
        storageObjectKey: `fixture/${gid}.jpg`,
        contentType: 'image/jpeg',
        byteSize: 4,
        photoKind: 'original_certificate',
        comparedCertificateUploadId: w.uploadId,
      });
      return String(gid);
    });
  }

  const url = (w: World, gid: string, tail = '') => `/api/v1/p/${w.p}/admin/claims/${w.cid}/ground-inspection/${gid}${tail}`;
  const complete = (who: Client, w: World, gid: string, date = FAMILY_DATE) =>
    who.inject({
      method: 'POST',
      url: url(w, gid, '/complete'),
      payload: { originalCertificateVerdict: 'matches', comparedCertificateToken: w.uploadId, deathDate: date },
    });
  const reread = (who: Client, w: World, gid: string) => who.inject({ method: 'GET', url: url(w, gid, '/discrepancy') });
  const note = (who: Client, w: World, gid: string, questionKey: string, text = 'They said he died at home on the 15th.') =>
    who.inject({ method: 'POST', url: url(w, gid, '/discrepancy-notes'), payload: { questionKey, note: text } });
  const showingRow = async (gid: string) =>
    (await td.pool.query<{ question_keys: string[] }>(`SELECT question_keys FROM claim_ground_inspection_discrepancy_showings WHERE ground_inspection_id = $1`, [gid]))
      .rows[0] ?? null;

  /** A supervisor: the conduct key at the district AND the override key (a Pariwar Admin). */
  async function supervisor(w: World, display = 'Supervisor Two') {
    const s = await authenticate(display);
    await grant(s.userId, w.p, 'district_admin', 'district', DISTRICT);
    await grant(s.userId, w.p, 'pariwar_admin', 'pariwar', w.p);
    return s;
  }

  // ── AC3 / AC4 — the shapes ─────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ ⛔ no difference ⇒ `shown` with ⛔ keys; a difference ⇒ the keys + the family date; the key set carries ⛔ value, name or count', async () => {
    const same = await world();
    await say(same, 'has_died', { codes: ['died'] });
    await say(same, 'death_date', { date: FAMILY_DATE });
    const g1 = await assign(same);
    const r1 = await complete(same.inspector.client, same, g1);
    expect(r1.statusCode, r1.body).toBe(200);
    expect(Object.keys(r1.json<Json>()).sort()).toEqual(['discrepancy', 'groundInspectionId', 'photoCount', 'status']);
    expect(r1.json<Json>()['discrepancy']).toEqual({ state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null });
    // An EMPTY showing is a ROW (AC5) — "absent" means only "never delivered".
    expect(await showingRow(g1)).toEqual({ question_keys: [] });

    const differ = await world();
    await say(differ, 'has_died', { codes: ['not_died'] });
    const g2 = await assign(differ);
    await say(differ, 'has_died', { codes: ['died'] });
    await say(differ, 'death_date', { date: '2026-06-01' });
    const r2 = await complete(differ.inspector.client, differ, g2);
    const d2 = r2.json<{ discrepancy: Json }>().discrepancy;
    expect(d2).toEqual({ state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'shown', date: FAMILY_DATE }, familyAnswers: null });
    expect(Object.keys(d2).sort()).toEqual(['familyAnswers', 'familyDeathDate', 'questionKeys', 'state']); // Story 6.32 — + familyAnswers (null without ③ / ④)
    // ⛔ A neighbour's value (their date), name or count anywhere in the result (`photoCount` is the inspector's own).
    expect(JSON.stringify(d2)).not.toMatch(/valueCodes|Neighbour|count|2026-06-01/i);
    expect(JSON.stringify(r2.json())).not.toMatch(/valueCodes|Neighbour|2026-06-01/i);
    expect(await showingRow(g2)).toEqual({ question_keys: ['death_date'] });
  });

  it('the shape does ⛔ vary with the number of neighbours or answers', async () => {
    const bodies: unknown[] = [];
    for (const n of [1, 3]) {
      const w = await world(n);
      for (let i = 0; i < n; i += 1) await say(w, 'has_died', { codes: ['not_died'] }, i);
      const gid = await assign(w);
      bodies.push((await complete(w.inspector.client, w, gid)).json<Json>()['discrepancy']);
    }
    expect(bodies[0]).toEqual({ state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null });
    expect(bodies[1]).toEqual(bodies[0]);
  });

  it('a `certificate_check` ⇒ `discrepancy: null` and ⛔ no showing; its re-read is the neutral 404', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w, { stage: 'certificate_check' });
    const r = await complete(w.inspector.client, w, gid);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<Json>()['discrepancy']).toBeNull();
    expect(await showingRow(gid)).toBeNull();
    const rr = await reread(w.inspector.client, w, gid);
    expect([rr.statusCode, errOf(rr).code]).toEqual([404, 'ground_inspection.not_found']);
  });

  it('R4 — the override completer receives it; a HIDDEN override completer gets `withheld/own_visit` and ⛔ no showing is written', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const sup = await supervisor(w);
    const gid = await assign(w);
    const r = await complete(sup.client, w, gid);
    expect(r.json<Json>()['discrepancy']).toEqual({ state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null });

    const h = await world();
    await say(h, 'has_died', { codes: ['not_died'] });
    const hiddenSup = await supervisor(h);
    const g = await assign(h);
    await assign(h, { inspector: hiddenSup.userId }); // their OWN pending visit on this claim ⇒ hidden
    const hr = await complete(hiddenSup.client, h, g);
    expect(hr.statusCode, hr.body).toBe(200);
    expect(hr.json<Json>()['discrepancy']).toEqual({ state: 'withheld', reason: 'own_visit' });
    expect(await showingRow(g)).toBeNull();
    // AC5 — the first UN-hidden re-read records it, with the keys the completion computed.
    const rr = await reread(h.inspector.client, h, g);
    expect(rr.json<Json>()).toEqual({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    expect(await showingRow(g)).toEqual({ question_keys: ['has_died'] });
  });

  it('FAIL CLOSED — a fault in the hidden check ⇒ `withheld/check_failed` on the completion AND the re-read; ⛔ no showing', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    fault.hideCheck = true;
    try {
      const r = await complete(w.inspector.client, w, gid);
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json<Json>()['discrepancy']).toEqual({ state: 'withheld', reason: 'check_failed' });
      expect(await showingRow(gid)).toBeNull();
      const rr = await reread(w.inspector.client, w, gid);
      expect(rr.json<Json>()).toEqual({ discrepancy: { state: 'withheld', reason: 'check_failed' }, notes: [] });
    } finally {
      fault.hideCheck = false;
    }
    expect(await showingRow(gid)).toBeNull();
  });

  it('a SWALLOWED completion COMMIT ⇒ `withheld` — `own_visit` for the assigned inspector, `check_failed` for an override completer — ⛔ never `shown`, ⛔ a row', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const sup = await supervisor(w);
    const mine = await assign(w);
    const theirs = await assign(w, { inspector: randomUUID() });
    fault.swallowCompletion = true;
    try {
      const a = await complete(w.inspector.client, w, mine);
      expect(a.statusCode, a.body).toBe(200);
      expect(a.json<Json>()['discrepancy']).toEqual({ state: 'withheld', reason: 'own_visit' });
      const b = await complete(sup.client, w, theirs);
      expect(b.json<Json>()['discrepancy']).toEqual({ state: 'withheld', reason: 'check_failed' });
    } finally {
      fault.swallowCompletion = false;
    }
    for (const gid of [mine, theirs]) {
      expect(await showingRow(gid)).toBeNull();
      const { rows } = await td.pool.query(`SELECT status FROM claim_ground_inspections WHERE ground_inspection_id = $1`, [gid]);
      expect(rows[0]).toEqual({ status: 'scheduled' });
    }
  });

  it('R4 — a NON-assigned Block Admin (the conduct key, ⛔ the override key) ⇒ 403 on the completion, the re-read and the note', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const blockInspector = await authenticate();
    const other = await authenticate();
    for (const u of [blockInspector, other]) await grant(u.userId, w.p, 'block_admin', 'block', BLOCK);
    const pending = await assign(w, { inspector: blockInspector.userId, block: BLOCK });
    expect((await complete(other.client, w, pending)).statusCode).toBe(403);
    const done = await assign(w, { inspector: blockInspector.userId, block: BLOCK });
    expect((await complete(blockInspector.client, w, done)).statusCode).toBe(200);
    expect((await reread(other.client, w, done)).statusCode).toBe(403);
    expect((await note(other.client, w, done, 'has_died')).statusCode).toBe(403);
    expect((await reread(blockInspector.client, w, done)).statusCode).toBe(200);
  });

  it('CR5 — the new read and note routes deny cross-Pariwar ids with own-tenant positive controls', async () => {
    const own = await world();
    const other = await world();
    await say(own, 'has_died', { codes: ['not_died'] });
    const gid = await assign(own);
    expect((await complete(own.inspector.client, own, gid)).statusCode).toBe(200);
    expect((await reread(own.inspector.client, own, gid)).statusCode).toBe(200);
    expect((await note(own.inspector.client, own, gid, 'has_died')).statusCode).toBe(201);
    // The actor holds the same conduct permission in both tenants; denial must be resource ownership.
    await grant(own.inspector.userId, other.p, 'district_admin', 'district', DISTRICT);
    // ⭐ R2-18 — the grant in `other` is LIVE (a positive control there), so the 404s below are the assignment's — ⛔ the
    // scope hook's `pariwar.not_found` for a grant that never took effect.
    await say(other, 'has_died', { codes: ['not_died'] });
    const theirs = await assign(other, { inspector: own.inspector.userId });
    expect((await complete(own.inspector.client, other, theirs)).statusCode).toBe(200);
    for (const res of [await reread(own.inspector.client, other, gid), await note(own.inspector.client, other, gid, 'has_died')]) {
      expect([res.statusCode, errOf(res).code]).toEqual([404, 'ground_inspection.not_found']);
    }
    const notes = await td.pool.query('SELECT pariwar_id FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1', [gid]);
    expect(notes.rows).toEqual([{ pariwar_id: own.p }]);
  });

  it('CR5 — no-session system callers are denied by both new routes', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    expect((await reread(w.inspector.client, w, gid)).statusCode).toBe(200);
    const system = makeClient(app);
    expect((await reread(system, w, gid)).statusCode).toBe(401);
    expect((await note(system, w, gid, 'has_died')).statusCode).toBe(401);
    expect((await td.pool.query('SELECT note_id FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1', [gid])).rows).toEqual([]);
  });

  it('CR5 — a tampered session naming a nonexistent system/service actor is denied, never attributed as the inspector', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    expect((await reread(w.inspector.client, w, gid)).statusCode).toBe(200);
    expect((await note(w.inspector.client, w, gid, 'has_died')).statusCode).toBe(201);
    // House runtime adversary: the cookie stays valid, but its persisted principal has no human account/grants.
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), w.inspector.userId]);
    try {
      expect((await reread(w.inspector.client, w, gid)).statusCode).toBe(404);
      expect((await note(w.inspector.client, w, gid, 'death_date')).statusCode).toBe(404);
      const notes = await td.pool.query('SELECT author_actor_id FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1', [gid]);
      expect(notes.rows).toEqual([{ author_actor_id: w.inspector.userId }]);
    } finally {
      await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [w.inspector.userId, w.inspector.userId]);
    }
  });

  // ── AC5 — the showing and the re-read ──────────────────────────────────────────────────────────────────────────────────

  it('a lost completion response — the re-read returns the SAME keys (the recorded row), with the family date shown', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['died'] });
    await say(w, 'death_date', { date: '2026-06-01' });
    const gid = await assign(w);
    const first = (await complete(w.inspector.client, w, gid)).json<Json>()['discrepancy'];
    // ⭐ R2-18 — the date is IN the result, so the re-read's decrypted family date is compared with the completion's echo.
    expect(first).toEqual({ state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'shown', date: FAMILY_DATE }, familyAnswers: null });
    const rr = await reread(w.inspector.client, w, gid);
    expect(rr.statusCode, rr.body).toBe(200);
    expect(rr.json<{ discrepancy: Json }>().discrepancy).toEqual(first);
  });

  it('a showing write LOST without an error ⛔ fails the response; after a LATER answer the re-read still recomputes the completion\'s keys (as of `completed_at`) — AC7', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['died'] });
    await say(w, 'death_date', { date: '2026-06-01' });
    const gid = await assign(w);
    fault.showingCommit = true;
    let r: Res;
    try {
      r = await complete(w.inspector.client, w, gid);
    } finally {
      fault.showingCommit = false;
    }
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<Json>()['discrepancy']).toEqual({ state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'shown', date: FAMILY_DATE }, familyAnswers: null });
    expect(await showingRow(gid)).toBeNull();
    // AFTER completion the neighbour changes their answers: `not_died` — never on the re-read (AC7).
    await say(w, 'has_died', { codes: ['not_died'] });
    const rr = await reread(w.inspector.client, w, gid);
    expect(rr.json<{ discrepancy: Json }>().discrepancy).toEqual({ state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'shown', date: FAMILY_DATE }, familyAnswers: null });
    expect(await showingRow(gid)).toEqual({ question_keys: ['death_date'] });

    // AC7 — the District Admin's console carries the LATER answer (the live answers).
    const da = await authenticate('District Admin');
    await grant(da.userId, w.p, 'district_admin', 'district', DISTRICT);
    const section = await console_(w, da.userId);
    const live = section?.status === 'present' ? section.transcript.pings[0]!.reply!.answers.find((a) => a.questionKey === 'has_died') : null;
    expect(live?.value).toMatchObject({ kind: 'codes', codes: ['not_died'] });
  });

  it('R2-10 — the delivery\'s OWN COMMIT fails after the showing write answered `persisted` ⇒ still `shown` with the in-tx keys; the re-read recomputes them', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    fault.deliveryCommit = true;
    let r: Res;
    try {
      r = await complete(w.inspector.client, w, gid);
    } finally {
      fault.deliveryCommit = false;
    }
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<Json>()['discrepancy']).toEqual({ state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null });
    // The completion's own transaction committed; the delivery's showing did ⛔ (its COMMIT failed).
    const { rows } = await td.pool.query(`SELECT status FROM claim_ground_inspections WHERE ground_inspection_id = $1`, [gid]);
    expect(rows[0]).toEqual({ status: 'completed' });
    expect(await showingRow(gid)).toBeNull();
    const rr = await reread(w.inspector.client, w, gid);
    expect(rr.json<{ discrepancy: Json }>().discrepancy).toEqual({ state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null });
    expect(await showingRow(gid)).toEqual({ question_keys: ['has_died'] });
  });

  it('the re-read\'s neutral 404 for every non-completed status, a `certificate_check` and a pre-0147 NULL-source row', async () => {
    const w = await world();
    const scheduled = await assign(w);
    const superseded = await assign(w);
    await inScope(w.p, (tx) =>
      claim.rescheduleGroundInspection(tx.client, {
        pariwarId: ids.pariwarId(w.p),
        groundInspectionId: ids.groundInspectionId(superseded),
        district: DISTRICT,
        inspectionStage: 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: w.inspector.userId,
        scheduledAt: new Date('2026-07-11T12:00:00.000Z'),
        scheduledByActor: w.inspector.userId,
        idempotencyKey: randomUUID(),
      }),
    );
    const refused: string[] = [];
    for (const [disposition, reason] of [
      ['photo_refused', 'family_refused_photography'],
      ['evidence_unavailable', 'premises_inaccessible'],
    ] as const) {
      const gid = await assign(w);
      await inScope(w.p, (tx) =>
        claim.recordGroundInspectionRefusal(tx.client, {
          pariwarId: ids.pariwarId(w.p),
          groundInspectionId: ids.groundInspectionId(gid),
          actingActorId: w.inspector.userId,
          disposition,
          refusalReason: reason,
          notesCiphertext: 'enc:v1:reason',
        }),
      );
      refused.push(gid);
    }
    const cc = await assign(w, { stage: 'certificate_check' });
    expect((await complete(w.inspector.client, w, cc)).statusCode).toBe(200);
    const legacy = await assign(w);
    await forceLegacyCompletedNullSource(td.pool, w.p, legacy);
    for (const gid of [scheduled, superseded, ...refused, cc, legacy]) {
      const rr = await reread(w.inspector.client, w, gid);
      expect([rr.statusCode, errOf(rr).code], gid).toEqual([404, 'ground_inspection.not_found']);
      expect(await showingRow(gid)).toBeNull();
    }
  });

  // ── AC6 — the notes ────────────────────────────────────────────────────────────────────────────────────────────────────

  it('the note rules — 201 with its author; ONCE; a key ⛔ shown; the window; the audit line carries codes only', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    // ⭐ R2-15 / R3-10 — a BLANK note (whitespace, or ONLY zero-width / format characters and fillers) is refused before
    // anything is written: the once-only slot stays open for the real answer.
    for (const invisible of [' \t\n ', '\u200B\u2060\uFEFF', ' \u00A0\u3000\u3164\u2800 ', '\uFE0F\u034F\u180B']) {
      const blank = await note(w.inspector.client, w, gid, 'has_died', invisible);
      expect(blank.statusCode, `${JSON.stringify(invisible)} ${blank.body}`).toBe(400);
    }
    expect((await td.pool.query('SELECT 1 FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1', [gid])).rows).toEqual([]);
    const ok = await note(w.inspector.client, w, gid, 'has_died');
    expect(ok.statusCode, ok.body).toBe(201);
    expect(ok.json()).toEqual({ questionKey: 'has_died', notedAt: expect.any(String), authorActorId: w.inspector.userId.toLowerCase(), authorDisplay: 'Inspector One' });
    const again = await note(w.inspector.client, w, gid, 'has_died');
    expect([again.statusCode, errOf(again).code]).toEqual([409, 'ground_inspection.discrepancy_note_exists']);
    const notShown = await note(w.inspector.client, w, gid, 'death_date');
    expect([notShown.statusCode, errOf(notShown).code]).toEqual([409, 'ground_inspection.discrepancy_not_shown']);
    const audit = (td.auditSink as CapturingAuditSink).ofType('admin_ground_inspection.discrepancy_note_recorded').filter((e) => e.context?.['ground_inspection_id'] === gid);
    expect(audit).toHaveLength(1);
    expect(audit[0]!.context).toEqual({ claim_case_id: w.cid, ground_inspection_id: gid, question_key: 'has_died' });
    // The re-read returns it, decrypted, with its author.
    const rr = await reread(w.inspector.client, w, gid);
    expect(rr.json<{ notes: unknown[] }>().notes).toEqual([
      { questionKey: 'has_died', note: 'They said he died at home on the 15th.', notedAt: expect.any(String), authorActorId: w.inspector.userId.toLowerCase(), authorDisplay: 'Inspector One' },
    ]);

    // The window — a claim that has left it refuses the note with the module's window code.
    const out = await world();
    await say(out, 'has_died', { codes: ['not_died'] });
    const g2 = await assign(out);
    await complete(out.inspector.client, out, g2);
    await drive(out, [
      ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
      ['verifier_review', 'denied', 'claim.verifier_denied'],
    ]);
    const closed = await note(out.inspector.client, out, g2, 'has_died');
    expect([closed.statusCode, errOf(closed).code]).toEqual([409, 'ground_inspection.not_allowed']);
  });

  it('a MISSING showing (a failed post-commit write) is recomputed by the note write, which then accepts the note', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    fault.showingCommit = true;
    try {
      await complete(w.inspector.client, w, gid);
    } finally {
      fault.showingCommit = false;
    }
    expect(await showingRow(gid)).toBeNull();
    expect((await note(w.inspector.client, w, gid, 'has_died')).statusCode).toBe(201);
    expect(await showingRow(gid)).toEqual({ question_keys: ['has_died'] });
  });

  it('⭐ AC2 — a HIDDEN override holder probing `has_died` and `death_date` gets IDENTICAL status, code, message and ⛔ details; its re-read is withheld with `notes: []`', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    expect((await note(w.inspector.client, w, gid, 'has_died')).statusCode).toBe(201);
    const sup = await supervisor(w);
    await assign(w, { inspector: sup.userId }); // their own pending visit ⇒ hidden
    const probes = [await note(sup.client, w, gid, 'has_died'), await note(sup.client, w, gid, 'death_date')];
    for (const p of probes) {
      expect(p.statusCode).toBe(409);
      expect(errOf(p).code).toBe('ground_inspection.own_ground_visit_pending');
      expect(errOf(p)).not.toHaveProperty('details');
    }
    // Everything but `request_id` (the only field that may differ between two requests).
    const strip = (r: Res) => Object.fromEntries(Object.entries(errOf(r)).filter(([k]) => k !== 'request_id'));
    expect(strip(probes[0]!)).toEqual(strip(probes[1]!));
    const rr = await reread(sup.client, w, gid);
    expect(rr.json<Json>()).toEqual({ discrepancy: { state: 'withheld', reason: 'own_visit' }, notes: [] });
  });

  it('R4a — a user with ⛔ display name ⇒ 409 `admin.display_name_missing`; a non-holder with ⛔ name still 403; an override holder\'s note is read back by the inspector WITH its author', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    const nameless = await authenticate(null);
    await grant(nameless.userId, w.p, 'district_admin', 'district', DISTRICT);
    await grant(nameless.userId, w.p, 'pariwar_admin', 'pariwar', w.p);
    const missing = await note(nameless.client, w, gid, 'has_died');
    expect([missing.statusCode, errOf(missing).code]).toEqual([409, 'admin.display_name_missing']);
    const namelessNonHolder = await authenticate(null);
    await grant(namelessNonHolder.userId, w.p, 'district_admin', 'district', DISTRICT);
    expect((await note(namelessNonHolder.client, w, gid, 'has_died')).statusCode).toBe(403);

    const sup = await supervisor(w, 'Supervisor Two');
    expect((await note(sup.client, w, gid, 'has_died', 'The family repeated: at home.')).statusCode).toBe(201);
    const rr = await reread(w.inspector.client, w, gid);
    expect(rr.json<{ notes: unknown[] }>().notes).toEqual([
      { questionKey: 'has_died', note: 'The family repeated: at home.', notedAt: expect.any(String), authorActorId: sup.userId.toLowerCase(), authorDisplay: 'Supervisor Two' },
    ]);
    // The inspector's own box is now filled — 409, and the re-read shows whose it is.
    const mine = await note(w.inspector.client, w, gid, 'has_died');
    expect([mine.statusCode, errOf(mine).code]).toEqual([409, 'ground_inspection.discrepancy_note_exists']);
  });

  // ── R5 — the staff view inside the neighbours' section ─────────────────────────────────────────────────────────────────

  it('R5 — the District Admin\'s console carries the block (keys, times, notes with author); a HIDDEN reader gets ⛔ section at all', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['not_died'] });
    const gid = await assign(w);
    await complete(w.inspector.client, w, gid);
    await note(w.inspector.client, w, gid, 'has_died');
    const da = await authenticate('District Admin');
    await grant(da.userId, w.p, 'district_admin', 'district', DISTRICT);
    const section = await console_(w, da.userId);
    const block = section?.status === 'present' ? section.transcript.inspectionDiscrepancies : null;
    expect(block).toEqual([
      {
        groundInspectionId: gid,
        completedAt: expect.any(String),
        shownAt: expect.any(String),
        questionKeys: ['has_died'],
        notes: [{ questionKey: 'has_died', note: 'They said he died at home on the 15th.', notedAt: expect.any(String), authorDisplay: 'Inspector One' }],
      },
    ]);
    expect(Date.parse(block![0]!.completedAt)).toBeLessThanOrEqual(Date.parse(block![0]!.shownAt));
    // A reader whose own visit on the claim is pending ⇒ the WHOLE section absent (the new block rides inside the hide).
    const hidden = await authenticate('Hidden Reader');
    await assign(w, { inspector: hidden.userId });
    expect(await console_(w, hidden.userId)).toBeUndefined();
  });

  it('R2-7 (R3, Task 4.2 / 4.3) — an ERASED or undecryptable family date and note are `unavailable` on the re-read AND in the staff block — ⛔ the sentinel, ⛔ a 500 — and the block parses under the STRICT contract', async () => {
    const w = await world();
    await say(w, 'has_died', { codes: ['died'] });
    await say(w, 'death_date', { date: '2026-06-01' });
    const gid = await assign(w);
    expect((await complete(w.inspector.client, w, gid)).json<Json>()['discrepancy']).toMatchObject({ questionKeys: ['death_date'] });
    expect((await note(w.inspector.client, w, gid, 'death_date')).statusCode).toBe(201);
    const da = await authenticate('District Admin');
    await grant(da.userId, w.p, 'district_admin', 'district', DISTRICT);
    const expectUnavailable = async () => {
      const rr = await reread(w.inspector.client, w, gid);
      expect(rr.statusCode, rr.body).toBe(200);
      expect(rr.json()).toEqual({
        discrepancy: { state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'unavailable' }, familyAnswers: null },
        notes: [{ questionKey: 'death_date', note: { status: 'unavailable' }, notedAt: expect.any(String), authorActorId: w.inspector.userId.toLowerCase(), authorDisplay: 'Inspector One' }],
      });
      expect(rr.body).not.toContain(member.ANONYMIZED_SENTINEL);
      const section = await console_(w, da.userId);
      const block = section?.status === 'present' ? section.transcript.inspectionDiscrepancies : null;
      // The route's serializer parses the transcript under the STRICT contract; the block rides through the flag stitch by
      // spread, unchanged — so the block itself must pass its strict element schema (an `unavailable` note included).
      expect(() => InspectionDiscrepancyStaffView.array().parse(block)).not.toThrow();
      expect(block?.[0]?.notes).toEqual([{ questionKey: 'death_date', note: { status: 'unavailable' }, notedAt: expect.any(String), authorDisplay: 'Inspector One' }]);
    };
    // ERASED — the GI13 scrub's form: the house sentinel, encrypted under the field class (the notes' erasure arm admits it).
    const sentinel = await encryptGroundInspectionField(member.ANONYMIZED_SENTINEL, w.p, deps.encryption);
    await td.pool.query('UPDATE claim_ground_inspections SET death_date_ciphertext = $2 WHERE ground_inspection_id = $1', [gid, sentinel]);
    await td.pool.query('UPDATE claim_ground_inspection_discrepancy_notes SET note_ciphertext = $2 WHERE ground_inspection_id = $1', [gid, sentinel]);
    await expectUnavailable();
    // UNDECRYPTABLE.
    await td.pool.query(`UPDATE claim_ground_inspections SET death_date_ciphertext = 'enc:v1:garbage' WHERE ground_inspection_id = $1`, [gid]);
    await td.pool.query(`UPDATE claim_ground_inspection_discrepancy_notes SET note_ciphertext = 'enc:v1:garbage' WHERE ground_inspection_id = $1`, [gid]);
    await expectUnavailable();
  });

  /** The neighbours' section of the console as `actorId` reads it (the ONE assembler). */
  async function console_(w: World, actorId: string) {
    return inScope(w.p, (tx) =>
      assemblePeerMesh(
        deps,
        {
          db: tx.tx,
          client: tx.client,
          pariwarId: w.p,
          claimCaseId: w.cid,
          district: DISTRICT,
          actorId,
          grants: [],
          traceId: null,
          onCallbackMobileShown: () => {},
          callbackViewer: 'district',
        },
        ids.claimId(w.cid),
        { bump: () => {} },
        'Ram K.',
      ),
    );
  }

  /** Move the committed claim on through REAL events. */
  async function drive(w: World, steps: [string, string, string][]): Promise<void> {
    await inScope(w.p, async (tx) => {
      const row = await claim.getClaimCase(tx.tx, ids.pariwarId(w.p), ids.claimId(w.cid));
      for (const [from, to, eventType] of steps) {
        await claim.projectClaimState(tx.client, {
          claimCaseId: ids.claimId(w.cid),
          pariwarId: ids.pariwarId(w.p),
          deceasedMemberId: row!.deceasedMemberId,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system' } as never,
          actorId: null,
        });
      }
    });
  }
});

/**
 * A PRE-0147 completed FULL row (R1): 0147's completed-row CHECK is `NOT VALID`, so such a row can carry a NULL source —
 * but every NEW write is checked. Reproduced as history made it, in ONE committed transaction: drop the CHECK, complete the
 * row with a NULL source, re-add the CHECK by its OWN catalog definition (`… NOT VALID`).
 * ⭐ Code review round 2 (R2-17) — why this copy COMMITS shared DDL where the domain's shadows a temp table: the handler reads
 * the row on ANOTHER pooled connection, which a connection-local shadow cannot reach. ⚠ It takes ACCESS EXCLUSIVE on the
 * shared table at the DROP and holds it until its COMMIT (DROP → UPDATE → ADD → COMMIT, all short — round 3, R3-14), on a
 * FRESH connection that holds ⛔ other lock first — so ⛔ lock upgrade and ⛔ deadlock (round 1's CR6 shape). Its own wait
 * for that lock is bounded by `lock_timeout`; a parallel file touching the table queues behind it until the COMMIT. The
 * committed row is history of the kind 0147 already forbids validating over (⛔ never `VALIDATE` it while such a row exists).
 */
async function forceLegacyCompletedNullSource(pool: pg.Pool, pariwarId: string, groundInspectionId: string): Promise<void> {
  const name = 'claim_ground_inspections_completed_death_facts_check';
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1 AND conrelid = 'claim_ground_inspections'::regclass`,
      [name],
    );
    const def = rows[0]?.def;
    if (!def || !/NOT VALID$/.test(def)) throw new Error(`unexpected ${name}: ${def}`);
    await c.query(`SET LOCAL lock_timeout = '10s'`);
    await c.query(`ALTER TABLE claim_ground_inspections DROP CONSTRAINT ${name}`);
    const updated = await c.query(
      `UPDATE claim_ground_inspections SET status = 'completed', completed_at = clock_timestamp(), death_date_source = NULL,
              death_date_ciphertext = NULL, death_date_index = NULL, death_time_ciphertext = NULL, original_certificate_verdict = NULL,
              compared_certificate_upload_id = NULL
        WHERE pariwar_id = $1 AND ground_inspection_id = $2`,
      [pariwarId, groundInspectionId],
    );
    if (updated.rowCount !== 1) throw new Error(`[forceLegacyCompletedNullSource] updated ${updated.rowCount} rows, expected 1`);
    await c.query(`ALTER TABLE claim_ground_inspections ADD CONSTRAINT ${name} ${def}`);
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}
