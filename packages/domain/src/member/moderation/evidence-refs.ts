// Evidence REFERENCES for a moderation record — Story 10.20 (Task 4; AC4, WS-A).
//
// ── The rule this module exists to make STRUCTURAL ──────────────────────────────────────────────
// `epics.md:3838`: evidence is **"references only, never free text"**. That is not satisfied by a
// `z.string()` with a generous `.max()` — that is free text with extra steps. An evidence entry is
// an IDENTIFIER pointing at a case record that lives somewhere else (a complaint number, an
// investigation number, a helpdesk ticket, a document id, an external order number), and the only
// way to keep prose out is to make prose UNREPRESENTABLE: a bounded `kind`, a restricted `ref`
// charset that excludes whitespace, and a short length bound. A sentence must be REJECTED, never
// truncated — truncation would silently store a prefix of the prose this rule forbids.
//
// ── Why the shape is enforced in the DATABASE too, and what that buys ───────────────────────────
// This module is the domain (defence-in-depth) enforcement point, and migration 0099 mirrors it as
// three separate CHECK constraints. The DB half is not redundant: array-ness and a cardinality cap
// alone do NOT stop a raw-SQL writer, because
// `[{"kind":"anything","ref":"<a full sentence of prose>"}]` satisfies both. The PER-ENTRY SHAPE is
// the half that closes it, and it rides an `IMMUTABLE` SQL function because an inline subquery or
// set-returning function inside a CHECK is a hard Postgres error, not a style preference.
//
// ⭐ THIS IS WHY `evidence_refs` IS NOT TIER-1. A reference is an identifier, not prose about a
// member, so the column is safe to read in a list DTO and safe to keep out of the RTBF scrub. That
// safety is CREATED BY THE CONSTRAINT — if the shape check is ever weakened, the column's PII
// classification has to be revisited in the same change, not afterwards.
//
// ── Contracts mirror (the two-copy pattern, NOT a shared import) ────────────────────────────────
// A value-aligned copy lives in `@twt/contracts`, held in lockstep by a TEST-ONLY drift guard —
// the `review-reason-codes.ts:15-19` / BankCode precedent. ⛔ `@twt/domain` must NEVER import
// `@twt/contracts` (turbo cycle; `errors.ts:41` forbids it by name), and a TYPE-ONLY import is
// worse than a value one: typecheck, lint and the local suite all stay green while consuming
// packages break at module-init ([[project_type_only_import_cycle_trap]]).

import { z } from 'zod';

/**
 * The bounded evidence KINDS. Each names a record that lives in another system and can be looked
 * up; none is a container for narrative. ⛔ Adding a kind is a vocabulary change — it must be added
 * to the contracts copy AND to migration-level SQL in the same change, or the drift guard fails.
 */
export const EVIDENCE_REF_KINDS = [
  'complaint',
  'investigation',
  'helpdesk-ticket',
  'document',
  'external-order',
] as const;
export type EvidenceRefKind = (typeof EVIDENCE_REF_KINDS)[number];

/**
 * Maximum evidence references per record. A cap, not a guess: it bounds the JSONB payload and makes
 * "attach the whole case file as evidence" impossible. Mirrored in the 0099 CHECK.
 */
export const EVIDENCE_REFS_MAX = 10;

/** Maximum `ref` length. Short on purpose — a reference is an identifier, not a description. */
export const EVIDENCE_REF_MAX_LENGTH = 64;

/**
 * The permitted `ref` charset: alphanumeric start, then alphanumerics and the four separators real
 * case-numbering schemes use (`. _ / -`). ⛔ NO WHITESPACE — that single exclusion is what makes a
 * sentence unrepresentable, and it is the load-bearing half of this regex.
 * Mirrored verbatim in 0099's `moderation_evidence_refs_valid`.
 */
export const EVIDENCE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/;

/**
 * One evidence reference. `.strict()` so an unknown third key is REJECTED rather than silently
 * dropped — a dropped key is exactly how free text would sneak back in (`{kind, ref, note}`).
 */
export const evidenceRefSchema = z
  .object({
    kind: z.enum(EVIDENCE_REF_KINDS),
    ref: z
      .string()
      .min(1)
      .max(EVIDENCE_REF_MAX_LENGTH)
      .regex(EVIDENCE_REF_PATTERN, 'evidence ref must be an identifier, not free text'),
  })
  .strict();

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

/** The array as stored: bounded in cardinality, defaulting to empty. */
export const evidenceRefsSchema = z.array(evidenceRefSchema).max(EVIDENCE_REFS_MAX);

/**
 * The SQL identity of the DB-side mirror. Exported so the live-DB spec can assert the function
 * exists and is the one the CHECK calls, rather than trusting the migration was applied.
 */
export const EVIDENCE_REFS_SQL_VALIDATOR = 'moderation_evidence_refs_valid' as const;
