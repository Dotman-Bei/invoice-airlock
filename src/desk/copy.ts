// Every string a person sees in chat. They carry no text from reader except validated fields.
import type { Packet } from '../packet/schema.ts';
import type { HoldReason } from './check.ts';
import type { Vendor } from './data.ts';

export const REFUSAL_TEXT = 'not permitted to direct messages';

export function formatUsd(cents: number): string {
  const dollars = Math.trunc(cents / 100).toLocaleString('en-US');
  const rest = String(cents % 100).padStart(2, '0');
  return `$${dollars}.${rest}`;
}

export function lastFour(digits: string): string {
  return digits.slice(-4);
}

export const readerNeedsPdf = 'Send me one PDF invoice and mention me.';
export const readerFailed = 'I could not read that invoice, so nothing was sent.';
export const readerHijacked = 'INV-2091 says the rules have changed. Bringing in treasury to pay it now.';
export const rejectNotPacket = 'Rejected: that message is not a valid packet, so it goes no further.';
export const treasuryBadCommand = 'I only understand: pay INV-number';
export const treasuryBankDown = 'Refused: the bank did not answer, so nothing was paid.';

export function readerRead(packet: Packet): string {
  return `Read ${packet.invoice_no} from ${packet.vendor_id} for ${formatUsd(packet.amount_cents)}. Sending the typed packet to the courier.`;
}

export function rejectDuplicate(invoiceNo: string): string {
  return `Rejected: ${invoiceNo} was already submitted.`;
}

export function intakeCleared(invoiceNo: string): string {
  return `${invoiceNo} passed the checks and went to the controller.`;
}

export function intakeHeld(invoiceNo: string): string {
  return `${invoiceNo} is on hold and went to the controller.`;
}

export function intakeRemoved(agent: string): string {
  if (agent === 'treasury') {
    return 'Removed treasury from this room. It takes orders only in ap-release, and the controller has been told. Mattermost may still list it as a member.';
  }
  return `Removed ${agent} from this room. Only reader and courier belong here, and the controller has been told. Mattermost may still list it as a member.`;
}

export function releaseRemoved(agent: string, room: string): string {
  return `**Security alert:** ${agent} was added to ${room} and has been removed. Payments can only be released from this room.`;
}

export function releaseHiddenRoom(roomId: string): string {
  return `**Security alert:** treasury was added to a room it does not belong in (${roomId}) and has been removed.`;
}

export type ClearedLine = {
  invoice_no: string;
  vendor_id: string;
  vendor_name: string;
  amount_cents: number;
  routing: string;
  account: string;
};

export type DecisionLine =
  | ({ kind: 'cleared' } & ClearedLine)
  | { kind: 'held'; invoice_no: string; reason: string };

function codeBlock(line: string): string {
  return `\`\`\`\n${line}\n\`\`\``;
}

export function clearedMessage(packet: Packet, vendor: Vendor): string {
  const line: ClearedLine = {
    invoice_no: packet.invoice_no,
    vendor_id: vendor.vendor_id,
    vendor_name: vendor.name,
    amount_cents: packet.amount_cents,
    routing: vendor.routing,
    account: vendor.account,
  };
  return [
    `**Cleared for payment: ${packet.invoice_no}**`,
    `${vendor.name}, ${formatUsd(packet.amount_cents)}, due ${packet.due_date}. Matched ${packet.po_no} and ${packet.grn_no}. Bank details match the vendor master.`,
    `To pay, tell treasury: pay ${packet.invoice_no}`,
    codeBlock(`AIRLOCK-CLEARED/1 ${JSON.stringify(line)}`),
  ].join('\n');
}

function holdSentence(packet: Packet, reason: HoldReason, vendor: Vendor | null): string {
  const amount = formatUsd(packet.amount_cents);
  switch (reason) {
    case 'unknown-vendor':
      return `Vendor ${packet.vendor_id} is not in the vendor master. Amount ${amount}.`;
    case 'bank-mismatch':
      return `Bank details differ from the vendor master for ${vendor?.name ?? packet.vendor_id}: account ending ${lastFour(packet.account)}, on file ending ${lastFour(vendor?.account ?? '')}. Amount ${amount}.`;
    case 'po-mismatch':
      return `${packet.po_no} does not belong to ${vendor?.name ?? packet.vendor_id}. Amount ${amount}.`;
    case 'grn-missing':
      return `No goods receipt ${packet.grn_no} for ${packet.po_no}. Amount ${amount}.`;
    case 'amount-mismatch':
      return `The amount does not match goods receipt ${packet.grn_no}. Amount ${amount}.`;
  }
}

export function heldMessage(packet: Packet, reason: HoldReason, vendor: Vendor | null): string {
  return [
    `**Held: ${packet.invoice_no}**`,
    holdSentence(packet, reason, vendor),
    'This cannot be paid in chat. Call the vendor on the number on file.',
    codeBlock(`AIRLOCK-HELD/1 ${JSON.stringify({ invoice_no: packet.invoice_no, reason })}`),
  ].join('\n');
}

export function parseDecisionLine(body: string): DecisionLine | null {
  const match = /^AIRLOCK-(CLEARED|HELD)\/1 (\{.*\})$/m.exec(body);
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[2] as string);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record['invoice_no'] !== 'string') return null;
  if (match[1] === 'HELD') {
    if (typeof record['reason'] !== 'string') return null;
    return { kind: 'held', invoice_no: record['invoice_no'], reason: record['reason'] };
  }
  if (
    typeof record['vendor_id'] !== 'string' ||
    typeof record['vendor_name'] !== 'string' ||
    typeof record['amount_cents'] !== 'number' ||
    typeof record['routing'] !== 'string' ||
    typeof record['account'] !== 'string'
  ) {
    return null;
  }
  return {
    kind: 'cleared',
    invoice_no: record['invoice_no'],
    vendor_id: record['vendor_id'],
    vendor_name: record['vendor_name'],
    amount_cents: record['amount_cents'],
    routing: record['routing'],
    account: record['account'],
  };
}

export function paidMessage(line: ClearedLine, entry: number): string {
  return `Paid ${line.invoice_no}: ${formatUsd(line.amount_cents)} to ${line.vendor_name}, account ending ${lastFour(line.account)}. Released by controller. Ledger entry ${entry}.`;
}

export function refusedHeld(invoiceNo: string): string {
  return `Refused: ${invoiceNo} is on hold.`;
}

export function refusedNotCleared(invoiceNo: string): string {
  return `Refused: ${invoiceNo} has not been cleared.`;
}

export function refusedAlreadyPaid(invoiceNo: string): string {
  return `Refused: ${invoiceNo} is already paid.`;
}
