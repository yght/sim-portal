/**
 * The SIM as the portal sees it.
 *
 * These states are the canonical ones defined by the platform's state
 * machine (see the sim-platform repository, simLifecycle.js). The portal
 * deliberately does not invent its own vocabulary - if a support agent and a
 * backend engineer are looking at the same SIM they should be using the same
 * word for what it is doing.
 */
export type SimState =
  | 'PRE_ACTIVE'
  | 'ACTIVATING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TERMINATING'
  | 'TERMINATED';

export type Carrier = 'bell' | 'vodafone' | 'att';

export type SuspensionReason =
  | 'NON_PAYMENT'
  | 'FRAUD'
  | 'CUSTOMER_REQUEST'
  | 'LOST_OR_STOLEN';

export interface Sim {
  iccid: string;
  carrier: Carrier;
  state: SimState;
  msisdn: string | null;
  ratePlanId: string | null;
  suspensionReason: SuspensionReason | null;
  orgId: string;
  updatedAt: string;
}

/**
 * The actions a support agent can take on a SIM. These mirror the events the
 * state machine accepts; the portal's job is to only offer the ones that will
 * actually be accepted, rather than letting an agent click something that
 * comes back 409.
 */
export type SimAction = 'ACTIVATE' | 'SUSPEND' | 'RESUME' | 'TERMINATE';
