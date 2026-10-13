import type { PeerRequestLiveAnswer, PeerRequestQuestion, PeerRequestSaveAnswerResponse } from '@twt/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PeerAnswerEditor } from '../src/peer-answer-editor';

const answer = (questionKey: string, code: string): PeerRequestLiveAnswer => ({ questionKey, value: { codes: [code] }, savedAt: 'now' });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); };
const options = (save: (args: { questionKey: string; value: unknown; idempotencyKey: string }) => Promise<PeerRequestSaveAnswerResponse>) => ({
  save, newKey: vi.fn(() => crypto.randomUUID()), shouldRetry: (error: unknown) => error instanceof TypeError,
  wait: vi.fn(async () => {}),
});

describe('PeerAnswerEditor — ordered saves and honest acknowledgements (6.27a R2/R3/R6/R7/R12)', () => {
  it('an old failed save SUPERSEDED by a newer choice of the same question is ⛔ re-sent; the newer choice is (review S16, reversing R2\'s retry-first)', async () => {
    const first = deferred<PeerRequestSaveAnswerResponse>();
    const wait = deferred<void>();
    const calls: string[] = [];
    const save = vi.fn(async (task: { value: unknown; idempotencyKey: string }) => {
      calls.push(task.idempotencyKey);
      if (calls.length === 1) return first.promise;
      return { answers: [answer('has_died', (task.value as { codes: string[] }).codes[0]!)] };
    });
    const editor = new PeerAnswerEditor([], { ...options(save), wait: () => wait.promise });
    editor.save('has_died', { codes: ['died'] });
    first.reject(new TypeError('offline'));
    await flush();
    editor.save('has_died', { codes: ['not_died'] });
    expect(save).toHaveBeenCalledTimes(1);
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_died'] });
    wait.resolve();
    await flush();
    // the stale "died" — which would have become the ONE permanent has_died event — is ⛔ re-sent; "not_died" is.
    expect(calls).toHaveLength(2);
    expect(calls[1]).not.toBe(calls[0]);
    expect((save.mock.calls[1]![0] as { value: unknown }).value).toEqual({ codes: ['not_died'] });
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, saveLine: 'saved' });
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_died'] });
  });

  it('a failed save NOT superseded still retries with its ORIGINAL key (R2 holds where nothing newer exists)', async () => {
    const first = deferred<PeerRequestSaveAnswerResponse>();
    const calls: string[] = [];
    const save = vi.fn(async (task: { idempotencyKey: string }) => {
      calls.push(task.idempotencyKey);
      if (calls.length === 1) return first.promise;
      return { answers: [answer('has_died', 'died')] };
    });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('has_died', { codes: ['died'] });
    first.reject(new TypeError('offline'));
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe(calls[0]);
  });

  it('a stale edit superseded by a LATER edit of the same question is ⛔ sent, adjacent or not (third-pass U3)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const save = vi.fn(async (task: { questionKey: string; value: unknown }) => {
      sent.push(`${task.questionKey}=${JSON.stringify(task.value)}`);
      if (sent.length === 1) return gate.promise;
      return { answers: [] };
    });
    const questions = ['relationship', 'has_died', 'how_known'].map((key) => ({ key, kind: 'single', optional: true, showIf: null, words: { en: key, hi: key }, options: [] })) as unknown as PeerRequestQuestion[];
    const editor = new PeerAnswerEditor([], { ...options(save), questions });
    editor.save('relationship', { codes: ['colleague'] }); // in flight
    editor.save('has_died', { codes: ['died'] }); // stale — the neighbour corrects it below
    editor.save('how_known', { codes: ['saw_them'] }); // an UNRELATED edit between them
    editor.save('has_died', { codes: ['not_died'] });
    gate.resolve({ answers: [] });
    await flush();
    // "died" — which would have become the ONE permanent event — is ⛔ sent
    expect(sent).toEqual(['relationship={"codes":["colleague"]}', 'how_known={"codes":["saw_them"]}', 'has_died={"codes":["not_died"]}']);
  });

  it("…but a DEPENDANT edited between them keeps the prerequisite: it saves first (U3's exception)", async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const save = vi.fn(async (task: { questionKey: string; value: unknown }) => {
      sent.push(`${task.questionKey}=${JSON.stringify(task.value)}`);
      if (sent.length === 1) return gate.promise;
      return { answers: [] };
    });
    const questions = [
      { key: 'has_died', kind: 'single', optional: false, showIf: null, words: { en: 'h', hi: 'h' }, options: [] },
      { key: 'death_date', kind: 'date', optional: true, showIf: { key: 'has_died', anyOf: ['died'] }, words: { en: 'd', hi: 'd' }, options: [] },
    ] as unknown as PeerRequestQuestion[];
    const editor = new PeerAnswerEditor([], { ...options(save), questions });
    editor.save('how_known', { codes: ['saw_them'] }); // in flight
    editor.save('has_died', { codes: ['died'] });
    editor.save('death_date', { date: '2026-10-01' }); // needs "died" saved first
    editor.save('has_died', { codes: ['died'] });
    gate.resolve({ answers: [] });
    await flush();
    expect(sent).toEqual([
      'how_known={"codes":["saw_them"]}',
      'has_died={"codes":["died"]}',
      'death_date={"date":"2026-10-01"}',
      'has_died={"codes":["died"]}',
    ]);
  });

  it('a dependant edit that is ITSELF superseded holds nothing back — the stale parent is ⛔ sent (fourth-pass V4)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    // a server that KEEPS what it acknowledged — so a parent's ack never hides its own dependants
    const server = new Map<string, PeerRequestLiveAnswer>();
    const save = vi.fn(async (task: { questionKey: string; value: unknown }) => {
      sent.push(`${task.questionKey}=${JSON.stringify(task.value)}`);
      if (sent.length === 1) await gate.promise;
      server.set(task.questionKey, { questionKey: task.questionKey, value: task.value as PeerRequestLiveAnswer['value'], savedAt: 'x' });
      return { answers: [...server.values()] };
    });
    const questions = [
      { key: 'has_died', kind: 'single', optional: false, showIf: null, words: { en: 'h', hi: 'h' }, options: [] },
      // the date stays SHOWN under both parent values, so neither date edit is discarded as hidden
      { key: 'death_date', kind: 'date', optional: true, showIf: { key: 'has_died', anyOf: ['died', 'died_elsewhere'] }, words: { en: 'd', hi: 'd' }, options: [] },
    ] as unknown as PeerRequestQuestion[];
    const editor = new PeerAnswerEditor([], { ...options(save), questions });
    editor.save('how_known', { codes: ['saw_them'] }); // in flight
    editor.save('has_died', { codes: ['died'] }); // stale
    editor.save('death_date', { date: '2026-10-01' }); // superseded below — needs nothing from the stale parent
    editor.save('has_died', { codes: ['died_elsewhere'] });
    editor.save('death_date', { date: '2026-10-02' });
    gate.resolve({ answers: [] });
    await flush();
    expect(sent).toEqual(['how_known={"codes":["saw_them"]}', 'has_died={"codes":["died_elsewhere"]}', 'death_date={"date":"2026-10-02"}']);
  });

  it('a GRANDCHILD edited between two edits of the root holds the root (transitive dependants — V4)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const server = new Map<string, PeerRequestLiveAnswer>([
      ['a', { questionKey: 'a', value: { codes: ['x'] }, savedAt: 'x' }],
      ['b', { questionKey: 'b', value: { codes: ['x'] }, savedAt: 'x' }],
    ]);
    const save = vi.fn(async (task: { questionKey: string; value: unknown }) => {
      sent.push(task.questionKey);
      if (sent.length === 1) await gate.promise;
      server.set(task.questionKey, { questionKey: task.questionKey, value: task.value as PeerRequestLiveAnswer['value'], savedAt: 'x' });
      return { answers: [...server.values()] };
    });
    const questions = [
      { key: 'a', kind: 'single', optional: false, showIf: null, words: { en: 'a', hi: 'a' }, options: [] },
      { key: 'b', kind: 'single', optional: true, showIf: { key: 'a', anyOf: ['x', 'y'] }, words: { en: 'b', hi: 'b' }, options: [] },
      { key: 'c', kind: 'single', optional: true, showIf: { key: 'b', anyOf: ['x'] }, words: { en: 'c', hi: 'c' }, options: [] },
    ] as unknown as PeerRequestQuestion[];
    // `a` and `b` already SAVED, so `c` (a grandchild of `a`) is shown and nothing is discarded as hidden
    const saved = [{ questionKey: 'a', value: { codes: ['x'] }, savedAt: 'x' }, { questionKey: 'b', value: { codes: ['x'] }, savedAt: 'x' }];
    const editor = new PeerAnswerEditor(saved, { ...options(save), questions });
    editor.save('z', { codes: ['1'] }); // in flight
    editor.save('a', { codes: ['y'] });
    editor.save('c', { codes: ['x'] }); // a grandchild of `a`, between its two edits
    editor.save('a', { codes: ['y'] });
    gate.resolve({ answers: [] });
    await flush();
    expect(sent).toEqual(['z', 'a', 'c', 'a']);
  });

  it('with ⛔ questions, any other question\'s live edit between holds the stale one (the conservative adjacency — V4)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const save = vi.fn(async (task: { questionKey: string }) => {
      sent.push(task.questionKey);
      if (sent.length === 1) return gate.promise;
      return { answers: [] };
    });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('z', { codes: ['1'] }); // in flight
    editor.save('a', { codes: ['x'] });
    editor.save('b', { codes: ['y'] });
    editor.save('a', { codes: ['w'] });
    editor.save('a', { codes: ['v'] }); // ADJACENT to the previous `a` — that one coalesces
    gate.resolve({ answers: [] });
    await flush();
    expect(sent).toEqual(['z', 'a', 'b', 'a']);
  });

  it('with ⛔ questions, [a1, b1, a2, b2] sends a1 before b1 — STRICT adjacency (fifth-pass W7)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const save = vi.fn(async (task: { questionKey: string; value: unknown }) => {
      sent.push(`${task.questionKey}${JSON.stringify(task.value)}`);
      if (sent.length === 1) await gate.promise;
      return { answers: [] };
    });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('z', { codes: ['0'] }); // in flight
    editor.save('a', { codes: ['1'] });
    editor.save('b', { codes: ['1'] });
    editor.save('a', { codes: ['2'] });
    editor.save('b', { codes: ['2'] });
    gate.resolve({ answers: [] });
    await flush();
    expect(sent).toEqual(['z{"codes":["0"]}', 'a{"codes":["1"]}', 'b{"codes":["1"]}', 'a{"codes":["2"]}', 'b{"codes":["2"]}']);
  });

  it("the person's Retry re-queues in GENERATION order with FRESH keys (fifth-pass W6)", async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const calls: { key: string; id: string }[] = [];
    let n = 0;
    const save = vi.fn(async (task: { questionKey: string; idempotencyKey: string }) => {
      calls.push({ key: task.questionKey, id: task.idempotencyKey });
      n += 1;
      if (n === 1) throw new Error('500'); // P fails
      if (n === 2) return gate.promise; // Z in flight
      return { answers: [] };
    });
    const editor = new PeerAnswerEditor([], { ...options(save), shouldRetry: () => false });
    editor.save('p', { codes: ['x'] });
    await flush();
    editor.save('z', { codes: ['1'] }); // in flight
    editor.save('d', { codes: ['1'] }); // a NEWER edit, queued behind Z
    const failedKey = calls[0]!.id;
    editor.retryFailed(); // P (older generation) must go BEFORE D
    gate.resolve({ answers: [] });
    await flush();
    expect(calls.map((c) => c.key)).toEqual(['p', 'z', 'p', 'd']);
    expect(calls[2]!.id).not.toBe(failedKey); // a FRESH key
  });

  it('abandonQueued() drops every unsent edit NOW and keeps the editor alive (fifth-pass W8)', async () => {
    const gate = deferred<PeerRequestSaveAnswerResponse>();
    const save = vi.fn().mockReturnValueOnce(gate.promise).mockResolvedValue({ answers: [] });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('a', { codes: ['1'] }); // in flight
    editor.save('b', { codes: ['1'] }); // queued — abandoned
    editor.abandonQueued();
    gate.resolve({ answers: [answer('a', '1')] });
    await flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(editor.getSnapshot()).toMatchObject({ pending: 0 });
    editor.save('c', { codes: ['1'] }); // still a working editor
    await flush();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('abandonQueued() ABANDONS the request on the wire — its failure is ⛔ retried, ⛔ recorded — and pending drops NOW (X2)', async () => {
    const wire = deferred<PeerRequestSaveAnswerResponse>();
    const save = vi.fn().mockReturnValueOnce(wire.promise).mockResolvedValue({ answers: [] });
    const editor = new PeerAnswerEditor([], options(save)); // shouldRetry: a TypeError retries
    editor.save('a', { codes: ['1'] }); // ON THE WIRE
    editor.save('b', { codes: ['1'] }); // queued
    editor.abandonQueued();
    expect(editor.getSnapshot()).toMatchObject({ pending: 0 }); // ⛔ "busy" while the wire settles
    wire.reject(new TypeError('offline')); // would retry — but it was abandoned
    await flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(editor.getSnapshot().saveLine).not.toBe('failed');
  });

  it('a rejection WITHOUT a reason still reads as a failure (fifth-pass W10)', async () => {
    const save = vi.fn().mockRejectedValueOnce(undefined);
    const editor = new PeerAnswerEditor([], { ...options(save), shouldRetry: () => false });
    editor.save('a', { codes: ['1'] });
    await flush();
    expect(editor.getSnapshot().failed.has('a')).toBe(true);
    expect(editor.getSnapshot().error).toBeInstanceOf(Error);
  });

  it('each failed question keeps ITS OWN error — re-editing one leaves the other\'s, ⛔ a stale one (third-pass U14)', async () => {
    const errA = new Error('A');
    const errB = new Error('B');
    const save = vi.fn().mockRejectedValueOnce(errA).mockRejectedValueOnce(errB).mockReturnValue(new Promise(() => {}));
    const editor = new PeerAnswerEditor([], { ...options(save), shouldRetry: () => false });
    editor.save('a', { codes: ['x'] });
    editor.save('b', { codes: ['y'] });
    await flush();
    expect(editor.getSnapshot().error).toBe(errB);
    editor.save('b', { codes: ['z'] }); // re-edit B — A's error is what remains
    expect(editor.getSnapshot().error).toBe(errA);
  });

  it('dispose() then activate() while a save is IN FLIGHT: the next edit is SENT, ⛔ shifted off unsent (review S15)', async () => {
    const first = deferred<PeerRequestSaveAnswerResponse>();
    const sent: string[] = [];
    const save = vi.fn(async (task: { questionKey: string }) => {
      sent.push(task.questionKey);
      if (sent.length === 1) return first.promise;
      return { answers: [answer(task.questionKey, 'yes')] };
    });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('has_died', { codes: ['died'] }); // in flight
    editor.dispose(); // Strict Mode cleanup …
    editor.activate([]); // … and setup
    editor.save('callback_consent', { codes: ['yes'] });
    first.resolve({ answers: [answer('has_died', 'died')] }); // the OLD loop wakes — it must touch nothing
    await flush();
    expect(sent).toEqual(['has_died', 'callback_consent']);
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, saveLine: 'saved' });
    expect(editor.getSnapshot().answers.get('callback_consent')).toEqual({ codes: ['yes'] });
  });

  it("a parent whose saved value is `unavailable` is UNKNOWN — the child's draft is ⛔ discarded (review S22)", async () => {
    const save = vi.fn(async () => new Promise<PeerRequestSaveAnswerResponse>(() => {}));
    const questions = [
      { key: 'death_cause', kind: 'single', optional: true, showIf: null, words: { en: 'c', hi: 'c' }, options: [] },
      { key: 'death_illness', kind: 'multi', optional: true, showIf: { key: 'death_cause', anyOf: ['illness_long'] }, words: { en: 'i', hi: 'i' }, options: [] },
    ] as unknown as PeerRequestQuestion[];
    const editor = new PeerAnswerEditor([{ questionKey: 'death_cause', value: { unavailable: true }, savedAt: 'now' }], { ...options(save), questions });
    editor.save('death_illness', { codes: ['heart'] });
    expect(editor.getSnapshot().answers.get('death_illness')).toEqual({ codes: ['heart'] });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('discardFailed() gives up a refused edit: the SAVED value returns, nothing is pending or failed (review S32 / S34)', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('invalid'));
    const editor = new PeerAnswerEditor([answer('has_died', 'died')], { ...options(save), shouldRetry: () => false });
    editor.save('has_died', { codes: ['not_died'] });
    await flush();
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, saveLine: 'failed' });
    editor.discardFailed();
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, error: null });
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['died'] });
  });

  it("one question's new save keeps ANOTHER question's failure reason (review S15)", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('invalid')).mockReturnValue(new Promise(() => {}));
    const editor = new PeerAnswerEditor([], { ...options(save), shouldRetry: () => false });
    editor.save('has_died', { codes: ['died'] });
    await flush();
    expect(editor.getSnapshot().error).toBeInstanceOf(Error);
    editor.save('how_known', { codes: ['other'] });
    expect(editor.getSnapshot().error).toBeInstanceOf(Error);
  });

  it('a delayed parent acknowledgement cannot drop another queued answer; the child is sent after the parent', async () => {
    const parent = deferred<PeerRequestSaveAnswerResponse>();
    const child = deferred<PeerRequestSaveAnswerResponse>();
    const save = vi.fn().mockReturnValueOnce(parent.promise).mockReturnValueOnce(child.promise);
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('has_died', { codes: ['died'] });
    editor.save('death_date', { date: '2026-10-01' });
    expect(save).toHaveBeenCalledTimes(1);
    parent.resolve({ answers: [answer('has_died', 'died')] });
    await flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(editor.getSnapshot().answers.get('death_date')).toEqual({ date: '2026-10-01' });
    expect(editor.getSnapshot().pending).toBe(1);
    child.resolve({ answers: [answer('has_died', 'died'), { questionKey: 'death_date', value: { date: '2026-10-01' }, savedAt: 'now' }] });
    await flush();
    expect(editor.getSnapshot().pending).toBe(0);
  });

  it('a 422 remains explicitly failed, retaining the unsaved edit until corrected', async () => {
    const save = vi.fn().mockRejectedValueOnce({ status: 422 }).mockResolvedValueOnce({ answers: [answer('has_died', 'died')] });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('has_died', { codes: ['not_died'] });
    await flush();
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, saveLine: 'failed' });
    expect(editor.getSnapshot().failed.has('has_died')).toBe(true);
    editor.replaceFromServer([]);
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_died'] });
    editor.save('has_died', { codes: ['died'] });
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(editor.getSnapshot().saveLine).toBe('saved');
  });

  it('a helpline transport failure blocks submission until an explicit retry succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ answers: [answer('callback_consent', 'yes')] });
    const editor = new PeerAnswerEditor([], { ...options(save), shouldRetry: () => false });
    editor.save('callback_consent', { codes: ['yes'] });
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(1);
    editor.retryFailed();
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(save.mock.calls[1]![0].idempotencyKey).toBe(save.mock.calls[0]![0].idempotencyKey);
  });

  it('rapid multi-select edits keep the newest vector while earlier acknowledgements arrive', async () => {
    const first = deferred<PeerRequestSaveAnswerResponse>();
    const last = deferred<PeerRequestSaveAnswerResponse>();
    const editor = new PeerAnswerEditor([], options(vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise)));
    editor.save('death_illness', { codes: ['cancer'] });
    editor.save('death_illness', { codes: ['cancer', 'tb'] });
    first.resolve({ answers: [answer('death_illness', 'cancer')] });
    await flush();
    expect(editor.getSnapshot().answers.get('death_illness')).toEqual({ codes: ['cancer', 'tb'] });
    last.resolve({ answers: [{ ...answer('death_illness', 'cancer'), value: { codes: ['cancer', 'tb'] } }] });
    await flush();
    expect(editor.getSnapshot().answers.get('death_illness')).toEqual({ codes: ['cancer', 'tb'] });
  });

  it('a parent change discards a hidden failed child, so an optional stale edit cannot block Submit forever', async () => {
    const question: PeerRequestQuestion = { key: 'death_date', kind: 'date', words: { en: '', hi: '' }, options: [], optional: true, showIf: { key: 'has_died', anyOf: ['died'] } };
    const save = vi.fn().mockRejectedValueOnce({ status: 422 }).mockResolvedValueOnce({ answers: [answer('has_died', 'not_died')] });
    const editor = new PeerAnswerEditor([answer('has_died', 'died')], { ...options(save), questions: [question] });
    editor.save('death_date', { date: '2026-10-01' });
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(1);
    editor.save('has_died', { codes: ['not_died'] });
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(editor.getSnapshot().answers.has('death_date')).toBe(false);
  });

  it('refetches refresh settled answers but cannot overwrite a pending draft', async () => {
    const pending = deferred<PeerRequestSaveAnswerResponse>();
    const editor = new PeerAnswerEditor([answer('has_died', 'died')], options(() => pending.promise));
    editor.replaceFromServer([answer('has_died', 'not_sure')]);
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_sure'] });
    editor.save('has_died', { codes: ['not_died'] });
    editor.replaceFromServer([answer('has_died', 'died')]);
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_died'] });
    pending.resolve({ answers: [answer('has_died', 'not_died')] });
    await flush();
  });

  it('a refetched parent discards a hidden failed child and clears its blocking error', async () => {
    const question: PeerRequestQuestion = { key: 'death_date', kind: 'date', words: { en: '', hi: '' }, options: [], optional: true, showIf: { key: 'has_died', anyOf: ['died'] } };
    const editor = new PeerAnswerEditor([answer('has_died', 'died')], { ...options(vi.fn().mockRejectedValue({ status: 422 })), questions: [question] });
    editor.save('death_date', { date: '2026-10-01' });
    await flush();
    expect(editor.getSnapshot().failed.size).toBe(1);
    editor.replaceFromServer([answer('has_died', 'not_died')]);
    expect(editor.getSnapshot().answers.has('death_date')).toBe(false);
    expect(editor.getSnapshot().failed.size).toBe(0);
    expect(editor.getSnapshot()).toMatchObject({ saveLine: 'saved', error: null });
  });

  it('keeps unavailable saved answers and recovers after development effect cleanup', () => {
    const answers: PeerRequestLiveAnswer[] = [{ questionKey: 'death_date', value: { unavailable: true }, savedAt: 'now' }];
    const editor = new PeerAnswerEditor(answers, options(async () => ({ answers })));
    editor.dispose();
    editor.activate(answers);
    expect(editor.getSnapshot().answers.get('death_date')).toEqual({ unavailable: true });
  });

  it('a superseded rejection cannot leave an invalid-answer error after a successful replacement', async () => {
    const first = deferred<PeerRequestSaveAnswerResponse>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ answers: [answer('has_died', 'not_died')] });
    const editor = new PeerAnswerEditor([], options(save));
    editor.save('has_died', { codes: ['died'] });
    editor.save('has_died', { codes: ['not_died'] });
    first.reject({ status: 422 });
    await flush();
    expect(editor.getSnapshot()).toMatchObject({ error: null, saveLine: 'saved', pending: 0 });
    expect(editor.getSnapshot().failed.size).toBe(0);
  });
});
