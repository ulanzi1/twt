// The partner LEAD egress client — Story 12.5 (Task 4; Decision `2026-11-21-483` QE8 (A); AC4; I8, I9; TR4, TR15). The ONE place a
// member's lead leaves the Trust. Two halves:
//
// ── The PURE policy (no seam, no I/O — every range and port leg is a real test) ─────────────────────────
//   · `checkLeadUrl` — re-parse the STORED URL under 12.1's write-time rule (`marketplace.moduleLeadHandoffUrlSchema`, defence in depth:
//     a failure is `url_refused`), then the PORT: only the default (none written). Any explicit port is `port_refused`, with NO lookup
//     and NO request (a stored URL can never carry `:443` — 12.1's canonical-form rule — so "explicit" means "not 443").
//   · `classifyAddress` over ONE exported table (`NON_PUBLIC_ADDRESSES`, a `net.BlockList`): IPv4's special-purpose ranges; IPv6 allowed
//     ONLY inside 2000::/3 minus four carve-outs (a block list has no allow-range, so it is written as the complement). An IPv4-mapped
//     address (`::ffff:a.b.c.d`, dotted or hex) is judged AS its IPv4.
//   · `chooseAddress` — the first IPv4, else the first IPv6 (⛔ a fallback to a second address in v1 — K-10).
//   · `classifyLeadOutcome` — the HTTP status → the W row (QE6, QE10, QE21 (C)).
//
// ── The I/O half (`createPartnerLeadClient`) ───────────────────────────────────────────────────────────
//   · `resolve(host)` — `dns.lookup(host, { all: true, verbatim: true })` raced against its own timer (TR15): a failure or the timer is
//     `dns_unavailable` (a hold); ANY non-public answer refuses the WHOLE send (`address_refused`).
//   · `post(…)` — `https.request` to the CHECKED ADDRESS (closing DNS rebinding — TR4: global `fetch` cannot pin one), `servername` = the
//     hostname so TLS is verified AGAINST THE NAME, `agent: false` (Node 22's global agent keeps sockets alive), ⛔ redirects (a 3xx is an
//     outcome, never followed), ⛔ `lookup` option (none is consulted for an address literal). ONE wall-clock deadline
//     (`AbortSignal.timeout`) covers connect, write and the whole response — `https.request`'s own `timeout` is an idle-socket timer and
//     never trips on a slow drip. The OUTCOME is fixed by the status line: once the status and headers arrive it is known; the body is
//     drained up to 64 KiB for what is left of the deadline and then abandoned — a slow body never turns a 2xx into a timeout. The body is
//     ⛔ PARSED (fence rule (d)); only the status and ONE header (`X-Partner-Reference`, advisory — I3) are read.
//
// ⭐ THE TEST SEAM is ONE constructor argument (`testSeam`), ⛔ an env var; production boot passes NO argument (fence rule (e)). It lets the
// live legs reach a local server — the real `https.request`, TLS and SNI still run.
// ⛔ LOGGED, THROWN OR RETURNED: the URL, an address, a header value, a body (I8). The outcome carries a status, a closed word, and the
// advisory reference (which the domain sanitises before it is stored).

import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';

import { marketplace } from '@twt/domain';

/** ONE deadline for connect + write + response (QE8). */
export const PARTNER_LEAD_DEADLINE_MS = 10_000;
/** The DNS lookup's own timer (QE8). */
export const PARTNER_LEAD_DNS_TIMEOUT_MS = 5_000;
/** The body is drained up to this much, then abandoned (QE8). */
export const PARTNER_LEAD_BODY_CAP_BYTES = 64 * 1024;
/** The ONE advisory header read from a response (I3). */
export const PARTNER_REFERENCE_HEADER = 'x-partner-reference';

// ── The address table (QE8) ──────────────────────────────────────────────────────────────────────────

/** IPv4 special-purpose ranges, blocked. */
const IPV4_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
  ['255.255.255.255', 32],
];

/**
 * IPv6: allowed ONLY inside 2000::/3 — written as its complement (`::/3`, `4000::/2`, `8000::/1`) — minus 2001::/23 (IETF protocol
 * assignments), 2001:db8::/32 (documentation), 2002::/16 (6to4) and 3fff::/20 (documentation). The complement covers ::/128, ::1, ::/96,
 * fc00::/7, fe80::/10, fec0::/10, ff00::/8, 100::/64, 64:ff9b::/96 and 64:ff9b:1::/48.
 */
