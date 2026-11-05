export type PaymentRequest = {
  invoice_no: string;
  vendor_id: string;
  vendor_name: string;
  amount_cents: number;
  routing: string;
  account: string;
  released_by: string;
};

export type LedgerEntry = PaymentRequest & { entry: number; at: string };
export type LedgerView = { opening_balance_cents: number; balance_cents: number; entries: LedgerEntry[] };
export type PayResult = { ok: true; entry: LedgerEntry } | { ok: false; code: 'already-paid' | 'insufficient' };

export const OPENING_BALANCE_CENTS = 25_000_000;

export function parsePaymentRequest(value: unknown): PaymentRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  for (const key of ['invoice_no', 'vendor_id', 'vendor_name', 'routing', 'account', 'released_by']) {
    if (typeof record[key] !== 'string' || record[key] === '') return null;
  }
  const amount = record['amount_cents'];
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) return null;
  return {
    invoice_no: record['invoice_no'] as string,
    vendor_id: record['vendor_id'] as string,
    vendor_name: record['vendor_name'] as string,
    amount_cents: amount,
    routing: record['routing'] as string,
    account: record['account'] as string,
    released_by: record['released_by'] as string,
  };
}

export class Ledger {
  private readonly opening: number;
  private readonly entries: LedgerEntry[] = [];

  constructor(opening: number = OPENING_BALANCE_CENTS) {
    this.opening = opening;
  }

  private balance(): number {
    return this.entries.reduce((total, entry) => total - entry.amount_cents, this.opening);
  }

  pay(request: PaymentRequest, at: Date = new Date()): PayResult {
    if (this.entries.some((entry) => entry.invoice_no === request.invoice_no)) {
      return { ok: false, code: 'already-paid' };
    }
    if (request.amount_cents > this.balance()) {
      return { ok: false, code: 'insufficient' };
    }
    const entry: LedgerEntry = { ...request, entry: this.entries.length + 1, at: at.toISOString() };
    this.entries.push(entry);
    return { ok: true, entry };
  }

  view(): LedgerView {
    return { opening_balance_cents: this.opening, balance_cents: this.balance(), entries: [...this.entries] };
  }
}
