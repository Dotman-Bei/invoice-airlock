# Your agent will get fooled, so set up your rooms so that it doesn't matter

*What I learned building an accounts-payable desk on Switch that stays safe when its own AI agent is hijacked*

An AI agent that reads vendor invoices reads the most attacker-controlled content a company receives. If that agent can also reach the step that moves money, one hidden line in a PDF stands between an attacker and your bank account.

You can try to teach the model to resist that line. I built something different for the Flip the Switch hackathon: an accounts-payable desk that assumes the agent has already lost. It's called Invoice Airlock, it runs on Switch and Mattermost, and this post covers what I learned setting it up. If you've never used Switch, this should save you an afternoon.

A plain statement first: the hijack in my demo is scripted, and it never touches the model. I'm not testing whether a model falls for an injection. I'm testing what happens when one does.

![The hijacked agent's wire order refused inline by Switch, the invoice held, treasury removed, and the mock ledger unmoved at $250,000.00](https://raw.githubusercontent.com/Dotman-Bei/invoice-airlock/main/docs/demo/screenshot-hijack-contained.jpg)

*The hijacked `reader` pulls `treasury` into its room and orders a $48,200 wire. Switch refuses it in the channel, the courier holds the invoice and removes `treasury`, and the mock ledger stays at $250,000.00.*

## The idea in one paragraph

Switch has a useful safety rule: addressing doesn't stop an agent reading a room, so membership is the real context boundary. That means you need two rooms. In `ap-intake`, a clerk and an agent called `reader` handle invoices, and `reader` has no way to reach the bank. In `ap-release`, which is private, a controller and an agent called `treasury` can pay. Between them sits `courier`, which runs no model at all. It lets through one typed packet whose fields can only hold digits and fixed codes, so a sentence has nowhere to go.

## Use two owners

This is the part I'd have got wrong. An agent's owner is whoever created its registration key, and owners turn out to be a boundary.

I ran the same attack both ways. When `reader` tries `update_agent_detail` to open `treasury` to everyone, and the two have different owners, it gets HTTP 403. Give them one owner and the same call returns 200, because agents can change a sibling's settings.

My proof has a `--single-owner` flag for exactly this. With one owner, the run fails: attacks 2, 3, 4, 5 and 8 succeed, and attack 7 succeeded in one of three runs. `treasury`'s own checks still refused `reader`, so no hostile payment went out, but the first line of defence was gone.

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
- **Repeated refusals become HTTP 429.** After 8 identical refusals the 9th gets `Retry-After: 60`. If you replay attacks, don't read that as a different outcome.
- **Answers threaded under a template kickoff can vanish.** The call returned 200 and the message never reached Mattermost, so my agents always post at the channel root.

## Make the proof fail on purpose

My proof is one command, which needs Docker, bash and curl, and no model key:

```bash
git clone https://github.com/Dotman-Bei/invoice-airlock
cd invoice-airlock
./prove.sh
```

It stands up a fresh stack, runs nine attacks with `reader`'s real key and real Switch operations, checks the outcome from the room transcripts and the ledger, and exits non-zero if any attack works.

Two things made it worth trusting. It also fails if the clean payment fails, so a system that refuses everything can't pass. And the single-owner run shows it can actually go red.

## If you set this up yourself

1. Put untrusted content and the ability to act in different rooms. Membership is the boundary, not addressing.
2. Give the agent that reads and the agent that acts different owners.
3. Link every person's chat account to their own Switch user before you rely on an owner rule.
4. Turn `CollapsedThreads` off, or your refusals will hide behind "1 reply".
5. Put a guard with no model between the rooms, and never let the suspect agent address it.

## What this doesn't do

It doesn't make the model safer, and it says nothing about whether any model resists injection. Held invoices can't be paid in chat, the fixtures are synthetic, the amounts are illustrative, and the bank is a mock. In the demo I play both the clerk and the controller on two accounts. The courier waits on purpose before it removes an agent, so each step can be seen; Switch's refusal is what stops the money, not the removal. The proof tables in the video are recorded runs from the repo, not live.

What it does show is that the safety of the money doesn't depend on the model behaving. Your agent will get fooled eventually. With the rooms set up this way, that's a bad day for the agent and nothing worse.

**Code:** https://github.com/Dotman-Bei/invoice-airlock
**Demo video (2:41):** https://youtu.be/e0wOvpWHt5A
**Project page:** https://invoice-airlock-site.vercel.app

*Built for the Flip the Switch Hackathon (WeMakeDevs x DevTools Academy x Switch) by one person working with AI coding agents. This post was drafted with AI help and edited by me.*