const IPV6_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['::', 3],
  ['4000::', 2],
  ['8000::', 1],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
];

/**
 * ⭐ The ONE table (QE8): every NON-PUBLIC address, one `net.BlockList` per family; anything they do not hold is public.
 * ⚠ TWO lists, ⛔ one: Node's `BlockList.check(v4, 'ipv4')` ALSO tests the v4 address against IPv6 rules through its mapped form
 * (`::ffff:a.b.c.d`), and `::/3` covers `::ffff:0:0/96` — so in one list every IPv4 address reads as blocked.
 */
export const NON_PUBLIC_ADDRESSES: Readonly<{ ipv4: net.BlockList; ipv6: net.BlockList }> = Object.freeze({
  ipv4: (() => {
    const list = new net.BlockList();
    for (const [a, p] of IPV4_BLOCKED) list.addSubnet(a, p, 'ipv4');
    return list;
  })(),
  ipv6: (() => {
    const list = new net.BlockList();
    for (const [a, p] of IPV6_BLOCKED) list.addSubnet(a, p, 'ipv6');
    return list;
  })(),
});

/** Expand an IPv6 text (with `::` and an optional trailing dotted quad) to its 16 bytes, or null. */
function ipv6Bytes(text: string): Uint8Array | null {
  let s = text;
  let tail: readonly [number, number] | null = null;
  // A trailing dotted quad (`::ffff:1.2.3.4`) stands for the last two groups.
  const dotted = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (dotted !== null) {
    if (!net.isIPv4(dotted[2]!)) return null;
    const q = dotted[2]!.split('.').map(Number);
    tail = [(q[0]! << 8) | q[1]!, (q[2]! << 8) | q[3]!];
    s = `${dotted[1]!}0:0`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string): number[] => (part === '' ? [] : part.split(':').map((h) => Number.parseInt(h, 16)));
  const head = parse(halves[0]!);
  const rest = halves.length === 2 ? parse(halves[1]!) : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...new Array<number>(fill).fill(0), ...rest];
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  if (tail !== null) {
    groups[6] = tail[0];
    groups[7] = tail[1];
  }
  const out = new Uint8Array(16);
  groups.forEach((g, i) => {
    out[i * 2] = g >> 8;
    out[i * 2 + 1] = g & 0xff;
  });
  return out;
}

/** `::ffff:a.b.c.d` in dotted or hex form ⇒ its IPv4 text; anything else ⇒ null. */
function ipv4MappedOf(v6: string): string | null {
  const b = ipv6Bytes(v6);
  if (b === null) return null;
  for (let i = 0; i < 10; i += 1) if (b[i] !== 0) return null;
  if (b[10] !== 0xff || b[11] !== 0xff) return null;
  return `${String(b[12])}.${String(b[13])}.${String(b[14])}.${String(b[15])}`;
}

/**
 * ⭐ Is `address` a PUBLIC unicast address under QE8's table? An IPv4-mapped IPv6 is judged as its IPv4. A zone index (`%eth0`) is dropped
 * first. Anything that is not an IP literal is `non_public` (fail closed).
 */
export function classifyAddress(address: string): 'public' | 'non_public' {
  const bare = address.split('%')[0]!;
  const family = net.isIP(bare);
  if (family === 4) return NON_PUBLIC_ADDRESSES.ipv4.check(bare, 'ipv4') ? 'non_public' : 'public';
  if (family === 6) {
    const mapped = ipv4MappedOf(bare);
    if (mapped !== null) return NON_PUBLIC_ADDRESSES.ipv4.check(mapped, 'ipv4') ? 'non_public' : 'public';
    return NON_PUBLIC_ADDRESSES.ipv6.check(bare, 'ipv6') ? 'non_public' : 'public';
  }
  return 'non_public';
}

/** The first IPv4 answer, else the first IPv6 (QE8). */
export function chooseAddress(addresses: ReadonlyArray<{ readonly address: string; readonly family: number }>): string | null {
  return addresses.find((a) => a.family === 4)?.address ?? addresses.find((a) => a.family === 6)?.address ?? null;
}

// ── The URL and port rule (QE8) ──────────────────────────────────────────────────────────────────────

