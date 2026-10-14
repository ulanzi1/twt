// Story 6.27d — the inspector's discrepancy at the DOMAIN, on real rows (Task 2.6; AC2, AC3, AC5, AC6, AC7). Each test in
// its own rolled-back transaction under a FRESH Pariwar; the assignment is scheduled / photographed / completed and the
// neighbours' answers saved through the REAL writers.
//   · AC3 — the comparison INSIDE the completion: an EQUAL date ⇒ ⛔ no difference (FIRST — 6.27b Trap 3); D ± 1 ⇒ none;
//     D ± 2 ⇒ `death_date`; `not_died` ⇒ `has_died`, every other code ⇒ none; a superseded `not_died` ⇒ none; ⛔ no
//     neighbour selection ⇒ none; a `certificate_check` ⇒ `null`; a pre-0147 NULL-source row ⇒ ⛔ a target;
//   · AC5 — the guarded showing write reports `persisted` (⛔ a non-completed parent ⇒ ⛔ no row); the re-read returns the
//     RECORDED keys, else recomputes as of `completed_at` and records them; an EMPTY showing is a row;
//   · AC7 — an answer saved AFTER completion is ⛔ never in the recompute (the LIVE read sees it);
//   · AC6 — the note writer's six steps (the 404, the window, the hidden refusal identical whatever the showing, a
//     recomputed showing, the key not shown, once — the pre-check AND the 23505 backstop), the author, and the completed
//     inspection row ⛔ never changed (`to_jsonb` before / after).
// The ordering and race legs are in the OWN-COMMITTING `ground-inspection-discrepancy-concurrency.spec.ts`.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  GroundInspectionClaimNotInVerificationError,
  GroundInspectionInspectorMismatchError,
  GroundInspectionNotFoundError,
  InspectionDiscrepancyNoteExistsError,
  InspectionDiscrepancyNotShownError,
  OwnGroundVisitPendingError,
  readClaimInspectionDiscrepancyNotes,
  readClaimInspectionDiscrepancyShowings,
  readInspectionDiscrepancyNotes,
  readInspectionDiscrepancyTarget,
  readOrRecomputeInspectionDiscrepancy,
  recordInspectionDiscrepancyNote,
  recordInspectionDiscrepancyShowing,
  type InspectionDiscrepancyKey,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, pariwarId as toPariwarId, type ClaimId, type GroundInspectionId, type PariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { driveClaimTo, enterAppScope, seedDeathCertificate } from '../_helpers.js';
import { completeWithDate, FAMILY_DATE, forceLegacyCompletedNullSource, scheduleWithOriginalPhoto } from './_inspection-discrepancy-fixtures.js';
import { attachTextedPings, savePeerFixtureAnswer, type TextedPing } from './_peer-reply-fixtures.js';

const INSPECTOR = 'a1a1a1a1-0000-4000-8000-000000000001';
const SUPERVISOR = 'b2b2b2b2-0000-4000-8000-000000000002';

type Client = ReturnType<typeof getTx>['client'];
interface Ctx {
  readonly client: Client;
  readonly pid: PariwarId;
  readonly cid: ClaimId;
  readonly pings: TextedPing[];
}

/** A claim in `verification_in_progress` under a FRESH Pariwar, a current certificate, and `pings` texted neighbours. */
async function claim(pings = 1): Promise<Ctx> {
  const { client } = getTx();
  const pid = toPariwarId(randomUUID());
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await enterAppScope(client, pid);
  await driveClaimTo(client, pid, cid, mid, 'verification_in_progress');
  await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: cid });
  await client.query('RESET ROLE');
  const texted = pings > 0 ? await attachTextedPings(client, pid, cid, mid, pings) : [];
  await enterAppScope(client, pid);
  return { client, pid, cid, pings: texted };
}

const save = (ctx: Ctx, key: string, value: { codes: string[] } | { date: string }, ping = 0) =>
  savePeerFixtureAnswer(ctx.client, ctx.pid, ctx.pings[ping]!, key, value);
