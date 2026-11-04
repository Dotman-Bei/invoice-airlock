# Event essentials: Flip the Switch Hackathon

Fetched 2026-11-04. Source IDs such as `[S1]` resolve in [INDEX.md](INDEX.md).

**How to read this file.** Numbers, dates, prize values, criterion names and track names are exact. Sentences from the sources are paraphrased, so check the source URL before relying on the wording of a rule.

**Sources.** WMD is the WeMakeDevs event site, which hosts registration. DTA is the DevTools Academy event page. Where they disagree, both sides are recorded.

## Deadline

| Milestone | Exact value | Source |
|---|---|---|
| Hacking begins | Nov 4, 12:01 AM IST | S1, S3, S5 |
| **Submissions close** | **Nov 7, 11:59 PM IST** (Sat 2026-11-07) | S1, S3, S5 |
| Same deadline, UTC | `2026-11-07T18:29:00Z` | S6 (API `end_date`) |
| Same deadline, UTC+1 | Sat Nov 7, 19:29 | Computed |
| Kickoff live stream (already past) | Nov 2, 3:30 PM UK time = 9:00 PM GMT+5:30 | S3, S5 |
| Judging | Early November | S3, S5 |
| Winners announced | To be announced | S3, S5 |

The sources agree on these dates. The API's own `submissions_close_at` is `null` (see question 4).

## Eligibility

- **Age:** at least 18, or the age of majority where the entrant lives if that is higher. Continuous from entry until any prize is awarded. [S2 §1] WMD's Terms of Service also allow parental consent for under-18s on the platform generally, but the event's Official Rules are stricter. [S8]
- **Geography:** open everywhere except comprehensive-sanctions locations: Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk, Luhansk, Zaporizhzhia and Kherson regions. Restricted-party lists also apply. [S2 §2]
- **Natural persons only.** One accurate, verifiable identity, with a valid email and legal name matching prize verification. **No bots, scripts, macros, automated agents or programmatic entry for registration or submission.** No multiple accounts or disposable email. [S2 §3]
- **Identity verification** may be required before any prize, possibly including government photo ID or a live session. Failing it forfeits all prizes. [S2 §3]
- **Excluded from winning:** staff, officers, directors and contractors of the Sponsor and its affiliates and agencies, judges, and their immediate family and households. Government employees may be limited. [S2 §4]
- **Teams:** solo or up to 4. API `max_team_size` is `4`. Teammates can be added any time before submissions close. [S1, S3, S6]
- **Cost:** free to enter. [S1, S5]

## Submission format

| Item | Requirement | Source |
|---|---|---|
| Repository | "A public project repository" on DTA; "repo" on WMD | S5, S3 |
| Demo video | A short video of the workflow running. **No length limit or host is stated** | S5, S3 |
| README | Explains how Switch was used: which agents, how the channel is set up, how to run it | S5 |
| Blog post | Optional. DTA says it also enters Best Blog | S5 |
| Wispr usage scorecard | Only for Code with Wispr: a screenshot from Insights in the desktop app | S1 |

**Where to submit is unresolved.** See question 4 below before planning the submission step.

**Build rules** [S1, S5]:

- Switch is mandatory and must be central. The README should show how it was used.
- At least one AI agent and one person must complete a real task together through Switch, in a team chat.
- Existing agents, libraries and templates are allowed. **The Switch setup and the workflow the agents run must be built during the hackathon.**
- AI coding tools are allowed, but entrants must understand their submission and be able to explain it.
- Slack or company workspace access is not needed. Bundled Mattermost is enough to build and record the demo.

**Rights and conduct** [S2 §5-6, S8]:

- Entrants keep ownership. They grant the Sponsor a non-exclusive, worldwide, royalty-free, sublicensable, **irrevocable** license to host, reproduce, display, distribute and make derivative works for operating, judging and promoting the event and the Sponsor's programs.
- Entrants warrant original work, license compliance for third-party components, no malicious code, and no third-party confidential information.
- WMD's Terms define cheating to include misrepresenting what was built during the hackathon window. A violation can disqualify an entry even after winners are announced.

