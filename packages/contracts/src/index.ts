// packages/contracts/src/index.ts
//
// Transport-contract source-of-truth per architecture §1.3 + §3.1 + AR-4 + AR-38.
// Per-domain endpoint contracts live in per-domain sub-directories
// (members/, claims/, pools/, alerts/, ...); each is owned by its per-Epic
// landing Story.

export * from './_common/index.js';
export * from './audit/index.js';
export * from './auth/index.js';
export * from './pariwar-passport/index.js';
export * from './pariwar-provisioning/index.js';
// Story 1.16b — FR-74 Public-vs-Private matrix schema + the PII scrape
// verification engine (consumed by the future tests/integration/public-pages/
// scrape-test.spec.ts, D13-1.2). Components/schemas only; no OpenAPI path.
export * from './public-pages/index.js';
// Story 1.16d — FR-7 / FR-100 Hook 1 forward-compat `BenefitMechanism` z.enum
// (the discriminator Epic 2's Story 2.3 clause_versions column imports; the
// enum the repo-global benefit-mechanism CI gate cross-checks). Plain z.enum;
// no OpenAPI path (openapi/v1.yaml stays byte-identical).
export * from './rules/index.js';
// Story 2.6 — T&C version-registry transport contracts (TcVersionResponse,
// CreateTcVersionRequest, ApproveTcVersionRequest, TcLegalReviewStatusSchema). The
// FIRST T&C endpoints — the DTOs register via `.openapi()` so openapi/v1.yaml changes.
export * from './terms-and-conditions/index.js';
// Story 2.7 — consent-registry transport DTOs (ConsentRecordResponse,
// RecordConsentRequest, RevokeConsentRequest, ConsentTypeSchema,
// ConsentGrantedViaSchema) for Epic 3/6 to import + the dual lockstep guard. NO
// endpoint in this story → NO `.openapi()` registration, openapi/v1.yaml unchanged.
export * from './consent/index.js';
// Story 3.2 — member mobile+OTP auth transport contracts (the first members/ DTOs).
// apps/api serves these member routes now → they register real `paths` in emit-openapi.ts.
export * from './members/index.js';
// Story 3.3a — DigiLocker KYC provider-abstraction contracts (the FROZEN seam:
// `KycProvider` port + `KycProfile` + `KycError` + `KycProviderError`). AR-43 /
// architectural-freeze row 13 — a future KYC-provider swap is a single-module change.
// NO `.openapi()` registration in 3.3a (no HTTP endpoint yet → openapi/v1.yaml
// byte-identical); the signup KYC surface DTOs land in Story 3.3b.
export * from './kyc/index.js';
// Story 3.4 — signup nominee-declaration transport DTOs (declare + status). The third
// signup-wizard SURFACE; registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './nominee/index.js';
// Story 3.5 — signup medical-disclosure transport DTOs (submit + status + ima-list). The fourth
// signup-wizard SURFACE; registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './medical/index.js';
// Story 3.6a — member-facing T&C read/accept transport DTOs (the signup wizard's `tc` step). The
// MEMBER surface (distinct from the trustee terms-and-conditions/ authoring DTOs); registers real
// OpenAPI components + paths (see emit-openapi.ts).
export * from './terms/index.js';
// Story 3.6b — signup ₹110 Vyawastha Shulk transport DTOs (intent + confirm + status). The FINAL
// signup-wizard SURFACE (closes the loop); registers real OpenAPI components + paths (see emit-openapi.ts).
export * from './payments/index.js';
// Story 3.8 — the renewal-reminder nudge SEAM (FR-23). The producing half (Epic 3 schedules); Epic 5's
// dispatcher subscribes later. Internal queue seam — NO `.openapi()` path, openapi/v1.yaml unchanged.
export * from './notifications/index.js';
// Story 3.9 — Life Events panel transport DTOs (address + posting update requests + the shared
// summary response). Nominee + medical Life Events routes REUSE the existing declare/submit
// contracts. Match the nominee/medical openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './life-events/index.js';
// Story 3.10 — voluntary-withdrawal confirm request + status response + the bounded reason enum.
// Match the nominee/medical/life-events openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './withdrawal/index.js';
// Story 3.11 — DPDPA data-export request/status DTOs + the ZIP section-shape schemas (validated in the
// job before zipping). Same openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './data-export/index.js';
// Story 3.12 — RTBF (Right-To-Be-Forgotten) anonymization confirm request + status response.
// Same openapi posture — NO `.openapi()`, openapi/v1.yaml unchanged.
export * from './rtbf/index.js';
export * from './rbac/index.js';
// Story 5.1 — the structured `alert` channel-primitive payload (Alert discriminated union + AlertCategory
// + ProvenanceRefs). Consumed by @twt/channels' central dispatcher; the eventual target shape the FR-23
// nudge seam maps into. Internal queue seam — NO `.openapi()` path, openapi/v1.yaml stays byte-identical
// (same posture as notifications/ + consent/).
export * from './alerts/index.js';

