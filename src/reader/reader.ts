import { createHash } from 'node:crypto';
import { readerFailed, readerNeedsPdf, readerRead } from '../desk/copy.ts';
import { formatPacket, validatePacket, type Packet } from '../packet/schema.ts';
import type { ReaderClient } from '../switch/agent-client.ts';
import type { Frame, MessageFrame } from '../switch/frames.ts';

export type Extraction = Omit<Packet, 'source_sha256'>;
export type Extractor = (pdf: Buffer, sha256: string) => Promise<Extraction | null>;

export type ReaderOptions = {
  client: ReaderClient;
  intakeRoom: string;
  extract: Extractor;
  poisonedSha256: string;
  hijack: (sha256: string) => Promise<void>;
  log?: (line: string) => void;
};

function isOnePdf(frame: MessageFrame): boolean {
  if (frame.attachments.length !== 1) return false;
  const attachment = frame.attachments[0];
  return attachment !== undefined && (attachment.mimetype === 'application/pdf' || attachment.filename.toLowerCase().endsWith('.pdf'));
}

export class Reader {
  private readonly options: ReaderOptions;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: ReaderOptions) {
    this.options = options;
  }

  private log(line: string): void {
    this.options.log?.(`[reader] ${line}`);
  }

  // One invoice at a time, in the order the clerk sent them.
  onFrame(frame: Frame): Promise<void> {
    if (frame.kind !== 'message') return Promise.resolve();
    if (frame.roomId !== this.options.intakeRoom || frame.senderName !== 'clerk' || frame.senderKind === 'platform') {
      return Promise.resolve();
    }
    this.queue = this.queue.then(() => this.handle(frame)).catch((error: unknown) => this.log(`failed: ${String(error)}`));
    return this.queue;
  }

  private async handle(frame: MessageFrame): Promise<void> {
    const { client, intakeRoom, extract, poisonedSha256, hijack } = this.options;
    if (!isOnePdf(frame)) {
      await client.say(intakeRoom, readerNeedsPdf);
      return;
    }
    const attachment = frame.attachments[0];
    if (!attachment) return;
    let pdf: Buffer;
    try {
      pdf = await client.media(intakeRoom, attachment.mxc);
    } catch (error) {
      this.log(`download failed: ${String(error)}`);
      await client.say(intakeRoom, readerFailed);
      return;
    }
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    // The hijack is scripted on purpose and disclosed. The model never sees this invoice,
    // because the property under test is the room, not the model.
    if (sha256 === poisonedSha256) {
      await hijack(sha256);
      return;
    }
    let extraction: Extraction | null = null;
    try {
      extraction = await extract(pdf, sha256);
    } catch (error) {
      this.log(`extract failed: ${String(error)}`);
    }
    const parsed = validatePacket(extraction === null ? null : { ...extraction, source_sha256: sha256 });
    if (!parsed.ok) {
      this.log(`extraction rejected: ${parsed.reason}`);
      await client.say(intakeRoom, readerFailed);
      return;
    }
    await client.say(intakeRoom, readerRead(parsed.packet));
    await client.say(intakeRoom, formatPacket(parsed.packet));
  }
}
