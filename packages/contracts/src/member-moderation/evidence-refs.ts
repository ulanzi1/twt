// Evidence REFERENCES, wire copy — Story 10.20 (Task 5; AC4).
//
// ── ⛔ Why this is a COPY and not an import ──────────────────────────────────────────────────────
// The dependency direction is one-way: `@twt/contracts` depends on `@twt/domain`, NEVER the
// reverse (`packages/domain/src/errors.ts:41` states it by name — a domain→contracts import is a
// turbo cycle). But a contracts SOURCE file must also never import a pg-touching `@twt/domain`
// namespace, because contracts is bundled into the React Native Metro build and that would drag
// `pg` in with it ([[project_contracts_domain_bundle_boundary]]).
//
// ⇒ the canonical schema lives in `@twt/domain`
// (`src/member/moderation/evidence-refs.ts` — the defence-in-depth enforcement point), this file is
// a VALUE-ALIGNED copy that produces the 400 at the transport boundary and drives the admin
// control, and the two are held in lockstep by a TEST-ONLY drift guard
// (`packages/contracts/tests/member-moderation-evidence-refs.test.ts`). That is the shape already
// used for the reconciliation review reason codes and the BankCode / verifier pair — reused
// verbatim rather than inventing a third arrangement.
//
// ⚠ A TEST-only cross-package import is safe (it never reaches a bundle); a SOURCE one is not.
//
// ── The rule the shape enforces ─────────────────────────────────────────────────────────────────
// `epics.md:3838`: evidence is "references only, never free text". A `z.string()` with a generous
// `.max()` is free text with extra steps. An entry is an IDENTIFIER pointing at a record that lives
// elsewhere, so prose is made UNREPRESENTABLE: a bounded `kind`, a charset that EXCLUDES
// WHITESPACE, and a short length bound. A sentence is REJECTED, never truncated — truncating would
// silently store a prefix of the prose the rule exists to keep out.

import { z } from 'zod';

/** The bounded evidence kinds. ⛔ Adding one is a change to the domain copy AND migration 0099. */
export const EVIDENCE_REF_KINDS = [
  'complaint',
  'investigation',
  'helpdesk-ticket',
  'document',
  'external-order',
] as const;
export type EvidenceRefKind = (typeof EVIDENCE_REF_KINDS)[number];

/** Maximum references per record — mirrors the 0099 cap CHECK and the domain schema. */
export const EVIDENCE_REFS_MAX = 10;

/** Maximum `ref` length. Short on purpose — a reference is an identifier, not a description. */
export const EVIDENCE_REF_MAX_LENGTH = 64;

/**
 * The permitted `ref` charset: alphanumeric start, then alphanumerics and the four separators real
 * case-numbering schemes use. ⛔ NO WHITESPACE — that single exclusion is the load-bearing half.
 */
export const EVIDENCE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/;

/** One evidence reference. `.strict()` — a smuggled third key (`{kind, ref, note}`) is rejected. */
export const EvidenceRefDto = z
  .object({
    kind: z.enum(EVIDENCE_REF_KINDS),
    ref: z
      .string()
      .min(1)
      .max(EVIDENCE_REF_MAX_LENGTH)
      .regex(EVIDENCE_REF_PATTERN, 'evidence ref must be an identifier, not free text'),
  })
  .strict();
export type EvidenceRefDto = z.output<typeof EvidenceRefDto>;

/** The array as carried on the wire: bounded in cardinality, optional (absent ⇒ no references). */
export const EvidenceRefsDto = z.array(EvidenceRefDto).max(EVIDENCE_REFS_MAX);