// Story 5.2 — the deep-link URI grammar (per-category target derived from alert_category + payload_data).
// Populated into PUSH payloads by @twt/channels' renderer; the mobile/public/admin landing is a later
// story. Internal render seam — NO `.openapi()` path, openapi/v1.yaml stays byte-identical.
export * from './deep-links/index.js';

// Story 5.2 — push device-token registration DTOs (member + admin endpoints). HTTP endpoints → these DO
// register in openapi/v1.yaml (the two new routes are the EXPECTED diff for this story).
export * from './device-tokens/index.js';

// Story 5.3 — per-Pariwar WhatsApp Business config DTOs (trustee admin endpoints). HTTP endpoints → these
// DO register in openapi/v1.yaml (the config + template routes are the EXPECTED diff for this story; the
// internal Alert / WA template-render seam still must NOT appear).
export * from './channel-config/index.js';

// Story 5.4 — member WhatsApp opt-in DTOs (member-session-gated opt-in surface) + the wa_opt_in_state
// lockstep. HTTP endpoints → these DO register in openapi/v1.yaml (the member opt-in routes are the
// EXPECTED diff for this story).
export * from './wa-opt-in/index.js';

// Story 5.5 — member Telegram opt-in DTOs (member-session-gated opt-in surface) + the telegram_opt_in_state
// lockstep. HTTP endpoints → these DO register in openapi/v1.yaml (the member opt-in routes are the
// EXPECTED diff for this story).
export * from './telegram-opt-in/index.js';

// Story 5.8 — per-Pariwar degraded-mode declaration DTOs (trustee declare/revoke/read admin endpoints). HTTP
// endpoints → these DO register in openapi/v1.yaml (the declare/revoke/active routes are the EXPECTED diff
// for this story).
export * from './degraded-mode/index.js';

// Story 7.10 — member pool-onboarding-tutorial outcome DTO (member-session-gated completion/skip event).
// HTTP endpoint → registers in openapi/v1.yaml (the member outcome route is the EXPECTED diff for this story).
export * from './pool-onboarding/index.js';

// Story 6.2 — member-app claim-filing DTOs (handover-trust OTP send/verify + intake). The FIRST
// live claim-subsystem transport surface. HTTP endpoints → these DO register in openapi/v1.yaml
// (the member claim routes are the EXPECTED diff for this story).
export * from './claims/index.js';

// Story 6.13 — the FIRST pools contract: the injectable pool-spawn TRIGGER SEAM payload
// (PoolSpawnTriggerPayload). The cycle-freeze commit fires it POST-COMMIT into a v1 stub port; Epic 7's
// Pool Engine is the live consumer. Internal seam — NO `.openapi()` path, openapi/v1.yaml stays
// byte-identical (same posture as notifications/ + alerts/).
export * from './pools/index.js';

// Story 8.2 — the FIRST contributions contract: the My Pool home-screen card READ-MODEL response
// shape (ActiveContributionCardResponse). Presentation only — reads existing event-derived state
// (alerts, pool assignment, confirmed-contribution count); models NO write/intent lifecycle (9.x).
// A member-session-gated read route → registers in openapi/v1.yaml like the member-home lock-in read.
export * from './contributions/index.js';

export const CONTRACTS_API_VERSION = 'v1';

/**
 * Marker symbol used by the contract-↔-domain type-assignability test
 * (tests/type-assignability.test.ts) to assert this package is the
 * canonical contract source-of-truth (defense against Top-10 anti-pattern #2
 * — type-shadowing via hand-written dto.ts / *.types.ts).
 */
export const __substrateOnly = Symbol.for('@twt/contracts:substrate-only');
