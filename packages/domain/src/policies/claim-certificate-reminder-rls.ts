// RLS policy declarations for the certificate reminder — Story 6.19d, migrations 0137–0139 (Task 1). ONE file for its
// three tables. SELECT + INSERT + UPDATE on each — every UPDATE leg is narrowed by its migration's column grant (a run's
// end; a reminder's compare-and-set; a letter's delivery).
//
// TENANT-ISOLATED, modelled on `claim-closure-letter-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ nothing here is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from
// `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import {
  claimCertificateReminderLetters,
  claimCertificateReminderRuns,
  claimCertificateReminders,
} from '../schema/claim_certificate_reminder.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

// ── claim_certificate_reminder_runs (0137) ──

export const claimCertificateReminderRunsTenantIsolationSelect = pgPolicy(
  'claim_certificate_reminder_runs_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimCertificateReminderRuns);

export const claimCertificateReminderRunsTenantIsolationInsert = pgPolicy(
  'claim_certificate_reminder_runs_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimCertificateReminderRuns);

export const claimCertificateReminderRunsTenantIsolationUpdate = pgPolicy(
  'claim_certificate_reminder_runs_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimCertificateReminderRuns);

// ── claim_certificate_reminders (0138) ──

export const claimCertificateRemindersTenantIsolationSelect = pgPolicy(
  'claim_certificate_reminders_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimCertificateReminders);

export const claimCertificateRemindersTenantIsolationInsert = pgPolicy(
  'claim_certificate_reminders_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimCertificateReminders);

export const claimCertificateRemindersTenantIsolationUpdate = pgPolicy(
  'claim_certificate_reminders_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimCertificateReminders);

// ── claim_certificate_reminder_letters (0139) ──

export const claimCertificateReminderLettersTenantIsolationSelect = pgPolicy(
  'claim_certificate_reminder_letters_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimCertificateReminderLetters);

export const claimCertificateReminderLettersTenantIsolationInsert = pgPolicy(
  'claim_certificate_reminder_letters_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimCertificateReminderLetters);

export const claimCertificateReminderLettersTenantIsolationUpdate = pgPolicy(
  'claim_certificate_reminder_letters_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimCertificateReminderLetters);
