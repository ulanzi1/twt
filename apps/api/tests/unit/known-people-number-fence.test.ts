// Story 6.36b (AC4, I4; AC6) — ⛔ NO NUMBER in a log, an audit line or an alarm; ⛔ NO message sent — fenced in code.
//
// The people-who-know-me handlers and domain receive phone numbers (`numbers`, `mobile`) and their normalised forms
// (`canonical`, `normalised`, `distinct`) and blind indexes (`namedIndex`, `indexes`). This fence (the
// `apps/jobs/tests/staff-email-identity-read-fence.test.ts` shape — comments stripped, an EXACT allow-list, a positive
// control) holds two rules over the module files:
//   (1) every log / audit / alarm CALL (`*.log.<level>(`, `console.<level>(`, `emitAuthAudit(`, `auditHook(`,
//       `writeAuditEntry(`, `*alarm*(`) is on an EXACT allow-list of (file, callee) counts, and ⛔ one's arguments name a
//       number-bearing identifier;
//   (2) ⛔ a messaging path — `@twt/channels`, `dispatch(`, a notifier, an SMS / push / WhatsApp sender (AC6: the request
//       is shown in the app ONLY);
//   (3) ⛔ a thrown error's MESSAGE names a number-bearing identifier (`new …Error(` / `super(` — its CODE, string
//       literals dropped: a message is text, its `${…}` is what reaches a log).
// ⭐ Review round 2 (P14) widened it: the batch blind-index path and the member-field helpers that HOLD the plaintext
// numbers are fenced too, the identifier list names `raw`, `entries`, `plaintext(s)`, `canonicals` and `digits`, and
// rule (3) is new.
// ⭐ POSITIVE CONTROL: a planted violation of each rule IS caught; a COMMENTED plant is ⛔.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const FILES = [
  'apps/api/src/modules/known-people/handlers.ts',
  'apps/api/src/modules/known-people/index.ts',
  'apps/api/src/modules/known-people/names.ts',
  'apps/api/src/modules/known-people/routes.ts',
  'packages/domain/src/member/known-people.ts',
  'packages/domain/src/encryption/blind-index.ts',
  'packages/domain/src/encryption/member-fields.ts',
] as const;

