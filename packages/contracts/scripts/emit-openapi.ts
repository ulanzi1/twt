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
// Story 10.30 — the directory-publication kill-switch admin DTOs (super_admin-only status read + flip).
const { DirectoryPublicationStatusResponse, SetDirectoryPublicationRequest } = await import(
  '../src/directory-publication/index.js'
);
// Story 11b.3a — the nominee-bank masking-schedule admin DTOs (super_admin-only schedule read +
// governed change). ⛔ The setting is a discriminated union of cl.10(c)'s three, ⛔ never a boolean.
const { NomineeBankMaskingScheduleResponse, SetNomineeBankMaskingRequest } = await import(
  '../src/nominee-bank-masking/index.js'
);
// Story 11b.13 — the per-Pariwar DRIVE TARGET admin DTOs. TWO resources under TWO keys: the target
// (`pariwar_admin`) and the reveal switches (⛔ `super_admin` ONLY). ⛔ Never one resource with a
// role-shaped response — that would put the authority boundary inside a handler.
const {
  DriveTargetResponse,
  DriveTargetVisibilityResponse,
  SetDriveTargetRequest,
  SetDriveTargetVisibilityRequest,
} = await import('../src/drive-target/index.js');
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

// Story 10.30 — directory-publication kill-switch components (the status read + the governed flip).
const directoryPublicationComponents = {
  DirectoryPublicationStatusResponse: DirectoryPublicationStatusResponse.openapi(
    'DirectoryPublicationStatusResponse',
  ),
  SetDirectoryPublicationRequest: SetDirectoryPublicationRequest.openapi(
    'SetDirectoryPublicationRequest',
  ),
} as const;
for (const [name, schema] of Object.entries(directoryPublicationComponents)) {
  registry.register(name, schema);
}

// Story 11b.3a — nominee-bank masking-schedule components (the schedule read + the governed change).
// ⛔ The SETTING is a discriminated union of `2026-08-28-160` cl.10(c)'s three (`after_days: 0` /
// `after_days: N` / `permanent`), ⛔ never a boolean: cl.10(d) rules a later "simplification" to one
// a DEFECT, not a cleanup.
const nomineeBankMaskingComponents = {
  NomineeBankMaskingScheduleResponse: NomineeBankMaskingScheduleResponse.openapi(
    'NomineeBankMaskingScheduleResponse',
  ),
  SetNomineeBankMaskingRequest: SetNomineeBankMaskingRequest.openapi(
    'SetNomineeBankMaskingRequest',
  ),
} as const;
for (const [name, schema] of Object.entries(nomineeBankMaskingComponents)) {
  registry.register(name, schema);
}

