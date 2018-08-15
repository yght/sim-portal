# 2. Optimistic updates, with the ICCID on the failure

Date: 2018-08-14
Status: Accepted

## Context

A suspend takes between one and eight seconds depending on the carrier, and
Vodafone is asynchronous, so it can be longer. Agents are on the phone while
this happens. The first version showed a spinner and blocked the pane, and
support hated it.

## Decision

Apply the change in the store immediately, keep the previous record, and roll
back if the command fails.

Two details that are not obvious:

**Terminate shows TERMINATING, not TERMINATED.** The optimistic state is the
state the platform will move to, which for a teardown is the transitional one.
Showing an agent that a line is dead when the carrier may still refuse is
worse than showing them it is on its way out.

**The failure action carries the ICCID it belongs to.** An agent working a
queue suspends a SIM and clicks straight on to the next one. When the failure
comes back, the selection has moved. Rolling back "the selected SIM" corrupts
a record the agent never touched, and it is very hard to notice.

## Consequences

Good:

- The pane responds instantly, and the failure path is rare enough that a
  rollback with an explanation is acceptable when it happens.
- Because rollback restores the whole previous record rather than just the
  state field, the suspension reason and timestamps come back correctly too.

Bad:

- An agent can see a state that never actually existed on the carrier, for a
  second or two. We accept this for suspend and resume. We would not accept it
  for anything that spends money.
- Two commands against the same SIM in flight together would have the second
  overwrite the first's `previous`. Today the UI prevents it by disabling the
  buttons while a command is pending, which is a guard in the wrong layer —
  the store should refuse it.
