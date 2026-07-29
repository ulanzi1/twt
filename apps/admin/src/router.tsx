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
import { CycleFreezeRoute } from './routes/CycleFreezeRoute.js';
import { DegradedModeRoute } from './routes/DegradedModeRoute.js';
import { GroundInspectionRoute } from './routes/GroundInspectionRoute.js';
import { HelpdeskOperatorRoute } from './routes/HelpdeskOperatorRoute.js';
import { HelplineClaimRoute } from './routes/HelplineClaimRoute.js';
import { R9VotingRoute } from './routes/R9VotingRoute.js';
import { FixedAmountRoute } from './routes/FixedAmountRoute.js';
import { ReconciliationReviewRoute } from './routes/ReconciliationReviewRoute.js';
import { VerifierConsoleRoute } from './routes/VerifierConsoleRoute.js';
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

// Story 5.8 — the tenant-scoped trustee degraded-mode declare/revoke surface (AR-20 SMS bridge).
const degradedModeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/degraded-mode',
  component: DegradedModeRoute,
});

// Story 6.3 — the tenant-scoped helpline operator console (claim intake on a caller's behalf).
const helplineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/helpline',
  component: HelplineClaimRoute,
});

// Story 10.3 — the tenant-scoped helpdesk operator console (call-to-ticket on a member's behalf, SM-1 C3).
const helpdeskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/helpdesk',
  component: HelpdeskOperatorRoute,
});

// Story 6.7 — the tenant-scoped ground-inspection console (schedule/notes/photos/complete/refusal).
const groundInspectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/ground-inspection',
  component: GroundInspectionRoute,
});

// Story 6.10 — the tenant-scoped READ-ONLY verifier console (single-case, entered by claim id).
const verifierConsoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/claims/$claimCaseId/verify',
  component: VerifierConsoleRoute,
});

// Story 6.13 — the tenant-scoped State-Trustee cycle-freeze (bulk-approval) surface.
const cycleFreezeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/cycle-freeze',
  component: CycleFreezeRoute,
});

// Story 6.14 — the tenant-scoped R9 special-case voting panel surface.
const r9VotingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/r9-voting',
  component: R9VotingRoute,
});

// Story 7.5 — the tenant-scoped trustee fixed-amount schedule surface (FR-15).
const fixedAmountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/pool-fixed-amount',
  component: FixedAmountRoute,
});

// Story 9.8 — the tenant-scoped reconciliation review queue (the trustee adjudication surface).
const reconciliationReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/reconciliation-review',
  component: ReconciliationReviewRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  integrityRoute,
  provisioningRoute,
  niyamavaliRoute,
  memberSearchRoute,
  channelConfigRoute,
  degradedModeRoute,
  helplineRoute,
  helpdeskRoute,
  groundInspectionRoute,
  verifierConsoleRoute,
  cycleFreezeRoute,
  r9VotingRoute,
  fixedAmountRoute,
  reconciliationReviewRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
