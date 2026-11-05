import { readFileSync } from 'node:fs';
import type { AgentIdentity } from './agent-client.ts';

// Written by provision into a volume only this agent mounts.
export type AgentState = {
  id: string;
  api_key: string;
  connection_id: string;
  name: string;
  rooms: { intake?: string; release?: string };
};

export function readAgentState(path: string): AgentState {
  return JSON.parse(readFileSync(path, 'utf8')) as AgentState;
}

export function identityOf(state: AgentState): AgentIdentity {
  return { id: state.id, apiKey: state.api_key, connectionId: state.connection_id, name: state.name };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return value;
}
