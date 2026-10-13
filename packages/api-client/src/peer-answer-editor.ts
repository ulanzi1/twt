import type { PeerRequestAnswerValue, PeerRequestLiveAnswer, PeerRequestQuestion, PeerRequestSaveAnswerResponse } from '@twt/contracts';

type Task = { questionKey: string; value: PeerRequestAnswerValue; idempotencyKey: string; generation: number; discarded?: boolean };
export interface PeerAnswerEditorSnapshot {
  readonly answers: ReadonlyMap<string, PeerRequestLiveAnswer['value']>;
  readonly pending: number;
  readonly failed: ReadonlySet<string>;
  readonly saveLine: 'idle' | 'saving' | 'retrying' | 'saved' | 'failed';
  readonly error: unknown;
}

/** One reply's FIFO saves. Server acknowledgements never erase a newer optimistic edit.
 * Kept in memory only: decrypted answers must never enter a persisted offline queue.
 * ⭐ Story 6.27a second-pass review:
 *   · S15 — a drain EPOCH: `dispose()` ends the running loop for good, so a loop still awaiting its request when the
 *     editor is disposed and re-activated (React Strict Mode's cleanup / setup) can ⛔ never shift a NEW edit off the queue
 *     unsent; the loop only ever removes the task it sent;
 *   · S16 — a queued edit superseded by the NEXT edit of the same question (rapid toggles, a correction behind a retry)
 *     is ⛔ never sent: an out-of-date `has_died` would otherwise become the ONE permanent event, and every stale value
 *     a "changed N times" the District Admin reads. Only ADJACENT edits coalesce, so a prerequisite edited between
 *     them still saves first;
 *   · S22 — a parent whose saved value could ⛔ not be shown (`unavailable`) is UNKNOWN, ⛔ "condition not met": its
 *     dependants' drafts are kept. */
export class PeerAnswerEditor {
  private authoritative: Map<string, PeerRequestLiveAnswer['value']>;
  private readonly drafts = new Map<string, Task>();
  private readonly failures = new Map<string, Task>();
  private readonly queue: Task[] = [];
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private running = false;
  private disposed = false;
  private epoch = 0;
  private retrying = false;
  private error: unknown = null;
  private snapshot: PeerAnswerEditorSnapshot;

  constructor(
    answers: readonly PeerRequestLiveAnswer[],
    private readonly options: {
      save: (task: Pick<Task, 'questionKey' | 'value' | 'idempotencyKey'>) => Promise<PeerRequestSaveAnswerResponse>;
      newKey: () => string;
      shouldRetry: (error: unknown) => boolean;
      wait: (attempt: number) => Promise<void>;
      questions?: readonly PeerRequestQuestion[];
    },
  ) {
    this.authoritative = new Map(answers.map((a) => [a.questionKey, a.value]));
    this.snapshot = { answers: new Map(this.authoritative), pending: 0, failed: new Set(), saveLine: 'idle', error: null };
  }

  getSnapshot = (): PeerAnswerEditorSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  save(questionKey: string, value: PeerRequestAnswerValue): void {
    if (this.disposed) return;
    const task = { questionKey, value, idempotencyKey: this.options.newKey(), generation: ++this.generation };
    this.drafts.set(questionKey, task);
    this.failures.delete(questionKey);
    if (this.failures.size === 0) this.error = null; // ⛔ another question's failure loses its reason
    this.queue.push(task);
    this.discardHiddenDrafts();
    this.publish();
    void this.drain();
  }

  retryFailed(): void {
    if (this.disposed) return;
    for (const task of this.failures.values()) this.queue.push(task);
    this.failures.clear();
    this.error = null;
    this.publish();
    void this.drain();
  }

  /**
   * Give up the FAILED edits explicitly (second-pass review S32 / S34 — an operator or member must never be trapped by
   * an answer the server refuses): each failed question falls back to its SAVED value; ⛔ never silent — the caller
   * offers it as a named action.
   */
  discardFailed(): void {
    if (this.disposed) return;
    for (const [key, task] of this.failures) {
      if (this.drafts.get(key)?.generation === task.generation) this.drafts.delete(key);
    }
    this.failures.clear();
    this.error = null;
    this.discardHiddenDrafts();
    this.publish();
  }

