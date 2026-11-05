import { requireEnv } from '../switch/state.ts';
import { provision, type Owners } from './provision.ts';

const owners: Owners = process.env['AIRLOCK_OWNERS'] === 'single' ? 'single' : 'two';
try {
  await provision({
    switchUrl: requireEnv('SWITCH_URL'),
    mattermostUrl: requireEnv('MATTERMOST_URL'),
    adminEmail: requireEnv('GATEWAY_ADMIN_EMAIL'),
    adminPassword: requireEnv('GATEWAY_ADMIN_PASSWORD'),
    mattermostAdminUser: requireEnv('MATTERMOST_ADMIN_USER'),
    mattermostAdminPassword: requireEnv('MATTERMOST_ADMIN_PASSWORD'),
    team: requireEnv('MATTERMOST_TEAM_NAME'),
    owners,
    templatesDir: 'switch/templates',
    stateRoot: process.env['STATE_ROOT'] ?? '/state',
    readyTimeoutMs: 300_000,
    log: (line) => console.log(`[provision] ${line}`),
  });
} catch (error) {
  console.error(`[provision] failed: ${String(error)}`);
  process.exit(1);
}
