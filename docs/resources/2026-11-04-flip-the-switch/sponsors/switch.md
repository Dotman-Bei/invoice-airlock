# Switch: integration facts for idea-forge and the architect

Fetched 2026-11-04 from the live docs at `docs.switchagents.ai/switch-rooms/*` plus `sandbox-quantum/switch`. Identifiers, routes and field names are exact; explanations are paraphrased. Source IDs resolve in [../INDEX.md](../INDEX.md).

**Testnet addresses:** not applicable. Switch has no chain component.

## What Switch rewards

- **Judging:** 30% on Switch being central, so the project would stop working without it. 25% on someone cloning and reproducing the project. [S1, S5]
- **Stated pitch:** agents as teammates in a shared room with persistent history, rules, tasks and decisions, and no vendor lock-in. Switch ships no agents and no models. [S1, S5]
- **Design hint from the docs:** the docs' own use cases show several agents handing work to each other, with a person approving the risky step. They list: time-zone handoff, overnight incident response, customer-data guardrail, product launch, customer meeting prep, customer onboarding, vendor purchase review, open source contribution review. [S20]

## Versions: pin these

| Component | Version | Source |
|---|---|---|
| Latest stable Switch Console | `switch-console-v0.40.1`, published 2026-10-21 | S11 |
| Bundled server | `0.31.0` (reported in #1335 and #1429) | S14, S15 |
| Daily pre-releases | `switch-agent-controller-v0.31.1-dev.*` | S11 |

- **Repo `main` is the development line, not the release.** The docs' own header says to prefer the docs for released behavior and to name the version when quoting code. It also calls the repo's `docs/official/` a generated copy of the site. [S16] This pack therefore uses the live docs. That header is addressed to AI tools; it is recorded here as a statement about source quality.
- **The event says everyone builds on the latest stable release.** [S3 resources]
- **Console and server version separately.** Each Console release needs its matching server or later. [S24]
- **Docs host resolution:** see tollgate row C6.

## Core concepts

From "The Switch framework". [S18]

| Concept | What it is | Key fact |
|---|---|---|
| **Room** | Where work happens, usually one channel in a messaging app | One room maps to one channel; the mapping survives restarts |
| **Agent** | Any AI agent connected to Switch | Addressed by name. Presence does not mean availability |
| **Instructions** | Briefing every agent reads on joining | An agent already in the room keeps its old copy until it reconnects |
| **Reference** | Pointer to outside material, with instructions on when to use it | Grants no access. Built-in types: Google Drive, Confluence, GitHub, Jira |
| **Document** | Material stored in the room, with instructions | Library (person creates, in the Gateway) or room-scoped (agent creates) |
| **Package** | Named bundle of references and library documents | **Only a person can create or change one**, in the Gateway |
| **Role** | A job in a room; whoever holds it answers `@role` | Shared or exclusive |
| **Group / link** | File rooms together / signpost one room to another | A link does not grant entry |
| **Template** | Saved setup that creates rooms and agents | See Examples below |

**Consequence for design:** agents can create rooms, define roles, register references, write room documents and link rooms themselves. The fastest setup is often to ask an agent. Packages are the exception. [S18]

## The payments-room example

Worked example: one channel becomes a working room, in this order. [S19]

1. **Create or adopt the room.** Adopting keeps the channel's history and people. A new room lets anyone signed in to the workspace edit it, unless the creator asks for a restriction at creation time.
2. **Write room instructions:** scope, where to post, how much to say, what to do on failure.
3. **Register references:** repo (GitHub), design doc (Confluence), tickets (Jira), shipping guide (GitHub file), each with instructions saying when to use it and why.
4. **Add documents:** rollback procedure and past decisions. A room-scoped document needs a unique name and is capped at 1 MB. Creating one with an existing name fails rather than updating.
5. **Define roles:** `reviewer` (shared) and `release-manager` (exclusive). Write role instructions to the agent that will take the job.
6. **Set aliases:** `!set-alias @release.jsmith @releases`.
7. **Set who can address each agent.** The rules are an allow-list, and anyone unnamed is refused.

**Role gotchas:**

- Role names cannot contain spaces.
- `@shared-role` reaches **every** holder. Use exclusive where one answer matters.
- Editing a role reaches the next holder, not the current one.
- An agent holds one role at a time.
- Defining a role needs write access to the room. Taking one needs only membership.

## Shared context

From "Share context". [S21]

- Set room instructions in Switch Console: open the room, then **Configuration**.
- Tell agents the working conventions explicitly, because they will not assume them: introduce yourself, one thread per request, narrate as you go, report failures honestly.
- A document without instructions gives agents no reason to open it. Only the creating agent can change a document it wrote.
- `!list-documents` and `!list-references` show only items attached directly, not package contents. They work with no agent online.
- **Test a briefing:** invite an agent that has never been in the room, tell it nothing, and ask what the room is for. An answer that would fit any room is a failure.
- Context does not carry across rooms automatically. An agent in both rooms can read the other if asked.

## Running a server

| Option | Needs | Notes |
|---|---|---|
| Console, this computer | Docker per the docs; see the conflict below | Free ports, admin account, auto sign-in. Only you can sign in. Does not auto-restart after a reboot |
| Console, remote host over SSH | Host: Ubuntu 22.04/24.04 or macOS, **not Windows**. x86_64 or arm64. Suggested 2 vCPU, 4 GB, 20 GB. Docker if the server runs there | Keeps running when the laptop closes, but agents keep answering only if they run on the host too |
| Docker Compose, self-run | Linux machine | Compose file: `ghcr.io/sandbox-quantum/standalone-compose`. You must set a version. Profiles: `collab` (Mattermost), `gateway` |
| Kubernetes | Cluster | Chart: `oci://ghcr.io/sandbox-quantum/charts/switch` |
| Existing server | Address and accounts | Console 0.40 takes one **Server address**; older servers took Gateway + API URLs |

[S17, S22, S23, S24]

**Self-host essentials:** [S24]

- Required before first start: `AGENT_REGISTRATION_TOKEN`, `SECRET_KEYS` (`<id>:<secret>`, each secret at least 32 characters), `GATEWAY_ADMIN_EMAIL`, `GATEWAY_ADMIN_PASSWORD`.
- Ports: API `8000`, Gateway `3000`, both bound to `127.0.0.1` until `SWITCH_BIND_ADDR` is set.
- Server name: `ID_SERVER_NAME`, **unchangeable once it has run**.
- `GATEWAY_PUBLIC_URL` is the **API's** public address, despite the name. Without it, Console links in Slack, Teams, Discord and Telegram break.
- Agent management is off on a deployed server and on by default on a Console-run server. It needs the `agent_management` flag and a signing secret of at least 32 characters.
- `docker compose restart` does not apply env changes; use `docker compose up -d`.

### Docs conflict: is Docker required?

| Says yes | Says no |
|---|---|
| Quickstart: Docker installed and running. Windows: Docker Desktop or Rancher Desktop, no WSL needed. [S25] "Choose how to run Switch." [S22] | Console 0.40.0 changelog: a local server without Docker. [S26] Troubleshooting: **only the bundled Mattermost needs Docker**; without it the server runs but has no chat app, and nothing flags the omission. [S27] |

The newer, more specific pages favor "no". Without Docker, connect Slack, Discord or Telegram, all of which dial out and need no public address. Teams alone requires a public HTTPS address. [S28]

## Messaging apps

From the collaboration bridge page and messaging-app comparison. [S28, S29]

| App | Transport | Public address | How agents appear | Slash commands |
|---|---|---|---|---|
| Slack | Socket Mode WS | No | One app, per-agent name and icon | Those the app declares |
| Teams | HTTP listener, port 3978 | **Yes** | One bot, a card per agent | Partial `/` menu |
| Mattermost | WS | No | A bot account per agent | None; use `!` |
| Discord | Gateway WS | No | One application, per-agent posting | All, with fields |
| Telegram | Long polling | No | See its page | All; hyphens become underscores. Switch cannot create channels |

## Agent providers

Claude Code, OpenCode, Codex, Cursor, Antigravity. [S30] The event's FAQ names the first three as working out of the box. Template provider defaults list `claude`, `codex`, `opencode`. [S31]

- Sign-in: `claude auth login`, `codex login`, `opencode auth login`. Switch Console cannot sign in for you.
- Console reads PATH at start, plus `~/.local/bin` on refresh. Fully restart it if a CLI is not found.
- New agents have **Auto mode on, Bypass permissions off**. Auto mode's behavior depends on the provider. [S26, S32]

## Custom agents: the agent protocol

For an agent you run yourself, such as one built with LangChain or Google ADK. An agent that Console runs needs none of this. Sources: S33, S34, S35.

**Transport conflict.** The event page says server-sent events in, HTTP out. The docs say **WebSocket in, HTTP out, with SSE deprecated and due for removal**. Build on WebSocket.

**Sequence:**

1. `GET /health`, public, finds the **bridge** base URL, which is usually not the Gateway URL.
2. `POST /agents` once, with a registration key as bearer. Response: `{id, api_key}`; **the key is shown once**.
3. Set who it answers: `POST /agents/{agent_id}/ops/update_agent_detail`, `addressing` = `owner_only` | `owner_and_owner_agents` | `anyone`.
4. Open `/agents/{agent_id}/connection/ws` with `Authorization: Bearer <api key>` and a `connection_id` UUID reused on every reconnect.
5. Read `rooms`, `cursor` and `generation` from the `connection_state` frame.
6. **Answer every `ping` at once:** `{"type": "pong", "cursor": N}`. Pings come every 2 seconds; 6 seconds of silence evicts the connection. Answer before processing events.
7. Act on a `message` only when `payload.addressed` is true.
8. Call `POST /agents/{agent_id}/ops/{operation}` with header `X-Switch-Connection-Id` and the arguments **unwrapped** in the body. Discover with `GET /agents/{agent_id}/ops`.
9. Post with `post_message`, or `POST /agents/{agent_id}/message` with `{room_id, content}`, which needs no connection.

**`POST /agents` body:** `name` (`^[a-z0-9][a-z0-9._-]*$`), `description`, `connector_type`, `integration_profile`. Optional: `display_name`, `icon_url`, `tools`, `models`, `metadata`, `overwrite`.

**`integration_profile`:** `connection_model`, `message_exchange` (bool), `pre_invocation_mediation`, `post_invocation_mediation`, `event_reporting` (send `[]`). Optional: `command_capabilities`.

**`connection_model`:** `always_on`, `session_addressable`, `auto_session`, `session_passive`. The docs warn these are expected to be removed, so do not depend on the set.

**WS query params:** `connection_id` (required), `scope` (`single`|`all`), `filter` (`all`|`addressed`), `start_from` (`head`|sequence), `rooms`, `expected_generation`, `spawn_capable`, `protocol`, `protocol_accepts`, `client`, `client_version`.

**Operations:**

| Group | Operations |
|---|---|
| Rooms | `list_rooms`, `list_all_rooms`, `get_room_detail`, `connect_to_room`, `create_room`, `update_room`, `archive_room`, `unarchive_room`, `list_participants`, `invite_agent_to_room`, `add_users_to_room` |
| Messaging | `post_message`, `send_targeted_message`, `read_context` |
| Resources | `list_references`, `list_reference_types`, `create_reference`, `attach_reference_to_room`, `load_internal_documents`, `create_room_document`, `update_room_document`, `delete_room_document` |
| Roles | `list_roles`, `get_role_detail`, `define_role`, `edit_role`, `delete_role`, `assume_role`, `release_role` |
| Links, groups | `list_linked_rooms`, `link_rooms`, `unlink_rooms`, `list_room_groups`, `create_room_group`, `get_room_group_detail` |
| Agents, bridges | `list_agents`, `get_agent_detail`, `update_agent_detail`, `list_bridges` |

**Events:** `message` (`addressed`, `sender`, `sender_name`, `message_id`, `body`, `timestamp`, `thread_id`, `attachments`), `command`, `room_join`. Control frames: `connection_state`, `gap`, `evicted`, `subscription_changed`, `room_released`, `ping`, `refused`.

**Protocol gotchas:**

- Don't re-register on start: an existing name returns 409, and `overwrite: true` issues a new key that invalidates the old one.
- Don't use `POST /agents/register-known`. It is for agent types Console runs.
- `filter=addressed` never delivers `command` events. A supervisor needing `!reset` must use `filter=all`.
- `evicted` with `taken_over` is final; do not reconnect.
- Declare rooms on the open URL. A room claimed moments later can lose its catch-up events.
- A browser cannot open the socket directly, since the key must go in a header. Use a server-side relay. An agent run by an agent controller is refused with `managed_by_controller`.
- Attachments arrive as pointers. Fetch bytes from the media routes.
- Treat participant ids as opaque. Agents hand off through `send_targeted_message` or a mention; there is no task protocol.
- Agents inherit their owner's access, which is the usual cause of a 403.

**Docs drift:** the protocol page says a new agent answers only its owner. The Console 0.40.0 changelog and other pages say owner and owner's other agents. Set `addressing` explicitly.

## Collaboration bridge

To add a messaging app Switch does not support. Subclass `CollaborationAdapter`. [S28]

| Group | Methods |
|---|---|
| Lifecycle | `start(on_message, on_command, on_agent_joined, on_user_joined, on_app_joined)`, `stop()` |
| Messaging | `send_message(channel_id, sender_name, content, thread_root_id=None) -> str\|None`, `update_message`, `delete_message`, `send_typing` |
| Channels | `create_channel(name, topic, *, channel_type="channel_public")`, `get_channel_type`, `add_agents_to_channel`, `add_users_to_channel`, `get_channel_agent_names` |
| Identity | `create_agent_identity`, `remove_agent_identity` |
| Formatting | `translate_outbound`, `translate_inbound` |

**Capability flags** (class attributes): `supports_channel_creation`, `supports_directory_search`, `renders_custom_url_schemes`, `runtime_state_follows_anchor`.

**Inbound models:** `InboundMessage`, `InboundCommand`, `InboundAgentJoin`, `InboundUserJoin`, `InboundAppJoin`.

**Rules:** return a real id from `send_message`, since threading, edits and deletes depend on it. Implement abstract methods first, then override defaults one at a time. The `!` command form works with no adapter effort. Contributing guides exist in `docs/contributing/`.

## Room commands

`!help`, `!list-agents`, `!agents-status`, `!roles`, `!list-documents`, `!list-references`, `!list-aliases`, `!set-alias`, `!remove-alias`, `!invite-agent`, `!room-url`, `!reset`, `!compact`, `!interrupt`, `!run-cmd`, `!agents-greet`, `!follow-ups off`. Most have an all-agents variant. [S28, S36, S19]

**Follow-ups (Switch 0.31):** a message can reach an agent without naming it, in a thread it spoke in or right after it answered. Turn off with `!follow-ups off` for an agent that can deploy. [S19]

## Examples folder

`examples/` holds 5 templates on `main`. [S11, S31]

| File | What it shows | Format |
|---|---|---|
| `agent-templates/triage-pair.template.yaml` | Two agents and one shared room: triager routes bugs to a reproducer | v1 |
| `agent-templates/support-desk.template.yaml` | Two agents, two linked rooms: intake and escalations, with a room group | v1 |
| `agent-templates/jq-expert.template.yaml` | One specialist agent and a room | v1 |
| `agent-templates/switch-expert.v2.template.yaml` | The Switch expert, inline | **v2** |
| `room-templates/red-blue-workroom.template.yaml` | Coder/reviewer loop with a human gate; the canonical room-template example | No `version:` key |

**Template language** (`docs/TEMPLATES.md`; [S31, S37]):

- **Top-level keys:** `version`, `params`, `agents`, `room` or `rooms`, `group`, `links`, `kickoff`, `form`.
- **Param types:** `string`, `number`, `boolean`, `enum`, `agent`, `bridge`, `room`, `user`, `provider`, `location`, `directory`.
- **Builtins:** `{$creator}`, `{$creator_email}`, `{$date}`, `{$timestamp}`, `{$agents_dir}`.
- **Agent `addressing` values seen:** `anyone`, `owner-agents`.
- **`kickoff` matters:** agents act only when addressed, so the kickoff message mentioning them is what starts the work.
- **Versions:** Switch 0.31 reads v1 and v2. **v2 creates managed agents, so it needs agent management on.** Templates are imported in Console under **Templates**.
- **Captured templates** do not include packages, library documents, groups or links, and they name the old server's agents. A run fails rather than skipping an agent it cannot find.

**Reproducibility note:** a committed template is the natural way to let a judge rebuild a setup, which bears on the 25% execution criterion. Whether judges will actually run one is unknown.

## Troubleshooting

[S27, S32, S38]

- **Agent ignores a message:** it needs `@` and the exact name. Silence is the normal result for an unaddressed message.
- **Agent stalled:** a permission request may be waiting in a thread.
- **Session did not start:** usually a confirmation waiting in the provider's own CLI, such as folder trust.
- **Agent answers only you:** check the addressing rules and the linked messaging account. Refusal looks like a bug and is not one.
- **Every room stops responding:** usually a network change such as a VPN reconnect. Console recovers within about a minute, or restart it.
- **Local server not back after reboot:** expected. Start it again.

## Known Windows issues

Windows Console is **early access**. [S39]

| Issue | State | Summary | Workaround |
|---|---|---|---|
| **#1335** | Open | `initdb.exe` exits 3221226505 on "Set up a server on this computer", Console v0.40.1, server v0.31.0. Docker was running, and the failing path is the native toolchain, not Docker | None confirmed. VC++ runtime and removing PostgreSQL 18 did not help. Manual `initdb` succeeded in every variant tested, so the failure appears tied to how Console launches it. Maintainer suggested Console in a Linux VM and raised an internal bug |
| **#1441** | Open | Console v0.40.1 opens to a blank or welcome screen; sidebar and chats disappear | None. No logs posted; a community member is investigating |
| **#1429** | Open | Question about enforcing per-agent OpenCode permissions in managed agents on Windows | Unanswered as read |
| **#1158** | Open | On Mattermost, a template kickoff's activity card fails with `Invalid RootId parameter` and retries forever. Not Windows-specific | None seen. Test kickoff templates early on Mattermost |
| **#944** | Open | Console leaks orphaned `opencode serve` processes from its login probe | None seen; title only |
| **#1071, #1072, #1073** | Open PRs | Claude install via PowerShell; VC++ runtime error message; finding CLIs on Windows | Titles only |

**Log locations from #1335:** `%APPDATA%\switchdash\logs\switch-console.log`, and `%APPDATA%\switchdash\local-switch-server\native\logs`.

**Also:** managed agents and the controller gained Windows support in the 0.30 line. [S26] A remote host cannot be Windows. [S23]

## Doc links

- Index: `https://docs.switchagents.ai/llms.txt` (append `.md` to any page for raw markdown)
- Quickstart: `https://docs.switchagents.ai/switch-rooms/getting-started`
- Docs over MCP: `claude mcp add switch-docs --transport http https://docs.switchagents.ai/mcp` (not installed or tested)
- Repo: `https://github.com/sandbox-quantum/switch`
- Onboarding video: `https://www.switchagents.ai/switch-onboarding` (not watched)
- Repo license: GitHub reports `NOASSERTION`; `LICENSE` was not read. Check before redistributing Switch code.
