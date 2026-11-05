import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Extraction, Extractor } from './reader.ts';

// Replays a recorded extraction. The proof's reader image contains no model at all.
export function fixtureExtractor(dir: string): Extractor {
  return async (_pdf, sha256) => {
    const path = join(dir, `${sha256}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as Extraction;
  };
}
