// Desk access for the demo, using only the two tunnelled addresses. Never touches the VPS.
//   node scripts/desk.mjs health    read-only: Mattermost ping + ledger JSON (the pre-take tunnel check)
//   node scripts/desk.mjs login     sign clerk and controller in OFF camera, save session state
//   node scripts/desk.mjs layout    read-only: open each pane on its channel and report what it sees
// Logins are read from $AIRLOCK_SCRATCH/desk-logins.json ({"clerk":{"user","password"},"controller":{...}}),
// a file outside the repo. They are never printed, logged or written anywhere else. Session state goes
// to the same scratch folder. Posts nothing, so a layout check does not dirty the desk.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { LAUNCH_ARGS } from './lib/screencast.mjs';

export const MM = 'http://localhost:27065';
export const LEDGER = 'http://localhost:27090';
export const PANES = {
  clerk: { w: 780, h: 796, channel: 'ap-intake' },
  controller: { w: 780, h: 796, channel: 'ap-release' },
};
const scratch = process.env.AIRLOCK_SCRATCH;
if (!scratch) throw new Error('set AIRLOCK_SCRATCH to a folder outside the repo');
const stateFile = (role) => path.join(scratch, `state-${role}.json`);

export async function health() {
  const out = {};
  try {
    const r = await fetch(`${MM}/api/v4/system/ping`, { signal: AbortSignal.timeout(8000) });
    out.mattermost = { status: r.status, body: (await r.text()).slice(0, 60) };
  } catch (e) { out.mattermost = { error: String(e.cause?.code ?? e.message) }; }
  try {
    const j = await (await fetch(`${LEDGER}/ledger.json`, { signal: AbortSignal.timeout(8000) })).json();
    out.ledger = { balance_cents: j.balance_cents, entries: j.entries?.length };
  } catch (e) { out.ledger = { error: String(e.cause?.code ?? e.message) }; }
  return out;
}

async function login() {
  const f = path.join(scratch, 'desk-logins.json');
  if (!existsSync(f)) throw new Error(`no ${f}`);
  const creds = JSON.parse(readFileSync(f, 'utf8'));
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  for (const role of Object.keys(PANES)) {
    const ctx = await browser.newContext({ viewport: { width: PANES[role].w, height: PANES[role].h } });
    const page = await ctx.newPage();
    await page.goto(`${MM}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('#input_loginId').fill(creds[role].user);
    await page.locator('#input_password-input').fill(creds[role].password);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    await ctx.storageState({ path: stateFile(role) });
    console.log(`${role}: signed in, landed on ${new URL(page.url()).pathname}`);
    await ctx.close();
  }
  await browser.close();
}

async function layout() {
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const report = { health: await health(), panes: {} };
  let team = null;
  for (const role of Object.keys(PANES)) {
    const p = PANES[role];
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, storageState: stateFile(role) });
    const page = await ctx.newPage();
    await page.goto(`${MM}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((u) => /\/channels\//.test(u.pathname), { timeout: 30000 });
    team ??= new URL(page.url()).pathname.split('/')[1];
    await page.goto(`${MM}/${team}/channels/${p.channel}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#post_textbox').waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      path: location.pathname,
      header: document.querySelector('#channelHeaderTitle, [data-testid="channel-header"]')?.textContent?.trim().slice(0, 60) ?? null,
      posts: document.querySelectorAll('[id^="post_"]').length,
      mobileLayout: document.body.className.includes('mobile') || !!document.querySelector('.mobile-view, [class*="mobile"]'),
    }));
    report.panes[role] = { ...info, gateInnerWidthOk: info.innerWidth >= 780, gateChannelOk: info.path.endsWith(`/channels/${p.channel}`) };
    await page.screenshot({ path: path.join(scratch, `layout-${role}.png`) });
    await ctx.close();
  }
  const lctx = await browser.newContext({ viewport: { width: 360, height: 796 } });
  const lpage = await lctx.newPage();
  await lpage.goto(`${LEDGER}/`, { waitUntil: 'domcontentloaded' });
  await lpage.waitForTimeout(1500);
  await lpage.screenshot({ path: path.join(scratch, 'layout-ledger.png') });
  await browser.close();
  report.team = team;
  writeFileSync(path.join(scratch, 'layout-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

const cmd = process.argv[2];
if (import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  if (cmd === 'health') console.log(JSON.stringify(await health(), null, 2));
  else if (cmd === 'login') await login();
  else if (cmd === 'layout') await layout();
  else console.log('usage: node scripts/desk.mjs health|login|layout');
}
