// Alert module service — Story 8.1 (Task 8; §4.4 Alert Lifecycle home; AC3/AC4).
//
// The THIN apps/api orchestration over the domain cycle-open driver (@twt/domain
// alert.openCycleAlert). It is the apps/api-side call site of the SAME domain orchestration the
// apps/jobs cycle-open worker drives (the shepherd-hook "one definition, both call sites"
// discipline): the primary trigger path is the pg-boss worker, and this service is the entrypoint
// a future manual re-trigger / admin route would use. The reducer + projector + degraded-mode read
// are the domain authority — this layer only threads the request's scope tx through.
//
// Runs on the caller's request-scoped transaction (pariwar scope already set — the
// `/p/:pariwarId/…` ScopeTx). openCycleAlert loads the cycle.frozen payload, resolves the AR-18
// time_critical signal (AC4), and mints + drives the alert draft → frozen → published → live (AC3),
// idempotently (a redelivery no-ops via the deterministic alert_id).

import { alert as alertDomain } from '@twt/domain';

import type { ScopeTx } from '../../types.js';
import type { OpenCycleAlertServiceInput, OpenCycleAlertServiceResult } from './alert.types.js';

/**
 * Mint + open the cycle's alert (the apps/api orchestration entrypoint). Thin: it delegates to the
 * domain `openCycleAlert` on the request's scope-bound client. Idempotent — a second call for an
 * already-minted cycle returns `minted: false` with the current state.
 */
export async function openCycleAlert(
  scopeTx: ScopeTx,
  input: OpenCycleAlertServiceInput,
): Promise<OpenCycleAlertServiceResult> {
  const result = await alertDomain.openCycleAlert(scopeTx.client, {
    cycleId: input.cycleId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });
  return {
    alertId: result.alertId,
    minted: result.minted,
    state: result.state,
    timeCritical: result.timeCritical,
  };
}
