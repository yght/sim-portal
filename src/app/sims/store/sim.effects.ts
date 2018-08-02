import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';

import { SimService } from '../services/sim.service';
import { AuthService } from '../../core/auth.service';
import * as actions from './sim.actions';
import { SimActionTypes } from './sim.actions';

@Injectable()
export class SimEffects {
  constructor(
    private actions$: Actions,
    private sims: SimService,
    private auth: AuthService
  ) {}

  @Effect()
  loadSims$ = this.actions$.pipe(
    ofType<actions.LoadSims>(SimActionTypes.LoadSims),
    switchMap(() =>
      this.sims.list(this.auth.orgId()).pipe(
        map(sims => new actions.LoadSimsSuccess({ sims })),
        catchError(err => of(new actions.LoadSimsFailure({ message: describe(err) })))
      )
    )
  );

  /**
   * mergeMap and not switchMap: an agent working a queue may fire commands at
   * several SIMs in quick succession, and switchMap would silently cancel all
   * but the last. Cancelling a suspend that has already reached the carrier
   * leaves the store rolled back and the line actually suspended.
   */
  @Effect()
  suspend$ = this.actions$.pipe(
    ofType<actions.SuspendSim>(SimActionTypes.SuspendSim),
    mergeMap(action =>
      this.sims.suspend(action.payload.iccid, action.payload.reason).pipe(
        map(sim => new actions.CommandSuccess({ sim })),
        catchError(err =>
          of(
            new actions.CommandFailure({
              iccid: action.payload.iccid,
              action: 'SUSPEND',
              reason: describe(err)
            })
          )
        )
      )
    )
  );

  @Effect()
  resume$ = this.actions$.pipe(
    ofType<actions.ResumeSim>(SimActionTypes.ResumeSim),
    mergeMap(action =>
      this.sims.resume(action.payload.iccid).pipe(
        map(sim => new actions.CommandSuccess({ sim })),
        catchError(err =>
          of(
            new actions.CommandFailure({
              iccid: action.payload.iccid,
              action: 'RESUME',
              reason: describe(err)
            })
          )
        )
      )
    )
  );

  @Effect()
  terminate$ = this.actions$.pipe(
    ofType<actions.TerminateSim>(SimActionTypes.TerminateSim),
    mergeMap(action =>
      this.sims.terminate(action.payload.iccid).pipe(
        map(sim => new actions.CommandSuccess({ sim })),
        catchError(err =>
          of(
            new actions.CommandFailure({
              iccid: action.payload.iccid,
              action: 'TERMINATE',
              reason: describe(err)
            })
          )
        )
      )
    )
  );
}

/**
 * Turn an API error into something worth showing an agent.
 */
function describe(err: any): string {
  if (err && err.status === 0) {
    return 'Could not reach the platform. Check your connection.';
  }

  return 'Something went wrong. Please try again.';
}
