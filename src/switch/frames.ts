export type Attachment = {
  filename: string;
  mimetype: string;
  size: number;
  mxc: string;
  msgtype: string;
};

export type MessageFrame = {
  kind: 'message';
  roomId: string;
  messageId: string;
  addressed: boolean;
  sender: string;
  senderName: string;
  senderKind: string | null;
  body: string;
  timestamp: number;
  threadId: string | null;
  attachments: Attachment[];
};

export type RoomJoinFrame = {
  kind: 'room_join';
  roomId: string;
  member: string;
  memberName: string;
  timestamp: number;
  listening: boolean;
};

export type Frame =
  | { kind: 'ping' }
  | { kind: 'connection_state' }
  | { kind: 'evicted'; reason: string }
  | { kind: 'refused'; detail: string }
  | { kind: 'other'; name: string }
  | MessageFrame
  | RoomJoinFrame;

export type ParsedFrame = { frame: Frame; cursor: number | null };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parseFrame(raw: string): ParsedFrame {
  const outer = asRecord(JSON.parse(raw));
  const name = asString(outer['event']);
  const data = asRecord(outer['data']);
  const cursor = typeof outer['id'] === 'number' ? outer['id'] : null;
  if (name === 'ping' || outer['type'] === 'ping') {
    return { frame: { kind: 'ping' }, cursor };
  }
  if (name === 'connection_state') {
    return { frame: { kind: 'connection_state' }, cursor };
  }
  if (name === 'evicted') {
    return { frame: { kind: 'evicted', reason: asString(data['reason']) }, cursor };
  }
  if (name === 'refused') {
    return { frame: { kind: 'refused', detail: JSON.stringify(outer['data'] ?? null) }, cursor };
  }
  const payload = asRecord(data['payload']);
  const roomId = asString(data['room_id']);
  if (name === 'message') {
    return {
      frame: {
        kind: 'message',
        roomId,
        messageId: asString(payload['message_id']),
        addressed: payload['addressed'] === true,
        sender: asString(payload['sender']),
        senderName: asString(payload['sender_name']),
        senderKind: typeof payload['sender_kind'] === 'string' ? payload['sender_kind'] : null,
        body: asString(payload['body']),
        timestamp: typeof payload['timestamp'] === 'number' ? payload['timestamp'] : 0,
        threadId: typeof payload['thread_id'] === 'string' ? payload['thread_id'] : null,
        attachments: Array.isArray(payload['attachments']) ? (payload['attachments'] as Attachment[]) : [],
      },
      cursor,
    };
  }
  if (name === 'room_join') {
    return {
      frame: {
        kind: 'room_join',
        roomId,
        member: asString(payload['member']),
        memberName: asString(payload['member_name']),
        timestamp: typeof payload['timestamp'] === 'number' ? payload['timestamp'] : 0,
        listening: payload['listening'] === true,
      },
      cursor,
    };
  }
  return { frame: { kind: 'other', name }, cursor };
}
