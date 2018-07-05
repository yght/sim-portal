import { Sim, SimState } from './sim.model';
import { labelFor, badgeFor, isTransitional } from './sim-presentation';

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
