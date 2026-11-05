// Renders the final cut or a set of QC frames.
//   node scripts/render.mjs final                  1080p h264 -> out/final-raw.mp4
//   node scripts/render.mjs qc                     half-resolution h264 -> out/qc.mp4 (fast loop)
//   node scripts/render.mjs frames 120 900 2000    stills at those frame numbers -> out/frames/f<N>.png
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode = 'final', ...rest] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.join(root, 'src', 'index.ts'), publicDir: path.join(root, 'public') });
const composition = await selectComposition({ serveUrl, id: 'Main' });
mkdirSync(path.join(root, 'out'), { recursive: true });
console.log(`Main: ${composition.durationInFrames} frames @ ${composition.fps} fps = ${(composition.durationInFrames / composition.fps).toFixed(2)} s`);

if (mode === 'frames') {
  mkdirSync(path.join(root, 'out', 'frames'), { recursive: true });
  for (const n of rest.map(Number)) {
    const output = path.join(root, 'out', 'frames', `f${String(n).padStart(5, '0')}.png`);
    await renderStill({ composition, serveUrl, output, frame: n });
    console.log('frame', n, '->', output);
  }
} else {
  const qc = mode === 'qc';
  const output = path.join(root, 'out', qc ? 'qc.mp4' : 'final-raw.mp4');
  let last = -1;
  await renderMedia({
    composition, serveUrl, outputLocation: output, codec: 'h264', audioCodec: 'aac',
    crf: qc ? 28 : 17, scale: qc ? 0.5 : 1, pixelFormat: 'yuv420p', concurrency: 4,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`${p * 10}%`); } },
  });
  console.log('wrote', output);
}
