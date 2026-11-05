import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { AgentClient, resultOf } from '../src/switch/agent-client.ts';
import type { Frame } from '../src/switch/frames.ts';
import { startWsServer } from './helpers/ws-server.ts';

const identity = { id: 'agent-1', apiKey: 'key-1', connectionId: 'conn-1', name: 'test' };

function until(check: () => boolean, label: string): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (check()) return resolve();
      if (Date.now() - started > 5000) return reject(new Error(`timed out: ${label}`));
      setTimeout(tick, 10);
    };
    tick();
  });
}

test('connects with the bearer key and answers ping at once', async () => {
  const server = await startWsServer(24001);
  after(() => server.close());
  const frames: Frame[] = [];
  const client = new AgentClient({ baseUrl: 'http://127.0.0.1:24001', identity, filter: 'all' });
  await client.start((frame) => { frames.push(frame); }, () => {});
  assert.equal(server.headers[0], 'Bearer key-1');
  assert.match(server.urls[0] ?? '', /^\/agents\/agent-1\/connection\/ws\?connection_id=conn-1&filter=all&scope=all/);
  server.sockets[0]?.send(JSON.stringify({ id: 7, event: 'room_join', data: { room_id: 'r', payload: { member_name: 'treasury' } } }));
  await until(() => frames.some((f) => f.kind === 'room_join'), 'room_join');
  server.sockets[0]?.send(JSON.stringify({ event: 'ping' }));
  await until(() => server.received.length > 0, 'pong');
  assert.deepEqual(server.received[0], { type: 'pong', cursor: 7 });
  client.stop();
});

test('reconnects after a drop with the same connection id', async () => {
  const server = await startWsServer(24002);
  after(() => server.close());
  const client = new AgentClient({ baseUrl: 'http://127.0.0.1:24002', identity, filter: 'addressed' });
  await client.start(() => {}, () => {});
  server.sockets[0]?.terminate();
  await until(() => server.urls.length === 2, 'second connection');
  assert.match(server.urls[1] ?? '', /connection_id=conn-1&filter=addressed/);
  client.stop();
});

test('an eviction by takeover is fatal and does not reconnect', async () => {
  const server = await startWsServer(24003);
  after(() => server.close());
  const fatal: string[] = [];
  const client = new AgentClient({ baseUrl: 'http://127.0.0.1:24003', identity, filter: 'all' });
  await client.start(() => {}, (reason) => fatal.push(reason));
  server.sockets[0]?.send(JSON.stringify({ event: 'evicted', data: { reason: 'taken_over' } }));
  await until(() => fatal.length === 1, 'fatal');
  server.sockets[0]?.terminate();
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(server.urls.length, 1);
  assert.deepEqual(fatal, ['taken_over']);
});

test('op returns refusals as data, sends the connection header and retries 409', async () => {
  let calls = 0;
  const seen: { path: string; header: string | undefined; body: string }[] = [];
  const http = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += String(chunk); });
    request.on('end', () => {
      calls += 1;
      seen.push({ path: request.url ?? '', header: request.headers['x-switch-connection-id'] as string | undefined, body });
      if (calls === 1) {
        response.writeHead(409, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ detail: 'connection conn-1 is not open; reconnect and resume' }));
        return;
      }
      if (calls === 2) {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ result: { ok: true } }));
        return;
      }
      response.writeHead(429, { 'content-type': 'application/json', 'retry-after': '60' });
      response.end(JSON.stringify({ detail: 'refused repeatedly' }));
    });
  });
  await new Promise<void>((resolve) => http.listen(24004, '127.0.0.1', resolve));
  after(() => { http.close(); });
  const client = new AgentClient({ baseUrl: 'http://127.0.0.1:24004', identity, filter: 'all', retryDelayMs: 1 });
  const first = await client.op('invite_agent_to_room', { room_id: 'r', agent_name: 'treasury' });
  assert.equal(first.status, 200);
  assert.deepEqual(resultOf(first), { ok: true });
  assert.equal(calls, 2);
  assert.equal(seen[0]?.path, '/agents/agent-1/ops/invite_agent_to_room');
  assert.equal(seen[0]?.header, 'conn-1');
  assert.deepEqual(JSON.parse(seen[0]?.body ?? ''), { room_id: 'r', agent_name: 'treasury' });
  const refused = await client.op('update_agent_detail', { agent_id: 'x', addressing: 'anyone' });
  assert.equal(refused.status, 429);
  assert.equal(refused.retryAfter, '60');
  assert.equal(resultOf(refused), null);
});

test('op reports an unreachable server as status 0', async () => {
  const client = new AgentClient({ baseUrl: 'http://127.0.0.1:24005', identity, filter: 'all', retryDelayMs: 1 });
  const result = await client.op('list_rooms');
  assert.equal(result.status, 0);
});
