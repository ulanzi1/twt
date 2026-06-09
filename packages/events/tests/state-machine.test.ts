import { describe, expect, it } from 'vitest';
import { defineStateMachine } from '../src/state-machine';

type ToggleState = 'off' | 'on';
type ToggleEvent = { type: 'toggle' };

const sm = defineStateMachine<ToggleState, ToggleEvent>({
  initial: 'off',
  reduce: (state) => (state === 'off' ? 'on' : 'off'),
  transitions: [
    { from: 'off', event: 'toggle', to: 'on' },
    { from: 'on', event: 'toggle', to: 'off' },
  ],
});

describe('StateMachine', () => {
  it('fold over empty stream returns initial state', () => {
    expect(sm.fold([])).toBe('off');
  });

  it('fold over one event returns the next state', () => {
    expect(sm.fold([{ type: 'toggle' }])).toBe('on');
  });

  it('fold is idempotent across multiple events', () => {
    expect(sm.fold([{ type: 'toggle' }, { type: 'toggle' }])).toBe('off');
  });

  it('step is a single reduce step', () => {
    expect(sm.step('off', { type: 'toggle' })).toBe('on');
    expect(sm.step('on', { type: 'toggle' })).toBe('off');
  });

  it('fold equals manual events.reduce(step, initial) — deterministic equivalence', () => {
    const events: ToggleEvent[] = [
      { type: 'toggle' },
      { type: 'toggle' },
      { type: 'toggle' },
    ];
    const manual = events.reduce<ToggleState>(
      (state, event) => sm.step(state, event),
      sm.initial,
    );
    expect(sm.fold(events)).toBe(manual);
  });

  it('exposes optional transitions table for doc generators', () => {
    expect(sm.transitions).toEqual([
      { from: 'off', event: 'toggle', to: 'on' },
      { from: 'on', event: 'toggle', to: 'off' },
    ]);
  });

  it('initial getter returns the configured initial state', () => {
    expect(sm.initial).toBe('off');
  });
});
