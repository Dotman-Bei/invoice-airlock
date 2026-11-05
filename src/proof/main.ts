import { requireEnv } from '../switch/state.ts';
import { assess, exitCodeFor } from './assess.ts';
import { reportOutput } from './report.ts';
import { collectEvidence } from './run.ts';
import { openWorld } from './world.ts';

const log = (line: string): void => console.log(`[proof] ${line}`);

try {
  const startedAt = new Date().toISOString();
  const world = await openWorld('/state/desk.json', requireEnv('SWITCH_URL'), requireEnv('MATTERMOST_URL'), requireEnv('BANK_URL'));
  const evidence = await collectEvidence(world, {
    hijackLog: process.env['HIJACK_LOG'] ?? '/out/hijack.jsonl',
    invoicesDir: 'fixtures/invoices',
    graceMs: Number(process.env['EJECT_GRACE_MS'] ?? 10000),
    log,
  });
  if (evidence === null) {
    console.error('[proof] the stack or the hijack never finished, so there is no verdict');
    process.exit(2);
  }
  const results = assess(evidence);
  console.log(reportOutput(results, { owners: world.desk.owners, startedAt, finishedAt: new Date().toISOString() }));
  process.exit(exitCodeFor(results));
} catch (error) {
  console.error(`[proof] harness failure: ${String(error)}`);
  process.exit(2);
}
