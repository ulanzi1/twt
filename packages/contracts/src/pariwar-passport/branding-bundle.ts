// packages/contracts/src/pariwar-passport/branding-bundle.ts
//
// Transport contract for the runtime branding subset (FR-63). Mirrors the domain
// BrandingBundle JSONB shape (packages/domain/src/schema/pariwar_passport.ts).
// Keys are snake_case per architecture §Naming patterns line 3668 — this object
// IS the JSONB blob stored/read verbatim, NOT a camelCase transport DTO. This is
// the runtime subset only; the FR-60 build-time bundle (tokens / eas.json / i18n
// overlays) is a separate compile-time concern (Story 1.15 / Epic 11a).

import { z } from 'zod';

/** Hex colour `#RRGGBB`. Runtime-validated; the output type is plain `string`. */
const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'must be a #RRGGBB hex colour');

export const BrandingBundle = z
  .object({
    /** Primary logo URL (light backgrounds). */
    logo_url: z.string().url(),
    /** Optional dark-background logo variant. */
    logo_url_dark: z.string().url().optional(),
    /** Primary brand colour. */
    primary_color: HexColor,
    /** Secondary brand colour. */
    secondary_color: HexColor,
    /** Optional accent colour. */
    accent_color: HexColor.optional(),
  })
  .strict();
export type BrandingBundle = z.output<typeof BrandingBundle>;
