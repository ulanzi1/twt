// Story 6.30 AC9 — the ONE shared https-origin validator (`2026-10-10-312` AL5; N18): `resolveHttpsOrigin` accepts
// exactly an https origin and returns it bare; `resolveAdminAppOrigin` (6.25's name) is the SAME function. Its
// result feeds `buildAppLinkUrl`, which refuses anything but a bare https origin — the last test proves the pair fit.

import { describe, expect, it } from 'vitest';

import { buildAppLinkUrl } from '@twt/contracts';

import { resolveAdminAppOrigin, resolveHttpsOrigin } from '../src/scheduler/staff-email-config.js';

describe('resolveHttpsOrigin — accepts an https origin', () => {
  it.each([
    ['https://x.example', 'https://x.example'],
    ['https://x.example/', 'https://x.example'],
    ['  https://x.example  ', 'https://x.example'],
    ['HTTPS://X.Example', 'https://x.example'],
    ['https://x.example:443', 'https://x.example'],
    ['https://x.example:443/', 'https://x.example'],
    ['https://x.example:8443', 'https://x.example:8443'],
  ])('%j ⇒ %j', (raw, expected) => {
    expect(resolveHttpsOrigin(raw)).toBe(expected);
  });
});

describe('resolveHttpsOrigin — null for anything else', () => {
  it.each([
    ['http', 'http://x.example'],
    ['a path', 'https://x.example/app'],
    ['a path with a trailing slash', 'https://x.example/app/'],
    ['a double slash', 'https://x.example//'],
    ['a query', 'https://x.example?c=1'],
    ['an empty query', 'https://x.example/?'],
    ['credentials', 'https://u:p@x.example'],
    ['a user only', 'https://u@x.example'],
    ['a fragment', 'https://x.example#top'],
    ['blank', '   '],
    ['empty', ''],
    ['undefined', undefined],
    ['null', null],
    ['not a URL', 'x.example'],
    ['another scheme', 'ftp://x.example'],
  ])('%s', (_label, raw) => {
    expect(resolveHttpsOrigin(raw)).toBeNull();
  });
});

describe('the shared validator', () => {
  it('resolveAdminAppOrigin IS resolveHttpsOrigin (an alias, ⛔ not a copy)', () => {
    expect(resolveAdminAppOrigin).toBe(resolveHttpsOrigin);
  });

  it('its result is exactly the bare origin buildAppLinkUrl accepts', () => {
    const origin = resolveHttpsOrigin('HTTPS://Links.Example:443/');
    expect(origin).toBe('https://links.example');
    expect(buildAppLinkUrl(origin!, 'peerRequest', 'Ab3dE5gH9kLm')).toBe('https://links.example/peer-request?c=Ab3dE5gH9kLm');
  });
});
