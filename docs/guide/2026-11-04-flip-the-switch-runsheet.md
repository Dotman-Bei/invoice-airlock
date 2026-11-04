# Runsheet: Flip the Switch Hackathon

Last updated: 2026-11-04 13:45 UTC by the guide seat. The Step 0a pack at `docs/resources/2026-11-04-flip-the-switch/` is the source for event facts.

## Event

- **Name:** Flip the Switch Hackathon (WeMakeDevs x DevTools Academy x Switch)
- **URLs:** https://www.wemakedevs.org/hackathons/switch · https://www.devtoolsacademy.com/hackathons/flip-the-switch
- **Deadline:** Sat 2026-11-07 23:59 IST = 18:29 UTC = 19:29 UTC+1.
- **Judging:** Use of Switch 30% · Technical execution 25% · Creativity and impact 25% · Presentation and documentation 20%.
- **Must ship:** repo, demo video, README. Switch must be central. The Switch setup and the workflow must be built during the hackathon; existing agents, libraries and templates are fine.
- **Submission form opened 2026-11-04 14:25 UTC** (`submission_mode: form`, public GET `https://wemakedevs-server.onrender.com/hackathons/switch`, field `submission_questions`). This supersedes pack question 4 and the brief's "form is still off" line. Required: project title; tracks (checkboxes, "Best Business Workflow" for us); description (problem, and who it's for); public GitHub repo with a setup README; demo video **under 3 minutes**, on YouTube or Loom, public or unlisted, showing "the agent working in a real chat with your teammates"; how you used Switch (agent, platforms, real work, how teammates work with it); what you liked and would improve. Optional: live demo, blog post, Wispr usage card (Insights, Your usage, Share), #HowISwitch post. Everyone who submits is considered for Code with Wispr if the card is uploaded.

## Project repo

- `Dotman-Bei/invoice-airlock`, private, pipeline-created by the guide as `flip-the-switch-2026` and renamed by idea-forge on 2026-11-04. Local clone keeps its folder name: `C:\Users\bamig\Documents\VIBE CODE\Hackathons\flip-the-switch-2026`.
- Read-write deploy key `github-flipswitch` is on the repo for the user's VPS, added by the user (confirmed 2026-11-04). Remove it at closing if no longer needed.

## Kit

- `C:\Users\bamig\Documents\VIBE CODE\Hackathons\build-system`, at origin/main 230bbc8, clean. Read-only.
- `~/hackathons/build-system` from the original prompt does not exist on this machine. Every kickoff carries the real path.

## Tollgate

