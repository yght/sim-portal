import { Action } from '@ngrx/store';
import { Sim, SimAction, SuspensionReason } from '../sim.model';

export enum SimActionTypes {
  LoadSims = '[SIM List] Load SIMs',
  LoadSimsSuccess = '[SIM API] Load SIMs Success',
  LoadSimsFailure = '[SIM API] Load SIMs Failure',

  SearchChanged = '[SIM List] Search Changed',
  SelectSim = '[SIM List] Select SIM',

  SuspendSim = '[SIM Detail] Suspend SIM',
  ResumeSim = '[SIM Detail] Resume SIM',
  TerminateSim = '[SIM Detail] Terminate SIM',

  CommandSuccess = '[SIM API] Command Success',
  CommandFailure = '[SIM API] Command Failure',

  DismissError = '[SIM Detail] Dismiss Error'
}

export class LoadSims implements Action {
  readonly type = SimActionTypes.LoadSims;
}

export class LoadSimsSuccess implements Action {
  readonly type = SimActionTypes.LoadSimsSuccess;
  constructor(public payload: { sims: Sim[] }) {}
}

export class LoadSimsFailure implements Action {
  readonly type = SimActionTypes.LoadSimsFailure;
  constructor(public payload: { message: string }) {}
}

export class SearchChanged implements Action {
  readonly type = SimActionTypes.SearchChanged;
  constructor(public payload: { term: string }) {}
}

export class SelectSim implements Action {
  readonly type = SimActionTypes.SelectSim;
  constructor(public payload: { iccid: string }) {}
}

export class SuspendSim implements Action {
  readonly type = SimActionTypes.SuspendSim;
  constructor(public payload: { iccid: string; reason: SuspensionReason }) {}
}

export class ResumeSim implements Action {
  readonly type = SimActionTypes.ResumeSim;
  constructor(public payload: { iccid: string }) {}
}

export class TerminateSim implements Action {
  readonly type = SimActionTypes.TerminateSim;
  constructor(public payload: { iccid: string }) {}
}

export class CommandSuccess implements Action {
  readonly type = SimActionTypes.CommandSuccess;
  constructor(public payload: { sim: Sim }) {}
}

/**
 * The failure carries the ICCID as well as the reason, because by the time it
 * comes back the agent may well have navigated to a different SIM. Rolling
 * back whatever happens to be selected is how you corrupt the wrong record.
 */
export class CommandFailure implements Action {
  readonly type = SimActionTypes.CommandFailure;
  constructor(
    public payload: { iccid: string; action: SimAction; reason: string }
  ) {}
}

export class DismissError implements Action {
  readonly type = SimActionTypes.DismissError;
}

export type SimActionsUnion =
  | LoadSims
  | LoadSimsSuccess
  | LoadSimsFailure
  | SearchChanged
  | SelectSim
  | SuspendSim
  | ResumeSim
  | TerminateSim
  | CommandSuccess
  | CommandFailure
  | DismissError;
