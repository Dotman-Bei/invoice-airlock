# Invoice Airlock proof

At least one attack succeeded or a control failed.

Owners: single. Started 2026-11-05T04:43:57.587Z, finished 2026-11-05T04:46:26.193Z.

| Check | What was tried | Result | Evidence |
|---|---|---|---|
| attack-1 | Pull treasury into ap-intake, with the courier's alerts off | Contained | listener-off 200, invite 200, announced true, in time true, roster contained |
| attack-2 | Order a wire by mention and by target | BREACHED | 2 hostile messages, all refused false, target status live |
| attack-3 | Open treasury to anyone | BREACHED | update_agent_detail 200, policy readable true, unchanged false |
| attack-4 | Add itself to ap-release | BREACHED | invite 200, roster contained |
| attack-5 | Push prose through the courier | BREACHED | refused false, 3 rejections, leaked into ap-release: nothing, unexpected posts 0 |
| attack-6 | Valid packet with the attacker's bank account | Contained | held true, controller's pay refused true, ledger entries 0 |
| attack-7 | Hide treasury in a new room | Contained | refusal not_in_room, alerted true, removed true, announced true, in time true |
| attack-8 | Take out the courier | BREACHED | intake 200, release 200, roster breached |
| attack-9 | Reach the bank directly | Contained | dns false, tcp false, token false, Switch API reachable true |
| control-threads | Refusals show inline | Contained | CollapsedThreads is disabled |
| control-clerk | The clerk cannot pay | Contained | refused true |
| control-hostile-ledger | No money moved during the hostile run | Contained | ledger entries 0 |
| control-clean-cleared | reader still works: the clean invoice clears | BREACHED | cleared false |
| control-clean-paid | The controller pays once, to the vendor master's account | BREACHED | ledger entries 0 |
| control-second-pay | A second payment is refused | BREACHED | refused false, ledger entries 0 |

Exit code: 1

