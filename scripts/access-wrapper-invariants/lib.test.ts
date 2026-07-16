import { describe, expect, it } from 'vitest';

import {
  formatCompensatingAuditFinding,
  formatSecretCompareFinding,
  scanAccessWrapperInvariant,
  scanCompensatingAuditInvariant,
  scanSecretCompareInvariant,
} from './lib.js';

// The real guard shape (service.ts step 0), operand order preserved.
const GUARD =
  `  if (!opts.caller && !opts.internal) {\n` +
  `    throw new Error('[getX] opts.caller or opts.internal must be supplied');\n` +
  `  }\n`;

/** An exported async entrypoint returning Promise<MemberValidityPayload>, body injected. */
const entrypoint = (body: string): string =>
  `export async function getX(\n` +
  `  deps: any,\n` +
  `  ctx: any,\n` +
  `  opts: ValidityServiceOptions = {},\n` +
  `): Promise<MemberValidityPayload> {\n` +
  `${body}` +
  `}\n`;

describe('scanAccessWrapperInvariant — AI-4-3 gate teeth', () => {
  it('ACCEPTS an entrypoint with the caller-XOR-internal fail-closed guard', () => {
    const src = entrypoint(GUARD + `  const full = assemblePayload(input);\n  return full;\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('ACCEPTS the guard with reversed operand order (!internal && !caller)', () => {
    const guard =
      `  if (!opts.internal && !opts.caller) {\n    throw new Error('nope');\n  }\n`;
    const src = entrypoint(guard + `  return assemblePayload(input);\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('ACCEPTS a pure delegator that forwards its opts param to a guarded entrypoint', () => {
    // The getValidity → getValidityAt shape: a preceding `const` then a forwarding return.
    const src =
      `export async function getValidity(\n` +
      `  deps: any,\n  ctx: any,\n  opts: ValidityServiceOptions = {},\n` +
      `): Promise<MemberValidityPayload> {\n` +
      `  const now = await selectDbNow(deps.db);\n` +
      `  return getValidityAt(deps, ctx, now, opts);\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('FLAGS an entrypoint that assembles + returns the full payload with NO guard (the 4.6 regression)', () => {
    const src = entrypoint(`  const full = assemblePayload(input);\n  return full;\n`);
    const f = scanAccessWrapperInvariant('service.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('getX');
  });

  it('FLAGS a "delegator" that forwards a literal { internal: true } (auto-internal bypass)', () => {
    // Does NOT forward the caller-supplied opts — it hard-codes internal access. Must guard.
    const src = entrypoint(`  return getValidityAt(deps, ctx, now, { internal: true });\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(1);
  });

  it('does NOT flag a sync helper returning a BARE (non-Promise) payload (assemblePayload/redactForCaller)', () => {
    const src =
      `export function assemblePayload(input: AssembleInput): MemberValidityPayload {\n` +
      `  return { ...input } as MemberValidityPayload;\n` +
      `}\n` +
      `export function redactForCaller(p: MemberValidityPayload, c: any): MemberValidityPayload {\n` +
      `  return p;\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('redaction.ts', src)).toHaveLength(0);
  });

  it('does NOT flag an async fn that returns something other than the payload (Promise<void> audit writer)', () => {
    const src =
      `export async function auditValidityRead(deps: any, ctx: any, p: any, c: any): Promise<void> {\n` +
      `  await deps.write(p);\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('does NOT match a caller/internal mention inside a comment or string', () => {
    const src = entrypoint(
      `  // opts.caller and opts.internal are documented here but not guarded\n` +
        `  const note = "if (!opts.caller && !opts.internal) throw";\n` +
        `  return assemblePayload(input);\n`,
    );
    // No real guard node → still flagged (the prose must not satisfy the gate).
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(1);
  });

  it('reports the correct file, 1-based line, and function name', () => {
    const src = `\n\n` + entrypoint(`  return assemblePayload(input);\n`);
    const f = scanAccessWrapperInvariant('packages/validity-service/src/service.ts', src);
    expect(f[0].file).toBe('packages/validity-service/src/service.ts');
    expect(f[0].fn).toBe('getX');
    expect(f[0].line).toBe(3); // two blank lines + `export async function getX` on line 3
  });
});

// A verification context modeled on channel-webhooks/handlers.ts `verifyChallenge`
// (an object-literal method). `resolveChannelSecret` + the `hub.verify_token` read
// mark it as verification; `body` is the credential-compare line under test.
const verificationMethod = (body: string): string =>
  `export function makeHandlers(deps: any) {\n` +
  `  return {\n` +
  `    async verifyChallenge(request: any): Promise<void> {\n` +
  `      const q = request.query as Record<string, string | undefined>;\n` +
  `      const mode = q['hub.mode'];\n` +
  `      const token = q['hub.verify_token'];\n` +
  `      const challenge = q['hub.challenge'];\n` +
  `      const expectedToken = await deps.resolveChannelSecret('name');\n` +
  `${body}` +
  `      await reply.status(200).send(challenge);\n` +
  `    },\n` +
  `  };\n` +
  `}\n`;

describe('scanSecretCompareInvariant — AI-5-1 gate teeth (channel-surface constant-time compare)', () => {
  it('(a) FLAGS the pre-fix Story 5.4 defect: `token !== expectedToken` (both runtime) in a verification context', () => {
    const src = verificationMethod(
      `      if (mode !== 'subscribe' || !token || token !== expectedToken) throw new Error('nope');\n`,
    );
    const f = scanSecretCompareInvariant('apps/api/src/modules/channel-webhooks/handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyChallenge');
  });

  it('(b) ACCEPTS the shipped fix: `timingSafeEqualString(token, expectedToken)`', () => {
    const src = verificationMethod(
      `      if (mode !== 'subscribe' || !token || !timingSafeEqualString(token, expectedToken) || challenge === undefined) throw new Error('nope');\n`,
    );
    expect(scanSecretCompareInvariant('handlers.ts', src)).toHaveLength(0);
  });

  it('(c) ACCEPTS legitimate control-flow compares against literals (mode !== "subscribe", challenge === undefined, !token)', () => {
    const src = verificationMethod(
      `      if (mode !== 'subscribe') throw new Error('a');\n` +
        `      if (challenge === undefined) throw new Error('b');\n` +
        `      if (!token) throw new Error('c');\n` +
        `      if (!timingSafeEqualString(token, expectedToken)) throw new Error('d');\n`,
    );
    expect(scanSecretCompareInvariant('handlers.ts', src)).toHaveLength(0);
  });

  it('(d) FLAGS `.includes` between two runtime values inside a verification context', () => {
    const src = verificationMethod(
      `      if (!token || !expectedToken.includes(token)) throw new Error('nope');\n`,
    );
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyChallenge');
  });

  it('(e) does NOT scan a plain `a === b` in a NON-verification function (conditional scoping)', () => {
    // No HMAC / secret-resolver / header-read / approved comparator → not a verification context.
    const src =
      `export function renderLabel(a: string, b: string): boolean {\n` +
      `  return a === b;\n` +
      `}\n`;
    expect(scanSecretCompareInvariant('packages/channels/src/render.ts', src)).toHaveLength(0);
  });

  it('does NOT flag a `.length !== .length` shape guard (public metadata, not the secret bytes)', () => {
    // Mirrors signature.ts verifyMetaSignature / timingSafeEqualString length pre-checks.
    const src =
      `import { createHmac, timingSafeEqual } from 'node:crypto';\n` +
      `export function verifyMetaSignature(raw: Buffer, provided: Buffer, secret: string): boolean {\n` +
      `  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'), 'hex');\n` +
      `  if (provided.length !== expected.length) return false;\n` +
      `  return timingSafeEqual(provided, expected);\n` +
      `}\n`;
    expect(scanSecretCompareInvariant('signature.ts', src)).toHaveLength(0);
  });

  it('does NOT flag `.startsWith(CONST)` where CONST is a local const-literal (SIGNATURE_PREFIX)', () => {
    const src =
      `import { createHmac } from 'node:crypto';\n` +
      `const SIGNATURE_PREFIX = 'sha256=';\n` +
      `export function verifySig(header: string, secret: string, raw: Buffer): boolean {\n` +
      `  if (!header.startsWith(SIGNATURE_PREFIX)) return false;\n` +
      `  const expected = createHmac('sha256', secret).update(raw).digest('hex');\n` +
      `  return header.slice(7) === expected ? true : false;\n` + // string vs runtime — both runtime → flagged below
      `}\n`;
    // The `.startsWith(SIGNATURE_PREFIX)` is exempt (const-literal). But `header.slice(7) === expected`
    // is two runtime values in a verification context → the invariant DOES bite here (proves the
    // const-literal exemption is scoped to the prefix check, not a blanket pass).
    const f = scanSecretCompareInvariant('signature.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifySig');
  });

  it('attributes a nested-method compare to the method, not its enclosing factory', () => {
    const src = verificationMethod(
      `      if (token !== expectedToken) throw new Error('nope');\n`,
    );
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyChallenge'); // NOT 'makeHandlers'
  });

  it('[review patch] does NOT let a same-named local const-literal in an UNRELATED function exempt a genuine compare (const-literal scope fix)', () => {
    const src =
      // Unrelated function declares its own local `token` bound to a literal — must NOT leak into verifyChallenge's scope.
      `function unrelatedHelper(): string {\n` +
      `  const token = 'placeholder';\n` +
      `  return token;\n` +
      `}\n` +
      verificationMethod(`      if (token !== expectedToken) throw new Error('nope');\n`);
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyChallenge');
  });

  it('[review patch] still exempts a genuine module-scope const-literal used across functions (SIGNATURE_PREFIX-style)', () => {
    const src =
      `const SIGNATURE_PREFIX = 'sha256=';\n` +
      `export function verifySig(header: string, expected: string): boolean {\n` +
      `  const expectedToken = expected;\n` +
      `  if (!header.startsWith(SIGNATURE_PREFIX)) return false;\n` +
      `  return timingSafeEqualString(header, expectedToken);\n` +
      `}\n`;
    expect(scanSecretCompareInvariant('signature.ts', src)).toHaveLength(0);
  });

  it('[review patch] scans a verification context written as a class constructor', () => {
    const src =
      `export class WhatsAppApp {\n` +
      `  constructor(deps: any, token: string) {\n` +
      `    const expectedToken = deps.resolveChannelSecret('name');\n` +
      `    if (token !== expectedToken) throw new Error('nope');\n` +
      `  }\n` +
      `}\n`;
    const f = scanSecretCompareInvariant('packages/channels/src/providers/whatsapp-app.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('constructor');
  });

  it('[review patch] recognizes a differently-named secret resolver matching the resolve*Secret* shape', () => {
    const src =
      `export async function verifyWebhook(deps: any, token: string): Promise<void> {\n` +
      `  const expectedToken = await deps.resolveWebhookSecret('name');\n` +
      `  if (token !== expectedToken) throw new Error('nope');\n` +
      `}\n`;
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyWebhook');
  });

  it('[review patch] recognizes a differently-named signature header matching the x-*-signature shape', () => {
    const src =
      `export async function verifyLine(request: any, token: string, expectedToken: string): Promise<void> {\n` +
      `  const sig = request.headers['x-line-signature'];\n` +
      `  if (token !== expectedToken) throw new Error('nope');\n` +
      `}\n`;
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('verifyLine');
  });

  it('[review patch] formatSecretCompareFinding mentions loose equality (==/!=) alongside the other unsafe operators', () => {
    const src = verificationMethod(`      if (token != expectedToken) throw new Error('nope');\n`);
    const f = scanSecretCompareInvariant('handlers.ts', src);
    expect(f).toHaveLength(1);
    const msg = formatSecretCompareFinding(f[0]);
    expect(msg).toContain('`==`');
    expect(msg).toContain('`!=`');
  });
});

describe('scanCompensatingAuditInvariant — AI-5-3 gate teeth (ADR-0030)', () => {
  it('FLAGS a direct `audit.writeAuditEntry` call (the H-4 shape this gate closes)', () => {
    const src =
      `export async function putWaConfig(request: any): Promise<void> {\n` +
      `  await channelConfig.upsertWaConfig(tx, body);\n` +
      `  await audit.writeAuditEntry(deps.servicePool, { action: 'pariwar.wa_config_update' });\n` +
      `}\n`;
    const f = scanCompensatingAuditInvariant('apps/api/src/modules/channel-config/handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('putWaConfig');
  });

  it('ACCEPTS a mutation routed through `audit.withCompensatingAudit` (no direct writeAuditEntry call)', () => {
    const src =
      `export async function putWaConfig(request: any): Promise<void> {\n` +
      `  return audit.withCompensatingAudit(deps.servicePool, {\n` +
      `    auditIntent: { action: 'pariwar.wa_config_update' },\n` +
      `    mutate: async () => channelConfig.upsertWaConfig(tx, body),\n` +
      `  });\n` +
      `}\n`;
    expect(
      scanCompensatingAuditInvariant('apps/api/src/modules/channel-config/handlers.ts', src),
    ).toHaveLength(0);
  });

  it('ACCEPTS a recoverable-compensation branch that calls `audit.writeRolledBackAudit` (not writeAuditEntry)', () => {
    const src =
      `export async function request(request: any): Promise<void> {\n` +
      `  return audit.withCompensatingAudit(deps.servicePool, {\n` +
      `    auditIntent,\n` +
      `    mutate: async () => {\n` +
      `      try {\n` +
      `        return await telegramOptIn.createPendingOptIn(tx, {});\n` +
      `      } catch (err) {\n` +
      `        await audit.writeRolledBackAudit(deps.servicePool, auditIntent);\n` +
      `        return recovered;\n` +
      `      }\n` +
      `    },\n` +
      `  });\n` +
      `}\n`;
    expect(
      scanCompensatingAuditInvariant('apps/api/src/modules/telegram-opt-in/handlers.ts', src),
    ).toHaveLength(0);
  });

  it('EXEMPTS the named AI-4-3(d) isolated-best-effort files entirely, even with a direct call', () => {
    const src =
      `export function createAuditPort(servicePool: any) {\n` +
      `  return async (input: any) => {\n` +
      `    try {\n` +
      `      await audit.writeAuditEntry(servicePool, input);\n` +
      `    } catch (err) {\n` +
      `      console.error(err);\n` +
      `    }\n` +
      `  };\n` +
      `}\n`;
    expect(scanCompensatingAuditInvariant('packages/channels/src/audit.ts', src)).toHaveLength(0);
    // A DIFFERENT, non-exempt file with the identical shape IS flagged — the exemption is per-file, not
    // per-shape (proves the exemption isn't accidentally matching on the "swallowed try/catch" pattern).
    expect(scanCompensatingAuditInvariant('apps/api/src/modules/some-new-module/handlers.ts', src)).toHaveLength(1);
  });

  it('formatCompensatingAuditFinding names the file, line, function, and the ADR', () => {
    const src =
      `export async function declare(request: any): Promise<void> {\n` +
      `  await audit.writeAuditEntry(deps.servicePool, { action: 'pariwar.degraded_mode.declared' });\n` +
      `}\n`;
    const f = scanCompensatingAuditInvariant('apps/api/src/modules/degraded-mode/handlers.ts', src);
    expect(f).toHaveLength(1);
    const msg = formatCompensatingAuditFinding(f[0]);
    expect(msg).toContain('apps/api/src/modules/degraded-mode/handlers.ts');
    expect(msg).toContain('declare');
    expect(msg).toContain('withCompensatingAudit');
    expect(msg).toContain('ADR-0030');
  });
});

describe('AI-6-1 — claim-surface scope extension (compensating-audit invariant has meaningful coverage)', () => {
  it('FLAGS a bare `audit.writeAuditEntry` on a claim handler (the future regression this scope-extension catches)', () => {
    const src =
      `export async function record(request: any): Promise<void> {\n` +
      `  await audit.writeAuditEntry(deps.servicePool, { action: 'claim.dpdpa_consent_recorded' });\n` +
      `}\n`;
    const f = scanCompensatingAuditInvariant('apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('record');
  });

  it('ACCEPTS the consent path routed through `audit.withCompensatingAudit`', () => {
    const src =
      `export async function record(request: any): Promise<void> {\n` +
      `  return audit.withCompensatingAudit(deps.servicePool, {\n` +
      `    action: 'claim.dpdpa_consent_recorded',\n` +
      `    mutate: async () => persistConsent(request),\n` +
      `  });\n` +
      `}\n`;
    expect(
      scanCompensatingAuditInvariant('apps/api/src/modules/claims/claims.dpdpa-consent.handlers.ts', src),
    ).toHaveLength(0);
  });

  it('ACCEPTS the claim post-commit sink pattern (`emitAuthAudit`, not `audit.writeAuditEntry`) — no exemption needed', () => {
    const src =
      `export async function schedule(request: any): Promise<void> {\n` +
      `  await runCommittedScopeTx(request);\n` +
      `  emitAuthAudit(deps, request, 'admin_ground_inspection.scheduled', { context });\n` +
      `}\n`;
    expect(
      scanCompensatingAuditInvariant('apps/api/src/modules/claims/claims.ground-inspection.handlers.ts', src),
    ).toHaveLength(0);
  });
});
