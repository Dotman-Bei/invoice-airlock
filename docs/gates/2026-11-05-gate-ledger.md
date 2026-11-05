# Gate ledger: Flip the Switch Hackathon, Invoice Airlock

One ledger per campaign. It was created by the demo-studio seat on 2026-11-05 because none existed yet when the demo video was uploaded. Any other seat extends this file and never starts a second one.

The user files the submission form personally (Official Rules §3). Nothing here files it.

## Gates

Closing pass inventoried 2026-11-05 by the gate-concierge seat (`claude-opus-5-5`). No preflight pass ran, so every gate is `closing`. Signup automation is struck for this campaign, and Official Rules §3 forbid automated registration or submission: the form is filled and submitted only by the user. Nothing below runs until the user names it.

| # | Gate | Tier | Pass | Tool plan | Human moment | Risk note | Status |
|---|---|---|---|---|---|---|---|
| G2 | Pre-flip doc fixes: attack 7 wording, `.gitattributes`, machine-detail scrub, README video and page links | A, doc-only edits | closing | `Bash`, `git` (commits `005381c`, `1aa983d`, `c91731c`, `36996cd`) | None | Low. Doc-only, no product code. Git history is left as it is by the user's decision | done (evidence below) |
| G3 | Run `npm test` and `npm run typecheck` on the laptop | A, but needs a download | closing | `Bash`: `npm ci` from the committed `package-lock.json` (dev dependencies only: `typescript` 5.9.3, about 22.5 MB; `@types/node` 22.20.5, about 2.3 MB; `@types/ws` 8.18.2; `ws` 8.22.1), then the two scripts. `./prove.sh` is not run: the desk is on the VPS and no agent goes there | None | Low. Installs into the repo's git-ignored `node_modules` | pending: needs consent for the download |
| G4 | Flip `Dotman-Bei/invoice-airlock` from private to public | A on consent, or the user clicks | closing | `gh auth status` first (must name `Dotman-Bei`), then `gh repo edit Dotman-Bei/invoice-airlock --visibility public --accept-visibility-change-consequences`. Or the user: repo → Settings → General → Danger Zone → Change visibility → Make public | Consent. The user may prefer to click it | Exposure is permanent once crawled. A history scan found no tokens or keys. History still holds the scrubbed machine details (laptop and VPS hostnames, the other service's name, a key path) in 2 commits each, by the user's decision. Never delete or transfer the repo | pending |
| G5 | After the flip, verify logged-out: the repo page, the raw README, the page's GitHub link and the video's outro QR target | A | closing | Plain `curl` GETs with no auth, and `claude-in-chrome` read-only on the Vercel page. The outro QR was generated from `https://github.com/Dotman-Bei/invoice-airlock`; checking that URL resolves covers it, since decoding the pixels would need an extra QR library | None | None | pending, after G4 |
| G6 | Resolve the draft's `TBD-post-build:public-repo-url` | A | closing | `Edit`, `git` on `docs/gates/submission-draft.md` | None | None | pending, after G5 |
| G7 | Fill the submission form | C. Rules §3 and the kickoff: the user types every field | closing | This seat gives every field paste-ready in one message, then a final read-only check of the draft against the live form's 12 fields (confirmed 2026-11-05: `submission_mode` is `form`, fields match the draft) | The user pastes each answer into the form at https://www.wemakedevs.org/hackathons/switch | Wrong-field paste. The final check covers it | pending, after G6 |
| G8 | Press Submit | C, irreversible | closing | None | The user presses Submit. Target Sat 2026-11-07 15:00 UTC, deadline 18:29 UTC | None beyond the deadline | pending |
| G9 | Revoke the 1-year `reader` Claude token made with `claude setup-token`. Required: its value was exposed in a chat screenshot | C, the user's own account | closing | `claude-in-chrome` read-only to re-read the list afterwards. There is no CLI revoke command ([anthropics/claude-code#48373](https://github.com/anthropics/claude-code/issues/48373)) | claude.ai → Settings → Account → "Where you're logged in". Long-lived Claude Code sign-ins appear as rows named "Claude Code" with no other label (25 sign-ins over 3 pages on 2026-11-05). Each row's "Sign-in actions" menu has one item, "Log out". Because the rows can't be told apart, log out every "Claude Code" row, or use "Log out of all devices" | Logging out every Claude Code row also ends this Claude Code session and any others, so do it last and sign in again. Cannot be verified by using the token, because its value must never be handled; it is verified by re-reading the list | pending |
| G10 | Delete the exposed screenshot from the guide session's temp images | C, the guide's chat | closing | None here. Routed to the guide seat | The user relays to the guide seat | Low | pending |
| G11 | Remove the two write deploy keys: the VPS key (id 168756323, added 2026-11-04 13:17 UTC) and the `airlock-build` key (id 168793006, added 2026-11-04 19:04 UTC), both read-write | C by the user's choice; `gh` can do it on consent | closing | User: repo → Settings → Deploy keys → Delete on each. Or `gh repo deploy-key delete <id>`. Then `gh api repos/Dotman-Bei/invoice-airlock/keys` read-only to verify | The user deletes both, or consents to `gh` | Removing them stops any push from the VPS. Do it after the guide seat's last VPS push | pending |
| G12 | Decide whether Vercel keeps GitHub access | C, optional | closing | None | Vercel → Project → Settings → Git → Disconnect, or GitHub → Settings → Applications → Installed GitHub Apps → Vercel → limit or remove. Keeping it means each push to `main` redeploys the page | If disconnected, the page stops redeploying and stays as deployed | optional |
| G13 | Return the VPS to its earlier state with `docs/gates/setup-build-user.sh uninstall` | C, root on the VPS | closing | None here. No agent goes to the VPS | The user runs it as root, or the guide seat does in its own chat | Removes the `airlock-build` user and its rootless Docker | optional, later |
| G14 | Optional form fields: blog post URL, Wispr usage card, #HowISwitch post URL | C, the user publishes | closing | This seat can prepare paste-ready copy. The blog draft is `docs/blog/2026-11-04-your-agent-will-get-fooled.md` | The user publishes the blog on a platform they choose, or drops it. Wispr Flow was never installed (tollgate C5), so the usage card is likely dropped. #HowISwitch is a social post | None | optional |
| G1 | Demo video: upload the finished cut to YouTube and resolve the submission draft's demo video URL (demo-studio, Step 2.5) | C. The kickoff set UPLOAD to manual, so only the user uploads | closing | None for the upload itself. After the user supplied the URL, demo-studio checked it logged-out with plain HTTP GETs (YouTube oEmbed and the public watch page), then edited `docs/gates/submission-draft.md` and the demo script with `Bash` and `git` | The user uploaded the file in YouTube Studio and sent the URL. Done | Low. The video shows a mock bank, synthetic vendors and illustrative amounts only, and the QC pass found no token, password, hostname or address in any frame. See the visibility note below | done, with evidence below |

## Recommended order

G3 → G4 → G5 → G6 → G7 → G8, then G11 → G9 → G10, then G12, G13 and G14 if wanted. Tests come before the flip, and the flip before its URL can go in the draft. The deploy keys wait for the guide seat's last VPS push. The token goes last because logging out the Claude Code rows ends this session. Do it on Nov 5 or 6 anyway, since its value is exposed.

## G2 evidence: pre-flip fixes

| Fix | Result |
|---|---|
| Attack 7 wording | `005381c`. README (single-owner paragraphs and the Roadmap limit) and the beat sheet now say attacks 2, 3, 4, 5 and 8 succeed and attack 7 succeeded in 1 of 3 runs, matching `docs/proof/single-owner-report.md` (breached), `docs/proof/single-owner-report-rerun.md` (contained) and runsheet item 11. "Usually" became "sometimes (2 of 4 repeated two-owner runs)". The blog and the submission draft make no attack 7 claim and were left alone |
| `.gitattributes` | `1aa983d`, `*.pdf binary`. Blobs unchanged (`INV-1042` `c8259ef`, `INV-2091` `3c91e45`). `INV-2091.pdf` hashes to `c3e15f01…`, equal to `fixtures/extractions/poisoned-sha256.txt`. The two locally restored PDFs were not committed; their working copies equal the blobs |
| Machine-detail scrub | `c91731c`. Laptop and VPS hostnames, Windows user paths, the deploy-key path, the SSH host alias, the VPS's other service names and the browser extension list replaced with placeholders in `docs/tollgate/`, `docs/guide/` and `docs/resources/`. A whole-tree re-grep finds none left. Remaining hits are loopback and private-range addresses in code and tests, the public DNS `1.1.1.1`, and `setup-build-user.sh`'s own template key name and alias, which are script code, not this machine's details |
| README links | `36996cd`. The Demo section now links the video and the Vercel page and shows a still from the published cut. No `TBD-post-build` left in the README. The submission draft already names both URLs |
| Linux clean-clone quickstart | Checked statically, not run: `prove.sh` and `demo.sh` are committed executable with `#!/usr/bin/env bash`; the hash helper falls back from `sha256sum` to `shasum`; `node` runs inside the `proof-runner` container, so the host needs only Docker with Compose, bash and curl, as the README says |

## Demo video upload record

| Field | Value |
|---|---|
| URL | https://youtu.be/e0wOvpWHt5A |
| Uploaded by | The user, manually, in YouTube Studio. This seat did not automate YouTube |
| Channel shown logged-out | Emmanuel Bamigboye (the `author_name` YouTube returns) |
| Title as published | invoice airlock demo (the user changed it from the approved publish copy) |
| Source file | `docs/demo/video/out/invoice-airlock-demo.mp4`, git-ignored and never committed. 1920×1080 at 30 fps, h264 with AAC audio, loudness -14 LUFS, 160.97 s, 19,597,783 bytes. SHA-256 `a082add72e86ad233084ab83728d9d58c98491e535ab9fdc0023ace8a7a702b7` |
| Length on YouTube | 161 s, under the form's 3:00 limit. YouTube re-encodes, so the uploaded bytes cannot be compared with the checksum above. The length matches |
| Verified logged-out | 2026-11-05. A plain GET with no cookies or login: oEmbed returned 200 with the title and channel, and the watch page returned 200 with `playabilityStatus` OK, `lengthSeconds` 161 and `isPrivate` false. The guide seat reported the same result independently |
| Visibility observed | Not unlisted and not private. The watch page's `microformat` reported `isUnlisted` false on 2026-11-05, so the video looked public at that moment. The kickoff planned unlisted. The form accepts public or unlisted. The user may change visibility in Studio and the link stays the same |
| Watch gate | The user was given the file path and a copy in Downloads, and then uploaded it. This ledger does not record a separate "watched" confirmation, because the user did not state one |
| Resolves | `docs/gates/submission-draft.md`, field "Demo video (required)" |
| Terms note | Uploading was the user's own action in their own session, so no automated access to YouTube took place |
