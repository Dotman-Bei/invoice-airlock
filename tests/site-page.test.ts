import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('site/index.html', 'utf8');

test('the page has one h1, works without script, and states the limits plainly', () => {
  assert.equal(html.match(/<h1/g)?.length, 1);
  assert.equal(html.match(/<ol class="fallback"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g)?.length, 9, 'all nine attacks without script');
  assert.ok(html.includes("The demo's clerk and controller are one person, on two accounts."));
  assert.ok(html.includes('We wrote the hijack on purpose.'));
  assert.ok(html.includes('No real money exists here.'));
  assert.ok(html.includes('so you can see the refusal on screen'));
  assert.ok(html.includes('says nothing about whether a model resists injection'));
});

test('every picture exists, has alt text and a size, and is credited', () => {
  const images = [...html.matchAll(/<img[^>]*src="media\/([^"]+)"[^>]*alt="[^"]+"[^>]*width="\d+"[^>]*height="\d+"/g)];
  assert.equal(images.length, 4);
  for (const match of images) {
    assert.ok(existsSync(`site/media/${match[1]}`), match[1]);
  }
  for (const credit of ['Astro_Alex', 'Account-book of Thomas Mister', 'John Carlin', 'Ludlow Old Bank']) {
    assert.ok(html.includes(credit), credit);
  }
});

test('the panel says it is a replay, with or without script', () => {
  const note = 'A replay of results recorded by ./prove.sh. Nothing runs in your browser.';
  const css = readFileSync('site/style.css', 'utf8');
  assert.equal(html.split(note).length - 1, 1);
  assert.ok(html.indexOf(note) > html.indexOf('id="replay"'), 'inside the panel');
  assert.ok(html.indexOf(note) < html.indexOf('<ol class="fallback"'), 'outside the list that script hides');
  assert.ok(!/panel-note[^}]*display:\s*none/.test(css));
  assert.ok(!/replay-ready \.panel-note/.test(css));
  assert.match(html, /<button[^>]*id="next"[^>]*>Replay attack 1 of 9<\/button>/);
  assert.ok(!html.includes('Run attack'));
});

test('controls that need script stay hidden without it', () => {
  const css = readFileSync('site/style.css', 'utf8');
  assert.match(html, /<button[^>]*id="next"[^>]*hidden/);
  assert.match(html, /<button[^>]*id="copy"[^>]*hidden/);
  assert.ok(css.includes('.button[hidden]'), 'a display rule on .button would otherwise beat the hidden attribute');
});

test('the page is built from the dealt tokens and the house rules', () => {
  const css = readFileSync('site/style.css', 'utf8');
  for (const value of ['#1423b8', '#f7dd47', '#e9479f', '#1fc27a', 'Hanken Grotesk']) {
    assert.ok(css.includes(value), value);
  }
  assert.ok(!/gradient\(/.test(css), 'no gradients');
  assert.ok(!/box-shadow/.test(css), 'no shadows');
  assert.ok(css.includes('prefers-reduced-motion'));
  const allowed = new Set(['#1423b8', '#ffffff', '#000000', '#f7dd47', '#e9479f', '#1fc27a', '#0a0a0a']);
  assert.deepEqual([...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]).filter((hex) => !allowed.has(hex)), [], 'only the dealt colours');
  assert.ok(!/transition:[^;]*\b(color|background)/.test(css), 'hover feedback moves things, it does not fade colours');
});
