// Golden-INPUT generator — Story 9.2 (Task 3). AUTHORING TOOL (run once / on matrix change).
//
// Authors the 50-case-per-bank coverage MATRIX (AC2) as native-format `.csv` inputs under
// `bihar/<bank>/golden/`. The matrix is defined ONCE here (a shared set of logical
// transactions across the AC2 axes) and rendered into each bank's native columns + date
// format — so all 5 banks get parity coverage and the matrix is reviewable in one place
// (feedback_gate_scope_semantic_coverage: 50 = a coverage matrix, not padding).
//
// Synthetic data ONLY — no real member PII (Task 3). Deterministic (no randomness) so the
// corpus is a fixed regression baseline. This writes the INPUTS; `regen-golden.ts` derives
// the `.expected.json` from the parser output.
//
//   Run:  pnpm --filter @twt/bank-parsers exec tsx scripts/gen-golden-inputs.ts

import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Logical transaction model (bank-agnostic) ─────────────────────────────────

type Direction = 'credit' | 'debit';
type Broken = 'short' | 'blankRow' | 'badDate' | 'noAmount';

interface Txn {
  isoDate: string;
  narration: string;
  ref: string; // ref/UTR column value ('' = none)
  dir: Direction;
  amount: string; // native rupee string in the amount column
  balance: string;
  broken?: Broken;
}

type Encoding = 'utf8' | 'utf8-bom' | 'latin1';

interface GoldenCase {
  label: string; // kebab; becomes NN-<label>.csv
  txns: Txn[];
  encoding?: Encoding; // default utf8
}

// ── Txn builders ──────────────────────────────────────────────────────────────

const credit = (
  isoDate: string,
  name: string,
  utr: string,
  vpa: string,
  amount: string,
  balance: string,
  ref = utr,
): Txn => ({
  isoDate,
  narration: `UPI/CR/${utr}/${name}/${vpa}/Contribution`,
  ref,
  dir: 'credit',
  amount,
  balance,
});

const debit = (isoDate: string, payee: string, utr: string, amount: string, balance: string): Txn => ({
  isoDate,
  narration: `UPI/DR/${utr}/${payee}/${payee.toLowerCase().replace(/ /g, '')}@okaxis/Transfer`,
  ref: utr,
  dir: 'debit',
  amount,
  balance,
});

const reversal = (isoDate: string, utr: string, amount: string, balance: string): Txn => ({
  isoDate,
  narration: `UPI/REVERSAL/${utr}/Failed txn refund`,
  ref: utr,
  dir: 'credit',
  amount,
  balance,
});

const charge = (isoDate: string, feeType: string, amount: string, balance: string): Txn => ({
  isoDate,
  narration: `${feeType} CHARGES GST`,
  ref: '',
  dir: 'debit',
  amount,
  balance,
});

// ── The 50-case matrix ─────────────────────────────────────────────────────────