  /** A refetch may update settled answers, but never race an outstanding save's acknowledgement. */
  replaceFromServer(answers: readonly PeerRequestLiveAnswer[]): void {
    if (this.disposed || this.queue.length > 0) return;
    this.authoritative = new Map(answers.map((a) => [a.questionKey, a.value]));
    this.discardHiddenDrafts();
    if (this.failures.size === 0) this.error = null;
    this.publish();
  }

  dispose(): void {
    this.disposed = true;
    this.epoch += 1; // the running loop (if any) is over — it ⛔ never touches this editor again
    this.running = false;
    this.retrying = false;
    this.queue.length = 0;
    this.drafts.clear();
    this.failures.clear();
    this.authoritative.clear();
    this.snapshot = { answers: new Map(), pending: 0, failed: new Set(), saveLine: 'idle', error: null };
    this.listeners.clear();
  }

  /** React's effect setup may run again after its development Strict Mode cleanup. */
  activate(answers: readonly PeerRequestLiveAnswer[]): void {
    this.disposed = false;
    this.replaceFromServer(answers);
  }

  private discardHiddenDrafts(): void {
    const effective = new Map(this.authoritative);
    for (const [key, task] of this.drafts) effective.set(key, task.value);
    for (const q of this.options.questions ?? []) {
      if (q.showIf === null) continue;
      const parent = effective.get(q.showIf.key);
      if (parent && 'unavailable' in parent) continue; // UNKNOWN — ⛔ discard on a value we could not show (S22)
      if (parent && 'codes' in parent && parent.codes.some((c) => q.showIf!.anyOf.includes(c))) continue;
      effective.delete(q.key);
      this.drafts.delete(q.key);
      this.failures.delete(q.key);
      for (const task of this.queue) if (task.questionKey === q.key) task.discarded = true;
    }
  }

  private publish(): void {
    if (this.disposed) return;
    const answers = new Map(this.authoritative);
    for (const [key, task] of this.drafts) answers.set(key, task.value);
    this.snapshot = {
      answers,
      pending: this.queue.length,
      failed: new Set(this.failures.keys()),
      saveLine: this.queue.length > 0 ? (this.retrying ? 'retrying' : 'saving') : this.failures.size > 0 ? 'failed' : this.generation === 0 && this.authoritative.size === 0 ? 'idle' : 'saved',
      error: this.error,
    };
    for (const listener of this.listeners) listener();
  }

  /** The next queued edit, skipping discarded ones, is the SAME question ⇒ `task` is superseded before it is sent (S16). */
  private supersededInQueue(task: Task): boolean {
    for (const next of this.queue) {
      if (next === task || next.discarded) continue;
      return next.questionKey === task.questionKey && next.generation > task.generation;
    }
    return false;
  }

  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    const epoch = this.epoch;
    const live = () => epoch === this.epoch && !this.disposed;
    try {
      while (this.queue.length > 0 && live()) {
        const task = this.queue[0]!;
        for (let attempt = 1; live(); attempt += 1) {
          if (task.discarded || this.supersededInQueue(task)) break;
          try {
            const result = await this.options.save(task);
            if (!live()) return;
            this.authoritative = new Map(result.answers.map((a) => [a.questionKey, a.value]));
            if (this.drafts.get(task.questionKey)?.generation === task.generation) this.drafts.delete(task.questionKey);
            this.discardHiddenDrafts();
            if (this.failures.size === 0) this.error = null;
            break;
          } catch (error) {
            if (!live()) return;
            if (task.discarded) break;
            if (this.options.shouldRetry(error)) {
              this.retrying = true;
              this.publish();
              await this.options.wait(attempt);
              if (!live()) return;
              this.retrying = false;
              continue;
            }
            if (this.drafts.get(task.questionKey)?.generation === task.generation) {
              this.failures.set(task.questionKey, task);
              this.error = error;
            }
            break;
          }
        }
        if (!live()) return;
        if (this.queue[0] === task) this.queue.shift(); // ⛔ ever another task (S15)
        this.publish();
      }
    } finally {
      if (epoch === this.epoch) this.running = false;
    }
  }
}
