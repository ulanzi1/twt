// packages/contracts/src/pariwar-provisioning/add-pariwar.ts
//
// Transport contract for the Add-Pariwar provisioning form (Story 1.15, AC-2/AC-4).
// The payload maps 1:1 to the `pariwar_passport` insertable columns the provisioning
// write upserts (packages/domain/src/schema/pariwar_passport.ts `PariwarPassportInsert`)
// EXCEPT `pariwar_id` — that is server-minted (UUID v4) by the provisioning handler,
// never client-supplied (a new Pariwar has no id yet). The derived `/p/<pariwar_id>/`
// path-scope is likewise computed server-side (AC-3 reader), not an input field.
//
// REUSES `@twt/contracts/pariwar-passport` — `BrandingBundle` (the `#RRGGBB` hex shape)
// and `LocaleDefault` (`hi | en`) — rather than redefining the branding/locale shapes
// (anti-reinvention; the passport contracts already enforce the hex shape).

import { z } from 'zod';

import { BrandingBundle, LocaleDefault } from '../pariwar-passport/index.js';

export const AddPariwarRequest = z
  .object({
    /** Public display name (English). NOT NULL on the passport. */
    displayNameEn: z.string().min(1),
    /** Public display name (Hindi). NOT NULL on the passport. */
    displayNameHi: z.string().min(1),
    /** Registered legal/trust name — public registry data. NOT NULL on the passport. */
    legalName: z.string().min(1),
    /**
     * Government trust-registration number — optional (not every Pariwar has one
     * at provisioning time). Maps to the nullable `trust_registration_id` column;
     * an omitted value persists as NULL.
     */
    trustRegistrationId: z.string().min(1).nullish(),
    /** Default chrome locale (`hi | en`). */
    localeDefault: LocaleDefault,
    /** Runtime branding subset (logo URL(s) + `#RRGGBB` palette). */
    brandingBundle: BrandingBundle,
  })
  .strict();
export type AddPariwarRequest = z.output<typeof AddPariwarRequest>;
