// Helpdesk ticket categories + subcategory shape — Story 10.1 (Task 1; AC1/AC2).
//
// The v1 category set (FR-52) is the SINGLE wire/UI source consumed by the member
// ticket-filing form (Story 10.2), the operator surface (Story 10.3), and the admin
// console (Story 10.4). It is also the routing-policy registry's category vocabulary
// (AC2: the default v1 policy covers exactly these nine).
//
// ── Why a SECOND declaration of the tuple (not an import from @twt/domain) ─────────
// `packages/domain/src/schema/helpdesk_tickets.ts` owns the pgEnum-source tuple (the DB
// `CREATE TYPE helpdesk_category`). Contracts CANNOT import it: `@twt/contracts` depends
// on `@twt/domain`, so the reverse import would cycle, and pulling a domain module into a
// SHIPPED contracts file risks leaking `pg` into the RN Metro bundle
// ([[project_contracts_domain_bundle_boundary]]). Instead this file re-declares the tuple
// and a TEST-ONLY sync-guard (tests/helpdesk.test.ts) imports both and asserts they are
// byte-identical — the mechanical drift guard the memory prescribes.
//
// Spelling is hyphen-snake authoritative (FR-52 prose): `kyc-trouble`, `utr-mismatch`, … .

import { z } from 'zod';

/**
 * The v1 helpdesk categories (FR-52). Order is the registry's canonical first-match order
 * hint for the default policy seed, but routing determinism rests on the policy document's
 * explicit rule ORDER (Story 4.6 analog), never on this tuple's order.
 */
export const HELPDESK_CATEGORIES = [
  'kyc-trouble',
  'payment-failed',
  'utr-mismatch',
  'claim-status',
  'profile-update',
  'niyamavali-question',
  'partner-module-issue',
  'complaint',
  'other',
] as const;

/** The category literal union — the routing registry + member/operator UI single source. */
export const HelpdeskCategory = z.enum(HELPDESK_CATEGORIES);
export type HelpdeskCategory = z.output<typeof HelpdeskCategory>;

/**
 * A subcategory is a registry-driven free token (NOT a fixed enum — a Pariwar's routing
 * policy defines which subcategories it recognizes for a category). Nullable everywhere it
 * appears: a ticket may carry no subcategory, and a routing rule with `sub_category: null`
 * matches ANY subcategory within its category (the catch-all-within-category arm).
 */
export const HelpdeskSubcategory = z.string().min(1).max(64);
export type HelpdeskSubcategory = z.output<typeof HelpdeskSubcategory>;
