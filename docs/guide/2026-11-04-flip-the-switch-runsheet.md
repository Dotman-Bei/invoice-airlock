# Runsheet: Flip the Switch Hackathon

Last updated: 2026-11-05 by the guide seat. The Step 0a pack at `docs/resources/2026-11-04-flip-the-switch/` is the source for event facts.

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
- **Verdicts:** 0a CLEAR · 0 CLEAR · 1 CLEAR · 2 CLEAR (orchestrator, 2026-11-05) · 2.5 CLEAR for browser scenes · 3 CLEAR on that session's probes, re-probe row 5.
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
- **Route per the brief:** standalone Docker Compose with `collab` and `gateway` on the VPS, because the two-owner design needs a second Switch user. The user relaxed C2 (Switch Console) from hard to degraded on 2026-11-04, so #1441 and #1335 stop mattering. It returns to hard only if the runtime checks show linking accounts requires Console.
- **Server (from the committed report, 3e9e6b3; the guide did not re-run it):** Switch 0.31.0 runs on the VPS under non-root user `switch`, loopback only: API 18000, Gateway 13000, Mattermost 18065, Postgres 15432. Stack idle about 441 MiB, about 3.7 GiB available, swap 750 MiB; agents and model load not measured. The stack has no restart policy, so it stays down after a host reboot until `docker compose up -d`.
- **Runtime results:** the two-owner containment held; no attack reached `treasury`. Money-shot changes needed: refusals hide behind "1 reply" unless `CollapsedThreads` is disabled, and the ejection doesn't show in Mattermost, so the courier must announce it. The architect plans from these findings.
- **Build location (user-approved at the design gate, spec section 11):** on the VPS, under new OS user `airlock-build`, with rootless Docker, no sudo, and a firewall chain that only that user's packets enter. Install and smoke are user-reported as passed. The setup also added a host-wide AppArmor profile for rootlesskit; `setup-build-user.sh uninstall` removes it and the user.
- **Conflict the guide raised 2026-11-04:** the spec says the orchestrator runs over plain SSH in `tmux`, and the user's standing rule is chat panel only, no terminal. Guide recommendation: VS Code Remote-SSH as `airlock-build`, with the laptop kept on and connected. That user's firewall refuses loopback ports outside 23000-29999, so the window pins the VS Code server's port with `remote.SSH.serverPickPortsFromRange`. This worked: the whole build ran from that window's chat panel.
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
| 1 architect | done | spec, 7 plans, 35-task manifest, `docs/FRONTEND.md`, submission draft, Stack rows at deb2911 | Guide 2026-11-04: pushed; 6 Stage-4 checks re-run by script and clean (DAG, requires, manifest/plan equality, effort, human gates, tier pins); all 12 form fields answered against the live form; no secrets found by pattern scan; setup script read in full; design skill hash matches after normalising line endings. Plans spot-read, not all 8,000 lines; tests not re-run; smoke user-reported. The static page's button said `Run attack` over hardcoded text. Fixed in a233b6d by an architect session: the panel says it is a replay, and task 7.2's test ties each answer to the recorded report. Checks re-run clean by the guide | Ran on VPS as root, user-approved for planning only (spec section 17) |
| 2 orchestrator | done | 35 of 35 tasks; `demo:5.3` and `frontend:7.5` done by the user 2026-11-05 | Guide 2026-11-05: manifest shows 33 done and 2 pending; GitHub and the VPS clone match. Recorded `docs/proof/proof-report.md` exits 0, all 9 attacks and 6 controls contained; `--single-owner` exits 1 with no payment. Attack 7's added refusal read and accepted; README discloses its limit. Pattern scan found no secrets. Since the proof run only demo and page tooling changed. Guide did not re-run `./prove.sh` or the task gates. The deploy key can't push workflow files, so the guide pushed `.github/workflows/pages.yml` and the 2 commits after it from the laptop, on the user's go, hashes unchanged. The workflow runs only when started by hand | `opus` + `high`, on the VPS as `airlock-build` |
| 2.5 demo-studio | kickoff handed over | | ffmpeg installed and probed by the guide 2026-11-05 | `sonnet` + `high`, on the laptop |
| 3 gate-concierge preflight | pending | | | |
| 3 gate-concierge closing | pending | | | |

