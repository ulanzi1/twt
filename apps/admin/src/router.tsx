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
import { HelpdeskQueueRoute } from './routes/HelpdeskQueueRoute.js';
import { NewsRoute } from './routes/NewsRoute.js';
import { BannersRoute } from './routes/BannersRoute.js';
import { FeatureFlagsRoute } from './routes/FeatureFlagsRoute.js';
import { CustomFieldsRoute } from './routes/CustomFieldsRoute.js';
import { ReportsRoute } from './routes/ReportsRoute.js';
import { HelpdeskTicketRoute } from './routes/HelpdeskTicketRoute.js';
import { HelplineClaimRoute } from './routes/HelplineClaimRoute.js';
import { R9VotingRoute } from './routes/R9VotingRoute.js';
import { FixedAmountRoute } from './routes/FixedAmountRoute.js';
import { ReconciliationReviewRoute } from './routes/ReconciliationReviewRoute.js';
import { TrusteeLiteRoute } from './routes/TrusteeLiteRoute.js';
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

// Story 10.4 — the tenant-scoped helpdesk RESPONDER console (queue + ticket detail with transitions).
const helpdeskQueueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/helpdesk/queue',
  component: HelpdeskQueueRoute,
});
const helpdeskTicketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/helpdesk/tickets/$ticketId',
  component: HelpdeskTicketRoute,
});

// Story 10.5 — the tenant-scoped News/Blog authoring console (list + editor + submit/approve/schedule/publish).
const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/news',
  component: NewsRoute,
});

// Story 10.9 — the tenant-scoped banner/popup console (list + editor + live preview + the AC5
// visibility verdict + publish/retract). Distinct from the News/Blog console above: banners are
// time-bounded in-app chrome, not dispatched announcements.
const bannersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/banners',
  component: BannersRoute,
});

// Story 10.7 — the tenant-scoped reports-&-exports console (request/poll/one-time-download).
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/reports',
  component: ReportsRoute,
});

// Story 10.8 — the tenant-scoped feature-flag inventory console (the "no secret flags" surface + the flip).
// Story 10.12 — the tenant-scoped per-Pariwar custom-fields console (FR-54): the in-force definition
// list, the publish form over the FIXED type allowlist, and the per-definition Retire action.
// Deliberately minimal — the UX spec has no form-builder or per-Pariwar settings grammar (§11 calls
// component grammar tenant-invariant), so a richer surface would mean inventing UX (ESCALATION 5).
// There is NO member-facing renderer: custom-field VALUES are written through the API only in v1.
const customFieldsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/custom-fields',
  component: CustomFieldsRoute,
});

const featureFlagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/feature-flags',
  component: FeatureFlagsRoute,
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

// Story 10.11 — the Trustee-Lite worklist: every trustee-attention item across six sources, in one
// list, each row cross-linking to the surface where the trustee actually acts.
const trusteeLiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$pariwarId/trustee',
  component: TrusteeLiteRoute,
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
  helpdeskQueueRoute,
  helpdeskTicketRoute,
  newsRoute,
  bannersRoute,
  reportsRoute,
  featureFlagsRoute,
  customFieldsRoute,
  groundInspectionRoute,
  verifierConsoleRoute,
  cycleFreezeRoute,
  r9VotingRoute,
  fixedAmountRoute,
  reconciliationReviewRoute,
  trusteeLiteRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
