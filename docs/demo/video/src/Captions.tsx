import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Caption } from '@remotion/captions';
import { C, STAGE_H, body } from './Scene';

export type Word = { text: string; start: number; end: number; ws: string };

/** Kokoro token timings -> @remotion/captions Caption objects (text carries its leading space). */
export function toCaptions(words: Word[], leadS: number): Caption[] {
  let prevWs = '';
  return words.map((w, i) => {
    const text = (i === 0 ? '' : prevWs) + w.text;
    prevWs = w.ws ?? '';
    const startMs = (leadS + w.start) * 1000;
    const endMs = (leadS + w.end) * 1000;
    return { text, startMs, endMs, timestampMs: (startMs + endMs) / 2, confidence: null };
  });
}

const isWord = (c: Caption) => /[\p{L}\p{N}]/u.test(c.text);

/** Pages of at most ~9 spoken words, broken at sentence ends and at commas once a page has 6+ words. */
export function toPages(captions: Caption[]): Caption[][] {
  const pages: Caption[][] = [];
  let cur: Caption[] = [];
  let n = 0;
  for (const c of captions) {
    cur.push(c);
    if (isWord(c)) n += 1;
    const t = c.text.trim();
    const end = /[.!?:]$/.test(t) || (/,$/.test(t) && n >= 6) || n >= 9;
    if (end) { pages.push(cur); cur = []; n = 0; }
  }
  if (cur.length) pages.push(cur);
  // a lone trailing punctuation token belongs to the previous page
  return pages.filter((p, i) => !(i > 0 && p.every((c) => !isWord(c)))).map((p, i, all) => p);
}

export const Captions: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const pages = React.useMemo(() => toPages(captions), [captions]);
  // show the page whose first token has started; keep it until the next page starts
  let idx = -1;
  for (let i = 0; i < pages.length; i++) if (pages[i][0].startMs <= nowMs + 60) idx = i;
  const page = idx >= 0 ? pages[idx] : null;
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 1080 - STAGE_H,
        background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 120px',
      }}
    >
      {page && (
        <div style={{ ...body(44), fontWeight: 500, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
          {page.map((c, i) => {
            const spoken = c.startMs <= nowMs && c.endMs > nowMs - 120;
            return <span key={i} style={{ color: spoken && isWord(c) ? C.yellow : '#fff' }}>{c.text}</span>;
          })}
        </div>
      )}
    </div>
  );
};
