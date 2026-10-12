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
 * Kept in memory only: decrypted answers must never enter a persisted offline queue. */
export class PeerAnswerEditor {
  private authoritative: Map<string, PeerRequestLiveAnswer['value']>;
  private readonly drafts = new Map<string, Task>();
  private readonly failures = new Map<string, Task>();
  private readonly queue: Task[] = [];
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private running = false;
  private disposed = false;
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
    this.error = null;
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

  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (this.queue.length > 0 && !this.disposed) {
        const task = this.queue[0]!;
        for (let attempt = 1; !this.disposed; attempt += 1) {
          if (task.discarded) break;
          try {
            const result = await this.options.save(task);
            if (this.disposed) return;
            this.authoritative = new Map(result.answers.map((a) => [a.questionKey, a.value]));
            if (this.drafts.get(task.questionKey)?.generation === task.generation) this.drafts.delete(task.questionKey);
            this.discardHiddenDrafts();
            if (this.failures.size === 0) this.error = null;
            break;
          } catch (error) {
            if (this.disposed) return;
            if (task.discarded) break;
            if (this.options.shouldRetry(error)) {
              this.retrying = true;
              this.publish();
              await this.options.wait(attempt);
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
        this.queue.shift();
        this.publish();
      }
    } finally {
      this.running = false;
    }
  }
}
