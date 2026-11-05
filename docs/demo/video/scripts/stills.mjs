// Renders one PNG per scene to out/stills/. Usage: node scripts/stills.mjs [S5 S6 ...]
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(path.join(root, 'src', 'generated', 'data.json'), 'utf8'));
const only = process.argv.slice(2);
const ids = data.scenes.map((s) => s.id).filter((id) => !only.length || only.includes(id));

mkdirSync(path.join(root, 'out', 'stills'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, 'src', 'index.ts') });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id });
  const output = path.join(root, 'out', 'stills', `${id}.png`);
  await renderStill({ composition, serveUrl, output });
  console.log('rendered', output);
}
