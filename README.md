# sim-portal

Angular 6 + NgRx support portal for the multi-carrier SIM platform. The back
end is [sim-platform](https://github.com/yght/sim-platform).

*This is a cleaned-up rebuild. The original runs against live carrier APIs and
real customer records so it can't be published — the state model, the
permission rules and the interaction decisions are the real ones, rewritten
against a stub API. Happy to walk through the original on a call.*

## What the support team actually needed

Someone is on the phone. Their data has stopped working. The agent needs to
see what the SIM is doing and, nine times out of ten, suspend it or bring it
back — without caring whether the line sits on Bell, Vodafone or AT&T, and
without listening to dead air for eight seconds while a carrier thinks about
it.

Three things fall out of that, and they drove most of the design.

**Never show a button that's going to fail.** Every 409 an agent hits becomes
a support ticket about the support tool, which is a special kind of annoying.
So the front end carries its own copy of the platform's transition rules, and
a test that pins the two together.

**Commands have to feel instant.** Carrier calls take seconds. The UI applies
the change straight away and puts it back if the carrier says no.

**Put the right thing back.** An agent fires a command and moves on down the
queue. By the time a failure arrives they're three SIMs away, so the failure
carries its own ICCID rather than trusting whatever happens to be selected.
That one was a bug before it was a design decision.

## Layout

Components dispatch and subscribe. They hold nothing. The reducer, the
selectors and the presentation rules are plain functions over plain objects,
which is why the tests need no TestBed and no browser.

```
Components ──dispatch──▶ Store ──▶ Effects ──▶ SimService ──▶ sim-platform
     ▲                     │                        │
     └──────select─────────┘                   AuthService (Auth0)
```

`sims/store/sim.reducer.ts` is the one to read — optimistic commands and
rollback. `sims/sim-presentation.ts` decides what an agent is allowed to see
and do. `core/auth.service.ts` holds the Auth0 session, in memory only.

## The rules the UI has to know

The portal duplicates the platform's transition table. It has to: it can't ask
the server what's legal for a SIM without a round trip per row.

The fraud rule is the one worth mentioning. A line suspended for fraud does
not come back because somebody clicked Resume — the API demands an approver.
So the portal only shows Resume to someone who can be that approver, and when
it's hidden the button explains why rather than sitting there greyed out with
no reason given. That came out of the third ticket in a month about the button
"disappearing".

There's a test (`agreement with the platform state machine`) that encodes the
backend's table and asserts the portal offers exactly that. It exists because
we added TERMINATE from PRE_ACTIVE server-side, forgot the portal, and left
inventory SIMs unscrappable from the UI for a fortnight.

## Three decisions, written up

* [NgRx for state this size](docs/adr/0001-ngrx-for-shared-state.md) — genuinely arguable, and rollback settled it
* [Optimistic updates](docs/adr/0002-optimistic-updates.md) — including why the failure carries an ICCID
* [Token in memory, not localStorage](docs/adr/0003-token-in-memory.md) — this token can kill phone lines

## Running it

```bash
npm install
npm test
```

38 tests against the real NgRx 6.1.2 and RxJS 6.2.2, not modern stand-ins.

`ng serve` and `ng build` aren't wired up. Angular CLI 6 drags in a build chain
that won't install on current Node, and pinning the repo to Node 8 to keep it
seemed a bad trade for something meant to be read. The application code is
genuine Angular 6 and it typechecks. No credentials anywhere;
`src/environments/environment.ts` has placeholders.

## Known problems

The duplicated transition table is a liability. There's a test holding the two
ends together, but that test spells out the backend's rules by hand — so it
catches drift in the portal and not in the platform. One machine-readable
definition that both sides generate from is the real answer.

`Store<any>` throughout. NgRx 6 could do better than that even in 2018 and I
should have spent the afternoon on it.

Errors are stored as strings. They should be codes translated at the edge; the
original had French to ship and that made it awkward.

`combineLatest` in the detail component re-emits on every scope change, which
is approximately never. Harmless, but `withLatestFrom` says what I meant.

## About the rebuild

Written in the 2018 idiom deliberately: NgRx action classes with a type enum
rather than `createAction` (NgRx 8), `@Effect()` rather than `createEffect`,
module-based components. Test runner is current so the thing actually runs.
