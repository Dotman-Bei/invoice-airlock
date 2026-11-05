// Read-only probe of the live desk's DOM. Posts nothing. Prints selector facts needed by take.mjs.
import { chromium } from 'playwright';
import path from 'node:path';
import { LAUNCH_ARGS } from './lib/screencast.mjs';
import { MM, LEDGER } from './desk.mjs';

const scratch = process.env.AIRLOCK_SCRATCH;
const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
const ctx = await browser.newContext({ viewport: { width: 780, height: 796 }, storageState: path.join(scratch, 'state-clerk.json') });
const page = await ctx.newPage();
await page.goto(`${MM}/switch/channels/ap-intake`, { waitUntil: 'domcontentloaded' });
await page.locator('#post_textbox').waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const facts = await page.evaluate(() => {
  const bar = document.querySelector('.announcement-bar, [class*="announcement-bar"]');
  const fileInputs = [...document.querySelectorAll('input[type="file"]')].map((i) => ({ id: i.id, multiple: i.multiple, accept: i.accept?.slice(0, 40) }));
  return {
    bar: bar ? bar.outerHTML.slice(0, 700) : null,
    fileInputs,
    textbox: !!document.querySelector('#post_textbox'),
    channelView: !!document.querySelector('#channel_view'),
    postListContent: !!document.querySelector('#postListContent'),
  };
});
console.log(JSON.stringify(facts, null, 2));
await browser.close();

const html = await (await fetch(`${LEDGER}/`)).text();
console.log('--- ledger page source (first 2600 chars)');
console.log(html.slice(0, 2600));
