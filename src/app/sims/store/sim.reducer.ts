import { Sim, SimAction, SimState } from '../sim.model';
import { SimActionsUnion, SimActionTypes } from './sim.actions';

export interface PendingCommand {
  action: SimAction;
  /**
   * The SIM exactly as it was before we optimistically changed it. Keeping
   * the whole record rather than just the previous state means a rollback
   * restores the suspension reason and the timestamps too.
   */
  previous: Sim;
}

export interface SimListState {
  entities: { [iccid: string]: Sim };
  ids: string[];
  loading: boolean;
  searchTerm: string;
  selectedIccid: string | null;
  pending: { [iccid: string]: PendingCommand };
  error: string | null;
}

export const initialState: SimListState = {
  entities: {},
  ids: [],
  loading: false,
  searchTerm: '',
  selectedIccid: null,
  pending: {},
  error: null
};

/**
 * What we optimistically show while the carrier call is in flight.
 *
 * Note that TERMINATE goes to TERMINATING and not TERMINATED. The carrier has
 * to confirm before the line is really gone, and showing an agent that a SIM
 * is dead when the teardown might still fail is worse than showing them that
 * it is on its way out.
 */
function optimisticState(action: SimAction): SimState {
  switch (action) {
    case 'ACTIVATE':
      return 'ACTIVATING';
    case 'SUSPEND':
      return 'SUSPENDED';
    case 'RESUME':
      return 'ACTIVE';
    case 'TERMINATE':
      return 'TERMINATING';
  }
}

function applyOptimistic(
  state: SimListState,
  iccid: string,
  action: SimAction,
  patch: Partial<Sim>
): SimListState {
  const current = state.entities[iccid];

  // A command against a SIM we have never loaded is a bug upstream, but it
  // must not take the store down with it.
  if (!current) {
    return state;
  }

  return {
    ...state,
    entities: {
      ...state.entities,
      [iccid]: { ...current, state: optimisticState(action), ...patch }
    },
    pending: {
      ...state.pending,
      [iccid]: { action, previous: current }
    },
    error: null
  };
}

function withoutKey<T>(map: { [k: string]: T }, key: string): { [k: string]: T } {
  const next = { ...map };
  delete next[key];
  return next;
}

export function simReducer(
  state: SimListState = initialState,
  action: SimActionsUnion
): SimListState {
  switch (action.type) {
    case SimActionTypes.LoadSims:
      return { ...state, loading: true, error: null };

    case SimActionTypes.LoadSimsSuccess: {
      const entities: { [iccid: string]: Sim } = {};
      const ids: string[] = [];

      action.payload.sims.forEach(sim => {
        entities[sim.iccid] = sim;
        if (ids.indexOf(sim.iccid) === -1) ids.push(sim.iccid);
      });

      // A list refresh is not a command acknowledgement. Retain in-flight
      // rows even when the response omits them, until success or rollback.
      Object.keys(state.pending).forEach(iccid => {
        if (state.entities[iccid]) {
          entities[iccid] = state.entities[iccid];
          if (ids.indexOf(iccid) === -1) ids.push(iccid);
        }
      });

      return { ...state, entities, ids, loading: false, error: null };
    }

    case SimActionTypes.LoadSimsFailure:
      return { ...state, loading: false, error: action.payload.message };

    case SimActionTypes.SearchChanged:
      return { ...state, searchTerm: action.payload.term };

    case SimActionTypes.SelectSim:
      return { ...state, selectedIccid: action.payload.iccid };

    case SimActionTypes.SuspendSim:
      return applyOptimistic(state, action.payload.iccid, 'SUSPEND', {
        suspensionReason: action.payload.reason
      });

    case SimActionTypes.ResumeSim:
      return applyOptimistic(state, action.payload.iccid, 'RESUME', {
        suspensionReason: null
      });

    case SimActionTypes.TerminateSim:
      return applyOptimistic(state, action.payload.iccid, 'TERMINATE', {});

    case SimActionTypes.CommandSuccess: {
      const sim = action.payload.sim;

      // The server's version wins. Our optimistic guess was a guess; the
      // carrier may have handed back an MSISDN or a state we did not predict.
      return {
        ...state,
        entities: { ...state.entities, [sim.iccid]: sim },
        pending: withoutKey(state.pending, sim.iccid),
        error: null
      };
    }

    case SimActionTypes.CommandFailure: {
      const { iccid, reason } = action.payload;
      const inFlight = state.pending[iccid];

      // No pending record means nothing to roll back - most likely a late
      // failure for a command we already resolved. Surface the message but
      // leave the data alone.
      if (!inFlight) {
        return { ...state, error: reason };
      }

      return {
        ...state,
        entities: { ...state.entities, [iccid]: inFlight.previous },
        pending: withoutKey(state.pending, iccid),
        error: reason
      };
    }

    case SimActionTypes.DismissError:
      return { ...state, error: null };

    default:
      return state;
  }
}
