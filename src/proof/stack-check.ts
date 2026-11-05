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
