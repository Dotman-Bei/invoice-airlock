import { lookup } from 'node:dns/promises';
import { connect } from 'node:net';
import type { ProbeResult } from './hijack.ts';

const TIMEOUT_MS = 2000;

export async function probeHost(host: string, port: number): Promise<ProbeResult> {
  let dns = false;
  try {
    await lookup(host);
    dns = true;
  } catch {
    dns = false;
  }
  const tcp = await new Promise<boolean>((resolve) => {
    const socket = connect({ host, port, timeout: TIMEOUT_MS });
    const finish = (reached: boolean): void => {
      socket.destroy();
      resolve(reached);
    };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
  return { dns, tcp };
}
