import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flattenContext } from '../src/switch/context.ts';

test('threads flatten into one timeline, oldest first', () => {
  const entries = flattenContext({
    status: 200,
    retryAfter: null,
    body: {
      result: {
        threads: [
          { root: { id: 'b', kind: 'message', sender_name: 'reader', body: 'two', timestamp: 2, attachments: [] }, replies: [] },
          {
            root: { id: 'a', kind: 'room_join', sender_name: 'treasury', body: 'treasury joined the room', timestamp: 1, attachments: [] },
            replies: [{ id: 'c', kind: 'message', sender_name: 'courier', body: 'three', timestamp: 3, attachments: [] }],
          },
        ],
      },
    },
  });
  assert.deepEqual(entries.map((e) => e.id), ['a', 'b', 'c']);
  assert.equal(entries[0]?.kind, 'room_join');
  assert.equal(entries[1]?.senderName, 'reader');
});

test('a failed read is an empty timeline', () => {
  assert.deepEqual(flattenContext({ status: 403, retryAfter: null, body: { detail: 'no' } }), []);
});
