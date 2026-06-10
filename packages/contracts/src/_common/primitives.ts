// packages/contracts/src/_common/primitives.ts
//
// Shared transport-layer primitives. Substantive branded ID types live at
// packages/domain/src/ids/ per architecture §Cross-cutting concerns line 4538
// and land at Story 1.7. Story 1.4 commits the transport-shape UUID Zod
// primitive without branding so consumers don't block on Story 1.7.

import { z } from 'zod';

/** ISO 8601 datetime with timezone offset (architecture §Format patterns line 3807-3809). */
export const Iso8601Datetime = z.string().datetime({ offset: true });
export type Iso8601Datetime = z.output<typeof Iso8601Datetime>;

/** UUID wire-shape; downstream Stories may brand via packages/domain/src/ids/. */
export const UuidString = z.string().uuid();
export type UuidString = z.output<typeof UuidString>;

/** Request correlation id echoed in headers + logs + audit (architecture §3.2 line 1832). */
export const RequestId = z.string().uuid();
export type RequestId = z.output<typeof RequestId>;

/** RFC 5321 email; relaxed validation — strict policy at downstream Stories. */
export const Email = z.string().email();
export type Email = z.output<typeof Email>;
