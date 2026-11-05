// Used by demo.sh. Prints the two demo logins. The passwords are throwaway and local to this stack.
import { readFileSync } from 'node:fs';
import type { DeskState } from '../provision/desk-state.ts';

const desk = JSON.parse(readFileSync('/state/desk.json', 'utf8')) as DeskState;
console.log(`clerk       ${desk.people.clerk.mattermostPassword}`);
console.log(`controller  ${desk.people.controller.mattermostPassword}`);
