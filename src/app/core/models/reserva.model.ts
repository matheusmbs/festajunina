export interface ReservaDoParticipante {
  item: string;
  observacao: string | null;
  /** Nomes de todas as pessoas do grupo que assumiu esse item (inclui quem está consultando). */
  participantes: string[];
}
