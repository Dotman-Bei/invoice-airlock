# Prior art

Fetched 2026-11-04. One-liners are paraphrased from each project's own title or description, and none were run or evaluated. Source IDs resolve in [INDEX.md](INDEX.md).

## Switch's own examples and use cases

Closest to what the judges will recognize as idiomatic.

| Name | One-line | Tech | Link |
|---|---|---|---|
| Payments room | One channel becomes a team's working room with references, roles and access rules | Switch rooms, roles, references | [docs](https://docs.switchagents.ai/switch-rooms/building/payments-room) |
| Triage pair | Triager sorts reports and hands bugs to a reproducer | Template v1 | [repo](https://github.com/sandbox-quantum/switch/blob/main/examples/agent-templates/triage-pair.template.yaml) |
| Support desk | Intake and escalation rooms with a greeter and an engineer | Template v1, linked rooms | [repo](https://github.com/sandbox-quantum/switch/blob/main/examples/agent-templates/support-desk.template.yaml) |
| Red-blue workroom | Coder and reviewer loop until a person confirms | Room template | [repo](https://github.com/sandbox-quantum/switch/blob/main/examples/room-templates/red-blue-workroom.template.yaml) |
| Hand off across time zones | Engineer gets a fix from another team's agent overnight | Use case | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/across-time-zones.md) |
| Incident response | Agents investigate an alert and wait for on-call approval | Use case | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/incident-response.md) |
| Protect customer data | Switch Trust redacts contact details before they reach the room | Use case, Switch Trust | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/guardrails.md) |
| Product launch | Marketing and engineering agents prepare a release across time zones | Use case | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/product-launch.md) |
| Customer meeting prep | One question brings in agents that build review slides | Use case, Teams | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/meeting-prep.md) |
| Customer onboarding | Agents carry pre-sales requirements into onboarding | Use case | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/customer-onboarding.md) |
| Vendor review | Security, legal and finance agents review a purchase | Use case, Teams | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/vendor-review.md) |
| Open source contribution | Contributor's agent and reviewer agent work out a fix for a maintainer | Use case, Discord | [docs](https://docs.switchagents.ai/switch-rooms/use-cases/open-source-contribution.md) |

**Scope note:** these use-case pages were read from the docs index and its overview only. Their full setups were not read.

**White-space implication for idea-forge:** a Track 01 entry that simply restates one of these scenarios will read as a copy of Switch's own docs.

## Competitors already visible this event

From two capped GitHub repository searches on 2026-11-04, which returned 13 repos, plus issue #1429. **This is a sample of public repos.** Private repos and unnamed entries are invisible. Maturity was not checked, and some repos may be placeholders.

| Name | One-line | Stated track | Link |
|---|---|---|---|
| RelayOS | Enterprise deal-closing platform | Track 01 | [repo](https://github.com/aiwithrajan/RelayOS) |
| CrewPilot | Evidence-driven bug investigation squad | Not stated | [repo](https://github.com/kamalesh404/CrewPilot) |
| VesselAi | Slack automation for insurance documents | Not stated | [repo](https://github.com/mistily/VesselAi) |
| AgentQA Network | Multi-user QA collaboration with Switch agents | Not stated | [repo](https://github.com/Souravrajvi0/agentqa-network) |
| promise-to-proof | Keeps customer commitments aligned with scope, delivery and follow-up | Not stated | [repo](https://github.com/maovao17/promise-to-proof) |
| ClearSend Room | Flights and escrow workflow in Slack or Discord | Not stated | [repo](https://github.com/dukemawex/clearsend-room) |
| pr-pilot | PR reviews in Discord, with Antigravity | Not stated | [repo](https://github.com/jaysid97/pr-pilot) |
| splitbrain-demo-roadmap | Fictional roadmap repo for a demo called Splitbrain | Not stated | [repo](https://github.com/fabriutola-hub/splitbrain-demo-roadmap) |
| shipyard | Chat-native ops room with a role-based, approval-gated gatekeeper | Not stated | [repo](https://github.com/Shrinet82/shipyard) |
| orderroom | FMCG distributor order desk on Telegram and Mattermost | Not stated | [repo](https://github.com/kumarrohitkumar/orderroom) |
| bounty-board | A person and three agents run a hackathon or bounty pipeline | Not stated | [repo](https://github.com/meerpasha59-bit/bounty-board) |
| switch-hack-demo | Demo app; no further description | Not stated | [repo](https://github.com/samprati18/switch-hack-demo) |
| Flip-the-Switch-Hackathon | No description | Not stated | [repo](https://github.com/Chandanaa-003/Flip-the-Switch-Hackathon) |
| PLOTWAKE | Human and AI creative change-control workflow | Track 02 | [issue #1429](https://github.com/sandbox-quantum/switch/issues/1429) |

**Observed cluster, by this author's reading of the titles:** ops and approval gates, code review, and QA are already occupied. The #HowISwitch feed (`https://x.com/hashtag/HowISwitch?f=live`) was not read.

## Past WeMakeDevs winners

From the public WMD API, on the 4 events with `winners_published: true`. [S7] Names and repos are as submitted. Links were not opened.

**Patch the Conference** (Oct 2026)

| Track | Name | Team | Repo |
|---|---|---|---|
| Bright Data | Kairos | 1 | [repo](https://github.com/kirandevihosur74/kairos) |
| FalkorDB | Rally: a live connection graph for conferences | 3 | [repo](https://github.com/Your-AI-Dept/falkordb) |
| TrueFoundry | CONFUZZ-R: verification infrastructure for autonomous operations agents | 1 | [repo](https://github.com/Tirth2530/confuzz-r) |
| Qodo | Should We Go? Conference ROI graph | 1 | [repo](https://github.com/nickhuimedme/pharmacy-conference-scraper) |

**Environmental Hacks** (Oct 2026)

| Track | Name | Team | Repo |
|---|---|---|---|
| Waste & Energy | JunkSnap | 3 | [repo](https://github.com/Girish-Garg/JunkSnap) |
| Air | The Vayu Project | 1 | [repo](https://github.com/hrsh-kr/the-vayu-project) |
| Heat & Water | WristHeat: heat strain for every wearer | 4 | [repo](https://github.com/varad-oss/wristheat) |

**First Commit** (Sep 2026)

| Track | Name | Team | Repo |
|---|---|---|---|
| Ship It | Suraksha: an agentic companion for an aging parent | 3 | [repo](https://github.com/harshendram/firstcommit-hack) |
| Build It | Beacon Night Shift: an on-call agent that fixes the 3 AM page by voice | 1 | [repo](https://github.com/Prashant-thakur77/Beacon) |
| Best UI | CampusEvac | 3 | [repo](https://github.com/AfreenInnovates/campus) |

**The Zerops Challenge** (Aug 2026)

| Prize | Name | One-line | Repo |
|---|---|---|---|
| MacBook Neo | Deplot AI | AI platform engineer: analyzes a repo, generates config, deploys and operates it | [repo](https://github.com/maannaan/Deplot) |
| Logitech MX Master 3 | FlowForge AI | Autonomous SRE incident triage and diagnosis | [repo](https://github.com/Rajtiwari0202/flowforge-ai) |

**Patterns, by this author's reading:**

- Winners' titles tend to name a specific user and a concrete pain, such as an aging parent, an on-call engineer at 3 AM, or a conference attendee weighing ROI.
- Solo teams won several main prizes.
- These events had different sponsors and rubrics, and no judging scores were read, so treat this as weak evidence.

**Not available:** winners of earlier WMD events on the archive site (`archive.wemakedevs.org`), which were not fetched, and any prior Switch hackathon. None was found.
