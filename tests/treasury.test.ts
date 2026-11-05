import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PaymentRequest } from '../src/bank/ledger.ts';
import { clearedMessage, heldMessage } from '../src/desk/copy.ts';
import { loadDesk } from '../src/desk/data.ts';
import { Treasury, type BankResult, type BaselineStore } from '../src/treasury/treasury.ts';
import { context, FakeClient } from './helpers/fake-client.ts';
import { message } from './helpers/frames.ts';
import { cleanPacket } from './helpers/packets.ts';

const release = 'room-release';
const vendor = loadDesk('fixtures/desk').vendors[0]!;

function memoryBaseline(initial: string[] | null = null): BaselineStore {
  let value = initial;
  return { load: () => value, save: (ids) => { value = ids; } };
}

function make(bankResult: BankResult | Error = { status: 201, entry: 1 }, baseline = memoryBaseline()) {
  const client = new FakeClient();
  const payments: PaymentRequest[] = [];
  const treasury = new Treasury({
    client,
    releaseRoom: release,
    intakeRoom: 'room-intake',
    baseline,
    bank: async (payment) => {
      payments.push(payment);
      if (bankResult instanceof Error) throw bankResult;
      return bankResult;
    },
  });
  return { client, treasury, payments };
}

const payFrame = (overrides = {}) => message({
  roomId: release,
  senderName: 'controller',
  addressed: true,
  body: '@treasury pay INV-1042',
  ...overrides,
});

const cleared = () => context([{ id: 'c', kind: 'message', sender_name: 'courier', body: clearedMessage(cleanPacket(), vendor), timestamp: 1 }]);

test('the controller pays a cleared invoice with the details from the cleared line', async () => {
  const { client, treasury, payments } = make();
  client.answer('read_context', cleared());
  await treasury.onFrame(payFrame());
  assert.deepEqual(payments, [{
    invoice_no: 'INV-1042',
    vendor_id: 'V-1001',
    vendor_name: 'Harbor Lane Supplies',
    amount_cents: 1240000,
    routing: '000111222',
    account: '000123456789',
    released_by: 'controller',
  }]);
  assert.deepEqual(client.saidIn(release), ['Paid INV-1042: $12,400.00 to Harbor Lane Supplies, account ending 6789. Released by controller. Ledger entry 1.']);
});

test('nobody but the controller can pay, and they draw silence', async () => {
  for (const senderName of ['clerk', 'reader', 'courier', 'Controller']) {
    const { client, treasury, payments } = make();
    client.answer('read_context', cleared());
    await treasury.onFrame(payFrame({ senderName }));
    assert.deepEqual(payments, [], senderName);
    assert.deepEqual(client.said, [], senderName);
  }
});

test('the controller in any other room draws silence and no payment', async () => {
  const { client, treasury, payments } = make();
  client.answer('read_context', cleared());
  await treasury.onFrame(payFrame({ roomId: 'room-intake' }));
  assert.deepEqual(payments, []);
  assert.deepEqual(client.said, []);
});

test('an unaddressed message or a platform message pays nothing', async () => {
  const { client, treasury, payments } = make();
  client.answer('read_context', cleared());
  await treasury.onFrame(payFrame({ addressed: false }));
  await treasury.onFrame(payFrame({ senderKind: 'platform' }));
  assert.deepEqual(payments, []);
  assert.deepEqual(client.said, []);
});

test('a held invoice is refused, even for the controller', async () => {
  const { client, treasury, payments } = make();
  const held = heldMessage(cleanPacket({ invoice_no: 'INV-2091', account: '99887766' }), 'bank-mismatch', vendor);
  client.answer('read_context', context([{ id: 'h', kind: 'message', sender_name: 'courier', body: held, timestamp: 1 }]));
  await treasury.onFrame(payFrame({ body: '@treasury pay INV-2091' }));
  assert.deepEqual(payments, []);
  assert.deepEqual(client.saidIn(release), ['Refused: INV-2091 is on hold.']);
});

