import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// Flag guardada apenas em memória (módulo é singleton durante a vida da SPA):
// nunca usar localStorage/sessionStorage aqui.
let autorizado = false;

export const relatorioGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (autorizado) {
    return true;
  }

  const senha = window.prompt('Digite a senha para acessar o relatório:');

  if (senha === environment.relatorioPassword) {
    autorizado = true;
    return true;
  }

  return router.parseUrl('/');
};