/** What the URL check found. `ok` carries the parts the request needs — ⛔ logged. */
export type LeadUrlVerdict =
  | { readonly kind: 'ok'; readonly hostname: string; readonly path: string }
  | { readonly kind: 'url_refused' }
  | { readonly kind: 'port_refused' };

/**
 * ⭐ Re-parse the stored URL under 12.1's rule (defence in depth — `url_refused`), then the PORT: only the default. Any explicit port is
 * `port_refused` (I9). PURE.
 */
export function checkLeadUrl(raw: string): LeadUrlVerdict {
  if (!marketplace.moduleLeadHandoffUrlSchema.safeParse(raw).success) return { kind: 'url_refused' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'url_refused' };
  }
  if (url.protocol !== 'https:') return { kind: 'url_refused' };
  // A trailing-dot host (`partner.example.`) passes 12.1's rule but would be sent as the SNI and `Host` and would key the per-tick breaker
  // apart from the dotless name (code review 2026-11-22, patch 11): refused here, ⛔ normalised.
  if (url.hostname.endsWith('.')) return { kind: 'url_refused' };
  if (url.port !== '') return { kind: 'port_refused' };
  return { kind: 'ok', hostname: url.hostname, path: `${url.pathname}${url.search}` };
}

// ── The outcome (QE6, QE10, QE21 (C)) ────────────────────────────────────────────────────────────────

/** What a request came to — a status and the ONE advisory header, or a closed failure word. */
export type PartnerLeadResponse =
  | { readonly kind: 'response'; readonly status: number; readonly partnerReference: string | null }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'network' };

/** The row write a response leads to. `setupFault` marks QE21 (C)'s counted 401 / 403 / 404 (the alarm). */
export type LeadOutcomeClass =
  | { readonly kind: 'delivered'; readonly status: number }
  | { readonly kind: 'transient'; readonly detail: string; readonly setupFault: boolean }
  | { readonly kind: 'permanent'; readonly detail: string };

/**
 * ⭐ The HTTP status → the W row (PURE): a 2xx is `delivered`; 401 / 403 / 404 are COUNTED TRANSIENT (QE21 (C) — setup faults get the
 * 32.6 h schedule to be mended) and raise the setup alarm; 408 / 429 and every 5xx are transient; any OTHER 4xx and every 3xx are
 * permanent at once (⛔ a redirect is followed). A timeout and a dropped connection are transient (QE6 (A): at least once). A status
 * outside 200–599 is treated as a protocol fault (`network`).
 */
export function classifyLeadOutcome(r: PartnerLeadResponse): LeadOutcomeClass {
  if (r.kind === 'timeout') return { kind: 'transient', detail: 'released:timeout', setupFault: false };
  if (r.kind === 'network') return { kind: 'transient', detail: 'released:network', setupFault: false };
  const s = r.status;
  if (s >= 200 && s <= 299) return { kind: 'delivered', status: s };
  if (s >= 300 && s <= 399) return { kind: 'permanent', detail: `failed_delivery:http_3xx:${String(s)}` };
  if (s === 401 || s === 403 || s === 404) return { kind: 'transient', detail: `released:http_${String(s)}`, setupFault: true };
  if (s === 408 || s === 429) return { kind: 'transient', detail: `released:http_${String(s)}`, setupFault: false };
  if (s >= 400 && s <= 499) return { kind: 'permanent', detail: `failed_delivery:http_4xx:${String(s)}` };
  if (s >= 500 && s <= 599) return { kind: 'transient', detail: `released:http_5xx:${String(s)}`, setupFault: false };
  return { kind: 'transient', detail: 'released:network', setupFault: false };
}

// ── The I/O half ─────────────────────────────────────────────────────────────────────────────────────

/** A lookup with `dns.lookup`'s `{ all: true }` answer shape. */
export type PartnerLeadLookup = (hostname: string) => Promise<ReadonlyArray<{ readonly address: string; readonly family: number }>>;

/**
 * ⚠ TESTS ONLY — the ONE seam (QE8). Production passes NOTHING (fence rule (e)).
 *   · `lookup` — a fake DNS (also the "no lookup was made" spy);
 *   · `allowAddresses` — addresses the table would refuse that the test server listens on (loopback);
 *   · `connectPort` — the local server's port, in place of 443;
 *   · `ca` — the fixture CA;
 *   · `deadlineMs`, `dnsTimeoutMs` — short timers, so no test waits ten seconds.
 */
