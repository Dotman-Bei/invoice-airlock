# Airlock Docs Implementation Plan

**Goal:** The judge-facing README and the blog draft, both written from what the build actually does.
**Architecture:** Two documents. The README follows the locked schema R5-agent-ai v1 and carries the event's required content under its headings. The blog draft is for a first-time Switch user, and the user publishes it.
**Tech Stack:** Markdown, Node for the conformance check
**Source spec:** docs/superpowers/specs/2026-11-04-invoice-airlock-design.md

**Where this runs:** on the VPS, as the OS user `airlock-build`, from `~/invoice-airlock`. That user has no sudo and no access to the main Docker daemon. Its rootless Docker is the only Docker it can use.

**House rules for every task here:**

- Node runs TypeScript directly through type stripping, so use only erasable syntax (no enums, no parameter properties), and write imports with the `.ts` extension. Type-only imports use `import type`.
- There are no runtime npm dependencies. Dev dependencies are only `typescript`, `@types/node`, `@types/ws` and `ws`.
- Test servers bind fixed ports in 24000-24999, never port 0, because this user's firewall refuses every other loopback port.
- Never use `as any`. Secrets appear only as environment variable names.
- Nothing here moves real money. The bank is a mock, every vendor is synthetic, and every secret a stack uses is generated per run and thrown away with it.
- Docker-gated tasks start a throwaway local stack on this user's rootless daemon. The user approved that at the design gate, and it is not a deploy, so those tasks are not human-gated. The only human-gated tasks are 5.3 and 7.5.
- `.gitignore` from task 1.1 covers `.run/`, `proof-output/`, `.taste-skill/` and `node_modules/`, so running a stack leaves nothing to commit from those.

---

### Task 6.1: The README

**Files:**
- Modify: `README.md`

**Depends on:** Task 4.4, Task 4.5, Task 5.1
**Effort:** medium
**Provides:** nothing new
**Requires:** `docs/proof/proof-report.md, docs/proof/single-owner-report.md`, `./demo.sh up [--model] | logins | logs | down`, `./prove.sh [--single-owner] [--keep], exit 0 contained, 1 attack succeeded or control failed, 2 no verdict`

Schema: `R5-agent-ai v1`, no event overlay, because the event's required content has no verbatim headings. It goes under `## How the agent works` and `## Run it`. The resolved headings, in order: `# Invoice Airlock`, `## Demo`, `## What it does`, `## Quickstart`, `## Built at Flip the Switch Hackathon`, `## How the agent works`, `## Prompts & safety`, `## Run it`, `## Tech stack`, `## Roadmap`, `## License`. Stamp: `<!-- readme-schema: R5-agent-ai v1 -->`. Keep the three `TBD-post-build:` lines exactly as written: the post-build seats resolve them. This replaces the bootstrap stub.

Upstream signatures, pasted from their providers:

```text
docs/proof/proof-report.md, docs/proof/single-owner-report.md
./demo.sh up [--model] | logins | logs | down
./prove.sh [--single-owner] [--keep], exit 0 contained, 1 attack succeeded or control failed, 2 no verdict
```

- [ ] **Step 1: Write the files**

`README.md`

````markdown
<!-- readme-schema: R5-agent-ai v1 -->
# Invoice Airlock

An accounts-payable desk on Switch that stays safe when the agent reading vendor invoices is hijacked.

## Demo

TBD-post-build:demo-video-url
TBD-post-build:public-page-url
TBD-post-build:screenshot

**In the demo, one person plays both the clerk and the controller, on two Switch accounts.** The hijack is scripted on purpose. The courier's removal is delayed by a few seconds so each beat can be seen. Amounts are illustrative, the vendors are synthetic, and no real money exists.

## What it does

Accounts-payable teams are being asked to let AI agents read vendor invoices, the most attacker-controlled content a company receives, right next to the step that moves money. Invoice Airlock assumes that agent has already been fooled.

Outside content stays in a room with no reach. Only validated typed fields cross to the room that can pay, through a courier that runs no model. Only the controller can release money, by addressing an agent that has no prompt to inject. If the hijacked agent tries everything it can, the ledger doesn't move.

This makes no claim that a model resists injection. The property under test is the room, not the model.

## Quickstart

You need Docker with Compose, bash and curl, on Linux, macOS or WSL. No model key.

```bash
git clone https://github.com/Dotman-Bei/invoice-airlock
cd invoice-airlock
./prove.sh
```

The first run pulls Switch's images, so give it a few minutes. It stands up a fresh stack, runs nine attacks with the agent's real key and real Switch operations, checks each outcome from the room transcripts and the ledger, prints a table, and tears everything down.

