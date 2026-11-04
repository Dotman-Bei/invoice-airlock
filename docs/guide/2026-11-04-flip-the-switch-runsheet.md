# Runsheet: Flip the Switch Hackathon

Last updated: 2026-11-04 by the guide seat. Facts below come from a guide-level read of the event pages; the Step 0a pack supersedes them once committed.

## Event

- **Name:** Flip the Switch Hackathon (WeMakeDevs x DevTools Academy x Switch)
- **URLs:** https://www.wemakedevs.org/hackathons/switch · https://www.devtoolsacademy.com/hackathons/flip-the-switch
- **Deadline:** Sat 2026-11-07 23:59 IST = 18:29 UTC = 19:29 UTC+1. About 78 hours left at campaign start (2026-11-04 11:45 UTC).
- **Judging:** Use of Switch 30% · Technical execution 25% · Creativity and impact 25% · Presentation and documentation 20%. Source is the DevTools Academy page only; the WeMakeDevs page renders 0%. Step 0a must confirm.
- **Must ship:** repo, demo video, README. Switch must be central. The Switch setup and the workflow must be built during the hackathon; existing agents, libraries and templates are fine.

## Project repo

- `Dotman-Bei/flip-the-switch-2026`, private, pipeline-created by the guide. Local clone: `C:\Users\bamig\Documents\VIBE CODE\Hackathons\flip-the-switch-2026`.
- Rename to the project slug when the project is named (idea-forge Step 4).

## Kit

- `C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system`, at origin/main 230bbc8. Read-only.
- `~/hackathons/build-system` from the original prompt does not exist on this machine. Every kickoff carries the real path.

## Tollgate

- Report: not created yet. Step 0a Stage 0 creates `docs/tollgate/2026-11-04-tollgate.md`.
- Guide observations from 2026-11-04, not a substitute for the report:
  - Row 1 git: PASS. Row 2 gh: installed and logged in as Dotman-Bei, but not on the VS Code PATH (full path `C:\Users\bamig\AppData\Local\Programs\GitHub CLI\bin\gh.exe`). Row 3 kit: synced.
  - Row 5 Chrome tools: FAIL in the guide session. Extension present in the Chrome Default profile; integration never enabled (no native host registered).
  - Row 9 Node v22.17.1: PASS. Row 10 ffmpeg: missing, so Step 2.5 would block. Row 11 Python launcher and uv: present, 3.10–3.12 not confirmed. Row 16 disk: 105 GB free.
  - Row 18 env: `CLAUDECODE=1`; no routing-defeating variables set.
  - Campaign rows to add: Docker engine: not installed. WSL2: kernel file missing, no distro. Switch Console: not confirmed installed. OS: Windows Insider Dev build 21996.

## Goal

- ASSUMED, the user left this as template text: win Track 01 (Best Business Workflow, $2,000), plus the side tracks below. Awaiting confirmation.

## Calendar

- Deadline known. User's available hours left as template text. Awaiting confirmation.

| Target (UTC+1) | Milestone |
|---|---|
| Wed Nov 4, evening | 0a and 0 done; Switch running locally or the fallback chosen; calendar-fit call made |
| Thu Nov 5, morning | Step 1 approved; concierge preflight running alongside the build |
| Fri Nov 6, 22:00 | Build green; frontend pages done; feature freeze |
| Sat Nov 7, 12:00 | Demo video cut and watched by the user |
| Sat Nov 7, 16:00 | Submission filed by the user. Leaves 3.5 hours of buffer |

## Strategy decisions

- **Mode:** guided. First campaign on this event, and the user approves each baton.
- **Steps:** 0a, 0, 1, 2, 2.5, 3 (preflight and closing). 0a stays because Switch is unfamiliar and carries the top weight. 2.5 stays because a demo video is mandatory.
- **Tracks:**
  1. Track 01 Best Business Workflow, $2,000: strongest skills overlap, and the docs include a worked payments room to learn from.
  2. Code with Wispr, $500: stacks on any track; needs a Wispr Flow scorecard, so usage must start now.
  3. Best Blog, AirPods 5: stacks on any track; low effort from project material.
- **Dropped:** Track 03 ($100 each): all 63 open `hackathon` issues already have assignees (4–10 each in the 40 inspected), 200+ open PRs (query cap), and the rule is one person per issue. Track 02: same $2,000 but weaker skills overlap; re-check only if the idea fits it better.
- **Risk appetite:** `safe-feasible`. 55% of the score rewards Switch centrality and reproducible execution, the runway is 78 hours, and Switch is new to the user. Differentiation comes from the Stellar domain depth, not from a risky architecture.
- **Sponsor depth:** deep on Switch; requirements only for Wispr Flow; event rules only for WeMakeDevs and DevTools Academy.
- **Event rule:** entry is limited to natural persons, and bots, scripts and automated agents are prohibited for entries. Registration and Submit stay human, with signup automation struck for event accounts.

## Frontend directive

- User: follow `design-taste-frontend` for all frontend work; spec at `docs/FRONTEND.md`, built one page at a time, no design questions to the user.
- Guide handling: no PRD exists yet, and the guide seat writes no plans or product code. Carried in the architect kickoff (write FRONTEND.md from the approved spec) and the orchestrator kickoff (build in its order). The user may overrule this.
- Scope notes: the skill targets public web pages and excludes dashboards and app screens. Size the frontend against a score where presentation is 20% and Switch centrality comes first.
- Check at Step 1: the skill sits in `Hackathons\.claude\skills\`, above this repo's root, and not at user level. Point kickoffs at its absolute path.

## Step status

| Step | Status | Artifact | Verification | Seat settings |
|---|---|---|---|---|
| Guide | open | this runsheet | n/a | `claude-opus-5-5`, stated; above the `standard` row, allowed. Effort `high`, per the prompt |
| 0a resource-extractor | next | `docs/resources/2026-11-04-flip-the-switch/` | pending | set `opus` + `high` |
| 0 idea-forge | pending | | | |
| 1 architect | pending | | | |
| 2 orchestrator | pending | | | |
| 2.5 demo-studio | pending | | | |
| 3 gate-concierge preflight | pending | | | |
| 3 gate-concierge closing | pending | | | |

## Next action

The user connects Chrome with `/chrome`, opens a new tab in a VS Code window on this repo, sets `opus` + `high`, and pastes the Step 0a kickoff.

## Open blockers

1. Chrome tools not connected (row 5). Blocks 0a and 3; fix with `/chrome`.
2. Docker engine missing, WSL2 kernel missing, early-access Windows Console, Insider OS build. Blocks 1 and 2 until Switch runs here or a remote-server fallback is chosen.
3. ffmpeg missing. Blocks 2.5; fix before the demo.
4. User to confirm goal and available hours.
5. Hackathon registration is the user's to do. Submission location is not stated on the pages read; 0a to find it, otherwise ask in Discord.
6. Before the orchestrator kickoff: hand over the prompt that copies `references/agents/executor-*.md` to `.claude/agents/`.
