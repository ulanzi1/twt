// packages/contracts/src/drive-target/drive-target.ts
//
// Per-Pariwar DRIVE TARGET transport DTOs — Story 11b.13 (Task 4; AC2, AC3, AC5).
//
// FOUR endpoints, and the split across them is the POINT rather than a routing preference:
//   · GET  /api/v1/p/{pariwarId}/admin/drive-target             — `pariwar.manage_drive_target`
//   · PUT  /api/v1/p/{pariwarId}/admin/drive-target             — `pariwar.manage_drive_target`
//   · GET  /api/v1/p/{pariwarId}/admin/drive-target/visibility  — `…_visibility` (⛔ super_admin)
//   · PUT  /api/v1/p/{pariwarId}/admin/drive-target/visibility  — `…_visibility` (⛔ super_admin)
//
// ⭐⭐ TWO RESOURCES, ⛔ NOT ONE RESOURCE WITH A ROLE-SHAPED RESPONSE. AC5 requires the reveal
// switches be visible ⛔ only to a `super_admin`. A single `GET /drive-target` returning the flags
// *"when the caller also holds the reveal key"* would put an authority boundary INSIDE A HANDLER —
// precisely the shape `2026-09-04-190` cl.7's two-key split (D1) and two-record split (D2) exist to
// keep OUT of handlers. ⇒ the visibility resource is its own route under its own gate, and a
// `pariwar_admin` simply gets a **403** there. ⛔ Do not merge them "for one round trip".
//
// Governance of record: `2026-09-04-190` **cl.7** (Trustee-ratified) · `-191` **cl.4** (a RUPEE
// figure) · `-189` **cl.3** (*member ≥ public*) · `2026-09-05-201` (the two concurrency controls) ·
// `2026-09-06-203` (the keys, the records).
//
// ⚠ THE MECHANISM IS NOT DEFINED HERE. `packages/domain/src/pool/drive-target-policy.ts` owns every
// rule (rationale, audit anchor, actor/display consistency, the grant checks, `expectedVersion`, the
// close-head-then-insert-head supersession) and `pool/drive-target.ts` owns the bounds. These shapes
// are the WIRE ONLY. ⛔ Do not re-implement a domain rule in a `.refine()`.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only —
// so the ceiling is a LOCAL wire value, value-aligned with the domain's `MAX_DRIVE_TARGET_INR`
// rather than imported from it. ⚠ LOCKSTEP: if it moves in the domain it moves here, and the domain
// is the authority. ALL objects `.strict()`. Timestamps are Iso8601 strings.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ NOTHING PUBLIC OR MEMBER-FACING CARRIES THE TARGET (AC6)
// ══════════════════════════════════════════════════════════════════════════════════════════════
// These are the ADMIN wire shapes and the ONLY ones. `2026-09-04-190` cl.7(b) makes the figure
// invisible to members and the public, and Story 11b.14 consumes it **SERVER-SIDE ONLY** — the value
// reaches a read model, ⛔ never a response body. ⇒ ⛔ do ⛔ not re-export these from any public or
// member contract barrel, and ⛔ do not add the target to a Sahyog Vivran shape.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The DATA-SANITY ceiling on a drive target (10 crore INR) — value-aligned with the domain's
 * `MAX_DRIVE_TARGET_INR` and the `pariwar_drive_target_schedule_target_max` DB CHECK.
 *
 * ⛔ NOT a policy ceiling — no ruling caps what a Pariwar may aim to raise. It exists so a
 * fat-fingered extra zero cannot become a target that makes every drive look permanently stalled.
 */
export const MAX_DRIVE_TARGET_INR = 100_000_000;

/**
 * ⭐⭐ THE TARGET — whole INR, **STRICTLY POSITIVE**.
 *
 * ⛔⛔ `.positive()`, ⛔ NEVER `.nonnegative()`. Story 11b.14's meter is `amountRaisedInr / target`,
 * so a **₹0** target is a **DIVISION BY ZERO** — and it is a DIFFERENT state from *"no target set"*,
 * which is the ABSENCE of a schedule row (`configured: false` below). ⇒ ⛔ do not "relax" this to
 * admit 0, and ⛔ do not treat 0 as unset anywhere on this path.
 *
 * ⚠ THIS IS THE 400 BOUNDARY. Without it the request reaches the domain's `DriveTargetInvalidError`
 * — the masking module's chunk-G2 finding was that an unregistered domain throw surfaces as an
 * opaque 500 on a plain input error. That error IS registered here (see the error-mapping registry),
 * but the contract is still what a caller should actually hit, with a `400`.
 */
