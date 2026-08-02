// Banner/Popup contracts — Story 10.9 (Task 3, AC9).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enum tuples to the @twt/domain
// pgEnum-source tuples (contracts cannot import domain in SHIPPED files — the RN bundle boundary —
// so this test, which never ships, is the mechanical drift guard, per
// [[project_contracts_domain_bundle_boundary]]); (2) the `.strict()` behaviour + snake_case wire
// shape of the DTOs (a live wire-shape drift, e.g. `displayMode` vs `display_mode`, must fail).

import { banners as bannersDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  BANNER_AUDIENCE_SCOPES,
  BANNER_DISMISSAL_KINDS,
  BANNER_DISPLAY_MODES,
  BANNER_DISPLAY_STATES,
  BANNER_SEVERITIES,
  BANNER_SEVERITY_ORDER,
  BANNER_STATUSES,
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  BannerResponse,
  CreateBannerRequest,
  DismissBannerRequest,
  MemberBannerListResponse,
  MemberBannerResponse,
  UpdateBannerRequest,
} from '../src/banners/index.js';

describe('banners contract ↔ domain sync-guard', () => {
  it('BANNER_DISPLAY_MODES matches the domain pgEnum-source tuple', () => {
    expect([...BANNER_DISPLAY_MODES]).toEqual([...schema.BANNER_DISPLAY_MODES]);
  });

  it('BANNER_SEVERITIES matches the domain pgEnum-source tuple (and its ORDER is the comparator order)', () => {
    expect([...BANNER_SEVERITIES]).toEqual([...schema.BANNER_SEVERITIES]);
    // Every wire severity must be rankable by the Decision 3 comparator — a value the wire accepts
    // but the resolver cannot rank would silently sort last on the member surface. (The comparator
    // lives in THIS package; the pgEnum tuple it must cover lives in @twt/domain.)
    for (const s of BANNER_SEVERITIES) {
      expect(BANNER_SEVERITY_ORDER).toContain(s);
    }
  });

  it('BANNER_STATUSES matches the domain pgEnum-source tuple — three STORED values, not five', () => {
    expect([...BANNER_STATUSES]).toEqual([...schema.BANNER_STATUSES]);
    // `scheduled`/`live`/`expired` are DERIVED (AC2); they must never appear as a stored status.
    expect(BANNER_STATUSES).not.toContain('scheduled');
    expect(BANNER_STATUSES).not.toContain('live');
    expect(BANNER_STATUSES).not.toContain('expired');
  });

  it('BANNER_AUDIENCE_SCOPES matches the domain pgEnum-source tuple', () => {
    expect([...BANNER_AUDIENCE_SCOPES]).toEqual([...schema.BANNER_AUDIENCE_SCOPES]);
  });

  it('BANNER_TARGETABLE_AUDIENCE_SCOPES matches the domain authority (the browser-side mirror)', () => {
    // The contracts copy exists ONLY so apps/admin (which cannot import @twt/domain) can render the
    // "not yet targetable" indicator from the same list the member read's predicate actually applies
    // (bannersDomain.BANNER_TARGETABLE_AUDIENCE_SCOPES, re-exported from banners/audience.js). This
    // is the assertion the enums.ts header comment claims exists — without it the two lists could
    // silently drift the moment Decision 4's seam lights up for a new scope.
    expect([...BANNER_TARGETABLE_AUDIENCE_SCOPES]).toEqual([...bannersDomain.BANNER_TARGETABLE_AUDIENCE_SCOPES]);
  });

  it('BANNER_DISMISSAL_KINDS matches the domain tuple', () => {
    expect([...BANNER_DISMISSAL_KINDS]).toEqual([...schema.BANNER_DISMISSAL_KINDS]);
  });

  it('BANNER_DISPLAY_STATES matches the domain DERIVATION tuple (not a pgEnum — there is no column)', () => {
    // The DERIVATION FUNCTION lives in this package (apps/admin cannot import @twt/domain), but the
    // domain schema file stays the spelling authority for the vocabulary — same guard, same shape.
    expect([...BANNER_DISPLAY_STATES]).toEqual([...schema.BANNER_DISPLAY_STATES]);
  });

  it('the domain status-action helper is reachable (nextBannerStatus barrel)', () => {
    // A trivial cross-package smoke that the domain module is importable + wired.
    expect(bannersDomain.nextBannerStatus('draft', 'publish')).toBe('published');
  });
});