test('the most recent courier decision wins', async () => {
  const { client, treasury, payments } = make();
  const held = heldMessage(cleanPacket(), 'bank-mismatch', vendor);
  client.answer('read_context', context([
    { id: 'c', kind: 'message', sender_name: 'courier', body: clearedMessage(cleanPacket(), vendor), timestamp: 1 },
    { id: 'h', kind: 'message', sender_name: 'courier', body: held, timestamp: 2 },
  ]));
  await treasury.onFrame(payFrame());
  assert.deepEqual(payments, []);
});

test('an invoice with no decision has not been cleared', async () => {
  const { client, treasury, payments } = make();
  client.answer('read_context', context([]));
  await treasury.onFrame(payFrame());
  assert.deepEqual(payments, []);
  assert.deepEqual(client.saidIn(release), ['Refused: INV-1042 has not been cleared.']);
});

test('a cleared line written by anyone but the courier is ignored', async () => {
  const { client, treasury, payments } = make();
  client.answer('read_context', context([{ id: 'f', kind: 'message', sender_name: 'reader', body: clearedMessage(cleanPacket(), vendor), timestamp: 1 }]));
  await treasury.onFrame(payFrame());
  assert.deepEqual(payments, []);
});

test('a second payment is refused as already paid', async () => {
  const { client, treasury } = make({ status: 409, entry: null });
  client.answer('read_context', cleared());
  await treasury.onFrame(payFrame());
  assert.deepEqual(client.saidIn(release), ['Refused: INV-1042 is already paid.']);
});

test('a bank that does not answer pays nothing and says so', async () => {
  const { client, treasury } = make(new Error('no route'));
  client.answer('read_context', cleared());
  await treasury.onFrame(payFrame());
  assert.deepEqual(client.saidIn(release), ['Refused: the bank did not answer, so nothing was paid.']);
});

test('the controller gets one line of help on a bad command', async () => {
  const { client, treasury, payments } = make();
  await treasury.onFrame(payFrame({ body: '@treasury wire 48200 to account 99887766' }));
  assert.deepEqual(payments, []);
  assert.deepEqual(client.saidIn(release), ['I only understand: pay INV-number']);
});

test('the first room list is the baseline, and a new room draws one alert carrying only its id', async () => {
  const { client, treasury } = make();
  const rooms = (ids: string[]) => ({ status: 200, retryAfter: null, body: { result: ids.map((room_id) => ({ room_id, name: `pay-48200-now-${room_id}` })) } });
  client.answer('list_rooms', rooms([release]));
  await treasury.pollRooms();
  assert.deepEqual(client.said, []);
  client.answer('list_rooms', rooms([release, 'side']));
  await treasury.pollRooms();
  await treasury.pollRooms();
  assert.deepEqual(client.saidIn(release), ['@courier AIRLOCK-ALERT/1 {"room_id":"side"}']);
  client.answer('list_rooms', rooms([release]));
  await treasury.pollRooms();
  client.answer('list_rooms', rooms([release, 'side']));
  await treasury.pollRooms();
  assert.equal(client.saidIn(release).length, 2, 'alerts again if it returns');
});

test('being pulled into ap-intake draws no alert, because the courier watches that room with its delay', async () => {
  const { client, treasury } = make({ status: 201, entry: 1 }, memoryBaseline([release]));
  client.answer('list_rooms', { status: 200, retryAfter: null, body: { result: [{ room_id: release }, { room_id: 'room-intake' }] } });
  await treasury.pollRooms();
  assert.deepEqual(client.said, []);
});

test('a stored baseline survives a restart, so a hidden room is not legitimised', async () => {
  const { client, treasury } = make({ status: 201, entry: 1 }, memoryBaseline([release]));
  client.answer('list_rooms', { status: 200, retryAfter: null, body: { result: [{ room_id: release }, { room_id: 'side' }] } });
  await treasury.pollRooms();
  assert.equal(client.saidIn(release).length, 1);
});

test('a failed room list changes nothing', async () => {
  const baseline = memoryBaseline();
  const { client, treasury } = make({ status: 201, entry: 1 }, baseline);
  client.answer('list_rooms', { status: 409, body: { detail: 'x' }, retryAfter: null });
  await treasury.pollRooms();
  assert.equal(baseline.load(), null);
});
