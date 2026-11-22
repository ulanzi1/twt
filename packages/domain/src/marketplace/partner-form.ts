// The partner's-own-form route — what the Trust may learn about a `partner_form` offer (Story 12.5b, Task 5; Decision
// `2026-11-22-489` QE8, QE9 (A), QE10 (A), QE11, QE12 (A), QE13 (A); carrying out `2026-11-22-486` R2 C and R3 B; AC6, AC8–AC10).
//
// `-484` Q1 C option B: *"The Trust sends nothing — the member opens the partner's own form from the app … The Trust passes the partner
// only a code saying which offer the visit came from, and nothing about the member."* The code is part of the offer's FIXED
// `partner_form_url` (the same for every member); the Trust appends NOTHING to it, ever (I3).
//
// ⭐ What this file holds:
//   · {@link openPartnerFormVisit} — the ONLY place the stored URL is handed out, and only by a successful visit write (QE11): the
//     offer's and the member's refusals, then ONE visit record (R2 C — removed 90 days after its own `opened_at`, W15) and ONE
//     `went_to_partner` count, in one savepoint;
//   · {@link countPartnerFormEvent} — the Trust's own per-offer, per-IST-day counts; ⛔ member argument, by type (I4);
//   · {@link recordPartnerFormTotals} — the partner's OWN totals, entered by staff (R3 B, QE12 (A)); below 5 never stored;
//   · {@link listPartnerFormFigures} — the admin read of both, every figure below 5 shown as "fewer than 5" (I4).
// ⛔ A staff read of the visit records (I5): ⛔ list, ⛔ count, ⛔ export from the barrel that a route could call. The only readers are
// erasure, the DPDPA export and the purge.
// ⛔ Audit line, ⛔ `events_log` event, ⛔ log line for a visit (QE9 (A) — a DELIBERATE exception to "a write is audited"): both are
// permanent, so either would keep "member X opened offer Y" forever and make R2 C's 90-day removal false (TR8, G20).
//
// NO production caller of the member-facing functions here (I1): Story 12.3's shelf is their first. Every function runs on the caller's
// transaction, as `twt_app` under the Pariwar's scope.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { z } from 'zod';