function buildMatrix(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  // 1) Standard credits — the happy path the matcher confirms (8).
  const names = [
    ['RAM KUMAR', 'ram@oksbi'],
    ['SITA DEVI', 'sita@okhdfcbank'],
    ['MOHAN LAL', 'mohan@okicici'],
    ['GEETA SINGH', 'geeta@okaxis'],
    ['AJAY VERMA', 'ajay@oksbi'],
    ['PRIYA SHARMA', 'priya@okhdfcbank'],
    ['VIKAS GUPTA', 'vikas@okicici'],
    ['NEHA YADAV', 'neha@okaxis'],
  ];
  names.forEach(([name, vpa], i) => {
    const day = String(i + 1).padStart(2, '0');
    const utr = `1000000000${String(i + 10)}`.slice(0, 12);
    cases.push({
      label: `standard-credit-${i + 1}`,
      txns: [credit(`2026-02-${day}`, name!, utr, vpa!, '500.00', `${(i + 1) * 500}.00`)],
    });
  });

  // 2) Debits / transfers (6).
  for (let i = 0; i < 6; i++) {
    const day = String(i + 1).padStart(2, '0');
    const utr = `2000000000${String(i + 10)}`.slice(0, 12);
    cases.push({
      label: `debit-transfer-${i + 1}`,
      txns: [debit(`2026-03-${day}`, `PAYEE ${i + 1}`, utr, '750.00', `${10000 - i * 750}.00`)],
    });
  }

  // 3) Reversals / refunds (5) — exercise `entry_type: reversal`.
  for (let i = 0; i < 5; i++) {
    const day = String(i + 1).padStart(2, '0');
    const utr = `3000000000${String(i + 10)}`.slice(0, 12);
    cases.push({
      label: `reversal-${i + 1}`,
      txns: [reversal(`2026-04-${day}`, utr, '500.00', `${5000 + i * 500}.00`)],
    });
  }

  // 4) Charges / fees (5) — exercise `entry_type: charge`.
  const fees = ['SMS', 'ATM', 'AMC', 'NEFT', 'IMPS'];
  fees.forEach((fee, i) => {
    const day = String(i + 1).padStart(2, '0');
    cases.push({
      label: `charge-${fee.toLowerCase()}`,
      txns: [charge(`2026-05-${day}`, fee, `${(i + 1) * 5}.00`, `${9000 - i * 25}.00`)],
    });
  });

  // 5) Multi-day batches (4) — date rollover + ordering + mixed types in one file.
  for (let b = 0; b < 4; b++) {
    const base = 10 + b * 3;
    const txns: Txn[] = [
      credit(`2026-06-${String(base).padStart(2, '0')}`, 'BATCH PAYER A', `4000000000${base}`.slice(0, 12), 'a@oksbi', '500.00', '5500.00'),
      charge(`2026-06-${String(base + 1).padStart(2, '0')}`, 'SMS', '5.00', '5495.00'),
      credit(`2026-06-${String(base + 2).padStart(2, '0')}`, 'BATCH PAYER B', `4000000000${base + 2}`.slice(0, 12), 'b@okaxis', '500.00', '5995.00'),
    ];
    cases.push({ label: `multi-day-batch-${b + 1}`, txns });
  }

  // 6) Encoding variants (3) — decode robustness.
  cases.push({
    label: 'encoding-utf8-devanagari',
    encoding: 'utf8',
    txns: [credit('2026-07-01', 'राम कुमार', '500000000011', 'ram@oksbi', '500.00', '5000.00')],
  });
  cases.push({
    label: 'encoding-utf8-bom',
    encoding: 'utf8-bom',
    txns: [credit('2026-07-02', 'BOM PAYER', '500000000012', 'bom@oksbi', '500.00', '5500.00')],
  });
  cases.push({
    label: 'encoding-latin1',
    encoding: 'latin1',
    txns: [credit('2026-07-03', 'JOSÉ FERNANDES', '500000000013', 'jose@oksbi', '500.00', '6000.00')],
  });

  // 7) Partial / malformed rows (6) — graceful degradation (skip-with-record or null field).
  cases.push({
    label: 'partial-missing-utr',
    txns: [{ isoDate: '2026-08-01', narration: 'UPI/CR/CASH DEPOSIT/no reference', ref: '', dir: 'credit', amount: '500.00', balance: '5000.00' }],
  });
  cases.push({
    label: 'partial-missing-vpa',
    txns: [{ isoDate: '2026-08-02', narration: 'NEFT/600000000011/RAM KUMAR', ref: '600000000011', dir: 'credit', amount: '500.00', balance: '5500.00' }],
  });
  cases.push({
    label: 'partial-bad-date',
    txns: [{ isoDate: 'NOTADATE', narration: 'UPI/CR/600000000012/BAD DATE', ref: '600000000012', dir: 'credit', amount: '500.00', balance: '6000.00', broken: 'badDate' }],
  });
  cases.push({
    label: 'partial-no-amount',
    txns: [{ isoDate: '2026-08-04', narration: 'INFO ROW NO AMOUNT', ref: '', dir: 'credit', amount: '', balance: '6000.00', broken: 'noAmount' }],
  });
  cases.push({
    label: 'partial-blank-row',
    txns: [{ isoDate: '', narration: '', ref: '', dir: 'credit', amount: '', balance: '', broken: 'blankRow' }],
  });
  cases.push({
    label: 'partial-short-row',
    txns: [{ isoDate: '2026-08-06', narration: 'TRUNCATED ROW', ref: '', dir: 'credit', amount: '500.00', balance: '6500.00', broken: 'short' }],
  });

  // 8) Formula-injection cells (4) — preserved VERBATIM in raw_row, NEVER interpreted.
  for (const [i, prefix] of ['=', '+', '-', '@'].entries()) {
    const day = String(i + 1).padStart(2, '0');
    cases.push({
      label: `formula-injection-${prefix === '=' ? 'eq' : prefix === '+' ? 'plus' : prefix === '-' ? 'minus' : 'at'}`,
      txns: [{ isoDate: `2026-09-0${i + 1}`, narration: `${prefix}HYPERLINK("http://evil")`, ref: `700000000${day}0`.slice(0, 12), dir: 'credit', amount: '500.00', balance: `${7000 + i * 500}.00` }],
    });
  }

  // 9) Amount-format variants (5) — thousands / currency / paise / Indian grouping.
  const amountFmts: [string, string][] = [
    ['amount-thousands', '1,000.00'],
    ['amount-currency-rupee', '₹1500.00'],
    ['amount-currency-rs', 'Rs. 2000.50'],
    ['amount-paise', '250.75'],
    ['amount-indian-grouping', '1,00,000.00'],
  ];
  amountFmts.forEach(([label, amount], i) => {
    const day = String(i + 1).padStart(2, '0');
    cases.push({
      label,
      txns: [credit(`2026-10-${day}`, 'FORMAT PAYER', `800000000${day}0`.slice(0, 12), 'fmt@oksbi', amount, '99999.00')],
    });
  });

  // 10) Duplicate rows (2) — same row twice; must round-trip to DISTINCT entry_ids (rowIndex).
  for (let i = 0; i < 2; i++) {
    const utr = `900000000${String(i + 10)}`.slice(0, 12);
    const row = credit(`2026-11-0${i + 1}`, 'DUP PAYER', utr, 'dup@oksbi', '500.00', '5000.00');
    cases.push({ label: `duplicate-rows-${i + 1}`, txns: [row, { ...row }] });
  }

  // 11) Whitespace / empty-narration edge (2).
  cases.push({
    label: 'whitespace-padded-cells',
    txns: [{ isoDate: '2026-12-01', narration: '  UPI/CR/910000000011/PADDED NAME/pad@oksbi  ', ref: '  910000000011  ', dir: 'credit', amount: '  500.00  ', balance: '  5000.00  ' }],
  });
  cases.push({
    label: 'empty-narration',
    txns: [{ isoDate: '2026-12-02', narration: '', ref: '910000000012', dir: 'credit', amount: '500.00', balance: '5500.00' }],
  });

  return cases;
}