## Published judging criteria

Weights are the same on both sites (question 1).

| Criterion (WMD label) | DTA label | Weight | What it asks (paraphrased) |
|---|---|---|---|
| **Use of Switch** | Use of Switch | **30%** | Is Switch central, so that the project would break without it? |
| **Technical execution** | Technical execution | **25%** | Does it run, and can someone clone and reproduce it? |
| **Creativity and impact** | Creativity and impact | **25%** | Is the idea fresh, and does it solve a problem a real team has? |
| **Presentation** | Presentation and documentation | **20%** | Do the demo video and README make the build and Switch usage clear? |

**Process.** WeMakeDevs reviews every submission and builds a shortlist. Switch, DevTools Academy and WeMakeDevs judge the finalists as a joint panel. [S1, S5]

**Judged separately** [S1, S5]:

- Best Core Contribution: the 10 most useful, best-built pull requests.
- Best Blog: clarity, accuracy, and usefulness to a first-time Switch user.

**Judges' names:** not published. The API's judges list is empty, even though `judges_published` is `true`. [S6]

## Prize structure

| Prize | WMD (S1) | DTA (S5) |
|---|---|---|
| Headline pool | `$10,000` | `$10,000` |
| Hackathon-list card | `$8000 in prizes` (S7) | n/a |
| Track 01 Best Business Workflow | `$2,000` | Prize to be announced |
| Track 02 Best Personal or Creative Workflow | `$2,000` | Prize to be announced |
| Track 03 Best Core Contribution | `$100 × 20`, top 20 PRs | `$100` each, top 10 PRs |
| Code with Wispr | `$500` | Not listed |
| Best Blog | AirPods 5, for the best post (singular) | AirPods 5 for each of the top 5 posts |
| #HowISwitch posts | Logitech mechanical keyboard, top 5 posts | Swag, top 20 posts |
| Random project draw | Swag, 20 submissions | Not listed |
| Certificate | Every submission | Every project |
| Repo star giveaway | Keychron keyboard, one random person who stars (S1, S6) | Keychron keyboard |

Itemized cash on WMD adds up to `$6,500`, or `$5,500` if Track 03 pays only 10. No source itemizes how that reaches `$10,000` or `$8000`.

**Prize terms** [S2 §7]: non-transferable. The Sponsor may substitute equal or greater value. Winners handle their own taxes and may need a W-9 or W-8BEN. Prizes unclaimed within 30 days of notification may go to an alternate.

## Testnet vs mainnet

No such rule exists. The event has no blockchain component or requirement in any source read.

## The six flagged questions

| # | Question | Status | Answer |
|---|---|---|---|
| 1 | Judging weights | **RESOLVED** | 30/25/25/20 on both sites |
| 2 | Track 01/02 prize | **UNRESOLVED**, leaning WMD | `$2,000` on WMD, to be announced on DTA |
| 3 | Track 03 count | **UNRESOLVED** | 20 vs 10, and WMD contradicts itself |
| 4 | Where and how to submit | **UNRESOLVED, urgent** | The portal's submission mode is off |
| 5 | Registration before submitting | **RESOLVED** | Required |
| 6 | One project in Track 01 and 02; multiple prizes | **UNRESOLVED** | Not addressed anywhere |

### 1. Judging weights: resolved

WMD's server-rendered HTML holds a `0` for each criterion, inside a count-up animation. Once the section scrolled into view in Chrome, it rendered **30%, 25%, 25%, 20%**, confirmed by DOM text and a screenshot. The `0%` was the animation's starting value. [S1, Chrome] DTA shows the same weights statically. [S5]

The only remaining difference is the label: `Presentation` on WMD, `Presentation and documentation` on DTA.

### 2. Track 01/02 prizes: both sides recorded

- **WMD:** `$2,000` in cash for each, in both its prize cards and its track cards. [S1]
- **DTA:** "Prize to be announced" for each. [S5]

WMD hosts registration and is more specific, so it is the likelier current figure. No organizer statement confirms that.

### 3. Track 03 count: both sides recorded

