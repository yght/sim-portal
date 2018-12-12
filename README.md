# sim-portal

The support portal for the multi-carrier SIM platform. Angular 6, NgRx, Auth0.
This is the front end for the SIM platform.

## The problem

A support agent has a customer on the phone. The customer's data has stopped
working. The agent needs to see what the SIM is doing and, usually, suspend or
resume it — without knowing or caring that the line sits on Bell rather than
Vodafone, and without waiting eight seconds for a carrier round trip while the
customer listens to them breathe.

Three things follow from that:

- **The portal must never offer a button that will fail.** Every 409 an agent
  hits is a support ticket about the support tool. So the front end carries
  its own copy of the platform's transition rules, and a test that pins the
  two together.
- **Commands have to feel instant.** Carrier calls take seconds. The UI
  applies the change immediately and rolls back if the carrier refuses.
- **Rolling back has to hit the right record.** An agent working a queue
  fires a command and moves on. When the failure arrives they are three SIMs
  away, so the failure carries its own ICCID rather than assuming the
  selection is still where it was.

## Architecture

```
  ┌──────────────┐   dispatch    ┌───────────────┐
  │  Components  │──────────────▶│  NgRx Store   │
  │  list/detail │◀──────────────│   (reducer)   │
  └──────────────┘   select      └───────┬───────┘
                                         │ actions
                                         ▼
                                 ┌───────────────┐
                                 │    Effects    │
                                 └───────┬───────┘
                                         │
                          ┌──────────────┴─────────────┐
                          ▼                            ▼
                  ┌───────────────┐            ┌──────────────┐
                  │  SimService   │            │ AuthService  │
                  │  (HttpClient) │            │   (Auth0)    │
                  └───────┬───────┘            └──────────────┘
                          │  Bearer token added by interceptor
                          ▼
                  ┌───────────────────┐
                  │   sim-platform    │
                  └───────────────────┘
```

Same shape as the backend: **the logic worth testing is pure.** The reducer,
the selectors and the presentation rules are plain functions over plain
objects. Components subscribe and dispatch; they hold no logic of their own.

## What's in here

| Path | What it is |
|---|---|
| `sims/store/sim.reducer.ts` | Optimistic commands and rollback. The interesting file. |
| `sims/sim-presentation.ts` | State → label, badge, and which actions are offered. |
| `sims/store/sim.selectors.ts` | Derived views, including the search filter. |
| `sims/store/sim.effects.ts` | Carrier calls, and turning API errors into English. |
| `core/auth.service.ts` | Auth0 session. Token in memory, never localStorage. |
| `core/auth.interceptor.ts` | Attaches the bearer token to platform calls only. |

## Decisions worth arguing about

1. **[NgRx for a portal this size](docs/adr/0001-ngrx-for-shared-state.md)** —
   a real question, since the store is a lot of ceremony for a table and a
   detail pane. The optimistic-rollback requirement is what settled it.
2. **[Optimistic updates with rollback](docs/adr/0002-optimistic-updates.md)** —
   and why the failure action carries its own ICCID.
3. **[Access token in memory](docs/adr/0003-token-in-memory.md)** — not
   localStorage, because this token can terminate phone lines.

## Running it

```bash
npm install
npm start       # ng serve, on http://localhost:4200
npm test        # 38 tests
```

Point `apiUrl` in `src/environments/environment.ts` at a running
[sim-platform](https://github.com/yght/sim-platform), and fill in the Auth0
tenant details.

## What I'd do differently now

- **The duplicated transition table is a liability.** `sim-presentation.ts`
  restates the backend's state machine, and a test pins them together — but
  that test encodes the backend's rules by hand, so it catches drift in the
  portal and not in the platform. The right answer is one machine-readable
  definition both sides generate from.
- **`combineLatest` in the detail component** re-emits on every scope change,
  which is almost never. Harmless, but `withLatestFrom` says what is meant.
- **Errors are strings in the store.** They should be codes, translated at the
  edge, so the messages can be localised — the original had French to ship.
- **Typed store.** `Store<any>` throughout; NgRx 6 could do better than that
  even in 2018 and I should have taken the time.
