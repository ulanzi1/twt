// Schema barrel — re-exports per-domain Drizzle table definitions.
//
// At Story 1.2 closure this barrel only re-exports the empty _baseline schema.
// Substantive table definitions land downstream:
//   - Story 1.3 packages/events event-log primitive
//   - Story 1.5 envelope encryption column transformers
//   - Story 1.6 RLS pgPolicy + pariwar_id
//   - Story 1.7 Pariwar-Passport
//   - Story 1.10 audit log hot tier
//   - Story 1.12 pg-boss schema isolation
//   - Story 3.1+ members + lifecycle
//   - Story 4.x rules
//   - Story 7.x pools
//   - Story 9.x reconciliation
export * from './_baseline.js';
export * from './events_log.js';
// Story 1.10 — tamper-evident audit log (hash chain + 6h off-site mirror).
export * from './audit_log_entries.js';
// Story 1.11a — audit-log integrity-verification verdict ledger.
export * from './audit_integrity_checks.js';
// Story 1.11b — append-only acknowledgement ledger for failed integrity checks.
export * from './audit_integrity_acknowledgements.js';
export * from './pariwar_passport.js';
export * from './role_grants.js';
// Story 1.9 — global identity + admin-auth tables (carve-out family, R2).
export * from './users.js';
export * from './admin_credentials.js';
export * from './webauthn_credentials.js';
export * from './recovery_codes.js';
export * from './admin_sessions.js';
export * from './step_up_otps.js';
