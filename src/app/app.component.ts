import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <main class="layout">
      <app-sim-list class="layout__list"></app-sim-list>
      <app-sim-detail class="layout__detail"></app-sim-detail>
    </main>
  `
})
export class AppComponent {}