const saidDate = async (ctx: Ctx, date: string, ping = 0) => {
  await save(ctx, 'has_died', { codes: ['died'] }, ping);
  await save(ctx, 'death_date', { date }, ping);
};

async function schedule(ctx: Ctx, opts: { inspector?: string; certificateCheck?: boolean } = {}): Promise<GroundInspectionId> {
  return scheduleWithOriginalPhoto(ctx.client, ctx.pid, ctx.cid, {
    inspector: opts.inspector ?? INSPECTOR,
    ...(opts.certificateCheck ? { stage: 'certificate_check' as const } : {}),
  });
}

async function completeOne(ctx: Ctx, opts: { date?: string; certificateCheck?: boolean } = {}) {
  const gid = await schedule(ctx, opts);
  const r = await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR, ...opts });
  return { gid, discrepancy: r.discrepancy };
}

const db = (ctx: Ctx) => bindScopedDb(ctx.client);
const showingOf = async (ctx: Ctx, gid: GroundInspectionId) =>
  (await readClaimInspectionDiscrepancyShowings(db(ctx), ctx.pid, ctx.cid)).find((s) => s.groundInspectionId === gid) ?? null;

const note = (ctx: Ctx, gid: GroundInspectionId, questionKey: InspectionDiscrepancyKey, over: { actor?: string; override?: boolean } = {}) =>
  recordInspectionDiscrepancyNote(ctx.client, {
    pariwarId: ctx.pid,
    groundInspectionId: gid,
    actingActorId: over.actor ?? INSPECTOR,
    ...(over.override ? { override: { byActorId: over.actor ?? INSPECTOR } } : {}),
    questionKey,
    noteCiphertext: 'enc:v1:note',
    authorDisplay: 'Inspector One',
  });

/** Run `fn` under a SAVEPOINT (a refusal aborts the statement — the test goes on). */
async function underSavepoint<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('SAVEPOINT probe');
  try {
    const out = await fn();
    await client.query('RELEASE SAVEPOINT probe');
    return out;
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    throw err;
  }
}

async function setClaimState(client: Client, pid: string, cid: string, state: string) {
  await client.query('RESET ROLE');
  await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
  await client.query(`UPDATE claims SET current_state = $3 WHERE pariwar_id = $1 AND claim_case_id = $2`, [pid, cid, state]);
  await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
  await enterAppScope(client, pid);
}

