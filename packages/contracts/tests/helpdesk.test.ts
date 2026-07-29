// Helpdesk contracts — Story 10.1 (Task 1; review-hardening, chunk 3).
//
// THREE jobs: (1) the test-only sync-guard that binds the contract tuples to the @twt/domain pgEnum-
// source tuples (contracts cannot import domain in SHIPPED files — the RN bundle boundary — so this
// test, which never ships, is the mechanical drift guard, per [[project_contracts_domain_bundle_boundary]]);
// (2) the `.strict()` + superRefine behavior of every helpdesk contract schema (previously only
// CreateTicketRequest and the four sync-guard tuples were exercised — this is how a live wire-shape
// drift, `sub_category` vs `subcategory`, went uncaught); (3) boundary-value coverage.

import { schema, rbac } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CreateTicketRequest,
  HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES,
  HELPDESK_ATTACHMENT_MAX_BYTES,
  HELPDESK_ATTACHMENT_MAX_COUNT,
  HELPDESK_CATEGORIES,
  HELPDESK_CREATED_VIA,
  HELPDESK_SCOPE_DIMENSIONS,
  HELPDESK_TICKET_STATES,
  HelpdeskAttachment,
  HelpdeskGrantScope,
  HelpdeskTicketDto,
  MemberCreateTicketRequest,
  MemberScopeContext,
  MemberTicketDetailResponse,
  RoutingDecision,
  RoutingPolicyDocument,
  RoutingRule,
  sanitizeAttachmentFilename,
} from '../src/helpdesk/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';
const ACTOR = '33333333-3333-3333-3333-333333333333';

describe('helpdesk contracts ↔ @twt/domain tuple sync-guard', () => {
  it('HELPDESK_CATEGORIES matches the domain pgEnum-source tuple exactly (order included)', () => {
    expect([...HELPDESK_CATEGORIES]).toEqual([...schema.HELPDESK_CATEGORIES]);
  });

  it('HELPDESK_TICKET_STATES matches the domain pgEnum-source tuple exactly (the ratified union)', () => {
    expect([...HELPDESK_TICKET_STATES]).toEqual([...schema.HELPDESK_TICKET_STATES]);
  });

  it('HELPDESK_CREATED_VIA matches the domain tuple', () => {
    expect([...HELPDESK_CREATED_VIA]).toEqual([...schema.HELPDESK_CREATED_VIA_VALUES]);
  });

  it('HELPDESK_SCOPE_DIMENSIONS matches the domain rbac SCOPE_DIMENSIONS', () => {
    expect([...HELPDESK_SCOPE_DIMENSIONS]).toEqual([...rbac.SCOPE_DIMENSIONS]);
  });

  // Story 10.2 (AC6) — the attachment allowlist + count cap are the authoritative source in
  // contracts and re-declared in @twt/domain (for the event-payload schema). Guard the drift the
  // same way the category/state tuples are guarded.
  it('HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES matches the domain re-declaration', () => {
    expect([...HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES]).toEqual([...schema.HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES]);
  });

  it('HELPDESK_ATTACHMENT_MAX_COUNT matches the domain re-declaration', () => {
    expect(HELPDESK_ATTACHMENT_MAX_COUNT).toBe(schema.HELPDESK_ATTACHMENT_MAX_COUNT);
  });
});

describe('HelpdeskAttachment — Story 10.2 hardening (AC6)', () => {
  const good = { object_key: 'pariwar/p/helpdesk/t/a', content_type: 'application/pdf', filename: 'proof.pdf', size_bytes: 2048 };

  it('accepts a well-formed hardened attachment', () => {
    expect(HelpdeskAttachment.safeParse(good).success).toBe(true);
  });

  it('rejects a content_type outside the MIME allowlist', () => {
    expect(HelpdeskAttachment.safeParse({ ...good, content_type: 'application/zip' }).success).toBe(false);
    expect(HelpdeskAttachment.safeParse({ ...good, content_type: 'text/html' }).success).toBe(false);
  });

  it('accepts every allowlisted MIME type', () => {
    for (const mime of HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES) {
      expect(HelpdeskAttachment.safeParse({ ...good, content_type: mime }).success).toBe(true);
    }
  });

  it('requires size_bytes and rejects non-positive / oversize values', () => {
    const noSize = { object_key: good.object_key, content_type: good.content_type, filename: good.filename };
    expect(HelpdeskAttachment.safeParse(noSize).success).toBe(false);
    expect(HelpdeskAttachment.safeParse({ ...good, size_bytes: 0 }).success).toBe(false);
    expect(HelpdeskAttachment.safeParse({ ...good, size_bytes: -1 }).success).toBe(false);
    expect(HelpdeskAttachment.safeParse({ ...good, size_bytes: HELPDESK_ATTACHMENT_MAX_BYTES + 1 }).success).toBe(false);
    expect(HelpdeskAttachment.safeParse({ ...good, size_bytes: HELPDESK_ATTACHMENT_MAX_BYTES }).success).toBe(true);
  });

  it('rejects an unknown key (.strict())', () => {
    expect(HelpdeskAttachment.safeParse({ ...good, extra: 1 }).success).toBe(false);
  });
});

