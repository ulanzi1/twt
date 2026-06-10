// packages/contracts/src/_common/event-log-contract.ts
//
// Transport-layer wire shape for events_log rows surfaced via API to
// audit-integrity UIs (Stories 1.10 / 1.11b). Mirrors packages/domain
// events_log Drizzle schema (Story 1.3) — the contract-↔-domain
// type-assignability test (tests/type-assignability.test.ts) asserts
// the two stay aligned.
//
// Per architecture §Naming patterns line 3719-3723: contracts is the
// source for transport types; domain derives via z.output/z.input;
// hand-written shadow types are forbidden.

import { z } from 'zod';
import { UuidString, Iso8601Datetime } from './primitives.js';

export const EventLogContract = z
  .object({
    eventId: UuidString,
    streamId: UuidString,
    eventType: z.string().min(1),
    payload: z.unknown(),
    eventVersion: z.number().int().min(1),
    occurredAt: Iso8601Datetime,
    actorId: UuidString.nullable(),
    pariwarId: UuidString,
  })
  .strict();

export type EventLogContract = z.output<typeof EventLogContract>;
