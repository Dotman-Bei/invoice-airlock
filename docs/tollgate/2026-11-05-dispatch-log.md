# Dispatch log

One row per task that landed, written by the orchestrator. "Requested" is the manifest's tier, then the tier after the pin rule. "Resolved" is the model the executor reported. Effort is the authored effort raised to the tier's floor. Attempts above 1 are explained in the note.

| Task | Requested tier | Resolved model | Dispatched effort | Attempts | Gate, re-run by the orchestrator | Commit |
|---|---|---|---|---|---|---|
| core:1.1 | fast → fast | `claude-haiku-5-5` | low | 1 | PASS | 541879f |
| core:1.2 | top → top | `claude-opus-5-5` | high | 1 | PASS | 2f69647 |
| core:1.3 | top → top | `claude-opus-5-5` | high | 1 | PASS | ec57a95 |
| core:1.4 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 97b9bdf |
| core:1.5 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 16d64ea |
| core:1.6 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 4b06722 |
| core:1.7 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 7f714eb |
| core:1.8 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 7946a71 |
| core:1.9 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 36ea7dd |
| agents:2.1 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 184812d |
| agents:2.2 | top → top | `claude-opus-5-5` | high | 1 | PASS | 3b524b9 |
| agents:2.3 | top → top | `claude-opus-5-5` | high | 1 | PASS | cd93895 |
| agents:2.4 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 232cb42 |
| agents:2.5 | top → top | `claude-opus-5-5` | high | 1 | PASS | 1ba6c06 |
| agents:2.6 | top → top | `claude-opus-5-5` | medium | 1 | PASS | 7a4efc2 |
| agents:2.7 | top → top | `claude-opus-5-5` | high | 1 | PASS | b6fbcc4 |
| agents:2.8 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS. Executor reports a safety classifier stopped its first write of the file and that it retried the same content unprompted. File is byte-identical to the plan | b1ea40a |
| stack:3.1 | top → top | `claude-opus-5-5` | high | 1 | PASS | c7310b6 |
| stack:3.2 | top → top | `claude-opus-5-5` | medium | 1 | PASS | 0aa4e6c |
| stack:3.3 | top → top | `claude-opus-5-5` | high | 1 | PASS, 10 of 10 checks on a real stack. Peak 2.7 GiB, no cap hit | 9d5f92d |
| proof:4.1 | top → top | `claude-opus-5-5` | high | 1 | PASS | 2b82fca |
| proof:4.2 | top → top | `claude-opus-5-5` | high | 1 | PASS | 163fc0d |
| proof:4.3 | top → top | `claude-opus-5-5` | medium | 1 | PASS | dcd5321 |
| proof:4.4 | top → top | `claude-opus-5-5` | medium | 1 | BLOCKED, not committed. Plan bug in attack 7: `./prove.sh` exits 1 on 3 of 3 runs, 14 of 15 checks contained, no payment. Waiting on an architect fix | none |
| proof:4.4 | top → top | `claude-opus-5-5` | medium | 2 | PASS, 15 of 15 contained, exit 0, after the attack 7 fix the user chose (option A) landed in 26b54be and 6f27b9e. Attack 7 reported refusal not_in_room | e4eb419 |
| proof:4.5 | top → top | `claude-opus-5-5` | medium | 1 | PROOF RECORDED. Real run 15 of 15 contained, control exit 1 naming attack 3 | 4f0a394 |
| demo:5.1 | top → top | `claude-opus-5-5` | medium | 1 | DEMO PASS, without --model. Model overlay config checked, its image not built | 81b786d |
| demo:5.2 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 27845db |
| docs:6.1 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 780a537 |
| docs:6.2 | standard → standard | `claude-sonnet-5-5` | high | 2 | BLOG PASS. Attempt 1 rewrote a plan sentence and was sent back; the file is now byte-identical to the plan | 66c003b |
| frontend:7.1 | standard → standard | `claude-sonnet-5-5` | high | 1 | BLOCKED, not committed. Plan bug: the gate cannot pass on this path, because the design skill's `lint.mjs:22` drops any path containing "lock" and the repo is `invoice-airlock`. Tests pass, and the unmodified lint run from another path gives 0 FAIL, 0 WARN. Waiting on the user | none |
| frontend:7.1 | standard → standard | `claude-sonnet-5-5` | high | 2 | RESULT: 0 FAIL, 0 WARN with the amended gate the user chose (option A). Attempt 1 blocked because lint.mjs drops paths containing lock | e1bf4a2 |
| frontend:7.2 | standard → standard | `claude-sonnet-5-5` | high | 1 | PASS | 12571d7 |
| frontend:7.3 | standard → standard | `claude-sonnet-5-5` | high | 1 | RESULT: 0 FAIL, 1 WARN, the no-footage warning FRONTEND.md accepts. Screenshots read by the orchestrator | 1c10b8d |
| frontend:7.4 | fast → fast | `claude-haiku-5-5` | low | 1 | PASS | 61a3c6b |
| demo:5.3 | human gate, run by the user | `claude-sonnet-5-5` for `reader` | n/a | 1 | PASS. MODEL RUNNING, and a real-model INV-1042 cleared and paid, ledger balance $237,600.00, checked by the guide. The guide started the desk and did not open the sign-in file except for shape checks | see commit log |
