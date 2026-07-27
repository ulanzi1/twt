// Best-effort member notification on reject + reverse — Story 9.8 (Task 6; D9).
//
// Mirrors the Story 9.7 best-effort post-commit `contribution_mismatch` notify seam: on a reject the member
// gets a dignified "we reviewed your contribution and couldn't confirm it — here's how to fix it" push
// (FR-50 "member notified"; Pattern-4 tone, NEVER "invalid/failed"); on a reverse a neutral "a confirmed
// contribution was re-checked" push. BEST-EFFORT: a failed enqueue LOGS and heals, NEVER fails the committed
// verdict (the 8.8/9.7 D6 posture). The dispatch itself is log-only until the channel providers are wired
// ([[project_channels_no_live_dispatch_yet]]); this seam records the INTENT so the member-notify producer
// path exists the moment a live caller lands.

import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';

export type ReconciliationNotifyKind = 'rejected' | 'reversed';

export interface ReconciliationMemberNotifyInput {
  readonly kind: ReconciliationNotifyKind;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly alertId: string;
}

/**
 * Enqueue the member notification (D9) — BEST-EFFORT, fire-and-forget, never throws into the caller. The
 * committed verdict has ALREADY landed; a notify failure must never surface as a failed action. Today this
 * logs the intent (the provider dispatch is unwired — the channels no-live-dispatch posture); it is the
 * single seam a live member-notify producer keys off, keeping the reject/reverse handlers ignorant of the
 * transport.
 */
export function enqueueReconciliationMemberNotify(
  _deps: AppDeps,
  request: FastifyRequest,
  input: ReconciliationMemberNotifyInput,
): void {
  try {
    // Dignified copy selection is the member-app surface's job (the `contribution` i18n namespace); this
    // seam carries only the NON-PII routing keys + the machine `kind` (the tone is chosen at render).
    request.log.info(
      {
        notify: 'reconciliation_member',
        kind: input.kind,
        pariwar_id: input.pariwarId,
        member_id: input.memberId,
        pool_id: input.poolId,
        alert_id: input.alertId,
      },
      'reconciliation-review: best-effort member notify enqueued (log-only until providers wired)',
    );
  } catch (err) {
    // Truly best-effort — even the log path must not throw into the committed action.
    try {
      request.log.warn({ err }, 'reconciliation-review: member-notify enqueue failed (ignored)');
    } catch {
      /* swallow — the verdict is committed; nothing here may fail it */
    }
  }
}
