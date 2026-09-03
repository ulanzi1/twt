// The PURE nominee-bank public-presentation projection — Story 11b.3a (Task 1, Task 2; AC3, AC4).
//
// Governance of record: `2026-08-28-160` **cl.10(a)–(g)** (Trustee-ratified) · `2026-08-28-165`
// **cl.2** (masking is presentation; the fields stay Tier-1) · `2026-09-02-179` **cl.1**
// (`D8-default` FAIL-OPEN) · `2026-09-02-183` **cl.4** (the third setting's reading).
//
// ── ⛔⛔ WHAT THIS MODULE IS NOT ────────────────────────────────────────────────────────────────
// ⛔ It is NOT a member-access control. `2026-08-28-160` **cl.10(f)** rules this a PUBLIC-PRESENTATION
// control in terms, and says it must ⛔ not prevent a SUSPENDED member from reaching what they need
// in order to contribute and regain active status. ⇒ ⛔⛔ **NO predicate here may ever read
// `members.state`, `is_valid`, a moderation overlay, or any lifecycle label.** The input shape below
// is the mechanism: it is never handed a member to branch on, so such a conjunct cannot be added
// without changing a type that a test asserts. A masking check that grows a member-state conjunct is
// Story 10.10's `is_valid: false` defect wearing a new costume — the one that silently made every
// suspension a de-facto permanent ban with every CI gate green
// ([[project_moderation_model_correct_course]], [[project_assignability_predicate_is_isvalid_only]]).
//
// ⛔ It is NOT a deletion, an overwrite or a re-encrypt. **cl.10(g)**: complete bank details remain
// available in the PROTECTED INTERNAL RECORD. Masking is a PROJECTION over a value that is read,
// decrypted and then reduced at the API boundary — the stored row is untouched, always.
//
// ⛔ It does NOT create a second PII tier. **`-165` cl.2**, BigDev verbatim: *"Do not create a
// separate Tier-1 classification merely because the public projection is masked. The underlying
// account fields remain Tier-1."* ⇒ the four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries cover BOTH
// states and the masked projection needs ⛔ none of its own. ⭐ And the specific future argument is
// FORECLOSED: *"the masked view is only last-4, so it isn't really Tier-1."* ⛔ It is.
//
// PURE: no db, no clock, no env, no fs. `now` is injected so a caller pins ONE instant per request.

/**
 * The three ruled settings of `2026-08-28-160` **cl.10(c)**, as ONE value.
 *
 * ⛔⛔ **NEVER A BOOLEAN, AND THAT IS A RULING RATHER THAN A PREFERENCE.** cl.10(d): policy must move
 * *full public disclosure → shorter post-campaign exposure → immediate masking → permanent masked
 * presentation* ⛔ **without redesigning the underlying bank-detail record** and ⛔ **without a schema
 * change** ⇒ *"**configuration over one record**, ⛔ never a second record and ⛔ never a boolean. A
 * later 'simplification' to a boolean is a **defect**, not a cleanup."*
 *
 * ⚠ `after_days: 0` is cl.10(c)'s *"mask immediately"*, and it is **a value an admin chose** — ⛔ not
 * a default the code assumes, which **cl.10(b)** forbids in terms. The code's no-row behaviour is
 * `null` ⇒ FAIL-OPEN (see {@link isNomineeBankMasked}).
 */
export type NomineeBankMaskingSetting =
  | {
      /** Masked once `maskAfterDays` have elapsed since the drive's close/settle instant. */
      readonly mode: 'after_days';
      /** ⭐ `0` = cl.10(c)'s *"mask immediately"*. Whole days, `0 … MAX`, ⛔ never negative. */
      readonly maskAfterDays: number;
    }
  | {
      /**
       * cl.10(d)'s **TERMINAL RUNG** — masked in EVERY state, ⭐ including while the drive is still
       * collecting. ⚠⛔ **AN AUTHORING READING (`2026-09-02-183` cl.4), ⛔ NOT A PANEL RULING**, and
       * routed for Panel confirmation at `deferred-work.md`.
       *
       * ⭐ The ground: cl.10(d)'s ladder is STRICTLY TIGHTENING at every step. Rung 1 is the absence
       * of a row (FAIL-OPEN), rungs 2 and 3 are `after_days: N` and `after_days: 0` — so rung 4 is
       * only tighter than rung 3 if it ALSO covers the active campaign. Read as a fourth post-close
       * offset, *"permanent masking"* and *"0 days"* are the SAME projection and one of the Panel's
       * three settings ships as a synonym of another.
       * ⚠ cl.10(a) is not contradicted: complete details *"**may** be publicly displayed"* — a
       * PERMISSION, ⛔ not a mandate. A Trust on the terminal rung has exercised (b)/(c)/(d).
       * ⛔ Do ⛔ not "simplify" this into `after_days: 0`; a test asserts the two differ on a LIVE drive.
       */
      readonly mode: 'permanent';
    };

