// `digilocker_public_certs` — issuer public-certificate cache (Story 3.3a, Task 3).
//
// Architecture §3.8 L2317 commits a "dedicated table (`digilocker_public_certs`)" for
// the eAadhaar signature-verification cert cache, refreshed by a daily pg-boss job
// (§2.8; the cron registration is the 3.3b/ops seam — 3.3a ships only the table +
// `refreshDigiLockerCerts()`). The DigiLocker provider verifies the eAadhaar XMLDSig
// against the active cached cert (AC7).
//
// ── GLOBAL infra table — NOT tenant-scoped (a deliberate, reasoned posture) ───
// The story's Task-3 line says "RLS … (tenant-isolated)" — that applies to
// `kyc_transactions` (which carries `pariwar_id`). The CERT cache has NO tenant
// dimension: a DigiLocker/UIDAI issuer certificate is the SAME public artifact for
// every Pariwar, and the daily refresh job runs with NO `app.pariwar_id` set. A
// tenant-RLS predicate here would (a) make the unscoped refresh job write 0 rows and
// (b) force a redundant per-tenant copy of one public cert. So this is a GLOBAL table
// in the member-auth carve-out family (Story 3.2 R2 precedent: tables written/read
// pre-scope are GLOBAL-access, ENABLE+FORCE RLS with a `USING(true)` policy). RLS in
// policies/digilocker-public-certs-rls.ts. Recorded as a variance in the story.
//
// ── Stores NO PII ─────────────────────────────────────────────────────────────
// Public X.509 certificates only — no member data. `fetched_at` drives the two-window
// staleness budget (the provider compares `now() - fetched_at` against the ADR-0026
// within-budget / hard-limit windows).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural (a collection of cert rows).

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { DigiLockerCertId } from '../ids/index.js';

export const digilockerPublicCerts = pgTable(
  'digilocker_public_certs',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    certId: uuid('cert_id').defaultRandom().primaryKey().$type<DigiLockerCertId>(),

    // The issuer key identifier the signature references — the X.509 Subject Key
    // Identifier (or the cert SHA-256 fingerprint) the verifier looks the cert up by.
    // UNIQUE: one active row per key (refresh upserts on this key).
    keyId: text('key_id').notNull(),

    // The cert Subject DN (diagnostic / ops display). Never a lookup key.
    subject: text('subject'),

    // The PEM-encoded X.509 certificate (the public artifact the verifier trusts).
    pem: text('pem').notNull(),

    // When this cert was last successfully (re)fetched from the issuer. DRIVES the
    // staleness budget: a refresh failure leaves this stale, so `now() - fetched_at`
    // grows past the budget windows → the provider alarms then fails closed (AC7).
    fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // X.509 validity window (parsed from the cert). `not_after` is the hard cert
    // expiry — independent of the cache staleness budget. Nullable `not_before`.
    notBefore: timestamp('not_before', { withTimezone: true, mode: 'date' }),
    notAfter: timestamp('not_after', { withTimezone: true, mode: 'date' }).notNull(),

    // Soft-deactivation for the key-compromise procedure (§2.8): a compromised /
    // rotated cert is marked inactive (NOT deleted) so verification stops trusting it
    // while the row is preserved for audit. The verifier reads only `is_active` rows.
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Refresh upsert + verifier lookup key: at most one row per issuer key id.
    uniqueIndex('digilocker_public_certs_key_id_uq').on(t.keyId),
    // "the currently-trusted certs" scan (the verifier loads active certs).
    index('digilocker_public_certs_active_idx').on(t.isActive),
  ],
);

export type DigiLockerPublicCertRow = typeof digilockerPublicCerts.$inferSelect;
export type DigiLockerPublicCertInsert = typeof digilockerPublicCerts.$inferInsert;
