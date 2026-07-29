// packages/i18n/src/catalog.ts
//
// The in-memory translation catalog (Story 2.1, AC2). Translation keys live as data
// files at `locales/{hi,en}/{domain}.json`; this module STATICALLY imports them into
// a typed in-memory map the resolver reads.
//
// Why static imports (not fs reads): `packages/i18n` must run unchanged in the browser
// (apps/admin / Vite), React Native (apps/mobile / Metro), Astro SSR (apps/public,
// Story 2.5+) and Node — none of which can read the filesystem at runtime the way a
// build script can. JSON imports are supported by every one of those bundlers/runtimes,
// stay tree-shakeable, and pull in NO heavy i18n runtime (no i18next/react-intl).
//
// ADDING A DOMAIN: add the `{hi,en}/<domain>.json` pair, then add the two imports +
// the two registry lines below. This is deliberately explicit/reviewable (no magic
// glob) and is the only manual step — the build-time parity gate (scripts/check-parity.ts)
// then enforces Hindi parity on the new domain automatically.

import enClaim from '../locales/en/claim.json';
import enCloseOfCycle from '../locales/en/close-of-cycle.json';
import enCommon from '../locales/en/common.json';
import enContribution from '../locales/en/contribution.json';
import enHelpdesk from '../locales/en/helpdesk.json';
import enNiyamavali from '../locales/en/niyamavali.json';
import enNomineeConsole from '../locales/en/nominee-console.json';
import enPoolOnboarding from '../locales/en/pool-onboarding.json';
import enTerms from '../locales/en/terms.json';
import hiClaim from '../locales/hi/claim.json';
import hiCloseOfCycle from '../locales/hi/close-of-cycle.json';
import hiCommon from '../locales/hi/common.json';
import hiContribution from '../locales/hi/contribution.json';
import hiHelpdesk from '../locales/hi/helpdesk.json';
import hiNiyamavali from '../locales/hi/niyamavali.json';
import hiNomineeConsole from '../locales/hi/nominee-console.json';
import hiPoolOnboarding from '../locales/hi/pool-onboarding.json';
import hiTerms from '../locales/hi/terms.json';

import type { Locale } from './locale.js';

/** A single domain's flat key→string map for one locale. */
export type Catalog = Record<string, string>;

const catalogs: Record<Locale, Record<string, Catalog>> = {
  en: { common: enCommon, niyamavali: enNiyamavali, terms: enTerms, claim: enClaim, contribution: enContribution, 'close-of-cycle': enCloseOfCycle, 'pool-onboarding': enPoolOnboarding, 'nominee-console': enNomineeConsole, helpdesk: enHelpdesk },
  hi: { common: hiCommon, niyamavali: hiNiyamavali, terms: hiTerms, claim: hiClaim, contribution: hiContribution, 'close-of-cycle': hiCloseOfCycle, 'pool-onboarding': hiPoolOnboarding, 'nominee-console': hiNomineeConsole, helpdesk: hiHelpdesk },
};

/** The domain (namespace) names that have at least one locale catalog. */
export const KNOWN_NAMESPACES: readonly string[] = ['common', 'niyamavali', 'terms', 'claim', 'contribution', 'close-of-cycle', 'pool-onboarding', 'nominee-console', 'helpdesk'];

/** Look up a `{locale}/{namespace}` catalog, or `undefined` if it is not registered. */
export function getCatalog(locale: Locale, namespace: string): Catalog | undefined {
  return catalogs[locale][namespace];
}
