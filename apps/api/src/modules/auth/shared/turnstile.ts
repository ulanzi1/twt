// TurnstileVerifier — the Cloudflare Turnstile verification seam (AC-9, Task 6.3).
//
// The login + passkey-auth entry points call this BEFORE doing expensive crypto so
// **Story 1.13** can wire real Cloudflare Turnstile without touching auth code
// (epics.md L1244). The default is a no-op that always passes — do NOT build the
// Cloudflare/edge integration here. New D-item → 1.13.

export interface TurnstileVerification {
  /** The client-supplied Turnstile token (absent when the seam is no-op). */
  readonly token?: string;
  /** Remote IP for Cloudflare's siteverify (used by the real adapter only). */
  readonly remoteIp?: string;
}

export interface TurnstileVerifier {
  /** Resolves true when the challenge passes. The no-op default always resolves true. */
  verify(input: TurnstileVerification): Promise<boolean>;
}

/** No-op default: every request passes. The real verifier lands at Story 1.13. */
export const noopTurnstileVerifier: TurnstileVerifier = {
  async verify(): Promise<boolean> {
    return true;
  },
};
