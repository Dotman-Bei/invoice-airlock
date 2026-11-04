# Airlock Stack Implementation Plan

**Goal:** Stand up Switch and the agents on a fresh stack with one Compose overlay, and prove the facts the design took from source.
**Architecture:** `lib/stack.sh` downloads Switch's published Compose file at a pinned tag, verifies its hash, generates throwaway secrets and lays `deploy/compose.airlock.yaml` over it. `provision` then creates the people, agents and rooms through Switch's own APIs. No Switch code is committed.
**Tech Stack:** Docker with Compose (rootless), bash, curl. Images: switch-core 0.31.0, gateway 0.31.0, setup 0.31.0, mattermost-team-edition 11.9.0, postgres 16-alpine, node 22-slim
**Source spec:** docs/superpowers/specs/2026-11-04-invoice-airlock-design.md

**Where this runs:** on the VPS, as the OS user `airlock-build`, from `~/invoice-airlock`. That user has no sudo and no access to the main Docker daemon. Its rootless Docker is the only Docker it can use.

**House rules for every task here:**

- Node runs TypeScript directly through type stripping, so use only erasable syntax (no enums, no parameter properties), and write imports with the `.ts` extension. Type-only imports use `import type`.
- There are no runtime npm dependencies. Dev dependencies are only `typescript`, `@types/node`, `@types/ws` and `ws`.
- Test servers bind fixed ports in 24000-24999, never port 0, because this user's firewall refuses every other loopback port.
- Never use `as any`. Secrets appear only as environment variable names.
- Nothing here moves real money. The bank is a mock, every vendor is synthetic, and every secret a stack uses is generated per run and thrown away with it.
- Docker-gated tasks start a throwaway local stack on this user's rootless daemon. The user approved that at the design gate, and it is not a deploy, so those tasks are not human-gated. The only human-gated tasks are 5.3 and 7.5.
- `.gitignore` from task 1.1 covers `.run/`, `proof-output/`, `.taste-skill/` and `node_modules/`, so running a stack leaves nothing to commit from those.

---

### Task 3.1: Rooms and provisioning

**Files:**
- Create: `switch/templates/ap-intake.template.yaml`
- Create: `switch/templates/ap-release.template.yaml`
- Create: `src/provision/desk-state.ts`
- Create: `src/provision/provision.ts`
- Create: `src/provision/main.ts`
- Test:   `tests/provision.test.ts`

**Depends on:** Task 1.9, Task 2.1
**Effort:** high
**Model tier:** top
**Provides:** `src/provision/desk-state.ts: export type Person = { email: string; gatewayPassword: string; mattermostPassword: string };`, `src/provision/desk-state.ts: export type DeskState = { owners: 'two' | 'single'; team: string; bridgeId: string; admin: { email: string; password: string }; people: { clerk: Person; controller: Person }; rooms: { intake: string; release: string }; agents: { reader: string; courier: string; treasury: string }; };`, `src/provision/provision.ts: export type Owners = 'two' | 'single';`, `src/provision/provision.ts: export type PersonName = 'clerk' | 'controller';`, `src/provision/provision.ts: export type AgentName = 'reader' | 'courier' | 'treasury';`, `src/provision/provision.ts: export type ProvisionEnv = { switchUrl: string; mattermostUrl: string; adminEmail: string; adminPassword: string; mattermostAdminUser: string; mattermostAdminPassword: string; team: string; owners: Owners; templatesDir: string; stateRoot: string; readyTimeoutMs: number; log: (line: string) => void; };`, `src/provision/provision.ts: export const DEFAULT_POLICY`, `src/provision/provision.ts: export function ownerOf(agent: AgentName, owners: Owners): PersonName`, `src/provision/provision.ts: export function policyFor(agent: AgentName, owners: Owners): typeof DEFAULT_POLICY | null`, `src/provision/provision.ts: export async function waitFor<T>(label: string, attempt: () => Promise<T | null>, timeoutMs: number, stepMs = 2000): Promise<T>`, `src/provision/provision.ts: export function deskStatePath(stateRoot: string): string`, `src/provision/provision.ts: export async function provision(env: ProvisionEnv): Promise<void>`, `the provision process: node src/provision/main.ts, which writes one volume per agent. Each agent mounts its own at /state and reads /state/agent.json. proof-runner reads /state/desk.json`
**Requires:** `src/switch/gateway.ts: export class GatewaySession { constructor(baseUrl: string); login(email: string, password: string): Promise<HttpResult>; request(method: string, path: string, body?: unknown): Promise<HttpResult> }`, `src/switch/gateway.ts: export function must(result: HttpResult, label: string): Record<string, unknown>`, `src/switch/mattermost.ts: export class MattermostSession { userId; constructor(baseUrl: string); login(username: string, password: string): Promise<boolean>; request(method: string, path: string, body?: unknown): Promise<HttpResult>; channelId(team: string, channel: string): Promise<string | null>; postMessage(channelId: string, message: string, fileIds: string[] = []): Promise<string>; uploadAndPost(channelId: string, message: string, filename: string, bytes: Buffer): Promise<string>; posts(channelId: string): Promise<Post[]>; clientConfig(): Promise<Record<string, string>> }`, `src/switch/state.ts: export type AgentState = { id: string; api_key: string; connection_id: string; name: string; rooms: { intake?: string; release?: string }; };`, `src/switch/state.ts: export function requireEnv(name: string): string`

The API calls here are the ones that worked in the runtime checks. The secrets it handles are generated per run by `lib/stack.sh` and thrown away with the stack. Neither template has a kickoff, because an answer threaded under a kickoff never reached Mattermost. In the `--single-owner` control, reader answers anyone, because otherwise the clerk could not hand it an invoice and the hijack would never start.

Upstream signatures, pasted from their providers:

```text
src/switch/gateway.ts: export class GatewaySession { constructor(baseUrl: string); login(email: string, password: string): Promise<HttpResult>; request(method: string, path: string, body?: unknown): Promise<HttpResult> }
src/switch/gateway.ts: export function must(result: HttpResult, label: string): Record<string, unknown>
src/switch/mattermost.ts: export class MattermostSession { userId; constructor(baseUrl: string); login(username: string, password: string): Promise<boolean>; request(method: string, path: string, body?: unknown): Promise<HttpResult>; channelId(team: string, channel: string): Promise<string | null>; postMessage(channelId: string, message: string, fileIds: string[] = []): Promise<string>; uploadAndPost(channelId: string, message: string, filename: string, bytes: Buffer): Promise<string>; posts(channelId: string): Promise<Post[]>; clientConfig(): Promise<Record<string, string>> }
src/switch/state.ts: export type AgentState = { id: string; api_key: string; connection_id: string; name: string; rooms: { intake?: string; release?: string }; };
src/switch/state.ts: export function requireEnv(name: string): string
```

