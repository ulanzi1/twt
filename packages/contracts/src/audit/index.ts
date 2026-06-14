// packages/contracts/src/audit/index.ts
//
// Barrel for the audit-log transport contracts (Story 1.10, AC-1). Re-exported
// from the package root (packages/contracts/src/index.ts) so consumers import
// from `@twt/contracts`. A `@twt/contracts/audit` subpath export is not wired yet
// (no apps/api consumer until the Story 1.11b read endpoints; mirrors how
// pariwar-passport / rbac were wired) — adding an `exports` map entry then is
// trivial.
//
// Endpoint discipline (audit/README.md): tenant-scoped audit reads at
// `/api/v1/p/<pariwar_id>/audit/...` + the global trustee surface land at Story
// 1.11b; this story registers the component schema only. No type-shadowing in
// apps/api — consume `AuditLogEntryContract`, do not redeclare.

export * from './audit-log-entry.js';
