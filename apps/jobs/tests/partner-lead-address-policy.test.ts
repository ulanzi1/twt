// Story 12.5 (AC4's unit half; QE8 (A); I9) — the send-time address and port policy, on the PURE functions (NO seam), plus the two
// legs that need the seam's `lookup` as a spy (an explicit port is refused with NO lookup; mixed answers refuse the whole send).

import { describe, expect, it, vi } from 'vitest';

import {
  NON_PUBLIC_ADDRESSES,
  checkLeadUrl,
  chooseAddress,
  classifyAddress,
  classifyLeadOutcome,
  createPartnerLeadClient,
} from '../src/scheduler/partner-lead-client.js';

/** One address inside each blocked IPv4 range (QE8), and its IPv4-mapped forms. */
const BLOCKED_V4: ReadonlyArray<readonly [string, string]> = [
  ['0/8', '0.1.2.3'],
  ['10/8', '10.20.30.40'],
  ['100.64/10', '100.100.1.1'],
  ['127/8', '127.0.0.1'],
  ['169.254/16', '169.254.169.254'],
  ['172.16/12', '172.31.255.1'],
  ['192.0.0/24', '192.0.0.8'],
  ['192.0.2/24', '192.0.2.1'],
  ['192.88.99/24', '192.88.99.1'],
  ['192.168/16', '192.168.1.1'],
  ['198.18/15', '198.19.0.1'],
  ['198.51.100/24', '198.51.100.7'],
  ['203.0.113/24', '203.0.113.9'],
  ['224/4', '239.1.1.1'],
  ['240/4', '250.1.1.1'],
  ['255.255.255.255', '255.255.255.255'],
];

/** One address inside each blocked IPv6 range. */
const BLOCKED_V6: ReadonlyArray<readonly [string, string]> = [
  ['::/128', '::'],
  ['::1', '::1'],
  ['::/96 (IPv4-compatible)', '::1.2.3.4'],
  ['fc00::/7', 'fd12:3456::1'],
  ['fe80::/10', 'fe80::1'],
  ['fec0::/10', 'fec0::1'],
  ['ff00::/8', 'ff02::1'],
  ['100::/64', '100::1'],
  ['64:ff9b::/96', '64:ff9b::808:808'],
  ['64:ff9b:1::/48', '64:ff9b:1::1'],
  ['2001::/23', '2001:0:1::1'],
  ['2001:db8::/32', '2001:db8::1'],
  ['2002::/16', '2002:c000:0204::1'],
  ['3fff::/20', '3fff:0fff::1'],
  ['outside 2000::/3 (4000::/2)', '4000::1'],
  ['outside 2000::/3 (8000::/1)', 'a000::1'],
];

const toHexMapped = (v4: string): string => {
  const q = v4.split('.').map(Number);
  const h = (a: number, b: number): string => ((a << 8) | b).toString(16);
  return `::ffff:${h(q[0]!, q[1]!)}:${h(q[2]!, q[3]!)}`;
};

describe('classifyAddress — the table (QE8)', () => {
  it.each(BLOCKED_V4)('blocks IPv4 %s', (_range, address) => {
    expect(classifyAddress(address)).toBe('non_public');
  });

  it.each(BLOCKED_V4)('blocks IPv4 %s in IPv4-mapped DOTTED form', (_range, address) => {
    expect(classifyAddress(`::ffff:${address}`)).toBe('non_public');
  });

  it.each(BLOCKED_V4)('blocks IPv4 %s in IPv4-mapped HEX form', (_range, address) => {
    expect(classifyAddress(toHexMapped(address))).toBe('non_public');
  });

  it.each(BLOCKED_V6)('blocks IPv6 %s', (_range, address) => {
    expect(classifyAddress(address)).toBe('non_public');
  });

  it.each([['8.8.8.8'], ['1.1.1.1'], ['49.44.1.1'], ['::ffff:8.8.8.8'], ['::ffff:808:808'], ['2404:6800:4009:80b::200e'], ['2600::1']])(
    'admits public %s (a mapped public IPv4 is judged as its IPv4)',
    (address) => {
      expect(classifyAddress(address)).toBe('public');
    },
  );

  it('refuses anything that is not an IP literal (fail closed), and drops a zone index first', () => {
    expect(classifyAddress('partner.example')).toBe('non_public');
    expect(classifyAddress('')).toBe('non_public');
    expect(classifyAddress('fe80::1%eth0')).toBe('non_public');
  });

  it('is ONE exported constant: a block list per family (one list would block every IPv4 through ::/3)', () => {
    expect(NON_PUBLIC_ADDRESSES.ipv4.check('10.0.0.1', 'ipv4')).toBe(true);
    expect(NON_PUBLIC_ADDRESSES.ipv4.check('8.8.8.8', 'ipv4')).toBe(false);
    expect(NON_PUBLIC_ADDRESSES.ipv6.check('fe80::1', 'ipv6')).toBe(true);
    expect(NON_PUBLIC_ADDRESSES.ipv6.check('2404:6800::1', 'ipv6')).toBe(false);
  });
});

