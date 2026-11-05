import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPrompt, claudeArgs, modelExtractor, parseClaudeOutput, type RunCommand } from '../src/reader/extract-model.ts';

const orders = { purchaseOrders: [{ po_no: 'PO-8841', vendor_id: 'V-1001', amount_cents: 1240000 }], goodsReceipts: [] };
const fields = { invoice_no: 'INV-1042' };

test('claude runs headless with no tools and no saved session', () => {
  const args = claudeArgs('claude-sonnet-5-5');
  assert.equal(args[0], '-p');
  assert.equal(args[args.indexOf('--tools') + 1], '');
  assert.equal(args[args.indexOf('--output-format') + 1], 'json');
  assert.equal(args[args.indexOf('--model') + 1], 'claude-sonnet-5-5');
  assert.ok(args.includes('--no-session-persistence'));
  assert.ok(args.includes('--json-schema'));
});

test('structured output is preferred, and a JSON result is accepted', () => {
  assert.deepEqual(parseClaudeOutput(JSON.stringify({ is_error: false, structured_output: fields, result: '' })), fields);
  assert.deepEqual(parseClaudeOutput(JSON.stringify({ is_error: false, result: JSON.stringify(fields) })), fields);
});

test('errors and junk parse to null', () => {
  assert.equal(parseClaudeOutput(JSON.stringify({ is_error: true, structured_output: fields })), null);
  assert.equal(parseClaudeOutput(JSON.stringify({ is_error: false, result: 'sorry' })), null);
  assert.equal(parseClaudeOutput('nope'), null);
});

test('the prompt carries the open orders and the invoice text', () => {
  const prompt = buildPrompt('Invoice INV-1042', orders);
  assert.ok(prompt.includes('PO-8841'));
  assert.ok(prompt.includes('Invoice INV-1042'));
});

test('the extractor runs pdftotext then claude', async () => {
  const calls: string[] = [];
  const run: RunCommand = async (command, _args, stdin) => {
    calls.push(command);
    if (command === 'pdftotext') {
      assert.equal(String(stdin), '%PDF');
      return { code: 0, stdout: Buffer.from('Invoice INV-1042'), stderr: '' };
    }
    assert.ok(String(stdin).includes('Invoice INV-1042'));
    return { code: 0, stdout: Buffer.from(JSON.stringify({ structured_output: fields })), stderr: '' };
  };
  const result = await modelExtractor({ run, orders, model: 'm' })(Buffer.from('%PDF'), 'sha');
  assert.deepEqual(result, fields);
  assert.deepEqual(calls, ['pdftotext', 'claude']);
});

test('a failing command gives no extraction', async () => {
  const failsFirst: RunCommand = async () => ({ code: 1, stdout: Buffer.from(''), stderr: 'bad' });
  assert.equal(await modelExtractor({ run: failsFirst, orders, model: 'm' })(Buffer.from('%PDF'), 'sha'), null);
  const failsSecond: RunCommand = async (command) => command === 'pdftotext'
    ? { code: 0, stdout: Buffer.from('text'), stderr: '' }
    : { code: 1, stdout: Buffer.from(''), stderr: 'timeout' };
  assert.equal(await modelExtractor({ run: failsSecond, orders, model: 'm' })(Buffer.from('%PDF'), 'sha'), null);
});
