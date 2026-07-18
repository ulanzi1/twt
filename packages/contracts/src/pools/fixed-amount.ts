// packages/contracts/src/pools/fixed-amount.ts
//
// Fixed-amount schedule transport DTOs — Story 7.5 (FR-15). The request/response wire shapes for
// the three admin surfaces that fill + read the per-Pariwar effective-dated fixed-amount schedule:
//   · GET  …/admin/pool-fixed-amount            → the current schedule + effective amount (+ emergency records)
//   · POST …/admin/pool-fixed-amount/schedule   → a STANDARD (12-month-notice) change
//   · POST …/admin/pool-fixed-amount/emergency  → an EMERGENCY adjustment override (step-up-gated)
//
// ── Contracts discipline (the r9-voting.ts / cycle-freeze.ts precedent) ──────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So the
// change-type wire enum is RE-DECLARED here, value-aligned with the domain
// `pool_fixed_amount_change_type` pgEnum; a cross-package LOCKSTEP test pins them. ALL objects
// `.strict()`. The emergency panel is submitted as actor IDS ONLY — the server resolves + snapshots
// each R5 display (never the client; a smuggled display is a 400).

import { z } from 'zod';

// ── change-type wire mirror (value-aligned with @twt/domain) ─────────────────────────────────

/** The write-path discriminator (value-aligned with the domain `pool_fixed_amount_change_type`). */
export const PoolFixedAmountChangeType = z.enum(['standard', 'emergency']);
export type PoolFixedAmountChangeType = z.output<typeof PoolFixedAmountChangeType>;

/** Max `documented_reason` length — policy/operational justification (never member-specific). */
export const POOL_FIXED_AMOUNT_REASON_MAX_CHARS = 1000;

/** Min attesting-panel size (review hardening) — a lone actor is not a "panel"; it lets a single
 *  admin be their own sole attester. Value-aligned with @twt/domain's POOL_FIXED_AMOUNT_MIN_PANEL_SIZE. */
export const POOL_FIXED_AMOUNT_PANEL_MIN = 2;

/** Max attesting-panel size (a State-Trustee panel roster; the R9 panel-cap posture). */
export const POOL_FIXED_AMOUNT_PANEL_MAX = 20;

/** Guard-rail ceiling on `fixed_amount` (1 crore INR) — value-aligned with @twt/domain's
 *  MAX_POOL_FIXED_AMOUNT_INR. Re-declared here (contracts cannot import @twt/domain). */
export const POOL_FIXED_AMOUNT_MAX_INR = 10_000_000;

// ── read models (the GET view) ───────────────────────────────────────────────────────────────

/** One resolved attesting-panel member (server-resolved R5 display). */
export const PoolFixedAmountPanelMember = z
  .object({
    actor_id: z.string(),
    actor_display: z.string(),
  })
  .strict();
export type PoolFixedAmountPanelMember = z.output<typeof PoolFixedAmountPanelMember>;

/** The immutable Emergency Adjustment Record (read shape). */
export const PoolFixedAmountEmergencyRecord = z
  .object({
    schedule_version: z.number().int().positive(),
    fixed_amount: z.number().int().positive(),
    panel: z.array(PoolFixedAmountPanelMember),
    attested_by_actor: z.string(),
    attested_display: z.string(),
    documented_reason: z.string(),
    attested_at: z.string().datetime(),
  })
  .strict();
export type PoolFixedAmountEmergencyRecord = z.output<typeof PoolFixedAmountEmergencyRecord>;

/** One schedule entry (read shape). `emergency_record` is present iff change_type='emergency'. */
export const PoolFixedAmountScheduleEntry = z
  .object({
    version: z.number().int().positive(),
    fixed_amount: z.number().int().positive(),
    effective_from: z.string().datetime(),
    effective_until: z.string().datetime().nullable(),
    change_type: PoolFixedAmountChangeType,
    created_by_actor: z.string(),
    created_at: z.string().datetime(),
    emergency_record: PoolFixedAmountEmergencyRecord.nullable(),
  })
  .strict();
export type PoolFixedAmountScheduleEntry = z.output<typeof PoolFixedAmountScheduleEntry>;

/** GET …/admin/pool-fixed-amount — the current schedule + the amount effective NOW. */
export const PoolFixedAmountView = z
  .object({
    pariwar_id: z.string().uuid(),
    /** The amount effective at server `now()` (null when the Pariwar has no effective entry). */
    effective_amount: z.number().int().positive().nullable(),
    /** The version of the entry effective NOW (null when none). */
    effective_version: z.number().int().positive().nullable(),
    /** The schedule page, newest `version` first (capped — see `schedule_has_more`). */
    schedule: z.array(PoolFixedAmountScheduleEntry),
    /** `true` iff older schedule entries exist beyond the returned page. */
    schedule_has_more: z.boolean(),
  })
  .strict();
export type PoolFixedAmountView = z.output<typeof PoolFixedAmountView>;

// ── write requests ────────────────────────────────────────────────────────────────────────────

/** POST …/admin/pool-fixed-amount/schedule — a STANDARD change (server enforces the +365d floor). */
export const PoolFixedAmountScheduleRequest = z
  .object({
    fixed_amount: z.number().int().positive().max(POOL_FIXED_AMOUNT_MAX_INR),
    /** ISO-8601 datetime the change comes into force. The SERVER re-checks >= now()+365d (DB-authoritative). */
    effective_from: z.string().datetime(),
  })
  .strict();
export type PoolFixedAmountScheduleRequest = z.output<typeof PoolFixedAmountScheduleRequest>;

/** POST …/admin/pool-fixed-amount/emergency — an EMERGENCY override (no notice floor; attestation required). */
export const PoolFixedAmountEmergencyRequest = z
  .object({
    fixed_amount: z.number().int().positive().max(POOL_FIXED_AMOUNT_MAX_INR),
    /** ISO-8601; MAY be <= now() (the 365-day floor does NOT apply to emergency). */
    effective_from: z.string().datetime(),
    /** Policy/operational justification ONLY — NEVER member-specific information (D3). */
    documented_reason: z.string().trim().min(1).max(POOL_FIXED_AMOUNT_REASON_MAX_CHARS),
    /** The attesting State-Trustee panel roster — actor IDs only, no duplicates; the server resolves
     *  each R5 display. `.min(POOL_FIXED_AMOUNT_PANEL_MIN)` — a lone actor is not a "panel". */
    panel_actor_ids: z
      .array(z.string().uuid())
      .min(POOL_FIXED_AMOUNT_PANEL_MIN)
      .max(POOL_FIXED_AMOUNT_PANEL_MAX)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'panel_actor_ids must not contain duplicate actor ids',
      }),
  })
  .strict();
export type PoolFixedAmountEmergencyRequest = z.output<typeof PoolFixedAmountEmergencyRequest>;

// ── write responses ─────────────────────────────────────────────────────────────────────────

/** The written schedule entry (standard response = this alone; emergency = this + the record). */
export const PoolFixedAmountScheduleResponse = z
  .object({
    entry: PoolFixedAmountScheduleEntry,
  })
  .strict();
export type PoolFixedAmountScheduleResponse = z.output<typeof PoolFixedAmountScheduleResponse>;

/** The emergency write: the schedule entry + its immutable Emergency Adjustment Record. */
export const PoolFixedAmountEmergencyResponse = z
  .object({
    entry: PoolFixedAmountScheduleEntry,
    emergency_record: PoolFixedAmountEmergencyRecord,
  })
  .strict();
export type PoolFixedAmountEmergencyResponse = z.output<typeof PoolFixedAmountEmergencyResponse>;
