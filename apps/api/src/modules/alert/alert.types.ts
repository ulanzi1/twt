// Alert module types — Story 8.1 (Task 8; §4.4 Alert Lifecycle home).
//
// The apps/api-side type surface for the alert lifecycle. The alert STATE MACHINE + the
// cycle-open MINT orchestration are the DOMAIN authority (@twt/domain alert/*); this module is
// the thin service/orchestration layer (architecture §4.4 :4272/:4522) that a future apps/api
// caller (e.g. a manual cycle-open re-trigger, or an admin read surface) reaches through. Story
// 8.1 ships NO live HTTP route — the contribution-loop consumer surfaces (My Pool card, contributor
// list) are Story 8.2/8.3. This file exists so those stories extend a real module, not a bare dir.

import type { alert } from '@twt/domain';

type AlertLifecycleState = alert.AlertLifecycleState;

/** Input to the apps/api cycle-open service — the cycle whose alert to mint + open. */
export interface OpenCycleAlertServiceInput {
  /** The cycle boundary (== cycle_freeze_commits.commit_id == the cycle stream_id). */
  readonly cycleId: string;
  /** Optional freeze-transition audit anchor threaded onto `alerts.audit_id`. */
  readonly auditId?: string;
}

/** Result of the apps/api cycle-open service. */
export interface OpenCycleAlertServiceResult {
  readonly alertId: string;
  /** `false` on the idempotent no-op path (the alert was already minted). */
  readonly minted: boolean;
  readonly state: AlertLifecycleState;
  /** `true` iff the AR-18 SMS-bridge signal was set (a `cycle_open_sms_bridge` declaration was
   *  active for the Pariwar at the cycle-freeze instant). */
  readonly timeCritical: boolean;
}
