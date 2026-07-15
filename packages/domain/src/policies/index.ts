// Barrel for RLS policy declarations + the shared role-name constants.
//
// Consumed via `import { eventsLogTenantIsolationSelect, appRole } from
// '@twt/domain/policies'` (or the top-level `policies.*` namespace re-export in
// packages/domain/src/index.ts). One file per table's policy set; the barrel
// re-exports every policy module + the `_roles.ts` constants. See README.md.

export * from './_roles.js';
export * from './events-log-rls.js';
export * from './audit-log-entries-rls.js';
export * from './audit-integrity-checks-rls.js';
export * from './audit-integrity-acknowledgements-rls.js';
export * from './pariwar-passport-rls.js';
export * from './role-grants-rls.js';
export * from './identity-auth-rls.js';
export * from './idempotency-keys-rls.js';
// Story 2.3 — Niyamavali rule registry tenant-isolation policies.
export * from './clause-versions-rls.js';
export * from './niyamavali-amendments-rls.js';
// Story 2.4 — Niyamavali draft-store tenant-isolation policies.
export * from './clause-drafts-rls.js';
// Story 2.6 — T&C registry tenant-isolation policies (versions + pinned-clauses).
export * from './terms-and-conditions-versions-rls.js';
export * from './terms-and-conditions-pinned-clauses-rls.js';
// Story 2.7 — consent registry tenant-isolation policies (NOT cross-readable).
export * from './consent-records-rls.js';
// Story 3.1 — member lifecycle anchor tenant-isolation policies (NOT cross-readable).
export * from './members-rls.js';
// Story 3.2 — member mobile-identity tenant-isolation + the GLOBAL member-identity/
// auth carve-out (OTP / refresh-token / trusted-device / step-up-elevation /
// signup-continuation). Mirrors members-rls + identity-auth-rls respectively.
export * from './member-identities-rls.js';
export * from './member-auth-rls.js';
// Story 3.3a — KYC provider substrate policies. `digilocker_public_certs` GLOBAL access
// (member-auth carve-out posture — public certs, no tenant dimension); `kyc_transactions`
// tenant-isolated (mirror consent-records).
export * from './digilocker-public-certs-rls.js';
export * from './kyc-transactions-rls.js';
// Story 3.3b — member_kyc_profiles tenant-isolation (mirror member-identities-rls).
export * from './member-kyc-profiles-rls.js';
// Story 3.4 — member_nominees tenant-isolation (mirror member-kyc-profiles-rls).
export * from './member-nominees-rls.js';
// Story 3.5 — member_medical_disclosures tenant-isolation (mirror member-nominees-rls).
export * from './member-medical-disclosures-rls.js';
// Story 3.9 — Life Events history tables tenant-isolation (mirror member-medical-disclosures-rls).
export * from './member-addresses-rls.js';
export * from './member-postings-rls.js';
// Story 3.10 — member_withdrawals tenant-isolation (mirror member-addresses-rls; GRANTs UPDATE too).
export * from './member-withdrawals-rls.js';
// Story 3.11 — data_exports tenant-isolation (mirror member-withdrawals-rls; GRANTs UPDATE too).
export * from './data-exports-rls.js';
// Story 4.7 — member_search_projection tenant-isolation (mirror members-rls; the AR-65 admin-search
// compound read model, projector-exclusive write + a write-rejection trigger like members.state).
export * from './member-search-projection-rls.js';
// Story 4.8 — the FR-12A validity cache tenant-isolation (mirror members-rls). `member_validity_cache`
// holds the full per-member payload keyed by pariwar_id; `cohort_invalidation_epochs` the per-cohort
// invalidation counter. Both tenant-isolated exactly like the data they cache (NOT cross-readable).
export * from './member-validity-cache-rls.js';
export * from './cohort-invalidation-epochs-rls.js';
// Story 6.1 — claim case lifecycle anchor tenant-isolation policies (NOT cross-readable; mirror members-rls).
export * from './claims-rls.js';
// Story 6.4 — ICP substrate (intake_attempts + convergence_overrides) tenant-isolation policies
// (NOT cross-readable; mirror claims-rls). No write-rejection trigger — attempt_status is a plain column.
export * from './intake-attempts-rls.js';
// Story 6.6 — peer-mesh tables (claim_peer_mesh_selections + claim_peer_mesh_pings) tenant-isolation
// policies (NOT cross-readable; mirror claims-rls). No write-rejection trigger — outcome is a plain column.
export * from './claim-peer-mesh-selections-rls.js';
// Story 6.7 — ground-inspection tables (claim_ground_inspections + claim_ground_inspection_photos)
// tenant-isolation policies (NOT cross-readable; mirror claims-rls). No write-rejection trigger —
// status/structured_findings are plain columns; the claim's lifecycle stays on claims.current_state.
export * from './claim-ground-inspections-rls.js';
// Story 6.8 — claim_nominee_bank_accounts tenant-isolation policies (NOT cross-readable; mirror
// claims-rls). No write-rejection trigger — bank collection is an annotation, not a state cache.
export * from './claim-nominee-bank-rls.js';
// Story 6.11 — claim_verifier_decisions tenant-isolation policies (NOT cross-readable; mirror claims-rls).
// No write-rejection trigger — the decision row is the DECISION-METADATA authority, not a state cache
// (claim state stays on claims.current_state, derived from the claim.verifier_* events).
export * from './claim-verifier-decisions-rls.js';
// Story 6.12 — claim_shepherd_assignments tenant-isolation policies (NOT cross-readable; mirror
// claims-rls). No write-rejection trigger — the assignment row is the ASSIGNMENT-METADATA authority, not
// a state cache (claim state stays on claims.current_state, derived from the claim.shepherd_assigned event).
export * from './claim-shepherd-assignments-rls.js';
// Story 6.13 — claim_state_trustee_decisions + cycle_freeze_commits tenant-isolation policies (NOT
// cross-readable; mirror claims-rls). No write-rejection trigger — the decision/commit rows are the
// DECISION-METADATA authorities, not state caches (claim state stays on claims.current_state, derived from
// the paired claim.state_trustee_* / claim.approved / claim.verifier_* events).
export * from './claim-state-trustee-decisions-rls.js';
export * from './cycle-freeze-commits-rls.js';
// Story 6.14 — claim_r9_voting_sessions + claim_r9_votes tenant-isolation policies (NOT cross-readable;
// mirror claims-rls). No write-rejection trigger — the session/vote rows are the panel/decision-metadata
// authorities, not state caches (claim state stays on claims.current_state, derived from the paired
// claim.r9_outcome event).
export * from './claim-r9-voting-sessions-rls.js';
export * from './claim-r9-votes-rls.js';
// Story 6.15 — claim_concealment_assessments tenant-isolation policies (NOT cross-readable; mirror
// claims-rls; SYMMETRIC — no 6.13 asymmetry). No write-rejection trigger — the assessment row is a review
// annotation / read model, not a state cache (claim state stays on claims.current_state; the paired
// claim.concealment_assessed event is an identity annotation).
export * from './claim-concealment-assessments-rls.js';
