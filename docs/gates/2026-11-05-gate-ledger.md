# Gate ledger: Flip the Switch Hackathon, Invoice Airlock

One ledger per campaign. It was created by the demo-studio seat on 2026-11-05 because none existed yet when the demo video was uploaded. Any other seat extends this file and never starts a second one.

The user files the submission form personally (Official Rules §3). Nothing here files it.

## Gates

| Gate | Tier | Pass | Tool plan | Human moment | Risk note | Status |
|---|---|---|---|---|---|---|
| Demo video: upload the finished cut to YouTube and resolve the submission draft's demo video URL (demo-studio, Step 2.5) | C. The kickoff set UPLOAD to manual, so only the user uploads | closing | None for the upload itself. After the user supplied the URL, demo-studio checked it logged-out with plain HTTP GETs (YouTube oEmbed and the public watch page), then edited `docs/gates/submission-draft.md` and the demo script with `Bash` and `git` | The user uploaded the file in YouTube Studio and sent the URL. Done | Low. The video shows a mock bank, synthetic vendors and illustrative amounts only, and the QC pass found no token, password, hostname or address in any frame. See the visibility note below | done, with evidence below |

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
