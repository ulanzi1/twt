// packages/contracts/scripts/emit-openapi.ts
//
// Build-time OpenAPI 3.1 spec emission from the Zod schemas in packages/contracts/.
// Per architecture §3.2 line 1862-1865: "Generator output committed to the
// repository (openapi/v1.yaml or equivalent). CI verifies that re-running the
// generator produces byte-identical output."
//
// At Story 1.4 the only registered endpoint is the toy _common/health contract;
// substantive endpoints land at Story 1.9+ when apps/api/ substantively populates.
// The script's job at Story 1.4 is to STRUCTURALLY PROVE the pipeline.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import * as yaml from 'yaml';

// Must run before schema modules are imported so .openapi() is available on
// all Zod schema instances. Dynamic imports below enforce this ordering
// explicitly — static imports are hoisted above all statements in ESM and
// would execute before this line.
extendZodWithOpenApi(z);

// Dynamic imports so extendZodWithOpenApi runs before schema construction.
const { HealthResponse } = await import('../src/_common/health.js');
const { ErrorResponse } = await import('../src/_common/errors.js');
// Story 1.7 — Pariwar-Passport transport contracts. Register components/schemas
// only (no paths): apps/api routes land at Story 1.9+, so a `paths` entry would
// be speculative. Schemas are safe to publish as reusable components now.
const { BrandingBundle } = await import('../src/pariwar-passport/branding-bundle.js');
const { PariwarPassportResponse } = await import('../src/pariwar-passport/passport.js');
// Story 1.8 — RBAC transport contracts. Register components/schemas only (no
// paths): apps/api role-admin routes land at Story 1.9+, so a `paths` entry would
// be speculative (mirror Story 1.7). Schemas are safe to publish as reusable
// components now.
const { ScopeDimensionSchema } = await import('../src/rbac/scope.js');
const { PermissionKeySchema, PermissionCatalogSchema } = await import(
  '../src/rbac/permissions.js'
);
const { RoleBundleSchema, RoleGrantSchema } = await import('../src/rbac/roles.js');
// Story 1.10 — audit-log transport contract. Component/schema only (no paths):
// the tenant-scoped audit READ endpoints land at Story 1.11b (mirror 1.7/1.8).
// Story 1.11a — the on-demand integrity-verification request + verdict-result.
// This DOES register a real `path` (POST /api/v1/audit/verify-integrity) because
// apps/api serves it now; the verdict READ surface is still Story 1.11b.
// Story 1.11b — the verdict READ surface (history list) + the acknowledgement
// request/result shapes the trustee UI consumes.
const {
  AuditLogEntryContract,
  AuditIntegrityCheckRequest,
  AuditIntegrityCheckResult,
  AuditIntegrityCheckListItem,
  AuditIntegrityCheckList,
  AuditIntegrityAcknowledgeRequest,
  AuditIntegrityAcknowledgement,
} = await import('../src/audit/index.js');
// Story 1.9 — admin-auth transport contracts. THE FIRST REAL `paths` (Stories
// 1.4/1.7/1.8 registered components-only). apps/api now serves these routes.
const {
  LoginRequest,
  LoginResponse,
  PasskeyRegisterOptionsRequest,
  PasskeyRegisterVerifyRequest,
  PasskeyRegisterVerifyResponse,
  PasskeyAuthOptionsRequest,
  PasskeyAuthVerifyRequest,
  PasskeyAuthVerifyResponse,
  RecoveryConsumeRequest,
  RecoveryConsumeResponse,
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
  PasswordResetConsumeRequest,
  PasswordResetConsumeResponse,
  StepUpRequestRequest,
  StepUpRequestResponse,
  StepUpVerifyRequest,
  StepUpVerifyResponse,
  // Story 1.11b — session introspection (DD-6): the global-scope grant read the
  // admin SPA gates nav + routes on.
  SessionResponse,
} = await import('../src/auth/index.js');
// Story 1.15 — multi-Pariwar provisioning transport contracts. THE FIRST
// global-scoped, permission-gated WRITE surface; apps/api serves these routes now,
// so they register real `paths` (mirror 1.9/1.11a). REUSES the 1.7 passport +
// branding components by $ref (PariwarPassportResponse / BrandingBundle).
const {
  AddPariwarRequest,
  DeployStatusView,
  DeployTriggerResponse,
  ProvisionedPariwar,
  ProvisioningStatusList,
} = await import('../src/pariwar-provisioning/index.js');
// Story 2.4 — Niyamavali amendment-workflow contracts. THE FIRST niyamavali
// endpoints (the 2.3 clause DTOs were components-free), so apps/api serves these
// tenant-scoped routes now and they register real `paths` + components.
const {
  ClauseVersionResponse,
  NiyamavaliAmendmentResponse,
  ClauseDraftResponse,
  ClauseDraftStatusSchema,
  CreateDraftBody,
  UpdateClauseDraftRequest,
  ToneReviewSignoffRequest,
  DiffPreviewResponse,
  PublishClauseResponse,
} = await import('../src/rules/index.js');
// Story 2.6 — T&C version-registry contracts. THE FIRST T&C endpoints (trustee
// create + approve), so apps/api serves these tenant-scoped routes now and they
// register real `paths` + components (mirror Story 2.4).
const { TcVersionResponse, CreateTcVersionRequest, ApproveTcVersionRequest } = await import(
  '../src/terms-and-conditions/index.js'
);
// Story 3.2 — member mobile+OTP auth contracts. THE FIRST members/ endpoints
// (mobile login OTP → session, refresh, multi-Pariwar select, member step-up), so
// apps/api serves these routes now and they register real `paths` + components.
const {
  MemberOtpRequestRequest,
  MemberOtpRequestResponse,
  MemberOtpVerifyRequest,
  MemberOtpVerifyResponse,
  MemberFullSession,
  MemberSelectPariwarRequest,
  MemberTokenRefreshRequest,
  MemberStepUpRequestRequest,
  MemberStepUpRequestResponse,
  MemberStepUpVerifyRequest,
  MemberStepUpVerifyResponse,
  // Story 3.6a — first-signup member-creation request (response reuses MemberFullSession).
  MemberSignupCreateRequest,
} = await import('../src/members/index.js');
// Story 3.6a — the member-facing T&C read/accept DTOs (the signup wizard's `tc` step; the SECOND
// consent-registry consumer). The MEMBER surface, distinct from the trustee authoring contracts.
const { MemberTermsResponse, MemberTermsAcceptRequest, MemberTermsAcceptResponse } = await import(
  '../src/terms/index.js'
);
// Story 3.3b — the signup KYC-step DTOs. THE FIRST KYC endpoints (3.3a's KycProvider seam
// shipped components-free), so apps/api serves these routes now and they register real
// `paths` + components. The callback is PUBLIC (state-correlated); the rest are member-session.
const {
  KycInitiateResponse,
  KycCallbackRequest,
  KycConfirmRequest,
  KycManualSubmitRequest,
  KycProfileSummaryResponse,
  KycStatusResponse,
} = await import('../src/kyc/index.js');
// Story 3.4 — the signup nominee-declaration DTOs (declare + status). The third signup-
// wizard SURFACE; both routes are member-session-gated (no step-up at signup — 3.9 adds it).
const { NomineeDeclareRequest, NomineeStatusResponse } = await import('../src/nominee/index.js');
// Story 5.2 — push device-token registration DTOs (member + admin endpoints; shared request/ack).
// Story 5.3 — per-Pariwar WhatsApp Business config DTOs (trustee admin endpoints; config + templates).
const { WaConfigDto, WaConfigResponse, WaTemplateDto, WaTemplatesResponse, TelegramConfigDto, TelegramConfigResponse } =
  await import('../src/channel-config/index.js');
const { DeviceTokenRegisterRequest, DeviceTokenRegisterResponse } = await import(
  '../src/device-tokens/index.js'
);
// Story 5.4 — the member WhatsApp opt-in DTOs (mint PENDING → deep-link + phrase, status, revoke).
// Member-session-gated; the inbound-webhook worker advances PENDING → ACTIVE out-of-band.
const { CreateWaOptInResponse, WaOptInStatusResponse, RevokeWaOptInResponse } = await import(
  '../src/wa-opt-in/index.js'
);
// Story 5.5 — the member Telegram opt-in DTOs (mint PENDING → t.me `/start` deep-link, status, revoke).
// Member-session-gated; the tg-webhook-processor worker advances PENDING → ACTIVE out-of-band.
const { TelegramOptInRequestResponse, TelegramOptInStatusResponse, RevokeTelegramOptInResponse } =
  await import('../src/telegram-opt-in/index.js');
// Story 7.10 — the member pool-onboarding-tutorial outcome DTO (record completion/skip). Member-session
// -gated; recorded server-side as a member-level audit line for analytics (best-effort telemetry).
const { PoolOnboardingOutcomeRequest } = await import('../src/pool-onboarding/index.js');
// Story 8.5 — the UPI Failure Coach anonymous failure-report DTO (mode enum ONLY, no free-text). Member
// -session-gated; recorded server-side as a member-level, mode-in-the-action-name audit line (best-effort).
const { ContributionFailureReportRequest } = await import('../src/contributions/index.js');
// Story 8.6 — the Yogdaan Bahi contribution-history read model (a member's OWN self-view).
const { ContributionHistoryResponse } = await import('../src/contributions/index.js');
// Story 5.8 — the trustee degraded-mode declare/revoke/read DTOs (admin-session + declare_degraded_mode).
const { DegradedModeDeclareRequest, DegradedModeDeclarationResponse, DegradedModeActiveResponse } =
  await import('../src/degraded-mode/index.js');
// Story 3.5 — the signup medical-disclosure DTOs (submit + status + ima-list). The fourth
// signup-wizard SURFACE; all routes are member-session-gated (no step-up at signup — 3.9 adds it).
const { MedicalDiscloseRequest, MedicalDisclosureStatusResponse, ImaListResponse } = await import(
  '../src/medical/index.js'
);
// Story 3.6b — the signup ₹110 Vyawastha Shulk DTOs (intent + confirm + status). The FINAL
// signup-wizard SURFACE (closes the loop); all routes are member-session-gated.
const {
  VyawasthaShulkIntentResponse,
  VyawasthaShulkConfirmRequest,
  VyawasthaShulkConfirmResponse,
  VyawasthaShulkStatusResponse,
  // Story 3.8 — the renewal/validity surface: the FR-12A status payload + the renewal-confirm response.
  VyawasthaShulkRenewalStatusResponse,
  VyawasthaShulkRenewalConfirmResponse,
} = await import('../src/payments/index.js');

// Annotate schemas with their OpenAPI component name, then register for $ref
// resolution. Using registry.register() (not registerComponent) is the correct
// pattern for Zod schemas in @asteasolutions/zod-to-openapi — registerComponent
// is for raw OpenAPI objects (securitySchemes, responses, etc.).
const HealthResponseSchema = HealthResponse.openapi('HealthResponse');
const ErrorResponseSchema = ErrorResponse.openapi('ErrorResponse');
const BrandingBundleSchema = BrandingBundle.openapi('BrandingBundle');
const PariwarPassportResponseSchema = PariwarPassportResponse.openapi(
  'PariwarPassportResponse',
);
// Story 1.8 — RBAC component schemas.
const ScopeDimensionComponent = ScopeDimensionSchema.openapi('ScopeDimension');
const PermissionKeyComponent = PermissionKeySchema.openapi('PermissionKey');
const PermissionCatalogComponent = PermissionCatalogSchema.openapi('PermissionCatalog');
const RoleBundleComponent = RoleBundleSchema.openapi('RoleBundle');
const RoleGrantComponent = RoleGrantSchema.openapi('RoleGrant');

