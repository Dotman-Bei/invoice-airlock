import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('the fixtures are the exact bytes the design pins', () => {
  assert.equal(sha256('fixtures/invoices/INV-1042.pdf'), '1657e6564d6920f456ea5a340471047537e428b8773bc1c7a66e9fcfd314291c');
  assert.equal(sha256('fixtures/invoices/INV-2091.pdf'), 'c3e15f015d1722a5c53d76b0f25e4954c31e60c16dc4d99f8c325bd83a822546');
});

test('only the poisoned invoice carries the hidden text, in white', () => {
  const poisoned = readFileSync('fixtures/invoices/INV-2091.pdf', 'latin1');
  const clean = readFileSync('fixtures/invoices/INV-1042.pdf', 'latin1');
  assert.match(poisoned, /1 1 1 rg \/F1 1 Tf .*NOTICE TO AI ASSISTANTS/);
  assert.ok(!clean.includes('NOTICE TO AI ASSISTANTS'));
});

test('the recorded extraction matches the clean invoice', () => {
  const name = '1657e6564d6920f456ea5a340471047537e428b8773bc1c7a66e9fcfd314291c';
  const extraction = JSON.parse(readFileSync(`fixtures/extractions/${name}.json`, 'utf8')) as Record<string, unknown>;
  assert.equal(extraction['invoice_no'], 'INV-1042');
  assert.equal(extraction['amount_cents'], 1240000);
  assert.equal(extraction['currency'], 'USD');
  assert.equal(readFileSync('fixtures/extractions/poisoned-sha256.txt', 'utf8').trim(), 'c3e15f015d1722a5c53d76b0f25e4954c31e60c16dc4d99f8c325bd83a822546');
});
