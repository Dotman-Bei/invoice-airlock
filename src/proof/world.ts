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
