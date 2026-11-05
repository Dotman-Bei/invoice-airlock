// Self-test of the capture pipeline on a local mock page. No desk involved, nothing posted anywhere.
// Checks: frame size at 2x scale, constant-fps output, equal length across panes, and that a change
// made at one instant shows up at the same instant in two panes (shared timeline).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clock, startPane, stopPane, encodePane, LAUNCH_ARGS } from './lib/screencast.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'captures', 'selftest');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const html = (label) => `<body style="margin:0;background:#202020;color:#fff;font:700 64px sans-serif">
  <div id=t style="padding:40px">${label}</div><div id=c style="padding:40px;font-size:40px"></div>
  <script>let i=0;setInterval(()=>{document.getElementById('c').textContent='tick '+(i++)},250)</script></body>`;

const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
const panes = [
  { id: 'a', w: 780, h: 796 },
  { id: 'b', w: 360, h: 796 },
];
const rec = [];
for (const p of panes) {
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(html(`pane ${p.id}`));
  p.page = page;
  const st = await page.evaluate(() => ({ iw: window.innerWidth, ih: window.innerHeight, dpr: window.devicePixelRatio }));
  console.log(`pane ${p.id}: innerWidth ${st.iw}, innerHeight ${st.ih}, dpr ${st.dpr}`);
  rec.push(await startPane(page, path.join(out, p.id), { width: p.w, height: p.h }));
}
const t0 = clock();
await sleep(3000);
const tMark = clock(); // change both panes at (nearly) one instant
await Promise.all(panes.map((p) => p.page.evaluate(() => { document.body.style.background = '#d00000'; })));
await sleep(3000);
const t1 = clock();
for (const p of panes) await stopPane(p.page);
await browser.close();

const env = { ...process.env };
const files = [];
for (let i = 0; i < panes.length; i++) {
  const f = path.join(out, `${panes[i].id}.mp4`);
  const r = encodePane(rec[i], f, { t0, t1 });
  files.push(f);
  console.log(`pane ${panes[i].id}: ${rec[i].frames.length} raw frames, ${r.frames} used; first frame ${rec[i].frames[0].vw}x${rec[i].frames[0].vh} (viewport)`);
}
const probe = (f) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'csv=p=0', f], { encoding: 'utf8', env }).stdout.trim();
for (const f of files) console.log(path.basename(f), '->', probe(f));

// transition time per pane: first sampled instant where the red channel dominates
const redAt = (f, t) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', f, '-frames:v', '1', '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { env });
  return r.stdout.length >= 3 ? r.stdout[0] > 150 : false;
};
for (let i = 0; i < files.length; i++) {
  let found = null;
  for (let t = 2.0; t < 5.0; t += 0.05) if (redAt(files[i], t)) { found = t; break; }
  console.log(`pane ${panes[i].id}: red first seen at ${found?.toFixed(2)} s into the clip; change was made at ${(tMark - t0).toFixed(2)} s`);
}