// Story 1.10 — audit-log-entry component schema.
const AuditLogEntryComponent = AuditLogEntryContract.openapi('AuditLogEntry');
// Story 1.11a — integrity-verification request + verdict-result component schemas.
const AuditIntegrityCheckRequestComponent = AuditIntegrityCheckRequest.openapi(
  'AuditIntegrityCheckRequest',
);
const AuditIntegrityCheckResultComponent = AuditIntegrityCheckResult.openapi(
  'AuditIntegrityCheckResult',
);
// Story 1.11b — history list item (verdict + most-recent acknowledgement) + the
// list response + the acknowledge request/result.
const AuditIntegrityCheckListItemComponent = AuditIntegrityCheckListItem.openapi(
  'AuditIntegrityCheckListItem',
);
const AuditIntegrityCheckListComponent = AuditIntegrityCheckList.openapi(
  'AuditIntegrityCheckList',
);
const AuditIntegrityAcknowledgeRequestComponent = AuditIntegrityAcknowledgeRequest.openapi(
  'AuditIntegrityAcknowledgeRequest',
);
const AuditIntegrityAcknowledgementComponent = AuditIntegrityAcknowledgement.openapi(
  'AuditIntegrityAcknowledgement',
);

// Story 1.15 — provisioning component schemas.
const AddPariwarRequestComponent = AddPariwarRequest.openapi('AddPariwarRequest');
const DeployStatusViewComponent = DeployStatusView.openapi('DeployStatusView');
const DeployTriggerResponseComponent = DeployTriggerResponse.openapi('DeployTriggerResponse');
const ProvisionedPariwarComponent = ProvisionedPariwar.openapi('ProvisionedPariwar');
const ProvisioningStatusListComponent = ProvisioningStatusList.openapi('ProvisioningStatusList');

// Story 2.4 — Niyamavali amendment-workflow component schemas.
const ClauseVersionResponseComponent = ClauseVersionResponse.openapi('ClauseVersionResponse');
const NiyamavaliAmendmentResponseComponent = NiyamavaliAmendmentResponse.openapi(
  'NiyamavaliAmendmentResponse',
);
const ClauseDraftResponseComponent = ClauseDraftResponse.openapi('ClauseDraftResponse');
const CreateDraftBodyComponent = CreateDraftBody.openapi('CreateDraftBody');
const UpdateClauseDraftRequestComponent = UpdateClauseDraftRequest.openapi('UpdateClauseDraftRequest');
const ToneReviewSignoffRequestComponent = ToneReviewSignoffRequest.openapi('ToneReviewSignoffRequest');
const DiffPreviewResponseComponent = DiffPreviewResponse.openapi('DiffPreviewResponse');
const PublishClauseResponseComponent = PublishClauseResponse.openapi('PublishClauseResponse');

// Story 2.6 — T&C version-registry component schemas.
const TcVersionResponseComponent = TcVersionResponse.openapi('TcVersionResponse');
const CreateTcVersionRequestComponent = CreateTcVersionRequest.openapi('CreateTcVersionRequest');
const ApproveTcVersionRequestComponent = ApproveTcVersionRequest.openapi('ApproveTcVersionRequest');

// Story 1.9 — admin-auth component schemas (request + response objects).
const authComponents = {
  LoginRequest: LoginRequest.openapi('LoginRequest'),
  LoginResponse: LoginResponse.openapi('LoginResponse'),
  PasskeyRegisterOptionsRequest: PasskeyRegisterOptionsRequest.openapi('PasskeyRegisterOptionsRequest'),
  PasskeyRegisterVerifyRequest: PasskeyRegisterVerifyRequest.openapi('PasskeyRegisterVerifyRequest'),
  PasskeyRegisterVerifyResponse: PasskeyRegisterVerifyResponse.openapi('PasskeyRegisterVerifyResponse'),
  PasskeyAuthOptionsRequest: PasskeyAuthOptionsRequest.openapi('PasskeyAuthOptionsRequest'),
  PasskeyAuthVerifyRequest: PasskeyAuthVerifyRequest.openapi('PasskeyAuthVerifyRequest'),
  PasskeyAuthVerifyResponse: PasskeyAuthVerifyResponse.openapi('PasskeyAuthVerifyResponse'),
  RecoveryConsumeRequest: RecoveryConsumeRequest.openapi('RecoveryConsumeRequest'),
  RecoveryConsumeResponse: RecoveryConsumeResponse.openapi('RecoveryConsumeResponse'),
  PasswordResetRequestRequest: PasswordResetRequestRequest.openapi('PasswordResetRequestRequest'),
  PasswordResetRequestResponse: PasswordResetRequestResponse.openapi('PasswordResetRequestResponse'),
  PasswordResetConsumeRequest: PasswordResetConsumeRequest.openapi('PasswordResetConsumeRequest'),
  PasswordResetConsumeResponse: PasswordResetConsumeResponse.openapi('PasswordResetConsumeResponse'),
  StepUpRequestRequest: StepUpRequestRequest.openapi('StepUpRequestRequest'),
  StepUpRequestResponse: StepUpRequestResponse.openapi('StepUpRequestResponse'),
  StepUpVerifyRequest: StepUpVerifyRequest.openapi('StepUpVerifyRequest'),
  StepUpVerifyResponse: StepUpVerifyResponse.openapi('StepUpVerifyResponse'),
  // Story 1.11b — session introspection response.
  SessionResponse: SessionResponse.openapi('SessionResponse'),
} as const;

const registry = new OpenAPIRegistry();

registry.register('HealthResponse', HealthResponseSchema);
registry.register('ErrorResponse', ErrorResponseSchema);
registry.register('BrandingBundle', BrandingBundleSchema);
registry.register('PariwarPassportResponse', PariwarPassportResponseSchema);
registry.register('ScopeDimension', ScopeDimensionComponent);
registry.register('PermissionKey', PermissionKeyComponent);
registry.register('PermissionCatalog', PermissionCatalogComponent);
registry.register('RoleBundle', RoleBundleComponent);
registry.register('RoleGrant', RoleGrantComponent);
// Story 1.10 — audit-log-entry component (no path; reads are Story 1.11b).
registry.register('AuditLogEntry', AuditLogEntryComponent);
// Story 1.11a — integrity-verification request + verdict-result components.
registry.register('AuditIntegrityCheckRequest', AuditIntegrityCheckRequestComponent);
registry.register('AuditIntegrityCheckResult', AuditIntegrityCheckResultComponent);
// Story 1.11b — history list + acknowledgement components.
registry.register('AuditIntegrityCheckListItem', AuditIntegrityCheckListItemComponent);
registry.register('AuditIntegrityCheckList', AuditIntegrityCheckListComponent);
registry.register('AuditIntegrityAcknowledgeRequest', AuditIntegrityAcknowledgeRequestComponent);
registry.register('AuditIntegrityAcknowledgement', AuditIntegrityAcknowledgementComponent);
// Story 1.15 — provisioning components (PariwarPassportResponse + BrandingBundle
// are already registered above, so ProvisionedPariwar $refs them).
registry.register('AddPariwarRequest', AddPariwarRequestComponent);
registry.register('DeployStatusView', DeployStatusViewComponent);
registry.register('DeployTriggerResponse', DeployTriggerResponseComponent);
registry.register('ProvisionedPariwar', ProvisionedPariwarComponent);
registry.register('ProvisioningStatusList', ProvisioningStatusListComponent);
// Story 2.4 — Niyamavali amendment-workflow components.
registry.register('ClauseVersionResponse', ClauseVersionResponseComponent);
registry.register('NiyamavaliAmendmentResponse', NiyamavaliAmendmentResponseComponent);
registry.register('ClauseDraftResponse', ClauseDraftResponseComponent);
registry.register('CreateDraftBody', CreateDraftBodyComponent);
registry.register('UpdateClauseDraftRequest', UpdateClauseDraftRequestComponent);
registry.register('ToneReviewSignoffRequest', ToneReviewSignoffRequestComponent);
registry.register('DiffPreviewResponse', DiffPreviewResponseComponent);
registry.register('PublishClauseResponse', PublishClauseResponseComponent);
// Story 2.6 — T&C version-registry components.
registry.register('TcVersionResponse', TcVersionResponseComponent);
registry.register('CreateTcVersionRequest', CreateTcVersionRequestComponent);
registry.register('ApproveTcVersionRequest', ApproveTcVersionRequestComponent);

// Story 1.9 — register the admin-auth components.
for (const [name, schema] of Object.entries(authComponents)) {
  registry.register(name, schema);
}

// Story 3.2 — member mobile+OTP auth components. MemberFullSession is registered
// once + $ref'd by the verify union, the select response, and the refresh response.
const memberComponents = {
  MemberOtpRequestRequest: MemberOtpRequestRequest.openapi('MemberOtpRequestRequest'),
  MemberOtpRequestResponse: MemberOtpRequestResponse.openapi('MemberOtpRequestResponse'),
  MemberFullSession: MemberFullSession.openapi('MemberFullSession'),
  MemberOtpVerifyRequest: MemberOtpVerifyRequest.openapi('MemberOtpVerifyRequest'),
  MemberOtpVerifyResponse: MemberOtpVerifyResponse.openapi('MemberOtpVerifyResponse'),
  MemberSelectPariwarRequest: MemberSelectPariwarRequest.openapi('MemberSelectPariwarRequest'),
  MemberTokenRefreshRequest: MemberTokenRefreshRequest.openapi('MemberTokenRefreshRequest'),
  MemberStepUpRequestRequest: MemberStepUpRequestRequest.openapi('MemberStepUpRequestRequest'),
  MemberStepUpRequestResponse: MemberStepUpRequestResponse.openapi('MemberStepUpRequestResponse'),
  MemberStepUpVerifyRequest: MemberStepUpVerifyRequest.openapi('MemberStepUpVerifyRequest'),
  MemberStepUpVerifyResponse: MemberStepUpVerifyResponse.openapi('MemberStepUpVerifyResponse'),
  // Story 3.6a — first-signup member-creation request (the response is MemberFullSession, above).
  MemberSignupCreateRequest: MemberSignupCreateRequest.openapi('MemberSignupCreateRequest'),
} as const;
for (const [name, schema] of Object.entries(memberComponents)) {
  registry.register(name, schema);
}

// Story 3.6a — member-facing T&C read/accept components (the signup wizard's `tc` step).
const memberTermsComponents = {
  MemberTermsResponse: MemberTermsResponse.openapi('MemberTermsResponse'),
  MemberTermsAcceptRequest: MemberTermsAcceptRequest.openapi('MemberTermsAcceptRequest'),
  MemberTermsAcceptResponse: MemberTermsAcceptResponse.openapi('MemberTermsAcceptResponse'),
} as const;
for (const [name, schema] of Object.entries(memberTermsComponents)) {
  registry.register(name, schema);
}

// Story 3.3b — signup KYC-step components (the first KYC HTTP DTOs).
const kycComponents = {
  KycInitiateResponse: KycInitiateResponse.openapi('KycInitiateResponse'),
  KycCallbackRequest: KycCallbackRequest.openapi('KycCallbackRequest'),
  KycConfirmRequest: KycConfirmRequest.openapi('KycConfirmRequest'),
  KycManualSubmitRequest: KycManualSubmitRequest.openapi('KycManualSubmitRequest'),
  KycProfileSummaryResponse: KycProfileSummaryResponse.openapi('KycProfileSummaryResponse'),
  KycStatusResponse: KycStatusResponse.openapi('KycStatusResponse'),
} as const;
for (const [name, schema] of Object.entries(kycComponents)) {
  registry.register(name, schema);
}

// Story 3.4 — signup nominee-declaration components (declare request + status response).
const nomineeComponents = {
  NomineeDeclareRequest: NomineeDeclareRequest.openapi('NomineeDeclareRequest'),
  NomineeStatusResponse: NomineeStatusResponse.openapi('NomineeStatusResponse'),
} as const;
for (const [name, schema] of Object.entries(nomineeComponents)) {
  registry.register(name, schema);
}

// Story 5.2 — push device-token registration components (shared request + ack).
const deviceTokenComponents = {
  DeviceTokenRegisterRequest: DeviceTokenRegisterRequest.openapi('DeviceTokenRegisterRequest'),
  DeviceTokenRegisterResponse: DeviceTokenRegisterResponse.openapi('DeviceTokenRegisterResponse'),
} as const;
for (const [name, schema] of Object.entries(deviceTokenComponents)) {
  registry.register(name, schema);
}

