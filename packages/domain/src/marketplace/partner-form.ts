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
  PARTNER_FORM_FIGURE_MAX,
  PARTNER_FORM_STAGE_LABEL_MAX,
  PARTNER_FORM_STAGES_MAX,
} from '../schema/marketplace_partner_form_totals.js';
import {
  ModuleGenesisMissingError,
  ModuleNotPartnerFormError,
  PartnerFormTotalsInvalidError,
  PartnerFormTotalsOverlapError,
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
  input: { readonly pariwarId: PariwarId; readonly moduleId: ModuleId; readonly kind: Exclude<PartnerFormCountKind, 'went_to_partner'> },
): Promise<void> {
  if (!(PARTNER_FORM_COUNT_KINDS as readonly string[]).includes(input.kind)) {
    throw new RangeError(`countPartnerFormEvent: an unknown kind`);
  }
  // Review R2P3: `went_to_partner` is written ONLY by `openPartnerFormVisit`, beside the visit record, in one savepoint — a caller of this
  // function could otherwise bump it with no visit (or twice), and the figure would drift from the records it counts.
  if ((input.kind as string) === 'went_to_partner') {
    throw new RangeError(`countPartnerFormEvent: 'went_to_partner' is counted by openPartnerFormVisit only`);
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
    figure: z.number().int().nonnegative().max(PARTNER_FORM_FIGURE_MAX),
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
 * Review RP2 — the shape the route's PERMANENT audit line hashes for a totals entry: the VALIDATED entry with every figure FLOORED, exactly
 * as it is stored. The hash is an unkeyed SHA-256, so a hash of the raw body let a below-5 figure be recovered by hashing its five
 * candidates; from this shape, every figure 0–4 gives the SAME hash for otherwise identical input (QE12 (A): the number is never kept).
 */
export function partnerFormTotalsAuditShape(t: PartnerFormTotalsInput): Record<string, unknown> {
  return {
    period_start: t.period_start,
    period_end: t.period_end,
    stages: t.stages.map((s) => {
      const f = floorFigure(s.figure);
      return { label: s.label, figure: f.figure, below_floor: f.belowFloor };
    }),
  };
}

/**
 * The period already entered for the offer that shares a day with `[start, end]` and is NOT that same pair (review R2P17), or `null`.
 * Two overlapping periods let a figure below 5 be worked out by subtraction; the SAME pair is a correction and never clashes. The route
 * calls this as a PRE-CHECK (before its audit line — a refusal writes none); {@link recordPartnerFormTotals} repeats it under the
 * offer's advisory lock, which is the check that holds against a concurrent entry.
 */
export async function findOverlappingTotalsPeriod(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  moduleId: ModuleId,
  start: string,
  end: string,
): Promise<{ readonly periodStart: string; readonly periodEnd: string } | null> {
  const r = await client.query<{ period_start: string; period_end: string }>(
    `SELECT period_start::text AS period_start, period_end::text AS period_end
       FROM marketplace_partner_form_totals
      WHERE pariwar_id = $1 AND module_id = $2 AND stage_order = 1
        AND NOT (period_start = $3::date AND period_end = $4::date)
        AND period_start <= $4::date AND period_end >= $3::date
      ORDER BY period_start, period_end LIMIT 1`,
    [pariwarId.toLowerCase(), moduleId.toLowerCase(), start, end],
  );
  const row = r.rows[0];
  return row === undefined ? null : { periodStart: row.period_start, periodEnd: row.period_end };
}

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
 * @throws PartnerFormTotalsOverlapError   a period that shares a day with a DIFFERENT period already entered (→ 409; R2P17).
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
    // R2P17 (from R2D1): ⛔ a period that shares a day with a DIFFERENT period of this offer (the SAME pair is a correction). Two overlapping
    // periods let a figure below 5 be worked out by subtraction (100 − 97 = 3). Serialised per offer, so two concurrent entries cannot both
    // pass the check: a transaction-scoped advisory lock, held until the caller commits; ⛔ a row lock (twt_app holds no UPDATE on modules).
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`partner-form-totals:${moduleId}`]);
    const clash = await findOverlappingTotalsPeriod(client, input.pariwarId, input.moduleId, t.period_start, t.period_end);
    if (clash !== null) throw new PartnerFormTotalsOverlapError(moduleId, clash.periodStart, clash.periodEnd);
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

/**
 * An ALL-DAYS figure (Decision `2026-11-22-490` (1)): a {@link FlooredFigure}, or `withheld` — "not shown", ⛔ a number and ⛔ "fewer
 * than 5" — when a day of that kind is below the floor, so the hidden day can never be worked out by subtraction.
 */
export interface CountTotalFigure extends FlooredFigure {
  readonly withheld: boolean;
}

