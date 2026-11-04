# Idea Forge Brief: Invoice Airlock

> An accounts-payable desk on Switch that stays safe when its own agent gets hijacked.
>
> The working title is provisional. This brief is the single source of truth handed to the architect (Step 1). It fixes *what* and *why*, not *how*.

## Event + constraints

- **Date written:** 2026-11-04
- **Hackathon:** Flip the Switch Hackathon (WeMakeDevs x DevTools Academy x Switch). https://www.wemakedevs.org/hackathons/switch · https://www.devtoolsacademy.com/hackathons/flip-the-switch
- **Hard deadline (inert calendar fact; idea-forge did not gate on it):** Sat 2026-11-07 23:59 IST = 18:29 UTC.
- **Team:** the user plus an autonomous agent pool (architect → executor pool → reviewer).
- **Target tracks:** Track 01 Best Business Workflow (primary), Code with Wispr, Best Blog.
- **Risk posture:** `safe-feasible`.
- **Event rules that bind the build:** Switch is central. The Switch setup and the workflow are built during the hackathon. At least one AI agent and one person complete a real task together through Switch in a team chat. Repo, demo video and README are required. Registration and submission stay human.
- **Resource pack:** `docs/resources/2026-11-04-flip-the-switch/`. Tollgate: `docs/tollgate/2026-11-04-tollgate.md`.

## Problem

Accounts-payable teams are being asked to let AI agents read vendor invoices and email, the most attacker-controlled content a company receives, right next to the step that moves money. Payment diversion already works on people, and instructions hidden in a PDF have been shown to hijack a workplace assistant, so a reader and a payer sharing one room is the combination Switch's own three-factor safety test calls unsafe.

Evidence. These pages were checked on 2026-11-04; confirm the primary report before quoting a figure in the README or video:

