// Unit tests for the Story 2.2 tone-review publish-gate pre-handler + audit seam
// (AC3, AC4, AC5).
//
// THERE IS NO PUBLISH ROUTE AT STORY 2.2 — the gate is mounted by no endpoint until
// Story 2.4. So we prove teeth the rbac/2.1 way: a fake Fastify request + a stub
// `resolveSignoff` + a capturing tone-review audit sink. No DB, no live route.
// Matrix: (a) no sign-off → block + audit + 409 mapping; (b) author == reviewer →
// block + audit; (c) valid non-author sign-off → allow, no block emission. Plus the
// never-throw + loud-500 + audit-input-mapping contracts.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { ToneReviewRequiredError, TONE_REVIEW_REQUIRED_CODE, toneReview } from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { errorMappingHandler } from '../../src/middleware/error-mapping/index.js';
import {
  recordToneReviewSignoff,
  requireToneReviewSignoff,
  toneReviewEventToAuditInput,
  type RequireToneReviewSignoffOptions,
  type ToneReviewAuditEvent,
  type ToneReviewAuditSink,
} from '../../src/modules/tone-review/index.js';

type ToneReviewSignoff = toneReview.ToneReviewSignoff;

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const REVIEWER = '22222222-2222-2222-2222-222222222222';
const PARIWAR = '33333333-3333-3333-3333-333333333333';
const LOCATOR = 'niyamavali:clause:7';
const CONTENT_HASH = 'a'.repeat(64);
const HEX64 = /^[0-9a-f]{64}$/;
const DOTTED_ACTION = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

class CapturingToneReviewSink implements ToneReviewAuditSink {
  public readonly events: ToneReviewAuditEvent[] = [];
  public emit(event: ToneReviewAuditEvent): void {
    this.events.push(event);
  }
}

/** A sink that throws on emit — proves an audit failure cannot change the decision. */
class ThrowingToneReviewSink implements ToneReviewAuditSink {
  public emit(): void {
    throw new Error('tone-review audit sink boom');
  }
}

function fakeDeps(sink: ToneReviewAuditSink): AppDeps {
  return {
    toneReviewAuditSink: sink,
    clock: () => new Date('2026-06-20T00:00:00.000Z'),
  } as unknown as AppDeps;
}

function fakeRequest(over: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    requestContext: { actorId: AUTHOR, traceId: 'trace-1' },
    scopeTx: { pariwarId: PARIWAR },
    ...over,
  } as unknown as FastifyRequest;
}

function run(
  hook: ReturnType<typeof requireToneReviewSignoff>,
  req: FastifyRequest,
): Promise<void> {
  return (hook as unknown as (request: FastifyRequest) => Promise<void>)(req);
}

function signoff(over: Partial<ToneReviewSignoff> = {}): ToneReviewSignoff {
  return { reviewedBy: REVIEWER, resourceLocator: LOCATOR, contentHash: CONTENT_HASH, ...over };
}

function opts(s: ToneReviewSignoff | null): RequireToneReviewSignoffOptions {
  return {
    resolveSignoff: () => s,
    resolveAuthoredBy: () => AUTHOR,
    resolveResourceLocator: () => LOCATOR,
  };
}

describe('requireToneReviewSignoff (Story 2.2, AC3/AC5 teeth)', () => {
  it('(a) BLOCKS with no sign-off → throws + ONE tone_review.publish_blocked', async () => {
    const sink = new CapturingToneReviewSink();
    const hook = requireToneReviewSignoff(fakeDeps(sink), opts(null));
    await expect(run(hook, fakeRequest())).rejects.toBeInstanceOf(ToneReviewRequiredError);
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]!.type).toBe('tone_review.publish_blocked');
    expect(sink.events[0]!.resourceLocator).toBe(LOCATOR);
    expect(sink.events[0]!.pariwarId).toBe(PARIWAR);
    expect((sink.events[0]!.context as { reason: string }).reason).toBe('signoff-missing');
  });

  it('(b) BLOCKS when author == reviewer (non-author invariant) + audits', async () => {
    const sink = new CapturingToneReviewSink();
    const hook = requireToneReviewSignoff(fakeDeps(sink), opts(signoff({ reviewedBy: AUTHOR })));
    await expect(run(hook, fakeRequest())).rejects.toBeInstanceOf(ToneReviewRequiredError);
    expect(sink.events).toHaveLength(1);
    expect((sink.events[0]!.context as { reason: string }).reason).toBe('author-is-reviewer');
  });

  it('(c) ALLOWS a valid non-author sign-off — no block emission', async () => {
    const sink = new CapturingToneReviewSink();
    const hook = requireToneReviewSignoff(fakeDeps(sink), opts(signoff()));
    await expect(run(hook, fakeRequest())).resolves.toBeUndefined();
    expect(sink.events).toHaveLength(0);
  });

  it('resolves an async sign-off resolver (the consumer may hit a store)', async () => {
    const sink = new CapturingToneReviewSink();
    const asyncOpts: RequireToneReviewSignoffOptions = {
      resolveSignoff: () => Promise.resolve(signoff()),
      resolveAuthoredBy: () => AUTHOR,
      resolveResourceLocator: () => LOCATOR,
    };
    const hook = requireToneReviewSignoff(fakeDeps(sink), asyncOpts);
    await expect(run(hook, fakeRequest())).resolves.toBeUndefined();
    expect(sink.events).toHaveLength(0);
  });

  it('FAILS LOUD (500-path) when the request-context middleware did not run', async () => {
    const sink = new CapturingToneReviewSink();
    const hook = requireToneReviewSignoff(fakeDeps(sink), opts(null));
    await expect(
      run(hook, fakeRequest({ requestContext: undefined as never })),
    ).rejects.toThrow(/without request context/);
    expect(sink.events).toHaveLength(0); // a misconfiguration, not a tone-review block
  });

  it('a throwing audit sink does NOT propagate — the 409 gate decision holds', async () => {
    const hook = requireToneReviewSignoff(fakeDeps(new ThrowingToneReviewSink()), opts(null));
    // The sink throws inside the emission path, but the gate still throws the
    // ToneReviewRequiredError (not the sink error) → decision unchanged.
    await expect(run(hook, fakeRequest())).rejects.toBeInstanceOf(ToneReviewRequiredError);
  });
});

