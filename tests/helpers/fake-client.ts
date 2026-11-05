import type { OpResult, ReaderClient } from '../../src/switch/agent-client.ts';

export type OpCall = { name: string; args: Record<string, unknown> };
export type Said = { roomId: string; content: string };

// Records every call. Ops answer from a table, defaulting to 200 with an empty result.
export class FakeClient implements ReaderClient {
  ops: OpCall[] = [];
  said: Said[] = [];
  answers = new Map<string, OpResult | ((args: Record<string, unknown>) => OpResult)>();
  mediaBytes: Buffer = Buffer.from('');
  mediaError: Error | null = null;

  answer(name: string, result: OpResult | ((args: Record<string, unknown>) => OpResult)): void {
    this.answers.set(name, result);
  }

  async op(name: string, args: Record<string, unknown> = {}): Promise<OpResult> {
    this.ops.push({ name, args });
    const answer = this.answers.get(name);
    if (typeof answer === 'function') return answer(args);
    return answer ?? { status: 200, body: { result: {} }, retryAfter: null };
  }

  async say(roomId: string, content: string): Promise<OpResult> {
    this.said.push({ roomId, content });
    return { status: 200, body: { ok: true }, retryAfter: null };
  }

  async media(): Promise<Buffer> {
    if (this.mediaError) throw this.mediaError;
    return this.mediaBytes;
  }

  saidIn(roomId: string): string[] {
    return this.said.filter((s) => s.roomId === roomId).map((s) => s.content);
  }
}

export function context(entries: Record<string, unknown>[]): OpResult {
  return {
    status: 200,
    retryAfter: null,
    body: { result: { threads: entries.map((root) => ({ root, replies: [] })) } },
  };
}