describe('sanitizeAttachmentFilename — path/control-char stripping (AC6)', () => {
  it('strips path traversal + directory components to the basename', () => {
    expect(sanitizeAttachmentFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeAttachmentFilename('/abs/path/to/file.png')).toBe('file.png');
    expect(sanitizeAttachmentFilename('a\\b\\c.pdf')).toBe('c.pdf');
  });

  it('removes control characters (incl. NUL, newline, tab)', () => {
    expect(sanitizeAttachmentFilename('good\u0000name.png')).toBe('goodname.png');
    expect(sanitizeAttachmentFilename('my  photo.png')).toBe('my photo.png');
  });

  it('falls back to a safe default when the name sanitizes to empty', () => {
    expect(sanitizeAttachmentFilename('////')).toBe('attachment');
    expect(sanitizeAttachmentFilename('')).toBe('attachment');
  });

  it('bounds the length to 255 chars', () => {
    expect(sanitizeAttachmentFilename('x'.repeat(400)).length).toBe(255);
  });
});

describe('MemberCreateTicketRequest — Story 10.2 review-hardening', () => {
  const base = { category: 'kyc-trouble' as const, subject: 'My KYC photo keeps failing', body: 'help' };

  it('accepts a well-formed member request', () => {
    expect(MemberCreateTicketRequest.safeParse(base).success).toBe(true);
  });

  it('rejects `turnstileToken` — it rides the x-turnstile-token HEADER, never a body/form field', () => {
    expect(MemberCreateTicketRequest.safeParse({ ...base, turnstileToken: 'x' }).success).toBe(false);
  });

  it('collapses an embedded blank line in `subject` to a single space (never throws, never corrupts the join delimiter)', () => {
    const r = MemberCreateTicketRequest.safeParse({ ...base, subject: 'Line one\n\nLine two' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.subject).toBe('Line one Line two');
  });

  it('collapses a subject that is ONLY blank lines to empty and rejects it (min(1) re-checked post-transform)', () => {
    expect(MemberCreateTicketRequest.safeParse({ ...base, subject: '\n\n' }).success).toBe(false);
  });
});

describe('MemberTicketDetailResponse — attachments cap (Task 1 consistency)', () => {
  const baseDetail = {
    ticket_id: '44444444-4444-4444-4444-444444444444',
    category: 'kyc-trouble' as const,
    sub_category: null,
    subject: 'My KYC photo keeps failing',
    current_state: 'open' as const,
    routed_to_role: 'helpline_operator',
    routed_to_scope: { dimension: 'pariwar' as const, value: PARIWAR },
    sla_first_response_due: '2026-08-04T06:00:00.000Z',
    sla_resolution_due: '2026-08-08T18:30:00.000Z',
    attachment_count: 0,
    created_at: '2026-08-03T06:00:00.000Z',
    updated_at: '2026-08-03T06:00:00.000Z',
    body: 'help',
    thread: [],
  };
  const attachment = { filename: 'f.png', content_type: 'image/png' as const, size_bytes: 1024 };

  it('boundary: exactly HELPDESK_ATTACHMENT_MAX_COUNT attachments accepted, +1 rejected — consistent with HelpdeskTicketDto', () => {
    expect(
      MemberTicketDetailResponse.safeParse({
        ...baseDetail,
        attachments: Array(HELPDESK_ATTACHMENT_MAX_COUNT).fill(attachment),
      }).success,
    ).toBe(true);
    expect(
      MemberTicketDetailResponse.safeParse({
        ...baseDetail,
        attachments: Array(HELPDESK_ATTACHMENT_MAX_COUNT + 1).fill(attachment),
      }).success,
    ).toBe(false);
  });
});

describe('CreateTicketRequest — .strict() + superRefine', () => {
  const base = {
    subject_member_id: MEMBER,
    category: 'kyc-trouble' as const,
    body: 'help',
    created_via: 'member_app' as const,
  };

  it('accepts a well-formed member-app request', () => {
    expect(CreateTicketRequest.safeParse(base).success).toBe(true);
  });

  it('accepts a well-formed helpline_call request (subject_actor_id)', () => {
    const r = CreateTicketRequest.safeParse({
      subject_actor_id: ACTOR,
      category: 'complaint',
      body: 'x',
      created_via: 'helpline_call',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown key (.strict())', () => {
    expect(CreateTicketRequest.safeParse({ ...base, surprise: true }).success).toBe(false);
  });

  it('rejects `operator_attribution` on the request — it is server-resolved, never client-supplied', () => {
    expect(CreateTicketRequest.safeParse({ ...base, operator_attribution: 'nope' }).success).toBe(false);
  });

  it('rejects when BOTH subject refs are present', () => {
    const r = CreateTicketRequest.safeParse({ ...base, subject_actor_id: ACTOR });
    expect(r.success).toBe(false);
  });

  it('rejects when NEITHER subject ref is present', () => {
    const noSubject = { category: base.category, body: base.body, created_via: base.created_via };
    const r = CreateTicketRequest.safeParse(noSubject);
    expect(r.success).toBe(false);
    // Both paths are reported (not just subject_member_id) — a client field-mapping either ref's
    // error correctly finds a matching issue.
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('subject_member_id');
    expect(paths).toContain('subject_actor_id');
  });

  it('rejects created_via: member_app paired with subject_actor_id — a member can only ever file for themselves', () => {
    const r = CreateTicketRequest.safeParse({
      subject_actor_id: ACTOR,
      category: 'complaint',
      body: 'x',
      created_via: 'member_app',
    });
    expect(r.success).toBe(false);
  });

  it('accepts created_via: helpline_call paired with subject_member_id — an operator may file on a member\'s behalf', () => {
    const r = CreateTicketRequest.safeParse({
      subject_member_id: MEMBER,
      category: 'complaint',
      body: 'x',
      created_via: 'helpline_call',
    });
    expect(r.success).toBe(true);
  });

  it('boundary: body at exactly 5000 chars accepted, 5001 rejected', () => {
    expect(CreateTicketRequest.safeParse({ ...base, body: 'x'.repeat(5000) }).success).toBe(true);
    expect(CreateTicketRequest.safeParse({ ...base, body: 'x'.repeat(5001) }).success).toBe(false);
  });

  // Story 10.2 (AC6) LOWERED the cap from 10 to HELPDESK_ATTACHMENT_MAX_COUNT (5) and hardened the
  // attachment shape (size_bytes + MIME allowlist). The boundary numbers move with the constant so a
  // future cap change updates one place; the assertion is expressed against the constant, not a magic 5.
  it('boundary: exactly HELPDESK_ATTACHMENT_MAX_COUNT attachments accepted, +1 rejected', () => {
    const attachment = { object_key: 'k', content_type: 'image/png', filename: 'f.png', size_bytes: 1024 };
    expect(
      CreateTicketRequest.safeParse({ ...base, attachments: Array(HELPDESK_ATTACHMENT_MAX_COUNT).fill(attachment) })
        .success,
    ).toBe(true);
    expect(
      CreateTicketRequest.safeParse({ ...base, attachments: Array(HELPDESK_ATTACHMENT_MAX_COUNT + 1).fill(attachment) })
        .success,
    ).toBe(false);
  });

  it('rejects an empty-string sub_category', () => {
    expect(CreateTicketRequest.safeParse({ ...base, sub_category: '' }).success).toBe(false);
  });

  it('rejects a malformed UUID on an optional ref field', () => {
    expect(CreateTicketRequest.safeParse({ ...base, claim_case_id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('HelpdeskGrantScope — global⇔null invariant', () => {
  it('accepts { dimension: "global", value: null }', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'global', value: null }).success).toBe(true);
  });

  it('accepts a non-global dimension with a non-null value', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'district', value: 'Patna' }).success).toBe(true);
  });

  it('rejects { dimension: "global", value: <non-null> }', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'global', value: 'garbage' }).success).toBe(false);
  });

  it('rejects a non-global dimension with a null value', () => {
    expect(HelpdeskGrantScope.safeParse({ dimension: 'self', value: null }).success).toBe(false);
  });
});

