import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tipo: 'sucesso' | 'erro';
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly proximoId = signal(0);
  readonly toasts = signal<Toast[]>([]);

  sucesso(mensagem: string): void {
    this.adicionar('sucesso', mensagem);
  }

  erro(mensagem: string): void {
    this.adicionar('erro', mensagem);
  }

  remover(id: number): void {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private adicionar(tipo: Toast['tipo'], mensagem: string): void {
    const id = this.proximoId() + 1;
    this.proximoId.set(id);
    this.toasts.update((lista) => [...lista, { id, tipo, mensagem }]);
    setTimeout(() => this.remover(id), 4000);
  }
}
