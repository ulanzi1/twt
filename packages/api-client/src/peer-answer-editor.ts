import type { PeerRequestAnswerValue, PeerRequestLiveAnswer, PeerRequestQuestion, PeerRequestSaveAnswerResponse } from '@twt/contracts';

type Task = {
  questionKey: string;
  value: PeerRequestAnswerValue;
  idempotencyKey: string;
  generation: number;
  discarded?: boolean;
  /** Given up by "Leave without saving" WHILE on the wire: its outcome is ignored — ⛔ retried, ⛔ recorded as failed (X2). */
  abandoned?: boolean;
  error?: unknown;
};
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
 *   · S16 — a queued edit superseded by a LATER edit of the same question (rapid toggles, a correction behind a retry —
 *     ADJACENT or not, third-pass review U3) is ⛔ never sent: an out-of-date `has_died` would otherwise become the ONE
 *     permanent event, and every stale value a "changed N times" the District Admin reads. ⚠ The one exception: an edit
 *     BETWEEN them of a (transitive) dependant still to be sent — it needs this value saved first (V4); with ⛔
 *     `questions`, STRICT adjacency (W7);
 *   · U14 — each failed question keeps ITS OWN error; `error` is the latest remaining one (⛔ a stale one after a re-edit);
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
  /** The task whose request is on the wire RIGHT NOW (⛔ one merely waiting out a retry backoff) — W8. */
  private sending: Task | null = null;
  private retrying = false;
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
    this.failures.delete(questionKey); // its error goes with it; another question's failure keeps ITS reason (U14)
    this.queue.push(task);
    this.discardHiddenDrafts();
    this.publish();
    void this.drain();
  }

  /**
   * The person's explicit Retry (fifth-pass review W6): each failed edit goes back in GENERATION order — ⛔ behind a newer
   * dependant already queued, which would then be sent before its prerequisite (a 422) — and with a FRESH key, so a key
   * left `pending` by a request that died (deferred-work D4) can ⛔ trap it (the save is idempotent by value, so a new key
   * ⛔ writes twice).
   */
  retryFailed(): void {
    if (this.disposed) return;
    for (const task of this.failures.values()) {
      task.error = undefined;
      task.idempotencyKey = this.options.newKey();
      this.queue.push(task);
    }
    this.failures.clear();
    // Keep everything not yet SENT in generation order (the head may be in flight — it stays first).
    const head = this.running ? this.queue.slice(0, 1) : [];
    const rest = this.queue.slice(head.length).sort((x, y) => x.generation - y.generation);
    this.queue.splice(0, this.queue.length, ...head, ...rest);
    this.publish();
    void this.drain();
  }

  /**
   * "Leave without saving" (fifth-pass review W8): every edit ⛔ yet sent is dropped NOW — ⛔ left to drain until the
   * screen unmounts — while the editor stays alive (⛔ disposed: a leave that does ⛔ unmount keeps a working screen, U7).
   * A request already in flight cannot be recalled.
   */
  abandonQueued(): void {
    if (this.disposed) return;
    // A request ON THE WIRE cannot be recalled, but it is ABANDONED: whatever it answers is ⛔ retried and ⛔ recorded as a
    // failure (fifth-pass follow-up X2). Every other task is dropped, and LEAVES the queue now — so `pending` / "busy" do
    // ⛔ linger until a retry backoff (up to 30 s) wakes the loop. The head stays only while a loop still owns it.
    const inFlight = this.sending;
    for (const task of this.queue) {
      if (task === inFlight) task.abandoned = true;
      else task.discarded = true;
    }
    const head = this.running ? this.queue[0] : undefined;
    this.queue.splice(0, this.queue.length, ...this.queue.filter((t) => t === head));
    this.drafts.clear();
    this.failures.clear();
    this.publish();
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
    this.discardHiddenDrafts();
    this.publish();
  }

  /** A refetch may update settled answers, but never race an outstanding save's acknowledgement. */
  replaceFromServer(answers: readonly PeerRequestLiveAnswer[]): void {
    if (this.disposed || this.queue.length > 0) return;
    this.authoritative = new Map(answers.map((a) => [a.questionKey, a.value]));
    this.discardHiddenDrafts();
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
    // A dropped or abandoned task is ⛔ pending (X2) — it stays in the queue only until its loop lets go of it.
    const pending = this.queue.filter((t) => !t.discarded && !t.abandoned).length;
    this.snapshot = {
      answers,
      pending,
      failed: new Set(this.failures.keys()),
      saveLine: pending > 0 ? (this.retrying ? 'retrying' : 'saving') : this.failures.size > 0 ? 'failed' : this.generation === 0 && this.authoritative.size === 0 ? 'idle' : 'saved',
      error: [...this.failures.values()].at(-1)?.error ?? null,
    };
    for (const listener of this.listeners) listener();
  }

  /**
   * Is `task` superseded before it is sent (S16, U3, V4)? A LATER queued edit of the same question replaces it — unless an
   * edit queued BETWEEN them is of a (transitive) DEPENDANT of this question that is ITSELF still to be sent (a dependant
   * edit that is superseded later needs nothing from this one — fourth-pass review V4). With ⛔ `questions` the
   * dependants are unknown, so ANY other question's live edit between them holds it (the conservative adjacency).
   */
  private supersededInQueue(task: Task): boolean {
    const dependants = this.dependantsOf(task.questionKey);
    if (dependants === null) {
      // With ⛔ questions: STRICT adjacency — only the very next live edit, of the same question, replaces it (fifth-pass
      // review W7: the "itself superseded" exemption let a possible dependant go out ahead of its prerequisite).
      const start = this.queue.indexOf(task);
      for (let i = start + 1; i < this.queue.length; i += 1) {
        const next = this.queue[i]!;
        if (next.discarded) continue;
        return next.questionKey === task.questionKey && next.generation > task.generation;
      }
      return false;
    }
    const start = this.queue.indexOf(task);
    for (let i = start + 1; i < this.queue.length; i += 1) {
      const next = this.queue[i]!;
      if (next.discarded) continue;
      if (next.questionKey === task.questionKey && next.generation > task.generation) return true;
      if (dependants.has(next.questionKey) && !this.supersededAfter(next, i)) return false;
    }
    return false;
  }

  /** Every question whose `showIf` chain leads to `key` — or `null` when the editor was given ⛔ questions. */
  private dependantsOf(key: string): Set<string> | null {
    const qs = this.options.questions;
    if (!qs) return null;
    const out = new Set<string>();
    const frontier = [key];
    while (frontier.length > 0) {
      const k = frontier.pop()!;
      for (const q of qs) {
        if (q.showIf?.key === k && !out.has(q.key)) {
          out.add(q.key);
          frontier.push(q.key);
        }
      }
    }
    return out;
  }

  /** A later, live edit of the same question replaces the edit at `index`. */
  private supersededAfter(task: Task, index: number): boolean {
    for (let i = index + 1; i < this.queue.length; i += 1) {
      const next = this.queue[i]!;
      if (!next.discarded && next.questionKey === task.questionKey && next.generation > task.generation) return true;
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
          if (task.discarded || task.abandoned || this.supersededInQueue(task)) break;
          try {
            this.sending = task;
            let result: PeerRequestSaveAnswerResponse;
            try {
              result = await this.options.save(task);
            } finally {
              if (this.sending === task) this.sending = null;
            }
            if (!live()) return;
            this.authoritative = new Map(result.answers.map((a) => [a.questionKey, a.value]));
            if (this.drafts.get(task.questionKey)?.generation === task.generation) this.drafts.delete(task.questionKey);
            this.discardHiddenDrafts();
            break;
          } catch (error) {
            if (!live()) return;
            if (task.discarded || task.abandoned) break; // given up — ⛔ retried, ⛔ a failure (X2)
            if (this.options.shouldRetry(error)) {
              this.retrying = true;
              this.publish();
              await this.options.wait(attempt);
              if (!live()) return;
              this.retrying = false;
              continue;
            }
            if (this.drafts.get(task.questionKey)?.generation === task.generation) {
              // A rejection WITHOUT a reason is still a failure (fifth-pass review W10 — `undefined` read as "no error").
              task.error = error ?? new Error('[peer-answer-editor] the save failed without a reason');
              this.failures.delete(task.questionKey); // re-insert ⇒ the LATEST failure is last (U14)
              this.failures.set(task.questionKey, task);
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
