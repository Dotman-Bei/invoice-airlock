import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

test('a failed pull is tried again, and gives up after five attempts', () => {
  const bin = join(runDir, 'fake-bin');
  mkdirSync(bin);
  const count = join(runDir, 'pull-count');
  writeFileSync(join(bin, 'docker'), `#!/bin/sh\necho pull >> "${count}"\n[ "$(wc -l < "${count}")" -ge "$FAKE_PASS_AT" ]\n`, { mode: 0o755 });
  const pull = (passAt: string) => {
    rmSync(count, { force: true });
    return spawnSync('bash', ['-c', '. lib/stack.sh; STACK_PROJECT=x; STACK_ENV=y; stack_pull'], {
      encoding: 'utf8',
      env: { ...process.env, ...ports, STACK_RUN_DIR: runDir, STACK_PULL_DELAY_S: '0', FAKE_PASS_AT: passAt, PATH: `${bin}:${process.env['PATH']}` },
    });
  };
  const attempts = () => readFileSync(count, 'utf8').trim().split('\n').length;

  assert.equal(pull('3').status, 0);
  assert.equal(attempts(), 3);

  const never = pull('99');
  assert.equal(never.status, 1);
  assert.match(never.stderr, /Could not pull the images/);
  assert.equal(attempts(), 5);
});

test('a cached upstream file with the wrong bytes is not trusted', () => {
  const path = join(runDir, 'upstream-compose.yml');
  writeFileSync(path, 'tampered');
  const hash = shell(`stack_sha256 "${path}"`).out.trim();
  assert.notEqual(hash, 'cba238878078cf3d77fd9e136ef432f1ce5fd1bfe597acd172b9faa6720f0121');
  rmSync(path);
});
