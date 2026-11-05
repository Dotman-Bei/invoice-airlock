# Dispatch log

One row per task that landed, written by the orchestrator. "Requested" is the manifest's tier, then the tier after the pin rule. "Resolved" is the model the executor reported. Effort is the authored effort raised to the tier's floor. Attempts above 1 are explained in the note.

| Task | Requested tier | Resolved model | Dispatched effort | Attempts | Gate, re-run by the orchestrator | Commit |
|---|---|---|---|---|---|---|
