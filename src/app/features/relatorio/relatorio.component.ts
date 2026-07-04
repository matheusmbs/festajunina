import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RelatorioPorItem, RelatorioPorParticipante } from '../../core/models/relatorio.model';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { emojiDaCategoria, rotuloCategoria } from '../../shared/utils/categoria.util';

interface GrupoPorItem {
  item: string;
  participantes: string[];
}

interface SecaoPorCategoria {
  categoria: string;
  titulo: string;
  itens: GrupoPorItem[];
}

type Aba = 'participante' | 'item';

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [LoadingComponent],
  templateUrl: './relatorio.component.html',
  styleUrl: './relatorio.component.scss',
})
export class RelatorioComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly abaAtiva = signal<Aba>('participante');

  protected readonly porParticipante = signal<RelatorioPorParticipante[]>([]);
  protected readonly porItem = signal<RelatorioPorItem[]>([]);

  // A função RPC já retorna as linhas ordenadas por categoria e item, então
  // basta agrupar preservando a ordem de chegada (sem reordenar aqui).
  protected readonly secoesPorCategoria = computed<SecaoPorCategoria[]>(() => {
    const secoes = new Map<string, Map<string, GrupoPorItem>>();
    for (const linha of this.porItem()) {
      const itensDaSecao = secoes.get(linha.categoria) ?? new Map<string, GrupoPorItem>();
      const grupo = itensDaSecao.get(linha.item) ?? { item: linha.item, participantes: [] };
      if (linha.participante) {
        grupo.participantes.push(linha.participante);
      }
      itensDaSecao.set(linha.item, grupo);
      secoes.set(linha.categoria, itensDaSecao);
    }
    return Array.from(secoes.entries()).map(([categoria, itensDaSecao]) => ({
      categoria,
      titulo: `${emojiDaCategoria(categoria)} ${rotuloCategoria(categoria)}`,
      itens: Array.from(itensDaSecao.values()),
    }));
  });

  ngOnInit(): void {
    this.carregarRelatorios();
  }

  protected async carregarRelatorios(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const [porParticipante, porItem] = await Promise.all([
        this.supabase.relatorioPorParticipante(),
        this.supabase.relatorioPorItem(),
      ]);
      this.porParticipante.set(porParticipante);
      this.porItem.set(porItem);
    } catch {
      this.erro.set('Não foi possível carregar o relatório. Tente novamente.');
    } finally {
      this.carregando.set(false);
    }
  }

  protected voltar(): void {
    this.router.navigateByUrl('/');
  }

  protected exportarCsv(): void {
    this.baixarCsv('relatorio_por_participante.csv', [
      ['Participante', 'Item'],
      ...this.porParticipante().map((linha) => [linha.participante, linha.item ?? '']),
    ]);
    this.baixarCsv('relatorio_por_item.csv', [
      ['Item', 'Categoria', 'Participante'],
      ...this.porItem().map((linha) => [linha.item, linha.categoria, linha.participante ?? '']),
    ]);
  }

  private baixarCsv(nomeArquivo: string, linhas: string[][]): void {
    const conteudo = linhas
      .map((linha) => linha.map((campo) => `"${campo.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }
}
