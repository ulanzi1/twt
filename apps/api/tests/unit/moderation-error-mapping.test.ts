// `MemberStreamConcurrencyError` → HTTP 409 mapping — Story 10.10 code-review follow-up.
//
// ⚠ WHY THIS FILE EXISTS. `moderateMember` (and every other `member.*` event-append caller —
// medical disclosure, RTBF, life-events, …) can lose the `events_log` `(stream_id, event_version)`
// unique-index race and throw the domain's typed `MemberStreamConcurrencyError`. That class had NO
// arm in `errorMappingHandler`, so it fell through to a generic `500 internal.error` instead of the
// clean, retriable 409 every sibling concurrent-write race gets.
//
// ⚠ WHY A UNIT TEST AND NOT AN E2E RACE (the `flag-flip-concurrency.spec.ts` / `feature-flag-error-
// mapping.test.ts` precedent, verbatim). `moderateMember` claims `head_version + 1` from a fresh
// read, so pre-seeding a row at the "next" version just raises the head and the write claims the
// version AFTER it — no collision. A genuine two-request HTTP race serializes often enough to be
// flaky. This file pins the typed-error → HTTP-status half directly; the pg-level 23505 → typed-
// error half is the projector's own pre-existing, unchanged behaviour
// (`packages/domain/src/member/project.ts`).

import { member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import { errorMappingHandler } from '../../src/middleware/error-mapping/index.js';

function fakeReply(): FastifyReply & { sentStatus: number; sentBody: unknown } {
  const state = { sentStatus: 0, sentBody: undefined as unknown };
  const reply = {
    status(code: number) {
      state.sentStatus = code;
      return reply;
    },
    send(body: unknown) {
      state.sentBody = body;
      return reply;
    },
    get sentStatus() {
      return state.sentStatus;
    },
    get sentBody() {
      return state.sentBody;
    },
  };
  return reply as unknown as FastifyReply & { sentStatus: number; sentBody: unknown };
}

describe('errorMappingHandler — MemberStreamConcurrencyError → 409 (review fix)', () => {
  it('maps to 409 member.stream_concurrency_conflict with the request id, not a 500', () => {
    const error = new memberDomain.MemberStreamConcurrencyError('11111111-1111-1111-1111-111111111111', 5);
    const reply = fakeReply();
    const request = { requestContext: { traceId: 'req-mod-1' } } as unknown as FastifyRequest;

    errorMappingHandler(error as never, request, reply);

    expect(reply.sentStatus).toBe(409);
    const body = reply.sentBody as { error: { code: string; request_id: string } };
    expect(body.error.code).toBe('member.stream_concurrency_conflict');
    expect(body.error.request_id).toBe('req-mod-1');
  });
});
