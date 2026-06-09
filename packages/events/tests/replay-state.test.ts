import { describe, expect, it } from 'vitest';

import { appendEvent, loadEvents, replayState } from '../src/events-log';
import { getTx, hasDatabase, setupLiveDb } from './integration-setup';

const STREAM = '00000000-0000-0000-0000-00000000b001';
const PARIWAR = '00000000-0000-0000-0000-0000000000b1';

interface CounterEvent {
  type: 'incremented' | 'decremented';
  payload: unknown;
  eventType: string;
}

// Reducer driven by event_type (the DB column) — matches how downstream
// member.* / claim.* / pool.* reducers will branch.
function counterReducer(state: number, event: { eventType: string }): number {
  if (event.eventType === 'counter.incremented') return state + 1;
  if (event.eventType === 'counter.decremented') return state - 1;
  return state;
}

describe.skipIf(!hasDatabase)('replayState (live DB)', () => {
  setupLiveDb();

  it('empty-stream replay returns initialState unchanged', async () => {
    const { tx } = getTx();
    const state = await replayState<number>(tx, STREAM, counterReducer, 0);
    expect(state).toBe(0);
  });

  it('deterministic: replay twice produces byte-identical state', async () => {
    const { tx } = getTx();
    for (let i = 0; i < 5; i++) {
      await appendEvent(tx, {
        streamId: STREAM,
        eventType: 'counter.incremented',
        payload: {},
        expectedVersion: i,
        actorId: null,
        pariwarId: PARIWAR,
      });
    }
    const a = await replayState<number>(tx, STREAM, counterReducer, 0);
    const b = await replayState<number>(tx, STREAM, counterReducer, 0);
    expect(a).toBe(b);
    expect(a).toBe(5);
  });

  it('order-sensitive reducer respects event_version ascending order', async () => {
    const { tx } = getTx();
    await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'counter.incremented',
      payload: {},
      expectedVersion: 0,
      actorId: null,
      pariwarId: PARIWAR,
    });
    await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'counter.incremented',
      payload: {},
      expectedVersion: 1,
      actorId: null,
      pariwarId: PARIWAR,
    });
    await appendEvent(tx, {
      streamId: STREAM,
      eventType: 'counter.decremented',
      payload: {},
      expectedVersion: 2,
      actorId: null,
      pariwarId: PARIWAR,
    });
    const events = await loadEvents(tx, STREAM);
    expect(events.map((e) => e.eventVersion)).toEqual([1, 2, 3]);
    const state = events.reduce(counterReducer, 0);
    expect(state).toBe(1);
  });

  it('loadEvents fromVersion/toVersion slices correctly', async () => {
    const { tx } = getTx();
    for (let i = 0; i < 5; i++) {
      await appendEvent(tx, {
        streamId: STREAM,
        eventType: 'counter.incremented',
        payload: { i },
        expectedVersion: i,
        actorId: null,
        pariwarId: PARIWAR,
      });
    }
    const slice = await loadEvents(tx, STREAM, {
      fromVersion: 2,
      toVersion: 4,
    });
    expect(slice.map((e) => e.eventVersion)).toEqual([2, 3, 4]);
  });
});

// Type-only assertion that CounterEvent compiles against the typed-reducer signature.
type _Assert = (s: number, e: CounterEvent) => number;
const _check: _Assert = counterReducer;
void _check;
