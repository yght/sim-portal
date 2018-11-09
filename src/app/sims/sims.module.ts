import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { SimListComponent } from './components/sim-list.component';
import { SimDetailComponent } from './components/sim-detail.component';
import { simReducer } from './store/sim.reducer';
import { SimEffects } from './store/sim.effects';

@NgModule({
  declarations: [SimListComponent, SimDetailComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StoreModule.forFeature('sims', simReducer),
    EffectsModule.forFeature([SimEffects])
  ],
  exports: [SimListComponent, SimDetailComponent]
})
export class SimsModule {}