- [ ] **Step 1: Write the failing test**

`tests/provision.test.ts`

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_POLICY, ownerOf, policyFor, waitFor } from '../src/provision/provision.ts';

test('two owners puts reader under the clerk and the rest under the controller', () => {
  assert.equal(ownerOf('reader', 'two'), 'clerk');
  assert.equal(ownerOf('courier', 'two'), 'controller');
  assert.equal(ownerOf('treasury', 'two'), 'controller');
});

test('the single-owner control moves only reader', () => {
  assert.equal(ownerOf('reader', 'single'), 'controller');
  assert.equal(ownerOf('courier', 'single'), 'controller');
  assert.equal(ownerOf('treasury', 'single'), 'controller');
});

test('the default policy admits only the owner and the owner\'s agents', () => {
  assert.deepEqual(DEFAULT_POLICY.rules, [{ rooms: '*', room_groups: '*', users: [], agents: [], owner: true, owner_agents: true, platform: false }]);
});

test('only the single-owner control opens reader, so the clerk can still hand it an invoice', () => {
  assert.equal(policyFor('reader', 'single'), null);
  assert.equal(policyFor('reader', 'two'), DEFAULT_POLICY);
  assert.equal(policyFor('treasury', 'single'), DEFAULT_POLICY);
  assert.equal(policyFor('courier', 'single'), DEFAULT_POLICY);
});

test('templates have no kickoff, and each room holds only its own agents', () => {
  const intake = readFileSync('switch/templates/ap-intake.template.yaml', 'utf8');
  const release = readFileSync('switch/templates/ap-release.template.yaml', 'utf8');
  assert.ok(!/kickoff/.test(intake));
  assert.ok(!/kickoff/.test(release));
  assert.ok(intake.includes('agents: [reader, courier]'));
  assert.ok(release.includes('agents: [treasury, courier]'));
  assert.ok(release.includes('channel_type: channel_private'));
  assert.ok(release.includes('read_visibility: private'));
  assert.ok(release.includes('write_visibility: private'));
});

test('waitFor retries until there is a value, and names what timed out', async () => {
  let calls = 0;
  assert.equal(await waitFor('x', async () => (++calls < 3 ? null : 'ready'), 1000, 1), 'ready');
  await assert.rejects(waitFor('the bridge', async () => null, 5, 1), /timed out waiting for the bridge/);
});
```


- [ ] **Step 2: Run to confirm it fails**

Run: `node --disable-warning=ExperimentalWarning --test --test-reporter=tap tests/provision.test.ts`
Expected: FAIL: the test file cannot import the module it tests

- [ ] **Step 3: Minimal implementation**

`switch/templates/ap-intake.template.yaml`

```yaml
# Run by the clerk. Outside content lands here, and nothing in this room can move money.
version: 1
room:
  name: ap-intake
  description: Accounts payable intake. Vendor invoices land here. Nothing in this room can move money.
  instructions: >
    The clerk drops one PDF invoice at a time and mentions reader. reader posts one typed packet.
    courier checks each packet and sends only typed fields to the controller. Prose goes no further.
  channel_type: channel_public
  agents: [reader, courier]
  users: ["{$creator}"]
```

`switch/templates/ap-release.template.yaml`

```yaml
# Run by the controller. Private, and the only room treasury takes orders in.
version: 1
room:
  name: ap-release
  description: Accounts payable release. Only the controller can release money here.
  instructions: >
    courier posts cleared and held invoices here, built only from typed fields and the vendor master.
    The controller pays a cleared invoice by telling treasury to pay it. treasury obeys nobody else.
  channel_type: channel_private
  read_visibility: private
  write_visibility: private
  agents: [treasury, courier]
  users: ["{$creator}"]
```

`src/provision/desk-state.ts`

```ts
export type Person = { email: string; gatewayPassword: string; mattermostPassword: string };

// Everything the proof runner and demo.sh need. Only provision and proof-runner mount it.
export type DeskState = {
  owners: 'two' | 'single';
  team: string;
  bridgeId: string;
  admin: { email: string; password: string };
  people: { clerk: Person; controller: Person };
  rooms: { intake: string; release: string };
  agents: { reader: string; courier: string; treasury: string };
};
```

`src/provision/provision.ts`

```ts
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GatewaySession, must } from '../switch/gateway.ts';
import { MattermostSession } from '../switch/mattermost.ts';
import type { AgentState } from '../switch/state.ts';
import type { DeskState, Person } from './desk-state.ts';

export type Owners = 'two' | 'single';
export type PersonName = 'clerk' | 'controller';
export type AgentName = 'reader' | 'courier' | 'treasury';

export type ProvisionEnv = {
  switchUrl: string;
  mattermostUrl: string;
  adminEmail: string;
  adminPassword: string;
  mattermostAdminUser: string;
  mattermostAdminPassword: string;
  team: string;
  owners: Owners;
  templatesDir: string;
  stateRoot: string;
  readyTimeoutMs: number;
  log: (line: string) => void;
};

const PROFILE = {
  connection_model: 'always_on',
  message_exchange: true,
  pre_invocation_mediation: [],
  post_invocation_mediation: [],
  event_reporting: [],
};

// The owner and owner's agents may address an agent, and nobody else.
export const DEFAULT_POLICY = {
  rules: [{ rooms: '*', room_groups: '*', users: [], agents: [], owner: true, owner_agents: true, platform: false }],
};

// --single-owner is the control run: it moves reader under the controller and nothing else.
export function ownerOf(agent: AgentName, owners: Owners): PersonName {
  if (agent === 'reader' && owners === 'two') return 'clerk';
  return 'controller';
}

// The clerk must still be able to hand reader an invoice in that control, so reader answers anyone there.
export function policyFor(agent: AgentName, owners: Owners): typeof DEFAULT_POLICY | null {
  return agent === 'reader' && owners === 'single' ? null : DEFAULT_POLICY;
}

export async function waitFor<T>(label: string, attempt: () => Promise<T | null>, timeoutMs: number, stepMs = 2000): Promise<T> {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await attempt();
      if (value !== null) return value;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  throw new Error(`timed out waiting for ${label}${lastError ? `: ${lastError}` : ''}`);
}

function writeSecret(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
}

