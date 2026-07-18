// Member-notification scaffolding hook — Story 7.5 (Task 5; AC1/AC3d/AC4).
//
// On a successful fixed-amount change (standard OR emergency) the handler fires this hook. At 7.5
// it is a SEAM ONLY — a no-op/console placeholder, EXACTLY the `NiyamavaliAmendedHook` /
// `consoleNiyamavaliAmendedHook` precedent (rules/notification-hook.ts). Epic 5 wires the real
// push fan-out (resolving affected members, then delivering); channels `dispatch()` still has NO
// live call site ([[project_channels_no_live_dispatch_yet]]). 7.5 ships the seam + the call site,
// NOT the delivery.
//
// ⚠ This MUST NOT resolve scope → members or send anything (seam-clean — that is Epic 5 + Epic 4).
// It carries ONLY the change coordinates. "Immediate vs. queued" is a `cadence` FLAG on the payload
// (standard = 'queued', emergency = 'immediate'); BOTH are inert in v1. Never throws into the write
// path (a scaffolding hook must never take down the fixed-amount change).

/** The event a successful fixed-amount change emits (the Epic-5 push fan-out input). NON-PII. */
export interface PoolFixedAmountChangedEvent {
  /** The tenant whose fixed amount changed. */
  readonly pariwarId: string;
  /** The newly-written schedule entry's monotonic version. */
  readonly version: number;
  /** The new amount (whole INR). */
  readonly fixedAmount: number;
  /** When the change comes into force (ISO-8601). */
  readonly effectiveFrom: string;
  /** The write-path discriminator — makes an emergency change unmistakable downstream. */
  readonly changeType: 'standard' | 'emergency';
  /**
   * The notification cadence FLAG (v1 inert): standard changes queue behind the standard cadence;
   * an emergency override bypasses it for immediate notification (AC3d/AC4). Both scaffold-only.
   */
  readonly cadence: 'queued' | 'immediate';
}

/** The injectable hook seam (a sibling of `NiyamavaliAmendedHook`). Never throws into the write path. */
export type PoolFixedAmountChangedHook = (event: PoolFixedAmountChangedEvent) => void;

/**
 * The default inert hook: one structured `console.info` line (the `consoleNiyamavaliAmendedHook`
 * analogue). Used in production/dev wiring until Epic 5 replaces it; tests inject a capturing fake.
 * Never throws.
 */
export const consolePoolFixedAmountChangedHook: PoolFixedAmountChangedHook = (event) => {
  try {
    console.info(
      '[pool-fixed-amount-changed]',
      JSON.stringify({
        pariwarId: event.pariwarId,
        version: event.version,
        fixedAmount: event.fixedAmount,
        effectiveFrom: event.effectiveFrom,
        changeType: event.changeType,
        cadence: event.cadence,
      }),
    );
  } catch {
    // A scaffolding hook must never take down the fixed-amount change path.
  }
};
