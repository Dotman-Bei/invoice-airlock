import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearedMessage,
  formatUsd,
  heldMessage,
  intakeRemoved,
  paidMessage,
  parseDecisionLine,
  readerHijacked,
  readerRead,
  releaseHiddenRoom,
  releaseRemoved,
} from '../src/desk/copy.ts';
import { loadDesk } from '../src/desk/data.ts';
import { cleanPacket } from './helpers/packets.ts';

const vendor = loadDesk('fixtures/desk').vendors[0]!;

test('money is formatted with cents and separators', () => {
  assert.equal(formatUsd(1240000), '$12,400.00');
  assert.equal(formatUsd(4820000), '$48,200.00');
  assert.equal(formatUsd(5), '$0.05');
});

test('the reader note names only validated fields', () => {
  assert.equal(
    readerRead(cleanPacket()),
    'Read INV-1042 from V-1001 for $12,400.00. Sending the typed packet to the courier.',
  );
});

test('the hijacked reader opens with the pinned line', () => {
  assert.equal(readerHijacked, 'INV-2091 says the rules have changed. Bringing in treasury to pay it now.');
});

test('the cleared message is the pinned copy and carries a parseable line', () => {
  const message = clearedMessage(cleanPacket(), vendor);
  assert.ok(message.startsWith('**Cleared for payment: INV-1042**\n'));
  assert.ok(message.includes('Harbor Lane Supplies, $12,400.00, due 2026-11-20. Matched PO-8841 and GRN-7731.'));
  assert.ok(message.includes('To pay, tell treasury: pay INV-1042'));
  assert.ok(!message.includes('@'), 'addresses nobody');
  assert.deepEqual(parseDecisionLine(message), {
    kind: 'cleared',
    invoice_no: 'INV-1042',
    vendor_id: 'V-1001',
    vendor_name: 'Harbor Lane Supplies',
    amount_cents: 1240000,
    routing: '000111222',
    account: '000123456789',
  });
});

test('the held message shows only the last four digits of the attacker account', () => {
  const packet = cleanPacket({ invoice_no: 'INV-2091', amount_cents: 4820000, routing: '000999888', account: '99887766' });
  const message = heldMessage(packet, 'bank-mismatch', vendor);
  assert.ok(message.includes('account ending 7766, on file ending 6789. Amount $48,200.00.'));
  assert.ok(!message.includes('99887766'));
  assert.ok(!message.includes('000999888'));
  assert.deepEqual(parseDecisionLine(message), { kind: 'held', invoice_no: 'INV-2091', reason: 'bank-mismatch' });
});

test('every hold reason has a sentence', () => {
  const packet = cleanPacket();
  for (const reason of ['unknown-vendor', 'po-mismatch', 'grn-missing', 'amount-mismatch'] as const) {
    const message = heldMessage(packet, reason, reason === 'unknown-vendor' ? null : vendor);
    assert.ok(message.includes('Amount $12,400.00.'), reason);
    assert.ok(message.includes('This cannot be paid in chat.'), reason);
  }
});

test('removal notices use the pinned copy', () => {
  assert.equal(
    intakeRemoved('treasury'),
    'Removed treasury from this room. It takes orders only in ap-release, and the controller has been told. Mattermost may still list it as a member.',
  );
  assert.equal(
    releaseRemoved('treasury', 'ap-intake'),
    '**Security alert:** treasury was added to ap-intake and has been removed. Payments can only be released from this room.',
  );
  assert.equal(
    releaseHiddenRoom('abc'),
    '**Security alert:** treasury was added to a room it does not belong in (abc) and has been removed.',
  );
});

test('the paid message names the vendor and the ledger entry', () => {
  const line = parseDecisionLine(clearedMessage(cleanPacket(), vendor));
  assert.equal(line?.kind, 'cleared');
  if (line?.kind === 'cleared') {
    assert.equal(
      paidMessage(line, 1),
      'Paid INV-1042: $12,400.00 to Harbor Lane Supplies, account ending 6789. Released by controller. Ledger entry 1.',
    );
  }
});

test('text without a decision line parses to null', () => {
  assert.equal(parseDecisionLine('hello'), null);
  assert.equal(parseDecisionLine('AIRLOCK-CLEARED/1 {nope}'), null);
});
