// Controllable fake WebAuthnProvider for integration tests (Story 1.9, Task 8).
//
// The real WebAuthn ceremony cannot be exercised without a browser/authenticator,
// so tests inject this fake to drive the SERVICE logic — the ≤2-device cap, the
// enrollment-ceremony gate, counter-regression rejection, credential persistence —
// while SimpleWebAuthn's attestation/assertion crypto stays its own tested concern.

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

import type {
  StoredCredential,
  WebAuthnAuthenticationResult,
  WebAuthnProvider,
  WebAuthnRegistrationResult,
} from '../../src/modules/auth/shared/webauthn.js';

export class FakeWebAuthnProvider implements WebAuthnProvider {
  /** Counter to mint distinct credential ids across registrations. */
  private seq = 0;
  /** The outcome the next verifyRegistration returns (defaults to verified + a fresh cred). */
  public nextRegistration?: WebAuthnRegistrationResult;
  /** The outcome the next verifyAuthentication returns. */
  public nextAuthentication: WebAuthnAuthenticationResult = { verified: true, newCounter: 1 };

  public async generateRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return { challenge: 'reg-challenge' } as unknown as PublicKeyCredentialCreationOptionsJSON;
  }

  public async verifyRegistration(): Promise<WebAuthnRegistrationResult> {
    if (this.nextRegistration) return this.nextRegistration;
    this.seq += 1;
    const cred: StoredCredential = {
      id: `fake-cred-${this.seq}`,
      publicKey: Buffer.from(`pk-${this.seq}`).toString('base64url'),
      counter: 0,
    };
    return { verified: true, credential: cred };
  }

  public async generateAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return { challenge: 'auth-challenge' } as unknown as PublicKeyCredentialRequestOptionsJSON;
  }

  public async verifyAuthentication(): Promise<WebAuthnAuthenticationResult> {
    return this.nextAuthentication;
  }
}
