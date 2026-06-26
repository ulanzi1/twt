// `kyc_transactions` — provider KYC transaction state (Story 3.3a, Task 3).
//
// The DigiLocker provider's per-flow state: the OAuth `state` + PKCE `code_verifier`
// minted at `initiate`, correlated to the callback at `verifyAndPullProfile`, and the
// transaction `status` read by `getStatus`. TENANT-ISOLATED (carries `pariwar_id`):
// mirrors `consent_records` RLS (tenant-isolated, NOT cross-readable). RLS in
// policies/kyc-transactions-rls.ts.
//
// ── Stores NO eAadhaar PII (the load-bearing scope line) ──────────────────────
// This table holds ONLY OAuth/PKCE correlation state (`state`, `code_verifier`,
// `status`, timestamps) — NEVER the pulled eAadhaar profile. `verifyAndPullProfile`
// RETURNS the `KycProfile` to the caller; Story 3.3b persists it under its own PII
// policy. Parking the profile here would duplicate Tier-1 PII outside that policy.
//
// ── code_verifier: secret, plaintext, short-TTL + RLS (a deliberate decision) ─
// PKCE `code_verifier` is a one-time secret with a 15-minute `expires_at` TTL. It is
// stored PLAINTEXT and protected by the short TTL + tenant RLS — hashing adds no
// benefit at this TTL (the token exchange needs the verifier value back, so a one-way
// hash is unusable; and a 15-min window under row-level isolation is the threat model).
// NEVER logged. (Recorded in the story Dev Notes §PII discipline.)
//
// ── TTL is application-enforced ───────────────────────────────────────────────
// `expires_at` is checked in `verifyAndPullProfile`; a transaction past it normalizes
// to `KycError(transaction_expired)`. No DB-level TTL trigger (the daily cleanup of
// expired rows is a 3.3b/ops concern).
//
// ── member_id / provider / intent are plain columns (no FK, no pgEnum) ────────
// `member_id` is polymorphic like consent's `subject_id` (a member-or-pre-member
// applicant; signup mints the id at Story 3.6) → plain uuid, `MemberId` `$type` hint,
// NO FK to the RLS-forced `members`. `provider` + `intent` are `text` (NOT pgEnums):
// the FR-58C swap seam means a new provider must NOT require an `ALTER TYPE` migration,
// and `intent` value-aligns with the contracts `KycIntent` z.enum without a domain
// pgEnum lockstep burden. `status` value-aligns with the contracts `KycTransactionState`.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';

export const kycTransactions = pgTable(
  'kyc_transactions',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    transactionId: uuid('transaction_id').defaultRandom().primaryKey(),

    // The member-or-pre-member-applicant id (polymorphic — no FK; see header). The
    // `MemberId` brand is a type hint only.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The active provider that owns this transaction (the registry key — `digilocker`
    // today). `text` so an FR-58C provider swap needs no `ALTER TYPE`.
    provider: text('provider').notNull(),

    // Why the flow was started — value-aligned with the contracts `KycIntent` z.enum
    // ('signup' | 'relink').
    intent: text('intent').notNull(),

    // The OAuth `state` nonce echoed back at the callback (CSRF defense). UNIQUE +
    // high-entropy → the callback looks the transaction up by it.
    state: text('state').notNull(),

    // The PKCE `code_verifier` — SECRET, plaintext, short-TTL + RLS protected, NEVER
    // logged (see header).
    codeVerifier: text('code_verifier').notNull(),

    // The validated `redirect_uri` used (server-side allowlist, §2.8) — replayed at the
    // token exchange + audit-logged on allowlist change.
    redirectUri: text('redirect_uri').notNull(),

    // The transaction lifecycle state — value-aligned with the contracts
    // `KycTransactionState` ('pending' | 'verified' | 'failed' | 'expired').
    status: text('status').notNull().default('pending'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // Application-enforced TTL (15 min, §PKCE window). Past this → transaction_expired.
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    // The OAuth-callback lookup: resolve the transaction by its `state` within the
    // tenant. UNIQUE (the state nonce is globally unique by construction).
    uniqueIndex('kyc_transactions_state_uq').on(t.state),
    // The tenant-scoped state lookup (matches the RLS predicate column first).
    index('kyc_transactions_pariwar_state_idx').on(t.pariwarId, t.state),
  ],
);

export type KycTransactionRow = typeof kycTransactions.$inferSelect;
export type KycTransactionInsert = typeof kycTransactions.$inferInsert;
