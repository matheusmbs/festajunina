import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

interface ItemDetalhe {
  nome: string;
  observacao: string | null;
}

interface ItemVerificado extends ItemDetalhe {
  participantes: string[];
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
  private readonly router = inject(Router);

  protected readonly itens = signal<Item[]>([]);
  protected readonly todosParticipantes = signal<Participante[]>([]);
  protected readonly participantesDisponiveis = signal<Participante[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly filtroAtivo = signal<string>('todos');

  // Modal "Assumir": um grupo fechado de N pessoas para o item selecionado.
  protected readonly itemSelecionado = signal<Item | null>(null);
  protected readonly mostrarModalReserva = signal(false);
  protected readonly participantesGrupo = signal<(number | null)[]>([]);
  protected readonly confirmando = signal(false);

  protected readonly grupoCompleto = computed(() => this.participantesGrupo().every((id) => id !== null));

  // Modal de sucesso após confirmar a reserva do grupo.
  protected readonly itemConfirmado = signal<ItemDetalhe | null>(null);
  protected readonly mostrarModalSucesso = signal(false);

  // Modal de conflito: outra pessoa assumiu o item enquanto o formulário estava aberto.
  protected readonly mostrarModalItemEsgotado = signal(false);

  // Modal "Já escolhi algo?": consulta pontual, sem gate na tela principal.
  protected readonly mostrarModalVerificar = signal(false);
  protected readonly participanteVerificacaoId = signal<number | null>(null);
  protected readonly itemVerificado = signal<ItemVerificado | null>(null);
  protected readonly jaVerificou = signal(false);
  protected readonly verificando = signal(false);

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

  protected readonly estatisticas = computed(() => {
    const itensLivres = this.itens().length;
    const livres = this.participantesDisponiveis().length;
    const assumidos = this.todosParticipantes().length - livres;
    return { itensLivres, assumidos, livres };
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

  protected rotuloGrupo(quantidadePessoas: number): string {
    return quantidadePessoas === 1 ? '1 pessoa' : `${quantidadePessoas} pessoas`;
  }

  protected irParaRelatorio(): void {
    this.router.navigateByUrl('/relatorio');
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

  // --- Modal "Assumir" (grupo de N pessoas) ---

  protected abrirModalReserva(item: Item): void {
    this.itemSelecionado.set(item);
    this.participantesGrupo.set(new Array(item.quantidade_pessoas).fill(null));
    this.mostrarModalReserva.set(true);
  }

  protected fecharModalReserva(): void {
    this.mostrarModalReserva.set(false);
    this.itemSelecionado.set(null);
    this.participantesGrupo.set([]);
  }

  protected selecionarParticipanteDoGrupo(indice: number, participanteId: number | null): void {
    this.participantesGrupo.update((atual) => {
      const copia = [...atual];
      copia[indice] = participanteId;
      return copia;
    });
  }

  protected opcoesParaSlot(indice: number): Participante[] {
    const escolhidosEmOutrosSlots = new Set(
      this.participantesGrupo()
        .filter((_, i) => i !== indice)
        .filter((id): id is number => id !== null),
    );
    return this.participantesDisponiveis().filter((p) => !escolhidosEmOutrosSlots.has(p.id));
  }

  protected async confirmarReserva(): Promise<void> {
    const item = this.itemSelecionado();
    const participantes = this.participantesGrupo();
    if (!item || !this.grupoCompleto()) {
      return;
    }

    this.confirmando.set(true);
    try {
      await this.supabase.reservar(item.id, participantes as number[]);
      this.itemConfirmado.set({ nome: item.nome, observacao: item.observacao });
      this.mostrarModalSucesso.set(true);
      this.fecharModalReserva();
      await this.carregarDados();
    } catch (erro) {
      const mensagem = this.extrairMensagemErro(erro);
      if (mensagem.includes('esgotado')) {
        this.fecharModalReserva();
        this.mostrarModalItemEsgotado.set(true);
      } else if (mensagem.toLowerCase().includes('ja reservou') || mensagem.toLowerCase().includes('já reservou')) {
        this.toast.erro(mensagem);
        await this.carregarDados();
      } else {
        this.toast.erro('Não foi possível confirmar a reserva. Tente novamente.');
        await this.carregarDados();
      }
    } finally {
      this.confirmando.set(false);
    }
  }

  protected fecharModalSucesso(): void {
    this.mostrarModalSucesso.set(false);
    this.itemConfirmado.set(null);
  }

  protected async fecharModalItemEsgotado(): Promise<void> {
    this.mostrarModalItemEsgotado.set(false);
    await this.carregarDados();
  }

  // O erro do Supabase (PostgrestError) é um objeto plano com `.message`,
  // não uma instância de Error — por isso não dá pra usar só `instanceof Error`.
  private extrairMensagemErro(erro: unknown): string {
    if (erro instanceof Error) {
      return erro.message;
    }
    if (typeof erro === 'object' && erro !== null && 'message' in erro) {
      return String((erro as { message: unknown }).message);
    }
    return '';
  }

  // --- Modal "Já escolhi algo?" ---

  protected abrirModalVerificar(): void {
    this.mostrarModalVerificar.set(true);
  }

  protected fecharModalVerificar(): void {
    this.mostrarModalVerificar.set(false);
    this.participanteVerificacaoId.set(null);
    this.itemVerificado.set(null);
    this.jaVerificou.set(false);
  }

  protected async onSelecionarParticipanteVerificacao(participanteId: number | null): Promise<void> {
    this.participanteVerificacaoId.set(participanteId);
    this.itemVerificado.set(null);
    this.jaVerificou.set(false);

    if (participanteId === null) {
      return;
    }

    this.verificando.set(true);
    try {
      const reserva = await this.supabase.reservaDoParticipante(participanteId);
      this.itemVerificado.set(
        reserva
          ? { nome: reserva.item, observacao: reserva.observacao, participantes: reserva.participantes }
          : null,
      );
      this.jaVerificou.set(true);
    } catch {
      this.toast.erro('Não foi possível verificar sua reserva. Tente novamente.');
    } finally {
      this.verificando.set(false);
    }
  }
}