// Story 5.4 — member WhatsApp opt-in components (mint / status / revoke).
const waOptInComponents = {
  CreateWaOptInResponse: CreateWaOptInResponse.openapi('CreateWaOptInResponse'),
  WaOptInStatusResponse: WaOptInStatusResponse.openapi('WaOptInStatusResponse'),
  RevokeWaOptInResponse: RevokeWaOptInResponse.openapi('RevokeWaOptInResponse'),
} as const;
for (const [name, schema] of Object.entries(waOptInComponents)) {
  registry.register(name, schema);
}

// Story 5.5 — member Telegram opt-in components (request-mint / status / revoke).
const telegramOptInComponents = {
  TelegramOptInRequestResponse: TelegramOptInRequestResponse.openapi('TelegramOptInRequestResponse'),
  TelegramOptInStatusResponse: TelegramOptInStatusResponse.openapi('TelegramOptInStatusResponse'),
  RevokeTelegramOptInResponse: RevokeTelegramOptInResponse.openapi('RevokeTelegramOptInResponse'),
} as const;
for (const [name, schema] of Object.entries(telegramOptInComponents)) {
  registry.register(name, schema);
}

// Story 7.10 — member pool-onboarding-tutorial outcome component (record completion/skip).
const poolOnboardingComponents = {
  PoolOnboardingOutcomeRequest: PoolOnboardingOutcomeRequest.openapi('PoolOnboardingOutcomeRequest'),
} as const;
for (const [name, schema] of Object.entries(poolOnboardingComponents)) {
  registry.register(name, schema);
}

// Story 8.5 — UPI Failure Coach anonymous failure-report component (mode enum only; no free-text — AC3).
const contributionFailureComponents = {
  ContributionFailureReportRequest: ContributionFailureReportRequest.openapi('ContributionFailureReportRequest'),
} as const;
for (const [name, schema] of Object.entries(contributionFailureComponents)) {
  registry.register(name, schema);
}

// Story 8.6 — Yogdaan Bahi contribution-history read component (a member's OWN self-view: rows with the
// four-state status + PII-shielded deceased-family identity + the Contribution-Note seam; NO other-member
// field, NO UTR/tr, NO nominee/bank data).
const contributionHistoryComponents = {
  ContributionHistoryResponse: ContributionHistoryResponse.openapi('ContributionHistoryResponse'),
} as const;
for (const [name, schema] of Object.entries(contributionHistoryComponents)) {
  registry.register(name, schema);
}

// Story 5.3 — WhatsApp Business config components (config singleton + per-category template mapping).
const channelConfigComponents = {
  WaConfigDto: WaConfigDto.openapi('WaConfigDto'),
  WaConfigResponse: WaConfigResponse.openapi('WaConfigResponse'),
  WaTemplateDto: WaTemplateDto.openapi('WaTemplateDto'),
  WaTemplatesResponse: WaTemplatesResponse.openapi('WaTemplatesResponse'),
  // Story 5.5 — Telegram config singleton.
  TelegramConfigDto: TelegramConfigDto.openapi('TelegramConfigDto'),
  TelegramConfigResponse: TelegramConfigResponse.openapi('TelegramConfigResponse'),
} as const;
for (const [name, schema] of Object.entries(channelConfigComponents)) {
  registry.register(name, schema);
}

// Story 5.8 — degraded-mode declaration components (declare request + declaration + active response).
const degradedModeComponents = {
  DegradedModeDeclareRequest: DegradedModeDeclareRequest.openapi('DegradedModeDeclareRequest'),
  DegradedModeDeclarationResponse: DegradedModeDeclarationResponse.openapi('DegradedModeDeclarationResponse'),
  DegradedModeActiveResponse: DegradedModeActiveResponse.openapi('DegradedModeActiveResponse'),
} as const;
for (const [name, schema] of Object.entries(degradedModeComponents)) {
  registry.register(name, schema);
}

// Story 3.5 — signup medical-disclosure components (submit request + status response + ima-list).
const medicalComponents = {
  MedicalDiscloseRequest: MedicalDiscloseRequest.openapi('MedicalDiscloseRequest'),
  MedicalDisclosureStatusResponse: MedicalDisclosureStatusResponse.openapi(
    'MedicalDisclosureStatusResponse',
  ),
  ImaListResponse: ImaListResponse.openapi('ImaListResponse'),
} as const;
for (const [name, schema] of Object.entries(medicalComponents)) {
  registry.register(name, schema);
}

// Story 3.6b — signup ₹110 Vyawastha Shulk components (intent response + confirm request/response +
// status response). The final signup-wizard surface.
const vyawasthaShulkComponents = {
  VyawasthaShulkIntentResponse: VyawasthaShulkIntentResponse.openapi('VyawasthaShulkIntentResponse'),
  VyawasthaShulkConfirmRequest: VyawasthaShulkConfirmRequest.openapi('VyawasthaShulkConfirmRequest'),
  VyawasthaShulkConfirmResponse: VyawasthaShulkConfirmResponse.openapi(
    'VyawasthaShulkConfirmResponse',
  ),
  VyawasthaShulkStatusResponse: VyawasthaShulkStatusResponse.openapi('VyawasthaShulkStatusResponse'),
  // Story 3.8 — renewal/validity components.
  VyawasthaShulkRenewalStatusResponse: VyawasthaShulkRenewalStatusResponse.openapi(
    'VyawasthaShulkRenewalStatusResponse',
  ),
  VyawasthaShulkRenewalConfirmResponse: VyawasthaShulkRenewalConfirmResponse.openapi(
    'VyawasthaShulkRenewalConfirmResponse',
  ),
} as const;
for (const [name, schema] of Object.entries(vyawasthaShulkComponents)) {
  registry.register(name, schema);
}