- **WMD prize and track cards:** top 20 PRs win `$100` each. [S1]
- **WMD judging section:** the 10 most useful, best-built PRs. [S1]
- **DTA:** `$100` each for the top 10, and the same judging line. [S5]

Track 03's other rules also differ: WMD allows up to 5 open PRs and work before Nov 4, while DTA says one issue at a time and PRs opened from Nov 4. See [tracks.md](tracks.md).

### 4. Where and how to submit: unresolved and urgent

**Facts as of 2026-11-04:**

- WMD's signed-in header shows a **Submit your project** button linking to `/hackathons/switch/submit`. [S1, Chrome]
- That page renders the heading `No submissions for this one` and says the event takes registrations only. [S4, Chrome, signed in]
- The cause is the public API record: `submission_mode: "none"`, `submission_questions: null`, `submissions_close_at: null`, last updated `2026-10-28T04:56:45Z`. [S6]
- The site's code shows the form only when `submission_mode` is `form`. [S9]
- Comparable past events used `form`: Graph Hacks, Environmental Hacks, First Commit, The Zerops Challenge, Patch the Conference, No Hands: The Wispr Challenge. [S7]
- Both event pages still tell entrants to submit a repo, video and README by the deadline. [S3, S5]
- No Google Form, Devfolio, Devpost, Typeform or Tally link appears in the raw WMD pages checked. [S1, S4] An external form could still be announced elsewhere.
- Discord and the kickoff stream may hold the answer. Neither was read: Discord is gated, and no public recording was found.

**What this does and does not mean.** Most likely the form has not been switched on yet, but that is an inference. No source says so.

**Actions for the user:**

1. Ask in the WeMakeDevs Discord today where submissions go and when the form opens.
2. Re-check `https://wemakedevs-server.onrender.com/hackathons/switch` for `submission_mode` changing to `form`. It is a public GET.
3. Keep Step 3 flexible until this is answered.

**Likely fields, as inference only.** Past WMD forms asked for project title, description, track, repository and demo video link. Graph Hacks also asked for a sponsor-usage answer, a blog link, and product feedback. The Wispr Challenge asked for an uploaded usage card. [S7] This event's actual form may differ.

### 5. Registration before submitting: resolved

Yes. The submission component tells unregistered users to register first and states that only registered hackers can submit. [S9] Official Rules §3(a) also requires each entrant to register under one verifiable identity. [S2]

- `registration_close_at` is `null`, and the site's code then falls back to the event end date. [S6, S9]
- The user reports having registered. The signed-in event page showed the registered state, with options to start or join a team. [S1, Chrome]

### 6. Same project in Track 01 and 02; multiple prizes: unresolved

- **Allowed:** entering more than one track. The FAQ's example is a workflow plus core PRs plus a blog post. [S1, S5]
- **Explicitly stackable:** Code with Wispr, alongside any track; Best Blog, alongside a track or alone. [S1]
- **Not addressed anywhere:** whether one project can be entered in both Track 01 and Track 02, and whether one project or person can win more than one prize. Rules §7 defers to the challenge materials, which are silent. [S2]
- **Weak signal:** Graph Hacks used a multi-select track question. [S7] Another WMD event, the Wispr Challenge, limited entrants to one track. [S10] Neither binds this event.

Ask in Discord together with question 4.

## Other discrepancies

| Topic | WMD | DTA / other |
|---|---|---|
| Help channel | "WeMakeDevs Discord", `discord.gg/E2rWw2Yhsm` | "The Switch Discord", `discord.gg/E6a2Jnb6G` |
| Sponsor of record | Rules name **Switch AI** as Sponsor | WMD Terms name WeMakeDevs Limited (UK) as platform operator [S8] |
| Governing law | Rules: USA law, courts "located in Online", which looks like an unfilled template value | n/a |
| Privacy policy | Rules point to the event page, not a policy document | n/a |
| Agent protocol transport | Event page: server-sent events in, HTTP out | Switch docs: WebSocket, SSE deprecated. See [sponsors/switch.md](sponsors/switch.md) |
