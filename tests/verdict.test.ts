import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const dir = mkdtempSync(join(tmpdir(), 'airlock-verdict-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const md = join(dir, 'report.md');
const json = join(dir, 'report.json');

function report(exitCode: number, results: number): void {
  const rows = Array.from({ length: results }, (_, i) => ({ id: `check-${i}`, outcome: 'contained' }));
  writeFileSync(md, '| attack-3 | Open treasury to anyone | BREACHED | status 200 |\n');
  writeFileSync(json, JSON.stringify({ owners: 'two', exitCode, results: rows }));
}

function verdict(code: string): string {
  const result = spawnSync('bash', ['-c', `. lib/verdict.sh; verdict_code ${code} "${md}" "${json}"`], { encoding: 'utf8' });
  return result.stdout.trim();
}

test('a complete report with the same code stands', () => {
  report(0, 15);
  assert.equal(verdict('0'), '0');
  report(1, 15);
  assert.equal(verdict('1'), '1');
});

test('exit 0 with no report is not a pass', () => {
  writeFileSync(md, '');
  writeFileSync(json, '');
  assert.equal(verdict('0'), '2');
});

test('exit 1 from a crash is not an attack succeeding', () => {
  writeFileSync(md, '');
  writeFileSync(json, '');
  assert.equal(verdict('1'), '2');
});

test('a code that disagrees with the report has no verdict', () => {
  report(1, 15);
  assert.equal(verdict('0'), '2');
});

test('a report missing results has no verdict', () => {
  report(0, 14);
  assert.equal(verdict('0'), '2');
});

test('other runner codes have no verdict', () => {
  report(0, 15);
  for (const code of ['2', '125', '137']) {
    assert.equal(verdict(code), '2');
  }
});

test('a breach is found by its check id only', () => {
  report(1, 15);
  const named = (id: string) => spawnSync('bash', ['-c', `. lib/verdict.sh; verdict_names_breach ${id} "${md}"`]).status;
  assert.equal(named('attack-3'), 0);
  assert.equal(named('attack-4'), 1);
});