| Exit | Meaning |
|---|---|
| 0 | All nine attacks were contained and the clean payment went through |
| 1 | An attack succeeded or a control failed. The report names which |
| 2 | No verdict. This is never a pass |

`./prove.sh --single-owner` is the control. It gives `reader` and `treasury` the same owner, attack 3 succeeds, and the run exits 1. That shows Switch's owner boundary is what holds. A recorded run of each is in `docs/proof/`.

## Built at Flip the Switch Hackathon

Flip the Switch Hackathon, WeMakeDevs x DevTools Academy x Switch, November 4-7, 2026. Target tracks: Best Business Workflow, Code with Wispr, Best Blog. Team: one person plus AI coding agents. Everything in this repo, including the Switch setup and the workflow, was built during the hackathon, and the git history starts on November 4. It uses Switch's published images, and no Switch code is committed here.

## How the agent works

**Which agents.** Three protocol agents connect to Switch over its WebSocket and HTTP protocol.

| Agent | Owner | Room | Model | Job |
|---|---|---|---|---|
| `reader` | clerk | `ap-intake` | Claude Code with zero tools in the demo. None in the proof | Reads the PDF and posts one typed packet |
| `courier` | controller | both | None | Checks packets against the vendor master, the purchase order and the goods receipt. Writes its own message into `ap-release`. Removes foreign agents and announces it |
| `treasury` | controller | `ap-release` | None | Pays only when the controller orders it, in `ap-release`, for an invoice the courier cleared |

**How the channels are set up.** Each room comes from a committed Switch template, run by its owner: `switch/templates/ap-intake.template.yaml` and `switch/templates/ap-release.template.yaml`. `ap-release` is private. The clerk and the controller are separate Switch users with linked Mattermost accounts, which is how Switch tells them apart.

**Switch's boundaries do the containing.**

- `reader` and `treasury` have different owners, so Switch refuses `reader`'s orders before `treasury` hears them, and refuses `reader`'s attempt to open `treasury` up.
- Room membership keeps `reader` out of `ap-release` and away from its context.
- Sender identity comes from Switch, so a clerk who renames themselves "Controller" is still the clerk.

`treasury` also checks the sender and the room itself, using the identity Switch gives it. So in the `--single-owner` control, attack 3 succeeds and the run fails, but the hijacked `reader` still can't get a payment out of `treasury`.

**The attacks `./prove.sh` replays:**

| # | The hijacked `reader` tries to | What must happen |
|---|---|---|
| 1 | Switch off the courier's join alerts and pull `treasury` into `ap-intake` | The courier removes it and reports it |
| 2 | Order a wire by mention and by target | Switch's fixed refusal, inline. No payment |
| 3 | Open `treasury` to anyone | 403 |
| 4 | Add itself to `ap-release` | 403 |
| 5 | Push prose through the courier, including inside a packet field | Rejected. Nothing reaches `ap-release` |
| 6 | Send a valid packet with the attacker's bank account | Held. Even the controller's `pay` is refused |
| 7 | Hide `treasury` in a new room | `treasury` reports it, and the courier removes it |
| 8 | Remove the courier | 403 |
| 9 | Reach the bank directly | No route and no token |

## Prompts & safety

`reader` in model mode runs `claude -p` with `--tools ""`, so it has no shell, no files and no network tools. Its system prompt is in `src/reader/extract-model.ts`. It treats invoice text as data, but nothing here depends on the model obeying that: its output is validated against a strict schema, no packet field can hold prose, and it holds no key to anything that moves money.

The poisoned invoice never reaches the model. Its hash triggers a scripted hijack in `src/reader/hijack.ts`, because a real model might or might not fall for it, and the room has to hold either way.

**What it won't do:** move real money, pay a held invoice, or take an order from anyone but the controller.

**Disclosed on purpose:**

- The hijack is scripted.
- The courier waits a few seconds before removing an agent. Otherwise it could remove `treasury` before Switch's refusal appears. The refusal is what stops the money, so the wait costs no safety.
- The proof's `reader` uses a recorded extraction, and its image has no model in it.
- Mattermost's seeded `admin` and `user` accounts sit in every bridged channel, including `ap-release`. They're unlinked, so they can address nobody.

## Run it

`./demo.sh up` runs the desk and leaves it up, then prints the URLs and both logins. `./demo.sh logins` prints them again, `./demo.sh logs` shows `reader`'s log, and `./demo.sh down` removes everything.

`./demo.sh up --model` uses a real model for `reader`. First create `.run/airlock-demo/model.env` holding one of the variables below.

