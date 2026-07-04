# O Que Vou Levar pro Arraiá?

App Angular (standalone components, lazy loading por feature) para organizar a divisão de pratos e bebidas de uma Festa Junina. Não tem backend próprio: fala direto com o Supabase via `supabase.rpc(...)`, usando apenas a chave **publicável**.

## Rodando localmente

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`.

## Configuração do Supabase

Edite `src/environments/environment.ts` (e `environment.prod.ts`) com sua URL e chave publicável do projeto Supabase:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
  relatorioPassword: 'troque-esta-senha',
};
```

**Nunca** use a chave secreta (`sb_secret_...`) no frontend — ela ignora o RLS e é exclusiva de backend.

### Funções RPC necessárias

O app chama as seguintes funções via `supabase.rpc(...)` (ver [`supabase.service.ts`](src/app/core/services/supabase.service.ts)):

| Função | Parâmetros | Retorno |
|---|---|---|
| `listar_itens_disponiveis()` | — | `{ id, nome, categoria, estoque, observacao }[]` |
| `listar_participantes_disponiveis()` | — | `{ id, nome }[]` (quem ainda não reservou) |
| `listar_todos_participantes()` | — | `{ id, nome }[]` (todos) |
| `reservar(p_item, p_participante)` | bigint, bigint | bigint (id da reserva) |
| `reserva_do_participante(p_participante)` | bigint | `{ item }` ou vazio |
| `relatorio_por_participante()` | — | `{ participante, item }[]` |
| `relatorio_por_item()` | — | `{ item, categoria, participante }[]` |

O SQL de `listar_todos_participantes`, `reserva_do_participante`, `relatorio_por_participante` e `relatorio_por_item` está comentado no topo de `supabase.service.ts`, pronto para rodar no SQL Editor do Supabase.

`listar_itens_disponiveis`, `listar_participantes_disponiveis` e `reservar` dependem do seu schema de `itens`/`participantes`/`reservas` (estoque disponível, chave única por participante etc.) e devem ser criadas de acordo com ele. A função `reservar` deve levantar uma exceção com a mensagem `Item esgotado` quando o estoque tiver acabado, e `Este participante ja reservou um item` quando o participante já tiver uma reserva — o app trata essas duas mensagens especificamente para exibir o aviso correto.

`item.categoria` é texto livre — o app não assume valores fixos. Os botões de filtro, os títulos de seção e o emoji de cada item são gerados dinamicamente a partir dos valores distintos encontrados em `listar_itens_disponiveis()` (ver [`categoria.util.ts`](src/app/shared/utils/categoria.util.ts)). O emoji é escolhido por palavra-chave (`salg`, `doc`/`sobremesa`, `beb`, `apoio`, `prato`), com 🎪 como fallback para categorias não reconhecidas.

## Relatório protegido por senha

A rota `/relatorio` pede a senha definida em `relatorioPassword` (ver [`relatorio-guard.ts`](src/app/features/relatorio/relatorio-guard.ts)). A autorização fica apenas em memória (nada de `localStorage`), então é perdida a cada recarregamento de página.

**Importante sobre segurança:** como o app não tem backend, `relatorio_por_participante()` e `relatorio_por_item()` precisam ser `security definer` liberadas para `anon` (assim como as demais funções). Isso significa que a senha do `/relatorio` é apenas uma barreira na SPA — qualquer pessoa com a chave publicável (que já é pública no bundle JS) tecnicamente poderia chamar essas duas funções direto. Se isso for um problema, a alternativa é não conceder `anon`/`authenticated` nessas duas funções e o organizador consultar o relatório direto no SQL Editor do Supabase (com `service_role`), removendo a tela `/relatorio` do app.

## Build e deploy no GitHub Pages

```bash
# instalar dependência de deploy
npm install --save-dev angular-cli-ghpages

# build para GitHub Pages (substitua NOME-DO-REPO pelo nome real do repositório)
ng build --base-href /NOME-DO-REPO/ --configuration production

# publicar
npx angular-cli-ghpages --dir=dist/festa-junina-app/browser
```

O roteamento já usa `withHashLocation()` (ver [`app.config.ts`](src/app/app.config.ts)), então não há 404 ao recarregar a página em produção.
