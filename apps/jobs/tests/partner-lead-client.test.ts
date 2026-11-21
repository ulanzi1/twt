// Story 12.5 (AC4's live half; QE8 (A); I9; TR4, TR15) — the egress client against a LOCAL TLS server, through the ONE test seam
// (`connectPort`, `ca`, short timers). The real `https.request`, TLS and SNI run. No database.
//
// Fixtures: `tests/fixtures/partner-lead/` (a test CA whose key was deleted; leaves for `partner.test` and `other.test` — its README).

import { readFileSync } from 'node:fs';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import tls from 'node:tls';

import { afterEach, describe, expect, it } from 'vitest';

import { createPartnerLeadClient, type PartnerLeadRequest } from '../src/scheduler/partner-lead-client.js';

const fixture = (name: string): Buffer => readFileSync(new URL(`./fixtures/partner-lead/${name}`, import.meta.url));
const CA = fixture('ca-cert.pem');
const PARTNER = { cert: fixture('partner-cert.pem'), key: fixture('partner-key.pem') };
const OTHER = { cert: fixture('other-cert.pem'), key: fixture('other-key.pem') };

const servers: Array<{ close: (cb?: () => void) => unknown; closeAllConnections?: () => void }> = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise<void>((resolve) => {
          s.closeAllConnections?.();
          s.close(() => resolve());
        }),
    ),
  );
});

async function listen(server: https.Server | tls.Server): Promise<number> {
  servers.push(server as unknown as (typeof servers)[number]);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return (server.address() as AddressInfo).port;
}

const request = (body = Buffer.from('{"ok":true}')): PartnerLeadRequest => ({
  hostname: 'partner.test',
  path: '/hook',
  address: '127.0.0.1',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'k1' },
  body,
});

function clientFor(port: number, deadlineMs = 2_000) {
  return createPartnerLeadClient({ testSeam: { connectPort: port, ca: CA, deadlineMs } });
}

/** A raw TLS server that writes `script` itself — for the drips. */
async function rawTls(onSocket: (s: tls.TLSSocket) => void): Promise<number> {
  const server = tls.createServer({ ...PARTNER }, (socket) => {
    socket.on('error', () => undefined);
    socket.once('data', () => onSocket(socket));
  });
  return listen(server);
}