describe('chooseAddress — the v4 preference', () => {
  it('chooses the FIRST IPv4 even when an IPv6 answer comes first', () => {
    expect(chooseAddress([{ address: '2404:6800::1', family: 6 }, { address: '8.8.8.8', family: 4 }, { address: '1.1.1.1', family: 4 }])).toBe('8.8.8.8');
  });
  it('falls back to the first IPv6', () => {
    expect(chooseAddress([{ address: '2404:6800::1', family: 6 }])).toBe('2404:6800::1');
    expect(chooseAddress([])).toBeNull();
  });
});

describe('checkLeadUrl — the re-parse and the port rule', () => {
  it('passes a canonical https URL with no port', () => {
    expect(checkLeadUrl('https://leads.partner.example/hdfc/twt-bihar')).toEqual({ kind: 'ok', hostname: 'leads.partner.example', path: '/hdfc/twt-bihar' });
  });
  it.each(['https://leads.partner.example:8443/x', 'https://leads.partner.example:444/x', 'https://leads.partner.example:80/x'])('refuses an explicit port: %s', (url) => {
    expect(checkLeadUrl(url)).toEqual({ kind: 'port_refused' });
  });
  it.each(['http://leads.partner.example/x', 'https://10.0.0.1/x', 'https://localhost/x', 'https://a@b.example/x', 'https://b.example/x?q=1', 'not a url'])(
    'refuses a URL outside 12.1\'s rule: %s',
    (url) => {
      expect(checkLeadUrl(url)).toEqual({ kind: 'url_refused' });
    },
  );
});

describe('the seam\'s lookup as a spy', () => {
  it('an explicit port is refused with NO lookup made (the sweep never resolves a refused URL)', () => {
    const lookup = vi.fn(async () => [{ address: '8.8.8.8', family: 4 }]);
    createPartnerLeadClient({ testSeam: { lookup } });
    expect(checkLeadUrl('https://leads.partner.example:8443/x').kind).toBe('port_refused');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('a host that resolves to one PUBLIC and one PRIVATE address is refused whole', async () => {
    const client = createPartnerLeadClient({ testSeam: { lookup: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.5', family: 4 }] } });
    expect(await client.resolve('leads.partner.example')).toEqual({ kind: 'address_refused' });
  });

  it('a public v6 address outside 2000::/3 is refused', async () => {
    const client = createPartnerLeadClient({ testSeam: { lookup: async () => [{ address: '4000::1', family: 6 }] } });
    expect(await client.resolve('leads.partner.example')).toEqual({ kind: 'address_refused' });
  });

  it('with a v6 and a v4 answer, the v4 is chosen', async () => {
    const client = createPartnerLeadClient({ testSeam: { lookup: async () => [{ address: '2404:6800::1', family: 6 }, { address: '8.8.4.4', family: 4 }] } });
    expect(await client.resolve('leads.partner.example')).toEqual({ kind: 'ok', address: '8.8.4.4' });
  });

  it('a lookup that fails, answers nothing, or never returns is a hold (dns_unavailable)', async () => {
    const failing = createPartnerLeadClient({ testSeam: { lookup: () => Promise.reject(new Error('ENOTFOUND')) } });
    const empty = createPartnerLeadClient({ testSeam: { lookup: async () => [] } });
    const hung = createPartnerLeadClient({ testSeam: { lookup: () => new Promise(() => undefined), dnsTimeoutMs: 20 } });
    expect(await failing.resolve('x.example')).toEqual({ kind: 'dns_unavailable' });
    expect(await empty.resolve('x.example')).toEqual({ kind: 'dns_unavailable' });
    expect(await hung.resolve('x.example')).toEqual({ kind: 'dns_unavailable' });
  });
});

describe('classifyLeadOutcome (QE6, QE21 (C))', () => {
  it.each([
    [200, { kind: 'delivered', status: 200 }],
    [204, { kind: 'delivered', status: 204 }],
    [301, { kind: 'permanent', detail: 'failed_delivery:http_3xx:301' }],
    [400, { kind: 'permanent', detail: 'failed_delivery:http_4xx:400' }],
    [409, { kind: 'permanent', detail: 'failed_delivery:http_4xx:409' }],
    [401, { kind: 'transient', detail: 'released:http_401', setupFault: true }],
    [403, { kind: 'transient', detail: 'released:http_403', setupFault: true }],
    [404, { kind: 'transient', detail: 'released:http_404', setupFault: true }],
    [408, { kind: 'transient', detail: 'released:http_408', setupFault: false }],
    [429, { kind: 'transient', detail: 'released:http_429', setupFault: false }],
    [503, { kind: 'transient', detail: 'released:http_5xx:503', setupFault: false }],
    [600, { kind: 'transient', detail: 'released:network', setupFault: false }],
  ] as const)('status %d ⇒ %j', (status, expected) => {
    expect(classifyLeadOutcome({ kind: 'response', status, partnerReference: null })).toEqual(expected);
  });

  it('a timeout and a dropped connection are counted transient (at least once)', () => {
    expect(classifyLeadOutcome({ kind: 'timeout' })).toEqual({ kind: 'transient', detail: 'released:timeout', setupFault: false });
    expect(classifyLeadOutcome({ kind: 'network' })).toEqual({ kind: 'transient', detail: 'released:network', setupFault: false });
  });
});
