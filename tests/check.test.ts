import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPacket } from '../src/desk/check.ts';
import { loadDesk } from '../src/desk/data.ts';
import { cleanPacket } from './helpers/packets.ts';

const desk = loadDesk('fixtures/desk');
const none: ReadonlySet<string> = new Set();

function holdReason(overrides: Parameters<typeof cleanPacket>[0]): string {
  const decision = checkPacket(cleanPacket(overrides), desk, none);
  assert.equal(decision.kind, 'held');
  return decision.kind === 'held' ? decision.reason : '';
}

test('a matching packet is cleared', () => {
  const decision = checkPacket(cleanPacket(), desk, none);
  assert.equal(decision.kind, 'cleared');
  assert.equal(decision.kind === 'cleared' ? decision.vendor.name : '', 'Harbor Lane Supplies');
});

test('an invoice already decided is a duplicate', () => {
  const decision = checkPacket(cleanPacket(), desk, new Set(['INV-1042']));
  assert.deepEqual(decision, { kind: 'duplicate', invoiceNo: 'INV-1042' });
});

test('an unknown vendor is held', () => {
  assert.equal(holdReason({ vendor_id: 'V-9999' }), 'unknown-vendor');
});

test('new bank details are held', () => {
  assert.equal(holdReason({ routing: '000999888', account: '99887766' }), 'bank-mismatch');
  assert.equal(holdReason({ account: '99887766' }), 'bank-mismatch');
});

test('a purchase order that is not on file is held', () => {
  assert.equal(holdReason({ po_no: 'PO-0001' }), 'po-mismatch');
});

test('a goods receipt for another order is held', () => {
  assert.equal(holdReason({ grn_no: 'GRN-7790' }), 'grn-missing');
});

test('an amount that differs from the goods receipt is held', () => {
  assert.equal(holdReason({ amount_cents: 1240001 }), 'amount-mismatch');
});

test('the bank check comes before the purchase order check', () => {
  assert.equal(holdReason({ account: '99887766', po_no: 'PO-0001' }), 'bank-mismatch');
});
