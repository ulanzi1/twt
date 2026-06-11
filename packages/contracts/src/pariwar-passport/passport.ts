// packages/contracts/src/pariwar-passport/passport.ts
//
// Transport contract for the Pariwar-Passport response (the cross-Pariwar-readable
// surface, AC-2). camelCase top-level fields mirror the domain Drizzle row
// (packages/domain/src/schema/pariwar_passport.ts) per the contracts convention
// (see _common/event-log-contract.ts); `brandingBundle` wraps the snake_case JSONB
// sub-object. Timestamps are Iso8601 strings — apps/api serialises Date at the
// transport boundary (Story 1.9+). The upsert/request contract is route-coupled
// and lands with the apps/api write route at Story 1.9 (D4-1.6), not here.

import { z } from 'zod';

import { Iso8601Datetime, PariwarIdSchema, UuidString } from '../_common/primitives.js';
import { BrandingBundle } from './branding-bundle.js';

/** Default chrome locale — mirrors the domain `locale` pgEnum (`hi | en`). */
export const LocaleDefault = z.enum(['hi', 'en']);
export type LocaleDefault = z.output<typeof LocaleDefault>;

export const PariwarPassportResponse = z
  .object({
    pariwarId: PariwarIdSchema,
    displayNameEn: z.string().min(1),
    displayNameHi: z.string().min(1),
    legalName: z.string().min(1),
    trustRegistrationId: z.string().nullable(),
    brandingBundle: BrandingBundle,
    localeDefault: LocaleDefault,
    createdAt: Iso8601Datetime,
    createdBy: UuidString.nullable(),
    updatedAt: Iso8601Datetime,
  })
  .strict();
export type PariwarPassportResponse = z.output<typeof PariwarPassportResponse>;
