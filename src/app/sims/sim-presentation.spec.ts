import { Sim, SimState } from './sim.model';
import {
  labelFor,
  badgeFor,
  isTransitional,
  availableActions,
  explainUnavailable
} from './sim-presentation';
import { Scopes } from '../core/permissions';

function sim(state: SimState, extra: Partial<Sim> = {}): Sim {
  return {
    iccid: '8913027201000024686',
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

const AGENT = [Scopes.READ_SIM, Scopes.ACTIVATE_SIM, Scopes.SUSPEND_SIM, Scopes.TERMINATE_SIM];
const READ_ONLY = [Scopes.READ_SIM];
const RISK = AGENT.concat([Scopes.APPROVE_FRAUD]);

describe('labels and badges', () => {
  it('gives every state a human label', () => {
    const states: SimState[] = ['PRE_ACTIVE', 'ACTIVATING', 'ACTIVE', 'SUSPENDED', 'TERMINATING', 'TERMINATED'];

    states.forEach(s => {
      expect(labelFor(s)).toBeTruthy();
      expect(labelFor(s)).not.toBe(s);
    });
  });

  it('shares one badge style across both transitional states', () => {
    expect(badgeFor('ACTIVATING')).toBe(badgeFor('TERMINATING'));
  });

  it('knows which states are waiting on the carrier', () => {
    expect(isTransitional('ACTIVATING')).toBe(true);
    expect(isTransitional('TERMINATING')).toBe(true);
    expect(isTransitional('ACTIVE')).toBe(false);
    expect(isTransitional('SUSPENDED')).toBe(false);
  });
});

describe('available actions', () => {
  it('offers suspend and terminate on a live line', () => {
    expect(availableActions(sim('ACTIVE'), AGENT).sort()).toEqual(['SUSPEND', 'TERMINATE']);
  });

  it('offers resume on a suspended line', () => {
    const s = sim('SUSPENDED', { suspensionReason: 'NON_PAYMENT' });
    expect(availableActions(s, AGENT).sort()).toEqual(['RESUME', 'TERMINATE']);
  });

  it('offers nothing at all while the carrier has it', () => {
    expect(availableActions(sim('ACTIVATING'), AGENT)).toEqual([]);
    expect(availableActions(sim('TERMINATING'), AGENT)).toEqual([]);
  });

  it('offers nothing on a dead line', () => {
    expect(availableActions(sim('TERMINATED'), AGENT)).toEqual([]);
  });

  it('offers activate and terminate from inventory', () => {
    expect(availableActions(sim('PRE_ACTIVE'), AGENT).sort()).toEqual(['ACTIVATE', 'TERMINATE']);
  });

  it('gives a read-only user no buttons', () => {
    expect(availableActions(sim('ACTIVE'), READ_ONLY)).toEqual([]);
  });

  it('hides resume on a fraud suspension from an ordinary agent', () => {
    const s = sim('SUSPENDED', { suspensionReason: 'FRAUD' });

    expect(availableActions(s, AGENT)).not.toContain('RESUME');
    // Terminate is still on the table - fraud lines still get torn down.
    expect(availableActions(s, AGENT)).toContain('TERMINATE');
  });

  it('shows resume on a fraud suspension to someone who can approve it', () => {
    const s = sim('SUSPENDED', { suspensionReason: 'FRAUD' });
    expect(availableActions(s, RISK)).toContain('RESUME');
  });

  it('lets admin do anything the state allows', () => {
    const s = sim('SUSPENDED', { suspensionReason: 'FRAUD' });
    expect(availableActions(s, [Scopes.ADMIN]).sort()).toEqual(['RESUME', 'TERMINATE']);
  });
});

describe('explaining a missing button', () => {
  it('blames the carrier while a change is in flight', () => {
    expect(explainUnavailable(sim('ACTIVATING'), 'SUSPEND', AGENT))
      .toBe('Waiting for the carrier to confirm the previous change.');
  });

  it('explains the fraud rule rather than saying permission denied', () => {
    const s = sim('SUSPENDED', { suspensionReason: 'FRAUD' });

    expect(explainUnavailable(s, 'RESUME', AGENT))
      .toBe('This line was suspended for fraud and needs an approver to resume.');
  });

  it('says it is the state when the state is the problem', () => {
    expect(explainUnavailable(sim('TERMINATED'), 'SUSPEND', AGENT))
      .toBe('Not available while the SIM is terminated.');
  });

  it('says it is permission when permission is the problem', () => {
    expect(explainUnavailable(sim('ACTIVE'), 'SUSPEND', READ_ONLY))
      .toBe('You do not have permission to do this.');
  });

  it('says nothing when the action is actually available', () => {
    expect(explainUnavailable(sim('ACTIVE'), 'SUSPEND', AGENT)).toBeNull();
  });
});

/**
 * This block is the front end's half of a contract with the platform's state
 * machine. If the backend adds a transition and nobody updates the portal, an
 * agent gets a button that 409s; if the portal adds one the backend does not
 * have, they get a button that does nothing. Encoding the backend's table
 * here means the two cannot drift silently.
 */
describe('agreement with the platform state machine', () => {
  const BACKEND_TRANSITIONS: { [K in SimState]: string[] } = {
    PRE_ACTIVE: ['ACTIVATE', 'TERMINATE'],
    ACTIVATING: [],
    ACTIVE: ['SUSPEND', 'TERMINATE'],
    SUSPENDED: ['RESUME', 'TERMINATE'],
    TERMINATING: [],
    TERMINATED: []
  };

  it('offers exactly what the backend accepts, for a fully privileged user', () => {
    (Object.keys(BACKEND_TRANSITIONS) as SimState[]).forEach(state => {
      const s = sim(state, { suspensionReason: state === 'SUSPENDED' ? 'NON_PAYMENT' : null });
      expect(availableActions(s, [Scopes.ADMIN]).sort()).toEqual(BACKEND_TRANSITIONS[state].sort());
    });
  });
});
