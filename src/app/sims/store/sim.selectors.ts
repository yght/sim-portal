import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SimListState } from './sim.reducer';
import { Sim } from '../sim.model';

export const selectSimState = createFeatureSelector<SimListState>('sims');

export const selectAllSims = createSelector(
  selectSimState,
  state => state.ids.map(id => state.entities[id])
);

export const selectSearchTerm = createSelector(
  selectSimState,
  state => state.searchTerm
);

export const selectLoading = createSelector(selectSimState, state => state.loading);
export const selectError = createSelector(selectSimState, state => state.error);

/**
 * Filter by ICCID or MSISDN.
 *
 * Support search by whatever the customer read out over the phone, which is
 * usually the phone number and occasionally the long number on the SIM pack.
 * We strip formatting from both sides so that "416 555 0142" matches.
 */
export const selectVisibleSims = createSelector(
  selectAllSims,
  selectSearchTerm,
  (sims: Sim[], term: string) => {
    const needle = (term || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();

    if (needle.length === 0) {
      return sims;
    }

    return sims.filter(sim => {
      const iccid = sim.iccid.toLowerCase();
      const msisdn = (sim.msisdn || '').toLowerCase();
      return iccid.indexOf(needle) !== -1 || msisdn.indexOf(needle) !== -1;
    });
  }
);

export const selectSelectedSim = createSelector(
  selectSimState,
  state => (state.selectedIccid ? state.entities[state.selectedIccid] || null : null)
);
