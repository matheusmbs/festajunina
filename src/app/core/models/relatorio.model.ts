export interface RelatorioPorParticipante {
  participante: string;
  item: string | null;
}

export interface RelatorioPorItem {
  item: string;
  categoria: string;
  participante: string | null;
}
