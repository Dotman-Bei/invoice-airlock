import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_POLICY, ownerOf, policyFor, waitFor } from '../src/provision/provision.ts';

test('two owners puts reader under the clerk and the rest under the controller', () => {
  assert.equal(ownerOf('reader', 'two'), 'clerk');
  assert.equal(ownerOf('courier', 'two'), 'controller');
  assert.equal(ownerOf('treasury', 'two'), 'controller');
});

test('the single-owner control moves only reader', () => {
  assert.equal(ownerOf('reader', 'single'), 'controller');
  assert.equal(ownerOf('courier', 'single'), 'controller');
  assert.equal(ownerOf('treasury', 'single'), 'controller');
});

test('the default policy admits only the owner and the owner\'s agents', () => {
  assert.deepEqual(DEFAULT_POLICY.rules, [{ rooms: '*', room_groups: '*', users: [], agents: [], owner: true, owner_agents: true, platform: false }]);
});

test('only the single-owner control opens reader, so the clerk can still hand it an invoice', () => {
  assert.equal(policyFor('reader', 'single'), null);
  assert.equal(policyFor('reader', 'two'), DEFAULT_POLICY);
  assert.equal(policyFor('treasury', 'single'), DEFAULT_POLICY);
  assert.equal(policyFor('courier', 'single'), DEFAULT_POLICY);
});

test('templates have no kickoff, and each room holds only its own agents', () => {
  const intake = readFileSync('switch/templates/ap-intake.template.yaml', 'utf8');
  const release = readFileSync('switch/templates/ap-release.template.yaml', 'utf8');
  assert.ok(!/kickoff/.test(intake));
  assert.ok(!/kickoff/.test(release));
  assert.ok(intake.includes('agents: [reader, courier]'));
  assert.ok(release.includes('agents: [treasury, courier]'));
  assert.ok(release.includes('channel_type: channel_private'));
  assert.ok(release.includes('read_visibility: private'));
  assert.ok(release.includes('write_visibility: private'));
});

test('waitFor retries until there is a value, and names what timed out', async () => {
  let calls = 0;
  assert.equal(await waitFor('x', async () => (++calls < 3 ? null : 'ready'), 1000, 1), 'ready');
  await assert.rejects(waitFor('the bridge', async () => null, 5, 1), /timed out waiting for the bridge/);
});
