import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReservaComponent } from './reserva.component';

const routes: Routes = [{ path: '', component: ReservaComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class ReservaModule {}
