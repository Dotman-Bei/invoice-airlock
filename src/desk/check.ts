import type { Packet } from '../packet/schema.ts';
import type { Desk, Vendor } from './data.ts';

export type HoldReason =
  | 'unknown-vendor'
  | 'bank-mismatch'
  | 'po-mismatch'
  | 'grn-missing'
  | 'amount-mismatch';

export type Decision =
  | { kind: 'duplicate'; invoiceNo: string }
  | { kind: 'held'; reason: HoldReason; packet: Packet; vendor: Vendor | null }
  | { kind: 'cleared'; packet: Packet; vendor: Vendor };

// The first failure decides. The order is part of the design.
export function checkPacket(packet: Packet, desk: Desk, decided: ReadonlySet<string>): Decision {
  if (decided.has(packet.invoice_no)) {
    return { kind: 'duplicate', invoiceNo: packet.invoice_no };
  }
  const vendor = desk.vendors.find((v) => v.vendor_id === packet.vendor_id);
  if (!vendor) {
    return { kind: 'held', reason: 'unknown-vendor', packet, vendor: null };
  }
  if (vendor.routing !== packet.routing || vendor.account !== packet.account) {
    return { kind: 'held', reason: 'bank-mismatch', packet, vendor };
  }
  const po = desk.purchaseOrders.find((p) => p.po_no === packet.po_no && p.vendor_id === vendor.vendor_id);
  if (!po) {
    return { kind: 'held', reason: 'po-mismatch', packet, vendor };
  }
  const grn = desk.goodsReceipts.find((g) => g.grn_no === packet.grn_no && g.po_no === po.po_no);
  if (!grn) {
    return { kind: 'held', reason: 'grn-missing', packet, vendor };
  }
  if (packet.amount_cents !== grn.received_amount_cents || packet.amount_cents > po.amount_cents) {
    return { kind: 'held', reason: 'amount-mismatch', packet, vendor };
  }
  return { kind: 'cleared', packet, vendor };
}
