// Reads the approved demo script (single source of the words and seconds) and the two committed
// proof reports, and writes src/generated/data.json. Nothing on a card is typed by hand.
// Fails loudly if a proof report no longer says what the script's S8 and S9 claim.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import QRCode from 'qrcode';

const here = path.dirname(fileURLToPath(import.meta.url));
const demoDir = path.resolve(here, '..', '..'); // docs/demo
const docsDir = path.resolve(demoDir, '..'); // docs
const read = (f) => readFileSync(f, 'utf8').replace(/\r/g, '');

const scriptName = readdirSync(demoDir).filter((f) => /-demo-script\.md$/.test(f)).sort().pop();
const lines = read(path.join(demoDir, scriptName)).split('\n');

const narration = {};
for (const l of lines) {
  const m = l.match(/^\*\*(S\d+)\*\* — (.+)$/);
  if (m) narration[m[1]] = m[2].trim();
}
const scenes = [];
for (const l of lines) {
  const m = l.match(/^\| (S\d+) \| (\d+) \|/);
  if (m) scenes.push({ id: m[1], seconds: Number(m[2]), text: narration[m[1]] ?? '' });
}
if (scenes.length !== 11 || scenes.some((s) => !s.text)) {
  throw new Error(`expected 11 scenes with narration, got ${scenes.length}`);
}
const total = scenes.reduce((a, s) => a + s.seconds, 0);
if (total !== 170) throw new Error(`shot-list seconds sum to ${total}, expected 170`);

function parseProof(file) {
  const t = read(file).split('\n');
  const rows = t
    .filter((l) => /^\| (attack|control)-/.test(l))
    .map((l) => {
      const c = l.split('|').map((s) => s.trim());
      return { check: c[1], tried: c[2], result: c[3], evidence: c[4] };
    });
  const body = t.join('\n');
  const verdict = t.slice(1).find((l) => l.trim() && !l.startsWith('#')) ?? '';
  const owners = (body.match(/^Owners: (\w+)/m) ?? [])[1];
  const started = (body.match(/Started (\S+?)Z?\./m) ?? [])[1];
  const exit = Number((body.match(/^Exit code: (\d+)/m) ?? [])[1]);
  return { rows, verdict, owners, started, exit };
}
const proof = parseProof(path.join(docsDir, 'proof', 'proof-report.md'));
const single = parseProof(path.join(docsDir, 'proof', 'single-owner-report.md'));

// Gates for S8 and S9 (script section 3).
if (proof.rows.length !== 15 || proof.rows.some((r) => r.result !== 'Contained') || proof.exit !== 0 || proof.owners !== 'two') {
  throw new Error('proof-report.md no longer matches S8: expected 15 Contained rows, two owners, exit 0');
}
const breached = single.rows.filter((r) => r.result === 'BREACHED' && r.check.startsWith('attack-')).map((r) => r.check.replace('attack-', ''));
for (const n of ['2', '3', '4', '5', '8']) {
  if (!breached.includes(n)) throw new Error(`single-owner-report.md: attack ${n} is not breached, S9 would be wrong`);
}
if (single.exit !== 1 || single.owners !== 'single') throw new Error('single-owner-report.md: expected single owner, exit 1');
const hostile = single.rows.find((r) => r.check === 'control-hostile-ledger');
if (!hostile || hostile.result !== 'Contained' || !/entries 0/.test(hostile.evidence)) {
  throw new Error('single-owner-report.md: hostile-run ledger row is not "Contained, entries 0"');
}

const repoUrl = 'https://github.com/Dotman-Bei/invoice-airlock';
const qr = await QRCode.toDataURL(repoUrl, { margin: 1, width: 400, errorCorrectionLevel: 'M' });

mkdirSync(path.join(here, '..', 'src', 'generated'), { recursive: true });
writeFileSync(
  path.join(here, '..', 'src', 'generated', 'data.json'),
  JSON.stringify({ scenes, proof, single, repoUrl, qr, singleBreached: breached }, null, 2),
);
console.log(`data.json written: ${scenes.length} scenes, ${total} s; proof ${proof.rows.length} rows exit ${proof.exit}; single-owner breached attacks ${breached.join(',')}`);
