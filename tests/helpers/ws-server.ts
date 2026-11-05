import { WebSocketServer, type WebSocket as ServerSocket } from 'ws';

export type TestServer = {
  server: WebSocketServer;
  sockets: ServerSocket[];
  headers: (string | undefined)[];
  urls: string[];
  received: unknown[];
  close: () => Promise<void>;
};

// Test servers bind a fixed port in 24000-24999, never port 0: the build user's firewall allows only 23000-29999.
export function startWsServer(port: number): Promise<TestServer> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({ port, host: '127.0.0.1' });
    const state: TestServer = {
      server,
      sockets: [],
      headers: [],
      urls: [],
      received: [],
      close: () =>
        new Promise((done) => {
          for (const socket of state.sockets) socket.terminate();
          server.close(() => done());
        }),
    };
    server.on('connection', (socket, request) => {
      state.sockets.push(socket);
      state.headers.push(request.headers.authorization);
      state.urls.push(request.url ?? '');
      socket.on('message', (data) => state.received.push(JSON.parse(String(data))));
      socket.send(JSON.stringify({ event: 'connection_state', data: { rooms: [] } }));
    });
    server.on('listening', () => resolve(state));
  });
}
