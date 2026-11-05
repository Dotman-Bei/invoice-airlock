// Multi-pane screencast helper. Each pane is one Playwright page. Frames are paint-driven (an idle
// page emits none), so every frame is stamped with a shared monotonic clock and later re-encoded to
// constant 30 fps on ONE common timeline, so three panes recorded together stay in sync.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/** Browser launch flag that makes screencast frames true 2x (1560 px for a 780 CSS px pane) while
 *  window.innerWidth stays in CSS px, so Mattermost's 768 px breakpoint is unaffected. Verified by
 *  scripts/selftest-capture.mjs: without it, frames come out at 1x whatever deviceScaleFactor says. */
export const LAUNCH_ARGS = ['--force-device-scale-factor=2'];

/** Seconds on a monotonic clock shared by every pane in this process. */
export const clock = () => Number(process.hrtime.bigint()) / 1e9;

export async function startPane(page, dir, { width, height, scale = 2, quality = 90 }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  let n = 0;
  await page.screencast.start({
    size: { width: width * scale, height: height * scale },
    quality,
    onFrame: ({ data, timestamp, viewportWidth, viewportHeight }) => {
      n += 1;
      const file = `f${String(n).padStart(6, '0')}.jpg`;
      writeFileSync(path.join(dir, file), data);
      frames.push({ file, t: clock(), cdp: timestamp, vw: viewportWidth, vh: viewportHeight });
    },
  });
  return { frames, dir, width, height, scale };
}

export async function stopPane(page) {
  await page.screencast.stop();
}

/** Encode one pane to constant-fps H.264 covering exactly [t0, t1] on the shared clock. */
export function encodePane(pane, outFile, { t0, t1, fps = 30, ffmpeg = 'ffmpeg' }) {
  const all = [...pane.frames].sort((a, b) => a.t - b.t);
  // Keep the last frame at or before t0 (it is what the viewer sees at t0) and every frame up to t1.
  let first = 0;
  for (let i = 0; i < all.length; i++) if (all[i].t <= t0) first = i;
  const seq = all.slice(first).filter((f) => f.t < t1);
  if (!seq.length) throw new Error(`pane ${pane.dir}: no frames in window`);
  const items = seq.map((f) => ({ file: f.file, start: Math.max(f.t, t0) }));
  // The first frame can arrive after t0 (an idle page emits nothing until it paints). Hold it from t0,
  // otherwise the whole pane's timeline shifts early by that gap and panes drift apart.
  items[0].start = t0;
  const lines = ['ffconcat version 1.0'];
  for (let i = 0; i < items.length; i++) {
    const end = i + 1 < items.length ? items[i + 1].start : t1;
    const dur = end - items[i].start;
    if (dur <= 0) continue;
    lines.push(`file '${items[i].file}'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${items[items.length - 1].file}'`); // ffconcat needs the last file repeated
  const list = path.join(pane.dir, 'list.ffconcat');
  writeFileSync(list, lines.join('\n'));
  const r = spawnSync(
    ffmpeg,
    ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=${fps},scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-r', String(fps), '-t', (t1 - t0).toFixed(3), outFile],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${outFile}: ${r.stderr}`);
  return { frames: seq.length, outFile };
}
