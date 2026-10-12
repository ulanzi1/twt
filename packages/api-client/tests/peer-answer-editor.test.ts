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
  it('an old failed save retries with its original key BEFORE the newer choice; the newer choice stays visible', async () => {
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
    expect(calls).toHaveLength(3);
    expect(calls[1]).toBe(calls[0]);
    expect(calls[2]).not.toBe(calls[0]);
    expect(editor.getSnapshot()).toMatchObject({ pending: 0, saveLine: 'saved' });
    expect(editor.getSnapshot().answers.get('has_died')).toEqual({ codes: ['not_died'] });
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