/** The callees that write a log line, an audit line or an alarm. */
const SINK_CALL = /\b((?:request\.)?log(?:ger)?\.(?:trace|debug|info|warn|error|fatal)|console\.(?:log|info|warn|error|debug)|emitAuthAudit|auditHook\??\.?|writeAuditEntry|\w*[aA]larm\w*)\s*\(/g;
/** Identifiers that carry a number (or its HMAC) in these files. */
const NUMBER_BEARING = /\b(numbers|mobile|canonicals?|normalised|distinct|namedIndex|indexes|body|raw|entries|plaintexts?|digits)\b/;
/** A thrown error's construction (rule 3). */
const ERROR_CALL = /\b(?:new\s+)?(?:[\w$]+\.)*[\w$]*(?:Error|Refused)\s*\(|\bsuper\s*\(/g;
/** A messaging path (AC6). */
const MESSAGING = /@twt\/channels|\bdispatch\s*\(|[nN]otifier\b|\bsendSms\b|\bstepUpDelivery\b|\bwhatsapp\b|\bpushNotification|\bexpo-server-sdk\b/i;

/** The EXACT allow-list: `<file>:<callee>` → how many such calls. A new sink call is a reviewed edit here. */
const SINK_ALLOWLIST: Record<string, number> = {
  'apps/api/src/modules/known-people/handlers.ts:emitAuthAudit': 5,
  'apps/api/src/modules/known-people/handlers.ts:request.log.error': 1,
  'apps/api/src/modules/known-people/names.ts:log.warn': 1,
  'packages/domain/src/encryption/blind-index.ts:auditHook': 2,
};

/** The CODE of an argument list — string literals dropped, a template literal reduced to its `${…}` expressions. */
function codeOnly(args: string): string {
  // Template literals FIRST (an apostrophe inside one — `don't ${raw}` — must ⛔ swallow its `${…}`), then quoted strings.
  return args
    .replace(/`((?:[^`\\]|\\.)*)`/g, (_m, body: string) => (body.match(/\$\{[^}]*\}/g) ?? []).join(' '))
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
}

/** The argument text of the call whose `(` is at `open` (balanced parentheses). */
function argsAt(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return code.slice(open + 1);
}

/** ⭐ ONE checker for the fence and its positive control. */
function check(files: ReadonlyMap<string, string>): { violations: string[]; sinks: Record<string, number> } {
  const violations: string[] = [];
  const sinks: Record<string, number> = {};
  for (const [file, src] of files) {
    const code = stripComments(src);
    for (const m of code.matchAll(SINK_CALL)) {
      const callee = m[1]!.replace(/\?\.?$/, '');
      const key = `${file}:${callee}`;
      sinks[key] = (sinks[key] ?? 0) + 1;
      const args = argsAt(code, m.index! + m[0].length - 1);
      const hit = NUMBER_BEARING.exec(args);
      if (hit) violations.push(`number-in-sink:${key}:${hit[1]!}`);
    }
    const msg = MESSAGING.exec(code);
    if (msg) violations.push(`messaging:${file}:${msg[0]}`);
    for (const m of code.matchAll(ERROR_CALL)) {
      const hit = NUMBER_BEARING.exec(codeOnly(argsAt(code, m.index! + m[0].length - 1)));
      if (hit) violations.push(`number-in-error:${file}:${hit[1]!}`);
    }
  }
  for (const [key, n] of Object.entries(sinks)) if (SINK_ALLOWLIST[key] !== n) violations.push(`unlisted-sink:${key}=${String(n)}`);
  for (const key of Object.keys(SINK_ALLOWLIST)) if (!(key in sinks)) violations.push(`stale-allowlist:${key}`);
  return { violations, sinks };
}

describe('⛔ Story 6.36b — no number in a log / audit / alarm; no message sent (AC4, AC6)', () => {
  const tree = new Map<string, string>(FILES.map((f) => [f, readFileSync(path.join(repoRoot, f), 'utf-8')]));

  it('⭐ the real files have ⛔ violation, and the sink allow-list is EXACT', () => {
    const { violations, sinks } = check(tree);
    expect(violations).toEqual([]);
    expect(sinks).toEqual(SINK_ALLOWLIST);
  });

  it('⭐ POSITIVE CONTROL — a planted number in a log / audit / alarm, a new sink, a messaging path ARE caught; a commented plant is ⛔', () => {
    const plant = (file: string, extra: string) => {
      const copy = new Map(tree);
      copy.set(file, `${copy.get(file) ?? ''}\n${extra}\n`);
      return check(copy).violations;
    };
    const H = 'apps/api/src/modules/known-people/handlers.ts';
    const D = 'packages/domain/src/member/known-people.ts';
    expect(plant(H, "request.log.error({ n: body.numbers.length, first: body.numbers[0] }, 'x');")).toEqual(
      expect.arrayContaining(['number-in-sink:apps/api/src/modules/known-people/handlers.ts:request.log.error:body']),
    );
    expect(plant(H, "emitAuthAudit(deps, request, 'member_known_people.asked', { context: { mobile } });")).toEqual(
      expect.arrayContaining(['number-in-sink:apps/api/src/modules/known-people/handlers.ts:emitAuthAudit:mobile']),
    );
    expect(plant(D, 'console.warn(normalised.distinct);')).toEqual(
      expect.arrayContaining([expect.stringMatching(/^number-in-sink:packages\/domain\/src\/member\/known-people\.ts:console\.warn:/)]),
    );
    expect(plant(D, 'raiseAlarm({ indexes });')).toEqual(expect.arrayContaining([expect.stringMatching(/raiseAlarm:indexes$/)]));
    expect(plant(H, "request.log.info('a new line');")).toContain('unlisted-sink:apps/api/src/modules/known-people/handlers.ts:request.log.info=1');
    expect(plant(H, "import { dispatch } from '@twt/channels';")).toEqual(expect.arrayContaining([expect.stringMatching(/^messaging:/)]));
    expect(plant(H, 'await deps.helpdeskReplyNotifier.notify(x);')).toEqual(expect.arrayContaining([expect.stringMatching(/^messaging:/)]));
    // review round 2 (P14): a number in a thrown error's message; the newly fenced batch path; the widened identifiers
    expect(plant(D, 'throw new Error(`bad entry ${raw}`);')).toEqual(expect.arrayContaining(['number-in-error:packages/domain/src/member/known-people.ts:raw']));
    expect(plant(D, 'throw new KnownPeopleChargeRefused(canonical);')).toEqual(expect.arrayContaining([expect.stringMatching(/number-in-error:.*:canonical$/)]));
    expect(plant('packages/domain/src/encryption/blind-index.ts', "kms.auditHook?.('computeHmac', ref, { plaintexts });")).toEqual(
      expect.arrayContaining(['number-in-sink:packages/domain/src/encryption/blind-index.ts:auditHook:plaintexts']),
    );
    expect(plant(D, "throw new Error('one index per distinct number');")).toEqual([]); // words in a message are ⛔ identifiers
    expect(plant(D, 'throw Error(`bad ${mobile}`);')).toEqual(expect.arrayContaining([expect.stringMatching(/number-in-error:.*:mobile$/)])); // ⛔ `new` needed
    expect(plant(D, "throw new Error(`don't ${raw} won't`);")).toEqual(expect.arrayContaining([expect.stringMatching(/number-in-error:.*:raw$/)]));
    expect(plant(H, '// request.log.error({ mobile });')).toEqual([]);
    expect(plant(H, '/* emitAuthAudit(deps, request, x, { context: { numbers } }) */')).toEqual([]);
  });
});
