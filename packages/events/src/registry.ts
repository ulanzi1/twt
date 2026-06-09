// EVENT_TYPE_REGISTRY — Story 1.3 substrate.
//
// Enumerates all event types known to the system per architecture
// §Complete project directory structure line 4418 + FM-PS-10. Substantive
// event-type enumeration is per-Story landed:
//   - Story 3.1+ member.*       (signup_initiated, kyc_completed, lockin_entered, …)
//   - Story 6.x   claim.*        (filed, verified, approved, settled)
//   - Story 7.x   pool.*         (spawned, frozen, …)
//   - Story 8.x   alert.*        (created, dispatched, …)
//   - Story 9.x   contribution.* (matched, confirmed, …)
//   - Story 1.10  audit.*        (audit-log entries are NOT general events —
//                                 architecture §1.5 puts them in a separate
//                                 audit_log_entries table; Story 1.10 decides
//                                 whether some audit lines additionally
//                                 surface as events_log entries)
//
// Story 1.3 commits the registry SHAPE (a typed map of event-type → schema);
// downstream Stories add entries.

import type { z } from 'zod';

export interface EventTypeRegistryEntry {
  readonly type: string;
  readonly description: string;
  readonly schema?: z.ZodTypeAny;
}

export const EVENT_TYPE_REGISTRY = {
  // Placeholder; downstream Stories populate.
} as const satisfies Readonly<Record<string, EventTypeRegistryEntry>>;