/** The `mode` discriminator's value domain — the one spelling authority (the pgEnum reads it). */
export const NOMINEE_BANK_MASKING_MODES = ['after_days', 'permanent'] as const;
export type NomineeBankMaskingMode = (typeof NOMINEE_BANK_MASKING_MODES)[number];

/**
 * The digits cl.10(e) says the masked projection RETAINS. ⛔ Not a tuning knob: the clause names the
 * number, so changing it is a Panel act.
 */
export const MASKED_ACCOUNT_NUMBER_VISIBLE_DIGITS = 4;

/**
 * A DATA-SANITY ceiling on `maskAfterDays` (100 years), ⛔ not a policy ceiling.
 *
 * ⚠ It exists for one reason: an admin typo of `999999999` would be de-facto permanence entered by
 * accident, on the one control where the difference between *"visible for a while"* and *"visible
 * forever"* is the whole subject. A Trust that wants permanence has a setting for it. Mirrors the
 * `pool_fixed_amount_schedule_amount_max` guard-rail's posture; kept IN SYNC with the DB CHECK.
 */
export const MAX_NOMINEE_BANK_MASK_AFTER_DAYS = 36500;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * cl.10(e)'s DEFINED projection of the account number: **the last four digits, and nothing else**.
 *
 * ⭐ Returns the DIGITS ALONE — ⛔ never a pre-formatted `••••1234` string. The framing (*"Account
 * ending in 1234"*) is the render layer's localised copy, which is what lets assistive tech announce
 * the value as ONE coherent field instead of reading a bare truncated string digit by digit (AC4).
 *
 * ⛔ **`null` WHEN THERE ARE FOUR OR FEWER DIGITS**, and that boundary is the clause rather than
 * defensiveness: at exactly four digits *"the last four"* IS the complete account number, and
 * cl.10(e) says the complete number is ⛔ NOT exposed after masking. The caller renders NOTHING for a
 * `null` — ⛔ no placeholder, ⛔ no *"not available"* marker (an omission that announces itself is an
 * enumeration signal, and this is the most sensitive surface in the epic).
 *
 * ⚠ Separators the filer typed are ignored: the subject is DIGITS, so `1234 5678 9012` and
 * `1234-5678-9012` both yield `9012`.
 */
export function maskAccountNumberLast4(accountNumber: string): string | null {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= MASKED_ACCOUNT_NUMBER_VISIBLE_DIGITS) return null;
  return digits.slice(-MASKED_ACCOUNT_NUMBER_VISIBLE_DIGITS);
}

/**
 * The masking predicate's whole input.
 *
 * ⛔⛔ **THERE IS DELIBERATELY NO MEMBER HANDLE ON THIS SHAPE** — see the module header on cl.10(f).
 * The three keys are the drive's own facts plus the request instant. ⛔ Do not add a fourth that
 * describes a person.
 */
export interface NomineeBankMaskingInput {
  /**
   * The Pariwar's effective schedule setting, or `null` when ⛔ **no schedule row is in force**.
   *
   * ⭐ `null` ⇒ **NOT MASKED** — `D8-default` RULED **FAIL-OPEN** by the Trustee Panel
   * (`2026-09-02-179` cl.1): a Pariwar with no schedule keeps its details visible until the Trust
   * sets a window. ⛔ Do ⛔ **not** default to masked — that makes immediate masking the code's
   * assumption, which cl.10(b) forbids in terms.
   * ⚠⛔ AND THE COST IS PART OF THE RULING: `-178` put authority CENTRALLY, so a Pariwar cannot set
   * its own window ⇒ fail-open governs EVERY Pariwar until the Trust acts, and what stays exposed is
   * a FULL ACCOUNT NUMBER. The Panel ruled it with that in front of them.
   */
  readonly setting: NomineeBankMaskingSetting | null;
  /**
   * The instant the window is measured from — the drive's **EARLIEST** close/settle event, or `null`
   * while it is still collecting.
   *
   * ⚠ cl.10(c) configures the window **from campaign closure/settlement**, so with no close instant
   * a `days` setting has nothing to measure from and cl.10(a) governs.
   * ⚠⛔ **FED BY `DRIVE_MASKING_FROM`, ⛔ NEVER BY `DRIVE_CLOSED_AT`** — the latter takes the LATEST
   * such event, so a late `pool.settled` would move this forward and UN-MASK an already-masked drive.
   * See that fragment's doc-block (second-pass review, 2026-09-03).
   */
  readonly driveClosedAt: Date | null;
  /**
   * The drive's lifecycle state, as the read projected it.
   *
   * ⭐ A DRIVE FACT, ⛔ NOT A MEMBER HANDLE — the module header's cl.10(f) prohibition is untouched:
   * this describes the CAMPAIGN, never a person, so no `members.state` / `is_valid` / moderation
   * conjunct becomes reachable through it. ⛔ Do not widen it into one.
   *
   * ⚠ It exists for ONE anomaly: a pool whose `current_state` is `closed`/`settled` while its stream
   * carries no close/settle event (the already-flagged data anomaly the Sahyog Vivran read names, and
   * also how direct state writes under `app.pool_state_writer='on'` create fixtures). Without it,
   * `driveClosedAt === null` on such a drive reads as *"still collecting"* and an ARCHIVED drive
   * publishes complete bank details indefinitely under every `after_days` setting.
   *
   * ⛔ It is consulted ONLY on that anomaly branch. On every ordinary path the instant decides, so this
   * key can ⛔ never widen the predicate into a state machine.
   */
  readonly driveState: NomineeBankMaskingDriveState;
  /** The request's ONE as-of instant. ⛔ Never `new Date()` inside this module. */
  readonly now: Date;
}

