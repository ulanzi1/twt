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
const { AuditLogEntryContract } = await import('../src/audit/index.js');
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
} = await import('../src/auth/index.js');

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

// Story 1.9 — register the admin-auth components.
for (const [name, schema] of Object.entries(authComponents)) {
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
