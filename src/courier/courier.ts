import { checkPacket } from '../desk/check.ts';
import {
  clearedMessage,
  heldMessage,
  intakeCleared,
  intakeHeld,
  intakeRemoved,
  parseDecisionLine,
  rejectDuplicate,
  rejectNotPacket,
  releaseHiddenRoom,
  releaseRemoved,
} from '../desk/copy.ts';
import type { Desk } from '../desk/data.ts';
import { PACKET_ATTEMPT_PREFIX, parsePacket } from '../packet/schema.ts';
import type { DeskClient } from '../switch/agent-client.ts';
import { flattenContext } from '../switch/context.ts';
import type { Frame } from '../switch/frames.ts';

export type CourierOptions = {
  client: DeskClient;
  desk: Desk;
  rooms: { intake: string; release: string };
  graceMs: number;
  startedAt: number;
  log?: (line: string) => void;
};

const KNOWN_AGENTS = new Set(['reader', 'courier', 'treasury']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALERT = /^@courier\s+AIRLOCK-ALERT\/1\s+(\{.*\})\s*$/;
const JOINED = /^([a-z0-9][a-z0-9._-]*) joined the room$/;

export class Courier {
  private readonly options: CourierOptions;
  private readonly allowed: Map<string, Set<string>>;
  private readonly seen = new Set<string>();
  private readonly decided = new Set<string>();
  private readonly pending = new Set<string>();
  private readonly inFlight = new Set<Promise<void>>();

  constructor(options: CourierOptions) {
    this.options = options;
    this.allowed = new Map([
      [options.rooms.intake, new Set(['reader', 'courier'])],
      [options.rooms.release, new Set(['treasury', 'courier'])],
    ]);
  }

  private log(line: string): void {
    this.options.log?.(`[courier] ${line}`);
  }

  // After a restart nothing repeats: decided invoices stay decided, and old chatter stays read.
  async recover(): Promise<void> {
    const { client, rooms, startedAt } = this.options;
    const releaseRead = await client.op('read_context', { room_id: rooms.release, limit: 200 });
    const intakeRead = await client.op('read_context', { room_id: rooms.intake, limit: 200 });
    // Without both reads a restart would repeat old decisions, so give up and let Compose restart this.
    if (releaseRead.status !== 200 || intakeRead.status !== 200) {
      throw new Error(`could not read the rooms: ${releaseRead.status}, ${intakeRead.status}`);
    }
    for (const entry of flattenContext(releaseRead)) {
      if (entry.senderName !== 'courier') continue;
      const line = parseDecisionLine(entry.body);
      if (line) this.decided.add(line.invoice_no);
    }
    for (const entry of flattenContext(intakeRead)) {
      if (entry.timestamp >= startedAt) continue;
      const parsed = parsePacket(entry.body);
      const undecidedPacket = parsed.ok && !this.decided.has(parsed.packet.invoice_no);
      if (!undecidedPacket) this.seen.add(entry.id);
    }
  }

  async onFrame(frame: Frame): Promise<void> {
    const { rooms } = this.options;
    if (frame.kind === 'room_join') {
      if (frame.member.startsWith('@switch-agent-')) this.noteJoin(frame.roomId, frame.memberName);
      return;
    }
    if (frame.kind !== 'message') return;
    if (frame.roomId === rooms.release && frame.senderName === 'treasury') {
      await this.handleAlert(frame.messageId, frame.body);
      return;
    }
    if (frame.roomId === rooms.intake) {
      await this.handleIntake(frame.messageId, frame.senderName, frame.body);
    }
  }

  // Catches what the socket missed: unaddressed messages in a room just joined, and joins.
  async backfill(): Promise<void> {
    const { client, rooms, startedAt } = this.options;
    const result = await client.op('read_context', { room_id: rooms.intake, limit: 50 });
    if (result.status !== 200) {
      this.log(`read_context returned ${result.status}`);
      return;
    }
    for (const entry of flattenContext(result)) {
      if (entry.kind === 'room_join') {
        if (entry.timestamp < startedAt || this.seen.has(entry.id)) continue;
        this.seen.add(entry.id);
        const name = JOINED.exec(entry.body)?.[1];
        if (name && KNOWN_AGENTS.has(name)) this.noteJoin(rooms.intake, name);
      } else {
        await this.handleIntake(entry.id, entry.senderName, entry.body);
      }
    }
  }

  // Waits for removals already scheduled. Used by tests and at shutdown.
  async settle(): Promise<void> {
    while (this.inFlight.size > 0) await Promise.all(this.inFlight);
  }

  private async handleIntake(id: string, senderName: string, body: string): Promise<void> {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    if (senderName !== 'reader') return;
    const { client, rooms } = this.options;
    if (body.startsWith(PACKET_ATTEMPT_PREFIX)) {
      const parsed = parsePacket(body);
      if (!parsed.ok) {
        this.log(`rejected a packet: ${parsed.reason}`);
        await client.say(rooms.intake, rejectNotPacket);
        return;
      }
      await this.decide(parsed.packet);
      return;
    }
    if (/@courier\b/.test(body)) {
      await client.say(rooms.intake, rejectNotPacket);
    }
  }

  private async decide(packet: Parameters<typeof checkPacket>[0]): Promise<void> {
    const { client, rooms, desk } = this.options;
    const decision = checkPacket(packet, desk, this.decided);
    if (decision.kind === 'duplicate') {
      await client.say(rooms.intake, rejectDuplicate(decision.invoiceNo));
      return;
    }
    this.decided.add(packet.invoice_no);
    if (decision.kind === 'cleared') {
      await client.say(rooms.release, clearedMessage(packet, decision.vendor));
      await client.say(rooms.intake, intakeCleared(packet.invoice_no));
      return;
    }
    await client.say(rooms.release, heldMessage(packet, decision.reason, decision.vendor));
    await client.say(rooms.intake, intakeHeld(packet.invoice_no));
  }

  private noteJoin(roomId: string, name: string): void {
    const allowed = this.allowed.get(roomId);
    if (!allowed || allowed.has(name)) return;
    const key = `${roomId}:${name}`;
    if (this.pending.has(key)) return;
    this.pending.add(key);
    const work = new Promise<void>((resolve) => setTimeout(resolve, this.options.graceMs))
      .then(() => this.remove(roomId, name))
      .catch((error: unknown) => this.log(`removal failed: ${String(error)}`))
      .finally(() => {
        this.pending.delete(key);
        this.inFlight.delete(work);
      });
    this.inFlight.add(work);
  }

  private async remove(roomId: string, name: string): Promise<void> {
    const { client, rooms } = this.options;
    const result = await client.op('remove_agent_from_room', { room_id: roomId, agent_name: name });
    if (result.status !== 200) {
      this.log(`remove_agent_from_room returned ${result.status}`);
      return;
    }
    // Only a known agent name is ever echoed.
    const shown = KNOWN_AGENTS.has(name) ? name : 'an agent';
    const roomName = roomId === rooms.intake ? 'ap-intake' : 'ap-release';
    await client.say(rooms.intake, intakeRemoved(shown));
    await client.say(rooms.release, releaseRemoved(shown, roomName));
  }

  // Room names are attacker-controlled, so only a validated room id is used, and only the id is echoed.
  private async handleAlert(id: string, body: string): Promise<void> {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    const match = ALERT.exec(body);
    if (!match) return;
    let roomId: unknown;
    try {
      roomId = (JSON.parse(match[1] as string) as Record<string, unknown>)['room_id'];
    } catch {
      return;
    }
    if (typeof roomId !== 'string' || !UUID.test(roomId)) return;
    const { client, rooms } = this.options;
    // treasury belongs in ap-release, and joins to ap-intake go through the delayed path above.
    if (roomId === rooms.intake || roomId === rooms.release) return;
    const result = await client.op('remove_agent_from_room', { room_id: roomId, agent_name: 'treasury' });
    if (result.status !== 200) {
      this.log(`hidden-room removal returned ${result.status}`);
      return;
    }
    await client.say(rooms.release, releaseHiddenRoom(roomId));
  }
}
