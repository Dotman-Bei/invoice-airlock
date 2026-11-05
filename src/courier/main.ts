import { loadDesk } from '../desk/data.ts';
import { AgentClient } from '../switch/agent-client.ts';
import { identityOf, readAgentState, requireEnv } from '../switch/state.ts';
import { Courier } from './courier.ts';

const state = readAgentState('/state/agent.json');
const { intake, release } = state.rooms;
if (!intake || !release) {
  console.error('courier state needs both rooms');
  process.exit(1);
}
const log = (line: string): void => console.log(line);
const client = new AgentClient({ baseUrl: requireEnv('SWITCH_URL'), identity: identityOf(state), filter: 'all', log });
const courier = new Courier({
  client,
  desk: loadDesk('fixtures/desk'),
  rooms: { intake, release },
  graceMs: Number(process.env['EJECT_GRACE_MS'] ?? 10000),
  startedAt: Date.now(),
  log,
});
await client.start((frame) => courier.onFrame(frame), (reason) => {
  console.error(`evicted: ${reason}`);
  process.exit(1);
});
await courier.recover();
const backfillMs = Number(process.env['BACKFILL_MS'] ?? 5000);
setInterval(() => {
  courier.backfill().catch((error: unknown) => log(`[courier] backfill failed: ${String(error)}`));
}, backfillMs);
log('[courier] running');