describe('toneReviewEventToAuditInput (Story 2.2, AC4 — writer-acceptable mapping)', () => {
  function evt(over: Partial<ToneReviewAuditEvent> = {}): ToneReviewAuditEvent {
    return {
      type: 'tone_review.signoff',
      actorId: REVIEWER,
      pariwarId: PARIWAR,
      resourceLocator: LOCATOR,
      contentHash: CONTENT_HASH,
      at: new Date('2026-06-20T00:00:00.000Z'),
      ...over,
    };
  }

  it('signoff → action tone_review.signoff (status 200), requestPayloadHash = contentHash', () => {
    const input = toneReviewEventToAuditInput(evt());
    expect(input.action).toBe('tone_review.signoff');
    expect(input.action).toMatch(DOTTED_ACTION);
    expect(input.responseStatus).toBe(200);
    expect(input.actorId).toBe(REVIEWER);
    expect(input.resourceLocator).toBe(LOCATOR);
    expect(input.requestPayloadHash).toBe(CONTENT_HASH);
    expect(input.requestPayloadHash).toMatch(HEX64);
  });

  it('publish_blocked → action tone_review.publish_blocked (status 409), hashes context', () => {
    const input = toneReviewEventToAuditInput(
      evt({ type: 'tone_review.publish_blocked', contentHash: undefined, context: { reason: 'signoff-missing' } }),
    );
    expect(input.action).toBe('tone_review.publish_blocked');
    expect(input.action).toMatch(DOTTED_ACTION);
    expect(input.responseStatus).toBe(409);
    expect(input.requestPayloadHash).toMatch(HEX64); // hashed context, not raw
  });

  it('null pariwarId falls back to the nil sentinel', () => {
    expect(toneReviewEventToAuditInput(evt({ pariwarId: null })).pariwarId).toBe(
      '00000000-0000-0000-0000-000000000000',
    );
  });

  it('a malformed contentHash falls back to a context hash AND logs the fallback', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const input = toneReviewEventToAuditInput(evt({ contentHash: 'not-a-hex-digest' }));
    expect(input.requestPayloadHash).toMatch(HEX64);
    expect(input.requestPayloadHash).not.toBe('not-a-hex-digest');
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('contentHash is not a SHA-256 hex digest'),
      expect.any(String),
    );
    errSpy.mockRestore();
  });

  it('recordToneReviewSignoff emits one signoff event carrying the content hash', () => {
    const sink = new CapturingToneReviewSink();
    recordToneReviewSignoff(fakeDeps(sink), {
      reviewedBy: REVIEWER,
      resourceLocator: LOCATOR,
      contentHash: CONTENT_HASH,
      pariwarId: PARIWAR,
      traceId: 'trace-9',
    });
    expect(sink.events).toHaveLength(1);
    const ev = sink.events[0]!;
    expect(ev.type).toBe('tone_review.signoff');
    expect(ev.contentHash).toBe(CONTENT_HASH);
    // …and it maps to a writer-acceptable AuditEntryInput.
    const input = toneReviewEventToAuditInput(ev);
    expect(input.action).toMatch(DOTTED_ACTION);
    expect(input.requestPayloadHash).toMatch(HEX64);
    expect(input.responseStatus).toBe(200);
  });
});

describe('error-mapping → 409 tone-review-required (Story 2.2, AC5)', () => {
  it('maps ToneReviewRequiredError to HTTP 409 with the projected envelope', () => {
    const result = toneReview.evaluateToneReviewGate({
      signoff: null,
      authoredBy: AUTHOR,
      resourceLocator: LOCATOR,
    });
    if (result.allowed) throw new Error('unreachable');
    const error = new ToneReviewRequiredError(result.denial);

    let sentStatus = 0;
    let sentBody: unknown;
    const reply = {
      status(code: number) {
        sentStatus = code;
        return this;
      },
      send(body: unknown) {
        sentBody = body;
        return this;
      },
    } as unknown as FastifyReply;
    const request = { requestContext: { traceId: 'req-7' } } as unknown as FastifyRequest;

    errorMappingHandler(error as never, request, reply);

    expect(sentStatus).toBe(409);
    expect((sentBody as { error: { code: string; request_id: string } }).error.code).toBe(
      TONE_REVIEW_REQUIRED_CODE,
    );
    expect((sentBody as { error: { request_id: string } }).error.request_id).toBe('req-7');
  });
});
