import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { readHijackLog } from '../src/proof/run.ts';

const dir = mkdtempSync(join(tmpdir(), 'airlock-log-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const line = { attack: 1, step: 'invite', op: 'invite_agent_to_room', status: 200, body: {} };

test('no file yet is an empty log', () => {
  assert.deepEqual(readHijackLog(join(dir, 'missing.jsonl')), []);
});

test('complete lines are read in order', () => {
  const path = join(dir, 'whole.jsonl');
  writeFileSync(path, `${JSON.stringify(line)}\n${JSON.stringify({ ...line, step: 'done' })}\n`);
  assert.deepEqual(readHijackLog(path).map((l) => l.step), ['invite', 'done']);
});

test('a line still being written is left for the next read', () => {
  const path = join(dir, 'torn.jsonl');
  writeFileSync(path, `${JSON.stringify(line)}\n{"attack":2,"st`);
  assert.deepEqual(readHijackLog(path).map((l) => l.step), ['invite']);
  appendFileSync(path, 'ep":"mention","op":"post_message","status":200,"body":{}}\n');
  assert.deepEqual(readHijackLog(path).map((l) => l.step), ['invite', 'mention']);
});