## Next action

Step 2.5: the user runs demo-studio on the laptop, with upload left manual. The desk runs on the VPS with the real model, reached through a laptop-only SSH tunnel held by the guide's chat, not VS Code's Ports panel. The guide resets it before recording, and the passwords change on each reset. Agents don't run as `airlock-build` while the sign-in is on the VPS, so demo-studio routes any VPS action through the guide. Then Step 3 closing.

## Done by the user

- 2026-11-04: signed up on the event page, starred the Switch repo, joined the Discord (user-reported; the signed-in event page showed the registered state).

## Open blockers

1. `reader` needs its own non-root OS user or container on the VPS, and a model sign-in the user does personally. No model agent runs as `switch`.
2. Demo cast decided by the user 2026-11-04: the user plays both the clerk and the controller, on two Switch accounts. The form asks for a real chat with teammates, so the architect, demo script and README must say plainly that one person plays both roles. Check 5 (telling two people apart) still matters.
3. The page is public on Vercel since 2026-11-05 (https://invoice-airlock-site.vercel.app), while the repo is still private, so its repo link is a 404 until the flip. Don't share it before then. Vercel redeploys on each push to `main`. At closing, decide whether Vercel keeps its GitHub access.
4. Wispr Flow not installed (C5). Blocks only that side track, but usage should start now.
7. Task `demo:5.3` uses terminal commands (`claude setup-token`, `ssh -L`). Find a chat-panel path before that gate. VS Code's Ports panel can replace the tunnel; the token must never pass through chat.
8. At closing: remove both write deploy keys if no longer needed (`github-flipswitch`, and the `airlock-build` key, which can also force-push). Run `setup-build-user.sh uninstall` if the user wants the VPS back as it was.
6. Before the repo goes public: scrub machine details from the tollgate report and pack (laptop and VPS hostnames, the VPS service name and key path, the browser extension list).
10. Final proof run done at 3665b52. The guide then repeated it on 2026-11-05: `./prove.sh` exited 0 on 4 of 4 runs, every attack and control contained. Attack 7's refusal varies between `not_permitted` and `not_in_room`, both accepted.
11. Before the demo and the public flip: attack 7 under `--single-owner` varies. It was breached in 1 of 3 runs (the courier's notice missed its 30-second wait) and contained in 2. README lines 40 and 64 and beat sheet line 40 state it as always succeeding. Say attacks 2, 3, 4, 5 and 8 succeed, and attack 7 sometimes does. Carry this in the demo-studio and closing kickoffs. Cause of the missed notice not investigated; single-owner control only. README line 132's "usually" for `not_in_room` is 2 of 4 in the guide's runs, so soften it too.
12. Teardown done by the guide 2026-11-05: desk stopped, `.run/airlock-demo/model.env` shredded on the VPS, tunnel closed, second single-owner run saved as `docs/proof/single-owner-report-rerun.md`. Still to do: revoke the 1-year `reader` token. The user's screenshot exposed its full value in the guide's chat history on 2026-11-05, and making a new token wouldn't cancel it, so revoking is required, not optional. Also delete that screenshot from the session's temp images. The value is not recorded anywhere in this repo.
14. Before the public flip: add `.gitattributes` with `*.pdf binary`. With `core.autocrlf=true`, a Windows checkout rewrites the synthetic PDFs' line endings, so `INV-2091.pdf` stops matching `fixtures/extractions/poisoned-sha256.txt` and the scripted hijack never fires. The guide restored the laptop's two invoices byte for byte from git on 2026-11-05; git shows them as modified, so don't commit or restore them.
13. The laptop's connection to the VPS dropped twice on 2026-11-05 and recovered by itself. The tunnel reconnects automatically, but check it before a recording take.
