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
