// Contributions module barrel — Story 10.26.
//
// The member-facing contribution-governance write surfaces. Today there is exactly one: the
// personal-event ASSERTION, which supplies `contribution.personal_event_excuse_claimed` — the
// SEVENTH and final `contribution.*` fact the Niyamavali engine reads, and the one key that was
// never derivable from anything, because it records a member ACT that had nowhere to happen.
//
// ⚠ The event it writes is `member.personal_event_asserted`, NOT a `contribution.*` event. Story
// 8.10's `no-ingest-path` fence pins the `contribution.*` event vocabulary at exactly three, and the
// assertion is semantically a member act about the member's own life. It also buys validity-cache
// invalidation for free (migration `0036`'s `member.%` trigger). See the domain module for D2.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerPersonalEventRoutes } from './personal-event-routes.js';

export function registerContributionsModule(app: FastifyInstance, deps: AppDeps): void {
  registerPersonalEventRoutes(app, deps);
}