| Variable | Purpose |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code sign-in for `reader` in model mode |
| `ANTHROPIC_API_KEY` | Alternative to the above |
| `READER_MODEL` | Model for `reader`. Defaults to `claude-sonnet-5-5` |
| `AIRLOCK_API_PORT` | Host port for the Switch API |
| `AIRLOCK_GATEWAY_PORT` | Host port for the Gateway |
| `AIRLOCK_MATTERMOST_PORT` | Host port for Mattermost |
| `AIRLOCK_POSTGRES_PORT` | Host port for Postgres |
| `AIRLOCK_LEDGER_PORT` | Host port for the mock bank's read-only page |
| `EJECT_GRACE_MS` | How long the courier waits before removing an agent |

Other secrets are generated per run into `.run/`, which git ignores. Ports bind to loopback, so nothing collides with what you already run as long as those ports are free.

To try the workflow in chat, log in as `clerk`, open `ap-intake`, drop `fixtures/invoices/INV-1042.pdf` with `@reader please read this invoice`. Then log in as `controller`, open `ap-release`, and send `@treasury pay INV-1042`.

## Tech stack

- Switch server 0.31.0 (tag `switch-v0.31.0`), with bundled Mattermost 11.9.0, by standalone Compose
- TypeScript on Node 22, run directly with type stripping, with no runtime npm dependencies
- Claude Code in headless mode for `reader`'s extraction in the demo
- `pdftotext` for reading PDFs, which also reads the white-on-white text a person never sees
- Docker Compose with one internal network, so in the proof `reader` can reach only the Switch API. In model mode it also gets an egress network for the model provider, and it still can't reach the bank

## Roadmap

Known limits:

- A held invoice can't be paid in chat. The callback and any change to vendor bank details happen outside this system.
- Removal doesn't update Mattermost's member list, because the bot stays listed. The courier's announcement covers that.
- Hidden-room detection polls, so it's a few seconds late.
- In attack 7 the courier usually removes treasury before the hijacked order arrives, so Switch refuses the order as not in the room. That run doesn't test the addressing policy inside the hidden room. Attack 2 tests it in `ap-intake`.
- The fixtures are synthetic and small, and invoice parsing is deliberately narrow.
- Mattermost's seeded `admin` and `user` accounts sit in every bridged channel, including `ap-release`.
- The design contains a hijacked agent. It says nothing about whether a model resists injection.

Next: a callback step that can release a hold, and more chat apps.

## License

MIT. See `LICENSE`. Switch itself is separately licensed and is not included in this repo.
````


- [ ] **Step 2: Run to confirm it passes**

Run: `node -e "const fs=require('fs');const want=['# Invoice Airlock','## Demo','## What it does','## Quickstart','## Built at Flip the Switch Hackathon','## How the agent works','## Prompts & safety','## Run it','## Tech stack','## Roadmap','## License'];const lines=fs.readFileSync('README.md','utf8').split('\n');let fence=false;const got=[];for(const l of lines){if(l.startsWith('\u0060\u0060\u0060'))fence=!fence;else if(!fence&&/^#{1,2} /.test(l))got.push(l)}const ok=JSON.stringify(got)===JSON.stringify(want)&&lines[0]==='<!-- readme-schema: R5-agent-ai v1 -->'&&fs.readFileSync('README.md','utf8').includes('one person plays both the clerk and the controller');console.log(ok?'PASS':'FAIL '+JSON.stringify(got))"`
Expected: PASS

- [ ] **Step 3: Commit (performed by the orchestrator, no agent runs this)**

Message: `docs: write the README`


---

### Task 6.2: The blog draft

**Files:**
- Create: `docs/blog/2026-11-04-your-agent-will-get-fooled.md`

**Depends on:** Task 4.5
**Effort:** low
**Provides:** `docs/blog/2026-11-04-your-agent-will-get-fooled.md`
**Requires:** `docs/proof/proof-report.md, docs/proof/single-owner-report.md`

Judged on clarity, accuracy and usefulness to a first-time Switch user. Thesis: your agent will get fooled, so set up your rooms so that it doesn't matter. Every claim in it was observed in the runtime checks or the proof. The user publishes it and replaces the `TBD-post-build:` line. This task is the first to be cut after the page.

Upstream signatures, pasted from their providers:

```text
docs/proof/proof-report.md, docs/proof/single-owner-report.md
```

- [ ] **Step 1: Write the files**

`docs/blog/2026-11-04-your-agent-will-get-fooled.md`

