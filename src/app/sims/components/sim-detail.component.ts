import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { Sim, SimAction, SuspensionReason } from '../sim.model';
import { availableActions, explainUnavailable, labelFor } from '../sim-presentation';
import { AuthService } from '../../core/auth.service';
import * as actions from '../store/sim.actions';
import { selectSelectedSim, selectError } from '../store/sim.selectors';

@Component({
  selector: 'app-sim-detail',
  templateUrl: './sim-detail.component.html'
})
export class SimDetailComponent implements OnInit {
  sim$: Observable<Sim | null>;
  error$: Observable<string | null>;
  actions$: Observable<SimAction[]>;

  labelFor = labelFor;

  constructor(private store: Store<any>, private auth: AuthService) {}

  ngOnInit(): void {
    this.sim$ = this.store.pipe(select(selectSelectedSim));
    this.error$ = this.store.pipe(select(selectError));

    this.actions$ = combineLatest(this.sim$, this.auth.scopes$()).pipe(
      map(([sim, scopes]) => (sim ? availableActions(sim, scopes) : []))
    );
  }

  /**
   * Shown as a tooltip on the disabled button, so an agent gets a reason
   * rather than a greyed-out control with no explanation.
   */
  why(sim: Sim, action: SimAction): string | null {
    return explainUnavailable(sim, action, this.auth.scopes());
  }

  suspend(sim: Sim, reason: SuspensionReason): void {
    this.store.dispatch(new actions.SuspendSim({ iccid: sim.iccid, reason }));
  }

  resume(sim: Sim): void {
    this.store.dispatch(new actions.ResumeSim({ iccid: sim.iccid }));
  }

  terminate(sim: Sim): void {
    this.store.dispatch(new actions.TerminateSim({ iccid: sim.iccid }));
  }

  dismiss(): void {
    this.store.dispatch(new actions.DismissError());
  }
}
