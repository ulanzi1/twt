// Story 6.27c (Task 3.1 / 3.2; AC1b, AC5b) — the neighbours' text: the ONE `detail` builder against the ONE grammar, and the link
// code. Pure (⛔ DB — the live spec holds every builder output against 0166's CHECK). The vocabulary arrays are LOCKSTEP with the
// pattern: each of them is enumerated by the pattern, and the pattern admits ⛔ other value of its families.

import { describe, expect, it } from 'vitest';

import {
  PEER_MESH_REQUEST_PRE_SEND_FAULTS,
  PEER_MESH_REQUEST_RECHECK_REASONS,
  PEER_MESH_REQUEST_SMS_ERROR_CLASSES,
  generatePeerRequestLinkCode,
  isPeerMeshRequestDetail,
  peerMeshRequestDetail,
} from '../../src/claim/peer-mesh-request.js';
import { SUSPICION_NOTICE_SMS_ERROR_CLASSES } from '../../src/claim/suspicion-notice.js';
import {
  PEER_MESH_LINK_CODE_PATTERN,
  PEER_MESH_REQUEST_DETAIL_PATTERN,
  PEER_MESH_REQUEST_NAME_REASONS,
  PEER_MESH_REQUEST_REPLACEABLE_REASONS,
} from '../../src/schema/claim_peer_mesh_pings.js';

import { everyBuiltPeerMeshRequestDetail } from './_peer-mesh-request-details.js';

describe('the ONE detail builder ↔ the ONE grammar (PM4 [c])', () => {
  it('⭐ every builder output matches PEER_MESH_REQUEST_DETAIL_PATTERN (⛔ a space, ⛔ `+`, ⛔ a 7-digit run)', () => {
    for (const d of everyBuiltPeerMeshRequestDetail()) {
      expect(isPeerMeshRequestDetail(d), d).toBe(true);
      expect(d).not.toMatch(/\s|\+|[0-9]{7}/);
    }
  });

  it('a RAW gateway code is sanitised — a phone number never survives', () => {
    expect(peerMeshRequestDetail({ kind: 'send', detail: 'invalid_number:+919876543210' })).toBe('invalid_number:unknown');
    expect(peerMeshRequestDetail({ kind: 'send', detail: 'carrier_reject:9876543210' })).toBe('carrier_reject:unknown');
    expect(peerMeshRequestDetail({ kind: 'send', detail: 'Message rejected for 9876543210' })).toBe('unknown:unknown');
    expect(peerMeshRequestDetail({ kind: 'send', detail: 'api_unavailable:http_503' })).toBe('api_unavailable:http_503');
  });

  it.each([
    'config:app_links_base_url_invalid',
    'config:questionnaire_unavailable',
    'config:counsel_basis_pending',
    'config:secret_manager',
    'config:dlt_template_id_missing:hi',
    'no_target:not_effective',
    'name:none',
    'decrypt_failed:kyc',
    'superseded:other',
    'no_target:peer_not_active ',
  ])('⛔ %j is outside the grammar (the HOLD codes are alarm-only; the suspicion vocabulary is another table\'s)', (bad) => {
    expect(isPeerMeshRequestDetail(bad)).toBe(false);
  });

  it('⭐ LOCKSTEP — the replaceable / name / re-check / pre-send arrays are EXACTLY the pattern\'s alternatives', () => {
    const noTarget = /no_target:\(([^)]*)\)/.exec(PEER_MESH_REQUEST_DETAIL_PATTERN)?.[1]?.split('|');
    expect(noTarget).toEqual([...PEER_MESH_REQUEST_REPLACEABLE_REASONS, ...PEER_MESH_REQUEST_NAME_REASONS]);
    const recheck = /recheck_\(([^)]*)\)/.exec(PEER_MESH_REQUEST_DETAIL_PATTERN)?.[1]?.split('|');
    expect(recheck).toEqual([...PEER_MESH_REQUEST_RECHECK_REASONS]);
    for (const f of PEER_MESH_REQUEST_PRE_SEND_FAULTS) expect(PEER_MESH_REQUEST_DETAIL_PATTERN).toContain(`|${f}|`);
  });

  it('⭐ the gateway classes are the SAME array as the suspicion notices\' (one parser, `sanitizeSmsGatewayCode`)', () => {
    expect(PEER_MESH_REQUEST_SMS_ERROR_CLASSES).toBe(SUSPICION_NOTICE_SMS_ERROR_CLASSES);
    expect([...PEER_MESH_REQUEST_SMS_ERROR_CLASSES]).toEqual(['invalid_number', 'carrier_reject', 'rate_limited', 'api_unavailable', 'dlt_template_not_approved', 'auth', 'unknown']);
  });
});

describe('the link code (PM21 (a); BF25)', () => {
  it('12 base62 characters, in 0156\'s form, every time; distinct across draws', () => {
    const pattern = new RegExp(PEER_MESH_LINK_CODE_PATTERN);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      const code = generatePeerRequestLinkCode();
      expect(code).toMatch(pattern);
      seen.add(code);
    }
    expect(seen.size).toBe(2000);
  });

  it('draws from the WHOLE alphabet (digits, upper and lower case all appear)', () => {
    const all = Array.from({ length: 300 }, () => generatePeerRequestLinkCode()).join('');
    expect(all).toMatch(/[0-9]/);
    expect(all).toMatch(/[A-Z]/);
    expect(all).toMatch(/[a-z]/);
    expect(new Set(all).size).toBe(62);
  });
});