/**
 * The drive states this predicate distinguishes — the INTERNAL pool vocabulary.
 *
 * ⭐ Only `live` is load-bearing: every other value means *"the campaign is over"*, which is the half
 * cl.10(c)'s window turns on. ⚠⛔ **The internal token, ⛔ deliberately NOT the public one**
 * (`collecting` / `active` / `archive`) — this is a domain predicate and the public vocabulary is a
 * WIRE concern that `2026-08-21-144` cl.8 keeps on the other side of the boundary. ⛔ Nothing here is
 * ever serialized, so the internal spelling is the correct one and re-spelling it in public tokens
 * would couple a pure predicate to a render decision.
 */
export type NomineeBankMaskingDriveState = 'live' | 'closed' | 'settled';

/**
 * Is the nominee bank detail MASKED for the public, at `now`?
 *
 * ⭐ Four answers, one per rung of cl.10(d)'s ladder:
 *   · ⛔ no row              → `false` (FAIL-OPEN, `-179` cl.1)
 *   · `after_days: N`, N > 0 → `false` until `closedAt + N days`, `true` from then on
 *   · `after_days: 0`        → `true` from the close instant, inclusive
 *   · `permanent`            → `true` always (`-183` cl.4 — an authoring reading)
 *
 * ⚠ Plus ONE anomaly answer, ⛔ not a fifth rung: a CONFIGURED Pariwar whose drive is no longer
 * `collecting` but carries no close/settle instant masks. See the branch itself for why its position
 * below the fail-open rung is what keeps cl.10(b) intact.
 *
 * @throws {RangeError} on a `maskAfterDays` that is not a whole number in `0 … MAX`. ⛔ A nonsense
 *   window must fail LOUDLY rather than resolve to whichever side the arithmetic lands on — on this
 *   control the two sides are *"a full account number is public"* and *"it is not"*. The DB CHECK is
 *   the other half of the same guard; this one bites a value assembled in process.
 */
export function isNomineeBankMasked(input: NomineeBankMaskingInput): boolean {
  const { setting, driveClosedAt, driveState, now } = input;

  // Rung 1 — the ruled default. ⛔ Never flipped to fail-closed "for safety": cl.10(b) forbids it.
  if (setting === null) return false;

  // Rung 4 — the terminal rung, ⛔ NOT a synonym for `after_days: 0`. See the type's own doc-block.
  if (setting.mode === 'permanent') return true;

  const { maskAfterDays } = setting;
  if (
    !Number.isInteger(maskAfterDays) ||
    maskAfterDays < 0 ||
    maskAfterDays > MAX_NOMINEE_BANK_MASK_AFTER_DAYS
  ) {
    throw new RangeError(
      `nominee-bank masking: maskAfterDays must be a whole number of days in ` +
        `0…${String(MAX_NOMINEE_BANK_MASK_AFTER_DAYS)}, got ${String(maskAfterDays)}. ` +
        `⛔ Do not coerce it — on this control the two outcomes are "a full account number is ` +
        `public" and "it is not".`,
    );
  }

  // Rungs 2 and 3 — measured FROM closure/settlement (cl.10(c)).
  if (driveClosedAt === null) {
    // ⭐⭐ THE ANOMALY BRANCH, AND ⛔⛔ ITS POSITION IS LOAD-BEARING (second-pass review, 2026-09-03).
    //
    // A drive that is NOT collecting but has no close/settle instant is the data anomaly the Sahyog
    // Vivran read names. Reading it as "still collecting" is FAIL-OPEN in the one direction that
    // cannot be undone: an archived drive would publish a complete account number forever, on a
    // Pariwar that had explicitly configured `after_days: 0`. So the campaign being over is enough.
    //
    // ⚠⛔ THIS BRANCH SITS *BELOW* THE `setting === null` RUNG AND MUST STAY THERE. It fires ONLY for
    // a Pariwar that has ALREADY CHOSEN a window — the unconfigured default returned `false` above and
    // never reaches here. That ordering is what keeps cl.10(b) intact: the code is ⛔ not assuming
    // immediate masking, it is honouring a setting whose measuring-point is missing. ⛔ Moving this
    // above rung 1 would make masking the default for every unconfigured Pariwar and REVERSE a
    // ratified ruling (`2026-09-02-179` cl.1, D8-default FAIL-OPEN) by way of a line move.
    return driveState !== 'live';
  }
  return now.getTime() >= driveClosedAt.getTime() + maskAfterDays * MS_PER_DAY;
}
