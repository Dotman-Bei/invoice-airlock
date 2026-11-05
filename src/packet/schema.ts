// The only thing that crosses from ap-intake to ap-release. No field can hold prose.
export type Packet = {
  invoice_no: string;
  vendor_id: string;
  po_no: string;
  grn_no: string;
  amount_cents: number;
  currency: 'USD';
  due_date: string;
  routing: string;
  account: string;
  source_sha256: string;
};

export type ParseResult =
  | { ok: true; packet: Packet }
  | { ok: false; reason: string };

export const PACKET_PREFIX = 'AIRLOCK/1 ';
export const PACKET_ATTEMPT_PREFIX = 'AIRLOCK/';
export const MAX_PACKET_BYTES = 1024;
const MAX_AMOUNT_CENTS = 10_000_000_000;

const STRING_RULES: Record<string, RegExp> = {
  invoice_no: /^INV-\d{1,10}$/,
  vendor_id: /^V-\d{4}$/,
  po_no: /^PO-\d{4,8}$/,
  grn_no: /^GRN-\d{4,8}$/,
  due_date: /^\d{4}-\d{2}-\d{2}$/,
  routing: /^\d{9}$/,
  account: /^\d{6,17}$/,
  source_sha256: /^[0-9a-f]{64}$/,
};

const ALL_KEYS = [...Object.keys(STRING_RULES), 'amount_cents', 'currency'].sort();

function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validatePacket(value: unknown): ParseResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'not an object' };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== ALL_KEYS.length || keys.some((key, i) => key !== ALL_KEYS[i])) {
    return { ok: false, reason: 'wrong keys' };
  }
  for (const [key, rule] of Object.entries(STRING_RULES)) {
    const field = record[key];
    if (typeof field !== 'string' || !rule.test(field)) {
      return { ok: false, reason: `bad ${key}` };
    }
  }
  if (!isRealDate(record['due_date'] as string)) {
    return { ok: false, reason: 'bad due_date' };
  }
  const amount = record['amount_cents'];
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT_CENTS) {
    return { ok: false, reason: 'bad amount_cents' };
  }
  if (record['currency'] !== 'USD') {
    return { ok: false, reason: 'bad currency' };
  }
  return { ok: true, packet: record as unknown as Packet };
}

export function parsePacket(line: string): ParseResult {
  if (Buffer.byteLength(line, 'utf8') > MAX_PACKET_BYTES) {
    return { ok: false, reason: 'too long' };
  }
  if (!line.startsWith(PACKET_PREFIX) || line.includes('\n')) {
    return { ok: false, reason: 'not a packet line' };
  }
  let value: unknown;
  try {
    value = JSON.parse(line.slice(PACKET_PREFIX.length));
  } catch {
    return { ok: false, reason: 'not JSON' };
  }
  return validatePacket(value);
}

export function formatPacket(packet: Packet): string {
  const ordered = {
    invoice_no: packet.invoice_no,
    vendor_id: packet.vendor_id,
    po_no: packet.po_no,
    grn_no: packet.grn_no,
    amount_cents: packet.amount_cents,
    currency: packet.currency,
    due_date: packet.due_date,
    routing: packet.routing,
    account: packet.account,
    source_sha256: packet.source_sha256,
  };
  return `${PACKET_PREFIX}${JSON.stringify(ordered)}`;
}
