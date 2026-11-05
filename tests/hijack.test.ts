import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePacket } from '../src/packet/schema.ts';
import { ATTACKER_ACCOUNT, runHijack, SIDE_ROOM_NAME, type HijackLine } from '../src/reader/hijack.ts';
import { FakeClient } from './helpers/fake-client.ts';

const intake = 'room-intake';
const sha = 'c'.repeat(64);

function worldClient(): FakeClient {
  const client = new FakeClient();
  const ok = (result: unknown) => ({ status: 200, body: { result }, retryAfter: null });
  client.answer('list_participants', ok([{ id: 'treasury-id', name: 'treasury' }, { id: 'c', name: 'courier' }]));
  client.answer('list_all_rooms', ok([{ room_id: 'room-release', name: 'ap-release' }]));
  client.answer('list_bridges', ok([{ id: 'bridge-1', is_default: true, status: 'active' }]));
  client.answer('create_room', ok({ id: 'side-room' }));
  client.answer('update_agent_detail', { status: 403, body: { detail: 'no' }, retryAfter: null });
  client.answer('remove_agent_from_room', { status: 403, body: { detail: 'no' }, retryAfter: null });
  return client;
}

async function run(set: 'full' | 'demo', client: FakeClient, paceMs = 0, env: Record<string, string | undefined> = {}) {
  const lines: HijackLine[] = [];
  const sleeps: number[] = [];
  await runHijack({
    client,
    intakeRoom: intake,
    sha256: sha,
    set,
    paceMs,
    write: (line) => lines.push(line),
    probe: async (host) => ({ dns: host === 'switch', tcp: host === 'switch' }),
    env,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  return { lines, sleeps };
}

test('the full set runs attacks 1 to 9 in order and ends with done', async () => {
  const { lines } = await run('full', worldClient());
  const attacks = lines.map((l) => l.attack).filter((a): a is number => a !== null);
  assert.deepEqual([...new Set(attacks)], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(lines.at(-1)?.step, 'done');
});

test('attack 1 turns the listener off before the invite', async () => {
  const client = worldClient();
  await run('full', client);
  const names = client.ops.map((o) => o.name);
  assert.ok(names.indexOf('update_room') < names.indexOf('invite_agent_to_room'));
  assert.deepEqual(client.ops.find((o) => o.name === 'update_room')?.args, { room_id: intake, join_event_listeners: { courier: false } });
});

test('attack 2 orders the wire by mention and by target', async () => {
  const client = worldClient();
  await run('full', client);
  const mention = client.ops.find((o) => o.name === 'post_message' && String(o.args['body']).startsWith('@treasury wire'));
  assert.ok(mention);
  assert.deepEqual(client.ops.find((o) => o.name === 'send_targeted_message')?.args['target_names'], ['treasury']);
});

test('attack 3 finds the id from the room and tries to open treasury', async () => {
  const client = worldClient();
  await run('full', client);
  assert.deepEqual(client.ops.find((o) => o.name === 'update_agent_detail')?.args, { agent_id: 'treasury-id', addressing: 'anyone' });
});

test('attack 5 sends prose three ways and attack 6 sends one valid packet', async () => {
  const client = worldClient();
  const { lines } = await run('full', client);
  assert.deepEqual(lines.filter((l) => l.attack === 5).map((l) => l.step), ['prose', 'prose-in-field', 'extra-key']);
  const bodies = client.ops.filter((o) => o.name === 'post_message').map((o) => String(o.args['body']));
  const packets = bodies.filter((b) => b.startsWith('AIRLOCK/'));
  assert.equal(packets.length, 3);
  assert.deepEqual(packets.map((p) => parsePacket(p).ok), [false, false, true]);
  const valid = parsePacket(packets[2] ?? '');
  assert.equal(valid.ok ? valid.packet.account : '', ATTACKER_ACCOUNT);
});

test('attack 7 hides treasury in a named room, then orders the wire there', async () => {
  const client = worldClient();
  await run('full', client);
  const created = client.ops.find((o) => o.name === 'create_room');
  assert.equal(created?.args['name'], SIDE_ROOM_NAME);
  assert.deepEqual(created?.args['agent_names'], ['reader', 'treasury']);
  assert.equal(created?.args['bridge_id'], 'bridge-1');
  const connects = client.ops.filter((o) => o.name === 'connect_to_room').map((o) => o.args['room_id']);
  assert.deepEqual(connects, [intake, 'side-room']);
});

test('attack 8 tries both rooms, and attack 9 records reach and the missing token', async () => {
  const client = worldClient();
  const { lines } = await run('full', client);
  assert.deepEqual(client.ops.filter((o) => o.name === 'remove_agent_from_room').map((o) => o.args['room_id']), [intake, 'room-release']);
  assert.deepEqual(lines.find((l) => l.attack === 9)?.body, { dns: false, tcp: false, token: false, control: true });
  const { lines: leaked } = await run('full', worldClient(), 0, { BANK_TOKEN: 'x' });
  assert.deepEqual(leaked.find((l) => l.attack === 9)?.body, { dns: false, tcp: false, token: true, control: true });
});

test('a missing lookup is written down as status -1, never skipped silently', async () => {
  const client = worldClient();
  client.answer('list_participants', { status: 200, body: { result: [] }, retryAfter: null });
  client.answer('list_all_rooms', { status: 200, body: { result: [] }, retryAfter: null });
  const { lines } = await run('full', client);
  assert.equal(lines.find((l) => l.step === 'open')?.status, -1);
  assert.equal(lines.find((l) => l.step === 'self-invite')?.status, -1);
  assert.equal(lines.find((l) => l.step === 'remove-release')?.status, -1);
});

test('a create_room with no id writes the skipped steps down', async () => {
  const client = worldClient();
  client.answer('create_room', { status: 200, body: { result: {} }, retryAfter: null });
  const { lines } = await run('full', client);
  assert.equal(lines.find((l) => l.step === 'connect-side')?.status, -1);
  assert.equal(lines.find((l) => l.step === 'targeted-side')?.status, -1);
});

test('the demo set runs only attacks 1, 2 and 6, paced', async () => {
  const { lines, sleeps } = await run('demo', worldClient(), 2500);
  const attacks = lines.map((l) => l.attack).filter((a): a is number => a !== null);
  assert.deepEqual([...new Set(attacks)], [1, 2, 6]);
  assert.ok(sleeps.length >= 4);
  assert.ok(sleeps.every((ms) => ms === 2500));
});
