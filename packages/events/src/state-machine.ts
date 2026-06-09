// Account State Machine framework primitive per UX-DR74 (epics line 474) +
// architecture Cross-Cutting #12 (line 306-312).
//
// Generic shape — concrete member-state lifecycle (architecture §1.14
// line 1238-1246: pending-fee → lock-in → (pending-valid | active) →
// active_in_grace → lapsed_unpaid → withdrawn) is authored at
// packages/domain/src/member/state.ts in Epic 3 (Story 3.1+).
//
// Claim-state / pool-state / alert-state primitives + composition rules for
// architecture's `claim-filed-frozen`, `disbursed-frozen-readable`,
// `disabled-T+90`, `public-record-∞` end states are the subject of a
// focused follow-up architectural workload flagged in architecture
// §Gap Analysis (line 4802-4815).

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