- Report: `docs/tollgate/2026-11-04-tollgate.md`, from Step 0a Stage 0, extended by a VPS probe.
- **Verdicts:** 0a CLEAR · 0 CLEAR · 1 BLOCKED (C2 Switch Console, C3 Switch server) · 2 BLOCKED (C2, C3; stack rows not written) · 2.5 BLOCKED (row 10 ffmpeg; row 6 computer use to re-probe) · 3 CLEAR on that session's probes, re-probe row 5.
- Routing: `per-spawn`; opus, sonnet and haiku resolve to `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. No warnings.
- `gh` is not on the VS Code PATH. Kickoffs carry `C:\Users\bamig\AppData\Local\Programs\GitHub CLI\bin\gh.exe`.

## Goal

- Win Track 01 (Best Business Workflow), plus the side tracks below. Confirmed by the user 2026-11-04, after briefly adding and then dropping Track 02.

## Calendar

- User has 70 hours available, out of about 78 left at 2026-11-04 12:17 UTC. That leaves about 8 hours off in total, so plan sleep into the autonomous build stretches and use `autonomous` review mode overnight. Calendar-fit call on the winning idea assumes the user's attention is the scarce resource, not the 70 hours.

**Calendar-fit call on Invoice Airlock (guide, 2026-11-04 14:30 UTC, about 76 hours left): it fits.** The scope is small and self-contained: one server, two rooms, three small agents, a mock bank, a proof command, with no external dependency. The real risk is whether Switch behaves at runtime as the source reads, so that gets tested before Step 1. If two owners fail, the brief's own fallback drops attack 3. Feature freeze stays Fri 22:00. Video length is under 3 minutes, not the kit's default of about 3:00.

| Target (UTC+1) | Milestone |
|---|---|
| Wed Nov 4, evening | Step 0 done; Switch route proven; calendar-fit call made |
| Thu Nov 5, morning | Step 1 approved; concierge preflight running alongside the build |
| Fri Nov 6, 22:00 | Build green; frontend pages done; feature freeze |
| Sat Nov 7, 12:00 | Demo video cut and watched by the user |
| Sat Nov 7, 16:00 | Submission filed by the user. Leaves 3.5 hours of buffer |

## Strategy decisions

- **Mode:** guided. First campaign on this event, and the user approves each baton.
- **Steps:** 0a, 0, 1, 2, 2.5, 3 (preflight and closing). 2.5 stays because a demo video is mandatory.
- **Tracks:**
  1. Track 01 Best Business Workflow, `$2,000` on WeMakeDevs, "to be announced" on DevTools Academy: the user's confirmed goal.
  2. Code with Wispr, `$500`: stacks on any track; needs a Wispr Flow scorecard, and Flow is not installed yet.
  3. Best Blog, AirPods 5: stacks on any track; low effort from project material.
- **Correction 2026-11-04:** the guide first cited the docs' payments room as a Stellar skills fit. The pack shows it is about setting up a payments team's channel, not moving money, and the event has no blockchain component. Track 01 stands on the user's goal, not on that reason. Web3 skills get used only if the rubric picks an idea that needs them.
- **Dropped:** Track 03: all 63 open `hackathon` issues already have assignees. Track 02: the user chose to focus on Track 01.
- **Risk appetite:** `safe-feasible`. 55% of the score rewards Switch centrality and reproducible execution, the runway is short, and Switch is new to the user.
- **Event rule:** Official Rules §3 prohibit bots, scripts and automated agents for registration or submission. Registration and Submit stay human, with signup automation struck for event accounts.

## Switch route

- **Correction 2026-11-04:** do not run the earlier prompt that installs Docker Desktop on the laptop. Docker's published minimum is build 22631 and the laptop is build 21996.
- **Decision (user, 2026-11-04):** Switch runs on the user's Ubuntu VPS, with Switch Console on the laptop if it opens. The VPS runs other services that must stay up: `127.0.0.1:8000` is taken, 4.1 GiB was available with no swap, and Docker was not installed at the probe.
- **VPS state (verified from the committed report, 2026-11-04):** Docker and swap are ready, existing services were undisturbed, about 3.6 GiB available plus 4 GiB swap. Switch is not installed or started. C1 passes on the VPS.
- **Before the server starts:** VPS sessions run as root. Don't run Switch agents as root on a machine with other services; set up a dedicated non-root user first, with its own `claude` sign-in.
- **Route per the brief:** standalone Docker Compose with `collab` and `gateway` on the VPS, because the two-owner design needs a second Switch user. Console may not be needed, which would make #1441 and #1335 moot. Relaxing C2 is the user's call; question open.
- **Build location:** the laptop has no Docker, and the kit is not on the VPS. Decide at Step 1 where Docker-gated tasks and the orchestrator run; the Stack rows must reflect it.
- **Fallbacks:** a separate small VPS if the user will not risk the current one. Compose plus Gateway if Console will not open.

## Frontend directive

- User: follow `design-taste-frontend` for all frontend work; spec at `docs/FRONTEND.md`, built one page at a time, no design questions to the user.
- Guide handling: no PRD exists yet, and the guide seat writes no plans or product code. Carried in the architect kickoff (write FRONTEND.md from the approved spec) and the orchestrator kickoff (build in its order). The user may overrule this.
- Scope notes: the skill targets public web pages and excludes dashboards and app screens. Size the frontend against a score where presentation is 20% and Switch centrality comes first.
- Check at Step 1: the skill sits in `Hackathons\.claude\skills\`, above this repo's root, and not at user level. Point kickoffs at its absolute path.

## Step status

| Step | Status | Artifact | Verification | Seat settings |
|---|---|---|---|---|
| Guide | open | this runsheet | n/a | `claude-opus-5-5`, stated; above the `standard` row, allowed. Effort `high`, per the prompt |
| 0a resource-extractor | done | `docs/resources/2026-11-04-flip-the-switch/` at 8efb5b4 | Passed by the guide 2026-11-04. Pushed; no secrets found by pattern scan; kit untouched; Switch deep, Wispr requirements. Weights match live DevTools Academy; WeMakeDevs 0% in fetched text matches the pack's count-up explanation (guide did not render it in Chrome). `submission_mode: none` confirmed live. Deviation accepted: rule prose is paraphrased, numbers are exact | `claude-opus-5-5`, stated; `high` per the kickoff |
| 0 idea-forge | done | `docs/idea-forge/2026-11-04-invoice-airlock-brief.md` at a463591 | Passed by the guide 2026-11-04. Pushed; all fields present, including feasibility notes; repo renamed; target tracks correct; no secrets found by pattern scan. Spot-checked at tag `switch-v0.31.0`: named files, `require_same_owner`, the refusal text, `API_HOST_PORT`, the modified Commons Clause all exist. Behavior not run. Stale line accepted: "form is still off" | `opus` + `max` per the kickoff; model id not seen by the guide |
| 1 architect | blocked | | C1, C2, C3 | |
| 2 orchestrator | blocked | | C1, C2, C3 | |
| 2.5 demo-studio | blocked | | row 10 | |
| 3 gate-concierge preflight | pending | | | |
| 3 gate-concierge closing | pending | | | |

## Next action

The user runs the server-and-runtime-checks prompt in a tab on the VPS (`opus` + `high`). The guide then verifies C3 and the six runtime checks and hands over the architect kickoff, which adds the KIT line and the frontend directive to idea-forge's block.

## Done by the user

- 2026-11-04: signed up on the event page, starred the Switch repo, joined the Discord (user-reported; the signed-in event page showed the registered state).

## Open blockers

1. Switch route not proven (C2, C3). Blocks Steps 1 and 2.
2. The brief needs a clerk and a controller, and the form asks for a real chat with teammates. User to decide who plays the second person in the demo.
3. ffmpeg missing. Blocks 2.5; fix before the demo.
4. Wispr Flow not installed (C5). Blocks only that side track, but usage should start now.
5. Before the orchestrator kickoff: hand over the prompt that copies `references/agents/executor-*.md` to `.claude/agents/`.
6. Before the repo goes public: scrub machine details from the tollgate report and pack (laptop and VPS hostnames, the VPS service name and key path, the browser extension list).