describe('the egress client, live (AC4)', () => {
  it('connects to the CHECKED address with SNI = the hostname, Host = the hostname, and sends the body', async () => {
    const seen: Array<{ servername: string | false | null; host: string | undefined; body: string; idem: string | undefined }> = [];
    const server = https.createServer({ ...PARTNER }, (req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => (body += c.toString('utf-8')));
      req.on('end', () => {
        seen.push({ servername: (req.socket as tls.TLSSocket).servername, host: req.headers.host, body, idem: req.headers['idempotency-key'] as string | undefined });
        res.writeHead(202).end();
      });
    });
    const port = await listen(server);
    expect(await clientFor(port).post(request())).toEqual({ kind: 'response', status: 202, partnerReference: null });
    expect(seen).toEqual([{ servername: 'partner.test', host: 'partner.test', body: '{"ok":true}', idem: 'k1' }]);
  });

  it('refuses a certificate for a DIFFERENT name (TLS verified against the hostname) — network, ⛔ a response', async () => {
    let requests = 0;
    const server = https.createServer({ ...OTHER }, (_req, res) => {
      requests += 1;
      res.writeHead(200).end();
    });
    const port = await listen(server);
    expect(await clientFor(port).post(request())).toEqual({ kind: 'network' });
    expect(requests).toBe(0);
  });

  it('follows NO redirect: a 302 is the outcome, and the server sees exactly one request', async () => {
    let requests = 0;
    const server = https.createServer({ ...PARTNER }, (_req, res) => {
      requests += 1;
      res.writeHead(302, { location: 'https://partner.test/elsewhere' }).end();
    });
    const port = await listen(server);
    expect(await clientFor(port).post(request())).toEqual({ kind: 'response', status: 302, partnerReference: null });
    expect(requests).toBe(1);
  });

  it('a server that NEVER answers is aborted at the wall-clock deadline (timeout)', async () => {
    const server = https.createServer({ ...PARTNER }, () => undefined);
    const port = await listen(server);
    const started = Date.now();
    expect(await clientFor(port, 300).post(request())).toEqual({ kind: 'timeout' });
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('a server that drips its HEADERS one byte at a time is aborted at the deadline (⛔ an idle timer that never trips)', async () => {
    const head = 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n';
    const port = await rawTls((socket) => {
      let i = 0;
      const t = setInterval(() => {
        if (socket.destroyed || i >= head.length) return clearInterval(t);
        socket.write(head[i]!);
        i += 1;
      }, 40);
      socket.on('close', () => clearInterval(t));
    });
    const started = Date.now();
    expect(await clientFor(port, 400).post(request())).toEqual({ kind: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1_500);
  });

  it('a 2xx status line followed by a dripping BODY ends as the 2xx — the outcome is fixed by the status line', async () => {
    const port = await rawTls((socket) => {
      socket.write('HTTP/1.1 201 Created\r\nX-Partner-Reference: REF-7\r\nTransfer-Encoding: chunked\r\n\r\n');
      const t = setInterval(() => {
        if (socket.destroyed) return clearInterval(t);
        socket.write('1\r\nx\r\n');
      }, 50);
      socket.on('close', () => clearInterval(t));
    });
    const started = Date.now();
    // The deadline is far above the bound: the 2xx must resolve on the status line, long before the drip would end it.
    expect(await clientFor(port, 3_000).post(request())).toEqual({ kind: 'response', status: 201, partnerReference: 'REF-7' });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('abandons the body past 64 KiB (the server cannot write its 8 MiB)', async () => {
    let written = 0;
    const total = 8 * 1024 * 1024;
    const closed = new Promise<void>((resolve) => {
      const server = https.createServer({ ...PARTNER }, (_req, res) => {
        res.writeHead(200, { 'content-length': String(total) });
        const chunk = Buffer.alloc(16 * 1024, 0x61);
        const pump = (): void => {
          while (written < total && !res.destroyed) {
            written += chunk.length;
            if (!res.write(chunk)) return void res.once('drain', pump);
          }
        };
        res.on('close', () => resolve());
        pump();
      });
      void listen(server).then((port) => clientFor(port).post(request()).then((r) => expect(r).toEqual({ kind: 'response', status: 200, partnerReference: null })));
    });
    await closed;
    expect(written).toBeLessThan(total);
  });

  it('reads ONLY the status and X-Partner-Reference — ⛔ the body, ⛔ any other header', async () => {
    const server = https.createServer({ ...PARTNER }, (_req, res) => {
      res.writeHead(200, { 'x-partner-reference': 'P-42', 'x-member-status': 'active', 'content-type': 'application/json' });
      res.end('{"member_lifecycle":"withdrawn","claim":"approved"}');
    });
    const port = await listen(server);
    const out = await clientFor(port).post(request());
    expect(out).toStrictEqual({ kind: 'response', status: 200, partnerReference: 'P-42' });
  });

  it('a DNS lookup that never returns ends as a hold (the seam\'s dnsTimeoutMs)', async () => {
    const client = createPartnerLeadClient({ testSeam: { lookup: () => new Promise(() => undefined), dnsTimeoutMs: 50 } });
    expect(await client.resolve('partner.test')).toEqual({ kind: 'dns_unavailable' });
  });

  it('resolves a loopback test server only through allowAddresses (the table refuses it otherwise)', async () => {
    const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
    expect(await createPartnerLeadClient({ testSeam: { lookup } }).resolve('partner.test')).toEqual({ kind: 'address_refused' });
    expect(await createPartnerLeadClient({ testSeam: { lookup, allowAddresses: ['127.0.0.1'] } }).resolve('partner.test')).toEqual({ kind: 'ok', address: '127.0.0.1' });
  });
});
