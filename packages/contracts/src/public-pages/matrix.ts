// packages/contracts/src/public-pages/matrix.ts
//
// The FR-74 Public-vs-Private visibility matrix — Zod schema + a loud-throw
// parser for the consumed contract the Story 1.16b PII scrape CI gate reads
// (deferred-work D8-1.5). This story ships the SCHEMA (fixes the format); Epic
// 11a (Story 11a.1) POPULATES content into it via a trustee-attested PR.
//
// Authority: architecture §2.7 lines 1522-1524 (the Public-vs-Private matrix
// (FR-74) is canonical; new PII fields declare their tier at schema definition);
// Story 11a.1 AC (epics L3586-3620) defines the 4-tier model + the per-surface
// search_indexing_policy; PRD FR-74 (L1030-1040).
//
// Mirrors the throw-on-malformed posture of scripts/friction-budget/lib.ts
// `parseFrictionBudgetYaml` (Story 1.16a): a malformed matrix must fail the gate
// LOUDLY, never be silently skipped. On-pattern with the rest of
// packages/contracts/ (zod schemas + `.strict()` default, §Format patterns).

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// The 4-tier visibility model (Story 11a.1 AC, epics L3596-3600)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four visibility tiers, one of which every renderable field declares:
 *   - public               — Internet-visible without auth.
 *   - authenticated_member — logged-in members only (Story 1.9 admin / 3.2 member auth).
 *   - operator_restricted  — staff/trustees/admins with RBAC scope (Story 1.8).
 *   - never_exposed        — never rendered on any surface (Aadhaar, bank details;
 *                            Tier-1 PII per Story 1.5).
 */
export const VISIBILITY_TIERS = [
  'public',
  'authenticated_member',
  'operator_restricted',
  'never_exposed',
] as const;
export const VisibilityTierSchema = z.enum(VISIBILITY_TIERS);
export type VisibilityTier = z.output<typeof VisibilityTierSchema>;

/** Per-surface search-indexing policy (epics L3614). */
export const SEARCH_INDEXING_POLICIES = ['index', 'noindex', 'conditional'] as const;
export const SearchIndexingPolicySchema = z.enum(SEARCH_INDEXING_POLICIES);
export type SearchIndexingPolicy = z.output<typeof SearchIndexingPolicySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Per-surface / per-field structure
// ─────────────────────────────────────────────────────────────────────────────

/** One renderable field on a surface, declaring exactly one of the 4 tiers. */
export const MatrixFieldSchema = z
  .object({
    id: z.string().min(1),
    tier: VisibilityTierSchema,
    description: z.string().optional(),
  })
  .strict();
export type MatrixField = z.output<typeof MatrixFieldSchema>;

/** One public-page surface: a render target with a tier-classified field set. */
export const MatrixSurfaceSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().optional(),
    search_indexing_policy: SearchIndexingPolicySchema,
    fields: z.array(MatrixFieldSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const field of data.fields) {
      if (seen.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fields'],
          message: `duplicate field id "${field.id}" in surface "${data.id}"`,
        });
      }
      seen.add(field.id);
    }
  });
export type MatrixSurface = z.output<typeof MatrixSurfaceSchema>;

/** The canonical Public-vs-Private matrix (FR-74). */
export const PublicVsPrivateMatrixSchema = z
  .object({
    version: z.number().int().positive(),
    surfaces: z.array(MatrixSurfaceSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const surface of data.surfaces) {
      if (seen.has(surface.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['surfaces'],
          message: `duplicate surface id "${surface.id}" in matrix`,
        });
      }
      seen.add(surface.id);
    }
  });
export type PublicVsPrivateMatrix = z.output<typeof PublicVsPrivateMatrixSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parse + validate (loud throw on malformed; null on empty)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse + structurally validate the matrix YAML.
 *
 *   - blank / whitespace / comments-only document (YAML → null/undefined) →
 *     returns `null`, the "empty matrix" sentinel the gate treats as a no-op
 *     (AC-3: empty/absent matrix → pass). The scaffold ships `version: 1` +
 *     `surfaces: []`, which is a non-empty *structure* with zero surfaces — that
 *     parses to a typed object and is ALSO a no-op (the engine evaluates nothing).
 *   - structurally valid document → the typed matrix.
 *   - non-null but invalid document (unknown tier, missing key, extra key, wrong
 *     type) → THROWS with a precise message (AC-1: a malformed matrix fails the
 *     gate loudly, never silently skipped — mirrors `parseFrictionBudgetYaml`).
 */
export function parsePublicVsPrivateMatrix(raw: string): PublicVsPrivateMatrix | null {
  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `public-vs-private-matrix.yaml: YAML parse error — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // A blank / comments-only document is the empty-matrix no-op, not a malformed
  // one. (`version: 1` + `surfaces: []` is non-null and parses below.)
  if (doc === null || doc === undefined) return null;

  const result = PublicVsPrivateMatrixSchema.safeParse(doc);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`public-vs-private-matrix.yaml: malformed matrix — ${detail}`);
  }
  return result.data;
}
