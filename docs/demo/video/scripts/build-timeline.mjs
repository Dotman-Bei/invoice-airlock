// Builds src/generated/timeline.json (audio-first scene timing) and stages media into public/.
// Scene length = lead + spoken narration + tail, from the Kokoro audio. Footage scenes are cut from the
// take by edl.json; a "fill" hold absorbs the difference. The build fails if the cut contradicts the
// recorded beats, or if the total reaches the 2:58 ceiling.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => JSON.parse(readFileSync(path.join(root, ...p), 'utf8'));
const data = read('src', 'generated', 'data.json');
const edl = read('edl.json');
const beats = Object.fromEntries(read('captures', `run-${edl.run}`, 'beats.json').beats.map((b) => [b.id, b.t]));
const FPS = edl.fps;
const CEILING_S = 178; // fail at or over 2:58 (the form needs under 3:00)
const fr = (s) => Math.round(s * FPS);

mkdirSync(path.join(root, 'public', 'captures'), { recursive: true });
mkdirSync(path.join(root, 'public', 'audio'), { recursive: true });
for (const role of ['clerk', 'controller', 'ledger']) {
  copyFileSync(path.join(root, 'captures', `run-${edl.run}`, `${role}.mp4`), path.join(root, 'public', 'captures', `${role}.mp4`));
}

let cursor = 0;
const scenes = [];
for (const s of data.scenes) {
  const wordsFile = read('audio', `${s.id}.words.json`);
  copyFileSync(path.join(root, 'audio', `${s.id}.wav`), path.join(root, 'public', 'audio', `${s.id}.wav`));
  const frames = fr(edl.leadS + wordsFile.duration + edl.tailS);
  const scene = { id: s.id, from: cursor, frames, leadFrames: fr(edl.leadS), audio: `audio/${s.id}.wav`, spoken: wordsFile.duration, words: wordsFile.words, text: s.text };
  const plan = edl.scenes[s.id];
  if (plan) {
    // pieces: live (take range) or hold (one static take frame). Exactly one fill piece absorbs the rest.
    const pieces = plan.pieces.map((p, i) => {
      if (p.live) {
        const [a, b] = p.live;
        for (const id of p.includes ?? []) if (!(beats[id] >= a - 0.01 && beats[id] <= b + 0.6)) throw new Error(`${s.id} piece ${i}: beat "${id}" (${beats[id]}s) is not inside live ${a}-${b}`);
        for (const id of p.excludes ?? []) if (beats[id] >= a && beats[id] < b - 0.4) throw new Error(`${s.id} piece ${i}: beat "${id}" (${beats[id]}s) falls inside live ${a}-${b} but must not`);
        return { kind: 'live', trimBefore: fr(a), trimAfter: fr(b), frames: fr(b - a), takeA: a, takeB: b };
      }
      return { kind: 'hold', holdFrame: fr(p.hold), fill: !!p.fill, drift: !!p.drift, frames: p.fill ? 0 : fr(p.seconds), take: p.hold };
    });
    const fixed = pieces.filter((p) => !p.fill).reduce((a, p) => a + p.frames, 0);
    const fills = pieces.filter((p) => p.fill);
    if (fills.length !== 1) throw new Error(`${s.id}: need exactly one fill piece`);
    fills[0].frames = frames - fixed;
    if (fills[0].frames < 0) throw new Error(`${s.id}: live pieces (${fixed} frames) are longer than the scene (${frames}). Shorten the cut.`);
    let at = 0;
    for (const p of pieces) { p.from = at; at += p.frames; }
    scene.pieces = pieces;
    scene.layouts = plan.layouts.map((l) => ({ fromFrame: fr(l.atS), layout: l.layout }));
    scene.statements = (plan.statements ?? []).map((c) => ({ text: c.text, fromFrame: fr(c.fromS ?? 0), toFrame: c.toS ? fr(c.toS) : frames }));
    scene.chips = (plan.chips ?? []).map((c) => ({ text: c.text, fromFrame: pieces[c.atPiece].from, toFrame: pieces[c.atPiece].from + fr(c.durS) }));
    // spotlight windows from the word timings: a pane is "spoken about" during its sentence
    scene.spots = (plan.spots ?? []).map((sp) => {
      const w = wordsFile.words;
      const i = w.findIndex((x) => x.text.toLowerCase() === sp.sentenceStartingWith.toLowerCase());
      if (i < 0) throw new Error(`${s.id}: no word "${sp.sentenceStartingWith}" for the spotlight`);
      let j = i; while (j < w.length - 1 && !/^[.!?]$/.test(w[j].text)) j++;
      return { role: sp.role, fromFrame: fr(edl.leadS + w[i].start), toFrame: fr(edl.leadS + w[j].end) };
    });
  }
  scenes.push(scene);
  cursor += frames;
}
const total = cursor;
if (total / FPS >= CEILING_S) throw new Error(`total ${(total / FPS).toFixed(1)}s is at or over the ${CEILING_S}s ceiling`);
mkdirSync(path.join(root, 'src', 'generated'), { recursive: true });
writeFileSync(path.join(root, 'src', 'generated', 'timeline.json'), JSON.stringify({ fps: FPS, total, scenes }, null, 1));
console.log(`timeline: ${scenes.length} scenes, ${total} frames = ${(total / FPS).toFixed(1)} s (${Math.floor(total / FPS / 60)}:${String(Math.round(total / FPS) % 60).padStart(2, '0')})`);
for (const s of scenes) {
  const live = s.pieces?.filter((p) => p.kind === 'live').reduce((a, p) => a + p.frames, 0) ?? 0;
  const hold = s.pieces?.filter((p) => p.kind === 'hold').reduce((a, p) => a + p.frames, 0) ?? 0;
  console.log(`${s.id.padEnd(3)} ${(s.frames / FPS).toFixed(2).padStart(6)} s  spoken ${s.spoken.toFixed(2)}${s.pieces ? `  live ${(live / FPS).toFixed(1)} s, hold ${(hold / FPS).toFixed(1)} s` : '  card'}`);
}