describe('RoutingRule / RoutingPolicyDocument', () => {
  const catchAll = {
    category: 'other' as const,
    sub_category: null,
    target_role: 'helpline_operator',
    target_scope_dimension: 'pariwar' as const,
    sla_first_response_hours: 24,
    sla_resolution_business_days: 5,
  };

  it('accepts a well-formed rule', () => {
    expect(RoutingRule.safeParse(catchAll).success).toBe(true);
  });

  it('rejects sla_first_response_hours above the 720h guard-rail ceiling', () => {
    expect(RoutingRule.safeParse({ ...catchAll, sla_first_response_hours: 721 }).success).toBe(false);
  });

  it('rejects sla_resolution_business_days above the 90-day guard-rail ceiling', () => {
    expect(RoutingRule.safeParse({ ...catchAll, sla_resolution_business_days: 91 }).success).toBe(false);
  });

  it('a document with an other/null catch-all rule parses cleanly', () => {
    expect(RoutingPolicyDocument.safeParse({ version: 1, rules: [catchAll] }).success).toBe(true);
  });

  it('a document with NO other/null catch-all rule is rejected', () => {
    const noCatchAll = { ...catchAll, category: 'kyc-trouble' as const };
    expect(RoutingPolicyDocument.safeParse({ version: 1, rules: [noCatchAll] }).success).toBe(false);
  });
});

