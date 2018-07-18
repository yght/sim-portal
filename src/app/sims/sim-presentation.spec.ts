import { Sim, SimState } from './sim.model';
import { labelFor, badgeFor, isTransitional, availableActions } from './sim-presentation';
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
