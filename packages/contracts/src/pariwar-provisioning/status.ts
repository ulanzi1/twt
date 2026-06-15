// packages/contracts/src/pariwar-provisioning/status.ts
//
// Transport contracts for the provisioning-status surface (Story 1.15, AC-1/AC-2):
//   - DeployStatus / DeployStatusView — the deploy-seam (AC-3) status snapshot.
//   - DeployTriggerResponse — the result of POST .../:pariwarId/deploy.
//   - ProvisionedPariwar / ProvisioningStatusList — the GET .../pariwars view:
//     the cross-readable passport row + its derived `/p/<pariwar_id>/` path-scope
//     + its latest deploy status.
//
// REUSES `@twt/contracts/pariwar-passport` `PariwarPassportResponse` — the status
// view embeds the full passport rather than re-projecting its columns.

import { z } from 'zod';

import { Iso8601Datetime, PariwarIdSchema } from '../_common/primitives.js';
import { PariwarPassportResponse } from '../pariwar-passport/index.js';

/**
 * Deploy lifecycle state. v1 fake `DeployTrigger` reports `triggered`; a Pariwar
 * with no deploy yet is `unknown`. `succeeded`/`failed` are reported by the live
 * Dokploy-API client (AC-5) once the deploy resolves.
 */
export const DeployStatus = z.enum(['unknown', 'triggered', 'succeeded', 'failed']);
export type DeployStatus = z.output<typeof DeployStatus>;

/** A single deploy-status snapshot for a Pariwar. */
export const DeployStatusView = z
  .object({
    /** Correlation id for the deploy (the trigger's returned id). */
    deployId: z.string().min(1),
    status: DeployStatus,
    /** When the deploy was triggered. */
    triggeredAt: Iso8601Datetime,
    /** Optional human-readable detail (e.g. the Dokploy message or error). */
    detail: z.string().nullish(),
  })
  .strict();
export type DeployStatusView = z.output<typeof DeployStatusView>;

/** Result of POST /api/v1/provisioning/pariwars/:pariwarId/deploy. */
export const DeployTriggerResponse = z
  .object({
    pariwarId: PariwarIdSchema,
    /** The derived path-scope this Pariwar serves under (`/p/<pariwar_id>/`). */
    pathScope: z.string().min(1),
    deploy: DeployStatusView,
  })
  .strict();
export type DeployTriggerResponse = z.output<typeof DeployTriggerResponse>;

/** One row of the provisioning-status view: passport + path-scope + latest deploy. */
export const ProvisionedPariwar = z
  .object({
    passport: PariwarPassportResponse,
    /** Derived from `pariwar_id` (AC-3 reader): `/p/<pariwar_id>/`. */
    pathScope: z.string().min(1),
    /** Latest deploy status, or null if no deploy has been triggered yet. */
    latestDeploy: DeployStatusView.nullable(),
  })
  .strict();
export type ProvisionedPariwar = z.output<typeof ProvisionedPariwar>;

/** GET /api/v1/provisioning/pariwars — the provisioning-status list. */
export const ProvisioningStatusList = z.array(ProvisionedPariwar);
export type ProvisioningStatusList = z.output<typeof ProvisioningStatusList>;
