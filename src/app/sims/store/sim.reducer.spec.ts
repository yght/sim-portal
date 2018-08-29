import { simReducer, initialState, SimListState } from './sim.reducer';
import * as actions from './sim.actions';
import { Sim, SimState } from '../sim.model';
import { selectVisibleSims, selectSimState } from './sim.selectors';

function sim(iccid: string, state: SimState, extra: Partial<Sim> = {}): Sim {
  return {
    iccid,
    carrier: 'bell',
    state,
    msisdn: '14165550142',
    ratePlanId: 'PLAN_5GB',
    suspensionReason: null,
    orgId: 'org_bell_reseller_04',
    updatedAt: '2018-09-04T10:00:00.000Z',
    ...extra
  };
}

const A = '8913027201000024686';
const B = '8944150002000035712';

function loaded(...sims: Sim[]): SimListState {
  return simReducer(initialState, new actions.LoadSimsSuccess({ sims }));
}

describe('loading', () => {
  it('sets loading and clears any previous error', () => {
    const errored = { ...initialState, error: 'boom' };
    const next = simReducer(errored, new actions.LoadSims());

    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('indexes the SIMs by ICCID and keeps their order', () => {
    const state = loaded(sim(A, 'ACTIVE'), sim(B, 'SUSPENDED'));

    expect(state.ids).toEqual([A, B]);
    expect(state.entities[A].state).toBe('ACTIVE');
    expect(state.loading).toBe(false);
  });

  it('records a load failure', () => {
    const next = simReducer(initialState, new actions.LoadSimsFailure({ message: 'Gateway timeout' }));

    expect(next.loading).toBe(false);
    expect(next.error).toBe('Gateway timeout');
  });
});

describe('optimistic commands', () => {
  it('shows a suspension immediately, before the carrier confirms', () => {
    const state = simReducer(
      loaded(sim(A, 'ACTIVE')),
      new actions.SuspendSim({ iccid: A, reason: 'NON_PAYMENT' })
    );

    expect(state.entities[A].state).toBe('SUSPENDED');
    expect(state.entities[A].suspensionReason).toBe('NON_PAYMENT');
    expect(state.pending[A].action).toBe('SUSPEND');
  });

  it('keeps the pre-command SIM so a rollback restores everything', () => {
    const before = sim(A, 'ACTIVE');
    const state = simReducer(loaded(before), new actions.SuspendSim({ iccid: A, reason: 'FRAUD' }));

    expect(state.pending[A].previous).toEqual(before);
  });

  it('shows TERMINATING rather than TERMINATED, because the carrier can still refuse', () => {
    const state = simReducer(loaded(sim(A, 'ACTIVE')), new actions.TerminateSim({ iccid: A }));

    expect(state.entities[A].state).toBe('TERMINATING');
  });

  it('clears the suspension reason on resume', () => {
    const suspended = sim(A, 'SUSPENDED', { suspensionReason: 'NON_PAYMENT' });
    const state = simReducer(loaded(suspended), new actions.ResumeSim({ iccid: A }));

    expect(state.entities[A].state).toBe('ACTIVE');
    expect(state.entities[A].suspensionReason).toBeNull();
  });

  it('ignores a command for a SIM it has never seen instead of crashing', () => {
    const state = loaded(sim(A, 'ACTIVE'));
    const next = simReducer(state, new actions.SuspendSim({ iccid: 'unknown', reason: 'FRAUD' }));

    expect(next).toBe(state);
  });
});

describe('resolving commands', () => {
  it('takes the server version over our optimistic guess', () => {
    const pending = simReducer(
      loaded(sim(A, 'ACTIVE')),
      new actions.TerminateSim({ iccid: A })
    );

    // The carrier confirmed, and released the number while it was at it.
    const confirmed = sim(A, 'TERMINATED', { msisdn: null });
    const state = simReducer(pending, new actions.CommandSuccess({ sim: confirmed }));

    expect(state.entities[A].state).toBe('TERMINATED');
    expect(state.entities[A].msisdn).toBeNull();
    expect(state.pending[A]).toBeUndefined();
  });

  it('rolls back to exactly what was there before on failure', () => {
    const before = sim(A, 'ACTIVE');
    const pending = simReducer(loaded(before), new actions.SuspendSim({ iccid: A, reason: 'NON_PAYMENT' }));

    const state = simReducer(
      pending,
      new actions.CommandFailure({ iccid: A, action: 'SUSPEND', reason: 'Carrier unavailable' })
    );

    expect(state.entities[A]).toEqual(before);
    expect(state.pending[A]).toBeUndefined();
    expect(state.error).toBe('Carrier unavailable');
  });

  it('rolls back the SIM the command was for, not the one on screen', () => {
    // The agent suspends A, then clicks over to B while it is still in
    // flight. The failure must not touch B.
    let state = loaded(sim(A, 'ACTIVE'), sim(B, 'ACTIVE'));
    state = simReducer(state, new actions.SuspendSim({ iccid: A, reason: 'NON_PAYMENT' }));
    state = simReducer(state, new actions.SelectSim({ iccid: B }));

    const after = simReducer(
      state,
      new actions.CommandFailure({ iccid: A, action: 'SUSPEND', reason: 'Carrier unavailable' })
    );

    expect(after.entities[A].state).toBe('ACTIVE');
    expect(after.entities[B].state).toBe('ACTIVE');
    expect(after.selectedIccid).toBe(B);
  });

  it('surfaces a late failure with nothing to roll back, without corrupting data', () => {
    const state = loaded(sim(A, 'ACTIVE'));
    const after = simReducer(
      state,
      new actions.CommandFailure({ iccid: A, action: 'SUSPEND', reason: 'Timed out' })
    );

    expect(after.entities[A].state).toBe('ACTIVE');
    expect(after.error).toBe('Timed out');
  });

  it('dismisses the error banner without touching the SIMs', () => {
    const state = { ...loaded(sim(A, 'ACTIVE')), error: 'Carrier unavailable' };
    const after = simReducer(state, new actions.DismissError());

    expect(after.error).toBeNull();
    expect(after.entities[A].state).toBe('ACTIVE');
  });
});

describe('immutability', () => {
  it('never mutates the state it was handed', () => {
    const state = loaded(sim(A, 'ACTIVE'));
    const snapshot = JSON.stringify(state);

    simReducer(state, new actions.SuspendSim({ iccid: A, reason: 'FRAUD' }));

    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('returns the same reference for an action it does not handle', () => {
    const state = loaded(sim(A, 'ACTIVE'));
    expect(simReducer(state, { type: 'noop' } as any)).toBe(state);
  });
});

describe('search', () => {
  function visible(term: string, ...sims: Sim[]) {
    const state = simReducer(loaded(...sims), new actions.SearchChanged({ term }));
    return selectVisibleSims.projector(
      state.ids.map(id => state.entities[id]),
      state.searchTerm
    );
  }

  it('returns everything for an empty search', () => {
    expect(visible('', sim(A, 'ACTIVE'), sim(B, 'ACTIVE'))).toHaveLength(2);
  });

  it('matches on a partial ICCID', () => {
    const found = visible('4415', sim(A, 'ACTIVE'), sim(B, 'ACTIVE'));

    expect(found).toHaveLength(1);
    expect(found[0].iccid).toBe(B);
  });

  it('matches a phone number the customer read out with spaces', () => {
    const found = visible('416 555 0142', sim(A, 'ACTIVE', { msisdn: '14165550142' }));
    expect(found).toHaveLength(1);
  });

  it('matches a phone number written with dashes', () => {
    const found = visible('555-0142', sim(A, 'ACTIVE', { msisdn: '14165550142' }));
    expect(found).toHaveLength(1);
  });

  it('returns nothing when nothing matches', () => {
    expect(visible('99999', sim(A, 'ACTIVE'))).toHaveLength(0);
  });
});
