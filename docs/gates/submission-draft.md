# Submission draft: Flip the Switch Hackathon

Every field from `submission_questions` at `https://wemakedevs-server.onrender.com/hackathons/switch`, read 2026-11-04. Lines marked `TBD-post-build` are filled once the build lands. **The user files this form personally, per Official Rules §3.** Before filing, check that the repo is public and that every statement below still matches what the proof reports.

## Project Details

### Project title (required)

Invoice Airlock

### Tracks you are submitting for (required)

- [x] Best Business Workflow
- [ ] Best Personal or Creative Workflow
- [ ] Best Core Contribution

Code with Wispr and Best Blog are not checkboxes. They are entered through the card and blog fields under Track Details.

### Project description (required): what problem does your project solve, and who is it for?

Accounts-payable teams are being asked to let AI agents read vendor invoices, the most attacker-controlled content a company receives, right next to the step that moves money. Instructions hidden in a PDF can fool an agent, and an agent that can also reach the payment step turns that into a wire.

Invoice Airlock is an accounts-payable desk on Switch for a small finance team, built on the assumption that the agent has already lost. Outside content stays in a room with no reach. Only validated typed fields cross to the room that can pay, through a courier that runs no model. Only the controller can release money. When the hijacked agent tries everything it can, the ledger doesn't move.

The invoice attack is a scenario, the hijack is scripted on purpose, the vendors are synthetic and the bank is a mock. It makes no claim that any model resists injection.

### GitHub Repository or contribution (required): public repository, with a README that explains how to set it up

TBD-post-build:public-repo-url

### Demo video (required): under 3 minutes, on YouTube or Loom, public or unlisted, showing the agent working in a real chat with your teammates

TBD-post-build:demo-video-url

### Live demo or deployment (optional): leave blank if your project doesn't have a live demo

TBD-post-build:public-page-url

If the page was cut, leave this blank.

## Track Details

### Pull requests (optional, required for Best Core Contribution)

Leave blank. Not entered in that track.

### Blog post (optional): the best blog wins AirPods 5

TBD-post-build:blog-post-url

### Your Wispr usage card (optional, required for Code with Wispr): in the Wispr Flow desktop app, open Insights, then Your usage, then Share, and upload the card

TBD-post-build:wispr-usage-card

### Your #HowISwitch post (optional): the top 5 posts win a Logitech mechanical keyboard

TBD-post-build:howiswitch-post-url

## How you used Switch

### How did you use Switch in your project? (required): which agent did you connect, which platforms does it run on, what real work does it do, and how do your teammates work with it?

**Which agent.** Three agents connect through Switch's agent protocol. `reader` wraps Claude Code in headless mode with zero tools. `courier` and `treasury` are small programs with no model at all, so they have no prompt to inject.

**Platform.** The bundled Mattermost, on a self-hosted Switch 0.31.0 server run by Docker Compose.

**The real work.** It runs an accounts-payable desk. The clerk drops a vendor invoice into the `ap-intake` room and mentions `reader`, which reads the PDF and posts one typed packet. The `courier`, in both rooms, checks that packet against the vendor master, the purchase order and the goods receipt, and writes its own message into the private `ap-release` room: cleared, or held for a callback. The controller pays a cleared invoice by telling `treasury`, and the mock ledger moves.

**How people work with it.** In chat, by addressing agents. The two people are told apart because their Mattermost accounts are linked to separate Switch users. **In the demo, one person plays both the clerk and the controller, on two accounts.**

**Why Switch is central.** Rooms, owners, addressing and sender identity are the controls. `reader` and `treasury` have different owners, so Switch refuses `reader`'s orders before `treasury` hears them and refuses `reader`'s attempt to open `treasury` up. Room membership keeps `reader` away from the room that can pay. `./prove.sh` replays nine attacks with `reader`'s real key and needs only Docker. `./prove.sh --single-owner` gives the two agents one owner, and the proof fails, which shows that boundary is doing the work. `treasury`'s own checks still refuse the hijacked agent, so no hostile payment goes out.

### What did you like about Switch, and what would you improve? (required): what worked, what got in the way, and what you'd want Switch to do next

**What worked.** Owners and addressing make a real boundary, and it held under every attack I tried. A refused sender gets a clear refusal in the room. Identity comes from the linked account, so a clerk who renames themselves "Controller" in Mattermost is still refused. Every part of the setup is scriptable through the Gateway and agent APIs, without Switch Console.

**What got in the way**, all seen on server 0.31.0 with Mattermost:

- Refusals are thread replies and Mattermost's `CollapsedThreads` defaults to `always_on`, so a refusal shows only as "1 reply". The most important safety message is hidden by default.
- `remove_agent_from_room` drops the agent from Switch's roster, but it stays in the Mattermost member list and nothing is posted, although its docstring says it leaves the bridged channel.
- An answer threaded under a template kickoff returned HTTP 200 and never reached Mattermost. Kickoff activity cards also fail with `Invalid RootId parameter` (#1158).
- A member can turn off another agent's join alerts with `update_room`, and `create_room` can put another owner's agent in a room with no event to anyone watching.
- Linking a chat account needs an API call. The 0.31.0 Gateway has no screen for it, and the refusal text points to Console.

**What I'd want next.** Refusals that always show in the channel. Removal that reaches the bridged channel. An event when your agent is added to any room. A way to stop someone else's agent being added to a room without its owner's consent.

## Facts for the closing pass

| Fact | Value |
|---|---|
| Team | Solo plus AI coding agents. One person plays both roles in the demo |
| Tech stack | Switch 0.31.0, bundled Mattermost, TypeScript on Node 22, Docker Compose, Claude Code in headless mode |
| Built during the event | All of it, Nov 4-7, 2026. It uses Switch's published images, and no Switch code is committed |
| Licence | MIT |
