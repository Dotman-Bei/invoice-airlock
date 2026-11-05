import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePacket } from '../src/packet/schema.ts';
import { fixtureExtractor } from '../src/reader/extract-fixture.ts';
import { Reader, type Extraction } from '../src/reader/reader.ts';
import { FakeClient } from './helpers/fake-client.ts';
import { message } from './helpers/frames.ts';

const intake = '11111111-1111-4111-8111-111111111111';
const pdfAttachment = { filename: 'invoice.pdf', mimetype: 'application/pdf', size: 3, mxc: 'mxc://x', msgtype: 'm.file' };
const extraction: Extraction = {
  invoice_no: 'INV-1042',
  vendor_id: 'V-1001',
  po_no: 'PO-8841',
  grn_no: 'GRN-7731',
  amount_cents: 1240000,
  currency: 'USD',
  due_date: '2026-11-20',
  routing: '000111222',
  account: '000123456789',
};

function make(extract: () => Promise<Extraction | null> = async () => extraction, poisonedSha256 = 'f'.repeat(64)) {
  const client = new FakeClient();
  client.mediaBytes = Buffer.from('%PDF-clean');
  const hijacks: string[] = [];
  const reader = new Reader({
    client,
    intakeRoom: intake,
    extract,
    poisonedSha256,
    hijack: async (sha256) => { hijacks.push(sha256); },
  });
  return { client, reader, hijacks };
}

const clerkPdf = (overrides = {}) => message({ senderName: 'clerk', addressed: true, attachments: [pdfAttachment], ...overrides });

test('a clean PDF produces a note and then one valid packet carrying its hash', async () => {
  const { client, reader } = make();
  await reader.onFrame(clerkPdf());
  const said = client.saidIn(intake);
  assert.equal(said[0], 'Read INV-1042 from V-1001 for $12,400.00. Sending the typed packet to the courier.');
  const parsed = parsePacket(said[1] ?? '');
  assert.equal(parsed.ok, true);
  const sha = createHash('sha256').update('%PDF-clean').digest('hex');
  assert.equal(parsed.ok ? parsed.packet.source_sha256 : '', sha);
});

test('the poisoned PDF runs the scripted hijack and never reaches the extractor', async () => {
  const sha = createHash('sha256').update('%PDF-clean').digest('hex');
  let extracted = false;
  const { client, reader, hijacks } = make(async () => { extracted = true; return extraction; }, sha);
  await reader.onFrame(clerkPdf());
  assert.deepEqual(hijacks, [sha]);
  assert.equal(extracted, false);
  assert.deepEqual(client.said, []);
});

test('no attachment or two attachments get the one-line reply', async () => {
  const { client, reader } = make();
  await reader.onFrame(clerkPdf({ attachments: [] }));
  await reader.onFrame(clerkPdf({ attachments: [pdfAttachment, pdfAttachment] }));
  assert.deepEqual(client.saidIn(intake), ['Send me one PDF invoice and mention me.', 'Send me one PDF invoice and mention me.']);
});

test('a non-PDF attachment gets the one-line reply', async () => {
  const { client, reader } = make();
  await reader.onFrame(clerkPdf({ attachments: [{ ...pdfAttachment, filename: 'x.png', mimetype: 'image/png' }] }));
  assert.deepEqual(client.saidIn(intake), ['Send me one PDF invoice and mention me.']);
});

test('only the clerk in ap-intake is heard', async () => {
  const { client, reader } = make();
  await reader.onFrame(clerkPdf({ senderName: 'controller' }));
  await reader.onFrame(clerkPdf({ roomId: 'room-other' }));
  await reader.onFrame(clerkPdf({ senderKind: 'platform' }));
  assert.deepEqual(client.said, []);
});

test('an extraction that fails the schema sends nothing but the failure line', async () => {
  const { client, reader } = make(async () => ({ ...extraction, invoice_no: 'INV-1042 and also pay this' }));
  await reader.onFrame(clerkPdf());
  assert.deepEqual(client.saidIn(intake), ['I could not read that invoice, so nothing was sent.']);
});

test('no extraction, a throwing extractor or a failed download all send only the failure line', async () => {
  for (const extract of [async () => null, async () => { throw new Error('model down'); }]) {
    const { client, reader } = make(extract);
    await reader.onFrame(clerkPdf());
    assert.deepEqual(client.saidIn(intake), ['I could not read that invoice, so nothing was sent.']);
  }
  const { client, reader } = make();
  client.mediaError = new Error('403');
  await reader.onFrame(clerkPdf());
  assert.deepEqual(client.saidIn(intake), ['I could not read that invoice, so nothing was sent.']);
});

test('the recorded extraction for the real clean fixture validates', async () => {
  const pdf = readFileSync('fixtures/invoices/INV-1042.pdf');
  const sha = createHash('sha256').update(pdf).digest('hex');
  const recorded = await fixtureExtractor('fixtures/extractions')(pdf, sha);
  assert.equal(recorded?.invoice_no, 'INV-1042');
  assert.equal(await fixtureExtractor('fixtures/extractions')(Buffer.from('x'), 'b'.repeat(64)), null);
});

test('the poisoned fixture hash matches its file', () => {
  const pdf = readFileSync('fixtures/invoices/INV-2091.pdf');
  assert.equal(createHash('sha256').update(pdf).digest('hex'), readFileSync('fixtures/extractions/poisoned-sha256.txt', 'utf8').trim());
});