export interface PartnerFormFigures {
  /** Each kind's total over every day — floored, and withheld when any day of that kind is below 5 (complementary suppression). */
  readonly counts: Readonly<Record<PartnerFormCountKind, CountTotalFigure>>;
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

/** An all-days figure "not shown" (Decision `2026-11-22-490` (1)). */
const WITHHELD_TOTAL: CountTotalFigure = { figure: null, belowFloor: false, withheld: true };

/**
 * ⭐ Review RD1 — complementary suppression (Decision `2026-11-22-490` (1), amending `-489` QE13 (A)). The all-days figure of a kind,
 * beside the per-day figures, gives the sum of the days NOT shown as numbers: the days "fewer than 5", and the days older than the
 * newest {@link PARTNER_FORM_FIGURE_DAYS_SHOWN} the page lists. With one such day, the subtraction gives it exactly (days 5 and 1 → all
 * days 6, a day of 5 shown → the hidden day is 1). So the all-days figure is shown as a number ONLY when EVERY day on which anything was
 * counted for the offer has that kind at 5 or more — every such day, listed or not, a 0 included. Otherwise it is withheld, whatever its
 * own size: the rule reads only which days are below the floor (what the page shows or once showed), ⛔ their hidden values, so the
 * figure's form tells nothing about them ([[feedback_withholding_must_be_uniform]]). With no day counted it is the floored 0.
 * ⚠ Cost, stated in the decision: one day below 5 hides that kind's all-days figure for the offer's whole life.
 */
function countTotals(
  totals: Record<PartnerFormCountKind, number>,
  allDays: readonly Record<PartnerFormCountKind, number>[],
): Record<PartnerFormCountKind, CountTotalFigure> {
  return Object.fromEntries(
    PARTNER_FORM_COUNT_KINDS.map((k) => [
      k,
      allDays.some((d) => d[k] < PARTNER_FORM_FIGURE_FLOOR) ? WITHHELD_TOTAL : { ...floorFigure(totals[k]), withheld: false },
    ]),
  ) as Record<PartnerFormCountKind, CountTotalFigure>;
}

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
  // ⚠ EVERY day (`byDay`), ⛔ only the listed ones: a day past the list would otherwise be the all-days figure minus the listed days.
  return { counts: countTotals(totals, [...byDay.values()]), days, partnerTotals: [...entries.values()] };
}

// ── W15 — the visit purge (Story 12.5b QE5; `-486` R2 C) ─────────────────────────────────────────────────
// ⚠ HERE, ⛔ in `lead-handoff.ts`: the partner-boundary fence's rule (c) holds the transport to writing `marketplace_lead_handoffs` alone.
// The lead-handoff SWEEP calls it (its own pool and tick — TR23), but it is the visit record's write, so it lives with the record.

/** W15's batch per tick (QE5). */
export const PARTNER_FORM_VISIT_PURGE_BATCH = 500;

/**
 * ⭐ W15 (Story 12.5b QE5; `-486` R2 C: *"removed after a number of days"* — the Panel set 90) — DELETE up to `limit` visit records whose
 * own `opened_at` is MORE than `retentionDays` old (`< clock_timestamp() - 90 days`), whoever the member is (QE10 (A) — ⛔ a
 * death-report rule). The batch is picked by a MATERIALIZED CTE and deleted by id (⛔ an `IN (subquery LIMIT)` —
 * [[project_in_subquery_limit_skip_locked_overclaim]]). Returns how many rows it removed. The sweep runs it once a tick in its own scope
 * (Decision `2026-11-22-491`: after the claim loop, or in place of the rest of a tick the `trust_sends` part ended), and a throw ends
 * only W15 (one alarm; the next tick retries) — ⇒ a record goes at most about one minute after its 90th day, bar a persistent fault.
 *
 * ⚠ ⛔ `FOR UPDATE SKIP LOCKED` (review RP1; Decision `2026-11-22-490` (2)): a row lock needs an UPDATE privilege on some column, the
 * jobs login holds SELECT + DELETE only (0217 — the visits are never updated, by anyone), and BYPASSRLS waives policies, ⛔ privileges —
 * so the locking form was 42501 on every production tick. No lock is needed: the only other writer of these rows is erasure's DELETE,
 * and a DELETE that meets a row another transaction is deleting waits for it, then skips it (READ COMMITTED re-check) — never a double
 * count. Proven on the jobs login's own privilege shape by `lead-handoff-commands.spec.ts` (RP1).
 * ⚠ Residual, stated (review R2P12 — NOT closed, and ⛔ proven live): "never an error" holds for ONE row. Both statements delete SEVERAL
 * rows and neither fixes its lock order (this one by the plan's join, erasure's by its index scan), so two transactions that each delete
 * two or more of the SAME member's expired rows in opposite order can deadlock (40P01) — W15 in the minute a member is erased AND their
 * visits cross the 90th day (erasure deletes ALL of a member's visits, so the overlap is every row they have, ⛔ only the expired ones).
 * Postgres aborts ONE of the two: if W15, it alarms (`visit_purge_failed … [code:40P01]`) and the next tick retries; if erasure, its
 * single anonymize transaction rolls back whole and the caller sees the error — ⛔ shown here to retry on its own. A deterministic order needs a row lock, which the jobs login cannot take
 * (the reason for `-490` (2)); a two-connection test would only show Postgres's deadlock detector, ⛔ these statements' order.
 *
 * DELIBERATE (checklist family 9): every Pariwar's rows in one statement on the sweep's pool (bypasses RLS; the jobs login holds 0217's
 * `twt_service` DELETE grant — G24) — retention is a platform-wide clock and the statement returns a count only. ⭐ Re-examine when a
 * second statement is added that deletes across Pariwars on the sweep's pool, or when retention stops being one clock (a per-Pariwar
 * setting) — either makes "every Pariwar's rows in one statement" a tenancy question again.
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
        LIMIT $2
     )
     DELETE FROM marketplace_partner_form_visits v USING old WHERE v.visit_id = old.visit_id`,
    [opts.retentionDays ?? PARTNER_FORM_VISIT_RETENTION_DAYS, clampLimit(opts.limit, { default: PARTNER_FORM_VISIT_PURGE_BATCH, cap: 5000 })],
  );
  return rowCount ?? 0;
}
