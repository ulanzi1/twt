# `@twt/contracts` — `auth/` admin-authentication contracts

Transport contracts for the admin-authentication surface (Story 1.9, AC-8). These
are the **first real OpenAPI `paths`** in the project (Stories 1.4/1.7/1.8 registered
components-only). Consumed by `apps/api`'s admin-auth + step-up routes for per-route
Zod validation, and registered as `paths` by `scripts/emit-openapi.ts`.

## Files

- `login.ts` — `LoginRequest` / `LoginResponse` (first factor; anti-enumeration).
- `passkey.ts` — WebAuthn register/authenticate options + verify. The OPTIONS
  responses are provider-controlled (`PublicKeyCredential*OptionsJSON`) and are NOT
  modelled; the verify-request `response` field is a passthrough record inside a
  `.strict()` envelope.
- `recovery.ts` — recovery-code consume (second factor).
- `password-reset.ts` — request + consume (signed-link reset; forces WebAuthn re-enrollment).
- `step-up.ts` — step-up OTP request + verify (the elevated-context flow).

## Conventions

- Every object ends `.strict()` (architecture §Format patterns); `z.input`/`z.output`
  naming; reuse `_common/primitives.ts` (`Email`, `UserIdSchema`, `Iso8601Datetime`)
  + `_common/errors.ts` (`ErrorResponse`).
- **No type-shadowing** (Top-10 anti-pattern #2): `apps/api` consumes these via
  `import type { Foo } from '@twt/contracts'` — it does NOT redeclare them.
- No `@twt/contracts/auth` subpath export is wired — consume via the barrel (mirror
  the rbac / pariwar-passport convention).
