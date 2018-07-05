import { SimState } from './sim.model';

/**
 * How a SIM state is shown, and what may be done to it.
 *
 * Labels and badges only for now; which actions are offered comes next.
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