registry.registerPath({
  method: 'get',
  path: '/api/v1/_meta/health',
  summary: 'Service health probe',
  description:
    'Substrate-proof endpoint authored at Story 1.4. ' +
    'Production /_meta/health lives at apps/api/ per Story 1.9+.',
  tags: ['_meta'],
  responses: {
    200: {
      description: 'Service is reachable',
      content: { 'application/json': { schema: HealthResponseSchema } },
    },
    503: {
      description: 'Service is degraded',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// ── Story 1.9 — the first real admin-auth `paths` ─────────────────────────────
type Schema = (typeof authComponents)[keyof typeof authComponents];
const jsonContent = (schema: Schema): { 'application/json': { schema: Schema } } => ({
  'application/json': { schema },
});
const errorResponse = (description: string): {
  description: string;
  content: { 'application/json': { schema: typeof ErrorResponseSchema } };
} => ({ description, content: { 'application/json': { schema: ErrorResponseSchema } } });

interface AuthPathSpec {
  path: string;
  summary: string;
  body: Schema;
  ok?: Schema;
  okDescription?: string;
  errors?: Record<number, string>;
}

const AUTH_PATHS: AuthPathSpec[] = [
  { path: '/api/v1/auth/login', summary: 'Admin login — first factor (email + password)', body: authComponents.LoginRequest, ok: authComponents.LoginResponse, errors: { 401: 'Invalid credentials', 429: 'Rate limited' } },
  { path: '/api/v1/auth/passkey/register/options', summary: 'WebAuthn enrollment — generate registration options', body: authComponents.PasskeyRegisterOptionsRequest, okDescription: 'WebAuthn PublicKeyCredentialCreationOptionsJSON (provider-controlled)', errors: { 403: 'Enrollment not authorized', 409: 'Device cap reached' } },
  { path: '/api/v1/auth/passkey/register/verify', summary: 'WebAuthn enrollment — verify + persist the credential', body: authComponents.PasskeyRegisterVerifyRequest, ok: authComponents.PasskeyRegisterVerifyResponse, errors: { 403: 'Enrollment denied/failed', 409: 'Device cap reached' } },
  { path: '/api/v1/auth/passkey/authenticate/options', summary: 'WebAuthn second factor — generate authentication options', body: authComponents.PasskeyAuthOptionsRequest, okDescription: 'WebAuthn PublicKeyCredentialRequestOptionsJSON (provider-controlled)', errors: { 401: 'No login in progress', 409: 'No passkey enrolled' } },
  { path: '/api/v1/auth/passkey/authenticate/verify', summary: 'WebAuthn second factor — verify the assertion', body: authComponents.PasskeyAuthVerifyRequest, ok: authComponents.PasskeyAuthVerifyResponse, errors: { 401: 'Authentication failed' } },
  { path: '/api/v1/auth/recovery/consume', summary: 'Recovery code second factor — consume + burn', body: authComponents.RecoveryConsumeRequest, ok: authComponents.RecoveryConsumeResponse, errors: { 401: 'Invalid recovery code' } },
  { path: '/api/v1/auth/password-reset/request', summary: 'Request a password-reset link (anti-enumeration)', body: authComponents.PasswordResetRequestRequest, ok: authComponents.PasswordResetRequestResponse, errors: { 429: 'Rate limited' } },
  { path: '/api/v1/auth/password-reset/consume', summary: 'Consume a password-reset link (forces WebAuthn re-enrollment)', body: authComponents.PasswordResetConsumeRequest, ok: authComponents.PasswordResetConsumeResponse, errors: { 403: 'Invalid or expired link' } },
  { path: '/api/v1/auth/step-up/request', summary: 'Request a step-up OTP for a gated action', body: authComponents.StepUpRequestRequest, ok: authComponents.StepUpRequestResponse, errors: { 401: 'Authentication required', 429: 'Rate limited' } },
  { path: '/api/v1/auth/step-up/verify', summary: 'Verify a step-up OTP — elevate the session', body: authComponents.StepUpVerifyRequest, ok: authComponents.StepUpVerifyResponse, errors: { 401: 'Step-up verification failed', 429: 'Rate limited' } },
];

for (const spec of AUTH_PATHS) {
  const responses: Record<number, unknown> = {};
  if (spec.ok) {
    responses[200] = { description: 'OK', content: jsonContent(spec.ok) };
  } else {
    responses[200] = { description: spec.okDescription ?? 'OK' };
  }
  responses[400] = errorResponse('Request validation failed');
  for (const [code, description] of Object.entries(spec.errors ?? {})) {
    responses[Number(code)] = errorResponse(description);
  }
  registry.registerPath({
    method: 'post',
    path: spec.path,
    summary: spec.summary,
    tags: ['admin-auth'],
    request: { body: { content: jsonContent(spec.body), required: true } },
    responses: responses as Parameters<typeof registry.registerPath>[0]['responses'],
  });
}

// POST /api/v1/auth/logout — destroys session + emits login.logout audit.
// CSRF-double-submit-protected (app.csrfProtection applied in admin-auth.routes.ts).
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  summary: 'Logout — destroy the session and emit a login.logout audit event',
  tags: ['admin-auth'],
  responses: {
    204: { description: 'Session destroyed' },
    401: errorResponse('No authenticated session'),
    403: errorResponse('CSRF token missing or invalid'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 1.11a — on-demand audit-integrity verification (GLOBAL) ─────────────
// POST /api/v1/audit/verify-integrity. GLOBAL (not under /p/:pariwarId/ — the
// audit chain is one global chain). Gated on an authenticated admin session
// (apps/api requireAdminSession); the full RBAC `audit.verify` gate graduates
// when a global-scope preHandler exists (deferred-work). The verdict READ surface
// (list/inspect prior checks) is Story 1.11b.
registry.registerPath({
  method: 'post',
  path: '/api/v1/audit/verify-integrity',
  summary: 'On-demand audit-log integrity verification (walk the global hash chain)',
  description:
    'Walks the entire global audit hash chain, records a verdict to ' +
    'audit_integrity_checks, and returns it. Requires an authenticated admin session.',
  tags: ['audit'],
  request: {
    body: {
      content: { 'application/json': { schema: AuditIntegrityCheckRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Integrity-check verdict',
      content: { 'application/json': { schema: AuditIntegrityCheckResultComponent } },
    },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 1.11b — session introspection (DD-6) ────────────────────────────────
// GET /api/v1/auth/session → { userId, nationalGrants[] }. Read-only; gates the
// admin SPA's nav + routes on global-scope grants (advisory).
registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/session',
  summary: 'Session introspection — the authenticated admin id + global-scope grants',
  description:
    'Returns the current admin session id + the permission keys held at the global ' +
    '("national") scope ceiling. The admin SPA gates nav + routes on these grants ' +
    '(advisory; requireAdminSession is the real boundary on every endpoint).',
  tags: ['admin-auth'],
  responses: {
    200: {
      description: 'Current admin session',
      content: { 'application/json': { schema: authComponents.SessionResponse } },
    },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 1.11b — integrity-check history list (DD-3) ─────────────────────────
// GET /api/v1/audit/integrity-checks?limit&triggerSource → most-recent-first list
// of verdicts, each with its most-recent acknowledgement (or null). GLOBAL,
// requireAdminSession-gated (NOT requirePermissionHook — a global route has no
// scopeTx). The "last automated check" is derived client-side from this history.
const integrityChecksQuery = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  triggerSource: z.string().min(1).optional(),
});
registry.registerPath({
  method: 'get',
  path: '/api/v1/audit/integrity-checks',
  summary: 'Audit-integrity check history (last automated + recent checks)',
  description:
    'Returns recent integrity-check verdicts (default 30, most-recent first), each ' +
    'with its most-recent acknowledgement (null if never acknowledged). Optionally ' +
    'filtered to one trigger source. Requires an authenticated admin session.',
  tags: ['audit'],
  request: { query: integrityChecksQuery },
  responses: {
    200: {
      description: 'Integrity-check history',
      content: { 'application/json': { schema: AuditIntegrityCheckListComponent } },
    },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 1.11b — acknowledge a (failed) integrity check (DD-5) ───────────────
// POST /api/v1/audit/integrity-checks/{checkId}/acknowledge { ticketRef }. Records
// an append-only acknowledgement (separate table) so the red banner can be cleared
// once an investigation ticket is opened (AC-5). requireAdminSession only.
const acknowledgeParams = z.object({ checkId: z.string().uuid() });
registry.registerPath({
  method: 'post',
  path: '/api/v1/audit/integrity-checks/{checkId}/acknowledge',
  summary: 'Acknowledge a (failed) integrity check with an investigation-ticket reference',
  description:
    'Records an append-only acknowledgement (separate audit_integrity_acknowledgements ' +
    'table — the verdict ledger stays immutable) capturing the external ticket reference. ' +
    'Requires an authenticated admin session.',
  tags: ['audit'],
  request: {
    params: acknowledgeParams,
    body: {
      content: { 'application/json': { schema: AuditIntegrityAcknowledgeRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Acknowledgement recorded',
      content: { 'application/json': { schema: AuditIntegrityAcknowledgementComponent } },
    },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    404: errorResponse('Integrity check not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 1.15 — multi-Pariwar provisioning (GLOBAL, pariwar.provision gate) ──
// THE FIRST global-scoped, permission-gated WRITE surface. NOT under /p/:pariwarId/
// (a new Pariwar has no id to scope to). Gated on requireAdminSession +
// requireGlobalPermission('pariwar.provision'). The GET is forced-paginated
// (Story 1.14): a bounded `limit` (max 100, default applied server-side).
const provisioningListQuery = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});
const provisioningDeployParams = z.object({ pariwarId: z.string().uuid() });
const forbidden = (key: string): ReturnType<typeof errorResponse> =>
  errorResponse(`Forbidden — ${key} at global scope required`);

registry.registerPath({
  method: 'post',
  path: '/api/v1/provisioning/pariwars',
  summary: 'Provision a new Pariwar (mint id + persist passport)',
  description:
    'Mints a fresh pariwar_id (UUID v4), persists the Pariwar-Passport via a ' +
    'self-scoped write, emits a pariwar.provisioned audit event, and returns the ' +
    'created passport + its derived /p/<id>/ path-scope. GLOBAL surface; requires an ' +
    'authenticated admin holding pariwar.provision at global scope.',
  tags: ['provisioning'],
  request: {
    body: {
      content: { 'application/json': { schema: AddPariwarRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Pariwar provisioned',
      content: { 'application/json': { schema: ProvisionedPariwarComponent } },
    },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: forbidden('pariwar.provision'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/provisioning/pariwars/{pariwarId}/deploy',
  summary: 'Trigger a Dokploy build for an existing Pariwar',
  description:
    'Invokes the deploy seam (env-resolved fake in dev/test, live Dokploy-API client ' +
    'in staging/prod), emits a pariwar.deploy_triggered audit event, and returns the ' +
    'deploy status + the path-scope. Requires pariwar.provision at global scope.',
  tags: ['provisioning'],
  request: {
    params: provisioningDeployParams,
    body: { content: { 'application/json': { schema: z.object({}) } }, required: false },
  },
  responses: {
    200: {
      description: 'Deploy triggered',
      content: { 'application/json': { schema: DeployTriggerResponseComponent } },
    },
    401: errorResponse('Authentication required'),
    403: forbidden('pariwar.provision'),
    404: errorResponse('Pariwar not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/provisioning/pariwars',
  summary: 'Provisioning-status view (provisioned Pariwars + latest deploy status)',
  description:
    'Lists provisioned Pariwars (cross-readable passport rows) with their derived ' +
    '/p/<id>/ path-scope + latest deploy status. Forced-paginated (bounded limit, ' +
    'Story 1.14) + under the named read rate ceiling. Requires pariwar.provision at global scope.',
  tags: ['provisioning'],
  request: { query: provisioningListQuery },
  responses: {
    200: {
      description: 'Provisioning-status list',
      content: { 'application/json': { schema: ProvisioningStatusListComponent } },
    },
    401: errorResponse('Authentication required'),
    403: forbidden('pariwar.provision'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 2.4 — Niyamavali amendment workflow (TENANT-SCOPED, RBAC-gated) ─────
// The first `/p/{pariwarId}/`-scoped admin surface. Every route runs the
// [requireAdminSession, scopeResolutionHook, requirePermissionHook] chain;
// reads gate on niyamavali.amend|review, writes on niyamavali.amend (sign-off on
// niyamavali.review). Publish additionally mounts the tone-review sign-off gate
// (409 tone_review.required) — Story 2.2's gate, here mounted on its first route.
const niyTags = ['niyamavali'];
const niyPariwarParams = z.object({ pariwarId: z.string().uuid() });
const niyClauseParams = z.object({ pariwarId: z.string().uuid(), clauseId: z.string() });
const niyDraftParams = z.object({ pariwarId: z.string().uuid(), draftId: z.string().uuid() });
const niyListQuery = z.object({ limit: z.number().int().min(1).max(100).optional() });
const niyDraftListQuery = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  status: ClauseDraftStatusSchema.optional(),
});
const niyForbidden = errorResponse('Forbidden — the required niyamavali permission at this scope');
const niyAuth = errorResponse('Authentication required');
const niyNotFound = errorResponse('Not found');
const niyValidation = errorResponse('Request validation failed');

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses',
  summary: 'List the Niyamavali registry (latest version per clause)',
  description:
    'Returns the chain-head (latest version) of every clause in the Pariwar, ' +
    'newest-first (forced-paginated). Requires niyamavali.amend at pariwar scope.',
  tags: niyTags,
  request: { params: niyPariwarParams, query: niyListQuery },
  responses: {
    200: {
      description: 'Registry clauses (latest version each)',
      content: { 'application/json': { schema: z.array(ClauseVersionResponseComponent) } },
    },
    401: niyAuth,
    403: niyForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/{clauseId}/versions',
  summary: 'Version history of a clause (oldest → newest)',
  description:
    'Returns the most-recent `limit` version rows of a clause_id (forced-paginated, ' +
    'Story 1.14). Requires niyamavali.amend at pariwar scope.',
  tags: niyTags,
  request: { params: niyClauseParams, query: niyListQuery },
  responses: {
    200: {
      description: 'Clause version history',
      content: { 'application/json': { schema: z.array(ClauseVersionResponseComponent) } },
    },
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/amendments',
  summary: 'List the amendment ledger (time-ordered)',
  description:
    'Returns the niyamavali_amendments ledger newest-first (the De4 (pariwar_id, ' +
    'created_at) index). Requires niyamavali.amend at pariwar scope.',
  tags: niyTags,
  request: { params: niyPariwarParams, query: niyListQuery },
  responses: {
    200: {
      description: 'Amendment ledger',
      content: { 'application/json': { schema: z.array(NiyamavaliAmendmentResponseComponent) } },
    },
    401: niyAuth,
    403: niyForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts',
  summary: 'List clause drafts (optionally by lifecycle state)',
  description:
    'Returns drafts for the Pariwar, newest-first, optionally filtered by status ' +
    '(e.g. in_review to find drafts awaiting sign-off). Requires niyamavali.amend.',
  tags: niyTags,
  request: { params: niyPariwarParams, query: niyDraftListQuery },
  responses: {
    200: {
      description: 'Clause drafts',
      content: { 'application/json': { schema: z.array(ClauseDraftResponseComponent) } },
    },
    401: niyAuth,
    403: niyForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts',
  summary: 'Create a clause draft (create or amend)',
  description:
    'Creates a server-persisted draft (the non-author reviewer loads the exact ' +
    'pending content). Body is a discriminated union on operation. Requires niyamavali.amend.',
  tags: niyTags,
  request: {
    params: niyPariwarParams,
    body: { content: { 'application/json': { schema: CreateDraftBodyComponent } }, required: true },
  },
  responses: {
    200: {
      description: 'Draft created',
      content: { 'application/json': { schema: ClauseDraftResponseComponent } },
    },
    400: niyValidation,
    401: niyAuth,
    403: niyForbidden,
    409: errorResponse('A clause-id conflict or an existing open draft for this clause'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}',
  summary: 'Load a single clause draft',
  description:
    'Returns the draft (incl. the pending payload) — the mechanism by which a ' +
    'NON-AUTHOR reviewer loads the exact content to review (AC1d). Requires ' +
    'niyamavali.amend or niyamavali.review.',
  tags: niyTags,
  request: { params: niyDraftParams },
  responses: {
    200: {
      description: 'The draft',
      content: { 'application/json': { schema: ClauseDraftResponseComponent } },
    },
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}',
  summary: 'Edit a clause draft (resets the tone-review sign-off)',
  description:
    'Patches a non-published draft. ANY edit resets the draft to `draft` and clears ' +
    'a prior tone-review sign-off (content-bound, AC1d). Requires niyamavali.amend.',
  tags: niyTags,
  request: {
    params: niyDraftParams,
    body: {
      content: { 'application/json': { schema: UpdateClauseDraftRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Draft updated',
      content: { 'application/json': { schema: ClauseDraftResponseComponent } },
    },
    400: niyValidation,
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
    409: errorResponse('The draft is published or discarded and cannot be edited'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}/diff',
  summary: 'Preview the draft diff (structured + rendered)',
  description:
    'Returns BOTH the structured-payload diff (computePayloadDiff vs the current ' +
    'published version, or {} for a create) AND a rendered display-field diff (AC1c). ' +
    'Requires niyamavali.amend or niyamavali.review.',
  tags: niyTags,
  request: { params: niyDraftParams },
  responses: {
    200: {
      description: 'Diff preview',
      content: { 'application/json': { schema: DiffPreviewResponseComponent } },
    },
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}/submit-for-review',
  summary: 'Submit a draft for tone-review',
  description: 'Transitions a draft → in_review, routing it to a non-author reviewer. Requires niyamavali.amend.',
  tags: niyTags,
  request: { params: niyDraftParams },
  responses: {
    200: {
      description: 'Submitted for review',
      content: { 'application/json': { schema: ClauseDraftResponseComponent } },
    },
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
    409: errorResponse('The draft is not in a submittable state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}/tone-review',
  summary: 'Record a non-author tone-review sign-off',
  description:
    'A reviewer (niyamavali.review) records a sign-off bound to the exact reviewed ' +
    'payload. Rejects a self-review (author === reviewer) with 409. Emits the Story ' +
    '2.2 tone_review.signoff audit line.',
  tags: niyTags,
  request: {
    params: niyDraftParams,
    body: {
      content: { 'application/json': { schema: ToneReviewSignoffRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Sign-off recorded',
      content: { 'application/json': { schema: ClauseDraftResponseComponent } },
    },
    400: niyValidation,
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
    409: errorResponse('Self-review, or the draft is not in review'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/niyamavali/clauses/drafts/{draftId}/publish',
  summary: 'Publish a clause draft (audit-logged, tone-review-gated)',
  description:
    'Mints the immutable clause_versions row + a single audit line carrying the diff ' +
    'hash + reviewer + clause_id + clause_version_id (AC2), then fires the member-' +
    'notification hook (AC3 placeholder). Gated on a recorded non-author, content-' +
    'current tone-review sign-off — without one, 409 tone_review.required (AC4). ' +
    'Requires niyamavali.amend.',
  tags: niyTags,
  request: { params: niyDraftParams },
  responses: {
    200: {
      description: 'Published',
      content: { 'application/json': { schema: PublishClauseResponseComponent } },
    },
    401: niyAuth,
    403: niyForbidden,
    404: niyNotFound,
    409: errorResponse('tone_review.required, or the draft is not signed off'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 2.6 — T&C version registry (TENANT-SCOPED, RBAC-gated) ──────────────
// Trustee write surface. Both routes run the [requireAdminSession,
// scopeResolutionHook, requirePermissionHook] chain; create gates on tc.publish,
// approve on tc.approve. Audit-or-throw (the audit line is written first). No read
// endpoint ships in 2.6 — the public /terms page reads the registry directly.
const tcTags = ['terms-and-conditions'];
const tcPariwarParams = z.object({ pariwarId: z.string().uuid() });
const tcVersionParams = z.object({ pariwarId: z.string().uuid(), tcVersionId: z.string().uuid() });
const tcForbidden = errorResponse('Forbidden — the required T&C permission at this scope');
const tcAuth = errorResponse('Authentication required');
const tcNotFound = errorResponse('Not found');
const tcValidation = errorResponse('Request validation failed');

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/terms/versions',
  summary: 'Create a T&C version (audit-logged)',
  description:
    'Creates a version-pinned T&C: renders body_html_rendered from bodyMarkdown at ' +
    'write time (sanitized), pins the supplied clause versions (each validated to ' +
    'exist in the Pariwar), defaults legal_review_status → pending, and writes a ' +
    'single audit line first (audit-or-throw). Requires tc.publish at pariwar scope.',
  tags: tcTags,
  request: {
    params: tcPariwarParams,
    body: {
      content: { 'application/json': { schema: CreateTcVersionRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'T&C version created',
      content: { 'application/json': { schema: TcVersionResponseComponent } },
    },
    400: tcValidation,
    401: tcAuth,
    403: tcForbidden,
    409: errorResponse('Concurrent T&C version creation conflict — retry the request'),
    422: errorResponse('A pinned clause version does not exist in this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/terms/versions/{tcVersionId}/approve',
  summary: 'Approve a T&C version (audit-logged)',
  description:
    'Marks a T&C approved: sets legal_reviewer_actor_id = the acting trustee, flips ' +
    'legal_review_status → approved, and supersedes the prior currently-effective ' +
    'version (set effective_until + status → superseded). Audit-or-throw. The ' +
    'superseded version stays queryable by tc_version_id. Requires tc.approve.',
  tags: tcTags,
  request: {
    params: tcVersionParams,
    body: {
      content: { 'application/json': { schema: ApproveTcVersionRequestComponent } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'T&C version approved',
      content: { 'application/json': { schema: TcVersionResponseComponent } },
    },
    400: tcValidation,
    401: tcAuth,
    403: tcForbidden,
    404: tcNotFound,
    409: errorResponse('The version is already approved or superseded'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.2 — member mobile+OTP auth (TOKEN-BEARER; the first member surface) ──
// Public OTP request/verify + multi-Pariwar select + token refresh; member-session-
// gated step-up request/verify (the gate's synthetic probe is hidden from the spec).
const memberTags = ['member-auth'];
const memberAuth = errorResponse('Authentication required');
const memberValidation = errorResponse('Request validation failed');
const jsonOf = (schema: unknown): { 'application/json': { schema: unknown } } => ({
  'application/json': { schema },
});

const MEMBER_PATHS: {
  path: string;
  summary: string;
  body: unknown;
  ok: unknown;
  errors?: Record<number, string>;
}[] = [
  {
    path: '/api/v1/member/auth/otp/request',
    summary: 'Member login — request a mobile OTP (enumeration-safe, per-phone throttled)',
    body: memberComponents.MemberOtpRequestRequest,
    ok: memberComponents.MemberOtpRequestResponse,
    errors: { 429: 'Too many OTP requests (per-phone 5/15min)' },
  },
  {
    path: '/api/v1/member/auth/otp/verify',
    summary: 'Member login — verify OTP → full session / pariwar-select / signup-continuation',
    body: memberComponents.MemberOtpVerifyRequest,
    ok: memberComponents.MemberOtpVerifyResponse,
    errors: { 401: 'Invalid code', 403: 'Member is withdrawn', 429: 'Rate limited' },
  },
  {
    path: '/api/v1/member/auth/otp/select-pariwar',
    summary: 'Member login — pick a Pariwar scope (multi-membership) → full session',
    body: memberComponents.MemberSelectPariwarRequest,
    ok: memberComponents.MemberFullSession,
    errors: { 401: 'Invalid selection token' },
  },
  {
    path: '/api/v1/member/auth/token/refresh',
    summary: 'Member session — rotate the refresh token (reuse detection)',
    body: memberComponents.MemberTokenRefreshRequest,
    ok: memberComponents.MemberFullSession,
    errors: { 401: 'Invalid refresh token' },
  },
  {
    path: '/api/v1/member/auth/step-up/request',
    summary: 'Member step-up — request an OTP for a gated action',
    body: memberComponents.MemberStepUpRequestRequest,
    ok: memberComponents.MemberStepUpRequestResponse,
    errors: { 401: 'Authentication required' },
  },
  {
    path: '/api/v1/member/auth/step-up/verify',
    summary: 'Member step-up — verify the OTP → elevate for the action_context',
    body: memberComponents.MemberStepUpVerifyRequest,
    ok: memberComponents.MemberStepUpVerifyResponse,
    errors: { 401: 'Step-up verification failed' },
  },
  {
    // Story 3.6a — first-signup member creation (holds a signup_continuation bearer, not a session).
    path: '/api/v1/member/auth/signup/create',
    summary: 'First signup — create the member from the signup-continuation seam → full session',
    body: memberComponents.MemberSignupCreateRequest,
    ok: memberComponents.MemberFullSession,
    errors: {
      401: 'Invalid/expired continuation token, or the mobile does not match the token',
      409: 'Continuation already consumed, or a member already exists for this mobile',
      503: 'The v1 default signup Pariwar is not configured',
    },
  },
];

for (const spec of MEMBER_PATHS) {
  const responses: Record<number, unknown> = {
    200: { description: 'OK', content: jsonOf(spec.ok) },
    400: memberValidation,
  };
  for (const [code, description] of Object.entries(spec.errors ?? {})) {
    responses[Number(code)] = code === '401' ? memberAuth : errorResponse(description);
  }
  registry.registerPath({
    method: 'post',
    path: spec.path,
    summary: spec.summary,
    tags: memberTags,
    request: { body: { content: jsonOf(spec.body), required: true } },
    responses: responses as Parameters<typeof registry.registerPath>[0]['responses'],
  });
}

// ── Story 3.3b — signup KYC step (member-session, except the PUBLIC OAuth callback) ──
// initiate → DigiLocker callback (public, state-correlated) → confirm, plus the manual
// fallback + status. The member routes require a member session + a pending-kyc member;
// the callback is unauthenticated (DigiLocker redirects the browser with ?state&code) and
// is correlated by the unguessable state (R3 — on the login-wall PUBLIC allowlist).
const kycTags = ['member-kyc'];
const kycAuth = errorResponse('Authentication required');
const kycValidation = errorResponse('Request validation failed');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/kyc/initiate',
  summary: 'Signup KYC — begin a DigiLocker pull (returns the authorization redirect)',
  description:
    'Resolves the active KYC provider and begins a DigiLocker authorization-code flow for ' +
    'the authenticated member (must be pending-kyc), returning the authorizationUrl the ' +
    'client opens + the transactionId the callback correlates. Requires a member session.',
  tags: kycTags,
  responses: {
    200: { description: 'KYC flow initiated', content: jsonOf(kycComponents.KycInitiateResponse) },
    401: kycAuth,
    409: errorResponse('Member is not pending-kyc (KYC already completed)'),
    502: errorResponse('KYC provider unavailable'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/kyc/callback',
  summary: 'DigiLocker OAuth callback (PUBLIC; state-correlated) — verify + pull the profile',
  description:
    'The OAuth redirect target DigiLocker sends the browser to with ?state&code. PUBLIC ' +
    '(no member JWT) — correlated by the unguessable state, which resolves the kyc_transaction ' +
    '(member_id + pariwar_id). Verifies the eAadhaar signature, pulls the profile, and ' +
    'persists it awaiting member confirmation. On provider failure returns the normalized ' +
    'KYC error so the client can branch to the manual fallback (AC2).',
  tags: kycTags,
  request: { body: { content: jsonOf(kycComponents.KycCallbackRequest), required: true } },
  responses: {
    200: { description: 'Profile verified + persisted (awaiting confirm)', content: jsonOf(kycComponents.KycProfileSummaryResponse) },
    400: kycValidation,
    404: errorResponse('No transaction for the supplied state'),
    422: errorResponse('Verification failed / signature invalid / certificate stale'),
    502: errorResponse('DigiLocker provider unavailable'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/kyc/confirm',
  summary: 'Signup KYC — confirm the verified DigiLocker profile (emits member.kyc_completed)',
  description:
    'Confirms a verified DigiLocker profile: emits member.kyc_completed via the projector ' +
    '(pending-kyc → pending-fee) + an audit line. Idempotent (a re-confirm emits no second ' +
    'event). Requires a member session.',
  tags: kycTags,
  request: { body: { content: jsonOf(kycComponents.KycConfirmRequest), required: true } },
  responses: {
    200: { description: 'KYC confirmed', content: jsonOf(kycComponents.KycStatusResponse) },
    400: kycValidation,
    401: kycAuth,
    404: errorResponse('No verified transaction / stored profile to confirm'),
    409: errorResponse('Transaction not verified, or member not pending-kyc'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/kyc/manual',
  summary: 'Signup KYC — manual fallback (emits member.kyc_manual_fallback)',
  description:
    'Stores a self-declared KYC record (name/dob/optional photo, Tier-1 encrypted; ' +
    'verification_strength=self_declared, trustee_verified=false) and emits ' +
    'member.kyc_manual_fallback (pending-kyc → pending-fee). The AC2 fallback target. ' +
    'Requires a member session.',
  tags: kycTags,
  request: { body: { content: jsonOf(kycComponents.KycManualSubmitRequest), required: true } },
  responses: {
    200: { description: 'Manual KYC recorded', content: jsonOf(kycComponents.KycStatusResponse) },
    400: kycValidation,
    401: kycAuth,
    409: errorResponse('Member is not pending-kyc'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/kyc/profile-summary',
  summary: 'Signup KYC — decrypt and return the stored KYC profile for member confirmation',
  description:
    'Returns the decrypted stored KYC profile for the authenticated member: name, dob, ' +
    'masked-Aadhaar (last-4 only), verificationStrength, and photoPresent flag (never the ' +
    'raw photo bytes — Tier-1 discipline). Called by the mobile confirm screen after the ' +
    'DigiLocker callback has persisted the profile. Requires a member session.',
  tags: kycTags,
  responses: {
    200: { description: 'KYC profile summary', content: jsonOf(kycComponents.KycProfileSummaryResponse) },
    401: kycAuth,
    404: errorResponse('No KYC profile found for this member'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/kyc/status',
  summary: 'Signup KYC — the step entry/poll read (transaction + member KYC + manual-enabled seam)',
  description:
    'Returns the current DigiLocker transaction status (when a flow is in flight), the ' +
    "member's KYC standing, the lifecycle state, and the FR-58C manualFallbackEnabled seam " +
    'flag (false → the UI hides the manual CTA + shows the hard-mandatory copy block). ' +
    'Requires a member session.',
  tags: kycTags,
  responses: {
    200: { description: 'KYC status', content: jsonOf(kycComponents.KycStatusResponse) },
    401: kycAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.4 — signup nominee declaration (member-session-gated; no step-up at signup) ──
// declare (1–2 nominees, server-derived 75/25 split, emits member.nominees_declared) + status
// (the current effective declaration — NO PII echo-back). The Life Events UPDATE + step-up
// gate is Story 3.9 (re-runs this declare service). NO nominee KYC and NO nominee bank at
// signup (AC2/AC3 — claim-time only).
const nomineeTags = ['member-nominee'];
const nomineeAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/nominees',
  summary: 'Signup nominees — declare 1–2 nominees (emits member.nominees_declared)',
  description:
    'Declares 1 or 2 nominees (name/relationship/mobile + optional address; Tier-1 encrypted) ' +
    'with a SERVER-derived 75/25 split when two are declared (100% for one) — the client cannot ' +
    'override the split. Replaces any prior declaration (latest-wins) and emits ' +
    'member.nominees_declared (a non-PII audit marker; count + split only) on the member stream. ' +
    'NO nominee Aadhaar/KYC and NO nominee bank/IFSC are collected at signup (claim-time only, ' +
    'Epic 6). Requires a member session (no step-up at signup — Life Events adds it in 3.9).',
  tags: nomineeTags,
  request: { body: { content: jsonOf(nomineeComponents.NomineeDeclareRequest), required: true } },
  responses: {
    200: { description: 'Nominees declared', content: jsonOf(nomineeComponents.NomineeStatusResponse) },
    400: errorResponse('Request validation failed (0 or >2 nominees, or bad fields)'),
    401: nomineeAuth,
    409: errorResponse('Member is in a terminal state (withdrawn / anonymized)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/nominees',
  summary: 'Signup nominees — the current effective declaration (NO PII echo-back)',
  description:
    "Returns the member's current nominee declaration as NON-PII summaries: rank, relationship, " +
    'the server-stamped splitPct, and presence flags for the encrypted fields. NEVER the raw ' +
    'name/mobile/address bytes (Tier-1 echo-back discipline). Requires a member session.',
  tags: nomineeTags,
  responses: {
    200: { description: 'Current nominee declaration', content: jsonOf(nomineeComponents.NomineeStatusResponse) },
    401: nomineeAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.2 — push device-token registration (member + admin; Epic 5's first [CONSUMER]) ──
// The mobile app registers its FCM/APNs token on app open (member-session-gated); admin device
// tokens register on admin auth (admin-session-gated). Both share the request/ack; the upsert is
// idempotent and marks the principal's OTHER same-platform tokens stale (app-open rebuild). The
// token is Tier-1 PII (request-only, never echoed back).
const deviceTokenTags = ['device-token'];
const deviceTokenAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/device-tokens',
  summary: 'Register the member device push token (FCM/APNs) on app open',
  description:
    "Registers the current device's FCM (Android) / APNs (iOS) push token for the authenticated " +
    'member (the Story 3.2 app-open consumer). The token is Tier-1-encrypted at rest + blind-indexed; ' +
    'the upsert is idempotent and marks the member’s OTHER same-platform tokens stale (app-open ' +
    'rebuild). Requires a member session. The token is NEVER echoed back (Tier-1 discipline).',
  tags: deviceTokenTags,
  request: { body: { content: jsonOf(deviceTokenComponents.DeviceTokenRegisterRequest), required: true } },
  responses: {
    200: { description: 'Device token registered', content: jsonOf(deviceTokenComponents.DeviceTokenRegisterResponse) },
    400: errorResponse('Request validation failed (bad platform or token)'),
    401: deviceTokenAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/admin/device-tokens',
  summary: 'Register the admin device push token (FCM/APNs) on admin auth',
  description:
    "Registers the current device's FCM (Android) / APNs (iOS) push token for the authenticated " +
    'admin (the Story 1.9 admin-auth consumer). Admin identity is global — the token keys on the ' +
    'admin-global namespace. Same idempotent upsert + app-open rebuild as the member endpoint. ' +
    'Requires an admin session. The token is NEVER echoed back (Tier-1 discipline).',
  tags: deviceTokenTags,
  request: { body: { content: jsonOf(deviceTokenComponents.DeviceTokenRegisterRequest), required: true } },
  responses: {
    200: { description: 'Device token registered', content: jsonOf(deviceTokenComponents.DeviceTokenRegisterResponse) },
    400: errorResponse('Request validation failed (bad platform or token)'),
    401: deviceTokenAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.4 — member WhatsApp opt-in surface (member-session-gated) + trustee admin_action opt-out ──
const waOptInTags = ['wa-opt-in'];
const waOptInAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/wa-opt-in',
  summary: 'Mint (or re-use) a PENDING WhatsApp opt-in → Send-Hello deep-link + verification phrase',
  description:
    'Mints a PENDING opt-in for the authenticated member with a unique verification phrase, and returns ' +
    'the Pariwar’s WA Business number + a wa.me Send-Hello deep-link pre-filled with that phrase. A re-tap ' +
    're-uses the outstanding PENDING. 409 when the Pariwar has WA disabled / no number. The member sends ' +
    'the message; the inbound-webhook worker advances the opt-in to ACTIVE.',
  tags: waOptInTags,
  responses: {
    200: { description: 'PENDING opt-in minted', content: jsonOf(waOptInComponents.CreateWaOptInResponse) },
    401: waOptInAuth,
    409: errorResponse('WhatsApp unavailable for this Pariwar, or already opted in'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/wa-opt-in',
  summary: 'Read the member’s current WhatsApp opt-in status',
  description:
    'Returns the member’s current opt-in state (null when never opted in) + whether the toggle is ' +
    'available (WA enabled + number) + the deep-link/phrase (PENDING) or window expiry (ACTIVE).',
  tags: waOptInTags,
  responses: {
    200: { description: 'Opt-in status', content: jsonOf(waOptInComponents.WaOptInStatusResponse) },
    401: waOptInAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/member/wa-opt-in',
  summary: 'Revoke the member’s active WhatsApp opt-in (independently revocable)',
  description:
    'Member-initiated revocation of an ACTIVE opt-in — disables WA delivery immediately, touching ONLY ' +
    'the whatsapp_opt_in consent. 409 when there is no ACTIVE opt-in. Re-opt-in requires a new WhatsApp ' +
    'message (no inferred re-consent).',
  tags: waOptInTags,
  responses: {
    200: { description: 'Opt-in revoked', content: jsonOf(waOptInComponents.RevokeWaOptInResponse) },
    401: waOptInAuth,
    409: errorResponse('No active opt-in to revoke'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/admin/members/{memberId}/wa-opt-out',
  summary: 'Trustee force opt-out of a member’s WhatsApp opt-in (admin_action)',
  description:
    'Scoped-admin force opt-out of a member’s ACTIVE WhatsApp opt-in (trustee defensibility). Gated by the ' +
    'existing member.moderate permission [requireAdminSession, scopeResolutionHook, ' +
    'requirePermissionHook(member.moderate)] — 401 no session, 403 no permission. 409 when the member has ' +
    'no ACTIVE opt-in.',
  tags: waOptInTags,
  request: {
    params: z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() }),
  },
  responses: {
    200: { description: 'Opt-in revoked', content: jsonOf(waOptInComponents.RevokeWaOptInResponse) },
    401: waOptInAuth,
    403: errorResponse('Missing member.moderate permission'),
    409: errorResponse('No active opt-in to revoke'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.5 — member Telegram opt-in surface (member-session-gated) ──
const telegramOptInTags = ['telegram-opt-in'];
const telegramOptInAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/telegram-opt-in',
  summary: 'Mint (or re-use) a PENDING Telegram opt-in → t.me `/start` deep-link',
  description:
    'Mints a PENDING opt-in for the authenticated member with a unique verification code, and returns a ' +
    'https://t.me/<bot>?start=<code> deep-link. Tapping it opens the bot and sends `/start <code>`. A re-tap ' +
    're-uses the outstanding PENDING. 409 when the Pariwar has Telegram disabled / no bot. The bot `/start` ' +
    'is matched by the tg-webhook-processor worker, which advances the opt-in to ACTIVE.',
  tags: telegramOptInTags,
  responses: {
    200: { description: 'PENDING opt-in minted', content: jsonOf(telegramOptInComponents.TelegramOptInRequestResponse) },
    401: telegramOptInAuth,
    409: errorResponse('Telegram unavailable for this Pariwar, or already opted in'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/telegram-opt-in',
  summary: 'Read the member’s current Telegram opt-in status',
  description:
    'Returns the member’s current opt-in state (null when never opted in) + whether the toggle is ' +
    'available (Telegram enabled + bot) + the `/start` deep-link (PENDING only).',
  tags: telegramOptInTags,
  responses: {
    200: { description: 'Opt-in status', content: jsonOf(telegramOptInComponents.TelegramOptInStatusResponse) },
    401: telegramOptInAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/telegram-opt-in/revoke',
  summary: 'Revoke the member’s active Telegram opt-in (independently revocable)',
  description:
    'Member-initiated revocation of an ACTIVE opt-in — disables Telegram delivery immediately, touching ' +
    'ONLY the telegram_opt_in consent. 409 when there is no ACTIVE opt-in. Re-opt-in requires a new bot ' +
    '`/start` interaction (no inferred re-consent).',
  tags: telegramOptInTags,
  responses: {
    200: { description: 'Opt-in revoked', content: jsonOf(telegramOptInComponents.RevokeTelegramOptInResponse) },
    401: telegramOptInAuth,
    409: errorResponse('No active opt-in to revoke'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 7.10 — member pool-engine onboarding-tutorial outcome (member-session-gated) ──
registry.registerPath({
  method: 'post',
  path: '/api/v1/member/pool-onboarding-tutorial',
  summary: 'Record the member pool-onboarding tutorial outcome (completed | skipped)',
  description:
    'Records the authenticated member’s onboarding-tutorial outcome as a member-level audit line for ' +
    'analytics (completed and skipped are distinct). The app calls this best-effort / fire-and-forget — ' +
    'the client’s local (MMKV) flag is the authoritative first-entry suppressor, so a failed call never ' +
    'blocks the tutorial’s dismissal nor re-shows it. Returns 204 (no body).',
  tags: ['pool-onboarding'],
  request: {
    body: { content: jsonOf(poolOnboardingComponents.PoolOnboardingOutcomeRequest), required: true },
  },
  responses: {
    204: { description: 'Outcome recorded' },
    400: errorResponse('Validation failed (outcome must be completed | skipped)'),
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 8.5 — UPI Failure Coach anonymous failure report (member-session-gated) ──
registry.registerPath({
  method: 'post',
  path: '/api/v1/member/contribution/failure',
  summary: 'Record the member’s self-classified UPI failure mode (anonymous analytics)',
  description:
    'Records the authenticated member’s SELF-CLASSIFIED UPI failure mode as a member-level audit line for ' +
    'analytics tuning. "Anonymous" refers to the failure DETAIL, not the audit subject: the audit action is ' +
    'keyed on the mode alone (no free-text, no UTR / amount / payee / reference). Diagnostic only — it emits ' +
    'no contribution attestation and creates no yellow pill. The app calls this best-effort / fire-and-forget ' +
    '— a failed call never blocks the member’s ability to retry or attest. Returns 204 (no body).',
  tags: ['payment'],
  request: {
    body: { content: jsonOf(contributionFailureComponents.ContributionFailureReportRequest), required: true },
  },
  responses: {
    204: { description: 'Failure mode recorded' },
    400: errorResponse('Validation failed (mode must be one of the five bounded failure modes)'),
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 8.6 — Yogdaan Bahi contribution history (member-session-gated, the member's OWN self-view) ──
registry.registerPath({
  method: 'get',
  path: '/api/v1/member/contribution-history',
  summary: 'The member’s Yogdaan Bahi — their own contribution history (FR-12A self-view)',
  description:
    'Returns the authenticated member’s OWN attested contributions, newest-first, each fully resolved ' +
    'server-side: date, the deceased family’s first-name + last-initial (PII-shielded — the family the ' +
    'pool supports, NOT the nominee), pool letter code + curated name + canonical identifier, the cycle ' +
    'reference, the snapshotted amount, the honestly-derived four-state status (yellow attested / green ' +
    'confirmed / red mismatch / grey on-record; green + red are Epic 9’s producers, legitimately empty ' +
    'today), and whether a Contribution Note PDF is generatable yet (Story 8.7 — false today). Plus the ' +
    'running-tally totalInr. Member-scoped + PII-shielded — the client resolves nothing; a member who has ' +
    'attested nothing gets an empty passbook. Requires a member session.',
  tags: ['member-pool'],
  responses: {
    200: { description: 'The member’s contribution history', content: jsonOf(contributionHistoryComponents.ContributionHistoryResponse) },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 8.7 — the Yogdaan Pratigya (Contribution Note) PDF (member-session-gated) ──
//
// Hand-authored because the response is BINARY (`application/pdf` bytes), not a Zod-generated JSON
// shape — there is nothing to `jsonOf`. The response body is declared as `type: string, format: binary`,
// the OpenAPI 3.1 spelling for an opaque byte stream.
//
// The naming discipline binds THIS declaration too (AC1): the path, the summary and the description
// name the artifact as a Contribution Note / Yogdaan Pratigya and never as a transactional document —
// the `microcopy.yaml` vocabulary register governs the OpenAPI surface, not only member-visible copy.
registry.registerPath({
  method: 'get',
  path: '/api/v1/member/contribution-note/{contributionId}',
  summary: 'The member’s Yogdaan Pratigya (Contribution Note) PDF for one of their own contributions',
  description:
    'Renders and returns the authenticated member’s OWN Contribution Note as a tagged, Hindi-first PDF ' +
    '(FR-33). The artifact carries the contribution’s facts, the TWT + member-identifier watermarks, the ' +
    'Pariwar’s branding, and the Niyamavali version in force AT THE CONTRIBUTION INSTANT (or an honest ' +
    '"not yet published" when the Pariwar has published no governing clause — never a fabricated ' +
    'version). It is a record of a trust relationship, NOT a transactional document.\n\n' +
    'A Note is generatable for any RESOLVABLE attested contribution in any of the four statuses; the ' +
    'status governs what the artifact SAYS, never whether it exists. The UTR and the सत्यापित ' +
    'verification stamp are reserved for reconciliation-CONFIRMED (green) contributions only — a ' +
    'pending Note states that verification is still pending, so it remains honest if the member ' +
    'forwards the file onward.\n\n' +
    'Generated on demand and persisted nowhere: the same contribution regenerates an equivalent Note. ' +
    'Hard-scoped to the caller’s own contributions — another member’s contributionId returns the same ' +
    '404 as an unknown one. Deliberately NOT fail-soft: an unresolvable Note 404s and a render failure ' +
    '5xxs, never a blank or partial PDF. Rate-limited per member (this is the only member endpoint that ' +
    'spawns a browser render). Requires a member session.',
  tags: ['member-pool'],
  request: { params: z.object({ contributionId: z.string().min(1) }) },
  responses: {
    200: {
      description: 'The Contribution Note PDF bytes (attachment; Content-Disposition filename)',
      content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    },
    401: errorResponse('Authentication required'),
    404: errorResponse('No Contribution Note for this contribution id and caller (unknown, or not theirs)'),
    429: errorResponse('Rate limit exceeded (per-member render limit)'),
    500: errorResponse('Render failed — never a blank or partial PDF'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.3 — trustee WhatsApp Business config (per-Pariwar; the [SURFACE] half) ──
// GET/PUT the WA config singleton + GET/PUT the per-category UTILITY template mapping. Scoped admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(pariwar.configure_channels)] — 401 no
// session, 403 no permission (fail-closed; never a silent config write). The credential is a Secret-Manager
// NAME pointer (safe to round-trip); the resolved token never appears on this surface.
const channelConfigTags = ['channel-config'];
const channelConfigParams = z.object({ pariwarId: z.string().uuid() });
const channelConfigAuth = errorResponse('Authentication required');
const channelConfigForbidden = errorResponse('Forbidden — requires pariwar.configure_channels at pariwar scope');

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/whatsapp',
  summary: 'Read the per-Pariwar WhatsApp Business config (toggle, number, credential NAME, graph version)',
  description:
    "Returns the Pariwar's WA Business config singleton (zero-config defaults when none exists yet). " +
    'The access-token field is a Secret-Manager NAME (a pointer), never the token value. Requires ' +
    'pariwar.configure_channels at pariwar scope.',
  tags: channelConfigTags,
  request: { params: channelConfigParams },
  responses: {
    200: { description: 'WA config', content: jsonOf(channelConfigComponents.WaConfigResponse) },
    401: channelConfigAuth,
    403: channelConfigForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/whatsapp',
  summary: 'Upsert the per-Pariwar WhatsApp Business config (audited)',
  description:
    "Upserts the Pariwar's WA Business config singleton (the FR-72 admin toggle + number + credential " +
    'NAME + graph version). Audited via the hash-chain writer; the resolved token value never appears. ' +
    'Requires pariwar.configure_channels at pariwar scope.',
  tags: channelConfigTags,
  request: {
    params: channelConfigParams,
    body: { content: jsonOf(channelConfigComponents.WaConfigDto), required: true },
  },
  responses: {
    200: { description: 'WA config upserted', content: jsonOf(channelConfigComponents.WaConfigResponse) },
    400: errorResponse('Request validation failed'),
    401: channelConfigAuth,
    403: channelConfigForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/whatsapp/templates',
  summary: 'List the per-category WhatsApp UTILITY template mapping',
  description:
    "Returns the Pariwar's per-(alert_category) UTILITY template mapping (name, language, approval " +
    'status). A category with no `approved` row is not WA-eligible. Requires pariwar.configure_channels.',
  tags: channelConfigTags,
  request: { params: channelConfigParams },
  responses: {
    200: { description: 'WA template mapping', content: jsonOf(channelConfigComponents.WaTemplatesResponse) },
    401: channelConfigAuth,
    403: channelConfigForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/whatsapp/templates',
  summary: 'Upsert one category’s WhatsApp UTILITY template mapping (audited)',
  description:
    "Upserts one (alert_category) → UTILITY template mapping (Meta-registered name + language + approval " +
    'status). Audited. Requires pariwar.configure_channels at pariwar scope.',
  tags: channelConfigTags,
  request: {
    params: channelConfigParams,
    body: { content: jsonOf(channelConfigComponents.WaTemplateDto), required: true },
  },
  responses: {
    200: { description: 'WA template mapping upserted', content: jsonOf(channelConfigComponents.WaTemplateDto) },
    400: errorResponse('Request validation failed'),
    401: channelConfigAuth,
    403: channelConfigForbidden,
    409: errorResponse('The WhatsApp Business config must be saved before a template mapping can be added'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.5 — trustee Telegram Bot config (per-Pariwar; the [SURFACE] half) ──
registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/telegram',
  summary: 'Read the per-Pariwar Telegram Bot config (zero-config defaults when unprovisioned)',
  description:
    'Returns the Telegram config singleton (the FR-58C v1 `enabled` flag, bot username, + the bot-token / ' +
    'webhook-secret-token Secret-Manager NAME pointers — never the values). Requires pariwar.configure_channels.',
  tags: channelConfigTags,
  request: { params: channelConfigParams },
  responses: {
    200: { description: 'Telegram config', content: jsonOf(channelConfigComponents.TelegramConfigResponse) },
    401: channelConfigAuth,
    403: channelConfigForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/channel-config/telegram',
  summary: 'Upsert the per-Pariwar Telegram Bot config (audited)',
  description:
    'Upserts the Telegram config singleton (the FR-58C v1 `enabled` flag, bot username, + the two ' +
    'Secret-Manager NAME pointers — the resolved token values NEVER appear here or in the audit). Audited. ' +
    'Requires pariwar.configure_channels at pariwar scope.',
  tags: channelConfigTags,
  request: {
    params: channelConfigParams,
    body: { content: jsonOf(channelConfigComponents.TelegramConfigDto), required: true },
  },
  responses: {
    200: { description: 'Telegram config upserted', content: jsonOf(channelConfigComponents.TelegramConfigResponse) },
    400: errorResponse('Request validation failed'),
    401: channelConfigAuth,
    403: channelConfigForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 5.8 — trustee degraded-mode declare/revoke/read (per-Pariwar; the AR-20 SMS-bridge governance) ──
const degradedModeTags = ['degraded-mode'];
const degradedModeParams = z.object({ pariwarId: z.string().uuid() });
const degradedModeRevokeParams = z.object({ pariwarId: z.string().uuid(), id: z.string().uuid() });
const degradedModeAuth = errorResponse('Authentication required');
const degradedModeForbidden = errorResponse('Forbidden — requires pariwar.declare_degraded_mode at pariwar scope');

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/admin/degraded-mode/declarations',
  summary: 'Declare degraded mode (the AR-20 cycle-open SMS bridge; audited)',
  description:
    'Declares degraded mode for the Pariwar so the cycle-open SMS bridge can force SMS for cycle-open ' +
    '(alert_published) alerts, bypassing cost-optimization. Auto-revokes any currently-active declaration ' +
    '(single-active-per-Pariwar). effectiveFrom cannot be backdated (NO BACKDATING). Audited. Requires ' +
    'pariwar.declare_degraded_mode at pariwar scope.',
  tags: degradedModeTags,
  request: {
    params: degradedModeParams,
    body: { content: jsonOf(degradedModeComponents.DegradedModeDeclareRequest), required: true },
  },
  responses: {
    200: { description: 'Degraded mode declared', content: jsonOf(degradedModeComponents.DegradedModeDeclarationResponse) },
    400: errorResponse('Request validation failed (e.g. a backdated effectiveFrom)'),
    401: degradedModeAuth,
    403: degradedModeForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/admin/degraded-mode/declarations/{id}/revoke',
  summary: 'Manually revoke a degraded-mode declaration (idempotent; audited)',
  description:
    'Revokes the identified declaration (a state transition, not a delete). Idempotent — revoking an ' +
    'already-revoked/expired row is a no-op. Audited. Requires pariwar.declare_degraded_mode at pariwar scope.',
  tags: degradedModeTags,
  request: { params: degradedModeRevokeParams },
  responses: {
    200: { description: 'Declaration revoked', content: jsonOf(degradedModeComponents.DegradedModeActiveResponse) },
    401: degradedModeAuth,
    403: degradedModeForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/degraded-mode/active',
  summary: 'Read the currently-active degraded-mode declaration (the banner read)',
  description:
    'Returns the currently-active degraded-mode declaration for the Pariwar, or null when none is active. ' +
    '"Active" is computed (revoked_at IS NULL AND effective_from<=now AND (expires_at IS NULL OR ' +
    'expires_at>now)). Requires pariwar.declare_degraded_mode at pariwar scope.',
  tags: degradedModeTags,
  request: { params: degradedModeParams },
  responses: {
    200: { description: 'The active declaration or null', content: jsonOf(degradedModeComponents.DegradedModeActiveResponse) },
    401: degradedModeAuth,
    403: degradedModeForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.5 — signup medical disclosure (member-session-gated; no step-up at signup) ──
// submit (0..N IMA conditions + mandatory concealment-denial ack → emits member.medical_disclosed
// + records a consent via the audit-or-throw chain; APPEND-ONLY history) + status (the latest
// disclosure, NO PII echo-back) + ima-list (the catalog + concealment-ack copy). The Life Events
// UPDATE + step-up gate is Story 3.9 (re-runs this submit service). NO condition codes / free-text
// ever appear in the event/audit (claim-time concealment evaluation is Epic 4).
const medicalTags = ['member-medical'];
const medicalAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/medical-disclosure',
  summary: 'Signup medical disclosure — submit IMA disclosures + concealment-denial ack',
  description:
    'Submits 0..N IMA-listed conditions (zero is valid — most members disclose nothing) + the ' +
    'optional free-text additional context (both Tier-1 encrypted) with a MANDATORY ' +
    'concealment-denial acknowledgment (server rejects acknowledged !== true). Records a ' +
    'consent (medical_disclosure_ack, referencing niy.concealment.r14) via the audit-or-throw ' +
    'chain, APPENDS a disclosure row (append-only history — Epic 4 walks the full history), and ' +
    'emits member.medical_disclosed (a non-PII marker; count + ima_list_version + ack only). ' +
    'Requires a member session (no step-up at signup — Life Events adds it in 3.9).',
  tags: medicalTags,
  request: { body: { content: jsonOf(medicalComponents.MedicalDiscloseRequest), required: true } },
  responses: {
    200: {
      description: 'Disclosure recorded',
      content: jsonOf(medicalComponents.MedicalDisclosureStatusResponse),
    },
    400: errorResponse('Validation failed (ack not true, or an unknown IMA condition code)'),
    401: medicalAuth,
    409: errorResponse(
      'Member not found / terminal state, or a required clause (IMA list / concealment) is unresolvable',
    ),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/medical-disclosure',
  summary: 'Signup medical disclosure — the latest disclosure status (NO PII echo-back)',
  description:
    "Returns the member's latest medical disclosure as a NON-PII summary (disclosedAt, " +
    'imaListVersion, conditionCount, a presence flag for the free-text, ackLocale) + the total ' +
    'history count. NEVER the raw condition codes / free-text bytes (Tier-1 echo-back ' +
    'discipline). Requires a member session.',
  tags: medicalTags,
  responses: {
    200: {
      description: 'Latest disclosure + history count',
      content: jsonOf(medicalComponents.MedicalDisclosureStatusResponse),
    },
    401: medicalAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/medical-disclosure/ima-list',
  summary: 'Signup medical disclosure — the IMA catalog + concealment-ack copy',
  description:
    'Returns the resolved IMA condition catalog (version = the niy.medical.ima-list ' +
    'clause_version_id + bilingual conditions) plus the concealment-ack copy (ackText.en / ' +
    'ackText.hi from niy.concealment.r14) the screen renders. Returns 503 when the registry is ' +
    'unprovisioned for the Pariwar (either clause absent). Requires a member session.',
  tags: medicalTags,
  responses: {
    200: { description: 'IMA catalog + ack copy', content: jsonOf(medicalComponents.ImaListResponse) },
    401: medicalAuth,
    503: errorResponse('The IMA list / concealment clause is not provisioned for this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.6a — member-facing Terms & Conditions (member-session-gated; the signup `tc` step) ──
// GET the current effective T&C (precomputed sanitized HTML; 503 when unprovisioned for the
// Pariwar) + POST accept → records a tc_acceptance consent via the audit-or-throw chain (the SECOND
// consent-registry consumer after Story 3.5). The legal body is per-Pariwar canonical text from the
// terms_and_conditions_versions registry — NOT i18n.
const memberTermsTags = ['member-terms'];
const memberTermsAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/terms',
  summary: 'Signup T&C — the current effective Terms & Conditions for the member’s Pariwar',
  description:
    'Returns the current effective T&C version for the member’s Pariwar: the tcVersionId, the ' +
    'effective-from instant, the PRECOMPUTED sanitized HTML body (rendered once at write time — the ' +
    'screen emits it verbatim, no markdown render at read), and the echoed locale. Returns 503 when ' +
    'no effective T&C is provisioned for the Pariwar (a server-side gap, not a client error — the ' +
    'screen renders a graceful unavailable state). Requires a member session.',
  tags: memberTermsTags,
  responses: {
    200: { description: 'Current effective T&C', content: jsonOf(memberTermsComponents.MemberTermsResponse) },
    401: memberTermsAuth,
    503: errorResponse('No effective T&C is provisioned for this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/terms/accept',
  summary: 'Signup T&C — accept the current effective T&C (records a tc_acceptance consent)',
  description:
    'Records a tc_acceptance consent_records entry (consent_artifact_ref = the resolved tcVersionId, ' +
    'granted_via_actor = member_self) via the audit-or-throw chain (write the audit line FIRST, ' +
    'thread its id into recordConsent, all inside one member scope-tx; a compensating audit line is ' +
    'emitted on rollback). The effective version is resolved SERVER-SIDE (the client tcVersionId is ' +
    'an advisory staleness signal); if no effective T&C is resolvable the accept fails atomically ' +
    '(409, no orphan consent/audit). Requires a member session.',
  tags: memberTermsTags,
  request: { body: { content: jsonOf(memberTermsComponents.MemberTermsAcceptRequest), required: true } },
  responses: {
    200: { description: 'T&C accepted', content: jsonOf(memberTermsComponents.MemberTermsAcceptResponse) },
    400: errorResponse('Request validation failed'),
    401: memberTermsAuth,
    409: errorResponse('Member not found / terminal, or no effective T&C is resolvable'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.6b — signup ₹110 Vyawastha Shulk (member-session-gated; the wizard's final step) ──
// intent (build the server-authoritative upi://pay URL + the tr idempotency nonce) + confirm
// (self-attest the UTR → ALWAYS persist the AR-67 receipt; emit member.vyawastha_shulk_paid +
// member.lock_in_entered ONLY when all five conditions hold — the load-bearing gate, AC2) + status.
const vyawasthaShulkTags = ['member-vyawastha-shulk'];
const vyawasthaShulkAuth = errorResponse('Authentication required');

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/vyawastha-shulk/intent',
  summary: 'Signup fee — build the ₹110 Vyawastha Shulk UPI Intent URL',
  description:
    'Returns a SERVER-constructed UPI Intent URL (upi://pay?pa={trust VPA}&am={110}&cu=INR&' +
    'tn=signup-shulk-{memberId}&tr=signup-{memberId}-{nonce}) — the VPA + amount are resolved ' +
    'server-side from config (never client-supplied). Echoes the `tr` idempotency nonce for the ' +
    'confirm step. 503 when the trust VPA is unconfigured (a server gap). Requires a member session.',
  tags: vyawasthaShulkTags,
  responses: {
    200: { description: 'UPI Intent URL + tr', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkIntentResponse) },
    401: vyawasthaShulkAuth,
    503: errorResponse('The trust VPA is not configured (vyawastha_shulk.unconfigured)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/vyawastha-shulk/confirm',
  summary: 'Signup fee — self-attest the UTR → persist the receipt + the GATED lock-in transition',
  description:
    'Persists a vyawastha_shulk_receipts row ALWAYS (AR-67 indefinite retention; idempotent on the ' +
    '`tr` — a re-confirm returns the existing receipt without a second insert or re-emit). Captures ' +
    'the optional 6-digit Reference Code (D2 port seam — stored, NOT validated). Then evaluates the ' +
    '5-condition lock-in gate (KYC + nominees + medical + T&C + the receipt); emits ' +
    'member.vyawastha_shulk_paid (pending-fee → lock-in) + member.lock_in_entered (with the FR-8 ' +
    'lock_in_days_at_join snapshot) ONLY when all five hold — otherwise the receipt persists, no ' +
    'event fires, and `outstanding` names the incomplete step(s). 503 lock_in.policy_unavailable when ' +
    'the gate passes but niy.lock-in.policy is unprovisioned (receipt kept; idempotent re-confirm ' +
    'completes once provisioned). Requires a member session.',
  tags: vyawasthaShulkTags,
  request: { body: { content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkConfirmRequest), required: true } },
  responses: {
    200: { description: 'Receipt persisted (lock-in entered, or outstanding steps listed)', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkConfirmResponse) },
    400: errorResponse('Validation failed (bad UTR format or Reference Code)'),
    401: vyawasthaShulkAuth,
    409: errorResponse('Member not found / terminal state'),
    503: errorResponse('The lock-in policy is not provisioned for this Pariwar (lock_in.policy_unavailable)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/member/vyawastha-shulk/status',
  summary: 'Signup fee — the member’s paid / lock-in status',
  description:
    'Returns whether the member has paid (a receipt exists), the latest receipt’s validThrough, ' +
    'whether lock-in has been entered, and any still-outstanding pre-payment steps. Requires a ' +
    'member session.',
  tags: vyawasthaShulkTags,
  responses: {
    200: { description: 'Paid / lock-in status', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkStatusResponse) },
    401: vyawasthaShulkAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 3.8 — annual renewal surface (renewal-status read + renew intent/confirm) ────────────────
registry.registerPath({
  method: 'get',
  path: '/api/v1/member/vyawastha-shulk/renewal-status',
  summary: 'Renewal — the canonical FR-12A vyawastha_shulk_status payload',
  description:
    'Returns the renewal/validity status Epic 4’s Validity Service (FR-12A) consumes: paid_through ' +
    '(latest receipt valid_through), days_until_lapse (ceil-clamped days to the valid_through + 91d ' +
    'grace-end/lapse boundary), in_renewal_grace (true iff the member’s state is active-in-grace), and ' +
    'grace_remaining_days. Computed live per request → within the ≤60s freshness invariant. Requires a ' +
    'member session.',
  tags: vyawasthaShulkTags,
  responses: {
    200: { description: 'Renewal/validity status', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkRenewalStatusResponse) },
    401: vyawasthaShulkAuth,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/vyawastha-shulk/renew/intent',
  summary: 'Renewal — build the annual ₹ Vyawastha Shulk UPI Intent URL',
  description:
    'Identical to the signup intent (server-authoritative VPA + amount from config; `tr` idempotency ' +
    'nonce) but with a renewal `tn` grammar (renewal-shulk-{memberId}-{year}). Requires a member ' +
    'session. 503 when the trust VPA is unconfigured.',
  tags: vyawasthaShulkTags,
  responses: {
    200: { description: 'UPI Intent URL + tr', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkIntentResponse) },
    401: vyawasthaShulkAuth,
    503: errorResponse('The trust VPA is not configured (vyawastha_shulk.unconfigured)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member/vyawastha-shulk/renew/confirm',
  summary: 'Renewal — self-attest the UTR → persist the receipt + emit the renewal event',
  description:
    'Persists a vyawastha_shulk_receipts row (server-stamped valid_through = now + 365d; idempotent on ' +
    'the `tr`) and emits member.vyawastha_shulk_paid (kind: renewal) in the same scope-tx. A renewing ' +
    'member is already post-lock-in, so there is NO lock-in gate and renewal NEVER re-applies lock-in ' +
    '(the reducer routes active-in-grace/lapsed-unpaid → active, and is identity from active). 409 when ' +
    'the member is in a terminal/pre-active state (renewal requires a post-lock-in member). Requires a ' +
    'member session.',
  tags: vyawasthaShulkTags,
  request: { body: { content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkConfirmRequest), required: true } },
  responses: {
    200: { description: 'Receipt persisted + renewal event emitted', content: jsonOf(vyawasthaShulkComponents.VyawasthaShulkRenewalConfirmResponse) },
    400: errorResponse('Validation failed (bad UTR format)'),
    401: vyawasthaShulkAuth,
    409: errorResponse('Member not found / not in a renewable state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

const generator = new OpenApiGeneratorV31(registry.definitions);

const doc = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'TWT API v1',
    version: '0.0.0-substrate',
    description:
      'TWT API contract surface — generated from Zod schemas in packages/contracts/. ' +
      'Story 1.4 substrate; substantive routes land at apps/api/ Stories 1.9+.',
  },
  servers: [{ url: 'https://twt.local/api/v1', description: 'placeholder' }],
});

const yamlOutput = yaml.stringify(doc, {
  // Explicit sortMapEntries: false preserves insertion order (the generator's
  // order is fixed by registration sequence). lineWidth: 0 disables
  // line-wrapping so re-runs in different terminal widths produce byte-identical
  // output.
  sortMapEntries: false,
  lineWidth: 0,
});

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../../../openapi/v1.yaml');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, yamlOutput, { encoding: 'utf8' });

console.log(`✓ openapi/v1.yaml written (${yamlOutput.length} bytes)`);
