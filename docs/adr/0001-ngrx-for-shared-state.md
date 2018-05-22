# 1. NgRx for shared state

Date: 2018-05-21
Status: Accepted

## Context

The portal is a list and a detail pane. That is not obviously enough
application to justify a Redux store, and NgRx in 2018 is a lot of ceremony:
an action class, a union member, a reducer case and an effect for every
operation.

The argument for a service holding a `BehaviorSubject` was real, and it is
what the first spike did.

## Decision

NgRx anyway, for one reason: optimistic updates with rollback.

The moment the UI shows a change before the carrier confirms it, we need the
previous value of the record kept somewhere until the command resolves, and we
need it kept per record rather than per screen, because an agent fires a
command and navigates away. That is state with a lifecycle of its own, and
putting it in a component means it dies when the component does — which is
exactly when we still need it.

Once that state exists, a reducer is the honest place for it.

## Consequences

Good:

- Rollback is a pure function, so every case is a unit test — including the
  one where the failure arrives after the agent has moved to another SIM.
- The list, the detail pane and the row spinners all read the same pending
  map. Before, each screen tracked its own idea of "busy" and they disagreed.
- Time-travel debugging in the Redux devtools has paid for the ceremony twice
  over when support report something odd.

Bad:

- It is a great deal of boilerplate for four commands. A newcomer adding a
  fifth touches four files.
- The store is typed `Store<any>`, which throws away most of what the
  type system could do for us here.
