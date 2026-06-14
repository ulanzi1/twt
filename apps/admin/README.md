# @twt/admin — trustee/admin SPA

The admin/trustee web surface. Bootstrapped at **Story 1.11b** as the first real admin
UI in the repo — a developer-grade surface (UX §L50: "admin scaffolding ships first as a
developer surface; polished member UI follows"), hosting the trustee-facing **Verify
audit-log integrity** module.

## Stack (architecture §4.1 / §4.7)

- **Vite 7** + **React 19** + TypeScript (CSS-first **Tailwind v4** via `@tailwindcss/vite`
  — there is intentionally **no `tailwind.config.ts`**; theme tokens live in
  `src/styles.css` `@theme {}`).
- **TanStack Router** (code-based — see Deviations) + **TanStack Query v5** for server state.
- **React Hook Form** + **Zod** (the same `@twt/contracts` schemas the server validates).
- **Radix UI** primitives for accessible widgets (the acknowledge flow is a focus-trapped
  Radix Dialog).
- **@simplewebauthn/browser** for the passkey leg of login.

## Layout

```
src/
  main.tsx                     # entry: QueryClientProvider + RouterProvider + styles
  router.tsx                   # code-based TanStack Router tree
  styles.css                   # Tailwind v4 entry + @theme tokens
  api/
    client.ts                  # thin typed fetch layer, parses with @twt/contracts Zod (DD-7)
    hooks.ts                   # TanStack Query hooks (cache-disabled reads, §4.5)
  routes/
    RootLayout.tsx             # app shell / chrome + nav gate + route error boundary (§4.9)
    LoginPage.tsx              # minimal login (password → passkey / recovery) (DD-2)
    IntegrityRoute.tsx         # /audit/integrity + the audit.verify permission gate (AC-1)
  modules/audit-integrity/     # the Verify-audit-log-integrity surface
    IntegrityPage.tsx          # run-now + banner + last-automated card + history
    StatusBanner.tsx           # green/red banner (aria-live) + the four AC-4 failure fields
    HistoryTable.tsx           # last-30 history
    AcknowledgeDialog.tsx      # Radix Dialog wrapping the acknowledge form (AC-5)
    AcknowledgeForm.tsx        # RHF + Zod ticket-ref form
    derive.ts                  # pure view-model derivation (banner state + DD-4 fields)
```

## Scripts

| Script           | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Vite dev server on :3001 (proxies `/api` → :3000)       |
| `pnpm build`     | `tsc --noEmit` then `vite build` (static bundle → dist) |
| `pnpm typecheck` | `tsc --noEmit`                                           |
| `pnpm test`      | Vitest + jsdom + React Testing Library                  |
| `pnpm lint`      | ESLint (browser globals + react-hooks)                  |

## Auth + API origin

Every request rides the HttpOnly + SameSite=Lax admin session cookie via
`credentials: 'include'`. In dev, Vite proxies `/api` to apps/api (:3000) so the SPA and
API share an origin. In production the Dockerfile serves the static bundle from nginx; the
deployment ingress (Dokploy reverse proxy) routes `/api` to apps/api so the cookie keeps
working same-origin. CSRF posture matches ADR-0009 (Origin/Referer + SameSite baseline;
double-submit token only on `logout`).

## The audit.verify gate (AC-1 / DD-6)

The nav entry + the `/audit/integrity` route are gated client-side on the `audit.verify`
grant returned by `GET /api/v1/auth/session` (`nationalGrants`). This gate is **advisory** —
`requireAdminSession` is the real boundary on every endpoint; the endpoint-side `audit.verify`
RBAC upgrade is deferred (D4-1.11a).

## Deviations recorded at bootstrap (see deferred-work.md)

- **Code-based routing** instead of file-based `routeTree.gen.ts` codegen (D8-1.11b) — keeps
  the `tsc → vite build` gate + CI deterministic for a 3-route surface.
- **Session grants in TanStack Query**, not a separate Zustand store (D7-1.11b) — the session
  is a server read; §4.3 places server state in Query.
- `packages/ui` / `packages/tokens` extraction + full OpenAPI→client codegen are deferred
  (D3/D4-1.11b) — Tailwind/Radix + a hand-written typed client are used directly here for v1.
