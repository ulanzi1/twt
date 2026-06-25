// StepUpOtpDeliveryPort — the delivery seam for step-up OTP codes (AC-4, Task 5.2).
//
// Reconciliation R3: §2.2 commits step-up delivery via SMS-DLT-transactional
// through the channel dispatcher, which is **Epic 5 (Story 5.6 SMS provider / 5.9
// step-up delivery)**. epics.md L2235-2248 splits ownership: Story 1.9 owns the
// gating decision + OTP mechanism; Story 5.6/5.9 owns transport. → This port is
// the boundary. Story 1.9 ships a dev/log stub; the real SMS-DLT adapter is a
// later epic. **Do NOT add an SMS provider dependency here.** New D-item → 5.6/5.9.
//
// The middleware owns the gating decision; the channel owns transport — so this
// interface deliberately knows nothing about HTTP, sessions, or gating.

export interface StepUpOtpDelivery {
  /** The plaintext OTP — delivered to the actor, NEVER persisted (only its hash is). */
  readonly code: string;
  /** The actor the code is for. */
  readonly actorId: string;
  /** The operation the step-up gates (for the message body / audit `action_context`). */
  readonly actionContext: string;
  /** Optional destination hint (e.g. masked mobile) the real adapter resolves. */
  readonly destinationHint?: string;
}

export interface StepUpOtpDeliveryPort {
  deliver(delivery: StepUpOtpDelivery): Promise<void>;
  /** Called iff the primary delivery channel throws. Use for alerting / fallback (P29 / D2). */
  onPrimaryDeliveryFailure?: (delivery: StepUpOtpDelivery, error: unknown) => void;
}

/**
 * Dev/log stub (Epic 1). Logs that a code WOULD be sent — and, only when
 * `revealForDev` is true (local dev / tests), the code itself so a developer can
 * complete the flow without SMS. NEVER reveal in production. The real SMS-DLT
 * adapter via the channel dispatcher lands at Story 5.6/5.9.
 */
export function createLogStepUpDelivery(opts: { revealForDev: boolean }): StepUpOtpDeliveryPort {
  return {
    async deliver(delivery: StepUpOtpDelivery): Promise<void> {
      console.info(
        '[step-up-delivery:stub]',
        JSON.stringify({
          actorId: delivery.actorId,
          actionContext: delivery.actionContext,
          note: 'real SMS-DLT delivery is Story 5.6/5.9 — this is a dev stub',
          ...(opts.revealForDev ? { devCode: delivery.code } : {}),
        }),
      );
    },
  };
}