```markdown
# Your agent will get fooled, so set up your rooms so that it doesn't matter

An AI agent that reads vendor invoices reads the most attacker-controlled content a company receives. If that agent can also reach the step that moves money, one hidden line in a PDF stands between an attacker and your bank account.

You can try to teach the model to resist that line. I built something different for the Flip the Switch hackathon: an accounts-payable desk that assumes the agent has already lost. It's called Invoice Airlock, it runs on Switch and Mattermost, and this post covers what I learned setting it up. If you've never used Switch, this should save you an afternoon.

A plain statement first: the hijack in my demo is scripted, and it never touches the model. I'm not testing whether a model falls for an injection. I'm testing what happens when one does.

## The idea in one paragraph

Switch has a useful safety rule: addressing doesn't stop an agent reading a room, so membership is the real context boundary. That means you need two rooms. In `ap-intake`, a clerk and an agent called `reader` handle invoices, and `reader` has no way to reach the bank. In `ap-release`, which is private, a controller and an agent called `treasury` can pay. Between them sits `courier`, which runs no model at all. It lets through one typed packet whose fields can only hold digits and fixed codes, so a sentence has nowhere to go.

## Use two owners

This is the part I'd have got wrong. An agent's owner is whoever created its registration key, and owners turn out to be a boundary.

I ran the same attack both ways. When `reader` tries `update_agent_detail` to open `treasury` to everyone, and the two have different owners, it gets HTTP 403. Give them one owner and the same call returns 200, because agents can change a sibling's settings. My proof has a `--single-owner` flag for exactly this: the run fails, which shows the boundary is doing the work. `treasury`'s own checks still refused `reader`, so no hostile payment went out, but the first line of defence was gone.

## Link your people, or addressing can't tell them apart

An unlinked chat account matches nobody under an owner rule. Before linking, my clerk and my controller got the same reply. After linking, the controller got through and the clerk got a refusal, even after the clerk renamed themselves "Controller" in Mattermost, because Switch goes by the linked identity and not the display name.

Linking doesn't need Switch Console, though the refusal text sends you there. Each person calls `POST /gateway/collaborations/{bridge_id}/identities` from their own Gateway session.

## Things that surprised me on 0.31.0

I tested each of these against a running server rather than trusting the docs, and I'd suggest you do the same.

- **Refusals can be invisible.** Switch posts its refusal as a thread reply, and Mattermost's `CollapsedThreads` setting defaults to `always_on`. On screen it just said "1 reply". I set `MM_SERVICESETTINGS_COLLAPSEDTHREADS` to `disabled`.
- **Removal doesn't show in Mattermost.** `remove_agent_from_room` works, but the bot stays in the channel's member list and nothing gets posted. My courier announces every removal itself.
- **Never admit a suspect agent to your guard.** Any addressing rule admitting `reader` to the courier also let `reader` remove the courier. You don't need that rule: on `filter=all`, the courier still receives `reader`'s messages as chatter.
- **A member can turn off another agent's join alerts.** On `filter=all` the join event arrives anyway, so ignore the `listening` field.
- **`create_room` is a blind spot.** `reader` can make a new room with `treasury` in it, and the courier never hears about it. Switch still refuses the orders, so no money moves, but I had `treasury` watch its own room list and report anything new.
- **Repeated refusals become HTTP 429.** After 8 identical refusals you get `Retry-After: 60`. If you replay attacks, don't read that as a different outcome.
- **Answers threaded under a template kickoff can vanish.** The call returned 200 and the message never reached Mattermost, so my agents always post at the channel root.

## Make the proof fail on purpose

My proof is one command, `./prove.sh`, which needs Docker and no model key. It stands up a fresh stack, runs nine attacks with `reader`'s real key, checks the outcome from the room transcripts and the ledger, and exits non-zero if any attack works.

Two things made it worth trusting. It also fails if the clean payment fails, so a system that refuses everything can't pass. And the single-owner run shows it can actually go red.

## What this doesn't do

It doesn't make the model safer, and it says nothing about whether any model resists injection. Held invoices can't be paid in chat, the fixtures are synthetic, and the bank is a mock. In the demo I play both the clerk and the controller on two accounts.

What it does show is that the safety of the money doesn't depend on the model behaving. Your agent will get fooled eventually. With the rooms set up this way, that's a bad day for the agent and nothing worse.

TBD-post-build:public-repo-url
```


- [ ] **Step 2: Run to confirm it passes**

Run: `f=docs/blog/2026-11-04-your-agent-will-get-fooled.md; test $(wc -w < $f) -ge 600 && grep -q 'scripted' $f && grep -q 'I play both the clerk and the controller' $f && echo BLOG PASS`
Expected: BLOG PASS

- [ ] **Step 3: Commit (performed by the orchestrator, no agent runs this)**

Message: `docs: draft the blog post`