describe('RoutingDecision / MemberScopeContext / HelpdeskAttachment — basic parse', () => {
  it('RoutingDecision parses a well-formed decision', () => {
    const decision = {
      target_role: 'helpline_operator',
      target_scope: { dimension: 'pariwar', value: PARIWAR },
      sla_first_response_hours: 24,
      sla_resolution_business_days: 5,
      routing_policy_version: 1,
      matched_rule_index: 0,
    };
    expect(RoutingDecision.safeParse(decision).success).toBe(true);
  });

  it('MemberScopeContext parses with all geo fields null', () => {
    const ctx = { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER };
    expect(MemberScopeContext.safeParse(ctx).success).toBe(true);
  });

  it('HelpdeskAttachment parses a well-formed reference', () => {
    const attachment = { object_key: 'k', content_type: 'image/png', filename: 'f.png', size_bytes: 4096 };
    expect(HelpdeskAttachment.safeParse(attachment).success).toBe(true);
  });
});

describe('HelpdeskTicketDto — .strict() + superRefine', () => {
  function baseDto(overrides: Record<string, unknown> = {}) {
    return {
      ticket_id: '44444444-4444-4444-4444-444444444444',
      pariwar_id: PARIWAR,
      subject_member_id: MEMBER,
      subject_actor_id: null,
      category: 'kyc-trouble',
      sub_category: null,
      body: 'help',
      attachments: [],
      current_state: 'open',
      routed_to_scope: { dimension: 'pariwar', value: PARIWAR },
      routed_to_role: 'helpline_operator',
      routed_to_actor_id: null,
      routing_policy_version: 1,
      member_scope_context: { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER },
      assigned_at: '2026-08-03T06:00:00.000Z',
      sla_first_response_due: '2026-08-04T06:00:00.000Z',
      sla_resolution_due: '2026-08-08T18:30:00.000Z',
      audit_id: '55555555-5555-5555-5555-555555555555',
      created_via: 'member_app',
      operator_attribution: null,
      claim_case_id: null,
      pool_id: null,
      module_id: null,
      validity_lookup_id: null,
      created_at: '2026-08-03T06:00:00.000Z',
      updated_at: '2026-08-03T06:00:00.000Z',
      ...overrides,
    };
  }

  it('accepts a well-formed member_app ticket', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto()).success).toBe(true);
  });

  it('uses `sub_category`, NOT `subcategory` — the field this drift was found on', () => {
    const r = HelpdeskTicketDto.safeParse(baseDto({ subcategory: 'urgent' }));
    expect(r.success).toBe(false); // unknown key under .strict()
  });

  it('accepts a well-formed helpline_call ticket (subject_actor_id + operator_attribution)', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({
        subject_member_id: null,
        subject_actor_id: ACTOR,
        created_via: 'helpline_call',
        operator_attribution: 'Operator Priya',
      }),
    );
    expect(r.success).toBe(true);
  });

  it('rejects BOTH subject refs set', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ subject_actor_id: ACTOR })).success).toBe(false);
  });

  it('rejects NEITHER subject ref set', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ subject_member_id: null })).success).toBe(false);
  });

  it('rejects created_via: helpline_call with a null operator_attribution', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({ subject_member_id: null, subject_actor_id: ACTOR, created_via: 'helpline_call' }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects created_via: member_app with a non-null operator_attribution', () => {
    expect(HelpdeskTicketDto.safeParse(baseDto({ operator_attribution: 'should not be here' })).success).toBe(false);
  });

  it('rejects sla_resolution_due earlier than sla_first_response_due', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({ sla_resolution_due: '2026-08-03T12:00:00.000Z' }), // before sla_first_response_due
    );
    expect(r.success).toBe(false);
  });

  it('accepts equal sla_first_response_due / sla_resolution_due expressed with different UTC offsets (compared as instants, not raw strings)', () => {
    const r = HelpdeskTicketDto.safeParse(
      baseDto({
        sla_first_response_due: '2026-08-04T06:00:00.000Z',
        sla_resolution_due: '2026-08-04T11:30:00.000+05:30', // the SAME instant, different offset
      }),
    );
    expect(r.success).toBe(true);
  });
});
