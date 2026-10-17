// Story 6.27c (Task 4.5; AC2, R12) — the neighbours' text, the PURE parts: the send hours (09:00–20:00 IST — tests at 08:59 /
// 09:00 / 19:59 / 20:00 IST and across midnight) and the app-link origin check (`resolveAppLinksOrigin` — `resolveHttpsOrigin`
// AND ⛔ a port written in the raw value AND ⛔ a trailing-dot host) and the link it makes fitting the `{link}` slot (review F6).

import { describe, expect, it } from 'vitest';

import { appLinksConfigGap, isInPeerRequestSendWindow, isScopeWideSendFault, nextPeerRequestSendWindowStart } from '../src/scheduler/claim-peer-mesh-requests.js';
import { resolveAppLinksOrigin, resolveHttpsOrigin } from '../src/scheduler/staff-email-config.js';

/** An IST wall-clock time on 2026-10-16 as an instant (IST = UTC + 05:30). */
const ist = (hhmm: string, day = '2026-10-16'): Date => new Date(`${day}T${hhmm}:00.000+05:30`);

describe('the send hours — 09:00 (inclusive) to 20:00 (exclusive) IST', () => {
  it.each([
    ['08:59', false],
    ['09:00', true],
    ['12:00', true],
    ['19:59', true],
    ['20:00', false],
    ['23:59', false],
    ['00:00', false],
  ])('%s IST ⇒ in the window: %s', (hhmm, inside) => {
    expect(isInPeerRequestSendWindow(ist(hhmm))).toBe(inside);
  });

  it.each([
    ['08:59 ⇒ today 09:00', ist('08:59'), ist('09:00')],
    ['00:00 ⇒ today 09:00', ist('00:00'), ist('09:00')],
    ['20:00 ⇒ tomorrow 09:00', ist('20:00'), ist('09:00', '2026-10-17')],
    ['23:59 ⇒ tomorrow 09:00 (across midnight)', ist('23:59'), ist('09:00', '2026-10-17')],
    ['31 Dec 21:00 ⇒ 1 Jan 09:00 (across the year)', ist('21:00', '2026-12-31'), ist('09:00', '2027-01-01')],
  ])('the next start: %s', (_label, now, next) => {
    expect(nextPeerRequestSendWindowStart(now)).toEqual(next);
    expect(isInPeerRequestSendWindow(nextPeerRequestSendWindowStart(now))).toBe(true);
  });

  it('a UTC midnight is IST 05:30 — still outside (the IST day, ⛔ the UTC one, is what counts)', () => {
    const utcMidnight = new Date('2026-10-16T00:00:00.000Z');
    expect(isInPeerRequestSendWindow(utcMidnight)).toBe(false);
    expect(nextPeerRequestSendWindowStart(utcMidnight)).toEqual(ist('09:00'));
  });
});

describe('resolveAppLinksOrigin — R12 (closes "`APP_LINKS_BASE_URL` can disagree with `APP_LINKS_HOST`")', () => {
  it.each(['https://links.example.org', 'https://links.example.org/', 'HTTPS://Links.Example.ORG'])('%j ⇒ the bare origin', (raw) => {
    expect(resolveAppLinksOrigin(raw)).toBe('https://links.example.org');
  });

  it.each([
    ['a non-default port', 'https://links.example.org:8443'],
    ['an explicit :443 (resolveHttpsOrigin normalises it away — the RAW is tested)', 'https://links.example.org:443'],
    ['a trailing-dot host', 'https://links.example.org.'],
    ['a trailing-dot host with a slash', 'https://links.example.org./'],
    ['http', 'http://links.example.org'],
    ['a path', 'https://links.example.org/app'],
    ['blank', '  '],
    ['unset', undefined],
  ])('⛔ %s', (_label, raw) => {
    expect(resolveAppLinksOrigin(raw)).toBeNull();
  });

  it('the shared validator itself is UNCHANGED — it still admits the port and the dot (the staff email\'s origin)', () => {
    expect(resolveHttpsOrigin('https://links.example.org:8443')).toBe('https://links.example.org:8443');
    expect(resolveHttpsOrigin('https://links.example.org:443')).toBe('https://links.example.org');
  });
});

describe('appLinksConfigGap — the base must make a link that FITS the `{link}` slot (6.27c review F6)', () => {
  // `<origin>/peer-request?c=<12>` — 28 characters after the origin ⇒ an origin of ≤ 92 (a host of ≤ 84) fits the 120 slot.
  const host = (n: number): string => `${'a'.repeat(n - 4)}.org`;

  it('an origin whose link is EXACTLY 120 characters ⇒ ready', () => {
    expect(appLinksConfigGap(`https://${host(84)}`)).toBeNull();
  });

  it.each([
    ['one character more (121)', `https://${host(85)}`],
    ['the review\'s case — valid 60- and 40-character DNS labels (141)', `https://${'a'.repeat(60)}.${'b'.repeat(40)}.org`],
  ])('⛔ %s ⇒ `config:app_link_too_long` (an accepted origin, a link that cannot fit)', (_label, raw) => {
    expect(resolveAppLinksOrigin(raw)).not.toBeNull();
    expect(appLinksConfigGap(raw)).toBe('config:app_link_too_long');
  });

  it('an origin R12 refuses is still `config:app_links_base_url_invalid`', () => {
    expect(appLinksConfigGap('https://links.example.org:8443')).toBe('config:app_links_base_url_invalid');
    expect(appLinksConfigGap(undefined)).toBe('config:app_links_base_url_invalid');
  });
});

describe('isScopeWideSendFault — a final that would end EVERY remaining ping the same way stops the run (review round 2 P1)', () => {
  it.each(['config:dlt_template_id_missing', 'config:helpline_number_missing', 'config:secret_manager_PERMISSION_DENIED', 'config:sms_messaging_unavailable', 'auth:http_401', 'dlt_template_not_approved:X1'])(
    '`%s` ⇒ scope-wide',
    (d) => expect(isScopeWideSendFault(d)).toBe(true),
  );
  it.each(['invalid_number:21211', 'carrier_reject:x', 'unknown:unknown', 'unknown:http_500'])('`%s` ⇒ about the recipient (the run goes on)', (d) =>
    expect(isScopeWideSendFault(d)).toBe(false),
  );
  it('`null` (an accepted send) ⇒ ⛔', () => expect(isScopeWideSendFault(null)).toBe(false));
});
