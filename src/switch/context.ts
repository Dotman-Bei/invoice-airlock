import { resultOf, type OpResult } from './agent-client.ts';
import type { Attachment } from './frames.ts';

export type ContextEntry = {
  id: string;
  kind: string;
  sender: string;
  senderName: string;
  body: string;
  timestamp: number;
  attachments: Attachment[];
};

type RawEntry = {
  id?: string;
  kind?: string;
  sender?: string;
  sender_name?: string;
  body?: string;
  timestamp?: number;
  attachments?: Attachment[];
};

type RawContext = { threads?: { root?: RawEntry; replies?: RawEntry[] }[] };

function toEntry(raw: RawEntry): ContextEntry {
  return {
    id: raw.id ?? '',
    kind: raw.kind ?? 'message',
    sender: raw.sender ?? '',
    senderName: raw.sender_name ?? '',
    body: raw.body ?? '',
    timestamp: raw.timestamp ?? 0,
    attachments: raw.attachments ?? [],
  };
}

// read_context groups a room into threads. Agents here want a flat timeline, oldest first.
export function flattenContext(result: OpResult): ContextEntry[] {
  const context = resultOf<RawContext>(result);
  if (!context) return [];
  const entries: ContextEntry[] = [];
  for (const thread of context.threads ?? []) {
    if (thread.root) entries.push(toEntry(thread.root));
    for (const reply of thread.replies ?? []) entries.push(toEntry(reply));
  }
  return entries.sort((a, b) => a.timestamp - b.timestamp);
}
