export interface Item {
  id: number;
  nome: string;
  categoria: string;
  /** Quantas pessoas precisam assumir esse item juntas (grupo fechado, tudo ou nada). */
  quantidade_pessoas: number;
  observacao: string | null;
}
