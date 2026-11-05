import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { LedgerEntry, PaymentRequest } from '../bank/ledger.ts';
import { AgentClient } from '../switch/agent-client.ts';
import { identityOf, readAgentState, requireEnv } from '../switch/state.ts';
import { Treasury, type BankResult } from './treasury.ts';

const BASELINE_PATH = '/state/rooms-baseline.json';
const state = readAgentState('/state/agent.json');
const { release, intake } = state.rooms;
if (!release || !intake) {
  console.error('treasury state needs both rooms');
  process.exit(1);
}
const bankUrl = requireEnv('BANK_URL');
const bankToken = requireEnv('BANK_TOKEN');
const log = (line: string): void => console.log(line);

async function pay(payment: PaymentRequest): Promise<BankResult> {
  const response = await fetch(`${bankUrl}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bankToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  if (response.status !== 201) return { status: response.status, entry: null };
  const entry = (await response.json()) as LedgerEntry;
  return { status: 201, entry: entry.entry };
}

const client = new AgentClient({ baseUrl: requireEnv('SWITCH_URL'), identity: identityOf(state), filter: 'addressed', log });
const treasury = new Treasury({
  client,
  bank: pay,
  releaseRoom: release,
  intakeRoom: intake,
  baseline: {
    load: () => (existsSync(BASELINE_PATH) ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as string[]) : null),
    save: (roomIds) => writeFileSync(BASELINE_PATH, JSON.stringify(roomIds), { mode: 0o600 }),
  },
  log,
});
await client.start((frame) => treasury.onFrame(frame), (reason) => {
  console.error(`evicted: ${reason}`);
  process.exit(1);
});
const pollMs = Number(process.env['ROOM_POLL_MS'] ?? 3000);
await treasury.pollRooms();
setInterval(() => {
  treasury.pollRooms().catch((error: unknown) => log(`[treasury] poll failed: ${String(error)}`));
}, pollMs);
log('[treasury] running');
