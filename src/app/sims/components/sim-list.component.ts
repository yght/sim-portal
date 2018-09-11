import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Store, select } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { Sim } from '../sim.model';
import { labelFor, badgeFor, isTransitional } from '../sim-presentation';
import * as actions from '../store/sim.actions';
import { selectVisibleSims, selectLoading, selectPendingIccids } from '../store/sim.selectors';

@Component({
  selector: 'app-sim-list',
  templateUrl: './sim-list.component.html',
  styleUrls: ['./sim-list.component.scss']
})
export class SimListComponent implements OnInit, OnDestroy {
  sims$: Observable<Sim[]>;
  loading$: Observable<boolean>;
  pending$: Observable<string[]>;

  search = new FormControl('');

  private destroyed$ = new Subject<void>();

  labelFor = labelFor;
  badgeFor = badgeFor;
  isTransitional = isTransitional;

  constructor(private store: Store<any>) {}

  ngOnInit(): void {
    this.sims$ = this.store.pipe(select(selectVisibleSims));
    this.loading$ = this.store.pipe(select(selectLoading));
    this.pending$ = this.store.pipe(select(selectPendingIccids));

    // 250ms is the number that stopped support complaining that the list
    // "jumped around" while they typed an ICCID, without feeling laggy.
    // distinctUntilChanged matters as much as the debounce: without it,
    // typing a character and deleting it refilters for no reason.
    this.search.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
      .subscribe(term => this.store.dispatch(new actions.SearchChanged({ term })));

    this.store.dispatch(new actions.LoadSims());
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  onSelect(sim: Sim): void {
    this.store.dispatch(new actions.SelectSim({ iccid: sim.iccid }));
  }

  trackByIccid(_index: number, sim: Sim): string {
    return sim.iccid;
  }
}
