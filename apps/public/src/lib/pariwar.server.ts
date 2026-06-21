// Active-Pariwar resolution for the public surface (Story 2.5, Dev Notes §"Pariwar
// resolution"). v1 is single-Pariwar (Bihar); subdomain/path-based multi-Pariwar
// resolution is a later concern. Centralized HERE so the UUID is never hardcoded in
// a `.astro` file or in more than one place.
//
// `*.server.ts` suffix marks this as a server-only module — it is never part of a
// client island's module graph (AC9), so importing `@twt/domain` here is safe.
// `pariwarId` / `PariwarId` live under the `ids` namespace export.
import { ids } from '@twt/domain';

/**
 * The Bihar seed `pariwar_id` — the synthetic single-tenant Pariwar the v1 seed
 * (`packages/domain/seed/niyamavali-v1-clauses.sql`) writes its clauses under. Used
 * as the fallback when `PUBLIC_PARIWAR_ID` is not set in the environment.
 */
const DEFAULT_BIHAR_PARIWAR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/**
 * The Pariwar every public render resolves against. Read once from
 * `PUBLIC_PARIWAR_ID` (committed convention; declared in `turbo.json` `globalEnv`),
 * falling back to the Bihar seed id. Validated through the `pariwarId` smart
 * constructor so a malformed env value fails loudly at boot, not mid-request.
 */
export const ACTIVE_PARIWAR_ID: ids.PariwarId = ids.pariwarId(
  process.env.PUBLIC_PARIWAR_ID ?? DEFAULT_BIHAR_PARIWAR_ID,
);
