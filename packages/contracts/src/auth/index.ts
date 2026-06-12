// packages/contracts/src/auth/index.ts
//
// Admin-authentication transport contracts (Story 1.9, AC-8). The first real
// `paths` in the OpenAPI surface (Stories 1.4/1.7/1.8 registered components-only).
// Re-exported from `@twt/contracts`; consume via the barrel (no `/auth` subpath
// export is wired — mirror the rbac/pariwar-passport convention).

export * from './login.js';
export * from './passkey.js';
export * from './recovery.js';
export * from './password-reset.js';
export * from './step-up.js';
