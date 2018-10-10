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
 *
 * The platform sends a canonical failure reason; use it when it is there.
 * "Request failed with status code 503" helps nobody standing on a phone
 * call with a customer.
 */
function describe(err: any): string {
  const reason = err && err.error && err.error.reason;

  const FRIENDLY: { [k: string]: string } = {
    CARRIER_UNAVAILABLE: 'The carrier is not responding. This will retry automatically.',
    RATE_LIMITED: 'The carrier is rate limiting us. This will retry automatically.',
    SIM_NOT_FOUND: 'The carrier does not have a record of this SIM.',
    SIM_ALREADY_ACTIVE: 'The carrier already has this SIM active.',
    INVALID_RATE_PLAN: 'That rate plan is not valid for this carrier.',
    NO_NUMBERS_AVAILABLE: 'The carrier has no numbers left in this range.',
    ACCOUNT_DELINQUENT: 'The account is past due and the carrier has blocked changes.',
    INSUFFICIENT_SCOPE: 'You do not have permission to do this.'
  };

  if (reason && FRIENDLY[reason]) {
    return FRIENDLY[reason];
  }

  if (err && err.status === 0) {
    return 'Could not reach the platform. Check your connection.';
  }

  return 'Something went wrong. The platform team has been notified.';
}
