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

import { ChannelConfigRoute } from './routes/ChannelConfigRoute.js';
import { IntegrityRoute } from './routes/IntegrityRoute.js';
import { LoginPage } from './routes/LoginPage.js';
import { MemberSearchRoute } from './routes/MemberSearchRoute.js';
import { NiyamavaliRoute } from './routes/NiyamavaliRoute.js';
import { ProvisioningRoute } from './routes/ProvisioningRoute.js';
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

const provisioningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/provisioning',
  component: ProvisioningRoute,
});

// Story 2.4 — the FIRST `/p/:pariwarId/`-scoped admin route (the Niyamavali
// amendment workflow). The path-scoped `pariwarId` threads into the tenant-scoped
// API calls.
const niyamavaliRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/niyamavali',
  component: NiyamavaliRoute,
});

// Story 4.7 — the tenant-scoped admin member-search + `<MemberStatusPanel>` surface.
const memberSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/members',
  component: MemberSearchRoute,
});

// Story 5.3 — the tenant-scoped trustee WhatsApp Business config surface (FR-72).
const channelConfigRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/channel-config',
  component: ChannelConfigRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  integrityRoute,
  provisioningRoute,
  niyamavaliRoute,
  memberSearchRoute,
  channelConfigRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
