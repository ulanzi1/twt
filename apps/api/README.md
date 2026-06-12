# @twt/api — Fastify HTTP surface

The TWT API server. Landed at **Story 1.9** (the `apps/api` framework landing,
wearing an admin-auth hat) — converting the Story 1.1 `export {}` placeholder into
a booting Fastify app with the architecture §3 plugin/middleware/module tree that
14 downstream epics inherit.

## Layout (architecture §3 canonical source tree)

```
src/
  server.ts                  buildServer(deps) Fastify factory (exported for fastify.inject tests)
  index.ts                   entry + boot guard (listen only when run directly)
  config.ts                  env loader (validated at boot)
  context.ts / deps.ts       AppDeps DI seam + production/local deps factory
  http-errors.ts             ApiError hierarchy → ErrorResponse envelope
  plugins/
    zod-openapi/             fastify-type-provider-zod validator/serializer compilers
    swagger/                 @fastify/swagger live /docs/json
    cookie/ session/         @fastify/cookie + @fastify/session (PgSessionStore)
    rate-limit/              @fastify/rate-limit (global + per-route)
    csrf-protection/         @fastify/csrf-protection (double-submit) + Origin/Referer check
  middleware/
    request-context/         AsyncLocalStorage {traceId, actorId?, pariwarId?} + encryptionContext
    scope-resolution/        /p/:pariwarId/… → strict-UUID + scope tx + membership 404
    error-mapping/           every throw → ErrorResponse (uncaught → 500 no-leak)
  modules/
    auth/admin/              password + WebAuthn + recovery + reset + lockout (5-file shape)
    auth/shared/             password, email-index, recovery, signed-link, audit, webauthn, seams
    rbac/                    requirePermission Fastify pre-handler (the second guard, after RLS)
    multi-tenant/            scope-tx lifecycle + the demonstrative /p/:id/ routes
    step-up/                 step-up OTP mechanism + gating middleware
  audit/                     AuthAuditSink seam (default structured log; FR-47 sink is Story 1.10)
```

## Admin-auth surface (Story 1.9)

- `POST /api/v1/auth/login` — first factor (email + Argon2id+pepper); returns `mfa_required`.
- `POST /api/v1/auth/passkey/{register,authenticate}/{options,verify}` — WebAuthn v13.
- `POST /api/v1/auth/recovery/consume` — recovery-code second factor.
- `POST /api/v1/auth/password-reset/{request,consume}` — signed-link reset.
- `POST /api/v1/auth/step-up/{request,verify}` — step-up OTP (delivery seamed → Epic 5).
- `GET  /api/v1/auth/csrf` — mint a double-submit CSRF token.
- `GET  /api/v1/_meta/{health,ready}` — liveness / readiness.

## Running

Copy `.env.example` → `.env` and set the required vars (`SESSION_SECRET`,
`WEBAUTHN_RP_ID`, `WEBAUTHN_EXPECTED_ORIGIN`, `ARGON2_PEPPER_SECRET_NAME`,
`DATABASE_URL`). Then:

```
pnpm --filter @twt/api dev      # tsx watch
pnpm --filter @twt/api test     # vitest (integration specs need DATABASE_URL)
```

Production resolves secrets via GCP Secret Manager — never set `*_PEPPER` values in
a deployed environment. See ADR-0009 for the session model, Argon2id params,
WebAuthn enrollment ceremony, the identity/auth RLS carve-out, and the dep-version
reconciliation (`fastify-type-provider-zod` v4; `fastify-zod-openapi` dropped).
