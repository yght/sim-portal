import { Sim, SimAction, SimState } from './sim.model';
import { Scopes, hasScope } from '../core/permissions';

/**
 * How a SIM state is shown, and what may be done to it.
 *
 * The transitions here deliberately mirror the platform's state machine. If
 * the two ever disagree the portal offers a button that returns 409, so this
 * table is the front end's half of a contract and is tested as such.
 */

const LABELS: { [K in SimState]: string } = {
  PRE_ACTIVE: 'In inventory',
  ACTIVATING: 'Activating',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TERMINATING: 'Terminating',
  TERMINATED: 'Terminated'
};

/**
 * Badge modifiers. The two transitional states share a style on purpose -
 * they mean the same thing to an agent, which is "the carrier has it, wait".
 */
const BADGES: { [K in SimState]: string } = {
  PRE_ACTIVE: 'badge--neutral',
  ACTIVATING: 'badge--pending',
  ACTIVE: 'badge--ok',
  SUSPENDED: 'badge--warn',
  TERMINATING: 'badge--pending',
  TERMINATED: 'badge--dead'
};

const TRANSITIONS: { [K in SimState]: SimAction[] } = {
  PRE_ACTIVE: ['ACTIVATE', 'TERMINATE'],
  ACTIVATING: [],
  ACTIVE: ['SUSPEND', 'TERMINATE'],
  SUSPENDED: ['RESUME', 'TERMINATE'],
  TERMINATING: [],
  TERMINATED: []
};

const REQUIRED_SCOPE: { [K in SimAction]: string } = {
  ACTIVATE: Scopes.ACTIVATE_SIM,
  SUSPEND: Scopes.SUSPEND_SIM,
  RESUME: Scopes.SUSPEND_SIM,
  TERMINATE: Scopes.TERMINATE_SIM
};

export function labelFor(state: SimState): string {
  return LABELS[state] || state;
}

export function badgeFor(state: SimState): string {
  return BADGES[state] || 'badge--neutral';
}

/**
 * Is the SIM waiting on the carrier? Used to show a spinner and to stop an
 * impatient agent firing a second command at a line mid-provision.
 */
export function isTransitional(state: SimState): boolean {
  return state === 'ACTIVATING' || state === 'TERMINATING';
}

/**
 * What this agent may actually do to this SIM.
 *
 * Two filters: what the state machine permits, and what the token permits.
 * The fraud rule is the interesting one - a line suspended for fraud does not
 * come back because somebody clicked Resume. The API requires an approver on
 * that transition, so the portal only offers it to someone who can be one.
 */
export function availableActions(sim: Sim, heldScopes: string[]): SimAction[] {
  const byState = TRANSITIONS[sim.state] || [];

  return byState.filter(action => {
    if (!hasScope(heldScopes, REQUIRED_SCOPE[action])) {
      return false;
    }

    if (action === 'RESUME' && sim.suspensionReason === 'FRAUD') {
      return hasScope(heldScopes, Scopes.APPROVE_FRAUD);
    }

    return true;
  });
}

/**
 * Why an action an agent expected to see is missing. Support asked for this
 * after the third ticket about the Resume button "disappearing".
 */
export function explainUnavailable(sim: Sim, action: SimAction, heldScopes: string[]): string | null {
  if (availableActions(sim, heldScopes).indexOf(action) !== -1) {
    return null;
  }

  if ((TRANSITIONS[sim.state] || []).indexOf(action) === -1) {
    if (isTransitional(sim.state)) {
      return 'Waiting for the carrier to confirm the previous change.';
    }
    return 'Not available while the SIM is ' + labelFor(sim.state).toLowerCase() + '.';
  }

  if (action === 'RESUME' && sim.suspensionReason === 'FRAUD') {
    return 'This line was suspended for fraud and needs an approver to resume.';
  }

  return 'You do not have permission to do this.';
}