// Story 11b.13 — per-Pariwar drive-target components. FOUR shapes across TWO resources, because
// `2026-09-04-190` cl.7 splits SETTING the figure from REVEALING it and Decision `2026-09-06-203`
// made that split structural (two keys, two DB records, two route gates).
// ⛔⛔ The target is STRICTLY POSITIVE on the wire (`.positive()`, ⛔ never `.nonnegative()`): Story
// 11b.14's meter divides by it, so ₹0 is a division by zero — and a different state from "no target
// set", which is the ABSENCE of a schedule row (`configured: false`).
const driveTargetComponents = {
  DriveTargetResponse: DriveTargetResponse.openapi('DriveTargetResponse'),
  SetDriveTargetRequest: SetDriveTargetRequest.openapi('SetDriveTargetRequest'),
  DriveTargetVisibilityResponse: DriveTargetVisibilityResponse.openapi(
    'DriveTargetVisibilityResponse',
  ),
  SetDriveTargetVisibilityRequest: SetDriveTargetVisibilityRequest.openapi(
    'SetDriveTargetVisibilityRequest',
  ),
} as const;
for (const [name, schema] of Object.entries(driveTargetComponents)) {
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

// ── Story 10.30 — the per-Pariwar directory-publication KILL SWITCH (super_admin-only; audited) ──
// The administrative surface Decision 2026-08-21-147 cl.1 made a LAUNCH GATE for the public Member
// Directory. The mechanism shipped at Story 11a.3; these are the routes that make it operable by a
// human without database access. ⚠ The control is NOT immediate — /members is edge_cacheable with
// s-maxage=300, so a pulled Pariwar keeps being served from warm PoPs, per page number, until those
// entries expire (2026-08-21-145 cl.5(e)).
const directoryPublicationTags = ['directory-publication'];
const directoryPublicationParams = z.object({ pariwarId: z.string().uuid() });
const directoryPublicationAuth = errorResponse('Authentication required');
const directoryPublicationForbidden = errorResponse(
  'Forbidden — requires pariwar.manage_directory_publication at pariwar scope (super_admin only)',
);

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/directory-publication/status',
  summary: "Read the Pariwar's directory-publication kill-switch state",
  description:
    "Returns whether the Pariwar's public Member Directory is published, plus the last-changing " +
    'admin display name, rationale and timestamp. `configured: false` means no row was ever written ' +
    '(the default-enabled posture) and is reported EXPLICITLY — an unconfigured Pariwar and a ' +
    'deliberately re-enabled one are different facts. Requires pariwar.manage_directory_publication ' +
    'at pariwar scope.',
  tags: directoryPublicationTags,
  request: { params: directoryPublicationParams },
  responses: {
    200: {
      description: 'The current directory-publication state',
      content: jsonOf(directoryPublicationComponents.DirectoryPublicationStatusResponse),
    },
    401: directoryPublicationAuth,
    403: directoryPublicationForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/directory-publication/status',
  summary: "Flip the Pariwar's directory-publication kill switch (rationale required; audited)",
  description:
    "Publishes or unpublishes the Pariwar's public Member Directory. Moves in BOTH directions. A " +
    'non-empty rationale is REQUIRED and is rejected at the contract boundary with a 400 when absent. ' +
    "The acting admin's display name is resolved SERVER-SIDE from users.display_name and is never " +
    'accepted from the caller. Writes a §1.5 hash-chain audit line covering the same transaction as ' +
    'the state change. The effect is NOT instantaneous on the public surface: /members is edge-cached ' +
    'with s-maxage=300, so warm PoPs keep serving the prior state, per page number, until those ' +
    'entries expire. Requires pariwar.manage_directory_publication at pariwar scope.',
  tags: directoryPublicationTags,
  request: {
    params: directoryPublicationParams,
    body: {
      content: jsonOf(directoryPublicationComponents.SetDirectoryPublicationRequest),
      required: true,
    },
  },
  responses: {
    200: {
      description: 'The updated directory-publication state',
      content: jsonOf(directoryPublicationComponents.DirectoryPublicationStatusResponse),
    },
    400: errorResponse('Request validation failed (e.g. an empty or whitespace-only rationale)'),
    401: directoryPublicationAuth,
    403: directoryPublicationForbidden,
    409: errorResponse("The acting admin has no users.display_name (admin.display_name_missing)"),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 11b.3a — the per-Pariwar NOMINEE-BANK MASKING SCHEDULE (super_admin-only; audited) ──
// `2026-08-28-160` cl.10(b)-(d)'s knob, made operable by a human WITHOUT database access. The holder
// is a RULING: `2026-09-02-178` (Trustee Panel) ruled cl.10(b)'s "Trust-Admin controlled, per
// Pariwar" speaks to AUTHORITY and means the TRUST — per-Pariwar in SCOPE, central in AUTHORITY.
// pariwar_admin is FORECLOSED.
// ⛔⛔ [Review, 11b.11] AS OF `2026-09-04-190` cl.1, THIS SCHEDULE HAS NO PUBLIC CONSUMER — the
// /sahyog-vivran domain read no longer resolves it, and the coordinates it used to govern are
// structurally absent from that wire regardless of this setting. Do not describe it as a live
// public-surface control until it has a consumer again (`2026-09-04-190` cl.4 retains the
// machinery dormant, not live).
const nomineeBankMaskingTags = ['nominee-bank-masking'];
const nomineeBankMaskingParams = z.object({ pariwarId: z.string().uuid() });
const nomineeBankMaskingAuth = errorResponse('Authentication required');
const nomineeBankMaskingForbidden = errorResponse(
  'Forbidden — requires pariwar.manage_nominee_bank_masking at pariwar scope (super_admin only)',
);

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/nominee-bank-masking/schedule',
  summary: "Read the Pariwar's nominee-bank masking schedule",
  description:
    "Returns the masking setting recorded for the Pariwar's nominee bank details, plus the " +
    'last-changing admin display name, rationale, effective-from instant and schedule version. ' +
    '`configured: false` means NO schedule row was ever written, which under Decision ' +
    '2026-09-02-179 cl.1 (D8-default) resolves FAIL-OPEN. That is reported EXPLICITLY: an ' +
    'unconfigured Pariwar and a Trust that deliberately chose a long window are different facts. ' +
    '⚠ As of Story 11b.11 (`2026-09-04-190` cl.1) this setting has NO PUBLIC CONSUMER — the public ' +
    'Sahyog Vivran page no longer renders nominee bank coordinates at all, so this schedule governs ' +
    'nothing currently visible; it is retained dormant, not live. Requires ' +
    'pariwar.manage_nominee_bank_masking at pariwar scope.',
  tags: nomineeBankMaskingTags,
  request: { params: nomineeBankMaskingParams },
  responses: {
    200: {
      description: 'The masking schedule in force',
      content: jsonOf(nomineeBankMaskingComponents.NomineeBankMaskingScheduleResponse),
    },
    401: nomineeBankMaskingAuth,
    403: nomineeBankMaskingForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/nominee-bank-masking/schedule',
  summary: "Set the Pariwar's nominee-bank masking schedule (rationale required; audited)",
  description:
    "Sets how long the Pariwar's nominee bank details stay publicly visible after a Sahyog Drive " +
    'closes — 2026-08-28-160 cl.10(c)\'s three settings: 0 days (mask immediately), N days, or ' +
    'permanent masking. Moves in EVERY direction: cl.10(c) requires the knob stay reversible and ' +
    're-configurable, and there is no "already masked, cannot unmask" branch. The prior window is ' +
    'CLOSED and a new one opened, so every superseded window survives as a governance trail. A ' +
    'non-empty rationale is REQUIRED and is rejected at the contract boundary with a 400 when ' +
    "absent. The acting admin's display name is resolved SERVER-SIDE from users.display_name and " +
    'is never accepted from the caller, and the effective-from instant is the SERVER\'s — a ' +
    'caller-supplied one would allow back-dating a window. Writes a §1.5 hash-chain audit line ' +
    'covering the same transaction as the change. ⚠ As of Story 11b.11 (`2026-09-04-190` cl.1) ' +
    'this schedule has NO PUBLIC CONSUMER: the public Sahyog Vivran page never renders nominee ' +
    'bank coordinates, masked or otherwise, so a change here is not reflected on any public ' +
    'surface — it is retained dormant pending a future consumer. ' +
    'Requires pariwar.manage_nominee_bank_masking at pariwar scope.',
  tags: nomineeBankMaskingTags,
  request: {
    params: nomineeBankMaskingParams,
    body: {
      content: jsonOf(nomineeBankMaskingComponents.SetNomineeBankMaskingRequest),
      required: true,
    },
  },
  responses: {
    200: {
      description: 'The updated masking schedule',
      content: jsonOf(nomineeBankMaskingComponents.NomineeBankMaskingScheduleResponse),
    },
    400: errorResponse(
      'Request validation failed (an empty or whitespace-only rationale, or a day count outside 0…36500)',
    ),
    401: nomineeBankMaskingAuth,
    403: nomineeBankMaskingForbidden,
    409: errorResponse("The acting admin has no users.display_name (admin.display_name_missing)"),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 11b.13 — the per-Pariwar DRIVE TARGET (`2026-09-04-190` cl.7, Trustee-ratified) ──
// FOUR routes under TWO DIFFERENT GATES, and the split is deliberately visible in the path table:
// a Pariwar Admin SETS the whole-INR figure; ⛔ only a Super Admin REVEALS it.
// ⭐⭐ TWO RESOURCES, ⛔ NOT one with a role-shaped response. A single endpoint returning the reveal
// flags "when the caller also holds the reveal key" would put an authority boundary INSIDE A
// HANDLER — the exact shape Decision `2026-09-06-203`'s two-key (D1) and two-record (D2) splits
// exist to keep out of handlers. A `pariwar_admin` gets a 403 on the visibility routes.
// ⚠⛔ AND NOTHING RENDERS THE TARGET. cl.7(b) makes the figure invisible to members and the public;
// Story 11b.14 is the first consumer and reads it SERVER-SIDE only. ⛔ It appears on NO public or
// member path in this document, and must not.
const driveTargetTags = ['drive-target'];
const driveTargetParams = z.object({ pariwarId: z.string().uuid() });
const driveTargetAuth = errorResponse('Authentication required');
const driveTargetForbidden = errorResponse(
  'Forbidden — requires pariwar.manage_drive_target at pariwar scope (pariwar_admin or super_admin)',
);
// ⭐ 404 — code review Pass 2 / G2. A REAL, TESTED status on all four routes that was documented on
// NONE of them. It is a DIFFERENT LAYER from the 403: scope resolution never attaches a Pariwar the
// acting admin has no grant for at all, so the route is "not found" rather than "forbidden".
// ⛔ Without this a generated client treats it as a transport failure or a missing endpoint.
const driveTargetNotFound = errorResponse(
  'No grant for this Pariwar — scope resolution did not attach it. Distinct from 403: 404 means ' +
    '"this Pariwar is not yours", 403 means "it is yours, but you lack this key"',
);
const driveTargetRevealForbidden = errorResponse(
  'Forbidden — requires pariwar.manage_drive_target_visibility at pariwar scope (super_admin ONLY; ' +
    'a pariwar_admin holds the WRITE key and is denied here by ruling, 2026-09-04-190 cl.7(c))',
);

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/drive-target',
  summary: "Read the Pariwar's drive target",
  description:
    "Returns the whole-rupee target recorded for the Pariwar's Sahyog Drives, plus the " +
    'last-changing admin display name, rationale, effective-from instant and schedule version. ' +
    '`configured: false` means NO target has ever been set, which Story 11b.14 renders as NO ' +
    'progress bar at all — a different fact from a Pariwar that set a small target, which is why ' +
    'it is reported explicitly rather than inferred from a null. The `version` returned here MUST ' +
    'be echoed back as `expectedVersion` on the next PUT (Decision 2026-09-05-201 cl.4/cl.5). ' +
    'The target is NOT shown to members or the public in any state (Decision 2026-09-04-190 ' +
    'cl.7(b)); revealing it is a separate, super_admin-only act on a separate resource. ' +
    'Requires pariwar.manage_drive_target at pariwar scope.',
  tags: driveTargetTags,
  request: { params: driveTargetParams },
  responses: {
    200: {
      description: 'The drive target in force',
      content: jsonOf(driveTargetComponents.DriveTargetResponse),
    },
    401: driveTargetAuth,
    403: driveTargetForbidden,
    404: driveTargetNotFound,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/drive-target',
  summary: "Set the Pariwar's drive target (rationale + expectedVersion required; audited)",
  description:
    "Sets the whole-rupee figure the Pariwar's drives aim to raise — the SAME target for every " +
    'drive in the Pariwar (Decision 2026-09-04-189 cl.2(d)); there is no per-drive override. The ' +
    'prior target is CLOSED and a new one opened, so every superseded target survives as a ' +
    'governance trail. The target must be a whole number of rupees, STRICTLY GREATER THAN ZERO ' +
    '(Story 11b.14 divides by it, so 0 is a division by zero — and is a different state from "no ' +
    'target set") and within the data-sanity ceiling. A non-empty rationale is REQUIRED and is ' +
    'rejected at the contract boundary with a 400 when absent. ' +
    '`expectedVersion` is REQUIRED and nullable (null = "I believe this Pariwar has no target ' +
    'yet"): a mismatch means someone else changed the target since you read it, and returns 409 ' +
    'rather than silently overwriting their change with your rationale attached. An optional ' +
    '`Idempotency-Key` header is evaluated BEFORE that version check — never after: reversed, a ' +
    'legitimate retry after a timeout would carry a stale version and be told "someone else ' +
    'changed this" when the someone was itself. ' +
    "The acting admin's display name is resolved SERVER-SIDE from users.display_name and is never " +
    "accepted from the caller, and the effective-from instant is the SERVER's. Writes a §1.5 " +
    'hash-chain audit line, written on a separate service connection and paired with a compensating ' +
    'entry if the change fails — NOT in the same transaction as the change itself. The line\'s id ' +
    'is recorded on the written row as its audit anchor. ' +
    'SETTING IS NEVER REVEALING: a newly set target stays hidden from members and the public until ' +
    'a super_admin reveals it on the separate visibility resource. ' +
    'Requires pariwar.manage_drive_target at pariwar scope.',
  tags: driveTargetTags,
  request: {
    params: driveTargetParams,
    body: { content: jsonOf(driveTargetComponents.SetDriveTargetRequest), required: true },
  },
  responses: {
    200: {
      description: 'The updated drive target',
      content: jsonOf(driveTargetComponents.DriveTargetResponse),
    },
    400: errorResponse(
      'Request validation failed (an empty rationale, or a target that is not a whole number of ' +
        'rupees strictly greater than 0 and within the ceiling). Note the rationale is TRIMMED ' +
        'before both length checks, so a whitespace-only value fails minLength and a maxLength ' +
        'value with surrounding whitespace is accepted. ' +
        'ALSO: an unusable Idempotency-Key — sent more than once, or blank ' +
        '(pariwar.drive_target_idempotency_key_invalid); an unusable key is REFUSED rather than ' +
        'silently ignored, because a caller that believes it is protected and is not will retry ' +
        'into a duplicate. ' +
        'ALSO, on a multi-node deployment only: pariwar.drive_target_effective_from_skew, when ' +
        "this node's clock trails the open head's by more than the permitted skew. The caller " +
        'supplies no instant, so this reflects server clock drift, not the request.',
    ),
    401: driveTargetAuth,
    403: driveTargetForbidden,
    404: driveTargetNotFound,
    409: errorResponse(
      'The acting admin has no users.display_name (admin.display_name_missing); OR the ' +
        'expectedVersion does not match the current target (pariwar.drive_target_version_conflict) ' +
        '— re-read and re-submit; OR a change with this Idempotency-Key is already in progress',
    ),
    422: errorResponse(
      'BACKSTOP ONLY — not reachable through this API. The change is malformed as a GOVERNANCE ' +
        'RECORD (pariwar.drive_target_ungoverned_change). Every condition that raises it is ' +
        'pre-empted upstream: a blank rationale fails contract validation (400), the audit anchor ' +
        'is always server-minted, a missing display name returns 409, and a missing grant returns ' +
        '403. Documented because the domain accessor can still raise it for a non-HTTP caller',
    ),
    503: errorResponse(
      'The idempotency record could not be written (idempotency.record_failed). The change may ' +
        'well have been applied — retry WITH THE SAME Idempotency-Key, which is exactly what the ' +
        'key makes safe',
    ),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/drive-target/visibility',
  summary: "Read the Pariwar's drive-target reveal switches (super_admin only)",
  description:
    'Returns the two INDEPENDENT reveal switches — reveal-to-members and reveal-to-public — plus ' +
    'the last-changing admin display name, rationale and update instant. `configured: false` ' +
    'means no reveal decision has ever been recorded, which resolves HIDDEN FROM EVERYONE ' +
    '(Decision 2026-09-04-190 cl.7(b)) — a fail-CLOSED default, and the operator is told which ' +
    'state they are looking at because "nobody chose this" and "the Trust decided to hide it" are ' +
    'different facts. ' +
    'This is a SEPARATE RESOURCE under a SEPARATE KEY on purpose: a pariwar_admin holds the target ' +
    'write key and is denied HERE, so the switches are visible only to a super_admin without any ' +
    'handler branching on the caller\'s role. ' +
    'Requires pariwar.manage_drive_target_visibility at pariwar scope (super_admin ONLY).',
  tags: driveTargetTags,
  request: { params: driveTargetParams },
  responses: {
    200: {
      description: 'The reveal posture in force',
      content: jsonOf(driveTargetComponents.DriveTargetVisibilityResponse),
    },
    401: driveTargetAuth,
    403: driveTargetRevealForbidden,
    404: driveTargetNotFound,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/p/{pariwarId}/admin/drive-target/visibility',
  summary: "Set the Pariwar's drive-target reveal switches (super_admin only; audited)",
  description:
    'Decides whether the Pariwar\'s drive target may be shown to members and/or to the ' +
    'unauthenticated public — a DISCLOSURE act, reserved to the Trust by Decision 2026-09-04-190 ' +
    'cl.7(c). The two switches are INDEPENDENT, not levels: three of the four combinations are ' +
    'accepted, and revealing to members without revealing publicly is the ordinary case. ' +
    'THE ONE REFUSED COMBINATION is public-revealed while members are hidden, which would show the ' +
    'unauthenticated internet more than a member of the Pariwar the figure belongs to (Decision ' +
    '2026-09-04-189 cl.3); it returns 422 and is also refused by a database CHECK. ' +
    'A non-empty rationale is REQUIRED. This request CANNOT carry a target — a reveal can never ' +
    'change what is being revealed. Writes a §1.5 hash-chain audit line. ' +
    'Requires pariwar.manage_drive_target_visibility at pariwar scope (super_admin ONLY).',
  tags: driveTargetTags,
  request: {
    params: driveTargetParams,
    body: {
      content: jsonOf(driveTargetComponents.SetDriveTargetVisibilityRequest),
      required: true,
    },
  },
  responses: {
    200: {
      description: 'The updated reveal posture',
      content: jsonOf(driveTargetComponents.DriveTargetVisibilityResponse),
    },
    400: errorResponse(
      'Request validation failed (an empty or whitespace-only rationale — the value is TRIMMED ' +
        'before both length checks). ALSO: an unusable Idempotency-Key, sent more than once or ' +
        'blank (pariwar.drive_target_idempotency_key_invalid)',
    ),
    401: driveTargetAuth,
    403: driveTargetRevealForbidden,
    404: driveTargetNotFound,
    409: errorResponse(
      'The acting admin has no users.display_name (admin.display_name_missing); OR a change with ' +
        'this Idempotency-Key is already in progress ' +
        '(pariwar.drive_target_idempotency_in_progress) — this route is idempotency-wrapped too',
    ),
    422: errorResponse(
      'The target cannot be revealed to the public while it is hidden from members ' +
        '(pariwar.drive_target_visibility_invalid) — also refused by a database CHECK. ' +
        '(pariwar.drive_target_ungoverned_change is registered at 422 but is BACKSTOP ONLY, not ' +
        'reachable through this API — see the target PUT for why)',
    ),
    503: errorResponse(
      'The idempotency record could not be written (idempotency.record_failed) — retry WITH THE ' +
        'SAME Idempotency-Key',
    ),
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

// ── Story 10.1 — the Helpdesk create-ticket primitive (tenant-scoped) ─────────
// The FIRST Epic-10 route: POST /api/v1/p/{pariwarId}/helpdesk/tickets. The member/operator/admin
// surfaces (10.2/10.3/10.4) add their own routes on this substrate.
const { CreateTicketRequest: CreateTicketRequestSchema, CreateTicketResponse: CreateTicketResponseSchema } =
  await import('../src/helpdesk/index.js');
const CreateTicketRequestComponent = CreateTicketRequestSchema.openapi('CreateTicketRequest');
const HelpdeskTicketComponent = CreateTicketResponseSchema.openapi('HelpdeskTicket');
const helpdeskPariwarParams = z.object({ pariwarId: z.string().uuid() });

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/helpdesk/tickets',
  summary: 'Create + route a helpdesk ticket (the Epic-10 primitive)',
  description:
    'Resolves member_scope_context from the subject, snapshots the in-force per-Pariwar routing-policy ' +
    'version, deterministically routes the ticket (category × scope → target role + scope + SLA budgets), ' +
    'persists the ticket + genesis event + projected state in one transaction, and audits the routing ' +
    'decision (withCompensatingAudit). Tenant-scoped; today only an authenticated admin/operator session ' +
    'may call this route (the FR-88 protected-surface write rate-limit applies) — the request shape also ' +
    'supports created_via: member_app for forward-compatibility with Story 10.2, which reuses this same ' +
    'schema for the member-authenticated route. Returns the created, routed ticket.',
  tags: ['helpdesk'],
  request: {
    params: helpdeskPariwarParams,
    body: { content: jsonOf(CreateTicketRequestComponent), required: true },
  },
  responses: {
    201: { description: 'Ticket created + routed', content: jsonOf(HelpdeskTicketComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized for this Pariwar'),
    404: errorResponse('Pariwar not found'),
    409: errorResponse('Acting operator has no display name configured (helpline_call only)'),
    429: errorResponse('Rate limit exceeded (FR-88 protected-surface write limit)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.2 — the member-facing Helpdesk surface (member-session-gated) ─────
// The member app's ticket-filing surface on the 10.1 substrate: a single-shot multipart create
// (Turnstile-gated) + ownership-scoped reads + the registry-driven category picker + signed-URL
// attachment access. `/api/v1/p/{pariwarId}/member/helpdesk/...`; the member JWT is the tenancy
// authority (the path pariwarId is validated against it).
const {
  MemberCreateTicketRequest: MemberCreateTicketRequestSchema,
  MemberTicketDetailResponse: MemberTicketDetailResponseSchema,
  MemberTicketListResponse: MemberTicketListResponseSchema,
  HelpdeskCategoryListResponse: HelpdeskCategoryListResponseSchema,
  HelpdeskAttachmentUrlResponse: HelpdeskAttachmentUrlResponseSchema,
} = await import('../src/helpdesk/index.js');
const MemberCreateTicketFieldsComponent = MemberCreateTicketRequestSchema.openapi('MemberCreateTicketFields');
const MemberTicketDetailComponent = MemberTicketDetailResponseSchema.openapi('MemberTicketDetail');
const MemberTicketListComponent = MemberTicketListResponseSchema.openapi('MemberTicketList');
const HelpdeskCategoryListComponent = HelpdeskCategoryListResponseSchema.openapi('HelpdeskCategoryList');
const HelpdeskAttachmentUrlComponent = HelpdeskAttachmentUrlResponseSchema.openapi('HelpdeskAttachmentUrl');

const helpdeskTicketParams = z.object({ pariwarId: z.string().uuid(), ticketId: z.string().uuid() });
const helpdeskAttachmentParams = z.object({
  pariwarId: z.string().uuid(),
  ticketId: z.string().uuid(),
  attachmentIndex: z.string(),
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/tickets',
  summary: 'File a helpdesk ticket from the member app (single-shot multipart)',
  description:
    'Member-session-gated + Turnstile-gated (FR-88) + Idempotency-Key-gated (review-hardening). ' +
    'Requires the `x-turnstile-token` and `Idempotency-Key` HEADERS (verified/claimed before the ' +
    'multipart body is parsed at all — never multipart fields). Accepts multipart/form-data: the ' +
    'non-file fields (category, sub_category, subject, body) plus up to 5 attachment files ' +
    '(JPEG/PNG/PDF, 10 MiB each, 25 MiB combined). Forces created_via=member_app and ' +
    'subject_member_id=the session member; reuses the 10.1 domain routing + genesis orchestration ' +
    'verbatim. Returns the created ticket detail (status + routing target + SLA + the read-only ' +
    'opening thread entry) — 201 on a fresh create, or 200 if the Idempotency-Key replays an ' +
    'already-completed create (the ORIGINAL ticket, never a duplicate).',
  tags: ['helpdesk'],
  request: {
    params: helpdeskPariwarParams,
    body: {
      content: { 'multipart/form-data': { schema: MemberCreateTicketFieldsComponent } },
      required: true,
    },
  },
  responses: {
    200: { description: 'Replayed — an identical create with this Idempotency-Key already succeeded', content: jsonOf(MemberTicketDetailComponent) },
    201: { description: 'Ticket created + routed', content: jsonOf(MemberTicketDetailComponent) },
    400: errorResponse('Request validation failed, or a required header is missing'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Turnstile verification failed'),
    409: errorResponse('Routing policy misconfigured / create conflict / a matching Idempotency-Key claim is still in progress'),
    413: errorResponse('An attachment (or the combined attachment set) exceeds the size limit'),
    415: errorResponse('Unsupported attachment media type'),
    429: errorResponse('Rate limit exceeded (FR-88 protected-surface write limit)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/tickets',
  summary: "The member's own helpdesk tickets (newest-first)",
  tags: ['helpdesk'],
  request: { params: helpdeskPariwarParams },
  responses: {
    200: { description: "The member's own tickets", content: jsonOf(MemberTicketListComponent) },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/categories',
  summary: 'The in-force routing-policy category set (registry-driven)',
  tags: ['helpdesk'],
  request: { params: helpdeskPariwarParams },
  responses: {
    200: { description: 'Categories + subcategories from the in-force policy', content: jsonOf(HelpdeskCategoryListComponent) },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// Story 10.3 (AC5) — the OPERATOR (admin-session) category picker read. The same in-force
// routing-policy category set as the member categories route, adapted to the admin session and gated
// by the `helpdesk.create` permission (a caller who may file may read the category set). Reuses the
// HelpdeskCategoryList component.
registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/helpdesk/categories',
  summary: 'The in-force routing-policy category set for the operator picker (registry-driven)',
  tags: ['helpdesk'],
  request: { params: helpdeskPariwarParams },
  responses: {
    200: { description: 'Categories + subcategories from the in-force policy', content: jsonOf(HelpdeskCategoryListComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.create) for this Pariwar'),
    404: errorResponse('Pariwar not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/tickets/{ticketId}',
  summary: "One of the member's own tickets (status + routing + SLA + read-only thread)",
  tags: ['helpdesk'],
  request: { params: helpdeskTicketParams },
  responses: {
    200: { description: 'The owned ticket detail', content: jsonOf(MemberTicketDetailComponent) },
    401: errorResponse('Authentication required'),
    404: errorResponse('Ticket not found (or not owned — no enumeration oracle)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/tickets/{ticketId}/attachments/{attachmentIndex}/url',
  summary: "A short-lived signed URL for one of the member's own attachments",
  tags: ['helpdesk'],
  request: { params: helpdeskAttachmentParams },
  responses: {
    200: { description: 'A short-lived signed read URL', content: jsonOf(HelpdeskAttachmentUrlComponent) },
    401: errorResponse('Authentication required'),
    404: errorResponse('Attachment not found (or not owned)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.4 — the admin responder console + the member reply-append (round-trip) ─────────────
// The responder surface (`/api/v1/p/{pariwarId}/helpdesk/...`, gated by the new `helpdesk.respond`
// permission): the paginated queue with derived SLA/severity, the admin ticket detail, and the
// pick-up / reply / resolve transitions. PLUS the member-side reply-append (member-session-gated) that
// closes AC3's member→staff round-trip.
const {
  HelpdeskQueueResponse: HelpdeskQueueResponseSchema,
  HelpdeskAdminTicketDetailResponse: HelpdeskAdminTicketDetailResponseSchema,
  HelpdeskReplyRequest: HelpdeskReplyRequestSchema,
} = await import('../src/helpdesk/index.js');
const HelpdeskQueueComponent = HelpdeskQueueResponseSchema.openapi('HelpdeskQueue');
const HelpdeskAdminTicketDetailComponent = HelpdeskAdminTicketDetailResponseSchema.openapi('HelpdeskAdminTicketDetail');
const HelpdeskReplyRequestComponent = HelpdeskReplyRequestSchema.openapi('HelpdeskReplyRequest');

const helpdeskQueueQuery = z.object({
  state: z
    .enum(['open', 'in_progress', 'awaiting_member', 'resolved', 'closed', 'reopened'])
    .optional()
    .openapi({ description: 'Filter by lifecycle state' }),
  routed_to_role: z.string().optional().openapi({ description: '"My queue" — filter by the routed-to role' }),
  limit: z.coerce.number().int().positive().optional().openapi({ description: 'Page size (clamped to [1,200], default 50)' }),
  offset: z.coerce.number().int().nonnegative().optional().openapi({ description: 'Page offset (default 0)' }),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/helpdesk/queue',
  summary: 'The paginated responder queue (scope-respecting, with derived SLA + severity)',
  description:
    'Admin-session-gated + `helpdesk.respond` (pariwar-dimension). The Pariwar\'s tickets newest-first, ' +
    'filterable by lifecycle state + routed-to role ("my queue"), paginated (clampLimit-bounded). Each ' +
    'row carries the two derived SLA timers (running/breached/ms_remaining), the derived severity ' +
    '(breached ≻ due_soon ≻ on_track), and the cross-link ref presence.',
  tags: ['helpdesk'],
  request: { params: helpdeskPariwarParams, query: helpdeskQueueQuery },
  responses: {
    200: { description: 'The paginated responder queue', content: jsonOf(HelpdeskQueueComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.respond) for this Pariwar'),
    404: errorResponse('Pariwar not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/helpdesk/tickets/{ticketId}',
  summary: 'The admin ticket detail (full row + thread + SLA/severity + cross-links)',
  tags: ['helpdesk'],
  request: { params: helpdeskTicketParams },
  responses: {
    200: { description: 'The ticket detail', content: jsonOf(HelpdeskAdminTicketDetailComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.respond) for this Pariwar'),
    404: errorResponse('Ticket not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/helpdesk/tickets/{ticketId}/pick-up',
  summary: 'Pick up a ticket (open/reopened → in_progress)',
  tags: ['helpdesk'],
  request: { params: helpdeskTicketParams },
  responses: {
    200: { description: 'The updated ticket detail', content: jsonOf(HelpdeskAdminTicketDetailComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.respond) for this Pariwar'),
    404: errorResponse('Ticket not found'),
    409: errorResponse('Illegal transition for the ticket\'s current state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/helpdesk/tickets/{ticketId}/reply',
  summary: 'Reply asking the member for info (→ awaiting_member; notifies the member)',
  tags: ['helpdesk'],
  request: {
    params: helpdeskTicketParams,
    body: { content: jsonOf(HelpdeskReplyRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated ticket detail', content: jsonOf(HelpdeskAdminTicketDetailComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.respond) for this Pariwar'),
    404: errorResponse('Ticket not found'),
    409: errorResponse('Illegal transition for the ticket\'s current state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/helpdesk/tickets/{ticketId}/resolve',
  summary: 'Resolve a ticket with a closing message (→ resolved; notifies the member)',
  tags: ['helpdesk'],
  request: {
    params: helpdeskTicketParams,
    body: { content: jsonOf(HelpdeskReplyRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated ticket detail', content: jsonOf(HelpdeskAdminTicketDetailComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.respond) for this Pariwar'),
    404: errorResponse('Ticket not found'),
    409: errorResponse('Illegal transition for the ticket\'s current state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member/helpdesk/tickets/{ticketId}/reply',
  summary: 'Member replies to their own ticket (awaiting_member → in_progress)',
  description:
    'Member-session-gated (the ticket owner acting on their own ticket — no admin RBAC). Appends a ' +
    'helpdesk.member_replied event carrying the member\'s message and returns the updated member ticket ' +
    'detail. The reply surfaces in the responder thread and returns the ticket to the active queue.',
  tags: ['helpdesk'],
  request: {
    params: helpdeskTicketParams,
    body: { content: jsonOf(HelpdeskReplyRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated member ticket detail', content: jsonOf(MemberTicketDetailComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    404: errorResponse('Ticket not found (or not owned — no enumeration oracle)'),
    409: errorResponse('Illegal transition (the ticket is not awaiting a member reply)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.5 — the News/Blog admin surface + the public read (FR-51) ─────────
// Admin routes are `news.manage`-gated at `dimension: 'pariwar'` (403 on a missing/inert grant);
// the public list/detail is UNAUTHENTICATED (FR-74 public matrix). The status transitions guard
// legality (409) + author≠reviewer identity (403) + the bilingual requirement (422).
const {
  CreateDraftRequest: NewsCreateDraftRequest,
  UpdateDraftRequest: NewsUpdateDraftRequest,
  SubmitRequest: NewsSubmitRequest,
  ApproveRequest: NewsApproveRequest,
  ScheduleRequest: NewsScheduleRequest,
  PublishRequest: NewsPublishRequest,
  NewsPostResponse: NewsPostResponseSchema,
  NewsPostListResponse: NewsPostListResponseSchema,
} = await import('../src/news-blog/index.js');

const NewsCreateDraftRequestComponent = NewsCreateDraftRequest.openapi('NewsCreateDraftRequest');
const NewsUpdateDraftRequestComponent = NewsUpdateDraftRequest.openapi('NewsUpdateDraftRequest');
const NewsSubmitRequestComponent = NewsSubmitRequest.openapi('NewsSubmitRequest');
const NewsApproveRequestComponent = NewsApproveRequest.openapi('NewsApproveRequest');
const NewsScheduleRequestComponent = NewsScheduleRequest.openapi('NewsScheduleRequest');
const NewsPublishRequestComponent = NewsPublishRequest.openapi('NewsPublishRequest');
const NewsPostComponent = NewsPostResponseSchema.openapi('NewsPost');
const NewsPostListComponent = NewsPostListResponseSchema.openapi('NewsPostList');

const newsPariwarParams = z.object({ pariwarId: z.string().uuid() });
const newsPostParams = z.object({ pariwarId: z.string().uuid(), postId: z.string().uuid() });
const newsForbidden = errorResponse('Not authorized (news.manage) for this Pariwar');

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/news',
  summary: 'List the Pariwar\'s News/Blog posts (newest-first, paginated, status-filterable)',
  tags: ['news'],
  request: { params: newsPariwarParams },
  responses: {
    200: { description: 'The paginated post list', content: jsonOf(NewsPostListComponent) },
    401: errorResponse('Authentication required'),
    403: newsForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/news',
  summary: 'Create a News/Blog draft',
  tags: ['news'],
  request: {
    params: newsPariwarParams,
    body: { content: jsonOf(NewsCreateDraftRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The created draft', content: jsonOf(NewsPostComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: newsForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/news/{postId}',
  summary: 'Read a single News/Blog post (admin)',
  tags: ['news'],
  request: { params: newsPostParams },
  responses: {
    200: { description: 'The post', content: jsonOf(NewsPostComponent) },
    401: errorResponse('Authentication required'),
    403: newsForbidden,
    404: errorResponse('Post not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/p/{pariwarId}/news/{postId}',
  summary: 'Edit a draft (draft-only; edit-locked once submitted)',
  tags: ['news'],
  request: {
    params: newsPostParams,
    body: { content: jsonOf(NewsUpdateDraftRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated draft', content: jsonOf(NewsPostComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: newsForbidden,
    404: errorResponse('Post not found'),
    409: errorResponse('The post is not a draft (edit-locked)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/news/{postId}/submit',
  summary: 'Submit a draft for review (draft → submitted; reviewer_id ≠ author)',
  tags: ['news'],
  request: {
    params: newsPostParams,
    body: { content: jsonOf(NewsSubmitRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The submitted post', content: jsonOf(NewsPostComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized, or reviewer_id == author (author ≠ reviewer)'),
    404: errorResponse('Post not found'),
    409: errorResponse('Illegal transition for the post\'s current state'),
    422: errorResponse('Missing Hindi copy for a public/members-all post'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/news/{postId}/approve',
  summary: 'Approve a submitted post + record the non-author tone-review sign-off (submitted → approved)',
  tags: ['news'],
  request: {
    params: newsPostParams,
    body: { content: jsonOf(NewsApproveRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The approved post', content: jsonOf(NewsPostComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized, or the approver is the author (author ≠ approver)'),
    404: errorResponse('Post not found'),
    409: errorResponse('Illegal transition, or the tone-review gate denied'),
    422: errorResponse('Missing Hindi copy for a public/members-all post'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/news/{postId}/schedule',
  summary: 'Schedule an approved post for publish (approved → scheduled)',
  tags: ['news'],
  request: {
    params: newsPostParams,
    body: { content: jsonOf(NewsScheduleRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The scheduled post', content: jsonOf(NewsPostComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: newsForbidden,
    404: errorResponse('Post not found'),
    409: errorResponse('Illegal transition for the post\'s current state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/news/{postId}/publish',
  summary: 'Publish an approved post immediately (approved → published) + fan out to the audience',
  tags: ['news'],
  request: {
    params: newsPostParams,
    body: { content: jsonOf(NewsPublishRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The published post', content: jsonOf(NewsPostComponent) },
    401: errorResponse('Authentication required'),
    403: newsForbidden,
    404: errorResponse('Post not found'),
    409: errorResponse('Illegal transition for the post\'s current state'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// NOTE: the PUBLIC blog read (list + detail) is served by apps/public (Astro, unauthenticated) via
// the `getDb`/`withPublicScope` RLS-scoped read pattern (Story 2.5) — NOT an apps/api route — so it is
// deliberately NOT registered on this apps/api OpenAPI surface. The `PublicPostResponse` /
// `PublicPostListResponse` contract DTOs still exist (apps/public types its render against them).

// ── Story 10.6 — the bulk-operations `[PRIMITIVE]` transport contracts (FR-49) ─────────────────
// Register components/schemas only (no paths): this story ships NO apps/api route at all (the
// Scope Boundary — a bigger deviation from the 10.1 precedent than Story 1.7/1.8, which registered
// components ahead of their own Story 1.9+ routes). A future consuming surface (10.10/10.12/the
// notification family) registers its own `path` against these DTOs when it lands.
const { BulkExecuteRequest, BulkPreviewResponse, BulkResultResponse } = await import(
  '../src/bulk-operations/index.js'
);
registry.register('BulkExecuteRequest', BulkExecuteRequest.openapi('BulkExecuteRequest'));
registry.register('BulkPreviewResponse', BulkPreviewResponse.openapi('BulkPreviewResponse'));
registry.register('BulkResultResponse', BulkResultResponse.openapi('BulkResultResponse'));

// ── Story 10.7 — reports-&-exports library (TENANT-SCOPED admin surface; apps/api serves these) ──────
// The request/poll-status/list DTOs register as components + FOUR real `paths`: request (enqueue), list
// (the actor's own export history — review finding, closes the console's page-refresh gap), poll status,
// and the one-time authenticated download (which streams text/csv | application/json — NO response
// schema, the artifact bytes are streamed, never JSON-embedded; the 3.11 R1 rule).
const { ReportRequest, ReportRequestResponse, ReportStatusResponse, ReportExportListResponse } =
  await import('../src/reports/index.js');
const ReportRequestComponent = ReportRequest.openapi('ReportRequest');
const ReportRequestResponseComponent = ReportRequestResponse.openapi('ReportRequestResponse');
const ReportStatusResponseComponent = ReportStatusResponse.openapi('ReportStatusResponse');
const ReportExportListResponseComponent = ReportExportListResponse.openapi('ReportExportListResponse');
registry.register('ReportRequest', ReportRequestComponent);
registry.register('ReportRequestResponse', ReportRequestResponseComponent);
registry.register('ReportStatusResponse', ReportStatusResponseComponent);
registry.register('ReportExportListResponse', ReportExportListResponseComponent);

const reportsTags = ['reports'];
const reportsPariwarParams = z.object({ pariwarId: z.string().uuid() });
const reportsExportParams = z.object({ pariwarId: z.string().uuid(), id: z.string().uuid() });

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/admin/reports',
  summary: 'Request a report export (scope-respecting, PII-masked; enqueues an async build)',
  description:
    'Authorizes the actor against the report template\'s own permission key at their resolved scope, ' +
    'inserts a pending report_exports row (idempotent per (actor, report_type, params_hash)), and ' +
    'enqueues a REPORT_EXPORT_BUILD job. The build runs off the request path; poll GET :id for status. ' +
    'Requires the template\'s permission key at the actor\'s scope (e.g. member.export_roster).',
  tags: reportsTags,
  request: {
    params: reportsPariwarParams,
    body: { content: { 'application/json': { schema: ReportRequestComponent } }, required: true },
  },
  responses: {
    200: { description: 'Report export requested', content: { 'application/json': { schema: ReportRequestResponseComponent } } },
    400: errorResponse('Request validation failed / unknown report type'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — the report\'s permission key at this scope is required'),
    503: errorResponse('Report could not be queued — please try again'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/reports',
  summary: 'List the actor\'s own report exports (newest-first, bounded)',
  description:
    'Returns the requestor\'s OWN report_exports rows only (actor-scoped, not tenant-wide), newest-' +
    'first. Backs the admin console\'s export list so a page refresh does not lose knowledge of ' +
    'in-flight/ready exports.',
  tags: reportsTags,
  request: { params: reportsPariwarParams },
  responses: {
    200: { description: 'The actor\'s report exports', content: { 'application/json': { schema: ReportExportListResponseComponent } } },
    401: errorResponse('Authentication required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/reports/{id}',
  summary: 'Poll a report export\'s status (pending → ready|failed)',
  description:
    'Returns the export\'s lifecycle metadata (status + timestamps + row count + a NON-PII failure ' +
    'code). NO artifact field — the bytes are streamed by the download route. 404 when not the ' +
    'requestor\'s export.',
  tags: reportsTags,
  request: { params: reportsExportParams },
  responses: {
    200: { description: 'Report export status', content: { 'application/json': { schema: ReportStatusResponseComponent } } },
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Report export not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/reports/{id}/download',
  summary: 'Download a ready report export (one-time, 24h, authenticated stream)',
  description:
    'Streams the envelope-decrypted artifact as text/csv or application/json (the format is the ' +
    'export\'s own). One-time: guards in order owned → not-consumed (410) → not-expired-status (410) → ' +
    'failed (409 `reports.build_failed`) → ready (409 `reports.not_ready`) → not-expired-window (410); ' +
    'consumed_at is stamped before streaming (a concurrent double-download loses → 410). The two 409 ' +
    'cases carry DISTINCT error codes so a client can tell a permanent build failure from a transient ' +
    'still-building state. NO response schema — the artifact bytes are streamed, never JSON-embedded ' +
    '(the R1 rule).',
  tags: reportsTags,
  request: { params: reportsExportParams },
  responses: {
    200: { description: 'The report artifact (text/csv | application/json)' },
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Report export not found'),
    409: errorResponse('Report export is not ready (reports.not_ready) or failed to generate (reports.build_failed)'),
    410: errorResponse('Report export already downloaded or expired'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.8 — feature flags (FR-58C; the GLOBAL catalog + the TENANT-SCOPED override surface) ─────
// Three real `paths`: the global catalog read, the per-Pariwar effective-inventory read (each entry
// carrying global-vs-override provenance), and the FLIP write. Both reads return the COMPLETE flag set
// for the scope — there is no filter parameter and no `hidden` field anywhere in these DTOs, which is
// how prd.md:892's "no secret flags" is expressed at the transport layer.
const {
  FeatureFlagInventoryResponse,
  FeatureFlagVersionsResponse,
  FeatureFlagFlipRequest,
  FeatureFlagFlipResponse,
} = await import('../src/feature-flags/index.js');
const FeatureFlagInventoryResponseComponent = FeatureFlagInventoryResponse.openapi('FeatureFlagInventoryResponse');
const FeatureFlagVersionsResponseComponent = FeatureFlagVersionsResponse.openapi('FeatureFlagVersionsResponse');
const FeatureFlagFlipRequestComponent = FeatureFlagFlipRequest.openapi('FeatureFlagFlipRequest');
const FeatureFlagFlipResponseComponent = FeatureFlagFlipResponse.openapi('FeatureFlagFlipResponse');
registry.register('FeatureFlagInventoryResponse', FeatureFlagInventoryResponseComponent);
registry.register('FeatureFlagVersionsResponse', FeatureFlagVersionsResponseComponent);
registry.register('FeatureFlagFlipRequest', FeatureFlagFlipRequestComponent);
registry.register('FeatureFlagFlipResponse', FeatureFlagFlipResponseComponent);

const featureFlagTags = ['feature-flags'];
const featureFlagPariwarParams = z.object({ pariwarId: z.string().uuid() });
const featureFlagKeyParams = z.object({ pariwarId: z.string().uuid(), flagKey: z.string() });
const featureFlagGlobalKeyParams = z.object({ flagKey: z.string() });

registry.registerPath({
  method: 'get',
  path: '/api/v1/global/feature-flags',
  summary: 'The cross-tenant feature-flag catalog (complete; no secret flags) — pariwar_admin+ or super_admin',
  description:
    'Returns EVERY registered flag resolved against the CROSS-TENANT tier — the global row if one is ' +
    'in force, else the code default. The listing is registry-driven, not row-driven, so a flag that ' +
    'has never been flipped still appears. Requires feature_flag.view, satisfied by holding it in ANY ' +
    'of the actor\'s own Pariwars (pariwar_admin+) or by a global grant (super_admin) — the catalog\'s ' +
    'data does not vary by tenant, so this is prd.md:892\'s "visible to Pariwar Admin role and above" ' +
    'read literally. GET /api/v1/p/{pariwarId}/feature-flags additionally shows each flag\'s effective ' +
    'resolution for one specific tenant, including any governing global row.',
  tags: featureFlagTags,
  responses: {
    200: { description: 'The complete global flag catalog', content: { 'application/json': { schema: FeatureFlagInventoryResponseComponent } } },
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — feature_flag.view is required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/global/feature-flags/{flagKey}/versions',
  summary: 'Flip a feature flag GLOBALLY (creates a new cross-tenant immutable version) — super_admin only',
  description:
    'Publishes the next version row for this flag with `pariwar_id: null` — the cross-tenant tier that ' +
    'governs every Pariwar without its own override at once. Strictly higher-privilege than the ' +
    'catalog read (Decision 7\'s read/write key split), so this is super_admin-only regardless of who ' +
    'can view the catalog. Same immutability, rationale, and 409-on-race semantics as the per-Pariwar ' +
    'flip. Send an optional `Idempotency-Key` header to make a retried flip safe. NOTE: ' +
    '`effective_from` may not be in the future — scheduled flips are not supported.',
  tags: featureFlagTags,
  request: {
    params: featureFlagGlobalKeyParams,
    body: { content: { 'application/json': { schema: FeatureFlagFlipRequestComponent } }, required: true },
  },
  responses: {
    200: { description: 'The new GLOBAL flag version', content: { 'application/json': { schema: FeatureFlagFlipResponseComponent } } },
    400: errorResponse('Request validation failed / malformed cohort definition / invalid dead_by / a staged state (canary|rollout) with no cohort clause / a future effective_from (scheduled flips are not supported)'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — feature_flag.flip at dimension: global is required (super_admin only)'),
    404: errorResponse('Unknown feature flag key'),
    409: errorResponse('A concurrent flip won the race; OR an illegal state transition under the staged-rollout ladder (off → canary → rollout → full, rollback from any serving state); OR a flag key not admitted to the capability bar; OR the acting admin has no display_name recorded; OR a flip with this Idempotency-Key is already in progress'),
    503: errorResponse('The governance capability bar (governance_boundary.yaml) is unavailable or invalid on this deploy — no flip can be published until it is fixed'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/feature-flags',
  summary: 'This Pariwar\'s effective feature flags (complete, with global-vs-override provenance)',
  description:
    'Returns EVERY registered flag resolved for this tenant: its own override if one is in force, else ' +
    'the global row, else the code default — with `source` naming which tier answered. Requires ' +
    'feature_flag.view at the pariwar dimension.',
  tags: featureFlagTags,
  request: { params: featureFlagPariwarParams },
  responses: {
    200: { description: 'The complete effective flag inventory for this Pariwar', content: { 'application/json': { schema: FeatureFlagInventoryResponseComponent } } },
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — feature_flag.view is required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/feature-flags/{flagKey}/versions',
  summary: 'A flag\'s version history (newest first)',
  description:
    'The persisted immutable version rows governing this flag for this tenant (its own overrides plus ' +
    'the global rows). Version 1 is never listed — it is the code default, not a row. Requires ' +
    'feature_flag.view.',
  tags: featureFlagTags,
  request: { params: featureFlagKeyParams },
  responses: {
    200: { description: 'The flag\'s version history', content: { 'application/json': { schema: FeatureFlagVersionsResponseComponent } } },
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — feature_flag.view is required'),
    404: errorResponse('Unknown flag key'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/feature-flags/{flagKey}/versions',
  summary: 'Flip a feature flag for this Pariwar (creates a new immutable version)',
  description:
    'Publishes the next version row for this flag in this tenant\'s scope. Prior rows are NEVER ' +
    'mutated (only their superseded_by_version forward-pointer), so historical flag states stay ' +
    'queryable for replay. `rationale` is REQUIRED and non-empty — FR-58C requires every flag change ' +
    'be audit-logged with actor + rationale, and a §1.5 hash-chain audit line is written on every ' +
    'flip. A concurrent double-flip loses the unique-constraint race and gets 409. Requires ' +
    'feature_flag.flip (narrower than feature_flag.view by design). Send an optional ' +
    '`Idempotency-Key` header to make a retried flip safe: a replay with the same key returns the ' +
    'original response instead of creating a second identical version. NOTE: `effective_from` may ' +
    'not be in the future — a flip takes effect immediately and scheduled flips are not supported.',
  tags: featureFlagTags,
  request: {
    params: featureFlagKeyParams,
    body: { content: { 'application/json': { schema: FeatureFlagFlipRequestComponent } }, required: true },
  },
  responses: {
    200: { description: 'The new flag version', content: { 'application/json': { schema: FeatureFlagFlipResponseComponent } } },
    400: errorResponse('Request validation failed / malformed cohort definition / invalid dead_by / a staged state (canary|rollout) with no cohort clause / a future effective_from (scheduled flips are not supported)'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Forbidden — feature_flag.flip is required'),
    404: errorResponse('Unknown feature flag key'),
    409: errorResponse('A concurrent flip won the race; OR an illegal state transition under the staged-rollout ladder (off → canary → rollout → full, rollback from any serving state); OR a flag key not admitted to the capability bar; OR the acting admin has no display_name recorded; OR a flip with this Idempotency-Key is already in progress'),
    503: errorResponse('The governance capability bar (governance_boundary.yaml) is unavailable or invalid on this deploy — no flip can be published until it is fixed'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.9 — banners/popups (FR-58B; the admin authoring surface + the MEMBER surface) ──────
// Six admin routes are `banner.manage`-gated at `dimension: 'pariwar'` (403 on a missing/inert
// grant). The two MEMBER routes carry NO RBAC key at all — they are member-session-gated, the member
// JWT is the tenancy authority, and a `:pariwarId` mismatch is a 404 (never a 403, which would leak
// that the resource exists). Visibility is a pure READ-TIME window: there is no scheduler and no
// activation/expiry transition, so no route "activates" or "archives" a banner.
const {
  CreateBannerRequest,
  UpdateBannerRequest,
  PublishBannerRequest,
  RetractBannerRequest,
  DismissBannerRequest,
  BannerResponse,
  BannerListResponse,
  MemberBannerListResponse,
  DismissBannerResponse,
} = await import('../src/banners/index.js');

const CreateBannerRequestComponent = CreateBannerRequest.openapi('CreateBannerRequest');
const UpdateBannerRequestComponent = UpdateBannerRequest.openapi('UpdateBannerRequest');
const PublishBannerRequestComponent = PublishBannerRequest.openapi('PublishBannerRequest');
const RetractBannerRequestComponent = RetractBannerRequest.openapi('RetractBannerRequest');
const DismissBannerRequestComponent = DismissBannerRequest.openapi('DismissBannerRequest');
const BannerComponent = BannerResponse.openapi('Banner');
const BannerListComponent = BannerListResponse.openapi('BannerList');
const MemberBannerListComponent = MemberBannerListResponse.openapi('MemberBannerList');
const DismissBannerResponseComponent = DismissBannerResponse.openapi('DismissBannerResponse');

const bannerPariwarParams = z.object({ pariwarId: z.string().uuid() });
const bannerIdParams = z.object({ pariwarId: z.string().uuid(), bannerId: z.string().uuid() });
const bannerForbidden = errorResponse('Not authorized (banner.manage) for this Pariwar');
const bannerTags = ['banners'];

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/banners',
  summary: 'List the Pariwar\'s banners (newest-first, paginated, derived-display-state filterable)',
  description:
    'The `display_state` filter is a DERIVED state (draft | scheduled | live | expired | retracted) ' +
    'computed from the stored status plus the valid_from/valid_until window against the server\'s ' +
    'clock — it is never a stored column. `valid_from` is inclusive and `valid_until` exclusive.',
  tags: bannerTags,
  request: { params: bannerPariwarParams },
  responses: {
    200: { description: 'The paginated banner list', content: jsonOf(BannerListComponent) },
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/banners',
  summary: 'Create a banner draft',
  description:
    'Copy may be incomplete on a draft; all four copy fields become mandatory at publish. A popup ' +
    'MUST be dismissible (422 otherwise — enforced again by a DB CHECK), and the window must be ' +
    'non-empty (422 otherwise — likewise). A non-dismissible `banner` IS permitted.',
  tags: bannerTags,
  request: {
    params: bannerPariwarParams,
    body: { content: jsonOf(CreateBannerRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The created draft', content: jsonOf(BannerComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
    422: errorResponse('An undismissable popup, or a window whose valid_until is not after valid_from'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/banners/{bannerId}',
  summary: 'Read a single banner (admin)',
  tags: bannerTags,
  request: { params: bannerIdParams },
  responses: {
    200: { description: 'The banner', content: jsonOf(BannerComponent) },
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
    404: errorResponse('Banner not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/p/{pariwarId}/banners/{bannerId}',
  summary: 'Edit a banner (one unified edit; the server content hash decides whether a re-review is required)',
  description:
    'The server recomputes a content hash over the four member-visible copy fields. If the hash is ' +
    'UNCHANGED (e.g. extending valid_until, flipping display_once_per_member) the edit applies with ' +
    'no re-review and no revision bump, and every existing member dismissal stands. If the hash ' +
    'CHANGED on a PUBLISHED banner, a fresh NON-AUTHOR tone-review sign-off is required (409 ' +
    'otherwise), `revision` is bumped, and every prior dismissal stops suppressing — so the banner ' +
    're-appears for members who had dismissed the earlier copy. On a draft, copy edits are free. A ' +
    'retracted banner is terminal and rejects every edit (409).',
  tags: bannerTags,
  request: {
    params: bannerIdParams,
    body: { content: jsonOf(UpdateBannerRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated banner', content: jsonOf(BannerComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
    404: errorResponse('Banner not found'),
    409: errorResponse('The banner is retracted (terminal); OR a copy revision on a published banner without a fresh non-author tone-review sign-off; OR the banner\'s status changed concurrently before this edit could be applied'),
    422: errorResponse('The merged row would be an undismissable popup, an empty window, or a published banner missing a required copy field'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/banners/{bannerId}/publish',
  summary: 'Publish a banner draft (draft → published)',
  description:
    'Publishing does NOT make the banner visible by itself — visibility is the read-time window. A ' +
    'published banner whose valid_from is in the future reads as `scheduled` and becomes visible ' +
    'when the clock passes it, with nothing running. Requires all four copy fields (422 otherwise) ' +
    'and a NON-AUTHOR tone-review sign-off: the publishing actor becomes the reviewer, so the ' +
    'banner\'s own author cannot publish it (409).',
  tags: bannerTags,
  request: {
    params: bannerIdParams,
    body: { content: jsonOf(PublishBannerRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The published banner', content: jsonOf(BannerComponent) },
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
    404: errorResponse('Banner not found'),
    409: errorResponse('Illegal transition for the banner\'s current status; OR the tone-review gate denied (author is the publisher / no sign-off); OR the banner\'s status changed concurrently before publish could be applied'),
    422: errorResponse('A copy field (title, body, title_hi, body_hi) is missing — Hindi and English are both required'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/banners/{bannerId}/retract',
  summary: 'Retract a banner (draft → retracted as a discard, or published → retracted to pull it down)',
  description: 'Terminal — a retracted banner is never member-visible again regardless of its window, and there is no un-retract.',
  tags: bannerTags,
  request: {
    params: bannerIdParams,
    body: { content: jsonOf(RetractBannerRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The retracted banner', content: jsonOf(BannerComponent) },
    401: errorResponse('Authentication required'),
    403: bannerForbidden,
    404: errorResponse('Banner not found'),
    409: errorResponse('Illegal transition for the banner\'s current status; OR the banner\'s status changed concurrently before retract could be applied'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/banners',
  summary: 'The member\'s currently visible banner + popup (RESOLVED server-side)',
  description:
    'Returns AT MOST ONE banner and AT MOST ONE popup. Both may be present at once — the two ' +
    'display modes are independent lanes, so a popup never suppresses the strip. When several ' +
    'banners of one mode are simultaneously visible, the winner is chosen by a total, replayable ' +
    'order: severity (critical > warning > info), then valid_from descending, then banner_id ' +
    'ascending. Resolution happens on the server so every client agrees. Member-session-gated (no ' +
    'RBAC key); a `pariwarId` that does not match the member\'s own JWT is a 404, not a 403.',
  tags: bannerTags,
  request: { params: bannerPariwarParams },
  responses: {
    200: { description: 'The resolved banner/popup pair (either or both may be null)', content: jsonOf(MemberBannerListComponent) },
    401: errorResponse('Authentication required (member session)'),
    404: errorResponse('The pariwarId does not match the member session'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member/banners/{bannerId}/dismiss',
  summary: 'Record the member\'s acknowledgement of a banner (dismissed, or an automatic display-once `shown`)',
  description:
    'Persists server-side so a reinstall or a second device cannot resurrect a dismissed banner. ' +
    'The acted-on revision is read from the banner row, never client-supplied. IDEMPOTENT: a ' +
    'replayed dismiss is a clean no-op returning success, and the recorded revision only ever ' +
    'advances, so a stale replay cannot un-suppress a banner. A later copy revision re-surfaces the ' +
    'banner for members who had dismissed the earlier one.',
  tags: bannerTags,
  request: {
    params: bannerIdParams,
    body: { content: jsonOf(DismissBannerRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The recorded acknowledgement', content: jsonOf(DismissBannerResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required (member session)'),
    404: errorResponse('The pariwarId does not match the member session, or no such banner in this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.15 — surveys/polls (FR-58; the admin authoring + results surface + the MEMBER surface) ─
// Six admin routes are `survey.manage`-gated at `dimension: 'pariwar'` (403 on a missing/inert
// grant). The two MEMBER routes carry NO RBAC key at all — they are member-session-gated, the member
// JWT is the tenancy authority, and a `:pariwarId` mismatch is a 404 (never a 403, which would leak
// that the resource exists). The response window is a pure READ-TIME window: there is no scheduler
// and no open/expiry transition, so no route "opens" or "expires" a survey.
//
// ⚠ A SURVEY IS ADVISORY AND HAS NO GOVERNANCE EFFECT. `response_threshold` is FR-58's "optional
// quorum threshold" RENAMED, and it gates NOTHING — it feeds one informational boolean on the
// aggregate. It is deliberately absent from the member DTO entirely.
// ⛔ No route here joins a response to a member: the aggregate returns counts, and the free-text read
// returns `{answer_text, submitted_at}` with no id and no ordinal.
const {
  CreateSurveyRequest,
  UpdateSurveyRequest,
  PublishSurveyRequest,
  CloseSurveyRequest,
  SubmitSurveyResponseRequest,
  SurveyResponse: SurveyResponseDto,
  SurveyListResponse,
  MemberSurveyListResponse,
  SubmitSurveyResponseResult,
  SurveyAggregateResponse,
  SurveyFreeTextListResponse,
} = await import('../src/surveys/index.js');

const CreateSurveyRequestComponent = CreateSurveyRequest.openapi('CreateSurveyRequest');
const UpdateSurveyRequestComponent = UpdateSurveyRequest.openapi('UpdateSurveyRequest');
const PublishSurveyRequestComponent = PublishSurveyRequest.openapi('PublishSurveyRequest');
const CloseSurveyRequestComponent = CloseSurveyRequest.openapi('CloseSurveyRequest');
const SubmitSurveyResponseRequestComponent = SubmitSurveyResponseRequest.openapi('SubmitSurveyResponseRequest');
const SurveyComponent = SurveyResponseDto.openapi('Survey');
const SurveyListComponent = SurveyListResponse.openapi('SurveyList');
const MemberSurveyListComponent = MemberSurveyListResponse.openapi('MemberSurveyList');
const SubmitSurveyResponseResultComponent = SubmitSurveyResponseResult.openapi('SubmitSurveyResponseResult');
const SurveyAggregateComponent = SurveyAggregateResponse.openapi('SurveyAggregate');
const SurveyFreeTextListComponent = SurveyFreeTextListResponse.openapi('SurveyFreeTextList');

const surveyPariwarParams = z.object({ pariwarId: z.string().uuid() });
const surveyIdParams = z.object({ pariwarId: z.string().uuid(), surveyId: z.string().uuid() });
const surveyForbidden = errorResponse('Not authorized (survey.manage) for this Pariwar');
// The member survey list is a collection GET, so it declares a BOUNDED `limit` — the Story 1.14 AC-3
// forced-pagination invariant (FR-91). `surveys` grows with tenant data, which is exactly the
// unbounded-read hazard that invariant exists to prevent.
// [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `offset` added — this emitter
// hand-declares its own copy of every route's query shape rather than importing the route's actual
// Zod schema (`apps/api/.../member-routes.ts`'s `MemberListQuery`), so a review-pass fix that added
// `offset` support there (closing the "member list was unpaginated past 50 items" gap) did NOT
// automatically reach this file — the two can silently drift, and just did. Kept in sync by hand.
const memberSurveyListQuery = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
const surveyTags = ['surveys'];

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/surveys',
  summary: 'List the Pariwar\'s surveys (newest-first, paginated, derived-display-state filterable)',
  description:
    'The `display_state` filter is a DERIVED state (draft | scheduled | open | expired | closed) ' +
    'computed from the stored status plus the valid_from/valid_until window against the server\'s ' +
    'clock — it is never a stored column. `valid_from` is inclusive and `valid_until` exclusive.',
  tags: surveyTags,
  request: { params: surveyPariwarParams },
  responses: {
    200: { description: 'The paginated survey list', content: jsonOf(SurveyListComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/surveys',
  summary: 'Create a survey draft',
  description:
    'Copy and questions may be incomplete on a draft; all four copy fields and at least one question ' +
    'become mandatory at publish. The window must be non-empty (422 otherwise — enforced again by a ' +
    'DB CHECK). The audience scope must be one that can resolve: `public` is REJECTED (422) because ' +
    'a survey has no unauthenticated respondent, and `role`/`cohort` are rejected because no member ' +
    'attribute exists to resolve them against.',
  tags: surveyTags,
  request: {
    params: surveyPariwarParams,
    body: { content: jsonOf(CreateSurveyRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The created draft', content: jsonOf(SurveyComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    422: errorResponse('An empty/inverted window, an unusable audience scope, or a questionnaire violating a declared bound (the error names the violated bound and the offending question_id)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}',
  summary: 'Read a single survey (admin)',
  tags: surveyTags,
  request: { params: surveyIdParams },
  responses: {
    200: { description: 'The survey', content: jsonOf(SurveyComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}',
  summary: 'Edit a survey (a published survey may only have its valid_until EXTENDED)',
  description:
    'On a DRAFT every field applies, re-validated. On a PUBLISHED survey the questionnaire, the ' +
    'response_threshold, the audience and the copy are FROZEN — a request touching any of them is a ' +
    '409 naming the frozen field. The reason is that a response is an answer TO A QUESTION: change ' +
    'the question and every stored answer silently becomes an answer to something nobody asked. To ' +
    'ask something different, close this survey and publish a new one. The ONLY permitted ' +
    'post-publish mutation is EXTENDING valid_until; a shortening is a 422 pointing at `close`, ' +
    'which is the transition that exists for stopping collection. A closed survey is terminal and ' +
    'rejects every edit (409).',
  tags: surveyTags,
  request: {
    params: surveyIdParams,
    body: { content: jsonOf(UpdateSurveyRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The updated survey', content: jsonOf(SurveyComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
    409: errorResponse('The survey is closed (terminal); OR the edit touches a field frozen by publish (the error names it); OR the survey\'s status changed concurrently before this edit could be applied'),
    422: errorResponse('An empty/inverted window, a SHORTENED valid_until on a published survey, an unusable audience scope, or a questionnaire violating a declared bound'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}/publish',
  summary: 'Publish a survey draft (draft → published)',
  description:
    'Publishing does NOT open the survey by itself — openness is the read-time window. A published ' +
    'survey whose valid_from is in the future reads as `scheduled` and opens when the clock passes ' +
    'it, with nothing running. Requires all four copy fields and at least one question (422 ' +
    'otherwise) and a NON-AUTHOR tone-review sign-off: the publishing actor becomes the reviewer, so ' +
    'the survey\'s own author cannot publish it (409). The sign-off\'s content hash covers the copy ' +
    'AND the questionnaire, and since both are frozen from this moment it is a ONE-SHOT binding. ' +
    'Publishing also enqueues a member notification fan-out; a fan-out failure never rolls back the ' +
    'publish — the survey is published and the notification is retried.',
  tags: surveyTags,
  request: {
    params: surveyIdParams,
    body: { content: jsonOf(PublishSurveyRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The published survey', content: jsonOf(SurveyComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
    409: errorResponse('Illegal transition for the survey\'s current status; OR the tone-review gate denied (author is the publisher / no sign-off); OR the survey\'s status changed concurrently before publish could be applied'),
    422: errorResponse('A copy field (title, body, title_hi, body_hi) is missing — Hindi and English are both required; OR the survey has no questions'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}/close',
  summary: 'Close a survey (draft → closed as a discard, or published → closed to stop collecting)',
  description:
    'TERMINAL — there is no reopen, deliberately: reopening would resume collecting answers into an ' +
    'aggregate an admin has already read and may have already quoted. To ask again, publish a new ' +
    'survey. Closing does not delete responses; a closed survey\'s aggregate stays readable.',
  tags: surveyTags,
  request: {
    params: surveyIdParams,
    body: { content: jsonOf(CloseSurveyRequestComponent), required: false },
  },
  responses: {
    200: { description: 'The closed survey', content: jsonOf(SurveyComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
    409: errorResponse('Illegal transition for the survey\'s current status; OR the survey\'s status changed concurrently before close could be applied'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}/aggregate',
  summary: 'The survey\'s aggregate results (counts only — never who answered)',
  description:
    'Returns per-option selection counts for every choice question (every declared option appears, ' +
    'including at zero, so "nobody chose this" is distinguishable from "this option does not ' +
    'exist"), the total response count, and `threshold_met`. NO field in this response can carry a ' +
    'member identifier. `threshold_met` is INFORMATIONAL and tri-state: null when no threshold was ' +
    'authored (which must not render as "not met"), and even when set it gates nothing — a survey ' +
    'informs a decision and never makes one.',
  tags: surveyTags,
  request: { params: surveyIdParams },
  responses: {
    200: { description: 'The aggregate', content: jsonOf(SurveyAggregateComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/surveys/{surveyId}/questions/{questionId}/free-text',
  summary: 'The free-text answers to one question, UNATTRIBUTED',
  description:
    'Returns `{answer_text, submitted_at}` and nothing else: no member id, no row id, no question ' +
    'echo and no ordinal — a stable per-respondent ordinal would let two reads of two different ' +
    'questions be aligned row-for-row, reconstructing one member\'s whole submission. Ordered by ' +
    'submitted_at with no identifying tie-break, so answers submitted in the same instant have an ' +
    'unstable relative order across reads; that is the correct trade. Reading this writes an audit ' +
    'line carrying the survey id and the audited question, never the answer content and never a ' +
    'count either (the audit payload field is a one-way hash). Free-text answers are ' +
    'member-authored personal data and have no export path in v1.',
  tags: surveyTags,
  request: {
    params: z.object({
      pariwarId: z.string().uuid(),
      surveyId: z.string().uuid(),
      questionId: z.string().uuid(),
    }),
  },
  responses: {
    200: { description: 'The paginated unattributed answers', content: jsonOf(SurveyFreeTextListComponent) },
    401: errorResponse('Authentication required'),
    403: surveyForbidden,
    404: errorResponse('Survey not found'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/surveys',
  summary: 'The member\'s open, in-audience surveys',
  description:
    'Returns every survey that is open at the server\'s clock and whose audience contains this ' +
    'member, each carrying an `answered` flag. Surveys the member has ALREADY answered are returned ' +
    'with `answered: true` rather than filtered out — a member who answered yesterday must see that ' +
    'they did, not an empty list. Member-session-gated (no RBAC key); a `pariwarId` that does not ' +
    'match the member\'s own JWT is a 404, not a 403.',
  tags: surveyTags,
  request: { params: surveyPariwarParams, query: memberSurveyListQuery },
  responses: {
    200: { description: 'The member\'s open surveys', content: jsonOf(MemberSurveyListComponent) },
    401: errorResponse('Authentication required (member session)'),
    404: errorResponse('The pariwarId does not match the member session'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member/surveys/{surveyId}/responses',
  summary: 'Submit the member\'s response (ONE per member, final)',
  description:
    'An idempotent INSERT, not an upsert: a second submission by the same member is a 409, and ' +
    'submission is FINAL. A member who submitted by mistake raises a helpdesk ticket — a human path ' +
    'that already exists and leaves a record. A replay carrying the SAME Idempotency-Key returns the ' +
    'original 201. Requires a Turnstile token and is rate-limited per member. Answering a survey ' +
    'that is not open at the server\'s clock is a 409: expiry is enforced on the write path, not ' +
    'merely hidden from the read. Every answer is validated against the survey\'s own questions, and ' +
    'a rejection names the offending question_id.',
  tags: surveyTags,
  request: {
    params: surveyIdParams,
    body: { content: jsonOf(SubmitSurveyResponseRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The recorded response', content: jsonOf(SubmitSurveyResponseResultComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required (member session)'),
    404: errorResponse('The pariwarId does not match the member session, or no such survey in this Pariwar'),
    409: errorResponse('This member has already responded; OR the survey is not open for responses at this time'),
    422: errorResponse('An answer is missing, unknown, or violates a declared bound (the error names the offending question_id)'),
    429: errorResponse('Rate limit exceeded for this member'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.10 — member moderation (FR-56; suspend / terminate / restore) ──────────────────────
//
// The FIRST Epic-10 surface that is STEP-UP gated, on THREE distinct action contexts
// (`member_moderation_{suspend|terminate|restore}`) so an elevation minted for one action can never
// be spent on another. It gates on the EXISTING `member.moderate` key — no new key, no catalog bump.
//
// ⚠ The free-text rationale is INBOUND-ONLY on every LIST/ACTION response schema below. The one
// exception — `ModerationRationaleResponse` — is a single-item decrypt-on-demand read behind the
// SAME `member.moderate` gate (review follow-up), never a list.

const {
  ModerateMemberRequest,
  ModerationActionResponse,
  ModerationHistoryResponse,
  ModeratedMembersListResponse,
  ModerationRationaleResponse,
  ReasonCodesListResponse,
  AppendModerationGroundRequest,
  AppendModerationGroundResponse,
} = await import('../src/member-moderation/index.js');

const ModerateMemberRequestComponent = ModerateMemberRequest.openapi('ModerateMemberRequest');
const ModerationActionComponent = ModerationActionResponse.openapi('ModerationAction');
const ModerationHistoryComponent = ModerationHistoryResponse.openapi('ModerationHistory');
const ModeratedMembersListComponent = ModeratedMembersListResponse.openapi('ModeratedMembersList');
const ModerationRationaleComponent = ModerationRationaleResponse.openapi('ModerationRationale');
const ReasonCodesListComponent = ReasonCodesListResponse.openapi('ReasonCodesList');
// Story 10.20 (AC9, WS-E) — review follow-up: this endpoint is live in apps/api/routes.ts but was
// never registered here, so the OpenAPI spec silently undersold a real write endpoint.
const AppendModerationGroundRequestComponent = AppendModerationGroundRequest.openapi(
  'AppendModerationGroundRequest',
);
const AppendModerationGroundResponseComponent = AppendModerationGroundResponse.openapi(
  'AppendModerationGroundResponse',
);

const moderationMemberParams = z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() });
const moderationPariwarParams = z.object({ pariwarId: z.string().uuid() });
const moderationForbidden = errorResponse(
  'Not authorized (member.moderate) for this Pariwar; OR step-up required / the elevation was minted for a DIFFERENT moderation action',
);
const moderationTags = ['member-moderation'];

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation/suspend',
  summary: 'Suspend a member (moderation overlay: none → suspended)',
  description:
    'Records a suspension against the member with a registry reason code and a MANDATORY free-text ' +
    'rationale (stored Tier-1 encrypted; it never appears on any response, event payload or audit ' +
    'line). Moderation is an event-derived OVERLAY orthogonal to the member lifecycle — `members.state` ' +
    'is NOT touched. The member stops being covered for support (`is_valid` becomes false, which is ' +
    'the entire enforcement surface: pool assignment and claim eligibility inherit it), every session ' +
    'is revoked, and the member is notified. The member can STILL sign in — deliberately, so they can ' +
    'read the explanation and reach the appeal path. Step-up required (`member_moderation_suspend`).',
  tags: moderationTags,
  request: {
    params: moderationMemberParams,
    body: { content: jsonOf(ModerateMemberRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The recorded moderation action', content: jsonOf(ModerationActionComponent) },
    400: errorResponse('Request validation failed (e.g. an empty or whitespace-only rationale)'),
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    409: errorResponse('Illegal from the member\'s current standing (e.g. already suspended) — rejected BEFORE any write; OR the acting admin has no display name on record (`admin.display_name_missing`)'),
    422: errorResponse('The reason code is undeclared, or cannot justify a suspension'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation/terminate',
  summary: 'Terminate a member (moderation overlay: suspended → terminated)',
  description:
    'Legal ONLY from `suspended` — FR-56 routes termination THROUGH suspension, so the harshest, ' +
    'rejoin-locking action can never be a single click; terminating an unmoderated member is a 409. ' +
    'Sets a 12-month rejoin lock (FR-6): a signup under the same identity is refused until ' +
    '`rejoin_permitted_at`. Revokes every session and notifies the member, who can still sign in. ' +
    'Step-up required (`member_moderation_terminate`) — an elevation minted for suspend or restore ' +
    'does NOT satisfy it.',
  tags: moderationTags,
  request: {
    params: moderationMemberParams,
    body: { content: jsonOf(ModerateMemberRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The recorded termination (carries rejoin_permitted_at)', content: jsonOf(ModerationActionComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    409: errorResponse('The member is not currently suspended — termination is legal only from `suspended`; OR the acting admin has no display name on record (`admin.display_name_missing`)'),
    422: errorResponse('The reason code cannot justify a termination'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation/restore',
  summary: 'Restore a member (moderation overlay: suspended | terminated → none)',
  description:
    'Clears the moderation standing. The member is covered for support again (`is_valid` returns to ' +
    'true) and any 12-month rejoin lock is lifted — the signup guard reads the CURRENT standing, not ' +
    'the presence of a historical termination. Restore does NOT re-mint sessions; the member simply ' +
    'signs in normally. Uses the RESTORE reason-code family (a moderation code is a 422 here). ' +
    'Step-up required (`member_moderation_restore`).',
  tags: moderationTags,
  request: {
    params: moderationMemberParams,
    body: { content: jsonOf(ModerateMemberRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The recorded restoration', content: jsonOf(ModerationActionComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    409: errorResponse('The member is not currently moderated — a no-op never returns 200; OR the acting admin has no display name on record (`admin.display_name_missing`)'),
    422: errorResponse('The reason code cannot justify a restore'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// Shared by BOTH moderation reads. The history read is paginated too (review follow-up): it used to
// take no querystring and silently return only the newest 50 entries with no truncation signal.
const moderationListQuery = z.object({
  limit: z.number().int().min(1).max(199).optional(),
  offset: z.number().int().min(0).optional(),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation',
  summary: 'A member\'s current moderation standing + paginated history',
  description:
    'The standing is DERIVED by folding the member\'s moderation events — it is never a stored ' +
    'column. `legal_actions` is computed server-side from the same legality reducer the write path ' +
    'uses, so a console can drive button enablement without re-implementing any rule. ' +
    '⚠ Neither the standing nor any history entry carries the rationale or its ciphertext.',
  tags: moderationTags,
  request: { params: moderationMemberParams, query: moderationListQuery },
  responses: {
    200: { description: 'The standing, the legal next actions, and one PAGE of history (`has_more` flags truncation — an audit trail must never read as complete when it is not)', content: jsonOf(ModerationHistoryComponent) },
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    404: errorResponse('Member not found in this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation/{moderationActionId}/rationale',
  summary: 'Decrypt ONE moderation action\'s free-text rationale',
  description:
    'The single exception to "the rationale never leaves the DB": a per-action, decrypt-on-demand ' +
    'read behind the same `member.moderate` gate as every other field on this surface — never a ' +
    'list, and no separate capability. Fail-soft on a CORRUPT/ROTATED STORED ENVELOPE: `rationale` ' +
    'is `null` rather than a 500. A KMS/key-service outage is deliberately NOT collapsed into that ' +
    'null — it returns 503, so an auditor can never mistake "temporarily undecryptable" for ' +
    '"no rationale was ever recorded".',
  tags: moderationTags,
  request: { params: z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid(), moderationActionId: z.string().uuid() }) },
  responses: {
    200: { description: 'The decrypted rationale (or null when the STORED envelope is unreadable)', content: jsonOf(ModerationRationaleComponent) },
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    404: errorResponse('No moderation action with that id for this member in this Pariwar'),
    503: errorResponse('The key service is unavailable — the rationale exists but cannot be decrypted right now (`member_moderation.rationale_unavailable`)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/members/{memberId}/moderation/{moderationActionId}/grounds',
  summary: 'Append a SUPPORTING ground to an existing moderation decision',
  description:
    'A LATER FINDING ATTACHES; it never rewrites (AC9). Records an append-only supporting ground ' +
    'against an existing decision, optionally superseding an earlier supporting ground — the ' +
    'PRIMARY ground is not reachable here and can never be superseded or replaced (structurally ' +
    'immutable by construction). Step-up gated (`member_moderation_append_ground`), a FOURTH ' +
    'context distinct from suspend/terminate/restore, so an elevation minted for one of those three ' +
    'can never be spent on appending a finding, and vice versa.',
  tags: moderationTags,
  request: {
    params: z.object({ pariwarId: z.string().uuid(), memberId: z.string().uuid(), moderationActionId: z.string().uuid() }),
    body: { content: jsonOf(AppendModerationGroundRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The appended ground', content: jsonOf(AppendModerationGroundResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
    404: errorResponse('The moderation action does not exist for this member in this Pariwar; OR `supersedes_ground_id` does not name a ground of this action (`member_moderation.action_not_found` / `member_moderation.ground_not_found`)'),
    409: errorResponse('An attempt to supersede the PRIMARY ground (`member_moderation.primary_ground_immutable`); OR the named target already has an active superseder (`member_moderation.ground_already_superseded`)'),
    422: errorResponse('The reason code cannot support this action; OR evidence_refs is not a bounded array of `{kind, ref}` identifiers'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/moderation/members',
  summary: 'The Pariwar\'s currently-moderated members',
  description:
    'Members whose CURRENT standing is `suspended` or `terminated`, newest-action-first, paginated. ' +
    'Restored members drop out. Carries no rationale. ' +
    'NOTE: moderation items carry NO deadline and NO severity — a consumer cannot sort them by ' +
    'deadline-proximity.',
  tags: moderationTags,
  request: { params: moderationPariwarParams, query: moderationListQuery },
  responses: {
    200: { description: 'The moderated-members page', content: jsonOf(ModeratedMembersListComponent) },
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/moderation/reason-codes',
  summary: 'The full frozen moderation reason-code registry',
  description:
    'All 10 codes (7 moderation grounds + 3 restore grounds), always — not paginated (Decision 3: ' +
    'the registry is code-level and frozen, never a per-Pariwar-growing list). The ONE source both ' +
    'the server\'s `appliesTo` 422 and the admin dropdown read.',
  tags: moderationTags,
  request: { params: moderationPariwarParams },
  responses: {
    200: { description: 'The registry', content: jsonOf(ReasonCodesListComponent) },
    401: errorResponse('Authentication required'),
    403: moderationForbidden,
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.22 — the moderation APPEAL (Niyamavali §8.8, Decision `2026-08-15-121`) ────────────
//
// Five paths across three audiences. ⛔ NOT Epic 6's claim appeal — Part 9 is claim-scoped, Part 8
// does not reference it, and §8.8 states expressly that it does not incorporate it. No shared table,
// no shared id, no shared route.
//
// ⚠ THE TIER-1 DISCIPLINE, stated because a consumer cannot infer it from the schemas: the member's
// GROUNDS and the adjudicator's REASONED OUTCOME appear on exactly ONE response — the single-item
// `ModerationAppealDetail` read. They are absent from every list shape, from both event payloads, and
// from every audit line.

const {
  FileModerationAppealRequest,
  FileModerationAppealOffPortalRequest,
  ModerationAppealFiledResponse,
  DecideModerationAppealRequest,
  ModerationAppealDecidedResponse,
  ModerationAppealsListResponse,
  ModerationAppealDetailResponse,
  MemberAppealContextResponse,
} = await import('../src/member-moderation/index.js');

const FileAppealRequestComponent = FileModerationAppealRequest.openapi('FileModerationAppealRequest');
const FileAppealOffPortalRequestComponent = FileModerationAppealOffPortalRequest.openapi(
  'FileModerationAppealOffPortalRequest',
);
const AppealFiledComponent = ModerationAppealFiledResponse.openapi('ModerationAppealFiled');
const DecideAppealRequestComponent = DecideModerationAppealRequest.openapi(
  'DecideModerationAppealRequest',
);
const AppealDecidedComponent = ModerationAppealDecidedResponse.openapi('ModerationAppealDecided');
const AppealsListComponent = ModerationAppealsListResponse.openapi('ModerationAppealsList');
const AppealDetailComponent = ModerationAppealDetailResponse.openapi('ModerationAppealDetail');

const appealParams = z.object({ pariwarId: z.string().uuid(), appealId: z.string().uuid() });
const MemberAppealContextComponent = MemberAppealContextResponse.openapi('MemberAppealContext');

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member/moderation/appeals',
  summary: 'The member\'s own appeal context (member, in-portal)',
  description:
    'What the member\'s appeal screen needs to render itself honestly, in one read: which moderation ' +
    'acts they may appeal RIGHT NOW (already filtered to acts with no open appeal, so the screen can ' +
    'show the one-open-at-a-time state without first earning a 409), plus their own appeals ' +
    'newest-first. ⚠ This read exists because the validity payload derives moderation standing from ' +
    '`specialFlags` and carries NO moderation-action id, while §8.8 identifies an appeal BY the act\'s ' +
    '§8.6 record. ⛔ The alternative — letting the server infer the act from the member\'s current ' +
    'standing — was rejected: an inferred subject on a governance write is the shape that lets a ' +
    'member appeal something other than what they were shown. ⛔ Carries no Tier-1 text.',
  tags: moderationTags,
  request: { params: moderationPariwarParams },
  responses: {
    200: { description: 'The member\'s appeal context', content: jsonOf(MemberAppealContextComponent) },
    401: errorResponse('Authentication required'),
    404: errorResponse('The path Pariwar is not the session member\'s Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});


registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member/moderation/appeals',
  summary: 'File an appeal against a moderation act (member, in-portal)',
  description:
    'The MEMBER\'s own act under Niyamavali §8.8. Member-session gated; Turnstile (`x-turnstile-token`) ' +
    'and `Idempotency-Key` ride HEADERS, not the body. The member is the SESSION — there is no ' +
    '`member_id` field, deliberately. Appealable from suspension OR termination, with NO deadline ' +
    '(§8.8: "no time limit runs against a member\'s right to appeal"). Only ONE appeal against a given ' +
    'moderation act may be open at a time, but the right is NOT exhausted: once an appeal is ' +
    'determined a further appeal against the same act may be filed. Filing has NO SUSPENSIVE EFFECT — ' +
    'a suspended member remains suspended and a terminated member\'s access does not return. The ' +
    'grounds are stored Tier-1 encrypted and never appear on this response, on any event payload, or ' +
    'on any audit line.',
  tags: moderationTags,
  request: {
    params: moderationPariwarParams,
    body: { content: jsonOf(FileAppealRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The filed appeal', content: jsonOf(AppealFiledComponent) },
    400: errorResponse('Request validation failed; OR the x-turnstile-token / Idempotency-Key header is absent'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Turnstile verification failed'),
    404: errorResponse('The path Pariwar is not the session member\'s Pariwar (a 404, never a 403 — a 403 would be a tenant-existence oracle)'),
    409: errorResponse('An appeal against this moderation act is already OPEN (`member_moderation.appeal_already_open`). ⛔ NOT an exhaustion — a further appeal may be filed once the open one is determined.'),
    422: errorResponse('The member is under no moderation, so there is no act to appeal (`member_moderation.appeal_not_appealable`)'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/moderation/appeals/off-portal',
  summary: 'Record a member\'s appeal taken by helpline (operator, off-portal)',
  description:
    'THE ARM THAT SURVIVES THE END OF AUTHENTICATED ACCESS. §8.8: "the right to appeal does not ' +
    'depend on the access that termination removes." With `termination_access_block` enabled a ' +
    'terminated member holds no session at all, and this is the only route left to them. Gated on ' +
    '`helpdesk.create` — ⛔ NOT on `member.data_rights` (filing an appeal is not executing a DPDPA ' +
    'right) and ⛔ NOT on `member.moderate` (which would let the authority that sanctions a member ' +
    'also file their appeal). `helpdesk_ticket_id` is REQUIRED here and enforced by a DB CHECK: the ' +
    'ruling places the off-portal process ON a helpdesk ticket. The operator RECORDS the act; the ' +
    'event attributes it to the MEMBER, because the appeal is the member\'s own.',
  tags: moderationTags,
  request: {
    params: moderationPariwarParams,
    body: { content: jsonOf(FileAppealOffPortalRequestComponent), required: true },
  },
  responses: {
    201: { description: 'The filed appeal', content: jsonOf(AppealFiledComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (helpdesk.create) for this Pariwar'),
    409: errorResponse('An appeal against this moderation act is already open'),
    422: errorResponse('The member is under no moderation, so there is no act to appeal'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/moderation/appeals',
  summary: 'The open moderation-appeal queue (Trustee Panel)',
  description:
    'THE SURFACE ON WHICH A FILED APPEAL IS ACTUALLY FOUND. This is not a convenience read: the ' +
    'Trustee Panel holds NO helpdesk capability at all and helpdesk `routed_to_role` is advisory and ' +
    'inert, so no operator queue can ever surface an appeal to the Panel. Without this list an appeal ' +
    'would be reachable only by direct link — a complete record nobody can find. Open appeals in the ' +
    'caller\'s scope, oldest filing first. ⛔ Carries NO Tier-1 text.',
  tags: moderationTags,
  request: {
    params: moderationPariwarParams,
    query: z.object({ limit: z.coerce.number().int().positive().max(200).optional() }),
  },
  responses: {
    200: { description: 'Open appeals', content: jsonOf(AppealsListComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (member.decide_moderation_appeal) for this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/moderation/appeals/{appealId}',
  summary: 'One moderation appeal, with both Tier-1 fields decrypted',
  description:
    'The single-item decrypt-on-demand read — the ONLY surface that ever carries the member\'s grounds ' +
    'or the adjudicator\'s reasoned outcome, behind the same gate as the determination (the ' +
    '`ModerationRationale` precedent). `grounds` / `reasoned_outcome` are null on a corrupt or rotated ' +
    'envelope (a per-row fact); a key-service outage answers 503 instead, so an unreachable KMS can ' +
    'never masquerade as a member who appealed and said nothing.',
  tags: moderationTags,
  request: { params: appealParams },
  responses: {
    200: { description: 'The appeal', content: jsonOf(AppealDetailComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (member.decide_moderation_appeal) for this Pariwar'),
    404: errorResponse('No such appeal in this Pariwar'),
    503: errorResponse('Key service unavailable'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/moderation/appeals/{appealId}/decide',
  summary: 'Determine a moderation appeal (Trustee Panel)',
  description:
    'Records the §8.8 determination: `upheld` or `allowed`, and NOTHING ELSE — there is deliberately ' +
    'no third "varied" outcome, because a lesser sanction is a FRESH moderation act with its own ' +
    'ground, its own record and its own right of appeal. A REASONED OUTCOME is mandatory (stored ' +
    'Tier-1; never on an event payload or an audit line). Gated on `member.decide_moderation_appeal` ' +
    '— a SEPARATE key from `member.moderate`, because `member.moderate` is held by both pariwar_admin ' +
    'and the Trustee Panel and so cannot distinguish the appellate authority from the deciding one. ' +
    'Step-up required (`member_moderation_appeal`). ⭐ HOLDING THE KEY IS NOT SUFFICIENT: §8.8 requires ' +
    'the appeal be heard by a Panel member who did not take part in the act appealed against, and that ' +
    'exclusion is enforced server-side before any write as a 409. ⛔ AN `allowed` OUTCOME DOES NOT ' +
    'RESTORE THE MEMBER. It DIRECTS a restore; the restore is a subsequent, separately-attributed act ' +
    'through the moderation write path with its own Decision Note and the Panel-exclusive ' +
    '`member.restore_terminated` check. `directs_restore` on the response is a signal, not a report.',
  tags: moderationTags,
  request: {
    params: appealParams,
    body: { content: jsonOf(DecideAppealRequestComponent), required: true },
  },
  responses: {
    200: { description: 'The determination', content: jsonOf(AppealDecidedComponent) },
    400: errorResponse('Request validation failed (e.g. a missing or too-short reasoned outcome)'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Not authorized (member.decide_moderation_appeal) for this Pariwar; OR step-up required'),
    404: errorResponse('No such appeal in this Pariwar'),
    409: errorResponse('The appeal is already determined (`member_moderation.appeal_already_decided`); OR ⭐ the adjudicator TOOK PART in the act under appeal (`member_moderation.appeal_adjudicator_excluded`) — a 409 and NEVER a 403, because the actor holds the key and may determine other appeals; OR the acting admin has no display name on record'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 10.11 — Trustee-Lite list + signals (FR-57) ───────────────────────────────────────────
//
// ONE read-only GET aggregating six trustee-attention sources plus the DETECTION-ONLY R7 violator
// arm. An AGGREGATOR: no new permission key (`PERMISSION_CATALOG_VERSION` stays 28), no table, no
// event. Two contract properties are load-bearing and are documented on the path below because a
// consumer cannot infer them from the schema alone:
//
//   · EVERY section key is OPTIONAL, and ABSENT ≠ EMPTY. Absent means the caller does not hold that
//     section's permission key; present-and-empty means "you may see this and there is nothing in
//     it". An empty array for a section the caller cannot see would be an existence oracle.
//   · `deadline_at` / `raised_at` / `age_ms` are NULLABLE BY DESIGN. Only reconciliation ships a
//     deadline and only appeals derive one; cycle-freeze, R9 voting and concealment carry no temporal
//     field at all. A consumer must render the null as an explicit "no deadline", never as "due now".

const { TrusteeLiteResponse } = await import('../src/trustee-lite/index.js');

const TrusteeLiteComponent = TrusteeLiteResponse.openapi('TrusteeLite');
const trusteeLiteParams = z.object({ pariwarId: z.string().uuid() });

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/admin/trustee-lite',
  summary: 'The trustee worklist: every trustee-attention item across six sources, in one shape',
  description:
    'Aggregates cycle-freeze (6.13), R9 voting (6.14), concealment (6.15), appeals (6.16), ' +
    'reconciliation (9.8) and moderation (10.10) into ONE normalized row shape, plus the R7 ' +
    'violator arm. Read-only: nothing is written, no step-up is required, and NOTHING is decrypted ' +
    '(rows carry identifiers, machine codes and controlled non-PII display snapshots only — each ' +
    'row cross-links to a canonical surface that authorizes and decrypts on its own). ' +
    'AUTHORIZATION IS PER SECTION over six EXISTING keys (cycle.freeze · claim.r9_vote · ' +
    'claim.verify · claim.appeal_review OR claim.appeal_vote · reconciliation.review · ' +
    'member.moderate); a section the caller cannot act on is ABSENT from the response, never ' +
    'present-and-empty. ORDERING within a section is two-tier: rows with a deadline first ' +
    '(ascending), then undated rows by age descending — four of the six sources define no deadline ' +
    'at all, and none is fabricated to make the sort look uniform. SEVERITY is present only on the ' +
    'two dated categories and is structurally null on moderation and violator rows (a severity score ' +
    'on a moderation row would itself be a recommendation). The `violator_flags` section is a ' +
    'DISCRIMINATED union, never a bare list: it renders `detection_unavailable` (naming the missing ' +
    'producer) until the contribution-fact producer lands, because an empty violator list on a ' +
    'governance surface reads as a false all-clear.',
  tags: ['trustee-lite'],
  request: { params: trusteeLiteParams },
  responses: {
    200: { description: 'The trustee worklist (only the sections this caller may act on)', content: jsonOf(TrusteeLiteComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('The caller holds NONE of the six section keys for this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});


// ── Story 10.21 — off-portal DPDPA data rights ─────────────────────────────────────────────────────
// ⛔ REGISTERED IN THE ROUND-2 CODE REVIEW. The story marked "Regenerate openapi/v1.yaml" as done, but
// re-running the emitter was a NO-OP: the contracts had never been registered here, so six live routes
// — INCLUDING the one UNAUTHENTICATED route on the whole surface, which returns a decrypted PII
// dossier — were absent from the published contract entirely.
const {
  OffPortalExportRequest: OffPortalExportRequestSchema,
  OffPortalExportResponse: OffPortalExportResponseSchema,
  ActiveDataRightsExportResponse: ActiveDataRightsExportResponseSchema,
  OffPortalErasureRequest: OffPortalErasureRequestSchema,
  OffPortalErasureResponse: OffPortalErasureResponseSchema,
  MemberDirectDeliveryRequest: MemberDirectDeliveryRequestSchema,
  MemberDirectDeliveryResponse: MemberDirectDeliveryResponseSchema,
  StaffMediatedDeliveryRequest: StaffMediatedDeliveryRequestSchema,
  StaffMediatedDeliveryResponse: StaffMediatedDeliveryResponseSchema,
  DeliveryRedeemRequest: DeliveryRedeemRequestSchema,
  RecordCorrectionRequest: RecordCorrectionRequestSchema,
  RecordCorrectionResponse: RecordCorrectionResponseSchema,
} = await import('../src/member-data-rights/index.js');

const OffPortalExportRequestComponent = OffPortalExportRequestSchema.openapi('OffPortalExportRequest');
const OffPortalExportResponseComponent = OffPortalExportResponseSchema.openapi('OffPortalExportResponse');
const ActiveDataRightsExportResponseComponent = ActiveDataRightsExportResponseSchema.openapi(
  'ActiveDataRightsExportResponse',
);
const OffPortalErasureRequestComponent = OffPortalErasureRequestSchema.openapi('OffPortalErasureRequest');
const OffPortalErasureResponseComponent = OffPortalErasureResponseSchema.openapi('OffPortalErasureResponse');
const MemberDirectDeliveryRequestComponent =
  MemberDirectDeliveryRequestSchema.openapi('MemberDirectDeliveryRequest');
const MemberDirectDeliveryResponseComponent =
  MemberDirectDeliveryResponseSchema.openapi('MemberDirectDeliveryResponse');
const StaffMediatedDeliveryRequestComponent =
  StaffMediatedDeliveryRequestSchema.openapi('StaffMediatedDeliveryRequest');
const StaffMediatedDeliveryResponseComponent =
  StaffMediatedDeliveryResponseSchema.openapi('StaffMediatedDeliveryResponse');
const DeliveryRedeemRequestComponent = DeliveryRedeemRequestSchema.openapi('DeliveryRedeemRequest');
const RecordCorrectionRequestComponent = RecordCorrectionRequestSchema.openapi('RecordCorrectionRequest');
const RecordCorrectionResponseComponent =
  RecordCorrectionResponseSchema.openapi('RecordCorrectionResponse');

const dataRightsPariwarParams = z.object({ pariwarId: z.string().uuid() });
const DATA_RIGHTS_TAG = 'member-data-rights';
/** Every admin route on this surface carries the permission key AND a DISTINCT step-up context. */
const dataRightsAdminNote =
  'Requires an admin session, the `member.data_rights` permission (pariwar dimension) and a fresh ' +
  '`member_data_rights` step-up elevation. `Idempotency-Key` is REQUIRED: a replay of the same key is ' +
  'refused with a typed 409 rather than silently re-executed.';

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member-data-rights/export',
  summary: "BUILD a member's data export off-portal (AC5)",
  description:
    'Assembles the subject member\'s export without a member session, for a member whose portal access ' +
    'has ended. Refuses a closed membership (409 data_export.member_terminal) and reuses an existing ' +
    'active off-portal export rather than assembling a second dossier. ' + dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: dataRightsPariwarParams,
    body: { content: jsonOf(OffPortalExportRequestComponent), required: true },
  },
  responses: {
    200: { description: 'Export requested (or the existing off-portal one reused)', content: jsonOf(OffPortalExportResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Member or helpdesk ticket not found in this Pariwar'),
    409: errorResponse('Export already pending, membership closed, or Idempotency-Key replay'),
    503: errorResponse('Export could not be queued; retry'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/p/{pariwarId}/member-data-rights/export/active',
  summary: "The member's currently-active OFF-PORTAL export, or null",
  description:
    'Lets the operator surface recover the built export across a page reload. ⛔ Returns only exports ' +
    'built through this off-portal route — a member\'s own self-service portal export is never ' +
    'surfaced here. ' + dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: { params: dataRightsPariwarParams },
  responses: {
    200: { description: 'The active export, or null', content: jsonOf(ActiveDataRightsExportResponseComponent) },
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Member not found in this Pariwar'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member-data-rights/erasure',
  summary: 'EXECUTE erasure for an off-portal subject (AC7)',
  description:
    'Irreversible. Requires the originating `helpdesk_ticket_id` and fails closed without it; serializes ' +
    'against concurrent erasure/delivery via an advisory lock; appends `member.rtbf_anonymized` with ' +
    'actor `trustee` and trigger `member_data_rights.rtbf_fulfilled`. ' + dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: dataRightsPariwarParams,
    body: { content: jsonOf(OffPortalErasureRequestComponent), required: true },
  },
  responses: {
    200: { description: 'Erasure completed', content: jsonOf(OffPortalErasureResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Member or helpdesk ticket not found in this Pariwar'),
    409: errorResponse('Not legally erasable, or Idempotency-Key replay'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member-data-rights/delivery/member-direct',
  summary: 'PRIMARY delivery — issue a one-time OTP grant to the member (AC-R1)',
  description:
    'The ruled primary route (Decision 2026-08-14-109 clause 1): a one-time grant the MEMBER redeems ' +
    'themselves with a code sent to their registered mobile. No session is ever issued. Refuses when the ' +
    'member has no registered mobile on file (409 member_data_rights.no_mobile_on_file). ' + dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: dataRightsPariwarParams,
    body: { content: jsonOf(MemberDirectDeliveryRequestComponent), required: true },
  },
  responses: {
    200: { description: 'Grant issued', content: jsonOf(MemberDirectDeliveryResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Export, member or ticket not found for this Pariwar'),
    409: errorResponse('Export not ready, no mobile on file, grant already live, or Idempotency-Key replay'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member-data-rights/delivery/staff-mediated',
  summary: 'NARROW EXCEPTION — staff-mediated delivery behind the ratified three-part gate (AC-R1)',
  description:
    'Decision 2026-08-14-113 clause 1: all three elements are required and none substitutes — (1) the ' +
    "member's own explicit request, (2) the SERVER-OBSERVED `primary_delivery_not_completed` for THIS " +
    "export, and (3) the staff attestation (Tier-1, withheld from the member's export). Enforced again " +
    'as a database CHECK. ' + dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: dataRightsPariwarParams,
    body: { content: jsonOf(StaffMediatedDeliveryRequestComponent), required: true },
  },
  responses: {
    200: { description: 'Exceptional grant recorded', content: jsonOf(StaffMediatedDeliveryResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Export, member or ticket not found for this Pariwar'),
    409: errorResponse('Primary delivery not yet attempted-and-incomplete, export not ready, or replay'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/p/{pariwarId}/member-data-rights/correction',
  summary: 'RECORD a correction request and the action taken (AC-R2)',
  description:
    'A RECORD, not a write path (Decision 2026-08-14-109 clause 2): what the member asked to be ' +
    'corrected and what staff did about it, both Tier-1 at rest. It does not itself mutate member data. ' +
    dataRightsAdminNote,
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: dataRightsPariwarParams,
    body: { content: jsonOf(RecordCorrectionRequestComponent), required: true },
  },
  responses: {
    200: { description: 'Correction recorded', content: jsonOf(RecordCorrectionResponseComponent) },
    400: errorResponse('Request validation failed'),
    401: errorResponse('Authentication required'),
    403: errorResponse('Missing member.data_rights, or step-up required'),
    404: errorResponse('Member or helpdesk ticket not found in this Pariwar'),
    409: errorResponse('Idempotency-Key replay'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/member-data-rights/delivery/{grantId}/redeem',
  summary: 'MEMBER redeems a delivery grant — UNAUTHENTICATED by necessity (AC-R1)',
  description:
    '⛔ The one unauthenticated route on this surface, and deliberately so: the subject is a member whose ' +
    'portal access has ended, and issuing them a session is precisely what Niyamavali §8.4 forecloses. ' +
    'It is NOT an open surface — redemption needs TWO secrets (the unguessable grantId in the path AND ' +
    'the OTP delivered to the registered mobile), the grant is one-time and short-lived, and EVERY ' +
    'failure mode (unknown / spent / expired / wrong code / staff-mediated channel) returns the SAME ' +
    '404, so it is not an existence oracle. Carries the named WRITE rate-limit tier. Responds with the ' +
    'export ZIP on success.',
  tags: [DATA_RIGHTS_TAG],
  request: {
    params: z.object({ grantId: z.string().uuid() }),
    body: { content: jsonOf(DeliveryRedeemRequestComponent), required: true },
  },
  responses: {
    200: {
      description: 'The export archive',
      content: { 'application/zip': { schema: { type: 'string', format: 'binary' } } },
    },
    400: errorResponse('Request validation failed'),
    404: errorResponse('Grant unknown, spent, expired, wrong code, or not member-direct'),
    429: errorResponse('Rate limit exceeded'),
  } as Parameters<typeof registry.registerPath>[0]['responses'],
});

// ── Story 11a.3 — the PUBLIC Member Directory read ────────────────────────────
// ⛔ THE ONE DELIBERATELY-UNAUTHENTICATED, PII-BEARING GET on the committed surface. It exists here
// (rather than on `apps/public`) because the Tier-1 KYC-name decrypt needs KMS deps, the abuse
// signal needs the BYPASSRLS audit writer, and the anti-enumeration ceiling needs a rate-limit
// store — `apps/public` verifiably has none of the three (`2026-08-20-143` cl.1).
// ⭐ REGISTERING IT HERE IS LOAD-BEARING, not bookkeeping: Story 1.14's forced-pagination guard
// walks the LIVE in-process swagger document (`t.app.swagger()`), ⛔ NOT this file — so declaring
// the route here keeps the PUBLISHED CONTRACT accurate; it is ⛔ not what enforces FR-91 on this
// route. ⚠ Corrected at `2026-08-21-145`: four comments claimed the guard reads this file, and in
// this file the 200 body is a `$ref`, which the guard's `isCollectionResponse` would not detect.
// Registering the route is still required, and it gives FR-91 its second, independent
// enforcement on this data path — the one `apps/public` Astro routes are structurally outside of.
const { PublicDirectoryResponse, PublicDirectoryQuery } = await import(
  '../src/public-pages/directory.js'
);
const PublicDirectoryResponseComponent = PublicDirectoryResponse.openapi('PublicDirectoryResponse');
registry.register('PublicDirectoryResponse', PublicDirectoryResponseComponent);
registry.registerPath({
  method: 'get',
  // ⚠ `{pariwarId}`, ⛔ NOT Fastify's `:pariwarId`. This is an OpenAPI document, and this entry was
  // the ONLY colon-style path in the whole committed file — every other `/api/v1/p/…` route uses
  // the brace form. A generated client could not construct the URL at all.
  path: '/api/v1/p/{pariwarId}/public-pages/member-directory',
  summary: 'Public Member Directory page (UNAUTHENTICATED by Panel ruling)',
  description:
    'One page of the public Member Directory: presentation-resolved member name, raw latest-posting ' +
    'district, and the two-label status pill. Deliberately requires NO session — the surface is ' +
    'public tier by ruling 2026-08-19-135/-136 and is consumed server-side by the apps/public SSR ' +
    'shell. Bounded by the named SEARCH rate ceiling keyed on the forwarded visitor address, a ' +
    'page-size cap (50), a deep-pagination horizon (page 200), noindex, and the absence of any ' +
    'member-detail route or export affordance. Its defence is written in login-wall.spec.ts.',
  tags: ['public-pages'],
  // ⭐ `params` IS DECLARED. Without it the published contract carried NO path parameter at all —
  // so the required-uuid constraint on the one segment that selects a TENANT was invisible to every
  // consumer, on a route that returns member PII. `routes.ts` validates it; the document must say so.
  request: {
    params: z.object({ pariwarId: z.string().uuid() }),
    query: PublicDirectoryQuery,
  },
  responses: {
    200: {
      description: 'One page of the public Member Directory',
      content: { 'application/json': { schema: PublicDirectoryResponseComponent } },
    },
  },
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
