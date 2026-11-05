import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Vendor = { vendor_id: string; name: string; routing: string; account: string };
export type PurchaseOrder = { po_no: string; vendor_id: string; amount_cents: number };
export type GoodsReceipt = { grn_no: string; po_no: string; received_amount_cents: number };
export type OpenOrders = { purchaseOrders: PurchaseOrder[]; goodsReceipts: GoodsReceipt[] };
export type Desk = OpenOrders & { vendors: Vendor[] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function loadOpenOrders(dir: string): OpenOrders {
  return {
    purchaseOrders: readJson<PurchaseOrder[]>(join(dir, 'purchase-orders.json')),
    goodsReceipts: readJson<GoodsReceipt[]>(join(dir, 'goods-receipts.json')),
  };
}

export function loadDesk(dir: string): Desk {
  return { ...loadOpenOrders(dir), vendors: readJson<Vendor[]>(join(dir, 'vendors.json')) };
}
