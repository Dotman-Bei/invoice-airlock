import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFrame } from '../src/switch/frames.ts';

test('both ping shapes are recognised', () => {
  assert.equal(parseFrame('{"event":"ping"}').frame.kind, 'ping');
  assert.equal(parseFrame('{"type":"ping"}').frame.kind, 'ping');
});

test('a message frame is unpacked from its payload', () => {
  const { frame, cursor } = parseFrame(JSON.stringify({
    id: 4813,
    event: 'message',
    data: {
      type: 'message',
      room_id: 'room-1',
      payload: {
        addressed: false,
        sender: '@switch-agent-1:localhost',
        sender_name: 'reader',
        message_id: 'sw_1',
        body: 'hello',
        timestamp: 123,
        thread_id: null,
        attachments: [{ filename: 'a.pdf', mimetype: 'application/pdf', size: 3, mxc: 'mxc://x', msgtype: 'm.file' }],
      },
    },
  }));
  assert.equal(cursor, 4813);
  assert.deepEqual(frame, {
    kind: 'message',
    roomId: 'room-1',
    messageId: 'sw_1',
    addressed: false,
    sender: '@switch-agent-1:localhost',
    senderName: 'reader',
    senderKind: null,
    body: 'hello',
    timestamp: 123,
    threadId: null,
    attachments: [{ filename: 'a.pdf', mimetype: 'application/pdf', size: 3, mxc: 'mxc://x', msgtype: 'm.file' }],
  });
});

test('a room_join frame keeps the member and ignores nothing', () => {
  const { frame } = parseFrame(JSON.stringify({
    id: 9,
    event: 'room_join',
    data: { room_id: 'room-1', payload: { member: '@switch-agent-2:localhost', member_name: 'treasury', timestamp: 5, listening: false } },
  }));
  assert.deepEqual(frame, {
    kind: 'room_join',
    roomId: 'room-1',
    member: '@switch-agent-2:localhost',
    memberName: 'treasury',
    timestamp: 5,
    listening: false,
  });
});

test('evicted carries its reason, and unknown frames are named', () => {
  assert.deepEqual(parseFrame('{"event":"evicted","data":{"reason":"taken_over"}}').frame, { kind: 'evicted', reason: 'taken_over' });
  assert.deepEqual(parseFrame('{"event":"gap","data":{}}').frame, { kind: 'other', name: 'gap' });
});