export function deskStatePath(stateRoot: string): string {
  return join(stateRoot, 'runner', 'desk.json');
}

export async function provision(env: ProvisionEnv): Promise<void> {
  const { log } = env;
  if (existsSync(deskStatePath(env.stateRoot))) {
    log('already provisioned');
    return;
  }

  const gatewayUrl = `${env.switchUrl}/gateway`;
  const mattermostApi = `${env.mattermostUrl}/api/v4`;
  await waitFor('the Switch API', async () => ((await fetch(`${env.switchUrl}/health`)).ok ? true : null), env.readyTimeoutMs);
  const admin = new GatewaySession(gatewayUrl);
  await waitFor('the Gateway admin login', async () => ((await admin.login(env.adminEmail, env.adminPassword)).status === 200 ? true : null), env.readyTimeoutMs);
  const bridgeId = await waitFor('the Mattermost bridge', async () => {
    const result = await admin.request('GET', '/collaborations');
    const bridges = result.body;
    if (result.status !== 200 || !Array.isArray(bridges) || bridges.length === 0) return null;
    return (bridges[0] as { bridge_id: string }).bridge_id;
  }, env.readyTimeoutMs);
  const mattermostAdmin = new MattermostSession(mattermostApi);
  await waitFor('the Mattermost admin login', async () => ((await mattermostAdmin.login(env.mattermostAdminUser, env.mattermostAdminPassword)) ? true : null), env.readyTimeoutMs);
  const teamId = await waitFor('the Mattermost team', async () => {
    const result = await mattermostAdmin.request('GET', `/teams/name/${env.team}`);
    return result.status === 200 ? (result.body as { id: string }).id : null;
  }, env.readyTimeoutMs);
  log('stack is ready');

  // Greetings would land mid money shot when treasury is pulled in.
  must(await admin.request('PATCH', `/collaborations/${bridgeId}`, { agent_greetings_enabled: false }), 'turn greetings off');

  const people = {} as Record<PersonName, Person>;
  const sessions = {} as Record<PersonName, GatewaySession>;
  const registrationKeys = {} as Record<PersonName, string>;
  for (const name of ['clerk', 'controller'] as const) {
    const person: Person = {
      email: `${name}@switch.local`,
      gatewayPassword: randomBytes(16).toString('hex'),
      mattermostPassword: `Mm-${randomBytes(12).toString('hex')}!`,
    };
    must(await admin.request('POST', '/users', { name, email: person.email, password: person.gatewayPassword }), `create user ${name}`);
    const session = new GatewaySession(gatewayUrl);
    must(await session.login(person.email, person.gatewayPassword), `log in ${name}`);
    const key = must(await session.request('POST', '/api-keys', { label: `${name}-registration` }), `create key for ${name}`);
    registrationKeys[name] = key['key'] as string;

    const created = await mattermostAdmin.request('POST', '/users', {
      username: name,
      email: person.email,
      password: person.mattermostPassword,
      first_name: name.charAt(0).toUpperCase() + name.slice(1),
    });
    const mattermostUser = must(created, `create Mattermost user ${name}`);
    const userId = mattermostUser['id'] as string;
    must(await mattermostAdmin.request('POST', `/teams/${teamId}/members`, { team_id: teamId, user_id: userId }), `add ${name} to the team`);
    // Without this link an owner rule matches nobody, and Switch cannot tell the two people apart.
    await waitFor(`the link for ${name}`, async () => {
      const linked = await session.request('POST', `/collaborations/${bridgeId}/identities`, { external_user_id: userId, username: name });
      return linked.status === 200 ? true : null;
    }, 60_000);
    people[name] = person;
    sessions[name] = session;
    log(`person ready: ${name}`);
  }

  const agents = {} as Record<AgentName, { id: string; apiKey: string }>;
  for (const name of ['reader', 'courier', 'treasury'] as const) {
    const owner = ownerOf(name, env.owners);
    const response = await fetch(`${env.switchUrl}/agents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registrationKeys[owner]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: `Invoice Airlock ${name}, owned by the ${owner}`, connector_type: 'invoice-airlock', integration_profile: PROFILE }),
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`register ${name} returned ${response.status}`);
    }
    const created = (await response.json()) as { id: string; api_key: string };
    agents[name] = { id: created.id, apiKey: created.api_key };
    must(await sessions[owner].request('PUT', `/agents/${created.id}/addressing-policy`, { policy: policyFor(name, env.owners) }), `set policy on ${name}`);
    log(`agent ready: ${name}, owner ${owner}`);
  }

  async function runTemplate(person: PersonName, file: string, name: string): Promise<string> {
    const yaml = readFileSync(join(env.templatesDir, file), 'utf8');
    const created = must(await sessions[person].request('POST', '/rooms/from-yaml', { yaml, template_name: name }), `run template ${name}`);
    return created['room_id'] as string;
  }
  const intake = await runTemplate('clerk', 'ap-intake.template.yaml', 'ap-intake');
  const release = await runTemplate('controller', 'ap-release.template.yaml', 'ap-release');
  log('rooms ready');

  function agentState(name: AgentName, rooms: AgentState['rooms']): AgentState {
    return { id: agents[name].id, api_key: agents[name].apiKey, connection_id: randomUUID(), name, rooms };
  }
  for (const dir of ['reader', 'courier', 'treasury', 'runner']) {
    mkdirSync(join(env.stateRoot, dir), { recursive: true });
  }
  writeSecret(join(env.stateRoot, 'reader', 'agent.json'), agentState('reader', { intake }));
  writeSecret(join(env.stateRoot, 'courier', 'agent.json'), agentState('courier', { intake, release }));
  writeSecret(join(env.stateRoot, 'treasury', 'agent.json'), agentState('treasury', { release, intake }));
  const desk: DeskState = {
    owners: env.owners,
    team: env.team,
    bridgeId,
    admin: { email: env.adminEmail, password: env.adminPassword },
    people: { clerk: people.clerk, controller: people.controller },
    rooms: { intake, release },
    agents: { reader: agents.reader.id, courier: agents.courier.id, treasury: agents.treasury.id },
  };
  writeSecret(deskStatePath(env.stateRoot), desk);
  log('provisioned');
}
```

`src/provision/main.ts`

```ts
import { requireEnv } from '../switch/state.ts';
import { provision, type Owners } from './provision.ts';

const owners: Owners = process.env['AIRLOCK_OWNERS'] === 'single' ? 'single' : 'two';
try {
  await provision({
    switchUrl: requireEnv('SWITCH_URL'),
    mattermostUrl: requireEnv('MATTERMOST_URL'),
    adminEmail: requireEnv('GATEWAY_ADMIN_EMAIL'),
    adminPassword: requireEnv('GATEWAY_ADMIN_PASSWORD'),
    mattermostAdminUser: requireEnv('MATTERMOST_ADMIN_USER'),
    mattermostAdminPassword: requireEnv('MATTERMOST_ADMIN_PASSWORD'),
    team: requireEnv('MATTERMOST_TEAM_NAME'),
    owners,
    templatesDir: 'switch/templates',
    stateRoot: process.env['STATE_ROOT'] ?? '/state',
    readyTimeoutMs: 300_000,
    log: (line) => console.log(`[provision] ${line}`),
  });
} catch (error) {
  console.error(`[provision] failed: ${String(error)}`);
  process.exit(1);
}
```


- [ ] **Step 4: Run to confirm it passes**

Run: `npx tsc --noEmit && node --disable-warning=ExperimentalWarning --test --test-reporter=tap tests/provision.test.ts`
Expected: # fail 0

- [ ] **Step 5: Commit (performed by the orchestrator, no agent runs this)**

Message: `feat: provision the people, agents and rooms`


---

### Task 3.2: The Compose overlay and stack library

**Files:**
- Create: `lib/stack.sh`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `deploy/compose.airlock.yaml`
- Test:   `tests/stack-lib.test.ts`

**Depends on:** Task 1.8, Task 2.2, Task 2.3, Task 2.4, Task 2.8, Task 3.1
**Effort:** medium
**Model tier:** top
**Provides:** `lib/stack.sh: stack_require_docker; stack_fetch_upstream; stack_write_env <project>; stack_check_ports; stack_compose <compose args>, using STACK_ROOT, STACK_PROJECT, STACK_ENV and an optional array STACK_EXTRA_ARGS`, `Dockerfile targets: agents, reader, reader-model`, `deploy/compose.airlock.yaml services: provision, courier, treasury, mock-bank, reader, proof-runner (profile proof), reading AIRLOCK_OWNERS, EJECT_GRACE_MS, READER_MODE, READER_TARGET, READER_IMAGE, HIJACK_SET, HIJACK_PACE_MS, BANK_TOKEN, AIRLOCK_LEDGER_PORT. proof-runner mounts state_runner at /state and proof_out at /out, read-only`
**Requires:** `the provision process: node src/provision/main.ts, which writes one volume per agent. Each agent mounts its own at /state and reads /state/agent.json. proof-runner reads /state/desk.json`, `the courier process: node src/courier/main.ts`, `the treasury process: node src/treasury/main.ts`, `the reader process: node src/reader/main.ts`, `POST /payments, GET /ledger.json, GET / on port 9000`, `fixtures/invoices/INV-1042.pdf, fixtures/invoices/INV-2091.pdf`, `fixtures/extractions/poisoned-sha256.txt`

`reader` sits only on the internal `reader_net`, which it shares with `switch`, so it can reach nothing else. Only `treasury` and `mock-bank` get `BANK_TOKEN`. The upstream file is downloaded and its SHA-256 checked, and it is never committed.

Upstream signatures, pasted from their providers:

```text
the provision process: node src/provision/main.ts, which writes one volume per agent. Each agent mounts its own at /state and reads /state/agent.json. proof-runner reads /state/desk.json
the courier process: node src/courier/main.ts
the treasury process: node src/treasury/main.ts
the reader process: node src/reader/main.ts
POST /payments, GET /ledger.json, GET / on port 9000
fixtures/invoices/INV-1042.pdf, fixtures/invoices/INV-2091.pdf
fixtures/extractions/poisoned-sha256.txt
```

- [ ] **Step 1: Write the failing test**

`tests/stack-lib.test.ts`

```ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const runDir = mkdtempSync(join(tmpdir(), 'airlock-stack-'));
after(() => rmSync(runDir, { recursive: true, force: true }));

const ports = {
  AIRLOCK_API_PORT: '24031',
  AIRLOCK_GATEWAY_PORT: '24032',
  AIRLOCK_MATTERMOST_PORT: '24033',
  AIRLOCK_POSTGRES_PORT: '24034',
  AIRLOCK_LEDGER_PORT: '24035',
};

function shell(script: string): { code: number; out: string; err: string } {
  const result = spawnSync('bash', ['-c', `set -u; . lib/stack.sh; ${script}`], {
    encoding: 'utf8',
    env: { ...process.env, ...ports, STACK_RUN_DIR: runDir },
  });
  return { code: result.status ?? 1, out: result.stdout, err: result.stderr };
}

test('random hex has the asked-for length and differs each time', () => {
  const first = shell('stack_random_hex 24').out;
  const second = shell('stack_random_hex 24').out;
  assert.match(first, /^[0-9a-f]{48}$/);
  assert.notEqual(first, second);
});

test('the env file is private, carries the ports and a fresh bank token, and is not overwritten', () => {
  assert.equal(shell('stack_write_env one').code, 0);
  const path = join(runDir, 'one', '.env');
  assert.equal(statSync(path).mode & 0o777, 0o600);
  const text = readFileSync(path, 'utf8');
  assert.ok(text.includes('SWITCH_VERSION=0.31.0'));
  assert.ok(text.includes('API_HOST_PORT=24031'));
  assert.ok(text.includes('MATTERMOST_HOST_PORT=24033'));
  assert.ok(text.includes('AIRLOCK_LEDGER_PORT=24035'));
  assert.match(text, /^BANK_TOKEN=[0-9a-f]{48}$/m);
  assert.match(text, /^SECRET_KEYS=k1:[0-9a-f]{64}$/m);
  shell('stack_write_env one');
  assert.equal(readFileSync(path, 'utf8'), text);
});

test('a busy port names the variable to change', async () => {
  const server = createServer();
  await new Promise<void>((resolve) => { server.listen(24033, '127.0.0.1', resolve); });
  const busy = spawnSync('bash', ['-c', '. lib/stack.sh; stack_check_ports'], {
    encoding: 'utf8',
    env: { ...process.env, ...ports, STACK_RUN_DIR: runDir },
  });
  server.close();
  assert.equal(busy.status, 1);
  assert.match(busy.stderr, /Port 24033 is already in use\. Set AIRLOCK_MATTERMOST_PORT/);
});

test('free ports pass', () => {
  assert.equal(shell('stack_check_ports').code, 0);
});

test('a cached upstream file with the wrong bytes is not trusted', () => {
  const path = join(runDir, 'upstream-compose.yml');
  writeFileSync(path, 'tampered');
  const hash = shell(`stack_sha256 "${path}"`).out.trim();
  assert.notEqual(hash, 'cba238878078cf3d77fd9e136ef432f1ce5fd1bfe597acd172b9faa6720f0121');
  rmSync(path);
});
```


- [ ] **Step 2: Run to confirm it fails**

Run: `node --disable-warning=ExperimentalWarning --test --test-reporter=tap tests/stack-lib.test.ts`
Expected: FAIL because lib/stack.sh does not exist yet

- [ ] **Step 3: Minimal implementation**

`lib/stack.sh`

```bash
# Shared by prove.sh, demo.sh and scripts/stack-check.sh. Source it after setting the AIRLOCK_* ports.
SWITCH_TAG="switch-v0.31.0"
SWITCH_VERSION="0.31.0"
UPSTREAM_SHA256="cba238878078cf3d77fd9e136ef432f1ce5fd1bfe597acd172b9faa6720f0121"
UPSTREAM_URL="https://raw.githubusercontent.com/sandbox-quantum/switch/$SWITCH_TAG/deploy/local/standalone-docker-compose.yml"
STACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_RUN_DIR="${STACK_RUN_DIR:-$STACK_ROOT/.run}"
STACK_UPSTREAM="$STACK_RUN_DIR/upstream-compose.yml"

stack_random_hex() {
  head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
}

stack_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# Downloads Switch's Compose file rather than committing it, and refuses any other bytes.
stack_fetch_upstream() {
  mkdir -p "$STACK_RUN_DIR"
  if [ -f "$STACK_UPSTREAM" ] && [ "$(stack_sha256 "$STACK_UPSTREAM")" = "$UPSTREAM_SHA256" ]; then
    return 0
  fi
  curl -fsSL -o "$STACK_UPSTREAM" "$UPSTREAM_URL" || { echo "Could not download $UPSTREAM_URL" >&2; return 1; }
  if [ "$(stack_sha256 "$STACK_UPSTREAM")" != "$UPSTREAM_SHA256" ]; then
    echo "The downloaded Compose file does not match the pinned hash." >&2
    rm -f "$STACK_UPSTREAM"
    return 1
  fi
}

# Throwaway secrets, one set per project, git-ignored and mode 600.
stack_write_env() {
  local project="$1" dir="$STACK_RUN_DIR/$1"
  mkdir -p "$dir"
  STACK_ENV="$dir/.env"
  STACK_PROJECT="$project"
  [ -f "$STACK_ENV" ] && return 0
  ( umask 077; cat > "$STACK_ENV" <<ENV
SWITCH_VERSION=$SWITCH_VERSION
API_HOST_PORT=$AIRLOCK_API_PORT
GATEWAY_HOST_PORT=$AIRLOCK_GATEWAY_PORT
MATTERMOST_HOST_PORT=$AIRLOCK_MATTERMOST_PORT
POSTGRES_HOST_PORT=$AIRLOCK_POSTGRES_PORT
AIRLOCK_LEDGER_PORT=$AIRLOCK_LEDGER_PORT
DB_OWNER_USER=postgres
DB_OWNER_PASSWORD=$(stack_random_hex 24)
DB_USER=switch_app
DB_PASSWORD=$(stack_random_hex 24)
DB_NAME=switch
AGENT_REGISTRATION_TOKEN=$(stack_random_hex 24)
SECRET_KEYS=k1:$(stack_random_hex 32)
GATEWAY_ADMIN_EMAIL=admin@switch.local
GATEWAY_ADMIN_PASSWORD=$(stack_random_hex 16)
FRONTEND_BASE_URL=http://localhost:$AIRLOCK_GATEWAY_PORT
MATTERMOST_ADMIN_USER=admin
MATTERMOST_ADMIN_PASSWORD=Mm-$(stack_random_hex 12)!
MATTERMOST_TEAM_NAME=switch
MATTERMOST_USER=user
MATTERMOST_USER_PASSWORD=Mm-$(stack_random_hex 12)!
TELEMETRY_ENABLED=false
THIRD_PARTY_AVATARS_ENABLED=false
BANK_TOKEN=$(stack_random_hex 24)
ENV
  )
}

stack_compose() {
  docker compose -p "$STACK_PROJECT" --project-directory "$STACK_ROOT" --env-file "$STACK_ENV" \
    --profile collab --profile gateway \
    -f "$STACK_UPSTREAM" -f "$STACK_ROOT/deploy/compose.airlock.yaml" ${STACK_EXTRA_ARGS[@]+"${STACK_EXTRA_ARGS[@]}"} "$@"
}

# Says which variable to set rather than letting Compose fail on a busy port.
stack_check_ports() {
  local pair name port
  for pair in "AIRLOCK_API_PORT=$AIRLOCK_API_PORT" "AIRLOCK_GATEWAY_PORT=$AIRLOCK_GATEWAY_PORT" \
              "AIRLOCK_MATTERMOST_PORT=$AIRLOCK_MATTERMOST_PORT" "AIRLOCK_POSTGRES_PORT=$AIRLOCK_POSTGRES_PORT" \
              "AIRLOCK_LEDGER_PORT=$AIRLOCK_LEDGER_PORT"; do
    name="${pair%%=*}"
    port="${pair##*=}"
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      echo "Port $port is already in use. Set $name to a free port and run this again." >&2
      return 1
    fi
  done
}

stack_require_docker() {
  if ! docker compose version >/dev/null 2>&1; then
    echo "This needs Docker with the Compose plugin." >&2
    return 1
  fi
}
```

`Dockerfile`

```text
# All images run as a non-root user. There are no runtime npm dependencies: Node 22 strips the types.
FROM node:22-slim AS base
WORKDIR /app
RUN mkdir -p /state/reader /state/courier /state/treasury /state/runner /out \
  && chown -R node:node /state /out
COPY package.json ./
COPY src ./src

FROM base AS agents
COPY fixtures/desk ./fixtures/desk
COPY fixtures/invoices ./fixtures/invoices
COPY switch ./switch
USER node

# No vendor master and no model in this image.
FROM base AS reader
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
COPY fixtures/desk/purchase-orders.json fixtures/desk/goods-receipts.json ./fixtures/desk/
COPY fixtures/extractions ./fixtures/extractions
USER node

# Only demo.sh up --model builds this one.
FROM reader AS reader-model
USER root
RUN npm install -g @anthropic-ai/claude-code@2.1.318
USER node
```

`.dockerignore`

```text
.git
.run
.taste-skill
node_modules
proof-output
docs
site
tests
```

`deploy/compose.airlock.yaml`

```yaml
# Laid over Switch's published standalone Compose file, which lib/stack.sh downloads at a pinned tag.
x-agent: &agent
  image: airlock-agents:local
  build:
    context: .
    target: agents
  restart: on-failure

x-switch-env: &switch-env
  SWITCH_URL: http://switch:8000

services:
  mattermost:
    environment:
      # As shipped, refusals hide behind "1 reply". This puts them inline, on screen.
      MM_SERVICESETTINGS_COLLAPSEDTHREADS: disabled

  switch:
    networks:
      default: {}
      reader_net: {}

  provision:
    <<: *agent
    command: ["node", "--disable-warning=ExperimentalWarning", "src/provision/main.ts"]
    restart: "no"
    environment:
      <<: *switch-env
      MATTERMOST_URL: http://mattermost:8065
      GATEWAY_ADMIN_EMAIL: ${GATEWAY_ADMIN_EMAIL}
      GATEWAY_ADMIN_PASSWORD: ${GATEWAY_ADMIN_PASSWORD}
      MATTERMOST_ADMIN_USER: ${MATTERMOST_ADMIN_USER}
      MATTERMOST_ADMIN_PASSWORD: ${MATTERMOST_ADMIN_PASSWORD}
      MATTERMOST_TEAM_NAME: ${MATTERMOST_TEAM_NAME}
      AIRLOCK_OWNERS: ${AIRLOCK_OWNERS:-two}
    volumes:
      - state_reader:/state/reader
      - state_courier:/state/courier
      - state_treasury:/state/treasury
      - state_runner:/state/runner
    depends_on:
      - switch
      - mattermost

  courier:
    <<: *agent
    command: ["node", "--disable-warning=ExperimentalWarning", "src/courier/main.ts"]
    environment:
      <<: *switch-env
      EJECT_GRACE_MS: ${EJECT_GRACE_MS:-10000}
    volumes:
      - state_courier:/state
    depends_on:
      provision:
        condition: service_completed_successfully

  treasury:
    <<: *agent
    command: ["node", "--disable-warning=ExperimentalWarning", "src/treasury/main.ts"]
    environment:
      <<: *switch-env
      BANK_URL: http://mock-bank:9000
      BANK_TOKEN: ${BANK_TOKEN}
    networks:
      default: {}
      vault: {}
    volumes:
      - state_treasury:/state
    depends_on:
      provision:
        condition: service_completed_successfully
      mock-bank:
        condition: service_started

  mock-bank:
    <<: *agent
    command: ["node", "--disable-warning=ExperimentalWarning", "src/bank/main.ts"]
    environment:
      BANK_TOKEN: ${BANK_TOKEN}
    networks:
      vault: {}
    ports:
      - "${SWITCH_BIND_ADDR:-127.0.0.1}:${AIRLOCK_LEDGER_PORT:-28090}:9000"

  reader:
    image: ${READER_IMAGE:-airlock-reader:local}
    build:
      context: .
      target: ${READER_TARGET:-reader}
    restart: on-failure
    command: ["node", "--disable-warning=ExperimentalWarning", "src/reader/main.ts"]
    environment:
      <<: *switch-env
      READER_MODE: ${READER_MODE:-fixture}
      HIJACK_SET: ${HIJACK_SET:-full}
      HIJACK_PACE_MS: ${HIJACK_PACE_MS:-0}
    # Only the Switch API is reachable from here: no bank, no database, no Mattermost.
    networks:
      reader_net: {}
    volumes:
      - state_reader:/state
      - proof_out:/out
    depends_on:
      provision:
        condition: service_completed_successfully

  proof-runner:
    <<: *agent
    profiles: ["proof"]
    command: ["node", "--disable-warning=ExperimentalWarning", "src/proof/main.ts"]
    restart: "no"
    environment:
      <<: *switch-env
      MATTERMOST_URL: http://mattermost:8065
      BANK_URL: http://mock-bank:9000
      EJECT_GRACE_MS: ${EJECT_GRACE_MS:-10000}
    networks:
      default: {}
      vault: {}
    volumes:
      - state_runner:/state:ro
      - proof_out:/out:ro
    depends_on:
      provision:
        condition: service_completed_successfully

networks:
  reader_net:
    internal: true
  vault: {}

volumes:
  state_reader:
  state_courier:
  state_treasury:
  state_runner:
  proof_out:
```


- [ ] **Step 4: Run to confirm it passes**

Run: `node --disable-warning=ExperimentalWarning --test --test-reporter=tap tests/stack-lib.test.ts`
Expected: # fail 0

- [ ] **Step 5: Commit (performed by the orchestrator, no agent runs this)**

Message: `feat: add the Compose overlay and stack library`


---

### Task 3.3: Prove the stack on a fresh run

**Files:**
- Create: `src/proof/world.ts`
- Create: `src/proof/stack-check.ts`
- Create: `scripts/stack-check.sh`

**Depends on:** Task 1.8, Task 1.9, Task 2.1, Task 3.1, Task 3.2
**Effort:** high
**Model tier:** top
**Provides:** `src/proof/world.ts: export type World = { desk: DeskState; bankUrl: string; admin: GatewaySession; controllerGateway: GatewaySession; clerk: MattermostSession; controller: MattermostSession; intakeChannel: string; releaseChannel: string; };`, `src/proof/world.ts: export async function openWorld(statePath: string, switchUrl: string, mattermostUrl: string, bankUrl: string): Promise<World>`, `src/proof/world.ts: export async function roomDetail(world: World, roomId: string): Promise<RoomDetail | null>`, `src/proof/world.ts: export async function roster(world: World, roomId: string): Promise<string[] | null>`, `src/proof/world.ts: export async function ledger(world: World): Promise<LedgerView | null>`, `src/proof/world.ts: export async function waitUntil(label: string, check: () => Promise<boolean>, budgetMs: number, log: (line: string) => void, stepMs = 500): Promise<boolean>`, `src/proof/world.ts: export async function waitForAgents(world: World, budgetMs: number, log: (line: string) => void): Promise<boolean>`
**Requires:** `src/bank/ledger.ts: export type LedgerView = { opening_balance_cents: number; balance_cents: number; entries: LedgerEntry[] };`, `src/provision/desk-state.ts: export type DeskState = { owners: 'two' | 'single'; team: string; bridgeId: string; admin: { email: string; password: string }; people: { clerk: Person; controller: Person }; rooms: { intake: string; release: string }; agents: { reader: string; courier: string; treasury: string }; };`, `src/switch/gateway.ts: export class GatewaySession { constructor(baseUrl: string); login(email: string, password: string): Promise<HttpResult>; request(method: string, path: string, body?: unknown): Promise<HttpResult> }`, `src/switch/gateway.ts: export function must(result: HttpResult, label: string): Record<string, unknown>`, `src/switch/mattermost.ts: export class MattermostSession { userId; constructor(baseUrl: string); login(username: string, password: string): Promise<boolean>; request(method: string, path: string, body?: unknown): Promise<HttpResult>; channelId(team: string, channel: string): Promise<string | null>; postMessage(channelId: string, message: string, fileIds: string[] = []): Promise<string>; uploadAndPost(channelId: string, message: string, filename: string, bytes: Buffer): Promise<string>; posts(channelId: string): Promise<Post[]>; clientConfig(): Promise<Record<string, string>> }`, `src/switch/state.ts: export function requireEnv(name: string): string`, `deploy/compose.airlock.yaml services: provision, courier, treasury, mock-bank, reader, proof-runner (profile proof), reading AIRLOCK_OWNERS, EJECT_GRACE_MS, READER_MODE, READER_TARGET, READER_IMAGE, HIJACK_SET, HIJACK_PACE_MS, BANK_TOKEN, AIRLOCK_LEDGER_PORT. proof-runner mounts state_runner at /state and proof_out at /out, read-only`, `lib/stack.sh: stack_require_docker; stack_fetch_upstream; stack_write_env <project>; stack_check_ports; stack_compose <compose args>, using STACK_ROOT, STACK_PROJECT, STACK_ENV and an optional array STACK_EXTRA_ARGS`

This is the first Docker-gated task. The first run pulls Switch's images and can take over 10 minutes, so run the gate in the background with a long timeout. It proves four things that were only read in source: greetings can be turned off, an attachment downloads through the media route, a template creates a private room, and `MM_SERVICESETTINGS_COLLAPSEDTHREADS` takes effect. **If any of those is false, that is a plan bug, not an implementation miss. Report `RESULT: BLOCKED` with the check's output, so it goes back to the architect.**

Upstream signatures, pasted from their providers:

```text
src/bank/ledger.ts: export type LedgerView = { opening_balance_cents: number; balance_cents: number; entries: LedgerEntry[] };
src/provision/desk-state.ts: export type DeskState = { owners: 'two' | 'single'; team: string; bridgeId: string; admin: { email: string; password: string }; people: { clerk: Person; controller: Person }; rooms: { intake: string; release: string }; agents: { reader: string; courier: string; treasury: string }; };
src/switch/gateway.ts: export class GatewaySession { constructor(baseUrl: string); login(email: string, password: string): Promise<HttpResult>; request(method: string, path: string, body?: unknown): Promise<HttpResult> }
src/switch/gateway.ts: export function must(result: HttpResult, label: string): Record<string, unknown>
src/switch/mattermost.ts: export class MattermostSession { userId; constructor(baseUrl: string); login(username: string, password: string): Promise<boolean>; request(method: string, path: string, body?: unknown): Promise<HttpResult>; channelId(team: string, channel: string): Promise<string | null>; postMessage(channelId: string, message: string, fileIds: string[] = []): Promise<string>; uploadAndPost(channelId: string, message: string, filename: string, bytes: Buffer): Promise<string>; posts(channelId: string): Promise<Post[]>; clientConfig(): Promise<Record<string, string>> }
src/switch/state.ts: export function requireEnv(name: string): string
deploy/compose.airlock.yaml services: provision, courier, treasury, mock-bank, reader, proof-runner (profile proof), reading AIRLOCK_OWNERS, EJECT_GRACE_MS, READER_MODE, READER_TARGET, READER_IMAGE, HIJACK_SET, HIJACK_PACE_MS, BANK_TOKEN, AIRLOCK_LEDGER_PORT. proof-runner mounts state_runner at /state and proof_out at /out, read-only
lib/stack.sh: stack_require_docker; stack_fetch_upstream; stack_write_env <project>; stack_check_ports; stack_compose <compose args>, using STACK_ROOT, STACK_PROJECT, STACK_ENV and an optional array STACK_EXTRA_ARGS
```

- [ ] **Step 1: Write the files**

`src/proof/world.ts`

```ts
import { readFileSync } from 'node:fs';
import type { LedgerView } from '../bank/ledger.ts';
import type { DeskState } from '../provision/desk-state.ts';
import { GatewaySession, must } from '../switch/gateway.ts';
import { MattermostSession } from '../switch/mattermost.ts';

export type World = {
  desk: DeskState;
  bankUrl: string;
  admin: GatewaySession;
  controllerGateway: GatewaySession;
  clerk: MattermostSession;
  controller: MattermostSession;
  intakeChannel: string;
  releaseChannel: string;
};

type RoomDetail = { agent_ids?: string[]; agent_statuses?: Record<string, string>; read_visibility?: string; write_visibility?: string; channel_type?: string };

export async function openWorld(statePath: string, switchUrl: string, mattermostUrl: string, bankUrl: string): Promise<World> {
  const desk = JSON.parse(readFileSync(statePath, 'utf8')) as DeskState;
  const gatewayUrl = `${switchUrl}/gateway`;
  const mattermostApi = `${mattermostUrl}/api/v4`;
  const admin = new GatewaySession(gatewayUrl);
  must(await admin.login(desk.admin.email, desk.admin.password), 'admin login');
  const controllerGateway = new GatewaySession(gatewayUrl);
  must(await controllerGateway.login(desk.people.controller.email, desk.people.controller.gatewayPassword), 'controller login');
  const clerk = new MattermostSession(mattermostApi);
  if (!(await clerk.login('clerk', desk.people.clerk.mattermostPassword))) throw new Error('clerk Mattermost login failed');
  const controller = new MattermostSession(mattermostApi);
  if (!(await controller.login('controller', desk.people.controller.mattermostPassword))) throw new Error('controller Mattermost login failed');
  const intakeChannel = await clerk.channelId(desk.team, 'ap-intake');
  const releaseChannel = await controller.channelId(desk.team, 'ap-release');
  if (!intakeChannel || !releaseChannel) throw new Error('a channel is missing');
  return { desk, bankUrl, admin, controllerGateway, clerk, controller, intakeChannel, releaseChannel };
}

export async function roomDetail(world: World, roomId: string): Promise<RoomDetail | null> {
  const result = await world.admin.request('GET', `/rooms/${roomId}`);
  return result.status === 200 ? (result.body as RoomDetail) : null;
}

export async function roster(world: World, roomId: string): Promise<string[] | null> {
  return (await roomDetail(world, roomId))?.agent_ids ?? null;
}

export async function ledger(world: World): Promise<LedgerView | null> {
  try {
    const response = await fetch(`${world.bankUrl}/ledger.json`);
    return response.ok ? ((await response.json()) as LedgerView) : null;
  } catch {
    return null;
  }
}

export async function waitUntil(label: string, check: () => Promise<boolean>, budgetMs: number, log: (line: string) => void, stepMs = 500): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  log(`timed out after ${budgetMs} ms waiting for ${label}`);
  return false;
}

export async function waitForAgents(world: World, budgetMs: number, log: (line: string) => void): Promise<boolean> {
  const { rooms, agents } = world.desk;
  const up = (detail: RoomDetail | null, ids: string[]): boolean =>
    ids.every((id) => {
      const status = detail?.agent_statuses?.[id];
      return status !== undefined && status !== 'disconnected';
    });
  return waitUntil('every agent to connect', async () =>
    up(await roomDetail(world, rooms.intake), [agents.reader, agents.courier]) &&
    up(await roomDetail(world, rooms.release), [agents.treasury, agents.courier]), budgetMs, log, 1000);
}
```

`src/proof/stack-check.ts`

```ts
// Proves the facts the design took from source and docs: greetings off, attachments through the
// media route, a private ap-release from a template, and the clean path end to end.
import { readFileSync } from 'node:fs';
import { requireEnv } from '../switch/state.ts';
import { ledger, roomDetail, waitForAgents, waitUntil, openWorld } from './world.ts';

const log = (line: string): void => console.log(`[stack-check] ${line}`);
const failures: string[] = [];

function check(label: string, passed: boolean): void {
  log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures.push(label);
}

try {
  const world = await openWorld('/state/desk.json', requireEnv('SWITCH_URL'), requireEnv('MATTERMOST_URL'), requireEnv('BANK_URL'));
  const { clerk, controller, intakeChannel, releaseChannel, desk } = world;
  check('every agent connects', await waitForAgents(world, 120_000, log));

  const release = await roomDetail(world, desk.rooms.release);
  check('ap-release is private from its template', release?.channel_type === 'channel_private' && release.read_visibility === 'private' && release.write_visibility === 'private');
  const intake = await roomDetail(world, desk.rooms.intake);
  check('reader and courier are in ap-intake, and treasury is not', [desk.agents.reader, desk.agents.courier].every((id) => intake?.agent_ids?.includes(id)) && !intake?.agent_ids?.includes(desk.agents.treasury));
  const clerkView = await clerk.channelId(desk.team, 'ap-release');
  check('the clerk cannot see ap-release', clerkView === null);
  check('CollapsedThreads is disabled', (await clerk.clientConfig())['CollapsedThreads'] === 'disabled');

  const intakePosts = await clerk.posts(intakeChannel);
  const greetings = intakePosts.filter((p) => p.type === '' && ['reader', 'courier'].includes(p.username));
  check('agents do not greet when they join', greetings.length === 0);

  await clerk.uploadAndPost(intakeChannel, '@reader please read this invoice', 'INV-1042.pdf', readFileSync('fixtures/invoices/INV-1042.pdf'));
  check('reader reads the attachment through the media route and posts a packet', await waitUntil('the packet', async () => (await clerk.posts(intakeChannel)).some((p) => p.username === 'reader' && p.message.startsWith('AIRLOCK/1 ')), 60_000, log));
  check('courier clears it into ap-release', await waitUntil('the clearance', async () => (await controller.posts(releaseChannel)).some((p) => p.message.includes('**Cleared for payment: INV-1042**')), 30_000, log));

  await controller.postMessage(releaseChannel, '@treasury pay INV-1042');
  check('treasury pays on the controller\'s order', await waitUntil('the payment', async () => (await controller.posts(releaseChannel)).some((p) => p.message.startsWith('Paid INV-1042')), 30_000, log));
  check('the ledger moved once', (await ledger(world))?.entries.length === 1);
} catch (error) {
  failures.push(String(error));
  log(`FAIL ${String(error)}`);
}

if (failures.length > 0) {
  console.error(`[stack-check] FAILED: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('STACK CHECK PASS');
process.exit(0);
```

`scripts/stack-check.sh`

```bash
#!/usr/bin/env bash
# Stands up a fresh stack, proves the facts the design took from source, and tears it down.
set -uo pipefail
cd "$(dirname "$0")/.."

export AIRLOCK_API_PORT="${AIRLOCK_API_PORT:-28100}"
export AIRLOCK_GATEWAY_PORT="${AIRLOCK_GATEWAY_PORT:-23200}"
export AIRLOCK_MATTERMOST_PORT="${AIRLOCK_MATTERMOST_PORT:-28165}"
export AIRLOCK_POSTGRES_PORT="${AIRLOCK_POSTGRES_PORT:-25632}"
export AIRLOCK_LEDGER_PORT="${AIRLOCK_LEDGER_PORT:-28190}"
export AIRLOCK_OWNERS=two EJECT_GRACE_MS=10000 HIJACK_SET=full HIJACK_PACE_MS=0 READER_MODE=fixture

. lib/stack.sh
stack_require_docker || exit 2
stack_fetch_upstream || exit 2
rm -rf .run/airlock-check
stack_write_env airlock-check
stack_compose down -v --remove-orphans >/dev/null 2>&1
stack_check_ports || exit 2

if ! stack_compose up -d --build; then
  stack_compose ps -a
  stack_compose logs --tail=60
  stack_compose down -v --remove-orphans >/dev/null 2>&1
  exit 2
fi
stack_compose --profile proof run --rm -T proof-runner \
  node --disable-warning=ExperimentalWarning src/proof/stack-check.ts
code=$?
if [ "$code" != 0 ]; then
  stack_compose ps -a
  stack_compose logs --tail=60
fi
stack_compose down -v --remove-orphans >/dev/null 2>&1
rm -rf .run/airlock-check
exit "$code"
```


- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/stack-check.sh && test -x scripts/stack-check.sh && echo EXECUTABLE`
This step's output includes: EXECUTABLE

- [ ] **Step 3: Run to confirm it passes**

Run: `npx tsc --noEmit && ./scripts/stack-check.sh`
Expected: STACK CHECK PASS

- [ ] **Step 4: Commit (performed by the orchestrator, no agent runs this)**

Message: `feat: add the stack check`
