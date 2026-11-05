export type Person = { email: string; gatewayPassword: string; mattermostPassword: string };

// Everything the proof runner and demo.sh need. Only provision and proof-runner mount it.
export type DeskState = {
  owners: 'two' | 'single';
  team: string;
  bridgeId: string;
  admin: { email: string; password: string };
  people: { clerk: Person; controller: Person };
  rooms: { intake: string; release: string };
  agents: { reader: string; courier: string; treasury: string };
};
