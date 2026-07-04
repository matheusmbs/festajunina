import { Routes } from '@angular/router';
import { relatorioGuard } from './features/relatorio/relatorio-guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/reserva/reserva.module').then((m) => m.ReservaModule),
  },
  {
    path: 'relatorio',
    canActivate: [relatorioGuard],
    loadChildren: () => import('./features/relatorio/relatorio.module').then((m) => m.RelatorioModule),
  },
];