/** A copy of `obj` with the named keys removed — the required-field / drift probes' shared helper. */
function without(obj: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

const validCreate = {
  title: 'Maintenance window',
  body: 'The app is unavailable 02:00–03:00 IST.',
  title_hi: 'रखरखाव अवधि',
  body_hi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
  audience_scope: 'members-all',
  audience_scope_value: null,
  valid_from: '2026-08-01T00:00:00.000Z',
  valid_until: '2026-08-08T00:00:00.000Z',
  display_mode: 'banner',
  dismissible: true,
  display_once_per_member: false,
  severity: 'info',
};

describe('CreateBannerRequest', () => {
  it('accepts a complete, well-formed create', () => {
    expect(CreateBannerRequest.safeParse(validCreate).success).toBe(true);
  });

  it('accepts a draft with NO copy at all (copy becomes mandatory at publish, not at create)', () => {
    expect(CreateBannerRequest.safeParse(without(validCreate, 'title', 'body', 'title_hi', 'body_hi')).success).toBe(
      true,
    );
  });

  it('REQUIRES the window and the presentation fields (the two DB CHECKs constrain them)', () => {
    for (const field of ['valid_from', 'valid_until', 'display_mode', 'dismissible', 'severity', 'audience_scope']) {
      expect(CreateBannerRequest.safeParse(without(validCreate, field)).success).toBe(false);
    }
  });

  it('is `.strict()` — an unknown key is rejected, not silently dropped', () => {
    expect(CreateBannerRequest.safeParse({ ...validCreate, revision: 5 }).success).toBe(false);
    // `status` is server-owned; a client must never be able to create a banner already published.
    expect(CreateBannerRequest.safeParse({ ...validCreate, status: 'published' }).success).toBe(false);
    // …nor supply its own author.
    expect(
      CreateBannerRequest.safeParse({ ...validCreate, created_by_actor_id: '11111111-1111-1111-1111-111111111111' })
        .success,
    ).toBe(false);
  });

  it('rejects camelCase wire drift (the snake_case boundary is the contract)', () => {
    // Each pair: drop the snake_case field, supply the camelCase spelling instead. `.strict()` makes
    // the camelCase key an unknown-key failure AND the missing snake_case key a required-field
    // failure — a silently-accepted drift would be a banner authored with the wrong window.
    const drifts: ReadonlyArray<[string, string, unknown]> = [
      ['display_mode', 'displayMode', 'banner'],
      ['valid_from', 'validFrom', '2026-08-01T00:00:00.000Z'],
      ['body_hi', 'bodyHi', 'x'],
      ['display_once_per_member', 'displayOncePerMember', true],
    ];
    for (const [snake, camel, value] of drifts) {
      expect(CreateBannerRequest.safeParse({ ...without(validCreate, snake), [camel]: value }).success).toBe(false);
    }
  });

  it('rejects an out-of-vocabulary enum value', () => {
    expect(CreateBannerRequest.safeParse({ ...validCreate, severity: 'urgent' }).success).toBe(false);
    expect(CreateBannerRequest.safeParse({ ...validCreate, display_mode: 'toast' }).success).toBe(false);
  });

  it('requires ISO-8601 with an offset on the window fields', () => {
    expect(CreateBannerRequest.safeParse({ ...validCreate, valid_from: '2026-08-01' }).success).toBe(false);
  });

  it('does NOT validate window ORDERING — that is a server invariant (a 422 + a DB CHECK)', () => {
    // Deliberate: the ordering rule lives in ONE place (the domain + the CHECK). A Zod refinement
    // here would be a second, drift-prone copy that a non-HTTP writer would bypass anyway.
    const inverted = { ...validCreate, valid_from: '2026-08-08T00:00:00.000Z', valid_until: '2026-08-01T00:00:00.000Z' };
    expect(CreateBannerRequest.safeParse(inverted).success).toBe(true);
  });

  it('REQUIRES audience_scope_value for the three not-yet-resolvable scopes (Decision 4)', () => {
    for (const scope of ['state', 'role', 'cohort']) {
      expect(
        CreateBannerRequest.safeParse({ ...validCreate, audience_scope: scope, audience_scope_value: null }).success,
      ).toBe(false);
      expect(
        CreateBannerRequest.safeParse({ ...validCreate, audience_scope: scope, audience_scope_value: 'patna' })
          .success,
      ).toBe(true);
    }
  });

  it('FORBIDS audience_scope_value for public/members-all — nothing to discriminate', () => {
    for (const scope of ['public', 'members-all']) {
      expect(
        CreateBannerRequest.safeParse({ ...validCreate, audience_scope: scope, audience_scope_value: 'stray' })
          .success,
      ).toBe(false);
      expect(
        CreateBannerRequest.safeParse({ ...validCreate, audience_scope: scope, audience_scope_value: null }).success,
      ).toBe(true);
    }
  });
});

describe('UpdateBannerRequest', () => {
  it('accepts an empty patch and any single field', () => {
    expect(UpdateBannerRequest.safeParse({}).success).toBe(true);
    expect(UpdateBannerRequest.safeParse({ valid_until: '2026-09-01T00:00:00.000Z' }).success).toBe(true);
    expect(UpdateBannerRequest.safeParse({ body: 'new copy' }).success).toBe(true);
  });

  it('carries NO client-declared "this is a copy change" flag — the server hash decides (Decision 5)', () => {
    expect(UpdateBannerRequest.safeParse({ body: 'new', revised: true }).success).toBe(false);
    expect(UpdateBannerRequest.safeParse({ body: 'new', revision: 2 }).success).toBe(false);
  });

  it('is `.strict()` about server-owned fields', () => {
    expect(UpdateBannerRequest.safeParse({ status: 'published' }).success).toBe(false);
    expect(UpdateBannerRequest.safeParse({ tone_signoff_content_hash: 'x'.repeat(64) }).success).toBe(false);
  });

  it('only checks audience_scope_value coupling when audience_scope is IN this patch', () => {
    // A patch that never mentions audience_scope cannot know whether the STORED scope needs a
    // value — that is a question about the row, not this payload, so it is left unchecked here.
    expect(UpdateBannerRequest.safeParse({ audience_scope_value: 'patna' }).success).toBe(true);
    // But when audience_scope IS in the same patch, the coupling applies exactly as on create.
    expect(UpdateBannerRequest.safeParse({ audience_scope: 'state' }).success).toBe(false);
    expect(UpdateBannerRequest.safeParse({ audience_scope: 'state', audience_scope_value: 'bihar' }).success).toBe(
      true,
    );
    expect(UpdateBannerRequest.safeParse({ audience_scope: 'public', audience_scope_value: 'stray' }).success).toBe(
      false,
    );
  });
});

describe('DismissBannerRequest', () => {
  it('accepts both kinds and nothing else', () => {
    expect(DismissBannerRequest.safeParse({ kind: 'dismissed' }).success).toBe(true);
    expect(DismissBannerRequest.safeParse({ kind: 'shown' }).success).toBe(true);
    expect(DismissBannerRequest.safeParse({ kind: 'hidden' }).success).toBe(false);
  });

  it('does NOT accept a client-supplied revision (the server reads it off the banner row)', () => {
    expect(DismissBannerRequest.safeParse({ kind: 'dismissed', revision: 99 }).success).toBe(false);
    expect(DismissBannerRequest.safeParse({ kind: 'dismissed', dismissed_revision: 99 }).success).toBe(false);
  });
});

const validAdminResponse = {
  banner_id: '11111111-1111-1111-1111-111111111111',
  pariwar_id: '22222222-2222-2222-2222-222222222222',
  title: 'Maintenance window',
  body: 'Down 02:00–03:00.',
  title_hi: 'रखरखाव',
  body_hi: 'बंद',
  audience_scope: 'members-all',
  audience_scope_value: null,
  valid_from: '2026-08-01T00:00:00.000Z',
  valid_until: '2026-08-08T00:00:00.000Z',
  display_mode: 'banner',
  dismissible: true,
  display_once_per_member: false,
  severity: 'info',
  revision: 1,
  status: 'published',
  display_state: 'live',
  created_by_actor_id: '33333333-3333-3333-3333-333333333333',
  tone_signoff_content_hash: 'a'.repeat(64),
  tone_signoff_reviewed_at: '2026-08-01T00:00:00.000Z',
  tone_signoff_reviewed_by: '44444444-4444-4444-4444-444444444444',
  published_at: '2026-08-01T00:00:00.000Z',
  retracted_at: null,
  created_at: '2026-07-30T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

describe('BannerResponse (admin)', () => {
  it('accepts the full authoring row including the DERIVED display_state', () => {
    expect(BannerResponse.safeParse(validAdminResponse).success).toBe(true);
  });

  it('requires `revision` to be a POSITIVE integer (revisions start at 1, never 0)', () => {
    expect(BannerResponse.safeParse({ ...validAdminResponse, revision: 0 }).success).toBe(false);
    expect(BannerResponse.safeParse({ ...validAdminResponse, revision: -1 }).success).toBe(false);
  });

  it('accepts every derived display_state value', () => {
    for (const s of BANNER_DISPLAY_STATES) {
      expect(BannerResponse.safeParse({ ...validAdminResponse, display_state: s }).success).toBe(true);
    }
  });
});

const validMemberResponse = {
  banner_id: '11111111-1111-1111-1111-111111111111',
  title: 'Maintenance window',
  body: 'Down 02:00–03:00.',
  title_hi: 'रखरखाव',
  body_hi: 'बंद',
  display_mode: 'banner',
  dismissible: true,
  display_once_per_member: false,
  severity: 'info',
  revision: 1,
  valid_until: '2026-08-08T00:00:00.000Z',
};

describe('MemberBannerResponse — the member shape leaks nothing', () => {
  it('accepts the member projection', () => {
    expect(MemberBannerResponse.safeParse(validMemberResponse).success).toBe(true);
  });

  it.each([
    ['pariwar_id', '22222222-2222-2222-2222-222222222222'],
    ['created_by_actor_id', '33333333-3333-3333-3333-333333333333'],
    ['tone_signoff_content_hash', 'a'.repeat(64)],
    ['tone_signoff_reviewed_by', '44444444-4444-4444-4444-444444444444'],
    ['audience_scope', 'members-all'],
    ['audience_scope_value', 'lock-in-2026'],
    ['status', 'published'],
  ])('REJECTS the workflow/attribution field `%s` (`.strict()` is the leak guard)', (field, value) => {
    expect(MemberBannerResponse.safeParse({ ...validMemberResponse, [field]: value }).success).toBe(false);
  });
});

describe('MemberBannerListResponse — the RESOLVED pair (AC5)', () => {
  it('carries a banner and a popup SIMULTANEOUSLY (two independent lanes)', () => {
    const both = {
      banner: validMemberResponse,
      popup: { ...validMemberResponse, banner_id: '55555555-5555-5555-5555-555555555555', display_mode: 'popup' },
    };
    expect(MemberBannerListResponse.safeParse(both).success).toBe(true);
  });

  it('accepts either lane being empty, and both', () => {
    expect(MemberBannerListResponse.safeParse({ banner: validMemberResponse, popup: null }).success).toBe(true);
    expect(MemberBannerListResponse.safeParse({ banner: null, popup: validMemberResponse }).success).toBe(true);
    expect(MemberBannerListResponse.safeParse({ banner: null, popup: null }).success).toBe(true);
  });

  it('is a PAIR, not an array — a client cannot receive two banners of one mode', () => {
    expect(MemberBannerListResponse.safeParse({ banner: [validMemberResponse], popup: null }).success).toBe(false);
    expect(MemberBannerListResponse.safeParse({ items: [validMemberResponse] }).success).toBe(false);
  });
});
