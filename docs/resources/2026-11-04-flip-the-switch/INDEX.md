# Resource pack: Flip the Switch Hackathon

Step 0a output for idea-forge and the architect. Extracted 2026-11-04 by the resource-extractor seat. The tollgate is at [docs/tollgate/2026-11-04-tollgate.md](../../tollgate/2026-11-04-tollgate.md).

## Contents

| File | Holds |
|---|---|
| [event.md](event.md) | Deadline, eligibility, submission format, judging weights, prizes, the six flagged questions |
| [tracks.md](tracks.md) | Every track and side prize, with minimum bars |
| [sponsors/switch.md](sponsors/switch.md) | Deep integration facts: concepts, protocol, bridge, templates, self-hosting, Windows issues |
| [sponsors/wispr-flow.md](sponsors/wispr-flow.md) | What the Code with Wispr scorecard needs and how to get it |
| [prior-art.md](prior-art.md) | Switch examples, visible competitors, past WMD winners |

WeMakeDevs and DevTools Academy were scoped to event rules only, so they are covered in `event.md` with no sponsor file of their own.

## Read this first

**Open items for the user. These need a person.**

1. **The submission form is off.** `submission_mode` is `none` and `/submit` says the event takes registrations only. Ask in Discord today. [event.md question 4](event.md#4-where-and-how-to-submit-unresolved-and-urgent)
2. **Same project in Track 01 and 02, and multiple prizes:** not addressed by any source. Ask in the same Discord message.
3. **Track 01 prize and Track 03 count:** sources disagree. Lower priority.

**Facts that change planning:**

- Judging weights are confirmed at **30/25/25/20** on both sites.
- Docker may not be strictly required as of Console 0.40, but the native path is where Windows failures are reported (#1335).
- The agent protocol is **WebSocket**, not the SSE the event page describes.
- Repo `main` is ahead of the release. Build on Console `v0.40.1` and server `0.31.0`.

## How exact is this pack?

**Exact:** numbers, dates, prize values, weights, names of criteria and tracks, routes, field names, identifiers, commands, and short UI strings used as evidence.

**Paraphrased:** rule sentences, FAQ answers, criterion questions and doc explanations. The kit asks for verbatim quotes, but this pack restates source prose in its own words rather than reproducing it, and points to the source. Check the source URL when the precise wording of a rule matters, particularly Official Rules §3 and §5.

**Inference** is labeled where it appears.

## Provenance

All fetched 2026-11-04. "Primary" means the event's or vendor's own source. Confidence reflects whether the fact was read directly and whether sources agree.

### Event

| ID | Source | Tool | Type | Confidence / gaps |
|---|---|---|---|---|
| S1 | https://www.wemakedevs.org/hackathons/switch | Raw HTML via curl; Chrome (signed-in session, read-only) | Primary | High. Weights needed Chrome scroll to animate. A WebFetch summary was used only as a first look |
| S2 | https://www.wemakedevs.org/hackathons/switch/rules | Raw HTML via curl; Chrome | Primary | High. Read in full. Governing-court and privacy fields look unfilled |
| S3 | https://www.wemakedevs.org/hackathons/switch/schedule and `/resources` | Raw HTML via curl | Primary | High |
| S4 | https://www.wemakedevs.org/hackathons/switch/submit | Chrome, signed in; no form touched | Primary | High for today's state. May change |
| S5 | https://www.devtoolsacademy.com/hackathons/flip-the-switch | Raw HTML via curl; WebFetch | Primary | High. Possibly older than WMD on prizes; no last-updated date |
| S6 | https://wemakedevs-server.onrender.com/hackathons/switch (found through Chrome network requests) | curl, public GET, no auth | Primary, undocumented API | High for raw fields. Undocumented; meaning inferred from the site's code. `/judges` empty; `/winners`, `/projects` 403 |
| S7 | `wemakedevs-server.onrender.com/hackathons` and per-event `.../{slug}`, `/winners` | curl, public GET | Primary, undocumented API | High for names and links. Different events, so use as context only. Listing card from `https://www.wemakedevs.org/hackathons` |
| S8 | https://www.wemakedevs.org/terms | curl | Primary | Medium. Grep of hackathon, submission and prize clauses, not read in full |
| S9 | WMD client JS chunks loaded by `/submit` (`3i_4_fozvhe6u.js`, `1ld3162k78_5d.js`) | curl, then string search | Primary, minified code | Medium-high. Build artifacts change |
| S10 | https://www.wemakedevs.org/hackathons/wispr and its API record | curl | Primary for that event | Medium. A different event, used only as a signal |

### Switch

Docs base: `https://docs.switchagents.ai/switch-rooms/`, fetched as raw `.md` with `curl --doh-url https://1.1.1.1/dns-query`, because the machine's resolver and WebFetch could not resolve the host. Chrome confirmed the same host loads. All docs pages are primary.

| ID | Source | Depth | Notes |
|---|---|---|---|
| S11 | `gh api` / `gh issue list` / `gh search` on `sandbox-quantum/switch` | Metadata | Releases, tree, issue counts, repo search |
| S14 | Issue #1335 | Full thread | Open, 21 comments |
| S15 | Issue #1429 | First 700 characters | Open |
| S16 | `https://docs.switchagents.ai/llms.txt` | Full (Chrome) | Page index and the "Agent Instructions" header |
| S17 | `getting-started/add-a-server` | Full | |
| S18 | `building/index` | Full | |
| S19 | `building/payments-room` | Full | |
| S20 | `use-cases/index` | Full; individual use-case pages **not read** | |
| S21 | `using/shared-context` | Full | |
| S22 | `deploy/index` | Full | |
| S23 | `deploy/host-remotely` | First 50 lines | Onboarding steps not read |
| S24 | `deploy/self-host` | First 120 lines | Upgrade and later sections not read |
| S25 | `getting-started/index` | Full | |
| S26 | `resources/changelog` | Console 0.40.0, Switch 0.31.0, part of 0.30 | |
| S27 | `resources/troubleshooting` | Headings plus 3 sections in full | Rest not read |
| S28 | `internals/collaboration-bridge` | Full | |
| S29 | `deploy/messaging-apps/index` | Table only, truncated | Per-app pages downloaded, not read |
| S30 | `getting-started/set-up-agent-providers` | Nearly full | |
| S31 | `examples/*` on `main` | support-desk full; red-blue first 70 lines; others headers | Development line; triage-pair also via S1 |
| S32 | `getting-started/agent-settings` | Grep only | |
| S33 | `internals/agent-protocol` | Full | |
| S34 | `internals/agent-connection` | Grep of headings, tables, key lines | Read in full before implementing |
| S35 | `internals/agent-events` | Full | |
| S36 | `resources/room-commands` | Headings and tables | |
| S37 | `administer/room-templates`; `docs/TEMPLATES.md` | Template page mostly; TEMPLATES.md headings and "Version 2" start | Development line for TEMPLATES.md |
| S38 | `getting-started/add-a-second-agent` | Nearly full | |
| S39 | `getting-started/install-switch-console` | Full | |

Issues #1441 and #1158 were read (body or title), and #944, #1071, #1072 and #1073 by title only, through S11.

**Downloaded but not read** (available again from the docs): `using/work-in-a-room`, `using/agent-not-answering`, `using/how-switch-works`, `using/index`, `building/grow-into-an-organization`, `internals/index` (tables only), `internals/connectors-and-runtime`, `internals/life-of-a-message`, `internals/identity-and-access`, `internals/rooms-and-resources`, `internals/switch-console`, `administer/rooms`, `administer/shared-material`, `getting-started/onboard-your-agents`, `getting-started/create-a-room` (headings only), `getting-started/switch-expert`, `getting-started/what-keeps-your-agent-running` (opening only), `resources/working-safely-with-agents` (headings only), `resources/shared-responsibility`, `resources/glossary`, `resources/contribute`, `deploy/messaging-apps/{mattermost,discord}`.

**Out of scope:** Switch Trust docs. It appears in Switch's docs and in one use case. It is a separate product line with its own SDK and pricing, and it was not extracted.

### Wispr Flow

| ID | Source | Tool | Type | Confidence / gaps |
|---|---|---|---|---|
| S12 | https://docs.wisprflow.ai/articles/8760230576-your-usage-tab-track-your-dictation-stats-in-wispr-flow | WebFetch summary | Primary | Medium. No Share button mentioned, which conflicts with S10 |
| S13 | https://docs.wisprflow.ai/articles/1036674442-supported-devices-and-system-requirements | WebSearch summary | Primary, read via summary | Medium |

### Other

| Source | Tool | Use |
|---|---|---|
| https://docs.docker.com/desktop/setup/install/windows-install/ | WebFetch summary | Docker Desktop's Windows minimum, in the tollgate |
| GitHub repo search, "flip the switch hackathon" | `gh search repos` | Competitors in `prior-art.md`; a sample |
| Web searches on kickoff, submissions and past winners | WebSearch | Nothing usable on submission or kickoff |

## Re-verified

A second session re-checked these against live sources on 2026-11-04, from the VPS. All matched. The rest of the pack was read for consistency but not re-fetched.

| Fact | Tool | Result |
|---|---|---|
| Weights 30/25/25/20 on WMD | Chrome, scrolled to `#judging` | Match |
| Weights 30/25/25/20 on DTA | curl, static HTML | Match |
| `submission_mode`, `submission_questions`, `submissions_close_at`, `end_date`, `max_team_size`, `updated_at` | curl, public API (S6) | Match, unchanged |
| `/submit` says registrations only | Chrome, signed in, no form touched | Match |
| DTA "Prize to be announced"; WMD Track 03 `$100 × 20` | curl; Chrome | Match |
| Latest stable Console `switch-console-v0.40.1`, 2026-10-21 | GitHub public API | Match |
| #1335 open with 21 comments; #1441 open | GitHub public API | Match |
| Remote host requirements (S23) | curl, `deploy/host-remotely` | Match |

## Gaps

| Gap | Why | What would close it |
|---|---|---|
| Where to submit | Form off; nothing published | Discord, or the API flipping to `form` |
| WMD and Switch Discord servers | Gated; deliberately not opened | User reads or asks |
| Kickoff stream content (Nov 2) | No public recording found | User checks the YouTube channels |
| Judges' names | API list empty | Event update |
| Prize itemization to `$10,000` | Not published | Organizers |
| Code with Wispr scoring and window | Not published | Discord |
| Demo video length and host | Not stated for this event | Form, or Discord |
| #HowISwitch posts | X feed not read | Open the feed |
| Onboarding video and YouTube channel | Not watched | Watch; the written quickstart covers setup |
| Behavior on this machine | Nothing was installed | Steps 1 and 2 |