export const DriveTargetInr = z.number().int().positive().max(MAX_DRIVE_TARGET_INR);

/**
 * The Pariwar's current drive target — the admin console's read, and the source of the `version`
 * a caller echoes back as `expectedVersion`.
 *
 * ⭐ `configured` IS LOAD-BEARING and ⛔ is not inferrable from `targetInr` alone (the
 * `NomineeBankMaskingScheduleResponse` / `DirectoryPublicationStatusResponse` precedent).
 * `configured: false` means **no schedule row has ever been written**, which Story 11b.14's ruling
 * makes **⛔ NO BAR** — a different fact from a Pariwar that set a small target.
 */
export const DriveTargetResponse = z
  .object({
    /** The target in force, or `null` when none is set. */
    targetInr: DriveTargetInr.nullable(),
    /** Whether a schedule row exists at all. `false` ⇒ never set ⇒ no bar renders anywhere. */
    configured: z.boolean(),
    /** When the current target came into force. Null when unset. */
    effectiveFrom: Iso8601Datetime.nullable(),
    /** The last-changing admin's `users.display_name`, SNAPSHOT at write time. */
    changedByDisplay: z.string().nullable(),
    /** WHY it was last changed. Null when unset. */
    rationale: z.string().nullable(),
    /**
     * The schedule row's version — monotonic per Pariwar. Null when unset.
     *
     * ⭐⭐ THE CONSOLE MUST SEND THIS BACK as `expectedVersion` on the next PUT. `2026-09-05-201`
     * cl.5 REFUSED the cheap alternative — *"drop the version from the UI so it stops implying a
     * guard"* — on the ground that it removes the operator's provenance view to avoid building the
     * guard. ⛔ The version stays on screen, and now it means something.
     */
    version: z.number().int().positive().nullable(),
  })
  .strict();
export type DriveTargetResponse = z.output<typeof DriveTargetResponse>;

/**
 * PUT the Pariwar's drive target.
 *
 * ⛔ THERE IS DELIBERATELY NO `changedByDisplay` FIELD — resolved SERVER-SIDE from
 * `users.display_name` (fail-closed) and ⛔ never accepted from the caller, which would let a
 * browser lie about who made the change. ⛔ AND NO `effectiveFrom` EITHER: a caller-supplied instant
 * would let an operator BACK-DATE a window. `.strict()` makes both unrepresentable on the wire.
 */
/**
 * The REQUIRED "why" on every drive-target governance write.
 *
 * ⚠⛔ **`.trim()` RUNS BEFORE BOTH LENGTH CHECKS, AND THAT WAS INVISIBLE TO GENERATED CLIENTS**
 * (code review Pass 2 / G2). The emitted schema carried a bare `minLength: 1` / `maxLength: 2000`,
 * so a client validating against the published spec ⛔ accepted `"   "` (length 3 ≥ 1) and was then
 * refused with a **400 the spec said could not happen** — and a 2000-character rationale with
 * surrounding whitespace was documented-invalid but server-valid.
 *
 * ⭐ `.regex(/\S/)` is the fix that TRAVELS: it emits as an OpenAPI `pattern`, so the published
 * contract now actually refuses a whitespace-only rationale instead of merely describing that it
 * would. ⛔ It does not make the two `maxLength` readings agree — OpenAPI has no notion of a
 * pre-check transform — which is why the emitted descriptions say so in words.
 */
const GovernanceRationale = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .regex(/\S/, 'rationale must contain at least one non-whitespace character');

