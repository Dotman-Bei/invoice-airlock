import { parseFrame, type Frame } from './frames.ts';

export type OpResult = { status: number; body: unknown; retryAfter: string | null };

// What agent logic needs from Switch. Tests inject a fake.
export interface DeskClient {
  op(name: string, args?: Record<string, unknown>): Promise<OpResult>;
  say(roomId: string, content: string): Promise<OpResult>;
}

export interface ReaderClient extends DeskClient {
  media(roomId: string, mxc: string): Promise<Buffer>;
}

export type AgentIdentity = { id: string; apiKey: string; connectionId: string; name: string };
export type ClientOptions = {
  baseUrl: string;
  identity: AgentIdentity;
  filter: 'all' | 'addressed';
  retryDelayMs?: number;
  log?: (line: string) => void;
};

export function resultOf<T>(result: OpResult): T | null {
  if (result.status !== 200 || typeof result.body !== 'object' || result.body === null) return null;
  const inner = (result.body as Record<string, unknown>)['result'];
  return inner === undefined ? null : (inner as T);
}

const MAX_BACKOFF_MS = 15_000;
const CONFLICT_RETRIES = 5;

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class AgentClient implements ReaderClient {
  private readonly options: ClientOptions;
  private socket: WebSocket | null = null;
  private stopped = false;
  private cursor = 0;
  private backoffMs = 1000;
  private onFatal: (reason: string) => void = () => {};

  constructor(options: ClientOptions) {
    this.options = options;
  }

  // Resolves at the first connection_state. Fatal means evicted by a takeover, which must not reconnect.
  start(onFrame: (frame: Frame) => void | Promise<void>, onFatal: (reason: string) => void): Promise<void> {
    this.onFatal = onFatal;
    return new Promise((resolve) => this.open(onFrame, resolve));
  }

  stop(): void {
    this.stopped = true;
    this.socket?.close();
  }

  private log(line: string): void {
    this.options.log?.(`[${this.options.identity.name}] ${line}`);
  }

  private open(onFrame: (frame: Frame) => void | Promise<void>, ready: () => void): void {
    const { baseUrl, identity, filter } = this.options;
    const query = new URLSearchParams({
      connection_id: identity.connectionId,
      filter,
      scope: 'all',
      client: 'invoice-airlock',
      client_version: '1',
    });
    const url = `${baseUrl.replace(/^http/, 'ws')}/agents/${identity.id}/connection/ws?${query.toString()}`;
    const socket = new WebSocket(url, { headers: { Authorization: `Bearer ${identity.apiKey}` } });
    this.socket = socket;
    socket.onmessage = (event) => {
      const { frame, cursor } = parseFrame(String(event.data));
      if (frame.kind === 'ping') {
        // Answered before anything else. Six seconds of silence evicts the connection.
        socket.send(JSON.stringify({ type: 'pong', cursor: this.cursor }));
        return;
      }
      if (cursor !== null) this.cursor = cursor;
      if (frame.kind === 'connection_state') {
        this.backoffMs = 1000;
        ready();
      }
      if (frame.kind === 'evicted' && frame.reason === 'taken_over') {
        this.stopped = true;
        this.onFatal('taken_over');
        return;
      }
      Promise.resolve(onFrame(frame)).catch((error: unknown) => this.log(`handler failed: ${String(error)}`));
    };
    socket.onerror = () => this.log('socket error');
    socket.onclose = () => {
      if (this.stopped) return;
      const delay = this.backoffMs;
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      setTimeout(() => this.open(onFrame, ready), delay);
    };
  }

  private async post(path: string, body: unknown): Promise<OpResult> {
    const { baseUrl, identity } = this.options;
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.apiKey}`,
          'Content-Type': 'application/json',
          'X-Switch-Connection-Id': identity.connectionId,
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await readBody(response), retryAfter: response.headers.get('retry-after') };
    } catch (error) {
      return { status: 0, body: String(error), retryAfter: null };
    }
  }

  // A refused call comes back as data. Only "connection is not open" is worth retrying.
  async op(name: string, args: Record<string, unknown> = {}): Promise<OpResult> {
    const path = `/agents/${this.options.identity.id}/ops/${name}`;
    let result = await this.post(path, args);
    for (let i = 0; i < CONFLICT_RETRIES && result.status === 409 && JSON.stringify(result.body).includes('is not open'); i++) {
      await new Promise((resolve) => setTimeout(resolve, this.options.retryDelayMs ?? 1000));
      result = await this.post(path, args);
    }
    return result;
  }

  say(roomId: string, content: string): Promise<OpResult> {
    return this.post(`/agents/${this.options.identity.id}/message`, { room_id: roomId, content });
  }

  async media(roomId: string, mxc: string): Promise<Buffer> {
    const { baseUrl, identity } = this.options;
    const query = new URLSearchParams({ mxc });
    const response = await fetch(`${baseUrl}/agents/${identity.id}/rooms/${roomId}/media?${query.toString()}`, {
      headers: { Authorization: `Bearer ${identity.apiKey}` },
    });
    if (response.status !== 200) {
      throw new Error(`media download returned ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
