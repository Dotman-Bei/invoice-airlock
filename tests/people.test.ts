import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { GatewaySession, must } from '../src/switch/gateway.ts';
import { MattermostSession } from '../src/switch/mattermost.ts';

const cookiesSeen: (string | undefined)[] = [];
const server = createServer((request, response) => {
  let raw = '';
  request.on('data', (chunk) => { raw += String(chunk); });
  request.on('end', () => {
    const json = (status: number, body: unknown, headers: Record<string, string | string[]> = {}): void => {
      response.writeHead(status, { 'content-type': 'application/json', ...headers });
      response.end(JSON.stringify(body));
    };
    if (request.url === '/gateway/auth/login') {
      assert.deepEqual(JSON.parse(raw), { email: 'a@b', password: 'p' });
      json(200, { ok: true }, { 'set-cookie': ['session=abc; Path=/; HttpOnly', 'other=1; Path=/'] });
    } else if (request.url === '/gateway/me') {
      cookiesSeen.push(request.headers.cookie);
      json(200, { name: 'clerk' });
    } else if (request.url === '/mm/users/login') {
      json(200, { id: 'user-1' }, { Token: 'tok-1' });
    } else if (request.url === '/mm/channels/chan/posts?per_page=200') {
      assert.equal(request.headers.authorization, 'Bearer tok-1');
      json(200, {
        order: ['p2', 'p1'],
        posts: {
          p1: { id: 'p1', root_id: '', user_id: 'u1', message: 'first', type: '', create_at: 1 },
          p2: { id: 'p2', root_id: 'p1', user_id: 'u2', message: 'second', type: '', create_at: 2 },
        },
      });
    } else if (request.url === '/mm/users/u1') {
      json(200, { username: 'reader' });
    } else if (request.url === '/mm/users/u2') {
      json(200, { username: 'treasury' });
    } else if (request.url === '/mm/files') {
      assert.match(String(request.headers['content-type']), /multipart\/form-data/);
      assert.ok(raw.includes('filename="INV-1042.pdf"'));
      json(201, { file_infos: [{ id: 'file-1' }] });
    } else if (request.url === '/mm/posts') {
      json(201, { id: 'new-post', echoed: JSON.parse(raw) });
    } else if (request.url === '/mm/config/client?format=old') {
      json(200, { CollapsedThreads: 'disabled' });
    } else {
      json(404, { detail: 'nope' });
    }
  });
});

before(() => new Promise<void>((resolve) => { server.listen(24020, '127.0.0.1', resolve); }));
after(() => { server.close(); });

test('the Gateway session keeps the login cookies', async () => {
  const session = new GatewaySession('http://127.0.0.1:24020/gateway/');
  must(await session.login('a@b', 'p'), 'login');
  await session.request('GET', '/me');
  assert.equal(cookiesSeen[0], 'session=abc; other=1');
});

test('must throws with the label on a failure', async () => {
  const session = new GatewaySession('http://127.0.0.1:24020/gateway');
  await assert.rejects(async () => must(await session.request('GET', '/missing'), 'lookup'), /lookup returned 404/);
});

test('Mattermost posts come back oldest first with usernames', async () => {
  const session = new MattermostSession('http://127.0.0.1:24020/mm');
  assert.equal(await session.login('clerk', 'p'), true);
  assert.equal(session.userId, 'user-1');
  assert.deepEqual(await session.posts('chan'), [
    { id: 'p1', rootId: '', username: 'reader', message: 'first', type: '', createAt: 1 },
    { id: 'p2', rootId: 'p1', username: 'treasury', message: 'second', type: '', createAt: 2 },
  ]);
});

test('a file is uploaded and attached to the post', async () => {
  const session = new MattermostSession('http://127.0.0.1:24020/mm');
  await session.login('clerk', 'p');
  assert.equal(await session.uploadAndPost('chan', '@reader please', 'INV-1042.pdf', Buffer.from('%PDF')), 'new-post');
});

test('the client config is readable', async () => {
  const session = new MattermostSession('http://127.0.0.1:24020/mm');
  await session.login('clerk', 'p');
  assert.equal((await session.clientConfig())['CollapsedThreads'], 'disabled');
});
