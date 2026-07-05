// Renderer purity + presentation tests — Story 5.1 (Task 4; AC4, AC5).

import { describe, expect, it } from 'vitest';

import { deepFreeze } from '../src/freeze.js';
import type { Channel } from '../src/provider.js';
import { render } from '../src/render.js';
import { announcement, contributionConfirmed } from './fixtures.js';

const CHANNELS: readonly Channel[] = ['push', 'whatsapp', 'sms', 'telegram'];

describe('render (AC4/AC5)', () => {
  it('is a pure function: same input → deep-equal output across channels', () => {
    const alert = announcement();
    for (const channel of CHANNELS) {
      expect(render(alert, channel)).toEqual(render(alert, channel));
    }
  });

  it('never mutates the frozen payload (renders through Readonly<Alert>)', () => {
    const frozen = deepFreeze(announcement());
    for (const channel of CHANNELS) {
      expect(() => render(frozen, channel)).not.toThrow();
    }
    expect(frozen.payload_data).toEqual({ title: 'Monsoon drive', body: 'Join us this Saturday.' });
  });

  it('push carries a title; body-only channels do not', () => {
    const alert = announcement();
    expect(render(alert, 'push').title).not.toBeNull();
    expect(render(alert, 'whatsapp').title).toBeNull();
    expect(render(alert, 'sms').title).toBeNull();
    expect(render(alert, 'telegram').title).toBeNull();
  });

  it('tags each rendered message with its channel', () => {
    const alert = announcement();
    for (const channel of CHANNELS) {
      expect(render(alert, channel).channel).toBe(channel);
    }
  });

  it('formats paise as a fixed 2-decimal rupee string (deterministic)', () => {
    const rendered = render(contributionConfirmed(11000), 'sms');
    expect(rendered.body).toContain('₹110.00');
  });
});