// ── Per-bank rendering ──────────────────────────────────────────────────────────

interface BankFmt {
  bank: string;
  header: string[];
  formatDate: (iso: string) => string;
  renderRow: (t: Txn) => string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function iso(t: Txn): { y: string; m: string; d: string } {
  const [y, m, d] = t.isoDate.split('-');
  return { y: y ?? '', m: m ?? '', d: d ?? '' };
}

const ddmmyyyy = (i: string) => {
  if (i === 'NOTADATE' || !i) return i;
  const { y, m, d } = iso({ isoDate: i } as Txn);
  return `${d}/${m}/${y}`;
};
const ddmmyyyyDash = (i: string) => {
  if (i === 'NOTADATE' || !i) return i;
  const { y, m, d } = iso({ isoDate: i } as Txn);
  return `${d}-${m}-${y}`;
};
const ddMmmYyyy = (i: string) => {
  if (i === 'NOTADATE' || !i) return i;
  const { y, m, d } = iso({ isoDate: i } as Txn);
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
};
const isoDate = (i: string) => i;
const ddmmyy = (i: string) => {
  if (i === 'NOTADATE' || !i) return i;
  const { y, m, d } = iso({ isoDate: i } as Txn);
  return `${d}/${m}/${y.slice(2)}`;
};

/** Strategy A row (separate debit/credit): [date, narration, ref, debit, credit, balance]. */
function rowAB(t: Txn, formatDate: (i: string) => string, withValueDate: boolean): string[] {
  const date = formatDate(t.isoDate);
  const debit = t.dir === 'debit' ? t.amount : '';
  const creditAmt = t.dir === 'credit' ? t.amount : '';
  if (t.broken === 'blankRow') return withValueDate ? ['', '', '', '', '', '', ''] : ['', '', '', '', '', ''];
  if (t.broken === 'short') return withValueDate ? [date, date, t.narration] : [date, t.narration];
  const noAmt = t.broken === 'noAmount';
  if (withValueDate) {
    // SBI has a Value Date second column.
    return [date, date, t.narration, t.ref, noAmt ? '' : debit, noAmt ? '' : creditAmt, t.balance];
  }
  return [date, t.narration, t.ref, noAmt ? '' : debit, noAmt ? '' : creditAmt, t.balance];
}

/** Strategy B row (single amount + Dr/Cr): [date, narration, ref, amount, Dr/Cr, balance]. */
function rowB(t: Txn, formatDate: (i: string) => string): string[] {
  const date = formatDate(t.isoDate);
  if (t.broken === 'blankRow') return ['', '', '', '', '', ''];
  if (t.broken === 'short') return [date, t.narration];
  const noAmt = t.broken === 'noAmount';
  return [date, t.narration, t.ref, noAmt ? '' : t.amount, t.dir === 'credit' ? 'Cr' : 'Dr', t.balance];
}

const BANKS: BankFmt[] = [
  {
    bank: 'sbi',
    header: ['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance'],
    formatDate: ddmmyyyy,
    renderRow: (t) => rowAB(t, ddmmyyyy, true),
  },
  {
    bank: 'pnb',
    header: ['Date', 'Narration', 'Cheque Details', 'Withdrawal', 'Deposit', 'Balance'],
    formatDate: ddmmyyyyDash,
    renderRow: (t) => rowAB(t, ddmmyyyyDash, false),
  },
  {
    bank: 'bob',
    header: ['Tran Date', 'Remarks', 'UTR Number', 'Withdrawal Amt', 'Deposit Amt', 'Running Balance'],
    formatDate: ddMmmYyyy,
    renderRow: (t) => rowAB(t, ddMmmYyyy, false),
  },
  {
    bank: 'boi',
    header: ['Transaction Date', 'Particulars', 'Instrument ID', 'Amount', 'Dr/Cr', 'Balance'],
    formatDate: isoDate,
    renderRow: (t) => rowB(t, isoDate),
  },
  {
    bank: 'cooperative',
    header: ['DATE', 'DETAILS', 'CHQ/REF', 'DR', 'CR', 'BAL'],
    formatDate: ddmmyy,
    renderRow: (t) => rowAB(t, ddmmyy, false),
  },
];

// ── CSV rendering + encoding ────────────────────────────────────────────────────

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

function encodeBytes(text: string, encoding: Encoding | undefined): Buffer {
  switch (encoding) {
    case 'utf8-bom':
      return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);
    case 'latin1':
      return Buffer.from(text, 'latin1');
    case 'utf8':
    default:
      return Buffer.from(text, 'utf8');
  }
}

// ── Emit ────────────────────────────────────────────────────────────────────────

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = join(here, '..'); // scripts/ → package root
  const matrix = buildMatrix();
  if (matrix.length !== 50) {
    throw new Error(`matrix must be exactly 50 cases; got ${matrix.length}`);
  }

  for (const bankFmt of BANKS) {
    const goldenDir = join(pkgRoot, 'bihar', bankFmt.bank, 'golden');
    mkdirSync(goldenDir, { recursive: true });
    // Wipe stale .csv so a renamed/removed case does not leave an orphan.
    for (const f of readdirSync(goldenDir)) {
      if (f.endsWith('.csv')) rmSync(join(goldenDir, f));
    }

    matrix.forEach((c, i) => {
      const nn = String(i + 1).padStart(2, '0');
      const rows = [bankFmt.header, ...c.txns.map((t) => bankFmt.renderRow(t))];
      const csv = toCsv(rows);
      writeFileSync(join(goldenDir, `${nn}-${c.label}.csv`), encodeBytes(csv, c.encoding));
    });
    console.log(`wrote 50 golden inputs → bihar/${bankFmt.bank}/golden/`);
  }
}

main();
