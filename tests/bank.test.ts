import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Ledger, OPENING_BALANCE_CENTS, parsePaymentRequest, type PaymentRequest } from '../src/bank/ledger.ts';
import { createBankServer } from '../src/bank/server.ts';

const payment: PaymentRequest = {
  invoice_no: 'INV-1042',
  vendor_id: 'V-1001',
  vendor_name: 'Harbor Lane Supplies',
  amount_cents: 1240000,
  routing: '000111222',
  account: '000123456789',
  released_by: 'controller',
};

test('paying moves the balance and numbers the entry', () => {
  const ledger = new Ledger();
  const result = ledger.pay(payment, new Date('2026-11-05T00:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.entry.entry : 0, 1);
  assert.equal(ledger.view().balance_cents, OPENING_BALANCE_CENTS - 1240000);
});

test('the same invoice cannot be paid twice', () => {
  const ledger = new Ledger();
  ledger.pay(payment);
  assert.deepEqual(ledger.pay(payment), { ok: false, code: 'already-paid' });
  assert.equal(ledger.view().entries.length, 1);
});

test('a payment above the balance is refused', () => {
  const ledger = new Ledger(100);
  assert.deepEqual(ledger.pay(payment), { ok: false, code: 'insufficient' });
});

test('a malformed payment does not parse', () => {
  assert.equal(parsePaymentRequest({ ...payment, amount_cents: 1.5 }), null);
  assert.equal(parsePaymentRequest({ ...payment, vendor_name: '' }), null);
  assert.equal(parsePaymentRequest('nope'), null);
});

const server = createBankServer('secret-token', new Ledger());
const base = 'http://127.0.0.1:24010';
const headers = { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' };

before(() => new Promise<void>((resolve) => { server.listen(24010, '127.0.0.1', resolve); }));
after(() => { server.close(); });

test('a payment without the token is 401 and moves nothing', async () => {
  const response = await fetch(`${base}/payments`, { method: 'POST', body: JSON.stringify(payment) });
  assert.equal(response.status, 401);
  const ledger = await (await fetch(`${base}/ledger.json`)).json() as { entries: unknown[] };
  assert.equal(ledger.entries.length, 0);
});

test('a bad body is 400', async () => {
  const response = await fetch(`${base}/payments`, { method: 'POST', headers, body: '{nope' });
  assert.equal(response.status, 400);
});

test('the token pays once, then 409', async () => {
  const first = await fetch(`${base}/payments`, { method: 'POST', headers, body: JSON.stringify(payment) });
  assert.equal(first.status, 201);
  const second = await fetch(`${base}/payments`, { method: 'POST', headers, body: JSON.stringify(payment) });
  assert.equal(second.status, 409);
});

test('the page says no real money', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.ok(page.includes('Mock bank. No real money'));
});
