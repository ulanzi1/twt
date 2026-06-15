// Path-scoped deploy-config reader — Story 1.15 (AC-3).
//
// "deploy script reads target-Pariwar configuration from Pariwar-Passport and
// applies path-scoped routing" (epic block 1). This reads a Pariwar's config from
// the Pariwar-Passport (the cross-readable accessor — NO scope needed) and produces
// the path-scoped routing descriptor (the `/p/<pariwar_id>/` prefix per architecture
// §2.5 + AR-25) + the branding-bundle reference the build consumes.
//
// `buildDeployConfig` is a PURE function over a passport row, so it is unit-testable
// against a fixture passport WITHOUT a live Dokploy (the AC-3 proof). `readDeployConfig`
// is the thin DB wrapper the provisioning route uses (covered by integration).

import { passport, type schema } from '@twt/domain';
import type { Db, ids } from '@twt/domain';

import { NotFoundError } from '../../http-errors.js';

type PariwarPassportRow = typeof schema.pariwarPassport.$inferSelect;
type PariwarId = ids.PariwarId;

/** The path-scoped routing + branding descriptor the deploy build consumes. */
export interface DeployConfig {
  readonly pariwarId: string;
  /** Path-scope this Pariwar serves under: `/p/<pariwar_id>/` (§2.5, AR-25). */
  readonly pathScope: string;
  /** Runtime branding subset (logo URL(s) + `#RRGGBB` palette) for the build. */
  readonly branding: PariwarPassportRow['brandingBundle'];
}

/** Compute the `/p/<pariwar_id>/` path-scope for a Pariwar. */
export function buildPathScope(pariwarId: string): string {
  return `/p/${pariwarId}/`;
}

/**
 * PURE: derive the deploy descriptor from a (fresh-from-DB) passport row. Proves
 * "deploy script reads from Pariwar-Passport and applies path-scoped routing"
 * without a live Dokploy — unit-tested against a fixture passport.
 */
export function buildDeployConfig(
  row: Pick<PariwarPassportRow, 'pariwarId' | 'brandingBundle'>,
): DeployConfig {
  return {
    pariwarId: row.pariwarId,
    pathScope: buildPathScope(row.pariwarId),
    branding: row.brandingBundle,
  };
}

/**
 * Read a Pariwar's deploy config from its Passport (cross-readable; no scope). The
 * thin DB wrapper around `buildDeployConfig`. Throws a 404 when no passport exists
 * for `pariwarId` (the deploy target must be a provisioned Pariwar).
 */
export async function readDeployConfig(db: Db, pariwarId: PariwarId): Promise<DeployConfig> {
  const row = await passport.getPariwarPassport(db, pariwarId);
  if (!row) {
    throw new NotFoundError('Pariwar not found', 'provisioning.pariwar_not_found');
  }
  return buildDeployConfig(row);
}
