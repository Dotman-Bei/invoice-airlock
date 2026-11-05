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
