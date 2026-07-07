const EMOJI_POR_PALAVRA_CHAVE: [string, string][] = [
  ['salg', '🌭'],
  ['sobremesa', '🍰'],
  ['doc', '🍬'],
  ['beb', '🍷'],
  ['apoio', '📦'],
  ['prato', '🍽️'],
  ['milho', '🌽'],
  ['petisco', '🥜'],
  ['bolo', '🎂'],
];

export function emojiDaCategoria(categoria: string): string {
  const chave = categoria.toLowerCase();
  return EMOJI_POR_PALAVRA_CHAVE.find(([palavra]) => chave.includes(palavra))?.[1] ?? '🎪';
}

export function rotuloCategoria(categoria: string): string {
  return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}
