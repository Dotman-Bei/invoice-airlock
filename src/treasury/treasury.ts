import {
  paidMessage,
  parseDecisionLine,
  refusedAlreadyPaid,
  refusedHeld,
  refusedNotCleared,
  treasuryBadCommand,
  treasuryBankDown,
  type DecisionLine,
} from '../desk/copy.ts';
import type { PaymentRequest } from '../bank/ledger.ts';
import { resultOf, type DeskClient } from '../switch/agent-client.ts';
import { flattenContext } from '../switch/context.ts';
import type { Frame } from '../switch/frames.ts';

export type BankResult = { status: number; entry: number | null };
export type BankClient = (payment: PaymentRequest) => Promise<BankResult>;
export type BaselineStore = { load(): string[] | null; save(roomIds: string[]): void };

export type TreasuryOptions = {
  client: DeskClient;
  bank: BankClient;
  releaseRoom: string;
  intakeRoom: string;
  baseline: BaselineStore;
  log?: (line: string) => void;
};

const CONTROLLER = 'controller';
const PAY_COMMAND = /^@treasury\s+pay\s+(INV-\d{1,10})\s*$/;

type RoomRow = { room_id?: string };

export class Treasury {
  private readonly options: TreasuryOptions;
  private readonly alerted = new Set<string>();

  constructor(options: TreasuryOptions) {
    this.options = options;
  }

  private log(line: string): void {
    this.options.log?.(`[treasury] ${line}`);
  }

  // Conditions 1, 2 and 3 failing means silence, so a hostile room draws no text out of treasury.
  async onFrame(frame: Frame): Promise<void> {
    if (frame.kind !== 'message' || !frame.addressed) return;
    if (frame.senderKind === 'platform') return;
    if (frame.roomId !== this.options.releaseRoom) return;
    if (frame.senderName !== CONTROLLER) return;
    const command = PAY_COMMAND.exec(frame.body.trim());
    if (!command) {
      await this.options.client.say(this.options.releaseRoom, treasuryBadCommand);
      return;
    }
    await this.pay(command[1] as string);
  }

  private async latestDecision(invoiceNo: string): Promise<DecisionLine | null> {
    const { client, releaseRoom } = this.options;
    const entries = flattenContext(await client.op('read_context', { room_id: releaseRoom, limit: 200 }));
    let latest: DecisionLine | null = null;
    for (const entry of entries) {
      if (entry.senderName !== 'courier') continue;
      const line = parseDecisionLine(entry.body);
      if (line && line.invoice_no === invoiceNo) latest = line;
    }
    return latest;
  }

  private async pay(invoiceNo: string): Promise<void> {
    const { client, bank, releaseRoom } = this.options;
    const decision = await this.latestDecision(invoiceNo);
    if (!decision) {
      await client.say(releaseRoom, refusedNotCleared(invoiceNo));
      return;
    }
    if (decision.kind === 'held') {
      await client.say(releaseRoom, refusedHeld(invoiceNo));
      return;
    }
    // Payment details come from the courier's cleared line, never from the command.
    let result: BankResult;
    try {
      result = await bank({
        invoice_no: decision.invoice_no,
        vendor_id: decision.vendor_id,
        vendor_name: decision.vendor_name,
        amount_cents: decision.amount_cents,
        routing: decision.routing,
        account: decision.account,
        released_by: CONTROLLER,
      });
    } catch (error) {
      this.log(`bank failed: ${String(error)}`);
      await client.say(releaseRoom, treasuryBankDown);
      return;
    }
    if (result.status === 201 && result.entry !== null) {
      await client.say(releaseRoom, paidMessage(decision, result.entry));
    } else if (result.status === 409) {
      await client.say(releaseRoom, refusedAlreadyPaid(invoiceNo));
    } else {
      this.log(`bank returned ${result.status}`);
      await client.say(releaseRoom, treasuryBankDown);
    }
  }

  // Only room ids are sent. Room names are attacker-controlled and are never echoed.
  async pollRooms(): Promise<void> {
    const { client, releaseRoom, intakeRoom, baseline } = this.options;
    const result = await client.op('list_rooms');
    const rows = resultOf<RoomRow[]>(result);
    if (!Array.isArray(rows)) {
      this.log(`list_rooms returned ${result.status}`);
      return;
    }
    const current = rows.map((row) => row.room_id).filter((id): id is string => typeof id === 'string');
    const known = baseline.load();
    if (known === null) {
      baseline.save(current);
      return;
    }
    for (const roomId of [...this.alerted]) {
      if (!current.includes(roomId)) this.alerted.delete(roomId);
    }
    for (const roomId of current) {
      // The courier is in ap-intake and sees that join itself, so an alert would cut its delay short.
      if (known.includes(roomId) || roomId === intakeRoom || this.alerted.has(roomId)) continue;
      this.alerted.add(roomId);
      await client.say(releaseRoom, `@courier AIRLOCK-ALERT/1 ${JSON.stringify({ room_id: roomId })}`);
    }
  }
}
