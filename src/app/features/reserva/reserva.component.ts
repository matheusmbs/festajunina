import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Item } from '../../core/models/item.model';
import { Participante } from '../../core/models/participante.model';
import { SupabaseService } from '../../core/services/supabase.service';
import { BadgeStatusComponent } from '../../shared/components/badge-status/badge-status.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { emojiDaCategoria, rotuloCategoria } from '../../shared/utils/categoria.util';

interface FiltroCategoria {
  chave: string;
  rotulo: string;
  emoji: string;
}

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [FormsModule, ModalComponent, LoadingComponent, BadgeStatusComponent],
  templateUrl: './reserva.component.html',
  styleUrl: './reserva.component.scss',
})
export class ReservaComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  protected readonly itens = signal<Item[]>([]);
  protected readonly todosParticipantes = signal<Participante[]>([]);
  protected readonly participantesDisponiveis = signal<Participante[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly participanteSelecionadoId = signal<number | null>(null);
  protected readonly itemJaReservado = signal<string | null>(null);
  protected readonly mostrarModalJaEscolheu = signal(false);

  protected readonly filtroAtivo = signal<string>('todos');

  protected readonly itemSelecionado = signal<Item | null>(null);
  protected readonly participanteParaReserva = signal<number | null>(null);
  protected readonly mostrarModalReserva = signal(false);
  protected readonly confirmando = signal(false);

  protected readonly itemConfirmado = signal<{ nome: string; observacao: string | null } | null>(null);
  protected readonly mostrarModalSucesso = signal(false);

  // As categorias não são fixas: vêm do valor livre de `itens.categoria` no banco.
  protected readonly categorias = computed(() => {
    const presentes = new Set(this.itens().map((item) => item.categoria));
    return Array.from(presentes).sort((a, b) => a.localeCompare(b));
  });

  protected readonly filtros = computed<FiltroCategoria[]>(() => [
    { chave: 'todos', rotulo: 'Todos', emoji: '🎉' },
    ...this.categorias().map((categoria) => ({
      chave: categoria,
      rotulo: rotuloCategoria(categoria),
      emoji: emojiDaCategoria(categoria),
    })),
  ]);

  protected readonly jaReservou = computed(
    () => this.participanteSelecionadoId() !== null && this.itemJaReservado() !== null,
  );

  protected readonly itemJaReservadoDetalhe = computed(() => {
    const nome = this.itemJaReservado();
    if (!nome) {
      return null;
    }
    const item = this.itens().find((i) => i.nome === nome);
    return { nome, observacao: item?.observacao ?? null };
  });

  protected readonly estatisticas = computed(() => {
    const vagasTotais = this.itens().reduce((soma, item) => soma + item.estoque, 0);
    const livres = this.participantesDisponiveis().length;
    const assumidos = this.todosParticipantes().length - livres;
    return { vagasTotais, assumidos, livres };
  });

  protected readonly itensFiltrados = computed(() => {
    const filtro = this.filtroAtivo();
    return filtro === 'todos' ? this.itens() : this.itens().filter((item) => item.categoria === filtro);
  });

  protected readonly categoriasComItens = computed(() => {
    const presentes = new Set(this.itensFiltrados().map((item) => item.categoria));
    return this.categorias().filter((categoria) => presentes.has(categoria));
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  protected itensDaCategoria(categoria: string): Item[] {
    return this.itensFiltrados().filter((item) => item.categoria === categoria);
  }

  protected tituloSecao(categoria: string): string {
    return `${emojiDaCategoria(categoria)} ${rotuloCategoria(categoria)}`;
  }

  protected emojiCategoria(categoria: string): string {
    return emojiDaCategoria(categoria);
  }

  protected rotuloEstoque(estoque: number): string {
    return estoque === 1 ? 'Falta 1' : `Faltam ${estoque}`;
  }

  protected async carregarDados(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const [itens, todosParticipantes, participantesDisponiveis] = await Promise.all([
        this.supabase.listarItensDisponiveis(),
        this.supabase.listarTodosParticipantes(),
        this.supabase.listarParticipantesDisponiveis(),
      ]);
      this.itens.set(itens);
      this.todosParticipantes.set(todosParticipantes);
      this.participantesDisponiveis.set(participantesDisponiveis);
    } catch {
      this.erro.set('Não foi possível carregar os dados da festa. Verifique sua conexão e tente novamente.');
    } finally {
      this.carregando.set(false);
    }
  }

  protected async onSelecionarParticipante(participanteId: number | null): Promise<void> {
    this.participanteSelecionadoId.set(participanteId);
    this.itemJaReservado.set(null);

    if (participanteId === null) {
      return;
    }

    try {
      const reserva = await this.supabase.reservaDoParticipante(participanteId);
      if (reserva) {
        this.itemJaReservado.set(reserva.item);
        this.mostrarModalJaEscolheu.set(true);
      }
    } catch {
      this.toast.erro('Não foi possível verificar sua reserva. Tente novamente.');
    }
  }

  protected fecharModalJaEscolheu(): void {
    this.mostrarModalJaEscolheu.set(false);
  }

  protected abrirModalReserva(item: Item): void {
    if (this.jaReservou()) {
      return;
    }
    this.itemSelecionado.set(item);
    this.participanteParaReserva.set(this.participanteSelecionadoId());
    this.mostrarModalReserva.set(true);
  }

  protected fecharModalReserva(): void {
    this.mostrarModalReserva.set(false);
    this.itemSelecionado.set(null);
  }

  protected fecharModalSucesso(): void {
    this.mostrarModalSucesso.set(false);
    this.itemConfirmado.set(null);
  }

  protected async confirmarReserva(): Promise<void> {
    const item = this.itemSelecionado();
    const participanteId = this.participanteParaReserva();
    if (!item || !participanteId) {
      return;
    }

    this.confirmando.set(true);
    try {
      await this.supabase.reservar(item.id, participanteId);
      if (participanteId === this.participanteSelecionadoId()) {
        this.itemJaReservado.set(item.nome);
      }
      this.itemConfirmado.set({ nome: item.nome, observacao: item.observacao });
      this.mostrarModalSucesso.set(true);
      this.fecharModalReserva();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : '';
      if (mensagem.includes('esgotado')) {
        this.toast.erro('😅 Este item acabou de ser reservado por outra pessoa! Escolha outro.');
      } else if (mensagem.toLowerCase().includes('ja reservou') || mensagem.toLowerCase().includes('já reservou')) {
        this.toast.erro(mensagem);
      } else {
        this.toast.erro('Não foi possível confirmar a reserva. Tente novamente.');
      }
    } finally {
      this.confirmando.set(false);
      await this.carregarDados();
    }
  }
}
