import type { MessageFrame, RoomJoinFrame } from '../../src/switch/frames.ts';

export function message(overrides: Partial<MessageFrame>): MessageFrame {
  return {
    kind: 'message',
    roomId: '11111111-1111-4111-8111-111111111111',
    messageId: `id-${Math.random()}`,
    addressed: false,
    sender: '@sender:localhost',
    senderName: 'reader',
    senderKind: null,
    body: '',
    timestamp: 1000,
    threadId: null,
    attachments: [],
    ...overrides,
  };
}

export function join(overrides: Partial<RoomJoinFrame>): RoomJoinFrame {
  return {
    kind: 'room_join',
    roomId: '11111111-1111-4111-8111-111111111111',
    member: '@switch-agent-abc:localhost',
    memberName: 'treasury',
    timestamp: 2000,
    listening: false,
    ...overrides,
  };
}
