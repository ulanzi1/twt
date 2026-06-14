// TanStack Router route tree (Story 1.11b, DD-1).
//
// Code-based routing (a recorded DD-1 deviation from file-based codegen — keeps the
// `tsc → vite build` gate + CI deterministic for this 3-route dev surface; the
// committed TanStack Router stack, §4.7, is unchanged). Routes:
//   /                 → redirect to /audit/integrity
//   /login            → the minimal admin login (DD-2)
//   /audit/integrity  → the trustee verify surface, gated on audit.verify (AC-1)

import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { IntegrityRoute } from './routes/IntegrityRoute.js';
import { LoginPage } from './routes/LoginPage.js';
import { RootErrorComponent, RootLayout } from './routes/RootLayout.js';

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/audit/integrity' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const integrityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit/integrity',
  component: IntegrityRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, integrityRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
