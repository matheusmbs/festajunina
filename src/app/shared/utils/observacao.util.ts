export interface ObservacaoFormatada {
  quantidade: string | null;
  descricao: string;
}

/** `observacao` é salva como "{quantidade} | {descrição}"; itens antigos sem separador caem tudo em `descricao`. */
export function formatarObservacao(observacao: string): ObservacaoFormatada {
  const separadorIndex = observacao.indexOf(' | ');
  if (separadorIndex === -1) {
    return { quantidade: null, descricao: observacao };
  }
  return {
    quantidade: observacao.slice(0, separadorIndex),
    descricao: observacao.slice(separadorIndex + 3),
  };
}
