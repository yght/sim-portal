import { Sim } from '../sim.model';
import { SimActionsUnion, SimActionTypes } from './sim.actions';

export interface SimListState {
  entities: { [iccid: string]: Sim };
  ids: string[];
  loading: boolean;
  searchTerm: string;
  selectedIccid: string | null;
  error: string | null;
}

export const initialState: SimListState = {
  entities: {},
  ids: [],
  loading: false,
  searchTerm: '',
  selectedIccid: null,
  error: null
};

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
        ids.push(sim.iccid);
      });

      return { ...state, entities, ids, loading: false, error: null };
    }

    case SimActionTypes.LoadSimsFailure:
      return { ...state, loading: false, error: action.payload.message };

    case SimActionTypes.SearchChanged:
      return { ...state, searchTerm: action.payload.term };

    case SimActionTypes.SelectSim:
      return { ...state, selectedIccid: action.payload.iccid };

    case SimActionTypes.DismissError:
      return { ...state, error: null };

    default:
      return state;
  }
}
