// WebAuthn passkey provider seam (Story 1.9, AC-2, Dev Note "SimpleWebAuthn v13").
//
// Wraps `@simplewebauthn/server` v13 (post-v11 `WebAuthnCredential` — `id` /
// `publicKey` / `counter`; types from `/server`, NOT the removed `/types` subpath).
// Exposed as an interface so tests inject a fake (the crypto ceremony cannot be
// exercised without a real/emulated authenticator) and assert MY logic — the
// ≤2-device cap, enrollment-ceremony gate, counter-regression rejection, credential
// persistence — while the library's attestation/assertion crypto is its own tested
// concern. `rpID` + `expectedOrigin` are per-environment config, server-side; a
// client-supplied origin is never trusted.

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

/** The persisted form of a passkey (base64url id + public key + the counter). */
export interface StoredCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
}

export interface WebAuthnRegistrationResult {
  verified: boolean;
  credential?: StoredCredential;
}

export interface WebAuthnAuthenticationResult {
  verified: boolean;
  newCounter?: number;
}

export interface WebAuthnProvider {
  generateRegistrationOptions(input: {
    userId: string;
    userName: string;
    existing: readonly StoredCredential[];
  }): Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistration(input: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
  }): Promise<WebAuthnRegistrationResult>;
  generateAuthenticationOptions(input: {
    allow: readonly StoredCredential[];
  }): Promise<PublicKeyCredentialRequestOptionsJSON>;
  verifyAuthentication(input: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: StoredCredential;
  }): Promise<WebAuthnAuthenticationResult>;
}

export interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  expectedOrigin: string;
}

function transportsOf(c: StoredCredential): AuthenticatorTransportFuture[] | undefined {
  return c.transports as AuthenticatorTransportFuture[] | undefined;
}

export function createSimpleWebAuthnProvider(cfg: WebAuthnConfig): WebAuthnProvider {
  return {
    async generateRegistrationOptions(input) {
      return generateRegistrationOptions({
        rpName: cfg.rpName,
        rpID: cfg.rpId,
        userName: input.userName,
        userID: Buffer.from(input.userId, 'utf-8'),
        attestationType: 'none',
        excludeCredentials: input.existing.map((c) => ({
          id: c.id,
          transports: transportsOf(c),
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });
    },

    async verifyRegistration(input) {
      const result = await verifyRegistrationResponse({
        response: input.response,
        expectedChallenge: input.expectedChallenge,
        expectedOrigin: cfg.expectedOrigin,
        expectedRPID: cfg.rpId,
      });
      if (!result.verified || !result.registrationInfo) return { verified: false };
      const { credential } = result.registrationInfo;
      return {
        verified: true,
        credential: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          ...(credential.transports ? { transports: credential.transports } : {}),
        },
      };
    },

    async generateAuthenticationOptions(input) {
      return generateAuthenticationOptions({
        rpID: cfg.rpId,
        userVerification: 'preferred',
        allowCredentials: input.allow.map((c) => ({
          id: c.id,
          transports: transportsOf(c),
        })),
      });
    },

    async verifyAuthentication(input) {
      const result = await verifyAuthenticationResponse({
        response: input.response,
        expectedChallenge: input.expectedChallenge,
        expectedOrigin: cfg.expectedOrigin,
        expectedRPID: cfg.rpId,
        credential: {
          id: input.credential.id,
          publicKey: new Uint8Array(Buffer.from(input.credential.publicKey, 'base64url')),
          counter: input.credential.counter,
          transports: transportsOf(input.credential),
        },
      });
      return {
        verified: result.verified,
        ...(result.authenticationInfo
          ? { newCounter: result.authenticationInfo.newCounter }
          : {}),
      };
    },
  };
}