import { bindScopedDb, type Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import { PARTNER_FORM_VISIT_RETENTION_DAYS } from '../schema/marketplace_partner_form_visits.js';
import type { MemberId, ModuleId, PariwarId } from '../ids/index.js';
import { memberExists } from '../member/read.js';
import { PARTNER_FORM_COUNT_KINDS, type PartnerFormCountKind } from '../schema/marketplace_partner_form_counts.js';
import {
  PARTNER_FORM_FIGURE_FLOOR,
  PARTNER_FORM_STAGE_LABEL_MAX,
  PARTNER_FORM_STAGES_MAX,
} from '../schema/marketplace_partner_form_totals.js';
import {
  ModuleGenesisMissingError,
  ModuleNotPartnerFormError,
  PartnerFormTotalsInvalidError,
  PartnerFormVisitRefusedError,
} from './errors.js';
import { storableText } from './filters.js';
import { readMemberStandingP2toP5 } from './lead-handoff.js';

export { PARTNER_FORM_COUNT_KINDS, type PartnerFormCountKind } from '../schema/marketplace_partner_form_counts.js';
export { PARTNER_FORM_FIGURE_FLOOR } from '../schema/marketplace_partner_form_totals.js';
export { PARTNER_FORM_VISIT_RETENTION_DAYS };

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/** The IST date, from the DB clock (TR20 — ⛔ `new Date()` in JS). */
const IST_DAY = `(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date`;

const VISIT_SAVEPOINT = 'partner_form_visit';
const COUNT_SAVEPOINT = 'partner_form_count';
const TOTALS_SAVEPOINT = 'partner_form_totals';

async function inSavepoint<T>(client: pg.PoolClient, name: string, fn: () => Promise<T>): Promise<T> {
  await client.query(`SAVEPOINT ${name}`);
  try {
    const out = await fn();
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return out;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`).catch(() => undefined);
    await client.query(`RELEASE SAVEPOINT ${name}`).catch(() => undefined);
    throw err;
  }
}

/** The module's route, or null when it has no row in this Pariwar. */
async function moduleRoute(client: pg.PoolClient, pariwarId: string, moduleId: string): Promise<string | null> {
  const { rows } = await client.query<{ lead_route: string }>(
    'SELECT lead_route FROM marketplace_modules WHERE pariwar_id = $1 AND module_id = $2',
    [pariwarId, moduleId],
  );
  return rows[0]?.lead_route ?? null;
}

/** UPSERT one count (⛔ member). The caller has checked the module is a `partner_form` offer. */
async function bumpCount(client: pg.PoolClient, pariwarId: string, moduleId: string, kind: PartnerFormCountKind): Promise<void> {
  await client.query(
    `INSERT INTO marketplace_partner_form_counts (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, ${IST_DAY}, $3, 1)
     ON CONFLICT (pariwar_id, module_id, day, kind) DO UPDATE SET count = marketplace_partner_form_counts.count + 1`,
    [pariwarId, moduleId, kind],
  );
}

// ── The visit (R2 C) ─────────────────────────────────────────────────────────────────────────────────

export interface OpenPartnerFormVisitResult {
  /** The visit record's id (server-minted). ⛔ part of the URL (AC6). */
  readonly visitId: string;
  /** The stored `partner_form_url`, BYTE FOR BYTE (I3). */
  readonly partnerFormUrl: string;
}

/**
 * ⭐ QE11 — open a `partner_form` offer's page for a member: the refusals in order, then ONE visit record + ONE `went_to_partner` count,
 * in ONE savepoint, and the stored URL returned unchanged. ⇒ **the URL is handed out only by a successful visit write.**
 *   · the offer: `not_found` · `not_partner_form` (a `trust_sends` offer has no page) · `not_active` · `outside_window` (`[valid_from,
 *     valid_until)` against the transaction's `now()`, the lead's clock);
 *   · the member: `member_not_in_pariwar` (P0 — the member FK is single-column and ignores RLS) · then the SHARED reader (12.5's P2
 *     lifecycle, P3, P4, P5): `member_erased` · `member_withdrawn` · `member_terminated` · `account_frozen` · `death_reported` (R4 A's
 *     narrow side: once a death is reported these offers are not shown — and not opened).
 * Scope, eligibility and 12.4's suppression stay 12.3's (12.1 exports no evaluator — C9; KB-1). A refusal writes NOTHING and leaves the
 * caller's transaction usable. ⛔ Audit line, ⛔ event, ⛔ log (QE9 (A)). NO production caller (I1).
 *
 * @throws PartnerFormVisitRefusedError
 */
export async function openPartnerFormVisit(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly moduleId: ModuleId; readonly memberId: MemberId },
): Promise<OpenPartnerFormVisitResult> {
  const P = input.pariwarId.toLowerCase() as PariwarId;
  const moduleId = input.moduleId.toLowerCase();
  const M = input.memberId.toLowerCase() as MemberId;
  return inSavepoint(client, VISIT_SAVEPOINT, async () => {
    const { rows } = await client.query<{
      lead_route: string;
      partner_form_url: string | null;
      current_state: string;
      in_window: boolean;
    }>(
      `SELECT lead_route, partner_form_url, current_state, (valid_from <= now() AND now() < valid_until) AS in_window
         FROM marketplace_modules WHERE pariwar_id = $1 AND module_id = $2`,
      [P, moduleId],
    );
    const m = rows[0];
    if (m === undefined) throw new PartnerFormVisitRefusedError('not_found');
    if (m.lead_route !== 'partner_form' || m.partner_form_url === null) throw new PartnerFormVisitRefusedError('not_partner_form');
    if (m.current_state !== 'active') throw new PartnerFormVisitRefusedError('not_active');
    if (!m.in_window) throw new PartnerFormVisitRefusedError('outside_window');
    const db: Db = bindScopedDb(client);
    if (!(await memberExists(db, P, M))) throw new PartnerFormVisitRefusedError('member_not_in_pariwar');
    const stop = await readMemberStandingP2toP5(db, client, P, M, { fieldsGone: false });
    if (stop !== null) throw new PartnerFormVisitRefusedError(stop);
    const visitId = randomUUID();
    await client.query(
      'INSERT INTO marketplace_partner_form_visits (visit_id, pariwar_id, module_id, member_id) VALUES ($1, $2, $3, $4)',
      [visitId, P, moduleId, M],
    );
    await bumpCount(client, P, moduleId, 'went_to_partner');
    return { visitId, partnerFormUrl: m.partner_form_url };
  });
}

// ── The Trust's own counts (QE13 (A)) ─────────────────────────────────────────────────────────────────

/**
 * ⭐ QE13 (A) — count one anonymous event on a `partner_form` offer: `(pariwar, module, IST day, kind)` → `count + 1`. It takes ⛔ member
 * argument BY TYPE (I4) and writes ⛔ audit line (anonymous counts). The three card kinds are Story 12.3's emitters (KB-3);
 * `went_to_partner` is {@link openPartnerFormVisit}'s.
 *
 * @throws ModuleGenesisMissingError  ⛔ row in this Pariwar.
 * @throws ModuleNotPartnerFormError  a `trust_sends` offer (QE18: ⛔ counters for those — KB-8).
 */
export async function countPartnerFormEvent(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly moduleId: ModuleId; readonly kind: PartnerFormCountKind },
): Promise<void> {
  if (!(PARTNER_FORM_COUNT_KINDS as readonly string[]).includes(input.kind)) {
    throw new RangeError(`countPartnerFormEvent: an unknown kind`);
  }
  const P = input.pariwarId.toLowerCase();
  const moduleId = input.moduleId.toLowerCase();
  await inSavepoint(client, COUNT_SAVEPOINT, async () => {
    const route = await moduleRoute(client, P, moduleId);
    if (route === null) throw new ModuleGenesisMissingError(moduleId);
    if (route !== 'partner_form') throw new ModuleNotPartnerFormError(moduleId);
    await bumpCount(client, P, moduleId, input.kind);
  });
}

// ── The partner's totals (R3 B, QE12 (A)) ─────────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d.getUTCFullYear() >= 2000;
  }, 'must be a real date from the year 2000');

/** One stage: the partner's own word for it, and its whole number (⛔ a member). */
const PartnerFormStageSchema = z
  .object({
    label: storableText(z.string().trim().min(1).max(PARTNER_FORM_STAGE_LABEL_MAX)),
    figure: z.number().int().nonnegative().max(2_147_483_647),
  })
  .strict();

/** The partner's totals for one period (QE12 (A)): the period, then 1–20 stages IN THE PARTNER'S ORDER. */
export const PartnerFormTotalsInputSchema = z
  .object({
    period_start: isoDate,
    period_end: isoDate,
    stages: z.array(PartnerFormStageSchema).min(1).max(PARTNER_FORM_STAGES_MAX),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.period_end < v.period_start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'period_end must not be before period_start', path: ['period_end'] });
    }
  });
export type PartnerFormTotalsInput = z.infer<typeof PartnerFormTotalsInputSchema>;

/**
 * ⭐ QE12 (A) — record ONE entry of the partner's totals for a period (INSERT-ONLY: a correction is a NEW entry for the same period; the
 * read shows the newest). A figure below {@link PARTNER_FORM_FIGURE_FLOOR} is stored as `below_floor = true` with a NULL figure — the
 * number itself is NEVER stored (`-486` R3 B: "totals below 5 are not shown"; the 0217 floor CHECK). Advisory: it changes nothing about
 * any member (the K-5 rule). The CALLER pairs the audit line (`module.partner_form_totals_recorded`, `withCompensatingAudit` at the
 * route — it names no member) and passes its id.
 *
 * @throws PartnerFormTotalsInvalidError  the shape (paths + messages).
 * @throws ModuleGenesisMissingError      ⛔ row in this Pariwar.
 * @throws ModuleNotPartnerFormError      a `trust_sends` offer (→ 409 `module.not_partner_form`).
 */
export async function recordPartnerFormTotals(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly moduleId: ModuleId;
    readonly totals: unknown;
    readonly enteredByActorId: string;
    readonly auditId: string;
  },
): Promise<{ readonly totalsId: string; readonly stages: number }> {
  const parsed = PartnerFormTotalsInputSchema.safeParse(input.totals);
  if (!parsed.success) throw new PartnerFormTotalsInvalidError(parsed.error);
  const t = parsed.data;
  const P = input.pariwarId.toLowerCase();
  const moduleId = input.moduleId.toLowerCase();
  return inSavepoint(client, TOTALS_SAVEPOINT, async () => {
    const route = await moduleRoute(client, P, moduleId);
    if (route === null) throw new ModuleGenesisMissingError(moduleId);
    if (route !== 'partner_form') throw new ModuleNotPartnerFormError(moduleId);
    const totalsId = randomUUID();
    for (const [i, stage] of t.stages.entries()) {
      const below = stage.figure < PARTNER_FORM_FIGURE_FLOOR;
      await client.query(
        `INSERT INTO marketplace_partner_form_totals (totals_id, pariwar_id, module_id, period_start, period_end, stage_order, stage_label, figure,
           below_floor, entered_by_actor_id, audit_id) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11)`,
        [totalsId, P, moduleId, t.period_start, t.period_end, i + 1, stage.label, below ? null : stage.figure, below, input.enteredByActorId, input.auditId],
      );
    }
    return { totalsId, stages: t.stages.length };
  });
}

// ── The admin read (QE13 (A), QE12 (A)) — every figure below 5 is "fewer than 5" ───────────────────────

/** A figure as staff may see it: the number at or above the floor, else `null` with `belowFloor` (I4). */
export interface FlooredFigure {
  readonly figure: number | null;
  readonly belowFloor: boolean;
}

export interface PartnerFormFigures {
  /** Each kind's total over every day (floored). */
  readonly counts: Readonly<Record<PartnerFormCountKind, FlooredFigure>>;
  /** The newest days first, at most {@link PARTNER_FORM_FIGURE_DAYS_SHOWN}; each kind floored. */
  readonly days: readonly { readonly day: string; readonly kinds: Readonly<Record<PartnerFormCountKind, FlooredFigure>> }[];
  /** The NEWEST entry per period (a correction replaces the earlier one), newest period first. */
  readonly partnerTotals: readonly {
    readonly totalsId: string;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly enteredAt: Date;
    readonly stages: readonly { readonly order: number; readonly label: string; readonly figure: number | null; readonly belowFloor: boolean }[];
  }[];
}

/** How many days the per-day list shows (the newest). */
export const PARTNER_FORM_FIGURE_DAYS_SHOWN = 60;
/** How many periods the partner-totals list shows (the newest). */
export const PARTNER_FORM_TOTALS_PERIODS_SHOWN = 50;

/** The floor, applied (I4): ⛔ a figure below 5 leaves this function. */
export function floorFigure(n: number): FlooredFigure {
  return n < PARTNER_FORM_FIGURE_FLOOR ? { figure: null, belowFloor: true } : { figure: n, belowFloor: false };
}

const zeroKinds = (): Record<PartnerFormCountKind, number> =>
  Object.fromEntries(PARTNER_FORM_COUNT_KINDS.map((k) => [k, 0])) as Record<PartnerFormCountKind, number>;
const floorKinds = (n: Record<PartnerFormCountKind, number>): Record<PartnerFormCountKind, FlooredFigure> =>
  Object.fromEntries(PARTNER_FORM_COUNT_KINDS.map((k) => [k, floorFigure(n[k])])) as Record<PartnerFormCountKind, FlooredFigure>;

/**
 * The figures of a `partner_form` offer for the admin detail page: the Trust's own counts (totals and the newest days) and the partner's
 * totals (the newest entry per period) — every figure below 5 as "fewer than 5" (`belowFloor`, ⛔ the number). ⛔ Visit records (I5).
 * ⚠ Explicit `pariwar_id` on every read (defense in depth beside RLS).
 */
export async function listPartnerFormFigures(db: Db, pariwarId: PariwarId, moduleId: ModuleId): Promise<PartnerFormFigures> {
  const P = pariwarId.toLowerCase();
  const id = moduleId.toLowerCase();
  const countRows = (
    await db.execute<{ day: string; kind: PartnerFormCountKind; count: string | number }>(
      // ⚠ `day::text` — the YYYY-MM-DD the DB wrote, ⛔ a JS Date round trip.
      sql`SELECT day::text AS day, kind, count FROM marketplace_partner_form_counts WHERE pariwar_id = ${P} AND module_id = ${id}`,
    )
  ).rows;
  const totals = zeroKinds();
  const byDay = new Map<string, Record<PartnerFormCountKind, number>>();
  for (const r of countRows) {
    const n = Number(r.count);
    totals[r.kind] += n;
    const d = byDay.get(r.day) ?? zeroKinds();
    d[r.kind] += n;
    byDay.set(r.day, d);
  }
  const days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .slice(0, PARTNER_FORM_FIGURE_DAYS_SHOWN)
    .map(([day, n]) => ({ day, kinds: floorKinds(n) }));

  const totalRows = (
    await db.execute<{
      totals_id: string;
      period_start: string;
      period_end: string;
      entered_at: Date | string;
      stage_order: number;
      stage_label: string;
      figure: number | null;
      below_floor: boolean;
    }>(
      sql`WITH newest AS (
            SELECT DISTINCT ON (period_start, period_end) totals_id
              FROM marketplace_partner_form_totals
             WHERE pariwar_id = ${P} AND module_id = ${id}
             ORDER BY period_start, period_end, entered_at DESC, totals_id DESC
          ), shown AS (
            SELECT n.totals_id FROM newest n
              JOIN marketplace_partner_form_totals t ON t.totals_id = n.totals_id AND t.stage_order = 1
             ORDER BY t.period_end DESC, t.period_start DESC
             LIMIT ${PARTNER_FORM_TOTALS_PERIODS_SHOWN}
          )
          SELECT t.totals_id, t.period_start::text AS period_start, t.period_end::text AS period_end, t.entered_at, t.stage_order, t.stage_label,
                 t.figure, t.below_floor
            FROM marketplace_partner_form_totals t JOIN shown s ON s.totals_id = t.totals_id
           WHERE t.pariwar_id = ${P} AND t.module_id = ${id}
           ORDER BY t.period_end DESC, t.period_start DESC, t.stage_order`,
    )
  ).rows;
  const entries = new Map<string, PartnerFormFigures['partnerTotals'][number] & { stages: PartnerFormFigures['partnerTotals'][number]['stages'][number][] }>();
  for (const r of totalRows) {
    let e = entries.get(r.totals_id);
    if (e === undefined) {
      e = {
        totalsId: r.totals_id,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        enteredAt: r.entered_at instanceof Date ? r.entered_at : new Date(r.entered_at),
        stages: [],
      };
      entries.set(r.totals_id, e);
    }
    // The stored form already holds the floor (the 0217 CHECK); it is applied again here, so a figure below 5 can never leave.
    const shown = r.below_floor || r.figure === null ? { figure: null, belowFloor: true } : floorFigure(r.figure);
    e.stages.push({ order: r.stage_order, label: r.stage_label, ...shown });
  }
  return { counts: floorKinds(totals), days, partnerTotals: [...entries.values()] };
}

// ── W15 — the visit purge (Story 12.5b QE5; `-486` R2 C) ─────────────────────────────────────────────────
// ⚠ HERE, ⛔ in `lead-handoff.ts`: the partner-boundary fence's rule (c) holds the transport to writing `marketplace_lead_handoffs` alone.
// The lead-handoff SWEEP calls it (its own pool and tick — TR23), but it is the visit record's write, so it lives with the record.

/** W15's batch per tick (QE5). */
export const PARTNER_FORM_VISIT_PURGE_BATCH = 500;

/**
 * ⭐ W15 (Story 12.5b QE5; `-486` R2 C: *"removed after a number of days"* — the Panel set 90) — DELETE up to `limit` visit records whose
 * own `opened_at` is MORE than `retentionDays` old (`< clock_timestamp() - 90 days`), whoever the member is (QE10 (A) — ⛔ a
 * death-report rule). The W12 MATERIALIZED-CTE shape (⛔ an `IN (subquery LIMIT)` with SKIP LOCKED —
 * [[project_in_subquery_limit_skip_locked_overclaim]]). Returns how many rows it removed. The sweep runs it LAST in the tick, after
 * the claim loop, and a throw ends only W15 (one alarm; the next tick retries) — ⇒ a record goes at most about one minute after its
 * 90th day.
 *
 * DELIBERATE (checklist family 9): every Pariwar's rows in one statement on the sweep's pool (bypasses RLS; the jobs login holds 0217's
 * `twt_service` DELETE grant — G24) — retention is a platform-wide clock and the statement returns a count only. Re-examine under the
 * claim's triggers.
 */
export async function purgeExpiredPartnerFormVisits(
  q: Queryable,
  opts: { readonly retentionDays?: number; readonly limit?: number } = {},
): Promise<number> {
  const { rowCount } = await q.query(
    `WITH old AS MATERIALIZED (
       SELECT visit_id FROM marketplace_partner_form_visits
        WHERE opened_at < clock_timestamp() - $1::double precision * interval '1 day'
        ORDER BY opened_at, visit_id
        FOR UPDATE SKIP LOCKED
        LIMIT $2
     )
     DELETE FROM marketplace_partner_form_visits v USING old WHERE v.visit_id = old.visit_id`,
    [opts.retentionDays ?? PARTNER_FORM_VISIT_RETENTION_DAYS, clampLimit(opts.limit, { default: PARTNER_FORM_VISIT_PURGE_BATCH, cap: 5000 })],
  );
  return rowCount ?? 0;
}