describe.skipIf(!hasDatabase)('Story 6.27d — the inspector\'s discrepancy at the domain (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC3 — the comparison inside the completion', () => {
    it('⚠ INDEX TRAP FIRST — a neighbour date EQUAL to the family\'s ⇒ `{ questionKeys: [] }`', async () => {
      const ctx = await claim();
      await saidDate(ctx, FAMILY_DATE);
      expect((await completeOne(ctx)).discrepancy).toEqual({ questionKeys: [] });
    });

    it('D ± 1 ⇒ ⛔ no difference; D ± 2 ⇒ `death_date`', async () => {
      for (const [offset, want] of [
        [-1, []],
        [1, []],
        [-2, ['death_date']],
        [2, ['death_date']],
      ] as const) {
        const ctx = await claim();
        await saidDate(ctx, addCalendarDays(FAMILY_DATE, offset));
        expect((await completeOne(ctx)).discrepancy, `D${offset}`).toEqual({ questionKeys: want });
      }
    });

    it('`not_died` ⇒ `has_died`; `died` / `not_sure` / `did_not_know` ⇒ ⛔ none; both kinds come in the rule table\'s order', async () => {
      const ctx = await claim(4);
      await save(ctx, 'has_died', { codes: ['died'] }, 0);
      await save(ctx, 'has_died', { codes: ['not_sure'] }, 1);
      await save(ctx, 'has_died', { codes: ['did_not_know'] }, 2);
      expect((await completeOne(ctx)).discrepancy).toEqual({ questionKeys: [] });

      const both = await claim(2);
      await saidDate(both, addCalendarDays(FAMILY_DATE, 5), 0);
      await save(both, 'has_died', { codes: ['not_died'] }, 1);
      expect((await completeOne(both)).discrepancy).toEqual({ questionKeys: ['has_died', 'death_date'] });
    });

    it('a SUPERSEDED `not_died` ⇒ ⛔ none (live answers only)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      await save(ctx, 'has_died', { codes: ['died'] });
      expect((await completeOne(ctx)).discrepancy).toEqual({ questionKeys: [] });
    });

    it('⛔ no neighbour selection at all (CF4 — the inspection carries the claim) ⇒ `{ questionKeys: [] }`', async () => {
      const ctx = await claim(0);
      expect((await completeOne(ctx)).discrepancy).toEqual({ questionKeys: [] });
    });

    it('a `certificate_check` (⛔ no family account) ⇒ `null` — whatever the neighbours said', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid, discrepancy } = await completeOne(ctx, { certificateCheck: true });
      expect(discrepancy).toBeNull();
      await expect(readInspectionDiscrepancyTarget(db(ctx), ctx.pid, gid)).rejects.toBeInstanceOf(GroundInspectionNotFoundError);
      await expect(underSavepoint(ctx.client, () => readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid))).rejects.toBeInstanceOf(
        GroundInspectionNotFoundError,
      );
      expect(await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: gid, questionKeys: [] })).toEqual({ persisted: false });
      expect(await showingOf(ctx, gid)).toBeNull();
    });

    it('a pre-0147 completed FULL row with a NULL source ⇒ ⛔ a target (R1 — keyed on the source, ⛔ the stage)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const gid = await schedule(ctx);
      await ctx.client.query('RESET ROLE');
      await forceLegacyCompletedNullSource(ctx.client, ctx.pid, gid);
      await enterAppScope(ctx.client, ctx.pid);
      await expect(readInspectionDiscrepancyTarget(db(ctx), ctx.pid, gid)).rejects.toBeInstanceOf(GroundInspectionNotFoundError);
      await expect(underSavepoint(ctx.client, () => readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid))).rejects.toBeInstanceOf(
        GroundInspectionNotFoundError,
      );
      expect(await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: gid, questionKeys: ['has_died'] })).toEqual({
        persisted: false,
      });
      await expect(underSavepoint(ctx.client, () => note(ctx, gid, 'has_died'))).rejects.toBeInstanceOf(GroundInspectionNotFoundError);
    });
  });

  describe('AC5 — the showing and the re-read', () => {
    it('the guarded write records the in-tx keys ONCE (`persisted`); a conflict changes ⛔ nothing; a scheduled parent ⇒ ⛔ no row', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid, discrepancy } = await completeOne(ctx);
      expect(discrepancy).toEqual({ questionKeys: ['has_died'] });
      expect(await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: gid, questionKeys: ['has_died'] })).toEqual({ persisted: true });
      const first = await showingOf(ctx, gid);
      expect(first?.questionKeys).toEqual(['has_died']);
      expect(await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: gid, questionKeys: [] })).toEqual({ persisted: true });
      expect(await showingOf(ctx, gid)).toEqual(first);
      // The re-read returns the RECORDED row.
      expect(await readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid)).toEqual({ questionKeys: ['has_died'], shownAt: first!.shownAt });

      const pending = await schedule(ctx, { inspector: randomUUID() });
      expect(await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: pending, questionKeys: [] })).toEqual({ persisted: false });
      expect(await showingOf(ctx, pending)).toBeNull();
    });

    it('a lost / failed delivery — the re-read RECOMPUTES the same keys, records them, and an EMPTY result is a row', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid, discrepancy } = await completeOne(ctx);
      expect(await showingOf(ctx, gid)).toBeNull();
      const r = await readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid);
      expect(r.questionKeys).toEqual(discrepancy!.questionKeys);
      expect((await showingOf(ctx, gid))?.questionKeys).toEqual(['has_died']);

      const empty = await claim(0);
      const e = await completeOne(empty);
      expect((await readOrRecomputeInspectionDiscrepancy(db(empty), empty.pid, e.gid)).questionKeys).toEqual([]);
      expect((await showingOf(empty, e.gid))?.questionKeys).toEqual([]);
    });

    it('AC7 — an answer saved AFTER completion is ⛔ never in the recompute (the live answers carry it)', async () => {
      const ctx = await claim();
      await saidDate(ctx, FAMILY_DATE);
      const { gid, discrepancy } = await completeOne(ctx);
      expect(discrepancy).toEqual({ questionKeys: [] });
      // After completion: the neighbour changes their answer — a new LIVE `not_died` and a date far away.
      await save(ctx, 'has_died', { codes: ['not_died'] });
      await save(ctx, 'death_date', { date: addCalendarDays(FAMILY_DATE, -10) }).catch(() => undefined);
      expect((await readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid)).questionKeys).toEqual([]);
      const { rows } = await ctx.client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM claim_peer_mesh_reply_answers WHERE pariwar_id = $1 AND claim_case_id = $2 AND superseded_at IS NULL AND value_codes = ARRAY['not_died']`,
        [ctx.pid, ctx.cid],
      );
      expect(rows[0]!.n).toBe(1);
    });
  });

  describe('AC6 — the note writer', () => {
    it('the six steps: accepted on a shown key, with its author; ⛔ a key not shown; ⛔ twice; ALL notes are read with their author', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      const r = await note(ctx, gid, 'has_died', { actor: `  ${INSPECTOR.toUpperCase()} ` });
      expect(r).toEqual({ questionKey: 'has_died', notedAt: expect.any(Date), authorActorId: INSPECTOR, authorDisplay: 'Inspector One' });
      // A missing showing was recomputed and recorded by the note write (the in-tx result was never delivered here).
      expect((await showingOf(ctx, gid))?.questionKeys).toEqual(['has_died']);
      await expect(underSavepoint(ctx.client, () => note(ctx, gid, 'death_date'))).rejects.toBeInstanceOf(InspectionDiscrepancyNotShownError);
      await expect(underSavepoint(ctx.client, () => note(ctx, gid, 'has_died'))).rejects.toBeInstanceOf(InspectionDiscrepancyNoteExistsError);
      const notes = await readInspectionDiscrepancyNotes(db(ctx), ctx.pid, gid);
      expect(notes).toEqual([
        { groundInspectionId: gid, questionKey: 'has_died', noteCiphertext: 'enc:v1:note', authorActorId: INSPECTOR, authorDisplay: 'Inspector One', notedAt: r.notedAt },
      ]);
      expect(await readClaimInspectionDiscrepancyNotes(db(ctx), ctx.pid, ctx.cid)).toEqual(notes);
    });

    it('the 23505 backstop — a duplicate forced PAST the pre-check maps to the same typed error', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      await note(ctx, gid, 'has_died');
      // A client whose pre-check read sees ⛔ no note (as a writer that raced past it would).
      const blind = new Proxy(ctx.client, {
        get(target, prop, receiver) {
          if (prop !== 'query') return Reflect.get(target, prop, receiver);
          return (q: unknown, ...rest: unknown[]) => {
            const text = typeof q === 'string' ? q : (q as { text?: string }).text ?? '';
            if (/^select/i.test(text) && text.includes('"claim_ground_inspection_discrepancy_notes"')) {
              return Promise.resolve({ rows: [], rowCount: 0, command: 'SELECT', fields: [] });
            }
            return (target.query as (...a: unknown[]) => unknown).call(target, q, ...rest);
          };
        },
      }) as pg.PoolClient;
      await expect(
        underSavepoint(ctx.client, () =>
          recordInspectionDiscrepancyNote(blind, {
            pariwarId: ctx.pid,
            groundInspectionId: gid,
            actingActorId: INSPECTOR,
            questionKey: 'has_died',
            noteCiphertext: 'enc:v1:second',
            authorDisplay: 'Inspector One',
          }),
        ),
      ).rejects.toBeInstanceOf(InspectionDiscrepancyNoteExistsError);
    });

    it('step 1 — a non-completed or `certificate_check` assignment ⇒ 404; ⛔ the inspector and ⛔ an override ⇒ the identity refusal', async () => {
      const ctx = await claim();
      const pending = await schedule(ctx);
      await expect(underSavepoint(ctx.client, () => note(ctx, pending, 'has_died'))).rejects.toBeInstanceOf(GroundInspectionNotFoundError);
      const cc = await completeOne(ctx, { certificateCheck: true });
      await expect(underSavepoint(ctx.client, () => note(ctx, cc.gid, 'has_died'))).rejects.toBeInstanceOf(GroundInspectionNotFoundError);
      const full = await completeOne(ctx);
      await expect(underSavepoint(ctx.client, () => note(ctx, full.gid, 'has_died', { actor: randomUUID() }))).rejects.toBeInstanceOf(
        GroundInspectionInspectorMismatchError,
      );
    });

    it('step 2 — outside the answer window ⇒ the window refusal (⛔ a showing read first)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      await setClaimState(ctx.client, ctx.pid, ctx.cid, 'approved');
      await expect(underSavepoint(ctx.client, () => note(ctx, gid, 'has_died'))).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
      expect(await showingOf(ctx, gid)).toBeNull();
    });

    it('step 3 — a HIDDEN override holder is refused IDENTICALLY whether or not the key was shown, and ⛔ no showing is recorded (AC2)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      // The supervisor holds their OWN pending visit on this claim ⇒ the ONE predicate hides the section from them.
      await schedule(ctx, { inspector: SUPERVISOR });
      const refusals: string[] = [];
      for (const key of ['has_died', 'death_date'] as const) {
        const err = await underSavepoint(ctx.client, () => note(ctx, gid, key, { actor: SUPERVISOR, override: true })).catch((e: unknown) => e);
        expect(err, key).toBeInstanceOf(OwnGroundVisitPendingError);
        refusals.push(`${(err as Error).name}:${(err as Error).message}`);
      }
      expect(refusals[0]).toBe(refusals[1]);
      expect(await showingOf(ctx, gid)).toBeNull();
    });

    it('an override holder who is ⛔ hidden writes the note; the assigned inspector then reads it WITH its author (R4a)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      await note(ctx, gid, 'has_died', { actor: SUPERVISOR, override: true });
      const notes = await readInspectionDiscrepancyNotes(db(ctx), ctx.pid, gid);
      expect(notes.map((n) => [n.questionKey, n.authorActorId])).toEqual([['has_died', SUPERVISOR]]);
      await expect(underSavepoint(ctx.client, () => note(ctx, gid, 'has_died'))).rejects.toBeInstanceOf(InspectionDiscrepancyNoteExistsError);
    });

    it('the completed inspection row is ⛔ never changed by the showing or the note writes (`to_jsonb` before / after)', async () => {
      const ctx = await claim();
      await save(ctx, 'has_died', { codes: ['not_died'] });
      const { gid } = await completeOne(ctx);
      const row = async () =>
        (await ctx.client.query<{ j: unknown }>(`SELECT to_jsonb(gi) AS j FROM claim_ground_inspections gi WHERE ground_inspection_id = $1`, [gid])).rows[0]!.j;
      const before = await row();
      await recordInspectionDiscrepancyShowing(db(ctx), { pariwarId: ctx.pid, groundInspectionId: gid, questionKeys: ['has_died'] });
      await readOrRecomputeInspectionDiscrepancy(db(ctx), ctx.pid, gid);
      await note(ctx, gid, 'has_died');
      expect(await row()).toEqual(before);
    });
  });
});