- FBI IC3 2024: close to $2.8B in business email compromise losses across 21,442 complaints, as reported by [Nacha](https://www.nacha.org/news/fbis-ic3-finds-almost-85-billion-lost-business-email-compromise-last-three-years).
- AFP 2025 survey: 79% of respondents' organizations saw attempted or actual payments fraud in 2024, and 63% named business email compromise as the top avenue ([AFP](https://www.financialprofessionals.org/about/learn-more/press-releases/Details/survey-79-percent-of-organizations-were-victims-of-attempted-or-actual-payments-fraud-activity-in-2024)).
- Hidden PDF text hijacking Atlassian Rovo: a demonstration by the security firm PromptArmor, not an observed attack ([Decrypt](https://decrypt.co/375269/hidden-text-pdfs-hijacking-ai-assistant-prompt-injection?amp=1)). No invoice-specific incident was found, so present the invoice attack as a scenario.

## Solution (one line)

An accounts-payable desk on Switch that stays safe when the agent reading vendor invoices is hijacked: outside content stays in a room with no reach, only validated typed fields cross to the room that can pay, and only the controller can release money.

## Must-have demo features

1. **A working AP desk in two rooms, under two owners.**
   - `ap-intake`: the AP clerk and the clerk-owned `reader`, an AI agent with no reach. Raw invoices land here.
   - `ap-release`: private. The controller and the controller-owned `treasury`, the only agent that can reach the mock bank.
   - Clean path: `reader` extracts an invoice and matches it to the PO and goods receipt, the fields cross as a typed packet, the controller pays by addressing `treasury`, the mock ledger moves and the decision is recorded. This is the real task the event requires.
2. **A non-LLM courier between the rooms.** A deterministic agent in both rooms.
   - Passes only schema-valid packets, so prose never crosses.
   - Checks each packet against the vendor master and PO. New bank details are held for a callback.
   - Watches room membership, removes any agent pulled into the wrong room, and reports it to the controller.
3. **An assume-breach run with a one-command proof.** A poisoned invoice "hijacks" `reader`. The hijack is scripted on purpose and disclosed in the README, because the property under test is the room, not the model. `reader` uses its real credentials and real Switch operations for every attack below. One command replays the run, asserts each outcome from the room transcript and the mock ledger, and exits non-zero if any attack succeeds. It needs Docker, not a model key.

| # | Attack by the hijacked `reader` | Expected outcome |
|---|---|---|
| 1 | Pull `treasury` into `ap-intake` with `invite_agent_to_room` | Succeeds, as Switch allows it. The courier sees the join, removes `treasury` and reports it |
| 2 | Order a wire: `@treasury` or `send_targeted_message` | Switch posts its fixed refusal and returns `not_permitted`. No payment |
| 3 | Open `treasury` up: `update_agent_detail` with `addressing: anyone` | `PermissionError`, because the owners differ |
| 4 | Add itself to `ap-release` | `PermissionError`, because it is not a member |
| 5 | Push instructions through the courier as prose | Rejected. Not a valid packet |
| 6 | Send a well-formed packet with the attacker's bank account | Fails the vendor-master check and is held for a callback |

## Target sponsor track(s)

- **Track 01 Best Business Workflow:** a practical workflow for a non-technical finance team, with people and agents working in a team chat.
- **Code with Wispr:** process only, with no product feature. Speak prompts, room instructions and the README through Wispr Flow, then add the Insights scorecard at submission. Flow is not installed yet (tollgate C5), and usage should start now.
- **Best Blog:** a post from project material, judged on usefulness to a first-time Switch user. Thesis: your agent will get fooled, so set up your rooms so that it doesn't matter.

## Judging criteria (published)

| Criterion | Weight | What this project does for it |
|---|---|---|
| Use of Switch | 30% | Rooms, owners, addressing and sender identity are the controls. Remove Switch and the containment goes with it |
| Technical execution | 25% | One command proves every attack fails, using Docker alone |
| Creativity and impact | 25% | Payment fraud is a real team's problem, and the premise is that the agent has already lost |
| Presentation (WMD) / Presentation and documentation (DTA) | 20% | One memorable hijack on camera. The README shows agents, rooms and how to run it |

## Why it wins

**White space.** Several entries refuse a *person* at a gate in one room, and several keep agents from deciding. This one assumes the *agent itself* is hostile and contains it with Switch's own boundaries: separate owners and room membership, then attacks those boundaries using Switch's own operations. In the entries read, nobody uses separate owners as a boundary or exercises those operations as attacks. It does this for a finance team, while the closest injection-aware entry is DevOps.

**Not unique, so don't claim it:** "agents propose, code and people decide" (Shipyard, Preflight, OrderRoom, Bursar) and typed extraction from invoices (Bursar).

**Head-to-head on the published criteria.** Based on READMEs and docs read on 2026-11-04; nothing was run. Entries can change, private entries are invisible, and this project is not built yet. *Review this section before the repo goes public.*

| Against | Use of Switch | Technical execution | Creativity and impact | Presentation |
|---|---|---|---|---|
| **Shipyard** (ops gate; tests injection; live infrastructure) | **Win:** its control lives in its own Gatekeeper and config, with Switch supplying identity and transport. Here the boundary is Switch's enforcement | **Behind today, tie at best:** it has exit gates and live runs. This needs the proof command delivered | **Win on freshness:** the ops-approval cluster is crowded, and this serves a non-technical team | Tie |
| **Bursar Control Room** (closest domain) | **Win:** its README describes a Mattermost REST adapter, with control in its own services | Tie. It is deeper on invoice parsing, which is not a published criterion | **Narrow win:** same principle, but no hostile-agent scenario | Tie |
| **OrderRoom** (strongest visible refusal story) | **Win:** it sets `addressing: anyone` and enforces in its own rules engine | Tie | Tie. It has a very authentic user | Tie |

## Demo money shot (~15 seconds)

Split screen: the chat and the mock-bank ledger. A poisoned invoice lands in `ap-intake`. `reader` turns hostile, pulls `@treasury` into the room and orders a $48,200 wire to a new account. Switch answers on screen: "You're not permitted to direct messages to me in this room". The courier ejects `treasury` and `ap-release` shows a hold naming the invoice. The ledger has not moved. The controller then pays the next, clean invoice with one message, and the ledger moves.

The agent was fooled. The money went only where a person sent it.

Amounts are illustrative. Keep every beat visible: a refusal alone can read as "nothing happened", so the hostile messages, the ejection and the real payment all have to be on screen.

## Out of scope (explicit)

- Real banks, real money or payment APIs. Mock bank and synthetic vendors only.
- Real mailbox ingestion. Invoices are dropped into `ap-intake` as attachments.
- Broad invoice parsing, OCR tuning or ERP integration. A small fixture set is enough.
- Any claim that a model resists injection, plus model hardening and injection classifiers.
- Fraud ML scoring, tax, multi-currency, multi-entity, PO creation and vendor onboarding.
- Switch Trust, patches to Switch core, and vendoring Switch code.
- Slack, Teams, Discord and Telegram builds. The demo runs on one messaging app.
- Anything blockchain. Nothing here needs it.
- A dashboard as the workflow surface. Chat is the surface. Any public page comes later under the user's `design-taste-frontend` skill.

## Feasibility notes for the architect (primitives, not design)

### Route: an explicit assumption

**Assumed, not proven: standalone Docker Compose with the `collab` and `gateway` profiles on the user's VPS.** No Switch server is running yet, and C2 and C3 are still FAIL in the tollgate.

- **Why this route:** the two-owner design needs a second Switch user. The docs describe a Console-run server as one person's, while a deployed server documents **Users → Create user** in the Gateway and per-person registration keys.
- **It matches the user's decision** recorded in the runsheet (VPS, with Compose plus Gateway as the fallback if Console will not open).
- **Console may not be needed:** agents can register with `POST /agents`, and rooms can be created with `POST /rooms/from-yaml` or a Gateway template upload. If so, Windows issues #1441 and #1335 stop mattering. C2 is a hard row set by the user, so relaxing it is the user's call.
- **If the VPS can't carry it:** a separate small VPS, per the runsheet.
- **If two owners can't be made to work:** the idea survives, but attack 3 will succeed on a single owner. Drop it from the proof and say so in the README. Don't claim owner separation.

### Host facts

- Docker Engine 29.9.3 and Compose v5.7.0 are ready on the VPS, with about 3.6 GiB available plus 4 GiB swap. Switch's real footprint is unmeasured (tollgate, "VPS Docker setup").
- **Port conflict:** `127.0.0.1:8000` is taken. The standalone compose file reads `API_HOST_PORT` (also `GATEWAY_HOST_PORT`, `MATTERMOST_HOST_PORT`, `POSTGRES_HOST_PORT`), binding through `SWITCH_BIND_ADDR`, which defaults to `127.0.0.1`.
- **Non-root:** the runsheet requires a dedicated non-root user with its own `claude` sign-in before agents run on this VPS.
- **Hosts are not sandboxed by Switch.** A model agent with a shell reaches whatever its OS user reaches. `reader` needs its own OS user or container, no route to the mock bank and no access to `treasury`'s credentials. Keep the bank token in `treasury`'s environment only, by env var name.

### Versions and license

- Pin server `0.31.0` (tag `switch-v0.31.0`) and, if used, Console `switch-console-v0.40.1`. `SWITCH_VERSION` is required by the compose file. Build on these, not on repo `main`.
- The license is Apache 2.0 with a modified Commons Clause. Pull the published images and don't vendor Switch code.

### Behavior read from source at `switch-v0.31.0`

Read, not run. The docs disagree on some of this, and the source is what settled it.

| Behavior | Where |
|---|---|
| `update_agent_detail` refuses changing yourself, but allows a same-owner sibling, including `addressing`. A different owner raises `PermissionError`. **So a single-owner setup can be opened by a hijacked sibling** | `core/switch_core/bridges/agent/operations/definitions.py`; `require_same_owner` in `protocol/agent_core.py` |
| `invite_agent_to_room` needs room owner, admin or current membership, with no consent check on the invited agent. Non-members are refused | `_require_room_roster_change` in `protocol/agent_core.py`; `add_agents_to_room` in `core/switch_core/room_service.py` |
| `remove_agent_from_room` works if the caller may address the target, or can manage agents and shares its owner. The caller need not be in the room | `operations/definitions.py`, `protocol/agent_core.py` |
| An unadmitted address is demoted to chatter, and a fixed refusal is posted as an auto-reply. `send_targeted_message` still sends and returns `not_permitted` | `core/switch_core/delivery/addressing.py`, `delivery/recipient.py` |
| Addressing rules scope `rooms`, `room_groups`, `users` and `agents`. Custom rules go through `PUT /{agent_id}/addressing-policy` on the Gateway | `core/switch_core/addressing.py`, `core/switch_core/gateway/agents.py` |

From the docs:

- Addressing does not stop an agent *reading* a room. Membership is the context boundary, which is why this needs two rooms and not one (`resources/working-safely-with-agents`).
- An agent can change or delete only a room document it created (`internals/rooms-and-resources`).
- Rooms default to public read and write. Set `channel_type`, `read_visibility` and `write_visibility` on `ap-release` deliberately.

### Building blocks

- **Protocol agents** suit the courier and `treasury`: WebSocket in, HTTP out. See `sponsors/switch.md`, "Custom agents: the agent protocol". Key gotchas: answer every `ping` at once, and use `filter=all` because `addressed` hides context and commands. `treasury` can be a program with no model at all, so it has no prompt to inject. It acts only on an addressed command from its owner, with the sender taken from the event.
- **Ownership:** an agent's owner is whoever created its registration key on the Gateway's API Keys page.
- **The courier and `treasury` share the controller as owner.** That is safe only because the courier runs no model. Removing `treasury` needs either addressing that admits the courier or "can manage agents", which requires agent management on (`FEATURE_FLAGS_ENABLED=agent_management`, `CONTROLLER_TOKEN_SECRET`, `GATEWAY_PUBLIC_URL`).
- **Templates** at v0.31: `addressing` takes `owner`, `owner-agents` or `anyone`; `group`, `rooms` and `links` create several rooms; `kickoff` sits on each room. A committed template helps a judge rebuild the setup. v2 needs agent management.
- **Secrets by name only:** `AGENT_REGISTRATION_TOKEN`, `SECRET_KEYS`, `GATEWAY_ADMIN_EMAIL`, `GATEWAY_ADMIN_PASSWORD`.
- **Model access:** `reader` needs a provider on the clean path. `claude` reports signed in for root on the VPS, but not yet for the non-root user the runsheet requires.
- **Linking accounts without Console** is unverified. ShopOps Room lists a `scripts/link_owner.py` for Telegram (not read), so a scripted path likely exists. An unlinked account matches nobody under an owner rule.

### The one dependency to clear on day 1

Stand up the server with two owners, then confirm each of these at runtime before planning around it. Together they decide the final money shot.

1. Attack 3 succeeds on the same owner and fails across owners.
2. A member can pull another owner's agent into a room, and the refusal shows on screen. Check whether it repeats: the docs describe one reply, while the source flags it as an auto-reply.
3. The courier receives `room_join` and can remove the agent.
4. A non-member's self-invite is refused.
5. Two people can be told apart in chat, including after linking accounts.
6. Mattermost template kickoffs work. Issue #1158 reports `Invalid RootId parameter` on kickoff activity cards.

**Fallback if attack 1 can't be staged:** the wire attempt fails with `Targets not in room` instead of the fixed refusal. The containment still holds, but the on-screen moment is weaker.

### Other open item

The submission form is still off (`submission_mode: none`, re-checked 2026-11-04). This does not affect the build, but keep Step 3 flexible.

## Rubric mapping (why this won, for the record)

**Weights**, re-mapped to the published rubric with buildability kept highest: **Intrinsic buildability 35 · Use of Switch + Track fit 30 · Demo WOW + story 20 · Novelty 15.** Use of Switch and Presentation map 1:1. Technical execution plus the kit's floor gives buildability 30. Creativity and impact gives Novelty 20. `safe-feasible` then moves 5 from Novelty to buildability.

**Field:** 37 candidates (29 plus 8 bolder rewrites). 5 knocked out at the buildability gate, 32 scored.

| Candidate | B | F | W | N | Total |
|---|---|---|---|---|---|
| **Invoice airlock** | 4 | 5 | 5 | 4 | **450** |
| Cross-company NDA negotiation | 4 | 5 | 4 | 4 | 430 |
| Room inspector | 4 | 4 | 4 | 5 | 415 |
| Anonymous HR relay | 4 | 4 | 4 | 5 | 415 |
| Plain AP desk | 5 | 3 | 2 | 1 | 320 |

- **Buildability 4, not 5:** the two-owner design rests on an unproven route. Nothing in it is an external blocker, because every service, vendor and invoice is the builder's own.
- **Novelty 4, not 5:** Shipyard and Bursar already hold the "agents propose, code decides" principle. The plain AP desk scored 1 as a duplicate of Bursar, so the idea wins only in this form.
- **Web3:** the one candidate using those skills, a treasury pre-sign room, scored 405 and lost on merit.
