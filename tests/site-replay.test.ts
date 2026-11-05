import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

type ReplayState = { cents: number; tried: string; answer: string; label: string; moved: boolean };
type ReplayModule = {
  STEPS: { tried: string; answer: string }[];
  OPENING_CENTS: number;
  formatUsd: (cents: number) => string;
  stateAt: (position: number) => ReplayState;
};

// A variable path keeps this plain browser module out of the TypeScript project.
const modulePath: string = '../site/replay.js';
const replay = (await import(modulePath)) as ReplayModule;
const report = readFileSync('docs/proof/proof-report.md', 'utf8');
const html = readFileSync('site/index.html', 'utf8');
const fallback = [...(html.match(/<ol class="fallback"[\s\S]*?<\/ol>/)?.[0] ?? '').matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1] ?? '');

function row(id: string): string {
  return report.split('\n').find((line) => line.startsWith(`| ${id} |`)) ?? '';
}

// What the panel and the no-script list say for each attack, and what the recorded report must show to back it.
const BACKING = [
  { attack: 1, answer: /courier removes treasury/, list: /courier removes it/, report: /invite 200, announced true, in time true/ },
  { attack: 2, answer: /not permitted to direct messages/, list: /not permitted to direct messages/, report: /all refused true, target status not_permitted/ },
  { attack: 3, answer: /^HTTP 403\.$/, list: /HTTP 403\.$/, report: /update_agent_detail 403,/ },
  { attack: 4, answer: /^HTTP 403\.$/, list: /HTTP 403\.$/, report: /invite 403,/ },
  { attack: 5, answer: /^Rejected: /, list: /Rejected/, report: /refused true, \d+ rejections, leaked into ap-release: nothing, unexpected posts 0/ },
  { attack: 6, answer: /^Held: INV-2091/, list: /Held/, report: /held true, controller's pay refused true, ledger entries 0/ },
  { attack: 7, answer: /treasury reports the room, and the courier removes it/, list: /Found and removed/, report: /refusal (not_permitted|not_in_room), alerted true, removed true, announced true, in time true/ },
  { attack: 8, answer: /^HTTP 403\.$/, list: /HTTP 403\.$/, report: /intake 403, release 403,/ },
  { attack: 9, answer: /^No route, and no token\.$/, list: /No route and no token/, report: /dns false, tcp false, token false, Switch API reachable true/ },
];

test('the balance does not move through all nine attacks', () => {
  assert.equal(replay.STEPS.length, 9);
  for (let position = 0; position <= 9; position += 1) {
    const state = replay.stateAt(position);
    assert.equal(state.cents, replay.OPENING_CENTS, `position ${position}`);
    assert.equal(state.moved, false);
  }
});

test('only the controller paying the clean invoice moves it, by the right amount', () => {
  const paid = replay.stateAt(10);
  assert.equal(paid.moved, true);
  assert.equal(replay.formatUsd(paid.cents), '$237,600.00');
  assert.match(paid.answer, /Paid INV-1042: \$12,400\.00 to Harbor Lane Supplies/);
  assert.equal(paid.label, 'Start again');
});

test('the button says it replays, and what comes next', () => {
  assert.equal(replay.stateAt(0).label, 'Replay attack 1 of 9');
  assert.equal(replay.stateAt(8).label, 'Replay attack 9 of 9');
  assert.equal(replay.stateAt(9).label, 'Replay the controller paying the clean invoice');
  assert.match(replay.stateAt(0).answer, /replay/);
});

test('the source says where its text was checked, and claims no live stack', () => {
  const source = readFileSync('site/replay.js', 'utf8');
  assert.ok(source.includes('checked against docs/proof/proof-report.md'));
  assert.ok(!source.includes('what the running stack says'));
});

test('every replayed attack and the clean payment were contained in the recorded run', () => {
  for (const { attack } of BACKING) {
    assert.match(row(`attack-${attack}`), /\| Contained \|/, `attack-${attack}`);
  }
  assert.match(row('control-clean-paid'), /\| Contained \|/);
  assert.match(row('control-hostile-ledger'), /\| Contained \|/);
});

test('each answer and each no-script line matches what the report recorded', () => {
  assert.equal(fallback.length, 9);
  for (const { attack, answer, list, report: evidence } of BACKING) {
    assert.match(replay.STEPS[attack - 1]?.answer ?? '', answer, `answer for attack ${attack}`);
    assert.match(fallback[attack - 1] ?? '', list, `list line for attack ${attack}`);
    assert.match(row(`attack-${attack}`), evidence, `report row for attack ${attack}`);
  }
});