export interface PartnerLeadClientTestSeam {
  readonly lookup?: PartnerLeadLookup;
  readonly allowAddresses?: readonly string[];
  readonly connectPort?: number;
  readonly ca?: string | Buffer;
  readonly deadlineMs?: number;
  readonly dnsTimeoutMs?: number;
}

/** What `resolve` found. */
export type LeadResolveVerdict =
  | { readonly kind: 'ok'; readonly address: string }
  | { readonly kind: 'dns_unavailable' }
  | { readonly kind: 'address_refused' };

/** One signed request to make. `hostname` and `path` come from `checkLeadUrl`; `address` from `resolve`. */
export interface PartnerLeadRequest {
  readonly hostname: string;
  readonly path: string;
  readonly address: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Buffer;
}

export interface PartnerLeadClient {
  resolve(hostname: string): Promise<LeadResolveVerdict>;
  post(request: PartnerLeadRequest): Promise<PartnerLeadResponse>;
}

const defaultLookup: PartnerLeadLookup = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });

/** The client. ⭐ Production: `createPartnerLeadClient()` — NO argument. */
export function createPartnerLeadClient(options: { readonly testSeam?: PartnerLeadClientTestSeam } = {}): PartnerLeadClient {
  const seam = options.testSeam ?? {};
  const lookup = seam.lookup ?? defaultLookup;
  const allow = new Set(seam.allowAddresses ?? []);
  const deadlineMs = seam.deadlineMs ?? PARTNER_LEAD_DEADLINE_MS;
  const dnsTimeoutMs = seam.dnsTimeoutMs ?? PARTNER_LEAD_DNS_TIMEOUT_MS;

  return {
    async resolve(hostname: string): Promise<LeadResolveVerdict> {
      let timer: NodeJS.Timeout | undefined;
      const timedOut = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), dnsTimeoutMs);
      });
      let answers: ReadonlyArray<{ readonly address: string; readonly family: number }> | 'timeout';
      try {
        answers = await Promise.race([lookup(hostname), timedOut]);
      } catch {
        return { kind: 'dns_unavailable' };
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
      if (answers === 'timeout' || answers.length === 0) return { kind: 'dns_unavailable' };
      // ANY non-public answer refuses the WHOLE send (QE8) — a name that resolves to one public and one private address is refused.
      if (answers.some((a) => !allow.has(a.address) && classifyAddress(a.address) !== 'public')) return { kind: 'address_refused' };
      const address = chooseAddress(answers);
      return address === null ? { kind: 'dns_unavailable' } : { kind: 'ok', address };
    },

    post(request: PartnerLeadRequest): Promise<PartnerLeadResponse> {
      return new Promise<PartnerLeadResponse>((resolve) => {
        let settled = false;
        const done = (r: PartnerLeadResponse): void => {
          if (settled) return;
          settled = true;
          resolve(r);
        };
        const signal = AbortSignal.timeout(deadlineMs);
        const onFailure = (): void => done(signal.aborted ? { kind: 'timeout' } : { kind: 'network' });
        let req: ReturnType<typeof https.request>;
        try {
          req = https.request({
            host: request.address,
            port: seam.connectPort ?? 443,
            servername: request.hostname,
            method: 'POST',
            path: request.path,
            headers: { ...request.headers, host: request.hostname, 'content-length': String(request.body.length) },
            agent: false,
            signal,
            ...(seam.ca === undefined ? {} : { ca: seam.ca }),
          });
        } catch {
          done({ kind: 'network' });
          return;
        }
        // ⭐ An abort or error AFTER the outcome is known is swallowed: these listeners stay for the request's whole life.
        req.on('error', onFailure);
        req.on('response', (res) => {
          res.on('error', () => undefined);
          const raw = res.headers[PARTNER_REFERENCE_HEADER];
          // The outcome is fixed HERE, by the status line (QE8): a slow body never turns a 2xx into a timeout.
          done({ kind: 'response', status: res.statusCode ?? 0, partnerReference: typeof raw === 'string' ? raw : null });
          let drained = 0;
          res.on('data', (chunk: Buffer) => {
            drained += chunk.length;
            if (drained > PARTNER_LEAD_BODY_CAP_BYTES) res.destroy();
          });
          res.on('end', () => req.destroy());
        });
        req.end(request.body);
      });
    },
  };
}