export const SetDriveTargetRequest = z
  .object({
    targetInr: DriveTargetInr,
    rationale: GovernanceRationale,
    /**
     * ⭐⭐ `2026-09-05-201` cl.4 — **REQUIRED, and `number | null`. ⛔ NOT `.optional()`.**
     *
     * The `version` the caller last saw. `null` is a REAL value meaning *"I believe this Pariwar
     * has no target yet"*, which makes the FIRST write safe too when two admins configure a fresh
     * Pariwar at once. A mismatch is a **409** with a registered code.
     *
     * ⚠⛔ REQUIRED RATHER THAN OPTIONAL ON PURPOSE. This surface has exactly one caller, the admin
     * console, which already holds and displays the version ⇒ it ⛔ cannot legitimately omit it, and
     * an optional field would repeat the `actorGrants?:` hygiene defect the same review flagged —
     * *"a required property turns an omission into a compile error"*, where an optional one turns it
     * into a silently unguarded write.
     *
     * ⛔⛔ AND THE `Idempotency-Key` HEADER IS EVALUATED **BEFORE** THIS, ⛔ NEVER AFTER. Reversed,
     * a legitimate retry after a timeout carries the STALE version, this fires, and the operator is
     * told *"someone else changed this"* — when the someone was themselves — driving the re-submit
     * that manufactures the very duplicate the key exists to prevent (`-201` cl.2). ⛔ Do not
     * reorder them.
     */
    expectedVersion: z.number().int().positive().nullable(),
  })
  .strict();
export type SetDriveTargetRequest = z.output<typeof SetDriveTargetRequest>;

/**
 * ⭐⭐ THE TWO REVEAL SWITCHES — `2026-09-04-190` cl.7(c).
 *
 * ⛔⛔ **NEVER A SINGLE TRI-STATE, AND NEVER ORDERED LEVELS.** They are INDEPENDENT: a Pariwar may
 * reveal to members without revealing publicly, and that is the ordinary case. Any of the four
 * combinations is expressible on the wire; exactly ONE is refused — see below.
 *
 * ⚠ The refusal is ⛔ NOT expressed as a `.refine()` here, deliberately. `2026-09-04-189` cl.3 is a
 * DOMAIN rule with a DB CHECK behind it (`pariwar_drive_target_visibility_member_ge_public`), and
 * this file's own discipline is *"⛔ do not re-implement a domain rule in a `.refine()`"*. The
 * illegal combination reaches `DriveTargetVisibilityInvalidError`, which IS registered in the
 * error-mapping registry and surfaces as a **422** — ⛔ never an opaque 500.
 */
export const DriveTargetVisibility = z
  .object({
    revealToMembers: z.boolean(),
    revealToPublic: z.boolean(),
  })
  .strict();
export type DriveTargetVisibility = z.output<typeof DriveTargetVisibility>;

/**
 * The Pariwar's reveal posture.
 *
 * ⭐ `configured: false` means no visibility row has ever been written, which resolves **HIDDEN FROM
 * EVERYONE** (cl.7(b)) — FAIL-CLOSED. ⚠⛔ The operator is shown WHICH state they are looking at:
 * *"nobody has chosen this"* is a different fact from *"the Trust decided to hide it"*, and this
 * flag is what tells them apart. ⛔ Never signal absence only by all-null attribution fields.
 */
export const DriveTargetVisibilityResponse = z
  .object({
    visibility: DriveTargetVisibility,
    configured: z.boolean(),
    changedByDisplay: z.string().nullable(),
    rationale: z.string().nullable(),
    updatedAt: Iso8601Datetime.nullable(),
  })
  .strict();
export type DriveTargetVisibilityResponse = z.output<typeof DriveTargetVisibilityResponse>;

/**
 * PUT the Pariwar's reveal switches — the `super_admin`-only disclosure act.
 *
 * ⛔ No `changedByDisplay`, for the same reason as above. ⚠ AND ⛔ NO `targetInr` — a reveal can
 * ⛔ never change what is being revealed, which is D2's guarantee made unrepresentable on the wire
 * rather than merely unenforced.
 */
export const SetDriveTargetVisibilityRequest = z
  .object({
    visibility: DriveTargetVisibility,
    rationale: GovernanceRationale,
  })
  .strict();
export type SetDriveTargetVisibilityRequest = z.output<typeof SetDriveTargetVisibilityRequest>;
