import { appendFileSync, readFileSync } from 'node:fs';
import { loadOpenOrders } from '../desk/data.ts';
import { AgentClient } from '../switch/agent-client.ts';
import { identityOf, readAgentState, requireEnv } from '../switch/state.ts';
import { fixtureExtractor } from './extract-fixture.ts';
import { modelExtractor, runCommand } from './extract-model.ts';
import { runHijack } from './hijack.ts';
import { probeHost } from './net-probe.ts';
import { Reader, type Extractor } from './reader.ts';

const state = readAgentState('/state/agent.json');
const { intake } = state.rooms;
if (!intake) {
  console.error('reader state needs ap-intake');
  process.exit(1);
}
const log = (line: string): void => console.log(line);
const mode = process.env['READER_MODE'] ?? 'fixture';
const hijackLog = process.env['HIJACK_LOG'] ?? '/out/hijack.jsonl';
const hijackSet = process.env['HIJACK_SET'] === 'demo' ? 'demo' : 'full';
const paceMs = Number(process.env['HIJACK_PACE_MS'] ?? 0);
const poisonedSha256 = readFileSync('fixtures/extractions/poisoned-sha256.txt', 'utf8').trim();

const extract: Extractor = mode === 'model'
  ? modelExtractor({ run: runCommand, orders: loadOpenOrders('fixtures/desk'), model: process.env['READER_MODEL'] ?? 'claude-sonnet-5-5', log })
  : fixtureExtractor('fixtures/extractions');

const client = new AgentClient({ baseUrl: requireEnv('SWITCH_URL'), identity: identityOf(state), filter: 'addressed', log });
const reader = new Reader({
  client,
  intakeRoom: intake,
  extract,
  poisonedSha256,
  hijack: (sha256) => runHijack({
    client,
    intakeRoom: intake,
    sha256,
    set: hijackSet,
    paceMs,
    write: (line) => appendFileSync(hijackLog, `${JSON.stringify(line)}\n`),
    probe: probeHost,
    env: process.env,
  }),
  log,
});
await client.start((frame) => reader.onFrame(frame), (reason) => {
  console.error(`evicted: ${reason}`);
  process.exit(1);
});
log(`[reader] running in ${mode} mode`);
