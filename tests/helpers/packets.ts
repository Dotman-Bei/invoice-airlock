import type { Packet } from '../../src/packet/schema.ts';

export const CLEAN_SHA = 'a'.repeat(64);

export function cleanPacket(overrides: Partial<Packet> = {}): Packet {
  return {
    invoice_no: 'INV-1042',
    vendor_id: 'V-1001',
    po_no: 'PO-8841',
    grn_no: 'GRN-7731',
    amount_cents: 1240000,
    currency: 'USD',
    due_date: '2026-11-20',
    routing: '000111222',
    account: '000123456789',
    source_sha256: CLEAN_SHA,
    ...overrides,
  };
}
