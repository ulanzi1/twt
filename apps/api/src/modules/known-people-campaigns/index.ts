// The people-who-know-me CAMPAIGN module barrel — Story 6.36c (Task 4.2; AC7). A Pariwar Admin runs a short campaign; the
// app shows a card to the members who can act on it (`GET /api/v1/member/known-people/prompts`). It sends ⛔ nothing.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerKnownPeopleCampaignRoutes } from './routes.js';

export function registerKnownPeopleCampaignsModule(app: FastifyInstance, deps: AppDeps): void {
  registerKnownPeopleCampaignRoutes(app, deps);
}
