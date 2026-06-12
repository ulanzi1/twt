// `webauthn_credentials` — registered passkey devices (Story 1.9, AC-2).
//
// GLOBAL (carve-out family, R2). ≤2 per user (the epic's "max 2 trusted devices",
// reconciled to ≤2 passkeys per R1) — enforced in the service layer + a per-user
// count check; a partial-unique constraint cannot express "≤2" so the cap is
// service-enforced and audited.
//
// Stores the SimpleWebAuthn **v13** `WebAuthnCredential` fields: `credential_id`
// (the credential id, base64url, UNIQUE), `public_key` (base64url COSE key),
// `counter` (the signature counter — bumped on every auth; a non-increasing
// counter is a cloned-authenticator signal → reject, §Dev Note "SimpleWebAuthn
// v13"). `transports` + `device_label` are optional UX metadata.

import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { UserId } from '../ids/index.js';
import { users } from './users.js';

export const webauthnCredentials = pgTable(
  'webauthn_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // The WebAuthn credential id (base64url). UNIQUE — a credential id is global.
    credentialId: text('credential_id').notNull(),

    // The COSE public key (base64url-encoded bytes).
    publicKey: text('public_key').notNull(),

    // The signature counter. bigint (mode:number) — WebAuthn counters are uint32 but
    // we store wide; bump + monotonicity check on each auth (clone-detection).
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),

    // Optional transports hint (e.g. "usb,nfc") + a human label for the device.
    transports: text('transports'),
    deviceLabel: text('device_label'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('webauthn_credentials_credential_id_uq').on(t.credentialId),
    // The per-user lookup (auth options + the ≤2-device cap count).
    index('webauthn_credentials_user_idx').on(t.userId),
  ],
);

export type WebauthnCredentialRow = typeof webauthnCredentials.$inferSelect;
export type WebauthnCredentialInsert = typeof webauthnCredentials.$inferInsert;
