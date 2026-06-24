// Account State Machine framework primitive per UX-DR74 (epics line 474) +
// architecture Cross-Cutting #12 (line 306-312).
//
// Generic, dependency-free fold-over-events framework. It was authored in
// @twt/events at Story 1.3, and RELOCATED here at Story 3.1 so the concrete
// member-state lifecycle (architecture §1.14 — canonical home
// packages/domain/src/member/state.ts) can consume it WITHOUT a package cycle:
// `@twt/events` depends on `@twt/domain`, so the framework must live at or below
// domain for domain's reducer to use it. `@twt/events` now re-exports
// `StateMachine` / `defineStateMachine` / `StateMachineConfig` from here, so its
// public API (Story 1.3 consumers) is unchanged. The framework is PURE — no
// imports, no I/O — and stays so (determinism & replay, Cross-Cutting #4).
//
// Claim-state / pool-state / alert-state primitives + composition rules for
// architecture's `claim-filed-frozen`, `disbursed-frozen-readable`,
// `disabled-T+90`, `public-record-∞` end states are the subject of a focused
// follow-up architectural workload flagged in architecture §Gap Analysis
// (line 4802-4815).

export interface StateMachineConfig<
  S extends string,
  E extends { type: string },
> {
  readonly initial: S;
  readonly reduce: (state: S, event: E) => S;
  /**
   * Documentation-only transition table. Runtime authority is `reduce`.
   * Optional so downstream consumers can emit a transition matrix for docs
   * (architecture §1.14 line 1238-1246 table format) without parsing the
   * reducer's source.
   */
  readonly transitions?: ReadonlyArray<{
    readonly from: S;
    readonly event: E['type'];
    readonly to: S;
  }>;
}

export class StateMachine<S extends string, E extends { type: string }> {
  private constructor(private readonly config: StateMachineConfig<S, E>) {}

  public static define<S extends string, E extends { type: string }>(
    config: StateMachineConfig<S, E>,
  ): StateMachine<S, E> {
    return new StateMachine(config);
  }

  public get initial(): S {
    return this.config.initial;
  }

  public fold(events: readonly E[]): S {
    return events.reduce((s, e) => this.config.reduce(s, e), this.config.initial);
  }

  public step(state: S, event: E): S {
    return this.config.reduce(state, event);
  }

  public get transitions():
    | ReadonlyArray<{ from: S; event: E['type']; to: S }>
    | undefined {
    return this.config.transitions;
  }
}

export function defineStateMachine<
  S extends string,
  E extends { type: string },
>(config: StateMachineConfig<S, E>): StateMachine<S, E> {
  return StateMachine.define(config);
}
