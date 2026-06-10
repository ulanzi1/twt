// packages/contracts/src/_common/health.ts
//
// Substrate-proof toy endpoint contract — drives the OpenAPI emission pipeline
// proof at Story 1.4 Task 3. When apps/api/ substantively populates at
// Story 1.9+, the production /_meta/health endpoint lives there with the
// substantive shape (uptime, DB connectivity, queue depth, etc.).

import { z } from 'zod';
import { Iso8601Datetime } from './primitives.js';

export const HealthResponse = z
  .object({
    status: z.enum(['ok', 'degraded']),
    timestamp: Iso8601Datetime,
  })
  .strict();

export type HealthResponse = z.output<typeof HealthResponse>;
